// A scheme is theme × contrast. Rule arguments may vary by scheme through a compact context map:
//   [10, 6, 0]                          → standard / medium / high (the last value repeats)
//   { light: [10, 6, 0], dark: [93] }   → per theme, each an array as above
//   10                                  → the same everywhere
export const SCHEMES = ['light', 'light-medium', 'light-high', 'dark', 'dark-medium', 'dark-high'];

const CONTRAST_INDEX = { standard: 0, medium: 1, high: 2 };

export function parseScheme(scheme) {
  const [theme, contrast = 'standard'] = scheme.split('-');
  return { theme, contrast };
}

export function pick(list, contrast) {
  return list[Math.min(CONTRAST_INDEX[contrast], list.length - 1)];
}

/** Resolve a context map (or a plain value) for one scheme. */
export function inContext(value, scheme) {
  const { theme, contrast } = parseScheme(scheme);
  let v = value;
  if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
    if (!(theme in v)) throw new Error(`context map has no "${theme}" entry: ${JSON.stringify(value)}`);
    v = v[theme];
  }
  return Array.isArray(v) ? pick(v, contrast) : v;
}
