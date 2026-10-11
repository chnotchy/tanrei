package io.github.chnotchy.tanrei.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.selectable
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.node.RootForTest
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsNode
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.semantics.SemanticsPropertyKey
import androidx.compose.ui.semantics.getOrNull
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.LayoutDirection
import io.github.chnotchy.tanrei.primitives.TanreiLabelledControl
import io.github.chnotchy.tanrei.primitives.TanreiStateMotion
import io.github.chnotchy.tanrei.primitives.animateTanreiColorAsState
import io.github.chnotchy.tanrei.primitives.collectTanreiInteraction
import io.github.chnotchy.tanrei.primitives.drawnStates
import io.github.chnotchy.tanrei.primitives.isDrawn
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
import io.github.chnotchy.tanrei.primitives.tanreiMinimumTouchTarget
import io.github.chnotchy.tanrei.primitives.tanreiPressInput
import io.github.chnotchy.tanrei.primitives.tanreiRippleInput
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.tanreiTween
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiRadioButtonCondition
import io.github.chnotchy.tanrei.tokens.TanreiRadioButtonTokens
import io.github.chnotchy.tanrei.tokens.TanreiShadowLayer

/**
 * Chooses exactly one option of a small group shown all at once. Implements `specs/radio-button.spec.json`. Every
 * design value comes from the current design system's [TanreiRadioButtonTokens] (`TanreiTheme.tokens.radioButton`);
 * the condition [selected] chooses (RAD-14: `unselected` or `selected`, the token axis `conditions`) is drawn in each
 * interaction state from THAT condition's and state's tokens. It is [TanreiButton]'s chain on a round state layer
 * behind a ring.
 *
 * The group is Compose's own: the parent of the options carries `Modifier.selectableGroup()` (the spec's `name`), and
 * each option's [onClick] captures its value (the spec's `value`). Inside such a group the options behave as one
 * control for the keyboard (RAD-4, RAD-5): the arrow keys move to the next or previous enabled option — wrapping, and
 * mirrored in a right-to-left layout — and select it; only the selected option (or the first enabled one while none is
 * selected) is a Tab stop. TalkBack reads the option's position in the group and the group's size from the same
 * `selectableGroup()` (RAD-16).
 *
 * @param selected whether this option is the one chosen in its group.
 * @param onClick the spec's `change`: called exactly once when an UNSELECTED option is activated (pointer, touch,
 *   Space, Enter, assistive technology, a press on its label, an arrow key reaching it) — the caller selects it,
 *   which unselects the others (RAD-3). Activating the selected option calls nothing (RAD-2). Null draws an option that
 *   only displays.
 * @param label the text that names the option: drawn at the ring's inline end and used as the accessible name. Empty,
 *   it still renders, and a debuggable app reports it (RAD-18).
 * @param modifier applied to the whole option — ring, label and the reserved minimum touch target.
 * @param enabled the Compose idiom for the spec's `disabled` (inverse). When false the option does not change, leaves
 *   the focus order, is skipped by the arrow keys, ignores presses on its label and is announced as disabled.
 * @param labelHidden draws no label but keeps [label] as the accessible name.
 * @param interactionSource hoist to observe or drive hover, focus and press.
 */
