// markExternalLinks() (REQUIREMENTS.md, LKD-31): the marks of an external link, written where the page is made, so
// that nothing moves after the first paint. It walks the element tree the product's own renderer already has and
// parses nothing; it opens no connection and writes no file.
import { isExternal } from '../index.js';

const KEYS = new Set(['site', 'base', 'description', 'icons']);
const fail = (message) => {
  throw new TypeError(`links: ${message}`);
};
/** A property under its attribute's name, or under the name an element tree gives the same attribute. */
const NAMES = {
  'data-external': ['data-external', 'dataExternal'],
  'aria-description': ['aria-description', 'ariaDescription'],
  'aria-describedby': ['aria-describedby', 'ariaDescribedBy'],
  download: ['download'],
  class: ['class', 'className'],
};
const read = (properties, name) => NAMES[name].map((key) => properties[key]).find((value) => value !== undefined && value !== null && value !== false);
const words = (value) => (Array.isArray(value) ? value.join(' ') : String(value ?? '')).trim();
const SITE_ICON = 'tanrei-link-site-icon';

/**
 * Marks every external anchor of a tree: `data-external="true"`, the description where the anchor has none, and the
 * site's icon as its first child where one is recorded for its origin. An anchor that already carries `data-external`
 * is left as it is. The tree is the one given, changed in place and returned.
 *
 * The tree is of elements `{ type: 'element', tagName, properties, children }`. What is written is written under the
 * attributes' own names (`data-external`, `aria-description`, `class`, `referrerpolicy`).
 */
export function markExternalLinks(tree, options) {
  if (typeof tree === 'string') fail('markExternalLinks(tree, options) walks a tree of elements and parses nothing: give it the tree your renderer has, not markup');
  if (tree === null || typeof tree !== 'object') fail('markExternalLinks(tree, options) takes a tree of elements');
  if (options === null || typeof options !== 'object') fail('markExternalLinks(tree, options) takes { site } at least');
  for (const key of Object.keys(options)) if (!KEYS.has(key)) fail(`options.${key} is not an option of markExternalLinks`);
  const { site, description, icons = {} } = options;
  if (!Array.isArray(site) || site.length === 0 || !site.every((origin) => typeof origin === 'string')) fail('options.site is the list of the product\'s own origins, at least one');
  if (options.base !== undefined && typeof options.base !== 'string') fail('options.base is the address of the page the tree is of');
  if (description !== undefined && typeof description !== 'string') fail('options.description is the words that say a link leaves the site');
  if (icons === null || typeof icons !== 'object') fail('options.icons is what resolveSiteIcons() answered');
  // Where the page's own address is not known a path is not read, and is not external (isExternal()).
  const { base } = options;
  const visit = (node) => {
    if (node === null || typeof node !== 'object') return;
    if (node.type === 'element' && node.tagName === 'a') mark(node);
    if (Array.isArray(node.children)) for (const child of node.children) visit(child);
  };
  const mark = (anchor) => {
    const properties = (anchor.properties ??= {});
    const href = properties.href;
    if (typeof href !== 'string' || read(properties, 'data-external') !== undefined) return;
    if (!isExternal(href, { base, site, download: read(properties, 'download') !== undefined })) return;
    properties['data-external'] = 'true';
    if (description && !words(read(properties, 'aria-description')) && !words(read(properties, 'aria-describedby'))) properties['aria-description'] = description;
    let origin;
    try {
      origin = new URL(href, base).origin;
    } catch {
      return;
    }
    const icon = Object.hasOwn(icons, origin) ? icons[origin] : undefined;
    const children = (anchor.children ??= []);
    const first = children[0];
    const has = first?.type === 'element' && first.tagName === 'img' && words(read(first.properties ?? {}, 'class')).split(/\s+/).includes(SITE_ICON);
    if (!icon || typeof icon.src !== 'string' || has) return;
    const picture = { class: SITE_ICON, src: icon.src, alt: '', loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' };
    if (icon.width > 0 && icon.height > 0) Object.assign(picture, { width: icon.width, height: icon.height });
    children.unshift({ type: 'element', tagName: 'img', properties: picture, children: [] });
  };
  visit(tree);
  return tree;
}
