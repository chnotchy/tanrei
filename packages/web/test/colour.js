// A computed colour, in whatever space the engine serializes it, as channels of one space: sRGB.
//
// An engine draws a colour transition in the space it interpolates in, and serializes the frames between in it: WebKit
// fades between two colours of a system written in `oklch()` as `oklab()` frames, then rests on the end value as
// `rgb()`. Compared channel by channel as they are written (L, a, b against r, g, b), the last frame of such a fade is a
// jump across the whole range. So every form is turned into sRGB first (CSS Color 4's conversions, D65; `lab()` and
// `lch()` are D50 and are adapted with Bradford), and then compared.
//
// It is plain JavaScript, with no imports, so that the Node tests (test/colour.test.mjs) load it as Playwright does.

/** sRGB's transfer function, for a channel of 0–1 (the sign kept, as CSS Color 4 extends it beyond the range). */
const encode = (linear) => {
  const magnitude = Math.abs(linear);
  return Math.sign(linear) * (magnitude <= 0.0031308 ? 12.92 * magnitude : 1.055 * magnitude ** (1 / 2.4) - 0.055);
};
/** Its inverse (display-p3 has the same one). */
const decode = (encoded) => {
  const magnitude = Math.abs(encoded);
  return Math.sign(encoded) * (magnitude <= 0.04045 ? magnitude / 12.92 : ((magnitude + 0.055) / 1.055) ** 2.4);
};
/** A 3 × 3 matrix times a vector. */
const times = (m, [x, y, z]) => [m[0] * x + m[1] * y + m[2] * z, m[3] * x + m[4] * y + m[5] * z, m[6] * x + m[7] * y + m[8] * z];

// CSS Color 4, section 18 (sample code for colour conversions).
const XYZ_D65_TO_LINEAR_SRGB = [
  3.2409699419045226, -1.537383177570094, -0.4986107602930034, -0.9692436362808796, 1.8759675015077202, 0.04155505740717559, 0.05563007969699366,
  -0.20397695888897652, 1.0569715142428786,
];
const LINEAR_P3_TO_XYZ_D65 = [
  0.4865709486482162, 0.26566769316909306, 0.1982172852343625, 0.2289745640697488, 0.6917385218365064, 0.079286914093745, 0, 0.04511338185890264,
  1.043944368900976,
];
const D50_TO_D65 = [
  0.955473421488075, -0.02309845494876471, 0.06325924320057072, -0.0283697093338637, 1.0099953980813041, 0.021041441191917323, 0.012314014864481998,
  -0.020507649298898964, 1.330365926242124,
];
const OKLAB_TO_LMS = [1, 0.3963377773761749, 0.2158037573099136, 1, -0.1055613458156586, -0.0638541728258133, 1, -0.0894841775298119, -1.2914855480194092];
const LMS_TO_LINEAR_SRGB = [
  4.076741636075958, -3.307711539258063, 0.2309699031821043, -1.2684379732850315, 2.609757349287688, -0.341319376002657, -0.0041960761386756,
  -0.7034186179359363, 1.7076146940746117,
];
const D50_WHITE = [0.3457 / 0.3585, 1, (1 - 0.3457 - 0.3585) / 0.3585];

/** CIE Lab (D50) to linear sRGB. */
function labToLinear([l, a, b]) {
  const k = 24389 / 27;
  const e = 216 / 24389;
  const f1 = (l + 16) / 116;
  const f0 = a / 500 + f1;
  const f2 = f1 - b / 200;
  const xyz = [f0 ** 3 > e ? f0 ** 3 : (116 * f0 - 16) / k, l > k * e ? ((l + 16) / 116) ** 3 : l / k, f2 ** 3 > e ? f2 ** 3 : (116 * f2 - 16) / k].map(
    (value, i) => value * D50_WHITE[i],
  );
  return times(XYZ_D65_TO_LINEAR_SRGB, times(D50_TO_D65, xyz));
}

