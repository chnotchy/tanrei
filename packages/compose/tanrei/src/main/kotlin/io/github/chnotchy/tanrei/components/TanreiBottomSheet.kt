package io.github.chnotchy.tanrei.components

import android.view.ViewConfiguration
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.AnimationSpec
import androidx.compose.animation.core.animate
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.snap
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.gestures.ScrollableDefaults
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.exclude
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.ime
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.union
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawOutline
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.PointerInputChange
import androidx.compose.ui.layout.LayoutCoordinates
import androidx.compose.ui.layout.onPlaced
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.collapse
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.expand
import androidx.compose.ui.semantics.isTraversalGroup
import androidx.compose.ui.semantics.paneTitle
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.max
import io.github.chnotchy.tanrei.primitives.TanreiDrawnStates
import io.github.chnotchy.tanrei.primitives.TanreiModalSheetWindow
import io.github.chnotchy.tanrei.primitives.TanreiReportMissingName
import io.github.chnotchy.tanrei.primitives.TanreiStateMotion
import io.github.chnotchy.tanrei.primitives.animateTanreiColorAsState
import io.github.chnotchy.tanrei.primitives.collectTanreiInteraction
import io.github.chnotchy.tanrei.primitives.drawnStates
import io.github.chnotchy.tanrei.primitives.isDrawn
import io.github.chnotchy.tanrei.primitives.rememberTanreiFocusReturn
import io.github.chnotchy.tanrei.primitives.rememberTanreiRipple
import io.github.chnotchy.tanrei.primitives.tanreiContainer
import io.github.chnotchy.tanrei.primitives.tanreiContainerShape
import io.github.chnotchy.tanrei.primitives.tanreiDecorationOverflow
import io.github.chnotchy.tanrei.primitives.tanreiElevation
import io.github.chnotchy.tanrei.primitives.tanreiFocusRing
import io.github.chnotchy.tanrei.primitives.tanreiGroupOpacity
import io.github.chnotchy.tanrei.primitives.tanreiPressInput
import io.github.chnotchy.tanrei.primitives.tanreiRippleInput
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiTextStyle
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.tanreiTween
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiBottomSheetControl
import io.github.chnotchy.tanrei.tokens.TanreiBottomSheetTokens
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiShadowLayer
import kotlin.math.abs
import kotlin.math.roundToInt
import kotlin.math.sign
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Job
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

/*
 * `specs/bottom-sheet.spec.json` (BSH-1…26) on Compose, as `platforms.compose` maps it: `TanreiBottomSheet(visible,
 * onClose, variant, detent, onDetentChange, dismissible, handle, handleLabel, inset, contentDescription, initialFocus,
 * content)`. `modal` is a modal overlay, presented as the dialog and the modal drawer are, in a `Dialog`
 * window of its own with Tanrei's scrim; `standard` is a layout region that fills the parent the
 * product places it in — a `Box` over the content — and draws the sheet at its bottom edge. Both read the same
 * `comp.bottom-sheet` tokens (`TanreiTheme.tokens.bottomSheet`). The sheet asks to close (`onClose` with a reason) and
 * the product closes it by setting `visible` to false (BSH-5); a height the person chose stays until the product sets
 * `detent` again (BSH-21).
 */

/**
 * Why a Tanrei sheet asks to be closed — the spec's `close` event's reason (bottom sheet: BSH-5; side sheet: SSH-4,
 * SSH-5). The product closes the sheet in answer, by setting `visible` to false.
 */
public enum class TanreiSheetCloseReason {
    /** The sheet's own close button (a side sheet's). */
    Close,

    /** A press on a modal sheet's scrim. */
    Scrim,

    /** Escape, from a hardware keyboard, on a modal sheet. */
    Escape,

    /** The platform's back (the gesture or the button) on a modal sheet. */
    Back,

    /** A released drag that asked the sheet to close. */
    Drag,
}

/** The spec's `variant`: how a [TanreiBottomSheet] relates to the content it covers. Not a token axis. */
public enum class TanreiBottomSheetVariant {
    /** Over the bottom of its parent while the content above stays usable: a layout region. */
    Standard,

    /** Over the whole window with a scrim, holding focus until it closes: a modal overlay. */
    Modal,
}

/** The spec's `detent`: the height a [TanreiBottomSheet] rests at while its content is taller than it (BSH-6). */
public enum class TanreiBottomSheetDetent {
    /** `comp.bottom-sheet.container.partial-fraction` of the area it covers. */
    Partial,

    /** Up to `comp.bottom-sheet.container.margin-block-start` below the area's top. */
    Full,
}

