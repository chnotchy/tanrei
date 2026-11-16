// Temporary directories for tests and scripts: a suite leaves nothing behind.
//
//   import { tempDir } from '../../tools/src/test-tmp.js';
//   const dir = tempDir('product');        // <tmp>/tanrei-product-p<pid>-XXXXXX, removed when this file's tests end
//
// Every directory carries the id of the process that made it, so a test file can tell ITS directories from those of
// the files and packages that run next to it (node:test runs each file in its own process, turbo runs packages in
// parallel). When the file's tests have ended, everything it made is removed and the file FAILS if an entry with its
// tag is still in `os.tmpdir()`. A process that dies before that still sweeps on exit, and on SIGINT, SIGTERM or
// SIGHUP (a runner stopped with Ctrl-C, a job that timed out): it sweeps, then ends by that same signal, so its exit
// status and its parent's view are as they were. A kill no process can catch (SIGKILL, a crash) still leaves its
// directories, tagged with an id the system gives out again. An entry that already has this process's tag when this
// module loads was left by such an earlier process: it is not this file's, and the check leaves it out. It does not remove it either: where processes of other pid namespaces share the temporary
// directory, a live process may carry the same id.
//
// Why per file and not once per run: Node 22 (the version this repository pins) has no `--test-global-setup`, and a
// before/after count of all `tanrei-*` entries would fail whenever another package's suite runs at the same time.
// The other half of the guarantee is static: `directTempDirCalls()` lists every `mkdtemp` call that does not go
// through this module, and each package's suite asserts that list is empty.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const TEMP_PREFIX = 'tanrei-';
const TAG = `-p${process.pid}-`;
const made = new Set();
const tagged = () => fs.readdirSync(os.tmpdir()).filter((name) => name.startsWith(TEMP_PREFIX) && name.includes(TAG));
/** Entries with this process's tag from before it made any: an earlier process with the same id left them (see above). */
const inherited = new Set(tagged());

function sweep() {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
  made.clear();
}
process.on('exit', sweep);

// The 'exit' event is not emitted when a signal ends the process. A listener for a signal takes away its default
// action (ending the process), so this one gives it back: sweep, stop listening, and raise the same signal again. It
// is installed with the first directory, so a process that makes none reacts to signals as it always did. When the
// process has listeners of its own for that signal, they decide how it ends; this one only sweeps. A process blocked
// in synchronous work (the runner in `spawnSync`, waiting for `node --test`) runs the listener when that work returns:
// from a terminal the signal reaches the whole process group, so the child ends first and the runner then follows it.
const SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP'];
let listening = false;
function sweepAndRaise(signal) {
  sweep();
  if (process.listenerCount(signal) > 1) return;
  for (const name of SIGNALS) process.removeListener(name, sweepAndRaise);
  listening = false;
  process.kill(process.pid, signal);
}
function sweepOnSignals() {
  if (listening) return;
  listening = true;
  for (const name of SIGNALS) process.on(name, sweepAndRaise);
}

/** A new, empty directory that is removed when the calling test file (or script) ends. `purpose` names what it is for. */
export function tempDir(purpose) {
  if (!/^[a-z][a-z0-9-]*$/.test(purpose)) throw new Error(`tempDir("${purpose}"): the purpose is a short lowercase name, e.g. "product"`);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${TEMP_PREFIX}${purpose}${TAG}`));
  made.add(dir);
  sweepOnSignals();
  return dir;
}

/**
 * The environment for a git command run in a directory a test made. Git hands its hooks the repository they run for
 * (GIT_DIR, GIT_INDEX_FILE, …), and those variables beat `git -C <dir>`: a test run from a hook would otherwise init,
 * configure and commit in the real repository — a commit on the branch being pushed, `core.bare` set in its config.
 */
export function throwawayGitEnv(env = process.env) {
  const clean = { ...env };
  for (const name of Object.keys(clean)) if (GIT_LOCATION.has(name)) delete clean[name];
  return clean;
}
/**
 * For a test file whose own code (not only its child processes) runs git: take the hook's repository out of this
 * process's environment before anything runs git. Without a hook around, it changes nothing.
 */
export function forgetHookRepository() {
  for (const name of GIT_LOCATION) delete process.env[name];
}
const GIT_LOCATION = new Set(['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_PREFIX', 'GIT_NAMESPACE', 'GIT_CEILING_DIRECTORIES', 'GIT_DISCOVERY_ACROSS_FILESYSTEM']);

/** Entries of `os.tmpdir()` that this process made and that are still there (not those an earlier process with its id left). */
export const ownTempDirs = () => tagged().filter((name) => !inherited.has(name));

/**
 * Remove what this process made, then report what is STILL there (a removal that failed, a directory made with this
 * tag by other means). A test file calls it from a file-level `after`; see `leavesNothingBehind`.
 * @returns {string[]}
 */
export function sweepTempDirs() {
  sweep();
  return ownTempDirs();
}

/**
 * Register the check on a test file: `leavesNothingBehind(after)` at the top of the file.
 * (The hook is passed in so this module does not import `node:test` — scripts use it too.)
 */
export function leavesNothingBehind(after) {
  after(() => {
    const left = sweepTempDirs();
    if (left.length) throw new Error(`this test file left ${left.length} temporary director${left.length === 1 ? 'y' : 'ies'} in ${os.tmpdir()}: ${left.join(', ')}`);
  });
}

/**
 * Every call of `mkdtemp`/`mkdtempSync` in a package's own code (src, test, scripts, bin) that does not go through
 * this module — each one is a directory nobody is sure to remove.
 * @param {string} packageDir
 * @param {{ allow?: string[] }} [options] files (relative to the package) that manage their own directories, with the reason next to the call site
 * @returns {string[]} `file:line`
 */
export function directTempDirCalls(packageDir, { allow = [] } = {}) {
  const self = fs.realpathSync(new URL(import.meta.url).pathname);
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.(m?js|ts)$/.test(entry.name) && fs.realpathSync(file) !== self && !allow.includes(path.relative(packageDir, file))) {
        fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => /\bmkdtemp(Sync)?\s*\(/.test(line) && found.push(`${path.relative(packageDir, file)}:${i + 1}`));
      }
    }
  };
  for (const sub of ['src', 'test', 'scripts', 'bin']) if (fs.existsSync(path.join(packageDir, sub))) walk(path.join(packageDir, sub));
  return found;
}
