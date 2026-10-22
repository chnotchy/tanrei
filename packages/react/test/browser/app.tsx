// The page `props.test.mjs` drives: wrappers given the props a React product writes for the platform's own events
// (`onClick`, `onInput`, `onKeyDown`, `onBlur`) next to the props of the element's own events (`onChange`). Every
// handler writes what it saw into `window.calls`, which the test reads. Bundled by the test with esbuild.
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '@tanrei/react';
import { TextInput } from '@tanrei/react/advanced';

declare global {
  interface Window {
    calls: string[];
  }
}
window.calls = [];
const log = (call: string) => window.calls.push(call);

function App() {
  const [value, setValue] = useState('');
  return (
    <>
      <Button id="bold" toggle onClick={() => log('click')} onChange={(event) => log(`change:${event.detail.selected}`)}>
        Bold
      </Button>
      <TextInput
        id="name"
        label="Name"
        value={value}
        onInput={(event) => {
          const next = event.currentTarget.value;
          log(`input:${next}`);
          setValue(next);
        }}
        onKeyDown={(event) => log(`keydown:${event.key}`)}
        onBlur={() => log('blur')}
        onChange={(event) => log(`commit:${event.currentTarget.value}`)}
        onAction={(event) => log(`action:${event.detail.value}`)}
      />
      <output id="echo">{value}</output>
      <input id="after" aria-label="After" />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
