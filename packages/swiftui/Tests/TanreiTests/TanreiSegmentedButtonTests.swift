import AcmeFixture
import SwiftUI
import Testing

@testable import Tanrei

// Covers specs/segmented-button.spec.json. Each behavior id (SEG-n) is named next to the test that covers it; the parity
// checker requires every id to appear in this file. SEG-9, SEG-10 and SEG-11 are BTN-8, BTN-9 and BTN-10 for the segment:
// the primitives they rest on are tested once in TanreiButtonTests / TanreiPrimitivesTests; here each is proven to reach the
// segment. The fixtures render the set at its natural width, start-aligned and vertically centred on a 400 × 96 stage
// (SEG-14's verify).
//
// Icons: baselines render with `Snapshot.theme` (`fontFamilyPolicy: .system`), under which a `TanreiIconGlyph` draws
// nothing, so a fixture's glyph name draws the SF Symbol a product would pass for it — its `.fill` form on a selected segment
// where the symbol has one, as a product using SF Symbols chooses the symbol of each state itself (`platform-symbol-sets`).
// The check is the filter chip's (`TanreiChipGlyph`): without the icon font, the checkbox's mark.
//
// The accessibility tree cannot be read here (macOS builds it only for an assistive client): SEG-20's traits, value and
// names are tested as rules below and end to end in the gallery's UI tests.

private let suiteName = "TanreiSegmentedButtonTests"

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

/// A value outside any view — what a `Binding` in a real app points at — recording its writes.
@MainActor
private final class Store<Value: Sendable> {
  var value: Value
  var writes: [Value] = []
  init(_ value: Value) { self.value = value }

  var binding: Binding<Value> {
    Binding(
      get: { MainActor.assumeIsolated { self.value } },
      set: { newValue in
        MainActor.assumeIsolated {
          self.value = newValue
          self.writes.append(newValue)
        }
      })
  }
}

/// Entries as a set reads them: titles "A", "B", "C" … with values "a", "b", "c" …; `disabled` lists the disabled indices.
private func entries(_ count: Int = 3, disabled: Set<Int> = [], values: [String?]? = nil) -> [TanreiSegmentEntry] {
  (0..<count).map { index in
    let letter = String(UnicodeScalar(UInt8(65 + index)))
    let value = values.map { $0[index] } ?? letter.lowercased()
    return TanreiSegmentEntry(title: letter, isEnabled: !disabled.contains(index), value: value.map { AnyHashable($0) })
  }
}

private let names = ["Day", "Week", "Month"]

/// A single-choice set of Day / Week / Month at its natural width.
@MainActor
private func single(
  _ selection: Binding<String?> = .constant("week"), disabled: Set<Int> = [], size: TanreiSegmentedButtonSize = .medium,
  labels: [String] = names
) -> some View {
  TanreiSegmentedButton("Range", selection: selection, size: size) {
    ForEach(labels.indices, id: \.self) { index in
      TanreiSegment(labels[index]).tag(labels[index].lowercased()).disabled(disabled.contains(index))
    }
  }
  .fixedSize(horizontal: true, vertical: false)
}

/// A multiple-choice set of Mon / Tue / Wed at its natural width.
@MainActor
private func multiple(_ selection: Binding<Set<String>>) -> some View {
  TanreiSegmentedButton("Days", selection: selection) {
    ForEach(["Mon", "Tue", "Wed"], id: \.self) { TanreiSegment($0).tag($0.lowercased()) }
  }
  .fixedSize(horizontal: true, vertical: false)
}

/// One segment's chrome, alone, at `width` × the medium height: what the set draws for a segment.
@MainActor
private func chrome(
  _ entry: TanreiSegmentEntry = TanreiSegmentEntry(title: "Week", value: "week"), position: TanreiSegmentPosition = .init(index: 1, count: 3),
  selected: Bool = false, pressed: Bool = false, focused: Bool = false, width: CGFloat = 120, height: CGFloat = 36
) -> some View {
  TanreiSegmentChrome(entry: entry, size: .medium, position: position, isSelected: selected, isPressed: pressed, isFocused: focused)
    .frame(width: width, height: height)
}

/// The size of a render without the snapshot inset, in points.
@MainActor
private func visualSize(_ bitmap: Bitmap) -> CGSize {
  CGSize(width: CGFloat(bitmap.width) / Snapshot.scale - 2 * Snapshot.inset, height: CGFloat(bitmap.height) / Snapshot.scale - 2 * Snapshot.inset)
}

/// Where a row of a render is `color`: the start of each run of such device pixels, in points.
@MainActor
private func runs(_ bitmap: Bitmap, y: CGFloat, of color: Bitmap.RGBA, tolerance: Int = 12) -> [CGFloat] {
  var starts: [CGFloat] = []
  var inside = false
  for x in 0..<bitmap.width {
    let hit = bitmap[x, Int(y * Snapshot.scale)].isClose(to: color, tolerance: tolerance)
    if hit && !inside { starts.append(CGFloat(x) / Snapshot.scale) }
    inside = hit
  }
  return starts
}

/// Whether any pixel of the rectangle (points) is `color`.
@MainActor
private func inks(_ bitmap: Bitmap, _ color: Bitmap.RGBA, x: ClosedRange<CGFloat>, y: ClosedRange<CGFloat>, tolerance: Int = 40) -> Bool {
  stride(from: x.lowerBound, through: x.upperBound, by: 0.5).contains { px in
    stride(from: y.lowerBound, through: y.upperBound, by: 0.5).contains { pixel(bitmap, x: px, y: $0).isClose(to: color, tolerance: tolerance) }
  }
}

// MARK: - The rules (SEG-1, SEG-2, SEG-3, SEG-12, SEG-18, SEG-19, SEG-20, SEG-21, SEG-22)

@MainActor
@Suite("TanreiSegmentedButton rules")
struct TanreiSegmentedButtonRulesTests {
  /// SEG-12 — the segments drawn selected: for each value, the first segment with it; a value naming no segment selects
  /// nothing; an empty selection none.
  @Test("SEG-12 which segments are selected: the first with each value, none for an unknown value")
  func selected() {
    #expect(TanreiSegmentedButtonRules.selectedIndices(entries(), values: ["b"]) == [1])
    #expect(TanreiSegmentedButtonRules.selectedIndices(entries(), values: ["z"]).isEmpty)
    #expect(TanreiSegmentedButtonRules.selectedIndices(entries(), values: []).isEmpty)
    #expect(TanreiSegmentedButtonRules.selectedIndices(entries(values: ["a", "b", "a"]), values: ["a"]) == [0])
    #expect(TanreiSegmentedButtonRules.selectedIndices(entries(), values: ["a", "c", "z"]) == [0, 2])
    // A disabled segment the product selected is still drawn selected (the fixture selected-disabled).
    #expect(TanreiSegmentedButtonRules.selectedIndices(entries(disabled: [2]), values: ["c"]) == [2])
  }

  /// SEG-12, SEG-22 — reported in debug builds: values naming no segment, segments without a value, with an empty value or
  /// sharing one, a hidden label without an icon, an unnamed set, fewer than two or more than five segments. A consistent
  /// set reports nothing.
  @Test("SEG-12 SEG-22 unknown, missing, empty and repeated values, hidden labels, no name and the count are reported")
  func problems() {
    #expect(TanreiSegmentedButtonRules.problems(entries(), values: ["b"], labelIsEmpty: false).isEmpty)
    #expect(TanreiSegmentedButtonRules.problems(entries(), values: [], labelIsEmpty: false).isEmpty)
    let unknown = TanreiSegmentedButtonRules.problems(entries(), values: ["z"], labelIsEmpty: false)
    #expect(unknown.count == 1 && unknown[0].contains("names no segment") && unknown[0].contains("SEG-12"))
    #expect(TanreiSegmentedButtonRules.problems(entries(values: ["a", nil, "c"]), values: [], labelIsEmpty: false).contains { $0.contains("(\"B\") has no value") })
    #expect(TanreiSegmentedButtonRules.problems(entries(values: ["a", "", "c"]), values: [], labelIsEmpty: false).contains { $0.contains("empty value") })
    #expect(TanreiSegmentedButtonRules.problems(entries(values: ["a", "a", "a"]), values: [], labelIsEmpty: false).filter { $0.contains("more than one") }.count == 1)
    let hidden = [TanreiSegmentEntry(title: "A", labelHidden: true, value: "a"), TanreiSegmentEntry(title: "B", icon: "star", labelHidden: true, value: "b")]
    let reports = TanreiSegmentedButtonRules.problems(hidden, values: [], labelIsEmpty: false)
    #expect(reports.count == 1 && reports[0].contains("(\"A\")") && reports[0].contains("SEG-22"))
    #expect(TanreiSegmentedButtonRules.problems(entries(), values: [], labelIsEmpty: true).contains { $0.contains("no accessible name") })
    #expect(TanreiSegmentedButtonRules.problems(entries(1), values: [], labelIsEmpty: false).contains { $0.contains("holds 1 segments") })
    #expect(TanreiSegmentedButtonRules.problems(entries(6), values: [], labelIsEmpty: false).contains { $0.contains("holds 6 segments") })
    #expect(TanreiSegmentedButtonRules.problems(entries(5), values: [], labelIsEmpty: false).isEmpty)
    #expect(TanreiSegmentedButtonRules.problems(entries(2), values: [], labelIsEmpty: false).isEmpty)
  }

