// The favicon for a browser that does not read the SVG one: the symbol on the light surface at 16, 32 and 48 pixels,
// rendered from the mark at build time.
import type { APIRoute } from 'astro';
import { icoOf } from '../lib/brand.mjs';
import { marks, surface } from '../lib/brand-marks';

export const GET: APIRoute = async () => new Response(new Uint8Array(await icoOf(marks.symbolLight, { background: surface })), { headers: { 'Content-Type': 'image/x-icon' } });
