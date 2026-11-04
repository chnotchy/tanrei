// GENERATED FILE — DO NOT EDIT.
// Source: tokens/generated/<id>/components.json, the components manifests. Regenerate with `pnpm generate`.
// @tanrei/react/advanced: the components listed as advanced — building blocks of the others — in every system that has them (cupertino, m3-expressive-like, m3-like, tanrei).
import { ColorInput as ColorInputWrapper, type ColorInputMarks } from '../../generated/wrappers/color-input.js';
import { Combobox as ComboboxWrapper, type ComboboxMarks } from '../../generated/wrappers/combobox.js';
import { EmbeddedTextInput as EmbeddedTextInputWrapper, type EmbeddedTextInputMarks } from '../../generated/wrappers/embedded-text-input.js';
import { FilePicker as FilePickerWrapper } from '../../generated/wrappers/file-picker.js';
import { ModalLayer as ModalLayerWrapper } from '../../generated/wrappers/modal-layer.js';
import { NumberInput as NumberInputWrapper, type NumberInputMarks } from '../../generated/wrappers/number-input.js';
import { OneTimeCodeInput as OneTimeCodeInputWrapper, type OneTimeCodeInputMarks } from '../../generated/wrappers/one-time-code-input.js';
import { TextInput as TextInputWrapper, type TextInputMarks } from '../../generated/wrappers/text-input.js';

export * from '../../common.js';
export { Option } from '../../generated/wrappers/option.js';
export { OptionGroup } from '../../generated/wrappers/option-group.js';

export type { ColorInputMarks };
/**
 * The box in which people set one color: a text value they can read, type and paste, a sample of it beside the text, a button that asks for a picker and — in the looks that float one — its label inside the box. It looks and measures like a text input. It has no label row, no help and no error text of its own: put it in a `<tanrei-field>`, which names it, describes it and marks it — or use `<tanrei-color-field>`, which is the two together.
 *
 * Events:
 * - `onChange` (`change`) — The person committed a changed value: focus left the input, Enter was pressed, or the browser's picker closed. `value` is already the new one. Composed and bubbling. Never fired when the product sets `value`.
 * - `onEntryError` (`entryerror`) — The person committed a text that is not empty and is not a color. `detail.text` is the text as typed, `detail.message` is `invalidText` — empty where the product gave none. Composed and bubbling.
 * - `onPickerRequest` (`pickerrequest`) — The person activated the picker button. `detail.value` is the value. Cancelable: `preventDefault()` keeps the input from presenting the browser's picker; the product then presents its own surface and sets `value`. Composed and bubbling.
 *
 * A building block: a product usually writes the component built from it instead — `ColorField`.
 */
export const ColorInput: typeof ColorInputWrapper = ColorInputWrapper;

export type { ComboboxMarks };
/**
 * Lets people find one value by typing: a box that looks and measures like a text input, with a list of options that narrows as they type and that they choose from, or, where the product allows it, a value of their own. The bare control: it has no label row and no message of its own.
 *
 * Children, by their `slot`:
 * - default — The options: `<tanrei-option>` elements, optionally in `<tanrei-option-group>` elements. They are read, not drawn in place. A `<slot>` element here stands for the elements assigned to it.
 * - `leading-icon` — A glyph at the start of the container that stands for the combobox whatever is chosen (a magnifier before a field that searches people). It takes the place of the chosen option's own glyph. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 *
 * Events:
 * - `onChange` (`change`) — The committed value changed by the person: an option was chosen, a custom text was committed, or the value was cleared; `value` is already the new one. `detail.value` and `detail.inputValue`. Composed and bubbling. Never fired when the product sets `value`, when the chosen option is chosen again, or while the person only types or moves through the list.
 * - `onToggle` (`toggle`) — The list was opened or closed by the person, or closed by having nothing left to show; `open` is already the new one. `detail.open`, and for a close `detail.reason`: `select`, `commit`, `escape`, `outside`, `press`, `tab`, `focus-out`, `anchor-hidden` or `empty`. After a choice it follows `change`. Composed and not bubbling, as the platform's own `toggle`: heard on the element, and on an element composed around it, and by no ancestor. Never fired when the product sets `open`.
 * - `onAction` (`action`) — The person pressed Enter with no option active and the text was committed; after any `change` it caused. Cancelable: unless it is cancelled, the form the combobox stands in is then asked to submit.
 *
 * A building block: a product usually writes the component built from it instead — `ComboboxField`.
 */
