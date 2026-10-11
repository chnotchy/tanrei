import type { TanreiScheme } from '../generated/vocabulary';

export type TanreiThemePreference = 'system' | 'light' | 'dark';
export type TanreiContrast = 'standard' | 'medium' | 'high';

const SCHEMES = {
  light: { standard: 'light', medium: 'lightMedium', high: 'lightHigh' },
  dark: { standard: 'dark', medium: 'darkMedium', high: 'darkHigh' },
} as const satisfies Record<'light' | 'dark', Record<TanreiContrast, TanreiScheme>>;

/** Maps brightness + contrast to the key of a system's `colors`. */
export function resolveScheme(brightness: 'light' | 'dark', contrast: TanreiContrast = 'standard'): TanreiScheme {
  return SCHEMES[brightness][contrast];
}
