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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.layout.LayoutCoordinates
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.Measurable
import androidx.compose.ui.layout.MeasurePolicy
import androidx.compose.ui.layout.MeasureResult
import androidx.compose.ui.layout.MeasureScope
import androidx.compose.ui.layout.onPlaced
import androidx.compose.ui.layout.positionOnScreen
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.collapse
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.expand
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.primitives.TanreiDrawnGlyph
import io.github.chnotchy.tanrei.primitives.TanreiDrawnGlyphKind
import io.github.chnotchy.tanrei.primitives.TanreiJoinedItem
import io.github.chnotchy.tanrei.primitives.TanreiReportMissingName
import io.github.chnotchy.tanrei.primitives.TanreiReportUnknownValue
import io.github.chnotchy.tanrei.primitives.TanreiStateMotion
import io.github.chnotchy.tanrei.primitives.TanreiText
import io.github.chnotchy.tanrei.primitives.WithoutTanreiAnchorDescription
import io.github.chnotchy.tanrei.primitives.animateTanreiColorAsState
import io.github.chnotchy.tanrei.primitives.animateTanreiElevation
import io.github.chnotchy.tanrei.primitives.collectTanreiInteraction
import io.github.chnotchy.tanrei.primitives.drawnStates
import io.github.chnotchy.tanrei.primitives.isTanreiDebuggable
import io.github.chnotchy.tanrei.primitives.rememberTanreiRipple
import io.github.chnotchy.tanrei.primitives.tanreiAnchorDescription
import io.github.chnotchy.tanrei.primitives.tanreiContainer
import io.github.chnotchy.tanrei.primitives.tanreiDecorationOverflow
import io.github.chnotchy.tanrei.primitives.tanreiElevation
import io.github.chnotchy.tanrei.primitives.tanreiFocusRing
import io.github.chnotchy.tanrei.primitives.tanreiGroupOpacity
import io.github.chnotchy.tanrei.primitives.tanreiJoinedReach
import io.github.chnotchy.tanrei.primitives.tanreiJoinedTarget
import io.github.chnotchy.tanrei.primitives.tanreiPressInput
import io.github.chnotchy.tanrei.primitives.tanreiRippleInput
import io.github.chnotchy.tanrei.primitives.tanreiSideCornerShape
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph
import io.github.chnotchy.tanrei.theme.LocalTanreiTextStyle
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.glyph
import io.github.chnotchy.tanrei.theme.tanreiTween
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiSplitButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiSplitButtonSizeTokens
import io.github.chnotchy.tanrei.tokens.TanreiSplitButtonTokens
import io.github.chnotchy.tanrei.tokens.TanreiSplitButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiSplitButtonVariantTokens

/*
 * `specs/split-button.spec.json` (SPB-1…20) on Compose, as `platforms.compose` maps it:
 * `TanreiSplitButton(text, onClick, menuContentDescription, menuExpanded, onMenuExpandedChange, onMenuDismissRequest,
 * variant, size, enabled, icon) { TanreiMenuItem(…) }` — the content lambda is the menu's, presented in a `TanreiMenu`
 * popup anchored to the whole split button at `BottomEnd`. Two halves, each [TanreiButton]'s chain (press and press-hold,
 * pressed feedback and ripple, keyboard focus ring, target, elevation, container, eased corners) with the split button's
 * own tokens and its OWN interaction state: the leading half holds the icon and the label, the trailing half
 * the chevron and the menu. They meet `containerInnerGap` apart with `containerInnerShape` corners; while the menu is open
 * the trailing half's inner corners are `containerInnerShapeOpen` and its chevron points up. The halves' hit areas are
 * `tanreiJoinedTarget`'s (the button group's): each reaches the touch target outward and above and below, and toward the
 * other half no further than the middle of the gap.
 */

/** Where the trailing half is on the screen: a press there while the menu is open is the trailing half's (SPB-16). */
@Stable
private class TanreiSplitTrailing {
    var coordinates: LayoutCoordinates? = null

    fun contains(screen: Offset): Boolean {
        val node = coordinates?.takeIf { it.isAttached } ?: return false
        val origin = node.positionOnScreen()
        return screen.x >= origin.x && screen.y >= origin.y && screen.x < origin.x + node.size.width && screen.y < origin.y + node.size.height
    }
}

