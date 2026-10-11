import SwiftUI
#if os(iOS)
import UIKit
#endif

// Spec: specs/slider.spec.json — tokens: TanreiSliderTokens (comp.slider), read from the design system in the environment
// (`system.slider`). Every design value in this file comes from a token; there are no literals, and no state's look is
// computed here. The one number that is not a token is SLD-2's touch slop, which SwiftUI does not name (as NVD-20's, the
// navigation drawer's). The slider has one condition, `standard`, read through the generated `conditions[_:]` and
// `[state:]` lookups. Press, hold, ripple, focus ring and the minimum target are the shared primitives:
// SLD-13, SLD-14 and SLD-15 are BTN-8, BTN-9 and BTN-10 for the handle the press moves, whose center is the point of
// contact.
//
// Drawn by Tanrei, not by SwiftUI's `Slider`: its track and handle cannot take the tokens. Everything is drawn in a
// left-to-right space of its own (a right-to-left horizontal slider is mirrored by this file's geometry, a vertical one
// never is, SLD-21), so a press, the pieces of the track and the handles are measured in one set of coordinates.

/// Which way a slider runs (spec prop `orientation`). A closed set: the component defines it.
public enum TanreiSliderOrientation: String, CaseIterable, Sendable {
  /// From the inline start (min) to the inline end (max); mirrored in a right-to-left layout.
  case horizontal
  /// From the bottom (min) to the top (max), in every layout direction.
  case vertical

  /// The orientation a spec value names, for UI built from data. SLD-23: any other name is `.horizontal`, the default,
  /// and is reported in debug builds (`TanreiDiagnostics`).
  public init(named name: String) {
    if let orientation = TanreiSliderOrientation(rawValue: name) {
      self = orientation
    } else {
      TanreiDiagnostics.report("Tanrei: a slider has no orientation \"\(name)\"; using \"horizontal\" (SLD-23)")
      self = .horizontal
    }
  }
}

/// When a handle shows its value beside it (spec prop `valueIndicator`). A closed set: the component defines it.
public enum TanreiSliderValueIndicator: String, CaseIterable, Sendable {
  /// Never.
  case none
  /// While the handle is pressed or has keyboard focus.
  case active
  /// All the time.
  case always

  /// The value a spec value names, for UI built from data. SLD-23: any other name is `.none`, the default, and is
  /// reported in debug builds (`TanreiDiagnostics`).
  public init(named name: String) {
    if let indicator = TanreiSliderValueIndicator(rawValue: name) {
      self = indicator
    } else {
      TanreiDiagnostics.report("Tanrei: a slider has no valueIndicator \"\(name)\"; using \"none\" (SLD-23)")
      self = .none
    }
  }
}

