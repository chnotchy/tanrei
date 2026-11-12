// The CLI's own copy of the vocabulary (dist/vocabulary), written by scripts/build.js: what it reads at run time —
// tokens/ (sources only), the component catalog, the glyph names and tanrei.config.json — and nothing it does not
// read (packages/tools/src/packed-vocabulary.js). test/packed-vocabulary.test.js proves the copy builds what the
// repository builds.
import fs from 'node:fs';
import path from 'node:path';
import { copyTokenSources } from '../../tools/src/packed-vocabulary.js';

/** Writes the vocabulary of the repository at `repo` into the directory `vocabulary`, which must not exist yet or be empty. */
export function writeVocabulary(repo, vocabulary) {
  fs.mkdirSync(vocabulary, { recursive: true });
  fs.copyFileSync(path.join(repo, 'tanrei.config.json'), path.join(vocabulary, 'tanrei.config.json'));
  // The glyph names the components may draw, which `tanrei build` prints: at the path they have in the repository.
  const glyphs = 'packages/web/src/generated/glyphs.json';
  fs.mkdirSync(path.dirname(path.join(vocabulary, glyphs)), { recursive: true });
  fs.copyFileSync(path.join(repo, glyphs), path.join(vocabulary, glyphs));
  // Sources only: tokens/generated/ is build output, and a product build never reads it.
  copyTokenSources(repo, vocabulary);
  // The component catalog, which `tanrei build` writes a product's components manifest from: at its path in the repository.
  const catalog = 'packages/tokens-build/generated/component-catalog.json';
  fs.mkdirSync(path.dirname(path.join(vocabulary, catalog)), { recursive: true });
  fs.copyFileSync(path.join(repo, catalog), path.join(vocabulary, catalog));
}
