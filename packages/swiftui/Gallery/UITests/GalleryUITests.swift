import XCTest

// End-to-end checks that need a real app: a hardware keyboard reaching a
// focused TanreiButton, and the accessibility tree as assistive technology sees it. Behaviour ids are from
// specs/button.spec.json.
//
// Rows are keyed `<component>.<fixture-id>` (unique across components): the component is
// `fixture.<key>`, its event count `count.<key>`, and `-focus <key>` asks for keyboard focus on it.
//
// Keyboard focus on iOS needs Full Keyboard Access; the CI command turns it on in the simulator before
// the run (see packages/swiftui/README.md → Gallery).

@MainActor
final class GalleryUITests: XCTestCase {
  override func setUp() async throws {
    continueAfterFailure = false
  }

  /// The gallery with one component's section (`-component`; the switches stay), waiting for its first fixture row.
  ///
  /// Never the whole gallery: on GitHub's macOS runner XCUITest's first query of the whole gallery's tree did not
  /// complete — "Failed to get matching snapshots: Timed out while evaluating UI query", about 150 s into every test that
  /// launched it, whichever ran first — so each test here reads one
  /// component's rows and the switches.
  private func launch(_ component: String = "button", system: String = "tanrei", focus: String? = nil, extra: [String] = []) throws -> XCUIApplication {
    let app = XCUIApplication()
    app.launchArguments = ["-system", system, "-appearance", "light", "-contrast", "standard", "-component", component]
      + (focus.map { ["-focus", $0] } ?? []) + extra
    app.launch()
    let first = try XCTUnwrap(fixtureIds(component).first)
    XCTAssertTrue(app.descendants(matching: .any).matching(identifier: "fixture.\(component).\(first)").firstMatch.waitForExistence(timeout: 20))
    return app
  }

  /// The gallery with one component's fixtures only (`-component`, `-noExplore`), waiting for its first row.
  private func launchComponent(_ name: String, system: String = "tanrei", freezingLoops: Bool = false) throws -> XCUIApplication {
    let app = XCUIApplication()
    app.launchArguments = ["-system", system, "-appearance", "light", "-contrast", "standard", "-component", name, "-noExplore", "YES"]
      + (freezingLoops ? ["-freezeLoops", "YES"] : [])
    app.launch()
    XCTAssertTrue(app.descendants(matching: .any)["fixture.\(name).\(try XCTUnwrap(fixtureIds(name).first))"].waitForExistence(timeout: 20))
    return app
  }

  private func fired(_ app: XCUIApplication, _ id: String) -> String {
    app.staticTexts["count.\(id)"].label
  }

  private func waitForFired(_ app: XCUIApplication, _ id: String, _ count: Int) -> Bool {
    let expected = NSPredicate(format: "label == %@", "fired \(count)")
    return XCTWaiter().wait(for: [expectation(for: expected, evaluatedWith: app.staticTexts["count.\(id)"])], timeout: 5) == .completed
  }

