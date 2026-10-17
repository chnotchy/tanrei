// Runs IN THE PAGE (page.evaluate): every live preview of a built docs page against a copy of the same markup drawn
// by the web package's stylesheets winning over the page's.
//
// A preview is an element the page draws to show a component: the children of a live example's stage (DemoFrame), of a
// spec fixture's stage in the page (components/fixtures/FixtureGallery.astro) and of a file tree's stage (FileTree). Its copy is made from the page's HTML as
// it was served, so the element is upgraded from the same markup, and stands in a shadow root beside the preview:
// it inherits what the preview inherits, and is matched by
//
//   1. every rule of the page's stylesheets, all of them in one layer — the reset, Starlight's rules, the docs' own —
//      so a page rule that matches the element by its own markup matches the copy too (the docs' demo classes, a
//      component's scoped style, the reset of a product's page); a rule that needs an ancestor outside the preview
//      (`.sl-markdown-content p`) does not;
//   2. then every stylesheet `@tanrei/web` ships, in a later layer: the component's own rules win, as on a product's
//      page that loads them correctly.
//
// What differs between a preview and its copy — a box, a margin, a color, a pseudo-element's glyph — is the page doing
// to the component what the component's own stylesheet does not allow: a stylesheet loaded where the page's layers
// beat it, a stylesheet the page does not load, a page rule that reaches into the component. Not what it cannot see:
// a fixture drawn in a window of its own (an `iframe`, which is not a preview of this page) or one the page stages files into
// (`data-fixture-files`) is in a state the copy is not, and is left out; parts placed against something outside the
// preview (an open surface's list) and visually hidden parts are not compared.
export async function comparePreviews({ componentCss, still }) {
  const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
  const quiet = document.createElement('style');
  quiet.textContent = still;
  document.head.append(quiet);
  await document.fonts.ready;

  const SELECTOR = [
    '[data-tanrei-demo] > figure > [data-part=frame] > [data-part=stage] > *',
    '.docs-stage-box[data-tanrei-demo] .fixture-element > *',
    '.docs-file-tree > figure > [data-part=stage] > *',
  ].join(', ');
  const served = new DOMParser().parseFromString(await (await fetch(location.href)).text(), 'text/html');
  const live = [...document.querySelectorAll(SELECTOR)];
  const source = [...served.querySelectorAll(SELECTOR)];
  if (live.length !== source.length) return { error: `the page holds ${live.length} previews, its HTML ${source.length}` };

  const up = (node) => node.assignedSlot ?? node.parentElement ?? (node.parentNode instanceof ShadowRoot ? node.parentNode.host : null);
  const all = (root) => {
    const out = [root];
    const walk = (node) => {
      for (const child of node.children) {
        if (child.localName === 'style' || child.localName === 'script' || child.localName === 'template') continue;
        out.push(child);
        if (child.shadowRoot) walk(child.shadowRoot);
        walk(child);
      }
    };
    if (root.shadowRoot) walk(root.shadowRoot);
    walk(root);
    return out;
  };
  const settle = async (roots) => {
    const elements = roots.flatMap(all);
    await Promise.race([
      Promise.all([...new Set(elements.map((e) => e.localName).filter((n) => n.includes('-')))].map((n) => customElements.whenDefined(n))),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
    await Promise.all(elements.map((e) => e.updateComplete).filter(Boolean));
    // A picture loads lazily: brought into view, and waited for until it has loaded or failed.
    for (const picture of elements.filter((e) => e.localName === 'img' && !e.complete)) {
      picture.scrollIntoView({ block: 'center' });
      await new Promise((resolve) => {
        picture.addEventListener('load', resolve, { once: true });
        picture.addEventListener('error', resolve, { once: true });
        setTimeout(resolve, 2000);
      });
    }
    for (let k = 0; k < 4; k++) await frame();
  };

  const previews = live.map((element, index) => ({ element, index })).filter(({ element }) => {
    if (element.matches('[data-fixture-files]')) return false;
    const box = element.getBoundingClientRect();
    if (box.width === 0 && box.height === 0) return false;
    return all(element).some((e) => e.localName.startsWith('tanrei-') || /(^|\s)tanrei-/.test(e.getAttribute('class') ?? ''));
  });
  await settle(previews.map((p) => p.element));

  const page = [];
  for (const sheet of document.styleSheets) {
    if (sheet.ownerNode === quiet) continue;
    try {
      page.push(...[...sheet.cssRules].map((rule) => rule.cssText));
    } catch {
      // A stylesheet of another origin cannot be read; the docs load none.
    }
  }
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(`@layer page {\n${page.join('\n')}\n}\n@layer components {\n${componentCss}\n}\n${still}`);

  for (const preview of previews) {
    const { element, index } = preview;
    let layout = element.parentElement;
    while (getComputedStyle(layout).display === 'contents') layout = layout.parentElement;
    const around = getComputedStyle(layout);
    // The host covers the box the preview is positioned in, so that what the copy places in place (an open list,
    // kept inside that box) has the room the preview's has; the copy stands in it where the preview stands, in a
    // box as wide as the preview's layout, laid out as that layout lays out its children.
    const host = document.createElement('div');
    host.style.cssText = 'position: absolute; inset: 0; pointer-events: none';
    const root = host.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [sheet];
    const wrap = document.createElement('div');
    wrap.style.inlineSize = `${layout.clientWidth - parseFloat(around.paddingLeft) - parseFloat(around.paddingRight) + 1}px`;
    for (const property of ['display', 'flex-direction', 'flex-wrap', 'align-items', 'justify-content']) wrap.style.setProperty(property, around.getPropertyValue(property));
    const copy = document.importNode(source[index], true);
    if (!getComputedStyle(element).display.startsWith('inline')) copy.style.inlineSize = `${element.getBoundingClientRect().width}px`;
    wrap.append(copy);
    root.append(wrap);
    element.parentElement.append(host);
    Object.assign(preview, { host, wrap, copy });
  }
  await settle(previews.map((p) => p.copy));
  for (const { element, copy, wrap } of previews) {
    const a = element.getBoundingClientRect();
    const c = copy.getBoundingClientRect();
    wrap.style.marginLeft = `${a.left - c.left}px`;
    wrap.style.marginTop = `${a.top - c.top}px`;
  }
  await settle(previews.map((p) => p.copy));

  const describe = (e) =>
    e.localName + (e.id ? `#${e.id}` : '') + (typeof e.className === 'string' && e.className.trim() ? `.${e.className.trim().split(/\s+/).join('.')}` : '') + (e.getAttribute('role') ? `[role=${e.getAttribute('role')}]` : '') + (e.getAttribute('slot') ? `[slot=${e.getAttribute('slot')}]` : '');
  const same = (a, b) => a === b || (/^-?[\d.]+px$/.test(a) && /^-?[\d.]+px$/.test(b) && Math.abs(parseFloat(a) - parseFloat(b)) <= 1.5);
  const establishes = (e) => {
    const s = getComputedStyle(e);
    return s.position !== 'static' || s.transform !== 'none' || s.translate !== 'none' || /layout|paint|strict|content/.test(s.contain) || s.containerType !== 'normal';
  };
  // Left out: what is visually hidden, and what is placed against a box outside the preview.
  const leftOut = (e, root) => {
    for (let n = e; n; n = n === root ? null : up(n)) {
      const s = getComputedStyle(n);
      if (s.clipPath !== 'none' || s.clip !== 'auto') return true;
      if (s.position === 'absolute' || s.position === 'fixed') {
        let inside = false;
        for (let a = n === root ? null : up(n); a; a = a === root ? null : up(a)) if (establishes(a)) inside = true;
        if (!inside) return true;
      }
    }
    return false;
  };
  const drawn = (root) =>
    all(root).filter((e) => {
      const b = e.getBoundingClientRect();
      return b.width > 1 && b.height > 1 && !leftOut(e, root);
    });
  const PROPERTIES = ['display', 'color', 'background-color', 'font-size', 'line-height', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding-left', 'padding-right', 'list-style-type'];
  const PSEUDO = ['content', 'display', 'width', 'height', 'margin-left', 'margin-right', 'color'];

  const differ = [];
  for (const { element, copy, index } of previews) {
    // Measured in view, as a reader sees it: a surface that stays inside the window places itself as it scrolls in.
    element.scrollIntoView({ block: 'center' });
    await frame();
    await frame();
    const a = drawn(element);
    const c = drawn(copy);
    const ra = element.getBoundingClientRect();
    const rc = copy.getBoundingClientRect();
    const notes = [];
    if (a.length !== c.length) notes.push(`${a.length} boxes drawn, ${c.length} in the package's drawing`);
    for (let k = 0; k < Math.min(a.length, c.length) && notes.length < 6; k++) {
      const x = a[k];
      const y = c[k];
      const bx = x.getBoundingClientRect();
      const by = y.getBoundingClientRect();
      const d = [bx.left - ra.left - (by.left - rc.left), bx.top - ra.top - (by.top - rc.top), bx.width - by.width, bx.height - by.height];
      if (d.some((v) => Math.abs(v) > 1.5)) notes.push(`${describe(x)}: box off by [x ${Math.round(d[0])}, y ${Math.round(d[1])}, w ${Math.round(d[2])}, h ${Math.round(d[3])}]`);
      const sx = getComputedStyle(x);
      const sy = getComputedStyle(y);
      for (const p of PROPERTIES) {
        if (!same(sx.getPropertyValue(p), sy.getPropertyValue(p))) {
          notes.push(`${describe(x)}: ${p} ${sx.getPropertyValue(p)}, the package's ${sy.getPropertyValue(p)}`);
          break;
        }
      }
      for (const pseudo of ['::before', '::after']) {
        const px = getComputedStyle(x, pseudo);
        const py = getComputedStyle(y, pseudo);
        for (const p of PSEUDO) {
          if (!same(px.getPropertyValue(p), py.getPropertyValue(p))) {
            notes.push(`${describe(x)}${pseudo}: ${p} ${px.getPropertyValue(p)}, the package's ${py.getPropertyValue(p)}`);
            break;
          }
        }
      }
    }
    if (notes.length) differ.push({ index, preview: describe(element), notes });
  }
  for (const { host } of previews) host.remove();
  quiet.remove();
  return { compared: previews.length, differ };
}
