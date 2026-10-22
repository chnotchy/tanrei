// The page as a whole: every level, in light and dark, passes axe; nothing scrolls sideways on a phone; the chrome
// is translated and the vocabulary is not.
import assert from 'node:assert/strict';
import { studioTest, until } from './harness.js';

// A layer with something in every panel: a fixed tone, a pin, an added size and an own token ("Yours", the preview's own rows).
const layer = {
  id: 'acme',
  name: 'Acme',
  extends: 'tanrei',
  palettes: { primary: { source: { seed: '#0f766e', tones: { 40: '#0f766e' } } } },
  vocabulary: {
    'tanrei.comp.button.size.3x': { from: 'large', scale: 1.5, rationale: 'The checkout button is the only thing on its screen.' },
    'acme.comp.rating.star.size': { $type: 'dimension', $value: '{tanrei.sys.space.space300}', rationale: 'The rating component is ours.' },
  },
  tokens: { 'tanrei.sys.behavior.pressed-feedback': { $value: 2, reason: 'How this product behaves.' } },
};

/** An accordion's item opens over a few frames: what is measured, pressed or read next waits for the page to stand still. */
const still = (page) => page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== 'running' || animation.effect?.getComputedTiming().iterations === Infinity));

/** Open what a person would open, so that axe, the overflow check and the measure of the targets look at it too. */
async function unfold(page, level) {
  try {
    await unfoldNow(page, level);
  } finally {
    await still(page);
  }
}
async function unfoldNow(page, level) {
  // The two lists that scroll in a box of their own: everything the build reports, and the rules a layer inherits.
  if (level !== 'essentials') {
    await page.locator('[data-warnings-wrap]:not([open]) > summary').click();
    // (The list is written at the fold's `toggle` event, a task after the press.)
    await page.waitForSelector('[data-warnings-wrap] [data-warnings]', { state: 'attached' });
  }
  if (level === 'tokens') await page.locator('[data-panel="rules"] details:not([open]) > summary').click();
  if (level === 'groups') {
    for (const selector of ['[data-palette="primary"] [data-tones] > summary', '[data-typeface="mono"] > summary', '[data-extension="tanrei.comp.button.size.3x"] > summary', '[data-component="button"]:not([open]) > summary', '[data-component="button"] [data-common] > summary']) {
      // (A component the person left open is still open when the level is drawn again: nothing to press then.)
      if (await page.locator(selector).count()) await page.locator(selector).first().click();
      await still(page);
    }
    await page.waitForSelector('[data-behavior-hint="pressed-feedback"]:not([hidden])');
  }
  if (level === 'tokens') {
    await page.locator('[data-search] input').fill('pressed-feedback');
    await page.locator('[data-token="tanrei.sys.behavior.pressed-feedback"]').click();
    await page.waitForSelector('[data-editor="tanrei.sys.behavior.pressed-feedback"] [role="tablist"]');
  }
  if (level === 'source') {
    await page.locator('[data-source]').fill('{ "draft": ');
    await page.waitForSelector('[data-draft-note]:not([hidden])');
  }
}

for (const scheme of ['light', 'dark']) {
  studioTest(`axe: no violation at any level, with the folds open — ${scheme}`, { layer, colorScheme: scheme }, async ({ page, level, axe }) => {
    assert.equal(await page.locator('html').getAttribute('data-tanrei-theme'), scheme, 'the app follows the system’s color scheme');
    for (const name of ['essentials', 'groups', 'tokens', 'source']) {
      await level(name);
      await unfold(page, name);
      await axe('body', `${name} (${scheme})`);
    }
    // The list of this layer's warnings has its name, and is a focus stop exactly while it scrolls — in the panel beside
    // the preview its one warning wraps into more lines than the list's box holds (the long list is below).
    const list = await page.locator('[data-warnings]').evaluate((el) => ({ scrolls: el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1, tabindex: el.getAttribute('tabindex'), named: Boolean(el.getAttribute('aria-label')) }));
    assert.deepEqual(list, { scrolls: list.scrolls, tabindex: list.scrolls ? '0' : null, named: true });
  });

  studioTest(`390px: nothing scrolls sideways at any level — ${scheme}`, { layer, colorScheme: scheme, viewport: { width: 390, height: 844 } }, async ({ page, level, fits }) => {
    for (const name of ['essentials', 'groups', 'tokens', 'source']) {
      await level(name);
      await unfold(page, name);
      await fits('body', `${name} (${scheme})`);
    }
    // The draft badge (left by Source above) has to fit next to the level switcher too.
    await level('essentials');
    assert.ok(await page.locator('[data-draft-badge]').isVisible());
    await fits('body', `the draft badge (${scheme})`);
    // A panel the Studio scrolls to lands below the sticky preview, not under it.
    await level('groups');
    const landed = await page.evaluate(() => { const el = document.querySelector('[data-panel="icons"]'); el.scrollIntoView({ block: 'start' }); return { top: el.getBoundingClientRect().top, sticky: document.querySelector('.ts-preview').getBoundingClientRect().bottom }; });
    assert.ok(landed.top >= landed.sticky, `a scrolled-to panel is not hidden under the sticky preview: ${JSON.stringify(landed)}`);
  });
}

