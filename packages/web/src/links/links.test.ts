// `src/links/index.ts`: what a link's address says, as pure functions shared by the Link's script, the link card and
// the build step of `@tanrei/web/links` (specs/link.spec.json LNK-30; specs/link-card.spec.json LKC-8, LKC-9;
// src/links/node/REQUIREMENTS.md LKD-2). No page: the functions are called as a build step calls them.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { type TanreiLinkCardNode, displayHost, hostNodes, isExternal, linkCardToHtml, linkCardToNodes, pictureAddress, plainText, repeatsHost } from './index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PAGE = 'https://tanrei.example/docs/components/link/';

test.describe('isExternal', () => {
  test('LNK-30 an http or https address of another origin than the page’s is external; the page’s own origin, a path, a fragment and a query are not', () => {
    for (const href of ['https://example.com/', 'http://example.com/a?b#c', 'https://EXAMPLE.com', '//example.com/x', 'https://tanrei.example:8443/', 'http://tanrei.example/', 'https://docs.tanrei.example/']) {
      expect(isExternal(href, { base: PAGE }), href).toBe(true);
    }
    for (const href of ['/guides/', 'next/', '../button/', '#install', '?page=2', '', 'https://tanrei.example/', 'https://tanrei.example:443/x', 'HTTPS://TANREI.EXAMPLE/x', '//tanrei.example/x']) {
      expect(isExternal(href, { base: PAGE }), href).toBe(false);
    }
  });

  test('LNK-30 an address of any other scheme, a download and an address that cannot be read are never external', () => {
    for (const href of ['mailto:hello@example.com', 'tel:+81312345678', 'sms:+81312345678', 'ftp://example.com/file', 'javascript:void 0', 'data:text/plain,a', 'blob:https://example.com/1', 'about:blank', 'file:///etc/hosts', 'https://', 'http://[', 'https://exa mple.com/']) {
      expect(isExternal(href, { base: PAGE }), href).toBe(false);
    }
    expect(isExternal('https://example.com/tokens.zip', { base: PAGE, download: true })).toBe(false);
    expect(isExternal('https://example.com/tokens.zip', { base: PAGE, download: false })).toBe(true);
  });

  test('LNK-30 an origin the product declared as part of its own site is not external: an origin, a host, a host with a leading *. for its subdomains', () => {
    const site = ['https://docs.tanrei.example', 'shop.tanrei.example', '*.tanrei-cdn.example', 'https://partner.example:8443'];
    const own = ['https://docs.tanrei.example/a', 'https://shop.tanrei.example/', 'http://shop.tanrei.example:8080/', 'https://a.tanrei-cdn.example/', 'https://a.b.tanrei-cdn.example/x', 'https://partner.example:8443/'];
    const other = ['http://docs.tanrei.example/', 'https://docs.tanrei.example:444/', 'https://tanrei-cdn.example/', 'https://eviltanrei-cdn.example/', 'https://partner.example/', 'https://example.com/', 'https://shop.tanrei.example.evil.example/'];
    for (const href of own) expect(isExternal(href, { base: PAGE, site }), href).toBe(false);
    for (const href of other) expect(isExternal(href, { base: PAGE, site }), href).toBe(true);
    // An entry that cannot be read names nothing, and nothing is thrown for it.
    for (const href of other) expect(isExternal(href, { base: PAGE, site: ['', '   ', 'not a host', 'https://', '*.', 'example.com/path', 'ftp://example.com'] }), href).toBe(true);
    // An internationalised host is compared in the form the address parser gives it, however the product wrote it.
    expect(isExternal('https://xn--wgv71a119e.example/', { base: PAGE, site: ['日本語.example'] })).toBe(false);
    expect(isExternal('https://日本語.example/', { base: PAGE, site: ['https://xn--wgv71a119e.example'] })).toBe(false);
  });

  test('LNK-30 where the page is made and its address is not known, only what site names is the product’s own; a path is never external, with a base or without', () => {
    expect(isExternal('https://example.com/')).toBe(true);
    expect(isExternal('https://tanrei.example/', { site: ['https://tanrei.example'] })).toBe(false);
    for (const href of ['/guides/', '#install', 'next/', 'mailto:a@example.com', '']) {
      expect(isExternal(href), href).toBe(false);
      expect(isExternal(href, { site: ['https://tanrei.example'] }), href).toBe(false);
    }
    // A base that is no hierarchical address (a page written into a blank window) resolves no path.
    expect(isExternal('/guides/', { base: 'about:blank' })).toBe(false);
    expect(isExternal('https://example.com/', { base: 'about:blank' })).toBe(true);
    expect(isExternal('https://example.com/', { base: 'not an address' })).toBe(true);
    expect(isExternal('/guides/', { base: 'not an address' })).toBe(false);
  });

  test('the same arguments give the same answer, and nothing of the options is changed or kept', () => {
    const site = Object.freeze(['https://docs.tanrei.example']);
    const options = Object.freeze({ base: PAGE, site });
    expect(isExternal('https://example.com/', options)).toBe(true);
    expect(isExternal('https://example.com/', options)).toBe(true);
    expect(isExternal('https://docs.tanrei.example/', options)).toBe(false);
    expect(isExternal('https://docs.tanrei.example/')).toBe(true);
  });
});

