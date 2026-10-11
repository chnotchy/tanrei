import SwiftUI
#if os(macOS)
import AppKit
#endif

// Spec: specs/tooltip.spec.json — tokens: TanreiTooltipTokens (comp.tooltip), read from the design system in the
// environment (`system.tooltip`). Every design value in this file comes from a token; there are no literals.
//
// A tooltip is a READ overlay: it never takes focus, holds nothing focusable and makes nothing inert. SwiftUI
// has no non-modal anchored overlay — `.popover` is modal at compact widths and moves VoiceOver focus —, so the tooltip is
// drawn in a layer of Tanrei's own: the anchor publishes where it is (an anchor preference) and what it says, and the
// tooltip layer above the content draws it there. `.tanreiTheme(_:)` puts that layer over everything below it, a dialog
// puts one over its surface, and `.tanreiTooltipLayer()` adds one where neither reaches (the content of a product's own
// sheet or popover). When and whether it is open is a pure state machine (`TanreiTooltipMachine`), fed by hover, keyboard
// focus, touches and keys, whose timers are the tokens' delays.

/// The form of a tooltip (spec prop `variant`): a structural choice drawn by code, not a token axis — a design system
/// restyles both forms by value but cannot add one.
public enum TanreiTooltipVariant: String, CaseIterable, Sendable {
  /// One short phrase on the inverse surface: naming what an icon does.
  case plain
  /// An optional title and a few sentences on a raised surface: explaining a term or a setting.
  case rich

  /// The form a spec value names, for UI built from data. Any other name is `.plain`, the default, and is reported in
  /// debug builds.
  public init(named name: String) {
    if let variant = TanreiTooltipVariant(rawValue: name) {
      self = variant
    } else {
      TanreiDiagnostics.report("Tanrei: a tooltip has no variant \"\(name)\"; using \"plain\"")
      self = .plain
    }
  }
}

/// The side of the anchor a tooltip prefers (spec prop `placement`). It flips to the opposite side when the preferred one
/// has no room (TIP-9). `start` and `end` follow the layout direction.
public enum TanreiTooltipPlacement: String, CaseIterable, Sendable {
  case top
  case bottom
  case start
  case end

  /// The placement a spec value names, for UI built from data. Any other name is `.top`, the default, and is reported in
  /// debug builds.
  public init(named name: String) {
    if let placement = TanreiTooltipPlacement(rawValue: name) {
      self = placement
    } else {
      TanreiDiagnostics.report("Tanrei: a tooltip has no placement \"\(name)\"; using \"top\"")
      self = .top
    }
  }

  /// The physical side, `start` and `end` resolved by the layout direction.
  func side(in layoutDirection: LayoutDirection) -> TanreiTooltipSide {
    let rightToLeft = layoutDirection == .rightToLeft
    switch self {
    case .top: return .top
    case .bottom: return .bottom
    case .start: return rightToLeft ? .right : .left
    case .end: return rightToLeft ? .left : .right
    }
  }
}

/// A physical side of the anchor.
enum TanreiTooltipSide: Equatable, Sendable {
  case top
  case bottom
  case left
  case right

  var opposite: TanreiTooltipSide {
    switch self {
    case .top: return .bottom
    case .bottom: return .top
    case .left: return .right
    case .right: return .left
    }
  }

  var isVertical: Bool { self == .top || self == .bottom }
}

