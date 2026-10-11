import SwiftUI

// What the selection controls share (checkbox, radio button, switch): the label beside the control and
// the row they make, whether `.labelsHidden()` applies, the two motions a change is drawn with, and a shape filled
// inside its own outline. Press, hold, ripple, focus ring and target are the pressable primitives
// (`TanreiPressFeedback.swift`, `TanreiContainer.swift`); nothing here holds a design value.

/// A selection control and its visible label (CHK-15, RAD-17, SWT-15): `control`, then — unless `label` is `nil` —
/// the label at the control's inline end, `gap` away, in `style` and `color`, wrapping rather than truncating. An
/// `HStack`, so a right-to-left layout mirrors the order. The control (`controlHeight` tall in layout) and the label's
/// FIRST line are centered on one line — the taller of the two —; a wrapped label runs on below it, the control
/// staying beside its first line. The label grows with Dynamic Type (its line box is `tanreiTextStyle`'s); the control
/// does not.
struct TanreiLabelledControl<Control: View>: View {
  /// The label to draw, or `nil` (hidden, or empty).
  let label: Text?
  let gap: CGFloat
  let style: TanreiTextStyle
  let color: Color
  /// The state's opacity of the whole control (CHK-8, CHK-10 `dim` …), applied to the label here. The control applies
  /// it to itself, so that its focus ring stays outside it (never dimmed).
  let opacity: Double
  /// The height the control takes in layout: a checkbox's or radio button's container, a switch's track.
  let controlHeight: CGFloat
  @ViewBuilder let control: Control

  @Environment(\.tanreiTheme) private var theme
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize

  var body: some View {
    // The control's drawing (box, ring, track, handle, icon) is not an element: the button is (CHK-14, RAD-16, SWT-14).
    let control = self.control.accessibilityHidden(true)
    if let label {
      // One line of the label: the token line height as Dynamic Type scales it (the line box `tanreiTextStyle` draws).
      let firstLine = style.resolved(policy: theme.fontFamilyPolicy, dynamicTypeSize: dynamicTypeSize).lineHeight
      let line = max(controlHeight, firstLine)
      HStack(alignment: .top, spacing: gap) {
        control
          .frame(height: line)
        label
          .tanreiTextStyle(style)
          .foregroundStyle(color)
          .multilineTextAlignment(.leading)
          .fixedSize(horizontal: false, vertical: true)
          .padding(.top, (line - firstLine) / 2)
          .opacity(opacity)
          // The control's accessibility label is the name; the drawn text is not a second element.
          .accessibilityHidden(true)
      }
    } else {
      control
    }
  }
}

/// Reads whether labels are hidden (`.labelsHidden()`, the spec's `labelHidden`) and hands it to `content`.
///
/// SwiftUI exposes `.labelsHidden()` to a custom control only from iOS 18 / macOS 15 (`EnvironmentValues.labelsVisibility`);
/// a custom `ToggleStyle`'s `configuration.label` ignores it (measured). Before those versions the label is drawn.
struct TanreiLabelsVisibilityReader<Content: View>: View {
  @ViewBuilder let content: (_ labelsHidden: Bool) -> Content

  var body: some View {
    if #available(iOS 18, macOS 15, tvOS 18, watchOS 11, visionOS 2, *) {
      TanreiModernLabelsVisibilityReader(content: content)
    } else {
      content(false)
    }
  }
}

@available(iOS 18, macOS 15, tvOS 18, watchOS 11, visionOS 2, *)
private struct TanreiModernLabelsVisibilityReader<Content: View>: View {
  let content: (_ labelsHidden: Bool) -> Content
  @Environment(\.labelsVisibility) private var visibility

  var body: some View {
    content(visibility == .hidden)
  }
}

/// The name of a labelled control (CHK-16, RAD-18, SWT-16): `title` is always the accessibility label; the text is
/// drawn unless labels are hidden or it is empty. An empty title still renders and still works, and is reported in
/// debug builds as `component`'s missing name.
struct TanreiControlTitle {
  let text: Text
  let isEmpty: Bool

  init<S: StringProtocol>(_ title: S, component: String, behavior: String) {
    self.init(text: Text(title), isEmpty: title.isEmpty, component: component, behavior: behavior)
  }

  init(_ key: LocalizedStringKey, component: String, behavior: String) {
    self.init(text: Text(key), isEmpty: key == "", component: component, behavior: behavior)
  }

