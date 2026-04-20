import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { DEVNET_PROGRAM_IDS } from "@/lib/deployment";

type Status = "shipped" | "in_progress" | "planned";

interface Milestone {
  title: string;
  status: Status;
  detail: string;
  verify?: { label: string; href: string };
}

interface Phase {
  id: string;
  label: string;
  window: string;
  headline: string;
  blurb: string;
  milestones: Milestone[];
}

const REPO = "https://github.com/TonySucess/Veilrail";
const RAW = `${REPO}/raw/main`;
const TREE = `${REPO}/blob/main`;

const PHASES: Phase[] = [
  {
    id: "foundation",
    label: "Phase 1",
    window: "Foundation",
    headline: "Circuits, programs, SDK, ceremony scaffolding.",
    blurb:
      "Everything required to run the protocol end to end on devnet, with each artifact independently re-verifiable from the repository.",
    milestones: [
      {
        title: "Three Groth16 circuits compiled",
        status: "shipped",
        detail:
          "veil_auth, veil_completion, veil_pool_note · 21,986 R1CS constraints · pool depth 2^28.",
        verify: {
          label: "circom sources",
          href: `${REPO}/tree/main/packages/circuits/src`,
        },
      },
      {
        title: "Four Anchor programs deployed to devnet",
        status: "shipped",
        detail: `verifier ${DEVNET_PROGRAM_IDS.verifier.slice(0, 6)}…, registry ${DEVNET_PROGRAM_IDS.registry.slice(0, 6)}…, pool ${DEVNET_PROGRAM_IDS.pool.slice(0, 6)}…, session ${DEVNET_PROGRAM_IDS.session.slice(0, 6)}…`,
        verify: {
          label: "explorer",
          href: `https://explorer.solana.com/address/${DEVNET_PROGRAM_IDS.verifier}?cluster=devnet`,
        },
      },
      {
        title: "Client SDK published at 0.1.0-devnet",
        status: "shipped",
        detail:
          "Witness builder, Groth16 prover binding, and Solana submitter exposed from @veilrail/sdk.",
        verify: {
          label: "package.json",
          href: `${TREE}/packages/sdk/package.json`,
        },
      },
      {
        title: "Pre-mainnet ceremony dry run",
        status: "shipped",
        detail:
          "Phase-1 powers-of-tau (PoT15) executed end to end with four placeholder contributors (dry-run-1..4) and SSH-signed transcripts. Explicitly labeled a dry run; the real ceremony with external contributors is a Phase 2 item.",
        verify: {
          label: "download-index.json",
          href: `${RAW}/artifacts/veilrail/public/ceremony/download-index.json`,
        },
      },
      {
        title: "Verification keys pinned and re-hashable",
        status: "shipped",
        detail:
          "vk_sha256 and on-chain vk_onchain_sha256 published per circuit; the dashboard flags drift between manifest and the on-chain Vk PDA.",
        verify: {
          label: "vk-hashes.json",
          href: `${RAW}/artifacts/veilrail/public/ceremony/vk-hashes.json`,
        },
      },
      {
        title: "Public docs site",
        status: "shipped",
        detail:
          "Protocol page, comparison page, security page, ceremony viewer, devnet dashboard. The page you are reading.",
        verify: { label: "github", href: REPO },
      },
    ],
  },
  {
    id: "devnet",
    label: "Phase 2",
    window: "Devnet hardening",
    headline: "Make every claim defensible before touching mainnet.",
    blurb:
      "Replace the dry-run ceremony with real contributors, get an external review on the books, and publish reproducible numbers for prover cost and verifier compute.",
    milestones: [
      {
        title: "External audit scope brief",
        status: "in_progress",
        detail:
          "Threat model and scope being drafted in SECURITY.md. No firm engaged yet; treat any 'audited by X' claim from any other source as unverified.",
        verify: { label: "SECURITY.md", href: `${TREE}/SECURITY.md` },
      },
      {
        title: "Real ceremony with external contributors",
        status: "planned",
        detail:
          "Re-run the full ceremony with externally identifiable contributors and replace the dry-run banner. Roster file is already wired through download-index.json.",
        verify: {
          label: "CONTRIBUTORS.md",
          href: `${TREE}/artifacts/veilrail/public/ceremony/CONTRIBUTORS.md`,
        },
      },
      {
        title: "Proof-time benchmarking harness",
        status: "planned",
        detail:
          "Reproducible measurements for prover wall-clock and verifier compute units across hardware tiers, surfaced on the home page next to the constraint count.",
        verify: { label: "issues", href: `${REPO}/issues` },
      },
      {
        title: "x402 reference flow on devnet",
        status: "planned",
        detail:
          "End-to-end Coinbase x402 payment wrapped by VeilRail, published as a runnable example so integrators can copy and adapt it.",
      },
    ],
  },
  {
    id: "beta",
    label: "Phase 3",
    window: "Mainnet beta",
    headline: "Go live behind feature flags after the audit lands.",
    blurb:
      "Mainnet deploy is gated on a completed external audit. First settlements come from a small allow-list before the pool opens up.",
    milestones: [
      {
        title: "External audit complete and report published",
        status: "planned",
        detail:
          "Final report and any unresolved findings published under audits/ alongside the signed scope brief. Required gate before any mainnet program upgrade.",
        verify: { label: "SECURITY.md", href: `${TREE}/SECURITY.md` },
      },
      {
        title: "Mainnet deployment behind feature flags",
        status: "planned",
        detail:
          "Programs deployed to mainnet with admission gated to an allow-list of integrators. Flags flip per circuit, not per program.",
      },
      {
        title: "First production x402 settlement",
        status: "planned",
        detail:
          "First real agent-to-agent settlement on mainnet, captured with a verifiable Solana signature on the comparison page.",
      },
      {
        title: "Pool seeded with first real notes",
        status: "planned",
        detail:
          "Anonymity set begins growing. The dashboard switches its 'Pool of ∞' theoretical figure to the live deposited-note count.",
      },
    ],
  },
  {
    id: "network",
    label: "Phase 4",
    window: "Privacy layer for x402",
    headline: "Become the default privacy layer for agent payments.",
    blurb:
      "Scale anonymity, scale across chains, and decentralize proving so the system does not depend on any single prover or any single chain.",
    milestones: [
      {
        title: "Pool depth past 100k notes",
        status: "planned",
        detail:
          "Targeting an anonymity set that meaningfully degrades any timing or amount correlation attack.",
      },
      {
        title: "Cross-chain bridges via Wormhole",
        status: "planned",
        detail:
          "Mint and burn shielded notes across supported Wormhole endpoints so x402 settlements are not Solana-only.",
      },
      {
        title: "Decentralized proving market",
        status: "planned",
        detail:
          "A permissionless prover network so agents can outsource proof generation without trusting a single operator.",
      },
      {
        title: "Multi-chain verifier",
        status: "planned",
        detail:
          "Reference verifiers on additional execution environments so the same Groth16 receipt can settle anywhere.",
      },
    ],
  },
];

