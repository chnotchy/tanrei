import CoreGraphics
import Foundation
import ImageIO
import SwiftUI
import Testing
import UniformTypeIdentifiers

@testable import Tanrei

/// An RGBA8 sRGB bitmap: the one pixel format baselines are stored and compared in.
struct Bitmap {
  let width: Int
  let height: Int
  var pixels: [UInt8]

  struct RGBA: Equatable {
    var r: UInt8, g: UInt8, b: UInt8, a: UInt8
  }

  init(width: Int, height: Int, pixels: [UInt8]) {
    self.width = width
    self.height = height
    self.pixels = pixels
  }

  init?(_ image: CGImage) {
    width = image.width
    height = image.height
    pixels = [UInt8](repeating: 0, count: width * height * 4)
    guard let space = CGColorSpace(name: CGColorSpace.sRGB) else { return nil }
    let ok = pixels.withUnsafeMutableBytes { buffer -> Bool in
      guard
        let context = CGContext(
          data: buffer.baseAddress, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4,
          space: space, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
      else { return false }
      context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
      return true
    }
    if !ok { return nil }
  }

  /// Pixel at device-pixel coordinates, origin top-left.
  subscript(x: Int, y: Int) -> RGBA {
    let i = (y * width + x) * 4
    return RGBA(r: pixels[i], g: pixels[i + 1], b: pixels[i + 2], a: pixels[i + 3])
  }

  var cgImage: CGImage? {
    guard let space = CGColorSpace(name: CGColorSpace.sRGB),
      let provider = CGDataProvider(data: Data(pixels) as CFData)
    else { return nil }
    return CGImage(
      width: width, height: height, bitsPerComponent: 8, bitsPerPixel: 32, bytesPerRow: width * 4, space: space,
      bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue), provider: provider,
      decode: nil, shouldInterpolate: false, intent: .defaultIntent)
  }

  func writePNG(to url: URL) throws {
    try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
    guard let image = cgImage,
      let destination = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil)
    else { throw SnapshotError.encode(url) }
    CGImageDestinationAddImage(destination, image, nil)
    guard CGImageDestinationFinalize(destination) else { throw SnapshotError.encode(url) }
  }

  static func readPNG(at url: URL) -> Bitmap? {
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
    else { return nil }
    return Bitmap(image)
  }

  /// Fraction of pixels in which any channel differs by more than `channelTolerance`.
  func mismatch(against other: Bitmap, channelTolerance: Int) -> Double {
    guard width == other.width, height == other.height else { return 1 }
    var different = 0
    for p in stride(from: 0, to: pixels.count, by: 4) {
      for c in 0..<4 where abs(Int(pixels[p + c]) - Int(other.pixels[p + c])) > channelTolerance {
        different += 1
        break
      }
    }
    return Double(different) / Double(width * height)
  }
}

enum SnapshotError: Error {
  case render
  case encode(URL)
}

/// Minimal snapshot testing on top of `ImageRenderer`.
///
/// Baselines live at `__Snapshots__/<suite>/<name>.png` next to the test sources — the
/// paths `packages/tools/src/conventions.js` requires. Baselines of another design system are
/// named `<system-id>/<fixture-id>` and so live in a subdirectory of the suite. Recording is deliberate: it only
/// happens with `TANREI_RECORD_SNAPSHOTS=1`, never because a comparison failed.
@MainActor
enum Snapshot {
  static let scale: CGFloat = 2
  /// Per-channel slack for antialiasing noise, and the share of pixels allowed to exceed it.
  static let channelTolerance = 3
  static let allowedMismatch = 0.001

  static var isRecording: Bool {
    ProcessInfo.processInfo.environment["TANREI_RECORD_SNAPSHOTS"] == "1"
  }

  /// Why baselines are being recorded (`TANREI_SNAPSHOT_REASON`). Recording without a reason is refused:
  /// a baseline changes only as the intended result of a spec or token change, and the run says which.
  static var recordingReason: String? {
    let reason = ProcessInfo.processInfo.environment["TANREI_SNAPSHOT_REASON"]?.trimmingCharacters(in: .whitespacesAndNewlines)
    return reason?.isEmpty == false ? reason : nil
  }

  /// The fixed environment every baseline is rendered in: light scheme, standard contrast,
  /// system font (so an installed Inter does not change baselines), `surface` background.
  static let theme = TanreiTheme(appearance: .light, contrast: .standard, fontFamilyPolicy: .system)

  /// The padding around every render. A fixture constant of the default system, so a test
  /// that renders with a modified system keeps the same geometry.
  static let inset = TanreiSystem.tanrei.space.space200

  /// The view in the fixed snapshot environment.
  private static func hosted(_ view: some View, theme: TanreiTheme) -> some View {
    let colors = theme.colors(systemScheme: .light, systemContrast: .standard)
    return view
      .padding(inset)
      .background(colors[.surface])
      .tanreiTheme(theme)
      .environment(\.locale, Locale(identifier: "en_US"))
      .environment(\.layoutDirection, .leftToRight)
      .environment(\.dynamicTypeSize, .large)
      // `ImageRenderer` draws a `ScrollView` as nothing on macOS: scrolling regions draw their content at rest instead.
      .environment(\.tanreiScrollsInPlace, true)
  }

