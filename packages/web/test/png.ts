// Reads the pixels of a screenshot, for tests that must see what was painted rather than what layout says (a line
// snapped to the device pixel grid, DIV-8). Playwright's screenshots are 8-bit, non-interlaced RGB or RGBA PNGs; that is
// all this decodes.
import zlib from 'node:zlib';

export interface Pixels {
  width: number;
  height: number;
  /** RGBA, row by row. */
  data: Uint8Array;
  /** The pixel at (x, y) as `rgb(r, g, b)` — the form `getComputedStyle` gives an opaque color. */
  at(x: number, y: number): string;
}

export function decodePng(png: Buffer): Pixels {
  if (png.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let offset = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  const idat: Buffer[] = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const body = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const [depth, color, , , interlace] = [body[8], body[9], body[10], body[11], body[12]];
      if (depth !== 8 || interlace !== 0 || (color !== 2 && color !== 6)) throw new Error(`unsupported PNG: depth ${depth}, color type ${color}, interlace ${interlace}`);
      channels = color === 6 ? 4 : 3;
    } else if (type === 'IDAT') idat.push(body);
    else if (type === 'IEND') break;
    offset += 12 + length;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = new Uint8Array(width * height * 4);
  let previous = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const row = new Uint8Array(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? row[i - channels] : 0;
      const b = previous[i];
      const c = i >= channels ? previous[i - channels] : 0;
      const predictor = [0, a, b, (a + b) >> 1, paeth(a, b, c)][filter];
      if (predictor === undefined) throw new Error(`unknown PNG filter ${filter}`);
      row[i] = (line[i] + predictor) & 0xff;
    }
    for (let x = 0; x < width; x++) {
      for (let k = 0; k < 3; k++) out[(y * width + x) * 4 + k] = row[x * channels + k];
      out[(y * width + x) * 4 + 3] = channels === 4 ? row[x * channels + 3] : 255;
    }
    previous = row;
  }
  return {
    width,
    height,
    data: out,
    at(x, y) {
      const i = (y * width + x) * 4;
      return `rgb(${out[i]}, ${out[i + 1]}, ${out[i + 2]})`;
    },
  };
}

function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const [pa, pb, pc] = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/**
 * The color a CSS color is painted as over the page's surface, read from a screenshot: a translucent token (a divider's
 * `outline-variant` is black at 8 %) is compared with pixels as the engine composites it, not as its value is written.
 */
export async function paintedColor(page: import('@playwright/test').Page, color: string, background = 'var(--tanrei-sys-color-surface)'): Promise<string> {
  const probe = page.locator('#tanrei-painted-probe');
  await page.evaluate(([c, b]) => {
    document.getElementById('tanrei-painted-probe')?.remove();
    document.body.insertAdjacentHTML('beforeend', `<div id="tanrei-painted-probe" style="position:fixed;inset-block-start:0;inset-inline-start:0;inline-size:8px;block-size:8px;background:${b}"><div style="inline-size:100%;block-size:100%;background:${c}"></div></div>`);
  }, [color, background] as const);
  const shot = decodePng(await probe.screenshot());
  await page.evaluate(() => document.getElementById('tanrei-painted-probe')?.remove());
  return shot.at(Math.floor(shot.width / 2), Math.floor(shot.height / 2));
}
