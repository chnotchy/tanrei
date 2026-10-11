package io.github.chnotchy.tanrei.components

import android.view.View
import android.view.ViewConfiguration
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.AnimationVector1D
import androidx.compose.animation.core.animate
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.focusGroup
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.displayCutout
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.union
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.focusRestorer
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.CollectionInfo
import androidx.compose.ui.semantics.CollectionItemInfo
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.collectionInfo
import androidx.compose.ui.semantics.collectionItemInfo
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.isTraversalGroup
import androidx.compose.ui.semantics.paneTitle
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.window.DialogWindowProvider
import io.github.chnotchy.tanrei.R
import io.github.chnotchy.tanrei.primitives.TanreiDestinations
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.primitives.TanreiModalDialogs
import io.github.chnotchy.tanrei.primitives.TanreiNamedGlyph
import io.github.chnotchy.tanrei.primitives.TanreiReportDestinations
import io.github.chnotchy.tanrei.primitives.TanreiReportMissingName
import io.github.chnotchy.tanrei.primitives.TanreiReportUnknownValue
import io.github.chnotchy.tanrei.primitives.TanreiStateMotion
import io.github.chnotchy.tanrei.primitives.animateTanreiColorAsState
import io.github.chnotchy.tanrei.primitives.collectTanreiInteraction
import io.github.chnotchy.tanrei.primitives.drawnStates
import io.github.chnotchy.tanrei.primitives.isDrawn
import io.github.chnotchy.tanrei.primitives.isTanreiDebuggable
import io.github.chnotchy.tanrei.primitives.rememberTanreiDestinations
import io.github.chnotchy.tanrei.primitives.rememberTanreiRipple
import io.github.chnotchy.tanrei.primitives.rememberTanreiRovingEntry
import io.github.chnotchy.tanrei.primitives.rememberTanreiSelectionMotion
import io.github.chnotchy.tanrei.primitives.tanreiContainer
import io.github.chnotchy.tanrei.primitives.tanreiContainerShape
import io.github.chnotchy.tanrei.primitives.tanreiDecorationOverflow
import io.github.chnotchy.tanrei.primitives.tanreiElevation
import io.github.chnotchy.tanrei.primitives.tanreiEndCornerShape
import io.github.chnotchy.tanrei.primitives.tanreiFocusRing
import io.github.chnotchy.tanrei.primitives.tanreiGroupOpacity
import io.github.chnotchy.tanrei.primitives.tanreiPressInput
import io.github.chnotchy.tanrei.primitives.tanreiRippleInput
import io.github.chnotchy.tanrei.primitives.tanreiRovingItem
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.glyph
import io.github.chnotchy.tanrei.theme.tanreiTween
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiNavigationDrawerCondition
import io.github.chnotchy.tanrei.tokens.TanreiNavigationDrawerTokens
import io.github.chnotchy.tanrei.tokens.TanreiNavigationDrawerVariant
import io.github.chnotchy.tanrei.tokens.TanreiNavigationDrawerVariantTokens
import kotlin.math.roundToInt
import kotlinx.coroutines.launch

/*
 * `specs/navigation-drawer.spec.json` (NVD-1…29) on Compose, as `platforms.compose` maps it — Material's
 * `DismissibleNavigationDrawer` and `ModalNavigationDrawer` in one: `TanreiNavigationDrawer(variant, drawerState,
 * drawerContent = { TanreiNavigationDrawerItem(…); TanreiNavigationDrawerSection(…) { … } }, content = { … })`, wrapping
 * the screen it navigates. `standard` is a layout region beside the content: it takes its width while open,
 * slides in and out while the content resizes, moves focus in when opened and back when closed, and never keeps it.
 * `modal` is an operated overlay: it is presented, as the dialog is, in a `Dialog` window over
 * the whole window, with Tanrei's scrim — the window traps focus and hands it back when it closes, back and Escape ask
 * to close it, and the window under it is hidden from assistive technology. The drawer closes a modal drawer itself
 * (scrim, back, Escape, a drag toward its edge, after a destination was chosen) through the state's
 * `confirmValueChange`, which is the spec's `close`. As for the bar, the caller marks the selected destination.
 */

