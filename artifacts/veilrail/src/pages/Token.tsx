import { useEffect, type ReactNode } from "react";
import { Link } from "wouter";

type Item = {
  title: string;
  body: ReactNode;
  meta?: string;
};

const utility: Item[] = [
  {
    title: "Prover staking",
    body: "Operators of off-chain Groth16 prover nodes bond VEIL to register in the proving market. Bond is slashed for missed jobs, malformed proofs, or downtime that breaches the operator SLA.",
    meta: "Earns: per-proof fees + protocol emission",
  },
  {
    title: "Relayer bonding",
    body: "Relayers that submit user proofs to the verifier program post a VEIL bond per session. Misbehavior (front-running, censorship, double-submission) is provable on chain and slashed against the bond.",
    meta: "Earns: relay tip + a share of saved compute units",
  },
  {
    title: "Verifier fee rebates",
    body: "Agents and SDK callers that hold or stake VEIL pay a reduced protocol fee on each verified proof. The discount curve is set by governance and capped per epoch to avoid centralisation.",
    meta: "Saves: protocol fee on every verified transfer",
  },
  {
    title: "Privacy pool liquidity",
    body: "Anonymity sets are bootstrapped by depositors that lock USDC into the shielded pool. VEIL is paid out as an emission for each block their notes remain unspent, in proportion to set size and dwell time.",
    meta: "Earns: per-block emission while liquidity stays locked",
  },
  {
    title: "Circuit upgrade voting",
    body: "Stakers vote on new circuit versions, trusted-setup contributors, and verifier program upgrades. Each vote is weighted by stake and lock duration so short-term holders do not dictate cryptographic decisions.",
    meta: "Governs: circuits, ceremonies, verifier upgrades",
  },
  {
    title: "Parameter governance",
    body: "Stakers control protocol fee, slashing schedule, emission curve, and relayer set size. Parameters change through on-chain proposals with a quorum and timelock.",
    meta: "Governs: fees, emission, slashing, quorum",
  },
];

const earnPaths: Item[] = [
  {
    title: "Operate a prover node",
    body: "Run the open-source prover binary, register against the on-chain market, and earn a fee for each accepted proof. Operators with longer uptime and lower latency win more jobs through the market's reputation curve.",
    meta: "Skill: dev-ops · Hardware: 16 GB RAM, modern CPU",
  },
  {
    title: "Run a relayer",
    body: "Accept signed proof payloads over HTTP and submit the verifier transaction on the user's behalf. Relayers earn a tip per session and a share of compute-unit savings vs. direct submission.",
    meta: "Skill: dev-ops · Solana RPC access",
  },
  {
    title: "Provide pool liquidity",
    body: "Deposit USDC into the shielded pool and keep notes unspent. Per-block emission accrues to the depositor proportional to anonymity set size and lock duration.",
    meta: "Skill: none · Capital: USDC",
  },
  {
    title: "Submit verified bug bounties",
    body: "Reproducible findings against the verifier program, circuits, SDK, or trusted setup are paid in VEIL on a published severity scale. All payouts and write-ups are public.",
    meta: "Skill: security research · Public scope",
  },
  {
    title: "Contribute to circuits and audits",
    body: "Merged contributions to the circom sources, prover, SDK, or audit tooling earn a retroactive grant from the contributor pool. Reviewed quarterly by stakers.",
    meta: "Skill: zk / Rust / TypeScript",
  },
  {
    title: "Trusted setup participation",
    body: "Contributors to the multi-party trusted-setup ceremony are recorded on chain and receive a one-time VEIL grant per circuit they participate in. Contribution transcripts are independently verifiable.",
    meta: "Skill: minimal · Time: ~1 hour per ceremony",
  },
  {
    title: "Reference an SDK integration",
    body: "Public integrations of the VeilRail SDK are eligible for a referral grant once their verifier traffic crosses a published threshold, paid out of the integrations pool.",
    meta: "Skill: integration · Threshold: published per-epoch",
  },
];

const stakingTiers = [
  { lock: "Flexible", multiplier: "1.0x", note: "Withdraw any time. Minimum protocol weight." },
  { lock: "30 days", multiplier: "1.25x", note: "Standard prover/relayer tier." },
  { lock: "90 days", multiplier: "1.6x", note: "Eligible for governance proposals." },
  { lock: "180 days", multiplier: "2.0x", note: "Eligible for circuit-upgrade votes." },
  { lock: "365 days", multiplier: "2.5x", note: "Maximum weight. Trusted-setup quorum." },
];

const slashing = [
  {
    title: "Liveness",
    body: "Prover or relayer fails to respond to assigned work within the published deadline.",
    rate: "0.5% per incident",
  },
  {
    title: "Invalid proof",
    body: "Operator submits a proof that fails verification on chain.",
    rate: "5% per incident",
  },
  {
    title: "Censorship / equivocation",
    body: "Operator demonstrably reorders, censors, or double-submits user sessions.",
    rate: "100% (full bond)",
  },
];

