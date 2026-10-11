// The agents' Bash guard (.claude/hooks/guard-bash.mjs): its push and tag rules are this repository's. They follow `cd`
// and `git -C` to the repository a command runs in, hold in a worktree of the project, and let a different repository
// checked out inside the tree (its own history, its own origin) push and tag by its own rules.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { REPO_ROOT } from '../src/conventions.js';
import { leavesNothingBehind, tempDir } from '../src/test-tmp.js';

leavesNothingBehind(after); // whatever tempDir() made is removed, and the file fails if something stays

const HOOK = path.join(REPO_ROOT, '.claude/hooks/guard-bash.mjs');
const { blockReason, repositoryAt } = await import(HOOK);

const git = (dir, ...args) => execFileSync('git', ['-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
/** A repository on `main` with one commit and the given origin. */
function repository(dir, origin) {
  fs.mkdirSync(dir, { recursive: true });
  git(dir, 'init', '-q', '-b', 'main');
  fs.writeFileSync(path.join(dir, 'README.md'), 'x\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'chore: start');
  git(dir, 'remote', 'add', 'origin', origin);
  return dir;
}

let root, project, records, worktree, protectedRepository;
before(() => {
  root = tempDir('guard-repositories');
  project = repository(path.join(root, 'project'), 'git@example.invalid:someone/project.git');
  // A different repository inside the project's tree, as a maintainer's own records would be.
  records = repository(path.join(project, 'records'), 'git@example.invalid:someone/records.git');
  // A worktree of the project, on a branch.
  worktree = path.join(root, 'project-feat');
  git(project, 'worktree', 'add', '-q', '-b', 'feat/x', worktree);
  protectedRepository = repositoryAt(project);
});

test('repositoryAt tells the project, its worktree and a nested repository apart', () => {
  assert.ok(protectedRepository.common.endsWith(path.join('project', '.git')));
  assert.equal(repositoryAt(worktree).common, protectedRepository.common);
  assert.notEqual(repositoryAt(records).common, protectedRepository.common);
  assert.equal(repositoryAt(records).origin, 'git@example.invalid:someone/records');
  assert.equal(repositoryAt(os.tmpdir()), null);
});

test('a push to main of the project is blocked wherever it runs from', () => {
  const at = (cwd) => ({ cwd, project: protectedRepository });
  assert.ok(blockReason('git push', at(project)));
  assert.ok(blockReason('git push origin HEAD', at(project)));
  assert.ok(blockReason(`git -C ${worktree} push origin main`, at(project)));
  assert.ok(blockReason('cd records && cd .. && git push', at(project)));
  assert.ok(blockReason('cd ../project && git push', at(worktree)));
  assert.ok(blockReason('git tag v0.1.0', at(worktree)));
});

test('a push from the project on a branch passes', () => {
  assert.equal(blockReason('git push', { cwd: worktree, project: protectedRepository }), null);
  assert.equal(blockReason('git push -u origin HEAD', { cwd: worktree, project: protectedRepository }), null);
});

test('a different repository inside the tree pushes and tags by its own rules', () => {
  const at = { cwd: project, project: protectedRepository };
  assert.equal(blockReason('cd records && git push', at), null);
  assert.equal(blockReason('cd records && git add -A && git commit -q -m x && git push', at), null);
  assert.equal(blockReason('git -C records push origin main', at), null);
  assert.equal(blockReason(`git -C ${records} push`, at), null);
  assert.equal(blockReason('git -C records tag v0.1.0', at), null);
  // The same command lines without a project to compare with are judged by their text alone, as before.
  assert.ok(blockReason('git -C records push origin main'));
  assert.ok(blockReason('cd records && git push', { currentBranch: 'main' }));
});

test('the hook reads the project from CLAUDE_PROJECT_DIR and the command from its cwd', () => {
  const run = (command, cwd) => spawnSync(process.execPath, [HOOK], { input: JSON.stringify({ cwd, tool_input: { command } }), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: project } });
  assert.equal(run('git push', project).status, 2);
  assert.equal(run('git push', worktree).status, 0);
  assert.equal(run('cd records && git push', project).status, 0);
  assert.equal(run('git push', records).status, 0);
  assert.equal(run('git -C .. push', records).status, 2);
});
