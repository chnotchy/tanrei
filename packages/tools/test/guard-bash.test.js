// The agents' Bash guard (.claude/hooks/guard-bash.mjs): what it must block, and what it must let through.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';
import { REPO_ROOT } from '../src/conventions.js';

const HOOK = path.join(REPO_ROOT, '.claude/hooks/guard-bash.mjs');
const { blockReason, simpleCommands, snapshotReason } = await import(HOOK);

test('a command line splits into simple commands, quotes kept whole', () => {
  assert.deepEqual(simpleCommands('cd x && git commit -m "a && b; c" | cat'), [['cd', 'x'], ['git', 'commit', '-m', 'a && b; c'], ['cat']]);
});

test('release actions are blocked', () => {
  const blocked = [
    'git push --tags',
    'git push origin --tags',
    'git push --follow-tags origin feat/x',
    'git push origin v1.2.3',
    'git push origin 0.1.0',
    'git push origin refs/tags/anything',
    'git push origin HEAD:refs/tags/v0.1.0',
    'git push --mirror backup',
    'git tag v0.1.0',
    'git tag -a 1.0.0 -m "release"',
    'git tag -s v2 -m x',
    'git push origin main',
    'git push origin HEAD:main',
    'git push -f origin main',
    'git push origin +main',
    'git -C ../other push origin refs/heads/main',
    'cd repo && git push origin main',
    'gh release create v0.1.0',
    'gh repo create someone/something --public',
    'gh repo create someone/something --private',
    'gh repo edit --visibility public',
    'gh api -X PATCH repos/o/r -f visibility=public',
    'npm publish',
    'pnpm -r publish',
    'pnpm publish --access public',
    'yarn publish',
    'npx changeset publish',
    'flutter pub publish',
    'dart pub publish --force',
    './gradlew publish',
    './gradlew :tanrei:publishToMavenCentral',
    'gradle publishAllPublicationsToMavenCentralRepository',
    'git commit --no-verify -m x',
    'LEFTHOOK=0 git commit -m x',
  ];
  for (const command of blocked) assert.ok(blockReason(command), `not blocked: ${command}`);
});

test('a push with no refspec is blocked only from main', () => {
  assert.ok(blockReason('git push', { currentBranch: 'main' }));
  assert.ok(blockReason('git push origin HEAD', { currentBranch: 'main' }));
  assert.equal(blockReason('git push', { currentBranch: 'feat/x' }), null);
  assert.equal(blockReason('git push -u origin HEAD', { currentBranch: 'feat/x' }), null);
});

test('everyday commands pass', () => {
  const allowed = [
    'git push -u origin feat/split',
    'git push origin feat/main-menu',
    'git push --force-with-lease origin fix/x',
    'git push origin :old-branch',
    'git tag',
    'git tag -l "v*"',
    'git tag --list',
    'git tag -d v0.0.1-test',
    'git tag wip-snapshot',
    'git log --tags',
    'gh pr create --title x --body y',
    'gh release list',
    'gh release view v0.1.0',
    'gh repo view',
    'gh repo edit --description "x"',
    'pnpm install',
    'pnpm publish --dry-run',
    'flutter pub publish --dry-run',
    'dart pub publish --dry-run',
    './gradlew publishToMavenLocal',
    './gradlew test',
    'git commit -m "docs: say how a release is published"',
    'echo "npm publish is a maintainer\'s decision"',
  ];
  for (const command of allowed) assert.equal(blockReason(command, { currentBranch: 'feat/x' }), null, `blocked: ${command}`);
});

test('updating baselines needs a stated reason', () => {
  assert.ok(snapshotReason('pnpm --filter @tanrei/web test -- --update-snapshots'));
  assert.equal(snapshotReason('TANREI_SNAPSHOT_REASON="the spec changed" pnpm --filter @tanrei/web test -- --update-snapshots'), null);
});

test('the hook exits 2 on a blocked command and 0 otherwise', () => {
  const run = (command) => spawnSync(process.execPath, [HOOK], { input: JSON.stringify({ tool_input: { command } }), encoding: 'utf8' });
  const tags = run('git push --tags');
  assert.equal(tags.status, 2);
  assert.match(tags.stderr, /^Blocked: Pushing tags/);
  assert.equal(run('git status').status, 0);
});
