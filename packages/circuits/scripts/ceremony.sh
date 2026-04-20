#!/usr/bin/env bash
# Multi-party trusted setup coordinator for VeilRail circuits.
#
# This script orchestrates a production-grade Groth16 ceremony:
#   * Phase 1: a 2^18 powers-of-tau on BN254 with N independent contributors,
#     finalized with a public random beacon.
#   * Phase 2: per-circuit zkey ceremony, also with N independent contributors,
#     finalized with the same beacon scheme.
#   * Transcript: every artifact, contributor name, and snarkjs verification
#     output is recorded under ceremony/transcript/, then summarized into
#     TRANSCRIPT.md and vk-hashes.json so the verifier-program upgrade tx
#     can pin the on-chain hashes.
#
# The script is intentionally a coordinator only — each contributor runs the
# `contribute` / `phase2-contribute` subcommands on their own machine against
# the previous contributor's artifact. Toxic waste never leaves the
# contributor's process; only the new .ptau / .zkey files are transmitted on.
#
# For local development the legacy single-contributor 2^15 path is preserved
# under the `dev` subcommand. It MUST NOT be used to produce mainnet keys.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CEREMONY_DIR="$ROOT/ceremony"
POT_DIR="$CEREMONY_DIR/pot"
PHASE2_DIR="$CEREMONY_DIR/phase2"
TRANSCRIPT_DIR="$CEREMONY_DIR/transcript"
BUILD_DIR="$ROOT/build"

POT_POWER="${POT_POWER:-18}"
POT_PREFIX="pot${POT_POWER}"
POT_FINAL="$CEREMONY_DIR/${POT_PREFIX}_final.ptau"
CIRCUITS=(veil_auth veil_completion veil_pool_note)

# Minimum independent contributors required before a phase may be finalized.
# A trusted setup is secure as long as at least ONE contributor was honest, but
# we require multiple to make that assumption robust. Override only for testing.
MIN_PHASE1_CONTRIBUTORS="${MIN_PHASE1_CONTRIBUTORS:-4}"
MIN_PHASE2_CONTRIBUTORS="${MIN_PHASE2_CONTRIBUTORS:-4}"

mkdir -p "$CEREMONY_DIR" "$POT_DIR" "$PHASE2_DIR" "$TRANSCRIPT_DIR"

log() { printf '[ceremony] %s\n' "$*"; }
die() { printf '[ceremony] ERROR: %s\n' "$*" >&2; exit 1; }

sha256_of() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

# Produce a numbered filename for a contribution slot.
# usage: slot_path <dir> <prefix> <index> <ext>   ->  <dir>/<prefix>_<NNNN>.<ext>
slot_path() {
  printf '%s/%s_%04d.%s' "$1" "$2" "$3" "$4"
}

