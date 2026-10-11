// TypeScript: the JavaScript grammar with types switched on — and, for tsx, markup.
import { script } from './javascript.js';

export const typescript = script(true, false);
export const tsx = script(true, true);
