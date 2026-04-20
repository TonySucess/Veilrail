#!/usr/bin/env bash
# Build all VeilRail circuits to .r1cs / .wasm artifacts and, when a phase-2
# ceremony has finalized, copy the verification keys into build/<circuit>/.
# Requires: circom 2.1.6+, snarkjs 0.7.5+, node 18+.
#
# This script does NOT produce proving keys on its own — those are the output
# of the multi-party ceremony in scripts/ceremony.sh. The flow is:
#
#   1. bash scripts/build.sh                       # compiles r1cs + wasm
#   2. bash scripts/ceremony.sh init               # phase 1
#   3. bash scripts/ceremony.sh contribute <name>  # repeated, ≥4 parties
#   4. bash scripts/ceremony.sh beacon <hex32>
#   5. bash scripts/ceremony.sh phase2-init <c>            # per circuit
#   6. bash scripts/ceremony.sh phase2-contribute <c> ...  # repeated
#   7. bash scripts/ceremony.sh phase2-finalize <c> <hex32>
#
# After step 7 the build/<circuit>/<circuit>_final.zkey and _vk.json files are
# in place. Re-running this script after a circom edit will recompile r1cs/wasm
# but will refuse to silently overwrite an existing _final.zkey, since doing so
# would invalidate the on-chain hash.
#
# For local development without a real ceremony, run `scripts/ceremony.sh dev`
# first and pass DEV_BUILD=1 to this script — it will derive a single-party
# zkey from the dev ptau, clearly marked as non-production.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/src"
OUT="$ROOT/build"
PROD_PTAU="$ROOT/ceremony/pot18_final.ptau"
DEV_PTAU="$ROOT/ceremony/pot15_final.ptau"

mkdir -p "$OUT"

CIRCUITS=(veil_auth veil_completion veil_pool_note)

for c in "${CIRCUITS[@]}"; do
  echo "==> $c"
  out="$OUT/$c"
  mkdir -p "$out"

  circom "$SRC/$c.circom" \
    --r1cs --wasm --sym \
    -l node_modules \
    -o "$out"

  final_zkey="$out/${c}_final.zkey"
  vk="$out/${c}_vk.json"

  if [ -f "$final_zkey" ] && [ -f "$vk" ]; then
    echo "    keeping existing ceremony output:"
    echo "      $final_zkey"
    echo "      $vk"
    continue
  fi

  if [ "${DEV_BUILD:-0}" = "1" ]; then
    [ -f "$DEV_PTAU" ] || {
      echo "DEV_BUILD=1 but $DEV_PTAU missing; run 'scripts/ceremony.sh dev' first" >&2
      exit 1
    }
    echo "    DEV build: deriving single-party zkey from $DEV_PTAU"
    snarkjs groth16 setup "$out/$c.r1cs" "$DEV_PTAU" "$out/${c}_0000.zkey"
    snarkjs zkey contribute "$out/${c}_0000.zkey" "$final_zkey" \
      --name="VeilRail DEV contributor" -v -e="$(openssl rand -hex 32)"
    snarkjs zkey export verificationkey "$final_zkey" "$vk"
    continue
  fi

  if [ ! -f "$PROD_PTAU" ]; then
    echo "    no $final_zkey and no $PROD_PTAU — run scripts/ceremony.sh" >&2
    echo "    (or DEV_BUILD=1 bash scripts/build.sh after scripts/ceremony.sh dev)" >&2
    exit 1
  fi

  echo "    r1cs/wasm compiled. Run the phase-2 ceremony to produce $final_zkey:" >&2
  echo "      bash scripts/ceremony.sh phase2-init $c" >&2
  echo "      bash scripts/ceremony.sh phase2-contribute $c <name>   # repeated" >&2
  echo "      bash scripts/ceremony.sh phase2-finalize $c <beacon-hex32>" >&2
done

echo "Build complete. Artifacts in $OUT/"
