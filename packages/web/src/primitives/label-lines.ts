/**
 * The lines a copy of a floating label is laid out in, and the width of the widest, in the copy's own (untransformed)
 * pixels (TXF-13, SEL-15: a label that does not fit on one line wraps, and the field gives its lines their room). Each
 * line is the run of text fragments that share a vertical band; a copy that is not laid out has one line, and says so
 * (`laidOut`: no box to count them in, so the count is no measure).
 *
 * The copy is an element the component never draws, laid out as the label is in one of its two positions (resting in
 * the value's line, or floated): the component counts both, and writes the counts where its styles read them.
 */
export function labelLines(copy: HTMLElement | null): { count: number; widest: number; laidOut: boolean } {
  if (!copy) return { count: 1, widest: 0, laidOut: true };
  const range = document.createRange();
  range.selectNodeContents(copy);
  const lines: { top: number; bottom: number; left: number; right: number }[] = [];
  const rects = Array.from(range.getClientRects())
    .filter((rect) => rect.width > 0 && rect.height > 0)
    .sort((a, b) => a.top - b.top);
  for (const rect of rects) {
    const middle = (rect.top + rect.bottom) / 2;
    const line = lines.find((l) => middle >= l.top && middle <= l.bottom);
    if (line) {
      line.left = Math.min(line.left, rect.left);
      line.right = Math.max(line.right, rect.right);
    } else lines.push({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right });
  }
  // The copy's box (one: it is positioned, so a block), which a copy that is not rendered (itself or an ancestor
  // `display: none`) does not have: its lines are then laid out nowhere, and say nothing (`laidOut`). Read as the copy's
  // rects, the one read that also says whether there is a box: a rendered copy costs no read more.
  const [box] = copy.getClientRects();
  // An ancestor may be scaled (a dialog opening): the widths are wanted in the copy's own pixels.
  const own = Number.parseFloat(getComputedStyle(copy).width);
  const scale = box && box.width > 0 && own > 0 ? box.width / own : 1;
  return { count: Math.max(1, lines.length), widest: Math.max(0, ...lines.map((l) => (l.right - l.left) / scale)), laidOut: !!box };
}
