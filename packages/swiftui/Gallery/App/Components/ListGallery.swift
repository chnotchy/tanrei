import SwiftUI
import Tanrei

// specs/list.spec.json in the gallery: each fixture is one list 360 wide (or the row's width) holding the fixture's
// items: the list's props (`selection`, `label`, `value`, `values`) and each item's (`headline`, `overline`,
// `supportingText`, `supportingMaxLines`, `trailingText`, `leadingIcon`, `trailingIcon`, `leadingMedia`, `interactive`,
// `value`, `disabled`, `divider`). A selectable list owns its selection, as an app does, and `fire` counts its changes
// (LST-13, LST-14); an interactive item's click fires too (LST-1). An avatar holds the headline's first letter.

extension GalleryComponent {
  static let list = GalleryComponent(
    fixture: { fixture, fire in
      AnyView(GalleryList(fixture: fixture, fire: fire))
    },
    managesFocus: true
  )
}

private struct GalleryList: View {
  let fixture: GalleryFixture
  let fire: @MainActor () -> Void
  @State private var single: String?
  @State private var multiple: Set<String>
  @Environment(\.tanreiSystem) private var system

  init(fixture: GalleryFixture, fire: @escaping @MainActor () -> Void) {
    self.fixture = fixture
    self.fire = fire
    _single = State(initialValue: fixture.string("value"))
    _multiple = State(initialValue: Set(fixture.strings("values") ?? []))
  }

  var body: some View {
    let label = LocalizedStringKey(fixture.string("label") ?? "")
    Group {
      switch fixture.string("selection") ?? "none" {
      case "single":
        TanreiList(selection: Binding(get: { single }, set: { single = $0; fire() }), label: label) { rows(selected: Set([single].compactMap { $0 })) }
      case "multiple":
        TanreiList(selection: Binding(get: { multiple }, set: { multiple = $0; fire() }), label: label) { rows(selected: multiple) }
      default:
        TanreiList(label: label) { rows(selected: []) }
      }
    }
    .frame(width: GalleryListWidth.value)
  }

  private func rows(selected: Set<String>) -> some View {
    ForEach(Array(fixture.items.enumerated()), id: \.offset) { _, item in
      row(item, selected: item.string("value").map { selected.contains($0) } ?? false)
    }
  }

  private func row(_ item: GalleryItem, selected: Bool) -> AnyView {
    let headline = item.string("headline") ?? ""
    let overline = item.string("overline") ?? ""
    let supporting = item.string("supportingText") ?? ""
    let limit = item.number("supportingMaxLines").map { Int($0) }
    let trailingText = item.string("trailingText") ?? ""
    let leadingIcon = GalleryIcon.itemIcon(item.string("leadingIcon"), selected: selected, system: system)
    let trailingIcon = GalleryIcon.itemIcon(item.string("trailingIcon"), selected: false, system: system)
    let media = TanreiListLeadingMedia(named: item.string("leadingMedia") ?? "none")
    let divider = item.bool("divider") ?? false
    let value = item.string("value")
    let monogram = String(headline.prefix(1))
    let view: AnyView
    switch (item.bool("interactive") ?? false, media) {
    case (true, .none):
      view = AnyView(
        TanreiListItem(
          headline, overline: overline, supportingText: supporting, supportingLineLimit: limit, trailingText: trailingText, leadingIcon: leadingIcon,
          trailingIcon: trailingIcon, divider: divider, action: fire
        ).tag(value))
    case (true, _):
      view = AnyView(
        TanreiListItem(
          headline, overline: overline, supportingText: supporting, supportingLineLimit: limit, trailingText: trailingText, trailingIcon: trailingIcon,
          leadingMedia: media, divider: divider, action: fire
        ) { if media == .avatar { Text(monogram) } }.tag(value))
    case (false, .none):
      view = AnyView(
        TanreiListItem(
          headline, overline: overline, supportingText: supporting, supportingLineLimit: limit, trailingText: trailingText, leadingIcon: leadingIcon,
          trailingIcon: trailingIcon, divider: divider
        ).tag(value))
    case (false, _):
      view = AnyView(
        TanreiListItem(
          headline, overline: overline, supportingText: supporting, supportingLineLimit: limit, trailingText: trailingText, trailingIcon: trailingIcon,
          leadingMedia: media, divider: divider
        ) { if media == .avatar { Text(monogram) } }.tag(value))
    }
    return AnyView(view.disabled(item.bool("disabled") ?? false))
  }
}

/// A list's width in the gallery: a phone column, leaving room for the row's caption.
private enum GalleryListWidth {
  static let value: CGFloat = 260
}