/**
 * Shows supplementary content or a short task in a surface that rises from the bottom edge. Implements
 * `specs/bottom-sheet.spec.json`; every value comes from `TanreiTheme.tokens.bottomSheet`.
 *
 * @param visible the spec's `open`. The product opens it, and closes it in answer to [onClose] (or from its own
 *   controls); the sheet never closes itself (BSH-5). A parameter, so that the exit motion runs before the sheet goes.
 * @param onClose the spec's `close`: the sheet asks to be closed, with the reason — a released drag below its lowest
 *   height ([TanreiSheetCloseReason.Drag], either variant) or, on a modal sheet, a press on the scrim, Escape or the
 *   platform's back. Called once per request, only while [dismissible] is true.
 * @param modifier applied to the sheet's container.
 * @param variant [TanreiBottomSheetVariant.Modal] (default) presents it in a window of its own over a scrim;
 *   [TanreiBottomSheetVariant.Standard] fills the parent it is placed in (a `Box` over the content) and draws the sheet
 *   at its bottom edge, the part above taking no presses.
 * @param detent the height it rests at while its content is taller than its partial height (BSH-6). Setting it moves
 *   the sheet (BSH-21); a height the person chose stays until it is set again.
 * @param onDetentChange the spec's `detentChange`: the person moved the sheet to its other height, by a drag or with
 *   the drag handle. Not called when the product sets [detent].
 * @param dismissible whether a drag below the lowest height and, on a modal sheet, the scrim, Escape and back ask to
 *   close it (default true).
 * @param handle draws the drag handle at the top (default true).
 * @param handleLabel the drag handle's accessible name ("Resize sheet"). Required while the handle is interactive —
 *   while the sheet has two heights (BSH-11); an empty one is reported in debuggable apps.
 * @param inset insets the content by `containerPadding` (default true); false for content that pads itself.
 * @param contentDescription the spec's `label`: names the sheet ("Share photo") — the modal sheet's pane title, the
 *   standard sheet's region. Required: an empty one is reported in debuggable apps (BSH-22).
 * @param initialFocus the element focus moves to when it opens (BSH-3): attach it with `Modifier.focusRequester`. Null:
 *   the sheet's container, so its label is read first.
 * @param content the sheet's content, handed `contentColor` as its content color and `sys.typescale.body` as its text
 *   style, scrolled by the sheet when it is taller than the sheet (BSH-10). Give it a plain column, not a lazy list.
 */
@Composable
public fun TanreiBottomSheet(
    visible: Boolean,
    onClose: (TanreiSheetCloseReason) -> Unit,
    modifier: Modifier = Modifier,
    variant: TanreiBottomSheetVariant = TanreiBottomSheetVariant.Modal,
    detent: TanreiBottomSheetDetent = TanreiBottomSheetDetent.Partial,
    onDetentChange: (TanreiBottomSheetDetent) -> Unit = {},
    dismissible: Boolean = true,
    handle: Boolean = true,
    handleLabel: String = "",
    inset: Boolean = true,
    contentDescription: String = "",
    initialFocus: FocusRequester? = null,
    content: @Composable () -> Unit,
) {
    val tokens = TanreiTheme.tokens.bottomSheet
    val modal = variant == TanreiBottomSheetVariant.Modal
    // BSH-22: still renders; reported in debuggable apps.
    if (contentDescription.isBlank()) TanreiReportMissingName("TanreiBottomSheet", "contentDescription", what = "a sheet without a label")
    val state = remember { TanreiBottomSheetState(detent) }
    state.bind(visible, dismissible, onClose, onDetentChange, tanreiTween(tokens.motionEnterDuration, tokens.motionEnterEasing), LocalContext.current)

    // BSH-1: how far the sheet is shown, 0 to 1, over the enter or exit motion; a sheet mounted open is in place at
    // once. Where motion is reduced (Android's setting removes every animation) it appears and goes at once.
    val shown = remember { Animatable(if (visible) 1f else 0f) }
    val enter = tanreiTween<Float>(tokens.motionEnterDuration, tokens.motionEnterEasing)
    val exit = tanreiTween<Float>(tokens.motionExitDuration, tokens.motionExitEasing)
    LaunchedEffect(visible) {
        if (visible) {
            // Opened again after it had gone: at the product's detent, not where it was left.
            if (shown.value == 0f) state.reset(detent)
            shown.animateTo(1f, enter)
        } else {
            shown.animateTo(0f, exit)
        }
    }
    // BSH-21: the product's detent moves it; the first composition is not a change.
    val seenDetent = remember { Seen(detent) }
    LaunchedEffect(detent) {
        if (seenDetent.value == detent) return@LaunchedEffect
        seenDetent.value = detent
        state.moveTo(detent, emit = false)
    }
    val open by rememberUpdatedState(visible)
    val present by remember { derivedStateOf { open || shown.value > 0f } }

    // BSH-3: a standard sheet mounted open does not move focus; every later opening does. A modal one always does.
    val seenOpen = remember { Seen(visible) }
    val sheetFocus = remember { FocusRequester() }
    val focus = remember(initialFocus) { TanreiSheetFocus(initialFocus, sheetFocus) }

    if (!modal) {
        // BSH-3: opening moves focus in; closing while it is inside hands it back to the element
        // that had it, or clears it where that element is gone — when the sheet opens or closes, not when it has moved.
        val focusReturn = rememberTanreiFocusReturn()
        val focusManager = LocalFocusManager.current
        LaunchedEffect(visible) {
            if (seenOpen.value == visible) return@LaunchedEffect
            seenOpen.value = visible
            if (visible) {
                focusReturn.capture()
                withFrameNanos { }
                focus.moveIn()
            } else if (focus.inside) {
                if (!focusReturn.restore()) focusManager.clearFocus()
            }
        }
        if (!present) return
        TanreiBottomSheetLayer(
            state = state,
            modal = false,
            handle = handle,
            handleLabel = handleLabel,
            inset = inset,
            contentDescription = contentDescription,
            shown = { shown.value },
            focus = focus,
            areaInsets = WindowInsets.ime.only(WindowInsetsSides.Bottom),
            sheetInsets = WindowInsets.systemBars.only(WindowInsetsSides.Bottom).exclude(WindowInsets.ime),
            modifier = modifier,
            content = content,
        )
        return
    }

    if (!present) return
    // BSH-2 / BSH-5: the window traps focus, hides the window under it and hears back.
    TanreiModalSheetWindow(onBack = { state.requestClose(TanreiSheetCloseReason.Back) }, backEnabled = dismissible) {
        // BSH-3: every presentation moves focus in, that of a sheet mounted open too — the window makes everything behind
        // it unfocusable, so focus must be somewhere it can reach.
        DisposableEffect(Unit) { onDispose { seenOpen.value = false } }
        LaunchedEffect(Unit) {
            withFrameNanos { }
            focus.moveIn()
        }
        TanreiBottomSheetLayer(
            state = state,
            modal = true,
            handle = handle,
            handleLabel = handleLabel,
            inset = inset,
            contentDescription = contentDescription,
            shown = { shown.value },
            focus = focus,
            areaInsets = WindowInsets.safeDrawing.only(WindowInsetsSides.Top).union(WindowInsets.ime.only(WindowInsetsSides.Bottom)),
            sheetInsets = WindowInsets.systemBars.only(WindowInsetsSides.Bottom).exclude(WindowInsets.ime),
            modifier = modifier,
            content = content,
        )
    }
}