/** Whether a [TanreiDrawerState]'s drawer is shown. */
public enum class TanreiDrawerValue {
    /** Not shown: a standard drawer takes no width, a modal one is not presented. */
    Closed,

    /** Shown. */
    Open,
}

/**
 * The spec's `open` and `close`: whether a [TanreiNavigationDrawer] is shown. The product opens it ([open], from a menu
 * button) and may close it ([close]); a modal drawer also closes itself — on the scrim, back, Escape, a drag toward its
 * start edge, and after a destination was activated (NVD-20, NVD-21) — and [confirmValueChange] hears each of those
 * closes first (the spec's `close` event), and may refuse it by answering false.
 */
@Stable
public class TanreiDrawerState(
    initialValue: TanreiDrawerValue = TanreiDrawerValue.Closed,
    internal val confirmValueChange: (TanreiDrawerValue) -> Boolean = { true },
) {
    /** Whether the drawer is shown or asked to be (its motion follows). */
    public var currentValue: TanreiDrawerValue by mutableStateOf(initialValue)
        private set

    public val isOpen: Boolean get() = currentValue == TanreiDrawerValue.Open

    public val isClosed: Boolean get() = currentValue == TanreiDrawerValue.Closed

    /** Shows the drawer. */
    public fun open() {
        currentValue = TanreiDrawerValue.Open
    }

    /** Hides the drawer. The product's own close: [confirmValueChange] is not asked. */
    public fun close() {
        currentValue = TanreiDrawerValue.Closed
    }

    /** The drawer's own close (NVD-20, NVD-21): heard by [confirmValueChange] exactly once; true when it closed. */
    internal fun requestClose(): Boolean {
        if (currentValue != TanreiDrawerValue.Open) return false
        if (!confirmValueChange(TanreiDrawerValue.Closed)) return false
        currentValue = TanreiDrawerValue.Closed
        return true
    }

    public companion object {
        /** Keeps whether the drawer is open across a configuration change. */
        public fun Saver(confirmValueChange: (TanreiDrawerValue) -> Boolean): Saver<TanreiDrawerState, TanreiDrawerValue> =
            Saver(save = { it.currentValue }, restore = { TanreiDrawerState(it, confirmValueChange) })
    }
}

/** A [TanreiDrawerState] for the lifetime of the screen, kept across configuration changes. */
@Composable
public fun rememberTanreiDrawerState(
    initialValue: TanreiDrawerValue = TanreiDrawerValue.Closed,
    confirmValueChange: (TanreiDrawerValue) -> Boolean = { true },
): TanreiDrawerState {
    val confirm by rememberUpdatedState(confirmValueChange)
    return rememberSaveable(saver = TanreiDrawerState.Saver { confirm(it) }) { TanreiDrawerState(initialValue) { confirm(it) } }
}

/** What [TanreiNavigationDrawer] takes when a product says nothing else. */
public object TanreiNavigationDrawerDefaults {
    /** NVD-25: the system bars and the display cutout at the drawer's start, top and bottom. */
    public val windowInsets: WindowInsets
        @Composable
        get() = WindowInsets.systemBars.union(WindowInsets.displayCutout).only(WindowInsetsSides.Start + WindowInsetsSides.Vertical)
}

/** What the drawer's items learn from it. */
private class TanreiDrawerContext(
    val destinations: TanreiDestinations,
    val modal: Boolean,
    /** Closes a modal drawer after a destination was activated (NVD-21). */
    val closeAfterActivation: () -> Unit,
    val inSection: Boolean,
) {
    fun inSection(): TanreiDrawerContext = TanreiDrawerContext(destinations, modal, closeAfterActivation, inSection = true)
}

private val LocalTanreiDrawer = compositionLocalOf<TanreiDrawerContext?> { null }

