package io.github.chnotchy.tanrei.components

import android.view.ViewConfiguration
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.AnimationVector1D
import androidx.compose.animation.core.animate
import androidx.compose.foundation.focusable
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.displayCutout
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.union
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.Measured
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.isTraversalGroup
import androidx.compose.ui.semantics.paneTitle
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.coerceAtMost
import io.github.chnotchy.tanrei.primitives.TanreiDrawnGlyph
import io.github.chnotchy.tanrei.primitives.TanreiDrawnGlyphKind
import io.github.chnotchy.tanrei.primitives.TanreiModalSheetWindow
import io.github.chnotchy.tanrei.primitives.TanreiReportMissingName
import io.github.chnotchy.tanrei.primitives.TanreiReportUnknownValue
import io.github.chnotchy.tanrei.primitives.isDrawn
import io.github.chnotchy.tanrei.primitives.rememberTanreiFocusReturn
import io.github.chnotchy.tanrei.primitives.tanreiContainer
import io.github.chnotchy.tanrei.primitives.tanreiElevation
import io.github.chnotchy.tanrei.primitives.tanreiSideCornerShape
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph
import io.github.chnotchy.tanrei.theme.LocalTanreiTextStyle
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.tanreiTween
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiSideSheetTokens
import io.github.chnotchy.tanrei.tokens.TanreiSideSheetVariant
import io.github.chnotchy.tanrei.tokens.TanreiSideSheetVariantTokens
import kotlin.math.roundToInt
import kotlinx.coroutines.launch

/*
 * `specs/side-sheet.spec.json` (SSH-1…15) on Compose, as `platforms.compose` maps it: `TanreiSideSheet(visible, onClose,
 * headline, variant, closable, closeLabel, initialFocus, actions, content)`. `standard` is a layout region the
 * product places at the end of a `Row`: it takes its width while open, and its width animates as it slides. `modal` is a
 * modal overlay presented, as the dialog, the modal drawer and the modal bottom sheet are, in a `Dialog`
 * window of its own with Tanrei's scrim. Every value comes from `TanreiTheme.tokens.sideSheet`; the close button is
 * `TanreiIconButton` (standard, medium), placed and not restyled (SSH-5), and the actions are the product's Buttons,
 * laid out and not restyled (SSH-11). The sheet asks to close (`onClose` with a reason); the product sets `visible` to
 * false (SSH-6).
 */

/** What [TanreiSideSheet] takes when a product says nothing else. */
internal object TanreiSideSheetDefaults {
    /** SSH-8: the system bars and the display cutout at the sheet's end, top and bottom. */
    val windowInsets: WindowInsets
        @Composable
        get() = WindowInsets.systemBars.union(WindowInsets.displayCutout).only(WindowInsetsSides.End + WindowInsetsSides.Vertical)
}

/**
 * Shows supplementary content or a secondary task in a panel at the end edge, beside the content (standard) or over
 * it (modal), with a headline, an optional close button and optional actions. Implements `specs/side-sheet.spec.json`.
 *
 * @param visible the spec's `open`. The product opens it, and closes it in answer to [onClose]; the sheet never closes
 *   itself (SSH-6). A parameter, so that the motion runs before the sheet goes.
 * @param onClose the spec's `close`, with the reason: the close button ([TanreiSheetCloseReason.Close], either variant)
 *   or, on a modal sheet, a press on the scrim, Escape, the platform's back or a drag toward the end edge.
 * @param headline what the sheet is about ("Filters"), drawn in its header: its accessible name and a heading. Required:
 *   an empty one still renders, and a debuggable app reports it (SSH-12).
 * @param modifier applied to the sheet's panel.
 * @param variant a key of `tokens.sideSheet.variants`: standard (default) or modal. Open: a design system may add values,
 *   which behave as standard; a value it does not have draws with standard's tokens, and a debuggable app reports it
 *   (SSH-13).
 * @param closable draws the close button at the end of the header (SSH-5).
 * @param closeLabel the close button's accessible name ("Close filters"). Required while [closable].
 * @param initialFocus the element focus moves to when it opens (SSH-3): attach it with `Modifier.focusRequester`. Null:
 *   the panel, so the headline is read first.
 * @param actions the product's Tanrei Buttons, main action first: a row from the start edge under a divider, stacked in
 *   a column when they do not fit (SSH-11). The scope is a row's for the call site's sake; `weight` and `align` do not
 *   apply to it.
 * @param content the sheet's content, handed `contentColor` and `sys.typescale.body`, scrolled between the header and
 *   the actions (SSH-10).
 */