extension View {
  /// Describes this view — its anchor: the product's own icon button, truncated label or chart mark — with a tooltip that
  /// opens when a pointer rests on it for `motion.show-delay`, at once when it takes keyboard focus, and on a long press
  /// on iOS, where it stays `timeout.touch` after the finger lifts (TIP-1 … TIP-3).
  ///
  ///     TanreiIconButton("Delete", icon: "delete", action: delete)
  ///       .tanreiTooltip("Move to trash")
  ///     Text(fileName).lineLimit(1)
  ///       .tanreiTooltip("Storage", title: "Trash still counts toward storage.", variant: .rich)
  ///
  /// - Parameters:
  ///   - text: the description (required; an empty one never opens and is reported in debug builds, TIP-16).
  ///   - title: a rich tooltip's heading; a plain tooltip ignores it (reported in debug builds).
  ///   - describes: whether VoiceOver reads the text as the anchor's description (its accessibility hint), open or not.
  ///     Pass `false` when the text repeats the anchor's own name — an icon button whose tooltip shows its label — so it
  ///     is not read twice (TIP-14). The anchor's name and role never change.
  ///   - isPresented: the spec's `open`. The tooltip opens and closes itself and writes the binding when it does (the
  ///     spec's `toggle`); setting it from the product shows or hides the tooltip (a first-run hint) and then the tooltip
  ///     keeps following its rules (TIP-7).
  ///
  /// The tooltip never takes focus, holds nothing to press, dims nothing, and is drawn above the content of the layer it is
  /// in (`.tanreiTheme(_:)`, a Tanrei dialog, or `.tanreiTooltipLayer()`); at most one is open at a time (TIP-8, TIP-13).
  public func tanreiTooltip(
    _ text: String, title: String = "", variant: TanreiTooltipVariant = .plain, placement: TanreiTooltipPlacement = .top,
    describes: Bool = true, isPresented: Binding<Bool>? = nil
  ) -> some View {
    modifier(
      TanreiTooltipAnchor(
        content: TanreiTooltipContent(text: text, title: title, variant: variant, placement: placement, describes: describes), isPresented: isPresented))
  }

  /// The layer tooltips below this view are drawn in, above its content. `.tanreiTheme(_:)` and a Tanrei dialog already
  /// have one; add it to content SwiftUI presents apart (a `.sheet`, a `.popover`), whose tooltips cannot reach the layer
  /// of the view that presented it.
  public func tanreiTooltipLayer() -> some View {
    modifier(TanreiTooltipLayer())
  }
}

/// What a tooltip shows and how.
struct TanreiTooltipContent: Equatable {
  let text: String
  let title: String
  let variant: TanreiTooltipVariant
  let placement: TanreiTooltipPlacement
  let describes: Bool

  /// TIP-16: an empty text never opens and describes nothing.
  var isEmpty: Bool { text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }

  /// TIP-11: a rich tooltip draws its title; a plain one ignores it (TIP-10).
  var drawnTitle: String? { variant == .rich && !title.isEmpty ? title : nil }

  /// TIP-14: what VoiceOver reads as the anchor's description while `describes` is true — the text, after the title for
  /// a rich tooltip; `nil` when it adds nothing (describes is false, or the text is empty).
  var accessibilityDescription: String? {
    guard describes, !isEmpty else { return nil }
    return [drawnTitle, text].compactMap { $0 }.joined(separator: ". ")
  }

  /// TIP-16: an empty text, and a plain tooltip's ignored title.
  var problems: [String] {
    var problems: [String] = []
    if isEmpty { problems.append("a tooltip's text is empty, so it never opens and describes nothing (TIP-16)") }
    if variant == .plain && !title.isEmpty { problems.append("a plain tooltip ignores its title \"\(title)\" (TIP-16)") }
    return problems
  }
}

// MARK: - When it is open (pure)

/// TIP-1 … TIP-8 — whether a tooltip is open, as a pure state machine: what happened goes in, and out come the tooltip's
/// new state, the timers to start or stop, and whether it opened or closed BY ITSELF (the spec's `toggle`). No clock: the
/// view runs the timers and feeds their ends back.
struct TanreiTooltipMachine: Equatable {
  /// The delays and the timeout, each run by the view (`comp.tooltip.motion.show-delay`, `hide-delay`, `timeout.touch`).
  enum Timer: Hashable, Sendable {
    case show
    case hide
    case touch
  }

  enum Event: Equatable {
    /// A fine pointer entered the anchor; `othersOpen`: another tooltip is open (TIP-8: open without the delay).
    case pointerEnteredAnchor(othersOpen: Bool)
    case pointerLeftAnchor
    case pointerEnteredTooltip
    case pointerLeftTooltip
    /// The anchor took keyboard focus (TIP-2).
    case focusGained
    case focusLost
    /// A touch held on the anchor (TIP-3).
    case longPressed
    case touchLifted
    /// A touch began anywhere but on the anchor (TIP-3).
    case touchElsewhere
    case escape
    /// The anchor was activated: a click, a tap, Enter or Space (TIP-6).
    case activated
    /// Another tooltip opened (TIP-8).
    case otherOpened
    /// A press on the tooltip itself (TIP-13).
    case pressedTooltip
    /// The anchor was removed, hidden or scrolled out of the window (TIP-9).
    case anchorGone
    case elapsed(Timer)
    /// The product set `open` (TIP-7): no toggle.
    case set(Bool)
  }