/**
 * A panel of a product's destinations at the start edge — beside the content ([TanreiNavigationDrawerVariant.Standard])
 * or over it with a scrim ([TanreiNavigationDrawerVariant.Modal]). Implements `specs/navigation-drawer.spec.json`; every
 * value comes from `TanreiTheme.tokens.navigationDrawer`. It wraps the screen: [content] is the rest of it.
 *
 * @param drawerContent the spec's items: [TanreiNavigationDrawerItem]s and [TanreiNavigationDrawerSection]s, in order,
 *   below the [header]. They scroll together when the drawer is too short for them (NVD-12).
 * @param modifier applied to the whole layout, drawer and content.
 * @param variant a key of `tokens.navigationDrawer.variants`: standard (default) or modal. Open: a design system may add
 *   values, which behave as standard; a value it does not have draws with standard's tokens, and a debuggable
 *   app reports it (NVD-26).
 * @param drawerState the spec's `open` and `close` (see [TanreiDrawerState]).
 * @param contentDescription the spec's `label`: names the drawer ("Mail") — the modal drawer's pane title (NVD-23). An
 *   empty one on a modal drawer is reported in debuggable apps (NVD-24).
 * @param header the spec's `header` slot: above the destinations, not restyled.
 * @param windowInsets the system insets the drawer's color reaches under and its content keeps out of (NVD-25).
 * @param content the screen beside (standard) or under (modal) the drawer.
 */
@Composable
public fun TanreiNavigationDrawer(
    drawerContent: @Composable ColumnScope.() -> Unit,
    modifier: Modifier = Modifier,
    variant: TanreiNavigationDrawerVariant = TanreiNavigationDrawerVariant.Standard,
    drawerState: TanreiDrawerState = rememberTanreiDrawerState(),
    contentDescription: String = "",
    header: (@Composable ColumnScope.() -> Unit)? = null,
    windowInsets: WindowInsets = TanreiNavigationDrawerDefaults.windowInsets,
    content: @Composable () -> Unit,
) {
    val system = TanreiTheme.tokens
    val tokens = system.navigationDrawer
    // NVD-26: the lookup is total — a value this design system does not have reads the default value's tokens.
    if (variant !in tokens.variants) TanreiReportUnknownValue(system.id, "TanreiNavigationDrawer", "variant", variant.key)
    val modal = variant == TanreiNavigationDrawerVariant.Modal
    // NVD-24: a modal drawer is a dialog, and a dialog needs a name.
    if (modal && contentDescription.isBlank()) TanreiReportMissingName("TanreiNavigationDrawer", "contentDescription", what = "a modal drawer (a dialog) without a label")
    val destinations = rememberTanreiDestinations(horizontal = false, direction = LocalLayoutDirection.current, allFocusable = true)
    // NVD-29: two destinations marked selected — the first is drawn selected — are reported.
    TanreiReportDestinations(destinations, "TanreiNavigationDrawer", 0..Int.MAX_VALUE)
    val context = remember(destinations, modal, drawerState) { TanreiDrawerContext(destinations, modal, { drawerState.requestClose() }, inSection = false) }

    // NVD-18 / NVD-19 / NVD-22: how far the drawer is shown, 0 to 1, over the enter or exit motion; at once where
    // motion is reduced (Android's setting removes animations).
    val open = drawerState.isOpen
    val shown = remember { Animatable(if (open) 1f else 0f) }
    val enter = tanreiTween<Float>(tokens.motionEnterDuration, tokens.motionEnterEasing)
    val exit = tanreiTween<Float>(tokens.motionExitDuration, tokens.motionExitEasing)
    LaunchedEffect(open) { shown.animateTo(if (open) 1f else 0f, if (open) enter else exit) }
    val present by remember { derivedStateOf { drawerState.isOpen || shown.value > 0f } }

    val drawerFocus = remember { FocusRequester() }
    val contentFocus = remember { FocusRequester() }
    var focusInside by remember { mutableStateOf(false) }
    // NVD-19 / NVD-28: opening moves focus to the selected destination, else to the drawer's first focusable element.
    val moveFocusIn: () -> Unit = {
        val chosen = destinations.chosen()?.takeIf { it.enabled && it.focusable }
        if (chosen == null || !destinations.order.focus(chosen)) drawerFocus.requestFocus()
    }

    val sheet: @Composable (Modifier) -> Unit = { sheetModifier ->
        TanreiDrawerSheet(
            tokens = tokens,
            look = tokens.variants[variant],
            modal = modal,
            contentDescription = contentDescription,
            count = destinations.order.size,
            header = header,
            windowInsets = windowInsets,
            modifier = sheetModifier.focusRequester(drawerFocus).onFocusChanged { focusInside = it.hasFocus },
        ) {
            CompositionLocalProvider(LocalTanreiDrawer provides context) { drawerContent() }
        }
    }
    // NVD-22 / NVD-28: focus returns to the element that had it when the drawer opened — the content keeps it
    // (`focusRestorer`) — or, when it is gone, where focus goes by default.
    val screen: @Composable () -> Unit = {
        Box(Modifier.focusRequester(contentFocus).focusRestorer().focusGroup()) { content() }
    }

    if (!modal) {
        // NVD-28: a change of open moves focus in, or back out while it is inside; the first composition is not a change.
        val seen = remember { SeenOpen(open) }
        LaunchedEffect(open) {
            if (seen.open == open) return@LaunchedEffect
            seen.open = open
            if (open) {
                withFrameNanos { }
                moveFocusIn()
            } else if (focusInside) {
                contentFocus.requestFocus()
            }
        }
        TanreiStandardDrawerLayout(shown = { shown.value }, modifier = modifier, drawer = { if (present) sheet(Modifier) }, content = screen)
        return
    }

    Box(modifier) { screen() }
    if (!present) return
    TanreiModalDrawer(tokens = tokens, drawerState = drawerState, shown = shown, moveFocusIn = moveFocusIn, sheet = sheet)
}

