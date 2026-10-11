// FIT-5: the kind of a file's format, from its media type and — where that is empty, says nothing or is on no list —
// from the end of its name. The lists are the sentence's own, closed: one file is one kind on every platform. Nothing
// of the file is read.

/** The ten kinds, in the order of matching. */
export type FileKind = 'pdf' | 'spreadsheet' | 'presentation' | 'archive' | 'code' | 'image' | 'video' | 'audio' | 'document' | 'other';

/** FIT-5: each kind's glyph, by its name in the system's icon set. */
export const KIND_GLYPH: Readonly<Record<FileKind, string>> = {
  pdf: 'picture_as_pdf',
  spreadsheet: 'table',
  presentation: 'slideshow',
  archive: 'folder_zip',
  code: 'code',
  image: 'image',
  video: 'movie',
  audio: 'music_note',
  document: 'description',
  other: 'draft',
};

interface Rule {
  kind: FileKind;
  /** Media types, whole. */
  types?: readonly string[];
  /** A family of media types: what each begins with. */
  family?: string;
  /** Endings of a name, after its last dot. */
  endings: readonly string[];
}

/** FIT-5, in its order: the specific kinds stand before the families, so that text/csv is a spreadsheet before text/ makes it a document. */
const RULES: readonly Rule[] = [
  { kind: 'pdf', types: ['application/pdf'], endings: ['pdf'] },
  {
    kind: 'spreadsheet',
    types: [
      'text/csv',
      'text/tab-separated-values',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.oasis.opendocument.spreadsheet',
      'application/vnd.apple.numbers',
      'application/x-iwork-numbers-sffnumbers',
    ],
    endings: ['xls', 'xlsx', 'ods', 'numbers', 'csv', 'tsv'],
  },
  {
    kind: 'presentation',
    types: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.oasis.opendocument.presentation',
      'application/vnd.apple.keynote',
      'application/x-iwork-keynote-sffkey',
    ],
    endings: ['ppt', 'pptx', 'odp', 'key'],
  },
  {
    kind: 'archive',
    types: [
      'application/zip',
      'application/x-zip-compressed',
      'application/x-tar',
      'application/gzip',
      'application/x-gzip',
      'application/x-bzip2',
      'application/x-xz',
      'application/x-7z-compressed',
      'application/vnd.rar',
      'application/x-rar-compressed',
    ],
    endings: ['zip', 'tar', 'gz', 'tgz', 'bz2', 'xz', '7z', 'rar'],
  },
  {
    kind: 'code',
    types: [
      'text/html',
      'text/css',
      'text/javascript',
      'application/javascript',
      'application/x-javascript',
      'text/typescript',
      'application/typescript',
      'text/jsx',
      'text/tsx',
      'application/json',
      'application/xml',
      'text/xml',
      'text/yaml',
      'text/x-yaml',
      'application/yaml',
      'application/x-yaml',
      'application/x-sh',
      'text/x-sh',
      'text/x-shellscript',
      'text/x-python',
      'text/x-script.python',
      'text/x-ruby',
      'application/x-ruby',
      'text/x-go',
      'text/x-rust',
      'text/x-java',
      'text/x-java-source',
      'text/x-kotlin',
      'text/x-swift',
      'text/x-c',
      'text/x-chdr',
      'text/x-csrc',
      'text/x-c++',
      'text/x-c++src',
      'text/x-csharp',
      'text/x-php',
      'application/x-php',
      'application/x-httpd-php',
      'application/sql',
      'text/x-sql',
    ],
    endings: ['html', 'css', 'js', 'mjs', 'ts', 'tsx', 'jsx', 'json', 'xml', 'yaml', 'yml', 'sh', 'py', 'rb', 'go', 'rs', 'java', 'kt', 'swift', 'c', 'h', 'cpp', 'cs', 'php', 'sql'],
  },
  { kind: 'image', family: 'image/', endings: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'bmp', 'tif', 'tiff', 'heic', 'heif', 'ico'] },
  { kind: 'video', family: 'video/', endings: ['mp4', 'mov', 'm4v', 'webm', 'mkv', 'avi'] },
  { kind: 'audio', family: 'audio/', endings: ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'oga', 'flac', 'opus'] },
  {
    kind: 'document',
    family: 'text/',
    types: [
      'application/rtf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.oasis.opendocument.text',
      'application/vnd.apple.pages',
      'application/x-iwork-pages-sffpages',
    ],
    endings: ['txt', 'md', 'rtf', 'doc', 'docx', 'odt', 'pages'],
  },
];

/** The media type as it is compared: without regard to case, without a parameter, without the white space around it. */
const readType = (mediaType: string) => mediaType.split(';')[0]!.trim().toLowerCase();

/** The end of a name after its last dot, without regard to case; empty for a name without a dot. */
const ending = (name: string) => {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot + 1).trim().toLowerCase();
};

/**
 * FIT-5: the kind of a file. The media type decides where it is on a list; where it is empty, is
 * application/octet-stream or is on no list, the ending of the name decides; and everything else is `other`.
 */
export function fileKind(mediaType: string, name: string): FileKind {
  const type = readType(mediaType ?? '');
  if (type && type !== 'application/octet-stream') {
    for (const rule of RULES) if (rule.types?.includes(type) || (rule.family && type.startsWith(rule.family))) return rule.kind;
  }
  const end = ending(name ?? '');
  if (end) for (const rule of RULES) if (rule.endings.includes(end)) return rule.kind;
  return 'other';
}

/**
 * FIT-9: where a tile's name is cut — the start, which gives way, and the ending, which stays: from the name's last
 * dot, where that dot is not its first character and is among its last eight. A name with no such ending is all start.
 */
export function nameParts(name: string): { start: string; ending: string } {
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || name.length - dot > 8) return { start: name, ending: '' };
  return { start: name.slice(0, dot), ending: name.slice(dot) };
}

// ── `accept` (FPK-9) ── the one way the attribute is read and written, for the file picker and for a component that forwards it.

/** `accept` as a list: the comma-separated form a native file input takes, or an array (as JSON too). */
export function acceptList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
  if (typeof value !== 'string') return [];
  const text = value.trim();
  if (text.startsWith('[')) {
    try {
      const list: unknown = JSON.parse(text);
      if (Array.isArray(list)) return acceptList(list);
    } catch {
      // Not JSON: a list with commas.
    }
  }
  return text.split(',').map((entry) => entry.trim()).filter(Boolean);
}
export const acceptConverter = {
  fromAttribute: (value: string | null): string[] => acceptList(value),
  toAttribute: (value: unknown): string | null => {
    const list = acceptList(value);
    return list.length ? list.join(',') : null;
  },
};
