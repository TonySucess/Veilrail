# @veilrail/sdk

TypeScript client for VeilRail. Generates Groth16 proofs against the three
VeilRail circuits and submits them to the on-chain programs.

## Install

```
pnpm add @veilrail/sdk @solana/web3.js @coral-xyz/anchor
```

## Quickstart

```ts
import { VeilRail } from "@veilrail/sdk";
import { useWallet } from "@solana/wallet-adapter-react";

const wallet = useWallet();
const veil = new VeilRail({ cluster: "devnet", wallet });

const { session } = await veil.openSession({
  peer: "agent_8af2",
  maxNotional: 1_000_000, // 1 USDC ceiling
});

const proof = await veil.proveTransfer({ session, amount: 100_000 });
const sig   = await veil.submit(proof);
```

## Layout

| File                | Purpose                                                       |
| ------------------- | ------------------------------------------------------------- |
| `src/client.ts`     | High-level `VeilRail` class                                   |
| `src/proof.ts`      | snarkjs Groth16 proof generators per circuit                  |
| `src/hash.ts`       | Poseidon helpers backed by `circomlibjs`                      |
| `src/types.ts`      | Public type surface                                           |
| `src/constants.ts`  | Program IDs and circuit artifact URLs                         |

## Notes

- Proof artifacts (`.wasm`, `.zkey`) are loaded lazily from
  `https://artifacts.veilrail.xyz/devnet/v0.1.0` by default. Override via
  `VeilRailConfig.circuitArtifacts` if you self-host.
- All field elements are reduced mod the BN254 scalar field before being
  passed to the prover. Inputs out of range will throw.
- `VeilRail.submit` is intentionally not implemented in the browser SDK
  (it would require shipping the Anchor IDLs). Use the CLI or call the
  programs directly to land transactions.