studioTest('the theme and language switches: dark is a click away; ja translates the chrome, never the vocabulary; the session survives the reload', { layer }, async ({ page, level }) => {
  await page.locator('#theme').click();
  assert.equal(await page.locator('html').getAttribute('data-tanrei-theme'), 'dark');
  await level('groups');
  // The language switch is a select of the offered languages, each under its own name; choosing one reloads the page.
  assert.deepEqual(await page.locator('#lang tanrei-option').evaluateAll((options) => options.map((option) => [option.getAttribute('value'), option.getAttribute('label'), option.lang])), [['en', 'English', 'en'], ['ja', '日本語', 'ja'], ['zh-CN', '简体中文', 'zh-CN'], ['hi', 'हिन्दी', 'hi'], ['es', 'Español', 'es'], ['ar', 'العربية', 'ar']]);
  await page.locator('#lang').evaluate((select) => {
    select.value = 'ja';
    select.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  });
  await page.waitForSelector('[data-panel="typefaces"]');
  await until(async () => (await page.locator('#session').textContent())?.includes('acme.system.json'), 'the session after the language switch');
  assert.equal(await page.locator('html').getAttribute('lang'), 'ja');
  assert.equal(await page.locator('html').getAttribute('data-tanrei-theme'), 'dark', 'the theme is remembered');
  assert.equal(await page.locator('[data-studio]').getAttribute('data-level'), 'groups', 'so is the level');
  assert.match(await page.locator('[data-panel="typefaces"] h2').textContent(), /書体/);
  assert.match(await page.locator('[data-panel="behavior"] h2').textContent(), /ふるまい/);
  assert.deepEqual(await page.locator('[data-behavior="pressed-feedback"] tanrei-radio-button').evaluateAll((els) => els.map((el) => el.label)), ['overlay', 'ripple', 'dim', 'none'], 'names are vocabulary: not translated');
  assert.match(await page.locator('[data-save-state]').textContent(), /保存済み/);
});

studioTest('the two checks above can fail: text the Studio cannot read and a box wider than the phone are both caught', { viewport: { width: 390, height: 844 } }, async ({ page, axe, fits }) => {
  await fits('body', 'before');
  await axe('body', 'before');
  await page.evaluate(() => {
    const help = document.querySelector('[data-panel="feel"]');
    help.insertAdjacentHTML('beforeend', '<p id="faint" style="color:#bbb;background:#fff">faint</p><div id="wide" style="inline-size:600px;block-size:4px"></div>');
  });
  await assert.rejects(fits('body', 'a wide box'), /wide box.*id="wide"|wide box/);
  await assert.rejects(axe('#faint', 'faint text'), /color-contrast/);
});

