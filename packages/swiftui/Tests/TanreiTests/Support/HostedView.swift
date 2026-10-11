#if os(macOS)
import AppKit
import SwiftUI

/// Hosts a SwiftUI view in an off-screen AppKit window so tests can drive it with real
/// mouse events. The window is placed far off-screen.
///
/// SwiftUI builds its macOS accessibility tree only once an assistive client attaches, so
/// that tree cannot be read from a unit test; accessibility semantics are inherited from
/// SwiftUI's `Button` and checked by review, not here.
/// A borderless window that can still become key, so that a text field in it can take keyboard focus.
private final class HostedWindow: NSWindow {
  override var canBecomeKey: Bool { true }
}

@MainActor
final class HostedView<Content: View> {
  private let window: NSWindow
  private let host: NSHostingView<Content>
  let size: CGSize

  init(_ content: Content) {
    _ = NSApplication.shared
    host = NSHostingView(rootView: content)
    size = host.fittingSize
    window = HostedWindow(
      contentRect: CGRect(origin: CGPoint(x: -10_000, y: -10_000), size: size),
      styleMask: [.borderless], backing: .buffered, defer: false)
    window.isReleasedWhenClosed = false
    window.contentView = host
    host.frame = CGRect(origin: .zero, size: size)
    // SwiftUI ignores mouse events in a window that was never ordered in.
    window.orderFrontRegardless()
    host.layoutSubtreeIfNeeded()
    settle()
  }

  /// Takes the hosting view out of the window before closing it: that makes SwiftUI end the view's life (its `onDisappear`)
  /// now. A closed window alone leaves it to a later pass of the run loop, so what a hosted view registered app-wide — a
  /// modal sheet counted in `TanreiModalCoordinator.shared` — outlived its test and was taken away inside the next one.
  deinit {
    MainActor.assumeIsolated {
      window.contentView = nil
      window.close()
    }
  }

  /// Lets SwiftUI process pending updates and gesture callbacks.
  func settle(_ interval: TimeInterval = 0.05) {
    RunLoop.main.run(until: Date().addingTimeInterval(interval))
  }

  /// What the hosted view shows right now, at 1×. For reading a color while an interaction is in
  /// flight (a held press), which `ImageRenderer` cannot show: it renders a view, not this window.
  func bitmap() -> Bitmap? {
    host.layoutSubtreeIfNeeded()
    guard let rep = host.bitmapImageRepForCachingDisplay(in: host.bounds) else { return nil }
    host.cacheDisplay(in: host.bounds, to: rep)
    return rep.cgImage.flatMap { Bitmap($0) }
  }

  /// The color at `point` (points from the top-left), whatever scale the window is backed with.
  func color(at point: CGPoint) -> Bitmap.RGBA? {
    guard let bitmap = bitmap() else { return nil }
    let scale = CGFloat(bitmap.width) / size.width
    return bitmap[min(bitmap.width - 1, Int(point.x * scale)), min(bitmap.height - 1, Int(point.y * scale))]
  }

  /// Press and release as separate steps, for tests that look at the pressed state in between.
  func mouse(_ type: NSEvent.EventType, at point: CGPoint) {
    let location = CGPoint(x: point.x, y: size.height - point.y)
    guard
      let event = NSEvent.mouseEvent(
        with: type, location: location, modifierFlags: [], timestamp: ProcessInfo.processInfo.systemUptime,
        windowNumber: window.windowNumber, context: nil, eventNumber: 0, clickCount: 1,
        pressure: type == .leftMouseDown ? 1 : 0)
    else { return }
    window.sendEvent(event)
  }

  /// Moves the pointer to `point` (points from the top-left): what hover and the point of contact under `ripple` read on
  /// macOS. An off-screen window gets no tracking-area events from the window server, so the hosting view is handed the
  /// pointer's entry and move directly.
  func hover(at point: CGPoint) {
    window.acceptsMouseMovedEvents = true
    let location = CGPoint(x: point.x, y: size.height - point.y)
    guard
      let event = NSEvent.mouseEvent(
        with: .mouseMoved, location: location, modifierFlags: [], timestamp: ProcessInfo.processInfo.systemUptime,
        windowNumber: window.windowNumber, context: nil, eventNumber: 0, clickCount: 0, pressure: 0)
    else { return }
    window.makeFirstResponder(host)
    host.mouseEntered(with: event)
    host.mouseMoved(with: event)
    window.sendEvent(event)
    settle()
  }

  /// Moves the pointer out of the hosted view altogether (to `point`, outside it): what ends every hover in it. Moving
  /// within the view to a place where nothing is does not end a hover of an off-screen window (the tooltip's hosted test
  /// found it), so a test that needs the pointer to leave something leaves the whole view.
  func leave(to point: CGPoint = CGPoint(x: -1, y: -1)) {
    let location = CGPoint(x: point.x, y: size.height - point.y)
    guard
      let event = NSEvent.mouseEvent(
        with: .mouseMoved, location: location, modifierFlags: [], timestamp: ProcessInfo.processInfo.systemUptime,
        windowNumber: window.windowNumber, context: nil, eventNumber: 0, clickCount: 0, pressure: 0)
    else { return }
    host.mouseMoved(with: event)
    host.mouseExited(with: event)
    settle()
  }

