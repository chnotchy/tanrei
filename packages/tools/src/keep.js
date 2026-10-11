// Files as they were. The drift check runs every generator to see what it
// would write; run as a check (`drift --check`) it must leave the tree as it found it, because the generated files
// it compares may be another agent's work in a shared checkout.
import fs from 'node:fs';
import path from 'node:path';

/**
 * Remember the bytes of `files` (paths relative to `root`; a file that is not there is remembered as absent).
 * @returns {{ restore(more?: string[]): string[] }} `restore` puts every remembered file back — and removes those of
 *   `more` (files listed only afterwards) that were not remembered — and returns the paths it had to touch, sorted.
 */
export function keepFiles(root, files) {
  const read = (rel) => (fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel)) : null);
  const before = new Map(files.map((rel) => [rel, read(rel)]));
  return {
    restore(more = []) {
      const touched = [];
      for (const rel of new Set([...before.keys(), ...more])) {
        const was = before.get(rel) ?? null;
        const now = read(rel);
        if (was === null ? now === null : now !== null && was.equals(now)) continue;
        const file = path.join(root, rel);
        if (was === null) fs.rmSync(file);
        else {
          fs.mkdirSync(path.dirname(file), { recursive: true });
          fs.writeFileSync(file, was);
        }
        touched.push(rel);
      }
      return touched.sort();
    },
  };
}