  struct Effects: Equatable {
    /// The new value when the tooltip opened or closed by itself: the spec's `toggle` (TIP-7).
    var toggled: Bool?
    var start: Set<Timer> = []
    var stop: Set<Timer> = []
  }

  private(set) var isOpen: Bool
  private(set) var pointerOnAnchor = false
  private(set) var pointerOnTooltip = false
  private(set) var focused = false
  /// Opened by a long press: a touch elsewhere or the timeout after the lift closes it.
  private(set) var byTouch = false
  /// Closed by Escape or an activation: it stays closed until the pointer enters the anchor again or it is focused again
  /// (TIP-4, TIP-6).
  private(set) var suppressed = false
  /// TIP-16: an empty text never opens.
  let canOpen: Bool

  init(isOpen: Bool = false, canOpen: Bool = true) {
    self.isOpen = isOpen && canOpen
    self.canOpen = canOpen
  }

  /// Whether the tooltip keeps itself open: hovered or focused, it has no time limit (TIP-5).
  private var held: Bool { pointerOnAnchor || pointerOnTooltip || focused }

  mutating func handle(_ event: Event) -> Effects {
    var effects = Effects()
    switch event {
    case .pointerEnteredAnchor(let othersOpen):
      pointerOnAnchor = true
      suppressed = false
      effects.stop.insert(.hide)
      if !isOpen {
        if othersOpen { open(&effects) } else { effects.start.insert(.show) }
      }
    case .pointerLeftAnchor:
      pointerOnAnchor = false
      effects.stop.insert(.show)
      if isOpen && !held && !byTouch { effects.start.insert(.hide) }
    case .pointerEnteredTooltip:
      pointerOnTooltip = true
      effects.stop.insert(.hide)
    case .pointerLeftTooltip:
      pointerOnTooltip = false
      if isOpen && !held && !byTouch { effects.start.insert(.hide) }
    case .focusGained:
      focused = true
      suppressed = false
      if !isOpen { open(&effects) }
    case .focusLost:
      focused = false
      if isOpen && !pointerOnAnchor && !pointerOnTooltip && !byTouch { close(&effects) }
    case .longPressed:
      if !isOpen { open(&effects) }
      byTouch = isOpen
      effects.stop.insert(.touch)
    case .touchLifted:
      if isOpen && byTouch { effects.start.insert(.touch) }
    case .touchElsewhere:
      if isOpen && byTouch { close(&effects) }
    case .escape, .activated:
      if isOpen { close(&effects) }
      effects.stop.formUnion([.show, .hide])
      suppressed = true
    case .otherOpened, .pressedTooltip, .anchorGone:
      if isOpen { close(&effects) }
    case .elapsed(.show):
      if pointerOnAnchor && !suppressed && !isOpen { open(&effects) }
    case .elapsed(.hide):
      if isOpen && !held && !byTouch { close(&effects) }
    case .elapsed(.touch):
      if isOpen && byTouch { close(&effects) }
    case .set(let value):
      isOpen = value && canOpen
      if !isOpen { byTouch = false }
      effects.stop.formUnion([.show, .hide, .touch])
    }
    return effects
  }

  private mutating func open(_ effects: inout Effects) {
    guard canOpen else { return }
    isOpen = true
    effects.toggled = true
    effects.stop.formUnion([.show, .hide])
  }

  private mutating func close(_ effects: inout Effects) {
    isOpen = false
    byTouch = false
    effects.toggled = false
    effects.stop.formUnion([.show, .hide, .touch])
  }
}

/// TIP-8 — at most one tooltip is open: the one that opens closes the other at once, and while one is open the next opens
/// without the show delay. One per tooltip layer — `.tanreiTheme(_:)`'s covers a window —, handed to the anchors below it
/// through the environment; an anchor with no layer above it shares `fallback`.
@MainActor
final class TanreiTooltipCoordinator {
  /// The coordinator of anchors that no tooltip layer covers (they are not drawn either).
  static let fallback = TanreiTooltipCoordinator()

  private var open: (id: UUID, close: @MainActor () -> Void)?