/** Not a snapshot state on purpose: the value an effect saw last. */
private class Seen<T>(var value: T)

/**
 * Where focus goes when a sheet opens (BSH-3): the product's [initial] element or, without one, the container — a focus
 * stop only until something inside it has had focus, so it is not a stop of the Tab cycle.
 */
internal class TanreiSheetFocus(private val initial: FocusRequester?, val container: FocusRequester) {
    var containerFocusable by mutableStateOf(false)
    var inside = false

    /**
     * Moves focus in. The container becomes focusable first and takes focus on the next frame: focus properties are read
     * again only once the change has been applied.
     */
    suspend fun moveIn() {
        if (initial != null) {
            initial.requestFocus()
        } else {
            containerFocusable = true
            withFrameNanos { }
            container.requestFocus()
        }
    }
}

/**
 * The sheet's motion and heights (BSH-6, BSH-9 – BSH-11, BSH-20, BSH-21). The sheet rests at [chosen] — its partial or
 * full height while it has two, else its one height — and [offset] (pixels, up is positive) is how far a drag or a
 * settle moved it from there. The heights are those of the last layout.
 */
@Stable
internal class TanreiBottomSheetState(initial: TanreiBottomSheetDetent) {
    var chosen by mutableStateOf(initial)
        private set
    var offset by mutableFloatStateOf(0f)
        private set

    /** The handle's row, the content (with its insets) and the bottom inset, measured; -1 before the first layout. */
    var natural by mutableIntStateOf(-1)

    /** Whether the content is taller than the partial height: the sheet has two heights (BSH-6, BSH-11). */
    var twoHeights by mutableStateOf(false)

    var lowest = 0f
    var high = 0f
    var sheetHeight = 0

    /** The detent a drag started from; null while no drag moves the sheet. */
    private var dragFrom: TanreiBottomSheetDetent? = null
    private var settling: Job? = null

    var visible = true
        private set
    private var dismissible = true
    private var onClose: (TanreiSheetCloseReason) -> Unit = {}
    private var onDetentChange: (TanreiBottomSheetDetent) -> Unit = {}
    private var settle: AnimationSpec<Float> = snap()
    private var flingVelocity = 0f

    fun bind(visible: Boolean, dismissible: Boolean, onClose: (TanreiSheetCloseReason) -> Unit, onDetentChange: (TanreiBottomSheetDetent) -> Unit, settle: AnimationSpec<Float>, context: android.content.Context) {
        this.visible = visible
        this.dismissible = dismissible
        this.onClose = onClose
        this.onDetentChange = onDetentChange
        this.settle = settle
        flingVelocity = ViewConfiguration.get(context).scaledMinimumFlingVelocity.toFloat()
    }

    /** The height the sheet rests at now. */
    val rest: Float get() = if (twoHeights && chosen == TanreiBottomSheetDetent.Full) high else lowest

    /** How tall the sheet is drawn: never above its full height; below its lowest height it slides down instead. */
    val height: Float get() = (rest + offset).coerceAtMost(high)

    /** How far the sheet is moved down: below its lowest height by a drag, and out of view by what is not [shown]. */
    fun translation(shown: Float): Float = (lowest - height).coerceAtLeast(0f) + (1f - shown.coerceIn(0f, 1f)) * sheetHeight

