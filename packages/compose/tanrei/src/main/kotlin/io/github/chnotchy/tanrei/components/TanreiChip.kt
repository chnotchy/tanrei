package io.github.chnotchy.tanrei.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.layoutId
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.util.lerp
import io.github.chnotchy.tanrei.primitives.TanreiInteraction
import io.github.chnotchy.tanrei.primitives.TanreiReportMissingName
import io.github.chnotchy.tanrei.primitives.TanreiReportUnknownValue
import io.github.chnotchy.tanrei.primitives.TanreiStateMotion
import io.github.chnotchy.tanrei.primitives.TanreiText
import io.github.chnotchy.tanrei.primitives.WithoutTanreiAnchorDescription
import io.github.chnotchy.tanrei.primitives.animateTanreiColorAsState
import io.github.chnotchy.tanrei.primitives.animateTanreiElevation
import io.github.chnotchy.tanrei.primitives.collectTanreiInteraction
import io.github.chnotchy.tanrei.primitives.drawnStates
import io.github.chnotchy.tanrei.primitives.isDrawn
import io.github.chnotchy.tanrei.primitives.rememberTanreiRipple
import io.github.chnotchy.tanrei.primitives.rememberTanreiSelectionMotion
import io.github.chnotchy.tanrei.primitives.tanreiAnchorDescription
import io.github.chnotchy.tanrei.primitives.TanreiDrawnGlyph
import io.github.chnotchy.tanrei.primitives.TanreiDrawnGlyphKind
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
import io.github.chnotchy.tanrei.theme.tanreiTween
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiChipSize
import io.github.chnotchy.tanrei.tokens.TanreiChipTokens
import io.github.chnotchy.tanrei.tokens.TanreiChipVariant
import io.github.chnotchy.tanrei.tokens.TanreiChipVariantStateTokens
import io.github.chnotchy.tanrei.tokens.TanreiChipVariantTokens
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiShadowLayer
import kotlin.math.roundToInt

/*
 * `specs/chip.spec.json` (CHP-1…26) on Compose. The spec's `kind` (`onSelectedChange / onRemove`) is chosen by overload,
 * as `platforms.compose` says: `onClick` alone is an ACTION chip, `selected` + `onSelectedChange` a FILTER chip,
 * `onClick` + `onRemove` an INPUT chip. All three are one implementation, [TanreiChipImpl]. Every design value comes
 * from the current design system's [TanreiChipTokens] (`TanreiTheme.tokens.chip`), and each interaction state — the
 * chip's own, and the remove action's own — is drawn from THAT state's tokens. It is [TanreiButton]'s chain (press,
 * ripple, focus ring, target, elevation, container, corner shape) with the chip's own tokens; the input chip's remove
 * action is a second, nested one.
 */

/**
 * An ACTION chip: a compact button that performs or suggests something (Material's assist and suggestion chips).
 *
 * @param onClick called exactly once per activation (pointer, touch, Enter/Space, accessibility click) (CHP-1).
 * @param label the visible text and the accessible name, on one line; truncated with an ellipsis only when the layout
 *   gives the chip less width than it needs, and read in full. An empty one still renders, and a debuggable app
 *   reports it (CHP-26).
 * @param modifier applied to the chip, including the reserved minimum touch target.
 * @param variant the look: a key of `tokens.chip.variants` — [TanreiChipVariant.Outlined] (the default, flat on a plain
 *   surface) or [TanreiChipVariant.Elevated] (raised over media). Open: a design system may add values.
 * @param size the visual height: a key of `tokens.chip.sizes` (`Small` 24, `Medium` 32 in the default system); the hit
 *   area grows to `sys.target`. A [variant] or [size] the system does not have draws the default's tokens, and a
 *   debuggable app reports it (CHP-7).
 * @param enabled the Compose idiom for the spec's `disabled` (inverse).
 * @param icon an optional leading glyph, laid out in a box of the size's `iconSize` and given the icon color, the
 *   unselected glyph and an icon-font text style (as [TanreiIconButton]'s slot).
 * @param interactionSource hoist to observe or drive hover, focus and press.
 */
