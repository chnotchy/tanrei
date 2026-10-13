// Shared Playwright harness: mounts components from spec fixtures so tests are
// driven by specs/*.spec.json rather than by hand-written markup.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Locator, Page } from '@playwright/test';
import { resolveFrom, source } from '../../tools/src/from.js';
import { fixturePicture } from './pictures.ts';
import { linkCardToHtml } from '../src/links/index.ts';
import { buildSync } from 'esbuild';
import { specimenHtml, specimenInline, specimenMarkdown } from './specimen.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '..');
const repo = path.resolve(pkg, '../..');

type Props = Record<string, string | boolean | number | string[]>;
type PropDecl = { name: string; type: string; default?: unknown; /** The member's prop this one is (`"<member>.<prop>"`), kept by `resolveFrom`. */ from?: string };
/** One item of a fixture: its kind, its props, its text or glyph, and — for a group kind — its own items. */
export interface FixtureItem {
  kind: string;
  props: Props;
  content?: string;
  items?: FixtureItem[];
  /** The named slots of the item's own component that it fills (a Field's select or combobox with a leading glyph), as a fixture's `slots`. */
  slots?: Record<string, string | string[]>;
}
export interface Fixture {
  id: string;
  props: Props;
  content?: string;
  items?: FixtureItem[];
  /** The named slots it fills: a string, or several, each drawn as the slot's `fixture` kind says. */
  slots?: Record<string, string | string[]>;
  /**
   * The layout direction it is drawn in: `dir` on its stage — an ancestor of the
   * component, which has no direction prop. Left out, the stage carries no `dir` and takes the document's.
   */
  direction?: 'ltr' | 'rtl';
  /** The color role its stage is painted in (`surface-container-highest` for a filled card); left out, the stage's own surface. */
  surface?: string;
  /** The fixture of a member that is the same thing made by hand, one level down: `"<member>.<fixture id>"`. */
  twin?: string;
}
/** What a fixture's string in a slot becomes. */
type SlotFixture = 'glyph' | 'icon-only-button' | 'button' | 'text';
export interface Spec {
  name: string;
  /** The members of a composed component. */
  builtFrom?: string[];
  props?: PropDecl[];
  items?: { name: string; component?: string; container?: boolean; props: PropDecl[]; slots?: { name: string }[] }[];
  slots?: { name: string; fixture?: SlotFixture }[] | null;
  fixtures: Fixture[];
  behavior: { id: string; text: string }[];
  platforms: { web: { name: string; props?: Record<string, string>; items?: Record<string, { name: string; props?: Record<string, string> }> } };
}

const specFile = (name: string) => path.join(repo, `specs/${name}.spec.json`);
const writtenSpec = (name: string): Spec => JSON.parse(fs.readFileSync(specFile(name), 'utf8'));
/** Every spec by its name, read when it is first asked for: what `resolveFrom` looks a member up in. */
const SPECS = { get: (name: string): Spec | undefined => (fs.existsSync(specFile(name)) ? writtenSpec(name) : undefined) };

/**
 * A spec as everything here reads it: **resolved** (`resolveFrom`, packages/tools/src/from.js). A prop, an event or a
 * slot that a composed component takes from a member (`from`) is written once, in the member's spec, and
 * has no type as written: resolved, it is the member's own entry under the composed component's name, with `from`
 * kept. The suites, the review gallery and the staging below all read a spec through this.
 */
export const loadSpec = (name: string): Spec => resolveFrom(writtenSpec(name), SPECS) as Spec;

/**
 * The fixture one level down that a composed component's fixture is the same thing as (`twin`: `"<member>.<fixture
 * id>"`): the member's spec and that fixture of it. Undefined for a fixture that names none.
 */
export function twinOf(fixture: Fixture): { spec: Spec; fixture: Fixture } | undefined {
  if (!fixture.twin) return undefined;
  const { component, name } = source(fixture.twin) as { component: string; name: string };
  const spec = loadSpec(component);
  const twin = spec.fixtures.find((f) => f.id === name);
  if (!twin) throw new Error(`the twin ${fixture.twin} is not a fixture of ${component}`);
  return { spec, fixture: twin };
}

/**
 * A component as the suites that run over EVERY component see it (presets, per-scheme paints): its spec — which gives
 * the tag and the fixtures — and the fixtures those suites draw. The next component adds one `subject(…)` line there.
 */
export interface Subject {
  spec: Spec;
  fixtures: Fixture[];
  /** Its fixtures draw glyphs of the icon set: mount them with the icon faces (`mountFixtures(…, { icons: true })`). */
  icons: boolean;
  /** Its fixtures move: mount them with reduced motion requested, so a baseline is the still form (LDG-4, PRG-7). */
  reducedMotion: boolean;
  /**
   * Its baseline is one fixture alone in a window of this size (an overlay placed against the window: a tooltip's
   * 320 × 200 stage), rather than a stage among the others.
   */
  window?: { width: number; height: number };
  /** Its baseline is the whole window, not the fixture's stage (a modal dialog and its scrim are in the top layer). */
  wholeWindow?: boolean;
  /** Its baseline fixture is mounted alone, in its stage (another fixture would cover it: a modal drawer's). */
  alone?: boolean;
  /**
   * Axe checks each of its fixtures alone, each standing for a whole window: two of its fixtures on one page would be two
   * landmarks of one role and name (two standard side sheets both named "Filters"), which no product page has.
   */
  axeEach?: boolean;
}
export function subject(
  name: string,
  pick: (fixture: Fixture) => boolean = () => true,
  {
    icons = false,
    reducedMotion = false,
    window,
    wholeWindow,
    alone,
    axeEach,
  }: { icons?: boolean; reducedMotion?: boolean; window?: { width: number; height: number }; wholeWindow?: boolean; alone?: boolean; axeEach?: boolean } = {},
): Subject {
  const spec = loadSpec(name);
  return {
    spec,
    fixtures: spec.fixtures.filter(pick),
    icons,
    reducedMotion,
    ...(window ? { window } : {}),
    ...(wholeWindow ? { wholeWindow } : {}),
    ...(alone ? { alone } : {}),
    ...(axeEach ? { axeEach } : {}),
  };
}

/** The window a date-time picker fixture is drawn in (DTM-1's verify): 480 × 720, or 800 × 640 for a horizontal layout. */
export const pickerWindow = (fixture: Fixture) => (fixture.props.layout === 'horizontal' ? { width: 800, height: 640 } : { width: 480, height: 720 });

/**
 * The window a dialog fixture is drawn in (DLG-7's verify): 640 × 640, which is not compact under the default system,
 * and 360 × 640, which is, for a fixture whose id starts with `compact` (DLG-17).
 */
export const dialogWindow = (id: string) => (id.startsWith('compact') ? { width: 360, height: 640 } : { width: 640, height: 640 });

/**
 * The window a navigation drawer fixture is drawn in when it is drawn alone: 480 × 640, and for the three responsive
 * fixtures the width NVD-53's verify names — `responsive-wide` 1280, `responsive-medium` 800, `responsive-narrow` 400 —
 * because a responsive drawer is what the window's width makes it. (A fixture cannot state its window.)
 */
export const DRAWER_WINDOW_WIDTHS: Record<string, number> = { 'responsive-wide': 1280, 'responsive-medium': 800, 'responsive-narrow': 400 };
export const drawerWindow = (id: string) => ({ width: DRAWER_WINDOW_WIDTHS[id] ?? 480, height: 640 });

/**
 * The frame two of the navigation drawer's fixtures are drawn in: 800 high (NVD-57's verify), where the others' is 560.
 * A fixture cannot state the size of its stage either, so the two ids are named here.
 */
export const DRAWER_STAGE_HEIGHTS: Record<string, number> = { 'site-sidebar-long': 800, 'site-sidebar-restored': 800 };

/**
 * The window an app shell fixture is drawn alone in (APS-2's verify): 1280 × 800 for a fixture whose id begins with
 * `expanded`, 800 × 800 for `medium`, 400 × 800 for `compact`, and 320 × 640 for `compact-narrowest` — the frame reads
 * the window's width and nothing else. (A fixture cannot state its window.)
 */
export const appShellWindow = (id: string) =>
  id === 'compact-narrowest' ? { width: 320, height: 640 } : id.startsWith('expanded') ? { width: 1280, height: 800 } : id.startsWith('medium') ? { width: 800, height: 800 } : { width: 400, height: 800 };

/**
 * The element a fixture mounted: the component's tag inside `[data-fixture="<id>"]` (see `mountFixtures`) — or, for a
 * spec that is not an element on the web (prose is a class), the element that carries its class.
 */
export const fixtureHost = (page: Page, spec: Spec, id: string): Locator =>
  page.locator(`[data-fixture="${id}"] ${STAGING[spec.name]?.element ? `.${spec.platforms.web.name}` : fixtureTag(spec, id)}`);
/** The tag of a fixture's element: the spec's web name, or the one its staging names for that fixture (`Staging.tag`). */
const fixtureTag = (spec: Spec, id: string): string => {
  const fixture = spec.fixtures.find((f) => f.id === id);
  return (fixture && STAGING[spec.name]?.tag?.(fixture)) || spec.platforms.web.name;
};

/** The chip's `input-avatar` fixture image: one neutral grey pixel (React Native's is the same one). */
const FIXTURE_AVATAR = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGOYN28eAAO4AdvqohIbAAAAAElFTkSuQmCC';

const read = (file: string) => fs.readFileSync(path.join(pkg, file), 'utf8');

/** The shared neutral picture of the avatar's fixtures (test/fixtures/avatar.png: flat shapes, no person), as a data URL. */
export const avatarPicture = () => `data:image/png;base64,${fs.readFileSync(path.join(pkg, 'test/fixtures/avatar.png')).toString('base64')}`;

function fontFace() {
  // A real font, embedded, so text renders the same on every machine.
  const dir = path.join(pkg, 'node_modules/@fontsource-variable/inter/files');
  const file = fs.readdirSync(dir).find((f) => f.includes('latin-wght-normal') && f.endsWith('.woff2'));
  if (!file) throw new Error('Inter variable font not found; run pnpm install');
  const data = fs.readFileSync(path.join(dir, file)).toString('base64');
  return `@font-face{font-family:"Inter";font-weight:100 900;src:url(data:font/woff2;base64,${data}) format("woff2");}`;
}

const registered = new Map<string, Promise<string>>();
/**
 * @font-face rules for families a PRESET names (m3-like: Roboto, Material Symbols Outlined), embedded, from the
 * development-only @fontsource packages — the same registration our sites use (packages/tools/src/font-faces.js).
 * The default fixtures do not use it: their baselines are drawn with `fontFace()` above and must not move.
 */
export function presetFontFaces(families: string[]): Promise<string> {
  const key = families.join('|');
  if (!registered.has(key)) {
    registered.set(key, (async () => {
      const { fontFacesCss } = await import('../../tools/src/font-faces.js');
      return fontFacesCss(path.join(pkg, 'fonts.css'), pkg, { families, embed: true, subsets: ['latin'] }) as string;
    })());
  }
  return registered.get(key)!;
}

/**
 * The icon families the mounted system names (`--tanrei-ref-typeface-icon` in its sheet — a system sheet carries every
 * token — else in the default's), kept to the families this repository can register (Material Symbols Rounded for the
 * default and cupertino, Outlined for m3-like). A family it cannot register — acme's static Material Icons — is left
 * to fall back, as it would on a machine without it.
 */
