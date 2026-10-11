import SwiftUI

// Spec: specs/dialog.spec.json — tokens: TanreiDialogTokens (comp.dialog), read from the design system in the environment
// (`system.dialog`). Every design value in this file comes from a token; there are no literals.
//
// A dialog is Tanrei's MODAL overlay: it is presented above everything, makes the rest inert,
// keeps focus in and gives it back. On iOS it is presented with `.fullScreenCover` on a clear presentation background, the
// system transition off — Tanrei draws the scrim and the motion —, which makes the rest of the app inaccessible to
// VoiceOver and to touch and keeps keyboard focus in the presented view. macOS has no full-screen cover: there the
// dialog is drawn over the view the modifier is attached to (attach it to the window's root), and that view is made
// inert. The surface — scrim and container — is `TanreiDialogSurface`, which the snapshot harness draws in place.

extension View {
  /// Presents a Tanrei dialog while `isPresented` is true, as `.alert` and `.sheet` do: a decision or a few details the task
  /// cannot go on without, over a scrim that blocks everything behind it (DLG-1).
  ///
  ///     .tanreiDialog("Discard draft?", isPresented: $confirmsDiscard,
  ///                   supportingText: "The message you were writing will be deleted from this device.") {
  ///       TanreiButton("Cancel", variant: .text) { confirmsDiscard = false }
  ///       TanreiButton("Discard", variant: .text) { discard(); confirmsDiscard = false }
  ///     }
  ///
  /// - Parameters:
  ///   - headline: the question or statement — the dialog's accessible name (required; an empty one is reported in debug
  ///     builds, DLG-14).
  ///   - supportingText: what will happen — its accessible description.
  ///   - alert: marks an urgent interruption: VoiceOver reads the headline and the supporting text as it opens (DLG-14).
  ///   - dismissible: whether Escape, the accessibility escape gesture and a press on the scrim dismiss it — writing
  ///     `false` to `isPresented`, the spec's `dismiss` (DLG-5).
  ///   - actions: Tanrei Buttons, the confirming one last. The dialog lays them out and never restyles them; they do not
  ///     close it — set `isPresented` to `false` in their actions (DLG-6, DLG-10).
  ///
  /// Initial focus (DLG-2): mark a control in the dialog with `.defaultFocus(_:_:)` (keyboard) or give VoiceOver focus
  /// with `@AccessibilityFocusState`; without a mark VoiceOver starts at the headline.
  public func tanreiDialog<Actions: View>(
    _ headline: String, isPresented: Binding<Bool>, supportingText: String = "", alert: Bool = false, dismissible: Bool = true,
    @ViewBuilder actions: @escaping () -> Actions
  ) -> some View {
    tanreiDialog(
      headline, isPresented: isPresented, supportingText: supportingText, alert: alert, dismissible: dismissible, icon: { EmptyView() },
      actions: actions, content: { EmptyView() })
  }

  /// A dialog with custom content below its supporting text (a list to choose from, a field). The dialog insets it and
  /// hands it `content.color` as its foreground style and the body text style (DLG-8).
  public func tanreiDialog<Actions: View, Content: View>(
    _ headline: String, isPresented: Binding<Bool>, supportingText: String = "", alert: Bool = false, dismissible: Bool = true,
    @ViewBuilder actions: @escaping () -> Actions, @ViewBuilder content: @escaping () -> Content
  ) -> some View {
    tanreiDialog(
      headline, isPresented: isPresented, supportingText: supportingText, alert: alert, dismissible: dismissible, icon: { EmptyView() },
      actions: actions, content: content)
  }

  /// A dialog with an icon above its headline: the icon and the headline are centred (DLG-9).
  public func tanreiDialog<Icon: View, Actions: View>(
    _ headline: String, isPresented: Binding<Bool>, supportingText: String = "", alert: Bool = false, dismissible: Bool = true,
    @ViewBuilder icon: @escaping () -> Icon, @ViewBuilder actions: @escaping () -> Actions
  ) -> some View {
    tanreiDialog(
      headline, isPresented: isPresented, supportingText: supportingText, alert: alert, dismissible: dismissible, icon: icon, actions: actions,
      content: { EmptyView() })
  }