@Composable
public fun TanreiChip(
    onClick: () -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    variant: TanreiChipVariant = TanreiChipVariant.Outlined,
    size: TanreiChipSize = TanreiChipSize.Medium,
    enabled: Boolean = true,
    icon: (@Composable () -> Unit)? = null,
    interactionSource: MutableInteractionSource? = null,
) {
    TanreiChipImpl(
        kind = TanreiChipKind.Action, label = label, onClick = onClick, selected = false, onSelectedChange = null,
        onRemove = null, removeContentDescription = "", modifier = modifier, variant = variant, size = size,
        enabled = enabled, icon = icon, avatar = null, interactionSource = interactionSource, removeInteractionSource = null,
    )
}

/**
 * A FILTER chip: a two-state control, on or off — a button with a pressed state (`Role.Button` with a toggleable
 * state, as the toggle icon button), never a checkbox. On, it draws the `selected…` parts of its variant and a check in
 * the leading position (in place of its icon).
 *
 * @param selected whether it is on.
 * @param onSelectedChange the spec's `change`: called with `!selected` on each activation, after [onClick] (CHP-11).
 * @param onClick the spec's `click`, emitted before the change, as a native checkbox does.
 * @see TanreiChip the action chip, for [label], [modifier], [variant], [size], [enabled], [icon], [interactionSource].
 */
@Composable
public fun TanreiChip(
    selected: Boolean,
    onSelectedChange: (Boolean) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    variant: TanreiChipVariant = TanreiChipVariant.Outlined,
    size: TanreiChipSize = TanreiChipSize.Medium,
    enabled: Boolean = true,
    onClick: () -> Unit = {},
    icon: (@Composable () -> Unit)? = null,
    interactionSource: MutableInteractionSource? = null,
) {
    TanreiChipImpl(
        kind = TanreiChipKind.Filter, label = label, onClick = onClick, selected = selected, onSelectedChange = onSelectedChange,
        onRemove = null, removeContentDescription = "", modifier = modifier, variant = variant, size = size,
        enabled = enabled, icon = icon, avatar = null, interactionSource = interactionSource, removeInteractionSource = null,
    )
}

/**
 * An INPUT chip: an item the user entered, which the user can remove. Two elements to assistive technology and two Tab
 * stops: the chip (`Role.Button`, named by [label]) and, at its inline end, its remove action (`Role.Button`, named by
 * [removeContentDescription]) — a close glyph on a round container with its own hover, focus and press, and a hit
 * area of at least `sys.target.touch` that never covers the label. Backspace or Delete on the focused chip also asks
 * for removal. The chip never removes itself or moves focus: [onRemove] asks its owner to (CHP-22).
 *
 * @param onClick the chip itself was activated; never called by the remove action.
 * @param onRemove the spec's `remove`: the remove action was activated, or Backspace / Delete was pressed on the chip.
 * @param removeContentDescription the remove action's name; it should name the item ("Remove Ada Lovelace"). An empty
 *   one still renders, and a debuggable app reports it (CHP-26).
 * @param avatar an optional leading image, in place of [icon]: drawn at the size's `avatarSize`, clipped to
 *   `avatarShape`, hidden from assistive technology, and dimmed to `sys.state.disabled-content-opacity` when disabled
 *   (CHP-15). Only an input chip takes one — the other overloads have no such parameter.
 * @param removeInteractionSource hoist to observe or drive the remove action's hover, focus and press.
 * @see TanreiChip the action chip, for [label], [modifier], [variant], [size], [enabled], [icon], [interactionSource].
 */