    fun reset(detent: TanreiBottomSheetDetent) {
        settling?.cancel()
        chosen = detent
        offset = 0f
        dragFrom = null
    }

    /** BSH-5: a request to close, heard once per request while the sheet is open and dismissible. */
    fun requestClose(reason: TanreiSheetCloseReason): Boolean {
        if (!visible || !dismissible) return false
        onClose(reason)
        return true
    }

    /** A drag moved the sheet by [dy] pixels (down is positive); answers how much of it the sheet took. */
    fun dragBy(dy: Float): Float {
        if (dragFrom == null) startDrag()
        val before = offset
        offset = (offset - dy).coerceIn(-rest, high - rest)
        return before - offset
    }

    fun startDrag() {
        settling?.cancel()
        dragFrom = chosen
    }

    /** Whether a drag has moved the sheet and not been released. */
    val dragging: Boolean get() = dragFrom != null

    /**
     * BSH-9 / BSH-20: the drag was released at [velocity] (pixels per second, down is positive). It settles at the next
     * height in the direction of a fling, else the nearest one; below half of the lowest height, or flung down from it,
     * it asks to close — and holds for a frame: gone if the product closed it, settled back at the lowest height if not.
     */
    suspend fun release(velocity: Float) {
        val from = dragFrom ?: return
        val at = rest + offset
        val heights = if (twoHeights) listOf(TanreiBottomSheetDetent.Partial to lowest, TanreiBottomSheetDetent.Full to high) else listOf(chosen to lowest)
        var close = false
        var target = when {
            velocity > flingVelocity -> heights.lastOrNull { it.second < at - HALF_PIXEL }?.first ?: heights.first().first.also { close = true }
            velocity < -flingVelocity -> (heights.firstOrNull { it.second > at + HALF_PIXEL } ?: heights.last()).first
            else -> heights.minBy { abs(it.second - at) }.first.also { close = at < lowest / 2f }
        }
        if (close) {
            target = heights.first().first
            if (dismissible && visible) {
                onClose(TanreiSheetCloseReason.Drag)
                // BSH-20: where the drag left it, for one frame; then out from there, or back.
                withFrameNanos { }
                if (!visible) {
                    dragFrom = null
                    return
                }
            }
        }
        dragFrom = null
        settleAt(target, emit = target != from && twoHeights)
    }

    /** BSH-11: the drag handle moves the sheet to its other height. */
    suspend fun toggle() {
        if (!twoHeights) return
        val other = if (chosen == TanreiBottomSheetDetent.Full) TanreiBottomSheetDetent.Partial else TanreiBottomSheetDetent.Full
        settleAt(other, emit = true)
    }

    /** BSH-21: to [detent] over the enter motion; [emit] says whether it is the person's change. */
    suspend fun moveTo(detent: TanreiBottomSheetDetent, emit: Boolean) {
        if (detent == chosen && dragFrom == null) return
        dragFrom = null
        settleAt(detent, emit)
    }

    private suspend fun settleAt(target: TanreiBottomSheetDetent, emit: Boolean) {
        val at = rest + offset
        chosen = target
        offset = at - rest
        if (emit) onDetentChange(target)
        settling = currentCoroutineContext()[Job]
        animate(offset, 0f, animationSpec = settle) { value, _ -> offset = value }
    }

    /**
     * BSH-9 / BSH-10: a drag the sheet owns moved the finger by [dy] pixels (down is positive). Up, it raises the sheet to
     * its full height and then, for a drag that started on the content, scrolls the content; down, it first scrolls such
     * content back to its top and then lowers the sheet.
     */
    fun follow(dy: Float, onContent: Boolean, scroll: ScrollState) {
        if (dy < 0f) {
            val left = dy - dragBy(dy)
            if (onContent && left < 0f) scroll.dispatchRawDelta(-left)
        } else if (dy > 0f) {
            val scrolled = if (onContent && scroll.value > 0) -scroll.dispatchRawDelta(-dy) else 0f
            dragBy(dy - scrolled)
        }
    }

    /** Whether the sheet is below its full height: a drag up moves it before it scrolls anything. */
    val belowFull: Boolean get() = rest + offset < high - HALF_PIXEL

    /** The heights for an area [area] pixels high and a sheet whose content wants [natural] pixels (BSH-6). */
    fun heights(area: Int, natural: Int, tokens: TanreiBottomSheetTokens, marginBlockStart: Int): Triple<Boolean, Float, Float> {
        val partial = area * tokens.containerPartialFraction
        val full = (area - marginBlockStart).coerceAtLeast(0).toFloat()
        val two = natural > partial + HALF_PIXEL && full > partial
        val low = if (two) partial else natural.toFloat().coerceAtMost(full)
        val top = if (two) natural.toFloat().coerceAtMost(full) else low
        return Triple(two, low, top)
    }
}

private const val HALF_PIXEL = 0.5f

/**
 * The sheet, and for a modal sheet the scrim, filling what they are given (the dialog window; the parent of a standard
 * sheet; the baselines' stage). [areaInsets] end the area the sheet covers (the top system inset of a modal sheet's
 * window, the keyboard); [sheetInsets] are what the container's color reaches under and its content keeps above (the
 * bottom system inset).
 */
