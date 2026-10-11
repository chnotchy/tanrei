// Picture files for the tests, made here: real PNGs (written with the platform's compression), and the first bytes of
// the other kinds — enough of a header for a reader of headers. And a stand-in for a site's image step, which a real
// site connects to its own image library: it reads a PNG's pixels, scales them to the side asked for, puts a ground
// under them when told, and writes a PNG anew.
import zlib from 'node:zlib';
import { pictures } from './module.mjs';

const chunk = (name, body) => {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(name, 4, 'latin1');
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(zlib.crc32(Buffer.concat([head.subarray(4), body])), 0);
  return Buffer.concat([head, body, sum]);
};

/** A PNG of `width` by `height`, 8 bits of red, green, blue and alpha; `paint(x, y)` gives a pixel's four values. */
export function png(width, height, paint = () => [40, 90, 200, 255]) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const lines = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) lines.set(paint(x, y), y * (width * 4 + 1) + 1 + x * 4);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(lines)), chunk('IEND', Buffer.alloc(0))]);
}

/** A PNG's signature and header claiming a size, with nothing behind it. */
export function pngClaiming(width, height) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IEND', Buffer.alloc(0))]);
}

export function jpegHeader(width, height) {
  const frame = Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, height >> 8, height & 0xff, width >> 8, width & 0xff, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01]);
  return Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]), Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0', 'latin1'), frame, Buffer.alloc(16)]);
}

export function gifHeader(width, height) {
  const bytes = Buffer.alloc(32);
  bytes.write('GIF89a', 0, 'latin1');
  bytes.writeUInt16LE(width, 6);
  bytes.writeUInt16LE(height, 8);
  return bytes;
}

export function webpHeader(width, height) {
  const bytes = Buffer.alloc(40);
  bytes.write('RIFF', 0, 'latin1');
  bytes.writeUInt32LE(32, 4);
  bytes.write('WEBPVP8X', 8, 'latin1');
  bytes.writeUInt32LE(10, 16);
  bytes.writeUIntLE(width - 1, 24, 3);
  bytes.writeUIntLE(height - 1, 27, 3);
  return bytes;
}

export function avifHeader(width, height) {
  const bytes = Buffer.alloc(64);
  bytes.writeUInt32BE(24, 0);
  bytes.write('ftypavif', 4, 'latin1');
  bytes.write('avifmif1', 16, 'latin1');
  bytes.write('ispe', 32, 'latin1');
  bytes.writeUInt32BE(width, 40);
  bytes.writeUInt32BE(height, 44);
  return bytes;
}

/** An icon file holding `inside`, each `{ side, bytes }`; a side of 256 is written as 0, as the format does. */
export function ico(inside) {
  const directory = Buffer.alloc(6 + inside.length * 16);
  directory.writeUInt16LE(1, 2);
  directory.writeUInt16LE(inside.length, 4);
  let offset = directory.length;
  inside.forEach(({ side, bytes }, index) => {
    const at = 6 + index * 16;
    directory[at] = side === 256 ? 0 : side;
    directory[at + 1] = side === 256 ? 0 : side;
    directory.writeUInt16LE(1, at + 4);
    directory.writeUInt16LE(32, at + 6);
    directory.writeUInt32LE(bytes.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += bytes.length;
  });
  return Buffer.concat([directory, ...inside.map((entry) => entry.bytes)]);
}

export const svg = Buffer.from('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><script>alert(1)</script><rect width="32" height="32"/></svg>');

/**
 * A stand-in for a site's image step. It keeps a list of what it was asked (`calls`). A PNG is decoded, scaled to
 * `info.size` where one is asked for, laid over `info.ground` where one is given, and encoded anew; anything else is
 * answered with a plain PNG of the size the file's header declared (a real step would decode it).
 */
export function imageStep() {
  const calls = [];
  const step = (bytes, info) => {
    calls.push({ bytes, info: { ...info } });
    const decoded = info.type === 'image/png' ? pictures.readPngPixels(bytes) : null;
    const width = info.size ?? info.width;
    const height = info.size ?? info.height;
    const ground = info.ground ? [1, 3, 5].map((at) => Number.parseInt(info.ground.slice(at, at + 2), 16)) : null;
    return png(width, height, (x, y) => {
      let pixel = [128, 128, 128, 255];
      if (decoded) {
        const at = (Math.floor((y * decoded.height) / height) * decoded.width + Math.floor((x * decoded.width) / width)) * 4;
        pixel = [...decoded.rgba.subarray(at, at + 4)];
      }
      if (!ground) return pixel;
      const alpha = pixel[3] / 255;
      return [0, 1, 2].map((index) => Math.round(pixel[index] * alpha + ground[index] * (1 - alpha))).concat(255);
    });
  };
  step.calls = calls;
  return step;
}
