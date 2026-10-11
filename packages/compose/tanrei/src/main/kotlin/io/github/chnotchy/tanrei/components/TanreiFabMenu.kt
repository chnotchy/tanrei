package io.github.chnotchy.tanrei.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.isShiftPressed
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.LayoutCoordinates
import androidx.compose.ui.layout.layoutId
import androidx.compose.ui.layout.onPlaced
import androidx.compose.ui.layout.positionOnScreen
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalWindowInfo
import androidx.compose.ui.semantics.CollectionInfo
import androidx.compose.ui.semantics.CollectionItemInfo
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.collapse
import androidx.compose.ui.semantics.collectionInfo
import androidx.compose.ui.semantics.collectionItemInfo
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.expand
import androidx.compose.ui.semantics.isTraversalGroup
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntRect
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.max
import androidx.compose.ui.unit.min
import androidx.compose.ui.window.Popup
import androidx.compose.ui.window.PopupPositionProvider
import androidx.compose.ui.window.PopupProperties
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.primitives.TanreiDrawnGlyph
import io.github.chnotchy.tanrei.primitives.TanreiDrawnGlyphKind
import io.github.chnotchy.tanrei.primitives.TanreiNamedGlyph
import io.github.chnotchy.tanrei.primitives.TanreiPopupOutsidePress
import io.github.chnotchy.tanrei.primitives.TanreiReportMissingName
import io.github.chnotchy.tanrei.primitives.TanreiReportUnknownValue
import io.github.chnotchy.tanrei.primitives.TanreiRovingFocus
import io.github.chnotchy.tanrei.primitives.TanreiStateMotion
import io.github.chnotchy.tanrei.primitives.WithoutTanreiAnchorDescription
import io.github.chnotchy.tanrei.primitives.animateTanreiColorAsState
import io.github.chnotchy.tanrei.primitives.animateTanreiElevation
import io.github.chnotchy.tanrei.primitives.collectTanreiInteraction
import io.github.chnotchy.tanrei.primitives.drawnStates
import io.github.chnotchy.tanrei.primitives.isTanreiDebuggable
import io.github.chnotchy.tanrei.primitives.rememberTanreiRipple
import io.github.chnotchy.tanrei.primitives.rememberTanreiRovingEntry
import io.github.chnotchy.tanrei.primitives.rememberTanreiSelectionMotion
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
import io.github.chnotchy.tanrei.primitives.tanreiRovingItem
import io.github.chnotchy.tanrei.primitives.tanreiRovingKeys
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph
import io.github.chnotchy.tanrei.theme.LocalTanreiTextStyle
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.glyph
import io.github.chnotchy.tanrei.theme.tanreiTween
import io.github.chnotchy.tanrei.theme.toEasing
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiFabMenuSize
import io.github.chnotchy.tanrei.tokens.TanreiFabMenuTokens
import io.github.chnotchy.tanrei.tokens.TanreiFabMenuVariant
import io.github.chnotchy.tanrei.tokens.TanreiFabMenuVariantStateTokens
import io.github.chnotchy.tanrei.tokens.TanreiFabMenuVariantTokens
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiShadowLayer

/*
 * `specs/fab-menu.spec.json` (FBM-1…23) on Compose, as `platforms.compose` maps it:
 * `TanreiFabMenu(expanded, onExpandedChange, onDismissRequest, contentDescription, icon, variant, size, enabled)
 * { TanreiFabMenuItem(text, onClick, icon) }` — the toggle is a FAB (the FAB's chain with the FAB menu's own tokens)
 * laid out where the caller puts it; the items are a column in a `Popup` above it, end-aligned with it. An operated
 * overlay that is not modal, as the menu: the popup takes focus to an item and the toggle — which keeps its focus in its
 * own window — has it again when it closes; the caller closes it from `onDismissRequest`. Three looks per variant: the
 * closed toggle (the variant's plain parts), the open toggle (`open.`), the items (`item.`).
 */

/** The toggle's look (FBM-3, FBM-11): closed or open. Chosen once from the props. */
private enum class TanreiFabMenuLook { Closed, Open }

/** The container, icon and elevation of one toggle look in one state. */
private class TanreiFabMenuToggleParts(val container: TanreiPaint, val icon: TanreiPaint, val elevation: List<TanreiShadowLayer>)

