// The server's own copy of the vocabulary (dist/vocabulary), written by scripts/build.js: what it reads at run time —
// tokens/ (sources, plus the presets' fidelity reports and the systems' components manifests), the component catalog
// and the specs, tanrei.config.json and the mimicry-gaps registry — and nothing it does not read
// (packages/tools/src/packed-vocabulary.js). test/packed-vocabulary.test.js proves the copy answers as the repository does.
import fs from 'node:fs';
import path from 'node:path';
import { copyTokenSources, packedComponentSchema, packedSpec } from '../../tools/src/packed-vocabulary.js';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

/** Writes the vocabulary of the repository at `repo` into the directory `vocabulary`, which must not exist yet or be empty. */
export function writeVocabulary(repo, vocabulary) {
  fs.mkdirSync(path.join(vocabulary, 'docs/governance'), { recursive: true });
  fs.copyFileSync(path.join(repo, 'tanrei.config.json'), path.join(vocabulary, 'tanrei.config.json'));
  fs.copyFileSync(path.join(repo, 'docs/governance/mimicry-gaps.json'), path.join(vocabulary, 'docs/governance/mimicry-gaps.json'));
  // Sources only: tokens/generated/ is build output, and the server computes every system from its layers…
  copyTokenSources(repo, vocabulary);
  // …except what the tools read as it is: the measured fidelity reports (tokens/generated/<id>/fidelity.json, for
  // list_systems) and each shipped system's components manifest (tokens/generated/<id>/components.json, for the component tools).
  for (const entry of fs.readdirSync(path.join(repo, 'tokens/generated'), { withFileTypes: true })) {
    for (const name of ['fidelity.json', 'components.json']) {
      const report = path.join('tokens/generated', entry.name, name);
      if (!entry.isDirectory() || !fs.existsSync(path.join(repo, report))) continue;
      fs.mkdirSync(path.dirname(path.join(vocabulary, report)), { recursive: true });
      fs.copyFileSync(path.join(repo, report), path.join(vocabulary, report));
    }
  }
  // The component catalog, which a product's components manifest is worked out from (as `tanrei build` does), at its path in the repository.
  const catalog = 'packages/tokens-build/generated/component-catalog.json';
  fs.mkdirSync(path.dirname(path.join(vocabulary, catalog)), { recursive: true });
  fs.copyFileSync(path.join(repo, catalog), path.join(vocabulary, catalog));
  // The component specs, the parts of their schema the server reads, and the inventory: get_component and find_component
  // answer from them. Written without indentation (the same JSON, about a third smaller).
  fs.mkdirSync(path.join(vocabulary, 'specs'));
  for (const name of fs.readdirSync(path.join(repo, 'specs'))) {
    const source = path.join(repo, 'specs', name);
    const write = (json) => fs.writeFileSync(path.join(vocabulary, 'specs', name), JSON.stringify(json));
    if (name.endsWith('.spec.json')) write(packedSpec(readJson(source)));
    else if (name === 'component.schema.json') write(packedComponentSchema(readJson(source)));
    else if (name === 'inventory.json') write(readJson(source));
  }
}