/// Lets people choose a value, or a range of values, from a continuous or stepped scale by dragging a handle along a
/// track.
///
///     @State private var volume = 40.0
///     TanreiSlider("Volume", value: $volume)                                             // 0…100, continuous
///     TanreiSlider("Brightness", value: $level, step: 10, showsStops: true)              // discrete, a dot per step
///     TanreiSlider("Balance", value: $balance, in: -50...50, origin: 0)                   // a centered slider
///     TanreiSlider("Volume", value: $volume, valueIndicator: .active, valueText: "\(Int(volume)) %")
///     TanreiSlider("Maximum price", startLabel: "Minimum price", value: $price, in: 0...500, step: 10)  // a range
///
/// The initialisers follow `Slider`: `value` is the binding the person moves, `bounds` carries the spec's `min` and `max`
/// (0…100 by default), `step` 0 is continuous. A range is the initialiser whose `value` is a `Binding<ClosedRange<Double>>`
/// — its lower bound the start handle (the spec's `startValue`), its upper bound the end handle (`value`) — and which
/// also takes `startLabel`. Every change the person makes writes the binding: that is the spec's `input`. `onCommit`
/// (`change`) is called with the new value once a change is finished: when a press ends with another value than it began
/// with, after each key press or assistive-technology adjustment that changed it. A value the product sets writes nothing
/// and calls nothing; it moves the handle over the value motion.
///
/// `label` names the slider (a range's end handle), `startLabel` a range's start handle; neither is drawn — the product's
/// visible label is its own text beside the slider, in the same words. `valueText` / `startValueText` are the words
/// assistive technology reads and the value indicator shows in place of the number ("40 %"). `disabled` follows
/// SwiftUI's `.disabled(_:)`.
///
/// The slider is as long as its layout gives it (a vertical one as tall) and, across, as thick as the larger of its state
/// layer and its handle; its hit area reaches the minimum target across it (SLD-7).
public struct TanreiSlider: View {
  private let label: Text
  private let startLabel: Text
  private let value: TanreiSliderValueBinding
  private let bounds: ClosedRange<Double>
  private let step: Double
  private let origin: Double?
  private let size: TanreiSliderSize
  private let orientation: TanreiSliderOrientation
  private let showsStops: Bool
  private let valueIndicator: TanreiSliderValueIndicator
  private let valueText: String
  private let startValueText: String

  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.layoutDirection) private var layoutDirection
  @Environment(\.locale) private var locale
  @FocusState private var focus: TanreiSliderHandle?
  /// SLD-11: the handle a fine pointer over the slider would move.
  @State private var hovered: TanreiSliderHandle?
  /// The press being answered (SLD-2): the handle it moves, where it began, whether it has become a drag.
  @State private var gesture: TanreiSliderGesture?
  /// The handle the last press moved: the one whose pressed state press-hold keeps (SLD-13).
  @State private var pressedHandle: TanreiSliderHandle = .end
  /// True while a touch or a pointer is down; reset by SwiftUI when a scroll view takes the touch away.
  @GestureState private var isTouching = false
  /// iOS: the handle a touch that is down would move, from the moment it lands (SLD-13), before it is a tap or a drag.
  @State private var touchHandle: TanreiSliderHandle?

  /// - Parameters:
  ///   - label: names the slider for assistive technology (never drawn). Required: an empty label is reported.
  ///   - value: the value, moved by the person; the spec's `input` is every write.
  ///   - bounds: the spec's `min` and `max`.
  ///   - step: 0 is continuous; above 0 the values are the lower bound plus whole multiples of `step`.
  ///   - origin: where the active track starts; `nil` starts it at the lower bound (the spec's `origin`).
  ///   - size: `.small` (default), `.medium`, `.large`, or a size the design system adds.
  ///   - orientation: `.horizontal` (default) or `.vertical`.
  ///   - showsStops: a dot at every value a discrete slider can take (the spec's `stops`).
  ///   - valueIndicator: `.none` (default), `.active` or `.always`.
  ///   - valueText: the value as words, read and shown in place of the number; empty reads the number.
  ///   - onCommit: the spec's `change`, with the value, when the person finished changing it.
  public init<S: StringProtocol>(
    _ label: S,
    value: Binding<Double>,
    in bounds: ClosedRange<Double> = 0...100,
    step: Double = 0,
    origin: Double? = nil,
    size: TanreiSliderSize = .small,
    orientation: TanreiSliderOrientation = .horizontal,
    showsStops: Bool = false,
    valueIndicator: TanreiSliderValueIndicator = .none,
    valueText: String = "",
    onCommit: (@MainActor (Double) -> Void)? = nil
  ) {
    self.init(
      label: Text(label), labelIsEmpty: TanreiSliderRules.isBlank(label), startLabel: Text(verbatim: ""), startLabelIsEmpty: false,
      value: .single(value, onCommit: onCommit), bounds: bounds, step: step, origin: origin, size: size, orientation: orientation,
      showsStops: showsStops, valueIndicator: valueIndicator, valueText: valueText, startValueText: "")
  }

  /// A slider with a localized label.
  public init(
    _ labelKey: LocalizedStringKey,
    value: Binding<Double>,
    in bounds: ClosedRange<Double> = 0...100,
    step: Double = 0,
    origin: Double? = nil,
    size: TanreiSliderSize = .small,
    orientation: TanreiSliderOrientation = .horizontal,
    showsStops: Bool = false,
    valueIndicator: TanreiSliderValueIndicator = .none,
    valueText: String = "",
    onCommit: (@MainActor (Double) -> Void)? = nil
  ) {
    self.init(
      label: Text(labelKey), labelIsEmpty: labelKey == "", startLabel: Text(verbatim: ""), startLabelIsEmpty: false,
      value: .single(value, onCommit: onCommit), bounds: bounds, step: step, origin: origin, size: size, orientation: orientation,
      showsStops: showsStops, valueIndicator: valueIndicator, valueText: valueText, startValueText: "")
  }

  /// A range: two handles, from `value.lowerBound` (the start handle) to `value.upperBound` (the end handle), which may
  /// meet but never cross (SLD-5).
  ///
  /// - Parameters:
  ///   - label: names the end handle ("Maximum price"); `startLabel` the start handle ("Minimum price"). Both required.
  ///   - valueText / startValueText: the end and the start handle's value as words.
  ///   - onCommit: the spec's `change`, with the range, when the person finished changing it.
  public init<S: StringProtocol, T: StringProtocol>(
    _ label: S,
    startLabel: T,
    value: Binding<ClosedRange<Double>>,
    in bounds: ClosedRange<Double> = 0...100,
    step: Double = 0,
    size: TanreiSliderSize = .small,
    orientation: TanreiSliderOrientation = .horizontal,
    showsStops: Bool = false,
    valueIndicator: TanreiSliderValueIndicator = .none,
    valueText: String = "",
    startValueText: String = "",
    onCommit: (@MainActor (ClosedRange<Double>) -> Void)? = nil
  ) {
    self.init(
      label: Text(label), labelIsEmpty: TanreiSliderRules.isBlank(label), startLabel: Text(startLabel),
      startLabelIsEmpty: TanreiSliderRules.isBlank(startLabel), value: .range(value, onCommit: onCommit), bounds: bounds, step: step,
      origin: nil, size: size, orientation: orientation, showsStops: showsStops, valueIndicator: valueIndicator, valueText: valueText,
      startValueText: startValueText)
  }

  /// A range with localized labels.
  public init(
    _ labelKey: LocalizedStringKey,
    startLabel startLabelKey: LocalizedStringKey,
    value: Binding<ClosedRange<Double>>,
    in bounds: ClosedRange<Double> = 0...100,
    step: Double = 0,
    size: TanreiSliderSize = .small,
    orientation: TanreiSliderOrientation = .horizontal,
    showsStops: Bool = false,
    valueIndicator: TanreiSliderValueIndicator = .none,
    valueText: String = "",
    startValueText: String = "",
    onCommit: (@MainActor (ClosedRange<Double>) -> Void)? = nil
  ) {
    self.init(
      label: Text(labelKey), labelIsEmpty: labelKey == "", startLabel: Text(startLabelKey), startLabelIsEmpty: startLabelKey == "",
      value: .range(value, onCommit: onCommit), bounds: bounds, step: step, origin: nil, size: size, orientation: orientation,
      showsStops: showsStops, valueIndicator: valueIndicator, valueText: valueText, startValueText: startValueText)
  }

  private init(
    label: Text, labelIsEmpty: Bool, startLabel: Text, startLabelIsEmpty: Bool, value: TanreiSliderValueBinding,
    bounds: ClosedRange<Double>, step: Double, origin: Double?, size: TanreiSliderSize, orientation: TanreiSliderOrientation,
    showsStops: Bool, valueIndicator: TanreiSliderValueIndicator, valueText: String, startValueText: String
  ) {
    // SLD-19: still drawn and still working, but a handle without a name is reported in debug builds.
    if labelIsEmpty {
      TanreiDiagnostics.report("Tanrei: a slider's label is empty, so \(value.isRange ? "its end handle" : "it") has no accessible name (SLD-19); give it a label")
    }
    if value.isRange && startLabelIsEmpty {
      TanreiDiagnostics.report("Tanrei: a range slider's startLabel is empty, so its start handle has no accessible name (SLD-19); give it a startLabel")
    }
    let raw = value.raw
    TanreiSliderRules.reportValues(start: value.isRange ? raw.start : nil, end: raw.end, origin: origin, bounds: bounds, step: step)
    self.label = label
    self.startLabel = startLabel
    self.value = value
    self.bounds = bounds
    self.step = step
    self.origin = value.isRange ? nil : origin
    self.size = size
    self.orientation = orientation
    self.showsStops = showsStops
    self.valueIndicator = valueIndicator
    self.valueText = valueText
    self.startValueText = startValueText
  }

  public var body: some View {
    let model = self.model
    let isRightToLeft = layoutDirection == .rightToLeft
    return TanreiMinimumHitTarget {
      TanreiSliderFootprint(size: size, orientation: orientation)
    } control: {
      // SLD-13: the pressed state of the handle the press moves, held at least press-hold; SLD-14: its ripple grows from
      // the handle's center (no point of contact is watched: the handle moves to the press).
      TanreiPressTracking(isPressed: gesture?.isPressing ?? (touchHandle != nil), watchesContact: false) { press in
        TanreiSliderChrome(
          model: model, press: press, pressedHandle: pressedHandle, focusedHandle: focus, hoveredHandle: hovered,
          isDragging: gesture?.isDragging ?? false, isRightToLeft: isRightToLeft, focus: $focus,
          actions: actions(model: model, isRightToLeft: isRightToLeft))
      }
      // SLD-7: the whole slider is the hit area, reaching the minimum target across its axis.
      .tanreiHitTargetExpansion()
    }
    // One set of coordinates for the press, the tracks and the handles; the geometry mirrors a horizontal slider itself.
    .environment(\.layoutDirection, .leftToRight)
    // SLD-19: each handle is its own element; the drawing is not.
    .accessibilityElement(children: .contain)
    .onChange(of: isTouching) { _, touching in
      // A scroll view that takes the touch away cancels the press without ending it: finish it once SwiftUI has had
      // the chance to end it normally.
      guard !touching else { return }
      Task { @MainActor in
        if let gesture { finish(gesture) }
      }
    }
    .onChange(of: isEnabled) { _, enabled in
      if !enabled { hovered = nil }
    }
  }

  /// SLD-1, SLD-6, SLD-18, SLD-22: what is drawn and exposed.
  private var model: TanreiSliderModel {
    TanreiSliderModel(
      raw: value.raw, isRange: value.isRange, bounds: bounds, step: step, origin: origin, size: size, orientation: orientation,
      showsStops: showsStops, valueIndicator: valueIndicator, label: label, startLabel: startLabel, valueText: valueText,
      startValueText: startValueText, locale: locale)
  }

  private func actions(model: TanreiSliderModel, isRightToLeft: Bool) -> TanreiSliderActions {
    TanreiSliderActions(
      gesture: { drag in
        // A pointer's press begins at once; a touch's drag only past the slop, so that a scroll view keeps a touch that
        // travels across the track (a zero-distance drag, even simultaneous, keeps the scroll view from scrolling).
        DragGesture(minimumDistance: TanreiSliderInput.isTouch ? TanreiSliderInput.touchSlop : 0, coordinateSpace: .local)
          .updating($isTouching) { _, touching, _ in touching = true }
          .onChanged { change in pressChanged(start: change.startLocation, location: change.location, geometry: drag) }
          .onEnded { _ in pressEnded(geometry: drag) }
      },
      pan: { phase, geometry in
        switch phase {
        case .changed(let start, let location): pressChanged(start: start, location: location, geometry: geometry)
        case .ended: pressEnded(geometry: geometry)
        case .cancelled: if let gesture { finish(gesture) }
        }
      },
      tap: { location, geometry in tapped(at: location, geometry: geometry) },
      touch: { location, geometry in touched(location, geometry: geometry) },
      hover: { location, geometry in hover(location, geometry: geometry) },
      key: { handle, key in keyPressed(key, on: handle, isRightToLeft: isRightToLeft) },
      adjust: { handle, direction in adjust(handle, direction) })
  }

  // MARK: Changes by the person (SLD-2, SLD-3, SLD-4)

  /// The values as drawn now, and how to change them.
  private var editor: TanreiSliderEditor {
    TanreiSliderEditor(value: value, model: model, isEnabled: isEnabled)
  }

  /// SLD-2: the gesture's events, through the press's rules.
  private func pressChanged(start: CGPoint, location: CGPoint, geometry: TanreiSliderGeometry) {
    var press = gesture
    let began = TanreiSliderPressRules.changed(
      &press, start: start, location: location, geometry: geometry, isTouch: TanreiSliderInput.isTouch, editor: { editor })
    if let began {
      pressedHandle = began
      if !TanreiSliderInput.isTouch { hovered = began }
    }
    if press != gesture { gesture = press }
  }

  private func pressEnded(geometry: TanreiSliderGeometry) {
    var press = gesture
    TanreiSliderPressRules.ended(&press, geometry: geometry, editor: { editor })
    gesture = press
  }

  /// SLD-2: a touch that ended without moving (iOS): the handle moves where it was pressed, then one change.
  private func tapped(at location: CGPoint, geometry: TanreiSliderGeometry) {
    var press: TanreiSliderGesture?
    TanreiSliderPressRules.changed(&press, start: location, location: location, geometry: geometry, isTouch: true, editor: { editor })
    TanreiSliderPressRules.ended(&press, geometry: geometry, editor: { editor })
  }

  /// SLD-13 (iOS): a touch shows the pressed state of the handle it would move as it lands, and until it lifts — before
  /// SwiftUI knows whether it is a tap, a drag or the scroll view's. `nil` is the end of the touch.
  private func touched(_ location: CGPoint?, geometry: TanreiSliderGeometry) {
    let editor = self.editor
    guard let location, editor.isInteractive else {
      touchHandle = nil
      return
    }
    let target = editor.model.scale.value(atFraction: geometry.fraction(at: location))
    let handle = TanreiSliderRules.nearer(target, values: editor.model.values, isRange: editor.model.isRange)
    pressedHandle = handle
    touchHandle = handle
  }

  /// A press a scroll view took away: over, without the move a tap makes.
  private func finish(_ press: TanreiSliderGesture) {
    gesture = nil
    editor.finish(from: press.before)
  }

  /// SLD-11: a fine pointer over the slider hovers the handle a press there would move.
  private func hover(_ location: CGPoint?, geometry: TanreiSliderGeometry) {
    guard gesture == nil else { return }
    let editor = self.editor
    guard let location, editor.isInteractive else {
      hovered = nil
      return
    }
    let target = editor.model.scale.value(atFraction: geometry.fraction(at: location))
    hovered = TanreiSliderRules.nearer(target, values: editor.model.values, isRange: editor.model.isRange)
  }

  private func keyPressed(_ key: KeyEquivalent, on handle: TanreiSliderHandle, isRightToLeft: Bool) -> KeyPress.Result {
    editor.key(key, on: handle, mirrored: orientation == .horizontal && isRightToLeft) ? .handled : .ignored
  }

  private func adjust(_ handle: TanreiSliderHandle, _ direction: AccessibilityAdjustmentDirection) {
    editor.adjust(handle, direction)
  }
}