private fun TanreiFabMenuVariantStateTokens.toggle(look: TanreiFabMenuLook): TanreiFabMenuToggleParts = when (look) {
    TanreiFabMenuLook.Closed -> TanreiFabMenuToggleParts(containerColor, iconColor, containerElevation)
    TanreiFabMenuLook.Open -> TanreiFabMenuToggleParts(openContainerColor, openIconColor, openContainerElevation)
}

/** Where focus goes when the items appear (FBM-13): the first item, or the last — nearest the toggle — after Up Arrow. */
private enum class TanreiFabMenuEntry { First, Last }

/** The FAB menu's own state, for its lifetime. */
@Stable
private class TanreiFabMenuState {
    /** FBM-17: Up and Down (wrapping), Home and End; every item a stop of its own; no type-ahead. */
    val roving = TanreiRovingFocus(wrap = true, allFocusable = true, typeahead = false)
    var entry by mutableStateOf(TanreiFabMenuEntry.First)
    var toggle: LayoutCoordinates? = null

    /** Which way Tab moves on from the toggle once the items have gone (FBM-15). */
    var pendingMove: FocusDirection? = null

    /** Milliseconds since the items began to open (FBM-19), and how far they are shown while closing. */
    val clock = Animatable(0f)
    val closing = Animatable(1f)

    fun toggleContains(screen: Offset): Boolean {
        val node = toggle?.takeIf { it.isAttached } ?: return false
        val origin = node.positionOnScreen()
        return screen.x >= origin.x && screen.y >= origin.y && screen.x < origin.x + node.size.width && screen.y < origin.y + node.size.height
    }
}

/** What a [TanreiFabMenuItem] learns from its FAB menu. */
private class TanreiFabMenuContext(
    val state: TanreiFabMenuState,
    val palette: TanreiFabMenuVariantTokens,
    val open: Boolean,
    val inPlace: Boolean,
    val requestClose: (TanreiMenuCloseReason) -> Unit,
)

private val LocalTanreiFabMenu = compositionLocalOf<TanreiFabMenuContext?> { null }

/**
 * A floating action button that opens a short column of related actions above it. Implements `specs/fab-menu.spec.json`.
 * Every design value comes from the current design system's [TanreiFabMenuTokens] (`TanreiTheme.tokens.fabMenu`); the
 * toggle and each item are drawn from their own interaction state. Place it as a FAB (`Scaffold`'s `floatingActionButton`
 * slot, or the inline-end bottom corner of your layout): it positions nothing itself.
 *
 * @param expanded the spec's `open`: whether the items are shown. The caller sets it from [onExpandedChange] and to false
 *   from [onDismissRequest]. While [enabled] is false no item is presented and the toggle is drawn closed.
 * @param onExpandedChange the spec's `toggle`: the toggle asks for the opposite of [expanded] (pointer, touch, Enter,
 *   Space — a press on it while open is a toggle, never a press outside), or — Down or Up Arrow on it while closed — for
 *   true (Up moves focus to the last item, the one nearest the toggle).
 * @param onDismissRequest the spec's `close`: the items ask to be closed and say why ([TanreiMenuCloseReason]: Escape,
 *   Back, Outside, Tab, FocusOut, Item); an item's `onClick` comes first, then this with [TanreiMenuCloseReason.Item].
 * @param contentDescription the spec's `label`: the toggle's name and the items' — "Create". Required; an empty one still
 *   renders, and a debuggable app reports it (FBM-23). The toggle keeps it while open; its expanded state says it is open.
 * @param icon the toggle's glyph while closed: one glyph of the system's icon set in a box of the size's `iconSize`, given
 *   the icon color of its state and look, the unselected glyph and an icon-font text style (as the FAB's slot). While
 *   open the toggle shows the icon set's close glyph instead.
 * @param modifier applied to the toggle, including the touch target it reserves.
 * @param variant a key of `tokens.fabMenu.variants` (filled, tonal, surface); open.
 * @param size a key of `tokens.fabMenu.sizes` — the toggle's size; the items keep one size. Open as well. A [variant] or
 *   [size] the system does not have draws with the default's tokens, and a debuggable app reports it (FBM-7).
 * @param enabled the Compose idiom for the spec's `disabled` (inverse). Hiding a FAB menu whose actions are unavailable is
 *   usually better.
 * @param interactionSource hoist to observe or drive the toggle's hover, focus and press.
 * @param content the `TanreiFabMenuItem`s, top to bottom: two to six of them.
 */
