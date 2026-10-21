// <tanrei-tag-group>, driven by specs/tag-group.spec.json: every behaviour id (TGR-1…21) is cited by a test title, every
// fixture has a baseline, and every length is read back from the tokens — never from a number written here, except
// where the spec's own `verify` names the default system's value.
import AxeBuilder from '@axe-core/playwright';
import { type Locator, type Page, expect, test } from '@playwright/test';
import { resolveEasing } from '../../../test/appear.js';
import { type Frames, expectAnimated, expectFirstFrameAtRest, sampleFrames } from '../../../test/frames.js';
import { type Fixture, loadSpec, mountFixtures, resolveColor, resolveToken, tab, tabTo, rootTokens } from '../../../test/harness.js';
import { motionEnded } from '../../../test/motions.js';

const spec = loadSpec('tag-group');
type P = Page;
const TAG = 'tanrei-tag-group';
const stage = (page: P, id: string) => page.locator(`[data-fixture="${id}"]`);
const host = (page: P, id: string) => page.locator(`[data-fixture="${id}"] > ${TAG}`);
/** The members: the group's light-DOM children (a locator's child combinator also reaches the shadow root's own child, the list). */
const members = (page: P, id: string) => page.locator(`[data-fixture="${id}"] > ${TAG} > :not([role="list"])`);
const member = (page: P, id: string, nth: number) => members(page, id).nth(nth);
const list = (page: P, id: string) => host(page, id).locator('[role="list"]');
const T = (name: string) => `--tanrei-comp-tag-group-${name}`;
const token = (page: P, name: string) => resolveToken(page, T(name));
const near = (actual: number, expected: number, message = '', tolerance = 0.6) => expect(Math.abs(actual - expected), `${message}: ${actual} ≈ ${expected}`).toBeLessThanOrEqual(tolerance);
/** A fixture of a test's own: the group's props and its members as markup. */
const fx = (id: string, props: Fixture['props'], inside: string, extra: Partial<Fixture> = {}): Fixture => ({ id, props, content: inside, ...extra });
const mount = (page: P, fixtures: Fixture[], options: Parameters<typeof mountFixtures>[2] = {}) => mountFixtures(page, spec, { icons: true, fixtures, ...options });
const only = (...ids: string[]) => spec.fixtures.filter((f) => ids.includes(f.id));
const tags = (...labels: string[]) => labels.map((label) => `<tanrei-tag label="${label}"></tanrei-tag>`).join('');
const filters = (...labels: string[]) => labels.map((label) => `<tanrei-chip kind="filter" label="${label}"></tanrei-chip>`).join('');
const inputs = (...labels: string[]) => labels.map((label) => `<tanrei-chip kind="input" label="${label}" remove-label="Remove ${label}"></tanrei-chip>`).join('');
const FIVE = ['Ada', 'Grace', 'Katherine', 'Margaret', 'Hedy'];

function warnings(page: P) {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}
const frames = (page: P, count = 2) =>
  page.evaluate(async (n) => {
    for (let i = 0; i < n; i++) await new Promise((resolve) => requestAnimationFrame(resolve));
  }, count);

interface Placed {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}
/** The group's box and its members' visible bounds, in the order given, gathered into the lines they stand on. */
async function layout(page: P, id: string) {
  return host(page, id).evaluate((el) => {
    const round = (v: number) => Math.round(v * 100) / 100;
    const rect = (r: DOMRect) => ({ x: round(r.x), y: round(r.y), width: round(r.width), height: round(r.height), right: round(r.right), bottom: round(r.bottom) });
    const placed = [...el.children].map((child) => ({ label: child.getAttribute('label') ?? child.textContent ?? '', ...rect(child.getBoundingClientRect()) }));
    const lines: (typeof placed)[] = [];
    for (const one of placed) {
      const line = lines[lines.length - 1];
      // A member starts a new line when it stands wholly below the middle of the line before.
      const middle = line ? (Math.min(...line.map((m) => m.y)) + Math.max(...line.map((m) => m.bottom))) / 2 : 0;
      if (!line || one.y >= middle) lines.push([one]);
      else line.push(one);
    }
    return { group: rect(el.getBoundingClientRect()), placed, lines };
  }) as Promise<{ group: Omit<Placed, 'label'>; placed: Placed[]; lines: Placed[][] }>;
}
const top = (line: Placed[]) => Math.min(...line.map((m) => m.y));
const bottom = (line: Placed[]) => Math.max(...line.map((m) => m.bottom));

/** Where focus is, through every shadow root: `tanrei-chip[Grace] > button.container`. */
const focusPath = (page: P) =>
  page.evaluate(() => {
    const path: string[] = [];
    let active: Element | null = document.activeElement;
    while (active) {
      const label = active.getAttribute('label');
      path.push(`${active.localName}${active.classList[0] ? `.${active.classList[0]}` : ''}${label ? `[${label}]` : ''}`);
      active = active.shadowRoot?.activeElement ?? null;
    }
    return path.join(' > ');
  });
const onChip = (label: string) => `tanrei-chip[${label}] > button.container`;

interface Ax {
  role: string;
  name: string;
  pressed?: string;
  children: Ax[];
}
/** The lists in Chromium's accessibility tree, each with what it holds: nodes that are ignored or say nothing are passed through. */
async function axLists(page: P): Promise<Ax[]> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = await cdp.send('Accessibility.getFullAXTree');
  await cdp.detach();
  const byId = new Map(nodes.map((node) => [node.nodeId, node]));
  const SILENT = ['none', 'generic', 'InlineTextBox', 'presentation'];
  type Node = (typeof nodes)[number];
  const shown = (id: string): Node[] => {
    const node = byId.get(id);
    if (!node) return [];
    return node.ignored || SILENT.includes(String(node.role?.value)) ? (node.childIds ?? []).flatMap(shown) : [node];
  };
  const describe = (node: Node): Ax => {
    const pressed = node.properties?.find((p) => p.name === 'pressed')?.value.value as string | undefined;
    return { role: String(node.role?.value), name: String(node.name?.value ?? ''), ...(pressed === undefined ? {} : { pressed: String(pressed) }), children: (node.childIds ?? []).flatMap(shown).map(describe) };
  };
  return nodes.filter((node) => !node.ignored && node.role?.value === 'list').map(describe);
}
const text = (name: string): Ax => ({ role: 'StaticText', name, children: [] });

/** A coarse pointer, as a touch screen has: only Chromium can emulate one (touch emulation over CDP). */
async function coarse(page: P) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
}
/** The member a press at this point reaches, and the part of it inside its shadow root. */
const hit = (page: P, x: number, y: number) =>
  page.evaluate(
    ([px, py]) => {
      const el = document.elementFromPoint(px, py);
      const inner = el?.shadowRoot?.elementFromPoint(px, py);
      return `${el?.getAttribute('label') ?? el?.localName ?? ''}${inner?.classList.contains('remove') ? ' (remove)' : ''}`;
    },
    [x, y],
  );