/// SLD-2 — what a press does, event by event: it begins where it lands (a pointer moves the nearer handle there at once),
/// follows once it is a drag, and ends with one change when the values moved. On touch it waits for the slop along the
/// track, a touch that first travels across it is left to an enclosing scroll view, and one that did not move moves the
/// handle where it was pressed when it ends. Pure over the press and the editor, so the rules are tested without events
/// (SwiftUI's gestures on macOS take no synthesized mouse events).
@MainActor
enum TanreiSliderPressRules {
  /// A change of the press at `location` (it began at `start`). Returns the handle when the press began now.
  @discardableResult
  static func changed(
    _ gesture: inout TanreiSliderGesture?, start: CGPoint, location: CGPoint, geometry: TanreiSliderGeometry, isTouch: Bool,
    editor: () -> TanreiSliderEditor
  ) -> TanreiSliderHandle? {
    var began: TanreiSliderHandle?
    var press: TanreiSliderGesture
    if let existing = gesture {
      press = existing
    } else {
      let editor = editor()
      guard editor.isInteractive else { return nil }
      let target = editor.model.scale.value(atFraction: geometry.fraction(at: start))
      let handle = TanreiSliderRules.nearer(target, values: editor.model.values, isRange: editor.model.isRange)
      press = TanreiSliderGesture(handle: handle, start: start, before: editor.model.values, isTouch: isTouch)
      gesture = press
      began = handle
      // A pointer moves the handle at once, over the value motion (SLD-16).
      if !isTouch { editor.move(handle, to: target) }
    }
    guard !press.isAbandoned else { return began }
    if !press.isDragging {
      let travel = geometry.travel(from: press.start, to: location)
      switch TanreiSliderRules.intent(along: travel.along, across: travel.across, isTouch: press.isTouch, slop: TanreiSliderInput.touchSlop) {
      case .wait:
        return began
      case .scroll:
        press.isAbandoned = true
        gesture = press
        return began
      case .drag:
        press.isDragging = true
        gesture = press
      }
    }
    let editor = editor()
    editor.move(press.handle, to: editor.model.scale.value(atFraction: geometry.fraction(at: location)))
    return began
  }

  /// The end of the press: a touch that did not move moves the handle where it was pressed; then one change, when the
  /// values moved.
  static func ended(_ gesture: inout TanreiSliderGesture?, geometry: TanreiSliderGeometry, editor: () -> TanreiSliderEditor) {
    guard let press = gesture else { return }
    gesture = nil
    if press.isTouch && !press.isDragging && !press.isAbandoned {
      let editor = editor()
      editor.move(press.handle, to: editor.model.scale.value(atFraction: geometry.fraction(at: press.start)))
    }
    editor().finish(from: press.before)
  }
}

/// How the person changes a slider's values (SLD-2, SLD-3, SLD-4): each change writes the binding (the spec's `input`),
/// and a finished change calls `onCommit` (`change`) after it. Nothing changes while disabled (SLD-20) or while max is not
/// greater than min (SLD-22).
@MainActor
struct TanreiSliderEditor {
  let value: TanreiSliderValueBinding
  let model: TanreiSliderModel
  let isEnabled: Bool

  var isInteractive: Bool { isEnabled && model.scale.isValid }

  /// Moves one handle to `target`, snapped within its bounds, and writes the binding when that changes it. The new
  /// values, or `nil` when nothing changed.
  @discardableResult
  func move(_ handle: TanreiSliderHandle, to target: Double) -> TanreiSliderValues? {
    guard isInteractive,
      let next = TanreiSliderRules.moved(handle, to: target, values: model.values, isRange: model.isRange, scale: model.scale)
    else { return nil }
    value.write(next)
    return next
  }

  /// SLD-2: at the end of a press, `change` once — when the values differ from `before`.
  func finish(from before: TanreiSliderValues) {
    if model.values != before { value.commit(model.values) }
  }

  /// SLD-3: one key press, one change — `input`, then `change` — and nothing for a key that changes nothing. Whether the
  /// key is the slider's (and so handled, changed or not).
  func key(_ key: KeyEquivalent, on handle: TanreiSliderHandle, mirrored: Bool) -> Bool {
    guard isInteractive else { return false }
    let bounds = TanreiSliderRules.bounds(of: handle, values: model.values, isRange: model.isRange, scale: model.scale)
    guard
      let target = TanreiSliderRules.keyTarget(
        key, current: model.values[handle], low: bounds.lowerBound, high: bounds.upperBound, keyStep: model.scale.keyStep, mirrored: mirrored)
    else { return false }
    if let next = move(handle, to: target) { value.commit(next) }
    return true
  }

  /// SLD-4: assistive technology's increment and decrement move one keyboard step — `input`, then `change`.
  func adjust(_ handle: TanreiSliderHandle, _ direction: AccessibilityAdjustmentDirection) {
    guard isInteractive,
      let target = TanreiSliderRules.adjustTarget(direction, current: model.values[handle], keyStep: model.scale.keyStep)
    else { return }
    if let next = move(handle, to: target) { value.commit(next) }
  }
}

// MARK: - Values

/// A handle: the only one, or a range's two. The only handle of a single slider is `end` (it carries `value`).
enum TanreiSliderHandle: Hashable, Sendable, CaseIterable {
  case start
  case end
}

/// The values of the handles as drawn: `start` is a range's start handle (the lower bound while range is false).
struct TanreiSliderValues: Equatable, Sendable {
  var start: Double
  var end: Double

  subscript(handle: TanreiSliderHandle) -> Double {
    get { handle == .start ? start : end }
    set {
      if handle == .start { start = newValue } else { end = newValue }
    }
  }
}

/// The binding a slider moves, and what it calls when a change is finished.
@MainActor
enum TanreiSliderValueBinding {
  case single(Binding<Double>, onCommit: (@MainActor (Double) -> Void)?)
  case range(Binding<ClosedRange<Double>>, onCommit: (@MainActor (ClosedRange<Double>) -> Void)?)

  var isRange: Bool {
    if case .range = self { return true }
    return false
  }

  /// The values as the product holds them; a single slider's `start` is `.nan` (it has none).
  var raw: (start: Double, end: Double) {
    switch self {
    case .single(let value, _): return (.nan, value.wrappedValue)
    case .range(let value, _): return (value.wrappedValue.lowerBound, value.wrappedValue.upperBound)
    }
  }

  /// The spec's `input`: the binding takes the new values.
  func write(_ values: TanreiSliderValues) {
    switch self {
    case .single(let value, _): value.wrappedValue = values.end
    case .range(let value, _): value.wrappedValue = min(values.start, values.end)...values.end
    }
  }

  /// The spec's `change`, always after the input it follows.
  func commit(_ values: TanreiSliderValues) {
    switch self {
    case .single(_, let onCommit): onCommit?(values.end)
    case .range(_, let onCommit): onCommit?(min(values.start, values.end)...values.end)
    }
  }
}

/// The slider's numbers (SLD-1, SLD-3, SLD-22): the range, the keyboard step, and the snap of a value.
struct TanreiSliderScale: Equatable, Sendable {
  let min: Double
  let max: Double
  /// 0 is continuous; a step below 0 is treated as 0 (SLD-22).
  let step: Double
  /// SLD-22: false while max is not greater than min — the handles sit at the track's start and it takes no input.
  let isValid: Bool
  /// SLD-3: `step`, or one hundredth of max − min while step is 0.
  let keyStep: Double
  /// SLD-18: as many fraction digits as the keyboard step has, at most two.
  let fractionDigits: Int

  /// The most fraction digits a formatted value shows (SLD-18).
  static let maximumFractionDigits = 2
  /// Keyboard steps in the continuous range (SLD-3: one hundredth).
  static let continuousSteps: Double = 100
  /// Keyboard steps in a Page Up or Page Down (SLD-3).
  static let pageSteps: Double = 10
  /// Below this a difference is floating-point noise (0.1 + 0.2), not a value.
  static let tolerance: Double = 1e-9

  init(bounds: ClosedRange<Double>, step: Double) {
    min = bounds.lowerBound
    max = bounds.upperBound
    isValid = min.isFinite && max.isFinite && max > min
    self.step = step.isFinite && step > 0 ? step : 0
    keyStep = self.step > 0 ? self.step : isValid ? (max - min) / Self.continuousSteps : 0
    fractionDigits = Swift.min(Self.maximumFractionDigits, Self.digits(of: keyStep))
  }

  /// Rounds away floating-point noise, so that a snapped value compares equal to its step.
  static func tidy(_ value: Double) -> Double {
    let scale = 1e10
    return (value * scale).rounded() / scale
  }

  /// The fraction digits of `value` as written (at most ten).
  static func digits(of value: Double) -> Int {
    let magnitude = abs(value)
    for digits in 0..<10 {
      let scaled = magnitude * pow(10, Double(digits))
      if abs(scaled - scaled.rounded()) < 1e-6 { return digits }
    }
    return 10
  }

