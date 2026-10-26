// A node --test reporter: Node's TAP, then how long each test file ran — the duration of the file's own summary, one
// TAP comment a file, `# file-duration <file> <seconds>` (the file relative to the run's directory). A file that failed
// to load is counted with the time it took to fail. The runner (run-node-tests.js) writes its TAP report with this one
// in a run sharded by weights, and prints those lines to the log, so that `shard-weights.js` can measure the weights
// again from a CI job's log. It is the TAP report's reporter, not a third one: Node warns of a listener leak
// (MaxListenersExceededWarning) when a run has three.
import path from 'node:path';
import { tap } from 'node:test/reporters';
import { fileURLToPath } from 'node:url';

/** The `# file-duration` lines of a report. */
export const DURATION_LINE = /^# file-duration \S+ \d+(?:\.\d+)?$/gm;

/**
 * @param {AsyncIterable<{ type: string, data: any }>} source
 * @returns {AsyncGenerator<string>}
 */
export default async function* tapWithFileDurations(source) {
  /** @type {Map<string, number>} */
  const totals = new Map();
  async function* watched() {
    for await (const event of source) {
      const { type, data } = event;
      // A file's own summary (the run's last one names no file). A test's `file` is where it was declared, a helper
      // module that declares a file's tests among them, so tests are not summed; a file that failed to load has no
      // summary, only its failure, named after it.
      if (type === 'test:summary' && data.file) totals.set(data.file, data.duration_ms ?? 0);
      else if (type === 'test:fail' && data.nesting === 0 && data.file && data.name === path.basename(data.file) && !totals.has(data.file)) totals.set(data.file, data.details?.duration_ms ?? 0);
      yield event;
    }
  }
  yield* tap(watched());
  const cwd = process.cwd();
  yield [...totals]
    .map(([file, ms]) => [path.relative(cwd, file.startsWith('file:') ? fileURLToPath(file) : file).split(path.sep).join('/'), ms])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([file, ms]) => `# file-duration ${file} ${(ms / 1000).toFixed(1)}\n`)
    .join('');
}
