import 'dart:convert';

import 'package:flutter/foundation.dart' show SynchronousFuture, kIsWeb;
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:tanrei/systems/cupertino.dart';
import 'package:tanrei/systems/m3_like.dart';
import 'package:tanrei/tanrei.dart';

/// Loads the component specs bundled from the repository's `specs/` (`tool/copy_specs.dart`) and
/// shows the gallery.
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(GalleryApp(specs: await loadGallerySpecs(rootBundle)));
}

/// How the gallery draws one fixture of a component: the fixture's props (spec defaults filled in)
/// in, the platform's widget out.
typedef GalleryBuilder = Widget Function(GalleryFixture fixture);

/// Every component the gallery shows, by spec `name`. Adding a component to the gallery is one
/// entry here: its fixtures come from `specs/<name>.spec.json`, never from a copy.
/// `test/gallery_test.dart` fails when a spec implemented on Flutter has no entry, or an entry no
/// spec.
final Map<String, GalleryBuilder> galleryComponents = <String, GalleryBuilder>{
  'button': (GalleryFixture fixture) => TanreiButton(
    onPressed: fixture.boolean('disabled') ? null : () {},
    variant: TanreiButtonVariant(fixture.string('variant')),
    size: TanreiButtonSize(fixture.string('size')),
    child: Text(fixture.content ?? ''),
  ),
  'icon-button': (GalleryFixture fixture) => GalleryIconButton(fixture: fixture),
  'divider': (GalleryFixture fixture) => GalleryDivider(fixture: fixture),
  'badge': (GalleryFixture fixture) => GalleryBadge(fixture: fixture),
  'progress-indicator': (GalleryFixture fixture) => GalleryProgressIndicator(fixture: fixture),
  'checkbox': (GalleryFixture fixture) => GalleryCheckbox(fixture: fixture),
  'radio-button': (GalleryFixture fixture) => GalleryRadioButton(fixture: fixture),
  'switch': (GalleryFixture fixture) => GallerySwitch(fixture: fixture),
  'card': (GalleryFixture fixture) => GalleryCard(fixture: fixture),
  'chip': (GalleryFixture fixture) => GalleryChip(fixture: fixture),
  'extended-fab': (GalleryFixture fixture) => TanreiExtendedFloatingActionButton(
    onPressed: fixture.boolean('disabled') ? null : () {},
    label: fixture.string('label'),
    icon: fixture.content == null ? null : galleryIcon(fixture.content),
    isExtended: fixture.boolean('expanded'),
    variant: TanreiExtendedFabVariant(fixture.string('variant')),
    size: TanreiExtendedFabSize(fixture.string('size')),
  ),
  'fab': (GalleryFixture fixture) => TanreiFloatingActionButton(
    onPressed: fixture.boolean('disabled') ? null : () {},
    variant: TanreiFabVariant(fixture.string('variant')),
    size: TanreiFabSize(fixture.string('size')),
    semanticLabel: fixture.string('label'),
    icon: galleryIcon(fixture.content),
  ),
  'text-field': (GalleryFixture fixture) => GalleryTextField(fixture: fixture),
  'list': (GalleryFixture fixture) => GalleryList(fixture: fixture),
  'menu': (GalleryFixture fixture) => GalleryMenu(fixture: fixture),
  'tabs': (GalleryFixture fixture) => GalleryTabs(fixture: fixture),
  'segmented-button': (GalleryFixture fixture) => GallerySegmentedButton(fixture: fixture),
  'button-group': (GalleryFixture fixture) => GalleryButtonGroup(fixture: fixture),
  'split-button': (GalleryFixture fixture) => GallerySplitButton(fixture: fixture),
  'fab-menu': (GalleryFixture fixture) => GalleryFabMenu(fixture: fixture),
  'tooltip': (GalleryFixture fixture) => GalleryTooltip(fixture: fixture),
  'dialog': (GalleryFixture fixture) => GalleryDialog(fixture: fixture),
  'app-bar': (GalleryFixture fixture) => GalleryAppBar(fixture: fixture),
  'toolbar': (GalleryFixture fixture) => GalleryToolbar(fixture: fixture),
  'slider': (GalleryFixture fixture) => GallerySlider(fixture: fixture),
  'search': (GalleryFixture fixture) => GallerySearch(fixture: fixture),
  'navigation-bar': (GalleryFixture fixture) => GalleryNavigationBar(fixture: fixture),
  'navigation-rail': (GalleryFixture fixture) => GalleryNavigationRail(fixture: fixture),
  'navigation-drawer': (GalleryFixture fixture) => GalleryNavigationDrawer(fixture: fixture),
  'bottom-sheet': (GalleryFixture fixture) => GalleryBottomSheet(fixture: fixture),
  'side-sheet': (GalleryFixture fixture) => GallerySideSheet(fixture: fixture),
  'carousel': (GalleryFixture fixture) => GalleryCarousel(fixture: fixture),
  'date-picker': (GalleryFixture fixture) => GalleryDatePicker(fixture: fixture),
  'time-picker': (GalleryFixture fixture) => GalleryTimePicker(fixture: fixture),
  // SNK-19: drawn in place, 400 wide: no host, so no timer, queue, entrance or announcement.
  'snackbar': (GalleryFixture fixture) => SizedBox(
    width: 400,
    child: Center(
      child: TanreiSnackbar(
        message: fixture.string('message'),
        actionLabel: fixture.string('action'),
        showCloseIcon: fixture.boolean('closable'),
        closeIconLabel: fixture.string('closeLabel'),
        duration: TanreiSnackbarDuration.fromName(fixture.string('duration')),
      ),
    ),
  ),
  'loading-indicator': (GalleryFixture fixture) => TanreiLoadingIndicator(
    size: TanreiLoadingIndicatorSize(fixture.string('size')),
    contained: fixture.boolean('contained'),
    semanticsLabel: fixture.string('label'),
  ),
};

/// The code points of the icon names the specs' fixtures use, in Material Symbols (the icon font of
/// the default system and the presets). Icon names belong to the product; this is the gallery's.
const Map<String, int> galleryIconCodePoints = <String, int>{
  'add': 0xe145,
  'archive': 0xe149,
  'bluetooth': 0xe1a7,
  'chevron_right': 0xe5cc,
  'content_copy': 0xe14d,
  'content_cut': 0xe14e,
  'content_paste': 0xe14f,
  'link': 0xe157,
  'open_in_new': 0xe89e,
  'delete': 0xe872,
  'inbox': 0xe156,
  'label': 0xe892,
  'send': 0xe163,
  'star': 0xe838,
  'wifi': 0xe63e,
  'favorite': 0xe87d,
  'check': 0xe5ca,
  'close': 0xe5cd,
  'edit': 0xe3c9,
  'event': 0xe878,
  'notifications': 0xe7f4,
  'search': 0xe8b6,
  'dashboard': 0xe871,
  'history': 0xe889,
  'settings': 0xe8b8,
  'info': 0xe88e,
  'arrow_back': 0xe5c4,
  'more_vert': 0xe5d4,
  'share': 0xe80d,
  'menu': 0xe5d2,
  'account_circle': 0xe853,
  'home': 0xe88a,
  'person': 0xe7fd,
  'explore': 0xe87a,
  'add_circle': 0xe147,
  'video_library': 0xe04a,
  'chat': 0xe0b7,
  'folder': 0xe2c7,
  'group': 0xe7ef,
  'schedule': 0xe8b5,
  'draft': 0xe66d,
  'label_outline': 0xe893,
  'view_list': 0xe8ef,
  'landscape': 0xe3f7,
  'forest': 0xea99,
  'water': 0xf084,
  'park': 0xea63,
  'sunny': 0xe81a,
  'filter_hdr': 0xe3d3,
  'grid_view': 0xe9b0,
  'map': 0xe55b,
  'format_align_left': 0xe236,
  'format_align_center': 0xe234,
  'format_align_right': 0xe237,
  'format_bold': 0xe238,
  'format_italic': 0xe23f,
  'format_underlined': 0xe249,
  'save': 0xe161,
  'description': 0xe873,
  'create_new_folder': 0xe2cc,
  'upload': 0xf09b,
  'attach_file': 0xe226,
  'image': 0xe3f4,
  'remove': 0xe15b,
  'my_location': 0xe55c,
  'drive_file_move': 0xe675,
  'mark_email_unread': 0xf18a,
  'mic': 0xe029,
};

/// The glyph a fixture names, as the string a navigation destination draws: its code point, or the
/// name itself (a ligature) when the table does not have it.
String galleryGlyph(String name) => switch (galleryIconCodePoints[name]) {
  final int codePoint => String.fromCharCode(codePoint),
  null => name,
};

/// The glyph a fixture's `content` names, drawn as text so that it takes the icon family of the
/// system and the selection from the control around it. An unknown name is drawn as its ligature.
///
/// The icon fonts are not bundled (nor registered by the gallery): where the family is missing —
/// always on Flutter web, which cannot read installed fonts — the glyph is the fallback font's box.
Widget galleryIcon(String? name) => Text(switch (galleryIconCodePoints[name]) {
  final int codePoint => String.fromCharCode(codePoint),
  null => name ?? '',
});

/// The glyph an item's icon prop names, or null for an empty name (nothing is drawn).
Widget? galleryItemIcon(String name) => name.isEmpty ? null : galleryIcon(name);

