package io.github.chnotchy.tanrei.components

import android.view.View
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.rememberTransition
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.onPlaced
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.layout.positionInParent
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.paneTitle
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.window.DialogWindowProvider
import io.github.chnotchy.tanrei.primitives.TanreiModalDialogs
import io.github.chnotchy.tanrei.primitives.TanreiReportMissingName
import io.github.chnotchy.tanrei.primitives.isDrawn
import io.github.chnotchy.tanrei.primitives.tanreiContainer
import io.github.chnotchy.tanrei.primitives.tanreiContainerShape
import io.github.chnotchy.tanrei.primitives.tanreiElevation
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph
import io.github.chnotchy.tanrei.theme.LocalTanreiTextStyle
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.glyph
import io.github.chnotchy.tanrei.theme.tanreiTween
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiDialogTokens

/*
 * `specs/dialog.spec.json` (DLG-1…16) on Compose, as `platforms.compose` maps it: `TanreiDialog(visible,
 * onDismissRequest, headline, supportingText, alert, dismissible, initialFocus, icon, actions, content)`, presented in a
 * `Dialog` window of its own — a modal overlay: everything behind it is inert, focus moves in,
 * stays in and goes back. The window's own dim and animation are off; the scrim (`comp.dialog.scrim.color`, one role as
 * drawn) and the motion come from [TanreiDialogTokens] (`TanreiTheme.tokens.dialog`). The actions are the product's
 * Tanrei Buttons, which the dialog lays out and never restyles.
 */

/**
 * Asks for a decision, or tells something that must be acknowledged, in a modal surface over the whole window.
 * Implements `specs/dialog.spec.json`.
 *
 * @param visible the spec's `open`. The product opens it and closes it — from an action's handler or in answer to
 *   [onDismissRequest]; the dialog never closes itself (DLG-6). Kept a parameter (rather than calling the dialog only
 *   while open) so that its exit motion can run before its window goes.
 * @param onDismissRequest the spec's `dismiss`: the person asked to close it without an action — Escape, the platform's
 *   back, or a press on the scrim. Called once per request, only while [dismissible] is true (DLG-5).
 * @param headline the question or statement ("Discard draft?"): the dialog's accessible name (its pane title).
 *   Required: an empty one still opens, and a debuggable app reports it (DLG-14).
 * @param modifier applied to the dialog's surface.
 * @param supportingText what will happen, or what the person needs to know: read after the headline.
 * @param alert an urgent interruption: assistive technology reads the headline and the supporting text as soon as it
 *   opens (DLG-14).
 * @param dismissible whether Escape, back and the scrim ask to close it (default true). False only when the person must
 *   choose one of the actions.
 * @param initialFocus the element focus moves to when it opens (DLG-2) — the least destructive action of a destructive
 *   confirmation, the first field of a form: attach it with `Modifier.focusRequester`. Null (default): the surface itself,
 *   so the headline is read first and the next Tab reaches the first focusable element.
 * @param icon a glyph above the headline, drawn at `iconSize` in `iconColor` with the glyph of an unselected icon; the
 *   icon and the headline are then centred (DLG-9).
 * @param actions the product's Tanrei Buttons, confirming action last (usually the text variant): laid out in one row
 *   at the end, or stacked in a column at the end when they do not fit (DLG-10).
 * @param content whatever else the decision needs (a list, a field), below the supporting text, handed
 *   `contentColor` as its content color.
 */
