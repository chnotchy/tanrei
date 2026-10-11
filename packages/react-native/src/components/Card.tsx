import { useEffect, useMemo, type ReactNode, type Ref } from 'react';
import { Animated, Pressable, View, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import type { TanreiCardVariant } from '../generated/vocabulary';
import { Label, drawsColor, fillOf, partTestID, textContent } from '../primitives/content';
import { elevationVisuals, shadowLayerCount, useElevationDrawing, type DrawnElevation } from '../primitives/elevationTransition';
import { FocusRing } from '../primitives/FocusRing';
import { INTERACTION_STATES } from '../primitives/interaction';
import { usePressInteraction, type PressableHost } from '../primitives/pressInteraction';
import { PressRipple } from '../primitives/PressRipple';
import { Ring } from '../primitives/Ring';
import { hasAccessibleName } from '../primitives/selectionControl';
import { stateShape } from '../primitives/stateShape';
import { useStateTransition } from '../primitives/stateTransition';
import { ContentColorProvider } from '../theme/contentColor';
import { lookupValue } from '../theme/lookup';
import { borderCurveOf } from '../theme/shape';
import { useTanrei } from '../theme/TanreiProvider';

/**
 * Open keys: the core values — `elevated`, `filled`, `outlined` — plus whatever the product's design system
 * added (its generated file augments `TanreiCardVariantRegistry`).
 */
export type CardVariant = TanreiCardVariant;

type Moving<Value extends string | number> = Value | Animated.AnimatedInterpolation<Value>;
/** What `useStateTransition` hands back for a card: the named values, plus the flattened elevation. */
type Drawn = { container: Moving<string>; content: Moving<string>; outline: Moving<string>; opacity: Moving<number> } & DrawnElevation;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** The card's host: a `View` (a `Pressable`'s host view when the card is interactive). */
export type CardRef = PressableHost;

export interface CardProps extends Omit<PressableProps, 'children' | 'style' | 'disabled' | 'onPress'> {
  /**
   * How the card separates from its background: by depth (`elevated`), by tone (`filled`) or by an edge (`outlined`).
   * Pick by the background, not by importance. A value the active system does not have renders as `outlined` (CRD-7).
   */
  variant?: CardVariant;
  /**
   * Makes the whole card ONE pressable action (the spec's `interactive`, and its `click`): an accessible `Pressable`
   * with the button role. Without it the card is a plain container. Its content must then hold nothing interactive
   * (CRD-15): no button, link, field or toggle.
   */
  onPress?: (event: GestureResponderEvent) => void;
  /** Prevents interaction and removes the card from the focus order. Ignored unless the card is interactive (CRD-11). */
  disabled?: boolean;
  /**
   * Insets the content by the card's padding (`components.card.containerPadding`) on every side. `false`: the content
   * reaches the card's edges (a photo on top) and pads its own text.
   */
  inset?: boolean;
  /**
   * The accessible name (the spec's `label`). An interactive card: normally the text of its heading; without it the
   * whole content becomes the name, and development builds say so. A card that is not interactive: a label makes it a
   * named group.
   */
  accessibilityLabel?: string;
  /**
   * The content: any layout. Strings and numbers are drawn in the `body` type style and the content color; other
   * nodes read the content color with `useContentColor()`.
   */
  children?: ReactNode;
  /** Layout overrides for the container (margins, width, `alignSelf`, …). Do not restyle tokens here. */
  style?: StyleProp<ViewStyle>;
  /** Forwarded to the host view. */
  ref?: Ref<CardRef>;
}

/**
 * Tanrei Card — spec: `specs/card.spec.json`.
 * Anatomy: container > [elevation ring] + [ripple] + content (inset, clipped to the corners) + [outline] + focus ring.
 * The card does not lay its content out: it insets it, clips it and hands it the content color of its variant and state.
 * Interactive (`onPress`), it is one pressable action drawn from the tokens of the state it is in.
 */
