import { useEffect, useState } from "react";
import { ExternalLinkIcon } from "lucide-react";
import { fetchProgramAccountsInfo, type ProgramAccountInfo } from "@/lib/deployment";
import { EXPLORER_ADDR, GH, lamportsToSol, shortAddr } from "./utils";

const BPF_LOADER_UPGRADEABLE = "BPFLoaderUpgradeab1e11111111111111111111111";

const ROW_META: Record<ProgramAccountInfo["name"], { title: string; purpose: string; gh: string }> = {
  registry: { title: "veil-registry", purpose: "agent + epoch registry",   gh: GH.registry },
  session:  { title: "veil-session",  purpose: "session lifecycle PDAs",   gh: GH.session },
  pool:     { title: "veil-pool",     purpose: "shielded pool notes",      gh: GH.pool },
  verifier: { title: "veil-verifier", purpose: "Groth16 BN254 verifier",   gh: GH.verifier },
};

export function ProgramsTable() {
  const [rows, setRows] = useState<ProgramAccountInfo[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => fetchProgramAccountsInfo().then(r => { if (!cancelled) setRows(r); });
    load();
    const id = window.setInterval(load, 15_000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, []);

  return (
    <section className="border border-border bg-card rounded-lg overflow-hidden">
      <header className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Anchor programs deployed on devnet</h2>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            Each program ID below resolves to an executable account owned by the BPF Upgradeable Loader. Click any explorer link to confirm independently.
          </p>
        </div>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground border-b border-border">
              <th className="px-5 py-2 text-left font-normal">program</th>
              <th className="px-3 py-2 text-left font-normal">id</th>
              <th className="px-3 py-2 text-left font-normal">owner</th>
              <th className="px-3 py-2 text-right font-normal">balance</th>
              <th className="px-3 py-2 text-center font-normal">status</th>
              <th className="px-5 py-2 text-right font-normal">verify</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {(rows ?? Array.from({ length: 4 }).map((_, i) => null)).map((r, i) => {
              const meta = r ? ROW_META[r.name] : null;
              const ownerOk = r?.owner === BPF_LOADER_UPGRADEABLE && r?.executable;
              return (
                <tr key={r?.programId ?? i} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">
                    <div className="text-foreground">{meta?.title ?? "…"}</div>
                    <div className="text-muted-foreground text-[10px] mt-0.5 normal-case tracking-normal">
                      {meta?.purpose ?? ""}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{r ? shortAddr(r.programId, 6, 6) : "…"}</td>
                  <td className="px-3 py-3 text-muted-foreground">{r?.owner ? shortAddr(r.owner, 4, 4) : "…"}</td>
                  <td className="px-3 py-3 text-right text-muted-foreground">
                    {r ? <>{lamportsToSol(r.lamports)} <span className="text-[10px]">SOL</span></> : "…"}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {!r ? (
                      <span className="text-muted-foreground">…</span>
                    ) : ownerOk ? (
                      <span className="inline-block px-2 py-0.5 border border-accent/40 text-accent rounded text-[10px] uppercase tracking-wider">
                        live
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 border border-border text-muted-foreground rounded text-[10px] uppercase tracking-wider">
                        unreachable
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {r && (
                      <span className="inline-flex items-center gap-3 justify-end">
                        <a
                          target="_blank"
                          rel="noreferrer"
                          href={EXPLORER_ADDR(r.programId)}
                          className="text-accent hover:underline inline-flex items-center gap-1"
                        >
                          explorer <ExternalLinkIcon className="w-3 h-3" />
                        </a>
                        <a
                          target="_blank"
                          rel="noreferrer"
                          href={meta!.gh}
                          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                        >
                          source <ExternalLinkIcon className="w-3 h-3" />
                        </a>
                      </span>
                    )}
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