@Composable
public fun TanreiChip(
    onClick: () -> Unit,
    onRemove: () -> Unit,
    label: String,
    removeContentDescription: String,
    modifier: Modifier = Modifier,
    variant: TanreiChipVariant = TanreiChipVariant.Outlined,
    size: TanreiChipSize = TanreiChipSize.Medium,
    enabled: Boolean = true,
    icon: (@Composable () -> Unit)? = null,
    avatar: (@Composable () -> Unit)? = null,
    interactionSource: MutableInteractionSource? = null,
    removeInteractionSource: MutableInteractionSource? = null,
) {
    TanreiChipImpl(
        kind = TanreiChipKind.Input, label = label, onClick = onClick, selected = false, onSelectedChange = null,
        onRemove = onRemove, removeContentDescription = removeContentDescription, modifier = modifier, variant = variant,
        size = size, enabled = enabled, icon = icon, avatar = avatar, interactionSource = interactionSource,
        removeInteractionSource = removeInteractionSource,
    )
}

/** The spec's `kind`: action, filter or input — chosen by overload. A closed set. */
private enum class TanreiChipKind { Action, Filter, Input }

/**
 * The looks of one variant (CHP-12): the variant's own parts, or — a filter chip that is on — its
 * `selected.` parts. There is no `unselected.` look: a filter chip that is off looks like any chip of its variant.
 */
private enum class TanreiChipLook { Plain, Selected }

/** The container, elevation, outline, label and icon of one look in one state. */
@Immutable
private class TanreiChipParts(
    val container: TanreiPaint,
    val elevation: List<TanreiShadowLayer>,
    val outline: TanreiPaint,
    val label: TanreiPaint,
    val icon: TanreiPaint,
)

private fun TanreiChipVariantStateTokens.parts(look: TanreiChipLook): TanreiChipParts = when (look) {
    TanreiChipLook.Plain -> TanreiChipParts(containerColor, containerElevation, outlineColor, labelColor, iconColor)
    TanreiChipLook.Selected -> TanreiChipParts(selectedContainerColor, selectedContainerElevation, selectedOutlineColor, selectedLabelColor, selectedIconColor)
}

/** The chip's own state while the pointer rests on its remove action: that hover is the remove action's, not the chip's (CHP-20). */
private fun TanreiInteraction.withoutHover(): TanreiInteraction {
    fun TanreiInteractionState.unhovered() = if (this == TanreiInteractionState.Hovered) TanreiInteractionState.Enabled else this
    return TanreiInteraction(state = state.unhovered(), unpressed = unpressed.unhovered(), press = press)
}

