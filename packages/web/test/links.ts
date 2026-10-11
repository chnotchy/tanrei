// What the tests of every link form share (Button, card, action chip, list item): the rules a control with a
// destination keeps, numbered here D1 to D11, checked where they do not depend on which component is the link. Each component's own test file calls them from tests
// titled with ITS behaviour ids — written out there, so the parity check finds every id in that file — and tests what
// only it has (where its mark stands, how focusable its disabled form is, which of its forms refuse a destination).
import { type Locator, type Page, expect } from '@playwright/test';
import { missingWords, resolveToken, setWords } from './harness.js';

/** The warnings a page's debug build reports, collected from now on. */
export function warnings(page: Page): string[] {
  const seen: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') seen.push(message.text());
  });
  return seen;
}

/** The styled part of a component — the native element, or the anchor of its link form: `[part="container"]`. */
export const container = (host: Locator) => host.locator('[part="container"]');

/** What the container of `host` is: its tag, and what an anchor carries. */
export const anchorOf = (host: Locator) =>
  container(host).evaluate((el) => ({
    tag: el.localName,
    href: el.getAttribute('href'),
    target: el.getAttribute('target'),
    rel: el.getAttribute('rel'),
    download: el.getAttribute('download'),
    role: el.getAttribute('role'),
    disabled: el.getAttribute('aria-disabled'),
    pressed: el.getAttribute('aria-pressed'),
    description: el.getAttribute('aria-description'),
    tabindex: el.getAttribute('tabindex'),
  }));

/** Counts the `click` events that reach `host` from now on; returns how to read the count and how many were cancelled. */
export async function countClicks(host: Locator): Promise<() => Promise<number>> {
  await host.evaluate((el) => {
    const counted = el as HTMLElement & { clicks?: number };
    counted.clicks = 0;
    el.addEventListener('click', () => {
      counted.clicks = (counted.clicks ?? 0) + 1;
    });
  });
  return () => host.evaluate((el) => (el as HTMLElement & { clicks?: number }).clicks ?? 0);
}

/**
 * D1: everything a state paints on the container and how large it is drawn — what must be the same for a link form and
 * for the control it would otherwise be. Read while the element is in the state under test.
 */
const PAINTED = [
  'background-color',
  'color',
  'box-shadow',
  'opacity',
  'border-top-left-radius',
  'border-bottom-right-radius',
  'padding-top',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'font-size',
  'font-weight',
  'letter-spacing',
  'text-decoration-line',
  'cursor',
  'outline-style',
  'outline-width',
  'outline-offset',
  'display',
] as const;
export const painted = (host: Locator) =>
  container(host).evaluate((el, props) => {
    const style = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    return { ...Object.fromEntries(props.map((prop) => [prop, style.getPropertyValue(prop)])), width: Math.round(box.width * 100) / 100, height: Math.round(box.height * 100) / 100 };
  }, PAINTED as readonly string[]);

/** A state is read once it has settled: two frames for its transitions to start, then every one of them finished. */
const settle = (host: Locator) =>
  container(host).evaluate(async (el) => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.all(el.getAnimations({ subtree: true }).map((animation) => animation.finished.catch(() => undefined)));
  });

/** What the container paints once its state has settled (a state eases in over the component's state motion). */
export async function settledPaint(host: Locator) {
  await settle(host);
  return painted(host);
}

/**
 * D1 — a destination changes what the control is, not how it looks: `link` and `twin` (the same control without a
 * destination) are drawn alike at rest, hovered and pressed — the same computed paint from the same tokens, the same
 * size — and the link is an anchor where the twin is not.
 */
