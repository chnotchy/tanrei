// The link a reader has before a Tanrei link form is drawn.
//
// A link form's anchor is in its element's shadow root: the page as built — what a crawler, the search
// indexer and a reader without script get — would hold no link at all. So the docs write a real `<a href>` inside the
// element, around the text that names the destination, and mark it `data-link-fallback`. Until the element is defined
// that anchor is the link. Once it is, the element is the link and an anchor inside it would be a link in a link, so
// this module takes the anchor away — in the same task as the element is defined, before the frame that draws it — and
// leaves its content where it stood. Where the script does not load, nothing is taken away.
//
// It is the first module of every page (components/frame/Head.astro), so it is waiting for each element before any
// module defines one. Imported by a module that defines elements, it would run only once that module's whole graph had
// arrived, and an element another script defines sooner (the header's Buttons define the hero's) would be drawn with the
// anchor still in it: the anchor's own color over the Button's fill.
import { linkAttribute } from './link';

export function withoutFallbackLinks(root: ParentNode = document) {
  for (const anchor of root.querySelectorAll(`a[${linkAttribute}]`)) {
    const host = anchor.parentElement;
    const unwrap = () => anchor.replaceWith(...anchor.childNodes);
    if (host?.localName.includes('-')) void customElements.whenDefined(host.localName).then(unwrap);
    else unwrap();
  }
}

withoutFallbackLinks();
