// FPK-9: the one rule by which an arrival of files is judged — chosen in a picker, dropped on a File picker's area or
// on a drop zone (DRZ-9), or handed over by the product (FPK-31, DRZ-15). Plain functions of what they are given:
// nothing of a file is read but what the browser reports of it without opening it — its name, its size, its kind
// (FPK-7, DRZ-10) — and nothing is kept.
import { acceptList } from './file-format.js';

/** Why a file was refused — a name for the product's code, never words: its kind, its size, or how many there were. */
export type FileRejectReason = 'type' | 'size' | 'count';
/** A file that was refused, with the reason. */
export interface FileRefused {
  file: File;
  reason: FileRejectReason;
}
/** The files that passed, and the refused files with their reasons, each in the order given. */
export interface FileJudgement {
  accepted: File[];
  refused: FileRefused[];
}
/** The limits an arrival is judged by: the props of the File picker and of the drop zone of the same names. */
export interface FileLimits {
  multiple: boolean;
  accept: unknown;
  maxSize: unknown;
  maxFiles: unknown;
}

/** One entry of `accept`: an extension with its dot, a media type, or a whole family of media types. */
type Kind = { form: 'extension' | 'type' | 'family'; text: string };
const MEDIA_TYPE = /^[a-z0-9!#$&^_.+-]+\/(\*|[a-z0-9!#$&^_.+-]+)$/i;

/** FPK-9, FPK-27: the entries of `accept` that say a kind, and the ones that say none. */
export function readAccept(list: readonly string[]): { kinds: Kind[]; ignored: string[] } {
  const kinds: Kind[] = [];
  const ignored: string[] = [];
  for (const entry of list) {
    const text = entry.toLowerCase();
    if (text.startsWith('.') && text.length > 1 && !/[\s/]/.test(text)) kinds.push({ form: 'extension', text });
    else if (MEDIA_TYPE.test(text)) kinds.push(text.endsWith('/*') ? { form: 'family', text: text.slice(0, -1) } : { form: 'type', text });
    else ignored.push(entry);
  }
  return { kinds, ignored };
}
/** FPK-9: a media type or a family against the kind the browser reports. */
const matchesType = (kind: Kind, type: string) => (kind.form === 'type' ? type.toLowerCase() === kind.text : kind.form === 'family' ? type.toLowerCase().startsWith(kind.text) : false);
/** FPK-9: an extension against the end of the name, without regard to case; a media type against the reported kind. */
const matches = (kind: Kind, file: File) => (kind.form === 'extension' ? file.name.toLowerCase().endsWith(kind.text) : matchesType(kind, file.type));
/** FPK-27: a limit of size is a number above zero; anything else sets none. */
export const sizeLimit = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null);
/** FPK-27: a limit of count is a whole number of zero or more; anything else sets none. Zero is the room a full list has left. */
export const countLimit = (value: unknown): number | null => (typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null);

/**
 * FPK-9: the files of one arrival, judged in the order the browser gave them. More than one where one is asked: all
 * are refused with the reason count, and none is chosen for the person. Otherwise a folder or a kind `accept` does not
 * list is refused with the reason type, a file larger than `maxSize` with the reason size, and, while `multiple` is
 * set, each file beyond the first `maxFiles` that passed with the reason count.
 */
export function judgeFiles(files: readonly File[], limits: FileLimits, folders: ReadonlySet<File> = new Set()): FileJudgement {
  const accepted: File[] = [];
  const refused: FileRefused[] = [];
  if (!limits.multiple && files.length > 1) {
    for (const file of files) refused.push({ file, reason: 'count' });
    return { accepted, refused };
  }
  const { kinds } = readAccept(acceptList(limits.accept));
  const maxSize = sizeLimit(limits.maxSize);
  const maxFiles = limits.multiple ? countLimit(limits.maxFiles) : null;
  let room = maxFiles === null ? Number.POSITIVE_INFINITY : maxFiles;
  for (const file of files) {
    if (folders.has(file) || (kinds.length > 0 && !kinds.some((kind) => matches(kind, file)))) refused.push({ file, reason: 'type' });
    else if (maxSize !== null && file.size > maxSize) refused.push({ file, reason: 'size' });
    else if (room <= 0) refused.push({ file, reason: 'count' });
    else {
      accepted.push(file);
      room -= 1;
    }
  }
  return { accepted, refused };
}

/** FPK-31, DRZ-15: what a product hands over, as files: anything else in the list is left out. */
export const givenFiles = (files: Iterable<File> | null | undefined): File[] =>
  typeof File === 'undefined' ? [] : [...(files ?? [])].filter((file): file is File => file instanceof File);

/** FPK-13, DRZ-3: whether a drag holds files, as the browser tells before the drop. */
export const holdsFiles = (data: DataTransfer | null | undefined): boolean => [...(data?.types ?? [])].includes('Files');

/**
 * FPK-13, DRZ-5: what the browser tells before the drop — kinds and a count, never names or sizes. Refusing: it holds
 * no file, it holds more than one where one is asked, or every file is of a kind `accept` refuses — which can be known
 * only where `accept` lists media types alone: an extension is the end of a name, and a name is not told yet.
 */
export function dragAnswer(data: DataTransfer | null | undefined, limits: Pick<FileLimits, 'multiple' | 'accept'>): 'receiving' | 'refusing' {
  const held = [...(data?.items ?? [])].filter((item) => item.kind === 'file');
  if (!held.length) return holdsFiles(data) ? 'receiving' : 'refusing';
  if (!limits.multiple && held.length > 1) return 'refusing';
  const { kinds } = readAccept(acceptList(limits.accept));
  if (kinds.length && kinds.every((kind) => kind.form !== 'extension') && held.every((item) => !kinds.some((kind) => matchesType(kind, item.type)))) return 'refusing';
  return 'receiving';
}

/** FPK-14, DRZ-9: the files of a drop, in the order the browser gave them, and which of them are folders — told by an entry, a handle; nothing of it is read. */
export function droppedFiles(data: DataTransfer | null | undefined): { files: File[]; folders: Set<File> } {
  const files: File[] = [];
  const folders = new Set<File>();
  for (const item of [...(data?.items ?? [])].filter((entry) => entry.kind === 'file')) {
    const entry = typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null;
    const file = item.getAsFile();
    if (!file) continue;
    files.push(file);
    if (entry?.isDirectory) folders.add(file);
  }
  if (!files.length) files.push(...(data?.files ?? []));
  return { files, folders };
}
