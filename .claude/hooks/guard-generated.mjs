#!/usr/bin/env node
// PreToolUse hook (Edit | Write | NotebookEdit): generated files are outputs, not inputs.
// Exit code 2 blocks the tool call and shows the message to the agent.
import fs from 'node:fs';
import path from 'node:path';

const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const target = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
if (!target) process.exit(0);

const rel = path.relative(root, path.resolve(root, target)).split(path.sep).join('/');
if (rel.startsWith('..')) process.exit(0);

let manifest = [];
try {
  manifest = JSON.parse(fs.readFileSync(path.join(root, 'packages/tokens-build/generated-manifest.json'), 'utf8')).files;
} catch {}

const byPath =
  manifest.includes(rel) ||
  /(^|\/)[Gg]enerated\//.test(rel) ||
  rel.startsWith('docs/status/') ||
  rel.startsWith('design/tokens/') ||
  rel.endsWith('custom-elements.json') ||
  rel === 'packages/tokens-build/generated-manifest.json';

let byHeader = false;
try {
  byHeader = fs.readFileSync(path.resolve(root, target), 'utf8').slice(0, 400).includes('GENERATED FILE — DO NOT EDIT');
} catch {}

if (byPath || byHeader) {
  console.error(
    `Blocked: ${rel} is generated. Edit its source instead (tokens/, specs/, or the generator in packages/tokens-build, packages/tools, packages/react/scripts), then run \`pnpm generate\`.`,
  );
  process.exit(2);
}