studioTest('the measure of the targets can fail: a control drawn 20 pixels high, and one that a neighbour covers, are both caught', { layer }, async ({ page, targets }) => {
  const before = await targets('before');
  for (const kind of ['summary', 'a.app-brand']) assert.ok(before.some((target) => target.what.startsWith(kind)), `the measure sees a ${kind}`);
  assert.ok(before.filter((target) => target.what.startsWith('tanrei-tab')).length >= 4, 'and the levels’ tabs');
  await page.evaluate(() => document.querySelector('[data-panel="feel"]').insertAdjacentHTML('beforeend', '<p><button type="button" class="ts-own" id="low" style="min-block-size: 0; block-size: 20px; padding-block: 0">low</button></p>'));
  await assert.rejects(targets('a low button'), /button\.ts-own «low» [\d.]+×20\b/);
  await page.evaluate(() => {
    const low = document.querySelector('#low');
    low.setAttribute('style', 'min-inline-size: 24px; min-block-size: 24px');
    low.parentElement.style.position = 'relative';
    low.insertAdjacentHTML('afterend', '<span id="cover" style="position: absolute; inset: 0 auto auto 0; inline-size: 2rem; block-size: 10px"></span>');
  });
  await assert.rejects(targets('a covered button'), /button\.ts-own «low» .* a neighbour answers inside it/);
});

studioTest('the preview’s contrast switch changes what the real components draw: standard, medium, high', {}, async ({ page, scope, lightPane, choose, css, axe }) => {
  const button = lightPane.locator('tanrei-button').first();
  const inner = button.locator('button');
  const seen = {};
  for (const contrast of ['standard', 'medium', 'high']) {
    await choose(page.locator('[data-contrast]'), contrast);
    await until(async () => (await scope.getAttribute('data-tanrei-contrast')) === contrast, `the preview scope is at ${contrast}`);
    // Colors transition; read the settled value.
    await until(async () => {
      const now = await css(inner, 'background-color');
      const again = await page.waitForTimeout(120).then(() => css(inner, 'background-color'));
      return now === again;
    }, 'the container color settled');
    seen[contrast] = `${await css(inner, 'background-color')} / ${await css(inner, 'color')} / ${await css(lightPane, 'color')}`;
  }
  assert.equal(new Set(Object.values(seen)).size, 3, `the three contrast levels must draw differently: ${JSON.stringify(seen)}`);
  await axe('[data-scope]', 'the preview at high contrast');
});

// ── A list that scrolls in a box of its own ────────────
// A layer on "cupertino" inherits a hundred warnings (an imitation is held to its original): the list of
// them scrolls, so it is a focus stop with a name and the keys scroll it. A list that is all in view is no stop.
for (const locale of ['en-US', 'ar']) {
  studioTest(`${locale}: the opened list of the build's warnings scrolls, takes the keyboard's focus under a name, and passes axe`, { layer: { id: 'acme', extends: 'cupertino' }, locale, viewport: { width: 1440, height: 1100 } }, async ({ page, level, axe }) => {
    await level('groups');
    const fold = page.locator('[data-warnings-wrap]');
    const list = page.locator('[data-warnings]');
    await fold.locator('summary').click();
    await still(page);
    await until(async () => (await list.getAttribute('tabindex')) === '0', 'the long list is a focus stop');
    const [count, scrolls, name, summary] = [await list.locator('li').count(), await list.evaluate((el) => el.scrollHeight > el.clientHeight), await list.getAttribute('aria-label'), await fold.locator('summary').textContent()];
    assert.ok(count > 20 && scrolls, `the list is long and scrolls: ${count} warnings`);
    assert.ok(name && summary.startsWith(name), `its name is the fold's own: «${name}» in «${summary}»`);
    await fold.locator('summary').focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.hasAttribute('data-warnings')), true, 'Tab goes from the fold to its list');
    assert.notEqual(await list.evaluate((el) => getComputedStyle(el).outlineStyle), 'none', 'and the list shows the focus ring');
    await page.keyboard.press('End');
    await until(async () => (await list.evaluate((el) => el.scrollTop)) > 0, 'End scrolls the list to its last lines');
    // (The fold alone: the pairs above it are drawn in the imitation's own colors, which are not held to the thresholds.)
    await axe('[data-warnings-wrap]', `the opened list (${locale})`);
  });
}