@Composable
public fun TanreiFabMenu(
    expanded: Boolean,
    onExpandedChange: (Boolean) -> Unit,
    onDismissRequest: (TanreiMenuCloseReason) -> Unit,
    contentDescription: String,
    icon: @Composable () -> Unit,
    modifier: Modifier = Modifier,
    variant: TanreiFabMenuVariant = TanreiFabMenuVariant.Filled,
    size: TanreiFabMenuSize = TanreiFabMenuSize.Medium,
    enabled: Boolean = true,
    interactionSource: MutableInteractionSource? = null,
    content: @Composable () -> Unit,
) {
    TanreiFabMenuImpl(expanded, onExpandedChange, onDismissRequest, contentDescription, icon, modifier, variant, size, enabled, interactionSource, inPlace = false, content = content)
}

/**
 * The FAB menu with its open items drawn in place above the toggle — no popup, no open motion, no focus moved in: the
 * test-only form FBM-13's `verify` asks for, which the baselines draw (as the menu's `TanreiMenuInPlace`).
 */
@Composable
internal fun TanreiFabMenuInPlace(
    expanded: Boolean,
    contentDescription: String,
    icon: @Composable () -> Unit,
    modifier: Modifier = Modifier,
    variant: TanreiFabMenuVariant = TanreiFabMenuVariant.Filled,
    size: TanreiFabMenuSize = TanreiFabMenuSize.Medium,
    enabled: Boolean = true,
    content: @Composable () -> Unit,
) {
    TanreiFabMenuImpl(expanded, {}, {}, contentDescription, icon, modifier, variant, size, enabled, null, inPlace = true, content = content)
}

private enum class TanreiFabMenuPart { Toggle, Items }

