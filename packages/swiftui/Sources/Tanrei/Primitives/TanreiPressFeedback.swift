import SwiftUI

// What every pressable control does with a press, on top of `TanreiPress.swift` (where it lands, how long it
// is held, the ripple shape): which state's tokens draw which layer under `sys.behavior.pressed-feedback`
// (`TanreiPressLayers`), the press lifecycle a control's chrome reads (`TanreiPressTracking`), and key
// activation through the same press (`tanreiKeyActivation`). No design value lives here.

/// BTN-9 — which state's tokens draw each layer of a pressable container. Pure, so a component's
/// `…Appearance` maps it onto its own token groups and the rule is tested once.
///
/// - `overlay`, and every state that is not a press: the state's tokens, all at once.
/// - `ripple`: the container of the state beneath; the pressed container paint grows over it as the ripple.
/// - `dim`: the container of the state beneath, no ripple; everything else (label, outline, elevation, shape and
///   the pressed opacity, on the whole control) is the pressed tokens'.
/// - `none`: no answer to the press at all — the control is drawn in the state beneath.
struct TanreiPressLayers: Equatable {
  /// The state whose tokens draw the label, outline, elevation, shape and opacity.
  let state: TanreiInteraction
  /// The state whose container paint fills the container.
  let container: TanreiInteraction
  /// The state whose container paint grows as the ripple; `nil` when there is none.
  let ripple: TanreiInteraction?

  /// - Parameters:
  ///   - state: the resolved state (`TanreiInteraction.resolve`).
  ///   - feedback: `sys.behavior.pressed-feedback`; it matters only while `state` is `.pressed`.
  ///   - beneath: the state the control would be in without the press (focused for a key press, hovered for a
  ///     pointer): what is drawn where the choice says the press draws nothing.
  init(state: TanreiInteraction, feedback: TanreiPressedFeedback, beneath: TanreiInteraction) {
    let drawn = state == .pressed && feedback == .none ? beneath : state
    self.state = drawn
    switch (drawn, feedback) {
    case (.pressed, .ripple):
      container = beneath
      ripple = .pressed
    case (.pressed, .dim):
      container = beneath
      ripple = nil
    default:
      container = drawn
      ripple = nil
    }
  }
}

/// The press of a control as its chrome draws it (BTN-8, BTN-9).
struct TanreiPressState: Equatable {
  /// Pressed now, or still held (`TanreiPressHold`): what `TanreiInteraction.resolve` takes as `isPressed`.
  let isPressed: Bool
  /// Where the current press touched the control, in its own coordinates; `nil` = its center.
  let contact: CGPoint?
  /// Counts presses: the identity of the ripple of the current press.
  let generation: Int
  /// False until a press begins: a render that never saw one (a snapshot of the pressed state) shows the
  /// ripple grown.
  let hasBegun: Bool
}

/// Owns the press lifecycle of one control and hands its `TanreiPressState` to the chrome that draws it:
/// the hold of BTN-8 (a press stays visible at least `sys.motion.duration.press-hold`, a key press too), and
/// the point of contact of BTN-9 (watched only when `watchesContact`, i.e. under `ripple`).
///
///     TanreiPressTracking(isPressed: configuration.isPressed, keyPresses: keyPresses, watchesContact: feedback == .ripple) { press in
///       label.modifier(TanreiContainerLayers(…, ripple: …(press) …))
///     }
struct TanreiPressTracking<Content: View>: View {
  /// The platform's own pressed state (`ButtonStyleConfiguration.isPressed`).
  let isPressed: Bool
  /// Activations by key so far; a change starts a press with no pointer behind it, from the center.
  var keyPresses = 0
  /// Whether to find the point of contact: only `ripple` pays for it.
  let watchesContact: Bool
  /// Where the point of contact is measured: the whole content (`.whole`), or only the part of it that applies
  /// `tanreiContactArea()` (`.part`) — a selection control's round container, so that a press on its label, outside
  /// the container, grows the ripple from the container's center (CHK-10, RAD-12, SWT-8).
  var contactArea: TanreiContactArea = .whole
  @ViewBuilder let content: (TanreiPressState) -> Content

  @Environment(\.tanreiSystem) private var system
  @State private var hold = TanreiPressHold()
  @State private var contact: CGPoint?

