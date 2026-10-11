#!/usr/bin/env bash
# Every workflow that runs the web tests in Microsoft's Playwright image (ci.yml, record-baselines.yml) must name the
# image of the Playwright the lockfile installs: the image carries the browsers of exactly one Playwright version, and
# the baselines are recorded with those browsers. Run from the repository root after `pnpm install`.
set -euo pipefail

want=$(pnpm --filter @tanrei/web exec playwright --version | awk '/Version/ { print $2 }')
[ -n "$want" ] || { echo "::error::could not read the installed Playwright version"; exit 1; }

status=0
found=0
while IFS=: read -r file tag; do
  found=1
  if [ "$tag" != "$want" ]; then
    echo "::error file=$file::$file runs mcr.microsoft.com/playwright:v$tag, the lockfile installs Playwright $want. Change the image tag to v$want-noble (in every workflow that names it)."
    status=1
  fi
done < <(grep -oE 'mcr\.microsoft\.com/playwright:v[0-9]+\.[0-9]+\.[0-9]+' .github/workflows/*.yml | sed -E 's#mcr\.microsoft\.com/playwright:v##')

[ "$found" = 1 ] || { echo "::error::no workflow names a Playwright image"; exit 1; }
[ "$status" = 0 ] && echo "Playwright $want: every workflow's image matches."
exit "$status"