/**
 * Performs a main action with one press, and offers related actions in a menu that its joined trailing half opens.
 * Implements `specs/split-button.spec.json`. Every design value comes from the current design system's
 * [TanreiSplitButtonTokens] (`TanreiTheme.tokens.splitButton`), and each half is drawn from its OWN interaction state's
 * tokens of the variant. The menu is a Tanrei Menu of [menuContent]; the caller keeps whether it is open (state hoisting).
 *
 * @param text the spec's `label`: the leading half's text and accessible name. Required; an empty one still renders, and
 *   a debuggable app reports it (SPB-20). It stays on one line while it fits and wraps rather than truncate.
 * @param onClick the spec's `click`: the leading half was activated (pointer, touch, Enter, Space, an assistive
 *   technology's click). It never opens or closes the menu.
 * @param menuContentDescription the spec's `menuLabel`: the trailing half's accessible name ("More save options").
 *   Required — the chevron alone is no name; an empty one still renders, and a debuggable app reports it.
 * @param menuExpanded the spec's `open`: whether the menu is shown. The caller sets it from [onMenuExpandedChange] and to
 *   false from [onMenuDismissRequest]. While [enabled] is false no menu is presented and the closed form is drawn.
 * @param onMenuExpandedChange the spec's `toggle`: the trailing half asks for the opposite of [menuExpanded] (pointer,
 *   touch, Enter, Space; a press on it while the menu is open is a toggle, never a press outside), or — Down Arrow on it
 *   while closed — for true.
 * @param onMenuDismissRequest the spec's `close`: the menu asks to be closed and says why ([TanreiMenuCloseReason]); an
 *   action item's `onClick` comes first, then this with [TanreiMenuCloseReason.Item].
 * @param modifier applied to the split button, including the touch targets it reserves.
 * @param variant a key of `tokens.splitButton.variants` (filled, tonal, elevated, outlined); open.
 * @param size a key of `tokens.splitButton.sizes` (small, medium, large at Button's heights); open. A [variant] or [size]
 *   the system does not have draws with the default's tokens, and a debuggable app reports it (SPB-8).
 * @param enabled the Compose idiom for the spec's `disabled` (inverse): both halves are announced disabled, leave the
 *   focus order and emit nothing, and no menu is presented.
 * @param icon the leading half's icon slot: a glyph of the system's icon set, before the label, in a box of the size's
 *   `iconSize`, given the leading half's label color, the unselected glyph and an icon-font text style. Decorative.
 * @param interactionSource hoist to observe or drive the leading half's hover, focus and press.
 * @param menuInteractionSource the same for the trailing half.
 * @param menuContent the spec's `menu` slot: the menu's own items — `TanreiMenuItem`, `TanreiCheckboxMenuItem`,
 *   `TanreiMenuGroup` with `TanreiRadioMenuItem`s. With none, no menu is presented, and a debuggable app reports it.
 */
