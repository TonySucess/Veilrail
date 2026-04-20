import type { Logger } from "pino";

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

interface UpstreamResult {
  body: string;
  status: number;
  cacheable: boolean;
  ttl: number;
}

export type CacheStatus = "hit" | "miss" | "bypass";

export interface ProxyResponse {
  status: number;
  body: string;
  cacheStatus: CacheStatus;
}

export interface DevnetRpcCache {
  handle(rawBody: string): Promise<ProxyResponse>;
}

export function createDevnetRpcCache(opts: { logger?: Pick<Logger, "info"> } = {}): DevnetRpcCache {
  const log = opts.logger;
  const cache = new Map<string, CacheEntry>();
  const inflight = new Map<string, Promise<UpstreamResult>>();

  const writeBody = (body: string, reqId: unknown): string => {
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

  return {
    async handle(raw: string): Promise<ProxyResponse> {
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
        // pass through verbatim below
      }

      if (!parseable || method === null) {
        try {
          const upstreamRes = await fetch(DEVNET_RPC_UPSTREAM, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: raw,
          });
          const body = await upstreamRes.text();
          return { status: upstreamRes.status, body, cacheStatus: "bypass" };
        } catch (err) {
          return {
            status: 502,
            body: JSON.stringify({ error: { code: -32603, message: (err as Error).message } }),
            cacheStatus: "bypass",
          };
        }
      }

      const ttl = RPC_TTL_MS[method] ?? DEFAULT_TTL_MS;
      const key = JSON.stringify({ method, params });
      const now = Date.now();

      const cached = cache.get(key);
      if (cached && cached.expiresAt > now) {
        return { status: cached.status, body: writeBody(cached.body, reqId), cacheStatus: "hit" };
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
          log?.info(
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
        return { status, body: writeBody(body, reqId), cacheStatus: "miss" };
      } catch (err) {
        return {
          status: 502,
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: reqId,
            error: { code: -32603, message: (err as Error).message },
          }),
          cacheStatus: "miss",
        };
      }
    },
  };
}
