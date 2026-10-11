package io.github.chnotchy.tanrei.components

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.Dp
import io.github.chnotchy.tanrei.primitives.LocalTanreiJoinedRow
import io.github.chnotchy.tanrei.primitives.TanreiJoinedShape
import io.github.chnotchy.tanrei.primitives.TanreiReportUnknownValue
import io.github.chnotchy.tanrei.primitives.WithoutTanreiJoinedRow
import io.github.chnotchy.tanrei.primitives.WithoutTanreiRovingGroup
import io.github.chnotchy.tanrei.primitives.currentTanreiRovingGroup
import io.github.chnotchy.tanrei.primitives.rememberTanreiRovingEntry
import io.github.chnotchy.tanrei.primitives.tanreiRovingItem
import io.github.chnotchy.tanrei.primitives.rememberTanreiJoinedItem
import io.github.chnotchy.tanrei.primitives.tanreiJoinedTarget
import io.github.chnotchy.tanrei.primitives.TanreiStateMotion
import io.github.chnotchy.tanrei.primitives.WithoutTanreiAnchorDescription
import io.github.chnotchy.tanrei.primitives.TanreiText
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
import io.github.chnotchy.tanrei.primitives.tanreiPressInput
import io.github.chnotchy.tanrei.primitives.tanreiRippleInput
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiTextStyle
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiButtonTokens
import io.github.chnotchy.tanrei.tokens.TanreiButtonVariant

/**
 * Lets people take an action or make a choice with one tap or click.
 * Implements `specs/button.spec.json`. Every design value comes from the current design system's
 * [TanreiButtonTokens] (`TanreiTheme.tokens.button`), and each interaction state is drawn from THAT
 * state's tokens: the component never computes how hovered, focused, pressed or disabled looks.
 *
 * @param onClick called exactly once per activation (pointer, touch, Enter/Space, accessibility click).
 * @param modifier applied to the whole button, including the reserved minimum touch target.
 * @param variant emphasis level: a key of `tokens.button.variants`. Use one [TanreiButtonVariant.Filled] button
 *   per view for the main action. The set is open: a design system may add values.
 * @param size visual height: a key of `tokens.button.sizes`; the hit area is extended to `sys.target` without
 *   changing it. The set is open as well. A [variant] or [size] the current design system does not have draws
 *   with the default value's tokens, and a debuggable app reports it (BTN-7).
 * @param enabled the Compose idiom for the spec's `disabled` (inverse). When false the button does
 *   not fire, leaves the focus order and is announced as disabled.
 * @param icon optional leading icon slot, sized by the `icon.size` token. Icon-only use belongs to
 *   icon-button, not button.
 * @param interactionSource hoist to observe or drive hover, focus and press.
 * @param content the label slot. Text placed here (for example [TanreiText]) picks up the label
 *   typescale and color.
 */
