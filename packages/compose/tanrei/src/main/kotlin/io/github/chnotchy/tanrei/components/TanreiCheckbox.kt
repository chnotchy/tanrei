package io.github.chnotchy.tanrei.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.triStateToggleable
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.error
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.state.ToggleableState
import io.github.chnotchy.tanrei.R
import io.github.chnotchy.tanrei.primitives.TanreiLabelledControl
import io.github.chnotchy.tanrei.primitives.TanreiStateMotion
import io.github.chnotchy.tanrei.primitives.animateTanreiColorAsState
import io.github.chnotchy.tanrei.primitives.collectTanreiInteraction
import io.github.chnotchy.tanrei.primitives.drawTanreiInsetOutline
import io.github.chnotchy.tanrei.primitives.drawnStates
import io.github.chnotchy.tanrei.primitives.isDrawn
import io.github.chnotchy.tanrei.primitives.tanreiCheckPath
import io.github.chnotchy.tanrei.primitives.rememberTanreiRipple
import io.github.chnotchy.tanrei.primitives.rememberTanreiSelectionMotion
import io.github.chnotchy.tanrei.primitives.tanreiAnchorDescription
import io.github.chnotchy.tanrei.primitives.tanreiContainer
import io.github.chnotchy.tanrei.primitives.tanreiContainerShape
import io.github.chnotchy.tanrei.primitives.tanreiControlLabel
import io.github.chnotchy.tanrei.primitives.tanreiDecorationOverflow
import io.github.chnotchy.tanrei.primitives.tanreiFocusRing
import io.github.chnotchy.tanrei.primitives.tanreiGroupOpacity
import io.github.chnotchy.tanrei.primitives.tanreiHiddenLabel
import io.github.chnotchy.tanrei.primitives.tanreiInsetOutline
import io.github.chnotchy.tanrei.primitives.tanreiMinimumTouchTarget
import io.github.chnotchy.tanrei.primitives.tanreiPressInput
import io.github.chnotchy.tanrei.primitives.tanreiRippleInput
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.tanreiTween
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiCheckboxCondition
import io.github.chnotchy.tanrei.tokens.TanreiCheckboxTokens
import io.github.chnotchy.tanrei.tokens.TanreiShadowLayer

/**
 * Turns one independent choice on or off. Implements `specs/checkbox.spec.json`. Every design value comes from the
 * current design system's [TanreiCheckboxTokens] (`TanreiTheme.tokens.checkbox`); the condition its props select
 * (CHK-4: unselected, selected, indeterminate, and their `error-` forms — the token axis `conditions`) is drawn in each
 * interaction state from THAT condition's and state's tokens. It is [TanreiButton]'s chain — press and press-hold,
 * pressed feedback and ripple, keyboard focus ring, minimum target, corner smoothing — on a round state layer (the
 * container) behind a box.
 *
 * @param checked whether the choice is on.
 * @param onCheckedChange the spec's `change`: called exactly once per activation (pointer, touch, Space, Enter,
 *   assistive technology, a press on the label) with `!checked`. Null draws a checkbox that only displays: no input,
 *   no toggle semantics (the parent that handles the click announces it).
 * @param label the text that names the choice: drawn at the box's inline end and used as the accessible name. Empty,
 *   it still renders, and a debuggable app reports it (CHK-16).
 * @param modifier applied to the whole checkbox — box, label and the reserved minimum touch target.
 * @param enabled the Compose idiom for the spec's `disabled` (inverse). When false the checkbox does not change, leaves
 *   the focus order, ignores presses on its label and is announced as disabled.
 * @param isError the spec's `error`: draws the `error-` form of the condition and exposes the error semantics. The
 *   reason belongs to the surrounding form.
 * @param labelHidden draws no label but keeps [label] as the accessible name (a row-selection checkbox in a table).
 * @param interactionSource hoist to observe or drive hover, focus and press.
 */
@Composable
public fun TanreiCheckbox(
    checked: Boolean,
    onCheckedChange: ((Boolean) -> Unit)?,
    label: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isError: Boolean = false,
    labelHidden: Boolean = false,
    interactionSource: MutableInteractionSource? = null,
) {
    TanreiCheckbox(
        state = ToggleableState(checked),
        onClick = onCheckedChange?.let { change -> { change(!checked) } },
        label = label,
        modifier = modifier,
        enabled = enabled,
        isError = isError,
        labelHidden = labelHidden,
        interactionSource = interactionSource,
    )
}

