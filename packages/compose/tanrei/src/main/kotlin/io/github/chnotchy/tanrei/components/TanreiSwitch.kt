package io.github.chnotchy.tanrei.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.requiredSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawOutline
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.max
import io.github.chnotchy.tanrei.primitives.TanreiLabelledControl
import io.github.chnotchy.tanrei.primitives.TanreiStateMotion
import io.github.chnotchy.tanrei.primitives.WithoutTanreiAnchorDescription
import io.github.chnotchy.tanrei.primitives.animateTanreiColorAsState
import io.github.chnotchy.tanrei.primitives.animateTanreiElevation
import io.github.chnotchy.tanrei.primitives.collectTanreiInteraction
import io.github.chnotchy.tanrei.primitives.drawTanreiInsetOutline
import io.github.chnotchy.tanrei.primitives.drawnStates
import io.github.chnotchy.tanrei.primitives.isDrawn
import io.github.chnotchy.tanrei.primitives.rememberTanreiRipple
import io.github.chnotchy.tanrei.primitives.rememberTanreiSelectionMotion
import io.github.chnotchy.tanrei.primitives.tanreiAnchorDescription
import io.github.chnotchy.tanrei.primitives.tanreiContainer
import io.github.chnotchy.tanrei.primitives.tanreiContainerShape
import io.github.chnotchy.tanrei.primitives.tanreiControlLabel
import io.github.chnotchy.tanrei.primitives.tanreiDecorationOverflow
import io.github.chnotchy.tanrei.primitives.tanreiElevation
import io.github.chnotchy.tanrei.primitives.tanreiFocusRing
import io.github.chnotchy.tanrei.primitives.tanreiGroupOpacity
import io.github.chnotchy.tanrei.primitives.tanreiHiddenLabel
import io.github.chnotchy.tanrei.primitives.tanreiInsetOutline
import io.github.chnotchy.tanrei.primitives.tanreiMinimumTouchTarget
import io.github.chnotchy.tanrei.primitives.tanreiPressInput
import io.github.chnotchy.tanrei.primitives.tanreiRippleInput
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph
import io.github.chnotchy.tanrei.theme.LocalTanreiTextStyle
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.glyph
import io.github.chnotchy.tanrei.theme.tanreiTween
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiSwitchCondition
import io.github.chnotchy.tanrei.tokens.TanreiSwitchTokens
import kotlin.math.roundToInt

/**
 * Turns one setting on or off, taking effect at once. Implements `specs/switch.spec.json`. Every design value comes
 * from the current design system's [TanreiSwitchTokens] (`TanreiTheme.tokens.switch`); the condition [checked] chooses
 * (the spec's `selected`: `unselected` or `selected`, the token axis `conditions`) is drawn in each interaction state
 * from THAT condition's and state's tokens — track, outline, handle (color, size, elevation), icon, label and the round
 * state layer (the container) that is centered on the handle and moves with it. It is [TanreiButton]'s chain on that
 * layer.
 *
 * @param checked the spec's `selected`: whether the setting is on.
 * @param onCheckedChange the spec's `change`: called exactly once per activation (pointer, touch, Space, Enter,
 *   assistive technology, a press on the label) with `!checked`. Null draws a switch that only displays: no input, no
 *   toggle semantics (the parent that handles the click announces it).
 * @param label the text that names the setting: drawn at the track's inline end and used as the accessible name.
 *   Empty, it still renders, and a debuggable app reports it (SWT-16).
 * @param modifier applied to the whole switch — track, label and the reserved minimum touch target.
 * @param enabled the Compose idiom for the spec's `disabled` (inverse). When false the switch does not change, leaves
 *   the focus order, ignores presses on its label and is announced as disabled.
 * @param labelHidden draws no label but keeps [label] as the accessible name (a switch in a row whose headline names it).
 * @param thumbContent the spec's `selectedIcon` / `unselectedIcon`, in Compose's `Switch` idiom: the glyph the handle
 *   shows NOW — the caller passes the selected glyph while [checked] and the unselected one while not, or null for none
 *   (SWT-12). While it shows one the handle is at least `handleSizeWithIcon`. The slot is laid out in a box of
 *   `iconSize`, decorative to assistive technology (SWT-14), and given [LocalTanreiContentColor] (the icon color of
 *   the condition and state), [LocalTanreiIconGlyph] (the family, fill, weight and optical size of the selection) and
 *   a [LocalTanreiTextStyle] that draws one glyph of the icon font at the box's size — as [TanreiIconButton]'s icon.
 * @param interactionSource hoist to observe or drive hover, focus and press.
 */
