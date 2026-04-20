#!/usr/bin/env bash
# verify-keys.sh
#
# Sanity-check that the verification keys produced by the trusted setup
# ceremony match the expected protocol versions, curve, and circuit
# constraint shape (number of public inputs / IC commitments) the
# on-chain Anchor verifier expects. Run after the multi-party
# `ceremony.sh phase2-finalize` step (or after `build.sh` for dev builds),
# before uploading via scripts/veilrail/upload-vk.sh. The hashes printed by
# `ceremony.sh record-hashes` are the canonical values that must be pinned
# in the verifier-program upgrade tx.
#
# Each VeilRail circuit publishes 4 public inputs, so each VK must have
# nPublic=4 and exactly 5 IC commitments (nPublic + 1).

set -euo pipefail
cd "$(dirname "$0")/.."

EXPECTED=("veil_auth" "veil_completion" "veil_pool_note")
EXPECTED_NPUBLIC=4
EXPECTED_IC=5

for c in "${EXPECTED[@]}"; do
  vk="build/${c}/${c}_vk.json"
  if [ ! -f "$vk" ]; then
    echo "MISSING ${vk}" >&2
    exit 1
  fi
  protocol=$(node -e "console.log(require('./${vk}').protocol)")
  curve=$(node -e "console.log(require('./${vk}').curve)")
  npub=$(node -e "console.log(require('./${vk}').nPublic)")
  iclen=$(node -e "console.log(require('./${vk}').IC.length)")
  if [ "$protocol" != "groth16" ] || [ "$curve" != "bn128" ]; then
    echo "BAD VK ${vk}: protocol=${protocol} curve=${curve}" >&2
    exit 1
  fi
  if [ "$npub" != "$EXPECTED_NPUBLIC" ] || [ "$iclen" != "$EXPECTED_IC" ]; then
    echo "BAD VK ${vk}: nPublic=${npub} (want ${EXPECTED_NPUBLIC}), IC=${iclen} (want ${EXPECTED_IC})" >&2
    echo "  -> on-chain verifier will reject; circuit changed shape." >&2
    exit 1
  fi
  echo "OK ${c}: groth16/bn128 nPublic=${npub} IC=${iclen}"
done
