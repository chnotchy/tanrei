// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';
import { tanreiStudio } from '@tanrei/studio/vite';
import { tabsBootstrap, tabsKey } from './src/components/tabs/keys.mjs';
import { starlightLocales, translations } from './i18n/locales.mjs';
import { SYSTEM_SYNC_KEY, listingBootstrap, sidebarSlugs, systemBootstrap } from './src/lib/listing.mjs';
import { tanreiMarkdown } from './src/lib/markdown.mjs';
import { notFoundFiles } from './src/lib/not-found-files.mjs';
import { sitemapLastmod } from './src/lib/lastmod.mjs';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
// When each page of the sitemap last changed: the newest commit of its own source and, for a component's page, of its
// spec, read from git when the site is built (src/lib/lastmod.mjs).
const lastmod = sitemapLastmod({
  repoRoot,
  contentDir: path.relative(repoRoot, fileURLToPath(new URL('./src/content/docs', import.meta.url))).split(path.sep).join('/'),
  languages: translations.map(({ dir }) => dir),
});
// The generated status file: a row for each component, with the address of its page (written from specs/).
const status = JSON.parse(fs.readFileSync(new URL('../../docs/status/status.json', import.meta.url), 'utf8'));
// The shipped systems, each of which has its components manifest (tokens/generated/<id>/components.json), and the
// default one, named by the configuration: the systems the lists of components can show, and the one they show first.
const generated = new URL('../../tokens/generated/', import.meta.url);
const systems = fs.readdirSync(generated).filter((id) => fs.existsSync(new URL(`${id}/components.json`, generated))).sort();
const defaultSystem = JSON.parse(fs.readFileSync(new URL('../../tanrei.config.json', import.meta.url), 'utf8')).namespace;

// Applies the reader's stored contrast choice before first paint. The attribute
// lives on <html> because component tokens are resolved at :root.
const contrastBootstrap = `try{var c=localStorage.getItem('tanrei-docs-contrast');if(c==='medium'||c==='high')document.documentElement.setAttribute('data-tanrei-contrast',c)}catch(e){}`;

// The public URL (Cloudflare Pages, custom domain). Gives every page its canonical URL and the sitemap.
const site = 'https://tanrei.chnotchy.com';
const title = 'Tanrei';

// The brand page took the place of the principles page: its old address, in every language, leads there.
const moved = Object.fromEntries(['', ...translations.map(({ dir }) => dir)].map((dir) => [`${dir ? `/${dir}` : ''}/foundations/principles`, `${dir ? `/${dir}` : ''}/foundations/brand/`]));

