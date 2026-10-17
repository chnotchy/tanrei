// Registers `Astro.locals.starlightRoute` and `Astro.locals.t` (Starlight augments App.Locals from its entry types).
/// <reference types="@astrojs/starlight" />

// What the framework's build was told about its search index (`pagefind` in astro.config.mjs, with the framework's
// defaults): components/frame/Search.astro hands it to the index, as the framework's own search did.
declare module 'virtual:starlight/pagefind-config' {
  export const pagefindUserConfig: Record<string, unknown>;
}

// Which module of `@tanrei/web` defines each element (src/lib/element-modules.mjs, from the package's manifest): a
// function for each tag that imports its module, and how many modules there are.
declare module 'virtual:tanrei-element-modules' {
  export const loaders: Readonly<Record<string, () => Promise<unknown>>>;
  export const modules: number;
}
