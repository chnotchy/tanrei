package io.github.chnotchy.tanrei.components

import android.view.View
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.rememberTransition
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.waitForUpOrCancellation
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.InputMode
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.PointerEventType
import androidx.compose.ui.input.pointer.PointerType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.layout
import androidx.compose.ui.layout.boundsInWindow
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalInputModeManager
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.platform.LocalViewConfiguration
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntRect
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.window.Popup
import androidx.compose.ui.window.PopupPositionProvider
import androidx.compose.ui.window.PopupProperties
import io.github.chnotchy.tanrei.primitives.LocalTanreiAnchorDescription
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.primitives.TanreiReportMissingName
import io.github.chnotchy.tanrei.primitives.extent
import io.github.chnotchy.tanrei.primitives.isTanreiDebuggable
import io.github.chnotchy.tanrei.primitives.tanreiContainer
import io.github.chnotchy.tanrei.primitives.tanreiContainerShape
import io.github.chnotchy.tanrei.primitives.tanreiElevation
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.tanreiTween
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiTooltipTokens
import java.util.WeakHashMap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/*
 * `specs/tooltip.spec.json` (TIP-1…16) on Compose, as `platforms.compose` maps it — Material's `TooltipBox`:
 * `TanreiTooltip(text, modifier, variant, title, placement, describes, state) { anchor }`. The tooltip is a READ overlay:
 * a `Popup` that never takes focus, placed against the anchor's box. It opens and closes itself — a
 * resting pointer, keyboard focus, a long-press — and says so through its state's `onToggle`; the product may also show
 * or dismiss it through the state, which emits nothing. Every design value comes from the current design system's
 * [TanreiTooltipTokens] (`TanreiTheme.tokens.tooltip`).
 */

/**
 * The spec's `variant`: [Plain] — one short phrase on the inverse surface, to name what an icon does — or [Rich] — an
 * optional title and a few sentences on a raised surface, to explain a term or a setting. Structural, so closed: a
 * design system restyles both by value and cannot add a third.
 */
public enum class TanreiTooltipVariant { Plain, Rich }

/**
 * The spec's `placement`: the side of the anchor the tooltip prefers — [Top] (default), [Bottom], [Start] or [End]
 * (start and end follow the layout direction). It flips to the opposite side when the preferred one has no room.
 */
public enum class TanreiTooltipPlacement { Top, Bottom, Start, End }

/**
 * Whether a [TanreiTooltip] is showing — the spec's `open` and `toggle`. [isVisible] is open; [show] and [dismiss] are
 * the product setting it (a first-run hint), which emits nothing; the tooltip opening or closing BY ITSELF (hover,
 * focus, long-press, Escape, the touch timeout, another tooltip opening) sets it and calls `onToggle` with the new value
 * (TIP-7). Get one from [rememberTanreiTooltipState].
 */
@Stable
public class TanreiTooltipState internal constructor(initiallyVisible: Boolean) {
    /** The spec's `open`. */
    public var isVisible: Boolean by mutableStateOf(initiallyVisible)
        private set

    /** The spec's `toggle`: set by [rememberTanreiTooltipState] in each composition. */
    internal var onToggle: ((Boolean) -> Unit)? = null

    /** The window whose one open tooltip this may be (TIP-8); set by the tooltip it is given to. */
    internal var window: Any? = null

    /** Shows the tooltip, as a product does on its own. Emits nothing; another open tooltip of the window closes (TIP-8). */
    public fun show() {
        set(true, emit = false)
    }

    /** Hides the tooltip, as a product does on its own. Emits nothing. */
    public fun dismiss() {
        set(false, emit = false)
    }

    /** The tooltip opened or closed by itself: set it and emit toggle (TIP-7). Nothing when it already is. */
    internal fun toggle(visible: Boolean) {
        set(visible, emit = true)
    }

    private fun set(visible: Boolean, emit: Boolean) {
        if (isVisible == visible) return
        if (visible) TanreiTooltipWindows.opening(window, this) else TanreiTooltipWindows.closed(window, this)
        isVisible = visible
        if (emit) onToggle?.invoke(visible)
    }
}

