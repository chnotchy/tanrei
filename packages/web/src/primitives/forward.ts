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
    const reads = readers.get(from);
    for (const name of names) {
      const read = reads?.get(name);
      member[name] = read ? read() : (from as Record<string, unknown>)[name];
    }
    return noChange;
  }
}

/** For each composed element that has any, what it forwards under a name in place of what reading the property gives. */
const readers = new WeakMap<object, Map<string, () => unknown>>();

/**
 * W2: `forward()` passes `read()` under `name`, not what reading the property gives. The one case is a size the
 * member takes from its containers while it sets none (`forwardedOwnSize()`, size-cascade.ts): the element's `size`
 * reads as the default's name while the product set none, and the member is given none, so that it still takes its
 * containers' size. The member is still given the value as it is set, unchanged.
 */
export function forwardAs(from: object, name: string, read: () => unknown) {
  let reads = readers.get(from);
  if (!reads) readers.set(from, (reads = new Map()));
  reads.set(name, read);
}

/**
 * W2: on a member's tag, sets each named property of `from` — the composed element — on that member as a property, on
 * every render: `<tanrei-field ${forward(this, FIELD)}>`. Nothing is read, changed, validated or given another
 * default on the way; a value the member does not know reaches it as given, and the member answers it.
 */
export const forward = directive(Forward);
