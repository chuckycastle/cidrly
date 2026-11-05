#!/usr/bin/env bash
# Conformance check against the cidrly-spec repository.
#
# Regenerates the engine fixtures from this checkout and diffs them against the
# spec version pinned in .spec-version. Any difference means one of:
#   - this change alters engine behavior and needs a spec PR first, or
#   - the spec pin needs bumping to a version that already contains the change.
#
# The pin is two files: .spec-version holds the tag and .spec-commit holds the commit
# that tag must resolve to. A tag can be moved; the commit check makes a moved tag fail
# instead of silently changing what this checkout is compared against. Update both
# files together when bumping the spec.
#
# Usage:
#   npm run conformance                 # clones cidrly-spec at the pinned tag
#   SPEC_DIR=../cidrly-spec npm run conformance   # uses a local checkout instead
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SPEC_REPO="${SPEC_REPO:-https://github.com/chuckycastle/cidrly-spec.git}"
SPEC_VERSION="$(tr -d '[:space:]' < "$ROOT/.spec-version")"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

if [[ -n "${SPEC_DIR:-}" ]]; then
  SPEC_PATH="$(cd "$SPEC_DIR" && pwd)"
  echo "Using local spec checkout: $SPEC_PATH"
else
  echo "Cloning $SPEC_REPO at $SPEC_VERSION"
  git clone --quiet --depth 1 --branch "$SPEC_VERSION" "$SPEC_REPO" "$WORK/spec"
  SPEC_PATH="$WORK/spec"
  if [[ -f "$ROOT/.spec-commit" ]]; then
    SPEC_COMMIT="$(tr -d '[:space:]' < "$ROOT/.spec-commit")"
    ACTUAL_COMMIT="$(git -C "$SPEC_PATH" rev-parse HEAD)"
    if [[ "$ACTUAL_COMMIT" != "$SPEC_COMMIT" ]]; then
      echo "Conformance FAILED: $SPEC_VERSION resolves to $ACTUAL_COMMIT, expected $SPEC_COMMIT" >&2
      echo "The spec tag moved, or .spec-commit was not updated with .spec-version." >&2
      exit 1
    fi
  fi
fi

echo "Generating fixtures from this checkout"
npx tsx "$ROOT/scripts/generate-fixtures.ts" --out "$WORK/generated" > /dev/null

if diff -r "$SPEC_PATH/fixtures" "$WORK/generated"; then
  echo "Conformance OK: fixtures match cidrly-spec $SPEC_VERSION"
else
  echo
  echo "Conformance FAILED: generated fixtures differ from cidrly-spec $SPEC_VERSION" >&2
  echo "If the change is intentional, open a PR against cidrly-spec with the regenerated" >&2
  echo "fixtures (npm run fixtures -- <path-to-spec>/fixtures), tag it, and bump .spec-version." >&2
  exit 1
fi
