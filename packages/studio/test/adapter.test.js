// The HTTP adapter against the mock of `tanrei studio`: the contract the standalone app and the CLI server share.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { AdapterError, createHttpAdapter, takeToken, tokenFromHash } from '../src/adapter-http.js';
import { leavesNothingBehind, tempDir } from '../../tools/src/test-tmp.js';
import { startMockServer } from './mock-server.mjs';
import { studio } from './studio-node.js';

let dir;
let file;
let server;
let adapter;
const onDisk = () => JSON.parse(fs.readFileSync(file, 'utf8'));
const until = async (condition, ms = 4000) => {
  for (const start = Date.now(); Date.now() - start < ms; ) {
    if (condition()) return true;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return false;
};

before(async () => {
  dir = tempDir('studio-adapter');
  file = path.join(dir, 'acme.system.json');
  fs.writeFileSync(file, `${JSON.stringify({ id: 'acme', extends: 'tanrei' }, null, 2)}\n`);
  server = await startMockServer({ file, validate: (layer) => studio.preview(layer).problems });
  adapter = createHttpAdapter({ baseUrl: server.origin, token: tokenFromHash(new URL(server.url).hash), retryMs: 50 });
});
after(async () => {
  await server.close();
});
leavesNothingBehind(after); // the directory is removed, and the file fails if it stays

test('the token comes from the URL fragment and is required', async () => {
  assert.equal(tokenFromHash('#token=abc123'), 'abc123');
  assert.equal(tokenFromHash(''), '');
  await assert.rejects(createHttpAdapter({ baseUrl: server.origin, token: 'wrong' }).load(), (error) => error instanceof AdapterError && error.status === 401);
});

test('the token is taken out of the address bar at once, and a reload of the same tab still has it', () => {
  const calls = [];
  const kept = new Map();
  const env = (hash) => ({
    location: { hash, pathname: '/studio/', search: '?lang=ja' },
    history: { state: { kept: true }, replaceState: (...args) => calls.push(args) },
    storage: { getItem: (key) => kept.get(key) ?? null, setItem: (key, value) => kept.set(key, value) },
  });
  assert.equal(takeToken(env('#token=abc123&panel=color')), 'abc123');
  assert.deepEqual(calls, [[{ kept: true }, '', '/studio/?lang=ja#panel=color']], 'only the token leaves the URL; path, query, the rest of the fragment and history.state stay');
  assert.ok(![...calls.flat()].some((part) => String(part).includes('abc123')));
  // A reload (the language switch): the fragment is gone, the tab still knows the token, and the URL is not touched again.
  assert.equal(takeToken(env('')), 'abc123');
  assert.equal(calls.length, 1);
  // A new link (the server was restarted) wins over what the tab remembered.
  assert.equal(takeToken(env('#token=fresh456')), 'fresh456');
  assert.equal(calls.at(-1)[2], '/studio/?lang=ja');
  assert.equal(takeToken(env('')), 'fresh456');
  // No storage, no history (a locked-down browser): the token still works for this page load, and nothing throws.
  const blocked = { location: { hash: '#token=xyz', pathname: '/', search: '' }, history: { replaceState: () => { throw new Error('SecurityError'); } }, storage: { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } } };
  assert.equal(takeToken(blocked), 'xyz');
  assert.equal(takeToken({ ...blocked, location: { hash: '', pathname: '/', search: '' } }), '');
});

test('the token is accepted in a header only — never in a URL', async () => {
  const get = (pathname, headers = {}) => fetch(`${server.origin}${pathname}`, { headers });
  assert.equal((await get('/api/layer', { 'X-Tanrei-Token': server.token })).status, 200);
  assert.equal((await get(`/api/layer?token=${server.token}`)).status, 401);
  assert.equal((await get(`/api/events?token=${server.token}`)).status, 401, 'not even for the event stream: that takes a ticket');
  assert.equal((await fetch(`${server.origin}/api/events/ticket`, { method: 'POST' })).status, 401, 'a ticket is only given to who has the token');
});

test('session, load and save: the file on disk changes', async () => {
  assert.deepEqual(await adapter.session(), { id: 'acme', file: 'acme.system.json', extends: 'tanrei', targets: ['web', 'tokens'] });
  assert.equal(adapter.label, 'acme.system.json');
  const { layer, etag } = await adapter.load();
  assert.deepEqual(layer, { id: 'acme', extends: 'tanrei' });
  const edited = studio.setDial(layer, 'tanrei.dial.type.base', 18);
  const saved = await adapter.save(edited, etag);
  assert.ok(saved.etag && saved.etag !== etag && !saved.conflict);
  assert.deepEqual(onDisk(), edited);
  assert.deepEqual(await adapter.save(studio.setDial(edited, 'tanrei.dial.type.base', 19), saved.etag).conflict, undefined, 'the new etag is good for the next save');
});

test('409: a save against a stale etag returns the file as it is now, and writes nothing', async () => {
  const { etag } = await adapter.load();
  const theirs = { id: 'acme', extends: 'tanrei', name: 'Edited in an editor' };
  fs.writeFileSync(file, `${JSON.stringify(theirs, null, 2)}\n`);
  const result = await adapter.save({ id: 'acme', extends: 'tanrei', name: 'Mine' }, etag);
  assert.deepEqual(result.conflict.layer, theirs);
  assert.deepEqual(onDisk(), theirs);
  // keep-mine: saving again against the etag the conflict handed over wins.
  assert.ok((await adapter.save({ id: 'acme', extends: 'tanrei', name: 'Mine' }, result.conflict.etag)).etag);
  assert.equal(onDisk().name, 'Mine');
});

