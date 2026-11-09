// The layer schema, compiled to a standalone validator at build time (../vite-plugin.js): Ajv's shape.
declare module 'virtual:tanrei-studio/validate-layer' {
  const validate: ((data: unknown) => boolean) & { errors?: { instancePath: string; message?: string }[] | null };
  export default validate;
}
// material-color-utilities' Hct and TonalPalette from their own modules, not the package's entry (../vite-plugin.js).
declare module 'virtual:tanrei-studio/hct' {
  export { Hct, TonalPalette } from '@material/material-color-utilities';
}
