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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.layoutId
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.util.lerp
import io.github.chnotchy.tanrei.primitives.TanreiReportInvalidValue
import io.github.chnotchy.tanrei.primitives.TanreiReportMissingName
import io.github.chnotchy.tanrei.primitives.TanreiReportUnknownValue
import io.github.chnotchy.tanrei.primitives.TanreiStateMotion
import io.github.chnotchy.tanrei.primitives.TanreiText
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
import io.github.chnotchy.tanrei.theme.tanreiTween
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiExtendedFabSize
import io.github.chnotchy.tanrei.tokens.TanreiExtendedFabTokens
import io.github.chnotchy.tanrei.tokens.TanreiExtendedFabVariant
import kotlin.math.roundToInt

/**
 * The floating action button with its name written out: a label, an optional leading icon, on a raised container that
 * floats above the content, collapsing to a square that holds only the icon. Implements `specs/extended-fab.spec.json`.
 * Every design value comes from the current design system's [TanreiExtendedFabTokens] (`TanreiTheme.tokens.extendedFab`),
 * and each interaction state is drawn from THAT state's tokens, the elevation included. It is [TanreiButton]'s chain —
 * press, ripple, focus ring, target, elevation, container, corner shape — with its own tokens and Button's geometry
 * (paddings, gap, a label style per size), plus the collapse.
 *
 * It does not position itself (EFB-17): put it where the screen layout wants it (the inline-end bottom corner of a
 * `Box`, a scaffold's `floatingActionButton` slot). Which edge stays in place while it collapses is the layout's too.
 *
 * @param text the label (the spec's `label`): drawn in the size's label style and the state's label color, and the
 *   accessible name — also while collapsed, when it is not drawn. An empty one still renders, and a debuggable app
 *   reports it (EFB-19). It never truncates: it wraps when the layout gives it less width, and the container grows.
 * @param onClick called exactly once per activation (pointer, touch, Enter/Space, accessibility click).
 * @param modifier applied to the whole button, including the reserved minimum touch target.
 * @param variant emphasis: a key of `tokens.extendedFab.variants` (`Filled`, the default; `Tonal`; `Surface`), with the
 *   FAB's meanings. Open: a design system may add values.
 * @param size the visual height: a key of `tokens.extendedFab.sizes` (`Small`, `Medium`, `Large`: the FAB's sides, so a
 *   collapsed one matches the FAB of its size); the hit area is extended to `sys.target` without changing it. A
 *   [variant] or [size] the current design system does not have draws with the default value's tokens, and a
 *   debuggable app reports it (EFB-7).
 * @param expanded shows the label. False collapses it to a square of the size's height holding only [icon], over
 *   `motionResizeDuration` with `motionResizeEasing`, fading the label out (EFB-13, EFB-14). Without an [icon] it stays
 *   expanded, and a debuggable app reports it (EFB-15).
 * @param enabled the Compose idiom for the spec's `disabled` (inverse). When false the button does not fire, leaves
 *   the focus order and is announced as disabled.
 * @param icon the optional leading icon: one glyph of the system's icon set, decorative, drawn in the label color. It
 *   is laid out in a box of the size's `iconSize` and gets [LocalTanreiContentColor], [LocalTanreiIconGlyph] (the
 *   unselected glyph) and a [LocalTanreiTextStyle] that draws a ligature of the icon font at the box's size.
 * @param interactionSource hoist to observe or drive hover, focus and press.
 */
