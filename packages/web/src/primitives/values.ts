/**
 * The `values` attribute of a component whose selection is several values (a multiple-select list, LST-26; a
 * multiple-choice segmented button, SEG-12): a JSON array (`values='["bug","docs"]'`) or whitespace-separated values
 * (`values="bug docs"`). The property is the array; this is only how the attribute is read (`converter.fromAttribute`).
 */
export function parseValues(attribute: string | null): string[] {
  if (!attribute) return [];
  const text = attribute.trim();
  if (text.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // Not JSON after all: read it as words.
    }
  }
  return text.split(/\s+/).filter(Boolean);
}
