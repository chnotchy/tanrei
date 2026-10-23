// What a page's head says about it to a search engine and to a shared link, beyond what the framework writes: the
// image of a shared link, the language as the Open Graph protocol writes it, the titles of the first page and of a
// component's page, and the page's structured data (JSON-LD, schema.org). src/routeData.ts writes them into the head;
// src/pages/og/[...slug].png.ts draws the images. Every name, address and version comes from tanrei.config.json, and
// every word from lib/i18n.ts.
import { source, translations } from '../../i18n/locales.mjs';
import { strings } from './i18n';
import { config } from './repo';

/** Fills `{name}` places of a string of the dictionary as text: a title's content is text, escaped where it is written. */
const words = (template: string, values: Record<string, string>) => template.replace(/\{(\w+)\}/g, (place, name: string) => values[name] ?? place);

/** The languages of the site, the source first: their folder (`''` for the source), tag, direction, Open Graph locale and faces. */
export const languages = [source, ...translations].map((language) => ({ dir: language.dir, lang: language.lang, direction: ('direction' in language ? language.direction : 'ltr') as 'ltr' | 'rtl', ogLocale: language.ogLocale, imageFaces: language.imageFaces as string[] | null }));

const byLang = (lang: string | undefined) => languages.find((language) => language.lang === lang) ?? languages[0];
const byDir = (dir: string | undefined) => languages.find((language) => language.dir === (dir ?? '')) ?? languages[0];

/** The page's language as `og:locale` writes it (`ja_JP`), and every other language of the site, as `og:locale:alternate`. */
export function ogLocales(lang: string | undefined): { locale: string; alternates: string[] } {
  const own = byLang(lang);
  return { locale: own.ogLocale, alternates: languages.filter((language) => language !== own).map((language) => language.ogLocale) };
}

/** Whether a language's pages have images of their own: the build has a face for its script (i18n/locales.mjs, `imageFaces`). */
export const drawsLanguage = (dir: string | undefined) => byDir(dir).imageFaces !== null;

/**
 * A page's id (Starlight's, `ja/components/button`; `''` and `ja` for the first pages) as its language's folder and
 * the page's id within it, `index` for the first page.
 */
export function pageOf(id: string): { dir: string; page: string } {
  const [first, ...rest] = id.replace(/^\/+|\/+$/g, '').split('/');
  const dir = translations.some((language) => language.dir === first) ? first : '';
  const page = (dir ? rest : [first, ...rest]).filter(Boolean).join('/');
  return { dir, page: page === '' || page === 'index' ? 'index' : page };
}

/**
 * The address of a page's image (`/og/ja/components/button.png`): its language's own where the build draws that
 * language and the page is translated, else the English page's (`/og/components/button.png`).
 */
export function socialImagePath(id: string, isFallback = false): string {
  const { dir, page } = pageOf(id);
  return dir && drawsLanguage(dir) && !isFallback ? `/og/${dir}/${page}.png` : `/og/${page}.png`;
}

/** The platforms' names (tanrei.config.json) as the language lists them: «Web Components, SwiftUI, Jetpack Compose, Flutter and React Native». */
export function platformList(lang: string | undefined): string {
  const t = strings(lang);
  const names = (config.platforms as string[]).map((platform) => (platform === 'web' ? t.seo.web : (t.platform[platform] ?? platform)));
  const [between, last] = t.seo.list;
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(between)}${last}${names.at(-1)}`;
}

/** The first page's title: the system's name and what it is, without the site's name after it a second time. */
export const homeTitle = (lang: string | undefined) => words(strings(lang).seo.home, { name: config.name, platforms: platformList(lang) });

/**
 * A component page's titles: the document's («Button — accessible UI component | Tanrei design system») and the one a
 * shared link shows («Button — accessible UI component»).
 */
export function componentTitles(title: string, lang: string | undefined): { document: string; og: string } {
  const t = strings(lang);
  const og = words(t.seo.component, { title });
  return { document: `${og} | ${words(t.seo.site, { name: config.name })}`, og };
}

// ── Structured data ──────────────────────────────────────────────────────────────────────────────────────────────

const [owner] = (config.repository.public as string).split('/');
/** The repository's address, and its author: the account that owns it, and no one else. */
export const codeRepository = `https://github.com/${config.repository.public}`;
export const author = { '@type': 'Person', name: owner, url: `https://github.com/${owner}` } as const;
/** The license by its SPDX identifier's page. */
export const licenseUrl = `https://spdx.org/licenses/${config.license}.html`;
/** The system's name in its own language: what 端麗 is, for a search engine that is asked for it. */
export const alternateName = '端麗';

