import SwiftUI
import Tanrei

// specs/app-bar.spec.json in the gallery: each fixture is a bar across its row, with the fixture's props (`title`, `subtitle`,
// `size`, `titleAlignment`, `scrolled`) and its items as standard TanreiIconButtons in their slots — the
// `navigation` kind in the navigation builder, the `action` kinds in the actions builder, in order —, each named by its
// `label` and drawing its glyph; `fire` counts their clicks. Below them, a screen as a product builds one: a button presents
// a NavigationStack whose system bar is hidden, a bar in the top inset of each screen, the scroll view connected with
// `.tanreiAppBarScrollSource()`. The UI tests push the large-titled screen, scroll it (APB-8), and swipe back from the edge.

extension GalleryComponent {
  static let appBar = GalleryComponent(
    fixture: { fixture, fire in
      let navigation = fixture.items.filter { $0.kind == "navigation" }
      let actions = fixture.items.filter { $0.kind == "action" }
      return AnyView(
        TanreiAppBar(
          fixture.string("title") ?? "", subtitle: fixture.string("subtitle") ?? "", size: fixture.key("size", default: TanreiAppBarSize.fallback),
          titleAlignment: fixture.string("titleAlignment").flatMap(TanreiAppBarTitleAlignment.init(rawValue:)) ?? .start,
          isScrolled: fixture.bool("scrolled") ?? false
        ) {
          ForEach(navigation.indices, id: \.self) { GalleryAppBarButton(item: navigation[$0], fire: fire) }
        } actions: {
          ForEach(actions.indices, id: \.self) { GalleryAppBarButton(item: actions[$0], fire: fire) }
        }
        // The row's element: the bar has no role of its own (APB-11), so the identifier needs a container.
        .accessibilityElement(children: .contain))
    },
    explore: { _ in
      [
        GalleryExploration(
          title: "A screen with an app bar",
          examples: [GalleryExample(id: "screen", caption: "tap to open · Back fires") { fire in AnyView(GalleryAppBarScreenButton(fire: fire)) }])
      ]
    }
  )
}

/// One item of a fixture: a standard medium icon button named by its label, drawing its glyph.
private struct GalleryAppBarButton: View {
  let item: GalleryItem
  let fire: @MainActor () -> Void

  var body: some View {
    TanreiIconButton(item.string("label") ?? "", action: fire) { GalleryIcon(glyph: item.content ?? "") }
  }
}

/// A button that presents a screen as a product builds one. Its value says whether the screen is open.
private struct GalleryAppBarScreenButton: View {
  let fire: @MainActor () -> Void
  @State private var isPresented = false

  var body: some View {
    TanreiButton("Open mail", action: { isPresented = true })
      .accessibilityValue(isPresented ? "open" : "closed")
      .fullScreenCover(isPresented: $isPresented) {
        GalleryAppBarScreen(fire: fire, close: { isPresented = false })
      }
  }
}

/// A NavigationStack with its system bar hidden: "Mail" (a small bar, a Close action and a link) pushes "Inbox" (a large bar
/// with a Back button, connected to its scroll view).
private struct GalleryAppBarScreen: View {
  let fire: @MainActor () -> Void
  let close: @MainActor () -> Void
  @State private var path: [String] = []
  /// `-touchProbe YES`: what the window received of the last touch, shown on both screens (the gallery's own report lies
  /// under this full-screen cover), so that the UI test tells a back swipe the app never received from one it received
  /// and did not act on.
  @State private var touchReport: GalleryTouchReport?
  private let probesTouches = UserDefaults.standard.bool(forKey: "touchProbe")
  @Environment(\.tanreiSystem) private var system
  @TanreiPalette private var colors

  var body: some View {
    stack
      .overlay(alignment: .bottomLeading) {
        if probesTouches {
          Text(verbatim: "touch: \(touchReport?.label ?? "none")")
            .tanreiTextStyle(system.typescale.bodySmall)
            .foregroundStyle(colors[.onSurfaceVariant])
            .padding(system.space.space200)
            .allowsHitTesting(false)
            .accessibilityIdentifier("screen.touch-probe")
        }
      }
      .background {
        if probesTouches { GalleryTouchProbe { touchReport = $0 } }
      }
  }

  private var stack: some View {
    NavigationStack(path: $path) {
      ScrollView {
        VStack(alignment: .leading, spacing: system.space.space200) {
          TanreiButton("Open Inbox", variant: .tonal) { path.append("inbox") }
          rows("Mailbox")
        }
        .padding(system.space.space200)
      }
      .safeAreaInset(edge: .top, spacing: .zero) {
        TanreiAppBar("Mail", actions: {
          TanreiIconButton("Close", action: close) { GalleryIcon(glyph: "close") }
        })
      }
      .tanreiAppBarScrollSource()
      .background(colors[.surface])
      .toolbar(.hidden, for: .navigationBar)
      .accessibilityElement(children: .contain)
      .accessibilityIdentifier("screen.mail")
      .navigationDestination(for: String.self) { _ in inbox }
    }
  }

  private var inbox: some View {
    ScrollView {
      rows("Message").padding(system.space.space200)
    }
    .safeAreaInset(edge: .top, spacing: .zero) {
      TanreiAppBar("Inbox", subtitle: "ada@example.com", size: .large) {
        TanreiIconButton("Back") {
          fire()
          path.removeLast()
        } icon: {
          GalleryIcon(glyph: "arrow_back")
        }
      } actions: {
        TanreiIconButton("Search", action: {}) { GalleryIcon(glyph: "search") }
      }
    }
    .tanreiAppBarScrollSource()
    .background(colors[.surface])
    .toolbar(.hidden, for: .navigationBar)
    .accessibilityElement(children: .contain)
    .accessibilityIdentifier("screen.inbox")
  }

  private func rows(_ name: String) -> some View {
    VStack(alignment: .leading, spacing: system.space.space200) {
      ForEach(1...40, id: \.self) { index in
        Text("\(name) \(index)")
          .tanreiTextStyle(system.typescale.body)
          .foregroundStyle(colors[.onSurface])
          .frame(maxWidth: .infinity, alignment: .leading)
      }
    }
  }
}
