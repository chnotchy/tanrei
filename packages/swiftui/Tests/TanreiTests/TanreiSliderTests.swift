import AcmeFixture
import SwiftUI
import Testing

@testable import Tanrei

// Covers specs/slider.spec.json. Each behavior id (SLD-n) is named next to the test that covers it; the parity checker
// requires every id to appear in this file. SLD-13, SLD-14 and SLD-15 are BTN-8, BTN-9 and BTN-10 for the handle a press
// moves: the primitives they rest on are tested once in TanreiButtonTests / TanreiPrimitivesTests; here each is proven
// to reach the slider.
//
// Geometry: a fixture is drawn in its stage (SLD-7 `verify`: a horizontal slider 320 long centered in 320 × 96, the
// vertical one 240 long centered in 96 × 240), plus `Snapshot.inset` on every side. In the default system the state layer
// is 32 and the small track 4, so a handle's center travels from 18 to 302 along the slider (`at(_:)`), on its midline.
// Keyboard focus cannot be given from a unit test (the handles are focusable for keyboard activation only, as native
// controls are), and the simulator gives none under automation: the keys are
// tested as rules and through `TanreiSliderEditor`, the one route every key press and adjustment takes.

private let suiteName = "TanreiSliderTests"

@MainActor
private func theme(_ system: TanreiSystem) -> TanreiTheme {
  var theme = Snapshot.theme
  theme.system = system
  return theme
}

@MainActor
private func pixel(_ bitmap: Bitmap, x: CGFloat, y: CGFloat) -> Bitmap.RGBA {
  bitmap[Int(x * Snapshot.scale), Int(y * Snapshot.scale)]
}

private let light = TanreiSystem.tanrei.colors.light

/// The stage of SLD-7 `verify`.
private let stageLength: CGFloat = 320
private let stageAcross: CGFloat = 96
private let verticalLength: CGFloat = 240

/// A center of the travel in the default system, in a render of a stage: `fraction` of the way from min.
@MainActor
private func at(_ fraction: Double, system: TanreiSystem = .tanrei, size: TanreiSliderSize = .small) -> CGFloat {
  let inset = system.slider.containerSize / 2 + system.slider.sizes[size].trackThickness / 2
  return Snapshot.inset + inset + CGFloat(fraction) * (stageLength - 2 * inset)
}

/// The midline of a horizontal stage.
@MainActor private var midline: CGFloat { Snapshot.inset + stageAcross / 2 }

/// A value the product holds, and what the slider did with it.
@MainActor
private final class Held {
  var value: Double
  var range: ClosedRange<Double>
  /// Every write: the spec's `input`.
  var inputs: [Double] = []
  var rangeInputs: [ClosedRange<Double>] = []
  /// Every `onCommit`: the spec's `change`.
  var commits: [Double] = []
  var rangeCommits: [ClosedRange<Double>] = []
  /// Input and change in the order they came.
  var events: [String] = []

  init(_ value: Double = 40, range: ClosedRange<Double> = 20...60) {
    self.value = value
    self.range = range
  }

  var binding: Binding<Double> {
    Binding(
      get: { MainActor.assumeIsolated { self.value } },
      set: { value in
        MainActor.assumeIsolated {
          self.value = value
          self.inputs.append(value)
          self.events.append("input \(value)")
        }
      })
  }

  var rangeBinding: Binding<ClosedRange<Double>> {
    Binding(
      get: { MainActor.assumeIsolated { self.range } },
      set: { range in
        MainActor.assumeIsolated {
          self.range = range
          self.rangeInputs.append(range)
          self.events.append("input \(range)")
        }
      })
  }

  func commit(_ value: Double) {
    commits.append(value)
    events.append("change \(value)")
  }

  func commitRange(_ range: ClosedRange<Double>) {
    rangeCommits.append(range)
    events.append("change \(range)")
  }
}

/// The model a slider builds from its props.
@MainActor
private func model(
  value: Double = 40, start: Double = 0, range: Bool = false, bounds: ClosedRange<Double> = 0...100, step: Double = 0, origin: Double? = nil,
  size: TanreiSliderSize = .small, orientation: TanreiSliderOrientation = .horizontal, stops: Bool = false,
  indicator: TanreiSliderValueIndicator = .none, valueText: String = "", startValueText: String = "", locale: Locale = Locale(identifier: "en_US")
) -> TanreiSliderModel {
  TanreiSliderModel(
    raw: (start, value), isRange: range, bounds: bounds, step: step, origin: origin, size: size, orientation: orientation, showsStops: stops,
    valueIndicator: indicator, label: Text("Volume"), startLabel: Text("Minimum"), valueText: valueText, startValueText: startValueText, locale: locale)
}

/// The chrome alone, in a horizontal stage, in the states given.
@MainActor
private func chrome(
  _ model: TanreiSliderModel, pressed: TanreiSliderHandle? = nil, focused: TanreiSliderHandle? = nil, hovered: TanreiSliderHandle? = nil,
  rightToLeft: Bool = false
) -> some View {
  let vertical = model.orientation == .vertical
  return TanreiSliderChrome(
    model: model, press: TanreiPressState(isPressed: pressed != nil, contact: nil, generation: 0, hasBegun: false), pressedHandle: pressed ?? .end,
    focusedHandle: focused, hoveredHandle: hovered, isDragging: false, isRightToLeft: rightToLeft
  )
  .environment(\.layoutDirection, .leftToRight)
  .frame(width: vertical ? nil : stageLength, height: vertical ? verticalLength : nil)
  .frame(width: vertical ? stageAcross : stageLength, height: vertical ? verticalLength : stageAcross)
}

/// A slider in its stage, as a product writes it.
@MainActor
private func stage(_ slider: some View, vertical: Bool = false) -> some View {
  slider
    .frame(width: vertical ? nil : stageLength, height: vertical ? verticalLength : nil)
    .frame(width: vertical ? stageAcross : stageLength, height: vertical ? verticalLength : stageAcross)
}

// MARK: - Values (SLD-1, SLD-5, SLD-6, SLD-18, SLD-22, SLD-23)

@MainActor
@Suite("TanreiSlider values")
struct TanreiSliderValueTests {
  /// SLD-1 — continuous: any value between min and max; discrete: min plus whole multiples of step, the nearest, never
  /// past max.
  @Test("SLD-1 values stay between min and max, on a step while step is above 0")
  func snapping() {
    let continuous = TanreiSliderScale(bounds: 0...100, step: 0)
    #expect(continuous.snap(40.37) == 40.37 && continuous.snap(-3) == 0 && continuous.snap(140) == 100)
    let discrete = TanreiSliderScale(bounds: 0...100, step: 10)
    #expect(discrete.snap(34) == 30 && discrete.snap(35) == 40 && discrete.snap(99) == 100 && discrete.snap(-1) == 0)
    // A max that is not on a step: the last step below it.
    let uneven = TanreiSliderScale(bounds: 0...100, step: 30)
    #expect(uneven.snap(100) == 90 && uneven.snap(80) == 90 && uneven.stops == [0, 0.3, 0.6, 0.9])
    // Floating-point noise is not a value of its own.
    let fine = TanreiSliderScale(bounds: 0...1, step: 0.1)
    #expect(fine.snap(0.30000000000000004) == 0.3 && fine.snap(0.1 + 0.2) == 0.3)
    // An offset min: steps count from min.
    #expect(TanreiSliderScale(bounds: 5...25, step: 10).snap(12) == 15)
  }

  /// SLD-22 — outside the scale or off a step: drawn and exposed clamped and snapped, and reported; a range's start past
  /// its end: both at the end; max not above min: at the track's start, no input; a negative step: 0.
  @Test("SLD-22 values outside the scale are drawn clamped and snapped, and reported")
  func outOfRange() {
    let (clamped, reports) = Reports.collecting { () -> TanreiSliderModel in
      TanreiSliderRules.reportValues(start: nil, end: 140, origin: nil, bounds: 0...100, step: 10)
      return model(value: 140, step: 10)
    }
    #expect(clamped.values.end == 100)
    #expect(reports.mention("value 140.0 is outside"))
    let (range, rangeReports) = Reports.collecting { () -> TanreiSliderModel in
      TanreiSliderRules.reportValues(start: 70, end: 60, origin: nil, bounds: 0...100, step: 0)
      return model(value: 60, start: 70, range: true)
    }
    #expect(range.values == TanreiSliderValues(start: 60, end: 60))
    #expect(rangeReports.mention("startValue 70.0 is greater than its value 60.0"))
    let (flat, flatReports) = Reports.collecting { () -> TanreiSliderModel in
      TanreiSliderRules.reportValues(start: nil, end: 5, origin: nil, bounds: 10...10, step: 0)
      return model(value: 5, bounds: 10...10)
    }
    #expect(!flat.scale.isValid && flat.values.end == 10 && flat.scale.fraction(flat.values.end) == 0)
    #expect(TanreiSliderRules.moved(.end, to: 10, values: flat.values, isRange: false, scale: flat.scale) == nil)
    #expect(flatReports.mention("is not greater than its min"))
    let (_, stepReports) = Reports.collecting { TanreiSliderRules.reportValues(start: nil, end: 40, origin: 250, bounds: 0...100, step: -5) }
    #expect(stepReports.mention("step -5.0 is below 0") && stepReports.mention("origin 250.0"))
    #expect(TanreiSliderScale(bounds: 0...100, step: -5).step == 0)
    // A value on the scale is not reported.
    let (_, none) = Reports.collecting { TanreiSliderRules.reportValues(start: 20, end: 60, origin: nil, bounds: 0...100, step: 10) }
    #expect(none.messages.isEmpty)
  }