  /// SEG-1 — single: another enabled segment selects its value; the selected one changes nothing (never cleared by its own
  /// segment). SEG-3 — a disabled segment never changes anything; a segment without a value cannot be chosen.
  @Test("SEG-1 SEG-3 a single choice: another segment selects, the selected one and a disabled one change nothing")
  func singleChange() {
    let set = entries(disabled: [2])
    #expect(TanreiSegmentedButtonRules.change(set, activating: 1, selected: [0], isMultiple: false) == .select("b"))
    #expect(TanreiSegmentedButtonRules.change(set, activating: 1, selected: [], isMultiple: false) == .select("b"))
    #expect(TanreiSegmentedButtonRules.change(set, activating: 0, selected: [0], isMultiple: false) == nil)
    #expect(TanreiSegmentedButtonRules.change(set, activating: 2, selected: [0], isMultiple: false) == nil)
    #expect(TanreiSegmentedButtonRules.change(entries(values: ["a", nil, "c"]), activating: 1, selected: [0], isMultiple: false) == nil)
    #expect(TanreiSegmentedButtonRules.change(set, activating: 7, selected: [0], isMultiple: false) == nil)
  }

  /// SEG-2 — multiple: a segment's value is added, or removed while it is selected (the selection may become empty). SEG-3
  /// — never for a disabled segment, selected or not.
  @Test("SEG-2 SEG-3 a multiple choice: a segment switches its value on and off; a disabled one never")
  func multipleChange() {
    let set = entries(disabled: [2])
    #expect(TanreiSegmentedButtonRules.change(set, activating: 1, selected: [0], isMultiple: true) == .insert("b"))
    #expect(TanreiSegmentedButtonRules.change(set, activating: 0, selected: [0], isMultiple: true) == .remove("a"))
    #expect(TanreiSegmentedButtonRules.change(set, activating: 2, selected: [2], isMultiple: true) == nil)
    #expect(TanreiSegmentedButtonRules.change(set, activating: 2, selected: [], isMultiple: true) == nil)
  }

  /// SEG-18, SEG-3 — single: one Tab stop, the selected segment, or the first enabled one while none is selected; never a
  /// disabled segment. The segment that had focus last does not count.
  @Test("SEG-18 SEG-3 a single choice's Tab stop is the selected segment, else the first enabled one")
  func singleTabStop() {
    #expect(TanreiSegmentedButtonRules.tabStop(entries(), selected: [1], isMultiple: false, lastFocused: 2) == 1)
    #expect(TanreiSegmentedButtonRules.tabStop(entries(disabled: [0]), selected: [], isMultiple: false, lastFocused: nil) == 1)
    #expect(TanreiSegmentedButtonRules.tabStop(entries(disabled: [2]), selected: [2], isMultiple: false, lastFocused: nil) == 0)
    #expect(TanreiSegmentedButtonRules.tabStop(entries(disabled: [0, 1, 2]), selected: [0], isMultiple: false, lastFocused: 0) == nil)
  }

  /// SEG-19, SEG-3 — multiple: the segment that had focus last, else the first selected one, else the first enabled one;
  /// never a disabled segment.
  @Test("SEG-19 SEG-3 a multiple choice's Tab stop is the last focused segment, else the first selected, else the first enabled")
  func multipleTabStop() {
    #expect(TanreiSegmentedButtonRules.tabStop(entries(), selected: [1], isMultiple: true, lastFocused: 2) == 2)
    #expect(TanreiSegmentedButtonRules.tabStop(entries(disabled: [2]), selected: [1], isMultiple: true, lastFocused: 2) == 1)
    #expect(TanreiSegmentedButtonRules.tabStop(entries(), selected: [1, 2], isMultiple: true, lastFocused: nil) == 1)
    #expect(TanreiSegmentedButtonRules.tabStop(entries(disabled: [0]), selected: [], isMultiple: true, lastFocused: nil) == 1)
    #expect(TanreiSegmentedButtonRules.tabStop(entries(), selected: [], isMultiple: true, lastFocused: 9) == 0)
  }

  /// SEG-18, SEG-19 — Right and Down Arrow move to the next enabled segment and Left and Up Arrow to the previous one,
  /// wrapping; Home and End to the first and last enabled segment; SEG-3 — disabled segments are skipped; other keys are not
  /// the set's.
  @Test("SEG-18 SEG-19 SEG-3 the arrows wrap and skip disabled segments; Home and End go to the enabled ends")
  func keys() {
    let set = entries(4, disabled: [0, 2])
    func target(_ key: KeyEquivalent, from index: Int) -> Int? {
      TanreiSegmentedButtonRules.target(for: key, from: index, in: set, layoutDirection: .leftToRight)
    }
    #expect(target(.rightArrow, from: 1) == 3 && target(.downArrow, from: 1) == 3)
    #expect(target(.rightArrow, from: 3) == 1)
    #expect(target(.leftArrow, from: 1) == 3 && target(.upArrow, from: 1) == 3)
    #expect(target(.upArrow, from: 3) == 1)
    #expect(target(.home, from: 3) == 1 && target(.end, from: 1) == 3)
    #expect(target(.tab, from: 1) == nil && target(.space, from: 1) == nil)
    #expect(TanreiSegmentedButtonRules.target(for: .rightArrow, from: 0, in: entries(disabled: [0, 1, 2]), layoutDirection: .leftToRight) == nil)
    #expect(TanreiSegmentedButtonRules.keys == [.leftArrow, .rightArrow, .upArrow, .downArrow, .home, .end])
  }

  /// SEG-21 (and SEG-18, SEG-19) — right to left, Left Arrow moves to the next segment and Right Arrow to the previous one;
  /// Up, Down, Home and End are unchanged.
  @Test("SEG-21 SEG-18 SEG-19 right to left, Left and Right are mirrored")
  func rightToLeftKeys() {
    func target(_ key: KeyEquivalent, from index: Int) -> Int? {
      TanreiSegmentedButtonRules.target(for: key, from: index, in: entries(), layoutDirection: .rightToLeft)
    }
    #expect(target(.leftArrow, from: 0) == 1 && target(.rightArrow, from: 0) == 2)
    #expect(target(.downArrow, from: 0) == 1 && target(.upArrow, from: 0) == 2)
    #expect(target(.home, from: 2) == 0 && target(.end, from: 0) == 2)
  }

  /// SEG-20 — a single-choice segment states its position and the number of segments, and has the selected trait while
  /// selected (iOS has no radio role); a multiple-choice segment is a toggle, with the selected trait while on, whose value
  /// is its on / off (a position would replace it).
  @Test("SEG-20 each segment's position, and the traits of a radio and of a toggle button")
  func semantics() {
    #expect(TanreiSegmentedButtonRules.positionText(index: 1, count: 3, isMultiple: false) == "2 of 3")
    #expect(TanreiSegmentedButtonRules.positionText(index: 1, count: 3, isMultiple: true) == nil)
    #expect(TanreiSegmentedButtonRules.traits(isMultiple: false, isSelected: true) == .isSelected)
    #expect(TanreiSegmentedButtonRules.traits(isMultiple: false, isSelected: false) == [])
    #expect(TanreiSegmentedButtonRules.traits(isMultiple: true, isSelected: true) == [.isToggle, .isSelected])
    #expect(TanreiSegmentedButtonRules.traits(isMultiple: true, isSelected: false) == .isToggle)
  }

