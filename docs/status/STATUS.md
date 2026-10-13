<!-- GENERATED FILE — DO NOT EDIT. Source: specs/. Regenerate with `pnpm generate`. -->
# Component status

Legend: · planned · ◌ lagging · ◔ alpha · ◑ beta · ● stable · ✕ deprecated

Level: 62 base · 19 composed · 4 feature. A component of the first level is a single part with one job; one of the second is put together from other components to complete one value or one job; one of the third holds several controls, each with a value or an action of its own, and coordinates them by state of its own. A cell names the members a component is built from.

Listing: 77 default · 8 advanced. A component of the first value is shown wherever components are listed; one of the second is a bare control that most products meet inside a higher level, listed only when everything is asked for. This matrix shows every component, whatever its listing.

| Component | Level | Listing | Category | Spec | Web Components | SwiftUI | Jetpack Compose | Flutter | React Native |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Button | base | default | actions | ✓ | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging |
| Checkbox | base | default | selection | ✓ | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging |
| Radio button | base | default | selection | ✓ | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging |
| Switch | base | default | selection | ✓ | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging |
| Text input | base | advanced | text-inputs | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Text field | composed: Field, Text input | default | text-inputs | ✓ | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging |
| Chip field | composed: Field, Text input, Chip | default | text-inputs | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Card | base | default | containment | ✓ | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging |
| Divider | base | default | containment | ✓ | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging |
| Badge | base | default | communication | ✓ | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging |
| Progress indicator | base | default | communication | ✓ | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging |
| Loading indicator | base | default | communication | ✓ | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging |
| Chip | base | default | selection | ✓ | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging |
| Modal layer | base | advanced | containment | ✓ | ◔ alpha | · planned | · planned | · planned | · planned |
| Dialog | composed: Modal layer | default | containment | ✓ | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging |
| Menu | base | default | selection | ✓ | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging |
| List | base | default | containment | ✓ | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging |
| Tabs | base | default | navigation | ✓ | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging |
| Tab view | composed: Tabs | default | navigation | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Snackbar | base | default | communication | ✓ | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging |
| Tooltip | base | default | communication | ✓ | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging |
| Keyboard shortcut | base | default | communication | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Main action button | base | default | actions | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| App bar | base | default | navigation | ✓ | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging |
| Navigation bar | base | default | navigation | ✓ | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging |
| Navigation drawer | composed: Modal layer | default | navigation | ✓ | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging |
| Slider | base | default | selection | ✓ | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging |
| Slider field | composed: Field, Slider | default | selection | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Search | feature: Modal layer | default | navigation | ✓ | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging |
| Bottom sheet | composed: Modal layer | default | containment | ✓ | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging |
| Side sheet | composed: Modal layer | default | containment | ✓ | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging |
| Segmented button | base | default | actions | ✓ | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging |
| Button group | base | default | actions | ✓ | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging |
| Button with menu | composed: Menu | default | actions | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| FAB menu | base | default | actions | ✓ | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging |
| Toolbar | base | default | navigation | ✓ | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging |
| Carousel | base | default | containment | ✓ | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging | ◌ lagging |
| Calendar | base | default | selection | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| DateTimePicker | composed: Calendar, Modal layer | default | selection | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Tag | base | default | communication | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Prose | base | default | foundations | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Link | base | default | navigation | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Inline code | base | default | communication | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Code block | base | default | containment | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Copy button | composed: Button | default | actions | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Table | base | default | containment | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Callout | base | default | communication | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Popover | base | default | containment | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Steps | base | default | containment | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Accordion | base | default | containment | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Description list | base | default | containment | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Figure | base | default | containment | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Pagination | base | default | navigation | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Breadcrumbs | base | default | navigation | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| App shell | base | default | containment | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Page header | base | default | containment | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Table of contents | base | default | navigation | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Tree view | base | default | containment | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Avatar | base | default | communication | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Timeline | base | default | containment | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Empty state | base | default | communication | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Tag group | base | default | communication | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Field | base | default | text-inputs | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Field group | base | default | selection | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Radio group | composed: Field group, Radio button | default | selection | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Checkbox group | composed: Field group, Checkbox | default | selection | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Select | base | default | selection | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Select field | composed: Field, Select | default | selection | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Combobox | base | advanced | text-inputs | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Combobox field | composed: Field, Combobox | default | text-inputs | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Number input | base | advanced | text-inputs | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Number field | composed: Field, Number input | default | text-inputs | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Color input | base | advanced | text-inputs | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Color field | composed: Field, Color input | default | text-inputs | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Link card | base | default | navigation | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Skeleton | base | default | communication | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Menubar | composed: Menu | default | selection | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| One-time-code input | base | advanced | text-inputs | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| One-time-code field | composed: Field, One-time-code input | default | text-inputs | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| File upload | feature: File picker, File item | default | selection | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Image preview | feature: Modal layer | default | containment | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| File picker | base | advanced | selection | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| File item | base | default | communication | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Embedded text input | base | advanced | text-inputs | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |
| Chat composer | feature: Embedded text input, File picker, File item, Button | default | text-inputs | ✓ | ◌ lagging | · planned | · planned | · planned | · planned |

## Not shipped by a system

A system can leave a component, or some of its variants, out; the implementation above still exists.

- `cupertino`: fab-menu, navigation-bar (filled)
- `m3-expressive-like`: navigation-bar (filled), tabs (tonal)
- `m3-like`: navigation-bar (filled), tabs (tonal)
- `tanrei`: segmented-button, fab-menu, text-input (filled, outlined), select (filled, outlined), combobox (filled, outlined), number-input (filled, outlined), color-input (filled, outlined)
