# packages/tools — local rules

- `conventions.js` is the single definition of where each platform keeps implementation, tests and baselines. Change a platform's layout here and nowhere else.
- Checks must fail loudly with a message that says what to do next. They must never "fix" a source of truth.
- `status.js` output is committed (`docs/status/`) and consumed by the docs site; keep it deterministic.
- `src/test-tmp.js` is how every engine-side test makes a temporary directory (`tempDir(purpose)` + `leavesNothingBehind(after)`): tagged with the process, removed when the file ends, and the file fails if one stays. Node 22 has no `--test-global-setup`, so the check is per test file plus a static one (`directTempDirCalls`, asserted empty in each package's `test/temp-dirs.test.js`).
- `src/run-node-tests.js` is how every package runs its `node:test` files (`node <path>/run-node-tests.js [the arguments of node --test]`, never `node --test` itself in a script): Node 22.13 prints a suite whose `describe` body throws, or an `after` hook in a `describe` that throws, as `not ok` and still exits 0. The runner fails the run on any `not ok` that is not a TODO; `test/run-node-tests.test.js` holds every package to it.
