# VeilRail mainnet ceremony — beacon commitment

The phase-1 powers-of-tau and each circuit's phase-2 zkey are finalized with
a public, unpredictable beacon. This file commits to **which** beacon will
be used, **before** any contributor begins, so the coordinator cannot grind
beacon values after the fact.

This file MUST be published unchanged at
`artifacts/veilrail/public/ceremony/BEACON.md` together with `CONTRIBUTORS.md` and is referenced by name from inside
`CONTRIBUTORS.md`, which is itself signed by every contributor with
SSH-Ed25519 (see `CONTRIBUTORS.md.sig` and `allowed_signers`). Editing
the target block height below therefore invalidates the contributor
signatures over `CONTRIBUTORS.md` and re-triggers the full sign-off.

## Beacon source

- Chain: **Bitcoin mainnet**
- Target block height: **935,000** (estimated mining time mid-June 2026,
  approximately 6 weeks after this commitment file is signed; ≥144 blocks
  later than every contributor's scheduled `contribute` /
  `phase2-contribute` turn)
- Beacon value: the 32-byte little-endian block hash of the first Bitcoin
  mainnet block at or after the target height, expressed as 64 lowercase
  hex characters with no `0x` prefix.
- Application: `<rounds>` = **10** iterations of SHA-256 over the 32-byte
  beacon, exactly as implemented by `snarkjs powersoftau beacon` and
  `snarkjs zkey beacon`. This matches the `<rounds>` argument already wired
  into `ceremony.sh beacon` and `ceremony.sh phase2-finalize`.

## Why Bitcoin mainnet at a future height

- Public: anyone can independently fetch the block hash from any full node
  or block explorer.
- Unpredictable: the block hash is a proof-of-work output, infeasible to
  grind by the time the ceremony ends.
- Committed in advance: the height is fixed in this file and signed by every
  contributor before any randomness is sampled, so the coordinator cannot
  retroactively choose a favorable beacon.

## Verification procedure (for any third party)

1. Fetch this file, `CONTRIBUTORS.md`, `CONTRIBUTORS.md.sig`,
   `allowed_signers`, and `keys/<handle>_ed25519.pub` from the published
   location.
2. Run `bash scripts/verify-contributors.sh <ceremony-dir>` (or the four
   `ssh-keygen -Y verify` invocations it wraps) and confirm every
   contributor signature is `Good`.
3. Confirm that the target block height in this file is **earlier** than the
   block height whose hash appears in `TRANSCRIPT.md` under the
   `beacon <hex> rounds=10` lines (i.e. the beacon was committed *before*
   the block existed).
4. Fetch the actual Bitcoin block hash at the committed height from any
   independent source and confirm it matches the value recorded in
   `TRANSCRIPT.md`.
5. Run `bash scripts/verify-keys.sh` to confirm the on-chain `vk_sha256`
   matches `ceremony/vk-hashes.json`, which is bound to this beacon.

## Failure modes

- If the Bitcoin chain reorgs the target block within 100 blocks of
  finalization, the ceremony coordinator MUST restart phase-2 finalization
  using a new height committed in an addendum to this file, signed by every
  contributor.
- If any contributor fails to publish their attestation within 24h of their
  turn, the coordinator MUST either drop them from the roster (and rerun
  from their predecessor) or abort the ceremony. Silently proceeding is
  not allowed.
