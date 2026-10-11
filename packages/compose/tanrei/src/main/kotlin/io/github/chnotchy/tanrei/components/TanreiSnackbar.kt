package io.github.chnotchy.tanrei.components

import android.view.accessibility.AccessibilityManager
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.rememberTransition
import androidx.compose.foundation.clickable
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.foundation.focusGroup
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.Placeable
import androidx.compose.ui.layout.layout
import androidx.compose.ui.layout.layoutId
import androidx.compose.ui.platform.LocalAccessibilityManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalWindowInfo
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.IntSize
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.primitives.TanreiDrawnGlyph
import io.github.chnotchy.tanrei.primitives.TanreiDrawnGlyphKind
import io.github.chnotchy.tanrei.primitives.TanreiModalDialogs
import io.github.chnotchy.tanrei.primitives.TanreiReportMissingName
import io.github.chnotchy.tanrei.primitives.TanreiStateMotion
import io.github.chnotchy.tanrei.primitives.animateTanreiColorAsState
import io.github.chnotchy.tanrei.primitives.collectTanreiInteraction
import io.github.chnotchy.tanrei.primitives.drawnStates
import io.github.chnotchy.tanrei.primitives.isTanreiDebuggable
import io.github.chnotchy.tanrei.primitives.rememberTanreiRipple
import io.github.chnotchy.tanrei.primitives.tanreiContainer
import io.github.chnotchy.tanrei.primitives.tanreiContainerShape
import io.github.chnotchy.tanrei.primitives.tanreiDecorationOverflow
import io.github.chnotchy.tanrei.primitives.tanreiElevation
import io.github.chnotchy.tanrei.primitives.tanreiFocusRing
import io.github.chnotchy.tanrei.primitives.tanreiGroupOpacity
import io.github.chnotchy.tanrei.primitives.tanreiMinimumTouchTarget
import io.github.chnotchy.tanrei.primitives.tanreiPressInput
import io.github.chnotchy.tanrei.primitives.tanreiRippleInput
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.glyph
import io.github.chnotchy.tanrei.theme.tanreiTween
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiShadowLayer
import io.github.chnotchy.tanrei.tokens.TanreiSnackbarControl
import io.github.chnotchy.tanrei.tokens.TanreiSnackbarTokens
import kotlin.math.roundToInt
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext

/*
 * `specs/snackbar.spec.json` (SNK-1…20) on Compose, as `platforms.compose` maps it — Material's snackbar API:
 * `TanreiSnackbarHost(hostState)` is placed in the layout, and `hostState.showSnackbar(message, actionLabel,
 * withDismissAction, closeLabel, duration)` suspends until that snackbar has closed and returns how
 * (`TanreiSnackbarResult.ActionPerformed` or `TanreiSnackbarResult.Dismissed(reason)`). The snackbar is a READ overlay:
 * announced politely, never taking focus. Drawn outside a host — `TanreiSnackbar(message, …)` — it sits
 * in place (SNK-19). Every design value comes from the current design system's [TanreiSnackbarTokens]
 * (`TanreiTheme.tokens.snackbar`); the action and the close button are [TanreiButton]'s chain with the snackbar's own
 * `controls` tokens.
 */

/**
 * The spec's `duration`: how long a snackbar stays by itself. [Auto] (default) is [Short] without an action and
 * [Indefinite] with one (WCAG 2.2.1); [Short] and [Long] close after `timeoutShort` / `timeoutLong`; [Indefinite] stays
 * until it is closed.
 */
public enum class TanreiSnackbarDuration { Auto, Short, Long, Indefinite }

/**
 * Why a snackbar closed without its action (the spec's `dismiss` reasons `close`, `escape`, `timeout`, `host`): the close
 * button, Escape while focus was inside it, its timeout, or the product ([TanreiSnackbarHostState.dismissCurrent],
 * [TanreiSnackbarHostState.clear], a cancelled `showSnackbar`).
 */
public enum class TanreiSnackbarDismissReason { Close, Escape, Timeout, Host }

/** How a snackbar closed: the spec's `action` and `dismiss` events. */
public sealed interface TanreiSnackbarResult {
    /** The action was activated (the spec's `action`). */
    public data object ActionPerformed : TanreiSnackbarResult

