import SwiftUI
@_spi(Fixtures) import Tanrei

// specs/search.spec.json in the gallery: each fixture is one search 328 wide (SRC-1's verify), drawn from its props (`label`,
// `placeholder`, `value`, `clearLabel`, `backLabel`, `presentation`, `expanded`, `disabled`), its suggestions (the fixture's
// items) and its slots (`icon-button` — a standard Tanrei icon button showing the glyph, labelled by
// its name). Each owns its value and its expanded state, as an app does; the open fixtures (`docked`, `full-screen`) draw their
// view in place (`.inPlace()`, SRC-7's and SRC-9's verify), so that the gallery shows them without presenting anything. `fire`
// counts submits and choices. Below them, a docked search and a full-screen search as a product writes them: the UI tests type
// into them, choose a suggestion, clear, and go back.

extension GalleryComponent {
  static let search = GalleryComponent(
    fixture: { fixture, fire in
      AnyView(GallerySearchFixture(fixture: fixture, fire: fire))
    },
    explore: { _ in
      [
        GalleryExploration(
          title: "A search with suggestions",
          // The docked one last: its view opens over what follows it in its own container
          // only, and nothing follows the last row.
          examples: [
            GalleryExample(id: "live-full-screen", caption: "tap to open · full-screen") { fire in
              AnyView(GalleryLiveSearch(presentation: .fullScreen, fire: fire))
            },
            GalleryExample(id: "live-docked", caption: "type to open · choose fires") { fire in AnyView(GalleryLiveSearch(presentation: .docked, fire: fire)) },
          ])
      ]
    },
    // The search keeps focus in its own input: the row does not bind the gallery's `-focus`.
    managesFocus: true
  )
}

private enum GallerySearchStage {
  static let width: CGFloat = 328
  /// The full-screen fixture stands for a window: a stage of its own, as the dialog's.
  static let fullScreenHeight: CGFloat = 360
  /// Below the live docked search: room for its open view (three rows).
  static let dockedRoom: CGFloat = 200
}

/// One fixture, owning its value and its expanded state.
private struct GallerySearchFixture: View {
  let fixture: GalleryFixture
  let fire: @MainActor () -> Void
  @State private var text: String
  @State private var isExpanded: Bool
  @Environment(\.tanreiSystem) private var system

  init(fixture: GalleryFixture, fire: @escaping @MainActor () -> Void) {
    self.fixture = fixture
    self.fire = fire
    _text = State(initialValue: fixture.string("value") ?? "")
    _isExpanded = State(initialValue: fixture.bool("expanded") ?? false)
  }

  var body: some View {
    let presentation = TanreiSearchPresentation(named: fixture.string("presentation") ?? "docked")
    let leading = fixture.slot("leading")
    let trailing = fixture.slot("trailing")
    let base = TanreiSearch(
      fixture.string("label") ?? "", text: $text, isExpanded: $isExpanded, presentation: presentation,
      prompt: fixture.string("placeholder").map { Text(verbatim: $0) }, clearLabel: fixture.string("clearLabel") ?? "",
      backLabel: fixture.string("backLabel") ?? "", onSubmit: { _ in fire() }, onSelect: { _ in fire() }
    ) {
      ForEach(Array(fixture.items.enumerated()), id: \.offset) { _, item in
        TanreiSearchSuggestion(
          item.string("headline") ?? "", supportingText: item.string("supportingText") ?? "",
          leadingIcon: GalleryIcon.itemIcon(item.string("leadingIcon"), selected: false, system: system), value: item.string("value") ?? "")
      }
    } leading: {
      if let glyph = leading.first { TanreiIconButton(glyph, action: {}) { GalleryIcon(glyph: glyph) } }
    } trailing: {
      if !trailing.isEmpty { ForEach(trailing, id: \.self) { glyph in TanreiIconButton(glyph, action: {}) { GalleryIcon(glyph: glyph) } } }
    }
    // Open fixtures, in place: the view under the bar, or the full-screen view in a stage of its own.
    let isOpen = fixture.bool("expanded") == true
    let search = (isOpen ? base.inPlace() : base).disabled(fixture.bool("disabled") ?? false)
    if isOpen && presentation == .fullScreen {
      search.frame(width: GallerySearchStage.width, height: GallerySearchStage.fullScreenHeight)
    } else {
      search.frame(width: GallerySearchStage.width)
    }
  }
}

/// A search as a product writes one: its suggestions follow the value, a choice fires and fills in the query, and the view
/// opens and closes by itself.
private struct GalleryLiveSearch: View {
  let presentation: TanreiSearchPresentation
  let fire: @MainActor () -> Void
  @State private var text = ""
  @State private var isExpanded = false
  @Environment(\.tanreiSystem) private var system

  private static let history = ["invoices", "invoice template", "holiday photos"]

  var body: some View {
    let matches = Self.history.filter { text.isEmpty || $0.localizedCaseInsensitiveContains(text) }
    TanreiSearch(
      "Search mail", text: $text, isExpanded: $isExpanded, presentation: presentation, prompt: Text("Search mail"), clearLabel: "Clear search",
      backLabel: "Back", onSubmit: { _ in fire() },
      onSelect: { value in
        text = value
        fire()
      }
    ) {
      ForEach(matches, id: \.self) { match in
        TanreiSearchSuggestion(match, leadingIcon: GalleryIcon.itemIcon("history", selected: false, system: system), value: match)
      }
    } content: {
      if matches.isEmpty { Text("No messages match.") }
    }
    .frame(width: GallerySearchStage.width)
    // The docked view is drawn in the bar's overlay: below the last row it would lie past the end of the gallery's scroll
    // content, where UIKit delivers no touch. Room for it, in the row.
    .padding(.bottom, presentation == .docked ? GallerySearchStage.dockedRoom : .zero)
  }
}