  /// Whether a tooltip other than `id` is open.
  func isOtherOpen(than id: UUID) -> Bool {
    open.map { $0.id != id } ?? false
  }

  /// `id` opened: the one open before it closes.
  func opened(_ id: UUID, close: @escaping @MainActor () -> Void) {
    let previous = open
    open = (id, close)
    if let previous, previous.id != id { previous.close() }
  }

  func closed(_ id: UUID) {
    if open?.id == id { open = nil }
  }
}

private struct TanreiTooltipCoordinatorKey: EnvironmentKey {
  static var defaultValue: TanreiTooltipCoordinator { MainActor.assumeIsolated { TanreiTooltipCoordinator.fallback } }
}

extension EnvironmentValues {
  /// The coordinator of the tooltip layer above (TIP-8).
  var tanreiTooltipCoordinator: TanreiTooltipCoordinator {
    get { self[TanreiTooltipCoordinatorKey.self] }
    set { self[TanreiTooltipCoordinatorKey.self] = newValue }
  }
}

// MARK: - The anchor

/// The anchor's side: its hover, focus, touches and keys fed to the machine, the timers run, the binding written, the
/// description added, and what the layer draws published.
private struct TanreiTooltipAnchor: ViewModifier {
  let content: TanreiTooltipContent
  let isPresented: Binding<Bool>?

  @Environment(\.tanreiSystem) private var system
  @Environment(\.tanreiTooltipCoordinator) private var coordinator
  @State private var machine: TanreiTooltipMachine
  @State private var id = UUID()
  @State private var timers = TanreiTooltipTimers()
  @FocusState private var anchorFocused: Bool
  #if os(macOS)
  @State private var monitor = TanreiTooltipEventMonitor()
  @State private var frame: CGRect = .zero
  #endif

  init(content: TanreiTooltipContent, isPresented: Binding<Bool>?) {
    self.content = content
    self.isPresented = isPresented
    _machine = State(initialValue: TanreiTooltipMachine(isOpen: isPresented?.wrappedValue ?? false, canOpen: !content.isEmpty))
    content.problems.forEach { TanreiDiagnostics.report("Tanrei: \($0)") }
  }

  /// What is drawn: the product's value while it holds one — so a binding set before the first pass draws it open — else
  /// the machine's.
  private var isOpen: Bool { (isPresented?.wrappedValue ?? machine.isOpen) && !content.isEmpty }

  func body(content anchor: Content) -> some View {
    let entry = TanreiTooltipEntry(
      id: id, content: content, isOpen: isOpen,
      pointerEntered: { send(.pointerEnteredTooltip) }, pointerLeft: { send(.pointerLeftTooltip) }, pressed: { send(.pressedTooltip) },
      outOfView: { send(.anchorGone) })
    return anchor
      // TIP-14: the description, whether or not the tooltip is open; the name and role are left alone.
      .modifier(TanreiTooltipDescription(description: content.accessibilityDescription))
      // TIP-1: a fine pointer resting on the anchor (iPadOS and macOS pointers).
      .onHover { hovering in
        if hovering {
          send(.pointerEnteredAnchor(othersOpen: coordinator.isOtherOpen(than: id)))
        } else {
          send(.pointerLeftAnchor)
        }
      }
      // TIP-2: keyboard focus (SwiftUI moves focus to a control by keyboard only).
      .focused($anchorFocused)
      .onChange(of: anchorFocused) { _, focused in send(focused ? .focusGained : .focusLost) }
      // TIP-4: Escape closes it, consumed, without moving focus.
      .onKeyPress(.escape) {
        guard isOpen else { return .ignored }
        send(.escape)
        return .handled
      }
      .modifier(TanreiTooltipTouches(send: send))
      // TIP-7: the product sets it; no toggle.
      .onChange(of: isPresented?.wrappedValue) { _, value in
        guard let value, value != machine.isOpen else { return }
        apply(machine.handle(.set(value)))
      }
      .onChange(of: isOpen) { _, open in
        if open {
          coordinator.opened(id) { send(.otherOpened) }
        } else {
          coordinator.closed(id)
        }
        #if os(macOS)
        watchEvents(open)
        #endif
      }
      .onAppear {
        if isOpen { coordinator.opened(id) { send(.otherOpened) } }
      }
      // TIP-9: removed, it closes.
      .onDisappear {
        send(.anchorGone)
        coordinator.closed(id)
        #if os(macOS)
        monitor.stop()
        #endif
      }
      #if os(macOS)
      .background {
        GeometryReader { proxy in
          Color.clear
            .onAppear { frame = proxy.frame(in: .global) }
            .onChange(of: proxy.frame(in: .global)) { _, now in frame = now }
        }
      }
      #endif
      .anchorPreference(key: TanreiTooltipLayerKey.self, value: .bounds) { bounds in
        content.isEmpty ? [] : [TanreiTooltipPlaced(entry: entry, anchor: bounds)]
      }
  }

