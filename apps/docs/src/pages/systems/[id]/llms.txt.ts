// `/systems/<id>/llms.txt`: the index of one shipped design system, following its components manifest (src/lib/llms.ts).
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { translations } from '../../../../i18n/locales.mjs';
import { llmsIndex, pageGroups, systemIds } from '../../../lib/llms';

export const getStaticPaths: GetStaticPaths = () => systemIds.map((id) => ({ params: { id } }));

export const GET: APIRoute = async ({ params, site }) => {
  const groups = pageGroups(await getCollection('docs'), translations.map(({ dir }) => dir));
  return new Response(llmsIndex(site!, groups, params.id!), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
