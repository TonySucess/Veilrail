#!/usr/bin/env bash
# upload-vk.sh
#
# Upload the three Groth16 verification keys (auth, completion, pool) to
# the deployed veil-verifier program. Reads vk JSON from
# packages/circuits/build/<circuit>/verification_key.json and invokes the
# `upload_vk` instruction with circuit_id 0/1/2.
#
# Requires the Anchor CLI and a funded Solana keypair on the configured
# cluster.

set -euo pipefail
cd "$(dirname "$0")/../../packages/programs"

for entry in "auth:0" "completion:1" "pool_note:2"; do
  name="${entry%%:*}"
  cid="${entry##*:}"
  vk="../circuits/build/${name}/verification_key.json"
  if [ ! -f "$vk" ]; then
    echo "Missing $vk — run scripts/veilrail/build-circuits.sh first." >&2
    exit 1
  fi
  echo "Uploading vk for ${name} (circuit_id=${cid})"
  npx ts-node migrations/upload_vk.ts --circuit "$cid" --vk "$vk"
  # Print the sha256 of the binary VK bytes that just got pinned on-chain.
  # Paste this value into the matching circuit's `vk_onchain_sha256` field
  # in packages/circuits/ceremony/vk-hashes.json so the /ceremony page can
  # flag any future drift between the public manifest and the verifier.
  onchain_line="$(node ../../scripts/veilrail/vk-to-onchain-hash.mjs "$vk")"
  onchain_hash="$(echo "$onchain_line" | awk -F'\t' '{print $3}')"
  echo "  vk_onchain_sha256(${name}) = ${onchain_hash}"
  echo "  -> update packages/circuits/ceremony/vk-hashes.json"
done
