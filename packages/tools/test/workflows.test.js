// What the workflows promise each other: a push made with GITHUB_TOKEN (the record-baselines commit) creates
// pull_request runs that wait for approval and never run, so the workflow dispatches CI in the pull request's scope,
// and ci.yml has that scope as a dispatch input that reuses the pull request's selection.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (name) => fs.readFileSync(path.join(REPO, '.github/workflows', name), 'utf8');
const ci = YAML.parse(read('ci.yml'));
const record = YAML.parse(read('record-baselines.yml'));

test("ci.yml's dispatch has a scope input: the full run by default, or the pull request's", () => {
  const scope = ci.on.workflow_dispatch.inputs.scope;
  assert.equal(scope.type, 'choice');
  assert.deepEqual(scope.options, ['full', 'pull-request']);
  assert.equal(scope.default, 'full');
});

test('a pull-request-scope dispatch takes the pull request’s path: its base feeds the same filter and selection', () => {
  const steps = ci.jobs.changes.steps;
  const base = steps.find((s) => s.id === 'pr-base');
  assert.ok(base, 'the changes job has a pr-base step');
  assert.match(base.if, /inputs\.scope == 'pull-request'/);
  assert.match(base.run, /git merge-base "origin\/\$DEFAULT_BRANCH" HEAD/);
  const filter = steps.find((s) => s.id === 'filter');
  assert.match(filter.if, /steps\.pr-base\.outputs\.sha/);
  assert.match(filter.with.base, /steps\.pr-base\.outputs\.sha/);
  assert.match(steps.find((s) => s.id === 'select').env.BASE, /steps\.pr-base\.outputs\.sha/);
  const out = steps.find((s) => s.id === 'out');
  assert.match(out.env.ALL, /!steps\.pr-base\.outputs\.sha/, 'a pull-request-scope dispatch does not run every area');
  assert.match(out.env.PR_SCOPE, /github\.event_name == 'pull_request' \|\| steps\.pr-base\.outputs\.sha/);
  // Chromium alone is decided by PR_SCOPE, not by the event's name.
  assert.match(out.run, /if \[ "\$PR_SCOPE" = true \]; then\n\s+engines=\$\(echo "\$full" \| jq -c --argjson n "\$n" '\[\.\[0\]/);
  assert.doesNotMatch(out.run, /GITHUB_EVENT_NAME" = pull_request/);
  assert.equal(ci.jobs.changes.outputs['pr-scope'], '${{ steps.out.outputs.pr-scope }}');
});

test('the changeset check runs in a pull-request-scope dispatch, and CI result accepts its skip only outside one', () => {
  assert.match(ci.jobs.changeset.if, /github\.event_name == 'workflow_dispatch' && inputs\.scope == 'pull-request'/);
  assert.match(ci.jobs['ci-ok'].steps.at(-1).run, /\$event != "pull_request" and \$areas\."pr-scope" != "true"/);
});

test('record-baselines dispatches CI after its push: the pull request’s scope, or the full run with start_ci', () => {
  assert.equal(record.on.workflow_dispatch.inputs.start_ci.default, false);
  const commit = record.jobs.commit;
  assert.deepEqual(commit.permissions, { contents: 'write', actions: 'write' });
  const run = commit.steps.at(-1).run;
  const push = run.indexOf('git push origin "HEAD:$BRANCH"');
  assert.ok(push > 0);
  const dispatch = run.slice(push);
  assert.match(dispatch, /if \[ "\$START_CI" = true \]; then\n\s+gh workflow run ci\.yml --repo "\$GITHUB_REPOSITORY" --ref "\$BRANCH"\n/);
  assert.match(dispatch, /else\n\s+gh workflow run ci\.yml --repo "\$GITHUB_REPOSITORY" --ref "\$BRANCH" -f scope=pull-request\n/);
});

test('no workflow says a GITHUB_TOKEN push starts no pull_request run (it creates runs that wait for approval)', () => {
  for (const name of fs.readdirSync(path.join(REPO, '.github/workflows'))) {
    assert.doesNotMatch(read(name), /starts no (push or )?pull_request/, name);
  }
});
