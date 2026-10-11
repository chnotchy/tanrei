package io.github.chnotchy.tanrei.components

import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.rememberTransition
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.State
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.isShiftPressed
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.Placeable
import androidx.compose.ui.layout.layoutId
import androidx.compose.ui.layout.onPlaced
import androidx.compose.ui.layout.positionInRoot
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalWindowInfo
import androidx.compose.ui.semantics.CollectionInfo
import androidx.compose.ui.semantics.CollectionItemInfo
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.collectionInfo
import androidx.compose.ui.semantics.collectionItemInfo
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.isTraversalGroup
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntRect
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.max
import androidx.compose.ui.window.Popup
import androidx.compose.ui.window.PopupPositionProvider
import androidx.compose.ui.window.PopupProperties
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.primitives.TanreiPopupOutsidePress
import io.github.chnotchy.tanrei.primitives.TanreiInteraction
import io.github.chnotchy.tanrei.primitives.TanreiReportMissingName
import io.github.chnotchy.tanrei.primitives.TanreiRovingFocus
import io.github.chnotchy.tanrei.primitives.TanreiStateMotion
import io.github.chnotchy.tanrei.primitives.TanreiText
import io.github.chnotchy.tanrei.primitives.animateTanreiColorAsState
import io.github.chnotchy.tanrei.primitives.collectTanreiInteraction
import io.github.chnotchy.tanrei.primitives.drawnStates
import io.github.chnotchy.tanrei.primitives.isDrawn
import io.github.chnotchy.tanrei.primitives.isTanreiDebuggable
import io.github.chnotchy.tanrei.primitives.rememberTanreiRipple
import io.github.chnotchy.tanrei.primitives.rememberTanreiRovingEntry
import io.github.chnotchy.tanrei.primitives.rememberTanreiRovingFocus
import io.github.chnotchy.tanrei.primitives.rememberTanreiSelectionMotion
import io.github.chnotchy.tanrei.primitives.tanreiCheckPath
import io.github.chnotchy.tanrei.primitives.tanreiContainer
import io.github.chnotchy.tanrei.primitives.tanreiContainerShape
import io.github.chnotchy.tanrei.primitives.tanreiElevation
import io.github.chnotchy.tanrei.primitives.tanreiFocusRing
import io.github.chnotchy.tanrei.primitives.tanreiGroupOpacity
import io.github.chnotchy.tanrei.primitives.tanreiPressInput
import io.github.chnotchy.tanrei.primitives.tanreiRippleInput
import io.github.chnotchy.tanrei.primitives.tanreiRovingItem
import io.github.chnotchy.tanrei.primitives.tanreiRovingKeys
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph
import io.github.chnotchy.tanrei.theme.LocalTanreiTextStyle
import io.github.chnotchy.tanrei.theme.TanreiIconGlyph
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.glyph
import io.github.chnotchy.tanrei.theme.tanreiTween
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiMenuCondition
import io.github.chnotchy.tanrei.tokens.TanreiMenuTokens
import kotlin.math.roundToInt

/*
 * `specs/menu.spec.json` (MNU-1…29) on Compose, as `platforms.compose` maps it — `DropdownMenu`'s idiom:
 * `TanreiMenu(expanded, onDismissRequest, placement) { TanreiMenuItem(text, onClick, …); TanreiMenuGroup { … } }` inside
 * the anchor's `Box`, shown in a `Popup`. The menu is an operated, non-modal overlay: it takes focus to its
 * first enabled item when it opens, and the anchor — which keeps its focus in its own window meanwhile — has it again
 * when it closes. The caller closes it: `onDismissRequest` carries the reason. The four item kinds are the
 * composables `TanreiMenuItem`, `TanreiCheckboxMenuItem`, `TanreiRadioMenuItem` and `TanreiMenuGroup`, called in the
 * content lambda. Every design value comes from the current design system's [TanreiMenuTokens]
 * (`TanreiTheme.tokens.menu`); an item is [TanreiButton]'s chain — press and press-hold, pressed feedback and ripple,
 * keyboard focus ring (inside the row), container, corner smoothing — with the menu's tokens, drawn from the condition
 * (`unselected`, `selected`, `destructive`) and state it is in. The rows' structure is the list item's;
 * the keyboard is the list's (`TanreiRovingFocus`), wrapping.
 */

/**
 * The spec's `placement`: where the surface goes against the anchor — below it ([BottomStart], the default, and
 * [BottomEnd]) or above it, with its start or end edge aligned to the anchor's (start and end follow the layout
 * direction). The menu flips to the other side when this side has no room. Closed: every value the spec defines is
 * here, so no unknown one can be passed (MNU-14).
 */
public enum class TanreiMenuPlacement { BottomStart, BottomEnd, TopStart, TopEnd }

/**
 * Why the menu asks to be closed (the spec's `close` event, MNU-5, MNU-6): its reasons `escape`, `back`, `outside`,
 * `tab`, `focus-out` and `item`, in Kotlin's casing.
 */
public enum class TanreiMenuCloseReason {
    /** Escape. */
    Escape,

    /** The platform's back. */
    Back,

    /** A press outside the surface. The press does not reach what is under it. */
    Outside,

    /** Tab or Shift+Tab: focus then moves on from the anchor as it would have from it. */
    Tab,

    /** Focus left the menu's window. */
    FocusOut,

    /** An item was activated (an action, or a checkbox or radio item by pointer, touch or Enter). */
    Item,
}

/** Which way Tab moves on from the anchor once the menu has closed. */
private class PendingMove {
    var direction: FocusDirection? = null
}

/** The rows' shared columns (MNU-19): reserved while ANY item of the menu has a mark or a leading icon. */
@Stable
private class MenuColumns {
    private val marks = mutableStateMapOf<Any, Boolean>()
    private val icons = mutableStateMapOf<Any, Boolean>()
    val mark: Boolean by derivedStateOf { marks.values.any { it } }
    val icon: Boolean by derivedStateOf { icons.values.any { it } }

    fun set(key: Any, mark: Boolean, icon: Boolean) {
        if (marks[key] != mark) marks[key] = mark
        if (icons[key] != icon) icons[key] = icon
    }

    fun remove(key: Any) {
        marks.remove(key)
        icons.remove(key)
    }
}