  /// SLD-1: `value` clamped between `low` and `high` (min and max by default) and, while step is above 0, on min plus a
  /// whole multiple of step — the nearest that does not leave `low…high`.
  func snap(_ value: Double, low: Double? = nil, high: Double? = nil) -> Double {
    guard isValid else { return min.isFinite ? min : 0 }
    let low = low ?? min
    let high = high ?? max
    var next = Swift.min(high, Swift.max(low, value.isFinite ? value : low))
    if step > 0 {
      next = min + ((next - min) / step).rounded() * step
      if next > high + Self.tolerance { next -= step }
      if next < low - Self.tolerance { next += step }
      next = Swift.min(high, Swift.max(low, next))
    }
    return Self.tidy(next)
  }

  /// Where `value` lies between min (0) and max (1); 0 while the scale is not valid.
  func fraction(_ value: Double) -> Double {
    guard isValid else { return 0 }
    return Swift.min(1, Swift.max(0, (value - min) / (max - min)))
  }

  /// The value at `fraction` of the travel (not snapped).
  func value(atFraction fraction: Double) -> Double {
    min + fraction * (max - min)
  }

  /// SLD-9: every value a discrete slider can take, as fractions of the travel.
  var stops: [Double] {
    guard isValid, step > 0 else { return [] }
    var fractions: [Double] = []
    var at = min
    while at <= max + Self.tolerance {
      fractions.append(Self.tidy(fraction(at)))
      at = Self.tidy(at + step)
    }
    return fractions
  }
}

/// Everything a slider draws and exposes, from its props (SLD-1, SLD-6, SLD-9, SLD-18, SLD-22).
struct TanreiSliderModel: Equatable {
  let scale: TanreiSliderScale
  /// SLD-1, SLD-22: clamped, snapped, and a range's start never past its end.
  let values: TanreiSliderValues
  let isRange: Bool
  /// SLD-6: where the active track starts, as a fraction of the travel (min while origin is `nil`).
  let originFraction: Double
  let showsStops: Bool
  let size: TanreiSliderSize
  let orientation: TanreiSliderOrientation
  let valueIndicator: TanreiSliderValueIndicator
  let label: Text
  let startLabel: Text
  /// SLD-18: each handle's value text.
  let startWords: String
  let endWords: String

  init(
    raw: (start: Double, end: Double), isRange: Bool, bounds: ClosedRange<Double>, step: Double, origin: Double?,
    size: TanreiSliderSize, orientation: TanreiSliderOrientation, showsStops: Bool, valueIndicator: TanreiSliderValueIndicator,
    label: Text, startLabel: Text, valueText: String, startValueText: String, locale: Locale
  ) {
    let scale = TanreiSliderScale(bounds: bounds, step: step)
    self.scale = scale
    values = TanreiSliderRules.values(raw: raw, isRange: isRange, scale: scale)
    self.isRange = isRange
    originFraction = isRange ? 0 : origin.map { scale.fraction(scale.snap($0)) } ?? 0
    self.showsStops = showsStops
    self.size = size
    self.orientation = orientation
    self.valueIndicator = valueIndicator
    self.label = label
    self.startLabel = startLabel
    startWords = TanreiSliderRules.words(startValueText, value: values.start, digits: scale.fractionDigits, locale: locale)
    endWords = TanreiSliderRules.words(valueText, value: values.end, digits: scale.fractionDigits, locale: locale)
  }

  /// The handles drawn: a range's two, start first, or the only one.
  var handles: [TanreiSliderHandle] { isRange ? [.start, .end] : [.end] }

  func words(_ handle: TanreiSliderHandle) -> String { handle == .start ? startWords : endWords }
  func label(_ handle: TanreiSliderHandle) -> Text { handle == .start ? startLabel : label }

  /// SLD-9: the dots the track holds (the two ends of the travel, and every step with stops) and the active track holds
  /// (every step with stops), as fractions of the travel.
  var dots: (track: [Double], active: [Double]) {
    guard scale.isValid else { return ([], []) }
    let every = showsStops ? scale.stops : []
    var track: [Double] = [0, 1]
    for stop in every where !track.contains(stop) { track.append(stop) }
    return (track, every)
  }
}

/// The rules of the slider, pure so that each is tested without rendering.
enum TanreiSliderRules {
  /// SLD-3: the keys a focused handle answers.
  static let keys: Set<KeyEquivalent> = [.leftArrow, .rightArrow, .upArrow, .downArrow, .pageUp, .pageDown, .home, .end]

  static func isBlank<S: StringProtocol>(_ text: S) -> Bool {
    text.allSatisfy(\.isWhitespace)
  }

  /// SLD-1, SLD-22: the values drawn — `value` clamped and snapped; a range's start clamped, snapped and never past the
  /// end (both at `value` when it is greater); the handles at the track's start while the scale is not valid.
  static func values(raw: (start: Double, end: Double), isRange: Bool, scale: TanreiSliderScale) -> TanreiSliderValues {
    let end = scale.snap(raw.end)
    let start = isRange ? min(scale.snap(raw.start), end) : scale.snap(scale.min)
    return TanreiSliderValues(start: start, end: end)
  }

  /// SLD-5: each handle of a range stops at the other's value; the only handle ranges over the whole scale.
  static func bounds(of handle: TanreiSliderHandle, values: TanreiSliderValues, isRange: Bool, scale: TanreiSliderScale) -> ClosedRange<Double> {
    guard isRange, scale.isValid else { return scale.min...Swift.max(scale.min, scale.max) }
    return handle == .start ? scale.min...values.end : values.start...scale.max
  }

  /// SLD-2: the handle a press at `target` moves — the nearer one; where the two meet, the one that can move toward it.
  static func nearer(_ target: Double, values: TanreiSliderValues, isRange: Bool) -> TanreiSliderHandle {
    guard isRange else { return .end }
    if values.start == values.end { return target < values.start ? .start : .end }
    return abs(target - values.start) < abs(target - values.end) ? .start : .end
  }

  /// SLD-1, SLD-5: `handle` moved to `target`, snapped within its bounds; `nil` when that changes nothing.
  static func moved(
    _ handle: TanreiSliderHandle, to target: Double, values: TanreiSliderValues, isRange: Bool, scale: TanreiSliderScale
  ) -> TanreiSliderValues? {
    guard scale.isValid else { return nil }
    let bounds = self.bounds(of: handle, values: values, isRange: isRange, scale: scale)
    let next = scale.snap(target, low: bounds.lowerBound, high: bounds.upperBound)
    guard next != values[handle] else { return nil }
    var moved = values
    moved[handle] = next
    return moved
  }

  /// SLD-3, SLD-21: where a key moves a handle — one keyboard step with an arrow (Right and Left swapped in a
  /// right-to-left horizontal slider; Up always increases), ten with Page Up / Page Down, the handle's lowest and highest
  /// value with Home / End. `nil` for any other key.
  static func keyTarget(
    _ key: KeyEquivalent, current: Double, low: Double, high: Double, keyStep: Double, mirrored: Bool
  ) -> Double? {
    let forward: KeyEquivalent = mirrored ? .leftArrow : .rightArrow
    let backward: KeyEquivalent = mirrored ? .rightArrow : .leftArrow
    switch key {
    case forward, .upArrow: return current + keyStep
    case backward, .downArrow: return current - keyStep
    case .pageUp: return current + TanreiSliderScale.pageSteps * keyStep
    case .pageDown: return current - TanreiSliderScale.pageSteps * keyStep
    case .home: return low
    case .end: return high
    default: return nil
    }
  }

  /// SLD-4: assistive technology's increment and decrement move one keyboard step.
  static func adjustTarget(_ direction: AccessibilityAdjustmentDirection, current: Double, keyStep: Double) -> Double? {
    switch direction {
    case .increment: return current + keyStep
    case .decrement: return current - keyStep
    @unknown default: return nil
    }
  }

  /// SLD-2: what a press has become. A pointer drags as soon as it moves. A touch waits until it has travelled the slop:
  /// along the track it drags; across it first, it is left to an enclosing scroll view.
  enum Intent: Equatable {
    case wait
    case drag
    case scroll
  }

  static func intent(along: CGFloat, across: CGFloat, isTouch: Bool, slop: CGFloat) -> Intent {
    guard isTouch else { return along == .zero && across == .zero ? .wait : .drag }
    if abs(across) >= slop && abs(across) > abs(along) { return .scroll }
    if abs(along) >= slop { return .drag }
    return .wait
  }

  /// SLD-18: the product's words, or the value formatted in `locale` with `digits` fraction digits.
  static func words(_ text: String, value: Double, digits: Int, locale: Locale) -> String {
    let given = text.trimmingCharacters(in: .whitespacesAndNewlines)
    if !given.isEmpty { return given }
    return value.formatted(.number.precision(.fractionLength(digits)).locale(locale))
  }

