// `tanrei studio`: a local server that writes a product's layer file. What it must never do is tested first.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { leavesNothingBehind, tempDir } from '../../tools/src/test-tmp.js';
import { readRegularFile, readSiblingLayers, startStudioServer, stringifyLayer } from '../src/studio-server.js';

const layer = { id: 'acme', name: 'Acme', extends: 'tanrei', tokens: { 'tanrei.dial.shape.unit': { $value: { value: 4, unit: 'px' }, reason: 'Rounder everywhere.' } } };

leavesNothingBehind(after); // whatever tempDir() made is removed, and the file fails if something stays

async function setup(options = {}) {
  const dir = tempDir('studio-test');
  fs.mkdirSync(path.join(dir, 'design'));
  fs.mkdirSync(path.join(dir, 'app/assets'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'app/index.html'), '<!doctype html><title>Theme Studio</title>');
  fs.writeFileSync(path.join(dir, 'app/assets/app.js'), 'export {};');
  fs.writeFileSync(path.join(dir, 'secret.txt'), 'not yours');
  const layerFile = path.join(dir, 'design/acme.system.json');
  fs.writeFileSync(layerFile, stringifyLayer(layer));
  const written = [];
  const server = await startStudioServer({ layerFile, outputs: { web: 'out/web' }, appDir: path.join(dir, 'app'), writeOutputs: (result) => { written.push(result.id); return [{ target: 'web', path: 'out/web/acme.css', changed: true }]; }, ...options });
  const call = (pathname, { method = 'GET', headers = {}, body, token = server.token, host } = {}) =>
    new Promise((resolve, reject) => {
      // A connection per request (`agent: false`): Node's global agent keeps sockets alive, and the server closes an idle
      // one after 5 s (http's keepAliveTimeout) — a request sent on it just then, after a test's own ~5 s build under
      // load, was reset (ECONNRESET) before the server saw it. Reusing connections is not what these tests check.
      const req = http.request({ agent: false, host: '127.0.0.1', port: server.port, path: pathname, method, headers: { ...(token ? { 'x-tanrei-token': token } : {}), ...(body ? { 'content-type': 'application/json' } : {}), ...headers, ...(host ? { host } : {}) } }, (res) => {
        let text = '';
        res.on('data', (c) => (text += c)).on('end', () => resolve({ status: res.statusCode, headers: res.headers, text, json: () => JSON.parse(text) }));
      });
      req.on('error', reject);
      req.end(body ? JSON.stringify(body) : undefined);
    });
  return { dir, layerFile, server, call, written };
}

