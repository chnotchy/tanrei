// Where a mark's ink is in its frame, measured from the mark itself (design/brand/), for the brand page's drawings of
// clear space and minimum size: a mark pulled again from Figma is measured again by the next build, never written
// down. Measured by drawing the mark and trimming what is empty around it.
import sharp from 'sharp';

/** The frame's size from the mark's viewBox. */
export function frameOf(svg) {
  const viewBox = svg.match(/<svg\b[^>]*\sviewBox="([^"]*)"/)?.[1];
  if (!viewBox) throw new Error('brand: a mark without a viewBox');
  const [, , width, height] = viewBox.split(/[\s,]+/).map(Number);
  return { width, height };
}

/**
 * The box of the ink in frame units — `{ x, y, width, height }` — of the whole mark, or of the part of it between
 * `from` and `to` (fractions of the frame's width): the wordmark's first letter, a capital, gives its cap height.
 * @param {string} svg the mark (its shapes in `currentColor`)
 */
export async function inkBox(svg, { from = 0, to = 1, scale = 4 } = {}) {
  const frame = frameOf(svg);
  const drawn = svg.replaceAll('currentColor', '#000');
  const width = Math.round(frame.width * scale);
  const height = Math.round(frame.height * scale);
  const left = Math.round(width * from);
  const right = Math.round(width * to);
  const { data, info } = await sharp(Buffer.from(drawn), { density: 72 * scale })
    .resize(width, height)
    .extract({ left, top: 0, width: right - left, height })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * info.channels + 3] > 127) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error('brand: the mark has no ink there');
  const unit = (n) => Math.round((n / scale) * 100) / 100;
  return { x: unit(left + x0), y: unit(y0), width: unit(x1 - x0 + 1), height: unit(y1 - y0 + 1) };
}
