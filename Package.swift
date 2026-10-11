// swift-tools-version: 6.0
// The manifest lives at the repository root because SwiftPM resolves git-URL
// dependencies from there. All sources live in packages/swiftui/.
import PackageDescription

let package = Package(
  name: "Tanrei",
  platforms: [.iOS(.v17), .macOS(.v14)],
  products: [
    .library(name: "Tanrei", targets: ["Tanrei"])
  ],
  targets: [
    .target(
      name: "Tanrei",
      path: "packages/swiftui/Sources/Tanrei"
    ),
    // Test-only, not a product: a design system that EXTENDS the vocabulary, generated the way
    // a product generates its system and compiled as its own module, so it sees only Tanrei's public API.
    // Regenerate with `node packages/swiftui/scripts/generate-acme-fixture.mjs`.
    .target(
      name: "AcmeFixture",
      dependencies: ["Tanrei"],
      path: "packages/swiftui/Tests/AcmeFixture"
    ),
    .testTarget(
      name: "TanreiTests",
      dependencies: ["Tanrei", "AcmeFixture"],
      path: "packages/swiftui/Tests/TanreiTests",
      exclude: ["__Snapshots__"]
    ),
  ],
  swiftLanguageModes: [.v6]
)