@Composable
public fun TanreiSplitButton(
    text: String,
    onClick: () -> Unit,
    menuContentDescription: String,
    menuExpanded: Boolean,
    onMenuExpandedChange: (Boolean) -> Unit,
    onMenuDismissRequest: (TanreiMenuCloseReason) -> Unit,
    modifier: Modifier = Modifier,
    variant: TanreiSplitButtonVariant = TanreiSplitButtonVariant.Filled,
    size: TanreiSplitButtonSize = TanreiSplitButtonSize.Medium,
    enabled: Boolean = true,
    icon: (@Composable () -> Unit)? = null,
    interactionSource: MutableInteractionSource? = null,
    menuInteractionSource: MutableInteractionSource? = null,
    menuContent: @Composable () -> Unit,
) {
    val system = TanreiTheme.tokens
    val tokens = system.splitButton
    // SPB-8: both lookups are total — a value this design system does not have reads the default value's tokens.
    val metrics = tokens.sizes[size]
    if (size !in tokens.sizes) TanreiReportUnknownValue(system.id, "TanreiSplitButton", "size", size.key)
    if (variant !in tokens.variants) TanreiReportUnknownValue(system.id, "TanreiSplitButton", "variant", variant.key)
    // SPB-20: still rendered and working; each half without a name is reported in debuggable apps.
    if (text.isBlank()) TanreiReportMissingName("TanreiSplitButton", "text", what = "a split button without a label")
    if (menuContentDescription.isBlank()) TanreiReportMissingName("TanreiSplitButton", "menuContentDescription", what = "a chevron alone")
    val palette = tokens.variants[variant]

    // SPB-3: disabled presents no menu and draws the closed form, whatever menuExpanded says.
    val open = menuExpanded && enabled
    val toggle by rememberUpdatedState(onMenuExpandedChange)
    val dismiss by rememberUpdatedState(onMenuDismissRequest)
    // SPB-13: the trailing half's inner corners and its chevron move over the open motion (at once where motion is reduced).
    val openInner by animateDpAsState(if (open) tokens.containerInnerShapeOpen else tokens.containerInnerShape, tanreiTween(tokens.motionOpenDuration, tokens.motionOpenEasing), label = "open-shape")
    val turn = animateFloatAsState(if (open) HALF_TURN else 0f, tanreiTween(tokens.motionOpenDuration, tokens.motionOpenEasing), label = "chevron")

    // SPB-20: a menu slot with no item presents no menu (and is reported); known once the items have registered.
    var menuEmpty by remember { mutableStateOf(false) }
    LaunchedEffect(open) { if (!open) menuEmpty = false }
    if (menuEmpty) TanreiReportSplitButtonProblem("TanreiSplitButton: the menu slot holds no item; no menu is presented.")

    val leading = remember { TanreiJoinedItem() }
    val trailing = remember { TanreiJoinedItem() }
    val trailingPlace = remember { TanreiSplitTrailing() }
    val leadingStart = if (icon != null) metrics.leadingPaddingInlineStartWithIcon else metrics.leadingPaddingInlineStart

    Layout(
        modifier = modifier,
        content = {
            // SPB-1 / SPB-17: the leading half — a button named by its label.
            TanreiSplitHalf(
                item = leading,
                tokens = tokens,
                metrics = metrics,
                palette = palette,
                enabled = enabled,
                interactionSource = interactionSource,
                outerAtStart = true,
                innerRadius = tokens.containerInnerShape,
                paddingStart = leadingStart,
                paddingEnd = metrics.leadingPaddingInlineEnd,
                name = null,
                onActivate = onClick,
                keys = Modifier,
                extra = Modifier,
            ) { labelColor ->
                if (icon != null) {
                    val glyph = system.icon.glyph(metrics.iconSize, selected = false)
                    Box(Modifier.size(metrics.iconSize).clearAndSetSemantics {}, contentAlignment = Alignment.Center) {
                        CompositionLocalProvider(
                            LocalTanreiContentColor provides labelColor,
                            LocalTanreiIconGlyph provides glyph,
                            LocalTanreiTextStyle provides glyph.toTextStyle(metrics.iconSize),
                        ) { WithoutTanreiAnchorDescription(icon) }
                    }
                }
                TanreiText(text, color = labelColor, style = metrics.labelTypescale.toTextStyle())
            }
            // SPB-2 / SPB-17: the trailing half — a menu button named by menuLabel, expanded or collapsed.
            TanreiSplitHalf(
                item = trailing,
                tokens = tokens,
                metrics = metrics,
                palette = palette,
                enabled = enabled,
                interactionSource = menuInteractionSource,
                outerAtStart = false,
                innerRadius = openInner,
                paddingStart = metrics.trailingPaddingInline,
                paddingEnd = metrics.trailingPaddingInline,
                name = menuContentDescription.takeUnless { it.isBlank() },
                onActivate = { toggle(!open) },
                // SPB-2: Down Arrow on the trailing half opens a closed menu.
                keys = Modifier.onKeyEvent { event ->
                    if (!enabled || open || event.key != Key.DirectionDown) return@onKeyEvent false
                    if (event.type == KeyEventType.KeyDown) toggle(true)
                    true
                },
                extra = Modifier
                    .onPlaced { trailingPlace.coordinates = it }
                    .semantics {
                        if (enabled) {
                            if (open) collapse { toggle(false); true } else expand { toggle(true); true }
                        }
                    },
            ) { labelColor ->
                // SPB-14 / SPB-19: the icon set's keyboard_arrow_down, never mirrored; SPB-13: half a turn while open.
                Box(Modifier.size(metrics.iconSize).clearAndSetSemantics {}.graphicsLayer { rotationZ = turn.value }, contentAlignment = Alignment.Center) {
                    TanreiDrawnGlyph(TanreiDrawnGlyphKind.ChevronDown, glyph = system.icon.glyph(metrics.iconSize, selected = false), box = metrics.iconSize, color = labelColor, stroke = system.measure.borderThick, progress = { 1f })
                }
            }
            // SPB-15 / SPB-16: the menu, a Tanrei Menu anchored to the whole split button, end-aligned below it.
            TanreiMenuPopup(
                expanded = open && !menuEmpty,
                onDismissRequest = { reason -> dismiss(reason) },
                placement = TanreiMenuPlacement.BottomEnd,
                onItemCount = { count -> menuEmpty = count == 0 },
                // SPB-16: a press on the trailing half while open is a toggle, not a press outside.
                onOutsidePress = { screen ->
                    if (trailingPlace.contains(screen)) {
                        toggle(false)
                        true
                    } else {
                        false
                    }
                },
                content = menuContent,
            )
        },
        measurePolicy = remember(leading, trailing, tokens.containerInnerGap, system.measure.targetTouch) {
            TanreiSplitButtonPolicy(leading, trailing, tokens.containerInnerGap, system.measure.targetTouch)
        },
    )
}