    /** It closed without its action (the spec's `dismiss`), for [reason]. */
    public data class Dismissed(public val reason: TanreiSnackbarDismissReason) : TanreiSnackbarResult
}

/** One requested snackbar, from `showSnackbar` until it has closed. */
@Stable
internal class TanreiSnackbarRequest(
    val message: String,
    val actionLabel: String,
    val withDismissAction: Boolean,
    val closeLabel: String,
    val duration: TanreiSnackbarDuration,
) {
    private val result = CompletableDeferred<TanreiSnackbarResult>()
    private val gone = CompletableDeferred<Unit>()

    /** Decided: it closes now (its exit may still be running). */
    var done: Boolean by mutableStateOf(false)
        private set

    /** A host draws it; then it is gone only once its exit has run. */
    var displayed: Boolean = false

    /** Closes it with [how], once; a later call changes nothing. */
    fun finish(how: TanreiSnackbarResult) {
        if (done) return
        done = true
        result.complete(how)
        if (!displayed) gone.complete(Unit)
    }

    /** The host's exit has run. */
    fun exited() {
        gone.complete(Unit)
    }

    suspend fun awaitResult(): TanreiSnackbarResult = result.await()

    suspend fun awaitGone() = gone.await()
}

/**
 * The queue of one [TanreiSnackbarHost] (SNK-12): one snackbar at a time, in the order requested. Hoist one per host,
 * as Material's `SnackbarHostState`.
 */
@Stable
public class TanreiSnackbarHostState {
    private val queue = mutableStateListOf<TanreiSnackbarRequest>()

    /** The snackbar being shown (or closing), else null. */
    internal var current: TanreiSnackbarRequest? by mutableStateOf(null)
        private set

    /** The message of the snackbar being shown, else null. */
    public val currentMessage: String? get() = current?.takeUnless { it.done }?.message

    /**
     * Shows a snackbar once every one requested before it has closed, and while no Tanrei modal dialog covers the host;
     * suspends until it has closed (its exit included) and returns how (SNK-12). Cancelling the caller closes it with
     * [TanreiSnackbarDismissReason.Host].
     *
     * @param message the spec's `message`: what happened. Required; announced whole, politely, when it is shown.
     * @param actionLabel the spec's `action`: the label of the one action ("Undo"); empty draws none.
     * @param withDismissAction the spec's `closable`: draws a close button.
     * @param closeLabel the close button's accessible name, in the product's language ("Close"); required while
     *   [withDismissAction] is true.
     * @param duration the spec's `duration` ([TanreiSnackbarDuration.Auto] by default).
     */
    public suspend fun showSnackbar(
        message: String,
        actionLabel: String = "",
        withDismissAction: Boolean = false,
        closeLabel: String = "",
        duration: TanreiSnackbarDuration = TanreiSnackbarDuration.Auto,
    ): TanreiSnackbarResult {
        val request = TanreiSnackbarRequest(message, actionLabel, withDismissAction, closeLabel, duration)
        queue += request
        try {
            // Its turn: first in line with no Tanrei modal dialog open — unless it was dropped first.
            snapshotFlow { request.done || (queue.firstOrNull() === request && TanreiModalDialogs.open == 0) }.first { it }
            if (!request.done) current = request
            return request.awaitResult()
        } catch (cancelled: CancellationException) {
            request.finish(TanreiSnackbarResult.Dismissed(TanreiSnackbarDismissReason.Host))
            throw cancelled
        } finally {
            // SNK-17: the next one only after this one has faded out.
            withContext(NonCancellable) { request.awaitGone() }
            queue.remove(request)
            if (current === request) current = null
        }
    }

    /** Closes the snackbar being shown, with [TanreiSnackbarDismissReason.Host]; the next in line follows it. */
    public fun dismissCurrent() {
        current?.finish(TanreiSnackbarResult.Dismissed(TanreiSnackbarDismissReason.Host))
    }

    /** Closes the snackbar being shown and drops every one waiting, each with [TanreiSnackbarDismissReason.Host] (SNK-12). */
    public fun clear() {
        queue.toList().forEach { it.finish(TanreiSnackbarResult.Dismissed(TanreiSnackbarDismissReason.Host)) }
    }
}