const supply = [
  { label: "Total supply", value: "TBD · ratified by genesis vote" },
  { label: "Initial circulating", value: "TBD · post-mainnet" },
  { label: "Team / insider allocation", value: "0 prior to public vote" },
  { label: "Presale", value: "None. Ever." },
  { label: "Emission curve", value: "Decaying, parameterised by governance" },
  { label: "Treasury", value: "Multisig held by elected delegates" },
];

const launchPath = [
  { phase: "Now", state: "Devnet live · circuits frozen for audit", on: true },
  { phase: "Q2", state: "Third-party security audit · public report", on: false },
  { phase: "Q3", state: "Mainnet beta · capped TVL · no token", on: false },
  { phase: "Q4", state: "Genesis vote · supply, distribution, emission", on: false },
  { phase: "Post-vote", state: "$VEIL deploys · staking opens", on: false },
];

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-[-0.02em] leading-[1.1] text-foreground">
      {children}
    </h2>
  );
}

function SectionLede({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 text-[15px] md:text-base text-muted-foreground leading-[1.7] max-w-3xl">
      {children}
    </p>
  );
}

function Card({ item }: { item: Item }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-3 h-full">
      <h3 className="font-semibold text-foreground text-[15px]">{item.title}</h3>
      <p className="text-sm text-muted-foreground leading-[1.65]">{item.body}</p>
      {item.meta && (
        <div className="mt-auto pt-3 border-t border-border/60 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {item.meta}
        </div>
      )}
    </div>
  );
}

