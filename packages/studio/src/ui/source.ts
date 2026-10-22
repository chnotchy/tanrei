// "Source": the layer file itself. A plain textarea with line numbers and error markers; every keystroke is parsed and
// checked against the schema, and a valid edit is the new layer for every other level. It is run through the engine
// — the whole build — once the typing rests (COMMIT_REST) or the text loses focus, not at every key: done for every
// key, typing four letters into the id took four long tasks, one under each key.
// Text that does not parse is a DRAFT (../draft.js): kept word for word while the person is elsewhere, never saved,
// and never allowed to overwrite the last layer that parsed.
import { stringifyLayer } from '../core.js';
import { lineAt } from '../draft.js';
import { type Ctx, type Json, button, h, isolated, linkButton, panel, rich } from './dom';

/** The line on which a key (the end of a JSON pointer, or a token id) is written. */
function lineOf(text: string, needle: string | undefined) {
  const index = needle ? text.indexOf(JSON.stringify(needle)) : -1;
  return index === -1 ? undefined : lineAt(text, index);
}

/** How long the typing rests before a text that parses is committed: computed, saved, the layer of every level. */
export const COMMIT_REST = 400;

export function sourceLevel(ctx: Ctx): HTMLElement[] {
  const { t } = ctx;
  const area = h('textarea', { class: 'ts-source-text', dir: 'ltr', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', wrap: 'off', 'aria-label': t.source.label, 'data-source': true });
  const gutter = h('div', { class: 'ts-source-gutter', 'aria-hidden': 'true' });
  const problems = h('ul', { class: 'ts-checks', 'aria-live': 'polite', 'data-source-problems': true });
  const draftNote = h('div', { class: 'ts-draft-note', role: 'status', hidden: true, 'data-draft-note': true });
  // Coming back to Source with a draft shows exactly the text that was typed.
  area.value = ctx.draft.open(stringifyLayer(ctx.layer()));
  let mine = area.value; // what this editor last held, so a change made elsewhere is noticed

  function mark(lines: Set<number>) {
    const total = area.value.split('\n').length;
    gutter.replaceChildren(...Array.from({ length: total }, (_, i) => h('span', { 'data-error': lines.has(i + 1), text: String(i + 1) })));
    gutter.scrollTop = area.scrollTop;
  }

  // The text that parsed and is not committed yet, and the timer that commits it once the typing rests.
  let held: Json | undefined;
  let resting: number | undefined;
  function commitHeld() {
    window.clearTimeout(resting);
    if (!held) return;
    const next = held;
    held = undefined;
    ctx.commit(next);
    show(area.value, next);
  }

  /**
   * The text as typed. Every key is parsed (a text that does not parse is a draft, said at once) and checked against
   * the schema. A layer that parses is the new layer: at once where that computes nothing — a word (a name, a reason:
   * `valueKey`) — or draws without computing (a palette's source, a dial: `liveProperties`, shown at the next frame);
   * otherwise held, and committed once the typing rests or the text loses focus. `commit: false`: the text was put
   * here (on opening, a change made elsewhere, a discarded draft), and is the layer already.
   */
  function check(commit = true) {
    const text = area.value;
    mine = text;
    const had = ctx.draft.pending;
    const result = ctx.draft.input(text, ctx.layer().id, t.source.notObject);
    const parsed: Json | undefined = 'layer' in result ? result.layer : undefined;
    if (had !== ctx.draft.pending || ctx.draft.pending) ctx.draftChanged();
    showDraft();
    window.clearTimeout(resting);
    held = undefined;
    if (parsed && commit) {
      const { studio } = ctx;
      if (studio.valueKey(parsed) === studio.valueKey(ctx.layer())) ctx.commit(parsed);
      else {
        held = parsed;
        resting = window.setTimeout(commitHeld, COMMIT_REST);
        if (studio.liveProperties(ctx.view(), parsed)) ctx.commit(parsed, { preview: true });
      }
    }
    show(text, parsed, 'error' in result ? result : undefined);
  }
  /**
   * What is wrong with the text, each with the line it is on: a text that does not parse; for a held layer, what the
   * schema says (the engine has not been asked yet); for a committed one, what the engine said too.
   */
  function show(text: string, parsed: Json | undefined, invalid?: { error: string; line?: number }) {
    const lines = new Set<number>();
    const found: [string, number | undefined][] = [];
    if (invalid) found.push([t.labelled(t.import.invalidJson, invalid.error), invalid.line]);
    if (parsed) {
      // Schema problems name a JSON pointer; engine problems start with a token id. Both are shown verbatim.
      for (const message of (held ? ctx.studio.validate(parsed) : ctx.latest().problems) as string[]) {
        const pointer = /^\/(\S*)/.exec(message)?.[1]?.split('/').filter(Boolean).at(-1)?.replaceAll('~1', '/');
        const id = /^([a-z][\w-]*(\.[\w-]+)+)/.exec(message)?.[1];
        found.push([message, lineOf(text, pointer ?? id)]);
      }
    }
    for (const [, line] of found) if (line) lines.add(line);
    problems.replaceChildren(...(found.length ? found.map(([message, line]) => h('li', { 'data-state': 'problem' }, h('span', {}, line ? linkButton(t.source.line(line), () => jump(line)) : null, ' ', isolated(message)))) : [h('li', { text: t.source.valid })]));
    mark(lines);
  }
  function showDraft() {
    draftNote.hidden = !ctx.draft.pending;
    if (draftNote.hidden || draftNote.childElementCount) return;
    draftNote.replaceChildren(
      h('p', {}, rich((at) => t.sentences(at(h('b', { text: t.source.draftTitle })), t.source.draftHelp))),
      button(t.source.draftDiscard, () => {
        ctx.draft.discard();
        ctx.draftChanged();
        area.value = stringifyLayer(ctx.layer());
        check(false);
        area.focus();
      }, { 'data-draft-discard': true }),
    );
  }
  function jump(line: number) {
    const before = area.value.split('\n').slice(0, line - 1).join('\n').length + (line > 1 ? 1 : 0);
    area.focus();
    area.setSelectionRange(before, before + (area.value.split('\n')[line - 1]?.length ?? 0));
  }

  area.addEventListener('input', () => check());
  area.addEventListener('blur', commitHeld);
  area.addEventListener('scroll', () => (gutter.scrollTop = area.scrollTop));
  area.addEventListener('keydown', (event) => {
    // Tab indents like an editor; Escape hands Tab back to the page, so the keyboard is never trapped here.
    if (event.key === 'Escape') return void (area.dataset.tabOut = 'true');
    if (event.key !== 'Tab' || event.shiftKey || event.metaKey || event.ctrlKey || area.dataset.tabOut) return void delete area.dataset.tabOut;
    event.preventDefault();
    area.setRangeText('  ', area.selectionStart, area.selectionEnd, 'end');
    check();
  });
  // A change made elsewhere (a reload from disk, the automation hook) replaces the text — never while typing here.
  ctx.onUpdate(() => {
    let same = false;
    try {
      same = JSON.stringify(JSON.parse(mine)) === JSON.stringify(ctx.layer());
    } catch {}
    // A draft is the person's text: a change made elsewhere never replaces it (they discard it, or make it parse).
    if (!same && document.activeElement !== area && !ctx.draft.pending) {
      area.value = stringifyLayer(ctx.layer());
      check(false);
    }
  });
  const tidy = button(t.source.format, () => {
    try {
      area.value = stringifyLayer(JSON.parse(area.value));
      check();
    } catch {}
  });
  queueMicrotask(() => check(false));
  return [panel(ctx, { title: t.source.title, code: `${ctx.layer().id}.system.json`, help: t.source.help, key: 'source', actions: [tidy] }, draftNote, h('div', { class: 'ts-source' }, gutter, area), h('p', { class: 'ts-help', text: t.source.keys }), problems)];
}