/** The surface's top-level elements — items outside any group, and groups — in reading order (MNU-23's dividers). */
@Stable
private class MenuElements {
    class Element(val serial: Int) {
        var top by mutableFloatStateOf(0f)
        var group by mutableStateOf(false)
    }

    private var serials = 0
    private val elements = mutableStateListOf<Element>()
    private val ordered: List<Element> by derivedStateOf { elements.sortedWith(compareBy<Element>({ it.top }, { it.serial })) }

    fun newElement() = Element(serials++)

    fun add(element: Element) {
        elements += element
    }

    fun remove(element: Element) {
        elements -= element
    }

    /** A divider goes above [element] when it or the element before it is a group — never above the first. */
    fun dividerAbove(element: Element): Boolean {
        val here = ordered.indexOf(element)
        if (here <= 0) return false
        return element.group || ordered[here - 1].group
    }
}

/** What an item learns from the menu around it. */
private class TanreiMenuContext(
    val roving: TanreiRovingFocus,
    val columns: MenuColumns,
    val elements: MenuElements,
    val requestClose: (TanreiMenuCloseReason) -> Unit,
)

/** What a radio item learns from its group (MNU-6, MNU-29). */
private class TanreiMenuGroupContext(
    val selectedValue: String?,
    val onSelectedValueChange: (String) -> Unit,
    val radios: MutableMap<Any, String>,
)

private val LocalTanreiMenu = compositionLocalOf<TanreiMenuContext?> { null }
private val LocalTanreiMenuGroup = compositionLocalOf<TanreiMenuGroupContext?> { null }

/**
 * Shows a short list of actions or options on a surface that opens from the product's anchor. Implements
 * `specs/menu.spec.json`. Call it inside the anchor's `Box`, as `DropdownMenu`: the surface is placed against that
 * `Box` in a `Popup`, above everything else.
 *
 * @param expanded the spec's `open`. The caller opens the menu from its anchor and closes it when [onDismissRequest]
 *   asks: Compose's idiom leaves closing to the caller (MNU-5).
 * @param onDismissRequest the spec's `close`: the menu asks to be closed, and says why — [TanreiMenuCloseReason]. Set
 *   [expanded] to false. Called once per request.
 * @param modifier applied to the surface.
 * @param placement the spec's `placement` (default [TanreiMenuPlacement.BottomStart]); the surface flips to the other
 *   side of the anchor when this one has no room, shifts to stay `surfaceViewportMargin` inside the window, limits its
 *   height to the room left (its items then scroll) and follows the anchor (MNU-2).
 * @param content the items: `TanreiMenuItem`, `TanreiCheckboxMenuItem`, `TanreiRadioMenuItem` (in a `TanreiMenuGroup`)
 *   and `TanreiMenuGroup`, in order.
 */
@Composable
public fun TanreiMenu(
    expanded: Boolean,
    onDismissRequest: (TanreiMenuCloseReason) -> Unit,
    modifier: Modifier = Modifier,
    placement: TanreiMenuPlacement = TanreiMenuPlacement.BottomStart,
    content: @Composable () -> Unit,
) {
    TanreiMenuPopup(expanded = expanded, onDismissRequest = onDismissRequest, modifier = modifier, placement = placement, content = content)
}

/**
 * [TanreiMenu], with what a component that presents a menu of its own needs (a split button's, SPB-15, SPB-16, SPB-20):
 * [onItemCount] hears how many items the menu holds once they have registered, and again when that changes, and while it
 * holds none the surface is not drawn; [onOutsidePress] hears a press outside the surface first, with its position on the
 * screen, and when it answers true the press is the component's — no close is asked for (a press on the split button's
 * trailing half toggles rather than closes). Both null: exactly [TanreiMenu].
 */
@Composable
internal fun TanreiMenuPopup(
    expanded: Boolean,
    onDismissRequest: (TanreiMenuCloseReason) -> Unit,
    modifier: Modifier = Modifier,
    placement: TanreiMenuPlacement = TanreiMenuPlacement.BottomStart,
    onItemCount: ((Int) -> Unit)? = null,
    onOutsidePress: ((Offset) -> Boolean)? = null,
    content: @Composable () -> Unit,
) {
    val tokens = TanreiTheme.tokens.menu
    val state = remember { MutableTransitionState(false) }
    state.targetState = expanded
    val dismiss by rememberUpdatedState(onDismissRequest)
    // MNU-5: Tab and Shift+Tab move on from the anchor once the menu is gone. The anchor kept its focus in this window
    // while the popup held focus in its own.
    val pending = remember { PendingMove() }
    val focusManager = LocalFocusManager.current
    val gone = !state.currentState && !state.targetState
    LaunchedEffect(gone) {
        if (gone) pending.direction?.let { focusManager.moveFocus(it) }
        pending.direction = null
    }
    if (gone) return

    val density = androidx.compose.ui.platform.LocalDensity.current
    val position = remember { MenuPosition() }
    val provider = remember(placement, tokens.surfaceOffset, tokens.surfaceViewportMargin, density) {
        TanreiMenuPositionProvider(
            placement = placement,
            offset = with(density) { tokens.surfaceOffset.roundToPx() },
            margin = with(density) { tokens.surfaceViewportMargin.roundToPx() },
            position = position,
        )
    }
    Popup(
        popupPositionProvider = provider,
        // MNU-5: a press outside the surface closes the menu; Popup consumes that press. Back is heard with the other keys.
        onDismissRequest = { dismiss(TanreiMenuCloseReason.Outside) },
        properties = PopupProperties(focusable = true, dismissOnBackPress = false, dismissOnClickOutside = true),
    ) {
        val shown = rememberTanreiMenuShown(state, tokens)
        val opening = state.targetState
        if (onOutsidePress != null) TanreiPopupOutsidePress(onOutsidePress)
        // MNU-5: focus leaving the menu's window (to another window) closes it — once the window has had focus.
        val window = LocalWindowInfo.current
        LaunchedEffect(window) {
            var focused = false
            snapshotFlow { window.isWindowFocused }.collect { now ->
                if (now) focused = true else if (focused && state.targetState) dismiss(TanreiMenuCloseReason.FocusOut)
            }
        }
        TanreiMenuSurface(
            onClose = { reason, move ->
                pending.direction = move
                dismiss(reason)
            },
            moveFocusIn = true,
            maxHeight = position.room,
            onItemCount = onItemCount,
            modifier = modifier.graphicsLayer {
                val value = shown.value.coerceIn(0f, 1f)
                alpha = value
                // Grows only while opening; a closing menu only fades.
                scaleY = if (opening) value else 1f
                transformOrigin = TransformOrigin(pivotFractionX = 0.5f, pivotFractionY = if (position.below) 0f else 1f)
            },
            content = content,
        )
    }
}