test('it listens on loopback only, and the key travels in the URL fragment', async () => {
  const { server } = await setup();
  try {
    assert.match(server.url, /^http:\/\/127\.0\.0\.1:\d+\/#token=[\w-]{20,}$/);
  } finally {
    await server.close();
  }
});

test('no key, a wrong key, a foreign Host or a foreign Origin get nothing', async () => {
  const { server, call, layerFile } = await setup();
  try {
    const before = fs.readFileSync(layerFile, 'utf8');
    assert.equal((await call('/api/layer', { token: null })).status, 401);
    assert.equal((await call('/api/layer', { token: 'x'.repeat(server.token.length) })).status, 401);
    assert.equal((await call('/api/layer', { host: 'evil.example' })).status, 421, 'DNS rebinding: the Host header is not ours');
    assert.equal((await call('/api/layer', { headers: { origin: 'https://evil.example' } })).status, 403);
    const put = await call('/api/layer', { method: 'PUT', token: null, body: { layer: { ...layer, name: 'Pwned' } } });
    assert.equal(put.status, 401);
    assert.equal(fs.readFileSync(layerFile, 'utf8'), before);
  } finally {
    await server.close();
  }
});

test('the key is accepted in a header only: a URL ends up in logs and history', async () => {
  const { server, call, layerFile } = await setup();
  try {
    const before = fs.readFileSync(layerFile, 'utf8');
    assert.equal((await call(`/api/layer?token=${server.token}`, { token: null })).status, 401);
    assert.equal((await call(`/api/events?token=${server.token}`, { token: null })).status, 401, 'the event stream takes a ticket, not the key');
    assert.equal((await call(`/api/layer?token=${server.token}`, { method: 'PUT', token: null, headers: { 'if-match': '"x"' }, body: { layer: { ...layer, name: 'Pwned' } } })).status, 401);
    assert.equal(fs.readFileSync(layerFile, 'utf8'), before);
  } finally {
    await server.close();
  }
});

test('the event stream opens with a ticket: given for the key, good once, and not for long', async () => {
  const { server, call } = await setup({ ticketTtlMs: 120 });
  const open = (ticket) =>
    new Promise((resolve, reject) => {
      const req = http.get({ host: '127.0.0.1', port: server.port, path: `/api/events?ticket=${ticket}` }, (res) => {
        res.once('data', () => resolve({ status: res.statusCode, type: res.headers['content-type'], close: () => req.destroy() }));
        if (res.statusCode !== 200) res.resume();
      });
      req.on('error', reject);
    });
  try {
    assert.equal((await call('/api/events/ticket', { method: 'POST', token: null })).status, 401, 'no key, no ticket');
    assert.equal((await call('/api/events/ticket', { method: 'GET' })).status, 404, 'asking is a POST');
    const first = (await call('/api/events/ticket', { method: 'POST' })).json();
    assert.match(first.ticket, /^[\w-]{30,}$/);
    assert.notEqual(first.ticket, server.token);
    const stream = await open(first.ticket);
    assert.deepEqual([stream.status, stream.type], [200, 'text/event-stream']);
    assert.equal((await open(first.ticket)).status, 401, 'single use: the URL that was seen opens nothing');
    stream.close();
    // A ticket opens the stream and nothing else.
    const second = (await call('/api/events/ticket', { method: 'POST' })).json().ticket;
    assert.equal((await call(`/api/layer?ticket=${second}`, { token: null })).status, 401);
    assert.equal((await call('/api/layer', { token: second })).status, 401);
    // Short-lived: left unused, it expires.
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.equal((await open(second)).status, 401);
    for (const junk of ['', 'x', server.token]) assert.equal((await open(junk)).status, 401);
  } finally {
    await server.close();
  }
});

test('unused tickets cannot pile up', async () => {
  // Its own server, with tickets that outlive the test: with the short life used above, a busy machine lets them
  // expire faster than forty requests are answered, and the limit is never reached.
  const { server, call } = await setup();
  try {
    const statuses = [];
    for (let i = 0; i < 40; i += 1) statuses.push((await call('/api/events/ticket', { method: 'POST' })).status);
    assert.deepEqual([statuses.filter((status) => status === 200).length, statuses.filter((status) => status === 429).length], [32, 8]);
  } finally {
    await server.close();
  }
});

test('static files come from the app directory and nowhere else', async () => {
  const { server, call } = await setup();
  try {
    const index = await call('/', { token: null });
    assert.equal(index.status, 200);
    assert.match(index.headers['content-security-policy'], /default-src 'self'/);
    assert.equal((await call('/assets/app.js', { token: null })).headers['content-type'], 'text/javascript; charset=utf-8');
    for (const escape of ['/../secret.txt', '/..%2Fsecret.txt', '/%2e%2e/secret.txt', '/assets/../../secret.txt']) {
      const res = await call(escape, { token: null });
      assert.ok(!res.text.includes('not yours'), escape);
    }
    assert.equal((await call('/', { method: 'POST', token: null })).status, 405);
  } finally {
    await server.close();
  }
});

test('load, save, and refuse to overwrite an edit made elsewhere', async () => {
  const { server, call, layerFile } = await setup();
  try {
    const session = (await call('/api/session')).json();
    assert.deepEqual({ id: session.id, extends: session.extends, targets: session.targets }, { id: 'acme', extends: 'tanrei', targets: ['web'] });
    const loaded = (await call('/api/layer')).json();
    assert.deepEqual(loaded.layer, layer);

    const edited = { ...layer, tokens: { ...layer.tokens, 'tanrei.dial.type.base': { $value: { value: 17, unit: 'px' }, reason: 'Read at arm’s length.' } } };
    const saved = await call('/api/layer', { method: 'PUT', headers: { 'if-match': loaded.etag }, body: { layer: edited } });
    assert.equal(saved.status, 200, saved.text);
    assert.equal(fs.readFileSync(layerFile, 'utf8'), stringifyLayer(edited), 'two-space JSON with a trailing newline, as git expects');
    assert.deepEqual(fs.readdirSync(path.dirname(layerFile)), ['acme.system.json'], 'no temp or candidate files left next to the layer');

    // Someone edits the file in their editor; the Studio still holds the old etag.
    fs.writeFileSync(layerFile, stringifyLayer({ ...edited, name: 'Edited by hand' }));
    const conflict = await call('/api/layer', { method: 'PUT', headers: { 'if-match': saved.json().etag }, body: { layer: { ...edited, name: 'From the Studio' } } });
    assert.equal(conflict.status, 409);
    assert.equal(conflict.json().layer.name, 'Edited by hand');
    assert.equal(JSON.parse(fs.readFileSync(layerFile, 'utf8')).name, 'Edited by hand', 'the hand edit survives');
  } finally {
    await server.close();
  }
});

test('an invalid layer is not written; a request cannot rename the system or name another file', async () => {
  const { server, call, layerFile } = await setup();
  try {
    const { etag } = (await call('/api/layer')).json();
    const before = fs.readFileSync(layerFile, 'utf8');
    const noReason = await call('/api/layer', { method: 'PUT', headers: { 'if-match': etag }, body: { layer: { ...layer, vocabulary: { 'tanrei.sys.space.space1200': { $type: 'dimension' } } } } });
    assert.equal(noReason.status, 422);
    assert.match(noReason.json().problems.join('\n'), /rationale/);
    assert.equal((await call('/api/layer', { method: 'PUT', headers: { 'if-match': etag }, body: { layer: { ...layer, id: 'other' } } })).status, 422);
    assert.equal((await call('/api/layer?file=../../secret.txt', { method: 'PUT', headers: { 'if-match': etag }, body: { layer, file: '../../secret.txt' } })).status, 200, 'extra fields are ignored, the path is fixed');
    assert.equal((await call('/api/layer', { method: 'PUT', headers: { 'if-match': etag } })).status, 400, 'an empty body is a bad request, not a crash');
    assert.equal(JSON.parse(fs.readFileSync(layerFile, 'utf8')).id, 'acme');
    assert.ok(before.length > 0);
  } finally {
    await server.close();
  }
});

test('a layer the ENGINE refuses is not written either: 422 with the engine’s own words', async () => {
  const { server, call, layerFile } = await setup();
  try {
    const { etag } = (await call('/api/layer')).json();
    const before = fs.readFileSync(layerFile, 'utf8');
    const put = (tokens) => call('/api/layer', { method: 'PUT', headers: { 'if-match': etag }, body: { layer: { ...layer, tokens: { ...layer.tokens, ...tokens } } } });
    // Each of these passes the schema and the chain rules; only building it shows the problem.
    const { resolveSystem } = await import('@tanrei/tokens-build/product');
    const engineSays = (tokens) => resolveSystem({ layers: [{ ...layer, tokens: { ...layer.tokens, ...tokens } }] }, { model: false }).then(() => assert.fail('the engine accepted it'), (error) => error.message);
    for (const [what, tokens, words] of [
      ['an operation on a token nobody declared', { 'tanrei.sys.space.nope': { scale: 2 } }, /tanrei\.sys\.space\.nope: unknown token/],
      ['an alias to nothing', { 'tanrei.comp.button.container.shape': { $value: '{tanrei.sys.shape.corner.nowhere}' } }, /alias target \{tanrei\.sys\.shape\.corner\.nowhere\} does not exist/],
      ['an alias to a token of another type (the DTCG reading of the bundle refuses it)', { 'tanrei.comp.button.container.shape': { $value: '{tanrei.sys.color.primary}' } }, /Cannot alias to \$type "color" from \$type "dimension"/],
    ]) {
      const answer = await put(tokens);
      assert.equal(answer.status, 422, `${what}: ${answer.text}`);
      assert.match(answer.json().problems.join('\n'), words, what);
      assert.deepEqual(answer.json().problems, [await engineSays(tokens)], `${what}: verbatim, nothing added, nothing taken away`);
      assert.equal(fs.readFileSync(layerFile, 'utf8'), before, `${what}: the file is untouched`);
    }
    assert.deepEqual(fs.readdirSync(path.dirname(layerFile)), ['acme.system.json'], 'no candidate file was left behind');
    // …and the same request with a layer the engine builds is written.
    assert.equal((await put({ 'tanrei.sys.space.space400': { scale: 2 } })).status, 200);
  } finally {
    await server.close();
  }
});

test('asking the engine takes a moment: the file is looked at again before it is replaced, and saves take turns', async () => {
  let asked = 0;
  let running = 0;
  let overlapped = false;
  let during = () => {};
  const { server, call, layerFile } = await setup({
    resolveLayers: async () => {
      asked += 1;
      running += 1;
      overlapped ||= running > 1;
      during();
      await new Promise((resolve) => setTimeout(resolve, 40));
      running -= 1;
    },
  });
  try {
    const { etag } = (await call('/api/layer')).json();
    // Someone saves in their editor WHILE the engine is looking at the Studio's layer.
    during = () => fs.writeFileSync(layerFile, stringifyLayer({ ...layer, name: 'Edited by hand, meanwhile' }));
    const raced = await call('/api/layer', { method: 'PUT', headers: { 'if-match': etag }, body: { layer: { ...layer, name: 'From the Studio' } } });
    assert.equal(raced.status, 409, raced.text);
    assert.equal(raced.json().layer.name, 'Edited by hand, meanwhile');
    assert.equal(JSON.parse(fs.readFileSync(layerFile, 'utf8')).name, 'Edited by hand, meanwhile', 'the hand edit survives');
    during = () => {};

    // Ten saves at once with the same etag: one wins, the ones in line see its result (409), the rest are sent away (429).
    const now = raced.json().etag;
    const answers = await Promise.all(Array.from({ length: 10 }, (_, i) => call('/api/layer', { method: 'PUT', headers: { 'if-match': now }, body: { layer: { ...layer, name: `Save ${i}` } } })));
    const count = (status) => answers.filter((answer) => answer.status === status).length;
    assert.equal(count(200), 1, answers.map((answer) => answer.status).join(' '));
    assert.ok(count(429) >= 1 && count(409) >= 1 && count(200) + count(409) + count(429) === 10, answers.map((answer) => answer.status).join(' '));
    assert.equal(overlapped, false, 'the engine is asked about one layer at a time');
    const winner = answers.findIndex((answer) => answer.status === 200);
    assert.equal(JSON.parse(fs.readFileSync(layerFile, 'utf8')).name, `Save ${winner}`);

    // The line empties: the next save is served. A chain the engine has accepted in this run is not resolved again.
    const next = await call('/api/layer', { method: 'PUT', headers: { 'if-match': answers[winner].json().etag }, body: { layer: { ...layer, name: 'From the Studio' } } });
    assert.equal(next.status, 200, next.text);
    const before = asked;
    const back = await call('/api/layer', { method: 'PUT', headers: { 'if-match': next.json().etag }, body: { layer: { ...layer, name: `Save ${winner}` } } });
    assert.equal(back.status, 200, back.text);
    assert.equal(asked, before, 'A → B → A: A was accepted before');
  } finally {
    await server.close();
  }
});

test('nothing is copied anywhere: validation and builds leave no temp directory, and the file keeps its permissions', async () => {
  const { server, call, layerFile, dir } = await setup();
  const tmp = path.join(dir, 'tmp');
  fs.mkdirSync(tmp);
  const previous = process.env.TMPDIR;
  process.env.TMPDIR = tmp; // os.tmpdir() reads it on every call: anything the server put "in the temp dir" would land here
  try {
    assert.equal(fs.realpathSync(os.tmpdir()), fs.realpathSync(tmp));
    fs.chmodSync(layerFile, 0o600);
    const { etag } = (await call('/api/layer')).json();
    const saved = await call('/api/layer', { method: 'PUT', headers: { 'if-match': etag }, body: { layer: { ...layer, name: 'Saved' } } });
    assert.equal(saved.status, 200, saved.text);
    assert.equal((await call('/api/build?dry=1', { method: 'POST' })).status, 200);
    assert.equal((await call('/api/layer', { method: 'PUT', headers: { 'if-match': saved.json().etag }, body: { layer: { ...layer, colours: {} } } })).status, 422);
    assert.deepEqual(fs.readdirSync(tmp), [], 'no temp directory, no candidate file, no copy of a sibling');
    assert.deepEqual(fs.readdirSync(path.dirname(layerFile)), ['acme.system.json']);
    if (process.platform !== 'win32') assert.equal(fs.statSync(layerFile).mode & 0o777, 0o600, 'an atomic write is a new file; it keeps the mode the old one had');
  } finally {
    if (previous === undefined) delete process.env.TMPDIR;
    else process.env.TMPDIR = previous;
    await server.close();
  }
});

test('a layer on a LOCAL layer: the parents are served read-only, validated and built with it, and announced when they change', async () => {
  const { server, call, layerFile, written } = await setup();
  const design = path.dirname(layerFile);
  const house = { id: 'house', extends: 'm3-like', tokens: { 'tanrei.dial.shape.unit': { $value: { value: 2, unit: 'px' }, reason: 'Sharper corners across every product.' } } };
  try {
    assert.deepEqual((await call('/api/parents')).json(), []);
    assert.equal((await call('/api/parents', { token: null })).status, 401);
    const ticket = (await call('/api/events/ticket', { method: 'POST' })).json().ticket;
    const events = [];
    const stream = http.get({ host: '127.0.0.1', port: server.port, path: `/api/events?ticket=${ticket}` }, (res) => res.on('data', (chunk) => events.push(String(chunk))).on('error', () => {}));
    stream.on('error', () => {}); // we hang up on purpose below
    await new Promise((resolve) => setTimeout(resolve, 150));

    fs.writeFileSync(path.join(design, 'house.system.json'), stringifyLayer(house));
    fs.writeFileSync(path.join(design, 'misnamed.system.json'), stringifyLayer({ id: 'other', extends: 'tanrei' }));
    fs.writeFileSync(path.join(design, 'm3-like.system.json'), stringifyLayer({ id: 'm3-like', extends: 'tanrei' }));
    fs.writeFileSync(path.join(design, 'broken.system.json'), '{ not json');
    fs.writeFileSync(path.join(design, 'Not An Id.system.json'), stringifyLayer({ id: 'Not An Id' }));
    await new Promise((resolve) => setTimeout(resolve, 400));
    assert.match(events.join(''), /event: parents\ndata: \{\}/, 'open Studios are told to fetch the parents again');
    stream.destroy();
    assert.deepEqual((await call('/api/parents')).json(), [{ id: 'house', layer: house }], 'only layer files that state their own file name, and never a stand-in for a shipped system');
    for (const method of ['PUT', 'POST', 'PATCH']) assert.equal((await call('/api/parents', { method, body: [{ id: 'house', layer: {} }] })).status, 404, `${method}: parents are read-only`);
    assert.equal((await call('/api/parents', { method: 'DELETE' })).status, 404);

    // The edited layer now extends the local one: accepted, written, and built through the whole chain.
    const { etag } = (await call('/api/layer')).json();
    const stacked = { id: 'acme', extends: 'house' };
    const saved = await call('/api/layer', { method: 'PUT', headers: { 'if-match': etag }, body: { layer: stacked } });
    assert.equal(saved.status, 200, saved.text);
    const built = (await call('/api/build', { method: 'POST' })).json();
    assert.deepEqual(built.chain.map((entry) => entry.id ?? entry), ['core', 'm3-like', 'house', 'acme']);
    assert.deepEqual(written, ['acme']);
    // A problem in the PARENT is reported too (the whole chain is validated), and nothing is written.
    fs.writeFileSync(path.join(design, 'house.system.json'), stringifyLayer({ ...house, colours: {} }));
    const refused = await call('/api/layer', { method: 'PUT', headers: { 'if-match': saved.json().etag }, body: { layer: { ...stacked, name: 'On a broken parent' } } });
    assert.equal(refused.status, 422);
    assert.match(refused.json().problems.join('\n'), /house/);
    assert.deepEqual(JSON.parse(fs.readFileSync(layerFile, 'utf8')), stacked);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(design, 'house.system.json'), 'utf8')).id, 'house', 'the parent is never written by the server');
  } finally {
    await server.close();
  }
});