test.describe('behavior', () => {
  test('TGR-1: members stand in lines from the start edge, in the order given, gap.<spacing> apart, each at its own size and centred on its line; the group is as wide as its layout and as tall as its lines, draws nothing of its own, adds no padding and does not draw its label', async ({ page }) => {
    await mount(page, [
      ...only('tags'),
      fx('chips', { spacing: 'chips', label: 'Filters' }, filters('Open', 'Blocked', 'Archived')),
      fx('mixed', { spacing: 'tags', label: 'Sizes' }, `<tanrei-tag label="small" size="small"></tanrei-tag><tanrei-tag label="medium"></tanrei-tag><tanrei-chip label="chip"></tanrei-chip>`),
    ]);
    for (const [id, spacing, height] of [['tags', 'tags', await resolveToken(page, '--tanrei-comp-tag-container-height-medium')], ['chips', 'chips', await resolveToken(page, '--tanrei-comp-chip-container-height-medium')]] as const) {
      const { group, placed, lines } = await layout(page, id);
      const gap = await token(page, `gap-${spacing}`);
      expect(lines.length, id).toBe(1);
      expect(placed.length, id).toBe(3);
      // From the start edge, with no padding: the first member is at the group's own edge and top.
      near(placed[0].x, group.x, `${id}: the first member at the start edge`);
      near(placed[0].y, group.y, `${id}: no padding above`);
      for (let i = 1; i < placed.length; i++) near(placed[i].x - placed[i - 1].right, gap, `${id}: gap.${spacing} between ${i - 1} and ${i}`);
      // As tall as its line, which is as tall as its members; as wide as the stage gives it (760 less its padding).
      near(group.height, height, `${id}: as tall as its line`);
      for (const one of placed) near(one.height, height, `${id}: ${one.label} at its own height`);
      near(group.width, 760 - 32, `${id}: as wide as its layout`);
      // The spec's verify, under the default system: 8 apart, on one line 24 (tags) or 32 (chips) high.
      expect(gap, id).toBe(8);
      expect(height, id).toBe(id === 'tags' ? 24 : 32);
    }
    // Members of different sizes are centred on the middle of their line.
    const mixed = await layout(page, 'mixed');
    expect(mixed.lines.length).toBe(1);
    const centres = mixed.placed.map((m) => m.y + m.height / 2);
    expect(new Set(mixed.placed.map((m) => m.height)).size).toBe(3);
    for (const centre of centres) near(centre, mixed.group.y + mixed.group.height / 2, 'centred on the line');
    // Nothing of its own: no fill, edge, elevation or padding on the host or on the list, and the label is not drawn.
    for (const part of [host(page, 'tags'), list(page, 'tags')]) {
      const drawn = await part.evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.backgroundColor, s.backgroundImage, s.borderTopWidth, s.borderInlineStartWidth, s.boxShadow, s.outlineStyle, s.paddingTop, s.paddingInlineStart, s.paddingBottom, s.paddingInlineEnd];
      });
      expect(drawn).toEqual(['rgba(0, 0, 0, 0)', 'none', '0px', '0px', 'none', 'none', '0px', '0px', '0px', '0px']);
    }
    expect(await host(page, 'tags').evaluate((el) => el.shadowRoot!.textContent!.trim())).toBe('');
    expect(await host(page, 'tags').evaluate((el) => (el as HTMLElement).innerText.includes('Tags'))).toBe(false);
  });

  test('TGR-2: a member that does not fit goes whole to a new line row-gap.<spacing> below; nothing is cut, shrunk, scrolled or hidden, and a member wider than the group has the group’s width on a line of its own and cuts its own label', async ({ page }) => {
    await mount(page, [...only('tags-wrap', 'tags-small-wrap', 'chips-filters-wrap', 'tags-long-member'), fx('narrow', { spacing: 'tags', label: 'Tags' }, tags('Color', 'A note on why the documentation should be built from its components', 'Motion'))]);
    await page.addStyleTag({ content: `[data-fixture="narrow"] > ${TAG} { inline-size: 120px; }` });
    for (const [id, spacing, rowGap] of [['tags-wrap', 'tags', 8], ['tags-small-wrap', 'tags', 8], ['chips-filters-wrap', 'chips', 16]] as const) {
      const { group, placed, lines } = await layout(page, id);
      const count = spec.fixtures.find((f) => f.id === id)!.items!.length;
      expect(placed.length, id).toBe(count);
      expect(lines.length, `${id} holds more than its stage is wide`).toBeGreaterThan(1);
      const between = await token(page, `row-gap-${spacing}`);
      expect(between, `${id}: the default system's value`).toBe(rowGap);
      for (let i = 1; i < lines.length; i++) {
        near(top(lines[i]) - bottom(lines[i - 1]), between, `${id}: row-gap.${spacing} between lines ${i - 1} and ${i}`);
        // Each new line starts at the start edge, and its first member would not have fitted on the line above.
        near(lines[i][0].x, group.x, `${id}: line ${i} starts at the start edge`);
        expect(lines[i - 1][lines[i - 1].length - 1].right + (await token(page, `gap-${spacing}`)) + lines[i][0].width, `${id}: the first of line ${i} did not fit above`).toBeGreaterThan(group.right + 0.5);
      }
      // Every member is shown, whole, inside the group, and none lies over another.
      for (const one of placed) {
        expect(one.width, `${id}: ${one.label} is drawn`).toBeGreaterThan(0);
        expect(one.x, id).toBeGreaterThanOrEqual(group.x - 0.5);
        expect(one.right, id).toBeLessThanOrEqual(group.right + 0.5);
        expect(one.bottom, id).toBeLessThanOrEqual(group.bottom + 0.5);
      }
      // Not cut: every label has the room it needs.
      const cut = await host(page, id).evaluate((el) => [...el.children].filter((child) => { const label = child.shadowRoot!.querySelector('.label')!; return label.scrollWidth > label.clientWidth + 1; }).length);
      expect(cut, `${id}: no label is cut`).toBe(0);
      // It does not scroll its lines.
      expect(await list(page, id).evaluate((el) => [getComputedStyle(el).overflowX, getComputedStyle(el).overflowY, el.scrollWidth <= el.clientWidth + 1]), id).toEqual(['visible', 'visible', true]);
    }
    // One member wider than the group: the group's width, a line of its own, and its own ellipsis (TAG-5).
    for (const [id, index] of [['narrow', 1], ['tags-long-member', 1]] as const) {
      const { group, placed, lines } = await layout(page, id);
      expect(lines.length, id).toBe(3);
      expect(lines[1].length, id).toBe(1);
      near(placed[index].width, group.width, `${id}: the long member has the group's width`);
      near(placed[index].x, group.x, `${id}: from the start edge`);
      expect(await member(page, id, index).evaluate((el) => { const label = el.shadowRoot!.querySelector('.label')!; return [getComputedStyle(label).textOverflow, label.scrollWidth > label.clientWidth]; }), id).toEqual(['ellipsis', true]);
      // Its neighbours are not shrunk for it.
      expect(await member(page, id, 0).evaluate((el) => { const label = el.shadowRoot!.querySelector('.label')!; return label.scrollWidth <= label.clientWidth + 1; }), id).toBe(true);
    }
    near((await layout(page, 'narrow')).group.width, 120, 'the unit of the spec: a group 120 wide');
  });

  test('TGR-3: the members stay in the order given — a selected chip is not moved forward — and focus and assistive technology follow that order, along each line and line after line', async ({ page, browserName }) => {
    await mount(page, only('chips-filters-wrap'));
    const id = 'chips-filters-wrap';
    const given = spec.fixtures.find((f) => f.id === id)!.items!.map((item) => String(item.props.label));
    const { placed, lines } = await layout(page, id);
    expect(placed.map((m) => m.label)).toEqual(given);
    // Drawn in that order: along each line from its start, and line after line from the top.
    expect(lines.flat().map((m) => m.label)).toEqual(given);
    for (const line of lines) for (let i = 1; i < line.length; i++) expect(line[i].x).toBeGreaterThan(line[i - 1].right);
    // The selected ones are where they were given: the first, the sixth and the ninth.
    expect(await members(page, id).evaluateAll((all) => all.flatMap((el, i) => (el.hasAttribute('selected') ? [i] : [])))).toEqual([0, 5, 8]);
    // Focus moves through the chips in that order.
    await tabTo(page, member(page, id, 0).locator('.container'));
    const walked = [await focusPath(page)];
    for (let i = 1; i < given.length; i++) {
      await tab(page);
      walked.push(await focusPath(page));
    }
    expect(walked).toEqual(given.map(onChip));
    // Assistive technology reads them in that order.
    if (browserName === 'chromium') expect((await axLists(page))[0].children.map((item) => item.children[0].name)).toEqual(given);
    await expect(page.getByRole('list', { name: 'Filters' })).toHaveCount(1);
    await expect(page.getByRole('listitem')).toHaveCount(given.length);
  });

  test('TGR-4: spacing changes the two distances and nothing else — not what a member is, how it is drawn or what the group exposes; a chip under spacing tags is still rendered and reported', async ({ page }) => {
    const seen = warnings(page);
    const chips = filters('Open', 'Assigned to me', 'Needs review', 'Blocked', 'Has a design', 'Web', 'iOS', 'Android', 'This week', 'Overdue');
    await mount(page, [fx('as-tags', { spacing: 'tags', label: 'Filters' }, chips), fx('as-chips', { label: 'Filters', spacing: 'chips' }, chips), fx('tags-only', { spacing: 'tags', label: 'Tags' }, tags('Design', 'Research'))]);
    const [a, b] = [await layout(page, 'as-tags'), await layout(page, 'as-chips')];
    // The same members, at the same sizes, on the same lines (the gap along a line is the same in the default system).
    expect(a.placed.map((m) => [m.label, m.width, m.height])).toEqual(b.placed.map((m) => [m.label, m.width, m.height]));
    expect(a.lines.length).toBeGreaterThan(1);
    near(top(a.lines[1]) - bottom(a.lines[0]), await token(page, 'row-gap-tags'), 'row-gap.tags');
    near(top(b.lines[1]) - bottom(b.lines[0]), await token(page, 'row-gap-chips'), 'row-gap.chips');
    near(a.placed[1].x - a.placed[0].right, await token(page, 'gap-tags'), 'gap.tags');
    near(b.placed[1].x - b.placed[0].right, await token(page, 'gap-chips'), 'gap.chips');
    // What is exposed is the same: a list of items that hold buttons.
    for (const id of ['as-tags', 'as-chips']) {
      await expect(list(page, id)).toHaveAttribute('aria-label', 'Filters');
      await expect(stage(page, id).getByRole('listitem')).toHaveCount(10);
      await expect(stage(page, id).getByRole('button', { name: 'Open' })).toHaveAttribute('aria-pressed', 'false');
      expect(await member(page, id, 0).evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('.container')!).backgroundColor), id).toBe(await member(page, 'as-chips', 0).evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('.container')!).backgroundColor));
    }
    // A set of chips under `tags` is reported; under `chips`, and a set of tags, are not.
    await expect.poll(() => seen.filter((line) => line.includes('TGR-4')).length).toBe(1);
    expect(seen.find((line) => line.includes('TGR-4'))).toMatch(/a set of chips wants spacing="chips"/);
    // The report comes when the spacing says so too, and once.
    await host(page, 'as-chips').evaluate((el) => el.setAttribute('spacing', 'tags'));
    await expect.poll(() => seen.filter((line) => line.includes('TGR-4')).length).toBe(2);
    near(top((await layout(page, 'as-chips')).lines[1]) - bottom((await layout(page, 'as-chips')).lines[0]), await token(page, 'row-gap-tags'), 'the distance follows the spacing at once');
  });

  test('TGR-5: on a touch screen two wrapped lines of medium chips give every chip its whole target — its height and half the row gap on each side — and the hit areas of two lines meet at the middle of the gap, small chips’ too', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only Chromium can emulate a coarse pointer (touch emulation over CDP)');
    await mount(page, [...only('chips-filters-wrap'), fx('small', { spacing: 'chips', label: 'Filters' }, ['Open', 'Assigned to me', 'Needs review', 'Blocked', 'Has a design', 'Web', 'iOS', 'Android', 'This week', 'Overdue', 'No owner', 'Archived', 'Mine', 'Starred', 'Recent'].map((label) => `<tanrei-chip kind="filter" size="small" label="${label}"></tanrei-chip>`).join('')), fx('one-line', { spacing: 'chips', label: 'Filters' }, ['Open', 'Blocked', 'Archived'].map((label) => `<tanrei-chip kind="filter" size="small" label="${label}"></tanrei-chip>`).join(''))]);
    await coarse(page);
    const touch = await resolveToken(page, '--tanrei-sys-target-touch');
    const [gap, rowGap] = [await token(page, 'gap-chips'), await token(page, 'row-gap-chips')];
    const area = (id: string, nth: number) => member(page, id, nth).evaluate((el) => { const s = getComputedStyle(el.shadowRoot!.querySelector('.container')!, '::before'); return [Number.parseFloat(s.width), Number.parseFloat(s.height)]; });
    // Medium: 32 and half of 16 on each side is the whole 48 (the spec's verify) — nothing is taken from it.
    const medium = await layout(page, 'chips-filters-wrap');
    for (let i = 0; i < medium.placed.length; i++) {
      const [width, height] = await area('chips-filters-wrap', i);
      near(height, medium.placed[i].height + rowGap, `chip ${i}: its height and half the row gap on each side`);
      near(height, touch, `chip ${i}: the whole touch target`);
      // Along the line it reaches no further than half the gap toward a neighbour.
      expect(width, `chip ${i}`).toBeLessThanOrEqual(medium.placed[i].width + gap + 0.5);
    }
    // Small chips on wrapped lines: 24 high and 16 apart, so the targets meet between the lines at 40 (the spec's note).
    const small = await layout(page, 'small');
    expect(small.lines.length).toBeGreaterThan(1);
    near((await area('small', 0))[1], small.placed[0].height + rowGap, 'a small chip reaches half the row gap');
    expect(small.placed[0].height + rowGap).toBeLessThan(touch);
    // On one line a small chip keeps its whole target above and below: the distance between two lines bounds nothing
    // while there is one line.
    expect((await layout(page, 'one-line')).lines.length).toBe(1);
    near((await area('one-line', 0))[1], touch, 'a small chip on one line: the whole touch target');
    // The bound comes and goes with the second line.
    await page.addStyleTag({ content: `[data-fixture="one-line"] > ${TAG} { inline-size: 120px; }` });
    await expect.poll(async () => (await area('one-line', 0))[1]).toBeCloseTo(small.placed[0].height + rowGap, 1);
    for (const [id, placed] of [['chips-filters-wrap', medium], ['small', small]] as const) {
      const [first, second] = placed.lines;
      // Between two lines: a press above the middle of the gap is the upper chip's, below it the lower one's.
      const lower = second[0];
      const upper = first.find((m) => m.x <= lower.x + 4 && m.right >= lower.x + 4)!;
      const middle = (bottom(first) + top(second)) / 2;
      const x = lower.x + 4;
      expect(await hit(page, x, middle - 1.5), `${id}: above the middle`).toBe(upper.label);
      expect(await hit(page, x, middle + 1.5), `${id}: below the middle`).toBe(lower.label);
      // A press on a chip's visible bounds is that chip's, at every edge that faces a neighbour. (Along a line these
      // chips are wider than the target and extend nothing; the next test has chips that do.)
      const [left, right] = first;
      const y = left.y + left.height / 2;
      expect(await hit(page, right.x + 1, y), id).toBe(right.label);
      expect(await hit(page, left.right - 1, y), id).toBe(left.label);
      expect(await hit(page, x, upper.bottom - 1), id).toBe(upper.label);
      expect(await hit(page, x, lower.y + 1), id).toBe(lower.label);
    }
  });

  test('TGR-5: with a target larger than a chip, neighbouring hit areas meet at the middle of the gap along a line and between two lines, a remove action’s too, and a press on a chip’s visible bounds is that chip’s', async ({ page }) => {
    await mount(page, [fx('entered', { spacing: 'chips', label: 'Recipients' }, inputs('Ada Lovelace', 'Grace Hopper', 'Katherine Johnson', 'Margaret Hamilton', 'Hedy Lamarr', 'Annie Easley', 'Mary Jackson')), fx('short', { spacing: 'chips', label: 'Pages' }, ['1', '2', '3'].map((label) => `<tanrei-chip label="${label}"></tanrei-chip>`).join('')), fx('alone', { label: 'x' }, '')]);
    // Any engine: the fine pointer's target is made larger than a chip on both axes, so that every chip extends its hit area.
    const TARGET = 64;
    await rootTokens(page, { '--tanrei-sys-target-pointer': `${TARGET}px` });
    await stage(page, 'alone').evaluate((el) => {
      el.innerHTML = '<tanrei-chip kind="input" label="Ada Lovelace" remove-label="Remove"></tanrei-chip>';
    });
    const [gap, rowGap] = [await token(page, 'gap-chips'), await token(page, 'row-gap-chips')];
    const { lines } = await layout(page, 'entered');
    expect(lines.length).toBeGreaterThan(1);
    const [first, second] = lines;
    const [left, right] = first;
    const y = left.y + left.height / 2;
    // An input chip's remove action reaches past the chip's end: in a set, no further than the middle of the gap.
    expect(await hit(page, left.right + gap / 2 - 1.5, y)).toBe(`${left.label} (remove)`);
    expect(await hit(page, left.right + gap / 2 + 1.5, y)).not.toContain(left.label);
    expect(await hit(page, right.x + 1, y)).toBe(right.label);
    // Chips narrower than the target extend toward each other: the two areas meet at the middle of the gap, and a
    // press on a chip's visible bounds is that chip's.
    const [one, two, three] = (await layout(page, 'short')).placed;
    expect(one.width).toBeLessThan(TARGET - gap);
    const line = one.y + one.height / 2;
    expect(await hit(page, one.right + gap / 2 - 1.5, line)).toBe('1');
    expect(await hit(page, one.right + gap / 2 + 1.5, line)).toBe('2');
    expect(await hit(page, two.right + gap / 2 - 1.5, line)).toBe('2');
    expect(await hit(page, two.right + gap / 2 + 1.5, line)).toBe('3');
    for (const [chip, label] of [[one, '1'], [two, '2'], [three, '3']] as const) {
      expect(await hit(page, chip.x + 1, line)).toBe(label);
      expect(await hit(page, chip.right - 1, line)).toBe(label);
    }
    // At the ends of the line, where no neighbour stands, the area is cut all the same: half a gap past the chip.
    expect(await member(page, 'short', 0).evaluate((el) => Number.parseFloat(getComputedStyle(el.shadowRoot!.querySelector('.container')!, '::before').width))).toBeCloseTo(one.width + gap, 1);
    // Between two lines, under the remove action of the upper chip and over the body of the lower one.
    const lower = second[0];
    const upper = first.find((m) => m.x <= lower.x + 4 && m.right >= lower.x + 4)!;
    const middle = (bottom(first) + top(second)) / 2;
    expect(await hit(page, lower.x + 4, middle - 1.5)).toBe(upper.label);
    expect(await hit(page, lower.x + 4, middle + 1.5)).toBe(lower.label);
    const under = first.find((m) => m.right - 6 >= second[0].x && m.right - 6 <= second[second.length - 1].right);
    if (under) {
      expect(await hit(page, under.right - 6, middle - 1.5)).toBe(`${under.label} (remove)`);
      expect(await hit(page, under.right - 6, middle + 1.5)).not.toContain(under.label);
    }
    near(top(second) - bottom(first), rowGap, 'the lines are row-gap.chips apart');
    // A chip that stands alone is not bounded: its areas are the target's, as before.
    const sizes = (chip: Locator) => chip.evaluate((el) => ['.container', '.remove'].map((part) => { const s = getComputedStyle(el.shadowRoot!.querySelector(part)!, '::before'); return [Number.parseFloat(s.width), Number.parseFloat(s.height)]; }));
    const alone = await sizes(stage(page, 'alone').locator('tanrei-chip'));
    expect(alone[0][1]).toBe(TARGET);
    expect(alone[1]).toEqual([TARGET, TARGET]);
    const inSet = await sizes(member(page, 'entered', 0));
    near(inSet[0][1], left.height + rowGap, 'the chip: its height and the row gap');
    near(inSet[1][1], left.height + rowGap, 'the remove action: the same reach above and below');
    expect(inSet[1][0]).toBeLessThan(alone[1][0]);
  });

  test('TGR-6: the group does not restyle its members — each draws from its own tokens, holds its own state and fires its own events; every chip is its own Tab stop, an input chip one — its remove action is passed; the group takes no focus, handles no arrow key, Home or End, keeps no selection, does not make filter chips exclusive and fires no event', async ({ page }) => {
    await mount(page, [...only('tags', 'chips-filters', 'chips-input-add'), fx('free', { label: 'x' }, '')]);
    // The same tag and the same chip outside any group, to compare with.
    await stage(page, 'free').evaluate((el) => {
      el.innerHTML = '<tanrei-tag label="Design tokens"></tanrei-tag><tanrei-chip kind="filter" label="Open" selected></tanrei-chip>';
    });
    const drawn = (el: Locator) => el.evaluate((node) => { const c = node.shadowRoot!.querySelector('.container')!; const s = getComputedStyle(c); const r = c.getBoundingClientRect(); return [s.backgroundColor, s.color, s.font, s.boxShadow, s.borderRadius, Math.round(r.width * 100) / 100, Math.round(r.height * 100) / 100]; });
    expect(await drawn(member(page, 'tags', 0))).toEqual(await drawn(stage(page, 'free').locator('tanrei-tag')));
    expect(await drawn(member(page, 'chips-filters', 0))).toEqual(await drawn(stage(page, 'free').locator('tanrei-chip')));
    expect((await drawn(member(page, 'tags', 0)))[0]).toBe(await resolveColor(page, '--tanrei-comp-tag-tonal-container-color'));
    // A filter chip holds its own selected and fires its own change; two may be on at once (not exclusive).
    await page.evaluate((tag) => {
      const w = window as unknown as { __seen: string[] };
      w.__seen = [];
      const group = document.querySelector(`[data-fixture="chips-filters"] > ${tag}`)!;
      for (const type of ['change', 'click', 'remove', 'input', 'select', 'toggle']) group.addEventListener(type, (event) => w.__seen.push(`${type}:${(event.target as Element).localName}`));
    }, TAG);
    const selected = () => members(page, 'chips-filters').evaluateAll((all) => all.map((el) => (el as HTMLElement & { selected: boolean }).selected));
    expect(await selected()).toEqual([true, false, true, false, false]);
    await member(page, 'chips-filters', 1).click();
    await expect.poll(selected).toEqual([true, true, true, false, false]);
    // What passes the group is the chip's own click and change: nothing is the group's.
    await expect.poll(() => page.evaluate(() => (window as unknown as { __seen: string[] }).__seen)).toEqual(['click:tanrei-chip', 'change:tanrei-chip']);
    // The group takes no focus: no tabindex, and focus() leaves focus where it was.
    expect(await host(page, 'chips-filters').evaluate((el) => { (el as HTMLElement).focus(); return [el.hasAttribute('tabindex'), (el as HTMLElement).tabIndex, document.activeElement === el, el.getAttribute('role')]; })).toEqual([false, -1, false, null]);
    // Each chip is a Tab stop; an input chip one — its remove action is not a stop (CHP-18), Backspace or Delete removes it.
    await tabTo(page, member(page, 'chips-input-add', 0).locator('.container'));
    const stops = [await focusPath(page)];
    for (let i = 0; i < 3; i++) {
      await tab(page);
      stops.push(await focusPath(page));
    }
    expect(stops).toEqual([onChip('Ada Lovelace'), onChip('Grace Hopper'), onChip('Katherine Johnson'), onChip('Add')]);
    // And back the same way.
    const back = [];
    for (let i = 0; i < 3; i++) {
      await tab(page, { back: true });
      back.push(await focusPath(page));
    }
    expect(back).toEqual([onChip('Katherine Johnson'), onChip('Grace Hopper'), onChip('Ada Lovelace')]);
    for (let i = 0; i < 3; i++) await tab(page);
    // No arrow key, Home or End moves focus.
    for (const key of ['ArrowLeft', 'ArrowUp', 'Home', 'ArrowRight', 'ArrowDown', 'End']) {
      await page.keyboard.press(key);
      expect(await focusPath(page), key).toBe(onChip('Add'));
    }
    // A set of tags has no stop.
    expect(await host(page, 'tags').evaluate((el) => [...el.children].some((child) => (child as HTMLElement).tabIndex >= 0 || !!child.shadowRoot!.querySelector('button, a, [tabindex]')))).toBe(false);
  });

  test('TGR-7: it is one list, named by label, and each member one item of it holding the member as it exposes itself — a tag its text, a filter chip its button with its pressed state, a link chip its link, an input chip its button and its remove action; a new label is exposed at once, and without a label the list is still exposed, unnamed', async ({ page, browserName }) => {
    await mount(page, only('tags', 'chips-filters', 'chips-links', 'chips-input'));
    if (browserName === 'chromium') {
      // Chromium's accessibility tree: the members are light-DOM children of the host, each given role="listitem", and
      // the list is in the group's shadow root around the slot — the items are the list's children in the tree, and
      // what a chip exposes from its own shadow root is inside its item.
      const lists = await axLists(page);
      expect(lists).toEqual([
        { role: 'list', name: 'Tags', children: ['Design tokens', 'Accessibility', 'Right-to-left'].map((name) => ({ role: 'listitem', name: '', children: [text(name)] })) },
        { role: 'list', name: 'Tags', children: ['Design tokens', 'Accessibility', 'Right-to-left', 'Typography'].map((name) => ({ role: 'listitem', name: '', children: [{ role: 'link', name, children: [text(name)] }] })) },
        {
          role: 'list',
          name: 'Filters',
          children: [['Open', 'true'], ['Assigned to me', 'false'], ['Needs review', 'true'], ['Blocked', 'false'], ['Has a design', 'false']].map(([name, pressed]) => ({
            role: 'listitem',
            name: '',
            children: [{ role: 'button', name, pressed, children: [text(name)] }],
          })),
        },
        {
          role: 'list',
          name: 'Recipients',
          children: ['Ada Lovelace', 'Grace Hopper', 'Katherine Johnson'].map((name) => ({
            role: 'listitem',
            name: '',
            children: [
              { role: 'button', name, children: [text(name)] },
              { role: 'button', name: `Remove ${name}`, children: [] },
            ],
          })),
        },
      ]);
    }
    // Every engine: the roles as the page sees them.
    await expect(page.getByRole('list')).toHaveCount(4);
    // (A locator chained from the list looks among the list's DOM descendants, and the members are the host's children:
    // what is inside what is read from the accessibility tree above, and from the snapshots here.)
    await expect(page.getByRole('list')).toHaveCount(4);
    await expect(stage(page, 'chips-filters').getByRole('list', { name: 'Filters' })).toHaveCount(1);
    await expect(stage(page, 'chips-filters').getByRole('listitem')).toHaveCount(5);
    await expect(member(page, 'chips-filters', 0).getByRole('button', { name: 'Open', pressed: true })).toHaveCount(1);
    await expect(member(page, 'chips-input', 1).getByRole('button')).toHaveCount(2);
    await expect(member(page, 'chips-input', 1).getByRole('button', { name: 'Remove Grace Hopper' })).toHaveCount(1);
    expect(await stage(page, 'chips-filters').ariaSnapshot()).toBe('- list "Filters":\n  - listitem:\n    - button "Open" [pressed]\n  - listitem:\n    - button "Assigned to me"\n  - listitem:\n    - button "Needs review" [pressed]\n  - listitem:\n    - button "Blocked"\n  - listitem:\n    - button "Has a design"');
    expect(await stage(page, 'tags').ariaSnapshot()).toBe('- list "Tags":\n  - listitem: Design tokens\n  - listitem: Accessibility\n  - listitem: Right-to-left');
    // The host has no role; the list is in its shadow root, and the item role is written on each member.
    expect(await host(page, 'tags').evaluate((el) => [el.getAttribute('role'), el.getAttribute('aria-label'), [...el.children].map((child) => child.getAttribute('role'))])).toEqual([null, null, ['listitem', 'listitem', 'listitem']]);
    // A new label is the new name at once; an empty one leaves the list, unnamed.
    await host(page, 'tags').evaluate((el) => ((el as HTMLElement & { label: string }).label = 'Topics'));
    await expect(list(page, 'tags')).toHaveAttribute('aria-label', 'Topics');
    await expect(stage(page, 'tags').getByRole('list', { name: 'Topics' })).toHaveCount(1);
    await host(page, 'tags').evaluate((el) => ((el as HTMLElement & { label: string }).label = ''));
    await expect(list(page, 'tags')).not.toHaveAttribute('aria-label');
    await expect(stage(page, 'tags').getByRole('list')).toHaveCount(1);
    await expect(stage(page, 'tags').getByRole('listitem')).toHaveCount(3);
    if (browserName === 'chromium') expect((await axLists(page))[0]).toMatchObject({ role: 'list', name: '' });
    // A member that leaves is what it was: the role the group gave is taken back; one the product wrote is left alone.
    const left = await host(page, 'tags').evaluate(async (el) => {
      const [first, second] = [...el.children];
      second.setAttribute('role', 'note');
      second.remove();
      first.remove();
      await new Promise((resolve) => setTimeout(resolve));
      return [first.getAttribute('role'), second.getAttribute('role'), el.children.length];
    });
    expect(left).toEqual([null, 'note', 1]);
  });

  test('TGR-8: with no member it draws nothing, takes no space, exposes no list and no name, and reports nothing; with one member it is a list of one', async ({ page, browserName }) => {
    const seen = warnings(page);
    await mount(page, [fx('none', { spacing: 'tags', label: 'Tags' }, ''), fx('spaces', { spacing: 'chips', label: 'Filters' }, '\n   \n'), ...only('tags-single')]);
    await page.addStyleTag({ content: `.stage { display: flex; gap: 24px; }` });
    for (const id of ['none', 'spaces']) {
      expect(await host(page, id).evaluate((el) => [getComputedStyle(el).display, el.getBoundingClientRect().width, el.getBoundingClientRect().height, el.shadowRoot!.querySelector('[role="list"]')]), id).toEqual(['none', 0, 0, null]);
      await expect(stage(page, id).getByRole('list')).toHaveCount(0);
      expect(await stage(page, id).ariaSnapshot(), id).toBe('');
    }
    if (browserName === 'chromium') expect((await axLists(page)).map((one) => one.name)).toEqual(['Tags']);
    // One member: laid out, and a list of one.
    const single = await layout(page, 'tags-single');
    expect(single.placed.length).toBe(1);
    near(single.placed[0].x, single.group.x, 'the one member at the start edge');
    expect(await stage(page, 'tags-single').ariaSnapshot()).toBe('- list "Tags":\n  - listitem: Design tokens');
    // A member that arrives makes the list; the last one that leaves takes it away again.
    await host(page, 'none').evaluate((el) => el.insertAdjacentHTML('beforeend', '<tanrei-tag label="Design"></tanrei-tag>'));
    await expect(stage(page, 'none').getByRole('list', { name: 'Tags' })).toHaveCount(1);
    await expect(stage(page, 'none').getByRole('listitem')).toHaveCount(1);
    expect(await host(page, 'none').evaluate((el) => getComputedStyle(el).display)).toBe('block');
    await host(page, 'none').evaluate((el) => el.firstElementChild!.remove());
    await expect(stage(page, 'none').getByRole('list')).toHaveCount(0);
    expect(await host(page, 'none').evaluate((el) => getComputedStyle(el).display)).toBe('none');
    await frames(page);
    expect(seen.filter((line) => line.includes('tanrei-tag-group'))).toEqual([]);
  });

  test('TGR-9: when a member leaves while focus is on it, focus goes to the chip that follows — to the one before where none follows — on the chip and never on its remove action; the group removes nothing itself and announces nothing', async ({ page }) => {
    await mount(page, [fx('five', { spacing: 'chips', label: 'Recipients' }, inputs(...FIVE))]);
    const chip = (label: string) => host(page, 'five').locator(`tanrei-chip[label="${label}"]`);
    const remaining = () => host(page, 'five').evaluate((el) => [...el.children].map((child) => child.getAttribute('label')));
    // The group removes nothing itself: with no listener of the page's, the chip that asks stays.
    await tabTo(page, chip('Katherine').locator('.container'));
    await page.keyboard.press('Delete');
    await frames(page);
    expect(await remaining()).toEqual(FIVE);
    expect(await focusPath(page)).toBe(onChip('Katherine'));
    // The page removes a chip that asks.
    await host(page, 'five').evaluate((el) => el.addEventListener('remove', (event) => (event.target as Element).remove()));
    // The spec's unit: of five, removing the focused third puts focus on the former fourth.
    await page.keyboard.press('Delete');
    await expect.poll(() => focusPath(page)).toBe(onChip('Margaret'));
    expect(await remaining()).toEqual(['Ada', 'Grace', 'Margaret', 'Hedy']);
    // The remove action is not a Tab stop: Tab goes on to the next chip.
    await tab(page);
    expect(await focusPath(page)).toBe(onChip('Hedy'));
    await tab(page, { back: true });
    expect(await focusPath(page)).toBe(onChip('Margaret'));
    // Pressing a chip's remove action, from the keyboard where focus has been put on it (as assistive technology does),
    // puts focus on the next chip — on the chip, not on its remove action.
    await chip('Margaret').locator('.remove').focus();
    expect(await focusPath(page)).toBe('tanrei-chip[Margaret] > button.remove');
    await page.keyboard.press('Enter');
    await expect.poll(() => focusPath(page)).toBe(onChip('Hedy'));
    // Removing the focused last puts focus on the new last.
    await page.keyboard.press('Backspace');
    await expect.poll(() => focusPath(page)).toBe(onChip('Grace'));
    expect(await remaining()).toEqual(['Ada', 'Grace']);
    // Several in a row: the person goes on from where they were.
    await page.keyboard.press('Backspace');
    await expect.poll(() => focusPath(page)).toBe(onChip('Ada'));
    // The last one: nothing is left to take focus, and the group does not move it anywhere.
    await page.keyboard.press('Backspace');
    await expect.poll(remaining).toEqual([]);
    expect(await focusPath(page)).toBe('body');
    // Nothing is announced: the group has no live region.
    await mount(page, [fx('five', { spacing: 'chips', label: 'Recipients' }, inputs(...FIVE))]);
    expect(await host(page, 'five').evaluate((el) => el.shadowRoot!.querySelectorAll('[aria-live], [role="status"], [role="alert"]').length)).toBe(0);
  });

  test('TGR-9: a member that takes no focus — a tag, a disabled chip — is passed; where none that takes focus is left the group does not move focus, nor when the member that left did not have it, nor when the product has put it somewhere', async ({ page }) => {
    const markup = `<tanrei-chip kind="input" label="Ada" remove-label="Remove Ada"></tanrei-chip><tanrei-chip kind="input" label="Grace" remove-label="Remove Grace"></tanrei-chip><tanrei-tag label="Static"></tanrei-tag><tanrei-chip kind="input" label="Off" remove-label="Remove Off" disabled></tanrei-chip><tanrei-chip kind="input" label="Hedy" remove-label="Remove Hedy"></tanrei-chip>`;
    await mount(page, [fx('mixed', { spacing: 'chips', label: 'Recipients' }, markup), fx('back', { spacing: 'chips', label: 'Recipients' }, markup), fx('stuck', { spacing: 'chips', label: 'Recipients' }, `<tanrei-tag label="Static"></tanrei-tag><tanrei-chip kind="input" label="Only" remove-label="Remove Only"></tanrei-chip><tanrei-chip label="Off" disabled></tanrei-chip>`), fx('else', { spacing: 'chips', label: 'Recipients' }, inputs(...FIVE))]);
    await page.evaluate((tag) => {
      for (const group of document.querySelectorAll(tag)) group.addEventListener('remove', (event) => (event.target as Element).remove());
    }, TAG);
    const chip = (id: string, label: string) => host(page, id).locator(`tanrei-chip[label="${label}"]`);
    // Forward, past the tag and the disabled chip.
    await tabTo(page, chip('mixed', 'Grace').locator('.container'));
    await page.keyboard.press('Delete');
    await expect.poll(() => focusPath(page)).toBe(onChip('Hedy'));
    // Back, past them, where none follows.
    await tabTo(page, chip('back', 'Hedy').locator('.container'));
    await page.keyboard.press('Delete');
    await expect.poll(() => focusPath(page)).toBe(onChip('Grace'));
    // Nothing left that takes focus: it is not moved (the product's to place, CHP-22).
    await tabTo(page, chip('stuck', 'Only').locator('.container'));
    await page.keyboard.press('Delete');
    await expect(chip('stuck', 'Only')).toHaveCount(0);
    await frames(page);
    expect(await focusPath(page)).toBe('body');
    // A member that leaves without focus moves nothing.
    await tabTo(page, chip('else', 'Grace').locator('.container'));
    await chip('else', 'Katherine').evaluate((el) => el.remove());
    await frames(page);
    expect(await focusPath(page)).toBe(onChip('Grace'));
    // Focus the person took elsewhere is not pulled back when the chip they left is removed later.
    await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<button id="elsewhere">Elsewhere</button>'));
    await page.locator('#elsewhere').focus();
    await chip('else', 'Grace').evaluate((el) => el.remove());
    await frames(page);
    expect(await focusPath(page)).toBe('button');
    // Where the product moves focus itself as it removes the member, the group leaves it there.
    await tabTo(page, chip('else', 'Margaret').locator('.container'));
    await chip('else', 'Margaret').evaluate((el) => {
      el.remove();
      document.querySelector<HTMLElement>('#elsewhere')!.focus();
    });
    await frames(page);
    expect(await focusPath(page)).toBe('button');
  });

  test('TGR-9: a product that writes the whole set again, without the member that had focus, finds focus on the chip that now stands in its place', async ({ page }) => {
    await mount(page, [fx('rewritten', { spacing: 'chips', label: 'Suggested fonts' }, '')]);
    // A row of suggestions drawn again from its data each time one is taken.
    await host(page, 'rewritten').evaluate((el) => {
      const left = ['Inter', 'Noto Sans JP', 'Roboto', 'Source Sans 3'];
      const draw = () => {
        el.innerHTML = left.map((name) => `<tanrei-chip label="${name}"></tanrei-chip>`).join('');
      };
      el.addEventListener('click', (event) => {
        const name = (event.target as Element).getAttribute('label');
        if (!name) return;
        left.splice(left.indexOf(name), 1);
        draw();
      });
      draw();
    });
    await tabTo(page, host(page, 'rewritten').locator('tanrei-chip[label="Noto Sans JP"]').locator('.container'));
    await page.keyboard.press('Enter');
    await expect.poll(() => focusPath(page)).toBe(onChip('Roboto'));
    await tab(page);
    await page.keyboard.press('Enter');
    // The last was taken: the one before it.
    await expect.poll(() => focusPath(page)).toBe(onChip('Roboto'));
    expect(await host(page, 'rewritten').evaluate((el) => [...el.children].map((child) => child.getAttribute('label')))).toEqual(['Inter', 'Roboto']);
  });

  // TGR-10: where each member is drawn in a frame, from the group's corner, by its label.
  const placesProbe = (root: Element) => {
    const origin = root.getBoundingClientRect();
    const out: Record<string, number> = {};
    for (const el of Array.from(root.children)) {
      const label = el.getAttribute('label') ?? '';
      const r = el.getBoundingClientRect();
      out[`x:${label}`] = Math.round((r.left - origin.left) * 10) / 10;
      out[`y:${label}`] = Math.round((r.top - origin.top) * 10) / 10;
      out[`right:${label}`] = Math.round((r.right - origin.left) * 10) / 10;
    }
    return out;
  };
  /** TGR-10, MOT-2: in every frame `name` lies on the way from where it was drawn before the change to where it rests, and never turns back. */
  const onTheWay = (seen: Frames, name: string) => {
    const from = Number(seen.before.probe[name]);
    const to = Number(seen.rest.probe[name]);
    let last = from;
    for (const frame of seen.frames) {
      const value = Number(frame.probe[name]);
      expect(Math.min(from, to) - 0.5 <= value && value <= Math.max(from, to) + 0.5, `${name} in frame ${frame.index}: ${value} on the way ${from} → ${to}`).toBe(true);
      expect((value - last) * Math.sign(to - from), `${name} in frame ${frame.index}: ${last} → ${value} goes toward ${to}`).toBeGreaterThanOrEqual(-0.5);
      last = value;
    }
  };
  /** The moves the group made, as the frames sampler held them: scripts' animations on the members. */
  const moves = (seen: Frames) => seen.motions.filter((motion) => motion.kind === 'script' && /^tanrei-(chip|tag)\b/.test(motion.on));
  const expectMoveTiming = async (page: P, seen: Frames) => {
    const duration = await resolveToken(page, T('motion-move-duration'), 'duration');
    expect(duration, 'move-duration aliases sys.motion.role.selection.travel').toBe(await resolveToken(page, '--tanrei-sys-motion-role-selection-travel', 'duration'));
    const easing = await resolveEasing(page, T('motion-move-easing'));
    expect(easing, 'move-easing aliases sys.motion.easing.spatial').toBe(await resolveEasing(page, '--tanrei-sys-motion-easing-spatial'));
    expect(moves(seen).length).toBeGreaterThan(0);
    for (const motion of moves(seen)) expect([motion.duration, motion.easing], motion.on).toEqual([Math.round(duration), easing]);
  };

  test('TGR-10: a member that is removed leaves at once, and the members after it move toward the start from where they were drawn, over the move motion (sys.motion.role.selection.travel on the spatial curve), without fading or scaling; the ones before it stay, and focus stays where it was', async ({ page }) => {
    await mount(page, only('chips-filters'), { reducedMotion: false });
    const id = 'chips-filters';
    expect((await layout(page, id)).lines.length).toBe(1);
    // MOT-3: nothing moved while the group was first drawn.
    expect(await members(page, id).evaluateAll((all) => all.flatMap((el) => el.getAnimations()).length)).toBe(0);
    await tabTo(page, member(page, id, 4).locator('.container'));
    const seen = await sampleFrames(host(page, id), () => member(page, id, 1).evaluate((el) => el.remove()), { probe: placesProbe });
    expect(seen.complete).toBe(true);
    expect(seen.frames[0]!.probe['x:Assigned to me'], 'the removed member is gone in the first frame').toBeUndefined();
    for (const label of ['Needs review', 'Blocked', 'Has a design']) {
      expectAnimated(seen, `x:${label}`);
      onTheWay(seen, `x:${label}`);
      expect(seen.frames.every((frame) => frame.probe[`y:${label}`] === seen.rest.probe[`y:${label}`]), `${label} stays on its line`).toBe(true);
    }
    expect(seen.frames.every((frame) => frame.probe['x:Open'] === seen.before.probe['x:Open']), 'the member before it does not move').toBe(true);
    await expectMoveTiming(page, seen);
    // Only a translation: no opacity, scale or filter on the members at any frame.
    expect(await members(page, id).evaluateAll((all) => all.map((el) => [getComputedStyle(el).opacity, getComputedStyle(el).scale, getComputedStyle(el).translate]))).toEqual(Array(4).fill(['1', 'none', 'none']));
    const closed = await layout(page, id);
    near(closed.placed[1].x - closed.placed[0].right, await token(page, 'gap-chips'), 'the rest stand a gap apart');
    expect(await focusPath(page)).toBe(onChip('Has a design'));
  });

  test('TGR-10: a member that is added appears in its place at once, the members after it move aside, and adding a member moves no focus', async ({ page }) => {
    await mount(page, only('chips-filters'), { reducedMotion: false });
    const id = 'chips-filters';
    await tabTo(page, member(page, id, 4).locator('.container'));
    const seen = await sampleFrames(host(page, id), () => host(page, id).evaluate((el) => el.insertAdjacentHTML('afterbegin', '<tanrei-chip kind="filter" label="Added"></tanrei-chip>')), { probe: placesProbe });
    expect(seen.complete).toBe(true);
    // The new member is drawn whole, where it rests, from the first frame.
    for (const frame of seen.frames) expect([frame.probe['x:Added'], frame.probe['right:Added']], `frame ${frame.index}`).toEqual([seen.rest.probe['x:Added'], seen.rest.probe['right:Added']]);
    // The first member that stood after it moves aside; one that goes to another line moves there.
    expectAnimated(seen, 'x:Open');
    onTheWay(seen, 'x:Open');
    const rest = await layout(page, id);
    const later = rest.placed.filter((m) => m.label !== 'Added');
    for (const one of later) {
      const moved = seen.before.probe[`x:${one.label}`] !== seen.rest.probe[`x:${one.label}`] || seen.before.probe[`y:${one.label}`] !== seen.rest.probe[`y:${one.label}`];
      if (moved) expectAnimated(seen, seen.before.probe[`y:${one.label}`] !== seen.rest.probe[`y:${one.label}`] ? `y:${one.label}` : `x:${one.label}`);
    }
    await expect(stage(page, id).getByRole('listitem')).toHaveCount(6);
    expect(await focusPath(page)).toBe(onChip('Has a design'));
  });

  test('TGR-10: a member that grows until the last one no longer fits sends that one to the next line over the move motion, in both directions; it keeps focus; the line is placed again by TGR-2', async ({ page }) => {
    await mount(page, only('chips-filters'), { reducedMotion: false });
    const id = 'chips-filters';
    const before = await layout(page, id);
    expect(before.lines.length).toBe(1);
    await tabTo(page, member(page, id, 4).locator('.container'));
    const seen = await sampleFrames(host(page, id), () => member(page, id, 1).evaluate((el) => el.setAttribute('label', 'Assigned to me and waiting for a review')), { probe: placesProbe });
    expect(seen.complete).toBe(true);
    const grown = await layout(page, id);
    expect(grown.lines.length).toBeGreaterThan(1);
    const sent = grown.lines[1]![0]!.label;
    expectAnimated(seen, `y:${sent}`);
    onTheWay(seen, `y:${sent}`);
    onTheWay(seen, `x:${sent}`);
    expect(seen.frames.every((frame) => frame.probe['x:Open'] === seen.before.probe['x:Open'] && frame.probe['y:Open'] === seen.before.probe['y:Open']), 'the member before the one that grew does not move').toBe(true);
    await expectMoveTiming(page, seen);
    expect(await focusPath(page)).toBe(onChip('Has a design'));
    near(top(grown.lines[1]!) - bottom(grown.lines[0]!), await token(page, 'row-gap-chips'), 'placed again by TGR-2');
  });

  test('TGR-10: a line that keeps its members follows a member that changes its size over its own motion at once — a filter chip that is switched on carries the chips after it, a gap away in every frame, and the group moves none of them', async ({ page }) => {
    await mount(page, [fx('carried', { spacing: 'chips', label: 'Filters' }, filters('Open', 'Mine', 'Review'))], { reducedMotion: false });
    const id = 'carried';
    const probe = (root: Element) => {
      const [a, b, c] = Array.from(root.children).map((el) => el.getBoundingClientRect());
      return { width: a!.width, gap: Math.round((b!.left - a!.right) * 10) / 10, next: Math.round((c!.left - b!.right) * 10) / 10 };
    };
    const seen = await sampleFrames(host(page, id), () => member(page, id, 0).evaluate((el) => ((el as HTMLElement & { selected: boolean }).selected = true)), { probe });
    expect(seen.complete).toBe(true);
    expect((await layout(page, id)).lines.length).toBe(1);
    // The chip grows over its own selection motion (CHP-10) …
    expectAnimated(seen, 'width');
    // … and the chips after it keep their gap in every frame: carried, not chased.
    for (const frame of seen.frames) near(Number(frame.probe.gap), await token(page, 'gap-chips'), `frame ${frame.index}: the gap after the chip that grows`);
    for (const frame of seen.frames) near(Number(frame.probe.next), await token(page, 'gap-chips'), `frame ${frame.index}: the gap after that`);
    expect(moves(seen)).toEqual([]);
  });

  test('TGR-10: where motion is reduced, and when the width the layout gives the group changes, every member is placed again at once', async ({ page }) => {
    await mount(page, only('chips-filters'), { reducedMotion: true });
    const id = 'chips-filters';
    const removed = await sampleFrames(host(page, id), () => member(page, id, 1).evaluate((el) => el.remove()), { probe: placesProbe });
    expectFirstFrameAtRest(removed);
    expect(moves(removed)).toEqual([]);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const width = (await layout(page, id)).group.width;
    const narrowed = await sampleFrames(host(page, id), () => host(page, id).evaluate((el, w) => (el.style.inlineSize = `${Math.round(w / 2)}px`), width), { probe: placesProbe });
    expect((await layout(page, id)).lines.length).toBeGreaterThan(1);
    expectFirstFrameAtRest(narrowed);
    expect(moves(narrowed)).toEqual([]);
  });

  test('TGR-11: content that is not a tag or a chip is still laid out and exposed as a member, and reported; an element with a role of its own keeps it', async ({ page }) => {
    const seen = warnings(page);
    await mount(page, [fx('foreign', { spacing: 'tags', label: 'Tags' }, `<tanrei-tag label="Design"></tanrei-tag><span class="own">Research</span><a href="https://example.com/tanrei">Writing</a><tanrei-tag label="Motion"></tanrei-tag>`)]);
    const { placed, lines } = await layout(page, 'foreign');
    expect(lines.length).toBe(1);
    const gap = await token(page, 'gap-tags');
    for (let i = 1; i < placed.length; i++) near(placed[i].x - placed[i - 1].right, gap, `member ${i} stands a gap after the one before`);
    // A span says nothing by itself and is an item; a link keeps its role inside the list.
    expect(await host(page, 'foreign').evaluate((el) => [...el.children].map((child) => child.getAttribute('role')))).toEqual(['listitem', 'listitem', null, 'listitem']);
    await expect(stage(page, 'foreign').getByRole('listitem')).toHaveCount(3);
    expect(await stage(page, 'foreign').ariaSnapshot()).toMatch(/^- list "Tags":\n  - listitem: Design\n  - listitem: Research\n  - link "Writing":\n(    - \/url: .*\n)?  - listitem: Motion$/);
    await expect.poll(() => seen.filter((line) => line.includes('TGR-11')).length).toBe(2);
    expect(seen.join('\n')).toMatch(/it holds <span>, which is not a <tanrei-tag> or a <tanrei-chip>; it is laid out and exposed as an item \(TGR-11\)/);
    expect(seen.join('\n')).toMatch(/it holds <a>, which is not a <tanrei-tag> or a <tanrei-chip>; it is laid out, but keeps its own role.* \(TGR-11\)/);
  });

  test('TGR-12: at 200% text in a window 320 wide the gaps are kept, the members grow and wrap onto more lines, none is lost, lies over another or is cut by the group, and nothing scrolls sideways', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await mount(page, only('tags-wrap', 'chips-filters-wrap', 'chips-input-add', 'tags-long-member'));
    await page.addStyleTag({ content: `main { align-items: stretch !important; } .stage { inline-size: auto !important; }` });
    const linesBefore = (await layout(page, 'chips-filters-wrap')).lines.length;
    const heightBefore = (await layout(page, 'chips-filters-wrap')).placed[0].height;
    await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
    await frames(page);
    // TGR-10: the members that change line move there; what is read is where they rest.
    await motionEnded(page);
    for (const [id, spacing] of [['tags-wrap', 'tags'], ['chips-filters-wrap', 'chips'], ['chips-input-add', 'chips'], ['tags-long-member', 'tags']] as const) {
      const { group, placed, lines } = await layout(page, id);
      const [gap, rowGap] = [await token(page, `gap-${spacing}`), await token(page, `row-gap-${spacing}`)];
      expect(placed.length, id).toBe(spec.fixtures.find((f) => f.id === id)!.items!.length);
      for (const one of placed) {
        expect(one.width, `${id}: ${one.label} is drawn`).toBeGreaterThan(0);
        expect(one.x, `${id}: ${one.label} inside the group`).toBeGreaterThanOrEqual(group.x - 0.5);
        expect(one.right, `${id}: ${one.label} inside the group`).toBeLessThanOrEqual(group.right + 0.5);
      }
      for (const line of lines) for (let i = 1; i < line.length; i++) near(line[i].x - line[i - 1].right, gap, `${id}: the gap is kept`);
      for (let i = 1; i < lines.length; i++) near(top(lines[i]) - bottom(lines[i - 1]), rowGap, `${id}: the row gap is kept`);
      near(group.height, bottom(lines[lines.length - 1]) - top(lines[0]), `${id}: as tall as its lines`);
    }
    const large = await layout(page, 'chips-filters-wrap');
    expect(large.lines.length).toBeGreaterThan(linesBefore);
    expect(large.placed[0].height).toBeGreaterThan(heightBefore);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });

  test('TGR-13: under forced colors the group still draws nothing of its own, and the distances between its members are what they were', async ({ page }) => {
    await mount(page, only('tags-wrap', 'chips-filters-wrap'));
    const before = { tags: await layout(page, 'tags-wrap'), chips: await layout(page, 'chips-filters-wrap') };
    await page.emulateMedia({ forcedColors: 'active' });
    await frames(page);
    for (const [id, was] of [['tags-wrap', before.tags], ['chips-filters-wrap', before.chips]] as const) {
      for (const part of [host(page, id), list(page, id)]) {
        expect(await part.evaluate((el) => { const s = getComputedStyle(el); return [s.borderTopWidth, s.borderInlineStartWidth, s.outlineStyle, s.backgroundImage, s.boxShadow]; }), id).toEqual(['0px', '0px', 'none', 'none', 'none']);
      }
      const now = await layout(page, id);
      const spacing = id === 'tags-wrap' ? 'tags' : 'chips';
      expect(now.placed.map((m) => m.label), id).toEqual(was.placed.map((m) => m.label));
      expect(now.lines.length, id).toBeGreaterThan(1);
      for (const line of now.lines) for (let i = 1; i < line.length; i++) near(line[i].x - line[i - 1].right, await token(page, `gap-${spacing}`), `${id}: the gap along a line`);
      for (let i = 1; i < now.lines.length; i++) near(top(now.lines[i]) - bottom(now.lines[i - 1]), await token(page, `row-gap-${spacing}`), `${id}: the gap between two lines`);
    }
    // Its members draw themselves: a tag gains its edge (TAG-14).
    expect(await member(page, 'tags-wrap', 0).evaluate((el) => getComputedStyle(el.shadowRoot!.querySelector('.container')!).borderTopStyle)).toBe('solid');
  });

  test('TGR-14: in a right-to-left layout every line starts at the right edge and runs right to left in the order given, wrapping to a new line below; focus and reading keep that order', async ({ page }) => {
    await mount(page, only('chips-filters-rtl', 'tags-rtl', 'ltr-members-rtl'));
    for (const id of ['chips-filters-rtl', 'tags-rtl', 'ltr-members-rtl']) {
      const { group, placed, lines } = await layout(page, id);
      const given = spec.fixtures.find((f) => f.id === id)!.items!.map((item) => String(item.props.label));
      expect(placed.map((m) => m.label), id).toEqual(given);
      // The first member is at the top right; each line runs right to left.
      near(placed[0].right, group.right, `${id}: the first member at the right edge`);
      near(placed[0].y, group.y, `${id}: at the top`);
      for (const line of lines) {
        near(line[0].right, group.right, `${id}: a line starts at the right`);
        for (let i = 1; i < line.length; i++) near(line[i - 1].x - line[i].right, await token(page, `gap-${id === 'tags-rtl' ? 'tags' : 'chips'}`), `${id}: right to left, a gap apart`);
      }
    }
    // The spec's verify: the filters wrap, and the second line starts at the right.
    const wrapped = await layout(page, 'chips-filters-rtl');
    expect(wrapped.lines.length).toBeGreaterThan(1);
    expect(top(wrapped.lines[1])).toBeGreaterThan(bottom(wrapped.lines[0]));
    // Focus follows the order given, not the place on the screen.
    const given = spec.fixtures.find((f) => f.id === 'chips-filters-rtl')!.items!.map((item) => String(item.props.label));
    await tabTo(page, member(page, 'chips-filters-rtl', 0).locator('.container'));
    const walked = [await focusPath(page)];
    for (let i = 1; i < given.length; i++) {
      await tab(page);
      walked.push(await focusPath(page));
    }
    expect(walked).toEqual(given.map(onChip));
    expect(await stage(page, 'tags-rtl').ariaSnapshot()).toBe(`- list "${String(spec.fixtures.find((f) => f.id === 'tags-rtl')!.props.label)}":\n${spec.fixtures.find((f) => f.id === 'tags-rtl')!.items!.map((item) => `  - listitem: ${String(item.props.label)}`).join('\n')}`);
    // A member's own content follows the direction as its own spec says: a left-to-right label is still read left to right.
    expect(await member(page, 'ltr-members-rtl', 0).evaluate((el) => getComputedStyle(el).direction)).toBe('rtl');
  });

  test('TGR-15: the direction comes from the nearest ancestor that sets one — not from the root, and there is no setting of its own; when it changes the group is drawn for the new direction at once, without a motion, keeping its members, their state and their focus', async ({ page }) => {
    await mount(page, [fx('inner', { spacing: 'chips', label: 'Filters' }, `<tanrei-chip kind="filter" label="Open" selected></tanrei-chip>${filters('Blocked', 'Archived')}`)]);
    const id = 'inner';
    expect(await page.evaluate(() => document.documentElement.getAttribute('dir'))).toBeNull();
    expect(await host(page, id).evaluate((el) => ['dir', 'direction'].some((name) => name in (el.constructor as unknown as { elementProperties: Map<string, unknown> }).elementProperties))).toBe(false);
    const ltr = await layout(page, id);
    near(ltr.placed[0].x, ltr.group.x, 'left to right: the first member at the left');
    await tabTo(page, member(page, id, 0).locator('.container'));
    // The direction is set on an ancestor inside the page, after the first render.
    await stage(page, id).evaluate((el) => el.setAttribute('dir', 'rtl'));
    const rtl = await layout(page, id);
    near(rtl.placed[0].right, rtl.group.right, 'right to left: the first member at the right');
    expect(rtl.placed[1].right).toBeLessThan(rtl.placed[0].x);
    expect(rtl.placed.map((m) => m.label)).toEqual(ltr.placed.map((m) => m.label));
    expect(await focusPath(page)).toBe(onChip('Open'));
    expect(await members(page, id).evaluateAll((all) => all.map((el) => (el as HTMLElement & { selected: boolean }).selected))).toEqual([true, false, false]);
    expect(await host(page, id).evaluate((el) => el.getAnimations({ subtree: false }).length + el.shadowRoot!.querySelector('[role="list"]')!.getAnimations().length)).toBe(0);
    // And back.
    await stage(page, id).evaluate((el) => el.setAttribute('dir', 'ltr'));
    near((await layout(page, id)).placed[0].x, ltr.placed[0].x, 'left to right again');
    expect(await focusPath(page)).toBe(onChip('Open'));
  });

  test('TGR-16: the default spacing is chips; a spacing the active design system does not have is drawn with the default’s tokens and reported; one a layer adds is drawn from its own tokens and is not', async ({ page }) => {
    const seen = warnings(page);
    const many = filters('Open', 'Assigned to me', 'Needs review', 'Blocked', 'Has a design', 'Web', 'iOS', 'Android', 'This week', 'Overdue');
    await mount(page, [fx('unknown', { spacing: 'loose', label: 'Filters' }, many), fx('odd', { spacing: 'Not A Name', label: 'Filters' }, many), fx('holder', { label: 'x' }, '')]);
    // The default is chips: a set whose spacing is not written stands as far apart as a set of chips must.
    expect(await host(page, 'holder').evaluate((el: any) => el.spacing)).toBe('chips');
    // `dense` is a value a layer added: the layer's two tokens are what the group reads.
    await page.addStyleTag({ content: `:root { ${T('gap-dense')}: 2px; ${T('row-gap-dense')}: 4px; }` });
    await stage(page, 'holder').evaluate((el, [tag, inside]) => {
      el.innerHTML = `<${tag} spacing="dense" label="Filters">${inside}</${tag}>`;
    }, [TAG, many]);
    await frames(page);
    for (const id of ['unknown', 'odd']) {
      const { placed, lines } = await layout(page, id);
      near(placed[1].x - placed[0].right, await token(page, 'gap-chips'), `${id}: the default's gap`);
      near(top(lines[1]) - bottom(lines[0]), await token(page, 'row-gap-chips'), `${id}: the default's row gap`);
    }
    const added = await layout(page, 'holder');
    near(added.placed[1].x - added.placed[0].right, 2, 'the layer’s gap');
    near(top(added.lines[1]) - bottom(added.lines[0]), 4, 'the layer’s row gap');
    await expect.poll(() => seen.filter((line) => line.includes('TGR-16')).length).toBeGreaterThanOrEqual(2);
    expect(seen.join('\n')).toMatch(/spacing "loose" is not a value of the active design system; it is drawn as "chips" \(TGR-16\)/);
    expect(seen.join('\n')).toMatch(/spacing "Not A Name" is not a value of the active design system; it is drawn as "chips" \(TGR-16\)/);
    expect(seen.join('\n')).not.toMatch(/dense/);
  });

  // ── Selection (TGR-17 to TGR-21) ──────────────────────────────────────────────────────────────────────────────────

  test('TGR-17: under single or multiple the group holds the selection of its filter chips by their value — each shows and exposes it as its pressed state; a value set by the product, a chip that arrives and a chip that changes its value are put right, and nothing is fired; a member that leaves changes nothing; under none the chips keep what they have; a selection the group does not have is none, and reported', async ({ page }) => {
    const seen = warnings(page);
    const filters5 = `<tanrei-chip kind="filter" label="Open" value="open"></tanrei-chip><tanrei-chip kind="filter" label="Assigned to me" value="assigned"></tanrei-chip><tanrei-chip kind="filter" label="Needs review" value="review" selected></tanrei-chip><tanrei-chip kind="filter" label="Blocked" value="blocked"></tanrei-chip><tanrei-chip label="Clear"></tanrei-chip>`;
    await mount(page, [...only('chips-filters-multiple', 'chips-filters-single'), fx('odd', { label: 'Filters', selection: 'several' }, filters5)]);
    const pressed = (id: string) => members(page, id).evaluateAll((all) => all.map((el) => el.shadowRoot!.querySelector('.container')!.getAttribute('aria-pressed')));
    await page.evaluate((tag) => {
      const w = window as unknown as { __seen: string[] };
      w.__seen = [];
      for (const group of document.querySelectorAll(tag)) group.addEventListener('change', (event) => w.__seen.push(`${(event.target as Element).localName}:${JSON.stringify((event as CustomEvent).detail)}`));
    }, TAG);
    const events = () => page.evaluate(() => (window as unknown as { __seen: string[] }).__seen);
    // The spec's unit: values [open, review] put Open and Needs review on, and only them.
    await expect.poll(() => pressed('chips-filters-multiple')).toEqual(['true', 'false', 'true', 'false', 'false']);
    await expect(stage(page, 'chips-filters-multiple').getByRole('button', { name: 'Needs review', pressed: true })).toHaveCount(1);
    await expect.poll(() => pressed('chips-filters-single')).toEqual(['false', 'true', 'false', 'false']);
    // Still one list of items, each chip its own button (TGR-7).
    await expect(stage(page, 'chips-filters-multiple').getByRole('list', { name: 'Filters' })).toHaveCount(1);
    await expect(stage(page, 'chips-filters-multiple').getByRole('listitem')).toHaveCount(5);
    // The product sets the selection: the chips follow, and nothing is fired.
    await host(page, 'chips-filters-multiple').evaluate((el: any) => (el.values = ['blocked']));
    await expect.poll(() => pressed('chips-filters-multiple')).toEqual(['false', 'false', 'false', 'true', 'false']);
    await host(page, 'chips-filters-single').evaluate((el: any) => (el.value = 'oldest'));
    await expect.poll(() => pressed('chips-filters-single')).toEqual(['false', 'false', 'false', 'true']);
    await host(page, 'chips-filters-single').evaluate((el: any) => (el.value = null));
    await expect.poll(() => pressed('chips-filters-single')).toEqual(['false', 'false', 'false', 'false']);
    // A filter chip that arrives with a value the selection holds arrives on; one whose value changes follows.
    await host(page, 'chips-filters-multiple').evaluate((el) => el.insertAdjacentHTML('beforeend', '<tanrei-chip kind="filter" label="Blocked too" value="blocked"></tanrei-chip>'));
    await expect.poll(() => pressed('chips-filters-multiple')).toEqual(['false', 'false', 'false', 'true', 'false', 'true']);
    await member(page, 'chips-filters-multiple', 0).evaluate((el: any) => (el.value = 'blocked'));
    await expect.poll(() => pressed('chips-filters-multiple')).toEqual(['true', 'false', 'false', 'true', 'false', 'true']);
    // A member that leaves changes neither the values nor anything else, and fires nothing.
    await member(page, 'chips-filters-multiple', 3).evaluate((el) => el.remove());
    expect(await host(page, 'chips-filters-multiple').evaluate((el: any) => el.values)).toEqual(['blocked']);
    // A value that names no member puts nothing on and is not reported.
    await host(page, 'chips-filters-multiple').evaluate((el: any) => (el.values = ['gone']));
    await expect.poll(() => pressed('chips-filters-multiple')).toEqual(['false', 'false', 'false', 'false', 'false']);
    expect(await events()).toEqual([]);
    // Under none the chips keep what they have, and each holds its own again.
    await host(page, 'chips-filters-single').evaluate((el: any) => { el.value = 'newest'; });
    await expect.poll(() => pressed('chips-filters-single')).toEqual(['true', 'false', 'false', 'false']);
    await host(page, 'chips-filters-single').evaluate((el: any) => { el.selection = 'none'; });
    await frames(page);
    await host(page, 'chips-filters-single').evaluate((el: any) => { el.value = 'oldest'; });
    await frames(page);
    expect(await pressed('chips-filters-single')).toEqual(['true', 'false', 'false', 'false']);
    await member(page, 'chips-filters-single', 2).click();
    await expect.poll(() => pressed('chips-filters-single')).toEqual(['true', 'false', 'true', 'false']);
    await expect.poll(events).toEqual(['tanrei-chip:{"selected":true}']);
    // A selection the group does not have is none: the chips keep their own state, and it is reported.
    expect(await pressed('odd')).toEqual(['false', 'false', 'true', 'false', null]);
    await expect.poll(() => seen.filter((line) => line.includes('TGR-17')).length).toBe(1);
    expect(seen.find((line) => line.includes('TGR-17'))).toMatch(/selection "several" is not none, single or multiple/);
  });

  test('TGR-18: a filter chip without a value is left out of the selection — it keeps its own selected and its own change — and two filter chips with one value go on and off together; each is reported, and the group renders either way', async ({ page }) => {
    const seen = warnings(page);
    const markup = `<tanrei-chip kind="filter" label="Open" value="open"></tanrei-chip><tanrei-chip kind="filter" label="Loose"></tanrei-chip><tanrei-chip kind="filter" label="Open again" value="open"></tanrei-chip>`;
    await mount(page, [fx('odd', { label: 'Filters', selection: 'multiple' }, markup)]);
    await page.evaluate((tag) => {
      const w = window as unknown as { __seen: string[] };
      w.__seen = [];
      document.querySelector(tag)!.addEventListener('change', (event) => w.__seen.push(`${(event.target as Element).localName}:${JSON.stringify((event as CustomEvent).detail)}`));
    }, TAG);
    const selected = () => members(page, 'odd').evaluateAll((all) => all.map((el) => (el as HTMLElement & { selected: boolean }).selected));
    await member(page, 'odd', 1).click();
    await expect.poll(selected).toEqual([false, true, false]);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __seen: string[] }).__seen)).toEqual(['tanrei-chip:{"selected":true}']);
    expect(await host(page, 'odd').evaluate((el: any) => el.values)).toEqual([]);
    await member(page, 'odd', 0).click();
    await expect.poll(selected).toEqual([true, true, true]);
    await member(page, 'odd', 2).click();
    await expect.poll(selected).toEqual([false, true, false]);
    await expect.poll(() => page.evaluate(() => (window as unknown as { __seen: string[] }).__seen)).toEqual(['tanrei-chip:{"selected":true}', 'tanrei-tag-group:{"values":["open"]}', 'tanrei-tag-group:{"values":[]}']);
    await expect(list(page, 'odd')).toBeVisible();
    await expect.poll(() => seen.filter((line) => line.includes('TGR-18')).length).toBe(2);
    expect(seen.join('\n')).toMatch(/the filter chip "Loose" has no value/);
    expect(seen.join('\n')).toMatch(/two filter chips have the value "open"/);
  });

  test('TGR-19: switching a filter chip sets value (single) — the others go off, and the chip that is on can be switched off — or values (multiple), then fires one change with what the group now holds; the chip’s own change stops at the group, and the product’s writes fire nothing', async ({ page }) => {
    await mount(page, only('chips-filters-single', 'chips-filters-multiple'));
    await page.evaluate((tag) => {
      const w = window as unknown as { __seen: string[] };
      w.__seen = [];
      // Listeners on the group and above it: what passes the group is the group's own change, and the chip's click.
      for (const group of document.querySelectorAll(tag)) {
        group.addEventListener('change', (event) => w.__seen.push(`${group.getAttribute('label')} change ${(event.target as Element).localName}:${JSON.stringify((event as CustomEvent).detail)}:${JSON.stringify((group as any).selection === 'single' ? (group as any).value : (group as any).values)}`));
        group.addEventListener('click', (event) => w.__seen.push(`${group.getAttribute('label')} click ${(event.target as Element).localName}`));
      }
      document.addEventListener('change', (event) => w.__seen.push(`document change ${(event.target as Element).localName}`));
    }, TAG);
    const events = () => page.evaluate(() => (window as unknown as { __seen: string[] }).__seen);
    // What was heard since the last look, which is then forgotten.
    const heard = async (expected: string[]) => {
      await expect.poll(events).toEqual(expected);
      await page.evaluate(() => (window as unknown as { __seen: string[] }).__seen.splice(0));
    };
    const selected = (id: string) => members(page, id).evaluateAll((all) => all.map((el) => (el as HTMLElement & { selected: boolean }).selected));
    // The spec's unit: Oldest while Recently updated is on.
    await member(page, 'chips-filters-single', 3).click();
    await expect.poll(() => selected('chips-filters-single')).toEqual([false, false, false, true]);
    await heard(['Sort by click tanrei-chip', 'Sort by change tanrei-tag-group:{"value":"oldest"}:"oldest"', 'document change tanrei-tag-group']);
    // The chip that is on, switched off: none is on, and value is null.
    await member(page, 'chips-filters-single', 3).click();
    await expect.poll(() => selected('chips-filters-single')).toEqual([false, false, false, false]);
    await heard(['Sort by click tanrei-chip', 'Sort by change tanrei-tag-group:{"value":null}:null', 'document change tanrei-tag-group']);
    // Multiple: Space on Assigned to me adds it; Space again takes it out.
    await member(page, 'chips-filters-multiple', 1).locator('.container').focus();
    await page.keyboard.press('Space');
    await expect.poll(() => selected('chips-filters-multiple')).toEqual([true, true, true, false, false]);
    await heard(['Filters click tanrei-chip', 'Filters change tanrei-tag-group:{"values":["open","review","assigned"]}:["open","review","assigned"]', 'document change tanrei-tag-group']);
    await page.keyboard.press('Enter');
    await expect.poll(() => selected('chips-filters-multiple')).toEqual([true, false, true, false, false]);
    await heard(['Filters click tanrei-chip', 'Filters change tanrei-tag-group:{"values":["open","review"]}:["open","review"]', 'document change tanrei-tag-group']);
    // A disabled chip switches nothing and fires nothing.
    await member(page, 'chips-filters-multiple', 4).evaluate((el: any) => (el.disabled = true));
    await member(page, 'chips-filters-multiple', 4).click({ force: true });
    await frames(page);
    // The product's writes fire nothing.
    await host(page, 'chips-filters-multiple').evaluate((el: any) => { el.values = ['design']; el.selection = 'single'; el.value = 'open'; });
    await frames(page);
    expect(await events()).toEqual([]);
  });

  test('TGR-20: under a selection the set is one Tab stop — the chip that is on, then the chip that last had focus — and the arrows (the way they point, in right-to-left too), Home and End move between its chips without switching anything, passing a tag and a disabled chip; focus does not wrap, Up and Down do nothing, and Space is the chip’s own', async ({ page }) => {
    const markup = `<tanrei-chip kind="filter" label="Newest" value="newest"></tanrei-chip><tanrei-tag label="Static"></tanrei-tag><tanrei-chip kind="filter" label="Recently updated" value="updated"></tanrei-chip><tanrei-chip kind="filter" label="Off" value="off" disabled></tanrei-chip><tanrei-chip kind="filter" label="Most comments" value="comments"></tanrei-chip><tanrei-chip kind="input" label="Oldest" remove-label="Remove Oldest"></tanrei-chip>`;
    await mount(page, [fx('set', { label: 'Sort by', selection: 'single', value: 'updated' }, markup)]);
    await host(page, 'set').evaluate((el) => {
      el.insertAdjacentHTML('beforebegin', '<button id="before">Before</button>');
      el.insertAdjacentHTML('afterend', '<button id="after">After</button>');
    });
    const active = () => page.evaluate(() => document.activeElement?.id ?? '');
    const stops = () => host(page, 'set').evaluate((el) => [...el.children].filter((child) => child.localName === 'tanrei-chip' && !child.hasAttribute('tabindex')).map((child) => child.getAttribute('label')));
    await page.locator('#before').focus();
    // One stop: the chip that is on. Tab again leaves the set, past its other chips and the input chip's remove action.
    await tab(page);
    expect(await focusPath(page)).toBe(onChip('Recently updated'));
    expect(await stops()).toEqual(['Recently updated']);
    await tab(page);
    expect(await active()).toBe('after');
    await tab(page, { back: true });
    expect(await focusPath(page)).toBe(onChip('Recently updated'));
    // The arrows move in the order given, passing the tag and the disabled chip, and stop at the ends; Home and End.
    const keys: [string, string][] = [
      ['ArrowRight', 'Most comments'],
      ['ArrowRight', 'Oldest'],
      ['ArrowRight', 'Oldest'],
      ['ArrowLeft', 'Most comments'],
      ['ArrowLeft', 'Recently updated'],
      ['ArrowLeft', 'Newest'],
      ['ArrowLeft', 'Newest'],
      ['End', 'Oldest'],
      ['ArrowUp', 'Oldest'],
      ['ArrowDown', 'Oldest'],
      ['Home', 'Newest'],
      ['ArrowRight', 'Recently updated'],
      ['ArrowRight', 'Most comments'],
    ];
    for (const [key, label] of keys) {
      await page.keyboard.press(key);
      expect(await focusPath(page), key).toBe(onChip(label));
    }
    // Nothing was switched, and the page did not scroll.
    expect(await host(page, 'set').evaluate((el: any) => el.value)).toBe('updated');
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    // The chip that last had focus is the stop now.
    expect(await stops()).toEqual(['Most comments']);
    await tab(page);
    await tab(page, { back: true });
    expect(await focusPath(page)).toBe(onChip('Most comments'));
    // Space is the chip's own: it switches the focused chip.
    await page.keyboard.press('Space');
    await expect.poll(() => host(page, 'set').evaluate((el: any) => el.value)).toBe('comments');
    // In a right-to-left layout each arrow moves the way it points: Left to the next chip.
    await stage(page, 'set').evaluate((el) => el.setAttribute('dir', 'rtl'));
    await page.keyboard.press('ArrowLeft');
    expect(await focusPath(page)).toBe(onChip('Oldest'));
    await page.keyboard.press('ArrowRight');
    expect(await focusPath(page)).toBe(onChip('Most comments'));
    // The group itself never takes focus.
    expect(await host(page, 'set').evaluate((el) => [el.hasAttribute('tabindex'), el.getAttribute('role')])).toEqual([false, null]);
  });

  test('TGR-21: under a selection the chip that has focus after a removal is the set’s one stop; a stop that leaves, or is disabled, while focus is elsewhere is replaced; under none every chip has its own stop again, and a tabindex of the product’s own is kept', async ({ page }) => {
    await mount(page, [fx('five', { spacing: 'chips', label: 'Recipients', selection: 'multiple' }, inputs(...FIVE))]);
    const stops = () => host(page, 'five').evaluate((el) => [...el.children].filter((child) => !child.hasAttribute('tabindex')).map((child) => child.getAttribute('label')));
    await host(page, 'five').evaluate((el) => el.addEventListener('remove', (event) => (event.target as Element).remove()));
    // No chip is on: the first is the stop.
    expect(await stops()).toEqual(['Ada']);
    await member(page, 'five', 0).locator('.container').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    expect(await focusPath(page)).toBe(onChip('Katherine'));
    // The spec's unit: Delete on the focused third puts focus on the former fourth, the only stop.
    await page.keyboard.press('Delete');
    await expect.poll(() => focusPath(page)).toBe(onChip('Margaret'));
    expect(await stops()).toEqual(['Margaret']);
    // The stop leaves while focus is elsewhere: the first chip that takes focus is the stop.
    await page.evaluate(() => (document.activeElement as HTMLElement).blur());
    await member(page, 'five', 2).evaluate((el) => el.remove());
    await expect.poll(stops).toEqual(['Ada']);
    // The stop is disabled: the next chip that takes focus is.
    await member(page, 'five', 0).evaluate((el: any) => (el.disabled = true));
    await expect.poll(stops).toEqual(['Grace']);
    // A tabindex of the product's own is kept, under a selection and after it.
    await member(page, 'five', 2).evaluate((el) => el.setAttribute('tabindex', '0'));
    await host(page, 'five').evaluate((el: any) => (el.selection = 'none'));
    await expect.poll(() => host(page, 'five').evaluate((el) => [...el.children].map((child) => child.getAttribute('tabindex')))).toEqual([null, null, '0']);
  });
});