  /// SLD-22 through the public view: the report comes from the initializer, what is drawn is clamped.
  @Test("SLD-22 SLD-19 the view reports what it corrects and a missing name")
  func viewReports() {
    let (_, reports) = Reports.collecting { TanreiSlider("", value: .constant(140)) }
    #expect(reports.mention("label is empty") && reports.mention("SLD-19") && reports.mention("value 140.0"))
    let (_, range) = Reports.collecting { TanreiSlider("Maximum price", startLabel: "", value: .constant(20...60)) }
    #expect(range.mention("startLabel is empty") && !range.mention("label is empty, so"))
    let (_, named) = Reports.collecting { TanreiSlider("Volume", value: .constant(40)) }
    #expect(named.messages.isEmpty)
  }

  /// SLD-5 — a range's handles stop at each other's value: they may meet but never cross.
  @Test("SLD-5 each handle of a range stops at the other's value")
  func rangeBounds() {
    let scale = TanreiSliderScale(bounds: 0...100, step: 0)
    let values = TanreiSliderValues(start: 20, end: 60)
    #expect(TanreiSliderRules.bounds(of: .start, values: values, isRange: true, scale: scale) == 0...60)
    #expect(TanreiSliderRules.bounds(of: .end, values: values, isRange: true, scale: scale) == 20...100)
    #expect(TanreiSliderRules.bounds(of: .end, values: values, isRange: false, scale: scale) == 0...100)
    #expect(TanreiSliderRules.moved(.start, to: 90, values: values, isRange: true, scale: scale) == TanreiSliderValues(start: 60, end: 60))
    #expect(TanreiSliderRules.moved(.end, to: 5, values: values, isRange: true, scale: scale) == TanreiSliderValues(start: 20, end: 20))
    #expect(TanreiSliderRules.moved(.end, to: 60, values: values, isRange: true, scale: scale) == nil)
    #expect(model(value: 60, start: 20, range: true).handles == [.start, .end] && model().handles == [.end])
  }

  /// SLD-2 — a press moves the nearer handle; where the two meet, the one that can move toward the press.
  @Test("SLD-2 a press moves the nearer handle; meeting handles part toward the press")
  func nearer() {
    let values = TanreiSliderValues(start: 20, end: 60)
    #expect(TanreiSliderRules.nearer(30, values: values, isRange: true) == .start)
    #expect(TanreiSliderRules.nearer(50, values: values, isRange: true) == .end)
    #expect(TanreiSliderRules.nearer(10, values: values, isRange: false) == .end)
    let met = TanreiSliderValues(start: 40, end: 40)
    #expect(TanreiSliderRules.nearer(10, values: met, isRange: true) == .start)
    #expect(TanreiSliderRules.nearer(90, values: met, isRange: true) == .end)
  }

  /// SLD-2 — on touch a press becomes a drag once it has travelled the slop along the track, and one that travels across
  /// first is the scroll view's; a pointer drags as soon as it moves.
  @Test("SLD-2 the touch slop: along drags, across first scrolls, a pointer drags at once")
  func intent() {
    let slop = TanreiSliderInput.touchSlop
    #expect(TanreiSliderRules.intent(along: slop - 1, across: 2, isTouch: true, slop: slop) == .wait)
    #expect(TanreiSliderRules.intent(along: slop, across: 2, isTouch: true, slop: slop) == .drag)
    #expect(TanreiSliderRules.intent(along: -slop, across: 0, isTouch: true, slop: slop) == .drag)
    #expect(TanreiSliderRules.intent(along: 2, across: slop, isTouch: true, slop: slop) == .scroll)
    #expect(TanreiSliderRules.intent(along: 0, across: 0, isTouch: false, slop: slop) == .wait)
    #expect(TanreiSliderRules.intent(along: 1, across: 0, isTouch: false, slop: slop) == .drag)
    // Across the axis of a vertical slider is horizontal.
    let vertical = TanreiSliderGeometry(size: CGSize(width: 32, height: 240), vertical: true, mirrored: false, containerSize: 32, trackThickness: 4)
    let travel = vertical.travel(from: .zero, to: CGPoint(x: 9, y: -2))
    #expect(travel.along == -2 && travel.across == 9)
  }

  /// SLD-6 — the origin: min while nil, clamped into the range, ignored for a range.
  @Test("SLD-6 the origin of the active track")
  func origin() {
    #expect(model().originFraction == 0)
    #expect(model(bounds: -50...50, origin: 0).originFraction == 0.5)
    let (clamped, _) = Reports.collecting { model(origin: 250) }
    #expect(clamped.originFraction == 1)
    #expect(model(value: 60, start: 20, range: true, origin: 50).originFraction == 0)
  }

  /// SLD-18 — valueText, or the number in the locale with the keyboard step's fraction digits, at most two.
  @Test("SLD-18 the value text: the product's words, or the number in the locale")
  func words() {
    #expect(model(value: 40).endWords == "40")
    #expect(model(value: 40, valueText: "40 %").endWords == "40 %")
    #expect(model(value: 40, valueText: "   ").endWords == "40")
    #expect(model(value: 60, start: 20, range: true, startValueText: "$20").startWords == "$20")
    #expect(model(value: 60, start: 20, range: true).startWords == "20")
    #expect(model(value: 2.5, bounds: 0...10, step: 0.5).endWords == "2.5")
    #expect(model(value: 2.5, bounds: 0...10, step: 0.5, locale: Locale(identifier: "de_DE")).endWords == "2,5")
    // Continuous over 0…1: a keyboard step of 0.01 — two digits; 0.001 would be three, and shows two.
    #expect(model(value: 0.4, bounds: 0...1).endWords == "0.40")
    #expect(model(value: 0.1234, bounds: 0...1, step: 0.001).endWords == "0.12")
    #expect(model(value: 1200, bounds: 0...5000, step: 100).endWords == "1,200")
  }

  /// SLD-23 — an orientation or a value indicator the component does not define draws the default and is reported; a
  /// size the system does not have draws small's tokens and is reported.
  @Test("SLD-23 unknown values draw the defaults and are reported")
  func unknownValues() throws {
    let (orientation, first) = Reports.collecting { TanreiSliderOrientation(named: "diagonal") }
    #expect(orientation == .horizontal && first.mention("SLD-23"))
    let (indicator, second) = Reports.collecting { TanreiSliderValueIndicator(named: "hover") }
    #expect(indicator == .none && second.mention("SLD-23"))
    #expect(TanreiSliderOrientation(named: "vertical") == .vertical && TanreiSliderValueIndicator(named: "always") == .always)
    let tokens = TanreiSystem.tanrei.slider
    let (appearance, third) = Reports.collecting {
      TanreiSliderAppearance(tokens: tokens, size: TanreiSliderSize(rawValue: "huge"), states: [.end: .enabled])
    }
    #expect(appearance.trackThickness == tokens.sizes.small.trackThickness && third.mention("huge"))
    let (unknown, rendered) = try Reports.collecting {
      try Snapshot.renderExact(stage(TanreiSlider("Volume", value: .constant(40), size: TanreiSliderSize(rawValue: "huge"))))
    }
    #expect(rendered.mention("huge"))
    #expect(unknown.pixels == (try Snapshot.renderExact(stage(TanreiSlider("Volume", value: .constant(40))))).pixels)
  }
}

// MARK: - Changes by the person (SLD-2, SLD-3, SLD-4, SLD-16, SLD-20)

@MainActor
@Suite("TanreiSlider editing", .serialized)
struct TanreiSliderEditingTests {
  fileprivate static func editor(_ held: Held, range: Bool = false, step: Double = 0, isEnabled: Bool = true, bounds: ClosedRange<Double> = 0...100) -> TanreiSliderEditor {
    let binding: TanreiSliderValueBinding =
      range
      ? .range(held.rangeBinding, onCommit: { held.commitRange($0) }) : .single(held.binding, onCommit: { held.commit($0) })
    let raw = binding.raw
    return TanreiSliderEditor(
      value: binding,
      model: TanreiSliderModel(
        raw: raw, isRange: range, bounds: bounds, step: step, origin: nil, size: .small, orientation: .horizontal, showsStops: false,
        valueIndicator: .none, label: Text("Volume"), startLabel: Text("Minimum"), valueText: "", startValueText: "", locale: Locale(identifier: "en_US")),
      isEnabled: isEnabled)
  }

