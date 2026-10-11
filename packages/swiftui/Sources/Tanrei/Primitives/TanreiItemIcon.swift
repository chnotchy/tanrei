import SwiftUI

// What the rows of a list and a menu share (LST-19, MNU-21): an icon given by name or as an image, drawn in its column
// through the icon helper. No design value lives here: the box size and the selection state are handed in.

/// The icon of a list or menu item: a glyph of the design system's icon font by name (`"inbox"`, a string literal
/// works), or an image of the product's own — an SF Symbol, an asset.
///
///     TanreiListItem("Inbox", leadingIcon: "inbox")                                  // a glyph of the icon font
///     TanreiListItem("Inbox", leadingIcon: .image(Image(systemName: "tray")))       // an SF Symbol
///
/// A glyph is drawn with the family and fill of the item's condition (`TanreiIconGlyph`); Tanrei does not bundle the icon
/// font, and without it a glyph draws nothing in its box. An image is sized by the icon font's size at the box, as an SF
/// Symbol in any Tanrei icon slot is; it does not follow the selection state. An
/// empty name draws nothing and takes no room.
public struct TanreiItemIcon {
  enum Source {
    case glyph(String)
    case image(Image)
    /// Any view: for tests, which read what the icon's box hands its content.
    case view(AnyView)
  }

  let source: Source

  /// A glyph of the icon font, by its name (a ligature such as `"inbox"`).
  public init(_ name: String) {
    source = .glyph(name)
  }

  /// An image of the product's own, drawn at the icon size.
  public static func image(_ image: Image) -> TanreiItemIcon {
    TanreiItemIcon(source: .image(image))
  }

  /// Any view in the icon's box (tests only).
  static func view(_ view: some View) -> TanreiItemIcon {
    TanreiItemIcon(source: .view(AnyView(view)))
  }

  private init(source: Source) {
    self.source = source
  }

  /// LST-19, MNU-21: an empty name draws nothing and leaves no space.
  var isEmpty: Bool {
    if case .glyph(let name) = source { return name.isEmpty }
    return false
  }
}

extension TanreiItemIcon: ExpressibleByStringLiteral {
  public init(stringLiteral name: String) {
    self.init(name)
  }
}

extension Optional where Wrapped == TanreiItemIcon {
  /// The icon to draw: `nil` when there is none or its name is empty.
  var drawn: TanreiItemIcon? {
    guard let icon = self, !icon.isEmpty else { return nil }
    return icon
  }
}

/// One item icon in a box of `size`, with the family and fill of `selected` (the icon helper), in the
/// inherited foreground style. Decorative: the item's label is its name.
struct TanreiItemIconView: View {
  let icon: TanreiItemIcon
  let size: CGFloat
  let selected: Bool

  var body: some View {
    Group {
      switch icon.source {
      case .glyph(let name): TanreiIconGlyph(name)
      case .image(let image): image
      case .view(let view): view
      }
    }
    .tanreiIconContext(size: size, selected: selected)
    .frame(width: size, height: size)
    .accessibilityElement(children: .ignore)
    .accessibilityHidden(true)
  }
}
