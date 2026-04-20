/**
 * Local registry of recent proofs generated and (optionally) submitted by
 * this browser. Persists to localStorage so the Dashboard can surface
 * activity from the Home/Playground demo flows even after a refresh.
 */

const STORAGE_KEY = "veilrail.recentProofs.v1";
const MAX_ENTRIES = 20;

export type ProofEntry = {
  id: string;
  circuit: "auth" | "completion" | "poolNote";
  /** Hex-encoded session root or first public signal — short label only. */
  publicSummary: string;
  publicSignals: string[];
  /** ISO timestamp when the proof finished generating. */
  createdAt: string;
  /** Tx signature once broadcast to devnet, or null if local-only. */
  signature: string | null;
  status: "local" | "submitting" | "submitted" | "failed";
  error?: string;
  page: "home" | "playground";
};

type Listener = (entries: ProofEntry[]) => void;
const listeners = new Set<Listener>();

function read(): ProofEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(entries: ProofEntry[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // storage quota or disabled — ignore.
  }
  for (const l of listeners) l(entries);
}

export function listRecentProofs(): ProofEntry[] {
  return read();
}

export function addRecentProof(entry: Omit<ProofEntry, "id" | "createdAt">): ProofEntry {
  const full: ProofEntry = {
    ...entry,
    id: cryptoId(),
    createdAt: new Date().toISOString(),
  };
  const next = [full, ...read()].slice(0, MAX_ENTRIES);
  write(next);
  return full;
}

export function updateRecentProof(id: string, patch: Partial<ProofEntry>) {
  const next = read().map(e => (e.id === id ? { ...e, ...patch } : e));
  write(next);
}

export function subscribeRecentProofs(fn: Listener): () => void {
  listeners.add(fn);
  // initial push so callers can render immediately.
  fn(read());
  // cross-tab sync via the storage event.
  const onStorage = (ev: StorageEvent) => {
    if (ev.key === STORAGE_KEY) fn(read());
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

function cryptoId(): string {
  const c = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `p_${Date.now()}_${Math.floor(Math.random() * 1e9).toString(36)}`;
}
