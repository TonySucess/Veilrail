import { useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DEVNET_PROGRAM_IDS } from "@/lib/deployment";
import {
  DevnetReceiptsStrip,
  InlineReceipt,
  useVkHashes,
} from "@/components/DevnetReceiptsStrip";
import { WalletProviders } from "@/components/WalletProviders";
import { ConnectWalletPanel } from "@/components/dashboard/ConnectWalletPanel";

const REPO = "https://github.com/TonySucess/veilrail";
const CIRCUITS_BASE = `${REPO}/blob/main/packages/circuits/src`;
const VERIFIER_LIB = `${REPO}/blob/main/packages/programs/programs/veil-verifier/src/lib.rs`;

const data = [
  { mechanism: "USDC SPL transfer", amount: "Public", sender: "Public", receiver: "Public", memo: "Public", linkable: "Yes", anonSet: "1" },
  { mechanism: "Token2022 confidential transfer", amount: "Hidden", sender: "Public", receiver: "Public", memo: "Public", linkable: "Yes", anonSet: "1" },
  { mechanism: "Light Protocol shielded", amount: "Hidden", sender: "Hidden", receiver: "Hidden", memo: "Public", linkable: "No", anonSet: "Pool of ~12k" },
  { mechanism: "VeilRail", amount: "Hidden", sender: "Hidden", receiver: "Hidden", memo: "Hidden", linkable: "No", anonSet: "Pool of ~∞" },
];

interface VeilRailReceipt {
  claim: string;
  label: string;
  value: string;
  href: string;
  verifyLabel: string;
}

const VEILRAIL_RECEIPTS: VeilRailReceipt[] = [
  {
    claim: "Amount hidden",
    label: "Range proof",
    value: "veil_completion.circom",
    href: `${CIRCUITS_BASE}/veil_completion.circom`,
    verifyLabel: "github ↗",
  },
  {
    claim: "Sender / receiver hidden",
    label: "Set membership",
    value: "veil_auth.circom",
    href: `${CIRCUITS_BASE}/veil_auth.circom`,
    verifyLabel: "github ↗",
  },
  {
    claim: "Session unlinkable",
    label: "Pool note",
    value: "veil_pool_note.circom",
    href: `${CIRCUITS_BASE}/veil_pool_note.circom`,
    verifyLabel: "github ↗",
  },
  {
    claim: "Verified on-chain",
    label: "alt_bn128 pairing",
    value: "lib.rs:L112",
    href: `${VERIFIER_LIB}#L112`,
    verifyLabel: "source ↗",
  },
];

