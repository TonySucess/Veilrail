# Contributing to VeilRail

Thanks for your interest. VeilRail is an early-stage zero-knowledge
privacy protocol; correctness and reproducibility matter more than speed
of merge. This document outlines how to file an issue, propose a change,
and run the local test suites.

## Project layout

```
artifacts/veilrail/   React + Vite website (marketing, docs, dashboard)
packages/circuits/    Circom circuits + trusted setup tooling
packages/programs/    Anchor (Rust) Solana programs
packages/sdk/         @veilrail/sdk TypeScript client
scripts/veilrail/     Operator scripts (build circuits, deploy, upload VKs)
```

## Filing issues

- **Security issues** must follow [`SECURITY.md`](./SECURITY.md). Do not
  open a public issue for vulnerabilities.
- For everything else, please include: the package affected, what you
  expected, what happened, and a minimal reproduction (commands or a
  failing test).

## Development setup

Requirements:

- Node.js 20+
- pnpm 10+
- Rust (stable) and Solana / Anchor toolchains for the on-chain programs
- `circom` and `snarkjs` for the circuits

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

Build the circuits (development ceremony — not for mainnet):

```
cd packages/circuits
bash scripts/ceremony.sh dev
DEV_BUILD=1 bash scripts/build.sh
```

Build the Anchor programs (requires a non-NixOS host with the Anchor
CLI; see `packages/programs/DEPLOY.md`):

```
cd packages/programs
anchor build
```

## Pull requests

- Keep PRs small and scoped to one change.
- Update the relevant package `README.md` whenever public behavior or
  CLI surface changes.
- Run `pnpm -r typecheck` and the package's own test command before
  pushing.
- Cryptographic changes (circuits, verifier program, hashing helpers)
  require a corresponding test that checks against a known answer or a
  round-trip with a freshly generated proof.

## Coding style

- TypeScript: 2-space indent, no default exports for libraries, named
  exports preferred.
- Rust: `cargo fmt` and `cargo clippy` clean.
- Circom: one circuit per file under `packages/circuits/src/`.

## Code of conduct

Be respectful, assume good faith, and keep technical discussion on the
technical merits. Personal attacks, harassment, or discriminatory
conduct are not tolerated and will result in removal from the project.