/**
 * A [TanreiTooltipState] for the lifetime of the composition.
 *
 * @param initiallyVisible whether it starts open (the spec's `open`).
 * @param onToggle the spec's `toggle`: the tooltip opened or closed by itself; receives the new open value. Not called
 *   for [TanreiTooltipState.show] or [TanreiTooltipState.dismiss].
 */
@Composable
public fun rememberTanreiTooltipState(initiallyVisible: Boolean = false, onToggle: ((Boolean) -> Unit)? = null): TanreiTooltipState {
    val state = remember { TanreiTooltipState(initiallyVisible) }
    state.onToggle = onToggle
    return state
}

/** TIP-8: at most one tooltip open per window. A window is its root view. */
internal object TanreiTooltipWindows {
    private val open = WeakHashMap<Any, TanreiTooltipState>()

    fun opening(window: Any?, state: TanreiTooltipState) {
        val key = window ?: return
        val other = open[key]
        open[key] = state
        // Closed at once, by itself: it emits its toggle.
        if (other != null && other !== state) other.toggle(false)
    }

    fun closed(window: Any?, state: TanreiTooltipState) {
        val key = window ?: return
        if (open[key] === state) open.remove(key)
    }

    /**
     * TIP-4 for a key the anchor does not hear (focus is elsewhere — in a dialog, always somewhere): closes the open
     * tooltip of [window] and answers true, so that the caller consumes Escape instead of acting on it. A Tanrei dialog
     * asks this before it hears Escape itself.
     */
    fun dismissOnEscape(window: Any?): Boolean {
        val tooltip = open[window ?: return false]?.takeIf { it.isVisible } ?: return false
        tooltip.toggle(false)
        return true
    }

    /** Whether another tooltip of [window] is open now (TIP-8: the next one opens without the delay). */
    fun anotherOpen(window: Any?, state: TanreiTooltipState): Boolean {
        val other = open[window ?: return false]
        return other != null && other !== state && other.isVisible
    }
}

/**
 * Describes its [anchor] with a short text that appears on a resting pointer, keyboard focus or a long-press.
 * Implements `specs/tooltip.spec.json`. The tooltip adds a description to the anchor and changes nothing else about it:
 * its name, role, size and input stay the anchor's own. Nothing a person needs to finish a task may live only in a
 * tooltip — it holds no action, and screen readers get only the description.
 *
 * @param text the description. Required: while it is empty the tooltip never opens and describes nothing, and a
 *   debuggable app reports it (TIP-16).
 * @param modifier applied to the anchor's box, which the tooltip is placed against.
 * @param variant [TanreiTooltipVariant.Plain] (default) or [TanreiTooltipVariant.Rich].
 * @param title a heading above [text], for a rich tooltip; a plain one ignores it (reported in debuggable apps).
 * @param placement the preferred side ([TanreiTooltipPlacement.Top] by default); the tooltip flips, shifts to stay
 *   `windowMargin` inside the window and follows the anchor (TIP-9).
 * @param describes whether assistive technology reads the text (after the title) as the anchor's description (the
 *   anchor's state description on Compose, read after its name and role). False when the text repeats the anchor's own
 *   name — an icon button whose tooltip shows its label —, so that it is not read twice (TIP-14).
 * @param state the spec's `open` and `toggle`: [rememberTanreiTooltipState].
 * @param anchor the element described: an icon button, a truncated label, a chart mark.
 */
