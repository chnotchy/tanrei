import Foundation

// Every `specs/*.spec.json`, read from the app bundle: the project copies the repository's `specs/`
// directory in as a folder reference, so a new spec reaches the gallery with no project edit and the
// gallery cannot drift from the specs. Only what the gallery needs is decoded.

/// One component spec: its name, whether SwiftUI claims to implement it, and its fixtures.
struct GallerySpec: Identifiable, Decodable {
  let name: String
  let title: String?
  let fixtures: [GalleryFixture]
  /// `platforms.swiftui.status`; `planned` (or absent) means SwiftUI does not implement it yet.
  let swiftUIStatus: String?

  var id: String { name }
  /// A spec SwiftUI claims to implement must have a gallery entry (the UI tests check it).
  var isImplemented: Bool { (swiftUIStatus ?? "planned") != "planned" }

  private enum CodingKeys: String, CodingKey { case name, title, fixtures, platforms }
  private struct Platform: Decodable { let status: String? }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    name = try container.decode(String.self, forKey: .name)
    title = try container.decodeIfPresent(String.self, forKey: .title)
    fixtures = try container.decodeIfPresent([GalleryFixture].self, forKey: .fixtures) ?? []
    let platforms = try container.decodeIfPresent([String: Platform].self, forKey: .platforms)
    swiftUIStatus = platforms?["swiftui"]?.status
  }

  /// The directory of the bundle the specs are copied into.
  static let bundleDirectory = "specs"

  /// Every spec in the bundle, by name. A spec that does not decode is reported, not dropped silently.
  static func loadAll(from bundle: Bundle = .main) -> (specs: [GallerySpec], failures: [String]) {
    let urls = bundle.urls(forResourcesWithExtension: "json", subdirectory: bundleDirectory) ?? []
    var specs: [GallerySpec] = []
    var failures: [String] = []
    for url in urls where url.lastPathComponent.hasSuffix(".spec.json") {
      do {
        specs.append(try JSONDecoder().decode(GallerySpec.self, from: Data(contentsOf: url)))
      } catch {
        failures.append("\(url.lastPathComponent): \(error)")
      }
    }
    return (specs.sorted { $0.name < $1.name }, failures.sorted())
  }
}

/// One entry of a spec's `fixtures`: an id, the props (any JSON value), the content and — for a component with item
/// kinds — its items, in order.
struct GalleryFixture: Identifiable, Decodable, GalleryProps {
  let id: String
  let props: [String: GalleryValue]
  let content: String?
  /// The fixture's items; empty for a component without item kinds.
  let items: [GalleryItem]
  /// The slots the fixture fills, by name — one string or a list.
  let slots: [String: GalleryValue]

  private enum CodingKeys: String, CodingKey { case id, props, content, items, slots }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    id = try container.decode(String.self, forKey: .id)
    props = try container.decodeIfPresent([String: GalleryValue].self, forKey: .props) ?? [:]
    content = try container.decodeIfPresent(String.self, forKey: .content)
    items = try container.decodeIfPresent([GalleryItem].self, forKey: .items) ?? []
    slots = try container.decodeIfPresent([String: GalleryValue].self, forKey: .slots) ?? [:]
  }

  /// The strings the fixture puts into `slot`, in order — one, several, or none. What each becomes is the
  /// slot's `fixture` kind (glyph, icon-button, button, text), which the component's entry draws.
  func slot(_ slot: String) -> [String] {
    switch slots[slot] {
    case .string(let value): return [value]
    case .array(let values): return values.compactMap { if case .string(let value) = $0 { return value } else { return nil } }
    default: return []
    }
  }
}

/// One item of a fixture: its kind, its props, its content and — for a group kind — its own items.
struct GalleryItem: Decodable, GalleryProps {
  let kind: String
  let props: [String: GalleryValue]
  let content: String?
  let items: [GalleryItem]

  private enum CodingKeys: String, CodingKey { case kind, props, content, items }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    kind = try container.decode(String.self, forKey: .kind)
    props = try container.decodeIfPresent([String: GalleryValue].self, forKey: .props) ?? [:]
    content = try container.decodeIfPresent(String.self, forKey: .content)
    items = try container.decodeIfPresent([GalleryItem].self, forKey: .items) ?? []
  }
}

/// Reading the props of a fixture or of an item.
protocol GalleryProps {
  var props: [String: GalleryValue] { get }
}

extension GalleryProps {

  /// A string prop — an enum value, the key of an open axis (`variant`, `size` …).
  func string(_ prop: String) -> String? {
    if case .string(let value) = props[prop] { return value }
    return nil
  }

  /// A boolean prop (`disabled`, `selected` …).
  func bool(_ prop: String) -> Bool? {
    if case .bool(let value) = props[prop] { return value }
    return nil
  }

  /// A number prop.
  func number(_ prop: String) -> Double? {
    if case .number(let value) = props[prop] { return value }
    return nil
  }

  /// A list-of-strings prop (`values`).
  func strings(_ prop: String) -> [String]? {
    guard case .array(let values) = props[prop] else { return nil }
    return values.compactMap { if case .string(let value) = $0 { return value } else { return nil } }
  }

  /// The key of an open axis (`TanreiButtonVariant`, `TanreiButtonSize` …) the prop names, or the axis default.
  func key<Key: RawRepresentable>(_ prop: String, default fallback: Key) -> Key where Key.RawValue == String {
    string(prop).flatMap(Key.init(rawValue:)) ?? fallback
  }
}

/// A JSON value, as fixture props hold them.
enum GalleryValue: Decodable, Equatable {
  case string(String)
  case number(Double)
  case bool(Bool)
  case array([GalleryValue])
  case object([String: GalleryValue])
  case null

  init(from decoder: Decoder) throws {
    let container = try decoder.singleValueContainer()
    if container.decodeNil() {
      self = .null
    } else if let value = try? container.decode(Bool.self) {
      self = .bool(value)
    } else if let value = try? container.decode(Double.self) {
      self = .number(value)
    } else if let value = try? container.decode(String.self) {
      self = .string(value)
    } else if let value = try? container.decode([GalleryValue].self) {
      self = .array(value)
    } else {
      self = .object(try container.decode([String: GalleryValue].self))
    }
  }
}