/** Not a snapshot state on purpose: which `open` the focus effect saw last. */
private class SeenOpen(var open: Boolean)

/**
 * NVD-18: the standard drawer beside the content. The drawer is laid out at its full width and moved off the start edge
 * by what is not yet [shown]; the content takes the rest of the width, so it resizes as the drawer slides.
 */
@Composable
private fun TanreiStandardDrawerLayout(shown: () -> Float, modifier: Modifier, drawer: @Composable () -> Unit, content: @Composable () -> Unit) {
    Layout(contents = listOf(drawer, content), modifier = modifier) { (drawers, contents), constraints ->
        val width = if (constraints.hasBoundedWidth) constraints.maxWidth else constraints.minWidth
        val loose = constraints.copy(minWidth = 0)
        val panel = drawers.firstOrNull()?.measure(loose)
        val taken = ((panel?.width ?: 0) * shown().coerceIn(0f, 1f)).roundToInt().coerceAtMost(width)
        val rest = (width - taken).coerceAtLeast(0)
        val screens = contents.map { it.measure(constraints.copy(minWidth = rest, maxWidth = rest)) }
        val height = if (constraints.hasBoundedHeight) constraints.maxHeight else maxOf(panel?.height ?: 0, screens.maxOfOrNull { it.height } ?: 0)
        layout(width, height) {
            screens.forEach { it.placeRelative(taken, 0) }
            panel?.placeRelative(taken - panel.width, 0)
        }
    }
}

/**
 * NVD-19 – NVD-22: the modal drawer, presented in a `Dialog` window over the whole window (as `TanreiDialog` is): the
 * window traps focus and gives it back when it closes, back asks to close it, and the window under it is hidden from
 * assistive technology while it is open.
 */
@Composable
private fun TanreiModalDrawer(tokens: TanreiNavigationDrawerTokens, drawerState: TanreiDrawerState, shown: Animatable<Float, AnimationVector1D>, moveFocusIn: () -> Unit, sheet: @Composable (Modifier) -> Unit) {
    // NVD-19: everything behind is inert to assistive technology; a snackbar host waits for it as for a dialog.
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
        // NVD-20: the platform's back.
        onDismissRequest = { drawerState.requestClose() },
        properties = DialogProperties(dismissOnBackPress = true, dismissOnClickOutside = false, usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
    ) {
        // The window's own dim and animation are off: the scrim and the motion are Tanrei's.
        val window = (LocalView.current.parent as? DialogWindowProvider)?.window
        SideEffect {
            window?.setDimAmount(0f)
            window?.setWindowAnimations(0)
        }
        LaunchedEffect(Unit) {
            withFrameNanos { }
            moveFocusIn()
        }
        TanreiModalDrawerLayer(tokens = tokens, shown = shown, onClose = { drawerState.requestClose() }, sheet = sheet)
    }
}