// ── The other languages ─────────────────────────────────────
// The app speaks the browser's language when the Studio is translated into it. What is held here is what a look at
// the six languages found can break without a word changing: a label that no longer fits a phone, and — in a language
// written right-to-left — the runs that must stay left-to-right, and the page that must not scroll to the left.
for (const locale of ['ja', 'es', 'zh-CN', 'hi']) {
  studioTest(`${locale}: at 390px nothing scrolls sideways at any level, and the bar's three parts stand on one line`, { layer, locale, viewport: { width: 390, height: 844 } }, async ({ page, level, fits }) => {
    assert.equal(await page.locator('html').getAttribute('lang'), locale);
    assert.equal(await page.locator('#lang').evaluate((select) => select.value), locale);
    for (const name of ['essentials', 'groups', 'tokens', 'source']) {
      await level(name);
      await unfold(page, name);
      await fits('body', `${name} (${locale})`);
    }
    const bar = await page.evaluate(() => ['.app-brand', '#lang', '#theme'].map((selector) => { const box = document.querySelector(selector).getBoundingClientRect(); return Math.round(box.top + box.height / 2); }));
    assert.ok(Math.max(...bar) - Math.min(...bar) <= 2, `the brand, the language and the theme share a line: ${bar}`);
    assert.ok((await page.locator('#theme').evaluate((button) => button.getBoundingClientRect().height)) <= 34, 'the theme button says its word on one line');
  });
}

studioTest('ar: right-to-left — axe passes and nothing scrolls sideways at 390px at any level; ids, values, ratios, code and JSON stay left-to-right runs', { layer, locale: 'ar', viewport: { width: 390, height: 844 } }, async ({ page, level, fits, axe }) => {
  assert.deepEqual(await page.locator('html').evaluate((html) => [html.lang, html.dir]), ['ar', 'rtl']);
  // The product's name is one left-to-right run: the mark, then «Tanrei Theme Studio» as it is written.
  const name = await page.locator('.app-brand').evaluate((brand) => { const [first, second] = [brand.querySelector('.app-name').firstChild, brand.querySelector('.app-name span')].map((node) => { const range = document.createRange(); range.selectNodeContents(node); return range.getBoundingClientRect().left; }); return { first, second, mark: brand.querySelector('.app-mark').getBoundingClientRect().left }; });
  assert.ok(name.first < name.second && name.second < name.mark, `«Tanrei» stands left of «Theme Studio», and the mark at the start, on the right: ${JSON.stringify(name)}`);
  for (const level_ of ['essentials', 'groups', 'tokens', 'source']) {
    await level(level_);
    await unfold(page, level_);
    await fits('body', `${level_} (ar)`);
    await axe('body', `${level_} (ar)`);
  }
  // Source: the text is read from the left, with its line numbers before it — on the left.
  const source = await page.evaluate(() => { const area = document.querySelector('[data-source]'); return { direction: getComputedStyle(area).direction, gutter: document.querySelector('.ts-source-gutter').getBoundingClientRect().left, area: area.getBoundingClientRect().left }; });
  assert.equal(source.direction, 'ltr');
  assert.ok(source.gutter < source.area, 'the line numbers stand on the left of the text');
  await page.locator('[data-draft-discard]').click();

  await level('groups');
  // A threshold is a run of its own: the sign stands before the number, as it is written.
  const threshold = page.locator('[data-pairs] .ts-pair-ratios bdi[dir="ltr"]').filter({ hasText: '≥' }).first();
  assert.match(await threshold.textContent(), /^≥ (3|4\.5):1$/);
  // What the base says of itself is its own sentence, isolated: its full stop stays at its end.
  assert.equal(await page.locator('[data-base-description] > bdi').count(), 1);
  // A field of the person's own prose takes the direction of what it holds; an empty one keeps the layout's.
  const reason = page.locator('[data-group-reason=\"behavior\"] input');
  assert.equal(await reason.getAttribute('dir'), 'auto', 'a reason written in Latin letters is laid out from the left');
  await reason.fill('');
  assert.equal(await reason.getAttribute('dir'), null, 'an empty field keeps the layout’s direction, and so does its placeholder');
  assert.equal(await reason.evaluate((input) => getComputedStyle(input).direction), 'rtl');

  // A role color's tones: three number fields in a table, inside the pane of a phone — to the left as well.
  await level('tokens');
  await page.locator('[data-search] input').fill('sys.color.primary');
  await page.locator('[data-token="tanrei.sys.color.primary"] > span').click();
  await page.locator('[data-token-pane] [data-tab="derive"]').click();
  await page.waitForSelector('[data-token-pane] .ts-tones');
  const table = await page.evaluate(() => ({ left: document.querySelector('[data-token-pane] .ts-tones').getBoundingClientRect().left, page: document.scrollingElement.scrollWidth, width: innerWidth }));
  assert.ok(table.left >= 0 && table.page <= table.width, `the tone table stays inside the page: ${JSON.stringify(table)}`);
  await axe('[data-token-pane]', 'the tone table (ar)');
  // The count after twelve followers keeps its sign before its digits.
  assert.match(await page.locator('[data-token-pane] .ts-followers > bdi[dir="ltr"]').textContent(), /^\+\d+$/);
  assert.equal(await page.locator('[data-token-pane] code').first().evaluate((code) => getComputedStyle(code).direction), 'ltr');
});

