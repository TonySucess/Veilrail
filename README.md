<p align="center">
  <img src="artifacts/veilrail/public/veilrail-logo.jpg" alt="VeilRail" width="120" />
</p>

<h1 align="center"><a href="https://veilrail.com">VeilRail</a></h1>

<p align="center">
  Zero-knowledge privacy layer for AI agent-to-agent payments on Solana.
  <br/>
  <em>The privacy layer for Coinbase's x402 protocol.</em>
  <br/>
  <strong>Website:</strong> <a href="https://veilrail.com">https://veilrail.com</a>
</p>

<p align="center">
  <a href="https://github.com/TonySucess/veilrail/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache%202.0-blue.svg" /></a>
  <img alt="Stage" src="https://img.shields.io/badge/stage-devnet-orange.svg" />
  <img alt="Solana" src="https://img.shields.io/badge/chain-Solana-9945FF.svg" />
  <img alt="ZK" src="https://img.shields.io/badge/proofs-Groth16%20%2F%20BN254-00ff9d.svg" />
</p>

---

## What this is

VeilRail lets autonomous AI agents pay each other on Solana with
zero-knowledge proofs so amounts, counterparties, and session state never
appear on-chain. It is designed as a drop-in privacy layer for x402-style
agent-to-agent payment flows.

This monorepo contains the protocol source code and the public website.

```
.
├── artifacts/veilrail/   React + Vite website (marketing, docs, dashboard)
├── packages/circuits/    Three Groth16 circuits (Circom, BN254)
├── packages/programs/    Four Anchor programs (Rust)
└── packages/sdk/         @veilrail/sdk TypeScript client
```

## Stage

Devnet only. Mainnet is targeted for Q3 2026.

## Components

| Layer    | Where                          | What                                                                  |
| -------- | ------------------------------ | --------------------------------------------------------------------- |
| Circuits | `packages/circuits/src`        | `VeilAuthProof`, `VeilCompletionProof`, `VeilPoolNote`                |
| Programs | `packages/programs/programs`   | `veil-registry`, `veil-session`, `veil-pool`, `veil-verifier`         |
| SDK      | `packages/sdk/src`             | `VeilRail` client, proof generators, Poseidon helpers                 |
| Website  | `artifacts/veilrail/src`       | Marketing pages, `/docs`, `/compare`, `/dashboard` with wallet connect |

## Quick start

Install workspace dependencies:

```
pnpm install
```

Run the website locally:

```
pnpm --filter @veilrail/web dev
```

Run the SDK tests:

```
pnpm --filter @veilrail/sdk test
```

## Build the circuits

For local development:

```
cd packages/circuits
pnpm install
bash scripts/ceremony.sh dev          # 2^15 single-contributor dev ptau
DEV_BUILD=1 bash scripts/build.sh     # r1cs + wasm + dev zkeys
```

For the mainnet multi-party trusted setup (2^18, ≥4 contributors per
phase, public transcript, on-chain hash recording) see
[`packages/circuits/README.md`](packages/circuits/README.md#mainnet-trusted-setup).

The transcript, per-contribution `.ptau` / `.zkey` files, finalized
proving keys, and their sha256 hashes are published at `/ceremony` on
the website. Anyone can re-verify the pinned on-chain values by
downloading the artifacts listed in `download-index.json` and running
`sha256sum` against them.

## Build the Anchor programs

```
cd packages/programs
anchor build
anchor deploy --provider.cluster devnet
anchor run init-registry --provider.cluster devnet   # idempotent
```

Full deploy walkthrough: [`packages/programs/DEPLOY.md`](packages/programs/DEPLOY.md).

## Trust model

- Circuits compile to BN254 so on-chain verification can use Solana's
  `alt_bn128` syscalls (~312k CU per Groth16 verification).
- Powers-of-tau for mainnet uses a 2^18 multi-party ceremony with ≥4
  independent contributors per phase and a public random beacon,
  coordinated by `packages/circuits/scripts/ceremony.sh`. Per-VK sha256
  hashes are published and pinned on-chain in the verifier-program
  upgrade tx. The single-machine dev ceremony (`ceremony.sh dev`) is for
  development only and is not safe for mainnet use.
- The verifier program stores verification keys on-chain. Upgrades are
  guarded by the registry epoch — bumping the epoch invalidates all
  outstanding proofs.

See [`SECURITY.md`](./SECURITY.md) for the full threat model, in-scope /
out-of-scope assumptions, and disclosure policy.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). Security issues should follow
[`SECURITY.md`](./SECURITY.md) and not be filed as public GitHub issues.

## License

Apache-2.0 — see [`LICENSE`](./LICENSE).
