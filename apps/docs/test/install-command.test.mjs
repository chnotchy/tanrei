// The command that adds a package, in each package manager (src/lib/install-command.mjs, components/
// InstallCommand.astro): each manager's own words, the packages named under the scope tanrei.config.json gives, the
// component's words in the six languages, and every install page in every language drawing the command with it — no
// page writes a registry install of the repository's packages as a block of its own.
//
//   pnpm --filter @tanrei/docs test:node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

register('./vite-shim.mjs', import.meta.url);
const { strings } = await import('../src/lib/i18n.ts');
const { PACKAGE_MANAGERS, installCommand, publishedNames } = await import('../src/lib/install-command.mjs');
const { source, translations } = await import('../i18n/locales.mjs');

const docs = fileURLToPath(new URL('../src/content/docs/', import.meta.url));
const config = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../../../tanrei.config.json', import.meta.url)), 'utf8'));
const scope = config.packages.npmScope;
const languages = [{ lang: source?.lang ?? 'en', dir: '' }, ...translations.map(({ lang, dir }) => ({ lang, dir }))];

/** Every page of the site's content, as its path under `src/content/docs/` and its text. */
const pages = (dir = docs) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return pages(full);
    return /\.mdx?$/.test(entry.name) ? [{ rel: path.relative(docs, full), text: fs.readFileSync(full, 'utf8') }] : [];
  });

describe('the command, in each package manager', () => {
  test('npm first, then pnpm, yarn and bun', () => {
    assert.deepEqual(PACKAGE_MANAGERS, ['npm', 'pnpm', 'yarn', 'bun']);
  });

  test('each manager adds the packages in its own words', () => {
    const packages = [`${scope}/react`, `${scope}/web`];
    assert.deepEqual(
      PACKAGE_MANAGERS.map((manager) => installCommand(manager, packages)),
      [`npm install ${scope}/react ${scope}/web`, `pnpm add ${scope}/react ${scope}/web`, `yarn add ${scope}/react ${scope}/web`, `bun add ${scope}/react ${scope}/web`],
    );
  });

  test('a development dependency takes each manager’s own long flag', () => {
    assert.deepEqual(
      PACKAGE_MANAGERS.map((manager) => installCommand(manager, [`${scope}/cli`], { dev: true })),
      [`npm install --save-dev ${scope}/cli`, `pnpm add --save-dev ${scope}/cli`, `yarn add --dev ${scope}/cli`, `bun add --dev ${scope}/cli`],
    );
  });

  test('an unknown manager, or nothing to install, is refused', () => {
    assert.throws(() => installCommand('cargo', [`${scope}/web`]), /no package manager "cargo"/);
    assert.throws(() => installCommand('npm', []), /no package/);
  });

  test('the packages are named under the scope of tanrei.config.json, and a page never writes the scope', () => {
    assert.deepEqual(publishedNames(' react  web ', scope), [`${scope}/react`, `${scope}/web`]);
    assert.throws(() => publishedNames(`${scope}/web`, scope), /not a package's name under the scope/);
  });
});

describe('its words, in every language', () => {
  for (const { lang } of languages) {
    test(`${lang}: the row of tabs is named, and each code block says which manager it is`, () => {
      const t = strings(lang).install;
      assert.ok(t.choice.trim(), `${lang}: install.choice`);
      assert.ok(t.command.includes('{manager}'), `${lang}: install.command names the manager`);
      if (lang !== 'en') assert.notEqual(t.choice, strings('en').install.choice, `${lang}: install.choice is translated`);
    });
  }
});

describe('the install pages', () => {
  const all = pages();
  // A fenced block that installs one of the repository's packages from the registry, with any manager.
  const fenced = new RegExp(String.raw`\x60\x60\x60(?:sh|bash|shell|zsh)[^\n]*\n[^\x60]*?(?:npm (?:i|install)|pnpm add|yarn add|bun add) (?:-\S+ )*${scope.replace('/', '\\/')}\/`);

  test('no page writes a registry install of the repository’s packages as a block of its own', () => {
    assert.deepEqual(all.filter(({ text }) => fenced.test(text)).map(({ rel }) => rel), []);
  });

  for (const page of ['web', 'react', 'react-native', 'your-design-system']) {
    test(`getting-started/${page}: every language draws the same commands with the component`, () => {
      const uses = languages.map(({ dir }) => {
        const text = fs.readFileSync(path.join(docs, dir, 'getting-started', `${page}.mdx`), 'utf8');
        assert.match(text, /^import InstallCommand from '(?:\.\.\/)+components\/InstallCommand\.astro';$/m, `${dir || 'en'}: imports the component`);
        return text.match(/<InstallCommand [^>]*\/>/g);
      });
      assert.ok(uses[0]?.length, `getting-started/${page} draws an install command`);
      for (const [index, { dir }] of languages.entries()) assert.deepEqual(uses[index], uses[0], `${dir || 'en'}: the same commands as the English page`);
    });
  }
});
