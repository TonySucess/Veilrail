# VeilRail Threat Model & Security

This document describes the trust assumptions, threat model, and known limitations of the VeilRail protocol. It is a living document and will evolve as the protocol matures from devnet to mainnet.

## Scope

VeilRail is a shielded payment and proof-of-payment protocol on Solana. It consists of:

- A set of Anchor programs that maintain a Merkle tree of note commitments and a nullifier set.
- Off-chain Groth16 circuits for deposit, transfer, and withdrawal.
- Client-side proving libraries that run entirely in the user's environment.

This document covers the on-chain programs, the circuits, and the reference client. It does not cover wallet software, RPC providers, or third-party indexers.

## Trust Assumptions

1. **Solana liveness and safety.** The protocol inherits the consensus and data-availability guarantees of Solana. A successful attack on Solana consensus would compromise VeilRail.
2. **Trusted setup integrity.** The current devnet circuits use a single-party setup intended for testing only. Mainnet will require a multi-party trusted setup ceremony with public transcripts.
3. **Cryptographic primitives.** We assume Groth16 over BN254, Poseidon, and Pedersen commitments are secure at the 128-bit level.
4. **Honest majority of relayers (optional).** Users may submit their own transactions; relayers are a privacy convenience, not a trust requirement for funds.
5. **Client integrity.** The user's device must not be compromised. Proofs are constructed from secret inputs that never leave the client.

## Threat Model

### In scope

- **Linkability between deposits and withdrawals** by passive on-chain observers.
- **Nullifier replay** or double-spend attempts against the program.
- **Malicious relayers** attempting to censor, reorder, or correlate transactions.
- **RPC-level metadata leakage** (IP, timing, request fingerprints).
- **Front-end supply chain attacks** that could exfiltrate secret notes.

### Out of scope

- Endpoint compromise of the user's device.
- Coercion of the user to reveal secrets.
- Statistical deanonymization based on off-chain context volunteered by the user.
- Quantum adversaries (Groth16 is not post-quantum secure).

## Anonymity Set Assumptions

The privacy guarantees of the protocol scale with the size and diversity of the anonymity set.

- The effective anonymity set is the set of unspent notes of the same denomination at the time of withdrawal.
- Users who deposit and withdraw the same uncommon amount receive weaker privacy.
- Users who withdraw shortly after depositing receive weaker privacy due to timing correlation.
- Documentation in the client surfaces anonymity-set size estimates so users can make informed choices.

## Known Limitations

- **Devnet trusted setup.** The current proving and verifying keys are not production safe.
- **Single relayer.** The reference relayer is operated by the team. A decentralized relayer market is on the roadmap.
- **No formal verification.** Programs and circuits have been reviewed but not formally verified.
- **Audit pending.** A full third-party audit is in progress. See the status table below.
- **Compliance tooling.** Optional viewing keys for selective disclosure are not yet implemented.

## Audit Status

| Firm | Scope | Status | Report |
| --- | --- | --- | --- |
| Trail of Bits | Anchor programs | In progress | Pending |
| zkSecurity | Groth16 circuits | Scheduled Q3 2026 | Pending |
| OtterSec | Reference client and relayer | Scoping | Pending |

Reports will be published in this repository under `audits/` once delivered.

## Reporting a Vulnerability

Please disclose privately to `security@veilrail.example` with a description, reproduction steps, and any suggested mitigation. We aim to acknowledge within 48 hours.