@Composable
private fun TanreiChipImpl(
    kind: TanreiChipKind,
    label: String,
    onClick: () -> Unit,
    selected: Boolean,
    onSelectedChange: ((Boolean) -> Unit)?,
    onRemove: (() -> Unit)?,
    removeContentDescription: String,
    modifier: Modifier,
    variant: TanreiChipVariant,
    size: TanreiChipSize,
    enabled: Boolean,
    icon: (@Composable () -> Unit)?,
    avatar: (@Composable () -> Unit)?,
    interactionSource: MutableInteractionSource?,
    removeInteractionSource: MutableInteractionSource?,
) {
    val component = "TanreiChip"
    val source = interactionSource ?: remember { MutableInteractionSource() }
    val removeSource = removeInteractionSource ?: remember { MutableInteractionSource() }
    val system = TanreiTheme.tokens
    val tokens = system.chip
    // CHP-7: both lookups are total — a value this design system does not have reads the default value's tokens.
    val metrics = tokens.sizes[size]
    if (size !in tokens.sizes) TanreiReportUnknownValue(system.id, component, "size", size.key)
    if (variant !in tokens.variants) TanreiReportUnknownValue(system.id, component, "variant", variant.key)
    // CHP-26: still rendered and still working; reported in debuggable apps.
    if (label.isBlank()) TanreiReportMissingName(component, "label", what = "a chip without text")
    val input = kind == TanreiChipKind.Input && onRemove != null
    val removeNamed = removeContentDescription.isNotBlank()
    if (input && !removeNamed) TanreiReportMissingName(component, "removeContentDescription", what = "a close glyph alone")

    // CHP-11 / CHP-12: which look is drawn — only a filter chip that is on is selected.
    val look = if (kind == TanreiChipKind.Filter && selected) TanreiChipLook.Selected else TanreiChipLook.Plain

    // CHP-3 / CHP-6 / CHP-8: one state wins, a press is held for press-hold. CHP-20: the remove action tracks its own
    // state; while the pointer is on it the chip is not hovered, and a press of it is consumed by it before the chip's
    // input hears it, so the chip is not pressed either.
    val removeHovered by removeSource.collectIsHoveredAsState()
    val chipInteraction = source.collectTanreiInteraction(enabled).let { if (input && removeHovered) it.withoutHover() else it }
    // CHP-9: the pressed tokens say WHAT a press looks like; `pressed-feedback` says how it arrives.
    val feedback = system.behavior.pressedFeedback
    val drawnStates = chipInteraction.drawnStates(feedback)
    val palette = tokens.variants[variant]
    val drawn = palette[drawnStates.content].parts(look)

    // CHP-24: a change of state moves over the state motion; CHP-13: a change of selection moves the colors over the
    // selection motion. Entering pressed snaps; where motion is reduced everything is at once.
    val stateMotion = TanreiStateMotion(chipInteraction.state, tokens.motionStateDuration, tokens.motionStateEasing)
    val motion = rememberTanreiSelectionMotion(look, stateMotion, tokens.motionSelectionDuration, tokens.motionSelectionEasing)
    val containerColor = animateTanreiColorAsState(palette[drawnStates.container].parts(look).container.color, motion, label = "container")
    val outlineColor by animateTanreiColorAsState(drawn.outline.color, motion, label = "outline")
    val labelColor = animateTanreiColorAsState(drawn.label.color, motion, label = "label")
    val iconColor by animateTanreiColorAsState(drawn.icon.color, motion, label = "icon")
    val opacity = animateFloatAsState(tokens.opacity(drawnStates.content), motion.spec(), label = "opacity")
    val elevation = animateTanreiElevation(drawn.elevation, motion.spec())
    // CHP-13: the check shows and hides — and the chip's width follows it — over the selection motion.
    val checkShown = animateFloatAsState(if (look == TanreiChipLook.Selected) 1f else 0f, tanreiTween(tokens.motionSelectionDuration, tokens.motionSelectionEasing), label = "check")
    // CHP-10 / CHP-16: one corner for every size, eased by the system's `corner-smoothing`.
    val cornerSmoothing = system.shape.cornerSmoothing
    val shape = remember(tokens.containerShape, cornerSmoothing) { tanreiContainerShape(tokens.containerShape, cornerSmoothing) }

    // CHP-9, ripple: the pressed container color OF THIS LOOK, from the point of contact. Null unless the system ripples.
    val ripple = rememberTanreiRipple(
        feedback = feedback,
        interaction = chipInteraction,
        color = palette.pressed.parts(look).container.color,
        feedbackDurationMillis = tokens.motionFeedbackDuration,
        stateDurationMillis = tokens.motionStateDuration,
        stateEasing = tokens.motionStateEasing,
    )

    // CHP-14: every glyph at the size's icon size, through THE icon helper, with the family and fill of the selection.
    val glyph = system.icon.glyph(metrics.iconSize, selected = look == TanreiChipLook.Selected)

    // CHP-1 / CHP-2 / CHP-11: an action or input chip is a button; a filter chip a toggleable button (Role.Button with
    // an on / off state, not a checkbox), which emits click and then change.
    val activation = if (kind == TanreiChipKind.Filter && onSelectedChange != null) {
        Modifier.toggleable(
            value = selected,
            interactionSource = source,
            indication = null, // No Indication: the feedback is drawn below, inside the container, from Tanrei's tokens.
            enabled = enabled,
            role = Role.Button,
            onValueChange = { value ->
                // CHP-11: click, then change — the order a native checkbox emits them in.
                onClick()
                onSelectedChange(value)
            },
        )
    } else {
        Modifier.clickable(interactionSource = source, indication = null, enabled = enabled, role = Role.Button, onClick = onClick)
    }
    // CHP-19: Backspace or Delete on the focused input chip — the chip itself, not its remove action — asks for removal.
    val focus = remember { ChipFocus() }
    val removeKeys = if (input && onRemove != null) {
        Modifier
            .onKeyEvent { event ->
                val removes = event.key == Key.Backspace || event.key == Key.Delete
                if (!removes || !focus.chip || !enabled) return@onKeyEvent false
                if (event.type == KeyEventType.KeyDown && event.nativeKeyEvent.repeatCount == 0) onRemove()
                true
            }
            .onFocusChanged { focus.chip = it.isFocused }
    } else {
        Modifier
    }

    // Order is load-bearing: the input first, so the hit area and a11y bounds cover the touch target (CHP-5), then the
    // target reservation, then everything visual at the chip's own size — the shadow outside it, never clipped.
    val container = modifier
        .tanreiAnchorDescription()
        .then(removeKeys)
        .then(activation)
        // CHP-8: the pointer press itself, heard at once.
        .tanreiPressInput(chipInteraction.press, enabled)
        .tanreiRippleInput(ripple)
        .tanreiMinimumTouchTarget()
        .tanreiGroupOpacity(overflow = tanreiDecorationOverflow(system, drawn.elevation)) { opacity.value }
        // CHP-4: never animated.
        .tanreiFocusRing(source, cornerRadius = tokens.containerShape)
        .tanreiElevation(elevation, shape)
        // CHP-16: the outline, `outlineWidth` wide, inside the edge; transparent where the look has none.
        .tanreiContainer(shape, containerColor = { containerColor.value }, outlineColor = outlineColor, outlineWidth = tokens.outlineWidth, ripple = ripple)

    val labelStyle = metrics.labelTypescale.toTextStyle()
    val hasAvatar = input && avatar != null
    val filter = kind == TanreiChipKind.Filter

    Layout(
        modifier = container,
        content = {
            WithoutTanreiAnchorDescription {
                // The leading element: an avatar (input chips), or a glyph box — the icon, and for a filter chip the
                // check in its place. Decorative: the chip's name is its label.
                when {
                    hasAvatar -> Box(
                        Modifier
                            .layoutId(ChipSlot.Leading)
                            .size(metrics.avatarSize)
                            .clip(remember(tokens.avatarShape, cornerSmoothing) { tanreiContainerShape(tokens.avatarShape, cornerSmoothing) })
                            // CHP-6: a disabled chip's avatar is drawn at the disabled content opacity.
                            .graphicsLayer { alpha = if (enabled) 1f else system.state.disabledContentOpacity }
                            .clearAndSetSemantics {},
                        contentAlignment = Alignment.Center,
                    ) { avatar?.invoke() }
                    icon != null || filter -> Box(Modifier.layoutId(ChipSlot.Leading).size(metrics.iconSize).clearAndSetSemantics {}, contentAlignment = Alignment.Center) {
                        CompositionLocalProvider(
                            LocalTanreiContentColor provides iconColor,
                            LocalTanreiIconGlyph provides glyph,
                            LocalTanreiTextStyle provides glyph.toTextStyle(metrics.iconSize),
                        ) {
                            if (icon != null) {
                                Box(Modifier.fillMaxSize().graphicsLayer { alpha = if (filter) 1f - checkShown.value.coerceIn(0f, 1f) else 1f }, contentAlignment = Alignment.Center) { icon() }
                            }
                            if (filter) TanreiDrawnGlyph(TanreiDrawnGlyphKind.Check, glyph = system.icon.glyph(metrics.iconSize, selected = true), box = metrics.iconSize, color = iconColor, stroke = system.measure.borderThick, progress = { checkShown.value })
                        }
                    }
                }
                // CHP-17: one line, an ellipsis only when the layout gives the chip less width; the text is the name.
                BasicText(
                    text = label,
                    modifier = Modifier.layoutId(ChipSlot.Label),
                    style = labelStyle,
                    color = { labelColor.value },
                    maxLines = 1,
                    softWrap = false,
                    overflow = TextOverflow.Ellipsis,
                )
                if (input && onRemove != null) {
                    ChipRemoveAction(
                        tokens = tokens,
                        palette = tokens.variants[variant],
                        removeSource = removeSource,
                        enabled = enabled,
                        onRemove = onRemove,
                        removeContentDescription = removeContentDescription,
                        iconSize = metrics.iconSize,
                        containerSize = metrics.removeContainerSize,
                    )
                }
            }
        },
    ) { measurables, constraints ->
        // CHP-16: [start][leading][gap][label][gap][remove glyph][end], at least the size's height, padded top and
        // bottom by at least padding-block. Each end: padding-inline-with-icon beside a glyph (icon, check, remove),
        // -with-avatar beside an avatar, padding-inline beside the label. CHP-13: a filter chip without an icon grows
        // its check's room (and the padding before it) as the check shows. All logical: `placeRelative` mirrors (CHP-25).
        val shown = checkShown.value.coerceIn(0f, 1f)
        val leading = measurables.firstOrNull { it.layoutId == ChipSlot.Leading }?.measure(Constraints())
        val appearing = filter && icon == null // the check alone: its room grows and shrinks with it
        val room = when {
            leading == null -> 0f
            appearing -> leading.width * shown
            else -> leading.width.toFloat()
        }
        val gap = metrics.containerGap.toPx()
        val leadingGap = when {
            leading == null -> 0f
            appearing -> gap * shown
            else -> gap
        }
        val start = when {
            hasAvatar -> metrics.containerPaddingInlineWithAvatar.toPx()
            appearing -> lerp(metrics.containerPaddingInline.toPx(), metrics.containerPaddingInlineWithIcon.toPx(), shown)
            leading != null -> metrics.containerPaddingInlineWithIcon.toPx()
            else -> metrics.containerPaddingInline.toPx()
        }
        val iconPx = metrics.iconSize.roundToPx()
        val trailing = if (input) gap + iconPx else 0f
        val end = (if (input) metrics.containerPaddingInlineWithIcon else metrics.containerPaddingInline).toPx()
        val fixed = (start + room + leadingGap + trailing + end).roundToInt()
        val labelRoom = if (constraints.hasBoundedWidth) (constraints.maxWidth - fixed).coerceAtLeast(0) else Constraints.Infinity
        val labelPlaceable = measurables.first { it.layoutId == ChipSlot.Label }.measure(Constraints(maxWidth = labelRoom))
        val block = metrics.containerPaddingBlock.roundToPx()
        val content = maxOf(labelPlaceable.height, leading?.height ?: 0, if (input) iconPx else 0)
        val width = (fixed + labelPlaceable.width).coerceIn(constraints.minWidth, constraints.maxWidth)
        val height = maxOf(metrics.containerHeight.roundToPx(), content + 2 * block).coerceIn(constraints.minHeight, constraints.maxHeight)
        val labelX = (start + room + leadingGap).roundToInt()
        val labelEnd = labelX + labelPlaceable.width
        // CHP-18 / CHP-21: the remove glyph at the inline end; its round container centered on it; its hit area at least
        // the touch target on both axes, around the glyph: toward the label it reaches no further than the gap before
        // the glyph (it never covers the label), and outward, past the chip's edge, as far as it needs.
        val glyphCenterX = (width - end - iconPx / 2f).roundToInt()
        val visual = measurables.firstOrNull { it.layoutId == ChipSlot.RemoveVisual }?.measure(Constraints())
        val target = system.measure.targetTouch.roundToPx()
        val hitWidth = maxOf(target, visual?.width ?: 0)
        val hitHeight = maxOf(target, visual?.height ?: 0)
        val hit = measurables.firstOrNull { it.layoutId == ChipSlot.RemoveHit }?.measure(Constraints.fixed(hitWidth, hitHeight))
        layout(width, height) {
            leading?.placeRelative(start.roundToInt(), (height - leading.height) / 2)
            labelPlaceable.placeRelative(labelX, (height - labelPlaceable.height) / 2)
            visual?.placeRelative(glyphCenterX - visual.width / 2, (height - visual.height) / 2)
            hit?.placeRelative(maxOf(glyphCenterX - hitWidth / 2, labelEnd), (height - hitHeight) / 2)
        }
    }
}

