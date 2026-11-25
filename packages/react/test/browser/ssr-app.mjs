// The page `ssr.test.mjs` renders on the server and hydrates in the browser: one module for both, so the two trees are
// the same. Plain `createElement`, so Node imports it as it is; the test bundles it for the browser with esbuild.
import { createElement as h, useState } from 'react';
import { Button, CopyButton, Switch, TextField } from '@tanrei/react';
import { Checkbox, CheckboxGroup, ChipField, Combobox, KeyboardShortcut, Option } from '@tanrei/react/all';

const cities = () => [h(Option, { key: 'tokyo', value: 'tokyo' }, 'Tokyo'), h(Option, { key: 'osaka', value: 'osaka' }, 'Osaka'), h(Option, { key: 'kyoto', value: 'kyoto' }, 'Kyoto')];
const letters = () => ['a', 'b'].map((value) => h(Checkbox, { key: value, value, label: value.toUpperCase() }));

export function App() {
  const [presses, setPresses] = useState(0);
  return h(
    'main',
    null,
    h(TextField, { id: 'name', label: presses ? `Name ${presses}` : 'Name', value: 'Ada', required: true, requiredText: 'required', maxLength: 40 }),
    h(Switch, { id: 'wifi', label: 'Wi-Fi', checked: true }),
    h(CopyButton, { id: 'copy', label: 'Copy', copiedLabel: 'Copied', failedLabel: 'Could not copy', text: 'npm i', iconOnly: false }),
    // Lists: written as attributes on the server, so the entries are drawn before the page is hydrated.
    h(ChipField, { id: 'chips', label: 'To', value: presses ? ['ada@example.com'] : ['ada@example.com', 'grace@example.com'] }),
    h(Combobox, { id: 'cities', label: 'Cities', selection: 'multiple', values: presses ? ['kyoto'] : ['tokyo', 'osaka'] }, cities()),
    h(KeyboardShortcut, { id: 'shortcut', keys: ['mod+k'] }),
    // A list no attribute carries: set by the client once it mounts.
    h(CheckboxGroup, { id: 'letters', label: 'Letters', value: presses ? ['a'] : ['b'] }, letters()),
    h(Button, { id: 'press', onClick: () => setPresses((n) => n + 1) }, 'Press'),
  );
}

/** What the test reads of each element, after hydration: the properties the server's attributes and the props gave. */
export const expected = (presses) => ({
  name: { label: presses ? `Name ${presses}` : 'Name', value: 'Ada', required: true, maxLength: 40 },
  wifi: { label: 'Wi-Fi', checked: true },
  copy: { label: 'Copy', iconOnly: false, text: 'npm i' },
  chips: { value: presses ? ['ada@example.com'] : ['ada@example.com', 'grace@example.com'] },
  cities: { values: presses ? ['kyoto'] : ['tokyo', 'osaka'] },
  shortcut: { keys: ['mod+k'] },
  letters: { value: presses ? ['a'] : ['b'] },
});