  /// SEG-1, SEG-2 — the binding is the selection: a single choice writes the new value; a multiple choice inserts or removes
  /// one; a value of another type writes nothing.
  @Test("SEG-1 SEG-2 a change is written to the binding")
  func binding() {
    let one = Store<String?>("day")
    let single = TanreiSegmentedSelection(one.binding)
    #expect(!single.isMultiple && single.values == ["day"])
    single.apply(.select("week"))
    single.apply(.select(AnyHashable(7)))
    single.apply(.insert("month"))
    #expect(one.writes == ["week"])
    #expect(TanreiSegmentedSelection(Store<String?>(nil).binding).values.isEmpty)
    let many = Store<Set<String>>(["mon"])
    let multiple = TanreiSegmentedSelection(many.binding)
    #expect(multiple.isMultiple && multiple.values == ["mon"])
    multiple.apply(.insert("tue"))
    multiple.apply(.remove("mon"))
    multiple.apply(.remove("tue"))
    multiple.apply(.select("wed"))
    #expect(many.writes == [["mon", "tue"], ["tue"], []])
  }
}

// MARK: - Reading the segments (SEG-3, SEG-20, SEG-22)

private final class EntriesBox: @unchecked Sendable {
  var entries: [TanreiSegmentEntry] = []
}

private struct EntriesRoot: _VariadicView_UnaryViewRoot {
  let box: EntriesBox
  func body(children: _VariadicView.Children) -> some View {
    box.entries = children.compactMap { $0[TanreiSegmentEntryKey.self] }
    return Color.clear.frame(width: 1, height: 1)
  }
}

/// The segments as the set reads them from its content.
@MainActor
private func read(@ViewBuilder _ content: () -> some View) -> [TanreiSegmentEntry] {
  let box = EntriesBox()
  _ = ImageRenderer(content: _VariadicView.Tree(EntriesRoot(box: box)) { content() }).cgImage
  return box.entries
}

@MainActor
@Suite("TanreiSegmentedButton items")
struct TanreiSegmentedButtonItemTests {
  /// The item kind `segment`: title, icon, tag (value), `.labelStyle(.iconOnly)` (labelHidden) and `.disabled(_:)` — read
  /// from the segment's own view, through `ForEach` and modifiers.
  @Test("SEG-3 SEG-20 each segment's props are read from its view: value, icon, labelHidden, disabled")
  func props() {
    let read = read {
      TanreiSegment("List", icon: "view_list").tag("list")
      TanreiSegment("Center", icon: "format_align_center").tag("center").labelStyle(.iconOnly)
      TanreiSegment("Month").tag("month").disabled(true)
      TanreiSegment("Other", icon: "").tag(7).labelStyle(.titleAndIcon)
    }
    #expect(read.map(\.title) == ["List", "Center", "Month", "Other"])
    #expect(read.map(\.value) == ["list", "center", "month", AnyHashable(7)])
    #expect(read.map(\.labelHidden) == [false, true, false, false])
    #expect(read.map(\.isEnabled) == [true, true, false, true])
    #expect(read.map { $0.icon != nil } == [true, true, false, false])
    #expect(read.map(\.drawsLabel) == [true, false, true, true])
  }

  /// SEG-22 — an empty label is reported in debug builds, and the segment still renders; so does a set without a name.
  @Test("SEG-22 an empty label is reported and the segment is still rendered")
  func emptyLabel() throws {
    let (_, reports) = Reports.collecting { _ = TanreiSegment(" ").tag("a") }
    #expect(reports.mention("SEG-22") && reports.mention("accessible name"))
    let (_, silent) = Reports.collecting { _ = TanreiSegment("Day").tag("a") }
    #expect(silent.messages.isEmpty)
    let (bitmap, rendered) = try Reports.collecting {
      try Snapshot.render(
        TanreiSegmentedButton("", selection: .constant("a") as Binding<String?>) {
          TanreiSegment("").tag("a")
          TanreiSegment("B").tag("b")
        }
        .fixedSize(horizontal: true, vertical: false))
    }
    #expect(rendered.mention("set has no accessible name"))
    let tokens = TanreiSystem.tanrei.segmentedButton
    #expect(visualSize(bitmap).height == tokens.sizes.medium.containerHeight)
    // The unnamed segment is still drawn selected: its fill shows.
    #expect(pixel(bitmap, x: Snapshot.inset + 4, y: Snapshot.inset + 4).isClose(to: light[.secondaryContainer].rgba8(), tolerance: 2))
  }

  /// SEG-22 — a hidden label with no icon is drawn anyway (and reported).
  @Test("SEG-22 labelHidden without an icon draws the label anyway and is reported")
  func labelHiddenWithoutIcon() throws {
    let (hidden, reports) = try Reports.collecting {
      try Snapshot.render(
        TanreiSegmentedButton("Range", selection: .constant(nil) as Binding<String?>) {
          TanreiSegment("Day").tag("day").labelStyle(.iconOnly)
          TanreiSegment("Week").tag("week")
        }
        .fixedSize(horizontal: true, vertical: false))
    }
    #expect(reports.mention("hides its label but has no icon"))
    let shown = try Snapshot.render(
      TanreiSegmentedButton("Range", selection: .constant(nil) as Binding<String?>) {
        TanreiSegment("Day").tag("day")
        TanreiSegment("Week").tag("week")
      }
      .fixedSize(horizontal: true, vertical: false))
    #expect(hidden.mismatch(against: shown, channelTolerance: Snapshot.channelTolerance) <= Snapshot.allowedMismatch)
  }
}

// MARK: - Activation by pointer (SEG-1, SEG-2, SEG-3, SEG-6, SEG-9)

/// A multiple-choice set that owns its selection, as an app does, so that each click sees the last one's result.
private struct MultipleOwner: View {
  @State var values: Set<String>
  let record: @MainActor (Set<String>) -> Void

  var body: some View {
    multiple(Binding(get: { values }, set: { values = $0; record($0) }))
  }
}

@MainActor
@Suite("TanreiSegmentedButton activation", .serialized)
struct TanreiSegmentedButtonActivationTests {
  #if os(macOS)
  /// The centre of segment `index` of an equal set `width` wide with `count` segments, in the hosted view.
  private func center(_ index: Int, of count: Int, width: CGFloat) -> CGFloat {
    Snapshot.inset + width * (CGFloat(index) + 0.5) / CGFloat(count)
  }

  /// SEG-1 — a click on an enabled segment that is not selected sets the selection once; a click on the selected one emits
  /// nothing; SEG-3 — a click on a disabled segment emits nothing. (Enter and Space go through the same route, `activate`;
  /// keyboard focus cannot be given here.)
  @Test("SEG-1 SEG-3 a click selects once; the selected and disabled segments emit nothing")
  func click() {
    let store = Store<String?>("day")
    let hosted = HostedView(single(store.binding, disabled: [2]).padding(Snapshot.inset).tanreiTheme(Snapshot.theme))
    let width = hosted.size.width - 2 * Snapshot.inset
    let y = hosted.size.height / 2
    hosted.click(at: CGPoint(x: center(0, of: 3, width: width), y: y))
    #expect(store.writes.isEmpty)
    hosted.click(at: CGPoint(x: center(1, of: 3, width: width), y: y))
    #expect(store.writes == ["week"] && store.value == "week")
    hosted.click(at: CGPoint(x: center(2, of: 3, width: width), y: y))
    #expect(store.writes == ["week"])
  }

  /// SEG-2 — a click switches a segment of a multiple choice on and off, each click one change; the selection may become
  /// empty.
  @Test("SEG-2 a click switches a segment on and off")
  func toggle() {
    let store = Store<Set<String>>(["mon"])
    let hosted = HostedView(MultipleOwner(values: ["mon"], record: { store.writes.append($0) }).padding(Snapshot.inset).tanreiTheme(Snapshot.theme))
    let width = hosted.size.width - 2 * Snapshot.inset
    let y = hosted.size.height / 2
    hosted.click(at: CGPoint(x: center(1, of: 3, width: width), y: y))
    hosted.click(at: CGPoint(x: center(0, of: 3, width: width), y: y))
    hosted.click(at: CGPoint(x: center(1, of: 3, width: width), y: y))
    #expect(store.writes == [["mon", "tue"], ["tue"], []])
  }

