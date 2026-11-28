import { queueRead } from './availability-read.js';
import { DEBUG } from './debug.js';

/**
 * How AvailabilityController asks for its host to be read (availability-read.ts): only in a debug build, which alone
 * reads, records and reports (AVL-3). This module is the one a page loads without a bundler (and Node's), where `DEBUG`
 * is a value at run time. The package's `browser` field maps it onto `availability-debug.bundled.ts`, which decides by
 * the bare `process.env.NODE_ENV`: a production bundle replaces it, uses nothing of the reading, and leaves all of it
 * out — which a guard on the constant of another module cannot do (IMPLEMENTATION.md, "Debug builds").
 */
export const availabilityRead: typeof queueRead | undefined = DEBUG ? queueRead : undefined;