@Composable
private fun TanreiFabMenuImpl(
    expanded: Boolean,
    onExpandedChange: (Boolean) -> Unit,
    onDismissRequest: (TanreiMenuCloseReason) -> Unit,
    contentDescription: String,
    icon: @Composable () -> Unit,
    modifier: Modifier,
    variant: TanreiFabMenuVariant,
    size: TanreiFabMenuSize,
    enabled: Boolean,
    interactionSource: MutableInteractionSource?,
    inPlace: Boolean,
    content: @Composable () -> Unit,
) {
    val system = TanreiTheme.tokens
    val tokens = system.fabMenu
    // FBM-7: both lookups are total — a value this design system does not have reads the default value's tokens.
    val metrics = tokens.sizes[size]
    if (size !in tokens.sizes) TanreiReportUnknownValue(system.id, "TanreiFabMenu", "size", size.key)
    if (variant !in tokens.variants) TanreiReportUnknownValue(system.id, "TanreiFabMenu", "variant", variant.key)
    // FBM-23: still rendered and working; reported in debuggable apps.
    val named = contentDescription.isNotBlank()
    if (!named) TanreiReportMissingName("TanreiFabMenu", "contentDescription")
    val palette = tokens.variants[variant]
    // FBM-2: disabled draws the toggle closed and presents no item, whatever expanded says.
    val open = expanded && enabled
    val toggleOpen by rememberUpdatedState(onExpandedChange)
    val dismiss by rememberUpdatedState(onDismissRequest)
    val state = remember { TanreiFabMenuState() }
    state.roving.layoutDirection = LocalLayoutDirection.current

    // FBM-19: the items open one after another, `motionStagger` apart from the one nearest the toggle, and close together.
    var shown by remember { mutableStateOf(open) }
    val focusManager = LocalFocusManager.current
    LaunchedEffect(open) {
        if (open) {
            shown = true
            state.closing.snapTo(1f)
            state.clock.snapTo(0f)
            val total = (tokens.motionOpenDuration + tokens.motionStagger * (MAX_ITEMS - 1)).toFloat()
            state.clock.animateTo(total, tween(total.toInt(), easing = LinearEasing))
        } else if (shown) {
            state.closing.animateTo(0f, tanreiTween(tokens.motionCloseDuration, tokens.motionCloseEasing))
            shown = false
            // FBM-15: Tab and Shift+Tab move on from the toggle once the items have gone.
            state.pendingMove?.let { focusManager.moveFocus(it) }
            state.pendingMove = null
        }
    }
    val context = TanreiFabMenuContext(state, palette, open, inPlace) { reason -> dismiss(reason) }
    val items: @Composable () -> Unit = {
        TanreiFabMenuItems(state, tokens, contentDescription.takeIf { named }, context, content)
    }

    Layout(
        modifier = modifier,
        content = {
            Box(Modifier.layoutId(TanreiFabMenuPart.Toggle).onPlaced { state.toggle = it }) {
                TanreiFabMenuToggle(
                    tokens = tokens,
                    palette = palette,
                    containerSize = metrics.containerSize,
                    corner = metrics.containerShape,
                    iconSize = metrics.iconSize,
                    open = open,
                    enabled = enabled,
                    name = contentDescription.takeIf { named },
                    interactionSource = interactionSource,
                    onToggle = { value, entry ->
                        state.entry = entry
                        toggleOpen(value)
                    },
                    icon = icon,
                )
            }
            if (inPlace && open) {
                Box(Modifier.layoutId(TanreiFabMenuPart.Items)) { items() }
            } else if (!inPlace && shown) {
                TanreiFabMenuPopup(state, tokens, metrics.containerSize, onClose = { reason, move ->
                    state.pendingMove = move
                    dismiss(reason)
                }, onTogglePress = { toggleOpen(false) }, items = items)
            }
        },
    ) { measurables, constraints ->
        val toggle = measurables.first { it.layoutId == TanreiFabMenuPart.Toggle }.measure(constraints.copy(minWidth = 0, minHeight = 0))
        // In place, the items may be as wide as the layout allows (their labels wrap beyond it), as a popup's are its window.
        val column = measurables.firstOrNull { it.layoutId == TanreiFabMenuPart.Items }?.measure(Constraints(maxWidth = if (constraints.hasBoundedWidth) constraints.maxWidth else Constraints.Infinity))
        val others = measurables.filter { it.layoutId == null }.map { it.measure(Constraints()) }
        layout(toggle.width, toggle.height) {
            toggle.placeRelative(0, 0)
            // FBM-13: above the toggle's drawn top, `listOffset` apart, the items' end edges on the toggle's end edge.
            if (column != null) {
                val inset = ((toggle.width - metrics.containerSize.roundToPx()) / 2).coerceAtLeast(0)
                val insetY = ((toggle.height - metrics.containerSize.roundToPx()) / 2).coerceAtLeast(0)
                column.placeRelative(toggle.width - inset - column.width, insetY - tokens.listOffset.roundToPx() - column.height)
            }
            others.forEach { it.placeRelative(0, 0) }
        }
    }
}

/** The most items a FAB menu holds (FBM-23): the open motion's clock runs long enough for the last of six. */
private const val MAX_ITEMS = 6

/**
 * The toggle (FBM-1, FBM-8 – FBM-11, FBM-19 – FBM-21): the FAB's chain with the FAB menu's tokens, drawn from its closed
 * or open look in its state; its corners, colors and glyph change over the open (or close) motion.
 */
