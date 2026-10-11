import 'dart:async';

import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

/// An item of a [TanreiItemGroupMixin]: a list item, a menu item. Implemented by the item's
/// `State`, which registers itself with [TanreiItemGroupMixin.maybeOf] (in
/// `didChangeDependencies`) and unregisters in `dispose`.
abstract interface class TanreiGroupItem {
  /// The node the item takes keyboard focus with.
  FocusNode get focusNode;

  /// The text typeahead matches: a list item's headline, a menu item's label.
  String get typeaheadText;

  /// Whether the item takes focus at all (a static list item does not).
  bool get takesFocus;
}

/// Where a key moves focus in a group.
enum TanreiGroupMove {
  /// The next item.
  next,

  /// The previous item.
  previous,

  /// The first item.
  first,

  /// The last item.
  last,
}

/// Typing within this window of the previous character extends the search; after it a new search
/// begins. The one second of LST-15 and MNU-7: a behaviour of the spec, not a design value.
const Duration tanreiTypeaheadWindow = Duration(seconds: 1);

class _GroupMoveIntent extends Intent {
  const _GroupMoveIntent(this.move, {this.mirrored = false});

  final TanreiGroupMove move;

  /// Whether the key names a side, not an order (Left and Right Arrow): in a right-to-left layout
  /// next and previous swap.
  final bool mirrored;
}

const Map<ShortcutActivator, Intent> _groupKeys = <ShortcutActivator, Intent>{
  SingleActivator(LogicalKeyboardKey.arrowDown): _GroupMoveIntent(TanreiGroupMove.next),
  SingleActivator(LogicalKeyboardKey.arrowUp): _GroupMoveIntent(TanreiGroupMove.previous),
  SingleActivator(LogicalKeyboardKey.home): _GroupMoveIntent(TanreiGroupMove.first),
  SingleActivator(LogicalKeyboardKey.end): _GroupMoveIntent(TanreiGroupMove.last),
};

const Map<ShortcutActivator, Intent> _rowKeys = <ShortcutActivator, Intent>{
  SingleActivator(LogicalKeyboardKey.arrowRight): _GroupMoveIntent(
    TanreiGroupMove.next,
    mirrored: true,
  ),
  SingleActivator(LogicalKeyboardKey.arrowLeft): _GroupMoveIntent(
    TanreiGroupMove.previous,
    mirrored: true,
  ),
  SingleActivator(LogicalKeyboardKey.home): _GroupMoveIntent(TanreiGroupMove.first),
  SingleActivator(LogicalKeyboardKey.end): _GroupMoveIntent(TanreiGroupMove.last),
};

/// A row whose Down and Up Arrow also move (a segmented button, SEG-18, as a radio group): Right and
/// Down to the next item, Left and Up to the previous one; Down and Up name an order, so they are
/// not mirrored.
const Map<ShortcutActivator, Intent> _rowAndColumnKeys = <ShortcutActivator, Intent>{
  ..._rowKeys,
  SingleActivator(LogicalKeyboardKey.arrowDown): _GroupMoveIntent(TanreiGroupMove.next),
  SingleActivator(LogicalKeyboardKey.arrowUp): _GroupMoveIntent(TanreiGroupMove.previous),
};

