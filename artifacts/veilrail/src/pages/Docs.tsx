import { useEffect } from "react";
import { Link } from "wouter";

const sections = [
  { id: "quickstart", label: "Quickstart" },
  { id: "install", label: "Installation" },
  { id: "sdk", label: "SDK reference" },
  { id: "programs", label: "Anchor programs" },
  { id: "circuits", label: "Circuits" },
  { id: "x402", label: "x402 integration" },
  { id: "sessions", label: "Managing sessions" },
];

function Code({ children, lang }: { children: string; lang?: string }) {
  return (
    <div className="bg-card border border-border rounded overflow-hidden my-4">
      {lang && (
        <div className="border-b border-border px-4 py-2 text-xs font-mono text-muted-foreground bg-background/40">
          {lang}
        </div>
      )}
      <pre className="p-4 overflow-x-auto font-mono text-[13px] leading-relaxed text-foreground">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export function Docs() {
  useEffect(() => {
    document.title = "Documentation — VeilRail";
  }, []);

  return (
    <div className="flex w-full max-w-7xl mx-auto">
      <aside className="w-64 flex-shrink-0 border-r border-border p-6 hidden lg:block">
        <div className="sticky top-20 space-y-6">
          <div>
            <h4 className="font-semibold mb-3 text-xs uppercase tracking-wider text-muted-foreground">Reference</h4>
            <ul className="space-y-2 text-sm">
              {sections.map(s => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-xs uppercase tracking-wider text-muted-foreground">Tools</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/docs/playground" className="text-muted-foreground hover:text-foreground">Playground</Link></li>
              <li><Link href="/dashboard" className="text-muted-foreground hover:text-foreground">Dashboard</Link></li>
              <li><Link href="/ceremony" className="text-muted-foreground hover:text-foreground">Trusted setup</Link></li>
              <li><Link href="/security" className="text-muted-foreground hover:text-foreground">Security</Link></li>
            </ul>
          </div>
        </div>
      </aside>

      <div className="flex-1 px-4 md:px-12 py-12 max-w-3xl mx-auto lg:mx-0">
        <header className="mb-12">
          <span className="text-[11px] font-mono uppercase tracking-wider text-accent">Documentation</span>
          <h1 className="text-4xl font-bold mt-2">Build with VeilRail</h1>
          <p className="text-lg text-muted-foreground mt-4 leading-relaxed">
            Everything you need to integrate zero-knowledge agent payments behind any x402
            endpoint on Solana. Devnet is live; mainnet ships with the audited release.
          </p>
        </header>

        <section id="quickstart" className="scroll-mt-20 mb-16">
          <h2 className="text-2xl font-semibold mb-4">Quickstart</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            VeilRail ships as a thin TypeScript SDK that wraps proof generation, account
            derivation, and transaction submission. Sessions are first-class objects, so apps can
            persist them however they like.
          </p>
          <Code lang="agent.ts">{`import { VeilRail } from "@veilrail/sdk";
import { useWallet } from "@solana/wallet-adapter-react";

const veil = new VeilRail({
  cluster: "devnet",
  wallet,
  circuitArtifacts: {
    auth: "/circuits/veil_auth_final.zkey",
    completion: "/circuits/veil_completion_final.zkey",
  },
});

const { session, proof: openProof } = await veil.openSession({
  peer: peerAgentPubkey,
  maxNotional: 1_000_000,
});

const transferProof = await veil.proveTransfer({
  session,
  amount: 100_000,
});

await veil.submit(transferProof);`}</Code>
        </section>

        <section id="install" className="scroll-mt-20 mb-16">
          <h2 className="text-2xl font-semibold mb-4">Installation</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            The SDK depends on <code className="font-mono text-xs px-1.5 py-0.5 bg-muted rounded">@solana/web3.js</code>{" "}
            and a wallet adapter. Both peers (buyer and seller) need it.
          </p>
          <Code>{`pnpm add @veilrail/sdk @solana/web3.js @solana/wallet-adapter-react`}</Code>
          <p className="text-muted-foreground leading-relaxed mt-4">
            Proving keys and circuit wasm files are not bundled. Host them next to your client and
            point the SDK at them via <code className="font-mono text-xs px-1.5 py-0.5 bg-muted rounded">circuitArtifacts</code>.
            Hashes for every published key are pinned at <Link href="/ceremony" className="text-accent hover:underline">/ceremony</Link>.
          </p>
        </section>

        <section id="sdk" className="scroll-mt-20 mb-16">
          <h2 className="text-2xl font-semibold mb-4">SDK reference</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            The client surface is intentionally small. State lives in the <code className="font-mono text-xs px-1.5 py-0.5 bg-muted rounded">Session</code>{" "}
            object, never on the class.
          </p>

          <div className="space-y-6">
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-card/60 flex items-baseline justify-between">
                <code className="font-mono text-sm">new VeilRail(cfg)</code>
                <span className="text-[11px] font-mono text-muted-foreground">constructor</span>
              </div>
              <div className="p-4 text-sm">
                <p className="text-muted-foreground mb-3">
                  Construct a stateless client. Pass a connected wallet adapter and either a
                  cluster name or your own <code className="font-mono text-xs">Connection</code>.
                </p>
                <table className="w-full text-xs">
                  <tbody className="font-mono">
                    <tr className="border-t border-border"><td className="py-2 pr-4 text-accent w-40">cluster</td><td className="py-2 text-muted-foreground">"devnet" | "mainnet-beta" | "localnet"</td></tr>
                    <tr className="border-t border-border"><td className="py-2 pr-4 text-accent">wallet</td><td className="py-2 text-muted-foreground">Adapter compatible with @solana/wallet-adapter-react</td></tr>
                    <tr className="border-t border-border"><td className="py-2 pr-4 text-accent">circuitArtifacts</td><td className="py-2 text-muted-foreground">Map of zkey + wasm URLs</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-card/60 flex items-baseline justify-between">
                <code className="font-mono text-sm">openSession(opts) → {`{ session, proof }`}</code>
                <span className="text-[11px] font-mono text-muted-foreground">async</span>
              </div>
              <div className="p-4 text-sm space-y-3">
                <p className="text-muted-foreground">
                  Establish a private channel with <code className="font-mono text-xs">peer</code>. Generates a
                  VeilAuthProof and returns a Session handle that carries the agent secret, salt,
                  derived session root, and committed cap.
                </p>
                <Code>{`const { session, proof } = await veil.openSession({
  peer: peerAgentPubkey,
  maxNotional: 1_000_000,
});`}</Code>
              </div>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-card/60 flex items-baseline justify-between">
                <code className="font-mono text-sm">proveTransfer(opts) → ProofBundle</code>
                <span className="text-[11px] font-mono text-muted-foreground">async</span>
              </div>
              <div className="p-4 text-sm">
                <p className="text-muted-foreground">
                  Produce a single in-session VeilCompletionProof. The amount is committed inside
                  the circuit; only the new note commitment and nullifier are public.
                </p>
              </div>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-card/60 flex items-baseline justify-between">
                <code className="font-mono text-sm">submit(proof) → string</code>
                <span className="text-[11px] font-mono text-muted-foreground">async</span>
              </div>
              <div className="p-4 text-sm">
                <p className="text-muted-foreground">
                  Submit a proof bundle to the on-chain verifier. Returns the transaction signature.
                  Browser builds throw and route through <code className="font-mono text-xs">@veilrail/cli</code>{" "}
                  to keep the bundle small; node builds submit directly.
                </p>
              </div>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-card/60 flex items-baseline justify-between">
                <code className="font-mono text-sm">fetchEpoch() → number</code>
                <span className="text-[11px] font-mono text-muted-foreground">async</span>
              </div>
              <div className="p-4 text-sm">
                <p className="text-muted-foreground">
                  Read the current registry epoch. Sessions are bound to the epoch they opened in
                  to prevent cross-epoch replay.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="programs" className="scroll-mt-20 mb-16">
          <h2 className="text-2xl font-semibold mb-4">Anchor programs</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Four programs make up the on-chain protocol. Each is independently upgradeable behind
            a multisig until governance ships.
          </p>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-card/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Program</th>
                  <th className="text-left px-4 py-3 font-medium">Responsibility</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs">veil-registry</td>
                  <td className="px-4 py-3 text-muted-foreground">Append-only Merkle tree of registered agents. Bumps the epoch on each insert.</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs">veil-session</td>
                  <td className="px-4 py-3 text-muted-foreground">Stores session roots and a nullifier set per epoch. No plaintext amounts.</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs">veil-pool</td>
                  <td className="px-4 py-3 text-muted-foreground">Shielded USDC vault. Manages deposits, withdrawals, and the note commitment tree.</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs">veil-verifier</td>
                  <td className="px-4 py-3 text-muted-foreground">Generic Groth16 verifier. Pinned to one VK per circuit id; AltBn128 precompiled.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="circuits" className="scroll-mt-20 mb-16">
          <h2 className="text-2xl font-semibold mb-4">Circuits</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Three Groth16 circuits over BN254. All three are reproducibly built from{" "}
            <code className="font-mono text-xs px-1.5 py-0.5 bg-muted rounded">packages/circuits</code>{" "}
            and pinned in the verifier program.
          </p>
          <div className="space-y-4">
            <div className="p-5 border border-border rounded-lg bg-card/40">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <h3 className="font-mono text-accent">VeilAuthProof</h3>
                <span className="text-[11px] font-mono text-muted-foreground">circuit id 1 · 18,432 constraints</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Proves the prover holds the secret behind a public registry leaf and that the
                session root is honestly derived from the agent commitment, peer commitment, epoch,
                and a fresh session id. Also commits to a transfer cap.
              </p>
            </div>
            <div className="p-5 border border-border rounded-lg bg-card/40">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <h3 className="font-mono text-accent">VeilCompletionProof</h3>
                <span className="text-[11px] font-mono text-muted-foreground">circuit id 2 · 22,016 constraints</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Proves the net amount across a 16-slot transfer vector is within the session's
                committed cap, derives the spend nullifier, and emits a fresh receiver commitment.
              </p>
            </div>
            <div className="p-5 border border-border rounded-lg bg-card/40">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <h3 className="font-mono text-accent">VeilPoolNote</h3>
                <span className="text-[11px] font-mono text-muted-foreground">circuit id 3 · 24,576 constraints</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Proves ownership of a note in the shielded pool to permit withdrawal to a transparent
                SPL token account, without revealing which note.
              </p>
            </div>
          </div>
        </section>

        <section id="x402" className="scroll-mt-20 mb-16">
          <h2 className="text-2xl font-semibold mb-4">x402 integration</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            VeilRail substitutes for the public USDC transfer in the standard x402 flow. The
            buyer's middleware intercepts the 402 response, generates a proof, and returns a
            VeilRail payment payload instead of a transparent SPL transfer signature.
          </p>
          <Code lang="x402-middleware.ts">{`import { x402Client } from "@coinbase/x402";
import { VeilRail } from "@veilrail/sdk";

const veil = new VeilRail({ cluster: "devnet", wallet });

const client = x402Client({
  payer: async ({ amount, recipient }) => {
    const { session } = await veil.openSession({
      peer: recipient,
      maxNotional: amount,
    });
    const proof = await veil.proveTransfer({ session, amount });
    const sig = await veil.submit(proof);
    return { type: "veilrail", signature: sig };
  },
});

const response = await client.fetch("https://example.com/api/work");`}</Code>
          <p className="text-muted-foreground leading-relaxed mt-4">
            The seller verifies the proof bundle out of band before releasing the resource. A
            reference verifier ships in <code className="font-mono text-xs px-1.5 py-0.5 bg-muted rounded">@veilrail/x402-verifier</code>.
          </p>
        </section>

        <section id="sessions" className="scroll-mt-20 mb-16">
          <h2 className="text-2xl font-semibold mb-4">Managing sessions</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Sessions are plain JSON. Persist them however you like, but keep the agent secret in a
            vault — anyone holding it can spend the session cap. Sessions expire at the next
            registry epoch unless explicitly extended.
          </p>
          <Code>{`localStorage.setItem(
  \`veil:session:\${peerId}\`,
  JSON.stringify(session),
);`}</Code>
          <p className="text-muted-foreground leading-relaxed mt-4">
            For server-side agents, the recommended pattern is one session per long-lived
            counterparty, rotated on each epoch bump. The dashboard at{" "}
            <Link href="/dashboard" className="text-accent hover:underline">/dashboard</Link>{" "}
            lists every session your wallet has on chain.
          </p>
        </section>

        <div className="mt-12 pt-8 border-t border-border flex justify-between text-sm">
          <Link href="/protocol" className="text-muted-foreground hover:text-foreground">← Protocol architecture</Link>
          <Link href="/docs/playground" className="text-accent hover:underline">Open the playground →</Link>
        </div>
      </div>
    </div>
  );
}