@Composable
public fun TanreiDialog(
    visible: Boolean,
    onDismissRequest: () -> Unit,
    headline: String,
    modifier: Modifier = Modifier,
    supportingText: String = "",
    alert: Boolean = false,
    dismissible: Boolean = true,
    initialFocus: FocusRequester? = null,
    icon: (@Composable () -> Unit)? = null,
    actions: (@Composable () -> Unit)? = null,
    content: (@Composable () -> Unit)? = null,
) {
    val tokens = TanreiTheme.tokens.dialog
    // DLG-14: still opens; reported in debuggable apps.
    if (headline.isBlank()) TanreiReportMissingName("TanreiDialog", "headline", what = "a dialog without a headline")
    val transition = remember { MutableTransitionState(false) }
    transition.targetState = visible
    // DLG-13: the window stays while the exit motion runs.
    if (!transition.currentState && !transition.targetState) return
    val shown = rememberTanreiDialogShown(transition, tokens)
    val dismiss by rememberUpdatedState(onDismissRequest)
    val open by rememberUpdatedState(visible)
    val canDismiss by rememberUpdatedState(dismissible)
    val request = { if (open && canDismiss) dismiss() }

    // DLG-1 / DLG-15: everything behind is hidden from assistive technology while it is open — the window under it (the
    // app's, or a dialog's under a stacked one); a snackbar host counts it (SNK-9, SNK-12).
    val behind = LocalView.current
    DisposableEffect(behind) {
        val before = behind.importantForAccessibility
        behind.importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
        TanreiModalDialogs.opened()
        onDispose {
            behind.importantForAccessibility = before
            TanreiModalDialogs.closed()
        }
    }

    Dialog(
        // DLG-5: the platform's back.
        onDismissRequest = request,
        properties = DialogProperties(dismissOnBackPress = dismissible, dismissOnClickOutside = false, usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
    ) {
        // The window's own dim and animation are off: the scrim and the motion are Tanrei's.
        val window = (LocalView.current.parent as? DialogWindowProvider)?.window
        SideEffect {
            window?.setDimAmount(0f)
            window?.setWindowAnimations(0)
        }
        // DLG-14: an alert is read at once.
        val view = LocalView.current
        if (alert) {
            LaunchedEffect(Unit) {
                TanreiDialogAnnouncer.announce(view, listOf(headline, supportingText).filter { it.isNotBlank() }.joinToString(". "))
            }
        }
        TanreiDialogContent(
            headline = headline,
            supportingText = supportingText,
            icon = icon,
            actions = actions,
            content = content,
            modifier = modifier,
            shown = { shown.value },
            entering = transition.targetState,
            onDismissRequest = request,
            dismissible = dismissible,
            initialFocus = initialFocus,
            moveFocusIn = true,
        )
    }
}

/**
 * How a dialog that is an alert has assistive technology read it at once (DLG-14): the view's announcement. Tests
 * replace it to hear what was announced.
 */
internal object TanreiDialogAnnouncer {
    @Suppress("DEPRECATION")
    var announce: (View, String) -> Unit = { view, text -> view.announceForAccessibility(text) }
}

/**
 * DLG-13's timing: how far the dialog is shown, 0 to 1 — rising over `motionEnterDuration` with `motionEnterEasing`,
 * falling over `motionExitDuration` with `motionExitEasing`; at once where motion is reduced (Android's setting removes
 * every animation, and the animator duration scale reaches the transition).
 */
@Composable
internal fun rememberTanreiDialogShown(state: MutableTransitionState<Boolean>, tokens: TanreiDialogTokens): State<Float> {
    val transition = rememberTransition(state, label = "dialog")
    return transition.animateFloat(
        transitionSpec = {
            if (targetState) tanreiTween(tokens.motionEnterDuration, tokens.motionEnterEasing) else tanreiTween(tokens.motionExitDuration, tokens.motionExitEasing)
        },
        label = "shown",
    ) { open -> if (open) 1f else 0f }
}

/**
 * The scrim and the surface, filling what they are given (the dialog's window; the baselines' 480 × 640 stage): the
 * test-only in-place form draws exactly this, with [shown] at 1 and nothing moving focus.
 *
 * The scrim — `scrimColor` over everything, fading with [shown] — hears a press and asks to close while [dismissible]
 * (DLG-5). The surface is centred in the safe area, `containerMargin` from every edge and from the keyboard (DLG-7); it
 * fades with [shown] and, while [entering], grows about its centre from `motionEnterScale` (DLG-13). Escape asks to
 * close while [dismissible] — after an open tooltip of the window has had it (TIP-4) — and goes no further (DLG-5,
 * DLG-15). [moveFocusIn]: focus moves to [initialFocus] or to the surface on the first frame (DLG-2).
 */
@Composable
internal fun TanreiDialogContent(
    headline: String,
    supportingText: String,
    icon: (@Composable () -> Unit)?,
    actions: (@Composable () -> Unit)?,
    content: (@Composable () -> Unit)?,
    modifier: Modifier = Modifier,
    shown: () -> Float = { 1f },
    entering: Boolean = true,
    onDismissRequest: () -> Unit = {},
    dismissible: Boolean = true,
    initialFocus: FocusRequester? = null,
    moveFocusIn: Boolean = false,
) {
    val system = TanreiTheme.tokens
    val tokens = system.dialog
    val scrim = tokens.scrimColor.color
    val window = LocalView.current.rootView
    val request by rememberUpdatedState(onDismissRequest)
    val mayDismiss by rememberUpdatedState(dismissible)
    val surfaceFocus = remember { FocusRequester() }
    // DLG-2: the surface takes focus only until something inside it has had focus: it is not a stop of the Tab cycle.
    var surfaceFocusable by remember { mutableStateOf(initialFocus == null) }
    if (moveFocusIn) {
        LaunchedEffect(Unit) {
            withFrameNanos { }
            (initialFocus ?: surfaceFocus).requestFocus()
        }
    }
    var escapeDown by remember { mutableStateOf(false) }
    Box(
        Modifier
            .fillMaxSize()
            .onPreviewKeyEvent { event ->
                if (event.key != Key.Escape) return@onPreviewKeyEvent false
                if (event.type == KeyEventType.KeyDown) {
                    escapeDown = true
                    // TIP-4: a tooltip open in this window closes first, and the dialog stays.
                    if (!TanreiTooltipWindows.dismissOnEscape(window) && mayDismiss) request()
                    return@onPreviewKeyEvent true
                }
                // Its key up too: the platform's own dialog would hear it as back.
                val consumed = escapeDown
                escapeDown = false
                consumed
            },
    ) {
        // DLG-1: the scrim over everything behind; DLG-5: a press on it asks to close.
        Box(
            Modifier
                .fillMaxSize()
                .graphicsLayer { alpha = shown().coerceIn(0f, 1f) }
                .drawBehind { if (scrim.isDrawn) drawRect(scrim) }
                .pointerInput(Unit) { detectTapGestures { if (mayDismiss) request() } }
                .clearAndSetSemantics {},
        )
        BoxWithConstraints(
            Modifier
                .fillMaxSize()
                .windowInsetsPadding(WindowInsets.safeDrawing)
                .padding(tokens.containerMargin),
            contentAlignment = Alignment.Center,
        ) {
            val room = constraints.maxHeight
            TanreiDialogSurface(
                headline = headline,
                supportingText = supportingText,
                icon = icon,
                actions = actions,
                content = content,
                tokens = tokens,
                room = room,
                modifier = modifier
                    .graphicsLayer {
                        val value = shown().coerceIn(0f, 1f)
                        alpha = value
                        // Grows about its centre while it enters; it only fades as it leaves.
                        val scale = if (entering) tokens.motionEnterScale + (1f - tokens.motionEnterScale) * shown() else 1f
                        scaleX = scale
                        scaleY = scale
                    }
                    .focusRequester(surfaceFocus)
                    .focusProperties { canFocus = surfaceFocusable }
                    .onFocusChanged { if (!it.isFocused && it.hasFocus) surfaceFocusable = false }
                    .focusable(),
                smoothing = system.shape.cornerSmoothing,
            )
        }
    }
}

/**
 * The surface (DLG-7 – DLG-12, DLG-14, DLG-16): `containerColor` at `containerElevation`, `containerShape` corners eased
 * by corner smoothing, as wide as its content between `containerMinWidth` and `containerMaxWidth` (and never wider than
 * it is given), inset by `containerPadding`; the icon, the headline, the supporting text and the content `containerGap`
 * apart — empty parts left out —, and the actions `actionsMarginBlockStart` below them. When it is taller than [room]
 * (pixels), the supporting text and the content scroll between the fixed headline and actions, with a divider under the
 * headline while they are not at their top and above the actions while more lies below; when the headline and the
 * actions alone leave no room, everything scrolls together. Its pane title is the headline.
 */
@Composable
private fun TanreiDialogSurface(
    headline: String,
    supportingText: String,
    icon: (@Composable () -> Unit)?,
    actions: (@Composable () -> Unit)?,
    content: (@Composable () -> Unit)?,
    tokens: TanreiDialogTokens,
    room: Int,
    smoothing: Float,
    modifier: Modifier,
) {
    val shape = remember(tokens.containerShape, smoothing) { tanreiContainerShape(tokens.containerShape, smoothing) }
    val containerColor = tokens.containerColor.color
    val hasBody = supportingText.isNotEmpty() || content != null
    // DLG-12: everything scrolls together once the fixed parts leave the scrolled part no room — decided per height.
    var scrollAll by remember(room) { mutableStateOf(false) }
    val scroll = rememberScrollState()
    val divider = tokens.dividerColor.color
    val dividerWidth = tokens.dividerWidth
    val padding = tokens.containerPadding
    // DLG-12: the scrolled part needs room for at least a line of its text.
    val minimumBody = with(androidx.compose.ui.platform.LocalDensity.current) { tokens.supportingTextTypescale.toTextStyle().lineHeight.let { if (it.isSp) it.toPx().toInt() else 0 } }
    // DLG-11: where the scrolled part is, in the surface's pixels, for the dividers drawn across the whole surface.
    var bodyTop by remember { mutableStateOf(0f) }
    var bodyBottom by remember { mutableStateOf(0f) }
    Column(
        modifier
            // As wide as its content (no part fills the width) between the two widths.
            .widthIn(min = tokens.containerMinWidth, max = tokens.containerMaxWidth)
            // DLG-14: the dialog's name.
            .semantics { paneTitle = headline }
            // A press on the surface is the surface's: it never reaches the scrim.
            .pointerInput(Unit) { awaitPointerEventScope { while (true) awaitPointerEvent() } }
            // DLG-11: the dividers, across the whole surface, only while something is scrolled out of view.
            .drawWithContent {
                drawContent()
                val width = dividerWidth.toPx()
                if (scrollAll || !hasBody || !divider.isDrawn || width <= 0f) return@drawWithContent
                if (scroll.value > 0) drawLine(divider, Offset(0f, bodyTop + width / 2), Offset(size.width, bodyTop + width / 2), width)
                if (actions != null && scroll.value < scroll.maxValue) drawLine(divider, Offset(0f, bodyBottom - width / 2), Offset(size.width, bodyBottom - width / 2), width)
            }
            .tanreiElevation(tokens.containerElevation, shape)
            .tanreiContainer(shape, containerColor = { containerColor }, outlineColor = Color.Transparent, outlineWidth = NoWidth)
            .then(if (scrollAll) Modifier.verticalScroll(scroll) else Modifier)
            .padding(padding),
    ) {
        TanreiDialogHeader(headline, icon, tokens)
        if (hasBody) {
            Spacer(Modifier.height(tokens.containerGap))
            val inset = with(androidx.compose.ui.platform.LocalDensity.current) { padding.toPx() }
            val body = if (scrollAll) {
                Modifier
            } else {
                Modifier
                    .weight(1f, fill = false)
                    // DLG-12: no room for even a line of the scrolled part.
                    .onSizeChanged { size -> if (size.height < minimumBody && scroll.maxValue > 0) scrollAll = true }
                    .onPlaced { coordinates ->
                        bodyTop = coordinates.positionInParent().y + inset
                        bodyBottom = bodyTop + coordinates.size.height
                    }
                    .verticalScroll(scroll)
            }
            Column(body, verticalArrangement = Arrangement.spacedBy(tokens.containerGap)) {
                if (supportingText.isNotEmpty()) {
                    BasicText(supportingText, style = tokens.supportingTextTypescale.toTextStyle().merge(TextStyle(color = tokens.supportingTextColor.color, textAlign = TextAlign.Start)))
                }
                if (content != null) {
                    // DLG-8: the content's color is handed down, not laid out; plain text given as content takes
                    // `sys.typescale.body`, as a card's content does (CRD-13), whatever style encloses the dialog.
                    CompositionLocalProvider(
                        LocalTanreiContentColor provides tokens.contentColor.color,
                        LocalTanreiTextStyle provides TanreiTheme.tokens.typescale.body.toTextStyle(),
                        content = content,
                    )
                }
            }
        }
        if (actions != null) {
            Spacer(Modifier.height(tokens.actionsMarginBlockStart))
            TanreiDialogActions(tokens.actionsGap, Modifier.align(Alignment.End), actions)
        }
    }
}

/** DLG-8 / DLG-9: the icon above the headline, both centred while there is an icon; else the headline at the start. */
@Composable
private fun ColumnScope.TanreiDialogHeader(headline: String, icon: (@Composable () -> Unit)?, tokens: TanreiDialogTokens) {
    val centred = icon != null
    Column(
        Modifier.align(if (centred) Alignment.CenterHorizontally else Alignment.Start),
        horizontalAlignment = if (centred) Alignment.CenterHorizontally else Alignment.Start,
        verticalArrangement = Arrangement.spacedBy(tokens.containerGap),
    ) {
        if (icon != null) {
            val glyph = TanreiTheme.tokens.icon.glyph(tokens.iconSize, selected = false)
            Box(Modifier.size(tokens.iconSize).clearAndSetSemantics {}, contentAlignment = Alignment.Center) {
                CompositionLocalProvider(
                    LocalTanreiContentColor provides tokens.iconColor.color,
                    LocalTanreiIconGlyph provides glyph,
                    LocalTanreiTextStyle provides glyph.toTextStyle(tokens.iconSize),
                    content = icon,
                )
            }
        }
        if (headline.isNotEmpty()) {
            BasicText(
                headline,
                modifier = Modifier.semantics { heading() },
                style = tokens.headlineTypescale.toTextStyle().merge(TextStyle(color = tokens.headlineColor.color, textAlign = if (centred) TextAlign.Center else TextAlign.Start)),
            )
        }
    }
}

/**
 * DLG-10: the actions in one row at the end, [gap] apart, in the order given; when they do not fit, a column of them at
 * the end, [gap] apart, in the same order. The buttons are drawn as they are. Right-to-left puts the row at the left.
 */
@Composable
private fun TanreiDialogActions(gap: Dp, modifier: Modifier, actions: @Composable () -> Unit) {
    Layout(content = actions, modifier = modifier) { measurables, constraints ->
        val spacing = gap.roundToPx()
        val placeables = measurables.map { it.measure(Constraints(maxWidth = constraints.maxWidth)) }
        val gaps = spacing * (placeables.size - 1).coerceAtLeast(0)
        val rowWidth = placeables.sumOf { it.width } + gaps
        val row = !constraints.hasBoundedWidth || rowWidth <= constraints.maxWidth
        val width = if (row) rowWidth else placeables.maxOfOrNull { it.width } ?: 0
        val height = if (row) placeables.maxOfOrNull { it.height } ?: 0 else placeables.sumOf { it.height } + gaps
        layout(width, height) {
            if (row) {
                var x = 0
                for (placeable in placeables) {
                    placeable.placeRelative(x, (height - placeable.height) / 2)
                    x += placeable.width + spacing
                }
            } else {
                var y = 0
                for (placeable in placeables) {
                    placeable.placeRelative(width - placeable.width, y)
                    y += placeable.height + spacing
                }
            }
        }
    }
}

/** No outline: the surface's edge is its elevation ring. */
private val NoWidth = Dp.Hairline
