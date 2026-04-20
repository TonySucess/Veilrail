#!/usr/bin/env bash
# build-circuits.sh
#
# Compile the three VeilRail circom circuits and produce the .wasm + .r1cs
# artifacts that the SDK loads at runtime. Requires `circom` and `snarkjs`
# on the PATH. Outputs land in packages/circuits/build/.
#
# Run trusted setup separately via packages/circuits/scripts/ceremony.sh
# (multi-party 2^18 for mainnet, or `ceremony.sh dev` + DEV_BUILD=1 locally).

set -euo pipefail
cd "$(dirname "$0")/../../packages/circuits"
exec ./build.sh "$@"