@Composable
public fun TanreiTooltip(
    text: String,
    modifier: Modifier = Modifier,
    variant: TanreiTooltipVariant = TanreiTooltipVariant.Plain,
    title: String = "",
    placement: TanreiTooltipPlacement = TanreiTooltipPlacement.Top,
    describes: Boolean = true,
    state: TanreiTooltipState = rememberTanreiTooltipState(),
    anchor: @Composable () -> Unit,
) {
    val tokens = TanreiTheme.tokens.tooltip
    val hasText = text.isNotBlank()
    // TIP-16: no text, no tooltip and no description; a plain tooltip's title is ignored. Both reported in debug builds.
    if (!hasText) TanreiReportMissingName("TanreiTooltip", "text", what = "a tooltip without text")
    if (variant == TanreiTooltipVariant.Plain && title.isNotBlank()) TanreiReportTooltipProblem("TanreiTooltip \"$text\": a plain tooltip ignores its title \"$title\".")
    val window = LocalView.current.rootView
    state.window = window
    val scope = rememberCoroutineScope()
    val inputMode = LocalInputModeManager.current
    val controller = remember(state) { TanreiTooltipController(state, scope) }
    controller.tokens = tokens
    controller.enabled = hasText
    controller.longPressMillis = LocalViewConfiguration.current.longPressTimeoutMillis
    // TIP-9: the anchor removed closes it (by itself: it emits).
    DisposableEffect(controller) { onDispose { controller.close() } }

    // TIP-14: the text — after the title, for a rich tooltip — is the anchor's description (its state description, read
    // after its name and role), added to any description an outer decorator (a badge) already hands the anchor. A Tanrei
    // control puts it on its own node; anything else gets it from this box.
    val own = when {
        !describes || !hasText -> null
        variant == TanreiTooltipVariant.Rich && title.isNotBlank() -> "$title, $text"
        else -> text
    }
    val outer = LocalTanreiAnchorDescription.current
    val description = listOfNotNull(outer, own).joinToString(", ").ifEmpty { null }

    val visible = state.isVisible && hasText
    // TIP-4: Escape while focus is elsewhere in the window (the anchor was only hovered). Keys no view handled reach
    // this listener (API 28+); a Tanrei dialog asks first (`TanreiTooltipWindows.dismissOnEscape`), before it closes.
    val view = LocalView.current
    if (visible && android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
        DisposableEffect(view, controller) {
            val listener = View.OnUnhandledKeyEventListener { _, event ->
                event.keyCode == android.view.KeyEvent.KEYCODE_ESCAPE && controller.key(Key.Escape, down = event.action == android.view.KeyEvent.ACTION_DOWN)
            }
            view.addOnUnhandledKeyEventListener(listener)
            onDispose { view.removeOnUnhandledKeyEventListener(listener) }
        }
    }
    Box(
        modifier
            .then(if (own != null && description != null) Modifier.semantics { stateDescription = description } else Modifier)
            // TIP-1 / TIP-6: a fine pointer resting on the anchor, leaving it, activating it.
            .pointerInput(controller) {
                awaitPointerEventScope {
                    // Whether the mouse is over the anchor: from Enter and Exit, and from where a move lands (a move that
                    // leaves the anchor may arrive as a move).
                    var over = false
                    while (true) {
                        val event = awaitPointerEvent(PointerEventPass.Initial)
                        val change = event.changes.firstOrNull { it.type == PointerType.Mouse } ?: continue
                        val inBounds = change.position.x >= 0f && change.position.y >= 0f && change.position.x < size.width && change.position.y < size.height
                        val now = when (event.type) {
                            PointerEventType.Enter -> true
                            PointerEventType.Exit -> false
                            else -> inBounds
                        }
                        if (now != over) {
                            over = now
                            if (now) controller.pointerEntered() else controller.pointerLeft()
                        }
                        if (event.type == PointerEventType.Press) controller.activated()
                    }
                }
            }
            // TIP-3 / TIP-6: a long touch opens it without activating the anchor; a tap activates the anchor and closes it.
            .pointerInput(controller) {
                awaitEachGesture {
                    val down = awaitFirstDown(requireUnconsumed = false, pass = PointerEventPass.Initial)
                    if (down.type != PointerType.Touch) return@awaitEachGesture
                    var ended = false
                    withTimeoutOrNull(controller.longPressMillis) {
                        waitForUpOrCancellation(PointerEventPass.Initial)
                        ended = true
                    }
                    if (ended) {
                        controller.activated()
                        return@awaitEachGesture
                    }
                    controller.longPressed()
                    // The rest of this touch belongs to the tooltip: the anchor sees it consumed and does not activate.
                    do {
                        val event = awaitPointerEvent(PointerEventPass.Initial)
                        event.changes.forEach { it.consume() }
                    } while (event.changes.any { it.pressed })
                    controller.touchReleased()
                }
            }
            // TIP-4 / TIP-6: Escape closes it and goes no further (its key up too, which a dialog would hear); Enter and
            // Space activate the anchor, which closes it.
            .onPreviewKeyEvent { event -> controller.key(event.key, event.type == KeyEventType.KeyDown) }
            // TIP-2: keyboard focus on the anchor opens it at once; losing focus closes it. Pointer and touch focus do not.
            .onFocusChanged { focus -> controller.focusChanged(focus.hasFocus, keyboard = inputMode.inputMode == InputMode.Keyboard) }
            // TIP-9: an anchor hidden or scrolled out of the window closes it.
            .onGloballyPositioned { coordinates -> if (coordinates.boundsInWindow().isEmpty) controller.close() },
        propagateMinConstraints = true,
    ) {
        CompositionLocalProvider(LocalTanreiAnchorDescription provides description, anchor)
        TanreiTooltipPopup(visible, text, title, variant, placement, describes, tokens, controller)
    }
}