export const Combobox: typeof ComboboxWrapper = ComboboxWrapper;

export type { EmbeddedTextInputMarks };
/**
 * The typing alone, for a box that something else draws: the text, a placeholder, the caret and the selection — on one line, or (`multiline`) on lines that wrap, as tall as its lines between `min-rows` and `max-rows` and changing its height with a motion. **It draws no container, fill, edge, padding, label or message, and no focus indication**: whatever holds it — a Tanrei component built from it, or the product's own box — draws the box, shows the focus on the box (`:focus-within`), marks an error, pads the text, names the input (`label`, required: nothing else names it) and decides what its action is. A holder that shows no focus on its box fails WCAG 2.4.7. Where the box is a text field's box, use `<tanrei-text-input>` (or `<tanrei-text-field>`).
 *
 * Events:
 * - `onChange` (`change`) — The person committed a changed value: focus left the input, or `action` was emitted. Bubbles.
 * - `onAction` (`action`) — The person asked for the action of whatever holds the input, by Enter as `enter-key` says or by Ctrl+Enter or Command+Enter. `detail.value` is the value. Bubbles; cancelable — a cancelled one keeps a single-line input from submitting its form.
 * - `onRowsChange` (`rowschange`) — The number of lines the input shows is about to change, or it was first drawn: `detail.rows`, and `detail.scrolling` where the text has more lines and scrolls inside. Once per change, before the height moves. Bubbles.
 *
 * A building block: a product usually writes the component built from it instead — `ChatComposer`.
 */
export const EmbeddedTextInput: typeof EmbeddedTextInputWrapper = EmbeddedTextInputWrapper;

/**
 * Lets people choose files through the browser's own picker — from the product's Button and, where there is room, from a place files can also be dragged onto — says the limits in words before the choice, judges what was chosen against them, and hands over what passed and what was refused. **It keeps nothing, lists nothing and takes no part in a form** (FPK-7): whoever holds the files shows them — a `<tanrei-file-upload>` does, with a list and a form value.
 *
 * Children, by their `slot`:
 * - `trigger` — The product's own Button that opens the picker, with its own label, variant and size. Exactly one.
 * - `icon` — A glyph of the icon set in place of the upload glyph at the top of the drop area; decorative, ignored in the button layout. A glyph the icon set flags is mirrored in right-to-left; `data-mirror="auto | always | never"` on the element decides for one use.
 *
 * Events:
 * - `onSelect` (`select`) — Files were chosen or dropped and passed. Once per choice; `detail.files` is a `File[]`. Bubbles.
 * - `onReject` (`reject`) — Files of one choice or one drop were refused. Once, after `select` where both happen; `detail.files` is `{ file, reason }[]`, the reason `type`, `size` or `count`. Bubbles.
 *
 * A building block: a product usually writes one of the components built from it instead — `ChatComposer`, `FileUpload`.
 */
export const FilePicker: typeof FilePickerWrapper = FilePickerWrapper;

/**
 * The layer under every modal surface: it dims the window behind what it presents, makes everything there inert, moves focus in, keeps it there and gives it back, and asks to close on Escape, the platform's back or a press on the dim. The dialog, the modal sheets, the modal drawer, the image preview, the modal picker and the search's modal views are built from it; use it alone for a modal surface Tanrei does not have (a command palette, a takeover of the window).
 *
 * Children, by their `slot`:
 * - default — The content: the surface you present modally. The layer draws, styles and sizes nothing of it.
 *
 * Events:
 * - `onClose` (`close`) — The layer asks to be closed: `detail.reason` is `escape`, `back` or `scrim`. Set `open` to false. Only while `closedby` is not `none`.
 *
 * A building block: a product usually writes one of the components built from it instead — `BottomSheet`, `DateTimePicker`, `Dialog`, `ImagePreview`, `NavigationDrawer`, `Search`, `SideSheet`.
 */
export const ModalLayer: typeof ModalLayerWrapper = ModalLayerWrapper;