@Composable
public fun TanreiButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: TanreiButtonVariant = TanreiButtonVariant.Filled,
    size: TanreiButtonSize = TanreiButtonSize.Medium,
    enabled: Boolean = true,
    icon: (@Composable () -> Unit)? = null,
    interactionSource: MutableInteractionSource? = null,
    content: @Composable RowScope.() -> Unit,
) {
    val source = interactionSource ?: remember { MutableInteractionSource() }
    val system = TanreiTheme.tokens
    val tokens = system.button
    // BTN-7: both lookups are total — a value this design system does not have reads the default value's tokens.
    val metrics = tokens.sizes[size]
    if (size !in tokens.sizes) TanreiReportUnknownValue(system.id, "TanreiButton", "size", size.key)
    if (variant !in tokens.variants) TanreiReportUnknownValue(system.id, "TanreiButton", "variant", variant.key)

    // BTN-3 / BTN-6: one state wins. BTN-8: a press counts from the first frame and for at least `duration.press-hold`.
    val interaction = source.collectTanreiInteraction(enabled)
    val state = interaction.state
    // BTN-9: the pressed tokens say WHAT a press looks like; `pressed-feedback` says how it arrives — which state the
    // container color and the rest draw from (`TanreiDrawnStates`). Nothing here knows which design system is active.
    val feedback = system.behavior.pressedFeedback
    val drawnStates = interaction.drawnStates(feedback)
    val palette = tokens.variants[variant]
    val drawn = palette[drawnStates.content]

    // Entering pressed is immediate; every other change moves with the button's state duration and easing.
    val motion = TanreiStateMotion(state, tokens.motionStateDuration, tokens.motionStateEasing)
    val containerColor = animateTanreiColorAsState(palette[drawnStates.container].containerColor.color, motion, label = "container")
    val labelColor by animateTanreiColorAsState(drawn.labelColor.color, motion, label = "label")
    val outlineColor by animateTanreiColorAsState(drawn.outlineColor.color, motion, label = "outline")
    val opacity = animateFloatAsState(tokens.opacity(drawnStates.content), motion.spec(), label = "opacity")
    val cornerRadius by animateDpAsState(tokens.containerShape(drawnStates.content), motion.spec(), label = "shape")
    // The shadow moves between states with the same duration and easing as the container color.
    val elevation = animateTanreiElevation(drawn.containerElevation, motion.spec())
    // BTN-10: the corners ease by the system's `corner-smoothing` amount (0 a quarter circle, 0.6 the iOS corner).
    val cornerSmoothing = system.shape.cornerSmoothing
    // BTN-10, BGR-2, BGR-3: inside a button group — an internal channel, not the button's public surface — a connected
    // group gives the corners that face a neighbour its inner radius and makes the button at least a target wide.
    val row = LocalTanreiJoinedRow.current
    val joined = rememberTanreiJoinedItem()?.also { it.shrinkable = true }
    val connected = joined != null && row?.connected == true
    val innerRadius = row?.innerRadius ?: cornerRadius
    val shape = if (joined != null && connected) {
        remember(joined, cornerRadius, innerRadius, cornerSmoothing) { TanreiJoinedShape(joined, cornerRadius, innerRadius, cornerSmoothing) }
    } else {
        remember(cornerRadius, cornerSmoothing) { tanreiContainerShape(cornerRadius, cornerSmoothing) }
    }
    // TBR-10: inside a toolbar — an internal channel, not the public surface — the button is one of the toolbar's items:
    // one Tab stop for all of them, the arrow keys moving among those that are enabled. Null outside one.
    val roving = currentTanreiRovingGroup()
    val rovingEntry = rememberTanreiRovingEntry(roving, focusable = enabled, enabled = enabled, selected = false, text = "")
    val restingRadius = tokens.containerShape(drawnStates.content)
    val ringStart = if (connected && joined?.innerStart == true) innerRadius else restingRadius
    val ringEnd = if (connected && joined?.innerEnd == true) innerRadius else restingRadius

    // BTN-9, ripple: the pressed container color as a circle that grows from the point of contact over the
    // component's feedback duration and fades over its state duration, both with its state easing — the same pair
    // the web, React Native, SwiftUI and Flutter use. Null unless the system ripples.
    val ripple = rememberTanreiRipple(
        feedback = feedback,
        interaction = interaction,
        color = palette.pressed.containerColor.color,
        feedbackDurationMillis = tokens.motionFeedbackDuration,
        stateDurationMillis = tokens.motionStateDuration,
        stateEasing = tokens.motionStateEasing,
    )

    // Order is load-bearing: input first so the hit area and a11y bounds cover the touch target,
    // then the target reservation, then everything visual at the container's own size.
    val container = modifier
        // A badge (or another decorating component) wrapping this button adds its description here, on the node that
        // is announced (BDG-8).
        .tanreiAnchorDescription()
        .tanreiRovingItem(roving, rovingEntry, focusable = enabled)
        .clickable(
            interactionSource = source,
            indication = null, // No Indication: the feedback is drawn below, inside the container, from Tanrei's tokens.
            enabled = enabled,
            role = Role.Button,
            onClick = onClick,
        )
        // BTN-8: the pointer press itself, heard at once — `clickable` holds its own back inside a scrolling container.
        .tanreiPressInput(interaction.press, enabled)
        .tanreiRippleInput(ripple)
        .tanreiJoinedTarget(joined)
        .tanreiGroupOpacity(overflow = tanreiDecorationOverflow(system, drawn.containerElevation)) { opacity.value }
        // Never animated: the ring follows the state's own shape, not the shape in transition.
        .tanreiFocusRing(source, cornerRadius = ringStart, endCornerRadius = ringEnd)
        .tanreiElevation(elevation, shape)
        .tanreiContainer(shape, containerColor = { containerColor.value }, outlineColor = outlineColor, outlineWidth = metrics.outlineWidth, ripple = ripple)
        // A minimum, not a fixed height: at large text sizes the container grows, the label never truncates.
        .defaultMinSize(minWidth = if (connected) row?.minWidth ?: Dp.Unspecified else Dp.Unspecified, minHeight = metrics.containerHeight)
        .padding(
            start = if (icon != null) metrics.containerPaddingInlineStartWithIcon else metrics.containerPaddingInlineStart,
            top = metrics.containerPaddingBlock,
            end = metrics.containerPaddingInlineEnd,
            bottom = metrics.containerPaddingBlock,
        )

    CompositionLocalProvider(
        LocalTanreiContentColor provides labelColor,
        LocalTanreiTextStyle provides metrics.labelTypescale.toTextStyle(),
    ) {
        Row(
            modifier = container,
            horizontalArrangement = Arrangement.spacedBy(metrics.containerGap, Alignment.CenterHorizontally),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            WithoutTanreiAnchorDescription {
                WithoutTanreiJoinedRow {
                    WithoutTanreiRovingGroup {
                        if (icon != null) {
                            Box(Modifier.size(metrics.iconSize), contentAlignment = Alignment.Center) { icon() }
                        }
                        content()
                    }
                }
            }
        }
    }
}

/** [TanreiButton] with a plain text label. */
@Composable
public fun TanreiButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: TanreiButtonVariant = TanreiButtonVariant.Filled,
    size: TanreiButtonSize = TanreiButtonSize.Medium,
    enabled: Boolean = true,
    icon: (@Composable () -> Unit)? = null,
    interactionSource: MutableInteractionSource? = null,
) {
    TanreiButton(
        onClick = onClick,
        modifier = modifier,
        variant = variant,
        size = size,
        enabled = enabled,
        icon = icon,
        interactionSource = interactionSource,
    ) {
        TanreiText(text)
    }
}