function CompareInner() {
  const vkHashes = useVkHashes();

  return (
    <div className="w-full">
      <div className="w-full max-w-5xl mx-auto px-4 pt-16 pb-10">
        <h1 className="text-4xl font-bold mb-6">Privacy Comparison</h1>
        <p className="text-lg text-muted-foreground">
          How VeilRail compares to existing transfer mechanisms on Solana when used for x402 agent settlements.
        </p>
      </div>

      <DevnetReceiptsStrip authVkHash={vkHashes.veil_auth ?? null} />

      <div className="w-full max-w-5xl mx-auto px-4 pt-12 pb-16">
        <h2 className="text-2xl font-semibold mb-6">Data Leakage Analysis</h2>
        <div className="border border-border rounded-lg overflow-hidden bg-card mb-6">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="font-mono text-xs">Mechanism</TableHead>
                <TableHead className="font-mono text-xs">Amount</TableHead>
                <TableHead className="font-mono text-xs">Sender</TableHead>
                <TableHead className="font-mono text-xs">Receiver</TableHead>
                <TableHead className="font-mono text-xs">Memo</TableHead>
                <TableHead className="font-mono text-xs">Session linkable</TableHead>
                <TableHead className="font-mono text-xs">Anon set</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow
                  key={row.mechanism}
                  className={row.mechanism === "VeilRail" ? "bg-accent/5 hover:bg-accent/10 border-border" : "hover:bg-transparent border-border"}
                >
                  <TableCell className={`font-medium ${row.mechanism === "VeilRail" ? "text-accent" : ""}`}>{row.mechanism}</TableCell>
                  <TableCell className={row.amount === "Hidden" ? "text-muted-foreground" : ""}>{row.amount}</TableCell>
                  <TableCell className={row.sender === "Hidden" ? "text-muted-foreground" : ""}>{row.sender}</TableCell>
                  <TableCell className={row.receiver === "Hidden" ? "text-muted-foreground" : ""}>{row.receiver}</TableCell>
                  <TableCell className={row.memo === "Hidden" ? "text-muted-foreground" : ""}>{row.memo}</TableCell>
                  <TableCell className={row.linkable === "No" ? "text-muted-foreground" : ""}>{row.linkable}</TableCell>
                  <TableCell className="font-mono text-xs">{row.anonSet}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="border border-border rounded-lg bg-card/40 p-5 mb-16">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/80 mb-3">
            VeilRail row — verify each claim
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {VEILRAIL_RECEIPTS.map((r) => (
              <li key={r.claim} className="flex flex-col gap-1">
                <span className="text-sm text-foreground/90">{r.claim}</span>
                <InlineReceipt
                  label={r.label}
                  value={r.value}
                  href={r.href}
                  verifyLabel={r.verifyLabel}
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
              <h3 className="text-xl font-semibold">Public x402 Observer View</h3>
              <a
                href="https://explorer.solana.com/tx/5ZkoQv9GSK7ztZfdtcFKBRGqgzqeEZVn13HhGbFQbCPFgdAvAbEtgNSJsRYAejso7jwfvNs54dkrSvcsnPfsz6aG"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-mono text-accent hover:underline"
              >
                view on Explorer ↗
              </a>
            </div>
            <div className="bg-card border border-border rounded-lg p-6 font-mono text-sm space-y-4">
              <div>
                <div className="text-muted-foreground text-xs mb-1">Instruction</div>
                <div>TransferChecked</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">Source token account</div>
                <div className="text-red-400">9wW1ZN…oVqb</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">Destination token account</div>
                <div className="text-red-400">EMgU1Z…5AAB</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">Authority</div>
                <div className="text-red-400">C8ZNtY…P7HM</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">Mint</div>
                <div className="text-red-400">EPjFWd…Dt1v <span className="text-muted-foreground">(USDC)</span></div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-1">Amount</div>
                <div className="text-red-400">0.005002 USDC</div>
              </div>
            </div>
            <p className="mt-3 text-[11px] font-mono text-muted-foreground">
              Real Solana mainnet tx · slot 414565845 · captured 2026-04-20.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4 text-accent">VeilRail Observer View</h3>
            <div className="bg-card border border-border rounded-lg p-6 font-mono text-sm space-y-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,68,68,.2)_50%,transparent_75%,transparent_100%)] bg-[length:250px_250px] animate-[shimmer_2s_linear_infinite]" />
              <img
                src="/veilrail-logo.jpg"
                alt=""
                aria-hidden="true"
                className="pointer-events-none select-none absolute right-4 top-1/2 -translate-y-1/2 h-[80%] aspect-square rounded opacity-20 z-0"
              />
              <div className="relative z-10">
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Instruction</div>
                  <div>VerifyProof</div>
                </div>
                <div className="opacity-50">
                  <div className="text-muted-foreground text-xs mb-1">Sender</div>
                  <div>[Redacted]</div>
                </div>
                <div className="opacity-50">
                  <div className="text-muted-foreground text-xs mb-1">Receiver</div>
                  <div>[Redacted]</div>
                </div>
                <div className="opacity-50">
                  <div className="text-muted-foreground text-xs mb-1">Amount</div>
                  <div>[Redacted]</div>
                </div>
                <div className="mt-6 pt-4 border-t border-border">
                  <div className="text-muted-foreground text-xs mb-1">Commitment</div>
                  <div className="break-all text-xs text-accent">0x8f2a...c91e</div>
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              <InlineReceipt
                label="VerifyProof"
                value={`verifier ${DEVNET_PROGRAM_IDS.verifier.slice(0, 6)}…`}
                href={`https://explorer.solana.com/address/${DEVNET_PROGRAM_IDS.verifier}?cluster=devnet`}
                verifyLabel="explorer ↗"
              />
              <InlineReceipt
                label="alt_bn128 path"
                value="lib.rs:L67"
                href={`${VERIFIER_LIB}#L67`}
                verifyLabel="source ↗"
              />
            </div>
          </div>
        </div>

        <div id="broadcast" className="mt-16">
          <ConnectWalletPanel />
        </div>
      </div>
    </div>
  );
}

export function Compare() {
  useEffect(() => {
    document.title = "Compare — VeilRail";
  }, []);

  return (
    <WalletProviders>
      <CompareInner />
    </WalletProviders>
  );
}