/** TIP-15: fades in and out; the popup stays while it fades out. */
@Composable
private fun TanreiTooltipPopup(
    visible: Boolean,
    text: String,
    title: String,
    variant: TanreiTooltipVariant,
    placement: TanreiTooltipPlacement,
    describes: Boolean,
    tokens: TanreiTooltipTokens,
    controller: TanreiTooltipController,
) {
    val transition = remember { MutableTransitionState(false) }
    transition.targetState = visible
    if (!transition.currentState && !transition.targetState) return
    val shown = rememberTanreiTooltipShown(transition, tokens)
    val density = LocalDensity.current
    val elevation = if (variant == TanreiTooltipVariant.Rich) tokens.richContainerElevation else tokens.plainContainerElevation
    val extent = elevation.extent
    val provider = remember(placement, tokens.offset, tokens.windowMargin, extent, density) {
        with(density) { TanreiTooltipPositionProvider(placement, tokens.offset.roundToPx(), tokens.windowMargin.roundToPx(), extent.roundToPx()) }
    }
    // TIP-13: never focusable; a touch elsewhere closes it (TIP-3); above the window it belongs to — a dialog's too.
    Popup(
        popupPositionProvider = provider,
        onDismissRequest = { controller.close() },
        properties = PopupProperties(focusable = false, dismissOnBackPress = false, dismissOnClickOutside = true),
    ) {
        val margin = with(density) { tokens.windowMargin.roundToPx() }
        val reach = with(density) { extent.roundToPx() }
        Box(
            Modifier
                // Never wider than the window's room inside its margin (the popup is given the window's size).
                .layout { measurable, constraints ->
                    val limit = if (constraints.hasBoundedWidth) (constraints.maxWidth - 2 * margin + 2 * reach).coerceIn(0, constraints.maxWidth) else constraints.maxWidth
                    val placeable = measurable.measure(constraints.copy(minWidth = 0, maxWidth = limit))
                    layout(placeable.width, placeable.height) { placeable.place(0, 0) }
                }
                // The shadow's reach, inside the popup's window so that it is not cut off.
                .padding(extent)
                .graphicsLayer { alpha = shown.value.coerceIn(0f, 1f) }
                // TIP-1: the pointer may rest on the tooltip; TIP-13: a press on it closes it and goes no further.
                .pointerInput(controller) {
                    awaitPointerEventScope {
                        while (true) {
                            val event = awaitPointerEvent()
                            when (event.type) {
                                PointerEventType.Enter -> controller.pointerOverTooltip(true)
                                PointerEventType.Exit -> controller.pointerOverTooltip(false)
                                PointerEventType.Press -> {
                                    event.changes.forEach { it.consume() }
                                    controller.close()
                                }
                                else -> event.changes.forEach { it.consume() }
                            }
                        }
                    }
                }
                // TIP-14: read once, as the anchor's description — not again here.
                .then(if (describes) Modifier.clearAndSetSemantics {} else Modifier),
        ) {
            TanreiTooltipContainer(text, title, variant, tokens)
        }
    }
}

/**
 * TIP-15's timing: how far the tooltip is shown, 0 to 1 — rising over `motionEnterDuration` with `motionEnterEasing`,
 * falling over `motionExitDuration` with `motionExitEasing`; at once where motion is reduced (Android's setting removes
 * every animation, and the animator duration scale reaches the transition). It only fades: nothing moves or scales.
 */
