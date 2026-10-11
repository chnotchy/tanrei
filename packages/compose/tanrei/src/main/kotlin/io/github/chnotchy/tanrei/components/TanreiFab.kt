package io.github.chnotchy.tanrei.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import io.github.chnotchy.tanrei.primitives.TanreiReportMissingName
import io.github.chnotchy.tanrei.primitives.TanreiReportUnknownValue
import io.github.chnotchy.tanrei.primitives.TanreiStateMotion
import io.github.chnotchy.tanrei.primitives.WithoutTanreiAnchorDescription
import io.github.chnotchy.tanrei.primitives.animateTanreiColorAsState
import io.github.chnotchy.tanrei.primitives.animateTanreiElevation
import io.github.chnotchy.tanrei.primitives.collectTanreiInteraction
import io.github.chnotchy.tanrei.primitives.drawnStates
import io.github.chnotchy.tanrei.primitives.rememberTanreiRipple
import io.github.chnotchy.tanrei.primitives.tanreiAnchorDescription
import io.github.chnotchy.tanrei.primitives.tanreiContainer
import io.github.chnotchy.tanrei.primitives.tanreiContainerShape
import io.github.chnotchy.tanrei.primitives.tanreiDecorationOverflow
import io.github.chnotchy.tanrei.primitives.tanreiElevation
import io.github.chnotchy.tanrei.primitives.tanreiFocusRing
import io.github.chnotchy.tanrei.primitives.tanreiGroupOpacity
import io.github.chnotchy.tanrei.primitives.tanreiMinimumTouchTarget
import io.github.chnotchy.tanrei.primitives.tanreiPressInput
import io.github.chnotchy.tanrei.primitives.tanreiRippleInput
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph
import io.github.chnotchy.tanrei.theme.LocalTanreiTextStyle
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.glyph
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiFabSize
import io.github.chnotchy.tanrei.tokens.TanreiFabTokens
import io.github.chnotchy.tanrei.tokens.TanreiFabVariant

/**
 * Performs the single most important action of a screen with one icon on a raised container that floats above the
 * content. Implements `specs/fab.spec.json`. Every design value comes from the current design system's
 * [TanreiFabTokens] (`TanreiTheme.tokens.fab`), and each interaction state is drawn from THAT state's tokens — the
 * elevation included: the component never computes how hovered, focused, pressed or disabled looks. It is
 * [TanreiButton]'s chain — press, ripple, focus ring, target, elevation, container, corner shape — with the FAB's own
 * tokens, and [TanreiIconButton]'s icon slot.
 *
 * The FAB does not position itself (FAB-13): put it where the screen layout wants it — the inline-end bottom corner of
 * a `Box`, or a scaffold's `floatingActionButton` slot — clear of any navigation bar. It draws no scrim and moves no
 * content.
 *
 * @param onClick called exactly once per activation (pointer, touch, Enter/Space, accessibility click).
 * @param contentDescription the accessible name (the spec's `label`). Required: an icon alone is not a name. An empty
 *   one still renders, and a debuggable app reports it (FAB-14).
 * @param modifier applied to the whole button, including the reserved minimum touch target.
 * @param variant emphasis: a key of `tokens.fab.variants`. [TanreiFabVariant.Filled] (the default) is the screen's
 *   main action at full strength, [TanreiFabVariant.Tonal] quieter, [TanreiFabVariant.Surface] a neutral container
 *   over colored content. The set is open: a design system may add values.
 * @param size the visual square: a key of `tokens.fab.sizes` (`Small`, `Medium`, `Large`); the hit area is extended to
 *   `sys.target` on both axes without changing it. Open as well. A [variant] or [size] the current design system does
 *   not have draws with the default value's tokens, and a debuggable app reports it (FAB-7).
 * @param enabled the Compose idiom for the spec's `disabled` (inverse). When false the button does not fire, leaves
 *   the focus order and is announced as disabled. Hiding a FAB whose action is unavailable is usually better.
 * @param interactionSource hoist to observe or drive hover, focus and press.
 * @param icon the icon slot: one glyph of the system's icon set, decorative to assistive technology. It is laid out
 *   in a box of the size's `iconSize` and gets [LocalTanreiContentColor] (the icon color of the state),
 *   [LocalTanreiIconGlyph] (the unselected glyph: family, fill, weight and optical size) and a [LocalTanreiTextStyle]
 *   that draws a ligature of the icon font at the box's size — so `TanreiText("add")` here is the icon.
 */
