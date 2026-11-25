// The text in an input box is checked for contrast. The box's edges — a stacked field's inner line, an outlined field's
// outline of three pieces with the gap for its floated label — stand over its value, its placeholder and its floating
// label (TXI-26, TXI-13; the select's, the combobox's, the number input's and the color input's are the same edges,
// src/primitives/field-trigger.ts). An element there is what axe's color-contrast rule takes for one covering the text:
// it left every such text incomplete ("overlapped by another element") instead of checking it, so faint text in a field
// passed by not being looked at. Each edge part now draws nothing itself and its ::before draws the line. Each control,
// and each field composed of one, is checked here in every variant, resting, holding a value (its label floated), with
// only a placeholder, in error and disabled — and once more hovered and focused.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';
import { type Fixture, loadSpec, mountFixtures } from '../../test/harness.js';

type Props = Fixture['props'];

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
/** Every color of the box's text — value, label and its asterisk, placeholder, prefix and suffix — in every look and state. */
const TEXT_COLORS = [...new Set([...fs.readFileSync(path.join(web, 'dist/tokens.css'), 'utf8').matchAll(/--tanrei-comp-input-box-[a-z0-9-]*(?:input|label|placeholder|affix|asterisk)-color(?=:)/g)].map((m) => m[0]))];
/** A text color far too faint for the box's container in every look: about 1.6 : 1 on white. */
const FAINT = '#c8c8c8';

interface Subject {
  /** The spec whose element is mounted. */
  name: string;
  /** The sentences of the edges this subject draws (its own, or its control's). */
  sentences: string;
  /** The model fixture: a value, a label, and whatever else the element needs (its options). */
  model: string;
  /** The props of a model fixture with a placeholder in place of its value, where the element has a placeholder. */
  placeholder?: (props: Props) => Props;
}

const withoutValue = ({ value: _value, ...props }: Props): Props => props;
const SUBJECTS: Subject[] = [
  { name: 'text-input', sentences: 'TXI-26, TXI-13', model: 'outlined-filled', placeholder: (p) => ({ ...withoutValue(p), placeholder: 'name@example.com' }) },
  { name: 'text-field', sentences: 'TXI-26, TXI-13', model: 'outlined-filled', placeholder: (p) => ({ ...withoutValue(p), placeholder: 'name@example.com' }) },
  { name: 'select', sentences: 'SEL-20, SEL-15', model: 'stacked-value', placeholder: (p) => ({ ...withoutValue(p), placeholder: 'Choose one' }) },
  { name: 'select-field', sentences: 'SEL-20, SEL-15', model: 'stacked-value', placeholder: (p) => ({ ...withoutValue(p), placeholder: 'Choose one' }) },
  { name: 'combobox', sentences: 'CMB-15, CMB-8', model: 'stacked-value', placeholder: (p) => ({ ...withoutValue(p), placeholder: 'Search cities' }) },
  { name: 'combobox-field', sentences: 'CMB-15, CMB-8', model: 'stacked-value', placeholder: (p) => ({ ...withoutValue(p), placeholder: 'Search cities' }) },
  { name: 'number-input', sentences: 'NMI-15, NMI-8', model: 'stacked-value', placeholder: (p) => ({ ...withoutValue(p), placeholder: '1 to 99' }) },
  { name: 'number-field', sentences: 'NMI-15, NMI-8', model: 'stacked-value', placeholder: (p) => ({ ...withoutValue(p), placeholder: '1 to 99' }) },
  { name: 'color-input', sentences: 'CLI-22, CLI-15', model: 'stacked-filled' },
  { name: 'color-field', sentences: 'CLI-22, CLI-15', model: 'stacked-filled' },
  { name: 'chip-field', sentences: 'TXI-26, TXI-13 of its text input', model: 'email-typing', placeholder: ({ inputValue: _typed, value: _value, ...p }) => ({ ...p, placeholder: 'name@example.com' }) },
];

const VARIANTS = ['stacked', 'filled', 'outlined'] as const;

