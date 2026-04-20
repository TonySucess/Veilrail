import { useEffect, useState } from "react";
import { ExternalLinkIcon } from "lucide-react";
import { Link } from "wouter";
import {
  DEVNET_PROGRAM_IDS,
  fetchRecentSignatures,
  type RecentSig,
} from "@/lib/deployment";
import { EXPLORER_ADDR, EXPLORER_TX, relTime, shortAddr } from "./utils";

export function RecentActivityFeed() {
  const [sigs, setSigs] = useState<RecentSig[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetchRecentSignatures(DEVNET_PROGRAM_IDS.verifier, 10).then(r => {
        if (!cancelled) setSigs(r);
      });
    load();
    const id = window.setInterval(load, 30_000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, []);

  return (
    <section className="border border-border bg-card rounded-lg overflow-hidden">
      <header className="px-5 py-4 border-b border-border flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">Recent verifier activity</h2>
          <p className="text-xs font-mono text-muted-foreground mt-1 normal-case">
            Last ten signatures touching the verifier program — pulled directly from devnet via getSignaturesForAddress, no backend in between.
          </p>
        </div>
        <a
          target="_blank"
          rel="noreferrer"
          href={EXPLORER_ADDR(DEVNET_PROGRAM_IDS.verifier)}
          className="shrink-0 text-xs font-mono text-accent hover:underline inline-flex items-center gap-1"
        >
          explorer ↗
        </a>
      </header>
      {sigs === null ? (
        <ul className="divide-y divide-border font-mono text-xs">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="px-5 py-3 text-muted-foreground">…</li>
          ))}
        </ul>
      ) : sigs.length === 0 ? (
        <div className="px-5 py-8 font-mono text-xs text-muted-foreground space-y-2">
          <p>Devnet verifier hasn't processed external txs yet — you can be the first.</p>
          <p>
            Run a proof from the <Link to="/" className="text-accent hover:underline">home demo</Link> or the{" "}
            <Link to="/playground" className="text-accent hover:underline">playground</Link>; submission to the verifier is opt-in and only requires a wallet for that step.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border font-mono text-xs">
          {sigs.map(s => (
            <li key={s.signature} className="px-5 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <StatusBadge ok={!s.err} />
                <span className="text-muted-foreground">
                  slot <span className="text-foreground">{s.slot.toLocaleString()}</span>
                </span>
                <span className="text-muted-foreground">{relTime(s.blockTime)}</span>
                <span className="text-muted-foreground truncate">{shortAddr(s.signature, 8, 8)}</span>
              </div>
              <a
                target="_blank"
                rel="noreferrer"
                href={EXPLORER_TX(s.signature)}
                className="shrink-0 text-accent hover:underline inline-flex items-center gap-1"
              >
                tx <ExternalLinkIcon className="w-3 h-3" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StatusBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="px-2 py-0.5 border border-accent/40 text-accent rounded text-[10px] uppercase tracking-wider">
      ok
    </span>
  ) : (
    <span className="px-2 py-0.5 border border-destructive/40 text-destructive rounded text-[10px] uppercase tracking-wider">
      fail
    </span>
  );
}
