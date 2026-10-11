// "Source": what was typed is never lost.
//
// The Studio's state is the layer — an object. Text that does not parse is not a layer, so it cannot live there;
// it lives here, as a DRAFT, for as long as it does not parse. The rules:
//   · text that parses to a JSON object is the new layer at once, and there is no draft;
//   · text that does not parse is kept word for word; the layer every other level (and autosave) sees stays the last
//     one that parsed — nothing valid is overwritten by a draft, and a draft is never saved to the file;
//   · leaving Source keeps the draft; coming back shows exactly that text again;
//   · the draft ends when it parses, or when the person discards it.
// Nothing here touches the DOM: `ui/source.ts` and `ui.ts` hold one of these per mounted Studio.

/** 1-based line of a character offset. */
export const lineAt = (text, offset) => text.slice(0, Math.max(0, offset)).split('\n').length;

/**
 * @param {string} text
 * @returns {{ layer: object } | { error: string, line?: number }}
 */
export function readSource(text, notObject = 'a layer is a JSON object') {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { error: notObject };
    return { layer: parsed };
  } catch (error) {
    const message = /** @type {Error} */ (error).message;
    const position = /position (\d+)/.exec(message)?.[1];
    const line = /line (\d+)/.exec(message)?.[1];
    return { error: message, line: line ? Number(line) : position ? lineAt(text, Number(position)) : undefined };
  }
}

/**
 * @param {{ id?: string, text?: string } | null} [restored] a draft remembered from an earlier visit
 */
export function createSourceDraft(restored = null) {
  /** @type {{ id: string | undefined, text: string } | null} */
  let draft = restored && typeof restored.text === 'string' && 'error' in readSource(restored.text) ? { id: restored.id, text: restored.text } : null;
  return {
    /** The unparsed text, or null. */
    get text() {
      return draft?.text ?? null;
    },
    get pending() {
      return draft !== null;
    },
    /** What the editor shows when it opens: the draft, or the layer as text. */
    open(layerText) {
      return draft?.text ?? layerText;
    },
    /**
     * Every keystroke. Returns the layer to commit, or the problem to show — never both.
     * @param {string} text @param {string} [layerId] the layer this text belongs to @param {string} [notObject]
     */
    input(text, layerId, notObject) {
      const result = readSource(text, notObject);
      draft = 'error' in result ? { id: layerId, text } : null;
      return result;
    },
    discard() {
      draft = null;
    },
    /** A draft belongs to one layer file: loading another one drops it. */
    belongsTo(layerId) {
      if (draft && draft.id !== undefined && draft.id !== layerId) draft = null;
    },
    /** For storage. */
    toJSON() {
      return draft ? { id: draft.id, text: draft.text } : null;
    },
  };
}
