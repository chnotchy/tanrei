// The layer schema, compiled to a standalone validator at build time (../vite-plugin.js): Ajv's shape.
declare module 'virtual:tanrei-studio/validate-layer' {
  const validate: ((data: unknown) => boolean) & { errors?: { instancePath: string; message?: string }[] | null };
  export default validate;
}
// material-color-utilities' Hct and TonalPalette from their own modules, not the package's entry (../vite-plugin.js).
declare module 'virtual:tanrei-studio/hct' {
  export { Hct, TonalPalette } from '@material/material-color-utilities';
}
// The shipped layers whole, for the page sheet's worker (../vite-plugin.js): the default system's chain, root first,
// bundled with it, and every other one by id, a module of its own.
declare module 'virtual:tanrei-studio/sheet-layers' {
  type Layer = { id: string; extends?: string; [key: string]: unknown };
  export const defaultChain: Layer[];
  export const loaders: Record<string, () => Promise<Layer>>;
}