export function Token() {
  useEffect(() => {
    document.title = "$VEIL — VeilRail";
  }, []);

  return (
    <div className="w-full">
      {/* Hero */}
      <section className="border-b border-border">
        <div className="container max-w-5xl mx-auto px-4 pt-14 pb-12">
          <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" aria-hidden />
            Pre-mainnet · planned
          </div>
          <h1 className="mt-5 text-[44px] sm:text-[52px] lg:text-[60px] font-semibold tracking-[-0.03em] leading-[1.05] text-foreground">
            $VEIL
          </h1>
          <p className="mt-5 max-w-[60ch] text-[15px] lg:text-[16px] text-muted-foreground leading-[1.65]">
            $VEIL is the work and governance token planned for the VeilRail protocol.
            It bonds the operators that produce and relay proofs, rebates fees for
            agents that pay with it, and routes governance over the circuits, ceremony,
            and verifier program.
          </p>

          <div className="mt-6 bg-destructive/10 border border-destructive text-destructive px-5 py-4 rounded-md text-sm leading-[1.6]">
            <span className="font-semibold">Not issued.</span> There is no presale. No
            allocation has been promised to anyone. Anyone selling VEIL today is doing
            so without our involvement. Distribution is governed by an on-chain vote
            that has not happened.
          </div>
        </div>
      </section>

      {/* Utility */}
      <section className="border-b border-border">
        <div className="container max-w-5xl mx-auto px-4 py-16">
          <Eyebrow>Utility</Eyebrow>
          <SectionTitle>What $VEIL secures.</SectionTitle>
          <SectionLede>
            Every utility below is a protocol mechanism described in the design spec.
            None are live until mainnet ships and the genesis vote passes. The set is
            intentionally narrow: bond honest work, rebate active users, and let
            stakers govern cryptographic upgrades.
          </SectionLede>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
            {utility.map((u) => (
              <Card key={u.title} item={u} />
            ))}
          </div>
        </div>
      </section>

      {/* Earn */}
      <section className="border-b border-border">
        <div className="container max-w-5xl mx-auto px-4 py-16">
          <Eyebrow>Ways to earn</Eyebrow>
          <SectionTitle>How participants accrue $VEIL.</SectionTitle>
          <SectionLede>
            VEIL is earned by performing work that the protocol can verify on chain.
            There are no airdrops, faucets, or social-task rewards in the design.
            Every path below maps to either a measurable on-chain event or a public,
            independently reproducible artifact.
          </SectionLede>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {earnPaths.map((p) => (
              <Card key={p.title} item={p} />
            ))}
          </div>
        </div>
      </section>

      {/* Staking */}
      <section className="border-b border-border">
        <div className="container max-w-5xl mx-auto px-4 py-16">
          <Eyebrow>Staking</Eyebrow>
          <SectionTitle>Lock, weight, slash.</SectionTitle>
          <SectionLede>
            Staking weight scales with lock duration. Longer locks earn higher
            governance weight and a larger share of protocol-fee distributions.
            Slashing is reserved for operator misbehavior that the verifier program
            can prove on chain.
          </SectionLede>

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-border font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Lock tiers · governance and reward weight
              </div>
              <div className="divide-y divide-border">
                {stakingTiers.map((t) => (
                  <div key={t.lock} className="grid grid-cols-[110px_70px_1fr] items-center gap-4 px-5 py-3">
                    <div className="font-mono text-[12px] text-foreground tabular-nums">{t.lock}</div>
                    <div className="font-mono text-[13px] text-foreground tabular-nums">{t.multiplier}</div>
                    <div className="text-sm text-muted-foreground">{t.note}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-border font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Reward sources
              </div>
              <ul className="px-5 py-4 space-y-3 text-sm text-muted-foreground leading-[1.6]">
                <li>
                  <span className="text-foreground font-medium">Protocol fees.</span>{" "}
                  A share of every verified-proof fee is streamed to active stakers.
                </li>
                <li>
                  <span className="text-foreground font-medium">Emission.</span>{" "}
                  A decaying issuance schedule funds prover, relayer, and liquidity
                  participants while the protocol bootstraps.
                </li>
                <li>
                  <span className="text-foreground font-medium">Slashed bonds.</span>{" "}
                  Slashed VEIL is partly burned and partly redistributed to honest
                  stakers.
                </li>
                <li>
                  <span className="text-foreground font-medium">Treasury grants.</span>{" "}
                  Stakers vote on retroactive grants to contributors and integrations.
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {slashing.map((s) => (
              <div key={s.title} className="bg-card border border-border rounded-lg p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Slashing · {s.title}
                </div>
                <p className="mt-3 text-sm text-muted-foreground leading-[1.6]">{s.body}</p>
                <div className="mt-3 pt-3 border-t border-border/60 font-mono text-[12px] text-foreground tabular-nums">
                  {s.rate}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supply */}
      <section className="border-b border-border">
        <div className="container max-w-5xl mx-auto px-4 py-16">
          <Eyebrow>Supply &amp; distribution</Eyebrow>
          <SectionTitle>Decided by genesis vote.</SectionTitle>
          <SectionLede>
            We will not publish supply numbers, allocations, or vesting schedules
            before they have been ratified on chain. The fields below describe the
            structure that the vote will fill in.
          </SectionLede>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-px bg-border border border-border rounded-lg overflow-hidden">
            {supply.map((s) => (
              <div key={s.label} className="bg-background p-5">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {s.label}
                </div>
                <div className="mt-2 font-mono text-[14px] text-foreground tabular-nums">
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Launch path */}
      <section className="border-b border-border">
        <div className="container max-w-5xl mx-auto px-4 py-16">
          <Eyebrow>Launch path</Eyebrow>
          <SectionTitle>Token ships last.</SectionTitle>
          <SectionLede>
            The token follows the protocol, not the other way around. Mainnet, audit,
            and the genesis vote all precede $VEIL. Every step is visible in the
            public roadmap.
          </SectionLede>

          <ol className="mt-10 relative border-l border-border pl-6 space-y-5">
            {launchPath.map((step) => (
              <li key={step.phase} className="relative">
                <span
                  aria-hidden
                  className={`absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full border ${
                    step.on
                      ? "bg-accent border-accent shadow-[0_0_0_3px_hsl(var(--accent)/0.15)]"
                      : "bg-background border-border"
                  }`}
                />
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {step.phase}
                </div>
                <div className="mt-1 text-foreground text-[15px]">{step.state}</div>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
            <Link
              href="/roadmap"
              className="inline-flex items-center gap-1.5 text-foreground hover:text-accent"
            >
              Full roadmap
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/security"
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-accent"
            >
              Security &amp; audit posture
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/ceremony"
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-accent"
            >
              Trusted setup
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Risk */}
      <section>
        <div className="container max-w-5xl mx-auto px-4 py-16">
          <Eyebrow>Risk</Eyebrow>
          <SectionTitle>Read this before allocating attention.</SectionTitle>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
            <div className="bg-card border border-border rounded-lg p-5 text-sm text-muted-foreground leading-[1.65]">
              VEIL does not exist as a transferable asset. Any token, ticker, contract
              address, or claim that says otherwise is not us.
            </div>
            <div className="bg-card border border-border rounded-lg p-5 text-sm text-muted-foreground leading-[1.65]">
              Every utility, tier, and rate on this page is a design proposal. They
              can change before mainnet and they will change after the genesis vote.
            </div>
            <div className="bg-card border border-border rounded-lg p-5 text-sm text-muted-foreground leading-[1.65]">
              Staking, bonding, and slashing only become live once the verifier
              program implements them and they are activated by governance.
            </div>
            <div className="bg-card border border-border rounded-lg p-5 text-sm text-muted-foreground leading-[1.65]">
              This page is information about an open-source protocol. It is not an
              offer, solicitation, or financial advice in any jurisdiction.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
