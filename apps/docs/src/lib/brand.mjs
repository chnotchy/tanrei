// What the site makes of the brand marks (design/brand/): the symbol inline in the header, and the icons and the
// social image the build renders. Every one is derived from a mark's file and the tokens, never drawn by hand, so a
// mark pulled again from Figma (`pnpm brand:pull`) reaches all of them with the next build.
//
// The marks' own files are one flat color each: the source in `currentColor`, the generated copies painted in a
// scheme's on-surface (`pnpm generate`, packages/tokens-build/src/emit/brand.js).
import sharp from 'sharp';

/** The raster icons a browser still asks for beside the SVG favicon: the ICO's sizes and the home-screen icon. */
export const ICO_SIZES = [16, 32, 48];
export const TOUCH_ICON_SIZE = 180;
/** The social image: the size the Open Graph protocol's consumers crop least (1.91:1). */
export const SOCIAL = { width: 1200, height: 630 };

/** The root element's attribute, and the mark's drawing without its comment. */
const parts = (svg) => {
  const root = svg.match(/<svg\b[^>]*>/)?.[0];
  if (!root) throw new Error('brand: not an SVG mark');
  const viewBox = root.match(/\sviewBox="([^"]*)"/)?.[1];
  if (!viewBox) throw new Error('brand: a mark without a viewBox');
  const [, , width, height] = viewBox.split(/[\s,]+/).map(Number);
  const body = svg.slice(svg.indexOf(root) + root.length, svg.lastIndexOf('</svg>')).replace(/<!--[\s\S]*?-->/g, '').trim();
  return { viewBox, width, height, body };
};

const attributes = (attrs) =>
  Object.entries(attrs)
    .filter(([, value]) => value !== undefined && value !== false)
    .map(([name, value]) => (value === true ? ` ${name}` : ` ${name}="${String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"`))
    .join('');

/**
 * The mark as an element of the page: its viewBox and shapes, the size it holds before any stylesheet arrives (`width`
 * and `height`, so nothing moves when one does), and the attributes given. Its shapes stay in `currentColor`.
 * @param {string} svg the mark's source
 * @param {{ width: number, height?: number } & Record<string, string | number | boolean | undefined>} attrs
 */
export function inlineMark(svg, { width, height, ...attrs }) {
  const mark = parts(svg);
  const h = height ?? Math.round((width * mark.height) / mark.width * 100) / 100;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${mark.viewBox}" width="${width}" height="${h}" fill="none"${attributes(attrs)}>${mark.body}</svg>`;
}

/**
 * A square icon: the mark's frame filling the square, on an opaque background — a home screen draws a transparent
 * icon on black, and a raster favicon cannot follow the reader's scheme as the SVG one does.
 * @param {string} svg the mark painted in the color it is drawn in
 */
export function iconSvg(svg, { size, background }) {
  const mark = parts(svg);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${background}"/><svg x="0" y="0" width="${size}" height="${size}" viewBox="${mark.viewBox}" preserveAspectRatio="xMidYMid meet">${mark.body}</svg></svg>`;
}

/**
 * The social image: the wordmark alone, centred, at `share` of the image's width, on the background — the name is
 * what is read in a shared link, so the wordmark, never with the symbol.
 * @param {string} svg the wordmark painted in the color it is drawn in
 */
export function socialSvg(svg, { background, share = 0.5, width = SOCIAL.width, height = SOCIAL.height }) {
  const mark = parts(svg);
  const w = Math.round(width * share);
  const h = Math.round((w * mark.height) / mark.width);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${background}"/><svg x="${Math.round((width - w) / 2)}" y="${Math.round((height - h) / 2)}" width="${w}" height="${h}" viewBox="${mark.viewBox}">${mark.body}</svg></svg>`;
}

/** An SVG drawn as a PNG of its own size. */
export const png = (svg) => sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();

/**
 * An ICO file holding each PNG as it is (an entry of the directory, then the images: the format every browser that
 * reads an ICO has read since PNG entries were allowed in it).
 * @param {{ size: number, data: Buffer }[]} images
 */
export function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // an icon
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // no palette
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map(({ data }) => data)]);
}

/** The square icon as an ICO of every size in `sizes`. */
export async function icoOf(svg, { background, sizes = ICO_SIZES }) {
  return ico(await Promise.all(sizes.map(async (size) => ({ size, data: await png(iconSvg(svg, { size, background })) }))));
}