export async function iconFamilies(defaultCss: string, systemCss: string): Promise<string[]> {
  const { FONT_PACKAGES } = await import('../../tools/src/font-faces.js');
  const declared = (css: string) => [...css.matchAll(/--tanrei-ref-typeface-icon:\s*([^;]+);/g)].flatMap((m) => m[1].split(',').map((f) => f.trim().replace(/^["']|["']$/g, '')));
  const named = declared(systemCss).length ? declared(systemCss) : declared(defaultCss);
  return [...new Set(named)].filter((family) => family in FONT_PACKAGES).sort();
}

/**
 * The @font-face rules for the text families a PRESET names first (`--tanrei-ref-typeface-brand` / `-plain` / `-mono`
 * in its sheet) that this repository can register — Roboto and Roboto Mono for m3-like and m3-expressive-like. Without
 * them a preset's text is drawn in whatever the machine has: a Mac with Roboto installed drew m3-like's labels in Roboto
 * 500, the Linux CI image (which has no Roboto) in a fallback of another width and weight. Inter is `fontFace()`'s, and
 * a family this repository cannot ship (cupertino's -apple-system) is left to fall back, as on a machine without it.
 */
async function presetTextFontFaces(systemCss: string): Promise<string> {
  const { FONT_PACKAGES } = await import('../../tools/src/font-faces.js');
  const first = [...systemCss.matchAll(/--tanrei-ref-typeface-(?:brand|plain|mono):\s*([^;]+);/g)].map((m) => m[1].split(',')[0].trim().replace(/^["']|["']$/g, ''));
  const families = [...new Set(first)].filter((family) => family in FONT_PACKAGES && family !== 'Inter').sort();
  return families.length ? presetFontFaces(families) : '';
}

let acme: Promise<string> | undefined;
/**
 * The stylesheet of the `acme` fixture system (packages/tokens-build/test/fixtures/acme.system.json), built the way a
 * product builds its own layer. It extends the vocabulary, chooses `focus-style: glow`, draws a static icon
 * set, and gives hovered, focused and pressed three different strengths — which is what makes BTN-3 observable.
 * Mount it with `mountFixtures(page, spec, { system: 'acme', systemCss: await acmeSystemCss() })`.
 */
export function acmeSystemCss(): Promise<string> {
  acme ??= (async () => {
    const { buildProductSystem } = await import('@tanrei/tokens-build/product');
    const layerFile = path.join(repo, 'packages/tokens-build/test/fixtures/acme.system.json');
    return (await buildProductSystem({ layerFile, targets: ['web'] })).files.web['acme.css'] as string;
  })();
  return acme;
}

/**
 * A fixture's props as the element's attributes: a spec prop is the web's name for it (`platforms.web.props`: a radio
 * button's `selected` is `checked`), a camelCase prop is its kebab-case attribute (`valueText` → `value-text`), `true`
 * is the bare attribute, and `false` is no attribute — except for a boolean whose default is true (a divider's
 * `decorative`), which only `name="false"` can turn off.
 */
function attributes(declared: PropDecl[] | undefined, web: Record<string, string> | undefined, props: Props) {
  const defaultsTrue = new Set((declared ?? []).filter((p) => p.type === 'boolean' && p.default === true).map((p) => p.name));
  // A list of strings (`values`) is a JSON array; every value is escaped for a double-quoted attribute.
  const text = (v: Props[string]) => (Array.isArray(v) ? JSON.stringify(v) : String(v)).replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  return Object.entries(props)
    .filter(([k, v]) => v !== false || defaultsTrue.has(k))
    .map(([k, v]) => [web?.[k] ?? k, v] as const)
    .map(([k, v]) => [k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`), v] as const)
    .map(([k, v]) => (v === true ? k : `${k}="${text(v)}"`))
    .join(' ');
}

/**
 * A Button kind's declared defaults that differ from Button's own, so the item draws as the kind says. An empty default
 * is "unset" (a dialog's action takes the dialog's variant, DLG-20), so it writes no attribute.
 */
function buttonDefaults(declared: PropDecl[]): Props {
  const own = new Map((loadSpec('button').props ?? []).map((p) => [p.name, p.default]));
  return Object.fromEntries(declared.filter((p) => p.default !== undefined && p.default !== '' && own.has(p.name) && own.get(p.name) !== p.default).map((p) => [p.name, p.default as Props[string]]));
}

/**
 * A fixture's items as the web's child elements: each kind's element (`platforms.web.items.<kind>.name`) with
 * its props as attributes, a group kind holding its own items, and the item's content staged as the component says.
 */
function itemsMarkup(spec: Spec, items: FixtureItem[], staging: Staging): string {
  return items
    .map((item) => {
      const kind = spec.items?.find((k) => k.name === item.kind);
      const web = spec.platforms.web.items?.[item.kind];
      if (!kind || !web) throw new Error(`${spec.name}: item kind "${item.kind}" is not declared or not mapped for the web`);
      const given = staging.itemProps ? staging.itemProps(item.props, item) : item.props;
      // A kind that is a Button takes its glyph in the icon slot: from its `icon` prop, or — for a kind whose
      // only slot is the icon — from its content. Props it leaves unset take the kind's defaults where they differ from
      // Button's own (an icon action's `text` variant); an icon-only kind that declares no variant is a text Button.
      const isButton = kind.component === 'button';
      const iconOnlyKind = isButton && !!kind.slots?.length && kind.slots.every((slot) => slot.name === 'icon');
      const textByDefault = iconOnlyKind && !kind.props.some((p) => p.name === 'variant') ? { variant: 'text' } : {};
      const { icon, ...buttonProps } = isButton ? { ...textByDefault, ...buttonDefaults(kind.props), ...given } : { icon: undefined };
      // A kind that is another component whose web mapping puts `icon` in a slot (a tag group's tag and chip:
      // `"icon": "slot=\"icon\""`) takes the glyph there too, and no attribute for it.
      const slotted = !isButton && typeof given.icon === 'string' && /^slot=/.test(web.props?.icon ?? '');
      const { icon: slottedIcon, ...unslotted } = slotted ? given : { icon: undefined };
      const props = isButton ? buttonProps : slotted ? unslotted : given;
      const glyph = iconOnlyKind ? (item.content ?? '') : typeof icon === 'string' ? icon : slotted ? String(slottedIcon) : '';
      const content = staging.itemContent ? staging.itemContent(item) : iconOnlyKind ? '' : (item.content ?? '');
      // An item of a kind that is another component may hold that component's own items and fill its slots (a Field's
      // select or combobox holds its options and its leading glyph): they are written as that component's own fixtures write them.
      const member = kind.component && ((item.items?.length && !spec.items?.some((k) => k.name === item.items![0].kind)) || item.slots) ? loadSpec(kind.component) : null;
      const nested = item.items ? itemsMarkup(member ?? spec, item.items, member ? (STAGING[member.name] ?? {}) : staging) : '';
      const inner = `${nested}${member && item.slots ? slotsMarkup(member, item.slots) : ''}${glyph ? `<span slot="icon">${glyph}</span>` : ''}${content}`;
      const extra = staging.itemAttributes ? ` ${staging.itemAttributes(item)}` : '';
      return `<${web.name} ${attributes(kind.props, web.props, props)}${extra}>${inner}</${web.name}>`;
    })
    .join('');
}

/**
 * A fixture's named slots as the web's slotted children, in the order the fixture lists them: a `glyph` is
 * the glyph's ligature text in the slot (the component draws it with its icon helper), an `icon-only-button` an
 * icon-only text `<tanrei-button>` showing and labelled by the glyph, a `button` a text `<tanrei-button>` with that label, and
 * `text` plain text in the slot's inherited style.
 */
function slotsMarkup(spec: Spec, slots: Fixture['slots']): string {
  const escape = (v: string) => v.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
  return Object.entries(slots ?? {})
    .flatMap(([name, value]) => {
      const kind = spec.slots?.find((slot) => slot.name === name)?.fixture;
      if (!kind) throw new Error(`${spec.name}: the slot "${name}" is not declared, or declares no fixture kind`);
      return (Array.isArray(value) ? value : [value]).map((v) => {
        const text = escape(v);
        if (kind === 'icon-only-button') return `<tanrei-button variant="text" slot="${name}" label="${text}"><span slot="icon">${text}</span></tanrei-button>`;
        if (kind === 'button') return `<tanrei-button slot="${name}" variant="text">${text}</tanrei-button>`;
        return `<span slot="${name}">${text}</span>`;
      });
    })
    .join('');
}

/** The words a spec gives the named text props as their defaults, as fixture props: none for a default that is empty. */
function specWords(name: string, props: string[]): Props {
  const declared = loadSpec(name).props ?? [];
  return Object.fromEntries(props.map((prop) => [prop, declared.find((p) => p.name === prop)?.default]).filter(([, word]) => typeof word === 'string' && word !== '')) as Props;
}

/**
 * A text input's props as its attributes, where they are not `name="value"`: `readOnly` and `maxLength` keep HTML's
 * attribute names on the web (`readonly`, `maxlength`), and `wrap`, a boolean that defaults to true, is the inverse
 * attribute (`no-wrap`). The same for the text input, for the text field that forwards them, and for a text input
 * that is the item of a Field's fixture.
 */
const textInputProps = ({ readOnly, maxLength, wrap, ...props }: Fixture['props']): Fixture['props'] => ({
  ...props,
  ...(readOnly !== undefined ? { readonly: readOnly } : {}),
  ...(maxLength !== undefined ? { maxlength: maxLength } : {}),
  ...(wrap === false ? { noWrap: true } : {}),
});
/**
 * A select's props as its attributes, where they are not `name="value"`: `readOnly` keeps HTML's attribute name on the
 * web (`readonly`), and an open fixture draws its list in place (the `inline` test attribute) unless a test's own
 * fixture says `inline: false` for the real overlay. The same for the select, for the select field that forwards them,
 * and for a select that is the item of a Field's fixture.
 */
const selectProps = ({ readOnly, inline, ...props }: Fixture['props']): Fixture['props'] => ({
  ...props,
  ...(readOnly !== undefined ? { readonly: readOnly } : {}),
  ...(props.open && inline !== false ? { inline: true } : {}),
});
/** A text input's icons, which a spec names in `content` as `leading-icon=<glyph> trailing-icon=<glyph>`: each a glyph of the system's icon set in that slot. */
const textInputIcons = (content: string) =>
  content
    .split(/\s+/)
    .filter(Boolean)
    .map((pair) => pair.split('='))
    .map(([slot, glyph]) => `<span slot="${slot}">${glyph}</span>`)
    .join('');

/**
 * The entries of a Field's item of the kind `text-input` (`entries`, `entryRemoveLabel` — what the
 * Field's fixture reads from the item, and no props of the Text input), as a product writes them by hand: one small
 * input `<tanrei-chip>` for each in the Text input's `entries` slot, named by the entry, its remove action by the
 * sentence with `{entry}` filled — and without its remove action while the input is read-only.
 */
const entryChips = (props: Props): string => {
  const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  const entries = Array.isArray(props.entries) ? props.entries.map(String) : [];
  const removeLabel = String(props.entryRemoveLabel ?? '');
  return entries.map((entry) => `<tanrei-chip slot="entries" kind="input" size="small" label="${escape(entry)}" remove-label="${escape(removeLabel.replaceAll('{entry}', entry))}"${props.readOnly ? ' not-removable' : ''}></tanrei-chip>`).join('');
};
/** The same item's props without the two the Field's fixture reads itself. */
const withoutEntries = ({ entries: _entries, entryRemoveLabel: _entryRemoveLabel, ...props }: Props): Props => props;
/**
 * A number input's props that are other attributes on the web — of a number input, of a number field, and of the
 * Field's `number-input` item, the twin of a number field's fixture: `readOnly` keeps HTML's attribute name
 * (`readonly`), and `steppers`, a boolean that defaults to true, is the inverse attribute (`no-steppers`).
 */
const numberInputProps = ({ readOnly, steppers, ...props }: Fixture['props']): Fixture['props'] => ({ ...props, ...(readOnly !== undefined ? { readonly: readOnly } : {}), ...(steppers === false ? { noSteppers: true } : {}) });

/** The custom properties of the one set of tokens every input box is drawn from, `comp.input-box`. */
export const INPUT_BOX = '--tanrei-comp-input-box-';
/** The five components that draw their box from that set, and the names each keeps under its own prefix for what it alone draws. */
const INPUT_BOX_READERS: Readonly<Record<string, RegExp>> = {
  'text-input': /^(?:entries-|motion-resize-|code-|resize-grip-|segment-)|-resize-grip-color$/,
  select: /^(?:list-|option-|group-|divider-|separation|motion-(?:feedback|open|close)-|pressed-opacity$)|-(?:selected-)?option-/,
  combobox: /^(?:list-|option-|group-|divider-|separation|status-|container-action-gap|motion-(?:feedback|open|close)-|pressed-opacity$)|-(?:selected-)?option-/,
  'number-input': /^(?:stepper-|motion-repeat-)/,
  'color-input': /^swatch-(?:shape|outline-)/,
};
/**
 * The custom property a name of one of the five input controls is read from (TXI-68, SEL-65, CMB-63, NMI-47, CLI-45):
 * the component's own family for what it alone draws, the box's for everything else. A name the rows of a select's or
 * a combobox's list keep beside the box (`motion-state-*`, `<state>-opacity`) is the BOX's here; a test of the rows
 * reads the component's own family by name (`inputBoxOwn`).
 */
export const inputBoxToken = (component: keyof typeof INPUT_BOX_READERS & string) => (name: string): string =>
  INPUT_BOX_READERS[component]!.test(name) ? `--tanrei-comp-${component}-${name}` : INPUT_BOX + name;
/** A component's own family, whatever the name: the rows of a list read `motion-state-*` and `<state>-opacity` from it. */
export const inputBoxOwn = (component: string) => (name: string): string => `--tanrei-comp-${component}-${name}`;
/** The names a reader's own family may share with the box: the rows of a list change state over them and are faded by them. */
export const INPUT_BOX_ROWS_ALSO = ['motion-state-duration', 'motion-state-easing', 'hovered-opacity', 'focused-opacity', 'disabled-opacity'] as const;

/**
 * What a reader of the box still declares under its own family that the box declares too, in the default system's
 * sheet and in each preset's (`dist/tokens.css`, `dist/systems/*.css`): nothing, but the names the rows of a list keep.
 * A copy of the box cannot come back under a component's own name without being listed here.
 */
export function inputBoxCopies(sheets: readonly string[], component: string): string[] {
  const own = `--tanrei-comp-${component}-`;
  const copies: string[] = [];
  for (const sheet of sheets) {
    const box = new Set([...sheet.matchAll(/--tanrei-comp-input-box-([a-z0-9-]+)(?=:)/g)].map((m) => m[1]!));
    for (const [, tail] of sheet.matchAll(new RegExp(`${own}([a-z0-9-]+)(?=:)`, 'g'))) if (box.has(tail!) && !(INPUT_BOX_ROWS_ALSO as readonly string[]).includes(tail!)) copies.push(tail!);
  }
  return [...new Set(copies)].sort();
}

/**
 * TXI-68, SEL-65, CMB-63, NMI-47, CLI-45: one box is set apart by a custom property of the box on its element, and
 * every box of a subtree by the same property on an ancestor — nothing but the cascade. Draws two elements of `tag`
 * in one parent on the loaded page and returns the top-left corner radius of each one's container: at rest, with
 * `--tanrei-comp-input-box-container-shape: 0px` on the first, and with it on their parent. `inner` is the member
 * that draws the box where `tag` is composed around it (a select field's select).
 */
export async function inputBoxSetApart(page: Page, tag: string, inner?: string): Promise<{ rest: number[]; one: number[]; both: number[] }> {
  return page.evaluate(
    async ([name, member, property]) => {
      const parent = document.createElement('div');
      const pair = [0, 1].map(() => parent.appendChild(document.createElement(name!)));
      document.body.append(parent);
      const settled = async () => {
        for (const element of pair) {
          await (element as HTMLElement & { updateComplete?: Promise<unknown> }).updateComplete;
          await (member ? (element.shadowRoot!.querySelector(member) as HTMLElement & { updateComplete?: Promise<unknown> }) : element).updateComplete;
        }
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      };
      const radii = () =>
        pair.map((element) => {
          const root = member ? element.shadowRoot!.querySelector(member)!.shadowRoot! : element.shadowRoot!;
          return parseFloat(getComputedStyle(root.querySelector('.container')!).borderTopLeftRadius);
        });
      await settled();
      const rest = radii();
      pair[0]!.style.setProperty(property!, '0px');
      await settled();
      const one = radii();
      pair[0]!.style.removeProperty(property!);
      parent.style.setProperty(property!, '0px');
      await settled();
      const both = radii();
      parent.remove();
      return { rest, one, both };
    },
    [tag, inner ?? null, `${INPUT_BOX}container-shape`] as const,
  );
}

/**
 * A combobox's props as its attributes, where they are not `name="value"`: `readOnly` keeps HTML's attribute name on
 * the web (`readonly`), `chevron`, a boolean that defaults to true, is the inverse attribute (`no-chevron`), and an
 * open fixture draws its list in place (`inline`) unless it says `inline: false`. The same for the combobox, for the
 * combobox field that forwards them, and for a combobox that is the item of a Field's fixture.
 */
function comboboxProps({ readOnly, inline, chevron, ...props }: Props): Props {
  return {
    ...props,
    ...(readOnly !== undefined ? { readonly: readOnly } : {}),
    ...(chevron === false ? { noChevron: true } : {}),
    ...(props.open && inline !== false ? { inline: true } : {}),
  };
}

/** The stage of an open combobox whose list is drawn in place: it stands for the window, 440 high. `element` is the stage's child that is, or holds, the combobox. */
const COMBOBOX_OPEN_STAGE = (element: string) => `.stage:has(> ${element}[open][inline]) { position: relative; block-size: 440px; }`;

/** The language a field's or a field group's fixture is written in, on its element: `ja` by its id, Arabic or Hebrew by its letters. */
function framedLanguage(element: string, fixture: Fixture, tag: string): string {
  const text = JSON.stringify(fixture);
  const lang = /-ja$/.test(fixture.id) ? 'ja' : /[\u0600-\u06ff]/.test(text) ? 'ar' : /[\u0590-\u05ff]/.test(text) ? 'he' : '';
  return lang ? element.replace(`<${tag}`, `<${tag} lang="${lang}"`) : element;
}

/** A checkbox group's items with `checked` on each whose value the fixture's `value` holds: the first value, as markup says it (CKG-3). */
export function checkedItems(fixture: Fixture): FixtureItem[] {
  const held = Array.isArray(fixture.props.value) ? fixture.props.value : [];
  return (fixture.items ?? []).map((item) => (held.includes(String(item.props.value)) ? { ...item, props: { ...item.props, checked: true } } : item));
}

/**
 * How a component's fixtures are staged on the web, where the stage is not enough on its own: a component that fills
 * its container (a divider, a bar) needs a container with a size, and a badge needs an anchor element (the spec's
 * content is the anchor's icon name) and room past the anchor's corner. Keyed by the spec's name; one entry per
 * component that needs one. Every suite that mounts fixtures (the component's own, the presets) stages them alike.
 */
interface Staging {
  css?: () => string;
  content?: (content: string, props: Fixture['props']) => string;
  wrap?: (element: string, fixture: Fixture) => string;
  /** Spec props that the web spells differently from `name="value"` (a card's `inset: false` is the `flush` attribute). The fixture is given too, for an attribute that names something of its stage (a popover's anchor). */
  props?: (props: Fixture['props'], fixture: Fixture) => Fixture['props'];
  /** What an item of the fixture holds besides its attributes (a list item's avatar monogram). */
  itemContent?: (item: FixtureItem) => string;
  /** Attributes an item's element takes besides its props (the slot an app bar's item goes into). */
  itemAttributes?: (item: FixtureItem) => string;
  /**
   * An item's props that the web spells differently from `name="value"`, as `props` is for the fixture's own: a file
   * item's `readOnly` is the `readonly` attribute, and a text input's `readOnly`, `maxLength` and `wrap` are
   * `readonly`, `maxlength` and `no-wrap` (`textInputProps`). The item is given too, for a hook that looks at its kind.
   */
  itemProps?: (props: Props, item: FixtureItem) => Props;
  /**
   * The fixture's element, where a spec is more than one element on the web: an avatar with members is the group
   * element (`tanrei-avatar-group`), around members that are the spec's own element. Left out, the spec's web name.
   */
  tag?: (fixture: Fixture) => string;
  /** What the element holds, in place of its items' elements: a code block's `<pre><code>`, its runs inside the `<code>`. */
  children?: (fixture: Fixture) => string;
  /**
   * The fixture's whole element, for a spec that is not a custom element on the web: a foundation (prose)
   * is a class on the product's element, so there is no tag to write and none to wait for. `attributes` are the
   * fixture's props as the spec's web mapping spells them.
   */
  element?: (fixture: Fixture, attributes: string) => string;
  /**
   * The fixture's items as the element's children, for a component whose items are not one element each inside it: a
   * table's columns, rows and cells are the sections, rows and cells of a native table (`tableMarkup`).
   */
  items?: (spec: Spec, fixture: Fixture) => string;
  /**
   * The fixture is a page's frame (the app shell): it holds the page's own `main`, so the document holds its stages in
   * a `div` and not in a `main` of the harness's, and a stage has no padding — the frame is the window's.
   */
  page?: boolean;
  /**
   * The fixtures whose items are not written as child elements, because a step in script stages them (`after`): a file
   * upload that keeps its own files would report rows the product gave it (FUP-42).
   */
  itemsInScript?: (fixture: Fixture) => boolean;
  /**
   * A step in script, for a fixture that markup cannot hold — a kept file is a handle and no attribute (FUP-31). The
   * fixture format has no field that asks for one, so the mark is
   * the component's own to read from the fixture. It runs in the page, once for each fixture, after the fixture's
   * element is defined, with the element and the fixture; it is written into the document as its own source, so it
   * closes over nothing. The document marks its root `data-fixtures-staged` when every step is done, and
   * `mountFixtures()` waits for the mark before anything is measured or recorded; a page that is served the document
   * (the review gallery) is staged by the same script.
   */
  after?: (element: HTMLElement, fixture: Fixture) => void | Promise<void>;
}

/** What a file upload drew of a file it keeps or refused (FUP-44, FUP-45), read from the file item it made: what a twin writes by hand. */
export interface MadeFileRow {
  name: string;
  mediaType: string;
  sizeText: string;
  status: string;
  errorText: string;
}

/**
 * A file upload's fixture as a product writes it one level down — its twin, by hand — as a stage marked
 * `data-twin-of="<the fixture's id>"` of the width the file upload's own stage has.
 *
 * Above (FUP-56): a `<tanrei-file-picker>` with the fixture's nine forwarded props, the same children in its slots, no
 * `label` and no `max-files`, and `selection-text` set to the fixture's `emptyText` where it has no row. Below it
 * (FUP-58), `list.gap` apart: the fixture's items as `<tanrei-file-item>`s with their own props and the eight the file
 * upload gives every row, and `disabled`, as a column or — of tiles — a strip that wraps, `list.item-gap` apart. While
 * `rows` is `own` the rows are the ones the file upload made (`made`: read from them, since a fixture's item there is a
 * file handed over, and whether it is kept or refused is the element's judging); a twin has no handle to give.
 *
 * The two distances are the file upload's own tokens, which a product one level down reads as it reads any token. What
 * the twin does not have is what the file upload adds: the group and its name, the list and its items, the live region.
 */
export function fileUploadTwin(fixture: Fixture, made: MadeFileRow[] = []): string {
  const [picker, item] = [loadSpec('file-picker'), loadSpec('file-item')];
  const p = fixture.props;
  const said = (props: Record<string, Props[string] | undefined>) => Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined && value !== '')) as Props;
  const own = (p.rows ?? 'own') !== 'given';
  const rows: Props[] = own ? made.map((row) => said({ ...row })) : (fixture.items ?? []).filter((each) => each.kind === 'file').map((each) => each.props);
  const forwarded = said({ layout: p.layout, multiple: p.multiple, accept: p.accept, maxSize: p.maxSize, constraintsText: p.constraintsText, dropText: p.dropText, disabled: p.disabled, error: p.error, required: p.required, ...(rows.length ? {} : { selectionText: p.emptyText }) });
  const shared = said({ form: p.itemForm, preview: p.itemPreview, fit: p.itemFit, nameHidden: p.itemNameHidden, width: p.itemWidth, height: p.itemHeight, removeLabel: p.removeLabel, retryLabel: p.retryLabel, disabled: p.disabled });
  const [pickerStaging, itemStaging] = [STAGING['file-picker']!, STAGING['file-item']!];
  const above = `<tanrei-file-picker ${attributes(picker.props, picker.platforms.web.props, pickerStaging.props!(forwarded, fixture))}>${slotsMarkup(picker, fixture.slots)}</tanrei-file-picker>`;
  const each = rows.map((row) => `<tanrei-file-item ${attributes(item.props, item.platforms.web.props, itemStaging.props!({ ...row, ...shared }, fixture))}></tanrei-file-item>`).join('');
  const arranged = p.itemForm === 'tile' ? 'flex-wrap: wrap; align-items: flex-start' : 'flex-direction: column';
  const below = rows.length ? `<div style="display: flex; ${arranged}; gap: var(--tanrei-comp-file-upload-list-item-gap); margin-block-start: var(--tanrei-comp-file-upload-list-gap)">${itemStaging.wrap!(each, fixture)}</div>` : '';
  return `<div class="stage" data-twin-of="${fixture.id}"${fixture.direction ? ` dir="${fixture.direction}"` : ''}><div style="inline-size: 360px">${above}${below}</div></div>`;
}

/**
 * The sample holder of an embedded text input (the holder's contract, H1 to H7, in the README): the product's own box around the
 * typing, as the harness, the review gallery and the component's page draw it — `.capsule`. Its declarations are the
 * holder's contract: a visible box and its padding (H1, H4), the focus indication on the box for as long as the input
 * has focus (H2: the edge is an outline drawn inside the box, so it takes no room), and both in a person's own colors
 * (H7). It is markup and a stylesheet, not a component.
 */
export const sampleHolderCss = `.capsule {
        background: var(--tanrei-sys-color-surface-container);
        border-radius: var(--tanrei-sys-shape-corner-large);
        padding: var(--tanrei-sys-space-space150) var(--tanrei-sys-space-space200);
        outline: var(--tanrei-sys-border-thick) solid transparent;
        outline-offset: calc(-1 * var(--tanrei-sys-border-thick));
        cursor: text;
      }
      .capsule:focus-within { outline-color: var(--tanrei-sys-color-focus-ring); }
      @media (forced-colors: active) {
        .capsule { outline-color: CanvasText; }
        .capsule:focus-within { outline-color: Highlight; }
      }`;

/** The root's mark that every fixture's step in script has run (`Staging.after`). */
const STAGED = 'data-fixtures-staged';

/**
 * The script of a document whose staging has a step (`Staging.after`): after the bundle — module scripts run in the
 * order they are written — it waits for the element's definition, runs the step for each stage's element in order, and
 * marks the root. Text that could end the script early is escaped.
 */
function afterScript(tag: string, fixtures: Fixture[], after: NonNullable<Staging['after']>): string {
  const literal = (value: unknown) => JSON.stringify(value).replaceAll('<', '\\u003c');
  return `<script type="module">
      const after = ${after.toString().replaceAll('</script', '<\\/script')};
      const fixtures = ${literal(Object.fromEntries(fixtures.map((f) => [f.id, f])))};
      await customElements.whenDefined(${literal(tag)});
      for (const stage of document.querySelectorAll('[data-fixture]')) {
        const element = stage.querySelector(${literal(tag)});
        if (element && fixtures[stage.dataset.fixture]) await after(element, fixtures[stage.dataset.fixture]);
      }
      document.documentElement.setAttribute(${literal('data-fixtures-staged')}, '');
    </script>`;
}

/**
 * An app shell fixture as the regions its element holds (the spec's web note): each region the fixture fills is the
 * product's own semantic element with the region's name in its `slot` attribute — the skip link a standalone Link to
 * the main region's id, the header a `<header>` with the menu button (the fixture's one item, an icon-only text
 * Button marked `data-app-shell-menu`) at its start, the navigation and the navigation bar each a `<nav>` named by its
 * text, the aside an `<aside>` on the side of the `<main>` that `asideOrder` names, the footer a `<footer>` — in the
 * order of APS-22. A fixture fills a region with text only, so each is a labelled box: `fixture-region`,
 * with the least size of what it stands for (an app bar's height, a drawer's width, a navigation bar's height). Markup
 * given by a test is used as it is.
 */
function appShellMarkup(spec: Spec, fixture: Fixture): string {
  if ((fixture.content ?? '').includes('<main')) return fixture.content ?? '';
  const escape = (v: string) => v.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
  const slot = (name: string) => {
    const value = fixture.slots?.[name];
    return value === undefined ? undefined : escape(Array.isArray(value) ? value.join(' ') : value);
  };
  const region = (name: string, tag: string, attrs = '', before = '') => (slot(name) === undefined ? '' : `<${tag} slot="${name}" class="fixture-region"${attrs}>${before}${slot(name)}</${tag}>`);
  const main = `main-${fixture.id}`;
  const menu = itemsMarkup(spec, (fixture.items ?? []).filter((item) => item.kind === 'menu-button'), { itemAttributes: () => 'data-app-shell-menu' });
  const aside = region('aside', 'aside');
  const before = fixture.props.asideOrder === 'before';
  return [
    slot('skip-link') === undefined ? '' : `<a class="tanrei-link" data-standalone slot="skip-link" href="#${main}">${slot('skip-link')}</a>`,
    region('announcement', 'div'),
    region('header', 'header', '', menu),
    region('navigation', 'nav', ` aria-label="${slot('navigation')}"`),
    before ? aside : '',
    `<main id="${main}" tabindex="-1" class="fixture-region">${fixture.content ?? ''}</main>`,
    before ? '' : aside,
    region('footer', 'footer'),
    region('navigation-bar', 'nav', ` aria-label="${slot('navigation-bar')}"`),
  ].join('');
}

/**
 * A page header fixture as the page's own elements its element holds (the spec's web note), in the order of PGH-11: the
 * `breadcrumbs` slot's text in `[data-part="breadcrumbs"]`, the eyebrow as `<p data-part="eyebrow">`, the title — the
 * `title` prop or the `title` slot — as the heading of its level (`level`, or 1, or 2 for the small size), the
 * description — prop or slot — as a `<p>`, each meta item as a `<span>` in `[data-part="meta"]`, and the `actions`
 * slot's labels as text Buttons in `[data-part="actions"]`. That is the form a content page writes, so the head is
 * drawn before the element is defined; a head built from the `headline`, `description` and `eyebrow` attributes is a
 * test's. Markup given by a test is used as it is.
 */
function pageHeaderMarkup(fixture: Fixture): string {
  if (/^\s*</.test(fixture.content ?? '')) return fixture.content ?? '';
  const escape = (v: string) => v.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
  const one = (value: string | string[] | undefined) => (value === undefined ? '' : Array.isArray(value) ? value.join(' ') : value);
  const many = (value: string | string[] | undefined) => (value === undefined ? [] : Array.isArray(value) ? value : [value]);
  const { props, slots = {} } = fixture;
  const title = one(slots.title) || String(props.title ?? '');
  const description = one(slots.description) || String(props.description ?? '');
  const level = Number(props.level) >= 1 && Number(props.level) <= 6 ? Number(props.level) : props.size === 'small' ? 2 : 1;
  return [
    slots.breadcrumbs === undefined ? '' : `<div data-part="breadcrumbs">${escape(one(slots.breadcrumbs))}</div>`,
    props.eyebrow ? `<p data-part="eyebrow">${escape(String(props.eyebrow))}</p>` : '',
    title ? `<h${level}>${escape(title)}</h${level}>` : '',
    description ? `<p>${escape(description)}</p>` : '',
    fixture.items?.length ? `<div data-part="meta">${fixture.items.map((item) => `<span>${escape(item.content ?? '')}</span>`).join('')}</div>` : '',
    slots.actions === undefined ? '' : `<div data-part="actions">${many(slots.actions).map((label) => `<tanrei-button variant="text">${escape(label)}</tanrei-button>`).join('')}</div>`,
  ].join('');
}

/**
 * A table fixture's items as the native table its element holds (the spec's web mapping; item kinds that nest two
 * deep): the fixture's `caption` as the `<caption>`, the columns as one `<thead>` row of `<th scope="col">` — no
 * `<thead>` at all where every header is empty (TBL-5) — the rows as `<tbody>` rows and the footer rows as `<tfoot>`
 * rows, a cell as a `<td>`, or as a `<th scope="row">` where it is the first of its row and `rowHeaders` is true. A
 * column's `align` and `wrap` are `data-align` and `data-wrap="false"` on its header cell and on each of its cells —
 * the form that is drawn without script. A cell's own items (a tag) are their components' elements. Markup given by a
 * test in a cell's content is used as it is.
 *
 * The data features the web has built, as the README writes them: a
 * sortable column's header cell carries `aria-sort` — its `sort`, `none` where it has none — and `data-value`, and
 * holds a `<button type="button">` around the header; the `empty` slot's text is the one cell of a `<tr
 * data-part="empty">` in the body of a fixture without body rows, in a `<div>` (what the table keeps in view is an
 * element); the fixture's `status` and its `pagination` slot's text are the `<p role="status">` and a `<span>` of a
 * `<div data-part="status">` after the table. Rows that can be chosen (`selection: multiple`): every row begins with
 * a `<td data-part="selection">` — in the header row holding a `<tanrei-checkbox label-hidden>`, which the element
 * names and keeps in step; in a body row that has a `value` holding that row's, named by its `selectLabel` and
 * `checked` where the row is `selected`; and empty in a row without a value, a placeholder row and a footer row. A
 * row's `value` is `data-value` and its `selected` is `data-selected` on the `<tr>`; a `placeholder` row is `<tr
 * data-placeholder aria-hidden="true">`.
 */
const tableNames = (spec: Spec) => spec.fixtures.map((f) => String(f.props.caption ?? f.props.label ?? ''));
/**
 * What a table fixture adds to its name on a page of fixtures: a table that scrolls is a region, a landmark, and a
 * page has one landmark of a kind per name — but several fixtures share a caption ("Visits by region"). Such a fixture
 * is named after its id as well (`Visits by region (wide)`): in its `label`, or in a part of its caption that is read
 * and not drawn, so the caption's pixels are the spec's. A name no other fixture has is left as it is.
 */
export function tableNameSuffix(spec: Spec, fixture: Fixture): string {
  const name = String(fixture.props.caption ?? fixture.props.label ?? '');
  return name && tableNames(spec).filter((other) => other === name).length > 1 ? ` (${fixture.id})` : '';
}
function tableMarkup(spec: Spec, fixture: Fixture): string {
  // A test's own table is the fixture's content, used as it is.
  if (!fixture.items) return '';
  const escape = (v: string) => (v.includes('<') ? v : v.replaceAll('&', '&amp;'));
  const items = fixture.items;
  const columns = items.filter((item) => item.kind === 'column');
  const rows = items.filter((item) => item.kind === 'row');
  const placed = (index: number) => {
    const { align, wrap } = columns[index]?.props ?? {};
    return `${align && align !== 'start' ? ` data-align="${String(align)}"` : ''}${wrap === false ? ' data-wrap="false"' : ''}`;
  };
  const chooses = fixture.props.selection === 'multiple';
  const attribute = (v: unknown) => String(v).replaceAll('&', '&amp;').replaceAll('"', '&quot;');
  /** The selection cell of a row (TBL-42): the row's checkbox where it has a value, else nothing. */
  const choice = (item: FixtureItem) => {
    if (!chooses) return '';
    const { value, selected, selectLabel, placeholder, footer } = item.props;
    if (!value || placeholder === true || footer === true) return '<td data-part="selection"></td>';
    return `<td data-part="selection"><tanrei-checkbox label-hidden${selectLabel ? ` label="${attribute(selectLabel)}"` : ''}${selected === true ? ' checked' : ''}></tanrei-checkbox></td>`;
  };
  const state = (item: FixtureItem) => {
    const { value, selected, placeholder } = item.props;
    return `${value ? ` data-value="${attribute(value)}"` : ''}${chooses && value && selected === true ? ' data-selected' : ''}${placeholder === true ? ' data-placeholder aria-hidden="true"' : ''}`;
  };
  const row = (item: FixtureItem) =>
    `<tr${state(item)}>${choice(item)}${(item.items ?? [])
      .map((cell, index) => {
        const inner = `${escape(cell.content ?? '')}${cell.items ? itemsMarkup(spec, cell.items, {}) : ''}`;
        return index === 0 && fixture.props.rowHeaders === true ? `<th scope="row"${placed(index)}>${inner}</th>` : `<td${placed(index)}>${inner}</td>`;
      })
      .join('')}</tr>`;
  const suffix = tableNameSuffix(spec, fixture);
  const caption = fixture.props.caption ? `<caption>${escape(String(fixture.props.caption))}${suffix ? `<span class="fixture-name">${suffix}</span>` : ''}</caption>` : '';
  const header = (column: FixtureItem, index: number) => {
    const text = escape(String(column.props.header ?? ''));
    if (column.props.sortable !== true || !text) return `<th scope="col"${placed(index)}>${text}</th>`;
    const value = column.props.value ? ` data-value="${escape(String(column.props.value))}"` : '';
    return `<th scope="col" aria-sort="${String(column.props.sort ?? 'none')}"${value}${placed(index)}><button type="button">${text}</button></th>`;
  };
  const all = chooses ? '<td data-part="selection"><tanrei-checkbox label-hidden></tanrei-checkbox></td>' : '';
  const head = columns.some((column) => column.props.header) ? `<thead><tr>${all}${columns.map(header).join('')}</tr></thead>` : '';
  const body = rows.filter((item) => item.props.footer !== true);
  const foot = rows.filter((item) => item.props.footer === true);
  const slot = (name: string) => [fixture.slots?.[name] ?? []].flat()[0];
  const empty = slot('empty');
  const none = empty !== undefined && !body.length ? `<tr data-part="empty"><td colspan="${columns.length + (chooses ? 1 : 0)}"><div>${escape(empty)}</div></td></tr>` : '';
  const status = String(fixture.props.status ?? '');
  const pagination = slot('pagination');
  const line =
    status || pagination !== undefined
      ? `<div data-part="status">${status ? `<p role="status">${escape(status)}</p>` : ''}${pagination === undefined ? '' : `<span>${escape(pagination)}</span>`}</div>`
      : '';
  return `<table>${caption}${head}<tbody>${body.map(row).join('')}${none}</tbody>${foot.length ? `<tfoot>${foot.map(row).join('')}</tfoot>` : ''}</table>${line}`;
}
/**
 * A description list fixture's items as the native list its element holds (the spec's web mapping): each `fact` a
 * `<div>` around a `<dt>` — its `term` — and its `<dd>`s: one for the fact's own content (an empty one for empty
 * content: DSL-11), or one for each `value` item, which holds its content or its own items (a tag) as their components'
 * elements. Markup given by a test, as a term or as a value's content, is used as it is; a test's own list is the
 * fixture's content.
 */
function descriptionListMarkup(spec: Spec, fixture: Fixture): string {
  if (!fixture.items) return '';
  const escape = (v: string) => (v.includes('<') ? v : v.replaceAll('&', '&amp;'));
  const value = (item: FixtureItem) => `<dd>${escape(item.content ?? '')}${item.items ? itemsMarkup(spec, item.items, {}) : ''}</dd>`;
  const fact = (item: FixtureItem) =>
    `<div><dt>${escape(String(item.props.term ?? ''))}</dt>${item.items ? item.items.map(value).join('') : `<dd>${escape(item.content ?? '')}</dd>`}</div>`;
  return `<dl>${fixture.items.map(fact).join('')}</dl>`;
}

/**
 * A figure fixture as the native figure its element holds (the spec's web note): a frame around the header — the
 * title as a `<p data-part="title">`, from the `title` prop or the `title` slot alike, and the `actions` slot's glyphs
 * as icon-only text Buttons — the stage, and the `attachment` slot's text; then the caption, from the `caption` prop or
 * the `caption` slot, as the `<figcaption>`. That is the form a page writes so that the figure is drawn before the
 * element is defined; `headline` and `caption` as attributes are the element's own writing of the same parts, which a
 * test covers. A fixture's content is one string that stands for what is shown: "Picture" is staged as a block with a
 * size and a fill, as a picture has, and anything else as text in the running text's style; its attachment is text that stands for the product's
 * block and is staged as a block with a fill, a padding and corners of its own. Markup given by a test is used as it is.
 */
function figureMarkup(fixture: Fixture): string {
  const escape = (v: string) => (v.includes('<') ? v : v.replaceAll('&', '&amp;'));
  const text = (v: string) => v.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
  const several = (value: string | string[] | undefined) => (value === undefined ? [] : Array.isArray(value) ? value : [value]);
  const slots = fixture.slots ?? {};
  const title = several(slots.title)[0] ?? (fixture.props.title as string | undefined);
  const caption = several(slots.caption)[0] ?? (fixture.props.caption as string | undefined);
  const actions = several(slots.actions).map((glyph) => `<tanrei-button variant="text" label="${text(glyph)}"><span slot="icon">${text(glyph)}</span></tanrei-button>`);
  const attachment = several(slots.attachment)[0];
  const header = title || actions.length ? `<header>${title ? `<p data-part="title">${escape(title)}</p>` : ''}${actions.length ? `<div data-part="actions">${actions.join('')}</div>` : ''}</header>` : '';
  const content = fixture.content ?? '';
  const shown = content.includes('<') ? content : content === 'Picture' ? '<div class="fixture-picture">Picture</div>' : `<span class="fixture-specimen">${escape(content)}</span>`;
  const joined = attachment === undefined ? '' : `<div data-part="attachment"><div class="fixture-attachment">${text(attachment)}</div></div>`;
  return `<figure><div data-part="frame">${header}<div data-part="stage">${shown}</div>${joined}</div>${caption ? `<figcaption>${escape(caption)}</figcaption>` : ''}</figure>`;
}

/**
 * An accordion fixture's items as the native `details` elements its element holds (the spec's web mapping): each item
 * a `<details>` — `open` where the item is — whose `<summary>` holds the icon as a `.tanrei-icon`, the label as its
 * text, the supporting text in a `data-supporting-text` element and the trailing text in a `data-trailing-text` one;
 * a disabled item's summary carries `aria-disabled="true"` and `tabindex="-1"`. The item's content is the text after
 * the summary — the form that is drawn without script. Markup given by a test in a label or in a content is used as
 * it is.
 */
function accordionMarkup(_spec: Spec, fixture: Fixture): string {
  // A test's own items are the fixture's content, used as it is.
  if (!fixture.items) return '';
  const escape = (v: unknown) => (String(v).includes('<') ? String(v) : String(v).replaceAll('&', '&amp;'));
  return fixture.items
    .map((item) => {
      const p = item.props;
      const icon = p.icon ? `<span class="tanrei-icon" aria-hidden="true">${String(p.icon)}</span>` : '';
      const supporting = p.supportingText ? `<span data-supporting-text>${escape(p.supportingText)}</span>` : '';
      const trailing = p.trailingText ? `<span data-trailing-text>${escape(p.trailingText)}</span>` : '';
      return `<details${p.open === true ? ' open' : ''}><summary${p.disabled === true ? ' aria-disabled="true" tabindex="-1"' : ''}>${icon}${escape(p.label ?? '')}${supporting}${trailing}</summary>${escape(item.content ?? '')}</details>`;
    })
    .join('');
}
/**
 * A table of contents fixture's items as the product's own nested list of anchors (the spec's web mapping): each item an
 * `<li>` whose first child is its anchor — `href` the anchor's attribute, the label its text — with the item's own
 * items a `<ul>` after the anchor, inside the same `<li>`. The form that is a plain list of links without script.
 */
function tableOfContentsMarkup(_spec: Spec, fixture: Fixture): string {
  // A test's own list is the fixture's content, used as it is.
  if (!fixture.items) return '';
  const escape = (v: unknown) => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
  const list = (items: FixtureItem[]): string =>
    `<ul>${items.map((item) => `<li><a href="${escape(item.props.href ?? '')}">${escape(item.props.label ?? '')}</a>${item.items?.length ? list(item.items) : ''}</li>`).join('')}</ul>`;
  return list(fixture.items);
}
/**
 * A breadcrumbs fixture's items as the product's own children of the element (the spec's web mapping): an `<a href>` for
 * a level with a destination and a `<span>` for one without, the label its text, `aria-current="page"` on the current
 * page, `data-icon` and `data-icon-only` for a glyph. The form that is a trail of links without script.
 */
function breadcrumbsMarkup(_spec: Spec, fixture: Fixture): string {
  // A test's own levels are the fixture's content, used as it is.
  if (!fixture.items) return '';
  const escape = (v: unknown) => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
  return fixture.items
    .map(({ props }) => {
      const tag = props.href ? 'a' : 'span';
      const attrs = [props.href ? ` href="${escape(props.href)}"` : '', props.current ? ' aria-current="page"' : '', props.icon ? ` data-icon="${escape(props.icon)}"` : '', props.iconOnly ? ' data-icon-only' : ''].join('');
      return `<${tag}${attrs}>${escape(props.label ?? '')}</${tag}>`;
    })
    .join('');
}

/**
 * A menubar fixture's items as the bar's children (the spec's web mapping): a `menu` is its element with its props as
 * attributes; an `item` without `href` is an action, `<tanrei-menubar-item label="…">`; an `item` with `href` is a link
 * item, the element around the product's own anchor — the label its text, `href` (none while the item is disabled),
 * `target="_blank"` for a new context and `aria-current="page"` on the anchor, `target-label` and `disabled` on the
 * element. The form whose links work without script (MBR-45).
 */
function menubarMarkup(spec: Spec, fixture: Fixture): string {
  const escape = (v: unknown) => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
  return (fixture.items ?? [])
    .map((item) => {
      const { label, href, target, targetLabel, current, disabled, ...rest } = item.props;
      if (item.kind !== 'item' || !href) return itemsMarkup(spec, [item], {});
      const tag = spec.platforms.web.items!.item.name;
      const host = attributes(undefined, undefined, { ...rest, ...(disabled ? { disabled } : {}), ...(targetLabel ? { targetLabel } : {}) });
      const anchor = [disabled ? '' : ` href="${escape(href)}"`, target === 'new' ? ' target="_blank"' : '', current ? ' aria-current="page"' : ''].join('');
      return `<${tag} ${host}><a${anchor}>${escape(label ?? '')}</a></${tag}>`;
    })
    .join('');
}

/**
 * A tree view fixture's items as the product's own nested lists (the spec's web mapping): each item an `<li>` — with
 * `data-value`, `data-open`, `data-expandable`, `data-loading` and `data-disabled` where the item has them — whose
 * first child is its row, a `<span>` holding the icon as a `.tanrei-icon`, the label in a `<bdi>` with the supporting
 * text after it in a `data-supporting-text` element, and the trailing text in a `data-trailing-text` one; the item's
 * own items are a `<ul>` after the row, inside the same `<li>`. The form that is a plain nested list without script.
 */
export function treeViewMarkup(_spec: Spec, fixture: Fixture): string {
  // A test's own lists are the fixture's content, used as it is.
  if (!fixture.items) return '';
  const escape = (v: unknown) => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
  const list = (items: FixtureItem[]): string =>
    `<ul>${items
      .map((item) => {
        const p = item.props;
        const flags = (['open', 'expandable', 'loading', 'disabled'] as const).map((name) => (p[name] === true ? ` data-${name}` : '')).join('');
        const icon = p.icon ? `<span class="tanrei-icon" aria-hidden="true">${escape(p.icon)}</span>` : '';
        const supporting = p.supportingText ? `<small data-supporting-text>${escape(p.supportingText)}</small>` : '';
        const trailing = p.trailingText ? `<span data-trailing-text>${escape(p.trailingText)}</span>` : '';
        return `<li${p.value ? ` data-value="${escape(p.value)}"` : ''}${flags}><span>${icon}<bdi>${escape(p.label ?? '')}${supporting}</bdi>${trailing}</span>${item.items?.length ? list(item.items) : ''}</li>`;
      })
      .join('')}</ul>`;
  return list(fixture.items);
}
/**
 * A page has one landmark of a kind per name; the fixtures of a navigation region are many regions on one page, all
 * named alike ("Main"). Each is named after its fixture as well (`Main (four-destinations)`), so the page is what a product's
 * page is — landmarks told apart by name — while the fixture's own name still leads.
 */
const uniqueLandmark = (element: string, f: Fixture) => element.replace(/ label="([^"]+)"/, (_, name: string) => ` label="${name} (${f.id})"`);
const STAGING: Record<string, Staging> = {
  divider: {
    css: () => `[data-fixture^='horizontal'] { inline-size: 160px; }
      [data-fixture^='vertical'] { display: flex; block-size: 48px; }`,
  },
  // An avatar with members is the group element around them (the spec's web note). A fixture names its picture as
  // `fixtures/avatar.png`, which each harness resolves to its own copy: here the shared neutral picture of
  // test/fixtures, embedded, so a page of fixtures asks the network for nothing. `fixtures/missing.png` is left as it
  // is written: it names nothing, and the avatar draws its fallback (AVT-4).
  avatar: {
    tag: (f) => (f.items ? 'tanrei-avatar-group' : 'tanrei-avatar'),
    // TODO: the fixture `group-max-rtl` is the right-to-left row of
    // AVT-20's verify and does not name its direction; until the spec does, it is drawn in a right-to-left box here.
    wrap: (element, f) => {
      const drawn = element.replaceAll('src="fixtures/avatar.png"', `src="${avatarPicture()}"`);
      return f.id === 'group-max-rtl' && !f.direction ? `<div dir="rtl">${drawn}</div>` : drawn;
    },
  },
  badge: {
    // The anchor (the spec's default slot): the glyph of the system's icon set that the content names, at sys.icon.medium
    // in on-surface-variant, named by that glyph name ("notifications"); the badge adds the fixture's label to it.
    css: () => `${read('dist/icons.css')}\n.stage { padding-inline-end: 48px; color: var(--tanrei-sys-color-on-surface-variant); }`,
    content: (content) => `<span class="tanrei-icon" data-size="medium" role="img" aria-label="${content}">${content}</span>`,
  },
  // A bottom sheet's stage is a 400 × 720 surface that stands for the window (the spec's web note): a standard sheet is
  // docked to its bottom edge (the stage is the positioned parent it covers), a modal one to the window's, in the top
  // layer. `handle: false` and `inset: false` are the `no-handle` and `flush` attributes, `dismissible: false` HTML's
  // `closedby="none"`.
  'bottom-sheet': {
    css: () => `.stage:has(> tanrei-bottom-sheet) { box-sizing: border-box; position: relative; inline-size: 400px; block-size: 720px; padding: 0; }`,
    props: ({ handle, inset, dismissible, ...props }) => ({
      ...props,
      ...(handle === false ? { noHandle: true } : {}),
      ...(inset === false ? { flush: true } : {}),
      ...(dismissible === false ? { closedby: 'none' } : {}),
    }),
  },
  'progress-indicator': {
    css: () => `[data-fixture^='linear'] { inline-size: 160px; }`,
  },
  // A loading indicator's fixture is the shown indicator from its first frame: no show delay and no entrance (LDG-11's
  // verify). A test's own fixture may name either.
  'loading-indicator': {
    props: (props) => ({ showDelay: 0, enterDuration: 0, ...props }),
  },
  // A card fills its container, as a card in a column does: the stage is a phone's column (360 wide with its padding),
  // and a text-only content is set in the body text style, the way a product's page sets it (the card itself only
  // hands its content a color, CRD-13). `inset: false` is the `flush` attribute on the web.
  card: {
    css: () => `${read('dist/text.css')}\n.stage:has(> tanrei-card) { inline-size: 328px; }`,
    content: (content) => `<div class="tanrei-text-body">${content}</div>`,
    props: ({ inset, ...props }) => (inset === false ? { ...props, flush: true } : props),
  },
  // A carousel fills a 400 × 200 stage (W 368), or 400 × 248 with its controls row (the carousel sets its own height),
  // scrolled to its start (the spec's web note). An item's content is a glyph of the system's icon set at
  // sys.icon.medium, unselected, centred in the content box, in the item's content color. `fluidWidth`, `snap` and
  // `playbackControl` default to true: their `false` is the inverse attributes `fixed-width`, `free-scroll` and
  // `no-playback-control`.
  carousel: {
    css: () => `${read('dist/icons.css')}\n.stage:has(> tanrei-carousel) { box-sizing: border-box; inline-size: 400px; padding: 0; }
      tanrei-carousel-item > .tanrei-icon { place-self: center; }`,
    props: ({ fluidWidth, snap, playbackControl, ...props }) => ({
      ...props,
      ...(fluidWidth === false ? { fixedWidth: true } : {}),
      ...(snap === false ? { freeScroll: true } : {}),
      ...(playbackControl === false ? { noPlaybackControl: true } : {}),
    }),
    // Markup given by a test is used as it is.
    itemContent: (item) =>
      !item.content ? '' : item.content.includes('<') ? item.content : `<span class="tanrei-icon" data-size="medium" aria-hidden="true">${item.content}</span>`,
  },
  // A text field is as wide as its place (TXF-62), and a stage has no width to give: it is drawn as wide as a phone
  // form's column (280) — the width its twins, the Field's `text-…` fixtures, are drawn at, so that the two are the
  // same picture. The spec names its icons in `content` (`textInputIcons`), and three of its props are
  // other attributes on the web (`textInputProps`).
  'text-field': {
    css: () => `.stage > tanrei-text-field { inline-size: 280px; }`,
    content: textInputIcons,
    props: textInputProps,
  },
  // A text input is as wide as its place too (TXI-63): the same column, so that a bare input's picture is the box of
  // the text field's fixture of the same id.
  'text-input': {
    css: () => `.stage > tanrei-text-input { inline-size: 280px; }`,
    content: textInputIcons,
    props: textInputProps,
  },
  // A main action button floats: its resting elevation (level3 in the default system) casts a shadow that reaches further
  // below the container than the stage's padding, so the stage leaves room for it — a baseline shows the whole shadow
  // (MAB-17). `extended: false` is the `collapsed` attribute on the web (an HTML boolean cannot default to true).
  'main-action-button': {
    css: () => `.stage:has(> tanrei-main-action-button) { padding-block-end: 32px; }`,
    props: ({ extended, ...props }) => (extended === false ? { ...props, collapsed: true } : props),
  },
  // A FAB menu's toggle sits at the inline-end bottom corner of a 320 × 320 stage, 16 from both edges (FBM-13's verify).
  // A fixture draws its open items in place above the toggle — the `inline` test attribute, with their elevation and
  // without open motion (as the menu's, MNU-19); a test's own fixture with `inline: false` is the real overlay instead.
  // The stages stand 32 apart, so that one toggle's shadow never reaches into the next stage's baseline.
  'fab-menu': {
    css: () => `.stage:has(> tanrei-fab-menu) { box-sizing: border-box; inline-size: 320px; block-size: 320px; margin-block-end: 32px; display: flex; align-items: flex-end; justify-content: flex-end; }`,
    props: ({ inline, ...props }) => (inline === false ? props : { ...props, inline: true }),
  },
  // A chip's content names what goes in its leading position: a glyph of the icon set (the `icon` slot), or `avatar` —
  // the shared neutral avatar image (one grey pixel, no person and no text, as React Native's) in the `avatar`
  // slot. `destructiveRemove: false` is the `no-destructive-remove` attribute.
  chip: {
    content: (content) =>
      content === 'avatar' ? `<img slot="avatar" alt="" src="${FIXTURE_AVATAR}" />` : `<span slot="icon">${content}</span>`,
    props: ({ destructiveRemove, ...props }) => (destructiveRemove === false ? { ...props, noDestructiveRemove: true } : props),
  },
  // A radio button is never alone: it is an option of a group, and a group is the options with one name in one form
  // (RAD-3). Each fixture is its own group — its own form — so that one fixture's selection does not clear another's,
  // named as a product names it (RAD-16).
  'radio-button': {
    wrap: (element, f) => `<form><div role="radiogroup" aria-label="${String(f.props.name ?? f.id)}">${element}</div></form>`,
  },
  // A list is one column 360 wide (LST-16's verify). An avatar's leading slot holds the first letter of the item's
  // headline (its monogram); an image's is empty, so it shows the media container color. A test's own item may hold
  // what a product puts in the trailing slot (a reorderable item's remove button, LST-52): its content, as written.
  list: {
    css: () => `.stage > tanrei-list { inline-size: 360px; }`,
    itemContent: (item) => `${item.props.leadingMedia === 'avatar' ? `<span slot="leading">${String(item.props.headline ?? '').slice(0, 1)}</span>` : ''}${item.content ?? ''}`,
  },
  // A menu fixture draws the open surface in place (MNU-19's verify): the `inline` test attribute, at its natural size,
  // with its elevation and without an anchor, placement or open motion — room below for the elevation's shadow.
  // A test's own fixture that names an `anchor` is the real overlay instead: a button with that id is drawn before it.
  // A snackbar is drawn in place, outside a host (SNK-19), on a 400 px wide stage (the spec's web note); room below for
  // its elevation's shadow. `expanded-scrolls` is on a 400 × 240 stage, whose height stands for the host's area (SNK-25).
  snackbar: {
    css: () => `.stage:has(> tanrei-snackbar) { box-sizing: border-box; inline-size: 400px; padding-block-end: 32px; }
      .stage[data-fixture='expanded-scrolls'] { block-size: 240px; }`,
  },
  // A calendar is drawn at its natural size, centred on a 400 × 440 stage of the surface color (CAL-1's verify).
  calendar: {
    css: () => `.stage:has(> tanrei-calendar) { box-sizing: border-box; inline-size: 400px; block-size: 440px; padding: 0; display: grid; place-items: center; }`,
  },
  // A date-time picker's fixtures (DTM-1's verify): a modal one is in the top layer over its scrim, centred in the window,
  // drawn alone in a 480 × 720 window (800 × 640 for a horizontal layout) whose baseline is the window, as a dialog's. A
  // docked one is drawn in place — the `inline` test attribute, at its natural size with its elevation, without an
  // anchor, placement or open motion — centred on a stage of that size; a test's own docked fixture with `inline: false`
  // is the real overlay instead.
  'date-time-picker': {
    css: () => `.stage:has(> tanrei-date-time-picker[presentation='docked']) { box-sizing: border-box; inline-size: 480px; block-size: 720px; padding: 0; display: grid; place-items: center; }
      .stage:has(> tanrei-date-time-picker[presentation='docked'][layout='horizontal']) { inline-size: 800px; block-size: 640px; }`,
    props: ({ inline, ...props }) => (props.presentation === 'docked' && inline !== false ? { ...props, inline: true } : inline ? { ...props, inline } : props),
    // A test's own fixture that names an `anchor` gets a button with that id before the picker.
    wrap: (element, f) => (f.props.anchor ? `<button id="${String(f.props.anchor)}" type="button">${String(f.props.anchor)}</button>${element}` : element),
  },
  // A dialog is in the top layer: its fixtures are drawn one at a time in a 640 × 640 window, and 360 × 640 for the
  // `compact-` ones (DLG-7's verify, `dialogWindow`), and the baseline is the window. Its action items are
  // `tanrei-button` children in the `actions` slot. `dismissible: false` is HTML's `closedby="none"`.
  dialog: {
    props: ({ dismissible, ...props }) => (dismissible === false ? { ...props, closedby: 'none' } : props),
    itemAttributes: () => 'slot="actions"',
  },
  // A tooltip's stage is 320 × 200 with its anchor at the centre: a medium icon-only text Button showing the fixture's
  // glyph and labelled after it (the spec's web note). Its tooltip is open, drawn in the top layer beside it.
  tooltip: {
    css: () => `.stage:has(> tanrei-tooltip) { box-sizing: border-box; inline-size: 320px; block-size: 200px; padding: 0; display: grid; place-items: center; }`,
    content: (content) => `<tanrei-button variant="text" label="${content}"><span slot="icon">${content}</span></tanrei-button>`,
    // `describes` defaults to true, so its attribute is the inverse `no-describe` (the spec's web note). `arrow` and
    // `inverse` are true, false or unset, and their false is `="false"` (an absent attribute is unset). `shortcut` holds
    // its chords separated by spaces, and the tooltip carries the standard keyboard convention
    // (`data-tanrei-keyboard-convention`, KBS-2), so a shortcut reads the same on every machine.
    props: ({ describes, arrow, inverse, shortcut, ...props }) => ({
      ...props,
      ...(describes === false ? { noDescribe: true } : {}),
      ...(arrow === undefined ? {} : { arrow: arrow === false ? 'false' : arrow }),
      ...(inverse === undefined ? {} : { inverse: inverse === false ? 'false' : inverse }),
      ...(shortcut === undefined ? {} : { shortcut: Array.isArray(shortcut) ? shortcut.join(' ') : shortcut }),
      'data-tanrei-keyboard-convention': 'standard',
    }),
  },
  // An app bar spans a phone's width (360). Its items are icon-only Buttons in the slot of their kind — `navigation`, or
  // `actions` for an action (the spec's web mapping) — and a fixture draws what its props say, so the bar follows no
  // scrolling element (`scroll-target="none"`; the scroll connection is tested on its own).
  'app-bar': {
    css: () => `.stage:has(> tanrei-app-bar) { box-sizing: border-box; inline-size: 360px; padding-inline: 0; }`,
    props: (props) => ({ scrollTarget: 'none', ...props }),
    itemAttributes: (item) => `slot="${item.kind === 'navigation' ? 'navigation' : 'actions'}"`,
  },
  // A navigation bar spans a phone's width (360), at the bottom of the window; the icons are its destinations' props.
  'navigation-bar': {
    css: () => `.stage:has(> tanrei-navigation-bar) { box-sizing: border-box; inline-size: 360px; padding-inline: 0; }`,
    wrap: uniqueLandmark,
  },
  // A navigation drawer is the full height of its parent: a standard one (and a collapsible modal one's column) is drawn
  // at the start of a 560 px tall stage, with room at its end for its edge. An open modal one is in the top layer at the
  // window's start edge: its fixture is drawn alone in a 480 × 640 window and the baseline is the window, as a dialog's.
  // A header button is an icon-only Button in the `header-button` slot and the main action a Main Action Button in the
  // `main-action` slot, its glyph in its `icon` slot; a destination's content is a glyph in its `trailing` slot,
  // decorative (the spec's web mapping). A responsive fixture's stage stands for the window it is drawn alone in
  // (`drawerWindow`: 1280, 800 or 400 wide): as wide as the window, the drawer at its start edge. The two long site
  // sidebars are drawn in a stage 800 high (`DRAWER_STAGE_HEIGHTS`).
  'navigation-drawer': {
    css: () => `.stage:has(> tanrei-navigation-drawer) { box-sizing: border-box; block-size: 560px; padding-block: 0; padding-inline-start: 0; }
      .stage:has(> tanrei-navigation-drawer[responsive]) { inline-size: 100vw; }
      ${Object.entries(DRAWER_STAGE_HEIGHTS).map(([id, height]) => `.stage[data-fixture='${id}']:has(> tanrei-navigation-drawer) { block-size: ${height}px; }`).join('\n      ')}`,
    wrap: uniqueLandmark,
    itemAttributes: (item) => (item.kind === 'header-button' ? 'slot="header-button"' : item.kind === 'main-action' ? 'slot="main-action"' : ''),
    itemContent: (item) => {
      if (!item.content || item.kind === 'header-button') return '';
      if (item.kind === 'main-action') return `<span slot="icon">${item.content}</span>`;
      if (item.kind === 'destination') return `<span slot="trailing" aria-hidden="true">${item.content}</span>`;
      return item.content;
    },
  },
  // A search bar is 328 wide, centred in a 360 × 72 stage (SRC-1's verify), and so is a button trigger; an icon trigger
  // is centred in the same stage (SRC-35's verify). The docked fixture draws the bar at the top of a 360 × 320 stage, 16
  // from its top and sides, and the open view in place under it — docked-results in a 360 × 480 one (SRC-7's verify);
  // the full-screen fixtures fill a 360 × 480 stage that stands for the window (SRC-9's verify), and the dialog fixtures
  // a 720 × 480 one (SRC-40's verify). An expanded fixture draws its view in place (`inline`). Every fixture carries the
  // apple keyboard convention (`data-tanrei-keyboard-convention`, KBS-2), so a shortcut hint reads the same on every
  // machine (SRC-37's verify), and dialog-loading shows its indicator from the first frame: the hosted loading
  // indicator's show delay and entrance are 0 there (SRC-47's verify), as its own fixtures are.
  search: {
    css: () => `.stage:has(> tanrei-search) { box-sizing: border-box; inline-size: 360px; block-size: 72px; display: grid; align-content: center; }
      .stage:has(> tanrei-search[bar='icon']:not([expanded])) { justify-items: center; }
      .stage:has(> tanrei-search[expanded]) { block-size: 320px; align-content: start; }
      .stage[data-fixture='docked-results']:has(> tanrei-search[expanded]) { block-size: 480px; }
      .stage:has(> tanrei-search[expanded][presentation='full-screen']) { block-size: 480px; padding: 0; align-content: stretch; }
      .stage:has(> tanrei-search[expanded][presentation='dialog']) { inline-size: 720px; block-size: 480px; padding: 0; align-content: stretch; }
      .stage[data-fixture='dialog-loading'] { --tanrei-comp-loading-indicator-motion-show-delay: 0ms; --tanrei-comp-loading-indicator-motion-enter-duration: 0ms; }`,
    // `inline` is the test attribute; a test's own fixture with `inline: false` is the real overlay instead.
    props: ({ inline, ...props }) => ({ ...(props.expanded && inline !== false ? { ...props, inline: true } : props), 'data-tanrei-keyboard-convention': 'apple' }),
  },
  // A segmented button is drawn at its natural width, start-aligned and vertically centred on a 400 × 96 stage (SEG-14's
  // verify); its `values` (multiple) are the JSON array attribute the set reads.
  'segmented-button': {
    css: () => `.stage:has(> tanrei-segmented-button) { display: flex; align-items: center; inline-size: 400px; block-size: 96px; }`,
  },
  // A side sheet's stage is a 720 × 480 surface that stands for the window (the spec's web note): a standard sheet at the
  // end of a row whose other child fills the rest of the width, a modal one at the window's end edge, in the top layer.
  // Its action items are `tanrei-button` children in the `actions` slot.
  'side-sheet': {
    css: () => `.stage:has(> tanrei-side-sheet) { box-sizing: border-box; display: flex; inline-size: 720px; block-size: 480px; padding: 0; }
      .stage > .side-sheet-content { flex: 1 1 auto; min-inline-size: 0; }`,
    wrap: (element) => `<div class="side-sheet-content"></div>${element}`,
    itemAttributes: () => 'slot="actions"',
  },
  // A button group is drawn start-aligned at its natural width — or at the stage's 400 while full-width — vertically
  // centred on a 400 × 96 stage when horizontal and at the top of a 400 × 240 stage when vertical (BGR-1's verify); its
  // items are `tanrei-button` children, labelled or icon-only.
  // A tag group's stage is 760 wide (728 inside its padding): wide enough that a row of five filters or five
  // suggestions stands on one line, and narrower than the fixtures that wrap and than the long member (TGR-2: a fixture
  // cannot set a width). A member's glyph is in its `icon` slot (`itemsMarkup`), and the group carries the language its
  // fixture is written in.
  'tag-group': {
    css: () => `.stage:has(> tanrei-tag-group) { box-sizing: border-box; inline-size: 760px; }`,
    wrap: (element, f) => framedLanguage(element, f, 'tanrei-tag-group'),
  },
  'button-group': {
    css: () => `.stage:has(> tanrei-button-group) { display: flex; align-items: center; inline-size: 400px; block-size: 96px; }
      .stage:has(> tanrei-button-group[orientation='vertical']) { align-items: flex-start; block-size: 240px; }`,
  },
  // A slider is drawn 320 long, centred in a 320 × 96 stage (room above the handle for a value indicator); the vertical
  // one 240 tall, centred in a 96 × 240 stage (SLD-7's verify).
  slider: {
    css: () => `.stage:has(> tanrei-slider) { box-sizing: border-box; inline-size: 320px; block-size: 96px; padding: 0; display: grid; align-items: center; }
      .stage:has(> tanrei-slider[orientation='vertical']) { inline-size: 96px; block-size: 240px; justify-items: center; }`,
  },
  // A button with menu is drawn at its natural width, start-aligned and vertically centred on a 320 × 96 stage (SPB-12's
  // verify); its icon slot's glyph is drawn by the component's icon helper. A fixture cannot fill the menu slot, so an
  // `open` fixture shows the open form and presents no menu (SPB-20).
  'button-with-menu': {
    css: () => `.stage:has(> tanrei-button-with-menu) { display: flex; align-items: center; inline-size: 320px; block-size: 96px; }`,
  },
  // A toolbar's stages (TBR-1, TBR-4 and TBR-6's verify): a docked one spans a 360 × 64 stage (no system inset); a
  // horizontal floating one is centred in 360 × 96, a vertical one in 96 × 240, so the elevation's shadow shows on every
  // side. Its items are `tanrei-button` children, icon-only (a glyph's name as content) or labelled.
  toolbar: {
    css: () => `.stage:has(> tanrei-toolbar) { box-sizing: border-box; inline-size: 360px; padding: 0; }
      .stage:has(> tanrei-toolbar[variant='floating']) { display: grid; grid-template: minmax(0, 1fr) / minmax(0, 1fr); place-items: center; block-size: 96px; }
      .stage:has(> tanrei-toolbar[variant='floating'][orientation='vertical']) { inline-size: 96px; block-size: 240px; }`,
  },
  // A keyboard shortcut's `keys` attribute holds its chords separated by spaces (the spec's web note); every fixture pins
  // its convention.
  'keyboard-shortcut': {
    props: ({ keys, ...props }) => (Array.isArray(keys) ? { ...props, keys: keys.join(' ') } : keys === undefined ? props : { ...props, keys }),
  },
  // A callout fills the inline size its container gives it (CLO-22), so its stage has one: 400 wide with its padding, a
  // phone's column, where the long title and the long body wrap and two actions still share a row.
  callout: {
    css: () => `.stage:has(> tanrei-callout) { box-sizing: border-box; inline-size: 400px; }`,
  },
  // An empty state takes the whole inline size of the region it stands in (EMP-1), so its stage has one: 480 wide with
  // its padding — a panel's width, where the measure (420 at medium) is narrower than the region, the long title and the
  // long description wrap inside it, and two actions share a row.
  'empty-state': {
    css: () => `.stage:has(> tanrei-empty-state) { box-sizing: border-box; inline-size: 480px; }`,
  },
  // A tag's stage is no wider than a phone's column (360 with its padding), so the two long-label fixtures are cut at the
  // stage's width as TAG-5's verify says: a stage as wide as the window would hold the whole label (about 1170 at 14).
  // A stage still shrinks to a shorter tag.
  tag: {
    css: () => `.stage:has(> tanrei-tag) { box-sizing: border-box; max-inline-size: 360px; }`,
  },
  // A row of tabs is 360 wide and has no panel (TAB-14's verify). `track` is true, false or null (TAB-49): the attribute
  // is absent for null, bare for true and `track="false"` for false, as the tooltip's `arrow` is.
  tabs: {
    css: () => `.stage > tanrei-tabs { inline-size: 360px; }`,
    props: ({ track, ...props }) => ({ ...props, ...(track === undefined ? {} : { track: track === false ? 'false' : track }) }),
  },
  // A Tab view is 360 wide and each panel shows its content as body text inside sys.space.space200 of padding, which is
  // the fixture's content, not the view's (TBV-1's verify). A fixture that leaves `tabs` empty is the view alone: it draws
  // its own row from its panels (TBV-16). A fixture that sets `tabs` is drawn under the tabs fixture `primary` (Overview,
  // Activity, Settings; 360 wide), its selected set to the fixture's, and linked to it (TBV-17): every fixture is on one
  // page, so each row gets an id of its own, `tabs-<fixture id>`, and the view's `tabs` names it. A test that needs a
  // `tabs` naming a missing row sets it after mounting. Markup given by a test is used as it is.
  'tab-view': {
    css: () => `${read('dist/text.css')}
      .stage > tanrei-tabs, .stage > tanrei-tab-view { inline-size: 360px; }
      .tab-view-content { margin: 0; padding: var(--tanrei-sys-space-space200); color: var(--tanrei-sys-color-on-surface); }`,
    // A spec fixture's content is text, also where it is a line of code (`tonal-no-track-no-transition`: a sample in
    // four platforms): it is drawn as its characters. Markup is what a test gives.
    itemContent: (item) => {
      if (!item.content) return '';
      const text = loadSpec('tab-view').fixtures.some((f) => f.items?.some((each) => each.content === item.content));
      if (item.content.includes('<') && !text) return item.content;
      return `<p class="tanrei-text-body tab-view-content">${text ? item.content.replaceAll('&', '&amp;').replaceAll('<', '&lt;') : item.content}</p>`;
    },
    // `track` as the tabs' (TBV-16): `track="false"` for false.
    props: ({ tabs: _tabs, track, ...props }) => ({ ...props, ...(track === undefined ? {} : { track: track === false ? 'false' : track }) }),
    wrap: (element, f) => {
      if (f.props.tabs === undefined || f.props.tabs === '') return element;
      const tabs = loadSpec('tabs');
      const primary = tabs.fixtures.find((fixture) => fixture.id === 'primary')!;
      const { selected: _selected, ...row } = primary.props;
      const selected = f.props.selected;
      const props = selected === undefined || selected === null ? row : { ...row, selected };
      const id = `tabs-${f.id}`;
      return `<tanrei-tabs id="${id}" ${attributes(tabs.props, tabs.platforms.web.props, props)}>${itemsMarkup(tabs, primary.items ?? [], {})}</tanrei-tabs>${element.replace('<tanrei-tab-view', `<tanrei-tab-view tabs="${id}"`)}`;
    },
  },
  // Prose is a class (the spec's web note): `class="tanrei-prose"` on a block 720 wide — so the measure shows: text
  // blocks stop at 504, or 576 at size large, and what is not text runs to 720 — holding the section of the specimen
  // the fixture's `content` names (specs/prose.specimen.md, built by test/specimen.ts), with the icon stylesheet (task
  // marks are glyphs where it is loaded, PRS-10). `measure: false` is `data-measure="false"`. `japanese` is drawn with
  // the language set to ja on the prose and `rtl` with ar (the specimen says so); every heading of `anchors` has its
  // anchor — the Link that is a glyph alone — drawn shown as on a device without hover. A `[[name]]` placeholder of the specimen is a box of
  // surface-container, 96 high and as wide as the prose, labelled with the name. Markup given by a test is used as it is.
  prose: {
    css: () => `${read('dist/icons.css')}\n${read('dist/prose.css')}
      .stage > .tanrei-prose { inline-size: 720px; color: var(--tanrei-sys-color-on-surface); }
      .stage[data-fixture='anchors'] .tanrei-prose-anchor { opacity: 1; }
      .specimen-placeholder { display: grid; place-items: center; block-size: 96px; background: var(--tanrei-sys-color-surface-container); color: var(--tanrei-sys-color-on-surface-variant); font: var(--tanrei-sys-typescale-label-font); }`,
    element: (f, attributes) => {
      const lang = f.id === 'japanese' ? ' lang="ja"' : f.id === 'rtl' ? ' lang="ar"' : '';
      const content = f.content ?? '';
      const inner = content.includes('<') ? content : specimenHtml(content, { idPrefix: `${f.id}-`, anchors: content === 'anchors' });
      return `<div class="tanrei-prose" ${attributes}${lang}>${inner}</div>`;
    },
  },
  // The link is a class on the product's anchor (the spec's web note): `<a class="tanrei-link" href>` with the props as
  // the anchor's own attributes — `target: new` is `target="_blank"` with `targetLabel` as `aria-description`, `current`
  // `aria-current="page"`, `label` `aria-label`, a disabled link the anchor without `href` with `role="link"` and
  // `aria-disabled="true"` — and the glyph a `.tanrei-icon` written against the label, before or after it. The stage is
  // the text the link sits in: 320 wide, in the body text style, so a long label wraps on it. A fixture whose variant
  // is `inverse` is drawn on a stage filled with sys.color.inverse-surface. Markup given by a test (a paragraph around a link) is used as it
  // is. `underline` is `data-underline`; `external: on` is `data-external="true"` and `off`
  // `"false"` (`auto` writes nothing: on a page written into a blank window the script finds every web address
  // external, which is why no fixture that is drawn relies on it); `externalLabel` is `aria-description` while the
  // link opens where the person is (`targetLabel` is the one description of a new context); `siteIcon` is the
  // product's `<img class="tanrei-link-site-icon">`, the anchor's first child, written as the build step writes it,
  // its address the package's own copy of the fixture picture (test/pictures.ts) — no fixture makes a request.
  link: {
    css: () => `${read('dist/icons.css')}\n${read('dist/link.css')}
      .stage:has(.tanrei-link) { box-sizing: content-box; inline-size: 320px; --tanrei-text-emphasized-weight: var(--tanrei-sys-typescale-body-font-weight-emphasized); font: var(--tanrei-sys-typescale-body-font); letter-spacing: var(--tanrei-sys-typescale-body-letter-spacing); color: var(--tanrei-sys-color-on-surface); }
      .stage:has(> .tanrei-link[data-variant='inverse']) { background: var(--tanrei-sys-color-inverse-surface); color: var(--tanrei-sys-color-inverse-on-surface); }`,
    element: (f) => {
      if (f.content?.includes('<')) return f.content;
      const quote = (v: unknown) => String(v).replaceAll('&', '&amp;').replaceAll('"', '&quot;');
      const p = f.props;
      const opensNew = p.target === 'new';
      const attrs = [
        'class="tanrei-link"',
        p.disabled ? 'role="link" aria-disabled="true"' : p.href !== undefined ? `href="${quote(p.href)}"` : '',
        opensNew ? 'target="_blank"' : '',
        opensNew && p.targetLabel ? `aria-description="${quote(p.targetLabel)}"` : '',
        p.variant && p.variant !== 'standard' ? `data-variant="${quote(p.variant)}"` : '',
        p.standalone ? 'data-standalone' : '',
        p.iconPosition === 'trailing' ? 'data-icon-position="trailing"' : '',
        p.current ? 'aria-current="page"' : '',
        p.label !== undefined && !f.content ? `aria-label="${quote(p.label)}"` : '',
        p.underline && p.underline !== 'auto' ? `data-underline="${quote(p.underline)}"` : '',
        p.external === 'on' ? 'data-external="true"' : p.external === 'off' ? 'data-external="false"' : '',
        !opensNew && p.external === 'on' && p.externalLabel ? `aria-description="${quote(p.externalLabel)}"` : '',
      ].filter(Boolean);
      const glyph = f.slots?.icon ? `<span class="tanrei-icon" aria-hidden="true">${String(f.slots.icon)}</span>` : '';
      const picture = p.siteIcon ? `<img class="tanrei-link-site-icon" src="${quote(fixturePicture(String(p.siteIcon)))}" alt="" width="32" height="32" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : '';
      const label = (f.content ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;');
      return `<a ${attrs.join(' ')}>${picture}${p.iconPosition === 'trailing' ? `${label}${glyph}` : `${glyph}${label}`}</a>`;
    },
  },
  // A link card is the box of the product's own anchor (the spec's web note): the element around the markup a site's
  // build step writes — `linkCardToHtml()`, the package's own function, so a fixture is drawn before the element is
  // defined (LKC-36) and the staging cannot differ from what a product gets. The values are parts of the anchor, so
  // none is written as an attribute but `variant` (a test that builds a card from attributes gives its own markup,
  // which is used as it is). A fixture that leaves `external` out is staged as a destination of the product's own
  // site (`data-external="false"`, as `resolveLinkData()` writes it): on a page written into a blank window the
  // element would find every web address external. The pictures are the package's own copies (test/pictures.ts) — no
  // fixture makes a request. The stage is 720 wide inside its padding (LKC-2's and LKC-12's verify) and never wider
  // than the window; a test sets another width on the stage (LKC-12: 320, and 720 with the text doubled).
  'link-card': {
    css: () => `${read('dist/icons.css')}\n${read('dist/link-card.css')}
      .stage:has(> tanrei-link-card) { box-sizing: content-box; inline-size: 720px; max-inline-size: calc(100% - 32px); }`,
    wrap: (element, f) => {
      if (/^\s*</.test(f.content ?? '')) return f.content ?? '';
      const p = f.props;
      const text = (v: unknown) => (v === undefined ? undefined : String(v));
      const lang = /[\u3040-\u30ff\u4e00-\u9fff]/.test(JSON.stringify(f.props.title ?? '')) ? 'ja' : f.direction === 'rtl' && /[\u0600-\u06ff]/.test(JSON.stringify(f)) ? 'ar' : '';
      const html = linkCardToHtml(
        {
          href: String(p.href ?? ''),
          title: text(p.title),
          description: text(p.description),
          siteName: text(p.siteName),
          imageAlt: text(p.imageAlt),
          ...(p.image ? { image: { src: fixturePicture(String(p.image)), width: 600, height: 315 } } : {}),
          ...(p.siteIcon ? { siteIcon: { src: fixturePicture(String(p.siteIcon)), width: 32, height: 32 } } : {}),
          external: (p.external as 'auto' | 'on' | 'off' | undefined) ?? 'off',
        },
        { variant: text(p.variant), target: p.target === 'new' ? 'new' : 'same', targetLabel: text(p.targetLabel), externalLabel: text(p.externalLabel) },
      );
      return lang ? html.replace('<tanrei-link-card', `<tanrei-link-card lang="${lang}"`) : html;
    },
  },
  // The steps are a class on the product's ordered list (the spec's web note): `<ol class="tanrei-steps" role="list">`
  // with `label` as `aria-label`, `start` as the list's own attribute and `size` as `data-size`. A fixture that gives
  // its steps as items is that list alone, 400 wide, on the surface's content color: a step's title is
  // `<p class="tanrei-steps-title">`, and its text is written directly in the item where it has no title and in a
  // paragraph under a title — both are forms a product writes. A fixture whose `content` names a section of
  // specs/steps.specimen.md is that section built as prose of the fixture's size, 720 wide with a measure
  // (test/specimen.ts), every ordered list at its top level a set of steps with the fixture's props; a `[[name]]`
  // placeholder is prose's (`[[code-block]]` the Code block, the others a labelled box). `japanese` is drawn with the
  // language ja and the right-to-left fixtures with ar. Markup given by a test is used as it is.
  steps: {
    css: () => `${read('dist/icons.css')}\n${read('dist/prose.css')}\n${read('dist/steps.css')}
      .stage:has(.tanrei-steps) { color: var(--tanrei-sys-color-on-surface); }
      .stage > .tanrei-steps { inline-size: 400px; }
      .stage > .tanrei-prose:has(.tanrei-steps) { inline-size: 720px; }
      .specimen-placeholder { display: grid; place-items: center; block-size: 96px; background: var(--tanrei-sys-color-surface-container); color: var(--tanrei-sys-color-on-surface-variant); font: var(--tanrei-sys-typescale-label-font); }`,
    element: (f, attributes) => {
      const content = f.content ?? '';
      if (content.includes('<')) return content;
      const escape = (v: unknown) => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
      const lang = f.id === 'japanese' ? ' lang="ja"' : f.direction === 'rtl' ? ' lang="ar"' : '';
      const open = `<ol class="tanrei-steps" role="list" ${attributes}${lang}>`;
      if (f.items) {
        const steps = f.items.map((item) => {
          const title = item.props.title ? `<p class="tanrei-steps-title">${escape(item.props.title)}</p>` : '';
          const body = item.content ? (title ? `<p>${escape(item.content)}</p>` : escape(item.content)) : '';
          return `<li>${title}${body}</li>`;
        });
        return `${open}${steps.join('')}</ol>`;
      }
      // Every ordered list at the top level of the section is a set of steps; a list inside an item is the body's.
      let depth = 0;
      const section = specimenHtml(content, { idPrefix: `${f.id}-`, spec: 'steps' }).replace(/<(\/?)(ol|ul)\b[^>]*>/g, (tag, closing: string, name: string) => {
        if (closing) return (depth--, tag);
        return depth++ === 0 && name === 'ol' ? open : tag;
      });
      return `<div class="tanrei-prose"${f.props.size === 'large' ? ' data-size="large"' : ''}${lang}>${section}</div>`;
    },
  },
  // The timeline is a class on the product's ordered list (the spec's web note): `<ol class="tanrei-timeline" role="list">`
  // with `label` as `aria-label`, `size` as `data-size` and `density` as `data-density`, alone on its stage, 400 wide,
  // on the surface's content color. An event is an `<li>`: its glyph a `.tanrei-timeline-marker.tanrei-icon` first,
  // its time a `<time class="tanrei-timeline-time" datetime>` — a `<p>` of that class where the fixture gives no
  // `datetime` — its title a `<p class="tanrei-timeline-title">` and its content one paragraph; `status` and
  // `statusLabel` are `data-status` and `data-status-label`. The right-to-left fixtures written in Arabic are drawn
  // with the language ar. Markup given by a test is used as it is.
  timeline: {
    css: () => `${read('dist/icons.css')}\n${read('dist/prose.css')}\n${read('dist/timeline.css')}
      .stage:has(.tanrei-timeline) { color: var(--tanrei-sys-color-on-surface); }
      .stage > .tanrei-timeline { inline-size: 400px; }`,
    element: (f, attributes) => {
      if (f.content?.includes('<')) return f.content;
      const quote = (v: unknown) => String(v).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
      const lang = f.direction === 'rtl' && /[\u0600-\u06ff]/.test(JSON.stringify(f)) ? ' lang="ar"' : '';
      const events = (f.items ?? []).map((item) => {
        const { time, datetime, title, status, statusLabel, icon } = item.props;
        const state = `${status ? ` data-status="${quote(status)}"` : ''}${statusLabel ? ` data-status-label="${quote(statusLabel)}"` : ''}`;
        const glyph = icon ? `<span class="tanrei-timeline-marker tanrei-icon" aria-hidden="true">${quote(icon)}</span>` : '';
        const when = time ? (datetime ? `<time class="tanrei-timeline-time" datetime="${quote(datetime)}">${quote(time)}</time>` : `<p class="tanrei-timeline-time">${quote(time)}</p>`) : '';
        const what = title ? `<p class="tanrei-timeline-title">${quote(title)}</p>` : '';
        return `<li${state}>${glyph}${when}${what}${item.content ? `<p>${quote(item.content)}</p>` : ''}</li>`;
      });
      return `<ol class="tanrei-timeline" role="list" ${attributes}${lang}>${events.join('')}</ol>`;
    },
  },
  // The pagination is classes on the product's `nav` and anchors (the spec's web note): `label` is the landmark's
  // `aria-label`, and each item an `<a class="tanrei-pagination-item">` with `data-direction`, `rel`, its `href` — left
  // out where the fixture's is empty — and two spans, the label and the title. The stage is a column of text, 720 wide,
  // so the two items stand side by side (the stacked form is a test's: PGN-5). The right-to-left fixtures are drawn
  // with the language ar. Several fixtures share a landmark's name, which no page does: each then adds its id to it.
  // Markup given by a test is used as it is.
  pagination: {
    css: () => `${read('dist/icons.css')}\n${read('dist/pagination.css')}
      .stage:has(> .tanrei-pagination) { box-sizing: border-box; inline-size: 752px; max-inline-size: 100%; }`,
    element: (f) => {
      if (f.content?.includes('<')) return f.content;
      const quote = (v: unknown) => String(v).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
      const name = String(f.props.label ?? '');
      const shared = loadSpec('pagination').fixtures.filter((other) => other.props.label === name).length > 1;
      const items = (f.items ?? []).map((item) => {
        const { direction, label, title, href } = item.props;
        const destination = String(href ?? '').trim() ? ` href="${quote(href)}"` : '';
        return `<a class="tanrei-pagination-item" data-direction="${quote(direction)}" rel="${direction === 'previous' ? 'prev' : 'next'}"${destination}><span class="tanrei-pagination-label">${quote(label ?? '')}</span><span class="tanrei-pagination-title">${quote(title ?? '')}</span></a>`;
      });
      return `<nav class="tanrei-pagination"${name ? ` aria-label="${quote(shared ? `${name} (${f.id})` : name)}"` : ''}${f.direction === 'rtl' ? ' lang="ar"' : ''}>${items.join('')}</nav>`;
    },
  },
  // A table is the scroll box of a native table (the spec's web note): the element around `tableMarkup`'s table, with
  // the stylesheet a page loads to draw it before the element is defined. Its box is 720 wide, as a column of text is,
  // and 480 for the fixtures whose nine columns must not fit (`wide…`, `rtl-wide…`: TBL-17's verify), and never wider
  // than the window. The caption is the native `<caption>`, so the `caption` attribute is not written; `japanese` is
  // drawn with the language set to ja and the right-to-left fixtures with ar, as prose's are. A name that several
  // fixtures share is told apart by the fixture's id (`tableNameSuffix`). icons.css is loaded for the sort marks, which
  // table.css draws only where it is; `status` is the status line's paragraph, which `tableMarkup` writes, so the
  // attribute is not written for a fixture with items; and the slots are parts of the table's own markup, not slotted
  // children, so the generic ones are taken out.
  table: {
    css: () => `${read('dist/icons.css')}\n${read('dist/table.css')}
      .stage:has(> tanrei-table) { box-sizing: border-box; inline-size: 752px; max-inline-size: 100%; }
      .stage > tanrei-table .fixture-name { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
      .stage:is([data-fixture^='wide'], [data-fixture^='rtl-wide']):has(> tanrei-table) { inline-size: 512px; }`,
    props: ({ caption: _caption, ...props }, f) => (f.items ? (({ status: _status, ...rest }) => rest)(props) : props),
    items: tableMarkup,
    wrap: (written, f) => {
      const element = written.replace(/<span slot="(?:empty|pagination)">[^<]*<\/span>/g, '');
      const lang = f.id === 'japanese' ? 'ja' : f.direction === 'rtl' && /[\u0600-\u06ff]/.test(JSON.stringify(f)) ? 'ar' : '';
      const suffix = f.props.caption ? '' : tableNameSuffix(loadSpec('table'), f);
      const opening = element.slice(0, element.indexOf('>') + 1);
      const named = suffix ? opening.replace(/ label="([^"]*)"/, (_, name: string) => ` label="${name}${suffix}"`) : opening;
      return `${lang ? named.replace('<tanrei-table', `<tanrei-table lang="${lang}"`) : named}${element.slice(opening.length)}`;
    },
  },
  // An accordion is an element around the product's own `details` (the spec's web note): `accordionMarkup`'s items,
  // with the stylesheets a page loads to draw them before the element is defined (the chevron is the icon set's). It
  // is as wide as its layout: the stage is 480 wide, in the body text style and the surface's text color, which the
  // content takes from where the accordion stands (ACC-8). The right-to-left fixtures written in Arabic have the
  // language ar, as prose's and the table's have.
  accordion: {
    css: () => `${read('dist/icons.css')}\n${read('dist/accordion.css')}
      .stage:has(> tanrei-accordion) { box-sizing: border-box; inline-size: 512px; max-inline-size: 100%; font: var(--tanrei-sys-typescale-body-font); letter-spacing: var(--tanrei-sys-typescale-body-letter-spacing); color: var(--tanrei-sys-color-on-surface); }`,
    items: accordionMarkup,
    wrap: (element, f) => (f.direction === 'rtl' && /[\u0600-\u06ff]/.test(JSON.stringify(f)) ? element.replace('<tanrei-accordion', '<tanrei-accordion lang="ar"') : element),
  },
  // A tree view is an element around the product's own nested lists (the spec's web note): `treeViewMarkup`'s lists,
  // with the stylesheets a page loads to draw them before the element is defined (the chevron is the icon set's). It
  // is as wide as its layout: the stage is 400 wide, a side pane's width — narrower than `long-labels`' names and than
  // twice `deep`'s indent at its last level. `japanese` is drawn with the language ja, and the right-to-left fixtures
  // written in Arabic with ar.
  'tree-view': {
    css: () => `${read('dist/icons.css')}\n${read('dist/tree-view.css')}
      .stage:has(> tanrei-tree-view) { box-sizing: border-box; inline-size: 400px; max-inline-size: 100%; }`,
    items: treeViewMarkup,
    wrap: (element, f) => {
      const lang = f.id === 'japanese' ? 'ja' : f.direction === 'rtl' && /[\u0600-\u06ff]/.test(JSON.stringify(f)) ? 'ar' : '';
      return lang ? element.replace('<tanrei-tree-view', `<tanrei-tree-view lang="${lang}"`) : element;
    },
  },
  // A table of contents is an element around the product's own nested list of anchors (the spec's web note):
  // `tableOfContentsMarkup`'s list, with the stylesheet a page loads to draw it before the element is defined. It is as
  // wide as its layout: the stage is a column 240 wide (TOC-1's and TOC-33's verify), never wider than the window. The
  // right-to-left fixtures written in Arabic have the language ar and the Japanese ones ja, as prose's have.
  'table-of-contents': {
    css: () => `${read('dist/table-of-contents.css')}
      .stage:has(> tanrei-table-of-contents) { box-sizing: border-box; inline-size: 272px; max-inline-size: 100%; }`,
    items: tableOfContentsMarkup,
    wrap: (element, f) => {
      const lang = f.id.startsWith('japanese') ? 'ja' : f.direction === 'rtl' && /[\u0600-\u06ff]/.test(JSON.stringify(f)) ? 'ar' : '';
      return lang ? element.replace('<tanrei-table-of-contents', `<tanrei-table-of-contents lang="${lang}"`) : element;
    },
  },
  // Breadcrumbs are an element around the product's own anchors (the spec's web note): `breadcrumbsMarkup`'s levels, with
  // the stylesheet a page loads to draw them before the element is defined, and icons.css, which that stylesheet's
  // glyphs wait for. A trail is as wide as its layout gives it, and a fixture cannot state a width: the stage is 480 wide (BRC-9's verify) and the `long-current` one 320 (BRC-14's), never
  // wider than the window. Each landmark is named after its fixture as well, as a page's landmarks are told apart;
  // the right-to-left fixtures, which are written in Arabic, have the language ar.
  breadcrumbs: {
    css: () => `${read('dist/icons.css')}\n${read('dist/breadcrumbs.css')}
      .stage:has(> tanrei-breadcrumbs) { box-sizing: border-box; inline-size: 512px; max-inline-size: 100%; }
      .stage[data-fixture='long-current']:has(> tanrei-breadcrumbs) { inline-size: 352px; }`,
    items: breadcrumbsMarkup,
    wrap: (element, f) => {
      const named = uniqueLandmark(element, f);
      return f.direction === 'rtl' && /[\u0600-\u06ff]/.test(JSON.stringify(f)) ? named.replace('<tanrei-breadcrumbs', '<tanrei-breadcrumbs lang="ar"') : named;
    },
  },
  // Inline code is a class (the spec's web note): `<code class="tanrei-code">` holding the fixture's `text`, with
  // `variant` as `data-variant`, in a paragraph of prose of the default size 480 wide — the text it sits in. A fixture
  // with `content` holds that section of specs/inline-code.specimen.md, built as prose's specimen is (test/specimen.ts):
  // every run between backticks is an inline code of the fixture's props; `large-text` is prose of size large,
  // `japanese` has the language ja and `rtl` ar; `table` is a plain grid of two columns, its cells text blocks side by
  // side (the specimen's header). Markup given by a test is used as it is.
  'inline-code': {
    css: () => `${read('dist/icons.css')}\n${read('dist/prose.css')}\n${read('dist/code.css')}
      .stage > .tanrei-prose, .stage > .inline-code-grid { box-sizing: border-box; inline-size: 480px; color: var(--tanrei-sys-color-on-surface); }
      .inline-code-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--tanrei-sys-space-space100) var(--tanrei-sys-space-space200); font: var(--tanrei-sys-typescale-body-font); letter-spacing: var(--tanrei-sys-typescale-body-letter-spacing); }`,
    element: (f) => {
      if (f.content?.includes('<')) return f.content;
      const escape = (v: unknown) => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
      const variant = f.props.variant && f.props.variant !== 'auto' ? ` data-variant="${escape(f.props.variant)}"` : '';
      const run = `<code class="tanrei-code"${variant} translate="no" spellcheck="false">`;
      if (!f.content) return `<div class="tanrei-prose"><p>${run}${escape(f.props.text ?? '')}</code></p></div>`;
      const runs = (html: string) => html.replaceAll('<code>', run);
      if (f.content === 'table') {
        const rows = specimenMarkdown('table', 'inline-code').split('\n').filter((line) => line.trim().startsWith('|') && !/^\|[\s|-]+\|$/.test(line.trim()));
        const cells = rows.flatMap((row) => row.trim().slice(1, -1).split('|').map((cell) => `<div>${runs(specimenInline(cell.trim()))}</div>`));
        return `<div class="inline-code-grid">${cells.join('')}</div>`;
      }
      const lang = f.content === 'japanese' ? ' lang="ja"' : f.content === 'rtl' ? ' lang="ar"' : '';
      return `<div class="tanrei-prose"${f.content === 'large-text' ? ' data-size="large"' : ''}${lang}>${runs(specimenHtml(f.content, { idPrefix: `${f.id}-`, spec: 'inline-code' }))}</div>`;
    },
  },
  // A code block fills a column 480 wide (the long-line fixtures hold a line wider than it: COD-4's verify). Its code
  // is the product's own `<pre><code>` in the light DOM (the spec's web note): the fixture's `code`, or its runs —
  // each a `<span data-syntax>` in the `<code>`, a plain run bare text. Markup given by a test is used as it is.
  'code-block': {
    css: () => `.stage:has(> tanrei-code-block) { box-sizing: border-box; inline-size: 512px; }`,
    props: ({ code: _code, ...props }) => props,
    children: (f) => {
      if (f.content?.includes('<')) return '';
      const escape = (v: unknown) => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
      const runs = (f.items ?? []).map((item) => {
        const text = escape(item.props.text ?? '');
        return item.props.syntax && item.props.syntax !== 'plain' ? `<span data-syntax="${escape(item.props.syntax)}">${text}</span>` : text;
      });
      const code = f.items ? runs.join('') : escape(f.props.code ?? '');
      return f.items || f.props.code !== undefined ? `<pre><code>${code}</code></pre>` : '';
    },
  },
  // A description list is the box of a native `dl` (the spec's web note): the element around `descriptionListMarkup`'s
  // list, with the stylesheet a page loads to draw it before the element is defined. Its box is 720 wide, as a column
  // of text is — narrower than the term of `inline-falls-back` and the identifier of `unbreakable`, which rely on that
  // (DSL-4, DSL-8) — and never wider than the window. The Japanese fixtures are drawn with the language set to ja and
  // the right-to-left ones with ar, as prose's and the table's are.
  'description-list': {
    css: () => `${read('dist/description-list.css')}
      .stage:has(> tanrei-description-list) { box-sizing: border-box; inline-size: 752px; max-inline-size: 100%; }`,
    items: descriptionListMarkup,
    wrap: (element, f) => {
      const lang = f.id.startsWith('japanese') ? 'ja' : f.direction === 'rtl' && /[\u0600-\u06ff]/.test(JSON.stringify(f)) ? 'ar' : '';
      return lang ? element.replace('<tanrei-description-list', `<tanrei-description-list lang="${lang}"`) : element;
    },
  },
  // A skeleton is the box around the product's own placeholders (the spec's web note): each item is an empty
  // `<span class="tanrei-skeleton-placeholder">` with its shape and lines as `data-shape` and `data-lines` and its
  // sizes as the CSS properties `inline-size` and `block-size` in its `style`, a number being that many CSS pixels;
  // with the stylesheet a page loads to draw it before the element is defined. Its place is 300 wide (SKL-3's verify)
  // and in the body text style (SKL-1's and SKL-3's), as a column of a page is, and never wider than the window.
  skeleton: {
    css: () => `${read('dist/skeleton.css')}
      .stage:has(> tanrei-skeleton) { box-sizing: content-box; inline-size: 300px; max-inline-size: calc(100% - 32px); font: var(--tanrei-sys-typescale-body-font); letter-spacing: var(--tanrei-sys-typescale-body-letter-spacing); }`,
    items: (_spec, f) =>
      (f.items ?? [])
        .map(({ props }) => {
          const sizes = [props.inlineSize === undefined ? '' : `inline-size: ${String(props.inlineSize)}px`, props.blockSize === undefined ? '' : `block-size: ${String(props.blockSize)}px`].filter(Boolean).join('; ');
          return `<span class="tanrei-skeleton-placeholder"${props.shape === undefined ? '' : ` data-shape="${String(props.shape)}"`}${props.lines === undefined ? '' : ` data-lines="${String(props.lines)}"`}${sizes ? ` style="${sizes}"` : ''}></span>`;
        })
        .join(''),
    wrap: (element, f) => (f.direction === 'rtl' ? element.replace('<tanrei-skeleton', '<tanrei-skeleton lang="ar"') : element),
  },
  // A figure is the box of a native `figure` (the spec's web note): the element around `figureMarkup`'s figure, with the
  // stylesheet a page loads to draw it before the element is defined. `inset: false` is the `flush` attribute; the
  // title and the caption are parts of the figure, so `headline` and `caption` are not written as attributes (a test's
  // own markup keeps them). Its box
  // is 480 wide, as a column of a page is, and never wider than the window. What stands for a picture and for the
  // product's joined block is the harness's own (see `figureMarkup`); the right-to-left fixtures whose text is Arabic
  // are drawn with the language set to ar.
  figure: {
    css: () => `${read('dist/figure.css')}
      .stage:has(> tanrei-figure) { box-sizing: border-box; inline-size: 512px; max-inline-size: 100%; }
      .stage > tanrei-figure .fixture-specimen { font: var(--tanrei-sys-typescale-body-font); }
      .stage > tanrei-figure .fixture-picture { display: grid; place-items: center; box-sizing: border-box; inline-size: 100%; block-size: 10rem; background: var(--tanrei-sys-color-surface-container-highest); color: var(--tanrei-sys-color-on-surface-variant); font: var(--tanrei-sys-typescale-body-small-font); }
      .stage > tanrei-figure .fixture-attachment { padding: var(--tanrei-sys-space-space150) var(--tanrei-sys-space-space200); border-radius: var(--tanrei-sys-shape-corner-small); background: var(--tanrei-sys-color-surface-container-high); color: var(--tanrei-sys-color-on-surface); font: var(--tanrei-sys-typescale-code-font); overflow-wrap: anywhere; }`,
    props: ({ inset, ...props }) => (inset === false ? { ...props, flush: true } : props),
    wrap: (element, f) => {
      const given = /^\s*<(figure|!--children-->)/.test(f.content ?? '');
      // The title and the caption are written as parts; a test's own markup keeps them as the element's attributes.
      const tag = element.slice(0, element.indexOf('>') + 1);
      const opening = given ? tag : tag.replace(/ (headline|caption)="[^"]*"/g, '');
      const lang = f.direction === 'rtl' && /[\u0600-\u06ff]/.test(JSON.stringify(f)) ? 'ar' : '';
      // Markup given by a test (a whole `<figure>`, or — after the comment `<!--children-->` — the children of a figure the element builds) is used as it is.
      const inner = given ? (f.content ?? '') : figureMarkup(f);
      return `${lang ? opening.replace('<tanrei-figure', `<tanrei-figure lang="${lang}"`) : opening}${inner}</tanrei-figure>`;
    },
  },
  // An app shell is the frame of a window (the spec's web note): the element around `appShellMarkup`'s regions, with the
  // stylesheet a page loads to lay it out before the element is defined, the link's (the skip link is a Link) and the
  // icons' (the menu button's glyph). Its stage has no padding and is as wide as the window, which is the size
  // `appShellWindow` names for the fixture when it is drawn alone. A region is a labelled box with a dashed edge inside
  // it, in the body text style: the header as tall as a small app bar, the navigation as wide as a navigation drawer,
  // the navigation bar as tall as one. The right-to-left fixtures, whose text is Arabic, are drawn with the language
  // set to ar.
  'app-shell': {
    page: true,
    items: () => '',
    css: () => `${read('dist/app-shell.css')}\n${read('dist/link.css')}\n${read('dist/icons.css')}
      .stage:has(> tanrei-app-shell) { padding: 0; font: var(--tanrei-sys-typescale-body-font); letter-spacing: var(--tanrei-sys-typescale-body-letter-spacing); }
      tanrei-app-shell > .fixture-region { outline: var(--tanrei-sys-border-hairline) dashed var(--tanrei-sys-color-outline); outline-offset: calc(-1 * var(--tanrei-sys-border-hairline)); }
      tanrei-app-shell > header.fixture-region { display: flex; align-items: center; gap: var(--tanrei-sys-space-space100); box-sizing: border-box; min-block-size: var(--tanrei-comp-app-bar-container-height-small); padding-inline: var(--tanrei-sys-space-space100); background: var(--tanrei-sys-color-surface); }
      tanrei-app-shell > nav.fixture-region[slot='navigation'] { box-sizing: border-box; inline-size: var(--tanrei-comp-navigation-drawer-container-width); padding: var(--tanrei-sys-space-space200); }
      tanrei-app-shell > nav.fixture-region[slot='navigation-bar'] { box-sizing: border-box; min-block-size: var(--tanrei-comp-navigation-bar-container-height); padding: var(--tanrei-sys-space-space200); background: var(--tanrei-sys-color-surface); }
      tanrei-app-shell > div.fixture-region[slot='announcement'] { padding: var(--tanrei-sys-space-space100) var(--tanrei-sys-space-space200); }`,
    wrap: (element, f) => {
      const lang = f.direction === 'rtl' && /[\u0600-\u06ff]/.test(JSON.stringify(f)) ? ' lang="ar"' : '';
      return `${element.slice(0, element.indexOf('>'))}${lang}>${appShellMarkup(loadSpec('app-shell'), f)}</tanrei-app-shell>`;
    },
  },
  // A page header is the box of the page's own heading and paragraphs (the spec's web note): the element around
  // `pageHeaderMarkup`'s parts, with the stylesheet a page loads to draw it before the element is defined. The title,
  // the description and the eyebrow are parts, so they are not written as attributes (`headline`, `description`,
  // `eyebrow` and `level` are a test's own, for a head built by script). Its head is 768 wide (PGH-7's and PGH-10's
  // verify) — the main region of a wide window — and never wider than the window, in the body text style and the
  // surface's text color, which the plain text of the breadcrumbs slot takes. The Japanese fixtures are drawn with the
  // language set to ja and the right-to-left ones whose text is Arabic with ar.
  'page-header': {
    items: () => '',
    css: () => `${read('dist/page-header.css')}
      .stage:has(> tanrei-page-header) { box-sizing: border-box; inline-size: 800px; max-inline-size: 100%; font: var(--tanrei-sys-typescale-body-font); letter-spacing: var(--tanrei-sys-typescale-body-letter-spacing); color: var(--tanrei-sys-color-on-surface); }`,
    props: ({ title, description, eyebrow, level, ...props }, f) => (/^\s*</.test(f.content ?? '') ? { ...props, ...(title === undefined ? {} : { title }), ...(description === undefined ? {} : { description }), ...(eyebrow === undefined ? {} : { eyebrow }), ...(level === undefined ? {} : { level }) } : props),
    wrap: (element, f) => {
      const lang = f.id.startsWith('japanese') ? ' lang="ja"' : f.direction === 'rtl' && /[\u0600-\u06ff]/.test(JSON.stringify(f)) ? ' lang="ar"' : '';
      return `${element.slice(0, element.indexOf('>'))}${lang}>${pageHeaderMarkup(f)}</tanrei-page-header>`;
    },
  },
  // A field is as wide as its layout gives it (FLD-1), and a stage has no width to give: it is drawn 280 wide, the
  // width the text field's fixtures are drawn at, so that the two frames can be laid over each other (FLD-1's verify).
  // Its control is the one item of the fixture (a slider, a switch or a checkbox, as their own elements), and the
  // glyph of its `label-icon` slot is drawn by the field's icon helper. The fixtures written in Japanese, Arabic and
  // Hebrew are drawn with the language set, as a page in that language is.
  field: {
    // A twin of a select field's open fixture (`select-…`) draws its list in place, in a stage that stands for the
    // window, exactly as that fixture is staged (`select-field`, below).
    css: () => `.stage > tanrei-field { inline-size: 280px; }
      .stage:has(> tanrei-field > tanrei-select[open][inline]) { position: relative; block-size: 440px; }
      ${COMBOBOX_OPEN_STAGE('tanrei-field > tanrei-combobox')}`,
    // A twin of a text field's fixture (`text-…`) is staged as that fixture is — with no language of its own — so that
    // the two are one picture: the text field's fixtures are drawn without one, and their baselines with them. The same for a combobox field's (`combobox-…`)
    // and for a number field's (`number-…`): their fixtures are drawn without one.
    // A twin of a chip field's fixture (`entries-…`): a disabled Field's entries are disabled chips, written by hand.
    wrap: (element, f) => (f.id.startsWith('text-') || f.id.startsWith('combobox-') || f.id.startsWith('number-') ? element : framedLanguage(f.id.startsWith('entries-') && f.props.disabled ? element.replaceAll('<tanrei-chip slot="entries"', '<tanrei-chip slot="entries" disabled') : element, f, 'tanrei-field')),
    // A file upload's content, and a file picker's, is the label of its trigger: the product's own Button, outlined, in the trigger slot.
    // A text input's content names its icons, and three of its props are other attributes (the twins of the text field's fixtures).
    itemContent: (item) =>
      item.kind === 'file-upload' || item.kind === 'file-picker'
        ? `<tanrei-button slot="trigger" variant="outlined">${item.content ?? ''}</tanrei-button>`
        : item.kind === 'text-input'
          ? `${entryChips(item.props)}${textInputIcons(item.content ?? '')}`
          : (item.content ?? ''),
    itemProps: (props, item) => (item.kind === 'text-input' ? withoutEntries(textInputProps(props)) : item.kind === 'select' ? selectProps(props) : item.kind === 'combobox' ? comboboxProps(props) : item.kind === 'number-input' ? numberInputProps(props) : props),
  },
  // A field group is as wide as its layout gives it (FGR-1): 320, a narrow column of a form — narrower than the row of
  // `checkboxes-horizontal-many` and than the texts of `long-label`, which rely on it (FGR-13's verify). Its controls are
  // the fixture's items, as their own elements.
  'field-group': {
    css: () => `.stage > tanrei-field-group { inline-size: 320px; }`,
    wrap: (element, f) => framedLanguage(element, f, 'tanrei-field-group'),
  },
  // A file upload is as wide as its layout gives it (FUP-1): its stage is a form's column, 360 wide — wide enough for a
  // row's two actions beside a name, and narrower than the texts of `long-text`, which rely on it (FUP-17's "never cut").
  // `accept` is the comma-separated list a native file input takes (the spec's web note). Its rows are the fixture's
  // items, as their own elements; a row's `file` is a property and no fixture holds one.
  //
  // A fixture whose `rows` is `own` (also by leaving it out) and that holds `file` items cannot be markup alone: the
  // element keeps its own files and a file is no attribute (FUP-31, FUP-42). Each item stands for one file the stage
  // hands over after the element is defined (the spec's web note): `formatSize` is set first — it answers a size with
  // its item's `sizeText`, and is left null where no item has one — then `add()` is called once with one `File` per
  // item, in order: named by the item's `name`, as many zero bytes long as its place among the items (1, 2, 3 …), so
  // that no two are the same file (FUP-43), with one fixed time of last change. Whether each is kept or refused is the
  // element's own judging of the fixture's `accept` and `maxFiles`. The items are not also written as child rows.
  // The documentation's renderer stages the same way (apps/docs/src/lib/fixtures.ts, `data-fixture-files`).
  'file-upload': {
    css: () => `.stage > tanrei-file-upload { inline-size: 360px; }`,
    props: ({ accept, ...props }) => ({ ...props, ...(Array.isArray(accept) ? { accept: accept.join(',') } : {}) }),
    // A row's picture is the package's own copy of the fixture picture (test/pictures.ts): no fixture makes a request.
    wrap: (element) => element.replaceAll('preview-src="fixtures/avatar.png"', `preview-src="${fixturePicture('fixtures/avatar.png')}"`),
    // A row's `readOnly` keeps HTML's attribute name on the web (`readonly`), as the file item's own fixtures write it.
    itemProps: ({ readOnly, ...props }) => ({ ...props, ...(readOnly !== undefined ? { readonly: readOnly } : {}) }),
    itemsInScript: (fixture) => (fixture.props.rows ?? 'own') !== 'given' && (fixture.items ?? []).some((item) => item.kind === 'file'),
    after: async (element, fixture) => {
      const items = (fixture.items ?? []).filter((item) => item.kind === 'file');
      if ((fixture.props.rows ?? 'own') === 'given' || !items.length) return;
      const upload = element as HTMLElement & { formatSize: ((bytes: number) => string) | null; add: (files: File[]) => unknown; updateComplete: Promise<unknown> };
      const sizes = items.map((item) => String(item.props.sizeText ?? ''));
      if (sizes.some(Boolean)) upload.formatSize = (bytes) => sizes[bytes - 1] ?? '';
      // The kind a browser reports of a file its picker hands over, for the endings the fixtures use: a staged file
      // is judged by a media type of `accept` as a chosen one is (the fixture `tiles-own` takes `image/*`).
      const kinds: Record<string, string> = { pdf: 'application/pdf', png: 'image/png', jpeg: 'image/jpeg', jpg: 'image/jpeg', mov: 'video/quicktime' };
      const kind = (name: string) => kinds[name.slice(name.lastIndexOf('.') + 1).toLowerCase()] ?? '';
      upload.add(items.map((item, index) => new File([new Uint8Array(index + 1)], String(item.props.name ?? ''), { lastModified: 1767225600000, type: kind(String(item.props.name ?? '')) })));
      await upload.updateComplete;
      const rows = [...(upload.shadowRoot?.querySelectorAll('tanrei-file-item') ?? [])] as (Element & { updateComplete?: Promise<unknown> })[];
      await Promise.all(rows.map((row) => row.updateComplete));
    },
  },
  // A file picker is as wide as its layout gives it (FPK-1): its stage is the file upload's, a form's column 360 wide,
  // so that it is the same picture as the file upload's part above its list (FUP-56). `accept` is the comma-separated
  // list a native file input takes (the spec's web note).
  'file-picker': {
    css: () => `.stage > tanrei-file-picker { inline-size: 360px; }`,
    props: ({ accept, ...props }) => ({ ...props, ...(Array.isArray(accept) ? { accept: accept.join(',') } : {}) }),
  },
  // A drop zone wraps a screen of the product's (DRZ-1): its content is a sample screen — the fixture's content as a
  // paragraph above an outlined Button, on a surface 360 × 240 (the spec's default slot) — so that a picture shows the
  // overlay over real content. A fixture whose id begins `dragged` is drawn while a drag of one PDF is over the zone: the
  // step dispatches a dragenter and a dragover that carry it on the paragraph, as a browser does when a file from the
  // desktop enters it; nothing moves the pointer afterwards, so the drag stays (DRZ-7). `accept` is the
  // comma-separated list a native file input takes (the spec's web note).
  'drop-zone': {
    css: () => `.stage > tanrei-drop-zone { inline-size: 360px; block-size: 240px; }
      .drop-zone-sample { box-sizing: border-box; block-size: 100%; display: flex; flex-direction: column; align-items: flex-start; gap: 12px; padding: 16px;
        background: var(--tanrei-sys-color-surface-container-low); color: var(--tanrei-sys-color-on-surface); }
      .drop-zone-sample > p { margin: 0; font: var(--tanrei-sys-typescale-body-font); letter-spacing: var(--tanrei-sys-typescale-body-letter-spacing); }`,
    props: ({ accept, ...props }) => ({ ...props, ...(Array.isArray(accept) ? { accept: accept.join(',') } : {}) }),
    content: (content) => `<div class="drop-zone-sample"><p>${content}</p><tanrei-button variant="outlined">New video</tanrei-button></div>`,
    after: async (element, fixture) => {
      if (!fixture.id.startsWith('dragged')) return;
      const data = new DataTransfer();
      data.items.add(new File([new Uint8Array(4)], 'brief.pdf', { type: 'application/pdf' }));
      const drag = (type: string, on: Element) => on.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, composed: true, dataTransfer: data }));
      drag('dragenter', element.querySelector('p') ?? element);
      // A drag that enters one zone has left every other (DRZ-7): on a page of several fixtures, the zones staged
      // before this one are dragged over again, as a pointer that stood over each of them would.
      const staged = [...document.querySelectorAll('[data-fixture^="dragged"] > tanrei-drop-zone')] as (HTMLElement & { updateComplete: Promise<unknown> })[];
      for (const zone of staged) drag('dragover', zone.querySelector('p') ?? zone);
      await Promise.all(staged.map((zone) => zone.updateComplete));
    },
  },
  // A file item in the row form is as wide as its layout gives it (FIT-2): its stage is the file upload's column, 360
  // wide, so that a row alone is the same picture as a row of a file upload (FUP-58); a tile is as wide as its box
  // (FIT-3). A fixture names its picture as
  // `fixtures/avatar.png`, which is the package's own copy (test/pictures.ts). `readOnly` keeps HTML's attribute name
  // on the web (`readonly`).
  'file-item': {
    css: () => `.stage > tanrei-file-item:not([form='tile']) { inline-size: 360px; }`,
    props: ({ readOnly, ...props }) => ({ ...props, ...(readOnly !== undefined ? { readonly: readOnly } : {}) }),
    wrap: (element) => element.replaceAll('preview-src="fixtures/avatar.png"', `preview-src="${fixturePicture('fixtures/avatar.png')}"`),
  },
  // A radio group is as wide as its layout gives it (RGP-1): 320, as a field group — narrower than the row of
  // `horizontal-many` and than the texts of `long-label`, which rely on it (RGP-2's verify). Its radio buttons are the
  // fixture's items, as their own elements.
  'radio-group': {
    css: () => `.stage > tanrei-radio-group { inline-size: 320px; }`,
    wrap: (element, f) => framedLanguage(element, f, 'tanrei-radio-group'),
  },
  // A checkbox group is as wide as its layout gives it (CKG-1): 320, the width its twins — the field group's fixtures —
  // are drawn at, so that the two are the same picture. Its checkboxes are the fixture's items, the
  // product's own children. The fixture's `value` is a property and no attribute (the spec's web note): it is written
  // where HTML writes a first value, as `checked` on each child whose value the list holds (CKG-3).
  'checkbox-group': {
    css: () => `.stage > tanrei-checkbox-group { inline-size: 320px; }`,
    props: ({ value: _value, ...props }) => props,
    items: (spec, fixture) => itemsMarkup(spec, checkedItems(fixture), {}),
    wrap: (element, f) => framedLanguage(element, f, 'tanrei-checkbox-group'),
  },
  // A popover's stage is 480 × 480 with its anchor at the centre: a medium outlined Button labelled "Storage" (240 wide
  // for `width-anchor`), named by the popover's `anchor` (the spec's web note). The popover is open against it, drawn in
  // place (`inline`): the stage is its positioned ancestor and stands for the window. A fixture that names an `anchor`
  // of its own (a test's) is the real overlay, in the top layer. `inset: false` is the `no-inset` attribute; `arrow` is
  // true, false or unset, and its false is `="false"`. Its action items are `tanrei-button` children in the `actions` slot.
  popover: {
    css: () => `.stage:has(> tanrei-popover) { box-sizing: border-box; position: relative; inline-size: 480px; block-size: 480px; padding: 0; display: grid; place-items: center; }
      [data-fixture='width-anchor'] > tanrei-button { display: grid; inline-size: 240px; }`,
    props: ({ inset, arrow, anchor, ...props }, f) => ({
      ...props,
      anchor: anchor ?? `popover-anchor-${f.id}`,
      ...(anchor ? {} : { inline: true }),
      ...(inset === false ? { noInset: true } : {}),
      ...(arrow === undefined ? {} : { arrow: arrow === false ? 'false' : arrow }),
    }),
    itemAttributes: () => 'slot="actions"',
    wrap: (element, f) => `<tanrei-button id="${String(f.props.anchor ?? `popover-anchor-${f.id}`)}" variant="outlined">Storage</tanrei-button>${element}`,
  },
  // A bare select is as wide as its widest option would make it (SEL-49), and never wider than its layout gives it: its
  // stage is a form's column, 280 wide — the width the text field's fixtures are drawn at — so a value wider than that
  // is cut (the fixture long-value). An open fixture draws its list in place below the trigger — the `inline` test
  // attribute — in a stage 440 high that stands for the window (it holds a large container and a list at its greatest
  // height, and the rows of a Field around them); a test's own fixture with `inline: false` is the real overlay
  // instead. `readOnly` keeps HTML's attribute name on the web (`readonly`): `selectProps`.
  select: {
    css: () => `.stage:has(> tanrei-select) { box-sizing: content-box; inline-size: 280px; }
      .stage:has(> tanrei-select[open][inline]) { position: relative; block-size: 440px; }`,
    props: (props) => selectProps(props),
  },
  // A select field is as wide as its place (SEF-1, SEL-49: a composed field fills the width its layout gives it, and
  // its select fills it): its stage is 280 wide — the width its twins, the Field's `select-…` fixtures, are drawn at —
  // so that the two are the same picture. An open fixture draws its list in place below the trigger —
  // the select's `inline` test attribute, which the select field passes on — in a stage 440 high that stands for the
  // window; `readOnly` is the `readonly` attribute, as its member's. The fixtures written in Japanese and in Arabic
  // are drawn with the language set, as their twins are.
  'select-field': {
    css: () => `.stage > tanrei-select-field { inline-size: 280px; }
      .stage:has(> tanrei-select-field[open][inline]) { position: relative; block-size: 440px; }`,
    props: (props) => selectProps(props),
    wrap: (element, f) => framedLanguage(element, f, 'tanrei-select-field'),
  },
  // A combobox is as wide as its place (CMB-49), and a stage has no width to give: it is drawn as wide as a form's
  // column, 280 — the width the text input's and the select's fixtures are drawn at. An open fixture draws its list in
  // place below the box — the `inline` test attribute — in a stage 440 high that stands for the window; a test's own
  // fixture with `inline: false` is the real overlay instead. `readOnly` keeps HTML's attribute name on the web
  // (`readonly`), and `chevron`, a boolean that defaults to true, is the inverse attribute (`no-chevron`)
  // (`comboboxProps`).
  combobox: {
    css: () => `.stage:has(> tanrei-combobox) { box-sizing: content-box; inline-size: 280px; }
      ${COMBOBOX_OPEN_STAGE('tanrei-combobox')}`,
    props: comboboxProps,
  },
  // A combobox field is as wide as its place (CBF-1): the same column, 280 wide — the width its twins, the Field's
  // `combobox-…` fixtures, are drawn at — and the same stage for an open list, so that the two are the same picture
  //. Its props are spelled as its combobox's are.
  'combobox-field': {
    css: () => `.stage:has(> tanrei-combobox-field) { box-sizing: content-box; inline-size: 280px; }
      ${COMBOBOX_OPEN_STAGE('tanrei-combobox-field')}`,
    props: comboboxProps,
  },
  // A number field is as wide as its place (NUM-47): its stage is a form's column, 280 wide — the width its twins, the
  // Field's `number-…` fixtures, and the text field's fixtures are drawn at, so that a number field and its twin are the
  // same picture and a number field and a text field overlay line for line (NMI-2's verify). Two of its
  // props are other attributes on the web (`numberInputProps`).
  'number-field': {
    css: () => `.stage:has(> tanrei-number-field) { box-sizing: content-box; inline-size: 280px; }
      .stage:has(> tanrei-number-field) > tanrei-number-field { inline-size: 100%; }`,
    props: numberInputProps,
  },
  // A number input is as wide as its place too (NMI-36): the same column, so that a bare input's picture is the box of
  // the number field's fixture of the same id.
  'number-input': {
    css: () => `.stage:has(> tanrei-number-input) { box-sizing: content-box; inline-size: 280px; }`,
    props: numberInputProps,
  },
  // A color field is as wide as its place (CLF-43): its stage is a form's column, 280 wide — the width the text
  // field's fixtures are drawn at, so the two overlay line for line (CLI-2's verify), and the width its twins, the
  // Field's `color-…` fixtures, are drawn at, so that the two are the same picture. The fixtures written
  // in Japanese, Arabic and Hebrew are drawn with the language set, as a page in that language is — and as their twins
  // are, on the Field.
  'color-field': {
    css: () => `.stage:has(> tanrei-color-field) { box-sizing: content-box; inline-size: 280px; }`,
    wrap: (element, f) => framedLanguage(element, f, 'tanrei-color-field'),
  },
  // A color input is as wide as its place too (CLI-44): the same column, so that a bare input's picture is the box of
  // the color field's fixture of the same id.
  'color-input': {
    css: () => `.stage:has(> tanrei-color-input) { box-sizing: content-box; inline-size: 280px; }`,
    wrap: (element, f) => framedLanguage(element, f, 'tanrei-color-input'),
  },
  // A one-time-code input is as wide as its row needs and never wider than its layout (OTC-1, OTC-23): its stage is 400
  // wide, so that every fixture — the eight cells of `length-8-grouped`, which need 376, too — is drawn at full size,
  // and a right-to-left stage shows the row at its right edge (OTC-27). `readOnly` is the `readonly` attribute. The
  // fixture written in Japanese is drawn with the language set, as a page in that language is.
  'one-time-code-input': {
    css: () => `.stage:has(> tanrei-one-time-code-input) { box-sizing: content-box; inline-size: 400px; }`,
    props: ({ readOnly, ...props }) => ({ ...props, ...(readOnly !== undefined ? { readonly: readOnly } : {}) }),
    wrap: (element, f) => framedLanguage(element, f, 'tanrei-one-time-code-input'),
  },
  // A one-time-code field is as wide as its place (OTF-1, OTF-8: a composed field fills the width its layout gives
  // it): its stage is 280 wide — the width its twins, the Field's `code-…` fixtures, are drawn at — so that the two are
  // the same picture. `readOnly` is the `readonly` attribute, as its member's; the fixture written in
  // Arabic is drawn with the language set, as its twin is.
  // An image preview is in the top layer and fills its window. Its pictures are the package's own copies, embedded (`fixturePicture`): `fixtures/missing.png` fails at once and `fixtures/pending.png` never arrives.
  'image-preview': { wrap: (element) => element.replace(/(src|thumbnail-src)="(fixtures\/[^"]+)"/g, (_, name: string, src: string) => `${name}="${fixturePicture(src)}"`) },
  // A chip field is as wide as its place (CHF-1): its stage is a phone form's column, 280 wide — the width its twins,
  // the Field's `entries-…` fixtures, are drawn at — so that the two are the same picture. `readOnly` is
  // the `readonly` attribute, as its member's; `value` and `separators` are JSON arrays; the fixtures written in
  // Japanese, Arabic and Hebrew are drawn with the language set, as their twins are.
  'chip-field': {
    css: () => `.stage > tanrei-chip-field { inline-size: 280px; }`,
    props: ({ readOnly, ...props }) => ({ ...props, ...(readOnly !== undefined ? { readonly: readOnly } : {}) }),
    wrap: (element, f) => framedLanguage(element, f, 'tanrei-chip-field'),
  },
  'one-time-code-field': {
    css: () => `.stage:has(> tanrei-one-time-code-field) { box-sizing: content-box; inline-size: 280px; }`,
    props: ({ readOnly, ...props }) => ({ ...props, ...(readOnly !== undefined ? { readonly: readOnly } : {}) }),
    wrap: (element, f) => framedLanguage(element, f, 'tanrei-one-time-code-field'),
  },
  // A slider field is as wide as its place (SLF-13): its stage is 280 wide — the width its twins, the Field's
  // `slider-…` fixtures, are drawn at — so that the two are the same picture. The fixtures written in
  // Japanese, Arabic and Hebrew are drawn with the language set, as their twins are.
  'slider-field': {
    css: () => `.stage > tanrei-slider-field { inline-size: 280px; }`,
    wrap: (element, f) => framedLanguage(element, f, 'tanrei-slider-field'),
  },
  // A chat composer is as wide as its layout gives it (CCM-1): its stage is a column 480 wide — wider than
  // `layout.inline-min-width`, so that a fixture is laid out as its `layout` says (CCM-4). `accept` is the
  // comma-separated list a native file input takes. A fixture's string in the send or the stop slot is a labelled
  // Button of the filled variant, and one in the attach, the leading or the trailing slot an icon-only Button of the
  // text variant (the spec's accessibility notes). A File item's picture is the package's own copy (test/pictures.ts).
  //
  // A fixture whose `attachments` is `own` and that holds `file` items cannot be markup alone: the element keeps its
  // own files and a file is no attribute (CCM-22). Each item stands for one file the stage hands over after the
  // element is defined, by `addFiles()`, in order: named by the item's `name`, of the kind a browser reports for that
  // ending, with one fixed time of last change — as many zero bytes long as its place among the items, or, for a name
  // that ends in an image's extension, one of the stage's own pictures (`data-stage-pictures`, which the element does
  // not read), so that a tile draws it. Whether each is kept or refused is the element's own judging; an item's
  // `sizeText` is not drawn, since a kept file's File item is given no size (CCM-22). The items are not also written
  // as children. The documentation's renderer stages the same way (apps/docs/src/lib/fixtures.ts).
  'chat-composer': {
    css: () => `.stage:has(> tanrei-chat-composer) { box-sizing: content-box; inline-size: 480px; }`,
    props: ({ accept, ...props }) => ({ ...props, ...(Array.isArray(accept) ? { accept: accept.join(',') } : {}) }),
    itemsInScript: (fixture) => fixture.props.attachments === 'own' && (fixture.items ?? []).some((item) => item.kind === 'file'),
    wrap: (element, f) => {
      const pictured = element
        .replace(/preview-src="(fixtures\/[^"]+)"/g, (_, src: string) => `preview-src="${fixturePicture(src)}"`)
        .replace(/<tanrei-button slot="(send|stop)" variant="text">/g, '<tanrei-button slot="$1" variant="filled">');
      const staged = f.props.attachments === 'own' && (f.items ?? []).some((item) => /\.(png|jpe?g)$/i.test(String(item.props.name ?? '')));
      return staged ? pictured.replace('<tanrei-chat-composer ', `<tanrei-chat-composer data-stage-pictures="${[1, 2, 3].map((n) => fixturePicture(`fixtures/chat-composer-photo-${n}.png`)).join(' ')}" `) : pictured;
    },
    after: async (element, fixture) => {
      const items = (fixture.items ?? []).filter((item) => item.kind === 'file');
      if (fixture.props.attachments !== 'own' || !items.length) return;
      const composer = element as HTMLElement & { addFiles: (files: File[]) => unknown; updateComplete: Promise<unknown> };
      const kinds: Record<string, string> = { pdf: 'application/pdf', png: 'image/png', jpeg: 'image/jpeg', jpg: 'image/jpeg', csv: 'text/csv', mov: 'video/quicktime' };
      const kind = (name: string) => kinds[name.slice(name.lastIndexOf('.') + 1).toLowerCase()] ?? '';
      const pictures = (element.getAttribute('data-stage-pictures') ?? '').split(' ').filter(Boolean).map((url) => Uint8Array.from(atob(url.slice(url.indexOf(',') + 1)), (c) => c.charCodeAt(0)));
      let images = 0;
      const files = items.map((item, index) => {
        const name = String(item.props.name ?? '');
        const picture = kind(name).startsWith('image/') ? pictures[images++ % (pictures.length || 1)] : undefined;
        return new File([picture ?? new Uint8Array(index + 1)], name, { lastModified: 1767225600000, type: kind(name) });
      });
      composer.addFiles(files);
      await composer.updateComplete;
      const rows = [...(composer.shadowRoot?.querySelectorAll('tanrei-file-item') ?? [])] as (Element & { updateComplete?: Promise<unknown>; preview?: boolean })[];
      await Promise.all(rows.map((row) => row.updateComplete));
      // A tile's picture is drawn of the file itself, a moment after the tile: it is waited for, for a second at most.
      const drawn = () => rows.every((row) => !row.preview || [...(row.shadowRoot?.querySelectorAll('img') ?? [])].some((img) => img.complete && img.naturalWidth > 0));
      for (let tries = 0; tries < 60 && !drawn(); tries++) await new Promise((resolve) => requestAnimationFrame(resolve));
    },
  },
  // An embedded text input is as wide as its layout gives it (ETI-1): its stage is 280 wide, a narrow column, so that
  // `single-line-long` is cut and `multiline-long-unbroken` breaks. A fixture is drawn bare on the stage — every pixel
  // that is not text is the stage's — but for the ones whose id begins `held-`, which are drawn inside the sample
  // holder (`sampleHolderCss`): the holder's contract, shown. The step in script is
  // the holder's one line for a press on its own padding (H4). `readOnly` is the `readonly` attribute; the fixtures
  // written in Arabic are drawn with the language set.
  'embedded-text-input': {
    css: () => `.stage:has(tanrei-embedded-text-input) { box-sizing: content-box; inline-size: 280px; }
      ${sampleHolderCss}`,
    props: ({ readOnly, ...props }) => ({ ...props, ...(readOnly !== undefined ? { readonly: readOnly } : {}) }),
    wrap: (element, f) => {
      const staged = framedLanguage(element, f, 'tanrei-embedded-text-input');
      return f.id.startsWith('held-') ? `<div class="capsule">${staged}</div>` : staged;
    },
    after: (element) => {
      const capsule = element.closest('.capsule');
      capsule?.addEventListener('mousedown', (event) => {
        if (event.target !== capsule) return;
        event.preventDefault();
        (element as HTMLElement & { focusAt: (x: number, y: number) => void }).focusAt((event as MouseEvent).clientX, (event as MouseEvent).clientY);
      });
    },
  },
  // Every menu fixture is drawn for the Apple keyboard (MNU-19's verify): the menu is the ambient convention's ancestor
  // (`data-tanrei-keyboard-convention`, KBS-2) of its items' shortcuts.
  // A fixture with an open submenu (MNU-19's verify) is drawn on a stage wide and tall enough for every open level: each
  // open submenu is drawn beside its item, outside the menu's own box, so it gives the stage no size of its own.
  // A menubar spans a 560-wide stage (W 528): the seven titles of `default` fit, and the twelve of `many`, the Arabic
  // twelve and the four long labels fold (MBR-21's verify). A fixture cannot fill a bar's menu (the item kinds are the
  // menu's, and a spec names only its own), so a fixture with a menu open draws the open title over an
  // empty surface, in place (`inline`, as a menu's fixtures are) with room below the bar for it.
  menubar: {
    css: () => `.stage:has(> tanrei-menubar) { box-sizing: border-box; inline-size: 560px; }
      .stage:has(> tanrei-menubar[inline]) { padding-block-end: 48px; }`,
    props: (props, f) => (f.items?.some((item) => item.props.open === true) ? { ...props, inline: true } : props),
    // A link item is the element around the product's own anchor, not one element with its props as attributes.
    items: menubarMarkup,
  },
  menu: {
    css: () => `.stage:has(> tanrei-menu[inline]) { padding-block-end: 24px; }
      .stage:has(> tanrei-menu[inline] tanrei-submenu[open]) { box-sizing: border-box; inline-size: 480px; padding-block-end: 176px; }
      .stage:has(> tanrei-menu[inline] tanrei-submenu[open] tanrei-submenu[open]) { inline-size: 720px; }`,
    props: (props) => ({ ...(props.anchor ? props : { ...props, inline: true }), 'data-tanrei-keyboard-convention': 'apple' }),
    wrap: (element, f) => (f.props.anchor ? `<button id="${String(f.props.anchor)}" type="button">${String(f.props.anchor)}</button>${element}` : element),
  },
};

/**
 * What a document of a spec's fixtures is made of.
 * `system` mounts a preset the way a product does: its opt-in stylesheet plus `data-tanrei-system` on <html>.
 * `systemCss` supplies that stylesheet for a system built in the test (a product's own layer); `fixtures` replaces the spec's.
 * `icons` registers the icon faces the default system and `system` name, for fixtures whose content is a glyph.
 */
export interface DocumentOptions {
  theme?: 'light' | 'dark';
  /** The document's layout direction: `dir` on <html>. Left out, the document carries no `dir` (left-to-right). */
  dir?: 'ltr' | 'rtl';
  system?: string;
  systemCss?: string;
  fixtures?: Fixture[];
  icons?: boolean;
  /**
   * Each fixture that names a twin is followed by the twin's stage — that fixture of its member, made by
   * hand one level down — marked `data-twin-of="<the fixture's id>"`: the two are compared in one run, and the review
   * gallery draws them one under the other.
   */
  twins?: boolean;
  /** Markup of the page's own that stands before the stages (a page taller than its window: `open-at-load.test.ts`). */
  lead?: string;
  /**
   * Fetch the large assets from these URLs instead of embedding them. A test's page embeds everything, so it loads
   * nothing and cannot race; a page of many frames (the review gallery) would embed the same megabytes in each, and
   * asks for URLs its frames share one cache for. `systemCss` is then the server's business, not the document's.
   */
  assets?: AssetUrls;
}
export interface AssetUrls {
  /** The text face's @font-face rules. */
  font: string;
  /** The default system's stylesheet (every token). */
  tokens: string;
  /** A preset's opt-in stylesheet, by its id. */
  system: (id: string) => string;
  /** The @font-face rules for these icon families. */
  icons: (families: string[]) => string;
  /** The bundle that defines every component. */
  bundle: string;
}

/** The stylesheet of the mounted preset, as the document embeds it. */
const systemStyles = (options: DocumentOptions) => (options.system ? (options.systemCss ?? read(`dist/systems/${options.system}.css`)) : '');

/** The icon families the document registers: none unless it was asked for icons (see `iconFamilies`). */
const documentIconFamilies = (options: DocumentOptions) => (options.icons ? iconFamilies(read('dist/tokens.css'), systemStyles(options)) : Promise.resolve([]));

/** One fixture of `spec` in its stage, as the spec's staging says; `mark` is the attribute the stage is found by. */
function stageMarkup(spec: Spec, f: Fixture, mark: string): string {
  const staging = STAGING[spec.name] ?? {};
  // Markup given by a test is used as it is; the spec's content (a name) is staged.
  const content = f.content === undefined ? '' : staging.content && !f.content.includes('<') ? staging.content(f.content, f.props) : f.content;
  const children = staging.items ? staging.items(spec, f) : staging.children ? staging.children(f) : f.items && !staging.itemsInScript?.(f) ? itemsMarkup(spec, f.items, staging) : '';
  const attrs = attributes(spec.props, spec.platforms.web.props, staging.props ? staging.props(f.props, f) : f.props);
  const own = staging.tag?.(f) ?? spec.platforms.web.name;
  const element = staging.element ? staging.element(f, attrs) : `<${own} ${attrs}>${children}${slotsMarkup(spec, f.slots)}${content}</${own}>`;
  // The stage's color, where the fixture names a surface role for it: an ancestor of the component, as its direction is.
  const surface = f.surface ? ` style="background: var(--tanrei-sys-color-${f.surface})"` : '';
  return `<div class="stage" ${mark}${f.direction ? ` dir="${f.direction}"` : ''}${surface}>${staging.wrap ? staging.wrap(element, f) : element}</div>`;
}

/**
 * The document of a spec's fixtures: every fixture (or `options.fixtures`) in its own padded, surface-colored stage,
 * with the tokens, the preset, the faces and the component bundle the stages need. A fixture that names a `direction`
 * has it as its stage's `dir`, whatever the document's is.
 */
export async function fixturesDocument(spec: Spec, options: DocumentOptions = {}): Promise<string> {
  const tag = spec.platforms.web.name;
  const staging = STAGING[spec.name] ?? {};
  // With `twins`, each fixture that names a twin is followed by that fixture of its member, staged as the
  // member's own fixtures are. It is marked `data-twin-of`, never `data-fixture`: nothing that finds a fixture finds it.
  const twinSpecs = new Map<string, Spec>();
  const twinStage = (f: Fixture) => {
    const twin = options.twins ? twinOf(f) : undefined;
    if (!twin) return '';
    twinSpecs.set(twin.spec.name, twin.spec);
    return `\n${stageMarkup(twin.spec, twin.fixture, `data-twin-of="${f.id}"`)}`;
  };
  const stages = (options.fixtures ?? spec.fixtures).map((f) => `${stageMarkup(spec, f, `data-fixture="${f.id}"`)}${twinStage(f)}`).join('\n');
  const twinCss = [...twinSpecs.values()].map((twin) => STAGING[twin.name]?.css?.() ?? '').join('\n');
  const assets = options.assets;
  const families = await documentIconFamilies(options);
  const iconFaces = families.length && !assets ? await presetFontFaces(families) : '';
  const sheet = (href: string | undefined, embed: () => string) => (href ? `<link rel="stylesheet" href="${href}" />` : `<style>${embed()}</style>`);
  const icons = families.length ? sheet(assets?.icons(families), () => iconFaces) : '';
  // A preset's own text faces (Roboto for the m3 presets), embedded as the icon faces are; a page given asset URLs has
  // them in its shared font sheet.
  const text = options.system && !assets ? await presetTextFontFaces(systemStyles(options)) : '';
  // A page's frame holds the page's own main region: its stages stand in a `div` (see `Staging.page`).
  const holder = staging.page ? 'div' : 'main';
  return `<!doctype html>
<html lang="en" data-tanrei-theme="${options.theme ?? 'light'}"${options.system ? ` data-tanrei-system="${options.system}"` : ''}${options.dir ? ` dir="${options.dir}"` : ''}>
  <head>
    <meta charset="utf-8" />
    <title>${spec.name} fixtures</title>
    ${sheet(assets?.font, fontFace)}
    ${icons}
    ${text ? `<style>${text}</style>` : ''}
    ${sheet(assets?.tokens, () => read('dist/tokens.css'))}
    ${options.system ? sheet(assets?.system(options.system), () => systemStyles(options)) : ''}
    <style>
      body { margin: 0; background: var(--tanrei-sys-color-surface); }
      ${staging.page ? '' : 'main { display: flex; flex-direction: column; align-items: flex-start; }'}
      .stage { padding: 16px; background: var(--tanrei-sys-color-surface); }
    </style>
    ${staging.css ? `<style>${staging.css()}</style>` : ''}
    ${twinCss.trim() ? `<style>${twinCss}</style>` : ''}
  </head>
  <body>${options.lead ?? ''}<${holder}${staging.page ? ' class="stages"' : ''}>${stages}</${holder}>${assets ? `<script type="module" src="${assets.bundle}"></script>` : `<script type="module">${read('dist/tanrei.bundle.js')}</script>`}${staging.after ? afterScript(tag, options.fixtures ?? spec.fixtures, staging.after) : ''}</body>
</html>`;
}

/**
 * Runs in the page: resolves when the faces the page has asked for are loaded — `document.fonts.ready`, or the state
 * Firefox leaves the set in when a page is mounted a second time with a face the first mount did not register.
 *
 * `page.setContent()` writes the new document into the same window (`document.open()`), and the window's FontFaceSet
 * outlives it. In Firefox (Playwright 1.63's build, any load), after a mount without the icon faces and a second one
 * with them, every face reaches `loaded` but the set's `status` stays `loading` and `ready` never resolves: the test
 * would die at its 30 s timeout, in whichever test mounts twice that way (TAB-4, TAB-14, and under every component's
 * Firefox run; it does so every time, whatever the machine's load).
 * That contradiction — the set loading while none of its faces is — seen in three frames running, each after a layout
 * that would have asked for a missing face, is taken as ready. Nothing else is: a face that is still loading is waited
 * for as before.
 */
function facesReady(): Promise<void> {
  return new Promise<void>((resolve) => {
    let done = false;
    let frames = 0;
    const finish = () => {
      done = true;
      resolve();
    };
    void document.fonts.ready.then(finish);
    const look = () => {
      if (done) return;
      void document.body?.offsetWidth;
      const contradiction = document.fonts.status === 'loading' && [...document.fonts].every((face) => face.status !== 'loading');
      frames = contradiction ? frames + 1 : 0;
      if (frames >= 3) finish();
      else requestAnimationFrame(look);
    };
    requestAnimationFrame(look);
  });
}

/** Render every fixture of a spec in the page, and wait until the components and their faces are drawn. */
export async function mountFixtures(page: Page, spec: Spec, options: DocumentOptions & { reducedMotion?: boolean } = {}) {
  const tag = spec.platforms.web.name;
  // Only when asked: a test that emulated reduced motion itself keeps it across mounts.
  if (options.reducedMotion !== undefined) await page.emulateMedia({ reducedMotion: options.reducedMotion ? 'reduce' : 'no-preference' });
  await page.setContent(await fixturesDocument(spec, options));
  // A spec that is a class on the web (prose) defines no element to wait for.
  if (!STAGING[spec.name]?.element) await page.waitForFunction((t) => !!customElements.get(t), tag);
  // A step in script (`Staging.after`) has run for every fixture before anything is measured or recorded.
  if (STAGING[spec.name]?.after) await page.waitForFunction((mark) => document.documentElement.hasAttribute(mark), STAGED);
  await page.evaluate(facesReady);
  // An icon face is fetched when a glyph first needs it — after the element rendered, which may be after `fonts.ready`
  // resolved for the text: load the icon set's two families (as the page's scope resolves them) before anything is drawn.
  if ((await documentIconFamilies(options)).length) {
    await page.evaluate(async () => {
      const style = getComputedStyle(document.documentElement);
      const families = ['unselected', 'selected'].map((s) => style.getPropertyValue(`--tanrei-sys-icon-family-${s}`).trim());
      await Promise.all(families.map((family) => document.fonts.load(`24px ${family}`, 'favorite')));
    });
    await page.evaluate(facesReady);
  }
}

/** Where each stage of a spec's page of all its fixtures begins, as the part of a pixel past a whole one: measured once for a worker, by spec and options. */
const stagePlaces = new Map<string, Promise<Record<string, number>>>();

/**
 * Renders ONE fixture of a spec, drawn as it is on the page of all of them — for the picture of its stage (a
 * `snapshot:` test), which then does not mount some hundreds of fixtures to draw one (the Field's 366: 2 s a mount, and
 * what a locator costs grows with the document).
 *
 * A stage's picture depends on one thing outside the stage: where it begins. The stages stand in a column, and where
 * the ones above are not whole pixels high a stage begins part of a pixel down; its picture is then cut at the whole
 * pixels around it, a pixel taller, with the stage that part of a pixel in. So the page of all the fixtures is mounted
 * ONCE for a worker (by spec and options), every stage's place is read from it, and the one fixture is mounted with
 * that part of a pixel above it (`lead`). The pictures are the same to the pixel (compared in Chromium, every fixture
 * of the text input, the tabs, the combobox, the select and the number input and every sixth of the Field's).
 */
export async function mountFixtureAsInAll(page: Page, spec: Spec, fixture: Fixture, options: DocumentOptions & { reducedMotion?: boolean } = {}) {
  const key = `${spec.name} ${JSON.stringify(options, (name, value) => (name === 'assets' ? undefined : value))}`;
  let places = stagePlaces.get(key);
  if (!places) {
    places = (async () => {
      await mountFixtures(page, spec, options);
      return page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>('[data-fixture]')].map((stage) => [stage.dataset.fixture!, (stage.getBoundingClientRect().top + window.scrollY) % 1])));
    })();
    stagePlaces.set(key, places);
    // A mount that failed is not what the next test reads.
    places.catch(() => stagePlaces.delete(key));
  }
  const down = (await places)[fixture.id] ?? 0;
  await mountFixtures(page, spec, { ...options, fixtures: [fixture], lead: `${options.lead ?? ''}${down ? `<div style="block-size: ${down}px"></div>` : ''}` });
}

/**
 * A glyph's missing-font rule (CHK-19, LST-27, SEG-25, SRC-30, FBM-24) observed on any machine: the icon set names a
 * family no machine has (the default's may be installed locally), so its font is missing, as on a page that has not
 * loaded it (yet); another `family` names another missing one. Returns the family, for `iconFaceArrives()`.
 */
export const MISSING_ICON_FAMILY = 'Tanrei Missing Icons';
export async function withoutIconFont(page: Page, family = MISSING_ICON_FAMILY): Promise<string> {
  await rootTokens(page, Object.fromEntries(['selected', 'unselected'].map((s) => [`--tanrei-sys-icon-family-${s}`, `"${family}"`])));
  return family;
}

/** The font of `withoutIconFont()` arrives: the default system's icon face, registered under the missing family's name. */
export async function iconFaceArrives(page: Page, family = MISSING_ICON_FAMILY) {
  const [real] = await iconFamilies(read('dist/tokens.css'), '');
  await page.addStyleTag({ content: (await presetFontFaces([real])).replaceAll(real, family) });
  await page.evaluate(async (name) => {
    await document.fonts.load(`24px "${name}"`, 'check');
  }, family);
  await page.evaluate(facesReady);
}

/**
 * Writes custom properties on the root's inline style, in the page (a value of `''` takes the name off). The one way a
 * test sets a token on the root: with the write, the NUMBER of the root's custom properties changes — a name of the
 * helper's own is added, one more for each name taken off, so that the number grows whatever the write did. WebKit
 * compares the root's set of custom properties with the one before, for each element and value by value until the
 * first that differs, when the two have the same size (1 to 10 s for a page of fixtures); a set of another size is not
 * compared (README, "A single token set on the root from script is slow in WebKit"). What the page draws is the same.
 *
 * Self-contained, so that it can be given to `page.evaluate()`; `rootTokens()` is that call, and `rootTokensInPage()`
 * leaves it on the page as `window.rootTokens` for a script of the page that writes in the middle of its own work.
 */
export function writeRootTokens(vars: Record<string, string>): void {
  const root = document.documentElement.style;
  const counter = window as unknown as { tanreiRootWrites?: number };
  let own = 1;
  for (const [name, value] of Object.entries(vars)) {
    if (value === '') (root.removeProperty(name), own++);
    else root.setProperty(name, value);
  }
  for (; own > 0; own--) root.setProperty(`--root-write-${(counter.tanreiRootWrites = (counter.tanreiRootWrites ?? 0) + 1)}`, '1');
}
export const rootTokens = (page: Page, vars: Record<string, string>): Promise<void> => page.evaluate(writeRootTokens, vars);
export const rootTokensInPage = (page: Page): Promise<void> =>
  page.evaluate((source) => {
    (window as unknown as { rootTokens: unknown }).rootTokens = new Function(`return (${source})`)();
  }, writeRootTokens.toString());

/**
 * The value a length or duration token actually resolves to, in px or ms. Custom properties hold
 * expressions (`round(nearest, calc(var(--dial) * 3), 0.25px)`), so they are resolved by applying
 * them to a real property on a probe element.
 */
export async function resolveToken(page: Page, name: string, kind: 'length' | 'duration' = 'length'): Promise<number> {
  return page.evaluate(
    ([n, k]) => {
      const probe = document.createElement('div');
      probe.style.cssText = k === 'length' ? `position:absolute;visibility:hidden;width:var(${n})` : `transition-duration:var(${n})`;
      document.body.appendChild(probe);
      const computed = getComputedStyle(probe);
      const value = k === 'length' ? Number.parseFloat(computed.width) : Number.parseFloat(computed.transitionDuration) * 1000;
      probe.remove();
      return value;
    },
    [name, kind] as const,
  );
}

/** The color a token resolves to in the page's current scheme, as the browser serializes it. */
export async function resolveColor(page: Page, name: string): Promise<string> {
  return page.evaluate((n) => {
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute;visibility:hidden;background-color:var(${n})`;
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value;
  }, name);
}

/**
 * Keyboard focus moves as a person's Tab does. Safari on macOS gives buttons to Option+Tab and keeps plain Tab for
 * text fields; every other engine and platform uses Tab. The component must not care, and does not.
 */
export async function tab(page: Page, { back = false }: { back?: boolean } = {}) {
  const safariOnMac = page.context().browser()?.browserType().name() === 'webkit' && process.platform === 'darwin';
  await page.keyboard.press(`${back ? 'Shift+' : ''}${safariOnMac ? 'Alt+' : ''}Tab`);
}

/**
 * Tab until `host` has keyboard focus. Where Tab starts after a click on the page is the browser's business —
 * Chromium and WebKit continue from the clicked node, Firefox from the caret position nearest the click, which may lie
 * after the first control, and headless Firefox does not wrap around at the last one — so tests say which control
 * they mean instead of counting presses: forwards, and backwards once Tab stops moving.
 *
 * `host` may also be an element inside a shadow root (one of a component's two tab stops, a chip's remove action): it
 * is reached when its root's active element is it, and Tab is seen to move when the focus moves inside a shadow root.
 */
export async function tabTo(page: Page, host: Locator) {
  let back = false;
  let last = '';
  // Enough presses to cross the longest page of fixtures there and back (the Button's 50 stages; a button with menu's
  // 33 stages of two stops each).
  for (let presses = 0; presses < 240; presses++) {
    await tab(page, { back });
    if (await host.evaluate((el) => el === (el.getRootNode() as Document | ShadowRoot).activeElement)) return;
    const now = await page.evaluate(() => {
      const path: number[] = [];
      let root: Document | ShadowRoot = document;
      for (let active = root.activeElement; active; active = root.activeElement) {
        path.push([...root.querySelectorAll('*')].indexOf(active));
        if (!active.shadowRoot) break;
        root = active.shadowRoot;
      }
      return path.join('/');
    });
    if (now === last) back = !back;
    last = now;
  }
  // Say where the focus was left: a focus that no longer moves either way is a finding about the component (a press
  // that left WebKit's navigation starting point inside a focused button, NVB-5), not about the key.
  const stuck = await page.evaluate(() => {
    const path: string[] = [];
    let root: Document | ShadowRoot = document;
    for (let active = root.activeElement; active; active = root.activeElement) {
      path.push(`${active.localName}${active.id ? `#${active.id}` : ''}${active.classList.length ? `.${[...active.classList].join('.')}` : ''}`);
      if (!active.shadowRoot) break;
      root = active.shadowRoot;
    }
    return path.join(' > ') || '(nothing)';
  });
  throw new Error(`tabTo: the control was never reached by Tab (the focus ended on ${stuck})`);
}

// ── The product's words ─────────────────────────────────────────────────────────────────────────────────────────────
// A test is the product there: it gives its words itself, by a fixture's props or — for what a product says once — by
// `setWords()`, as a product does. The page's components come from the bundle, whose exports a mounted document cannot
// reach, so the test loads `@tanrei/web/words` beside it: a second copy of the module, which holds the same sets as the
// bundle's (src/primitives/words.ts keeps them under a registered symbol). The harness itself never sets a word for a
// fixture: a fixture that forgot one must show the gap.
let wordsScript: string | undefined;
async function wordsApi(page: Page) {
  if (await page.evaluate(() => 'tanreiWordsApi' in globalThis)) return;
  wordsScript ??= buildSync({
    entryPoints: [path.join(pkg, 'dist/words.js')],
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'tanreiWordsApi',
    define: { 'process.env.NODE_ENV': '"development"' },
  }).outputFiles[0].text;
  await page.addScriptTag({ content: wordsScript });
}

/** `setWords()` of `@tanrei/web`, called in the page as a product calls it. */
export async function setWords(page: Page, words: Record<string, string>, options: { lang?: string } = {}) {
  await wordsApi(page);
  await page.evaluate(([w, o]) => (globalThis as unknown as { tanreiWordsApi: { setWords: (words: unknown, options: unknown) => void } }).tanreiWordsApi.setWords(w, o), [words, options] as const);
}

/** `missingWords()` of `@tanrei/web`, asked in the page. */
export async function missingWords(page: Page): Promise<string[]> {
  await wordsApi(page);
  return page.evaluate(() => (globalThis as unknown as { tanreiWordsApi: { missingWords: () => string[] } }).tanreiWordsApi.missingWords());
}

/**
 * What a field frame draws and exposes as its requirement, for the tests of FLD-24 and its copies: the tag's (or the
 * chip's) words where one is drawn, whether the asterisk is drawn, the requirement said in words in the description,
 * and the required state.
 */
export async function requirementDrawn(host: Locator): Promise<{ tag: string | null; asterisk: boolean; said: string | null; required: boolean }> {
  await host.evaluate((el) => (el as HTMLElement & { updateComplete?: Promise<unknown> }).updateComplete);
  const visible = async (part: Locator) => (await part.count()) > 0 && (await part.first().isVisible());
  const tag = host.locator('.label-row .requirement-tag, .label-row > .chip');
  const words = (await visible(tag)) ? ((await tag.first().getAttribute('label')) ?? ((await tag.first().textContent()) ?? '').trim()) : null;
  const rest = await host.evaluate((el) => ({
    said: el.shadowRoot!.querySelector('#requirement')?.textContent?.trim() ?? null,
    required: !!el.shadowRoot!.querySelector('[aria-required="true"], input:required, textarea:required'),
  }));
  return { tag: words, asterisk: await visible(host.locator('.label-row .asterisk')), ...rest };
}

/**
 * The inside focus ring of a region that scrolls (`focusRing(on, { inside: true })` on a scroll container), looked at as
 * it is painted: with the inner stroke made 4 wide and magenta under an outer stroke of 2, is the middle of the inner
 * stroke magenta at the region's top and bottom edges? Call it with the region focused from the keyboard; it reads one
 * pixel of a screenshot at each edge. A stroke drawn by a box that scrolls with the content leaves both edges once the
 * region is scrolled.
 */
export async function innerStrokeAtEdges(page: Page, region: Locator): Promise<{ top: boolean; bottom: boolean }> {
  await page.evaluate(() => {
    const style = document.documentElement.style;
    style.setProperty('--tanrei-sys-focus-outer-width', '2px');
    style.setProperty('--tanrei-sys-focus-inner-width', '4px');
    style.setProperty('--tanrei-sys-color-focus-ring-inner', 'rgb(255, 0, 255)');
  });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const box = (await region.boundingBox())!;
  const magenta = async (x: number, y: number) => {
    const shot = await page.screenshot({ clip: { x: Math.floor(x), y: Math.floor(y), width: 1, height: 1 } });
    const [r, g, b] = await page.evaluate(async (data) => {
      const image = new Image();
      image.src = `data:image/png;base64,${data}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      context.drawImage(image, 0, 0);
      return [...context.getImageData(0, 0, 1, 1).data];
    }, shot.toString('base64'));
    return r! > 200 && g! < 80 && b! > 200;
  };
  const x = box.x + box.width / 2;
  return { top: await magenta(x, box.y + 4), bottom: await magenta(x, box.y + box.height - 4) };
}