@Composable
public fun TanreiSideSheet(
    visible: Boolean,
    onClose: (TanreiSheetCloseReason) -> Unit,
    headline: String,
    modifier: Modifier = Modifier,
    variant: TanreiSideSheetVariant = TanreiSideSheetVariant.Standard,
    closable: Boolean = false,
    closeLabel: String = "",
    initialFocus: FocusRequester? = null,
    actions: (@Composable RowScope.() -> Unit)? = null,
    content: @Composable () -> Unit,
) {
    val system = TanreiTheme.tokens
    val tokens = system.sideSheet
    // SSH-13: the lookup is total — a value this design system does not have reads the default value's tokens.
    if (variant !in tokens.variants) TanreiReportUnknownValue(system.id, "TanreiSideSheet", "variant", variant.key)
    val modal = variant == TanreiSideSheetVariant.Modal
    // SSH-12: still renders; reported in debuggable apps.
    if (headline.isBlank()) TanreiReportMissingName("TanreiSideSheet", "headline", what = "a side sheet without a headline")

    // SSH-1 / SSH-2: how far the sheet is shown, 0 to 1, over the enter or exit motion; a sheet mounted open is in place
    // at once. Where motion is reduced (Android's setting removes every animation) it appears and goes at once.
    val shown = remember { Animatable(if (visible) 1f else 0f) }
    val enter = tanreiTween<Float>(tokens.motionEnterDuration, tokens.motionEnterEasing)
    val exit = tanreiTween<Float>(tokens.motionExitDuration, tokens.motionExitEasing)
    LaunchedEffect(visible) { shown.animateTo(if (visible) 1f else 0f, if (visible) enter else exit) }
    val open by rememberUpdatedState(visible)
    val present by remember { derivedStateOf { open || shown.value > 0f } }
    val request = rememberUpdatedState<(TanreiSheetCloseReason) -> Unit> { reason -> if (open) onClose(reason) }

    // SSH-3: a standard sheet mounted open does not move focus; every later opening does. A modal one always does.
    val seenOpen = remember { SeenValue(visible) }
    val panelFocus = remember { FocusRequester() }
    val focus = remember(initialFocus) { TanreiSheetFocus(initialFocus, panelFocus) }
    val look = tokens.variants[variant]

    val panel: @Composable (Modifier, Dp, WindowInsets) -> Unit = { panelModifier, width, insets ->
        TanreiSideSheetPanel(
            tokens = tokens,
            look = look,
            modal = modal,
            headline = headline,
            closable = closable,
            closeLabel = closeLabel,
            onCloseButton = { request.value(TanreiSheetCloseReason.Close) },
            focus = focus,
            width = width,
            windowInsets = insets,
            actions = actions,
            modifier = panelModifier.then(modifier),
            content = content,
        )
    }

    if (!modal) {
        // SSH-3: opening moves focus in; closing while it is inside hands it back to the element that had
        // it, or clears it where that element is gone — when the sheet opens or closes, not when it has moved.
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
        val insets = TanreiSideSheetDefaults.windowInsets
        TanreiStandardSideSheetLayout(shown = { shown.value }) { panel(Modifier, tokens.containerWidth, insets) }
        return
    }

    if (!present) return
    // SSH-2 / SSH-4: the window traps focus, hides the window under it and hears back.
    TanreiModalSheetWindow(onBack = { request.value(TanreiSheetCloseReason.Back) }, backEnabled = true) {
        // SSH-3: every presentation moves focus in, that of a sheet mounted open too — the window makes everything behind
        // it unfocusable, so focus must be somewhere it can reach.
        DisposableEffect(Unit) { onDispose { seenOpen.value = false } }
        LaunchedEffect(Unit) {
            withFrameNanos { }
            focus.moveIn()
        }
        val insets = TanreiSideSheetDefaults.windowInsets
        TanreiModalSideSheetLayer(
            tokens = tokens,
            shown = shown,
            isOpen = { open },
            onClose = { request.value(it) },
        ) { panelModifier, width -> panel(panelModifier, width, insets) }
    }
}

