import SwiftUI
#if os(iOS)
import UIKit
#endif

// What every pressable control shares: where a press lands (`TanreiContactPoint`), how long
// it stays visible (`TanreiPressHold`, BTN-8) and the ripple that grows from it (`TanreiRipple`, BTN-9).
// No design value lives here: durations, easings and colors are handed in from the tokens.

/// Where a press lands, in the modified view's own coordinates (BTN-9 `ripple`). SwiftUI's `Button`
/// keeps deciding what a press and a tap are; this only watches.
///
/// - macOS: the pointer is always somewhere — its last hover location is the point of contact. (A
///   gesture is not an option there: a simultaneous drag inside a button's label takes the click away
///   from the button; `TanreiButtonTests` has the click test that caught it.)
/// - iOS: a touch has no location before it lands, and SwiftUI offers no way to learn it without a
///   gesture — and a simultaneous zero-distance drag inside a button's label swallows the tap AND stops
///   an enclosing list from scrolling (the Gallery UI tests caught both). So a passive UIKit recognizer
///   on the window watches where touches begin: it never recognizes, cancels and delays nothing.
struct TanreiContactPoint: ViewModifier {
  let isEnabled: Bool
  @Binding var contact: CGPoint?

  func body(content: Content) -> some View {
    #if os(macOS)
    content.onContinuousHover(coordinateSpace: .local) { phase in
      guard isEnabled else { return }
      switch phase {
      case .active(let location): contact = location
      case .ended: contact = nil
      }
    }
    #elseif os(iOS)
    content.background {
      if isEnabled { TanreiTouchObserver { contact = $0 } }
    }
    #else
    content
    #endif
  }
}

#if os(iOS)
/// Reports where each touch in the window begins, in this view's coordinates — `nil` for a touch that
/// begins outside it (so a press that lands in the extended hit area ripples from the center, and no
/// stale point survives) — and, when asked, that it ended. Invisible and never hit-tested. (The tooltip
/// watches touches with it too: a long press lifting, a touch elsewhere, TIP-3.)
struct TanreiTouchObserver: UIViewRepresentable {
  let onTouch: (CGPoint?) -> Void
  var onTouchEnd: (() -> Void)? = nil

  func makeUIView(context: Context) -> ObserverView { ObserverView() }

  func updateUIView(_ view: ObserverView, context: Context) {
    view.onTouch = onTouch
    view.onTouchEnd = onTouchEnd
  }

  final class ObserverView: UIView {
    var onTouch: ((CGPoint?) -> Void)?
    var onTouchEnd: (() -> Void)?
    private var watcher: Watcher?

    override init(frame: CGRect) {
      super.init(frame: frame)
      isUserInteractionEnabled = false
      backgroundColor = .clear
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("not used") }

    override func didMoveToWindow() {
      super.didMoveToWindow()
      if let watcher { watcher.view?.removeGestureRecognizer(watcher) }
      watcher = nil
      guard let window else { return }
      let watcher = Watcher(target: nil, action: nil)
      watcher.observer = self
      window.addGestureRecognizer(watcher)
      self.watcher = watcher
    }

    fileprivate func touchBegan(_ touch: UITouch) {
      let point = touch.location(in: self)
      onTouch?(bounds.contains(point) ? point : nil)
    }

    fileprivate func touchEnded() {
      onTouchEnd?()
    }
  }

  /// Watches and never takes part: it stays `.possible` while a touch is down and fails when it ends,
  /// cancels and delays nothing, and neither prevents nor is prevented by any other recognizer.
  final class Watcher: UIGestureRecognizer {
    weak var observer: ObserverView?

    override init(target: Any?, action: Selector?) {
      super.init(target: target, action: action)
      cancelsTouchesInView = false
      delaysTouchesBegan = false
      delaysTouchesEnded = false
    }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent) {
      if let touch = touches.first { observer?.touchBegan(touch) }
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent) {
      observer?.touchEnded()
      state = .failed
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent) {
      observer?.touchEnded()
      state = .failed
    }
    override func canPrevent(_ preventedGestureRecognizer: UIGestureRecognizer) -> Bool { false }
    override func canBePrevented(by preventingGestureRecognizer: UIGestureRecognizer) -> Bool { false }
  }
}
#endif

/// BTN-8 — how long a press stays visible. A tap or a key press ends within a frame; the pressed
/// state is held until `sys.motion.duration.press-hold` has passed since it began. Pure, so the rule
/// is tested without a clock.
struct TanreiPressHold: Equatable {
  /// True from the beginning of a press until `end` is called for that same press.
  private(set) var isHeld = false
  /// Counts presses, so that the delayed end of an earlier press cannot end a later one.
  private(set) var generation = 0
  private var beganAt: TimeInterval?

  private static let millisecondsPerSecond: Double = 1000

  /// False until the first press begins: a view that was created already pressed never saw one.
  var hasBegun: Bool { generation > 0 }

  mutating func begin(at now: TimeInterval) {
    isHeld = true
    generation += 1
    beganAt = now
  }

  /// Seconds the pressed state must still be shown when the press ends at `now`. Never negative.
  func remaining(at now: TimeInterval, minimumMs: Double) -> TimeInterval {
    guard let beganAt else { return 0 }
    return max(0, minimumMs / Self.millisecondsPerSecond - (now - beganAt))
  }

  mutating func end(generation ended: Int) {
    guard ended == generation else { return }
    isHeld = false
  }
}

/// BTN-9 `ripple` — a circle that grows from the point of contact until it covers its bounds.
struct TanreiRipple: View {
  let origin: CGPoint?
  let color: Color
  /// `nil` under Reduce Motion: the layer is simply there.
  let animation: Animation?
  let startsGrown: Bool
  @State private var hasGrown = false

  var body: some View {
    TanreiRippleShape(origin: origin, progress: startsGrown || hasGrown || animation == nil ? TanreiRippleShape.grown : .zero)
      .fill(color)
      // The point of contact is physical — measured from the left on both platforms, in any layout direction (the
      // pointer's hover location on macOS, UIKit's touch location on iOS) — while SwiftUI mirrors a shape in a
      // right-to-left layout. Drawn left to right, the ripple grows where the press landed (EFB-18, CHP-25).
      .environment(\.layoutDirection, .leftToRight)
      .onAppear { withAnimation(animation) { hasGrown = true } }
  }
}

struct TanreiRippleShape: Shape {
  /// In the shape's own coordinates; `nil` = the center.
  var origin: CGPoint?
  /// 0 = nothing, `grown` = the whole rectangle is covered.
  var progress: CGFloat

  static let grown: CGFloat = 1

  var animatableData: CGFloat {
    get { progress }
    set { progress = newValue }
  }

  /// The radius at which a circle around `origin` covers `rect`: the distance to the farthest corner.
  static func coveringRadius(of rect: CGRect, from origin: CGPoint) -> CGFloat {
    [CGPoint(x: rect.minX, y: rect.minY), CGPoint(x: rect.maxX, y: rect.minY), CGPoint(x: rect.minX, y: rect.maxY), CGPoint(x: rect.maxX, y: rect.maxY)]
      .map { hypot($0.x - origin.x, $0.y - origin.y) }
      .max() ?? .zero
  }

  func path(in rect: CGRect) -> Path {
    let center = origin ?? CGPoint(x: rect.midX, y: rect.midY)
    let radius = Self.coveringRadius(of: rect, from: center) * min(max(progress, .zero), Self.grown)
    return Path(ellipseIn: CGRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2))
  }
}