  /// Types `characters` into whatever has keyboard focus: one key-down and key-up per character (`keyCode` 36 for Return).
  /// `together: true` sends every key before the run loop turns, and settles once after the last: keys that arrive
  /// between two updates of the view, as they do on a loaded machine (GitHub's runner typed "ab" into one update).
  func type(_ characters: String, keyCode: UInt16 = 0, together: Bool = false) {
    for character in characters {
      for type in [NSEvent.EventType.keyDown, .keyUp] {
        guard
          let event = NSEvent.keyEvent(
            with: type, location: .zero, modifierFlags: [], timestamp: ProcessInfo.processInfo.systemUptime,
            windowNumber: window.windowNumber, context: nil, characters: String(character), charactersIgnoringModifiers: String(character),
            isARepeat: false, keyCode: keyCode)
        else { continue }
        window.sendEvent(event)
      }
      if !together { settle() }
    }
    if together { settle() }
  }

  /// Waits, letting the main actor run, until `condition` holds or `timeout` seconds have passed; returns whether it held.
  /// For the end of something scheduled (a press hold) on a loaded machine: the end is checked, not the exact moment.
  func wait(atMost timeout: TimeInterval, until condition: () -> Bool) async -> Bool {
    let deadline = Date().addingTimeInterval(timeout)
    while Date() < deadline {
      settle()
      if condition() { return true }
      try? await Task.sleep(for: .milliseconds(100))
    }
    settle()
    return condition()
  }

  /// Gives keyboard focus to the first AppKit text field in the hosted view — what a click into it does, without the
  /// field's mouse tracking. Returns whether there was one.
  @discardableResult
  func focusTextField() -> Bool {
    func find(_ view: NSView) -> NSTextField? {
      if let field = view as? NSTextField, field.isEditable { return field }
      for subview in view.subviews { if let field = find(subview) { return field } }
      return nil
    }
    guard let field = find(host) else { return false }
    let focused = window.makeFirstResponder(field)
    settle()
    return focused
  }

  /// Scrolls the first AppKit scroll view in the hosted view (what a SwiftUI `ScrollView` is on macOS) so that `y` points of
  /// its document lie above its visible top — what a person's scroll does, through AppKit. Returns whether there was one.
  @discardableResult
  func scroll(toY y: CGFloat) -> Bool {
    func find(_ view: NSView) -> NSScrollView? {
      if let scroll = view as? NSScrollView { return scroll }
      for subview in view.subviews { if let scroll = find(subview) { return scroll } }
      return nil
    }
    guard let scroll = find(host) else { return false }
    let clip = scroll.contentView
    let top = clip.isFlipped ? -scroll.contentInsets.top : .zero
    clip.scroll(to: NSPoint(x: clip.bounds.minX, y: top + y))
    scroll.reflectScrolledClipView(clip)
    settle()
    return true
  }

  /// Scrolls the first AppKit scroll view in the hosted view sideways so that `x` points of its document lie left of its
  /// visible left edge — a horizontal `ScrollView` scrolled by a person, through AppKit. Returns whether there was one.
  @discardableResult
  func scroll(toX x: CGFloat) -> Bool {
    func find(_ view: NSView) -> NSScrollView? {
      if let scroll = view as? NSScrollView { return scroll }
      for subview in view.subviews { if let scroll = find(subview) { return scroll } }
      return nil
    }
    guard let scroll = find(host) else { return false }
    let clip = scroll.contentView
    clip.scroll(to: NSPoint(x: x - scroll.contentInsets.left, y: clip.bounds.minY))
    scroll.reflectScrolledClipView(clip)
    settle()
    return true
  }

  /// The visible left edge of the first AppKit scroll view in the hosted view, in its document: how far it is scrolled
  /// sideways. `nil` without one.
  func scrolledX() -> CGFloat? {
    func find(_ view: NSView) -> NSScrollView? {
      if let scroll = view as? NSScrollView { return scroll }
      for subview in view.subviews { if let scroll = find(subview) { return scroll } }
      return nil
    }
    guard let scroll = find(host) else { return nil }
    return scroll.contentView.bounds.minX + scroll.contentInsets.left
  }

  /// Makes the window key, so that a click can give a text field keyboard focus.
  func makeKey() {
    window.makeKey()
    settle()
  }

  /// A left click at `point`, given in points from the top-left of the hosted view.
  func click(at point: CGPoint) {
    let location = CGPoint(x: point.x, y: size.height - point.y)
    for type in [NSEvent.EventType.leftMouseDown, .leftMouseUp] {
      guard
        let event = NSEvent.mouseEvent(
          with: type, location: location, modifierFlags: [], timestamp: ProcessInfo.processInfo.systemUptime,
          windowNumber: window.windowNumber, context: nil, eventNumber: 0, clickCount: 1,
          pressure: type == .leftMouseDown ? 1 : 0)
      else { continue }
      window.sendEvent(event)
      settle()
    }
  }
}
#endif
