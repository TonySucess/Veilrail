import { useEffect } from "react";

export function Security() {
  useEffect(() => {
    document.title = "Security — VeilRail";
  }, []);

  const trustAssumptions = [
    {
      title: "Solana consensus",
      body: "The protocol inherits liveness and safety from Solana. A successful attack on the underlying chain would compromise VeilRail.",
    },
    {
      title: "Trusted setup",
      body: "Devnet keys come from a single-party setup intended for testing only. A pre-mainnet multi-party ceremony dry run (PoT15, four contributors) is published at /ceremony so anyone can re-verify the hashes pinned on-chain. The real ceremony with external contributors has not yet been performed.",
    },
    {
      title: "Cryptographic primitives",
      body: "We assume Groth16 over BN254, Poseidon, and Pedersen commitments are secure at the 128-bit level.",
    },
    {
      title: "Client integrity",
      body: "Secret inputs never leave the user's device. A compromised endpoint will compromise privacy.",
    },
  ];

  const inScope = [
    "Linkability between deposits and withdrawals by passive on-chain observers",
    "Nullifier replay and double-spend attempts against the program",
    "Malicious relayers attempting to censor, reorder, or correlate transactions",
    "RPC-level metadata leakage (IP, timing, request fingerprints)",
    "Front-end supply chain attacks that could exfiltrate secret notes",
  ];

  const outOfScope = [
    "Endpoint compromise of the user's device",
    "Coercion of the user to reveal secrets",
    "Deanonymization from off-chain context the user volunteers",
    "Quantum adversaries (Groth16 is not post-quantum secure)",
  ];

  const limitations = [
    {
      title: "Devnet trusted setup",
      body: "Current proving and verifying keys are not production safe.",
    },
    {
      title: "Single relayer",
      body: "The reference relayer is team operated. A decentralized market is on the roadmap.",
    },
    {
      title: "No formal verification",
      body: "Programs and circuits have been reviewed but not formally verified.",
    },
    {
      title: "No external audit yet",
      body: "No third-party audit firm has been engaged. The threat model and scope brief are published in the repository; reports will be added under audits/ as engagements are signed.",
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-16 space-y-16">
      <header className="space-y-4">
        <span className="text-xs font-mono uppercase tracking-wider text-accent">Security</span>
        <h1 className="text-4xl font-bold">Audit checklist & threat model</h1>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
          Privacy infrastructure is only as credible as its audit story. This page summarizes our trust
          assumptions, the threats we defend against, and the limitations users should weigh before relying
          on the protocol. The full document lives in{" "}
          <a
            href="https://github.com/TonySucess/veilrail/blob/main/SECURITY.md"
            className="text-accent hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            SECURITY.md
          </a>{" "}
          in the repository.
        </p>
      </header>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Trust assumptions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trustAssumptions.map((item) => (
            <div key={item.title} className="p-5 rounded border border-border bg-card">
              <h3 className="text-sm font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Threat model</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded border border-border bg-card">
            <h3 className="text-sm font-semibold mb-3">In scope</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {inScope.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-accent">+</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="p-5 rounded border border-border bg-card">
            <h3 className="text-sm font-semibold mb-3">Out of scope</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {outOfScope.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-muted-foreground">–</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="p-5 rounded border border-border bg-card">
          <h3 className="text-sm font-semibold mb-2">Anonymity set assumptions</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Privacy scales with the size and diversity of unspent notes of the same denomination at the time
            of withdrawal. Uncommon amounts and short deposit-to-withdrawal intervals reduce the effective
            set. Anonymity-set estimates are surfaced in the client so users can make informed choices.
          </p>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Known limitations</h2>
        <div className="space-y-3">
          {limitations.map((item) => (
            <div key={item.title} className="p-5 rounded border border-border bg-card">
              <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">External audit</h2>
        <div className="rounded border border-border bg-card p-5 space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="text-foreground font-medium">No external audit has been completed.</span>{" "}
            No third-party firm has been engaged at this time. The scope brief and
            threat model are published in the repository so anyone can review them
            before relying on the protocol. Engagement letters and finished reports
            will be added under <span className="font-mono text-xs">audits/</span>{" "}
            as they are signed; until then, treat any "audited by X" claim from any
            other source as unverified.
          </p>
          <ul className="text-sm space-y-1">
            <li>
              <a
                href="https://github.com/TonySucess/veilrail/blob/main/SECURITY.md"
                className="text-accent hover:underline font-mono text-xs"
                target="_blank"
                rel="noreferrer"
              >
                SECURITY.md ↗
              </a>{" "}
              <span className="text-muted-foreground">— scope brief and threat model.</span>
            </li>
            <li>
              <span className="font-mono text-xs text-foreground">audits/</span>{" "}
              <span className="text-muted-foreground">— directory will be added when the first finalized report lands.</span>
            </li>
            <li>
              <a
                href="https://github.com/TonySucess/veilrail/security/advisories/new"
                className="text-accent hover:underline font-mono text-xs"
                target="_blank"
                rel="noreferrer"
              >
                Security Advisories ↗
              </a>{" "}
              <span className="text-muted-foreground">— private channel for reporting findings before reports land.</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">Report a vulnerability</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Please disclose privately via{" "}
          <a
            href="https://github.com/TonySucess/veilrail/security/advisories/new"
            className="text-accent hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            GitHub Security Advisories
          </a>
          . We aim to acknowledge within 48 hours.
        </p>
      </section>
    </div>
  );
}
