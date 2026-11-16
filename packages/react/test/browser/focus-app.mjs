// The page `focus.test.mjs` drives, rendered by the client or on the server and hydrated (`window.start`): one module
// for both, so the two trees are the same. Plain `createElement`, so Node imports it as it is; the test bundles it for
// the browser with esbuild. `window.show(name)` mounts one control (each `key` a new mount) and nothing else of the set.
import { createElement as h, useEffect, useState } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { Button, Checkbox, Option, Rating, Select, TextField, TextInput } from '@tanrei/react/all';

/** Each control a product may give `autoFocus`: a shadow root that delegates focus, a `focus()` of its own, a composed element. */
export const CONTROLS = {
  'text-input': () => h(TextInput, { id: 'subject', label: 'Name', autoFocus: true }),
  button: () => h(Button, { id: 'subject', autoFocus: true }, 'Send'),
  checkbox: () => h(Checkbox, { id: 'subject', label: 'Agree', autoFocus: true }),
  select: () => h(Select, { id: 'subject', label: 'Country', autoFocus: true }, h(Option, { value: 'ca' }, 'Canada')),
  rating: () => h(Rating, { id: 'subject', label: 'Rating', autoFocus: true }),
  'text-field': () => h(TextField, { id: 'subject', label: 'Email', autoFocus: true }),
  // Not `autoFocus`: the product's ref focuses the element as soon as it is attached, before its first update.
  'ref-focus': () => h(TextInput, { id: 'subject', label: 'Name', ref: (element) => element?.focus() }),
};

export function App({ initial = null }) {
  const [shown, setShown] = useState(initial);
  if (typeof window !== 'undefined') window.show = (name) => setShown(name === null ? null : { name, key: Math.random() });
  // Passive, so after every layout effect of the first commit: the controls' own focus has been asked for by then.
  useEffect(() => {
    window.committed = true;
  }, []);
  return h(
    'main',
    null,
    h('input', { id: 'outside', 'aria-label': 'Outside' }),
    shown && h('div', { key: shown.key }, CONTROLS[shown.name]()),
  );
}

if (typeof window !== 'undefined') {
  window.start = () => {
    const root = document.getElementById('root');
    const hydrate = root.dataset.hydrate;
    if (hydrate) hydrateRoot(root, h(App, { initial: { name: hydrate, key: 'server' } }));
    else createRoot(root).render(h(App));
  };
}
