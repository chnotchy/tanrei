// The lengths a component's measure figure draws: each dimension token it reads, with the anatomy part its path names,
// the length it is (the key after the part: `height`, `padding-inline-start`, `gap`, …), the size and the variant its
// path is for, and its value in pixels in the default system. A figure draws a line for each and labels it with the
// token, so the drawing and the tokens cannot disagree: the browser test measures the drawn box against `px`.
import { getSpec } from '../repo';
import { anatomyOf } from './anatomy';
import { below, componentTokens } from './groups';

export interface Measure {
  /** The token, dotted (`tanrei.comp.button.container.height.large`). */
  token: string;
  /** Its custom property (`--tanrei-comp-button-container-height-large`). */
  cssVar: string;
  /** The anatomy part its path names, or null where it names none (a length of the whole component). */
  part: string | null;
  /** What length it is: the key after the part, or the path's last key that is neither a size nor a variant. */
  kind: string;
  /** The value of the spec's `size` prop its path is for, or null where it is the same at every size. */
  size: string | null;
  /** The value of the spec's `variant` prop its path is for, or null. */
  variant: string | null;
  px: number;
}

const valuesOf = (name: string, prop: string): string[] => getSpec(name).props.find((p) => p.name === prop)?.values ?? [];

/** Every dimension token of a component; with `size` or `variant`, those for that value and those for every value. */
export function measuresOf(name: string, { size, variant }: { size?: string; variant?: string } = {}): Measure[] {
  const parts = new Set(anatomyOf(name).map((part) => part.id));
  const sizes = new Set(valuesOf(name, 'size'));
  const variants = new Set(valuesOf(name, 'variant'));
  return componentTokens(name)
    .filter((token) => token.type === 'dimension' && token.value?.unit === 'px')
    .map((token) => {
      const path = below(token, name);
      const tokenSize = path.find((key) => sizes.has(key)) ?? null;
      const tokenVariant = path.find((key) => variants.has(key)) ?? null;
      const rest = path.filter((key) => key !== tokenSize && key !== tokenVariant);
      const at = rest.findIndex((key) => parts.has(key));
      const part = at >= 0 ? rest[at] : null;
      const kind = (at >= 0 ? rest[at + 1] : undefined) ?? rest.at(-1) ?? '';
      return { token: token.name, cssVar: token.cssVar, part, kind, size: tokenSize, variant: tokenVariant, px: token.value.value as number };
    })
    .filter((measure) => (!size || measure.size === null || measure.size === size) && (!variant || measure.variant === null || measure.variant === variant));
}
