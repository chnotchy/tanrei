// The favicon: the symbol, painted by a stylesheet of its own in the reader's scheme and contrast
// (design/brand/generated/symbol.adaptive.svg, written by `pnpm generate`).
import type { APIRoute } from 'astro';
import { marks } from '../lib/brand-marks';

export const GET: APIRoute = () => new Response(marks.symbolAdaptive, { headers: { 'Content-Type': 'image/svg+xml' } });