  /// A dialog with an icon, actions and custom content.
  public func tanreiDialog<Icon: View, Actions: View, Content: View>(
    _ headline: String, isPresented: Binding<Bool>, supportingText: String = "", alert: Bool = false, dismissible: Bool = true,
    @ViewBuilder icon: @escaping () -> Icon, @ViewBuilder actions: @escaping () -> Actions, @ViewBuilder content: @escaping () -> Content
  ) -> some View {
    modifier(
      TanreiDialogPresenter(
        isPresented: isPresented,
        dialog: TanreiDialogContent(headline: headline, supportingText: supportingText, alert: alert, dismissible: dismissible),
        icon: icon, actions: actions, custom: content))
  }
}

/// What a dialog says and how it may be closed.
struct TanreiDialogContent: Equatable, Sendable {
  let headline: String
  let supportingText: String
  let alert: Bool
  let dismissible: Bool

  /// DLG-14: what an alert has read as it opens — the headline, then the supporting text.
  var announcement: String {
    [headline, supportingText].filter { !$0.isEmpty }.joined(separator: ". ")
  }

  /// DLG-14: an empty headline.
  var problems: [String] {
    headline.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      ? ["a dialog's headline is empty, so it has no accessible name (DLG-14)"] : []
  }
}

/// DLG-5 — what a dismissal does: while dismissible, Escape, the accessibility escape gesture and a press on the scrim
/// write `false` to the binding once; otherwise nothing.
enum TanreiDialogRules {
  @MainActor
  static func dismiss(_ isPresented: Binding<Bool>, dismissible: Bool) {
    guard dismissible, isPresented.wrappedValue else { return }
    isPresented.wrappedValue = false
  }
}

/// The presenting view's side: the presentation, the motion's phases and the modal count (DLG-1, DLG-13).
private struct TanreiDialogPresenter<Icon: View, Actions: View, Custom: View>: ViewModifier {
  let isPresented: Binding<Bool>
  let dialog: TanreiDialogContent
  let icon: () -> Icon
  let actions: () -> Actions
  let custom: () -> Custom

  @Environment(\.tanreiSystem) private var system
  /// Whether the surface is presented at all (it stays while it fades out).
  @State private var isCovering = false
  /// Whether it is shown (in) or fading out.
  @State private var isShown = false

  func body(content: Content) -> some View {
    content
      #if os(iOS)
      .fullScreenCover(isPresented: coverBinding) { surface.presentationBackground(.clear) }
      #else
      // macOS: over the view the modifier is attached to, which is inert meanwhile (DLG-1): nothing in it can be pressed,
      // hidden from VoiceOver, and — disabled — nothing in it takes keyboard focus, which keeps focus in the dialog (DLG-3).
      .disabled(isCovering)
      .allowsHitTesting(!isCovering)
      .accessibilityHidden(isCovering)
      .overlay { if isCovering { surface } }
      #endif
      .onChange(of: isPresented.wrappedValue, initial: true) { _, open in open ? present() : close() }
      .onDisappear { if isCovering { TanreiModalCoordinator.shared.closed() } }
  }

  private var surface: some View {
    return TanreiDialogSurface(
      dialog: dialog, isShown: isShown, onDismiss: { TanreiDialogRules.dismiss(isPresented, dismissible: dialog.dismissible) },
      icon: icon(), actions: actions(), content: custom())
  }

  /// The cover's own binding: SwiftUI writes `false` to it only when it dismisses the cover itself.
  private var coverBinding: Binding<Bool> {
    Binding(get: { isCovering }, set: { value in if !value { isCovering = false } })
  }

  private func present() {
    guard !isCovering else { return }
    dialog.problems.forEach { TanreiDiagnostics.report("Tanrei: \($0)") }
    TanreiModalCoordinator.shared.opened()
    // The system's transition is off: Tanrei's motion is the surface's (DLG-13).
    var transaction = Transaction()
    transaction.disablesAnimations = true
    withTransaction(transaction) { isCovering = true }
    Task(priority: .userInitiated) { @MainActor in
      withAnimation(system.dialog.enterMotion()) { isShown = true }
      // DLG-14: an alert is read as it opens.
      if dialog.alert { AccessibilityNotification.Announcement(dialog.announcement).post() }
    }
  }

