// Every path a process looks at on disk, for a test that has to know what a run reads — not what a grep finds:
// a path built at run time, a directory listed, a file whose existence is asked, are all recorded.
//
//   TANREI_READ_TRACE=<log file> node --import <file URL of this module> <script> …
//
// Each distinct path is appended to the log as it is first touched, one absolute path per line, so the log is whole
// even when the process is killed. `readTrace(log)` reads it back. Writes are not recorded.
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import path from 'node:path';

const log = process.env.TANREI_READ_TRACE;
const READS = ['readFileSync', 'readdirSync', 'existsSync', 'statSync', 'lstatSync', 'openSync', 'opendirSync', 'accessSync', 'realpathSync', 'readFile', 'readdir', 'stat', 'lstat', 'open', 'access'];
const PROMISE_READS = ['readFile', 'readdir', 'stat', 'lstat', 'open', 'access', 'opendir'];

if (log) {
  const append = fs.appendFileSync;
  const seen = new Set();
  const note = (target) => {
    if (typeof target !== 'string' && !(target instanceof URL)) return; // a file descriptor
    const file = path.resolve(target instanceof URL ? target.pathname : target);
    if (seen.has(file)) return;
    seen.add(file);
    append(log, `${file}\n`);
  };
  const wrap = (owner, name) => {
    const original = owner[name];
    if (typeof original !== 'function') return;
    const traced = function traced(target, ...rest) {
      note(target);
      return original.call(this, target, ...rest);
    };
    Object.assign(traced, original); // realpathSync.native, and the like
    owner[name] = traced;
  };
  for (const name of READS) wrap(fs, name);
  for (const name of PROMISE_READS) wrap(fs.promises, name);
  // cpSync reads its source tree: what it copies is recorded as its root.
  wrap(fs, 'cpSync');
  syncBuiltinESMExports(); // `import { readFileSync } from 'node:fs'` sees the traced functions too
}

/** The paths a traced run touched, as recorded in `log`. */
export const readTrace = (log) => (fs.existsSync(log) ? fs.readFileSync(log, 'utf8').split('\n').filter(Boolean) : []);