/** The fixtures of a subject: each variant holding a value, resting with its label, with a placeholder, in error and disabled; a faint copy of each. */
function fixturesOf(subject: Subject): Fixture[] {
  const spec = loadSpec(subject.name);
  const model = spec.fixtures.find((f) => f.id === subject.model)!;
  const { twin: _twin, ...base } = model;
  const forms: Record<string, Props> = {
    value: { ...base.props },
    resting: subject.name === 'chip-field' ? (({ inputValue: _typed, value: _value, ...p }) => p)(base.props) : withoutValue(base.props),
    ...(subject.placeholder ? { placeholder: subject.placeholder(base.props) } : {}),
    error: { ...base.props, error: true },
    disabled: { ...base.props, disabled: true },
  };
  return VARIANTS.flatMap((variant) =>
    Object.entries(forms).flatMap(([form, props]) =>
      ['normal', 'faint'].map((tone) => ({ ...base, id: `${variant}-${form}-${tone}`, props: { ...props, variant } })),
    ),
  );
}

/** Each node axe reports, as the fixture whose stage holds it. */
async function stagesOf(page: Page, targets: unknown[]): Promise<string[]> {
  return page.evaluate((list) => {
    return list.map((target) => {
      // A node in a shadow root is a path of selectors, one per root: the first is in the document, and the stage is an
      // ancestor of what it selects.
      const first: unknown = Array.isArray(target[0]) ? target[0][0] : target[0];
      const el = typeof first === 'string' ? document.querySelector(first) : null;
      return el?.closest('[data-fixture]')?.getAttribute('data-fixture') ?? `(outside a stage: ${JSON.stringify(target)})`;
    });
  }, targets as (string | string[])[][]);
}

async function contrast(page: Page, include: string) {
  const results = await new AxeBuilder({ page }).include(include).withRules(['color-contrast']).analyze();
  const at = async (list: typeof results.violations) => stagesOf(page, list.flatMap((rule) => rule.nodes.map((node) => node.target as unknown)));
  // Why axe left a node unchecked ("bgOverlap": an element covers it), beside the stage it is in.
  const why = results.incomplete.flatMap((rule) => rule.nodes.map((node) => node.any.map((check) => (check.data as { messageKey?: string } | null)?.messageKey ?? check.id).join(', ')));
  const unchecked = (await at(results.incomplete)).map((stage, i) => `${stage}: ${why[i]}`);
  return { incomplete: unchecked, violations: await at(results.violations), passes: await at(results.passes) };
}

for (const subject of SUBJECTS) {
  test(`${subject.sentences}: ${subject.name} — its edges hide no text from a contrast check: faint text is a violation and the box's own colors pass, in every variant, resting, with a value, a placeholder, in error, disabled, hovered and focused`, async ({ page }) => {
    const fixtures = fixturesOf(subject);
    await mountFixtures(page, loadSpec(subject.name), { fixtures, reducedMotion: true });
    // The faint copies: every text color of the box, in every look and state, on their stages (custom properties inherit).
    await page.evaluate(
      ([names, faint]) => {
        for (const stage of document.querySelectorAll<HTMLElement>('[data-fixture$="-faint"]')) for (const name of names as string[]) stage.style.setProperty(name, faint as string);
      },
      [TEXT_COLORS, FAINT] as const,
    );
    expect(TEXT_COLORS.length, 'the text colors of the box').toBeGreaterThan(20);
    // A disabled box is not held to contrast; a stacked box resting with no value and no placeholder draws no text of
    // its own (its label is its Field's row). Neither may be left unchecked all the same.
    const live = fixtures.map((f) => f.id).filter((id) => !id.includes('-disabled-') && !id.startsWith('stacked-resting-'));
    const check = async (when: string, ids: readonly string[]) => {
      const seen = await contrast(page, '.stage');
      expect(seen.incomplete, `${when}: left unchecked`).toEqual([]);
      for (const id of ids) {
        if (id.endsWith('-faint')) expect(seen.violations, `${when}: ${id}'s faint text is reported`).toContain(id);
        else {
          expect(seen.violations, `${when}: ${id} draws its text in its own colors`).not.toContain(id);
          expect(seen.passes, `${when}: ${id}'s text is checked`).toContain(id);
        }
      }
    };
    await check('at rest', live);
    // Hovered and focused: the pointer over one faint field and focus in another, each drawn from that state's tokens.
    const stage = (id: string) => page.locator(`[data-fixture="${id}"]`);
    const hovered = stage('outlined-value-faint').locator(loadSpec(subject.name).platforms.web.name).first();
    const box = (await hovered.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await stage('filled-value-faint').locator('input:not([type="hidden"]), [role="combobox"]').first().focus();
    await check('hovered and focused', ['outlined-value-faint', 'filled-value-faint', 'stacked-value-normal']);
  });
}