  /// SEG-6 end to end: where the set is shorter than the minimum target, a click above or below it, within half the target
  /// of the segment's centre, activates that segment; a click further away does not. The set keeps its visual size.
  @Test("SEG-6 the hit area reaches the minimum target above and below the set")
  func hitArea() throws {
    var system = TanreiSystem.tanrei
    system.measure.targetPointer = 60
    system.measure.targetTouch = 60
    let store = Store<String?>("day")
    let content = single(store.binding).padding(40).background(light[.surface]).tanreiTheme(theme(system))
    let hosted = HostedView(content)
    let height = TanreiSystem.tanrei.segmentedButton.sizes.medium.containerHeight
    #expect(hosted.size.height == height + 80)
    let width = hosted.size.width - 80
    let x = 40 + width * 1.5 / 3
    // 10 above the set's top edge: inside the 60-point target around the 36-point segment (12 above it).
    hosted.click(at: CGPoint(x: x, y: 40 - 10))
    #expect(store.writes == ["week"])
    // Only the hit area grows: in a real window the selected segment ("day") is still drawn at the set's height.
    let day = 40 + width * 0.5 / 3
    #expect(try #require(hosted.color(at: CGPoint(x: day, y: 40 - 4))).isClose(to: light[.surface].rgba8()))
    #expect(try #require(hosted.color(at: CGPoint(x: day, y: 40 + 4))).isClose(to: light[.secondaryContainer].rgba8(), tolerance: 4))
    // 20 above: outside.
    hosted.click(at: CGPoint(x: 40 + width * 2.5 / 3, y: 40 - 20))
    #expect(store.writes == ["week"])
    hosted.click(at: CGPoint(x: 40 + width * 2.5 / 3, y: 40 + height + 10))
    #expect(store.writes == ["week", "month"])
  }

  /// SEG-9 end to end: pressed at once, held for press-hold after a quick click; one change (SEG-1).
  @Test("SEG-9 SEG-1 a quick click shows the pressed state at once and keeps it after the release")
  func quickClickIsHeld() throws {
    var system = TanreiSystem.tanrei
    system.motion.duration.pressHold = 1500
    system.segmentedButton.motionStateDuration = 0
    system.segmentedButton.motionSelectionDuration = 0
    system.segmentedButton.conditions.unselected.pressed.containerColor = .role(.error)
    system.segmentedButton.conditions.selected.pressed.containerColor = .role(.error)
    let colors = system.colors.light
    let store = Store<String?>("day")
    let hosted = HostedView(single(store.binding).padding(Snapshot.inset).background(colors[.surface]).tanreiTheme(theme(system)))
    let width = hosted.size.width - 2 * Snapshot.inset
    let point = CGPoint(x: center(1, of: 3, width: width), y: Snapshot.inset + 4)
    hosted.hover(at: point)
    hosted.mouse(.leftMouseDown, at: point)
    hosted.settle()
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8()))
    hosted.mouse(.leftMouseUp, at: point)
    hosted.settle()
    #expect(store.writes == ["week"])
    // Still held after the release (1.5 s), now in the selected condition's pressed tokens.
    #expect(try #require(hosted.color(at: point)).isClose(to: colors[.error].rgba8()))
  }
  #endif
}

// MARK: - Token bindings (SEG-4, SEG-7, SEG-8, SEG-10, SEG-11, SEG-12, SEG-16, SEG-23, SEG-24)