/** The language each platform's package is written in, and where it runs. `react` is the web package's React layer. */
export const PLATFORM_CODE: Record<string, { language: string; runtime: string[] }> = {
  web: { language: 'TypeScript', runtime: ['Web'] },
  react: { language: 'TypeScript', runtime: ['Web', 'React'] },
  swiftui: { language: 'Swift', runtime: ['iOS', 'macOS'] },
  compose: { language: 'Kotlin', runtime: ['Android'] },
  flutter: { language: 'Dart', runtime: ['Flutter'] },
  'react-native': { language: 'TypeScript', runtime: ['React Native'] },
};

type Json = Record<string, unknown>;

/** The page's trail as a `BreadcrumbList`: the first page, each group that has a page of its own, the page itself. */
export function breadcrumbList(levels: { name: string; href?: string }[], site: URL): Json {
  const items = levels.filter((level, at) => level.href !== undefined || at === levels.length - 1);
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((level, at) => ({ '@type': 'ListItem', position: at + 1, name: level.name, ...(level.href ? { item: new URL(level.href, site).href } : {}) })),
  };
}

/**
 * The page itself, on every page: its address, title and language, and `dateModified`, when it last changed — the date
 * the sitemap gives the page and its head prints (`virtual:tanrei-docs/last-updated`, src/lib/lastmod.mjs), as it was
 * given (ISO 8601 with its offset). A page no commit holds yet has no `dateModified`.
 */
export function webPage(url: string, name: string, lang: string, description: string | undefined, dateModified: string | undefined): Json {
  return { '@context': 'https://schema.org', '@type': 'WebPage', url, name, inLanguage: lang, ...(description ? { description } : {}), ...(dateModified ? { dateModified } : {}) };
}

/** The site, on its first page in every language. */
export function webSite(url: string, lang: string, description: string | undefined): Json {
  return { '@context': 'https://schema.org', '@type': 'WebSite', name: config.name, alternateName, url, inLanguage: lang, ...(description ? { description } : {}) };
}

/**
 * The system as source code: on the first page every platform's language, on a platform's page of "Getting started"
 * that platform's.
 */
export function softwareSourceCode(url: string, description: string | undefined, platforms: string[] = Object.keys(PLATFORM_CODE)): Json {
  const code = platforms.map((platform) => PLATFORM_CODE[platform]).filter(Boolean);
  const unique = (values: string[]) => [...new Set(values)];
  const one = (values: string[]) => (values.length === 1 ? values[0] : values);
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: config.name,
    alternateName,
    ...(description ? { description } : {}),
    url,
    codeRepository,
    license: licenseUrl,
    programmingLanguage: one(unique(code.map((c) => c.language))),
    runtimePlatform: one(unique(code.flatMap((c) => c.runtime))),
    version: config.version,
    author,
  };
}

/** The platform a page of "Getting started" is about (`getting-started/swiftui`), or undefined. */
export function gettingStartedPlatform(page: string): string | undefined {
  const platform = /^getting-started\/([a-z-]+)$/.exec(page)?.[1];
  return platform && Object.hasOwn(PLATFORM_CODE, platform) ? platform : undefined;
}

/** JSON-LD as the content of its script element: `<` escaped, so that no text of a page can end the element. */
export const jsonLd = (data: Json) => JSON.stringify(data).replaceAll('<', '\\u003c');
