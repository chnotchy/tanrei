// The web package's cloak (`@tanrei/web/cloak.css`), scoped to the docs' stages: what a figure's stage holds takes the
// room it will be drawn in before any script has run, so the page around a stage stays where it is whenever the
// elements' modules arrive.
//
// A stage defines its elements once it comes near the view (lib/example.ts), and a reader can reach one before its
// modules have arrived: a page down within moments of the load, or a slow line. Without the cloak, an element before it
// is defined takes the room of what is written between its tags — a text field's label on one line, 80 px of a stage
// drawn at 236 — and the stage grows in the reader's view when the module arrives. The cloak gives each element whose
// height its tokens give that height before it is defined (a control's container, a field's label, control and
// supporting rows), and takes out of the page an element that draws in the top layer: the room is the drawn room at
// any width, in any language and direction, read from the same tokens the element draws with. It is the package's own
// stylesheet, so it follows the components as they change, and the package's own test holds every fixture of every
// element it holds to the height the element is drawn at (packages/web/src/fouce.test.ts).
//
// Scoped to the stages, and to nothing else of the page: the cloak hides an element that is never defined, and the
// frame's own elements (the header's, the search's, the Appearance panel's) are drawn before they are defined by
// stand-ins of their own, which a page without script still reads. A stage already hides what it holds until it is
// defined (components/visuals/Example.astro), so the cloak takes nothing away from a page without script.
//
// Served as `virtual:tanrei-docs/stage-cloak.css`, imported by the frame of every stage (Example.astro): the package's
// stylesheet with its one layer, `tanrei.components`, made the docs' layer `docs.cloak`, its rules within
// `@scope ([data-example-stage])`. A stylesheet of another shape is refused, so the build fails rather than ship a cloak
// that holds nothing.
import fs from 'node:fs';
import { createRequire } from 'node:module';

/** The virtual module's name, as the frame imports it, and the id it is resolved to (a stylesheet's, so that Vite's CSS pipeline takes it). */
export const STAGE_CLOAK = 'virtual:tanrei-docs/stage-cloak.css';
const RESOLVED = '/@tanrei-docs/stage-cloak.css';

/** What the stage is, as the frame marks it (components/visuals/Example.astro). */
export const STAGE = '[data-example-stage]';
/** The layer the docs load the cloak into: after Starlight's, as every stylesheet of the package the docs load (styles/prose.css). */
export const LAYER = 'docs.cloak';

const OPEN = '@layer tanrei.components {';

/**
 * The cloak scoped to the stages: its one layer renamed, and its rules within `@scope (<stage>)`.
 * @param {string} css  the built `@tanrei/web/cloak.css`
 * @returns {string}
 */
export function stageCloak(css, stage = STAGE, layer = LAYER) {
  const code = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const at = code.indexOf(OPEN);
  if (at < 0 || code.indexOf(OPEN, at + 1) >= 0) throw new Error(`${STAGE_CLOAK}: @tanrei/web/cloak.css is expected to hold its rules in one "${OPEN}"`);
  if (code.slice(0, at).trim()) throw new Error(`${STAGE_CLOAK}: @tanrei/web/cloak.css has something before its layer: ${code.slice(0, at).trim().slice(0, 80)}`);
  // The layer's block is the rest of the stylesheet: its closing brace is the last one.
  let depth = 0;
  let close = -1;
  for (let index = at + OPEN.length - 1; index < code.length; index++) {
    if (code[index] === '{') depth++;
    else if (code[index] === '}' && --depth === 0) {
      close = index;
      break;
    }
  }
  if (close < 0 || code.slice(close + 1).trim()) throw new Error(`${STAGE_CLOAK}: @tanrei/web/cloak.css is expected to be its one layer and nothing after it`);
  const body = code.slice(at + OPEN.length, close);
  if (!/:not\(:defined\)/.test(body)) throw new Error(`${STAGE_CLOAK}: @tanrei/web/cloak.css holds no element before it is defined`);
  return `@layer ${layer} {\n@scope (${stage}) {${body}}\n}\n`;
}

/** The Vite plugin that serves `virtual:tanrei-docs/stage-cloak.css` from the installed `@tanrei/web`. */
export function stageCloakPlugin() {
  const file = createRequire(import.meta.url).resolve('@tanrei/web/cloak.css');
  return {
    name: 'tanrei-docs:stage-cloak',
    resolveId(source) {
      return source === STAGE_CLOAK ? RESOLVED : undefined;
    },
    load(id) {
      if (id !== RESOLVED) return undefined;
      this.addWatchFile(file);
      return stageCloak(fs.readFileSync(file, 'utf8'));
    },
  };
}