  /// SLD-3 — arrows move one keyboard step (Right / Up increase), Page Up / Down ten, Home / End to the handle's lowest and
  /// highest; the keyboard step is step, or a hundredth of the range while step is 0.
  @Test("SLD-3 the keys and the keyboard step")
  func keyRules() {
    func target(_ key: KeyEquivalent, mirrored: Bool = false) -> Double? {
      TanreiSliderRules.keyTarget(key, current: 40, low: 20, high: 90, keyStep: 5, mirrored: mirrored)
    }
    #expect(target(.rightArrow) == 45 && target(.upArrow) == 45 && target(.leftArrow) == 35 && target(.downArrow) == 35)
    #expect(target(.pageUp) == 90 && target(.pageDown) == -10 && target(.home) == 20 && target(.end) == 90)
    #expect(target(.space) == nil && target(.return) == nil)
    // SLD-21: Right and Left swap in a right-to-left horizontal slider; Up and Down do not.
    #expect(target(.rightArrow, mirrored: true) == 35 && target(.leftArrow, mirrored: true) == 45 && target(.upArrow, mirrored: true) == 45)
    #expect(TanreiSliderScale(bounds: 0...100, step: 0).keyStep == 1 && TanreiSliderScale(bounds: -50...50, step: 0).keyStep == 1)
    #expect(TanreiSliderScale(bounds: 0...1, step: 0).keyStep == 0.01 && TanreiSliderScale(bounds: 0...100, step: 10).keyStep == 10)
  }

  /// SLD-3 — each key press that changes the value emits input, then change, once; one that changes nothing, nothing.
  @Test("SLD-3 a key press is one input and one change; a key that changes nothing emits nothing")
  func keys() {
    let held = Held(40)
    #expect(Self.editor(held).key(.rightArrow, on: .end, mirrored: false))
    #expect(held.events == ["input 41.0", "change 41.0"])
    #expect(Self.editor(held, step: 10).key(.pageUp, on: .end, mirrored: false))
    #expect(held.value == 100 && held.commits == [41, 100])
    // At max, End changes nothing: handled, but nothing is emitted.
    #expect(Self.editor(held, step: 10).key(.end, on: .end, mirrored: false))
    #expect(held.commits == [41, 100] && held.inputs == [41, 100])
    #expect(Self.editor(held).key(.home, on: .end, mirrored: false) && held.value == 0)
    // Not a slider key: not handled.
    #expect(!Self.editor(held).key(.tab, on: .end, mirrored: false))
    // SLD-5: a range's start handle stops at the end handle.
    let range = Held(range: 20...60)
    #expect(Self.editor(range, range: true).key(.end, on: .start, mirrored: false))
    #expect(range.range == 60...60 && range.rangeCommits == [60...60])
    #expect(Self.editor(range, range: true).key(.home, on: .end, mirrored: false))
    #expect(range.range == 60...60 && range.rangeCommits.count == 1)
  }

  /// SLD-4 — increment and decrement move one keyboard step: input, then change.
  @Test("SLD-4 assistive technology's increment and decrement")
  func adjust() {
    let held = Held(40)
    Self.editor(held).adjust(.end, .increment)
    Self.editor(held).adjust(.end, .decrement)
    Self.editor(held).adjust(.end, .decrement)
    #expect(held.events == ["input 41.0", "change 41.0", "input 40.0", "change 40.0", "input 39.0", "change 39.0"])
    #expect(TanreiSliderRules.adjustTarget(.increment, current: 30, keyStep: 10) == 40)
    // At the end of the scale, nothing.
    let top = Held(100)
    Self.editor(top).adjust(.end, .increment)
    #expect(top.events.isEmpty)
    // A discrete slider moves a step.
    let discrete = Held(30)
    Self.editor(discrete, step: 10).adjust(.end, .increment)
    #expect(discrete.commits == [40])
  }

  /// SLD-20 — disabled: no value changes, no input, no change; SLD-22 — nor while max is not greater than min.
  @Test("SLD-20 SLD-22 disabled, or with max not above min: nothing changes")
  func disabled() {
    let held = Held(40)
    #expect(!Self.editor(held, isEnabled: false).key(.rightArrow, on: .end, mirrored: false))
    Self.editor(held, isEnabled: false).adjust(.end, .increment)
    #expect(Self.editor(held, isEnabled: false).move(.end, to: 90) == nil)
    let (_, _) = Reports.collecting {
      Self.editor(held, bounds: 40...40).adjust(.end, .increment)
    }
    #expect(held.events.isEmpty && held.value == 40)
  }

  /// SLD-2 — the end of a press emits change once, only when the values moved.
  @Test("SLD-2 a press ends with one change, only when the value moved")
  func finish() {
    let held = Held(40)
    Self.editor(held).finish(from: TanreiSliderValues(start: 0, end: 40))
    #expect(held.commits.isEmpty)
    Self.editor(held).finish(from: TanreiSliderValues(start: 0, end: 10))
    #expect(held.commits == [40])
  }

  /// A press, event by event, through the rules the view's gesture drives (SwiftUI's gestures on macOS take no
  /// synthesized mouse events, so the events are handed in).
  private struct Press {
    let held: Held
    var range = false
    var step: Double = 0
    var isEnabled = true
    let isTouch: Bool
    var gesture: TanreiSliderGesture?
    let geometry = TanreiSliderGeometry(size: CGSize(width: stageLength, height: 48), vertical: false, mirrored: false, containerSize: 32, trackThickness: 4)
    var start = CGPoint.zero

    init(_ held: Held, range: Bool = false, step: Double = 0, isEnabled: Bool = true, isTouch: Bool) {
      self.held = held
      self.range = range
      self.step = step
      self.isEnabled = isEnabled
      self.isTouch = isTouch
    }

    func point(_ fraction: Double, across: CGFloat = 0) -> CGPoint {
      CGPoint(x: geometry.along(fraction), y: geometry.middle + across)
    }

    @MainActor
    mutating func down(_ fraction: Double, across: CGFloat = 0) -> TanreiSliderHandle? {
      start = point(fraction, across: across)
      return move(to: start)
    }

    @MainActor
    @discardableResult
    mutating func move(to location: CGPoint) -> TanreiSliderHandle? {
      let held = self.held, range = self.range, step = self.step, isEnabled = self.isEnabled
      return TanreiSliderPressRules.changed(
        &gesture, start: start, location: location, geometry: geometry, isTouch: isTouch,
        editor: { TanreiSliderEditingTests.editor(held, range: range, step: step, isEnabled: isEnabled) })
    }

    @MainActor
    mutating func up() {
      let held = self.held, range = self.range, step = self.step, isEnabled = self.isEnabled
      TanreiSliderPressRules.ended(&gesture, geometry: geometry, editor: { TanreiSliderEditingTests.editor(held, range: range, step: step, isEnabled: isEnabled) })
    }
  }

  /// SLD-2 — a pointer's press moves the handle to the value under it at once: one input, then one change at its end.
  @Test("SLD-2 a click moves the handle to the value under it: input, then change")
  func click() {
    let held = Held(40)
    var press = Press(held, isTouch: false)
    #expect(press.down(0.8) == .end)
    #expect(held.inputs == [80] && held.commits.isEmpty)
    press.up()
    #expect(held.events == ["input 80.0", "change 80.0"] && press.gesture == nil)
    // A click on the handle itself changes nothing and emits nothing more.
    _ = press.down(0.8)
    press.up()
    #expect(held.events.count == 2)
  }

  /// SLD-2 — a drag makes the handle follow: an input per change of value, then one change when the press ends; SLD-1 —
  /// snapped to the step and clamped to the scale.
  @Test("SLD-2 SLD-1 a drag follows the press, snapped and clamped, and ends with one change")
  func drag() {
    let held = Held(30)
    var press = Press(held, step: 10, isTouch: false)
    _ = press.down(0.3)
    for fraction in [0.34, 0.42, 0.58, 0.9, 1.3] {
      press.move(to: press.point(fraction))
      #expect(press.gesture?.isDragging == true)
    }
    #expect(held.commits.isEmpty)
    press.up()
    #expect(held.inputs == [40, 60, 90, 100], "\(held.inputs)")
    #expect(held.commits == [100])
  }

