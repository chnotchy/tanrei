# @tanrei/react

> **Pre-release.** Nothing has been released: `@tanrei/react` is not on npm yet, and its API can change. Documentation: <https://tanrei.chnotchy.com/getting-started/react/>, including how to build and install it from source today.

React bindings for the Tanrei Web Components. Every component here is a thin wrapper
([`@lit/react`](https://www.npmjs.com/package/@lit/react) `createComponent`) around a custom element of
[`@tanrei/web`](../web/README.md), **generated** from that package's custom elements manifest — so the React API cannot
drift from the elements. There is no second implementation: tokens, states, behaviour choices, accessibility, icons and
fonts are those of `@tanrei/web`, and its README is the reference for all of them.

```sh
pnpm add @tanrei/react @tanrei/web react
```

`react` is a peer dependency (`>=18`). `@tanrei/web` is a dependency, but you import its stylesheets yourself, so list it.

## Usage

```tsx
import '@tanrei/web/tokens.css'; // the default design system, on :root
import '@tanrei/web/icons.css'; // optional: .tanrei-icon
import { Button } from '@tanrei/react';

export function Toolbar({ busy, onDeploy }: { busy: boolean; onDeploy: () => void }) {
  return (
    <Button variant="tonal" size="large" disabled={busy} onClick={onDeploy}>
      <span slot="icon" className="tanrei-icon" aria-hidden="true">rocket_launch</span>
      Deploy
    </Button>
  );
}
```

Importing a wrapper imports its element (`@tanrei/web/components/button`), which registers `<tanrei-button>`; nothing else
has to be loaded, and a bundler leaves out the wrappers you do not import, with their elements. A wrapper is named after its tag without the prefix: `<tanrei-button>` → `Button`.

Design systems, themes and contrast are attributes on any ancestor, exactly as on the web — they are not props and
there is no provider:

```tsx
import '@tanrei/web/systems/m3-like.css';

<section data-tanrei-system="m3-like" data-tanrei-theme="dark" data-tanrei-contrast="high">
  <Button>Save</Button>
</section>;
```

A product's own layer, built with `tanrei build`, is one more stylesheet used the same way. The sizes and variants it
adds become legal prop values through the `.d.ts` that build writes (it augments `@tanrei/web/registry`); the wrapper's
prop types are the element's, so they follow.

## One entry per design system

What you can import is what your design system has: the package has an entry for each system Tanrei ships, and an
editor completes, and a type check accepts, only that system's components and variants.

| Entry | What it exports |
|---|---|
| `@tanrei/react` | The components of the default system, Tanrei. Not the FAB menu, which lives in the m3-like layer, nor the segmented button, which Tanrei leaves out (`import { FabMenu } from '@tanrei/react'` is TS2305); and a variant Tanrei leaves out is not a value of the prop (`<TextField variant="outlined">` is TS2322) |
| `@tanrei/react/m3-like`, `@tanrei/react/m3-expressive-like`, `@tanrei/react/cupertino` | The components of that preset, with its variants |
| `@tanrei/react/advanced` | The components listed as advanced, the building blocks of others: `TextInput`, `NumberInput`, `ColorInput`, `OneTimeCodeInput`, `EmbeddedTextInput`, `Combobox`, `FilePicker`, `ModalLayer`. Each one's doc comment names the components built from it, which a product usually writes instead |
| `@tanrei/react/all` | Every wrapper, whichever system has its component: for a design system of your own (built with `tanrei build`) and for building one |

```tsx
import '@tanrei/web/systems/m3-like.css';
import { FabMenu, FabMenuItem, TextField } from '@tanrei/react/m3-like';
```

A wrapper is the same component in every entry — a system's entry narrows the type of `variant`, nothing at run time
— so a bundler keeps only what you import, from whichever entry. A wrapper of an element a component draws among its
children (`ListItem`, `Option`, `Tab`) is in every entry its component is in. Every entry also exports the words
(`setWords`, `missingWords`) and `TanreiEvent`.

The entries say what the components manifests say: each system's `@tanrei/web/systems/<id>.components.json` names,
for each component, the entry its wrapper is imported from (`react.import`), and the entries are generated from those
manifests. The manifest of your own system, which `tanrei build` writes into its `tokens` output, names
`@tanrei/react/all`.

## How props, children and events map

| In React | Becomes | Notes |
|---|---|---|
| A prop that is a property of the element (`variant`, `size`, `disabled`) | the element's **property**, set after render | not an attribute in React's output; the element reflects these three to attributes itself, so `tanrei-button[variant='tonal']` still matches in CSS |
| `className`, `style`, `id`, `slot`, `aria-*`, `data-*`, any other prop | passed to React as for any HTML element | `className` becomes `class` |
| `children` | light-DOM children, distributed by the element's slots | the default slot is the label; give a child `slot="icon"` for the leading icon |
| `ref` | the element instance (`TanreiButton`) | `ref.current.focus()` focuses the inner native button (`delegatesFocus`) |
| `onClick`, `onFocus`, `onBlur`, `onKeyDown`, … | React's own handlers | **native events stay native**: the element fires the real `click` (pointer, Enter, Space, assistive technology — once each), which bubbles and is composed, so React sees it like any other click. A disabled button fires none |
| `on<Event>` for an element's **custom** event | `addEventListener` on the element | the generator maps every non-native event of the manifest. The prop is `on` and the event's name in camel case, as React names its own (`onKeyDown`): the element fires `expandedchange` in lowercase, as the platform's own events are named (`selectionchange`), and the spec names it `expandedChange`, so the prop is `onExpandedChange` — likewise `onEntryError`, `onPickerRequest`, `onSelectionChange`, `onCopyFailed`. `change` is always mapped: a native `change` is not composed, so a component dispatches its own on the host, which React's synthetic `onChange` does not see — `<Button toggle label="Mute" onChange={(e) => setOn(e.detail.selected)}>`. The handler receives the element's event, with `currentTarget` typed as the element (`TanreiEvent`, below) |
| `onInput` of `Slider`, `NumberField` and `NumberInput` | `addEventListener('input')` on the element | an event with a native name that carries a **detail of the element's own** is mapped like a custom one, because React's synthetic event for that name has no `detail`: `<Slider onInput={(e) => setVolume(e.detail.value)} />`. Every other `onInput` (a text field's, a search's) is React's own |
| `confirming`, `dismissive` on `Button` | the **attribute**, present or absent | the two marks a button group, a dialog, a popover and a side sheet read from their actions to place them. They are attributes and not properties of the element, so the generator types them from the manifest (`ButtonMarks`) and writes `true` as a present attribute and `false` as an absent one in every React — React before 19 would write the text `"false"`, which is still a present attribute |
| `form` on `Button` and on every form-associated control (`TextField`, `NumberField`, `NumberInput`, `ColorField`, `OneTimeCodeInput`, `Select`, `SelectField`, `Combobox`, `Checkbox`, `Switch`, `Slider`, `RadioButton`, `RadioGroup`, `Search`, `FileUpload`) | the **attribute**: the id of a form | `<Button type="submit" form="checkout">` sends a form it does not stand in, and `<TextField name="card" form="checkout">` is a field of one. The element's own `form` property is read-only and returns the form element, and a prop cannot be assigned to a property that has only a getter, so the wrapper keeps `form` out of the props and writes it on the element as the attribute when the element is attached, at every render. Its type is `string`. `type`, `name` and `value` are properties of the element and are passed as any prop |
| `onClick` of a menu item (`MenuItem`, `MenuCheckboxItem`, `MenuRadioItem`) | `addEventListener('click')` on the element | the one native event mapped directly: a `<ButtonWithMenu>` forwards its items into its menu and stops their click at its shadow root (only its leading half's click reaches listeners on it), so React's root listener would never see it. The handler receives the native `MouseEvent`. It works the same in an ordinary `<Menu>`; `ButtonWithMenu`'s own `onClick` stays React's and fires for the leading half only |

**A prop is the element's property, not its attribute**, and a few are not the attribute in camel case. An attribute
that switches something off is the property that is on by default: `<BottomSheet handle={false}>` (attribute
`no-handle`), `<Tooltip describes={false}>` (`no-describe`), `<Carousel snap={false}>` (`free-scroll`),
`<Card inset={false}>` (`flush`), `<MainActionButton extended={false}>` (`collapsed`). `closedBy`, `readOnly`,
`maxLength`, `crossOrigin` and `referrerPolicy` are spelled as the DOM spells them, and the app shell's `scroll`
attribute is the prop `scrolls` (`<AppShell scrolls="main">`), because an element already has a `scroll()` method.
The prop types are the element's, so an editor completes the right names.

The element's parts (`::part(container)`, `::part(label)`) and custom properties (`--tanrei-comp-button-*`) are styled
from your CSS as on the web. Each wrapper's doc comment — what an editor shows on hover — lists the element's slots and
what each event prop is fired for, from the same manifest.

### Events and refs, typed

Every mapped `on…` prop is a listener on the element itself, so its `currentTarget` is the element. Where the event
carries a detail the handler reads `event.detail`; where it is a plain `Event`, as a native control's `change` is, the
element already holds the new value:

```tsx
import { Select, SnackbarHost, type TanreiEvent } from '@tanrei/react';
import type { TanreiSelect, TanreiSnackbarHost } from '@tanrei/web';
import { useRef } from 'react';

// Inline, the handler is typed by the prop. To name it, use TanreiEvent<Element, Event?>.
const onUnit = (event: TanreiEvent<TanreiSelect>) => setUnit(event.currentTarget.value);
<Select label="Unit" value={unit} onChange={onUnit} />;

// A ref is the element; the element classes and their detail types come from @tanrei/web (types only: nothing is loaded).
const snackbars = useRef<TanreiSnackbarHost>(null);
<SnackbarHost ref={snackbars} />;
snackbars.current?.show({ message: 'Saved' });
```

`target` keeps the platform's type, since an event that bubbles up from a child (a radio button's `change` at its group)
has the child as its target. A detail that is a union with no shared key (`List`'s and `SegmentedButton`'s `change`:
`{ value }` or `{ values }`) is narrowed by `'value' in event.detail`, or read from the element instead:
`onChange={(e) => setTheme(e.currentTarget.value)}`.

Props that are the element's properties keep their property types, which matters where the attribute cannot say it:
`<ProgressIndicator value={null} label="Syncing" />` is indeterminate (as a `<progress>` without `value`),
`<ProgressIndicator value={3} max={10} valueText="3 of 10 files" … />` sets the `value-text` it reads, and
`<Divider decorative={false} />` exposes a separator. A badge wraps its anchor as children and describes it:
`<Badge count={3} label="3 unread"><Button variant="text" label="Inbox"><span slot="icon">inbox</span></Button></Badge>`.
The selection controls are form-associated elements that switch themselves and then fire `change` as a `CustomEvent`:
`<Checkbox label="Email me updates" checked={on} onChange={(e) => setOn(e.detail.checked)} />`,
`<Switch label="Wi-Fi" checked={wifi} onChange={(e) => setWifi(e.detail.checked)} />`, and for a group of radio
buttons, one `name` and the chosen `value`: `<RadioButton name="size" value="m" label="Medium" checked={size === 'm'}
onChange={(e) => setSize(e.detail.value)} />` inside a `role="radiogroup"` element with a name. `labelHidden` keeps
the name without drawing it.

## What is not an element

The wrappers are generated from custom elements, so they cover the components that are one. The rest of `@tanrei/web`
is used from React as it is — there is no second API to learn, and none of it needs a wrapper to type-check:

| | In React |
|---|---|
| **Components that are a class and a stylesheet** — Link (`tanrei-link`), Steps (`tanrei-steps`), Timeline (`tanrei-timeline`), Previous and next links (`tanrei-previous-next-links`), inline code (`tanrei-code`), prose (`tanrei-prose`) | JSX's own elements with `className`, the stylesheet, and — for the link, the timeline and the previous and next links — the script that adds what a stylesheet cannot (`import '@tanrei/web/link'`, `…/timeline`, `…/previous-next-links`; `…/steps` adds only its reports in development). A wrapper imports its own element and none of these scripts, so import the one you use once. A router's link component takes the class as any anchor does. There is no `Link`, `Steps`, `Timeline` or `PreviousNextLinks` component in this package |
| **Elements whose content is your own markup** — `Table`, `DescriptionList`, `Figure`, `Accordion`, `TableOfContents`, `TreeView`, `Breadcrumbs`, `PageHeader`, `AppShell`, `LinkCard`, `Avatar`, `Callout`, `EmptyState`, `CodeBlock` | the wrapper around JSX's own `<table>`, `<dl>`, `<details>`, `<ul>`, `<a>` … children, plus the component's stylesheet (`@tanrei/web/table.css`, `…/accordion.css`, `…/code.css` for the code block, and so on — each named in `@tanrei/web`'s README), which draws that markup and holds the layout before the element is defined. An item is not a component: an accordion's is a `<details>`, a tree's an `<li>` |
| **The product's words** (`setWords`, `missingWords`, `TanreiWords`, `WordKey`) | re-exported here; call `setWords()` once, before the first render |
| **Links** (`observeLinks`, `setSiteOrigins`, `setExternalLabel` of `@tanrei/web/link`), `observeSteps`, `observeTimeline`, `observePreviousNextLinks`, the icon helpers of `@tanrei/web/icons` | imported from `@tanrei/web/link`, `…/steps`, `…/timeline`, `…/previous-next-links` and `…/icons`. Importing one of those modules starts it for the document; the functions are for a shadow root of your own, and for telling the links which origins are the site's |
| **The link card's data and markup** (`@tanrei/web/links`, and `@tanrei/web/links/node` where the site is built) | plain functions: read a destination at build time and pass the result to `LinkCard`'s props |
| **The highlighter** (`@tanrei/web/highlight`) | plain functions; a `CodeBlock` with a `language` loads it by itself. `setHighlighter()` replaces it for every block |

```tsx
import { setWords } from '@tanrei/react';
import '@tanrei/web/link.css';
import '@tanrei/web/steps.css';
import { setExternalLabel, setSiteOrigins } from '@tanrei/web/link'; // importing it starts it: links that leave the site are marked
import { Link as RouterLink } from 'react-router-dom';

setWords({ closeLabel: 'Close', targetLabel: 'opens in a new tab' });
setSiteOrigins(['https://docs.example.com']);
setExternalLabel('external link');

<ol className="tanrei-steps" role="list">
  <li>
    <p className="tanrei-steps-title">Install</p>
    <p>Read <RouterLink className="tanrei-link" to="/guides/setup/">the setup guide</RouterLink> first.</p>
  </li>
</ol>;
```

A framework that owns the children it rendered and an element that rearranges them do not always agree: the code block
is given its text as the `code` prop for that reason (`<CodeBlock language="js" code={source} />`), not as children.

## Server rendering

The wrappers can be imported and rendered on a server (Lit ships the DOM shims it needs under Node), with two things to
know:

- **They are client components.** A wrapper uses refs and layout effects. With React Server Components (Next.js app
  router and the like), use it from a module marked `'use client'`.
- **Without a Lit SSR integration the server HTML is the bare tag**: `<tanrei-button class="…">Deploy</tanrei-button>` —
  no shadow root, and the element's props are not in the markup, because they are set as properties in a layout
  effect once the component mounts (hydration warnings for the element are suppressed for that reason). The label is
  readable at once; the button's look arrives when the element is defined and React has mounted. To send the shadow
  root from the server (declarative shadow DOM) add [`@lit-labs/ssr-react`](https://www.npmjs.com/package/@lit-labs/ssr-react),
  which `@lit/react` detects and hands the element props to.

## Generated code

`src/generated/` is written by `scripts/generate.js` from `packages/web/custom-elements.json`, and
`src/entries/generated/` by `scripts/entries.js` from the components manifests (`tokens/generated/<id>/components.json`)
once they are written (`pnpm generate` runs both); neither is edited by hand: add a component in `@tanrei/web` — spec
first — and regenerate. Each wrapper is a module of its own (`src/generated/wrappers/<name>.ts`, which imports its
element's module), and `src/generated/components.ts` re-exports them all (the `/all` entry). Each other entry re-exports
the wrappers the manifests put in it; which entry a component is in is decided in one place, `importOf` in
`packages/tokens-build/src/components-manifest.js`, and the package's `exports` must name each entry (the generator
fails until they do). The package declares no side effects (`"sideEffects": false`) and every call made at load is
marked pure, so a bundler keeps the wrappers a product uses and, through them, only their elements: `import { Calendar }
from '@tanrei/react'` bundles the calendar and the buttons it is drawn with, not the whole of `@tanrei/web`
(`test/tree-shaking.test.mjs` holds this for every wrapper from every entry). Wrappers in one shared module could not be
dropped: each element's module defines its element when it is evaluated, a side effect `@tanrei/web` declares.
`pnpm --filter @tanrei/react build` compiles it with `tsc`. What the generator reads from the manifest: an element's
tag and class, its events with their types (`@fires {CustomEvent<Detail>} name`), its slots and event descriptions for
the doc comment, and its attributes that have no property (`@attr {boolean} name`) for the marks. From the specs it
reads only how each event's name is cased (`platforms.web.events`): an event that no spec names stops it, unless it is
one of the platform's one-word events (a dialog's `cancel`).

Four small files beside it are written by hand: `src/events.ts` (`TanreiEvent`), `src/marks.ts` (how a mark becomes
an attribute), `src/narrowed.ts` (the type of a wrapper whose system leaves variant values out) and `src/common.ts`
(what every entry exports besides its wrappers). `pnpm --filter @tanrei/react test` compiles `test/types.tsx` — what a typed project must be able to
write against the wrappers, and what must stay an error — and runs `test/*.test.mjs` under Node; neither needs a
browser.

For behaviour choices (`sys.behavior.*`: ripple, dim, glow focus), corner smoothing (`sys.shape.corner-smoothing`),
press-hold, icons, fonts, text styles (`text.css`, `prose.css`), elevation, and the Tailwind / shadcn mappings, read
[`@tanrei/web`'s README](../web/README.md).
