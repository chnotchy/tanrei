// The page `ssr.test.mjs` renders on the server and hydrates in the browser: one module for both, so the two trees are
// the same. Plain `createElement`, so Node imports it as it is; the test bundles it for the browser with esbuild.
import { createElement as h, useState } from 'react';
import { Button, CopyButton, Switch, TextField } from '@tanrei/react';

export function App() {
  const [presses, setPresses] = useState(0);
  return h(
    'main',
    null,
    h(TextField, { id: 'name', label: presses ? `Name ${presses}` : 'Name', value: 'Ada', required: true, requiredText: 'required', maxLength: 40 }),
    h(Switch, { id: 'wifi', label: 'Wi-Fi', checked: true }),
    h(CopyButton, { id: 'copy', label: 'Copy', copiedLabel: 'Copied', failedLabel: 'Could not copy', text: 'npm i', iconOnly: false }),
    h(Button, { id: 'press', onClick: () => setPresses((n) => n + 1) }, 'Press'),
  );
}

/** What the test reads of each element, after hydration: the properties the server's attributes and the props gave. */
export const expected = (presses) => ({
  name: { label: presses ? `Name ${presses}` : 'Name', value: 'Ada', required: true, maxLength: 40 },
  wifi: { label: 'Wi-Fi', checked: true },
  copy: { label: 'Copy', iconOnly: false, text: 'npm i' },
});
