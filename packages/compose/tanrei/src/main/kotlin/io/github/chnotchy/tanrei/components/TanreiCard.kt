package io.github.chnotchy.tanrei.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.isTraversalGroup
import androidx.compose.ui.semantics.semantics
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.primitives.TanreiReportUnknownValue
import io.github.chnotchy.tanrei.primitives.TanreiStateMotion
import io.github.chnotchy.tanrei.primitives.WithoutTanreiAnchorDescription
import io.github.chnotchy.tanrei.primitives.animateTanreiColorAsState
import io.github.chnotchy.tanrei.primitives.animateTanreiElevation
import io.github.chnotchy.tanrei.primitives.collectTanreiInteraction
import io.github.chnotchy.tanrei.primitives.drawnStates
import io.github.chnotchy.tanrei.primitives.isTanreiDebuggable
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
import io.github.chnotchy.tanrei.theme.LocalTanreiTextStyle
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiCardTokens
import io.github.chnotchy.tanrei.tokens.TanreiCardVariant

/**
 * Sets a group of related content apart from its background. Implements `specs/card.spec.json` — this overload is the
 * card that is NOT an action (the spec's `interactive` false): no role, not focusable, no hover, focus or press answer
 * (CRD-11), drawn from the resting tokens of its variant in the current design system's [TanreiCardTokens]
 * (`TanreiTheme.tokens.card`). The overload that takes `onClick` is the interactive card.
 *
 * The card does not lay out its content: it insets it by `container.padding` (unless [inset] is false), clips it to
 * the container's shape, draws the outlined variant's outline above it, and hands it the variant's content color as
 * [LocalTanreiContentColor] and `sys.typescale.body` as [LocalTanreiTextStyle] (CRD-12, CRD-13). It has no height of its
 * own: it grows with its content.
 *
 * @param modifier applied to the whole card.
 * @param variant how the card separates from its background: a key of `tokens.card.variants` —
 *   [TanreiCardVariant.Outlined] (default, an edge), [TanreiCardVariant.Filled] (a tone), [TanreiCardVariant.Elevated]
 *   (depth). Pick by the background, not by importance. Open: a design system may add values; one it does
 *   not have draws with the default's tokens and is reported in debuggable apps (CRD-7).
 * @param inset the content sits `container.padding` inside the container on every side; false lets content that bleeds
 *   (a photo on top) reach the edges — it then pads its own text.
 * @param contentDescription the spec's `label`: when set (not blank) the card is a group named by it; its content keeps
 *   its own semantics either way (CRD-14).
 * @param content any layout of media, text and actions, in a [Column].
 */
@Composable
public fun TanreiCard(
    modifier: Modifier = Modifier,
    variant: TanreiCardVariant = TanreiCardVariant.Outlined,
    inset: Boolean = true,
    contentDescription: String? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    val system = TanreiTheme.tokens
    val tokens = system.card
    // CRD-7: the lookup is total — a value this design system does not have reads the default value's tokens.
    if (variant !in tokens.variants) TanreiReportUnknownValue(system.id, "TanreiCard", "variant", variant.key)
    // CRD-11: never an action, so the resting tokens are all it draws.
    val resting = tokens.variants[variant].enabled
    val shape = tanreiCardShape(tokens)
    val label = contentDescription?.takeUnless { it.isBlank() }
    // CRD-14: no role of its own; with a label, a group named by it. Its content is not merged: each element inside is
    // reached on its own.
    val group = if (label != null) {
        Modifier.semantics {
            this.contentDescription = label
            isTraversalGroup = true
        }
    } else {
        Modifier
    }
    val containerColor = resting.containerColor.color
    val container = modifier
        .then(group)
        .tanreiElevation(resting.containerElevation, shape)
        .tanreiContainer(shape, containerColor = { containerColor }, outlineColor = resting.outlineColor.color, outlineWidth = tokens.outlineWidth)
    TanreiCardBody(container, shape, tokens, inset, contentColor = resting.contentColor.color, interactive = false, clearContent = false, content = content)
}

