# @veilrail/circuits

Three Groth16 circuits powering the VeilRail privacy layer.

| Circuit             | File                          | Public inputs                                            | Constraints (approx) |
| ------------------- | ----------------------------- | -------------------------------------------------------- | -------------------- |
| VeilAuthProof       | `src/veil_auth.circom`        | sessionRoot, peerCommitment, maxNotional, epoch          | 4,200                |
| VeilCompletionProof | `src/veil_completion.circom`  | sessionRoot, nullifierHash, netCommit, maxNotional       | 12,800               |
| VeilPoolNote        | `src/veil_pool_note.circom`   | merkleRoot, nullifier, newCommitment, feeCommit          | 28,000               |

All three target the BN254 curve so that on-chain verification can use Solana's
`alt_bn128` syscalls (~312k CU per Groth16 verification).

## Build (development)

```
pnpm install                                # installs circomlib + snarkjs
bash scripts/ceremony.sh dev                # one-shot 2^15 dev ptau
DEV_BUILD=1 bash scripts/build.sh           # compiles + dev zkeys
```

`DEV_BUILD=1` derives a single-contributor zkey from the dev ptau. It is
clearly marked as non-production and must never be uploaded to mainnet.

Outputs land in `build/<circuit>/`:
- `<circuit>.r1cs`        constraint system
- `<circuit>.wasm`        witness generator (used by snarkjs in browser)
- `<circuit>_final.zkey`  proving key
- `<circuit>_vk.json`     verification key (consumed by the on-chain verifier)

## Mainnet trusted setup

Mainnet keys are produced by a multi-party ceremony coordinated through
`scripts/ceremony.sh`. The flow has two phases plus a public transcript.

### Pre-ceremony commitments (must publish *before* `ceremony.sh init`)

The mainnet ceremony does not start until the following three files have
been filled in, signed by every contributor, and published unchanged at
`artifacts/veilrail/public/ceremony/`:

- `ceremony/CONTRIBUTORS.md` — the named, independent contributor roster
  (≥4 per phase) with their SSH Ed25519 fingerprints. Detached signatures
  in `ceremony/CONTRIBUTORS.md.sig`, public keys in `ceremony/keys/`, and
  the principal map in `ceremony/allowed_signers`. Verify with
  `bash scripts/verify-contributors.sh`.
- `ceremony/BEACON.md` — the Bitcoin mainnet block height (currently
  **935,000**) whose hash becomes the public random beacon, fixed in
  advance and applied with SHA-256 rounds=10.
- `ceremony/ATTESTATION_TEMPLATE.md` — the per-turn attestation each
  contributor publishes within 24h of finishing their contribution.

`ceremony.sh` enforces the contributor-count floor at finalization time;
the human commitments above are what bind the resulting on-chain
`vk_sha256` to a publicly committed-to set of independent parties and an
unpredictable, pre-committed beacon.

### Phase 1 — powers-of-tau (BN254, 2^18)

```
bash scripts/build.sh                                # r1cs + wasm only
bash scripts/ceremony.sh init                        # coordinator
bash scripts/ceremony.sh contribute "Alice"          # contributor 1
bash scripts/ceremony.sh contribute "Bob"            # contributor 2
bash scripts/ceremony.sh contribute "Carol"          # …
bash scripts/ceremony.sh contribute "Dave"           # ≥4 parties recommended
bash scripts/ceremony.sh verify-pot                  # (any contributor)
bash scripts/ceremony.sh beacon <btc-block-hash> 10  # coordinator finalizes
```

Each contributor runs `contribute` on their own machine against the
previous contributor's `pot18_NNNN.ptau`. Toxic waste never leaves their
process; only the new `.ptau` is forwarded on. The beacon is a public,
unpredictable value (e.g. a future Bitcoin block hash committed to in
advance) applied with `<rounds>` iterations of SHA-256.

### Phase 2 — per-circuit Groth16 zkey

Repeat for each of `veil_auth`, `veil_completion`, `veil_pool_note`:

```
bash scripts/ceremony.sh phase2-init        veil_pool_note
bash scripts/ceremony.sh phase2-contribute  veil_pool_note "Alice"
bash scripts/ceremony.sh phase2-contribute  veil_pool_note "Bob"
bash scripts/ceremony.sh phase2-contribute  veil_pool_note "Carol"
bash scripts/ceremony.sh phase2-verify      veil_pool_note
bash scripts/ceremony.sh phase2-finalize    veil_pool_note <beacon-hex32> 10
```

`phase2-finalize` copies the beaconed zkey to `build/<circuit>/<circuit>_final.zkey`
and exports `<circuit>_vk.json`.

### Transcript & on-chain hashes

```
bash scripts/ceremony.sh transcript        # ceremony/TRANSCRIPT.md
bash scripts/ceremony.sh record-hashes     # ceremony/vk-hashes.json
bash scripts/ceremony.sh download-index    # ceremony/{download-index.json,DOWNLOADS.md}
bash scripts/ceremony.sh publish-website   # copy the four files into artifacts/veilrail/public/ceremony/
bash scripts/verify-keys.sh                # shape check vs. on-chain verifier
```

The website's `/ceremony` page reads `download-index.json` and
`vk-hashes.json` from `artifacts/veilrail/public/ceremony/` and renders the
full per-contribution table with download links and re-verification
instructions. Override `CEREMONY_DOWNLOAD_BASE_URL` before running
`download-index` to repoint every link at the actual hosting bucket / CDN
/ GitHub release used for the mainnet artifacts.

Publish `ceremony/TRANSCRIPT.md`, the per-contribution `.ptau` / `.zkey`
files, and `ceremony/vk-hashes.json`. The hashes in `vk-hashes.json` are
what the verifier-program upgrade tx must pin so anyone can independently
re-run `sha256sum` against the published artifacts.

The actual on-chain upload is done by `scripts/veilrail/upload-vk.sh`,
which calls the `upload_vk` instruction on the deployed `veil-verifier`
program once per circuit. That tx must include the `vk_sha256` from
`vk-hashes.json` so on-chain state binds to the published transcript.

> A real verification dry-run of phase 1 (4 simulated contributors at
> POT_POWER=14, fully snarkjs-verified, plus a random beacon) is
> committed in `ceremony/TRANSCRIPT.md`. The mainnet run will overwrite
> that file with the production POT_POWER=18 transcript and per-circuit
> phase 2 contributions. Phase 2 is intentionally NOT pre-run — the
> circom binary is not available in this workspace, so it must be
> executed once for each circuit on a build host.

## Trust assumptions

- Powers-of-tau toxic waste must not survive any single contributor.
  Security holds as long as **at least one** phase-1 contributor and
  **at least one** phase-2 contributor per circuit was honest.
- The dev path (`ceremony.sh dev` + `DEV_BUILD=1 build.sh`) uses one
  machine and is for development only — it must never produce mainnet keys.
- The mainnet ceremony is 2^18 with ≥4 independent phase-1 contributors,
  ≥4 independent phase-2 contributors per circuit, and a public random
  beacon (committed-to in advance) finalizing each phase. These minimums
  are enforced by `ceremony.sh` itself (`MIN_PHASE1_CONTRIBUTORS` /
  `MIN_PHASE2_CONTRIBUTORS`); the `beacon` and `phase2-finalize`
  subcommands hard-fail if the threshold is not met.
- Field arithmetic is over BN254 scalar field. All inputs must be reduced
  mod r before being passed to the prover; the SDK enforces this.

## Hashing

Poseidon (T=3, full=8, partial=57) per circomlib defaults. Switching to
Poseidon2 is on the roadmap for ~30% prover speedup once a tested Anchor
verifier exists.
