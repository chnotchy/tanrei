// Registers `Astro.locals.starlightRoute` and `Astro.locals.t` (Starlight augments App.Locals from its entry types).
/// <reference types="@astrojs/starlight" />

// What the framework's build was told about its search index (`pagefind` in astro.config.mjs, with the framework's
// defaults): components/frame/Search.astro hands it to the index, as the framework's own search did.
declare module 'virtual:starlight/pagefind-config' {
  export const pagefindUserConfig: Record<string, unknown>;
}

// When each page last changed (src/lib/lastmod.mjs, served by its integration in astro.config.mjs): the date the
// sitemap writes for a page's address, read from git once when the site is built. A page's head prints it
// (components/frame/PageTitle.astro); anything else that says when a page changed imports it from here.
declare module 'virtual:tanrei-docs/last-updated' {
  /** The page at `url` (an absolute address, or a path from the site's root): ISO 8601 with its offset, or none for a page no commit holds yet. */
  export function lastUpdated(url: string): string | undefined;
}

// Which module of `@tanrei/web` defines each element (src/lib/element-modules.mjs, from the package's manifest): a
// function for each tag that imports its module, and how many modules there are.
declare module 'virtual:tanrei-element-modules' {
  export const loaders: Readonly<Record<string, () => Promise<unknown>>>;
  export const modules: number;
}