/** Not a snapshot state on purpose: the value an effect saw last. */
private class SeenValue<T>(var value: T)

/**
 * SSH-1: a standard sheet in the product's row — as wide as it is [shown] of its panel, the panel laid out at its full
 * width from the start of that space, so that it slides in and out at the end edge while the content beside it resizes.
 * What lies past the end is clipped.
 */
@Composable
private fun TanreiStandardSideSheetLayout(shown: () -> Float, panel: @Composable () -> Unit) {
    Layout(content = panel, modifier = Modifier.fillMaxHeight().clipToBounds()) { measurables, constraints ->
        val placeable = measurables.firstOrNull()?.measure(constraints.copy(minWidth = 0, maxWidth = Constraints.Infinity))
        val full = placeable?.width ?: 0
        val width = (full * shown().coerceIn(0f, 1f)).roundToInt().coerceIn(constraints.minWidth, if (constraints.hasBoundedWidth) constraints.maxWidth else Int.MAX_VALUE)
        val height = placeable?.height ?: 0
        layout(width, height) { placeable?.placeRelative(0, 0) }
    }
}

/**
 * SSH-2, SSH-4, SSH-6, SSH-7: the modal sheet's layer — the scrim over the whole of it and the panel at its end edge,
 * slid in by how far it is [shown] (null: fully), never wider than the layer less a touch target. A press on the scrim,
 * Escape, and a drag toward the end edge past half the panel or a fling that way ask to close ([onClose]); a released drag
 * that asked to close holds for a frame, then slides out from there if the product closed the sheet ([isOpen] false), or
 * slides back.
 */