  /// Every spec SwiftUI claims to implement (`platforms.swiftui.status` other than `planned`), read from
  /// this test bundle's own copy of `specs/` — not through the app's loader, so a loader that read nothing
  /// fails here: the gallery shows every fixture of each, and no spec is left without a gallery entry.
  ///
  /// One launch per spec, its section only (`-component`, `-noExplore`): the whole gallery's tree is too large for
  /// XCUITest to query in time on GitHub's macOS runner (see `launch`), and there each check of a row cost a query of all
  /// of it. A spec without a gallery entry still shows as
  /// `unregistered.<name>` in its own section, and a spec the app could not read as `unreadable-spec` in every launch.
  func testEveryFixtureOfEveryImplementedSpecIsShown() throws {
    let urls = try XCTUnwrap(Bundle(for: Self.self).urls(forResourcesWithExtension: "json", subdirectory: "specs"))
    var implemented: [String] = []
    for url in urls.sorted(by: { $0.lastPathComponent < $1.lastPathComponent }) where url.lastPathComponent.hasSuffix(".spec.json") {
      let spec = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any], url.lastPathComponent)
      let name = try XCTUnwrap(spec["name"] as? String)
      let status = ((spec["platforms"] as? [String: Any])?["swiftui"] as? [String: Any])?["status"] as? String ?? "planned"
      guard status != "planned" else { continue }
      implemented.append(name)
      let fixtures = try XCTUnwrap(spec["fixtures"] as? [[String: Any]], name)
      let ids = try fixtures.map { try XCTUnwrap($0["id"] as? String, name) }
      let first = try XCTUnwrap(ids.first, "\(name) has no fixture")
      let app = XCUIApplication()
      app.launchArguments = ["-system", "tanrei", "-appearance", "light", "-contrast", "standard", "-component", name, "-noExplore", "YES"]
      app.launch()
      func row(_ id: String) -> XCUIElement { app.descendants(matching: .any).matching(identifier: "fixture.\(name).\(id)").firstMatch }
      let shown = row(first).waitForExistence(timeout: 20)
      let unregistered = app.descendants(matching: .any).matching(identifier: "unregistered.\(name)").firstMatch
      XCTAssertFalse(unregistered.exists, unregistered.exists ? unregistered.label : name)
      XCTAssertTrue(shown, "\(name).\(first)")
      for id in ids.dropFirst() {
        XCTAssertTrue(row(id).exists, "\(name).\(id)")
      }
      let unreadable = app.staticTexts.matching(identifier: "unreadable-spec").firstMatch
      XCTAssertFalse(unreadable.exists, unreadable.exists ? unreadable.label : "")
      if name == "button" {
        XCTAssertEqual(app.buttons["fixture.button.filled-medium"].label, "Deploy")  // the label text is the accessible name
      }
      app.terminate()
    }
    XCTAssertTrue(implemented.contains("button"), "specs read from the test bundle: \(implemented)")
  }

  /// Keyboard focus on a button: the gallery asks for it at launch (`-focus`), and shows what SwiftUI says
  /// has focus. iOS gives a button keyboard focus only under Full Keyboard Access, and on the simulator
  /// XCUITest's keyboard could not move that focus — then the keyboard tests SKIP, loudly, instead of passing without
  /// having pressed a key.
  private func requireKeyboardFocus(_ app: XCUIApplication, on id: String) throws {
    let focus = app.staticTexts["focus"]
    var attempts = 0
    while focus.label != "focus: \(id)" && attempts < 12 {
      app.typeKey(.tab, modifierFlags: [])
      attempts += 1
    }
    try XCTSkipUnless(
      focus.label == "focus: \(id)",
      "No keyboard focus on \(id) (\(focus.label)): this simulator does not give a button keyboard focus under automation.")
  }

  /// BTN-1 — Return and Space on a hardware keyboard each activate the focused button exactly once.
  func testReturnAndSpaceActivateExactlyOnce() throws {
    let app = try launch(focus: "button.filled-medium")
    try requireKeyboardFocus(app, on: "button.filled-medium")
    XCTAssertEqual(fired(app, "button.filled-medium"), "fired 0")
    app.typeKey(.return, modifierFlags: [])
    XCTAssertTrue(waitForFired(app, "button.filled-medium", 1), "Return: \(fired(app, "button.filled-medium"))")
    app.typeKey(.space, modifierFlags: [])
    XCTAssertTrue(waitForFired(app, "button.filled-medium", 2), "Space: \(fired(app, "button.filled-medium"))")
    // Exactly once each: nothing arrives late.
    Thread.sleep(forTimeInterval: 1)
    XCTAssertEqual(fired(app, "button.filled-medium"), "fired 2")
    // No other button fired.
    XCTAssertEqual(fired(app, "button.tonal-medium"), "fired 0")
  }

  /// BTN-2 — a disabled button never fires — a tap lands on it, and keys are sent after asking for focus
  /// on it (where the simulator gives no keyboard focus the keys prove nothing; the tap still does) —
  /// and assistive technology is told it is disabled.
  func testDisabledNeverFires() throws {
    let app = try launch(focus: "button.filled-disabled")
    let disabled = app.buttons["fixture.button.filled-disabled"]
    XCTAssertFalse(disabled.isEnabled)
    app.typeKey(.return, modifierFlags: [])
    app.typeKey(.space, modifierFlags: [])
    disabled.tap()
    Thread.sleep(forTimeInterval: 1)
    XCTAssertEqual(fired(app, "button.filled-disabled"), "fired 0")
  }

  /// BTN-1 by touch, under every shipped pressed-feedback: `ripple` (m3-like) watches the touch with a
  /// simultaneous gesture, which must neither swallow nor double the tap.
  func testTapFiresExactlyOnceUnderEverySystem() throws {
    for system in ["tanrei", "m3-like", "cupertino", "acme"] {
      // Button's section only: over the whole gallery one query of the tree takes about as long as `waitForFired` waits.
      let app = try launch("button", system: system)
      app.buttons["fixture.button.tonal-medium"].tap()
      XCTAssertTrue(waitForFired(app, "button.tonal-medium", 1), system)
      Thread.sleep(forTimeInterval: 0.5)
      XCTAssertEqual(fired(app, "button.tonal-medium"), "fired 1", system)
      app.terminate()
    }
  }

  // MARK: button group (specs/button-group.spec.json)

  /// BGR-6 — with a label the group is a container named by it that holds its items; without one it adds no element of its
  /// own: what carries the row's identifier is its buttons. BGR-5 — each item keeps its own semantics (a Button by its
  /// label, a toggle icon button as a switch that is on or off) and fires on its own; toggles are independent (the group
  /// keeps no selection); a disabled item is exposed as such and never fires. Under overlay, ripple and dim.
  func testButtonGroupSemanticsAndActivation() throws {
    for system in ["tanrei", "m3-like", "cupertino"] {
      let app = try launchComponent("button-group", system: system)
      func group(_ id: String) -> XCUIElement { app.descendants(matching: .any)["fixture.button-group.\(id)"] }
      // BGR-6: named.
      let named = group("standard-icon-buttons")
      XCTAssertEqual(named.label, "Post actions", "\(system): \(named.debugDescription)")
      for label in ["Edit", "Share", "Delete"] {
        XCTAssertTrue(named.buttons[label].firstMatch.exists, "\(system) \(label): \(named.debugDescription)")
      }
      // BGR-6: unnamed — no element of its own; every element carrying the row's identifier is one of its buttons.
      let unnamed = app.descendants(matching: .any).matching(identifier: "fixture.button-group.standard")
      XCTAssertEqual(unnamed.count, 3, "\(system): \(unnamed.debugDescription)")
      XCTAssertEqual(unnamed.allElementsBoundByIndex.map(\.elementType), [.button, .button, .button], system)
      XCTAssertEqual(unnamed.allElementsBoundByIndex.map(\.label), ["Cancel", "Save draft", "Publish"], system)
      // BGR-5: each item fires on its own.
      for (index, label) in ["Cancel", "Save draft", "Publish"].enumerated() {
        app.buttons[label].firstMatch.tap()
        XCTAssertTrue(waitForFired(app, "button-group.standard", index + 1), "\(system) \(label)")
      }
      // BGR-5: toggles keep their own state; the group makes none exclusive.
      let style = group("connected-icon-buttons")
      if !style.isHittable { scrollIntoView(app, style) }
      XCTAssertEqual(style.label, "Text style", "\(system): \(style.debugDescription)")
      let bold = style.descendants(matching: .any).matching(identifier: "Bold").firstMatch
      let italic = style.descendants(matching: .any).matching(identifier: "Italic").firstMatch
      XCTAssertTrue(isOn(bold) && !isOn(italic), "\(system): \(state(bold)) / \(state(italic))")
      italic.tap()
      XCTAssertTrue(waitForFired(app, "button-group.connected-icon-buttons", 1), system)
      XCTAssertTrue(isOn(bold) && isOn(italic), "\(system): \(state(bold)) / \(state(italic))")
      // BGR-3: a connected icon button is the touch target wide, its neighbour the connected gap away.
      let underline = style.descendants(matching: .any).matching(identifier: "Underline").firstMatch
      XCTAssertEqual(italic.frame.width, 48, accuracy: 0.5, "\(system): \(italic.frame)")
      XCTAssertEqual(underline.frame.minX - italic.frame.maxX, 2, accuracy: 0.5, "\(system): \(italic.frame) \(underline.frame)")
      // BGR-5, BGR-11: a disabled item keeps its place and never fires.
      let disabled = group("connected-disabled")
      if !disabled.isHittable { scrollIntoView(app, disabled) }
      let copy = disabled.buttons["Copy"].firstMatch
      XCTAssertTrue(copy.exists, "\(system): \(disabled.debugDescription)")
      XCTAssertFalse(copy.isEnabled, system)
      copy.tap()
      Thread.sleep(forTimeInterval: 0.5)
      XCTAssertEqual(fired(app, "button-group.connected-disabled"), "fired 0", system)
      app.terminate()
    }
  }

  /// BGR-1 — with larger text a connected group's Buttons grow as they do anywhere and stay one row, every item as tall as
  /// the tallest.
  func testButtonGroupGrowsWithDynamicType() throws {
    func measure(_ category: String) throws -> [CGRect] {
      let app = XCUIApplication()
      app.launchArguments = ["-system", "tanrei", "-appearance", "light", "-contrast", "standard", "-component", "button-group", "-noExplore", "YES",
        "-fixtures", "connected", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategory\(category)"]
      app.launch()
      defer { app.terminate() }
      let group = app.descendants(matching: .any)["fixture.button-group.connected"]
      XCTAssertTrue(group.waitForExistence(timeout: 20))
      return ["Cut", "Copy", "Paste"].map { group.buttons[$0].firstMatch.frame }
    }
    let regular = try measure("L")
    // Large enough for a Button to grow past the touch target, which is the height of its element (its hit area).
    let large = try measure("AccessibilityXL")
    XCTAssertGreaterThan(large[0].height, regular[0].height)
    for frames in [regular, large] {
      XCTAssertTrue(frames.allSatisfy { abs($0.height - frames[0].height) <= 1 && abs($0.midY - frames[0].midY) <= 1 }, "\(frames)")
    }
  }

  /// Every button group fixture is shown, and the screens they are on pass the accessibility audit in light and dark.
  func testButtonGroupFixturesPassTheAudit() throws {
    let ids = try fixtureIds("button-group")
    for start in stride(from: 0, to: ids.count, by: 3) {
      try auditFixtures(of: "button-group", only: Array(ids[start..<min(start + 3, ids.count)]))
    }
  }

  // MARK: icon-button (specs/icon-button.spec.json)

  private func iconButton(_ app: XCUIApplication, _ id: String) -> XCUIElement {
    app.descendants(matching: .any)["fixture.icon-button.\(id)"]
  }

  /// What assistive technology is told about a toggle icon button: the diagnostic for a failed check.
  private func state(_ element: XCUIElement) -> String {
    "type \(element.elementType.rawValue), selected \(element.isSelected), value \(String(describing: element.value))"
  }

  /// A toggle (the toggle trait) reaches XCUITest as a switch whose value is 1 while on — the selected trait is
  /// folded into it; an action is a plain button with no value.
  private func isOn(_ element: XCUIElement) -> Bool {
    element.elementType == .switch && "\(element.value ?? "")" == "1"
  }

  /// ICB-1, ICB-11 — a tap on an action fires once; a tap on a toggle flips it and fires once. The label is the
  /// accessible name; a toggle is exposed as a switch that is on or off (the toggle trait, and the selected trait while
  /// on), an action as a plain button. Under three systems (overlay, ripple, dim).
  func testIconButtonTapFiresOnceAndATogglesFlips() throws {
    for system in ["tanrei", "m3-like", "cupertino"] {
      // The icon button's section only: over the whole gallery one query of the tree takes about as long as
      // `waitForFired` waits.
      let app = try launchComponent("icon-button", system: system)
      let action = iconButton(app, "filled-medium")
      XCTAssertTrue(action.waitForExistence(timeout: 10), system)
      XCTAssertEqual(action.label, "Favorite", system)
      XCTAssertEqual(action.elementType, .button, "\(system): an action is not a toggle — \(state(action))")
      XCTAssertFalse(action.isSelected, system)
      action.tap()
      XCTAssertTrue(waitForFired(app, "icon-button.filled-medium", 1), system)

      let toggle = iconButton(app, "filled-unselected")
      XCTAssertEqual(toggle.label, "Favorite", system)
      XCTAssertEqual(toggle.elementType, .switch, "\(system): \(state(toggle))")
      XCTAssertFalse(isOn(toggle), "\(system): \(state(toggle))")
      XCTAssertTrue(isOn(iconButton(app, "filled-selected")), "\(system): \(state(iconButton(app, "filled-selected")))")
      toggle.tap()
      XCTAssertTrue(waitForFired(app, "icon-button.filled-unselected", 1), system)
      XCTAssertTrue(isOn(toggle), "\(system): a toggle that was off is on after one tap — \(state(toggle))")
      toggle.tap()
      XCTAssertTrue(waitForFired(app, "icon-button.filled-unselected", 2), system)
      XCTAssertFalse(isOn(toggle), "\(system): and off again after the second — \(state(toggle))")
      Thread.sleep(forTimeInterval: 0.5)
      XCTAssertEqual(fired(app, "icon-button.filled-medium"), "fired 1", system)
      app.terminate()
    }
  }

  /// ICB-2 — a disabled icon button never fires and is exposed as disabled.
  func testIconButtonDisabledNeverFires() throws {
    let app = try launch("icon-button", focus: "icon-button.standard-disabled")
    let disabled = iconButton(app, "standard-disabled")
    XCTAssertTrue(disabled.waitForExistence(timeout: 10))
    XCTAssertFalse(disabled.isEnabled)
    app.typeKey(.return, modifierFlags: [])
    app.typeKey(.space, modifierFlags: [])
    disabled.tap()
    Thread.sleep(forTimeInterval: 1)
    XCTAssertEqual(fired(app, "icon-button.standard-disabled"), "fired 0")
  }

  /// ICB-1 — Return and Space on a hardware keyboard each activate the focused icon button exactly once.
  func testIconButtonReturnAndSpaceActivateExactlyOnce() throws {
    let app = try launch("icon-button", focus: "icon-button.filled-medium")
    try requireKeyboardFocus(app, on: "icon-button.filled-medium")
    app.typeKey(.return, modifierFlags: [])
    XCTAssertTrue(waitForFired(app, "icon-button.filled-medium", 1))
    app.typeKey(.space, modifierFlags: [])
    XCTAssertTrue(waitForFired(app, "icon-button.filled-medium", 2))
    Thread.sleep(forTimeInterval: 1)
    XCTAssertEqual(fired(app, "icon-button.filled-medium"), "fired 2")
  }

  /// The touch-watching gesture of `ripple` must not stop a list from scrolling when the drag starts ON a button.
  ///
  /// The gallery reports what its window received of the drag (`-touchProbe`, `touch-probe`), so this test tells
  /// apart the two ways the list can stay still:
  /// - the app received the whole drag — ended, not cancelled, moved, most of the 200 pt — and did not scroll:
  ///   the product failed, and the test fails at once, never retried;
  /// - the drag did not reach the app intact (XCUITest's synthesis stalled for seconds on a loaded runner): the
  ///   premise of the test is missing, so the drag is replayed on a fresh launch, at most `attempts` times, and
  ///   every replay is logged.
  func testAListStillScrollsFromAButtonUnderRipple() throws {
    let attempts = 3
    var undelivered: [String] = []
    for attempt in 1...attempts {
      // Button's section only: with every component above it, the button sits low enough on the screen that the drag
      // starts in the system's bottom-edge gesture area and the touch is cancelled (seen when the badge joined).
      let app = try launch("button", system: "m3-like", extra: ["-touchProbe", "YES"])
      let probe = app.staticTexts["touch-probe"]
      XCTAssertEqual(probe.label, "touch: none")
      let button = app.buttons["fixture.button.filled-large"]
      let before = button.frame.minY
      let start = button.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
      start.press(forDuration: 0.05, thenDragTo: start.withOffset(CGVector(dx: 0, dy: -200)))
      // The probe reports once the touch has ended; the drag is only judged once it has.
      // (A drag that never arrived leaves it at "none": that is judged below, not here.)
      _ = XCTWaiter().wait(for: [expectation(for: NSPredicate(format: "label != %@", "touch: none"), evaluatedWith: probe)], timeout: 10)
      let report = probe.label
      if Self.isWholeDrag(report) {
        XCTAssertLessThan(button.frame.minY, before - 50, "the gallery did not scroll although the app received the whole drag (\(report))")
        XCTAssertEqual(fired(app, "button.filled-large"), "fired 0")  // a scroll is not a tap
        return
      }
      undelivered.append("attempt \(attempt): \(report)")
      print("testAListStillScrollsFromAButtonUnderRipple: the drag did not reach the app intact — \(report); replaying on a fresh launch")
      app.terminate()
    }
    XCTFail("the simulator never delivered the drag intact in \(attempts) attempts: \(undelivered)")
  }

  /// `touch: #N ended moves=M dy=D …` with at least one move and most of the 200 pt upward drag.
  private static func isWholeDrag(_ label: String) -> Bool {
    guard let touch = touchReport(label), touch.end == "ended", let moves = touch.values["moves"], let dy = touch.values["dy"] else { return false }
    return moves > 0 && dy <= -150
  }

  /// A touch probe's report (`GalleryTouchReport.label` behind the caption's `touch: `): how the touch ended (`ended`,
  /// `cancelled`) and its `key=value` fields (`moves`, `dx`, `dy`, `ms`); `nil` while no touch has been reported.
  private static func touchReport(_ label: String) -> (end: String, values: [String: Int])? {
    let fields = label.split(separator: " ").map(String.init)
    guard let end = fields.first(where: { $0 == "ended" || $0 == "cancelled" }) else { return nil }
    var values: [String: Int] = [:]
    for field in fields {
      let pair = field.split(separator: "=").map(String.init)
      if pair.count == 2, let value = Int(pair[1]) { values[pair[0]] = value }
    }
    return (end, values)
  }

  /// "Text must remain readable at 200% text size: the container grows, the label never truncates."
  /// Tanrei scales type itself — every token size by the factor the platform scales a custom font of that
  /// size "relative to body" — so this is measured, not assumed, and at EVERY step: scaling a constant 1
  /// with `@ScaledMetric` is rounded to a pixel and does nothing from `XS` to `XL`.
  func testTheButtonGrowsWithDynamicType() throws {
    func measure(_ category: String) throws -> (button: CGSize, platformText: CGSize, namedText: CGSize) {
      let app = try launch(extra: ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategory\(category)"])
      defer { app.terminate() }
      XCTAssertEqual(app.buttons["fixture.button.filled-medium"].label, "Deploy")
      return (app.buttons["fixture.button.filled-medium"].frame.size, app.staticTexts["focus"].frame.size, app.staticTexts["named-family"].frame.size)
    }
    let regular = try measure("L")
    let large = try measure("AccessibilityXL")
    // The frame is the HIT area (at least the minimum target), so the height starts at 48, not at the
    // 36pt container; the width has no such floor.
    XCTAssertGreaterThan(large.button.width, regular.button.width * 1.5, "\(regular) → \(large)")
    XCTAssertGreaterThan(large.button.height, regular.button.height, "\(regular) → \(large)")

    // One step down and one step up change the text too — the platform font and a named family alike.
    let small = try measure("S")
    let extraLarge = try measure("XL")
    for (name, text) in [("platform font", \(button: CGSize, platformText: CGSize, namedText: CGSize).platformText), ("named family", \.namedText)] {
      XCTAssertLessThan(small[keyPath: text].width, regular[keyPath: text].width, name)
      XCTAssertLessThan(regular[keyPath: text].width, extraLarge[keyPath: text].width, name)
      XCTAssertLessThan(small[keyPath: text].height, regular[keyPath: text].height, name)
      XCTAssertLessThan(regular[keyPath: text].height, extraLarge[keyPath: text].height, name)
    }
    XCTAssertLessThan(small.button.width, regular.button.width)
    XCTAssertLessThan(regular.button.width, extraLarge.button.width)

    // (These frames are the glyph boxes. That the LINE BOX is the token line height × the same factor,
    // at all twelve sizes, is what TanreiDynamicTypeTests proves on the simulator.)
  }

  /// The accessibility audit of the default system, light and dark: Dynamic Type, contrast, hit regions, clipped text,
  /// element descriptions, traits.
  func testAccessibilityAuditOfTheDefaultSystem() throws {
    for appearance in ["light", "dark"] {
      let app = XCUIApplication()
      // Button's section only: over the whole gallery the audit does not complete in time; the first screen — the
      // switches and Button's fixtures — is the same.
      app.launchArguments = ["-system", "tanrei", "-appearance", appearance, "-contrast", "standard", "-component", "button"]
      app.launch()
      XCTAssertTrue(app.buttons["fixture.button.filled-medium"].waitForExistence(timeout: 20))
      // As every audit here: once the screen stands still after the launch (`waitUntilStill`).
      waitUntilStill(app)
      var issues: [String] = []
      // Every audit, Dynamic Type included. That one is behavioural: it flags a text whose size does not
      // follow the content size category (a `Font.custom(_:fixedSize:)` text is "unsupported"), and it
      // reports a factor from `@ScaledMetric` of 1 as "partially unsupported": that is rounded to a pixel and
      // stays 1.0 from XS to XL.
      try app.performAccessibilityAudit { issue in
        let element = issue.element
        // WCAG 1.4.3 exempts inactive components from the contrast minimum, and the disabled tokens are
        // deliberately faint (BTN-6): a contrast finding on a DISABLED element is not an issue.
        if issue.auditType == .contrast, let element, !element.isEnabled { return true }
        // "Text clipped … may be clipped at larger Dynamic Type sizes" is a guess of the audit's, and it
        // guesses wrong for text with TRACKING — which every Tanrei text style has: plain SwiftUI —
        // `Text(long).font(.footnote).tracking(0.5)`, no Tanrei in it — gets the same finding, the same
        // text without tracking does not, and at none of the twelve sizes is anything clipped on screen.
        // WHICH caption it picks differs from machine to machine (locally the wrapped "behavior" caption,
        // on CI the one-line "small · 32pt"), so the exemption covers the gallery's own captions — static
        // text — and nothing else: a BUTTON whose label the audit believes clipped still fails this test.
        if issue.auditType == .textClipped, element?.elementType == .staticText { return true }
        issues.append("[\(appearance)] \(issue.compactDescription) — \(element?.identifier ?? "?") \(element?.label ?? "") — \(issue.detailedDescription)")
        return true  // collected here, reported together below
      }
      XCTAssertEqual(issues, [], "accessibility audit")
      app.terminate()
    }
  }

  // MARK: scrolling helpers

  /// How far above the window's bottom a row must end to count as on screen (the home indicator, the edge effect).
  static let bottomMargin: CGFloat = 80

  /// Scrolls the gallery until `element` is wholly on screen, away from the bottom edge (the audit audits what is on
  /// screen only). Slow swipes move less than a screen, so a row is never skipped over.
  private func scrollIntoView(_ app: XCUIApplication, _ element: XCUIElement, file: StaticString = #filePath, line: UInt = #line) {
    let gallery = app.scrollViews["gallery"]
    let window = app.windows.firstMatch.frame
    var swipes = 0
    while element.frame.maxY > window.maxY - Self.bottomMargin && swipes < 40 {
      gallery.swipeUp(velocity: .slow)
      swipes += 1
    }
    // The audit reads the screen: wait until the scroll has come to rest.
    var last = element.frame
    for _ in 0..<20 {
      Thread.sleep(forTimeInterval: 0.2)
      if element.frame == last { break }
      last = element.frame
    }
    XCTAssertTrue(window.contains(element.frame), "\(element.identifier) is not on screen: \(element.frame)", file: file, line: line)
  }

  /// `performAccessibilityAudit()` of what is on screen, with the exemptions of `testAccessibilityAuditOfTheDefaultSystem`,
  /// counting only the issues of elements inside `rows` (the component's fixtures on this screen). Issues of other rows
  /// on the same screen belong to their own component's audit; they are printed, not dropped.
  private func audit(
    _ app: XCUIApplication, _ where: String, component: String, rows: [CGRect], types: XCUIAccessibilityAuditType = .all,
    exempt: @escaping (XCUIAccessibilityAuditIssue) -> Bool = { _ in false }
  ) throws -> [String] {
    var issues: [String] = []
    try app.performAccessibilityAudit(for: types) { issue in
      let element = issue.element
      if issue.auditType == .contrast, let element, !element.isEnabled { return true }
      if issue.auditType == .textClipped, element?.elementType == .staticText { return true }
      if exempt(issue) { return true }
      let text = "[\(`where`)] \(issue.compactDescription) — \(element?.identifier ?? "?") \(element?.label ?? "") \(element.map { "\($0.elementType.rawValue) enabled \($0.isEnabled) at \($0.frame)" } ?? "") — \(issue.detailedDescription)"
      let isRow = element?.identifier.hasPrefix("fixture.\(component).") ?? false
      if !isRow, let frame = element?.frame, !rows.contains(where: { $0.intersects(frame) }) {
        print("Audit issue outside the audited component: \(text)")
        return true
      }
      issues.append(text)
      return true
    }
    return issues
  }

  /// Every fixture of a spec, whatever SwiftUI's status in it: the rows `fixture.<name>.<id>`, from the UI test
  /// bundle's own copy of the spec.
  private func fixtureIds(_ name: String) throws -> [String] {
    let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "\(name).spec", withExtension: "json", subdirectory: "specs"))
    let spec = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any])
    let fixtures = try XCTUnwrap(spec["fixtures"] as? [[String: Any]])
    return fixtures.compactMap { $0["id"] as? String }
  }

  /// One prop of every fixture of a spec, keyed `<name>.<fixture-id>`.
  private func fixtureProps(_ name: String, _ prop: String) throws -> [String: String] {
    let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "\(name).spec", withExtension: "json", subdirectory: "specs"))
    let spec = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any])
    let fixtures = try XCTUnwrap(spec["fixtures"] as? [[String: Any]])
    var props: [String: String] = [:]
    for fixture in fixtures {
      if let id = fixture["id"] as? String, let value = (fixture["props"] as? [String: Any])?[prop] as? String { props["\(name).\(id)"] = value }
    }
    return props
  }

  /// Waits until the app's screen stands still — two screenshots `interval` apart identical: no scroll, transition or
  /// animation still running — for at most `timeout` seconds, and says whether it did. `performAccessibilityAudit()` reads
  /// the screen as it is drawn and does not complete while it keeps changing;
  /// nothing else made the audits below wait for the screen after a launch.
  @discardableResult
  private func waitUntilStill(_ app: XCUIApplication, timeout: TimeInterval = 10, interval: TimeInterval = 0.25) -> Bool {
    let deadline = Date().addingTimeInterval(timeout)
    var last = app.screenshot().pngRepresentation
    while Date() < deadline {
      Thread.sleep(forTimeInterval: interval)
      let next = app.screenshot().pngRepresentation
      if next == last { return true }
      last = next
    }
    return false
  }

  /// The gallery showing the fixtures `ids` of `name` alone — no switches, no exploration rows (`-component`, `-noExplore`,
  /// `-noSwitches`, `-fixtures`) — in `appearance`, once its first row exists and its screen stands still.
  private func launchScreen(_ name: String, _ ids: [String], appearance: String, freezingLoops: Bool) throws -> XCUIApplication {
    let app = XCUIApplication()
    // Only this component's fixtures: over the whole gallery — or a screen scrolled far down it — the audit does not
    // complete in time. And it never completes while a view redraws
    // every frame: looping animations are frozen for it.
    app.launchArguments = [
      "-system", "tanrei", "-appearance", appearance, "-contrast", "standard", "-component", name, "-noExplore", "YES",
      "-noSwitches", "YES", "-fixtures", ids.joined(separator: ","),
    ] + (freezingLoops ? ["-freezeLoops", "YES"] : [])
    app.launch()
    XCTAssertTrue(app.descendants(matching: .any)["fixture.\(name).\(try XCTUnwrap(ids.first))"].waitForExistence(timeout: 20))
    if !waitUntilStill(app) {
      // Not a failure of its own: the audit then runs on the moving screen, as it did before this wait, and reports what it
      // reports (or does not complete in time) — this line says why.
      print("auditFixtures: \(appearance) \(name) [\(ids.joined(separator: ", "))] did not stand still within 10 s of its launch")
    }
    return app
  }

  /// The rows of the fixtures `ids` of `name` in `app`, in order, each shown. A component with no element of its own (an
  /// unnamed button group) hands the row's identifier to each of its elements: the row is where the first of them is.
  private func fixtureRows(_ app: XCUIApplication, _ name: String, _ ids: [String]) -> [XCUIElement] {
    let rows = ids.map { app.descendants(matching: .any)["fixture.\(name).\($0)"].firstMatch }
    for (id, row) in zip(ids, rows) { XCTAssertTrue(row.exists, "\(name).\(id)") }
    return rows
  }

  /// Whether a row is wholly on the first screen: below the window's top, and `bottomMargin` above its bottom.
  private func isOnScreen(_ frame: CGRect, in window: CGRect) -> Bool {
    frame.minY >= window.minY && frame.maxY <= window.maxY - Self.bottomMargin
  }

  /// The audit of the one screen `app` shows, which must hold every row of `ids` wholly: it is never scrolled.
  private func auditScreen(
    _ app: XCUIApplication, _ name: String, _ ids: [String], appearance: String, types: XCUIAccessibilityAuditType,
    exempt: @escaping (XCUIAccessibilityAuditIssue) -> Bool
  ) throws -> [String] {
    let window = app.windows.firstMatch.frame
    let frames = fixtureRows(app, name, ids).map(\.frame)
    for (id, frame) in zip(ids, frames) {
      XCTAssertTrue(isOnScreen(frame, in: window), "\(appearance) \(name).\(id) is not wholly on the first screen (\(frame) in \(window)); it is never scrolled for the audit")
    }
    return try audit(app, "\(appearance) \(name): \(ids.joined(separator: ", "))", component: name, rows: frames, types: types, exempt: exempt)
  }

  /// Every fixture row of `name` (or of those `only` names) is shown, and the accessibility audit of the screen each is on
  /// is clean, in light and dark — never on a screen reached by scrolling. After a scroll the audit misreports ('Contrast
  /// failed' on texts of 12:1 and more, the gallery's own caption included; "Potentially inaccessible text" with no
  /// element) or does not complete in time; a crowded first screen can time out too (`perLaunch`, `waitUntilStill`).
  ///
  /// The rows are dealt into screens by measuring them, not by assuming their heights. The gallery is launched without its
  /// switches (`-noSwitches`), showing the rows still to audit — at most `perLaunch` of them, fewer elements for an audit
  /// that is slow to complete —; the leading rows wholly on its first screen (`isOnScreen`) are one screen, and when some
  /// are not, it is launched again with those alone, so that nothing else is on the screen audited. A row that is not
  /// wholly on the first screen even alone fails the test. Dark audits the same screens. Every screen is audited once it
  /// stands still (`waitUntilStill`).
  private func auditFixtures(
    of name: String, freezingLoops: Bool = false, types: XCUIAccessibilityAuditType = .all, only: [String]? = nil,
    perLaunch: Int = .max, exempt: @escaping (XCUIAccessibilityAuditIssue) -> Bool = { _ in false },
    runnerOnly: RunnerOnlyAuditFinding? = nil
  ) throws {
    var issues: [String] = []
    var pending = try fixtureIds(name).filter { only?.contains($0) ?? true }
    XCTAssertFalse(pending.isEmpty, "\(name): no fixture to audit (\(only ?? []))")
    var screens: [[String]] = []
    while !pending.isEmpty {
      let candidates = Array(pending.prefix(max(perLaunch, 1)))
      var app = try launchScreen(name, candidates, appearance: "light", freezingLoops: freezingLoops)
      let window = app.windows.firstMatch.frame
      let frames = fixtureRows(app, name, candidates).map(\.frame)
      let fitting = zip(candidates, frames).prefix(while: { isOnScreen($0.1, in: window) }).map { $0.0 }
      if fitting.isEmpty {
        XCTFail("light \(name).\(candidates[0]) is not wholly on the first screen even alone (\(frames[0]) in \(window), \(Self.bottomMargin) pt above its bottom): it cannot be audited without a scroll")
        app.terminate()
        return
      }
      if fitting.count < candidates.count {
        app.terminate()
        app = try launchScreen(name, fitting, appearance: "light", freezingLoops: freezingLoops)
      }
      issues += try auditScreen(app, name, fitting, appearance: "light", types: types, exempt: exempt)
      app.terminate()
      screens.append(fitting)
      pending.removeFirst(fitting.count)
    }
    for screen in screens {
      let app = try launchScreen(name, screen, appearance: "dark", freezingLoops: freezingLoops)
      issues += try auditScreen(app, name, screen, appearance: "dark", types: types, exempt: exempt)
      app.terminate()
    }
    // Every finding fails the test, except one GitHub's macOS runner alone reports, which is an expected failure there.
    let onTheRunnerOnly = issues.filter { runnerOnly?.matches($0) ?? false }
    XCTAssertEqual(issues.filter { !onTheRunnerOnly.contains($0) }, [], "accessibility audit of \(name)")
    if let runnerOnly {
      // An expected failure must not end the test: the audits of the next fixtures (a caller's loop) still run.
      let continuing = continueAfterFailure
      continueAfterFailure = true
      XCTExpectFailure("\(runnerOnly.cause): \(runnerOnly.why)", strict: false) {
        XCTAssertEqual(onTheRunnerOnly, [], "accessibility audit of \(name): findings reported on GitHub's macOS runner only")
      }
      continueAfterFailure = continuing
    }
  }

  /// An audit finding that GitHub's macOS runner reports and the Mac these tests were written on does not, marked as an
  /// expected failure (not a required one: a clean audit passes too) — the one exception to "never quarantine";
  /// `cause` names its root cause. Only the findings `matches` accepts are expected; every other finding still fails.
  private struct RunnerOnlyAuditFinding {
    let cause: String
    let why: String
    let matches: @Sendable (String) -> Bool

    /// "Potentially inaccessible text" with no element (`— ?`, see `audit`): on the runner the audit reports it on
    /// screens of the time picker, text field, FAB menu, divider, menu, date picker, progress indicator, list, search and
    /// snackbar sections — on a different row from run to run, mostly on screens reached by scrolling (which the audits
    /// do not audit), sometimes on a first screen (the menu's).
    static var inaccessibleTextWithoutElement: RunnerOnlyAuditFinding {
      RunnerOnlyAuditFinding(
        cause: "the runner's accessibility audit",
        why: "GitHub's macOS runner reports \"Potentially inaccessible text\" with no element on this section's screens; the Mac the audit was written on does not",
        matches: { $0.contains("] Potentially inaccessible text — ? ") })
    }
  }

  // MARK: checkbox (specs/checkbox.spec.json)

  /// A selection control reaches XCUITest as a switch (the toggle trait) whose value is 1 while on and 0 while off —
  /// or the value the control states itself ("mixed").
  private func toggleValue(_ element: XCUIElement) -> String {
    "\(element.value ?? "")"
  }

  /// CHK-14 — role (the toggle trait: a switch to XCUITest), on / off, mixed while indeterminate; CHK-16 — the label is
  /// the accessible name, visible or not; CHK-1 — a tap on the box or on the label switches it once, and an
  /// indeterminate one becomes checked (CHK-2); CHK-3 — disabled: exposed as such, never switches. Under three systems
  /// (overlay, ripple, dim).
  func testCheckboxSemanticsAndActivation() throws {
    for system in ["tanrei", "m3-like", "cupertino"] {
      let app = XCUIApplication()
      app.launchArguments = ["-system", system, "-appearance", "light", "-contrast", "standard", "-component", "checkbox", "-noExplore", "YES"]
      app.launch()
      func checkbox(_ id: String) -> XCUIElement { app.descendants(matching: .any)["fixture.checkbox.\(id)"] }
      XCTAssertTrue(checkbox("unselected").waitForExistence(timeout: 20), system)
      let labels = try fixtureProps("checkbox", "label")
      for id in try fixtureIds("checkbox") {
        let element = checkbox(id)
        XCTAssertTrue(element.exists, "\(system) \(id)")
        XCTAssertEqual(element.label, labels["checkbox.\(id)"], "\(system) \(id): the label is the name")
        XCTAssertEqual(element.elementType, .switch, "\(system) \(id): \(state(element))")
      }
      XCTAssertEqual(toggleValue(checkbox("unselected")), "0", system)
      XCTAssertEqual(toggleValue(checkbox("selected")), "1", system)
      XCTAssertEqual(toggleValue(checkbox("label-hidden")), "1", system)
      XCTAssertEqual(toggleValue(checkbox("indeterminate")), "mixed", system)
      XCTAssertEqual(toggleValue(checkbox("error-indeterminate")), "mixed", system)
      XCTAssertFalse(checkbox("disabled-selected").isEnabled, system)
      XCTAssertTrue(checkbox("error-selected").isEnabled, system)

      // A tap on the box.
      let unselected = checkbox("unselected")
      unselected.coordinate(withNormalizedOffset: CGVector(dx: 0, dy: 0.5)).withOffset(CGVector(dx: 14, dy: 0)).tap()
      XCTAssertTrue(waitForFired(app, "checkbox.unselected", 1), system)
      XCTAssertEqual(toggleValue(unselected), "1", "\(system): on after one tap")
      // A tap on the label, far from the box.
      unselected.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5)).tap()
      XCTAssertTrue(waitForFired(app, "checkbox.unselected", 2), system)
      XCTAssertEqual(toggleValue(unselected), "0", "\(system): off after a tap on its label")
      // CHK-2: indeterminate becomes checked.
      checkbox("indeterminate").tap()
      XCTAssertTrue(waitForFired(app, "checkbox.indeterminate", 1), system)
      XCTAssertEqual(toggleValue(checkbox("indeterminate")), "1", system)
      // CHK-3: disabled never switches.
      checkbox("disabled-unselected").tap()
      Thread.sleep(forTimeInterval: 0.5)
      XCTAssertEqual(fired(app, "checkbox.disabled-unselected"), "fired 0", system)
      XCTAssertEqual(fired(app, "checkbox.unselected"), "fired 2", system)
      app.terminate()
    }
  }

  /// Every checkbox fixture is shown, and the screens they are on pass the accessibility audit in light and dark.
  func testCheckboxFixturesPassTheAudit() throws {
    try auditFixtures(of: "checkbox")
  }

  // MARK: radio-button (specs/radio-button.spec.json)

  /// RAD-16 — iOS has no radio role: an option is a button, selected while chosen, whose value is its position in its
  /// group; the group is a container named by the product (the fixture's `name`). RAD-18 — the label is the option's
  /// name, visible or not. RAD-1 / RAD-2 — a tap selects once, a tap on the selected option does nothing; RAD-3 — the
  /// other options of the group unselect; RAD-6 — a disabled option is exposed as such and never selects.
  func testRadioButtonSemanticsAndActivation() throws {
    for system in ["tanrei", "m3-like", "cupertino"] {
      let app = XCUIApplication()
      app.launchArguments = ["-system", system, "-appearance", "light", "-contrast", "standard", "-component", "radio-button"]
      app.launch()
      func group(_ id: String) -> XCUIElement { app.descendants(matching: .any)["fixture.radio-button.\(id)"] }
      XCTAssertTrue(group("unselected").waitForExistence(timeout: 20), system)
      let names = try fixtureProps("radio-button", "name")
      for id in try fixtureIds("radio-button") {
        XCTAssertEqual(group(id).label, names["radio-button.\(id)"], "\(system) \(id): the group is named by the product")
        let option = group(id).buttons["Weekly"]
        XCTAssertTrue(option.exists, "\(system) \(id)")
        XCTAssertEqual("\(option.value ?? "")", "1 of 1", "\(system) \(id)")
        XCTAssertEqual(option.isSelected, ["selected", "disabled-selected", "label-hidden"].contains(id), "\(system) \(id)")
        XCTAssertEqual(option.isEnabled, !id.hasPrefix("disabled"), "\(system) \(id)")
      }
      let unselected = group("unselected").buttons["Weekly"]
      unselected.tap()
      XCTAssertTrue(waitForFired(app, "radio-button.unselected", 1), system)
      XCTAssertTrue(unselected.isSelected, system)
      unselected.tap()  // RAD-2
      group("disabled-unselected").buttons["Weekly"].tap()  // RAD-6
      Thread.sleep(forTimeInterval: 0.5)
      XCTAssertEqual(fired(app, "radio-button.unselected"), "fired 1", system)
      XCTAssertEqual(fired(app, "radio-button.disabled-unselected"), "fired 0", system)

      // The group of three (RAD-3, RAD-16).
      let three = group("group")
      if !three.isHittable { scrollIntoView(app, three) }
      XCTAssertEqual(three.label, "Email frequency", system)
      let daily = three.buttons["Daily"], weekly = three.buttons["Weekly"], never = three.buttons["Never"]
      XCTAssertEqual(["\(daily.value ?? "")", "\(weekly.value ?? "")", "\(never.value ?? "")"], ["1 of 3", "2 of 3", "3 of 3"], system)
      XCTAssertTrue(daily.isSelected && !weekly.isSelected, system)
      weekly.tap()
      XCTAssertTrue(waitForFired(app, "radio-button.group", 1), system)
      XCTAssertTrue(weekly.isSelected && !daily.isSelected, "\(system): selecting one unselects the others")
      XCTAssertFalse(never.isEnabled, system)
      never.tap()
      Thread.sleep(forTimeInterval: 0.5)
      XCTAssertEqual(fired(app, "radio-button.group"), "fired 1", system)
      XCTAssertTrue(weekly.isSelected && !never.isSelected, system)
      app.terminate()
    }
  }

  /// Every radio button fixture is shown, and the screens they are on pass the accessibility audit in light and dark.
  func testRadioButtonFixturesPassTheAudit() throws {
    try auditFixtures(of: "radio-button")
  }

  // MARK: search (specs/search.spec.json)

  /// The elements of a search row, in reading order (the row's identifier lands on each of them).
  private func searchElements(_ app: XCUIApplication, _ id: String) -> [XCUIElement] {
    app.descendants(matching: .any).matching(identifier: "fixture.search.\(id)").allElementsBoundByIndex
  }

  /// SRC-24 — the input is a search field named by label, never by the placeholder; the clear button named by clearLabel;
  /// SRC-25 — the slots' icon buttons by their own labels, in reading order around the input; SRC-26 — disabled is exposed;
  /// the suggestions are buttons named by their headline with their position; SRC-11 — the full-screen view's back button is
  /// named by backLabel.
  func testSearchSemantics() throws {
    let app = try launchComponent("search")
    let bar = app.searchFields.matching(identifier: "fixture.search.bar").firstMatch
    XCTAssertTrue(bar.waitForExistence(timeout: 20), app.debugDescription)
    XCTAssertEqual(bar.label, "Search mail")
    XCTAssertEqual(searchElements(app, "bar").count, 1, "the glyph is hidden: \(searchElements(app, "bar").map(\.debugDescription))")
    XCTAssertEqual(searchElements(app, "bar-value").map(\.label), ["Search mail", "Clear search"])
    XCTAssertEqual(searchElements(app, "bar-value").map(\.elementType), [.searchField, .button])
    XCTAssertEqual(searchElements(app, "bar-slots").map(\.label), ["menu", "Search mail", "mic", "account_circle"])
    let disabled = app.searchFields.matching(identifier: "fixture.search.bar-disabled").firstMatch
    XCTAssertFalse(disabled.isEnabled)
    // The suggestions are a container named by the label (it carries the row's identifier), holding the buttons.
    let docked = try XCTUnwrap(searchElements(app, "docked").first { $0.buttons["invoices"].exists }, app.debugDescription)
    XCTAssertEqual(docked.label, "Search mail")
    let invoices = docked.buttons["invoices"]
    if !invoices.isHittable { scrollIntoView(app, invoices) }
    XCTAssertEqual("\(invoices.value ?? "")", "1 of 3")
    XCTAssertEqual("\(docked.buttons["Invoices"].value ?? "")", "3 of 3")
    // The full-screen view is a container named by the label, with its back button named by backLabel.
    let fullScreen = try XCTUnwrap(searchElements(app, "full-screen").first { $0.buttons["Back"].exists }, app.debugDescription)
    XCTAssertEqual(fullScreen.label, "Search mail")
    let back = fullScreen.buttons["Back"]
    if !back.isHittable { scrollIntoView(app, back) }
    XCTAssertTrue(fullScreen.searchFields["Search mail"].exists)
  }

  /// SRC-5 — typing opens the docked view; SRC-15 — a tap on a suggestion chooses it (select, then the view closes); SRC-10 — the
  /// clear button empties the value; SRC-9 / SRC-11 — a tap on a full-screen search's bar presents the view with its back button,
  /// typing there filters, a choice closes it, and back closes it.
  func testSearchTypingChoosingAndClearing() throws {
    let app = XCUIApplication()
    // One fixture only, so that no in-place view (with its own suggestions and back button) is on screen.
    app.launchArguments = ["-system", "tanrei", "-appearance", "light", "-contrast", "standard", "-component", "search", "-fixtures", "bar"]
    app.launch()
    // Full-screen first: its row is above the docked one (the docked search is the last row: its view opens over
    // what follows it in its own container only).
    let full = app.searchFields.matching(identifier: "fixture.search.live-full-screen").firstMatch
    XCTAssertTrue(full.waitForExistence(timeout: 20))
    full.swipeUpUntilVisible(in: app)
    full.tap()
    let back = app.buttons["Back"]
    XCTAssertTrue(back.waitForExistence(timeout: 5), app.debugDescription)
    app.typeText("hol")
    let holiday = app.buttons["holiday photos"]
    XCTAssertTrue(holiday.waitForExistence(timeout: 5), app.debugDescription)
    holiday.tap()
    XCTAssertTrue(waitForGone(back), "the view closes after a choice")
    XCTAssertTrue(waitForFired(app, "search.live-full-screen", 1), fired(app, "search.live-full-screen"))
    XCTAssertEqual("\(full.value ?? "")", "holiday photos")
    full.tap()
    XCTAssertTrue(back.waitForExistence(timeout: 5))
    back.tap()
    XCTAssertTrue(waitForGone(back), "back closes the view")
    XCTAssertEqual(fired(app, "search.live-full-screen"), "fired 1")

    // Docked.
    let docked = app.searchFields.matching(identifier: "fixture.search.live-docked").firstMatch
    docked.swipeUpUntilVisible(in: app)
    docked.tap()
    docked.typeText("inv")
    let suggestion = app.buttons["invoice template"]
    XCTAssertTrue(suggestion.waitForExistence(timeout: 5), app.debugDescription)
    XCTAssertEqual("\(suggestion.value ?? "")", "2 of 2")
    // A touch where the row is drawn. (XCUITest's own hit test calls the row "not hittable": it answers for the bar's overlay
    // with another element; the touch itself reaches the row.)
    suggestion.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
    XCTAssertTrue(waitForFired(app, "search.live-docked", 1), fired(app, "search.live-docked"))
    XCTAssertTrue(waitForGone(suggestion), "the view closes after a choice")
    XCTAssertEqual("\(docked.value ?? "")", "invoice template")
    // SRC-10: clear.
    let clear = app.buttons.matching(identifier: "fixture.search.live-docked").matching(NSPredicate(format: "label == 'Clear search'")).firstMatch
    clear.tap()
    XCTAssertTrue(waitForGone(clear), "the clear button goes with the value")
    XCTAssertNotEqual("\(docked.value ?? "")", "invoice template")
    XCTAssertEqual(fired(app, "search.live-docked"), "fired 1")
  }

  /// SRC-28 — heights are minimums: with larger text the bar's input grows (its value stays on one line).
  func testSearchGrowsWithDynamicType() throws {
    func measure(_ category: String) throws -> CGRect {
      let app = XCUIApplication()
      app.launchArguments = ["-system", "tanrei", "-appearance", "light", "-contrast", "standard", "-component", "search", "-noExplore", "YES",
        "-fixtures", "bar-value", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategory\(category)"]
      app.launch()
      defer { app.terminate() }
      let field = app.searchFields.matching(identifier: "fixture.search.bar-value").firstMatch
      XCTAssertTrue(field.waitForExistence(timeout: 20))
      XCTAssertEqual("\(field.value ?? "")", "invoice")
      return field.frame
    }
    let regular = try measure("L")
    let large = try measure("AccessibilityXL")
    XCTAssertGreaterThan(large.height, regular.height + 8, "\(regular) → \(large)")
  }

  /// Every search fixture is shown, and the screens they are on pass the accessibility audit in light and dark. The audit's
  /// "Text clipped" guess is exempt for the input, as for the text field's: it
  /// grows with Dynamic Type — `testSearchGrowsWithDynamicType` measures it. At most three a launch and never on a
  /// scrolled screen (`auditFixtures`): the three with `full-screen` (a 360-tall stage) did not fit under the gallery's
  /// switches, and on a scrolled screen the runner reports "Potentially inaccessible text" with no element
  /// (`inaccessibleTextWithoutElement`) and 'Contrast nearly passed' on the gallery's own section title.
  func testSearchFixturesPassTheAudit() throws {
    let exempt: (XCUIAccessibilityAuditIssue) -> Bool = { issue in
      issue.auditType == .textClipped && [.searchField, .textField].contains(issue.element?.elementType)
    }
    let ids = try fixtureIds("search")
    for start in stride(from: 0, to: ids.count, by: 3) {
      try auditFixtures(
        of: "search", only: Array(ids[start..<min(start + 3, ids.count)]), exempt: exempt, runnerOnly: .inaccessibleTextWithoutElement)
    }
  }

  // MARK: segmented button (specs/segmented-button.spec.json)

  /// SEG-20 — the set is a container named by its label; a single-choice segment is a button (iOS has no radio role) named
  /// by its label, drawn or not, selected while chosen, its position its value; a multiple-choice segment is a toggle (a
  /// switch to XCUITest), on while chosen. SEG-1 — a tap on another segment selects it and fires once; on the selected one,
  /// nothing. SEG-2 — a tap switches a multiple-choice segment on and off, each tap one change. SEG-3 — a disabled segment
  /// is exposed as such and never fires. Under overlay, ripple and dim.
  func testSegmentedButtonSemanticsAndActivation() throws {
    for system in ["tanrei", "m3-like", "cupertino"] {
      let app = try launchComponent("segmented-button", system: system)
      func set(_ id: String) -> XCUIElement { app.descendants(matching: .any)["fixture.segmented-button.\(id)"] }
      let single = set("single")
      XCTAssertEqual(single.label, "Range", "\(system): \(single.debugDescription)")
      let day = single.buttons["Day"].firstMatch
      let week = single.buttons["Week"].firstMatch
      let month = single.buttons["Month"].firstMatch
      XCTAssertTrue(day.exists && week.exists && month.exists, "\(system): \(single.debugDescription)")
      XCTAssertEqual(["\(day.value ?? "")", "\(week.value ?? "")", "\(month.value ?? "")"], ["1 of 3", "2 of 3", "3 of 3"], system)
      XCTAssertTrue(week.isSelected && !day.isSelected && !month.isSelected, "\(system): \(state(day)) / \(state(week))")
      day.tap()
      XCTAssertTrue(waitForFired(app, "segmented-button.single", 1), system)
      XCTAssertTrue(day.isSelected && !week.isSelected, "\(system): \(state(day)) / \(state(week))")
      day.tap()  // SEG-1: never cleared by its own segment
      Thread.sleep(forTimeInterval: 0.5)
      XCTAssertEqual(fired(app, "segmented-button.single"), "fired 1", system)
      XCTAssertTrue(day.isSelected, system)

      // SEG-20: an icon-only segment is named by its label.
      XCTAssertTrue(set("icon-only").buttons["Align left"].firstMatch.exists, "\(system): \(set("icon-only").debugDescription)")
      XCTAssertTrue(set("icon-only").buttons["Center"].firstMatch.isSelected, system)

      // SEG-2, SEG-20: toggles, on while chosen.
      let multiple = set("multiple")
      XCTAssertEqual(multiple.label, "Days", "\(system): \(multiple.debugDescription)")
      let mon = multiple.descendants(matching: .any).matching(identifier: "Mon").firstMatch
      let wed = multiple.descendants(matching: .any).matching(identifier: "Wed").firstMatch
      XCTAssertTrue(isOn(mon) && !isOn(wed), "\(system): \(state(mon)) / \(state(wed))")
      wed.tap()
      XCTAssertTrue(waitForFired(app, "segmented-button.multiple", 1), system)
      XCTAssertTrue(isOn(wed), "\(system): \(state(wed))")
      wed.tap()
      XCTAssertTrue(waitForFired(app, "segmented-button.multiple", 2), system)
      XCTAssertFalse(isOn(wed), "\(system): \(state(wed))")

      // SEG-3: a disabled segment is exposed as such and never fires, selected or not.
      let disabled = set("disabled")
      if !disabled.isHittable { scrollIntoView(app, disabled) }
      let off = disabled.buttons["Month"].firstMatch
      XCTAssertFalse(off.isEnabled, system)
      off.tap()
      let selectedDisabled = set("selected-disabled")
      if !selectedDisabled.isHittable { scrollIntoView(app, selectedDisabled) }
      XCTAssertTrue(selectedDisabled.buttons["Month"].firstMatch.isSelected && !selectedDisabled.buttons["Month"].firstMatch.isEnabled, system)
      Thread.sleep(forTimeInterval: 0.5)
      XCTAssertEqual(fired(app, "segmented-button.disabled"), "fired 0", system)
      app.terminate()
    }
  }

  /// SEG-14 — with larger text the labels wrap rather than truncate, and every segment grows to the tallest: the segments of
  /// a set stay equally wide and equally tall; icons do not scale.
  func testSegmentedButtonGrowsWithDynamicType() throws {
    func measure(_ category: String) throws -> [CGRect] {
      let app = XCUIApplication()
      app.launchArguments = ["-system", "tanrei", "-appearance", "light", "-contrast", "standard", "-component", "segmented-button", "-noExplore", "YES",
        "-fixtures", "single", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategory\(category)"]
      app.launch()
      defer { app.terminate() }
      let set = app.descendants(matching: .any)["fixture.segmented-button.single"]
      XCTAssertTrue(set.waitForExistence(timeout: 20))
      return ["Day", "Week", "Month"].map { set.buttons[$0].firstMatch.frame }
    }
    let regular = try measure("L")
    let large = try measure("AccessibilityXXL")
    XCTAssertGreaterThan(large[0].height, regular[0].height)
    for frames in [regular, large] {
      XCTAssertTrue(frames.allSatisfy { abs($0.height - frames[0].height) <= 1 && abs($0.width - frames[0].width) <= 1 }, "\(frames)")
    }
  }

  /// Every segmented button fixture is shown, and the screens they are on pass the accessibility audit in light and dark.
  func testSegmentedButtonFixturesPassTheAudit() throws {
    let ids = try fixtureIds("segmented-button")
    for start in stride(from: 0, to: ids.count, by: 3) {
      try auditFixtures(of: "segmented-button", only: Array(ids[start..<min(start + 3, ids.count)]))
    }
  }

  // MARK: side sheet (specs/side-sheet.spec.json)

  /// The gallery with the side sheet's section only: `fixtures` of its fixtures, and its presented examples unless `explore`
  /// is false.
  private func launchSideSheet(_ fixtures: [String], explore: Bool = false, extra: [String] = []) -> XCUIApplication {
    let app = XCUIApplication()
    app.launchArguments = ["-system", "tanrei", "-appearance", "light", "-contrast", "standard", "-component", "side-sheet",
      "-fixtures", fixtures.joined(separator: ",")] + (explore ? [] : ["-noExplore", "YES"]) + extra
    app.launch()
    return app
  }

  /// SSH-12 — a fixture's sheet is a container named by its headline, and SSH-9 its headline is text in it. SSH-5 — while
  /// closable, a button named by closeLabel, which fires close once when tapped (the in-place sheet stays open, as when its
  /// product declines). SSH-11 — the actions are buttons, in the order given from the leading edge; the divider is not an
  /// element.
  func testSideSheetSemantics() throws {
    let expected: [String: (closable: Bool, actions: [String])] = [
      "standard": (true, []), "standard-actions": (false, ["Apply", "Reset"]), "modal": (true, ["Apply", "Reset"]),
    ]
    XCTAssertEqual(Set(expected.keys), Set(try fixtureIds("side-sheet")))
    for (id, parts) in expected {
      let app = launchSideSheet([id])
      XCTAssertTrue(app.descendants(matching: .any)["fixture.side-sheet.\(id)"].firstMatch.waitForExistence(timeout: 20), id)
      XCTAssertTrue(sheet(app, "Filters").exists, "\(id): \(app.debugDescription)")
      XCTAssertTrue(app.staticTexts["Filters"].exists, id)
      XCTAssertEqual(app.buttons["Close filters"].exists, parts.closable, id)
      let actions = parts.actions.map { app.buttons[$0] }
      XCTAssertTrue(actions.allSatisfy(\.exists), "\(id): \(app.debugDescription)")
      if actions.count == 2 { XCTAssertLessThan(actions[0].frame.minX, actions[1].frame.minX, id) }
      if parts.closable {
        app.buttons["Close filters"].tap()
        XCTAssertTrue(waitForFired(app, "side-sheet.\(id)", 1), id)
        XCTAssertTrue(app.buttons["Close filters"].exists, "\(id): the in-place sheet stays")
      }
      app.terminate()
    }
  }

  /// SSH-2 — a modal sheet presented from its button covers the gallery: the gallery's own controls are not reachable while
  /// it is open. SSH-4, SSH-6 — a tap on the scrim closes it (the binding is written false: the button's value says closed)
  /// and fires once; a drag toward the trailing edge past half its width closes it; a short, slow drag does not (it slides
  /// back and stays). SSH-5 — its close button closes it. Its own action closes it too, which fires nothing.
  func testSideSheetModalClosesAndDrags() throws {
    let app = launchSideSheet(["standard"], explore: true)
    let opener = app.buttons["fixture.side-sheet.presented"]
    XCTAssertTrue(opener.waitForExistence(timeout: 20), app.debugDescription)
    opener.swipeUpUntilVisible(in: app)
    let closed = NSPredicate(format: "exists == false")
    let apply = app.buttons["Apply"]
    let headline = app.staticTexts["Sort and filter"]
    func open() {
      opener.tap()
      XCTAssertTrue(apply.waitForExistence(timeout: 5), app.debugDescription)
    }
    func waitClosed() {
      XCTAssertEqual(XCTWaiter().wait(for: [expectation(for: closed, evaluatedWith: apply)], timeout: 5), .completed, app.debugDescription)
      XCTAssertEqual("\(opener.value ?? "")", "closed")
    }
    // The scrim, at the leading edge (the sheet leaves at least a touch target of it).
    open()
    XCTAssertTrue(sheet(app, "Sort and filter").exists, app.debugDescription)
    XCTAssertFalse(app.segmentedControls["switch.appearance"].isHittable)
    app.coordinate(withNormalizedOffset: CGVector(dx: 0.04, dy: 0.5)).tap()
    waitClosed()
    XCTAssertTrue(waitForFired(app, "side-sheet.presented", 1))
    // A drag from the headline toward the trailing edge.
    open()
    headline.coordinate(withNormalizedOffset: CGVector(dx: 0.2, dy: 0.5))
      .press(forDuration: 0.1, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.99, dy: 0.3)))
    waitClosed()
    XCTAssertTrue(waitForFired(app, "side-sheet.presented", 2))
    // A short, slow drag: it slides back and stays.
    open()
    let start = headline.coordinate(withNormalizedOffset: CGVector(dx: 0.2, dy: 0.5))
    start.press(forDuration: 0.1, thenDragTo: start.withOffset(CGVector(dx: 40, dy: 0)), withVelocity: .slow, thenHoldForDuration: 0.3)
    let restLeft = headline.frame.minX
    sleep(1)
    XCTAssertTrue(apply.exists, app.debugDescription)
    XCTAssertEqual(headline.frame.minX, restLeft, accuracy: 1)
    XCTAssertEqual(fired(app, "side-sheet.presented"), "fired 2")
    // The close button.
    app.buttons["Close sort and filter"].tap()
    waitClosed()
    XCTAssertTrue(waitForFired(app, "side-sheet.presented", 3))
    // Its own action: the product's close, not the sheet's.
    open()
    apply.tap()
    waitClosed()
    XCTAssertEqual(fired(app, "side-sheet.presented"), "fired 3")
  }

  /// SSH-4 — Escape on a hardware keyboard, with keyboard focus in the open modal sheet, closes it once (reason escape). iOS
  /// gives the sheet's controls keyboard focus only under Full Keyboard Access, which XCUITest's keyboard could not always
  /// move on the simulator: then the test SKIPS, loudly.
  func testSideSheetEscapeCloses() throws {
    let app = launchSideSheet(["standard"], explore: true)
    let opener = app.buttons["fixture.side-sheet.presented"]
    XCTAssertTrue(opener.waitForExistence(timeout: 20), app.debugDescription)
    opener.swipeUpUntilVisible(in: app)
    opener.tap()
    let apply = app.buttons["Apply"]
    XCTAssertTrue(apply.waitForExistence(timeout: 5), app.debugDescription)
    // Tab into the sheet: its close button or its action takes focus.
    var attempts = 0
    while !(app.buttons["Close sort and filter"].hasFocus || apply.hasFocus) && attempts < 6 {
      app.typeKey(.tab, modifierFlags: [])
      attempts += 1
    }
    try XCTSkipUnless(
      app.buttons["Close sort and filter"].hasFocus || apply.hasFocus,
      "No keyboard focus in the sheet: this simulator does not give a button keyboard focus under automation.")
    app.typeKey(.escape, modifierFlags: [])
    let closed = NSPredicate(format: "exists == false")
    XCTAssertEqual(XCTWaiter().wait(for: [expectation(for: closed, evaluatedWith: apply)], timeout: 5), .completed, app.debugDescription)
    XCTAssertEqual("\(opener.value ?? "")", "closed")
    XCTAssertTrue(waitForFired(app, "side-sheet.presented", 1))
  }

  /// SSH-1 — a standard sheet beside a page: no scrim, and the page's own button stays usable while it is open (it hides
  /// the sheet again). SSH-5 — its close button closes it and fires once. SSH-12 — it is a container named by its headline.
  func testSideSheetStandardLeavesThePageUsable() throws {
    let app = launchSideSheet(["standard"], explore: true)
    let filters = app.buttons["Filters"]
    XCTAssertTrue(filters.waitForExistence(timeout: 20), app.debugDescription)
    filters.swipeUpUntilVisible(in: app)
    // The example is the gallery's last row: up to the end, so that the page below its button is on screen too.
    app.swipeUp()
    filters.tap()
    let region = sheet(app, "Refine results")
    XCTAssertTrue(region.waitForExistence(timeout: 5), app.debugDescription)
    XCTAssertTrue(filters.isHittable)
    XCTAssertTrue(app.segmentedControls["switch.appearance"].exists)
    XCTAssertEqual("\(filters.value ?? "")", "open")
    filters.tap()
    let gone = NSPredicate(format: "exists == false")
    XCTAssertEqual(XCTWaiter().wait(for: [expectation(for: gone, evaluatedWith: region)], timeout: 5), .completed, app.debugDescription)
    XCTAssertEqual(fired(app, "side-sheet.standard-page"), "fired 0")
    filters.tap()
    XCTAssertTrue(region.waitForExistence(timeout: 5), app.debugDescription)
    app.buttons["Close refine results"].tap()
    XCTAssertEqual(XCTWaiter().wait(for: [expectation(for: gone, evaluatedWith: region)], timeout: 5), .completed, app.debugDescription)
    XCTAssertEqual("\(filters.value ?? "")", "closed")
    XCTAssertTrue(waitForFired(app, "side-sheet.standard-page", 1))
  }

  /// SSH-14 — with larger text the header grows with the headline, while the close button keeps what the icon button itself
  /// does and the sheet keeps its width: its leading edge (where the headline starts) and its trailing edge (where the close
  /// button ends) stay where they were.
  func testSideSheetGrowsWithDynamicType() throws {
    func measure(_ category: String) throws -> (headline: CGRect, close: CGRect) {
      let app = launchSideSheet(["standard"], extra: ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategory\(category)"])
      defer { app.terminate() }
      XCTAssertTrue(app.descendants(matching: .any)["fixture.side-sheet.standard"].firstMatch.waitForExistence(timeout: 20), app.debugDescription)
      return (app.staticTexts["Filters"].frame, app.buttons["Close filters"].frame)
    }
    let regular = try measure("L")
    let large = try measure("AccessibilityXL")
    XCTAssertGreaterThan(large.headline.height, regular.headline.height)
    XCTAssertEqual(large.headline.minX, regular.headline.minX, accuracy: 0.5)
    XCTAssertEqual(large.close.size, regular.close.size)
    XCTAssertEqual(large.close.maxX, regular.close.maxX, accuracy: 0.5)
  }

  /// Every side sheet fixture is shown, and the screen it is on passes the accessibility audit in light and dark — one
  /// fixture a launch, so that none needs a scroll (after a scroll the audit misreports).
  func testSideSheetFixturesPassTheAudit() throws {
    for id in try fixtureIds("side-sheet") {
      try auditFixtures(of: "side-sheet", only: [id])
    }
  }

  // MARK: slider (specs/slider.spec.json)

  /// The handle named `label` in the slider fixture `id`.
  private func sliderHandle(_ app: XCUIApplication, _ id: String, _ label: String) -> XCUIElement {
    app.descendants(matching: .any)["fixture.slider.\(id)"].descendants(matching: .any).matching(NSPredicate(format: "label == %@", label)).firstMatch
  }

  /// A point of the slider fixture `id` (a horizontal one, `GallerySliderLength` long): `fraction` of its travel — the state
  /// layer's half (16) and the small track's half (2) in from each end —, `across` points off its midline.
  private func sliderPoint(_ app: XCUIApplication, _ id: String, _ fraction: CGFloat, across: CGFloat = 0) -> XCUICoordinate {
    let row = app.descendants(matching: .any)["fixture.slider.\(id)"]
    let inset: CGFloat = 18
    return row.coordinate(withNormalizedOffset: CGVector(dx: 0, dy: 0.5))
      .withOffset(CGVector(dx: inset + fraction * (row.frame.width - 2 * inset), dy: across))
  }

  /// SLD-19 — each handle is one element named by its label, its value text its value; a range is two. SLD-20 — a disabled
  /// slider is exposed as such and never changes. SLD-2 — a tap moves the handle to the value under it and fires one change;
  /// a drag along the track moves it and fires one change; SLD-7 — a tap beside the track, inside the minimum target,
  /// moves it too. Under overlay, ripple and dim.
  func testSliderSemanticsAndInput() throws {
    for system in ["tanrei", "m3-like", "cupertino"] {
      let app = try launchComponent("slider", system: system)
      let volume = sliderHandle(app, "continuous", "Volume")
      XCTAssertTrue(volume.waitForExistence(timeout: 5), "\(system): \(app.descendants(matching: .any)["fixture.slider.continuous"].debugDescription)")
      XCTAssertEqual("\(volume.value ?? "")", "40", "\(system): \(volume.debugDescription)")
      XCTAssertTrue(volume.isEnabled, system)

      // SLD-2: a tap on the track.
      sliderPoint(app, "continuous", 0.8).tap()
      XCTAssertTrue(waitForFired(app, "slider.continuous", 1), system)
      XCTAssertEqual("\(volume.value ?? "")", "80", "\(system): \(volume.debugDescription)")
      // SLD-2: a drag along the track, one change at its end.
      sliderPoint(app, "continuous", 0.8).press(forDuration: 0.05, thenDragTo: sliderPoint(app, "continuous", 0.3))
      XCTAssertTrue(waitForFired(app, "slider.continuous", 2), system)
      XCTAssertEqual("\(volume.value ?? "")", "30", "\(system): \(volume.debugDescription)")
      // SLD-7: beside the track, inside the minimum target (the slider is 32 across; the target 44 or more).
      sliderPoint(app, "continuous", 0.1, across: -19).tap()
      XCTAssertTrue(waitForFired(app, "slider.continuous", 3), system)
      XCTAssertEqual("\(volume.value ?? "")", "10", "\(system): \(volume.debugDescription)")

      // SLD-5, SLD-19: a range is two elements, each named by its own label.
      XCTAssertEqual("\(sliderHandle(app, "range", "Minimum price").value ?? "")", "20", system)
      XCTAssertEqual("\(sliderHandle(app, "range", "Maximum price").value ?? "")", "60", system)
      // SLD-2: a tap near the start handle moves it, not the end handle.
      sliderPoint(app, "range", 0.1).tap()
      XCTAssertTrue(waitForFired(app, "slider.range", 1), system)
      XCTAssertEqual("\(sliderHandle(app, "range", "Minimum price").value ?? "")", "10", system)
      XCTAssertEqual("\(sliderHandle(app, "range", "Maximum price").value ?? "")", "60", system)

      // SLD-20: disabled — exposed as such, and a tap changes nothing.
      let disabled = app.descendants(matching: .any)["fixture.slider.disabled"]
      if !disabled.isHittable { scrollIntoView(app, disabled) }
      let off = sliderHandle(app, "disabled", "Volume")
      XCTAssertFalse(off.isEnabled, "\(system): \(off.debugDescription)")
      sliderPoint(app, "disabled", 0.9).tap()
      Thread.sleep(forTimeInterval: 0.5)
      XCTAssertEqual(fired(app, "slider.disabled"), "fired 0", system)
      XCTAssertEqual("\(off.value ?? "")", "40", system)
      app.terminate()
    }
  }

  /// SLD-2 — a swipe that starts on the slider and runs across its track is the gallery's scroll: the slider changes
  /// nothing. Judged only on a drag the app received whole, as `testAListStillScrollsFromAButtonUnderRipple` is.
  func testSliderLeavesASwipeAcrossToTheScrollView() throws {
    let attempts = 3
    var undelivered: [String] = []
    for attempt in 1...attempts {
      let app = XCUIApplication()
      app.launchArguments = ["-system", "tanrei", "-appearance", "light", "-contrast", "standard", "-component", "slider", "-touchProbe", "YES"]
      app.launch()
      let row = app.descendants(matching: .any)["fixture.slider.continuous"]
      XCTAssertTrue(row.waitForExistence(timeout: 20))
      let probe = app.staticTexts["touch-probe"]
      let before = row.frame.minY
      let start = sliderPoint(app, "continuous", 0.7)
      start.press(forDuration: 0.05, thenDragTo: start.withOffset(CGVector(dx: 0, dy: -200)))
      _ = XCTWaiter().wait(for: [expectation(for: NSPredicate(format: "label != %@", "touch: none"), evaluatedWith: probe)], timeout: 10)
      let report = probe.label
      if Self.isWholeDrag(report) {
        Thread.sleep(forTimeInterval: 0.5)
        XCTAssertLessThan(row.frame.minY, before - 50, "the gallery did not scroll although the app received the whole drag (\(report))")
        XCTAssertEqual(fired(app, "slider.continuous"), "fired 0")
        XCTAssertEqual("\(sliderHandle(app, "continuous", "Volume").value ?? "")", "40")
        return
      }
      undelivered.append("attempt \(attempt): \(report)")
      app.terminate()
    }
    XCTFail("the simulator never delivered the drag intact in \(attempts) attempts: \(undelivered)")
  }

  /// Every slider fixture is shown, and the screens they are on pass the accessibility audit in light and dark.
  func testSliderFixturesPassTheAudit() throws {
    let ids = try fixtureIds("slider")
    for start in stride(from: 0, to: ids.count, by: 5) {
      try auditFixtures(of: "slider", only: Array(ids[start..<min(start + 5, ids.count)]))
    }
  }

  // MARK: split button (specs/split-button.spec.json)

  /// SPB-17 — two buttons in reading order and no element of the split button's own: the leading half named by its label,
  /// the trailing half by menuLabel (the chevron and the icon hidden). SPB-1 — a tap on the leading half fires once; SPB-2 — a
  /// tap on the trailing half toggles (a fixture's menu is empty: nothing is presented, SPB-20) and fires nothing; SPB-3 —
  /// disabled: both halves exposed as such, never fire. SPB-15, SPB-16 — the split button with a menu opens it from the
  /// trailing half, an item fires and closes it, and a tap on the trailing half while it is open closes it. Under overlay,
  /// ripple and dim.
  func testSplitButtonSemanticsAndActivation() throws {
    for system in ["tanrei", "m3-like", "cupertino"] {
      // With the explorations: the split button with a menu is one.
      let app = XCUIApplication()
      app.launchArguments = ["-system", system, "-appearance", "light", "-contrast", "standard", "-component", "split-button"]
      app.launch()
      let medium = app.descendants(matching: .any).matching(identifier: "fixture.split-button.filled-medium")
      XCTAssertTrue(medium.firstMatch.waitForExistence(timeout: 20), system)
      XCTAssertEqual(medium.count, 2, "\(system): \(medium.debugDescription)")
      XCTAssertEqual(medium.allElementsBoundByIndex.map(\.elementType), [.button, .button], system)
      XCTAssertEqual(medium.allElementsBoundByIndex.map(\.label), ["Save", "More save options"], system)
      // SPB-1: the leading half fires once.
      medium.element(boundBy: 0).tap()
      XCTAssertTrue(waitForFired(app, "split-button.filled-medium", 1), system)
      // SPB-2: the trailing half toggles and fires no click; with no item, no menu (SPB-20).
      medium.element(boundBy: 1).tap()
      Thread.sleep(forTimeInterval: 0.5)
      XCTAssertEqual(fired(app, "split-button.filled-medium"), "fired 1", system)
      XCTAssertFalse(app.buttons["Save as…"].exists, system)
      // SPB-17: an icon adds no element — the leading half is still one button named by its label.
      let icon = app.descendants(matching: .any).matching(identifier: "fixture.split-button.filled-icon")
      XCTAssertEqual(icon.allElementsBoundByIndex.map(\.label), ["Save", "More save options"], system)
      // SPB-3: disabled — exposed as such, never fires.
      let disabled = app.descendants(matching: .any).matching(identifier: "fixture.split-button.filled-disabled")
      let first = disabled.element(boundBy: 0)
      if !first.isHittable { scrollIntoView(app, first) }
      XCTAssertTrue(disabled.allElementsBoundByIndex.allSatisfy { !$0.isEnabled }, "\(system): \(disabled.debugDescription)")
      first.tap()
      disabled.element(boundBy: 1).tap()
      Thread.sleep(forTimeInterval: 0.5)
      XCTAssertEqual(fired(app, "split-button.filled-disabled"), "fired 0", system)
      // SPB-15, SPB-16: with a menu.
      let withMenu = app.descendants(matching: .any).matching(identifier: "fixture.split-button.with-menu")
      let chevron = withMenu.element(boundBy: 1)
      chevron.swipeUpUntilVisible(in: app)
      XCTAssertEqual(chevron.label, "More save options", system)
      chevron.tap()
      let saveAs = app.buttons["Save as…"]
      XCTAssertTrue(saveAs.waitForExistence(timeout: 5), "\(system): \(app.debugDescription)")
      saveAs.tap()
      XCTAssertTrue(waitForFired(app, "split-button.with-menu", 1), system)
      XCTAssertTrue(waitForGone(saveAs), "\(system): the menu closes after an item")
      // A tap on the trailing half while the menu is open closes it (a toggle, not a reopening).
      chevron.tap()
      XCTAssertTrue(saveAs.waitForExistence(timeout: 5), system)
      // The popover makes what is under it unhittable to XCUITest: tap where the trailing half is.
      chevron.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
      XCTAssertTrue(waitForGone(saveAs), "\(system): the trailing half closes the open menu")
      Thread.sleep(forTimeInterval: 1)
      XCTAssertFalse(saveAs.exists, "\(system): the menu stays closed")
      XCTAssertEqual(fired(app, "split-button.with-menu"), "fired 1", system)
      app.terminate()
    }
  }

  private func waitForGone(_ element: XCUIElement) -> Bool {
    XCTWaiter().wait(for: [expectation(for: NSPredicate(format: "exists == false"), evaluatedWith: element)], timeout: 5) == .completed
  }

  /// SPB-12, SPB-14 — with larger text the leading half grows and the trailing half grows with it: both halves keep one
  /// height and one centre line.
  func testSplitButtonGrowsWithDynamicType() throws {
    func measure(_ category: String) throws -> [CGRect] {
      let app = XCUIApplication()
      app.launchArguments = ["-system", "tanrei", "-appearance", "light", "-contrast", "standard", "-component", "split-button", "-noExplore", "YES",
        "-fixtures", "filled-medium", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategory\(category)"]
      app.launch()
      defer { app.terminate() }
      let halves = app.descendants(matching: .any).matching(identifier: "fixture.split-button.filled-medium")
      XCTAssertTrue(halves.firstMatch.waitForExistence(timeout: 20))
      return halves.allElementsBoundByIndex.map(\.frame)
    }
    let regular = try measure("L")
    // Large enough for the label to grow past the touch target, which is the height of each half's element (its hit area).
    let large = try measure("AccessibilityXL")
    XCTAssertEqual(regular.count, 2)
    XCTAssertEqual(large.count, 2)
    XCTAssertGreaterThan(large[0].height, regular[0].height)
    for frames in [regular, large] {
      XCTAssertTrue(abs(frames[0].height - frames[1].height) <= 1 && abs(frames[0].midY - frames[1].midY) <= 1, "\(frames)")
    }
  }

  /// Every split button fixture is shown, and the screens they are on pass the accessibility audit in light and dark.
  func testSplitButtonFixturesPassTheAudit() throws {
    let ids = try fixtureIds("split-button")
    for start in stride(from: 0, to: ids.count, by: 4) {
      try auditFixtures(of: "split-button", only: Array(ids[start..<min(start + 4, ids.count)]))
    }
  }

  // MARK: switch (specs/switch.spec.json)

  /// SWT-14 — a switch (XCUITest: a switch element) whose value is 1 while on and 0 while off, the icons hidden; SWT-16 —
  /// the label is the name, visible or not; SWT-1 — a tap on the track or on its label switches it once; SWT-2 —
  /// disabled: exposed as such, never switches. Under three systems (overlay, ripple, dim).
  func testSwitchSemanticsAndActivation() throws {
    for system in ["tanrei", "m3-like", "cupertino"] {
      let app = XCUIApplication()
      app.launchArguments = ["-system", system, "-appearance", "light", "-contrast", "standard", "-component", "switch", "-noExplore", "YES"]
      app.launch()
      func control(_ id: String) -> XCUIElement { app.descendants(matching: .any)["fixture.switch.\(id)"] }
      XCTAssertTrue(control("unselected").waitForExistence(timeout: 20), system)
      let selected = try fixtureIds("switch").filter { ["selected", "disabled-selected", "selected-icon", "label-hidden"].contains($0) }
      for id in try fixtureIds("switch") {
        let element = control(id)
        XCTAssertEqual(element.label, "Wi-Fi", "\(system) \(id)")
        XCTAssertEqual(element.elementType, .switch, "\(system) \(id): \(state(element))")
        XCTAssertEqual(toggleValue(element), selected.contains(id) ? "1" : "0", "\(system) \(id)")
        // The icon is not in the name, nor in the value. (XCUITest still lists the SF Symbol as an image under the button
        // although it is accessibility-hidden.)
        XCTAssertFalse(element.label.contains("Selected") || element.label.contains("check"), "\(system) \(id): \(element.label)")
        XCTAssertEqual(element.isEnabled, !id.hasPrefix("disabled"), "\(system) \(id)")
      }
      let unselected = control("unselected")
      unselected.coordinate(withNormalizedOffset: CGVector(dx: 0, dy: 0.5)).withOffset(CGVector(dx: 10, dy: 0)).tap()
      XCTAssertTrue(waitForFired(app, "switch.unselected", 1), system)
      XCTAssertEqual(toggleValue(unselected), "1", system)
      unselected.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5)).tap()
      XCTAssertTrue(waitForFired(app, "switch.unselected", 2), system)
      XCTAssertEqual(toggleValue(unselected), "0", system)
      control("disabled-selected").tap()
      Thread.sleep(forTimeInterval: 0.5)
      XCTAssertEqual(fired(app, "switch.disabled-selected"), "fired 0", system)
      XCTAssertEqual(toggleValue(control("disabled-selected")), "1", system)
      app.terminate()
    }
  }

  /// Every switch fixture is shown, and the screens they are on pass the accessibility audit in light and dark.
  func testSwitchFixturesPassTheAudit() throws {
    try auditFixtures(of: "switch")
  }

  // MARK: card (specs/card.spec.json)

  /// CRD-14 — an interactive card is ONE button named by its label, its content read as part of it (CRD-15: nothing
  /// inside it is an element of its own); a card that is not interactive has no role, and its content stays as it is.
  /// CRD-1 — a tap fires once; CRD-2 — disabled: exposed as such, never fires; CRD-11 — the others never fire.
  func testCardSemanticsAndActivation() throws {
    for system in ["tanrei", "m3-like", "cupertino"] {
      let app = XCUIApplication()
      app.launchArguments = ["-system", system, "-appearance", "light", "-contrast", "standard", "-component", "card", "-noExplore", "YES"]
      app.launch()
      func card(_ id: String) -> XCUIElement { app.descendants(matching: .any)["fixture.card.\(id)"] }
      XCTAssertTrue(card("outlined").waitForExistence(timeout: 20), system)
      let interactive = card("outlined-interactive")
      XCTAssertEqual(interactive.elementType, .button, "\(system): \(interactive.debugDescription)")
      XCTAssertEqual(interactive.label, "Quarterly report", system)
      // CRD-15: the content is the button's — its text is not the name (the label is), and the button is the element that
      // is tapped. (XCUITest lists a SwiftUI button's drawn text under it all the same.)
      XCTAssertFalse(interactive.label.contains("Revenue"), system)
      for id in ["outlined-disabled", "elevated-disabled"] {
        XCTAssertEqual(card(id).elementType, .button, "\(system) \(id)")
        XCTAssertFalse(card(id).isEnabled, "\(system) \(id)")
      }
      for id in ["outlined", "filled", "elevated", "outlined-flush"] {
        XCTAssertNotEqual(card(id).elementType, .button, "\(system) \(id): a card that is not an action has no role")
        XCTAssertTrue(card(id).label.hasPrefix("Quarterly report."), "\(system) \(id): its text is still read — \(card(id).label)")
      }
      interactive.tap()
      XCTAssertTrue(waitForFired(app, "card.outlined-interactive", 1), system)
      card("outlined-disabled").tap()
      card("outlined").tap()
      Thread.sleep(forTimeInterval: 0.5)
      XCTAssertEqual(fired(app, "card.outlined-interactive"), "fired 1", system)
      XCTAssertEqual(fired(app, "card.outlined-disabled"), "fired 0", system)
      XCTAssertEqual(fired(app, "card.outlined"), "fired 0", system)
      app.terminate()
    }
  }

  /// Every card fixture is shown, and the screens they are on pass the accessibility audit in light and dark — at most four
  /// a launch, each once its screen stands still, never on a scrolled screen. With all seven in one launch (about 100 pt
  /// each, three lines of text at 240 wide: more than the first screen holds), the audit of the FIRST screen does not
  /// always complete in time on the runner ("Audit failed to complete in time").
  func testCardFixturesPassTheAudit() throws {
    try auditFixtures(of: "card", perLaunch: 4)
  }

  // MARK: carousel (specs/carousel.spec.json)

  /// The gallery with the named carousel fixtures only, waiting for the first.
  private func launchCarousel(_ ids: [String], system: String = "tanrei", extra: [String] = []) -> XCUIApplication {
    let app = XCUIApplication()
    app.launchArguments = ["-system", system, "-appearance", "light", "-contrast", "standard", "-component", "carousel", "-noExplore", "YES",
      "-fixtures", ids.joined(separator: ",")] + extra
    app.launch()
    XCTAssertTrue(app.descendants(matching: .any)["fixture.carousel.\(ids[0])"].waitForExistence(timeout: 20))
    return app
  }

  /// Waits until `element`'s frame has stopped moving (a settle, a scroll into place), and returns it.
  private func restingFrame(_ element: XCUIElement) -> CGRect {
    var last = element.frame
    for _ in 0..<30 {
      Thread.sleep(forTimeInterval: 0.2)
      if element.frame == last { break }
      last = element.frame
    }
    return last
  }

  /// CRL-19 — the carousel is a container named by its label; each item is one button named by its label, every item
  /// exposed in order — those out of view too —, its content not read. CRL-1 — a tap fires the item once. Under overlay,
  /// ripple and dim.
  func testCarouselSemanticsAndActivation() throws {
    let labels = ["Coast path", "Old forest", "Lake shore", "City park", "Dunes", "Summit"]
    for system in ["tanrei", "m3-like", "cupertino"] {
      let app = launchCarousel(["multi-browse"], system: system)
      let row = app.descendants(matching: .any)["fixture.carousel.multi-browse"]
      XCTAssertEqual(row.label, "Walks near you", "\(system): \(row.debugDescription)")
      XCTAssertEqual(row.buttons.allElementsBoundByIndex.map(\.label), labels, "\(system): \(row.debugDescription)")
      // The content (a glyph) is not the name. (XCUITest lists a SwiftUI button's drawn content under it all the same,
      // hidden or not.)
      for label in labels { XCTAssertEqual(row.buttons[label].label, label, system) }
      row.buttons["Coast path"].tap()
      XCTAssertTrue(waitForFired(app, "carousel.multi-browse", 1), system)
      row.buttons["Old forest"].tap()
      XCTAssertTrue(waitForFired(app, "carousel.multi-browse", 2), system)
      app.terminate()
    }
  }

  /// CRL-14 — a slow drag let go settles at the nearest whole position (back where it started), a fast one goes on to the
  /// next position, and the item there is at slot 0 (CRL-12). CRL-1 — a press that turns into a scroll activates nothing.
  func testCarouselSettlesAtAWholePosition() throws {
    let app = launchCarousel(["multi-browse"])
    let row = app.descendants(matching: .any)["fixture.carousel.multi-browse"]
    let first = row.buttons["Coast path"]
    let second = row.buttons["Old forest"]
    // The hit area of the item at slot 0 (its container and half the gap on each side, CRL-4).
    let slot0 = restingFrame(first)
    let middle = row.coordinate(withNormalizedOffset: CGVector(dx: 0.6, dy: 0.5))
    // 40 points toward the start at 60 points a second — below 0.5 points a millisecond: back to the nearest, p 0.
    middle.press(forDuration: 0.1, thenDragTo: middle.withOffset(CGVector(dx: -40, dy: 0)), withVelocity: 60, thenHoldForDuration: 0)
    XCTAssertEqual(restingFrame(first).minX, slot0.minX, accuracy: 1, row.debugDescription)
    // 60 points at 1500 points a second — a fling: on to the next position, p 1, although it was let go nearer to p 0.
    middle.press(forDuration: 0.05, thenDragTo: middle.withOffset(CGVector(dx: -60, dy: 0)), withVelocity: 1500, thenHoldForDuration: 0)
    let settled = restingFrame(second)
    XCTAssertEqual(settled.minX, slot0.minX, accuracy: 1, row.debugDescription)
    XCTAssertEqual(settled.width, slot0.width, accuracy: 1, row.debugDescription)
    // Neither drag activated the item it started on.
    XCTAssertEqual(fired(app, "carousel.multi-browse"), "fired 0")
    // CRL-1: a tap on the item now in place fires it.
    app.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: slot0.midX, dy: slot0.midY)).tap()
    XCTAssertTrue(waitForFired(app, "carousel.multi-browse", 1))
  }

  /// CRL-25 — enlarged text keeps the carousel's height, its slots and its items as they are.
  func testCarouselKeepsItsSizeWithDynamicType() throws {
    func measure(_ category: String) -> [CGRect] {
      let app = launchCarousel(["multi-browse"], extra: ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategory\(category)"])
      defer { app.terminate() }
      let row = app.descendants(matching: .any)["fixture.carousel.multi-browse"]
      let origin = row.frame.origin
      return [row.frame] + row.buttons.allElementsBoundByIndex.prefix(3).map { $0.frame.offsetBy(dx: -origin.x, dy: -origin.y) }
    }
    let large = measure("L")
    let huge = measure("AccessibilityXXXL")
    XCTAssertEqual(large.count, huge.count)
    for (a, b) in zip(large, huge) {
      XCTAssertEqual(a.width, b.width, accuracy: 0.5)
      XCTAssertEqual(a.height, b.height, accuracy: 0.5)
    }
    for (a, b) in zip(large.dropFirst(), huge.dropFirst()) { XCTAssertEqual(a.minX, b.minX, accuracy: 0.5) }
  }

  /// Every carousel fixture is shown, and the screens they are on pass the accessibility audit in light and dark. Each row
  /// is 200 tall, so they are audited at most two to a launch, and never on a scrolled screen (`auditFixtures`;
  /// after a scroll the audit misreports): two rows end near y 522 without the gallery's switches.
  func testCarouselFixturesPassTheAudit() throws {
    let ids = try fixtureIds("carousel")
    for start in stride(from: 0, to: ids.count, by: 2) {
      try auditFixtures(of: "carousel", only: Array(ids[start..<min(start + 2, ids.count)]))
    }
  }

  // MARK: text-field (specs/text-field.spec.json)

  /// TXF-23 — the input is the element, named by the label whether drawn or not (never by the placeholder); a password
  /// is a secure field; TXF-5 — a disabled field is exposed as disabled; TXF-1 — typing emits input per change;
  /// TXF-8 — a press on the field outside its text focuses it; TXF-18 — typing stops at maxLength.
  func testTextFieldSemanticsAndTyping() throws {
    let app = XCUIApplication()
    app.launchArguments = ["-system", "tanrei", "-appearance", "light", "-contrast", "standard", "-component", "text-field", "-noExplore", "YES"]
    app.launch()
    // The row's identifier lands on the input itself when it is the row's only element.
    func field(_ id: String) -> XCUIElement {
      let row = app.descendants(matching: .any)["fixture.text-field.\(id)"]
      if [.textField, .secureTextField, .textView].contains(row.elementType) { return row }
      let input = row.descendants(matching: .textField).firstMatch
      return input.exists ? input : row.descendants(matching: .secureTextField).firstMatch
    }
    XCTAssertTrue(app.descendants(matching: .any)["fixture.text-field.outlined-empty"].waitForExistence(timeout: 20))
    XCTAssertEqual(field("outlined-empty").label, "Email")
    XCTAssertEqual(field("outlined-label-hidden").label, "Search", "the label is the name when it is not drawn; never the placeholder")
    XCTAssertEqual(field("outlined-password").elementType, .secureTextField)
    XCTAssertEqual("\(field("outlined-filled").value ?? "")", "ada@example.com")
    XCTAssertFalse(field("outlined-disabled").isEnabled)
    XCTAssertTrue(field("outlined-error").isEnabled)

    // Display name: "Ada Lovelace" (12) with maxLength 40; forty is reachable, the forty-first character is refused.
    let counter = field("outlined-counter")
    counter.tap()
    counter.typeText(String(repeating: "x", count: 30))
    XCTAssertEqual(("\(counter.value ?? "")").count, 40)

    let empty = field("outlined-empty")
    empty.tap()
    empty.typeText("ab")
    XCTAssertEqual("\(empty.value ?? "")", "ab", "focused: \(empty.hasFocus) — \(empty.debugDescription)")
    XCTAssertTrue(waitForFired(app, "text-field.outlined-empty", 2), fired(app, "text-field.outlined-empty"))

    // TXF-8: a press on the field outside its text — its leading padding, 4 pt in from the container's edge (the element's
    // frame is the whole field) — focuses the input. (A field near the top: the keyboard covers the lower rows.)
    let filled = field("outlined-filled")
    filled.coordinate(withNormalizedOffset: CGVector(dx: 0, dy: 0.5)).withOffset(CGVector(dx: 4, dy: 0)).tap()
    app.typeText("!")
    XCTAssertTrue(waitForFired(app, "text-field.outlined-filled", 1), fired(app, "text-field.outlined-filled"))
    XCTAssertEqual("\(filled.value ?? "")", "ada@example.com!")
  }

  /// Every text field fixture is shown, and the screens they are on pass the accessibility audit in light and dark. The
  /// audit's "Text clipped" guess is exempt for a text field's input: the
  /// field grows with Dynamic Type — `testTextFieldGrowsWithDynamicType` measures it.
  /// A screen of text fields is slow to audit: all audits at once did not complete in time on a loaded machine, so the
  /// Dynamic Type audit runs as a pass of its own, and a launch shows at most six fields. The audit of a
  /// screen reached by a swipe does not complete in time: `auditFixtures` never scrolls.
  func testTextFieldFixturesPassTheAudit() throws {
    let exempt: (XCUIAccessibilityAuditIssue) -> Bool = { issue in
      issue.auditType == .textClipped && [.textField, .secureTextField].contains(issue.element?.elementType)
    }
    try auditFixtures(
      of: "text-field", types: XCUIAccessibilityAuditType.all.subtracting(.dynamicType), perLaunch: 6, exempt: exempt,
      runnerOnly: .inaccessibleTextWithoutElement)
    try auditFixtures(of: "text-field", types: .dynamicType, perLaunch: 6, exempt: exempt, runnerOnly: .inaccessibleTextWithoutElement)
  }

  /// "Heights are minimums: at 200% text size the field grows … and the input keeps its line height" (accessibility
  /// notes): the input and the field grow from the default size to AccessibilityXL, and the value is still whole.
  func testTextFieldGrowsWithDynamicType() throws {
    func measure(_ category: String) -> CGRect {
      let app = XCUIApplication()
      app.launchArguments = ["-system", "tanrei", "-appearance", "light", "-contrast", "standard", "-component", "text-field", "-noExplore", "YES",
        "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategory\(category)"]
      app.launch()
      defer { app.terminate() }
      let row = app.descendants(matching: .any)["fixture.text-field.outlined-filled"]
      XCTAssertTrue(row.waitForExistence(timeout: 20))
      XCTAssertEqual("\(row.value ?? "")", "ada@example.com")
      return row.frame
    }
    let regular = measure("L")
    let large = measure("AccessibilityXL")
    // (The element's frame is its hit area: at least the minimum target, so the growth is measured, not a ratio.)
    XCTAssertGreaterThan(large.height, regular.height + 8, "\(regular) → \(large)")
  }

  // MARK: time picker (specs/time-picker.spec.json)

  /// The gallery with the named time-picker rows only, waiting for the first.
  private func launchTimePicker(_ ids: [String], explore: Bool = false, extra: [String] = []) -> XCUIApplication {
    let app = XCUIApplication()
    app.launchArguments = ["-system", "tanrei", "-appearance", "light", "-contrast", "standard", "-component", "time-picker", "-fixtures", ids.joined(separator: ",")]
      + (explore ? [] : ["-noExplore", "YES"]) + extra
    app.launch()
    XCTAssertTrue(app.descendants(matching: .any)["fixture.time-picker.\(ids[0])"].waitForExistence(timeout: 20))
    return app
  }

  /// The picker of a time-picker row: the container named by its label that carries the row's identifier.
  private func timePicker(_ app: XCUIApplication, _ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: "fixture.time-picker.\(id)").firstMatch
  }

  /// TMP-26 — the surface is a container named by label; each selector an adjustable element named by hourLabel or minuteLabel
  /// whose value is its text (the hour's with the period); the period two buttons named by the periods, the chosen one
  /// selected; the dial not exposed; the toggle, Cancel and OK named by their labels. TMP-11 — a tap on PM chooses it and keeps
  /// the hour. TMP-14 — a drag on the hour dial sets the hour under the finger, and letting go shows the minutes, where a tap
  /// sets any minute; TMP-5 — OK commits (change fires once).
  func testTimePickerSemanticsAndInput() throws {
    let app = launchTimePicker(["dial-hour"])
    let picker = timePicker(app, "dial-hour")
    XCTAssertEqual(picker.label, "Select time", app.debugDescription)
    let hour = picker.descendants(matching: .any).matching(NSPredicate(format: "label == 'Hour'")).firstMatch
    let minute = picker.descendants(matching: .any).matching(NSPredicate(format: "label == 'Minute'")).firstMatch
    XCTAssertEqual("\(hour.value ?? "")", "7 AM", picker.debugDescription)
    XCTAssertEqual("\(minute.value ?? "")", "30", picker.debugDescription)
    XCTAssertTrue(picker.buttons["AM"].isSelected && !picker.buttons["PM"].isSelected, picker.debugDescription)
    for label in ["Switch to text entry", "Cancel", "OK"] { XCTAssertTrue(picker.buttons[label].exists, label) }
    XCTAssertEqual(picker.staticTexts.matching(NSPredicate(format: "label == '12'")).count, 0, "the dial is hidden")

    picker.buttons["PM"].tap()
    XCTAssertTrue(picker.buttons["PM"].isSelected)
    XCTAssertEqual("\(hour.value ?? "")", "7 PM")

    // The dial lies `container.gap` below the selectors; it is 240 across (the default tokens).
    let dialTop = hour.frame.maxY + 16
    let centre = app.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: picker.frame.midX, dy: dialTop + 120))
    func on(_ degrees: Double, radius: CGFloat = 94) -> XCUICoordinate {
      let radians = degrees * .pi / 180
      return centre.withOffset(CGVector(dx: radius * CGFloat(sin(radians)), dy: -radius * CGFloat(cos(radians))))
    }
    on(90).press(forDuration: 0.1, thenDragTo: on(270))
    XCTAssertEqual("\(hour.value ?? "")", "9 PM", picker.debugDescription)
    on(90).tap()
    XCTAssertEqual("\(minute.value ?? "")", "15", picker.debugDescription)
    XCTAssertEqual(fired(app, "time-picker.dial-hour"), "fired 0", "nothing is committed before OK")
    picker.buttons["OK"].tap()
    XCTAssertTrue(waitForFired(app, "time-picker.dial-hour", 1))
  }

  /// TMP-22 — in text entry the period is drawn as tall as the fields, and a segment's hit area reaches the touch target
  /// above and below its drawing: a tap just inside the top of PM's hit area chooses it. TMP-23 — the fields are named by
  /// hourLabel and minuteLabel and hold the pending hour and minute.
  func testTimePickerTextEntry() throws {
    let app = launchTimePicker(["text"])
    let picker = timePicker(app, "text")
    XCTAssertEqual("\(picker.textFields["Hour"].value ?? "")", "7", picker.debugDescription)
    XCTAssertEqual("\(picker.textFields["Minute"].value ?? "")", "30", picker.debugDescription)
    let pm = picker.buttons["PM"]
    XCTAssertGreaterThanOrEqual(pm.frame.height, 44, "the hit area reaches the target: \(pm.frame)")
    pm.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0)).withOffset(CGVector(dx: 0, dy: 1)).tap()
    XCTAssertTrue(pm.isSelected, picker.debugDescription)
  }

  /// TMP-1 — a picker presented from its button covers the gallery (the gallery's own controls cannot be reached); TMP-4 — a
  /// tap on its scrim closes it and commits nothing; TMP-5 — OK commits the pending time (change fires once, the opener shows
  /// it).
  func testTimePickerPresentsAndCommits() throws {
    // No fixture rows (`-fixtures none`): the presented picker's buttons are the only ones with its labels.
    let app = XCUIApplication()
    app.launchArguments = ["-system", "tanrei", "-appearance", "light", "-contrast", "standard", "-component", "time-picker", "-fixtures", "none"]
    app.launch()
    let opener = app.buttons["fixture.time-picker.presented"]
    XCTAssertTrue(opener.waitForExistence(timeout: 20), app.debugDescription)
    opener.swipeUpUntilVisible(in: app)
    opener.tap()
    let ok = app.buttons["OK"].firstMatch
    XCTAssertTrue(app.buttons["Switch to text entry"].firstMatch.waitForExistence(timeout: 5), app.debugDescription)
    XCTAssertFalse(app.segmentedControls["switch.appearance"].isHittable, "the gallery behind is inert")
    // Below the status bar, above the surface.
    app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.12)).tap()
    XCTAssertTrue(waitForGone(app.buttons["Switch to text entry"].firstMatch), "the scrim closes it")
    XCTAssertEqual(fired(app, "time-picker.presented"), "fired 0")
    opener.tap()
    XCTAssertTrue(ok.waitForExistence(timeout: 5))
    app.buttons["PM"].firstMatch.tap()
    app.buttons["OK"].firstMatch.tap()
    XCTAssertTrue(waitForFired(app, "time-picker.presented", 1))
    XCTAssertEqual("\(opener.value ?? "")", "19:30")
  }

  /// TMP-8 — with larger text the selectors grow rather than clip their numbers.
  func testTimePickerGrowsWithDynamicType() throws {
    func measure(_ category: String) -> CGRect {
      let app = launchTimePicker(["dial-hour"], extra: ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategory\(category)"])
      defer { app.terminate() }
      return timePicker(app, "dial-hour").descendants(matching: .any).matching(NSPredicate(format: "label == 'Minute'")).firstMatch.frame
    }
    let regular = measure("L")
    let large = measure("AccessibilityXL")
    XCTAssertGreaterThan(large.width, regular.width, "\(regular) → \(large)")
  }

  /// Every time-picker fixture is shown, and the screens it is on pass the accessibility audit in light and dark — one fixture
  /// a launch (each is a tall stage). Under the gallery's switches a dial fixture's 520-tall stage does not fit the first
  /// screen, so `auditFixtures` launches without the switches and never scrolls. The audit's
  /// Dynamic Type check is left out, as for the dialog: it reports every text in the surface as not scaling although they
  /// grow (testTimePickerGrowsWithDynamicType) — both surfaces choose their layout with `ViewThatFits`, the likely
  /// cause. The "Text clipped" guess is exempt for the text-entry fields, as for the text field's. The contrast of an
  /// element that is not wholly inside the horizontal fixture's row is not audited: that row scrolls sideways, and the
  /// audit compares the part it clips away with whatever lies there, as for the dialog's scrolled text.
  func testTimePickerFixturesPassTheAudit() throws {
    let exempt: (XCUIAccessibilityAuditIssue) -> Bool = { issue in
      if issue.auditType == .textClipped && issue.element?.elementType == .textField { return true }
      guard issue.auditType == .contrast, let element = issue.element else { return false }
      let row = XCUIApplication().descendants(matching: .any)["fixture.time-picker.horizontal"]
      return row.exists && element.frame.intersects(row.frame) && !row.frame.contains(element.frame)
    }
    for id in try fixtureIds("time-picker") {
      try auditFixtures(
        of: "time-picker", types: XCUIAccessibilityAuditType.all.subtracting(.dynamicType), only: [id], exempt: exempt, runnerOnly: .inaccessibleTextWithoutElement)
    }
  }

  // MARK: divider (specs/divider.spec.json)

  /// The accessibility elements inside a divider fixture's group: what VoiceOver can reach there. The group's two
  /// captions are static texts; anything else with a value is the divider.
  private func dividerElements(_ app: XCUIApplication, _ id: String) -> [XCUIElement] {
    let group = app.descendants(matching: .any)["fixture.divider.\(id)"]
    return group.descendants(matching: .any).allElementsBoundByIndex.filter { "\($0.value ?? "")" == "horizontal" || "\($0.value ?? "")" == "vertical" }
  }

  /// DIV-5 — a decorative divider (the default) exposes nothing; DIV-6 — `isDecorative: false` is an element of its
  /// own with its orientation and no name; neither is focusable (DIV-5, DIV-6: not a button, never selected). The rows
  /// of every fixture are shown and pass the accessibility audit.
  func testDividerSemantics() throws {
    let app = try launch("divider")
    for id in try fixtureIds("divider") where id != "horizontal-separator" {
      XCTAssertEqual(dividerElements(app, id).count, 0, "decorative \(id) is exposed")
    }
    let separator = dividerElements(app, "horizontal-separator")
    XCTAssertEqual(separator.count, 1, "the separator is exposed once")
    if let element = separator.first {
      XCTAssertEqual(element.label, "", "a separator has no name")
      XCTAssertEqual("\(element.value ?? "")", "horizontal")
      XCTAssertNotEqual(element.elementType, .button)
      XCTAssertFalse(element.hasFocus)
    }
  }

  /// Every divider fixture is shown, and the screens they are on pass the accessibility audit in light and dark.
  func testDividerFixturesPassTheAudit() throws {
    try auditFixtures(of: "divider", runnerOnly: .inaccessibleTextWithoutElement)
  }

  // MARK: badge (specs/badge.spec.json)

  /// BDG-8 — the anchor keeps its own name and gains the badge's label as its value; the drawn dot and number are not
  /// elements of their own. BDG-5 — a count of 0 adds nothing: the anchor is announced as it would be without a badge.
  func testBadgeAddsItsLabelToTheAnchor() throws {
    let app = try launch("badge")
    let expected: [String: String] = [
      "dot": "New messages", "count-single": "3 unread", "count-double": "42 unread",
      "count-overflow": "More than 999 unread", "count-custom-max": "More than 99 unread", "count-zero": "",
    ]
    XCTAssertEqual(Set(expected.keys), Set(try fixtureIds("badge")))
    XCTAssertEqual(Set(try fixtureProps("badge", "label").values), Set(expected.values.filter { !$0.isEmpty } + ["No unread messages"]))
    for (id, value) in expected {
      let anchor = app.images["fixture.badge.\(id)"]
      XCTAssertTrue(anchor.exists, id)
      // The spec's default slot: a fixture's anchor is named by its glyph (the content); the label is the value.
      XCTAssertEqual(anchor.label, "notifications", id)
      XCTAssertEqual("\(anchor.value ?? "")", value, id)
      // Nothing else is exposed for the badge: the drawn number is hidden (it is never read twice).
      XCTAssertEqual(anchor.descendants(matching: .any).count, 0, id)
    }
    XCTAssertFalse(app.staticTexts["999+"].exists)
    XCTAssertFalse(app.staticTexts["3"].exists)
  }

  /// Every badge fixture is shown, and the screens they are on pass the accessibility audit in light and dark.
  func testBadgeFixturesPassTheAudit() throws {
    try auditFixtures(of: "badge")
  }

  // MARK: bottom sheet (specs/bottom-sheet.spec.json)

  /// The gallery with the bottom sheet's section only: `fixtures` of its fixtures, and its presented examples unless
  /// `explore` is false.
  private func launchBottomSheet(_ fixtures: [String], explore: Bool = false, extra: [String] = []) -> XCUIApplication {
    let app = XCUIApplication()
    app.launchArguments = ["-system", "tanrei", "-appearance", "light", "-contrast", "standard", "-component", "bottom-sheet",
      "-fixtures", fixtures.joined(separator: ",")] + (explore ? [] : ["-noExplore", "YES"]) + extra
    app.launch()
    return app
  }

  /// The element named `label`: a bottom sheet's container.
  private func sheet(_ app: XCUIApplication, _ label: String) -> XCUIElement {
    app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", label)).firstMatch
  }

  /// BSH-22 — a fixture's sheet is a container named by its label. BSH-11 — while it has two heights its handle is one button
  /// named by the handle label whose value says whether the sheet is expanded, and a tap moves it to its other height (the
  /// in-place sheet fires its detentChange) and back; at one height the handle is not exposed. The grip is never an element.
  func testBottomSheetSemanticsAndHandle() throws {
    let expected = [
      "modal": "Save photo", "modal-partial": "Terms of service", "modal-full": "Terms of service", "no-handle": "Save photo",
      "standard": "Nearby places",
    ]
    XCTAssertEqual(Set(expected.keys), Set(try fixtureIds("bottom-sheet")))
    for (id, label) in expected {
      let app = launchBottomSheet([id])
      XCTAssertTrue(app.descendants(matching: .any)["fixture.bottom-sheet.\(id)"].firstMatch.waitForExistence(timeout: 20), id)
      XCTAssertTrue(sheet(app, label).exists, "\(id): \(app.debugDescription)")
      let handle = app.buttons["Resize sheet"]
      if id == "modal-partial" || id == "modal-full" {
        XCTAssertTrue(handle.waitForExistence(timeout: 5), "\(id): \(app.debugDescription)")
        let expanded = id == "modal-full"
        XCTAssertEqual(handle.value as? String, expanded ? "expanded" : "collapsed", id)
        handle.tap()
        XCTAssertTrue(waitForFired(app, "bottom-sheet.\(id)", 1), id)
        XCTAssertEqual(handle.value as? String, expanded ? "collapsed" : "expanded", id)
        handle.tap()
        XCTAssertTrue(waitForFired(app, "bottom-sheet.\(id)", 2), id)
      } else {
        XCTAssertFalse(handle.exists, "\(id): a handle at one height is not exposed")
      }
      app.terminate()
    }
  }

  /// BSH-9, BSH-20 — a drag on a fixture's handle row down past half its height asks to close (fires once); the in-place
  /// sheet stays open, as when its product declines, so it settles back where it was.
  func testBottomSheetDeclinedDragSettlesBack() throws {
    let app = launchBottomSheet(["modal"])
    let row = app.descendants(matching: .any)["fixture.bottom-sheet.modal"].firstMatch
    XCTAssertTrue(row.waitForExistence(timeout: 20), app.debugDescription)
    // The sheet's content region: the handle's row is right above it.
    let content = row.scrollViews.firstMatch
    XCTAssertTrue(content.exists, app.debugDescription)
    let before = content.frame
    let handleRow = app.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: before.minX + 30, dy: before.minY - 20))
    handleRow.press(forDuration: 0.1, thenDragTo: handleRow.withOffset(CGVector(dx: 0, dy: before.height + 60)))
    XCTAssertTrue(waitForFired(app, "bottom-sheet.modal", 1), app.debugDescription)
    let settled = NSPredicate(format: "frame == %@", NSValue(cgRect: before))
    XCTAssertEqual(XCTWaiter().wait(for: [expectation(for: settled, evaluatedWith: content)], timeout: 5), .completed, "\(before) → \(content.frame)")
  }

  /// BSH-2 — a modal sheet presented from its button covers the gallery: the gallery's own controls are not reachable while
  /// it is open. BSH-5 — a tap on the scrim closes it (the binding is written false: the button's value says closed) and
  /// fires once. BSH-11 — its handle moves it to its full height. BSH-9 — a drag on its handle's row down to the bottom
  /// closes it. BSH-10 — a drag up on its content below its full height raises the sheet. The content's own button closes
  /// it too, which fires nothing.
  func testBottomSheetModalClosesAndDrags() throws {
    let app = launchBottomSheet(["modal"], explore: true)
    let opener = app.buttons["fixture.bottom-sheet.presented"]
    XCTAssertTrue(opener.waitForExistence(timeout: 20), app.debugDescription)
    opener.swipeUpUntilVisible(in: app)
    let closed = NSPredicate(format: "exists == false")
    let done = app.buttons["Done"]
    func open() {
      opener.tap()
      XCTAssertTrue(done.waitForExistence(timeout: 5), app.debugDescription)
    }
    // The scrim.
    open()
    XCTAssertTrue(sheet(app, "Share photo").exists, app.debugDescription)
    XCTAssertFalse(app.segmentedControls["switch.appearance"].isHittable)
    app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.12)).tap()
    XCTAssertEqual(XCTWaiter().wait(for: [expectation(for: closed, evaluatedWith: done)], timeout: 5), .completed, app.debugDescription)
    XCTAssertEqual("\(opener.value ?? "")", "closed")
    XCTAssertTrue(waitForFired(app, "bottom-sheet.presented", 1))
    // The handle, then a drag from its row to the bottom.
    open()
    let handle = app.buttons["Resize sheet"]
    XCTAssertEqual(handle.value as? String, "collapsed", app.debugDescription)
    handle.tap()
    let expanded = NSPredicate(format: "value == 'expanded'")
    XCTAssertEqual(XCTWaiter().wait(for: [expectation(for: expanded, evaluatedWith: handle)], timeout: 5), .completed, handle.debugDescription)
    handle.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
      .press(forDuration: 0.1, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.99)))
    XCTAssertEqual(XCTWaiter().wait(for: [expectation(for: closed, evaluatedWith: done)], timeout: 5), .completed, app.debugDescription)
    XCTAssertTrue(waitForFired(app, "bottom-sheet.presented", 2))
    // A drag up on the content raises the sheet to its full height.
    open()
    let text = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH 'Pick where'")).firstMatch
    XCTAssertEqual(handle.value as? String, "collapsed")
    let start = text.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.05))
    start.press(forDuration: 0.1, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.05)))
    XCTAssertEqual(XCTWaiter().wait(for: [expectation(for: expanded, evaluatedWith: handle)], timeout: 5), .completed, handle.debugDescription)
    // At its full height, the next drag up scrolls the content; the sheet stays.
    let unscrolled = text.frame.minY
    text.swipeUp()
    XCTAssertLessThan(text.frame.minY, unscrolled - 20, text.debugDescription)
    XCTAssertEqual(handle.value as? String, "expanded")
    // The scrim in the top margin above the full height (below the status bar, which a tap would scroll) closes it too.
    app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.085)).tap()
    XCTAssertEqual(XCTWaiter().wait(for: [expectation(for: closed, evaluatedWith: done)], timeout: 5), .completed, app.debugDescription)
    XCTAssertTrue(waitForFired(app, "bottom-sheet.presented", 3))
    // Its own control closes it: the product's close, not the sheet's.
    open()
    done.tap()
    XCTAssertEqual(XCTWaiter().wait(for: [expectation(for: closed, evaluatedWith: done)], timeout: 5), .completed, app.debugDescription)
    XCTAssertEqual(fired(app, "bottom-sheet.presented"), "fired 3")
  }

  /// BSH-4 — a standard sheet over a page: no scrim, and the page's own button stays usable while it is open (it hides the
  /// sheet again). BSH-22 — the sheet is a container named by its label.
  func testBottomSheetStandardLeavesThePageUsable() throws {
    let app = launchBottomSheet(["modal"], explore: true)
    let nearby = app.buttons["Nearby"]
    XCTAssertTrue(nearby.waitForExistence(timeout: 20), app.debugDescription)
    nearby.swipeUpUntilVisible(in: app)
    nearby.tap()
    let places = sheet(app, "Nearby places")
    XCTAssertTrue(places.waitForExistence(timeout: 5), app.debugDescription)
    XCTAssertTrue(nearby.isHittable)
    XCTAssertTrue(app.segmentedControls["switch.appearance"].exists)
    XCTAssertEqual("\(nearby.value ?? "")", "open")
    nearby.tap()
    let gone = NSPredicate(format: "exists == false")
    XCTAssertEqual(XCTWaiter().wait(for: [expectation(for: gone, evaluatedWith: places)], timeout: 5), .completed, app.debugDescription)
    XCTAssertEqual(fired(app, "bottom-sheet.standard-page"), "fired 0")
  }

  /// BSH-24 — with larger text the sheet grows with its content (the modal fixture's two lines take more room).
  func testBottomSheetGrowsWithDynamicType() throws {
    func height(_ category: String) throws -> CGFloat {
      let app = launchBottomSheet(["modal"], extra: ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategory\(category)"])
      defer { app.terminate() }
      let row = app.descendants(matching: .any)["fixture.bottom-sheet.modal"].firstMatch
      XCTAssertTrue(row.waitForExistence(timeout: 20), app.debugDescription)
      // The sheet's content region (the handle keeps its row).
      return row.scrollViews.firstMatch.frame.height
    }
    let regular = try height("L")
    let large = try height("AccessibilityXL")
    XCTAssertGreaterThan(large, regular)
  }

  /// Every bottom sheet fixture is shown, and the screen it is on passes the accessibility audit in light and dark — one
  /// fixture a launch, so that none needs a scroll (after a scroll the audit misreports). The contrast of a text taller
  /// than the window is not audited: the long fixtures' content reaches far past the sheet that clips it, so the audit
  /// compares its hidden part with whatever lies there (as for the dialog).
  func testBottomSheetFixturesPassTheAudit() throws {
    let window = XCUIApplication().windows.firstMatch
    let clippedText: (XCUIAccessibilityAuditIssue) -> Bool = { issue in
      guard issue.auditType == .contrast, let element = issue.element, element.elementType == .staticText else { return false }
      return element.frame.height > window.frame.height
    }
    for id in try fixtureIds("bottom-sheet") {
      try auditFixtures(of: "bottom-sheet", only: [id], exempt: clippedText)
    }
  }

  // MARK: progress-indicator (specs/progress-indicator.spec.json)

  /// PRG-8 — determinate: a progress element named by the label, with the percentage as its value or valueText
  /// instead; PRG-9 — indeterminate: named, no value of its own but "in progress" (busy); PRG-10 — never focusable.
  func testProgressIndicatorSemantics() throws {
    let app = try launchComponent("progress-indicator")
    for id in try fixtureIds("progress-indicator") {
      let element = app.descendants(matching: .any)["fixture.progress-indicator.\(id)"]
      XCTAssertTrue(element.exists, id)
      XCTAssertEqual(element.label, "Uploading", id)
      XCTAssertFalse(element.hasFocus, id)
    }
    let determinate = app.descendants(matching: .any)["fixture.progress-indicator.linear-determinate"]
    XCTAssertEqual(determinate.elementType, .progressIndicator)
    XCTAssertEqual("\(determinate.value ?? "")", "40%")
    XCTAssertEqual("\(app.descendants(matching: .any)["fixture.progress-indicator.linear-range"].value ?? "")", "3 of 10 files")
    XCTAssertEqual("\(app.descendants(matching: .any)["fixture.progress-indicator.linear-full"].value ?? "")", "100%")
    // PRG-9: indeterminate is the busy (in-progress) element, with no percentage.
    for id in ["linear-indeterminate", "circular-indeterminate"] {
      let element = app.descendants(matching: .any)["fixture.progress-indicator.\(id)"]
      XCTAssertEqual(element.elementType, .activityIndicator, id)
      XCTAssertFalse("\(element.value ?? "")".hasSuffix("%"), id)
    }
  }

  /// Every progress indicator fixture is shown, and the screens they are on pass the accessibility audit in light and
  /// dark (PRG-10: not interactive, so the hit-region audit does not apply to it).
  func testProgressIndicatorFixturesPassTheAudit() throws {
    // The hit-region audit asks every element for a minimum size; a progress indicator is not interactive — the spec's
    // accessibility note: "the minimum target holds without extending anything" (as for UIKit's 4-point
    // `UIProgressView`).
    // "Potentially inaccessible text" with no element is the runner's, on screens reached
    // by scrolling (none on the first screen).
    try auditFixtures(
      of: "progress-indicator", freezingLoops: true,
      exempt: { issue in
        issue.auditType == .hitRegion && [.progressIndicator, .activityIndicator].contains(issue.element?.elementType)
      }, runnerOnly: .inaccessibleTextWithoutElement)
  }

  // MARK: loading-indicator (specs/loading-indicator.spec.json)

  /// LDG-5 — a progress element in its busy state (XCUITest: an activity indicator), named by the label, with no
  /// value; LDG-6 — never focusable.
  func testLoadingIndicatorSemantics() throws {
    let app = try launchComponent("loading-indicator")
    for id in try fixtureIds("loading-indicator") {
      let element = app.descendants(matching: .any)["fixture.loading-indicator.\(id)"]
      XCTAssertTrue(element.waitForExistence(timeout: 5), id)
      XCTAssertEqual(element.elementType, .activityIndicator, id)
      XCTAssertEqual(element.label, "Loading", id)
      XCTAssertFalse(element.hasFocus, id)
    }
  }

  /// Every loading indicator fixture is shown, and the screens they are on pass the accessibility audit in light and
  /// dark (LDG-6: not interactive, so the hit-region audit does not apply to it).
  func testLoadingIndicatorFixturesPassTheAudit() throws {
    try auditFixtures(of: "loading-indicator", freezingLoops: true) { issue in
      issue.auditType == .hitRegion && [.progressIndicator, .activityIndicator].contains(issue.element?.elementType)
    }
  }

  // MARK: fab (specs/fab.spec.json)

  /// FAB-1 — a tap fires once, under overlay, ripple and dim; the label is the accessible name (the icon is decorative);
  /// FAB-2 — disabled: exposed as such, never fires.
  func testFabSemanticsAndActivation() throws {
    for system in ["tanrei", "m3-like", "cupertino"] {
      let app = try launchComponent("fab", system: system)
      let fab = app.buttons["fixture.fab.filled-medium"]
      XCTAssertEqual(fab.label, "Create", system)
      fab.tap()
      XCTAssertTrue(waitForFired(app, "fab.filled-medium", 1), system)
      let disabled = app.buttons["fixture.fab.filled-disabled"]
      XCTAssertFalse(disabled.isEnabled, system)
      disabled.tap()
      Thread.sleep(forTimeInterval: 0.5)
      XCTAssertEqual(fired(app, "fab.filled-disabled"), "fired 0", system)
      XCTAssertEqual(fired(app, "fab.filled-medium"), "fired 1", system)
      app.terminate()
    }
  }

  /// FAB-1 — Return and Space on a hardware keyboard each activate the focused FAB exactly once.
  func testFabReturnAndSpaceActivateExactlyOnce() throws {
    let app = try launch("fab", focus: "fab.filled-medium")
    try requireKeyboardFocus(app, on: "fab.filled-medium")
    app.typeKey(.return, modifierFlags: [])
    XCTAssertTrue(waitForFired(app, "fab.filled-medium", 1))
    app.typeKey(.space, modifierFlags: [])
    XCTAssertTrue(waitForFired(app, "fab.filled-medium", 2))
    Thread.sleep(forTimeInterval: 1)
    XCTAssertEqual(fired(app, "fab.filled-medium"), "fired 2")
  }

  /// "Text size does not change the square: an icon is not text. At 200% text size the button keeps its size and its
  /// label is still announced." (FAB-11)
  func testFabKeepsItsSizeWithDynamicType() throws {
    func measure(_ category: String) throws -> CGSize {
      let app = XCUIApplication()
      app.launchArguments = ["-system", "tanrei", "-appearance", "light", "-contrast", "standard", "-component", "fab", "-noExplore", "YES",
        "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategory\(category)"]
      app.launch()
      defer { app.terminate() }
      let fab = app.buttons["fixture.fab.filled-large"]
      XCTAssertTrue(fab.waitForExistence(timeout: 20))
      XCTAssertEqual(fab.label, "Create")
      return fab.frame.size
    }
    XCTAssertEqual(try measure("L"), try measure("AccessibilityXXXL"))
  }

  /// Every FAB fixture is shown, and the screens they are on pass the accessibility audit in light and dark.
  func testFabFixturesPassTheAudit() throws {
    try auditFixtures(of: "fab")
  }

  // MARK: fab-menu (specs/fab-menu.spec.json)

  /// The gallery with the named FAB menu fixtures only, waiting for the first.
  private func launchFabMenu(_ ids: [String], system: String = "tanrei", extra: [String] = []) -> XCUIApplication {
    let app = XCUIApplication()
    app.launchArguments = ["-system", system, "-appearance", "light", "-contrast", "standard", "-component", "fab-menu", "-noExplore", "YES",
      "-fixtures", ids.joined(separator: ",")] + extra
    app.launch()
    XCTAssertTrue(app.descendants(matching: .any)["fixture.fab-menu.\(ids[0])"].waitForExistence(timeout: 20))
    return app
  }

  private func fabMenuGone(_ element: XCUIElement) -> Bool {
    XCTWaiter().wait(for: [expectation(for: NSPredicate(format: "exists == false"), evaluatedWith: element)], timeout: 5) == .completed
  }

  /// FBM-20 — the toggle is a button named by label (its glyph hidden); the presented items are buttons named by their
  /// labels, each with its position. FBM-1 / FBM-13 — a tap on the toggle presents the items; FBM-16 — a tap on an item
  /// fires once and closes the menu; FBM-15 — a tap outside closes it and fires nothing. Under overlay, ripple and dim.
  /// FBM-2 — disabled: exposed as such, and a tap presents nothing.
  func testFabMenuPresentsChoosesAndCloses() throws {
    for system in ["tanrei", "m3-like", "cupertino"] {
      let app = launchFabMenu(["filled-closed", "filled-disabled"], system: system)
      let row = app.descendants(matching: .any)["fixture.fab-menu.filled-closed"]
      let toggle = row.buttons["Create"]
      XCTAssertTrue(toggle.exists, "\(system): \(row.debugDescription)")
      XCTAssertFalse(app.buttons["Document"].exists, system)
      toggle.tap()
      let document = app.buttons["Document"]
      XCTAssertTrue(document.waitForExistence(timeout: 5), "\(system): \(app.debugDescription)")
      XCTAssertEqual("\(document.value ?? "")", "1 of 3", system)
      XCTAssertEqual("\(app.buttons["Upload"].value ?? "")", "3 of 3", system)
      // FBM-13: above the toggle, the first at the top. Measured on the labels, whose frames are the item containers: a
      // button's frame also takes in its shadow.
      func container(_ title: String) -> CGRect { app.buttons[title].staticTexts[title].frame }
      XCTAssertLessThan(container("Upload").maxY, toggle.frame.minY, "\(system): \(app.debugDescription)")
      XCTAssertLessThan(container("Document").maxY, container("Folder").minY, system)
      // The popover as presented, kept for review (its placement and chrome are the popover's).
      let presented = XCTAttachment(screenshot: app.screenshot())
      presented.name = "fab-menu presented (\(system))"
      presented.lifetime = .keepAlways
      add(presented)
      app.buttons["Folder"].tap()
      XCTAssertTrue(waitForFired(app, "fab-menu.filled-closed", 1), system)
      XCTAssertTrue(fabMenuGone(app.buttons["Document"]), "\(system): \(app.debugDescription)")

      // FBM-15: a tap outside closes it, and fires nothing.
      toggle.tap()
      XCTAssertTrue(app.buttons["Document"].waitForExistence(timeout: 5), system)
      app.coordinate(withNormalizedOffset: CGVector(dx: 0.1, dy: 0.2)).tap()
      XCTAssertTrue(fabMenuGone(app.buttons["Document"]), "\(system): \(app.debugDescription)")
      XCTAssertEqual(fired(app, "fab-menu.filled-closed"), "fired 1", system)

      // FBM-2: disabled.
      let disabled = app.descendants(matching: .any)["fixture.fab-menu.filled-disabled"].buttons["Create"]
      // A disabled button is never hittable: scroll only when it is off screen.
      if !app.windows.firstMatch.frame.contains(disabled.frame) { scrollIntoView(app, disabled) }
      XCTAssertFalse(disabled.isEnabled, system)
      disabled.tap()
      Thread.sleep(forTimeInterval: 0.5)
      XCTAssertFalse(app.buttons["Document"].exists, system)
      app.terminate()
    }
  }

  /// FBM-13 — an open fixture draws its items in place above its toggle, end-aligned with it; FBM-16 — a tap on an item
  /// fires once and closes the menu; FBM-1 — a tap on the toggle opens it again.
  func testFabMenuInPlaceItems() throws {
    let app = launchFabMenu(["filled-open"])
    let row = app.descendants(matching: .any)["fixture.fab-menu.filled-open"]
    let toggle = row.buttons["Create"]
    let upload = row.buttons["Upload"]
    XCTAssertTrue(upload.exists, row.debugDescription)
    // The label's frame is the item's container (the button's also takes in its shadow).
    let container = upload.staticTexts["Upload"].frame
    XCTAssertLessThan(container.maxY, toggle.frame.minY)
    XCTAssertEqual(container.maxX, toggle.frame.maxX, accuracy: 1, row.debugDescription)
    XCTAssertEqual("\(upload.value ?? "")", "3 of 3")
    upload.tap()
    XCTAssertTrue(waitForFired(app, "fab-menu.filled-open", 1))
    XCTAssertTrue(fabMenuGone(row.buttons["Upload"]), row.debugDescription)
    toggle.tap()
    XCTAssertTrue(row.buttons["Upload"].waitForExistence(timeout: 5), row.debugDescription)
    XCTAssertEqual(fired(app, "fab-menu.filled-open"), "fired 1")
  }

  /// "Text size does not change the toggle: an icon is not text. The items grow with enlarged text" (FBM-11, FBM-18).
  func testFabMenuToggleKeepsItsSizeAndItemsGrowWithDynamicType() throws {
    func measure(_ category: String) throws -> (toggle: CGSize, item: CGSize) {
      let app = launchFabMenu(["filled-open"], extra: ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategory\(category)"])
      defer { app.terminate() }
      let row = app.descendants(matching: .any)["fixture.fab-menu.filled-open"]
      let toggle = row.buttons["Create"]
      XCTAssertEqual(toggle.label, "Create")
      return (toggle.frame.size, row.buttons["Folder"].frame.size)
    }
    let large = try measure("L")
    let huge = try measure("AccessibilityXXXL")
    XCTAssertEqual(large.toggle, huge.toggle)
    XCTAssertGreaterThan(huge.item.height, large.item.height)
  }

  /// Every FAB menu fixture is shown, and the screen it is on passes the accessibility audit in light and dark — one
  /// fixture a launch. Each stage is 320 tall: two do not fit on one screen, and on a screen reached by scrolling the
  /// audit misreports ('Contrast failed' on items whose labels are 12:1 and more); `auditFixtures` never scrolls.
  func testFabMenuFixturesPassTheAudit() throws {
    for id in try fixtureIds("fab-menu") {
      try auditFixtures(of: "fab-menu", only: [id], runnerOnly: .inaccessibleTextWithoutElement)
    }
  }

  // MARK: extended-fab (specs/extended-fab.spec.json)

  /// EFB-13 — the label is the accessible name, shown or collapsed away; EFB-1 — a tap fires once; EFB-2 — disabled.
  func testExtendedFabSemanticsAndActivation() throws {
    for system in ["tanrei", "m3-like", "cupertino"] {
      let app = try launchComponent("extended-fab", system: system)
      for id in ["filled-medium", "filled-collapsed", "filled-no-icon"] {
        XCTAssertEqual(app.buttons["fixture.extended-fab.\(id)"].label, "Compose", "\(system) \(id)")
      }
      XCTAssertLessThan(
        app.buttons["fixture.extended-fab.filled-collapsed"].frame.width, app.buttons["fixture.extended-fab.filled-medium"].frame.width, system)
      app.buttons["fixture.extended-fab.filled-collapsed"].tap()
      XCTAssertTrue(waitForFired(app, "extended-fab.filled-collapsed", 1), system)
      XCTAssertFalse(app.buttons["fixture.extended-fab.filled-disabled"].isEnabled, system)
      app.terminate()
    }
  }

  /// EFB-12 — "Text must remain readable at 200% text size: the container grows, the label never truncates."
  func testExtendedFabGrowsWithDynamicType() throws {
    func measure(_ category: String) throws -> CGSize {
      let app = XCUIApplication()
      app.launchArguments = ["-system", "tanrei", "-appearance", "light", "-contrast", "standard", "-component", "extended-fab", "-noExplore", "YES",
        "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategory\(category)"]
      app.launch()
      defer { app.terminate() }
      let button = app.buttons["fixture.extended-fab.filled-no-icon"]
      XCTAssertTrue(button.waitForExistence(timeout: 20))
      XCTAssertEqual(button.label, "Compose")
      return button.frame.size
    }
    let regular = try measure("L")
    let large = try measure("AccessibilityXL")
    XCTAssertGreaterThan(large.width, regular.width * 1.5, "\(regular) → \(large)")
    XCTAssertGreaterThan(large.height, regular.height, "\(regular) → \(large)")
  }

  /// Every extended FAB fixture is shown, and the screens they are on pass the accessibility audit in light and dark.
  func testExtendedFabFixturesPassTheAudit() throws {
    try auditFixtures(of: "extended-fab")
  }

  // MARK: chip (specs/chip.spec.json)

  /// CHP-1 — an action chip is a button named by its label, a tap fires once; CHP-11 — a filter chip is a toggle (a
  /// switch to XCUITest) that is on or off and flips on a tap; CHP-18 — an input chip is TWO buttons, the chip named by
  /// its label and its remove action named by removeLabel, and a tap on the remove action removes without clicking;
  /// CHP-2 — disabled: both exposed as such, neither fires. Under overlay, ripple and dim.
  func testChipSemanticsAndActivation() throws {
    for system in ["tanrei", "m3-like", "cupertino"] {
      let app = try launchComponent("chip", system: system)
      let action = app.buttons["fixture.chip.action-outlined"]
      XCTAssertEqual(action.label, "Add to calendar", system)
      XCTAssertEqual(action.elementType, .button, system)
      action.tap()
      XCTAssertTrue(waitForFired(app, "chip.action-outlined", 1), system)

      let filter = app.descendants(matching: .any)["fixture.chip.filter-unselected"]
      XCTAssertEqual(filter.label, "Vegetarian", system)
      XCTAssertFalse(isOn(filter), "\(system): \(state(filter))")
      XCTAssertTrue(isOn(app.descendants(matching: .any)["fixture.chip.filter-selected"]), system)
      filter.tap()
      XCTAssertTrue(waitForFired(app, "chip.filter-unselected", 1), system)
      XCTAssertTrue(isOn(filter), "\(system): a filter chip that was off is on after one tap — \(state(filter))")

      let input = app.descendants(matching: .any)["fixture.chip.input"]
      let chip = input.buttons["Ada Lovelace"]
      let remove = input.buttons["Remove Ada Lovelace"]
      XCTAssertTrue(chip.exists && remove.exists, "\(system): \(input.debugDescription)")
      XCTAssertGreaterThan(remove.frame.midX, chip.frame.minX + chip.frame.width / 2, system)
      remove.tap()
      let removed = NSPredicate(format: "label == %@", "removed 1")
      XCTAssertEqual(XCTWaiter().wait(for: [expectation(for: removed, evaluatedWith: app.staticTexts["removed.chip.input"])], timeout: 5), .completed, system)
      chip.tap()
      XCTAssertTrue(waitForFired(app, "chip.input", 1), system)
      Thread.sleep(forTimeInterval: 0.5)
      XCTAssertEqual(app.staticTexts["removed.chip.input"].label, "removed 1", system)

      let disabled = app.descendants(matching: .any)["fixture.chip.input-disabled"]
      XCTAssertFalse(disabled.buttons["Ada Lovelace"].isEnabled, system)
      XCTAssertFalse(disabled.buttons["Remove Ada Lovelace"].isEnabled, system)
      app.terminate()
    }
  }

  /// CHP-17 — the label stays one line and the chip grows in height with larger text; the name is the whole label.
  func testChipGrowsWithDynamicType() throws {
    func measure(_ category: String) throws -> CGSize {
      let app = XCUIApplication()
      app.launchArguments = ["-system", "tanrei", "-appearance", "light", "-contrast", "standard", "-component", "chip", "-noExplore", "YES",
        "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategory\(category)"]
      app.launch()
      defer { app.terminate() }
      let chip = app.buttons["fixture.chip.action-no-icon"]
      XCTAssertTrue(chip.waitForExistence(timeout: 20))
      XCTAssertEqual(chip.label, "Sounds good")
      return chip.frame.size
    }
    let regular = try measure("L")
    let large = try measure("AccessibilityXL")
    XCTAssertGreaterThan(large.height, regular.height, "\(regular) → \(large)")
  }

  /// Every chip fixture is shown, and the screens they are on pass the accessibility audit in light and dark.
  /// Fifteen chips take more than one screen, and after a scroll the audit misreports (it flags every text near the top
  /// edge, the gallery's own captions included); so the fixtures are
  /// audited in two launches of one screen each (`-fixtures`), every audit but Dynamic Type, then Dynamic Type alone (as
  /// the text field's: in one pass the audit did not complete in time on a loaded machine).
  ///
  /// One exemption: a contrast finding on the input-avatar chip's text in light. The audit takes the fixture's stand-in
  /// avatar — a mid-grey disc beside the label — for the text's color and measures it against the white surface; the label
  /// itself is on-surface (the same chip without the avatar passes).
  func testChipFixturesPassTheAudit() throws {
    let ids = try fixtureIds("chip")
    let avatarChip: (XCUIAccessibilityAuditIssue) -> Bool = { issue in
      issue.auditType == .contrast && issue.element?.elementType == .staticText && issue.element?.label == "Ada Lovelace"
        && (issue.element?.frame.width ?? 0) > 0
        && XCUIApplication().descendants(matching: .any)["fixture.chip.input-avatar"].frame.intersects(issue.element?.frame ?? .zero)
    }
    for part in [Array(ids.prefix(8)), Array(ids.dropFirst(8))] {
      try auditFixtures(of: "chip", types: XCUIAccessibilityAuditType.all.subtracting(.dynamicType), only: part, exempt: avatarChip)
      try auditFixtures(of: "chip", types: .dynamicType, only: part)
    }
  }

  // MARK: list (specs/list.spec.json)

  /// LST-12 — an interactive item and an option are buttons named by their headline, with their position as their value;
  /// an option is selected while chosen; a static item is not a button. LST-1 — a tap fires once; LST-2 — disabled:
  /// exposed as such, never fires; LST-13 / LST-14 — a tap on an option selects it (single) or switches it (multiple).
  /// Under overlay, ripple and dim.
  func testListSemanticsAndActivation() throws {
    for system in ["tanrei", "m3-like", "cupertino"] {
      let app = try launchComponent("list", system: system)
      func list(_ id: String) -> XCUIElement { app.descendants(matching: .any)["fixture.list.\(id)"] }
      XCTAssertEqual(list("one-line").buttons.count, 0, "\(system): a static item is not a button")
      XCTAssertTrue(list("one-line").staticTexts["Inbox"].exists, system)
      // LST-12 / LST-23: a static item's headline is its element, with its position. (Whether its media and other texts
      // are hidden cannot be read here: XCUITest lists a SwiftUI element's drawn text under it all the
      // same.)
      let ada = list("two-line-avatar").descendants(matching: .any).matching(NSPredicate(format: "label == %@ AND value == %@", "Ada Lovelace", "1 of 3"))
      XCTAssertGreaterThanOrEqual(ada.count, 1, "\(system): \(list("two-line-avatar").debugDescription)")

      let wifi = list("interactive").buttons["Wi-Fi"]
      XCTAssertTrue(wifi.exists, "\(system): \(list("interactive").debugDescription)")
      XCTAssertEqual("\(wifi.value ?? "")", "1 of 2", system)
      wifi.tap()
      XCTAssertTrue(waitForFired(app, "list.interactive", 1), system)

      let archive = list("interactive-disabled").buttons["Archive"]
      XCTAssertFalse(archive.isEnabled, system)
      archive.tap()
      list("interactive-disabled").buttons["Trash"].tap()
      XCTAssertTrue(waitForFired(app, "list.interactive-disabled", 1), system)

      let light = list("single-selected").buttons["Light"]
      let dark = list("single-selected").buttons["Dark"]
      XCTAssertTrue(light.isSelected && !dark.isSelected, "\(system): \(state(light)) / \(state(dark))")
      light.tap()
      dark.tap()
      XCTAssertTrue(waitForFired(app, "list.single-selected", 1), system)
      XCTAssertTrue(dark.isSelected && !light.isSelected, "\(system): \(state(light)) / \(state(dark))")

      let feature = list("multiple-selected").buttons["Feature"]
      XCTAssertFalse(feature.isSelected, system)
      feature.tap()
      XCTAssertTrue(waitForFired(app, "list.multiple-selected", 1), system)
      XCTAssertTrue(feature.isSelected && list("multiple-selected").buttons["Bug"].isSelected, system)
      app.terminate()
    }
  }

  /// Every list fixture is shown, and the screens they are on pass the accessibility audit in light and dark, at most three
  /// a launch and never on a scrolled screen (`auditFixtures`): three do not always fit under the gallery's switches, and
  /// the runner reports "Potentially inaccessible text" with no element on a scrolled screen, the finding
  /// `inaccessibleTextWithoutElement` expects there.
  func testListFixturesPassTheAudit() throws {
    let ids = try fixtureIds("list")
    for start in stride(from: 0, to: ids.count, by: 3) {
      try auditFixtures(of: "list", only: Array(ids[start..<min(start + 3, ids.count)]), runnerOnly: .inaccessibleTextWithoutElement)
    }
  }

  // MARK: menu (specs/menu.spec.json)

  /// MNU-24 — each item is a button named by its label; a checkbox item is a toggle (a switch to XCUITest) that is on or
  /// off; a radio item is selected while checked. MNU-6 — a tap on an action fires once; on a toggle it switches; on an
  /// option it checks it. MNU-9 — disabled: exposed as such, never fires. MNU-1 / MNU-5 — a menu opened from its button
  /// shows its items and closes after an action.
  func testMenuSemanticsAndActivation() throws {
    let app = XCUIApplication()
    app.launchArguments = ["-system", "tanrei", "-appearance", "light", "-contrast", "standard", "-component", "menu"]
    app.launch()
    func menu(_ id: String) -> XCUIElement { app.descendants(matching: .any)["fixture.menu.\(id)"] }
    XCTAssertTrue(menu("actions").waitForExistence(timeout: 20))
    let cut = menu("actions").buttons["Cut"]
    XCTAssertEqual(cut.elementType, .button, cut.debugDescription)
    XCTAssertEqual("\(cut.value ?? "")", "1 of 3")
    cut.tap()
    XCTAssertTrue(waitForFired(app, "menu.actions", 1))

    let grid = menu("checkbox-checked").switches["Show grid"]
    let rulers = menu("checkbox-checked").switches["Show rulers"]
    XCTAssertTrue(isOn(grid), state(grid))
    XCTAssertFalse(isOn(rulers), state(rulers))
    rulers.tap()
    XCTAssertTrue(waitForFired(app, "menu.checkbox-checked", 1))
    XCTAssertTrue(isOn(rulers), state(rulers))

    // MNU-24 / MNU-28: a titled group is a group named by its title.
    XCTAssertTrue(menu("group-titles").otherElements["Sort by"].exists, menu("group-titles").debugDescription)
    let name = menu("radio-checked").buttons["Sort by name"]
    let date = menu("radio-checked").buttons["Sort by date"]
    XCTAssertTrue(name.isSelected && !date.isSelected, "\(state(name)) / \(state(date))")
    date.tap()
    XCTAssertTrue(waitForFired(app, "menu.radio-checked", 1))
    XCTAssertTrue(date.isSelected && !name.isSelected, "\(state(name)) / \(state(date))")

    let paste = menu("disabled").buttons["Paste"]
    XCTAssertFalse(paste.isEnabled)
    paste.tap()
    Thread.sleep(forTimeInterval: 0.5)
    XCTAssertEqual(fired(app, "menu.disabled"), "fired 0")

    // One menu presented from its button.
    let anchor = app.buttons["fixture.menu.anchored"]
    anchor.swipeUpUntilVisible(in: app)
    anchor.tap()
    let rename = app.buttons["Rename"]
    XCTAssertTrue(rename.waitForExistence(timeout: 5), app.debugDescription)
    XCTAssertEqual("\(anchor.value ?? "")", "open")
    rename.tap()
    XCTAssertTrue(waitForFired(app, "menu.anchored", 1))
    let closed = NSPredicate(format: "value == %@", "closed")
    XCTAssertEqual(XCTWaiter().wait(for: [expectation(for: closed, evaluatedWith: anchor)], timeout: 5), .completed, "\(anchor.value ?? "")")
    XCTAssertFalse(app.buttons["Rename"].exists)
  }

  /// Every menu fixture is shown, and the screens they are on pass the accessibility audit in light and dark, at most two
  /// fixtures a launch and never on a scrolled screen (`auditFixtures`). Under the gallery's switches the pair `groups` +
  /// `group-titles` does not fit an iPhone 17's first screen, and after a scroll the audit misreports ('Contrast failed'
  /// on texts of 13:1 and more). Without the switches the pair ends near y 652.
  func testMenuFixturesPassTheAudit() throws {
    let ids = try fixtureIds("menu")
    for start in stride(from: 0, to: ids.count, by: 2) {
      try auditFixtures(of: "menu", only: Array(ids[start..<min(start + 2, ids.count)]), runnerOnly: .inaccessibleTextWithoutElement)
    }
  }

  // MARK: tabs (specs/tabs.spec.json)

  /// TAB-13 — each tab is a button named by its label (drawn or not), selected while it is the selected tab; the selected
  /// tab's panel follows the row. TAB-1 — a tap on another tab selects it and fires once; on the selected tab, nothing.
  /// TAB-2 — a disabled tab is exposed as such and never fires. Under overlay, ripple and dim.
  func testTabsSemanticsAndActivation() throws {
    for system in ["tanrei", "m3-like", "cupertino"] {
      let app = try launchComponent("tabs", system: system)
      // `firstMatch`: under the tab bar trait, XCUITest also lists the tab's drawn text as a button inside it; the
      // first match is the tab itself.
      func tabs(_ id: String) -> XCUIElement { app.descendants(matching: .any)["fixture.tabs.\(id)"] }
      let overview = tabs("primary").buttons["Overview"].firstMatch
      let activity = tabs("primary").buttons["Activity"].firstMatch
      XCTAssertTrue(overview.exists, "\(system): \(tabs("primary").debugDescription)")
      XCTAssertTrue(overview.isSelected && !activity.isSelected, "\(system): \(state(overview)) / \(state(activity))")
      XCTAssertTrue(tabs("primary").staticTexts["Overview panel"].exists, system)
      activity.tap()
      XCTAssertTrue(waitForFired(app, "tabs.primary", 1), system)
      XCTAssertTrue(activity.isSelected && !overview.isSelected, "\(system): \(state(overview)) / \(state(activity))")
      XCTAssertTrue(tabs("primary").staticTexts["Activity panel"].exists && !tabs("primary").staticTexts["Overview panel"].exists, system)
      activity.tap()
      Thread.sleep(forTimeInterval: 0.5)
      XCTAssertEqual(fired(app, "tabs.primary"), "fired 1", system)

      let billing = tabs("primary-disabled").buttons["Billing"].firstMatch
      XCTAssertFalse(billing.isEnabled, system)
      billing.tap()
      Thread.sleep(forTimeInterval: 0.5)
      XCTAssertEqual(fired(app, "tabs.primary-disabled"), "fired 0", system)

      // TAB-19: an icon-only tab is still named by its label.
      XCTAssertTrue(tabs("primary-icon-only").buttons["Settings"].firstMatch.exists, "\(system): \(tabs("primary-icon-only").debugDescription)")
      app.terminate()
    }
  }

  /// Every tabs fixture is shown, and the screens they are on pass the accessibility audit in light and dark.
  func testTabsFixturesPassTheAudit() throws {
    let ids = try fixtureIds("tabs")
    for start in stride(from: 0, to: ids.count, by: 4) {
      try auditFixtures(of: "tabs", only: Array(ids[start..<min(start + 4, ids.count)]))
    }
  }

  // MARK: toolbar (specs/toolbar.spec.json)

  /// An item of a toolbar fixture, by its label: a button, or a switch for a toggle.
  private func toolbarItem(_ app: XCUIApplication, _ id: String, _ label: String) -> XCUIElement {
    app.descendants(matching: .any)["fixture.toolbar.\(id)"].descendants(matching: .any).matching(identifier: label).firstMatch
  }

  /// TBR-11 — the toolbar is a container named by its label (SwiftUI has no toolbar role) that holds its items in reading
  /// order, each keeping its own name, role and state: an action a button, a toggle a switch that is on or off, a Button by
  /// its text. TBR-9 — each item fires on its own; a toggle flips only itself; a disabled item is exposed as such and never
  /// fires. TBR-2 / TBR-6 — a docked toolbar spreads its items across the row, a vertical one stacks them top to bottom.
  /// Under overlay, ripple and dim.
  func testToolbarSemanticsAndActivation() throws {
    for system in ["tanrei", "m3-like", "cupertino"] {
      let app = try launchComponent("toolbar", system: system)
      // TBR-11: named, holding its items in order.
      let docked = app.descendants(matching: .any)["fixture.toolbar.docked"]
      XCTAssertEqual(docked.label, "Message actions", "\(system): \(docked.debugDescription)")
      let labels = ["Archive", "Delete", "Mark as unread", "Move"]
      let items = labels.map { toolbarItem(app, "docked", $0) }
      for (label, item) in zip(labels, items) {
        XCTAssertTrue(item.exists, "\(system) \(label): \(docked.debugDescription)")
        XCTAssertEqual(item.elementType, .button, "\(system) \(label)")
      }
      // TBR-2: in reading order, spread across the toolbar.
      let frames = items.map(\.frame)
      XCTAssertTrue(zip(frames, frames.dropFirst()).allSatisfy { $0.midX < $1.midX && $0.maxX <= $1.minX + 0.5 }, "\(system): \(frames)")
      let spaces = zip(frames, frames.dropFirst()).map { $1.midX - $0.midX }
      XCTAssertTrue(spaces.allSatisfy { abs($0 - spaces[0]) <= 1 }, "\(system): \(frames) in \(docked.frame)")
      XCTAssertEqual(frames[0].midX - docked.frame.minX, docked.frame.maxX - frames[3].midX, accuracy: 1, "\(system): \(frames) in \(docked.frame)")
      // TBR-9: each item fires on its own.
      for (index, item) in items.enumerated() {
        item.tap()
        XCTAssertTrue(waitForFired(app, "toolbar.docked", index + 1), "\(system) \(labels[index])")
      }
      // TBR-9: a Button keeps its semantics.
      XCTAssertEqual(toolbarItem(app, "docked-button", "Send").elementType, .button, system)

      // TBR-9: a disabled item is exposed as such and never fires.
      let delete = toolbarItem(app, "docked-disabled-item", "Delete")
      if !delete.isHittable { scrollIntoView(app, app.descendants(matching: .any)["fixture.toolbar.docked-disabled-item"]) }
      XCTAssertFalse(delete.isEnabled, system)
      delete.tap()
      Thread.sleep(forTimeInterval: 0.5)
      XCTAssertEqual(fired(app, "toolbar.docked-disabled-item"), "fired 0", system)

      // TBR-9 / TBR-11: toggles stay toggles, on or off, and flip only themselves.
      let floating = app.descendants(matching: .any)["fixture.toolbar.floating"]
      if !floating.isHittable { scrollIntoView(app, floating) }
      XCTAssertEqual(floating.label, "Formatting", "\(system): \(floating.debugDescription)")
      let bold = toolbarItem(app, "floating", "Bold")
      let italic = toolbarItem(app, "floating", "Italic")
      XCTAssertTrue(isOn(bold) && !isOn(italic), "\(system): \(state(bold)) / \(state(italic))")
      italic.tap()
      XCTAssertTrue(waitForFired(app, "toolbar.floating", 1), system)
      XCTAssertTrue(isOn(bold) && isOn(italic), "\(system): \(state(bold)) / \(state(italic))")
      XCTAssertEqual(toolbarItem(app, "floating", "Insert link").elementType, .button, system)

      // TBR-6: a vertical toolbar stacks its items top to bottom.
      let vertical = app.descendants(matching: .any)["fixture.toolbar.floating-vertical"]
      if !vertical.isHittable { scrollIntoView(app, vertical) }
      let column = ["Zoom in", "Zoom out", "My location"].map { toolbarItem(app, "floating-vertical", $0).frame }
      XCTAssertTrue(zip(column, column.dropFirst()).allSatisfy { $0.midY < $1.midY && $0.maxY <= $1.minY + 0.5 && abs($0.midX - $1.midX) <= 1 }, "\(system): \(column)")
      app.terminate()
    }
  }

  /// TBR-14 — with larger text a docked toolbar grows to hold its Button, which grows as it does anywhere; a floating
  /// toolbar of icon buttons keeps its size, as they keep theirs.
  func testToolbarGrowsWithDynamicType() throws {
    func measure(_ category: String) throws -> (docked: CGRect, button: CGRect, floating: CGRect) {
      let app = XCUIApplication()
      app.launchArguments = ["-system", "tanrei", "-appearance", "light", "-contrast", "standard", "-component", "toolbar", "-noExplore", "YES",
        "-fixtures", "docked-one-item,floating", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategory\(category)"]
      app.launch()
      defer { app.terminate() }
      let docked = app.descendants(matching: .any)["fixture.toolbar.docked-one-item"]
      XCTAssertTrue(docked.waitForExistence(timeout: 20))
      let floating = app.descendants(matching: .any)["fixture.toolbar.floating"]
      return (docked.frame, toolbarItem(app, "docked-one-item", "Reply").frame, floating.frame)
    }
    let regular = try measure("L")
    let large = try measure("AccessibilityXL")
    XCTAssertGreaterThan(large.button.height, regular.button.height)
    XCTAssertGreaterThan(large.docked.height, regular.docked.height)
    XCTAssertGreaterThanOrEqual(large.docked.height, large.button.height - 1)
    XCTAssertEqual(large.floating.height, regular.floating.height, accuracy: 0.5)
  }

  /// Every toolbar fixture is shown, and the screens they are on pass the accessibility audit in light and dark.
  func testToolbarFixturesPassTheAudit() throws {
    let ids = try fixtureIds("toolbar")
    for start in stride(from: 0, to: ids.count, by: 4) {
      try auditFixtures(of: "toolbar", only: Array(ids[start..<min(start + 4, ids.count)]))
    }
  }

  // MARK: tooltip (specs/tooltip.spec.json)

  /// TIP-7 — a fixture that starts open is open (its value, as the gallery reports it). TIP-6 — a tap on the anchor closes
  /// it (toggle). TIP-3 — a long press opens it without activating the anchor, and after the finger lifts it closes by
  /// itself after the touch timeout. Each change fires once.
  func testTooltipOpensAndCloses() throws {
    let app = XCUIApplication()
    app.launchArguments = [
      "-system", "tanrei", "-appearance", "light", "-contrast", "standard", "-component", "tooltip", "-noExplore", "YES", "-fixtures", "plain",
    ]
    app.launch()
    let anchor = app.buttons["fixture.tooltip.plain"]
    XCTAssertTrue(anchor.waitForExistence(timeout: 20), app.debugDescription)
    let open = NSPredicate(format: "value == %@", "open")
    let closed = NSPredicate(format: "value == %@", "closed")
    XCTAssertEqual(XCTWaiter().wait(for: [expectation(for: open, evaluatedWith: anchor)], timeout: 5), .completed, "\(anchor.value ?? "")")
    anchor.tap()
    XCTAssertEqual(XCTWaiter().wait(for: [expectation(for: closed, evaluatedWith: anchor)], timeout: 5), .completed, "\(anchor.value ?? "")")
    XCTAssertTrue(waitForFired(app, "tooltip.plain", 1))
    anchor.press(forDuration: 1.2)
    XCTAssertTrue(waitForFired(app, "tooltip.plain", 2), fired(app, "tooltip.plain"))
    XCTAssertEqual("\(anchor.value ?? "")", "open")
    // The touch timeout (1500 ms) after the lift.
    XCTAssertEqual(XCTWaiter().wait(for: [expectation(for: closed, evaluatedWith: anchor)], timeout: 5), .completed, "\(anchor.value ?? "")")
    XCTAssertTrue(waitForFired(app, "tooltip.plain", 3), fired(app, "tooltip.plain"))
  }

  /// Every tooltip fixture is shown, and the screens they are on pass the accessibility audit in light and dark.
  func testTooltipFixturesPassTheAudit() throws {
    try auditFixtures(of: "tooltip")
  }

  // MARK: snackbar (specs/snackbar.spec.json)

  /// SNK-1, SNK-19 — in place, a tap on the action or on the close button fires once; the close button is named by its
  /// label. SNK-12 — a host shows a snackbar when asked and resolves it with its action. SNK-10 — showing it moves no
  /// focus: the button that asked keeps being the element tapped. Under overlay, ripple and dim.
  func testSnackbarActionsAndHost() throws {
    for system in ["tanrei", "m3-like", "cupertino"] {
      let app = XCUIApplication()
      app.launchArguments = ["-system", system, "-appearance", "light", "-contrast", "standard", "-component", "snackbar"]
      app.launch()
      func snackbar(_ id: String) -> XCUIElement { app.descendants(matching: .any)["fixture.snackbar.\(id)"] }
      XCTAssertTrue(snackbar("action").waitForExistence(timeout: 20), system)
      XCTAssertTrue(snackbar("action").staticTexts["Conversation archived"].exists, system)
      snackbar("action").buttons["Undo"].tap()
      XCTAssertTrue(waitForFired(app, "snackbar.action", 1), system)
      let close = snackbar("closable").buttons["Close"]
      XCTAssertTrue(close.exists, "\(system): \(snackbar("closable").debugDescription)")
      close.tap()
      XCTAssertTrue(waitForFired(app, "snackbar.closable", 1), system)

      let archive = app.buttons["Archive"]
      archive.swipeUpUntilVisible(in: app)
      archive.tap()
      let undo = app.descendants(matching: .any)["fixture.snackbar.hosted"].buttons["Undo"]
      XCTAssertTrue(undo.waitForExistence(timeout: 5), "\(system): \(app.debugDescription)")
      // It rises into place over the enter motion, at the bottom of its row; tap it once it is there.
      undo.swipeUpUntilVisible(in: app)
      let hittable = NSPredicate(format: "isHittable == true")
      XCTAssertEqual(XCTWaiter().wait(for: [expectation(for: hittable, evaluatedWith: undo)], timeout: 5), .completed, "\(system): \(undo.frame)")
      undo.tap()
      XCTAssertTrue(waitForFired(app, "snackbar.hosted", 1), system)
      app.terminate()
    }
  }

  /// Every snackbar fixture is shown, and the screens they are on pass the accessibility audit in light and dark, never on
  /// a scrolled screen (`auditFixtures`): they take more than the first screen under the gallery's switches, and on a
  /// scrolled screen the runner reports "Potentially inaccessible text" with no element
  /// (`inaccessibleTextWithoutElement`).
  func testSnackbarFixturesPassTheAudit() throws {
    try auditFixtures(of: "snackbar", runnerOnly: .inaccessibleTextWithoutElement)
  }

  // MARK: date picker (specs/date-picker.spec.json)

  /// The picker of a date-picker row: the container named by its label that carries the row's identifier.
  private func datePicker(_ app: XCUIApplication, _ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: "fixture.date-picker.\(id)").firstMatch
  }

  /// DTP-36 — the surface is a container named by label; each day a button named by its full date (todayLabel after today's),
  /// selected for the chosen date and for every day of a range, not enabled while unavailable; empty cells hidden; the view
  /// toggle a button named by its month and year; the navigation buttons named previousMonthLabel and nextMonthLabel; each
  /// year a button, selected for the displayed year, todayLabel after the current year's. DTP-13 — the weekday headers are
  /// named by the weekdays' full names.
  func testDatePickerSemantics() throws {
    let app = try launchComponent("date-picker")
    let docked = datePicker(app, "docked")
    docked.swipeUpUntilVisible(in: app)
    XCTAssertEqual(docked.label, "Select date", app.debugDescription)
    let chosen = docked.buttons["Thursday, September 17, 2026"]
    XCTAssertTrue(chosen.exists && chosen.isSelected, docked.debugDescription)
    XCTAssertTrue(docked.buttons["Thursday, September 24, 2026, Today"].exists)
    XCTAssertFalse(docked.buttons["Friday, September 18, 2026"].isSelected)
    XCTAssertEqual(docked.buttons.matching(NSPredicate(format: "label CONTAINS ', 2026'")).count, 30, "one button a day, empty cells hidden")
    // The view toggle: SwiftUI has no expanded state — a toggle (a switch to XCUITest), on while the year view is shown.
    let toggle = docked.switches["September 2026"]
    XCTAssertTrue(toggle.exists && "\(toggle.value ?? "")" == "0", docked.debugDescription)
    XCTAssertTrue(docked.buttons["Previous month"].exists && docked.buttons["Next month"].exists)
    XCTAssertTrue(docked.staticTexts["Sunday"].exists && docked.staticTexts["Saturday"].exists, "the weekday headers' names")

    let unavailable = datePicker(app, "docked-unavailable")
    unavailable.swipeUpUntilVisible(in: app)
    XCTAssertFalse(unavailable.buttons["Wednesday, September 23, 2026"].isEnabled, "after max: unavailable")
    let bookedChosen = unavailable.buttons["Saturday, September 12, 2026"]
    XCTAssertTrue(bookedChosen.isSelected && !bookedChosen.isEnabled, "chosen and unavailable")
    XCTAssertFalse(unavailable.buttons["Previous month"].isEnabled, "min's month")

    let range = datePicker(app, "docked-range-unavailable")
    range.swipeUpUntilVisible(in: app)
    for day in ["Thursday, September 10, 2026", "Sunday, September 13, 2026", "Wednesday, September 16, 2026"] {
      XCTAssertTrue(range.buttons[day].isSelected, "\(day): every day of a range")
    }
    XCTAssertEqual(range.buttons["Thursday, September 10, 2026"].value as? String ?? "", "", "the description is a hint")

    let year = datePicker(app, "modal-year")
    year.swipeUpUntilVisible(in: app)
    XCTAssertEqual("\(year.switches["September 2026"].value ?? "")", "1", "the year view is shown")
    XCTAssertTrue(year.buttons["2026"].isSelected)
    XCTAssertTrue(year.buttons["2027, Today"].exists)
  }

  /// DTP-1 DTP-6 DTP-24 — a modal picker presented from its button covers the gallery; a day is pending until OK commits it
  /// (change fires once, the opener shows the new date); DTP-5 — a tap on its scrim closes it and commits nothing.
  func testDatePickerPresentsAndCommits() throws {
    let app = XCUIApplication()
    app.launchArguments = ["-system", "tanrei", "-appearance", "light", "-contrast", "standard", "-component", "date-picker", "-fixtures", "docked"]
    app.launch()
    XCTAssertTrue(datePicker(app, "docked").waitForExistence(timeout: 20), app.debugDescription)
    let opener = app.buttons["fixture.date-picker.presented"]
    opener.swipeUpUntilVisible(in: app)
    opener.tap()
    let ok = app.buttons["OK"]
    XCTAssertTrue(ok.waitForExistence(timeout: 5), app.debugDescription)
    XCTAssertFalse(app.segmentedControls["switch.appearance"].isHittable, "the gallery behind is inert")
    // The docked fixture behind has the same days: the presented picker's are the ones that can be hit.
    func day(_ name: String) -> XCUIElement? { app.buttons.matching(identifier: name).allElementsBoundByIndex.first { $0.isHittable } }
    try XCTUnwrap(day("Friday, September 18, 2026"), app.debugDescription).tap()
    XCTAssertEqual(fired(app, "date-picker.presented"), "fired 0", "a modal choice is pending")
    ok.tap()
    XCTAssertTrue(waitForFired(app, "date-picker.presented", 1))
    XCTAssertTrue(waitForGone(ok))
    XCTAssertEqual("\(opener.value ?? "")", "2026-09-18")
    opener.tap()
    XCTAssertTrue(ok.waitForExistence(timeout: 5))
    try XCTUnwrap(day("Saturday, September 19, 2026")).tap()
    app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.1)).tap()
    XCTAssertTrue(waitForGone(ok), "the scrim closes it")
    XCTAssertEqual(fired(app, "date-picker.presented"), "fired 1")
    XCTAssertEqual("\(opener.value ?? "")", "2026-09-18")
  }

  /// DTP-2 DTP-7 — a docked picker opens below its field (above it where the room below is short) from the calendar button in
  /// the field's trailing slot (TXF-22: an interactive element in a slot stays in the accessibility tree, found by its label);
  /// a tap on a day commits it and closes the picker.
  func testDatePickerDockedChoosesAndCloses() throws {
    let app = XCUIApplication()
    app.launchArguments = ["-system", "tanrei", "-appearance", "light", "-contrast", "standard", "-component", "date-picker", "-fixtures", "docked"]
    app.launch()
    XCTAssertTrue(datePicker(app, "docked").waitForExistence(timeout: 20), app.debugDescription)
    // The row's identifier lands on each of its elements: the calendar button is found by its label.
    let button = app.buttons.matching(NSPredicate(format: "label == 'Choose a date'")).firstMatch
    button.swipeUpUntilVisible(in: app)
    let field = app.textFields.matching(identifier: "fixture.date-picker.anchored").firstMatch
    // TXF-22: the button is inside the field, after its input, on its input line.
    XCTAssertTrue(button.isHittable, app.debugDescription)
    XCTAssertGreaterThanOrEqual(button.frame.midX, field.frame.maxX, "\(button.frame) \(field.frame)")
    XCTAssertEqual(button.frame.midY, field.frame.midY, accuracy: 2, "\(button.frame) \(field.frame)")
    button.tap()
    // The open picker: the container named by its label that carries the row's identifier (the docked fixture has the same days).
    let picker = app.descendants(matching: .any).matching(NSPredicate(format: "identifier == 'fixture.date-picker.anchored' AND label == 'Select date'")).firstMatch
    XCTAssertTrue(picker.waitForExistence(timeout: 5), app.debugDescription)
    let control = field.frame.union(button.frame)
    // (XCUITest's frame of the surface includes its shadow.)
    XCTAssertTrue(picker.frame.midY > control.maxY || picker.frame.midY < control.minY, "below the field, or above it where the room below is short: \(picker.frame) \(control)")
    XCTAssertEqual(picker.frame.minX, control.minX - 15, accuracy: 20, "the start edges aligned")
    picker.buttons["Friday, September 25, 2026"].coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
    XCTAssertTrue(waitForFired(app, "date-picker.anchored", 1), fired(app, "date-picker.anchored"))
    XCTAssertTrue(waitForGone(picker), "a completed choice closes it")
    XCTAssertEqual("\(field.value ?? "")", "2026-09-25")
  }

  /// DTP-38 — with larger text the days grow rather than clip their numbers.
  func testDatePickerGrowsWithDynamicType() throws {
    func measure(_ category: String) throws -> CGRect {
      let app = XCUIApplication()
      app.launchArguments = ["-system", "tanrei", "-appearance", "light", "-contrast", "standard", "-component", "date-picker", "-noExplore", "YES",
        "-fixtures", "docked", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategory\(category)"]
      app.launch()
      defer { app.terminate() }
      let day = datePicker(app, "docked").buttons["Thursday, September 17, 2026"]
      XCTAssertTrue(day.waitForExistence(timeout: 20))
      return day.frame
    }
    let regular = try measure("L")
    let large = try measure("AccessibilityXL")
    XCTAssertGreaterThan(large.height, regular.height, "\(regular) → \(large)")
  }

  /// Every date picker fixture is shown, and the screen it is on passes the accessibility audit in light and dark — one fixture a
  /// launch (each is a tall stage). A modal fixture's stage is shorter than the picker, so its calendar scrolls between the
  /// header and the actions (DTP-38): the audit then judges the contrast of days scrolled out of that region against whatever
  /// lies there, and reports some contrast issues with no element at all. So the
  /// modal fixtures are audited without the contrast check; the docked fixtures — the same days, colors and text styles,
  /// unscrolled — with every check. In the text-entry fixtures the audit calls the text fields' own `UITextField` (the one
  /// line of the input inside a `TanreiTextField`, which a press anywhere on the field focuses, TXF-8) too small, with no
  /// element to name: that is the text field's, exempt here.
  func testDatePickerFixturesPassTheAudit() throws {
    let input: (XCUIAccessibilityAuditIssue) -> Bool = { issue in
      issue.auditType == .hitRegion && issue.detailedDescription.contains("UITextField")
    }
    for id in try fixtureIds("date-picker") {
      let types: XCUIAccessibilityAuditType = id.hasPrefix("modal") ? XCUIAccessibilityAuditType.all.subtracting(.contrast) : .all
      // "Potentially inaccessible text" with no element is the runner's, on a screen reached by scrolling (the modal row,
      // 440 tall with its shadow's reach, does not fit under the gallery's switches).
      try auditFixtures(of: "date-picker", types: types, only: [id], exempt: input, runnerOnly: .inaccessibleTextWithoutElement)
    }
  }

  // MARK: dialog (specs/dialog.spec.json)

  /// DLG-1 — a dialog presented from its button covers the gallery: the gallery's own controls are not reachable while it
  /// is open. DLG-5 — a tap on the scrim dismisses it (the binding is written false: the button's value says closed).
  /// DLG-6 — an action does what it does and the product closes it. DLG-14 — the headline is a header in it.
  func testDialogPresentsDismissesAndAnswers() throws {
    let app = XCUIApplication()
    app.launchArguments = ["-system", "tanrei", "-appearance", "light", "-contrast", "standard", "-component", "dialog"]
    app.launch()
    let opener = app.buttons["fixture.dialog.presented"]
    XCTAssertTrue(opener.waitForExistence(timeout: 20), app.debugDescription)
    opener.swipeUpUntilVisible(in: app)
    opener.tap()
    // (A fixture above has the headline "Delete project?"; the presented dialog's is its own.)
    let headline = app.staticTexts["Delete this project?"]
    XCTAssertTrue(headline.waitForExistence(timeout: 5), app.debugDescription)
    // DLG-1: the rest is inert — the gallery's system switch is not reachable while the dialog is open.
    XCTAssertFalse(app.segmentedControls["switch.appearance"].isHittable)
    // DLG-5: a tap on the scrim, far from the container, dismisses it.
    app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.15)).tap()
    let closed = NSPredicate(format: "exists == false")
    XCTAssertEqual(XCTWaiter().wait(for: [expectation(for: closed, evaluatedWith: headline)], timeout: 5), .completed, app.debugDescription)
    XCTAssertEqual("\(opener.value ?? "")", "closed")
    // Open it again and answer it.
    opener.tap()
    XCTAssertTrue(headline.waitForExistence(timeout: 5))
    app.buttons["Delete it"].tap()
    XCTAssertTrue(waitForFired(app, "dialog.presented", 1))
    XCTAssertEqual(XCTWaiter().wait(for: [expectation(for: closed, evaluatedWith: headline)], timeout: 5), .completed, app.debugDescription)
  }

  /// Every dialog fixture is shown, and the screen it is on passes the accessibility audit in light and dark — one fixture a
  /// launch, so that none needs a scroll (each is a tall stage; after a scroll the audit misreports). The audit's
  /// Dynamic Type check is left out for the dialog: it reports every text in the container as not scaling, although the
  /// same text styles pass everywhere else. The contrast of a text taller than the window is not audited: it is the
  /// scrolling fixture's body, whose element reaches far past the scroll view that clips it, so the audit compares its
  /// hidden part with whatever lies there.
  func testDialogFixturesPassTheAudit() throws {
    let window = XCUIApplication().windows.firstMatch
    let scrolledText: (XCUIAccessibilityAuditIssue) -> Bool = { issue in
      guard issue.auditType == .contrast, let element = issue.element, element.elementType == .staticText else { return false }
      return element.frame.height > window.frame.height
    }
    for id in try fixtureIds("dialog") {
      try auditFixtures(of: "dialog", types: XCUIAccessibilityAuditType.all.subtracting(.dynamicType), only: [id], exempt: scrolledText)
    }
  }

  // MARK: app bar (specs/app-bar.spec.json)

  /// APB-11 — the items keep their own semantics: buttons named by their labels, each firing once; the bar itself adds no
  /// button. APB-7, APB-9 — a large bar draws its title under the top row, and only its top row while scrolled. Under
  /// overlay, ripple and dim.
  func testAppBarSemanticsAndActivation() throws {
    for system in ["tanrei", "m3-like", "cupertino"] {
      let app = try launchComponent("app-bar", system: system)
      func bar(_ id: String) -> XCUIElement { app.descendants(matching: .any)["fixture.app-bar.\(id)"] }
      let small = bar("small")
      XCTAssertEqual(small.buttons.count, 3, "\(system): \(small.debugDescription)")
      for label in ["Back", "Search", "More options"] { XCTAssertTrue(small.buttons[label].exists, "\(system): \(label)") }
      small.buttons["Search"].tap()
      XCTAssertTrue(waitForFired(app, "app-bar.small", 1), system)
      small.buttons["Back"].tap()
      XCTAssertTrue(waitForFired(app, "app-bar.small", 2), system)
      XCTAssertTrue(small.staticTexts["Inbox"].firstMatch.exists, system)
      XCTAssertTrue(bar("small-title-only").buttons.count == 0 && bar("small-title-only").staticTexts["Settings"].firstMatch.exists, system)
      // APB-7, APB-9: expanded, the large title is drawn under the top row; scrolled, the bar is its top row alone. (Which
      // copy is exposed cannot be read here: XCUITest lists hidden text too.)
      let row = bar("large").buttons["Menu"].firstMatch.frame
      let tallest = bar("large").staticTexts.matching(NSPredicate(format: "label == %@", "Inbox")).allElementsBoundByIndex.map(\.frame).max { $0.height < $1.height }
      XCTAssertGreaterThan(tallest?.minY ?? .zero, row.maxY - 1, "\(system): \(String(describing: tallest)) under \(row)")
      XCTAssertLessThan(bar("large-scrolled").frame.height, bar("large").frame.height, system)
      app.terminate()
    }
  }

  /// APB-8 — a large bar connected to its scroll view collapses as the content scrolls (its title moves up under the top row)
  /// and expands again at the top. The system bar is hidden and the interactive back swipe still works (platforms.swiftui);
  /// APB-10 — the bar's content stays below the status bar.
  ///
  /// The back swipe can fail on GitHub's runner and pass locally on the same simulator. The screen reports what its
  /// window received of each touch (`-touchProbe YES`, `screen.touch-probe`), so a failure says which it was — a swipe
  /// the app received whole and did not act on (the back swipe is broken), or one that did not reach it intact
  /// (XCUITest's synthesis on a loaded machine; `testAListStillScrollsFromAButtonUnderRipple` sees 0.5 s drags take
  /// 2–16 s there).
  func testAppBarScreenCollapsesAndSwipesBack() throws {
    let app = XCUIApplication()
    app.launchArguments = ["-system", "tanrei", "-appearance", "light", "-contrast", "standard", "-component", "app-bar", "-touchProbe", "YES"]
    app.launch()
    let opener = app.buttons["fixture.app-bar.screen"]
    XCTAssertTrue(opener.waitForExistence(timeout: 20), app.debugDescription)
    opener.swipeUpUntilVisible(in: app)
    opener.tap()
    let mailScreen = app.descendants(matching: .any)["screen.mail"]
    let mail = mailScreen.staticTexts["Mail"].firstMatch
    XCTAssertTrue(mail.waitForExistence(timeout: 5), app.debugDescription)
    // APB-10: below the status bar.
    let window = app.windows.firstMatch.frame
    XCTAssertGreaterThan(mail.frame.minY, window.minY + 20, "\(mail.frame)")
    mailScreen.buttons["Open Inbox"].firstMatch.tap()
    let screen = app.descendants(matching: .any)["screen.inbox"]
    let back = screen.buttons["Back"].firstMatch
    XCTAssertTrue(back.waitForExistence(timeout: 5), app.debugDescription)
    // The drawn titles: XCUITest lists a hidden copy as well, so the expanded
    // title is told by its size — the tallest "Inbox" — and where it is, not by which copy is exposed.
    let inbox = screen.staticTexts.matching(NSPredicate(format: "label == %@", "Inbox"))
    XCTAssertTrue(inbox.firstMatch.waitForExistence(timeout: 5))
    func expanded() -> CGRect { inbox.allElementsBoundByIndex.map(\.frame).max { $0.height < $1.height } ?? .zero }
    XCTAssertGreaterThan(expanded().minY, back.frame.maxY - 1, "expanded: \(expanded()) under \(back.frame)")

    // APB-8: scrolling the content collapses the bar: the expanded title moves up under the top row.
    app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.75))
      .press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.45)), withVelocity: .slow, thenHoldForDuration: 0.3)
    let covered = NSPredicate { _, _ in expanded().maxY <= back.frame.maxY + 1 }
    XCTAssertEqual(XCTWaiter().wait(for: [self.expectation(for: covered, evaluatedWith: nil)], timeout: 5), .completed, "\(expanded()) vs \(back.frame)")
    // Back at the top: expanded again.
    for _ in 0..<3 { screen.swipeDown(velocity: .fast) }
    let under = NSPredicate { _, _ in expanded().minY > back.frame.maxY - 1 }
    XCTAssertEqual(XCTWaiter().wait(for: [self.expectation(for: under, evaluatedWith: nil)], timeout: 5), .completed, "\(expanded()) vs \(back.frame)")

    // The interactive back swipe from the leading edge, with the system bar hidden: once the scroll above has come to rest
    // (the swipe then starts on a still screen, not on a bouncing scroll view), 2 pt from the edge, dragged at a hand's
    // speed across 90 % of the width and held there a moment before the lift, so that the pop completes by how far it
    // went — not by the speed of a synthesized flick.
    let probe = app.staticTexts["screen.touch-probe"]
    XCTAssertTrue(probe.exists, app.debugDescription)
    waitUntilStill(app)
    let before = probe.label
    let start = app.coordinate(withNormalizedOffset: CGVector(dx: 0, dy: 0.5)).withOffset(CGVector(dx: 2, dy: 0))
    start.press(
      forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5)),
      withVelocity: XCUIGestureVelocity(rawValue: 600), thenHoldForDuration: 0.1)
    let gone = NSPredicate(format: "exists == false")
    if XCTWaiter().wait(for: [self.expectation(for: gone, evaluatedWith: back)], timeout: 5) != .completed {
      // Which of the two it was. The app received the swipe whole when its touch ended (not cancelled) after moving most of
      // the way across (the drag is 90 % of the width from 2 pt): then the back swipe is broken. Otherwise the swipe did not
      // reach the app as it was played. Both fail.
      let report = probe.label == before ? "no new touch (still \(before))" : probe.label
      let width = app.windows.firstMatch.frame.width
      if let touch = Self.touchReport(report), report != before, touch.end == "ended", (touch.values["moves"] ?? 0) > 0,
        Double(touch.values["dx"] ?? 0) >= Double(width) * 0.6
      {
        XCTFail("the app received the whole edge swipe (\(report)) and did not go back: the back swipe is broken")
      } else {
        XCTFail("the edge swipe did not go back, and it did not reach the app intact (\(report)): XCUITest's synthesis on this machine, not the back swipe")
      }
      return
    }
    XCTAssertTrue(mail.waitForExistence(timeout: 5))
    // The swipe is not the Back button: it did not fire.
    mailScreen.buttons["Close"].firstMatch.tap()
    XCTAssertTrue(opener.waitForExistence(timeout: 5))
    XCTAssertEqual(fired(app, "app-bar.screen"), "fired 0")
  }

  /// Every app bar fixture is shown, and the screens they are on pass the accessibility audit in light and dark — three
  /// fixtures a launch, so that none needs a scroll (after a scroll the audit misreports). Exempt: "not human-readable"
  /// on the fixture's subtitle `ada@example.com`, an e-mail address the audit's heuristic takes for a code; it is the
  /// spec's content, read as it is written.
  func testAppBarFixturesPassTheAudit() throws {
    let ids = try fixtureIds("app-bar")
    let address: (XCUIAccessibilityAuditIssue) -> Bool = { issue in
      issue.element?.label == "ada@example.com" && issue.compactDescription.localizedCaseInsensitiveContains("human-readable")
    }
    for start in stride(from: 0, to: ids.count, by: 3) {
      try auditFixtures(of: "app-bar", only: Array(ids[start..<min(start + 3, ids.count)]), exempt: address)
    }
  }

  // MARK: navigation bar (specs/navigation-bar.spec.json)

  /// NVB-19 — the bar is named by its label; each destination is a button named by its label (drawn or not), selected while it is
  /// the selected one, its badge's description its value (NVB-16). NVB-1 — a tap on another destination selects it and fires
  /// once (change); a tap on the selected one fires once (reselect) and keeps it selected. NVB-2 — a disabled destination is
  /// exposed as such and never fires. Under overlay, ripple and dim.
  func testNavigationBarSemanticsAndActivation() throws {
    for system in ["tanrei", "m3-like", "cupertino"] {
      let app = try launchComponent("navigation-bar", system: system)
      // `firstMatch`: under the tab bar trait, XCUITest also lists a destination's drawn text as a button inside it;
      // the first match is the destination itself.
      func bar(_ id: String) -> XCUIElement { app.descendants(matching: .any)["fixture.navigation-bar.\(id)"] }
      let four = bar("four-destinations")
      // Named by the bar's label. (Its tab bar trait is not visible to XCUITest, which lists a SwiftUI container as Other.)
      XCTAssertEqual(four.label, "Main", "\(system): \(four.debugDescription)")
      let inbox = four.buttons["Inbox"].firstMatch
      let sent = four.buttons["Sent"].firstMatch
      XCTAssertTrue(inbox.exists, "\(system): \(four.debugDescription)")
      XCTAssertTrue(inbox.isSelected && !sent.isSelected, "\(system): \(state(inbox)) / \(state(sent))")
      sent.tap()
      XCTAssertTrue(waitForFired(app, "navigation-bar.four-destinations", 1), system)
      XCTAssertTrue(sent.isSelected && !inbox.isSelected, "\(system): \(state(inbox)) / \(state(sent))")
      // Reselect: fires once more, the selection stays.
      sent.tap()
      XCTAssertTrue(waitForFired(app, "navigation-bar.four-destinations", 2), system)
      XCTAssertTrue(sent.isSelected, system)

      let starred = bar("disabled").buttons["Starred"].firstMatch
      XCTAssertFalse(starred.isEnabled, system)
      starred.tap()
      Thread.sleep(forTimeInterval: 0.5)
      XCTAssertEqual(fired(app, "navigation-bar.disabled"), "fired 0", system)

      // NVB-13: a label that is not drawn is still the name; NVB-16: the badge's words are the destination's value.
      XCTAssertTrue(bar("labels-never").buttons["Settings"].firstMatch.exists, "\(system): \(bar("labels-never").debugDescription)")
      let badged = bar("badges").buttons["Inbox"].firstMatch
      let dotted = bar("badges").buttons["Chat"].firstMatch
      XCTAssertTrue((badged.value as? String)?.contains("3 unread") == true, "\(system): \(state(badged))")
      XCTAssertTrue((dotted.value as? String)?.contains("New") == true, "\(system): \(state(dotted))")
      app.terminate()
    }
  }

  /// NVB-21 — with larger text the bar grows to hold its labels on one line; its item containers and icons do not scale.
  func testNavigationBarGrowsWithDynamicType() throws {
    func measure(_ category: String) throws -> CGFloat {
      let app = XCUIApplication()
      app.launchArguments = ["-system", "tanrei", "-appearance", "light", "-contrast", "standard", "-component", "navigation-bar", "-noExplore", "YES",
        "-fixtures", "four-destinations", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategory\(category)"]
      app.launch()
      defer { app.terminate() }
      let bar = app.descendants(matching: .any)["fixture.navigation-bar.four-destinations"]
      XCTAssertTrue(bar.waitForExistence(timeout: 20))
      XCTAssertTrue(bar.buttons["Inbox"].firstMatch.exists, bar.debugDescription)
      return bar.frame.height
    }
    let regular = try measure("L")
    let large = try measure("AccessibilityXL")
    XCTAssertGreaterThan(large, regular)
  }

  /// Every navigation bar fixture is shown, and the screens they are on pass the accessibility audit in light and dark —
  /// four fixtures a launch, so that none needs a scroll (after a scroll the audit misreports).
  ///
  /// Two exemptions, on destinations (buttons) only:
  /// - "Text clipped": a destination's label is one line, truncated at its end by design (NVB-12); at larger text the bar
  ///   grows in height and a long press shows the large-content viewer (NVB-21), as UITabBar does.
  /// - "Contrast failed" on the selected destination: the audit measures the default system's active indicator
  ///   (secondary-container on surface, about 1.15:1) — with the indicator's fill set to none the finding goes away. The
  ///   value is the design system's.
  func testNavigationBarFixturesPassTheAudit() throws {
    let ids = try fixtureIds("navigation-bar")
    let byDesign: (XCUIAccessibilityAuditIssue) -> Bool = { issue in
      guard let element = issue.element, element.elementType == .button else { return false }
      if issue.auditType == .textClipped { return true }
      // The issue's element does not carry the selected trait; the destination in the live tree at its place does.
      guard issue.auditType == .contrast else { return false }
      let frame = element.frame
      return XCUIApplication().buttons.matching(NSPredicate(format: "label == %@", element.label)).allElementsBoundByIndex
        .contains { $0.frame == frame && $0.isSelected }
    }
    for start in stride(from: 0, to: ids.count, by: 4) {
      try auditFixtures(of: "navigation-bar", only: Array(ids[start..<min(start + 4, ids.count)]), exempt: byDesign)
    }
  }

  // MARK: navigation drawer (specs/navigation-drawer.spec.json)

  /// NVD-23 — the drawer is a container named by its label; each destination is a button named by its label, the selected
  /// one with the selected trait, its value its position among all the destinations and then its badge text (NVD-15); a
  /// section's heading is there as text, not as a button. NVD-1 — a tap on another destination selects it and fires once
  /// (change); a tap on the selected one fires once (reselect) and keeps it selected. NVD-2 — a disabled destination is
  /// exposed as such and never fires. Under overlay, ripple and dim.
  func testNavigationDrawerSemanticsAndActivation() throws {
    for system in ["tanrei", "m3-like", "cupertino"] {
      let app = try launchComponent("navigation-drawer", system: system)
      func drawer(_ id: String) -> XCUIElement { app.descendants(matching: .any)["fixture.navigation-drawer.\(id)"] }
      let standard = drawer("standard")
      XCTAssertEqual(standard.label, "Mail", "\(system): \(standard.debugDescription)")
      let inbox = standard.buttons["Inbox"].firstMatch
      let sent = standard.buttons["Sent"].firstMatch
      XCTAssertTrue(inbox.exists && sent.exists, "\(system): \(standard.debugDescription)")
      XCTAssertTrue(inbox.isSelected && !sent.isSelected, "\(system): \(state(inbox)) / \(state(sent))")
      XCTAssertEqual(inbox.value as? String, "1 of 6, 24", "\(system): \(state(inbox))")
      XCTAssertEqual(standard.buttons["Work"].firstMatch.value as? String, "6 of 6, New", system)
      XCTAssertTrue(standard.staticTexts["Labels"].exists, "\(system): \(standard.debugDescription)")
      XCTAssertFalse(standard.buttons["Labels"].exists, system)
      sent.tap()
      XCTAssertTrue(waitForFired(app, "navigation-drawer.standard", 1), system)
      XCTAssertTrue(sent.isSelected && !inbox.isSelected, "\(system): \(state(inbox)) / \(state(sent))")
      // Reselect: fires once more, the selection stays.
      sent.tap()
      XCTAssertTrue(waitForFired(app, "navigation-drawer.standard", 2), system)
      XCTAssertTrue(sent.isSelected, system)

      let disabled = drawer("standard-disabled")
      disabled.swipeUpUntilVisible(in: app)
      let drafts = disabled.buttons["Drafts"].firstMatch
      XCTAssertFalse(drafts.isEnabled, system)
      drafts.tap()
      Thread.sleep(forTimeInterval: 0.5)
      XCTAssertEqual(fired(app, "navigation-drawer.standard-disabled"), "fired 0", system)
      app.terminate()
    }
  }

  /// NVD-19 — a modal drawer presented from its button covers the gallery: the gallery's own controls are not reachable
  /// while it is open. NVD-20 — a tap on the scrim closes it, and so does a swipe toward its leading edge (the binding is
  /// written false: the button's value says closed). NVD-21 — choosing a destination fires once (change) and closes it.
  /// NVD-23 — the modal drawer is named by its label.
  func testNavigationDrawerModalCloses() throws {
    let app = XCUIApplication()
    app.launchArguments = ["-system", "tanrei", "-appearance", "light", "-contrast", "standard", "-component", "navigation-drawer"]
    app.launch()
    let opener = app.buttons["fixture.navigation-drawer.presented"]
    XCTAssertTrue(opener.waitForExistence(timeout: 20), app.debugDescription)
    opener.swipeUpUntilVisible(in: app)
    let closed = NSPredicate(format: "exists == false")
    func open() -> XCUIElement {
      opener.tap()
      // The presented drawer's Trash (the fixtures above have one too): the last of its three destinations.
      let trash = app.buttons.matching(NSPredicate(format: "label == 'Trash' AND value == '3 of 3'")).firstMatch
      XCTAssertTrue(trash.waitForExistence(timeout: 5), app.debugDescription)
      return trash
    }
    // The scrim: a tap far from the panel, at the window's end.
    var trash = open()
    XCTAssertTrue(app.descendants(matching: .any)["Folders"].exists, app.debugDescription)
    XCTAssertFalse(app.segmentedControls["switch.appearance"].isHittable)
    app.coordinate(withNormalizedOffset: CGVector(dx: 0.92, dy: 0.5)).tap()
    XCTAssertEqual(XCTWaiter().wait(for: [expectation(for: closed, evaluatedWith: trash)], timeout: 5), .completed, app.debugDescription)
    XCTAssertEqual("\(opener.value ?? "")", "closed")
    // A swipe toward the leading edge.
    trash = open()
    app.coordinate(withNormalizedOffset: CGVector(dx: 0.55, dy: 0.7)).press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.02, dy: 0.7)))
    XCTAssertEqual(XCTWaiter().wait(for: [expectation(for: closed, evaluatedWith: trash)], timeout: 5), .completed, app.debugDescription)
    XCTAssertEqual("\(opener.value ?? "")", "closed")
    XCTAssertEqual(fired(app, "navigation-drawer.presented"), "fired 0")
    // A destination: it fires and closes the drawer.
    trash = open()
    trash.tap()
    XCTAssertTrue(waitForFired(app, "navigation-drawer.presented", 1))
    XCTAssertEqual(XCTWaiter().wait(for: [expectation(for: closed, evaluatedWith: trash)], timeout: 5), .completed, app.debugDescription)
    XCTAssertEqual("\(opener.value ?? "")", "closed")
  }

  /// NVD-27 — with larger text the drawer keeps its width and each destination grows taller with its label; its icons do
  /// not scale.
  func testNavigationDrawerGrowsWithDynamicType() throws {
    func measure(_ category: String) throws -> (drawer: CGFloat, destination: CGFloat) {
      let app = XCUIApplication()
      app.launchArguments = ["-system", "tanrei", "-appearance", "light", "-contrast", "standard", "-component", "navigation-drawer", "-noExplore", "YES",
        "-fixtures", "standard-no-icons", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategory\(category)"]
      app.launch()
      defer { app.terminate() }
      let drawer = app.descendants(matching: .any)["fixture.navigation-drawer.standard-no-icons"]
      XCTAssertTrue(drawer.waitForExistence(timeout: 20))
      let deployments = drawer.buttons["Deployments"].firstMatch
      XCTAssertTrue(deployments.exists, drawer.debugDescription)
      return (drawer.frame.width, deployments.frame.height)
    }
    let regular = try measure("L")
    let large = try measure("AccessibilityXL")
    XCTAssertEqual(large.drawer, regular.drawer)
    XCTAssertGreaterThan(large.destination, regular.destination)
  }

  /// Every navigation drawer fixture is shown, and the screens they are on pass the accessibility audit in light and dark —
  /// one fixture a launch, so that none needs a scroll (after a scroll the audit misreports).
  func testNavigationDrawerFixturesPassTheAudit() throws {
    for id in try fixtureIds("navigation-drawer") {
      try auditFixtures(of: "navigation-drawer", only: [id])
    }
  }

  // MARK: navigation rail (specs/navigation-rail.spec.json)

  /// NVR-20 — the rail is named by its label; the header's content comes first with its own semantics (the menu button);
  /// each destination is a button named by its label (drawn or not), selected while it is the selected one, its badge's
  /// description its value (NVR-17). NVR-1 — a tap on another destination selects it and fires once (change); a tap on the
  /// selected one fires once (reselect) and keeps it selected. NVR-2 — a disabled destination is exposed as such and never
  /// fires. Under overlay, ripple and dim.
  func testNavigationRailSemanticsAndActivation() throws {
    for system in ["tanrei", "m3-like", "cupertino"] {
      let app = try launchComponent("navigation-rail", system: system)
      // `firstMatch`: under the tab bar trait, XCUITest also lists a destination's drawn text as a button inside it;
      // the first match is the destination itself.
      func rail(_ id: String) -> XCUIElement { app.descendants(matching: .any)["fixture.navigation-rail.\(id)"] }
      let four = rail("four-destinations")
      XCTAssertEqual(four.label, "Main", "\(system): \(four.debugDescription)")
      // The header first: the menu button is the rail's first button, above the destinations; it fires its own click.
      let menu = four.buttons["Menu"].firstMatch
      let inbox = four.buttons["Inbox"].firstMatch
      let sent = four.buttons["Sent"].firstMatch
      XCTAssertTrue(menu.exists && inbox.exists, "\(system): \(four.debugDescription)")
      XCTAssertEqual(four.buttons.firstMatch.label, "Menu", "\(system): \(four.debugDescription)")
      XCTAssertLessThan(menu.frame.maxY, inbox.frame.minY, system)
      XCTAssertFalse(menu.isSelected, system)
      menu.tap()
      XCTAssertTrue(waitForFired(app, "navigation-rail.four-destinations", 1), system)
      XCTAssertTrue(inbox.isSelected && !sent.isSelected, "\(system): \(state(inbox)) / \(state(sent))")
      sent.tap()
      XCTAssertTrue(waitForFired(app, "navigation-rail.four-destinations", 2), system)
      XCTAssertTrue(sent.isSelected && !inbox.isSelected, "\(system): \(state(inbox)) / \(state(sent))")
      // Reselect: fires once more, the selection stays.
      sent.tap()
      XCTAssertTrue(waitForFired(app, "navigation-rail.four-destinations", 3), system)
      XCTAssertTrue(sent.isSelected, system)

      // NVR-14: a label that is not drawn is still the name; NVR-17: the badge's words are the destination's value.
      XCTAssertTrue(rail("labels-never").buttons["Settings"].firstMatch.exists, "\(system): \(rail("labels-never").debugDescription)")
      let badged = rail("badges").buttons["Inbox"].firstMatch
      let dotted = rail("badges").buttons["Chat"].firstMatch
      XCTAssertTrue((badged.value as? String)?.contains("3 unread") == true, "\(system): \(state(badged))")
      XCTAssertTrue((dotted.value as? String)?.contains("New") == true, "\(system): \(state(dotted))")

      let disabled = rail("disabled")
      disabled.swipeUpUntilVisible(in: app)
      let starred = disabled.buttons["Starred"].firstMatch
      XCTAssertFalse(starred.isEnabled, system)
      starred.tap()
      Thread.sleep(forTimeInterval: 0.5)
      XCTAssertEqual(fired(app, "navigation-rail.disabled"), "fired 0", system)
      app.terminate()
    }
  }

  /// NVR-22 — with larger text the rail keeps its width and each destination grows taller with its label; its item containers
  /// and icons do not scale.
  func testNavigationRailGrowsWithDynamicType() throws {
    func measure(_ category: String) throws -> (rail: CGFloat, destination: CGFloat) {
      let app = XCUIApplication()
      app.launchArguments = ["-system", "tanrei", "-appearance", "light", "-contrast", "standard", "-component", "navigation-rail", "-noExplore", "YES",
        "-fixtures", "no-header", "-UIPreferredContentSizeCategoryName", "UICTContentSizeCategory\(category)"]
      app.launch()
      defer { app.terminate() }
      let rail = app.descendants(matching: .any)["fixture.navigation-rail.no-header"]
      XCTAssertTrue(rail.waitForExistence(timeout: 20))
      let inbox = rail.buttons["Inbox"].firstMatch
      XCTAssertTrue(inbox.exists, rail.debugDescription)
      return (rail.frame.width, inbox.frame.height)
    }
    let regular = try measure("L")
    let large = try measure("AccessibilityXL")
    XCTAssertEqual(large.rail, regular.rail)
    XCTAssertGreaterThan(large.destination, regular.destination)
  }

  /// Every navigation rail fixture is shown, and the screens they are on pass the accessibility audit in light and dark — one
  /// fixture a launch, so that none needs a scroll (after a scroll the audit misreports).
  ///
  /// Two exemptions, on destinations (buttons) only:
  /// - "Contrast failed" on the selected destination, where the audit measures the default system's active indicator
  ///   (secondary-container on surface, about 1.15:1), as for the navigation bar — the value is the design system's.
  /// - "Text clipped": a destination's label takes at most two lines in the rail's fixed width and is truncated after them
  ///   by design (NVR-13, NVR-22: "Shared with me" is flagged); at larger text the destination grows taller and a long press
  ///   shows the large-content viewer. The badge's count, which XCUITest lists as a button inside its destination
  ///   is flagged too.
  func testNavigationRailFixturesPassTheAudit() throws {
    let byDesign: (XCUIAccessibilityAuditIssue) -> Bool = { issue in
      guard let element = issue.element, element.elementType == .button else { return false }
      if issue.auditType == .textClipped { return true }
      // The issue's element does not carry the selected trait; the destination in the live tree at its place does.
      guard issue.auditType == .contrast else { return false }
      let frame = element.frame
      return XCUIApplication().buttons.matching(NSPredicate(format: "label == %@", element.label)).allElementsBoundByIndex
        .contains { $0.frame == frame && $0.isSelected }
    }
    for id in try fixtureIds("navigation-rail") {
      try auditFixtures(of: "navigation-rail", only: [id], exempt: byDesign)
    }
  }
}

private extension XCUIElement {
  /// Scrolls the app up until this element is on screen (at most a few swipes).
  func swipeUpUntilVisible(in app: XCUIApplication) {
    var swipes = 0
    while (!exists || !isHittable) && swipes < 8 {
      app.swipeUp()
      swipes += 1
    }
  }
}