private const val HALF_TURN = 180f

/**
 * One half: [TanreiButton]'s chain with the split button's tokens and its own interaction state. [outerAtStart]: the
 * leading half — the variant's corner at the start and [innerRadius] at the end; the trailing half the other way round.
 */
@Composable
private fun TanreiSplitHalf(
    item: TanreiJoinedItem,
    tokens: TanreiSplitButtonTokens,
    metrics: TanreiSplitButtonSizeTokens,
    palette: TanreiSplitButtonVariantTokens,
    enabled: Boolean,
    interactionSource: MutableInteractionSource?,
    outerAtStart: Boolean,
    innerRadius: Dp,
    paddingStart: Dp,
    paddingEnd: Dp,
    name: String?,
    onActivate: () -> Unit,
    keys: Modifier,
    extra: Modifier,
    content: @Composable RowScope.(labelColor: androidx.compose.ui.graphics.Color) -> Unit,
) {
    val source = interactionSource ?: remember { MutableInteractionSource() }
    val system = TanreiTheme.tokens
    // SPB-4 / SPB-7 / SPB-9: this half's one state; a press counts from the first frame and for at least press-hold.
    val interaction = source.collectTanreiInteraction(enabled)
    // SPB-10: the pressed tokens say WHAT a press looks like; `pressed-feedback` says how it arrives.
    val feedback = system.behavior.pressedFeedback
    val drawnStates = interaction.drawnStates(feedback)
    val drawn = palette[drawnStates.content]
    // SPB-18: a change of state moves over the state motion (entering pressed snaps).
    val motion = TanreiStateMotion(interaction.state, tokens.motionStateDuration, tokens.motionStateEasing)
    val containerColor = animateTanreiColorAsState(palette[drawnStates.container].containerColor.color, motion, label = "container")
    val labelColor by animateTanreiColorAsState(drawn.labelColor.color, motion, label = "label")
    val outlineColor by animateTanreiColorAsState(drawn.outlineColor.color, motion, label = "outline")
    val opacity = animateFloatAsState(tokens.opacity(drawnStates.content), motion.spec(), label = "opacity")
    val elevation = animateTanreiElevation(drawn.containerElevation, motion.spec())
    val outer by animateDpAsState(tokens.containerShape(drawnStates.content), motion.spec(), label = "shape")
    // SPB-11 / SPB-13: the outer corners are the variant's, the inner ones the join's; both eased by corner smoothing.
    val smoothing = system.shape.cornerSmoothing
    val startRadius = if (outerAtStart) outer else innerRadius
    val endRadius = if (outerAtStart) innerRadius else outer
    val shape = remember(startRadius, endRadius, smoothing) { tanreiSideCornerShape(startRadius, endRadius, smoothing) }
    val resting = tokens.containerShape(drawnStates.content)
    // SPB-10, ripple: the pressed container color of the variant, from the point of contact (the centre for a key).
    val ripple = rememberTanreiRipple(
        feedback = feedback,
        interaction = interaction,
        color = palette.pressed.containerColor.color,
        feedbackDurationMillis = tokens.motionFeedbackDuration,
        stateDurationMillis = tokens.motionStateDuration,
        stateEasing = tokens.motionStateEasing,
    )
    val half = Modifier
        .tanreiAnchorDescription()
        .then(if (name != null) Modifier.semantics { contentDescription = name } else Modifier)
        .then(extra)
        .then(keys)
        // SPB-1 / SPB-2 / SPB-3: a button; disabled, it emits nothing, leaves the focus order and is announced disabled.
        .clickable(interactionSource = source, indication = null, enabled = enabled, role = Role.Button, onClick = onActivate)
        .tanreiPressInput(interaction.press, enabled)
        .tanreiRippleInput(ripple)
        // SPB-6: the touch target, outward and above and below; toward the other half only to the middle of the gap.
        .tanreiJoinedTarget(item)
        .tanreiGroupOpacity(overflow = tanreiDecorationOverflow(system, drawn.containerElevation)) { opacity.value }
        // SPB-5: around this half's own shape; never animated.
        .tanreiFocusRing(source, cornerRadius = if (outerAtStart) resting else innerRadius, endCornerRadius = if (outerAtStart) innerRadius else resting)
        // SPB-18: this half's elevation, outside it, never clipped.
        .tanreiElevation(elevation, shape)
        // SPB-13: fill, state layer and ripple clipped to the half's shape; its outline inside its edge.
        .tanreiContainer(shape, containerColor = { containerColor.value }, outlineColor = outlineColor, outlineWidth = metrics.outlineWidth, ripple = ripple)
        .defaultMinSize(minHeight = metrics.containerHeight)
        .padding(start = paddingStart, top = metrics.containerPaddingBlock, end = paddingEnd, bottom = metrics.containerPaddingBlock)
    CompositionLocalProvider(LocalTanreiContentColor provides labelColor, LocalTanreiTextStyle provides metrics.labelTypescale.toTextStyle()) {
        Row(
            modifier = half,
            horizontalArrangement = Arrangement.spacedBy(metrics.containerGap, Alignment.CenterHorizontally),
            verticalAlignment = Alignment.CenterVertically,
        ) { content(labelColor) }
    }
}

