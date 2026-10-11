// What stands beside each line of a code block (specs/code-block.spec.json, COD-13 to COD-17): its number, its sign,
// its prompt, its marks and a mark's label — decided from the lines' texts and the block's props, as plain data. No
// DOM and no dependency: the element (code-block.ts) writes it into the lines of the document, and `highlightToHtml`
// and `highlightToNodes` (index.ts) write the same thing where a page is made, so a block whose lines were written by
// a build is drawn at once by `@tanrei/web/code.css` as the element will draw it, and the element, when it is defined,
// finds its own work done and writes nothing.

/** The props of a code block that change what stands beside its lines, as the element has them. */
export interface TanreiCodeLinesOptions {
  /** Each line's number, in a gutter (COD-13). */
  lineNumbers?: boolean;
  /** The number of the first line; a whole number of 1 or more, anything else is 1 (COD-25). */
  startLine?: number;
  /** Numbers and ranges separated by commas ("3, 7-9"), counted from `startLine` (COD-14). */
  highlightedLines?: string;
  addedLines?: string;
  removedLines?: string;
  /** What assistive technology reads before a marked line (COD-15, COD-16). */
  highlightedLabel?: string;
  addedLabel?: string;
  removedLabel?: string;
  /** Drawn before every line that is not empty (COD-17). */
  prompt?: string;
}

/** One line: its marks, and what is drawn beside it — null for what it does not have. */
export interface TanreiCodeLineFurniture {
  highlighted: boolean;
  added: boolean;
  removed: boolean;
  /** The line has a gutter: the block shows numbers or signs, or highlights a line. */
  gutter: boolean;
  /** The number, padded with spaces to the width of the block's widest number. */
  number: string | null;
  /** A plus, a minus, or a space for a line of a block that has signs and is neither added nor removed. */
  sign: string | null;
  prompt: string | null;
  /** The marks in words and ", ", before the line's code. */
  label: string | null;
}

export interface TanreiCodeFurniture {
  lines: TanreiCodeLineFurniture[];
  /** The number of the first line, as it was taken. */
  first: number;
  highlighted: ReadonlySet<number>;
  added: ReadonlySet<number>;
  removed: ReadonlySet<number>;
  /** What could not be read in the lists of lines (COD-14), as sentences. */
  problems: string[];
}

/**
 * Numbers are padded with the space, so the column is as wide as its widest number (COD-13): in the code's face — one
 * width to the character, as the rooms a block keeps before it is upgraded take it to be — the space is as wide as a
 * digit, and every face has its own. (A figure space is a digit wide by its name, but a face that has none takes it
 * from another face, as wide as that face's digits: the column was ragged there.) The gutter keeps its spaces
 * (`white-space: pre`).
 */
const PAD = ' ';
/** COD-16: a plus for an added line, a minus (not a hyphen) for a removed one. */
const PLUS = '+';
const MINUS = '−';

/** COD-25: a start line below 1 or not whole is 1. */
export const firstLine = (startLine: number | undefined): number => (typeof startLine === 'number' && Number.isInteger(startLine) && startLine >= 1 ? startLine : 1);

/** COD-14: a list of numbers and ranges ("3, 7-9") as the set of line numbers it names; what cannot be read is said. */
function named(list: string, name: string, first: number, last: number, problems: string[]): Set<number> {
  const lines = new Set<number>();
  for (const entry of list.split(',').map((part) => part.trim()).filter(Boolean)) {
    const range = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(entry);
    const [from, to] = range ? [Number(range[1]), Number(range[2] ?? range[1])] : [NaN, NaN];
    if (!range || from > to) {
      problems.push(`${name} holds "${entry}", which is not a line number or a range of them; it is ignored`);
      continue;
    }
    if (from < first || to > last) problems.push(`${name} names ${entry}, outside the code's lines (${first} to ${last}); what is outside is ignored`);
    for (let n = Math.max(from, first); n <= Math.min(to, last); n++) lines.add(n);
  }
  return lines;
}

/**
 * What stands beside each line. `texts` are the lines' texts in order, with or without their line breaks: only whether
 * a line is empty is read from them (COD-17). `true` for the props is a block that has none of them.
 */
export function furnish(texts: readonly string[], given: TanreiCodeLinesOptions | true = {}): TanreiCodeFurniture {
  const options = given === true ? {} : given;
  const problems: string[] = [];
  const first = firstLine(options.startLine);
  const last = first + texts.length - 1;
  const highlighted = named(options.highlightedLines ?? '', 'highlightedLines', first, last, problems);
  const added = named(options.addedLines ?? '', 'addedLines', first, last, problems);
  const removed = named(options.removedLines ?? '', 'removedLines', first, last, problems);
  for (const n of added) {
    if (!removed.has(n)) continue;
    // COD-14: a line named as both added and removed is drawn removed.
    added.delete(n);
    problems.push(`line ${n} is named by addedLines and by removedLines; it is drawn removed`);
  }
  const numbers = !!options.lineNumbers;
  const signs = added.size > 0 || removed.size > 0;
  const gutter = numbers || signs || highlighted.size > 0;
  const width = String(last).length;
  const lines = texts.map((text, index): TanreiCodeLineFurniture => {
    const n = first + index;
    const marks = { highlighted: highlighted.has(n), added: added.has(n), removed: removed.has(n) };
    const words = [marks.highlighted ? options.highlightedLabel : '', marks.added ? options.addedLabel : '', marks.removed ? options.removedLabel : ''].filter(Boolean);
    return {
      ...marks,
      gutter,
      number: numbers ? String(n).padStart(width, PAD) : null,
      sign: signs ? (marks.removed ? MINUS : marks.added ? PLUS : ' ') : null,
      prompt: options.prompt && text !== '' && text !== '\n' ? options.prompt : null,
      label: words.length ? `${words.join(', ')}, ` : null,
    };
  });
  return { lines, first, highlighted, added, removed, problems };
}
