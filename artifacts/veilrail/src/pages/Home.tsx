import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { HeroComparison } from "@/components/HeroComparison";
import { HeroBackground } from "@/components/HeroBackground";
import { DevnetReceiptsStrip } from "@/components/DevnetReceiptsStrip";
import circuitStats from "../../public/data/circuit-stats.json";


const DemoWidget = lazy(() => import("@/components/DemoWidget"));

function FlowDiagram() {
  return (
    <svg viewBox="0 0 800 320" className="w-full max-w-4xl mx-auto" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="VeilRail data flow diagram">
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.8" fill="hsl(var(--muted-foreground)/0.18)" />
        </pattern>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="hsl(var(--muted-foreground))" />
        </marker>
      </defs>
      <rect width="800" height="320" fill="url(#grid)" />

      <g stroke="hsl(var(--border))" strokeWidth="1" fill="hsl(var(--card))" strokeLinejoin="round">
        <rect x="40" y="130" width="140" height="60" rx="6" />
        <rect x="240" y="60" width="180" height="60" rx="6" />
        <rect x="240" y="200" width="180" height="60" rx="6" />
        <rect x="480" y="130" width="140" height="60" rx="6" />
        <rect x="660" y="130" width="100" height="60" rx="6" />
      </g>

      <g fontFamily="var(--app-font-mono)" fontSize="11" fill="hsl(var(--foreground))" textAnchor="middle">
        <text x="110" y="158">Agent A</text>
        <text x="110" y="175" fontSize="9" fill="hsl(var(--muted-foreground))">x402 buyer</text>

        <text x="330" y="88">x402 intent</text>
        <text x="330" y="105" fontSize="9" fill="hsl(var(--muted-foreground))">HTTP 402 / payload</text>

        <text x="330" y="228">VeilRail SDK</text>
        <text x="330" y="245" fontSize="9" fill="hsl(var(--muted-foreground))">Groth16 prover (browser / wasm)</text>

        <text x="550" y="158">Solana verifier</text>
        <text x="550" y="175" fontSize="9" fill="hsl(var(--muted-foreground))">AltBn128 precompile</text>

        <text x="710" y="158">Agent B</text>
        <text x="710" y="175" fontSize="9" fill="hsl(var(--muted-foreground))">x402 seller</text>
      </g>

      <g stroke="hsl(var(--muted-foreground))" strokeWidth="1.2" fill="none" markerEnd="url(#arrow)" opacity="0.7">
        <path d="M 180 150 L 240 90" />
        <path d="M 180 162 L 240 222" />
        <path d="M 420 90 L 480 150" />
        <path d="M 420 222 L 480 162" />
        <path d="M 620 156 L 660 156" />
      </g>
    </svg>
  );
}

const properties = [
  {
    title: "Hidden amount",
    body: "Transfer values are committed inside the circuit and never appear in any instruction, log, or account.",
  },
  {
    title: "Hidden counterparties",
    body: "Sender and receiver pubkeys are replaced by registry merkle proofs. Observers see proof bytes, nothing more.",
  },
  {
    title: "Session unlinkability",
    body: "A new commitment is derived for each transfer. Two payments between the same parties are uncorrelated on chain.",
  },
  {
    title: "x402 native",
    body: "Settles inline with the Coinbase x402 HTTP payment flow. Drop-in replacement for the public USDC transfer leg.",
  },
];

