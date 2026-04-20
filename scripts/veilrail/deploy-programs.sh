#!/usr/bin/env bash
# deploy-programs.sh
#
# Build and deploy the four VeilRail Anchor programs (registry, session,
# pool, verifier) to the cluster configured in packages/programs/Anchor.toml.
# Defaults to devnet. Requires the Solana toolchain and Anchor CLI.

set -euo pipefail
cd "$(dirname "$0")/../../packages/programs"
anchor build
anchor deploy
echo
echo "Programs deployed. Update packages/sdk/src/constants.ts PROGRAM_IDS"
echo "if any program ID changed."
