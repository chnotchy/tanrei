/**
 * What a row that shows and hides something under it shares, wherever it stands: a navigation drawer's group
 * (NVD-45) and an accordion's header (ACC-11) answer the same two arrow keys in the same way.
 *
 * Whether `key` is the arrow toward the end of the line (Right in a left-to-right layout) or toward its start, in the
 * layout direction `element` inherits — read from the cascade at the moment of the key, never cached.
 * The arrow toward the end opens a closed row; the arrow toward the start closes an open one. Any other key is null.
 */
export function lineArrow(key: string, element: Element): 'end' | 'start' | null {
  if (key !== 'ArrowRight' && key !== 'ArrowLeft') return null;
  const rtl = getComputedStyle(element).direction === 'rtl';
  return (key === 'ArrowRight') !== rtl ? 'end' : 'start';
}