  /// SLD-2 — on touch the handle moves only once the press has travelled the slop along the track, or when a press that
  /// did not move ends; one that first travels across is left to the scroll view and changes nothing.
  @Test("SLD-2 touch: the slop along the track, a tap, and a scroll that changes nothing")
  func touch() {
    let slop = TanreiSliderInput.touchSlop
    // A tap: nothing moves until it ends; then the handle moves where it was pressed, and one change follows.
    let tapped = Held(40)
    var tap = Press(tapped, isTouch: true)
    #expect(tap.down(0.8) == .end)
    tap.move(to: CGPoint(x: tap.start.x + slop / 2, y: tap.start.y))
    #expect(tapped.events.isEmpty && tap.gesture?.isPressing == true)
    tap.up()
    #expect(tapped.events == ["input 80.0", "change 80.0"])
    // A drag along the track, past the slop.
    let dragged = Held(40)
    var drag = Press(dragged, isTouch: true)
    _ = drag.down(0.4)
    drag.move(to: CGPoint(x: drag.start.x + slop, y: drag.start.y + 2))
    #expect(drag.gesture?.isDragging == true && dragged.inputs.count == 1)
    drag.move(to: drag.point(0.9))
    drag.up()
    #expect(dragged.commits == [90])
    // Across the track first: the scroll view's. Nothing changes, whatever follows.
    let scrolled = Held(40)
    var scroll = Press(scrolled, isTouch: true)
    _ = scroll.down(0.8)
    scroll.move(to: CGPoint(x: scroll.start.x + 2, y: scroll.start.y + slop))
    #expect(scroll.gesture?.isAbandoned == true && scroll.gesture?.isPressing == false)
    scroll.move(to: scroll.point(0.1))
    scroll.up()
    #expect(scrolled.events.isEmpty)
  }

  /// SLD-2, SLD-5 — in a range the press moves the nearer handle, and a drag stops it at the other.
  @Test("SLD-2 SLD-5 a range: the nearer handle moves, and never past the other")
  func rangeDrag() {
    let held = Held(range: 20...60)
    var click = Press(held, range: true, isTouch: false)
    #expect(click.down(0.3) == .start)
    click.up()
    #expect(held.range == 30...60)
    var press = Press(held, range: true, isTouch: false)
    #expect(press.down(0.3) == .start)
    press.move(to: press.point(0.95))
    press.up()
    #expect(held.range == 60...60, "\(held.range)")
    #expect(held.rangeCommits == [30...60, 60...60])
    // Met at 60: a press above moves the end handle up, one below the start handle down.
    var above = Press(held, range: true, isTouch: false)
    #expect(above.down(0.8) == .end)
    above.up()
    var below = Press(held, range: true, isTouch: false)
    #expect(below.down(0.1) == .start)
    below.up()
    #expect(held.range == 10...80)
  }

  /// SLD-7 — the whole slider is the hit area: a press beside the track, inside the slider, reads the value under it
  /// along the axis.
  @Test("SLD-7 a press beside the track moves the handle as one on it")
  func wholeSliderIsTheHitArea() {
    let held = Held(40)
    var press = Press(held, isTouch: false)
    _ = press.down(0.9, across: -20)
    press.up()
    #expect(held.commits == [90])
    // Beyond the ends of the travel: clamped to min and max.
    var past = Press(held, isTouch: false)
    _ = past.down(0)
    past.move(to: CGPoint(x: -30, y: 0))
    past.up()
    #expect(held.value == 0)
  }

  /// SLD-20 — a disabled slider takes no press; SLD-22 — nor one whose max is not above its min.
  @Test("SLD-20 a disabled slider takes no press")
  func disabledPress() {
    let held = Held(40)
    var press = Press(held, isEnabled: false, isTouch: false)
    #expect(press.down(0.8) == nil)
    press.move(to: press.point(0.9))
    press.up()
    #expect(held.events.isEmpty && press.gesture == nil)
  }

  #if os(macOS)
  private func hosted(_ view: some View, system: TanreiSystem = .tanrei) -> HostedView<some View> {
    HostedView(view.frame(width: stageLength).padding(Snapshot.inset).background(system.colors.light[.surface]).tanreiTheme(theme(system)))
  }

  /// SLD-16 — a value the product sets is drawn without input or change.
  @Test("SLD-16 a value the product sets emits neither input nor change")
  func productSetsValue() async throws {
    struct Owner: View {
      @State var value = 40.0
      let changes: @MainActor (Double) -> Void
      var body: some View {
        VStack {
          TanreiSlider("Volume", value: Binding(get: { value }, set: { value = $0; changes($0) }), onCommit: changes)
          Button("Set") { value = 80 }
        }
      }
    }
    var emitted: [Double] = []
    let view = hosted(Owner(changes: { emitted.append($0) }))
    let before = try #require(view.color(at: CGPoint(x: at(0.8) - Snapshot.inset + Snapshot.inset, y: Snapshot.inset + 16)))
    view.click(at: CGPoint(x: view.size.width / 2, y: view.size.height - Snapshot.inset - 4))
    #expect(await view.wait(atMost: 3) { view.color(at: CGPoint(x: at(0.8), y: Snapshot.inset + 16)) != before })
    #expect(emitted.isEmpty)
  }

  /// SLD-11 — a fine pointer over the slider hovers the handle a press there would move: its state layer shows.
  @Test("SLD-11 the pointer hovers the handle a press would move")
  func hover() async throws {
    var system = TanreiSystem.tanrei
    system.slider.conditions.standard.hovered.containerColor = .role(.error)
    system.slider.motionStateDuration = 0
    let view = hosted(TanreiSlider("Maximum price", startLabel: "Minimum price", value: .constant(20...60)), system: system)
    let y = view.size.height / 2
    // A point of the start handle's state layer, beyond the handle and off the track.
    let startLayer = CGPoint(x: at(0.2), y: y - 13)
    let endLayer = CGPoint(x: at(0.6), y: y - 13)
    view.hover(at: CGPoint(x: at(0.25), y: y))
    let error = system.colors.light[.error].rgba8()
    #expect(await view.wait(atMost: 3) { view.color(at: startLayer)?.isClose(to: error) == true })
    #expect(view.color(at: endLayer)?.isClose(to: error) == false)
    view.hover(at: CGPoint(x: at(0.7), y: y))
    #expect(await view.wait(atMost: 3) { view.color(at: endLayer)?.isClose(to: error) == true })
    #expect(view.color(at: startLayer)?.isClose(to: error) == false)
    view.leave()
    #expect(await view.wait(atMost: 3) { view.color(at: endLayer)?.isClose(to: error) == false })
  }

  #endif
}

// MARK: - Token bindings (SLD-7 … SLD-11, SLD-14, SLD-20)

@MainActor
@Suite("TanreiSlider token bindings")
struct TanreiSliderTokenBindingTests {
  private let system = TanreiSystem.tanrei
  private var tokens: TanreiSliderTokens { system.slider }

  private func appearance(
    _ state: TanreiInteraction, beneath: TanreiInteraction = .enabled, feedback: TanreiPressedFeedback = .overlay, tokens: TanreiSliderTokens? = nil
  ) -> TanreiSliderAppearance {
    TanreiSliderAppearance(tokens: tokens ?? self.tokens, size: .small, states: [.end: TanreiSliderHandleState(state: state, beneath: beneath)], feedback: feedback)
  }

  /// SLD-8 / SLD-9 / SLD-10 — at rest: a primary round handle on a surface-variant track, a primary active track, the dots
  /// in on-surface-variant (track) and on-primary (active track), and an invisible state layer.
  @Test("SLD-8 SLD-9 SLD-10 at rest the parts bind the expected roles")
  func roles() {
    let rest = appearance(.enabled)
    #expect(rest.track == .role(.surfaceVariant) && rest.activeTrack == .role(.primary))
    #expect(rest.end.handle == .role(.primary) && rest.end.container == .none && rest.end.ripple == nil)
    #expect(rest.stopIndicator == .role(.onSurfaceVariant) && rest.activeStopIndicator == .role(.onPrimary))
    #expect(rest.end.elevation == system.elevation.level0 && rest.opacity == 1)
    #expect(tokens.conditions.standard.enabled.stateLayerColor == rest.end.handle)
  }

  /// SLD-7 / SLD-8 / SLD-10 — the geometry per size: track 4 / 6 / 8, handle 20 round, state layer 32, the slider as
  /// thick as the larger of the two, the track's corners clamped to half its thickness.
  @Test("SLD-7 SLD-8 SLD-10 the geometry binds its tokens, per size")
  func geometry() {
    for (size, thickness) in [(TanreiSliderSize.small, CGFloat(4)), (.medium, 6), (.large, 8)] {
      let drawn = TanreiSliderAppearance(tokens: tokens, size: size, states: [.end: .enabled])
      #expect(drawn.trackThickness == thickness && drawn.trackCornerRadius == thickness / 2, "\(size)")
      #expect(drawn.handleHeight == 20 && drawn.end.width == 20 && drawn.handleCornerRadius(.end) == 10, "\(size)")
      #expect(drawn.containerSize == 32 && drawn.across == 32 && drawn.stopIndicatorSize == 4 && drawn.trackGap == 0, "\(size)")
      #expect(drawn.handleSize(.end, vertical: false) == CGSize(width: 20, height: 20))
    }
    // A bar handle: its width runs along the axis, turned a quarter turn in a vertical slider (SLD-21).
    var bar = tokens
    bar.conditions.standard.enabled.handleWidth = 4
    bar.sizes.small.handleHeight = 44
    let drawn = TanreiSliderAppearance(tokens: bar, size: .small, states: [.end: .enabled])
    #expect(drawn.handleSize(.end, vertical: false) == CGSize(width: 4, height: 44) && drawn.handleSize(.end, vertical: true) == CGSize(width: 44, height: 4))
    #expect(drawn.handleCornerRadius(.end) == 2 && drawn.across == 44)
  }