  /// SLD-22: in debug builds, what is drawn in place of a value outside the scale or off a step, of a range's start past
  /// its end, of a max that is not greater than min, and of a negative step.
  static func reportValues(start: Double?, end: Double, origin: Double?, bounds: ClosedRange<Double>, step: Double) {
    if step < 0 { TanreiDiagnostics.report("Tanrei: a slider's step \(step) is below 0; it is treated as 0 (SLD-22)") }
    let scale = TanreiSliderScale(bounds: bounds, step: step)
    guard scale.isValid else {
      TanreiDiagnostics.report(
        "Tanrei: a slider's max \(bounds.upperBound) is not greater than its min \(bounds.lowerBound); the handles are drawn at the track's start and it takes no input (SLD-22)")
      return
    }
    func check(_ name: String, _ value: Double) {
      let drawn = scale.snap(value)
      if TanreiSliderScale.tidy(value) != drawn {
        TanreiDiagnostics.report(
          "Tanrei: a slider's \(name) \(value) is outside \(bounds.lowerBound)…\(bounds.upperBound) or off a step; it is drawn and exposed as \(drawn) (SLD-22)")
      }
    }
    check("value", end)
    if let start {
      check("startValue", start)
      if scale.snap(start) > scale.snap(end) {
        TanreiDiagnostics.report("Tanrei: a slider's startValue \(start) is greater than its value \(end); both handles are drawn at \(scale.snap(end)) (SLD-22)")
      }
    } else if let origin {
      check("origin", origin)
    }
  }
}

/// How the press reaches the slider on this platform (SLD-2). SwiftUI does not tell a touch from a pointer: iOS presses
/// are touches (an iPad pointer too), macOS presses are a pointer's.
enum TanreiSliderInput {
  #if os(macOS)
  static let isTouch = false
  #else
  static let isTouch = true
  #endif
  /// SLD-2's touch slop for a platform that names none (SwiftUI does not): Android's default, as the navigation drawer's
  /// NVD-20 and the other platforms' sliders use. A behaviour of the platform, not a design value.
  static let touchSlop: CGFloat = 8
}

/// The press being answered.
struct TanreiSliderGesture: Equatable {
  let handle: TanreiSliderHandle
  let start: CGPoint
  /// The values when it began: a change is emitted at its end only if they moved.
  let before: TanreiSliderValues
  let isTouch: Bool
  var isDragging = false
  /// A touch that travelled across the track first: the scroll view's (SLD-2).
  var isAbandoned = false

  var isPressing: Bool { !isAbandoned }
}

// MARK: - Token bindings

extension TanreiSliderTokens {
  /// SLD-11 / SLD-17: colors change, and the value indicator fades, over the state motion; at once under Reduce Motion.
  func stateMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionStateDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }

  /// SLD-16: a value set by a key, assistive technology, a tap or the product moves over the value motion.
  func valueMotion(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionValueDuration, easing: motionValueEasing, reduceMotion: reduceMotion)
  }

  /// SLD-14: the ripple grows over `motion.feedback-duration` with the state easing; whole under Reduce Motion.
  func rippleGrowth(reduceMotion: Bool) -> Animation? {
    TanreiMotion.animation(durationMs: motionFeedbackDuration, easing: motionStateEasing, reduceMotion: reduceMotion)
  }
}

/// A handle's resolved state and the state it would be in without a press (focused, hovered or at rest).
struct TanreiSliderHandleState: Equatable {
  var state: TanreiInteraction
  var beneath: TanreiInteraction

  static let enabled = TanreiSliderHandleState(state: .enabled, beneath: .enabled)

  /// SLD-11, SLD-20: exactly one state per handle — disabled, else pressed > focused > hovered.
  static func resolve(
    _ handle: TanreiSliderHandle, isEnabled: Bool, pressed: TanreiSliderHandle?, focused: TanreiSliderHandle?, hovered: TanreiSliderHandle?
  ) -> TanreiSliderHandleState {
    TanreiSliderHandleState(
      state: TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: pressed == handle, isFocused: focused == handle, isHovered: hovered == handle),
      beneath: TanreiInteraction.resolve(isEnabled: isEnabled, isPressed: false, isFocused: focused == handle, isHovered: hovered == handle))
  }

  /// SLD-11: the highest-precedence state among `states` — disabled over all, then pressed > focused > hovered.
  static func highest(_ states: [TanreiInteraction]) -> TanreiInteraction {
    let order: [TanreiInteraction] = [.disabled, .pressed, .focused, .hovered]
    return order.first { states.contains($0) } ?? .enabled
  }
}

/// Which token values a slider draws, from its size and each handle's state. Pure data read from a `TanreiSliderTokens`,
/// so the bindings are tested without rendering. SLD-8, SLD-10, SLD-11, SLD-14, SLD-20: every part of every state,
/// disabled included, is drawn from the one condition's tokens in that state.
struct TanreiSliderAppearance: Equatable {
  /// What a handle draws from its own state (SLD-11).
  struct Handle: Equatable {
    /// The round state layer (SLD-10).
    let container: TanreiPaint
    /// SLD-14 `ripple`: the pressed container paint, grown over `container`.
    let ripple: TanreiPaint?
    let handle: TanreiPaint
    /// Along the axis.
    let width: CGFloat
    let elevation: [TanreiShadowLayer]
  }

  let start: Handle
  let end: Handle
  /// The state the tracks, dots and opacity are drawn in: the highest of the handles' (SLD-11).
  let state: TanreiInteraction
  let track: TanreiPaint
  let activeTrack: TanreiPaint
  let stopIndicator: TanreiPaint
  let activeStopIndicator: TanreiPaint
  /// Of the whole control.
  let opacity: Double
  let trackThickness: CGFloat
  /// SLD-8: `track.shape` clamped to half the thickness.
  let trackCornerRadius: CGFloat
  /// Across the axis.
  let handleHeight: CGFloat
  let handleShape: CGFloat
  let containerSize: CGFloat
  let containerCornerRadius: CGFloat
  let trackGap: CGFloat
  let stopIndicatorSize: CGFloat
  let indicatorContainer: TanreiPaint
  let indicatorLabel: TanreiPaint
  let indicatorHeight: CGFloat
  let indicatorPaddingInline: CGFloat
  let indicatorCornerRadius: CGFloat
  let indicatorOffset: CGFloat
  let indicatorTypescale: TanreiTextStyle

  /// - Parameters:
  ///   - states: each drawn handle's state; a single slider has only `.end`.
  ///   - feedback: `sys.behavior.pressed-feedback` (SLD-14); it matters only while a handle is pressed.
  init(tokens: TanreiSliderTokens, size: TanreiSliderSize, states: [TanreiSliderHandle: TanreiSliderHandleState], feedback: TanreiPressedFeedback = .overlay) {
    // The lookups are total: a size this system does not have reads `small`'s tokens (and is reported, SLD-23).
    let metrics = tokens.sizes[size]
    let condition = tokens.conditions[TanreiSliderCondition.fallback]
    func handle(_ state: TanreiSliderHandleState) -> Handle {
      let layers = TanreiPressLayers(state: state.state, feedback: feedback, beneath: state.beneath)
      let own = condition[state: layers.state]
      return Handle(
        container: condition[state: layers.container].containerColor, ripple: layers.ripple.map { condition[state: $0].containerColor },
        handle: own.handleColor, width: own.handleWidth, elevation: own.handleElevation)
    }
    let end = states[.end] ?? .enabled
    let start = states[.start] ?? end
    self.start = handle(start)
    self.end = handle(end)

    let drawn = Array(states.values)
    let slider = TanreiSliderHandleState(
      state: TanreiSliderHandleState.highest(drawn.map(\.state)), beneath: TanreiSliderHandleState.highest(drawn.map(\.beneath)))
    let layers = TanreiPressLayers(state: slider.state, feedback: feedback, beneath: slider.beneath)
    state = layers.state
    let own = condition[state: layers.state]
    track = own.trackColor
    activeTrack = own.activeTrackColor
    stopIndicator = own.stopIndicatorColor
    activeStopIndicator = own.activeStopIndicatorColor
    opacity = tokens[state: layers.state]?.opacity ?? TanreiIdentity.opacity

    trackThickness = metrics.trackThickness
    trackCornerRadius = min(metrics.trackShape, metrics.trackThickness / 2)
    handleHeight = metrics.handleHeight
    handleShape = tokens.handleShape
    containerSize = tokens.containerSize
    containerCornerRadius = tokens.containerShape
    trackGap = tokens.trackGap
    stopIndicatorSize = tokens.stopIndicatorSize
    indicatorContainer = tokens.valueIndicatorContainerColor
    indicatorLabel = tokens.valueIndicatorLabelColor
    indicatorHeight = tokens.valueIndicatorContainerHeight
    indicatorPaddingInline = tokens.valueIndicatorContainerPaddingInline
    indicatorCornerRadius = tokens.valueIndicatorContainerShape
    indicatorOffset = tokens.valueIndicatorOffset
    indicatorTypescale = tokens.valueIndicatorLabelTypescale
  }

  func handle(_ handle: TanreiSliderHandle) -> Handle { handle == .start ? start : end }

  /// SLD-7: across its axis the slider is as thick as the larger of the state layer and the handle.
  var across: CGFloat { max(containerSize, handleHeight) }

  /// SLD-8: a handle is `handle.width` along the axis and `handle.height` across it.
  func handleSize(_ handle: TanreiSliderHandle, vertical: Bool) -> CGSize {
    let width = self.handle(handle).width
    return vertical ? CGSize(width: handleHeight, height: width) : CGSize(width: width, height: handleHeight)
  }

  /// SLD-8: `handle.shape` clamped to half the handle's smaller side.
  func handleCornerRadius(_ handle: TanreiSliderHandle) -> CGFloat {
    min(handleShape, min(self.handle(handle).width, handleHeight) / 2)
  }

