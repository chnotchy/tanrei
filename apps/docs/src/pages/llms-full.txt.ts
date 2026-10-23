// `/llms-full.txt`: the spec of every component the default design system ships, as Markdown, in one file (src/lib/llms.ts).
import type { APIRoute } from 'astro';
import { llmsFull } from '../lib/llms';

export const GET: APIRoute = ({ site }) => new Response(llmsFull(site!), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
