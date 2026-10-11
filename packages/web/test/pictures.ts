// The pictures the specs' fixtures name (`fixtures/<name>.png`), as addresses a staged page can load from nowhere:
// a `data:` URL of the package's own copy (test/fixtures/), so that a page written into a blank window, the review
// gallery and the docs draw the same picture and no fixture ever makes a request. `fixtures/missing.png` is the
// picture that must not exist (the avatar's `image-failed`, the Link's `external-site-icon-failed`): bytes no decoder
// reads, so the picture fails at once, the same way, in every engine. `fixtures/pending.png` is the picture that never
// arrives (the image preview's `loading` and `loading-thumbnail`): the address of no picture at all — empty — which an
// element asks nobody for and so waits on for as long as the page stands. An address that is asked for and never
// answered would do the same to the element and more to the page: a request under way when a document is read keeps
// its `load` from ever coming, in a test's window, in a frame of the review gallery and on a page of the docs alike.
// (A test that must see a request held open routes one of its own, after the page has loaded.)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const MISSING = 'data:image/png;base64,AAAA';
const PENDING = '';

/** The address a staged page uses for the fixture picture `src`; an address that names no fixture picture is returned as it is. */
export function fixturePicture(src: string): string {
  const name = /^fixtures\/([\w-]+\.png)$/.exec(src)?.[1];
  if (!name) return src;
  if (name === 'pending.png') return PENDING;
  const file = path.join(fixtures, name);
  return name !== 'missing.png' && fs.existsSync(file) ? `data:image/png;base64,${fs.readFileSync(file).toString('base64')}` : MISSING;
}
