---
'@tanrei/web': patch
'@tanrei/react': patch
---

React: a handler for one of the platform's own events no longer replaces the component's own. A wrapper sets a prop
on the element as a property whenever the element has a member of that name, private ones included, and 36 elements
had internal handlers named like React's event props (`onClick`, `onInput`, `onKeyDown`, `onBlur`, `onFocus`, …). So
`<Button toggle onClick={…}>` ran the product's handler and stopped toggling and firing `change`; a `TextInput` given
`onInput` stopped taking its value, given `onKeyDown` stopped acting on Enter, and given `onBlur` stopped committing;
checkboxes, switches, radio buttons, selects, comboboxes, number, color and
one-time-code inputs, chips, cards and others broke the same way for the props that matched. Those handlers are now
private to the element, and every such prop is React's own handler, as the README says, while the component keeps
working. Nothing public changed.
