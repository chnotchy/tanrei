// Every live preview of the built site, in the light scheme, is drawn as the web package draws it: previews.mjs
// holds the tests and says how they ask.
//
//   pnpm --filter @tanrei/docs build && pnpm --filter @tanrei/docs test:browser
import { previewTests } from './previews.mjs';

previewTests('light');