  private init(text: Text, isEmpty: Bool, component: String, behavior: String) {
    if isEmpty {
      TanreiDiagnostics.report("Tanrei: a \(component) has an empty label; it has no accessible name (\(behavior)). Pass the text that names it.")
    }
    self.text = text
    self.isEmpty = isEmpty
  }

  /// The text to draw: `nil` while labels are hidden or the title is empty.
  func drawn(labelsHidden: Bool) -> Text? {
    labelsHidden || isEmpty ? nil : text
  }
}

/// The two motions of a selection control (CHK-5, CHK-13, RAD-7, RAD-15, SWT-3, SWT-13): a change of interaction state
/// moves every part it recolors over the component's state motion, as the container does; only a change of condition
/// moves over the selection motion. Both are `nil` under Reduce Motion: the new look is shown at once.
struct TanreiSelectionMotion: Equatable {
  let state: Animation?
  let selection: Animation?

  init(stateDuration: Double, stateEasing: TanreiCubicBezier, selectionDuration: Double, selectionEasing: TanreiCubicBezier, reduceMotion: Bool) {
    state = TanreiMotion.animation(durationMs: stateDuration, easing: stateEasing, reduceMotion: reduceMotion)
    selection = TanreiMotion.animation(durationMs: selectionDuration, easing: selectionEasing, reduceMotion: reduceMotion)
  }
}

extension View {
  /// Animates a change of `condition` with the selection motion and a change of `state` with the state motion. The
  /// selection motion is applied nearer the content, so a transaction that changes both (a key press lands the
  /// activation in the press's own update) moves the new condition over the selection motion.
  func tanreiSelectionAnimation<Condition: Equatable>(_ motion: TanreiSelectionMotion, condition: Condition, state: TanreiInteraction) -> some View {
    animation(motion.selection, value: condition)
      .animation(motion.state, value: state)
  }
}

/// A shape filled inside its own outline (CHK-12, SWT-10): the outline lies inside the shape's edge, and the fill
/// inside the outline, never under it — so a translucent fill and outline never overlap.
struct TanreiInsetOutlinedShape: View {
  let cornerRadius: CGFloat
  let fill: Color
  let outline: Color
  let outlineWidth: CGFloat

  @Environment(\.tanreiSystem) private var system

  var body: some View {
    let style = system.shape.roundedCornerStyle
    ZStack {
      TanreiCornerShape(cornerRadius: max(.zero, cornerRadius - outlineWidth), style: style)
        .fill(fill)
        .padding(outlineWidth)
      TanreiCornerShape(cornerRadius: cornerRadius, style: style)
        .strokeBorder(outline, lineWidth: outlineWidth)
    }
  }
}

/// A rounded rectangle whose corners ease by `style` (`TanreiShape.roundedCornerStyle`, BTN-10) — except where the
/// corner reaches half the shorter side: then the shape is a pill (or a circle), which has no straight edge for a
/// smoothing to ease into, so it is the same at every amount (SWT-9: "A pill or a circle is unchanged by any amount").
/// SwiftUI's `.continuous` style would otherwise draw its own, different pill.
struct TanreiCornerShape: InsettableShape {
  var cornerRadius: CGFloat
  let style: RoundedCornerStyle
  var inset: CGFloat = .zero

  func path(in rect: CGRect) -> Path {
    let rect = rect.insetBy(dx: inset, dy: inset)
    let radius = max(.zero, cornerRadius - inset)
    if radius * 2 >= min(rect.width, rect.height) {
      return Capsule(style: .circular).path(in: rect)
    }
    return RoundedRectangle(cornerRadius: radius, style: style).path(in: rect)
  }

  func inset(by amount: CGFloat) -> TanreiCornerShape {
    var shape = self
    shape.inset += amount
    return shape
  }
}

/// An accessibility value that is there only sometimes (a checkbox's "mixed", a radio button's position in its group),
/// without replacing the value the traits give the rest of the time (a toggle's on / off): an empty value would. From
/// iOS 18 / macOS 15 it is switched on and off in place (`accessibilityValue(_:isEnabled:)`); before, the modifier is
/// added and removed, which gives the control a new identity when the value appears or goes.
struct TanreiOptionalAccessibilityValue: ViewModifier {
  let value: String?

  func body(content: Content) -> some View {
    if #available(iOS 18, macOS 15, tvOS 18, watchOS 11, visionOS 2, *) {
      content.accessibilityValue(Text(verbatim: value ?? ""), isEnabled: value != nil)
    } else if let value {
      content.accessibilityValue(Text(verbatim: value))
    } else {
      content
    }
  }
}
