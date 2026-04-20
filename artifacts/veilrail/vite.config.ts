import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "path";
import type { IncomingMessage, ServerResponse } from "http";

const DEVNET_RPC_UPSTREAM = "https://api.devnet.solana.com";

const RPC_TTL_MS: Record<string, number> = {
  getSlot: 5_000,
  getEpochInfo: 30_000,
  getMultipleAccounts: 15_000,
  getAccountInfo: 30_000,
  getProgramAccounts: 30_000,
  getSignaturesForAddress: 15_000,
};
const DEFAULT_TTL_MS = 10_000;

interface CacheEntry {
  body: string;
  status: number;
  expiresAt: number;
}

function devnetRpcCachePlugin(routePath: string): PluginOption {
  const cache = new Map<string, CacheEntry>();
  const inflight = new Map<string, Promise<{ body: string; status: number; cacheable: boolean; ttl: number }>>();

  const readBody = (req: IncomingMessage): Promise<string> =>
    new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on("data", (c: Buffer) => chunks.push(c));
      req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      req.on("error", reject);
    });

  return {
    name: "veilrail:devnet-rpc-cache",
    configureServer(server) {
      server.middlewares.use(routePath, async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end("Method Not Allowed");
          return;
        }

        let raw: string;
        try {
          raw = await readBody(req);
        } catch (err) {
          res.statusCode = 400;
          res.end(`bad body: ${(err as Error).message}`);
          return;
        }

        let method: string | null = null;
        let params: unknown = [];
        let reqId: unknown = 1;
        let parseable = false;
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.method === "string") {
            method = parsed.method;
            params = parsed.params ?? [];
            reqId = parsed.id ?? 1;
            parseable = true;
          }
        } catch {
          // fall through — unparseable bodies are passed through verbatim below.
        }

        // Unparseable / non-conforming bodies: pass through verbatim, no cache.
        if (!parseable || method === null) {
          try {
            const upstreamRes = await fetch(DEVNET_RPC_UPSTREAM, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: raw,
            });
            const body = await upstreamRes.text();
            res.statusCode = upstreamRes.status;
            res.setHeader("content-type", "application/json");
            res.setHeader("x-devnet-rpc-cache", "bypass");
            res.end(body);
          } catch (err) {
            res.statusCode = 502;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ error: { code: -32603, message: (err as Error).message } }));
          }
          return;
        }

        const ttl = RPC_TTL_MS[method] ?? DEFAULT_TTL_MS;
        const key = JSON.stringify({ method, params });
        const now = Date.now();

        // Rewrite the upstream/cached response's `id` to match this request's
        // `id`, so multiple JSON-RPC clients using different ids all get a
        // response that lines up with their request.
        const writeBody = (body: string): string => {
          try {
            const obj = JSON.parse(body);
            if (obj && typeof obj === "object") {
              obj.id = reqId;
              return JSON.stringify(obj);
            }
          } catch {
            // non-JSON body (shouldn't happen for upstream JSON-RPC); return as-is.
          }
          return body;
        };

        const cached = cache.get(key);
        if (cached && cached.expiresAt > now) {
          res.statusCode = cached.status;
          res.setHeader("content-type", "application/json");
          res.setHeader("x-devnet-rpc-cache", "hit");
          res.end(writeBody(cached.body));
          return;
        }

        let pending = inflight.get(key);
        if (!pending) {
          pending = (async () => {
            const upstreamRes = await fetch(DEVNET_RPC_UPSTREAM, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ jsonrpc: "2.0", id: reqId, method, params }),
            });
            const body = await upstreamRes.text();
            const status = upstreamRes.status;
            const cacheable = status < 500 && status !== 429;
            server.config.logger.info(
              `[devnet-rpc] upstream ${method} -> ${status}${cacheable ? ` (cached ${ttl}ms)` : " (no-cache)"}`,
            );
            return { body, status, cacheable, ttl };
          })().finally(() => {
            inflight.delete(key);
          });
          inflight.set(key, pending);
        }

        try {
          const { body, status, cacheable, ttl: usedTtl } = await pending;
          if (cacheable) {
            cache.set(key, { body, status, expiresAt: Date.now() + usedTtl });
          }
          res.statusCode = status;
          res.setHeader("content-type", "application/json");
          res.setHeader("x-devnet-rpc-cache", "miss");
          res.end(writeBody(body));
        } catch (err) {
          res.statusCode = 502;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ jsonrpc: "2.0", id: reqId, error: { code: -32603, message: (err as Error).message } }));
        }
      });
    },
  };
}

const rawPort = process.env.PORT ?? "5173";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  define: {
    "process.env": {},
    global: "globalThis",
  },
  optimizeDeps: {
    include: ["buffer"],
    esbuildOptions: {
      define: { global: "globalThis" },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    nodePolyfills({
      include: ["buffer", "util", "process", "stream", "crypto"],
      globals: { Buffer: true, global: true, process: true },
      protocolImports: true,
    }),
    devnetRpcCachePlugin(`${basePath.replace(/\/$/, "")}/devnet-rpc`),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: [
      "react",
      "react-dom",
      "@solana/wallet-adapter-react",
      "@solana/wallet-adapter-react-ui",
      "@solana/wallet-adapter-base",
      "@solana/web3.js",
    ],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("snarkjs") || id.includes("ffjavascript")) return "snarkjs";
          if (id.includes("poseidon-lite")) return "poseidon";
          if (
            id.includes("@solana/wallet-adapter") ||
            id.includes("@solana/wallet-standard") ||
            id.includes("@wallet-standard")
          ) {
            return "solana-wallet";
          }
          if (id.includes("@solana/web3.js") || id.includes("rpc-websockets") || id.includes("bs58")) {
            return "solana-web3";
          }
          if (
            /[\\/]node_modules[\\/](?:\.pnpm[\\/])?(?:react|react-dom|scheduler)(?:@[^\\/]+)?[\\/]/.test(id)
          ) {
            return "react";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