test('layers next to the file are read as regular files only: never through a symbolic link, never by a path a request supplies', { skip: process.platform === 'win32' && 'symbolic links need privileges on Windows' }, async () => {
  const { server, call, layerFile, dir } = await setup();
  const design = path.dirname(layerFile);
  try {
    // Outside the design directory: a perfectly valid layer, and a secret. Inside: links to both, named like layers.
    const outside = path.join(dir, 'elsewhere');
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, 'linked.system.json'), stringifyLayer({ id: 'linked', extends: 'tanrei', description: 'OUTSIDE-THE-DIRECTORY' }));
    fs.symlinkSync(path.join(outside, 'linked.system.json'), path.join(design, 'linked.system.json'));
    fs.symlinkSync(path.join(dir, 'secret.txt'), path.join(design, 'secret.system.json'));
    fs.symlinkSync(outside, path.join(design, 'folder.system.json'));
    fs.mkdirSync(path.join(design, 'directory.system.json'));

    assert.deepEqual(readRegularFile(path.join(design, 'linked.system.json')), { why: 'is a symbolic link' });
    assert.deepEqual(readRegularFile(path.join(design, 'directory.system.json')), { why: 'is not a regular file' });
    assert.match(readRegularFile(path.join(design, 'missing.system.json')).why, /cannot be read \(ENOENT\)/);
    assert.deepEqual(readRegularFile(layerFile, 10), { why: 'is larger than 10 bytes' });
    assert.deepEqual(readSiblingLayers(layerFile), { parents: [], skipped: { directory: 'is not a regular file', folder: 'is a symbolic link', linked: 'is a symbolic link', secret: 'is a symbolic link' } });

    const parents = await call('/api/parents');
    assert.deepEqual(parents.json(), []);
    // Extending the linked layer is refused — with the reason, and without a byte of what the link points at.
    const { etag } = (await call('/api/layer')).json();
    const before = fs.readFileSync(layerFile, 'utf8');
    for (const parent of ['linked', 'secret']) {
      const refused = await call('/api/layer', { method: 'PUT', headers: { 'if-match': etag }, body: { layer: { id: 'acme', extends: parent } } });
      assert.equal(refused.status, 422, refused.text);
      assert.match(refused.json().problems.join('\n'), new RegExp(`"extends": "${parent}" — ${parent}\\.system\\.json is a symbolic link`));
      assert.ok(!/OUTSIDE-THE-DIRECTORY|not yours/.test(refused.text));
    }
    // `extends` is data from the request; it never becomes a path.
    fs.writeFileSync(path.join(dir, 'escape.system.json'), stringifyLayer({ id: 'escape', extends: 'tanrei', description: 'OUTSIDE-THE-DIRECTORY' }));
    for (const parent of ['../escape', '../../etc/passwd', path.join(dir, 'escape'), 'elsewhere/linked']) {
      const refused = await call('/api/layer', { method: 'PUT', headers: { 'if-match': etag }, body: { layer: { id: 'acme', extends: parent } } });
      assert.equal(refused.status, 422, parent);
      assert.ok(!/OUTSIDE-THE-DIRECTORY|root:/.test(refused.text), parent);
    }
    assert.equal(fs.readFileSync(layerFile, 'utf8'), before);
    // A build of a file that (edited by hand) extends the link: the same refusal.
    fs.writeFileSync(layerFile, stringifyLayer({ id: 'acme', extends: 'linked' }));
    const build = await call('/api/build?dry=1', { method: 'POST' });
    assert.equal(build.status, 422);
    assert.match(build.json().problems.join('\n'), /linked\.system\.json is a symbolic link/);
    assert.ok(!build.text.includes('OUTSIDE-THE-DIRECTORY'));
  } finally {
    await server.close();
  }
});

