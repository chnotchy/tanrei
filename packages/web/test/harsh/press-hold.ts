// Harsh mode's longer press-hold, in every engine (test/harsh.ts says why). Run in the page — as an init script, and once
// on the document a page already has — it adopts `css` (`pressHoldRules()`: the token sheets' declarations of
// press-hold again, with the time added) into the document, and hides it from the page:
// - `document.adoptedStyleSheets` reads without it, so a page that counts or compares its own sheets sees only them;
// - a list the page sets there keeps it, first (it declares nothing but press-hold, so where it stands among the
//   page's sheets changes nothing else).
// A document the page makes itself (`document.implementation`) is left as it is. A document written into the same
// window (`page.setContent()`, `document.open()`) keeps the sheet.
//
// It must stand alone: Playwright sends its source to the page.
export function lengthenPressHold(css: string): void {
  const marked = window as unknown as { tanreiHarshPressHold?: { sheet: CSSStyleSheet; own: PropertyDescriptor } };
  if (!marked.tanreiHarshPressHold) {
    const own = Object.getOwnPropertyDescriptor(Document.prototype, 'adoptedStyleSheets')!;
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    marked.tanreiHarshPressHold = { sheet, own };
    Object.defineProperty(Document.prototype, 'adoptedStyleSheets', {
      ...own,
      get(this: Document) {
        const list = own.get!.call(this) as CSSStyleSheet[];
        return this === document ? list.filter((each) => each !== sheet) : list;
      },
      set(this: Document, list: CSSStyleSheet[]) {
        own.set!.call(this, this === document ? [sheet, ...list.filter((each) => each !== sheet)] : list);
      },
    });
  }
  const { sheet, own } = marked.tanreiHarshPressHold;
  const list = own.get!.call(document) as CSSStyleSheet[];
  if (!list.includes(sheet)) own.set!.call(document, [sheet, ...list]);
}