export async function expectDrawnAlike(page: Page, link: Locator, twin: Locator, { states = ['rest', 'hovered', 'pressed'] as const }: { states?: readonly ('rest' | 'hovered' | 'pressed')[] } = {}) {
  expect((await anchorOf(link)).tag, 'the link form is an anchor').toBe('a');
  expect((await anchorOf(twin)).tag, 'its twin is not').not.toBe('a');
  const read = async (host: Locator, state: string) => {
    await page.mouse.move(1, 1);
    if (state !== 'rest') await container(host).hover();
    if (state === 'pressed') {
      // The press is released where it began — moving a held pointer off a link starts the browser's own drag of its
      // address (WebKit), which is the platform's — and the click that follows is cancelled, so nothing is navigated.
      await host.evaluate((el) => el.addEventListener('click', (event) => event.preventDefault(), { once: true }));
      await page.mouse.down();
    }
    const paint = await settledPaint(host);
    if (state === 'pressed') {
      await page.mouse.up();
      await expect(container(host)).not.toHaveAttribute('data-pressed');
    }
    return paint;
  };
  for (const state of states) expect(await read(link, state), `${state}: the link is drawn as its twin`).toEqual(await read(twin, state));
  await page.mouse.move(1, 1);
}

/**
 * D3, D4 — the activation of a link: a pointer and Enter each emit `click` exactly once and then the browser follows
 * the address, without waiting for press-hold; a cancelled click opens nothing; Space emits no click, shows no pressed
 * state and leaves the page to scroll; a click with a modifier, and a middle click, are left to the browser. The
 * address is a fragment of the page itself, so that following it is seen (`location.hash`) and nothing is unloaded.
 *
 * `focus` moves focus to the link; left out, the element's own `focus()` does.
 */
export async function expectLinkActivation(page: Page, host: Locator, { focus }: { focus?: () => Promise<void> } = {}) {
  const hash = () => page.evaluate(() => location.hash);
  const setHref = (href: string) => host.evaluate((el, value) => ((el as HTMLElement & { href: string }).href = value), href);
  // The element's own focus(): a host that is not itself focusable hands it to its anchor (a list item's row).
  const focusIt = focus ?? (() => host.evaluate((el) => (el as HTMLElement).focus()));
  const clicks = await countClicks(host);
  await page.evaluate(() => {
    document.body.style.minBlockSize = '400vh';
    history.replaceState(null, '', '#');
  });

  // A pointer: one click, then the address.
  await setHref('#by-pointer');
  await expect(container(host)).toHaveAttribute('href', '#by-pointer');
  await container(host).click();
  expect(await clicks()).toBe(1);
  expect(await hash()).toBe('#by-pointer');

  // Enter: one click, the address at once — the pressed state is still shown while the page has already moved.
  await setHref('#by-enter');
  await expect(container(host)).toHaveAttribute('href', '#by-enter');
  await focusIt();
  await page.keyboard.down('Enter');
  expect(await clicks()).toBe(2);
  expect(await hash()).toBe('#by-enter');
  await expect(container(host)).toHaveAttribute('data-pressed', /.+/);
  await page.keyboard.up('Enter');
  await expect(container(host)).not.toHaveAttribute('data-pressed');

  // `element.click()` follows the link, as a person's click does.
  await setHref('#by-script');
  await expect(container(host)).toHaveAttribute('href', '#by-script');
  await host.evaluate((el) => (el as HTMLElement).click());
  expect(await clicks()).toBe(3);
  expect(await hash()).toBe('#by-script');

  // Space: no click, no pressed state, and the page scrolls as it does under any link.
  await page.evaluate(() => window.scrollTo(0, 0));
  await focusIt();
  const before = await page.evaluate(() => window.scrollY);
  await page.keyboard.down('Space');
  await expect(container(host)).not.toHaveAttribute('data-pressed');
  await page.keyboard.up('Space');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
  expect(await clicks()).toBe(3);
  expect(await hash()).toBe('#by-script');

  // A cancelled click opens nothing: the product's router has taken it. The click itself was still emitted once.
  await setHref('#cancelled');
  await expect(container(host)).toHaveAttribute('href', '#cancelled');
  await host.evaluate((el) => el.addEventListener('click', (event) => event.preventDefault(), { once: true }));
  await container(host).click();
  expect(await clicks()).toBe(4);
  expect(await hash()).toBe('#by-script');
  await host.evaluate((el) => el.addEventListener('click', (event) => event.preventDefault(), { once: true }));
  await focusIt();
  await page.keyboard.press('Enter');
  expect(await clicks()).toBe(5);
  expect(await hash()).toBe('#by-script');

  // A click with the new-tab modifier, and a middle click, reach the page uncancelled: what they open is the
  // browser's. (The test cancels them itself at the window, after reading that, so that no tab is opened.)
  await page.evaluate(() => {
    const seen: { type: string; cancelled: boolean; modified: boolean }[] = [];
    (window as unknown as { leftToBrowser: typeof seen }).leftToBrowser = seen;
    for (const type of ['click', 'auxclick']) {
      window.addEventListener(type, (event) => {
        const mouse = event as MouseEvent;
        seen.push({ type, cancelled: event.defaultPrevented, modified: mouse.ctrlKey || mouse.metaKey || mouse.button === 1 });
        event.preventDefault();
      });
    }
  });
  await container(host).click({ modifiers: ['ControlOrMeta'] });
  await container(host).click({ button: 'middle' });
  const left = await page.evaluate(() => (window as unknown as { leftToBrowser: { type: string; cancelled: boolean; modified: boolean }[] }).leftToBrowser);
  expect(left.filter((event) => event.modified).length, 'the modified and the middle click reached the page').toBeGreaterThanOrEqual(1);
  expect(left.every((event) => !event.cancelled), 'neither was cancelled by the component').toBe(true);
  expect(await hash()).toBe('#by-script');
}

