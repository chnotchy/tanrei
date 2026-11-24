// `process.env.NODE_ENV` is replaced by the product's bundler, which is the only one to load this module.
declare const process: { env: { NODE_ENV?: string } };

/**
 * `debug.ts` as a browser bundler takes it (the package's `browser` field maps one onto the other): the bare
 * expression, which the bundler replaces — with `false` in a production build, so that every path guarded by it is
 * left out. A browser bundler defines `process.env.NODE_ENV` (esbuild, webpack, Vite and Parcel each do by
 * themselves); a page without a bundler never loads this module.
 */
export const DEBUG: boolean = process.env.NODE_ENV !== 'production';