  /// What baselines are recorded and compared with, and what colors and geometry are sampled from.
  ///
  /// NOT bit-stable: `ImageRenderer.cgImage` rasterizes through the OS
  /// renderer, which returns one of TWO rasterizations of the same view depending on its internal cache
  /// state — measured: the first two renders of a view agree, from the third on 7–13 antialiased pixels
  /// (glyph edges, shadow falloff) differ by exactly 1/255, idle or loaded, and only for some content.
  /// Which one a test sees depends on what ran before it, so under load (another test order) a
  /// zero-tolerance comparison of two such renders failed now and then. Everything compared with
  /// `channelTolerance` absorbs that ±1; a test that needs IDENTITY uses `renderExact`.
  static func render(_ view: some View, theme: TanreiTheme = Snapshot.theme) throws -> Bitmap {
    let renderer = ImageRenderer(content: hosted(view, theme: theme))
    renderer.scale = scale
    renderer.isOpaque = true
    guard let image = renderer.cgImage, let bitmap = Bitmap(image) else { throw SnapshotError.render }
    return bitmap
  }

  /// A bit-stable render, for tests that assert two views draw IDENTICALLY (zero tolerance): the same
  /// SwiftUI display list, replayed into a bitmap context of our own, so CoreGraphics rasterizes it
  /// directly and no renderer cache is involved. Measured bit-identical over hundreds of repeats, idle
  /// and under CPU load. Its pixels differ slightly from `render`'s (another rasterizer), so it is never
  /// compared with a baseline or with a `render` result.
  static func renderExact(_ view: some View, theme: TanreiTheme = Snapshot.theme) throws -> Bitmap {
    let renderer = ImageRenderer(content: hosted(view, theme: theme))
    var result: Bitmap?
    renderer.render(rasterizationScale: scale) { size, draw in
      let width = Int((size.width * scale).rounded(.up))
      let height = Int((size.height * scale).rounded(.up))
      var pixels = [UInt8](repeating: 0, count: width * height * 4)
      let drawn = pixels.withUnsafeMutableBytes { buffer -> Bool in
        guard
          let space = CGColorSpace(name: CGColorSpace.sRGB),
          let context = CGContext(
            data: buffer.baseAddress, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4,
            space: space, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
        else { return false }
        context.scaleBy(x: scale, y: scale)
        draw(context)
        return true
      }
      if drawn { result = Bitmap(width: width, height: height, pixels: pixels) }
    }
    guard let result else { throw SnapshotError.render }
    return result
  }

  static func baselineURL(suite: String, name: String, filePath: String) -> URL {
    // …/Tests/TanreiTests/<file>.swift → …/Tests/TanreiTests/__Snapshots__/<suite>/<name>.png
    URL(fileURLWithPath: filePath)
      .deletingLastPathComponent()
      .appendingPathComponent("__Snapshots__")
      .appendingPathComponent(suite)
      .appendingPathComponent("\(name).png")
  }

  static func assert(
    _ view: some View,
    named name: String,
    suite: String,
    theme: TanreiTheme = Snapshot.theme,
    filePath: String = #filePath,
    sourceLocation: SourceLocation = #_sourceLocation
  ) throws {
    let actual = try render(view, theme: theme)
    let url = baselineURL(suite: suite, name: name, filePath: filePath)

    if isRecording {
      // Leave a baseline that still matches untouched, so a recording run only rewrites
      // the files whose pixels really changed.
      if let baseline = Bitmap.readPNG(at: url),
        actual.mismatch(against: baseline, channelTolerance: channelTolerance) <= allowedMismatch
      {
        return
      }
      guard let reason = recordingReason else {
        Issue.record(
          "Snapshot \(suite)/\(name) differs and TANREI_RECORD_SNAPSHOTS=1 is set, but TANREI_SNAPSHOT_REASON is empty. Say why the baseline changes.",
          sourceLocation: sourceLocation)
        return
      }
      try actual.writePNG(to: url)
      print("Recorded snapshot \(suite)/\(name).png (\(actual.width)×\(actual.height)) — reason: \(reason)")
      return
    }
    guard let baseline = Bitmap.readPNG(at: url) else {
      Issue.record(
        "No baseline at \(url.path). Record deliberately with TANREI_RECORD_SNAPSHOTS=1 swift test.",
        sourceLocation: sourceLocation)
      return
    }
    let mismatch = actual.mismatch(against: baseline, channelTolerance: channelTolerance)
    if mismatch > allowedMismatch {
      let failures = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("tanrei-snapshot-failures")
      let actualURL = failures.appendingPathComponent(suite).appendingPathComponent("\(name).actual.png")
      try? actual.writePNG(to: actualURL)
      Issue.record(
        """
        Snapshot \(suite)/\(name) differs from its baseline \
        (\(actual.width)×\(actual.height) vs \(baseline.width)×\(baseline.height), \
        \(String(format: "%.3f", mismatch * 100))% of pixels). Actual image: \(actualURL.path). \
        A diff is a finding — do not re-record unless the change is intended.
        """,
        sourceLocation: sourceLocation)
    }
  }
}

extension Color {
  /// The 8-bit sRGB components of a token color composited over an opaque backdrop.
  @MainActor
  func rgba8(over backdrop: Color? = nil) -> Bitmap.RGBA {
    let top = resolve(in: EnvironmentValues())
    var r = Double(top.red), g = Double(top.green), b = Double(top.blue)
    let a = Double(top.opacity)
    if let backdrop {
      let under = backdrop.resolve(in: EnvironmentValues())
      r = r * a + Double(under.red) * (1 - a)
      g = g * a + Double(under.green) * (1 - a)
      b = b * a + Double(under.blue) * (1 - a)
    }
    func byte(_ v: Double) -> UInt8 { UInt8((min(max(v, 0), 1) * 255).rounded()) }
    return Bitmap.RGBA(r: byte(r), g: byte(g), b: byte(b), a: 255)
  }
}

extension Bitmap.RGBA {
  func isClose(to other: Bitmap.RGBA, tolerance: Int = 3) -> Bool {
    abs(Int(r) - Int(other.r)) <= tolerance && abs(Int(g) - Int(other.g)) <= tolerance
      && abs(Int(b) - Int(other.b)) <= tolerance
  }
}