@Composable
private fun TanreiFabMenuToggle(
    tokens: TanreiFabMenuTokens,
    palette: TanreiFabMenuVariantTokens,
    containerSize: Dp,
    corner: Dp,
    iconSize: Dp,
    open: Boolean,
    enabled: Boolean,
    name: String?,
    interactionSource: MutableInteractionSource?,
    onToggle: (Boolean, TanreiFabMenuEntry) -> Unit,
    icon: @Composable () -> Unit,
) {
    val source = interactionSource ?: remember { MutableInteractionSource() }
    val system = TanreiTheme.tokens
    val look = if (open) TanreiFabMenuLook.Open else TanreiFabMenuLook.Closed
    // FBM-3 / FBM-8: one state wins; a press counts from the first frame and for at least press-hold.
    val interaction = source.collectTanreiInteraction(enabled)
    // FBM-9: the pressed tokens say WHAT a press looks like; `pressed-feedback` says how it arrives.
    val feedback = system.behavior.pressedFeedback
    val drawnStates = interaction.drawnStates(feedback)
    val drawn = palette[drawnStates.content].toggle(look)
    // FBM-21: a change of state moves over the state motion; FBM-19: opening moves over the open motion, closing over the
    // close motion. At once where motion is reduced.
    val stateMotion = TanreiStateMotion(interaction.state, tokens.motionStateDuration, tokens.motionStateEasing)
    val lookMotion = rememberTanreiSelectionMotion(
        look,
        stateMotion,
        if (open) tokens.motionOpenDuration else tokens.motionCloseDuration,
        if (open) tokens.motionOpenEasing else tokens.motionCloseEasing,
    )
    val lookSpec = tanreiTween<Float>(if (open) tokens.motionOpenDuration else tokens.motionCloseDuration, if (open) tokens.motionOpenEasing else tokens.motionCloseEasing)
    val containerColor = animateTanreiColorAsState(palette[drawnStates.container].toggle(look).container.color, lookMotion, label = "container")
    val iconColor by animateTanreiColorAsState(drawn.icon.color, lookMotion, label = "icon")
    val opacity = animateFloatAsState(tokens.opacity(drawnStates.content), stateMotion.spec(), label = "opacity")
    val elevation = animateTanreiElevation(drawn.elevation, lookMotion.spec())
    // FBM-11: the size's corners closed, `containerShapeOpen` open (no rounder than a circle), eased by corner smoothing.
    val openCorner = min(tokens.containerShapeOpen, containerSize / 2)
    val cornerRadius by animateDpAsState(if (open) openCorner else corner, tanreiTween(if (open) tokens.motionOpenDuration else tokens.motionCloseDuration, if (open) tokens.motionOpenEasing else tokens.motionCloseEasing), label = "shape")
    val smoothing = system.shape.cornerSmoothing
    val shape = remember(cornerRadius, smoothing) { tanreiContainerShape(cornerRadius, smoothing) }
    // FBM-19: the glyph cross-fades to the close glyph.
    val closeShown = animateFloatAsState(if (open) 1f else 0f, lookSpec, label = "glyph")
    // FBM-9, ripple: the pressed container color of the toggle's look, from the point of contact.
    val ripple = rememberTanreiRipple(
        feedback = feedback,
        interaction = interaction,
        color = palette.pressed.toggle(look).container.color,
        feedbackDurationMillis = tokens.motionFeedbackDuration,
        stateDurationMillis = tokens.motionStateDuration,
        stateEasing = tokens.motionStateEasing,
    )
    val glyph = system.icon.glyph(iconSize, selected = false)
    val toggle = Modifier
        .tanreiAnchorDescription()
        // FBM-20: a button named by label that opens a menu (expand / collapse: Compose has no has-popup property).
        .semantics {
            if (name != null) contentDescription = name
            if (enabled) {
                if (open) collapse { onToggle(false, TanreiFabMenuEntry.First); true } else expand { onToggle(true, TanreiFabMenuEntry.First); true }
            }
        }
        // FBM-1: Down or Up Arrow on the closed toggle opens it — Up with focus on the last item.
        .onKeyEvent { event ->
            if (!enabled || open || (event.key != Key.DirectionDown && event.key != Key.DirectionUp)) return@onKeyEvent false
            if (event.type == KeyEventType.KeyDown) onToggle(true, if (event.key == Key.DirectionUp) TanreiFabMenuEntry.Last else TanreiFabMenuEntry.First)
            true
        }
        // FBM-1 / FBM-2: a button; disabled it emits nothing, leaves the focus order and is announced disabled.
        .clickable(interactionSource = source, indication = null, enabled = enabled, role = Role.Button) { onToggle(!open, TanreiFabMenuEntry.First) }
        .tanreiPressInput(interaction.press, enabled)
        .tanreiRippleInput(ripple)
        // FBM-5: the target on both axes.
        .tanreiMinimumTouchTarget()
        .tanreiGroupOpacity(overflow = tanreiDecorationOverflow(system, drawn.elevation)) { opacity.value }
        // FBM-4: never animated.
        .tanreiFocusRing(source, cornerRadius = if (open) openCorner else corner)
        // FBM-21: outside the container, never clipped.
        .tanreiElevation(elevation, shape)
        .tanreiContainer(shape, containerColor = { containerColor.value }, outlineColor = Color.Transparent, outlineWidth = Dp.Hairline, ripple = ripple)
        .size(containerSize)
    Box(toggle, contentAlignment = Alignment.Center) {
        Box(Modifier.size(iconSize).clearAndSetSemantics {}, contentAlignment = Alignment.Center) {
            Box(Modifier.fillMaxSize().graphicsLayer { alpha = 1f - closeShown.value.coerceIn(0f, 1f) }, contentAlignment = Alignment.Center) {
                CompositionLocalProvider(
                    LocalTanreiContentColor provides iconColor,
                    LocalTanreiIconGlyph provides glyph,
                    LocalTanreiTextStyle provides glyph.toTextStyle(iconSize),
                ) { WithoutTanreiAnchorDescription(icon) }
            }
            Box(Modifier.fillMaxSize().graphicsLayer { alpha = closeShown.value.coerceIn(0f, 1f) }) {
                TanreiDrawnGlyph(TanreiDrawnGlyphKind.Close, glyph = glyph, box = iconSize, color = iconColor, stroke = system.measure.borderThick, progress = { 1f })
            }
        }
    }
}