  /// Feeds one event to the machine and carries out what it says.
  private func send(_ event: TanreiTooltipMachine.Event) {
    apply(machine.handle(event))
  }

  private func apply(_ effects: TanreiTooltipMachine.Effects) {
    for timer in effects.stop { timers.cancel(timer) }
    let tokens = system.tooltip
    for timer in effects.start {
      let delay: Double
      switch timer {
      case .show: delay = tokens.motionShowDelay
      case .hide: delay = tokens.motionHideDelay
      case .touch: delay = tokens.timeoutTouch
      }
      timers.start(timer, afterMs: delay) { send(.elapsed(timer)) }
    }
    // TIP-7: opened or closed by itself — the spec's `toggle`, a write to the binding.
    if let toggled = effects.toggled, let isPresented, isPresented.wrappedValue != toggled {
      isPresented.wrappedValue = toggled
    }
  }

  #if os(macOS)
  /// While open on a Mac: Escape closes it wherever focus is, consumed (TIP-4); a click on the anchor, or Return or Space
  /// while it has focus, is its activation (TIP-6), which the anchor still receives.
  private func watchEvents(_ open: Bool) {
    guard open else {
      monitor.stop()
      return
    }
    monitor.start { event in
      switch event {
      case .key(let code) where code == TanreiTooltipEventMonitor.escapeKey:
        send(.escape)
        return true
      case .key(let code) where anchorFocused && TanreiTooltipEventMonitor.activationKeys.contains(code):
        send(.activated)
        return false
      case .press(let point):
        if frame.contains(point) { send(.activated) }
        return false
      default:
        return false
      }
    }
  }
  #endif
}

/// TIP-14: the text (after the title) as the anchor's accessibility hint; nothing when it adds nothing.
private struct TanreiTooltipDescription: ViewModifier {
  let description: String?

  func body(content: Content) -> some View {
    if let description { content.accessibilityHint(Text(verbatim: description)) } else { content }
  }
}

/// TIP-3, TIP-6 on iOS: a long press on the anchor opens the tooltip instead of activating it; the lift starts the touch
/// timeout; a touch that begins on the anchor is its activation (closing a tooltip already open) and one that begins
/// anywhere else closes a tooltip a long press opened. Watched by the window's passive touch observer, which cancels and
/// delays nothing.
private struct TanreiTooltipTouches: ViewModifier {
  let send: @MainActor (TanreiTooltipMachine.Event) -> Void

  func body(content: Content) -> some View {
    #if os(iOS)
    content
      .highPriorityGesture(LongPressGesture().onEnded { _ in send(.longPressed) })
      .background {
        TanreiTouchObserver(
          onTouch: { point in send(point == nil ? .touchElsewhere : .activated) },
          onTouchEnd: { send(.touchLifted) }
        )
        .accessibilityHidden(true)
      }
    #else
    content
    #endif
  }
}

/// The timers the machine asks for: one task each, cancelled by starting it again or by `cancel`.
@MainActor
final class TanreiTooltipTimers {
  private var tasks: [TanreiTooltipMachine.Timer: Task<Void, Never>] = [:]
  private static let millisecondsPerSecond: Double = 1000

  func start(_ timer: TanreiTooltipMachine.Timer, afterMs delay: Double, fire: @escaping @MainActor () -> Void) {
    tasks[timer]?.cancel()
    // A delay a person waits for: user-initiated, so a busy main actor does not push it back behind lower work (a task
    // created from a hover callback inherits a low priority, and under load its end came many seconds late).
    tasks[timer] = Task(priority: .userInitiated) { @MainActor in
      try? await Task.sleep(for: .seconds(delay / Self.millisecondsPerSecond))
      guard !Task.isCancelled else { return }
      fire()
    }
  }

