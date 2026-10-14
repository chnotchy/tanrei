// Where each platform keeps a component's implementation, tests and snapshots.
// The parity check, the status matrix and the scaffolder all read this table,
// so a platform's layout is defined exactly once.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const CONFIG = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'tanrei.config.json'), 'utf8'));

const pascal = (name) => name.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('');
const snake = (name) => name.replaceAll('-', '_');
const KOTLIN_BASE = `${CONFIG.packages.mavenGroup}.${CONFIG.namespace}`.replaceAll('.', '/');

/**
 * A spec whose files are not where a component's are. A foundation with a spec is not an
 * element: prose's web implementation is a stylesheet, and its docs page is under Foundations — the typography page,
 * where the stylesheet is documented, until prose has a page of its own. Anything not named here follows the table.
 *
 * A component whose web form is a class on the product's own element is placed the same way: the
 * link is `class="tanrei-link"` on an anchor, so its web implementation is a stylesheet and its test stands beside it.
 * Inline code is `class="tanrei-code"` on a `code` element, in the code stylesheet. Steps are
 * `class="tanrei-steps"` on the product's own ordered list, and the previous and next links are
 * `class="tanrei-previous-next-links"` on the product's own `nav` around its anchors. The timeline is
 * `class="tanrei-timeline"` on the product's own ordered list, the steps' form. Their docs pages are a component's, where
 * the table puts them.
 *
 * A component whose web form is an element and a stylesheet names the stylesheet beside the element:
 * the table is `<tanrei-table>` with no shadow root around a native table, and everything it draws is in one
 * light-DOM stylesheet. The element stays where the table puts it; `stylesheet` is the second file of the
 * implementation, and the parity check reads both. The accordion is the same form around the product's own
 * `details` elements, the description list around the product's own `dl`,
 * and the figure around a native `figure`. The app shell is the same form around the product's own
 * regions, and the page header around the page's own heading and paragraphs, and the tree view around the
 * product's own nested lists.
 *
 * A stylesheet is also the second file of an element that keeps a shadow root for what the product did not write and
 * lets one light-DOM stylesheet draw the product's own markup around it: the table of contents holds its landmark,
 * title and disclosure row in a shadow root, and its stylesheet draws the product's own list of anchors, before the
 * element is defined too.
 */
export const OVERRIDES = {
  prose: {
    web: {
      implementation: 'packages/web/src/styles/prose.css',
      test: 'packages/web/src/styles/prose.test.ts',
    },
    docs: ['apps/docs/src/content/docs/foundations/typography.mdx', 'apps/docs/src/content/docs/ja/foundations/typography.mdx'],
  },
  link: {
    web: {
      implementation: 'packages/web/src/styles/link.css',
      test: 'packages/web/src/styles/link.test.ts',
    },
  },
  'inline-code': {
    web: {
      implementation: 'packages/web/src/styles/code.css',
      test: 'packages/web/src/styles/code.test.ts',
    },
  },
  table: {
    web: {
      stylesheet: 'packages/web/src/styles/table.css',
    },
  },
  accordion: {
    web: {
      stylesheet: 'packages/web/src/styles/accordion.css',
    },
  },
  'description-list': {
    web: {
      stylesheet: 'packages/web/src/styles/description-list.css',
    },
  },
  figure: {
    web: {
      stylesheet: 'packages/web/src/styles/figure.css',
    },
  },
  skeleton: {
    web: {
      stylesheet: 'packages/web/src/styles/skeleton.css',
    },
  },
  'app-shell': {
    web: {
      stylesheet: 'packages/web/src/styles/app-shell.css',
    },
  },
  'page-header': {
    web: {
      stylesheet: 'packages/web/src/styles/page-header.css',
    },
  },
  'table-of-contents': {
    web: {
      stylesheet: 'packages/web/src/styles/table-of-contents.css',
    },
  },
  breadcrumbs: {
    web: {
      stylesheet: 'packages/web/src/styles/breadcrumbs.css',
    },
  },
  'tree-view': {
    web: {
      stylesheet: 'packages/web/src/styles/tree-view.css',
    },
  },
  steps: {
    web: {
      implementation: 'packages/web/src/styles/steps.css',
      test: 'packages/web/src/styles/steps.test.ts',
    },
  },
  'previous-next-links': {
    web: {
      implementation: 'packages/web/src/styles/previous-next-links.css',
      test: 'packages/web/src/styles/previous-next-links.test.ts',
    },
  },
  timeline: {
    web: {
      implementation: 'packages/web/src/styles/timeline.css',
      test: 'packages/web/src/styles/timeline.test.ts',
    },
  },
};
const placed = (platform, key, fallback) => (n, ...rest) => OVERRIDES[n]?.[platform]?.[key] ?? fallback(n, ...rest);