/**
 * FBM-13 – FBM-15: the items' popup — focusable (an operated overlay), no scrim — placed with its bottom `listOffset`
 * above the toggle's drawn top and its end edge on the toggle's. It moves focus in, hears Escape, Back and Tab, closes on
 * a press outside (a press on the toggle is the toggle's) and when focus leaves its window.
 */
@Composable
private fun TanreiFabMenuPopup(
    state: TanreiFabMenuState,
    tokens: TanreiFabMenuTokens,
    containerSize: Dp,
    onClose: (TanreiMenuCloseReason, FocusDirection?) -> Unit,
    onTogglePress: () -> Unit,
    items: @Composable () -> Unit,
) {
    val density = androidx.compose.ui.platform.LocalDensity.current
    val close by rememberUpdatedState(onClose)
    val provider = remember(containerSize, tokens.listOffset, density) {
        TanreiFabMenuPositionProvider(with(density) { containerSize.roundToPx() }, with(density) { tokens.listOffset.roundToPx() })
    }
    Popup(
        popupPositionProvider = provider,
        onDismissRequest = { close(TanreiMenuCloseReason.Outside, null) },
        properties = PopupProperties(focusable = true, dismissOnBackPress = false, dismissOnClickOutside = true),
    ) {
        // FBM-15: a press on the toggle while open is the toggle's, not a press outside.
        TanreiPopupOutsidePress { screen ->
            if (state.toggleContains(screen)) {
                onTogglePress()
                true
            } else {
                false
            }
        }
        // FBM-15: focus leaving the items' window (to another window) closes it — once the window has had focus.
        val window = LocalWindowInfo.current
        LaunchedEffect(window) {
            var focused = false
            snapshotFlow { window.isWindowFocused }.collect { now ->
                if (now) focused = true else if (focused) close(TanreiMenuCloseReason.FocusOut, null)
            }
        }
        // FBM-13: focus to the first item, or the last after Up Arrow.
        LaunchedEffect(state) {
            withFrameNanos { }
            val ordered = state.roving.ordered
            (if (state.entry == TanreiFabMenuEntry.Last) ordered.lastOrNull() else ordered.firstOrNull())?.let { state.roving.focus(it) }
        }
        Box(
            Modifier
                .onPreviewKeyEvent { event ->
                    if (event.type != KeyEventType.KeyDown) return@onPreviewKeyEvent event.key == Key.Escape || event.key == Key.Back || event.key == Key.Tab
                    when (event.key) {
                        Key.Escape -> close(TanreiMenuCloseReason.Escape, null).let { true }
                        Key.Back -> close(TanreiMenuCloseReason.Back, null).let { true }
                        Key.Tab -> close(TanreiMenuCloseReason.Tab, if (event.isShiftPressed) FocusDirection.Previous else FocusDirection.Next).let { true }
                        else -> false
                    }
                },
        ) { items() }
    }
}

/** FBM-13 / FBM-22 as a [PopupPositionProvider]: above the toggle's drawn square, end edges aligned. */
private class TanreiFabMenuPositionProvider(private val containerSize: Int, private val offset: Int) : PopupPositionProvider {
    override fun calculatePosition(anchorBounds: IntRect, windowSize: IntSize, layoutDirection: LayoutDirection, popupContentSize: IntSize): IntOffset {
        // The anchor is the toggle's layout, the touch target included: its drawn square is centred in it.
        val insetX = ((anchorBounds.width - containerSize) / 2).coerceAtLeast(0)
        val insetY = ((anchorBounds.height - containerSize) / 2).coerceAtLeast(0)
        val x = if (layoutDirection == LayoutDirection.Rtl) anchorBounds.left + insetX else anchorBounds.right - insetX - popupContentSize.width
        val y = anchorBounds.top + insetY - offset - popupContentSize.height
        return IntOffset(x, y)
    }
}

