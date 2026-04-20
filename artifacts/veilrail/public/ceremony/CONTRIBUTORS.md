> **STATUS: DRY RUN — NOT THE MAINNET CEREMONY.**
> The four entries in the roster below are placeholders generated to
> exercise the signing/verification tooling end-to-end. They are **not**
> real organizations, do not represent any real party, and the
> `verifiable contact` URLs intentionally use the `.example` reserved TLD.
> Before the mainnet ceremony, this file will be replaced by a v1 roster
> co-signed by four independent third parties recruited off-platform, and
> the placeholder keys under `keys/` will be removed.

# VeilRail mainnet ceremony — contributor commitment template

This file is the **format** of the published, signed pre-ceremony
commitment for the VeilRail mainnet trusted setup. Once real contributors
are recruited, the published v1 of this file will name the four
independent parties who will run `ceremony.sh contribute` (phase 1) and
`ceremony.sh phase2-contribute` (phase 2, once per circuit) and the
public Bitcoin block-height beacon they will all use to finalize each
phase (see `BEACON.md`).

Detached SSH-Ed25519 signatures from every contributor are appended in
`CONTRIBUTORS.md.sig`. Verification uses `ssh-keygen -Y verify` against
the public keys in `keys/<handle>_ed25519.pub`. All four public keys,
this file, the signature file, and `BEACON.md` are mirrored to
`artifacts/veilrail/public/ceremony/` and are part of the published
ceremony bundle.

## Independence requirements

To preserve the "≥1 honest contributor" assumption stated in
`packages/circuits/README.md`:

- At least **4** contributors per phase (enforced by `MIN_PHASE1_CONTRIBUTORS`
  and `MIN_PHASE2_CONTRIBUTORS` in `scripts/ceremony.sh`).
- Each contributor is a different organization, on a different machine,
  on a different network, in a different jurisdiction.
- No contributor is employed by, contracted to, or shares equity with the
  VeilRail core team.
- Contributors do not share build hosts, key material, or cloud accounts
  with each other.
- Each contributor destroys their working directory (intermediate `.ptau` /
  `.zkey` and any randomness) immediately after their turn and publishes a
  short attestation (see `ATTESTATION_TEMPLATE.md`) confirming they did so.

## Contributors (dry-run placeholders)

Order is the order in which `contribute` / `phase2-contribute` will be run.
The same roster is used for phase 1 and for each circuit's phase 2.

| # | Handle      | Affiliation                          | Jurisdiction       | SSH-Ed25519 fingerprint (SHA-256)                     | Verifiable contact                | Phases |
| - | ----------- | ------------------------------------ | ------------------ | ----------------------------------------------------- | --------------------------------- | ------ |
| 1 | dry-run-1   | Dry-run placeholder (to be replaced) | (TBD)              | `SHA256:NpS40AyRH82Dl6Qsu6aSaTax/Drh3tXZwTpC9UTupts`  | `<dryrun-1>.example` (not a site) | 1, 2   |
| 2 | dry-run-2   | Dry-run placeholder (to be replaced) | (TBD)              | `SHA256:CMHmk6h8JTU/i+uTVqv5yobgXPLqK0QgIL3WUif8qhY`  | `<dryrun-2>.example` (not a site) | 1, 2   |
| 3 | dry-run-3   | Dry-run placeholder (to be replaced) | (TBD)              | `SHA256:679PYe1OCcFriQsX858ZH7hpG8SVLjWkyAr0UksAnyY`  | `<dryrun-3>.example` (not a site) | 1, 2   |
| 4 | dry-run-4   | Dry-run placeholder (to be replaced) | (TBD)              | `SHA256:QH1PI+kl9q8Po/Zj/oN7RWOJr4QLtH4jip7AnGx1WE8`  | `<dryrun-4>.example` (not a site) | 1, 2   |

The full Ed25519 public keys are committed at
`packages/circuits/ceremony/keys/<handle>_ed25519.pub` and mirrored at
`artifacts/veilrail/public/ceremony/keys/<handle>_ed25519.pub`. They
exist only so that anyone reproducing the dry-run can re-verify the
signature pipeline; they will be removed when the real roster is
published.

> **Why publish the dry-run at all?** So that the format of the v1
> commitment file, the signing namespace, the per-signer signature file
> layout, and the verify command are all already in the repo and have
> been exercised end-to-end. The published values themselves carry no
> mainnet weight.

## Signing procedure

Every contributor signs **this exact file** (byte-for-byte) using
`ssh-keygen -Y sign` with the namespace `veilrail-ceremony-v1` and
appends their detached signature to `CONTRIBUTORS.md.sig`:

```
ssh-keygen -Y sign \
  -f keys/<handle>_ed25519 \
  -n veilrail-ceremony-v1 \
  CONTRIBUTORS.md
# produces CONTRIBUTORS.md.sig (one per signer; concatenate all four)
```

Verification (anyone, anywhere):

```
# allowed_signers is published next to this file
bash scripts/verify-contributors.sh   # runs all four ssh-keygen -Y verify calls
```

## What this commits the contributors to

By signing, each contributor commits to:

- Running their assigned `contribute` / `phase2-contribute` step on a
  freshly provisioned, network-isolated build host.
- Using **only** the beacon source committed in `BEACON.md` to finalize
  each phase (Bitcoin mainnet block hash at the height fixed there,
  applied with SHA-256 rounds=10).
- Publishing an attestation per `ATTESTATION_TEMPLATE.md` within 24h of
  completing their turn.
- Not contributing under any other identity in the same ceremony.