@Composable
internal fun TanreiBottomSheetLayer(
    state: TanreiBottomSheetState,
    modal: Boolean,
    handle: Boolean,
    handleLabel: String,
    inset: Boolean,
    contentDescription: String,
    shown: () -> Float,
    focus: TanreiSheetFocus,
    areaInsets: WindowInsets,
    sheetInsets: WindowInsets,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val system = TanreiTheme.tokens
    val tokens = system.bottomSheet
    val scope = rememberCoroutineScope()
    var escapeDown by remember { mutableStateOf(false) }
    val window = LocalView.current.rootView
    val layer = if (!modal) {
        Modifier.fillMaxSize()
    } else {
        Modifier
            .fillMaxSize()
            // BSH-5: Escape asks to close — after a tooltip open in this window has had it — and goes no further.
            .onPreviewKeyEvent { event ->
                if (event.key != Key.Escape) return@onPreviewKeyEvent false
                if (event.type == KeyEventType.KeyDown) {
                    escapeDown = true
                    if (!TanreiTooltipWindows.dismissOnEscape(window)) state.requestClose(TanreiSheetCloseReason.Escape)
                    return@onPreviewKeyEvent true
                }
                // Its key up too: the platform's own dialog would hear it as back.
                val consumed = escapeDown
                escapeDown = false
                consumed
            }
    }
    Box(layer) {
        if (modal) {
            // BSH-1 / BSH-2: the scrim over the whole window, fading with the sheet; BSH-5: a press on it asks to close.
            val scrim = tokens.scrimColor.color
            Box(
                Modifier
                    .fillMaxSize()
                    .drawBehind { if (scrim.isDrawn) drawRect(scrim, alpha = shown().coerceIn(0f, 1f)) }
                    .pointerInput(Unit) { detectTapGestures { state.requestClose(TanreiSheetCloseReason.Scrim) } }
                    .clearAndSetSemantics {},
            )
        }
        Box(Modifier.fillMaxSize().windowInsetsPadding(areaInsets)) {
            TanreiBottomSheetSurface(
                state = state,
                tokens = tokens,
                modal = modal,
                handle = handle,
                handleLabel = handleLabel,
                inset = inset,
                contentDescription = contentDescription,
                shown = shown,
                focus = focus,
                sheetInsets = sheetInsets,
                onToggle = { scope.launch { state.toggle() } },
                onRelease = { velocity -> state.release(velocity) },
                placement = Modifier.align(Alignment.BottomCenter),
                modifier = modifier,
                content = content,
            )
        }
    }
}

/**
 * The sheet itself (BSH-6 – BSH-12, BSH-22, BSH-24, BSH-26): docked to the bottom of the area, as wide as it but no
 * wider than `containerMaxWidth`, centred; `containerColor` at `containerElevation`, its top corners `containerShape`
 * eased by corner smoothing and its bottom corners square; the handle's row at its top, then the content, scrolled
 * below the row when it is taller than the room. As tall as the row and the content, but no taller than its height.
 */