/**
 * D6 — `target: new` opens a new context, safely: the anchor carries `target="_blank"` and `noopener` in its `rel`,
 * the product's own `rel` is kept beside it and `noreferrer` is never added, and the page it opens has no handle to
 * the page that opened it.
 */
export async function expectNewContext(page: Page, host: Locator) {
  const set = (props: Record<string, string | null>) => host.evaluate((el, values) => Object.assign(el, values), props);
  await set({ href: 'about:blank', target: 'new', rel: null });
  await expect(container(host)).toHaveAttribute('target', '_blank');
  await expect(container(host)).toHaveAttribute('rel', 'noopener');
  const [popup] = await Promise.all([page.waitForEvent('popup'), container(host).click()]);
  expect(await popup.evaluate(() => window.opener), 'the opened page has no handle to its opener').toBeNull();
  await popup.close();
  // The product's own rel stands, with noopener beside it; one it already wrote is not written twice.
  await set({ rel: 'external nofollow' });
  await expect(container(host)).toHaveAttribute('rel', 'external nofollow noopener');
  await set({ rel: 'noopener noreferrer' });
  await expect(container(host)).toHaveAttribute('rel', 'noopener noreferrer');
  // HTML's spellings are read as the two values; `same` carries neither a target nor a rel of the component's.
  await set({ rel: null, target: '_blank' });
  await expect(container(host)).toHaveAttribute('target', '_blank');
  await set({ target: '_self' });
  await expect(container(host)).not.toHaveAttribute('target');
  await expect(container(host)).not.toHaveAttribute('rel');
  await set({ target: 'same', rel: 'external', download: 'report.pdf' });
  expect(await anchorOf(host)).toMatchObject({ target: null, rel: 'external', download: 'report.pdf' });
}

/**
 * D9 — a disabled link cannot be followed: the anchor carries no `href` (nor a target, a rel or a download), the link
 * role and `aria-disabled="true"`; no click reaches a listener, from a pointer or from script; nothing is navigated.
 * How focusable it is is its component's (not at all for a button, a card and a chip; the arrow keys in a list).
 */