const statusCopy: Record<Status, string> = {
  shipped: "Shipped",
  in_progress: "In progress",
  planned: "Planned",
};

function flatStats() {
  const all = PHASES.flatMap((p) => p.milestones);
  const shipped = all.filter((m) => m.status === "shipped").length;
  const inProgress = all.filter((m) => m.status === "in_progress").length;
  const total = all.length;
  return { shipped, inProgress, total, pct: Math.round((shipped / total) * 100) };
}

function StatusPill({ status }: { status: Status }) {
  if (status === "shipped") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-accent/40 bg-accent/10 text-accent font-mono text-[10px] uppercase tracking-wider">
        <span className="w-1.5 h-1.5 bg-accent rounded-full" />
        {statusCopy.shipped}
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-accent/40 bg-accent/5 text-accent font-mono text-[10px] uppercase tracking-wider">
        <motion.span
          className="w-1.5 h-1.5 bg-accent rounded-full"
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        />
        {statusCopy.in_progress}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-border bg-card text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
      <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full" />
      {statusCopy.planned}
    </span>
  );
}

function ProgressMeter({ pct }: { pct: number }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? pct : 0);
  useEffect(() => {
    if (reduce) {
      setDisplay(pct);
      return;
    }
    const start = performance.now();
    const dur = 1200;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(pct * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pct, reduce]);

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        <span>Foundation phase complete</span>
        <span className="text-accent">
          {display}
          <span className="text-muted-foreground">% of all milestones shipped</span>
        </span>
      </div>
      <div className="h-1 w-full bg-border rounded overflow-hidden relative">
        <motion.div
          className="h-full bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: reduce ? 0 : 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.div
          className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-accent/40 to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: "300%" }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "linear" }}
        />
      </div>
    </div>
  );
}

