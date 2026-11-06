// A heading's anchor copies the address of its section (components/MarkdownContent.astro). The anchor stays the link
// to its heading that prose places (PRS-21): without script it goes to the section, and where script runs a press —
// a pointer, Enter, or assistive technology's activation — still goes there and also puts the section's whole address
// on the clipboard, and a Snackbar says so (or that it could not), as every copy of the site's frame is said
// (PageActions.astro). Its name then says it copies: lib/markdown-content.mjs writes that name beside Starlight's as
// `data-copy-label`, and this module makes it the anchor's name once it can keep the promise.

type Host = HTMLElement & { show(options: { message: string; status?: 'default' | 'error'; statusLabel?: string }): Promise<unknown> };

/** The anchors that copy, and the words of what is said: on the content's column (MarkdownContent.astro). */
const ANCHOR = 'a.tanrei-prose-anchor[data-copy-label]';
const column = document.querySelector<HTMLElement>('.sl-markdown-content[data-heading-copied]');

if (column) {
  for (const anchor of column.querySelectorAll<HTMLAnchorElement>(ANCHOR)) anchor.setAttribute('aria-label', anchor.dataset.copyLabel ?? '');

  // The page's snackbars (PageTitle.astro), defined when a reader is first about to press an anchor, so that their
  // live regions are in the document before the first message is put in one (SNK-10).
  const host = () => document.querySelector<Host>('tanrei-snackbar-host.docs-snackbars');
  let defined: Promise<unknown> | undefined;
  const defineHost = () => (defined ??= import('@tanrei/web/components/snackbar').then(() => customElements.whenDefined('tanrei-snackbar-host')));
  const near = (event: Event) => {
    if ((event.target as Element | null)?.closest?.(ANCHOR)) void defineHost();
  };
  column.addEventListener('pointerover', near);
  column.addEventListener('focusin', near);

  const tell = async (ok: boolean) => {
    if (!host()) return;
    const firstUse = !customElements.get('tanrei-snackbar-host');
    await defineHost();
    // A live region that has just entered the document is not heard yet: it is given two frames before it speaks.
    if (firstUse) await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await host()?.show(ok ? { message: column.dataset.headingCopied ?? '' } : { message: column.dataset.headingCopyFailed ?? '', status: 'error', statusLabel: column.dataset.headingError ?? '' });
  };

  column.addEventListener('click', (event) => {
    const anchor = (event.target as Element | null)?.closest?.<HTMLAnchorElement>(ANCHOR);
    // A press that opens the link elsewhere (a new tab, a new window, a download) is the browser's alone.
    if (!anchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const address = new URL(anchor.getAttribute('href') ?? '', location.href).href;
    // Written while the press is handled, which a browser that lets a page write the clipboard only then (Safari) needs.
    const written = navigator.clipboard?.writeText(address) ?? Promise.reject(new Error('no clipboard'));
    written.then(
      () => tell(true),
      () => tell(false),
    );
  });
}
