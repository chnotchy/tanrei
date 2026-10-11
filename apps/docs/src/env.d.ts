// Registers `Astro.locals.starlightRoute` and `Astro.locals.t` (Starlight augments App.Locals from its entry types).
/// <reference types="@astrojs/starlight" />

// What the framework's build was told about its search index (`pagefind` in astro.config.mjs, with the framework's
// defaults): components/frame/Search.astro hands it to the index, as the framework's own search did.
declare module 'virtual:starlight/pagefind-config' {
  export const pagefindUserConfig: Record<string, unknown>;
}
