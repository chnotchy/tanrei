package io.github.chnotchy.tanrei.components

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.toggleable
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.max
import io.github.chnotchy.tanrei.primitives.LocalTanreiJoinedRow
import io.github.chnotchy.tanrei.primitives.TanreiJoinedShape
import io.github.chnotchy.tanrei.primitives.TanreiReportMissingName
import io.github.chnotchy.tanrei.primitives.WithoutTanreiJoinedRow
import io.github.chnotchy.tanrei.primitives.WithoutTanreiRovingGroup
import io.github.chnotchy.tanrei.primitives.currentTanreiRovingGroup
import io.github.chnotchy.tanrei.primitives.rememberTanreiRovingEntry
import io.github.chnotchy.tanrei.primitives.tanreiRovingItem
import io.github.chnotchy.tanrei.primitives.rememberTanreiJoinedItem
import io.github.chnotchy.tanrei.primitives.tanreiJoinedTarget
import io.github.chnotchy.tanrei.primitives.TanreiReportUnknownValue
import io.github.chnotchy.tanrei.primitives.TanreiStateMotion
import io.github.chnotchy.tanrei.primitives.WithoutTanreiAnchorDescription
import io.github.chnotchy.tanrei.primitives.animateTanreiColorAsState
import io.github.chnotchy.tanrei.primitives.collectTanreiInteraction
import io.github.chnotchy.tanrei.primitives.drawnStates
import io.github.chnotchy.tanrei.primitives.rememberTanreiRipple
import io.github.chnotchy.tanrei.primitives.tanreiAnchorDescription
import io.github.chnotchy.tanrei.primitives.tanreiContainer
import io.github.chnotchy.tanrei.primitives.tanreiContainerShape
import io.github.chnotchy.tanrei.primitives.tanreiDecorationOverflow
import io.github.chnotchy.tanrei.primitives.tanreiFocusRing
import io.github.chnotchy.tanrei.primitives.tanreiGroupOpacity
import io.github.chnotchy.tanrei.primitives.tanreiPressInput
import io.github.chnotchy.tanrei.primitives.tanreiRippleInput
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph
import io.github.chnotchy.tanrei.theme.LocalTanreiTextStyle
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.glyph
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonTokens
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonVariantStateTokens
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiShadowLayer

/**
 * Performs an action, or switches something on and off, with a single icon and no visible label.
 * Implements `specs/icon-button.spec.json`. Every design value comes from the current design system's
 * [TanreiIconButtonTokens] (`TanreiTheme.tokens.iconButton`), and each interaction state is drawn from THAT state's
 * tokens: the component never computes how hovered, focused, pressed or disabled looks. It is [TanreiButton]'s chain
 * — press, ripple, focus ring, target, container, corner shape — with the icon button's own tokens.
 *
 * @param onClick called exactly once per activation (pointer, touch, Enter/Space, accessibility click) — for a
 *   toggle too, before [onCheckedChange] (ICB-11, 72092ba: click, then change, as a native checkbox).
 * @param contentDescription the accessible name (the spec's `label`). Required: an icon alone is not a name. An empty
 *   one still renders, and a debuggable app reports it (ICB-14).
 * @param modifier applied to the whole button, including the reserved minimum touch target.
 * @param variant emphasis: a key of `tokens.iconButton.variants`. [TanreiIconButtonVariant.Standard] is the quiet
 *   default for toolbars; [TanreiIconButtonVariant.Filled] marks the one most important icon action in a view. The
 *   set is open: a design system may add values.
 * @param size the visual square: a key of `tokens.iconButton.sizes`; the hit area is extended to `sys.target` on both
 *   axes without changing it. Open as well. A [variant] or [size] the current design system does not have draws with
 *   the default value's tokens, and a debuggable app reports it (ICB-7).
 * @param checked whether a toggle is on (the spec's `selected`). Ignored unless [onCheckedChange] is given.
 * @param onCheckedChange the spec's `toggle` and `change`: a non-null lambda makes the button a two-state control —
 *   activation calls it with `!checked`, it is announced with its on / off state, and it draws the `selected.` or
 *   `unselected.` parts of its variant. Null (the default): a plain action, drawn from the variant's own parts.
 * @param enabled the Compose idiom for the spec's `disabled` (inverse). When false the button does not fire, leaves
 *   the focus order and is announced as disabled.
 * @param interactionSource hoist to observe or drive hover, focus and press.
 * @param icon the icon slot: one glyph of the system's icon set, decorative to assistive technology. It is laid out
 *   in a box of the size's `icon.size` and gets [LocalTanreiContentColor] (the icon color of the state and look),
 *   [LocalTanreiIconGlyph] (family, fill, weight and optical size of the icon's selection) and a [LocalTanreiTextStyle]
 *   that draws a ligature of the icon font at the box's size — so `TanreiText("favorite")` here is the icon.
 */