/**
 * The card that IS one action (the spec's `interactive` true): the whole card is pressable, emits [onClick] and is one
 * focusable element with the button role. It is [TanreiButton]'s chain — press and press-hold, pressed feedback and
 * ripple, keyboard focus ring, minimum target, container, corner smoothing, unknown-value reports — with the card's own
 * tokens, and each interaction state is drawn from THAT state's tokens of the variant: container, outline, elevation,
 * content color and opacity (CRD-3, CRD-6). The component never computes how a state looks.
 *
 * **Its content must contain no interactive element** — no button, link, field, toggle or anything else focusable
 * (CRD-15): the card is one element to assistive technology, which cannot reach what is nested in it, and a press on a
 * nested control would also activate the card. Compose cannot detect a nested control reliably, so this is not checked.
 * A card that needs its own buttons uses the overload without `onClick`, and its primary action is one of them.
 *
 * @param onClick the spec's `click` (and `interactive`): called exactly once per activation — pointer, touch, Enter,
 *   Space, an assistive technology's click (CRD-1).
 * @param modifier applied to the whole card, including the reserved minimum touch target of a small card.
 * @param variant as in the other overload (CRD-7).
 * @param enabled the Compose idiom for the spec's `disabled` (inverse). When false the card does not fire, leaves the
 *   focus order, is announced as disabled, and is drawn from the disabled tokens — in the default system the whole
 *   card, content included, at `sys.state.disabled-content-opacity` without a shadow (CRD-2, CRD-6).
 * @param inset as in the other overload (CRD-12).
 * @param contentDescription the spec's `label`, the accessible name — normally the text of the card's heading. The
 *   content is then presentational: only the name is announced. Without one (null or blank) the text of the whole
 *   content, merged in reading order, is the name, and a debuggable app reports the missing label (CRD-14).
 * @param interactionSource hoist to observe or drive hover, focus and press.
 * @param content media and text — never another interactive element — in a [Column].
 */
@Composable
public fun TanreiCard(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: TanreiCardVariant = TanreiCardVariant.Outlined,
    enabled: Boolean = true,
    inset: Boolean = true,
    contentDescription: String? = null,
    interactionSource: MutableInteractionSource? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    val source = interactionSource ?: remember { MutableInteractionSource() }
    val system = TanreiTheme.tokens
    val tokens = system.card
    // CRD-7: the lookup is total — a value this design system does not have reads the default value's tokens.
    if (variant !in tokens.variants) TanreiReportUnknownValue(system.id, "TanreiCard", "variant", variant.key)
    val label = contentDescription?.takeUnless { it.isBlank() }
    // CRD-14: still rendered and still working, named by its content; reported in debuggable apps.
    if (label == null) TanreiReportMissingCardLabel()

    // CRD-3 / CRD-6: one state wins. CRD-8: a press counts from the first frame and for at least `duration.press-hold`.
    val interaction = source.collectTanreiInteraction(enabled)
    val state = interaction.state
    // CRD-9: the pressed tokens say WHAT a press looks like; `pressed-feedback` says how it arrives — which state the
    // container color and the rest draw from. Nothing here knows which design system is active.
    val feedback = system.behavior.pressedFeedback
    val drawnStates = interaction.drawnStates(feedback)
    val palette = tokens.variants[variant]
    val drawn = palette[drawnStates.content]

    // CRD-16: entering pressed is immediate; every other change moves with the card's state duration and easing — the
    // colors, the opacity and the elevation alike. Where motion is reduced (the animator duration scale is 0) at once.
    val motion = TanreiStateMotion(state, tokens.motionStateDuration, tokens.motionStateEasing)
    val containerColor = animateTanreiColorAsState(palette[drawnStates.container].containerColor.color, motion, label = "container")
    val contentColor by animateTanreiColorAsState(drawn.contentColor.color, motion, label = "content")
    val outlineColor by animateTanreiColorAsState(drawn.outlineColor.color, motion, label = "outline")
    val opacity = animateFloatAsState(tokens.opacity(drawnStates.content), motion.spec(), label = "opacity")
    val elevation = animateTanreiElevation(drawn.containerElevation, motion.spec())
    val shape = tanreiCardShape(tokens)

    // CRD-9, ripple: the pressed container color as a circle that grows from the point of contact (the center for a
    // key) over the card's feedback duration and fades over its state duration, both with its state easing. CRD-17:
    // the point of contact is where the pointer went down, in either layout direction. Null unless the system ripples.
    val ripple = rememberTanreiRipple(
        feedback = feedback,
        interaction = interaction,
        color = palette.pressed.containerColor.color,
        feedbackDurationMillis = tokens.motionFeedbackDuration,
        stateDurationMillis = tokens.motionStateDuration,
        stateEasing = tokens.motionStateEasing,
    )

    // Order is load-bearing: the name and the input first, so the hit area and a11y bounds cover the touch target
    // (CRD-5), then the target reservation, then everything visual at the card's own size.
    val container = modifier
        // A badge (or another decorating component) wrapping this card adds its description here, on the node that is
        // announced.
        .tanreiAnchorDescription()
        .then(if (label != null) Modifier.semantics { this.contentDescription = label } else Modifier)
        // CRD-1 / CRD-2 / CRD-14: one focusable element with the button role; `clickable` merges the content into it.
        .clickable(
            interactionSource = source,
            indication = null, // No Indication: the feedback is drawn below, inside the container, from Tanrei's tokens.
            enabled = enabled,
            role = Role.Button,
            onClick = onClick,
        )
        // CRD-8: the pointer press itself, heard at once — `clickable` holds its own back inside a scrolling container.
        .tanreiPressInput(interaction.press, enabled)
        .tanreiRippleInput(ripple)
        .tanreiMinimumTouchTarget()
        // CRD-6: a disabled card dims as a whole — its content too, whose colors it cannot know.
        .tanreiGroupOpacity(overflow = tanreiDecorationOverflow(system, drawn.containerElevation)) { opacity.value }
        // CRD-4 / CRD-10: never animated, in the system's focus style, along the card's corner.
        .tanreiFocusRing(source, cornerRadius = tokens.containerShape)
        .tanreiElevation(elevation, shape)
        .tanreiContainer(shape, containerColor = { containerColor.value }, outlineColor = outlineColor, outlineWidth = tokens.outlineWidth, ripple = ripple)
    // CRD-14: with a label the content is presentational (only the name is announced); without one its text merges
    // into the card, in reading order, as its name.
    TanreiCardBody(container, shape, tokens, inset, contentColor = contentColor, interactive = true, clearContent = label != null, content = content)
}