test.describe('displayHost', () => {
  test('LKC-8 the host is read from the address and from nothing else: lower case, with a port that is not the scheme’s own, never a user, a password, a path, a query or a fragment', () => {
    const hosts: [string, string][] = [
      ['https://example.com/tanrei', 'example.com'],
      ['https://EXAMPLE.com/Tanrei?Q=1#Top', 'example.com'],
      ['https://www.example.com:8443/x', 'www.example.com:8443'],
      ['https://example.com:443/', 'example.com'],
      ['http://example.com:80/', 'example.com'],
      ['http://example.com:8080/', 'example.com:8080'],
      ['https://user:secret@example.com/', 'example.com'],
      ['https://example.com@evil.example/', 'evil.example'],
      ['https://example.com.evil.example/path/example.com', 'example.com.evil.example'],
      ['https://192.0.2.1/', '192.0.2.1'],
      ['https://[2001:db8::1]:8443/', '[2001:db8::1]:8443'],
    ];
    for (const [href, host] of hosts) expect(displayHost(href), href).toBe(host);
  });

  test('LKC-8 an address with no host of its own has none: a path, a fragment, a relative address, a scheme without one, an address that cannot be read', () => {
    for (const href of ['/guides/', '#install', 'next/', '?a=1', '', '   ', 'mailto:hello@example.com', 'tel:+81312345678', 'data:text/plain,a', 'about:blank', 'javascript:void 0', 'file:///etc/hosts', 'https://', 'http://[', 'example.com/tanrei']) {
      expect(displayHost(href), href).toBe('');
    }
  });

  test('LKC-9 a host written in one script, or in the scripts one writing system uses together, is drawn in its Unicode form, however the address was written', () => {
    const hosts: [string, string][] = [
      ['https://xn--wgv71a119e.example/', '日本語.example'],
      ['https://日本語.example/', '日本語.example'],
      ['https://xn--wgv71a119e.xn--wgv71a119e/', '日本語.日本語'],
      // Japanese: Han, Hiragana and Katakana in one label, with the long vowel mark the two kana share.
      ['https://東京のコーヒー.example/', '東京のコーヒー.example'],
      ['https://tanrei公式.example/', 'tanrei公式.example'],
      // Korean; Chinese; a Latin name with marks; German; a digit and a hyphen beside the letters.
      ['https://한국어.example/', '한국어.example'],
      ['https://中文.example:8443/a', '中文.example:8443'],
      ['https://bücher.example/', 'bücher.example'],
      ['https://münchen-2.example/', 'münchen-2.example'],
      ['https://www.日本語.example/', 'www.日本語.example'],
      // Cyrillic and Greek under an ending of their own are what they read as.
      ['https://пример.рф/', 'пример.рф'],
      ['https://παράδειγμα.ελ/', 'παράδειγμα.ελ'],
      ['https://مثال.example/', 'مثال.example'],
      ['https://उदाहरण.example/', 'उदाहरण.example'],
    ];
    for (const [href, host] of hosts) expect(displayHost(href), href).toBe(host);
  });

  test('LKC-9 a borrowed letter, a whole borrowed word under an ASCII ending, a mark that is no letter and a label that does not decode keep the WHOLE host in its ASCII form', () => {
    const ascii = (href: string) => new URL(href).host;
    const kept = [
      // One Cyrillic letter in a Latin name (c).
      'https://pаypal.example/',
      // A whole word of Cyrillic, and of Greek, under an ASCII ending (d).
      'https://аррӏе.com/',
      'https://пример.example/',
      'https://ορο.example/',
      // Latin with Cyrillic and Han: no writing system uses the three together (c).
      'https://aя中.example/',
      // Hiragana with Hangul (c).
      'https://にほん한국.example/',
    ];
    for (const href of kept) {
      const host = ascii(href);
      expect(host, href).toContain('xn--');
      expect(displayHost(href), href).toBe(host);
    }
    // One label that may not be shown keeps every label in the ASCII form: never a part of the host in each.
    expect(displayHost('https://日本語.pаypal.example/')).toBe(ascii('https://日本語.pаypal.example/'));
    expect(displayHost('https://日本語.pаypal.example/')).not.toContain('日本語');
  });

  test('LKC-9 a label is shown only when it decodes and encodes back to exactly what it was, and holds letters, marks, digits and hyphens alone', () => {
    // The address parser of this engine may refuse some of these outright (no host: ''), or hand them on as they are;
    // in neither case is anything but the ASCII form drawn.
    const labels = [
      'xn--', // nothing encoded
      'xn--a', // digits that end early
      'xn--abc-', // ASCII alone, dressed as an internationalised label
      'xn--paypal-', // the same
      'xn--99999999999', // overflows
      'xn--wgv71a119e0', // not what the name encodes to
      'xn--g6h', // a symbol (a star), not a letter
      'xn--ls8h', // an emoji
      'xn--1ug', // a joiner alone
    ];
    for (const label of labels) {
      const shown = displayHost(`https://${label}.example/`);
      expect(['', `${label}.example`], label).toContain(shown);
    }
  });

  test('the module is free of the DOM and of Node: it imports nothing and names no global but URL', () => {
    const source = fs.readFileSync(path.join(here, 'index.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(source).not.toMatch(/\bimport\b|\brequire\(/);
    expect(source).not.toMatch(/\b(document|window|location|navigator|globalThis|process|Buffer|fetch|localStorage|HTMLElement|Element|Node)\b/);
  });
});

// ── The link card's pure functions (specs/link-card.spec.json; REQUIREMENTS.md LKD-2) ───────────────────────────────
const cp = (...points: number[]) => String.fromCodePoint(...points);
type El = Exclude<TanreiLinkCardNode, string>;
const find = (nodes: TanreiLinkCardNode[], id: string): El | undefined => {
  for (const node of nodes) {
    if (typeof node === 'string') continue;
    if (node.attributes['data-part'] === id) return node;
    const inner = find(node.children, id);
    if (inner) return inner;
  }
  return undefined;
};
const text = (node: TanreiLinkCardNode | undefined): string => (node === undefined ? '' : typeof node === 'string' ? node : node.children.map(text).join(''));
const HREF = 'https://example.com/articles/designing-with-tokens';

test.describe('plainText, repeatsHost, pictureAddress', () => {
  test('LKC-15 a line break or a tab is one space, every other control character is dropped, and the characters that embed, override or isolate direction are dropped; everything else is kept', () => {
    expect(plainText('one\ntwo\r\nthree\tfour' + cp(0x2028) + 'five' + cp(0x85) + 'six')).toBe('one two three four five six');
    expect(plainText('a' + cp(0) + 'b' + cp(7) + 'c' + cp(0x1b) + 'd' + cp(0x7f) + 'e' + cp(0x9b) + 'f')).toBe('abcdef');
    for (let point = 0x202a; point <= 0x202e; point++) expect(plainText(`a${cp(point)}b`), point.toString(16)).toBe('ab');
    for (let point = 0x2066; point <= 0x2069; point++) expect(plainText(`a${cp(point)}b`), point.toString(16)).toBe('ab');
    // The marks that only state a direction, the joiners a script needs, and markup's own characters.
    const kept = `a${cp(0x200e)}b${cp(0x200f)}c${cp(0x61c)}d${cp(0x200d)}e${cp(0x200c)}f <b>&amp;</b> "'`;
    expect(plainText(kept)).toBe(kept);
    expect(plainText(`  ${cp(0x202e)} padded \n`)).toBe('padded');
    for (const value of [undefined, null, 1, {}, ['a']]) expect(plainText(value)).toBe('');
  });

  test('LKC-7 a site name repeats the host when it is the same characters without regard to case, with or without a leading www.', () => {
    for (const [name, host] of [['Example.com', 'example.com'], ['www.example.com', 'example.com'], ['EXAMPLE.COM', 'www.example.com'], [' example.com ', 'example.com']]) expect(repeatsHost(name, host), name).toBe(true);
    for (const [name, host] of [['Example', 'example.com'], ['example.org', 'example.com'], ['example.com', ''], ['Example Journal', 'example.com']]) expect(repeatsHost(name, host), name).toBe(false);
  });

  test('LKC-14 an address a card may ask for as a picture is http, https, a path, blob: or a data: URL of an image; a script, another scheme and an address that cannot be read are empty', () => {
    for (const src of ['https://example.com/a.png', 'http://example.com/a.png', '/pictures/a.png', 'pictures/a.png', '//cdn.example/a.png', 'blob:https://example.com/1', 'data:image/png;base64,AAAA', ' /a.png ']) expect(pictureAddress(src), src).toBe(src.trim());
    for (const src of ['', '   ', 'javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'vbscript:x', 'data:text/html,<script>1</script>', 'data:application/javascript,1', 'file:///etc/hosts', 'mailto:a@example.com', 'about:blank', 'http://[', undefined, 3]) expect(pictureAddress(src), String(src)).toBe('');
  });
});

test.describe('linkCardToNodes', () => {
  const full = { href: HREF, title: 'Designing with tokens', description: 'How a handful of dials becomes a whole system.', siteName: 'Example Journal', image: { src: '/link-pictures/a.png', width: 1200, height: 630 }, siteIcon: { src: '/link-pictures/i.png', width: 32, height: 32 }, external: 'off' as const };

  test('LKC-36 the markup is one tanrei-link-card around one anchor whose parts are marked data-part, in reading order, with the picture after the text', () => {
    const [card] = linkCardToNodes(full) as El[];
    expect(linkCardToNodes(full)).toHaveLength(1);
    expect([card.name, card.attributes]).toEqual(['tanrei-link-card', {}]);
    const [anchor] = card.children as El[];
    expect([anchor.name, anchor.attributes]).toEqual(['a', { href: HREF, 'data-external': 'false' }]);
    expect(anchor.children.map((child) => (child as El).attributes['data-part'])).toEqual(['body', 'media']);
    const body = anchor.children[0] as El;
    expect(body.children.map((child) => (child as El).attributes['data-part'])).toEqual(['title', 'description', 'site']);
    expect((find([card], 'site') as El).children.map((child) => (child as El).attributes['data-part'])).toEqual(['site-icon', 'site-name', 'address']);
    expect(find([card], 'title')).toEqual({ name: 'span', attributes: { 'data-part': 'title', dir: 'auto' }, children: ['Designing with tokens'] });
    // A picture is an img and nothing else: decoration, asked for without the page's address, and put off.
    expect(find([card], 'media')).toEqual({ name: 'img', attributes: { 'data-part': 'media', src: '/link-pictures/a.png', alt: '', width: '1200', height: '630', loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' }, children: [] });
    expect((find([card], 'site-icon') as El).attributes).toMatchObject({ alt: '', referrerpolicy: 'no-referrer', loading: 'lazy' });
    // Pure: the same answer for the same arguments, and the argument is not changed.
    expect(linkCardToNodes(full)).toEqual(linkCardToNodes(JSON.parse(JSON.stringify(full))));
    expect(linkCardToNodes(full, { variant: 'filled' })[0]).toMatchObject({ attributes: { variant: 'filled' } });
    expect(linkCardToNodes(full, { variant: 'outlined' })[0]).toMatchObject({ attributes: {} });
  });

  test('LKC-8 LKC-9 the host is displayHost(href) and nothing else: no value can set it, and it is written as its labels in a left-to-right bdi', () => {
    const nodes = linkCardToNodes({ href: 'https://example.com@other.example/a?b=example.org', title: 'example.org', siteName: 'example.org', ...({ host: 'example.org' } as object) });
    const host = find(nodes, 'host') as El;
    expect([host.name, host.attributes, text(host)]).toEqual(['bdi', { 'data-part': 'host', dir: 'ltr' }, 'other.example']);
    expect(hostNodes('a.b.example.org').map(text)).toEqual(['a.', 'b.', 'example.', 'org']);
    expect(text(find(linkCardToNodes({ href: 'https://xn--r8jz45g.jp/', title: 'T' }), 'host'))).toBe('例え.jp');
    expect(text(find(linkCardToNodes({ href: 'https://xn--80ak6aa92e.com/', title: 'T' }), 'host'))).toBe('xn--80ak6aa92e.com');
    // No host of its own: no site line.
    expect(find(linkCardToNodes({ href: '/foundations/tokens/', title: 'Tokens' }), 'site')).toBeUndefined();
  });

  test('LKC-5 LKC-6 LKC-7 missing parts are left out: without a title the address stands in its place, an empty description and a site name that repeats the host write nothing', () => {
    const alone = linkCardToNodes({ href: HREF });
    expect(find(alone, 'title')).toEqual({ name: 'span', attributes: { 'data-part': 'title', dir: 'ltr', 'data-address': '' }, children: [HREF] });
    expect(find(alone, 'description')).toBeUndefined();
    expect(find(alone, 'media')).toBeUndefined();
    expect(find(linkCardToNodes({ href: HREF, title: '  ', description: ' \n ' }), 'title')?.attributes).toHaveProperty('data-address');
    expect(find(linkCardToNodes({ href: HREF, title: 'T', siteName: 'Example.com' }), 'site-name')).toBeUndefined();
    expect(text(find(linkCardToNodes({ href: HREF, title: 'T', siteName: 'Example' }), 'site-name'))).toBe('Example');
    // What a picture shows is written only with a picture.
    expect(find(linkCardToNodes({ href: HREF, title: 'T', imageAlt: 'A wall' }), 'image-alt')).toBeUndefined();
    expect(text(find(linkCardToNodes({ href: HREF, title: 'T', image: '/a.png', imageAlt: 'A wall' }), 'image-alt'))).toBe('A wall');
  });

  test('LKC-15 every value is cleaned and stays text: markup is characters, direction overrides are dropped, and the HTML escapes all of it', () => {
    const hostile = { href: HREF, title: `<b>Designing</b> ${cp(0x202e)}snekot<script>`, description: '<img src=x onerror=alert(1)>', siteName: `Example "<i>Journal</i>" & co`, image: 'javascript:alert(1)', siteIcon: 'data:text/html,<script>1</script>' };
    const nodes = linkCardToNodes(hostile);
    expect(text(find(nodes, 'title'))).toBe('<b>Designing</b> snekot<script>');
    expect(find(nodes, 'media')).toBeUndefined();
    expect(find(nodes, 'site-icon')).toBeUndefined();
    const html = linkCardToHtml(hostile);
    expect(html).toContain('&lt;b&gt;Designing&lt;/b&gt; snekot&lt;script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toMatch(/<(b|i|script|img)[\s>]/);
    expect(html).not.toContain(cp(0x202e));
    // An attribute's value cannot end its attribute.
    expect(linkCardToHtml({ href: 'https://example.com/"><script>alert(1)</script>', title: 'T' })).toContain('href="https://example.com/&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"');
  });

  test('LKC-23 LKC-24 a new context is target="_blank" with noopener and its words; external is written as the product’s word, decided from site where it is given, and left to the element otherwise; never both words', () => {
    const opens = linkCardToNodes(full, { target: 'new', targetLabel: 'opens in a new tab', externalLabel: 'external link' });
    expect(((opens[0] as El).children[0] as El).attributes).toMatchObject({ target: '_blank', rel: 'noopener' });
    expect(text(find(opens, 'words'))).toBe('opens in a new tab');
    const outside = linkCardToNodes({ ...full, external: 'on' }, { externalLabel: 'external link', targetLabel: 'opens in a new tab' });
    expect(((outside[0] as El).children[0] as El).attributes).toEqual({ href: HREF, 'data-external': 'true' });
    expect(text(find(outside, 'words'))).toBe('external link');
    expect(find(linkCardToNodes(full, { externalLabel: 'external link' }), 'words')).toBeUndefined();
    const auto = { ...full, external: 'auto' as const };
    expect(((linkCardToNodes(auto)[0] as El).children[0] as El).attributes).toEqual({ href: HREF });
    expect(((linkCardToNodes(auto, { site: ['example.com'] })[0] as El).children[0] as El).attributes).toMatchObject({ 'data-external': 'false' });
    expect(((linkCardToNodes(auto, { site: ['tanrei.example'] })[0] as El).children[0] as El).attributes).toMatchObject({ 'data-external': 'true' });
    // A path with a new context: a site line that holds the mark's place alone.
    expect(find(linkCardToNodes({ href: '/x/', title: 'T' }, { target: 'new' }), 'address')).toEqual({ name: 'span', attributes: { 'data-part': 'address' }, children: [] });
  });

  test('LKC-27 a destination that is empty, a script or unreadable gives the title alone, in an anchor without an address', () => {
    for (const href of ['', '  ', 'javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'http://[']) {
      const nodes = linkCardToNodes({ ...full, href });
      const anchor = (nodes[0] as El).children[0] as El;
      expect(anchor.attributes, href).toEqual({});
      expect(text(nodes[0]), href).toBe('Designing with tokens');
      expect(find(nodes, 'media'), href).toBeUndefined();
      expect(linkCardToHtml({ ...full, href })).not.toContain('href');
    }
    expect(text(linkCardToNodes({ href: 'javascript:alert(1)' })[0])).toBe('');
  });
});
