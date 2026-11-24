// Export: a side sheet over the Studio, opened from its bar. At its top, one line — a glyph and a sentence — says what
// the schema, the token engine and the build's checks say of the file; under it, for a layer on an example of the theme
// gallery, whether the file depends on the example or holds every value itself (core.writeOut); then four tabs — the
// file, the commands that take it into a product, what its stylesheet changes (core.sheetChanges), and what to do next,
// step by step. At the sheet's foot, whichever tab is shown, the file's download and the link to share. Everything
// shown is the engine's and the build's own output for this layer, never a sketch of it; a command is shown only as
// the CLI takes it — which is a file (`tanrei init --from`), never the link.
import { ID_PATTERN, stringifyLayer } from '../core.js';
import { type Ctx, type Json, type Layer, button, choice, h, isolated, linkButton, rich, tabbed, textField } from './dom';
import { copyLayerLink } from './share';

/** The glyph of the line at the top for each thing it says, and the foot's (declared: the docs site's icon file is cut to them). */
const STATUS_GLYPHS = { success: 'verified', warning: 'warning', error: 'error' };
const DOWNLOAD_GLYPH = 'download';
const LINK_GLYPH = 'link';

type Tab = 'file' | 'command' | 'css' | 'next';
const TABS: Tab[] = ['file', 'command', 'css', 'next'];

export interface ExportOptions {
  /** The file the layer lives in, when the host edits one (`adapter.label`): the Studio saves it, and nothing is downloaded to put it there. */
  file?: string;
  /** The page's address holds the layer (`address`): a link to it can be copied. */
  linked: boolean;
  links: { layers?: string; start?: string };
  /** Go to a section of the rail: the sheet closes first. */
  onshow(section: 'a11y'): void;
  /** Say what an action of the sheet did, in a snackbar over it. */
  notify(message: string): void;
}