  func cancel(_ timer: TanreiTooltipMachine.Timer) {
    tasks[timer]?.cancel()
    tasks[timer] = nil
  }

  deinit {
    for task in tasks.values { task.cancel() }
  }
}

#if os(macOS)
/// A local event monitor that exists only while a tooltip is open.
@MainActor
final class TanreiTooltipEventMonitor {
  /// The virtual key codes of Escape, Return, keypad Enter and Space — the keyboard's layout, not design values.
  static let escapeKey: UInt16 = 53
  static let activationKeys: Set<UInt16> = [36, 76, 49]

  /// What the monitor hands on: a key pressed, or a press of the pointer at a point of the window's content, from its
  /// top-left (SwiftUI's global coordinates).
  enum Event: Sendable {
    case key(UInt16)
    case press(CGPoint)
  }

  private var token: Any?

  /// `handle` returns whether it consumed the event.
  func start(_ handle: @escaping @MainActor (Event) -> Bool) {
    stop()
    token = NSEvent.addLocalMonitorForEvents(matching: [.keyDown, .leftMouseDown]) { event in
      let isKey = event.type == .keyDown
      let code = isKey ? event.keyCode : .zero
      let location = event.locationInWindow
      let number = event.windowNumber
      let consumed = MainActor.assumeIsolated { () -> Bool in
        if isKey { return handle(.key(code)) }
        guard let content = NSApp.window(withWindowNumber: number)?.contentView else { return false }
        let point = content.convert(location, from: nil)
        return handle(.press(CGPoint(x: point.x, y: content.isFlipped ? point.y : content.bounds.height - point.y)))
      }
      return consumed ? nil : event
    }
  }

  func stop() {
    if let token { NSEvent.removeMonitor(token) }
    token = nil
  }
}
#endif

// MARK: - The layer

/// One tooltip as the layer reads it: what it shows, whether it is open, and the routes back to its anchor.
struct TanreiTooltipEntry {
  let id: UUID
  let content: TanreiTooltipContent
  let isOpen: Bool
  let pointerEntered: @MainActor () -> Void
  let pointerLeft: @MainActor () -> Void
  let pressed: @MainActor () -> Void
  let outOfView: @MainActor () -> Void
}

/// An entry and where its anchor is.
struct TanreiTooltipPlaced {
  let entry: TanreiTooltipEntry
  let anchor: Anchor<CGRect>
}

struct TanreiTooltipLayerKey: PreferenceKey {
  static var defaultValue: [TanreiTooltipPlaced] { [] }
  static func reduce(value: inout [TanreiTooltipPlaced], nextValue: () -> [TanreiTooltipPlaced]) {
    value.append(contentsOf: nextValue())
  }
}

/// The layer: above its content, every tooltip below it, each placed against its anchor (TIP-9) and faded in and out
/// (TIP-15), and at most one of them open (its coordinator, TIP-8). A layer below another takes its tooltips: they do not
/// reach the outer one.
struct TanreiTooltipLayer: ViewModifier {
  @State private var coordinator = TanreiTooltipCoordinator()

  func body(content: Content) -> some View {
    content
      .environment(\.tanreiTooltipCoordinator, coordinator)
      .overlayPreferenceValue(TanreiTooltipLayerKey.self) { placed in
        if !placed.isEmpty {
          GeometryReader { proxy in
            ZStack(alignment: .topLeading) {
              ForEach(placed, id: \.entry.id) { item in
                TanreiTooltipPositioned(entry: item.entry, anchor: proxy[item.anchor], bounds: CGRect(origin: .zero, size: proxy.size))
              }
            }
          }
        }
      }
      .transformPreference(TanreiTooltipLayerKey.self) { $0 = [] }
  }
}

/// One tooltip in the layer: placed by `TanreiTooltipGeometry`, faded, hidden from VoiceOver while `describes` carries its
/// text, closing on a press that goes no further (TIP-13), and keeping itself open while the pointer is on it (TIP-1).
private struct TanreiTooltipPositioned: View {
  let entry: TanreiTooltipEntry
  let anchor: CGRect
  let bounds: CGRect

  @Environment(\.tanreiSystem) private var system
  @Environment(\.layoutDirection) private var layoutDirection