export default defineConfig({
  site,
  redirects: moved,
  integrations: [
    starlight({
      title,
      description: 'One design system for Web Components, SwiftUI, Jetpack Compose, Flutter and React Native.',
      // The icons and the social image are the brand marks (design/brand/), rendered by the build: src/pages/favicon.svg.ts,
      // favicon.ico.ts, apple-touch-icon.png.ts and og.png.ts (src/lib/brand.mjs). The SVG follows the reader's scheme.
      favicon: '/favicon.svg',
      defaultLocale: 'root',
      // English at the root; the translations and which of their pages must exist are in i18n/locales.mjs.
      locales: starlightLocales,
      customCss: ['@tanrei/web/tokens.css', '@tanrei/web/icons.css', './src/styles/prose.css', './src/styles/frame.css', './src/styles/fonts.generated.css', './src/styles/tanrei-theme.css'],
      components: {
        Hero: './src/components/Hero.astro',
        // The content column is Tanrei's prose, not Starlight's Markdown styles.
        MarkdownContent: './src/components/MarkdownContent.astro',
        // The previous and next page at the foot of a page are Tanrei's previous and next links, with Starlight's words.
        Pagination: './src/components/PreviousNextLinks.astro',
        // The foot of a page: the framework's, then the link to the source repository and its issues.
        Footer: './src/components/frame/Footer.astro',
        // The page frame is Tanrei's app shell and what stands in it (components/frame/): the shell with
        // the skip link, the announcement, the header and the navigation; the app bar; the sidebar as a navigation
        // drawer; the aside and the main region; "On this page" as the table of contents; the page's head as the page
        // header with the breadcrumbs; the search in the app bar is Tanrei's Search (components/frame/Search.astro), fed
        // by the search index the framework's build writes: the framework's own search component is not drawn.
        PageFrame: './src/components/frame/PageFrame.astro',
        // The head also preloads the font files the first screen is set in (components/frame/Head.astro).
        Head: './src/components/frame/Head.astro',
        SkipLink: './src/components/frame/SkipLink.astro',
        Header: './src/components/frame/Header.astro',
        Sidebar: './src/components/frame/Sidebar.astro',
        TwoColumnContent: './src/components/frame/TwoColumnContent.astro',
        PageSidebar: './src/components/frame/PageSidebar.astro',
        ContentPanel: './src/components/frame/ContentPanel.astro',
        PageTitle: './src/components/frame/PageTitle.astro',
        Banner: './src/components/frame/Nothing.astro',
        FallbackContentNotice: './src/components/frame/Nothing.astro',
        DraftContentNotice: './src/components/frame/Nothing.astro',
      },
      // All before first paint: the reader's contrast, the tab they chose before in each shared set of tabs, whether
      // the lists of components show everything or what is listed by default, and the design system they show
      // (src/lib/listing.mjs).
      head: [
        { tag: 'script', content: contrastBootstrap },
        { tag: 'script', content: tabsBootstrap },
        { tag: 'script', content: listingBootstrap },
        { tag: 'script', content: systemBootstrap(tabsKey(SYSTEM_SYNC_KEY), systems, defaultSystem) },
        // The ICO for a browser that does not read the SVG favicon; `sizes` keeps one that does from choosing the ICO.
        { tag: 'link', attrs: { rel: 'icon', href: '/favicon.ico', sizes: '32x32' } },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' } },
        // A shared link of any page shows the wordmark (the framework already says `summary_large_image`).
        { tag: 'meta', attrs: { property: 'og:image', content: new URL('/og.png', site).href } },
        { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
        { tag: 'meta', attrs: { property: 'og:image:alt', content: title } },
      ],
      // The page that was not found is the docs' own (src/pages/404.astro and one for each language): Tanrei's Empty
      // state in the page frame, in place of the framework's page.
      disable404Route: true,
      // Code is Tanrei's code block, highlighted where the site is built (src/lib/markdown.mjs): the framework's own code
      // component, its highlighter and its themes are off — here, and for plain Markdown under `markdown` below.
      expressiveCode: false,
      sidebar: [
        {
          label: 'Getting started',
          translations: { ja: 'はじめに', 'zh-CN': '开始使用', hi: 'शुरू करें', es: 'Primeros pasos', ar: 'البدء' },
          items: [
            'getting-started',
            'getting-started/web',
            'getting-started/react',
            'getting-started/swiftui',
            'getting-started/compose',
            'getting-started/flutter',
            'getting-started/react-native',
            'getting-started/presets',
            'getting-started/your-design-system',
            'getting-started/ai-agents',
          ],
        },
        {
          label: 'Foundations',
          translations: { ja: '基礎', 'zh-CN': '基础', hi: 'बुनियादी बातें', es: 'Fundamentos', ar: 'الأسس' },
          items: [
            'foundations/brand',
            'foundations/design-tokens',
            'foundations/design-systems',
            'foundations/theme-studio',
            'foundations/color',
            'foundations/typography',
            'foundations/icons',
            'foundations/shape',
            'foundations/elevation',
            'foundations/motion',
            'foundations/states',
            'foundations/behaviour',
            'foundations/layout',
            'foundations/accessibility',
            'foundations/words',
          ],
        },
        {
          label: 'Token reference',
          translations: { ja: 'トークンリファレンス', 'zh-CN': '令牌参考', hi: 'टोकन संदर्भ', es: 'Referencia de tokens', ar: 'مرجع الرموز' },
          items: [
            'tokens/color',
            'tokens/typescale',
            'tokens/shape',
            'tokens/elevation',
            'tokens/motion',
            'tokens/state',
            'tokens/space',
          ],
        },
        {
          label: 'Components',
          translations: { ja: 'コンポーネント', 'zh-CN': '组件', hi: 'कंपोनेंट', es: 'Componentes', ar: 'المكوّنات' },
          // Every component that has a page, from the status file the specs are written into: no page is listed here
          // by hand (src/lib/listing.mjs). The sidebar groups them by category and shows the ones a spec marks
          // `advanced` only to a reader who asked for everything (components/frame/Sidebar.astro).
          items: sidebarSlugs(status.components),
        },
        {
          label: 'Project',
          translations: { ja: 'プロジェクト', 'zh-CN': '项目', hi: 'प्रोजेक्ट', es: 'Proyecto', ar: 'المشروع' },
          items: [
            'status',
            'project/how-tanrei-is-built',
            'project/contributing',
            'project/license',
          ],
        },
      ],
    }),
    // The sitemap, with Starlight's languages as Starlight configures its own (which it leaves out once the site has
    // one): every page but the documents the fixtures' windows draw (src/pages/fixtures/), which are no reader's page.
    // Each page says when it last changed (`lastmod`, from git; never the time of the build).
    lastmod.integration,
    sitemap({
      i18n: { defaultLocale: 'root', locales: Object.fromEntries(Object.entries(starlightLocales).map(([locale, { lang }]) => [locale, lang])) },
      filter: (page) => !new URL(page).pathname.startsWith('/fixtures/'),
      serialize: (item) => {
        const date = lastmod.of(item.url);
        return date ? { ...item, lastmod: date } : item;
      },
    }),
    // After Starlight, so that its passes run after Starlight's: Markdown's tables, notices and fenced code are drawn by
    // Tanrei's Table, Callout and Code block (src/lib/markdown.mjs).
    tanreiMarkdown(),
    // Each language's not-found page also as `<language>/404.html`, for a host that answers with the nearest one.
    notFoundFiles(translations),
  ],
  // No highlighter of the Markdown engine's: a fence reaches the docs' own step as it was written.
  markdown: { syntaxHighlight: false },
  vite: {
    // Theme Studio (@tanrei/studio) previews with the build's own emitter; its plugin makes that bundle for a browser.
    plugins: [tanreiStudio()],
    // Pages import tokens, specs and the status matrix straight from the repository root.
    server: { fs: { allow: [repoRoot] } },
    // A font file stays a file, however small: inlined, it would be in the stylesheet every page loads, and a face is
    // asked for only by a page that draws one of its characters (the cut faces of Noto Sans JP are 1 to 50 KB each).
    build: { assetsInlineLimit: (file) => (file.endsWith('.woff2') ? false : undefined) },
  },
});
