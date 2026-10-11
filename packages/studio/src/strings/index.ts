// The languages of the Theme Studio, in one place. Each language's words are one file beside this one, typed as a
// `Dictionary` — exactly the keys of English (./shape.ts, ./en.ts) — so a language is translated by replacing one file.
//
// A file that exports `UNTRANSLATED = true` holds no translation yet (it re-exports English): the Studio speaks English
// where that language is asked for, as it does for a language it does not know, and the standalone app does not offer
// it. Nobody is shown a Studio in two languages.
import * as ar from './ar';
import * as en from './en';
import type { Dictionary, StudioStrings } from './en';
import * as es from './es';
import * as hi from './hi';
import * as ja from './ja';
import * as zhCN from './zh-CN';

export type { Dictionary, StudioStrings } from './en';

interface Language {
  /** The language's name in the language itself: what a switch shows. */
  name: string;
  dir: 'ltr' | 'rtl';
  strings: StudioStrings;
  /** `false`: the file is still English, and the language is neither spoken nor offered. */
  translated: boolean;
}
const language = (name: string, file: { default: Dictionary; UNTRANSLATED?: boolean }, dir: 'ltr' | 'rtl' = 'ltr'): Language => ({ name, dir, strings: file.default, translated: !file.UNTRANSLATED });

/** Keyed by BCP 47 tag, in the order a switch offers them. */
export const LANGUAGES = {
  en: language('English', en),
  ja: language('日本語', ja),
  'zh-CN': language('简体中文', zhCN),
  hi: language('हिन्दी', hi),
  es: language('Español', es),
  ar: language('العربية', ar, 'rtl'),
} satisfies Record<string, Language>;
export type StudioLanguage = keyof typeof LANGUAGES;

const TAGS = Object.keys(LANGUAGES) as StudioLanguage[];
const SOURCE: StudioLanguage = 'en';

/**
 * The language the Studio speaks when `requested` is asked for: that language when it has a translation — whatever
 * the tag's case (`zh-cn`), and by its primary subtag when the whole tag is not listed (`es-MX` → `es`) — and English
 * otherwise (an untranslated language, an unknown one, none).
 */
export function studioLanguage(requested?: string | null): StudioLanguage {
  const tag = (requested ?? '').trim().toLowerCase();
  const found = TAGS.find((known) => known.toLowerCase() === tag) ?? TAGS.find((known) => known.toLowerCase() === tag.split('-')[0]);
  return found && LANGUAGES[found].translated ? found : SOURCE;
}

/** The languages a switch may offer: the translated ones. */
export const offeredLanguages = (): { tag: StudioLanguage; name: string }[] => TAGS.filter((tag) => LANGUAGES[tag].translated).map((tag) => ({ tag, name: LANGUAGES[tag].name }));

/** The words for a language (see `studioLanguage` for what an unknown or untranslated one gets). */
export const studioStrings = (requested?: string | null): StudioStrings => LANGUAGES[studioLanguage(requested)].strings;

/** The direction that language is written in. */
export const studioDirection = (requested?: string | null): 'ltr' | 'rtl' => LANGUAGES[studioLanguage(requested)].dir;
