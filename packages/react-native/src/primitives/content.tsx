import { Children, type ReactNode } from 'react';
import { Animated, View, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import type { TanreiColor } from '../generated/vocabulary';
import type { TanreiIconGlyph } from '../theme/icon';

type Moving<Value extends string | number> = Value | Animated.AnimatedInterpolation<Value>;

/** The resting state has no `opacity` token: nothing dims the control. */
export const RESTING_OPACITY = 1;

/**
 * A paint that resolves to nothing draws nothing: no fill, no outline element. `resolved` is the paint of the current
 * state (`theme.resolve(...)`), `drawn` what the transition hands back for it — while a transition runs it is an
 * interpolation and must be drawn even when its end draws nothing, so that it fades.
 */
export function drawsColor(resolved: TanreiColor, drawn: Moving<string>): boolean {
  return !(resolved.a === 0 && typeof drawn === 'string');
}

/** `drawn` when it draws something, else `undefined` (no `backgroundColor` at all). */
export function fillOf(resolved: TanreiColor, drawn: Moving<string>): Moving<string> | undefined {
  return drawsColor(resolved, drawn) ? drawn : undefined;
}

/** A part's `testID`, derived from the host's: `<testID>.<name>` (none when the host has none). */
export const partTestID = (testID: string | undefined, name: string): string | undefined => (testID ? `${testID}.${name}` : undefined);

const isText = (node: unknown): node is string | number => typeof node === 'string' || typeof node === 'number';

export interface TextContent {
  /** Every child is a string or a number: they are drawn as ONE label in the component's type style. */
  textOnly: boolean;
  /** The label's text when `textOnly` (the default accessibility label); undefined otherwise. */
  text: string | undefined;
}

/** Is a control's content a plain text label? Other nodes are rendered as given, and name nothing. */
export function textContent(children: ReactNode): TextContent {
  const parts = Children.toArray(children);
  const textOnly = parts.length > 0 && parts.every(isText);
  return { textOnly, text: textOnly ? parts.join('') : undefined };
}

/** What an icon slot given as a function receives. */
export interface IconSlotProps {
  /** The label color of the current state, in the active scheme. */
  color: string;
  /** The icon size of the control's size. */
  size: number;
}

/** What a function icon of a control that draws glyphs receives: the icon color, the icon size and the glyph style. */
export interface GlyphSlotProps extends IconSlotProps {
  /** `iconGlyphStyle()` of the icon's selection state at `size`: family, axes, and the `<Text>` style. */
  glyph: TanreiIconGlyph;
}

/** An icon slot that takes a glyph name: a string, a function of the color / size / glyph, or any node. */
export type GlyphSlot<Props extends GlyphSlotProps = GlyphSlotProps> = ReactNode | ((props: Props) => ReactNode);

/**
 * The content of a glyph icon slot, for `<IconBox>`: a string or a number is a glyph of the system's icon font (a
 * ligature name such as `'add'`, or a codepoint), drawn with `props.glyph.style` in `drawn` — the icon color as the
 * state transition hands it back — with font scaling off (an icon is not text); a function receives `props`; any other
 * node is returned as given. FloatingActionButton, ExtendedFloatingActionButton and Chip draw their glyphs with it.
 */
export function glyphSlotContent<Props extends GlyphSlotProps>(slot: GlyphSlot<Props>, props: Props, drawn: Moving<string>, testID?: string): ReactNode {
  if (typeof slot === 'function') return slot(props);
  if (typeof slot === 'string' || typeof slot === 'number') {
    return (
      <Animated.Text style={[props.glyph.style, { color: drawn, textAlign: 'center' }]} allowFontScaling={false} testID={testID}>
        {slot}
      </Animated.Text>
    );
  }
  return slot;
}

export interface IconBoxProps {
  /** A node, or a function that receives the label color and the icon size. */
  icon: ReactNode | ((props: IconSlotProps) => ReactNode);
  color: string;
  size: number;
  /**
   * The icon names nothing to assistive technology (the control's own label does): hide the box and everything in it,
   * so that a glyph drawn as text (a ligature such as `favorite`) is never read out.
   */
  decorative?: boolean;
  testID?: string;
}

const HIDDEN = { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' } as const;

/** A square box of the icon size, centered, holding an icon slot. */
export function IconBox({ icon, color, size, decorative = false, testID }: IconBoxProps) {
  const box: ViewStyle = { width: size, height: size, alignItems: 'center', justifyContent: 'center' };
  return (
    <View style={box} testID={testID} {...(decorative ? HIDDEN : null)}>
      {typeof icon === 'function' ? icon({ color, size }) : icon}
    </View>
  );
}

export interface LabelProps {
  /** The type style (`theme.text(role)`) plus layout. */
  style: TextStyle;
  /** The label color of the current state: a string when settled, an interpolation while it moves. */
  color: Moving<string>;
  testID?: string;
  /** The laid-out lines (a selection control centers itself on the first one). */
  onTextLayout?: TextProps['onTextLayout'];
  /** The laid-out box (an extended FAB measures the width its label needs). */
  onLayout?: TextProps['onLayout'];
  /** A label that must stay on one line (a chip's) ends in an ellipsis when it does not fit; unset: no line limit. */
  numberOfLines?: number;
  children: ReactNode;
}

/** A control's text label: animated color, font scaling on, no line limit unless the component sets one. */
export function Label({ style, color, testID, onTextLayout, onLayout, numberOfLines, children }: LabelProps) {
  return (
    <Animated.Text style={[style, { color }]} allowFontScaling testID={testID} onTextLayout={onTextLayout} onLayout={onLayout} numberOfLines={numberOfLines}>
      {children}
    </Animated.Text>
  );
}
