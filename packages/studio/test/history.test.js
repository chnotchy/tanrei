// Undo and redo (src/history.js): a step is a commit, and the commits that follow one another closely are one step.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHistory } from '../src/history.js';

const clock = () => {
  let now = 0;
  return { now: () => now, wait: (ms) => (now += ms) };
};

test('undo hands back the layer before each step, redo the one after, and a new commit drops what could be redone', () => {
  const time = clock();
  const history = createHistory({ now: time.now });
  assert.equal(history.canUndo, false);
  assert.equal(history.undo('a'), null, 'nothing to undo');
  history.record('a'); // a → b
  time.wait(1000);
  history.record('b'); // b → c
  assert.equal(history.undo('c'), 'b');
  assert.equal(history.undo('b'), 'a');
  assert.equal(history.undo('a'), null);
  assert.equal(history.redo('a'), 'b');
  assert.equal(history.redo('b'), 'c');
  assert.equal(history.redo('c'), null);
  assert.equal(history.undo('c'), 'b');
  history.record('b'); // b → d: c can no longer be redone
  assert.equal(history.canRedo, false);
  assert.equal(history.undo('d'), 'b');
});

test('commits closer together than `merge` are one step — the letters of a name typed in one go', () => {
  const time = clock();
  const history = createHistory({ now: time.now, merge: 500 });
  history.record('');
  for (const before of ['A', 'Ac', 'Acm']) {
    time.wait(120);
    history.record(before);
  }
  assert.equal(history.undo('Acme'), '', 'the whole word goes at once');
  assert.equal(history.canUndo, false);
  // After an undo the next commit starts a step of its own, however soon it comes.
  assert.equal(history.redo(''), 'Acme');
  history.record('Acme');
  time.wait(10);
  assert.equal(history.undo('Acme!'), 'Acme');
  assert.equal(history.undo('Acme'), '');
});

test('a commit that stands alone is a step of its own, however soon it comes, and the next commit does not join it', () => {
  const time = clock();
  const history = createHistory({ now: time.now, merge: 500 });
  history.record('typed');
  time.wait(10);
  history.record('loaded', { alone: true }); // a layer loaded at once after a key
  time.wait(10);
  history.record('loaded again', { alone: true });
  time.wait(10);
  history.record('typed after');
  assert.equal(history.undo('now'), 'typed after');
  assert.equal(history.undo('typed after'), 'loaded again');
  assert.equal(history.undo('loaded again'), 'loaded');
  assert.equal(history.undo('loaded'), 'typed');
  assert.equal(history.canUndo, false);
});

test('it keeps `limit` steps, the oldest going first, and `clear` forgets them all', () => {
  const time = clock();
  const history = createHistory({ now: time.now, limit: 3 });
  for (const before of [1, 2, 3, 4]) {
    history.record(before);
    time.wait(1000);
  }
  assert.deepEqual([history.undo(5), history.undo(4), history.undo(3), history.undo(2)], [4, 3, 2, null]);
  history.clear();
  assert.deepEqual([history.canUndo, history.canRedo], [false, false]);
});