  /// SLD-11 — hovered, focused and pressed each bind that state's tokens; the tracks from the highest state of any handle.
  @Test("SLD-11 each state binds that state's tokens")
  func stateBindings() {
    let rest = appearance(.enabled)
    let layer = tokens.conditions.standard.enabled.stateLayerColor
    for (state, amount) in [(TanreiInteraction.hovered, system.state.hoverStateLayerOpacity), (.focused, system.state.focusStateLayerOpacity), (.pressed, system.state.pressedStateLayerOpacity)] {
      let drawn = appearance(state)
      #expect(drawn.end.container == .mix(base: rest.end.container, with: layer, amount: amount), "\(state)")
      #expect(drawn.track == rest.track && drawn.end.handle == rest.end.handle && drawn.end.width == rest.end.width && drawn.opacity == 1, "\(state)")
      #expect(drawn.state == state)
    }
  }

  /// SLD-11 (verify) — under acme the three states differ, so precedence shows: pressed over focused over hovered, per
  /// handle; the tracks from the highest state of either handle.
  @Test("SLD-11 under acme: precedence per handle, the tracks from the highest")
  func precedence() {
    let acme = TanreiSystem.acme.slider
    let containers = [TanreiInteraction.hovered, .focused, .pressed].map { TanreiSliderAppearance(tokens: acme, size: .small, states: [.end: TanreiSliderHandleState(state: $0, beneath: .enabled)]).end.container }
    #expect(Set(containers.map { "\($0)" }).count == 3)
    let resolved = TanreiSliderHandleState.resolve(.end, isEnabled: true, pressed: .end, focused: .end, hovered: .end)
    #expect(resolved.state == .pressed && resolved.beneath == .focused)
    #expect(TanreiSliderHandleState.resolve(.end, isEnabled: true, pressed: nil, focused: .end, hovered: .end).state == .focused)
    #expect(TanreiSliderHandleState.resolve(.start, isEnabled: true, pressed: .end, focused: nil, hovered: .start).state == .hovered)
    #expect(TanreiSliderHandleState.resolve(.end, isEnabled: false, pressed: .end, focused: .end, hovered: nil).state == .disabled)
    // A range: the start handle focused, the end hovered — each handle from its own state; the slider focused.
    var marked = acme
    marked.conditions.standard.focused.trackColor = .role(.error)
    let range = TanreiSliderAppearance(
      tokens: marked, size: .small,
      states: [.start: TanreiSliderHandleState(state: .focused, beneath: .focused), .end: TanreiSliderHandleState(state: .hovered, beneath: .hovered)])
    #expect(range.start.container == acme.conditions.standard.focused.containerColor)
    #expect(range.end.container == acme.conditions.standard.hovered.containerColor)
    #expect(range.state == .focused && range.track == .role(.error))
    #expect(TanreiSliderHandleState.highest([.hovered, .pressed, .focused]) == .pressed && TanreiSliderHandleState.highest([.enabled]) == .enabled)
  }

  /// SLD-20 — disabled: every part from the disabled tokens (the track a faint fill, the active track and handle content,
  /// a dot on the active track the surface color), no state layer.
  @Test("SLD-20 disabled bindings")
  func disabled() {
    let drawn = appearance(.disabled, beneath: .disabled)
    let own = tokens.conditions.standard.disabled
    #expect(drawn.track == own.trackColor && drawn.activeTrack == own.activeTrackColor && drawn.end.handle == own.handleColor)
    #expect(drawn.stopIndicator == own.stopIndicatorColor && drawn.activeStopIndicator == .role(.surface))
    #expect(drawn.end.container == .none && drawn.opacity == tokens.disabled.opacity && drawn.state == .disabled)
  }

  /// SLD-8 … SLD-11 — a modified system changes what each state and size resolves to.
  @Test("SLD-8 SLD-11 a modified system changes what the slider binds")
  func modifiedSystem() {
    var changed = tokens
    changed.conditions.standard.pressed.handleColor = .role(.error)
    changed.conditions.standard.pressed.handleWidth = 4
    changed.conditions.standard.hovered.activeTrackColor = .role(.success)
    changed.sizes.large.trackThickness = 16
    changed.pressed.opacity = 0.5
    changed.trackGap = 6
    changed.stopIndicatorSize = 0
    let pressed = appearance(.pressed, tokens: changed)
    #expect(pressed.end.handle == .role(.error) && pressed.end.width == 4 && pressed.opacity == 0.5 && pressed.trackGap == 6 && pressed.cut(.end) == 8)
    #expect(appearance(.hovered, tokens: changed).activeTrack == .role(.success))
    #expect(TanreiSliderAppearance(tokens: changed, size: .large, states: [.end: .enabled]).trackThickness == 16)
    #expect(appearance(.enabled, tokens: changed).stopIndicatorSize == 0)
  }

  /// SLD-14 — overlay applies the pressed tokens at once; ripple grows the pressed container over the one beneath; dim
  /// keeps the container beneath and applies the pressed opacity; none draws the state beneath everywhere.
  @Test("SLD-14 each pressed-feedback choice binds the pressed tokens its own way", arguments: TanreiPressedFeedback.allCases)
  func feedback(_ feedback: TanreiPressedFeedback) {
    var marked = tokens
    marked.conditions.standard.pressed.containerColor = .role(.error)
    marked.conditions.standard.pressed.trackColor = .role(.success)
    marked.conditions.standard.focused.containerColor = .role(.secondary)
    marked.pressed.opacity = 0.7
    let drawn = appearance(.pressed, beneath: .focused, feedback: feedback, tokens: marked)
    switch feedback {
    case .overlay:
      #expect(drawn.end.container == .role(.error) && drawn.end.ripple == nil && drawn.track == .role(.success) && drawn.opacity == 0.7)
    case .ripple:
      #expect(drawn.end.container == .role(.secondary) && drawn.end.ripple == .role(.error) && drawn.track == .role(.success) && drawn.opacity == 0.7)
    case .dim:
      #expect(drawn.end.container == .role(.secondary) && drawn.end.ripple == nil && drawn.track == .role(.success) && drawn.opacity == 0.7)
    case .none:
      #expect(drawn.end.container == .role(.secondary) && drawn.end.ripple == nil && drawn.track == marked.conditions.standard.focused.trackColor && drawn.opacity == 1)
    }
  }

  /// SLD-14 — the shipped presets: m3-like ripples, cupertino dims (and pins its pressed opacity to 1), the default overlays.
  @Test("SLD-14 the shipped systems' pressed feedback reaches the slider")
  func shipped() {
    #expect(TanreiSystem.m3Like.behavior.pressedFeedback == .ripple)
    let m3 = TanreiSliderAppearance(tokens: TanreiSystem.m3Like.slider, size: .small, states: [.end: TanreiSliderHandleState(state: .pressed, beneath: .enabled)], feedback: .ripple)
    #expect(m3.end.ripple != nil)
    let cupertino = TanreiSliderAppearance(
      tokens: TanreiSystem.cupertino.slider, size: .small, states: [.end: TanreiSliderHandleState(state: .pressed, beneath: .enabled)],
      feedback: TanreiSystem.cupertino.behavior.pressedFeedback)
    #expect(cupertino.opacity == 1 && cupertino.end.ripple == nil)
  }

  /// SLD-11, SLD-14, SLD-16, SLD-17 — the motions come from the tokens; none under Reduce Motion.
  @Test("SLD-11 SLD-14 SLD-16 SLD-17 the motions come from the tokens; none under Reduce Motion")
  func motions() {
    var changed = tokens
    changed.motionStateDuration = 300
    changed.motionValueDuration = 700
    changed.motionFeedbackDuration = 900
    changed.motionStateEasing = TanreiCubicBezier(0, 0, 1, 1)
    changed.motionValueEasing = TanreiCubicBezier(0.1, 0.2, 0.3, 0.4)
    #expect(changed.stateMotion(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.3))
    #expect(changed.valueMotion(reduceMotion: false) == Animation.timingCurve(0.1, 0.2, 0.3, 0.4, duration: 0.7))
    #expect(changed.rippleGrowth(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.9))
    #expect(changed.stateMotion(reduceMotion: true) == nil && changed.valueMotion(reduceMotion: true) == nil && changed.rippleGrowth(reduceMotion: true) == nil)
  }
}

// MARK: - Geometry (SLD-6, SLD-7, SLD-9, SLD-21)

@MainActor
@Suite("TanreiSlider geometry")
struct TanreiSliderGeometryTests {
  private let appearance = TanreiSliderAppearance(tokens: TanreiSystem.tanrei.slider, size: .small, states: [.end: .enabled])

  private func geometry(vertical: Bool = false, mirrored: Bool = false) -> TanreiSliderGeometry {
    TanreiSliderGeometry(
      size: vertical ? CGSize(width: 32, height: 240) : CGSize(width: 320, height: 32), vertical: vertical, mirrored: mirrored, containerSize: 32,
      trackThickness: 4)
  }