  /// SLD-8: where the tracks stop beside a handle — its half width, then the gap.
  func cut(_ handle: TanreiSliderHandle) -> CGFloat {
    self.handle(handle).width / 2 + trackGap
  }
}

// MARK: - Geometry

/// SLD-7, SLD-21: where things are, in the slider's own left-to-right space of `size`. Along the axis a distance is
/// measured from the slider's min end; a horizontal slider mirrored by a right-to-left layout has its min end at the
/// right, a vertical one at the bottom.
struct TanreiSliderGeometry: Equatable, Sendable {
  let size: CGSize
  let vertical: Bool
  /// A horizontal slider in a right-to-left layout.
  let mirrored: Bool
  /// From each end of the slider to the end of the travel: half the state layer (the track's inset), then half the
  /// track's thickness, so a handle at min or max is concentric with the track's rounded end.
  let inset: CGFloat

  init(size: CGSize, vertical: Bool, mirrored: Bool, containerSize: CGFloat, trackThickness: CGFloat) {
    self.size = size
    self.vertical = vertical
    self.mirrored = mirrored && !vertical
    inset = containerSize / 2 + trackThickness / 2
  }

  var length: CGFloat { vertical ? size.height : size.width }
  /// How far a handle's center travels.
  var travel: CGFloat { max(.zero, length - 2 * inset) }
  /// The midline across the axis.
  var middle: CGFloat { (vertical ? size.width : size.height) / 2 }

  /// The distance along the axis of `fraction` of the travel.
  func along(_ fraction: Double) -> CGFloat { inset + CGFloat(fraction) * travel }

  /// The point on the midline `along` from the min end.
  func point(along: CGFloat) -> CGPoint {
    if vertical { return CGPoint(x: middle, y: size.height - along) }
    return CGPoint(x: mirrored ? size.width - along : along, y: middle)
  }

  func point(_ fraction: Double) -> CGPoint { point(along: along(fraction)) }

  /// The fraction of the travel under `location`, clamped to it.
  func fraction(at location: CGPoint) -> Double {
    guard travel > 0 else { return 0 }
    let along = vertical ? size.height - location.y : mirrored ? size.width - location.x : location.x
    return Double(min(1, max(0, (along - inset) / travel)))
  }

  /// How far a press travelled along the axis and across it.
  func travel(from start: CGPoint, to end: CGPoint) -> (along: CGFloat, across: CGFloat) {
    let dx = end.x - start.x
    let dy = end.y - start.y
    return vertical ? (dy, dx) : (dx, dy)
  }
}

/// A piece of the tracks (SLD-6, SLD-8, SLD-9): from one distance along the axis to another, each end with its own
/// corners, and the stop dots it holds.
struct TanreiSliderPiece: Equatable {
  var from: CGFloat
  var fromRadius: CGFloat
  var to: CGFloat
  var toRadius: CGFloat
  let isActive: Bool
  /// Distances along the axis; drawn only where the piece is.
  let dots: [CGFloat]

  /// SLD-6, SLD-8, SLD-9: the three pieces — the track, the active track, the track. The track's ends are rounded by
  /// `track.shape`; beside a handle a piece stops `handle.width / 2 + track.gap` from its center, rounded when there is a
  /// gap and square when the track runs up to the handle; at an origin inside the travel the two pieces meet square.
  static func pieces(model: TanreiSliderModel, appearance: TanreiSliderAppearance, geometry: TanreiSliderGeometry) -> [TanreiSliderPiece] {
    let radius = appearance.trackCornerRadius
    let half = appearance.trackThickness / 2
    let trackStart = (at: geometry.along(0) - half, radius: radius)
    let trackEnd = (at: geometry.along(1) + half, radius: radius)
    let atHandle = appearance.trackGap > 0 ? radius : .zero
    func before(_ handle: TanreiSliderHandle) -> (at: CGFloat, radius: CGFloat) {
      (geometry.along(model.scale.fraction(model.values[handle])) - appearance.cut(handle), atHandle)
    }
    func after(_ handle: TanreiSliderHandle) -> (at: CGFloat, radius: CGFloat) {
      (geometry.along(model.scale.fraction(model.values[handle])) + appearance.cut(handle), atHandle)
    }
    let dots = model.dots
    let size = appearance.stopIndicatorSize
    let trackDots = size > 0 ? dots.track.map(geometry.along) : []
    let activeDots = size > 0 ? dots.active.map(geometry.along) : []
    func piece(_ from: (at: CGFloat, radius: CGFloat), _ to: (at: CGFloat, radius: CGFloat), active: Bool) -> TanreiSliderPiece {
      TanreiSliderPiece(from: from.at, fromRadius: from.radius, to: to.at, toRadius: to.radius, isActive: active, dots: active ? activeDots : trackDots)
    }
    if model.isRange {
      return [
        piece(trackStart, before(.start), active: false),
        piece(after(.start), before(.end), active: true),
        piece(after(.end), trackEnd, active: false),
      ]
    }
    let origin = model.originFraction
    let at = origin <= 0 ? trackStart : origin >= 1 ? trackEnd : (at: geometry.along(origin), radius: CGFloat.zero)
    let value = model.scale.fraction(model.values.end)
    if value >= origin {
      return [piece(trackStart, at, active: false), piece(at, before(.end), active: true), piece(after(.end), trackEnd, active: false)]
    }
    return [piece(trackStart, before(.end), active: false), piece(after(.end), at, active: true), piece(at, trackEnd, active: false)]
  }
}

/// The outline of one piece of the tracks, in the slider's space. Its ends move with the value motion.
struct TanreiSliderPieceShape: Shape {
  var from: CGFloat
  var to: CGFloat
  let fromRadius: CGFloat
  let toRadius: CGFloat
  let geometry: TanreiSliderGeometry
  let thickness: CGFloat
  /// `sys.shape.corner-smoothing` (SLD-15).
  let style: RoundedCornerStyle

  init(_ piece: TanreiSliderPiece, geometry: TanreiSliderGeometry, thickness: CGFloat, style: RoundedCornerStyle) {
    from = piece.from
    to = piece.to
    fromRadius = piece.fromRadius
    toRadius = piece.toRadius
    self.geometry = geometry
    self.thickness = thickness
    self.style = style
  }

  var animatableData: AnimatablePair<CGFloat, CGFloat> {
    get { AnimatablePair(from, to) }
    set {
      from = newValue.first
      to = newValue.second
    }
  }

  func path(in rect: CGRect) -> Path {
    let length = to - from
    guard length > 0, thickness > 0 else { return Path() }
    // A piece shorter than its rounded ends keeps them in proportion; no end is rounder than half the thickness.
    var low = max(.zero, fromRadius)
    var high = max(.zero, toRadius)
    if low + high > length {
      let scale = length / (low + high)
      low *= scale
      high *= scale
    }
    low = min(low, thickness / 2)
    high = min(high, thickness / 2)
    // A pill end is the same at every smoothing (SWT-9's rule).
    let style: RoundedCornerStyle = max(low, high) * 2 >= thickness ? .circular : self.style
    let a = geometry.point(along: from)
    let b = geometry.point(along: to)
    let half = thickness / 2
    let box: CGRect
    let radii: RectangleCornerRadii
    if geometry.vertical {
      box = CGRect(x: a.x - half, y: b.y, width: thickness, height: a.y - b.y)
      radii = RectangleCornerRadii(topLeading: high, bottomLeading: low, bottomTrailing: low, topTrailing: high)
    } else if geometry.mirrored {
      box = CGRect(x: b.x, y: a.y - half, width: a.x - b.x, height: thickness)
      radii = RectangleCornerRadii(topLeading: high, bottomLeading: high, bottomTrailing: low, topTrailing: low)
    } else {
      box = CGRect(x: a.x, y: a.y - half, width: b.x - a.x, height: thickness)
      radii = RectangleCornerRadii(topLeading: low, bottomLeading: low, bottomTrailing: high, topTrailing: high)
    }
    return UnevenRoundedRectangle(cornerRadii: radii, style: style).path(in: box)
  }
}

/// SLD-17: places a value indicator beside its handle — its `edge` on `anchor` — centered on the handle along the axis
/// and shifted to stay inside the slider, which lies inside the window. It takes the whole slider and no room of its own.
struct TanreiSliderIndicatorPlacement: Layout {
  var anchor: CGPoint
  /// The edge of the indicator that faces the handle: `.bottom` above a horizontal slider's handle, `.trailing` or
  /// `.leading` at a vertical one's inline start.
  let edge: Edge

  var animatableData: AnimatablePair<CGFloat, CGFloat> {
    get { AnimatablePair(anchor.x, anchor.y) }
    set { anchor = CGPoint(x: newValue.first, y: newValue.second) }
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    proposal.replacingUnspecifiedDimensions()
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    for subview in subviews {
      let size = subview.sizeThatFits(.unspecified)
      func along(_ center: CGFloat, _ extent: CGFloat, _ room: CGFloat) -> CGFloat {
        max(.zero, min(center - extent / 2, room - extent))
      }
      let origin: CGPoint
      switch edge {
      case .bottom: origin = CGPoint(x: along(anchor.x, size.width, bounds.width), y: anchor.y - size.height)
      case .top: origin = CGPoint(x: along(anchor.x, size.width, bounds.width), y: anchor.y)
      case .trailing: origin = CGPoint(x: anchor.x - size.width, y: along(anchor.y, size.height, bounds.height))
      case .leading: origin = CGPoint(x: anchor.x, y: along(anchor.y, size.height, bounds.height))
      }
      subview.place(at: CGPoint(x: bounds.minX + origin.x, y: bounds.minY + origin.y), anchor: .topLeading, proposal: ProposedViewSize(size))
    }
  }
}

