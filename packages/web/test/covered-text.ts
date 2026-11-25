import type { Page } from '@playwright/test';
import type AxeBuilder from '@axe-core/playwright';

type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>;

/**
 * The text axe's `color-contrast` rule left unchecked because an element lies over it (`bgOverlap`), each with the
 * element axe found on top: `<target> under <host>><tag>.<classes>[part]`. A positioned box over text — a state layer, a
 * focus ring's box, a stretched link, a hit area — hides that text from the check even where it draws nothing, and the
 * text's contrast is then never measured. A component draws such a box with a pseudo-element, hides it while it draws
 * nothing, or — where the box is a hit area or lies under the text — positions the text above it, so the list is empty.
 *
 * Call it right after `analyze()`, on the page analysed: it asks the axe that run left on the page what lies on top.
 */
export async function coveredText(page: Page, results: AxeResults): Promise<string[]> {
  const targets = results.incomplete
    .filter((rule) => rule.id === 'color-contrast')
    .flatMap((rule) => rule.nodes)
    .filter((node) => node.any.some((check) => (check.data as { messageKey?: string } | null)?.messageKey === 'bgOverlap'))
    .map((node) => node.target);
  if (!targets.length) return [];
  return page.evaluate((targets) => {
    const axe = (window as unknown as { axe: any }).axe;
    const name = (element: Element) => {
      const root = element.getRootNode() as ShadowRoot | Document;
      const host = 'host' in root ? root.host.localName : 'document';
      const classes = (element.getAttribute('class') ?? '').trim().split(/\s+/).filter(Boolean).map((c) => `.${c}`).join('');
      const part = element.getAttribute('part') ? `[part="${element.getAttribute('part')}"]` : '';
      return `${host}>${element.localName}${classes}${part}`;
    };
    axe.setup();
    try {
      return targets.map((target) => {
        const element = axe.utils.shadowSelect(target) as Element;
        const stacks = (axe.commons.dom.getTextElementStack(element) as Element[][]).map((stack) => axe.commons.dom.reduceToElementsBelowFloating(stack, element) as Element[]);
        const top = stacks.find((stack) => stack[0] !== element)?.[0];
        return `${JSON.stringify(target)} under ${top ? name(top) : 'an element axe no longer finds there'}`;
      });
    } finally {
      axe.teardown();
    }
  }, targets as unknown as string[][]);
}