export type { NumberInputMarks };
/**
 * The box of a number: lets people enter a number as a number — typed in their locale's form or stepped by a key or a button, kept within limits, with its unit beside it — and draws no row around it. A `<tanrei-field>` frames it with a label, a requirement mark, help and an error, or the product names it with `label` where its visible label is elsewhere: the head of a table's column, a toolbar, the title of a row that also holds a slider. `<tanrei-number-field>` is the two as one element.
 *
 * Events:
 * - `onChange` (`change`) — A commit changed the value: focus left the input, Enter was pressed, a key stepped it, or a pressed stepper was released; `value` is already the new one. Composed and bubbling. Never fired when the product sets `value`.
 * - `onInput` (`input`) — The person changed the text, or a step changed the value. `detail.value` is the number the text reads as — not clamped, not rounded — or null while it reads as no value or as not a number. Composed and bubbling. Never fired when the product sets `value`.
 * - `onEntryError` (`entryerror`) — The person committed a text that is not a number. `detail.reason` is `invalid`, `detail.text` the input's `invalidText` (empty where none was given). Composed and bubbling.
 * - `onAction` (`action`) — The person pressed Enter; after any `change` it caused. Cancelable: unless it is cancelled, the form the number input stands in is then asked to submit.
 *
 * A building block: a product usually writes the component built from it instead — `NumberField`.
 */
export const NumberInput: typeof NumberInputWrapper = NumberInputWrapper;

export type { OneTimeCodeInputMarks };
/**
 * Takes a short code sent to the person — a sign-in or verification code — as one text value drawn in separate cells, so that its length and what is still missing can be seen, and the browser can fill it in one step.
 *
 * Events:
 * - `onInput` (`input`) — The person changed the value; the element's `value` is already the new one.
 * - `onComplete` (`complete`) — A change by the person left the value `length` characters long. After that change's input, once.
 * - `onChange` (`change`) — The person committed a changed value: focus left the field, or Enter was pressed.
 * - `onAction` (`action`) — The person pressed Enter. Cancel it to keep the enclosing form from being submitted.
 *
 * A building block: a product usually writes the component built from it instead — `OneTimeCodeField`.
 */
export const OneTimeCodeInput: typeof OneTimeCodeInputWrapper = OneTimeCodeInputWrapper;

export type { TextInputMarks };
/**
 * The box people type in, and everything typed in it — one line, or several that follow the text or are resized by hand, or a date or a time entered unit by unit in the locale's form — with optional icons, a prefix and a suffix, a picker button, and, in the two looks that have one, the label that floats inside the box. It has no label row, no help and no error text of its own: put it in a `<tanrei-field>`, which names it, describes it and marks it — or use `<tanrei-text-field>`, which is the two as one element. Bare, it is for a place whose label stands elsewhere: a filter in a toolbar, a cell of a table, a row with its label beside it; give it `label` there.
 *
 * Children, by their `slot`:
 * - `leading-icon` — An icon at the start of the field: a glyph name of the system's icon set, an `<svg>` or an `<img>`. A glyph the icon set flags as showing a direction (`arrow_forward`, `send`) is drawn mirrored in a right-to-left layout. `data-mirror="auto | always | never"` on the element decides for one use.
 * - `trailing-icon` — An icon at the end of the field, or the product's own icon-only Button. The clear button and a date or time field's picker button come after it. A glyph is mirrored in right-to-left as in `leading-icon`.
 * - `entries` — What was entered already — the product's own elements, or the chips of a component that holds the input (a chip field): laid out inside the box before the typing part, in lines that wrap (TXI-64). The text input gives them no role, no focus order and no key (TXI-66).
 *
 * Events:
 * - `onChange` (`change`) — The user committed a changed value: focus left the field (a date or time field's segments and picker button), or the action key was pressed in a single-line field.
 * - `onEntryError` (`entryerror`) — The user committed a date, time or date-time field that is half-filled (`invalid`) or whose value is not available (`unavailable`: before `min`, after `max` or listed in `disabledDates`), with the row's text as drawn.
 * - `onPickerRequest` (`pickerrequest`) — The user activated the picker button of a date, time or date-time field. The product presents the picker and sets `value` to the picked value.
 * - `onResizeEnd` (`resizeend`) — The person finished changing the size of a field resized by hand: a drag of its handle ended, or a key or an activation of the handle changed it (TXI-69). `detail.lines` and `detail.width`.
 * - `onRevealChange` (`revealchange`) — The person showed or hid the value of a password field with the reveal button (TXI-72); `revealed` is already the new one. `detail.revealed`. Never fired when the product sets `revealed`, or when the field hides the value itself.
 * - `onAction` (`action`) — The action key (Enter) was pressed in a single-line field. Cancelable: cancelling it keeps an enclosing form from being submitted.
 *
 * A building block: a product usually writes one of the components built from it instead — `ChipField`, `TextField`.
 */
export const TextInput: typeof TextInputWrapper = TextInputWrapper;