/** Hand the person a file to save, named as `tanrei build` and `tanrei init` name it. */
export function saveFile(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = h('a', { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function createExportSheet(ctx: Ctx, options: ExportOptions) {
  const { t, studio } = ctx;
  const words = t.exporting;
  let tab: Tab = 'file';
  let every = false;
  let shown = false;

  // The layer written out, and what the build says of it, computed on the side once for each layer (core.check).
  let writtenFor = '';
  let written: (Json & { problems: string[]; warnings: string[] }) | null = null;
  const writtenOut = (layer: Layer) => {
    const key = JSON.stringify(layer);
    if (key !== writtenFor) {
      writtenFor = key;
      const out = studio.writeOut(layer) as Json | null;
      written = out ? { ...out, ...(studio.check(out.layer) as { problems: string[]; warnings: string[] }) } : null;
    }
    return written;
  };
  /** What is exported: the layer as it is, or written out; and what the build says of that file. */
  const exported = () => {
    const layer = ctx.layer();
    const latest = ctx.latest();
    const out = every ? writtenOut(layer) : null;
    if (out) return { layer: out.layer as Layer, problems: out.problems, warnings: out.warnings, out };
    return { layer, problems: latest.problems as string[], warnings: latest.model ? (latest.warnings as string[]) : [], out: null };
  };
  const nameOf = (id: string) => studio.systems.find((system: Json) => system.id === id)?.name ?? id;
  // A system's name in a sentence is a run of its own direction: an element in a sentence of the dictionary, or — in a
  // label, which is text — between the isolates that keep "M3-like (Material 3-inspired)" whole in Arabic.
  const run = (text: string) => `\u2068${text}\u2069`;
  const fileName = (layer: Layer) => `${layer.id}.system.json`;

  // ── the line at the top ───────────────────────────────────────────────────────────────────────
  // One line: the glyph of what the checks say and the sentence that says it — which starts with the state, so the
  // glyph is not read — in a live region, as the file changes under it. A file with problems lists the first of them
  // under the line; one with warnings offers, at the line's end, the way to where they are listed.
  const glyph = (name: string) => h('span', { class: `${studio.tagPrefix}-icon`, slot: 'icon', 'aria-hidden': 'true', translate: 'no' }, name);
  const statusGlyph = h('span', { class: `${studio.tagPrefix}-icon ts-export-status-glyph`, 'aria-hidden': 'true', translate: 'no' });
  const statusText = h('span', { class: 'ts-export-status-text' });
  const statusLine = h('p', { class: 'ts-export-status-line' }, statusGlyph, statusText);
  const status = h('div', { class: 'ts-export-status', role: 'status', 'data-export-status': true }, statusLine);
  function drawStatus(problems: string[], warnings: string[]) {
    const state = problems.length ? 'error' : warnings.length ? 'warning' : 'success';
    status.dataset.state = state;
    statusGlyph.textContent = STATUS_GLYPHS[state];
    statusText.textContent = problems.length ? words.invalid(problems.length) : warnings.length ? words.warned(warnings.length) : words.valid;
    status.querySelector('.ts-checks')?.remove();
    statusLine.querySelector('[data-export-warnings]')?.remove();
    if (problems.length) status.append(h('ul', { class: 'ts-checks' }, problems.slice(0, 5).map((problem) => h('li', { 'data-state': 'problem' }, isolated(problem)))));
    else if (warnings.length) statusLine.append(linkButton(words.seeWarnings, () => (close(), options.onshow('a11y')), { 'data-export-warnings': true }));
  }

  // ── what the file holds: the example's values, or every value ───────────────────────────────
  const values = h('div', { class: 'ts-stack ts-export-values', 'data-export-values': true });
  function drawValues(out: Json | null) {
    const layer = ctx.layer();
    const examples = studio.examplesOf(layer) as Json[];
    values.hidden = !examples.length;
    if (!examples.length) return values.replaceChildren();
    const example = nameOf(examples[0].id);
    const group = choice<'depend' | 'every'>({
      label: words.values,
      options: [{ value: 'depend', label: words.depend(run(example)) }, { value: 'every', label: words.every }],
      value: every ? 'every' : 'depend',
      attrs: { 'data-export-every': true },
      onchange: (value) => ((every = value === 'every'), refresh()),
    });
    const held = (out?.held ?? []) as string[];
    values.replaceChildren(
      h('p', { class: 'ts-subhead', text: words.values }),
      group,
      h(
        'p',
        { class: 'ts-help', 'data-export-values-help': true },
        rich((at) => {
          const named = at(isolated(example));
          if (!every) return words.dependHelp(named);
          return held.length ? t.sentences(words.everyHelp(named), words.held(at(isolated(held.reduce((all, name) => t.listed(all, name)))), named)) : words.everyHelp(named);
        }),
      ),
    );
  }

  // ── the file's name: its id, which is its file name too, and the name it says of itself ─────────
  // Drawn once and kept while the sheet is drawn again (a value typed in them is a commit, and the commit redraws the
  // sheet): their values follow the layer, never under the person's hands.
  const id = textField({ label: ctx.locked.id ? t.file.idLocked : t.export.id, attrs: { disabled: ctx.locked.id, 'suffix-text': '.system.json', 'data-id': true }, oninput: (value) => {
    const result = studio.setMeta(ctx.layer(), { id: value.trim() }) as Json;
    // What is wrong with the id is the field's own error, said under it.
    id.errorText = result.problem ? t.export.ownNamespace.replace('{id}', ctx.layer().id) : '';
    if (!result.problem) ctx.commit(result.layer);
    else id.error = true;
  } });
  const name = textField({ label: t.export.name, attrs: { 'data-name': true }, oninput: (value) => ctx.commit(studio.setMeta(ctx.layer(), { name: value }).layer) });
  const naming = h('div', { class: 'ts-stack ts-export-naming', 'data-export-naming': true }, h('p', { class: 'ts-help', text: t.export.canonical }), id, name);
  function drawNaming() {
    const layer = ctx.layer();
    if (document.activeElement !== id) id.value = layer.id ?? '';
    if (document.activeElement !== name) name.value = layer.name ?? '';
    id.error = Boolean(id.errorText) || !ID_PATTERN.test(layer.id ?? '') || studio.systems.some((s: Json) => s.id === layer.id);
  }

  // ── the tabs ──────────────────────────────────────────────────────────────────────────────────
  const tabs = tabbed({ label: words.views, tabs: TABS.map((key) => ({ key, label: key === 'next' ? t.export.next : words[key] })), select: (key) => ((tab = key as Tab), drawTab()) });
  tabs.el.setAttribute('data-export-tabs', '');
  const copyLabels = (copy: string) => ({ copy: true, 'copy-label': copy, 'copied-label': t.export.copied, 'copy-failed-label': words.copyFailed });
  const code = (attrs: Json, text: string) => Object.assign(h('tanrei-code-block', { size: 'small', ...attrs }), { code: text });
  const command = (text: string) => code({ language: 'sh', label: text, ...copyLabels(words.copyCommand), 'data-export-command': text.split(' ').slice(0, 3).join(' ') }, text);

  function fileTab(file: { layer: Layer }) {
    const name = options.file ?? fileName(file.layer);
    return [code({ language: 'json', headline: name, label: t.export.jsonLabel, 'max-lines': 24, ...copyLabels(t.export.copy), 'data-export-json': true }, stringifyLayer(file.layer))];
  }

  /** The CLI's commands as one block to copy, in the product's folder: the tool, the file taken in, the build. */
  const commands = (file: string) => {
    const cli = studio.namespace as string;
    return [`npm install --save-dev ${studio.npmScope as string}/cli`, `npx ${cli} init --from ${file}`, `npx ${cli} build`];
  };

  function commandTab(file: { layer: Layer }) {
    const build = `npx ${studio.namespace as string} build`;
    // The Studio edits a file here: it is in place already, and one command builds it.
    if (options.file) return [h('p', { class: 'ts-help' }, rich((at) => words.saved(at(h('code', { text: options.file! }))))), h('p', { class: 'ts-help', text: words.builds }), command(build)];
    const name = fileName(file.layer);
    const lines = commands(name).join('\n');
    return [
      h('p', { class: 'ts-help' }, rich((at) => words.commandHelp(at(h('code', { text: name })), at(h('code', { text: `design/${name}` }))))),
      code({ language: 'sh', label: words.commandLabel, ...copyLabels(words.copyCommand), 'data-export-commands': true }, lines),
      h('p', { class: 'ts-help' }, rich((at) => words.commandExisting(at(h('code', { text: build }))))),
    ];
  }

  function cssTab() {
    const latest = ctx.latest();
    if (!latest.model) return [h('p', { class: 'ts-help' }, rich((at) => words.cssNone(at(isolated(nameOf(ctx.layer().extends))))))];
    const layer = latest.layer as Layer;
    const base = nameOf(layer.extends);
    const changes = studio.sheetChanges(latest) as { css: string; changed: number; removed: number };
    const sheet = `${layer.id}.css`;
    const whole = button(words.downloadCss, () => (saveFile(sheet, latest.css(layer.id), 'text/css'), ctx.announce(t.export.downloaded(sheet))), { 'aria-label': words.downloadFile(sheet), 'data-export-download-css': true });
    return [
      h('p', { class: 'ts-help' }, rich((at) => words.cssHelp(at(isolated(base))))),
      changes.css ? code({ language: 'css', headline: sheet, label: words.cssLabel, 'max-lines': 24, ...copyLabels(words.copyCss), 'data-export-css': true }, changes.css) : h('p', { class: 'ts-help', 'data-export-css-none': true }, rich((at) => words.cssNone(at(isolated(base))))),
      changes.removed ? h('p', { class: 'ts-help', text: words.cssRemoved(changes.removed) }) : null,
      h('div', { class: 'ts-actions' }, whole),
    ];
  }

  function nextTab(file: { layer: Layer }) {
    const { layer } = file;
    const cli = studio.namespace as string;
    const path = `design/${fileName(layer)}`;
    if (options.file) {
      return [h('ol', { class: 'ts-next-steps', 'data-export-next': true }, h('li', {}, h('p', {}, rich((at) => words.saved(at(h('code', { text: options.file! })))))), h('li', {}, h('p', { text: words.builds }), command(`npx ${cli} build`)))];
    }
    // `init --from` takes the file as it is downloaded, whatever it extends: the steps are the Command tab's, one by one.
    const [install, init, build] = commands(fileName(layer));
    const guide = options.links.start ? h('a', { href: options.links.start, text: words.guide }) : null;
    return [
      h(
        'ol',
        { class: 'ts-next-steps', 'data-export-next': true },
        h('li', {}, h('p', { text: words.install }), command(install)),
        h('li', {}, h('p', {}, rich((at) => words.init(at(h('code', { text: fileName(layer) })), at(h('code', { text: path }))))), command(init)),
        h('li', {}, h('p', { text: words.build }), command(build)),
        h('li', {}, h('p', { text: words.studio }), command(`npx ${cli} studio`)),
      ),
      h('p', { class: 'ts-help' }, options.links.layers ? rich((at) => t.sentences(t.export.authoritative, at(h('a', { href: options.links.layers!, text: t.export.layersLink })))) : t.export.authoritative),
      guide ? h('p', { class: 'ts-help' }, guide) : null,
    ];
  }

  function drawTab() {
    const file = exported();
    tabs.show(tab, tab === 'file' ? fileTab(file) : tab === 'command' ? commandTab(file) : tab === 'css' ? cssTab() : nextTab(file));
  }

  // ── the sheet's foot: the file to download, and the link to share ───────────────────────────────
  // The sheet's actions, whichever tab is shown. Download saves the file as it is exported (on the example, or with every
  // value) under the name the CLI gives it, and waits while the file has problems; its name says which file. Copy link
  // is offered where the page's address holds the layer. What either did is said in a snackbar over the sheet.
  const download = h('tanrei-button', { slot: 'actions', confirming: true, onclick: () => {
    const file = exported();
    if (file.problems.length) return;
    const name = options.file ?? fileName(file.layer);
    saveFile(name, stringifyLayer(file.layer), 'application/json');
    options.notify(t.export.downloaded(name));
  }, 'data-export-download': true }, glyph(DOWNLOAD_GLYPH), t.export.download) as HTMLElement & { label: string; disabled: boolean };
  const copyLink = options.linked ? h('tanrei-button', { slot: 'actions', onclick: () => void copyLayerLink(ctx).then(options.notify), 'data-export-copy-link': true }, glyph(LINK_GLYPH), words.copyLink) : null;
  function drawFoot(file: { layer: Layer; problems: string[] }) {
    download.label = words.downloadFile(options.file ?? fileName(file.layer));
    download.disabled = file.problems.length > 0;
  }

  // ── the sheet ─────────────────────────────────────────────────────────────────────────────────
  const body = h('div', { class: 'ts-export ts-stack', 'data-export': true }, status, naming, values, tabs.el);
  const sheet = h('tanrei-side-sheet', { variant: 'modal', headline: words.open, 'close-label': words.close, class: 'ts-export-sheet', 'data-export-sheet': true }, body, copyLink, download) as HTMLElement & { open: boolean };
  sheet.addEventListener('close', (event) => event.target === sheet && close());

  /** Draw what the sheet shows for the layer as it is now. Nothing is computed while it is closed. */
  function refresh() {
    if (!shown) return;
    const file = exported();
    drawStatus(file.problems, file.warnings);
    drawFoot(file);
    drawNaming();
    drawValues(file.out);
    drawTab();
  }
  function open(at?: Tab) {
    if (at) tab = at;
    shown = true;
    refresh();
    sheet.open = true;
  }
  function close() {
    shown = false;
    sheet.open = false;
  }
  return { el: sheet, open, close, refresh, get isOpen() { return shown; }, state: () => ({ open: shown, tab, every }) };
}