/**
 * The modal drawer's layer, in place: the scrim over the whole of it and the sheet at its start edge, slid in by how far
 * it is [shown] (0–1; null: fully). A press on the scrim, Escape, and a drag toward the start edge past half the sheet or
 * a fling that way call [onClose] (NVD-20), which answers whether the drawer closed. The baselines draw it fully shown,
 * in a stage.
 */
@Composable
internal fun TanreiModalDrawerLayer(tokens: TanreiNavigationDrawerTokens, shown: Animatable<Float, AnimationVector1D>?, onClose: () -> Boolean, sheet: @Composable (Modifier) -> Unit) {
    val scrim = tokens.scrimColor.color
    val rtl = LocalLayoutDirection.current == LayoutDirection.Rtl
    val direction = if (rtl) -1f else 1f
    val scope = rememberCoroutineScope()
    var width by remember { mutableFloatStateOf(0f) }
    var drag by remember { mutableFloatStateOf(0f) }
    val fling = ViewConfiguration.get(LocalContext.current).scaledMinimumFlingVelocity.toFloat()
    val close by rememberUpdatedState(onClose)
    val shownNow: () -> Float = { shown?.value ?: 1f }
    val dragState = rememberDraggableState { delta -> drag = (drag + delta * direction).coerceIn(-width, 0f) }
    Box(Modifier.fillMaxSize()) {
        // NVD-19: the scrim dims the rest of the window and takes every press behind the sheet (NVD-20: and closes it).
        Box(
            Modifier
                .fillMaxSize()
                .drawBehind { if (scrim.isDrawn) drawRect(scrim, alpha = shownNow().coerceIn(0f, 1f)) }
                .pointerInput(Unit) { detectTapGestures { close() } }
                .clearAndSetSemantics {},
        )
        sheet(
            Modifier
                .align(Alignment.CenterStart)
                .onSizeChanged { width = it.width.toFloat() }
                .graphicsLayer { translationX = ((shownNow() - 1f) * width + drag) * direction }
                // NVD-20: Escape closes it; the key up that follows is consumed too.
                .onPreviewKeyEvent { event ->
                    if (event.key != Key.Escape) return@onPreviewKeyEvent false
                    if (event.type == KeyEventType.KeyDown) close()
                    true
                }
                // NVD-20: a drag toward the start edge past half the sheet, or a fling that way, closes it; anything less
                // settles back.
                .draggable(
                    state = dragState,
                    orientation = Orientation.Horizontal,
                    onDragStopped = { velocity ->
                        val towardStart = velocity * direction < -fling
                        val far = -drag > width / 2f
                        if ((towardStart || far) && close()) {
                            // Closing from where the drag left it: the exit motion runs from there.
                            val from = (1f + drag / width.coerceAtLeast(1f)).coerceIn(0f, 1f)
                            shown?.snapTo(from)
                            drag = 0f
                        } else {
                            scope.launch { animate(drag, 0f) { value, _ -> drag = value } }
                        }
                    },
                ),
        )
    }
}

/**
 * The modal drawer fully shown, in place — its scrim and its sheet where they are composed, without the window: what
 * the baselines draw for a modal fixture (as `TanreiDialogContent` is for the dialog). Test and gallery harnesses only.
 */
@Composable
internal fun TanreiModalDrawerInPlace(
    drawerContent: @Composable ColumnScope.() -> Unit,
    contentDescription: String = "",
    header: (@Composable ColumnScope.() -> Unit)? = null,
    windowInsets: WindowInsets = WindowInsets(0, 0, 0, 0),
    variant: TanreiNavigationDrawerVariant = TanreiNavigationDrawerVariant.Modal,
) {
    val tokens = TanreiTheme.tokens.navigationDrawer
    val destinations = rememberTanreiDestinations(horizontal = false, direction = LocalLayoutDirection.current, allFocusable = true)
    val context = remember(destinations) { TanreiDrawerContext(destinations, modal = true, closeAfterActivation = {}, inSection = false) }
    TanreiModalDrawerLayer(tokens = tokens, shown = null, onClose = { false }) { sheetModifier ->
        TanreiDrawerSheet(tokens, tokens.variants[variant], modal = true, contentDescription, destinations.order.size, header, windowInsets, sheetModifier) {
            CompositionLocalProvider(LocalTanreiDrawer provides context) { drawerContent() }
        }
    }
}

