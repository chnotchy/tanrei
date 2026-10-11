import 'package:flutter/widgets.dart';

import '../generated/tokens.g.dart';

/// The one interaction state a component draws for a set of [WidgetState]s.
///
/// Disabled excludes everything else; otherwise pressed > focused > hovered, and `enabled` at rest.
/// `WidgetState.focused` must only be set for keyboard focus (see `TanreiFocusRing`), so focus
/// gained by pointer or touch never selects the focused state.
///
/// This is the only decision a component makes about states. How the state looks is read from that
/// state's tokens in the active design system; components never compute it.
TanreiInteractionState tanreiInteractionStateOf(Set<WidgetState> states) {
  if (states.contains(WidgetState.disabled)) {
    return TanreiInteractionState.disabled;
  }
  if (states.contains(WidgetState.pressed)) {
    return TanreiInteractionState.pressed;
  }
  if (states.contains(WidgetState.focused)) {
    return TanreiInteractionState.focused;
  }
  if (states.contains(WidgetState.hovered)) {
    return TanreiInteractionState.hovered;
  }
  return TanreiInteractionState.enabled;
}
