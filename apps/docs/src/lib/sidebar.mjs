// The sidebar's groups and the pages in each, in the order the sidebar shows them: the framework's configuration takes
// them (astro.config.mjs, `sidebarConfig`), and the site's index for language models lists its pages under the same
// headings in the same order (`/llms.txt`, lib/llms.ts). The Components group lists no page by hand: its pages are
// every component that has one, from the status file (lib/listing.mjs, `sidebarSlugs`).
import { sidebarSlugs } from './listing.mjs';

/**
 * @typedef {{ label: string, translations: Record<string, string>, items: string[] }} PageGroup
 * @typedef {{ label: string, translations: Record<string, string>, components: true }} ComponentsGroup
 */

/** @type {(PageGroup | ComponentsGroup)[]} */
export const SIDEBAR_GROUPS = [
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
    // The sidebar groups them by category and shows the ones a spec marks `advanced` only to a reader who asked for
    // everything (components/frame/Sidebar.astro).
    components: true,
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
];

/**
 * The sidebar as the framework's configuration takes it, with the Components group's pages from the status file.
 *
 * @param {Parameters<typeof sidebarSlugs>[0]} rows The status file's components.
 */
export const sidebarConfig = (rows) =>
  SIDEBAR_GROUPS.map((group) => ({ label: group.label, translations: group.translations, items: 'components' in group ? sidebarSlugs(rows) : group.items }));