/**
 * The items' column (FBM-13, FBM-17, FBM-20): top to bottom, `listGap` apart, each end-aligned; a traversal group named by
 * the label with its items as a collection (Compose has no menu role); Up, Down, Home and End move among them.
 */
@Composable
private fun TanreiFabMenuItems(state: TanreiFabMenuState, tokens: TanreiFabMenuTokens, label: String?, context: TanreiFabMenuContext, content: @Composable () -> Unit) {
    val count = state.roving.size
    TanreiReportFabMenuCount(state.roving)
    Column(
        Modifier
            .semantics {
                isTraversalGroup = true
                if (label != null) contentDescription = label
                collectionInfo = CollectionInfo(rowCount = count, columnCount = 1)
            }
            .tanreiRovingKeys(state.roving),
        verticalArrangement = Arrangement.spacedBy(tokens.listGap),
        horizontalAlignment = Alignment.End,
    ) {
        CompositionLocalProvider(LocalTanreiFabMenu provides context, content = content)
    }
}

/**
 * One action of a [TanreiFabMenu] (the spec's item kind `item`): an icon and a label on a raised container. Call it in
 * the FAB menu's content lambda.
 *
 * @param text the spec's `label`: the item's text and accessible name; it wraps rather than truncate. Required; an empty
 *   one still renders, and a debuggable app reports it (FBM-23).
 * @param onClick the spec's `click`: the item was activated (pointer, touch, Enter, Space, an assistive technology's
 *   click); then the FAB menu's `onDismissRequest` is called with [TanreiMenuCloseReason.Item] (FBM-16).
 * @param icon the spec's `icon`: the NAME of the item's glyph in the system's icon set (its ligature), drawn at
 *   `itemIconSize` with the unselected glyph through the icon helper, decorative. Required; an empty one is reported.
 * @param modifier applied to the item's container, which is its hit area.
 * @param interactionSource hoist to observe or drive the item's hover, focus and press.
 */
