# packages/tools — local rules

- `conventions.js` is the single definition of where each platform keeps implementation, tests and baselines. Change a platform's layout here and nowhere else.
- Checks must fail loudly with a message that says what to do next. They must never "fix" a source of truth.
- `status.js` output is committed (`docs/status/`) and consumed by the docs site; keep it deterministic.
- `src/test-tmp.js` is how every engine-side test makes a temporary directory (`tempDir(purpose)` + `leavesNothingBehind(after)`): tagged with the process, removed when the file ends, and the file fails if one stays. Node 22 has no `--test-global-setup`, so the check is per test file plus a static one (`directTempDirCalls`, asserted empty in each package's `test/temp-dirs.test.js`).
