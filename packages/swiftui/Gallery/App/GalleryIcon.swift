import SwiftUI
import Tanrei

/// The glyph of the system's icon font when this device has it (Tanrei bundles no font, and the simulator has none):
/// otherwise the SF Symbol a product would use for it, filled when selected. Shared by every component whose fixtures
/// name a glyph as their content.
struct GalleryIcon: View {
  let glyph: String
  var selected = false
  @Environment(\.tanreiSystem) private var system

  /// The spec fixtures' glyph names, as SF Symbols (and whether the symbol has a `.fill` form).
  private static let symbols: [String: (name: String, fills: Bool)] = [
    "favorite": ("heart", true),
    "add": ("plus", false),
    "edit": ("pencil", false),
    "event": ("calendar", false),
    "check": ("checkmark", false),
    "close": ("xmark", false),
    "inbox": ("tray", true),
    "star": ("star", true),
    "send": ("paperplane", true),
    "wifi": ("wifi", false),
    "bluetooth": ("antenna.radiowaves.left.and.right", false),
    "chevron_right": ("chevron.right", false),
    "archive": ("archivebox", true),
    "delete": ("trash", true),
    "draft": ("doc", true),
    "label": ("tag", true),
    "content_cut": ("scissors", false),
    "content_copy": ("doc.on.doc", true),
    "content_paste": ("doc.on.clipboard", true),
    "link": ("link", false),
    // The toolbar's fixtures.
    "mark_email_unread": ("envelope.badge", true),
    "drive_file_move": ("folder", true),
    "attach_file": ("paperclip", false),
    "image": ("photo", true),
    "ink_highlighter": ("highlighter", false),
    "ink_eraser": ("eraser", true),
    "remove": ("minus", false),
    "my_location": ("scope", false),
    "open_in_new": ("arrow.up.right.square", true),
    "dashboard": ("square.grid.2x2", true),
    "history": ("clock", true),
    "settings": ("gearshape", true),
    "info": ("info.circle", true),
    "arrow_back": ("arrow.left", false),
    "save": ("square.and.arrow.down", true),
    "search": ("magnifyingglass", false),
    "more_vert": ("ellipsis", false),
    "share": ("square.and.arrow.up", true),
    "menu": ("line.3.horizontal", false),
    "mic": ("mic", true),
    "account_circle": ("person.crop.circle", true),
    "home": ("house", true),
    "person": ("person", true),
    "explore": ("safari", true),
    "add_circle": ("plus.circle", true),
    "video_library": ("play.rectangle.on.rectangle", true),
    "chat": ("bubble.left", true),
    "view_list": ("list.bullet", false),
    "grid_view": ("square.grid.2x2", true),
    "map": ("map", true),
    "format_align_left": ("text.alignleft", false),
    "format_align_center": ("text.aligncenter", false),
    "format_align_right": ("text.alignright", false),
    "format_bold": ("bold", false),
    "format_italic": ("italic", false),
    "format_underlined": ("underline", false),
    "folder": ("folder", true),
    "description": ("doc.text", true),
    "create_new_folder": ("folder.badge.plus", true),
    "upload": ("square.and.arrow.up", false),
    "group": ("person.2", true),
    "schedule": ("clock", true),
    // The carousel's fixtures.
    "landscape": ("mountain.2", true),
    "forest": ("tree", true),
    "water": ("water.waves", false),
    "park": ("leaf", true),
    "sunny": ("sun.max", true),
    "filter_hdr": ("flag", true),
  ]

  /// The icon of a list or menu item for a glyph name: the glyph when this device has the icon font, else the SF Symbol.
  @MainActor
  static func itemIcon(_ glyph: String?, selected: Bool, system: TanreiSystem) -> TanreiItemIcon? {
    guard let glyph, !glyph.isEmpty else { return nil }
    if system.icon.installedFamily(selected: selected) != nil { return TanreiItemIcon(glyph) }
    let symbol = symbols[glyph] ?? ("questionmark", false)
    return .image(Image(systemName: selected && symbol.fills ? "\(symbol.name).fill" : symbol.name))
  }

  var body: some View {
    if system.icon.installedFamily(selected: selected) != nil {
      TanreiIconGlyph(glyph)
    } else {
      let symbol = Self.symbols[glyph] ?? ("questionmark", false)
      Image(systemName: selected && symbol.fills ? "\(symbol.name).fill" : symbol.name)
    }
  }
}
