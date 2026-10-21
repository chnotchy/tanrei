// What a version says about its release, read by the READMEs' status blocks (readme.js) and by the docs site's notice on
// its install pages (apps/docs/src/lib/release-notice.ts). It reads no file, so the site's build can import it.

/**
 * The version's release: `{ version, prerelease, tag, release }`. "0.1.0-next.0" is a prerelease of 0.1.0 under the
 * dist-tag `next` (the word before its first dot, the tag changesets' pre mode publishes it under); "0.1.0" is a release,
 * under `latest`.
 */
export function release(version) {
  const [base, pre] = version.split(/-(.*)/s);
  return { version, prerelease: Boolean(pre), tag: pre ? pre.split('.')[0] : 'latest', release: base };
}