/**
 * MNU-4's timing: how far the menu is shown, 0 to 1 — rising over `motionOpenDuration` with `motionOpenEasing` while
 * [state] opens, falling over `motionCloseDuration` with `motionCloseEasing` while it closes; at once where motion is
 * reduced (the animator duration scale reaches the transition too). The popup fades by it, and grows by it from the
 * edge that faces the anchor while opening.
 */
@Composable
internal fun rememberTanreiMenuShown(state: MutableTransitionState<Boolean>, tokens: TanreiMenuTokens): State<Float> {
    val transition = rememberTransition(state, label = "menu")
    return transition.animateFloat(
        transitionSpec = {
            if (targetState) tanreiTween(tokens.motionOpenDuration, tokens.motionOpenEasing) else tanreiTween(tokens.motionCloseDuration, tokens.motionCloseEasing)
        },
        label = "shown",
    ) { open -> if (open) 1f else 0f }
}

/**
 * The open surface drawn where it is composed — no anchor, no placement, no popup, no open motion: the test-only
 * in-place form MNU-19's `verify` asks for, which the baselines and most behaviour tests draw. [onDismissRequest] hears
 * what `TanreiMenu`'s would; [maxHeight] (pixels) is the room a popup would leave. Focus is not moved in.
 */
@Composable
internal fun TanreiMenuInPlace(
    onDismissRequest: (TanreiMenuCloseReason) -> Unit = {},
    modifier: Modifier = Modifier,
    maxHeight: Int = Int.MAX_VALUE,
    content: @Composable () -> Unit,
) {
    val dismiss by rememberUpdatedState(onDismissRequest)
    TanreiMenuSurface(onClose = { reason, _ -> dismiss(reason) }, moveFocusIn = false, maxHeight = maxHeight, onItemCount = null, modifier = modifier, content = content)
}

/** The resolved side (read when drawing the open motion) and the room left for the surface's height (MNU-2). */
@Stable
internal class MenuPosition {
    var below: Boolean = true
    var room: Int by mutableIntStateOf(Int.MAX_VALUE)
}

/**
 * MNU-2's placement as a [PopupPositionProvider]: [tanreiMenuPosition] for the popup, and the room it leaves — the larger
 * of the two sides, inside the margin — for the surface's height, so a surface too tall for its side flips or scrolls.
 */
internal class TanreiMenuPositionProvider(
    private val placement: TanreiMenuPlacement,
    private val offset: Int,
    private val margin: Int,
    private val position: MenuPosition,
) : PopupPositionProvider {
    override fun calculatePosition(anchorBounds: IntRect, windowSize: IntSize, layoutDirection: LayoutDirection, popupContentSize: IntSize): IntOffset {
        val resolved = tanreiMenuPosition(placement, anchorBounds, windowSize, layoutDirection, popupContentSize, offset, margin)
        position.below = resolved.below
        val room = maxOf(windowSize.height - margin - (anchorBounds.bottom + offset), anchorBounds.top - offset - margin).coerceAtLeast(0)
        if (position.room != room) position.room = room
        return resolved.offset
    }
}

/** Where the surface goes, and whether it ended up below the anchor. */
internal data class TanreiMenuResolvedPosition(val offset: IntOffset, val below: Boolean)

/**
 * MNU-2, as a pure function of the window's pixels: [offset] from the anchor on the side [placement] names, flipped to
 * the other side when that side has less room than the surface needs (inside [margin] of the window's edge) and the
 * other side has more; the start or end edges aligned (start is the left edge left-to-right, the right edge
 * right-to-left); then shifted along the anchor to stay [margin] inside the window.
 */
internal fun tanreiMenuPosition(
    placement: TanreiMenuPlacement,
    anchor: IntRect,
    window: IntSize,
    direction: LayoutDirection,
    surface: IntSize,
    offset: Int,
    margin: Int,
): TanreiMenuResolvedPosition {
    val roomBelow = window.height - margin - (anchor.bottom + offset)
    val roomAbove = anchor.top - offset - margin
    val prefersBelow = placement == TanreiMenuPlacement.BottomStart || placement == TanreiMenuPlacement.BottomEnd
    val below = if (prefersBelow) {
        !(surface.height > roomBelow && roomAbove > roomBelow)
    } else {
        surface.height > roomAbove && roomBelow > roomAbove
    }
    val y = if (below) anchor.bottom + offset else anchor.top - offset - surface.height
    val start = placement == TanreiMenuPlacement.BottomStart || placement == TanreiMenuPlacement.TopStart
    val leftAligned = start == (direction == LayoutDirection.Ltr)
    val x = if (leftAligned) anchor.left else anchor.right - surface.width
    val maxX = window.width - margin - surface.width
    val shifted = if (maxX >= margin) x.coerceIn(margin, maxX) else margin
    return TanreiMenuResolvedPosition(IntOffset(shifted, y), below)
}

/**
 * The surface (MNU-3): `surfaceColor` at `surfaceElevation`, rounded by `surfaceShape` eased by corner smoothing, as wide
 * as its widest item between `surfaceMinWidth` and `surfaceMaxWidth`, its items inset by the surface's padding, clipped
 * to its shape, and scrolling beyond [maxHeight] pixels. It hears Escape, Back, Tab and the arrow keys (MNU-5, MNU-7),
 * exposes its items as a collection (MNU-24), and — [moveFocusIn] — moves focus to the first enabled item (MNU-1).
 */