/**
 * What both cards draw inside their container: the content, clipped to [shape] (CRD-12), inset by `container.padding`
 * when [inset] (logical start and end, so it mirrors — CRD-17), in [contentColor] and the body text style (CRD-13). The
 * container's outline is a border of [container], so it is drawn above the content. [clearContent] makes the content
 * presentational. Inside an [interactive] card the anchor description a badge hands the card is not handed on: the card
 * announces it once.
 */
@Composable
private fun TanreiCardBody(
    container: Modifier,
    shape: Shape,
    tokens: TanreiCardTokens,
    inset: Boolean,
    contentColor: Color,
    interactive: Boolean,
    clearContent: Boolean,
    content: @Composable ColumnScope.() -> Unit,
) {
    // `propagateMinConstraints`: a card the caller sizes (fillMaxWidth, a height) passes that size to its content area.
    Box(modifier = container, propagateMinConstraints = true) {
        // CRD-13: the content color, and `sys.typescale.body` for plain text given as content — whatever an enclosing
        // component asked its own text to use.
        CompositionLocalProvider(
            LocalTanreiContentColor provides contentColor,
            LocalTanreiTextStyle provides TanreiTheme.tokens.typescale.body.toTextStyle(),
        ) {
            val body = @Composable {
                Column(
                    modifier = Modifier
                        .clip(shape)
                        .then(if (clearContent) Modifier.clearAndSetSemantics {} else Modifier)
                        .then(if (inset) Modifier.padding(tokens.containerPadding) else Modifier),
                    content = content,
                )
            }
            if (interactive) WithoutTanreiAnchorDescription(body) else body()
        }
    }
}

/** CRD-10: the card's corner, eased by the system's `corner-smoothing` amount (0 a quarter circle, 0.6 the iOS corner). */
@Composable
private fun tanreiCardShape(tokens: TanreiCardTokens): Shape {
    val radius = tokens.containerShape
    val smoothing = TanreiTheme.tokens.shape.cornerSmoothing
    return remember(radius, smoothing) { tanreiContainerShape(radius, smoothing) }
}

/**
 * Debuggable apps only (CRD-14): an interactive card without a label is named by all of its content read as one
 * string — it still works, but the name is long and unstructured. Reported once per composition site.
 */
@Composable
private fun TanreiReportMissingCardLabel() {
    if (!isTanreiDebuggable()) return
    remember {
        TanreiDiagnostics.reporter("TanreiCard: contentDescription is empty — an interactive card is then named by all of its content read as one string; name it by its heading.")
    }
}
