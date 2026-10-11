// The reference `lib/src/primitives/corner_shape.dart` was measured against: SwiftUI's
// RoundedRectangle(cornerRadius:style: .continuous), rasterized by CoreGraphics at 8× into an alpha mask.
//
//   swiftc -O packages/flutter/tool/continuous_corner_reference.swift -o /tmp/continuous_corner_reference
//   /tmp/continuous_corner_reference <output directory>
//
// It prints the covered area in logical px² per shape (macOS 26: 180×80 r20 continuous 14039.1,
// circular 14056.5; 60×36 capsule continuous 1873.5, circular 1881.8) and writes `<name>.a8` masks
// (1600 × 800 bytes, y down) that a Flutter test can diff against a path drawn with `canvas.scale(8)`.
// `test/primitives/corner_shape_test.dart` asserts the areas.
//
// With a second argument `--elements` it also prints the elements of each continuous path (in the box's own
// coordinates, y down). That is how the construction of a corner WITHOUT room was read: SwiftUI treats the
// two sides of a corner separately. A side with 1.52866 radii of room is drawn in full; on a side with less, only
// the outer cubic changes — it starts where the room ends and its two controls move linearly towards 0.96 and 0.82
// radii from the corner, which they reach when the room is exactly one radius (a pill's short side: 180×40 at
// radius 20 starts at 20, controls at 19.2 and 16.4). The middle of the corner never changes.
import CoreGraphics
import Foundation
import SwiftUI

let scale = 8
let width = 200 * scale
let height = 100 * scale

func raster(_ path: CGPath, _ name: String) {
  var data = [UInt8](repeating: 0, count: width * height)
  let context = CGContext(
    data: &data, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width,
    space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGImageAlphaInfo.alphaOnly.rawValue)!
  context.translateBy(x: 0, y: CGFloat(height))
  context.scaleBy(x: CGFloat(scale), y: -CGFloat(scale))
  context.addPath(path)
  context.fillPath()
  FileManager.default.createFile(atPath: CommandLine.arguments[1] + "/" + name + ".a8", contents: Data(data))
  let area = data.reduce(0.0) { $0 + Double($1) / 255 } / Double(scale * scale)
  print(name, area)
}

func elements(_ path: CGPath, _ name: String) {
  print("elements", name)
  path.applyWithBlock { e in
    let p = e.pointee.points
    switch e.pointee.type {
    case .moveToPoint: print(String(format: "  M %.4f %.4f", p[0].x, p[0].y))
    case .addLineToPoint: print(String(format: "  L %.4f %.4f", p[0].x, p[0].y))
    case .addQuadCurveToPoint: print(String(format: "  Q %.4f %.4f %.4f %.4f", p[0].x, p[0].y, p[1].x, p[1].y))
    case .addCurveToPoint:
      print(String(format: "  C %.4f %.4f %.4f %.4f %.4f %.4f", p[0].x, p[0].y, p[1].x, p[1].y, p[2].x, p[2].y))
    case .closeSubpath: print("  Z")
    @unknown default: print("  ?")
    }
  }
}

for (w, h, r) in [(180.0, 80.0, 20.0), (180.0, 80.0, 10.0), (180.0, 36.0, 10.0), (180.0, 36.0, 18.0), (60.0, 36.0, 9999.0),
  (180.0, 40.0, 20.0), (180.0, 40.0, 16.0), (40.0, 40.0, 20.0),
] {
  let rect = CGRect(x: 10, y: 10, width: w, height: h)
  let name = "\(Int(w))x\(Int(h))-r\(Int(r))"
  raster(RoundedRectangle(cornerRadius: r, style: .continuous).path(in: rect).cgPath, "apple-continuous-" + name)
  raster(RoundedRectangle(cornerRadius: r, style: .circular).path(in: rect).cgPath, "apple-circular-" + name)
  if CommandLine.arguments.contains("--elements") {
    let own = CGRect(x: 0, y: 0, width: w, height: h)
    elements(RoundedRectangle(cornerRadius: r, style: .continuous).path(in: own).cgPath, name)
  }
}
