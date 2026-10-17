// The notice at the top of an install page (components/ReleaseNotice.astro): what is published and how to install it,
// from the version in tanrei.config.json and the paused platforms in packages/tools/paused-platforms.json, read as the
// READMEs' status blocks read them (packages/tools/src/release.js). The pages are written as they read once a version is
// released; the notice says what differs today, and says nothing once nothing does:
//
// - a platform whose CI is paused is not published (release.yml publishes none of its packages): its guide says so;
// - while the version is a prerelease (`0.1.0-next.0`), what is installed is that prerelease, under its dist-tag;
// - a release of a platform that is not paused needs no notice: the page's install steps are the whole story.
import config from '../../../../tanrei.config.json';
import pausedPlatforms from '../../../../packages/tools/paused-platforms.json';
import { release } from '../../../../packages/tools/src/release.js';
import { fill, strings } from './i18n';

export interface Notice {
  title: string;
  /** Each paragraph's HTML. */
  paragraphs: string[];
}

export interface NoticeOptions {
  /** The language of the page. */
  lang: string;
  /** The platform whose guide the page is. Without one and without packages, the notice is the overview's: every platform's. */
  platform?: string;
  /** The packages the page installs, by the names they are published under. */
  pkgs?: string[];
  /** Where they are published: "npm", "Maven Central"… */
  registry?: string;
  /** The version (tanrei.config.json's unless given). */
  version?: string;
  /** The paused platforms (packages/tools/paused-platforms.json unless given). */
  paused?: string[];
}

const code = (text: string) => fill('<code>{text}</code>', { text });
/** `template` with its `{name}` places filled: `text` values are escaped, `html` values are put as they are. */
const put = (template: string, text: Record<string, string>, html: Record<string, string> = {}) =>
  fill(template, text).replace(/\{(\w+)\}/g, (place, name: string) => html[name] ?? place);

/** The notice the page carries, or null where it needs none. */
export function releaseNotice({ lang, platform, pkgs = [], registry = 'npm', version = config.version, paused = pausedPlatforms.paused }: NoticeOptions): Notice | null {
  const t = strings(lang).release;
  const list = (items: string[]) => new Intl.ListFormat(lang, { type: 'conjunction' }).format(items);
  const { prerelease, tag, release: next } = release(version);
  const repository = config.repository.public;
  // The rule while the versions are 0.x prereleases; nothing is said of later ones.
  const noCompat = prerelease && version.startsWith('0.') ? ` ${t.noCompat}` : '';

  if (platform && paused.includes(platform)) {
    const pkg = pkgs[0] ?? '';
    return { title: t.unpublishedTitle, paragraphs: [put(t.unpublished, { pkg, registry, platform: strings(lang).platform[platform] ?? platform, repository })] };
  }
  if (platform || pkgs.length) {
    if (!prerelease) return null;
    const install = list(pkgs.map((pkg) => code(`${pkg}@${tag}`)));
    return { title: t.prereleaseTitle, paragraphs: [put(t.prerelease, { version, registry, tag, release: next }, { install }) + noCompat] };
  }

  const paragraphs: string[] = [];
  if (prerelease) paragraphs.push(put(t.prereleaseAll, { version, tag, release: next, example: `npm install ${config.packages.npmScope}/web@${tag}` }) + noCompat);
  const held = config.platforms.filter((p) => paused.includes(p)).map((p) => fill('{name}', { name: strings(lang).platform[p] ?? p }));
  if (held.length) paragraphs.push(put(t.unpublishedAll, {}, { platforms: list(held) }));
  if (!paragraphs.length) return null;
  return { title: prerelease ? t.prereleaseTitle : t.unpublishedTitle, paragraphs };
}
