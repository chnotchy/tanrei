// Export: a side sheet over the Studio, opened from its bar. At its top, one line says what the schema, the token
// engine and the build's checks say of the file; under it, for a layer on an example of the theme gallery, whether the
// file depends on the example or holds every value itself (core.writeOut); then three tabs — the file, what its
// stylesheet changes (core.sheetChanges), and what to do next, with a link to share. Everything shown is the engine's
// and the build's own output for this layer, never a sketch of it; a command is shown only as the CLI takes it.
import { packLayer, withLayer } from '../address.js';
import { stringifyLayer } from '../core.js';
import { type Ctx, type Json, type Layer, button, choice, h, isolated, linkButton, rich, tabbed } from './dom';

type Tab = 'file' | 'css' | 'next';
const TABS: Tab[] = ['file', 'css', 'next'];

export interface ExportOptions {
  /** The file the layer lives in, when the host edits one (`adapter.label`): the Studio saves it, and nothing is downloaded to put it there. */
  file?: string;
  /** The page's address holds the layer (`address`): a link to it can be copied. */
  linked: boolean;
  links: { layers?: string; start?: string };
  /** Go to a section of the rail: the sheet closes first. */
  onshow(section: 'a11y'): void;
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
  const status = h('tanrei-callout', { class: 'ts-export-status', live: true, 'data-export-status': true });
  function drawStatus(problems: string[], warnings: string[]) {
    const state = problems.length ? 'error' : warnings.length ? 'warning' : 'success';
    Object.assign(status, { status: state, statusLabel: words.statuses[state] });
    status.dataset.state = state;
    status.replaceChildren(
      problems.length ? words.invalid(problems.length) : warnings.length ? words.warned(warnings.length) : words.valid,
      problems.length ? h('ul', { class: 'ts-checks' }, problems.slice(0, 5).map((problem) => h('li', { 'data-state': 'problem' }, isolated(problem)))) : '',
      warnings.length && !problems.length ? h('div', { slot: 'actions' }, linkButton(words.seeWarnings, () => (close(), options.onshow('a11y')), { 'data-export-warnings': true })) : '',
    );
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

  // ── the tabs ──────────────────────────────────────────────────────────────────────────────────
  const tabs = tabbed({ label: words.views, tabs: TABS.map((key) => ({ key, label: key === 'next' ? t.export.next : words[key] })), select: (key) => ((tab = key as Tab), drawTab()) });
  tabs.el.setAttribute('data-export-tabs', '');
  const copyLabels = (copy: string) => ({ copy: true, 'copy-label': copy, 'copied-label': t.export.copied, 'copy-failed-label': words.copyFailed });
  const code = (attrs: Json, text: string) => Object.assign(h('tanrei-code-block', { size: 'small', ...attrs }), { code: text });
  const command = (text: string) => code({ language: 'sh', label: text, ...copyLabels(words.copyCommand), 'data-export-command': text.split(' ').slice(0, 3).join(' ') }, text);

  function fileTab(file: { layer: Layer; problems: string[] }) {
    const text = stringifyLayer(file.layer);
    const name = options.file ?? fileName(file.layer);
    const download = button(t.export.download, () => (saveFile(name, text, 'application/json'), ctx.announce(t.export.downloaded(name))), { primary: true, 'aria-label': words.downloadFile(name), disabled: file.problems.length > 0, 'data-export-download': true });
    return [code({ language: 'json', headline: name, label: t.export.jsonLabel, 'max-lines': 24, ...copyLabels(t.export.copy), 'data-export-json': true }, text), h('div', { class: 'ts-actions' }, download)];
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

  const linkState = h('span', { class: 'ts-help', role: 'status', 'data-export-link-state': true });
  async function copyLink() {
    let said: string = words.copyFailed;
    try {
      const text = stringifyLayer(ctx.layer());
      const packed = text === stringifyLayer(studio.blank()) ? null : await packLayer(text);
      await navigator.clipboard.writeText(`${location.origin}${location.pathname}${location.search}${withLayer(location.hash, packed)}`);
      said = words.linkCopied;
    } catch {}
    linkState.textContent = said;
    ctx.announce(said);
  }

  function nextTab(file: { layer: Layer; problems: string[] }) {
    const { layer } = file;
    const scope = studio.npmScope as string;
    const cli = studio.namespace as string;
    const path = `design/${fileName(layer)}`;
    if (options.file) {
      return [h('ol', { class: 'ts-next-steps', 'data-export-next': true }, h('li', {}, h('p', {}, rich((at) => words.saved(at(h('code', { text: options.file! })))))), h('li', {}, h('p', { text: words.builds }), command(`npx ${cli} build`)))];
    }
    // `init --extends` takes the systems Tanrei ships (packages/cli: `shippedSystems`); a file that extends the root
    // is started from the default and written over by this one.
    const extendsFlag = studio.systems.some((system: Json) => system.id === layer.extends && !system.local) && layer.extends !== studio.defaultId ? ` --extends ${layer.extends}` : '';
    const download = button(t.export.download, () => (saveFile(fileName(layer), stringifyLayer(layer), 'application/json'), ctx.announce(t.export.downloaded(fileName(layer)))), { primary: true, 'aria-label': words.downloadFile(fileName(layer)), disabled: file.problems.length > 0, 'data-export-download-next': true });
    const guide = options.links.start ? h('a', { href: options.links.start, text: words.guide }) : null;
    return [
      h(
        'ol',
        { class: 'ts-next-steps', 'data-export-next': true },
        h('li', {}, h('p', { text: words.install }), command(`npm install --save-dev ${scope}/cli`)),
        h('li', {}, h('p', {}, rich((at) => words.init(at(h('code', { text: path }))))), command(`npx ${cli} init ${layer.id}${extendsFlag}`)),
        h('li', {}, h('p', {}, rich((at) => t.export.put(at(h('code', { text: path }))))), h('div', { class: 'ts-actions' }, download)),
        h('li', {}, h('p', { text: words.build }), command(`npx ${cli} build`)),
        h('li', {}, h('p', { text: words.studio }), command(`npx ${cli} studio`)),
      ),
      h('p', { class: 'ts-help' }, options.links.layers ? rich((at) => t.sentences(t.export.authoritative, at(h('a', { href: options.links.layers!, text: t.export.layersLink })))) : t.export.authoritative),
      guide ? h('p', { class: 'ts-help' }, guide) : null,
      options.linked
        ? h('section', { class: 'ts-stack ts-export-share', 'aria-label': words.share, 'data-export-share': true }, h('p', { class: 'ts-subhead', text: words.share }), h('p', { class: 'ts-help', text: words.shareHelp }), h('div', { class: 'ts-actions' }, button(words.copyLink, () => void copyLink(), { 'data-export-copy-link': true }), linkState))
        : null,
    ];
  }

  function drawTab() {
    const file = exported();
    tabs.show(tab, tab === 'file' ? fileTab(file) : tab === 'css' ? cssTab() : nextTab(file));
  }

  // ── the sheet ─────────────────────────────────────────────────────────────────────────────────
  const body = h('div', { class: 'ts-export ts-stack', 'data-export': true }, status, values, tabs.el);
  const sheet = h('tanrei-side-sheet', { variant: 'modal', headline: words.open, 'close-label': words.close, class: 'ts-export-sheet', 'data-export-sheet': true }, body) as HTMLElement & { open: boolean };
  sheet.addEventListener('close', (event) => event.target === sheet && close());

  /** Draw what the sheet shows for the layer as it is now. Nothing is computed while it is closed. */
  function refresh() {
    if (!shown) return;
    const file = exported();
    drawStatus(file.problems, file.warnings);
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
    linkState.textContent = '';
  }
  return { el: sheet, open, close, refresh, get isOpen() { return shown; }, state: () => ({ open: shown, tab, every }) };
}