@Composable
internal fun TanreiModalSideSheetLayer(
    tokens: TanreiSideSheetTokens,
    shown: Animatable<Float, AnimationVector1D>?,
    isOpen: () -> Boolean,
    onClose: (TanreiSheetCloseReason) -> Unit,
    panel: @Composable (Modifier, Dp) -> Unit,
) {
    val system = TanreiTheme.tokens
    val scrim = tokens.scrimColor.color
    val rtl = LocalLayoutDirection.current == LayoutDirection.Rtl
    val direction = if (rtl) -1f else 1f
    val scope = rememberCoroutineScope()
    var width by remember { mutableFloatStateOf(0f) }
    var drag by remember { mutableFloatStateOf(0f) }
    val fling = ViewConfiguration.get(LocalContext.current).scaledMinimumFlingVelocity.toFloat()
    val close by rememberUpdatedState(onClose)
    val shownNow: () -> Float = { shown?.value ?: 1f }
    val dragState = rememberDraggableState { delta -> drag = (drag + delta * direction).coerceIn(0f, width) }
    val settle = tanreiTween<Float>(tokens.motionEnterDuration, tokens.motionEnterEasing)
    val window = LocalView.current.rootView
    var escapeDown by remember { mutableStateOf(false) }
    BoxWithConstraints(
        Modifier
            .fillMaxSize()
            // SSH-4: Escape asks to close — after a tooltip open in this window has had it — and goes no further.
            .onPreviewKeyEvent { event ->
                if (event.key != Key.Escape) return@onPreviewKeyEvent false
                if (event.type == KeyEventType.KeyDown) {
                    escapeDown = true
                    if (!TanreiTooltipWindows.dismissOnEscape(window)) close(TanreiSheetCloseReason.Escape)
                    return@onPreviewKeyEvent true
                }
                val consumed = escapeDown
                escapeDown = false
                consumed
            },
    ) {
        // SSH-7: a strip of scrim a touch target wide stays.
        val panelWidth = tokens.containerWidth.coerceAtMost(maxWidth - system.measure.targetTouch)
        // SSH-2: the scrim over the rest of the window, fading with the sheet; SSH-4: a press on it asks to close.
        Box(
            Modifier
                .fillMaxSize()
                .drawBehind { if (scrim.isDrawn) drawRect(scrim, alpha = shownNow().coerceIn(0f, 1f)) }
                .pointerInput(Unit) { detectTapGestures { close(TanreiSheetCloseReason.Scrim) } }
                .clearAndSetSemantics {},
        )
        panel(
            Modifier
                .align(Alignment.CenterEnd)
                .onSizeChanged { width = it.width.toFloat() }
                .graphicsLayer { translationX = ((1f - shownNow()) * width + drag) * direction }
                // A press on the panel is the panel's: it never reaches the scrim.
                .pointerInput(Unit) { awaitPointerEventScope { while (true) awaitPointerEvent() } }
                // SSH-4 / SSH-6: a drag toward the end edge follows the finger past the touch slop; past half the panel,
                // or flung that way, it asks to close and holds for a frame; anything else slides back.
                .draggable(
                    state = dragState,
                    orientation = Orientation.Horizontal,
                    onDragStopped = stopped@{ velocity ->
                        val towardEnd = velocity * direction > fling
                        val far = drag > width / 2f
                        if (towardEnd || far) {
                            close(TanreiSheetCloseReason.Drag)
                            withFrameNanos { }
                            if (!isOpen()) {
                                // Leaving from where the drag left it: the exit motion runs from there.
                                shown?.snapTo((1f - drag / width.coerceAtLeast(1f)).coerceIn(0f, 1f))
                                drag = 0f
                                return@stopped
                            }
                        }
                        scope.launch { animate(drag, 0f, animationSpec = settle) { value, _ -> drag = value } }
                    },
                ),
            panelWidth,
        )
    }
}

/**
 * The panel (SSH-5, SSH-7 – SSH-12, SSH-14): [width] wide beside the end inset, the full height, its variant's
 * `containerColor` at `containerElevation`, its start corners `containerShape` eased by corner smoothing and its end
 * corners square, edged at its start by `outlineWidth` of `outlineColor`; the header (headline and close button), the
 * content scrolled between the header and the actions, and the divider and actions at the bottom. Its color reaches
 * under [windowInsets]; what it holds stays inside them. Right-to-left mirrors it.
 */
