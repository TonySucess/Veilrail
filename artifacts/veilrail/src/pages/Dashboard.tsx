import { useEffect, useMemo, useState } from "react";
import { ExternalLinkIcon } from "lucide-react";
import {
  fetchOnChainProofs,
  type OnChainProof,
} from "@/lib/deployment";
import { subscribeRecentProofs, type ProofEntry } from "@/lib/recentProofs";
import { WalletProviders } from "@/components/WalletProviders";
import { DevnetStatusHeader } from "@/components/dashboard/DevnetStatusHeader";
import { ProgramsTable } from "@/components/dashboard/ProgramsTable";
import { OnChainVKsPanel } from "@/components/dashboard/OnChainVKsPanel";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { CeremonySummaryCard } from "@/components/dashboard/CeremonySummaryCard";
import { ConnectWalletPanel } from "@/components/dashboard/ConnectWalletPanel";
import { EXPLORER_TX } from "@/components/dashboard/utils";

type Row =
  | (ProofEntry & { source: "local" })
  | { source: "chain"; key: string; circuit: OnChainProof["circuit"]; signature: string; createdAt: string; status: "on-chain" };

function mergeRows(local: ProofEntry[], chain: OnChainProof[]): Row[] {
  const seen = new Set<string>();
  const out: Row[] = [];
  for (const p of local) {
    out.push({ ...p, source: "local" });
    if (p.signature) seen.add(p.signature);
  }
  for (const c of chain) {
    if (seen.has(c.signature)) continue;
    out.push({
      source: "chain",
      key: c.signature,
      circuit: c.circuit,
      signature: c.signature,
      createdAt: new Date((c.blockTime ?? Date.now() / 1000) * 1000).toISOString(),
      status: "on-chain",
    });
  }
  out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return out;
}

function DashboardInner() {
  const [recent, setRecent] = useState<ProofEntry[]>([]);
  const [chain, setChain] = useState<OnChainProof[]>([]);

  useEffect(() => subscribeRecentProofs(setRecent), []);

  useEffect(() => {
    document.title = "Dashboard — VeilRail";
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => fetchOnChainProofs(15).then(c => { if (!cancelled) setChain(c); });
    load();
    const id = window.setInterval(load, 30_000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, []);

  const rows = useMemo(() => mergeRows(recent, chain), [recent, chain]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Devnet console</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Independent audit surface for the VeilRail devnet deployment. Every claim on this page links straight to Solana Explorer, the on-chain Vk PDAs, or the source on GitHub. No wallet required to verify anything below.
        </p>
      </header>

      <DevnetStatusHeader />
      <ProgramsTable />
      <OnChainVKsPanel />
      <RecentActivityFeed />
      <CeremonySummaryCard />

      <section className="border border-border bg-card rounded-lg overflow-hidden">
        <header className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold">Your local browser activity</h2>
          <p className="text-xs font-mono text-muted-foreground mt-1 normal-case">
            Proofs generated or submitted from this browser. Persists in localStorage and is merged with recent on-chain verifier activity.
          </p>
        </header>
        {rows.length === 0 ? (
          <div className="px-5 py-8 font-mono text-xs text-muted-foreground">
            No proofs yet. Run one from the home demo or the playground — proof generation is local and free; submitting on-chain is opt-in.
          </div>
        ) : (
          <ul className="divide-y divide-border font-mono text-xs">
            {rows.map(r => (
              <li key={r.source === "local" ? r.id : r.key} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="flex flex-col min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="text-accent">{r.circuit}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{r.source === "local" ? r.page : "devnet"}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{new Date(r.createdAt).toLocaleTimeString()}</span>
                  </span>
                  {r.source === "local" && (
                    <span className="text-muted-foreground truncate">root 0x{r.publicSummary}…</span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <RowStatusBadge row={r} />
                  {r.signature && (
                    <a
                      target="_blank"
                      rel="noreferrer"
                      href={EXPLORER_TX(r.signature)}
                      className="text-accent hover:underline inline-flex items-center gap-1"
                    >
                      {r.signature.slice(0, 8)}…
                      <ExternalLinkIcon className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConnectWalletPanel />
    </div>
  );
}

export function Dashboard() {
  return (
    <WalletProviders>
      <DashboardInner />
    </WalletProviders>
  );
}

function RowStatusBadge({ row }: { row: Row }) {
  const status = row.source === "chain" ? "on-chain" : row.status;
  const map: Record<string, string> = {
    "local":      "text-muted-foreground border-border",
    "submitting": "text-muted-foreground border-border",
    "submitted":  "text-accent border-accent/40",
    "failed":     "text-destructive border-destructive/40",
    "on-chain":   "text-accent border-accent/40",
  };
  return (
    <span className={`px-2 py-0.5 rounded border text-[10px] uppercase tracking-wider ${map[status]}`}>
      {status}
    </span>
  );
}