@Composable
private fun TanreiMenuSurface(
    onClose: (TanreiMenuCloseReason, FocusDirection?) -> Unit,
    moveFocusIn: Boolean,
    maxHeight: Int,
    onItemCount: ((Int) -> Unit)?,
    modifier: Modifier,
    content: @Composable () -> Unit,
) {
    val system = TanreiTheme.tokens
    val tokens = system.menu
    val roving = rememberTanreiRovingFocus(wrap = true, allFocusable = true)
    val columns = remember { MenuColumns() }
    val elements = remember { MenuElements() }
    val close by rememberUpdatedState(onClose)
    val context = remember(roving, columns, elements) { TanreiMenuContext(roving, columns, elements) { reason -> close(reason, null) } }
    if (moveFocusIn) {
        LaunchedEffect(roving) {
            // After the items have registered and been placed.
            androidx.compose.runtime.withFrameNanos { }
            roving.firstEnabled()?.let { roving.focus(it) }
        }
    }
    val smoothing = system.shape.cornerSmoothing
    val shape = remember(tokens.surfaceShape, smoothing) { tanreiContainerShape(tokens.surfaceShape, smoothing) }
    val surfaceColor = tokens.surfaceColor.color
    val count = roving.size
    if (onItemCount != null) {
        val report by rememberUpdatedState(onItemCount)
        LaunchedEffect(roving) {
            // After the items have registered.
            androidx.compose.runtime.withFrameNanos { }
            snapshotFlow { roving.size }.collect { report(it) }
        }
    }
    // A menu presented for a component draws nothing while it holds no item (SPB-20); a plain one always draws.
    val hidden = onItemCount != null && count == 0
    val heightLimit = if (maxHeight == Int.MAX_VALUE) Modifier else Modifier.heightIn(max = with(androidx.compose.ui.platform.LocalDensity.current) { maxHeight.toDp() })
    Box(
        modifier
            .then(if (hidden) Modifier.graphicsLayer { alpha = 0f } else Modifier)
            .then(heightLimit)
            .widthIn(min = tokens.surfaceMinWidth, max = tokens.surfaceMaxWidth)
            .width(IntrinsicSize.Max)
            .tanreiElevation(tokens.surfaceElevation, shape)
            .tanreiContainer(shape, containerColor = { surfaceColor }, outlineColor = Color.Transparent, outlineWidth = NoLength)
            .clip(shape)
            // MNU-5: Escape (or back) and Tab close it — Tab then moves on from the anchor. Heard before the items.
            .onPreviewKeyEvent { event ->
                if (event.type != KeyEventType.KeyDown) return@onPreviewKeyEvent event.key == Key.Escape || event.key == Key.Back || event.key == Key.Tab
                when (event.key) {
                    Key.Escape -> {
                        close(TanreiMenuCloseReason.Escape, null)
                        true
                    }
                    Key.Back -> {
                        close(TanreiMenuCloseReason.Back, null)
                        true
                    }
                    Key.Tab -> {
                        close(TanreiMenuCloseReason.Tab, if (event.isShiftPressed) FocusDirection.Previous else FocusDirection.Next)
                        true
                    }
                    else -> false
                }
            }
            // MNU-7: the arrow keys (wrapping), Home, End and type-ahead, heard from the focused item.
            .tanreiRovingKeys(roving)
            // MNU-24: the menu's items as a collection (Compose has no menu role).
            .semantics { collectionInfo = CollectionInfo(rowCount = count, columnCount = 1) }
            .verticalScroll(rememberScrollState()),
    ) {
        Column(Modifier.fillMaxWidth().padding(horizontal = tokens.surfacePaddingInline, vertical = tokens.surfacePaddingBlock)) {
            CompositionLocalProvider(LocalTanreiMenu provides context, LocalTanreiMenuGroup provides null, content = content)
        }
    }
}

/** No length: an item has no outline and draws nothing outside itself. */
private val NoLength = Dp.Hairline

/** The kind of an item: which composable it came from. */
private enum class MenuItemKind { Action, Checkbox, Radio }

/**
 * An ACTION of a menu (the spec's item kind `item`): it does something and closes the menu (MNU-6).
 *
 * @param text the spec's `label`: the item's text and its accessible name; wraps. An empty one still renders, and a
 *   debuggable app reports it (MNU-26).
 * @param onClick the spec's `click`: called once per activation (pointer, touch, Enter, Space, an assistive technology's
 *   click); then the menu's `onDismissRequest` is called with [TanreiMenuCloseReason.Item].
 * @param modifier applied to the row, which fills the surface's width.
 * @param supportingText a line below the label that says more about the item.
 * @param trailingText text at the end of the row, usually the keyboard shortcut of the same action (⌘C) — read as the
 *   item's description (Compose has no shortcut property).
 * @param destructive draws the action in the menu's `destructive` condition (the error color) — "Delete", "Discard".
 * @param enabled the Compose idiom for the spec's `disabled` (inverse). A disabled item does not activate and is
 *   announced disabled; the arrow keys still reach it (MNU-7, MNU-9).
 * @param leadingIcon an icon before the label, in a box of `leadingIconSize`, given the condition's icon color, glyph and
 *   an icon-font text style (as `TanreiIconButton`'s slot). Decorative. While any item of the menu has one, every item
 *   reserves its column (MNU-19).
 * @param trailingIcon an icon at the end of the row, in a box of `trailingIconSize`, likewise.
 * @param interactionSource hoist to observe or drive hover, focus and press.
 */
@Composable
public fun TanreiMenuItem(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    supportingText: String = "",
    trailingText: String = "",
    destructive: Boolean = false,
    enabled: Boolean = true,
    leadingIcon: (@Composable () -> Unit)? = null,
    trailingIcon: (@Composable () -> Unit)? = null,
    interactionSource: MutableInteractionSource? = null,
) {
    val menu = LocalTanreiMenu.current
    val click by rememberUpdatedState(onClick)
    TanreiMenuItemImpl(
        kind = MenuItemKind.Action, text = text, supportingText = supportingText, trailingText = trailingText,
        condition = if (destructive) TanreiMenuCondition.Destructive else TanreiMenuCondition.Unselected,
        checked = false, enabled = enabled, modifier = modifier, leadingIcon = leadingIcon, trailingIcon = trailingIcon,
        interactionSource = interactionSource,
        // MNU-6: the click, then close.
        onActivate = { _ ->
            click()
            menu?.requestClose?.invoke(TanreiMenuCloseReason.Item)
        },
    )
}

