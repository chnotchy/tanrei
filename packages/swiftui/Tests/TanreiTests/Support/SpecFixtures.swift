import Foundation

/// The `fixtures` of a spec, read from the repository's `specs/<name>.spec.json`, so a snapshot suite can assert that
/// the fixture list it mirrors is the spec's.
struct SpecFixture: Decodable, Equatable {
  let id: String
  let props: [String: SpecValue]
  let content: String?
  /// The fixture's repeated items, in order; `nil` for a component without item kinds.
  let items: [SpecItem]?
  /// The slots the fixture fills: one string, or a list; `nil` when it fills none.
  let slots: [String: SpecValue]?

  /// The strings a fixture puts into `slot`, in order: one, several, or none.
  func slot(_ slot: String) -> [String] {
    switch slots?[slot] {
    case .string(let value): return [value]
    case .array(let values): return values.compactMap { if case .string(let value) = $0 { return value } else { return nil } }
    default: return []
    }
  }

  func strings(_ prop: String) -> [String]? {
    guard case .array(let values) = props[prop] else { return nil }
    return values.compactMap { if case .string(let value) = $0 { return value } else { return nil } }
  }

  func string(_ prop: String) -> String? {
    if case .string(let value) = props[prop] { return value }
    return nil
  }

  func bool(_ prop: String) -> Bool? {
    if case .bool(let value) = props[prop] { return value }
    return nil
  }

  func number(_ prop: String) -> Double? {
    if case .number(let value) = props[prop] { return value }
    return nil
  }

  static func load(spec name: String, filePath: String = #filePath) throws -> [SpecFixture] {
    // …/packages/swiftui/Tests/TanreiTests/<file>.swift → the repository root.
    var root = URL(fileURLWithPath: filePath)
    for _ in 0..<5 { root.deleteLastPathComponent() }
    let data = try Data(contentsOf: root.appendingPathComponent("specs/\(name).spec.json"))
    struct Spec: Decodable { let fixtures: [SpecFixture] }
    return try JSONDecoder().decode(Spec.self, from: data).fixtures
  }
}

/// One item of a fixture: its kind, its props, its content, and — for a group kind — its own items.
struct SpecItem: Decodable, Equatable {
  let kind: String
  let props: [String: SpecValue]
  let content: String?
  let items: [SpecItem]?

  func string(_ prop: String) -> String? {
    if case .string(let value) = props[prop] { return value }
    return nil
  }

  func bool(_ prop: String) -> Bool? {
    if case .bool(let value) = props[prop] { return value }
    return nil
  }

  func number(_ prop: String) -> Double? {
    if case .number(let value) = props[prop] { return value }
    return nil
  }
}

/// A JSON value as fixture props hold it.
enum SpecValue: Decodable, Equatable {
  case string(String)
  case number(Double)
  case bool(Bool)
  case array([SpecValue])
  case null

  init(from decoder: Decoder) throws {
    let container = try decoder.singleValueContainer()
    if container.decodeNil() {
      self = .null
    } else if let value = try? container.decode(Bool.self) {
      self = .bool(value)
    } else if let value = try? container.decode(Double.self) {
      self = .number(value)
    } else if let value = try? container.decode([SpecValue].self) {
      self = .array(value)
    } else {
      self = .string(try container.decode(String.self))
    }
  }
}
