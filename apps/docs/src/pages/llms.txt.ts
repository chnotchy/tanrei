// `/llms.txt`: the site's index for language models (https://llmstxt.org/), following the default design system —
// its components first, those it does not ship apart. Written by src/lib/llms.ts from the components manifests and
// the specs, never from the site's pages.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { translations } from '../../i18n/locales.mjs';
import { llmsIndex, pageGroups } from '../lib/llms';

export const GET: APIRoute = async ({ site }) => {
  const groups = pageGroups(await getCollection('docs'), translations.map(({ dir }) => dir));
  return new Response(llmsIndex(site!, groups), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