@Composable
public fun TanreiRadioButton(
    selected: Boolean,
    onClick: (() -> Unit)?,
    label: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    labelHidden: Boolean = false,
    interactionSource: MutableInteractionSource? = null,
) {
    val source = interactionSource ?: remember { MutableInteractionSource() }
    val system = TanreiTheme.tokens
    val tokens = system.radioButton
    // RAD-18: still rendered and still working without a name; reported in debuggable apps.
    val visibleLabel = tanreiControlLabel("TanreiRadioButton", label, labelHidden)

    // RAD-14: the condition `selected` chooses. Chosen once, here.
    val condition = if (selected) TanreiRadioButtonCondition.Selected else TanreiRadioButtonCondition.Unselected
    val conditionTokens = tokens.conditions[condition]

    // RAD-7 / RAD-10: one interaction state wins. RAD-11: a press counts from the first frame and for press-hold.
    val interaction = source.collectTanreiInteraction(enabled)
    // RAD-12: the pressed tokens say WHAT a press looks like; `pressed-feedback` says how it arrives.
    val feedback = system.behavior.pressedFeedback
    val drawnStates = interaction.drawnStates(feedback)
    val drawn = conditionTokens[drawnStates.content]

    // The state layer and the label move with the interaction; the ring and the dot with the condition (RAD-15).
    val stateMotion = TanreiStateMotion(interaction.state, tokens.motionStateDuration, tokens.motionStateEasing)
    val selectionMotion = rememberTanreiSelectionMotion(condition, stateMotion, tokens.motionSelectionDuration, tokens.motionSelectionEasing)
    val containerColor = animateTanreiColorAsState(conditionTokens[drawnStates.container].containerColor.color, stateMotion, label = "container")
    val ringColor = animateTanreiColorAsState(drawn.ringColor.color, selectionMotion, label = "ring")
    val dotColor = animateTanreiColorAsState(drawn.dotColor.color, selectionMotion, label = "dot")
    val labelColor by animateTanreiColorAsState(drawn.labelColor.color, stateMotion, label = "label")
    val opacity = animateFloatAsState(tokens.opacity(drawnStates.content), stateMotion.spec(), label = "opacity")
    val containerCorner by animateDpAsState(tokens.containerShape(drawnStates.content), stateMotion.spec(), label = "shape")
    // RAD-13: a round container is unchanged by corner smoothing; it shows where a system gives it a corner below full.
    val smoothing = system.shape.cornerSmoothing
    val containerShape = remember(containerCorner, smoothing) { tanreiContainerShape(containerCorner, smoothing) }

    // RAD-12, ripple: the pressed container color of THIS condition, grown from the point of contact.
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

    // RAD-15: the dot grows from the ring's center when selected and shrinks back when not. Reduced motion: at once.
    val dot = remember { Animatable(if (selected) 1f else 0f) }
    LaunchedEffect(selected) { dot.animateTo(if (selected) 1f else 0f, tanreiTween(tokens.motionSelectionDuration, tokens.motionSelectionEasing)) }

    // RAD-4 / RAD-5: this option as its group sees it.
    val option = remember { RadioOption() }
    option.selected = selected
    option.enabled = enabled && onClick != null
    option.select = { if (!option.selected) onClick?.invoke() }
    option.leftToRight = LocalLayoutDirection.current == LayoutDirection.Ltr
    option.root = LocalView.current as? RootForTest
    if (selected) option.focusGranted = false

    // RAD-1 / RAD-2 / RAD-6 / RAD-16: role radio with its selection; Space and Enter select; activating the selected
    // option does nothing; disabled leaves the focus order. The whole row is the input: a press on the label selects.
    val input = if (onClick != null) {
        Modifier
            .semantics { this[RadioOptionKey] = option }
            .focusRequester(option.focusRequester)
            .focusProperties { canFocus = option.isTabStop() }
            .onFocusChanged { if (!it.isFocused) option.focusGranted = false }
            .onKeyEvent { event -> event.type == KeyEventType.KeyDown && option.moveByArrow(event.key) }
            .selectable(
                selected = selected,
                interactionSource = source,
                indication = null, // No Indication: the feedback is drawn below, inside the container, from Tanrei's tokens.
                enabled = enabled,
                role = Role.RadioButton,
                onClick = option.select,
            )
    } else {
        Modifier
    }

    val row = modifier
        .tanreiAnchorDescription()
        .tanreiHiddenLabel(label, labelHidden)
        .then(input)
        // RAD-11: the pointer press itself, heard at once.
        .tanreiPressInput(interaction.press, enabled && onClick != null)
        .tanreiRippleInput(ripple)
        // RAD-9: at least the touch target on both axes, the visual size unchanged.
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
                .tanreiContainer(containerShape, containerColor = { containerColor.value }, outlineColor = Color.Transparent, outlineWidth = tokens.ringWidth, ripple = ripple)
                .size(tokens.containerSize),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                Modifier
                    // RAD-8: around the ring, never animated.
                    .tanreiFocusRing(source, cornerRadius = tokens.ringSize / 2)
                    .size(tokens.ringSize)
                    .drawBehind {
                        // RAD-14: the ring stroked INSIDE its outer diameter; the dot centered, only while selected.
                        val width = tokens.ringWidth.toPx()
                        val ring = ringColor.value
                        if (ring.isDrawn) drawCircle(ring, radius = (size.minDimension - width) / 2, style = Stroke(width))
                        val grown = dot.value
                        val fill = dotColor.value
                        if (grown > 0f && fill.isDrawn) drawCircle(fill, radius = tokens.dotSize.toPx() / 2 * grown)
                    },
            )
        }
    }
}

