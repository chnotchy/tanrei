// W2 of the web's way of composing (src/primitives/composed.ts): a forwarded prop is
// set on the member it is from, as a property, on every render. Kept apart from the base classes so that the analyzer
// of the manifest, which reads that module for what composed elements inherit, meets no class that is not an element's.
import { noChange } from 'lit';
import { Directive, type ElementPart, type PartInfo, PartType, directive } from 'lit/directive.js';

class Forward extends Directive {
  constructor(part: PartInfo) {
    super(part);
    if (part.type !== PartType.ELEMENT) throw new Error('forward() stands on a member\'s tag: <tanrei-field ${forward(this, NAMES)}>');
  }

  render(_from: object, _names: readonly string[]) {
    return noChange;
  }

  override update(part: ElementPart, [from, names]: [object, readonly string[]]) {
    const member = part.element as unknown as Record<string, unknown>;
    for (const name of names) member[name] = (from as Record<string, unknown>)[name];
    return noChange;
  }
}

/**
 * W2: on a member's tag, sets each named property of `from` — the composed element — on that member as a property, on
 * every render: `<tanrei-field ${forward(this, FIELD)}>`. Nothing is read, changed, validated or given another
 * default on the way; a value the member does not know reaches it as given, and the member answers it.
 */
export const forward = directive(Forward);