/**
 * Shows the snackbars of [hostState], one at a time, at the bottom of its area: centred, `containerMargin` above the
 * bottom edge and from the sides, inside the safe area and above the on-screen keyboard (SNK-13). Place it over the
 * content it reports on — last in a `Box` with that content, given the area's size — so that it is drawn above the
 * content; a Tanrei modal dialog, a window of its own, is above it.
 *
 * @param hostState the queue: `showSnackbar` it from a coroutine.
 * @param modifier applied to the host's area.
 */
@Composable
public fun TanreiSnackbarHost(hostState: TanreiSnackbarHostState, modifier: Modifier = Modifier) {
    val tokens = TanreiTheme.tokens.snackbar
    val request = hostState.current
    Box(
        modifier
            .windowInsetsPadding(WindowInsets.safeDrawing)
            .padding(tokens.containerMargin),
        contentAlignment = Alignment.BottomCenter,
    ) {
        if (request != null) {
            androidx.compose.runtime.key(request) { TanreiSnackbarShown(request, tokens) }
        }
    }
}

/** One snackbar of a host: its entrance and exit, its timeout and its pauses, its announcement. */
@Composable
private fun TanreiSnackbarShown(request: TanreiSnackbarRequest, tokens: TanreiSnackbarTokens) {
    request.displayed = true
    val transition = remember { MutableTransitionState(false) }
    transition.targetState = !request.done
    // SNK-17: the host shows the next one only after this one has faded out.
    if (request.done && transition.isIdle && !transition.currentState) {
        LaunchedEffect(request) { request.exited() }
    }
    val shown = rememberTanreiSnackbarShown(transition, tokens)
    var height by remember { mutableStateOf(0) }
    val margin = with(androidx.compose.ui.platform.LocalDensity.current) { tokens.containerMargin.toPx() }

    // SNK-9: paused while hovered, while focus is inside, while the window is hidden, in the background or covered (it
    // loses its focus), and while a Tanrei modal dialog is open; restarted from its whole length afterwards.
    val hover = remember { MutableInteractionSource() }
    val hovered by hover.collectIsHoveredAsState()
    var focusInside by remember { mutableStateOf(false) }
    val windowFocused = LocalWindowInfo.current.isWindowFocused
    val dialogs = TanreiModalDialogs.open
    val paused = hovered || focusInside || !windowFocused || dialogs > 0
    val timeout = tanreiSnackbarTimeout(request, tokens)
    LaunchedEffect(request, paused, timeout) {
        if (paused || timeout == null || request.done) return@LaunchedEffect
        delay(timeout)
        request.finish(TanreiSnackbarResult.Dismissed(TanreiSnackbarDismissReason.Timeout))
    }

    TanreiSnackbarBar(
        message = request.message,
        actionLabel = request.actionLabel,
        closable = request.withDismissAction,
        closeLabel = request.closeLabel,
        duration = request.duration,
        onResult = { request.finish(it) },
        focusInsideChanged = { focusInside = it },
        modifier = Modifier
            // SNK-10: a polite live region — its message, then its action's label, read once when it appears; focus stays.
            .semantics { liveRegion = LiveRegionMode.Polite }
            .hoverable(hover)
            .layout { measurable, constraints ->
                val placeable = measurable.measure(constraints)
                height = placeable.height
                layout(placeable.width, placeable.height) { placeable.place(0, 0) }
            }
            .graphicsLayer {
                val value = shown.value.coerceIn(0f, 1f)
                alpha = value
                // Rises from below the bottom edge by its height and its margin while it enters; fades in place as it leaves.
                translationY = if (transition.targetState) (1f - shown.value) * (height + margin) else 0f
            },
    )
}

/**
 * SNK-17's timing: how far the snackbar is shown, 0 to 1 — rising over `motionEnterDuration` with `motionEnterEasing`,
 * falling over `motionExitDuration` with `motionExitEasing`; at once where motion is reduced (Android's setting removes
 * every animation).
 */
@Composable
internal fun rememberTanreiSnackbarShown(state: MutableTransitionState<Boolean>, tokens: TanreiSnackbarTokens): androidx.compose.runtime.State<Float> {
    val transition = rememberTransition(state, label = "snackbar")
    return transition.animateFloat(
        transitionSpec = {
            if (targetState) tanreiTween(tokens.motionEnterDuration, tokens.motionEnterEasing) else tanreiTween(tokens.motionExitDuration, tokens.motionExitEasing)
        },
        label = "shown",
    ) { open -> if (open) 1f else 0f }
}

