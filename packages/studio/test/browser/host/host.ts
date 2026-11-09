// The Studio mounted by a host that is a documentation (test/browser/share.test.js): `docs` keeps what the Studio gives
// it in `window.docsKept` and tells every call in `window.docsCalls`, as the documentation's own host does with its
// storage (apps/docs, components/StudioPage.astro). `window.pageSheetOf` is the page sheet's worker, as a host calls it.
import '@tanrei/web/tokens.css';
import '@tanrei/web/icons.css';
import '../../../src/studio.css';
import { mountStudio } from '../../../src/index';
import { pageSheetInWorker } from '../../../src/page-sheet';

type Layer = Record<string, unknown>;
const host = window as Window & { docsKept: Layer | null; docsCalls: { layer: Layer | null; show: boolean }[]; pageSheetOf: (layer: Layer) => Promise<string> };
host.docsKept = null;
host.docsCalls = [];
host.pageSheetOf = (layer) => pageSheetInWorker(layer);

const docs = {
  kept: () => host.docsKept !== null,
  keep: (layer: Layer | null, { show = false }: { show?: boolean } = {}) => {
    host.docsKept = layer;
    host.docsCalls.push({ layer, show });
  },
};
mountStudio(document.querySelector<HTMLElement>('#studio')!, { lang: 'en', address: true, docs });
