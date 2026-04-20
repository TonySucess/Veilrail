import { useEffect } from "react";
import { DEVNET_PROGRAM_IDS } from "@/lib/deployment";
import {
  DevnetReceiptsStrip,
  InlineReceipt,
  shortHash,
  useVkHashes,
} from "@/components/DevnetReceiptsStrip";
import { WalletProviders } from "@/components/WalletProviders";
import { ConnectWalletPanel } from "@/components/dashboard/ConnectWalletPanel";

const REPO = "https://github.com/TonySucess/veilrail";
const CIRCUITS_BASE = `${REPO}/blob/main/packages/circuits/src`;
const VERIFIER_LIB = `${REPO}/blob/main/packages/programs/programs/veil-verifier/src/lib.rs`;
const VK_HASHES_URL = `${REPO}/blob/main/artifacts/veilrail/public/ceremony/vk-hashes.json`;

function explorer(programId: string): string {
  return `https://explorer.solana.com/address/${programId}?cluster=devnet`;
}

function ArchitectureDiagram() {
  return (
    <svg viewBox="0 0 800 400" className="w-full max-w-4xl mx-auto my-12" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid2" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="hsl(var(--muted-foreground)/0.2)" />
        </pattern>
      </defs>
      <rect width="800" height="400" fill="url(#grid2)" />
      
      {/* Boxes */}
      <g stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" fill="hsl(var(--card))" strokeLinejoin="round">
        <rect x="50" y="50" width="140" height="80" rx="4" />
        <rect x="50" y="250" width="140" height="80" rx="4" />
        
        <rect x="300" y="50" width="200" height="280" rx="4" fill="hsl(var(--background))" strokeDasharray="4 4" />
        
        <rect x="340" y="80" width="120" height="60" rx="4" />
        <rect x="340" y="160" width="120" height="60" rx="4" />
        <rect x="340" y="240" width="120" height="60" rx="4" />
        
        <rect x="600" y="150" width="140" height="80" rx="4" />
      </g>

      {/* Text */}
      <g fontFamily="var(--app-font-mono)" fontSize="12" fill="hsl(var(--foreground))" textAnchor="middle">
        <text x="120" y="90">VeilAuthProof</text>
        <text x="120" y="110" fontSize="10" fill="hsl(var(--muted-foreground))">Client side</text>
        
        <text x="120" y="290">VeilCompletionProof</text>
        <text x="120" y="310" fontSize="10" fill="hsl(var(--muted-foreground))">Client side</text>
        
        <text x="400" y="70" fill="hsl(var(--muted-foreground))">Anchor Programs</text>
        
        <text x="400" y="115">Registry</text>
        <text x="400" y="195">Session</text>
        <text x="400" y="275">Pool</text>
        
        <text x="670" y="190">Verifier</text>
        <text x="670" y="210" fontSize="10" fill="hsl(var(--muted-foreground))">On-chain</text>
      </g>

      {/* Lines */}
      <g stroke="hsl(var(--accent))" strokeWidth="1.5" fill="none">
        <path d="M 190 90 L 340 110" />
        <path d="M 190 290 L 340 270" />
        <path d="M 460 190 L 600 190" />
      </g>
    </svg>
  );
}

interface CircuitMeta {
  title: string;
  filename: string;
  vkKey: "veil_auth" | "veil_completion" | "veil_pool_note";
  description: string;
}

const CIRCUITS: CircuitMeta[] = [
  {
    title: "VeilAuthProof",
    filename: "veil_auth.circom",
    vkKey: "veil_auth",
    description:
      "Proves that an agent holds the private key corresponding to a registered public key without revealing the public key itself.",
  },
  {
    title: "VeilCompletionProof",
    filename: "veil_completion.circom",
    vkKey: "veil_completion",
    description:
      "Proves that a payment amount is valid within the bounds of a specific session, generating a new commitment for the receiver.",
  },
  {
    title: "VeilPoolNote",
    filename: "veil_pool_note.circom",
    vkKey: "veil_pool_note",
    description:
      "Proves ownership of a note in the shielded pool in order to withdraw to a transparent SPL token account.",
  },
];

interface ProgramMeta {
  name: string;
  programId: string;
  description: string;
  extra?: { label: string; value: string; href: string; verifyLabel: string };
}

const PROGRAMS: ProgramMeta[] = [
  {
    name: "Registry",
    programId: DEVNET_PROGRAM_IDS.registry,
    description:
      "Maintains the Merkle tree of registered agent public keys. Append-only structure.",
  },
  {
    name: "Session",
    programId: DEVNET_PROGRAM_IDS.session,
    description:
      "Tracks active payment channels between agents. Stores only commitments, no plaintext amounts.",
  },
  {
    name: "Pool",
    programId: DEVNET_PROGRAM_IDS.pool,
    description:
      "The shielded USDC vault. Manages deposits and withdrawals via ZK proofs.",
  },
  {
    name: "Verifier",
    programId: DEVNET_PROGRAM_IDS.verifier,
    description:
      "On-chain Groth16 verifier utilizing AltBn128 precompiles for cheap validation.",
    extra: {
      label: "alt_bn128 pairing",
      value: "lib.rs:L112",
      href: `${VERIFIER_LIB}#L112`,
      verifyLabel: "source ↗",
    },
  },
];