/** Oklab to linear sRGB. */
const oklabToLinear = (lab) => times(LMS_TO_LINEAR_SRGB, times(OKLAB_TO_LMS, lab).map((value) => value ** 3));

/** A hue (an angle in degrees, or `none`) and a chroma as the two opposing axes. */
const axes = (chroma, hue) => [chroma * Math.cos((hue * Math.PI) / 180), chroma * Math.sin((hue * Math.PI) / 180)];

/**
 * One channel as written: a number, a percentage (`hundred` is what 100 % stands for in that place), an angle in
 * degrees, or `none` (0). NaN where it is none of those.
 */
function channel(text, hundred) {
  if (text === 'none') return 0;
  if (text.endsWith('%')) return (Number.parseFloat(text) / 100) * hundred;
  if (text.endsWith('deg')) return Number.parseFloat(text);
  return Number(text);
}

/**
 * A computed colour as sRGB channels and its alpha, `[r, g, b, a]`, each 0–1 (a colour outside sRGB's gamut is not
 * clipped: a channel may stand beyond the range). Read: `rgb()` / `rgba()`, `color(srgb | srgb-linear | display-p3 …)`,
 * `lab()`, `lch()`, `oklab()`, `oklch()`, and `transparent`. Any other form (a keyword, another `color()` space) is
 * null: it is not read.
 *
 * @param {string} value
 * @returns {number[] | null}
 */
export function srgb(value) {
  const text = value.trim();
  if (text === 'transparent') return [0, 0, 0, 0];
  const form = text.match(/^(rgba?|lab|lch|oklab|oklch|color)\(([^)]+)\)$/);
  if (!form) return null;
  const [, written, body] = form;
  const parts = body.split(/[\s,/]+/).filter(Boolean);
  let name = written;
  if (name === 'color') {
    name = parts.shift();
    if (!['srgb', 'srgb-linear', 'display-p3'].includes(name)) return null;
  }
  if (parts.length < 3 || parts.length > 4) return null;
  // What 100 % stands for in each channel (CSS Color 4: the reference ranges), and the alpha.
  const hundreds = { rgb: [255, 255, 255], rgba: [255, 255, 255], lab: [100, 125, 125], lch: [100, 150, 1], oklab: [1, 0.4, 0.4], oklch: [1, 0.4, 1] }[name] ?? [1, 1, 1];
  const c = parts.slice(0, 3).map((part, i) => channel(part, hundreds[i]));
  const alpha = parts[3] === undefined ? 1 : channel(parts[3], 1);
  if ([...c, alpha].some(Number.isNaN)) return null;
  let rgb;
  if (name === 'rgb' || name === 'rgba') rgb = c.map((value) => value / 255);
  else if (name === 'srgb') rgb = c;
  else if (name === 'srgb-linear') rgb = c.map(encode);
  else if (name === 'display-p3') rgb = times(XYZ_D65_TO_LINEAR_SRGB, times(LINEAR_P3_TO_XYZ_D65, c.map(decode))).map(encode);
  else if (name === 'lab') rgb = labToLinear(c).map(encode);
  else if (name === 'lch') rgb = labToLinear([c[0], ...axes(c[1], c[2])]).map(encode);
  else if (name === 'oklab') rgb = oklabToLinear(c).map(encode);
  else rgb = oklabToLinear([c[0], ...axes(c[1], c[2])]).map(encode);
  return [...rgb, alpha];
}

/**
 * A computed colour as premultiplied sRGB channels — r·a, g·a, b·a in 0–1, and a — as a colour transition is
 * interpolated (a fade to `transparent`, whose channels are 0, is then continuous), or null for a form `srgb()` does
 * not read.
 *
 * @param {string} value
 * @returns {number[] | null}
 */
export function premultiplied(value) {
  const colour = srgb(value);
  if (!colour) return null;
  const alpha = colour[3];
  return [...colour.slice(0, 3).map((value) => value * alpha), alpha];
}
