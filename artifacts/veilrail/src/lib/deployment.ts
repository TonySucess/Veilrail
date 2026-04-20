import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";

/**
 * Deployment status of the four VeilRail Anchor programs on Solana devnet.
 *
 * Flip to "live" only after `anchor deploy --provider.cluster devnet`
 * succeeds for all four programs. See packages/programs/DEPLOY.md for
 * the full checklist and the matching constant in
 * packages/sdk/src/constants.ts that must be flipped at the same time.
 */
export const DEPLOYMENT_STATUS: "pending" | "live" = "live";

export const DEVNET_PROGRAM_IDS = {
  registry: "A8n9yg7fd2AX3sS3qT5PuV4d4FtVcZxkgWQbozpyXRBM",
  session:  "7Nz1GPXHz8isd9F6oLYeFChTPm3YrcZFRpB1ms4uHB5q",
  pool:     "8Wndka3Ryzcmhu234mSQWQdRA6GPwPmneq4LVchJSnnu",
  verifier: "ACrnPGpU13DNrFKArnDB4KoxonNNBGE4NfrYHNwR3GbY",
} as const;

export interface DevnetStats {
  epoch: number;
  agentCount: number;
  sessionCount: number;
}

/**
 * Read live registry + session program state from devnet. Only call this
 * when DEPLOYMENT_STATUS === "live"; otherwise the program accounts will
 * not exist and every call returns null.
 */
function rpcEndpoint(): string {
  const override = (import.meta.env.VITE_SOLANA_RPC_URL as string | undefined) ?? "";
  if (override.length > 0) return override;
  if (typeof window !== "undefined") {
    if (import.meta.env.DEV) {
      // In the workspace dev server the cache lives in the Vite middleware
      // mounted under this artifact's base path.
      const base = import.meta.env.BASE_URL.endsWith("/")
        ? import.meta.env.BASE_URL.slice(0, -1)
        : import.meta.env.BASE_URL;
      return `${window.location.origin}${base}/devnet-rpc`;
    }
    // In production the SPA is served as static files, so the cache lives
    // in the api-server artifact mounted at /api on the same origin (path
    // routing). This keeps every visitor's /dashboard load behind the same
    // shared in-memory TTL + single-flight cache used in dev.
    return `${window.location.origin}/api/devnet-rpc`;
  }
  return clusterApiUrl("devnet");
}

/**
 * Send a JSON-RPC POST as text/plain so the browser does not issue a CORS
 * preflight. Devnet's public RPC blocks OPTIONS preflights but accepts
 * "simple" POSTs that parse as JSON regardless of content-type.
 */
