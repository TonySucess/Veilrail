/**
 * Idempotent one-shot initializer for the veil_registry singleton.
 *
 * Run via:
 *   anchor run init-registry --provider.cluster devnet
 *
 * Anchor's [scripts] runner injects ANCHOR_PROVIDER_URL and ANCHOR_WALLET
 * from the active provider, so AnchorProvider.env() picks them up.
 *
 * If the registry PDA already exists this exits successfully without
 * sending a transaction, so the script is safe to re-run.
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import idl from "../target/idl/veil_registry.json";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = new Program(idl as anchor.Idl, provider);

  const [registryPda, bump] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("registry")],
    program.programId,
  );

  console.log("Program ID:  ", program.programId.toBase58());
  console.log("Registry PDA:", registryPda.toBase58(), `(bump ${bump})`);
  console.log("Authority:   ", provider.wallet.publicKey.toBase58());
  console.log("Cluster:     ", provider.connection.rpcEndpoint);

  const existing = await provider.connection.getAccountInfo(registryPda);
  if (existing !== null) {
    console.log(
      `\nRegistry account already exists (${existing.data.length} bytes, owner ${existing.owner.toBase58()}). Nothing to do.`,
    );
    return;
  }

  const sig = await program.methods
    .initialize()
    .accounts({
      registry: registryPda,
      authority: provider.wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  console.log("\nRegistry initialized.");
  console.log("Tx signature:", sig);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("init-registry failed:", err);
    process.exit(1);
  },
);