  /// SLD-7 — the travel is inset by half the state layer and half the track from each end; SLD-21 — a vertical slider runs
  /// from the bottom, a mirrored horizontal one from the right.
  @Test("SLD-7 SLD-21 the travel and the direction of each orientation")
  func travel() {
    let flat = geometry()
    #expect(flat.inset == 18 && flat.travel == 284 && flat.point(0) == CGPoint(x: 18, y: 16) && flat.point(1) == CGPoint(x: 302, y: 16))
    #expect(flat.fraction(at: CGPoint(x: 160, y: 0)) == 0.5 && flat.fraction(at: CGPoint(x: -40, y: 0)) == 0 && flat.fraction(at: CGPoint(x: 900, y: 0)) == 1)
    let mirrored = geometry(mirrored: true)
    #expect(mirrored.point(0) == CGPoint(x: 302, y: 16) && mirrored.fraction(at: CGPoint(x: 302, y: 0)) == 0)
    let vertical = geometry(vertical: true)
    #expect(vertical.point(0) == CGPoint(x: 16, y: 222) && vertical.point(1) == CGPoint(x: 16, y: 18))
    // A vertical slider is never mirrored.
    #expect(geometry(vertical: true, mirrored: true) == vertical)
  }

  /// SLD-6 / SLD-8 — the pieces: track, active track, track; the active track from the origin to the value, cut at the
  /// handle's edge (no gap here: square there), rounded at the track's ends and square at an origin inside the travel.
  @Test("SLD-6 SLD-8 the pieces of the tracks")
  func pieces() {
    let g = geometry()
    let single = TanreiSliderPiece.pieces(model: model(value: 50), appearance: appearance, geometry: g)
    #expect(single.map(\.isActive) == [false, true, false])
    #expect(single[1].from == 16 && single[1].fromRadius == 2 && single[1].to == 160 - 10 && single[1].toRadius == 0)
    #expect(single[2].from == 170 && single[2].to == 304 && single[2].toRadius == 2)
    #expect(single[0].to <= single[0].from)
    // Centered, the value below the origin: the active track from the value up to the origin, square there.
    let centered = TanreiSliderPiece.pieces(model: model(value: -30, bounds: -50...50, origin: 0), appearance: appearance, geometry: g)
    #expect(centered[1].isActive && centered[1].to == 160 && centered[1].toRadius == 0 && centered[1].from == g.along(0.2) + 10)
    #expect(centered[2].from == 160 && centered[2].to == 304)
    // A range: the active track between the two handles.
    let range = TanreiSliderPiece.pieces(model: model(value: 60, start: 20, range: true), appearance: appearance, geometry: g)
    #expect(range[0].to == g.along(0.2) - 10 && range[1].from == g.along(0.2) + 10 && range[1].to == g.along(0.6) - 10 && range[2].from == g.along(0.6) + 10)
    // With a gap, the ends beside a handle are rounded too.
    var gapped = TanreiSystem.tanrei.slider
    gapped.trackGap = 6
    let withGap = TanreiSliderPiece.pieces(
      model: model(value: 50), appearance: TanreiSliderAppearance(tokens: gapped, size: .small, states: [.end: .enabled]), geometry: g)
    #expect(withGap[1].to == 160 - 16 && withGap[1].toRadius == 2 && withGap[2].fromRadius == 2)
  }

  /// SLD-9 — the dots: at the ends of the travel on the track, and with stops at every value, on whichever piece they lie;
  /// none while step is 0 or the size is 0.
  @Test("SLD-9 the stop dots")
  func dots() {
    #expect(model().dots.track == [0, 1] && model().dots.active.isEmpty)
    #expect(model(stops: true).dots.active.isEmpty)
    let stepped = model(value: 30, step: 10, stops: true).dots
    #expect(stepped.active.count == 11 && stepped.track.count == 11 && stepped.active.first == 0 && stepped.active.last == 1)
    var none = TanreiSystem.tanrei.slider
    none.stopIndicatorSize = 0
    let pieces = TanreiSliderPiece.pieces(
      model: model(value: 30, step: 10, stops: true), appearance: TanreiSliderAppearance(tokens: none, size: .small, states: [.end: .enabled]), geometry: geometry())
    #expect(pieces.allSatisfy { $0.dots.isEmpty })
  }

  /// SLD-8 — a piece's outline: rounded ends clamped to half the thickness; a piece shorter than its ends keeps them in
  /// proportion; an empty piece draws nothing.
  @Test("SLD-8 a piece's outline")
  func pieceShape() {
    let g = geometry()
    let piece = TanreiSliderPiece(from: 16, fromRadius: 2, to: 150, toRadius: 0, isActive: true, dots: [])
    let path = TanreiSliderPieceShape(piece, geometry: g, thickness: 4, style: .continuous).path(in: .zero)
    #expect(path.boundingRect == CGRect(x: 16, y: 14, width: 134, height: 4))
    #expect(!path.contains(CGPoint(x: 16.2, y: 14.2)) && path.contains(CGPoint(x: 149.8, y: 14.2)))
    let empty = TanreiSliderPiece(from: 30, fromRadius: 2, to: 20, toRadius: 0, isActive: false, dots: [])
    #expect(TanreiSliderPieceShape(empty, geometry: g, thickness: 4, style: .continuous).path(in: .zero).isEmpty)
    // Mirrored: the from end is at the right.
    let mirrored = TanreiSliderPieceShape(piece, geometry: geometry(mirrored: true), thickness: 4, style: .continuous).path(in: .zero)
    #expect(mirrored.boundingRect == CGRect(x: 320 - 150, y: 14, width: 134, height: 4))
    #expect(!mirrored.contains(CGPoint(x: 303.8, y: 14.2)) && mirrored.contains(CGPoint(x: 170.2, y: 14.2)))
  }
}

// MARK: - Rendered (SLD-7 … SLD-17, SLD-19, SLD-21)

@MainActor
@Suite("TanreiSlider rendered")
struct TanreiSliderRenderedTests {
  /// SLD-7 — as long as the layout gives it and, across, as thick as the larger of the state layer and the handle.
  @Test("SLD-7 the slider's size")
  func size() throws {
    let bitmap = try Snapshot.render(TanreiSlider("Volume", value: .constant(40)).frame(width: 200))
    #expect(CGFloat(bitmap.width) == (200 + 2 * Snapshot.inset) * Snapshot.scale)
    #expect(CGFloat(bitmap.height) == (32 + 2 * Snapshot.inset) * Snapshot.scale)
    let vertical = try Snapshot.render(TanreiSlider("Volume", value: .constant(40), orientation: .vertical).frame(height: 150))
    #expect(CGFloat(vertical.width) == (32 + 2 * Snapshot.inset) * Snapshot.scale && CGFloat(vertical.height) == (150 + 2 * Snapshot.inset) * Snapshot.scale)
    var tall = TanreiSystem.tanrei
    tall.slider.sizes.small.handleHeight = 44
    let bar = try Snapshot.render(TanreiSlider("Volume", value: .constant(40)).frame(width: 200), theme: theme(tall))
    #expect(CGFloat(bar.height) == (44 + 2 * Snapshot.inset) * Snapshot.scale)
  }

  /// SLD-8 / SLD-9 — the active track, the track, the handle and the dot at the end of the travel, in their colors.
  @Test("SLD-8 SLD-9 the tracks, the handle and the end dot in their colors")
  func colors() throws {
    let bitmap = try Snapshot.render(stage(TanreiSlider("Volume", value: .constant(40))))
    #expect(pixel(bitmap, x: at(0.2), y: midline).isClose(to: light[.primary].rgba8()))
    #expect(pixel(bitmap, x: at(0.7), y: midline).isClose(to: light[.surfaceVariant].rgba8()))
    #expect(pixel(bitmap, x: at(0.4), y: midline - 8).isClose(to: light[.primary].rgba8()))
    #expect(pixel(bitmap, x: at(1), y: midline).isClose(to: light[.onSurfaceVariant].rgba8()))
    // Off the track: the page.
    #expect(pixel(bitmap, x: at(0.7), y: midline - 6).isClose(to: light[.surface].rgba8()))
    // At min the dot lies on the active track (where the track would be): not drawn.
    #expect(pixel(bitmap, x: at(0), y: midline).isClose(to: light[.primary].rgba8()))
  }

  /// SLD-9 — with stops, a dot at every value: on the active track in its color, on the track in its own; none under the
  /// handle; none at all at a size of 0.
  @Test("SLD-9 stop dots on the track and on the active track")
  func stops() throws {
    let view = stage(TanreiSlider("Brightness", value: .constant(30), step: 10, showsStops: true))
    let bitmap = try Snapshot.render(view)
    #expect(pixel(bitmap, x: at(0.1), y: midline).isClose(to: light[.onPrimary].rgba8()))
    #expect(pixel(bitmap, x: at(0.7), y: midline).isClose(to: light[.onSurfaceVariant].rgba8()))
    #expect(pixel(bitmap, x: at(0.3), y: midline).isClose(to: light[.primary].rgba8()))
    var none = TanreiSystem.tanrei
    none.slider.stopIndicatorSize = 0
    let hidden = try Snapshot.render(view, theme: theme(none))
    #expect(pixel(hidden, x: at(0.7), y: midline).isClose(to: light[.surfaceVariant].rgba8()))
    #expect(pixel(hidden, x: at(0.1), y: midline).isClose(to: light[.primary].rgba8()))
  }