/**
 * An option switched on or off on its own (the spec's item kind `checkbox-item`), such as "Show grid" — a checkbox to
 * assistive technology (`Role.Checkbox` with its on / off state).
 *
 * @param checked whether it is on — the item's own; the caller keeps it (state hoisting).
 * @param onCheckedChange the spec's item `change`: called once per activation with the new checked. After a pointer,
 *   touch or Enter the menu then asks to close ([TanreiMenuCloseReason.Item]); after Space it stays open (MNU-6).
 * @see TanreiMenuItem for [text], [modifier], [supportingText], [trailingText], [enabled], [leadingIcon], [trailingIcon]
 *   and [interactionSource]. A checked item draws the menu's `selected` condition and the check in the mark column.
 */
@Composable
public fun TanreiCheckboxMenuItem(
    text: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    supportingText: String = "",
    trailingText: String = "",
    enabled: Boolean = true,
    leadingIcon: (@Composable () -> Unit)? = null,
    trailingIcon: (@Composable () -> Unit)? = null,
    interactionSource: MutableInteractionSource? = null,
) {
    val menu = LocalTanreiMenu.current
    val change by rememberUpdatedState(onCheckedChange)
    val current by rememberUpdatedState(checked)
    TanreiMenuItemImpl(
        kind = MenuItemKind.Checkbox, text = text, supportingText = supportingText, trailingText = trailingText,
        condition = if (checked) TanreiMenuCondition.Selected else TanreiMenuCondition.Unselected,
        checked = checked, enabled = enabled, modifier = modifier, leadingIcon = leadingIcon, trailingIcon = trailingIcon,
        interactionSource = interactionSource,
        onActivate = { bySpace ->
            change(!current)
            if (!bySpace) menu?.requestClose?.invoke(TanreiMenuCloseReason.Item)
        },
    )
}

/**
 * One choice of several in its [TanreiMenuGroup] (the spec's item kind `radio-item`), such as "Sort by name" — a radio
 * button to assistive technology (`Role.RadioButton` with its selected state). Its group holds which one is checked.
 *
 * @param value identifies the choice: the item is checked while its group's `selectedValue` equals it. Activating an
 *   unchecked one calls the group's `onSelectedValueChange` with it; a checked one emits no change.
 *   After a pointer, touch or Enter the menu then asks to close; after Space it stays open (MNU-6). Outside a group it is drawn unchecked and a
 *   debuggable app reports it (MNU-29).
 * @see TanreiMenuItem for [text], [modifier], [supportingText], [trailingText], [enabled], [leadingIcon], [trailingIcon]
 *   and [interactionSource].
 */
@Composable
public fun TanreiRadioMenuItem(
    text: String,
    value: String,
    modifier: Modifier = Modifier,
    supportingText: String = "",
    trailingText: String = "",
    enabled: Boolean = true,
    leadingIcon: (@Composable () -> Unit)? = null,
    trailingIcon: (@Composable () -> Unit)? = null,
    interactionSource: MutableInteractionSource? = null,
) {
    val menu = LocalTanreiMenu.current
    val group = LocalTanreiMenuGroup.current
    // MNU-29: a radio item outside a group has no choice to be part of.
    if (group == null) TanreiReportMenuProblem("TanreiRadioMenuItem \"$text\" is not inside a TanreiMenuGroup; it is drawn unchecked.")
    else {
        val key = remember { Any() }
        DisposableEffect(group, key) { onDispose { group.radios.remove(key) } }
        SideEffect { group.radios[key] = value }
    }
    val checked = group != null && group.selectedValue != null && group.selectedValue == value
    val currentGroup by rememberUpdatedState(group)
    val currentValue by rememberUpdatedState(value)
    TanreiMenuItemImpl(
        kind = MenuItemKind.Radio, text = text, supportingText = supportingText, trailingText = trailingText,
        condition = if (checked) TanreiMenuCondition.Selected else TanreiMenuCondition.Unselected,
        checked = checked, enabled = enabled, modifier = modifier, leadingIcon = leadingIcon, trailingIcon = trailingIcon,
        interactionSource = interactionSource,
        onActivate = { bySpace ->
            // MNU-6: a checked radio item emits no change, but closes the menu like any other radio item.
            val owner = currentGroup
            if (owner != null && owner.selectedValue != currentValue) owner.onSelectedValueChange(currentValue)
            if (!bySpace) menu?.requestClose?.invoke(TanreiMenuCloseReason.Item)
        },
    )
}

/**
 * A run of related items (the spec's item kind `group`), optionally titled. The menu draws a divider between a group and
 * what is next to it (MNU-23), and the group's radio items are one set of choices.
 *
 * @param modifier applied to the group.
 * @param title a short heading drawn above the items in the group-title style (MNU-28) — a heading to assistive
 *   technology, not an item; empty draws none.
 * @param selectedValue the spec's group `value`: the value of the checked radio item; null checks none. The caller keeps
 *   it and moves it from [onSelectedValueChange].
 * @param onSelectedValueChange the spec's group `change`: a radio item of the group was chosen; receives its value.
 * @param content the group's items. A group inside a group draws its items as the outer group's, with no title or
 *   divider of its own, and a debuggable app reports it (MNU-29).
 */
@Composable
public fun TanreiMenuGroup(
    modifier: Modifier = Modifier,
    title: String = "",
    selectedValue: String? = null,
    onSelectedValueChange: (String) -> Unit = {},
    content: @Composable () -> Unit,
) {
    val menu = LocalTanreiMenu.current
    val outer = LocalTanreiMenuGroup.current
    if (outer != null) {
        // MNU-29: the inner group's items are the outer group's.
        TanreiReportMenuProblem("TanreiMenuGroup \"$title\" is inside another TanreiMenuGroup; its items are drawn as the outer group's, without its title or divider.")
        content()
        return
    }
    val change by rememberUpdatedState(onSelectedValueChange)
    val radios = remember { mutableStateMapOf<Any, String>() }
    val group = remember(selectedValue, radios) { TanreiMenuGroupContext(selectedValue, { change(it) }, radios) }
    TanreiReportGroupValues(title, selectedValue, radios)
    val tokens = TanreiTheme.tokens.menu
    val element = rememberMenuElement(menu?.elements, group = true)
    Column(
        modifier
            .fillMaxWidth()
            .menuElement(element)
            // MNU-24: a group (Compose's traversal group), its title a heading read before its items.
            .semantics { isTraversalGroup = true },
    ) {
        if (element != null && menu?.elements?.dividerAbove(element) == true) MenuDivider(tokens)
        if (title.isNotEmpty()) MenuGroupTitle(title, tokens, menu?.columns)
        CompositionLocalProvider(LocalTanreiMenuGroup provides group, content = content)
    }
}

