// Where the docs' tabs remember a reader's choice (the Tab view's `remember-as`, TAB-39): one key of the origin's
// localStorage for each shared choice (`syncKey`). The page's head reads the same keys before anything is drawn
// (`tabsBootstrap`), so the two are written here once.
export const TABS_KEY_PREFIX = 'tanrei-docs-tabs-';

/** The key a shared choice is remembered under. */
export const tabsKey = (syncKey) => `${TABS_KEY_PREFIX}${syncKey}`;

/**
 * The script of the page's head: before `tanrei-tab-view` is defined a set shows its first panel (Tabs.astro's
 * stylesheet); a reader who chose another one before is shown that one from the first paint instead, wherever a set
 * has an enabled panel of it — the rule the element itself follows once it is defined (TAB-36, TAB-39). A stored value
 * is used only if it is a plain token (lower-case letters, digits and hyphens), so nothing stored can write a rule of
 * its own; storage that is blocked or throws changes nothing.
 */
export const tabsBootstrap = `try{var p=${JSON.stringify(TABS_KEY_PREFIX)},t=/^[a-z0-9-]+$/,c='';for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k.indexOf(p)!==0)continue;var g=k.slice(p.length),v=localStorage.getItem(k);if(!t.test(g)||!t.test(v))continue;var s='tanrei-tab-view[group="'+g+'"]:not(:defined):has(>tanrei-tab-panel[value="'+v+'"]:not([disabled]))>tanrei-tab-panel';c+=s+'{display:none}'+s+'[value="'+v+'"]{display:block}'}if(c){var e=document.createElement('style');e.textContent=c;document.head.appendChild(e)}}catch(e){}`;