test('one build at a time: a second request is told to come back (429), and is not queued', async () => {
  let release;
  let started = 0;
  const { server, call, written } = await setup({ buildSystem: () => new Promise((resolve) => { started += 1; release = () => resolve({ id: 'acme', chain: ['tanrei', 'acme'], tokens: 1, warnings: [], files: { web: { 'acme.css': '' } } }); }) });
  try {
    const first = call('/api/build', { method: 'POST' });
    while (!release) await new Promise((resolve) => setTimeout(resolve, 10));
    const [second, dry] = await Promise.all([call('/api/build', { method: 'POST' }), call('/api/build?dry=1', { method: 'POST' })]);
    assert.deepEqual([second.status, dry.status], [429, 429]);
    assert.equal(second.headers['retry-after'], '1');
    assert.match(second.json().problems[0], /already running/);
    assert.equal(started, 1, 'the refused requests built nothing');
    assert.equal((await call('/api/layer')).status, 200, 'everything else keeps answering');
    release();
    assert.equal((await first).status, 200);
    assert.deepEqual(written, ['acme']);
    // Finished — and a build that FAILS frees the slot too.
    release = undefined;
    const next = call('/api/build?dry=1', { method: 'POST' });
    while (!release) await new Promise((resolve) => setTimeout(resolve, 10));
    release();
    assert.equal((await next).status, 200);
  } finally {
    await server.close();
  }
});