/**
 * The drawer's panel (NVD-11, NVD-12, NVD-25): `containerWidth` wide beside the start inset, the full height, its
 * variant's color at its elevation, its end corners rounded by its shape (square start corners), an end edge in its
 * outline color; the header and the items `containerPaddingInline` and `containerPaddingBlock` inside it, scrolling
 * together. It reaches under the insets and keeps its content inside them.
 */
@Composable
private fun TanreiDrawerSheet(
    tokens: TanreiNavigationDrawerTokens,
    look: TanreiNavigationDrawerVariantTokens,
    modal: Boolean,
    contentDescription: String,
    count: Int,
    header: (@Composable ColumnScope.() -> Unit)?,
    windowInsets: WindowInsets,
    modifier: Modifier,
    items: @Composable ColumnScope.() -> Unit,
) {
    val smoothing = TanreiTheme.tokens.shape.cornerSmoothing
    val shape: Shape = remember(look.containerShape, smoothing) { tanreiEndCornerShape(look.containerShape, smoothing) }
    val color = look.containerColor.color
    val edge = look.outlineColor.color
    val edgeWidth = tokens.outlineWidth
    val label = contentDescription.takeUnless { it.isBlank() }
    Column(
        modifier
            .fillMaxHeight()
            .tanreiElevation(look.containerElevation, shape)
            .tanreiContainer(shape, containerColor = { color }, outlineColor = Color.Transparent, outlineWidth = Dp.Hairline)
            .drawWithContent {
                drawContent()
                val thickness = edgeWidth.toPx()
                if (edge.isDrawn && thickness > 0f) {
                    val x = if (layoutDirection == LayoutDirection.Rtl) 0f else size.width - thickness
                    drawRect(edge, topLeft = Offset(x, 0f), size = Size(thickness, size.height))
                }
            }
            .windowInsetsPadding(windowInsets)
            .width(tokens.containerWidth)
            // NVD-23: the destinations are a column of `count`; the modal drawer is a dialog named by its label.
            .semantics {
                collectionInfo = CollectionInfo(rowCount = count, columnCount = 1)
                isTraversalGroup = true
                if (label != null) {
                    if (modal) paneTitle = label
                    this.contentDescription = label
                }
            }
            .focusGroup()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = tokens.containerPaddingInline, vertical = tokens.containerPaddingBlock),
    ) {
        header?.invoke(this)
        items()
    }
}

/**
 * One destination of a [TanreiNavigationDrawer] (the spec's item kind `destination`): a row across the drawer's inner
 * width. Call it in the drawer's `drawerContent` or in a [TanreiNavigationDrawerSection].
 *
 * @param selected the spec's `value`: true for the destination the drawer's value names — the caller marks it. When
 *   more than one is marked, the first in reading order is drawn selected and a debuggable app reports it (NVD-29).
 * @param onClick the spec's `change` and `reselect`: the user activated this destination (NVD-1). A modal drawer then
 *   closes itself (NVD-21).
 * @param label its name, drawn in the row (wrapping) and its accessible name. An empty one still renders, and a
 *   debuggable app reports it (NVD-24).
 * @param modifier applied to the destination's cell.
 * @param icon the name of its glyph, at the row's start in the icon style of its selection (NVD-14); null draws none.
 *   Give every destination of a drawer an icon, or none.
 * @param badge short text at the row's end (`"24"`, `"New"`) in the row's colors, read after the name and state
 *   (NVD-15); empty draws none.
 * @param enabled the Compose idiom for the spec's `disabled` (inverse) (NVD-2, NVD-7).
 * @param interactionSource hoist to observe or drive hover, focus and press.
 */
