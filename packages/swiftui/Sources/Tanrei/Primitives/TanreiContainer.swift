import SwiftUI

// The layers of a container control, shared by everything that has one (buttons, chips, cards, FABs …):
// the filled, elevated surface, the ripple of a press over it, the outline, and the state opacity of the
// whole control. And the icon slot that sits in a label row. Every value is handed in from the tokens.

/// BTN-9 `ripple`, as a container draws it: the pressed state layer, grown from the point of contact.
struct TanreiContainerRipple {
  let color: Color
  /// From `TanreiPressState.contact`; `nil` = the center (a key press).
  let origin: CGPoint?
  /// How it grows (`nil` under Reduce Motion: the layer is simply there).
  let growth: Animation?
  /// From `TanreiPressState`: a new press is a new ripple, and a render that never saw one shows it grown.
  let generation: Int
  let startsGrown: Bool

  init(color: Color, press: TanreiPressState, growth: Animation?) {
    self.color = color
    origin = press.contact
    self.growth = growth
    generation = press.generation
    startsGrown = !press.hasBegun
  }
}

/// Draws a container behind the modified view and its outline over it, then applies the state opacity to
/// the WHOLE control, as CSS `opacity` does: label, container, state layer and outline are flattened first.
/// (SwiftUI's `opacity` alone fades each layer on its own, so a label would show the container through it,
/// and a ripple the container beneath.)
///
/// The container is always present — a `none` paint draws nothing — so a state change animates the fill
/// instead of inserting and removing a view. Its corners follow `sys.shape.corner-smoothing` (BTN-10).
struct TanreiContainerLayers: ViewModifier {
  let fill: Color
  let elevation: [TanreiShadowLayer]
  let cornerRadius: CGFloat
  let outline: Color
  let outlineWidth: CGFloat
  /// Only while a `ripple` press is shown.
  let ripple: TanreiContainerRipple?
  /// The state's opacity of the whole control.
  let opacity: Double
  /// A joined item's corners (BGR-2): its leading and trailing corners differ. `nil` — anywhere else — draws
  /// `cornerRadius` at every corner.
  var sides: TanreiSideCorners? = nil

  @Environment(\.tanreiSystem) private var system

  func body(content: Content) -> some View {
    let style = system.shape.roundedCornerStyle
    if let sides {
      layers(content, shape: TanreiSideRoundedRectangle(sides, style: style))
    } else {
      layers(content, shape: RoundedRectangle(cornerRadius: cornerRadius, style: style))
    }
  }

  /// Fill, ripple and outline in `shape`: the container's corners, whichever they are.
  private func layers(_ content: Content, shape: some InsettableShape) -> some View {
    content
      .background {
        ZStack {
          TanreiElevationSurface(elevation, fill: fill, cornerRadius: cornerRadius, sides: sides)
          // The pressed state layer grows over the container from the point of contact, clipped to the
          // container's shape.
          if let ripple {
            TanreiRipple(origin: ripple.origin, color: ripple.color, animation: ripple.growth, startsGrown: ripple.startsGrown)
              .clipShape(shape)
              .id(ripple.generation)
              .transition(.opacity)
              .allowsHitTesting(false)
              .accessibilityHidden(true)
          }
        }
      }
      .overlay {
        shape
          .strokeBorder(outline, lineWidth: outlineWidth)
          .allowsHitTesting(false)
      }
      .compositingGroup()
      .opacity(opacity)
  }
}

/// An icon in a label row: it takes its width in the row and NO height, centered on the row — so on the
/// text's line box, the container's center when the block padding is symmetric — and never grows the
/// container, however tall it is. Only text has a line box. Decorative:
/// the label's text is the accessible name.
struct TanreiIconSlot<Icon: View>: View {
  /// The icon box, already scaled with the label's type (`TanreiDynamicType`).
  let size: CGFloat
  @ViewBuilder let icon: Icon

  var body: some View {
    Color.clear
      .frame(width: size, height: .zero)
      .overlay {
        icon
          .frame(width: size, height: size)
      }
      .accessibilityHidden(true)
  }
}

/// Whether a slot's view draws anything: `EmptyView`, an `if` without a match (`Optional.none`), a `ForEach` over no data
/// (a slot written from data that has none), and an `if` whose match is one of these
/// draw nothing — a slot then takes no room (a switch's handle does not grow, a text field keeps its plain padding, a
/// search draws its glyph). Decided from the value, so it is right on the first pass and outside a view body (a component
/// sizes its parts from it); any other view counts as content.
enum TanreiSlotContent {
  static func isEmpty<Content: View>(_ content: Content) -> Bool {
    if content is EmptyView { return true }
    if let slot = content as? any TanreiSlotEmptiness { return slot.drawsNothing }
    return false
  }
}

/// A view whose value says whether it draws nothing, as a view builder makes it from a slot's content.
protocol TanreiSlotEmptiness {
  var drawsNothing: Bool { get }
}

/// An `if` in a view builder: nothing without a match, and nothing when what matched draws nothing.
extension Optional: TanreiSlotEmptiness where Wrapped: View {
  var drawsNothing: Bool {
    guard let wrapped = self else { return true }
    return TanreiSlotContent.isEmpty(wrapped)
  }
}

/// A `ForEach` draws nothing over no data.
extension ForEach: TanreiSlotEmptiness where Content: View {
  var drawsNothing: Bool { data.isEmpty }
}
