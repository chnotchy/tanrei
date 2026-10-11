import Foundation

/// Where Tanrei reports a programming error it recovers from: a color role, a component size or
/// variant, or a series step that the current design system does not have (BTN-7).
///
/// The lookup always returns a usable value (the default value's tokens). The report exists in
/// debug builds only; release builds compile it out and never evaluate the message.
public enum TanreiDiagnostics {
  /// Receives the reports of the current task instead of `assertionFailure`. Task-local, so a test
  /// that passes an unknown key on purpose can collect what is reported without affecting others:
  ///
  ///     TanreiDiagnostics.$handler.withValue({ reports.append($0) }) { … }
  @TaskLocal public static var handler: (@Sendable (String) -> Void)?

  /// Reports `message` in debug builds: to `handler` when one is set, else as an `assertionFailure`.
  public static func report(_ message: @autoclosure () -> String) {
    #if DEBUG
    if let handler {
      handler(message())
    } else {
      assertionFailure(message())
    }
    #endif
  }
}
