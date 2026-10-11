// What a resolved system costs: the heap it holds, and the time it takes next to a fixed piece of work.
//
//   node --expose-gc packages/tokens-build/scripts/measure.mjs [system]      → one line of JSON
//
// `test/budget.test.js` runs this in a process of its own, under a heap limit, and holds the numbers to a budget.
// Run it by hand to see where the numbers stand, or with `--cpu-prof` / `--heap-prof` to see where they come from.
//
// - held: resolve the system once and let it go (so what a process loads once — the modules, the token linter — is
//   not counted), collect, resolve it again with every scheme and the model, collect, and take the difference.
// - time: the fastest of three such resolutions, and the fastest of five runs of `control()`. On a busy machine both
//   are slow together; their ratio says how much work a resolution is, whatever else the machine is doing.
import { resolveSystem } from '../src/resolve.js';

if (typeof gc !== 'function') throw new Error('run with --expose-gc: the heap a system holds is measured after a collection');
const system = process.argv[2] ?? 'tanrei';
const collected = () => (gc(), gc(), process.memoryUsage().heapUsed);

/** A resolved system with everything it can be asked for: every scheme's tokens, the model, the warnings. */
async function whole() {
  const resolved = await resolveSystem({ system });
  const model = await resolved.model();
  for (const scheme of model.schemes) resolved.tokens(scheme);
  await resolved.warnings();
  return resolved;
}

/**
 * The yardstick: thirty thousand small tokens written out, read back, sorted and summed — the kinds of work a
 * resolution is made of (objects, strings, a collator), in an amount that never changes, and long enough (a
 * quarter of a resolution, about) that a busy machine slows it as it slows the resolution.
 */
function control() {
  const collator = new Intl.Collator('en-us', { numeric: true });
  const doc = {};
  for (let i = 0; i < 30000; i += 1) doc[`group-${i % 97}.token-${i}`] = { $type: 'color', $value: { colorSpace: 'srgb', components: [i / 30000, 0.5, 0.25], hex: '#804020' }, $extensions: { note: { text: `token ${i}` } } };
  const back = JSON.parse(JSON.stringify(doc));
  let sum = 0;
  for (const id of Object.keys(back).sort(collator.compare)) sum += Object.keys({ ...back[id], id }).length + back[id].$value.components[0];
  return sum;
}

const fastest = async (times, work) => {
  let best = Infinity;
  let last;
  for (let i = 0; i < times; i += 1) {
    last = undefined; // one at a time: the one before is let go first
    const start = performance.now();
    last = await work();
    best = Math.min(best, performance.now() - start);
  }
  return { ms: best, last };
};

// In a function of its own: nothing of the first resolution may still be within reach when the heap is read.
async function first() {
  const start = performance.now();
  await whole();
  return performance.now() - start;
}
const coldMs = await first();
const before = collected();
const { ms: resolveMs, last: resolved } = await fastest(3, whole);
const held = collected() - before;
const { ms: controlMs } = await fastest(5, control);
const tokens = Object.keys(resolved.tokens()).length;

console.log(JSON.stringify({
  system,
  tokens,
  schemes: (await resolved.model()).schemes.length,
  heldMB: Math.round((held / 1048576) * 10) / 10,
  heldKBPerToken: Math.round((held / 1024 / tokens) * 100) / 100,
  resolveMs: Math.round(resolveMs),
  controlMs: Math.round(controlMs * 10) / 10,
  ratio: Math.round((resolveMs / controlMs) * 10) / 10,
  coldMs: Math.round(coldMs),
  maxRssMB: Math.round(process.resourceUsage().maxRSS / 1024),
}));
