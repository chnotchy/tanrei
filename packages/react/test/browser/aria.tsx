// The page `aria.test.mjs` drives: a wrapper given `aria-*` props a React product writes, set and then taken away
// (`undefined`), the way a component re-renders. Bundled by the test with esbuild.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '@tanrei/react';

declare global {
  interface Window {
    setAria: (on: boolean) => void;
  }
}

function App() {
  const [on, setOn] = useState(true);
  window.setAria = setOn;
  return (
    <>
      <p id="hint">Opens the inbox</p>
      <Button id="inbox" aria-label={on ? 'Inbox' : undefined} aria-describedby={on ? 'hint' : undefined} aria-current={on ? 'page' : undefined}>
        Mail
      </Button>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
