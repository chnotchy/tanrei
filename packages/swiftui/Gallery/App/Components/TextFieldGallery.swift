import SwiftUI
import Tanrei

// specs/text-field.spec.json in the gallery: its fixtures (props `variant`, `size`, `type`, `value`, `label`, `labelHidden`,
// `placeholder`, `supportingText`, `errorText`, `error`, `disabled`, `readOnly`, `multiline`, `minRows`, `maxLength`,
// `counter`, `prefixText`, `suffixText`; content names the icons of the slots), each owning its value as an app does,
// at a phone column's width. `fire` counts the input events (TXF-1). The icons are the SF Symbols a product would pass.

extension GalleryComponent {
  static let textField = GalleryComponent(
    fixture: { fixture, fire in
      AnyView(GalleryTextField(fixture: fixture, fire: fire).disabled(fixture.bool("disabled") ?? false))
    },
    managesFocus: true
  )
}

private struct GalleryTextField: View {
  let fixture: GalleryFixture
  let fire: @MainActor () -> Void
  @State private var value: String

  init(fixture: GalleryFixture, fire: @escaping @MainActor () -> Void) {
    self.fixture = fixture
    self.fire = fire
    _value = State(initialValue: fixture.string("value") ?? "")
  }

  /// The fixture's `content` names its slots' glyphs: `leading-icon=search trailing-icon=close`.
  private var icons: [String: String] {
    var icons: [String: String] = [:]
    for pair in (fixture.content ?? "").split(separator: " ") {
      let parts = pair.split(separator: "=")
      if parts.count == 2 { icons[String(parts[0])] = String(parts[1]) }
    }
    return icons
  }

  private static let symbols = ["search": "magnifyingglass", "close": "xmark"]

  var body: some View {
    Group {
      if fixture.bool("labelHidden") ?? false { field.labelsHidden() } else { field }
    }
    .frame(width: 240)
  }

  private var field: AnyView {
    let binding = Binding(get: { value }, set: { value = $0; fire() })
    let label = fixture.string("label") ?? ""
    let prompt = fixture.string("placeholder").map { Text($0) }
    let multiline = fixture.bool("multiline") ?? false
    let minRows = Int(fixture.number("minRows") ?? 2)
    let maxRows = Int(fixture.number("maxRows") ?? 0)
    let lines: ClosedRange<Int>? = multiline ? minRows...(maxRows > 0 ? max(minRows, maxRows) : Int.max) : nil
    let type = TanreiTextFieldType(named: fixture.string("type") ?? "text")
    let leading = icons["leading-icon"].flatMap { Self.symbols[$0] }
    let trailing = icons["trailing-icon"].flatMap { Self.symbols[$0] }
    let variant = fixture.key("variant", default: TanreiTextFieldVariant.fallback)
    let size = fixture.key("size", default: TanreiTextFieldSize.fallback)
    if let leading, let trailing {
      return AnyView(
        TanreiTextField(
          label, text: binding, prompt: prompt, variant: variant, size: size, type: type, supportingText: fixture.string("supportingText") ?? "",
          errorText: fixture.string("errorText") ?? "", error: fixture.bool("error") ?? false, readOnly: fixture.bool("readOnly") ?? false,
          required: fixture.bool("required") ?? false, axis: multiline ? .vertical : .horizontal, lineLimit: lines,
          maxLength: Int(fixture.number("maxLength") ?? 0), counter: fixture.bool("counter") ?? false, prefix: fixture.string("prefixText") ?? "",
          suffix: fixture.string("suffixText") ?? "", textContentType: fixture.string("autocomplete")
        ) {
          Image(systemName: leading)
        } trailingIcon: {
          Image(systemName: trailing)
        })
    } else {
      return AnyView(
        TanreiTextField(
          label, text: binding, prompt: prompt, variant: variant, size: size, type: type, supportingText: fixture.string("supportingText") ?? "",
          errorText: fixture.string("errorText") ?? "", error: fixture.bool("error") ?? false, readOnly: fixture.bool("readOnly") ?? false,
          required: fixture.bool("required") ?? false, axis: multiline ? .vertical : .horizontal, lineLimit: lines,
          maxLength: Int(fixture.number("maxLength") ?? 0), counter: fixture.bool("counter") ?? false, prefix: fixture.string("prefixText") ?? "",
          suffix: fixture.string("suffixText") ?? "", textContentType: fixture.string("autocomplete")))
    }
  }
}