@Composable
private fun TanreiBottomSheetSurface(
    state: TanreiBottomSheetState,
    tokens: TanreiBottomSheetTokens,
    modal: Boolean,
    handle: Boolean,
    handleLabel: String,
    inset: Boolean,
    contentDescription: String,
    shown: () -> Float,
    focus: TanreiSheetFocus,
    sheetInsets: WindowInsets,
    onToggle: () -> Unit,
    onRelease: suspend (Float) -> Unit,
    placement: Modifier,
    modifier: Modifier,
    content: @Composable () -> Unit,
) {
    val system = TanreiTheme.tokens
    val smoothing = system.shape.cornerSmoothing
    val shape = remember(tokens.containerShape, smoothing) { tanreiContainerShape(tokens.containerShape, Dp.Hairline, smoothing) }
    val color = tokens.containerColor.color
    val scroll = rememberScrollState()
    val label = contentDescription.takeUnless { it.isBlank() }
    var sheetCoordinates by remember { mutableStateOf<LayoutCoordinates?>(null) }
    val fling = ScrollableDefaults.flingBehavior()
    val flingScope = rememberCoroutineScope()
    val onContentFling: (Float) -> Unit = { velocity -> flingScope.launch { scroll.scroll { with(fling) { performFling(-velocity) } } } }
    val padding = tokens.containerPadding
    val contentColor = tokens.contentColor.color
    val bodyStyle = system.typescale.body.toTextStyle()
    val rowHeight = tokens.handleMarginBlock * 2 + tokens.handleContainerHeight
    Layout(
        contents = listOf(
            {
                // BSH-8 / BSH-10: the content below the row, inset (unless inset is false), scrolled by the sheet.
                Box(
                    Modifier
                        .verticalScroll(scroll)
                        .then(if (inset) Modifier.padding(start = padding, end = padding, bottom = padding, top = if (handle) Dp.Hairline else padding) else Modifier),
                ) {
                    CompositionLocalProvider(
                        LocalTanreiContentColor provides contentColor,
                        LocalTanreiTextStyle provides bodyStyle,
                        content = content,
                    )
                }
            },
            {
                if (handle) {
                    TanreiBottomSheetHandle(
                        tokens = tokens,
                        interactive = state.twoHeights,
                        expanded = state.chosen == TanreiBottomSheetDetent.Full,
                        label = handleLabel,
                        onToggle = onToggle,
                    )
                }
            },
        ),
        modifier = placement
            .widthIn(max = tokens.containerMaxWidth)
            .fillMaxWidth()
            // BSH-1 / BSH-9: slid down by what is not shown, and below its lowest height by a drag.
            .offset { IntOffset(0, state.translation(shown()).roundToInt()) }
            .then(modifier)
            // BSH-22: a modal dialog (the window) named by its pane title, or a region named by the label.
            .semantics {
                isTraversalGroup = true
                if (label != null) {
                    if (modal) paneTitle = label
                    this.contentDescription = label
                }
            }
            // BSH-3: focus moves to the container when there is no initial focus; it is a stop only until then.
            .focusRequester(focus.container)
            .focusProperties { canFocus = focus.containerFocusable }
            .onFocusChanged {
                focus.inside = it.hasFocus
                if (it.hasFocus && !it.isFocused) focus.containerFocusable = false
            }
            .focusable()
            .onPlaced { sheetCoordinates = it }
            // A press on the sheet is the sheet's: it never reaches the scrim. BSH-9 / BSH-10: its drags.
            .pointerInput(state, scroll) {
                sheetDrags(state, scroll, contentTop = { if (handle) rowHeight.roundToPx() else 0 }, coordinates = { sheetCoordinates }, onRelease = onRelease, onFling = onContentFling)
            }
            .tanreiElevation(tokens.containerElevation, shape)
            .tanreiContainer(shape, containerColor = { color }, outlineColor = Color.Transparent, outlineWidth = Dp.Hairline)
            .clip(shape),
    ) { (scrollers, handles), constraints ->
        val area = constraints.maxHeight
        val width = constraints.maxWidth
        val row = if (handle) rowHeight.roundToPx() else 0
        val bottomInset = sheetInsets.getBottom(this)
        val chrome = row + bottomInset
        val margin = tokens.containerMarginBlockStart.roundToPx()
        // BSH-6: the heights come from what the content wants; before the first layout, from the most it can have.
        val known = state.natural
        var (two, low, top) = state.heights(area, if (known >= 0) known else area, tokens, margin)
        fun drawn(two: Boolean, low: Float, top: Float): Int {
            val rest = if (two && state.chosen == TanreiBottomSheetDetent.Full) top else low
            return (rest + state.offset).coerceIn(low, top).roundToInt()
        }
        var height = drawn(two, low, top)
        val scroller = scrollers.first().measure(Constraints(minWidth = width, maxWidth = width, maxHeight = (height - chrome).coerceAtLeast(0)))
        val natural = chrome + scroller.height + scroll.maxValue
        if (natural != known) {
            // Measured for the first time, or the content changed: the heights follow on the next frame.
            state.natural = natural
            val exact = state.heights(area, natural, tokens, margin)
            two = exact.first
            low = exact.second
            top = exact.third
            height = drawn(two, low, top)
        }
        if (state.twoHeights != two) state.twoHeights = two
        state.lowest = low
        state.high = top
        state.sheetHeight = height
        val handlePlaceable = handles.firstOrNull()?.measure(Constraints(minWidth = width, maxWidth = width))
        layout(width, height) {
            scroller.place(0, row)
            // BSH-15: the handle's hit area, where it is taller than its row, lies over the content.
            handlePlaceable?.place(0, 0)
        }
    }
}

/**
 * BSH-9 / BSH-10: the sheet's drags, heard first (the initial pass) on the whole sheet — its handle's row, its padding
 * and its content. The finger is followed by its position in the window, which does not move with the sheet: a delta
 * measured against the sheet itself is short of the finger's by the sheet's own move since the last event.
 *
 * Past the touch slop the drag is decided once: the sheet owns it when it moves the sheet — up while the sheet is below
 * its full height, down from the handle's row or from content scrolled to its top — and then consumes every move
 * (a press on the handle is cancelled), raising the sheet and then scrolling the content, or scrolling the content back
 * and then lowering the sheet ([TanreiBottomSheetState.follow]). Otherwise the content's own scroll has the drag, until
 * it reaches its top while the finger still moves down: then the sheet takes it over. On release the sheet settles
 * ([onRelease], with the finger's velocity), and content the drag went on to scroll up flings ([onFling]).
 */