@Composable
private fun TanreiSideSheetPanel(
    tokens: TanreiSideSheetTokens,
    look: TanreiSideSheetVariantTokens,
    modal: Boolean,
    headline: String,
    closable: Boolean,
    closeLabel: String,
    onCloseButton: () -> Unit,
    focus: TanreiSheetFocus,
    width: Dp,
    windowInsets: WindowInsets,
    actions: (@Composable RowScope.() -> Unit)?,
    modifier: Modifier,
    content: @Composable () -> Unit,
) {
    val system = TanreiTheme.tokens
    val smoothing = system.shape.cornerSmoothing
    val shape = remember(look.containerShape, smoothing) { tanreiSideCornerShape(look.containerShape, Dp.Hairline, smoothing) }
    val color = look.containerColor.color
    val edge = look.outlineColor.color
    val edgeWidth = tokens.outlineWidth
    val label = headline.takeUnless { it.isBlank() }
    Column(
        modifier
            .fillMaxHeight()
            // SSH-12: a modal dialog (the window) named by its pane title, or a region named by the headline.
            .semantics {
                isTraversalGroup = true
                if (label != null) {
                    if (modal) paneTitle = label
                    contentDescription = label
                }
            }
            // SSH-3: focus moves to the panel when there is no initial focus; it is a stop only until then.
            .focusRequester(focus.container)
            .focusProperties { canFocus = focus.containerFocusable }
            .onFocusChanged {
                focus.inside = it.hasFocus
                if (it.hasFocus && !it.isFocused) focus.containerFocusable = false
            }
            .focusable()
            .tanreiElevation(look.containerElevation, shape)
            .tanreiContainer(shape, containerColor = { color }, outlineColor = Color.Transparent, outlineWidth = Dp.Hairline)
            // SSH-7: the edge at its start, toward the content.
            .drawWithContent {
                drawContent()
                val thickness = edgeWidth.toPx()
                if (edge.isDrawn && thickness > 0f) {
                    val x = if (layoutDirection == LayoutDirection.Rtl) size.width - thickness else 0f
                    drawRect(edge, topLeft = Offset(x, 0f), size = Size(thickness, size.height))
                }
            }
            .windowInsetsPadding(windowInsets)
            .width(width),
    ) {
        val hasHeader = headline.isNotEmpty() || closable
        if (hasHeader) {
            TanreiSideSheetHeader(tokens, headline, closable, closeLabel, onCloseButton)
        } else {
            Spacer(Modifier.height(tokens.containerPaddingBlock))
        }
        // SSH-10: the content, inset, handed the content color and the body style, scrolled between header and actions.
        Box(
            Modifier
                .weight(1f)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = tokens.containerPaddingInline),
        ) {
            CompositionLocalProvider(
                LocalTanreiContentColor provides tokens.contentColor.color,
                LocalTanreiTextStyle provides system.typescale.body.toTextStyle(),
                content = content,
            )
        }
        if (actions != null) {
            TanreiSideSheetFooter(tokens, actions)
        } else {
            Spacer(Modifier.height(tokens.containerPaddingBlock))
        }
    }
}

/**
 * SSH-5, SSH-8, SSH-9: the header — a row at least `headerHeight` high: the headline from `containerPaddingInline`
 * after the start edge (`headlineTypescale`, `headlineColor`, wrapping and growing the row, a heading) and, while
 * [closable], a standard medium [TanreiIconButton] with the close glyph, `headerGap` after it and ending
 * `headerPaddingInlineEnd` before the end edge, both centred in the row.
 */
@Composable
private fun ColumnScope.TanreiSideSheetHeader(tokens: TanreiSideSheetTokens, headline: String, closable: Boolean, closeLabel: String, onClose: () -> Unit) {
    // SSH-5: a close button without a name still works; reported in debuggable apps.
    if (closable && closeLabel.isBlank()) TanreiReportMissingName("TanreiSideSheet", "closeLabel", what = "a close button without a label")
    val headlineColor = tokens.headlineColor.color
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = tokens.headerHeight)
            .padding(start = tokens.containerPaddingInline, end = if (closable) tokens.headerPaddingInlineEnd else tokens.containerPaddingInline),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(tokens.headerGap),
    ) {
        BasicText(
            headline,
            modifier = Modifier.weight(1f).semantics { heading() },
            style = tokens.headlineTypescale.toTextStyle().merge(TextStyle(color = headlineColor)),
        )
        if (closable) {
            TanreiIconButton(onClick = onClose, contentDescription = closeLabel, variant = TanreiIconButtonVariant.Standard, size = TanreiIconButtonSize.Medium) {
                TanreiSideSheetCloseGlyph()
            }
        }
    }
}

/** The close glyph, drawn in the icon button's icon slot from what it provides (the font's glyph when installed). */
@Composable
private fun TanreiSideSheetCloseGlyph() {
    val system = TanreiTheme.tokens
    val box = system.iconButton.sizes[TanreiIconButtonSize.Medium].iconSize
    Box(Modifier.size(box)) {
        TanreiDrawnGlyph(TanreiDrawnGlyphKind.Close, glyph = LocalTanreiIconGlyph.current, box = box, color = LocalTanreiContentColor.current, stroke = system.measure.borderThick, progress = { 1f })
    }
}

/**
 * SSH-11: a `dividerWidth` line of `dividerColor` across the whole sheet, hidden from assistive technology, then the
 * actions `containerPaddingInline` from each side and `actionsPaddingBlock` above and below: one row from the start,
 * `actionsGap` apart, in the order given, or — when they do not fit — a column aligned to the start in the same order.
 * The buttons are drawn as they are.
 */
