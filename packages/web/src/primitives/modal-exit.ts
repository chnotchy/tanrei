import { type CSSResult, unsafeCSS } from 'lit';

// How a modal `<dialog>` leaves (MDL-7: "keeping them drawn until the fade ends"), for every modal surface: the
// dialog, the modal layer, the side and bottom sheets, the image preview, the modal date-time picker, the popover's sheet.
//
// A closed `<dialog>` is `display: none` and out of the top layer. CSS can keep it drawn there while its exit plays
// (`display` and `overlay` transitioned with `transition-behavior: allow-discrete`), but only Chromium does: WebKit and
// Firefox take the dialog away at `close()`, so its surface and its scrim vanished there with no motion at all. And the
// dialog cannot simply stay modal until its exit ends: everything outside a modal dialog is inert, and focus goes back to
// the opener when it closes, not when its motion ends (MDL-5, DLG-13).
//
// So it is handed over. `closeModal()` closes the modal dialog — the page is no longer inert, and focus can go back — and
// in the same task shows it as a manual popover: still in the top layer, with its `::backdrop` (the scrim), no longer
// modal. While it leaves it is marked `data-tanrei-leaving`, inert, takes no pointer, and keeps the display and the box
// the browser gave it as a modal dialog. Its exit, and its scrim's, start from the values they showed: the scrim is a
// new `::backdrop` once the dialog is back in the top layer (and `close()` itself brings style up to date where it gives
// focus back), so both are drawn once as they were shown, with no transition, before the closed style moves them. When
// every transition on the dialog and its scrim has finished (their own `finished`, never a timer) it leaves the top layer
// at once and is closed. `openModal()` on a dialog still leaving takes it back the same way: modal again, its exit turned
// round from the values it shows (MOT-2).

/** The attribute of a modal dialog that is leaving: closed, still drawn in the top layer while its exit plays. */
export const LEAVING = 'data-tanrei-leaving';
/** While it is set the scrim starts no transition: see `modalExitStyles`. */
const QUIET = 'data-tanrei-quiet';
/** While it is set the scrim is held at the opacity it showed (`--_tanrei-backdrop-shown`). */
const KEEPING = 'data-tanrei-keeping';
const BACKDROP_SHOWN = '--_tanrei-backdrop-shown';

/**
 * What the browser draws differently for a modal dialog and for a popover (its own style sheet: `dialog:modal` has a
 * greatest width and height, `[popover]` its own padding, a closed dialog no box): held at the modal dialog's values
 * while it leaves, so that the box does not change under its exit.
 */
