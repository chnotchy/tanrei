// The page's side of the page sheet's worker (./sheet-worker.ts): `pageSheetInWorker(layer)` resolves with the layer's
// sheet for a page whose root holds the default system's (./sheet.js, the core's `pageSheet`'s), computed off the page's
// thread, and rejects with why a layer has none. One worker serves every request of the page; it is let go once nothing
// has been asked of it for a while, since it holds the token documents and the pipeline, and started again when it is
// next needed.
//
// A host bundles it with Vite, which builds the worker into a file of its own: give `worker.plugins` the Studio's plugin
// as well (`@tanrei/studio/vite`), and `worker.format: 'es'`.
//
// A host that knows the worker's file before this module runs may start the worker itself, sooner (a page's head
// script, while the document is still being parsed: Firefox puts off fetching a worker's script made once the parser
// is busy with the page's body, until the document is parsed), and give it here (`adoptSheetWorker`): the next request
// is sent to it instead of to a new one.

/** How long a worker that has nothing to do is kept, in milliseconds. */
const IDLE = 10_000;

type Answer = { id: number; css: string } | { id: number; error: string };

let worker: Worker | null = null;
let last = 0;
let idle: ReturnType<typeof setTimeout> | undefined;
const waiting = new Map<number, { resolve(css: string): void; reject(error: Error): void }>();

function stop(reason?: Error) {
  worker?.terminate();
  worker = null;
  for (const { reject } of waiting.values()) reject(reason ?? new Error('the page sheet’s worker stopped'));
  waiting.clear();
}

/** `made` is the worker every request is sent to, until it stops. */
function serve(made: Worker): Worker {
  made.addEventListener('message', (event: MessageEvent<Answer>) => {
    const answer = event.data;
    const asked = waiting.get(answer.id);
    if (!asked) return;
    waiting.delete(answer.id);
    if ('css' in answer) asked.resolve(answer.css);
    else asked.reject(new Error(answer.error));
    if (!waiting.size) idle = setTimeout(() => stop(), IDLE);
  });
  // A worker that cannot start (its file refused or not found) or that throws: every request waiting on it fails.
  made.addEventListener('error', (event) => {
    event.preventDefault();
    stop(new Error(`the page sheet’s worker failed: ${event.message || 'it could not start'}`));
  });
  worker = made;
  return made;
}

const started = (): Worker => worker ?? serve(new Worker(new URL('./sheet-worker.ts', import.meta.url), { type: 'module' }));

/**
 * A worker of ./sheet-worker.ts the host started, made the one the page's requests are sent to — where none is running
 * yet; otherwise it is let go. Let go too if nothing is asked of it for a while.
 */
export function adoptSheetWorker(made: Worker): void {
  if (worker) {
    if (made !== worker) made.terminate();
    return;
  }
  serve(made);
  clearTimeout(idle);
  idle = setTimeout(() => stop(), IDLE);
}

/** The layer's sheet for a page whose root holds the default system's, computed in the worker. */
export function pageSheetInWorker(layer: object): Promise<string> {
  clearTimeout(idle);
  const id = ++last;
  return new Promise<string>((resolve, reject) => {
    waiting.set(id, { resolve, reject });
    started().postMessage({ id, layer });
  });
}
