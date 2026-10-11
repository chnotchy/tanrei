#!/usr/bin/env bash
# Copies the baseline files a record run changed or added under the given directories into <dest>, at their
# repository paths, for record-baselines.yml to upload and commit. Nothing outside those directories is copied.
#
#   scripts/ci/collect-baselines.sh <dest> <baseline dir>...
#
# Written for the bash 3.2 of macOS too (the SwiftUI record job runs on macOS).
set -eo pipefail

dest="${1:?usage: collect-baselines.sh <dest> <baseline dir>...}"
shift
[ "$#" -gt 0 ] || { echo "name at least one baseline directory" >&2; exit 1; }

mkdir -p "$dest"
count=0
# Modified (tracked) and new (untracked, not ignored) files; -z keeps unusual file names intact.
while IFS= read -r -d '' file; do
  [ -f "$file" ] || continue # a deleted file is listed as modified; recording never deletes
  mkdir -p "$dest/$(dirname "$file")"
  cp -p "$file" "$dest/$file"
  echo "  $file"
  count=$((count + 1))
done < <(git -c safe.directory="$PWD" ls-files -z --modified --others --exclude-standard -- "$@")

echo "$count baseline file(s) changed under: $*"