// MARK: - Drawing

/// What the chrome hands back to the view that owns the values: the press, the pointer, the keys and assistive
/// technology.
struct TanreiSliderActions {
  let gesture: @MainActor (TanreiSliderGeometry) -> AnyGesture<Void>
  /// iOS 18: the drag of a touch, from UIKit's pan (`TanreiSliderPan`).
  let pan: @MainActor (TanreiSliderPanPhase, TanreiSliderGeometry) -> Void
  /// A touch that ended where it landed (iOS).
  let tap: @MainActor (CGPoint, TanreiSliderGeometry) -> Void
  /// A touch landing on the slider, and (`nil`) any touch lifting (iOS).
  let touch: @MainActor (CGPoint?, TanreiSliderGeometry) -> Void
  let hover: @MainActor (CGPoint?, TanreiSliderGeometry) -> Void
  let key: @MainActor (TanreiSliderHandle, KeyEquivalent) -> KeyPress.Result
  let adjust: @MainActor (TanreiSliderHandle, AccessibilityAdjustmentDirection) -> Void

  init<G: Gesture>(
    gesture: @escaping @MainActor (TanreiSliderGeometry) -> G,
    pan: @escaping @MainActor (TanreiSliderPanPhase, TanreiSliderGeometry) -> Void,
    tap: @escaping @MainActor (CGPoint, TanreiSliderGeometry) -> Void,
    touch: @escaping @MainActor (CGPoint?, TanreiSliderGeometry) -> Void,
    hover: @escaping @MainActor (CGPoint?, TanreiSliderGeometry) -> Void,
    key: @escaping @MainActor (TanreiSliderHandle, KeyEquivalent) -> KeyPress.Result,
    adjust: @escaping @MainActor (TanreiSliderHandle, AccessibilityAdjustmentDirection) -> Void
  ) {
    self.gesture = { AnyGesture(gesture($0).map { _ in () }) }
    self.pan = pan
    self.tap = tap
    self.touch = touch
    self.hover = hover
    self.key = key
    self.adjust = adjust
  }
}

/// The layout size of a slider (SLD-7): as long as its layout gives it and, across, as thick as the larger of the state
/// layer and the handle. Invisible; the drawing lies over it.
struct TanreiSliderFootprint: View {
  let size: TanreiSliderSize
  let orientation: TanreiSliderOrientation
  @Environment(\.tanreiSystem) private var system

  var body: some View {
    let tokens = system.slider
    let across = max(tokens.containerSize, tokens.sizes[size].handleHeight)
    if orientation == .vertical {
      Color.clear.frame(width: across)
    } else {
      Color.clear.frame(height: across)
    }
  }
}

/// The visual and the handles' elements: the tracks with their dots, each handle with its round state layer, the value
/// indicators, and the focus ring — in the one resolved state of each handle.
struct TanreiSliderChrome: View {
  let model: TanreiSliderModel
  let press: TanreiPressState
  let pressedHandle: TanreiSliderHandle
  /// Keyboard focus: SwiftUI gives it only from the keyboard (the handles are focusable for activation), so neither the
  /// focused state nor the ring appears for a press (SLD-11, SLD-12).
  let focusedHandle: TanreiSliderHandle?
  let hoveredHandle: TanreiSliderHandle?
  let isDragging: Bool
  let isRightToLeft: Bool
  var focus: FocusState<TanreiSliderHandle?>.Binding? = nil
  var actions: TanreiSliderActions? = nil

  @Environment(\.isEnabled) private var isEnabled
  @Environment(\.tanreiSystem) private var system
  @Environment(\.tanreiTheme) private var theme
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors

  var body: some View {
    GeometryReader { proxy in
      content(size: proxy.size)
    }
  }

  /// SLD-11: each drawn handle's state.
  var states: [TanreiSliderHandle: TanreiSliderHandleState] {
    let pressed = press.isPressed ? pressedHandle : nil
    return Dictionary(
      uniqueKeysWithValues: model.handles.map {
        ($0, TanreiSliderHandleState.resolve($0, isEnabled: isEnabled, pressed: pressed, focused: focusedHandle, hovered: hoveredHandle))
      })
  }

  private func content(size: CGSize) -> some View {
    let tokens = system.slider
    let states = self.states
    let appearance = TanreiSliderAppearance(tokens: tokens, size: model.size, states: states, feedback: system.behavior.pressedFeedback)
    let vertical = model.orientation == .vertical
    let geometry = TanreiSliderGeometry(
      size: size, vertical: vertical, mirrored: isRightToLeft, containerSize: appearance.containerSize, trackThickness: appearance.trackThickness)
    let pieces = TanreiSliderPiece.pieces(model: model, appearance: appearance, geometry: geometry)
    let isInteractive = isEnabled && model.scale.isValid
    // SLD-16: a drag follows the press without delay; everything else moves over the value motion.
    let valueMotion = isDragging ? nil : tokens.valueMotion(reduceMotion: reduceMotion)
    let stateMotion = tokens.stateMotion(reduceMotion: reduceMotion)
    let stateKey = model.handles.map { states[$0]?.state ?? .enabled }

    return ZStack(alignment: .topLeading) {
      ZStack(alignment: .topLeading) {
        ForEach(Array(pieces.enumerated()), id: \.offset) { _, piece in
          self.piece(piece, appearance: appearance, geometry: geometry)
        }
        ForEach(model.handles, id: \.self) { handle in
          self.handle(handle, appearance: appearance, geometry: geometry)
        }
        if isInteractive && model.valueIndicator != .none {
          ForEach(model.handles, id: \.self) { handle in
            indicator(handle, appearance: appearance, geometry: geometry, stateMotion: stateMotion)
          }
        }
      }
      .frame(width: size.width, height: size.height, alignment: .topLeading)
      // SLD-8 / SLD-20: the state's opacity applies to the whole control at once.
      .compositingGroup()
      .opacity(appearance.opacity)
      .accessibilityHidden(true)

      // SLD-12, SLD-15: around the handle with keyboard focus, never animated and never dimmed by a state's opacity.
      ForEach(model.handles, id: \.self) { handle in
        let handleSize = appearance.handleSize(handle, vertical: vertical)
        Color.clear
          .frame(width: handleSize.width, height: handleSize.height)
          .tanreiFocusRing(focusedHandle == handle && isEnabled, cornerRadius: appearance.handleCornerRadius(handle))
          .position(geometry.point(model.scale.fraction(model.values[handle])))
          .accessibilityHidden(true)
      }

      ForEach(model.handles, id: \.self) { handle in
        element(handle, appearance: appearance, geometry: geometry)
      }
    }
    .frame(width: size.width, height: size.height, alignment: .topLeading)
    // SLD-16: the handles, the pieces and the indicators move to a new value over the value motion (not while dragged).
    .animation(valueMotion, value: model.values)
    .animation(valueMotion, value: model.originFraction)
    // SLD-11: colors change over the state motion.
    .animation(stateMotion, value: stateKey)
    .contentShape(Rectangle())
    .modifier(TanreiSliderPointer(actions: actions, geometry: geometry))
  }

  /// One piece of the tracks and the dots it holds, clipped to it (SLD-8, SLD-9).
  private func piece(_ piece: TanreiSliderPiece, appearance: TanreiSliderAppearance, geometry: TanreiSliderGeometry) -> some View {
    let dot = appearance.stopIndicatorSize
    return ZStack(alignment: .topLeading) {
      Rectangle().fill(colors[piece.isActive ? appearance.activeTrack : appearance.track])
      ForEach(Array(piece.dots.enumerated()), id: \.offset) { _, along in
        Circle()
          .fill(colors[piece.isActive ? appearance.activeStopIndicator : appearance.stopIndicator])
          .frame(width: dot, height: dot)
          .position(geometry.point(along: along))
      }
    }
    .frame(width: geometry.size.width, height: geometry.size.height)
    .clipShape(TanreiSliderPieceShape(piece, geometry: geometry, thickness: appearance.trackThickness, style: system.shape.roundedCornerStyle))
  }

  /// A handle and, centered on it and behind it, its round state layer (SLD-8, SLD-10), from the handle's own state.
  private func handle(_ handle: TanreiSliderHandle, appearance: TanreiSliderAppearance, geometry: TanreiSliderGeometry) -> some View {
    let paint = appearance.handle(handle)
    let size = appearance.handleSize(handle, vertical: geometry.vertical)
    let ripple = paint.ripple.map {
      TanreiContainerRipple(color: colors[$0], press: press, growth: system.slider.rippleGrowth(reduceMotion: reduceMotion))
    }
    return ZStack {
      // SLD-10: a size of 0 draws no state layer.
      if appearance.containerSize > 0 {
        Color.clear
          .frame(width: appearance.containerSize, height: appearance.containerSize)
          .modifier(
            TanreiContainerLayers(
              fill: colors[paint.container], elevation: TanreiIdentity.elevation, cornerRadius: appearance.containerCornerRadius,
              outline: colors[TanreiPaint.none], outlineWidth: .zero, ripple: ripple, opacity: TanreiIdentity.opacity))
      }
      Color.clear
        .frame(width: size.width, height: size.height)
        .background { TanreiElevationSurface(paint.elevation, fill: colors[paint.handle], cornerRadius: appearance.handleCornerRadius(handle)) }
    }
    .position(geometry.point(model.scale.fraction(model.values[handle])))
  }