/**
 * [TanreiCheckbox] for a parent choice that can be partly on, in Compose's `TriStateCheckbox` idiom: [state] is
 * `On`, `Off` or `Indeterminate` (the spec's `indeterminate`, which wins over checked for what is drawn and
 * announced). The caller computes the next state in [onClick]; CHK-2 says activating an indeterminate checkbox makes
 * it `On`.
 *
 * @param onClick called exactly once per activation. Null: a checkbox that only displays.
 */
@Composable
public fun TanreiCheckbox(
    state: ToggleableState,
    onClick: (() -> Unit)?,
    label: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isError: Boolean = false,
    labelHidden: Boolean = false,
    interactionSource: MutableInteractionSource? = null,
) {
    val source = interactionSource ?: remember { MutableInteractionSource() }
    val system = TanreiTheme.tokens
    val tokens = system.checkbox
    // CHK-16: still rendered and still working without a name; reported in debuggable apps.
    val visibleLabel = tanreiControlLabel("TanreiCheckbox", label, labelHidden)

    // CHK-4: the condition the props select — indeterminate wins over checked, error prefixes it. Chosen once, here.
    val condition = checkboxCondition(state, isError)
    val conditionTokens = tokens.conditions[condition]

    // CHK-5 / CHK-8: one interaction state wins. CHK-9: a press counts from the first frame and for press-hold.
    val interaction = source.collectTanreiInteraction(enabled)
    // CHK-10: the pressed tokens say WHAT a press looks like; `pressed-feedback` says how it arrives.
    val feedback = system.behavior.pressedFeedback
    val drawnStates = interaction.drawnStates(feedback)
    val drawn = conditionTokens[drawnStates.content]

    // The state layer and the label move with the interaction: the state duration, a press snapping in. The box, the
    // outline and the mark move with the condition: over the selection duration and easing when it changes (CHK-13).
    // Reduced motion: both at once (the animator duration scale).
    val stateMotion = TanreiStateMotion(interaction.state, tokens.motionStateDuration, tokens.motionStateEasing)
    val selectionMotion = rememberTanreiSelectionMotion(condition, stateMotion, tokens.motionSelectionDuration, tokens.motionSelectionEasing)
    val containerColor = animateTanreiColorAsState(conditionTokens[drawnStates.container].containerColor.color, stateMotion, label = "container")
    val boxColor = animateTanreiColorAsState(drawn.boxColor.color, selectionMotion, label = "box")
    val outlineColor = animateTanreiColorAsState(drawn.outlineColor.color, selectionMotion, label = "outline")
    val markColor = animateTanreiColorAsState(drawn.markColor.color, selectionMotion, label = "mark")
    val labelColor by animateTanreiColorAsState(drawn.labelColor.color, stateMotion, label = "label")
    val opacity = animateFloatAsState(tokens.opacity(drawnStates.content), stateMotion.spec(), label = "opacity")
    val containerCorner by animateDpAsState(tokens.containerShape(drawnStates.content), stateMotion.spec(), label = "shape")
    // CHK-11: the container's and the box's corners ease by the system's corner smoothing.
    val smoothing = system.shape.cornerSmoothing
    val containerShape = remember(containerCorner, smoothing) { tanreiContainerShape(containerCorner, smoothing) }

    // CHK-10, ripple: the pressed container color of THIS condition, grown from the point of contact.
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

    // CHK-12 / CHK-13: the mark, drawn along its path (a check) or grown from its center (a dash), and undrawn.
    val mark = rememberCheckboxMark(checkboxMarkOf(state), tokens)

    // CHK-1 / CHK-3 / CHK-14: role checkbox with on / off / mixed, Space and Enter activate, disabled leaves the focus
    // order. The whole row is the input: a press on the label toggles too.
    val input = if (onClick != null) {
        Modifier.triStateToggleable(
            state = state,
            interactionSource = source,
            indication = null, // No Indication: the feedback is drawn below, inside the container, from Tanrei's tokens.
            enabled = enabled,
            role = Role.Checkbox,
            onClick = onClick,
        )
    } else {
        Modifier
    }
    val invalid = stringResource(R.string.tanrei_invalid)

    val row = modifier
        .tanreiAnchorDescription()
        .tanreiHiddenLabel(label, labelHidden)
        .then(if (isError) Modifier.semantics { error(invalid) } else Modifier)
        .then(input)
        // CHK-9: the pointer press itself, heard at once.
        .tanreiPressInput(interaction.press, enabled && onClick != null)
        .tanreiRippleInput(ripple)
        // CHK-7: at least the touch target on both axes, the visual size unchanged.
        .tanreiMinimumTouchTarget()
        .tanreiGroupOpacity(overflow = tanreiDecorationOverflow(system, NoElevation)) { opacity.value }

    TanreiLabelledControl(
        modifier = row,
        label = visibleLabel,
        gap = tokens.labelGap,
        style = tokens.labelTypescale.toTextStyle(),
        color = labelColor,
        controlHeight = tokens.containerSize,
    ) {
        // The round state layer: it carries hover, focus and press, invisible at rest.
        Box(
            modifier = Modifier
                .tanreiContainer(containerShape, containerColor = { containerColor.value }, outlineColor = Color.Transparent, outlineWidth = tokens.outlineWidth, ripple = ripple)
                .size(tokens.containerSize),
            contentAlignment = Alignment.Center,
        ) {
            val boxCorner = tokens.boxShape
            Box(
                Modifier
                    // CHK-6: around the box, never animated.
                    .tanreiFocusRing(source, cornerRadius = boxCorner)
                    .size(tokens.boxSize)
                    .drawWithCache {
                        val shape = tanreiInsetOutline(size, boxCorner.toPx(), smoothing, tokens.outlineWidth.toPx())
                        val stroke = Stroke(width = tokens.markWidth.toPx(), cap = StrokeCap.Square, join = StrokeJoin.Miter)
                        onDrawBehind {
                            drawTanreiInsetOutline(shape, fill = boxColor.value, outline = outlineColor.value)
                            drawCheckboxMark(mark, markColor.value, stroke)
                        }
                    },
            )
        }
    }
}