  private func close() {
    guard isCovering else { return }
    TanreiModalCoordinator.shared.closed()
    withAnimation(system.dialog.exitMotion()) { isShown = false }
    let exit = system.dialog.motionExitDuration
    Task(priority: .userInitiated) { @MainActor in
      try? await Task.sleep(for: .milliseconds(Int(exit)))
      guard !isPresented.wrappedValue else { return }
      var transaction = Transaction()
      transaction.disablesAnimations = true
      withTransaction(transaction) { isCovering = false }
    }
  }
}

extension TanreiDialogTokens {
  /// DLG-13: in over `motion.enter-*`; the growth is the surface's, left out under Reduce Motion.
  func enterMotion() -> Animation? {
    TanreiMotion.animation(durationMs: motionEnterDuration, easing: motionEnterEasing, reduceMotion: false)
  }

  /// DLG-13: out over `motion.exit-*`, a fade of the scrim and the container.
  func exitMotion() -> Animation? {
    TanreiMotion.animation(durationMs: motionExitDuration, easing: motionExitEasing, reduceMotion: false)
  }

  /// DLG-13: the container's scale while it is not shown — `motion.enter-scale`, or 1 (no growth) under Reduce Motion.
  func hiddenScale(reduceMotion: Bool) -> CGFloat {
    reduceMotion ? TanreiIdentity.scale : CGFloat(motionEnterScale)
  }
}

// MARK: - The surface

/// The dialog as it is presented: the scrim over the whole window and the container centred in the safe area,
/// `container.margin` from every edge and from the keyboard (DLG-1, DLG-7). The modifier presents it; the fixtures draw it
/// in place with `init(inPlace:…)`.
public struct TanreiDialogSurface<Icon: View, Actions: View, Content: View>: View {
  let dialog: TanreiDialogContent
  let isShown: Bool
  /// Presented (modal), or drawn in place for a fixture (not modal: the page around it is live).
  var isModal = true
  let onDismiss: @MainActor () -> Void
  let icon: Icon
  let actions: Actions
  let content: Content

  @Environment(\.tanreiTheme) private var theme
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @TanreiPalette private var colors

  init(
    dialog: TanreiDialogContent, isShown: Bool, onDismiss: @escaping @MainActor () -> Void, icon: Icon, actions: Actions, content: Content
  ) {
    self.dialog = dialog
    self.isShown = isShown
    self.onDismiss = onDismiss
    self.icon = icon
    self.actions = actions
    self.content = content
  }

  /// The dialog drawn in place, open and at rest (fixtures and galleries only): its scrim fills the space it is given.
  @_spi(Fixtures)
  public init(
    inPlace headline: String, supportingText: String = "", alert: Bool = false, dismissible: Bool = true, onDismiss: @escaping @MainActor () -> Void = {},
    @ViewBuilder icon: () -> Icon, @ViewBuilder actions: () -> Actions, @ViewBuilder content: () -> Content
  ) {
    self.init(
      dialog: TanreiDialogContent(headline: headline, supportingText: supportingText, alert: alert, dismissible: dismissible), isShown: true,
      onDismiss: onDismiss, icon: icon(), actions: actions(), content: content())
    isModal = false
  }

  public var body: some View {
    let tokens = theme.system.dialog
    ZStack {
      // DLG-1: the scrim over the whole window; DLG-5: pressing it dismisses a dismissible dialog. Decorative.
      Rectangle()
        .fill(colors[tokens.scrimColor])
        .ignoresSafeArea()
        .contentShape(Rectangle())
        .onTapGesture { onDismiss() }
        .accessibilityHidden(true)
        .opacity(isShown ? 1 : .zero)
      TanreiDialogContainer(dialog: dialog, isModal: isModal, icon: icon, actions: actions, content: content)
        // DLG-13: in, it fades and grows about its centre from `motion.enter-scale`; only fades under Reduce Motion.
        .opacity(isShown ? 1 : .zero)
        .scaleEffect(isShown ? TanreiIdentity.scale : tokens.hiddenScale(reduceMotion: reduceMotion))
        .padding(tokens.containerMargin)
        // DLG-5: Escape, and the accessibility escape gesture.
        .onKeyPress(.escape) {
          onDismiss()
          return .handled
        }
        #if os(macOS)
        .onExitCommand { onDismiss() }
        #endif
        .accessibilityAction(.escape) { onDismiss() }
    }
    // A tooltip inside the dialog is drawn above it (TIP-13).
    .tanreiTooltipLayer()
  }
}

// MARK: - The container

