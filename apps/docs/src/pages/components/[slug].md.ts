// `/components/<name>.md`: a component's page as Markdown, generated from its spec (src/lib/llms.ts) — one for every
// component the site has a page for. The page's head links to it (components/frame/Head.astro).
import type { APIRoute, GetStaticPaths } from 'astro';
import { componentMarkdown } from '../../lib/llms';
import { statusComponents } from '../../lib/repo';

export const getStaticPaths: GetStaticPaths = () => statusComponents.filter((row) => row.hasSpec && row.docs).map((row) => ({ params: { slug: row.name } }));

export const GET: APIRoute = ({ params, site }) => new Response(componentMarkdown(params.slug!, site!), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
