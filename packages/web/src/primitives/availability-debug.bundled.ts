import { queueRead } from './availability-read.js';

// `process.env.NODE_ENV` is replaced by the product's bundler, which is the only one to load this module.
declare const process: { env: { NODE_ENV?: string } };

/**
 * `availability-debug.ts` as a browser bundler takes it (the package's `browser` field maps one onto the other): the
 * bare expression, which the bundler replaces — so that in a production build `queueRead` is not used, and the reading
 * (availability-read.ts) is left out with everything only it uses.
 */
export const availabilityRead: typeof queueRead | undefined = process.env.NODE_ENV !== 'production' ? queueRead : undefined;
