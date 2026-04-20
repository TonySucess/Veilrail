# Deploying VeilRail Programs to Solana Devnet

This is the one-time deployment of the four Anchor programs (`veil_registry`,
`veil_session`, `veil_pool`, `veil_verifier`) to Solana devnet. After this
runs, the dashboard's "deployment pending" banner is replaced with live
on-chain registry and session data.

## Build host requirements

The Solana SBF build step (`cargo build-sbf`, invoked by `anchor build`)
ships a prebuilt platform-tools toolchain that expects a standard
glibc-based Linux dynamic linker. It is known to work on:

- macOS (Apple Silicon or Intel), 13.0 or newer
- Ubuntu / Debian / Fedora on x86_64 with glibc 2.31+
- WSL2 with an Ubuntu 22.04 distribution

It will not run on musl-based distributions (Alpine) or on Linux
distributions whose dynamic linker is not at the expected glibc path
without manual patchelf'ing of the toolchain binaries. Use one of the
supported hosts.

## Prerequisites

- A supported host from the list above
- ~10 GB free disk
- ~60 minutes for first-time install + build + deploy

## 1. Install the toolchain

```bash
# Rust 1.79+
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain 1.79.0
source "$HOME/.cargo/env"

# Solana CLI 1.18.26
sh -c "$(curl -sSfL https://release.anza.xyz/v1.18.26/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Anchor 0.30.1
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install 0.30.1
avm use 0.30.1
```

Verify:

```bash
rustc --version    # 1.79+
solana --version   # solana-cli 1.18.26
anchor --version   # anchor-cli 0.30.1
```

## 2. Create and fund a devnet wallet

```bash
solana-keygen new -o ~/.config/solana/id.json   # press Enter twice for no passphrase
solana config set --url https://api.devnet.solana.com
solana address                                   # copy this
```

Get ~10 SOL of test funds (deploying four programs costs ~6–8):

- Easiest: visit https://faucet.solana.com, paste your address, set network
  to **Devnet**, request 5 SOL twice.
- Or `solana airdrop 2` from CLI (frequently rate-limited).

```bash
solana balance   # should show >= 8 SOL
```

## 3. Build the programs

From the repo root:

```bash
cd packages/programs

# Generate one keypair per program. The pubkey of each keypair becomes the
# program's on-chain ID, so do this BEFORE the first build.
mkdir -p target/deploy
solana-keygen new --no-bip39-passphrase -o target/deploy/veil_registry-keypair.json
solana-keygen new --no-bip39-passphrase -o target/deploy/veil_session-keypair.json
solana-keygen new --no-bip39-passphrase -o target/deploy/veil_pool-keypair.json
solana-keygen new --no-bip39-passphrase -o target/deploy/veil_verifier-keypair.json

# Read the four IDs back; you'll paste them into source files in step 4.
solana address -k target/deploy/veil_registry-keypair.json
solana address -k target/deploy/veil_session-keypair.json
solana address -k target/deploy/veil_pool-keypair.json
solana address -k target/deploy/veil_verifier-keypair.json
```

## 4. Wire the real program IDs into the codebase

Replace the placeholder IDs (`VeiR1stry…`, `VeiSession…`, `VeiPoo…`,
`VeiVerify…`) with the four IDs printed above in **all five** of these
files:

| File | What to update |
| --- | --- |
| `packages/programs/programs/veil-registry/src/lib.rs` | `declare_id!(...)` |
| `packages/programs/programs/veil-session/src/lib.rs`  | `declare_id!(...)` |
| `packages/programs/programs/veil-pool/src/lib.rs`     | `declare_id!(...)` |
| `packages/programs/programs/veil-verifier/src/lib.rs` | `declare_id!(...)` |
| `packages/programs/Anchor.toml`                       | `[programs.devnet]` block |
| `packages/sdk/src/constants.ts`                       | `PROGRAM_IDS` map |
| `artifacts/veilrail/src/lib/deployment.ts`            | `DEVNET_PROGRAM_IDS` map |

## 5. Build

```bash
cd packages/programs
anchor build
```

First build downloads the SBF toolchain (~500 MB) and takes 15–25 min.
Output `.so` files land in `target/deploy/`.