@MainActor
@Suite("TanreiSegmentedButton token bindings")
struct TanreiSegmentedButtonTokenBindingTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiSegmentedButtonTokens { system.segmentedButton }

  private func appearance(selected: Bool = false, _ state: TanreiInteraction = .enabled, tokens: TanreiSegmentedButtonTokens? = nil) -> TanreiSegmentAppearance {
    TanreiSegmentAppearance(tokens: tokens ?? self.tokens, isSelected: selected, state: state)
  }

  /// SEG-12 — at rest: unselected has no fill, an on-surface label and an on-surface-variant icon; selected the
  /// secondary-container fill and on-secondary-container content; neither is raised; opacity 1; the inner corners are
  /// container.shape.
  @Test("SEG-12 at rest each condition binds its own parts")
  func rest() {
    let plain = appearance()
    let chosen = appearance(selected: true)
    #expect(plain.container == TanreiPaint.none && plain.label == .role(.onSurface) && plain.icon == .role(.onSurfaceVariant))
    #expect(chosen.container == .role(.secondaryContainer) && chosen.label == .role(.onSecondaryContainer) && chosen.icon == .role(.onSecondaryContainer))
    #expect(plain.elevation.isEmpty && chosen.elevation.isEmpty)
    #expect(plain.opacity == 1 && plain.cornerRadius == tokens.containerShape && plain.ripple == nil)
  }

  /// SEG-4 — hovered, focused and pressed mix each condition's state-layer color into its container; the label and icon keep
  /// their resting values.
  @Test("SEG-4 each state binds that state's tokens", arguments: [false, true])
  func states(selected: Bool) {
    let rest = appearance(selected: selected)
    let condition = tokens.conditions[selected ? .selected : .unselected]
    #expect(condition.enabled.stateLayerColor == rest.label)
    for (state, amount) in [
      (TanreiInteraction.hovered, system.state.hoverStateLayerOpacity), (.focused, system.state.focusStateLayerOpacity), (.pressed, system.state.pressedStateLayerOpacity),
    ] {
      let drawn = appearance(selected: selected, state)
      #expect(drawn.container == .mix(base: rest.container, with: condition.enabled.stateLayerColor, amount: amount))
      #expect(drawn.label == rest.label && drawn.icon == rest.icon && drawn.opacity == 1 && drawn.cornerRadius == rest.cornerRadius)
    }
  }

  /// SEG-4 (verify) — under acme, hovered, focused and pressed differ, in both conditions.
  @Test("SEG-4 under acme, hovered, focused and pressed differ")
  func acme() {
    for selected in [false, true] {
      let containers = [TanreiInteraction.hovered, .focused, .pressed].map {
        TanreiSegmentAppearance(tokens: TanreiSystem.acme.segmentedButton, isSelected: selected, state: $0).container
      }
      #expect(Set(containers.map { "\($0)" }).count == 3, "selected: \(selected)")
    }
  }

  /// SEG-7 — disabled: an unselected segment stays clear (its own explicit token), a selected one keeps a fill
  /// (on-surface 12 %); label and icon read as disabled; neither is raised.
  @Test("SEG-7 disabled bindings, for an unselected and a selected segment")
  func disabled() {
    let plain = appearance(.disabled)
    let chosen = appearance(selected: true, .disabled)
    #expect(plain.container == TanreiPaint.none)
    #expect(chosen.container == .alpha(of: .role(.onSurface), amount: 0.12))
    #expect(plain.label != appearance().label && chosen.label != appearance(selected: true).label)
    #expect(plain.icon != appearance().icon && chosen.icon != appearance(selected: true).icon)
    #expect(plain.elevation.isEmpty && chosen.elevation.isEmpty && plain.opacity == tokens.disabled.opacity)
    // Cupertino: the disabled selected segment keeps its raised fill (and loses its lift).
    let cupertino = TanreiSegmentAppearance(tokens: TanreiSystem.cupertino.segmentedButton, isSelected: true, state: .disabled)
    #expect(cupertino.container == .role(.surfaceBright) && cupertino.elevation.isEmpty)
  }

  /// SEG-4, SEG-7, SEG-12 — the values drive the result, for every part of both conditions and the shared state values.
  @Test("SEG-4 SEG-7 SEG-12 a modified system changes what each state resolves to")
  func modifiedSystem() {
    var custom = tokens
    custom.conditions.unselected.hovered.containerColor = .role(.error)
    custom.conditions.selected.focused.labelColor = .role(.warning)
    custom.conditions.selected.pressed.iconColor = .role(.success)
    custom.conditions.unselected.disabled.labelColor = .role(.info)
    custom.conditions.selected.enabled.containerElevation = TanreiSystem.tanrei.elevation.level2
    custom.pressed.opacity = 0.5
    custom.hovered.containerShape = 12
    custom.containerShape = 3
    #expect(appearance(.hovered, tokens: custom).container == .role(.error))
    #expect(appearance(selected: true, .focused, tokens: custom).label == .role(.warning))
    #expect(appearance(selected: true, .pressed, tokens: custom).icon == .role(.success))
    #expect(appearance(.disabled, tokens: custom).label == .role(.info))
    #expect(appearance(selected: true, tokens: custom).elevation == TanreiSystem.tanrei.elevation.level2)
    #expect(appearance(.pressed, tokens: custom).opacity == 0.5)
    #expect(appearance(.hovered, tokens: custom).cornerRadius == 12 && appearance(tokens: custom).cornerRadius == 3)
  }

  /// SEG-8 — a size the system does not have draws medium's tokens and is reported; a layer's own size is read.
  @Test("SEG-8 an unknown size draws medium's tokens and is reported")
  func unknownSize() throws {
    let huge = TanreiSegmentedButtonSize(rawValue: "huge")
    let (value, reports) = Reports.collecting { tokens.sizes[huge] }
    #expect(value == tokens.sizes.medium && reports.mention("segmented-button size \"huge\""))
    var custom = tokens
    var added = tokens.sizes.medium
    added.containerHeight = 64
    custom.sizes.extra[huge] = added
    let (known, silent) = Reports.collecting { custom.sizes[huge] }
    #expect(known.containerHeight == 64 && silent.messages.isEmpty)
    // Rendered: the set with an unknown size is the medium set.
    let (unknown, _) = try Reports.collecting { try Snapshot.render(single(size: huge)) }
    #expect(unknown.mismatch(against: try Snapshot.render(single()), channelTolerance: Snapshot.channelTolerance) <= Snapshot.allowedMismatch)
    var grown = system
    grown.segmentedButton = custom
    #expect(visualSize(try Snapshot.render(single(size: huge), theme: theme(grown))).height == 64)
  }

  /// SEG-10 — which tokens a press reads under each choice; the shipped systems: m3-like ripples, cupertino dims.
  @Test("SEG-10 each choice binds the pressed tokens its own way", arguments: TanreiPressedFeedback.allCases)
  func feedback(feedback: TanreiPressedFeedback) {
    var custom = tokens
    custom.conditions.unselected.pressed.containerColor = .role(.error)
    custom.conditions.unselected.pressed.labelColor = .role(.warning)
    custom.pressed.opacity = 0.5
    let pressed = TanreiSegmentAppearance(tokens: custom, isSelected: false, state: .pressed, feedback: feedback, beneath: .hovered)
    let hovered = custom.conditions.unselected.hovered
    switch feedback {
    case .overlay: #expect(pressed.container == .role(.error) && pressed.ripple == nil && pressed.label == .role(.warning))
    case .ripple: #expect(pressed.container == hovered.containerColor && pressed.ripple == .role(.error) && pressed.opacity == 0.5 && pressed.label == .role(.warning))
    case .dim: #expect(pressed.container == hovered.containerColor && pressed.ripple == nil && pressed.opacity == 0.5 && pressed.label == .role(.warning))
    case .none: #expect(pressed == TanreiSegmentAppearance(tokens: custom, isSelected: false, state: .hovered))
    }
    func shipped(_ system: TanreiSystem) -> TanreiSegmentAppearance {
      TanreiSegmentAppearance(tokens: system.segmentedButton, isSelected: false, state: .pressed, feedback: system.behavior.pressedFeedback)
    }
    #expect(shipped(.m3Like).ripple != nil && shipped(.cupertino).ripple == nil && shipped(.cupertino).opacity < 1 && shipped(.tanrei).ripple == nil)
  }

  /// SEG-10 — rendered: the pressed segment under each choice.
  @Test("SEG-10 each choice renders as it says", arguments: TanreiPressedFeedback.allCases)
  func rendered(feedback: TanreiPressedFeedback) throws {
    var custom = TanreiSystem.tanrei
    custom.behavior.pressedFeedback = feedback
    custom.segmentedButton.conditions.unselected.pressed.containerColor = .role(.error)
    custom.segmentedButton.pressed.opacity = 0.5
    let actual = pixel(try Snapshot.render(chrome(pressed: true), theme: theme(custom)), x: Snapshot.inset + 3, y: Snapshot.inset + 4)
    switch feedback {
    case .overlay, .ripple: #expect(actual.isClose(to: light[.error].opacity(0.5).rgba8(over: light[.surface])))
    case .dim, .none: #expect(actual.isClose(to: light[.surface].rgba8()))
    }
  }

  /// SEG-11 — the segment's corners follow the corner smoothing (the end segments carry the set's corners); focus follows
  /// the focus style.
  @Test("SEG-11 corner smoothing and focus style reach the segment")
  func cornersAndFocusStyle() throws {
    func render(_ amount: Double, focused: Bool = false, style: TanreiFocusStyle = .ring) throws -> Bitmap {
      var custom = TanreiSystem.tanrei
      custom.shape.cornerSmoothing = amount
      custom.segmentedButton.setShape = 16
      custom.segmentedButton.conditions.unselected.enabled.containerColor = .role(.error)
      custom.behavior.focusStyle = style
      return try Snapshot.renderExact(chrome(position: TanreiSegmentPosition(index: 0, count: 3), focused: focused), theme: theme(custom))
    }
    let continuous = try render(0.6)
    #expect(try render(0).mismatch(against: continuous, channelTolerance: 0) > 0)
    #expect(try render(1).mismatch(against: continuous, channelTolerance: 0) == 0)
    #expect(try render(0.6, focused: true, style: .glow).mismatch(against: try render(0.6, focused: true, style: .ring), channelTolerance: 0) > 0)
  }

  /// SEG-23, SEG-16, SEG-10 — the state motion, the selection motion and the ripple's growth come from the tokens; none
  /// under Reduce Motion.
  @Test("SEG-23 SEG-16 SEG-10 the motions come from the tokens; none under Reduce Motion")
  func motion() {
    var custom = tokens
    custom.motionStateDuration = 400
    custom.motionStateEasing = TanreiCubicBezier(0, 0, 1, 1)
    custom.motionFeedbackDuration = 900
    custom.motionSelectionDuration = 700
    custom.motionSelectionEasing = TanreiCubicBezier(0.1, 0.2, 0.3, 0.4)
    let motion = custom.motion(reduceMotion: false)
    #expect(motion.state == Animation.timingCurve(0, 0, 1, 1, duration: 0.4))
    #expect(motion.selection == Animation.timingCurve(0.1, 0.2, 0.3, 0.4, duration: 0.7))
    #expect(custom.rippleGrowth(reduceMotion: false) == Animation.timingCurve(0, 0, 1, 1, duration: 0.9))
    let reduced = custom.motion(reduceMotion: true)
    #expect(reduced.state == nil && reduced.selection == nil && custom.rippleGrowth(reduceMotion: true) == nil)
  }

  /// SEG-24 — the selected condition's elevation is read (cupertino raises its selected segment, the default raises none),
  /// and it is cast outside the segment and above its neighbours: a shadow thrown sideways covers the neighbour's fill.
  @Test("SEG-24 a selected segment casts its elevation above its neighbours")
  func elevation() throws {
    #expect(!TanreiSegmentAppearance(tokens: TanreiSystem.cupertino.segmentedButton, isSelected: true, state: .enabled).elevation.isEmpty)
    #expect(TanreiSegmentAppearance(tokens: TanreiSystem.cupertino.segmentedButton, isSelected: false, state: .enabled).elevation.isEmpty)
    var custom = TanreiSystem.tanrei
    custom.segmentedButton.conditions.unselected.enabled.containerColor = .role(.success)
    custom.segmentedButton.conditions.selected.enabled.containerElevation = [
      TanreiShadowLayer(x: 6, y: 4, blur: 0, spread: 0, role: .error)
    ]
    custom.segmentedButton.dividerWidth = 0
    let rendered = try Snapshot.render(single(.constant("day")), theme: theme(custom))
    // The first segment's right edge is where the success fill of the second begins, above the shadow's offset.
    let edge = try #require(runs(rendered, y: Snapshot.inset + 2, of: light[.success].rgba8()).first)
    #expect(pixel(rendered, x: edge + 3, y: Snapshot.inset + 12).isClose(to: light[.error].rgba8(), tolerance: 12))
    #expect(pixel(rendered, x: edge + 9, y: Snapshot.inset + 12).isClose(to: light[.success].rgba8(), tolerance: 12))
    // Outside the set, below it.
    let height = custom.segmentedButton.sizes.medium.containerHeight
    #expect(pixel(rendered, x: Snapshot.inset + 20, y: Snapshot.inset + height + 2).isClose(to: light[.error].rgba8(), tolerance: 12))
  }
}

// MARK: - Rendered (SEG-5, SEG-6, SEG-7, SEG-13, SEG-14, SEG-15, SEG-16, SEG-17, SEG-21)

@MainActor
@Suite("TanreiSegmentedButton rendered")
struct TanreiSegmentedButtonRenderedTests {
  let system = TanreiSystem.tanrei
  var tokens: TanreiSegmentedButtonTokens { system.segmentedButton }
  var metrics: TanreiSegmentedButtonSizeTokens { tokens.sizes.medium }

