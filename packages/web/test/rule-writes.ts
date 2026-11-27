// What an element asks of the page's rules. A rule inserted into a sheet, or a sheet added to the document's adopted
// sheets, has the engine build every rule of the page again (WebKit: about a quarter of a second on a long page); a
// value written on an element costs that element's style alone. A light-DOM element draws a value its stylesheet cannot
// name (a size or a variant a design system added, a count beyond those the sheet holds) with values on itself, and a
// test proves it with these: install the count in the document before any script (`countingRules()`), mount, then
// read `ruleWrites()`.
import type { Page } from '@playwright/test';

/** The writes counted since the page's start: rules inserted, and sheets the document adopted, that name `tag`. */
export interface RuleWrites {
  inserted: number;
  adopted: number;
}

/**
 * Runs in the page, before any script of the package: wraps `insertRule` and the document's `adoptedStyleSheets`
 * setter, counting a rule whose text names `tag`, and a newly adopted sheet one of whose rules does. (Another
 * element's own rules — a glyph's probe, a shadow root's static styles — are not counted.)
 */
function installCount(tag: string) {
  const w = window as unknown as { ruleWrites: { inserted: number; adopted: number } };
  w.ruleWrites = { inserted: 0, adopted: 0 };
  const insert = CSSStyleSheet.prototype.insertRule;
  CSSStyleSheet.prototype.insertRule = function (this: CSSStyleSheet, ...args: Parameters<typeof insert>) {
    if (String(args[0]).includes(tag)) w.ruleWrites.inserted++;
    return insert.apply(this, args);
  };
  const property = Object.getOwnPropertyDescriptor(Document.prototype, 'adoptedStyleSheets')!;
  const names = (sheet: CSSStyleSheet) => [...sheet.cssRules].some((rule) => rule.cssText.includes(tag));
  Object.defineProperty(Document.prototype, 'adoptedStyleSheets', {
    ...property,
    set(this: Document, sheets: CSSStyleSheet[]) {
      const had = property.get!.call(this) as CSSStyleSheet[];
      w.ruleWrites.adopted += sheets.filter((sheet) => !had.includes(sheet) && names(sheet)).length;
      property.set!.call(this, sheets);
    },
  });
}

/** `markup` (a whole document, as `fixturesDocument()` writes it) with the count of the rules that name `tag` installed first in its head. */
export const countingRules = (markup: string, tag: string): string => markup.replace('<head>', () => `<head><script>(${installCount.toString()})(${JSON.stringify(tag)})</script>`);

/** The writes counted so far. */
export const ruleWrites = (page: Page): Promise<RuleWrites> => page.evaluate(() => ({ ...(window as unknown as { ruleWrites: RuleWrites }).ruleWrites }));
