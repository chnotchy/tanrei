// Keyboard models that are worth testing without a browser.

/**
 * A horizontal ARIA tablist (WAI-ARIA Authoring Practices): Left/Right move and wrap, Home/End jump. Up/Down are
 * taken too, because a tab row that wraps onto two lines reads as a grid to the eye.
 * @param {string} key  KeyboardEvent.key
 * @param {number} index the focused tab
 * @param {number} count how many tabs
 * @param {{ rtl?: boolean }} [options]
 * @returns {number | null} the tab to move to, or null when the key is not ours
 */
export function tabTarget(key, index, count, { rtl = false } = {}) {
  if (count <= 0) return null;
  const step = (by) => (index + by + count) % count;
  switch (key) {
    case 'ArrowRight':
      return step(rtl ? -1 : 1);
    case 'ArrowLeft':
      return step(rtl ? 1 : -1);
    case 'ArrowDown':
      return step(1);
    case 'ArrowUp':
      return step(-1);
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

/** Move one item of a list by one place; the list is returned unchanged when the move leaves it. */
export function moveItem(list, index, by) {
  const to = index + by;
  if (index < 0 || index >= list.length || to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}