export function Card({
  variant = 'outlined',
  onPress,
  disabled = false,
  inset = true,
  accessibilityLabel,
  children,
  style,
  testID,
  accessibilityState,
  onPressIn,
  onPressOut,
  onTouchEnd,
  onTouchCancel,
  onHoverIn,
  onHoverOut,
  onFocus,
  onBlur,
  onLayout,
  ref,
  ...rest
}: CardProps) {
  const theme = useTanrei();
  const tokens = theme.system.components.card;
  // CRD-7: the variant is an open key. A value the active system does not have is drawn from the default value's
  // tokens, and reported in development builds only.
  const appearance = lookupValue(tokens.variants, variant, 'outlined', 'Card variant');
  // The spec's `interactive`: React Native's idiom is the handler itself.
  const interactive = onPress != null;
  // CRD-11: a card that is not an action cannot be disabled.
  const inactive = interactive && disabled;

  // CRD-14: an interactive card without a name still renders; its content becomes the name, and development builds
  // say so. A card that is not interactive needs no name.
  const unnamed = interactive && !hasAccessibleName('', { accessibilityLabel, ...rest });
  useEffect(() => {
    if (__DEV__ && unnamed) {
      console.warn(
        `Tanrei: an interactive Card${testID ? ` (testID "${testID}")` : ''} has no accessibilityLabel, so its whole content becomes its name. Name it with the text of its heading.`,
      );
    }
  }, [unnamed, testID]);

  // CRD-10: how far the container's corners ease; `borderCurveOf()` says how React Native draws it.
  const { cornerSmoothing } = theme.system.shape;
  const padding = inset ? tokens.containerPadding : 0;

  // CRD-8 (pressed at once, held at least `duration.pressHold`), CRD-5 (the minimum target: until the first layout
  // pass, the smallest box the card can have — its padding around nothing), CRD-9 (the ripple) and CRD-3 / CRD-6: one
  // state wins. A card that is not interactive feeds it no event: it stays at rest (CRD-11).
  const interaction = usePressInteraction({
    disabled: inactive,
    estimate: { width: padding * 2, height: padding * 2 },
    motion: { feedbackDuration: tokens.motionFeedbackDuration, stateDuration: tokens.motionStateDuration, stateEasing: tokens.motionStateEasing },
    ref,
    onPress,
    onPressIn,
    onPressOut,
    onTouchEnd,
    onTouchCancel,
    onHoverIn,
    onHoverOut,
    onFocus,
    onBlur,
    onLayout,
  });
  const state = interactive ? interaction.state : 'enabled';
  const under = interactive ? interaction.under : 'enabled';
  const { wave } = interaction;
  // Everything drawn comes from that state's tokens. CRD-9 `ripple` (while a ripple draws) and `dim` draw no state
  // layer on the container: its color stays the one of the state under the press (`interaction.layerless`).
  const layerless = interactive && interaction.layerless;
  const current = { ...appearance[state], ...(layerless ? { containerColor: appearance[under].containerColor } : null) };
  const { opacity, shape } = stateShape(tokens, state);
  const colors = { container: theme.resolve(current.containerColor), content: theme.resolve(current.contentColor), outline: theme.resolve(current.outlineColor) };
  const elevation = theme.elevation(current.containerElevation);
  const shadowCount = useMemo(() => shadowLayerCount(INTERACTION_STATES.map((name) => theme.elevationLayers(appearance[name].containerElevation))), [theme, appearance]);
  // CRD-16: colors, opacity and elevation move with the card's motion tokens; the press is immediate.
  const drawn = useStateTransition(
    { ...colors, opacity, ...elevationVisuals(theme.elevationLayers(current.containerElevation), shadowCount) },
    { duration: tokens.motionStateDuration, easing: tokens.motionStateEasing, immediate: state === 'pressed' },
  ) as Drawn;
  const { shadow, ring } = useElevationDrawing(drawn, elevation, shadowCount);
  // CRD-13: React Native has no inherited text color; the content reads this one from the context.
  const contentColor = theme.paint(current.contentColor);

  const container: ViewStyle = { ...shadow, ...borderCurveOf(cornerSmoothing) };
  // A paint that resolves to nothing draws nothing: no fill, no outline element.
  const surface = { backgroundColor: fillOf(colors.container, drawn.container), borderRadius: shape, opacity: drawn.opacity };
  const outlined = tokens.outlineWidth > 0 && drawsColor(colors.outline, drawn.outline);
  // CRD-12 / CRD-17: the content is clipped to the container's shape and inset by logical start and end, so it mirrors.
  // The clip is its own view: the host keeps no `overflow: 'hidden'`, so its shadow and rings are drawn outside it.
  const clip: ViewStyle = { overflow: 'hidden', borderRadius: shape, paddingStart: padding, paddingEnd: padding, paddingVertical: padding, ...borderCurveOf(cornerSmoothing) };

  const content = textContent(children);
  const part = (name: string) => partTestID(testID, name);

  const body = (
    <ContentColorProvider color={contentColor}>
      <View style={clip} testID={part('content')}>
        {content.textOnly ? (
          <Label style={theme.text('body')} color={drawn.content} testID={part('text')}>
            {children}
          </Label>
        ) : (
          children
        )}
      </View>
    </ContentColorProvider>
  );
  const edge = outlined ? <Ring placement="inside" width={tokens.outlineWidth} color={drawn.outline} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('outline')} /> : null;
  const lift = ring ? <Ring placement="outside" width={ring.width} color={ring.color} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('elevation-ring')} /> : null;

  if (!interactive) {
    // CRD-11 / CRD-14: no role, not focusable, the content's semantics untouched — unless a label makes it a named group.
    const { hitSlop: _hitSlop, ...viewProps } = rest;
    return (
      <Animated.View
        {...viewProps}
        ref={interaction.hostProps.ref}
        onLayout={interaction.hostProps.onLayout}
        testID={testID}
        {...(accessibilityLabel ? { role: 'group' as const, accessibilityLabel } : null)}
        style={[container, surface, style]}
      >
        {lift}
        {body}
        {edge}
      </Animated.View>
    );
  }

  return (
    <AnimatedPressable
      {...rest}
      {...interaction.hostProps}
      testID={testID}
      disabled={inactive}
      focusable={!inactive}
      accessibilityRole="button"
      // CRD-14: one element, named by the label — else by its content, which the accessible host merges in reading order.
      accessibilityLabel={accessibilityLabel || content.text}
      accessibilityState={{ ...accessibilityState, disabled: inactive }}
      style={[container, surface, style]}
    >
      {lift}
      {wave.ripple ? <PressRipple ripple={wave.ripple} color={theme.paint(appearance.pressed.containerColor)} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('ripple')} /> : null}
      {body}
      {edge}
      <FocusRing visible={interaction.focused && !inactive} radius={shape} cornerSmoothing={cornerSmoothing} testID={part('focus-ring')} />
    </AnimatedPressable>
  );
}
