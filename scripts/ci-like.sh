#!/usr/bin/env bash
# Runs the web package's Playwright tests as CI runs them: in a Linux container on the image ci.yml pins, as the
# runner's user, with CI's two workers on a CPU budget capped to what a runner gives one shard, CI=1 (one retry,
# failOnFlakyTests). A test that is fast and green on a Mac but slow or flaky on a runner shows it here first.
#
#   bash scripts/ci-like.sh [playwright arguments and files…]
#   bash scripts/ci-like.sh src/components/select --project=chromium --grep-invert "snapshot: "
#   TANREI_HARSH=1 bash scripts/ci-like.sh src/components/tabs --project=webkit      # harsh mode inside (test/harsh.ts)
#   pnpm --filter @tanrei/web test:ci-like src/components/tabs --project=chromium      # the same, from the package
#
# Paths are relative to packages/web (as Playwright's own are). Settings, by environment variable:
#   CI_LIKE_CPUS     the container's CPUs (`docker run --cpus`), default 4 — a runner's four vCPUs, which one shard's
#                    two workers share; a lower number is harsher. Measured against CI: CONTRIBUTING.md.
#   CI_LIKE_WORKERS  Playwright's workers, default 2 (CI's: half of a runner's four CPUs).
#   CI_LIKE_OUT      where test-results/ is copied when the run fails (default: a new temporary folder, printed).
#   CI_LIKE_KEEP=1   keep the container afterwards (its name is printed); remove it with `docker rm -f <name>`.
#   TANREI_HARSH, TANREI_HARSH_*, PLAYWRIGHT_*   passed in as given (`--reporter=list,json` with
#                    PLAYWRIGHT_JSON_OUTPUT_NAME=test-results/run.json keeps a JSON report in the copied test-results).
#   CI_LIKE_ALWAYS_COPY=1  copy test-results/ out whatever the result.
#
# What cannot match a runner: the CPU architecture (a Mac's Docker runs arm64 Linux; a runner is x86_64 — the same
# image, but other builds of the browsers), the Mac's own load (other containers and processes share the VM's CPUs,
# where a runner's are its own), and GitHub's host (its disk, network and noisy neighbours). Pixel baselines are
# recorded on x86_64: a `snapshot:` test may differ here by a pixel and says nothing — leave them out with
# --grep-invert "snapshot: " unless that is what you are looking at.
#
# The repository is copied in without .git (tracked and untracked files that git does not ignore, so work not yet
# committed is included), made a repository of one commit there, installed and built from scratch: the Mac's
# node_modules never enter the container. pnpm's store is kept in a Docker volume (tanrei-ci-like-pnpm-store), so a
# second run does not download it again. The container is removed when the run ends, whatever its result.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cpus="${CI_LIKE_CPUS:-4}"
workers="${CI_LIKE_WORKERS:-2}"
image="$(grep -oE 'mcr\.microsoft\.com/playwright:v[0-9.]+-[a-z]+' "$root/.github/workflows/ci.yml" | head -n 1)"
pnpm_version="$(node -p "require('$root/package.json').packageManager.split('@')[1]")"
[ -n "$image" ] || { echo "ci-like: no Playwright image named in .github/workflows/ci.yml" >&2; exit 2; }
command -v docker >/dev/null || { echo "ci-like: docker is not installed" >&2; exit 2; }

name="tanrei-ci-like-$$"
home=/home/pwuser
repo="$home/repo"
cleanup() {
  if [ "${CI_LIKE_KEEP:-}" = 1 ]; then echo "ci-like: kept the container $name"; else docker rm -f "$name" >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT

step() { echo "ci-like: $(date +%H:%M:%S) $*"; }
step "$image, --cpus=$cpus, $workers workers${TANREI_HARSH:+, harsh mode}"
# --ipc=host: Chromium runs out of shared memory in a container without it (as ci.yml runs it).
docker run -d --name "$name" --cpus "$cpus" --ipc=host --init \
  -v tanrei-ci-like-pnpm-store:/pnpm-store "$image" sleep infinity >/dev/null

step "copying the repository in"
# The files git would commit (tracked, and untracked ones it does not ignore), as one tar file; not .git.
archive="$(mktemp "${TMPDIR:-/tmp}/ci-like.XXXXXX")"
(cd "$root" && git ls-files -z --cached --others --exclude-standard | while IFS= read -r -d '' file; do
  [ -e "$file" ] && printf '%s\0' "$file"
done | COPYFILE_DISABLE=1 tar --no-xattrs --null -T - -cf "$archive")
docker cp "$archive" "$name:/tmp/repo.tar" >/dev/null
rm -f "$archive"
docker exec "$name" sh -c "mkdir -p $repo && tar -xf /tmp/repo.tar -C $repo && rm /tmp/repo.tar && chown -R pwuser:pwuser $repo /pnpm-store && npm install -g --silent pnpm@$pnpm_version >/dev/null"

as_user=(docker exec -u pwuser -e HOME="$home" -e CI=1)
for var in $(compgen -e | grep -E '^(TANREI_HARSH|PLAYWRIGHT_)' || true); do as_user+=(-e "$var=${!var}"); done

"${as_user[@]}" -w "$repo" "$name" sh -c 'git init -q && git add -A && git -c user.name=ci-like -c user.email=ci-like@localhost commit -qm "ci-like copy" --no-gpg-sign'
# Only the web package and what it depends on (CI installs every package; the others change nothing these tests run).
step "installing and building @tanrei/web"
"${as_user[@]}" -w "$repo" "$name" sh -c 'pnpm config set store-dir /pnpm-store >/dev/null && pnpm install --frozen-lockfile --reporter=silent --filter "@tanrei/web..." && pnpm --filter @tanrei/web build >/dev/null'

step "running Playwright"
status=0
"${as_user[@]}" -w "$repo/packages/web" "$name" pnpm exec playwright test --workers="$workers" --reporter=list "$@" || status=$?

if [ "$status" != 0 ] || [ "${CI_LIKE_ALWAYS_COPY:-}" = 1 ]; then
  out="${CI_LIKE_OUT:-$(mktemp -d "${TMPDIR:-/tmp}/ci-like.XXXXXX")}"
  mkdir -p "$out"
  docker cp "$name:$repo/packages/web/test-results" "$out/" >/dev/null 2>&1 && echo "ci-like: test-results copied to $out/test-results"
fi
step "done (exit $status)"
exit "$status"
