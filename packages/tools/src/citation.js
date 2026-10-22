// CITATION.cff: how to cite Tanrei (Citation File Format 1.2.0; GitHub reads it for the repository's "Cite this
// repository"). Written by `pnpm generate` from tanrei.config.json — the name, the version, the licence, the site and
// the public repository, whose owner is the one author named — so that none of them is typed twice.
import fs from 'node:fs';
import path from 'node:path';
import { CONFIG, REPO_ROOT } from './conventions.js';

export const CITATION = 'CITATION.cff';

/** What the work is about, for indexes that read the file. */
const KEYWORDS = ['design system', 'design tokens', 'DTCG', 'web components', 'SwiftUI', 'Jetpack Compose', 'Flutter', 'React Native', 'accessibility'];

/** A YAML scalar, quoted where a plain one could be read as something else. */
const scalar = (value) => (/^[\w.\-/ ]+$/.test(value) && !/^[\d.\- ]+$/.test(value) && !/^(true|false|null|yes|no|on|off)$/i.test(value) ? value : JSON.stringify(value));

/** The file's text for `config`. */
export function citation(config = CONFIG) {
  if (!config.site) throw new Error('tanrei.config.json has no "site": the address of the docs site');
  const owner = config.repository.public.split('/')[0];
  return [
    '# GENERATED FILE — DO NOT EDIT. Source: tanrei.config.json. Regenerate with `pnpm generate`.',
    'cff-version: 1.2.0',
    `title: ${scalar(config.name)}`,
    `message: ${scalar(`If you use ${config.name} in research or writing, please cite it as below.`)}`,
    'type: software',
    'authors:',
    `  - alias: ${scalar(owner)}`,
    `    website: ${scalar(`https://github.com/${owner}`)}`,
    `repository-code: ${scalar(`https://github.com/${config.repository.public}`)}`,
    `url: ${scalar(config.site)}`,
    `license: ${scalar(config.license)}`,
    `version: ${scalar(config.version)}`,
    'keywords:',
    ...KEYWORDS.map((keyword) => `  - ${scalar(keyword)}`),
    '',
  ].join('\n');
}

/** The file as `pnpm generate` writes it: path → text. */
export const citationFiles = () => ({ [CITATION]: citation() });

export function writeCitation() {
  for (const [rel, text] of Object.entries(citationFiles())) fs.writeFileSync(path.join(REPO_ROOT, rel), text);
}
