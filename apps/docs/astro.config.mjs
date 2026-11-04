// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';
import { tanreiStudio } from '@tanrei/studio/vite';
import { tabsBootstrap } from './src/components/tabs/keys.mjs';
import { starlightLocales, translations } from './i18n/locales.mjs';
import { elementModulesPlugin } from './src/lib/element-modules.mjs';
import { listingBootstrap, sidebarSlugs } from './src/lib/listing.mjs';
import { tanreiMarkdown } from './src/lib/markdown.mjs';
import { notFoundFiles } from './src/lib/not-found-files.mjs';
import { pageLastmod } from './src/lib/lastmod.mjs';
import { pageMarkdownFiles } from './src/lib/page-markdown.mjs';
import { pagePolicies } from './src/lib/csp.mjs';

const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
// When each page last changed: the newest commit of what it is made from (its own source; for a component's page, its
// spec and component tokens; for a page that draws tokens, `tokens/`), read from git once when the site is built. The
// sitemap writes it, and each page's head prints it from the virtual module the integration serves (src/lib/lastmod.mjs).
const lastmod = pageLastmod({
  repoRoot,
  contentDir: path.relative(repoRoot, fileURLToPath(new URL('./src/content/docs', import.meta.url))).split(path.sep).join('/'),
  languages: translations.map(({ dir }) => dir),
});
// The names and the site's address (tanrei.config.json).
const config = JSON.parse(fs.readFileSync(new URL('../../tanrei.config.json', import.meta.url), 'utf8'));
// The generated status file: a row for each component, with the address of its page (written from specs/).
const status = JSON.parse(fs.readFileSync(new URL('../../docs/status/status.json', import.meta.url), 'utf8'));
// The public URL (Cloudflare Pages, custom domain), from tanrei.config.json. Gives every page its canonical URL, the
// sitemap and robots.txt (src/pages/robots.txt.ts).
const { site } = config;
if (!site) throw new Error('tanrei.config.json has no "site": the address of the docs site');
// The site's title: the system's name.
const title = config.name;

// The brand page took the place of the principles page: its old address, in every language, leads there.
const moved = Object.fromEntries(['', ...translations.map(({ dir }) => dir)].map((dir) => [`${dir ? `/${dir}` : ''}/foundations/principles`, `${dir ? `/${dir}` : ''}/foundations/brand/`]));

export default defineConfig({
  site,
  redirects: moved,
  integrations: [
    starlight({
      title,
      description: 'One design system for Web Components, SwiftUI, Jetpack Compose, Flutter and React Native.',
      // The icons are the brand marks (design/brand/), rendered by the build: src/pages/favicon.svg.ts, favicon.ico.ts
      // and apple-touch-icon.png.ts (src/lib/brand.mjs). The SVG follows the reader's scheme. Each page's social image is
      // src/pages/og/[...slug].png.ts.
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
        // The reader's appearance (color mode, contrast, look) before the first paint, in place of the framework's own
        // theme script: lib/appearance.ts.
        ThemeProvider: './src/components/frame/ThemeProvider.astro',
        Banner: './src/components/frame/Nothing.astro',
        FallbackContentNotice: './src/components/frame/Nothing.astro',
        DraftContentNotice: './src/components/frame/Nothing.astro',
      },
      // All before first paint: the tab they chose before in each shared set of tabs, and whether the lists of
      // components show everything or what is listed by default (src/lib/listing.mjs). The reader's appearance, and the
      // look the lists follow, are the ThemeProvider's (above).
      head: [
        { tag: 'script', content: tabsBootstrap },
        { tag: 'script', content: listingBootstrap },
        // The ICO for a browser that does not read the SVG favicon; `sizes` keeps one that does from choosing the ICO.
        { tag: 'link', attrs: { rel: 'icon', href: '/favicon.ico', sizes: '32x32' } },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' } },
      ],
      // Each page's image of a shared link, its language as Open Graph writes it, the titles of the first page and of a
      // component's page, and its structured data (JSON-LD): src/routeData.ts.
      routeMiddleware: './src/routeData.ts',
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
    // Each page says when it last changed (`lastmod`, from git; never the time of the build): the date its head prints.
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
    // Every page as Markdown beside it (`<path>.md`), from the built page, dated as the sitemap dates it
    // (src/lib/page-markdown.mjs).
    pageMarkdownFiles({ languages: translations.map(({ dir }) => dir), lastmod: lastmod.of }),
    // Each language's not-found page also as `<language>/404.html`, for a host that answers with the nearest one.
    notFoundFiles(translations),
    // Last, so that it reads every page as it is served: each page's own script policy, the hashes of the inline scripts
    // and event handlers it holds, in a meta element beside the one the host sends (src/lib/csp.mjs, public/_headers).
    pagePolicies(),
  ],
  // No highlighter of the Markdown engine's: a fence reaches the docs' own step as it was written.
  markdown: { syntaxHighlight: false },
  vite: {
    // Theme Studio (@tanrei/studio) previews with the build's own emitter; its plugin makes that bundle for a browser.
    // A page defines only the elements it draws (src/lib/define-on-demand.ts), from this table of the module that
    // defines each tag, made from the web package's manifest.
    plugins: [tanreiStudio(), elementModulesPlugin()],
    // Pages import tokens, specs and the status matrix straight from the repository root.
    server: { fs: { allow: [repoRoot] } },
    // A font file stays a file, however small: inlined, it would be in the stylesheet every page loads, and a face is
    // asked for only by a page that draws one of its characters (the cut faces of Noto Sans JP are 1 to 50 KB each).
    build: { assetsInlineLimit: (file) => (file.endsWith('.woff2') ? false : undefined) },
  },
});
