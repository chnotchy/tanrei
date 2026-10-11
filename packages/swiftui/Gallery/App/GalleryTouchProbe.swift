import SwiftUI
import UIKit

// Gallery-only diagnostics (launch argument `-touchProbe YES`): what the WINDOW received of the last touch
// sequence, so a UI test can tell a drag the simulator never delivered from a drag the app received and did
// not scroll. XCUITest's `press(forDuration:thenDragTo:)`
// on a loaded CI runner sometimes took 2–16 s to play a 0.5 s drag and the list did not move; locally, holds
// from 0.05 to 10 s, velocities from 50 to 50 000 pt/s, and the app or the simulator's backboardd stopped for
// seconds mid-drag all still scrolled.
//
// Passive, like the ripple's own touch watcher: it never recognizes, cancels or delays anything, and neither
// prevents nor is prevented by another recognizer. It reports once, when the touch ends or is cancelled, so it
// changes nothing while the drag is under way.

/// One touch sequence as the window saw it.
struct GalleryTouchReport: Equatable {
  enum End: String { case ended, cancelled }

  /// Which touch sequence of this probe it is, from 1: a new report is told from the last one even when they read alike.
  var number = 0
  var moves = 0
  /// Horizontal distance from where the touch began to where it ended, in points (negative = toward the left).
  var dx: CGFloat = 0
  /// Vertical distance from where the touch began to where it ended, in points (negative = up).
  var dy: CGFloat = 0
  /// From the touch's beginning to its end, in milliseconds of the events' own timestamps.
  var milliseconds = 0
  var end: End = .ended

  /// What the UI test reads (`touch-probe`, `screen.touch-probe`): `#3 ended moves=12 dx=0 dy=-200 ms=520`.
  var label: String {
    "#\(number) \(end.rawValue) moves=\(moves) dx=\(Int(dx.rounded())) dy=\(Int(dy.rounded())) ms=\(milliseconds)"
  }
}

struct GalleryTouchProbe: UIViewRepresentable {
  let onReport: (GalleryTouchReport) -> Void

  func makeUIView(context: Context) -> ProbeView { ProbeView() }

  func updateUIView(_ view: ProbeView, context: Context) { view.onReport = onReport }

  final class ProbeView: UIView {
    var onReport: ((GalleryTouchReport) -> Void)?
    private var probe: Probe?

    override init(frame: CGRect) {
      super.init(frame: frame)
      isUserInteractionEnabled = false
      backgroundColor = .clear
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("not used") }

    override func didMoveToWindow() {
      super.didMoveToWindow()
      if let probe { probe.view?.removeGestureRecognizer(probe) }
      probe = nil
      guard let window else { return }
      let probe = Probe(target: nil, action: nil)
      probe.onReport = { [weak self] in self?.onReport?($0) }
      window.addGestureRecognizer(probe)
      self.probe = probe
    }
  }

  final class Probe: UIGestureRecognizer {
    var onReport: ((GalleryTouchReport) -> Void)?
    private var start: CGPoint?
    private var began: TimeInterval = 0
    private var sequences = 0
    private var report = GalleryTouchReport()

    override init(target: Any?, action: Selector?) {
      super.init(target: target, action: action)
      cancelsTouchesInView = false
      delaysTouchesBegan = false
      delaysTouchesEnded = false
    }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent) {
      guard start == nil, let touch = touches.first else { return }
      start = touch.location(in: nil)
      began = touch.timestamp
      sequences += 1
      report = GalleryTouchReport(number: sequences)
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent) {
      report.moves += 1
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent) { finish(touches, .ended) }
    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent) { finish(touches, .cancelled) }
    override func canPrevent(_ preventedGestureRecognizer: UIGestureRecognizer) -> Bool { false }
    override func canBePrevented(by preventingGestureRecognizer: UIGestureRecognizer) -> Bool { false }

    private func finish(_ touches: Set<UITouch>, _ end: GalleryTouchReport.End) {
      if let start, let touch = touches.first {
        let location = touch.location(in: nil)
        report.dx = location.x - start.x
        report.dy = location.y - start.y
        report.milliseconds = Int(((touch.timestamp - began) * 1000).rounded())
      }
      report.end = end
      start = nil
      onReport?(report)
      state = .failed
    }
  }
}