  /// SEG-5 — the focus ring inside the segment, keyboard focus only, not dimmed by the state's opacity; the segment keeps
  /// its size. Above the outline: a keyboard-focused segment is drawn over it (the set's layers, which its layout honours).
  @Test("SEG-5 the focus ring is drawn inside the segment, above the set's outline")
  func focusRing() throws {
    let ring = TanreiFocusRingMetrics(containerCornerRadius: .zero, measure: system.measure)
    let ringX = Snapshot.inset + ring.outerWidth / 2
    let y = Snapshot.inset + metrics.containerHeight / 2
    let focused = try Snapshot.render(chrome(focused: true))
    #expect(pixel(focused, x: ringX, y: y).isClose(to: light[.focusRing].rgba8(), tolerance: 40))
    #expect(pixel(focused, x: Snapshot.inset - 1, y: y).isClose(to: light[.surface].rgba8()))
    #expect(visualSize(focused) == visualSize(try Snapshot.render(chrome())))
    #expect(!pixel(try Snapshot.render(chrome()), x: ringX, y: y).isClose(to: light[.focusRing].rgba8(), tolerance: 40))
    var dim = system
    dim.segmentedButton.focused.opacity = 0.3
    #expect(pixel(try Snapshot.render(chrome(focused: true), theme: theme(dim)), x: ringX, y: y).isClose(to: light[.focusRing].rgba8(), tolerance: 40))
    // The order: a focused segment over the outline, a selected one over its neighbours and under the outline.
    #expect(TanreiSegmentedLayers.segment(isSelected: false, isFocused: true) > TanreiSegmentedLayers.outline)
    #expect(TanreiSegmentedLayers.outline > TanreiSegmentedLayers.segment(isSelected: true, isFocused: false))
    #expect(TanreiSegmentedLayers.segment(isSelected: true, isFocused: false) > TanreiSegmentedLayers.segment(isSelected: false, isFocused: false))
    // The set's layout honours the order: a later subview drawn under an earlier one with a higher layer.
    let layout = TanreiSegmentedSetLayout(padding: 0, dividerWidth: 1, minimumWidth: 40, minimumHeight: 40)
    let stacked = try Snapshot.render(
      layout {
        Color.red.frame(width: 40, height: 40).layoutValue(key: TanreiSegmentedPartKey.self, value: .segment(0)).zIndex(TanreiSegmentedLayers.segment(isSelected: false, isFocused: true))
        Color.blue.layoutValue(key: TanreiSegmentedPartKey.self, value: .outline).zIndex(TanreiSegmentedLayers.outline)
      })
    #expect(pixel(stacked, x: Snapshot.inset + 20, y: Snapshot.inset + 20).isClose(to: Color.red.rgba8()))
  }

  /// SEG-6 — each segment is at least the minimum target wide (it cannot reach over its neighbours); the height stays the
  /// visual height (the hit area grows, not the set). The target is a value of the design system.
  @Test("SEG-6 each segment is at least the minimum target wide")
  func target() throws {
    var custom = system
    custom.measure.targetPointer = 90
    custom.measure.targetTouch = 90
    let size = visualSize(try Snapshot.render(single(.constant("a"), labels: ["A", "B", "C"]), theme: theme(custom)))
    #expect(size.width == 3 * 90 + 2 * tokens.dividerWidth + 2 * tokens.setPadding)
    #expect(size.height == metrics.containerHeight)
  }

  /// SEG-13 — the set: at least the size's height, its fill, its outline inside its edge over the segments, its padding
  /// between the edge and the segments, the end segments' outer corners concentric with the set's, and container.shape
  /// where segments meet.
  @Test("SEG-13 the set's fill, outline, padding and corners")
  func set() throws {
    var custom = system
    custom.segmentedButton.setColor = .role(.success)
    custom.segmentedButton.setPadding = 4
    custom.segmentedButton.setShape = 14
    custom.segmentedButton.outlineColor = .role(.error)
    custom.segmentedButton.outlineWidth = 2
    custom.segmentedButton.containerShape = 6
    custom.segmentedButton.dividerColor = .role(.success)
    custom.segmentedButton.dividerWidth = 2
    // A segment of 36 − 2 × 4 holds the label's line and this padding: the set keeps the size's height.
    custom.segmentedButton.sizes.medium.containerPaddingBlock = 2
    let rendered = try Snapshot.render(single(.constant("day")), theme: theme(custom))
    let size = visualSize(rendered)
    #expect(size.height == metrics.containerHeight)
    let middle = Snapshot.inset + size.height / 2
    // The outline inside the edge, 2 wide, over the first segment's selected fill.
    #expect(pixel(rendered, x: Snapshot.inset + 0.5, y: middle).isClose(to: light[.error].rgba8(), tolerance: 12))
    #expect(pixel(rendered, x: Snapshot.inset + 1.5, y: middle).isClose(to: light[.error].rgba8(), tolerance: 12))
    #expect(pixel(rendered, x: Snapshot.inset - 0.5, y: middle).isClose(to: light[.surface].rgba8()))
    // The track in the padding, the selected segment's fill from the padding on.
    #expect(pixel(rendered, x: Snapshot.inset + 3, y: middle).isClose(to: light[.success].rgba8(), tolerance: 12))
    #expect(pixel(rendered, x: Snapshot.inset + 5, y: middle).isClose(to: light[.secondaryContainer].rgba8(), tolerance: 4))
    #expect(pixel(rendered, x: Snapshot.inset + 20, y: Snapshot.inset + 3).isClose(to: light[.success].rgba8(), tolerance: 12))
    // The first segment's outer corner is rounded by 14 − 4 = 10, concentric with the set's: between the two curves, on the
    // diagonal, the track shows.
    #expect(pixel(rendered, x: Snapshot.inset + 5.9, y: Snapshot.inset + 5.9).isClose(to: light[.success].rgba8(), tolerance: 12))
    // Its inner corner is container.shape (6): the corner pixel at its trailing edge shows the track too.
    let edge = try #require(runs(rendered, y: middle, of: light[.success].rgba8()).first { $0 > Snapshot.inset + 20 })
    #expect(pixel(rendered, x: edge - 0.5, y: Snapshot.inset + 4.5).isClose(to: light[.success].rgba8(), tolerance: 12))
    #expect(pixel(rendered, x: edge - 0.5, y: middle).isClose(to: light[.secondaryContainer].rgba8(), tolerance: 4))
  }

  /// SEG-14 — every segment one width: the widest segment's content measured as if selected (the check included) plus the
  /// padding; selecting another segment changes no width; a set offered more width divides it equally; offered less, labels
  /// wrap and every segment grows to the tallest.
  @Test("SEG-14 equal widths, measured as if selected; more width divided; less width wraps")
  func widths() throws {
    let outline = light[.outline].rgba8()
    let y = Snapshot.inset + 5
    let week = try Snapshot.render(single())
    let none = try Snapshot.render(single(.constant(nil)))
    let day = try Snapshot.render(single(.constant("day")))
    let edges = runs(week, y: y, of: outline)
    #expect(edges.count == 4)
    #expect(runs(none, y: y, of: outline) == edges && runs(day, y: y, of: outline) == edges)
    // Equal: the dividers split the set in thirds.
    let divider = tokens.dividerWidth
    let widths = [edges[1] - edges[0], edges[2] - edges[1] - divider, edges[3] + tokens.outlineWidth - edges[2] - divider]
    #expect(widths.allSatisfy { abs($0 - widths[0]) <= 0.5 }, "\(widths)")
    // Natural: "Month" on one line with the check's room, the gap and the padding.
    let month = visualSize(try Snapshot.render(Text(verbatim: "Month").tanreiTextStyle(metrics.labelTypescale).fixedSize())).width
    let natural = month + metrics.checkSize + metrics.containerGap + 2 * metrics.containerPaddingInline
    #expect(abs(visualSize(week).width - (3 * natural + 2 * tokens.dividerWidth)) <= 1)
    // More width: divided equally.
    let wide = visualSize(try Snapshot.render(TanreiSegmentedButton("Range", selection: .constant("week") as Binding<String?>) {
      TanreiSegment("Day").tag("day")
      TanreiSegment("Week").tag("week")
    }.frame(width: 300)))
    #expect(wide.width == 300)
    // Less width: the long label wraps, and both segments grow to the tallest.
    let narrow = try Snapshot.render(
      TanreiSegmentedButton("Range", selection: .constant("b") as Binding<String?>) {
        TanreiSegment("A label far too long for one line").tag("a")
        TanreiSegment("B").tag("b")
      }
      .frame(width: 200))
    let line = metrics.labelTypescale.lineHeight
    #expect(visualSize(narrow).height >= 2 * line + 2 * metrics.containerPaddingBlock)
    #expect(pixel(narrow, x: Snapshot.inset + 150, y: Snapshot.inset + 2).isClose(to: light[.secondaryContainer].rgba8(), tolerance: 4))
    #expect(pixel(narrow, x: Snapshot.inset + 150, y: Snapshot.inset + visualSize(narrow).height - 2).isClose(to: light[.secondaryContainer].rgba8(), tolerance: 4))
  }