test.describe('accessibility', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(`no axe violations in ${theme}`, async ({ page }) => {
      await mountFixtures(page, spec, { theme, icons: true });
      const results = await new AxeBuilder({ page }).include('.stage').analyze();
      expect(results.violations, `${theme}: ${results.violations.map((v) => `${v.id} (${v.nodes.map((n) => n.target.join(' ')).join('; ')})`).join(', ')}`).toEqual([]);
    });
  }

  test('every fixture is one list named by its label, with one item for each member', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    for (const f of spec.fixtures) {
      await expect(stage(page, f.id).getByRole('list', { name: String(f.props.label), exact: true }), f.id).toHaveCount(1);
      await expect(stage(page, f.id).getByRole('listitem'), f.id).toHaveCount(f.items!.length);
      // Inside the list, and nowhere else: the snapshot of the stage is one list and what it holds.
      expect((await stage(page, f.id).ariaSnapshot()).split('\n').filter((line) => !line.startsWith(' ')).length, f.id).toBe(1);
    }
  });

  test('keyboard: Tab and Shift+Tab move through the chips in the order given, a disabled chip is passed, and a chip’s own keys still work', async ({ page }) => {
    await mount(page, only('chips-filters-disabled-member', 'chips-links'));
    await tabTo(page, member(page, 'chips-filters-disabled-member', 0).locator('.container'));
    await tab(page);
    expect(await focusPath(page)).toBe(onChip('Blocked'));
    await page.keyboard.press('Space');
    await expect(member(page, 'chips-filters-disabled-member', 2)).toHaveAttribute('selected', '');
    await tab(page, { back: true });
    expect(await focusPath(page)).toBe(onChip('Open'));
    // A set of link chips: each link is a stop.
    await tabTo(page, member(page, 'chips-links', 0).locator('.container'));
    await tab(page);
    expect(await focusPath(page)).toBe('tanrei-chip[Accessibility] > a.container');
  });

  test('it supplies no words: the shadow root holds no text, and the only name it exposes is the label it was given', async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
    for (const f of spec.fixtures) {
      expect(await host(page, f.id).evaluate((el) => [el.shadowRoot!.textContent!.trim(), [...el.shadowRoot!.querySelectorAll('*')].flatMap((node) => node.getAttributeNames().filter((name) => name.startsWith('aria-')).map((name) => node.getAttribute(name)))]), f.id).toEqual(['', [String(f.props.label)]]);
    }
  });
});

