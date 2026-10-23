// `/components/<name>.md`, as the build first writes it: a component's spec as Markdown (src/lib/llms.ts), one for every
// component the site has a page for. When the pages are built, the Markdown of each component's page, in every
// language, takes it into its Specs section, and the English page's Markdown is written over this file in its place
// (src/lib/page-markdown.mjs): what the site serves at this address is the whole page.
import type { APIRoute, GetStaticPaths } from 'astro';
import { componentMarkdown } from '../../lib/llms';
import { statusComponents } from '../../lib/repo';

export const getStaticPaths: GetStaticPaths = () => statusComponents.filter((row) => row.hasSpec && row.docs).map((row) => ({ params: { slug: row.name } }));

export const GET: APIRoute = ({ params, site }) => new Response(componentMarkdown(params.slug!, site!), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