  var body: some View {
    let tokens = system.tooltip
    let content = entry.content
    // TIP-9: an anchor scrolled out of the layer closes its tooltip.
    let inView = bounds.intersects(anchor)
    let open = entry.isOpen && inView
    TanreiTooltipPlacementLayout(
      anchor: anchor, bounds: bounds.insetBy(dx: tokens.windowMargin, dy: tokens.windowMargin),
      side: content.placement.side(in: layoutDirection), offset: tokens.offset,
      maxWidth: content.variant == .rich ? tokens.richContainerMaxWidth : tokens.plainContainerMaxWidth
    ) {
      TanreiTooltipBubble(content: content)
        .contentShape(Rectangle())
        .onTapGesture { entry.pressed() }
        .onHover { $0 ? entry.pointerEntered() : entry.pointerLeft() }
        .opacity(open ? 1 : .zero)
        // TIP-15: a fade in and out, and nothing else — kept where motion is reduced, since nothing moves.
        .animation(tokens.fade(opening: open), value: open)
        .allowsHitTesting(open)
        .accessibilityHidden(!open || content.describes)
    }
    .frame(width: bounds.width, height: bounds.height)
    .background {
      if entry.isOpen && !inView { Color.clear.onAppear { entry.outOfView() } }
    }
  }
}

extension TanreiTooltipTokens {
  /// TIP-15: in over `motion.enter-*`, out over `motion.exit-*`. Reduced motion keeps the fade: nothing moves.
  func fade(opening: Bool) -> Animation? {
    opening
      ? TanreiMotion.animation(durationMs: motionEnterDuration, easing: motionEnterEasing, reduceMotion: false)
      : TanreiMotion.animation(durationMs: motionExitDuration, easing: motionExitEasing, reduceMotion: false)
  }
}

/// TIP-9 — where a tooltip goes, pure.
enum TanreiTooltipGeometry {
  /// The room beside the anchor on `side`, inside `bounds`, after `offset`.
  static func room(on side: TanreiTooltipSide, anchor: CGRect, bounds: CGRect, offset: CGFloat) -> CGFloat {
    switch side {
    case .top: return anchor.minY - offset - bounds.minY
    case .bottom: return bounds.maxY - anchor.maxY - offset
    case .left: return anchor.minX - offset - bounds.minX
    case .right: return bounds.maxX - anchor.maxX - offset
    }
  }

  /// The side it goes on: the preferred one when the tooltip fits there, else the opposite one when it fits there, else
  /// the one with more room.
  static func side(_ preferred: TanreiTooltipSide, size: CGSize, anchor: CGRect, bounds: CGRect, offset: CGFloat) -> TanreiTooltipSide {
    let need = preferred.isVertical ? size.height : size.width
    let here = room(on: preferred, anchor: anchor, bounds: bounds, offset: offset)
    if here >= need { return preferred }
    let there = room(on: preferred.opposite, anchor: anchor, bounds: bounds, offset: offset)
    if there >= need { return preferred.opposite }
    return there > here ? preferred.opposite : preferred
  }

  /// The tooltip's frame: `offset` from the anchor on the side chosen, centred on the anchor along it, shifted along the
  /// side to stay inside `bounds` (the window inset by the margin).
  static func frame(size: CGSize, anchor: CGRect, bounds: CGRect, preferred: TanreiTooltipSide, offset: CGFloat) -> (frame: CGRect, side: TanreiTooltipSide) {
    let side = side(preferred, size: size, anchor: anchor, bounds: bounds, offset: offset)
    func shifted(_ start: CGFloat, length: CGFloat, low: CGFloat, high: CGFloat) -> CGFloat {
      max(low, min(start, high - length))
    }
    let origin: CGPoint
    switch side {
    case .top, .bottom:
      let x = shifted(anchor.midX - size.width / 2, length: size.width, low: bounds.minX, high: bounds.maxX)
      origin = CGPoint(x: x, y: side == .top ? anchor.minY - offset - size.height : anchor.maxY + offset)
    case .left, .right:
      let y = shifted(anchor.midY - size.height / 2, length: size.height, low: bounds.minY, high: bounds.maxY)
      origin = CGPoint(x: side == .left ? anchor.minX - offset - size.width : anchor.maxX + offset, y: y)
    }
    return (CGRect(origin: origin, size: size), side)
  }
}