@Composable
public fun TanreiIconButton(
    onClick: () -> Unit,
    contentDescription: String,
    modifier: Modifier = Modifier,
    variant: TanreiIconButtonVariant = TanreiIconButtonVariant.Standard,
    size: TanreiIconButtonSize = TanreiIconButtonSize.Medium,
    checked: Boolean = false,
    onCheckedChange: ((Boolean) -> Unit)? = null,
    enabled: Boolean = true,
    interactionSource: MutableInteractionSource? = null,
    icon: @Composable () -> Unit,
) {
    val source = interactionSource ?: remember { MutableInteractionSource() }
    val system = TanreiTheme.tokens
    val tokens = system.iconButton
    // ICB-7: both lookups are total — a value this design system does not have reads the default value's tokens.
    val metrics = tokens.sizes[size]
    if (size !in tokens.sizes) TanreiReportUnknownValue(system.id, "TanreiIconButton", "size", size.key)
    if (variant !in tokens.variants) TanreiReportUnknownValue(system.id, "TanreiIconButton", "variant", variant.key)
    // ICB-14: still rendered and still working; reported in debuggable apps.
    val named = contentDescription.isNotBlank()
    if (!named) TanreiReportMissingName("TanreiIconButton", "contentDescription")

    // ICB-12: which look of the variant is drawn — its own parts, or a toggle's `unselected.` / `selected.` parts.
    val toggle = onCheckedChange != null
    val look = when {
        !toggle -> TanreiIconButtonLook.Plain
        checked -> TanreiIconButtonLook.Selected
        else -> TanreiIconButtonLook.Unselected
    }

    // ICB-3 / ICB-6: one state wins. ICB-8: a press counts from the first frame and for at least `duration.press-hold`.
    val interaction = source.collectTanreiInteraction(enabled)
    val state = interaction.state
    // ICB-9: the pressed tokens say WHAT a press looks like; `pressed-feedback` says how it arrives — which state the
    // container color and the rest draw from. Nothing here knows which design system is active.
    val feedback = system.behavior.pressedFeedback
    val drawnStates = interaction.drawnStates(feedback)
    val palette = tokens.variants[variant]
    val drawn = palette[drawnStates.content].parts(look)

    // Entering pressed is immediate; every other change moves with the icon button's state duration and easing.
    val motion = TanreiStateMotion(state, tokens.motionStateDuration, tokens.motionStateEasing)
    val containerColor = animateTanreiColorAsState(palette[drawnStates.container].parts(look).container.color, motion, label = "container")
    val iconColor by animateTanreiColorAsState(drawn.icon.color, motion, label = "icon")
    val outlineColor by animateTanreiColorAsState(drawn.outline.color, motion, label = "outline")
    val opacity = animateFloatAsState(tokens.opacity(drawnStates.content), motion.spec(), label = "opacity")
    val cornerRadius by animateDpAsState(tokens.containerShape(drawnStates.content), motion.spec(), label = "shape")
    // ICB-10: the corners ease by the system's `corner-smoothing` amount (0 a quarter circle, 0.6 the iOS corner).
    val cornerSmoothing = system.shape.cornerSmoothing
    // ICB-10, BGR-2, BGR-3: inside a button group — an internal channel, not the icon button's public surface — a
    // connected group gives the corners that face a neighbour its inner radius and widens the container to a target.
    val row = LocalTanreiJoinedRow.current
    val joined = rememberTanreiJoinedItem()
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

    // ICB-9, ripple: the pressed container color OF THIS LOOK as a circle that grows from the point of contact over
    // the icon button's feedback duration and fades over its state duration, both with its state easing. Null unless
    // the system ripples.
    val ripple = rememberTanreiRipple(
        feedback = feedback,
        interaction = interaction,
        color = palette.pressed.parts(look).container.color,
        feedbackDurationMillis = tokens.motionFeedbackDuration,
        stateDurationMillis = tokens.motionStateDuration,
        stateEasing = tokens.motionStateEasing,
    )

    // ICB-13: the glyph of the icon's selection — selected only for a toggle that is on — at the size's icon size,
    // through THE icon helper (family, fill, weight, optical size clamped to `sys.icon.optical-size`).
    val glyph = system.icon.glyph(metrics.iconSize, selected = look == TanreiIconButtonLook.Selected)

    // ICB-1 / ICB-2 / ICB-11: a plain action is a clickable button; a toggle is a toggleable one — a button with an
    // on / off state (Role.Button, not a checkbox or a switch), which emits click and then change (72092ba).
    val input = if (onCheckedChange != null) {
        Modifier.toggleable(
            value = checked,
            interactionSource = source,
            indication = null, // No Indication: the feedback is drawn below, inside the container, from Tanrei's tokens.
            enabled = enabled,
            role = Role.Button,
            onValueChange = { value ->
                onClick()
                onCheckedChange(value)
            },
        )
    } else {
        Modifier.clickable(
            interactionSource = source,
            indication = null,
            enabled = enabled,
            role = Role.Button,
            onClick = onClick,
        )
    }

    // Order is load-bearing: the name and the input first, so the hit area and a11y bounds cover the touch target
    // (ICB-5), then the target reservation, then everything visual at the container's own size.
    val container = modifier
        // A badge (or another decorating component) wrapping this icon button adds its description here, on the node
        // that is announced (BDG-8).
        .tanreiAnchorDescription()
        .then(if (named) Modifier.semantics { this.contentDescription = contentDescription } else Modifier)
        .tanreiRovingItem(roving, rovingEntry, focusable = enabled)
        .then(input)
        // ICB-8: the pointer press itself, heard at once — `clickable` holds its own back inside a scrolling container.
        .tanreiPressInput(interaction.press, enabled)
        .tanreiRippleInput(ripple)
        .tanreiJoinedTarget(joined)
        .tanreiGroupOpacity(overflow = tanreiDecorationOverflow(system, NoElevation)) { opacity.value }
        // ICB-4: never animated; the ring follows the state's own shape, not the shape in transition.
        .tanreiFocusRing(source, cornerRadius = ringStart, endCornerRadius = ringEnd)
        .tanreiContainer(shape, containerColor = { containerColor.value }, outlineColor = outlineColor, outlineWidth = metrics.outlineWidth, ripple = ripple)
        // A square of the size's side. An icon is not text: a larger text size does not grow it. In a connected group
        // at least a target wide, the icon centred (BGR-3).
        .then(if (connected && row != null) Modifier.size(width = max(metrics.containerSize, row.minWidth), height = metrics.containerSize) else Modifier.size(metrics.containerSize))

    Box(modifier = container, contentAlignment = Alignment.Center) {
        CompositionLocalProvider(
            LocalTanreiContentColor provides iconColor,
            LocalTanreiIconGlyph provides glyph,
            LocalTanreiTextStyle provides glyph.toTextStyle(metrics.iconSize),
        ) {
            // The icon is decorative: the button's name is contentDescription, never the glyph's ligature.
            Box(Modifier.size(metrics.iconSize).clearAndSetSemantics {}, contentAlignment = Alignment.Center) { WithoutTanreiAnchorDescription { WithoutTanreiJoinedRow { WithoutTanreiRovingGroup(icon) } } }
        }
    }
}

/** An icon button draws no shadow: it has no elevation tokens. */
private val NoElevation: List<TanreiShadowLayer> = emptyList()

/**
 * The looks of one variant (ICB-12): a plain action draws the variant's own parts, a toggle that is off its
 * `unselected.` parts and a toggle that is on its `selected.` parts. A closed set, decided by the spec's props.
 */
private enum class TanreiIconButtonLook { Plain, Unselected, Selected }

/** The container, icon and outline paints of one look in one state. */
@Immutable
private class TanreiIconButtonParts(val container: TanreiPaint, val icon: TanreiPaint, val outline: TanreiPaint)

private fun TanreiIconButtonVariantStateTokens.parts(look: TanreiIconButtonLook): TanreiIconButtonParts = when (look) {
    TanreiIconButtonLook.Plain -> TanreiIconButtonParts(containerColor, iconColor, outlineColor)
    TanreiIconButtonLook.Unselected -> TanreiIconButtonParts(unselectedContainerColor, unselectedIconColor, unselectedOutlineColor)
    TanreiIconButtonLook.Selected -> TanreiIconButtonParts(selectedContainerColor, selectedIconColor, selectedOutlineColor)
}