@Composable
internal fun rememberTanreiTooltipShown(state: MutableTransitionState<Boolean>, tokens: TanreiTooltipTokens): State<Float> {
    val transition = rememberTransition(state, label = "tooltip")
    return transition.animateFloat(
        transitionSpec = {
            if (targetState) tanreiTween(tokens.motionEnterDuration, tokens.motionEnterEasing) else tanreiTween(tokens.motionExitDuration, tokens.motionExitEasing)
        },
        label = "shown",
    ) { open -> if (open) 1f else 0f }
}

/**
 * The drawn tooltip (TIP-10, TIP-11, TIP-12): plain — the text alone on `plainContainerColor`, at least
 * `plainContainerMinHeight` tall and at most `plainContainerMaxWidth` wide —, or rich — the title above the text,
 * `richContainerGap` apart, on `richContainerColor` at `richContainerElevation`, at most `richContainerMaxWidth` wide.
 * Longer text wraps and larger text grows it; text starts at the layout direction's start; corners eased by corner
 * smoothing.
 */
@Composable
internal fun TanreiTooltipContainer(text: String, title: String, variant: TanreiTooltipVariant, tokens: TanreiTooltipTokens, modifier: Modifier = Modifier) {
    val smoothing = TanreiTheme.tokens.shape.cornerSmoothing
    val rich = variant == TanreiTooltipVariant.Rich
    val radius = if (rich) tokens.richContainerShape else tokens.plainContainerShape
    val shape = remember(radius, smoothing) { tanreiContainerShape(radius, smoothing) }
    val color = (if (rich) tokens.richContainerColor else tokens.plainContainerColor).color
    fun style(typescale: TextStyle, paint: Color) = typescale.merge(TextStyle(color = paint, textAlign = TextAlign.Start))
    val container = modifier
        .widthIn(max = if (rich) tokens.richContainerMaxWidth else tokens.plainContainerMaxWidth)
        .then(if (rich) Modifier else Modifier.heightIn(min = tokens.plainContainerMinHeight))
        .tanreiElevation(if (rich) tokens.richContainerElevation else tokens.plainContainerElevation, shape)
        .tanreiContainer(shape, containerColor = { color }, outlineColor = Color.Transparent, outlineWidth = NoOutline)
        .padding(
            horizontal = if (rich) tokens.richContainerPaddingInline else tokens.plainContainerPaddingInline,
            vertical = if (rich) tokens.richContainerPaddingBlock else tokens.plainContainerPaddingBlock,
        )
    if (rich) {
        Column(container, verticalArrangement = Arrangement.spacedBy(tokens.richContainerGap)) {
            if (title.isNotBlank()) BasicText(title, style = style(tokens.richTitleTypescale.toTextStyle(), tokens.richTitleColor.color))
            BasicText(text, style = style(tokens.richSupportingTextTypescale.toTextStyle(), tokens.richSupportingTextColor.color))
        }
    } else {
        Box(container, contentAlignment = Alignment.CenterStart) {
            BasicText(text, style = style(tokens.plainSupportingTextTypescale.toTextStyle(), tokens.plainSupportingTextColor.color))
        }
    }
}

/** No outline: a tooltip's edge is its color (plain) or its elevation ring (rich). */
private val NoOutline = androidx.compose.ui.unit.Dp.Hairline

/**
 * TIP-9's placement as a [PopupPositionProvider]: [tanreiTooltipPosition] for the container, which sits [extent] pixels
 * inside the popup's window (room for its shadow).
 */
internal class TanreiTooltipPositionProvider(
    private val placement: TanreiTooltipPlacement,
    private val offset: Int,
    private val margin: Int,
    private val extent: Int,
) : PopupPositionProvider {
    override fun calculatePosition(anchorBounds: IntRect, windowSize: IntSize, layoutDirection: LayoutDirection, popupContentSize: IntSize): IntOffset {
        val container = IntSize((popupContentSize.width - 2 * extent).coerceAtLeast(0), (popupContentSize.height - 2 * extent).coerceAtLeast(0))
        val at = tanreiTooltipPosition(placement, anchorBounds, windowSize, layoutDirection, container, offset, margin)
        return IntOffset(at.x - extent, at.y - extent)
    }
}