/** Registers a top-level element for MNU-23's dividers; null inside a group (only top-level elements are divided). */
@Composable
private fun rememberMenuElement(elements: MenuElements?, group: Boolean): MenuElements.Element? {
    if (elements == null || LocalTanreiMenuGroup.current != null) return null
    val element = remember(elements) { elements.newElement() }
    DisposableEffect(elements, element) {
        elements.add(element)
        onDispose { elements.remove(element) }
    }
    SideEffect { element.group = group }
    return element
}

private fun Modifier.menuElement(element: MenuElements.Element?): Modifier =
    if (element == null) this else onPlaced { element.top = it.positionInRoot().y }

/** MNU-23: `dividerThickness` of `dividerColor` across the surface's inner width, `dividerSpace` above and below; no semantics. */
@Composable
private fun MenuDivider(tokens: TanreiMenuTokens) {
    Box(
        Modifier
            .fillMaxWidth()
            .padding(vertical = tokens.dividerSpace)
            .height(tokens.dividerThickness)
            .background(tokens.dividerColor.color),
    )
}

/**
 * MNU-28: the group's title, starting where the items' labels start (after the mark and icon columns when they are
 * drawn), ending `containerPaddingInline` from the end, with `containerPaddingBlock` above and below; wraps.
 */
@Composable
private fun MenuGroupTitle(title: String, tokens: TanreiMenuTokens, columns: MenuColumns?) {
    val start = tokens.containerPaddingInline +
        (if (columns?.mark == true) tokens.markSize + tokens.containerGap else NoLength) +
        (if (columns?.icon == true) tokens.leadingIconSize + tokens.containerGap else NoLength)
    TanreiText(
        title,
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = start, end = tokens.containerPaddingInline, top = tokens.containerPaddingBlock, bottom = tokens.containerPaddingBlock)
            .semantics { heading() },
        color = tokens.groupTitleColor.color,
        style = tokens.groupTitleTypescale.toTextStyle(),
    )
}

/** What one row draws from its interaction: pointer focus is shown as hover, never as keyboard focus (MNU-8). */
private fun TanreiInteraction.focusedByPointer(hovered: Boolean): TanreiInteraction {
    fun TanreiInteractionState.unfocused() = if (this == TanreiInteractionState.Focused) (if (hovered) TanreiInteractionState.Hovered else TanreiInteractionState.Enabled) else this
    return TanreiInteraction(state = state.unfocused(), unpressed = unpressed.unfocused(), press = press)
}

/** A row's own flags, read by its handlers and never drawn from directly. */
private class MenuItemFlags {
    /** The last key that reached the item was Space: a checkbox or radio item then leaves the menu open (MNU-6). */
    var bySpace = false
}

