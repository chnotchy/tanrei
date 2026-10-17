// The image a shared link of any page shows (1200 × 630): the wordmark on the light surface. Rendered from the mark at
// build time; the head names it (astro.config.mjs, `og:image`).
import type { APIRoute } from 'astro';
import { png, socialSvg } from '../lib/brand.mjs';
import { marks, surface } from '../lib/brand-marks';

export const GET: APIRoute = async () => new Response(new Uint8Array(await png(socialSvg(marks.wordmarkLight, { background: surface }))), { headers: { 'Content-Type': 'image/png' } });
