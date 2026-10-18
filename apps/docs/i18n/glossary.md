# Glossary for the docs' translations

The words a translation of the Tanrei docs uses, per language. English is the source. The Japanese column is taken from the Japanese pages as they stand (the word they use most), so that a new page reads like the ones beside it; the Simplified Chinese column was fixed together with the first pages in that language, and the Spanish, Hindi and Arabic tables (below the first ones) before any page in them. A translator — a person or an agent — follows this file, and changes it (in the same change as the pages) rather than departing from it.

How the translations are organised, and how a page records what it translates, is in [`README.md`](./README.md).

## What is never translated

- **Identifiers.** Token ids (`sys.color.primary`, `tanrei.comp.button.*`), CSS custom properties, prop, event, slot and state names (`variant`, `disabled`, `pressed`), prop values (`tonal`, `outlined`, `filled`), requirement ids (`BTN-10`), fixture ids, file paths, commands, package names, system ids (`m3-like`, `cupertino`).
- **Code.** Everything inside a code block or inline code, MDX `import` lines, component tags and their attributes' names. The one exception is *product text inside a sample* — a button's label, a placeholder, a string a reader of that language would write in their own product (`Save draft` → `下書きを保存` / `保存草稿` / `Guardar borrador` / `ड्राफ़्ट सेव करें` / `حفظ المسودة`) — and comments in a sample, which are translated.
- **Names.** Tanrei, Theme Studio, Material Design 3, Web Components, SwiftUI, Jetpack Compose, Flutter, React Native, Figma, Tailwind CSS, DTCG, EARS, WCAG, Inter, Noto Sans JP, Roboto Mono, Material Symbols; platform API names.
- **A component as an API.** `Button`, `TextField`, `tanrei-button`, "the `Button`'s `variant`" stay as written. A component *as a thing a reader sees* — a page's title, a heading, "a button", "the dialog" — is the language's common noun (the table of component names below).
- **Status names that are also values**: `alpha`, `beta`, `stable` when they name the status in data.
- **What a page renders from the repository**: requirements, token descriptions. They are not in the MDX at all; they are shown in English by design (README, "What stays English").

## Register and typography: Japanese and Simplified Chinese

| | Japanese | Simplified Chinese |
|---|---|---|
| Register | です・ます調. Plain, declarative, no honorific padding (「〜していただけます」 is not used). Headings are noun phrases or short plain sentences without a full stop. | Written technical Chinese; address the reader as 你 only where a subject is needed (never 您). Short sentences; no 的的的 chains. Headings without a full stop. |
| Spaces between scripts | A half-width space between Japanese and a Latin word or a number (`5 つのプラットフォーム`, `Tanrei は`), none before or after full-width punctuation or inline code's neighbours' punctuation. | A half-width space between Chinese and a Latin word or a number (`5 个平台`, `Tanrei 是`), none next to full-width punctuation. |
| Punctuation | 、。「」（） full-width; a colon after a bold lead-in is `。` or `：` as the neighbouring pages do. | ，。：；（）“” full-width; the enumeration comma `、` between items of a list in a sentence; `——` for a dash. |
| Emphasis | `**bold**` only. Never `*italic*` for emphasis in either language: the scripts have no italic, and prose draws `em` upright at the emphasized weight (PRS-3). An English title set in italics becomes 『』 / 《》 or plain. | |
| Numbers | Half-width digits; counters as the language has them (`3 つ`, `3 个`). Units as in the source (`48px`, `200%`). | |
| Links | An internal link starts with the language's prefix: `/ja/…`, `/zh-cn/…`. Anchors (`#heading`) follow the translated heading's own slug — check them. | |

A translation is natural technical writing in its language, not word for word: split or join sentences where the language wants it, keep every fact, add none.

## Terms: Japanese and Simplified Chinese