private suspend fun androidx.compose.ui.input.pointer.PointerInputScope.sheetDrags(
    state: TanreiBottomSheetState,
    scroll: ScrollState,
    contentTop: () -> Int,
    coordinates: () -> LayoutCoordinates?,
    onRelease: suspend (Float) -> Unit,
    onFling: (Float) -> Unit,
) = coroutineScope {
    val slop = viewConfiguration.touchSlop
    awaitEachGesture {
        val down = awaitFirstDown(requireUnconsumed = false, pass = PointerEventPass.Initial)
        fun windowY(change: PointerInputChange): Float = coordinates()?.takeIf { it.isAttached }?.localToRoot(change.position)?.y ?: change.position.y
        var last = windowY(down)
        val onContent = down.position.y >= contentTop()
        val scrolledFrom = scroll.value
        val tracker = TanreiFingerVelocity()
        tracker.add(down.uptimeMillis, last)
        var owned = false
        var decided = false
        var travel = 0f
        while (true) {
            val event = awaitPointerEvent(PointerEventPass.Initial)
            val change = event.changes.firstOrNull { it.id == down.id } ?: break
            val y = windowY(change)
            val dy = y - last
            last = y
            tracker.add(change.uptimeMillis, y)
            if (!change.pressed) {
                if (owned) {
                    change.consume()
                    val velocity = tracker.velocity()
                    // The sheet settles; a drag that went on to scroll the content up flings it.
                    if (onContent && scroll.value > scrolledFrom && !state.belowFull && velocity < 0f) onFling(velocity)
                    if (state.dragging) launch(start = CoroutineStart.UNDISPATCHED) { onRelease(velocity) }
                }
                break
            }
            if (!state.visible) continue
            if (!decided) {
                travel += dy
                if (abs(travel) <= slop) continue
                decided = true
                owned = if (travel < 0f) state.belowFull || !onContent else !onContent || scroll.value == 0
                if (!owned) continue
                state.startDrag()
                state.follow(travel - slop * sign(travel), onContent, scroll)
                change.consume()
                continue
            }
            if (!owned) {
                // The content's scroll has the drag: the sheet takes it over once the content is at its top.
                if (dy > 0f && scroll.value == 0 && onContent) {
                    owned = true
                    state.startDrag()
                } else {
                    continue
                }
            }
            state.follow(dy, onContent, scroll)
            change.consume()
        }
    }
}

/**
 * The finger's velocity at release, in pixels per second: its move over the last [WindowMillis] before the last sample,
 * so that a finger that stopped before it was lifted has none (and a lift at the time of the last move changes nothing).
 */
private class TanreiFingerVelocity {
    private val times = ArrayDeque<Long>()
    private val positions = ArrayDeque<Float>()

    fun add(time: Long, position: Float) {
        times.addLast(time)
        positions.addLast(position)
        while (times.size > 2 && times.last() - times.first() > HorizonMillis) {
            times.removeFirst()
            positions.removeFirst()
        }
    }

    fun velocity(): Float {
        val now = times.lastOrNull() ?: return 0f
        val from = times.indexOfFirst { now - it <= WindowMillis }
        if (from < 0) return 0f
        val span = now - times[from]
        return if (span <= 0L) 0f else (positions.last() - positions[from]) * 1000f / span
    }

    private companion object {
        const val WindowMillis = 50L
        const val HorizonMillis = 100L
    }
}

/**
 * The drag handle (BSH-11 – BSH-19): a row of the handle's margins and box, the grip centred in the box. While the sheet
 * has two heights it is one button named by [label], expanded while the sheet is at its full height, that moves the
 * sheet to its other height — `TanreiButton`'s chain with the sheet's `controls[drag-handle]` tokens; else the grip is
 * drawn at rest and nothing is exposed.
 */