/**
 * TIP-9, as a pure function of the window's pixels: the top-left of a [container] placed [offset] away from the
 * [anchor] on the side [placement] names (start is the left side left-to-right, the right side right-to-left), centred
 * on the anchor along that side. When the preferred side has no room (inside [margin] of the window's edge) it flips to
 * the opposite side; when neither has room it takes the one with more; then it shifts along the side to stay inside the
 * margin. A container taller (or wider) than the room on either side is kept inside the margin across the side too, over
 * the anchor, rather than cut off by the window's edge.
 */
internal fun tanreiTooltipPosition(
    placement: TanreiTooltipPlacement,
    anchor: IntRect,
    window: IntSize,
    direction: LayoutDirection,
    container: IntSize,
    offset: Int,
    margin: Int,
): IntOffset {
    fun shifted(ideal: Int, size: Int, total: Int): Int {
        val max = total - margin - size
        return if (max >= margin) ideal.coerceIn(margin, max) else margin
    }
    // Across the side: only when it would leave the window.
    fun inside(at: Int, size: Int, total: Int): Int = if (at < margin || at + size > total - margin) shifted(at, size, total) else at
    val vertical = placement == TanreiTooltipPlacement.Top || placement == TanreiTooltipPlacement.Bottom
    return if (vertical) {
        val above = anchor.top - offset - margin
        val below = window.height - margin - (anchor.bottom + offset)
        val prefersAbove = placement == TanreiTooltipPlacement.Top
        val (preferred, other) = if (prefersAbove) above to below else below to above
        val onPreferred = container.height <= preferred || (container.height > other && preferred >= other)
        val top = if (onPreferred == prefersAbove) anchor.top - offset - container.height else anchor.bottom + offset
        IntOffset(shifted(anchor.left + (anchor.width - container.width) / 2, container.width, window.width), inside(top, container.height, window.height))
    } else {
        val left = anchor.left - offset - margin
        val right = window.width - margin - (anchor.right + offset)
        val prefersLeft = (placement == TanreiTooltipPlacement.Start) == (direction == LayoutDirection.Ltr)
        val (preferred, other) = if (prefersLeft) left to right else right to left
        val onPreferred = container.width <= preferred || (container.width > other && preferred >= other)
        val x = if (onPreferred == prefersLeft) anchor.left - offset - container.width else anchor.right + offset
        IntOffset(inside(x, container.width, window.width), shifted(anchor.top + (anchor.height - container.height) / 2, container.height, window.height))
    }
}

/**
 * The anchor and its open tooltip drawn where they are composed, in the box it is given — no popup, no hover, no
 * motion: the test-only in-place form the baselines draw (the spec's harness: the anchor at the centre of a 320 × 200
 * stage, the tooltip beside it). The container is placed by [tanreiTooltipPosition] with the stage as the window.
 */
@Composable
internal fun TanreiTooltipInPlace(
    text: String,
    modifier: Modifier = Modifier,
    variant: TanreiTooltipVariant = TanreiTooltipVariant.Plain,
    title: String = "",
    placement: TanreiTooltipPlacement = TanreiTooltipPlacement.Top,
    anchor: @Composable () -> Unit,
) {
    val tokens = TanreiTheme.tokens.tooltip
    Layout(
        modifier = modifier,
        content = {
            Box { anchor() }
            TanreiTooltipContainer(text, title, variant, tokens)
        },
    ) { measurables, constraints ->
        val width = if (constraints.hasBoundedWidth) constraints.maxWidth else constraints.minWidth
        val height = if (constraints.hasBoundedHeight) constraints.maxHeight else constraints.minHeight
        val anchorPlaceable = measurables[0].measure(Constraints())
        // Never wider than the window's room inside its margin.
        val container = measurables[1].measure(Constraints(maxWidth = (width - 2 * tokens.windowMargin.roundToPx()).coerceAtLeast(0)))
        val x = (width - anchorPlaceable.width) / 2
        val y = (height - anchorPlaceable.height) / 2
        val anchorRect = IntRect(x, y, x + anchorPlaceable.width, y + anchorPlaceable.height)
        val at = tanreiTooltipPosition(placement, anchorRect, IntSize(width, height), layoutDirection, IntSize(container.width, container.height), tokens.offset.roundToPx(), tokens.windowMargin.roundToPx())
        layout(width, height) {
            anchorPlaceable.place(x, y)
            container.place(at)
        }
    }
}