@Composable
public fun TanreiSwitch(
    checked: Boolean,
    onCheckedChange: ((Boolean) -> Unit)?,
    label: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    labelHidden: Boolean = false,
    thumbContent: (@Composable () -> Unit)? = null,
    interactionSource: MutableInteractionSource? = null,
) {
    val source = interactionSource ?: remember { MutableInteractionSource() }
    val system = TanreiTheme.tokens
    val tokens = system.switch
    // SWT-16: still rendered and still working without a name; reported in debuggable apps.
    val visibleLabel = tanreiControlLabel("TanreiSwitch", label, labelHidden)

    // The condition `checked` chooses. Chosen once, here.
    val condition = if (checked) TanreiSwitchCondition.Selected else TanreiSwitchCondition.Unselected
    val conditionTokens = tokens.conditions[condition]

    // SWT-3 / SWT-6: one interaction state wins. SWT-7: a press counts from the first frame and for press-hold.
    val interaction = source.collectTanreiInteraction(enabled)
    // SWT-8: the pressed tokens say WHAT a press looks like; `pressed-feedback` says how it arrives.
    val feedback = system.behavior.pressedFeedback
    val drawnStates = interaction.drawnStates(feedback)
    val drawn = conditionTokens[drawnStates.content]

    // The state layer and the label move with the interaction; the track, outline, handle and icon with the condition
    // (SWT-13) — also the handle's size, which a system may change under a press (m3-like), where it snaps in.
    val stateMotion = TanreiStateMotion(interaction.state, tokens.motionStateDuration, tokens.motionStateEasing)
    val selectionMotion = rememberTanreiSelectionMotion(condition, stateMotion, tokens.motionSelectionDuration, tokens.motionSelectionEasing)
    val containerColor = animateTanreiColorAsState(conditionTokens[drawnStates.container].containerColor.color, stateMotion, label = "container")
    val trackColor = animateTanreiColorAsState(drawn.trackColor.color, selectionMotion, label = "track")
    val outlineColor = animateTanreiColorAsState(drawn.outlineColor.color, selectionMotion, label = "outline")
    val handleColor = animateTanreiColorAsState(drawn.handleColor.color, selectionMotion, label = "handle")
    val iconColor by animateTanreiColorAsState(drawn.iconColor.color, selectionMotion, label = "icon")
    val labelColor by animateTanreiColorAsState(drawn.labelColor.color, stateMotion, label = "label")
    val opacity = animateFloatAsState(tokens.opacity(drawnStates.content), stateMotion.spec(), label = "opacity")
    val containerCorner by animateDpAsState(tokens.containerShape(drawnStates.content), stateMotion.spec(), label = "shape")
    // SWT-12: while the handle shows a glyph it is at least `handleSizeWithIcon`.
    val handleTarget = if (thumbContent != null) max(drawn.handleSize, tokens.handleSizeWithIcon) else drawn.handleSize
    val handleSize by animateDpAsState(handleTarget, selectionMotion.spec(), label = "handle size")
    val handleElevation = animateTanreiElevation(drawn.handleElevation, selectionMotion.spec())
    // SWT-9: the track's and the container's corners ease by the system's corner smoothing.
    val smoothing = system.shape.cornerSmoothing
    val containerShape = remember(containerCorner, smoothing) { tanreiContainerShape(containerCorner, smoothing) }

    // SWT-8, ripple: the pressed container color of THIS condition, grown from the point of contact.
    val ripple = rememberTanreiRipple(
        feedback = feedback,
        interaction = interaction,
        color = conditionTokens.pressed.containerColor.color,
        feedbackDurationMillis = tokens.motionFeedbackDuration,
        stateDurationMillis = tokens.motionStateDuration,
        stateEasing = tokens.motionStateEasing,
        // A press on the label, outside the round container, grows it from the container's center.
        centerOutsideContainer = true,
    )

    // SWT-10 / SWT-13: where the handle is, 0 at the inline start (off) and 1 at the inline end (on), travelling over
    // the selection duration and easing (the spatial spring's curve, which overshoots a little). Reduced motion: at once.
    val travel = remember { Animatable(if (checked) 1f else 0f) }
    LaunchedEffect(checked) { travel.animateTo(if (checked) 1f else 0f, tanreiTween(tokens.motionSelectionDuration, tokens.motionSelectionEasing)) }

    // SWT-12: the glyph of the selection, at the icon size, through THE icon helper.
    val glyph = system.icon.glyph(tokens.iconSize, selected = checked)

    // SWT-1 / SWT-2 / SWT-14: role switch with on / off, Space and Enter toggle, disabled leaves the focus order. The
    // whole row is the input: a press on the track or the label toggles.
    val input = if (onCheckedChange != null) {
        Modifier.toggleable(
            value = checked,
            interactionSource = source,
            indication = null, // No Indication: the feedback is drawn below, inside the container, from Tanrei's tokens.
            enabled = enabled,
            role = Role.Switch,
            onValueChange = onCheckedChange,
        )
    } else {
        Modifier
    }

    // The container reaches past the track by half their difference; the group opacity must dim it, not clip it.
    val overflow = max(tanreiDecorationOverflow(system, drawn.handleElevation), (tokens.containerSize - tokens.trackHeight) / 2)
    val row = modifier
        .tanreiAnchorDescription()
        .tanreiHiddenLabel(label, labelHidden)
        .then(input)
        // SWT-7: the pointer press itself, heard at once.
        .tanreiPressInput(interaction.press, enabled && onCheckedChange != null)
        .tanreiRippleInput(ripple)
        // SWT-5: at least the touch target on both axes, the visual size unchanged.
        .tanreiMinimumTouchTarget()
        .tanreiGroupOpacity(overflow = overflow) { opacity.value }

    TanreiLabelledControl(
        modifier = row,
        label = visibleLabel,
        gap = tokens.labelGap,
        style = tokens.labelTypescale.toTextStyle(),
        color = labelColor,
        controlHeight = tokens.trackHeight,
    ) {
        val trackCorner = tokens.trackShape
        // The layout box is the track (SWT-10): the round layer around the handle is placed on it without being
        // measured into it, so it may reach past the track and never moves the label.
        Layout(
            content = {
                Box(
                    modifier = Modifier
                        .tanreiContainer(containerShape, containerColor = { containerColor.value }, outlineColor = Color.Transparent, outlineWidth = tokens.outlineWidth, ripple = ripple)
                        .size(tokens.containerSize),
                    contentAlignment = Alignment.Center,
                ) {
                    Box(
                        modifier = Modifier
                            .requiredSize(handleSize)
                            .tanreiElevation(handleElevation, CircleShape)
                            .drawWithCache {
                                val outline = CircleShape.createOutline(size, layoutDirection, this)
                                onDrawBehind { handleColor.value.let { if (it.isDrawn) drawOutline(outline, it) } }
                            },
                        contentAlignment = Alignment.Center,
                    ) {
                        if (thumbContent != null) {
                            CompositionLocalProvider(
                                LocalTanreiContentColor provides iconColor,
                                LocalTanreiIconGlyph provides glyph,
                                LocalTanreiTextStyle provides glyph.toTextStyle(tokens.iconSize),
                            ) {
                                // SWT-14: decorative; on and off are announced from the state, never from the glyph.
                                Box(Modifier.size(tokens.iconSize).clearAndSetSemantics {}, contentAlignment = Alignment.Center) { WithoutTanreiAnchorDescription(thumbContent) }
                            }
                        }
                    }
                }
            },
            modifier = Modifier
                // SWT-4: around the track, never animated.
                .tanreiFocusRing(source, cornerRadius = trackCorner)
                .size(tokens.trackWidth, tokens.trackHeight)
                .drawWithCache {
                    val shape = tanreiInsetOutline(size, trackCorner.toPx(), smoothing, tokens.outlineWidth.toPx())
                    onDrawBehind { drawTanreiInsetOutline(shape, fill = trackColor.value, outline = outlineColor.value) }
                },
        ) { measurables, constraints ->
            val side = tokens.containerSize.roundToPx()
            val layer = measurables.single().measure(Constraints.fixed(side, side))
            layout(constraints.minWidth, constraints.minHeight) {
                // The handle's center is half the track height from the end it rests at (SWT-10), mirrored in
                // right-to-left (SWT-11); read here, so its travel re-places without recomposing.
                val inset = constraints.minHeight / 2f
                val along = inset + (constraints.minWidth - 2 * inset) * travel.value
                val x = if (layoutDirection == LayoutDirection.Ltr) along else constraints.minWidth - along
                layer.place((x - side / 2f).roundToInt(), ((constraints.minHeight - side) / 2f).roundToInt())
            }
        }
    }
}