@Composable
private fun TanreiBottomSheetHandle(tokens: TanreiBottomSheetTokens, interactive: Boolean, expanded: Boolean, label: String, onToggle: () -> Unit) {
    val system = TanreiTheme.tokens
    val source = remember { MutableInteractionSource() }
    // BSH-11: an interactive handle needs a name.
    if (interactive && label.isBlank()) TanreiReportMissingName("TanreiBottomSheet", "handleLabel", what = "a drag handle without a label")
    // BSH-13: one state wins; BSH-16: a press counts from the first frame and for at least press-hold.
    val interaction = source.collectTanreiInteraction(enabled = interactive)
    // BSH-17: the pressed tokens say WHAT a press looks like; `pressed-feedback` says how it arrives.
    val feedback = system.behavior.pressedFeedback
    val drawnStates = if (interactive) interaction.drawnStates(feedback) else AtRest
    val palette = tokens.controls[TanreiBottomSheetControl.DragHandle]
    // BSH-19: the colors move over the state motion; entering pressed snaps.
    val motion = TanreiStateMotion(if (interactive) interaction.state else TanreiInteractionState.Enabled, tokens.motionStateDuration, tokens.motionStateEasing)
    val boxColor = animateTanreiColorAsState(palette[drawnStates.container].containerColor.color, motion, label = "box")
    val gripColor = animateTanreiColorAsState(palette[drawnStates.content].gripColor.color, motion, label = "grip")
    val opacity = animateFloatAsState(tokens.opacity(drawnStates.content), motion.spec(), label = "opacity")
    // BSH-18: the box's and the grip's corners, eased by corner smoothing.
    val smoothing = system.shape.cornerSmoothing
    val boxShape = remember(tokens.handleContainerShape, smoothing) { tanreiContainerShape(tokens.handleContainerShape, smoothing) }
    val gripShape = remember(tokens.handleGripShape, smoothing) { tanreiContainerShape(tokens.handleGripShape, smoothing) }
    // BSH-17, ripple: the pressed box color from the point of contact; a press on the hit area outside the box grows
    // from its center.
    val ripple = rememberTanreiRipple(
        feedback = feedback,
        interaction = interaction,
        color = palette.pressed.containerColor.color,
        feedbackDurationMillis = tokens.motionFeedbackDuration,
        stateDurationMillis = tokens.motionStateDuration,
        stateEasing = tokens.motionStateEasing,
        centerOutsideContainer = true,
    )
    val target = system.measure.targetTouch
    val row = tokens.handleMarginBlock * 2 + tokens.handleContainerHeight
    // BSH-15: the hit area is the row across the box, at least the touch target wide and high.
    val hitWidth = max(tokens.handleContainerWidth, target)
    val hitHeight = max(row, target)
    val named = label.takeUnless { it.isBlank() }
    val input = if (interactive) {
        Modifier
            .semantics {
                if (named != null) contentDescription = named
                // BSH-11: the expanded state, and the platform's expand and collapse.
                if (expanded) collapse { onToggle(); true } else expand { onToggle(); true }
            }
            .clickable(interactionSource = source, indication = null, role = Role.Button, onClick = onToggle)
            .tanreiPressInput(interaction.press)
            .tanreiRippleInput(ripple)
    } else {
        // BSH-11: one height — drawn at rest, not focusable, not pressable, not exposed.
        Modifier.clearAndSetSemantics {}
    }
    Box(Modifier.fillMaxWidth().height(hitHeight), contentAlignment = Alignment.TopCenter) {
        Box(input.size(hitWidth, hitHeight), contentAlignment = Alignment.TopCenter) {
            Box(
                Modifier
                    .padding(top = tokens.handleMarginBlock)
                    .tanreiGroupOpacity(overflow = tanreiDecorationOverflow(system, NoShadow)) { opacity.value }
                    // BSH-14: keyboard focus only, never animated.
                    .tanreiFocusRing(source, cornerRadius = tokens.handleContainerShape)
                    .tanreiContainer(boxShape, containerColor = { boxColor.value }, outlineColor = Color.Transparent, outlineWidth = Dp.Hairline, ripple = ripple)
                    .size(tokens.handleContainerWidth, tokens.handleContainerHeight),
                contentAlignment = Alignment.Center,
            ) {
                // BSH-12 / BSH-22: the grip, decorative.
                Box(
                    Modifier
                        .size(tokens.handleGripWidth, tokens.handleGripHeight)
                        .drawBehind {
                            val grip = gripColor.value
                            if (grip.isDrawn) {
                                val outline = gripShape.createOutline(size, layoutDirection, this)
                                drawOutline(outline, grip)
                            }
                        },
                )
            }
        }
    }
}

/** A handle that is not a control draws its resting tokens. */
private val AtRest = TanreiDrawnStates(TanreiInteractionState.Enabled, TanreiInteractionState.Enabled)

/** The handle draws no shadow. */
private val NoShadow: List<TanreiShadowLayer> = emptyList()

/**
 * The sheet in place — its scrim (modal) and itself where they are composed, without the window, fully shown: what the
 * baselines draw for a fixture (as `TanreiDialogContent` is for the dialog). Test and gallery harnesses only.
 */
@Composable
internal fun TanreiBottomSheetContent(
    variant: TanreiBottomSheetVariant = TanreiBottomSheetVariant.Modal,
    detent: TanreiBottomSheetDetent = TanreiBottomSheetDetent.Partial,
    handle: Boolean = true,
    handleLabel: String = "",
    inset: Boolean = true,
    contentDescription: String = "",
    dismissible: Boolean = true,
    onClose: (TanreiSheetCloseReason) -> Unit = {},
    onDetentChange: (TanreiBottomSheetDetent) -> Unit = {},
    areaInsets: WindowInsets = WindowInsets(0, 0, 0, 0),
    sheetInsets: WindowInsets = WindowInsets(0, 0, 0, 0),
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val tokens = TanreiTheme.tokens.bottomSheet
    val state = remember { TanreiBottomSheetState(detent) }
    state.bind(true, dismissible, onClose, onDetentChange, tanreiTween(tokens.motionEnterDuration, tokens.motionEnterEasing), LocalContext.current)
    val seenDetent = remember { Seen(detent) }
    LaunchedEffect(detent) {
        if (seenDetent.value == detent) return@LaunchedEffect
        seenDetent.value = detent
        state.moveTo(detent, emit = false)
    }
    val focus = remember { TanreiSheetFocus(null, FocusRequester()) }
    TanreiBottomSheetLayer(
        state = state,
        modal = variant == TanreiBottomSheetVariant.Modal,
        handle = handle,
        handleLabel = handleLabel,
        inset = inset,
        contentDescription = contentDescription,
        shown = { 1f },
        focus = focus,
        areaInsets = areaInsets,
        sheetInsets = sheetInsets,
        modifier = modifier,
        content = content,
    )
}
