#!/usr/bin/env bash
# Every workflow that runs tests in Microsoft's Playwright image (ci.yml: the web, docs and Theme Studio tests;
# record-baselines.yml) must name the image of the Playwright the lockfile installs: the image carries the browsers of
# exactly one Playwright version, and the baselines are recorded with those browsers. Every package whose Playwright
# runs in the image must install that one version, or it would look for browsers the image does not hold. Run from the
# repository root after `pnpm install`.
set -euo pipefail

want=""
for pkg in @tanrei/web @tanrei/docs @tanrei/studio; do
  have=$(pnpm --filter "$pkg" exec playwright --version | awk '/Version/ { print $2 }')
  [ -n "$have" ] || { echo "::error::could not read the Playwright version $pkg installs"; exit 1; }
  if [ -z "$want" ]; then
    want=$have
  elif [ "$have" != "$want" ]; then
    echo "::error::$pkg installs Playwright $have, @tanrei/web installs $want; the image holds the browsers of one version. Give every package the same @playwright/test."
    exit 1
  fi
done

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