/**
 * SNK-8: how long [request] stays by itself, in milliseconds, or null for never. Auto is short without an action and
 * never with one; Android's accessibility timeout lengthens it; a snackbar with an action never closes by itself while
 * a screen reader (touch exploration) runs.
 */
@Composable
private fun tanreiSnackbarTimeout(request: TanreiSnackbarRequest, tokens: TanreiSnackbarTokens): Long? {
    val hasAction = request.actionLabel.isNotEmpty()
    val base = when (request.duration) {
        TanreiSnackbarDuration.Auto -> if (hasAction) null else tokens.timeoutShort
        TanreiSnackbarDuration.Short -> tokens.timeoutShort
        TanreiSnackbarDuration.Long -> tokens.timeoutLong
        TanreiSnackbarDuration.Indefinite -> null
    } ?: return null
    val context = LocalContext.current
    val screenReader = remember(context) { context.getSystemService(AccessibilityManager::class.java)?.let { it.isEnabled && it.isTouchExplorationEnabled } ?: false }
    if (hasAction && screenReader) return null
    val recommended = LocalAccessibilityManager.current?.calculateRecommendedTimeoutMillis(
        originalTimeoutMillis = base.toLong(),
        containsIcons = request.withDismissAction,
        containsText = true,
        containsControls = hasAction || request.withDismissAction,
    ) ?: base.toLong()
    return maxOf(recommended, base.toLong())
}

/**
 * A snackbar drawn outside a host (SNK-19): in place at its resting position, with no timeout, queue, entrance or
 * announcement — for a documentation page, a preview, or a product that places its own. It still reports its action and
 * close (and Escape while focus is inside it) through [onResult]; what happens then is the caller's.
 *
 * @param message the spec's `message`. Required: an empty one still renders, and a debuggable app reports it.
 * @param modifier applied to the bar.
 * @param actionLabel the spec's `action`: the one action's label; empty draws none.
 * @param withDismissAction the spec's `closable`: draws a close button.
 * @param closeLabel the close button's accessible name; required while [withDismissAction] is true (reported when empty).
 * @param duration the spec's `duration`; in place it only decides the debug reminder that a timed action must also be
 *   offered elsewhere (SNK-20).
 * @param onResult the spec's `action` ([TanreiSnackbarResult.ActionPerformed]) and `dismiss`
 *   ([TanreiSnackbarResult.Dismissed] with `Close` or `Escape`).
 */
@Composable
public fun TanreiSnackbar(
    message: String,
    modifier: Modifier = Modifier,
    actionLabel: String = "",
    withDismissAction: Boolean = false,
    closeLabel: String = "",
    duration: TanreiSnackbarDuration = TanreiSnackbarDuration.Auto,
    onResult: (TanreiSnackbarResult) -> Unit = {},
) {
    TanreiSnackbarBar(message, actionLabel, withDismissAction, closeLabel, duration, onResult, focusInsideChanged = {}, modifier = modifier)
}

private enum class SnackbarSlot { Message, Action, Close }

/** The visual size of a control whose layout box is its (larger) touch target, measured inside the reservation. */
private class SnackbarVisual {
    var size: IntSize = IntSize.Zero
}

/**
 * The bar itself (SNK-14 – SNK-16, SNK-18): the message, then — `containerGap` later — the action and the close button,
 * `controlsGap` apart and centred on the message's first line; the action on its own row below when the message would
 * need more than two lines beside the controls or the action would not fit beside it. As wide as its content between
 * `containerMinWidth` and `containerMaxWidth` (and never wider than it is given), at least `containerMinHeight` tall;
 * `containerColor` at `containerElevation`, `containerShape` corners eased by corner smoothing. Right-to-left mirrors
 * it. Escape while focus is inside reports [TanreiSnackbarDismissReason.Escape] (SNK-11); an activated control moves
 * focus back out of the bar first, to where it came from.
 */