test.describe('fixtures', () => {
  test.beforeEach(async ({ page }) => {
    await mountFixtures(page, spec, { icons: true });
  });

  test('every fixture mounts its members as the spec gives them, with the spacing it names', async ({ page }) => {
    expect(spec.fixtures.length).toBe(24);
    for (const f of spec.fixtures) {
      const given = f.items!;
      expect(await members(page, f.id).evaluateAll((all) => all.map((el) => [el.localName, el.getAttribute('label')])), f.id).toEqual(given.map((item) => [item.kind === 'tag' ? 'tanrei-tag' : 'tanrei-chip', String(item.props.label)]));
      expect(await host(page, f.id).getAttribute('spacing'), f.id).toBe(String(f.props.spacing ?? 'chips'));
      // A glyph the fixture names is in the member's icon slot, drawn as one glyph and not as its name spelled out.
      for (const [i, item] of given.entries()) {
        if (!item.props.icon) continue;
        const glyph = member(page, f.id, i).locator('[slot="icon"]');
        await expect(glyph, `${f.id} ${i}`).toHaveText(String(item.props.icon));
        expect(await glyph.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), `${f.id} ${i}`).toBe(true);
      }
      const { lines } = await layout(page, f.id);
      // The fixtures that wrap do, and the long member has a line of its own; the others stand on one line.
      const wraps = ['tags-wrap', 'tags-small-wrap', 'chips-filters-wrap', 'chips-filters-rtl', 'tags-long-member'].includes(f.id);
      if (wraps) expect(lines.length, f.id).toBeGreaterThan(1);
      else expect(lines.length, f.id).toBe(1);
    }
  });

  for (const f of spec.fixtures) {
    test(`snapshot: ${f.id}`, async ({ page }) => {
      await expect(stage(page, f.id)).toHaveScreenshot([spec.name, `${f.id}.png`]);
    });
  }
});