  /// SLD-6 — a centered slider's active track from the origin to the value, on either side.
  @Test("SLD-6 the active track runs from the origin")
  func origin() throws {
    let above = try Snapshot.render(stage(TanreiSlider("Balance", value: .constant(20), in: -50...50, origin: 0)))
    #expect(pixel(above, x: at(0.6), y: midline).isClose(to: light[.primary].rgba8()))
    #expect(pixel(above, x: at(0.4), y: midline).isClose(to: light[.surfaceVariant].rgba8()))
    let below = try Snapshot.render(stage(TanreiSlider("Balance", value: .constant(-20), in: -50...50, origin: 0)))
    #expect(pixel(below, x: at(0.4), y: midline).isClose(to: light[.primary].rgba8()))
    #expect(pixel(below, x: at(0.6), y: midline).isClose(to: light[.surfaceVariant].rgba8()))
    // Both ends of the travel lie on the track: both show their dots.
    #expect(pixel(above, x: at(0), y: midline).isClose(to: light[.onSurfaceVariant].rgba8()))
    #expect(pixel(above, x: at(1), y: midline).isClose(to: light[.onSurfaceVariant].rgba8()))
  }

  /// SLD-10 — the round state layer is centered on the handle and shows the handle's state; a size of 0 draws none.
  @Test("SLD-10 the state layer on the handle")
  func stateLayer() throws {
    var system = TanreiSystem.tanrei
    system.slider.conditions.standard.hovered.containerColor = .role(.error)
    let hovered = try Snapshot.render(chrome(model(), hovered: .end), theme: theme(system))
    let error = system.colors.light[.error].rgba8()
    // Beyond the handle (radius 10), inside the layer (radius 16), off the track.
    #expect(pixel(hovered, x: at(0.4), y: midline - 13).isClose(to: error))
    #expect(pixel(hovered, x: at(0.4) - 13, y: midline - 3).isClose(to: error))
    system.slider.containerSize = 0
    let none = try Snapshot.render(chrome(model(), hovered: .end), theme: theme(system))
    #expect(pixel(none, x: at(0.4, system: system), y: midline - 13).isClose(to: light[.surface].rgba8()))
  }

  /// SLD-12 — the focus ring around the handle with keyboard focus, and nowhere without it; SLD-17 — `active` shows the
  /// value indicator while the handle has keyboard focus.
  @Test("SLD-12 SLD-17 keyboard focus shows the ring, and an active value indicator")
  func focus() throws {
    let measure = TanreiSystem.tanrei.measure
    let reach = 10 + measure.focusOffset + measure.focusInnerWidth + measure.focusOuterWidth / 2
    let focused = try Snapshot.render(chrome(model(indicator: .active), focused: .end))
    let plain = try Snapshot.render(chrome(model(indicator: .active)))
    let ring = CGPoint(x: at(0.4), y: midline + reach)
    #expect(pixel(focused, x: ring.x, y: ring.y).isClose(to: light[.focusRing].rgba8()))
    #expect(!pixel(plain, x: ring.x, y: ring.y).isClose(to: light[.focusRing].rgba8()))
    // The value indicator above the handle: its container is inverse-surface.
    let tokens = TanreiSystem.tanrei.slider
    let indicator = CGPoint(x: at(0.4) - 8, y: midline - 10 - tokens.valueIndicatorOffset - 3)
    #expect(pixel(focused, x: indicator.x, y: indicator.y).isClose(to: light[.inverseSurface].rgba8()))
    #expect(pixel(plain, x: indicator.x, y: indicator.y).isClose(to: light[.surface].rgba8()))
  }

  /// SLD-15 — the corner smoothing eases the handle and the track corners; the focus style draws a ring or a glow.
  @Test("SLD-15 corner smoothing and focus style reach the slider")
  func cornersAndFocusStyle() throws {
    func render(_ amount: Double, style: TanreiFocusStyle = .ring) throws -> Bitmap {
      var system = TanreiSystem.tanrei
      system.shape.cornerSmoothing = amount
      system.behavior.focusStyle = style
      // Corners that are not a pill, so the smoothing has a straight edge to ease into.
      system.slider.handleShape = 6
      system.slider.sizes.large.trackShape = 3
      return try Snapshot.renderExact(chrome(model(size: .large), focused: .end), theme: theme(system))
    }
    #expect(try render(0).pixels != render(0.6).pixels)
    #expect(try render(0).pixels != render(0, style: .glow).pixels)
  }

  /// SLD-17 — `always` draws the value above the handle, shifted to stay inside the slider at the ends; `none` draws none;
  /// a disabled slider shows none.
  @Test("SLD-17 the value indicator: above the handle, inside the slider, never while disabled")
  func valueIndicator() throws {
    let tokens = TanreiSystem.tanrei.slider
    let above = midline - 10 - tokens.valueIndicatorOffset - 3
    let shown = try Snapshot.render(stage(TanreiSlider("Volume", value: .constant(40), valueIndicator: .always)))
    #expect(pixel(shown, x: at(0.4) - 8, y: above).isClose(to: light[.inverseSurface].rgba8()))
    let none = try Snapshot.render(stage(TanreiSlider("Volume", value: .constant(40))))
    #expect(pixel(none, x: at(0.4) - 8, y: above).isClose(to: light[.surface].rgba8()))
    let disabled = try Snapshot.render(stage(TanreiSlider("Volume", value: .constant(40), valueIndicator: .always).disabled(true)))
    #expect(pixel(disabled, x: at(0.4) - 8, y: above).isClose(to: light[.surface].rgba8()))
    // At min a wide indicator is shifted inward: nothing of it lies before the slider's start.
    let wide = try Snapshot.render(stage(TanreiSlider("Volume", value: .constant(0), valueIndicator: .always, valueText: "Very quiet indeed")))
    #expect(pixel(wide, x: Snapshot.inset + 2, y: above).isClose(to: light[.inverseSurface].rgba8()))
    #expect(pixel(wide, x: Snapshot.inset - 2, y: above).isClose(to: light[.surface].rgba8()))
    // A vertical slider's indicator lies at the handle's inline start.
    let vertical = try Snapshot.render(stage(TanreiSlider("Volume", value: .constant(50), orientation: .vertical, valueIndicator: .always), vertical: true))
    let y = Snapshot.inset + verticalLength / 2
    #expect(pixel(vertical, x: Snapshot.inset + stageAcross / 2 - 10 - tokens.valueIndicatorOffset - 3, y: y).isClose(to: light[.inverseSurface].rgba8()))
  }

  /// SLD-20 — disabled renders from the disabled tokens.
  @Test("SLD-20 disabled renders from the disabled tokens")
  func disabledRender() throws {
    var system = TanreiSystem.tanrei
    system.slider.conditions.standard.disabled.activeTrackColor = .role(.error)
    system.slider.conditions.standard.disabled.trackColor = .role(.success)
    let bitmap = try Snapshot.render(stage(TanreiSlider("Volume", value: .constant(40)).disabled(true)), theme: theme(system))
    #expect(pixel(bitmap, x: at(0.2), y: midline).isClose(to: system.colors.light[.error].rgba8()))
    #expect(pixel(bitmap, x: at(0.7), y: midline).isClose(to: system.colors.light[.success].rgba8()))
  }

  /// SLD-21 — a vertical slider runs from the bottom; right to left mirrors a horizontal slider and not a vertical one.
  @Test("SLD-21 vertical runs from the bottom; right to left mirrors only a horizontal slider")
  func directions() throws {
    let vertical = try Snapshot.render(stage(TanreiSlider("Volume", value: .constant(20), orientation: .vertical), vertical: true))
    let x = Snapshot.inset + stageAcross / 2
    func y(_ fraction: Double) -> CGFloat { Snapshot.inset + verticalLength - 18 - CGFloat(fraction) * (verticalLength - 36) }
    #expect(pixel(vertical, x: x, y: y(0.1)).isClose(to: light[.primary].rgba8()))
    #expect(pixel(vertical, x: x, y: y(0.6)).isClose(to: light[.surfaceVariant].rgba8()))
    let rtl = try Snapshot.render(stage(TanreiSlider("Volume", value: .constant(20))).environment(\.layoutDirection, .rightToLeft))
    // Mirrored: the active track from the right.
    #expect(pixel(rtl, x: at(0.9), y: midline).isClose(to: light[.primary].rgba8()))
    #expect(pixel(rtl, x: at(0.3), y: midline).isClose(to: light[.surfaceVariant].rgba8()))
    let verticalRTL = try Snapshot.renderExact(
      stage(TanreiSlider("Volume", value: .constant(20), orientation: .vertical), vertical: true).environment(\.layoutDirection, .rightToLeft))
    let verticalLTR = try Snapshot.renderExact(stage(TanreiSlider("Volume", value: .constant(20), orientation: .vertical), vertical: true))
    #expect(verticalRTL.pixels == verticalLTR.pixels)
  }