/** A radio button draws no shadow: it has no elevation tokens. */
private val NoElevation: List<TanreiShadowLayer> = emptyList()

/**
 * One option as its group sees it (RAD-4, RAD-5): published on the option's own semantics node ([RadioOptionKey]), so an
 * option that has keyboard focus can find the others under the nearest `Modifier.selectableGroup()` ancestor, move
 * focus to one and select it. Everything here is read when a key is pressed or focus is searched — never in
 * composition.
 */
private class RadioOption {
    var selected = false
    var enabled = true
    var leftToRight = true
    var select: () -> Unit = {}
    val focusRequester = FocusRequester()

    /** Set while the group moves focus here before this option's selection has reached composition. */
    var focusGranted = false

    /**
     * Where the semantics tree is read from. Compose has no public way for a modifier to read its ancestors' semantics
     * (`requireSemanticsInfo` is internal), but every `AndroidComposeView` is a [RootForTest] whose `semanticsOwner` is
     * public.
     */
    var root: RootForTest? = null

    /**
     * RAD-5: one Tab stop per group — the selected option, or the first enabled one while none is selected. Outside a
     * `selectableGroup()` every option is a stop of its own.
     */
    fun isTabStop(): Boolean {
        if (focusGranted) return true
        val options = group()?.filter { it.enabled } ?: return true
        val chosen = options.firstOrNull { it.selected }
        return if (chosen != null) chosen === this else options.firstOrNull() === this
    }

    /** RAD-4: Down / Right (Left in right-to-left) to the next enabled option, Up / Left to the previous; wrapping. */
    fun moveByArrow(key: Key): Boolean {
        val forward = when (key) {
            Key.DirectionDown -> true
            Key.DirectionUp -> false
            Key.DirectionRight -> leftToRight
            Key.DirectionLeft -> !leftToRight
            else -> return false
        }
        val options = group()?.filter { it.enabled || it === this } ?: return false
        val here = options.indexOf(this)
        if (here < 0 || options.size < 2) return true
        val step = if (forward) 1 else -1
        val next = options[(here + step + options.size) % options.size]
        next.focusGranted = true
        next.focusRequester.requestFocus()
        next.select()
        return true
    }

    /** The options of this option's group, in layout order; null outside a `selectableGroup()`. */
    fun group(): List<RadioOption>? {
        val tree = root?.semanticsOwner?.unmergedRootSemanticsNode ?: return null
        val self = tree.find { it.config.getOrNull(RadioOptionKey) === this } ?: return null
        var parent = self.parent
        while (parent != null && SemanticsProperties.SelectableGroup !in parent.config) parent = parent.parent
        val group = parent ?: return null
        return buildList { collectOptions(group) }
    }
}

/** The first node, depth first, that [matches]. */
private fun SemanticsNode.find(matches: (SemanticsNode) -> Boolean): SemanticsNode? {
    if (matches(this)) return this
    for (child in children) child.find(matches)?.let { return it }
    return null
}

/** Every option under [node], in layout order; an option's own descendants are not searched. */
private fun MutableList<RadioOption>.collectOptions(node: SemanticsNode) {
    for (child in node.children) {
        val option = child.config.getOrNull(RadioOptionKey)
        if (option != null) add(option) else collectOptions(child)
    }
}

/** Not an accessibility property: Compose maps only its own keys to the platform. */
private val RadioOptionKey = SemanticsPropertyKey<RadioOption>("TanreiRadioOption") { parent, _ -> parent }
