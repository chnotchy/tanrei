import 'package:flutter/widgets.dart';

/// Why a sheet asks to be closed: the reason its `onClose` carries (the spec's `close` event of the
/// bottom sheet, BSH-5, and of the side sheet, SSH-4 and SSH-5). The sheet only asks; the product
/// closes it by setting `open` to false.
enum TanreiSheetCloseReason {
  /// The side sheet's close button.
  close,

  /// A press on the scrim of a modal sheet.
  scrim,

  /// Escape, with focus in a modal sheet.
  escape,

  /// The platform's back (Android's back gesture or button), through the enclosing route.
  back,

  /// A released drag that asks to close: below half of a bottom sheet's lowest height or a fling
  /// down from it; a side sheet dragged toward its edge past half its width or flung that way.
  drag,
}

/// Where focus goes when an overlay or a layout region that took it closes: back to
/// [previous], the node that had focus when it opened, or — where that node is gone,
/// cannot take focus, or was only a scope — the platform's default for a closed overlay, nowhere in
/// particular: the scope that encloses [region]. Call it only while focus is inside [region].
void tanreiReturnFocus(FocusNode? previous, {required FocusNode region}) {
  if (previous != null &&
      previous is! FocusScopeNode &&
      (previous.context?.mounted ?? false) &&
      previous.canRequestFocus &&
      !previous.ancestors.contains(region) &&
      previous != region) {
    previous.requestFocus();
    return;
  }
  // Focus moves to the scope around the region, which forgets what had focus in it.
  region.unfocus();
}
