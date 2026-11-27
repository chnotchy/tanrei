// The standalone app: Theme Studio, full page, editing the layer file of the server that serves it.
import './fonts.generated.css';
import '@tanrei/web/tokens.css';
// The Studio's stylesheets, which its entry leaves to the host (src/index.ts):
// - `.tanrei-icon`: the preview draws icons with the system's icon tokens (the font is fonts.generated.css's);
// - the token tree is a tree view around the Studio's own lists, drawn by its stylesheet;
// - what opens and closes is an accordion, and a token's facts a description list, each around the Studio's own
//   elements, drawn by its stylesheet — loaded with the page, so that the first fold a panel draws does not give the
//   whole document, the preview with it, another sheet to be styled by;
// - the preview's screens hold a table and a page of text, both drawn by stylesheets around the product's own elements;
// - and the Studio's own.
import '@tanrei/web/icons.css';
import '@tanrei/web/tree-view.css';
import '@tanrei/web/accordion.css';
import '@tanrei/web/description-list.css';
import '@tanrei/web/table.css';
import '@tanrei/web/prose.css';
import '../src/studio.css';
import { type StudioLanguage, createHttpAdapter, mountStudio, studioDirection, studioLanguage, studioLanguages, studioStrings, takeToken } from '../src/index';
import './app.css';

const NS = 'tanrei';
const PREFS = `${NS}-studio-app`;
const prefs: { lang?: StudioLanguage; theme?: 'light' | 'dark' } = (() => {
  try {
    return JSON.parse(localStorage.getItem(PREFS) ?? '{}');
  } catch {
    return {};
  }
})();
const remember = () => {
  try {
    localStorage.setItem(PREFS, JSON.stringify(prefs));
  } catch {}
};

// The language: the one chosen here before, else the browser's — when the Studio is translated into it; else English.
const lang = studioLanguage(prefs.lang ?? navigator.language);
const t = studioStrings(lang);
document.documentElement.lang = lang;
document.documentElement.dir = studioDirection(lang);
// The language and the theme are chosen in one menu at the end of the bar, a glyph that says its name in a tooltip: the
// bar is one line, on a phone too, as the approved design draws it.
type Group = HTMLElement & { value: string | null };
const menuButton = document.querySelector<HTMLElement & { label: string }>('#app-menu-open')!;
const menu = document.querySelector<HTMLElement & { open: boolean }>('#app-menu')!;
menuButton.label = t.app.menu;
Object.assign(document.querySelector('#app-menu-tip')!, { text: t.app.menu });
menu.setAttribute('aria-label', t.app.menu);
menuButton.addEventListener('click', () => (menu.open = !menu.open));
menu.addEventListener('close', (event) => event.target === menu && (menu.open = false));
const radio = (value: string, label: string) => {
  const item = document.createElement('tanrei-menu-radio-item');
  item.setAttribute('value', value);
  item.setAttribute('label', label);
  return item;
};
// The translated languages, each named in its own language (and marked as that language for whoever reads it): a
// person goes straight to the one they read. Choosing one reloads the page in it.
const langGroup = document.querySelector<Group>('#lang')!;
langGroup.setAttribute('label', t.app.language);
langGroup.replaceChildren(...studioLanguages().map(({ tag, name }) => Object.assign(radio(tag, name), { lang: tag })));
langGroup.value = lang;
langGroup.addEventListener('change', (event) => {
  if (event.target !== langGroup || langGroup.value === lang || !studioLanguages().some(({ tag }) => tag === langGroup.value)) return;
  prefs.lang = langGroup.value as StudioLanguage;
  remember();
  location.reload();
});

// The theme: the device's until one is chosen here, and then that one.
const themeGroup = document.querySelector<Group>('#theme')!;
themeGroup.setAttribute('label', t.app.theme);
themeGroup.replaceChildren(radio('light', t.light), radio('dark', t.dark));
const applyTheme = () => {
  const dark = prefs.theme ? prefs.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute(`data-${NS}-theme`, dark ? 'dark' : 'light');
  themeGroup.value = dark ? 'dark' : 'light';
};
themeGroup.addEventListener('change', (event) => {
  if (event.target !== themeGroup || (themeGroup.value !== 'light' && themeGroup.value !== 'dark')) return;
  prefs.theme = themeGroup.value;
  remember();
  applyTheme();
});
applyTheme();

// The per-run token arrives in the URL fragment, which the browser never sends anywhere. It is read once and taken
// out of the address bar; this tab keeps it (session storage), so a reload — the language switch — still works.
const token = takeToken();
const session = document.querySelector<HTMLElement>('#session')!;
const root = document.querySelector<HTMLElement>('#studio')!;
// The Studio's bar takes the app's items; the holder they stood in goes.
const holder = document.querySelector<HTMLElement>('.app-bar')!;
const bar = { start: [document.querySelector<HTMLElement>('.app-start')!], end: [document.querySelector<HTMLElement>('.app-tools')!] };
const mount = (options: Parameters<typeof mountStudio>[1]) => {
  mountStudio(root, { ...options, bar });
  holder.remove();
};

// The session line is read, and drawn only when it says what the bar does not (app.css): no file behind the Studio, or
// why the session could not be read. The file itself is the name Inspect bears.
if (!token) {
  // Opened without a server behind it (a static preview of the build): the Studio still works, in the browser.
  session.textContent = t.app.noFile;
  session.dataset.shown = '';
  mount({ lang });
} else {
  const adapter = createHttpAdapter({ token });
  adapter
    .session()
    .then((info: Record<string, any>) => {
      session.replaceChildren(Object.assign(document.createElement('code'), { textContent: info.file }), ` · extends ${info.extends ?? '—'}${info.targets?.length ? ` · ${info.targets.join(', ')}` : ''}`);
      document.title = `${info.id} — Tanrei Theme Studio`;
    })
    .catch((error: Error) => ((session.textContent = error.message), (session.dataset.shown = '')))
    .finally(() => mount({ lang, adapter }));
}
