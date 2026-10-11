#!/usr/bin/env node
// The command a person runs to write the lock file (REQUIREMENTS.md, LKD-24):
//
//   tanrei-links update  [--config <file>]   read the addresses that have no entry
//   tanrei-links refresh [--config <file>]   read every address again
//   tanrei-links check   [--config <file>]   read nothing; say what the lock file lacks (exit 1 if anything)
//
// The config is a module whose default export is `{ options, links, origins }`: the options every function of the
// module takes, the addresses to draw as link cards, and the origins whose icons external links show. `links` and
// `origins` may be lists or functions that return them (a site finds them in its own content).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PRODUCTION } from './fetcher.js';
import { refreshLinkDataWith } from './refresh.js';

const MODES = { update: 'update', refresh: 'refresh', check: 'frozen' };
const USAGE = `usage: tanrei-links <update|refresh|check> [--config <file>]

  update    read the addresses the lock file has no entry for
  refresh   read every address again
  check     read nothing; list what the lock file lacks (exit 1 if anything is missing)

  --config  a module whose default export is { options, links, origins } (default: links.config.mjs)
`;

/** Runs the command; resolves with the exit code. `io.internals` is the fetcher's seam, for this module's own tests. */
export async function main(argv, io = {}) {
  const out = io.stdout ?? ((text) => process.stdout.write(text));
  const err = io.stderr ?? ((text) => process.stderr.write(text));
  const args = [...argv];
  if (args.includes('--help') || args.includes('-h')) {
    out(USAGE);
    return 0;
  }
  const command = args.shift();
  let config = 'links.config.mjs';
  while (args.length) {
    const flag = args.shift();
    if (flag === '--config' && args.length) config = args.shift();
    else {
      err(`links: "${flag}" is not understood\n${USAGE}`);
      return 2;
    }
  }
  if (!Object.hasOwn(MODES, command ?? '')) {
    err(USAGE);
    return 2;
  }
  const file = path.resolve(io.cwd ?? process.cwd(), config);
  let given;
  try {
    given = (await import(pathToFileURL(file).href)).default;
  } catch (error) {
    err(`links: the config ${file} cannot be read (${error?.code ?? error?.message ?? 'unknown'})\n`);
    return 2;
  }
  if (given === null || typeof given !== 'object' || given.options === null || typeof given.options !== 'object') {
    err(`links: the config's default export is { options, links, origins }\n`);
    return 2;
  }
  const list = async (value) => (typeof value === 'function' ? await value() : (value ?? []));
  const lines = [];
  // The config's own report is kept; without one, each line is printed as it is said.
  const report = given.options.report ?? ((message) => err(`links: ${message}\n`));
  let summary;
  try {
    summary = await refreshLinkDataWith(
      { links: await list(given.links), origins: await list(given.origins), mode: MODES[command], options: { ...given.options, report: (message) => (lines.push(message), report(message)) } },
      io.internals ?? PRODUCTION,
    );
  } catch (error) {
    err(`${error instanceof TypeError ? error.message : `links: ${error?.message ?? 'failed'}`}\n`);
    return 2;
  }
  // The lock file as a person would name it: from where the command was run, or in full where it lies elsewhere.
  const real = (file) => {
    try {
      return fs.realpathSync(file);
    } catch {
      return file;
    }
  };
  const from = path.relative(real(io.cwd ?? process.cwd()), path.join(real(path.dirname(path.dirname(summary.lock))), path.basename(path.dirname(summary.lock)), path.basename(summary.lock)));
  const lock = from === '' || from.startsWith('..') ? summary.lock : from;
  if (command === 'check') {
    const missing = lines.filter((line) => line.endsWith(': not-in-lock'));
    out(`${summary.links.length} link(s) and ${summary.icons.length} site icon(s) are answered from ${lock}; ${missing.length} address(es) have no entry.\n`);
    return missing.length ? 1 : 0;
  }
  out(`${summary.links.length} link(s) with data, ${summary.failed.length} without (recorded with their reasons), ${summary.icons.length} site icon(s). ${summary.changed ? `${lock} changed: review the diff and commit it with the pictures.` : `${lock} is unchanged.`}\n`);
  return 0;
}

const invoked = () => {
  try {
    return process.argv[1] !== undefined && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
};
if (invoked()) process.exitCode = await main(process.argv.slice(2));