export async function expectDisabledLink(page: Page, host: Locator) {
  expect(await anchorOf(host)).toMatchObject({ tag: 'a', href: null, target: null, rel: null, download: null, role: 'link', disabled: 'true' });
  await expect(host.getByRole('link', { disabled: true })).toHaveCount(1);
  const clicks = await countClicks(host);
  await page.evaluate(() => history.replaceState(null, '', '#'));
  await container(host).click({ force: true });
  await host.evaluate((el) => (el as HTMLElement).click());
  await host.evaluate((el) => el.shadowRoot!.querySelector<HTMLElement>('[part="container"]')!.click());
  expect(await clicks()).toBe(0);
  expect(await page.evaluate(() => location.hash)).toBe('');
  // A press shows nothing on it.
  await container(host).hover({ force: true });
  await page.mouse.down();
  await expect(container(host)).not.toHaveAttribute('data-pressed');
  await page.mouse.up();
  await page.mouse.move(1, 1);
}

/** D7: where the mark of a new context is, and how: its glyph, its box, whether it is hidden and mirrored. */
export const markOf = (host: Locator, selector: string) =>
  host.evaluate((el, markSelector) => {
    const mark = el.shadowRoot!.querySelector<HTMLElement>(markSelector);
    if (!mark) return null;
    const outer = el.shadowRoot!.querySelector('[part="container"]')!.getBoundingClientRect();
    const box = mark.getBoundingClientRect();
    const style = getComputedStyle(mark);
    const round = (value: number) => Math.round(value * 100) / 100;
    return {
      glyph: mark.textContent?.trim() ?? '',
      hidden: mark.closest('[aria-hidden="true"]') !== null,
      mirrored: mark.hasAttribute('data-tanrei-mirrored'),
      transform: style.transform,
      color: style.color,
      width: round(box.width),
      height: round(box.height),
      left: round(box.left - outer.left),
      right: round(outer.right - box.right),
    };
  }, selector);

/** The transform the icon helper mirrors a glyph with in a right-to-left layout: a flip along the line. */
export const MIRRORED = 'matrix(-1, 0, 0, 1, 0, 0)';

/**
 * D8 — and said: while the link opens a new context `targetLabel` is its description, and with none the control still
 * renders and a debug build says so, citing `id`; while it opens in place `targetLabel` is ignored.
 */
export async function expectTargetLabel(page: Page, host: Locator, seen: string[], id: string, { before = '' }: { before?: string } = {}) {
  const described = (label: string) => [before, label].filter(Boolean).join(', ');
  const set = (props: Record<string, string>) => host.evaluate((el, values) => Object.assign(el, values), props);
  await set({ href: 'https://example.com/tanrei', target: 'new', targetLabel: 'opens in a new tab' });
  await expect(container(host)).toHaveAttribute('aria-description', described('opens in a new tab'));
  await expect(host.getByRole('link')).toHaveAccessibleDescription(described('opens in a new tab'));
  expect(seen.filter((w) => w.includes(`(${id})`) && w.includes('targetLabel is empty')), 'a link that says so is not reported').toEqual([]);
  // In place: the words are ignored.
  await set({ target: 'same' });
  if (before) await expect(container(host)).toHaveAttribute('aria-description', before);
  else await expect(container(host)).not.toHaveAttribute('aria-description');
  // A new context that is not said: it still renders as the link it is, and a debug build reports it once.
  await set({ target: 'new', targetLabel: '' });
  await expect(container(host)).toHaveAttribute('target', '_blank');
  if (before) await expect(container(host)).toHaveAttribute('aria-description', before);
  else await expect(container(host)).not.toHaveAttribute('aria-description');
  await expect.poll(() => seen.filter((w) => w.includes(`(${id})`) && w.includes('targetLabel is empty')).length).toBe(1);
  // The words are the control's own prop, else the product's words of the same name, given once; the key that
  // nobody gave is known to `missingWords()`. The control's own prop wins. (The page is left as it was found.)
  expect(await missingWords(page)).toContain('targetLabel');
  await setWords(page, { targetLabel: 'opens in a new window' });
  await expect(container(host)).toHaveAttribute('aria-description', described('opens in a new window'));
  expect(await missingWords(page)).not.toContain('targetLabel');
  await set({ targetLabel: 'opens in a new tab' });
  await expect(container(host)).toHaveAttribute('aria-description', described('opens in a new tab'));
  await set({ targetLabel: '' });
  await setWords(page, { targetLabel: '' });
  if (before) await expect(container(host)).toHaveAttribute('aria-description', before);
  else await expect(container(host)).not.toHaveAttribute('aria-description');
}