usage() {
  cat <<'EOF'
Usage: ceremony.sh <subcommand> [args]

Phase 1 (powers-of-tau, BN254, 2^18):
  init                                    Create pot18_0000.ptau (coordinator only).
  contribute <name> [entropy]             Append the next contribution; auto-numbered.
                                          Entropy defaults to `openssl rand -hex 32`.
  verify-pot [index]                      Verify a specific contribution (default: latest).
  beacon <hex32> <rounds>                 Apply random beacon and prepare phase 2.
                                          Produces pot18_final.ptau. Must be run once
                                          after the last human contribution.

Phase 2 (per-circuit Groth16 zkey):
  phase2-init <circuit>                   Generate <circuit>_0000.zkey from r1cs+ptau.
  phase2-contribute <circuit> <name> [entropy]
                                          Append the next per-circuit contribution.
  phase2-verify <circuit> [index]         Verify a phase-2 contribution (default: latest).
  phase2-finalize <circuit> <hex32> <rounds>
                                          Apply beacon, copy to build/<circuit>/<circuit>_final.zkey,
                                          export verification key.

Transcript & on-chain hashes:
  transcript                              Render TRANSCRIPT.md from contributor logs.
  record-hashes                           Write ceremony/vk-hashes.json (sha256 of each VK
                                          + final zkey) for the on-chain upgrade tx.
  download-index                          Write ceremony/download-index.json and
                                          ceremony/DOWNLOADS.md listing every published
                                          artifact (per-contribution ptau/zkey, finals,
                                          VKs) with size + sha256 + download URL. Set
                                          CEREMONY_DOWNLOAD_BASE_URL to control the URL
                                          prefix (default https://downloads.veilrail.example/ceremony).
  publish-website                         Copy TRANSCRIPT.md, vk-hashes.json, and
                                          download-index.json into the website's
                                          public/ceremony/ so the /ceremony page can
                                          serve them statically.

Development only (NOT for mainnet):
  dev                                     One-shot 2^15 single-contributor ceremony,
                                          producing pot15_final.ptau for local builds.

Environment:
  CONTRIBUTOR_NAME            default name for the `contribute` subcommands
  POT_POWER                   powers-of-tau exponent (default 18)
  MIN_PHASE1_CONTRIBUTORS     minimum phase-1 contributions required before
                              `beacon` will run (default 4)
  MIN_PHASE2_CONTRIBUTORS     minimum phase-2 contributions per circuit before
                              `phase2-finalize` will run (default 4)
EOF
}

# ---------------------------------------------------------------- phase 1 ----

cmd_init() {
  local target
  target="$(slot_path "$POT_DIR" "$POT_PREFIX" 0 ptau)"
  if [ -f "$target" ]; then
    die "$target already exists; refusing to overwrite an in-progress ceremony"
  fi
  log "creating $target (BN254, 2^${POT_POWER})"
  snarkjs powersoftau new bn128 "$POT_POWER" "$target" -v
  echo "init  $(sha256_of "$target")  $(basename "$target")" \
    >> "$TRANSCRIPT_DIR/pot.log"
  log "done. Distribute $target to contributor #1."
}

next_pot_index() {
  local last
  last=$(ls "$POT_DIR" 2>/dev/null \
    | grep -E "^${POT_PREFIX}_[0-9]{4}\.ptau$" \
    | sort | tail -n1 || true)
  [ -z "$last" ] && die "no powers-of-tau file found; run 'ceremony.sh init' first"
  local n="${last#${POT_PREFIX}_}"
  n="${n%.ptau}"
  printf '%d' $((10#$n + 1))
}

cmd_contribute() {
  local name="${1:-${CONTRIBUTOR_NAME:-}}"
  [ -n "$name" ] || die "contributor name required (or set CONTRIBUTOR_NAME)"
  local entropy="${2:-$(openssl rand -hex 32)}"
  local idx prev next
  idx="$(next_pot_index)"
  prev="$(slot_path "$POT_DIR" "$POT_PREFIX" $((idx - 1)) ptau)"
  next="$(slot_path "$POT_DIR" "$POT_PREFIX" "$idx" ptau)"
  [ -f "$prev" ] || die "previous contribution $prev missing"
  log "contribution #$idx by '$name'"
  snarkjs powersoftau contribute "$prev" "$next" --name="$name" -v -e="$entropy"
  snarkjs powersoftau verify "$next"
  printf '%04d  %s  %s  %s\n' "$idx" "$(sha256_of "$next")" "$name" "$(basename "$next")" \
    >> "$TRANSCRIPT_DIR/pot.log"
  log "done. Forward $next to the next contributor."
}

cmd_verify_pot() {
  local idx="${1:-}"
  local target
  if [ -z "$idx" ]; then
    target=$(ls "$POT_DIR"/${POT_PREFIX}_[0-9]*.ptau | sort | tail -n1)
  else
    target="$(slot_path "$POT_DIR" "$POT_PREFIX" "$idx" ptau)"
  fi
  [ -f "$target" ] || die "$target not found"
  log "verifying $target"
  snarkjs powersoftau verify "$target"
}

cmd_beacon() {
  local beacon="${1:-}"
  local rounds="${2:-10}"
  [ -n "$beacon" ] || die "beacon hex (32 bytes) required"
  [[ "$beacon" =~ ^[0-9a-fA-F]{64}$ ]] || die "beacon must be 64 hex chars (32 bytes)"
  local count
  count=$(ls "$POT_DIR"/${POT_PREFIX}_[0-9]*.ptau 2>/dev/null \
    | grep -vE "_0000\.ptau$" | wc -l | tr -d ' ')
  if [ "$count" -lt "$MIN_PHASE1_CONTRIBUTORS" ]; then
    die "phase 1 has only $count contributions; need ≥${MIN_PHASE1_CONTRIBUTORS}. \
Override MIN_PHASE1_CONTRIBUTORS only for testing."
  fi
  local last beaconed
  last=$(ls "$POT_DIR"/${POT_PREFIX}_[0-9]*.ptau | sort | tail -n1)
  beaconed="$CEREMONY_DIR/${POT_PREFIX}_beacon.ptau"
  log "applying beacon to $(basename "$last") with $rounds rounds"
  snarkjs powersoftau beacon "$last" "$beaconed" "$beacon" "$rounds" \
    --name="VeilRail mainnet phase1 beacon" -v
  log "preparing phase 2 -> $POT_FINAL"
  snarkjs powersoftau prepare phase2 "$beaconed" "$POT_FINAL" -v
  snarkjs powersoftau verify "$POT_FINAL"
  {
    echo "beacon $beacon rounds=$rounds"
    echo "beacon $(sha256_of "$beaconed")  $(basename "$beaconed")"
    echo "final  $(sha256_of "$POT_FINAL")  $(basename "$POT_FINAL")"
  } >> "$TRANSCRIPT_DIR/pot.log"
  log "phase 1 complete. Final ptau hash: $(sha256_of "$POT_FINAL")"
}

# ---------------------------------------------------------------- phase 2 ----

require_circuit() {
  local c="$1"
  for x in "${CIRCUITS[@]}"; do [ "$x" = "$c" ] && return 0; done
  die "unknown circuit '$c' (expected one of: ${CIRCUITS[*]})"
}

phase2_dir_for() { printf '%s/%s' "$PHASE2_DIR" "$1"; }

next_phase2_index() {
  local c="$1" dir last
  dir="$(phase2_dir_for "$c")"
  last=$(ls "$dir" 2>/dev/null \
    | grep -E "^${c}_[0-9]{4}\.zkey$" \
    | sort | tail -n1 || true)
  [ -z "$last" ] && die "no phase-2 zkey for $c; run 'phase2-init $c' first"
  local n="${last#${c}_}"
  n="${n%.zkey}"
  printf '%d' $((10#$n + 1))
}

cmd_phase2_init() {
  local c="${1:-}"
  require_circuit "$c"
  [ -f "$POT_FINAL" ] || die "$POT_FINAL missing; finish phase 1 (beacon) first"
  local r1cs="$BUILD_DIR/$c/$c.r1cs"
  [ -f "$r1cs" ] || die "$r1cs missing; compile circuits first (build.sh compiles only)"
  local dir target
  dir="$(phase2_dir_for "$c")"
  mkdir -p "$dir"
  target="$(slot_path "$dir" "$c" 0 zkey)"
  [ -f "$target" ] && die "$target already exists; refusing to overwrite"
  log "phase2 init for $c -> $target"
  snarkjs groth16 setup "$r1cs" "$POT_FINAL" "$target"
  printf 'init  %s  %s\n' "$(sha256_of "$target")" "$(basename "$target")" \
    >> "$TRANSCRIPT_DIR/${c}.log"
  log "done. Distribute $target to phase-2 contributor #1."
}

cmd_phase2_contribute() {
  local c="${1:-}"
  require_circuit "$c"
  local name="${2:-${CONTRIBUTOR_NAME:-}}"
  [ -n "$name" ] || die "contributor name required (or set CONTRIBUTOR_NAME)"
  local entropy="${3:-$(openssl rand -hex 32)}"
  local dir idx prev next
  dir="$(phase2_dir_for "$c")"
  idx="$(next_phase2_index "$c")"
  prev="$(slot_path "$dir" "$c" $((idx - 1)) zkey)"
  next="$(slot_path "$dir" "$c" "$idx" zkey)"
  [ -f "$prev" ] || die "previous contribution $prev missing"
  log "phase2 $c contribution #$idx by '$name'"
  snarkjs zkey contribute "$prev" "$next" --name="$name" -v -e="$entropy"
  snarkjs zkey verify "$BUILD_DIR/$c/$c.r1cs" "$POT_FINAL" "$next"
  printf '%04d  %s  %s  %s\n' "$idx" "$(sha256_of "$next")" "$name" "$(basename "$next")" \
    >> "$TRANSCRIPT_DIR/${c}.log"
  log "done. Forward $next to next contributor."
}

cmd_phase2_verify() {
  local c="${1:-}"
  require_circuit "$c"
  local idx="${2:-}"
  local dir target
  dir="$(phase2_dir_for "$c")"
  if [ -z "$idx" ]; then
    target=$(ls "$dir"/${c}_[0-9]*.zkey | sort | tail -n1)
  else
    target="$(slot_path "$dir" "$c" "$idx" zkey)"
  fi
  [ -f "$target" ] || die "$target not found"
  log "verifying $target"
  snarkjs zkey verify "$BUILD_DIR/$c/$c.r1cs" "$POT_FINAL" "$target"
}

cmd_phase2_finalize() {
  local c="${1:-}"
  require_circuit "$c"
  local beacon="${2:-}"
  local rounds="${3:-10}"
  [ -n "$beacon" ] || die "beacon hex (32 bytes) required"
  [[ "$beacon" =~ ^[0-9a-fA-F]{64}$ ]] || die "beacon must be 64 hex chars (32 bytes)"
  local dir last beaconed final vk count
  dir="$(phase2_dir_for "$c")"
  count=$(ls "$dir"/${c}_[0-9]*.zkey 2>/dev/null \
    | grep -vE "_0000\.zkey$" | wc -l | tr -d ' ')
  if [ "$count" -lt "$MIN_PHASE2_CONTRIBUTORS" ]; then
    die "phase 2 ($c) has only $count contributions; need ≥${MIN_PHASE2_CONTRIBUTORS}. \
Override MIN_PHASE2_CONTRIBUTORS only for testing."
  fi
  last=$(ls "$dir"/${c}_[0-9]*.zkey | sort | tail -n1)
  beaconed="$dir/${c}_beacon.zkey"
  final="$BUILD_DIR/$c/${c}_final.zkey"
  vk="$BUILD_DIR/$c/${c}_vk.json"
  mkdir -p "$BUILD_DIR/$c"
  log "applying phase2 beacon to $(basename "$last")"
  snarkjs zkey beacon "$last" "$beaconed" "$beacon" "$rounds" \
    --name="VeilRail mainnet phase2 beacon ($c)" -v
  snarkjs zkey verify "$BUILD_DIR/$c/$c.r1cs" "$POT_FINAL" "$beaconed"
  cp "$beaconed" "$final"
  snarkjs zkey export verificationkey "$final" "$vk"
  {
    echo "beacon $beacon rounds=$rounds"
    echo "beacon $(sha256_of "$beaconed")  $(basename "$beaconed")"
    echo "final  $(sha256_of "$final")  $(basename "$final")"
    echo "vk     $(sha256_of "$vk")  $(basename "$vk")"
  } >> "$TRANSCRIPT_DIR/${c}.log"
  log "$c phase 2 complete. VK hash: $(sha256_of "$vk")"
}

# ---------------------------------------------------------- transcript & hashes

cmd_transcript() {
  local out="$CEREMONY_DIR/TRANSCRIPT.md"
  log "writing $out"
  {
    echo "# VeilRail trusted setup transcript"
    echo
    echo "_Generated $(date -u +"%Y-%m-%dT%H:%M:%SZ")_"
    echo
    echo "## Phase 1 — powers-of-tau (BN254, 2^${POT_POWER})"
    echo
    if [ -f "$TRANSCRIPT_DIR/pot.log" ]; then
      echo '```'
      cat "$TRANSCRIPT_DIR/pot.log"
      echo '```'
    else
      echo "_no contributions recorded_"
    fi
    for c in "${CIRCUITS[@]}"; do
      echo
      echo "## Phase 2 — \`$c\`"
      echo
      if [ -f "$TRANSCRIPT_DIR/${c}.log" ]; then
        echo '```'
        cat "$TRANSCRIPT_DIR/${c}.log"
        echo '```'
      else
        echo "_no contributions recorded_"
      fi
    done
  } > "$out"
  log "transcript at $out"
}

cmd_record_hashes() {
  local out="$CEREMONY_DIR/vk-hashes.json"
  log "writing $out"
  {
    printf '{\n'
    printf '  "ptau": {\n'
    if [ -f "$POT_FINAL" ]; then
      printf '    "file": "%s",\n' "$(basename "$POT_FINAL")"
      printf '    "sha256": "%s"\n' "$(sha256_of "$POT_FINAL")"
    else
      printf '    "file": null,\n    "sha256": null\n'
    fi
    printf '  },\n'
    printf '  "circuits": {\n'
    local first=1
    for c in "${CIRCUITS[@]}"; do
      local zk="$BUILD_DIR/$c/${c}_final.zkey"
      local vk="$BUILD_DIR/$c/${c}_vk.json"
      [ $first -eq 1 ] || printf ',\n'
      first=0
      printf '    "%s": {\n' "$c"
      if [ -f "$zk" ]; then
        printf '      "zkey_sha256": "%s",\n' "$(sha256_of "$zk")"
      else
        printf '      "zkey_sha256": null,\n'
      fi
      if [ -f "$vk" ]; then
        printf '      "vk_sha256": "%s"\n' "$(sha256_of "$vk")"
      else
        printf '      "vk_sha256": null\n'
      fi
      printf '    }'
    done
    printf '\n  }\n'
    printf '}\n'
  } > "$out"
  log "wrote $out — pin these hashes in the on-chain verifier upgrade tx"
  cat "$out"
}

# --------------------------------------------------------- download index ---

# Default URL prefix for the published artifacts. Overridable via env so the
# coordinator can repoint this at whichever object-storage bucket / CDN /
# GitHub-release the production transcript ends up hosted on.
CEREMONY_DOWNLOAD_BASE_URL="${CEREMONY_DOWNLOAD_BASE_URL:-https://downloads.veilrail.example/ceremony}"
WEBSITE_PUBLIC_DIR_DEFAULT="$ROOT/../../artifacts/veilrail/public/ceremony"
WEBSITE_PUBLIC_DIR="${WEBSITE_PUBLIC_DIR:-$WEBSITE_PUBLIC_DIR_DEFAULT}"

size_of() {
  if stat -c%s "$1" >/dev/null 2>&1; then
    stat -c%s "$1"
  else
    stat -f%z "$1"
  fi
}

# Emit one JSON entry: {phase, kind, file, relative_path, size, sha256, url, contributor?, contribution?}
emit_entry() {
  local phase="$1" kind="$2" path="$3" rel="$4" contributor="$5" contribution="$6"
  local size sha url
  size="$(size_of "$path")"
  sha="$(sha256_of "$path")"
  url="${CEREMONY_DOWNLOAD_BASE_URL%/}/${rel}"
  printf '    {\n'
  printf '      "phase": "%s",\n' "$phase"
  printf '      "kind": "%s",\n' "$kind"
  printf '      "file": "%s",\n' "$(basename "$path")"
  printf '      "relative_path": "%s",\n' "$rel"
  printf '      "size_bytes": %s,\n' "$size"
  printf '      "sha256": "%s",\n' "$sha"
  printf '      "url": "%s"' "$url"
  if [ -n "$contributor" ]; then
    printf ',\n      "contributor": "%s"' "$contributor"
  fi
  if [ -n "$contribution" ]; then
    printf ',\n      "contribution_index": %s' "$contribution"
  fi
  printf '\n    }'
}

# Look up the contributor name recorded in the transcript log for a given
# contribution number (0001..). Returns empty if unknown.
lookup_contributor() {
  local logfile="$1" idx="$2"
  [ -f "$logfile" ] || { printf ''; return 0; }
  awk -v want="$idx" '$1 == want { for (i=3; i<NF; i++) printf "%s%s", $i, (i<NF-1?" ":""); exit }' "$logfile" \
    | head -n1
}

cmd_download_index() {
  local out_json="$CEREMONY_DIR/download-index.json"
  local out_md="$CEREMONY_DIR/DOWNLOADS.md"
  log "writing $out_json"

  local entries=()

  # Phase 1: every pot file in POT_DIR plus the beaconed + finalized ptau.
  if [ -d "$POT_DIR" ]; then
    for f in $(ls "$POT_DIR"/${POT_PREFIX}_[0-9]*.ptau 2>/dev/null | sort); do
      local base="${f##*/}"
      local n="${base#${POT_PREFIX}_}"; n="${n%.ptau}"
      local idx_decimal=$((10#$n))
      local kind="phase1-contribution"
      local contributor=""
      if [ "$idx_decimal" -eq 0 ]; then
        kind="phase1-init"
      else
        contributor="$(lookup_contributor "$TRANSCRIPT_DIR/pot.log" "$n")"
      fi
      entries+=("$(emit_entry "phase1" "$kind" "$f" "phase1/$base" "$contributor" "$idx_decimal")")
    done
    if [ -f "$CEREMONY_DIR/${POT_PREFIX}_beacon.ptau" ]; then
      entries+=("$(emit_entry "phase1" "phase1-beacon" \
        "$CEREMONY_DIR/${POT_PREFIX}_beacon.ptau" \
        "phase1/${POT_PREFIX}_beacon.ptau" "" "")")
    fi
    if [ -f "$POT_FINAL" ]; then
      entries+=("$(emit_entry "phase1" "phase1-final" \
        "$POT_FINAL" "phase1/$(basename "$POT_FINAL")" "" "")")
    fi
  fi

  # Phase 2: per-circuit zkeys + finals + verification keys.
  for c in "${CIRCUITS[@]}"; do
    local dir; dir="$(phase2_dir_for "$c")"
    if [ -d "$dir" ]; then
      for f in $(ls "$dir"/${c}_[0-9]*.zkey 2>/dev/null | sort); do
        local base="${f##*/}"
        local n="${base#${c}_}"; n="${n%.zkey}"
        local idx_decimal=$((10#$n))
        local kind="phase2-contribution"
        local contributor=""
        if [ "$idx_decimal" -eq 0 ]; then
          kind="phase2-init"
        else
          contributor="$(lookup_contributor "$TRANSCRIPT_DIR/${c}.log" "$n")"
        fi
        entries+=("$(emit_entry "phase2" "$kind" "$f" "phase2/$c/$base" "$contributor" "$idx_decimal")")
      done
      if [ -f "$dir/${c}_beacon.zkey" ]; then
        entries+=("$(emit_entry "phase2" "phase2-beacon" \
          "$dir/${c}_beacon.zkey" "phase2/$c/${c}_beacon.zkey" "" "")")
      fi
    fi
    local final="$BUILD_DIR/$c/${c}_final.zkey"
    local vk="$BUILD_DIR/$c/${c}_vk.json"
    if [ -f "$final" ]; then
      entries+=("$(emit_entry "phase2" "zkey-final" "$final" "phase2/$c/${c}_final.zkey" "" "")")
    fi
    if [ -f "$vk" ]; then
      entries+=("$(emit_entry "phase2" "verification-key" "$vk" "phase2/$c/${c}_vk.json" "" "")")
    fi
  done

  {
    printf '{\n'
    printf '  "generated": "%s",\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    printf '  "pot_power": %s,\n' "$POT_POWER"
    printf '  "base_url": "%s",\n' "${CEREMONY_DOWNLOAD_BASE_URL%/}"
    printf '  "transcript": "%s/TRANSCRIPT.md",\n' "${CEREMONY_DOWNLOAD_BASE_URL%/}"
    printf '  "vk_hashes": "%s/vk-hashes.json",\n' "${CEREMONY_DOWNLOAD_BASE_URL%/}"
    printf '  "files": [\n'
    local i=0
    for e in "${entries[@]}"; do
      [ $i -gt 0 ] && printf ',\n'
      printf '%s' "$e"
      i=$((i + 1))
    done
    printf '\n  ]\n'
    printf '}\n'
  } > "$out_json"

  log "writing $out_md"
  {
    echo "# VeilRail trusted setup — published artifacts"
    echo
    echo "_Generated $(date -u +"%Y-%m-%dT%H:%M:%SZ")_"
    echo
    echo "Re-verify any artifact below by downloading it from the listed URL"
    echo "and running:"
    echo
    echo '```'
    echo 'sha256sum <file>'
    echo '# compare against the sha256 column. The final per-circuit vk_sha256'
    echo '# values must equal the on-chain values in vk-hashes.json (which the'
    echo '# verifier-program upgrade tx pinned).'
    echo '```'
    echo
    echo "- Transcript: <${CEREMONY_DOWNLOAD_BASE_URL%/}/TRANSCRIPT.md>"
    echo "- VK hashes: <${CEREMONY_DOWNLOAD_BASE_URL%/}/vk-hashes.json>"
    echo
    echo "| Phase | Kind | File | Size | sha256 | Contributor |"
    echo "|-------|------|------|-----:|--------|-------------|"
    # Re-iterate quickly using jq-free awk on the emitted JSON would be fragile;
    # rebuild rows directly from the same on-disk discovery.
    md_row() {
      local phase="$1" kind="$2" path="$3" rel="$4" contributor="$5"
      local size sha
      size="$(size_of "$path")"
      sha="$(sha256_of "$path")"
      printf '| %s | %s | [%s](%s/%s) | %s | `%s` | %s |\n' \
        "$phase" "$kind" "$(basename "$path")" \
        "${CEREMONY_DOWNLOAD_BASE_URL%/}" "$rel" \
        "$size" "$sha" "${contributor:-—}"
    }
    if [ -d "$POT_DIR" ]; then
      for f in $(ls "$POT_DIR"/${POT_PREFIX}_[0-9]*.ptau 2>/dev/null | sort); do
        local base="${f##*/}"
        local n="${base#${POT_PREFIX}_}"; n="${n%.ptau}"
        local idx_decimal=$((10#$n))
        local kind="phase1-contribution"; local contributor=""
        if [ "$idx_decimal" -eq 0 ]; then
          kind="phase1-init"
        else
          contributor="$(lookup_contributor "$TRANSCRIPT_DIR/pot.log" "$n")"
        fi
        md_row "phase1" "$kind" "$f" "phase1/$base" "$contributor"
      done
      [ -f "$CEREMONY_DIR/${POT_PREFIX}_beacon.ptau" ] && \
        md_row "phase1" "phase1-beacon" \
          "$CEREMONY_DIR/${POT_PREFIX}_beacon.ptau" \
          "phase1/${POT_PREFIX}_beacon.ptau" ""
      [ -f "$POT_FINAL" ] && \
        md_row "phase1" "phase1-final" "$POT_FINAL" \
          "phase1/$(basename "$POT_FINAL")" ""
    fi
    for c in "${CIRCUITS[@]}"; do
      local dir; dir="$(phase2_dir_for "$c")"
      if [ -d "$dir" ]; then
        for f in $(ls "$dir"/${c}_[0-9]*.zkey 2>/dev/null | sort); do
          local base="${f##*/}"
          local n="${base#${c}_}"; n="${n%.zkey}"
          local idx_decimal=$((10#$n))
          local kind="phase2-contribution"; local contributor=""
          if [ "$idx_decimal" -eq 0 ]; then
            kind="phase2-init"
          else
            contributor="$(lookup_contributor "$TRANSCRIPT_DIR/${c}.log" "$n")"
          fi
          md_row "phase2 ($c)" "$kind" "$f" "phase2/$c/$base" "$contributor"
        done
        [ -f "$dir/${c}_beacon.zkey" ] && \
          md_row "phase2 ($c)" "phase2-beacon" \
            "$dir/${c}_beacon.zkey" "phase2/$c/${c}_beacon.zkey" ""
      fi
      local final="$BUILD_DIR/$c/${c}_final.zkey"
      local vk="$BUILD_DIR/$c/${c}_vk.json"
      [ -f "$final" ] && md_row "phase2 ($c)" "zkey-final" "$final" "phase2/$c/${c}_final.zkey" ""
      [ -f "$vk" ]    && md_row "phase2 ($c)" "verification-key" "$vk" "phase2/$c/${c}_vk.json" ""
    done
  } > "$out_md"

  log "wrote $out_json and $out_md (base URL: ${CEREMONY_DOWNLOAD_BASE_URL%/})"
}

cmd_publish_website() {
  local dest="$WEBSITE_PUBLIC_DIR"
  mkdir -p "$dest"
  local copied=0
  for f in TRANSCRIPT.md vk-hashes.json download-index.json DOWNLOADS.md \
           CONTRIBUTORS.md CONTRIBUTORS.md.sig allowed_signers \
           BEACON.md ATTESTATION_TEMPLATE.md; do
    if [ -f "$CEREMONY_DIR/$f" ]; then
      cp "$CEREMONY_DIR/$f" "$dest/$f"
      copied=$((copied + 1))
      log "copied $f -> $dest/$f"
    else
      log "skipping $f (not present in $CEREMONY_DIR)"
    fi
  done
  if [ -d "$CEREMONY_DIR/keys" ]; then
    mkdir -p "$dest/keys"
    for f in "$CEREMONY_DIR/keys"/*.pub "$CEREMONY_DIR/keys"/*.sig; do
      [ -f "$f" ] || continue
      cp "$f" "$dest/keys/$(basename "$f")"
      copied=$((copied + 1))
      log "copied keys/$(basename "$f") -> $dest/keys/$(basename "$f")"
    done
  fi
  if [ "$copied" -eq 0 ]; then
    die "no ceremony artifacts found to publish; run transcript / record-hashes / download-index first"
  fi
  log "published $copied file(s) to $dest"
}

# ---------------------------------------------------------------------- dev --

cmd_dev() {
  log "DEV ceremony (2^15, single contributor) — DO NOT USE FOR MAINNET"
  cd "$CEREMONY_DIR"
  if [ ! -f pot15_0000.ptau ]; then
    snarkjs powersoftau new bn128 15 pot15_0000.ptau -v
  fi
  snarkjs powersoftau contribute pot15_0000.ptau pot15_0001.ptau \
    --name="VeilRail dev ceremony" -v -e="$(openssl rand -hex 32)"
  snarkjs powersoftau prepare phase2 pot15_0001.ptau pot15_final.ptau -v
  log "dev ptau ready at $CEREMONY_DIR/pot15_final.ptau"
}

# ---------------------------------------------------------------- dispatch ---

sub="${1:-}"
[ -n "$sub" ] || { usage; exit 1; }
shift || true

case "$sub" in
  init)               cmd_init "$@" ;;
  contribute)         cmd_contribute "$@" ;;
  verify-pot)         cmd_verify_pot "$@" ;;
  beacon)             cmd_beacon "$@" ;;
  phase2-init)        cmd_phase2_init "$@" ;;
  phase2-contribute)  cmd_phase2_contribute "$@" ;;
  phase2-verify)      cmd_phase2_verify "$@" ;;
  phase2-finalize)    cmd_phase2_finalize "$@" ;;
  transcript)         cmd_transcript "$@" ;;
  record-hashes)      cmd_record_hashes "$@" ;;
  download-index)     cmd_download_index "$@" ;;
  publish-website)    cmd_publish_website "$@" ;;
  dev)                cmd_dev "$@" ;;
  -h|--help|help)     usage ;;
  *) usage; die "unknown subcommand: $sub" ;;
esac