/** Whether the chip itself — not its remove action — has focus (CHP-19). Read by the key handler, never drawn. */
private class ChipFocus {
    var chip: Boolean = false
}

private enum class ChipSlot { Leading, Label, RemoveVisual, RemoveHit }

/**
 * The input chip's remove action (CHP-18, CHP-20, CHP-21): two children of the chip's row. The VISUAL — the round
 * container of `removeContainerSize` / `removeContainerShape` with the close glyph, its own focus ring, ripple and dim —
 * sits on the glyph; the HIT box — the `Role.Button` node named [removeContentDescription], its own Tab stop — is at
 * least the touch target and is placed by the row, on top. Both answer the remove action's own state, drawn from the
 * variant's `remove…` parts; the chip keeps its own. A press outside the round container grows the ripple from its
 * center (the rule for every round container).
 */
@Composable
private fun ChipRemoveAction(
    tokens: TanreiChipTokens,
    palette: TanreiChipVariantTokens,
    removeSource: MutableInteractionSource,
    enabled: Boolean,
    onRemove: () -> Unit,
    removeContentDescription: String,
    iconSize: Dp,
    containerSize: Dp,
) {
    val system = TanreiTheme.tokens
    val interaction = removeSource.collectTanreiInteraction(enabled)
    val feedback = system.behavior.pressedFeedback
    val drawnStates = interaction.drawnStates(feedback)
    val motion = TanreiStateMotion(interaction.state, tokens.motionStateDuration, tokens.motionStateEasing)
    val containerColor = animateTanreiColorAsState(palette[drawnStates.container].removeContainerColor.color, motion, label = "remove-container")
    val iconColor by animateTanreiColorAsState(palette[drawnStates.content].removeIconColor.color, motion, label = "remove-icon")
    val opacity = animateFloatAsState(tokens.opacity(drawnStates.content), motion.spec(), label = "remove-opacity")
    val ripple = rememberTanreiRipple(
        feedback = feedback,
        interaction = interaction,
        color = palette.pressed.removeContainerColor.color,
        feedbackDurationMillis = tokens.motionFeedbackDuration,
        stateDurationMillis = tokens.motionStateDuration,
        stateEasing = tokens.motionStateEasing,
        centerOutsideContainer = true,
    )
    val smoothing = system.shape.cornerSmoothing
    val shape = remember(tokens.removeContainerShape, smoothing) { tanreiContainerShape(tokens.removeContainerShape, smoothing) }
    val glyph = system.icon.glyph(iconSize, selected = false)

    // The visual: dimmed as a whole under a press (`dim`), with its own focus ring (CHP-20) — decorative.
    Box(
        Modifier
            .layoutId(ChipSlot.RemoveVisual)
            .clearAndSetSemantics {}
            .tanreiGroupOpacity(overflow = tanreiDecorationOverflow(system, emptyList())) { opacity.value }
            .tanreiFocusRing(removeSource, cornerRadius = tokens.removeContainerShape)
            .tanreiContainer(shape, containerColor = { containerColor.value }, outlineColor = Color.Transparent, outlineWidth = Dp.Hairline, ripple = ripple)
            .size(containerSize),
        contentAlignment = Alignment.Center,
    ) {
        Box(Modifier.size(iconSize), contentAlignment = Alignment.Center) {
            TanreiDrawnGlyph(TanreiDrawnGlyphKind.Close, glyph = glyph, box = iconSize, color = iconColor, stroke = system.measure.borderThick, progress = { 1f })
        }
    }
    // The hit box and the element: a button of its own, reached by Tab after the chip; it never emits the chip's click.
    Box(
        Modifier
            .layoutId(ChipSlot.RemoveHit)
            .then(if (removeContentDescription.isNotBlank()) Modifier.semantics { contentDescription = removeContentDescription } else Modifier)
            .clickable(interactionSource = removeSource, indication = null, enabled = enabled, role = Role.Button, onClick = onRemove)
            .tanreiPressInput(interaction.press, enabled)
            .tanreiRippleInput(ripple),
    )
}

