#!/usr/bin/env node
// Measure the web's shard durations again (packages/web/test/durations.json, read by playwright-shards.js) from the
// Playwright JSON reports of full runs: the seconds each test file ran in each project, the sum of every attempt of its
// tests (retries included: they cost the shard their time). CI writes it on every full web run, from the merged report
// (ci.yml, web-report: the artifact `web-durations`), so a refresh is:
//
//   rm packages/web/test/durations.json && gh run download <run> -n web-durations -D packages/web/test
//
// or, from reports of your own (`PLAYWRIGHT_JSON_OUTPUT_FILE=report.json playwright merge-reports --reporter json …`):
//
//   node packages/tools/src/playwright-durations.js packages/web/test/durations.json report.json [report.json…]
//
// A file measured in several reports takes the mean of them; a file a report ran only in part (a test that has no
// result: its shard was cancelled) is not measured by that report; a file no report measured keeps its seconds; the
// `$comment` is kept. A report of a run filtered by `--grep` ran files in part without saying so: do not give one.
// Seconds are rounded to whole ones.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { testsOf } from './playwright-shards.js';
import { refreshed } from './shard-weights.js';

/**
 * The seconds each file ran in each project, in each report that ran all of the file's tests in that project.
 * @param {any[]} reports Playwright JSON reports
 * @returns {Map<string, Map<string, number[]>>} by project, then by file
 */
export function measuredRuns(reports) {
  const found = new Map();
  for (const report of reports) {
    /** @type {Map<string, { ms: number, whole: boolean }>} */
    const runs = new Map();
    for (const t of testsOf(report)) {
      const key = `${t.project}\n${t.file}`;
      if (!runs.has(key)) runs.set(key, { ms: 0, whole: true });
      const run = runs.get(key);
      if (t.results.length === 0) run.whole = false;
      for (const r of t.results) run.ms += r.duration ?? 0;
    }
    for (const [key, { ms, whole }] of runs) {
      if (!whole) continue;
      const [project, file] = key.split('\n');
      if (!found.has(project)) found.set(project, new Map());
      const byFile = found.get(project);
      if (!byFile.has(file)) byFile.set(file, []);
      byFile.get(file).push(ms / 1000);
    }
  }
  return found;
}

/**
 * The durations with what the reports measured written over them: projects and files sorted, after the `$comment`.
 * @param {Record<string, any>} durations
 * @param {ReturnType<typeof measuredRuns>} found
 */
export function refreshedDurations(durations, found) {
  const { $comment, ...projects } = durations;
  for (const [project, byFile] of found) projects[project] = refreshed(projects[project] ?? {}, byFile, (file) => file);
  return { ...($comment === undefined ? {} : { $comment }), ...Object.fromEntries(Object.keys(projects).sort().map((p) => [p, projects[p]])) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [durationsFile, ...reportFiles] = process.argv.slice(2);
  if (!durationsFile || reportFiles.length === 0) {
    console.error('usage: playwright-durations.js <durations.json> <report.json> [<report.json>…]');
    process.exit(2);
  }
  const found = measuredRuns(reportFiles.map((file) => JSON.parse(fs.readFileSync(file, 'utf8'))));
  if (found.size === 0) {
    console.error(`✖ no file ran whole in ${reportFiles.join(', ')}: they are Playwright JSON reports of full runs`);
    process.exit(1);
  }
  const durations = fs.existsSync(durationsFile) ? JSON.parse(fs.readFileSync(durationsFile, 'utf8')) : {};
  fs.writeFileSync(durationsFile, `${JSON.stringify(refreshedDurations(durations, found), null, 2)}\n`);
  console.log(`${durationsFile}: ${[...found].map(([project, byFile]) => `${byFile.size} file${byFile.size === 1 ? '' : 's'} of ${project}`).join(', ')} measured again`);
}