function ProtocolInner() {
  const vkHashes = useVkHashes();

  return (
    <div className="w-full">
      <div className="w-full max-w-4xl mx-auto px-4 pt-16 pb-8">
        <h1 className="text-4xl font-bold mb-6">Protocol Architecture</h1>
        <p className="text-lg text-muted-foreground mb-4">
          VeilRail consists of three zero knowledge circuits compiled over the BN254 curve, and four Solana Anchor programs that manage state and verify proofs onchain.
        </p>
        <ArchitectureDiagram />
      </div>

      <DevnetReceiptsStrip authVkHash={vkHashes.veil_auth ?? null} />

      <div className="w-full max-w-4xl mx-auto px-4 pt-12 pb-16 space-y-16">

        <section>
          <h2 className="text-2xl font-semibold mb-6">Circuits</h2>
          <div className="space-y-8">
            {CIRCUITS.map((c) => {
              const vk = vkHashes[c.vkKey];
              return (
                <div key={c.title}>
                  <h3 className="text-xl font-mono text-accent mb-2">{c.title}</h3>
                  <p className="text-muted-foreground mb-3">{c.description}</p>
                  <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 mb-4">
                    <InlineReceipt
                      label="Circuit src"
                      value={c.filename}
                      href={`${CIRCUITS_BASE}/${c.filename}`}
                      verifyLabel="github ↗"
                    />
                    <InlineReceipt
                      label="VK sha256"
                      value={vk ? shortHash(vk, 6, 6) : "…"}
                      href={VK_HASHES_URL}
                      verifyLabel="vk-hashes ↗"
                    />
                    <InlineReceipt
                      label="Ceremony"
                      value={`circuit_id ${CIRCUITS.indexOf(c)}`}
                      href="/ceremony"
                      verifyLabel="ceremony ↗"
                    />
                  </div>
                  {c.title === "VeilAuthProof" && (
                    <div className="border border-border rounded overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-card font-mono text-xs">
                          <tr><th className="p-3 border-b border-border">Signal</th><th className="p-3 border-b border-border">Type</th><th className="p-3 border-b border-border">Description</th></tr>
                        </thead>
                        <tbody>
                          <tr><td className="p-3 border-b border-border">root</td><td className="p-3 border-b border-border font-mono text-muted-foreground">Public</td><td className="p-3 border-b border-border">Merkle root of the registry tree</td></tr>
                          <tr><td className="p-3 border-b border-border">nullifierHash</td><td className="p-3 border-b border-border font-mono text-muted-foreground">Public</td><td className="p-3 border-b border-border">Hash to prevent replay attacks</td></tr>
                          <tr><td className="p-3 border-b border-border">privateKey</td><td className="p-3 border-b border-border font-mono text-muted-foreground">Private</td><td className="p-3 border-b border-border">Agent's Ed25519 scalar</td></tr>
                          <tr><td className="p-3 border-b border-border">pathElements</td><td className="p-3 border-b border-border font-mono text-muted-foreground">Private</td><td className="p-3 border-b border-border">Merkle proof siblings</td></tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-6">Anchor Programs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PROGRAMS.map((p) => (
              <div key={p.name} className="p-6 border border-border bg-card rounded">
                <h3 className="font-mono text-lg mb-2">{p.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{p.description}</p>
                <div className="flex flex-col gap-2">
                  <InlineReceipt
                    label="Program ID"
                    value={shortHash(p.programId)}
                    href={explorer(p.programId)}
                    verifyLabel="explorer ↗"
                  />
                  {p.extra && (
                    <InlineReceipt
                      label={p.extra.label}
                      value={p.extra.value}
                      href={p.extra.href}
                      verifyLabel={p.extra.verifyLabel}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-6">Trust Assumptions</h2>
          <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
            <li>
              The Groth16 trusted setup requires a multiparty computation (MPC) ceremony. Phase 1 utilizes the Perpetual Powers of Tau. Phase 2 will be conducted prior to mainnet launch.
              <div className="mt-2">
                <InlineReceipt
                  label="Ceremony manifest"
                  value="vk-hashes.json"
                  href={VK_HASHES_URL}
                  verifyLabel="github ↗"
                />
              </div>
            </li>
            <li>
              We assume the Solana validator set correctly executes the AltBn128 precompiles.
              <div className="mt-2">
                <InlineReceipt
                  label="alt_bn128 syscall"
                  value="lib.rs:L9"
                  href={`${VERIFIER_LIB}#L9`}
                  verifyLabel="source ↗"
                />
              </div>
            </li>
            <li>
              No multisig controls the shielded pool. It is entirely governed by circuit logic.
              <div className="mt-2">
                <InlineReceipt
                  label="Pool program"
                  value={shortHash(DEVNET_PROGRAM_IDS.pool)}
                  href={explorer(DEVNET_PROGRAM_IDS.pool)}
                  verifyLabel="explorer ↗"
                />
              </div>
            </li>
          </ul>
        </section>

        <ConnectWalletPanel />
      </div>
    </div>
  );
}

export function Protocol() {
  useEffect(() => {
    document.title = "Protocol — VeilRail";
  }, []);

  return (
    <WalletProviders>
      <ProtocolInner />
    </WalletProviders>
  );
}