@Composable
private fun TanreiSideSheetFooter(tokens: TanreiSideSheetTokens, actions: @Composable RowScope.() -> Unit) {
    val divider = tokens.dividerColor.color
    val dividerWidth = tokens.dividerWidth
    Box(
        Modifier
            .fillMaxWidth()
            .height(dividerWidth)
            .drawBehind { if (divider.isDrawn) drawRect(divider) }
            .clearAndSetSemantics {},
    )
    val gap = tokens.actionsGap
    Layout(
        content = { TanreiSideSheetActionsScope.actions() },
        modifier = Modifier.fillMaxWidth().padding(horizontal = tokens.containerPaddingInline, vertical = tokens.actionsPaddingBlock),
    ) { measurables, constraints ->
        val spacing = gap.roundToPx()
        val placeables = measurables.map { it.measure(Constraints(maxWidth = constraints.maxWidth)) }
        val gaps = spacing * (placeables.size - 1).coerceAtLeast(0)
        val rowWidth = placeables.sumOf { it.width } + gaps
        val row = !constraints.hasBoundedWidth || rowWidth <= constraints.maxWidth
        val height = if (row) placeables.maxOfOrNull { it.height } ?: 0 else placeables.sumOf { it.height } + gaps
        val width = if (constraints.hasBoundedWidth) constraints.maxWidth else rowWidth
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
                    placeable.placeRelative(0, y)
                    y += placeable.height + spacing
                }
            }
        }
    }
}

/**
 * The scope the actions are called in: a row's, as `platforms.compose` names it, for the call site's sake. The sheet
 * lays the actions out itself (a row, or a column when they do not fit), so `weight` and the alignments do nothing.
 */
private object TanreiSideSheetActionsScope : RowScope {
    override fun Modifier.weight(weight: Float, fill: Boolean): Modifier = this

    override fun Modifier.align(alignment: Alignment.Vertical): Modifier = this

    override fun Modifier.alignBy(alignmentLine: androidx.compose.ui.layout.HorizontalAlignmentLine): Modifier = this

    override fun Modifier.alignByBaseline(): Modifier = this

    override fun Modifier.alignBy(alignmentLineBlock: (Measured) -> Int): Modifier = this
}

/**
 * The sheet in place — for a standard sheet, at the end of a row whose other child fills the rest; for a modal sheet,
 * its scrim and its panel, fully shown, without the window: what the baselines draw for a fixture (as
 * `TanreiDialogContent` is for the dialog). Test and gallery harnesses only.
 */
@Composable
internal fun TanreiSideSheetContent(
    headline: String,
    variant: TanreiSideSheetVariant = TanreiSideSheetVariant.Standard,
    closable: Boolean = false,
    closeLabel: String = "",
    onClose: (TanreiSheetCloseReason) -> Unit = {},
    windowInsets: WindowInsets = WindowInsets(0, 0, 0, 0),
    actions: (@Composable RowScope.() -> Unit)? = null,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val tokens = TanreiTheme.tokens.sideSheet
    val modal = variant == TanreiSideSheetVariant.Modal
    val focus = remember { TanreiSheetFocus(null, FocusRequester()) }
    val look = tokens.variants[variant]
    val panel: @Composable (Modifier, Dp) -> Unit = { panelModifier, width ->
        TanreiSideSheetPanel(tokens, look, modal, headline, closable, closeLabel, { onClose(TanreiSheetCloseReason.Close) }, focus, width, windowInsets, actions, panelModifier.then(modifier), content)
    }
    if (modal) {
        TanreiModalSideSheetLayer(tokens, shown = null, isOpen = { true }, onClose = onClose, panel = panel)
    } else {
        Row(Modifier.fillMaxSize()) {
            Box(Modifier.weight(1f).fillMaxHeight())
            TanreiStandardSideSheetLayout(shown = { 1f }) { panel(Modifier, tokens.containerWidth) }
        }
    }
}
