// The start point, first in the bar: what the layer starts from — the default system, the root (listed, and offered
// once it is a blank start: core.startPoints), an example of the theme gallery — and a layer file to load in its
// place. A button that opens a menu: a radio item for each start, the import as an item of its own.
import { type Ctx, type Json, h } from './dom';

/** The start point's glyphs: declared, so that the docs site's cut-down icon file has them (packages/tools/src/glyphs.js). */
const OPEN_GLYPH = 'expand_more';
const FILE_GLYPH = 'upload_file';

type Point = { id: string; name: string; kind: 'default' | 'root' | 'example'; offered: boolean; reason?: string };

export function createStartPoint(ctx: Ctx, { onstart, onfile }: { onstart: (id: string) => void; onfile: (file: File) => void }) {
  const { t, studio } = ctx;
  const points = studio.startPoints() as Point[];
  /** What a start is called: the default system and the root by their names, an example by its id (what the file names). */
  const nameOf = (id: string) => {
    const point = points.find((each) => each.id === id);
    return point ? (point.kind === 'example' ? point.id : point.name) : id;
  };
  const note = (point: Point) => (point.kind === 'default' ? t.start.defaultNote : point.kind === 'root' ? (point.offered ? '' : t.start.notNeutral) : t.start.exampleNote(point.name));
  const item = (point: Point) => h('tanrei-menu-radio-item', { value: point.id, label: nameOf(point.id), 'supporting-text': note(point), disabled: !point.offered, 'data-start': point.id });
  const id = ctx.uid('ts-start');
  const label = h('span', { 'data-start-label': true });
  const button = h('tanrei-button', { id, variant: 'outlined', size: 'small', 'icon-position': 'trailing', title: t.start.help, 'data-start-open': true, onclick: () => (menu.open = !menu.open) }, h('span', { class: `${studio.tagPrefix}-icon`, slot: 'icon', 'aria-hidden': 'true', translate: 'no' }, OPEN_GLYPH), label);
  // The default system and the root, then the examples of the gallery under their own title.
  const groups = [
    h('tanrei-menu-group', { label: t.start.starts, 'data-start-group': 'start' }, points.filter((point) => point.kind !== 'example').map(item)),
    h('tanrei-menu-group', { label: t.start.gallery, 'data-start-group': 'gallery' }, points.filter((point) => point.kind === 'example').map(item)),
  ] as (HTMLElement & { value: string | null })[];
  // The file is chosen with the browser's own picker; the item opens it.
  const input = h('input', { type: 'file', accept: '.json,application/json', hidden: true, tabindex: '-1', 'aria-hidden': 'true', 'data-start-input': true }) as HTMLInputElement;
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.value = '';
    if (file) onfile(file);
  });
  const fileItem = h('tanrei-menu-item', { label: t.start.file, 'supporting-text': t.start.fileNote, 'leading-icon': FILE_GLYPH, 'data-start-file': true, onclick: () => input.click() });
  const menu = h('tanrei-menu', { anchor: id, 'aria-label': t.start.menu, 'data-start-menu': true }, groups, fileItem) as HTMLElement & { open: boolean };
  menu.addEventListener('close', (event) => event.target === menu && (menu.open = false));
  for (const group of groups) group.addEventListener('change', (event) => event.target === group && group.value && onstart(group.value));

  /** The button names the start the layer has; its radio item is the checked one (a start not listed: none is). */
  const refresh = () => {
    const now = ctx.layer().extends ?? '';
    label.textContent = t.start.open(nameOf(now));
    for (const group of groups) group.value = [...group.children].some((child) => (child as HTMLElement & { value: string }).value === now) ? now : null;
  };
  refresh();
  return { el: h('div', { class: 'ts-bar-tools ts-bar-start', 'data-start-point': true }, button, menu, input), refresh, nameOf, button };
}