const REPO = "https://github.com/TonySucess/veilrail";
const fmt = (n: number) => n.toLocaleString("en-US");
const fmtCompact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(0)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}k` : `${n}`;

type Stat = { label: string; value: string; verifyHref: string; verifyLabel: string };
const stats: Stat[] = [
  {
    label: "Circuit constraints (sum)",
    value: fmt(circuitStats.totalConstraints),
    verifyHref: `${REPO}/tree/main/packages/circuits/src`,
    verifyLabel: "circom sources",
  },
  {
    label: "Pool capacity",
    value: `${circuitStats.pool.capacityExpr} (${fmtCompact(circuitStats.pool.capacity)} notes)`,
    verifyHref: `${REPO}/blob/main/${circuitStats.pool.sourcePath}`,
    verifyLabel: "circom source",
  },
];

function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: ReactNode;
  body: ReactNode;
}) {
  return (
    <div className="max-w-3xl mb-10">
      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {eyebrow}
      </div>
      <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-[-0.02em] leading-[1.1] text-foreground">
        {title}
      </h2>
      <p className="mt-4 text-[15px] md:text-base text-muted-foreground leading-[1.7]">
        {body}
      </p>
    </div>
  );
}

export function Home() {
  const [authVkHash, setAuthVkHash] = useState<string | null>(null);

  useEffect(() => {
    document.title = "VeilRail — zero-knowledge privacy for agent payments on Solana";
  }, []);

  useEffect(() => {
    let cancelled = false;
    const base = import.meta.env.BASE_URL.endsWith("/")
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`;
    fetch(`${base}ceremony/vk-hashes.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const hash = data?.circuits?.veil_auth?.vk_sha256 ?? null;
        setAuthVkHash(typeof hash === "string" ? hash : null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative w-full border-b border-border overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-[0.05]" aria-hidden="true">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M40 0H0V40" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
          </svg>
        </div>
        <HeroBackground />
        <div className="relative container max-w-6xl mx-auto px-4 pt-14 pb-14 lg:pt-16 lg:pb-16 grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-center">
          <div className="veil-fade-up">
            <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-50" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              <span>Devnet live</span>
            </div>
            <h1 className="mt-5 text-[44px] sm:text-[52px] lg:text-[60px] font-semibold tracking-[-0.03em] leading-[1.05]">
              <span
                className="block text-foreground"
                style={{ textShadow: "0 0 48px rgba(255,255,255,0.10)" }}
              >
                Settle agent payments.
              </span>
              <span className="block bg-gradient-to-r from-foreground via-foreground to-accent bg-clip-text text-transparent">
                Reveal nothing.
              </span>
            </h1>
            <p className="mt-6 max-w-[52ch] text-[15px] lg:text-[16px] text-muted-foreground leading-[1.65]">
              VeilRail wraps Coinbase x402 payments in zero-knowledge proofs. Amounts,
              counterparties, and session state stay inside the client. On chain, observers
              see only a Groth16 proof and a commitment.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href="/docs"
                className="inline-flex items-center justify-center bg-accent text-accent-foreground px-5 h-11 rounded-md text-sm font-medium hover:bg-accent/90 transition-colors"
              >
                Read the docs
              </Link>
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors"
              >
                Open console
                <span
                  aria-hidden
                  className="text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-accent"
                >
                  →
                </span>
              </Link>
              <a
                href="/compare#broadcast"
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors"
              >
                Broadcast your own proof
                <span
                  aria-hidden
                  className="text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-accent"
                >
                  →
                </span>
              </a>
            </div>
            <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Apache-2.0 ·{" "}
              <a
                href="https://github.com/TonySucess/veilrail"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-accent underline-offset-4 hover:underline"
              >
                github.com/TonySucess/veilrail
              </a>
            </p>
          </div>
          <div className="lg:justify-self-end w-full flex lg:block justify-center veil-fade-up-delay">
            <HeroComparison authVkHash={authVkHash} />
          </div>
        </div>
      </section>

      <DevnetReceiptsStrip authVkHash={authVkHash} />

      {/* Demo */}
      <section className="w-full border-b border-border">
        <div className="container max-w-5xl mx-auto px-4 py-16">
          <SectionHeader
            eyebrow="Demonstration"
            title="Run the prover here."
            body="The widget below loads the actual devnet circuit, generates witnesses, and runs the Groth16 prover entirely in your browser. Nothing is sent over the network. The same code path ships with the SDK."
          />
          <Suspense
            fallback={
              <div className="w-full max-w-3xl mx-auto h-64 border border-border bg-card rounded-lg flex items-center justify-center text-muted-foreground font-mono text-xs">
                Loading prover…
              </div>
            }
          >
            <DemoWidget />
          </Suspense>
        </div>
      </section>

      {/* Properties */}
      <section className="w-full border-b border-border">
        <div className="container max-w-5xl mx-auto px-4 py-16">
          <SectionHeader
            eyebrow="Properties"
            title="What the chain learns."
            body="Public USDC transfers leak the entire payment graph: who paid whom, when, and how much. VeilRail removes every one of those signals while keeping settlement final on Solana."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border border border-border rounded-lg overflow-hidden">
            {properties.map((p) => (
              <div key={p.title} className="bg-background p-6">
                <h3 className="font-semibold mb-2 text-foreground">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Flow */}
      <section className="w-full border-b border-border">
        <div className="container max-w-5xl mx-auto px-4 py-16">
          <SectionHeader
            eyebrow="Flow"
            title="One round-trip."
            body="Two agents exchange an x402 intent, the buyer's SDK produces a proof, and the verifier program admits it via the AltBn128 precompile. No relayers, no escrow, no off-chain clearing."
          />
          <FlowDiagram />
        </div>
      </section>

      {/* Stats */}
      <section className="w-full border-b border-border bg-card/40">
        <div className="container max-w-5xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="font-mono text-2xl text-foreground tabular-nums">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-1 font-mono uppercase tracking-wider">
                  {s.label}
                </div>
                <a
                  href={s.verifyHref}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-accent"
                >
                  Verify · {s.verifyLabel} →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="w-full">
        <div className="container max-w-4xl mx-auto px-4 py-24">
          <SectionHeader
            eyebrow="Integrate"
            title="Ship private agent payments today."
            body="Devnet is live. The SDK, circuits, and Anchor programs are open source and ready to integrate behind any x402 endpoint."
          />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="/docs"
              className="inline-flex items-center justify-center bg-accent text-accent-foreground px-5 h-11 rounded-md text-sm font-medium hover:bg-accent/90 transition-colors"
            >
              Quickstart
            </Link>
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors"
            >
              Open console
              <span
                aria-hidden
                className="text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-accent"
              >
                →
              </span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