/**
 * What opens and closes one tooltip by itself (TIP-1 – TIP-6, TIP-8): the pointer over the anchor or the tooltip,
 * keyboard focus on the anchor, a long touch, and the delays between them. Every change goes through
 * [TanreiTooltipState.toggle], which emits.
 */
internal class TanreiTooltipController(private val state: TanreiTooltipState, private val scope: CoroutineScope) {
    lateinit var tokens: TanreiTooltipTokens
    var enabled = true
    var longPressMillis = 0L

    private var hovering = false
    private var overTooltip = false
    private var focused = false

    /** TIP-6: activated while hovered; no reopening until the pointer has left and entered again. */
    private var activatedWhileHovering = false

    /** The Escape key down that closed it: its key up is consumed too (TIP-4). */
    private var escapeDown = false
    private var showing: Job? = null
    private var hiding: Job? = null

    private fun open() {
        if (!enabled) return
        cancelTimers()
        state.toggle(true)
    }

    fun close() {
        cancelTimers()
        state.toggle(false)
    }

    private fun cancelTimers() {
        showing?.cancel()
        hiding?.cancel()
        showing = null
        hiding = null
    }

    /** TIP-1 / TIP-8: after show-delay — or at once while another tooltip of the window is open. */
    fun pointerEntered() {
        hovering = true
        hiding?.cancel()
        if (activatedWhileHovering || state.isVisible) return
        if (TanreiTooltipWindows.anotherOpen(state.window, state)) {
            open()
            return
        }
        showing?.cancel()
        showing = scope.launch {
            delay(tokens.motionShowDelay.toLong())
            if (hovering) open()
        }
    }

    /** TIP-1: the pointer left the anchor: close once it has been off the anchor and the tooltip for hide-delay. */
    fun pointerLeft() {
        hovering = false
        activatedWhileHovering = false
        showing?.cancel()
        scheduleHide()
    }

    fun pointerOverTooltip(over: Boolean) {
        overTooltip = over
        if (over) hiding?.cancel() else scheduleHide()
    }

    private fun scheduleHide() {
        if (!state.isVisible) return
        hiding?.cancel()
        hiding = scope.launch {
            delay(tokens.motionHideDelay.toLong())
            if (!hovering && !overTooltip && !focused) close()
        }
    }

    /** TIP-2: keyboard focus opens it at once; losing focus closes it. */
    fun focusChanged(hasFocus: Boolean, keyboard: Boolean) {
        if (hasFocus == focused) return
        focused = hasFocus
        if (hasFocus && keyboard) open() else if (!hasFocus) close()
    }

    /** TIP-3: a long touch opens it. */
    fun longPressed() {
        open()
    }

    /** TIP-3: the finger lifted: it stays for the touch timeout. */
    fun touchReleased() {
        hiding?.cancel()
        hiding = scope.launch {
            delay(tokens.timeoutTouch.toLong())
            close()
        }
    }

    /** TIP-6: the anchor was activated. */
    fun activated() {
        if (hovering) activatedWhileHovering = true
        close()
    }

    /** TIP-4 / TIP-6: the keys the anchor hears. True when the tooltip used the key. */
    fun key(key: Key, down: Boolean): Boolean {
        if (key == Key.Escape) {
            if (down && state.isVisible) {
                escapeDown = true
                close()
                return true
            }
            if (!down && escapeDown) {
                escapeDown = false
                return true
            }
            return false
        }
        if (down && (key == Key.Enter || key == Key.NumPadEnter || key == Key.Spacebar)) activated()
        return false
    }
}

/** Debuggable apps only (TIP-16): one report per message and composition site. */
@Composable
private fun TanreiReportTooltipProblem(message: String) {
    if (!isTanreiDebuggable()) return
    remember(message) { TanreiDiagnostics.reporter(message) }
}