@Composable
public fun TanreiNavigationDrawerItem(
    selected: Boolean,
    onClick: () -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    icon: String? = null,
    badge: String = "",
    enabled: Boolean = true,
    interactionSource: MutableInteractionSource? = null,
) {
    val drawer = LocalTanreiDrawer.current
    val source = interactionSource ?: remember { MutableInteractionSource() }
    val system = TanreiTheme.tokens
    val tokens = system.navigationDrawer
    // NVD-24: still rendered and still working; reported in debuggable apps.
    if (label.isBlank()) TanreiReportMissingName("TanreiNavigationDrawerItem", "label", what = "a destination without a label")

    // NVD-29: the order and which one is drawn selected are the drawer's.
    val destinations = drawer?.destinations
    val entry = rememberTanreiRovingEntry(destinations?.order, focusable = enabled, enabled = enabled, selected = selected, text = label)
    val drawnSelected = destinations?.isSelected(entry, selected) ?: selected
    val index = entry?.let { destinations?.order?.indexOf(it) } ?: -1

    // NVD-4: one state wins; NVD-8: a press counts from the first frame and for at least press-hold.
    val interaction = source.collectTanreiInteraction(enabled)
    // NVD-9: the pressed tokens say WHAT a press looks like; `pressed-feedback` says how it arrives.
    val feedback = system.behavior.pressedFeedback
    val drawnStates = interaction.drawnStates(feedback)
    val condition = if (drawnSelected) TanreiNavigationDrawerCondition.Selected else TanreiNavigationDrawerCondition.Unselected
    val look = tokens.conditions[condition]
    val drawn = look[drawnStates.content]

    // A change of state moves over the state motion (entering pressed snaps); a change of selection over the same
    // duration and easing, also while pressed. The first frames, while the drawer settles its selection, snap.
    val stateMotion = TanreiStateMotion(interaction.state, tokens.motionStateDuration, tokens.motionStateEasing)
    val selectionMotion = rememberTanreiSelectionMotion(drawnSelected, stateMotion, tokens.motionStateDuration, tokens.motionStateEasing)
    val settling = destinations != null && !destinations.settled
    val motion = if (settling) TanreiStateMotion(TanreiInteractionState.Pressed, tokens.motionStateDuration, tokens.motionStateEasing) else selectionMotion
    val containerColor = animateTanreiColorAsState(look[drawnStates.container].itemContainerColor.color, motion, label = "container")
    val iconColor by animateTanreiColorAsState(drawn.itemIconColor.color, motion, label = "icon")
    val labelColor = animateTanreiColorAsState(drawn.itemLabelColor.color, motion, label = "label")
    val badgeColor = animateTanreiColorAsState(drawn.itemBadgeColor.color, motion, label = "badge")
    val opacity = animateFloatAsState(tokens.opacity(drawnStates.content), motion.spec(), label = "opacity")

    // NVD-10: the row's corners eased by corner smoothing.
    val smoothing = system.shape.cornerSmoothing
    val shape = remember(tokens.itemContainerShape, smoothing) { tanreiContainerShape(tokens.itemContainerShape, smoothing) }
    // NVD-9, ripple: the pressed container color of the condition, from the point of contact; a press in the gap
    // around the row (part of the hit area) grows from its center.
    val ripple = rememberTanreiRipple(
        feedback = feedback,
        interaction = interaction,
        color = tokens.conditions[condition].pressed.itemContainerColor.color,
        feedbackDurationMillis = tokens.motionFeedbackDuration,
        stateDurationMillis = tokens.motionStateDuration,
        stateEasing = tokens.motionStateEasing,
        centerOutsideContainer = true,
    )

    // NVD-15: the badge after the name and state. The platform says "selected" only while there is no state description,
    // so a selected destination's description starts with it.
    val selectedWord = stringResource(R.string.tanrei_selected)
    val description = badge.takeIf { it.isNotBlank() }?.let { if (drawnSelected) "$selectedWord, $it" else it }
    val cell = Modifier
        .fillMaxWidth()
        .then(modifier)
        .tanreiRovingItem(destinations?.order, entry, focusable = enabled)
        // NVD-23: one element — a button with its selected state and position among the destinations — named by its label.
        .semantics {
            if (index >= 0) collectionItemInfo = CollectionItemInfo(rowIndex = index, rowSpan = 1, columnIndex = 0, columnSpan = 1)
            if (description != null) stateDescription = description
        }
        // NVD-1 / NVD-2 / NVD-21: activation, then a modal drawer closes.
        .selectable(
            selected = drawnSelected,
            interactionSource = source,
            indication = null,
            enabled = enabled,
            role = Role.Button,
            onClick = {
                onClick()
                if (drawer?.modal == true) drawer.closeAfterActivation()
            },
        )
        .tanreiPressInput(interaction.press, enabled)
        .tanreiRippleInput(ripple)
        // NVD-9 dim / NVD-7: the opacity of the state, on the whole destination.
        .tanreiGroupOpacity(overflow = tanreiDecorationOverflow(system, emptyList())) { opacity.value }
        // NVD-6: the hit area is the row with half the gap above and below — at least the touch target.
        .heightIn(min = system.measure.targetTouch)
        .padding(vertical = tokens.containerGap / 2)

    val glyph = system.icon.glyph(tokens.itemIconSize, drawnSelected)
    Box(cell, contentAlignment = Alignment.Center) {
        // NVD-13: the row across the inner width, at least its height, its content padded and gap apart, mirrored
        // right-to-left. NVD-5: the focus ring around it, keyboard focus only, never animated.
        Row(
            Modifier
                .fillMaxWidth()
                .heightIn(min = tokens.itemContainerHeight)
                .tanreiFocusRing(source, cornerRadius = tokens.itemContainerShape)
                .tanreiContainer(shape, containerColor = { containerColor.value }, outlineColor = Color.Transparent, outlineWidth = Dp.Hairline, ripple = ripple)
                .padding(horizontal = tokens.itemPaddingInline),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(tokens.itemGap),
        ) {
            // NVD-14: the glyph of the selection, decorative.
            if (icon != null) TanreiNamedGlyph(icon, glyph, tokens.itemIconSize, iconColor)
            // NVD-13 / NVD-27: the label wraps rather than truncating, and grows the row.
            BasicText(label, modifier = Modifier.weight(1f), style = tokens.itemLabelTypescale.toTextStyle(), color = { labelColor.value })
            // NVD-15: the badge text at the end, in the row's colors; its words are the state description.
            if (badge.isNotEmpty()) BasicText(badge, modifier = Modifier.clearAndSetSemantics {}, style = tokens.itemBadgeTypescale.toTextStyle(), color = { badgeColor.value }, softWrap = false)
        }
    }
}