  /// SLD-17: the handle's value text beside it — above a horizontal slider's handle, at a vertical one's inline start — a
  /// read overlay: no focus, no input, hidden from assistive technology, fading over the state motion.
  private func indicator(
    _ handle: TanreiSliderHandle, appearance: TanreiSliderAppearance, geometry: TanreiSliderGeometry, stateMotion: Animation?
  ) -> some View {
    let pressed = press.isPressed && pressedHandle == handle
    let shown = model.valueIndicator == .always || (model.valueIndicator == .active && (pressed || focusedHandle == handle))
    let center = geometry.point(model.scale.fraction(model.values[handle]))
    let reach = appearance.handleHeight / 2 + appearance.indicatorOffset
    let anchor: CGPoint
    let edge: Edge
    if geometry.vertical {
      anchor = CGPoint(x: isRightToLeft ? center.x + reach : center.x - reach, y: center.y)
      edge = isRightToLeft ? .leading : .trailing
    } else {
      anchor = CGPoint(x: center.x, y: center.y - reach)
      edge = .bottom
    }
    // At least `container.height` high — taller when larger text needs it — and never narrower than it is high.
    let line = appearance.indicatorTypescale.resolved(policy: theme.fontFamilyPolicy, dynamicTypeSize: dynamicTypeSize).lineHeight
    let height = max(appearance.indicatorHeight, line)
    return TanreiSliderIndicatorPlacement(anchor: anchor, edge: edge) {
      Text(verbatim: model.words(handle))
        .tanreiTextStyle(appearance.indicatorTypescale)
        .lineLimit(1)
        .fixedSize()
        .foregroundStyle(colors[appearance.indicatorLabel])
        .environment(\.layoutDirection, isRightToLeft ? .rightToLeft : .leftToRight)
        .padding(.horizontal, appearance.indicatorPaddingInline)
        .frame(minWidth: height, minHeight: height)
        .background {
          TanreiCornerShape(cornerRadius: appearance.indicatorCornerRadius, style: system.shape.roundedCornerStyle)
            .fill(colors[appearance.indicatorContainer])
        }
    }
    .frame(width: geometry.size.width, height: geometry.size.height)
    .opacity(shown ? 1 : 0)
    .animation(stateMotion, value: shown)
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }

  /// SLD-19: each handle is a slider for assistive technology (the adjustable trait on iOS) named by its label, its value
  /// text its value; SLD-3: the keyboard's Tab stop. As large as the minimum target, so an assistive technology's frame
  /// can be touched (the press itself lands on the whole slider).
  private func element(_ handle: TanreiSliderHandle, appearance: TanreiSliderAppearance, geometry: TanreiSliderGeometry) -> some View {
    let extent = max(TanreiHitTarget.minimum(in: system.measure), appearance.across)
    return Color.clear
      .frame(width: extent, height: extent)
      .contentShape(Rectangle())
      .focusable(isEnabled, interactions: .activate)
      .modifier(TanreiSliderFocusBinding(focus: focus, handle: handle))
      // SLD-12: Tanrei draws its own ring; the system's would double it.
      .focusEffectDisabled()
      .onKeyPress(keys: TanreiSliderRules.keys, phases: [.down, .repeat]) { key in
        actions?.key(handle, key.key) ?? .ignored
      }
      .accessibilityElement()
      .accessibilityLabel(model.label(handle))
      .accessibilityValue(Text(verbatim: model.words(handle)))
      .accessibilityAdjustableAction { direction in actions?.adjust(handle, direction) }
      // SLD-5: a range's start handle first.
      .accessibilitySortPriority(handle == .start ? 1 : 0)
      .position(geometry.point(model.scale.fraction(model.values[handle])))
  }
}

/// Binds a handle to the slider's focus state, when there is one (a chrome rendered on its own has none).
private struct TanreiSliderFocusBinding: ViewModifier {
  let focus: FocusState<TanreiSliderHandle?>.Binding?
  let handle: TanreiSliderHandle

  func body(content: Content) -> some View {
    if let focus {
      content.focused(focus, equals: handle)
    } else {
      content
    }
  }
}

/// SLD-2, SLD-11, SLD-13: the press and the pointer over the whole slider. On iOS a touch is three things, each simultaneous
/// with an enclosing scroll view's pan so that a touch that travels across the track first scrolls it (the slider then
/// changes nothing): a drag that begins past the slop, a tap, and a passive watcher that shows the press as the touch lands.
private struct TanreiSliderPointer: ViewModifier {
  let actions: TanreiSliderActions?
  let geometry: TanreiSliderGeometry

  func body(content: Content) -> some View {
    if let actions {
      #if os(iOS)
      content
        .modifier(TanreiSliderTouchDrag(actions: actions, geometry: geometry))
        .simultaneousGesture(SpatialTapGesture(coordinateSpace: .local).onEnded { tap in actions.tap(tap.location, geometry) })
        // Where a touch lands, and when it lifts, watched without taking part (the press's own gestures cannot say).
        .background {
          TanreiTouchObserver(onTouch: { location in if let location { actions.touch(location, geometry) } }, onTouchEnd: { actions.touch(nil, geometry) })
        }
        .onContinuousHover(coordinateSpace: .local) { phase in hover(phase, actions) }
      #else
      content
        .gesture(actions.gesture(geometry))
        .onContinuousHover(coordinateSpace: .local) { phase in hover(phase, actions) }
      #endif
    } else {
      content
    }
  }

  private func hover(_ phase: HoverPhase, _ actions: TanreiSliderActions) {
    switch phase {
    case .active(let location): actions.hover(location, geometry)
    case .ended: actions.hover(nil, geometry)
    }
  }
}

/// A phase of a touch's drag along the slider.
enum TanreiSliderPanPhase: Equatable {
  /// It moves: where it began and where it is, in the slider's space.
  case changed(start: CGPoint, location: CGPoint)
  case ended
  /// A scroll view or the system took it.
  case cancelled
}

#if os(iOS)
/// SLD-2 on iOS: a touch's drag. From iOS 18 it is UIKit's pan, which begins only when the touch has travelled the
/// platform's slop ALONG the track — one that travels across first fails it, and an enclosing scroll view, which waits for
/// it to fail, scrolls. (A SwiftUI `DragGesture` on a scroll view's content keeps the scroll view from scrolling from it,
/// simultaneous or not: the gallery's UI tests found it.) Before iOS 18, a simultaneous `DragGesture` past the slop.
private struct TanreiSliderTouchDrag: ViewModifier {
  let actions: TanreiSliderActions
  let geometry: TanreiSliderGeometry

  func body(content: Content) -> some View {
    if #available(iOS 18, *) {
      content.gesture(TanreiSliderPan(geometry: geometry, action: actions.pan))
    } else {
      content.simultaneousGesture(actions.gesture(geometry))
    }
  }
}

@available(iOS 18, *)
private struct TanreiSliderPan: UIGestureRecognizerRepresentable {
  let geometry: TanreiSliderGeometry
  let action: @MainActor (TanreiSliderPanPhase, TanreiSliderGeometry) -> Void

  func makeCoordinator(converter: CoordinateSpaceConverter) -> Coordinator { Coordinator() }

  func makeUIGestureRecognizer(context: Context) -> UIPanGestureRecognizer {
    let pan = UIPanGestureRecognizer()
    pan.delegate = context.coordinator
    pan.maximumNumberOfTouches = 1
    context.coordinator.vertical = geometry.vertical
    return pan
  }

  func updateUIGestureRecognizer(_ recognizer: UIPanGestureRecognizer, context: Context) {
    context.coordinator.vertical = geometry.vertical
  }

  func handleUIGestureRecognizerAction(_ recognizer: UIPanGestureRecognizer, context: Context) {
    switch recognizer.state {
    case .began, .changed:
      let location = context.converter.localLocation
      let translation = context.converter.localTranslation ?? .zero
      action(.changed(start: CGPoint(x: location.x - translation.x, y: location.y - translation.y), location: location), geometry)
    case .ended: action(.ended, geometry)
    case .cancelled, .failed: action(.cancelled, geometry)
    default: break
    }
  }

  @MainActor
  final class Coordinator: NSObject, UIGestureRecognizerDelegate {
    var vertical = false

    /// Along the track: the slider's; across it first: the scroll view's.
    func gestureRecognizerShouldBegin(_ recognizer: UIGestureRecognizer) -> Bool {
      guard let pan = recognizer as? UIPanGestureRecognizer else { return true }
      let travel = pan.translation(in: pan.view)
      return vertical ? abs(travel.y) >= abs(travel.x) : abs(travel.x) >= abs(travel.y)
    }

    /// An enclosing scroll view's pan waits for this one to fail.
    func gestureRecognizer(_ recognizer: UIGestureRecognizer, shouldBeRequiredToFailBy other: UIGestureRecognizer) -> Bool {
      other.view is UIScrollView
    }
  }
}
#endif
