// GENERATED FILE — DO NOT EDIT.
// Source: tokens/ (DTCG 2025.10). Regenerate with `pnpm generate`.
// The Tanrei vocabulary as TypeScript types. System-independent: values live in ./systems/<id>.ts.
// Every member is required: a system generated before a vocabulary change no longer type-checks.
// Lengths are density-independent pixels, durations are milliseconds.

/** sRGB color: channels 0–255, alpha 0–1. Format it with `formatColor()` at the edge. */
export interface TanreiColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

/**
 * Every color role a paint may name. The core roles are listed here; a system that declares palettes
 * (e.g. `tertiary`, `correct`) adds its roles by module augmentation — its generated file does that.
 * At runtime a role the active scheme does not have falls back (with a dev-only warning).
 */
export interface TanreiColorRoleRegistry {
  elevationRing: true;
  elevationShadow1: true;
  elevationShadow2: true;
  elevationShadow3: true;
  error: true;
  errorContainer: true;
  focusRing: true;
  focusRingInner: true;
  info: true;
  infoContainer: true;
  inverseLink: true;
  inverseOnSurface: true;
  inversePrimary: true;
  inverseSurface: true;
  link: true;
  onError: true;
  onErrorContainer: true;
  onInfo: true;
  onInfoContainer: true;
  onPrimary: true;
  onPrimaryContainer: true;
  onSecondary: true;
  onSecondaryContainer: true;
  onSuccess: true;
  onSuccessContainer: true;
  onSurface: true;
  onSurfaceVariant: true;
  onWarning: true;
  onWarningContainer: true;
  outline: true;
  outlineVariant: true;
  primary: true;
  primaryContainer: true;
  scrim: true;
  secondary: true;
  secondaryContainer: true;
  shadow: true;
  success: true;
  successContainer: true;
  surface: true;
  surfaceBright: true;
  surfaceContainer: true;
  surfaceContainerHigh: true;
  surfaceContainerHighest: true;
  surfaceContainerLow: true;
  surfaceContainerLowest: true;
  surfaceDim: true;
  surfaceVariant: true;
  warning: true;
  warningContainer: true;
}
export type TanreiColorRole = keyof TanreiColorRoleRegistry;

/** The roles every system must value in every scheme. */
export type TanreiCoreColorRole =
  | "elevationRing"
  | "elevationShadow1"
  | "elevationShadow2"
  | "elevationShadow3"
  | "error"
  | "errorContainer"
  | "focusRing"
  | "focusRingInner"
  | "info"
  | "infoContainer"
  | "inverseLink"
  | "inverseOnSurface"
  | "inversePrimary"
  | "inverseSurface"
  | "link"
  | "onError"
  | "onErrorContainer"
  | "onInfo"
  | "onInfoContainer"
  | "onPrimary"
  | "onPrimaryContainer"
  | "onSecondary"
  | "onSecondaryContainer"
  | "onSuccess"
  | "onSuccessContainer"
  | "onSurface"
  | "onSurfaceVariant"
  | "onWarning"
  | "onWarningContainer"
  | "outline"
  | "outlineVariant"
  | "primary"
  | "primaryContainer"
  | "scrim"
  | "secondary"
  | "secondaryContainer"
  | "shadow"
  | "success"
  | "successContainer"
  | "surface"
  | "surfaceBright"
  | "surfaceContainer"
  | "surfaceContainerHigh"
  | "surfaceContainerHighest"
  | "surfaceContainerLow"
  | "surfaceContainerLowest"
  | "surfaceDim"
  | "surfaceVariant"
  | "warning"
  | "warningContainer";

/** Core roles are required; palette-declared roles are present only in the systems that declare them. */
export type TanreiSchemeColors = { readonly [Role in TanreiCoreColorRole]: TanreiColor } & { readonly [Role in TanreiColorRole]?: TanreiColor };

export type TanreiScheme = "light" | "lightMedium" | "lightHigh" | "dark" | "darkMedium" | "darkHigh";
export type TanreiColors = { readonly [Scheme in TanreiScheme]: TanreiSchemeColors };

/**
 * How a component color is described without resolving the scheme. Evaluate with `evaluatePaint()`.
 * `mix` is premultiplied interpolation — identical to CSS `color-mix(in srgb, base, with amount)`.
 * `scheme` is a paint decided per scheme at build time (a palette tone, a contrast pick): one paint per scheme.
 */
export type TanreiPaint =
  | { readonly kind: 'role'; readonly role: TanreiColorRole }
  | { readonly kind: 'mix'; readonly base: TanreiPaint; readonly with: TanreiPaint; readonly amount: number }
  | { readonly kind: 'alpha'; readonly of: TanreiPaint; readonly amount: number }
  | { readonly kind: 'none' }
  | { readonly kind: 'scheme'; readonly by: { readonly [Scheme in TanreiScheme]: TanreiPaint } }
  | { readonly kind: 'literal'; readonly r: number; readonly g: number; readonly b: number; readonly a: number };

/**
 * A font stack, read ONCE in the token pipeline. `families` are the NAMED families, in order — what a
 * product installs or registers. `generic` is the class of platform font to fall back to. `system` says the stack
 * asks for the platform's own font of that class BEFORE any named family. `stack` is the stack as written (CSS),
 * for a renderer that takes one (a web view); never parse it. See `fontFamilyOf()`.
 */
export type TanreiFontGeneric = "sans-serif" | "serif" | "monospace";
export interface TanreiFontStack {
  readonly stack: readonly string[];
  readonly families: readonly string[];
  readonly generic: TanreiFontGeneric;
  readonly system: boolean;
}
/** The named typefaces of the system (`ref.typeface.*`): what a product must make available, per role. */
export interface TanreiTypefaces {
  readonly brand: TanreiFontStack;
  readonly icon: TanreiFontStack;
  readonly mono: TanreiFontStack;
  readonly plain: TanreiFontStack;
}

export interface TanreiTypography {
  readonly font: TanreiFontStack;
  readonly size: number;
  readonly weight: number;
  readonly tracking: number;
  readonly lineHeight: number;
  /**
   * The family the role belongs to: which step of `TanreiTypeEmphasis` `emphasized` text adds. Decided by
   * the token build, so a runtime need not guess it from the name. Optional only so a hand-written style stays valid.
   */
  readonly family?: TanreiTypeFamily;
}
/**
 * The weight `emphasized` text ADDS to a role's weight, per family (`sys.typescale.emphasis.*`). A role's
 * family is `TanreiTypography.family`, decided by the token build (the first segment of its name when it names a
 * family; `caption`, `code*`, `eyebrow` and any other role take the `label` step). See `emphasize()`.
 */
export interface TanreiTypeEmphasis {
  readonly display: number;
  readonly heading: number;
  readonly body: number;
  readonly label: number;
}
export type TanreiTypeFamily = keyof TanreiTypeEmphasis;

/**
 * The type styles by level: `display`; `heading1`…`heading6` (h1…h6); `bodyLarge` / `body` / `bodySmall`
 * (lead, p, small); `label` / `labelSmall` / `caption` (text in and next to controls); `code` / `codeSmall`;
 * `eyebrow`. Every member but `emphasis` is a role; a role a system added is an optional key its generated file declares.
 */
export interface TanreiTypescale {
  readonly emphasis: TanreiTypeEmphasis;
  readonly body: TanreiTypography;
  readonly bodyLarge: TanreiTypography;
  readonly bodySmall: TanreiTypography;
  readonly caption: TanreiTypography;
  readonly code: TanreiTypography;
  readonly codeSmall: TanreiTypography;
  readonly display: TanreiTypography;
  readonly eyebrow: TanreiTypography;
  readonly heading1: TanreiTypography;
  readonly heading2: TanreiTypography;
  readonly heading3: TanreiTypography;
  readonly heading4: TanreiTypography;
  readonly heading5: TanreiTypography;
  readonly heading6: TanreiTypography;
  readonly label: TanreiTypography;
  readonly labelSmall: TanreiTypography;
}
export type TanreiTypescaleRole = Exclude<keyof TanreiTypescale, "emphasis">;

/** Corner radii, in dp, and how their curve eases (`cornerSmoothing`). A radius a system added is an optional key. */
export interface TanreiShape {
  /**
   * `sys.shape.corner-smoothing`: 0–1 with Figma's meaning — 0 a quarter circle, 0.6 the iOS continuous
   * corner, 1 the most eased. React Native has only the OS's curve on iOS: `borderCurveOf()` draws `continuous` for
   * any amount above 0; Android is always circular.
   */
  readonly cornerSmoothing: number;
  readonly extraExtraLarge: number;
  readonly extraLarge: number;
  readonly extraLargeIncreased: number;
  readonly extraSmall: number;
  readonly full: number;
  readonly large: number;
  readonly largeIncreased: number;
  readonly medium: number;
  readonly none: number;
  readonly small: number;
}

export interface TanreiSpace {
  readonly space0: number;
  readonly space25: number;
  readonly space50: number;
  readonly space75: number;
  readonly space100: number;
  readonly space125: number;
  readonly space150: number;
  readonly space175: number;
  readonly space200: number;
  readonly space250: number;
  readonly space300: number;
  readonly space400: number;
  readonly space450: number;
  readonly space500: number;
  readonly space600: number;
  readonly space700: number;
  readonly space800: number;
  readonly space900: number;
}

export interface TanreiState {
  readonly disabledContainerOpacity: number;
  readonly disabledContentOpacity: number;
  readonly draggedStateLayerOpacity: number;
  readonly focusStateLayerOpacity: number;
  readonly hoverStateLayerOpacity: number;
  readonly pressedStateLayerOpacity: number;
}

/** The dial values this system was derived from (informational at runtime: derivation is build-time). */
export interface TanreiDials {
  readonly motionUnit: number;
  readonly shapeUnit: number;
  readonly sizeUnit: number;
  readonly spaceUnit: number;
  readonly strokeUnit: number;
  readonly typeBase: number;
  readonly typeContrast: number;
}

export interface TanreiBorderMeasure {
  readonly hairline: number;
  readonly thick: number;
}

export interface TanreiBreakpointMeasure {
  readonly expanded: number;
  readonly medium: number;
}

export interface TanreiFocusMeasure {
  readonly innerWidth: number;
  readonly offset: number;
  readonly outerWidth: number;
}

export interface TanreiIconMeasure {
  readonly extraSmall: number;
  readonly large: number;
  readonly medium: number;
  readonly small: number;
}

export interface TanreiTargetMeasure {
  readonly pointer: number;
  readonly spacing: number;
  readonly touch: number;
}

export interface TanreiMeasure {
  readonly border: TanreiBorderMeasure;
  readonly breakpoint: TanreiBreakpointMeasure;
  readonly focus: TanreiFocusMeasure;
  readonly icon: TanreiIconMeasure;
  readonly target: TanreiTargetMeasure;
}

/**
 * How icons are drawn. An icon SET is a family per selection state: a variable icon font names the
 * same family twice and tells the states apart by the FILL axis (`fillUnselected` / `fillSelected`); a static set
 * names two families. Fonts are referenced by name, not bundled. Sizes are `measure.icon`. See `iconGlyphStyle()`.
 */
export interface TanreiIconFamilies {
  readonly unselected: TanreiFontStack;
  readonly selected: TanreiFontStack;
}
export interface TanreiIconStyle {
  readonly family: TanreiIconFamilies;
  readonly weight: number;
  readonly markWeight: number;
  readonly fillUnselected: number;
  readonly fillSelected: number;
  readonly opticalSizeMin: number;
  readonly opticalSizeMax: number;
}

/**
 * Choices of kind: behaviour that is a name, not an amount. The names are vocabulary — a system chooses
 * among them. The first name of each is the default, and what a platform draws when it cannot draw the choice.
 */
export type TanreiFocusStyle = "ring" | "glow";
export type TanreiLinkUnderline = "always" | "hover" | "never";
export type TanreiPressedFeedback = "overlay" | "ripple" | "dim" | "none";
export type TanreiRequirementMark = "tag" | "asterisk" | "none";
export type TanreiSeparation = "divider" | "gap";
export interface TanreiBehavior {
  readonly focusStyle: TanreiFocusStyle;
  readonly linkUnderline: TanreiLinkUnderline;
  readonly pressedFeedback: TanreiPressedFeedback;
  readonly requirementMark: TanreiRequirementMark;
  readonly separation: TanreiSeparation;
}

export type TanreiCubicBezier = readonly [number, number, number, number];
export interface TanreiSpring {
  readonly damping: number;
  readonly duration: number;
  readonly easing: TanreiCubicBezier;
  readonly stiffness: number;
}
/** The springs of one spring scheme. Open like every series: a spring a system added is an optional key its generated file declares. */
export interface TanreiSpringSet {
  readonly defaultEffects: TanreiSpring;
  readonly defaultSpatial: TanreiSpring;
  readonly fastEffects: TanreiSpring;
  readonly fastSpatial: TanreiSpring;
  readonly slowEffects: TanreiSpring;
  readonly slowSpatial: TanreiSpring;
}

export interface TanreiDuration {
  readonly extraLong1: number;
  readonly extraLong2: number;
  readonly extraLong3: number;
  readonly extraLong4: number;
  readonly long1: number;
  readonly long2: number;
  readonly long3: number;
  readonly long4: number;
  readonly medium1: number;
  readonly medium2: number;
  readonly medium3: number;
  readonly medium4: number;
  readonly pressHold: number;
  readonly short1: number;
  readonly short2: number;
  readonly short3: number;
  readonly short4: number;
  readonly stagger: number;
}

export interface TanreiEasing {
  readonly emphasizedAccelerate: TanreiCubicBezier;
  readonly emphasizedDecelerate: TanreiCubicBezier;
  readonly linear: TanreiCubicBezier;
  readonly standard: TanreiCubicBezier;
  readonly standardAccelerate: TanreiCubicBezier;
  readonly standardDecelerate: TanreiCubicBezier;
}

export interface TanreiMotion {
  readonly duration: TanreiDuration;
  readonly easing: TanreiEasing;
  readonly spring: { readonly expressive: TanreiSpringSet; readonly standard: TanreiSpringSet };
}

export interface TanreiElevationLayer {
  readonly x: number;
  readonly y: number;
  readonly blur: number;
  readonly spread: number;
  readonly role: TanreiColorRole;
}
export interface TanreiElevation {
  readonly level0: readonly TanreiElevationLayer[];
  readonly level1: readonly TanreiElevationLayer[];
  readonly level2: readonly TanreiElevationLayer[];
  readonly level3: readonly TanreiElevationLayer[];
  readonly level4: readonly TanreiElevationLayer[];
  readonly level5: readonly TanreiElevationLayer[];
}

export type TanreiElevationLevel = keyof TanreiElevation;

/**
 * Every value of `comp.accordion`'s `variant` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `plain` (with a dev-only warning).
 */
export interface TanreiAccordionVariantRegistry {
  plain: true;
  outlined: true;
}
export type TanreiAccordionVariant = keyof TanreiAccordionVariantRegistry;
export type TanreiCoreAccordionVariant = "plain" | "outlined";

/** What one `variant` of `comp.accordion` is drawn from in ONE interaction state. */
export interface TanreiAccordionVariantStateTokens {
  readonly containerColor: TanreiPaint;
  readonly labelColor: TanreiPaint;
  readonly supportingTextColor: TanreiPaint;
  readonly trailingTextColor: TanreiPaint;
  readonly iconColor: TanreiPaint;
  readonly chevronColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
}
/** One `variant`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiAccordionVariantTokens {
  readonly enabled: TanreiAccordionVariantStateTokens;
  readonly hovered: TanreiAccordionVariantStateTokens;
  readonly focused: TanreiAccordionVariantStateTokens;
  readonly pressed: TanreiAccordionVariantStateTokens;
  readonly disabled: TanreiAccordionVariantStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiAccordionVariants = { readonly [Key in TanreiCoreAccordionVariant]: TanreiAccordionVariantTokens } & { readonly [Key in TanreiAccordionVariant]?: TanreiAccordionVariantTokens };

/**
 * Every value of `comp.accordion`'s `density` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `regular` (with a dev-only warning).
 */
export interface TanreiAccordionDensityRegistry {
  regular: true;
  compact: true;
}
export type TanreiAccordionDensity = keyof TanreiAccordionDensityRegistry;
export type TanreiCoreAccordionDensity = "regular" | "compact";