/// A list fixture (LST-16's `verify`): one list, 360 wide, holding the fixture's items in order.
/// A selectable one starts from the fixture's `value` or `values` and keeps what is chosen, as a
/// product's owner of the selection does. An avatar holds the headline's first letter; an image is
/// empty and shows the media container color.
class GalleryList extends StatefulWidget {
  /// Shows [fixture].
  const GalleryList({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  /// The width of every list fixture.
  static const double width = 360;

  @override
  State<GalleryList> createState() => _GalleryListState();
}

class _GalleryListState extends State<GalleryList> {
  late final TanreiListSelectionMode _mode = TanreiListSelectionMode.fromName(
    widget.fixture.string('selection'),
  );
  late Set<String> _selected = switch (_mode) {
    TanreiListSelectionMode.none => <String>{},
    TanreiListSelectionMode.single => <String>{
      if (widget.fixture.props['value'] case final String value) value,
    },
    TanreiListSelectionMode.multiple => widget.fixture.strings('values').toSet(),
  };

  @override
  Widget build(BuildContext context) {
    final GalleryFixture fixture = widget.fixture;
    return SizedBox(
      width: GalleryList.width,
      child: TanreiList<String>(
        selectionMode: _mode,
        selected: _selected,
        onSelectionChanged: (Set<String> value) => setState(() => _selected = value),
        semanticLabel: fixture.string('label'),
        children: <Widget>[
          for (final GalleryItem item in fixture.items)
            if (item.kind == 'list-item') _tile(item),
        ],
      ),
    );
  }

  TanreiListTile<String> _tile(GalleryItem item) {
    final String headline = item.string('headline');
    final TanreiListLeadingMedia media = TanreiListLeadingMedia.fromName(
      item.string('leadingMedia'),
    );
    return TanreiListTile<String>(
      value: item.string('value'),
      title: headline,
      overline: item.string('overline'),
      subtitle: item.string('supportingText'),
      subtitleMaxLines: item.integer('supportingMaxLines'),
      trailingText: item.string('trailingText'),
      leadingIcon: galleryItemIcon(item.string('leadingIcon')),
      trailingIcon: galleryItemIcon(item.string('trailingIcon')),
      leadingMedia: media,
      // The list centres a monogram and sets it in the headline's style (LST-20).
      leading: media == TanreiListLeadingMedia.avatar && headline.isNotEmpty
          ? Text(headline.characters.first)
          : null,
      onTap: item.boolean('interactive') ? () {} : null,
      enabled: !item.boolean('disabled'),
      divider: item.boolean('divider'),
    );
  }
}

/// A tabs fixture (TAB-14's `verify`): one row of tabs 360 wide and no panel, holding the fixture's
/// tabs in order. It starts from the fixture's `selected` and keeps what is chosen, as a product's
/// owner of the value does.
class GalleryTabs extends StatefulWidget {
  /// Shows [fixture].
  const GalleryTabs({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  /// The width of every tabs fixture.
  static const double width = 360;

  @override
  State<GalleryTabs> createState() => _GalleryTabsState();
}

class _GalleryTabsState extends State<GalleryTabs> {
  late String? _value = widget.fixture.props['selected'] as String?;

  @override
  Widget build(BuildContext context) {
    final GalleryFixture fixture = widget.fixture;
    return SizedBox(
      width: GalleryTabs.width,
      child: TanreiTabBar<String>(
        value: _value,
        onChanged: (String value) => setState(() => _value = value),
        variant: TanreiTabsVariant(fixture.string('variant')),
        isScrollable: fixture.boolean('scrollable'),
        semanticLabel: fixture.string('label'),
        tabs: <TanreiTab<String>>[
          for (final GalleryItem item in fixture.items)
            if (item.kind == 'tab')
              TanreiTab<String>(
                value: item.string('value'),
                label: item.string('label'),
                icon: galleryItemIcon(item.string('icon')),
                labelHidden: item.boolean('labelHidden'),
                enabled: !item.boolean('disabled'),
              ),
        ],
      ),
    );
  }
}

/// A segmented button fixture (SEG-14's `verify`): the set at its natural width on a 400 x 96
/// stage, start-aligned and vertically centred, holding the fixture's segments in order. It starts
/// from the fixture's `value` or `values` and keeps what is chosen, as a product's owner of the
/// selection does.
class GallerySegmentedButton extends StatefulWidget {
  /// Shows [fixture].
  const GallerySegmentedButton({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  /// The stage of every segmented button fixture.
  static const Size stage = Size(400, 96);

  @override
  State<GallerySegmentedButton> createState() => _GallerySegmentedButtonState();
}

class _GallerySegmentedButtonState extends State<GallerySegmentedButton> {
  bool get _multiple => widget.fixture.string('selection') == 'multiple';

  late Set<String> _selected = _multiple
      ? widget.fixture.strings('values').toSet()
      : <String>{if (widget.fixture.props['value'] case final String value) value};

  @override
  Widget build(BuildContext context) {
    final GalleryFixture fixture = widget.fixture;
    return SizedBox.fromSize(
      size: GallerySegmentedButton.stage,
      child: Align(
        alignment: AlignmentDirectional.centerStart,
        child: TanreiSegmentedButton<String>(
          multiSelectionEnabled: _multiple,
          selected: _selected,
          onSelectionChanged: (Set<String> next) => setState(() => _selected = next),
          size: TanreiSegmentedButtonSize(fixture.string('size')),
          semanticLabel: fixture.string('label'),
          segments: <TanreiSegment<String>>[
            for (final GalleryItem item in fixture.items)
              if (item.kind == 'segment')
                TanreiSegment<String>(
                  value: item.string('value'),
                  label: item.string('label'),
                  icon: galleryItemIcon(item.string('icon')),
                  labelHidden: item.boolean('labelHidden'),
                  enabled: !item.boolean('disabled'),
                ),
          ],
        ),
      ),
    );
  }
}

/// A button group fixture (BGR-1's `verify`): the group at its natural width, start-aligned and
/// vertically centred, holding the fixture's Buttons and icon buttons in order. A toggle keeps its
/// own state, as a product's owner of it does. The stage is 96 tall and as wide as the row (BGR-1's
/// 400 is too narrow for the Flutter test font's square glyphs), scaled down to the gallery's
/// column.
class GalleryButtonGroup extends StatefulWidget {
  /// Shows [fixture].
  const GalleryButtonGroup({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  /// The stage of every button group fixture.
  static const Size stage = Size(480, 96);

  @override
  State<GalleryButtonGroup> createState() => _GalleryButtonGroupState();
}

class _GalleryButtonGroupState extends State<GalleryButtonGroup> {
  late final List<bool> _selected = <bool>[
    for (final GalleryItem item in widget.fixture.items) item.boolean('selected'),
  ];

  @override
  Widget build(BuildContext context) {
    final GalleryFixture fixture = widget.fixture;
    // At its natural width, whatever the gallery's column allows, scaled down where the column is
    // narrower: a narrowed row (BGR-7) would wrap labels, and one that cannot narrow enough is
    // reported.
    return FittedBox(
      fit: BoxFit.scaleDown,
      alignment: AlignmentDirectional.centerStart,
      child: SizedBox(
        height: GalleryButtonGroup.stage.height,
        child: Align(
          alignment: AlignmentDirectional.centerStart,
          child: TanreiButtonGroup(
            variant: TanreiButtonGroupVariant.fromName(fixture.string('variant')),
            semanticLabel: fixture.string('label'),
            children: <Widget>[
              for (final (int i, GalleryItem item) in fixture.items.indexed)
                if (item.kind == 'icon-button')
                  TanreiIconButton(
                    onPressed: item.boolean('disabled')
                        ? null
                        : () => setState(() => _selected[i] = !_selected[i]),
                    icon: galleryIcon(item.content),
                    semanticLabel: item.string('label'),
                    isSelected: item.boolean('toggle') ? _selected[i] : null,
                    variant: TanreiIconButtonVariant(item.string('variant')),
                    size: TanreiIconButtonSize(item.string('size')),
                  )
                else
                  TanreiButton(
                    onPressed: item.boolean('disabled') ? null : () {},
                    variant: TanreiButtonVariant(item.string('variant')),
                    size: TanreiButtonSize(item.string('size')),
                    child: Text(item.content ?? ''),
                  ),
            ],
          ),
        ),
      ),
    );
  }
}

/// A split button fixture (SPB-12's `verify`): the split button at its natural width on a 320 x 96
/// stage, start-aligned and vertically centred. A fixture cannot fill the menu slot, so the menu is
/// empty: the trailing half toggles and draws its open form (an `open` fixture starts open), and no
/// menu is presented (SPB-20, which reports the empty menu in debug builds).
class GallerySplitButton extends StatefulWidget {
  /// Shows [fixture].
  const GallerySplitButton({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  /// The stage of every split button fixture.
  static const Size stage = Size(320, 96);

  @override
  State<GallerySplitButton> createState() => _GallerySplitButtonState();
}

class _GallerySplitButtonState extends State<GallerySplitButton> {
  final TanreiMenuController _menu = TanreiMenuController();

  @override
  void initState() {
    super.initState();
    if (widget.fixture.boolean('open')) {
      _menu.open();
    }
  }

  @override
  void dispose() {
    _menu.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final GalleryFixture fixture = widget.fixture;
    final List<Widget> icon = fixture.slot('icon');
    return SizedBox.fromSize(
      size: GallerySplitButton.stage,
      child: Align(
        alignment: AlignmentDirectional.centerStart,
        child: TanreiSplitButton(
          label: fixture.string('label'),
          menuSemanticLabel: fixture.string('menuLabel'),
          icon: icon.isEmpty ? null : icon.single,
          onPressed: fixture.boolean('disabled') ? null : () {},
          menuController: _menu,
          menuChildren: const <Widget>[],
          variant: TanreiSplitButtonVariant(fixture.string('variant')),
          size: TanreiSplitButtonSize(fixture.string('size')),
        ),
      ),
    );
  }
}

/// A FAB menu fixture (FBM-13's `verify`): the toggle at the inline-end bottom corner of a 320 x 320
/// stage, 16 from both edges, drawn in place (`TanreiFabMenu.inPlace`): an `open` fixture draws its
/// items above the toggle in the layout, without the overlay and without motion. The toggle opens
/// and closes it, and an item closes it, as a product's owner of the controller would.
class GalleryFabMenu extends StatefulWidget {
  /// Shows [fixture].
  const GalleryFabMenu({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  /// The stage of every FAB menu fixture.
  static const Size stage = Size(320, 320);

  @override
  State<GalleryFabMenu> createState() => _GalleryFabMenuState();
}

class _GalleryFabMenuState extends State<GalleryFabMenu> {
  final TanreiMenuController _menu = TanreiMenuController();

  @override
  void initState() {
    super.initState();
    if (widget.fixture.boolean('open')) {
      _menu.open();
    }
  }

  @override
  void dispose() {
    _menu.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final GalleryFixture fixture = widget.fixture;
    return SizedBox.fromSize(
      size: GalleryFabMenu.stage,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Align(
          alignment: AlignmentDirectional.bottomEnd,
          child: TanreiFabMenu.inPlace(
            controller: _menu,
            semanticLabel: fixture.string('label'),
            icon: fixture.slot('icon').single,
            variant: TanreiFabMenuVariant(fixture.string('variant')),
            size: TanreiFabMenuSize(fixture.string('size')),
            enabled: !fixture.boolean('disabled'),
            items: <TanreiFabMenuItem>[
              for (final GalleryItem item in fixture.items)
                if (item.kind == 'item')
                  TanreiFabMenuItem(
                    label: item.string('label'),
                    icon: galleryItemIcon(item.string('icon')),
                    onPressed: () {},
                  ),
            ],
            onClose: (TanreiMenuCloseReason _) => _menu.close(),
          ),
        ),
      ),
    );
  }
}

/// An app bar fixture: a bar 360 wide, its navigation item as `leading` and its
/// action items as `actions` — standard icon buttons showing the item's glyph, named by its label.
/// `scrolled` is passed as given (nothing scrolls under a gallery bar).
class GalleryAppBar extends StatelessWidget {
  /// Shows [fixture].
  const GalleryAppBar({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  /// The width of every app bar fixture.
  static const double width = 360;

  @override
  Widget build(BuildContext context) {
    TanreiIconButton button(GalleryItem item) => TanreiIconButton(
      onPressed: () {},
      icon: galleryIcon(item.content),
      semanticLabel: item.string('label'),
    );
    final GalleryItem? navigation = fixture.items
        .where((GalleryItem item) => item.kind == 'navigation')
        .firstOrNull;
    return SizedBox(
      width: width,
      child: TanreiAppBar(
        leading: navigation == null ? null : button(navigation),
        actions: <Widget>[
          for (final GalleryItem item in fixture.items)
            if (item.kind == 'action') button(item),
        ],
        title: fixture.string('title'),
        subtitle: fixture.string('subtitle'),
        size: TanreiAppBarSize(fixture.string('size')),
        centerTitle: fixture.string('titleAlignment') == 'center',
        scrolledUnder: fixture.boolean('scrolled'),
      ),
    );
  }
}

/// A toolbar fixture: a docked toolbar 360 wide, a floating one at its own size,
/// holding the fixture's items in order; a toggle switches when pressed, as a product's owner of
/// the selection does.
class GalleryToolbar extends StatefulWidget {
  /// Shows [fixture].
  const GalleryToolbar({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  /// The width of a docked toolbar fixture (TBR-1's stage).
  static const double width = 360;

  @override
  State<GalleryToolbar> createState() => _GalleryToolbarState();
}

class _GalleryToolbarState extends State<GalleryToolbar> {
  late final Set<int> _on = <int>{
    for (final (int i, GalleryItem item) in widget.fixture.items.indexed)
      if (item.boolean('toggle') && item.boolean('selected')) i,
  };

  @override
  Widget build(BuildContext context) {
    final GalleryFixture fixture = widget.fixture;
    final TanreiToolbarVariant variant = TanreiToolbarVariant(fixture.string('variant'));
    final Widget toolbar = TanreiToolbar(
      semanticLabel: fixture.string('label'),
      variant: variant,
      orientation: TanreiToolbar.orientationFromName(fixture.string('orientation')),
      children: <Widget>[
        for (final (int i, GalleryItem item) in fixture.items.indexed)
          if (item.kind == 'button')
            TanreiButton(
              onPressed: item.boolean('disabled') ? null : () {},
              variant: TanreiButtonVariant(item.string('variant')),
              child: Text(item.content ?? ''),
            )
          else
            TanreiIconButton(
              onPressed: item.boolean('disabled')
                  ? null
                  : () => setState(() {
                      if (item.boolean('toggle') && !_on.remove(i)) {
                        _on.add(i);
                      }
                    }),
              icon: galleryIcon(item.content),
              semanticLabel: item.string('label'),
              isSelected: item.boolean('toggle') ? _on.contains(i) : null,
              variant: TanreiIconButtonVariant(item.string('variant')),
            ),
      ],
    );
    return variant == TanreiToolbarVariant.floating
        ? toolbar
        : SizedBox(width: GalleryToolbar.width, child: toolbar);
  }
}

/// A slider fixture: a horizontal slider 320 long, a vertical one 240 tall (SLD-7's
/// stages); it keeps the values the person sets, as a product's owner of the value does.
class GallerySlider extends StatefulWidget {
  /// Shows [fixture].
  const GallerySlider({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  /// The length of a horizontal slider fixture.
  static const double horizontalLength = 320;

  /// The length of a vertical slider fixture.
  static const double verticalLength = 240;

  @override
  State<GallerySlider> createState() => _GallerySliderState();
}

class _GallerySliderState extends State<GallerySlider> {
  double _number(String prop) => (widget.fixture.props[prop] as num? ?? 0).toDouble();

  late double _value = _number('value');
  late double _start = _number('startValue');

  @override
  Widget build(BuildContext context) {
    final GalleryFixture fixture = widget.fixture;
    final bool disabled = fixture.boolean('disabled');
    final Axis orientation = TanreiSlider.orientationFromName(fixture.string('orientation'));
    final double max = fixture.props['max'] == null ? 100 : _number('max');
    final Widget slider = fixture.boolean('range')
        ? TanreiSlider.range(
            start: _start,
            end: _value,
            onChanged: disabled
                ? null
                : (double start, double end) => setState(() {
                    _start = start;
                    _value = end;
                  }),
            min: _number('min'),
            max: max,
            step: _number('step'),
            showStops: fixture.boolean('stops'),
            valueIndicator: TanreiSliderValueIndicator.fromName(fixture.string('valueIndicator')),
            size: TanreiSliderSize(fixture.string('size')),
            orientation: orientation,
            semanticLabel: fixture.string('label'),
            startSemanticLabel: fixture.string('startLabel'),
            semanticValue: fixture.string('valueText'),
            startSemanticValue: fixture.string('startValueText'),
          )
        : TanreiSlider(
            value: _value,
            onChanged: disabled ? null : (double value) => setState(() => _value = value),
            min: _number('min'),
            max: max,
            step: _number('step'),
            origin: (fixture.props['origin'] as num?)?.toDouble(),
            showStops: fixture.boolean('stops'),
            valueIndicator: TanreiSliderValueIndicator.fromName(fixture.string('valueIndicator')),
            size: TanreiSliderSize(fixture.string('size')),
            orientation: orientation,
            semanticLabel: fixture.string('label'),
            semanticValue: fixture.string('valueText'),
          );
    return orientation == Axis.vertical
        ? SizedBox(height: GallerySlider.verticalLength, child: slider)
        : SizedBox(width: GallerySlider.horizontalLength, child: slider);
  }
}

/// A search fixture: a bar 328 wide (SRC-1's stage); an open docked view drawn in
/// place under it, an open full-screen view in place in a 360 x 480 window (SRC-7's and SRC-9's
/// `verify`). It keeps the query and whether the view is open, as a product's owner does.
class GallerySearch extends StatefulWidget {
  /// Shows [fixture].
  const GallerySearch({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  /// The bar's width.
  static const double width = 328;

  /// The window a full-screen view stands in.
  static const Size window = Size(360, 480);

  @override
  State<GallerySearch> createState() => _GallerySearchState();
}

class _GallerySearchState extends State<GallerySearch> {
  late final TanreiSearchController _controller = TanreiSearchController(
    text: widget.fixture.string('value'),
  );

  @override
  void initState() {
    super.initState();
    if (widget.fixture.boolean('expanded')) {
      _controller.expand();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final GalleryFixture fixture = widget.fixture;
    final TanreiSearchPresentation presentation = TanreiSearchPresentation.fromName(
      fixture.string('presentation'),
    );
    final List<Widget> leading = fixture.slot('leading');
    final Widget search = TanreiSearch(
      controller: _controller,
      semanticLabel: fixture.string('label'),
      presentation: presentation,
      hintText: fixture.string('placeholder'),
      enabled: !fixture.boolean('disabled'),
      clearLabel: fixture.string('clearLabel'),
      backLabel: fixture.string('backLabel'),
      leading: leading.isEmpty ? null : leading.first,
      trailing: fixture.slot('trailing'),
      // An open view is drawn in place, so the fixture shows it in the gallery's grid.
      inPlace: fixture.boolean('expanded'),
      suggestions: <TanreiSearchSuggestion>[
        for (final GalleryItem item in fixture.items)
          TanreiSearchSuggestion(
            value: item.string('value'),
            headline: item.string('headline'),
            supportingText: item.string('supportingText'),
            leadingIcon: item.string('leadingIcon').isEmpty
                ? ''
                : galleryGlyph(item.string('leadingIcon')),
          ),
      ],
    );
    if (presentation == TanreiSearchPresentation.fullScreen && fixture.boolean('expanded')) {
      return SizedBox.fromSize(size: GallerySearch.window, child: search);
    }
    return SizedBox(width: GallerySearch.width, child: search);
  }
}

/// A navigation bar fixture: a bar 360 wide holding the fixture's destinations,
/// the one whose value is the fixture's value selected by its index; a press selects, as a
/// product's owner of the selection does.
class GalleryNavigationBar extends StatefulWidget {
  /// Shows [fixture].
  const GalleryNavigationBar({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  /// The width of every navigation bar fixture.
  static const double width = 360;

  @override
  State<GalleryNavigationBar> createState() => _GalleryNavigationBarState();
}

class _GalleryNavigationBarState extends State<GalleryNavigationBar> {
  late int? _selected = _initial();

  int? _initial() {
    final int index = widget.fixture.items.indexWhere(
      (GalleryItem item) => item.string('value') == widget.fixture.string('value'),
    );
    return index < 0 ? null : index;
  }

  @override
  Widget build(BuildContext context) {
    final GalleryFixture fixture = widget.fixture;
    return SizedBox(
      width: GalleryNavigationBar.width,
      child: TanreiNavigationBar(
        selectedIndex: _selected,
        onDestinationSelected: (int index) => setState(() => _selected = index),
        labelBehavior: switch (fixture.string('labelVisibility')) {
          'selected' => TanreiNavigationBarLabelBehavior.onlyShowSelected,
          'never' => TanreiNavigationBarLabelBehavior.alwaysHide,
          _ => TanreiNavigationBarLabelBehavior.alwaysShow,
        },
        semanticLabel: fixture.string('label'),
        destinations: <TanreiNavigationDestination>[
          for (final GalleryItem item in fixture.items)
            TanreiNavigationDestination(
              icon: galleryGlyph(item.string('icon')),
              label: item.string('label'),
              enabled: !item.boolean('disabled'),
              badge: item.boolean('badge')
                  ? TanreiNavigationBadge(
                      count: item.props['badgeCount'] as num?,
                      semanticLabel: item.string('badgeLabel'),
                    )
                  : null,
            ),
        ],
      ),
    );
  }
}

/// A navigation rail fixture: a rail 400 high, its header-button items (standard
/// icon buttons showing the item's glyph, named by its label) in `leading`, its destinations in
/// order, the one whose value is the fixture's value selected by its index; a press selects.
class GalleryNavigationRail extends StatefulWidget {
  /// Shows [fixture].
  const GalleryNavigationRail({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  /// The height of every navigation rail fixture.
  static const double height = 400;

  @override
  State<GalleryNavigationRail> createState() => _GalleryNavigationRailState();
}

class _GalleryNavigationRailState extends State<GalleryNavigationRail> {
  List<GalleryItem> get _destinations => <GalleryItem>[
    for (final GalleryItem item in widget.fixture.items)
      if (item.kind == 'destination') item,
  ];

  late int? _selected = _initial();

  int? _initial() {
    final int index = _destinations.indexWhere(
      (GalleryItem item) => item.string('value') == widget.fixture.string('value'),
    );
    return index < 0 ? null : index;
  }

  @override
  Widget build(BuildContext context) {
    final GalleryFixture fixture = widget.fixture;
    final List<Widget> header = <Widget>[
      for (final GalleryItem item in fixture.items)
        if (item.kind == 'header-button')
          TanreiIconButton(
            onPressed: () {},
            icon: galleryIcon(item.content),
            semanticLabel: item.string('label'),
          ),
    ];
    return SizedBox(
      height: GalleryNavigationRail.height,
      child: TanreiNavigationRail(
        selectedIndex: _selected,
        onDestinationSelected: (int index) => setState(() => _selected = index),
        labelType: switch (fixture.string('labelVisibility')) {
          'selected' => TanreiNavigationRailLabelType.selected,
          'never' => TanreiNavigationRailLabelType.none,
          _ => TanreiNavigationRailLabelType.all,
        },
        semanticLabel: fixture.string('label'),
        leading: header.isEmpty ? null : Column(mainAxisSize: MainAxisSize.min, children: header),
        destinations: <TanreiNavigationRailDestination>[
          for (final GalleryItem item in _destinations)
            TanreiNavigationRailDestination(
              icon: galleryGlyph(item.string('icon')),
              label: item.string('label'),
              disabled: item.boolean('disabled'),
              badge: item.boolean('badge')
                  ? TanreiNavigationBadge(
                      count: item.props['badgeCount'] as num?,
                      semanticLabel: item.string('badgeLabel'),
                    )
                  : null,
            ),
        ],
      ),
    );
  }
}

/// A navigation drawer fixture: a stage of 360 x 448 with a Menu icon button that
/// opens and closes the drawer; a standard drawer first in a row beside the stage's page, a modal
/// one over it. The drawer's items come from the fixture (destinations and sections, the fixture's
/// value selected by its index in reading order); a press selects, and a modal drawer closes when
/// it asks to.
class GalleryNavigationDrawer extends StatefulWidget {
  /// Shows [fixture].
  const GalleryNavigationDrawer({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  /// The stage of every navigation drawer fixture.
  static const Size stage = Size(360, 448);

  @override
  State<GalleryNavigationDrawer> createState() => _GalleryNavigationDrawerState();
}

class _GalleryNavigationDrawerState extends State<GalleryNavigationDrawer> {
  late bool _open = widget.fixture.boolean('open');
  late int? _selected = _initial();

  int? _initial() {
    int index = 0;
    int? found;
    void visit(List<GalleryItem> items) {
      for (final GalleryItem item in items) {
        if (item.kind == 'section') {
          visit(item.items);
        } else {
          if (item.string('value') == widget.fixture.string('value')) {
            found ??= index;
          }
          index++;
        }
      }
    }

    visit(widget.fixture.items);
    return found;
  }

  List<TanreiNavigationDrawerChild> _children(List<GalleryItem> items) =>
      <TanreiNavigationDrawerChild>[
        for (final GalleryItem item in items)
          if (item.kind == 'section')
            TanreiNavigationDrawerSection(
              heading: item.string('heading'),
              divider: item.boolean('divider'),
              children: _children(item.items),
            )
          else
            TanreiNavigationDrawerDestination(
              icon: item.string('icon').isEmpty ? null : galleryGlyph(item.string('icon')),
              label: item.string('label'),
              badge: item.string('badge'),
              enabled: !item.boolean('disabled'),
            ),
      ];

  @override
  Widget build(BuildContext context) {
    final GalleryFixture fixture = widget.fixture;
    final TanreiNavigationDrawerVariant variant = TanreiNavigationDrawerVariant(
      fixture.string('variant'),
    );
    final Widget drawer = TanreiNavigationDrawer(
      variant: variant,
      open: _open,
      selectedIndex: _selected,
      onDestinationSelected: (int index) => setState(() => _selected = index),
      onClose: () => setState(() => _open = false),
      semanticLabel: fixture.string('label'),
      children: _children(fixture.items),
    );
    final Widget page = Align(
      alignment: AlignmentDirectional.topEnd,
      child: TanreiIconButton(
        onPressed: () => setState(() => _open = !_open),
        icon: galleryIcon('menu'),
        semanticLabel: 'Menu',
      ),
    );
    return SizedBox.fromSize(
      size: GalleryNavigationDrawer.stage,
      child: variant == TanreiNavigationDrawerVariant.modal
          ? Stack(
              children: <Widget>[
                Positioned.fill(child: page),
                drawer,
              ],
            )
          : Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                drawer,
                Expanded(child: page),
              ],
            ),
    );
  }
}

/// A bottom sheet fixture: a 400 x 720 stage with a page whose Open button shows
/// the sheet, the sheet over it in a `Stack`. Its owner keeps `open` and the detent: dragging,
/// the drag handle, the scrim, Escape and back work as in a product.
class GalleryBottomSheet extends StatefulWidget {
  /// Shows [fixture].
  const GalleryBottomSheet({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  /// The stage of every bottom sheet fixture.
  static const Size stage = Size(400, 720);

  @override
  State<GalleryBottomSheet> createState() => _GalleryBottomSheetState();
}

class _GalleryBottomSheetState extends State<GalleryBottomSheet> {
  late bool _open = widget.fixture.boolean('open');
  late TanreiBottomSheetDetent _detent = TanreiBottomSheetDetent.fromName(
    widget.fixture.string('detent'),
  );

  @override
  Widget build(BuildContext context) {
    final GalleryFixture fixture = widget.fixture;
    return SizedBox.fromSize(
      size: GalleryBottomSheet.stage,
      child: Stack(
        children: <Widget>[
          Positioned.fill(
            child: Align(
              alignment: Alignment.topCenter,
              child: TanreiButton(
                onPressed: () => setState(() => _open = true),
                child: const Text('Open'),
              ),
            ),
          ),
          TanreiBottomSheet(
            variant: TanreiBottomSheetVariant.fromName(fixture.string('variant')),
            open: _open,
            onClose: (_) => setState(() => _open = false),
            detent: _detent,
            onDetentChanged: (TanreiBottomSheetDetent detent) => _detent = detent,
            dismissible: fixture.boolean('dismissible'),
            showHandle: fixture.boolean('handle'),
            handleSemanticLabel: fixture.string('handleLabel'),
            inset: fixture.boolean('inset'),
            semanticLabel: fixture.string('label'),
            child: Text(fixture.content ?? ''),
          ),
        ],
      ),
    );
  }
}

/// A side sheet fixture: a 720 x 480 stage with a page whose Open button shows the
/// sheet — a standard one at the end of a row beside the page, a modal one over it in a `Stack`.
/// Its owner keeps `open`: the close button, the scrim, Escape, back and a drag work as in a
/// product.
class GallerySideSheet extends StatefulWidget {
  /// Shows [fixture].
  const GallerySideSheet({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  /// The stage of every side sheet fixture.
  static const Size stage = Size(720, 480);

  @override
  State<GallerySideSheet> createState() => _GallerySideSheetState();
}

class _GallerySideSheetState extends State<GallerySideSheet> {
  late bool _open = widget.fixture.boolean('open');

  @override
  Widget build(BuildContext context) {
    final GalleryFixture fixture = widget.fixture;
    final TanreiSideSheetVariant variant = TanreiSideSheetVariant(fixture.string('variant'));
    final Widget page = Align(
      alignment: AlignmentDirectional.topStart,
      child: TanreiButton(
        onPressed: () => setState(() => _open = !_open),
        child: const Text('Open'),
      ),
    );
    // The actions slot as the fixture fills it.
    final Widget sheet = TanreiSideSheet(
      variant: variant,
      open: _open,
      onClose: (_) => setState(() => _open = false),
      headline: fixture.string('headline'),
      showCloseButton: fixture.boolean('closable'),
      closeButtonSemanticLabel: fixture.string('closeLabel'),
      actions: fixture.slot('actions'),
      child: Text(fixture.content ?? ''),
    );
    return SizedBox.fromSize(
      size: GallerySideSheet.stage,
      child: variant == TanreiSideSheetVariant.modal
          ? Stack(
              children: <Widget>[
                Positioned.fill(child: page),
                sheet,
              ],
            )
          : Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Expanded(child: page),
                sheet,
              ],
            ),
    );
  }
}

/// A date picker fixture (DTP-1's `verify`): a modal one presented with `showTanreiDatePicker` over
/// a 480 x 640 stage (it opens by itself, and its page's button opens it again), a docked one drawn
/// in place (`TanreiDatePicker`) in the middle of a 400 x 440 stage. The fixture's dates arrive as
/// ISO text and are read with `TanreiDatePicker.parseDate`; what is committed is kept, as a
/// product's owner does.
class GalleryDatePicker extends StatefulWidget {
  /// Shows [fixture].
  const GalleryDatePicker({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  /// The stage of the modal fixtures.
  static const Size modalStage = Size(480, 640);

  /// The stage of the docked fixtures.
  static const Size dockedStage = Size(400, 440);

  @override
  State<GalleryDatePicker> createState() => _GalleryDatePickerState();
}

class _GalleryDatePickerState extends State<GalleryDatePicker> {
  final GlobalKey _page = GlobalKey();
  late TanreiDateSelection _selection = TanreiDateSelection(
    value: _date('value'),
    start: _date('start'),
    end: _date('end'),
  );

  GalleryFixture get _fixture => widget.fixture;

  bool get _modal =>
      TanreiDatePickerPresentation.fromName(_fixture.string('presentation')) ==
      TanreiDatePickerPresentation.modal;

  DateTime? _date(String prop) => TanreiDatePicker.parseDate(_fixture.string(prop));

  Locale? get _locale {
    final String tag = _fixture.string('locale');
    if (tag.isEmpty) {
      return null;
    }
    final List<String> parts = tag.split('-');
    return Locale(parts.first, parts.length > 1 ? parts[1] : null);
  }

  List<DateTime> get _disabledDates => <DateTime>[
    for (final String iso in _fixture.strings('disabledDates'))
      if (TanreiDatePicker.parseDate(iso) case final DateTime date) date,
  ];

  TanreiDatePickerLabels get _labels => TanreiDatePickerLabels(
    label: _fixture.string('label'),
    dateLabel: _fixture.string('dateLabel'),
    startLabel: _fixture.string('startLabel'),
    endLabel: _fixture.string('endLabel'),
    confirmLabel: _fixture.string('confirmLabel'),
    cancelLabel: _fixture.string('cancelLabel'),
    previousMonthLabel: _fixture.string('previousMonthLabel'),
    nextMonthLabel: _fixture.string('nextMonthLabel'),
    yearViewLabel: _fixture.string('yearViewLabel'),
    textEntryLabel: _fixture.string('textEntryLabel'),
    calendarEntryLabel: _fixture.string('calendarEntryLabel'),
    todayLabel: _fixture.string('todayLabel'),
    invalidText: _fixture.string('invalidText'),
    unavailableText: _fixture.string('unavailableText'),
  );

  void _changed(TanreiDateSelection selection) => setState(() => _selection = selection);

  @override
  void initState() {
    super.initState();
    if (_modal && _fixture.boolean('open')) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _open());
    }
  }

  void _open() {
    final BuildContext? context = _page.currentContext;
    if (context == null) {
      return;
    }
    showTanreiDatePicker(
      context: context,
      useRootNavigator: false,
      mode: TanreiDatePickerMode.fromName(_fixture.string('mode')),
      value: _selection.value,
      start: _selection.start,
      end: _selection.end,
      firstDate: _date('min'),
      lastDate: _date('max'),
      disabledDates: _disabledDates,
      currentDate: _date('today'),
      firstDayOfWeek: TanreiDatePickerFirstDayOfWeek.fromName(_fixture.string('firstDayOfWeek')),
      locale: _locale,
      entryMode: TanreiDatePickerEntryMode.fromName(_fixture.string('entryMode')),
      startView: TanreiDatePickerStartView.fromName(_fixture.string('startView')),
      labels: _labels,
      onChanged: _changed,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_modal) {
      return SizedBox.fromSize(
        size: GalleryDatePicker.modalStage,
        child: Navigator(
          onGenerateRoute: (RouteSettings settings) => PageRouteBuilder<void>(
            pageBuilder: (BuildContext context, _, _) => Center(
              key: _page,
              child: TanreiButton(onPressed: _open, child: const Text('Open')),
            ),
          ),
        ),
      );
    }
    return SizedBox.fromSize(
      size: GalleryDatePicker.dockedStage,
      child: Center(
        child: TanreiDatePicker(
          presentation: TanreiDatePickerPresentation.docked,
          mode: TanreiDatePickerMode.fromName(_fixture.string('mode')),
          value: _selection.value,
          start: _selection.start,
          end: _selection.end,
          firstDate: _date('min'),
          lastDate: _date('max'),
          disabledDates: _disabledDates,
          currentDate: _date('today'),
          firstDayOfWeek: TanreiDatePickerFirstDayOfWeek.fromName(
            _fixture.string('firstDayOfWeek'),
          ),
          locale: _locale,
          startView: TanreiDatePickerStartView.fromName(_fixture.string('startView')),
          labels: _labels,
          onChanged: _changed,
        ),
      ),
    );
  }
}

/// A time picker fixture (TMP-1's `verify`): presented with `showTanreiTimePicker` over a 480 x 640
/// stage (720 x 480 for the horizontal layout); it opens by itself, and its page's button opens it
/// again. The fixture's value arrives as "HH:MM" and is read with `TanreiTimeOfDay.parse`; what is
/// committed is kept, as a product's owner does. A Japanese fixture gets the gallery's Japanese time
/// words (the package ships English only, TMP-27).
class GalleryTimePicker extends StatefulWidget {
  /// Shows [fixture].
  const GalleryTimePicker({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  /// The stage of the vertical fixtures.
  static const Size verticalStage = Size(480, 640);

  /// The stage of the horizontal fixture.
  static const Size horizontalStage = Size(720, 480);

  @override
  State<GalleryTimePicker> createState() => _GalleryTimePickerState();
}

class _GalleryTimePickerState extends State<GalleryTimePicker> {
  final GlobalKey _page = GlobalKey();
  late TanreiTimeOfDay? _time = TanreiTimeOfDay.parse(_fixture.string('value'));

  GalleryFixture get _fixture => widget.fixture;

  TanreiTimePickerLayout get _layout => TanreiTimePickerLayout.fromName(_fixture.string('layout'));

  Locale? get _locale {
    final String tag = _fixture.string('locale');
    if (tag.isEmpty) {
      return null;
    }
    final List<String> parts = tag.split('-');
    return Locale(parts.first, parts.length > 1 ? parts[1] : null);
  }

  TanreiTimePickerLabels get _labels => TanreiTimePickerLabels(
    label: _fixture.string('label'),
    hourLabel: _fixture.string('hourLabel'),
    minuteLabel: _fixture.string('minuteLabel'),
    confirmLabel: _fixture.string('confirmLabel'),
    cancelLabel: _fixture.string('cancelLabel'),
    textEntryLabel: _fixture.string('textEntryLabel'),
    dialEntryLabel: _fixture.string('dialEntryLabel'),
    invalidText: _fixture.string('invalidText'),
  );

  @override
  void initState() {
    super.initState();
    if (_fixture.boolean('open')) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _open());
    }
  }

  void _open() {
    final BuildContext? context = _page.currentContext;
    if (context == null) {
      return;
    }
    showTanreiTimePicker(
      context: context,
      useRootNavigator: false,
      initialTime: _time,
      hourCycle: TanreiTimePickerHourCycle.fromName(_fixture.string('hourCycle')),
      entryMode: TanreiTimePickerEntryMode.fromName(_fixture.string('entryMode')),
      unit: TanreiTimePickerUnit.fromName(_fixture.string('unit')),
      layout: _layout,
      locale: _locale,
      labels: _labels,
      onChanged: (TanreiTimeOfDay time) => setState(() => _time = time),
    );
  }

  @override
  Widget build(BuildContext context) {
    Widget navigator = Navigator(
      onGenerateRoute: (RouteSettings settings) => PageRouteBuilder<void>(
        pageBuilder: (BuildContext context, _, _) => Center(
          key: _page,
          child: TanreiButton(onPressed: _open, child: const Text('Open')),
        ),
      ),
    );
    final Locale? locale = _locale;
    if (locale != null && locale.languageCode == 'ja') {
      navigator = Localizations(
        locale: locale,
        delegates: const <LocalizationsDelegate<dynamic>>[
          _GalleryJapaneseTimeDelegate(),
          DefaultWidgetsLocalizations.delegate,
        ],
        child: navigator,
      );
    }
    return SizedBox.fromSize(
      size: _layout == TanreiTimePickerLayout.horizontal
          ? GalleryTimePicker.horizontalStage
          : GalleryTimePicker.verticalStage,
      child: navigator,
    );
  }
}

/// Japanese time words and patterns (CLDR's `ja`) for the gallery's Japanese fixture: the period
/// before the hour ("aK:mm"). Only the time picker's members are Japanese.
class _GalleryJapaneseTimeLocalizations extends TanreiEnglishDateLocalizations {
  const _GalleryJapaneseTimeLocalizations() : super(locale: const Locale('ja', 'JP'));

  @override
  String get anteMeridiemAbbreviation => '午前';

  @override
  String get postMeridiemAbbreviation => '午後';

  @override
  String get preferredHourMinutePattern => 'H:mm';

  @override
  String get hourMinutePattern12 => 'aK:mm';

  @override
  String get hourMinutePattern24 => 'H:mm';
}

class _GalleryJapaneseTimeDelegate extends LocalizationsDelegate<TanreiDateLocalizations> {
  const _GalleryJapaneseTimeDelegate();

  @override
  bool isSupported(Locale locale) => locale.languageCode == 'ja';

  @override
  Future<TanreiDateLocalizations> load(Locale locale) =>
      SynchronousFuture<TanreiDateLocalizations>(const _GalleryJapaneseTimeLocalizations());

  @override
  bool shouldReload(_GalleryJapaneseTimeDelegate old) => false;
}

/// A carousel fixture: a 400 x 200 stage the carousel fills, each item's glyph
/// centred in its content box at `sys.icon.large` in the item's content color.
class GalleryCarousel extends StatelessWidget {
  /// Shows [fixture].
  const GalleryCarousel({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  /// The stage of every carousel fixture.
  static const Size stage = Size(400, 200);

  @override
  Widget build(BuildContext context) => SizedBox.fromSize(
    size: stage,
    child: TanreiCarousel(
      layout: TanreiCarouselLayout.fromName(fixture.string('layout')),
      itemWidth: (fixture.props['itemWidth'] as num?)?.toDouble(),
      semanticLabel: fixture.string('label'),
      children: <TanreiCarouselItem>[
        for (final GalleryItem item in fixture.items)
          TanreiCarouselItem(
            label: item.string('label'),
            onTap: () {},
            child: Center(
              child: Builder(
                builder: (BuildContext context) => TanreiControlIcon(
                  icon: galleryIcon(item.content),
                  size: TanreiTheme.of(context).system.measure.iconLarge,
                  selected: false,
                  color: IconTheme.of(context).color!,
                ),
              ),
            ),
          ),
      ],
    ),
  );
}

/// A tooltip fixture: a stage of 320 x 200 with an overlay, the anchor — a medium
/// standard icon button showing the fixture's glyph — at its centre, and the tooltip open beside
/// it. Hover, focus and long-press work as in a product.
class GalleryTooltip extends StatefulWidget {
  /// Shows [fixture].
  const GalleryTooltip({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  /// The stage of every tooltip fixture.
  static const Size stage = Size(320, 200);

  @override
  State<GalleryTooltip> createState() => _GalleryTooltipState();
}

class _GalleryTooltipState extends State<GalleryTooltip> {
  late final TanreiTooltipController _controller = TanreiTooltipController(
    open: widget.fixture.boolean('open'),
  );

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final GalleryFixture fixture = widget.fixture;
    return SizedBox.fromSize(
      size: GalleryTooltip.stage,
      child: Overlay.wrap(
        child: Center(
          child: TanreiTooltip(
            message: fixture.string('text'),
            title: fixture.string('title'),
            variant: TanreiTooltipVariant.fromName(fixture.string('variant')),
            placement: TanreiTooltipPlacement.fromName(fixture.string('placement')),
            excludeFromSemantics: !fixture.boolean('describes'),
            controller: _controller,
            child: TanreiIconButton(
              onPressed: () {},
              semanticLabel: fixture.content ?? '',
              icon: galleryIcon(fixture.content),
            ),
          ),
        ),
      ),
    );
  }
}

/// A dialog fixture: a 480 x 640 stage with a navigator of its own, in which the dialog is
/// presented with `showTanreiDialog` — so it is modal within the stage only — with the fixture's
/// slots filled and its `content` in the default slot. The actions close it
/// (as does Escape, where the fixture is dismissible); "Open" presents it again.
class GalleryDialog extends StatefulWidget {
  /// Shows [fixture].
  const GalleryDialog({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  /// The stage of every dialog fixture.
  static const Size stage = Size(480, 640);

  @override
  State<GalleryDialog> createState() => _GalleryDialogState();
}

class _GalleryDialogState extends State<GalleryDialog> {
  final GlobalKey _page = GlobalKey();

  @override
  void initState() {
    super.initState();
    if (widget.fixture.boolean('open')) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _open());
    }
  }

  void _open() {
    final BuildContext? context = _page.currentContext;
    if (context == null) {
      return;
    }
    final GalleryFixture fixture = widget.fixture;
    // The icon and actions slots as the fixture fills them; the actions close it.
    showTanreiDialog<void>(
      context: context,
      useRootNavigator: false,
      barrierDismissible: fixture.boolean('dismissible'),
      builder: (BuildContext dialog) => TanreiDialog(
        headline: fixture.string('headline'),
        supportingText: fixture.string('supportingText'),
        alert: fixture.boolean('alert'),
        icon: fixture.slot('icon').firstOrNull,
        actions: fixture.slot('actions', onPressed: () => Navigator.of(dialog).pop()),
        child: fixture.content == null ? null : Text(fixture.content!),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => SizedBox.fromSize(
    size: GalleryDialog.stage,
    child: Navigator(
      onGenerateRoute: (RouteSettings settings) => PageRouteBuilder<void>(
        pageBuilder: (BuildContext context, _, _) => Center(
          key: _page,
          child: TanreiButton(onPressed: _open, child: const Text('Open')),
        ),
      ),
    ),
  );
}

/// A menu fixture (MNU-19's `verify`): the open menu drawn in place (`TanreiMenuAnchor.inPlace`),
/// holding the fixture's items in order, a group item holding its own. Checkbox items and groups
/// start from the fixture and keep what is chosen, as a product's owner does.
class GalleryMenu extends StatefulWidget {
  /// Shows [fixture].
  const GalleryMenu({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  @override
  State<GalleryMenu> createState() => _GalleryMenuState();
}

class _GalleryMenuState extends State<GalleryMenu> {
  /// The checked state of each checkbox item and the value of each group, by the item's position.
  final Map<GalleryItem, bool> _checked = <GalleryItem, bool>{};
  final Map<GalleryItem, String?> _groupValues = <GalleryItem, String?>{};

  @override
  Widget build(BuildContext context) => TanreiMenuAnchor.inPlace(
    placement: TanreiMenuPlacement.fromName(widget.fixture.string('placement')),
    menuChildren: <Widget>[for (final GalleryItem item in widget.fixture.items) _entry(item)],
  );

  Widget _entry(GalleryItem item) {
    final Widget label = Text(item.string('label'));
    final bool disabled = item.boolean('disabled');
    return switch (item.kind) {
      'checkbox-item' => TanreiCheckboxMenuItem(
        value: _checked[item] ?? item.boolean('checked'),
        onChanged: disabled ? null : (bool value) => setState(() => _checked[item] = value),
        supportingText: item.string('supportingText'),
        leadingIcon: galleryItemIcon(item.string('leadingIcon')),
        trailingIcon: galleryItemIcon(item.string('trailingIcon')),
        trailingText: item.string('trailingText'),
        child: label,
      ),
      'radio-item' => TanreiRadioMenuItem<String>(
        value: item.string('value'),
        enabled: !disabled,
        supportingText: item.string('supportingText'),
        leadingIcon: galleryItemIcon(item.string('leadingIcon')),
        trailingIcon: galleryItemIcon(item.string('trailingIcon')),
        trailingText: item.string('trailingText'),
        child: label,
      ),
      'group' => TanreiMenuGroup<String>(
        title: item.string('title'),
        groupValue: _groupValues.containsKey(item) ? _groupValues[item] : item.maybeString('value'),
        onChanged: (String value) => setState(() => _groupValues[item] = value),
        children: <Widget>[for (final GalleryItem inner in item.items) _entry(inner)],
      ),
      _ => TanreiMenuItem(
        onPressed: disabled ? null : () {},
        destructive: item.boolean('destructive'),
        supportingText: item.string('supportingText'),
        leadingIcon: galleryItemIcon(item.string('leadingIcon')),
        trailingIcon: galleryItemIcon(item.string('trailingIcon')),
        trailingText: item.string('trailingText'),
        child: label,
      ),
    };
  }
}

/// An icon-button fixture. A toggle fixture starts from its `selected` and switches when pressed,
/// as a product's owner of the value does.
class GalleryIconButton extends StatefulWidget {
  /// Shows [fixture].
  const GalleryIconButton({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  @override
  State<GalleryIconButton> createState() => _GalleryIconButtonState();
}

class _GalleryIconButtonState extends State<GalleryIconButton> {
  late bool? _selected = widget.fixture.boolean('toggle')
      ? widget.fixture.boolean('selected')
      : null;

  @override
  Widget build(BuildContext context) {
    final GalleryFixture fixture = widget.fixture;
    return TanreiIconButton(
      onPressed: fixture.boolean('disabled')
          ? null
          : () => setState(
              () => _selected = switch (_selected) {
                final bool selected => !selected,
                null => null,
              },
            ),
      isSelected: _selected,
      variant: TanreiIconButtonVariant(fixture.string('variant')),
      size: TanreiIconButtonSize(fixture.string('size')),
      semanticLabel: fixture.string('label'),
      icon: galleryIcon(fixture.content),
    );
  }
}

/// A checkbox fixture. It starts from the fixture's `checked` / `indeterminate` and switches when
/// pressed, as a product's owner of the value does (an indeterminate one becomes checked, CHK-2).
class GalleryCheckbox extends StatefulWidget {
  /// Shows [fixture].
  const GalleryCheckbox({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  @override
  State<GalleryCheckbox> createState() => _GalleryCheckboxState();
}

class _GalleryCheckboxState extends State<GalleryCheckbox> {
  late bool? _value = widget.fixture.boolean('indeterminate')
      ? null
      : widget.fixture.boolean('checked');

  @override
  Widget build(BuildContext context) {
    final GalleryFixture fixture = widget.fixture;
    return TanreiCheckbox(
      value: _value,
      tristate: fixture.boolean('indeterminate'),
      isError: fixture.boolean('error'),
      onChanged: fixture.boolean('disabled')
          ? null
          : (bool value) => setState(() => _value = value),
      label: fixture.string('label'),
      labelHidden: fixture.boolean('labelHidden'),
    );
  }
}

/// A radio-button fixture: the option in a `TanreiRadioGroup` of its own (the fixture's `name`),
/// selected while the fixture says so, and selected when pressed.
class GalleryRadioButton extends StatefulWidget {
  /// Shows [fixture].
  const GalleryRadioButton({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  @override
  State<GalleryRadioButton> createState() => _GalleryRadioButtonState();
}

class _GalleryRadioButtonState extends State<GalleryRadioButton> {
  late String? _groupValue = widget.fixture.boolean('selected')
      ? widget.fixture.string('value')
      : null;

  @override
  Widget build(BuildContext context) {
    final GalleryFixture fixture = widget.fixture;
    return TanreiRadioGroup<String>(
      groupValue: _groupValue,
      semanticLabel: fixture.string('name'),
      onChanged: (String value) => setState(() => _groupValue = value),
      child: TanreiRadioButton<String>(
        value: fixture.string('value'),
        enabled: !fixture.boolean('disabled'),
        label: fixture.string('label'),
        labelHidden: fixture.boolean('labelHidden'),
      ),
    );
  }
}

/// A switch fixture. It starts from the fixture's `selected` and switches when pressed; its
/// `selectedIcon` / `unselectedIcon` names become the `thumbIcon` (an empty name: no glyph).
class GallerySwitch extends StatefulWidget {
  /// Shows [fixture].
  const GallerySwitch({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  @override
  State<GallerySwitch> createState() => _GallerySwitchState();
}

class _GallerySwitchState extends State<GallerySwitch> {
  late bool _value = widget.fixture.boolean('selected');

  @override
  Widget build(BuildContext context) {
    final GalleryFixture fixture = widget.fixture;
    final String on = fixture.string('selectedIcon');
    final String off = fixture.string('unselectedIcon');
    return TanreiSwitch(
      value: _value,
      onChanged: fixture.boolean('disabled')
          ? null
          : (bool value) => setState(() => _value = value),
      thumbIcon: on.isEmpty && off.isEmpty
          ? null
          : WidgetStateProperty.resolveWith<Widget?>((Set<WidgetState> states) {
              final String name = states.contains(WidgetState.selected) ? on : off;
              return name.isEmpty ? null : galleryIcon(name);
            }),
      label: fixture.string('label'),
      labelHidden: fixture.boolean('labelHidden'),
    );
  }
}

/// A card fixture: the fixture's content as body text, in a card as wide as four of the largest
/// spacing step (a card grows with its content, so the frame fixes only its width).
class GalleryCard extends StatelessWidget {
  /// Shows [fixture].
  const GalleryCard({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: TanreiTheme.of(context).system.space.space900 * 4,
      child: TanreiCard(
        onTap: fixture.boolean('interactive') ? () {} : null,
        enabled: !fixture.boolean('disabled'),
        variant: TanreiCardVariant(fixture.string('variant')),
        inset: fixture.boolean('inset'),
        semanticLabel: fixture.string('label'),
        // Plain text: the card draws it in the body style and its content color (CRD-13).
        child: Text(fixture.content ?? ''),
      ),
    );
  }
}

/// A chip fixture. A filter chip starts from the fixture's `selected` and switches when pressed, as
/// a product's owner of the value does; an input chip's remove action does nothing (the gallery
/// keeps its fixtures). The `avatar` content is a stand-in: a square of the secondary color, clipped
/// by the chip; the fixtures carry no image.
class GalleryChip extends StatefulWidget {
  /// Shows [fixture].
  const GalleryChip({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  @override
  State<GalleryChip> createState() => _GalleryChipState();
}

class _GalleryChipState extends State<GalleryChip> {
  late bool _selected = widget.fixture.boolean('selected');

  @override
  Widget build(BuildContext context) {
    final GalleryFixture fixture = widget.fixture;
    final TanreiChipVariant variant = TanreiChipVariant(fixture.string('variant'));
    final TanreiChipSize size = TanreiChipSize(fixture.string('size'));
    final bool isEnabled = !fixture.boolean('disabled');
    final String label = fixture.string('label');
    final Widget? icon = fixture.content == null || fixture.content == 'avatar'
        ? null
        : galleryIcon(fixture.content);
    return switch (fixture.string('kind')) {
      'filter' => TanreiChip.filter(
        label: label,
        selected: _selected,
        onSelected: (bool value) => setState(() => _selected = value),
        icon: icon,
        variant: variant,
        size: size,
        isEnabled: isEnabled,
      ),
      'input' => TanreiChip.input(
        label: label,
        removeSemanticLabel: fixture.string('removeLabel'),
        onDeleted: () {},
        avatar: fixture.content == 'avatar'
            ? ColoredBox(color: TanreiTheme.of(context).colors.secondary)
            : null,
        icon: icon,
        variant: variant,
        size: size,
        isEnabled: isEnabled,
      ),
      _ => TanreiChip(
        label: label,
        onPressed: () {},
        icon: icon,
        variant: variant,
        size: size,
        isEnabled: isEnabled,
      ),
    };
  }
}

/// A text-field fixture, as wide as a card fixture, holding its own value (it is editable). The
/// icons its `content` names (`leading-icon=<glyph> trailing-icon=<glyph>`) are decorative glyphs.
class GalleryTextField extends StatelessWidget {
  /// Shows [fixture].
  const GalleryTextField({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  @override
  Widget build(BuildContext context) {
    final Map<String, String> slots = <String, String>{
      for (final String part in (fixture.content ?? '').split(' '))
        if (part.contains('=')) part.split('=').first: part.split('=').last,
    };
    Widget? icon(String slot) =>
        slots[slot] == null ? null : ExcludeSemantics(child: galleryIcon(slots[slot]));
    int number(String prop) => (fixture.props[prop] as num? ?? 0).toInt();
    final int maxRows = number('maxRows');
    return SizedBox(
      width: TanreiTheme.of(context).system.space.space900 * 4,
      child: TanreiTextField(
        initialValue: fixture.string('value'),
        labelText: fixture.string('label'),
        labelHidden: fixture.boolean('labelHidden'),
        variant: TanreiTextFieldVariant(fixture.string('variant')),
        size: TanreiTextFieldSize(fixture.string('size')),
        type: TanreiTextFieldType.fromName(fixture.string('type')),
        hintText: fixture.string('placeholder'),
        helperText: fixture.string('supportingText'),
        errorText: fixture.string('errorText'),
        isError: fixture.boolean('error'),
        enabled: !fixture.boolean('disabled'),
        readOnly: fixture.boolean('readOnly'),
        isRequired: fixture.boolean('required'),
        multiline: fixture.boolean('multiline'),
        minLines: number('minRows'),
        maxLines: maxRows == 0 ? null : maxRows,
        maxLength: number('maxLength'),
        showCounter: fixture.boolean('counter'),
        prefixText: fixture.string('prefixText'),
        suffixText: fixture.string('suffixText'),
        autofillHints: TanreiTextField.autofillHintsFromHtml(fixture.string('autocomplete')),
        leadingIcon: icon('leading-icon'),
        trailingIcon: icon('trailing-icon'),
      ),
    );
  }
}

/// A divider fixture in a frame of its own: a divider spans the container it is given, and a
/// fixture's column gives a vertical one no height.
class GalleryDivider extends StatelessWidget {
  /// Shows [fixture].
  const GalleryDivider({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  @override
  Widget build(BuildContext context) {
    final TanreiSpace space = TanreiTheme.of(context).system.space;
    return SizedBox(
      width: space.space900 * 2,
      height: space.space600,
      child: Center(
        child: TanreiDivider(
          axis: TanreiDivider.axisFromName(fixture.string('orientation')),
          inset: TanreiDividerInset.fromName(fixture.string('inset')),
          excludeFromSemantics: fixture.boolean('decorative'),
        ),
      ),
    );
  }
}

/// A badge fixture on its anchor: the glyph the fixture's content names, drawn as the system draws
/// an icon at `sys.icon.large` in on-surface-variant, named by that glyph name (the spec's default
/// slot); the badge adds the fixture's label as the value.
class GalleryBadge extends StatelessWidget {
  /// Shows [fixture].
  const GalleryBadge({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    final double size = theme.system.measure.iconLarge;
    return Padding(
      // Room for the badge above and past the anchor's corner.
      padding: EdgeInsets.all(theme.system.space.space100),
      child: TanreiBadge(
        count: fixture.props['count'] as num?,
        max: fixture.props['max'] as num? ?? TanreiBadge.defaultMax,
        semanticLabel: fixture.string('label'),
        // The spec's default slot: in fixtures the anchor is named by its glyph name; the badge
        // adds the label as the value.
        child: Semantics(
          label: fixture.content ?? '',
          child: SizedBox.square(
            dimension: size,
            child: TanreiControlIcon(
              icon: galleryIcon(fixture.content),
              size: size,
              selected: false,
              color: theme.colors.onSurfaceVariant,
            ),
          ),
        ),
      ),
    );
  }
}

/// A progress indicator fixture. A bar fills the width it is given, so it gets the divider's
/// frame width; a ring has its own size.
class GalleryProgressIndicator extends StatelessWidget {
  /// Shows [fixture].
  const GalleryProgressIndicator({super.key, required this.fixture});

  /// The fixture, with the spec's defaults filled in.
  final GalleryFixture fixture;

  @override
  Widget build(BuildContext context) {
    final TanreiSpace space = TanreiTheme.of(context).system.space;
    final TanreiProgressIndicatorVariant variant = TanreiProgressIndicatorVariant.fromName(
      fixture.string('variant'),
    );
    return SizedBox(
      width: variant == TanreiProgressIndicatorVariant.linear ? space.space900 * 2 : null,
      child: TanreiProgressIndicator(
        variant: variant,
        size: TanreiProgressIndicatorSize(fixture.string('size')),
        value: (fixture.props['value'] as num?)?.toDouble(),
        min: (fixture.props['min']! as num).toDouble(),
        max: (fixture.props['max']! as num).toDouble(),
        semanticsLabel: fixture.string('label'),
        semanticsValue: fixture.string('valueText'),
      ),
    );
  }
}

/// Where the specs are bundled from: copies of the repository's `specs/*.spec.json` that
/// `tool/copy_specs.dart` makes (gitignored). Without them the gallery says how to make them.
const String gallerySpecsDirectory = 'assets/specs/';

/// The component specs in [bundle], by name. Only `*.spec.json` files are specs.
Future<List<GallerySpec>> loadGallerySpecs(AssetBundle bundle) async {
  final AssetManifest manifest = await AssetManifest.loadFromAssetBundle(bundle);
  final List<String> keys =
      manifest
          .listAssets()
          .where((String key) => key.startsWith(gallerySpecsDirectory))
          .where((String key) => key.endsWith('.spec.json'))
          .toList()
        ..sort();
  return <GallerySpec>[
    for (final String key in keys)
      // Decoded here rather than with `loadString`, which moves a large file to an isolate.
      GallerySpec.fromJson(
        jsonDecode(utf8.decode((await bundle.load(key)).buffer.asUint8List()))
            as Map<String, Object?>,
      ),
  ];
}

/// The part of one component spec the gallery reads: its name, title, prop defaults and fixtures.
@immutable
class GallerySpec {
  /// Describes a spec.
  const GallerySpec({required this.name, required this.title, required this.fixtures});

  /// Reads a parsed `*.spec.json`.
  factory GallerySpec.fromJson(Map<String, Object?> json) {
    final String name = json['name']! as String;
    Map<String, Object?> defaultsOf(Object? props) => <String, Object?>{
      for (final Map<String, Object?> prop
          in (props as List<Object?>? ?? const <Object?>[]).cast<Map<String, Object?>>())
        if (prop.containsKey('default')) prop['name']! as String: prop['default'],
    };
    final Map<String, Object?> defaults = defaultsOf(json['props']);
    // Each item kind declares its own props and their defaults.
    final Map<String, Map<String, Object?>> kindDefaults = <String, Map<String, Object?>>{
      for (final Map<String, Object?> kind
          in (json['items'] as List<Object?>? ?? const <Object?>[]).cast<Map<String, Object?>>())
        kind['name']! as String: defaultsOf(kind['props']),
    };
    // What a fixture's string becomes in each slot that declares it.
    final Map<String, String> slotKinds = <String, String>{
      for (final Map<String, Object?> slot
          in (json['slots'] as List<Object?>? ?? const <Object?>[]).cast<Map<String, Object?>>())
        if (slot['fixture'] case final String kind) slot['name']! as String: kind,
    };
    List<GalleryItem> itemsOf(Object? items) => <GalleryItem>[
      for (final Map<String, Object?> item
          in (items as List<Object?>? ?? const <Object?>[]).cast<Map<String, Object?>>())
        GalleryItem(
          kind: item['kind']! as String,
          props: <String, Object?>{
            ...?kindDefaults[item['kind']],
            ...(item['props'] as Map<String, Object?>? ?? const <String, Object?>{}),
          },
          content: item['content'] as String?,
          items: itemsOf(item['items']),
        ),
    ];
    return GallerySpec(
      name: name,
      title: json['title'] as String? ?? name,
      fixtures: <GalleryFixture>[
        for (final Map<String, Object?> fixture
            in (json['fixtures'] as List<Object?>? ?? const <Object?>[])
                .cast<Map<String, Object?>>())
          GalleryFixture(
            component: name,
            id: fixture['id']! as String,
            props: <String, Object?>{
              ...defaults,
              ...(fixture['props'] as Map<String, Object?>? ?? const <String, Object?>{}),
            },
            content: fixture['content'] as String?,
            items: itemsOf(fixture['items']),
            slotKinds: slotKinds,
            slots: <String, List<String>>{
              for (final MapEntry<String, Object?> slot
                  in (fixture['slots'] as Map<String, Object?>? ?? const <String, Object?>{})
                      .entries)
                slot.key: switch (slot.value) {
                  final String one => <String>[one],
                  final List<Object?> many => many.cast<String>(),
                  _ => const <String>[],
                },
            },
          ),
      ],
    );
  }

  /// The spec `name` (kebab-case), the key of [galleryComponents].
  final String name;

  /// The human title.
  final String title;

  /// The fixtures, in spec order: the same ones every platform's baselines show.
  final List<GalleryFixture> fixtures;
}

/// One fixture of a spec.
@immutable
class GalleryFixture {
  /// Describes a fixture.
  const GalleryFixture({
    required this.component,
    required this.id,
    required this.props,
    this.content,
    this.items = const <GalleryItem>[],
    this.slots = const <String, List<String>>{},
    this.slotKinds = const <String, String>{},
  });

  /// The spec `name` of the component.
  final String component;

  /// The fixture id in the spec.
  final String id;

  /// The fixture's props, over the defaults the spec declares.
  final Map<String, Object?> props;

  /// The default slot's text, if the fixture has one.
  final String? content;

  /// The fixture's items in order, each with its kind's defaults filled in.
  final List<GalleryItem> items;

  /// The strings the fixture puts into named slots, one or several per slot.
  final Map<String, List<String>> slots;

  /// What a string becomes in each slot of the spec that a fixture can fill, as the slot's
  /// `fixture` declares it: `glyph`, `icon-button`, `button` or `text`.
  final Map<String, String> slotKinds;

  /// The widgets the fixture puts into [slot], drawn as the slot's kind says: a glyph
  /// (for the component's icon helper), a standard icon button showing the glyph and labelled by its
  /// name, a text-variant button with the label, or plain text. [onPressed] is what the buttons do.
  List<Widget> slot(String slot, {VoidCallback? onPressed}) => <Widget>[
    for (final String value in slots[slot] ?? const <String>[])
      switch (slotKinds[slot]) {
        'glyph' => galleryIcon(value),
        'icon-only-button' => TanreiIconButton(
          onPressed: onPressed ?? () {},
          icon: galleryIcon(value),
          semanticLabel: value,
        ),
        'button' => TanreiButton(
          variant: TanreiButtonVariant.text,
          onPressed: onPressed ?? () {},
          child: Text(value),
        ),
        _ => Text(value),
      },
  ];

  /// A string prop (an enum or an open key).
  String string(String prop) => props[prop]! as String;

  /// A boolean prop; absent without a default is false.
  bool boolean(String prop) => props[prop] as bool? ?? false;

  /// A list-of-strings prop (`strings`); absent is empty.
  List<String> strings(String prop) =>
      (props[prop] as List<Object?>? ?? const <Object?>[]).cast<String>();
}

/// One item of a fixture: a list item, a menu item or a group, of a kind the spec
/// declares with its own props.
@immutable
class GalleryItem {
  /// Describes an item.
  const GalleryItem({
    required this.kind,
    required this.props,
    this.content,
    this.items = const <GalleryItem>[],
  });

  /// The item kind, as the spec's `items` name it.
  final String kind;

  /// The item's props, over the defaults its kind declares.
  final Map<String, Object?> props;

  /// The item's text or glyph, if it has one.
  final String? content;

  /// The items a group kind holds.
  final List<GalleryItem> items;

  /// A string prop; absent without a default is empty.
  String string(String prop) => props[prop] as String? ?? '';

  /// A string prop that may be null (a group's `value`).
  String? maybeString(String prop) => props[prop] as String?;

  /// A boolean prop; absent without a default is false.
  bool boolean(String prop) => props[prop] as bool? ?? false;

  /// A number prop as an int; absent is 0.
  int integer(String prop) => (props[prop] as num? ?? 0).toInt();
}

/// Every design system the package ships: the default and the presets.
const List<TanreiSystem> gallerySystems = <TanreiSystem>[
  tanreiSystem,
  m3LikeSystem,
  cupertinoSystem,
];

/// The gallery: every fixture of every spec in [galleryComponents] under every system, in the
/// theme and contrast the switches select.
///
/// It is a `WidgetsApp`, not a `MaterialApp`: Tanrei needs nothing from Material or Cupertino.
class GalleryApp extends StatefulWidget {
  /// Creates the gallery of [specs] (see [loadGallerySpecs]).
  const GalleryApp({super.key, required this.specs});

  /// The component specs, as bundled from the repository's `specs/`.
  final List<GallerySpec> specs;

  @override
  State<GalleryApp> createState() => _GalleryAppState();
}

class _GalleryAppState extends State<GalleryApp> {
  Brightness _brightness = Brightness.light;
  TanreiContrast _contrast = TanreiContrast.standard;

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData chrome = TanreiThemeData(brightness: _brightness, contrast: _contrast);
    return WidgetsApp(
      title: 'Tanrei gallery',
      color: chrome.colors.primary,
      debugShowCheckedModeBanner: false,
      builder: (BuildContext context, Widget? _) => TanreiTheme(
        data: chrome,
        child: ColoredBox(
          color: chrome.colors.surface,
          child: SafeArea(
            child: FocusScope(
              autofocus: true,
              child: SingleChildScrollView(
                padding: EdgeInsets.all(chrome.system.space.space300),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  spacing: chrome.system.space.space300,
                  children: <Widget>[
                    _Switches(
                      brightness: _brightness,
                      contrast: _contrast,
                      onBrightness: (Brightness value) => setState(() => _brightness = value),
                      onContrast: (TanreiContrast value) => setState(() => _contrast = value),
                    ),
                    if (widget.specs.isEmpty)
                      Text(
                        'No specs are bundled. Run `dart run tool/copy_specs.dart` in example/, '
                        'then build again.',
                        style: chrome.system.typescale.body.toTextStyle(
                          color: chrome.colors.onSurface,
                        ),
                      ),
                    for (final TanreiSystem system in gallerySystems)
                      SystemSection(
                        key: ValueKey<String>(system.id),
                        theme: TanreiThemeData(
                          brightness: _brightness,
                          contrast: _contrast,
                          system: system,
                        ),
                        specs: widget.specs,
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// The theme and contrast switches, made of Tanrei buttons: the selected value is tonal.
class _Switches extends StatelessWidget {
  const _Switches({
    required this.brightness,
    required this.contrast,
    required this.onBrightness,
    required this.onContrast,
  });

  final Brightness brightness;
  final TanreiContrast contrast;
  final ValueChanged<Brightness> onBrightness;
  final ValueChanged<TanreiContrast> onContrast;

  @override
  Widget build(BuildContext context) {
    final TanreiThemeData theme = TanreiTheme.of(context);
    Widget choice<T>(T value, T selected, ValueChanged<T> onChanged, String label) => Semantics(
      selected: value == selected,
      child: TanreiButton(
        key: ValueKey<String>('switch-$label'),
        onPressed: () => onChanged(value),
        variant: value == selected ? TanreiButtonVariant.tonal : TanreiButtonVariant.outlined,
        size: TanreiButtonSize.small,
        child: Text(label),
      ),
    );
    return Wrap(
      spacing: theme.system.space.space100,
      runSpacing: theme.system.space.space100,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: <Widget>[
        for (final Brightness value in const <Brightness>[Brightness.light, Brightness.dark])
          choice(value, brightness, onBrightness, value.name),
        SizedBox(width: theme.system.space.space200),
        for (final TanreiContrast value in TanreiContrast.values)
          choice(value, contrast, onContrast, '${value.name} contrast'),
      ],
    );
  }
}

/// What the gallery says about the text font of [system].
///
/// A named family is shown as it is. A `system` stack (no family: `cupertino`) is drawn with the
/// font of the OS — except on Flutter web ([web]), where the engine cannot read the fonts installed
/// on the device: the text is then set in the Roboto the engine downloads, unless the app registers
/// the families the stack names. The gallery says so instead of claiming "the platform font".
String galleryFontNote(TanreiSystem system, {bool web = kIsWeb}) {
  final TanreiFontStack stack = system.typefaces.plain;
  final String? family = stack.resolve().fontFamily;
  if (family != null) {
    return 'font: $family';
  }
  if (!web) {
    return 'font: the platform font';
  }
  final String registered = stack.families.isEmpty
      ? 'a font'
      : stack.families.map((String name) => '"$name"').join(' or ');
  return 'font: the platform font — which Flutter web cannot read: this is the engine\'s Roboto '
      '(register $registered to choose)';
}

/// Every fixture of [specs] under one design system, on that system's own surface. A spec without
/// an entry in [galleryComponents] is not shown.
class SystemSection extends StatelessWidget {
  /// Shows the fixtures in [theme].
  const SystemSection({super.key, required this.theme, required this.specs});

  /// The design system, brightness and contrast of this section.
  final TanreiThemeData theme;

  /// The component specs.
  final List<GallerySpec> specs;

  @override
  Widget build(BuildContext context) {
    final TanreiSystem system = theme.system;
    final TanreiBehavior behavior = system.behavior;
    final Color onSurface = theme.colors.onSurface;
    return TanreiTheme(
      data: theme,
      child: DecoratedBox(
        decoration: TanreiContainerDecoration(
          shape: TanreiCornerShape(
            smoothing: system.shape.cornerSmoothing,
            radius: system.shape.medium,
          ),
          color: theme.colors.surface,
          border: Border.all(
            color: theme.colors.outlineVariant,
            width: system.measure.borderHairline,
          ),
        ),
        child: Padding(
          padding: EdgeInsets.all(system.space.space200),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: system.space.space150,
            children: <Widget>[
              // The card's title is heading-5, emphasized: the weight step of the
              // heading family on top of the role's weight.
              Text(
                system.id,
                style: theme.textStyle(
                  system.typescale.heading5,
                  emphasized: true,
                  color: onSurface,
                ),
              ),
              Text(
                'press: ${behavior.pressedFeedback.name} · '
                'corner smoothing: ${system.shape.cornerSmoothing} · '
                'focus: ${behavior.focusStyle.name} · ${galleryFontNote(system)}',
                style: system.typescale.bodySmall.toTextStyle(color: theme.colors.onSurfaceVariant),
              ),
              for (final GallerySpec spec in specs)
                if (galleryComponents[spec.name] case final GalleryBuilder build) ...<Widget>[
                  Text(
                    spec.title,
                    style: theme.textStyle(system.typescale.heading6, color: onSurface),
                  ),
                  Wrap(
                    spacing: system.space.space200,
                    runSpacing: system.space.space200,
                    crossAxisAlignment: WrapCrossAlignment.end,
                    children: <Widget>[
                      for (final GalleryFixture fixture in spec.fixtures)
                        Column(
                          mainAxisSize: MainAxisSize.min,
                          spacing: system.space.space50,
                          children: <Widget>[
                            KeyedSubtree(
                              key: ValueKey<String>(galleryKey(system, fixture)),
                              child: build(fixture),
                            ),
                            Text(
                              fixture.id,
                              style: system.typescale.labelSmall.toTextStyle(
                                color: theme.colors.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
                ],
            ],
          ),
        ),
      ),
    );
  }
}

/// The key of one fixture in the gallery: unique per system, component and fixture.
String galleryKey(TanreiSystem system, GalleryFixture fixture) =>
    '${system.id}/${fixture.component}/${fixture.id}';