/// What a composite of focusable items does with the keyboard (a list, LST-15; a menu, MNU-7; a row
/// of tabs, TAB-12):
///
/// * Down and Up Arrow move focus to the next and previous item — wrapping at the ends when
///   [wrapsFocus] — and Home and End to the first and last; the order is the items' order in the
///   widget tree. Every item that [TanreiGroupItem.takesFocus] is reached, disabled or not. A
///   group whose [itemAxis] is horizontal (a row of tabs) moves with Right and Left Arrow instead,
///   swapped in a right-to-left layout — and also with Down and Up Arrow where
///   [verticalArrowsInRow] (a segmented button).
/// * Printable characters typed within [tanreiTypeaheadWindow] of each other move focus to the
///   next item whose [TanreiGroupItem.typeaheadText] begins with them (ignoring case); the same
///   character typed again moves on to the next such item. Off where [typeaheadEnabled] is false.
/// * One Tab stop, where [tabStop] names one: every other item skips traversal.
///
/// The keys act only while one of the group's items has primary focus; otherwise they go on (to
/// a control in a static item, to scrolling). Moving focus never activates anything.
///
/// A component mixes it into the `State` of its container and wraps its items in
/// [buildItemGroup].
mixin TanreiItemGroupMixin<W extends StatefulWidget> on State<W> {
  final Set<TanreiGroupItem> _items = <TanreiGroupItem>{};
  TanreiGroupItem? _lastFocused;
  bool _tabStopsScheduled = false;
  String _typed = '';
  Timer? _typedTimer;

  late final Map<Type, Action<Intent>> _groupActions = <Type, Action<Intent>>{
    _GroupMoveIntent: _GroupMoveAction(this),
  };

  /// The group whose items are below [context], if any.
  static TanreiItemGroupMixin<StatefulWidget>? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<_TanreiItemGroupScope>()?.group;

  /// Whether Down Arrow on the last item goes to the first, and Up Arrow on the first to the last.
  bool get wrapsFocus;

  /// The direction the items run in: vertical (Down and Up Arrow) or horizontal (Right and Left
  /// Arrow, mirrored in a right-to-left layout).
  @protected
  Axis get itemAxis => Axis.vertical;

  /// Whether a horizontal group also moves with Down Arrow (next) and Up Arrow (previous), as a
  /// radio group does (a segmented button, SEG-18). A row of tabs does not.
  @protected
  bool get verticalArrowsInRow => false;

  /// Whether typing moves focus to the item whose text begins with what was typed.
  @protected
  bool get typeaheadEnabled => true;

  /// The one item Tab reaches among [items] (in order, each taking focus), or null to leave every
  /// item in the focus order. [lastFocused] is the item that had focus last, if it is still one.
  @protected
  TanreiGroupItem? tabStop(List<TanreiGroupItem> items, TanreiGroupItem? lastFocused) => null;

  /// Adds [item] to the group.
  void registerItem(TanreiGroupItem item) {
    if (_items.add(item)) {
      item.focusNode.addListener(_handleFocus);
    }
    scheduleTabStops();
  }

  /// Removes [item] from the group.
  void unregisterItem(TanreiGroupItem item) {
    if (_items.remove(item)) {
      item.focusNode.removeListener(_handleFocus);
    }
    if (identical(_lastFocused, item)) {
      _lastFocused = null;
    }
    scheduleTabStops();
  }

  void _handleFocus() {
    final TanreiGroupItem? focused = focusedItem;
    if (focused != null && !identical(focused, _lastFocused)) {
      _lastFocused = focused;
      scheduleTabStops();
    }
  }

  @override
  void dispose() {
    _typedTimer?.cancel();
    for (final TanreiGroupItem item in _items) {
      item.focusNode.removeListener(_handleFocus);
    }
    super.dispose();
  }

  /// The items that take focus, in widget-tree order. Walks this group's subtree: call it outside a
  /// build (a key press, a post-frame callback).
  List<TanreiGroupItem> orderedItems() {
    final List<TanreiGroupItem> found = <TanreiGroupItem>[];
    void visit(Element element) {
      if (element is StatefulElement) {
        final Object state = element.state;
        if (state is TanreiGroupItem && _items.contains(state) && state.takesFocus) {
          found.add(state);
        }
      }
      element.visitChildElements(visit);
    }

    context.visitChildElements(visit);
    return found;
  }

  /// The item with primary focus, if one of the group's has it.
  TanreiGroupItem? get focusedItem => _items
      .where((TanreiGroupItem item) => item.takesFocus && item.focusNode.hasPrimaryFocus)
      .firstOrNull;

  /// Updates the Tab stop after the frame (the order is read from the built tree).
  void scheduleTabStops() {
    if (_tabStopsScheduled) {
      return;
    }
    _tabStopsScheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _tabStopsScheduled = false;
      if (mounted) {
        _updateTabStops();
      }
    });
  }

  void _updateTabStops() {
    final List<TanreiGroupItem> ordered = orderedItems();
    final TanreiGroupItem? last = ordered.contains(_lastFocused) ? _lastFocused : null;
    final TanreiGroupItem? stop = tabStop(ordered, last);
    for (final TanreiGroupItem item in ordered) {
      applyTabStop(item, traversable: stop == null || identical(item, stop));
    }
  }

  /// Puts [item] in the Tab order ([traversable]) or takes it out: by default through its
  /// [TanreiGroupItem.focusNode]'s `skipTraversal`. A group whose items are other components with
  /// focus nodes of their own (a toolbar's icon buttons and buttons, whose `Focus` resets
  /// `skipTraversal` on every build) overrides it.
  @protected
  void applyTabStop(TanreiGroupItem item, {required bool traversable}) {
    item.focusNode.skipTraversal = !traversable;
  }

  /// Moves focus as [move] says, from the focused item. Returns whether focus moved.
  bool moveFocus(TanreiGroupMove move) {
    final List<TanreiGroupItem> ordered = orderedItems();
    if (ordered.isEmpty) {
      return false;
    }
    final int current = ordered.indexOf(focusedItem ?? ordered.first);
    final int last = ordered.length - 1;
    final int target = switch (move) {
      TanreiGroupMove.first => 0,
      TanreiGroupMove.last => last,
      TanreiGroupMove.next => current < last ? current + 1 : (wrapsFocus ? 0 : last),
      TanreiGroupMove.previous => current > 0 ? current - 1 : (wrapsFocus ? last : 0),
    };
    focusItem(ordered[target]);
    return target != current;
  }

  /// Gives [item] keyboard focus. A component may override it to say how focus arrived.
  @protected
  void focusItem(TanreiGroupItem item) => item.focusNode.requestFocus();

  /// Typeahead: adds [character] to what was typed within the window and moves focus to the next
  /// item whose text begins with it. Returns whether an item matched.
  bool typeahead(String character) {
    _typedTimer?.cancel();
    _typedTimer = Timer(tanreiTypeaheadWindow, () => _typed = '');
    final String typed = (_typed + character).toLowerCase();
    // The same character again: cycle through the items that begin with it.
    final bool repeated = typed.split('').every((String c) => c == typed[0]);
    _typed = typed;
    final List<TanreiGroupItem> ordered = orderedItems();
    if (ordered.isEmpty) {
      return false;
    }
    final int current = ordered.indexOf(focusedItem ?? ordered.last);
    // A new or repeated search starts after the focused item; a longer one may stay on it.
    final int from = typed.length == 1 || repeated ? current + 1 : current;
    final String search = repeated ? typed[0] : typed;
    for (int i = 0; i < ordered.length; i++) {
      final TanreiGroupItem item = ordered[(from + i) % ordered.length];
      if (item.typeaheadText.toLowerCase().startsWith(search)) {
        focusItem(item);
        return true;
      }
    }
    return false;
  }

  KeyEventResult _handleKey(FocusNode node, KeyEvent event) {
    if (!typeaheadEnabled || event is! KeyDownEvent || focusedItem == null) {
      return KeyEventResult.ignored;
    }
    final String? character = event.character;
    final HardwareKeyboard keyboard = HardwareKeyboard.instance;
    if (character == null ||
        character.length != 1 ||
        character.codeUnitAt(0) <= 0x20 ||
        character.codeUnitAt(0) == 0x7f ||
        keyboard.isControlPressed ||
        keyboard.isMetaPressed ||
        keyboard.isAltPressed) {
      return KeyEventResult.ignored;
    }
    typeahead(character);
    return KeyEventResult.handled;
  }

  /// The keyboard of the group around [child], which holds the items.
  @protected
  Widget buildItemGroup({required Widget child}) => _TanreiItemGroupScope(
    group: this,
    child: Shortcuts(
      shortcuts: switch (itemAxis) {
        Axis.vertical => _groupKeys,
        Axis.horizontal => verticalArrowsInRow ? _rowAndColumnKeys : _rowKeys,
      },
      // No node of its own: the items must be the direct children of the list's or menu's node.
      includeSemantics: false,
      child: Actions(
        actions: _groupActions,
        child: Focus(
          canRequestFocus: false,
          skipTraversal: true,
          includeSemantics: false,
          onKeyEvent: _handleKey,
          child: child,
        ),
      ),
    ),
  );
}

/// Handles the arrow keys, Home and End while an item of the group has primary focus.
class _GroupMoveAction extends Action<_GroupMoveIntent> {
  _GroupMoveAction(this.group);

  final TanreiItemGroupMixin<StatefulWidget> group;

  @override
  bool isEnabled(_GroupMoveIntent intent) => group.focusedItem != null;

  @override
  void invoke(_GroupMoveIntent intent) {
    final bool rtl = Directionality.maybeOf(group.context) == TextDirection.rtl;
    group.moveFocus(switch (intent.move) {
      TanreiGroupMove.next when intent.mirrored && rtl => TanreiGroupMove.previous,
      TanreiGroupMove.previous when intent.mirrored && rtl => TanreiGroupMove.next,
      final TanreiGroupMove move => move,
    });
  }
}

class _TanreiItemGroupScope extends InheritedWidget {
  const _TanreiItemGroupScope({required this.group, required super.child});

  final TanreiItemGroupMixin<StatefulWidget> group;

  @override
  bool updateShouldNotify(_TanreiItemGroupScope oldWidget) => group != oldWidget.group;
}
