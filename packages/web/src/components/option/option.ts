import { LitElement, type PropertyDeclarations, css } from 'lit';
import { OPTION_GROUP_TAG, OPTION_TAG } from '../../primitives/option-list.js';

// The two elements a field that opens a list of options holds: `<tanrei-option>` and `<tanrei-option-group>`. One pair
// for the select and the combobox: a select that needs a
// filter becomes a combobox with the same children. Each is data for its field — the field reads its attributes and
// its text (`readOptions()`, src/primitives/option-list.ts) and renders the rows itself, in its own shadow root — so
// neither draws anything, and what an option may be (whether its value may be empty) is each field's rule.
const hidden = css`
  :host {
    display: none !important;
  }
`;

/**
 * One choice of a select or a combobox: a label, the value it stands for, and optionally a supporting line and a
 * glyph. `<tanrei-option value="jp">Japan</tanrei-option>`: the label is the `label` attribute or, without one, the
 * element's text, as a native `<option>`'s.
 *
 * The element is data for the field that holds it: it draws nothing itself, takes no focus and fires no event. Its
 * field reads it, renders the option's row in its own list and reads it again when an attribute or the text changes.
 * Every property reflects to its attribute, which is what the field reads.
 *
 * @tag tanrei-option
 * @slot - The option's label, as text, where the `label` attribute is not given. It is read, never drawn in place.
 */
export class TanreiOption extends LitElement {
  static override styles = hidden;

  static override properties: PropertyDeclarations = {
    label: { type: String, reflect: true },
    value: { type: String, reflect: true },
    supportingText: { type: String, attribute: 'supporting-text', reflect: true },
    leadingIcon: { type: String, attribute: 'leading-icon', reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  /** The option's text and its accessible name; its field shows it once the option is chosen. Without it, the element's text is the label. */
  label = '';

  /** Identifies the choice: the option is the chosen one while its field's value equals it. Unique within the field. */
  value = '';

  /** A line below the label that says more about the choice (`supporting-text`). Shown in the list only. */
  supportingText = '';

  /** The name of an icon — a glyph of the system's icon set — before the label (`leading-icon`). */
  leadingIcon = '';

  /** Prevents the option from being chosen. It stays reachable with the arrow keys. */
  disabled = false;
}

/**
 * A run of related options of a select or a combobox, optionally titled:
 * `<tanrei-option-group label="Asia">…</tanrei-option-group>`. The title is the `label` attribute, as a native
 * `<optgroup>`'s — a `title` attribute would also draw the browser's tooltip. The field separates a group from what is
 * next to it by a divider or a gap.
 *
 * The element is data for the field that holds it and draws nothing itself. A group inside a group is not a level of
 * its own: its options are drawn as the outer group's.
 *
 * @tag tanrei-option-group
 * @slot - The group's `<tanrei-option>` elements.
 */
export class TanreiOptionGroup extends LitElement {
  static override styles = hidden;

  static override properties: PropertyDeclarations = {
    label: { type: String, reflect: true },
  };

  /** A short heading drawn above the group's options, which also names the group; empty draws none and leaves the group unnamed. */
  label = '';
}

if (!customElements.get(OPTION_TAG)) customElements.define(OPTION_TAG, TanreiOption);
if (!customElements.get(OPTION_GROUP_TAG)) customElements.define(OPTION_GROUP_TAG, TanreiOptionGroup);

declare global {
  interface HTMLElementTagNameMap {
    'tanrei-option': TanreiOption;
    'tanrei-option-group': TanreiOptionGroup;
  }
}
