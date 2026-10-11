import os

@testable import Tanrei

/// Collects what `TanreiDiagnostics` reports while `body` runs, instead of the debug assertion.
/// Task-local, so tests that pass unknown keys on purpose do not affect each other.
struct Reports {
  let messages: [String]

  static func collecting<T>(_ body: () throws -> T) rethrows -> (value: T, reports: Reports) {
    let box = OSAllocatedUnfairLock(initialState: [String]())
    let value = try TanreiDiagnostics.$handler.withValue({ message in box.withLock { $0.append(message) } }) {
      try body()
    }
    return (value, Reports(messages: box.withLock { $0 }))
  }

  func mention(_ text: String) -> Bool { messages.contains { $0.contains(text) } }
}
