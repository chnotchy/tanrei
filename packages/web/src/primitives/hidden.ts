// `hidden` on a host.
//
// The browser's rule for the `hidden` attribute is the weakest in the cascade: a shadow sheet's `:host { display: … }`
// is an author's rule and beats it, so an element whose host names a `display` is drawn with the attribute on it. Every
// element whose sheet gives its host a `display` therefore composes this ONE rule, as the LAST of its styles — after
// every rule of its own that names the host's `display`, whatever attribute that rule asks for:
//
//   static override styles = [styles, hiddenHost];
//
// (A light-DOM element says the same in its stylesheet, as `:where(<tag>[hidden])`.) `src/hidden.test.ts` mounts every
// tag of the generated manifest with the attribute and reads its box, so an element that forgets this fails there.
//
// What it leaves alone: `hidden="until-found"`, which the browser hides by `content-visibility` and reveals for a find
// in page — the element keeps its box for that; and the product's own rule for the element's `display`, which wins
// over a shadow sheet's as it wins over the browser's.
import { css } from 'lit';

/** The host with the `hidden` attribute has no box. Composed last (see above). */
export const hiddenHost = css`
  :host([hidden]:not([hidden='until-found' i])) {
    display: none;
  }
`;