/** A checkbox draws no shadow: it has no elevation tokens. */
private val NoElevation: List<TanreiShadowLayer> = emptyList()

/** CHK-4: the condition of [state], in its `error-` form while [isError]. */
private fun checkboxCondition(state: ToggleableState, isError: Boolean): TanreiCheckboxCondition = when (state) {
    ToggleableState.Indeterminate -> if (isError) TanreiCheckboxCondition.ErrorIndeterminate else TanreiCheckboxCondition.Indeterminate
    ToggleableState.On -> if (isError) TanreiCheckboxCondition.ErrorSelected else TanreiCheckboxCondition.Selected
    ToggleableState.Off -> if (isError) TanreiCheckboxCondition.ErrorUnselected else TanreiCheckboxCondition.Unselected
}

/** What the box shows (CHK-12): nothing, a check, or a dash. */
private enum class CheckboxMarkKind { None, Check, Dash }

private fun checkboxMarkOf(state: ToggleableState): CheckboxMarkKind = when (state) {
    ToggleableState.On -> CheckboxMarkKind.Check
    ToggleableState.Indeterminate -> CheckboxMarkKind.Dash
    ToggleableState.Off -> CheckboxMarkKind.None
}

/** The mark being drawn: [kind] (the last one shown, while it is undrawn) and how much of it, 0–1, read in draw. */
private class CheckboxMark(initial: CheckboxMarkKind) {
    var kind by mutableStateOf(initial)
    val progress = Animatable(if (initial == CheckboxMarkKind.None) 0f else 1f)
}

/**
 * CHK-13: a new mark draws in from nothing over the selection duration and easing; a mark that goes away is undrawn
 * the same way; a check that becomes a dash (or back) starts the new one from nothing. Reduced motion: at once.
 */
@Composable
private fun rememberCheckboxMark(target: CheckboxMarkKind, tokens: TanreiCheckboxTokens): CheckboxMark {
    val mark = remember { CheckboxMark(target) }
    val spec = tanreiTween<Float>(tokens.motionSelectionDuration, tokens.motionSelectionEasing)
    LaunchedEffect(target) {
        if (target == CheckboxMarkKind.None) {
            mark.progress.animateTo(0f, spec)
        } else {
            if (mark.kind != target) {
                mark.progress.snapTo(0f)
                mark.kind = target
            }
            mark.progress.animateTo(1f, spec)
        }
    }
    return mark
}

/*
 * The dash's half length and the center, as fractions of the box; the check's geometry is `tanreiCheckPath`, which the
 * filter chip's check shares. Not design values — the shape of the glyph, as a font's glyph is; its stroke is
 * `mark.width`.
 */
private const val DASH_HALF = 0.3625f
private const val CENTER = 0.5f

private fun DrawScope.drawCheckboxMark(mark: CheckboxMark, color: Color, stroke: Stroke) {
    val progress = mark.progress.value
    if (progress <= 0f || !color.isDrawn) return
    when (mark.kind) {
        CheckboxMarkKind.None -> Unit
        CheckboxMarkKind.Check -> drawPath(tanreiCheckPath(size, progress), color, style = stroke)
        CheckboxMarkKind.Dash -> {
            val half = size.width * DASH_HALF * progress
            val y = size.height * CENTER
            drawLine(color, Offset(size.width * CENTER - half, y), Offset(size.width * CENTER + half, y), strokeWidth = stroke.width, cap = stroke.cap)
        }
    }
}