function ShippedStat({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <motion.div
      className="border border-border rounded p-4 bg-card/40 backdrop-blur-sm"
      whileHover={{ y: -2, borderColor: "hsl(var(--accent) / 0.4)" }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
    >
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
        {label}
      </div>
      <div className="text-xl font-semibold text-accent tabular-nums">{value}</div>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block font-mono text-[10px] text-muted-foreground hover:text-accent"
        >
          verify ↗
        </a>
      )}
    </motion.div>
  );
}

function MilestoneRow({ m, index }: { m: Milestone; index: number }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="group relative"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left flex items-start gap-4 py-3 px-3 -mx-3 rounded hover:bg-card/60 transition-colors"
        aria-expanded={open}
      >
        <div className="pt-1 shrink-0">
          <StatusPill status={m.status} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="font-medium text-sm">{m.title}</div>
            <motion.div
              animate={{ rotate: open ? 90 : 0 }}
              transition={{ duration: 0.2 }}
              className="font-mono text-xs text-muted-foreground shrink-0"
            >
              ›
            </motion.div>
          </div>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <p className="text-sm text-muted-foreground mt-2">{m.detail}</p>
                {m.verify && (
                  <a
                    href={m.verify.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block font-mono text-[11px] text-accent hover:underline"
                  >
                    verify · {m.verify.label} ↗
                  </a>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </button>
    </motion.li>
  );
}

function PhaseCard({ phase, index }: { phase: Phase; index: number }) {
  const reduce = useReducedMotion();
  const shipped = phase.milestones.filter((m) => m.status === "shipped").length;
  const total = phase.milestones.length;
  const phasePct = Math.round((shipped / total) * 100);
  const isCurrent = phase.milestones.some((m) => m.status === "in_progress");

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      <div className="grid md:grid-cols-[200px_1fr] gap-6 md:gap-10">
        <div className="md:sticky md:top-20 md:self-start">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {phase.label}
          </div>
          <div className="text-2xl font-semibold mt-1">{phase.window}</div>
          {isCurrent && (
            <div className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-accent">
              <motion.span
                className="w-1.5 h-1.5 bg-accent rounded-full"
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              />
              now
            </div>
          )}
          <div className="mt-4 font-mono text-[11px] text-muted-foreground">
            {shipped}/{total} shipped
          </div>
          <div className="mt-1.5 h-0.5 w-full bg-border rounded overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${phasePct}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: 0.15 + index * 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="h-full bg-accent"
            />
          </div>
        </div>

        <div className="border border-border rounded-lg p-6 bg-card/30">
          <p className="text-base text-foreground/90 mb-2">{phase.headline}</p>
          <p className="text-sm text-muted-foreground mb-5">{phase.blurb}</p>
          <ul className="divide-y divide-border/50">
            {phase.milestones.map((m, i) => (
              <MilestoneRow key={m.title} m={m} index={i} />
            ))}
          </ul>
        </div>
      </div>
    </motion.section>
  );
}

export function Roadmap() {
  useEffect(() => {
    document.title = "Roadmap — VeilRail";
  }, []);

  const { shipped, inProgress, total, pct } = useMemo(flatStats, []);
  const reduce = useReducedMotion();

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-16">
      <motion.header
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={reduce ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-12"
      >
        <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
          VeilRail · Roadmap · v0.4
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight max-w-2xl">
          From devnet receipts to the privacy layer for x402.
        </h1>
        <p className="text-base text-muted-foreground max-w-2xl mt-4">
          What is in the repo today, what is being worked on right now, and the gates that
          stand between us and a real mainnet privacy layer for agent-to-agent payments. Items
          move out of <span className="font-mono text-xs">planned</span> only after the
          corresponding work lands.
        </p>
        <div className="mt-5 inline-flex items-start gap-3 border border-border rounded px-4 py-3 bg-card/40 max-w-2xl">
          <span className="font-mono text-[10px] uppercase tracking-wider text-accent shrink-0 mt-0.5">
            scope
          </span>
          <p className="text-xs text-muted-foreground">
            Everything tagged <span className="font-mono text-foreground">shipped</span> means
            landed in the repository and, where applicable, deployed to Solana devnet. Nothing
            below has been externally audited and nothing has been deployed to mainnet. The
            ceremony content under /ceremony is a pre-mainnet dry run.
          </p>
        </div>
      </motion.header>

      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={reduce ? undefined : { opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mb-10 border border-border rounded-lg p-6 bg-card/30"
      >
        <ProgressMeter pct={pct} />
        <div className="grid grid-cols-3 gap-3 mt-6 font-mono text-xs">
          <div>
            <div className="text-accent text-2xl font-semibold tabular-nums">{shipped}</div>
            <div className="text-muted-foreground uppercase tracking-wider text-[10px] mt-1">
              shipped
            </div>
          </div>
          <div>
            <div className="text-accent text-2xl font-semibold tabular-nums">{inProgress}</div>
            <div className="text-muted-foreground uppercase tracking-wider text-[10px] mt-1">
              in progress
            </div>
          </div>
          <div>
            <div className="text-foreground text-2xl font-semibold tabular-nums">{total}</div>
            <div className="text-muted-foreground uppercase tracking-wider text-[10px] mt-1">
              total milestones
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } },
        }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-16"
      >
        {[
          {
            label: "Circuit constraints",
            value: "21,986",
            href: `${REPO}/tree/main/packages/circuits/src`,
          },
          {
            label: "Anchor programs on devnet",
            value: "4",
            href: `https://explorer.solana.com/address/${DEVNET_PROGRAM_IDS.verifier}?cluster=devnet`,
          },
          {
            label: "SDK release",
            value: "0.1.0",
            href: `${TREE}/packages/sdk/package.json`,
          },
          {
            label: "Pool capacity",
            value: "2^28",
            href: `${TREE}/packages/circuits/src/veil_pool_note.circom`,
          },
        ].map((s) => (
          <motion.div
            key={s.label}
            variants={{
              hidden: { opacity: 0, y: 8 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <ShippedStat {...s} />
          </motion.div>
        ))}
      </motion.div>

      <div className="space-y-16 relative">
        <div
          className="hidden md:block absolute left-[100px] top-2 bottom-2 w-px bg-gradient-to-b from-transparent via-border to-transparent pointer-events-none"
          aria-hidden="true"
        />
        {PHASES.map((p, i) => (
          <PhaseCard key={p.id} phase={p} index={i} />
        ))}
      </div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="mt-20 border border-border rounded-lg p-6 bg-card/30 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Where work happens
          </div>
          <p className="text-sm text-muted-foreground max-w-xl">
            The roadmap above is the same one tracked in GitHub issues. If a milestone matters
            to you, file or watch the corresponding issue.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={`${REPO}/issues`}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded bg-accent text-background font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Open issues
          </a>
          <a
            href={REPO}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded border border-border font-medium text-sm hover:border-accent transition-colors"
          >
            Source on GitHub
          </a>
        </div>
      </motion.div>
    </div>
  );
}