@Composable
private fun TanreiMenuItemImpl(
    kind: MenuItemKind,
    text: String,
    supportingText: String,
    trailingText: String,
    condition: TanreiMenuCondition,
    checked: Boolean,
    enabled: Boolean,
    modifier: Modifier,
    leadingIcon: (@Composable () -> Unit)?,
    trailingIcon: (@Composable () -> Unit)?,
    interactionSource: MutableInteractionSource?,
    onActivate: (bySpace: Boolean) -> Unit,
) {
    val component = when (kind) {
        MenuItemKind.Action -> "TanreiMenuItem"
        MenuItemKind.Checkbox -> "TanreiCheckboxMenuItem"
        MenuItemKind.Radio -> "TanreiRadioMenuItem"
    }
    val source = interactionSource ?: remember { MutableInteractionSource() }
    val system = TanreiTheme.tokens
    val tokens = system.menu
    val menu = LocalTanreiMenu.current
    // MNU-26: still rendered and still working; reported in debuggable apps.
    if (text.isBlank()) TanreiReportMissingName(component, "text", what = "an item without a label")

    // MNU-7 / MNU-24: the menu's keyboard sees this item — its order, what type-ahead matches; every item takes focus.
    val roving = menu?.roving
    val entry = rememberTanreiRovingEntry(roving, focusable = true, enabled = enabled, selected = checked, text = text)
    val index = entry?.let { roving?.indexOf(it) } ?: -1
    // MNU-19: this row's columns, for every row of the menu.
    val columnsKey = remember { Any() }
    menu?.columns?.let { columns ->
        DisposableEffect(columns, columnsKey) { onDispose { columns.remove(columnsKey) } }
        SideEffect { columns.set(columnsKey, mark = kind != MenuItemKind.Action, icon = leadingIcon != null) }
    }
    val element = rememberMenuElement(menu?.elements, group = false)

    // MNU-10 / MNU-13: one state wins; MNU-15: a press counts from the first frame and for at least press-hold. MNU-8: a
    // pointer that moves onto the item focuses it without the focus ring — it is drawn hovered.
    val hovered by source.collectIsHoveredAsState()
    var pointerFocus by remember { mutableStateOf(false) }
    val collected = source.collectTanreiInteraction(enabled)
    val interaction = if (pointerFocus) collected.focusedByPointer(hovered) else collected
    LaunchedEffect(hovered, entry) {
        if (hovered && entry != null && roving?.focused !== entry) {
            pointerFocus = true
            roving?.focus(entry)
        }
    }
    val feedback = system.behavior.pressedFeedback
    val drawnStates = interaction.drawnStates(feedback)
    val palette = tokens.conditions[condition]
    val drawn = palette[drawnStates.content]

    // MNU-27: a change of state moves over the menu's state motion (entering pressed snaps); a change of condition —
    // an item checked while the menu is open — over the same duration and easing. At once where motion is reduced.
    val stateMotion = TanreiStateMotion(interaction.state, tokens.motionStateDuration, tokens.motionStateEasing)
    val motion = rememberTanreiSelectionMotion(condition, stateMotion, tokens.motionStateDuration, tokens.motionStateEasing)
    val containerColor = animateTanreiColorAsState(palette[drawnStates.container].containerColor.color, motion, label = "container")
    val labelColor = animateTanreiColorAsState(drawn.labelColor.color, motion, label = "label")
    val supportingColor = animateTanreiColorAsState(drawn.supportingTextColor.color, motion, label = "supporting-text")
    val trailingTextColor = animateTanreiColorAsState(drawn.trailingTextColor.color, motion, label = "trailing-text")
    val leadingIconColor by animateTanreiColorAsState(drawn.leadingIconColor.color, motion, label = "leading-icon")
    val trailingIconColor by animateTanreiColorAsState(drawn.trailingIconColor.color, motion, label = "trailing-icon")
    val markColor = animateTanreiColorAsState(drawn.markColor.color, motion, label = "mark")
    val opacity = animateFloatAsState(tokens.opacity(drawnStates.content), motion.spec(), label = "opacity")
    // MNU-22: the check draws along its path, or is taken back, over the state duration.
    val checkShown = animateFloatAsState(if (checked) 1f else 0f, tanreiTween(tokens.motionStateDuration, tokens.motionStateEasing), label = "check")
    // MNU-17: the row's corner of the state, eased by the system's corner smoothing.
    val cornerRadius = tokens.containerShape(drawnStates.content)
    val smoothing = system.shape.cornerSmoothing
    val shape = remember(cornerRadius, smoothing) { tanreiContainerShape(cornerRadius, smoothing) }
    // MNU-16, ripple: the pressed container color of the item's condition, from the point of contact (the center for a
    // key). Null unless the system ripples.
    val ripple = rememberTanreiRipple(
        feedback = feedback,
        interaction = interaction,
        color = palette.pressed.containerColor.color,
        feedbackDurationMillis = tokens.motionFeedbackDuration,
        stateDurationMillis = tokens.motionStateDuration,
        stateEasing = tokens.motionStateEasing,
    )

    val flags = remember { MenuItemFlags() }
    val activate = { onActivate(flags.bySpace).also { flags.bySpace = false } }
    // MNU-6 / MNU-9 / MNU-24: an action (no role: Compose has no menu item role), a checkbox item (`Role.Checkbox` with
    // its state), a radio item (`Role.RadioButton`, selected); a disabled one does not activate.
    val input = when (kind) {
        MenuItemKind.Action -> Modifier.clickable(interactionSource = source, indication = null, enabled = enabled, onClick = { activate() })
        MenuItemKind.Checkbox -> Modifier.toggleable(value = checked, interactionSource = source, indication = null, enabled = enabled, role = Role.Checkbox, onValueChange = { activate() })
        MenuItemKind.Radio -> Modifier.selectable(selected = checked, interactionSource = source, indication = null, enabled = enabled, role = Role.RadioButton, onClick = { activate() })
    }
    // MNU-7: a disabled item keeps a focus target (the arrow keys reach it) and hears the pointer (MNU-8).
    val reachable = if (!enabled) Modifier.focusable(interactionSource = source).hoverable(source) else Modifier
    val row = modifier
        .fillMaxWidth()
        .menuElement(element)
        .tanreiRovingItem(roving, entry, focusable = true)
        .onFocusChanged { if (!it.isFocused) pointerFocus = false }
        .onPreviewKeyEvent { event ->
            // A key shows keyboard focus again (MNU-8); Space leaves a checkbox or radio item's menu open (MNU-6).
            pointerFocus = false
            if (event.type == KeyEventType.KeyDown) flags.bySpace = event.key == Key.Spacebar
            false
        }
        // MNU-24: its position in the menu.
        .semantics { if (index >= 0) collectionItemInfo = CollectionItemInfo(rowIndex = index, rowSpan = 1, columnIndex = 0, columnSpan = 1) }
        .then(reachable)
        .then(input)
        // MNU-15: the pointer press itself, heard at once.
        .tanreiPressInput(interaction.press, enabled)
        .tanreiRippleInput(ripple)
        // MNU-11: inside the row, which the surface would otherwise clip; never animated; not for pointer focus.
        .then(if (pointerFocus) Modifier else Modifier.tanreiFocusRing(source, cornerRadius = cornerRadius, inside = true))
        .tanreiGroupOpacity(overflow = NoLength) { opacity.value }
        .tanreiContainer(shape, containerColor = { containerColor.value }, outlineColor = Color.Transparent, outlineWidth = NoLength, ripple = ripple)

    val selectedGlyph = checked
    val leadingGlyph = system.icon.glyph(tokens.leadingIconSize, selected = selectedGlyph)
    val trailingGlyph = system.icon.glyph(tokens.trailingIconSize, selected = selectedGlyph)
    // MNU-12: at least the touch target tall (Compose cannot tell a fine pointer).
    val minimum = max(tokens.containerHeight, system.measure.targetTouch)
    val markColumn = menu?.columns?.mark ?: (kind != MenuItemKind.Action)
    val iconColumn = menu?.columns?.icon ?: (leadingIcon != null)
    val labelStyle = tokens.labelTypescale.toTextStyle()

    Column {
        if (element != null && menu?.elements?.dividerAbove(element) == true) MenuDivider(tokens)
        Box(row) {
            MenuItemRow(tokens = tokens, labelStyle = labelStyle, minimumHeight = minimum) {
                // MNU-19: the mark column while any item has a mark; MNU-22: the check in it while checked.
                if (markColumn) {
                    Canvas(Modifier.layoutId(MenuSlot.Mark).size(tokens.markSize)) {
                        val shownNow = checkShown.value
                        val color = markColor.value
                        if (shownNow <= 0f || !color.isDrawn) return@Canvas
                        drawPath(tanreiCheckPath(size, shownNow), color, style = Stroke(width = tokens.markWidth.toPx(), cap = StrokeCap.Square, join = StrokeJoin.Miter))
                    }
                }
                // MNU-19: the icon column while any item has an icon; MNU-21: an empty slot draws nothing.
                if (iconColumn) {
                    MenuItemIcon(MenuSlot.LeadingIcon, tokens.leadingIconSize, leadingIconColor, leadingGlyph, leadingIcon)
                }
                MenuItemText(MenuSlot.Label, text, labelStyle, labelColor)
                if (supportingText.isNotEmpty()) MenuItemText(MenuSlot.Supporting, supportingText, tokens.supportingTextTypescale.toTextStyle(), supportingColor)
                if (trailingText.isNotEmpty()) MenuItemText(MenuSlot.TrailingText, trailingText, tokens.trailingTextTypescale.toTextStyle(), trailingTextColor)
                if (trailingIcon != null) MenuItemIcon(MenuSlot.TrailingIcon, tokens.trailingIconSize, trailingIconColor, trailingGlyph, trailingIcon)
            }
        }
    }
}

