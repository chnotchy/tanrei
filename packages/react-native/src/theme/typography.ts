import { Platform, type TextStyle } from 'react-native';
import type { TanreiFontGeneric, TanreiFontStack, TanreiTypeEmphasis, TanreiTypeFamily, TanreiTypography } from '../generated/vocabulary';

/**
 * Lets an app map a token family + weight to the font name it actually loaded.
 * Needed when every weight is registered as its own family (for example `Inter_500Medium`
 * from `@expo-google-fonts/inter`). It is called with the FIRST NAMED family of the stack; the whole stack
 * is the third argument, for an app that loaded a later family instead. It is not called for a stack that asks
 * for the platform's own font first. Return `undefined` to use the platform default font.
 */
export type TanreiFontResolver = (family: string, weight: number, font: TanreiFontStack) => string | undefined;

type Weight = NonNullable<TextStyle['fontWeight']>;

/** React Native only accepts the hundreds 100…900, as strings. */
export function toFontWeight(weight: number): Weight {
  const hundreds = Math.min(9, Math.max(1, Math.round(weight / 100)));
  return `${hundreds}00` as Weight;
}

/**
 * The platform's own font of a generic class, as a React Native `fontFamily`. Sans-serif is the platform default
 * (`undefined`: San Francisco, Roboto). iOS names its serif and monospace designs `ui-serif` / `ui-monospace`;
 * Android (and everything else) has the built-in families `serif` / `monospace`.
 */
export function platformFontFamily(generic: TanreiFontGeneric): string | undefined {
  switch (generic) {
    case 'sans-serif':
      return undefined;
    case 'serif':
      return Platform.select({ ios: 'ui-serif', default: 'serif' });
    case 'monospace':
      return Platform.select({ ios: 'ui-monospace', default: 'monospace' });
  }
}

/**
 * A font stack of the tokens (`TanreiFontStack`, interpreted once in the token pipeline) → the ONE
 * `fontFamily` React Native can take: there is no fallback list here. A stack that asks for the platform's own font
 * first (`system`) gets the platform font of its class; otherwise the first named family, which the app must have
 * loaded (both native text stacks silently fall back to the system font when it has not — keeping the weight);
 * a stack without named families gets the platform font of its class.
 */
export function fontFamilyOf(font: TanreiFontStack, weight: number, resolveFont?: TanreiFontResolver): string | undefined {
  const family = font.system ? undefined : font.families[0];
  if (family === undefined) return platformFontFamily(font.generic);
  return resolveFont ? resolveFont(family, weight, font) : family;
}

/**
 * The family a type role belongs to, from its name: `display*` → display, `heading*` → heading,
 * `body*` → body; everything else — `label*`, `caption*`, `code*`, `eyebrow` — takes the `label` step. Roles are open
 * (a system may add `bodyCallout` or `captionSmall`), so the rule reads the name's first segment, not a list.
 *
 * The token build decides this and writes it as `TanreiTypography.family`, which `emphasize()` reads first; this is
 * the same rule for a hand-written style that has no `family`.
 */
export function typeFamilyOf(role: string): TanreiTypeFamily {
  if (role.startsWith('display')) return 'display';
  if (role.startsWith('heading')) return 'heading';
  if (role.startsWith('body')) return 'body';
  return 'label';
}

/**
 * The role's type style with the weight `emphasized` text adds: the token's weight plus the family's step
 * of `system.typescale.emphasis`. A pure helper: pass the role's token and the step of its family
 * (`emphasize(system.typescale.heading1, system.typescale.emphasis, 'heading1')`). Nothing else moves.
 * The family is the token's own (`token.family`, decided by the token build); `role` names it only for a style
 * without one (`typeFamilyOf`).
 */
export function emphasize(token: TanreiTypography, emphasis: TanreiTypeEmphasis, role: string): TanreiTypography {
  return { ...token, weight: token.weight + emphasis[token.family ?? typeFamilyOf(role)] };
}

/**
 * Typescale token (`system.typescale[role]`) → React Native `TextStyle`. The family is `fontFamilyOf(token.font)`, asked
 * for the token's weight — an emphasized token (`emphasize()`) asks for the heavier one, so a resolver that registers
 * one family per weight receives it. React Native takes weights in hundreds: the sum rounds to the nearest (`toFontWeight`).
 */
export function typescaleStyle(token: TanreiTypography, resolveFont?: TanreiFontResolver): TextStyle {
  return {
    fontFamily: fontFamilyOf(token.font, token.weight, resolveFont),
    fontSize: token.size,
    fontWeight: toFontWeight(token.weight),
    letterSpacing: token.tracking,
    lineHeight: token.lineHeight,
  };
}