@Composable
public fun TanreiFloatingActionButton(
    onClick: () -> Unit,
    contentDescription: String,
    modifier: Modifier = Modifier,
    variant: TanreiFabVariant = TanreiFabVariant.Filled,
    size: TanreiFabSize = TanreiFabSize.Medium,
    enabled: Boolean = true,
    interactionSource: MutableInteractionSource? = null,
    icon: @Composable () -> Unit,
) {
    val source = interactionSource ?: remember { MutableInteractionSource() }
    val system = TanreiTheme.tokens
    val tokens = system.fab
    // FAB-7: both lookups are total — a value this design system does not have reads the default value's tokens.
    val metrics = tokens.sizes[size]
    if (size !in tokens.sizes) TanreiReportUnknownValue(system.id, "TanreiFloatingActionButton", "size", size.key)
    if (variant !in tokens.variants) TanreiReportUnknownValue(system.id, "TanreiFloatingActionButton", "variant", variant.key)
    // FAB-14: still rendered and still working; reported in debuggable apps.
    val named = contentDescription.isNotBlank()
    if (!named) TanreiReportMissingName("TanreiFloatingActionButton", "contentDescription")

    // FAB-3 / FAB-6: one state wins. FAB-8: a press counts from the first frame and for at least `duration.press-hold`.
    val interaction = source.collectTanreiInteraction(enabled)
    val state = interaction.state
    // FAB-9: the pressed tokens say WHAT a press looks like; `pressed-feedback` says how it arrives — which state the
    // container color and the rest draw from. Nothing here knows which design system is active.
    val feedback = system.behavior.pressedFeedback
    val drawnStates = interaction.drawnStates(feedback)
    val palette = tokens.variants[variant]
    val drawn = palette[drawnStates.content]

    // FAB-12: entering pressed is immediate; every other change — colors, opacity and the shadow — moves with the FAB's
    // state duration and easing (and at once where motion is reduced: Compose scales every animation by the animator
    // duration scale).
    val motion = TanreiStateMotion(state, tokens.motionStateDuration, tokens.motionStateEasing)
    val containerColor = animateTanreiColorAsState(palette[drawnStates.container].containerColor.color, motion, label = "container")
    val iconColor by animateTanreiColorAsState(drawn.iconColor.color, motion, label = "icon")
    val opacity = animateFloatAsState(tokens.opacity(drawnStates.content), motion.spec(), label = "opacity")
    val elevation = animateTanreiElevation(drawn.containerElevation, motion.spec())
    // FAB-10 / FAB-11: the size's own corner (a larger FAB keeps the same proportion of rounding), eased by the
    // system's `corner-smoothing` amount (0 a quarter circle, 0.6 the iOS corner). A FAB does not change shape per state.
    val cornerRadius = metrics.containerShape
    val cornerSmoothing = system.shape.cornerSmoothing
    val shape = remember(cornerRadius, cornerSmoothing) { tanreiContainerShape(cornerRadius, cornerSmoothing) }

    // FAB-9, ripple: the pressed container color as a circle that grows from the point of contact over the FAB's
    // feedback duration and fades over its state duration, both with its state easing. Null unless the system ripples.
    val ripple = rememberTanreiRipple(
        feedback = feedback,
        interaction = interaction,
        color = palette.pressed.containerColor.color,
        feedbackDurationMillis = tokens.motionFeedbackDuration,
        stateDurationMillis = tokens.motionStateDuration,
        stateEasing = tokens.motionStateEasing,
    )

    // FAB-11: an unselected glyph at the size's icon size, through THE icon helper (family, fill, weight, optical size
    // clamped to `sys.icon.optical-size`). A FAB has no selection.
    val glyph = system.icon.glyph(metrics.iconSize, selected = false)

    // Order is load-bearing: the name and the input first, so the hit area and a11y bounds cover the touch target
    // (FAB-5), then the target reservation, then everything visual at the container's own size — the shadow (FAB-12)
    // drawn outside it, never clipped: nothing in this chain clips, and the group opacity dims the overflow instead.
    val container = modifier
        // A badge (or another decorating component) wrapping this FAB adds its description here, on the node that is
        // announced.
        .tanreiAnchorDescription()
        .then(if (named) Modifier.semantics { this.contentDescription = contentDescription } else Modifier)
        // FAB-1 / FAB-2: a button; disabled leaves the focus order and is announced as disabled.
        .clickable(
            interactionSource = source,
            indication = null, // No Indication: the feedback is drawn below, inside the container, from Tanrei's tokens.
            enabled = enabled,
            role = Role.Button,
            onClick = onClick,
        )
        // FAB-8: the pointer press itself, heard at once — `clickable` holds its own back inside a scrolling container.
        .tanreiPressInput(interaction.press, enabled)
        .tanreiRippleInput(ripple)
        .tanreiMinimumTouchTarget()
        .tanreiGroupOpacity(overflow = tanreiDecorationOverflow(system, drawn.containerElevation)) { opacity.value }
        // FAB-4: never animated.
        .tanreiFocusRing(source, cornerRadius = cornerRadius)
        .tanreiElevation(elevation, shape)
        // No outline part: a floating, shadowed container needs no border.
        .tanreiContainer(shape, containerColor = { containerColor.value }, outlineColor = Color.Transparent, outlineWidth = Dp.Hairline, ripple = ripple)
        // FAB-11: a square of the size's side. An icon is not text: a larger text size does not grow it.
        .size(metrics.containerSize)

    Box(modifier = container, contentAlignment = Alignment.Center) {
        CompositionLocalProvider(
            LocalTanreiContentColor provides iconColor,
            LocalTanreiIconGlyph provides glyph,
            LocalTanreiTextStyle provides glyph.toTextStyle(metrics.iconSize),
        ) {
            // The icon is decorative: the button's name is contentDescription, never the glyph's ligature.
            Box(Modifier.size(metrics.iconSize).clearAndSetSemantics {}, contentAlignment = Alignment.Center) { WithoutTanreiAnchorDescription(icon) }
        }
    }
}