/**
 * D11 — what is not a place to go is not a destination: white space is none and is not reported; a `javascript:`
 * address (however it is disguised) and one the platform cannot read are refused and reported, citing `id`; an unknown
 * `target` opens as `same` and is reported. `plain` says what the control is without a destination: the tag of its
 * container (and nothing of an anchor on it).
 */
export async function expectRefusals(page: Page, host: Locator, seen: string[], id: string, plain: { tag: string }) {
  const set = (props: Record<string, string>) => host.evaluate((el, values) => Object.assign(el, values), props);
  // Counted from here: another fixture of the page may already have reported something of its own.
  const already = seen.length;
  const reports = (text: string) => seen.slice(already).filter((w) => w.includes(`(${id})`) && w.includes(text)).length;
  // A real address first, so that what follows is seen to take the destination away.
  await set({ href: '/somewhere/', target: 'same' });
  await expect.poll(async () => (await anchorOf(host)).tag).toBe('a');

  for (const blank of ['', '   ', '\n\t ']) {
    await set({ href: blank });
    await expect.poll(async () => (await anchorOf(host)).tag, JSON.stringify(blank)).toBe(plain.tag);
    expect((await anchorOf(host)).href).toBeNull();
  }
  expect(reports(''), 'white space is no destination, and no finding').toBe(0);

  for (const script of ['javascript:alert(1)', '  JavaScript:void(0)', 'java\nscript:alert(1)']) {
    await set({ href: '/somewhere/' });
    await expect.poll(async () => (await anchorOf(host)).tag).toBe('a');
    await set({ href: script });
    await expect.poll(async () => (await anchorOf(host)).tag, JSON.stringify(script)).toBe(plain.tag);
    expect((await anchorOf(host)).href, 'no address of a script reaches the DOM').toBeNull();
  }
  await expect.poll(() => reports('names a script to run')).toBe(1);

  await set({ href: 'https://' });
  await expect.poll(async () => (await anchorOf(host)).tag).toBe(plain.tag);
  await expect.poll(() => reports('cannot be read as an address')).toBe(1);

  // A path, a fragment, a query and another scheme are places to go.
  for (const address of ['/a/b', '#top', '?q=1', 'mailto:someone@example.com', 'https://example.com/']) {
    await set({ href: address });
    await expect.poll(async () => (await anchorOf(host)).href, address).toBe(address);
  }

  // An unknown target is `same`, reported; the two values and HTML's two spellings are not.
  await set({ target: '_top' });
  await expect(container(host)).not.toHaveAttribute('target');
  await expect.poll(() => reports('target "_top" is not a value')).toBe(1);
  await set({ target: 'frame-name' });
  await expect(container(host)).not.toHaveAttribute('target');
  await expect.poll(() => reports('target "frame-name" is not a value')).toBe(1);
  for (const known of ['same', 'new', '_self', '_blank', '_BLANK']) await set({ target: known });
  await expect(container(host)).toHaveAttribute('target', '_blank');
  expect(reports('is not a value')).toBe(2);
}

/** The value of a component's size member in px, by its custom property. */
export const px = (page: Page, name: string) => resolveToken(page, name);
