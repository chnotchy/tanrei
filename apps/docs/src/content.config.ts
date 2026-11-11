import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        // On a translated page (i18n/README.md): the English page it translates, as a path under `src/content/docs/`,
        // and the git blob id of that page as it stood when the translation was made or last brought up to date.
        // `pnpm --filter @tanrei/docs i18n` compares the id with the English page of today.
        translationOf: z.string().optional(),
        sourceHash: z
          .string()
          .regex(/^[0-9a-f]{40}$/)
          .optional(),
      }),
    }),
  }),
  // The blog's posts (lib/blog.ts): `src/content/blog/<name>.md` in English, `src/content/blog/<language>/<name>.md` in
  // another language, each only in the languages its author wrote it in. The folder is kept in git while it holds no
  // post (`.gitkeep`, which the pattern does not read).
  blog: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
    schema: z.object({
      title: z.string().min(1),
      // What the list, the feed, the head and the image of a shared link say of the post.
      description: z.string().min(1),
      // The day it was published (`2026-11-12`).
      date: z.coerce.date(),
      // Who wrote it: the account that owns the repository unless the post names another (lib/blog.ts, `owner`).
      author: z.string().min(1).optional(),
    }),
  }),
  // Overrides for Starlight's own UI strings (src/content/i18n/<lang>.json).
  i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
};
