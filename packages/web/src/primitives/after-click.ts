/**
 * Runs `fire` once the click being dispatched now has finished its way through the page — the order and timing of a
 * native checkbox's `change` after its `click` (CHP-11, BTN-14). A click's last stop is the window, so `fire` runs from a
 * listener added there for this click; when a listener stops the click on its way, `fire` still runs, in the next task.
 * Call it from the component's own click handler, after switching its state, so a `click` listener already sees the new
 * value.
 */
export function afterClick(fire: () => void) {
  let pending = true;
  const run = () => {
    if (!pending) return;
    pending = false;
    window.removeEventListener('click', run);
    clearTimeout(timer);
    fire();
  };
  window.addEventListener('click', run, { once: true });
  const timer = setTimeout(run);
}
