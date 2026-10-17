// The home-screen icon (180 × 180): the symbol on the light surface, opaque — a home screen draws a transparent icon
// on black. Rendered from the mark at build time.
import type { APIRoute } from 'astro';
import { TOUCH_ICON_SIZE, iconSvg, png } from '../lib/brand.mjs';
import { marks, surface } from '../lib/brand-marks';

export const GET: APIRoute = async () => new Response(new Uint8Array(await png(iconSvg(marks.symbolLight, { size: TOUCH_ICON_SIZE, background: surface }))), { headers: { 'Content-Type': 'image/png' } });
