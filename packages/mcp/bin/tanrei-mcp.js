#!/usr/bin/env node
// The published package carries a bundled server and its own copy of the vocabulary (dist/vocabulary): tokens/,
// tanrei.config.json and the mimicry-gaps registry. Inside the Tanrei monorepo the sources are used directly
// when there is no dist/, or when TANREI_MCP_FROM_SOURCE is set.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const vocabulary = path.join(here, '../dist/vocabulary');
const bundled = path.join(here, '../dist/server.js');
const packaged = fs.existsSync(bundled) && !process.env.TANREI_MCP_FROM_SOURCE;
if (packaged) process.env.TANREI_VOCABULARY_ROOT ??= vocabulary;
const { main } = await import(packaged ? bundled : '../src/server.js');
await main();