const HELD = ['display', 'max-width', 'max-height', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left'] as const;
/** What an exit moves on the dialog itself: drawn as it was shown where the dialog changes hands. */
const SHOWN = ['opacity', 'scale', 'translate', 'filter', 'transform'] as const;

type Own = [property: string, value: string, priority: string][];

interface Leaving {
  run: number;
  /** The dialog's own inline values of what is held, put back when it has left. */
  own: Own;
}

const leaving = new WeakMap<HTMLDialogElement, Leaving>();
let runs = 0;

/** Whether `dialog` is leaving: closed, its exit still playing in the top layer. */
export const isLeaving = (dialog: HTMLDialogElement): boolean => leaving.has(dialog);

/** Sets `property` inline with `!important`, keeping what the dialog's own inline style had. */
function hold(dialog: HTMLDialogElement, property: string, value: string, own: Own) {
  own.push([property, dialog.style.getPropertyValue(property), dialog.style.getPropertyPriority(property)]);
  dialog.style.setProperty(property, value, 'important');
}

/** Puts back what `hold` replaced, last first. */
function release(dialog: HTMLDialogElement, own: Own) {
  for (const [property, value, priority] of [...own].reverse()) {
    if (value) dialog.style.setProperty(property, value, priority);
    else dialog.style.removeProperty(property);
  }
}

/** Brings the dialog's style, and its scrim's, up to date. */
const flush = (dialog: HTMLDialogElement) => {
  void getComputedStyle(dialog).opacity;
  void getComputedStyle(dialog, '::backdrop').opacity;
};

/** The motions of the dialog itself and of its `::backdrop` (not of anything inside it) that will end. */
function motions(dialog: HTMLDialogElement): Animation[] {
  return dialog.getAnimations({ subtree: true }).filter((animation) => {
    const effect = animation.effect as KeyframeEffect | null;
    return effect?.target === dialog && animation.playState !== 'finished' && Number(effect.getComputedTiming().endTime) !== Number.POSITIVE_INFINITY;
  });
}

/** The transitions of what an appearance moves on the dialog itself (not on its scrim, nor inside it). */
function turning(dialog: HTMLDialogElement): Animation[] {
  return dialog.getAnimations().filter((animation) => {
    const effect = animation.effect as KeyframeEffect | null;
    return effect?.target === dialog && effect.pseudoElement === null && (SHOWN as readonly string[]).includes((animation as CSSTransition).transitionProperty);
  });
}

/** Runs `change` with no transition on the dialog or its scrim (one under way is finished first), and draws the result. */
function atOnce(dialog: HTMLDialogElement, change: () => void) {
  const own: Own = [];
  hold(dialog, 'transition-property', 'none', own);
  dialog.setAttribute(QUIET, '');
  for (const animation of motions(dialog)) animation.finish();
  change();
  flush(dialog);
  dialog.removeAttribute(QUIET);
  release(dialog, own);
}

/**
 * Runs `change` — which takes the dialog out of the top layer and puts it back, closed or open — with the dialog and its
 * scrim drawn as they were shown before it, with no transition; let go, they move from there to what their style gives
 * them now (MOT-2).
 */
function asShown(dialog: HTMLDialogElement, change: () => void) {
  const style = getComputedStyle(dialog);
  const shown = SHOWN.map((property) => [property, style.getPropertyValue(property)] as const);
  const scrim = getComputedStyle(dialog, '::backdrop').opacity;
  const kept: Own = [];
  hold(dialog, 'transition-property', 'none', kept);
  for (const [property, value] of shown) hold(dialog, property, value, kept);
  hold(dialog, BACKDROP_SHOWN, scrim, kept);
  // The motions it is turned from end here, where they had got to (the values just held draw it there): the engine is
  // not left to replace them across the change. WebKit, taking the dialog out of the top layer and putting it back, can
  // keep a transition beside the one that replaces it — seen as a second `scale` on a dialog closed while its entrance
  // grew it, on a loaded machine — and the exit then waits for both.
  for (const animation of turning(dialog)) animation.cancel();
  dialog.setAttribute(QUIET, '');
  dialog.setAttribute(KEEPING, '');
  change();
  flush(dialog);
  dialog.removeAttribute(KEEPING);
  dialog.removeAttribute(QUIET);
  release(dialog, kept);
}

/** Out of the top layer and closed, at once, its attributes and inline style as they were before it left. */
function gone(dialog: HTMLDialogElement, state: Leaving) {
  leaving.delete(dialog);
  atOnce(dialog, () => {
    if (dialog.matches(':popover-open')) dialog.hidePopover();
    dialog.removeAttribute('popover');
    dialog.removeAttribute(LEAVING);
    dialog.inert = false;
    release(dialog, state.own);
  });
}

/**
 * Closes the modal `dialog` (MDL-5, MDL-7). It is no longer modal at once — the page is no longer inert, so focus can
 * go back to the opener in the same task — and stays drawn in the top layer, inert and taking no pointer, while its exit
 * and its scrim's play from the values they showed; then it leaves the top layer. Resolves with true once it has, or with
 * false when it was opened again first (`openModal`). `instant` (or a dialog out of the document): closed now.
 *
 * The exit is what the dialog's style gives it closed: its `[open]` rules are its open look, and its closed rules
 * transition to the closed look. Give the dialog `modalExitStyles()`.
 */
export async function closeModal(dialog: HTMLDialogElement, { instant = false }: { instant?: boolean } = {}): Promise<boolean> {
  const was = leaving.get(dialog);
  if (was) {
    if (!instant) return leave(dialog, was);
    gone(dialog, was);
    return true;
  }
  if (!dialog.open) return true;
  if (instant || !dialog.isConnected || typeof dialog.showPopover !== 'function') {
    atOnce(dialog, () => dialog.close());
    return true;
  }
  const state: Leaving = { run: ++runs, own: [] };
  leaving.set(dialog, state);
  const style = getComputedStyle(dialog);
  const drawn = HELD.map((property) => [property, style.getPropertyValue(property)] as const);
  asShown(dialog, () => {
    for (const [property, value] of drawn) hold(dialog, property, value, state.own);
    hold(dialog, 'pointer-events', 'none', state.own);
    dialog.setAttribute(LEAVING, '');
    dialog.inert = true;
    dialog.close();
    dialog.setAttribute('popover', 'manual');
    dialog.showPopover();
  });
  return leave(dialog, state);
}

/** Waits for the exit of a dialog leaving: what replaces a transition while it runs is waited for too. */
async function leave(dialog: HTMLDialogElement, state: Leaving): Promise<boolean> {
  const { run } = state;
  for (;;) {
    if (leaving.get(dialog)?.run !== run) return false;
    // Asking flushes style: the exit's transitions exist now.
    const running = motions(dialog);
    if (!running.length || !dialog.isConnected) break;
    await Promise.allSettled(running.map((animation) => animation.finished));
  }
  if (leaving.get(dialog)?.run !== run) return false;
  gone(dialog, state);
  return true;
}

/**
 * Opens `dialog` modally (`showModal()`, where it is not open). A dialog still leaving is taken back: modal again, its
 * surface and its scrim going on from the values they show, not from their start.
 */
export function openModal(dialog: HTMLDialogElement): void {
  const state = leaving.get(dialog);
  if (!state) {
    if (!dialog.open) dialog.showModal();
    return;
  }
  leaving.delete(dialog);
  asShown(dialog, () => {
    if (dialog.matches(':popover-open')) dialog.hidePopover();
    dialog.removeAttribute('popover');
    dialog.removeAttribute(LEAVING);
    dialog.inert = false;
    release(dialog, state.own);
    dialog.showModal();
  });
}

/**
 * The CSS a dialog opened and closed with `openModal()` and `closeModal()` needs, for `dialog` (its selector): where
 * the dialog changes hands its scrim starts no transition and stands at the opacity it showed — a `::backdrop` takes
 * neither from the dialog's inline style. Compose it after the dialog's own rules.
 */
export function modalExitStyles(dialog: string): CSSResult {
  return unsafeCSS(`
  ${dialog}[${QUIET}]::backdrop {
    transition-property: none !important;
  }
  ${dialog}[${KEEPING}]::backdrop {
    opacity: var(${BACKDROP_SHOWN}) !important;
  }`);
}
