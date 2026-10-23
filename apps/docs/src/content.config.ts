import { defineCollection } from 'astro:content';
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
  // Overrides for Starlight's own UI strings (src/content/i18n/<lang>.json).
  i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
};