  /// SEG-15 — the content centred in the segment; the label in the label color of its condition, the icon in the icon color
  /// at the icon size. The values drive it.
  @Test("SEG-15 content centred, label and icon in their colors and sizes")
  func content() throws {
    let icon = TanreiItemIcon.image(Image(systemName: "square.fill"))
    let entry = TanreiSegmentEntry(title: "Week", icon: icon, value: "week")
    let rendered = try Snapshot.render(chrome(entry, width: 160))
    let ink = light[.onSurface].rgba8()
    let row16 = stride(from: Snapshot.inset, to: Snapshot.inset + 160, by: 0.5).filter {
      pixel(rendered, x: $0, y: Snapshot.inset + metrics.containerHeight / 2).isClose(to: light[.onSurfaceVariant].rgba8(), tolerance: 24)
    }
    let iconInk = light[.onSurfaceVariant].rgba8()
    let middle = Snapshot.inset + metrics.containerHeight / 2
    let row = stride(from: Snapshot.inset, to: Snapshot.inset + 160, by: 0.5).filter {
      let color = pixel(rendered, x: $0, y: middle)
      return color.isClose(to: ink, tolerance: 60) || color.isClose(to: iconInk, tolerance: 60)
    }
    let first = try #require(row.first)
    let last = try #require(row.last)
    // Centred: as much room before the icon as after the label (within a glyph's side bearing).
    #expect(abs((first - Snapshot.inset) - (Snapshot.inset + 160 - last)) <= 3)
    // The icon: a square of icon.size in the icon color.
    #expect(pixel(rendered, x: first + metrics.iconSize / 2, y: middle).isClose(to: iconInk, tolerance: 24))
    var custom = system
    custom.segmentedButton.sizes.medium.iconSize = 24
    custom.segmentedButton.conditions.unselected.enabled.iconColor = .role(.error)
    custom.segmentedButton.conditions.unselected.enabled.labelColor = .role(.success)
    let modified = try Snapshot.render(chrome(entry, width: 160), theme: theme(custom))
    #expect(inks(modified, light[.error].rgba8(), x: Snapshot.inset...(Snapshot.inset + 80), y: middle...middle))
    #expect(inks(modified, light[.success].rgba8(), x: (Snapshot.inset + 60)...(Snapshot.inset + 150), y: (middle - 4)...(middle + 4)))
    let row24 = stride(from: Snapshot.inset, to: Snapshot.inset + 160, by: 0.5).filter { pixel(modified, x: $0, y: middle).isClose(to: light[.error].rgba8(), tolerance: 24) }
    // The icon (before the gap) grows with icon.size.
    func span(_ row: [CGFloat], size: CGFloat) -> CGFloat {
      guard let first = row.first else { return .zero }
      return (row.filter { $0 < first + size + metrics.containerGap / 2 }.last ?? first) - first
    }
    #expect(span(row24, size: 24) >= span(row16, size: metrics.iconSize) + 4)
  }

  /// SEG-16 — a selected segment whose label is drawn shows the check before it, in the selected icon color, in place of its
  /// icon; an icon-only segment keeps its icon and shows no check; with a check size of 0 no check is drawn and no room is
  /// kept for it.
  @Test("SEG-16 the check before the label, in place of the icon; none icon-only or at size 0")
  func check() throws {
    let checkInk = light[.onSecondaryContainer].rgba8()
    let middle = Snapshot.inset + metrics.containerHeight / 2
    // The check's box: the content (check, gap, "Week") centred in 160.
    let plain = try Snapshot.render(chrome(width: 160))
    let checked = try Snapshot.render(chrome(selected: true, width: 160))
    let textStart = try #require(stride(from: Snapshot.inset, to: Snapshot.inset + 160, by: 0.5).first { pixel(plain, x: $0, y: middle).isClose(to: light[.onSurface].rgba8(), tolerance: 60) })
    #expect(inks(checked, checkInk, x: (textStart - metrics.containerGap - metrics.checkSize)...(textStart - metrics.containerGap), y: (middle - 6)...(middle + 6), tolerance: 30))
    #expect(!inks(plain, light[.onSurfaceVariant].rgba8(), x: (textStart - metrics.containerGap - metrics.checkSize)...(textStart - metrics.containerGap - 1), y: (middle - 6)...(middle + 6), tolerance: 30))
    // In place of the icon: the icon's solid square is not drawn while the check is.
    let square = TanreiItemIcon.image(Image(systemName: "square.fill"))
    let withIcon = TanreiSegmentEntry(title: "Week", icon: square, value: "week")
    let iconChecked = try Snapshot.render(chrome(withIcon, selected: true, width: 160))
    let iconPlain = try Snapshot.render(chrome(withIcon, width: 160))
    let iconStart = try #require(stride(from: Snapshot.inset, to: Snapshot.inset + 160, by: 0.5).first { pixel(iconPlain, x: $0, y: middle).isClose(to: light[.onSurfaceVariant].rgba8(), tolerance: 24) })
    #expect(!pixel(iconChecked, x: iconStart + 2, y: middle + 5).isClose(to: checkInk, tolerance: 24))
    // Icon only: the icon stays, no check, no gap: the icon is centred.
    let iconOnly = TanreiSegmentEntry(title: "Center", icon: square, labelHidden: true, value: "center")
    let alone = try Snapshot.render(chrome(iconOnly, selected: true, width: 160))
    #expect(pixel(alone, x: Snapshot.inset + 80, y: middle).isClose(to: checkInk, tolerance: 24))
    #expect(TanreiSegmentGeometry(entry: iconOnly, metrics: metrics).drawsCheck == false)
    // Check size 0: nothing drawn, no room — the selected content is where the unselected content is.
    var none = system
    none.segmentedButton.sizes.medium.checkSize = 0
    none.segmentedButton.conditions.selected.enabled.labelColor = .role(.onSurface)
    none.segmentedButton.conditions.selected.enabled.containerColor = TanreiPaint.none
    let zero = try Snapshot.render(chrome(selected: true, width: 160), theme: theme(none))
    #expect(zero.mismatch(against: try Snapshot.render(chrome(width: 160), theme: theme(none)), channelTolerance: Snapshot.channelTolerance) <= Snapshot.allowedMismatch)
    #expect(TanreiSegmentGeometry(entry: TanreiSegmentEntry(title: "Week"), metrics: none.segmentedButton.sizes.medium).leadWidth(.measured) == 0)
    #expect(TanreiSegmentGeometry(entry: withIcon, metrics: none.segmentedButton.sizes.medium).leadWidth(.selected) == metrics.iconSize + metrics.containerGap)
  }

  /// SEG-16 — the lead's widths: the check's room opens as it shows (re-centring the content) and the set measures a segment
  /// as if selected, the wider of the icon and the check.
  @Test("SEG-16 SEG-14 the leading glyph's room, unselected, selected and measured")
  func leadWidths() {
    var sizes = metrics
    sizes.iconSize = 18
    sizes.checkSize = 16
    let text = TanreiSegmentGeometry(entry: TanreiSegmentEntry(title: "Week"), metrics: sizes)
    #expect(text.leadWidth(.unselected) == 0 && text.leadWidth(.selected) == 16 + sizes.containerGap && text.leadWidth(.measured) == 16 + sizes.containerGap)
    let icon = TanreiSegmentGeometry(entry: TanreiSegmentEntry(title: "Week", icon: "star"), metrics: sizes)
    #expect(icon.leadWidth(.unselected) == 18 + sizes.containerGap && icon.leadWidth(.selected) == 16 + sizes.containerGap)
    #expect(icon.leadWidth(.measured) == 18 + sizes.containerGap)
    let only = TanreiSegmentGeometry(entry: TanreiSegmentEntry(title: "Star", icon: "star", labelHidden: true), metrics: sizes)
    #expect(only.leadWidth(.unselected) == 18 && only.leadWidth(.selected) == 18 && only.leadWidth(.measured) == 18)
  }

  /// SEG-17, SEG-7 — the dividers: divider.width wide between neighbours, in divider.color, from the top padding to the
  /// bottom padding, at full color beside a disabled or dimmed segment.
  @Test("SEG-17 SEG-7 the dividers keep their width, extent and color whatever the segments' states")
  func dividers() throws {
    var custom = system
    custom.segmentedButton.dividerColor = .role(.error)
    custom.segmentedButton.dividerWidth = 2
    custom.segmentedButton.setPadding = 4
    custom.segmentedButton.disabled.opacity = 0.3
    let rendered = try Snapshot.render(single(.constant("day"), disabled: [1, 2]), theme: theme(custom))
    let middle = Snapshot.inset + metrics.containerHeight / 2
    let error = light[.error].rgba8()
    let lines = runs(rendered, y: middle, of: error, tolerance: 6)
    #expect(lines.count == 2)
    let first = try #require(lines.first)
    #expect(pixel(rendered, x: first + 1.5, y: middle).isClose(to: error, tolerance: 6))
    #expect(!pixel(rendered, x: first + 2.5, y: middle).isClose(to: error, tolerance: 6))
    // From the top padding to the bottom padding, not into it.
    #expect(pixel(rendered, x: first + 1, y: Snapshot.inset + 4.5).isClose(to: error, tolerance: 6))
    #expect(!pixel(rendered, x: first + 1, y: Snapshot.inset + 3.5).isClose(to: error, tolerance: 6))
    // Beside the two disabled (dimmed) segments, the second line is still full color.
    #expect(pixel(rendered, x: lines[1] + 1, y: middle).isClose(to: error, tolerance: 6))
  }