@Composable
private fun TanreiSnackbarBar(
    message: String,
    actionLabel: String,
    closable: Boolean,
    closeLabel: String,
    duration: TanreiSnackbarDuration,
    onResult: (TanreiSnackbarResult) -> Unit,
    focusInsideChanged: (Boolean) -> Unit,
    modifier: Modifier,
) {
    val system = TanreiTheme.tokens
    val tokens = system.snackbar
    val hasAction = actionLabel.isNotEmpty()
    // SNK-20: still rendered; reported in debug builds.
    if (message.isBlank()) TanreiReportMissingName("TanreiSnackbar", "message", what = "a snackbar without a message")
    if (closable && closeLabel.isBlank()) TanreiReportMissingName("TanreiSnackbar", "closeLabel", what = "a close button without a name")
    if (hasAction && (duration == TanreiSnackbarDuration.Short || duration == TanreiSnackbarDuration.Long)) {
        TanreiReportSnackbarProblem("TanreiSnackbar \"$message\": its action \"$actionLabel\" times out ($duration); offer it elsewhere too (WCAG 2.2.1).")
    }
    val result by rememberUpdatedState(onResult)
    val report by rememberUpdatedState(focusInsideChanged)
    val focusManager = LocalFocusManager.current
    // SNK-11: where focus came from, so that it can go back when the bar closes around it.
    val entry = remember { SnackbarFocus() }
    fun close(how: TanreiSnackbarResult) {
        if (entry.inside) {
            val back = if (entry.from == FocusDirection.Previous) FocusDirection.Next else FocusDirection.Previous
            var steps = 0
            while (entry.inside && steps++ < MaxFocusSteps && focusManager.moveFocus(back)) Unit
        }
        result(how)
    }

    val smoothing = system.shape.cornerSmoothing
    val shape = remember(tokens.containerShape, smoothing) { tanreiContainerShape(tokens.containerShape, smoothing) }
    val containerColor = tokens.containerColor.color
    val messageStyle = tokens.supportingTextTypescale.toTextStyle().merge(TextStyle(color = tokens.supportingTextColor.color))
    val action = remember { SnackbarVisual() }
    val closeVisual = remember { SnackbarVisual() }
    val lineHeight = tokens.supportingTextTypescale.toTextStyle().lineHeight

    Layout(
        modifier = modifier
            .focusProperties { onEnter = { entry.from = requestedFocusDirection } }
            .focusGroup()
            .onFocusChanged {
                entry.inside = it.hasFocus
                report(it.hasFocus)
            }
            .onPreviewKeyEvent { event ->
                if (event.key != Key.Escape) return@onPreviewKeyEvent false
                if (event.type == KeyEventType.KeyDown) close(TanreiSnackbarResult.Dismissed(TanreiSnackbarDismissReason.Escape))
                true
            }
            .tanreiElevation(tokens.containerElevation, shape)
            .tanreiContainer(shape, containerColor = { containerColor }, outlineColor = Color.Transparent, outlineWidth = NoLength),
        content = {
            BasicText(message, Modifier.layoutId(SnackbarSlot.Message), style = messageStyle)
            if (hasAction) {
                SnackbarControl(TanreiSnackbarControl.Action, onClick = { close(TanreiSnackbarResult.ActionPerformed) }, visual = action, slot = SnackbarSlot.Action, name = null) { color ->
                    // SNK-16: the action's label never wraps.
                    BasicText(actionLabel, style = tokens.controlsLabelTypescale.toTextStyle().merge(TextStyle(color = color)), softWrap = false, maxLines = 1)
                }
            }
            if (closable) {
                SnackbarControl(TanreiSnackbarControl.Close, onClick = { close(TanreiSnackbarResult.Dismissed(TanreiSnackbarDismissReason.Close)) }, visual = closeVisual, slot = SnackbarSlot.Close, name = closeLabel) { color ->
                    // SNK-15: the close glyph of an unselected icon at the controls' icon size.
                    Box(Modifier.size(tokens.controlsIconSize).clearAndSetSemantics {}) {
                        TanreiDrawnGlyph(TanreiDrawnGlyphKind.Close, glyph = system.icon.glyph(tokens.controlsIconSize, selected = false), box = tokens.controlsIconSize, color = color, stroke = system.measure.borderThick, progress = { 1f })
                    }
                }
            }
        },
    ) { measurables, constraints ->
        fun slot(id: SnackbarSlot) = measurables.firstOrNull { it.layoutId == id }
        val start = tokens.containerPaddingInlineStart.roundToPx()
        val block = tokens.containerPaddingBlock.roundToPx()
        val gap = tokens.containerGap.roundToPx()
        val controlsGap = tokens.controlsGap.roundToPx()
        val maxWidth = minOf(tokens.containerMaxWidth.roundToPx(), constraints.maxWidth)
        val minWidth = minOf(tokens.containerMinWidth.roundToPx(), maxWidth)
        val line = if (lineHeight.isSp) lineHeight.toPx().roundToInt() else 0
        val actionPlaceable = slot(SnackbarSlot.Action)?.measure(Constraints())
        val closePlaceable = slot(SnackbarSlot.Close)?.measure(Constraints())
        val actionSize = if (actionPlaceable != null) action.size else IntSize.Zero
        val closeSize = if (closePlaceable != null) closeVisual.size else IntSize.Zero
        val hasControls = actionPlaceable != null || closePlaceable != null
        val end = (if (hasControls) tokens.containerPaddingInlineEndWithControls else tokens.containerPaddingInlineEnd).roundToPx()
        val controlsWidth = actionSize.width + closeSize.width + (if (actionPlaceable != null && closePlaceable != null) controlsGap else 0)
        val beside = maxWidth - start - end - (if (hasControls) gap + controlsWidth else 0)
        val messageMeasurable = slot(SnackbarSlot.Message)!!
        // SNK-16: the action goes below when the message would need more than two lines beside it, or it does not fit.
        val besideHeight = if (beside > 0) messageMeasurable.minIntrinsicHeight(beside) else Int.MAX_VALUE
        val ownRow = actionPlaceable != null && (beside <= 0 || (line > 0 && besideHeight > 2 * line))
        val firstRowControls = if (ownRow) closeSize.width else controlsWidth
        val room = if (ownRow) maxWidth - start - end - (if (closePlaceable != null) gap + closeSize.width else 0) else beside
        val messagePlaceable = messageMeasurable.measure(Constraints(maxWidth = room.coerceAtLeast(0)))
        val firstRow = start + messagePlaceable.width + (if (firstRowControls > 0) gap + firstRowControls else 0) + end
        val secondRow = if (ownRow) start + actionSize.width + end else 0
        val width = maxOf(firstRow, secondRow).coerceIn(minWidth, maxOf(minWidth, maxWidth))
        val textTop0 = block
        val oneRowHeight = maxOf(tokens.containerMinHeight.roundToPx(), messagePlaceable.height + 2 * block)
        val textTop = if (ownRow) textTop0 else maxOf(block, (oneRowHeight - messagePlaceable.height) / 2)
        val lineCenter = textTop + minOf(if (line > 0) line else messagePlaceable.height, messagePlaceable.height) / 2
        val actionRowTop = textTop + messagePlaceable.height + gap
        val height = if (ownRow) maxOf(oneRowHeight, actionRowTop + actionSize.height + end) else oneRowHeight
        layout(width, height) {
            messagePlaceable.placeRelative(start, textTop)
            // A control's layout box is its touch target: place it so that its VISUAL box is where the row wants it.
            fun Placeable.placeVisual(visual: IntSize, x: Int, y: Int) = placeRelative(x - (this.width - visual.width) / 2, y - (this.height - visual.height) / 2)
            // Placed in reading order — the action, then the close button —, which is also the order Tab visits them.
            val closeX = width - end - closeSize.width
            val actionX = if (ownRow) width - end - actionSize.width else closeX - (if (closePlaceable != null) controlsGap else 0) - actionSize.width + (if (closePlaceable == null) closeSize.width else 0)
            if (actionPlaceable != null) {
                if (ownRow) actionPlaceable.placeVisual(actionSize, actionX, actionRowTop) else actionPlaceable.placeVisual(actionSize, actionX, lineCenter - actionSize.height / 2)
            }
            closePlaceable?.placeVisual(closeSize, closeX, lineCenter - closeSize.height / 2)
        }
    }
}