@Composable
public fun TanreiFabMenuItem(
    text: String,
    onClick: () -> Unit,
    icon: String,
    modifier: Modifier = Modifier,
    interactionSource: MutableInteractionSource? = null,
) {
    val menu = LocalTanreiFabMenu.current
    val source = interactionSource ?: remember { MutableInteractionSource() }
    val system = TanreiTheme.tokens
    val tokens = system.fabMenu
    val palette = menu?.palette ?: tokens.variants.filled
    // FBM-23: still rendered and working; reported in debuggable apps.
    if (text.isBlank()) TanreiReportMissingName("TanreiFabMenuItem", "text", what = "an item without a label")
    if (icon.isBlank()) TanreiReportFabMenuProblem("TanreiFabMenuItem \"$text\": its icon is empty; an item has an icon and a label.")
    val roving = menu?.state?.roving
    val entry = rememberTanreiRovingEntry(roving, focusable = true, enabled = true, selected = false, text = text)
    val index = entry?.let { roving?.indexOf(it) } ?: -1
    val count = roving?.size ?: 0

    // FBM-3 / FBM-9: the item's own state, from its item parts.
    val interaction = source.collectTanreiInteraction(true)
    val feedback = system.behavior.pressedFeedback
    val drawnStates = interaction.drawnStates(feedback)
    val drawn = palette[drawnStates.content]
    val motion = TanreiStateMotion(interaction.state, tokens.motionStateDuration, tokens.motionStateEasing)
    val containerColor = animateTanreiColorAsState(palette[drawnStates.container].itemContainerColor.color, motion, label = "container")
    val labelColor = animateTanreiColorAsState(drawn.itemLabelColor.color, motion, label = "label")
    val iconColor by animateTanreiColorAsState(drawn.itemIconColor.color, motion, label = "icon")
    val opacity = animateFloatAsState(tokens.opacity(drawnStates.content), motion.spec(), label = "opacity")
    val elevation = animateTanreiElevation(drawn.itemContainerElevation, motion.spec())
    val smoothing = system.shape.cornerSmoothing
    val shape = remember(tokens.itemShape, smoothing) { tanreiContainerShape(tokens.itemShape, smoothing) }
    val ripple = rememberTanreiRipple(
        feedback = feedback,
        interaction = interaction,
        color = palette.pressed.itemContainerColor.color,
        feedbackDurationMillis = tokens.motionFeedbackDuration,
        stateDurationMillis = tokens.motionStateDuration,
        stateEasing = tokens.motionStateEasing,
    )
    // FBM-19: fade and grow in from the end edge, the item nearest the toggle first, each next `motionStagger` later;
    // leave together. In place (the baselines) and where motion is reduced: shown at once.
    val openEasing = remember(tokens.motionOpenEasing) { tokens.motionOpenEasing.toEasing() }
    val rtl = LocalLayoutDirection.current == LayoutDirection.Rtl
    val shown: () -> Float = {
        when {
            menu == null || menu.inPlace -> 1f
            !menu.open -> menu.state.closing.value
            // Until it knows its place among the items it cannot know its delay: not shown yet.
            index < 0 -> 0f
            else -> {
                val delay = tokens.motionStagger * ((count - 1 - index).coerceAtLeast(0))
                openEasing.transform(((menu.state.clock.value - delay) / tokens.motionOpenDuration.coerceAtLeast(1)).coerceIn(0f, 1f))
            }
        }
    }
    val glyph = system.icon.glyph(tokens.itemIconSize, selected = false)
    val item = modifier
        .graphicsLayer {
            val value = shown()
            alpha = value
            scaleX = value
            scaleY = value
            transformOrigin = TransformOrigin(if (rtl) 0f else 1f, 0.5f)
        }
        .tanreiRovingItem(roving, entry, focusable = true)
        // FBM-20: a menu item named by its label (merged from the text), with its position among the items.
        .semantics { if (index >= 0) collectionItemInfo = CollectionItemInfo(rowIndex = index, rowSpan = 1, columnIndex = 0, columnSpan = 1) }
        // FBM-16: the item's click, then close with the reason Item.
        .clickable(interactionSource = source, indication = null, role = Role.Button) {
            onClick()
            menu?.requestClose?.invoke(TanreiMenuCloseReason.Item)
        }
        .tanreiPressInput(interaction.press)
        .tanreiRippleInput(ripple)
        .tanreiGroupOpacity(overflow = tanreiDecorationOverflow(system, drawn.itemContainerElevation)) { opacity.value }
        // FBM-4: never animated.
        .tanreiFocusRing(source, cornerRadius = tokens.itemShape)
        // FBM-18: the item elevation, outside the container, never clipped.
        .tanreiElevation(elevation, shape)
        .tanreiContainer(shape, containerColor = { containerColor.value }, outlineColor = Color.Transparent, outlineWidth = Dp.Hairline, ripple = ripple)
        // FBM-5 / FBM-18: at least the item height and the touch target tall; the whole container is the hit area.
        .defaultMinSize(minHeight = max(tokens.itemHeight, system.measure.targetTouch))
        .padding(start = tokens.itemPaddingInlineStart, end = tokens.itemPaddingInlineEnd)
    Row(item, horizontalArrangement = Arrangement.spacedBy(tokens.itemGap), verticalAlignment = Alignment.CenterVertically) {
        TanreiNamedGlyph(icon, glyph, tokens.itemIconSize, iconColor)
        BasicText(text, style = tokens.itemLabelTypescale.toTextStyle(), color = { labelColor.value })
    }
}

/** Debuggable apps only (FBM-23): one report per message and composition site. */
@Composable
private fun TanreiReportFabMenuProblem(message: String) {
    if (!isTanreiDebuggable()) return
    remember(message) { TanreiDiagnostics.reporter(message) }
}

/** Debuggable apps only (FBM-23): a FAB menu of fewer than two or more than six items, once they have registered. */
@Composable
private fun TanreiReportFabMenuCount(roving: TanreiRovingFocus) {
    if (!isTanreiDebuggable()) return
    val reported = remember { mutableSetOf<Int>() }
    LaunchedEffect(roving) {
        withFrameNanos { }
        snapshotFlow { roving.size }.collect { count ->
            if ((count < 2 || count > MAX_ITEMS) && reported.add(count)) TanreiDiagnostics.reporter("TanreiFabMenu: it holds $count items; a FAB menu holds two to six.")
        }
    }
}
