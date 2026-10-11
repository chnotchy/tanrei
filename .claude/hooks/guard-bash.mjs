#!/usr/bin/env node
// PreToolUse hook (Bash): stops the shortcuts that let a repository lie about itself, and every outward-facing release
// action — publishing, release tags, pushes to main, creating a repository or changing its visibility. Those are a
// maintainer's decisions (AGENTS.md); an agent prepares them. Exit code 2 blocks the command.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

/** A release tag: a bare semver (SwiftPM's release) or anything starting with `v` and a digit. */
const RELEASE_TAG = /^(refs\/tags\/)?v?\d+\.\d+\.\d+([-+.][\w.+-]*)?$|^(refs\/tags\/)?v\d/;
const PROTECTED_BRANCH = /^(\+?)(refs\/heads\/)?main$/;

/** Splits a command line into simple commands (at `&&`, `||`, `;`, `|`, newlines) and each into words; quotes are honoured. */
export function simpleCommands(line) {
  const commands = [[]];
  let word = null;
  let quote = null;
  const end = () => {
    if (word !== null) commands.at(-1).push(word);
    word = null;
  };
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === quote) quote = null;
      else if (c === '\\' && quote === '"' && i + 1 < line.length) word += line[++i];
      else word += c;
    } else if (c === '"' || c === "'") {
      quote = c;
      word ??= '';
    } else if (c === '\\' && i + 1 < line.length) word = (word ?? '') + line[++i];
    else if (/\s/.test(c) && c !== '\n') end();
    else if (c === '\n' || c === ';' || c === '|' || c === '&' || c === '(' || c === ')') {
      end();
      if (commands.at(-1).length) commands.push([]);
    } else word = (word ?? '') + c;
  }
  end();
  return commands.filter((c) => c.length);
}

/** The words of a command after leading `VAR=value` assignments and wrappers (`env`, `sudo`, `xargs`, `npx`, …). */
function program(words) {
  let i = 0;
  while (i < words.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i]) || ['env', 'sudo', 'command', 'exec', 'nohup', 'time', 'xargs', 'npx', 'pnpx', 'bunx'].includes(words[i]))) i++;
  return words.slice(i);
}

/** `git [-C dir] [-c k=v]… <sub> args` → { sub, args }. */
function gitParts(words) {
  let i = 1;
  while (i < words.length && words[i].startsWith('-')) i += ['-C', '-c', '--git-dir', '--work-tree', '--namespace'].includes(words[i]) ? 2 : 1;
  return { sub: words[i], args: words.slice(i + 1) };
}

function pushProblem(args, currentBranch) {
  if (args.some((a) => ['--tags', '--follow-tags', '--mirror'].includes(a))) return 'Pushing tags is a maintainer\'s decision: a tag is a release.';
  // Options that take a value: their value is not a refspec.
  const valued = new Set(['--repo', '--receive-pack', '--exec', '-o', '--push-option']);
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (valued.has(args[i])) i++;
    else if (!args[i].startsWith('-')) positional.push(args[i]);
  }
  const refspecs = positional.slice(1);
  for (const spec of refspecs) {
    const [src, dst = src] = spec.split(':');
    if (RELEASE_TAG.test(dst) || RELEASE_TAG.test(src) || dst.startsWith('refs/tags/')) return 'Pushing a tag is a maintainer\'s decision: a tag is a release.';
    const target = dst.replace(/^\+/, '');
    if (PROTECTED_BRANCH.test(target) || (target === 'HEAD' && currentBranch === 'main')) return 'Pushing to main is a maintainer\'s decision: open a pull request.';
  }
  if (!refspecs.length && currentBranch === 'main') return 'Pushing to main is a maintainer\'s decision: open a pull request.';
  return null;
}

function tagProblem(args) {
  if (args.some((a) => ['-l', '--list', '-d', '--delete', '-v', '--verify', '--contains', '--no-contains', '--merged', '--no-merged', '--points-at'].includes(a))) return null;
  const valued = new Set(['-m', '--message', '-F', '--file', '-u', '--local-user', '--cleanup']);
  for (let i = 0; i < args.length; i++) {
    if (valued.has(args[i])) i++;
    else if (!args[i].startsWith('-') && RELEASE_TAG.test(args[i])) return `A release tag (${args[i]}) is a maintainer's decision: prepare the release; do not tag it.`;
  }
  return null;
}

