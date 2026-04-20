#!/usr/bin/env bash
# Verifies the four detached SSH-Ed25519 signatures over CONTRIBUTORS.md
# produced by the v1 mainnet ceremony slate.
#
# Usage: bash scripts/verify-contributors.sh [path/to/ceremony]
#
# The optional argument lets a third party point this script at a downloaded
# copy of the ceremony bundle (e.g. fetched from the published website) so
# they can re-verify without cloning the repo.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CEREMONY_DIR="${1:-$ROOT/ceremony}"

if [ ! -f "$CEREMONY_DIR/CONTRIBUTORS.md" ]; then
  echo "error: $CEREMONY_DIR/CONTRIBUTORS.md not found" >&2
  exit 1
fi
if [ ! -f "$CEREMONY_DIR/allowed_signers" ]; then
  echo "error: $CEREMONY_DIR/allowed_signers not found" >&2
  exit 1
fi

ok=0
fail=0
for who in dry-run-1 dry-run-2 dry-run-3 dry-run-4; do
  sig="$CEREMONY_DIR/keys/${who}.sig"
  if [ ! -f "$sig" ]; then
    echo "FAIL ${who}: signature file missing ($sig)" >&2
    fail=$((fail + 1))
    continue
  fi
  if ssh-keygen -Y verify \
       -f "$CEREMONY_DIR/allowed_signers" \
       -I "${who}@veilrail-ceremony-v1" \
       -n veilrail-ceremony-v1 \
       -s "$sig" \
       < "$CEREMONY_DIR/CONTRIBUTORS.md" >/dev/null 2>&1; then
    echo "OK   ${who}"
    ok=$((ok + 1))
  else
    echo "FAIL ${who}" >&2
    fail=$((fail + 1))
  fi
done

echo
echo "verified: ${ok} ok, ${fail} fail"
if [ "$fail" -ne 0 ] || [ "$ok" -lt 4 ]; then
  exit 1
fi