test('422: a layer the server refuses raises its problems, verbatim, and writes nothing', async () => {
  const { layer, etag } = await adapter.load();
  const bad = { ...layer, tokens: { 'tanrei.sys.space.nope': { scale: 2 } } };
  await assert.rejects(adapter.save(bad, etag), (error) => error instanceof AdapterError && error.status === 422 && /unknown token/.test(error.problems.join()));
  await assert.rejects(adapter.save({ ...layer, id: 'renamed' }, etag), (error) => error.status === 422 && /"id" must stay equal to the file name/.test(error.message));
  assert.deepEqual(onDisk(), layer);
});

test('build reports warnings and files', async () => {
  const result = await adapter.build({ dry: true });
  assert.deepEqual([result.id, result.warnings, result.files], ['acme', [], []]);
});

test('429: one build at a time — the second is refused, not queued, and the next one works', async () => {
  let release;
  const slow = await startMockServer({ file, build: () => new Promise((resolve) => (release = () => resolve({ id: 'acme', chain: [], tokens: 0, warnings: [], files: {} }))) });
  try {
    const client = createHttpAdapter({ baseUrl: slow.origin, token: slow.token });
    const first = client.build();
    assert.ok(await until(() => typeof release === 'function'));
    await assert.rejects(client.build(), (error) => error instanceof AdapterError && error.status === 429 && /already running/.test(error.message));
    release();
    assert.equal((await first).id, 'acme');
    release = undefined;
    const next = client.build();
    assert.ok(await until(() => typeof release === 'function'));
    release();
    assert.equal((await next).id, 'acme');
  } finally {
    await slow.close();
  }
});

test('parents: the layers next to the file come with it, read-only, and the Studio resolves the chain itself', async () => {
  assert.deepEqual(await adapter.parents(), []);
  const house = { id: 'house', extends: 'm3-like', tokens: { 'tanrei.dial.shape.unit': { $value: { value: 2, unit: 'px' }, reason: 'Sharper corners across every product.' } } };
  const houseFile = path.join(dir, 'house.system.json');
  const changes = [];
  const stop = adapter.watch(() => {}, () => changes.push('parents'));
  try {
    await new Promise((resolve) => setTimeout(resolve, 150)); // connected
    fs.writeFileSync(houseFile, `${JSON.stringify(house, null, 2)}\n`);
    fs.writeFileSync(path.join(dir, 'notes.json'), '{}');
    fs.writeFileSync(path.join(dir, 'wrong-name.system.json'), JSON.stringify({ id: 'something-else', extends: 'tanrei' }));
    assert.ok(await until(() => changes.length > 0), 'a parent that appears (or changes) on disk is announced');
    assert.deepEqual(await adapter.parents(), [{ id: 'house', layer: house }], 'only layer files that state their own file name as id');

    // With the parents handed over, the Studio computes a layer that extends the local one — and the server accepts it.
    studio.setParents(await adapter.parents());
    const { layer, etag } = await adapter.load();
    const stacked = { id: layer.id, extends: 'house' };
    assert.equal(studio.preview(stacked).valueOf('tanrei.dial.shape.unit').value, 2);
    const saved = await adapter.save(stacked, etag);
    assert.ok(saved.etag);
    assert.deepEqual(onDisk(), stacked);
    // Nothing the adapter offers writes a parent.
    assert.deepEqual(JSON.parse(fs.readFileSync(houseFile, 'utf8')), house);
    assert.ok(!Object.keys(adapter).some((method) => /parent/i.test(method) && method !== 'parents'));
    await adapter.save(layer, saved.etag);
  } finally {
    stop();
    studio.setParents([]);
    for (const name of ['house.system.json', 'notes.json', 'wrong-name.system.json']) fs.rmSync(path.join(dir, name), { force: true });
  }
});

test('SSE: every connection is opened with a single-use ticket; the token never appears in a URL', async () => {
  const urls = [];
  const spying = createHttpAdapter({ baseUrl: server.origin, token: server.token, retryMs: 50, fetch: (url, init) => (urls.push(String(url)), fetch(url, init)) });
  const stop = spying.watch(() => {});
  try {
    assert.ok(await until(() => urls.some((url) => url.includes('/api/events?ticket='))));
    const stream = urls.find((url) => url.includes('/api/events?ticket='));
    assert.ok(urls.every((url) => !url.includes(server.token)), 'no request line carries the token');
    assert.equal(urls.filter((url) => url.endsWith('/api/events/ticket')).length, 1);
    // The ticket opened that one stream; presented again — by anyone who saw the URL — it opens nothing.
    assert.equal((await fetch(stream)).status, 401);
  } finally {
    stop();
  }
});

test('SSE: a change on disk is reported with the new layer; our own saves are not', async () => {
  const seen = [];
  const stop = adapter.watch((remote) => seen.push(remote));
  try {
    await new Promise((resolve) => setTimeout(resolve, 150)); // connected
    const { layer, etag } = await adapter.load();
    await adapter.save({ ...layer, name: 'Saved by the Studio' }, etag);
    await new Promise((resolve) => setTimeout(resolve, 600));
    assert.deepEqual(seen, [], 'a save of our own is not an external change');

    fs.writeFileSync(file, `${JSON.stringify({ id: 'acme', extends: 'cupertino' }, null, 2)}\n`);
    assert.ok(await until(() => seen.length === 1), 'the external change arrives');
    assert.deepEqual(seen[0].layer, { id: 'acme', extends: 'cupertino' });
    assert.match(seen[0].etag, /^"[0-9a-f]+"$/);
  } finally {
    stop();
  }
});