/** Why a command is blocked, or null. `currentBranch` is the branch checked out where it runs. */
export function blockReason(command, { currentBranch = null } = {}) {
  if (/--no-verify\b|\bHUSKY=0\b|\bLEFTHOOK=0\b/.test(command)) return 'Do not bypass git hooks. Fix what they report.';
  for (const raw of simpleCommands(command)) {
    const words = program(raw);
    const [bin = ''] = words;
    const name = bin.split('/').at(-1);
    if (name === 'git') {
      const { sub, args } = gitParts(words);
      if (sub === 'push') {
        const problem = pushProblem(args, currentBranch);
        if (problem) return problem;
      }
      if (sub === 'tag') {
        const problem = tagProblem(args);
        if (problem) return problem;
      }
    }
    if (name === 'gh') {
      const [group, action, ...rest] = words.slice(1);
      if (group === 'release' && ['create', 'upload', 'edit', 'delete'].includes(action)) return 'A GitHub release is a maintainer\'s decision. Prepare it; do not create it.';
      if (group === 'repo' && action === 'create') return 'Creating a repository is a maintainer\'s decision.';
      if (group === 'repo' && action === 'edit' && rest.some((a) => a.startsWith('--visibility'))) return 'Changing a repository\'s visibility is a maintainer\'s decision.';
      if (group === 'api' && words.some((a) => /^visibility=|^private=|^"?visibility"?:/.test(a))) return 'Changing a repository\'s visibility is a maintainer\'s decision.';
    }
    if (['npm', 'pnpm', 'yarn'].includes(name) && words.slice(1).includes('publish') && !words.includes('--dry-run')) return 'Publishing to a registry is a maintainer\'s decision. Prepare the release; do not run it.';
    if (name === 'changeset' && words[1] === 'publish') return 'Publishing to a registry is a maintainer\'s decision. Prepare the release; do not run it.';
    if (['flutter', 'dart'].includes(name) && words[1] === 'pub' && words[2] === 'publish' && !words.includes('--dry-run')) return 'Publishing to a registry is a maintainer\'s decision. Prepare the release; do not run it.';
    if (/^gradlew?(\.bat)?$/.test(name) && words.slice(1).some((t) => /(^|:)publish\w*$/.test(t) && !/publishToMavenLocal$/.test(t))) return 'Publishing to a registry is a maintainer\'s decision. Prepare the release; do not run it.';
    if (name === 'pod' && words[1] === 'trunk' && words[2] === 'push') return 'Publishing to a registry is a maintainer\'s decision. Prepare the release; do not run it.';
  }
  return null;
}

/** Baselines are evidence. Updating them needs a stated reason, which ends up in the transcript and the changeset. */
export function snapshotReason(command) {
  const updatesSnapshots = /--update-snapshots|--update-goldens|\brecordRoborazzi\w*|TANREI_RECORD_SNAPSHOTS=1|\btest:update\b|\bjest\b.*\s-u\b/.test(command);
  if (updatesSnapshots && !/TANREI_SNAPSHOT_REASON=\S+/.test(command)) {
    return (
      'Updating snapshot baselines requires a reason. A snapshot diff is a finding: only update when the visual change is the intended result of a spec/token change. ' +
      'If it is, re-run the same command prefixed with TANREI_SNAPSHOT_REASON="<what changed and why>" and repeat that reason in the changeset.'
    );
  }
  return null;
}

function branchAt(cwd) {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  const command = input.tool_input?.command ?? '';
  const needsBranch = /\bgit\b[^\n;&|]*\bpush\b/.test(command);
  const reason = blockReason(command, { currentBranch: needsBranch ? branchAt(input.cwd ?? process.cwd()) : null }) ?? snapshotReason(command);
  if (reason) {
    console.error(`Blocked: ${reason}`);
    process.exit(2);
  }
}
