import 'dart:convert';
import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tanrei/systems/cupertino.dart';
import 'package:tanrei/systems/m3_like.dart';
import 'package:tanrei/tanrei.dart';
import 'package:tanrei_example/main.dart';

/// The repository's specs, read in place (read-only): the gallery shows exactly these.
final Directory _specsDirectory = Directory('../../../specs');

List<File> _specFiles() =>
    _specsDirectory
        .listSync(followLinks: false)
        .whereType<File>()
        .where((File file) => file.path.endsWith('.spec.json'))
        .toList()
      ..sort((File a, File b) => a.path.compareTo(b.path));

Map<String, Object?> _json(File file) =>
    jsonDecode(file.readAsStringSync()) as Map<String, Object?>;

List<GallerySpec> _specs() => <GallerySpec>[
  for (final File file in _specFiles()) GallerySpec.fromJson(_json(file)),
];

/// Lets the controls finish their state transitions. Not `pumpAndSettle`: the gallery shows
/// indeterminate progress and loading indicators, which animate for as long as they are shown.
Future<void> settle(WidgetTester tester) async {
  for (int i = 0; i < 5; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

void main() {
  test(
    'every spec implemented on Flutter has exactly one gallery entry, and every entry a spec',
    () {
      final Map<String, String> status = <String, String>{
        for (final File file in _specFiles())
          _json(file)['name']! as String:
              ((_json(file)['platforms']! as Map<String, Object?>)['flutter']
                      as Map<String, Object?>?)?['status']
                  as String? ??
              'planned',
      };
      expect(status, isNotEmpty);
      for (final MapEntry<String, String> spec in status.entries) {
        if (spec.value != 'planned') {
          expect(galleryComponents, contains(spec.key), reason: '${spec.key} is ${spec.value}');
        }
      }
      for (final String component in galleryComponents.keys) {
        expect(status, contains(component), reason: 'gallery entry without a spec');
      }
    },
  );

  test('a fixture reads its props over the defaults of its spec', () {
    final GallerySpec button = _specs().singleWhere((GallerySpec s) => s.name == 'button');
    final Map<String, Object?> json = _json(File('../../../specs/button.spec.json'));
    final List<Map<String, Object?>> fixtures = (json['fixtures']! as List<Object?>)
        .cast<Map<String, Object?>>();
    expect(button.fixtures.map((GalleryFixture f) => f.id), fixtures.map((f) => f['id']));
    for (final (int index, Map<String, Object?> fixture) in fixtures.indexed) {
      final Map<String, Object?> props = fixture['props']! as Map<String, Object?>;
      final GalleryFixture mine = button.fixtures[index];
      expect(mine.component, 'button');
      expect(mine.string('variant'), props['variant'] ?? 'filled', reason: mine.id);
      expect(mine.string('size'), props['size'] ?? 'medium', reason: mine.id);
      expect(mine.boolean('disabled'), props['disabled'] ?? false, reason: mine.id);
      expect(mine.content, fixture['content'], reason: mine.id);
    }
  });

  test('a fixture\'s items read their props over the defaults of their kind', () {
    final GallerySpec list = _specs().singleWhere((GallerySpec s) => s.name == 'list');
    final GalleryFixture single = list.fixtures.singleWhere(
      (GalleryFixture f) => f.id == 'single-selected',
    );
    expect(single.string('selection'), 'single');
    expect(single.props['value'], 'light');
    expect(single.items.map((GalleryItem i) => i.kind), everyElement('list-item'));
    expect(single.items.map((GalleryItem i) => i.string('headline')), <String>[
      'Light',
      'Dark',
      'Match the system',
    ]);
    // Declared by the kind, absent from the fixture: the kind's default.
    expect(single.items.first.boolean('interactive'), isFalse);
    expect(single.items.first.integer('supportingMaxLines'), 0);
    expect(single.items.first.string('leadingMedia'), 'none');
    final GalleryFixture multiple = list.fixtures.singleWhere(
      (GalleryFixture f) => f.id == 'multiple-selected',
    );
    expect(multiple.strings('values'), <String>['bug', 'docs']);
  });

  test('a fixture fills slots as the slot declares', () {
    final GallerySpec dialog = _specs().singleWhere((GallerySpec s) => s.name == 'dialog');
    final GalleryFixture icon = dialog.fixtures.singleWhere((GalleryFixture f) => f.id == 'icon');
    expect(icon.slots, <String, List<String>>{
      'icon': <String>['delete'],
      'actions': <String>['Cancel', 'Delete'],
    });
    expect(icon.slotKinds, <String, String>{'icon': 'glyph', 'actions': 'button'});
    final List<Widget> actions = icon.slot('actions');
    expect(actions, hasLength(2));
    expect(actions.every((Widget w) => w is TanreiButton), isTrue);
    expect(
      actions.map((Widget w) => (w as TanreiButton).variant),
      everyElement(TanreiButtonVariant.text),
    );
    expect(icon.slot('icon').single, isA<Text>());
    final GalleryFixture basic = dialog.fixtures.singleWhere((GalleryFixture f) => f.id == 'basic');
    expect(basic.slot('actions'), isEmpty);
  });

  testWidgets(
    'the bundled specs, when tool/copy_specs.dart made them, are the specs byte for byte',
    (WidgetTester tester) async {
      final AssetManifest manifest = await AssetManifest.loadFromAssetBundle(rootBundle);
      final List<String> bundled = manifest
          .listAssets()
          .where((String key) => key.startsWith(gallerySpecsDirectory))
          .where((String key) => key.endsWith('.spec.json'))
          .toList();
      for (final String key in bundled) {
        final File spec = File('../../../specs/${key.substring(gallerySpecsDirectory.length)}');
        expect(spec.existsSync(), isTrue, reason: '$key has no spec: run tool/copy_specs.dart');
        final ByteData data = await rootBundle.load(key);
        expect(
          data.buffer.asUint8List(data.offsetInBytes, data.lengthInBytes),
          spec.readAsBytesSync(),
          reason: '$key is stale: run tool/copy_specs.dart',
        );
      }
      // Without copies the gallery loads nothing (and says so); a CI build needs none.
      final List<GallerySpec> loaded = await loadGallerySpecs(rootBundle);
      expect(loaded.map((GallerySpec s) => s.name), hasLength(bundled.length));
    },
  );

  test('a system font stack: the gallery says what Flutter web really draws (Roboto), and names '
      'the platform font elsewhere', () {
    expect(cupertinoSystem.typefaces.plain.system, isTrue);
    expect(galleryFontNote(cupertinoSystem, web: false), 'font: the platform font');
    expect(
      galleryFontNote(cupertinoSystem, web: true),
      allOf(contains('Flutter web cannot read'), contains('Roboto'), contains('"Inter"')),
    );
    // A named family is what it is on every target.
    expect(galleryFontNote(tanreiSystem, web: true), 'font: Inter');
    expect(galleryFontNote(m3LikeSystem, web: false), 'font: Roboto');
  });

  testWidgets('shows every fixture under every shipped system, and the switches re-theme them', (
    WidgetTester tester,
  ) async {
    tester.view.physicalSize = const Size(1200, 2400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    // A split button fixture cannot fill the menu slot (SPB-15's note), so its empty menu is
    // reported (SPB-20), as the spec asks; every other report still fails the test.
    final TanreiIgnoredValueReporter report = debugTanreiReportIgnoredValue;
    debugTanreiReportIgnoredValue = (String component, String prop, String why, Widget widget) {
      if (component != 'split-button' || prop != 'menuChildren') {
        report(component, prop, why, widget);
      }
    };
    addTearDown(() => debugTanreiReportIgnoredValue = report);
    final List<GallerySpec> specs = _specs();
    await tester.pumpWidget(GalleryApp(specs: specs));
    expect(tester.takeException(), isNull);

    expect(gallerySystems.map((TanreiSystem s) => s.id), <String>[
      'tanrei',
      'm3-like',
      'm3-expressive-like',
      'cupertino',
    ]);
    // The gallery shows the specs it has an entry for; a spec still `planned` on Flutter has none
    // (the first test holds every implemented spec to having one).
    final List<GallerySpec> shown = specs
        .where((GallerySpec spec) => galleryComponents.containsKey(spec.name))
        .toList();
    expect(
      shown.map((GallerySpec s) => s.name),
      containsAll(<String>[
        'button',
        'icon-button',
        'divider',
        'badge',
        'progress-indicator',
        'loading-indicator',
        'checkbox',
        'radio-button',
        'switch',
        'card',
        'text-field',
        'list',
        'menu',
      ]),
    );
    for (final TanreiSystem system in gallerySystems) {
      for (final GallerySpec spec in specs) {
        if (!galleryComponents.containsKey(spec.name)) {
          expect(
            find.byKey(ValueKey<String>(galleryKey(system, spec.fixtures.first))),
            findsNothing,
            reason: '${spec.name} has no gallery entry',
          );
          continue;
        }
        for (final GalleryFixture fixture in spec.fixtures) {
          final Finder entry = find.byKey(ValueKey<String>(galleryKey(system, fixture)));
          expect(entry, findsOneWidget, reason: galleryKey(system, fixture));
          expect(TanreiTheme.of(tester.element(entry)).system, same(system));
          if (spec.name == 'button') {
            final TanreiButton button = tester.widget(
              find.descendant(of: entry, matching: find.byType(TanreiButton)),
            );
            expect(button.enabled, !fixture.boolean('disabled'));
            expect(button.variant.name, fixture.string('variant'));
            expect(button.size.name, fixture.string('size'));
          }
          if (spec.name == 'icon-button') {
            final TanreiIconButton button = tester.widget(
              find.descendant(of: entry, matching: find.byType(TanreiIconButton)),
            );
            expect(button.enabled, !fixture.boolean('disabled'));
            expect(
              button.isSelected,
              fixture.boolean('toggle') ? fixture.boolean('selected') : null,
              reason: fixture.id,
            );
            expect(button.variant.name, fixture.string('variant'));
            expect(button.size.name, fixture.string('size'));
            expect(button.semanticLabel, fixture.string('label'));
          }
          if (spec.name == 'fab') {
            final TanreiFloatingActionButton button = tester.widget(
              find.descendant(of: entry, matching: find.byType(TanreiFloatingActionButton)),
            );
            expect(button.enabled, !fixture.boolean('disabled'), reason: fixture.id);
            expect(button.variant.name, fixture.string('variant'), reason: fixture.id);
            expect(button.size.name, fixture.string('size'), reason: fixture.id);
            expect(button.semanticLabel, fixture.string('label'), reason: fixture.id);
          }
          if (spec.name == 'extended-fab') {
            final TanreiExtendedFloatingActionButton button = tester.widget(
              find.descendant(of: entry, matching: find.byType(TanreiExtendedFloatingActionButton)),
            );
            expect(button.enabled, !fixture.boolean('disabled'), reason: fixture.id);
            expect(button.isExtended, fixture.boolean('expanded'), reason: fixture.id);
            expect(button.icon != null, fixture.content != null, reason: fixture.id);
            expect(button.variant.name, fixture.string('variant'), reason: fixture.id);
            expect(button.size.name, fixture.string('size'), reason: fixture.id);
            expect(button.label, fixture.string('label'), reason: fixture.id);
          }
          if (spec.name == 'chip') {
            final TanreiChip chip = tester.widget(
              find.descendant(of: entry, matching: find.byType(TanreiChip)),
            );
            expect(chip.kind.name, fixture.string('kind'), reason: fixture.id);
            expect(chip.isEnabled, !fixture.boolean('disabled'), reason: fixture.id);
            expect(
              chip.selected,
              fixture.string('kind') == 'filter' && fixture.boolean('selected'),
              reason: fixture.id,
            );
            expect(chip.variant.name, fixture.string('variant'), reason: fixture.id);
            expect(chip.size.name, fixture.string('size'), reason: fixture.id);
            expect(chip.label, fixture.string('label'), reason: fixture.id);
            expect(chip.avatar != null, fixture.content == 'avatar', reason: fixture.id);
            if (fixture.string('kind') == 'input') {
              expect(chip.removeSemanticLabel, fixture.string('removeLabel'), reason: fixture.id);
            }
          }
          if (spec.name == 'checkbox') {
            final TanreiCheckbox checkbox = tester.widget(
              find.descendant(of: entry, matching: find.byType(TanreiCheckbox)),
            );
            expect(checkbox.enabled, !fixture.boolean('disabled'), reason: fixture.id);
            expect(
              checkbox.value,
              fixture.boolean('indeterminate') ? null : fixture.boolean('checked'),
              reason: fixture.id,
            );
            expect(checkbox.tristate, fixture.boolean('indeterminate'), reason: fixture.id);
            expect(checkbox.isError, fixture.boolean('error'), reason: fixture.id);
            expect(checkbox.label, fixture.string('label'), reason: fixture.id);
            expect(checkbox.labelHidden, fixture.boolean('labelHidden'), reason: fixture.id);
          }
          if (spec.name == 'radio-button') {
            final TanreiRadioButton<String> option = tester.widget(
              find.descendant(of: entry, matching: find.byType(TanreiRadioButton<String>)),
            );
            final TanreiRadioGroup<String> group = tester.widget(
              find.descendant(of: entry, matching: find.byType(TanreiRadioGroup<String>)),
            );
            expect(option.value, fixture.string('value'), reason: fixture.id);
            expect(option.enabled, !fixture.boolean('disabled'), reason: fixture.id);
            expect(option.label, fixture.string('label'), reason: fixture.id);
            expect(option.labelHidden, fixture.boolean('labelHidden'), reason: fixture.id);
            expect(
              group.groupValue,
              fixture.boolean('selected') ? fixture.string('value') : null,
              reason: fixture.id,
            );
            expect(group.semanticLabel, fixture.string('name'), reason: fixture.id);
          }
          if (spec.name == 'switch') {
            final TanreiSwitch control = tester.widget(
              find.descendant(of: entry, matching: find.byType(TanreiSwitch)),
            );
            expect(control.value, fixture.boolean('selected'), reason: fixture.id);
            expect(control.enabled, !fixture.boolean('disabled'), reason: fixture.id);
            expect(control.label, fixture.string('label'), reason: fixture.id);
            expect(control.labelHidden, fixture.boolean('labelHidden'), reason: fixture.id);
            final bool icons =
                fixture.string('selectedIcon').isNotEmpty ||
                fixture.string('unselectedIcon').isNotEmpty;
            expect(control.thumbIcon != null, icons, reason: fixture.id);
            if (icons) {
              expect(
                control.thumbIcon!.resolve(<WidgetState>{WidgetState.selected}) != null,
                fixture.string('selectedIcon').isNotEmpty,
                reason: fixture.id,
              );
              expect(
                control.thumbIcon!.resolve(<WidgetState>{}) != null,
                fixture.string('unselectedIcon').isNotEmpty,
                reason: fixture.id,
              );
            }
          }
          if (spec.name == 'list') {
            final TanreiList<String> list = tester.widget(
              find.descendant(of: entry, matching: find.byType(TanreiList<String>)),
            );
            expect(list.selectionMode.name, fixture.string('selection'), reason: fixture.id);
            expect(list.semanticLabel, fixture.string('label'), reason: fixture.id);
            expect(list.selected, switch (fixture.string('selection')) {
              'single' => <String>{fixture.props['value']! as String},
              'multiple' => fixture.strings('values').toSet(),
              _ => isEmpty,
            }, reason: fixture.id);
            final List<TanreiListTile<String>> tiles = tester
                .widgetList<TanreiListTile<String>>(
                  find.descendant(of: entry, matching: find.byType(TanreiListTile<String>)),
                )
                .toList();
            expect(tiles, hasLength(fixture.items.length), reason: fixture.id);
            for (final (int i, GalleryItem item) in fixture.items.indexed) {
              final TanreiListTile<String> tile = tiles[i];
              expect(tile.title, item.string('headline'), reason: fixture.id);
              expect(tile.subtitle, item.string('supportingText'), reason: fixture.id);
              expect(tile.overline, item.string('overline'), reason: fixture.id);
              expect(tile.trailingText, item.string('trailingText'), reason: fixture.id);
              expect(tile.leadingMedia.name, item.string('leadingMedia'), reason: fixture.id);
              expect(tile.onTap != null, item.boolean('interactive'), reason: fixture.id);
              expect(tile.enabled, !item.boolean('disabled'), reason: fixture.id);
              expect(tile.divider, item.boolean('divider'), reason: fixture.id);
              expect(tile.leadingIcon != null, item.string('leadingIcon').isNotEmpty);
            }
          }
          if (spec.name == 'menu') {
            final TanreiMenuAnchor menu = tester.widget(
              find.descendant(of: entry, matching: find.byType(TanreiMenuAnchor)),
            );
            expect(menu.inPlace, isTrue, reason: fixture.id);
            expect(menu.placement.name, isNotEmpty);
            List<String> labels(List<GalleryItem> items) => <String>[
              for (final GalleryItem item in items)
                if (item.kind == 'group') ...labels(item.items) else item.string('label'),
            ];
            final List<String?> drawn = tester
                .widgetList<TanreiMenuEntry>(
                  find.descendant(
                    of: entry,
                    matching: find.byWidgetPredicate((Widget w) => w is TanreiMenuEntry),
                  ),
                )
                .map((TanreiMenuEntry e) => e.labelText)
                .toList();
            expect(drawn, labels(fixture.items), reason: fixture.id);
            final List<TanreiMenuGroup<String>> groups = tester
                .widgetList<TanreiMenuGroup<String>>(
                  find.descendant(of: entry, matching: find.byType(TanreiMenuGroup<String>)),
                )
                .toList();
            final List<GalleryItem> fixtureGroups = fixture.items
                .where((GalleryItem i) => i.kind == 'group')
                .toList();
            expect(
              groups.map((TanreiMenuGroup<String> g) => g.title),
              fixtureGroups.map((GalleryItem g) => g.string('title')),
            );
            expect(
              groups.map((TanreiMenuGroup<String> g) => g.groupValue),
              fixtureGroups.map((GalleryItem g) => g.maybeString('value')),
            );
          }
          if (spec.name == 'loading-indicator') {
            final TanreiLoadingIndicator indicator = tester.widget(
              find.descendant(of: entry, matching: find.byType(TanreiLoadingIndicator)),
            );
            expect(indicator.size.name, fixture.string('size'), reason: fixture.id);
            expect(indicator.contained, fixture.boolean('contained'), reason: fixture.id);
            expect(indicator.semanticsLabel, fixture.string('label'), reason: fixture.id);
          }
          if (spec.name == 'progress-indicator') {
            final TanreiProgressIndicator indicator = tester.widget(
              find.descendant(of: entry, matching: find.byType(TanreiProgressIndicator)),
            );
            expect(indicator.variant.name, fixture.string('variant'), reason: fixture.id);
            expect(indicator.size.name, fixture.string('size'), reason: fixture.id);
            expect(indicator.value, fixture.props['value'], reason: fixture.id);
            expect(indicator.min, fixture.props['min'], reason: fixture.id);
            expect(indicator.max, fixture.props['max'], reason: fixture.id);
            expect(indicator.semanticsLabel, fixture.string('label'), reason: fixture.id);
            expect(indicator.semanticsValue, fixture.string('valueText'), reason: fixture.id);
          }
          if (spec.name == 'badge') {
            final TanreiBadge badge = tester.widget(
              find.descendant(of: entry, matching: find.byType(TanreiBadge)),
            );
            expect(badge.count, fixture.props['count'], reason: fixture.id);
            expect(badge.max, fixture.props['max'] ?? 999, reason: fixture.id);
            expect(badge.semanticLabel, fixture.string('label'), reason: fixture.id);
            // The anchor is named by its glyph name; the label is the badge's value only.
            expect(
              find.descendant(
                of: entry,
                matching: find.byWidgetPredicate(
                  (Widget w) => w is Semantics && w.properties.label == fixture.content,
                ),
              ),
              findsOneWidget,
              reason: fixture.id,
            );
          }
          if (spec.name == 'divider') {
            final TanreiDivider divider = tester.widget(
              find.descendant(of: entry, matching: find.byType(TanreiDivider)),
            );
            expect(divider.axis.name, fixture.string('orientation'), reason: fixture.id);
            expect(divider.inset.name, fixture.string('inset'), reason: fixture.id);
            expect(divider.excludeFromSemantics, fixture.boolean('decorative'), reason: fixture.id);
            // A vertical divider is given a height by its frame.
            expect(
              tester.getSize(find.descendant(of: entry, matching: find.byType(TanreiDivider))),
              isNot(Size.zero),
            );
          }
        }
      }
    }

    TanreiThemeData themeOf(String key) =>
        TanreiTheme.of(tester.element(find.byKey(ValueKey<String>(key))));
    expect(themeOf('cupertino/button/filled-medium').brightness, Brightness.light);

    await tester.tap(find.byKey(const ValueKey<String>('switch-dark')));
    await settle(tester);
    await tester.tap(find.byKey(const ValueKey<String>('switch-high contrast')));
    await settle(tester);
    for (final TanreiSystem system in gallerySystems) {
      final TanreiThemeData theme = themeOf('${system.id}/button/filled-medium');
      expect(theme.brightness, Brightness.dark);
      expect(theme.contrast, TanreiContrast.high);
      expect(theme.colors, same(system.schemes.darkHigh));
    }
    // A toggle fixture switches when pressed, as its owner would.
    const ValueKey<String> toggleKey = ValueKey<String>('tanrei/icon-button/filled-unselected');
    TanreiIconButton toggle() => tester.widget(
      find.descendant(of: find.byKey(toggleKey), matching: find.byType(TanreiIconButton)),
    );
    expect(toggle().isSelected, isFalse);
    await tester.ensureVisible(find.byKey(toggleKey));
    await tester.tap(find.byKey(toggleKey));
    await settle(tester);
    expect(toggle().isSelected, isTrue);
    // A checkbox fixture switches when pressed; an indeterminate one becomes checked (CHK-2).
    const ValueKey<String> checkboxKey = ValueKey<String>('tanrei/checkbox/indeterminate');
    TanreiCheckbox indeterminate() => tester.widget(
      find.descendant(of: find.byKey(checkboxKey), matching: find.byType(TanreiCheckbox)),
    );
    expect(indeterminate().value, isNull);
    await tester.ensureVisible(find.byKey(checkboxKey));
    await tester.tap(find.byKey(checkboxKey));
    await settle(tester);
    expect(indeterminate().value, isTrue);
    // A radio fixture's option is selected when pressed.
    const ValueKey<String> radioKey = ValueKey<String>('tanrei/radio-button/unselected');
    TanreiRadioGroup<String> radioGroup() => tester.widget(
      find.descendant(of: find.byKey(radioKey), matching: find.byType(TanreiRadioGroup<String>)),
    );
    expect(radioGroup().groupValue, isNull);
    await tester.ensureVisible(find.byKey(radioKey));
    await tester.tap(find.byKey(radioKey));
    await settle(tester);
    expect(radioGroup().groupValue, 'weekly');
    // A switch fixture switches when pressed.
    const ValueKey<String> switchKey = ValueKey<String>('tanrei/switch/unselected');
    TanreiSwitch control() => tester.widget(
      find.descendant(of: find.byKey(switchKey), matching: find.byType(TanreiSwitch)),
    );
    expect(control().value, isFalse);
    await tester.ensureVisible(find.byKey(switchKey));
    await tester.tap(find.byKey(switchKey));
    await settle(tester);
    expect(control().value, isTrue);

    expect(tester.takeException(), isNull);
  });
}
