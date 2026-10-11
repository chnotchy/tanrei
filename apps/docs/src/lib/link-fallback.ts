// The link a reader has before a Tanrei link form is drawn.
//
// A link form's anchor is in its element's shadow root: the page as built — what a crawler, the search
// indexer and a reader without script get — would hold no link at all. So the docs write a real `<a href>` inside the
// element, around the text that names the destination, and mark it `data-link-fallback`. Until the element is defined
// that anchor is the link. Once it is, the element is the link and an anchor inside it would be a link in a link, so
// this module takes the anchor away and leaves its content where it stood.
//
// It runs before the module that defines the elements (import it first): an element never sees the anchor in its
// content. Where the script does not load, nothing is taken away.
import { linkAttribute } from './link';

export function withoutFallbackLinks(root: ParentNode = document) {
  for (const anchor of root.querySelectorAll(`a[${linkAttribute}]`)) anchor.replaceWith(...anchor.childNodes);
}

withoutFallbackLinks();