  /// SLD-19 — the tracks, dots, state layer and indicator are drawing, not elements: the slider draws the same with
  /// labels or without (the labels are never drawn).
  @Test("SLD-19 labels are never drawn")
  func labelsNotDrawn() throws {
    let named = try Snapshot.renderExact(stage(TanreiSlider("Volume", value: .constant(40), valueText: "Forty")))
    let (unnamed, _) = try Reports.collecting { try Snapshot.renderExact(stage(TanreiSlider("", value: .constant(40)))) }
    #expect(named.pixels == unnamed.pixels)
  }

  /// Dynamic Type does not change the slider (the spec's accessibility notes). (The value indicator's text grows with it,
  /// through `tanreiTextStyle`; macOS has no Dynamic Type to show it.)
  @Test("the slider does not grow with Dynamic Type")
  func dynamicType() throws {
    func render(_ size: DynamicTypeSize) throws -> Bitmap {
      try Snapshot.renderExact(stage(TanreiSlider("Volume", value: .constant(40))).environment(\.dynamicTypeSize, size))
    }
    #expect(try render(.large).pixels == render(.accessibility3).pixels)
  }

  /// SLD-13 / SLD-14 — while pressed, the handle the press moves and its state layer take the pressed tokens (overlay),
  /// and so do the tracks; the other handle of a range keeps its own state.
  @Test("SLD-13 SLD-14 the pressed handle and the tracks draw the pressed tokens")
  func pressed() throws {
    var system = TanreiSystem.tanrei
    system.slider.conditions.standard.pressed.containerColor = .role(.error)
    system.slider.conditions.standard.pressed.trackColor = .role(.success)
    let colors = system.colors.light
    let bitmap = try Snapshot.render(chrome(model(value: 60, start: 20, range: true), pressed: .end), theme: theme(system))
    #expect(pixel(bitmap, x: at(0.6), y: midline - 13).isClose(to: colors[.error].rgba8()))
    #expect(pixel(bitmap, x: at(0.2), y: midline - 13).isClose(to: colors[.surface].rgba8()))
    #expect(pixel(bitmap, x: at(0.9), y: midline).isClose(to: colors[.success].rgba8()))
    // Under ripple a render that never saw the press begin shows the ripple grown: the pressed color on the layer.
    system.behavior.pressedFeedback = .ripple
    let ripple = try Snapshot.render(chrome(model(), pressed: .end), theme: theme(system))
    #expect(pixel(ripple, x: at(0.4), y: midline - 13).isClose(to: colors[.error].rgba8()))
  }
}

// MARK: - Presets

@MainActor
@Suite("TanreiSlider under the shipped presets")
struct TanreiSliderPresetTests {
  /// The presets' values, read from the instances: cupertino's white 28 thumb on its own level2 shadow at every size, no
  /// stop dots, a surface-container-highest track; m3-like draws the default's slider.
  @Test("SLD-8 SLD-9 the presets' own values reach the slider")
  func presetValues() throws {
    let cupertino = TanreiSystem.cupertino.slider
    #expect(cupertino.sizes.small.handleHeight == 28 && cupertino.sizes.large.handleHeight == 28 && cupertino.conditions.standard.enabled.handleWidth == 28)
    #expect(cupertino.stopIndicatorSize == 0 && !cupertino.conditions.standard.enabled.handleElevation.isEmpty)
    #expect(cupertino.conditions.standard.enabled.trackColor == .role(.surfaceContainerHighest) && cupertino.pressed.opacity == 1)
    for shipped in ShippedSystem.allCases {
      let bitmap = try Snapshot.render(TanreiSlider("Volume", value: .constant(40)).frame(width: 200), theme: theme(shipped.system))
      let slider = shipped.system.slider
      #expect(CGFloat(bitmap.height) == (max(slider.containerSize, slider.sizes.small.handleHeight) + 2 * Snapshot.inset) * Snapshot.scale, "\(shipped.rawValue)")
    }
  }
}

// MARK: - Snapshots (one per spec fixture)

@MainActor
@Suite("TanreiSlider snapshots")
struct TanreiSliderSnapshotTests {
  struct Fixture: Sendable, CustomTestStringConvertible {
    let id: String
    var value: Double = 40
    var startValue: Double? = nil
    var bounds: ClosedRange<Double> = 0...100
    var step: Double = 0
    var origin: Double? = nil
    var stops = false
    var size = "small"
    var vertical = false
    var indicator = "none"
    var disabled = false
    var label = "Volume"
    var startLabel = ""
    var testDescription: String { id }
  }

  /// Mirrors `fixtures` in specs/slider.spec.json.
  nonisolated static let fixtures: [Fixture] = [
    Fixture(id: "continuous"),
    Fixture(id: "discrete-stops", value: 30, step: 10, stops: true, label: "Brightness"),
    Fixture(id: "range", value: 60, startValue: 20, label: "Maximum price", startLabel: "Minimum price"),
    Fixture(id: "centered", value: 20, bounds: -50...50, origin: 0, label: "Balance"),
    Fixture(id: "value-indicator", indicator: "always"),
    Fixture(id: "medium", size: "medium"),
    Fixture(id: "large", size: "large"),
    Fixture(id: "vertical", value: 60, vertical: true),
    Fixture(id: "disabled", disabled: true),
    Fixture(id: "disabled-stops", value: 60, step: 20, stops: true, disabled: true, label: "Brightness"),
  ]

  /// The fixture as a product writes it, in its stage.
  static func view(_ fixture: Fixture) -> some View {
    let size = TanreiSliderSize(rawValue: fixture.size)
    let orientation: TanreiSliderOrientation = fixture.vertical ? .vertical : .horizontal
    let indicator = TanreiSliderValueIndicator(named: fixture.indicator)
    return Group {
      if let start = fixture.startValue {
        TanreiSlider(
          fixture.label, startLabel: fixture.startLabel, value: .constant(start...fixture.value), in: fixture.bounds, step: fixture.step, size: size,
          orientation: orientation, showsStops: fixture.stops, valueIndicator: indicator)
      } else {
        TanreiSlider(
          fixture.label, value: .constant(fixture.value), in: fixture.bounds, step: fixture.step, origin: fixture.origin, size: size,
          orientation: orientation, showsStops: fixture.stops, valueIndicator: indicator)
      }
    }
    .disabled(fixture.disabled)
    .frame(width: fixture.vertical ? nil : stageLength, height: fixture.vertical ? verticalLength : nil)
    .frame(width: fixture.vertical ? stageAcross : stageLength, height: fixture.vertical ? verticalLength : stageAcross)
  }

  @Test("fixture matches its baseline", arguments: fixtures)
  func fixture(_ fixture: Fixture) throws {
    try Snapshot.assert(Self.view(fixture), named: fixture.id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    let spec = try SpecFixture.load(spec: "slider")
    #expect(spec.map(\.id) == Self.fixtures.map(\.id))
    for (theirs, ours) in zip(spec, Self.fixtures) {
      #expect(theirs.number("value") == ours.value, "\(ours.id)")
      #expect(theirs.number("startValue") == ours.startValue, "\(ours.id)")
      #expect((theirs.bool("range") ?? false) == (ours.startValue != nil), "\(ours.id)")
      #expect((theirs.number("min") ?? 0) == ours.bounds.lowerBound && (theirs.number("max") ?? 100) == ours.bounds.upperBound, "\(ours.id)")
      #expect((theirs.number("step") ?? 0) == ours.step && theirs.number("origin") == ours.origin, "\(ours.id)")
      #expect((theirs.bool("stops") ?? false) == ours.stops && (theirs.bool("disabled") ?? false) == ours.disabled, "\(ours.id)")
      #expect((theirs.string("size") ?? "small") == ours.size && (theirs.string("valueIndicator") ?? "none") == ours.indicator, "\(ours.id)")
      #expect((theirs.string("orientation") ?? "horizontal") == (ours.vertical ? "vertical" : "horizontal"), "\(ours.id)")
      #expect(theirs.string("label") == ours.label && (theirs.string("startLabel") ?? "") == ours.startLabel, "\(ours.id)")
    }
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiSliderTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiSlider preset snapshots")
struct TanreiSliderPresetSnapshotTests {
  /// Discrete with stops: the preset's track, active track, handle (its size and elevation) and dots (none in cupertino).
  nonisolated static let fixtureId = "discrete-stops"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiSliderSnapshotTests.fixtures.contains { $0.id == Self.fixtureId })
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try #require(TanreiSliderSnapshotTests.fixtures.first { $0.id == Self.fixtureId })
    try Snapshot.assert(TanreiSliderSnapshotTests.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}