/// The container: the icon and headline, the supporting text and content (scrolling when they do not fit, DLG-11), the
/// actions (DLG-10), on the raised surface (DLG-7). When the fixed parts alone leave no room, everything scrolls together
/// (DLG-12).
struct TanreiDialogContainer<Icon: View, Actions: View, Content: View>: View {
  let dialog: TanreiDialogContent
  var isModal = true
  let icon: Icon
  let actions: Actions
  let content: Content

  @Environment(\.tanreiTheme) private var theme
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @TanreiPalette private var colors
  /// DLG-11: where the scrolled part is — at its top, and at its end.
  @State private var scroll = TanreiDialogScroll()

  var body: some View {
    let tokens = theme.system.dialog
    let hasIcon = !TanreiSlotContent.isEmpty(icon)
    let minimumBody = tokens.supportingTextTypescale.resolved(policy: theme.fontFamilyPolicy, dynamicTypeSize: dynamicTypeSize).lineHeight
    let layout = TanreiDialogLayout(
      padding: tokens.containerPadding, gap: tokens.containerGap, actionsMargin: tokens.actionsMarginBlockStart, minWidth: tokens.containerMinWidth,
      maxWidth: tokens.containerMaxWidth, minimumBody: minimumBody, scroll: scroll)
    ViewThatFits(in: .vertical) {
      // DLG-11: the header and the actions stay; the body scrolls between them, dividers showing what is scrolled away.
      layout {
        header(tokens: tokens, hasIcon: hasIcon).layoutValue(key: TanreiDialogLayout.PartKey.self, value: .header)
        divider(tokens: tokens).layoutValue(key: TanreiDialogLayout.PartKey.self, value: .topDivider)
        TanreiScrollRegion(axis: .vertical) {
          body(tokens: tokens)
            .background {
              GeometryReader { proxy in
                Color.clear
                  .onAppear { scroll.content = proxy.frame(in: .named(TanreiDialogScroll.space)) }
                  .onChange(of: proxy.frame(in: .named(TanreiDialogScroll.space))) { _, frame in scroll.content = frame }
              }
            }
        }
        .coordinateSpace(.named(TanreiDialogScroll.space))
        .background {
          GeometryReader { proxy in
            Color.clear
              .onAppear { scroll.viewport = proxy.size.height }
              .onChange(of: proxy.size.height) { _, height in scroll.viewport = height }
          }
        }
        .layoutValue(key: TanreiDialogLayout.PartKey.self, value: .body)
        divider(tokens: tokens).layoutValue(key: TanreiDialogLayout.PartKey.self, value: .bottomDivider)
        actionsRow(tokens: tokens).layoutValue(key: TanreiDialogLayout.PartKey.self, value: .actions)
      }
      // DLG-12: the fixed parts leave no room — everything scrolls together.
      TanreiScrollRegion(axis: .vertical) {
        VStack(alignment: .leading, spacing: tokens.containerGap) {
          header(tokens: tokens, hasIcon: hasIcon)
          body(tokens: tokens)
          actionsRow(tokens: tokens).padding(.top, tokens.actionsMarginBlockStart - tokens.containerGap)
        }
        .padding(tokens.containerPadding)
      }
      .frame(minWidth: tokens.containerMinWidth, maxWidth: tokens.containerMaxWidth)
    }
    // The parts are clipped to the container's corners; its shadow is not.
    .clipShape(TanreiCornerShape(cornerRadius: tokens.containerShape, style: theme.system.shape.roundedCornerStyle))
    // DLG-14: a modal container named by the headline, described by the supporting text. SwiftUI has no dialog or alert
    // dialog role.
    .accessibilityElement(children: .contain)
    .accessibilityAddTraits(isModal ? .isModal : [])
    .modifier(TanreiDialogName(dialog: dialog))
    // DLG-7: the raised surface, its corners eased by the corner smoothing.
    .background {
      TanreiElevationSurface(tokens.containerElevation, fill: colors[tokens.containerColor], cornerRadius: tokens.containerShape)
    }
  }

