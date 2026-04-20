export function shortAddr(s: string, head = 6, tail = 4): string {
  if (!s) return "";
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

export function shortHash(s: string | null, n = 8): string {
  if (!s) return "…";
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

export function relTime(blockTime: number | null): string {
  if (!blockTime) return "—";
  const seconds = Math.max(0, Math.floor(Date.now() / 1000 - blockTime));
  if (seconds < 60) return `${seconds}s ago`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function lamportsToSol(lamports: number | null): string {
  if (lamports === null) return "…";
  return (lamports / 1_000_000_000).toFixed(4);
}

export const EXPLORER_TX = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
export const EXPLORER_ADDR = (addr: string) => `https://explorer.solana.com/address/${addr}?cluster=devnet`;

export const GH = {
  registry: "https://github.com/TonySucess/Veilrail/blob/main/packages/programs/programs/veil-registry/src/lib.rs",
  session:  "https://github.com/TonySucess/Veilrail/blob/main/packages/programs/programs/veil-session/src/lib.rs",
  pool:     "https://github.com/TonySucess/Veilrail/blob/main/packages/programs/programs/veil-pool/src/lib.rs",
  verifier: "https://github.com/TonySucess/Veilrail/blob/main/packages/programs/programs/veil-verifier/src/lib.rs",
  authCircom:       "https://github.com/TonySucess/Veilrail/blob/main/packages/circuits/src/veil_auth.circom",
  completionCircom: "https://github.com/TonySucess/Veilrail/blob/main/packages/circuits/src/veil_completion.circom",
  poolNoteCircom:   "https://github.com/TonySucess/Veilrail/blob/main/packages/circuits/src/veil_pool_note.circom",
  vkHashes:  "https://github.com/TonySucess/Veilrail/blob/main/artifacts/veilrail/public/ceremony/vk-hashes.json",
} as const;
