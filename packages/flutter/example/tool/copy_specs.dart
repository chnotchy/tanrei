// Copies the repository's component specs (`specs/*.spec.json`) into `assets/specs/`, where the
// gallery bundles them from. Run it before `flutter run` or `flutter build web`:
//
//   dart run tool/copy_specs.dart
//
// The copies are gitignored: the files in `specs/` are the source of truth, and
// `test/gallery_test.dart` fails when a copy differs from its spec. The script only reads `specs/`
// and only writes (and prunes) `*.spec.json` inside `assets/specs/`.
import 'dart:io';

void main() {
  final Directory example = File.fromUri(Platform.script).parent.parent;
  final Directory specs = Directory.fromUri(example.uri.resolve('../../../specs/'));
  final Directory target = Directory.fromUri(example.uri.resolve('assets/specs/'))
    ..createSync(recursive: true);
  bool isSpec(FileSystemEntity entity) => entity is File && entity.path.endsWith('.spec.json');
  String name(FileSystemEntity entity) => entity.uri.pathSegments.last;

  final List<File> sources = specs.listSync(followLinks: false).where(isSpec).cast<File>().toList();
  final Set<String> names = <String>{for (final File file in sources) name(file)};
  for (final FileSystemEntity stale in target.listSync(followLinks: false).where(isSpec)) {
    if (!names.contains(name(stale))) {
      stale.deleteSync();
    }
  }
  for (final File source in sources) {
    source.copySync(target.uri.resolve(name(source)).toFilePath());
  }
  stdout.writeln('copied ${sources.length} spec(s) from ${specs.path} to ${target.path}');
}