/**
 * A group of destinations of a [TanreiNavigationDrawer] (the spec's item kind `section`): a divider before it, a heading,
 * and its destinations, in that order. Sections do not nest: a section inside a section renders its destinations in its
 * place, and a debuggable app reports it (NVD-17).
 *
 * @param modifier applied to the section.
 * @param heading names the destinations under it: drawn in `headingTypescale` / `headingColor` in a row at least
 *   `headingHeight` high, starting where the destinations' content starts, and exposed as a heading that is not
 *   focusable (NVD-16). Empty draws no heading row.
 * @param divider draws a [TanreiDivider] before the section, across the drawer's inner width (NVD-17).
 * @param content the section's [TanreiNavigationDrawerItem]s.
 */
@Composable
public fun TanreiNavigationDrawerSection(
    modifier: Modifier = Modifier,
    heading: String = "",
    divider: Boolean = false,
    content: @Composable ColumnScope.() -> Unit,
) {
    val drawer = LocalTanreiDrawer.current
    val tokens = TanreiTheme.tokens.navigationDrawer
    if (drawer?.inSection == true) {
        // NVD-17: the inner section's destinations in its place.
        TanreiReportNestedSection()
        Column(modifier.fillMaxWidth(), content = content)
        return
    }
    Column(modifier.fillMaxWidth()) {
        if (divider) TanreiDivider(Modifier.fillMaxWidth())
        if (heading.isNotEmpty()) {
            val color = tokens.headingColor.color
            Box(
                Modifier
                    .fillMaxWidth()
                    .heightIn(min = tokens.headingHeight)
                    .padding(horizontal = tokens.itemPaddingInline)
                    .semantics { heading() },
                contentAlignment = Alignment.CenterStart,
            ) {
                BasicText(heading, style = tokens.headingTypescale.toTextStyle(), color = { color })
            }
        }
        CompositionLocalProvider(LocalTanreiDrawer provides drawer?.inSection()) { content() }
    }
}

/** Debuggable apps only (NVD-17): a section inside a section. */
@Composable
private fun TanreiReportNestedSection() {
    if (!isTanreiDebuggable()) return
    remember { TanreiDiagnostics.reporter("TanreiNavigationDrawerSection: sections do not nest; the inner section's destinations are drawn in its place.") }
}