  /// SEG-7 — a disabled segment keeps the set's outline and dividers around it, and draws its content from the disabled
  /// tokens of its condition.
  @Test("SEG-7 a disabled segment keeps its boundary and draws its disabled tokens")
  func disabledSegment() throws {
    let rendered = try Snapshot.render(single(.constant("month"), disabled: [2]))
    let outline = light[.outline].rgba8()
    let edges = runs(rendered, y: Snapshot.inset + 5, of: outline)
    #expect(edges.count == 4)
    let right = try #require(edges.last)
    let middle = Snapshot.inset + metrics.containerHeight / 2
    // The selected disabled fill (on-surface 12 %) inside the last segment.
    let fill = light[.onSurface].opacity(0.12).rgba8(over: light[.surface])
    #expect(pixel(rendered, x: right - 3, y: middle).isClose(to: fill, tolerance: 4))
    #expect(pixel(rendered, x: right + 0.5, y: middle).isClose(to: outline, tolerance: 12))
  }

  /// SEG-21 — right to left, the segments are ordered from the right (the first, selected, at the right end, with the set's
  /// rounded corners there) and each segment's content is mirrored.
  @Test("SEG-21 right to left the set is mirrored")
  func rightToLeft() throws {
    var custom = system
    custom.segmentedButton.setShape = 12
    let ltr = try Snapshot.render(single(.constant("day")), theme: theme(custom))
    let rtl = try Snapshot.render(single(.constant("day")).environment(\.layoutDirection, .rightToLeft), theme: theme(custom))
    let width = visualSize(rtl).width
    let middle = Snapshot.inset + metrics.containerHeight / 2
    let selected = light[.secondaryContainer].rgba8()
    #expect(pixel(ltr, x: Snapshot.inset + 3, y: middle).isClose(to: selected, tolerance: 4))
    #expect(pixel(rtl, x: Snapshot.inset + width - 3, y: middle).isClose(to: selected, tolerance: 4))
    #expect(!pixel(rtl, x: Snapshot.inset + 3, y: middle).isClose(to: selected, tolerance: 4))
    // The selected segment's rounded corners are the set's right ones: its top-right corner pixel is not filled.
    #expect(!pixel(rtl, x: Snapshot.inset + width - 1.5, y: Snapshot.inset + 1.5).isClose(to: selected, tolerance: 4))
    // Mirrored content: in the selected segment the check is to the right of the label.
    let checkInk = light[.onSecondaryContainer].rgba8()
    let inkXs = stride(from: Snapshot.inset + width * 2 / 3, to: Snapshot.inset + width, by: 0.5).filter { pixel(rtl, x: $0, y: middle).isClose(to: checkInk, tolerance: 60) }
    let ltrInkXs = stride(from: Snapshot.inset, to: Snapshot.inset + width / 3, by: 0.5).filter { pixel(ltr, x: $0, y: middle).isClose(to: checkInk, tolerance: 60) }
    let rtlSpan = try #require(inkXs.last) - (Snapshot.inset + width * 2 / 3)
    let ltrSpan = try #require(ltrInkXs.last) - Snapshot.inset
    #expect(abs(rtlSpan - ltrSpan) <= 3)
  }
}

// MARK: - Fixtures (one per spec fixture)

/// Draws a fixture of specs/segmented-button.spec.json as SEG-14's verify says: the set at its natural width, start-aligned
/// and vertically centred on a 400 × 96 stage, holding the fixture's segments in order; selection, value, values, size and
/// label apply to the set and each segment's props to that segment.
@MainActor
enum TanreiSegmentedButtonFixtures {
  /// The fixtures' glyph names as SF Symbols, and whether the symbol has a `.fill` form.
  static let symbols: [String: (name: String, fills: Bool)] = [
    "view_list": ("list.bullet", false), "grid_view": ("square.grid.2x2", true), "map": ("map", true),
    "format_align_left": ("text.alignleft", false), "format_align_center": ("text.aligncenter", false),
    "format_align_right": ("text.alignright", false),
  ]

  static let stage = CGSize(width: 400, height: 96)

  static func icon(_ name: String?, selected: Bool) -> TanreiItemIcon? {
    guard let name, !name.isEmpty else { return nil }
    guard let symbol = symbols[name] else { return TanreiItemIcon(name) }
    return .image(Image(systemName: selected && symbol.fills ? "\(symbol.name).fill" : symbol.name))
  }

  static func segment(_ spec: SpecItem, selected: Set<String>) -> some View {
    let value = spec.string("value") ?? ""
    let segment = TanreiSegment(spec.string("label") ?? "", icon: icon(spec.string("icon"), selected: selected.contains(value))).tag(value)
    return (spec.bool("labelHidden") == true ? segment.labelStyle(.iconOnly) : segment)
      .disabled(spec.bool("disabled") ?? false)
  }

  @ViewBuilder
  static func view(_ fixture: SpecFixture) -> some View {
    let items = fixture.items ?? []
    let size = fixture.string("size").map(TanreiSegmentedButtonSize.init(rawValue:)) ?? .medium
    let label = fixture.string("label") ?? ""
    Group {
      if fixture.string("selection") == "multiple" {
        let values = Set(fixture.strings("values") ?? [])
        TanreiSegmentedButton(label, selection: .constant(values), size: size) {
          ForEach(items.indices, id: \.self) { index in segment(items[index], selected: values) }
        }
      } else {
        let value = fixture.string("value")
        TanreiSegmentedButton(label, selection: .constant(value), size: size) {
          ForEach(items.indices, id: \.self) { index in segment(items[index], selected: Set(value.map { [$0] } ?? [])) }
        }
      }
    }
    .fixedSize(horizontal: true, vertical: false)
    .frame(width: stage.width, height: stage.height, alignment: .leading)
  }
}

@MainActor
@Suite("TanreiSegmentedButton snapshots")
struct TanreiSegmentedButtonSnapshotTests {
  /// Mirrors `fixtures` in specs/segmented-button.spec.json.
  nonisolated static let fixtures = ["single", "single-none", "multiple", "icons", "icon-only", "small", "large", "disabled", "selected-disabled"]

  static func fixture(_ id: String) throws -> SpecFixture {
    try #require(try SpecFixture.load(spec: "segmented-button").first { $0.id == id })
  }

  @Test("SEG-14 fixture matches its baseline", arguments: fixtures)
  func fixture(_ id: String) throws {
    try Snapshot.assert(TanreiSegmentedButtonFixtures.view(try Self.fixture(id)), named: id, suite: suiteName)
  }

  @Test("the fixture list is the spec's fixture list")
  func fixturesMatchSpec() throws {
    #expect(try SpecFixture.load(spec: "segmented-button").map(\.id) == Self.fixtures)
  }
}

/// One representative fixture per shipped preset, light scheme:
/// `__Snapshots__/TanreiSegmentedButtonTests/<system-id>/<fixture-id>.png`.
@MainActor
@Suite("TanreiSegmentedButton preset snapshots")
struct TanreiSegmentedButtonPresetSnapshotTests {
  /// The set with icons: the preset's set (outline or track), corners, selected condition (the check, or cupertino's raised
  /// segment with its filled icon and no check — SEG-16's and SEG-24's verify), icon size and label style.
  nonisolated static let fixtureId = "icons"
  nonisolated static let presets: [ShippedSystem] = [.m3Like, .cupertino]

  @Test("every shipped preset has one, and it is one of the spec's fixtures")
  func fixtureList() {
    #expect(Set(Self.presets + [.tanrei]) == Set(ShippedSystem.allCases))
    #expect(TanreiSegmentedButtonSnapshotTests.fixtures.contains(Self.fixtureId))
  }

  @Test("preset fixture matches its baseline", arguments: presets)
  func fixture(_ preset: ShippedSystem) throws {
    let fixture = try TanreiSegmentedButtonSnapshotTests.fixture(Self.fixtureId)
    try Snapshot.assert(TanreiSegmentedButtonFixtures.view(fixture), named: "\(preset.rawValue)/\(fixture.id)", suite: suiteName, theme: theme(preset.system))
  }
}
