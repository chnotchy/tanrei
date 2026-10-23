// The layer in the page's address, so that a link opens the Studio on the same layer: the layer file's text, compressed
// (raw DEFLATE, which every browser has as `CompressionStream`), written in base64url as the `layer` parameter of the
// URL's fragment — `#layer=…`. The fragment never leaves the browser: the server that serves the page is not sent it.
//
// It is the address of a Studio that keeps its layer in the browser. A Studio that edits a file through a server keeps
// the layer in that file, and its address holds none.

export const PARAM = 'layer';
/** The most text a link may unpack to. A layer of every token the default system has is about a tenth of it. */
export const MAX_TEXT = 1 << 20;

const base64url = (bytes) => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const bytesOf = (code) => {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), (char) => char.charCodeAt(0));
};

/** The layer's text, as it stands in the address. */
export async function packLayer(text) {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return base64url(new Uint8Array(await new Response(stream).arrayBuffer()));
}

/** The layer an address holds, parsed; throws when it is not one (a link cut short, more text than `MAX_TEXT`). */
export async function unpackLayer(code) {
  const reader = new Blob([bytesOf(code)]).stream().pipeThrough(new DecompressionStream('deflate-raw')).pipeThrough(new TextDecoderStream()).getReader();
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += value;
    if (text.length > MAX_TEXT) {
      await reader.cancel();
      throw new Error(`the layer in the address unpacks to more than ${MAX_TEXT} characters`);
    }
  }
  return JSON.parse(text);
}

/** The packed layer of a fragment (`location.hash`), or `null`. */
export const layerParam = (hash) => new URLSearchParams(String(hash).replace(/^#/, '')).get(PARAM);

/** The fragment with `code` as its layer — or without one, for `null` — and every other parameter kept as it was. */
export function withLayer(hash, code) {
  const params = new URLSearchParams(String(hash).replace(/^#/, ''));
  if (code) params.set(PARAM, code);
  else params.delete(PARAM);
  const text = params.toString();
  return text ? `#${text}` : '';
}
