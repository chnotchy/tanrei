// The HTTP adapter of the standalone app: Theme Studio edits the layer FILE a local server holds
// (`tanrei studio`, packages/cli/src/studio-server.js; test/mock-server.mjs implements the same contract).
//
//   GET  /api/session                → { id, file, extends, targets }
//   GET  /api/layer                  → { layer, etag }
//   PUT  /api/layer  If-Match: etag  → 200 { etag } | 409 { layer, etag } | 422 { problems } (schema, chain rules, or the
//                                      engine's own message) | 429 (saves take turns; too many are waiting)
//   GET  /api/parents                → [{ id, layer }]   the layers next to the file: what it may extend, read-only
//   POST /api/build[?dry=1]          → { id, chain, tokens, warnings, files } | 422 { problems } | 429 (one build at a time)
//   POST /api/events/ticket          → { ticket }        good for ONE event stream, for half a minute
//   GET  /api/events?ticket=…  (SSE) → event "layer", data { etag } when the file changes on disk;
//                                      event "parents" when a layer next to it does
//
// The per-run token reaches the page in the URL fragment (never sent over the network by the browser), is taken out
// of the address bar at once, and is sent back as the `X-Tanrei-Token` header on every request — never in a URL.
// The event stream is the one request that cannot carry a header everywhere, so it is opened with a ticket.

/** `#token=…` of a location hash. */
export function tokenFromHash(hash = '') {
  return new URLSearchParams(hash.replace(/^#/, '')).get('token') ?? '';
}

const TOKEN_STORE = 'tanrei-studio-token';
/**
 * Read the token and take it out of sight: out of the URL (address bar, history entry, anything that copies
 * `location.href`) and into this tab's session storage, where a reload of the same tab finds it again and nothing
 * outside this origin ever does. The rest of the fragment, the path and the query stay as they were.
 * @param {{ location?: { hash: string, pathname: string, search: string }, history?: { replaceState(data: any, unused: string, url: string): void, state?: any }, storage?: { getItem(key: string): string | null, setItem(key: string, value: string): void } }} [env]
 */
export function takeToken(env = {}) {
  const location = env.location ?? globalThis.location;
  const history = 'history' in env ? env.history : globalThis.history;
  let storage = env.storage;
  if (!('storage' in env)) {
    try {
      storage = globalThis.sessionStorage; // reading the property itself throws where storage is blocked
    } catch {}
  }
  const params = new URLSearchParams((location.hash ?? '').replace(/^#/, ''));
  const fromHash = params.get('token') ?? '';
  if (fromHash) {
    params.delete('token');
    const rest = params.toString();
    try {
      storage?.setItem(TOKEN_STORE, fromHash);
    } catch {}
    try {
      history?.replaceState(history.state ?? null, '', `${location.pathname}${location.search}${rest ? `#${rest}` : ''}`);
    } catch {}
    return fromHash;
  }
  try {
    return storage?.getItem(TOKEN_STORE) ?? '';
  } catch {
    return '';
  }
}

export class AdapterError extends Error {
  constructor(status, problems) {
    super(problems.join('\n'));
    this.status = status;
    this.problems = problems;
  }
}

/**
 * @param {{ baseUrl?: string, token: string, fetch?: typeof fetch, retryMs?: number }} options
 * @returns {import('./index').StudioAdapter & { session(): Promise<object> }}
 */
export function createHttpAdapter({ baseUrl = '', token, fetch: fetch_ = globalThis.fetch.bind(globalThis), retryMs = 2000 }) {
  let known = null; // the etag this client last saw, so its own writes are not reported back as external changes
  async function request(method, path, { body, headers } = {}) {
    const response = await fetch_(`${baseUrl}${path}`, { method, headers: { 'X-Tanrei-Token': token, ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
  }
  const fail = ({ status, data }) => new AdapterError(status, data.problems ?? [`the server answered ${status}`]);

  const adapter = {
    label: 'file',
    async session() {
      const answer = await request('GET', '/api/session');
      if (answer.status !== 200) throw fail(answer);
      adapter.label = answer.data.file ?? adapter.label;
      return answer.data;
    },
    async load() {
      const answer = await request('GET', '/api/layer');
      if (answer.status !== 200) throw fail(answer);
      known = answer.data.etag;
      return { layer: answer.data.layer, etag: answer.data.etag };
    },
    async save(layer, etag) {
      const answer = await request('PUT', '/api/layer', { body: { layer }, headers: etag ? { 'If-Match': etag } : {} });
      if (answer.status === 409) return { conflict: { layer: answer.data.layer, etag: answer.data.etag } };
      if (answer.status !== 200) throw fail(answer);
      known = answer.data.etag;
      return { etag: answer.data.etag };
    },
    /** The host's own layers this one may extend. A server that predates the endpoint has none. */
    async parents() {
      const answer = await request('GET', '/api/parents');
      if (answer.status === 404) return [];
      if (answer.status !== 200) throw fail(answer);
      return Array.isArray(answer.data) ? answer.data : [];
    },
    async build({ dry = false } = {}) {
      const answer = await request('POST', `/api/build${dry ? '?dry=1' : ''}`);
      if (answer.status !== 200) throw fail(answer);
      return { ...answer.data, warnings: answer.data.warnings ?? [], files: answer.data.files ?? [] };
    },
    /**
     * Server-sent events, read from a fetch stream (so Node can run it too). Every connection — the first one and
     * each reconnect — is opened with a fresh single-use ticket; the token itself never appears in a URL.
     */
    watch(onExternalChange, onParentsChange) {
      const controller = new AbortController();
      const handle = async (event, data) => {
        if (event === 'parents') return void onParentsChange?.();
        if (event !== 'layer') return;
        const { etag } = JSON.parse(data);
        if (etag === known) return; // our own save
        const remote = await adapter.load().catch(() => null);
        if (remote && !controller.signal.aborted) onExternalChange(remote);
      };
      (async () => {
        while (!controller.signal.aborted) {
          try {
            const ticket = await request('POST', '/api/events/ticket');
            if (ticket.status !== 200 || !ticket.data.ticket) throw fail(ticket);
            const response = await fetch_(`${baseUrl}/api/events?ticket=${encodeURIComponent(ticket.data.ticket)}`, { headers: { Accept: 'text/event-stream' }, signal: controller.signal });
            if (!response.ok || !response.body) throw new Error(`the event stream answered ${response.status}`);
            const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
            let buffer = '';
            for (;;) {
              const { value, done } = await reader.read();
              if (done) break;
              buffer += value;
              const messages = buffer.split(/\r?\n\r?\n/);
              buffer = messages.pop();
              for (const message of messages) {
                const field = (name) => message.split(/\r?\n/).filter((line) => line.startsWith(`${name}:`)).map((line) => line.slice(name.length + 1).trim()).join('\n');
                if (field('data')) await handle(field('event') || 'message', field('data'));
              }
            }
          } catch {
            // dropped or refused: try again below, unless we were told to stop
          }
          if (!controller.signal.aborted) await new Promise((resolve) => setTimeout(resolve, retryMs));
        }
      })();
      return () => controller.abort();
    },
  };
  return adapter;
}
