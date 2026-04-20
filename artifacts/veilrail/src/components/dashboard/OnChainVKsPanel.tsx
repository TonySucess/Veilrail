import { useEffect, useState } from "react";
import { ExternalLinkIcon } from "lucide-react";
import {
  fetchVkHashesManifest,
  fetchVkPdaState,
  type VkHashesManifest,
  type VkPdaState,
} from "@/lib/deployment";
import { EXPLORER_ADDR, GH, shortHash } from "./utils";

const CIRCUITS = [
  { name: "auth",       id: 0, manifestKey: "veil_auth",       gh: GH.authCircom },
  { name: "completion", id: 1, manifestKey: "veil_completion", gh: GH.completionCircom },
  { name: "poolNote",   id: 2, manifestKey: "veil_pool_note",  gh: GH.poolNoteCircom },
] as const;

export function OnChainVKsPanel() {
  const [states, setStates] = useState<Record<number, VkPdaState | null>>({});
  const [manifest, setManifest] = useState<VkHashesManifest | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchVkHashesManifest().then(m => { if (!cancelled) setManifest(m); });
    const load = async () => {
      const results = await Promise.all(CIRCUITS.map(c => fetchVkPdaState(c.id)));
      if (cancelled) return;
      const next: Record<number, VkPdaState> = {};
      results.forEach((r, i) => { next[CIRCUITS[i].id] = r; });
      setStates(next);
    };
    load();
    const id = window.setInterval(load, 30_000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, []);

  return (
    <section className="border border-border bg-card rounded-lg overflow-hidden">
      <header className="px-5 py-4 border-b border-border flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">Verification keys pinned on-chain</h2>
          <p className="text-xs font-mono text-muted-foreground mt-1 normal-case">
            Each row reads the Vk PDA from the verifier program, hashes the raw BN254 vk_bytes in your browser, and compares to the value we publish in vk-hashes.json. A MATCH means the circuit you see in the repo is byte-identical to the one the verifier uses.
          </p>
        </div>
        <a
          target="_blank"
          rel="noreferrer"
          href={GH.vkHashes}
          className="shrink-0 text-xs font-mono text-accent hover:underline inline-flex items-center gap-1"
        >
          manifest <ExternalLinkIcon className="w-3 h-3" />
        </a>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border">
              <th className="px-5 py-2 text-left font-normal">circuit</th>
              <th className="px-3 py-2 text-left font-normal">id</th>
              <th className="px-3 py-2 text-left font-normal">on-chain sha256</th>
              <th className="px-3 py-2 text-left font-normal">expected</th>
              <th className="px-3 py-2 text-center font-normal">status</th>
              <th className="px-5 py-2 text-right font-normal">verify</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {CIRCUITS.map(c => {
              const s = states[c.id];
              const expected = manifest?.circuits[c.manifestKey]?.vk_onchain_sha256 ?? null;
              const onchain = s?.sha256Hex ?? null;
              let status: "match" | "drift" | "missing" | "loading" = "loading";
              if (s && expected) {
                if (!s.exists || !onchain) status = "missing";
                else if (onchain.toLowerCase() === expected.toLowerCase()) status = "match";
                else status = "drift";
              }
              return (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 text-foreground">veil-{c.name}</td>
                  <td className="px-3 py-3 text-muted-foreground">{c.id}</td>
                  <td className="px-3 py-3 text-muted-foreground" title={onchain ?? ""}>{shortHash(onchain, 12)}</td>
                  <td className="px-3 py-3 text-muted-foreground" title={expected ?? ""}>{shortHash(expected, 12)}</td>
                  <td className="px-3 py-3 text-center">
                    <StatusPill status={status} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="inline-flex items-center gap-3 justify-end">
                      {s && (
                        <a
                          target="_blank"
                          rel="noreferrer"
                          href={EXPLORER_ADDR(s.pda)}
                          className="text-accent hover:underline inline-flex items-center gap-1"
                        >
                          pda <ExternalLinkIcon className="w-3 h-3" />
                        </a>
                      )}
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={c.gh}
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                      >
                        circom <ExternalLinkIcon className="w-3 h-3" />
                      </a>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: "match" | "drift" | "missing" | "loading" }) {
  const map = {
    match:   { label: "match",     cls: "border-accent/40 text-accent" },
    drift:   { label: "drift",     cls: "border-border text-muted-foreground" },
    missing: { label: "not found", cls: "border-border text-muted-foreground" },
    loading: { label: "…",         cls: "border-border text-muted-foreground" },
  };
  const m = map[status];
  return (
    <span className={`inline-block px-2 py-0.5 border rounded text-[10px] uppercase tracking-wider ${m.cls}`}>
      {m.label}
    </span>
  );
}