/** The tokens of one `density` of `comp.accordion`. */
export interface TanreiAccordionDensityTokens {
  readonly containerHeight: number;
  readonly containerPaddingBlock: number;
  readonly containerPaddingInline: number;
  readonly labelTypescale: TanreiTypescaleRole;
  readonly supportingTextTypescale: TanreiTypescaleRole;
  readonly trailingTextTypescale: TanreiTypescaleRole;
  readonly iconSize: number;
  readonly chevronSize: number;
  readonly contentPaddingBlockEnd: number;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiAccordionDensitys = { readonly [Key in TanreiCoreAccordionDensity]: TanreiAccordionDensityTokens } & { readonly [Key in TanreiAccordionDensity]?: TanreiAccordionDensityTokens };

/**
 * `comp.accordion`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`variants`, `densitys`), keyed by the axis value.
 */
export interface TanreiAccordionTokens {
  readonly containerGap: number;
  readonly containerShape: number;
  readonly disabledOpacity: number;
  readonly dividerColor: TanreiPaint;
  readonly dividerThickness: number;
  readonly focusedOpacity: number;
  readonly hoveredOpacity: number;
  readonly itemGap: number;
  readonly motionDisclosureDuration: number;
  readonly motionDisclosureEasing: TanreiCubicBezier;
  readonly motionFeedbackDuration: number;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly outlineColor: TanreiPaint;
  readonly outlineShape: number;
  readonly outlineWidth: number;
  readonly pressedOpacity: number;
  readonly separation: number;
  readonly variants: TanreiAccordionVariants;
  readonly densitys: TanreiAccordionDensitys;
}

/**
 * Every value of `comp.app-bar`'s `size` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `small` (with a dev-only warning).
 */
export interface TanreiAppBarSizeRegistry {
  small: true;
  large: true;
}
export type TanreiAppBarSize = keyof TanreiAppBarSizeRegistry;
export type TanreiCoreAppBarSize = "small" | "large";

/** The tokens of one `size` of `comp.app-bar`. */
export interface TanreiAppBarSizeTokens {
  readonly containerHeight: number;
  readonly titleTypescale: TanreiTypescaleRole;
  readonly subtitleTypescale: TanreiTypescaleRole;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiAppBarSizes = { readonly [Key in TanreiCoreAppBarSize]: TanreiAppBarSizeTokens } & { readonly [Key in TanreiAppBarSize]?: TanreiAppBarSizeTokens };

/**
 * Every value of `comp.app-bar`'s `condition` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `flat` (with a dev-only warning).
 */
export interface TanreiAppBarConditionRegistry {
  flat: true;
  scrolled: true;
}
export type TanreiAppBarCondition = keyof TanreiAppBarConditionRegistry;
export type TanreiCoreAppBarCondition = "flat" | "scrolled";

/** The tokens of one `condition` of `comp.app-bar`. */
export interface TanreiAppBarConditionTokens {
  readonly containerColor: TanreiPaint;
  readonly containerElevation: TanreiElevationLevel;
  readonly outlineColor: TanreiPaint;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiAppBarConditions = { readonly [Key in TanreiCoreAppBarCondition]: TanreiAppBarConditionTokens } & { readonly [Key in TanreiAppBarCondition]?: TanreiAppBarConditionTokens };

/**
 * `comp.app-bar`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`sizes`, `conditions`), keyed by the axis value.
 */
export interface TanreiAppBarTokens {
  readonly actionsGap: number;
  readonly containerGap: number;
  readonly containerPaddingBlockEnd: number;
  readonly containerPaddingInline: number;
  readonly motionConditionDuration: number;
  readonly motionConditionEasing: TanreiCubicBezier;
  readonly outlineWidth: number;
  readonly subtitleColor: TanreiPaint;
  readonly titleColor: TanreiPaint;
  readonly titleInset: number;
  readonly sizes: TanreiAppBarSizes;
  readonly conditions: TanreiAppBarConditions;
}

/**
 * `comp.app-shell`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis, keyed by the axis value.
 */
export interface TanreiAppShellTokens {
  readonly asideGap: number;
  readonly asidePaddingInline: number;
  readonly asideWidth: number;
  readonly breakpointExpanded: number;
  readonly breakpointMedium: number;
  readonly containerColor: TanreiPaint;
  readonly contentColor: TanreiPaint;
  readonly footerPaddingBlock: number;
  readonly gutterCompact: number;
  readonly gutterExpanded: number;
  readonly gutterMedium: number;
  readonly mainMaxWidth: number;
  readonly mainPaddingBlock: number;
  readonly outlineColor: TanreiPaint;
  readonly outlineWidth: number;
  readonly separation: number;
  readonly skipLinkContainerColor: TanreiPaint;
  readonly skipLinkContainerElevation: TanreiElevationLevel;
  readonly skipLinkContainerPaddingBlock: number;
  readonly skipLinkContainerPaddingInline: number;
  readonly skipLinkContainerShape: number;
  readonly skipLinkLabelTypescale: TanreiTypescaleRole;
  readonly skipLinkOffset: number;
}

/**
 * Every value of `comp.avatar`'s `size` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `medium` (with a dev-only warning).
 */
export interface TanreiAvatarSizeRegistry {
  small: true;
  medium: true;
  large: true;
}
export type TanreiAvatarSize = keyof TanreiAvatarSizeRegistry;
export type TanreiCoreAvatarSize = "small" | "medium" | "large";

/** The tokens of one `size` of `comp.avatar`. */
export interface TanreiAvatarSizeTokens {
  readonly containerSize: number;
  readonly labelTypescale: TanreiTypescaleRole;
  readonly iconSize: number;
  readonly groupOverlap: number;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiAvatarSizes = { readonly [Key in TanreiCoreAvatarSize]: TanreiAvatarSizeTokens } & { readonly [Key in TanreiAvatarSize]?: TanreiAvatarSizeTokens };

/**
 * Every value of `comp.avatar`'s `shape` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `circle` (with a dev-only warning).
 */
export interface TanreiAvatarShapeRegistry {
  circle: true;
  square: true;
}
export type TanreiAvatarShape = keyof TanreiAvatarShapeRegistry;
export type TanreiCoreAvatarShape = "circle" | "square";

/** The tokens of one `shape` of `comp.avatar`. */
export interface TanreiAvatarShapeTokens {
  readonly containerShape: number;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiAvatarShapes = { readonly [Key in TanreiCoreAvatarShape]: TanreiAvatarShapeTokens } & { readonly [Key in TanreiAvatarShape]?: TanreiAvatarShapeTokens };

/**
 * `comp.avatar`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`sizes`, `shapes`), keyed by the axis value.
 */
export interface TanreiAvatarTokens {
  readonly containerColor: TanreiPaint;
  readonly groupOutlineColor: TanreiPaint;
  readonly groupOutlineWidth: number;
  readonly iconColor: TanreiPaint;
  readonly labelColor: TanreiPaint;
  readonly sizes: TanreiAvatarSizes;
  readonly shapes: TanreiAvatarShapes;
}

/**
 * `comp.badge`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis, keyed by the axis value.
 */
export interface TanreiBadgeTokens {
  readonly containerColor: TanreiPaint;
  readonly containerHeight: number;
  readonly containerOffset: number;
  readonly containerPaddingInline: number;
  readonly containerShape: number;
  readonly dotOffset: number;
  readonly dotSize: number;
  readonly labelColor: TanreiPaint;
  readonly labelTypescale: TanreiTypescaleRole;
  readonly outlineColor: TanreiPaint;
  readonly outlineWidth: number;
}

/**
 * Every value of `comp.bottom-sheet`'s `control` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `dragHandle` (with a dev-only warning).
 */
export interface TanreiBottomSheetControlRegistry {
  dragHandle: true;
}
export type TanreiBottomSheetControl = keyof TanreiBottomSheetControlRegistry;
export type TanreiCoreBottomSheetControl = "dragHandle";

/** What one `control` of `comp.bottom-sheet` is drawn from in ONE interaction state. */
export interface TanreiBottomSheetControlStateTokens {
  readonly containerColor: TanreiPaint;
  readonly gripColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
}
/** One `control`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiBottomSheetControlTokens {
  readonly enabled: TanreiBottomSheetControlStateTokens;
  readonly hovered: TanreiBottomSheetControlStateTokens;
  readonly focused: TanreiBottomSheetControlStateTokens;
  readonly pressed: TanreiBottomSheetControlStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiBottomSheetControls = { readonly [Key in TanreiCoreBottomSheetControl]: TanreiBottomSheetControlTokens } & { readonly [Key in TanreiBottomSheetControl]?: TanreiBottomSheetControlTokens };

/**
 * `comp.bottom-sheet`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`controls`), keyed by the axis value.
 */
export interface TanreiBottomSheetTokens {
  readonly containerColor: TanreiPaint;
  readonly containerElevation: TanreiElevationLevel;
  readonly containerMarginBlockStart: number;
  readonly containerMaxWidth: number;
  readonly containerPadding: number;
  readonly containerPartialFraction: number;
  readonly containerShape: number;
  readonly contentColor: TanreiPaint;
  readonly focusedOpacity: number;
  readonly handleContainerHeight: number;
  readonly handleContainerShape: number;
  readonly handleContainerWidth: number;
  readonly handleGripHeight: number;
  readonly handleGripShape: number;
  readonly handleGripWidth: number;
  readonly handleMarginBlock: number;
  readonly hoveredOpacity: number;
  readonly motionEnterDuration: number;
  readonly motionEnterEasing: TanreiCubicBezier;
  readonly motionExitDuration: number;
  readonly motionExitEasing: TanreiCubicBezier;
  readonly motionFeedbackDuration: number;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly pressedOpacity: number;
  readonly scrimBlur: number;
  readonly scrimColor: TanreiPaint;
  readonly controls: TanreiBottomSheetControls;
}

/**
 * Every value of `comp.breadcrumbs`'s `part` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `item` (with a dev-only warning).
 */
export interface TanreiBreadcrumbsPartRegistry {
  item: true;
  current: true;
  overflow: true;
}
export type TanreiBreadcrumbsPart = keyof TanreiBreadcrumbsPartRegistry;
export type TanreiCoreBreadcrumbsPart = "item" | "current" | "overflow";

/** What one `part` of `comp.breadcrumbs` is drawn from in ONE interaction state. */
export interface TanreiBreadcrumbsPartStateTokens {
  readonly containerColor: TanreiPaint;
  readonly contentColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
}
/** One `part`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiBreadcrumbsPartTokens {
  readonly enabled: TanreiBreadcrumbsPartStateTokens;
  readonly hovered: TanreiBreadcrumbsPartStateTokens;
  readonly focused: TanreiBreadcrumbsPartStateTokens;
  readonly pressed: TanreiBreadcrumbsPartStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiBreadcrumbsParts = { readonly [Key in TanreiCoreBreadcrumbsPart]: TanreiBreadcrumbsPartTokens } & { readonly [Key in TanreiBreadcrumbsPart]?: TanreiBreadcrumbsPartTokens };

/**
 * `comp.breadcrumbs`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`parts`), keyed by the axis value.
 */
export interface TanreiBreadcrumbsTokens {
  readonly containerGap: number;
  readonly containerShape: number;
  readonly focusedContainerShape: number;
  readonly focusedOpacity: number;
  readonly hoveredContainerShape: number;
  readonly hoveredOpacity: number;
  readonly iconSize: number;
  readonly labelColor: TanreiPaint;
  readonly labelTypescale: TanreiTypescaleRole;
  readonly motionFeedbackDuration: number;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly pressedContainerShape: number;
  readonly pressedOpacity: number;
  readonly rowGap: number;
  readonly separatorColor: TanreiPaint;
  readonly separatorGap: number;
  readonly separatorSize: number;
  readonly underlineOffset: number;
  readonly underlineVisibility: number;
  readonly underlineWidth: number;
  readonly parts: TanreiBreadcrumbsParts;
}

/**
 * `comp.button-group`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis, keyed by the axis value.
 */
export interface TanreiButtonGroupTokens {
  readonly connectedDividerColor: TanreiPaint;
  readonly connectedDividerInset: number;
  readonly connectedDividerOnFillColor: TanreiPaint;
  readonly connectedDividerThickness: number;
  readonly connectedGap: number;
  readonly connectedHorizontalOuterInset: number;
  readonly connectedHorizontalOuterShape: number;
  readonly connectedInnerShape: number;
  readonly connectedSeparation: number;
  readonly connectedVerticalOuterShape: number;
  readonly standardGap: number;
}

/**
 * Every value of `comp.button-with-menu`'s `size` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `medium` (with a dev-only warning).
 */
export interface TanreiButtonWithMenuSizeRegistry {
  small: true;
  medium: true;
  large: true;
}
export type TanreiButtonWithMenuSize = keyof TanreiButtonWithMenuSizeRegistry;
export type TanreiCoreButtonWithMenuSize = "small" | "medium" | "large";

/** The tokens of one `size` of `comp.button-with-menu`. */
export interface TanreiButtonWithMenuSizeTokens {
  readonly containerHeight: number;
  readonly containerPaddingBlock: number;
  readonly containerGap: number;
  readonly leadingPaddingInlineStart: number;
  readonly leadingPaddingInlineStartWithIcon: number;
  readonly leadingPaddingInlineEnd: number;
  readonly trailingPaddingInline: number;
  readonly trailingPaddingInlineNarrow: number;
  readonly labelTypescale: TanreiTypescaleRole;
  readonly iconSize: number;
  readonly outlineWidth: number;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiButtonWithMenuSizes = { readonly [Key in TanreiCoreButtonWithMenuSize]: TanreiButtonWithMenuSizeTokens } & { readonly [Key in TanreiButtonWithMenuSize]?: TanreiButtonWithMenuSizeTokens };

/**
 * Every value of `comp.button-with-menu`'s `variant` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `filled` (with a dev-only warning).
 */
export interface TanreiButtonWithMenuVariantRegistry {
  filled: true;
  tonal: true;
  elevated: true;
  outlined: true;
}
export type TanreiButtonWithMenuVariant = keyof TanreiButtonWithMenuVariantRegistry;
export type TanreiCoreButtonWithMenuVariant = "filled" | "tonal" | "elevated" | "outlined";

/** What one `variant` of `comp.button-with-menu` is drawn from in ONE interaction state. */
export interface TanreiButtonWithMenuVariantStateTokens {
  readonly containerColor: TanreiPaint;
  readonly containerElevation: TanreiElevationLevel;
  readonly labelColor: TanreiPaint;
  readonly outlineColor: TanreiPaint;
  readonly dividerColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
}
/** One `variant`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiButtonWithMenuVariantTokens {
  readonly enabled: TanreiButtonWithMenuVariantStateTokens;
  readonly hovered: TanreiButtonWithMenuVariantStateTokens;
  readonly focused: TanreiButtonWithMenuVariantStateTokens;
  readonly pressed: TanreiButtonWithMenuVariantStateTokens;
  readonly disabled: TanreiButtonWithMenuVariantStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiButtonWithMenuVariants = { readonly [Key in TanreiCoreButtonWithMenuVariant]: TanreiButtonWithMenuVariantTokens } & { readonly [Key in TanreiButtonWithMenuVariant]?: TanreiButtonWithMenuVariantTokens };

/**
 * `comp.button-with-menu`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`sizes`, `variants`), keyed by the axis value.
 */
export interface TanreiButtonWithMenuTokens {
  readonly containerInnerGap: number;
  readonly containerInnerShape: number;
  readonly containerInnerShapeOpen: number;
  readonly containerOuterInset: number;
  readonly containerSeparation: number;
  readonly containerShape: number;
  readonly disabledContainerShape: number;
  readonly disabledOpacity: number;
  readonly dividerInset: number;
  readonly dividerThickness: number;
  readonly focusedContainerShape: number;
  readonly focusedOpacity: number;
  readonly hoveredContainerShape: number;
  readonly hoveredOpacity: number;
  readonly motionFeedbackDuration: number;
  readonly motionHoverCloseDelay: number;
  readonly motionHoverOpenDelay: number;
  readonly motionOpenDuration: number;
  readonly motionOpenEasing: TanreiCubicBezier;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly pressedContainerShape: number;
  readonly pressedOpacity: number;
  readonly sizes: TanreiButtonWithMenuSizes;
  readonly variants: TanreiButtonWithMenuVariants;
}

/**
 * Every value of `comp.button`'s `size` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `medium` (with a dev-only warning).
 */
export interface TanreiButtonSizeRegistry {
  small: true;
  medium: true;
  large: true;
}
export type TanreiButtonSize = keyof TanreiButtonSizeRegistry;
export type TanreiCoreButtonSize = "small" | "medium" | "large";

/** The tokens of one `size` of `comp.button`. */
export interface TanreiButtonSizeTokens {
  readonly containerHeight: number;
  readonly containerPaddingInlineNarrow: number;
  readonly containerWidthWide: number;
  readonly containerPaddingInlineStart: number;
  readonly containerPaddingInlineEnd: number;
  readonly containerPaddingInlineStartWithIcon: number;
  readonly containerPaddingInlineEndWithIcon: number;
  readonly containerPaddingBlock: number;
  readonly labelTypescale: TanreiTypescaleRole;
  readonly iconSize: number;
  readonly iconSizeWithoutLabel: number;
  readonly containerGap: number;
  readonly outlineWidth: number;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiButtonSizes = { readonly [Key in TanreiCoreButtonSize]: TanreiButtonSizeTokens } & { readonly [Key in TanreiButtonSize]?: TanreiButtonSizeTokens };

/**
 * Every value of `comp.button`'s `variant` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `filled` (with a dev-only warning).
 */
export interface TanreiButtonVariantRegistry {
  filled: true;
  tonal: true;
  elevated: true;
  outlined: true;
  text: true;
}
export type TanreiButtonVariant = keyof TanreiButtonVariantRegistry;
export type TanreiCoreButtonVariant = "filled" | "tonal" | "elevated" | "outlined" | "text";

/** What one `variant` of `comp.button` is drawn from in ONE interaction state. */
export interface TanreiButtonVariantStateTokens {
  readonly containerColor: TanreiPaint;
  readonly labelColor: TanreiPaint;
  readonly iconColor: TanreiPaint;
  readonly outlineColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
  readonly containerElevation: TanreiElevationLevel;
  readonly unselectedContainerColor: TanreiPaint;
  readonly unselectedLabelColor: TanreiPaint;
  readonly unselectedIconColor: TanreiPaint;
  readonly unselectedOutlineColor: TanreiPaint;
  readonly unselectedStateLayerColor: TanreiPaint;
  readonly selectedContainerColor: TanreiPaint;
  readonly selectedLabelColor: TanreiPaint;
  readonly selectedIconColor: TanreiPaint;
  readonly selectedOutlineColor: TanreiPaint;
  readonly selectedStateLayerColor: TanreiPaint;
}
/** One `variant`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiButtonVariantTokens {
  readonly enabled: TanreiButtonVariantStateTokens;
  readonly hovered: TanreiButtonVariantStateTokens;
  readonly focused: TanreiButtonVariantStateTokens;
  readonly pressed: TanreiButtonVariantStateTokens;
  readonly disabled: TanreiButtonVariantStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiButtonVariants = { readonly [Key in TanreiCoreButtonVariant]: TanreiButtonVariantTokens } & { readonly [Key in TanreiButtonVariant]?: TanreiButtonVariantTokens };

/**
 * `comp.button`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`sizes`, `variants`), keyed by the axis value.
 */
export interface TanreiButtonTokens {
  readonly busyIndicatorThickness: number;
  readonly containerShape: number;
  readonly disabledContainerShape: number;
  readonly disabledOpacity: number;
  readonly focusedContainerShape: number;
  readonly focusedOpacity: number;
  readonly hoveredContainerShape: number;
  readonly hoveredOpacity: number;
  readonly motionBusyCycleDuration: number;
  readonly motionFeedbackDuration: number;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly pressedContainerShape: number;
  readonly pressedOpacity: number;
  readonly sizes: TanreiButtonSizes;
  readonly variants: TanreiButtonVariants;
}

/**
 * Every value of `comp.calendar`'s `condition` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `unselected` (with a dev-only warning).
 */
export interface TanreiCalendarConditionRegistry {
  unselected: true;
  adjacent: true;
  today: true;
  selected: true;
  inRange: true;
}
export type TanreiCalendarCondition = keyof TanreiCalendarConditionRegistry;
export type TanreiCoreCalendarCondition = "unselected" | "adjacent" | "today" | "selected" | "inRange";

/** What one `condition` of `comp.calendar` is drawn from in ONE interaction state. */
export interface TanreiCalendarConditionStateTokens {
  readonly containerColor: TanreiPaint;
  readonly labelColor: TanreiPaint;
  readonly outlineColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
}
/** One `condition`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiCalendarConditionTokens {
  readonly enabled: TanreiCalendarConditionStateTokens;
  readonly hovered: TanreiCalendarConditionStateTokens;
  readonly focused: TanreiCalendarConditionStateTokens;
  readonly pressed: TanreiCalendarConditionStateTokens;
  readonly disabled: TanreiCalendarConditionStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiCalendarConditions = { readonly [Key in TanreiCoreCalendarCondition]: TanreiCalendarConditionTokens } & { readonly [Key in TanreiCalendarCondition]?: TanreiCalendarConditionTokens };

/**
 * `comp.calendar`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`conditions`), keyed by the axis value.
 */
export interface TanreiCalendarTokens {
  readonly cellSize: number;
  readonly dayContainerShape: number;
  readonly dayContainerSize: number;
  readonly dayLabelTypescale: TanreiTypescaleRole;
  readonly disabledOpacity: number;
  readonly focusedOpacity: number;
  readonly hoveredOpacity: number;
  readonly motionFeedbackDuration: number;
  readonly motionPageDuration: number;
  readonly motionPageEasing: TanreiCubicBezier;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly navigationAxis: number;
  readonly navigationGap: number;
  readonly outlineWidth: number;
  readonly pressedOpacity: number;
  readonly viewToggleContainerHeight: number;
  readonly viewToggleContainerPaddingInline: number;
  readonly viewToggleContainerShape: number;
  readonly viewToggleGap: number;
  readonly viewToggleIconSize: number;
  readonly viewToggleLabelTypescale: TanreiTypescaleRole;
  readonly weekdayColor: TanreiPaint;
  readonly weekdayTypescale: TanreiTypescaleRole;
  readonly yearContainerHeight: number;
  readonly yearContainerShape: number;
  readonly yearContainerWidth: number;
  readonly yearLabelTypescale: TanreiTypescaleRole;
  readonly conditions: TanreiCalendarConditions;
}

/**
 * Every value of `comp.callout`'s `control` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `close` (with a dev-only warning).
 */
export interface TanreiCalloutControlRegistry {
  close: true;
}
export type TanreiCalloutControl = keyof TanreiCalloutControlRegistry;
export type TanreiCoreCalloutControl = "close";

/** What one `control` of `comp.callout` is drawn from in ONE interaction state. */
export interface TanreiCalloutControlStateTokens {
  readonly containerColor: TanreiPaint;
  readonly contentColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
  readonly infoContainerColor: TanreiPaint;
  readonly infoContentColor: TanreiPaint;
  readonly infoStateLayerColor: TanreiPaint;
  readonly warningContainerColor: TanreiPaint;
  readonly warningContentColor: TanreiPaint;
  readonly warningStateLayerColor: TanreiPaint;
  readonly errorContainerColor: TanreiPaint;
  readonly errorContentColor: TanreiPaint;
  readonly errorStateLayerColor: TanreiPaint;
  readonly successContainerColor: TanreiPaint;
  readonly successContentColor: TanreiPaint;
  readonly successStateLayerColor: TanreiPaint;
  readonly outlinedContainerColor: TanreiPaint;
  readonly outlinedContentColor: TanreiPaint;
  readonly outlinedStateLayerColor: TanreiPaint;
}
/** One `control`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiCalloutControlTokens {
  readonly enabled: TanreiCalloutControlStateTokens;
  readonly hovered: TanreiCalloutControlStateTokens;
  readonly focused: TanreiCalloutControlStateTokens;
  readonly pressed: TanreiCalloutControlStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiCalloutControls = { readonly [Key in TanreiCoreCalloutControl]: TanreiCalloutControlTokens } & { readonly [Key in TanreiCalloutControl]?: TanreiCalloutControlTokens };

/**
 * Every value of `comp.callout`'s `size` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `medium` (with a dev-only warning).
 */
export interface TanreiCalloutSizeRegistry {
  medium: true;
  large: true;
}
export type TanreiCalloutSize = keyof TanreiCalloutSizeRegistry;
export type TanreiCoreCalloutSize = "medium" | "large";

/** The tokens of one `size` of `comp.callout`. */
export interface TanreiCalloutSizeTokens {
  readonly titleTypescale: TanreiTypescaleRole;
  readonly bodyTypescale: TanreiTypescaleRole;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiCalloutSizes = { readonly [Key in TanreiCoreCalloutSize]: TanreiCalloutSizeTokens } & { readonly [Key in TanreiCalloutSize]?: TanreiCalloutSizeTokens };

/**
 * Every value of `comp.callout`'s `variant` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `tonal` (with a dev-only warning).
 */
export interface TanreiCalloutVariantRegistry {
  tonal: true;
  outlined: true;
}
export type TanreiCalloutVariant = keyof TanreiCalloutVariantRegistry;
export type TanreiCoreCalloutVariant = "tonal" | "outlined";

/** The tokens of one `variant` of `comp.callout`. */
export interface TanreiCalloutVariantTokens {
  readonly containerColor: TanreiPaint;
  readonly titleColor: TanreiPaint;
  readonly bodyColor: TanreiPaint;
  readonly iconColor: TanreiPaint;
  readonly focusRingColor: TanreiPaint;
  readonly infoContainerColor: TanreiPaint;
  readonly infoTitleColor: TanreiPaint;
  readonly infoBodyColor: TanreiPaint;
  readonly infoIconColor: TanreiPaint;
  readonly infoFocusRingColor: TanreiPaint;
  readonly warningContainerColor: TanreiPaint;
  readonly warningTitleColor: TanreiPaint;
  readonly warningBodyColor: TanreiPaint;
  readonly warningIconColor: TanreiPaint;
  readonly warningFocusRingColor: TanreiPaint;
  readonly errorContainerColor: TanreiPaint;
  readonly errorTitleColor: TanreiPaint;
  readonly errorBodyColor: TanreiPaint;
  readonly errorIconColor: TanreiPaint;
  readonly errorFocusRingColor: TanreiPaint;
  readonly successContainerColor: TanreiPaint;
  readonly successTitleColor: TanreiPaint;
  readonly successBodyColor: TanreiPaint;
  readonly successIconColor: TanreiPaint;
  readonly successFocusRingColor: TanreiPaint;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiCalloutVariants = { readonly [Key in TanreiCoreCalloutVariant]: TanreiCalloutVariantTokens } & { readonly [Key in TanreiCalloutVariant]?: TanreiCalloutVariantTokens };

/**
 * `comp.callout`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`controls`, `sizes`, `variants`), keyed by the axis value.
 */
export interface TanreiCalloutTokens {
  readonly actionsGap: number;
  readonly actionsItemGap: number;
  readonly containerGap: number;
  readonly containerPaddingBlock: number;
  readonly containerPaddingInline: number;
  readonly containerPaddingInlineEndWithClose: number;
  readonly containerShape: number;
  readonly controlsHeight: number;
  readonly controlsIconSize: number;
  readonly controlsShape: number;
  readonly focusedOpacity: number;
  readonly hoveredOpacity: number;
  readonly iconGap: number;
  readonly iconOpacity: number;
  readonly iconSize: number;
  readonly motionFeedbackDuration: number;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly outlineColor: TanreiPaint;
  readonly outlineWidth: number;
  readonly pressedOpacity: number;
  readonly titleGap: number;
  readonly controls: TanreiCalloutControls;
  readonly sizes: TanreiCalloutSizes;
  readonly variants: TanreiCalloutVariants;
}

/**
 * Every value of `comp.card`'s `variant` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `outlined` (with a dev-only warning).
 */
export interface TanreiCardVariantRegistry {
  elevated: true;
  filled: true;
  outlined: true;
}
export type TanreiCardVariant = keyof TanreiCardVariantRegistry;
export type TanreiCoreCardVariant = "elevated" | "filled" | "outlined";

/** What one `variant` of `comp.card` is drawn from in ONE interaction state. */
export interface TanreiCardVariantStateTokens {
  readonly containerColor: TanreiPaint;
  readonly containerElevation: TanreiElevationLevel;
  readonly outlineColor: TanreiPaint;
  readonly contentColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
}
/** One `variant`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiCardVariantTokens {
  readonly enabled: TanreiCardVariantStateTokens;
  readonly hovered: TanreiCardVariantStateTokens;
  readonly focused: TanreiCardVariantStateTokens;
  readonly pressed: TanreiCardVariantStateTokens;
  readonly disabled: TanreiCardVariantStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiCardVariants = { readonly [Key in TanreiCoreCardVariant]: TanreiCardVariantTokens } & { readonly [Key in TanreiCardVariant]?: TanreiCardVariantTokens };

/**
 * `comp.card`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`variants`), keyed by the axis value.
 */
export interface TanreiCardTokens {
  readonly containerPadding: number;
  readonly containerShape: number;
  readonly disabledOpacity: number;
  readonly focusedOpacity: number;
  readonly hoveredOpacity: number;
  readonly motionFeedbackDuration: number;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly outlineWidth: number;
  readonly pressedOpacity: number;
  readonly variants: TanreiCardVariants;
}

/**
 * Every value of `comp.carousel`'s `part` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `item` (with a dev-only warning).
 */
export interface TanreiCarouselPartRegistry {
  item: true;
  playback: true;
  indicator: true;
}
export type TanreiCarouselPart = keyof TanreiCarouselPartRegistry;
export type TanreiCoreCarouselPart = "item" | "playback" | "indicator";

/** What one `part` of `comp.carousel` is drawn from in ONE interaction state. */
export interface TanreiCarouselPartStateTokens {
  readonly containerColor: TanreiPaint;
  readonly contentColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
}
/** One `part`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiCarouselPartTokens {
  readonly enabled: TanreiCarouselPartStateTokens;
  readonly hovered: TanreiCarouselPartStateTokens;
  readonly focused: TanreiCarouselPartStateTokens;
  readonly pressed: TanreiCarouselPartStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiCarouselParts = { readonly [Key in TanreiCoreCarouselPart]: TanreiCarouselPartTokens } & { readonly [Key in TanreiCarouselPart]?: TanreiCarouselPartTokens };

/**
 * `comp.carousel`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`parts`), keyed by the axis value.
 */
export interface TanreiCarouselTokens {
  readonly autoplayInterval: number;
  readonly containerLargeWidth: number;
  readonly containerMinScale: number;
  readonly containerShape: number;
  readonly containerSmallMaxWidth: number;
  readonly containerSmallMinWidth: number;
  readonly controlsButtonSize: number;
  readonly controlsHeight: number;
  readonly controlsIconSize: number;
  readonly controlsIndicatorPaddingInline: number;
  readonly controlsShape: number;
  readonly dotActiveWidth: number;
  readonly dotColor: TanreiPaint;
  readonly dotGap: number;
  readonly dotSize: number;
  readonly focusedContainerShape: number;
  readonly focusedOpacity: number;
  readonly hoveredContainerShape: number;
  readonly hoveredOpacity: number;
  readonly layoutGap: number;
  readonly layoutHeight: number;
  readonly layoutPaddingInline: number;
  readonly motionAutoplayDuration: number;
  readonly motionAutoplayEasing: TanreiCubicBezier;
  readonly motionFeedbackDuration: number;
  readonly motionScrollDuration: number;
  readonly motionScrollEasing: TanreiCubicBezier;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly pressedContainerShape: number;
  readonly pressedOpacity: number;
  readonly parts: TanreiCarouselParts;
}

/**
 * Every value of `comp.chat-composer`'s `condition` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `standard` (with a dev-only warning).
 */
export interface TanreiChatComposerConditionRegistry {
  standard: true;
  error: true;
}
export type TanreiChatComposerCondition = keyof TanreiChatComposerConditionRegistry;
export type TanreiCoreChatComposerCondition = "standard" | "error";

/** What one `condition` of `comp.chat-composer` is drawn from in ONE interaction state. */
export interface TanreiChatComposerConditionStateTokens {
  readonly containerColor: TanreiPaint;
  readonly containerElevation: TanreiElevationLevel;
  readonly outlineColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
}
/** One `condition`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiChatComposerConditionTokens {
  readonly enabled: TanreiChatComposerConditionStateTokens;
  readonly hovered: TanreiChatComposerConditionStateTokens;
  readonly focused: TanreiChatComposerConditionStateTokens;
  readonly disabled: TanreiChatComposerConditionStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiChatComposerConditions = { readonly [Key in TanreiCoreChatComposerCondition]: TanreiChatComposerConditionTokens } & { readonly [Key in TanreiChatComposerCondition]?: TanreiChatComposerConditionTokens };

/**
 * `comp.chat-composer`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`conditions`), keyed by the axis value.
 */
export interface TanreiChatComposerTokens {
  readonly actionsGap: number;
  readonly containerGap: number;
  readonly containerHeight: number;
  readonly containerPaddingBlock: number;
  readonly containerPaddingInline: number;
  readonly containerPaddingInlineWithButton: number;
  readonly containerRowGap: number;
  readonly containerShape: number;
  readonly counterColor: TanreiPaint;
  readonly counterErrorColor: TanreiPaint;
  readonly counterTypescale: TanreiTypescaleRole;
  readonly disabledOpacity: number;
  readonly disabledOutlineWidth: number;
  readonly focusedOpacity: number;
  readonly focusedOutlineWidth: number;
  readonly hoveredOpacity: number;
  readonly hoveredOutlineWidth: number;
  readonly inputPaddingBlock: number;
  readonly layoutInlineMinWidth: number;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly outlineWidth: number;
  readonly receivingContainerColor: TanreiPaint;
  readonly receivingOutlineColor: TanreiPaint;
  readonly receivingOutlineWidth: number;
  readonly sendButtonVariant: number;
  readonly stripGap: number;
  readonly stripOffset: number;
  readonly stripPaddingBlockStart: number;
  readonly conditions: TanreiChatComposerConditions;
}

/**
 * Every value of `comp.checkbox`'s `condition` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `unselected` (with a dev-only warning).
 */
export interface TanreiCheckboxConditionRegistry {
  unselected: true;
  selected: true;
  indeterminate: true;
  errorUnselected: true;
  errorSelected: true;
  errorIndeterminate: true;
}
export type TanreiCheckboxCondition = keyof TanreiCheckboxConditionRegistry;
export type TanreiCoreCheckboxCondition = "unselected" | "selected" | "indeterminate" | "errorUnselected" | "errorSelected" | "errorIndeterminate";

/** What one `condition` of `comp.checkbox` is drawn from in ONE interaction state. */
export interface TanreiCheckboxConditionStateTokens {
  readonly containerColor: TanreiPaint;
  readonly boxColor: TanreiPaint;
  readonly markColor: TanreiPaint;
  readonly outlineColor: TanreiPaint;
  readonly labelColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
}
/** One `condition`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiCheckboxConditionTokens {
  readonly enabled: TanreiCheckboxConditionStateTokens;
  readonly hovered: TanreiCheckboxConditionStateTokens;
  readonly focused: TanreiCheckboxConditionStateTokens;
  readonly pressed: TanreiCheckboxConditionStateTokens;
  readonly disabled: TanreiCheckboxConditionStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiCheckboxConditions = { readonly [Key in TanreiCoreCheckboxCondition]: TanreiCheckboxConditionTokens } & { readonly [Key in TanreiCheckboxCondition]?: TanreiCheckboxConditionTokens };

/**
 * `comp.checkbox`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`conditions`), keyed by the axis value.
 */
export interface TanreiCheckboxTokens {
  readonly boxShape: number;
  readonly boxSize: number;
  readonly containerShape: number;
  readonly containerSize: number;
  readonly disabledContainerShape: number;
  readonly disabledOpacity: number;
  readonly focusedContainerShape: number;
  readonly focusedOpacity: number;
  readonly hoveredContainerShape: number;
  readonly hoveredOpacity: number;
  readonly labelGap: number;
  readonly labelTypescale: TanreiTypescaleRole;
  readonly markSize: number;
  readonly markWeight: number;
  readonly markWidth: number;
  readonly motionFeedbackDuration: number;
  readonly motionMarkEnterScale: number;
  readonly motionMarkScaleDuration: number;
  readonly motionMarkScaleEasing: TanreiCubicBezier;
  readonly motionSelectionDuration: number;
  readonly motionSelectionEasing: TanreiCubicBezier;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly outlineWidth: number;
  readonly pressedContainerShape: number;
  readonly pressedOpacity: number;
  readonly conditions: TanreiCheckboxConditions;
}

/**
 * Every value of `comp.chip`'s `size` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `medium` (with a dev-only warning).
 */
export interface TanreiChipSizeRegistry {
  small: true;
  medium: true;
}
export type TanreiChipSize = keyof TanreiChipSizeRegistry;
export type TanreiCoreChipSize = "small" | "medium";

/** The tokens of one `size` of `comp.chip`. */
export interface TanreiChipSizeTokens {
  readonly containerHeight: number;
  readonly containerPaddingInline: number;
  readonly containerPaddingInlineWithIcon: number;
  readonly containerPaddingInlineWithAvatar: number;
  readonly containerPaddingInlineWithRemove: number;
  readonly containerPaddingBlock: number;
  readonly containerGap: number;
  readonly labelTypescale: TanreiTypescaleRole;
  readonly iconSize: number;
  readonly avatarSize: number;
  readonly removeContainerSize: number;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiChipSizes = { readonly [Key in TanreiCoreChipSize]: TanreiChipSizeTokens } & { readonly [Key in TanreiChipSize]?: TanreiChipSizeTokens };

/**
 * Every value of `comp.chip`'s `variant` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `outlined` (with a dev-only warning).
 */
export interface TanreiChipVariantRegistry {
  outlined: true;
  elevated: true;
}
export type TanreiChipVariant = keyof TanreiChipVariantRegistry;
export type TanreiCoreChipVariant = "outlined" | "elevated";

/** What one `variant` of `comp.chip` is drawn from in ONE interaction state. */
export interface TanreiChipVariantStateTokens {
  readonly containerColor: TanreiPaint;
  readonly containerElevation: TanreiElevationLevel;
  readonly outlineColor: TanreiPaint;
  readonly labelColor: TanreiPaint;
  readonly iconColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
  readonly removeContainerColor: TanreiPaint;
  readonly removeIconColor: TanreiPaint;
  readonly removeStateLayerColor: TanreiPaint;
  readonly destructiveRemoveContainerColor: TanreiPaint;
  readonly destructiveRemoveIconColor: TanreiPaint;
  readonly destructiveRemoveStateLayerColor: TanreiPaint;
  readonly selectedContainerColor: TanreiPaint;
  readonly selectedContainerElevation: TanreiElevationLevel;
  readonly selectedOutlineColor: TanreiPaint;
  readonly selectedLabelColor: TanreiPaint;
  readonly selectedIconColor: TanreiPaint;
  readonly selectedStateLayerColor: TanreiPaint;
}
/** One `variant`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiChipVariantTokens {
  readonly enabled: TanreiChipVariantStateTokens;
  readonly hovered: TanreiChipVariantStateTokens;
  readonly focused: TanreiChipVariantStateTokens;
  readonly pressed: TanreiChipVariantStateTokens;
  readonly disabled: TanreiChipVariantStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiChipVariants = { readonly [Key in TanreiCoreChipVariant]: TanreiChipVariantTokens } & { readonly [Key in TanreiChipVariant]?: TanreiChipVariantTokens };

/**
 * `comp.chip`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`sizes`, `variants`), keyed by the axis value.
 */
export interface TanreiChipTokens {
  readonly avatarShape: number;
  readonly checkWeight: number;
  readonly containerShape: number;
  readonly disabledOpacity: number;
  readonly focusedOpacity: number;
  readonly hoveredOpacity: number;
  readonly motionFeedbackDuration: number;
  readonly motionSelectionDuration: number;
  readonly motionSelectionEasing: TanreiCubicBezier;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly outlineWidth: number;
  readonly pressedOpacity: number;
  readonly removeContainerShape: number;
  readonly sizes: TanreiChipSizes;
  readonly variants: TanreiChipVariants;
}

/**
 * Every value of `comp.code-block`'s `size` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `medium` (with a dev-only warning).
 */
export interface TanreiCodeBlockSizeRegistry {
  small: true;
  medium: true;
}
export type TanreiCodeBlockSize = keyof TanreiCodeBlockSizeRegistry;
export type TanreiCoreCodeBlockSize = "small" | "medium";

/** The tokens of one `size` of `comp.code-block`. */
export interface TanreiCodeBlockSizeTokens {
  readonly codeTypescale: TanreiTypescaleRole;
  readonly containerPaddingBlock: number;
  readonly containerPaddingInline: number;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiCodeBlockSizes = { readonly [Key in TanreiCoreCodeBlockSize]: TanreiCodeBlockSizeTokens } & { readonly [Key in TanreiCodeBlockSize]?: TanreiCodeBlockSizeTokens };

/**
 * Every value of `comp.code-block`'s `variant` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `filled` (with a dev-only warning).
 */
export interface TanreiCodeBlockVariantRegistry {
  filled: true;
  outlined: true;
}
export type TanreiCodeBlockVariant = keyof TanreiCodeBlockVariantRegistry;
export type TanreiCoreCodeBlockVariant = "filled" | "outlined";

/** The tokens of one `variant` of `comp.code-block`. */
export interface TanreiCodeBlockVariantTokens {
  readonly containerColor: TanreiPaint;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiCodeBlockVariants = { readonly [Key in TanreiCoreCodeBlockVariant]: TanreiCodeBlockVariantTokens } & { readonly [Key in TanreiCodeBlockVariant]?: TanreiCodeBlockVariantTokens };

/**
 * Every value of `comp.code-block`'s `syntax` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `comment` (with a dev-only warning).
 */
export interface TanreiCodeBlockSyntaxRegistry {
  comment: true;
  keyword: true;
  string: true;
  constant: true;
  function: true;
  type: true;
  tag: true;
  property: true;
  punctuation: true;
}
export type TanreiCodeBlockSyntax = keyof TanreiCodeBlockSyntaxRegistry;
export type TanreiCoreCodeBlockSyntax = "comment" | "keyword" | "string" | "constant" | "function" | "type" | "tag" | "property" | "punctuation";

/** The tokens of one `syntax` of `comp.code-block`. */
export interface TanreiCodeBlockSyntaxTokens {
  readonly syntaxColor: TanreiPaint;
  readonly syntaxEmphasis: number;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiCodeBlockSyntaxs = { readonly [Key in TanreiCoreCodeBlockSyntax]: TanreiCodeBlockSyntaxTokens } & { readonly [Key in TanreiCodeBlockSyntax]?: TanreiCodeBlockSyntaxTokens };

/**
 * `comp.code-block`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`sizes`, `variants`, `syntaxs`), keyed by the axis value.
 */
export interface TanreiCodeBlockTokens {
  readonly codeColor: TanreiPaint;
  readonly codeTabSize: number;
  readonly containerShape: number;
  readonly copyButtonInset: number;
  readonly headerGap: number;
  readonly headerPaddingBlockEnd: number;
  readonly languageColor: TanreiPaint;
  readonly languageTypescale: TanreiTypescaleRole;
  readonly lineNumberColor: TanreiPaint;
  readonly lineNumberGap: number;
  readonly lineAddedContainerColor: TanreiPaint;
  readonly lineAddedMarkColor: TanreiPaint;
  readonly lineHighlightedContainerColor: TanreiPaint;
  readonly lineHighlightedMarkColor: TanreiPaint;
  readonly lineMarkWidth: number;
  readonly lineRemovedContainerColor: TanreiPaint;
  readonly lineRemovedMarkColor: TanreiPaint;
  readonly outlineColor: TanreiPaint;
  readonly outlineWidth: number;
  readonly promptColor: TanreiPaint;
  readonly syntaxMaxLength: number;
  readonly titleColor: TanreiPaint;
  readonly titleTypescale: TanreiTypescaleRole;
  readonly sizes: TanreiCodeBlockSizes;
  readonly variants: TanreiCodeBlockVariants;
  readonly syntaxs: TanreiCodeBlockSyntaxs;
}

/**
 * `comp.color-input`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis, keyed by the axis value.
 */
export interface TanreiColorInputTokens {
  readonly swatchOutlineColor: TanreiPaint;
  readonly swatchOutlineWidth: number;
  readonly swatchShape: number;
}

/**
 * Every value of `comp.combobox`'s `variant` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `stacked` (with a dev-only warning).
 */
export interface TanreiComboboxVariantRegistry {
  stacked: true;
  filled: true;
  outlined: true;
}
export type TanreiComboboxVariant = keyof TanreiComboboxVariantRegistry;
export type TanreiCoreComboboxVariant = "stacked" | "filled" | "outlined";

/** What one `variant` of `comp.combobox` is drawn from in ONE interaction state. */
export interface TanreiComboboxVariantStateTokens {
  readonly optionContainerColor: TanreiPaint;
  readonly optionLabelColor: TanreiPaint;
  readonly optionSupportingTextColor: TanreiPaint;
  readonly optionLeadingIconColor: TanreiPaint;
  readonly optionStateLayerColor: TanreiPaint;
  readonly selectedOptionContainerColor: TanreiPaint;
  readonly selectedOptionLabelColor: TanreiPaint;
  readonly selectedOptionSupportingTextColor: TanreiPaint;
  readonly selectedOptionLeadingIconColor: TanreiPaint;
  readonly selectedOptionMarkColor: TanreiPaint;
  readonly selectedOptionStateLayerColor: TanreiPaint;
}
/** One `variant`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiComboboxVariantTokens {
  readonly enabled: TanreiComboboxVariantStateTokens;
  readonly hovered: TanreiComboboxVariantStateTokens;
  readonly focused: TanreiComboboxVariantStateTokens;
  readonly pressed: TanreiComboboxVariantStateTokens;
  readonly disabled: TanreiComboboxVariantStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiComboboxVariants = { readonly [Key in TanreiCoreComboboxVariant]: TanreiComboboxVariantTokens } & { readonly [Key in TanreiComboboxVariant]?: TanreiComboboxVariantTokens };

/**
 * `comp.combobox`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`variants`), keyed by the axis value.
 */
export interface TanreiComboboxTokens {
  readonly containerActionGap: number;
  readonly disabledOpacity: number;
  readonly dividerColor: TanreiPaint;
  readonly dividerSpace: number;
  readonly dividerThickness: number;
  readonly focusedOpacity: number;
  readonly groupTitleColor: TanreiPaint;
  readonly groupTitlePaddingInline: number;
  readonly groupTitleTypescale: TanreiTypescaleRole;
  readonly groupGap: number;
  readonly hoveredOpacity: number;
  readonly listColor: TanreiPaint;
  readonly listElevation: TanreiElevationLevel;
  readonly listMaxHeight: number;
  readonly listOffset: number;
  readonly listPaddingBlock: number;
  readonly listPaddingInline: number;
  readonly listShape: number;
  readonly listViewportMargin: number;
  readonly motionCloseDuration: number;
  readonly motionCloseEasing: TanreiCubicBezier;
  readonly motionFeedbackDuration: number;
  readonly motionOpenDuration: number;
  readonly motionOpenEasing: TanreiCubicBezier;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly optionGap: number;
  readonly optionHeight: number;
  readonly optionLabelTypescale: TanreiTypescaleRole;
  readonly optionLeadingIconSize: number;
  readonly optionMarkSize: number;
  readonly optionMatchEmphasis: number;
  readonly optionPaddingBlock: number;
  readonly optionPaddingInline: number;
  readonly optionShape: number;
  readonly optionSupportingTextTypescale: TanreiTypescaleRole;
  readonly pressedOpacity: number;
  readonly separation: number;
  readonly statusColor: TanreiPaint;
  readonly statusErrorColor: TanreiPaint;
  readonly statusTypescale: TanreiTypescaleRole;
  readonly variants: TanreiComboboxVariants;
}

/**
 * `comp.copy-button`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis, keyed by the axis value.
 */
export interface TanreiCopyButtonTokens {
  readonly confirmationDuration: number;
  readonly motionResizeDuration: number;
  readonly motionResizeEasing: TanreiCubicBezier;
}

/**
 * Every value of `comp.date-time-picker`'s `condition` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `unselected` (with a dev-only warning).
 */
export interface TanreiDateTimePickerConditionRegistry {
  unselected: true;
  selected: true;
}
export type TanreiDateTimePickerCondition = keyof TanreiDateTimePickerConditionRegistry;
export type TanreiCoreDateTimePickerCondition = "unselected" | "selected";

/** What one `condition` of `comp.date-time-picker` is drawn from in ONE interaction state. */
export interface TanreiDateTimePickerConditionStateTokens {
  readonly selectorContainerColor: TanreiPaint;
  readonly selectorLabelColor: TanreiPaint;
  readonly selectorOutlineColor: TanreiPaint;
  readonly selectorOutlineWidth: number;
  readonly selectorStateLayerColor: TanreiPaint;
}
/** One `condition`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiDateTimePickerConditionTokens {
  readonly enabled: TanreiDateTimePickerConditionStateTokens;
  readonly hovered: TanreiDateTimePickerConditionStateTokens;
  readonly focused: TanreiDateTimePickerConditionStateTokens;
  readonly pressed: TanreiDateTimePickerConditionStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiDateTimePickerConditions = { readonly [Key in TanreiCoreDateTimePickerCondition]: TanreiDateTimePickerConditionTokens } & { readonly [Key in TanreiDateTimePickerCondition]?: TanreiDateTimePickerConditionTokens };

/**
 * `comp.date-time-picker`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`conditions`), keyed by the axis value.
 */
export interface TanreiDateTimePickerTokens {
  readonly actionsArrangement: number;
  readonly actionsGap: number;
  readonly actionsPaddingBlock: number;
  readonly actionsVariant: number;
  readonly containerGap: number;
  readonly containerPaddingBlock: number;
  readonly containerPaddingInline: number;
  readonly dialCenterSize: number;
  readonly dialContainerColor: TanreiPaint;
  readonly dialContainerSize: number;
  readonly dialHandleColor: TanreiPaint;
  readonly dialHandleSize: number;
  readonly dialLabelColor: TanreiPaint;
  readonly dialLabelTypescale: TanreiTypescaleRole;
  readonly dialPadding: number;
  readonly dialSelectedLabelColor: TanreiPaint;
  readonly dialTrackColor: TanreiPaint;
  readonly dialTrackWidth: number;
  readonly dividerColor: TanreiPaint;
  readonly dividerWidth: number;
  readonly dockedContainerColor: TanreiPaint;
  readonly dockedContainerElevation: TanreiElevationLevel;
  readonly dockedContainerShape: number;
  readonly dockedMotionCloseDuration: number;
  readonly dockedMotionCloseEasing: TanreiCubicBezier;
  readonly dockedMotionOpenDuration: number;
  readonly dockedMotionOpenEasing: TanreiCubicBezier;
  readonly dockedOffset: number;
  readonly dockedViewportMargin: number;
  readonly errorColor: TanreiPaint;
  readonly errorTypescale: TanreiTypescaleRole;
  readonly focusedOpacity: number;
  readonly headerGap: number;
  readonly headerLabelColor: TanreiPaint;
  readonly headerLabelTypescale: TanreiTypescaleRole;
  readonly headerPaddingBlock: number;
  readonly headerPaddingInlineEnd: number;
  readonly headerPaddingInlineStart: number;
  readonly headerPlaceholderColor: TanreiPaint;
  readonly headerValueColor: TanreiPaint;
  readonly headerValueTypescale: TanreiTypescaleRole;
  readonly hoveredOpacity: number;
  readonly modalContainerColor: TanreiPaint;
  readonly modalContainerElevation: TanreiElevationLevel;
  readonly modalContainerMargin: number;
  readonly modalContainerShape: number;
  readonly modalMotionCloseDuration: number;
  readonly modalMotionCloseEasing: TanreiCubicBezier;
  readonly modalMotionEnterScale: number;
  readonly modalMotionOpenDuration: number;
  readonly modalMotionOpenEasing: TanreiCubicBezier;
  readonly modalScrimBlur: number;
  readonly modalScrimColor: TanreiPaint;
  readonly motionDialDuration: number;
  readonly motionDialEasing: TanreiCubicBezier;
  readonly motionFeedbackDuration: number;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly motionWheelDuration: number;
  readonly motionWheelEasing: TanreiCubicBezier;
  readonly periodContainerWidth: number;
  readonly periodGap: number;
  readonly periodLabelTypescale: TanreiTypescaleRole;
  readonly pressedOpacity: number;
  readonly rangeFieldContainerHeight: number;
  readonly rangeFieldContainerPaddingInline: number;
  readonly rangeFieldGap: number;
  readonly rangeFieldLabelTypescale: TanreiTypescaleRole;
  readonly selectorContainerHeight: number;
  readonly selectorContainerShape: number;
  readonly selectorContainerWidth: number;
  readonly selectorGap: number;
  readonly selectorLabelTypescale: TanreiTypescaleRole;
  readonly separatorColor: TanreiPaint;
  readonly separatorTypescale: TanreiTypescaleRole;
  readonly timeEntryModes: number;
  readonly wheelGap: number;
  readonly wheelHeight: number;
  readonly wheelLabelColor: TanreiPaint;
  readonly wheelLabelTypescale: TanreiTypescaleRole;
  readonly wheelRowHeight: number;
  readonly wheelSelectedLabelColor: TanreiPaint;
  readonly wheelSelectionContainerColor: TanreiPaint;
  readonly wheelSelectionContainerShape: number;
  readonly wheelSelectionSpan: number;
  readonly wheelWidth: number;
  readonly conditions: TanreiDateTimePickerConditions;
}

/**
 * Every value of `comp.description-list`'s `density` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `regular` (with a dev-only warning).
 */
export interface TanreiDescriptionListDensityRegistry {
  regular: true;
  compact: true;
}
export type TanreiDescriptionListDensity = keyof TanreiDescriptionListDensityRegistry;
export type TanreiCoreDescriptionListDensity = "regular" | "compact";

/** The tokens of one `density` of `comp.description-list`. */
export interface TanreiDescriptionListDensityTokens {
  readonly factGap: number;
  readonly termGap: number;
  readonly termTypescale: TanreiTypescaleRole;
  readonly valueTypescale: TanreiTypescaleRole;
  readonly statValueTypescale: TanreiTypescaleRole;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiDescriptionListDensitys = { readonly [Key in TanreiCoreDescriptionListDensity]: TanreiDescriptionListDensityTokens } & { readonly [Key in TanreiDescriptionListDensity]?: TanreiDescriptionListDensityTokens };

/**
 * `comp.description-list`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`densitys`), keyed by the axis value.
 */
export interface TanreiDescriptionListTokens {
  readonly columnGap: number;
  readonly columnMinWidth: number;
  readonly dividerColor: TanreiPaint;
  readonly dividerThickness: number;
  readonly separation: number;
  readonly stackGap: number;
  readonly termColor: TanreiPaint;
  readonly valueColor: TanreiPaint;
  readonly densitys: TanreiDescriptionListDensitys;
}

/**
 * `comp.dialog`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis, keyed by the axis value.
 */
export interface TanreiDialogTokens {
  readonly actionsArrangement: number;
  readonly actionsGap: number;
  readonly actionsMarginBlockStart: number;
  readonly actionsVariant: number;
  readonly compactWindowWidth: number;
  readonly containerColor: TanreiPaint;
  readonly containerElevation: TanreiElevationLevel;
  readonly containerGap: number;
  readonly containerMargin: number;
  readonly containerMaxWidth: number;
  readonly containerMinWidth: number;
  readonly containerPadding: number;
  readonly containerShape: number;
  readonly contentColor: TanreiPaint;
  readonly dividerColor: TanreiPaint;
  readonly dividerWidth: number;
  readonly headerGap: number;
  readonly headlineColor: TanreiPaint;
  readonly headlineTypescale: TanreiTypescaleRole;
  readonly iconColor: TanreiPaint;
  readonly iconPlacement: number;
  readonly iconSize: number;
  readonly motionEnterDuration: number;
  readonly motionEnterEasing: TanreiCubicBezier;
  readonly motionEnterOffset: number;
  readonly motionEnterScale: number;
  readonly motionExitDuration: number;
  readonly motionExitEasing: TanreiCubicBezier;
  readonly scrimBlur: number;
  readonly scrimColor: TanreiPaint;
  readonly supportingTextColor: TanreiPaint;
  readonly supportingTextTypescale: TanreiTypescaleRole;
}

/**
 * `comp.divider`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis, keyed by the axis value.
 */
export interface TanreiDividerTokens {
  readonly lineColor: TanreiPaint;
  readonly lineDashGap: number;
  readonly lineDashLength: number;
  readonly lineDotGap: number;
  readonly lineInset: number;
  readonly lineThickness: number;
  readonly lineWaveAmplitude: number;
  readonly lineWaveWavelength: number;
}

/**
 * `comp.drop-zone`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis, keyed by the axis value.
 */
export interface TanreiDropZoneTokens {
  readonly iconColor: TanreiPaint;
  readonly iconSize: number;
  readonly labelColor: TanreiPaint;
  readonly labelTypescale: TanreiTypescaleRole;
  readonly motionDuration: number;
  readonly motionEasing: TanreiCubicBezier;
  readonly outlineColor: TanreiPaint;
  readonly outlineWidth: number;
  readonly panelContainerColor: TanreiPaint;
  readonly panelElevation: TanreiElevationLevel;
  readonly panelGap: number;
  readonly panelMargin: number;
  readonly panelMaxWidth: number;
  readonly panelPaddingBlock: number;
  readonly panelPaddingInline: number;
  readonly panelShape: number;
  readonly refusingIconColor: TanreiPaint;
  readonly refusingOutlineColor: TanreiPaint;
  readonly scrimColor: TanreiPaint;
}

/**
 * Every value of `comp.embedded-text-input`'s `condition` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `standard` (with a dev-only warning).
 */
export interface TanreiEmbeddedTextInputConditionRegistry {
  standard: true;
}
export type TanreiEmbeddedTextInputCondition = keyof TanreiEmbeddedTextInputConditionRegistry;
export type TanreiCoreEmbeddedTextInputCondition = "standard";

/** What one `condition` of `comp.embedded-text-input` is drawn from in ONE interaction state. */
export interface TanreiEmbeddedTextInputConditionStateTokens {
  readonly inputColor: TanreiPaint;
  readonly placeholderColor: TanreiPaint;
  readonly caretColor: TanreiPaint;
}
/** One `condition`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiEmbeddedTextInputConditionTokens {
  readonly enabled: TanreiEmbeddedTextInputConditionStateTokens;
  readonly disabled: TanreiEmbeddedTextInputConditionStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiEmbeddedTextInputConditions = { readonly [Key in TanreiCoreEmbeddedTextInputCondition]: TanreiEmbeddedTextInputConditionTokens } & { readonly [Key in TanreiEmbeddedTextInputCondition]?: TanreiEmbeddedTextInputConditionTokens };

/**
 * `comp.embedded-text-input`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`conditions`), keyed by the axis value.
 */
export interface TanreiEmbeddedTextInputTokens {
  readonly inputTypescale: TanreiTypescaleRole;
  readonly motionResizeDuration: number;
  readonly motionResizeEasing: TanreiCubicBezier;
  readonly selectionColor: TanreiPaint;
  readonly selectionContentColor: TanreiPaint;
  readonly conditions: TanreiEmbeddedTextInputConditions;
}

/**
 * Every value of `comp.empty-state`'s `size` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `medium` (with a dev-only warning).
 */
export interface TanreiEmptyStateSizeRegistry {
  medium: true;
  large: true;
}
export type TanreiEmptyStateSize = keyof TanreiEmptyStateSizeRegistry;
export type TanreiCoreEmptyStateSize = "medium" | "large";

/** The tokens of one `size` of `comp.empty-state`. */
export interface TanreiEmptyStateSizeTokens {
  readonly containerPaddingBlock: number;
  readonly mediaSize: number;
  readonly titleTypescale: TanreiTypescaleRole;
  readonly descriptionTypescale: TanreiTypescaleRole;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiEmptyStateSizes = { readonly [Key in TanreiCoreEmptyStateSize]: TanreiEmptyStateSizeTokens } & { readonly [Key in TanreiEmptyStateSize]?: TanreiEmptyStateSizeTokens };

/**
 * `comp.empty-state`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`sizes`), keyed by the axis value.
 */
export interface TanreiEmptyStateTokens {
  readonly actionsGap: number;
  readonly actionsItemGap: number;
  readonly containerPaddingInline: number;
  readonly contentMeasure: number;
  readonly descriptionColor: TanreiPaint;
  readonly mediaColor: TanreiPaint;
  readonly mediaGap: number;
  readonly titleColor: TanreiPaint;
  readonly titleGap: number;
  readonly sizes: TanreiEmptyStateSizes;
}

/**
 * Every value of `comp.fab-menu`'s `size` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `medium` (with a dev-only warning).
 */
export interface TanreiFabMenuSizeRegistry {
  small: true;
  medium: true;
  large: true;
}
export type TanreiFabMenuSize = keyof TanreiFabMenuSizeRegistry;
export type TanreiCoreFabMenuSize = "small" | "medium" | "large";

/** The tokens of one `size` of `comp.fab-menu`. */
export interface TanreiFabMenuSizeTokens {
  readonly containerSize: number;
  readonly containerShape: number;
  readonly iconSize: number;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiFabMenuSizes = { readonly [Key in TanreiCoreFabMenuSize]: TanreiFabMenuSizeTokens } & { readonly [Key in TanreiFabMenuSize]?: TanreiFabMenuSizeTokens };

/**
 * Every value of `comp.fab-menu`'s `variant` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `filled` (with a dev-only warning).
 */
export interface TanreiFabMenuVariantRegistry {
  filled: true;
  tonal: true;
  surface: true;
}
export type TanreiFabMenuVariant = keyof TanreiFabMenuVariantRegistry;
export type TanreiCoreFabMenuVariant = "filled" | "tonal" | "surface";

/** What one `variant` of `comp.fab-menu` is drawn from in ONE interaction state. */
export interface TanreiFabMenuVariantStateTokens {
  readonly containerColor: TanreiPaint;
  readonly containerElevation: TanreiElevationLevel;
  readonly iconColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
  readonly openContainerColor: TanreiPaint;
  readonly openContainerElevation: TanreiElevationLevel;
  readonly openIconColor: TanreiPaint;
  readonly openStateLayerColor: TanreiPaint;
  readonly itemContainerColor: TanreiPaint;
  readonly itemContainerElevation: TanreiElevationLevel;
  readonly itemLabelColor: TanreiPaint;
  readonly itemIconColor: TanreiPaint;
  readonly itemStateLayerColor: TanreiPaint;
}
/** One `variant`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiFabMenuVariantTokens {
  readonly enabled: TanreiFabMenuVariantStateTokens;
  readonly hovered: TanreiFabMenuVariantStateTokens;
  readonly focused: TanreiFabMenuVariantStateTokens;
  readonly pressed: TanreiFabMenuVariantStateTokens;
  readonly disabled: TanreiFabMenuVariantStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiFabMenuVariants = { readonly [Key in TanreiCoreFabMenuVariant]: TanreiFabMenuVariantTokens } & { readonly [Key in TanreiFabMenuVariant]?: TanreiFabMenuVariantTokens };

/**
 * `comp.fab-menu`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`sizes`, `variants`), keyed by the axis value.
 */
export interface TanreiFabMenuTokens {
  readonly containerShapeOpen: number;
  readonly disabledOpacity: number;
  readonly focusedOpacity: number;
  readonly hoveredOpacity: number;
  readonly itemGap: number;
  readonly itemHeight: number;
  readonly itemIconSize: number;
  readonly itemLabelTypescale: TanreiTypescaleRole;
  readonly itemPaddingInlineEnd: number;
  readonly itemPaddingInlineStart: number;
  readonly itemShape: number;
  readonly listGap: number;
  readonly listOffset: number;
  readonly motionCloseDuration: number;
  readonly motionCloseEasing: TanreiCubicBezier;
  readonly motionFeedbackDuration: number;
  readonly motionOpenDuration: number;
  readonly motionOpenEasing: TanreiCubicBezier;
  readonly motionStagger: number;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly pressedOpacity: number;
  readonly sizes: TanreiFabMenuSizes;
  readonly variants: TanreiFabMenuVariants;
}

/**
 * Every value of `comp.field-group`'s `spacing` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `controls` (with a dev-only warning).
 */
export interface TanreiFieldGroupSpacingRegistry {
  controls: true;
  fields: true;
}
export type TanreiFieldGroupSpacing = keyof TanreiFieldGroupSpacingRegistry;
export type TanreiCoreFieldGroupSpacing = "controls" | "fields";

/** The tokens of one `spacing` of `comp.field-group`. */
export interface TanreiFieldGroupSpacingTokens {
  readonly gap: number;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiFieldGroupSpacings = { readonly [Key in TanreiCoreFieldGroupSpacing]: TanreiFieldGroupSpacingTokens } & { readonly [Key in TanreiFieldGroupSpacing]?: TanreiFieldGroupSpacingTokens };

/**
 * Every value of `comp.field-group`'s `condition` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `standard` (with a dev-only warning).
 */
export interface TanreiFieldGroupConditionRegistry {
  standard: true;
}
export type TanreiFieldGroupCondition = keyof TanreiFieldGroupConditionRegistry;
export type TanreiCoreFieldGroupCondition = "standard";

/** What one `condition` of `comp.field-group` is drawn from in ONE interaction state. */
export interface TanreiFieldGroupConditionStateTokens {
  readonly labelColor: TanreiPaint;
  readonly supportingTextColor: TanreiPaint;
  readonly requiredAsteriskColor: TanreiPaint;
  readonly errorTextColor: TanreiPaint;
  readonly errorLabelColor: TanreiPaint;
  readonly errorSupportingTextColor: TanreiPaint;
  readonly errorRequiredAsteriskColor: TanreiPaint;
}
/** One `condition`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiFieldGroupConditionTokens {
  readonly enabled: TanreiFieldGroupConditionStateTokens;
  readonly disabled: TanreiFieldGroupConditionStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiFieldGroupConditions = { readonly [Key in TanreiCoreFieldGroupCondition]: TanreiFieldGroupConditionTokens } & { readonly [Key in TanreiFieldGroupCondition]?: TanreiFieldGroupConditionTokens };

/**
 * `comp.field-group`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`spacings`, `conditions`), keyed by the axis value.
 */
export interface TanreiFieldGroupTokens {
  readonly errorTextGap: number;
  readonly fieldMinWidth: number;
  readonly gapInline: number;
  readonly labelGap: number;
  readonly labelTypescale: TanreiTypescaleRole;
  readonly requirementAsteriskGap: number;
  readonly requirementGap: number;
  readonly requirementMark: number;
  readonly supportingTextGap: number;
  readonly supportingTextTypescale: TanreiTypescaleRole;
  readonly spacings: TanreiFieldGroupSpacings;
  readonly conditions: TanreiFieldGroupConditions;
}

/**
 * Every value of `comp.field`'s `condition` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `standard` (with a dev-only warning).
 */
export interface TanreiFieldConditionRegistry {
  standard: true;
}
export type TanreiFieldCondition = keyof TanreiFieldConditionRegistry;
export type TanreiCoreFieldCondition = "standard";

/** What one `condition` of `comp.field` is drawn from in ONE interaction state. */
export interface TanreiFieldConditionStateTokens {
  readonly labelColor: TanreiPaint;
  readonly labelIconColor: TanreiPaint;
  readonly supportingTextColor: TanreiPaint;
  readonly requiredAsteriskColor: TanreiPaint;
  readonly errorLabelColor: TanreiPaint;
  readonly errorLabelIconColor: TanreiPaint;
  readonly errorSupportingTextColor: TanreiPaint;
  readonly errorRequiredAsteriskColor: TanreiPaint;
  readonly counterColor: TanreiPaint;
  readonly errorCounterColor: TanreiPaint;
  readonly valueTextColor: TanreiPaint;
  readonly errorValueTextColor: TanreiPaint;
  readonly errorTextColor: TanreiPaint;
}
/** One `condition`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiFieldConditionTokens {
  readonly enabled: TanreiFieldConditionStateTokens;
  readonly focused: TanreiFieldConditionStateTokens;
  readonly disabled: TanreiFieldConditionStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiFieldConditions = { readonly [Key in TanreiCoreFieldCondition]: TanreiFieldConditionTokens } & { readonly [Key in TanreiFieldCondition]?: TanreiFieldConditionTokens };

/**
 * `comp.field`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`conditions`), keyed by the axis value.
 */
export interface TanreiFieldTokens {
  readonly counterGap: number;
  readonly errorTextGap: number;
  readonly errorTextPlacement: number;
  readonly labelIconGap: number;
  readonly labelIconSize: number;
  readonly labelGap: number;
  readonly labelTypescale: TanreiTypescaleRole;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly requirementAsteriskGap: number;
  readonly requirementGap: number;
  readonly requirementMark: number;
  readonly supportingTextGap: number;
  readonly supportingTextTypescale: TanreiTypescaleRole;
  readonly valueTextGap: number;
  readonly valueTextTypescale: TanreiTypescaleRole;
  readonly conditions: TanreiFieldConditions;
}

/**
 * Every value of `comp.figure`'s `variant` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `outlined` (with a dev-only warning).
 */
export interface TanreiFigureVariantRegistry {
  outlined: true;
  filled: true;
  plain: true;
}
export type TanreiFigureVariant = keyof TanreiFigureVariantRegistry;
export type TanreiCoreFigureVariant = "outlined" | "filled" | "plain";

/** The tokens of one `variant` of `comp.figure`. */
export interface TanreiFigureVariantTokens {
  readonly containerColor: TanreiPaint;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiFigureVariants = { readonly [Key in TanreiCoreFigureVariant]: TanreiFigureVariantTokens } & { readonly [Key in TanreiFigureVariant]?: TanreiFigureVariantTokens };

/**
 * `comp.figure`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`variants`), keyed by the axis value.
 */
export interface TanreiFigureTokens {
  readonly attachmentGap: number;
  readonly captionColor: TanreiPaint;
  readonly captionGap: number;
  readonly captionTypescale: TanreiTypescaleRole;
  readonly containerShape: number;
  readonly contentColor: TanreiPaint;
  readonly dividerColor: TanreiPaint;
  readonly dividerThickness: number;
  readonly headerGap: number;
  readonly headerPaddingBlock: number;
  readonly headerPaddingInline: number;
  readonly headerPaddingInlineEndWithActions: number;
  readonly outlineColor: TanreiPaint;
  readonly outlineWidth: number;
  readonly patternCheckerboardSize: number;
  readonly patternClearExtent: number;
  readonly patternColor: TanreiPaint;
  readonly patternDotSize: number;
  readonly patternLineThickness: number;
  readonly patternSpacing: number;
  readonly separation: number;
  readonly stagePaddingBlock: number;
  readonly stagePaddingInline: number;
  readonly titleColor: TanreiPaint;
  readonly titleTypescale: TanreiTypescaleRole;
  readonly variants: TanreiFigureVariants;
}

/**
 * Every value of `comp.file-item`'s `form` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `row` (with a dev-only warning).
 */
export interface TanreiFileItemFormRegistry {
  row: true;
  tile: true;
}
export type TanreiFileItemForm = keyof TanreiFileItemFormRegistry;
export type TanreiCoreFileItemForm = "row" | "tile";

/** What one `form` of `comp.file-item` is drawn from in ONE interaction state. */
export interface TanreiFileItemFormStateTokens {
  readonly containerColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
  readonly actionContainerColor: TanreiPaint;
  readonly actionIconColor: TanreiPaint;
  readonly actionStateLayerColor: TanreiPaint;
}
/** One `form`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiFileItemFormTokens {
  readonly enabled: TanreiFileItemFormStateTokens;
  readonly hovered: TanreiFileItemFormStateTokens;
  readonly focused: TanreiFileItemFormStateTokens;
  readonly pressed: TanreiFileItemFormStateTokens;
  readonly disabled: TanreiFileItemFormStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiFileItemForms = { readonly [Key in TanreiCoreFileItemForm]: TanreiFileItemFormTokens } & { readonly [Key in TanreiFileItemForm]?: TanreiFileItemFormTokens };

/**
 * `comp.file-item`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`forms`), keyed by the axis value.
 */
export interface TanreiFileItemTokens {
  readonly actionGap: number;
  readonly actionIconSize: number;
  readonly actionShape: number;
  readonly actionSize: number;
  readonly disabledOpacity: number;
  readonly doneIconColor: TanreiPaint;
  readonly errorIconColor: TanreiPaint;
  readonly errorSupportingTextColor: TanreiPaint;
  readonly focusedOpacity: number;
  readonly headlineColor: TanreiPaint;
  readonly headlineTypescale: TanreiTypescaleRole;
  readonly hoveredOpacity: number;
  readonly iconColor: TanreiPaint;
  readonly mediaColor: TanreiPaint;
  readonly motionCycleDuration: number;
  readonly motionCycleEasing: TanreiCubicBezier;
  readonly motionFeedbackDuration: number;
  readonly motionProgressDuration: number;
  readonly motionProgressEasing: TanreiCubicBezier;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly pressedOpacity: number;
  readonly progressGap: number;
  readonly progressIndicatorColor: TanreiPaint;
  readonly progressShape: number;
  readonly progressThickness: number;
  readonly progressTrackColor: TanreiPaint;
  readonly rowContainerGap: number;
  readonly rowContainerOutset: number;
  readonly rowContainerShape: number;
  readonly rowIconSize: number;
  readonly rowMediaHeight: number;
  readonly rowMediaShape: number;
  readonly statusIconGap: number;
  readonly statusIconSize: number;
  readonly supportingTextColor: TanreiPaint;
  readonly supportingTextTypescale: TanreiTypescaleRole;
  readonly tileActionInset: number;
  readonly tileContainerGap: number;
  readonly tileContainerShape: number;
  readonly tileIconSize: number;
  readonly tileMediaHeight: number;
  readonly forms: TanreiFileItemForms;
}

/**
 * Every value of `comp.file-picker`'s `condition` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `standard` (with a dev-only warning).
 */
export interface TanreiFilePickerConditionRegistry {
  standard: true;
}
export type TanreiFilePickerCondition = keyof TanreiFilePickerConditionRegistry;
export type TanreiCoreFilePickerCondition = "standard";

/** What one `condition` of `comp.file-picker` is drawn from in ONE interaction state. */
export interface TanreiFilePickerConditionStateTokens {
  readonly containerColor: TanreiPaint;
  readonly outlineColor: TanreiPaint;
  readonly iconColor: TanreiPaint;
  readonly labelColor: TanreiPaint;
  readonly supportingTextColor: TanreiPaint;
  readonly selectionTextColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
  readonly errorOutlineColor: TanreiPaint;
}
/** One `condition`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiFilePickerConditionTokens {
  readonly enabled: TanreiFilePickerConditionStateTokens;
  readonly hovered: TanreiFilePickerConditionStateTokens;
  readonly focused: TanreiFilePickerConditionStateTokens;
  readonly pressed: TanreiFilePickerConditionStateTokens;
  readonly disabled: TanreiFilePickerConditionStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiFilePickerConditions = { readonly [Key in TanreiCoreFilePickerCondition]: TanreiFilePickerConditionTokens } & { readonly [Key in TanreiFilePickerCondition]?: TanreiFilePickerConditionTokens };

/**
 * `comp.file-picker`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`conditions`), keyed by the axis value.
 */
export interface TanreiFilePickerTokens {
  readonly containerGap: number;
  readonly containerPaddingBlock: number;
  readonly containerPaddingInline: number;
  readonly containerShape: number;
  readonly disabledOpacity: number;
  readonly focusedOpacity: number;
  readonly hoveredOpacity: number;
  readonly iconSize: number;
  readonly labelTypescale: TanreiTypescaleRole;
  readonly motionFeedbackDuration: number;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly outlineDashLength: number;
  readonly outlineStyle: number;
  readonly outlineWidth: number;
  readonly pressedOpacity: number;
  readonly receivingContainerColor: TanreiPaint;
  readonly receivingContentColor: TanreiPaint;
  readonly receivingOutlineColor: TanreiPaint;
  readonly refusingIconColor: TanreiPaint;
  readonly refusingOutlineColor: TanreiPaint;
  readonly selectionTextTypescale: TanreiTypescaleRole;
  readonly supportingTextGap: number;
  readonly supportingTextTypescale: TanreiTypescaleRole;
  readonly triggerGap: number;
  readonly conditions: TanreiFilePickerConditions;
}

/**
 * `comp.file-upload`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis, keyed by the axis value.
 */
export interface TanreiFileUploadTokens {
  readonly listGap: number;
}

/**
 * `comp.image-preview`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis, keyed by the axis value.
 */
export interface TanreiImagePreviewTokens {
  readonly barButtonVariant: number;
  readonly barContainerColor: TanreiPaint;
  readonly barGap: number;
  readonly barHeight: number;
  readonly barPaddingInline: number;
  readonly captionColor: TanreiPaint;
  readonly captionContainerColor: TanreiPaint;
  readonly captionMaxWidth: number;
  readonly captionPaddingBlock: number;
  readonly captionPaddingInline: number;
  readonly captionTypescale: TanreiTypescaleRole;
  readonly containerColor: TanreiPaint;
  readonly countColor: TanreiPaint;
  readonly countPaddingInline: number;
  readonly countTypescale: TanreiTypescaleRole;
  readonly errorGap: number;
  readonly errorIconColor: TanreiPaint;
  readonly errorIconSize: number;
  readonly errorTextColor: TanreiPaint;
  readonly errorTextTypescale: TanreiTypescaleRole;
  readonly layoutPageGap: number;
  readonly motionControlsDuration: number;
  readonly motionControlsEasing: TanreiCubicBezier;
  readonly motionEnterDuration: number;
  readonly motionEnterEasing: TanreiCubicBezier;
  readonly motionEnterScale: number;
  readonly motionExitDuration: number;
  readonly motionExitEasing: TanreiCubicBezier;
  readonly motionPageDuration: number;
  readonly motionPageEasing: TanreiCubicBezier;
  readonly motionZoomDuration: number;
  readonly motionZoomEasing: TanreiCubicBezier;
  readonly navigationButtonVariant: number;
  readonly navigationMarginInline: number;
}

/**
 * `comp.inline-code`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis, keyed by the axis value.
 */
export interface TanreiInlineCodeTokens {
  readonly containerColor: TanreiPaint;
  readonly containerPaddingInline: number;
  readonly containerShape: number;
  readonly labelColor: TanreiPaint;
  readonly labelScale: number;
  readonly labelTypescale: TanreiTypescaleRole;
  readonly outlineColor: TanreiPaint;
  readonly outlineWidth: number;
}

/**
 * Every value of `comp.input-box`'s `size` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `medium` (with a dev-only warning).
 */
export interface TanreiInputBoxSizeRegistry {
  small: true;
  medium: true;
  large: true;
}
export type TanreiInputBoxSize = keyof TanreiInputBoxSizeRegistry;
export type TanreiCoreInputBoxSize = "small" | "medium" | "large";

/** The tokens of one `size` of `comp.input-box`. */
export interface TanreiInputBoxSizeTokens {
  readonly containerHeight: number;
  readonly containerPaddingInline: number;
  readonly containerPaddingInlineWithIcon: number;
  readonly containerPaddingBlock: number;
  readonly containerPaddingBlockWithLabel: number;
  readonly containerGap: number;
  readonly labelTypescale: TanreiTypescaleRole;
  readonly labelFloatedTypescale: TanreiTypescaleRole;
  readonly inputTypescale: TanreiTypescaleRole;
  readonly iconSize: number;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiInputBoxSizes = { readonly [Key in TanreiCoreInputBoxSize]: TanreiInputBoxSizeTokens } & { readonly [Key in TanreiInputBoxSize]?: TanreiInputBoxSizeTokens };

/**
 * Every value of `comp.input-box`'s `variant` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `stacked` (with a dev-only warning).
 */
export interface TanreiInputBoxVariantRegistry {
  stacked: true;
  filled: true;
  outlined: true;
}
export type TanreiInputBoxVariant = keyof TanreiInputBoxVariantRegistry;
export type TanreiCoreInputBoxVariant = "stacked" | "filled" | "outlined";

/** What one `variant` of `comp.input-box` is drawn from in ONE interaction state. */
export interface TanreiInputBoxVariantStateTokens {
  readonly containerColor: TanreiPaint;
  readonly activeIndicatorColor: TanreiPaint;
  readonly outlineColor: TanreiPaint;
  readonly labelColor: TanreiPaint;
  readonly inputColor: TanreiPaint;
  readonly placeholderColor: TanreiPaint;
  readonly affixColor: TanreiPaint;
  readonly leadingIconColor: TanreiPaint;
  readonly trailingIconColor: TanreiPaint;
  readonly caretColor: TanreiPaint;
  readonly requiredAsteriskColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
  readonly errorContainerColor: TanreiPaint;
  readonly errorActiveIndicatorColor: TanreiPaint;
  readonly errorOutlineColor: TanreiPaint;
  readonly errorLabelColor: TanreiPaint;
  readonly errorInputColor: TanreiPaint;
  readonly errorPlaceholderColor: TanreiPaint;
  readonly errorAffixColor: TanreiPaint;
  readonly errorLeadingIconColor: TanreiPaint;
  readonly errorTrailingIconColor: TanreiPaint;
  readonly errorCaretColor: TanreiPaint;
  readonly errorRequiredAsteriskColor: TanreiPaint;
  readonly errorStateLayerColor: TanreiPaint;
}
/** One `variant`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiInputBoxVariantTokens {
  readonly enabled: TanreiInputBoxVariantStateTokens;
  readonly hovered: TanreiInputBoxVariantStateTokens;
  readonly focused: TanreiInputBoxVariantStateTokens;
  readonly disabled: TanreiInputBoxVariantStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiInputBoxVariants = { readonly [Key in TanreiCoreInputBoxVariant]: TanreiInputBoxVariantTokens } & { readonly [Key in TanreiInputBoxVariant]?: TanreiInputBoxVariantTokens };

/**
 * `comp.input-box`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`sizes`, `variants`), keyed by the axis value.
 */
export interface TanreiInputBoxTokens {
  readonly activeIndicatorWidth: number;
  readonly affixGap: number;
  readonly containerShape: number;
  readonly containerShapeBottom: number;
  readonly disabledActiveIndicatorWidth: number;
  readonly disabledOpacity: number;
  readonly disabledOutlineWidth: number;
  readonly focusedActiveIndicatorWidth: number;
  readonly focusedOpacity: number;
  readonly focusedOutlineWidth: number;
  readonly hoveredActiveIndicatorWidth: number;
  readonly hoveredOpacity: number;
  readonly hoveredOutlineWidth: number;
  readonly motionLabelDuration: number;
  readonly motionLabelEasing: TanreiCubicBezier;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly outlineNotchPadding: number;
  readonly outlineWidth: number;
  readonly requirementAsteriskGap: number;
  readonly selectionColor: TanreiPaint;
  readonly selectionContentColor: TanreiPaint;
  readonly sizes: TanreiInputBoxSizes;
  readonly variants: TanreiInputBoxVariants;
}

/**
 * Every value of `comp.keyboard-shortcut`'s `size` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `medium` (with a dev-only warning).
 */
export interface TanreiKeyboardShortcutSizeRegistry {
  small: true;
  medium: true;
}
export type TanreiKeyboardShortcutSize = keyof TanreiKeyboardShortcutSizeRegistry;
export type TanreiCoreKeyboardShortcutSize = "small" | "medium";

/** The tokens of one `size` of `comp.keyboard-shortcut`. */
export interface TanreiKeyboardShortcutSizeTokens {
  readonly containerHeight: number;
  readonly containerPaddingInline: number;
  readonly containerShape: number;
  readonly labelTypescale: TanreiTypescaleRole;
  readonly chordGap: number;
  readonly sequenceGap: number;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiKeyboardShortcutSizes = { readonly [Key in TanreiCoreKeyboardShortcutSize]: TanreiKeyboardShortcutSizeTokens } & { readonly [Key in TanreiKeyboardShortcutSize]?: TanreiKeyboardShortcutSizeTokens };

/**
 * Every value of `comp.keyboard-shortcut`'s `variant` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `keycap` (with a dev-only warning).
 */
export interface TanreiKeyboardShortcutVariantRegistry {
  keycap: true;
  plain: true;
}
export type TanreiKeyboardShortcutVariant = keyof TanreiKeyboardShortcutVariantRegistry;
export type TanreiCoreKeyboardShortcutVariant = "keycap" | "plain";

/** What one `variant` of `comp.keyboard-shortcut` is drawn from in ONE interaction state. */
export interface TanreiKeyboardShortcutVariantStateTokens {
  readonly labelColor: TanreiPaint;
}
/** One `variant`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiKeyboardShortcutVariantTokens {
  readonly enabled: TanreiKeyboardShortcutVariantStateTokens;
  readonly disabled: TanreiKeyboardShortcutVariantStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiKeyboardShortcutVariants = { readonly [Key in TanreiCoreKeyboardShortcutVariant]: TanreiKeyboardShortcutVariantTokens } & { readonly [Key in TanreiKeyboardShortcutVariant]?: TanreiKeyboardShortcutVariantTokens };

/**
 * `comp.keyboard-shortcut`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`sizes`, `variants`), keyed by the axis value.
 */
export interface TanreiKeyboardShortcutTokens {
  readonly containerColor: TanreiPaint;
  readonly outlineBottomWidth: number;
  readonly outlineColor: TanreiPaint;
  readonly outlineWidth: number;
  readonly sizes: TanreiKeyboardShortcutSizes;
  readonly variants: TanreiKeyboardShortcutVariants;
}

/**
 * Every value of `comp.link-card`'s `variant` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `outlined` (with a dev-only warning).
 */
export interface TanreiLinkCardVariantRegistry {
  outlined: true;
  filled: true;
}
export type TanreiLinkCardVariant = keyof TanreiLinkCardVariantRegistry;
export type TanreiCoreLinkCardVariant = "outlined" | "filled";

/** What one `variant` of `comp.link-card` is drawn from in ONE interaction state. */
export interface TanreiLinkCardVariantStateTokens {
  readonly containerColor: TanreiPaint;
  readonly outlineColor: TanreiPaint;
  readonly titleColor: TanreiPaint;
  readonly descriptionColor: TanreiPaint;
  readonly siteColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
}
/** One `variant`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiLinkCardVariantTokens {
  readonly enabled: TanreiLinkCardVariantStateTokens;
  readonly hovered: TanreiLinkCardVariantStateTokens;
  readonly focused: TanreiLinkCardVariantStateTokens;
  readonly pressed: TanreiLinkCardVariantStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiLinkCardVariants = { readonly [Key in TanreiCoreLinkCardVariant]: TanreiLinkCardVariantTokens } & { readonly [Key in TanreiLinkCardVariant]?: TanreiLinkCardVariantTokens };

/**
 * `comp.link-card`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`variants`), keyed by the axis value.
 */
export interface TanreiLinkCardTokens {
  readonly containerPadding: number;
  readonly containerShape: number;
  readonly descriptionMaxLines: number;
  readonly descriptionTypescale: TanreiTypescaleRole;
  readonly focusedOpacity: number;
  readonly hoveredOpacity: number;
  readonly layoutBesideMinWidth: number;
  readonly mediaAspectRatio: number;
  readonly mediaContainerColor: TanreiPaint;
  readonly mediaWidth: number;
  readonly motionFeedbackDuration: number;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly outlineWidth: number;
  readonly pressedOpacity: number;
  readonly siteGap: number;
  readonly siteIconShape: number;
  readonly siteIconSize: number;
  readonly siteItemGap: number;
  readonly siteTypescale: TanreiTypescaleRole;
  readonly titleGap: number;
  readonly titleMaxLines: number;
  readonly titleTypescale: TanreiTypescaleRole;
  readonly variants: TanreiLinkCardVariants;
}

/**
 * Every value of `comp.link`'s `variant` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `standard` (with a dev-only warning).
 */
export interface TanreiLinkVariantRegistry {
  standard: true;
  inverse: true;
}
export type TanreiLinkVariant = keyof TanreiLinkVariantRegistry;
export type TanreiCoreLinkVariant = "standard" | "inverse";

/** What one `variant` of `comp.link` is drawn from in ONE interaction state. */
export interface TanreiLinkVariantStateTokens {
  readonly containerColor: TanreiPaint;
  readonly labelColor: TanreiPaint;
  readonly iconColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
  readonly currentContainerColor: TanreiPaint;
  readonly currentLabelColor: TanreiPaint;
  readonly currentIconColor: TanreiPaint;
  readonly currentStateLayerColor: TanreiPaint;
}
/** One `variant`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiLinkVariantTokens {
  readonly enabled: TanreiLinkVariantStateTokens;
  readonly hovered: TanreiLinkVariantStateTokens;
  readonly focused: TanreiLinkVariantStateTokens;
  readonly pressed: TanreiLinkVariantStateTokens;
  readonly disabled: TanreiLinkVariantStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiLinkVariants = { readonly [Key in TanreiCoreLinkVariant]: TanreiLinkVariantTokens } & { readonly [Key in TanreiLinkVariant]?: TanreiLinkVariantTokens };

/**
 * `comp.link`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`variants`), keyed by the axis value.
 */
export interface TanreiLinkTokens {
  readonly containerGap: number;
  readonly containerShape: number;
  readonly disabledContainerShape: number;
  readonly disabledOpacity: number;
  readonly externalMarks: number;
  readonly focusedContainerShape: number;
  readonly focusedOpacity: number;
  readonly hoveredContainerShape: number;
  readonly hoveredOpacity: number;
  readonly motionFeedbackDuration: number;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly pressedContainerShape: number;
  readonly pressedOpacity: number;
  readonly siteIconDisabledOpacity: number;
  readonly siteIconShape: number;
  readonly underlineOffset: number;
  readonly underlineVisibility: number;
  readonly underlineWidth: number;
  readonly variants: TanreiLinkVariants;
}

/**
 * Every value of `comp.list`'s `condition` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `unselected` (with a dev-only warning).
 */
export interface TanreiListConditionRegistry {
  unselected: true;
  selected: true;
}
export type TanreiListCondition = keyof TanreiListConditionRegistry;
export type TanreiCoreListCondition = "unselected" | "selected";

/** What one `condition` of `comp.list` is drawn from in ONE interaction state. */
export interface TanreiListConditionStateTokens {
  readonly containerColor: TanreiPaint;
  readonly contentColor: TanreiPaint;
  readonly markColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
}
/** One `condition`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiListConditionTokens {
  readonly enabled: TanreiListConditionStateTokens;
  readonly hovered: TanreiListConditionStateTokens;
  readonly focused: TanreiListConditionStateTokens;
  readonly pressed: TanreiListConditionStateTokens;
  readonly disabled: TanreiListConditionStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiListConditions = { readonly [Key in TanreiCoreListCondition]: TanreiListConditionTokens } & { readonly [Key in TanreiListCondition]?: TanreiListConditionTokens };

/**
 * `comp.list`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`conditions`), keyed by the axis value.
 */
export interface TanreiListTokens {
  readonly containerGap: number;
  readonly containerHeight: number;
  readonly containerPaddingBlock: number;
  readonly containerPaddingInlineEnd: number;
  readonly containerPaddingInlineStart: number;
  readonly containerShape: number;
  readonly contentTypescale: TanreiTypescaleRole;
  readonly disabledContainerShape: number;
  readonly disabledOpacity: number;
  readonly dividerColor: TanreiPaint;
  readonly dividerThickness: number;
  readonly draggedContainerColor: TanreiPaint;
  readonly draggedContainerElevation: TanreiElevationLevel;
  readonly focusedContainerShape: number;
  readonly focusedOpacity: number;
  readonly gapLarge: number;
  readonly gapMedium: number;
  readonly gapSmall: number;
  readonly hoveredContainerShape: number;
  readonly hoveredOpacity: number;
  readonly markSize: number;
  readonly markWidth: number;
  readonly motionFeedbackDuration: number;
  readonly motionReorderDuration: number;
  readonly motionReorderEasing: TanreiCubicBezier;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly pressedContainerShape: number;
  readonly pressedOpacity: number;
  readonly conditions: TanreiListConditions;
}

/**
 * Every value of `comp.loading-indicator`'s `size` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `medium` (with a dev-only warning).
 */
export interface TanreiLoadingIndicatorSizeRegistry {
  small: true;
  medium: true;
  large: true;
}
export type TanreiLoadingIndicatorSize = keyof TanreiLoadingIndicatorSizeRegistry;
export type TanreiCoreLoadingIndicatorSize = "small" | "medium" | "large";

/** The tokens of one `size` of `comp.loading-indicator`. */
export interface TanreiLoadingIndicatorSizeTokens {
  readonly indicatorSize: number;
  readonly indicatorThickness: number;
  readonly containerSize: number;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiLoadingIndicatorSizes = { readonly [Key in TanreiCoreLoadingIndicatorSize]: TanreiLoadingIndicatorSizeTokens } & { readonly [Key in TanreiLoadingIndicatorSize]?: TanreiLoadingIndicatorSizeTokens };

/**
 * `comp.loading-indicator`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`sizes`), keyed by the axis value.
 */
export interface TanreiLoadingIndicatorTokens {
  readonly containedContainerColor: TanreiPaint;
  readonly containedContainerElevation: TanreiElevationLevel;
  readonly containedIndicatorColor: TanreiPaint;
  readonly containerShape: number;
  readonly indicatorColor: TanreiPaint;
  readonly motionCycleDuration: number;
  readonly motionEnterDuration: number;
  readonly motionEnterEasing: TanreiCubicBezier;
  readonly motionEntrance: number;
  readonly motionShowDelay: number;
  readonly sizes: TanreiLoadingIndicatorSizes;
}

/**
 * Every value of `comp.main-action-button`'s `size` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `medium` (with a dev-only warning).
 */
export interface TanreiMainActionButtonSizeRegistry {
  small: true;
  medium: true;
  large: true;
}
export type TanreiMainActionButtonSize = keyof TanreiMainActionButtonSizeRegistry;
export type TanreiCoreMainActionButtonSize = "small" | "medium" | "large";

/** The tokens of one `size` of `comp.main-action-button`. */
export interface TanreiMainActionButtonSizeTokens {
  readonly containerHeight: number;
  readonly containerShape: number;
  readonly containerPaddingInlineStart: number;
  readonly containerPaddingInlineEnd: number;
  readonly containerPaddingInlineStartWithIcon: number;
  readonly containerPaddingInlineEndWithIcon: number;
  readonly containerPaddingBlock: number;
  readonly containerGap: number;
  readonly labelTypescale: TanreiTypescaleRole;
  readonly iconSize: number;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiMainActionButtonSizes = { readonly [Key in TanreiCoreMainActionButtonSize]: TanreiMainActionButtonSizeTokens } & { readonly [Key in TanreiMainActionButtonSize]?: TanreiMainActionButtonSizeTokens };

/**
 * Every value of `comp.main-action-button`'s `variant` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `filled` (with a dev-only warning).
 */
export interface TanreiMainActionButtonVariantRegistry {
  filled: true;
  tonal: true;
  surface: true;
}
export type TanreiMainActionButtonVariant = keyof TanreiMainActionButtonVariantRegistry;
export type TanreiCoreMainActionButtonVariant = "filled" | "tonal" | "surface";

/** What one `variant` of `comp.main-action-button` is drawn from in ONE interaction state. */
export interface TanreiMainActionButtonVariantStateTokens {
  readonly containerColor: TanreiPaint;
  readonly containerElevation: TanreiElevationLevel;
  readonly labelColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
}
/** One `variant`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiMainActionButtonVariantTokens {
  readonly enabled: TanreiMainActionButtonVariantStateTokens;
  readonly hovered: TanreiMainActionButtonVariantStateTokens;
  readonly focused: TanreiMainActionButtonVariantStateTokens;
  readonly pressed: TanreiMainActionButtonVariantStateTokens;
  readonly disabled: TanreiMainActionButtonVariantStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiMainActionButtonVariants = { readonly [Key in TanreiCoreMainActionButtonVariant]: TanreiMainActionButtonVariantTokens } & { readonly [Key in TanreiMainActionButtonVariant]?: TanreiMainActionButtonVariantTokens };

/**
 * `comp.main-action-button`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`sizes`, `variants`), keyed by the axis value.
 */
export interface TanreiMainActionButtonTokens {
  readonly disabledOpacity: number;
  readonly focusedOpacity: number;
  readonly hoveredOpacity: number;
  readonly motionFeedbackDuration: number;
  readonly motionResizeDuration: number;
  readonly motionResizeEasing: TanreiCubicBezier;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly pressedOpacity: number;
  readonly sizes: TanreiMainActionButtonSizes;
  readonly variants: TanreiMainActionButtonVariants;
}

/**
 * Every value of `comp.menu`'s `condition` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `unselected` (with a dev-only warning).
 */
export interface TanreiMenuConditionRegistry {
  unselected: true;
  selected: true;
  current: true;
  destructive: true;
  expanded: true;
}
export type TanreiMenuCondition = keyof TanreiMenuConditionRegistry;
export type TanreiCoreMenuCondition = "unselected" | "selected" | "current" | "destructive" | "expanded";

/** What one `condition` of `comp.menu` is drawn from in ONE interaction state. */
export interface TanreiMenuConditionStateTokens {
  readonly containerColor: TanreiPaint;
  readonly labelColor: TanreiPaint;
  readonly supportingTextColor: TanreiPaint;
  readonly trailingTextColor: TanreiPaint;
  readonly leadingIconColor: TanreiPaint;
  readonly trailingIconColor: TanreiPaint;
  readonly markColor: TanreiPaint;
  readonly controlColor: TanreiPaint;
  readonly controlMarkColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
}
/** One `condition`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiMenuConditionTokens {
  readonly enabled: TanreiMenuConditionStateTokens;
  readonly hovered: TanreiMenuConditionStateTokens;
  readonly focused: TanreiMenuConditionStateTokens;
  readonly pressed: TanreiMenuConditionStateTokens;
  readonly disabled: TanreiMenuConditionStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiMenuConditions = { readonly [Key in TanreiCoreMenuCondition]: TanreiMenuConditionTokens } & { readonly [Key in TanreiMenuCondition]?: TanreiMenuConditionTokens };

/**
 * `comp.menu`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`conditions`), keyed by the axis value.
 */
export interface TanreiMenuTokens {
  readonly checkboxItemMark: number;
  readonly containerGap: number;
  readonly containerHeight: number;
  readonly containerPaddingBlock: number;
  readonly containerPaddingInline: number;
  readonly containerShape: number;
  readonly controlBoxShape: number;
  readonly controlBoxSize: number;
  readonly controlFillInset: number;
  readonly controlFillOpacity: number;
  readonly controlMarkSize: number;
  readonly controlMarkWeight: number;
  readonly controlOutlineWidth: number;
  readonly controlRingSelectedWidthShare: number;
  readonly controlRingSize: number;
  readonly controlRingWidth: number;
  readonly disabledContainerShape: number;
  readonly disabledOpacity: number;
  readonly dividerColor: TanreiPaint;
  readonly dividerSpace: number;
  readonly dividerThickness: number;
  readonly focusedContainerShape: number;
  readonly focusedOpacity: number;
  readonly groupTitleColor: TanreiPaint;
  readonly groupTitlePaddingInline: number;
  readonly groupTitleTypescale: TanreiTypescaleRole;
  readonly groupGap: number;
  readonly hoveredContainerShape: number;
  readonly hoveredOpacity: number;
  readonly labelTypescale: TanreiTypescaleRole;
  readonly leadingIconSize: number;
  readonly markSize: number;
  readonly markWidth: number;
  readonly motionCloseDuration: number;
  readonly motionCloseEasing: TanreiCubicBezier;
  readonly motionFeedbackDuration: number;
  readonly motionOpenDuration: number;
  readonly motionOpenEasing: TanreiCubicBezier;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly motionSubmenuDelay: number;
  readonly pressedContainerShape: number;
  readonly pressedOpacity: number;
  readonly radioItemMark: number;
  readonly separation: number;
  readonly shortcutVariant: number;
  readonly submenuOffset: number;
  readonly supportingTextTypescale: TanreiTypescaleRole;
  readonly surfaceColor: TanreiPaint;
  readonly surfaceElevation: TanreiElevationLevel;
  readonly surfaceMaxWidth: number;
  readonly surfaceMinWidth: number;
  readonly surfaceOffset: number;
  readonly surfacePaddingBlock: number;
  readonly surfacePaddingInline: number;
  readonly surfaceShape: number;
  readonly surfaceViewportMargin: number;
  readonly trailingIconSize: number;
  readonly trailingTextTypescale: TanreiTypescaleRole;
  readonly conditions: TanreiMenuConditions;
}

/**
 * Every value of `comp.menubar`'s `condition` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `unselected` (with a dev-only warning).
 */
export interface TanreiMenubarConditionRegistry {
  unselected: true;
  selected: true;
  expanded: true;
}
export type TanreiMenubarCondition = keyof TanreiMenubarConditionRegistry;
export type TanreiCoreMenubarCondition = "unselected" | "selected" | "expanded";

/** What one `condition` of `comp.menubar` is drawn from in ONE interaction state. */
export interface TanreiMenubarConditionStateTokens {
  readonly containerColor: TanreiPaint;
  readonly labelColor: TanreiPaint;
  readonly iconColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
}
/** One `condition`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiMenubarConditionTokens {
  readonly enabled: TanreiMenubarConditionStateTokens;
  readonly hovered: TanreiMenubarConditionStateTokens;
  readonly focused: TanreiMenubarConditionStateTokens;
  readonly pressed: TanreiMenubarConditionStateTokens;
  readonly disabled: TanreiMenubarConditionStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiMenubarConditions = { readonly [Key in TanreiCoreMenubarCondition]: TanreiMenubarConditionTokens } & { readonly [Key in TanreiMenubarCondition]?: TanreiMenubarConditionTokens };

/**
 * `comp.menubar`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`conditions`), keyed by the axis value.
 */
export interface TanreiMenubarTokens {
  readonly barColor: TanreiPaint;
  readonly barGap: number;
  readonly barPaddingBlock: number;
  readonly barPaddingInline: number;
  readonly containerGap: number;
  readonly containerHeight: number;
  readonly containerPaddingInline: number;
  readonly containerShape: number;
  readonly disabledContainerShape: number;
  readonly disabledOpacity: number;
  readonly focusedContainerShape: number;
  readonly focusedOpacity: number;
  readonly hoveredContainerShape: number;
  readonly hoveredOpacity: number;
  readonly iconSize: number;
  readonly indicatorSize: number;
  readonly labelTypescale: TanreiTypescaleRole;
  readonly motionFeedbackDuration: number;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly pressedContainerShape: number;
  readonly pressedOpacity: number;
  readonly conditions: TanreiMenubarConditions;
}

/**
 * `comp.modal-layer`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis, keyed by the axis value.
 */
export interface TanreiModalLayerTokens {
  readonly motionEnterDuration: number;
  readonly motionEnterEasing: TanreiCubicBezier;
  readonly motionExitDuration: number;
  readonly motionExitEasing: TanreiCubicBezier;
  readonly scrimBlur: number;
  readonly scrimColor: TanreiPaint;
}

/**
 * Every value of `comp.navigation-bar`'s `condition` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `unselected` (with a dev-only warning).
 */
export interface TanreiNavigationBarConditionRegistry {
  unselected: true;
  selected: true;
  filledUnselected: true;
  filledSelected: true;
}
export type TanreiNavigationBarCondition = keyof TanreiNavigationBarConditionRegistry;
export type TanreiCoreNavigationBarCondition = "unselected" | "selected" | "filledUnselected" | "filledSelected";

/** What one `condition` of `comp.navigation-bar` is drawn from in ONE interaction state. */
export interface TanreiNavigationBarConditionStateTokens {
  readonly itemContainerColor: TanreiPaint;
  readonly itemIconIndicatorColor: TanreiPaint;
  readonly itemIconColor: TanreiPaint;
  readonly itemLabelColor: TanreiPaint;
  readonly itemCoveredIconColor: TanreiPaint;
  readonly itemCoveredLabelColor: TanreiPaint;
  readonly itemStateLayerColor: TanreiPaint;
}
/** One `condition`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiNavigationBarConditionTokens {
  readonly enabled: TanreiNavigationBarConditionStateTokens;
  readonly hovered: TanreiNavigationBarConditionStateTokens;
  readonly focused: TanreiNavigationBarConditionStateTokens;
  readonly pressed: TanreiNavigationBarConditionStateTokens;
  readonly disabled: TanreiNavigationBarConditionStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiNavigationBarConditions = { readonly [Key in TanreiCoreNavigationBarCondition]: TanreiNavigationBarConditionTokens } & { readonly [Key in TanreiNavigationBarCondition]?: TanreiNavigationBarConditionTokens };

/**
 * `comp.navigation-bar`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`conditions`), keyed by the axis value.
 */
export interface TanreiNavigationBarTokens {
  readonly containerColor: TanreiPaint;
  readonly containerElevation: TanreiElevationLevel;
  readonly containerHeight: number;
  readonly containerPadding: number;
  readonly disabledOpacity: number;
  readonly focusedOpacity: number;
  readonly hoveredOpacity: number;
  readonly itemContainerHeight: number;
  readonly itemContainerPaddingBlock: number;
  readonly itemContainerPaddingInline: number;
  readonly itemContainerShape: number;
  readonly itemContainerWidth: number;
  readonly itemGap: number;
  readonly itemIconIndicatorHeight: number;
  readonly itemIconIndicatorShape: number;
  readonly itemIconIndicatorWidth: number;
  readonly itemIconSize: number;
  readonly itemLabelTypescale: TanreiTypescaleRole;
  readonly motionFeedbackDuration: number;
  readonly motionSelectionDuration: number;
  readonly motionSelectionEasing: TanreiCubicBezier;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly outlineColor: TanreiPaint;
  readonly outlineWidth: number;
  readonly pressedOpacity: number;
  readonly conditions: TanreiNavigationBarConditions;
}

/**
 * Every value of `comp.navigation-drawer`'s `variant` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `standard` (with a dev-only warning).
 */
export interface TanreiNavigationDrawerVariantRegistry {
  standard: true;
  modal: true;
}
export type TanreiNavigationDrawerVariant = keyof TanreiNavigationDrawerVariantRegistry;
export type TanreiCoreNavigationDrawerVariant = "standard" | "modal";

/** The tokens of one `variant` of `comp.navigation-drawer`. */
export interface TanreiNavigationDrawerVariantTokens {
  readonly containerColor: TanreiPaint;
  readonly containerElevation: TanreiElevationLevel;
  readonly containerShape: number;
  readonly outlineColor: TanreiPaint;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiNavigationDrawerVariants = { readonly [Key in TanreiCoreNavigationDrawerVariant]: TanreiNavigationDrawerVariantTokens } & { readonly [Key in TanreiNavigationDrawerVariant]?: TanreiNavigationDrawerVariantTokens };

/**
 * Every value of `comp.navigation-drawer`'s `condition` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `unselected` (with a dev-only warning).
 */
export interface TanreiNavigationDrawerConditionRegistry {
  unselected: true;
  selected: true;
  collapsedUnselected: true;
  collapsedSelected: true;
}
export type TanreiNavigationDrawerCondition = keyof TanreiNavigationDrawerConditionRegistry;
export type TanreiCoreNavigationDrawerCondition = "unselected" | "selected" | "collapsedUnselected" | "collapsedSelected";

/** What one `condition` of `comp.navigation-drawer` is drawn from in ONE interaction state. */
export interface TanreiNavigationDrawerConditionStateTokens {
  readonly itemContainerColor: TanreiPaint;
  readonly itemIconIndicatorColor: TanreiPaint;
  readonly itemIconColor: TanreiPaint;
  readonly itemLabelColor: TanreiPaint;
  readonly itemTrailingTextColor: TanreiPaint;
  readonly itemTrailingIconColor: TanreiPaint;
  readonly itemBadgeColor: TanreiPaint;
  readonly itemStateLayerColor: TanreiPaint;
}
/** One `condition`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiNavigationDrawerConditionTokens {
  readonly enabled: TanreiNavigationDrawerConditionStateTokens;
  readonly hovered: TanreiNavigationDrawerConditionStateTokens;
  readonly focused: TanreiNavigationDrawerConditionStateTokens;
  readonly pressed: TanreiNavigationDrawerConditionStateTokens;
  readonly disabled: TanreiNavigationDrawerConditionStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiNavigationDrawerConditions = { readonly [Key in TanreiCoreNavigationDrawerCondition]: TanreiNavigationDrawerConditionTokens } & { readonly [Key in TanreiNavigationDrawerCondition]?: TanreiNavigationDrawerConditionTokens };

/**
 * `comp.navigation-drawer`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`variants`, `conditions`), keyed by the axis value.
 */
export interface TanreiNavigationDrawerTokens {
  readonly breakpointCollapsed: number;
  readonly breakpointExpanded: number;
  readonly collapsedContainerWidth: number;
  readonly collapsedItemContainerPaddingBlock: number;
  readonly collapsedItemContainerPaddingInline: number;
  readonly collapsedItemContainerShape: number;
  readonly collapsedItemContainerWidth: number;
  readonly collapsedItemGap: number;
  readonly collapsedItemLabelTypescale: TanreiTypescaleRole;
  readonly containerGap: number;
  readonly containerPaddingBlock: number;
  readonly containerPaddingInline: number;
  readonly containerWidth: number;
  readonly disabledOpacity: number;
  readonly focusedOpacity: number;
  readonly headerColor: TanreiPaint;
  readonly headerGap: number;
  readonly headerItemGap: number;
  readonly headerTypescale: TanreiTypescaleRole;
  readonly headingColor: TanreiPaint;
  readonly headingHeight: number;
  readonly headingTypescale: TanreiTypescaleRole;
  readonly hoveredOpacity: number;
  readonly itemBadgeTypescale: TanreiTypescaleRole;
  readonly itemContainerHeight: number;
  readonly itemContainerShape: number;
  readonly itemGap: number;
  readonly itemIconIndicatorHeight: number;
  readonly itemIconIndicatorShape: number;
  readonly itemIconIndicatorWidth: number;
  readonly itemIconSize: number;
  readonly itemLabelTypescale: TanreiTypescaleRole;
  readonly itemNestIndent: number;
  readonly itemPaddingInline: number;
  readonly itemTrailingIconSize: number;
  readonly itemTrailingTextTypescale: TanreiTypescaleRole;
  readonly motionDisclosureDuration: number;
  readonly motionDisclosureEasing: TanreiCubicBezier;
  readonly motionEnterDuration: number;
  readonly motionEnterEasing: TanreiCubicBezier;
  readonly motionExitDuration: number;
  readonly motionExitEasing: TanreiCubicBezier;
  readonly motionExpandDuration: number;
  readonly motionExpandEasing: TanreiCubicBezier;
  readonly motionFeedbackDuration: number;
  readonly motionSelectionDuration: number;
  readonly motionSelectionEasing: TanreiCubicBezier;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly outlineWidth: number;
  readonly pressedOpacity: number;
  readonly scrimBlur: number;
  readonly scrimColor: TanreiPaint;
  readonly variants: TanreiNavigationDrawerVariants;
  readonly conditions: TanreiNavigationDrawerConditions;
}

/**
 * Every value of `comp.navigation-rail`'s `condition` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `unselected` (with a dev-only warning).
 */
export interface TanreiNavigationRailConditionRegistry {
  unselected: true;
  selected: true;
}
export type TanreiNavigationRailCondition = keyof TanreiNavigationRailConditionRegistry;
export type TanreiCoreNavigationRailCondition = "unselected" | "selected";

/** What one `condition` of `comp.navigation-rail` is drawn from in ONE interaction state. */
export interface TanreiNavigationRailConditionStateTokens {
  readonly itemContainerColor: TanreiPaint;
  readonly itemIconColor: TanreiPaint;
  readonly itemLabelColor: TanreiPaint;
  readonly itemStateLayerColor: TanreiPaint;
}
/** One `condition`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiNavigationRailConditionTokens {
  readonly enabled: TanreiNavigationRailConditionStateTokens;
  readonly hovered: TanreiNavigationRailConditionStateTokens;
  readonly focused: TanreiNavigationRailConditionStateTokens;
  readonly pressed: TanreiNavigationRailConditionStateTokens;
  readonly disabled: TanreiNavigationRailConditionStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiNavigationRailConditions = { readonly [Key in TanreiCoreNavigationRailCondition]: TanreiNavigationRailConditionTokens } & { readonly [Key in TanreiNavigationRailCondition]?: TanreiNavigationRailConditionTokens };

/**
 * `comp.navigation-rail`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`conditions`), keyed by the axis value.
 */
export interface TanreiNavigationRailTokens {
  readonly containerColor: TanreiPaint;
  readonly containerElevation: TanreiElevationLevel;
  readonly containerGap: number;
  readonly containerPaddingBlock: number;
  readonly containerWidth: number;
  readonly disabledOpacity: number;
  readonly focusedOpacity: number;
  readonly headerGap: number;
  readonly hoveredOpacity: number;
  readonly itemContainerHeight: number;
  readonly itemContainerShape: number;
  readonly itemContainerWidth: number;
  readonly itemGap: number;
  readonly itemIconSize: number;
  readonly itemLabelTypescale: TanreiTypescaleRole;
  readonly motionFeedbackDuration: number;
  readonly motionSelectionDuration: number;
  readonly motionSelectionEasing: TanreiCubicBezier;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly outlineColor: TanreiPaint;
  readonly outlineWidth: number;
  readonly pressedOpacity: number;
  readonly conditions: TanreiNavigationRailConditions;
}

/**
 * `comp.number-input`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis, keyed by the axis value.
 */
export interface TanreiNumberInputTokens {
  readonly motionRepeatDelay: number;
  readonly motionRepeatInterval: number;
  readonly motionRepeatIntervalFast: number;
  readonly stepperGap: number;
  readonly stepperInset: number;
}

/**
 * Every value of `comp.one-time-code-input`'s `condition` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `standard` (with a dev-only warning).
 */
export interface TanreiOneTimeCodeInputConditionRegistry {
  standard: true;
}
export type TanreiOneTimeCodeInputCondition = keyof TanreiOneTimeCodeInputConditionRegistry;
export type TanreiCoreOneTimeCodeInputCondition = "standard";

/** What one `condition` of `comp.one-time-code-input` is drawn from in ONE interaction state. */
export interface TanreiOneTimeCodeInputConditionStateTokens {
  readonly containerColor: TanreiPaint;
  readonly outlineColor: TanreiPaint;
  readonly inputColor: TanreiPaint;
  readonly caretColor: TanreiPaint;
  readonly separatorColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
  readonly errorContainerColor: TanreiPaint;
  readonly errorOutlineColor: TanreiPaint;
  readonly errorInputColor: TanreiPaint;
  readonly errorCaretColor: TanreiPaint;
  readonly errorSeparatorColor: TanreiPaint;
  readonly errorStateLayerColor: TanreiPaint;
}
/** One `condition`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiOneTimeCodeInputConditionTokens {
  readonly enabled: TanreiOneTimeCodeInputConditionStateTokens;
  readonly hovered: TanreiOneTimeCodeInputConditionStateTokens;
  readonly focused: TanreiOneTimeCodeInputConditionStateTokens;
  readonly disabled: TanreiOneTimeCodeInputConditionStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiOneTimeCodeInputConditions = { readonly [Key in TanreiCoreOneTimeCodeInputCondition]: TanreiOneTimeCodeInputConditionTokens } & { readonly [Key in TanreiOneTimeCodeInputCondition]?: TanreiOneTimeCodeInputConditionTokens };

/**
 * `comp.one-time-code-input`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`conditions`), keyed by the axis value.
 */
export interface TanreiOneTimeCodeInputTokens {
  readonly caretWidth: number;
  readonly containerGap: number;
  readonly containerHeight: number;
  readonly containerPaddingInline: number;
  readonly containerShape: number;
  readonly containerWidth: number;
  readonly disabledOutlineWidth: number;
  readonly focusedOutlineWidth: number;
  readonly hoveredOutlineWidth: number;
  readonly inputTypescale: TanreiTypescaleRole;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly outlineWidth: number;
  readonly separatorThickness: number;
  readonly separatorWidth: number;
  readonly conditions: TanreiOneTimeCodeInputConditions;
}

/**
 * Every value of `comp.page-header`'s `size` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `medium` (with a dev-only warning).
 */
export interface TanreiPageHeaderSizeRegistry {
  small: true;
  medium: true;
  large: true;
}
export type TanreiPageHeaderSize = keyof TanreiPageHeaderSizeRegistry;
export type TanreiCorePageHeaderSize = "small" | "medium" | "large";

/** The tokens of one `size` of `comp.page-header`. */
export interface TanreiPageHeaderSizeTokens {
  readonly titleTypescale: TanreiTypescaleRole;
  readonly descriptionTypescale: TanreiTypescaleRole;
  readonly descriptionGap: number;
  readonly containerPaddingBlockEnd: number;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiPageHeaderSizes = { readonly [Key in TanreiCorePageHeaderSize]: TanreiPageHeaderSizeTokens } & { readonly [Key in TanreiPageHeaderSize]?: TanreiPageHeaderSizeTokens };

/**
 * `comp.page-header`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`sizes`), keyed by the axis value.
 */
export interface TanreiPageHeaderTokens {
  readonly actionsGap: number;
  readonly actionsItemGap: number;
  readonly breadcrumbsGap: number;
  readonly containerGap: number;
  readonly descriptionColor: TanreiPaint;
  readonly descriptionMeasure: number;
  readonly dividerColor: TanreiPaint;
  readonly dividerThickness: number;
  readonly eyebrowColor: TanreiPaint;
  readonly eyebrowGap: number;
  readonly eyebrowTypescale: TanreiTypescaleRole;
  readonly metaColor: TanreiPaint;
  readonly metaGap: number;
  readonly metaIconGap: number;
  readonly metaItemGap: number;
  readonly metaRowGap: number;
  readonly metaSeparatorColor: TanreiPaint;
  readonly metaSeparatorSize: number;
  readonly metaTypescale: TanreiTypescaleRole;
  readonly titleColor: TanreiPaint;
  readonly wideContainerWidth: number;
  readonly sizes: TanreiPageHeaderSizes;
}

/**
 * Every value of `comp.pagination`'s `part` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `item` (with a dev-only warning).
 */
export interface TanreiPaginationPartRegistry {
  item: true;
}
export type TanreiPaginationPart = keyof TanreiPaginationPartRegistry;
export type TanreiCorePaginationPart = "item";

/** What one `part` of `comp.pagination` is drawn from in ONE interaction state. */
export interface TanreiPaginationPartStateTokens {
  readonly containerColor: TanreiPaint;
  readonly outlineColor: TanreiPaint;
  readonly labelColor: TanreiPaint;
  readonly titleColor: TanreiPaint;
  readonly iconColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
}
/** One `part`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiPaginationPartTokens {
  readonly enabled: TanreiPaginationPartStateTokens;
  readonly hovered: TanreiPaginationPartStateTokens;
  readonly focused: TanreiPaginationPartStateTokens;
  readonly pressed: TanreiPaginationPartStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiPaginationParts = { readonly [Key in TanreiCorePaginationPart]: TanreiPaginationPartTokens } & { readonly [Key in TanreiPaginationPart]?: TanreiPaginationPartTokens };

/**
 * `comp.pagination`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`parts`), keyed by the axis value.
 */
export interface TanreiPaginationTokens {
  readonly containerGap: number;
  readonly containerMinWidth: number;
  readonly containerPadding: number;
  readonly containerShape: number;
  readonly focusedContainerShape: number;
  readonly focusedOpacity: number;
  readonly gap: number;
  readonly hoveredContainerShape: number;
  readonly hoveredOpacity: number;
  readonly iconSize: number;
  readonly labelGap: number;
  readonly labelTypescale: TanreiTypescaleRole;
  readonly motionFeedbackDuration: number;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly outlineWidth: number;
  readonly pressedContainerShape: number;
  readonly pressedOpacity: number;
  readonly titleTypescale: TanreiTypescaleRole;
  readonly parts: TanreiPaginationParts;
}

/**
 * `comp.popover`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis, keyed by the axis value.
 */
export interface TanreiPopoverTokens {
  readonly actionsArrangement: number;
  readonly actionsGap: number;
  readonly actionsMarginBlockStart: number;
  readonly actionsVariant: number;
  readonly arrowHeight: number;
  readonly arrowInset: number;
  readonly arrowVisible: number;
  readonly arrowWidth: number;
  readonly closeButtonVariant: number;
  readonly containerColor: TanreiPaint;
  readonly containerElevation: TanreiElevationLevel;
  readonly containerGap: number;
  readonly containerMaxHeight: number;
  readonly containerMaxWidth: number;
  readonly containerMinWidth: number;
  readonly containerPaddingBlock: number;
  readonly containerPaddingInline: number;
  readonly containerShape: number;
  readonly contentColor: TanreiPaint;
  readonly dividerColor: TanreiPaint;
  readonly dividerWidth: number;
  readonly headerGap: number;
  readonly headlineColor: TanreiPaint;
  readonly headlineTypescale: TanreiTypescaleRole;
  readonly motionCloseDuration: number;
  readonly motionCloseEasing: TanreiCubicBezier;
  readonly motionOpenDuration: number;
  readonly motionOpenEasing: TanreiCubicBezier;
  readonly offset: number;
  readonly windowMargin: number;
}

/**
 * Every value of `comp.progress-indicator`'s `size` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `medium` (with a dev-only warning).
 */
export interface TanreiProgressIndicatorSizeRegistry {
  small: true;
  medium: true;
  large: true;
}
export type TanreiProgressIndicatorSize = keyof TanreiProgressIndicatorSizeRegistry;
export type TanreiCoreProgressIndicatorSize = "small" | "medium" | "large";

/** The tokens of one `size` of `comp.progress-indicator`. */
export interface TanreiProgressIndicatorSizeTokens {
  readonly linearThickness: number;
  readonly circularSize: number;
  readonly circularThickness: number;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiProgressIndicatorSizes = { readonly [Key in TanreiCoreProgressIndicatorSize]: TanreiProgressIndicatorSizeTokens } & { readonly [Key in TanreiProgressIndicatorSize]?: TanreiProgressIndicatorSizeTokens };

/**
 * `comp.progress-indicator`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`sizes`), keyed by the axis value.
 */
export interface TanreiProgressIndicatorTokens {
  readonly indicatorColor: TanreiPaint;
  readonly motionCycleDuration: number;
  readonly motionCycleEasing: TanreiCubicBezier;
  readonly motionValueDuration: number;
  readonly motionValueEasing: TanreiCubicBezier;
  readonly stopIndicatorSize: number;
  readonly trackColor: TanreiPaint;
  readonly trackGap: number;
  readonly trackSeparation: number;
  readonly trackShape: number;
  readonly sizes: TanreiProgressIndicatorSizes;
}

/**
 * Every value of `comp.prose`'s `size` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `medium` (with a dev-only warning).
 */
export interface TanreiProseSizeRegistry {
  medium: true;
  large: true;
}
export type TanreiProseSize = keyof TanreiProseSizeRegistry;
export type TanreiCoreProseSize = "medium" | "large";

/** The tokens of one `size` of `comp.prose`. */
export interface TanreiProseSizeTokens {
  readonly textTypescale: TanreiTypescaleRole;
  readonly smallTypescale: TanreiTypescaleRole;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiProseSizes = { readonly [Key in TanreiCoreProseSize]: TanreiProseSizeTokens } & { readonly [Key in TanreiProseSize]?: TanreiProseSizeTokens };

/**
 * `comp.prose`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`sizes`), keyed by the axis value.
 */
export interface TanreiProseTokens {
  readonly anchorGap: number;
  readonly blockGap: number;
  readonly heading1GapAfter: number;
  readonly heading1GapBefore: number;
  readonly heading2GapAfter: number;
  readonly heading2GapBefore: number;
  readonly heading3GapAfter: number;
  readonly heading3GapBefore: number;
  readonly heading4GapAfter: number;
  readonly heading4GapBefore: number;
  readonly heading5GapAfter: number;
  readonly heading5GapBefore: number;
  readonly heading6GapAfter: number;
  readonly heading6GapBefore: number;
  readonly itemGap: number;
  readonly japaneseLineHeight: number;
  readonly leadTypescale: TanreiTypescaleRole;
  readonly listIndent: number;
  readonly measure: number;
  readonly nestedGap: number;
  readonly quoteInset: number;
  readonly quoteLineColor: TanreiPaint;
  readonly quoteLineThickness: number;
  readonly ruleGap: number;
  readonly taskIconSize: number;
  readonly sizes: TanreiProseSizes;
}

/**
 * Every value of `comp.radio-button`'s `condition` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `unselected` (with a dev-only warning).
 */
export interface TanreiRadioButtonConditionRegistry {
  unselected: true;
  selected: true;
  errorUnselected: true;
  errorSelected: true;
}
export type TanreiRadioButtonCondition = keyof TanreiRadioButtonConditionRegistry;
export type TanreiCoreRadioButtonCondition = "unselected" | "selected" | "errorUnselected" | "errorSelected";

/** What one `condition` of `comp.radio-button` is drawn from in ONE interaction state. */
export interface TanreiRadioButtonConditionStateTokens {
  readonly containerColor: TanreiPaint;
  readonly ringColor: TanreiPaint;
  readonly fillColor: TanreiPaint;
  readonly labelColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
}
/** One `condition`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiRadioButtonConditionTokens {
  readonly enabled: TanreiRadioButtonConditionStateTokens;
  readonly hovered: TanreiRadioButtonConditionStateTokens;
  readonly focused: TanreiRadioButtonConditionStateTokens;
  readonly pressed: TanreiRadioButtonConditionStateTokens;
  readonly disabled: TanreiRadioButtonConditionStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiRadioButtonConditions = { readonly [Key in TanreiCoreRadioButtonCondition]: TanreiRadioButtonConditionTokens } & { readonly [Key in TanreiRadioButtonCondition]?: TanreiRadioButtonConditionTokens };

/**
 * `comp.radio-button`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`conditions`), keyed by the axis value.
 */
export interface TanreiRadioButtonTokens {
  readonly containerShape: number;
  readonly containerSize: number;
  readonly disabledContainerShape: number;
  readonly disabledOpacity: number;
  readonly fillInset: number;
  readonly fillOpacity: number;
  readonly focusedContainerShape: number;
  readonly focusedOpacity: number;
  readonly hoveredContainerShape: number;
  readonly hoveredOpacity: number;
  readonly labelGap: number;
  readonly labelTypescale: TanreiTypescaleRole;
  readonly motionFeedbackDuration: number;
  readonly motionSelectionDuration: number;
  readonly motionSelectionEasing: TanreiCubicBezier;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly optionMinHeight: number;
  readonly pressedContainerShape: number;
  readonly pressedOpacity: number;
  readonly ringSelectedWidthShare: number;
  readonly ringSize: number;
  readonly ringWidth: number;
  readonly conditions: TanreiRadioButtonConditions;
}

/**
 * Every value of `comp.search`'s `condition` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `standard` (with a dev-only warning).
 */
export interface TanreiSearchConditionRegistry {
  standard: true;
}
export type TanreiSearchCondition = keyof TanreiSearchConditionRegistry;
export type TanreiCoreSearchCondition = "standard";

/** What one `condition` of `comp.search` is drawn from in ONE interaction state. */
export interface TanreiSearchConditionStateTokens {
  readonly containerColor: TanreiPaint;
  readonly containerElevation: TanreiElevationLevel;
  readonly outlineColor: TanreiPaint;
  readonly leadingIconColor: TanreiPaint;
  readonly inputColor: TanreiPaint;
  readonly placeholderColor: TanreiPaint;
  readonly caretColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
  readonly suggestionContainerColor: TanreiPaint;
  readonly suggestionLeadingIconColor: TanreiPaint;
  readonly suggestionHeadlineColor: TanreiPaint;
  readonly suggestionSupportingTextColor: TanreiPaint;
  readonly suggestionStateLayerColor: TanreiPaint;
}
/** One `condition`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiSearchConditionTokens {
  readonly enabled: TanreiSearchConditionStateTokens;
  readonly hovered: TanreiSearchConditionStateTokens;
  readonly focused: TanreiSearchConditionStateTokens;
  readonly pressed: TanreiSearchConditionStateTokens;
  readonly disabled: TanreiSearchConditionStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiSearchConditions = { readonly [Key in TanreiCoreSearchCondition]: TanreiSearchConditionTokens } & { readonly [Key in TanreiSearchCondition]?: TanreiSearchConditionTokens };

/**
 * `comp.search`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`conditions`), keyed by the axis value.
 */
export interface TanreiSearchTokens {
  readonly containerButtonGap: number;
  readonly containerGap: number;
  readonly containerHeight: number;
  readonly containerPaddingInline: number;
  readonly containerPaddingInlineWithButton: number;
  readonly containerShape: number;
  readonly disabledOpacity: number;
  readonly disabledOutlineWidth: number;
  readonly dividerColor: TanreiPaint;
  readonly dividerThickness: number;
  readonly focusedOpacity: number;
  readonly focusedOutlineWidth: number;
  readonly groupTitleColor: TanreiPaint;
  readonly groupTitleTypescale: TanreiTypescaleRole;
  readonly groupGap: number;
  readonly groupIndent: number;
  readonly headerHeight: number;
  readonly headerPaddingInline: number;
  readonly hoveredOpacity: number;
  readonly hoveredOutlineWidth: number;
  readonly inputTypescale: TanreiTypescaleRole;
  readonly leadingIconSize: number;
  readonly motionCloseDuration: number;
  readonly motionCloseEasing: TanreiCubicBezier;
  readonly motionFeedbackDuration: number;
  readonly motionOpenDuration: number;
  readonly motionOpenEasing: TanreiCubicBezier;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly outlineWidth: number;
  readonly pressedOpacity: number;
  readonly pressedOutlineWidth: number;
  readonly resultMarkColor: TanreiPaint;
  readonly resultMarkContainerColor: TanreiPaint;
  readonly resultMarkEmphasis: number;
  readonly shortcutColor: TanreiPaint;
  readonly shortcutTypescale: TanreiTypescaleRole;
  readonly statusColor: TanreiPaint;
  readonly statusErrorColor: TanreiPaint;
  readonly statusTypescale: TanreiTypescaleRole;
  readonly suggestionContainerGap: number;
  readonly suggestionContainerHeight: number;
  readonly suggestionContainerPaddingBlock: number;
  readonly suggestionContainerPaddingInline: number;
  readonly suggestionContainerShape: number;
  readonly suggestionHeadlineTypescale: TanreiTypescaleRole;
  readonly suggestionLeadingIconSize: number;
  readonly suggestionSupportingTextTypescale: TanreiTypescaleRole;
  readonly triggerContainerGap: number;
  readonly triggerContainerHeight: number;
  readonly triggerContainerPaddingInline: number;
  readonly triggerLabelTypescale: TanreiTypescaleRole;
  readonly triggerLeadingIconSize: number;
  readonly viewContainerColor: TanreiPaint;
  readonly viewContainerElevation: TanreiElevationLevel;
  readonly viewContainerShape: number;
  readonly viewDialogMaxWidth: number;
  readonly viewDialogOffset: number;
  readonly viewOffset: number;
  readonly viewPaddingBlock: number;
  readonly viewPaddingInline: number;
  readonly viewScrimBlur: number;
  readonly viewScrimColor: TanreiPaint;
  readonly viewViewportMargin: number;
  readonly conditions: TanreiSearchConditions;
}

/**
 * Every value of `comp.segmented-button`'s `size` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `medium` (with a dev-only warning).
 */
export interface TanreiSegmentedButtonSizeRegistry {
  small: true;
  medium: true;
  large: true;
}
export type TanreiSegmentedButtonSize = keyof TanreiSegmentedButtonSizeRegistry;
export type TanreiCoreSegmentedButtonSize = "small" | "medium" | "large";

/** The tokens of one `size` of `comp.segmented-button`. */
export interface TanreiSegmentedButtonSizeTokens {
  readonly containerHeight: number;
  readonly containerPaddingInline: number;
  readonly containerPaddingBlock: number;
  readonly containerGap: number;
  readonly labelTypescale: TanreiTypescaleRole;
  readonly iconSize: number;
  readonly checkSize: number;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiSegmentedButtonSizes = { readonly [Key in TanreiCoreSegmentedButtonSize]: TanreiSegmentedButtonSizeTokens } & { readonly [Key in TanreiSegmentedButtonSize]?: TanreiSegmentedButtonSizeTokens };

/**
 * Every value of `comp.segmented-button`'s `condition` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `unselected` (with a dev-only warning).
 */
export interface TanreiSegmentedButtonConditionRegistry {
  unselected: true;
  selected: true;
}
export type TanreiSegmentedButtonCondition = keyof TanreiSegmentedButtonConditionRegistry;
export type TanreiCoreSegmentedButtonCondition = "unselected" | "selected";

/** What one `condition` of `comp.segmented-button` is drawn from in ONE interaction state. */
export interface TanreiSegmentedButtonConditionStateTokens {
  readonly containerColor: TanreiPaint;
  readonly containerElevation: TanreiElevationLevel;
  readonly labelColor: TanreiPaint;
  readonly iconColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
}
/** One `condition`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiSegmentedButtonConditionTokens {
  readonly enabled: TanreiSegmentedButtonConditionStateTokens;
  readonly hovered: TanreiSegmentedButtonConditionStateTokens;
  readonly focused: TanreiSegmentedButtonConditionStateTokens;
  readonly pressed: TanreiSegmentedButtonConditionStateTokens;
  readonly disabled: TanreiSegmentedButtonConditionStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiSegmentedButtonConditions = { readonly [Key in TanreiCoreSegmentedButtonCondition]: TanreiSegmentedButtonConditionTokens } & { readonly [Key in TanreiSegmentedButtonCondition]?: TanreiSegmentedButtonConditionTokens };

/**
 * `comp.segmented-button`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`sizes`, `conditions`), keyed by the axis value.
 */
export interface TanreiSegmentedButtonTokens {
  readonly checkWeight: number;
  readonly containerShape: number;
  readonly disabledContainerShape: number;
  readonly disabledOpacity: number;
  readonly dividerColor: TanreiPaint;
  readonly dividerWidth: number;
  readonly focusedContainerShape: number;
  readonly focusedOpacity: number;
  readonly hoveredContainerShape: number;
  readonly hoveredOpacity: number;
  readonly motionFeedbackDuration: number;
  readonly motionSelectionDuration: number;
  readonly motionSelectionEasing: TanreiCubicBezier;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly outlineColor: TanreiPaint;
  readonly outlineWidth: number;
  readonly pressedContainerShape: number;
  readonly pressedOpacity: number;
  readonly setColor: TanreiPaint;
  readonly setPadding: number;
  readonly setShape: number;
  readonly sizes: TanreiSegmentedButtonSizes;
  readonly conditions: TanreiSegmentedButtonConditions;
}

/**
 * Every value of `comp.select`'s `variant` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `stacked` (with a dev-only warning).
 */
export interface TanreiSelectVariantRegistry {
  stacked: true;
  filled: true;
  outlined: true;
}
export type TanreiSelectVariant = keyof TanreiSelectVariantRegistry;
export type TanreiCoreSelectVariant = "stacked" | "filled" | "outlined";

/** What one `variant` of `comp.select` is drawn from in ONE interaction state. */
export interface TanreiSelectVariantStateTokens {
  readonly optionContainerColor: TanreiPaint;
  readonly optionLabelColor: TanreiPaint;
  readonly optionSupportingTextColor: TanreiPaint;
  readonly optionLeadingIconColor: TanreiPaint;
  readonly optionStateLayerColor: TanreiPaint;
  readonly selectedOptionContainerColor: TanreiPaint;
  readonly selectedOptionLabelColor: TanreiPaint;
  readonly selectedOptionSupportingTextColor: TanreiPaint;
  readonly selectedOptionLeadingIconColor: TanreiPaint;
  readonly selectedOptionMarkColor: TanreiPaint;
  readonly selectedOptionStateLayerColor: TanreiPaint;
}
/** One `variant`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiSelectVariantTokens {
  readonly enabled: TanreiSelectVariantStateTokens;
  readonly hovered: TanreiSelectVariantStateTokens;
  readonly focused: TanreiSelectVariantStateTokens;
  readonly pressed: TanreiSelectVariantStateTokens;
  readonly disabled: TanreiSelectVariantStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiSelectVariants = { readonly [Key in TanreiCoreSelectVariant]: TanreiSelectVariantTokens } & { readonly [Key in TanreiSelectVariant]?: TanreiSelectVariantTokens };

/**
 * `comp.select`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`variants`), keyed by the axis value.
 */
export interface TanreiSelectTokens {
  readonly disabledOpacity: number;
  readonly dividerColor: TanreiPaint;
  readonly dividerSpace: number;
  readonly dividerThickness: number;
  readonly focusedOpacity: number;
  readonly groupTitleColor: TanreiPaint;
  readonly groupTitlePaddingInline: number;
  readonly groupTitleTypescale: TanreiTypescaleRole;
  readonly groupGap: number;
  readonly hoveredOpacity: number;
  readonly listColor: TanreiPaint;
  readonly listElevation: TanreiElevationLevel;
  readonly listMaxHeight: number;
  readonly listMaxWidth: number;
  readonly listMinWidth: number;
  readonly listOffset: number;
  readonly listPaddingBlock: number;
  readonly listPaddingInline: number;
  readonly listShape: number;
  readonly listViewportMargin: number;
  readonly motionCloseDuration: number;
  readonly motionCloseEasing: TanreiCubicBezier;
  readonly motionFeedbackDuration: number;
  readonly motionOpenDuration: number;
  readonly motionOpenEasing: TanreiCubicBezier;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly optionGap: number;
  readonly optionHeight: number;
  readonly optionLabelTypescale: TanreiTypescaleRole;
  readonly optionLeadingIconSize: number;
  readonly optionMarkSize: number;
  readonly optionPaddingBlock: number;
  readonly optionPaddingInline: number;
  readonly optionShape: number;
  readonly optionSupportingTextTypescale: TanreiTypescaleRole;
  readonly pressedOpacity: number;
  readonly separation: number;
  readonly variants: TanreiSelectVariants;
}

/**
 * Every value of `comp.side-sheet`'s `variant` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `standard` (with a dev-only warning).
 */
export interface TanreiSideSheetVariantRegistry {
  standard: true;
  modal: true;
}
export type TanreiSideSheetVariant = keyof TanreiSideSheetVariantRegistry;
export type TanreiCoreSideSheetVariant = "standard" | "modal";

/** The tokens of one `variant` of `comp.side-sheet`. */
export interface TanreiSideSheetVariantTokens {
  readonly containerColor: TanreiPaint;
  readonly containerElevation: TanreiElevationLevel;
  readonly containerShape: number;
  readonly outlineColor: TanreiPaint;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiSideSheetVariants = { readonly [Key in TanreiCoreSideSheetVariant]: TanreiSideSheetVariantTokens } & { readonly [Key in TanreiSideSheetVariant]?: TanreiSideSheetVariantTokens };

/**
 * `comp.side-sheet`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`variants`), keyed by the axis value.
 */
export interface TanreiSideSheetTokens {
  readonly actionsArrangement: number;
  readonly actionsGap: number;
  readonly actionsPaddingBlock: number;
  readonly actionsVariant: number;
  readonly closeButtonVariant: number;
  readonly containerPaddingBlock: number;
  readonly containerPaddingInline: number;
  readonly containerWidth: number;
  readonly contentColor: TanreiPaint;
  readonly dividerColor: TanreiPaint;
  readonly dividerWidth: number;
  readonly headerGap: number;
  readonly headerHeight: number;
  readonly headerPaddingInlineEnd: number;
  readonly headlineColor: TanreiPaint;
  readonly headlineTypescale: TanreiTypescaleRole;
  readonly motionEnterDuration: number;
  readonly motionEnterEasing: TanreiCubicBezier;
  readonly motionExitDuration: number;
  readonly motionExitEasing: TanreiCubicBezier;
  readonly outlineWidth: number;
  readonly scrimBlur: number;
  readonly scrimColor: TanreiPaint;
  readonly variants: TanreiSideSheetVariants;
}

/**
 * `comp.skeleton`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis, keyed by the axis value.
 */
export interface TanreiSkeletonTokens {
  readonly containerGap: number;
  readonly motionAnimation: number;
  readonly motionDimDuration: number;
  readonly motionDimEasing: TanreiCubicBezier;
  readonly motionShowDelay: number;
  readonly placeholderColor: TanreiPaint;
  readonly placeholderDimOpacity: number;
  readonly placeholderLastLineInlineSize: number;
  readonly placeholderShapeBlock: number;
  readonly placeholderShapeCircle: number;
  readonly placeholderShapeText: number;
}

/**
 * Every value of `comp.slider`'s `size` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `small` (with a dev-only warning).
 */
export interface TanreiSliderSizeRegistry {
  small: true;
  medium: true;
  large: true;
}
export type TanreiSliderSize = keyof TanreiSliderSizeRegistry;
export type TanreiCoreSliderSize = "small" | "medium" | "large";

/** The tokens of one `size` of `comp.slider`. */
export interface TanreiSliderSizeTokens {
  readonly trackThickness: number;
  readonly trackShape: number;
  readonly handleHeight: number;
  readonly stopIndicatorSize: number;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiSliderSizes = { readonly [Key in TanreiCoreSliderSize]: TanreiSliderSizeTokens } & { readonly [Key in TanreiSliderSize]?: TanreiSliderSizeTokens };

/**
 * Every value of `comp.slider`'s `condition` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `standard` (with a dev-only warning).
 */
export interface TanreiSliderConditionRegistry {
  standard: true;
}
export type TanreiSliderCondition = keyof TanreiSliderConditionRegistry;
export type TanreiCoreSliderCondition = "standard";

/** What one `condition` of `comp.slider` is drawn from in ONE interaction state. */
export interface TanreiSliderConditionStateTokens {
  readonly containerColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
  readonly handleColor: TanreiPaint;
  readonly handleWidth: number;
  readonly handleElevation: TanreiElevationLevel;
  readonly handleOutlineColor: TanreiPaint;
  readonly trackColor: TanreiPaint;
  readonly activeTrackColor: TanreiPaint;
  readonly stopIndicatorColor: TanreiPaint;
  readonly activeStopIndicatorColor: TanreiPaint;
}
/** One `condition`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiSliderConditionTokens {
  readonly enabled: TanreiSliderConditionStateTokens;
  readonly hovered: TanreiSliderConditionStateTokens;
  readonly focused: TanreiSliderConditionStateTokens;
  readonly pressed: TanreiSliderConditionStateTokens;
  readonly disabled: TanreiSliderConditionStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiSliderConditions = { readonly [Key in TanreiCoreSliderCondition]: TanreiSliderConditionTokens } & { readonly [Key in TanreiSliderCondition]?: TanreiSliderConditionTokens };

/**
 * `comp.slider`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`sizes`, `conditions`), keyed by the axis value.
 */
export interface TanreiSliderTokens {
  readonly containerShape: number;
  readonly containerSize: number;
  readonly disabledOpacity: number;
  readonly focusedOpacity: number;
  readonly handleOutlineWidth: number;
  readonly handleShape: number;
  readonly hoveredOpacity: number;
  readonly motionFeedbackDuration: number;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly motionValueDuration: number;
  readonly motionValueEasing: TanreiCubicBezier;
  readonly pressedOpacity: number;
  readonly trackGap: number;
  readonly valueIndicatorContainerColor: TanreiPaint;
  readonly valueIndicatorContainerHeight: number;
  readonly valueIndicatorContainerPaddingInline: number;
  readonly valueIndicatorContainerShape: number;
  readonly valueIndicatorLabelColor: TanreiPaint;
  readonly valueIndicatorLabelTypescale: TanreiTypescaleRole;
  readonly valueIndicatorOffset: number;
  readonly sizes: TanreiSliderSizes;
  readonly conditions: TanreiSliderConditions;
}

/**
 * Every value of `comp.snackbar`'s `control` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `action` (with a dev-only warning).
 */
export interface TanreiSnackbarControlRegistry {
  action: true;
  close: true;
}
export type TanreiSnackbarControl = keyof TanreiSnackbarControlRegistry;
export type TanreiCoreSnackbarControl = "action" | "close";

/** What one `control` of `comp.snackbar` is drawn from in ONE interaction state. */
export interface TanreiSnackbarControlStateTokens {
  readonly containerColor: TanreiPaint;
  readonly contentColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
  readonly infoContainerColor: TanreiPaint;
  readonly infoContentColor: TanreiPaint;
  readonly infoStateLayerColor: TanreiPaint;
  readonly warningContainerColor: TanreiPaint;
  readonly warningContentColor: TanreiPaint;
  readonly warningStateLayerColor: TanreiPaint;
  readonly errorContainerColor: TanreiPaint;
  readonly errorContentColor: TanreiPaint;
  readonly errorStateLayerColor: TanreiPaint;
  readonly successContainerColor: TanreiPaint;
  readonly successContentColor: TanreiPaint;
  readonly successStateLayerColor: TanreiPaint;
  readonly inverseContainerColor: TanreiPaint;
  readonly inverseContentColor: TanreiPaint;
  readonly inverseStateLayerColor: TanreiPaint;
  readonly inverseInfoContainerColor: TanreiPaint;
  readonly inverseInfoContentColor: TanreiPaint;
  readonly inverseInfoStateLayerColor: TanreiPaint;
  readonly inverseWarningContainerColor: TanreiPaint;
  readonly inverseWarningContentColor: TanreiPaint;
  readonly inverseWarningStateLayerColor: TanreiPaint;
  readonly inverseErrorContainerColor: TanreiPaint;
  readonly inverseErrorContentColor: TanreiPaint;
  readonly inverseErrorStateLayerColor: TanreiPaint;
  readonly inverseSuccessContainerColor: TanreiPaint;
  readonly inverseSuccessContentColor: TanreiPaint;
  readonly inverseSuccessStateLayerColor: TanreiPaint;
}
/** One `control`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiSnackbarControlTokens {
  readonly enabled: TanreiSnackbarControlStateTokens;
  readonly hovered: TanreiSnackbarControlStateTokens;
  readonly focused: TanreiSnackbarControlStateTokens;
  readonly pressed: TanreiSnackbarControlStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiSnackbarControls = { readonly [Key in TanreiCoreSnackbarControl]: TanreiSnackbarControlTokens } & { readonly [Key in TanreiSnackbarControl]?: TanreiSnackbarControlTokens };

/**
 * `comp.snackbar`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`controls`), keyed by the axis value.
 */
export interface TanreiSnackbarTokens {
  readonly actionTonalLayerOpacity: number;
  readonly containerColor: TanreiPaint;
  readonly containerElevation: TanreiElevationLevel;
  readonly containerGap: number;
  readonly containerInverse: number;
  readonly containerMargin: number;
  readonly containerMaxWidth: number;
  readonly containerMinHeight: number;
  readonly containerMinWidth: number;
  readonly containerPaddingBlock: number;
  readonly containerPaddingInlineEnd: number;
  readonly containerPaddingInlineEndWithControls: number;
  readonly containerPaddingInlineStart: number;
  readonly containerShape: number;
  readonly controlsGap: number;
  readonly controlsHeight: number;
  readonly controlsIconSize: number;
  readonly controlsLabelTypescale: TanreiTypescaleRole;
  readonly controlsPaddingInline: number;
  readonly controlsShape: number;
  readonly errorContainerColor: TanreiPaint;
  readonly errorFocusRingColor: TanreiPaint;
  readonly errorIconColor: TanreiPaint;
  readonly errorOutlineColor: TanreiPaint;
  readonly errorSupportingTextColor: TanreiPaint;
  readonly errorTitleColor: TanreiPaint;
  readonly focusRingColor: TanreiPaint;
  readonly focusedOpacity: number;
  readonly hoveredOpacity: number;
  readonly iconGap: number;
  readonly iconOpacity: number;
  readonly iconSize: number;
  readonly infoContainerColor: TanreiPaint;
  readonly infoFocusRingColor: TanreiPaint;
  readonly infoIconColor: TanreiPaint;
  readonly infoOutlineColor: TanreiPaint;
  readonly infoSupportingTextColor: TanreiPaint;
  readonly infoTitleColor: TanreiPaint;
  readonly inverseErrorContainerColor: TanreiPaint;
  readonly inverseErrorFocusRingColor: TanreiPaint;
  readonly inverseErrorIconColor: TanreiPaint;
  readonly inverseErrorOutlineColor: TanreiPaint;
  readonly inverseErrorSupportingTextColor: TanreiPaint;
  readonly inverseErrorTitleColor: TanreiPaint;
  readonly inverseInfoContainerColor: TanreiPaint;
  readonly inverseInfoFocusRingColor: TanreiPaint;
  readonly inverseInfoIconColor: TanreiPaint;
  readonly inverseInfoOutlineColor: TanreiPaint;
  readonly inverseInfoSupportingTextColor: TanreiPaint;
  readonly inverseInfoTitleColor: TanreiPaint;
  readonly inverseSuccessContainerColor: TanreiPaint;
  readonly inverseSuccessFocusRingColor: TanreiPaint;
  readonly inverseSuccessIconColor: TanreiPaint;
  readonly inverseSuccessOutlineColor: TanreiPaint;
  readonly inverseSuccessSupportingTextColor: TanreiPaint;
  readonly inverseSuccessTitleColor: TanreiPaint;
  readonly inverseWarningContainerColor: TanreiPaint;
  readonly inverseWarningFocusRingColor: TanreiPaint;
  readonly inverseWarningIconColor: TanreiPaint;
  readonly inverseWarningOutlineColor: TanreiPaint;
  readonly inverseWarningSupportingTextColor: TanreiPaint;
  readonly inverseWarningTitleColor: TanreiPaint;
  readonly inverseContainerColor: TanreiPaint;
  readonly inverseFocusRingColor: TanreiPaint;
  readonly inverseSupportingTextColor: TanreiPaint;
  readonly inverseTitleColor: TanreiPaint;
  readonly motionEnterDuration: number;
  readonly motionEnterEasing: TanreiCubicBezier;
  readonly motionExitDuration: number;
  readonly motionExitEasing: TanreiCubicBezier;
  readonly motionExpandDuration: number;
  readonly motionExpandEasing: TanreiCubicBezier;
  readonly motionFeedbackDuration: number;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly outlineOpacity: number;
  readonly outlineWidth: number;
  readonly pressedOpacity: number;
  readonly successContainerColor: TanreiPaint;
  readonly successFocusRingColor: TanreiPaint;
  readonly successIconColor: TanreiPaint;
  readonly successOutlineColor: TanreiPaint;
  readonly successSupportingTextColor: TanreiPaint;
  readonly successTitleColor: TanreiPaint;
  readonly supportingTextColor: TanreiPaint;
  readonly supportingTextMaxLines: number;
  readonly supportingTextTypescale: TanreiTypescaleRole;
  readonly supportingTextUnderTitleOpacity: number;
  readonly timeoutLong: number;
  readonly timeoutShort: number;
  readonly titleColor: TanreiPaint;
  readonly titleGap: number;
  readonly titleMaxLines: number;
  readonly titleTypescale: TanreiTypescaleRole;
  readonly warningContainerColor: TanreiPaint;
  readonly warningFocusRingColor: TanreiPaint;
  readonly warningIconColor: TanreiPaint;
  readonly warningOutlineColor: TanreiPaint;
  readonly warningSupportingTextColor: TanreiPaint;
  readonly warningTitleColor: TanreiPaint;
  readonly controls: TanreiSnackbarControls;
}

/**
 * Every value of `comp.stepper`'s `condition` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `incomplete` (with a dev-only warning).
 */
export interface TanreiStepperConditionRegistry {
  incomplete: true;
  current: true;
  complete: true;
  error: true;
}
export type TanreiStepperCondition = keyof TanreiStepperConditionRegistry;
export type TanreiCoreStepperCondition = "incomplete" | "current" | "complete" | "error";

/** What one `condition` of `comp.stepper` is drawn from in ONE interaction state. */
export interface TanreiStepperConditionStateTokens {
  readonly containerColor: TanreiPaint;
  readonly markerColor: TanreiPaint;
  readonly markerOutlineColor: TanreiPaint;
  readonly markerContentColor: TanreiPaint;
  readonly labelColor: TanreiPaint;
  readonly descriptionColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
}
/** One `condition`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiStepperConditionTokens {
  readonly enabled: TanreiStepperConditionStateTokens;
  readonly hovered: TanreiStepperConditionStateTokens;
  readonly focused: TanreiStepperConditionStateTokens;
  readonly pressed: TanreiStepperConditionStateTokens;
  readonly disabled: TanreiStepperConditionStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiStepperConditions = { readonly [Key in TanreiCoreStepperCondition]: TanreiStepperConditionTokens } & { readonly [Key in TanreiStepperCondition]?: TanreiStepperConditionTokens };

/**
 * `comp.stepper`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`conditions`), keyed by the axis value.
 */
export interface TanreiStepperTokens {
  readonly barColor: TanreiPaint;
  readonly barFilledColor: TanreiPaint;
  readonly barGap: number;
  readonly barShape: number;
  readonly barThickness: number;
  readonly connectorColor: TanreiPaint;
  readonly connectorCompleteColor: TanreiPaint;
  readonly connectorGap: number;
  readonly connectorThickness: number;
  readonly containerPadding: number;
  readonly containerShape: number;
  readonly descriptionGap: number;
  readonly descriptionTypescale: TanreiTypescaleRole;
  readonly disabledContainerShape: number;
  readonly disabledOpacity: number;
  readonly focusedContainerShape: number;
  readonly focusedOpacity: number;
  readonly hoveredContainerShape: number;
  readonly hoveredOpacity: number;
  readonly labelTypescale: TanreiTypescaleRole;
  readonly markerGap: number;
  readonly markerIconSize: number;
  readonly markerIconWeight: number;
  readonly markerLabelTypescale: TanreiTypescaleRole;
  readonly markerOutlineWidth: number;
  readonly markerShape: number;
  readonly markerSize: number;
  readonly motionFeedbackDuration: number;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly positionColor: TanreiPaint;
  readonly positionGap: number;
  readonly positionTypescale: TanreiTypescaleRole;
  readonly pressedContainerShape: number;
  readonly pressedOpacity: number;
  readonly stepMinWidth: number;
  readonly conditions: TanreiStepperConditions;
}

/**
 * Every value of `comp.steps`'s `size` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `medium` (with a dev-only warning).
 */
export interface TanreiStepsSizeRegistry {
  medium: true;
  large: true;
}
export type TanreiStepsSize = keyof TanreiStepsSizeRegistry;
export type TanreiCoreStepsSize = "medium" | "large";

/** The tokens of one `size` of `comp.steps`. */
export interface TanreiStepsSizeTokens {
  readonly markerHeight: number;
  readonly markerLabelTypescale: TanreiTypescaleRole;
  readonly titleTypescale: TanreiTypescaleRole;
  readonly bodyTypescale: TanreiTypescaleRole;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiStepsSizes = { readonly [Key in TanreiCoreStepsSize]: TanreiStepsSizeTokens } & { readonly [Key in TanreiStepsSize]?: TanreiStepsSizeTokens };

/**
 * `comp.steps`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`sizes`), keyed by the axis value.
 */
export interface TanreiStepsTokens {
  readonly bodyGap: number;
  readonly connectorColor: TanreiPaint;
  readonly connectorGap: number;
  readonly connectorThickness: number;
  readonly markerGap: number;
  readonly markerOutlineColor: TanreiPaint;
  readonly markerOutlineWidth: number;
  readonly markerPaddingInline: number;
  readonly markerShape: number;
  readonly stepGap: number;
  readonly titleGap: number;
  readonly sizes: TanreiStepsSizes;
}

/**
 * Every value of `comp.swatch`'s `size` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `medium` (with a dev-only warning).
 */
export interface TanreiSwatchSizeRegistry {
  small: true;
  medium: true;
  large: true;
}
export type TanreiSwatchSize = keyof TanreiSwatchSizeRegistry;
export type TanreiCoreSwatchSize = "small" | "medium" | "large";

/** The tokens of one `size` of `comp.swatch`. */
export interface TanreiSwatchSizeTokens {
  readonly containerSize: number;
  readonly gap: number;
  readonly labelTypescale: TanreiTypescaleRole;
  readonly supportingTextTypescale: TanreiTypescaleRole;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiSwatchSizes = { readonly [Key in TanreiCoreSwatchSize]: TanreiSwatchSizeTokens } & { readonly [Key in TanreiSwatchSize]?: TanreiSwatchSizeTokens };

/**
 * Every value of `comp.swatch`'s `shape` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `square` (with a dev-only warning).
 */
export interface TanreiSwatchShapeRegistry {
  square: true;
  circle: true;
}
export type TanreiSwatchShape = keyof TanreiSwatchShapeRegistry;
export type TanreiCoreSwatchShape = "square" | "circle";

/** The tokens of one `shape` of `comp.swatch`. */
export interface TanreiSwatchShapeTokens {
  readonly containerShape: number;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiSwatchShapes = { readonly [Key in TanreiCoreSwatchShape]: TanreiSwatchShapeTokens } & { readonly [Key in TanreiSwatchShape]?: TanreiSwatchShapeTokens };

/**
 * `comp.swatch`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`sizes`, `shapes`), keyed by the axis value.
 */
export interface TanreiSwatchTokens {
  readonly checkerboardAlternateColor: TanreiPaint;
  readonly checkerboardColor: TanreiPaint;
  readonly checkerboardSize: number;
  readonly labelColor: TanreiPaint;
  readonly outlineColor: TanreiPaint;
  readonly outlineWidth: number;
  readonly supportingTextColor: TanreiPaint;
  readonly sizes: TanreiSwatchSizes;
  readonly shapes: TanreiSwatchShapes;
}

/**
 * Every value of `comp.switch`'s `condition` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `unselected` (with a dev-only warning).
 */
export interface TanreiSwitchConditionRegistry {
  unselected: true;
  selected: true;
}
export type TanreiSwitchCondition = keyof TanreiSwitchConditionRegistry;
export type TanreiCoreSwitchCondition = "unselected" | "selected";

/** What one `condition` of `comp.switch` is drawn from in ONE interaction state. */
export interface TanreiSwitchConditionStateTokens {
  readonly containerColor: TanreiPaint;
  readonly trackColor: TanreiPaint;
  readonly outlineColor: TanreiPaint;
  readonly handleColor: TanreiPaint;
  readonly handleSize: number;
  readonly handleElevation: TanreiElevationLevel;
  readonly iconColor: TanreiPaint;
  readonly labelColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
}
/** One `condition`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiSwitchConditionTokens {
  readonly enabled: TanreiSwitchConditionStateTokens;
  readonly hovered: TanreiSwitchConditionStateTokens;
  readonly focused: TanreiSwitchConditionStateTokens;
  readonly pressed: TanreiSwitchConditionStateTokens;
  readonly disabled: TanreiSwitchConditionStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiSwitchConditions = { readonly [Key in TanreiCoreSwitchCondition]: TanreiSwitchConditionTokens } & { readonly [Key in TanreiSwitchCondition]?: TanreiSwitchConditionTokens };

/**
 * `comp.switch`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`conditions`), keyed by the axis value.
 */
export interface TanreiSwitchTokens {
  readonly containerShape: number;
  readonly containerSize: number;
  readonly disabledContainerShape: number;
  readonly disabledOpacity: number;
  readonly focusedContainerShape: number;
  readonly focusedOpacity: number;
  readonly handleSizeWithIcon: number;
  readonly hoveredContainerShape: number;
  readonly hoveredOpacity: number;
  readonly iconSize: number;
  readonly iconWeight: number;
  readonly labelGap: number;
  readonly labelTypescale: TanreiTypescaleRole;
  readonly motionFeedbackDuration: number;
  readonly motionSelectionDuration: number;
  readonly motionSelectionEasing: TanreiCubicBezier;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly outlineWidth: number;
  readonly pressedContainerShape: number;
  readonly pressedOpacity: number;
  readonly trackHeight: number;
  readonly trackShape: number;
  readonly trackWidth: number;
  readonly conditions: TanreiSwitchConditions;
}

/**
 * `comp.tab-view`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis, keyed by the axis value.
 */
export interface TanreiTabViewTokens {
  readonly containerShape: number;
  readonly motionFadeDuration: number;
  readonly motionFadeEasing: TanreiCubicBezier;
  readonly motionSwitchDuration: number;
  readonly motionSwitchEasing: TanreiCubicBezier;
  readonly motionTransition: number;
  readonly transitionBlur: number;
  readonly transitionDistance: number;
  readonly transitionDistanceFraction: number;
  readonly transitionOpacity: number;
}

/**
 * Every value of `comp.table-of-contents`'s `part` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `item` (with a dev-only warning).
 */
export interface TanreiTableOfContentsPartRegistry {
  item: true;
  current: true;
  disclosure: true;
}
export type TanreiTableOfContentsPart = keyof TanreiTableOfContentsPartRegistry;
export type TanreiCoreTableOfContentsPart = "item" | "current" | "disclosure";

/** What one `part` of `comp.table-of-contents` is drawn from in ONE interaction state. */
export interface TanreiTableOfContentsPartStateTokens {
  readonly containerColor: TanreiPaint;
  readonly labelColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
}
/** One `part`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiTableOfContentsPartTokens {
  readonly enabled: TanreiTableOfContentsPartStateTokens;
  readonly hovered: TanreiTableOfContentsPartStateTokens;
  readonly focused: TanreiTableOfContentsPartStateTokens;
  readonly pressed: TanreiTableOfContentsPartStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiTableOfContentsParts = { readonly [Key in TanreiCoreTableOfContentsPart]: TanreiTableOfContentsPartTokens } & { readonly [Key in TanreiTableOfContentsPart]?: TanreiTableOfContentsPartTokens };

/**
 * Every value of `comp.table-of-contents`'s `density` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `regular` (with a dev-only warning).
 */
export interface TanreiTableOfContentsDensityRegistry {
  regular: true;
  compact: true;
}
export type TanreiTableOfContentsDensity = keyof TanreiTableOfContentsDensityRegistry;
export type TanreiCoreTableOfContentsDensity = "regular" | "compact";

/** The tokens of one `density` of `comp.table-of-contents`. */
export interface TanreiTableOfContentsDensityTokens {
  readonly rowHeight: number;
  readonly rowPaddingBlock: number;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiTableOfContentsDensitys = { readonly [Key in TanreiCoreTableOfContentsDensity]: TanreiTableOfContentsDensityTokens } & { readonly [Key in TanreiTableOfContentsDensity]?: TanreiTableOfContentsDensityTokens };

/**
 * `comp.table-of-contents`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`parts`, `densitys`), keyed by the axis value.
 */
export interface TanreiTableOfContentsTokens {
  readonly compactContainerColor: TanreiPaint;
  readonly compactContainerShape: number;
  readonly compactIconColor: TanreiPaint;
  readonly compactIconSize: number;
  readonly compactListPaddingBlock: number;
  readonly compactListPaddingInline: number;
  readonly compactRowGap: number;
  readonly compactRowHeight: number;
  readonly compactRowPaddingInline: number;
  readonly compactSupportingTextColor: TanreiPaint;
  readonly compactSupportingTextTypescale: TanreiTypescaleRole;
  readonly containerGap: number;
  readonly focusedOpacity: number;
  readonly hoveredOpacity: number;
  readonly labelTypescale: TanreiTypescaleRole;
  readonly markerColor: TanreiPaint;
  readonly markerWidth: number;
  readonly motionDisclosureDuration: number;
  readonly motionDisclosureEasing: TanreiCubicBezier;
  readonly motionFeedbackDuration: number;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly pressedOpacity: number;
  readonly railColor: TanreiPaint;
  readonly railWidth: number;
  readonly rowIndent: number;
  readonly rowPaddingInline: number;
  readonly rowShape: number;
  readonly titleColor: TanreiPaint;
  readonly titleTypescale: TanreiTypescaleRole;
  readonly parts: TanreiTableOfContentsParts;
  readonly densitys: TanreiTableOfContentsDensitys;
}

/**
 * Every value of `comp.table`'s `part` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `sort` (with a dev-only warning).
 */
export interface TanreiTablePartRegistry {
  sort: true;
  sorted: true;
}
export type TanreiTablePart = keyof TanreiTablePartRegistry;
export type TanreiCoreTablePart = "sort" | "sorted";

/** What one `part` of `comp.table` is drawn from in ONE interaction state. */
export interface TanreiTablePartStateTokens {
  readonly containerColor: TanreiPaint;
  readonly labelColor: TanreiPaint;
  readonly iconColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
}
/** One `part`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiTablePartTokens {
  readonly enabled: TanreiTablePartStateTokens;
  readonly hovered: TanreiTablePartStateTokens;
  readonly focused: TanreiTablePartStateTokens;
  readonly pressed: TanreiTablePartStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiTableParts = { readonly [Key in TanreiCoreTablePart]: TanreiTablePartTokens } & { readonly [Key in TanreiTablePart]?: TanreiTablePartTokens };

/**
 * Every value of `comp.table`'s `density` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `regular` (with a dev-only warning).
 */
export interface TanreiTableDensityRegistry {
  regular: true;
  compact: true;
}
export type TanreiTableDensity = keyof TanreiTableDensityRegistry;
export type TanreiCoreTableDensity = "regular" | "compact";

/** The tokens of one `density` of `comp.table`. */
export interface TanreiTableDensityTokens {
  readonly cellPaddingBlock: number;
  readonly cellPaddingInline: number;
  readonly cellTextTypescale: TanreiTypescaleRole;
  readonly headerTextTypescale: TanreiTypescaleRole;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiTableDensitys = { readonly [Key in TanreiCoreTableDensity]: TanreiTableDensityTokens } & { readonly [Key in TanreiTableDensity]?: TanreiTableDensityTokens };

/**
 * `comp.table`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`parts`, `densitys`), keyed by the axis value.
 */
export interface TanreiTableTokens {
  readonly captionGap: number;
  readonly captionTextColor: TanreiPaint;
  readonly captionTextTypescale: TanreiTypescaleRole;
  readonly cellTextColor: TanreiPaint;
  readonly dividerColor: TanreiPaint;
  readonly dividerThickness: number;
  readonly emptyPaddingBlock: number;
  readonly focusedOpacity: number;
  readonly headerContainerColor: TanreiPaint;
  readonly headerGap: number;
  readonly headerIconSize: number;
  readonly headerIconWeight: number;
  readonly headerTextColor: TanreiPaint;
  readonly hoveredOpacity: number;
  readonly motionFeedbackDuration: number;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly pressedOpacity: number;
  readonly rowGap: number;
  readonly rowSelectedContainerColor: TanreiPaint;
  readonly rowSelectedHoveredContainerColor: TanreiPaint;
  readonly rowSelectedHoveredTextColor: TanreiPaint;
  readonly rowSelectedPressedContainerColor: TanreiPaint;
  readonly rowSelectedPressedTextColor: TanreiPaint;
  readonly rowSelectedStateLayerColor: TanreiPaint;
  readonly rowSelectedTextColor: TanreiPaint;
  readonly rowUnselectedContainerColor: TanreiPaint;
  readonly rowUnselectedHoveredContainerColor: TanreiPaint;
  readonly rowUnselectedHoveredTextColor: TanreiPaint;
  readonly rowUnselectedPressedContainerColor: TanreiPaint;
  readonly rowUnselectedPressedTextColor: TanreiPaint;
  readonly rowUnselectedStateLayerColor: TanreiPaint;
  readonly rowUnselectedTextColor: TanreiPaint;
  readonly separation: number;
  readonly statusGap: number;
  readonly statusPaddingBlock: number;
  readonly statusTextColor: TanreiPaint;
  readonly statusTextTypescale: TanreiTypescaleRole;
  readonly stickyContainerColor: TanreiPaint;
  readonly stripeContainerColor: TanreiPaint;
  readonly parts: TanreiTableParts;
  readonly densitys: TanreiTableDensitys;
}

/**
 * Every value of `comp.tabs`'s `variant` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `primary` (with a dev-only warning).
 */
export interface TanreiTabsVariantRegistry {
  primary: true;
  secondary: true;
  tonal: true;
}
export type TanreiTabsVariant = keyof TanreiTabsVariantRegistry;
export type TanreiCoreTabsVariant = "primary" | "secondary" | "tonal";

/** What one `variant` of `comp.tabs` is drawn from in ONE interaction state. */
export interface TanreiTabsVariantStateTokens {
  readonly trackColor: TanreiPaint;
  readonly containerColor: TanreiPaint;
  readonly labelColor: TanreiPaint;
  readonly iconColor: TanreiPaint;
  readonly coveredLabelColor: TanreiPaint;
  readonly coveredIconColor: TanreiPaint;
  readonly activeIndicatorColor: TanreiPaint;
  readonly activeIndicatorThickness: number;
  readonly activeIndicatorShape: number;
  readonly underlineColor: TanreiPaint;
  readonly underlineThickness: number;
  readonly underlineShape: number;
  readonly stateLayerColor: TanreiPaint;
  readonly selectedContainerColor: TanreiPaint;
  readonly selectedLabelColor: TanreiPaint;
  readonly selectedIconColor: TanreiPaint;
  readonly selectedCoveredLabelColor: TanreiPaint;
  readonly selectedCoveredIconColor: TanreiPaint;
  readonly selectedActiveIndicatorColor: TanreiPaint;
  readonly selectedUnderlineColor: TanreiPaint;
  readonly selectedStateLayerColor: TanreiPaint;
}
/** One `variant`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiTabsVariantTokens {
  readonly enabled: TanreiTabsVariantStateTokens;
  readonly hovered: TanreiTabsVariantStateTokens;
  readonly focused: TanreiTabsVariantStateTokens;
  readonly pressed: TanreiTabsVariantStateTokens;
  readonly disabled: TanreiTabsVariantStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiTabsVariants = { readonly [Key in TanreiCoreTabsVariant]: TanreiTabsVariantTokens } & { readonly [Key in TanreiTabsVariant]?: TanreiTabsVariantTokens };

/**
 * Every value of `comp.tabs`'s `size` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `medium` (with a dev-only warning).
 */
export interface TanreiTabsSizeRegistry {
  small: true;
  medium: true;
}
export type TanreiTabsSize = keyof TanreiTabsSizeRegistry;
export type TanreiCoreTabsSize = "small" | "medium";

/** The tokens of one `size` of `comp.tabs`. */
export interface TanreiTabsSizeTokens {
  readonly containerHeight: number;
  readonly containerPaddingInline: number;
  readonly activeIndicatorPaddingInline: number;
  readonly activeIndicatorPaddingBlock: number;
  readonly iconSize: number;
  readonly iconPlacement: number;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiTabsSizes = { readonly [Key in TanreiCoreTabsSize]: TanreiTabsSizeTokens } & { readonly [Key in TanreiTabsSize]?: TanreiTabsSizeTokens };

/**
 * `comp.tabs`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`variants`, `sizes`), keyed by the axis value.
 */
export interface TanreiTabsTokens {
  readonly activeIndicatorHeight: number;
  readonly containerGap: number;
  readonly containerHeightWithIcon: number;
  readonly containerShape: number;
  readonly disabledOpacity: number;
  readonly dividerColor: TanreiPaint;
  readonly dividerThickness: number;
  readonly focusedOpacity: number;
  readonly hoveredOpacity: number;
  readonly labelTypescale: TanreiTypescaleRole;
  readonly motionFeedbackDuration: number;
  readonly motionIndicatorDuration: number;
  readonly motionIndicatorEasing: TanreiCubicBezier;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly motionTransition: number;
  readonly pressedOpacity: number;
  readonly primarySelectedLabelEmphasis: number;
  readonly secondarySelectedLabelEmphasis: number;
  readonly tonalSelectedLabelEmphasis: number;
  readonly trackPadding: number;
  readonly trackShape: number;
  readonly trackVisible: number;
  readonly variants: TanreiTabsVariants;
  readonly sizes: TanreiTabsSizes;
}

/**
 * Every value of `comp.tag-group`'s `spacing` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `chips` (with a dev-only warning).
 */
export interface TanreiTagGroupSpacingRegistry {
  tags: true;
  chips: true;
}
export type TanreiTagGroupSpacing = keyof TanreiTagGroupSpacingRegistry;
export type TanreiCoreTagGroupSpacing = "tags" | "chips";

/** The tokens of one `spacing` of `comp.tag-group`. */
export interface TanreiTagGroupSpacingTokens {
  readonly gap: number;
  readonly rowGap: number;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiTagGroupSpacings = { readonly [Key in TanreiCoreTagGroupSpacing]: TanreiTagGroupSpacingTokens } & { readonly [Key in TanreiTagGroupSpacing]?: TanreiTagGroupSpacingTokens };

/**
 * `comp.tag-group`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`spacings`), keyed by the axis value.
 */
export interface TanreiTagGroupTokens {
  readonly spacings: TanreiTagGroupSpacings;
}

/**
 * Every value of `comp.tag`'s `size` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `medium` (with a dev-only warning).
 */
export interface TanreiTagSizeRegistry {
  small: true;
  medium: true;
}
export type TanreiTagSize = keyof TanreiTagSizeRegistry;
export type TanreiCoreTagSize = "small" | "medium";

/** The tokens of one `size` of `comp.tag`. */
export interface TanreiTagSizeTokens {
  readonly containerHeight: number;
  readonly containerPaddingInline: number;
  readonly containerPaddingInlineWithIcon: number;
  readonly containerPaddingBlock: number;
  readonly labelTypescale: TanreiTypescaleRole;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiTagSizes = { readonly [Key in TanreiCoreTagSize]: TanreiTagSizeTokens } & { readonly [Key in TanreiTagSize]?: TanreiTagSizeTokens };

/**
 * Every value of `comp.tag`'s `variant` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `tonal` (with a dev-only warning).
 */
export interface TanreiTagVariantRegistry {
  tonal: true;
  outlined: true;
  filled: true;
}
export type TanreiTagVariant = keyof TanreiTagVariantRegistry;
export type TanreiCoreTagVariant = "tonal" | "outlined" | "filled";

/** What one `variant` of `comp.tag` is drawn from in ONE interaction state. */
export interface TanreiTagVariantStateTokens {
  readonly containerColor: TanreiPaint;
  readonly labelColor: TanreiPaint;
  readonly iconColor: TanreiPaint;
  readonly infoContainerColor: TanreiPaint;
  readonly infoLabelColor: TanreiPaint;
  readonly infoIconColor: TanreiPaint;
  readonly warningContainerColor: TanreiPaint;
  readonly warningLabelColor: TanreiPaint;
  readonly warningIconColor: TanreiPaint;
  readonly errorContainerColor: TanreiPaint;
  readonly errorLabelColor: TanreiPaint;
  readonly errorIconColor: TanreiPaint;
  readonly successContainerColor: TanreiPaint;
  readonly successLabelColor: TanreiPaint;
  readonly successIconColor: TanreiPaint;
}
/** One `variant`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiTagVariantTokens {
  readonly enabled: TanreiTagVariantStateTokens;
  readonly disabled: TanreiTagVariantStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiTagVariants = { readonly [Key in TanreiCoreTagVariant]: TanreiTagVariantTokens } & { readonly [Key in TanreiTagVariant]?: TanreiTagVariantTokens };

/**
 * `comp.tag`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`sizes`, `variants`), keyed by the axis value.
 */
export interface TanreiTagTokens {
  readonly containerGap: number;
  readonly containerShape: number;
  readonly dotSize: number;
  readonly iconSize: number;
  readonly outlineColor: TanreiPaint;
  readonly outlineWidth: number;
  readonly sizes: TanreiTagSizes;
  readonly variants: TanreiTagVariants;
}

/**
 * Every value of `comp.text-input`'s `variant` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `stacked` (with a dev-only warning).
 */
export interface TanreiTextInputVariantRegistry {
  stacked: true;
  filled: true;
  outlined: true;
}
export type TanreiTextInputVariant = keyof TanreiTextInputVariantRegistry;
export type TanreiCoreTextInputVariant = "stacked" | "filled" | "outlined";

/** What one `variant` of `comp.text-input` is drawn from in ONE interaction state. */
export interface TanreiTextInputVariantStateTokens {
  readonly resizeGripColor: TanreiPaint;
  readonly errorResizeGripColor: TanreiPaint;
}
/** One `variant`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiTextInputVariantTokens {
  readonly enabled: TanreiTextInputVariantStateTokens;
  readonly hovered: TanreiTextInputVariantStateTokens;
  readonly focused: TanreiTextInputVariantStateTokens;
  readonly disabled: TanreiTextInputVariantStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiTextInputVariants = { readonly [Key in TanreiCoreTextInputVariant]: TanreiTextInputVariantTokens } & { readonly [Key in TanreiTextInputVariant]?: TanreiTextInputVariantTokens };

/**
 * `comp.text-input`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`variants`), keyed by the axis value.
 */
export interface TanreiTextInputTokens {
  readonly codeTabSize: number;
  readonly codeTypescale: TanreiTypescaleRole;
  readonly entriesGap: number;
  readonly entriesRowGap: number;
  readonly entriesTypingMinWidth: number;
  readonly motionResizeDuration: number;
  readonly motionResizeEasing: TanreiCubicBezier;
  readonly resizeGripInset: number;
  readonly resizeGripSize: number;
  readonly segmentPaddingInline: number;
  readonly variants: TanreiTextInputVariants;
}

/**
 * Every value of `comp.timeline`'s `size` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `medium` (with a dev-only warning).
 */
export interface TanreiTimelineSizeRegistry {
  medium: true;
  large: true;
}
export type TanreiTimelineSize = keyof TanreiTimelineSizeRegistry;
export type TanreiCoreTimelineSize = "medium" | "large";

/** The tokens of one `size` of `comp.timeline`. */
export interface TanreiTimelineSizeTokens {
  readonly markerHeight: number;
  readonly timeTypescale: TanreiTypescaleRole;
  readonly titleTypescale: TanreiTypescaleRole;
  readonly bodyTypescale: TanreiTypescaleRole;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiTimelineSizes = { readonly [Key in TanreiCoreTimelineSize]: TanreiTimelineSizeTokens } & { readonly [Key in TanreiTimelineSize]?: TanreiTimelineSizeTokens };

/**
 * Every value of `comp.timeline`'s `density` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `regular` (with a dev-only warning).
 */
export interface TanreiTimelineDensityRegistry {
  regular: true;
  compact: true;
}
export type TanreiTimelineDensity = keyof TanreiTimelineDensityRegistry;
export type TanreiCoreTimelineDensity = "regular" | "compact";

/** The tokens of one `density` of `comp.timeline`. */
export interface TanreiTimelineDensityTokens {
  readonly itemGap: number;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiTimelineDensitys = { readonly [Key in TanreiCoreTimelineDensity]: TanreiTimelineDensityTokens } & { readonly [Key in TanreiTimelineDensity]?: TanreiTimelineDensityTokens };

/**
 * `comp.timeline`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`sizes`, `densitys`), keyed by the axis value.
 */
export interface TanreiTimelineTokens {
  readonly bodyGap: number;
  readonly connectorColor: TanreiPaint;
  readonly connectorGap: number;
  readonly connectorThickness: number;
  readonly markerCurrentContainerColor: TanreiPaint;
  readonly markerCurrentIconColor: TanreiPaint;
  readonly markerDotColor: TanreiPaint;
  readonly markerDotSize: number;
  readonly markerGap: number;
  readonly markerIconColor: TanreiPaint;
  readonly markerIconSize: number;
  readonly markerOutlineColor: TanreiPaint;
  readonly markerOutlineWidth: number;
  readonly markerShape: number;
  readonly timeColor: TanreiPaint;
  readonly timeGap: number;
  readonly titleGap: number;
  readonly sizes: TanreiTimelineSizes;
  readonly densitys: TanreiTimelineDensitys;
}

/**
 * Every value of `comp.toolbar`'s `variant` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `docked` (with a dev-only warning).
 */
export interface TanreiToolbarVariantRegistry {
  docked: true;
  floating: true;
}
export type TanreiToolbarVariant = keyof TanreiToolbarVariantRegistry;
export type TanreiCoreToolbarVariant = "docked" | "floating";

/** The tokens of one `variant` of `comp.toolbar`. */
export interface TanreiToolbarVariantTokens {
  readonly containerColor: TanreiPaint;
  readonly containerElevation: TanreiElevationLevel;
  readonly containerShape: number;
  readonly containerSize: number;
  readonly containerPaddingInline: number;
  readonly containerGap: number;
  readonly outlineColor: TanreiPaint;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiToolbarVariants = { readonly [Key in TanreiCoreToolbarVariant]: TanreiToolbarVariantTokens } & { readonly [Key in TanreiToolbarVariant]?: TanreiToolbarVariantTokens };

/**
 * `comp.toolbar`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`variants`), keyed by the axis value.
 */
export interface TanreiToolbarTokens {
  readonly outlineWidth: number;
  readonly variants: TanreiToolbarVariants;
}

/**
 * `comp.tooltip`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis, keyed by the axis value.
 */
export interface TanreiTooltipTokens {
  readonly arrowHeight: number;
  readonly arrowInset: number;
  readonly arrowVisible: number;
  readonly arrowWidth: number;
  readonly motionEnterDuration: number;
  readonly motionEnterEasing: TanreiCubicBezier;
  readonly motionEnterOffset: number;
  readonly motionEnterScale: number;
  readonly motionExitDuration: number;
  readonly motionExitEasing: TanreiCubicBezier;
  readonly motionHideDelay: number;
  readonly motionShowDelay: number;
  readonly motionWarmDuration: number;
  readonly offset: number;
  readonly plainContainerColor: TanreiPaint;
  readonly plainContainerElevation: TanreiElevationLevel;
  readonly plainContainerGap: number;
  readonly plainContainerInverse: number;
  readonly plainContainerMaxWidth: number;
  readonly plainContainerMinHeight: number;
  readonly plainContainerPaddingBlock: number;
  readonly plainContainerPaddingInline: number;
  readonly plainContainerShape: number;
  readonly plainShortcutColor: TanreiPaint;
  readonly plainSupportingTextColor: TanreiPaint;
  readonly plainSupportingTextTypescale: TanreiTypescaleRole;
  readonly plainSurfaceContainerColor: TanreiPaint;
  readonly plainSurfaceContainerElevation: TanreiElevationLevel;
  readonly plainSurfaceShortcutColor: TanreiPaint;
  readonly plainSurfaceSupportingTextColor: TanreiPaint;
  readonly richContainerColor: TanreiPaint;
  readonly richContainerElevation: TanreiElevationLevel;
  readonly richContainerGap: number;
  readonly richContainerInverse: number;
  readonly richContainerMaxWidth: number;
  readonly richContainerPaddingBlock: number;
  readonly richContainerPaddingInline: number;
  readonly richContainerShape: number;
  readonly richInverseContainerColor: TanreiPaint;
  readonly richInverseContainerElevation: TanreiElevationLevel;
  readonly richInverseSupportingTextColor: TanreiPaint;
  readonly richInverseTitleColor: TanreiPaint;
  readonly richSupportingTextColor: TanreiPaint;
  readonly richSupportingTextTypescale: TanreiTypescaleRole;
  readonly richTitleColor: TanreiPaint;
  readonly richTitleTypescale: TanreiTypescaleRole;
  readonly timeoutTouch: number;
  readonly windowMargin: number;
}

/**
 * Every value of `comp.tree-view`'s `condition` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `unselected` (with a dev-only warning).
 */
export interface TanreiTreeViewConditionRegistry {
  unselected: true;
  selected: true;
}
export type TanreiTreeViewCondition = keyof TanreiTreeViewConditionRegistry;
export type TanreiCoreTreeViewCondition = "unselected" | "selected";

/** What one `condition` of `comp.tree-view` is drawn from in ONE interaction state. */
export interface TanreiTreeViewConditionStateTokens {
  readonly containerColor: TanreiPaint;
  readonly labelColor: TanreiPaint;
  readonly supportingTextColor: TanreiPaint;
  readonly trailingTextColor: TanreiPaint;
  readonly iconColor: TanreiPaint;
  readonly chevronColor: TanreiPaint;
  readonly stateLayerColor: TanreiPaint;
}
/** One `condition`: the resting state (`enabled`) and every interaction state. States are not extensible. */
export interface TanreiTreeViewConditionTokens {
  readonly enabled: TanreiTreeViewConditionStateTokens;
  readonly hovered: TanreiTreeViewConditionStateTokens;
  readonly focused: TanreiTreeViewConditionStateTokens;
  readonly pressed: TanreiTreeViewConditionStateTokens;
  readonly disabled: TanreiTreeViewConditionStateTokens;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiTreeViewConditions = { readonly [Key in TanreiCoreTreeViewCondition]: TanreiTreeViewConditionTokens } & { readonly [Key in TanreiTreeViewCondition]?: TanreiTreeViewConditionTokens };

/**
 * Every value of `comp.tree-view`'s `density` axis. The core values are listed here; a system that adds one
 * declares it by module augmentation — its generated file does that. At runtime a value the active system
 * does not have falls back to `regular` (with a dev-only warning).
 */
export interface TanreiTreeViewDensityRegistry {
  regular: true;
  compact: true;
}
export type TanreiTreeViewDensity = keyof TanreiTreeViewDensityRegistry;
export type TanreiCoreTreeViewDensity = "regular" | "compact";

/** The tokens of one `density` of `comp.tree-view`. */
export interface TanreiTreeViewDensityTokens {
  readonly containerHeight: number;
  readonly containerPaddingBlock: number;
  readonly containerPaddingInline: number;
  readonly containerGap: number;
  readonly levelIndent: number;
  readonly labelTypescale: TanreiTypescaleRole;
  readonly iconSize: number;
  readonly chevronSize: number;
}
/** Core values are required; a value a system added is present only in that system. */
export type TanreiTreeViewDensitys = { readonly [Key in TanreiCoreTreeViewDensity]: TanreiTreeViewDensityTokens } & { readonly [Key in TanreiTreeViewDensity]?: TanreiTreeViewDensityTokens };

/**
 * `comp.tree-view`: one member per token that is on no axis (a per-state one carries the state in its name,
 * `<state><Part>`), then one holder per axis (`conditions`, `densitys`), keyed by the axis value.
 */
export interface TanreiTreeViewTokens {
  readonly containerShape: number;
  readonly disabledOpacity: number;
  readonly focusedOpacity: number;
  readonly guideColor: TanreiPaint;
  readonly guideWidth: number;
  readonly hoveredOpacity: number;
  readonly iconGap: number;
  readonly motionDisclosureDuration: number;
  readonly motionDisclosureEasing: TanreiCubicBezier;
  readonly motionFeedbackDuration: number;
  readonly motionStateDuration: number;
  readonly motionStateEasing: TanreiCubicBezier;
  readonly pressedOpacity: number;
  readonly stickyContainerColor: TanreiPaint;
  readonly stickyDividerColor: TanreiPaint;
  readonly stickyDividerWidth: number;
  readonly supportingTextTypescale: TanreiTypescaleRole;
  readonly trailingTextTypescale: TanreiTypescaleRole;
  readonly conditions: TanreiTreeViewConditions;
  readonly densitys: TanreiTreeViewDensitys;
}

export interface TanreiComponents {
  readonly accordion: TanreiAccordionTokens;
  readonly appBar: TanreiAppBarTokens;
  readonly appShell: TanreiAppShellTokens;
  readonly avatar: TanreiAvatarTokens;
  readonly badge: TanreiBadgeTokens;
  readonly bottomSheet: TanreiBottomSheetTokens;
  readonly breadcrumbs: TanreiBreadcrumbsTokens;
  readonly buttonGroup: TanreiButtonGroupTokens;
  readonly buttonWithMenu: TanreiButtonWithMenuTokens;
  readonly button: TanreiButtonTokens;
  readonly calendar: TanreiCalendarTokens;
  readonly callout: TanreiCalloutTokens;
  readonly card: TanreiCardTokens;
  readonly carousel: TanreiCarouselTokens;
  readonly chatComposer: TanreiChatComposerTokens;
  readonly checkbox: TanreiCheckboxTokens;
  readonly chip: TanreiChipTokens;
  readonly codeBlock: TanreiCodeBlockTokens;
  readonly colorInput: TanreiColorInputTokens;
  readonly combobox: TanreiComboboxTokens;
  readonly copyButton: TanreiCopyButtonTokens;
  readonly dateTimePicker: TanreiDateTimePickerTokens;
  readonly descriptionList: TanreiDescriptionListTokens;
  readonly dialog: TanreiDialogTokens;
  readonly divider: TanreiDividerTokens;
  readonly dropZone: TanreiDropZoneTokens;
  readonly embeddedTextInput: TanreiEmbeddedTextInputTokens;
  readonly emptyState: TanreiEmptyStateTokens;
  readonly fabMenu: TanreiFabMenuTokens;
  readonly fieldGroup: TanreiFieldGroupTokens;
  readonly field: TanreiFieldTokens;
  readonly figure: TanreiFigureTokens;
  readonly fileItem: TanreiFileItemTokens;
  readonly filePicker: TanreiFilePickerTokens;
  readonly fileUpload: TanreiFileUploadTokens;
  readonly imagePreview: TanreiImagePreviewTokens;
  readonly inlineCode: TanreiInlineCodeTokens;
  readonly inputBox: TanreiInputBoxTokens;
  readonly keyboardShortcut: TanreiKeyboardShortcutTokens;
  readonly linkCard: TanreiLinkCardTokens;
  readonly link: TanreiLinkTokens;
  readonly list: TanreiListTokens;
  readonly loadingIndicator: TanreiLoadingIndicatorTokens;
  readonly mainActionButton: TanreiMainActionButtonTokens;
  readonly menu: TanreiMenuTokens;
  readonly menubar: TanreiMenubarTokens;
  readonly modalLayer: TanreiModalLayerTokens;
  readonly navigationBar: TanreiNavigationBarTokens;
  readonly navigationDrawer: TanreiNavigationDrawerTokens;
  readonly navigationRail: TanreiNavigationRailTokens;
  readonly numberInput: TanreiNumberInputTokens;
  readonly oneTimeCodeInput: TanreiOneTimeCodeInputTokens;
  readonly pageHeader: TanreiPageHeaderTokens;
  readonly pagination: TanreiPaginationTokens;
  readonly popover: TanreiPopoverTokens;
  readonly progressIndicator: TanreiProgressIndicatorTokens;
  readonly prose: TanreiProseTokens;
  readonly radioButton: TanreiRadioButtonTokens;
  readonly search: TanreiSearchTokens;
  readonly segmentedButton: TanreiSegmentedButtonTokens;
  readonly select: TanreiSelectTokens;
  readonly sideSheet: TanreiSideSheetTokens;
  readonly skeleton: TanreiSkeletonTokens;
  readonly slider: TanreiSliderTokens;
  readonly snackbar: TanreiSnackbarTokens;
  readonly stepper: TanreiStepperTokens;
  readonly steps: TanreiStepsTokens;
  readonly swatch: TanreiSwatchTokens;
  readonly switch: TanreiSwitchTokens;
  readonly tabView: TanreiTabViewTokens;
  readonly tableOfContents: TanreiTableOfContentsTokens;
  readonly table: TanreiTableTokens;
  readonly tabs: TanreiTabsTokens;
  readonly tagGroup: TanreiTagGroupTokens;
  readonly tag: TanreiTagTokens;
  readonly textInput: TanreiTextInputTokens;
  readonly timeline: TanreiTimelineTokens;
  readonly toolbar: TanreiToolbarTokens;
  readonly tooltip: TanreiTooltipTokens;
  readonly treeView: TanreiTreeViewTokens;
}

/** One design system: every token a component or primitive reads. Provide it with `<TanreiProvider system={…}>`. */
export interface TanreiSystem {
  readonly id: string;
  readonly dials: TanreiDials;
  /** Roles that come as a set of four (`x`, `onX`, `xContainer`, `onXContainer`): what a `palette` prop may name. */
  readonly intents: readonly TanreiColorRole[];
  readonly colors: TanreiColors;
  readonly typescale: TanreiTypescale;
  readonly shape: TanreiShape;
  readonly space: TanreiSpace;
  readonly state: TanreiState;
  readonly measure: TanreiMeasure;
  readonly typefaces: TanreiTypefaces;
  readonly icon: TanreiIconStyle;
  readonly behavior: TanreiBehavior;
  readonly motion: TanreiMotion;
  readonly elevation: TanreiElevation;
  readonly components: TanreiComponents;
}

// Merge anchor for the open interfaces (adds no member): keeps module augmentation independent of file order.
declare module './vocabulary' {
  interface TanreiColorRoleRegistry {}
  interface TanreiTypescale {}
  interface TanreiShape {}
  interface TanreiSpace {}
  interface TanreiState {}
  interface TanreiElevation {}
  interface TanreiDuration {}
  interface TanreiEasing {}
  interface TanreiSpringSet {}
  interface TanreiBorderMeasure {}
  interface TanreiFocusMeasure {}
  interface TanreiTargetMeasure {}
  interface TanreiIconMeasure {}
  interface TanreiBreakpointMeasure {}
  interface TanreiAccordionVariantRegistry {}
  interface TanreiAccordionDensityRegistry {}
  interface TanreiAppBarSizeRegistry {}
  interface TanreiAppBarConditionRegistry {}
  interface TanreiAvatarSizeRegistry {}
  interface TanreiAvatarShapeRegistry {}
  interface TanreiBottomSheetControlRegistry {}
  interface TanreiBreadcrumbsPartRegistry {}
  interface TanreiButtonWithMenuSizeRegistry {}
  interface TanreiButtonWithMenuVariantRegistry {}
  interface TanreiButtonSizeRegistry {}
  interface TanreiButtonVariantRegistry {}
  interface TanreiCalendarConditionRegistry {}
  interface TanreiCalloutControlRegistry {}
  interface TanreiCalloutSizeRegistry {}
  interface TanreiCalloutVariantRegistry {}
  interface TanreiCardVariantRegistry {}
  interface TanreiCarouselPartRegistry {}
  interface TanreiChatComposerConditionRegistry {}
  interface TanreiCheckboxConditionRegistry {}
  interface TanreiChipSizeRegistry {}
  interface TanreiChipVariantRegistry {}
  interface TanreiCodeBlockSizeRegistry {}
  interface TanreiCodeBlockVariantRegistry {}
  interface TanreiCodeBlockSyntaxRegistry {}
  interface TanreiComboboxVariantRegistry {}
  interface TanreiDateTimePickerConditionRegistry {}
  interface TanreiDescriptionListDensityRegistry {}
  interface TanreiEmbeddedTextInputConditionRegistry {}
  interface TanreiEmptyStateSizeRegistry {}
  interface TanreiFabMenuSizeRegistry {}
  interface TanreiFabMenuVariantRegistry {}
  interface TanreiFieldGroupSpacingRegistry {}
  interface TanreiFieldGroupConditionRegistry {}
  interface TanreiFieldConditionRegistry {}
  interface TanreiFigureVariantRegistry {}
  interface TanreiFileItemFormRegistry {}
  interface TanreiFilePickerConditionRegistry {}
  interface TanreiInputBoxSizeRegistry {}
  interface TanreiInputBoxVariantRegistry {}
  interface TanreiKeyboardShortcutSizeRegistry {}
  interface TanreiKeyboardShortcutVariantRegistry {}
  interface TanreiLinkCardVariantRegistry {}
  interface TanreiLinkVariantRegistry {}
  interface TanreiListConditionRegistry {}
  interface TanreiLoadingIndicatorSizeRegistry {}
  interface TanreiMainActionButtonSizeRegistry {}
  interface TanreiMainActionButtonVariantRegistry {}
  interface TanreiMenuConditionRegistry {}
  interface TanreiMenubarConditionRegistry {}
  interface TanreiNavigationBarConditionRegistry {}
  interface TanreiNavigationDrawerVariantRegistry {}
  interface TanreiNavigationDrawerConditionRegistry {}
  interface TanreiNavigationRailConditionRegistry {}
  interface TanreiOneTimeCodeInputConditionRegistry {}
  interface TanreiPageHeaderSizeRegistry {}
  interface TanreiPaginationPartRegistry {}
  interface TanreiProgressIndicatorSizeRegistry {}
  interface TanreiProseSizeRegistry {}
  interface TanreiRadioButtonConditionRegistry {}
  interface TanreiSearchConditionRegistry {}
  interface TanreiSegmentedButtonSizeRegistry {}
  interface TanreiSegmentedButtonConditionRegistry {}
  interface TanreiSelectVariantRegistry {}
  interface TanreiSideSheetVariantRegistry {}
  interface TanreiSliderSizeRegistry {}
  interface TanreiSliderConditionRegistry {}
  interface TanreiSnackbarControlRegistry {}
  interface TanreiStepperConditionRegistry {}
  interface TanreiStepsSizeRegistry {}
  interface TanreiSwatchSizeRegistry {}
  interface TanreiSwatchShapeRegistry {}
  interface TanreiSwitchConditionRegistry {}
  interface TanreiTableOfContentsPartRegistry {}
  interface TanreiTableOfContentsDensityRegistry {}
  interface TanreiTablePartRegistry {}
  interface TanreiTableDensityRegistry {}
  interface TanreiTabsVariantRegistry {}
  interface TanreiTabsSizeRegistry {}
  interface TanreiTagGroupSpacingRegistry {}
  interface TanreiTagSizeRegistry {}
  interface TanreiTagVariantRegistry {}
  interface TanreiTextInputVariantRegistry {}
  interface TanreiTimelineSizeRegistry {}
  interface TanreiTimelineDensityRegistry {}
  interface TanreiToolbarVariantRegistry {}
  interface TanreiTreeViewConditionRegistry {}
  interface TanreiTreeViewDensityRegistry {}
}
