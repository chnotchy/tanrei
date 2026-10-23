// Is this font family available in THIS browser? The preview draws with real fonts and never pretends: when the
// family a stack puts first cannot be drawn here, the Studio says so next to the control. Nothing is ever fetched
// from another host — a family is available when the page registered it itself (the host's self-hosted @font-face
// files) or when it is installed on this device.
const SAMPLE = 'BESbswy mmwwll 0123';
const GENERICS = ['monospace', 'serif', 'sans-serif'];
const known = new Map<string, Promise<boolean>>();

const bare = (family: string) => family.trim().replace(/^["']|["']$/g, '');
const quoted = (family: string) => `"${bare(family).replace(/["\\]/g, '')}"`;

let canvas: CanvasRenderingContext2D | null | undefined;
function width(font: string): number {
  canvas ??= document.createElement('canvas').getContext('2d');
  if (!canvas) return Number.NaN;
  canvas.font = font;
  return canvas.measureText(SAMPLE).width;
}

async function detect(family: string): Promise<boolean> {
  const name = bare(family);
  if (!name) return false;
  // 1. A face this page registered under that name: load it (same origin). The faces `load` hands back ARE the
  //    answer — one of them loaded means the sample can be drawn. `document.fonts.check` is asked only when `load`
  //    gave nothing: right after a panel is drawn Chromium answers `false` for a family whose face has just loaded
  //    (seen with Roboto under m3-like: `load` → 1 face, `check` → false), and the Studio would accuse a font it draws.
  const declared = [...document.fonts].some((face) => bare(face.family).toLowerCase() === name.toLowerCase());
  if (declared) {
    try {
      const faces = await document.fonts.load(`16px ${quoted(name)}`, SAMPLE);
      if (faces.some((face) => face.status === 'loaded')) return true;
    } catch {}
    return document.fonts.check(`16px ${quoted(name)}`, SAMPLE);
  }
  // 2. Nobody declared it. `document.fonts.check` says "nothing to load" (true) for ANY such name, installed or
  //    not, so it cannot answer; drawing can: text set in `"Family", <generic>` measures like the generic alone
  //    exactly when the family is missing. Three generics, because a family may BE one of this device's defaults.
  return GENERICS.some((generic) => {
    const [alone, withFamily] = [width(`72px ${generic}`), width(`72px ${quoted(name)}, ${generic}`)];
    return !Number.isNaN(alone) && alone !== withFamily;
  });
}

/** Resolves to whether `family` can be drawn here. Cached per name for the life of the page. */
export function fontAvailable(family: string): Promise<boolean> {
  const key = bare(family).toLowerCase();
  if (!known.has(key)) known.set(key, detect(family).catch(() => true)); // when we cannot tell, we do not accuse
  return known.get(key)!;
}
