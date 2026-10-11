import Testing

// Known issues on GitHub's macOS runner, the one exception to "never quarantine". A test that fails on that runner and
// passes on the Mac its baselines and timings were recorded on wraps ONLY the expectation that fails there in
// `withKnownIssue("<root cause>: …", isIntermittent: true)`: intermittent, so a run where it holds passes too, and every
// other expectation of the test still fails as usual. The comment names the root cause, which stays open.

/// The failure `Snapshot.assert` records when the pixels differ from the baseline — and nothing else: a missing baseline,
/// a failed render or any other issue inside a marked comparison still fails the test.
func isSnapshotDiff(_ issue: Issue) -> Bool {
  issue.comments.contains { $0.rawValue.hasPrefix("Snapshot ") && $0.rawValue.contains(" differs from its baseline ") }
}