// Arabic is drawn in the face the app loads for it, not in whatever the platform falls back to; the face is registered
// for the Arabic subset alone, so Latin text and digits stay Inter's. A label beside a value is words, in the text face;
// only the value is code.
studioTest('ar: Arabic text is drawn in Noto Sans Arabic, Latin in Inter; a label beside JSON is in the text face', { layer, locale: 'ar' }, async ({ page, level }) => {
  const faces = await page.evaluate(async () => {
    await document.fonts.ready;
    const stack = getComputedStyle(document.documentElement).fontFamily;
    const arabic = [...document.fonts].filter((face) => face.family.replace(/["']/g, '') === 'Noto Sans Arabic');
    await Promise.all(arabic.map((face) => face.load()));
    return { stack, faces: arabic.length, ranges: arabic.map((face) => face.unicodeRange), loaded: document.fonts.check("16px 'Noto Sans Arabic'", 'ع') };
  });
  assert.match(faces.stack, /^Inter, "?Noto Sans Arabic"?,/, `the stack: Inter for Latin, then the Arabic face: ${faces.stack}`);
  assert.equal(faces.faces, 1, 'one face, the Arabic subset');
  assert.match(faces.ranges[0], /U\+600-6FF/i, `its range is Arabic's: ${faces.ranges[0]}`);
  assert.ok(!/U\+0?0?00-00FF|U\+0-FF/i.test(faces.ranges[0]), 'it does not take Latin');
  assert.equal(faces.loaded, true);
  await level('tokens');
  await page.locator('[data-tree] [role="treeitem"][tabindex="0"]').focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForSelector('[data-token-pane] [data-editor]');
  const writes = page.locator('[data-token-pane] .ts-writes').first();
  await until(async () => (await writes.count()) > 0, 'an editor shows what it writes');
  const [label, value] = await writes.evaluate((p) => [getComputedStyle(p).fontFamily, p.querySelector('b') ? getComputedStyle(p.querySelector('b')).fontFamily : null]);
  assert.doesNotMatch(label, /Roboto Mono|monospace/, `the label is in the text face: ${label}`);
  if (value) assert.match(value, /Roboto Mono|monospace/, `the value is code: ${value}`);
});

// ── The minimum target, and the hints of the fields, in the six languages ─────────────────────────────────────────
/**
 * Runs in the page. Every single-line field of the Studio that shows its hint now — drawn, empty, with a placeholder —
 * with the hint's width in the field's own font and the room the field has for it. A text field cuts a hint where the
 * field ends, without a mark (in Arabic the cut can fall inside a left-to-right word); a multiline field wraps it.
 */
function measureHints() {
  return [...document.querySelectorAll('.ts tanrei-text-field:not([multiline]), .ts tanrei-text-input:not([multiline]), .ts tanrei-combobox, .ts tanrei-combobox-field')].flatMap((host) => {
    // A text field's input is its text input's, and a combobox field's its combobox's:
    // one level down, in the member it is built from.
    const member = { 'tanrei-text-field': 'tanrei-text-input', 'tanrei-combobox-field': 'tanrei-combobox' }[host.localName];
    const input = (member ? host.shadowRoot?.querySelector(member) : host)?.shadowRoot?.querySelector('input');
    if (!input || !input.placeholder || input.value || input.getBoundingClientRect().width === 0 || host.closest('[hidden], details:not([open]) > :not(summary)')) return [];
    const [own, hint] = [getComputedStyle(input), getComputedStyle(input, '::placeholder')];
    const canvas = document.createElement('canvas').getContext('2d');
    canvas.font = `${hint.fontStyle} ${hint.fontWeight} ${hint.fontSize} ${hint.fontFamily}`;
    return [{ hint: input.placeholder, text: Math.ceil(canvas.measureText(input.placeholder).width), room: Math.floor(input.clientWidth - parseFloat(own.paddingLeft) - parseFloat(own.paddingRight)) }];
  });
}
// A word is as long as its language makes it: a one-character segment, a link of four letters. Every pointer target
// of the Studio's own controls is measured at each level, on a desktop and on a phone, with the folds open.
for (const locale of ['en-US', 'ja', 'zh-CN', 'hi', 'es', 'ar']) {
  studioTest(`${locale}: every pointer target of the Studio's own controls is 24 by 24 at least, at 1440 and at 390; every hint fits its field, and the search field's is not its name`, { layer, locale }, async ({ page, level, targets }) => {
    const seen = new Set();
    const hints = async (what) => {
      const found = await page.evaluate(measureHints);
      for (const each of found) seen.add(each.hint);
      assert.deepEqual(found.filter((each) => each.text > each.room), [], `${what}: a hint is longer than its field`);
    };
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width > 1000 ? 1100 : 844 });
      for (const name of ['essentials', 'groups', 'tokens', 'source']) {
        await level(name);
        await unfold(page, name);
        const found = await targets(`${name} at ${width} (${locale})`);
        // (Its own controls only: a field, a slider, a radio group, a tag — and now every button, the switch and the
        // checkbox — are Tanrei's and keep their own minimum. What is left is the levels' tabs, a fold's row, a text
        // area, a list that scrolls, a link, the tree's rows.)
        assert.ok(found.length > 4, `the measure saw the level's controls: ${found.length}`);
        await hints(`${name} at ${width} (${locale})`);
        if (name === 'tokens') {
          // A role color too: its editor has the tone table, the operation tabs and the list of the other operations.
          await page.locator('[data-search] input').fill('sys.color.primary');
          await page.locator('[data-token="tanrei.sys.color.primary"] > span').click();
          await page.waitForSelector('[data-token-pane] .ts-pointers');
          await targets(`a role color's editor at ${width} (${locale})`);
          // The hint is drawn only while the field is empty; a text field cuts it where the field ends, without a mark.
          await page.locator('[data-search] input').fill('');
          const search = await page.locator('[data-search] input').evaluate((input) => {
            const [own, hint] = [getComputedStyle(input), getComputedStyle(input, '::placeholder')];
            const canvas = document.createElement('canvas').getContext('2d');
            canvas.font = `${hint.fontStyle} ${hint.fontWeight} ${hint.fontSize} ${hint.fontFamily}`;
            return { hint: input.placeholder, name: input.getAttribute('aria-label'), text: Math.ceil(canvas.measureText(input.placeholder).width), room: Math.floor(input.clientWidth - parseFloat(own.paddingLeft) - parseFloat(own.paddingRight)) };
          });
          assert.ok(search.hint && search.text <= search.room, `the hint fits its field at ${width}: ${JSON.stringify(search)}`);
          assert.ok(search.name && search.name !== search.hint, `the field's name is not its hint: ${JSON.stringify(search)}`);
          assert.equal(await page.getByRole('searchbox', { name: search.name, exact: true }).count(), 1, 'and the name is what the accessibility tree gives the field');
          // A pin's reason: the field of the token editor that asks why.
          await page.locator('[data-search] input').fill('button.container.height.medium');
          await page.locator('[data-token="tanrei.comp.button.container.height.medium"] > span').click();
          await page.locator('[data-token-pane] [data-tab="pin $value"]').click();
          await page.waitForSelector('[data-token-pane] [data-reason]');
          await hints(`a pin's editor at ${width} (${locale})`);
          await page.locator('[data-search] input').fill('');
        }
        if (name === 'source') await page.locator('[data-draft-discard]').click();
      }
    }
    // The measure saw the fields it is there for: a palette's reason, a family to add, a pin's reason, an addition's rationale.
    assert.ok(seen.size >= 4, `hints measured: ${[...seen].join(' | ')}`);
  });
}