test('a build that fails frees the slot', async () => {
  let fail = true;
  const { server, call } = await setup({ buildSystem: async () => { if (fail) throw new Error('engine says no'); return { id: 'acme', chain: [], tokens: 0, warnings: [], files: {} }; } });
  try {
    const failed = await call('/api/build', { method: 'POST' });
    assert.deepEqual([failed.status, failed.json().problems], [422, ['engine says no']]);
    fail = false;
    assert.equal((await call('/api/build', { method: 'POST' })).status, 200);
  } finally {
    await server.close();
  }
});

test('build: dry run reports, a real run writes through the CLI’s writer, engine errors come back verbatim', async () => {
  const { server, call, layerFile, written } = await setup();
  try {
    const dry = (await call('/api/build?dry=1', { method: 'POST' })).json();
    assert.equal(dry.id, 'acme');
    assert.deepEqual(dry.files.map((f) => f.path), [path.join('out/web', 'acme.css')]);
    assert.deepEqual(written, []);
    const real = (await call('/api/build', { method: 'POST' })).json();
    assert.deepEqual(real.files, [{ target: 'web', path: 'out/web/acme.css', changed: true }]);
    assert.deepEqual(written, ['acme']);

    fs.writeFileSync(layerFile, stringifyLayer({ ...layer, tokens: { 'tanrei.sys.space.space950': { scale: 2 } } }));
    const broken = await call('/api/build?dry=1', { method: 'POST' });
    assert.equal(broken.status, 422);
    assert.match(broken.json().problems[0], /unknown token[\s\S]*declare it under "vocabulary"/);
  } finally {
    await server.close();
  }
});

test('an edit made outside the Studio is announced over SSE; the Studio’s own save is not', async () => {
  const { server, call, layerFile } = await setup();
  try {
    const events = [];
    const { ticket } = (await call('/api/events/ticket', { method: 'POST' })).json();
    const stream = http.get({ host: '127.0.0.1', port: server.port, path: `/api/events?ticket=${ticket}` }, (res) => res.on('data', (chunk) => events.push(String(chunk))));
    await new Promise((resolve) => setTimeout(resolve, 150));
    const { etag } = (await call('/api/layer')).json();
    await call('/api/layer', { method: 'PUT', headers: { 'if-match': etag }, body: { layer: { ...layer, name: 'Saved by the Studio' } } });
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.ok(!events.join('').includes('event: layer'), 'our own write is not an external change');
    fs.writeFileSync(layerFile, stringifyLayer({ ...layer, name: 'Edited in an editor' }));
    await new Promise((resolve) => setTimeout(resolve, 500));
    assert.match(events.join(''), /event: layer\ndata: \{"etag":"\\"[0-9a-f]{32}\\""\}/);
    stream.destroy();
  } finally {
    await server.close();
  }
});
