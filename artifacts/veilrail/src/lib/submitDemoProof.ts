import type { Connection } from "@solana/web3.js";
import { submitProof, type ProofBundle, type WalletLike } from "@veilrail/sdk";
import type { ProofOutput } from "./demoProof";
import { addRecentProof, updateRecentProof, type ProofEntry } from "./recentProofs";

/**
 * Convert a homepage/Playground demo proof into the SDK's ProofBundle
 * shape, record it locally, and (when a wallet is connected) broadcast it
 * to the verifier program on devnet.
 *
 * Records the entry up-front in `local` state so the Dashboard reflects
 * the run even if the user is not connected, then transitions the entry
 * through `submitting` → `submitted`/`failed` as the wallet round-trip
 * resolves.
 */
export async function recordAndSubmitDemoProof(args: {
  output: ProofOutput;
  page: ProofEntry["page"];
  connection: Connection;
  wallet: WalletLike | null;
}): Promise<ProofEntry> {
  const { output, page, connection, wallet } = args;

  const bundle: ProofBundle = {
    proof: output.rawProof,
    publicSignals: output.rawPublicSignals,
    circuit: "auth",
    stages: [],
    totalMs: output.elapsedMs,
  };

  const canSubmit = wallet?.publicKey != null;
  const entry = addRecentProof({
    circuit: "auth",
    publicSummary: output.commitment.slice(0, 16),
    publicSignals: output.publicSignals,
    signature: null,
    status: canSubmit ? "submitting" : "local",
    page,
  });

  if (!canSubmit || !wallet) return entry;

  try {
    const sig = await submitProof(connection, wallet, bundle);
    updateRecentProof(entry.id, { signature: sig, status: "submitted" });
    return { ...entry, signature: sig, status: "submitted" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    updateRecentProof(entry.id, { status: "failed", error: msg });
    return { ...entry, status: "failed", error: msg };
  }
}
