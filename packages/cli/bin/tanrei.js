#!/usr/bin/env node
// The published package carries its own copy of the vocabulary (dist/vocabulary) and a bundled pipeline.
// Inside the Tanrei monorepo there is no dist/: the sources are used directly.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const vocabulary = path.join(here, '../dist/vocabulary');
const bundled = path.join(here, '../dist/cli.js');
const packaged = fs.existsSync(bundled) && !process.env.TANREI_CLI_FROM_SOURCE;
if (packaged) process.env.TANREI_VOCABULARY_ROOT ??= vocabulary;
const { main } = await import(packaged ? bundled : '../src/cli.js');
process.exitCode = await main(process.argv.slice(2));