private enum class MenuSlot { Mark, LeadingIcon, Label, Supporting, TrailingText, TrailingIcon }

/** One text of the row: it wraps, never truncates (MNU-20). */
@Composable
private fun MenuItemText(slot: MenuSlot, text: String, style: TextStyle, color: State<Color>) {
    BasicText(text = text, modifier = Modifier.layoutId(slot), style = style, color = { color.value })
}

/** An icon column of the row (MNU-21): a box of [size], decorative, given [color], the condition's [glyph] and icon text style. */
@Composable
private fun MenuItemIcon(slot: MenuSlot, size: Dp, color: Color, glyph: TanreiIconGlyph, icon: (@Composable () -> Unit)?) {
    Box(Modifier.layoutId(slot).size(size).clearAndSetSemantics {}, contentAlignment = Alignment.Center) {
        if (icon != null) {
            CompositionLocalProvider(
                LocalTanreiContentColor provides color,
                LocalTanreiIconGlyph provides glyph,
                LocalTanreiTextStyle provides glyph.toTextStyle(size),
                content = icon,
            )
        }
    }
}

/**
 * The row (MNU-19, MNU-20): `containerPaddingInline` from each edge, the mark column, the leading icon column, the label
 * with the supporting text below it taking the remaining width, then the trailing text and the trailing icon, each
 * `containerGap` from the next. At least [minimumHeight], padded by `containerPaddingBlock`, growing with its content;
 * the text column is centered and every other element is centered on the label's first line (a wrapping label aligns
 * with its control on the first line). Placed relative to the layout direction, so right-to-left mirrors the row.
 */
@Composable
private fun MenuItemRow(tokens: TanreiMenuTokens, labelStyle: TextStyle, minimumHeight: Dp, content: @Composable () -> Unit) {
    Layout(content = content) { measurables, constraints ->
        fun slot(id: MenuSlot) = measurables.firstOrNull { it.layoutId == id }
        val bounded = constraints.hasBoundedWidth
        val pad = tokens.containerPaddingInline.roundToPx()
        val gap = tokens.containerGap.roundToPx()
        val block = tokens.containerPaddingBlock.roundToPx()
        val leading = listOfNotNull(slot(MenuSlot.Mark), slot(MenuSlot.LeadingIcon)).map { it.measure(Constraints()) }
        val textStart = pad + leading.sumOf { it.width + gap }
        val trailingText = slot(MenuSlot.TrailingText)?.measure(Constraints())
        val trailingIcon = slot(MenuSlot.TrailingIcon)?.measure(Constraints())
        val trailing = listOfNotNull(trailingText, trailingIcon)
        val trailingWidth = trailing.sumOf { it.width + gap }
        val textWidth = if (bounded) (constraints.maxWidth - textStart - trailingWidth - pad).coerceAtLeast(0) else Constraints.Infinity
        val label = slot(MenuSlot.Label)?.measure(Constraints(maxWidth = textWidth))
        val supporting = slot(MenuSlot.Supporting)?.measure(Constraints(maxWidth = textWidth))
        val texts = listOfNotNull(label, supporting)
        val textHeight = texts.sumOf { it.height }
        val firstLine = labelStyle.lineHeight.takeIf { it.isSp }?.toPx()?.roundToInt() ?: (label?.height ?: 0)
        val sides = leading + trailing
        val height = maxOf(minimumHeight.roundToPx(), maxOf(textHeight, sides.maxOfOrNull { it.height } ?: 0) + 2 * block)
            .coerceIn(constraints.minHeight, constraints.maxHeight)
        val width = if (bounded) {
            constraints.maxWidth
        } else {
            (textStart + (texts.maxOfOrNull { it.width } ?: 0) + trailingWidth + pad).coerceAtLeast(constraints.minWidth)
        }
        val textTop = (height - textHeight) / 2
        val lineCenter = textTop + minOf(firstLine, label?.height ?: firstLine) / 2
        fun sideTop(placeable: Placeable) = (lineCenter - placeable.height / 2).coerceIn(0, (height - placeable.height).coerceAtLeast(0))
        layout(width, height) {
            var x = pad
            for (placeable in leading) {
                placeable.placeRelative(x, sideTop(placeable))
                x += placeable.width + gap
            }
            var y = textTop
            for (text in texts) {
                text.placeRelative(textStart, y)
                y += text.height
            }
            var end = width - pad
            for (placeable in trailing.asReversed()) {
                end -= placeable.width
                placeable.placeRelative(end, sideTop(placeable))
                end -= gap
            }
        }
    }
}

/** Debuggable apps only (MNU-29): one report per message and composition site. */
@Composable
private fun TanreiReportMenuProblem(message: String) {
    if (!isTanreiDebuggable()) return
    remember(message) { TanreiDiagnostics.reporter(message) }
}

/**
 * Debuggable apps only (MNU-29): a group's value that names none of its radio items, and two radio items of one group
 * sharing a value (both are drawn checked while the value names it). Each reported once, after the items registered.
 */
@Composable
private fun TanreiReportGroupValues(title: String, selectedValue: String?, radios: Map<Any, String>) {
    if (!isTanreiDebuggable()) return
    val reported = remember { mutableSetOf<String>() }
    LaunchedEffect(selectedValue, radios) {
        snapshotFlow {
            val values = radios.values.toList()
            buildList {
                val name = if (title.isEmpty()) "a TanreiMenuGroup" else "TanreiMenuGroup \"$title\""
                if (selectedValue != null && values.isNotEmpty() && selectedValue !in values) add("$name: selectedValue \"$selectedValue\" names none of its radio items; none is checked.")
                values.groupingBy { it }.eachCount().filterValues { it > 1 }.keys.forEach { add("$name: the value \"$it\" is given to more than one radio item; each is checked while it is selected.") }
            }
        }.collect { problems -> problems.forEach { if (reported.add(it)) TanreiDiagnostics.reporter(it) } }
    }
}
