import { useEffect, useRef, useState } from "react";
import { DEVNET_PROGRAM_IDS } from "@/lib/deployment";

export interface HeroComparisonProps {
  authVkHash: string | null;
}

function shortMid(s: string, head = 4, tail = 4): string {
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

const REDACTED = "••••••••";

const exampleRows = [
  { key: "from", label: "from", value: "5xK9k4…mP3q" },
  { key: "to", label: "to", value: "Bv2NWy…8tR4" },
  { key: "amount", label: "amount", value: "100.00 USDC" },
  { key: "memo", label: "memo", value: "inference / 4096 tokens" },
] as const;

function CornerBracket({
  className,
  position,
}: {
  className?: string;
  position: "tl" | "tr" | "bl" | "br";
}) {
  const sides =
    position === "tl"
      ? "border-l border-t"
      : position === "tr"
      ? "border-r border-t"
      : position === "bl"
      ? "border-l border-b"
      : "border-r border-b";
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute w-2.5 h-2.5 ${sides} border-accent/50 ${className ?? ""}`}
    />
  );
}

export function HeroComparison({ authVkHash }: HeroComparisonProps) {
  const verifierExplorer = `https://explorer.solana.com/address/${DEVNET_PROGRAM_IDS.verifier}?cluster=devnet`;
  const verifierShort = shortMid(DEVNET_PROGRAM_IDS.verifier, 4, 4);
  const vkShort = authVkHash ? shortMid(authVkHash, 6, 4) : null;

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

  // Live demo: cycle reveal -> redact so the encryption transition is observable.
  const [redacted, setRedacted] = useState(prefersReducedMotion);
  const [scanKey, setScanKey] = useState(0);
  const cycleRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion) return;
    let alive = true;
    const tick = (next: boolean, delay: number) => {
      cycleRef.current = window.setTimeout(() => {
        if (!alive) return;
        setRedacted(next);
        setScanKey((k) => k + 1);
        tick(!next, next ? 4500 : 1800);
      }, delay);
    };
    tick(true, 600);
    return () => {
      alive = false;
      if (cycleRef.current !== null) window.clearTimeout(cycleRef.current);
    };
  }, [prefersReducedMotion]);

  // Live ticker: rolling window over the real verifier program id + auth vk hash.
  const seedSource = `${authVkHash ?? ""}${DEVNET_PROGRAM_IDS.verifier}`.replace(
    /[^0-9a-zA-Z]/g,
    "",
  );
  const seed = seedSource.length > 0 ? seedSource.toLowerCase() : "0";
  const [tickerOffset, setTickerOffset] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = window.setInterval(() => {
      setTickerOffset((o) => (o + 1) % seed.length);
    }, 110);
    return () => window.clearInterval(id);
  }, [seed, prefersReducedMotion]);
  const tickerLen = 28;
  const doubled = seed + seed;
  const tickerWindow = doubled.slice(tickerOffset, tickerOffset + tickerLen).padEnd(tickerLen, "0");

  return (
    <div className="relative w-full max-w-[480px] rounded-xl border border-border bg-card overflow-hidden shadow-[0_1px_0_0_hsl(var(--border)),0_24px_60px_-30px_rgba(0,0,0,0.6)]">
      <CornerBracket position="tl" className="top-1.5 left-1.5" />
      <CornerBracket position="tr" className="top-1.5 right-1.5" />
      <CornerBracket position="bl" className="bottom-1.5 left-1.5" />
      <CornerBracket position="br" className="bottom-1.5 right-1.5" />

      {/* Frame header */}
      <div className="flex items-center justify-between gap-3 px-4 h-11 border-b border-border bg-background/40">
        <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <img
            src="/veilrail-logo.jpg"
            alt=""
            aria-hidden
            className="w-3.5 h-3.5 rounded-[3px] ring-1 ring-border"
          />
          What the chain sees
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Devnet
        </span>
      </div>

      {/* Public x402 panel */}
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Public x402 · example transfer
        </div>
        <dl className="space-y-1.5">
          {exampleRows.map((r) => (
            <div key={r.key} className="flex items-baseline justify-between gap-3">
              <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground/70 w-16 shrink-0">
                {r.label}
              </dt>
              <dd className="font-mono text-[12px] text-foreground/90 truncate text-right tabular-nums">
                {r.value}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 pt-3 border-t border-border/60 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Chain learns: from · to · amount · memo
        </div>
      </div>

      {/* VeilRail panel */}
      <div className="relative px-4 pt-4 pb-3 bg-background/30 overflow-hidden">
        {/* Faint hex grid watermark */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--accent)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent)) 1px, transparent 1px)",
            backgroundSize: "16px 16px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          }}
        />

        {/* Scan beam: replays each time redaction toggles */}
        <div
          key={scanKey}
          aria-hidden
          className="veil-scan pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent"
          style={{ ["--veil-scan-distance" as string]: "220px" }}
        />

        <div className="relative mb-3 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <img
              src="/veilrail-logo.jpg"
              alt=""
              aria-hidden
              className="w-3.5 h-3.5 rounded-[3px] ring-1 ring-border"
            />
            VeilRail · same transfer
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-50 veil-pulse-soft" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            {redacted ? "encrypted" : "plaintext"}
          </span>
        </div>

        <dl className="relative space-y-1.5">
          {exampleRows.map((r) => (
            <div key={r.key} className="flex items-baseline justify-between gap-3">
              <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground/70 w-16 shrink-0">
                {r.label}
              </dt>
              <dd
                className={`font-mono text-[12px] truncate text-right tabular-nums transition-[color,letter-spacing] duration-[600ms] ease-out ${
                  redacted
                    ? "text-muted-foreground/60 tracking-[0.18em]"
                    : "text-foreground/90 tracking-normal"
                }`}
              >
                {redacted ? REDACTED : r.value}
              </dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-3 pt-1">
            <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground/70 w-16 shrink-0">
              commit
            </dt>
            <dd className="font-mono text-[12px] text-foreground/90 truncate text-right tabular-nums">
              {vkShort ? `vk ${vkShort}` : "vk …"}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground/70 w-16 shrink-0">
              proof
            </dt>
            <dd className="flex items-baseline gap-2 min-w-0">
              <span className="font-mono text-[12px] text-foreground/90 truncate tabular-nums">
                {verifierShort}
              </span>
              <a
                href={verifierExplorer}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:text-accent shrink-0"
              >
                verify ↗
              </a>
            </dd>
          </div>
        </dl>

        {/* Live byte stream + chain-learns line */}
        <div className="relative mt-3 pt-3 border-t border-border/60">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Chain learns: nothing
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
              stream
            </span>
          </div>
          <div
            className="mt-2 font-mono text-[10px] tracking-[0.12em] text-muted-foreground/55 truncate tabular-nums"
            aria-hidden
          >
            {tickerWindow}
          </div>
        </div>
      </div>
    </div>
  );
}