| English | Japanese | Simplified Chinese |
|---|---|---|
| design system | デザインシステム | 设计系统 |
| design token, token | デザイントークン、トークン | 设计令牌、令牌 |
| reference / system / component token (the three tiers) | リファレンス / システム / コンポーネント（の 3 層） | 参考 / 系统 / 组件（三层）令牌 |
| alias (a token that points at another) | エイリアス、参照 | 别名、引用 |
| spec, component spec | 仕様、コンポーネント仕様 | 规格、组件规格 |
| spec-first | 仕様起点 | 规格先行 |
| source of truth | 信頼できる情報源 | 唯一可信来源 |
| derived (a value, a file) | 導出される | 推导出的、派生的 |
| generated | 生成される | 生成的 |
| drift, drift check | ドリフト、ドリフトチェック | 漂移、漂移检查 |
| parity | パリティ | 对等 |
| platform | プラットフォーム | 平台 |
| idiom (a platform's own way) | 流儀 | 惯用方式 |
| contract | 契約 | 契约 |
| requirement | 要件 | 需求 |
| fixture | フィクスチャ | 测试样例 |
| snapshot, baseline | スナップショット、ベースライン | 快照、基准图 |
| vocabulary (of tokens) | 語彙 | 词汇 |
| core (vocabulary, token) | コア | 核心 |
| the one-product test | 1 プロダクトテスト | “单一产品”检验 |
| layer (a design system as a layer file) | レイヤ | 层 |
| state layer | ステートレイヤー | 状态层 |
| preset, shipped system | プリセット、同梱システム | 预设、内置系统 |
| dial | ダイヤル | 调节量 |
| fidelity | 忠実度 | 保真度 |
| invariant | 不変条件 | 不变式 |
| owner (of the project) | オーナー | 所有者 |
| agent (an AI agent) | エージェント | 代理（AI 代理） |
| changeset | changeset（チェンジセットとは書かない） | changeset |
| pull request | プルリクエスト | 拉取请求（Pull Request） |
| repository, monorepo | リポジトリ、モノレポ | 仓库、monorepo |
| pre-release | プレリリース | 预发布 |
| publish (a package) | 公開する | 发布 |
| status (of a component) | ステータス | 状态 |
| roadmap | ロードマップ | 路线图 |
| inventory | インベントリ | 清单 |
| announcement | お知らせ | 公告 |
| foundations | 基礎 | 基础 |
| principle | 原則 | 原则 |
| color role | カラーロール | 颜色角色 |
| role (color, type, ARIA) | ロール | 角色 |
| palette, tonal palette | パレット、トーナルパレット | 调色板、色调调色板 |
| scheme (light / dark) | スキーム | 配色方案 |
| theme | テーマ | 主题 |
| light, dark | ライト、ダーク | 浅色、深色 |
| contrast (standard / medium / high) | コントラスト（標準 / 中 / 高） | 对比度（标准 / 中 / 高） |
| surface | サーフェス | 表面 |
| container (a component's box) | コンテナ | 容器 |
| content (what a container holds) | コンテンツ、内容 | 内容 |
| outline (the color role, the edge) | アウトライン、輪郭 | 轮廓 |
| hairline | 細い線 | 细线 |
| divider | 区切り線 | 分隔线 |
| typography | タイポグラフィ | 字体排印 |
| type scale | タイプスケール | 字阶 |
| text style | テキストスタイル | 文本样式 |
| typeface, font | 書体、フォント | 字体 |
| font stack | スタック | 字体栈 |
| weight | 太さ | 字重 |
| line height | 行の高さ | 行高 |
| tracking, letter spacing | 字間 | 字距 |
| emphasis, emphasized | 強調 | 强调 |
| heading, body, label, caption, eyebrow (roles) | 見出し、本文、ラベル、キャプション、アイブロウ — role ids stay `heading-1`… | 标题、正文、标签、说明文字、眉标 |
| prose | プローズ | 长文排版（Prose） |
| icon, icon set | アイコン、アイコンセット | 图标、图标集 |
| fill (of an icon, a variant) | 塗り | 填充 |
| shape | 形状 | 形状 |
| corner, corner radius | 角、角丸、半径 | 圆角、半径 |
| corner smoothing | 角のスムージング | 圆角平滑 |
| elevation | エレベーション | 层级（Elevation） |
| shadow | 影 | 阴影 |
| scrim | スクリム | 遮罩 |
| overlay | オーバーレイ | 浮层 |
| motion | モーション | 动效 |
| duration, easing | 時間、イージング | 时长、缓动 |
| reduced motion | 動きを減らす設定 (the setting, on every platform); モーションの低減 as a principle's name | 减弱动态效果 |
| state (hover, focus, pressed, dragged, disabled, selected) | 状態（ホバー、フォーカス、押下、ドラッグ、無効、選択） | 状态（悬停、聚焦、按下、拖动、禁用、选中） |
| pressed feedback | 押下への応え方 | 按下反馈 |
| ripple | リップル | 涟漪 |
| focus ring, focus indicator | フォーカスリング、フォーカスインジケーター | 焦点环、焦点指示 |
| behaviour, choice of kind | 振る舞い、種類の選択 | 行为、种类选择 |
| layout, spacing, space | レイアウト、スペーシング、余白 | 布局、间距 |
| density | 密度 | 密度 |
| hit area, minimum target | ヒット領域、最小ターゲット | 点击区域、最小目标 |
| accessibility | アクセシビリティ | 无障碍 |
| assistive technology | 支援技術 | 辅助技术 |
| screen reader | スクリーンリーダー | 屏幕阅读器 |
| accessible name | アクセシブルネーム | 无障碍名称 |
| announce (by a screen reader) | 読み上げる | 朗读 |
| keyboard | キーボード | 键盘 |
| variant | バリアント | 变体 |
| size | サイズ | 尺寸 |
| property, prop | プロパティ | 属性 |
| slot | スロット | 插槽 |
| event | イベント | 事件 |
| anatomy, part | 構成要素、パーツ | 构成、部件 |
| label | ラベル | 标签 |
| supporting text | 補足テキスト | 辅助文本 |
| placeholder | プレースホルダー | 占位符 |
| leading / trailing (start / end side) | 先頭 / 末尾 | 前置 / 后置（起始侧 / 末尾侧） |
| anchor (of an overlay) | アンカー | 锚点 |
| handle, track, indicator (slider, switch, tabs) | ハンドル、トラック、インジケーター | 滑块、轨道、指示器 |
| tap, click, press, long press, drag | タップ、クリック、押す、長押し、ドラッグ | 轻点、点击、按下、长按、拖动 |
| default | 既定 | 默认 |
| opt in | オプトイン | 选择启用 |
| right-to-left | 右から左（RTL） | 从右到左（RTL） |
| words (of a product: what it gives the components to draw and say) | 言葉 for the idea and the page; 文言 only for one particular string (「エラーの文言」). The fixed sentence is 「Tanrei は言葉を同梱しません。」 | 文字 |
| select, choose (the verb) | In a control's name, the Sino-Japanese verb: 「日付を選択」「すべて選択」. Running text that tells the reader what to do may say 選ぶ | 选择 |

## Section headings of a component page: Japanese and Simplified Chinese

The four sections and their fixed sub-headings are the same on every component page.

| English | Japanese | Simplified Chinese |
|---|---|---|
| Overview | 概要 | 概览 |
| Usage | 使い方 | 用法 |
| Specs | 仕様 | 规格 |
| Guidelines | ガイドライン | 指南 |
| When to use | 使う場面 | 何时使用 |
| Choosing a variant | バリアントの選び方 | 如何选择变体 |
| Do | 推奨 | 推荐 |
| Don't | 非推奨 | 避免 |
| Content | 文言 | 文案 |
| Accessibility | アクセシビリティ | 无障碍 |
| What the component handles | コンポーネントが担うこと | 组件负责的部分 |
| What you need to do | 利用者側で行うこと | 需要你做的事 |

## Component names: Japanese and Simplified Chinese

As common nouns: page titles, headings, running text.

| English | Japanese | Simplified Chinese |
|---|---|---|
| Accordion | アコーディオン | 折叠面板 |
| App bar | アプリバー | 应用栏 |
| App shell | アプリシェル | 应用外壳 |
| Avatar | アバター | 头像 |
| Badge | バッジ | 徽标 |
| Bottom sheet | ボトムシート | 底部面板 |
| Breadcrumbs | パンくずリスト | 面包屑 |
| Button | ボタン | 按钮 |
| Button group | ボタングループ | 按钮组 |
| Button with menu | メニュー付きボタン | 带菜单的按钮 |
| Calendar | カレンダー | 日历 |
| Callout | コールアウト | 提示块（Callout） as the title; in running text 提示块 |
| Card | カード | 卡片 |
| Carousel | カルーセル | 轮播 |
| Checkbox | チェックボックス | 复选框 |
| Chip | チップ | 纸片（Chip） |
| Code block | コードブロック | 代码块 |
| Color field | カラーフィールド | 颜色字段 |
| Combobox | コンボボックス | 组合框 |
| Copy button | コピーボタン | 复制按钮 |
| DateTimePicker (the page's title is the API name) | DateTimePicker; in running text 日付と時刻のピッカー | DateTimePicker; in running text 日期时间选择器 |
| Description list | 説明リスト | 描述列表 |
| Dialog | ダイアログ | 对话框 |
| Divider | 区切り線 | 分隔线 |
| Empty state | 空の状態 | 空状态 |
| FAB menu | FAB メニュー | FAB 菜单 |
| Field | フィールド | 字段 |
| Field group | フィールドグループ | 字段组 |
| Figure | 図 | 图示 |
| File item | ファイル項目 | 文件项 |
| File picker (the component; the platform's own picker stays ピッカー, ファイルピッカー in running text) | ファイルピッカー | 文件选择器 — the platform's own picker is 平台的文件选择器, short 选择器 |
| Drop zone (a wrapper that takes files dropped anywhere on it; not the File picker's drop area, ドロップ領域 / 拖放区域) | ドロップゾーン | 放置区 |
| File upload | ファイルアップロード | 文件上传 |
| Inline code | インラインコード | 行内代码 |
| Keyboard shortcut | キーボードショートカット | 键盘快捷键 |
| Link | リンク | 链接 |
| Link card | リンクカード | 链接卡片 |
| List | リスト | 列表 |
| List row | リスト行 — its parts: オーバーライン, 見出し (headline), 補足テキスト, 末尾テキスト | 列表行 — its parts: 上标文本 (overline), 标题 (headline), 辅助文本, 后置文本 |
| Loading indicator | ローディングインジケーター | 加载指示器 |
| Main action button | メインアクションボタン | 主操作按钮 |
| Menu | メニュー | 菜单 |
| Menubar | メニューバー | 菜单栏 |
| Meter (a level in a known range; a task under way is the Progress indicator) | メーター | 计量条 |
| Navigation bar | ナビゲーションバー | 导航栏 |
| Navigation drawer | ナビゲーションドロワー | 导航抽屉 |
| Number field | 数値フィールド | 数字字段 |
| One-time-code input | ワンタイムコード入力欄 | 一次性验证码输入框 |
| Page header | ページヘッダー | 页头 |
| Pagination | ページネーション | 分页 |
| Previous and next links | 前後のリンク | 上一页/下一页链接 |
| Popover | ポップオーバー | 弹出框 |
| Progress indicator | プログレスインジケーター | 进度指示器 |
| Radio button | ラジオボタン | 单选按钮 |
| Radio group | ラジオグループ | 单选组 |
| Search | 検索 | 搜索 |
| Segmented button | セグメントボタン | 分段按钮 |
| Select | セレクト | 下拉选择框 |
| Side sheet | サイドシート | 侧边面板 |
| Skeleton | スケルトン | 骨架屏 |
| Slider | スライダー | 滑块 |
| Snackbar | スナックバー | 消息条（Snackbar） |
| Steps | ステップ | 步骤 |
| Switch | スイッチ | 开关 |
| Tab view | タブビュー | 标签页视图 |
| Table | テーブル | 表格 |
| Table of contents | 目次 | 目录 |
| Tabs | タブ | 标签页 |
| Tag | タグ | 标签（Tag） |
| Tag group | タググループ | 标签组（Tag group） as the title; in running text 标签组 |
| Text field | テキストフィールド | 文本字段 |
| Timeline | タイムライン | 时间线 |
| Toolbar | ツールバー | 工具栏 |
| Tooltip | ツールチップ | 工具提示 |
| Tree view | ツリービュー | 树视图 |


## Register and typography: Spanish, Hindi and Arabic

| | Spanish | Hindi | Arabic |
|---|---|---|---|
| Variety | Neutral international Spanish: no regionalisms (`computadora`/`ordenador` are avoided by saying `equipo` or `dispositivo`; `archivo`, not `fichero`). | Standard Hindi in Devanagari. Technical terms that Hindi technical writing keeps in English are transliterated (टोकन, कंपोनेंट, थीम) or left in Latin when they are names or code; plain words stay Hindi (रंग, आकार, नियम). Not Sanskritised: संगणक, अभिकल्प are not used. | Modern Standard Arabic (فصحى), no dialect. Short verbal sentences; the reader is not addressed with honorifics. |
| Register | Impersonal or second person singular informal (`tú`) for instructions, in the imperative (`Instala`, `Usa`); never `usted`, never `vosotros`. Headings in sentence case (only the first word and proper names capitalised), no final full stop. | आप for the reader, with the polite imperative (`इंस्टॉल करें`, `इस्तेमाल करें`). Headings are noun phrases or short sentences without a पूर्ण विराम. | Imperative to the masculine singular as the neutral form (`ثبِّت`, `استخدم`), or the verbal noun in headings (`التثبيت`, `الاستخدام`). Headings without a final full stop. |
| Punctuation | `¿ ?` and `¡ !` both; quotation marks `« »` for a quoted term or `" "` inside code only; a colon is followed by lower case. Decimal figures as in the source (`0.6`, not `0,6`): they are values of tokens. | The danda `।` ends a sentence; other punctuation is Western (`,` `:` `( )`). Nuqta is written (`फ़ाइल`, `ज़रूरी`, `डिज़ाइन`). | Arabic comma `،`, semicolon `؛` and question mark `؟`; the full stop is `.`; quotation marks `« »`. Tashkeel only where a word would otherwise be misread. |
| Digits | Western digits. | Western digits (`48`, `200%`), never Devanagari digits. | Western digits (`48`, `200%`, `4.5:1`) everywhere — prose, tables, code, token ids, versions — never Arabic-Indic digits: every figure in these docs is a value a reader copies into code. |
| Direction | — | — | Pages are right-to-left; the frame and every Tanrei component follow. Code blocks, inline code, token ids, file paths and URLs stay left-to-right and are never reordered or translated. A paragraph, list item or heading takes its direction from its first strong character, so it opens with an Arabic word, never a Latin one (inline code does not count); how each mixed pattern is written, and the one place a direction mark is allowed, is in "Arabic: conventions fixed by the quality pass" below. "Left" and "right" in the English are translated only where the English means the physical side; "start/leading" and "end/trailing" are `البداية` and `النهاية`. |
| Emphasis | `**bold**` for strong emphasis; `*italic*` may be kept for a term or a title, as in the source. | `**bold**` only: Devanagari has no italic. | `**bold**` only: Arabic has no italic. |
| Spaces between scripts | Ordinary spaces. | A space between Hindi and a Latin word or inline code; postpositions are separate words (`Tanrei में`, `` `variant` का ``). | A space between Arabic and a Latin word or inline code; the article and prepositions that attach in Arabic are not attached to Latin words: write `في Tanrei`, and `الـ Wave` only where unavoidable — prefer rephrasing (`المرحلة Wave 1`). |
| Links | `/es/…` | `/hi/…` | `/ar/…` |

## Terms: Spanish, Hindi and Arabic

| English | Spanish | Hindi | Arabic |
|---|---|---|---|
| design system | sistema de diseño | डिज़ाइन सिस्टम | نظام التصميم |
| design token, token | token de diseño, token | डिज़ाइन टोकन, टोकन | رمز التصميم، رمز (token) — the first mention on a page adds `(token)` |
| reference / system / component token (the three tiers) | tokens de referencia / de sistema / de componente (los tres niveles) | रेफ़रेंस / सिस्टम / कंपोनेंट टोकन (तीन स्तर) | رموز المرجع / النظام / المكوّن (المستويات الثلاثة) |
| alias | alias | एलियास | اسم بديل (alias) |
| spec, component spec | especificación, especificación del componente | स्पेक, कंपोनेंट स्पेक | المواصفة، مواصفة المكوّن |
| spec-first | la especificación primero | स्पेक-फ़र्स्ट (पहले स्पेक) | المواصفة أولًا |
| source of truth | fuente de verdad | सोर्स ऑफ़ ट्रुथ (प्रामाणिक स्रोत) | مصدر الحقيقة |
| derived | derivado | व्युत्पन्न (डिराइव किया गया) | مشتق |
| generated | generado | जनरेट किया गया | مولَّد |
| drift, drift check | desviación, comprobación de desviaciones | ड्रिफ़्ट, ड्रिफ़्ट जाँच | الانحراف، فحص الانحراف |
| parity | paridad | पैरिटी | التكافؤ |
| platform | plataforma | प्लैटफ़ॉर्म | المنصة |
| idiom (a platform's own way) | estilo propio (de la plataforma) | अपना तरीक़ा (प्लैटफ़ॉर्म का) | أسلوب المنصة |
| contract | contrato | कॉन्ट्रैक्ट | العقد |
| requirement | requisito | आवश्यकता | المتطلب |
| fixture | fixture | फ़िक्स्चर | نموذج الاختبار (fixture) |
| snapshot, baseline | instantánea, imagen de referencia | स्नैपशॉट, बेसलाइन | لقطة، الصورة المرجعية |
| vocabulary (of tokens) | vocabulario | शब्दावली | المفردات |
| core | núcleo | कोर | الأساس (core) |
| the one-product test | la prueba del producto único | "एक प्रॉडक्ट" कसौटी | اختبار «المنتج الواحد» |
| layer (a design system as a layer file) | capa | लेयर | الطبقة |
| state layer | capa de estado | स्टेट लेयर | طبقة الحالة |
| preset, shipped system | preajuste, sistema incluido | प्रीसेट, साथ आने वाला सिस्टम | إعداد جاهز، نظام مضمَّن |
| dial | dial | डायल | قرص الضبط (dial) |
| fidelity | fidelidad | फ़िडेलिटी | المطابقة |
| invariant | invariante | इनवेरिएंट | ثابت (invariant) |
| owner (of the project) | propietario | ओनर | المالك |
| agent (an AI agent) | agente | एजेंट | وكيل (وكيل ذكاء اصطناعي) |
| changeset | changeset | changeset | changeset |
| pull request | pull request | पुल रिक्वेस्ट | طلب السحب (pull request) |
| repository, monorepo | repositorio, monorepo | रिपॉज़िटरी, मोनोरेपो | المستودع، المستودع الموحَّد (monorepo) |
| pre-release | prelanzamiento | प्री-रिलीज़ | إصدار تمهيدي |
| publish (a package) | publicar | प्रकाशित करना | نشر |
| status (of a component) | estado | स्थिति | الحالة |
| roadmap | hoja de ruta | रोडमैप | خارطة الطريق |
| inventory | inventario | इन्वेंटरी | قائمة الجرد |
| announcement | anuncio | घोषणा | إعلان |
| foundations | fundamentos | बुनियादी बातें | الأسس |
| principle | principio | सिद्धांत | المبدأ |
| color role | rol de color | कलर रोल | دور اللون |
| role (color, type, ARIA) | rol | रोल | الدور |
| palette, tonal palette | paleta, paleta tonal | पैलेट, टोनल पैलेट | لوحة الألوان، لوحة الدرجات اللونية |
| scheme (light / dark) | esquema | स्कीम | المخطط اللوني |
| theme | tema | थीम | السمة |
| light, dark | claro, oscuro | लाइट, डार्क | فاتح، داكن |
| contrast (standard / medium / high) | contraste (estándar / medio / alto) | कंट्रास्ट (स्टैंडर्ड / मध्यम / उच्च) | التباين (قياسي / متوسط / عالٍ) |
| surface | superficie | सरफ़ेस | السطح |
| container (a component's box) | contenedor | कंटेनर | الحاوية |
| content | contenido | कॉन्टेंट | المحتوى |
| outline (the color role, the edge) | contorno | आउटलाइन | الحدّ |
| hairline | línea fina | बारीक रेखा | خط رفيع |
| divider | divisor | डिवाइडर | فاصل |
| typography | tipografía | टाइपोग्राफ़ी | الطباعة |
| type scale | escala tipográfica | टाइप स्केल | السلّم الطباعي |
| text style | estilo de texto | टेक्स्ट स्टाइल | نمط النص |
| typeface, font | tipo de letra, fuente | टाइपफ़ेस, फ़ॉन्ट | الخط |
| font stack | pila de fuentes | फ़ॉन्ट स्टैक | سلسلة الخطوط |
| weight | peso | वेट | الوزن |
| line height | interlineado | लाइन हाइट | ارتفاع السطر |
| tracking, letter spacing | espaciado entre letras | अक्षरों के बीच की दूरी | تباعد الأحرف |
| emphasis, emphasized | énfasis, con énfasis | एम्फ़ेसिस, एम्फ़ेसिस के साथ | التوكيد |
| heading, body, label, caption, eyebrow (roles) | título, cuerpo, etiqueta, leyenda, antetítulo — role ids stay `heading-1`… | हेडिंग, बॉडी, लेबल, कैप्शन, आइब्रो | عنوان، متن، تسمية، شرح، عنوان علوي |
| prose | prosa | प्रोज़ | النص المتصل (prose) |
| icon, icon set | icono, conjunto de iconos | आइकन, आइकन सेट | أيقونة، مجموعة الأيقونات |
| fill | relleno | फ़िल | التعبئة |
| shape | forma | शेप | الشكل |
| corner, corner radius | esquina, radio de esquina | कोना, कॉर्नर रेडियस | الزاوية، نصف قطر الزاوية |
| corner smoothing | suavizado de esquinas | कॉर्नर स्मूदिंग | تنعيم الزوايا |
| elevation | elevación | एलिवेशन | الارتفاع |
| shadow | sombra | शैडो | الظل |
| scrim | velo | स्क्रिम | الحجاب (scrim) |
| overlay | superposición | ओवरले | التراكب |
| motion | movimiento | मोशन | الحركة |
| duration, easing | duración, curva de aceleración | अवधि, ईज़िंग | المدة، منحنى التسارع |
| reduced motion | movimiento reducido («donde el movimiento está reducido»; as a heading «Movimiento reducido»); the platform's setting is «el ajuste de reducir movimiento» | मोशन कम करें | تقليل الحركة |
| state (hover, focus, pressed, dragged, disabled, selected) | estado (al pasar el cursor, foco, pulsado, arrastrado, deshabilitado, seleccionado) — hover as a noun is «el paso del cursor», hovered «con el cursor encima»; the text caret is always «cursor de texto»; a pointing device in general is «puntero», a mouse «ratón»; «deshabilitado» is disabled, «desactivado» is off | स्टेट (होवर, फ़ोकस, दबाया हुआ, ड्रैग किया हुआ, अक्षम, चयनित) | الحالة (التحويم، التركيز، الضغط، السحب، التعطيل، التحديد) |
| pressed feedback | respuesta a la pulsación | दबाने पर फ़ीडबैक | استجابة الضغط |
| ripple | onda | रिपल | التموّج |
| focus ring, focus indicator | anillo de foco, indicador de foco | फ़ोकस रिंग, फ़ोकस इंडिकेटर | حلقة التركيز، مؤشر التركيز |
| behaviour, choice of kind | comportamiento, elección de tipo | व्यवहार, प्रकार का चुनाव | السلوك، اختيار النوع |
| layout, spacing, space | diseño de página (layout), espaciado, espacio | लेआउट, स्पेसिंग | التخطيط، التباعد |
| density | densidad | डेंसिटी | الكثافة |
| hit area, minimum target | área de pulsación, objetivo mínimo | हिट एरिया, न्यूनतम टार्गेट | مساحة اللمس، الحد الأدنى للهدف |
| accessibility | accesibilidad | सुलभता (एक्सेसिबिलिटी) | إمكانية الوصول |
| assistive technology | tecnología de apoyo | सहायक तकनीक | التقنيات المساعدة |
| screen reader | lector de pantalla | स्क्रीन रीडर | قارئ الشاشة |
| accessible name | nombre accesible | एक्सेसिबल नाम | الاسم المتاح للتقنيات المساعدة |
| announce (by a screen reader) | anunciar | पढ़कर सुनाना | يُعلِن / ينطق |
| keyboard | teclado | कीबोर्ड | لوحة المفاتيح |
| variant | variante | वेरिएंट | الطراز (variant), plural الطُرُز — never الشكل, which is shape |
| size | tamaño | साइज़ | الحجم |
| property, prop | propiedad | प्रॉपर्टी | الخاصية |
| slot | slot | स्लॉट | المنفذ (slot) |
| event | evento | इवेंट | الحدث |
| anatomy, part | anatomía, parte | संरचना, भाग | البنية، الجزء |
| label | etiqueta | लेबल | التسمية |
| supporting text | texto de apoyo | सहायक टेक्स्ट | النص المساعد |
| placeholder | marcador de posición | प्लेसहोल्डर | النص النائب |
| leading / trailing (start / end side) | inicial / final (lado de inicio / de fin) | शुरुआती / अंतिम (शुरू की ओर / अंत की ओर) | في البداية / في النهاية |
| anchor (of an overlay) | ancla | ऐंकर | نقطة الارتكاز |
| handle, track, indicator | tirador (a sheet's drag handle: tirador de arrastre), pista, indicador — never "control deslizante", which is the Slider | हैंडल, ट्रैक, इंडिकेटर | المقبض، المسار، المؤشر |
| tap, click, press, long press, drag | toque, clic, pulsación, pulsación larga, arrastre | टैप, क्लिक, दबाना, देर तक दबाना, ड्रैग | نقرة (لمس)، نقرة، ضغط، ضغط مطوَّل، سحب |
| default | predeterminado | डिफ़ॉल्ट | افتراضي |
| opt in | optar por / activar de forma explícita | ऑप्ट-इन | اختياري التفعيل |
| right-to-left | de derecha a izquierda (RTL) | दाएँ से बाएँ (RTL) | من اليمين إلى اليسار (RTL) |

## Section headings of a component page: Spanish, Hindi and Arabic

| English | Spanish | Hindi | Arabic |
|---|---|---|---|
| Overview | Descripción general | अवलोकन | نظرة عامة |
| Usage | Uso | इस्तेमाल | الاستخدام |
| Specs | Especificaciones | स्पेक | المواصفات |
| Guidelines | Pautas | दिशानिर्देश | الإرشادات |
| When to use | Cuándo usarlo | कब इस्तेमाल करें | متى يُستخدم |
| Choosing a variant | Cómo elegir una variante | वेरिएंट चुनना | اختيار الطراز |
| Do | Recomendado | करें | افعل |
| Don't | Evita | न करें | لا تفعل |
| Content | Contenido | कॉन्टेंट | المحتوى النصي |
| Accessibility | Accesibilidad | सुलभता | إمكانية الوصول |
| What the component handles | De qué se encarga el componente | कंपोनेंट क्या सँभालता है | ما يتكفل به المكوّن |
| What you need to do | Qué debes hacer tú | आपको क्या करना है | ما عليك فعله |

## Component names: Spanish, Hindi and Arabic

As common nouns: page titles, headings, running text. The API name (`Button`, `tanrei-button`) is never translated.

| English | Spanish | Hindi | Arabic |
|---|---|---|---|
| Accordion | Acordeón | अकॉर्डियन | الأكورديون |
| App bar | Barra de la aplicación | ऐप बार | شريط التطبيق |
| App shell | Estructura de la aplicación — short «la estructura» | ऐप शेल | هيكل التطبيق |
| Avatar | Avatar — in running text «el avatar», masculine, lower case | अवतार | الصورة الرمزية |
| Badge | Insignia | बैज | الشارة |
| Bottom sheet | Hoja inferior | बॉटम शीट | اللوحة السفلية |
| Breadcrumbs | Ruta de navegación — short «la ruta» | ब्रेडक्रंब | مسار التنقل |
| Button | Botón | बटन | الزر |
| Button group | Grupo de botones | बटन ग्रुप | مجموعة الأزرار |
| Button with menu | Botón con menú | मेन्यू वाला बटन | زر مع قائمة |
| Calendar | Calendario | कैलेंडर | التقويم |
| Callout | Callout | कॉलआउट | التنويه |
| Card | Tarjeta | कार्ड | البطاقة |
| Carousel | Carrusel | कैरसेल | العرض الدوّار |
| Checkbox | Casilla de verificación | चेकबॉक्स | خانة الاختيار |
| Chip | Chip (el chip) | चिप | الرقاقة |
| Code block | Bloque de código | कोड ब्लॉक | كتلة الشيفرة |
| Color field | Campo de color | कलर फ़ील्ड | حقل اللون |
| Combobox | Cuadro combinado | कॉम्बोबॉक्स | مربع التحرير والسرد |
| Copy button | Botón de copiar | कॉपी बटन | زر النسخ |
| DateTimePicker (the page's title is the API name) | DateTimePicker; in running text selector de fecha y hora | DateTimePicker; in running text तारीख़ और समय पिकर | DateTimePicker; in running text منتقي التاريخ والوقت |
| Description list | Lista de descripciones | डिस्क्रिप्शन लिस्ट | قائمة الوصف |
| Dialog | Diálogo | डायलॉग | مربع الحوار |
| Divider | Divisor | डिवाइडर | الفاصل |
| Empty state | Estado vacío | ख़ाली स्टेट | الحالة الفارغة |
| FAB menu | Menú FAB | FAB मेन्यू | قائمة FAB |
| Field | Campo | फ़ील्ड | الحقل |
| Field group | Grupo de campos | फ़ील्ड ग्रुप | مجموعة الحقول |
| File item | Elemento de archivo | फ़ाइल आइटम (masculine) | عنصر الملف, with `(file item)` on the page's first mention; plural `عناصر الملفات`; short `العنصر` |
| File picker (the component) | Selector de archivos — the platform's own is «el selector de archivos de la plataforma» | फ़ाइल पिकर — the platform's own is प्लैटफ़ॉर्म का फ़ाइल पिकर | منتقي الملفات, with `(file picker)` on the page's first mention; the platform's own is `منتقي الملفات الخاص بالمنصة`, short `المنتقي` |
| Drop zone (a wrapper that takes files dropped anywhere on it; not the File picker's drop area) | Zona de soltar archivos — feminine, short «la zona»; the picker's drop area stays «la zona para soltar del selector de archivos» | ड्रॉप ज़ोन — masculine, short ज़ोन; not ड्रॉप एरिया | ساحة الإفلات, with `(drop zone)` on the page's first mention, short `الساحة`, feminine; not `منطقة الإفلات` |
| File upload | Subida de archivos — in running text «el control de subida de archivos», short «el control de subida»; «carga» is loading (Indicador de carga), and the product verb is «Subir» | फ़ाइल अपलोड | رفع الملفات — in running text «مكوّن رفع الملفات», short «المكوّن»; «التحميل» is loading (مؤشر التحميل) |
| Figure | Figura | फ़िगर | الشكل التوضيحي — always the full compound: الشكل alone is shape |
| Image preview | Vista previa de imágenes — in running text «la vista previa de imágenes», short «la vista previa» (feminine) | इमेज प्रीव्यू (masculine), short प्रीव्यू | معاينة الصور, with `(image preview)` on the page's first mention; short `المعاينة` (feminine) |
| Inline code | Código en línea | इनलाइन कोड | الشيفرة المضمَّنة |
| Keyboard shortcut | Atajo de teclado | कीबोर्ड शॉर्टकट | اختصار لوحة المفاتيح |
| Link | Enlace | लिंक | الرابط |
| Link card | Tarjeta de enlace | लिंक कार्ड | بطاقة الرابط |
| List | Lista | लिस्ट | القائمة (list) — `Menu` is قائمة الخيارات |
| List row | Fila de lista — its parts: sobretítulo (overline), titular (headline), texto de apoyo, texto final | लिस्ट पंक्ति — its parts: ओवरलाइन, हेडलाइन, सहायक टेक्स्ट, अंतिम टेक्स्ट | صف القائمة — its parts: السطر العلوي (overline)، العنوان الرئيسي (headline)، النص المساعد، النص في النهاية |
| Loading indicator | Indicador de carga | लोडिंग इंडिकेटर | مؤشر التحميل |
| Main action button | Botón de acción principal | मुख्य ऐक्शन बटन | زر الإجراء الرئيسي |
| Menu | Menú | मेन्यू | قائمة الخيارات |
| Menubar | Barra de menús | मेन्यू बार | شريط القوائم |
| Meter | Medidor | मीटर | العدّاد |
| Navigation bar | Barra de navegación | नेविगेशन बार | شريط التنقل |
| Navigation drawer | Panel de navegación | नेविगेशन ड्रॉअर | درج التنقل |
| Number field | Campo numérico | नंबर फ़ील्ड | حقل العدد |
| One-time-code input | Entrada de código de un solo uso — feminine, short «la entrada»; «Campo de código de un solo uso» is the One-time-code field, and neither is shortened to «campo de código», which is the text field of `type="code"` | वन-टाइम कोड इनपुट | حقل إدخال الرمز لمرة واحدة — short «حقل الرمز»; never «حقل الشيفرة», which is the text field of `type="code"` |
| Page header | Cabecera de página | पेज हेडर | رأس الصفحة |
| Pagination | Paginación | पेजिनेशन | التنقل بين الصفحات |
| Previous and next links | Enlaces anterior y siguiente — plural, «los enlaces» | पिछला और अगला लिंक | روابط السابق والتالي |
| Popover | Popover — in running text «el popover», masculine, lower case | पॉपओवर | اللوحة المنبثقة |
| Progress indicator | Indicador de progreso | प्रोग्रेस इंडिकेटर | مؤشر التقدم |
| Radio button | Botón de opción | रेडियो बटन | زر الاختيار |
| Radio group | Grupo de botones de opción | रेडियो ग्रुप | مجموعة أزرار الاختيار |
| Search | Búsqueda | खोज | البحث |
| Segmented button | Botón segmentado | सेगमेंटेड बटन | الزر المقسَّم |
| Select | Select — in running text «el select», masculine, lower case | सिलेक्ट | عنصر الاختيار — the bare control; «حقل الاختيار» is the Select field |
| Side sheet | Hoja lateral | साइड शीट | اللوحة الجانبية |
| Skeleton | Esqueleto | स्केलेटन | هيكل التحميل |
| Slider | Control deslizante | स्लाइडर | شريط التمرير |
| Snackbar | Snackbar — in running text «el snackbar», masculine, lower case | स्नैकबार | شريط الإشعار (Snackbar) |
| Steps | Pasos | चरण | الخطوات |
| Switch | Interruptor | स्विच | مفتاح التبديل |
| Tab view | Vista de pestañas | टैब व्यू | عرض التبويبات |
| Table | Tabla | टेबल | الجدول |
| Table of contents | Tabla de contenido | विषय सूची | جدول المحتويات — never shortened to الجدول |
| Tabs | Pestañas | टैब | علامات التبويب |
| Tag | Tag — in running text «el tag», masculine, lower case, like «el chip»; «etiqueta» is only `label`, never the component | टैग | الوسم |
| Tag group | Grupo de tags | टैग ग्रुप | مجموعة الوسوم |
| Text field | Campo de texto | टेक्स्ट फ़ील्ड | حقل النص |
| Timeline | Línea de tiempo | टाइमलाइन | الخط الزمني |
| Toolbar | Barra de herramientas | टूलबार | شريط الأدوات |
| Tooltip | Tooltip — in running text «el tooltip», lower case | टूलटिप | التلميح |
| Tree view | Vista de árbol | ट्री व्यू | العرض الشجري |

In Spanish, further choices of the quality pass: a layer *extends* the vocabulary with «extender» / «extensión» (not «ampliar»); a handler is «controlador (de eventos)»; an ancestor is «ancestro»; a binding stays «binding»; the back gesture, button or action of a platform is «de retroceso»; a right-to-left layout is «un diseño de derecha a izquierda»; a setting as a common noun is «un ajuste», while the product label *Settings* is «Configuración».

Product text inside Spanish samples and demos uses the infinitive for actions and sentence case: Guardar, Cancelar, Aceptar (OK), Listo (Done), Cerrar, Atrás, Siguiente, Eliminar (delete), Quitar (remove), Borrar (clear), Descartar, Deshacer, Rehacer, Buscar, Borrar búsqueda, Configuración, Iniciar sesión, Cerrar sesión, Añadir, Nuevo, Crear, Editar, Compartir, Copiar, Cortar, Pegar, Subir, Descargar, Enviar, Responder, Archivar, Mover a la papelera, Redactar, Bandeja de entrada (as a one-word bar label: Recibidos), Enviados, Más opciones, Inicio, Perfil, Cuenta, Correo electrónico, Contraseña, Mes anterior, Mes siguiente, Elegir año, Hoy, Activado / Desactivado, Obligatorio / Opcional. Messages address the person as «tú»; questions open with «¿».

In Spanish, the pages of the link, callout, table, inline code, code block and copy button fixed these:

| English | Spanish |
|---|---|
| Link (the component) | Enlace; a standalone link is «un enlace por sí solo», a glyph alone «un glifo solo», the new-tab mark «la marca»; to follow a link is «seguir» |
| Callout | Callout — in running text «el callout», masculine, lower case, like «el snackbar»; what it carries is «un aviso» (a notice), a caution is «una precaución», a tip «un consejo»; a live callout is «un callout activo» |
| Table | Tabla — caption: leyenda; header row / footer row: fila de encabezado / fila de pie; column header / row header: encabezado de columna / de fila; header cell: celda de encabezado; stripes, striped: franjas, con franjas; a table a person scans: «que se recorre con la vista»; a column or header that stays: «se queda», «se mantiene a la vista» |
| Inline code | Código en línea |
| Code block | Bloque de código |
| Copy button | Botón de copiar — its three forms are «formas»: en reposo, copiado, fallido; icon-only / labelled: de solo icono / con etiqueta; the check: marca de verificación |
| code face / text face | tipo de letra de código / del texto |
| run (of code, of syntax) | tramo; a piece of a run that wraps is «un trozo» |
| highlighter; highlighted (code, a line) | resaltador; resaltado, línea resaltada — marked lines are «líneas marcadas», added / removed lines «añadidas / eliminadas» |
| syntax role; plain (text with no role) | rol de sintaxis; sin rol |
| scope (a highlighter's) | ámbito, with «(scopes)» on a page's first mention |
| prompt (of a command line) | prompt, masculine: «el prompt» |
| look (a `variant` that is one) | aspecto — the names `tonal`, `plain`, `filled`, `outlined` stay as values, in captions too |
| heading (an element of the document's outline), where it must be told from a component's title | encabezado; the outline is «el esquema»; «título» is the component's own title |
| measure (of prose) | medida |
| wrap (text, a line, a row of actions) | saltar de línea; a word or an identifier that breaks: partirse; text that is truncated: cortarse |
| politely / assertively (a live region) | de forma cortés / de forma asertiva |
| clipboard | portapapeles |
| crawler; find-in-page | rastreador; la búsqueda en la página |
| reported in debug builds | las compilaciones de depuración lo notifican |
| "What the web draws differently" (heading) | Qué dibuja la web de otra manera |
| planned, nothing ships there yet (a platform) | están planificados … todavía no se distribuye nada para ellos |

Product text in these pages: Copiar / Copiado / No se pudo copiar, Copiar enlace / Enlace copiado, Volver a cargar, Mostrar de nuevo, Ver el código fuente, Primeros pasos, Página anterior, «se abre en una pestaña nueva»; status words Información, Advertencia, Error, Correcto; Nota, Consejo, Peligro; a marked line's label agrees with «línea» (Resaltada, Añadida, Eliminada). Sample figures of four digits are written without a separator (`1204`), which is right in Spanish and cannot be read as a decimal.

In Spanish, the terms the translators of the later component pages proposed, applied from what the pages say:

| English | Spanish |
|---|---|
| stepper (a flow of steps) / stepper (of a number field) / spin button | indicador de pasos, with «(stepper)» on a page's first mention / botón de paso / botón de número (spin button) |
| marker / connector / pill (steps, timeline, table of contents) | marcador / conector / píldora |
| fact / term / value (a description list); figure (a number shown large) | dato / término / valor; cifra — «figura» is only the component |
| layout (the `layout` of a description list, of a group) | disposición; the value stays («la disposición stat») |
| frame / stage / attachment (a figure) | marco / escenario / bloque adjunto |
| fold (a panel, a trail of levels) | plegar, plegarse; the noun is pliegue |
| trailing text / trailing content | texto final / contenido final |
| trigger (of a select), opener (of a popover) | activador; the prop stays `opener` |
| option; chosen option / active option; active descendant | opción; la opción elegida / la opción activa; descendiente activo |
| combobox (the role) / list box | cuadro combinado / cuadro de lista |
| chevron | chevron, masculine: «el chevron» |
| requirement (required or optional): the mark / the tag / the required mark | marca de obligatoriedad / tag de obligatoriedad / marca de obligatorio — the tag is «tag», never «chip» or «etiqueta» |
| help (a field's line) / error text | ayuda / texto de error |
| invalid (the exposed state); error condition | no válido; estado de error |
| controlled (component) | componente controlado |
| top layer | capa superior |
| current item (a table of contents) / indent | elemento actual / sangría |
| pointer target / touch target | objetivo del puntero / objetivo táctil |
| skip link / window class | enlace de salto / clase de ventana; the values `compact`, `medium`, `expanded` stay |
| aside (a region) / main (a region) | contenido complementario / contenido principal |
| input (the part of a field) | campo de entrada |
| commit (a value, a text); committed value; custom value | confirmar; valor confirmado; valor propio |
| match (in a filtered list) | coincidencia |
| status row (search, combobox) / status line (table, skeleton) | fila de estado / línea de estado |
| busy (a list, a table) | ocupada |
| an input method is composing | un método de entrada está componiendo |
| first paint / frame (of animation) / style sheet / namespace | primer pintado / fotograma / hoja de estilos / espacio de nombres |
| plain (code drawn without highlighting) / grammar / language (of code) | sin resaltar — «sin rol» stays for text with no role / gramática / lenguaje |
| named / decorative (an avatar, a glyph) | con nombre / decorativo |
| fallback (what an avatar draws without a picture) / box | respaldo / caja |
| under way (an event); Done / In progress / Not started | en curso; Completado / En curso / Sin empezar |
| level (of a trail) / overflow button / separator / underline | nivel / botón de desbordamiento / separador / subrayado |
| parent / leaf (a tree) | padre / hoja |
| picker button / entry error (a color field) | botón del selector / error de entrada |
| link item (a menu) / a new context / modifier key / middle click | elemento de enlace / un contexto nuevo / tecla modificadora / clic con el botón central |
| media (the empty state's slot) | gráfico — «contenido multimedia» stays the List's |
| "Tanrei ships no words of its own" | «Tanrei no incluye textos propios»; the page is «Textos» |
| member (of a group) | miembro |
| external link / origin (of a site) | enlace externo / origen |
| sideways (scroll, drag, swipe) | hacia los lados; one movement is «hacia un lado» |
| imitation preset / measurement (of a preset's contrast) | preajuste de imitación / medición |
| pulse / wave (a skeleton's motion) | pulso / ola — «onda» stays the ripple |
| reorder; reorderable list; Move up / Move down | reordenar; lista reordenable; «Mover hacia arriba» / «Mover hacia abajo» |
| sort; sortable column | ordenar, the heading is «Ordenación»; columna que se puede ordenar |
| mixed (what a checkbox of a selection says) | indeterminada |
| a switch (the assistive device) | pulsador |
| "Known gaps on the web" / "What you write" (headings) | Carencias conocidas en la web / Qué escribes |
| cell / active cell / group mark (a one-time-code input) | celda / celda activa / marca de grupo |
| tabular figures / full-width (digits, letters) / insertion point | cifras tabulares / de ancho completo / punto de inserción |
| a window of candidates (an input method's) | ventana de candidatos |
| code field (a text field of `type="code"`) / code face | campo de código / tipo de letra de código |
| a line (of code) that wraps / does not wrap | continúa en las filas siguientes / no continúa en otra fila — «línea» is the code's, «fila» what is drawn; prose still «salta de línea» |
| tab character / tab stop (of a tab character) / ligature / spelling check | carácter de tabulación / posición de tabulación («parada de tabulación» is a stop of the focus) / ligadura / revisión ortográfica |
| trigger (a file upload's button) / drop area / file picker | activador / zona para soltar / selector de archivos |
| kept file / refused file / failed row / limits | archivo conservado / archivo rechazado / fila fallida / límites |
| product text of a file upload | Elegir un archivo, Elegir archivos, Ningún archivo elegido, Arrastra archivos aquí o elígelos, Quitar, Reintentar, En espera / Subiendo / Subido, Se perdió la conexión., Supera los 10 MB., Archivo adjunto; a size is written as `Intl.NumberFormat('es')` writes it («3,4 MB») |
| product text of a one-time code | Código de verificación, Código de inicio de sesión, Código de vinculación, «Introduce el código de 6 dígitos que enviamos a tu teléfono.» |
| bar item (a menubar's entry that acts) / entry / title (of a menu in the bar) / overflow item | elemento de barra / entrada / título / elemento de desbordamiento — a link item is «elemento de enlace», as in the Menu; «Entries that act» is «Entradas que actúan» |
| access key / default button (of a form) / submit button / speech input | tecla de acceso / botón predeterminado / botón de envío / entrada por voz; to submit is «enviar», to reset «restablecer»; an event listener is «listener», a handler «controlador» |
| product text of a menubar | Menú de la aplicación, Más menús, Más; Archivo, Editar, Ver, Formato, Ayuda; Nuevo, Abrir…, Abrir recientes, Guardar, Imprimir…, Deshacer, Rehacer, Regla, Comentarios, Zoom, Acercar / Alejar, Negrita, Atajos de teclado, Acerca de; Ejecutar, Documentación, Código fuente, Historial |
| form (of a file item: `row`, `tile`) / row / tile / box (of a tile) / strip (of pictures, of tiles) | forma / fila / mosaico / recuadro / tira |
| body (of a file item) / pressable / the bar (a file's progress) / under way (no `progress`) | cuerpo / pulsable / barra / en curso |
| kind (of a file, by its glyph) / media type / ending (of a file's name) / format | categoría — «Tipo» stays the table heading elsewhere; here it would collide with «tipo de medio» / tipo de medio / terminación («extensión» only where the English says extension) / formato |
| **Used in** / **Built from** / **Built with** (lead-ins of a composed element and its members) | **Se usa en** / **Se compone de** / **Construida con** (agrees with the component) |
| member (of a composed element) / One level down / Setting one … apart (headings) | miembro / Un nivel más abajo / Diferenciar una sola vista previa, Diferenciar un solo control de subida |
| opener (of an image preview) / stage / caption / thumbnail / the count's sentence | activador / escenario / leyenda / miniatura / la frase del recuento |
| zoom / zoom in, zoom out (controls) / at fit / step (of the zoom) / pinch / trackpad / wheel | zoom / acercar, alejar / con el tamaño ajustado / paso / pellizco / panel táctil / rueda |
| product text of an image preview and a file picker | Cerrar, Acercar, Alejar, Imagen anterior, Imagen siguiente, «{position} de {count}», Cargando imagen, No se pudo cargar esta imagen, «Ampliar: …»; Adjuntar, Adjuntar un archivo, Elegir fotos, Arrastra fotos aquí o elígelas, Archivo de capa |
| One-time-code field / One-time-code input (the components) / the frame (a field around a control) / the bare control (an advanced component) | Campo de código de un solo uso (masculine) / Entrada de código de un solo uso (feminine, «la entrada») / marco; to frame is «enmarcar» / «el control sin nada más» — heading «Diferenciar un solo campo»; an arrangement the composed element does not offer is «una organización»; a file's `fit` in running text is «el encaje de la imagen»; product text: Código de respaldo, PIN de la carta, «El código no es correcto. Revisa el mensaje e inténtalo de nuevo.» |
| The components of the three levels: Text input / Number input / Color input / Embedded text input / Select field / Combobox field / Slider field / Chip field / Checkbox group / Chat composer | Entrada de texto / Entrada numérica / Entrada de color / Entrada de texto incrustada (all feminine, short «la entrada») / Campo de selección (the select, «el select», inside a field) / Campo de cuadro combinado / Campo de control deslizante / Campo de chips / Grupo de casillas de verificación / Cuadro de redacción de chat, short «el cuadro de redacción» — an «entrada de …» is the bare control and a «campo de …» is the field around it; «campo de entrada» stays the native part (`<input>`) |
| Terms of the pages of the three levels: bare (a select, a combobox) / written by hand / the pair by hand / a block as wide as its place / the box / floating label / the count (`countText`) / kebab-case / a flick (image preview) / a field group's kind / "Setting one group apart" | sin nada más («un select sin nada más») / escrito a mano / the members are named, «el campo y la entrada de texto escritos a mano», and the table column is «Escrito a mano» / un bloque tan ancho como el lugar en el que se pone / la caja / etiqueta flotante / recuento («contador» is the `counter` setting) / en kebab-case / un gesto rápido / tipo («cuyo tipo es radio-group») / Diferenciar un solo grupo — headings «Alrededor de una entrada de texto», «Alrededor de un select», «En un campo, a mano», «Qué es del select y qué es del campo» |
| More terms of those pages: holder (of an embedded text input) / capsule / typing area / the typing / the typing part (of a box with entries) / entry (a chip field's) / to take an entry back / select-all checkbox / swatch / the value in words, value text / en dash / written out ("a text field written out") / "alone" (the box of a field, alone) | soporte / cápsula / área de escritura / la escritura / la parte donde se escribe / elemento («elemento de la lista» where the HTML element is near; «entrada» is what a form submits, and the component) / devolver a la parte donde se escribe (para cambiarlo) / casilla de seleccionar todo / muestra / el valor con palabras, texto del valor / raya corta / escrito por extenso / sola, solo («la caja de un campo de texto, sola») — headings «Sin nada más, sin un campo», «Lo que ya se introdujo», «Lo que debe poner el soporte», «El valor con palabras», «Una casilla que las marca todas», «Cambiar un elemento», «Enviar tú los archivos»; a live region is «región activa»; keys: Retroceso, Supr, Mayús, Comando, Re Pág; product text: Mensaje, Escribe un mensaje, Enviar, Adjuntar archivos, Reintentar, Mencionar a alguien, Añadir un emoji; Destinatarios, «Quitar {entry}», «Se añadió {entry}», «Se añadieron {count}», «Se quitó {entry}», «Separa las direcciones con una coma.», «Esa ya está en la lista.»; Avísame por, «Elige todas las opciones que correspondan.», Todos los días laborables; Filtrar tokens, Buscar un token, Nombre visible, «Cantidad, escritorio de roble», «Elegir el color de Primario, tono 40», Sin coincidencias, Borrar ciudad |
| Terms of the tabs' tonal row, the error text and the input box: tonal (the tabs' variant) / track; a row without its track / `transition` (of the tabs, of a tab view) / small, medium (a row's `size`) / header (a region a row stands in) / the requirement tag is a Tag / the error text below the help / a place (`{name}`) in a word; a brace, a doubled brace; a single brace / a number and its unit, one piece of writing; a unit's own script; right-to-left mark / input box (`comp.input-box`) / error form (of a radio button, a checkbox) | variante tonal, «pestañas tonales», «una fila tonal» — the table row is «Tonal», beside «Primary» and «Secondary»; its indicator is «una capa translúcida», a quiet mark «una marca discreta» / pista; «una fila sin su pista» / transición, heading «La transición»; the values `slide`, `fade`, `none`, `auto` stay; a crossfade is «fundido cruzado», the panels' travel «recorrido», a panel that gives way «deja paso» / «una fila pequeña», «una mediana», «el tamaño pequeño»; the table rows are «Small» and «Medium», heading «Tamaños» / cabecera («encabezado» is a heading, and the heading of a code sample) / «el tag de obligatoriedad es un tag pequeño, con relleno para lo obligatorio y tonal para lo opcional»; «los tags de obligatorio y de opcional» / «la ayuda se queda y el texto de error se añade debajo de ella», «se dibuja debajo de la ayuda, que se queda»; the gap between them is «una pequeña separación» / hueco: «un texto con huecos» (heading), «el componente rellena los huecos»; llave, «entre llaves», «escríbela dos veces», «una llave suelta» — the List page still says «marca tres lugares» for the same thing / «un número y su unidad son una sola pieza de escritura»; «la escritura de la propia unidad», «en letras o signos latinos»; marca de derecha a izquierda (U+200F) / caja de entrada: «`comp.input-box.*` para la caja, que leen todas las cajas de entrada» — «campo de entrada» stays the native part / forma de error («estado de error» is the error condition); a checkbox's box is «recuadro», the radio button's «el anillo y el punto»; product text: Periodo, Día / Semana / Mes, Estándar / Medio / Alto, Contraseña, «Al menos 8 caracteres, con un número.», «Esta contraseña es demasiado corta.», `{position} de {count}`, `Añadidos: {count}`, «1–20 de 132» |

Where the Japanese page of a component already uses another title than this table, the page is right and the table is corrected: the table was written from the pages.

In Simplified Chinese, the slider's *handle* is 滑块的手柄 on the Slider's own page, where 滑块 is the component.

In Simplified Chinese, the terms the translators of the component pages proposed, applied from what the pages say:

| English | Simplified Chinese |
|---|---|
| Figure (the component) | 图示 |
| Popover, against a platform's own popup | 弹出框; 弹出层 stays a platform's popup layer |
| Page header, against a header | 页头 is the component; 页眉 is a header (of a sheet, a figure, a popover, the shell's region); the header of an accordion item is 标题行 |
| heading (the element), where it must be told from a title | 标题元素; 标题 is the title |
| fires, emits (an event) | 触发; 发出请求 is "asks", "makes a request" |
| running text | 连续文本; 正文 is body text |
| politely / assertively (a live region) | 以礼貌（polite）的方式 / 以立即打断（assertive）的方式, the gloss on a page's first mention; 强制 only for forced colors |
| forced colors / live region | 强制颜色模式 / 实时区域 |
| debug build | 调试构建 |
| status (of a callout, a tag) | 语义状态 |
| anchor (the `<a>` element) | 锚元素; 锚点 stays an overlay's anchor |
| requirement tag / requirement mark | 必填和选填小标签 (“必填”小标签, “选填”小标签) / 必填和选填标记 — 小标签, never 小纸片 |
| help (a field's line) / supporting text / error text | 帮助文本 / 辅助文本 / 错误文本 |
| option; active option; list box; trigger | 选项; 活动选项; 列表框; 触发器 |
| chevron / check (the mark of the chosen option) | V 形箭头 / 对勾 |
| typing / caret / an input method is composing | 键入 / 插入点 / 输入法正在组合 |
| commit (a value, a text) | 确认; 提交 is submitting a form |
| status row (search, combobox), status line (table) | 状态行 |
| skip link / window class / aside (the shell's region) | 跳过链接 / 窗口类别 / 侧栏 — 侧边栏 is the navigation drawer as a sidebar |
| stepper (a flow of steps) / stepper (of a number field) / spin button | 步骤条（stepper） / 步进按钮 / 微调按钮（spin button） |
| marker / connector / pill | 标记 / 连接线 / 胶囊形 |
| term / value / fact (a description list) | 项名 / 值 / 一项信息 |
| frame / stage / attachment / specimen (a figure) | 外框 / 展示区 / 附加块 / 样张 |
| measure (of prose) | 行长 |
| row header / column header / header cell; header row / footer row; caption; stripes | 行标题 / 列标题 / 列标题单元格; 表头行 / 表尾行; 说明文字; 条纹 |
| run / highlighter / scope / grammar / prompt / plain (a code block) | 片段 / 语法高亮器 / 作用域（scope） / 文法 / 提示符 / 普通文本 |
| form (the copy button's three); icon-only / labelled | 形态; 纯图标 / 带标签 |
| swatch / picker button / overflow button | 色块 / 选择器按钮 / 溢出按钮 |
| level (of a trail) / separator; parent / leaf (a tree) | 层级 / 分隔符; 父项 / 叶子项 |
| member (of a group) / touch target | 成员 / 触摸目标 |
| external link / host (of an address) / inert | 外部链接 / 主机名 / 惰性（inert） |
| media (the empty state's slot) | 媒体 |
| words (a product's); "Tanrei ships no words"; "once for the whole product" | 文字, 产品的文字; Tanrei 不自带任何文字; 为整个产品只给一次 |
| your product's language | 你的产品的语言 |
| placeholder (of a skeleton) / placeholder row; busy; pulse / wave | 占位符 / 占位行; 忙碌; 脉冲 / 波浪 |
| sort; reorder; Move up / Move down | 排序; 调整顺序 (not 重新排序); 上移 / 下移 |
| "What you write" / "Known gaps on the web" (headings) | 你要写的内容 / Web 上的已知差距 |
| product text: Required / Optional; Copy / Copied / Could not copy; On this page; No matches; opens in a new tab | 必填 / 选填; 复制 / 已复制 / 无法复制; 本页内容; 无匹配项; 在新标签页中打开 |
| a sample person | 李华 |
| bar item (a menubar's entry that acts) / entry / title (of a menu in the bar) / overflow item | 栏项 / 条目 / 标题 / 溢出项 — a link item is 链接项, as in the Menu; «Entries that act» is 直接起作用的条目; access keys are 访问键 |
| product text of a menubar | 应用菜单, 更多菜单, 更多; 文件, 编辑, 视图, 格式, 帮助; 新建, 打开…, 最近打开, 保存, 打印…, 撤销, 重做, 剪切, 复制, 粘贴, 标尺, 批注, 缩放, 放大 / 缩小, 加粗, 键盘快捷键, 关于; 运行, 文档, 源代码, 历史记录 |
| Image preview (the component) | 图片预览 |
| One-time-code field (the component) / the frame (a field around a control) / the bare control (an advanced component) | 一次性验证码字段 / 框架 / 不带任何附加功能的控件 — exposed (to assistive technology) is 暴露, a focus stop 焦点停靠点, and to draw 绘制 on these pages too |
| form (of a file item: `row`, `tile`) / row / tile / box (of a tile) / strip (of pictures, of tiles) | 形式 / 行 / 图块 / 方框 / 一排（图片、图块） |
| body (of a file item) / pressable / the bar (a file's progress) / under way (no `progress`) | 主体 / 可按下 / 进度条 / 进行中 |
| kind (of a file, by its glyph) / media type / ending (of a file's name) / format | 种类 / 媒体类型 / 后缀（扩展名 only where the English says extension）/ 格式 |
| drop area / trigger / limits / kept file / refused file / failed row / room that is left | 拖放区域 / 触发器 / 限制 / 保留的文件 / 被拒绝的文件 / 失败的行 / 剩余的名额 |
| **Used in** / **Built from** / **Built with** (lead-ins of a composed element and its members) | **使用它的组件**是… / **组成部分**是… / **用到的组件**有… |
| member (of a composed element) / One level down / Setting one … apart (headings) | 成员 / 下一层 / 单独调整某一个… |
| opener (of an image preview) / stage / caption / thumbnail / the count's sentence / the bar (of an image preview) | 打开它的元素 / 展示区 / 说明文字 / 缩略图 / 计数的句子 / 顶栏 |
| zoom / zoom in, zoom out / at fit / step (of the zoom) / pinch / trackpad / wheel | 缩放 / 放大、缩小 / 适应大小时 / 缩放级别 / 双指张合 / 触控板 / 滚轮 |
| product text of a file upload, a file picker and an image preview | 选择文件, 未选择文件, 将文件拖到此处，或选择文件, 移除, 重试, 等待中 / 正在上传 / 已上传, 连接已断开。, 超过 10 MB。, 附件, 添加附件, 选择照片; 关闭, 放大, 缩小, 上一张图片, 下一张图片, “第 {position} 张，共 {count} 张”, 正在加载图片, 无法加载这张图片, “放大：…” |
| default button (of a form) / submit button; a button "sends" its form; a disabled default button "stops" Enter | 默认按钮 / 提交按钮; 提交表单; 拦住 Enter |
| a name longer than the label (a Button's `label` beside drawn text); drawn text; speech input | 比标签更长的名称; 画出的文字; 语音输入 — the sample name is “移除 Inter”, the drawn word first, without a colon |
| The components of the three levels, named as the One-time-code pair is: a "… input" is the bare control, …输入框; a "… field" is the Field around it, …字段 — Text input / Number input / Color input / Embedded text input | 文本输入框 / 数字输入框 / 颜色输入框 / 嵌入式文本输入框 (short 嵌入式输入框) — beside its field an input is 输入框, and the box it draws is 输入框的方框, short 方框 |
| Select field / Combobox field / Slider field / Chip field / Checkbox group / Chat composer | 下拉选择字段 / 组合框字段 / 滑块字段 / 纸片字段 / 复选框组 / 聊天输入栏 (short 输入栏) — the bare Select, Combobox and Slider stay 下拉选择框, 组合框, 滑块 |
| holder (of an embedded text input) / capsule / typing area (a chat composer) / the typing, the typing part (of a box with entries) | 宿主 / 胶囊 / 输入区 / 键入的部分, 键入部分 |
| bare (a control without its field) / to frame (a control) / "… written out" (a text field written out) / "In a field, by hand", "Bare, without a field" (headings) | 单独使用 / 用字段框住 / 拆开来写 / 手写在字段里, 单独使用，没有字段 |
| entry (a chip field's) / to take an entry back / candidate / select-all checkbox / indeterminate, mixed (what it says) / the value in words, value text | 条目 / 放回键入部分（去修改）— 移除 is the other action / 候选条目 / 全选复选框 / 半选, “混合” / 用文字写出的值, 值文本 |
| product text of the three levels' pages | 筛选令牌, 查找令牌, 显示名称, “数量，橡木书桌”, “主色，色调 40”, “选择‘主色，色调 40’的颜色”, 缩放比例, 文字大小, “税前年收入”; 收件人, “移除 {entry}”, “已添加 {entry}”, “已添加 {count} 项”, “已移除 {entry}”, 用逗号分隔各个地址。, 这个地址已经在列表里了。; 通知方式, 可多选。, 报告发送日, 每个工作日; 消息, 输入消息, 发送, 添加附件, 重试, 提及某人, 添加表情 |
| Text field / Number field / Color field (the components) | 文本字段 / 数字字段 / 颜色字段 — the inputs are the names in 输入框. 文本框 is only the role a screen reader says (text box) — and a typeface's own text box, on the Inline code page. "A text input" that is no component (any control text is typed in) is 文本输入控件, 可以输入文本的控件 |
| return key (of an on-screen keyboard) | 换行键 — Enter stays Enter |
| Terms of the tabs' tonal row: the tabs' `tonal` variant / `track`, a row without its track / `transition` (of the tabs, of a tab view) / small, medium (a row's `size`) / "seen by the same step on every surface" | 柔和变体, in a table 柔和（tonal） beside 主要（primary） and 次要（secondary）; the Tag's `tonal` stays 柔和的填充, or the value in Latin where filled and tonal are named together / 轨道, 不带轨道的一行 / 过渡 (heading 过渡; the values `slide`, `fade`, `none`, `auto` stay) / 小号, 中号 / 与底色之间都相差同样的一级 |
| the requirement tag is a Tag / the error text below the help / the shared input box (`comp.input-box`), "which every input box reads" | 必填和选填小标签就是一个小号的 Tag (小标签 stays the word; `requiredMark` takes `tag`) / 帮助文本保留，错误文本绘制（加）在它的下方 — never 取代 any more / 输入方框: 方框用 `comp.input-box.*`，每一种输入方框都读取它 — 输入框 stays the bare control and 方框 the box it draws |
| a place (a word's `{name}`) / a word with places / a brace, a doubled brace, a single brace / isolated (a text in a sentence) / whole number, ordinal, plural | 占位标记, as the chip field and the image preview pages already had it / 带占位标记的文字 / 花括号, 连写两个, 单独一个花括号 / 被隔离开 / 整数, 序数词, 复数 (heading 复数) |
| a number and its unit are one piece of writing / right-to-left mark / product text of these pages | 数字和它的单位是连成一体书写的 / 从右到左标记（U+200F） / 密码, 至少 8 个字符，其中包含一个数字。, 这个密码太短。; 时间段, 日 / 周 / 月, 单位, 公制 / 英制; “标准”“中”“高”; `第 {position} 项，共 {count} 项`, `已添加 {count} 项` |

## Terms fixed by the terminology pass

After the first full translation each language rendered some recurring terms in more than one way. One term was chosen for each (the one the language's non-component pages or its site strings in `src/lib/i18n.ts` already used, else the majority of its component pages) and applied to every page. A cell with "·" was not reviewed for that language: when the term comes up there, fill the cell from what its pages use most.

| English | Japanese | Simplified Chinese | Spanish | Hindi | Arabic |
|---|---|---|---|---|---|
| lagging (a platform's status; the site's status label) | 追従待ち | 待跟进 — "until they catch up" is 在跟上之前 | rezagado (van rezagados) | पीछे | متأخر |
| previous revision (what a lagging platform ships) | 以前の版 | 上一版 | revisión anterior | पिछला संशोधन | المراجعة السابقة — never التنقيح, which is "debug" |
| fling | フリング | 快速滑动 | lanzamiento (verb: lanzar) | फ़्लिंग (verb: फ़्लिंग करना) | دفعة سريعة (fling) — the gloss on a page's first mention; fling velocity is سرعة الدفع |
| swipe | スワイプ | 轻扫 | deslizamiento (verb: deslizar) | स्वाइप (verb: स्वाइप करना) | · |
| Tab stop | Tab で止まる位置 | Tab 停靠点 (a focus stop: 焦点停靠点) | parada de tabulación | Tab स्टॉप (Tab order: Tab क्रम) | موضع توقف للمفتاح Tab (a focus stop: موضع توقف للتركيز) |
| landmark (accessibility) | ランドマーク | 地标 | región de referencia (landmark) — the gloss on a page's first mention | लैंडमार्क | مَعلم (landmark), vowelled |
| insets (of the window, the system) | インセット | · | márgenes interiores (de la ventana, del sistema); a safe-area inset is margen del área segura | इनसेट | · |
| typeahead | 先頭文字での移動 | 键入查找 | escritura anticipada | टाइपअहेड | · |
| state hoisting | · | · | elevación de estado | स्टेट होइस्टिंग | رفع الحالة |
| glyph (one symbol of the icon set) | グリフ | 字形 | glifo | ग्लिफ़ | رسم الأيقونة (glyph), short الرسم, plural رسوم — محرف is a character of a font |
| padding | パディング | 内边距 | margen interior — «relleno» is fill only | पैडिंग | الحشو — "inset" is هامش داخلي |
| header (of a drawer, a sheet, a calendar, a file) | ヘッダー | 页眉 | encabezado | हेडर | الترويسة |
| unread | 未読 | · | sin leer | अपठित | غير مقروء |
| vertical / horizontal | · | · | vertical / horizontal | खड़ा / आड़ा (inflected) — वर्टिकल रिदम stays as a term of typography | · |
| axis | · | · | · | अक्ष | · |
| tint, tinted | · | · | tinte | टिंट, टिंट वाला | · |
| concentric | 同心 | · | concéntrico | संकेंद्री | · |
| operated overlay / read overlay | · | · | · | ऑपरेट किया जाने वाला ओवरले / पढ़ा जाने वाला ओवरले | · |
| start edge / end edge | 先頭側の端 / 末尾側の端 | 起始边 / 末尾边 | · | शुरुआती किनारा / अंतिम किनारा | · |
| width classes: Compact, Medium, Expanded (the names `foundations/layout` gives them) | Compact, Medium, Expanded (Latin) | Compact, Medium, Expanded (Latin) | compacta, media, expandida | कॉम्पैक्ट, मीडियम, एक्सपैंडेड | مضغوطة (Compact)، متوسطة (Medium)، موسَّعة (Expanded) — ضيقة is "narrow" |
| a new tab (of the browser) | · | · | pestaña nueva | नया टैब | تبويب جديد — علامة تبويب is the Tabs component's tab |
| handle, thumb (slider, switch) | ハンドル | 手柄 on the Slider's page, 滑块 on a switch | tirador | हैंडल | المقبض |

In Arabic, الشكل is *shape* only; a *variant* is الطراز, and the fixed heading is «اختيار الطراز».

## Hindi: conventions fixed by the quality pass

Hindi interfaces and Hindi developer documentation do not agree with each other on everything (the full stop or the danda, `करें`/`जाएं` or `जाएँ`, `सहेजें` or `सेव करें`). Where they differ, the docs take one form and hold it on every page. These rows say which.

### Writing

| | Rule |
|---|---|
| Loan or Hindi word | A thing a developer names in English at work is transliterated: बटन, मेन्यू, टैब, टोकन, कंपोनेंट, प्रॉपर्टी, इवेंट, स्लॉट, स्टेट, वेरिएंट, थीम, लेआउट, आइकन, लेबल, फ़ोकस, स्क्रॉल, स्वाइप, ड्रैग, टैप, क्लिक, डिफ़ॉल्ट, फ़ाइल, फ़ोल्डर, पेज, स्क्रीन, लिंक, ऐप, ब्राउज़र. An everyday word that Hindi interfaces already use stays Hindi: रंग, आकार (of a thing; the token family is शेप), चौड़ाई, ऊँचाई, किनारा, कोना, पंक्ति (a row), क्रम, चयन / चुनना, खोज, संदेश, खाता, तारीख़, समय, नाम, सूची only in prose about a list of things (the component is लिस्ट), क्रिया (an action; the component's name stays मुख्य ऐक्शन बटन, and ऐक्शन चिप, ऐक्शन कुंजी are names), विकल्प (an option), मान (a value), स्थिति (status), त्रुटि (an error), अक्षम (disabled), सक्रिय (active), कुंजी (a key of the keyboard), व्यक्ति (the person using the product; उपयोगकर्ता where the sentence is about accounts or roles). Never a coined or Sanskritised word for a thing that has a loan in daily use: no संगणक, अभिकल्प, घटक, पृष्ठ, दिनांक, संचिका, गवाक्ष, पटल, अनुप्रयोग, क्षैतिज, ऊर्ध्वाधर, प्रदर्शित करना, निर्दिष्ट करना, प्रदान करना, हेतु, एवं, यदि, किंतु. Say दिखाना, बताना / तय करना, देना, के लिए, और, अगर, लेकिन / पर. |
| Terms the pass made one | `emit` is एमिट करना / एमिट होना and `fire` is फ़ायर करना / फ़ायर होना (never निकलना or भेजना for an event). The platform's back action, button or gesture is बैक (बैक क्रिया, बैक बटन, बैक जेस्चर); "पीछे" in quotation marks is the status name *lagging*, and पीछे without them is the label of a Back button. To keep a prop in step, in sync: सिंक में रखना (never मेल में, which reads as "in the mail"). A press, as a noun, is दबाना (बाहर दबाना, दबाने का असर), not दबाव, which is pressure. Collapsed and expanded, of the navigation drawer: समेटा हुआ / फैला हुआ. Version: वर्शन. Lambda: लैम्ब्डा. A destructive action: विनाशकारी क्रिया; the prop stays `destructive`. A *polite* announcement of a live region: बिना टोके (it waits for what is being read), with `(polite)` after it at its first mention on a page; never विनम्रता से, which reads as "courteously". विनम्र stays for the polite register of a language. |
| Nuqta | Always written, as a combining sign, in loans from English, Persian and Arabic: ज़ (डिज़ाइन, साइज़, ज़रूरी, ज़्यादा, चीज़, रोज़, ज़ूम, ब्राउज़र), फ़ (फ़ाइल, फ़ोकस, फ़ॉन्ट, फ़ील्ड, फ़िल्टर, सिर्फ़, साफ़, ऑफ़, हफ़्ता), क़ (क़ीमत, तरीक़ा, बाक़ी, लायक़, नक़्शा, फ़र्क़), ख़ (ख़ुद, ख़ाली, ख़त्म, आख़िरी), ग़ (ग़लत, बग़ल). ड़ and ढ़ are letters of Hindi, not nuqta spellings, and are always written. |
| Nasal sign | The chandrabindu where the standard spelling has it and no matra sits above the line: हटाएँ, जाएँ, दबाएँ, दिखाएँ, यहाँ, वहाँ, जहाँ, ऊँचाई, पाँच, दाएँ, बाएँ, माँगना, सँभालना. The anusvara above a matra and for a homorganic nasal: करें, हैं, में, नहीं, खोजें, कंपोनेंट, बंद, अंत. Never हटाएं / जाएं. |
| English vowels | ऑ for the open o (ऑफ़, डिफ़ॉल्ट, फ़ॉन्ट, कॉपी, कॉलम, ड्रॉअर, प्रॉडक्ट, कॉन्टेंट), ऐ for the a of "app" and "action" (ऐप, ऐक्शन, ऐंकर, ऐट्रिब्यूट, प्लैटफ़ॉर्म, टैब, बैज), never ए for either. मेन्यू, never मेनू. |
| Sentence end | The danda `।`, with no space before it and one after; never a full stop after Devanagari. `?` and `!` as in English. A heading, a table cell that is not a sentence, a label and a button's text end with nothing. |
| Other punctuation | Western comma, colon, semicolon and parentheses. A term or a product's string quoted in prose takes straight double quotes, `"हटाएँ"`, on every page; curly quotation marks are not used. The em dash of the English is a comma, a colon or two sentences more often than a dash; where it stays, it is `—` with a space on each side. No slash between two Hindi words where या reads better. |
| Digits and units | Western digits everywhere (`48`, `200%`, `4.5:1`), never Devanagari digits. A unit follows as in the source, without a space (`48px`, `200ms`). Counts are digits with the Hindi noun: `3 टैब`, `5 प्लैटफ़ॉर्म`; एक and दो may be words in running prose. |
| Spaces | One space between Devanagari and a Latin word, a number or inline code, on both sides; a postposition is its own word after them (`Tanrei में`, `` `variant` का ``, `48 से`). No space before `,` `:` `;` `।` `)`. |
| Plural of a loan | A loan does not take the English plural: टैब, not टैब्स; बटन, not बटन्स; सेटिंग, not सेटिंग्स. The direct plural of a loan is the same word (`3 बटन`, `ये टेबल`). The oblique plural is inflected only where everyday Hindi inflects the word, which in these pages is बटनों, पैकेजों, सिस्टमों, पेजों, फ़ॉर्मों and प्लैटफ़ॉर्मों; every other loan stays as it is before a postposition (टोकन में, आइकन के बीच, सेपरेटर के साथ), and a page never forces ों onto one. |
| Gender of a loan | बटन, टैब, टोकन, मेन्यू, कंपोनेंट, आइकन, लेबल, स्लॉट, स्टेट, वेरिएंट, पेज, लेआउट, फ़ोकस, स्क्रॉल, कंटेनर, डायलॉग, कार्ड, स्नैकबार, टूलटिप, स्लाइडर, स्विच, चेकबॉक्स, फ़ील्ड, कॉन्टेंट, हेडर, इवेंट, ड्रॉअर, बार (ऐप बार, नेविगेशन बार, टूलबार), फ़िल, पैनल, हैंडल, ट्रैक, सेगमेंट, टैग, बैज, रीजन, सेपरेटर, पिक्सल, वर्शन are masculine. प्रॉपर्टी, थीम, फ़ाइल, स्क्रीन, लिस्ट, शीट, रिंग, चिप, सरफ़ेस, शैडो, टेबल, हेडिंग, स्पेसिंग, पैडिंग, सेटिंग, विंडो, स्कीम, लाइन, लेयर, फ़िडेलिटी, पैरिटी, and कुंजी (a key: never की) are feminine. Verbs and adjectives agree with these on every page. |
| Reader and voice | आप, with the polite imperative in करें (`इंस्टॉल करें`, `लेबल दें`); never तुम, never कीजिए. The component is the subject of an active sentence where the English has one (`मेन्यू फ़ोकस लौटाता है`), not a passive with द्वारा. जो … वह and जब … तब in the order Hindi has them; a long English sentence is split. |

### Terms fixed by the finishing pass

After three readers had read every page, these were the terms still written more than one way. Each has one form now, on every page.

| English | Hindi |
|---|---|
| a press (noun) | दबाना (दबाने पर, बाहर दबाना); never दबाव, which is pressure |
| follow a link (a key, the browser, a crawler) | लिंक खोलना (`Enter लिंक खोलती है`); not लिंक पर जाना, फ़ॉलो करना |
| drawn, where the English means "visible" (drawn or hidden, not drawn while collapsed) | दिखाया गया / दिखने वाला, दिखाया जाता है, दिखता है. बनाना / बनना stays where the English is about how a thing is rendered (रिंग किनारे के भीतर बनती है) |
| exposed (to assistive technology) | With the receiver named: सहायक तकनीक को … के रूप में मिलता है. Without it: … के रूप में दिया जाता है. Active: सहायक तकनीक को … देता है / बताता है. Not दिखता है, सामने आता है |
| emit (an event) | एमिट करना / एमिट होना (`कुछ एमिट नहीं होता`); भेजना only for what is really sent (a message, a key the browser sends, a form's value) |
| position in a set (2 of 3) | जगह (`लिस्ट में अपनी जगह`); स्थिति is status only, and स्थान is the placement of an overlay (`placement`) and a decimal place |
| single / multiple selection | एकल चयन / बहु चयन; चुनाव is a choice in the ordinary sense (प्रकार का चुनाव) |
| value text | मान टेक्स्ट |
| separator | सेपरेटर (the role, a date's or a number's separator); the component is डिवाइडर |
| unknown (a value, a duration) | अनजान, uninflected |
| pixel | पिक्सल |
| lambda | लैम्ब्डा |
| version | वर्शन |
| raised (a surface, a panel) | उठा हुआ, inflected (उठी हुई सरफ़ेस) |
| modal | मोडल; मॉडल is "model" only |
| declare (a palette, a variant, a tab) | घोषित करना |
| layout region, live region, a region (accessibility) | लेआउट रीजन, लाइव रीजन, रीजन; क्षेत्र is an area in the ordinary sense |
| year / week / weekend | साल / हफ़्ता / वीकेंड |
| table | टेबल (feminine; plural टेबल) |
| circular / a circle | गोलाकार / गोला; the quarter circle of a corner's geometry is चौथाई वृत्त |
| continuous corner / continuous (a slider) | सतत कोना / निरंतर |
| top-level (a destination, a screen) | सबसे ऊपरी स्तर का |
| the top (at the top of the screen) / the top of the content, of a sheet | सबसे ऊपर / ऊपरी सिरा |
| aligned / alignment (of text; a product's label) | सीध में (शुरू की ओर सीध में रखी) / अलाइनमेंट |
| quiet (a fill, a line, a text, a form of a component) | हल्का, inflected. शांत stays where the English means calm, not faint: the principle (शांत, सटीक इंटरफ़ेस), a heading that stays शांत beside a weight that is हल्का, and the product label शांत समय (quiet hours) |
| and | और; never तथा |
| people who use the product, a keyboard, a screen reader, an input method | व्यक्ति / लोग (स्क्रीन रीडर इस्तेमाल करने वाला व्यक्ति); उपयोगकर्ता only for accounts and roles; never यूज़र |
| key (of the keyboard) | कुंजी; की is never a key |
| determinate / indeterminate | निश्चित / अनिश्चित |
| Get started (the section, a link to it) / Start (an action) | शुरुआत करें / शुरू करें |
| what a screen reader says | Where the English page gives the string as the platform's English-only output (`"2 of 3"`, सिर्फ़ अंग्रेज़ी में), it stays English. A generic example of what is heard is in Hindi: `"इनबॉक्स, टैब, 4 में से 1, चयनित, 3 अपठित"`, `"3 में से 2"` |

### Text of a product in a sample

A button, a menu item or an action is the polite imperative: a verb in एँ / ें, or noun + करें. A title, a tab, a field's label and a destination are nouns. No full stop or danda at the end of a label; a message that is a sentence ends with the danda. A question in a dialog's title ends with `?`. An action that opens a further step ends with `…`, as in English.

| English | Hindi |
|---|---|
| Save / Save draft / Save as… | सेव करें / ड्राफ़्ट सेव करें / इस रूप में सेव करें… |
| Cancel | रद्द करें |
| Delete, Remove | हटाएँ (मिटाएँ only for clearing what was typed: खोज मिटाएँ) |
| Move to trash | ट्रैश में डालें |
| Discard / Discard draft? | छोड़ें / ड्राफ़्ट छोड़ें? |
| Search (the action, a field's placeholder) / Search mail | खोजें / मेल खोजें |
| Clear search | खोज मिटाएँ |
| Settings | सेटिंग |
| Sign in / Sign out | साइन इन करें / साइन आउट करें |
| OK / Done / Apply / Reset | ठीक है / हो गया / लागू करें / रीसेट करें |
| Close / Open | बंद करें / खोलें |
| Back / Next / Skip | पीछे / आगे / छोड़ें |
| Edit | संपादित करें |
| Undo / Redo | पहले जैसा करें / फिर से करें |
| Retry | फिर कोशिश करें |
| Copy / Paste / Cut / Select all | कॉपी करें / पेस्ट करें / काटें / सभी चुनें |
| Share / Send / Reply | शेयर करें / भेजें / जवाब दें |
| Add / Create / New | जोड़ें / बनाएँ / नया |
| Download / Upload / Print | डाउनलोड करें / अपलोड करें / प्रिंट करें |
| Archive / Publish / Deploy | आर्काइव करें / प्रकाशित करें / डिप्लॉय करें |
| More / More options | और / और विकल्प |
| Allow / Not now | अनुमति दें / अभी नहीं |
| Show … / Hide … | … दिखाएँ / … छिपाएँ |
| Loading… / Saving… | लोड हो रहा है… / सेव हो रहा है… (the verb agrees with the thing: रिपोर्ट लोड हो रही है) |
| Inbox, Sent, Drafts, Trash, Starred, Unread | इनबॉक्स, भेजे गए, ड्राफ़्ट, ट्रैश, तारांकित, अपठित |
| Home, Files, Folder, Documents, Projects, Account, Notifications, Help | होम, फ़ाइलें, फ़ोल्डर, दस्तावेज़, प्रोजेक्ट, खाता, सूचनाएँ, सहायता |
| Name, Email, Password, Message, Date | नाम, ईमेल, पासवर्ड, संदेश, तारीख़ |
| Day, Week, Month, Year; Today | दिन, हफ़्ता, महीना, साल; आज |
| Light / Dark (a theme) | लाइट / डार्क |
| Bold / Italic / Underline | बोल्ड / इटैलिक / अंडरलाइन |
| Airplane mode, Wi-Fi, Bluetooth | हवाई जहाज़ मोड, Wi-Fi, Bluetooth |
| Error (a status word) / Failed | त्रुटि / विफल |
| a file's name, a brand, a person's name in Latin script | as in the English sample (`Report.pdf`) |

A word that is a value of the API (a variant, a size, a status that the code compares) stays in English in a sample and in a demo's caption.

### Terms of the link, callout, table and code pages (Hindi)

Link, Callout, Table, Inline code, Code block and Copy button, and the Hindi locale of the date and time demos.

| English | Hindi |
|---|---|
| Link / Callout / Table / Inline code / Code block / Copy button (the components) | लिंक / कॉलआउट / टेबल / इनलाइन कोड / कोड ब्लॉक / कॉपी बटन. लिंक, कॉलआउट, इनलाइन कोड, कोड ब्लॉक and कॉपी बटन are masculine; टेबल is feminine |
| anchor (the HTML element) / address (of a link) | ऐंकर / पता |
| underline, underlined | अंडरलाइन (feminine), अंडरलाइन के साथ |
| standalone link / a glyph alone | अकेला लिंक / सिर्फ़ ग्लिफ़ (वाला लिंक) |
| mark (the new-tab mark, a mark in a cell, the error mark) / sign (the + and − of a line) | निशान / चिह्न |
| inverse surface / status container | इनवर्स सरफ़ेस / स्थिति का कंटेनर |
| planned (a platform's status) | नियोजित |
| notice / note / caution / danger / tip (what a callout is) | सूचना / नोट / सावधानी / ख़तरा / सुझाव |
| title (of a callout, a code block) / body | शीर्षक / बॉडी; हेडिंग is a heading of the page's outline |
| a look (of a callout, a code block: filled, outlined) / a form (of the copy button, of inline code) | रूप |
| announced politely / assertively | बिना टोके (polite) / ज़ोर देकर |
| measure (of prose) | पंक्ति की लंबाई की सीमा |
| before the element is defined | एलिमेंट के डिफ़ाइन होने से पहले |
| row / column / cell / row header / column header / header cell / footer row / caption | पंक्ति / कॉलम / सेल / पंक्ति हेडर / कॉलम हेडर / हेडर सेल / फ़ुटर पंक्ति / कैप्शन (masculine) |
| striped / stripes | धारीदार / धारियाँ |
| stays (a sticky column or header), kept in view | अपनी जगह रहता है, नज़र में रखा गया |
| wrap (text, a line, a run) | रैप होना; a row of actions that wraps: अगली पंक्ति में जाना |
| scan (a table) | नज़र दौड़ाना |
| identifier / description list / data table | आइडेंटिफ़ायर / डिस्क्रिप्शन लिस्ट / डेटा टेबल |
| a run (of code) | टुकड़ा |
| the code face / the text face | कोड का टाइपफ़ेस / टेक्स्ट का टाइपफ़ेस |
| line (of code) / line numbers / marked lines / highlighted, added, removed (a line) | पंक्ति / पंक्ति संख्याएँ / चिह्नित पंक्तियाँ / हाइलाइट की गई, जोड़ी गई, हटाई गई |
| bar / band (of a marked line) / prompt / frame | पट्टी / बैंड / प्रॉम्प्ट / फ़्रेम |
| highlighter / scope / syntax role / plain (code with no role) | हाइलाइटर / स्कोप / सिंटैक्स रोल / सादा; role names (`keyword`, `literal`, `name`…) stay |
| ancestor | पूर्वज (एलिमेंट) |
| at rest / copied / failed (the copy button's forms) | सामान्य / कॉपी हो चुका / विफल |
| clipboard / fallback / secure page | क्लिपबोर्ड / फ़ॉलबैक / सुरक्षित पेज |
| Copy / Copied / Could not copy / Copy link / Link copied | कॉपी करें / कॉपी हो गया / कॉपी नहीं हो सका / लिंक कॉपी करें / लिंक कॉपी हो गया |
| Information / Warning / Error / Success (a status said in words: `status-label`) | जानकारी / चेतावनी / त्रुटि / सफल |
| Reload / Submit the form / Show it again / Keep mine | रीलोड करें / फ़ॉर्म सबमिट करें / फिर से दिखाएँ / मेरा वाला रखें |
| Total / Region / Version / Changes / Example / Install (a block's name) | कुल / क्षेत्र / वर्शन / बदलाव / उदाहरण / इंस्टॉलेशन |
| opens in a new tab / Link to Overview | नए टैब में खुलता है / अवलोकन का लिंक |
| Previous month / Next month / Choose a year / Today | पिछला महीना / अगला महीना / साल चुनें / आज |
| Start date, End date (a calendar's range) / Start, End / Range / next day / Date | शुरुआत की तारीख़, अंत की तारीख़ / शुरुआत, अंत / रेंज / अगला दिन / तारीख़ |
| Hour / Minute / AM or PM / Wheels / Dial / Time input | घंटा / मिनट / am या pm / व्हील / डायल / समय डालने का तरीक़ा |
| Required / Optional / Empty (a date segment) | ज़रूरी / वैकल्पिक / ख़ाली |

The live date and time demos of the Hindi pages run with `locale="hi-IN"`, which writes Western digits by itself (no `-u-nu-latn` is needed), day, month, year (`27/09/2026`), a 12-hour clock with `am` and `pm` in lower case, and the month names of the locale's data (सितंबर, अक्तूबर). Prose that quotes what a demo shows uses those forms ("गुरु, 17 सित॰", "9:00 am – 5:30 pm", अक्तूबर); a unit's name as a segment announces it is the locale's own (माह). What a page gives as a default of the component (`"Select date"`, `"Required"`) or as another locale's row (en-US, ja-JP) stays as the English page has it.

### Terms the translators proposed (Hindi)

The later component pages, from what the pages say.

| English | Hindi |
|---|---|
| gender of the component names and loans these pages added | Masculine: चरण, पेजिनेशन, फ़िगर, अकॉर्डियन, पॉपओवर, फ़ील्ड ग्रुप, सिलेक्ट, कॉम्बोबॉक्स, ऐप शेल, पेज हेडर, अवतार, ख़ाली स्टेट, ब्रेडक्रंब, ट्री व्यू (ट्री), कलर फ़ील्ड, टैग ग्रुप, लिंक कार्ड, स्केलेटन, मार्कर, कनेक्टर, स्टेपर, स्वॉच, ओपनर, असाइड, प्लेसहोल्डर. Feminine: डिस्क्रिप्शन लिस्ट, विषय सूची, टाइमलाइन, विंडो क्लास, स्थिति पंक्ति |
| step (of a procedure) / step (of a scale, a slider) | चरण / स्टेप |
| stepper / spin button | स्टेपर / स्पिन बटन |
| marker / connector / pill | मार्कर / कनेक्टर / पिल |
| fact / term / value (a description list); figure (a number shown large) | तथ्य / टर्म / मान; आँकड़ा — फ़िगर is only the component |
| stage / frame / attachment (a figure) | स्टेज / फ़्रेम / अटैचमेंट |
| picture (prose) / photo (product text) | तस्वीर / फ़ोटो |
| Previous / Next (pagination) | पिछला / अगला; पीछे / आगे stay the Back and Next actions |
| chevron / trigger / opener / list box | शेवरॉन / ट्रिगर / ओपनर (the prop stays `opener`) / लिस्टबॉक्स |
| chosen option / active option | चुना हुआ विकल्प / सक्रिय विकल्प |
| trailing text / trailing content | अंतिम टेक्स्ट / अंतिम कॉन्टेंट |
| controlled / inert / current (an item, a section) | कंट्रोल्ड / निष्क्रिय / मौजूदा |
| rail (a table of contents) | रेल |
| touch target / pointer target | टच टार्गेट / पॉइंटर टार्गेट |
| skip link / sticky / window class / crawler | स्किप लिंक / स्टिकी / विंडो क्लास / क्रॉलर |
| help (a field's line) / supporting text / error text | सहायता / सहायक टेक्स्ट / त्रुटि टेक्स्ट |
| requirement mark / requirement tag; asterisk | ज़रूरी या वैकल्पिक का निशान / ज़रूरी या वैकल्पिक का टैग (ज़रूरी का टैग, वैकल्पिक का टैग); तारांकन — the tag is टैग, never चिप |
| invalid (the exposed state) | अमान्य |
| forced colors | फ़ोर्स्ड कलर्स |
| region / main region / aside / footer (of the shell, of a page) | रीजन / मुख्य रीजन / असाइड / फ़ुटर |
| trail / level / hierarchy (breadcrumbs, a tree); eyebrow / meta (a page header) | ट्रेल / स्तर / हायरार्की; आइब्रो / मेटा |
| debug build | डीबग बिल्ड |
| commit (a value, a text) / confirm (an option) | कमिट करना / पुष्टि करना |
| clear button / status row, status line / busy | मिटाने का बटन / स्थिति पंक्ति / व्यस्त |
| an input method is composing | इनपुट मेथड कंपोज़ कर रहा है |
| a stop in the focus order | फ़ोकस के क्रम में एक पड़ाव, short पड़ाव |
| read-only | सिर्फ़ पढ़ने वाला (before a noun), सिर्फ़ पढ़ने के लिए (after it) |
| a number / digits; prefix / suffix; caret | संख्या / अंक; प्रीफ़िक्स / सफ़िक्स; कैरेट |
| Increase / Decrease (a stepper's labels) | बढ़ाएँ / घटाएँ |
| initials / decorative / named (an avatar); writing system | नाम के पहले अक्षर / सजावटी / नाम वाला; लिपि |
| event (of a timeline); Done / In progress / Not started | घटना — इवेंट stays the DOM event; पूरा हुआ / जारी है / शुरू नहीं हुआ |
| overflow button; folded (a trail) | ओवरफ़्लो बटन; सिमटा हुआ (verb: सिमटना) |
| parent / leaf (a tree) | पैरेंट / लीफ़ |
| swatch / picker / picker button | स्वॉच / पिकर / पिकर बटन |
| link item (a menu) / a new context / modifier key | लिंक आइटम / नया संदर्भ / मॉडिफ़ायर कुंजी |
| external link / origin / destination / host | बाहरी लिंक / ओरिजिन / गंतव्य / होस्ट |
| media (the empty state's slot) | मीडिया |
| words (a product's); "Tanrei ships no words (of its own)" | शब्द, प्रॉडक्ट के शब्द; Tanrei अपना कोई शब्द साथ नहीं देता |
| reported in development | डेवलपमेंट में रिपोर्ट होती है |
| No matches (a list's empty text) | कोई नतीजा नहीं |
| running text | चलता टेक्स्ट (before a postposition चलते टेक्स्ट) |
| nothing ships there yet (a platform) | वहाँ अभी कुछ उपलब्ध नहीं है |
| Left and Right swap (a right-to-left layout) | आपस में बदल जाती हैं |
| hidden from assistive technology | सहायक तकनीक से छिपा रहता है |
| criterion, criteria (accessibility) / measurement | मानदंड (सुलभता मानदंड) — कसौटी is the one-product test / माप |
| placeholder row (a skeleton, a table) | प्लेसहोल्डर पंक्ति |
| reorder; reorderable list; Move up / Move down | क्रम बदलना; क्रम बदलने वाली लिस्ट; ऊपर ले जाएँ / नीचे ले जाएँ |
| sort; sortable column; sort button | सॉर्ट करना; सॉर्ट करने लायक़ कॉलम; सॉर्ट बटन |
| chosen row; checked / not checked (a row's checkbox) | चुनी गई पंक्ति; चेक किया हुआ / चेक नहीं किया हुआ |
| "What you write" / "Known gaps on the web" (headings) | आप क्या लिखते हैं / वेब पर ज्ञात कमियाँ |

### Terms of the One-time-code input, the File upload and the code field (Hindi)

| English | Hindi |
|---|---|
| One-time-code input / File upload (the components) | वन-टाइम कोड इनपुट / फ़ाइल अपलोड, both masculine. The names are confirmed: a typing control that a field frames is इनपुट, as on the other pages; OTP stays what a product may write in its own text |
| cell / active cell / group mark (a one-time-code input) | सेल (masculine) / सक्रिय सेल / ग्रुप का निशान |
| a drawing of the value (the cells) | मान का चित्र |
| autofill / paste / drop / dictation | ऑटोफ़िल / पेस्ट / ड्रॉप / डिक्टेशन |
| read leniently | उदारता से पढ़ा जाता है |
| full-width (digits, letters) / upper-case, lower-case letters | फ़ुल-विड्थ / बड़े अक्षर, छोटे अक्षर (अंग्रेज़ी के बड़े अक्षर where the script must be said) |
| insertion point (the native one) | इंसर्शन पॉइंट; कैरेट is the drawn one |
| form-associated (element) / shadow root | फ़ॉर्म से जुड़ा एलिमेंट / शैडो रूट |
| Verification code / Sign-in code / Pairing code / PIN | पुष्टि कोड / साइन-इन कोड / पेयरिंग कोड / पिन (पिन कोड is a postal code) |
| Enter the 6-digit code we sent to your phone. | आपके फ़ोन पर भेजा गया 6 अंकों का कोड दर्ज करें। |
| trigger / drop area / picker (a file upload) | ट्रिगर / ड्रॉप एरिया (short एरिया) / पिकर, फ़ाइल पिकर |
| kept file / refused file / a refusal | रखी गई फ़ाइल / अस्वीकार की गई फ़ाइल / अस्वीकृति, अस्वीकार होना |
| limits (of a file upload) / failed row / retry (the action) | सीमाएँ / विफल पंक्ति / फिर कोशिश करने की क्रिया |
| bar (a row's) / progress / under way | पट्टी (to assistive technology: प्रोग्रेस बार) / प्रगति / चलती हुई |
| instance / child (elements) / handler / listener | इंस्टेंस / चाइल्ड / हैंडलर / लिसनर |
| Choose a file / Choose files / Attachment, Attachments / No file chosen | फ़ाइल चुनें / फ़ाइलें चुनें / अटैचमेंट / कोई फ़ाइल नहीं चुनी गई |
| Drag files here, or choose them | फ़ाइलें यहाँ खींचकर छोड़ें, या चुनें |
| Waiting / Uploading / Uploaded (a file's row) / Try again | इंतज़ार में / अपलोड हो रही है / अपलोड हो गई / फिर कोशिश करें |
| PDF, up to 10 MB / … up to 10 MB each / Larger than 10 MB. | PDF, 10 MB तक / … हर फ़ाइल 10 MB तक / 10 MB से बड़ी है। |
| code field / the code face / ligature / tab character, tab stop (of text) | कोड फ़ील्ड / कोड का टाइपफ़ेस / लिगेचर / टैब अक्षर, टैब स्टॉप — Tab स्टॉप, with the key's name in Latin, is the stop of focus |
| spell-check / correct (autocorrection) / trim / indent / editor | स्पेलिंग जाँचना / सुधारना (ऑटोकरेक्शन) / ट्रिम करना / इंडेंट / एडिटर |
| Pattern / Webhook body / Rules (a code field's labels) | पैटर्न / वेबहुक की बॉडी / नियम |
| form (of a file item: `row`, `tile`) / row / tile / box (of a tile) / strip (of pictures, of tiles) | रूप (फ़ॉर्म is the HTML form) / पंक्ति / टाइल (feminine) / बॉक्स (masculine) / क़तार — पट्टी is the bar |
| body (of a file item) / pressable / preview (of a file) | बॉडी (feminine) / दबाने लायक़ / प्रीव्यू (masculine) |
| kind (of a file, by its glyph) / media type / ending (of a file's name) / format | प्रकार / मीडिया टाइप / नाम का अंत (एक्सटेंशन only where the English says extension) / फ़ॉर्मैट |
| **Used in** / **Built from**, **Built with** (lead-ins of a composed element and its members) | **कहाँ इस्तेमाल होता है:** … में / **किनसे बना है:** … से |
| member (of a composed element) / One level down / Setting one … apart (headings) | सदस्य / एक स्तर नीचे / किसी एक … को अलग करना |
| opener (of an image preview) / the count's sentence / zoom, step (of the zoom) / at fit / pinch / wheel / trackpad | खोलने वाला एलिमेंट / गिनती का वाक्य / ज़ूम, चरण / फ़िट पर / पिंच / व्हील / ट्रैकपैड |
| Close / Zoom in / Zoom out / Previous image / Next image / {position} of {count} | बंद करें / ज़ूम इन करें / ज़ूम आउट करें / पिछली इमेज / अगली इमेज / {count} में से {position} |
| Loading image / This image could not be loaded / Enlarge: … / Attach, Attach a file | इमेज लोड हो रही है / यह इमेज लोड नहीं हो सकी / बड़ा करें: … / अटैच करें, फ़ाइल अटैच करें |
| One-time-code field (the component) / an advanced component, the bare control / the frame (a field around a control) / Backup code | वन-टाइम कोड फ़ील्ड (masculine) / ऐडवांस्ड कंपोनेंट, सिर्फ़ कंट्रोल / फ़्रेम / बैकअप कोड |
| error condition (of a field, a drop area) / a small rendition (of a file, as `previewSrc`) / re-point (a token, in a layer) / exposed, on these pages too | त्रुटि की अवस्था / छोटी इमेज (रूप is the form `row`, `tile`) / दूसरे टोकन से जोड़ना / सहायक तकनीक को … दिया जाता है, मिलता है (never एक्सपोज़) |

### Terms of the Menubar and of a Button in a form (Hindi)

| English | Hindi |
|---|---|
| Menubar (the component) | मेन्यू बार (confirmed), two words like ऐप बार and नेविगेशन बार; masculine; short बार |
| bar item (a menubar's entry that acts) / entry / title (of a menu in the bar) / overflow item | बार आइटम (masculine) / एंट्री (feminine: a title or a bar item) / शीर्षक / ओवरफ़्लो आइटम — a link item is लिंक आइटम, as in the Menu; "Entries that act" is क्रिया करने वाली एंट्री |
| command / application | कमांड (masculine, uninflected: कमांड के लिए) / ऐप्लिकेशन |
| folded (an entry of a narrow bar) / to fold | सिमटा हुआ / समेटना, सिमटना, as on the Breadcrumbs page |
| access keys / chrome (of a window) | ऐक्सेस कुंजियाँ / ऐप का ढाँचा — क्रोम reads as the browser's name |
| moving along the bar / explore safely | बार पर आगे-पीछे जाना / बेफ़िक्र होकर टटोलना |
| product text of a menubar | ऐप्लिकेशन मेन्यू, और मेन्यू, और; फ़ाइल, संपादन, व्यू, फ़ॉर्मैट, सहायता — a menu's title is a noun, so the Edit menu is संपादन while the action Edit stays संपादित करें; नया, खोलें…, हाल की फ़ाइल खोलें, सेव करें, प्रिंट करें…, पहले जैसा करें, फिर से करें, रूलर, टिप्पणियाँ, ज़ूम, ज़ूम इन करें / ज़ूम आउट करें, बोल्ड, कीबोर्ड शॉर्टकट, इस ऐप के बारे में; चलाएँ, डॉक्यूमेंटेशन, सोर्स, इतिहास |
| submit / send (a form) / default button / submitter | सबमिट करना, सबमिट होना / भेजना / डिफ़ॉल्ट बटन / सबमिटर |
| validation / initial value / single-line input / request (to a server) | वैलिडेशन / शुरुआती मान / एक पंक्ति वाला इनपुट / अनुरोध |
| drawn label, drawn text (of a button) / speech input | दिखने वाला लेबल, दिखने वाला टेक्स्ट / बोलकर इनपुट देना |
| Clear (a form's reset button) / Remove: Inter (a name longer than the label) | मिटाएँ / हटाएँ: Inter — the name starts with the word the button shows |

### The components of the three levels (Hindi)

| English | Hindi |
|---|---|
| Text input / Number input / Color input / Embedded text input (the bare controls) | टेक्स्ट इनपुट / नंबर इनपुट / कलर इनपुट / एम्बेडेड टेक्स्ट इनपुट — a "… input" is इनपुट, the bare control, as वन-टाइम कोड इनपुट is; all masculine |
| Select field / Combobox field / Slider field / Chip field (the Field around a control) | सिलेक्ट फ़ील्ड / कॉम्बोबॉक्स फ़ील्ड / स्लाइडर फ़ील्ड / चिप फ़ील्ड — a "… field" is फ़ील्ड, masculine; सिलेक्ट and कॉम्बोबॉक्स alone are now the bare controls |
| Checkbox group / Chat composer | चेकबॉक्स ग्रुप / चैट कंपोज़र, both masculine |
| bare (a select, a combobox, an input used without a field) / the box alone | अकेला (अकेला सिलेक्ट, अकेले सिलेक्ट को) / सिर्फ़ बॉक्स — सिर्फ़ कंट्रोल stays "the bare control" as a kind |
| written by hand / the pair by hand / to frame (a control) | हाथ से लिखा गया / हाथ से लिखी जोड़ी / फ़्रेम देना |
| a block as wide as the place it is put in | एक ब्लॉक, उतना ही चौड़ा जितनी वह जगह जिसमें इसे रखा गया है |
| floating label / to float | फ़्लोट होता लेबल / फ़्लोट होना (never फ़्लोट करना) |
| the count (`countText`) / the label row, the supporting row | गिनती / लेबल की पंक्ति, सहायक पंक्ति |
| parts (of an element) / kebab-case / a field group's kind | भाग / kebab-case, in Latin / प्रकार, with the value as it is written: radio-group प्रकार |
| draws nothing of its own / drawn focused | अपना कुछ नहीं बनाता / फ़ोकस वाले रूप में दिखाया जाता है |
| a flick (image preview) / composed, bubbles (an event) | फ़्लिक / composed, in Latin; बबल होना |
| "Setting one group apart" / "In a field, by hand" / "What is the select's, and what is the field's" (headings) | किसी एक ग्रुप को अलग करना / फ़ील्ड में, हाथ से / क्या सिलेक्ट का है, और क्या फ़ील्ड का |
| product text of these pages | Display name: दिखने वाला नाम; Shown beside your comments.: आपकी टिप्पणियों के साथ दिखता है।; Text size: टेक्स्ट का साइज़; Applies to every page.: हर पेज पर लागू होता है।; Sort by: इसके अनुसार सॉर्ट करें; Last updated: पिछला अपडेट; Role / Viewer / Editor: भूमिका / दर्शक / संपादक; Up to 99 per order.: हर ऑर्डर में 99 तक।; Find a token: टोकन खोजें |
| holder (of an embedded text input) / capsule / typing area, the typing / the typing part (of a box with entries) | होल्डर / कैप्सूल, both masculine / टाइप करने की जगह / टाइप करने वाला भाग |
| entry (a chip field's) / to take an entry back / a candidate / refused (an entry; a value, an answer) | एंट्री (feminine) / वापस लेना / संभावित एंट्री / अस्वीकार हुई (एंट्री); माना नहीं गया (मान, जवाब) |
| a checkbox that checks them all, the select-all checkbox / checked, indeterminate, unchecked / to switch (a checkbox) | सबको चेक करने वाला चेकबॉक्स / चेक किया हुआ, अनिश्चित, चेक नहीं किया हुआ / बदलना |
| the value in words / en dash / first-strong isolate / coarse (a pointer) / return key | शब्दों में मान / एन डैश / फ़र्स्ट-स्ट्रॉन्ग आइसोलेट / मोटा (coarse), the gloss in Latin / रिटर्न कुंजी |
| "What the holder owes" / "A checkbox that checks them all" / "What can be sent" / "Changing an entry" (headings) | होल्डर के ज़िम्मे क्या है / सबको चेक करने वाला चेकबॉक्स / क्या भेजा जा सकता है / एंट्री बदलना |
| product text of the chip field, the checkbox group and the chat composer | Recipients: पाने वाले; Remove {entry}: {entry} को हटाएँ; {entry} added / {count} added / {entry} removed: {entry} जोड़ा गया / {count} जोड़े गए / {entry} हटाया गया; Separate addresses with a comma.: पतों को कॉमा से अलग करें।; Notify me by: सूचना कैसे भेजें; Text message: SMS; Choose all that apply.: जो भी लागू हों, सभी चुनें।; Every weekday: हर कामकाजी दिन; Write a message: संदेश लिखें; Attach files: फ़ाइलें अटैच करें; Assignee: किसे सौंपें; No matches: कोई नतीजा नहीं |
| a bare control's name before the word फ़ील्ड, or टेक्स्ट before इनपुट, where the two are not one name | Never side by side: "इनपुट फ़ील्ड का लेबल", "सिलेक्ट फ़ील्ड का लेबल" and "मान टेक्स्ट फ़ील्ड के" read as the component's name. Reorder (फ़ील्ड का लेबल filled या outlined इनपुट ख़ुद दिखाता है; इनपुट मेथड ने जो टेक्स्ट …) or set a comma between them |
| "You need" / "Use" (the header of a choosing table) / Amount (a field's label) / to frame a control yourself | आपको चाहिए / इस्तेमाल करें / राशि (रक़म stays the word of prose) / इसे ख़ुद फ़्रेम देना |
| the tabs' `tonal` variant / `track`, a row without its track / `transition` (tabs, tab view) / a small row | tonal वेरिएंट, tonal टैब, tonal पंक्ति: the value in Latin, as primary and secondary are, and "Tonal" where it opens a cell or a label / ट्रैक, बिना ट्रैक की पंक्ति / ट्रांज़िशन (masculine; the heading is ट्रांज़िशन, the prop stays `transition`) / small साइज़ की पंक्ति. A soft or translucent layer (the tonal indicator) is परत, आधी पारदर्शी परत: लेयर is a design system's layer |
| the requirement tag is a Tag / the error text below the help / the shared input box (`comp.input-box`) | ज़रूरी या वैकल्पिक का टैग एक छोटा टैग है (the component, never चिप) / त्रुटि टेक्स्ट सहायता के नीचे दिखाया जाता है, और सहायता बनी रहती है (no longer "की जगह लेता है") / इनपुट बॉक्स (masculine): बॉक्स के लिए `comp.input-box.*`, जिन्हें हर इनपुट बॉक्स पढ़ता है |
| a place (a word's `{name}`) / a word with places / a brace, a doubled brace, a single brace / isolated (a text in a sentence) / whole number / ordinal | भरने की जगह, short जगह where the sentence is about filling (भरने की जगहों वाला शब्द) / ब्रेस (masculine), दो बार लिखा ब्रेस, बिना जोड़ी का अकेला ब्रेस / आइसोलेट किया जाता है / पूर्ण संख्या / क्रमसूचक संख्या |
| a number and its unit are one piece of writing / right-to-left mark / product text of these pages | लिखावट का एक ही टुकड़ा, as टुकड़ा is a run / दाएँ से बाएँ का दिशा चिह्न (right-to-left mark, U+200F) / Password: पासवर्ड; At least 8 characters, with one number.: कम से कम 8 अक्षर, जिनमें एक अंक हो।; This password is too short.: यह पासवर्ड बहुत छोटा है।; Period: अवधि; Metric / Imperial: मेट्रिक / इंपीरियल; Added: {count}: जोड़े गए: {count} |

## Arabic: conventions fixed by the quality pass

What the Arabic pages hold to beyond the tables above. Where this section and an older row disagree, this section is right.

### Spelling and punctuation

| | Rule | Written | Not written |
|---|---|---|---|
| Tanween of the accusative | On the letter before the alif | `أولًا`، `دائمًا`، `رابطًا`، `افتراضيًّا` | `أولاً`، `دائماً` |
| Hamza | Always written, on its seat | `إلى`، `أو`، `إجراء`، `شيء`، `مسؤول`، `يُنشأ` | `الى`، `او`، `اجراء` |
| Final letters | `ة` and `ى` / `ي` as the word has them | `القائمة`، `على`، `في`، `مرئي` | `القائمه`، `علي`، `فى` |
| Tashkeel | Only where a word would be misread: the shadda that tells two words apart (`مكوّن`، `مولِّد` / `مولَّد`، `معطَّل`، `محدَّد`), the damma of a passive (`يُستخدم`، `تُضبط`، `يُعلَن`) | `المكوّن`، `يُرسم` | full vowelling |
| Comma, semicolon, question mark | `،` `؛` `؟`, no space before, one after | `الحفظ، ثم النشر` | `الحفظ , ثم` |
| Quotation marks | `« »` for a quoted word, a label, a title; never `" "` or `“ ”` in prose | `«حفظ»` | `"حفظ"` |
| Full stop, colon, parentheses, ellipsis | `.` `:` `( )` `…` | `جارٍ النشر…` | `...` |
| Dash | Not used to join clauses: a comma, a colon or two sentences | | ` — ` |
| Digits | Western (`48`, `200%`, `4.5:1`) | | `٤٨` |
| The conjunction `و` before a Latin word or inline code | Separated by a space | `` Web و React ``، `` و `label` `` | `وReact` |
| The article and the one-letter prepositions on a Latin word | The article is not attached: name the kind first. `بـ` and `لـ` only where no other wording serves | `في Tanrei`، `الخاصية href`، `مكتبة Compose`، `عنصر anchor` | `الـ Studio`، `بTanrei` |

### A borrowed term

A term of the craft is the Arabic word. On its first mention on a page, the Latin follows in parentheses where a reader may know it only by that name; after that the Arabic alone: `رمز التصميم (design token)` then `الرمز`; `الطُرُز (variants)` then `الطراز`; `رسم الأيقونة (glyph)` then `الرسم`. A value of the API is never glossed and never takes the article: `الطراز filled`، `الحجم small`، `القيمة new`. Names of products, platforms, APIs and standards stay Latin and are introduced by their kind where the sentence needs an article or a case: `منصة Flutter`، `مكتبة Compose`، `قارئ الشاشة VoiceOver`، `نمط WAI-ARIA`.

Agreement with a Latin name: Tanrei and a platform, framework or tool standing alone is **masculine singular** (`يستطيع SwiftUI`، `يرسم Compose`، `Flutter لا يعرّف`، `يتبع Tanrei`); with its kind before it, agreement follows the kind (`مكتبة Compose تركّب`); several names together are a plural of things: what follows them is feminine singular (`أما SwiftUI و Compose و Flutter و React Native فمتأخرة: ما زالت تقدّم …`), and a verb before the list is feminine singular or agrees with the first name (`لم تنفّذه SwiftUI و Compose …`، `يُبقي SwiftUI و Compose …`). A company is feminine (`ترسمها Apple`).

### Mixed direction

A block of prose (a paragraph, a list item, a heading) takes its direction from **its first strong character** (prose, PRS-24); inline code is a left-to-right run of its own and does not count (PRS-26); a table cell and a demo's caption are right-to-left always. Two Latin words with only punctuation or digits between them join into one left-to-right run, which puts them in the wrong order for a reader going right to left. So:

| Pattern | Written | Not written |
|---|---|---|
| A block opens with an Arabic word, never a Latin one | `- في SwiftUI: …`، `نظام Tanrei …`، `### الطرازان tonal و filled`، `**الوضع Auto** يناسب …` | `- SwiftUI: …`، `Tanrei نظام …`، `### tonal و filled` |
| A block that is a Latin name alone stays as it is | `### React Native` | |
| A sentence after one that ended in a Latin word opens with an Arabic word | `… بالمفتاح Enter. والمفتاح Tab ينقل …` | `… Enter. Tab ينقل …` |
| Latin names in a row are joined by `و` or `أو` with spaces, never by a comma or a slash alone | `React و React Native`، `small و medium و large`، `SwiftUI و Jetpack Compose و Flutter` | `React, React Native`، `small / medium / large`، `SwiftUI، Jetpack Compose، Flutter` |
| Numbers in a row likewise | `32 و 40 و 56` | `32 / 40 / 56` |
| Inline code: name its kind first; a row of code spans may use `،` | `` الخاصية `href` ``، `` `filled`، `tonal` `` | |
| A mixed table cell or caption puts the Arabic first where the sentence allows | `الطراز Stacked، وهو الافتراضي` | `Stacked، وهو الافتراضي` |
| Key symbols and a combination written with them are inline code | `` `⌘K` ``، `` `⌥⌘⎋` `` — `Ctrl+Alt+Delete` and a key's name (`المفتاح Enter`) need none | bare `⌘K` in a sentence |
| Arrows are not mirrored. Between Arabic words or code spans the arrow points the way of reading; between Latin words it stays as in English | `` `gap` ← `space100` ``، `العناصر ← الأدوار`، `Groups → Shape` | `العناصر → الأدوار` |
| A Latin phrase that ends in punctuation of its own, followed by Arabic | `&lrm;` after the punctuation — the one place a direction mark is written, as the entity so that the source shows it | `**File → Add Package Dependencies…**` followed by Arabic |
| A sentence may end in a Latin word or a value before the full stop | `… على القيمة new.` | |

### Product text in samples

A command (a button, a menu item) is the **verbal noun without the article**; a field's label, a destination and a section are nouns **with** the article; a placeholder is an imperative; a title that asks is a question with `؟`; no final full stop on a label.

| English | Arabic |
|---|---|
| Save / Save draft / Save as… | حفظ / حفظ المسودة / حفظ باسم… |
| Cancel / Close / Done / OK | إلغاء / إغلاق / تم / موافق |
| Delete / Remove / Discard | حذف / إزالة / تجاهل |
| Edit / Add / Create / New | تعديل / إضافة / إنشاء / جديد |
| Search (command, label) / Search mail (placeholder) / Clear search | بحث / ابحث في البريد / مسح البحث |
| Settings / Account / Profile / Notifications / Help | الإعدادات / الحساب / الملف الشخصي / الإشعارات / المساعدة |
| Sign in / Sign out / Password / Email | تسجيل الدخول / تسجيل الخروج / كلمة المرور / البريد الإلكتروني |
| Next / Previous / Back / Home | التالي / السابق / رجوع / الرئيسية |
| Send / Reply / Share / Publish / Apply / Reset | إرسال / رد / مشاركة / نشر / تطبيق / إعادة ضبط |
| Undo / Redo / Retry | تراجع / إعادة / إعادة المحاولة |
| Cut / Copy / Paste / Copy link | قص / نسخ / لصق / نسخ الرابط |
| Download / Upload / Print | تنزيل / رفع / طباعة |
| Bold / Italic / Underline | غامق / مائل / تسطير |
| More / More options | المزيد / خيارات إضافية |
| Inbox / Drafts / Sent / Archive (the place) / Archive (the command) / Trash | الوارد / المسودات / المرسَل / الأرشيف / أرشفة / المهملات |
| Unread / Mark as unread | غير مقروءة / تمييز كغير مقروءة |
| Loading… / Saving… / Publishing… | جارٍ التحميل… / جارٍ الحفظ… / جارٍ النشر… |
| Saved / Link copied / Conversation archived | تم الحفظ / نُسخ الرابط / أُرشفت المحادثة |
| Couldn't save / Message not sent | تعذّر الحفظ / لم تُرسل الرسالة |
| Required / Optional | مطلوب / اختياري |
| Opens in a new tab | يُفتح في تبويب جديد |
| Light / Dark / Match system | فاتح / داكن / مطابقة النظام |
| On / Off (a switch) / Selected / Not selected / Disabled | مفعَّل / موقوف / محدَّد / غير محدَّد / معطَّل |
| a person's name, a brand, a file's name in Latin script | as in the English sample (`Ada Lovelace`, `report.pdf`) |

A word that is a value of the API (a variant, a size, a status the code compares) stays in English in a sample and in a demo's caption.

### Terms fixed by this pass (Arabic)

These supersede an older Arabic cell where the two disagree.

| English | Arabic |
|---|---|
| a tab of the Tabs component | `التبويب`، plural `التبويبات` — the short form on component pages; the component's name stays `علامات التبويب`, and a browser's tab is `تبويب جديد` |
| revised (a spec, by a proposal); a revision | `معدَّلة`، `عدّله المقترح`؛ `المراجعة` — never `منقَّحة` / `نقّح`: `التنقيح` is "debug" (`بنيات التنقيح`) |
| landmark (accessibility) | `مَعلم (landmark)`, vowelled: `معلم` alone reads as "teacher" |
| HTML attribute | `خاصية HTML (attribute)`, then `خاصية HTML` — never `السمة`, which is the theme; a property of the element beside it is `خاصية العنصر` |
| trait (an accessibility trait on Apple platforms) | `الصفة (trait)`: `صفة التحديد (selected trait)`، `الصفة النمطية (modal trait)` |
| anchor, where it is an element | `عنصر الارتكاز` (the point is `نقطة الارتكاز`) |
| pointer, on a page that also has an indicator | `مؤشر الإدخال (pointer)`; elsewhere `المؤشر` |
| sits (a part "sits" on, in, beside) | `يقع`، `يوضع`، `يستقر` — never `يجلس` |
| millisecond | `ميلي ثانية`; a value keeps its unit (`100ms`) |
| read overlay / operated overlay | `تراكب قراءة` / `تراكب مُشغَّل (operated overlay)` |
| SF Symbol | `أيقونة SF Symbol` — not `رمز`, which is a token |
| destructive (an action) | `لا رجعة فيه` |
| ships (a system ships a component) | `يتضمن` |
| a position the component announces in English | inline code inside the quotes, so the run keeps its order: `` «`2 of 3`» `` |
| a label "as a verb" | the verbal noun: `بالمصدر الدالّ على الفعل` (`حفظ`، `دمج`) |

### Terms of the link, callout, table and code pages (Arabic)

Link, callout, table, inline code, code block and copy button.

| English | Arabic |
|---|---|
| Link (the component) | `الرابط` — a standalone link is `الرابط القائم وحده`, a glyph alone `رسم أيقونة وحده`, the new-tab mark `العلامة`; to follow a link is `اتباع الرابط`; an address is `عنوان (الوجهة)` |
| Callout | `التنويه`, with `(callout)` on the page's first mention — never `التنبيه`, which is an alert (`role="alert"`); what it carries is `إشعار` (a notice), a caution is `تحذير`, a tip `نصيحة`, a banner `اللافتة (banner)`; a live callout is `تنويه حيّ` |
| Table | `الجدول` — caption: `الشرح (caption)`; header row / footer row: `صف الترويسة` / `صف التذييل`; column header / row header: `ترويسة العمود` / `ترويسة الصف`; header cell: `خلية الترويسة`; a table's body: `المتن` |
| striped, stripes (a table) | `بصفوف مظلَّلة بالتناوب`، `تظليل الصفوف` — never `مخطَّط`, which is the status "planned" and, as `المخطط اللوني`, the scheme |
| a table a person scans | `جدول يمسحه الشخص بنظره` |
| Inline code | `الشيفرة المضمَّنة` (feminine), with `(inline code)` on the page's first mention |
| Code block | `كتلة الشيفرة`, with `(code block)` on the page's first mention |
| Copy button | `زر النسخ` — its three forms are `هيئات`: `السكون`، `تم النسخ`، `تعذّر النسخ`; icon-only / labelled: `بأيقونة وحدها` / `بتسمية`; the check: `علامة صح`, the error mark `علامة خطأ` |
| code face / text face | `خط الشيفرة` / `خط النص` |
| run (of code, of syntax) | `المقطع`, with `(runs)` where the page first names it as a term; a piece of a run that wraps is `قطعة` |
| highlighter; syntax highlighting | `أداة تمييز الصيغة (syntax highlighter)`, short `أداة التمييز`; `تمييز الصيغة` |
| highlighted (a line); marked lines; added / removed | `مُبرَز`; `الأسطر المعلَّمة`; `مضاف` / `محذوف` — `مميَّز` is kept for syntax highlighting |
| syntax role; plain (text with no role) | `دور الصيغة`; `عادي` |
| scope (a highlighter's) | `النطاق`, with `(scopes)` on the page's first mention |
| prompt (of a command line) | `المحثّ` |
| bar / band / sign (of a marked line) | `شريط` / `خلفية بعرض السطر` / `الإشارة` |
| look (a `variant` that is one) | `الطراز` where the page names a value (`الطراز filled`), `المظهر` in the heading «اختيار المظهر» and for "both looks" |
| heading (of the document's outline), where it must be told from a component's title | `عنوان قسم`; the outline is `مخطَّط العناوين` |
| measure (of prose) | `حدّ طول السطر`, with `(measure)` on the page's first mention |
| wrap (text, a line) / break (a word, an identifier) / cut | `يلتفّ` / `ينكسر` / `يُقصّ` |
| politely / assertively (a live region) | `بتهذيب` / `بإلحاح` |
| clipboard | `الحافظة` |
| crawler; find-in-page; router | `الزاحف`; `البحث في الصفحة`; `الموجِّه` |
| class (CSS), stylesheet | `صنف (class)` then `الصنف`; `ورقة الأنماط` |
| ancestor | `عنصر سلف`، `السلف` |
| shadow root | `جذر ظل (shadow root)` |
| strong text | `النص المؤكَّد (strong)` |
| symbol (a character such as `=`), where `رمز` would read as a token | `علامة` |
| "What the web draws differently" (heading) | `ما يرسمه الويب بطريقة مختلفة` |
| planned, nothing ships there yet (a platform) | `مخطَّط لها … ولا شيء منها متاح هناك بعد` |

Product text in these pages: `نسخ` / `تم النسخ` / `تعذّر النسخ`، `نسخ الرابط` / `نُسخ الرابط`، `إعادة التحميل`، `إظهاره مرة أخرى`، `عرض المصدر`، `البدء`، `الصفحة السابقة`، `يُفتح في تبويب جديد`; status words `معلومة`، `تحذير`، `خطأ`، `نجاح`; `ملاحظة`، `نصيحة`، `خطر`، `تجريبي`; a marked line's label agrees with `سطر` (`مُبرَز`، `مضاف`، `محذوف`). Status names that are values (`Alpha`, `Beta`) and platform names stay Latin in a demo's table; month names are `يناير`، `فبراير`، `مارس` …; sample figures keep Western digits and the comma (`1,204`).

Demos that take a `locale` (calendar, DateTimePicker, text field) use `ar-u-nu-latn`: Arabic names with Western digits pinned whatever the engine's data, a week that begins on Saturday and a 12-hour clock with `ص` / `م`, as that tag gives them. Their words: `موافق` / `إلغاء`، `الشهر السابق` / `الشهر التالي`، `اختيار السنة`، `اليوم`، `الساعة` / `الدقيقة`، `صباحًا أو مساءً` (the period's name)، `العجلات` / `القرص`، `طريقة إدخال الوقت`، `المدى`، `البداية` / `النهاية`، `اليوم التالي`، `التاريخ`، `مطلوب` / `اختياري`، `فارغ`. A string the page gives as the component's English default or as one platform's English output is inline code inside the quotes (`` «`Required`» ``), and a row of en-US or ja-JP output in a table is inline code, so that its date and time keep their order.

### Terms the translators proposed (Arabic)

The later component pages, from what the pages say.

| English | Arabic |
|---|---|
| a component's name on its page's first mention | The Latin follows once in parentheses: `الأكورديون (accordion)`، `اللوحة المنبثقة (popover)`، `عنصر الاختيار (select)`، `مربع التحرير والسرد (combobox)`، `هيكل التطبيق (app shell)`، `رأس الصفحة (page header)`، `الشكل التوضيحي (figure)`، `قائمة الوصف (description list)`، `الخط الزمني (timeline)`، `الحالة الفارغة (empty state)`، `مسار التنقل (breadcrumbs)`، `العرض الشجري (tree view)`، `الصورة الرمزية (avatar)`، `بطاقة الرابط (link card)`، `هيكل التحميل (skeleton)` |
| names not used | `القائمة المنسدلة` for the Select (it collides with `القائمة` and `قائمة الخيارات`), `ترقيم الصفحات` for the Pagination (this form has no numbers), `المخطط الزمني` for the Timeline, `نافذة منبثقة` for the Popover |
| marker / connector / pill (steps, timeline) | `العلامة` / `خط الوصل` / `كبسولة` |
| stepper (a flow of steps) / steppers (of a number field) / spin button | `مؤشر الخطوات (stepper)` / `زرّا التدرّج (steppers)`, one is `زر تدرّج` / `زر دوّار (spin button)` |
| fact / term / value (a description list) | `معلومة` / `المصطلح` / `القيمة` |
| stage / frame / attachment / specimen (a figure) | `منطقة العرض (stage)` — not `المنصة`, which is the platform / `الإطار` / `المُلحق` / `عيّنة` |
| markup / framework / decorative | `الترميز` / `إطار عمل` / `زخرفي` |
| chevron | `السهم الصغير (chevron)`, then `السهم الصغير` |
| trailing text / trailing content | `نص النهاية` / `محتوى النهاية` |
| opener (of a popover) / trigger (of a select) | `عنصر الفتح (opener)` — not `الفاتح`, which reads as "light" / `المشغِّل (trigger)` |
| controlled | `مُتحكَّم بها (controlled)` |
| headline (a popover's, a dialog's) | `العنوان الرئيسي` |
| current item | `العنصر الحالي` |
| form (a way a component is written or drawn); the compact form | `الهيئة`; `الهيئة المضغوطة` — `الصيغة` is syntax only |
| pointer target / touch target | `هدف المؤشر` / `هدف اللمس` |
| control | `عنصر التحكم` |
| error text; error condition | `نص الخطأ`; `حالة الخطأ` |
| requirement mark; required tag / optional tag | `علامة المطلوب أو الاختياري`; `وسم المطلوب` / `وسم الاختياري` — `وسم`, never `رقاقة` |
| option; chosen option; active option; list box | `الخيار`; `الخيار المختار`; `الخيار النشط`; `مربع قائمة (listbox)` — `محدَّد` stays the selected state |
| expanded (the state) | `موسَّع` |
| form-associated element | `عنصر مرتبط بالنماذج (form-associated)` |
| region; main region; aside; footer (of the shell, of a page) | `المنطقة`; `المنطقة الرئيسية`; `المنطقة الجانبية (aside)`; `التذييل` |
| skip link / sticky / gutters / window class | `رابط التخطي (skip link)` / `لاصق (sticky)` / `الهوامش الجانبية` / `فئة النافذة` |
| eyebrow (a page header's part) | `العنوان العلوي (eyebrow)` |
| commit (a value, a text); committed value; confirm (an option) | `يعتمد`; `القيمة المعتمَدة`; `يؤكّد` |
| input (the part) / clear button / match (in a list) | `حقل الإدخال` / `زر المسح` / `المطابقة` |
| status row (search, combobox) / status line (table, skeleton) | `صف الحالة` / `سطر الحالة` |
| caret; an input method is composing; busy (a list) | `مؤشر الكتابة (caret)`; `أسلوب الإدخال يركّب نصًّا`; `مشغولة` |
| initials / fallback / box (an avatar); named / decorative | `الأحرف الأولى` / `البديل` / `الصندوق`; `مسمّاة` / `زخرفية` |
| handler | `معالج` |
| event (of a timeline); Done / In progress / Not started | `الحدث`; `مكتمل` / `قيد التنفيذ` / `لم يبدأ` |
| media (the empty state's slot) | `الوسائط` |
| trail / level / overflow button / separator (breadcrumbs); folded | `المسار` / `المستوى` / `زر الفائض (overflow)` / `الفاصل`; `مطوي` (verb: `يطوي`) |
| underline (of a link) | `التسطير`، `مسطَّر` — not `الخط السفلي` |
| parent / leaf / guides (a tree) | `عنصر أب` / `عنصر طرفي (leaf)` / `خطوط الإرشاد` |
| swatch / picker button / hexadecimal digits | `مربع اللون (swatch)` / `زر المنتقي` / `أرقام سداسية عشرية` |
| link item (a menu) / a new context / modifier key | `عنصر رابط` / `سياق جديد` / `مفتاح تعديل` |
| external link / origin (of an address) / at rest (a link's underline) | `رابط خارجي` / `أصل (origin)` then `الأصل` / `في السكون` |
| host / the address of a destination, against a title / site icon | `المضيف (host)` then `المضيف` / `عنوان الوجهة`, where `العنوان` is the title / `أيقونة الموقع` |
| inert | `خامل (inert)` |
| words (a product's); once for the whole product; reported in development | `الكلمات`، `كلمات المنتج`; `مرة واحدة للمنتج كله`; `يُبلَّغ عنها أثناء التطوير` |
| an event fires, is emitted | `يصدر الحدث` |
| sort; reorder; Move up / Move down | `الفرز`، `يفرز` — never `يرتّب`, which is "lays out"; `إعادة الترتيب`; `نقل لأعلى` / `نقل لأسفل` |
| placeholder (a skeleton's shape) | `العنصر النائب`, plural `العناصر النائبة` — `النص النائب` stays a field's placeholder |
| exposed (to assistive technology) / kept from it | `يُعرَض للتقنيات المساعدة`, always with its complement / `يُحجب عن التقنيات المساعدة` |
| "What you write" (heading); "Use for" / "Draws" (a table's headers) | `ما تكتبه`; `يُستخدم لـ` / `ما يرسمه` |

### Terms of the One-time-code input, the File upload and the code field (Arabic)

| English | Arabic |
|---|---|
| One-time-code input (the component) | `حقل إدخال الرمز لمرة واحدة`, with `(one-time-code input)` on the page's first mention; short `حقل الرمز`. The engineer's `رمز المرة الواحدة` is corrected: interfaces say `رمز لمرة واحدة`، `رمز التحقق`. On this page `الرمز` is the code a person types, not a token |
| One-time-code field (the component) / the frame (a field around a control) / the bare control (an advanced component) | `حقل الرمز لمرة واحدة`, always in full, with `(one-time-code field)` on the page's first mention; beside it the input is `حقل إدخال الرمز لمرة واحدة`, then `حقل الإدخال` (the short `حقل الرمز` is not used where both are named) / `الإطار`, to frame is `يؤطّر` / `عنصر التحكم مجرَّدًا`, of a `مكوّن **متقدم**`. On both pages a token is `رمز التصميم` in full, since `الرمز` is the code; `Backup code` is `الرمز الاحتياطي` |
| File upload (the component) | `رفع الملفات` (confirmed), with `(file upload)` on the page's first mention; as the subject of a sentence `مكوّن رفع الملفات`, then `المكوّن` |
| cell / active cell / group mark (a one-time code) | `الخانة`, plural `الخانات` / `الخانة النشطة` / `علامة المجموعة` — `خلية` stays a table's cell |
| character (of a code, of a value) | `حرف`, plural `أحرف`, for a digit too; upper-case / lower-case letters are `أحرف كبيرة` / `أحرف صغيرة` |
| masked (a code) / text box (the role) / insertion point | `محجوب` / `مربع نص (text box)` / `موضع الإدراج (insertion point)` — `مؤشر الكتابة (caret)` is what is drawn |
| tabular figures / the system's highlight color (forced colors) | `أرقام متساوية العرض (tabular figures)` / `لون التحديد في النظام (highlight)` — `لون التمييز` is the accent |
| drop area / to drop / the platform's file picker | `منطقة الإفلات (drop area)` / `الإفلات` / `منتقي الملفات الخاص بالمنصة`, then `المنتقي` |
| limits (of a file upload) / to break a limit / too large | `القيود` / `يخالف قيدًا` / `أكبر من الحد` |
| kept file / refused file / failed row / retry | `ملف محتفَظ به` / `ملف مرفوض` / `صف فاشل` / `إعادة المحاولة` |
| instance (of a component) / entry (of a form's data) / custom element / script | `المثيل` / `مُدخلة (entry)` / `عنصر مخصص (custom element)` / `السكربت` |
| code field (a text field of `type="code"`) | `حقل الشيفرة` |
| tab character / tab stop (of text) / ligature / indent | `حرف الجدولة (tab)` / `موضع الجدولة` — `موضع توقف للمفتاح Tab` is a focus stop / `حرف مركَّب (ligature)` / `مسافة بادئة` — `الإزاحة` is an offset |
| spelling check / straight and curved quotation marks / snippet | `تدقيق إملائي` / `علامات الاقتباس المستقيمة والمعقوفة` / `مقتطف` |
| product text: Choose a file / Choose files; No file chosen; Attachment(s); Verification code | `اختيار ملف` / `اختيار ملفات`; `لم يُختر أي ملف`; `المرفق` / `المرفقات`; `رمز التحقق` |
| product text: Waiting / Uploading / Uploaded; Try again; The connection was lost. | `في الانتظار` / `جارٍ الرفع` / `تم الرفع`; `إعادة المحاولة`; `انقطع الاتصال.` |
| a file's size and a size limit in a sample | the unit as a word: `820 كيلوبايت`، `حتى 10 ميغابايت`; a sentence with a count avoids the plural: `عدد الملفات التي يتجاوز حجمها 10 ميغابايت: 3.` |
| form (of a file item: `row`, `tile`) / row / tile / box (of a tile) / strip (of pictures, of tiles) | `الهيئة` — `الشكل` is shape / `صف` / `بلاطة (tile)`, plural `بلاطات` / `الصندوق` / `سلسلة` — `الشريط` is the bar |
| body (of a file item) / pressable / format (of a file) / preview (of a file) | `الجسم` / `قابل للضغط` / `الصيغة` — `التنسيق` is formatting and styling / `المعاينة` |
| kind (of a file, by its glyph) / media type / ending (of a file's name) | `الصنف`, plural `أصناف` — `النوع` is kept for the media type / `نوع الوسائط (media type)` / `نهاية الاسم` (`الامتداد` only where the English says extension) |
| **Used in** / **Built from**, **Built with** (lead-ins of a composed element and its members) | `**يُستخدم في**` / `**يُبنى من**`, `**تُبنى من**` (agrees with the component) |
| member (of a composed element) / One level down / Setting one … apart (headings) | `العضو`, dual `العضوان`, plural `الأعضاء` / `مستوى واحد إلى الأسفل` / `تخصيص … واحد دون غيره` |
| the count's sentence / caption (of an image preview) / thumbnail / modal presentation | `جملة العدّ` / `الشرح` / `الصورة المصغّرة` / `العرض النمطي (modal)` |
| zoom, step (of the zoom) / at fit / pinch / wheel / trackpad / gesture | `التكبير`, `درجة` / `عند الملاءمة` / `قرص` / `العجلة` / `لوحة اللمس` / `إيماءة` |
| product text of an image preview and a file picker | `إغلاق`، `تكبير`، `تصغير`، `الصورة السابقة`، `الصورة التالية`، `{position} من {count}`، `جارٍ تحميل الصورة`، `تعذّر تحميل هذه الصورة`، `تكبير: …`; `إرفاق`، `إرفاق ملف`، `اختيار صور` |
| take it back (a file item's action) / two switches (two on-off props) / your DOM / bounded (an area) / room that is left | `إزالته` — it is the remove action, not `استرداده` / `خاصيتان للتشغيل والإيقاف` — `مفتاح التبديل` is the Switch / `شجرة DOM الخاصة بك` / `مؤطَّرة` — `محدودة` reads as "limited" / `عدد الملفات التي ما زال لها مكان`، `كم ملفًا آخر ما زال له مكان` (`المكان المتبقي` is not written) |

### Terms of the Menubar and of a Button in a form (Arabic)

| English | Arabic |
|---|---|
| Menubar (the component) | `شريط القوائم` (confirmed), with `(menubar)` on the page's first mention; short `الشريط`. On its page a menu of the bar is `القائمة`, plural `القوائم`, as the name has it; `قائمة الخيارات` where the Menu component, its role or its tokens are meant |
| bar item (a menubar's entry that acts) / entry / title (of a menu in the bar) / overflow item | `عنصر الشريط (bar item)`, then `عنصر الشريط`, plural `عناصر الشريط` / `البند`, plural `البنود` — a title or a bar item; `مدخل` stays a ledger's entry and `مُدخلة` a form's / `العنوان` / `عنصر الفائض (overflow)` — a link item is `عنصر رابط`, as in the Menu |
| "Entries that act" (heading); acts by itself | `البنود التي تعمل بنفسها`; `يعمل بنفسه` |
| command (of an application) / access keys / a platform's idiom | `الأمر`, plural `الأوامر` — `الإجراء` stays an action / `مفاتيح الوصول (access keys)` / `أسلوب المنصة` |
| chrome (the application's fixed interface around its content) | `واجهة التطبيق الثابتة` |
| to run (a command, an action) / to activate | `يُنفَّذ`، `ينفّذ` / `يفعّل` |
| product text of a menubar | `ملف`، `تحرير`، `عرض`، `تنسيق`، `مساعدة` — a menu's title has no article and the Edit menu is `تحرير`, as desktop interfaces have them; the command Edit stays `تعديل`. `قائمة التطبيق`، `قوائم أخرى`، `تشغيل`، `التوثيق`، `المصدر`، `السجل`، `حول التطبيق`، `المسطرة`، `تكبير` / `تصغير` |
| form / to submit / to reset / default button / submitter / validation | `النموذج` / `يرسل`، `الإرسال` / `إعادة الضبط`، `يعيد إلى قيمته الأولى` / `الزر الافتراضي` / `المُرسِل (submitter)` / `تحقق النموذج`، `التحقق` |
| id (of an element) / speech input / drawn text, drawn label | `المعرّف (id)` / `الإدخال الصوتي` / `النص المرسوم`، `التسمية المرسومة` |
| "In a form" / "A name longer than the label" (headings) | `في نموذج` / `اسم أطول من التسمية` |
| product text: Clear (a form) / Remove: Inter | `مسح` / `إزالة: Inter` — the drawn word first, then what it acts on |

### The components of the three levels (Arabic)

A "… input" is the bare control and is `حقل إدخال …`; a "… field" is the Field around it and is `حقل …`, as the One-time-code pair has it. Each takes its Latin name in parentheses on its page's first mention.

| English | Arabic |
|---|---|
| Text input / Text field | `حقل إدخال النص` / `حقل النص` — beside the text field the input is `حقل الإدخال` |
| Number input / Number field | `حقل إدخال العدد` / `حقل العدد` |
| Color input / Color field | `حقل إدخال اللون` / `حقل اللون` |
| Embedded text input / the holder | `حقل إدخال النص المدمج`, short `حقل الإدخال المدمج` — `المضمَّن` stays inline code and a shipped system / `العنصر الحاضن (holder)`, then `الحاضن` |
| Select field / Select (the bare control) | `حقل الاختيار` — the name the Select had while it was the field, which is what most pages mean by it / `عنصر الاختيار (select)` |
| Combobox field / Combobox (the bare control) | `حقل التحرير والسرد` / `مربع التحرير والسرد` |
| Slider field / Slider | `حقل شريط التمرير` / `شريط التمرير` |
| Chip field | `حقل الرقاقات` |
| Checkbox group | `مجموعة خانات الاختيار` |
| Chat composer / the capsule / the typing area | `مربع كتابة الرسائل`, short `مربع الكتابة` / `الكبسولة` / `منطقة الكتابة` |
| the box / bare / by hand / one level down, in running text / the pair (the two members by hand) | `الصندوق` / `مجرَّدًا`، `المجرَّد` / `باليد`، `مكتوبًا باليد` / `في المستوى الأدنى` — the heading stays `مستوى واحد إلى الأسفل`; "go one level down" is `انزل مستوى واحدًا` / the members named, as the English has them: `الحقل وحقل إدخال اللون المكتوبان باليد`، `مجموعة الحقول وخانات الاختيار المكتوبة باليد`; a table's header is `الكتابة باليد` — `العضوان` alone is not written for them |
| label row / supporting row / floating label / the count (drawn by a field) | `صف التسمية` / `صف النص المساعد` / `التسمية العائمة`، `تعوم في الصندوق` / `العدد` — `العدّاد` stays the text field's counter |
| a field already / a block (an element as wide as its place) / an inline box | `حقل أصلًا` / `كتلة` / `صندوق مضمَّن في السطر` |
| composed / bubbles (an event) / detail types / kebab-case | `يعبر حدود جذر الظل (composed)` / `يتصاعد (bubbles)` / `أنواع التفاصيل (detail)` / `بصيغة kebab-case` |
| flick (a quick drag that turns a picture) / an entry (of a chip field) | `دفعة سريعة`, as a fling, without the gloss / `مُدخلة` |
| the typing part (of a text input, a chip field) / a candidate / your check / taken back (an entry, to change it) | `جزء الكتابة` — `منطقة الكتابة` is the chat composer's typing area / `نص مرشَّح` / `فحصك`, plural `الفحوص` / `تُعاد إلى الكتابة` — not `إزالتها`, which here is the other action |
| checked / unchecked / indeterminate / mixed (a checkbox); the select-all checkbox; to switch a checkbox | `محدَّدة` / `غير محدَّدة` / `غير محسومة` / `مختلطة`; `خانة تحديد الكل`; `يبدّل` |
| value text / the value in words / en dash / first-strong isolate | `نص القيمة` / `القيمة بالكلمات` / `شرطة متوسطة (en dash)` — `الشرطة القصيرة` is the hyphen-minus / `عزل يتبع أول حرف قوي (first-strong isolate)` |
| return key (of an on-screen keyboard) / a coarse pointer / a hardware keyboard / tablet | `مفتاح الرجوع` / `مؤشر خشن` / `لوحة مفاتيح فعلية` / `جهاز لوحي` |
| what holds a message back / attach button, stop button, send button / thread | `ما يحبس الرسالة` / `زر الإرفاق`، `زر الإيقاف`، `زر الإرسال` / `سلسلة ردود` |
| product text of these pages | `تصفية الرموز`، `البحث عن رمز` (label) / `ابحث عن رمز` (placeholder)، `الاسم المعروض`، `الكمية، مكتب من خشب البلوط`، `المكلَّف`، `المستلمون`، `إزالة {entry}`، `تمت إضافة {entry}` / `تمت إزالة {entry}`، `عدد ما أُضيف: {count}`، `افصل بين العناوين بفاصلة.`، `أبلِغني عبر`، `اختر كل ما ينطبق.`، `رسالة نصية`، `إشعار فوري`، `كل أيام العمل`، `أدنى سعر` / `أعلى سعر`، `الرسالة`، `اكتب رسالة`، `إرفاق ملفات`، `الإشارة إلى شخص`، `إضافة رمز تعبيري` |

### Terms of the tabs' tonal row, the error text and the input box (Arabic)

| English | Arabic |
|---|---|
| tonal (the tabs' variant; the requirement tag's) | `الطراز tonal` — the value stays Latin and is never glossed, in a table's row too (`الطراز tonal`, beside `أساسي (primary)` and `ثانوي (secondary)`): `تبويبات من الطراز tonal`، `الصف من الطراز tonal`; its indicator is `طبقة نصف شفافة`, a quiet mark `علامة هادئة` |
| track / a row without its track | `المسار` / `صف بلا مساره`، `من دون مساره` |
| transition (the tabs', a tab view's) | `الانتقال` (the heading); the prop stays `transition` and its values `slide`، `fade`، `none`، `auto` stay — `التبديل` is the switch from one panel to the next; a crossfade is `تلاشٍ متقاطع`, one frame `إطار واحد`, a panel gives way `تُخلي مكانها` |
| small / medium (a row's `size`) | `الحجم small` / `الحجم medium` where the value is named (the table's rows); in running text `الصف الصغير`، `المتوسط`; the heading is `الأحجام` |
| header (a region a row stands in) / the heading of a code sample / toolbar | `ترويسة` / `عنوان عيّنة شيفرة` / `شريط أدوات` |
| the requirement tag is a Tag | `وسم المطلوب أو الاختياري وسم صغير، من الطراز filled للمطلوب ومن الطراز tonal للاختياري` — `الوسم` is the Tag component, never `رقاقة` |
| the error text below the help | `تبقى المساعدة، ويُضاف نص الخطأ تحتها`، `يُرسم تحت النص المساعد، والنص المساعد يبقى` — `يحلّ محله` and `يأخذ مكان المساعدة` are no longer written |
| a place (a word's `{name}`) / a word with places / a brace, a doubled brace, a single brace | `الموضع`, plural `المواضع`, as the List page has it: `مواضع يملؤها المكوّن`; heading `كلمة فيها مواضع` / `قوس معقوف (brace)`، `اكتبه مرتين`، `قوس مفرد` |
| isolated (a text in a sentence) / whole number / ordinals / plural forms / grammar | `يُعزل النص` / `عدد صحيح` / `أعداد ترتيبية` / `صيغ الجمع` / `قواعد نحوية` |
| a number and its unit are one piece of writing (one run) | `العدد ووحدته مقطع واحد من الكتابة` — `المقطع` is a run |
| a unit's own script / the page's script / in Latin letters or signs | `نظام كتابة الوحدة نفسه` / `نظام كتابة الصفحة` / `بأحرف أو علامات لاتينية` — `خط` is a typeface and `السكربت` a script that runs |
| right-to-left mark / a Latin currency code / a currency sign | `علامة الاتجاه من اليمين إلى اليسار (U+200F)` / `اختصار عملة بأحرف لاتينية` — not `رمز العملة`, since `رمز` is a token / `علامة العملة` |
| a number with its Latin unit, quoted in a sentence | inline code inside the quotes, so the run keeps its order after an Arabic word: `` «`44 px`» ``، `` «`$ 120 USD`» ``، `` «`40 %`» `` |
| at the number's left / read aloud | `عن يسار العدد` / `ما يُقرأ بصوت مسموع` |
| input box (`comp.input-box`) | `صندوق الإدخال`: `` `comp.input-box.*` للصندوق، وهي التي يقرؤها كل صندوق إدخال `` — `حقل الإدخال` stays the bare control |
| error form (of a radio button, a checkbox) / the ring and the dot / a checkbox's box | `هيئة الخطأ` — `حالة الخطأ` is the error condition / `الحلقة والنقطة` / `صندوق خانة الاختيار` |
| product text of these pages | `الفترة`، `يوم` / `أسبوع` / `شهر`، `الوحدات`، `قياسي` / `متوسط` / `عالٍ`، `كلمة المرور`، `8 أحرف على الأقل، بينها رقم واحد.`، `كلمة المرور هذه قصيرة جدًّا.`، `العرض`، `الوزن`، `كغم`، `تم نقل {headline} إلى الموضع {position} من {count}`، `{position} من {count}`، `1 إلى 20 من 132` |

## Japanese: conventions fixed by the quality pass

Product text inside the samples of the component pages is Japanese, in the words the page's live demo shows.

| | Japanese |
|---|---|
| Actions (buttons, menu and toolbar items) | A noun or a サ変 noun without する: 保存、削除、キャンセル、共有、コピー、検索、適用、破棄、公開、作成、返信、再試行、許可、完了。Native verbs take the dictionary form: 閉じる、戻る、開く、元に戻す、やり直す、次へ。Verb and object: 「下書きを保存」「リンクをコピー」「ゴミ箱に移動」。Never 〜します on a button, and no final punctuation. |
| Accessible names of icon-only controls | The same form: 「検索語を消去」「絞り込みを閉じる」「その他のオプション」「保存のその他のオプション」. |
| Sentences (supporting, error and dialog text) | です・ます調 with 。; an error says how to fix it: 「メールアドレスを最後まで入力してください。」 |
| Snackbar and status messages | Past polite without a final 。 when one sentence: 「会話をアーカイブしました」「リンクをコピーしました」. Two sentences punctuate both. |
| Questions | 「下書きを破棄しますか？」 with the full-width ？. |
| In progress | 〜中: アップロード中、同期中、保存中、読み込み中、検索中; 「report.pdf をアップロード中」. |
| Sign in / Sign out | サインイン / サインアウト (not ログイン / ログアウト). |
| Counters | 件 for messages, results and notifications (「未読 3 件」「24 件のメッセージ」), 枚 for photos. |
| A sample person | 山田 花子 (the demos' name); e-mail addresses and file names stay as in the English sample. |
| Long-vowel mark | Kept on -er / -or / -y words: ブラウザー、フォルダー、モディファイアー、イニシャライザー、カテゴリー、ユーザー. コンテナ and レイヤ (a design system's layer) are the two the term table writes without it; ステートレイヤー and トップレイヤー keep it. |
| What stays English in a sample | Values of the API used as captions (Filled, Tonal, Small…), platform and product names (Web, Flutter, Wi-Fi, npm), file names, glyph names, and what the component itself says in English ("2 of 3", "Select date"). A phrase a screen reader composes from the product's own strings follows the sample (「エラー、ビルド 3 件」). |

| English | Japanese |
|---|---|
| Link, Callout, Table, Inline code, Code block, Copy button (the components) | リンク、コールアウト、テーブル、インラインコード、コードブロック、コピーボタン |
| glyph / mark (the new-tab mark, a check mark) | グリフ / 印 |
| chord (keys pressed together) / sequence | 組み合わせ / 並び |
| gap (between joined parts) | 隙間 |
| row / column; a row of tabs or chips | 行 / 列; 並び |
| typeahead | 先頭文字での移動 |
| trait (of an Apple platform) | トレイト |
| modifier / initializer | モディファイアー / イニシャライザー |
| controlled (component) | 制御コンポーネント |
| client-side router | クライアントサイドのルーター |
| end user, where 利用者側 already means the developer | ユーザー |
| forced colors | 強制カラーモード |
| reduced motion | 動きを減らす設定: one platform-neutral name on every page, in place of 視差効果を減らす設定, which is one vendor's name for its setting |
| Tab stop | Tab で止まる位置 |

### Terms fixed by the finishing pass (Japanese)

After the quality pass these were still written more than one way. Each has one form now, on every page; where this table and an older row disagree, this table is right.

| English | Japanese |
|---|---|
| surface (the color role, what a thing is drawn on, an overlay's own panel) | サーフェス, in every sense: 「サーフェスのロール」「反転したサーフェスの上」「メニューのサーフェス」. 面 alone is not used for it; it stays only inside ordinary words (画面、表面、側面) |
| box (a field's tinted box, the box a text is drawn in) | ボックス on the Text field page and the pages written since; 箱 on the older pages is the same thing and was not changed |
| start / end (a side, an edge, an alignment) | 先頭側 / 末尾側: 「先頭側の端」「末尾側の端をそろえる」「末尾側にそろえる」「アンカーの先頭側」. Not 開始側 / 終了側, 始端 / 終端, 行頭側. A slot or a position inside a control stays 先頭 / 末尾 (「末尾のスロット」); the start and end of a line of text are 行の始まり / 行の終わり; the handle of a range slider that holds the lower value is 始点側のハンドル |
| handle, thumb (slider, switch, tabs) | ハンドル, also for the *thumb* of a switch (「タブと同じハンドル」) |
| grip (the short bar a sheet's drag handle draws) | つまみ — the only use of the word; the control is ドラッグハンドル |
| range | 期間 for a span of time with a start and an end (the Calendar's and the DateTimePicker's `range`: 「日付の期間」「時刻の期間」); 範囲 for a range of values and for bounds (the slider's 「値の範囲」, 「選べる範囲」, 「選択範囲」) |
| part (of a component) | パーツ; never 部品. 部分 is a section of a layout (「時刻の部分」), not a part of the anatomy |
| a variant's name in running text | The Latin name with a capital, as the variant tables write it: Tonal, Filled, Outlined, Elevated, Text, Plain, Rich (「Tonal のボタン」「既定は Tonal です」「### Tonal と Filled」). The value in code stays as the API has it (`tonal`). 塗りつぶし is an ordinary word for a glyph or a shape drawn solid (「塗りつぶしの `cancel` グリフ」), never the variant |
| action | アクション for what a product offers and a control carries out (a button's, a toolbar's, a menu's, a snackbar's action; 「取り除くアクション」; an accessibility action). 操作 is the person's own doing and the means of it: キー操作、キーボード操作、操作できる (interactive)、操作不能 (inert)、戻る操作、「その人の操作の結果」 |
| on-screen keyboard | オンスクリーンキーボード |
| behaviour | 振る舞い (verb: 振る舞う). ふるまい only as the name of Theme Studio's group, which the Studio's own interface writes that way |
| hairline | 細い線 (never ヘアライン) |
| weight (of a face) | 太さ (never ウェイト) |
| focus stop | フォーカスが止まる位置 |
| "your" (your anchor, your highlighter, the words are yours) | 利用者側の / プロダクト側の (「文言は利用者側で用意します」), never アプリの. The person using the product is 利用者, ユーザー or その人 as the page already has it: the three were not made one by this pass |
| the fixed sub-headings of Guidelines and Accessibility | 推奨 / 非推奨 / コンポーネントが担うこと / 利用者側で行うこと on every page. 推奨 items are sentences in ます; 非推奨 items open with a plain 〜しない。 and continue in ます |
| a sub-heading for what one platform draws differently | Web での描き方の違い |
| a colon after Japanese text (a caption, a comment, a lead-in) | The full-width ：, with no space after it |

The sentence that used to stand above the specs table on most component pages (that the tables are drawn from the spec file and are therefore in English) is on no page now: it had no English source, the other languages do not have it, and the site's own strings say it where the requirements are shown.

A destination's label in a navigation bar is the short word a bar has room for: 受信 and スター on the Navigation bar page, in its demos and its samples alike. A five-destination bar as wide as the demos' leaves a label about 51px, which 受信トレイ and スター付き do not fit. Everywhere else (a drawer, a list, a button's name) they stay 受信トレイ and スター付き.

### Terms the translators proposed (Japanese)

The later component pages and the second readings, from what the pages say.

| English | Japanese |
|---|---|
| emit, fire (an event) | 発火する (「`change` を発火します」); not 発行, 発生 |
| a right-to-left layout | 右から左のレイアウト; （RTL） only on a page's first mention |
| an edge gained in forced colors | 縁 (「縁が付きます」); 枠 is a frame |
| live (a callout, an empty state) | ライブの… |
| stepper (a flow of steps, of a number field) / spin button | ステッパー / スピンボタン |
| trigger / chevron / list box (a select, a combobox) | トリガー / シェブロン / リストボックス |
| marker / connector (steps, timeline) | マーカー / コネクター |
| skip link / window class | スキップリンク / ウィンドウクラス |
| touch target / minimum target | タッチターゲット where the source says "touch target" / 最小ターゲット |
| status row (search, combobox) / clear button | 状態の行 / 消去ボタン |
| check (the glyph) | チェック; 確定 is the act of committing |
| swatch / overflow button | 色見本 / オーバーフローボタン |
| fold (a trail of levels) / level (of a hierarchy) | 折りたたむ / 階層 |
| media (the empty state's slot) | メディア |
| filter (product text) | 絞り込み |
| No matches / no results (product text) | 一致する項目はありません / 一致する結果はありません |
| Increase / Decrease (a stepper's labels) | 増やす / 減らす |
| "What you write" / "Known gaps" (headings) | 書くもの / 既知の制約 |