## 6. Deploy

```bash
anchor deploy --provider.cluster devnet
```

Anchor prints "Program Id: ..." for each of the four. They must match the
IDs from step 3. If a deploy fails partway with "insufficient funds",
top up with `solana airdrop 2` and rerun — `anchor deploy` resumes.

## 7. Initialize on-chain state (optional but recommended)

Once the four programs are deployed the dashboard already reports live
state — it falls back to the cluster's current epoch and reads the
session program's account count directly. So this step is **not
required for the "Devnet — live" banner to show real numbers.**

It *is* required before the registry exposes its own epoch counter and
agent count. After this `initialize` call the dashboard will switch
from the cluster epoch to the registry's bookkeeping epoch:

```bash
cd packages/programs
anchor run init-registry --provider.cluster devnet
```

The script (`migrations/init-registry.ts`) prints the registry PDA and tx
signature, and is idempotent — if the registry account already exists it
exits successfully without sending a transaction, so it's safe to re-run.

## 8. Flip the dashboard to live

In `artifacts/veilrail/src/lib/deployment.ts`, change:

```ts
export const DEPLOYMENT_STATUS: "pending" | "live" = "pending";
```

to:

```ts
export const DEPLOYMENT_STATUS: "pending" | "live" = "live";
```

Restart the `artifacts/veilrail: web` workflow. The banner now reads
`Devnet — live  epoch <N>  sessions <N>` and pulls real data from the
chain via `fetchDevnetStats()`.

## 9. Verify on a block explorer

For each of the four IDs:

```
https://explorer.solana.com/address/<PROGRAM_ID>?cluster=devnet
```

You should see "Program" with the correct upgrade authority (your wallet).

---

## Example: submitting a Groth16 proof to the verifier

Once deployed, a proof submission to the auth verifier looks like this:

```ts
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import verifierIdl from "./target/idl/veil_verifier.json";
import { generateAuthProof } from "@veilrail/sdk";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const verifier = new Program(verifierIdl as any, provider);

// 1. Generate a Groth16 proof off-chain (Snarkjs via the SDK).
const bundle = await generateAuthProof(authInput, circuitArtifacts);

// 2. Convert snarkjs format -> on-chain bytes (32-byte big-endian per scalar,
//    64 bytes per G1, 128 bytes per G2).
const toBE32 = (n: string) => {
  const buf = Buffer.alloc(32);
  const v = BigInt(n).toString(16).padStart(64, "0");
  buf.write(v, "hex");
  return buf;
};
const proof_a = Buffer.concat([toBE32(bundle.proof.pi_a[0]), toBE32(bundle.proof.pi_a[1])]);
const proof_b = Buffer.concat([
  toBE32(bundle.proof.pi_b[0][1]), toBE32(bundle.proof.pi_b[0][0]),
  toBE32(bundle.proof.pi_b[1][1]), toBE32(bundle.proof.pi_b[1][0]),
]);
const proof_c = Buffer.concat([toBE32(bundle.proof.pi_c[0]), toBE32(bundle.proof.pi_c[1])]);
const public_inputs = bundle.publicSignals.map((p) => Array.from(toBE32(p)));

// 3. Derive the VK PDA (circuit_id = 0 for auth).
const [vkPda] = anchor.web3.PublicKey.findProgramAddressSync(
  [Buffer.from("vk"), Buffer.from([0])],
  verifier.programId,
);

// 4. Submit.
const sig = await verifier.methods
  .verifyAuth({
    proofA: Array.from(proof_a),
    proofB: Array.from(proof_b),
    proofC: Array.from(proof_c),
    publicInputs: public_inputs,
  })
  .accounts({ vk: vkPda })
  .rpc();

console.log("Auth proof verified on-chain in tx:", sig);
```

The circuit's verification key (`vk`) must already be uploaded via
`upload_vk(circuit_id, vk_bytes)` from your authority wallet — once per
circuit, after `anchor deploy`. The `vk_bytes` come from the trusted-setup
ceremony output (`veil_auth_final.zkey` -> `verification_key.json` ->
on-chain encoding).
