// The standalone app: Theme Studio, full page, editing the layer file of the server that serves it.
import './fonts.generated.css';
import '@tanrei/web/tokens.css';
// The Studio's stylesheets, which its entry leaves to the host (src/index.ts):
// - `.tanrei-icon`: the preview draws icons with the system's icon tokens (the font is fonts.generated.css's);
// - the token tree is a tree view around the Studio's own lists, drawn by its stylesheet;
// - what opens and closes is an accordion, and a token's facts a description list, each around the Studio's own
//   elements, drawn by its stylesheet — loaded with the page, so that the first fold a level draws does not give the
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
// The switch is a select of the translated languages, each named in its own language (and marked as that language
// for whoever reads it): a person goes straight to the one they read. Choosing reloads the page in it.
const langSelect = document.querySelector<HTMLElement & { value: string }>('#lang')!;
langSelect.setAttribute('label', t.app.language);
langSelect.replaceChildren(
  ...studioLanguages().map(({ tag, name }) => {
    const option = document.createElement('tanrei-option');
    option.setAttribute('value', tag);
    option.setAttribute('label', name);
    option.lang = tag;
    return option;
  }),
);
langSelect.value = lang;
langSelect.addEventListener('change', () => {
  if (langSelect.value === lang || !studioLanguages().some(({ tag }) => tag === langSelect.value)) return;
  prefs.lang = langSelect.value as StudioLanguage;
  remember();
  location.reload();
});

const themeButton = document.querySelector<HTMLElement>('#theme')!;
const applyTheme = () => {
  const dark = prefs.theme ? prefs.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute(`data-${NS}-theme`, dark ? 'dark' : 'light');
  // The word that is drawn is the theme the press gives; the whole name says what the word is about («Theme: Dark»),
  // read and not drawn, the drawn word kept from assistive technology so that it is not said twice.
  const word = Object.assign(document.createElement('span'), { textContent: dark ? t.light : t.dark });
  word.setAttribute('aria-hidden', 'true');
  themeButton.replaceChildren(word, Object.assign(document.createElement('span'), { className: 'app-unseen', textContent: t.labelled(t.app.theme, word.textContent) }));
  themeButton.onclick = () => {
    prefs.theme = dark ? 'light' : 'dark';
    remember();
    applyTheme();
  };
};
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

if (!token) {
  // Opened without a server behind it (a static preview of the build): the Studio still works, in the browser.
  session.textContent = t.app.noFile;
  mount({ lang });
} else {
  const adapter = createHttpAdapter({ token });
  adapter
    .session()
    .then((info: Record<string, any>) => {
      session.replaceChildren(Object.assign(document.createElement('code'), { textContent: info.file }), ` · extends ${info.extends ?? '—'}${info.targets?.length ? ` · ${info.targets.join(', ')}` : ''}`);
      document.title = `${info.id} — Tanrei Theme Studio`;
    })
    .catch((error: Error) => (session.textContent = error.message))
    .finally(() => mount({ lang, adapter }));
}
