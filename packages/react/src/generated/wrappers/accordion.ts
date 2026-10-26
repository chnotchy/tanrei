// GENERATED FILE — DO NOT EDIT.
// Source: packages/web/custom-elements.json. Regenerate with `pnpm generate`.
import { createComponent } from '@lit/react';
import * as React from 'react';
import { withServerAttributes } from '../../server.js';
import { TanreiAccordion as TanreiAccordionElement } from '@tanrei/web/components/accordion';

const AccordionElement = /* @__PURE__ */ createComponent({
  tagName: 'tanrei-accordion',
  elementClass: TanreiAccordionElement,
  react: React,
  events: {},
});
const AccordionAttributes = { variant: ['variant', 'plain'], density: ['density', 'regular'], separation: ['separation', 'auto'], exclusive: ['exclusive', false] } as const;
/**
 * Content that a row shows and hides in place. One item is a single disclosure; several are a set whose items open by themselves or, with `exclusive`, one at a time. A help page's questions, the sections of a settings screen, the advanced part of a form.
 *
 * Children, by their `slot`:
 * - default — The items: native `<details>` elements, each with a `<summary>` first. They are children in the document, not slotted nodes: the element has no shadow root.
 */
export const Accordion = /* @__PURE__ */ withServerAttributes(AccordionElement, 'tanrei-accordion', TanreiAccordionElement, AccordionAttributes);