/**
 * SPB-6 / SPB-12 / SPB-19: the two halves in one row, [gap] apart between their visible bounds. The leading half is as
 * wide as its content (less when the layout gives less: its label wraps), the trailing half its chevron and padding; both
 * as tall as the taller one (a wrapped label grows them together). Each half's hit area reaches the touch target
 * outward and above and below, and toward the other half no further than the middle of the gap. Placed from the start
 * edge (right-to-left puts the trailing half on the left). The menu's popup takes no room.
 */
private class TanreiSplitButtonPolicy(
    private val leading: TanreiJoinedItem,
    private val trailing: TanreiJoinedItem,
    private val gap: Dp,
    private val target: Dp,
) : MeasurePolicy {
    override fun MeasureScope.measure(measurables: List<Measurable>, constraints: Constraints): MeasureResult {
        val lead = measurables[0]
        val trail = measurables[1]
        val rest = measurables.drop(2)
        val gapPx = gap.roundToPx()
        val targetPx = target.roundToPx()
        lead.maxIntrinsicWidth(Constraints.Infinity)
        trail.maxIntrinsicWidth(Constraints.Infinity)
        val trailWidth = trailing.visualMaxWidth
        val (trailStart, trailEnd) = tanreiJoinedReach(trailWidth, targetPx, gapPx - gapPx / 2, Int.MAX_VALUE)
        var leadWidth = leading.visualMaxWidth
        var (leadStart, leadEnd) = tanreiJoinedReach(leadWidth, targetPx, Int.MAX_VALUE, gapPx / 2)
        if (constraints.hasBoundedWidth) {
            val room = constraints.maxWidth - leadStart - gapPx - trailWidth - trailEnd
            if (leadWidth > room) {
                leadWidth = room.coerceAtLeast(0)
                val reach = tanreiJoinedReach(leadWidth, targetPx, Int.MAX_VALUE, gapPx / 2)
                leadStart = reach.first
                leadEnd = reach.second
            }
        }
        leading.reachStart = leadStart
        leading.reachEnd = leadEnd
        trailing.reachStart = trailStart
        trailing.reachEnd = trailEnd
        // Both halves as tall as the taller visible one.
        lead.minIntrinsicHeight(leadWidth + leadStart + leadEnd)
        trail.minIntrinsicHeight(trailWidth + trailStart + trailEnd)
        val stretch = maxOf(leading.visualHeight, trailing.visualHeight)
        val leadPlaceable = lead.measure(Constraints(maxWidth = leadWidth + leadStart + leadEnd, minHeight = stretch))
        val trailPlaceable = trail.measure(Constraints(maxWidth = trailWidth + trailStart + trailEnd, minHeight = stretch))
        val others = rest.map { it.measure(Constraints()) }
        val trailLeft = leadPlaceable.width - leadEnd + gapPx - trailStart
        val width = trailLeft + trailPlaceable.width
        val height = maxOf(leadPlaceable.height, trailPlaceable.height)
        return layout(width, height) {
            leadPlaceable.placeRelative(0, (height - leadPlaceable.height) / 2)
            trailPlaceable.placeRelative(trailLeft, (height - trailPlaceable.height) / 2)
            others.forEach { it.placeRelative(0, 0) }
        }
    }
}

/** Debuggable apps only (SPB-20): one report per message and composition site. */
@Composable
private fun TanreiReportSplitButtonProblem(message: String) {
    if (!isTanreiDebuggable()) return
    remember(message) { TanreiDiagnostics.reporter(message) }
}