@Composable
public fun TanreiExtendedFloatingActionButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: TanreiExtendedFabVariant = TanreiExtendedFabVariant.Filled,
    size: TanreiExtendedFabSize = TanreiExtendedFabSize.Medium,
    expanded: Boolean = true,
    enabled: Boolean = true,
    icon: (@Composable () -> Unit)? = null,
    interactionSource: MutableInteractionSource? = null,
) {
    val component = "TanreiExtendedFloatingActionButton"
    val source = interactionSource ?: remember { MutableInteractionSource() }
    val system = TanreiTheme.tokens
    val tokens = system.extendedFab
    // EFB-7: both lookups are total — a value this design system does not have reads the default value's tokens.
    val metrics = tokens.sizes[size]
    if (size !in tokens.sizes) TanreiReportUnknownValue(system.id, component, "size", size.key)
    if (variant !in tokens.variants) TanreiReportUnknownValue(system.id, component, "variant", variant.key)
    // EFB-19: still rendered and still working; reported in debuggable apps.
    val named = text.isNotBlank()
    if (!named) TanreiReportMissingName(component, "text", what = "a container without a label")
    // EFB-15: it collapses to its icon; without one it stays expanded.
    val hasIcon = icon != null
    if (!expanded && !hasIcon) TanreiReportInvalidValue(component, "expanded", "false", "cannot collapse without an icon", "expanded")
    val showsLabel = expanded || !hasIcon

    // EFB-3 / EFB-6: one state wins. EFB-8: a press counts from the first frame and for at least `duration.press-hold`.
    val interaction = source.collectTanreiInteraction(enabled)
    val state = interaction.state
    // EFB-9: the pressed tokens say WHAT a press looks like; `pressed-feedback` says how it arrives.
    val feedback = system.behavior.pressedFeedback
    val drawnStates = interaction.drawnStates(feedback)
    val palette = tokens.variants[variant]
    val drawn = palette[drawnStates.content]

    // EFB-16: entering pressed is immediate; every other change — colors, opacity and the shadow — moves with the
    // state duration and easing (at once where motion is reduced: the animator duration scale reaches every animation).
    val motion = TanreiStateMotion(state, tokens.motionStateDuration, tokens.motionStateEasing)
    val containerColor = animateTanreiColorAsState(palette[drawnStates.container].containerColor.color, motion, label = "container")
    val labelColor by animateTanreiColorAsState(drawn.labelColor.color, motion, label = "label")
    val opacity = animateFloatAsState(tokens.opacity(drawnStates.content), motion.spec(), label = "opacity")
    val elevation = animateTanreiElevation(drawn.containerElevation, motion.spec())
    // EFB-14: 1 is the expanded form, 0 the collapsed square — the width, the icon's place and the label's opacity move
    // together over the resize motion (its easing may overshoot, as a spring does: the width follows, the fade does not).
    val form = animateFloatAsState(if (showsLabel) 1f else 0f, tanreiTween(tokens.motionResizeDuration, tokens.motionResizeEasing), label = "form")
    // EFB-10 / EFB-11: the size's own corner, eased by the system's `corner-smoothing` amount.
    val cornerRadius = metrics.containerShape
    val cornerSmoothing = system.shape.cornerSmoothing
    val shape = remember(cornerRadius, cornerSmoothing) { tanreiContainerShape(cornerRadius, cornerSmoothing) }

    // EFB-9, ripple: the pressed container color as a circle that grows from the point of contact over the feedback
    // duration and fades over the state duration, both with the state easing. Null unless the system ripples.
    val ripple = rememberTanreiRipple(
        feedback = feedback,
        interaction = interaction,
        color = palette.pressed.containerColor.color,
        feedbackDurationMillis = tokens.motionFeedbackDuration,
        stateDurationMillis = tokens.motionStateDuration,
        stateEasing = tokens.motionStateEasing,
    )

    // EFB-12: an unselected glyph at the size's icon size, through THE icon helper, in the label color.
    val glyph = system.icon.glyph(metrics.iconSize, selected = false)
    val labelStyle = metrics.labelTypescale.toTextStyle()

    // Order is load-bearing: the name and the input first, so the hit area and a11y bounds cover the touch target
    // (EFB-5), then the target reservation, then everything visual at the container's own size; the shadow (EFB-16) is
    // drawn outside the container, never clipped. The content is clipped to the container's shape, so a label sliding
    // out while it collapses never draws outside it.
    val container = modifier
        .tanreiAnchorDescription()
        // EFB-13: the label is the name, drawn or collapsed away.
        .then(if (named) Modifier.semantics { this.contentDescription = text } else Modifier)
        // EFB-1 / EFB-2: a button; disabled leaves the focus order and is announced as disabled.
        .clickable(
            interactionSource = source,
            indication = null, // No Indication: the feedback is drawn below, inside the container, from Tanrei's tokens.
            enabled = enabled,
            role = Role.Button,
            onClick = onClick,
        )
        // EFB-8: the pointer press itself, heard at once.
        .tanreiPressInput(interaction.press, enabled)
        .tanreiRippleInput(ripple)
        .tanreiMinimumTouchTarget()
        .tanreiGroupOpacity(overflow = tanreiDecorationOverflow(system, drawn.containerElevation)) { opacity.value }
        // EFB-4: never animated.
        .tanreiFocusRing(source, cornerRadius = cornerRadius)
        .tanreiElevation(elevation, shape)
        // No outline part: a floating, shadowed container needs no border.
        .tanreiContainer(shape, containerColor = { containerColor.value }, outlineColor = Color.Transparent, outlineWidth = Dp.Hairline, ripple = ripple)
        .clip(shape)

    Layout(
        modifier = container,
        content = {
            WithoutTanreiAnchorDescription {
                if (icon != null) {
                    // The icon is decorative: the button's name is the label, never the glyph's ligature.
                    Box(Modifier.layoutId(IconSlot).size(metrics.iconSize).clearAndSetSemantics {}, contentAlignment = Alignment.Center) {
                        CompositionLocalProvider(
                            LocalTanreiContentColor provides labelColor,
                            LocalTanreiIconGlyph provides glyph,
                            LocalTanreiTextStyle provides glyph.toTextStyle(metrics.iconSize),
                            content = icon,
                        )
                    }
                }
                // The label's own text is not announced again: the button is named by it already.
                Box(Modifier.layoutId(LabelSlot).graphicsLayer { alpha = form.value.coerceIn(0f, 1f) }.clearAndSetSemantics {}) {
                    CompositionLocalProvider(LocalTanreiContentColor provides labelColor, LocalTanreiTextStyle provides labelStyle) {
                        TanreiText(text)
                    }
                }
            }
        },
    ) { measurables, constraints ->
        // EFB-11: [start padding][icon][gap][label][end padding], at least the size's height, padded top and bottom by
        // at least padding-block, and as wide as that content. EFB-13: collapsed, a square of the size's height with
        // the icon centered. Every length is logical: `placeRelative` mirrors the row in right-to-left (EFB-18).
        val progress = form.value
        val iconPlaceable = measurables.firstOrNull { it.layoutId == IconSlot }?.let { val px = metrics.iconSize.roundToPx(); it.measure(Constraints.fixed(px, px)) }
        val start = (if (iconPlaceable != null) metrics.containerPaddingInlineStartWithIcon else metrics.containerPaddingInlineStart).roundToPx()
        val end = metrics.containerPaddingInlineEnd.roundToPx()
        val gap = if (iconPlaceable != null) metrics.containerGap.roundToPx() else 0
        val block = metrics.containerPaddingBlock.roundToPx()
        val side = metrics.containerHeight.roundToPx()
        val iconWidth = iconPlaceable?.width ?: 0
        val iconHeight = iconPlaceable?.height ?: 0
        // EFB-12: the label wraps rather than truncates when the layout gives the button less width than it needs.
        val labelRoom = if (constraints.hasBoundedWidth) (constraints.maxWidth - start - iconWidth - gap - end).coerceAtLeast(0) else Constraints.Infinity
        val labelPlaceable = measurables.first { it.layoutId == LabelSlot }.measure(Constraints(maxWidth = labelRoom))
        val expandedWidth = start + iconWidth + gap + labelPlaceable.width + end
        val expandedHeight = maxOf(side, maxOf(labelPlaceable.height, iconHeight) + 2 * block)
        val formWidth = lerp(side.toFloat(), expandedWidth.toFloat(), progress).roundToInt().coerceAtLeast(0)
        val formHeight = lerp(side.toFloat(), expandedHeight.toFloat(), progress.coerceIn(0f, 1f)).roundToInt()
        val width = formWidth.coerceIn(constraints.minWidth, constraints.maxWidth)
        val height = formHeight.coerceIn(constraints.minHeight, constraints.maxHeight)
        // A width imposed by the caller centers the content, as Button's row does.
        val offset = (width - formWidth) / 2
        layout(width, height) {
            val iconX = offset + lerp(((side - iconWidth) / 2).toFloat(), start.toFloat(), progress).roundToInt()
            iconPlaceable?.placeRelative(iconX, (height - iconHeight) / 2)
            val labelX = if (iconPlaceable != null) iconX + iconWidth + gap else offset + start
            labelPlaceable.placeRelative(labelX, (height - labelPlaceable.height) / 2)
        }
    }
}

private const val IconSlot = "icon"
private const val LabelSlot = "label"