  /// DLG-8, DLG-9: the icon above the headline, both centred, or the headline alone at the start.
  @ViewBuilder
  private func header(tokens: TanreiDialogTokens, hasIcon: Bool) -> some View {
    VStack(alignment: hasIcon ? .center : .leading, spacing: tokens.containerGap) {
      if hasIcon {
        icon
          .tanreiIconContext(size: tokens.iconSize, selected: false)
          .frame(width: tokens.iconSize, height: tokens.iconSize)
          .foregroundStyle(colors[tokens.iconColor])
          .accessibilityHidden(true)
      }
      if !dialog.headline.isEmpty {
        Text(verbatim: dialog.headline)
          .multilineTextAlignment(hasIcon ? .center : .leading)
          .fixedSize(horizontal: false, vertical: true)
          .tanreiTextStyle(tokens.headlineTypescale)
          .foregroundStyle(colors[tokens.headlineColor])
          .accessibilityAddTraits(.isHeader)
      }
    }
    .frame(maxWidth: .infinity, alignment: hasIcon ? .center : .leading)
  }

  /// DLG-8: the supporting text and the content, `container.gap` apart; the content gets the content color and the body
  /// text style.
  private func body(tokens: TanreiDialogTokens) -> some View {
    VStack(alignment: .leading, spacing: tokens.containerGap) {
      if !dialog.supportingText.isEmpty {
        Text(verbatim: dialog.supportingText)
          .multilineTextAlignment(.leading)
          .fixedSize(horizontal: false, vertical: true)
          .tanreiTextStyle(tokens.supportingTextTypescale)
          .foregroundStyle(colors[tokens.supportingTextColor])
      }
      if !TanreiSlotContent.isEmpty(content) {
        content
          .foregroundStyle(colors[tokens.contentColor])
          .tanreiFont(theme.system.typescale.body)
          .frame(maxWidth: .infinity, alignment: .leading)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  /// DLG-11: a hairline across the container.
  private func divider(tokens: TanreiDialogTokens) -> some View {
    Rectangle()
      .fill(colors[tokens.dividerColor])
      .frame(height: tokens.dividerWidth)
      .accessibilityHidden(true)
  }

  /// DLG-10: the buttons in one row at the end, `actions.gap` apart, in order — or, when they do not fit, in a column at the
  /// end. They keep their own variant, size and tokens.
  private func actionsRow(tokens: TanreiDialogTokens) -> some View {
    ViewThatFits(in: .horizontal) {
      HStack(spacing: tokens.actionsGap) { actions }
      VStack(alignment: .trailing, spacing: tokens.actionsGap) { actions }
    }
    .frame(maxWidth: .infinity, alignment: .trailing)
  }
}

private struct TanreiDialogName: ViewModifier {
  let dialog: TanreiDialogContent

  func body(content: Content) -> some View {
    content
      .accessibilityLabel(Text(verbatim: dialog.headline))
      .modifier(TanreiDialogDescription(text: dialog.supportingText))
  }
}

private struct TanreiDialogDescription: ViewModifier {
  let text: String

  func body(content: Content) -> some View {
    if text.isEmpty { content } else { content.accessibilityHint(Text(verbatim: text)) }
  }
}

/// DLG-11 — where the scrolled part is: its content's frame in the scroll view, and the scroll view's height.
struct TanreiDialogScroll: Equatable {
  static let space = "tanrei.dialog.scroll"

  var content: CGRect = .zero
  var viewport: CGFloat = .zero

  /// Scrolled away from its top: the divider below the headline shows.
  var isAwayFromTop: Bool { content.minY < -TanreiDialogScroll.slack }

  /// Something is still below: the divider above the actions shows. Before anything is measured (the first pass), the
  /// layout's own overflow decides.
  var hasMoreBelow: Bool? {
    guard viewport > .zero, content.height > .zero else { return nil }
    return content.maxY > viewport + TanreiDialogScroll.slack
  }

  /// Half a point: what a scroll position may differ by and still be at its end.
  static let slack: CGFloat = 0.5
}

/// DLG-7, DLG-8, DLG-11 — the container's layout, stateless: padded by `padding`, as wide as its widest part between
/// `minWidth` and `maxWidth` (never wider than offered); the header, then the body `gap` below it, then the actions
/// `actionsMargin` below the last part. When everything does not fit the height offered, the header and the actions keep
/// their places and the body gets the rest, with the dividers drawn below the header while the body is scrolled from its
/// top and above the actions while more lies below. Its ideal height (asked by `ViewThatFits`) is the least it can be with
/// a body of `minimumBody` — so where even that does not fit, everything scrolls together instead (DLG-12).
struct TanreiDialogLayout: Layout {
  let padding: CGFloat
  let gap: CGFloat
  let actionsMargin: CGFloat
  let minWidth: CGFloat
  let maxWidth: CGFloat
  let minimumBody: CGFloat
  let scroll: TanreiDialogScroll

  enum Part: Sendable {
    case header
    case topDivider
    case body
    case bottomDivider
    case actions
  }

  struct PartKey: LayoutValueKey {
    static let defaultValue = Part.body
  }

  struct Arrangement: Equatable {
    var size: CGSize
    var frames: [CGRect]
    var overflows: Bool
  }

  func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
    arrange(proposal: proposal, subviews: subviews).size
  }

  func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
    let arrangement = arrange(proposal: ProposedViewSize(width: bounds.width, height: bounds.height), subviews: subviews)
    for (subview, frame) in zip(subviews, arrangement.frames) {
      subview.place(
        at: CGPoint(x: bounds.minX + frame.minX, y: bounds.minY + frame.minY), anchor: .topLeading,
        proposal: ProposedViewSize(width: frame.width, height: frame.height))
    }
  }

  func arrange(proposal: ProposedViewSize, subviews: Subviews) -> Arrangement {
    let parts = subviews.map { $0[PartKey.self] }
    func index(_ part: Part) -> Int? { parts.firstIndex(of: part) }
    let limit = min(maxWidth, proposal.width.flatMap { $0.isFinite ? $0 : nil } ?? maxWidth)
    let ideal = [Part.header, .body, .actions].compactMap(index).map { subviews[$0].sizeThatFits(.unspecified).width }.max() ?? .zero
    let width = max(min(ideal + 2 * padding, limit), min(minWidth, limit))
    let inner = max(.zero, width - 2 * padding)
    func height(_ part: Part) -> CGFloat {
      guard let index = index(part) else { return .zero }
      return subviews[index].sizeThatFits(ProposedViewSize(width: inner, height: nil)).height
    }
    let header = height(.header)
    let body = height(.body)
    let actions = height(.actions)
    let hasHeader = header > .zero
    let hasBody = body > .zero
    let hasActions = actions > .zero
    let bodyGap = hasHeader && hasBody ? gap : .zero
    let actionsGap = hasActions && (hasHeader || hasBody) ? actionsMargin : .zero
    let fixed = 2 * padding + header + bodyGap + actionsGap + actions
    let natural = fixed + body
    let available = proposal.height.flatMap { $0.isFinite ? $0 : nil }
    // Asked for its ideal (by `ViewThatFits`): the least it can be while the body still scrolls.
    let total: CGFloat
    let bodyHeight: CGFloat
    if let available {
      total = min(natural, max(available, fixed + min(body, minimumBody)))
      bodyHeight = max(.zero, total - fixed)
    } else {
      total = fixed + min(body, minimumBody)
      bodyHeight = min(body, minimumBody)
    }
    let overflows = bodyHeight < body - TanreiDialogScroll.slack

    var frames = Array(repeating: CGRect.zero, count: subviews.count)
    var y = padding
    if let header = index(.header) {
      frames[header] = CGRect(x: padding, y: y, width: inner, height: height(.header))
      y += height(.header) + bodyGap
    }
    let bodyTop = y
    if let body = index(.body) { frames[body] = CGRect(x: padding, y: bodyTop, width: inner, height: bodyHeight) }
    y += bodyHeight + actionsGap
    if let actions = index(.actions) { frames[actions] = CGRect(x: padding, y: y, width: inner, height: height(.actions)) }
    // DLG-11: the dividers span the container, at the body's top and bottom edges — only while it overflows and only on the
    // side that is scrolled away (before the first measure: none above, one below).
    let dividerHeight: (Int) -> CGFloat = { subviews[$0].sizeThatFits(ProposedViewSize(width: width, height: nil)).height }
    if overflows, scroll.isAwayFromTop, let top = index(.topDivider) {
      frames[top] = CGRect(x: .zero, y: bodyTop - dividerHeight(top), width: width, height: dividerHeight(top))
    }
    if overflows, scroll.hasMoreBelow ?? true, let bottom = index(.bottomDivider) {
      frames[bottom] = CGRect(x: .zero, y: bodyTop + bodyHeight, width: width, height: dividerHeight(bottom))
    }
    return Arrangement(size: CGSize(width: width, height: total), frames: frames, overflows: overflows)
  }
}
