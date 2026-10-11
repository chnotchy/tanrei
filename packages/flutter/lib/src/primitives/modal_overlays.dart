import 'package:flutter/foundation.dart';

/// The Tanrei modal overlays open in the app (a dialog), counted: a snackbar host
/// pauses its timeout and holds back its queue while any is open (SNK-9, SNK-12), and a modal
/// component adds itself while it is shown and removes itself when it closes.
///
/// It is app-wide, as a modal overlay covers the whole window. Listeners are notified whenever the
/// count changes, possibly during a build: a listener that rebuilds defers the rebuild to the end of
/// the frame.
class TanreiModalOverlays extends ChangeNotifier {
  TanreiModalOverlays._();

  /// The one tracker of the app.
  static final TanreiModalOverlays instance = TanreiModalOverlays._();

  int _count = 0;

  /// How many modal overlays are open.
  int get count => _count;

  /// Whether any modal overlay is open.
  bool get isAnyOpen => _count > 0;

  /// A modal overlay opened.
  void add() {
    _count++;
    notifyListeners();
  }

  /// A modal overlay closed.
  void remove() {
    if (_count > 0) {
      _count--;
      notifyListeners();
    }
  }
}