/**
 * `snapshot(name, fixtureId)` returns the committed baseline image for one fixture.
 * Baselines are what make "equivalent visual result" checkable across platforms.
 */
export const PLATFORMS = {
  web: {
    label: 'Web Components',
    implementation: placed('web', 'implementation', (n) => `packages/web/src/components/${n}/${n}.ts`),
    test: placed('web', 'test', (n) => `packages/web/src/components/${n}/${n}.test.ts`),
    /** The light-DOM stylesheet that is part of a component's implementation, where it has one; undefined otherwise. */
    stylesheet: (n) => OVERRIDES[n]?.web?.stylesheet,
    snapshot: (n, f) => `packages/web/snapshots/${n}/${f}.png`,
  },
  swiftui: {
    label: 'SwiftUI',
    implementation: (n) => `packages/swiftui/Sources/Tanrei/Components/Tanrei${pascal(n)}.swift`,
    test: (n) => `packages/swiftui/Tests/TanreiTests/Tanrei${pascal(n)}Tests.swift`,
    snapshot: (n, f) => `packages/swiftui/Tests/TanreiTests/__Snapshots__/Tanrei${pascal(n)}Tests/${f}.png`,
  },
  compose: {
    label: 'Jetpack Compose',
    implementation: (n) => `packages/compose/tanrei/src/main/kotlin/${KOTLIN_BASE}/components/Tanrei${pascal(n)}.kt`,
    test: (n) => `packages/compose/tanrei/src/test/kotlin/${KOTLIN_BASE}/components/Tanrei${pascal(n)}Test.kt`,
    snapshot: (n, f) => `packages/compose/tanrei/src/test/snapshots/${n}/${f}.png`,
  },
  flutter: {
    label: 'Flutter',
    implementation: (n) => `packages/flutter/lib/src/components/${snake(n)}.dart`,
    test: (n) => `packages/flutter/test/components/${snake(n)}_test.dart`,
    snapshot: (n, f) => `packages/flutter/test/components/goldens/${snake(n)}/${f}.png`,
  },
  'react-native': {
    label: 'React Native',
    implementation: (n) => `packages/react-native/src/components/${pascal(n)}.tsx`,
    test: (n) => `packages/react-native/src/components/__tests__/${pascal(n)}.test.tsx`,
    snapshot: (n, f) => `packages/react-native/src/components/__tests__/__snapshots__/${pascal(n)}/${f}.json`,
  },
};

export const DOCS_PAGES = (n) => OVERRIDES[n]?.docs ?? [`apps/docs/src/content/docs/components/${n}.mdx`, `apps/docs/src/content/docs/ja/components/${n}.mdx`];

/**
 * Where the checks read the repository from. By default the working tree. With TANREI_CHECK_STAGED=1 (the pre-commit
 * hook) they read the git index — what is being committed — so work in progress elsewhere in the tree (an agent's
 * half-built component) neither blocks nor passes a commit it is not part of.
 */
export const STAGED = process.env.TANREI_CHECK_STAGED === '1';
let staged = null;
export const stagedFiles = () => (staged ??= new Set(execFileSync('git', ['ls-files', '--cached', '-z'], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }).split('\0').filter(Boolean)));
export const exists = (rel) => (STAGED ? stagedFiles().has(rel) : fs.existsSync(path.join(REPO_ROOT, rel)));
export const read = (rel) =>
  STAGED ? execFileSync('git', ['show', `:${rel}`], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }) : fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

export function loadSpecs() {
  const names = STAGED
    ? [...stagedFiles()].filter((f) => /^specs\/[^/]+\.spec\.json$/.test(f)).map((f) => f.slice('specs/'.length))
    : fs.readdirSync(path.join(REPO_ROOT, 'specs')).filter((f) => f.endsWith('.spec.json'));
  return names.sort().map((f) => ({ file: `specs/${f}`, spec: JSON.parse(read(`specs/${f}`)) }));
}