async function rpc<T = unknown>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(rpcEndpoint(), {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`rpc ${method} failed: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`rpc ${method} error: ${JSON.stringify(json.error)}`);
  return json.result as T;
}

export interface OnChainProof {
  signature: string;
  circuit: "auth" | "completion" | "poolNote";
  blockTime: number | null;
  slot: number;
}

/**
 * Fetch recent ProofVerified activity by reading the verifier program's
 * recent transactions on devnet. Each verifier ix logs
 * `Instruction: VerifyAuth|VerifyCompletion|VerifyPool`, which we use to
 * tag the circuit. Returns at most `limit` entries, newest first. Returns
 * an empty array on any RPC failure so callers can gracefully fall back
 * to local-only history.
 */
export async function fetchOnChainProofs(limit = 15): Promise<OnChainProof[]> {
  if (DEPLOYMENT_STATUS !== "live") return [];
  try {
    // Over-fetch a bit so that filtering out non-proof verifier txs (vk
    // uploads, etc.) still leaves us with roughly `limit` proof rows.
    const sigs = await rpc<Array<{ signature: string; blockTime: number | null; slot: number; err: unknown }>>(
      "getSignaturesForAddress",
      [DEVNET_PROGRAM_IDS.verifier, { limit: Math.max(limit * 2, limit) }],
    );
    const ok = sigs.filter(s => !s.err);
    if (ok.length === 0) return [];
    const txs = await Promise.all(
      ok.map(s =>
        rpc<{ meta: { logMessages: string[] | null } | null } | null>(
          "getTransaction",
          [s.signature, { maxSupportedTransactionVersion: 0, encoding: "json" }],
        ).catch(() => null),
      ),
    );
    const out: OnChainProof[] = [];
    for (let i = 0; i < ok.length; i++) {
      const s = ok[i];
      const logs = txs[i]?.meta?.logMessages ?? [];
      // Only count a tx as a proof if (a) it ran one of the verify
      // instructions, and (b) the verifier program emitted a
      // `ProofVerified` event (anchor surfaces events as `Program data:`
      // base64 log lines). This excludes vk uploads and failed verifies.
      let circuit: OnChainProof["circuit"] | null = null;
      let emittedEvent = false;
      for (const line of logs) {
        if (circuit === null) {
          if (line.includes("Instruction: VerifyAuth")) circuit = "auth";
          else if (line.includes("Instruction: VerifyCompletion")) circuit = "completion";
          else if (line.includes("Instruction: VerifyPool")) circuit = "poolNote";
        }
        if (line.startsWith("Program data:")) emittedEvent = true;
      }
      if (circuit && emittedEvent) {
        out.push({ signature: s.signature, circuit, blockTime: s.blockTime, slot: s.slot });
        if (out.length >= limit) break;
      }
    }
    return out;
  } catch {
    return [];
  }
}

export interface ProgramAccountInfo {
  name: "registry" | "session" | "pool" | "verifier";
  programId: string;
  owner: string | null;
  lamports: number | null;
  executable: boolean;
  exists: boolean;
}

export async function fetchProgramAccountsInfo(): Promise<ProgramAccountInfo[]> {
  const order: ProgramAccountInfo["name"][] = ["registry", "session", "pool", "verifier"];
  const ids = order.map(n => DEVNET_PROGRAM_IDS[n]);
  try {
    const res = await rpc<{
      value: Array<{ owner: string; lamports: number; executable: boolean } | null>;
    }>("getMultipleAccounts", [ids, { encoding: "base64", dataSlice: { offset: 0, length: 0 } }]);
    return order.map((name, i) => {
      const a = res.value[i];
      return {
        name,
        programId: ids[i],
        owner: a?.owner ?? null,
        lamports: a?.lamports ?? null,
        executable: !!a?.executable,
        exists: !!a,
      };
    });
  } catch {
    return order.map((name, i) => ({
      name,
      programId: ids[i],
      owner: null,
      lamports: null,
      executable: false,
      exists: false,
    }));
  }
}

export async function fetchSlotHeight(): Promise<number | null> {
  try {
    return await rpc<number>("getSlot", []);
  } catch {
    return null;
  }
}

export interface RecentSig {
  signature: string;
  slot: number;
  blockTime: number | null;
  err: unknown;
}

export async function fetchRecentSignatures(programId: string, limit = 10): Promise<RecentSig[]> {
  if (DEPLOYMENT_STATUS !== "live") return [];
  try {
    return await rpc<RecentSig[]>("getSignaturesForAddress", [programId, { limit }]);
  } catch {
    return [];
  }
}

export interface VkPdaState {
  circuitId: number;
  pda: string;
  exists: boolean;
  lamports: number | null;
  bytesLen: number | null;
  sha256Hex: string | null;
}

function bytesToHex(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, "0");
  return s;
}

export async function fetchVkPdaState(circuitId: number): Promise<VkPdaState> {
  const verifier = new PublicKey(DEVNET_PROGRAM_IDS.verifier);
  const pda = PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("vk"), new Uint8Array([circuitId])],
    verifier,
  )[0];
  const base: VkPdaState = {
    circuitId,
    pda: pda.toBase58(),
    exists: false,
    lamports: null,
    bytesLen: null,
    sha256Hex: null,
  };
  if (DEPLOYMENT_STATUS !== "live") return base;
  try {
    const res = await rpc<{
      value: { data: [string, string]; lamports: number } | null;
    }>("getAccountInfo", [pda.toBase58(), { encoding: "base64" }]);
    if (!res?.value?.data) return base;
    const [b64] = res.value.data;
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    // Layout: 8 (anchor disc) + 1 (circuit_id) + 4 (bytes_len LE) + bytes[MAX] + 1 (bump)
    if (bytes.length < 8 + 1 + 4) return { ...base, exists: true, lamports: res.value.lamports };
    const view = new DataView(bytes.buffer);
    const bytesLen = view.getUint32(8 + 1, true);
    const start = 8 + 1 + 4;
    const end = start + bytesLen;
    if (end > bytes.length) return { ...base, exists: true, lamports: res.value.lamports, bytesLen };
    const vk = bytes.slice(start, end);
    const digest = await crypto.subtle.digest("SHA-256", vk);
    return {
      circuitId,
      pda: pda.toBase58(),
      exists: true,
      lamports: res.value.lamports,
      bytesLen,
      sha256Hex: bytesToHex(new Uint8Array(digest)),
    };
  } catch {
    return base;
  }
}

export interface VkHashesManifest {
  ptau: { file: string | null; sha256: string | null };
  circuits: Record<string, { circuit_id?: number; vk_sha256: string | null; vk_onchain_sha256?: string | null }>;
}

let vkHashesPromise: Promise<VkHashesManifest | null> | null = null;
export function fetchVkHashesManifest(): Promise<VkHashesManifest | null> {
  if (!vkHashesPromise) {
    const base = import.meta.env.BASE_URL.endsWith("/")
      ? import.meta.env.BASE_URL
      : import.meta.env.BASE_URL + "/";
    vkHashesPromise = fetch(`${base}ceremony/vk-hashes.json`)
      .then(r => (r.ok ? (r.json() as Promise<VkHashesManifest>) : null))
      .catch(() => null);
  }
  return vkHashesPromise;
}

export async function fetchDevnetStats(_connection?: Connection): Promise<DevnetStats | null> {
  try {
    const registryPda = PublicKey.findProgramAddressSync(
      [new TextEncoder().encode("registry")],
      new PublicKey(DEVNET_PROGRAM_IDS.registry),
    )[0];

    const [registryAcct, sessionAccts, epochInfo] = await Promise.all([
      rpc<{ value: { data: [string, string] } | null }>("getAccountInfo", [
        registryPda.toBase58(),
        { encoding: "base64" },
      ]),
      rpc<Array<unknown>>("getProgramAccounts", [
        DEVNET_PROGRAM_IDS.session,
        { dataSlice: { offset: 0, length: 0 }, encoding: "base64" },
      ]),
      rpc<{ epoch: number }>("getEpochInfo", []),
    ]);

    let epoch = epochInfo.epoch;
    let agentCount = 0;

    if (registryAcct?.value?.data) {
      const [b64] = registryAcct.value.data;
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      // Layout: 8 (anchor disc) + 32 (authority) + 8 (epoch LE) + 8 (agent_count LE)
      if (bytes.length >= 8 + 32 + 16) {
        const view = new DataView(bytes.buffer);
        epoch = Number(view.getBigUint64(8 + 32, true));
        agentCount = Number(view.getBigUint64(8 + 32 + 8, true));
      }
    }

    return { epoch, agentCount, sessionCount: sessionAccts.length };
  } catch {
    return null;
  }
}
