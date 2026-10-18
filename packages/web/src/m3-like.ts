// `@tanrei/web/m3-like` — the components that live in the m3-like layer. A component lives in the layer every system
// that ships it descends from: the FAB menu is shipped by the Material line only (m3-like, and m3-expressive-like
// which extends it), so its tokens are in those systems' stylesheets (`@tanrei/web/systems/m3-like.css`), and
// `@tanrei/web`, which registers the components every system has, does not register it. A product on one of those
// systems imports this entry next to the main one:
//
//   import '@tanrei/web';
//   import '@tanrei/web/m3-like';
//
// A product on another system that includes the FAB menu from m3-like in its own layer
// (`components.include: [{ "name": "fab-menu", "from": "m3-like" }]`) has its tokens in its own stylesheet, and
// imports this entry the same way.
export {
  TanreiFabMenu,
  type TanreiFabMenuCloseDetail,
  type TanreiFabMenuCloseReason,
  TanreiFabMenuItem,
  type TanreiFabMenuSize,
  type TanreiFabMenuToggleDetail,
  type TanreiFabMenuVariant,
} from './components/fab-menu/fab-menu.js';
