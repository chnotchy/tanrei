// What the default system costs once it is resolved — every scheme, the model, the warnings — held to a budget, so
// that the next hundred tokens, or a change to the reader, cannot grow unseen into
// a gigabyte held and ten seconds taken per system, a test file aborted at Node's heap limit, a suite of ten minutes.
//
// Measured in a process of its own (scripts/measure.mjs), so nothing this suite loaded is counted.
//
// The budgets, and where they come from (8,460 tokens, six schemes; measured on a machine under load):
//
//   held    2.4 KB per token (20 MB)   → at most  6 KB per token, and at most 150 MB whatever the vocabulary
//   peak    resolves under a 96 MB heap → must resolve under a 256 MB heap (the process is started with that limit)
//   time    0.34–0.41 × the yardstick per 1,000 tokens (2.9–3.5 ×) → at most 1.2 × per 1,000 tokens
//
// Each is two and a half to three times what was measured: room for a token to gain a field and for a slower
// machine, none for a second copy of anything. They are per token because the vocabulary grows by design — a
// budget in megabytes alone would either fail on the next accepted component or be so wide it holds nothing — and
// the one figure that is not (150 MB) is the size at which holding a system per test, per MCP session and per
// Studio tab stops being free: reaching it is a decision, not a drift. Read through a general parser, as it was,
// the same system held 118 KB per token and took about 75 × the yardstick per resolution.
//
// Time is a ratio, never milliseconds: the yardstick (`control()` in scripts/measure.mjs) is a fixed piece of the
// same kinds of work, run in the same process right after, and the fastest run of each is taken — a busy machine
// slows both. Should the ratio still be over, it is measured again, twice: a regression is over every time.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const HELD_KB_PER_TOKEN = 6;
const HELD_MB = 150;
const PEAK_HEAP_MB = 256;
const TIMES_YARDSTICK_PER_1000_TOKENS = 1.2;

const script = fileURLToPath(new URL('../scripts/measure.mjs', import.meta.url));
const measure = async () => JSON.parse((await promisify(execFile)(process.execPath, ['--expose-gc', `--max-old-space-size=${PEAK_HEAP_MB}`, script, 'tanrei'], { env: { ...process.env, NODE_OPTIONS: '' } })).stdout.trim().split('\n').at(-1));

test('the default system, resolved with every scheme and its model, stays within its budget of heap and time', async () => {
  // That it answers at all is the peak: the process may not grow its heap past PEAK_HEAP_MB.
  let measured = await measure().catch((error) => assert.fail(`resolving the default system under a ${PEAK_HEAP_MB} MB heap failed:\n${String(error.stderr ?? error).slice(0, 2000)}`));
  assert.equal(measured.schemes, 6);
  // 7,046 since the box of the five input controls is one set (1,555 ids left, 340 are new); 8,261 before.
  assert.ok(measured.tokens > 6500, `${measured.tokens} tokens: is this the default system?`);

  assert.ok(measured.heldKBPerToken <= HELD_KB_PER_TOKEN, `a resolved system holds ${measured.heldKBPerToken} KB per token (${measured.heldMB} MB at ${measured.tokens} tokens); the budget is ${HELD_KB_PER_TOKEN} KB. Something is kept twice: see the head of src/reader.js for what is shared, and scripts/measure.mjs --heap-prof for what is not.`);
  assert.ok(measured.heldMB <= HELD_MB, `a resolved system holds ${measured.heldMB} MB; ${HELD_MB} MB is where holding one per test and per session stops being free. The vocabulary has outgrown the way it is held: that is a decision to take, not a number to raise.`);

  const budget = (TIMES_YARDSTICK_PER_1000_TOKENS * measured.tokens) / 1000;
  for (let again = 0; measured.ratio > budget && again < 2; again += 1) measured = await measure();
  assert.ok(measured.ratio <= budget, `resolving takes ${measured.ratio} × the yardstick (${measured.resolveMs} ms against ${measured.controlMs} ms), three times over; the budget at ${measured.tokens} tokens is ${budget.toFixed(1)} ×. scripts/measure.mjs --cpu-prof shows where the time goes.`);
});