/** Where focus entered the bar from, and whether it is inside it now. */
private class SnackbarFocus {
    var from: FocusDirection? = null
    var inside = false
}

/** How far focus may be moved to leave the bar: it holds two controls. */
private const val MaxFocusSteps = 3

/**
 * The action or the close button (SNK-1 – SNK-7): [TanreiButton]'s chain with the snackbar's `controls[control]` tokens —
 * press and press-hold, pressed feedback and ripple, keyboard focus ring, the touch target on both axes without changing
 * its visual size (recorded in [visual] for the row), container, corner smoothing.
 */
@Composable
private fun SnackbarControl(control: TanreiSnackbarControl, onClick: () -> Unit, visual: SnackbarVisual, slot: SnackbarSlot, name: String?, content: @Composable (Color) -> Unit) {
    val source = remember { MutableInteractionSource() }
    val system = TanreiTheme.tokens
    val tokens = system.snackbar
    // SNK-2: one state wins; SNK-5: a press counts from the first frame and for at least press-hold.
    val interaction = source.collectTanreiInteraction(enabled = true)
    // SNK-6: the pressed tokens say WHAT a press looks like; `pressed-feedback` says how it arrives.
    val feedback = system.behavior.pressedFeedback
    val drawnStates = interaction.drawnStates(feedback)
    val palette = tokens.controls[control]
    val drawn = palette[drawnStates.content]
    val motion = TanreiStateMotion(interaction.state, tokens.motionStateDuration, tokens.motionStateEasing)
    val containerColor = animateTanreiColorAsState(palette[drawnStates.container].containerColor.color, motion, label = "container")
    val contentColor by animateTanreiColorAsState(drawn.contentColor.color, motion, label = "content")
    val opacity = animateFloatAsState(tokens.opacity(drawnStates.content), motion.spec(), label = "opacity")
    // SNK-7: the corners, eased by corner smoothing.
    val smoothing = system.shape.cornerSmoothing
    val shape = remember(tokens.controlsShape, smoothing) { tanreiContainerShape(tokens.controlsShape, smoothing) }
    val ripple = rememberTanreiRipple(
        feedback = feedback,
        interaction = interaction,
        color = palette.pressed.containerColor.color,
        feedbackDurationMillis = tokens.motionFeedbackDuration,
        stateDurationMillis = tokens.motionStateDuration,
        stateEasing = tokens.motionStateEasing,
    )
    val named = name?.takeUnless { it.isBlank() }
    val size = if (control == TanreiSnackbarControl.Close) Modifier.size(tokens.controlsHeight) else Modifier.heightIn(min = tokens.controlsHeight).padding(horizontal = tokens.controlsPaddingInline)
    Box(
        Modifier
            .layoutId(slot)
            .then(if (named != null) Modifier.semantics { contentDescription = named } else Modifier)
            // SNK-1: once per activation — pointer, touch, Enter, Space.
            .clickable(interactionSource = source, indication = null, role = Role.Button, onClick = onClick)
            .tanreiPressInput(interaction.press)
            .tanreiRippleInput(ripple)
            // SNK-4: the touch target on both axes; the row places the visual box, so the target overlaps the padding.
            .tanreiMinimumTouchTarget()
            .layout { measurable, constraints ->
                val placeable = measurable.measure(constraints)
                visual.size = IntSize(placeable.width, placeable.height)
                layout(placeable.width, placeable.height) { placeable.place(0, 0) }
            }
            .tanreiGroupOpacity(overflow = tanreiDecorationOverflow(system, NoShadow)) { opacity.value }
            // SNK-3: keyboard focus only, never animated.
            .tanreiFocusRing(source, cornerRadius = tokens.controlsShape)
            .tanreiContainer(shape, containerColor = { containerColor.value }, outlineColor = Color.Transparent, outlineWidth = NoLength, ripple = ripple)
            .then(size),
        contentAlignment = Alignment.Center,
    ) {
        content(contentColor)
    }
}

/** No length: the bar and its controls have no outline. */
private val NoLength = androidx.compose.ui.unit.Dp.Hairline

/** The controls draw no shadow. */
private val NoShadow: List<TanreiShadowLayer> = emptyList()

/** Debuggable apps only (SNK-20): one report per message and composition site. */
@Composable
private fun TanreiReportSnackbarProblem(message: String) {
    if (!isTanreiDebuggable()) return
    remember(message) { TanreiDiagnostics.reporter(message) }
}
