import { useCallback, useEffect, useRef, useState } from "react";
import { fetchDevnetStats, fetchSlotHeight, type DevnetStats } from "@/lib/deployment";
import { relTime } from "./utils";

export function DevnetStatusHeader() {
  const [stats, setStats] = useState<DevnetStats | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [, force] = useState(0);
  const tickRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    setError(false);
    const [s, sl] = await Promise.all([fetchDevnetStats(), fetchSlotHeight()]);
    if (s === null && sl === null) {
      setError(true);
      return;
    }
    if (s) setStats(s);
    if (sl !== null) setSlot(sl);
    setUpdatedAt(Math.floor(Date.now() / 1000));
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 15_000);
    tickRef.current = window.setInterval(() => force(x => x + 1), 1_000);
    return () => {
      window.clearInterval(id);
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [load]);

  return (
    <section className="border border-border bg-card rounded-lg overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4">
        <span className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-accent">
          <span className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_currentColor]" />
          Devnet live
        </span>
        <Cell label="epoch" value={stats?.epoch ?? null} />
        <Cell label="slot"  value={slot} />
        {stats?.agentCount ? <Cell label="agents" value={stats.agentCount} /> : null}
        {stats?.sessionCount ? <Cell label="sessions" value={stats.sessionCount} /> : null}
        <span className="text-xs font-mono text-muted-foreground">
          rpc <span className="text-foreground">api.devnet.solana.com</span>
        </span>
        <span className="text-xs font-mono text-muted-foreground">
          updated <span className="text-foreground">{updatedAt ? relTime(updatedAt) : "…"}</span>
        </span>
        <button
          onClick={load}
          className="ml-auto text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          refresh ↻
        </button>
      </div>
      {error && (
        <div className="px-5 py-2 text-xs font-mono text-muted-foreground border-t border-border">
          rpc error · <button onClick={load} className="underline">retry</button>
        </div>
      )}
    </section>
  );
}

function Cell({ label, value, suffix = "" }: { label: string; value: number | null; suffix?: string }) {
  return (
    <span className="text-xs font-mono text-muted-foreground">
      {label} <span className="text-foreground">{value === null ? "…" : value.toLocaleString()}</span>
      {value !== null && suffix && <span className="text-muted-foreground">{suffix}</span>}
    </span>
  );
}