  var body: some View {
    content(TanreiPressState(isPressed: isPressed || hold.isHeld, contact: contact, generation: hold.generation, hasBegun: hold.hasBegun))
      .modifier(TanreiContactPoint(isEnabled: watchesContact && contactArea == .whole, contact: $contact))
      .environment(\.tanreiContactSink, watchesContact && contactArea == .part ? TanreiContactSink(contact: $contact) : nil)
      .onChange(of: isPressed) { _, isDown in
        if isDown {
          hold.begin(at: Date.timeIntervalSinceReferenceDate)
        } else {
          release(after: hold.remaining(at: Date.timeIntervalSinceReferenceDate, minimumMs: system.motion.duration.pressHold))
        }
      }
      .onChange(of: keyPresses) {
        // A key press has no "down" that lasts: it is a press that ends at once, from the center.
        contact = nil
        hold.begin(at: Date.timeIntervalSinceReferenceDate)
        release(after: hold.remaining(at: Date.timeIntervalSinceReferenceDate, minimumMs: system.motion.duration.pressHold))
      }
  }

  /// Ends the hold of the press that is current NOW, unless another press has begun by then.
  private func release(after seconds: TimeInterval) {
    let generation = hold.generation
    guard seconds > 0 else {
      hold.end(generation: generation)
      return
    }
    Task { @MainActor in
      try? await Task.sleep(for: .seconds(seconds))
      hold.end(generation: generation)
    }
  }
}

/// Where `TanreiPressTracking` measures the point of contact.
enum TanreiContactArea: Equatable, Sendable {
  /// The whole content: a button's container is the whole button.
  case whole
  /// Only the part that applies `tanreiContactArea()`; a press elsewhere has no point of contact (the center).
  case part
}

/// The point of contact of the enclosing `TanreiPressTracking`, handed to the part that measures it.
struct TanreiContactSink {
  let contact: Binding<CGPoint?>
}

private struct TanreiContactSinkKey: EnvironmentKey {
  static var defaultValue: TanreiContactSink? { nil }
}

extension EnvironmentValues {
  /// Set by a `TanreiPressTracking` whose `contactArea` is `.part` while it watches the point of contact.
  var tanreiContactSink: TanreiContactSink? {
    get { self[TanreiContactSinkKey.self] }
    set { self[TanreiContactSinkKey.self] = newValue }
  }
}

private struct TanreiContactAreaModifier: ViewModifier {
  @Environment(\.tanreiContactSink) private var sink

  func body(content: Content) -> some View {
    content.modifier(TanreiContactPoint(isEnabled: sink != nil, contact: sink?.contact ?? .constant(nil)))
  }
}

/// The keys that activate a control, per kind of control.
enum TanreiActivationKeys {
  /// A button: Enter and Space (BTN-1).
  static let button: Set<KeyEquivalent> = [.return, .space]
  /// A selection control (checkbox, radio button, switch): Space only. Enter activates one only where the platform
  /// activates any focused control with Enter (Android, tvOS); on iOS and macOS Enter is the default action's key,
  /// so it is left to the platform (CHK-1, CHK-9, RAD-1, RAD-11, SWT-1, SWT-7).
  static let selection: Set<KeyEquivalent> = [.space]
}

extension View {
  /// The part of a control whose own coordinates the point of contact is measured in (`TanreiContactArea.part`): a
  /// press outside it reports no point, and its ripple grows from the part's center.
  func tanreiContactArea() -> some View {
    modifier(TanreiContactAreaModifier())
  }

  /// BTN-1 for any pressable control: Enter and Space activate it exactly once per key press — the key-down
  /// only, so a held key does not repeat — and the caller shows the press like a pointer's (count it into
  /// `TanreiPressTracking.keyPresses`). Handling Space here too keeps one route for both keys; `.handled`
  /// stops SwiftUI's own Space activation from firing a second time. Ignored while disabled. A selection
  /// control passes `TanreiActivationKeys.selection` (Space only).
  func tanreiKeyActivation(
    isEnabled: Bool, keys: Set<KeyEquivalent> = TanreiActivationKeys.button, perform: @escaping @MainActor () -> Void
  ) -> some View {
    onKeyPress(keys: keys, phases: .down) { _ in
      guard isEnabled else { return .ignored }
      perform()
      return .handled
    }
  }
}