/// Places the one bubble inside the layer: measured at most `maxWidth` wide (and never wider than the bounds), then put
/// where `TanreiTooltipGeometry` says. Stateless, so it is right on the first layout pass. The coordinates are physical:
/// the side was already resolved from the layout direction.
private struct TanreiTooltipPlacementLayout: Layout {
  let anchor: CGRect
  let bounds: CGRect
  let side: TanreiTooltipSide
  let offset: CGFloat
  let maxWidth: CGFloat

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    proposal.replacingUnspecifiedDimensions()
  }

  func placeSubviews(in layoutBounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    guard let bubble = subviews.first else { return }
    let width = max(.zero, min(maxWidth, bounds.width))
    let size = bubble.sizeThatFits(ProposedViewSize(width: width, height: nil))
    let placed = TanreiTooltipGeometry.frame(size: size, anchor: anchor, bounds: bounds, preferred: side, offset: offset).frame
    bubble.place(
      at: CGPoint(x: layoutBounds.minX + placed.minX, y: layoutBounds.minY + placed.minY), anchor: .topLeading,
      proposal: ProposedViewSize(placed.size))
  }
}

// MARK: - The bubble

/// The tooltip's container and text (TIP-10, TIP-11, TIP-12): plain — one text on the inverse surface, at least
/// `plain.container.min-height` tall; rich — an optional title above the text. Corners eased by the corner smoothing,
/// text start-aligned, wrapping at the width it is given and growing with enlarged text.
struct TanreiTooltipBubble: View {
  let content: TanreiTooltipContent

  @Environment(\.tanreiSystem) private var system
  @TanreiPalette private var colors

  var body: some View {
    let tokens = system.tooltip
    let appearance = TanreiTooltipAppearance(tokens: tokens, variant: content.variant)
    VStack(alignment: .leading, spacing: appearance.gap) {
      if let title = content.drawnTitle {
        text(title, style: tokens.richTitleTypescale, color: tokens.richTitleColor)
      }
      text(content.text, style: appearance.textStyle, color: appearance.textColor)
    }
    .padding(.horizontal, appearance.paddingInline)
    .padding(.vertical, appearance.paddingBlock)
    .frame(minHeight: appearance.minHeight, alignment: .leading)
    .background {
      TanreiElevationSurface(appearance.elevation, fill: colors[appearance.container], cornerRadius: appearance.cornerRadius)
    }
  }

  private func text(_ string: String, style: TanreiTextStyle, color: TanreiPaint) -> some View {
    Text(verbatim: string)
      .multilineTextAlignment(.leading)
      .fixedSize(horizontal: false, vertical: true)
      .tanreiTextStyle(style)
      .foregroundStyle(colors[color])
  }
}

/// Which token values a tooltip draws for its form. Pure data, so the bindings are tested without rendering.
struct TanreiTooltipAppearance: Equatable {
  let container: TanreiPaint
  let elevation: [TanreiShadowLayer]
  let cornerRadius: CGFloat
  let paddingInline: CGFloat
  let paddingBlock: CGFloat
  /// TIP-10: plain only; a rich tooltip's padding decides its height.
  let minHeight: CGFloat?
  let maxWidth: CGFloat
  let gap: CGFloat
  let textStyle: TanreiTextStyle
  let textColor: TanreiPaint

  init(tokens: TanreiTooltipTokens, variant: TanreiTooltipVariant) {
    switch variant {
    case .plain:
      container = tokens.plainContainerColor
      elevation = tokens.plainContainerElevation
      cornerRadius = tokens.plainContainerShape
      paddingInline = tokens.plainContainerPaddingInline
      paddingBlock = tokens.plainContainerPaddingBlock
      minHeight = tokens.plainContainerMinHeight
      maxWidth = tokens.plainContainerMaxWidth
      gap = .zero
      textStyle = tokens.plainSupportingTextTypescale
      textColor = tokens.plainSupportingTextColor
    case .rich:
      container = tokens.richContainerColor
      elevation = tokens.richContainerElevation
      cornerRadius = tokens.richContainerShape
      paddingInline = tokens.richContainerPaddingInline
      paddingBlock = tokens.richContainerPaddingBlock
      minHeight = nil
      maxWidth = tokens.richContainerMaxWidth
      gap = tokens.richContainerGap
      textStyle = tokens.richSupportingTextTypescale
      textColor = tokens.richSupportingTextColor
    }
  }
}
