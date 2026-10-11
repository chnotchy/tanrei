// The formatting checks CI runs on native packages, so `pnpm check` fails locally where CI would.
// A toolchain that is not installed is skipped with a note: CI is still the authority for it. A paused platform
// (packages/tools/paused-platforms.json) is skipped too, as CI skips it.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * The `dart` that ships with the `flutter` on PATH. The formatter's output changes between Dart releases, so the check
 * must use the Dart of the Flutter SDK the package is built with — not a standalone `dart` that happens to come first
 * on PATH (a Homebrew Dart 3.0 reformats every file a Flutter 3.32 / Dart 3.8 SDK wrote). Falls back to `dart`.
 */
function flutterDart() {
  for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
    const flutter = path.join(dir, 'flutter');
    if (!fs.existsSync(flutter)) continue;
    const sibling = path.join(path.dirname(fs.realpathSync(flutter)), 'dart');
    return fs.existsSync(sibling) ? sibling : 'dart';
  }
  return 'dart';
}

const checks = [
  // Keep in step with .github/workflows/ci.yml (Flutter job).
  { name: 'dart format', platform: 'flutter', cwd: 'packages/flutter', command: flutterDart(), args: ['format', '--output=none', '--set-exit-if-changed', 'lib/tanrei.dart', 'lib/src/theme', 'lib/src/primitives', 'lib/src/components', 'test'] },
];

const { paused } = JSON.parse(fs.readFileSync(new URL('../packages/tools/paused-platforms.json', import.meta.url), 'utf8'));

let failed = false;
for (const { name, platform, cwd, command, args } of checks) {
  if (paused.includes(platform)) {
    console.log(`– ${name}: ${platform} is paused (packages/tools/paused-platforms.json); not checked`);
    continue;
  }
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.error?.code === 'ENOENT') console.log(`– ${name}: ${command} is not installed here; CI checks it`);
  else if (result.status === 0) console.log(`✔ ${name}`);
  else {
    failed = true;
    console.error(`✖ ${name} (${cwd}):\n${(result.stdout + result.stderr).trim().split('\n').filter((line) => line.startsWith('Changed')).join('\n') || result.stdout + result.stderr}`);
  }
}
process.exit(failed ? 1 : 0);
