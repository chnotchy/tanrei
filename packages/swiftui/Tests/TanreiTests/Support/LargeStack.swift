import Foundation
import os

/// Runs `body` on a thread with a large stack and waits for it: a debug build gives
/// every temporary copy of a whole `TanreiSystem` its own stack slot, and Swift Testing computes `arguments:` on a
/// cooperative thread whose 512 KB stack does not hold a few of them. For argument lists that read shipped systems.
enum LargeStack {
  static let size = 64 << 20

  static func run<T: Sendable>(_ body: @escaping @Sendable () -> T) -> T {
    let result = OSAllocatedUnfairLock<T?>(initialState: nil)
    let done = DispatchSemaphore(value: 0)
    let thread = Thread {
      let value = body()
      result.withLock { $0 = value }
      done.signal()
    }
    thread.stackSize = size
    thread.start()
    done.wait()
    return result.withLock { $0! }
  }
}
