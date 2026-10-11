package io.github.chnotchy.tanrei.components

import android.view.View
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.rememberTransition
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.interaction.FocusInteraction
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.PressInteraction
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.ime
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.union
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.selection.LocalTextSelectionColors
import androidx.compose.foundation.text.selection.TextSelectionColors
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.ProvidableCompositionLocal
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.State
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
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
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.changedToUp
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.Measurable
import androidx.compose.ui.layout.Placeable
import androidx.compose.ui.layout.layoutId
import kotlinx.coroutines.launch
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.layout.onPlaced
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.layout.positionInRoot
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.CollectionInfo
import androidx.compose.ui.semantics.CollectionItemInfo
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.collectionInfo
import androidx.compose.ui.semantics.collectionItemInfo
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.paneTitle
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntRect
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.max
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.window.DialogWindowProvider
import androidx.compose.ui.window.Popup
import androidx.compose.ui.window.PopupPositionProvider
import androidx.compose.ui.window.PopupProperties
import io.github.chnotchy.tanrei.primitives.LocalTanreiGlyphStandIn
import io.github.chnotchy.tanrei.primitives.LocalTanreiJoinedRow
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.primitives.TanreiDrawnGlyph
import io.github.chnotchy.tanrei.primitives.TanreiDrawnGlyphKind
import io.github.chnotchy.tanrei.primitives.TanreiInteraction
import io.github.chnotchy.tanrei.primitives.TanreiJoinedItem
import io.github.chnotchy.tanrei.primitives.TanreiJoinedRow
import io.github.chnotchy.tanrei.primitives.TanreiModalDialogs
import io.github.chnotchy.tanrei.primitives.TanreiNamedGlyph
import io.github.chnotchy.tanrei.primitives.TanreiReportMissingName
import io.github.chnotchy.tanrei.primitives.TanreiStateMotion
import io.github.chnotchy.tanrei.primitives.TanreiText
import io.github.chnotchy.tanrei.primitives.animateTanreiColorAsState
import io.github.chnotchy.tanrei.primitives.animateTanreiElevation
import io.github.chnotchy.tanrei.primitives.collectTanreiInteraction
import io.github.chnotchy.tanrei.primitives.collectTanreiPress
import io.github.chnotchy.tanrei.primitives.drawnStates
import io.github.chnotchy.tanrei.primitives.extent
import io.github.chnotchy.tanrei.primitives.focusExtent
import io.github.chnotchy.tanrei.primitives.isDrawn
import io.github.chnotchy.tanrei.primitives.isTanreiDebuggable
import io.github.chnotchy.tanrei.primitives.rememberTanreiRipple
import io.github.chnotchy.tanrei.primitives.tanreiContainer
import io.github.chnotchy.tanrei.primitives.tanreiContainerShape
import io.github.chnotchy.tanrei.primitives.tanreiElevation
import io.github.chnotchy.tanrei.primitives.tanreiFocusGlow
import io.github.chnotchy.tanrei.primitives.tanreiFocusRing
import io.github.chnotchy.tanrei.primitives.tanreiGroupOpacity
import io.github.chnotchy.tanrei.primitives.tanreiInteractionStateOf
import io.github.chnotchy.tanrei.primitives.tanreiJoinedReach
import io.github.chnotchy.tanrei.primitives.tanreiRippleInput
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph
import io.github.chnotchy.tanrei.theme.LocalTanreiTextStyle
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.glyph
import io.github.chnotchy.tanrei.theme.tanreiTween
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiFocusStyle
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiSearchTokens
import kotlin.math.roundToInt

/*
 * `specs/search.spec.json` (SRC-1…29) on Compose, as `platforms.compose` maps it — the idiom of Material's `SearchBar`
 * with its input field: `TanreiSearch(value, onValueChange, expanded, onExpandedChange, label, modifier, presentation,
 * placeholder, enabled, clearLabel, backLabel, onSearch, onSelect, leading, trailing) { suggestions and content }`, the
 * suggestions being `TanreiSearchSuggestion(value, headline, supportingText, leadingIcon)` called first in the content
 * lambda. State hoisting: the caller keeps `value` and `expanded` and moves them from `onValueChange` (the spec's `input`)
 * and `onExpandedChange` (its `toggle`: the new expanded value and, when closing, the reason). Built on `BasicTextField`
 * with the search action key. The docked view is a `Popup` that does not take focus; the full-screen view is a `Dialog`
 * window. Compose has no combobox or listbox role: the suggestions are buttons in a column with collection semantics.
 */

/**
 * The spec's `presentation`: where the view opens — [Docked] under the bar (a large screen), [FullScreen] over the whole
 * window with its own header (a small screen). A closed set: every value the spec defines is here, so no unknown one can
 * be passed (SRC-27).
 */
public enum class TanreiSearchPresentation { Docked, FullScreen }

/** Why the search asks to close its view (SRC-6), in Compose's casing: the spec's escape, back, select, submit, outside, tab and focus-out. */
public enum class TanreiSearchCloseReason { Escape, Back, Select, Submit, Outside, Tab, FocusOut }

/**
 * Tests only: the open view drawn in place — the docked view under the bar in the search's own layout, the full-screen
 * view over the box the search is given — instead of in a popup or a dialog window (SRC-7's and SRC-9's `verify`). No
 * focus is moved. What an app gets is the popup and the dialog.
 */
internal val LocalTanreiSearchInPlace: ProvidableCompositionLocal<Boolean> = staticCompositionLocalOf { false }

/**
 * A search bar that opens a view of suggestions and the product's own content, docked under the bar or over the whole
 * window. Implements `specs/search.spec.json`; every value it reads is `TanreiTheme.tokens.search` ([TanreiSearchTokens])
 * and, for the selection highlight, the text field's `selectionColor` — the product's one selection color for text entry.
 *
 * @param value the query; the caller moves it from [onValueChange] (the spec's `input`: typing, deleting, pasting, the
 *   clear button, Escape). Setting it emits nothing.
 * @param expanded whether the view is open. The search asks with [onExpandedChange] (the spec's `toggle`): `true` when the
 *   person presses the bar, types or presses Down Arrow while it is closed (focus alone never opens it); `false` with the
 *   [TanreiSearchCloseReason] when it closes. The caller sets [expanded] from it, as for the menu.
 * @param label names the search field, its view and its suggestions for assistive technology ("Search mail"); never drawn,
 *   and the placeholder is never the name. Required: an empty one still renders, and a debuggable app reports it (SRC-27).
 * @param modifier applied to the bar.
 * @param presentation [TanreiSearchPresentation.Docked] (default) or [TanreiSearchPresentation.FullScreen].
 * @param placeholder a hint drawn while the value is empty.
 * @param enabled the Compose idiom for the spec's `disabled` (inverse): false is not focusable, editable or expandable,
 *   emits nothing and hides the clear button (SRC-26).
 * @param clearLabel the clear button's name ("Clear search"); required while it can show (SRC-10).
 * @param backLabel the full-screen view's back button's name ("Back"); required for full-screen (SRC-11).
 * @param onSearch the spec's `submit`: the action key with no suggestion active; it carries the value (SRC-13).
 * @param onSelect the spec's `select`: a suggestion was chosen; it carries the suggestion's value (SRC-15). The search
 *   does not change [value] itself.
 * @param leading the spec's `leading` slot: one of the product's icon buttons (menu, back), drawn in place of the glyph.
 * @param trailing the spec's `trailing` slot: up to two of the product's icon buttons, after the clear button.
 * @param interactionSource the bar's: hover and press. The input's focus is its own (the bar's focused state).
 * @param content the view: [TanreiSearchSuggestion]s first, then the product's own content (results, a message).
 */
@Composable
public fun TanreiSearch(
    value: String,
    onValueChange: (String) -> Unit,
    expanded: Boolean,
    onExpandedChange: (Boolean, TanreiSearchCloseReason?) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    presentation: TanreiSearchPresentation = TanreiSearchPresentation.Docked,
    placeholder: String = "",
    enabled: Boolean = true,
    clearLabel: String = "",
    backLabel: String = "",
    onSearch: ((String) -> Unit)? = null,
    onSelect: ((String) -> Unit)? = null,
    leading: (@Composable () -> Unit)? = null,
    trailing: (@Composable () -> Unit)? = null,
    interactionSource: MutableInteractionSource? = null,
    content: @Composable () -> Unit = {},
) {
    val system = TanreiTheme.tokens
    val tokens = system.search
    // SRC-27: still rendered; reported in debuggable apps.
    if (label.isBlank()) TanreiReportMissingName("TanreiSearch", "label", what = "a search field without a label")
    val fullScreen = presentation == TanreiSearchPresentation.FullScreen
    if (fullScreen && backLabel.isBlank()) TanreiReportMissingName("TanreiSearch", "backLabel", what = "the full-screen view's back button")
    val showsClear = enabled && value.isNotEmpty()
    if (showsClear && clearLabel.isBlank()) TanreiReportMissingName("TanreiSearch", "clearLabel", what = "the clear button")

    val state = remember { TanreiSearchState() }
    state.update(
        value = value,
        expanded = expanded,
        enabled = enabled,
        fullScreen = fullScreen,
        onValueChange = onValueChange,
        onExpandedChange = onExpandedChange,
        onSearch = onSearch,
        onSelect = onSelect,
    )
    // A request is forgotten once the caller has answered it (expanded changed) or has had a frame to — so a key pressed
    // twice before the caller answers asks once, and a caller that declines can be asked again by a later gesture.
    LaunchedEffect(expanded) { state.requested = null }
    val requested = state.requested
    LaunchedEffect(requested) {
        if (requested != null) {
            withFrameNanos { }
            withFrameNanos { }
            state.requested = null
        }
    }
    // SRC-14: a change of the suggestions leaves none active.
    LaunchedEffect(state) {
        snapshotFlow { state.ordered.map { it.value } }.collect { state.active = null }
    }

    val inPlace = LocalTanreiSearchInPlace.current
    // SRC-26: a disabled search never shows its view.
    val open = expanded && enabled
    val bar: @Composable () -> Unit = {
        TanreiSearchBar(
            state = state,
            label = label,
            placeholder = placeholder,
            clearLabel = clearLabel,
            leading = leading,
            trailing = trailing,
            source = interactionSource ?: remember { MutableInteractionSource() },
            modifier = if (inPlace) Modifier else modifier,
            view = {
                if (!fullScreen && !inPlace) TanreiSearchDockedView(state = state, open = open, label = label, content = content)
            },
        )
    }
    when {
        !inPlace -> {
            bar()
            if (fullScreen) TanreiSearchFullScreen(state = state, open = open, label = label, placeholder = placeholder, clearLabel = clearLabel, backLabel = backLabel, content = content)
        }
        fullScreen -> Box(modifier) {
            bar()
            if (open) TanreiSearchFullScreenContent(state = state, label = label, placeholder = placeholder, clearLabel = clearLabel, backLabel = backLabel, focusInput = false, shown = { 1f }, content = content)
        }
        else -> TanreiSearchDockedInPlace(state = state, modifier = modifier, offset = tokens.viewOffset, bar = bar) {
            if (open) TanreiSearchViewSurface(state = state, label = label, maxHeight = Int.MAX_VALUE, content = content)
        }
    }
}

/**
 * One suggestion of the view (the spec's item kind `suggestion`, SRC-14 … SRC-17): a row with an optional leading glyph
 * given by NAME ([leadingIcon]), its [headline] and, under it, [supportingText]; choosing it (a press, or Enter while it is
 * active) calls the search's `onSelect` with [value] and closes the view. Call it in [TanreiSearch]'s content lambda,
 * before the product's own content; outside a search it draws nothing and a debuggable app reports it.
 */
@Composable
public fun TanreiSearchSuggestion(
    value: String,
    headline: String,
    modifier: Modifier = Modifier,
    supportingText: String = "",
    leadingIcon: String = "",
) {
    val view = LocalTanreiSearchView.current
    if (view == null) {
        TanreiReportSearchProblem("TanreiSearchSuggestion \"$headline\": it is outside a TanreiSearch's content; it is not drawn.")
        return
    }
    val state = view.state
    val system = TanreiTheme.tokens
    val tokens = system.search
    val look = tokens.conditions.standard
    // SRC-27: an empty value or headline still renders; reported.
    if (value.isEmpty()) TanreiReportSearchProblem("TanreiSearchSuggestion \"$headline\": its value is empty; select carries an empty value.")
    if (headline.isBlank()) TanreiReportMissingName("TanreiSearchSuggestion", "headline", what = "a suggestion without a headline")

    val entry = remember(state) { state.newEntry() }
    DisposableEffect(state, entry) {
        state.register(entry)
        onDispose { state.unregister(entry) }
    }
    SideEffect {
        entry.value = value
        entry.headline = headline
        entry.hasIcon = leadingIcon.isNotEmpty()
    }
    val active = state.active === entry
    val source = remember { MutableInteractionSource() }
    // SRC-17: the active suggestion takes the focused tokens and the focus ring — focus itself stays in the input (SRC-8),
    // so the row is told it is "focused" through its own interaction source.
    LaunchedEffect(active) {
        if (active) {
            val focus = FocusInteraction.Focus()
            source.emit(focus)
            entry.bringIntoView.bringIntoView()
            try {
                kotlinx.coroutines.awaitCancellation()
            } finally {
                source.tryEmit(FocusInteraction.Unfocus(focus))
            }
        }
    }
    entry.press = { at ->
        val press = PressInteraction.Press(at)
        source.tryEmit(press)
        source.tryEmit(PressInteraction.Release(press))
    }
    val interaction = source.collectTanreiInteraction(enabled = true)
    val feedback = system.behavior.pressedFeedback
    val drawn = interaction.drawnStates(feedback)
    val motion = TanreiStateMotion(interaction.state, tokens.motionStateDuration, tokens.motionStateEasing)
    val containerColor = animateTanreiColorAsState(look[drawn.container].suggestionContainerColor.color, motion, label = "row")
    val iconColor by animateTanreiColorAsState(look[drawn.content].suggestionLeadingIconColor.color, motion, label = "row icon")
    val headlineColor by animateTanreiColorAsState(look[drawn.content].suggestionHeadlineColor.color, motion, label = "headline")
    val supportingColor by animateTanreiColorAsState(look[drawn.content].suggestionSupportingTextColor.color, motion, label = "supporting")
    val opacity = animateFloatAsState(tokens.opacity(drawn.content), motion.spec(), label = "row opacity")
    val smoothing = system.shape.cornerSmoothing
    val shape = remember(tokens.suggestionContainerShape, smoothing) { tanreiContainerShape(tokens.suggestionContainerShape, smoothing) }
    val ripple = rememberTanreiRipple(
        feedback = feedback,
        interaction = interaction,
        color = look.pressed.suggestionContainerColor.color,
        feedbackDurationMillis = tokens.motionFeedbackDuration,
        stateDurationMillis = tokens.motionStateDuration,
        stateEasing = tokens.motionStateEasing,
    )
    val index = state.indexOf(entry)
    val glyph = system.icon.glyph(tokens.suggestionLeadingIconSize, selected = false)
    val iconColumn = state.anyIcon
    Box(
        modifier = modifier
            .layoutId(SuggestionRow)
            .onPlaced { entry.top = it.positionInRoot().y }
            .bringIntoViewRequester(entry.bringIntoView)
            // SRC-24: a button named by its headline and described by its supporting text, with its position in the list.
            .semantics { collectionItemInfo = CollectionItemInfo(rowIndex = index.coerceAtLeast(0), rowSpan = 1, columnIndex = 0, columnSpan = 1) }
            // SRC-8: a press on a suggestion does not take focus from the input.
            .focusProperties { canFocus = false }
            .clickable(interactionSource = source, indication = null, role = Role.Button) { state.select(entry) }
            .hoverable(source)
            .tanreiRippleInput(ripple)
            .tanreiGroupOpacity(overflow = Dp.Hairline) { opacity.value }
            // SRC-17: the ring inside the row, never animated.
            .tanreiFocusRing(source, cornerRadius = tokens.suggestionContainerShape, inside = true)
            .tanreiContainer(shape, containerColor = { containerColor.value }, outlineColor = Color.Transparent, outlineWidth = Dp.Hairline, ripple = ripple),
    ) {
        TanreiSearchRowLayout(
            minHeight = max(tokens.suggestionContainerHeight, system.measure.targetTouch),
            paddingInline = tokens.suggestionContainerPaddingInline,
            paddingBlock = tokens.suggestionContainerPaddingBlock,
            gap = tokens.suggestionContainerGap,
            iconSize = if (iconColumn) tokens.suggestionLeadingIconSize else null,
            icon = {
                if (leadingIcon.isNotEmpty()) TanreiNamedGlyph(leadingIcon, glyph, tokens.suggestionLeadingIconSize, iconColor)
            },
            text = {
                TanreiText(headline, color = headlineColor, style = tokens.suggestionHeadlineTypescale.toTextStyle())
                if (supportingText.isNotEmpty()) TanreiText(supportingText, color = supportingColor, style = tokens.suggestionSupportingTextTypescale.toTextStyle())
            },
        )
    }
}

/** Marks a suggestion row among the view's children (SRC-29: the product's content is inset, a row is not). */
private object SuggestionRow

/** SRC-16: the icon column (kept in every row while any row has an icon), then the headline over the supporting text, centred. */
@Composable
private fun TanreiSearchRowLayout(minHeight: Dp, paddingInline: Dp, paddingBlock: Dp, gap: Dp, iconSize: Dp?, icon: @Composable () -> Unit, text: @Composable () -> Unit) {
    Layout(contents = listOf(icon, text)) { (icons, texts), constraints ->
        val width = if (constraints.hasBoundedWidth) constraints.maxWidth else constraints.minWidth
        val pad = paddingInline.roundToPx()
        val block = paddingBlock.roundToPx()
        val column = iconSize?.roundToPx()?.let { it + gap.roundToPx() } ?: 0
        val textWidth = (width - 2 * pad - column).coerceAtLeast(0)
        val lines = texts.map { it.measure(Constraints(maxWidth = textWidth)) }
        val iconPlaceables = if (iconSize != null) icons.map { it.measure(Constraints()) } else emptyList()
        val textHeight = lines.sumOf { it.height }
        val height = maxOf(minHeight.roundToPx(), textHeight + 2 * block, iconPlaceables.maxOfOrNull { it.height + 2 * block } ?: 0)
        layout(width, height) {
            iconPlaceables.forEach { it.placeRelative(pad, (height - it.height) / 2) }
            var y = (height - textHeight) / 2
            lines.forEach {
                it.placeRelative(pad + column, y)
                y += it.height
            }
        }
    }
}

/** What the search's view gives its suggestions. */
private class TanreiSearchView(val state: TanreiSearchState)

private val LocalTanreiSearchView: ProvidableCompositionLocal<TanreiSearchView?> = staticCompositionLocalOf { null }

/** One suggestion, as the search's keyboard and the view's reports see it. */
@Stable
private class TanreiSuggestionEntry(val serial: Int) {
    var value by mutableStateOf("")
    var headline by mutableStateOf("")
    var hasIcon by mutableStateOf(false)
    var top by mutableFloatStateOf(0f)
    val bringIntoView = BringIntoViewRequester()

    /** Shows the row's press (Enter on the active suggestion, SRC-19). */
    var press: (Offset) -> Unit = {}
}

/**
 * The search's state across its parts — the bar, the docked view, the full-screen header — and the rules they share: who
 * may ask to open or close the view and when (SRC-5, SRC-6), the active suggestion (SRC-14), choosing and submitting
 * (SRC-13, SRC-15), and clearing (SRC-10, SRC-12).
 */
@Stable
private class TanreiSearchState {
    var value by mutableStateOf("")
    var expanded by mutableStateOf(false)
    var enabled by mutableStateOf(true)
    var fullScreen by mutableStateOf(false)
    private var onValueChange: (String) -> Unit = {}
    private var onExpandedChange: (Boolean, TanreiSearchCloseReason?) -> Unit = { _, _ -> }
    private var onSearch: ((String) -> Unit)? = null
    private var onSelect: ((String) -> Unit)? = null

    /** What was last asked of the caller and not yet answered: no second request for the same thing meanwhile. */
    var requested: Boolean? by mutableStateOf(null)

    /** The bar's input, and the full-screen header's. */
    val barFocus = FocusRequester()
    val headerFocus = FocusRequester()

    /** The bar's visible height (its layout also holds the touch target), in pixels: written by its layout. */
    var barVisibleHeight = 0

    /** Where the bar's buttons lie in its own coordinates, written by its layout: a press there does not open the view (SRC-5). */
    val buttons = mutableListOf<IntRect>()

    /** SRC-6 (outside): whether a pointer is down on the bar, and how many presses the bar has heard. */
    var barPointerDown = false
    var barDowns by mutableIntStateOf(0)

    private var serials = 0
    val suggestions = mutableStateListOf<TanreiSuggestionEntry>()
    val ordered: List<TanreiSuggestionEntry> by derivedStateOf { suggestions.sortedWith(compareBy<TanreiSuggestionEntry>({ it.top }, { it.serial })) }
    val anyIcon: Boolean by derivedStateOf { suggestions.any { it.hasIcon } }
    var active: TanreiSuggestionEntry? by mutableStateOf(null)

    fun update(
        value: String,
        expanded: Boolean,
        enabled: Boolean,
        fullScreen: Boolean,
        onValueChange: (String) -> Unit,
        onExpandedChange: (Boolean, TanreiSearchCloseReason?) -> Unit,
        onSearch: ((String) -> Unit)?,
        onSelect: ((String) -> Unit)?,
    ) {
        this.value = value
        this.expanded = expanded
        this.enabled = enabled
        this.fullScreen = fullScreen
        this.onValueChange = onValueChange
        this.onExpandedChange = onExpandedChange
        this.onSearch = onSearch
        this.onSelect = onSelect
    }

    fun newEntry() = TanreiSuggestionEntry(serials++)

    fun register(entry: TanreiSuggestionEntry) {
        suggestions += entry
    }

    fun unregister(entry: TanreiSuggestionEntry) {
        suggestions -= entry
        if (active === entry) active = null
    }

    fun indexOf(entry: TanreiSuggestionEntry): Int = ordered.indexOf(entry)

    /** Open as far as the person can tell: what the caller set, or what was last asked of it. */
    private val open: Boolean get() = requested ?: expanded

    /** SRC-5: ask to open (a press on the bar, typing, Down Arrow). */
    fun expand() {
        if (!enabled || open) return
        requested = true
        onExpandedChange(true, null)
    }

    /** SRC-6: ask to close, for [reason]; the value stays. */
    fun collapse(reason: TanreiSearchCloseReason) {
        if (!enabled || !open) return
        requested = false
        active = null
        onExpandedChange(false, reason)
    }

    val isOpen: Boolean get() = open

    /** The person changed the value (SRC-4): input, and none active; typing opens the view (SRC-5). */
    fun edit(text: String) {
        if (!enabled) return
        active = null
        if (text != value) {
            onValueChange(text)
            expand()
        }
    }

    /** SRC-10 / SRC-12: empty the value, input once; nothing opens or closes. */
    fun clear() {
        if (!enabled || value.isEmpty()) return
        active = null
        onValueChange("")
    }

    /** SRC-14: Down Arrow — the next suggestion, the first while none is, staying on the last. */
    fun next() {
        val list = ordered
        if (list.isEmpty()) return
        val here = list.indexOf(active)
        active = list[(here + 1).coerceAtMost(list.size - 1)]
    }

    /** SRC-14: Up Arrow — the previous suggestion; none from the first. */
    fun previous() {
        val list = ordered
        val here = list.indexOf(active)
        active = if (here <= 0) null else list[here - 1]
    }

    /** SRC-13 / SRC-15: Enter — the active suggestion, else submit. */
    fun enter() {
        if (!enabled) return
        val chosen = active
        if (chosen != null && open) {
            chosen.press(Offset.Zero)
            select(chosen)
            return
        }
        onSearch?.invoke(value)
        collapse(TanreiSearchCloseReason.Submit)
    }

    /** SRC-15: select, then close — the value is the caller's to change. */
    fun select(entry: TanreiSuggestionEntry) {
        if (!enabled) return
        onSelect?.invoke(entry.value)
        collapse(TanreiSearchCloseReason.Select)
    }
}

/**
 * The bar (SRC-1 … SRC-5, SRC-10, SRC-12, SRC-18 … SRC-22, SRC-25, SRC-26, SRC-28): the container drawn from the bar's
 * state, the glyph or the leading slot, the input, the clear button and the trailing slot, in one row; the hit area
 * reaching the touch target above and below. [view] is composed in the bar's visible container, which it is anchored to.
 */
@Composable
private fun TanreiSearchBar(
    state: TanreiSearchState,
    label: String,
    placeholder: String,
    clearLabel: String,
    leading: (@Composable () -> Unit)?,
    trailing: (@Composable () -> Unit)?,
    source: MutableInteractionSource,
    modifier: Modifier,
    view: @Composable () -> Unit,
) {
    val system = TanreiTheme.tokens
    val tokens = system.search
    val look = tokens.conditions.standard
    val enabled = state.enabled
    val inputSource = remember { MutableInteractionSource() }

    // SRC-18: disabled, else pressed (held) > focused (by ANY means: a field shows where typing goes) > hovered.
    val press = source.collectTanreiPress()
    val hovered by source.collectIsHoveredAsState()
    val focused by inputSource.collectIsFocusedAsState()
    val interaction = TanreiInteraction(
        state = tanreiInteractionStateOf(pressed = press.pressed, focused = focused, hovered = hovered, enabled = enabled),
        unpressed = tanreiInteractionStateOf(pressed = false, focused = focused, hovered = hovered, enabled = enabled),
        press = press,
    )
    val feedback = system.behavior.pressedFeedback
    val drawn = interaction.drawnStates(feedback)
    val motion = TanreiStateMotion(interaction.state, tokens.motionStateDuration, tokens.motionStateEasing)
    val containerColor = animateTanreiColorAsState(look[drawn.container].containerColor.color, motion, label = "bar")
    val outlineColor by animateTanreiColorAsState(look[drawn.content].outlineColor.color, motion, label = "bar outline")
    val outlineWidth by animateDpAsState(tokens.outlineWidth(drawn.content), motion.spec(), label = "bar outline width")
    val glyphColor by animateTanreiColorAsState(look[drawn.content].leadingIconColor.color, motion, label = "glyph")
    val inputColor by animateTanreiColorAsState(look[drawn.content].inputColor.color, motion, label = "input")
    val placeholderColor by animateTanreiColorAsState(look[drawn.content].placeholderColor.color, motion, label = "placeholder")
    val caretColor by animateTanreiColorAsState(look[drawn.content].caretColor.color, motion, label = "caret")
    val opacity = animateFloatAsState(tokens.opacity(drawn.content), motion.spec(), label = "bar opacity")
    val elevation = animateTanreiElevation(look[drawn.content].containerElevation, motion.spec())
    val smoothing = system.shape.cornerSmoothing
    val shape = remember(tokens.containerShape, smoothing) { tanreiContainerShape(tokens.containerShape, smoothing) }
    val ripple = rememberTanreiRipple(
        feedback = feedback,
        interaction = interaction,
        color = look.pressed.containerColor.color,
        feedbackDurationMillis = tokens.motionFeedbackDuration,
        stateDurationMillis = tokens.motionStateDuration,
        stateEasing = tokens.motionStateEasing,
    )
    val glow = system.behavior.focusStyle == TanreiFocusStyle.Glow
    val overflow = max(if (glow) focusExtent(system.measure, TanreiFocusStyle.Glow) else Dp.Hairline, look.enabled.containerElevation.extent)

    val row = remember(system.measure.targetTouch) { TanreiJoinedRow(connected = false, innerRadius = Dp.Hairline, minWidth = system.measure.targetTouch) }
    val showsClear = enabled && state.value.isNotEmpty()
    val clearSize = TanreiIconButtonSize.Small

    val barModifier = modifier
        .fillMaxWidth()
        .tanreiGroupOpacity(overflow = overflow) { opacity.value }
        .hoverable(source, enabled)
        // SRC-5 / SRC-19: a press on the bar — anywhere but its buttons — shows the press at once, and when it ends focuses
        // the input and opens the view. Watched before the input handles it, and never consumed.
        .pointerInput(enabled) {
            if (!enabled) return@pointerInput
            awaitEachGesture {
                val down = awaitFirstDown(requireUnconsumed = false, pass = PointerEventPass.Initial)
                state.barPointerDown = true
                state.barDowns++
                val onButton = state.buttons.any { it.contains(IntOffset(down.position.x.roundToInt(), down.position.y.roundToInt())) }
                if (!onButton) press.pointerPressed(down.position)
                var ended = false
                try {
                    while (true) {
                        val event = awaitPointerEvent(PointerEventPass.Initial)
                        val change = event.changes.firstOrNull { it.id == down.id } ?: break
                        if (change.changedToUp()) {
                            ended = true
                            break
                        }
                        if (change.isConsumed && change.position != down.position) break
                    }
                } finally {
                    state.barPointerDown = false
                    if (!onButton) press.pointerReleased(cancelled = !ended)
                }
                if (ended && !onButton) {
                    state.barFocus.requestFocus()
                    state.expand()
                }
            }
        }
        .tanreiRippleInput(ripple)

    val background: @Composable () -> Unit = {
        Box(
            Modifier
                // SRC-18: under the glow focus style, the glow around the bar while it is focused.
                .tanreiFocusGlow(focused && enabled, tokens.containerShape)
                .tanreiElevation(elevation, shape)
                // SRC-18: the focused edge, inside the bar's edge, is its focus indicator; no ring around it.
                .tanreiContainer(shape, containerColor = { containerColor.value }, outlineColor = outlineColor, outlineWidth = outlineWidth, ripple = ripple),
        ) { view() }
    }
    val glyph = system.icon.glyph(tokens.leadingIconSize, selected = false)
    val leadingContent: @Composable () -> Unit = {
        if (leading != null) {
            CompositionLocalProvider(LocalTanreiJoinedRow provides row, content = leading)
        } else {
            // SRC-2: the search glyph, decorative.
            TanreiNamedGlyph("search", glyph, tokens.leadingIconSize, glyphColor)
        }
    }
    val inputContent: @Composable () -> Unit = {
        TanreiSearchInput(
            state = state,
            focusRequester = state.barFocus,
            source = inputSource,
            label = label,
            placeholder = placeholder,
            inputColor = inputColor,
            placeholderColor = placeholderColor,
            caretColor = caretColor,
            header = false,
        )
    }
    val clearContent: @Composable () -> Unit = {
        if (showsClear) {
            CompositionLocalProvider(LocalTanreiJoinedRow provides row) {
                TanreiSearchClearButton(clearLabel, clearSize) {
                    state.clear()
                    state.barFocus.requestFocus()
                }
            }
        }
    }
    val trailingContent: @Composable () -> Unit = {
        if (trailing != null) CompositionLocalProvider(LocalTanreiJoinedRow provides row, content = trailing)
    }
    TanreiSearchRow(
        modifier = barModifier,
        state = state,
        leadingIsButton = leading != null,
        minHeight = tokens.containerHeight,
        target = system.measure.targetTouch,
        paddingStart = if (leading != null) tokens.containerPaddingInlineWithButton else tokens.containerPaddingInline,
        paddingEnd = if (showsClear || trailing != null) tokens.containerPaddingInlineWithButton else tokens.containerPaddingInline,
        gap = tokens.containerGap,
        background = background,
        leading = leadingContent,
        input = inputContent,
        clear = clearContent,
        trailing = trailingContent,
    )
}

/**
 * SRC-1 / SRC-9: a row of the search — the bar, or the full-screen header — laid out by its elements' VISIBLE sizes: the
 * leading element [paddingStart] from the start, the input taking the remaining width, then the clear button and the
 * trailing slot, [gap] apart, the last [paddingEnd] from the end, each centred on the row's middle. The row is at least
 * [minHeight] high and grows to hold one line of the input (SRC-28); its hit area reaches [target] above and below
 * (SRC-22). The icon buttons are the product's (and the clear button) through the button group's internal channel: each
 * placed by its visible bounds, its hit area reaching toward a neighbour no further than the middle of the gap.
 * [background] is drawn behind, as tall as the row's visible height.
 */
@Composable
private fun TanreiSearchRow(
    modifier: Modifier,
    state: TanreiSearchState?,
    leadingIsButton: Boolean,
    minHeight: Dp,
    target: Dp,
    paddingStart: Dp,
    paddingEnd: Dp,
    gap: Dp,
    background: @Composable () -> Unit,
    leading: @Composable () -> Unit,
    input: @Composable () -> Unit,
    clear: @Composable () -> Unit,
    trailing: @Composable () -> Unit,
) {
    val debuggable = isTanreiDebuggable()
    Layout(contents = listOf(background, leading, input, clear, trailing), modifier = modifier) { (backgrounds, leadings, inputs, clears, trailings), constraints ->
        // SRC-27: more than two trailing elements are still laid out, and reported.
        if (debuggable && trailings.size > 2) TanreiDiagnostics.report("search/trailing", "TanreiSearch: its trailing slot holds ${trailings.size} elements; it holds up to two icon buttons.")
        val width = if (constraints.hasBoundedWidth) constraints.maxWidth else constraints.minWidth
        val gapPx = gap.roundToPx()
        val startPx = paddingStart.roundToPx()
        val endPx = paddingEnd.roundToPx()
        val targetPx = target.roundToPx()

        // The elements beside the input, in order, with their visible widths.
        val sides = listOf(leadings, clears, trailings)
        val visible = sides.map { group -> group.map { m -> visibleWidth(m) } }
        val leadingWidth = visible[0].sum()
        val afterWidths = visible[1] + visible[2]
        val afterMeasurables = clears + trailings
        val inputWidth = (width - startPx - leadingWidth - (if (leadings.isNotEmpty()) gapPx else 0) - afterWidths.sum() - afterWidths.size * gapPx - endPx).coerceAtLeast(0)

        // Reaches: toward the row's ends as far as the padding, toward a neighbour half the gap.
        leadings.forEach { m -> (m.parentData as? TanreiJoinedItem)?.let { it.reachStart = startPx; it.reachEnd = gapPx / 2 } }
        afterMeasurables.forEachIndexed { i, m ->
            (m.parentData as? TanreiJoinedItem)?.let {
                it.reachStart = gapPx - gapPx / 2
                it.reachEnd = if (i == afterMeasurables.size - 1) endPx else gapPx / 2
            }
        }
        val leadingPlaceables = leadings.map { it.measure(Constraints()) }
        val inputPlaceable = inputs.firstOrNull()?.measure(Constraints(minWidth = inputWidth, maxWidth = inputWidth))
        val afterPlaceables = afterMeasurables.map { it.measure(Constraints()) }
        val visibleHeight = maxOf(minHeight.roundToPx(), inputPlaceable?.height ?: 0)
        val height = maxOf(visibleHeight, targetPx, (leadingPlaceables + afterPlaceables).maxOfOrNull { it.height } ?: 0)
        val backgroundPlaceable = backgrounds.firstOrNull()?.measure(Constraints.fixed(width, visibleHeight))
        state?.barVisibleHeight = visibleHeight

        layout(width, height) {
            state?.buttons?.clear()
            // The buttons' regions, in this layout's coordinates (mirrored in right-to-left, as placeRelative does).
            fun record(x: Int, placeable: Placeable) {
                val left = if (layoutDirection == LayoutDirection.Rtl) width - x - placeable.width else x
                state?.buttons?.add(IntRect(left, (height - placeable.height) / 2, left + placeable.width, (height + placeable.height) / 2))
            }
            backgroundPlaceable?.placeRelative(0, (height - visibleHeight) / 2)
            var x = startPx
            leadingPlaceables.forEachIndexed { i, p ->
                val start = x
                x = placeVisible(p, leadings[i], visible[0][i], x, height, targetPx)
                if (leadingIsButton) record(start - reachBefore(leadings[i], visible[0][i], targetPx), p)
            }
            if (leadings.isNotEmpty()) x += gapPx
            inputPlaceable?.let {
                it.placeRelative(x, (height - it.height) / 2)
                x += it.width
            }
            afterPlaceables.forEachIndexed { i, p ->
                x += gapPx
                val start = x
                x = placeVisible(p, afterMeasurables[i], afterWidths[i], x, height, targetPx)
                record(start - reachBefore(afterMeasurables[i], afterWidths[i], targetPx), p)
            }
        }
    }
}

/** An element's visible width: a Tanrei button's container (its intrinsic size records it), or the element's own. */
private fun visibleWidth(measurable: Measurable): Int {
    val whole = measurable.maxIntrinsicWidth(Constraints.Infinity)
    return (measurable.parentData as? TanreiJoinedItem)?.visualMaxWidth ?: whole
}

/** Places [placeable] so that its visible bounds start at [x]; returns where they end. */
private fun Placeable.PlacementScope.placeVisible(placeable: Placeable, measurable: Measurable, visible: Int, x: Int, height: Int, target: Int): Int {
    placeable.placeRelative(x - reachBefore(measurable, visible, target), (height - placeable.height) / 2)
    return x + visible
}

/** How far an element's hit area reaches before its visible bounds (a Tanrei button's, as its own layout decides it). */
private fun reachBefore(measurable: Measurable, visible: Int, target: Int): Int {
    val item = measurable.parentData as? TanreiJoinedItem ?: return 0
    return tanreiJoinedReach(visible, target, item.reachStart, item.reachEnd).first
}

/** SRC-10: the clear button — a standard Tanrei icon button showing close, named by [clearLabel]. */
@Composable
private fun TanreiSearchClearButton(clearLabel: String, size: TanreiIconButtonSize, onClick: () -> Unit) {
    val system = TanreiTheme.tokens
    val iconSize = system.iconButton.sizes[size].iconSize
    TanreiIconButton(onClick = onClick, contentDescription = clearLabel, variant = TanreiIconButtonVariant.Standard, size = size) {
        TanreiSearchGlyph(TanreiDrawnGlyphKind.Close, iconSize)
    }
}

/** A glyph the search draws itself inside an icon button: from the icon font when installed, else a vector (the chip's close). */
@Composable
private fun TanreiSearchGlyph(kind: TanreiDrawnGlyphKind, box: Dp) {
    val glyph = LocalTanreiIconGlyph.current
    val color = LocalTanreiContentColor.current
    val standIn = LocalTanreiGlyphStandIn.current
    if (standIn != null) standIn(kind.ligature) else TanreiDrawnGlyph(kind, glyph, box, color, TanreiTheme.tokens.measure.borderThick) { 1f }
}

/**
 * The input (SRC-3, SRC-4, SRC-12 … SRC-14, SRC-24): the platform's own text element, one line, scrolling sideways; the
 * value in the input style and color, the placeholder while empty (never the name), the caret in the caret color and the
 * text field's selection color. It hears the keys the search answers — Down and Up Arrow, Enter, Escape and Tab — before
 * the text element does.
 */
@Composable
private fun TanreiSearchInput(
    state: TanreiSearchState,
    focusRequester: FocusRequester,
    source: MutableInteractionSource,
    label: String,
    placeholder: String,
    inputColor: Color,
    placeholderColor: Color,
    caretColor: Color,
    header: Boolean,
) {
    val system = TanreiTheme.tokens
    val tokens = system.search
    // The field's own value with its selection; the text is the search's value.
    var field by remember { mutableStateOf(TextFieldValue(state.value, TextRange(state.value.length))) }
    if (field.text != state.value) field = TextFieldValue(state.value, TextRange(state.value.length))
    val style = tokens.inputTypescale.toTextStyle().copy(color = inputColor)
    val enabled = state.enabled
    var hadFocus by remember { mutableStateOf(false) }
    val selectionColors = TextSelectionColors(handleColor = caretColor, backgroundColor = system.textField.selectionColor.color)
    CompositionLocalProvider(LocalTextSelectionColors provides selectionColors) {
        BasicTextField(
            value = field,
            onValueChange = { next ->
                val moved = next.selection != field.selection
                field = next
                if (next.text != state.value) state.edit(next.text) else if (moved) state.active = null
            },
            modifier = Modifier
                .focusRequester(focusRequester)
                // SRC-24: a search field named by label — never by the placeholder.
                .semantics { if (label.isNotBlank()) contentDescription = label }
                .onFocusChanged { focus ->
                    // SRC-6: focus moving OUT of a docked search closes its view (not the first report, which only says the
                    // input has no focus yet).
                    val lost = hadFocus && !focus.isFocused
                    hadFocus = focus.isFocused
                    if (lost && !header && !state.fullScreen && state.isOpen && !state.barPointerDown) state.collapse(TanreiSearchCloseReason.FocusOut)
                }
                .onPreviewKeyEvent { event ->
                    if (event.type != KeyEventType.KeyDown || !enabled) return@onPreviewKeyEvent false
                    when (event.key) {
                        Key.DirectionDown -> {
                            if (!state.isOpen) state.expand() else state.next()
                            true
                        }
                        Key.DirectionUp -> {
                            if (state.isOpen && state.active != null) {
                                state.previous()
                                true
                            } else {
                                false
                            }
                        }
                        Key.Enter, Key.NumPadEnter -> {
                            state.enter()
                            true
                        }
                        Key.Escape -> when {
                            state.isOpen -> {
                                state.collapse(TanreiSearchCloseReason.Escape)
                                true
                            }
                            state.value.isNotEmpty() -> {
                                state.clear()
                                true
                            }
                            else -> false
                        }
                        Key.Tab -> {
                            // SRC-6: Tab closes a docked view and moves on as it would have.
                            if (!state.fullScreen && state.isOpen) state.collapse(TanreiSearchCloseReason.Tab)
                            false
                        }
                        else -> false
                    }
                },
            enabled = enabled,
            textStyle = style,
            // SRC-4 / TXF-20: a general keyboard whose action key reads as search.
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text, imeAction = ImeAction.Search),
            keyboardActions = KeyboardActions(onSearch = { state.enter() }),
            singleLine = true,
            interactionSource = source,
            cursorBrush = SolidColor(caretColor),
            decorationBox = { inner ->
                Box(contentAlignment = Alignment.CenterStart) {
                    if (field.text.isEmpty() && placeholder.isNotEmpty()) {
                        // Never the name: hidden from assistive technology.
                        TanreiText(placeholder, color = placeholderColor, style = style.copy(color = placeholderColor), modifier = Modifier.clearAndSetSemantics {})
                    }
                    inner()
                }
            },
        )
    }
}

// ── The docked view ─────────────────────────────────────────────────────────

/**
 * SRC-7 / SRC-8 / SRC-23: while open, the view in a popup that never takes focus — the input keeps it — `viewOffset`
 * below the bar (above it when there is more room there and not enough below, the on-screen keyboard counted), as wide
 * as the bar, its height limited to the room and its content scrolling; fading in and growing from the edge that faces
 * the bar, fading out. A press outside the bar and the view asks to close it (outside); the press also reaches what is
 * under it, as the popup does not take touches it is not on.
 */
@Composable
private fun TanreiSearchDockedView(state: TanreiSearchState, open: Boolean, label: String, content: @Composable () -> Unit) {
    val tokens = TanreiTheme.tokens.search
    val transition = remember { MutableTransitionState(false) }
    transition.targetState = open
    if (!transition.currentState && !transition.targetState) return
    val shown = rememberTanreiSearchShown(transition, tokens)
    val density = LocalDensity.current
    val direction = LocalLayoutDirection.current
    val ime = WindowInsets.ime.getBottom(density)
    val placement = remember { TanreiSearchViewPlacement() }
    val provider = remember(tokens.viewOffset, tokens.viewViewportMargin, density, ime, direction) {
        with(density) { TanreiSearchViewPosition(tokens.viewOffset.roundToPx(), tokens.viewViewportMargin.roundToPx(), ime, placement) }
    }
    val scope = rememberCoroutineScope()
    var barWidth by remember { mutableIntStateOf(0) }
    Box(Modifier.fillMaxSize().onSizeChanged { barWidth = it.width })
    Popup(
        popupPositionProvider = provider,
        onDismissRequest = {
            // SRC-6 (outside): a press on the bar is the bar's, not outside — heard in the same frame or the next.
            val before = state.barDowns
            scope.launch {
                withFrameNanos { }
                if (!state.barPointerDown && state.barDowns == before) state.collapse(TanreiSearchCloseReason.Outside)
            }
        },
        properties = PopupProperties(focusable = false, dismissOnBackPress = false, dismissOnClickOutside = true),
    ) {
        val opening = transition.targetState
        TanreiSearchViewSurface(
            state = state,
            label = label,
            maxHeight = placement.room,
            modifier = Modifier
                .width(with(density) { barWidth.toDp() })
                .graphicsLayer {
                    val value = shown.value.coerceIn(0f, 1f)
                    alpha = value
                    scaleY = if (opening) value else 1f
                    transformOrigin = TransformOrigin(pivotFractionX = 0.5f, pivotFractionY = if (placement.below) 0f else 1f)
                },
            content = content,
        )
    }
}

/** The side the docked view took and the room it has (SRC-7). */
@Stable
private class TanreiSearchViewPlacement {
    var below: Boolean = true
    var room: Int by mutableIntStateOf(Int.MAX_VALUE)
}

/** SRC-7's placement: the menu's rule (below, flipped above when that side has more room), the keyboard taken off the window. */
private class TanreiSearchViewPosition(private val offset: Int, private val margin: Int, private val ime: Int, private val placement: TanreiSearchViewPlacement) : PopupPositionProvider {
    override fun calculatePosition(anchorBounds: IntRect, windowSize: IntSize, layoutDirection: LayoutDirection, popupContentSize: IntSize): IntOffset {
        val window = IntSize(windowSize.width, (windowSize.height - ime).coerceAtLeast(0))
        val resolved = tanreiMenuPosition(TanreiMenuPlacement.BottomStart, anchorBounds, window, layoutDirection, popupContentSize, offset, margin)
        placement.below = resolved.below
        val room = (if (resolved.below) window.height - margin - (anchorBounds.bottom + offset) else anchorBounds.top - offset - margin).coerceAtLeast(0)
        if (placement.room != room) placement.room = room
        // As wide as the bar and aligned with it.
        return IntOffset(anchorBounds.left, resolved.offset.y)
    }
}

/** SRC-23: how far the view is shown, 0 to 1 — over the open motion while opening, the close motion while closing; at once where motion is reduced. */
@Composable
internal fun rememberTanreiSearchShown(state: MutableTransitionState<Boolean>, tokens: TanreiSearchTokens): State<Float> {
    val transition = rememberTransition(state, label = "search view")
    return transition.animateFloat(
        transitionSpec = { if (targetState) tanreiTween(tokens.motionOpenDuration, tokens.motionOpenEasing) else tanreiTween(tokens.motionCloseDuration, tokens.motionCloseEasing) },
        label = "shown",
    ) { if (it) 1f else 0f }
}

/**
 * Tests: the bar with the open docked view under it, `viewOffset` below the bar's visible bottom edge, drawn in the
 * search's own layout. The layout starts at the bar's visible top edge (its touch target reaches past it).
 */
@Composable
private fun TanreiSearchDockedInPlace(state: TanreiSearchState, modifier: Modifier, offset: Dp, bar: @Composable () -> Unit, view: @Composable () -> Unit) {
    Layout(contents = listOf(bar, view), modifier = modifier) { (bars, views), constraints ->
        val width = if (constraints.hasBoundedWidth) constraints.maxWidth else constraints.minWidth
        val barPlaceable = bars.first().measure(Constraints(minWidth = width, maxWidth = width))
        val visible = state.barVisibleHeight.coerceAtMost(barPlaceable.height)
        val overhang = (barPlaceable.height - visible) / 2
        val gap = offset.roundToPx()
        // The room under the bar that the box it is drawn in leaves (a stage is bounded).
        val room = if (constraints.hasBoundedHeight) (constraints.maxHeight - visible - gap).coerceAtLeast(0) else Constraints.Infinity
        val viewPlaceable = views.firstOrNull()?.measure(Constraints(minWidth = width, maxWidth = width, maxHeight = room))
        layout(width, visible + (viewPlaceable?.let { gap + it.height } ?: 0)) {
            barPlaceable.placeRelative(0, -overhang)
            viewPlaceable?.placeRelative(0, visible + gap)
        }
    }
}

/**
 * SRC-7 / SRC-16 / SRC-29: the view's surface — `viewContainerColor` at `viewContainerElevation`, rounded by
 * `viewContainerShape` eased by corner smoothing, its content clipped to it and inset by the view's padding, scrolling
 * beyond [maxHeight] pixels. The suggestions come first as full-width rows; the product's content after them is inset by
 * the rows' padding and handed the headline color and the body style. With no content it draws nothing (and the search
 * stays expanded).
 */
@Composable
private fun TanreiSearchViewSurface(state: TanreiSearchState, label: String, maxHeight: Int, modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    val system = TanreiTheme.tokens
    val tokens = system.search
    val smoothing = system.shape.cornerSmoothing
    val shape = remember(tokens.viewContainerShape, smoothing) { tanreiContainerShape(tokens.viewContainerShape, smoothing) }
    val color = tokens.viewContainerColor.color
    val view = remember(state) { TanreiSearchView(state) }
    val scroll = rememberScrollState()
    val count = state.suggestions.size
    TanreiReportSuggestionValues(state)
    Layout(
        modifier = modifier
            .semantics { if (label.isNotBlank()) paneTitle = label }
            .tanreiElevation(tokens.viewContainerElevation, shape)
            .clip(shape)
            .drawBehind { if (color.isDrawn) drawRect(color) },
        content = {
            Box(Modifier.verticalScroll(scroll).semantics { collectionInfo = CollectionInfo(rowCount = count, columnCount = 1) }) {
                CompositionLocalProvider(
                    LocalTanreiSearchView provides view,
                    LocalTanreiContentColor provides tokens.conditions.standard.enabled.suggestionHeadlineColor.color,
                    LocalTanreiTextStyle provides system.typescale.body.toTextStyle(),
                ) {
                    TanreiSearchViewColumn(inset = tokens.suggestionContainerPaddingInline, content = content)
                }
            }
        },
    ) { measurables, constraints ->
        val padInline = tokens.viewPaddingInline.roundToPx()
        val padBlock = tokens.viewPaddingBlock.roundToPx()
        val width = if (constraints.hasBoundedWidth) constraints.maxWidth else constraints.minWidth
        val limit = minOf(maxHeight, if (constraints.hasBoundedHeight) constraints.maxHeight else Int.MAX_VALUE)
        val room = if (limit == Int.MAX_VALUE) Constraints.Infinity else (limit - 2 * padBlock).coerceAtLeast(0)
        val placeable = measurables.first().measure(Constraints(minWidth = (width - 2 * padInline).coerceAtLeast(0), maxWidth = (width - 2 * padInline).coerceAtLeast(0), maxHeight = room))
        // No content: no view.
        if (placeable.height == 0) return@Layout layout(0, 0) {}
        layout(width, placeable.height + 2 * padBlock) { placeable.placeRelative(padInline, padBlock) }
    }
}

/** The view's children in a column: suggestion rows full width, the product's content inset by [inset] at the sides (SRC-29). */
@Composable
private fun TanreiSearchViewColumn(inset: Dp, content: @Composable () -> Unit) {
    Layout(content = content) { measurables, constraints ->
        val width = constraints.maxWidth
        val insetPx = inset.roundToPx()
        val placeables = measurables.map { m ->
            val row = m.layoutId == SuggestionRow
            val w = if (row) width else (width - 2 * insetPx).coerceAtLeast(0)
            (if (row) 0 else insetPx) to m.measure(Constraints(minWidth = if (row) w else 0, maxWidth = w))
        }
        val height = placeables.sumOf { it.second.height }
        layout(width, height) {
            var y = 0
            placeables.forEach { (x, p) ->
                p.placeRelative(x, y)
                y += p.height
            }
        }
    }
}

/** SRC-27: a suggestion whose value repeats another's, reported once, after the rows registered. */
@Composable
private fun TanreiReportSuggestionValues(state: TanreiSearchState) {
    if (!isTanreiDebuggable()) return
    LaunchedEffect(state) {
        snapshotFlow { state.suggestions.map { it.value } }.collect { values ->
            values.filter { it.isNotEmpty() }.groupingBy { it }.eachCount().filterValues { it > 1 }.keys.forEach {
                TanreiDiagnostics.report("search/value/$it", "TanreiSearch: the suggestion value \"$it\" is given to more than one suggestion; select carries the same value for each.")
            }
        }
    }
}

/** Debuggable apps only (SRC-27): one report per message and composition site. */
@Composable
private fun TanreiReportSearchProblem(message: String) {
    if (!isTanreiDebuggable()) return
    remember(message) { TanreiDiagnostics.reporter(message) }
}

// ── The full-screen view ────────────────────────────────────────────────────

/**
 * SRC-9 / SRC-23: while open, the full-screen view in a dialog window — modal: everything behind is hidden from assistive
 * technology, focus moves to the header's input (the caret at the end) and stays in the view; the platform's back asks to
 * close (back). When it closes, focus returns to the bar's input, which does not open it again (SRC-5).
 */
@Composable
private fun TanreiSearchFullScreen(state: TanreiSearchState, open: Boolean, label: String, placeholder: String, clearLabel: String, backLabel: String, content: @Composable () -> Unit) {
    val tokens = TanreiTheme.tokens.search
    val transition = remember { MutableTransitionState(false) }
    transition.targetState = open
    val gone = !transition.currentState && !transition.targetState
    // Focus back to the bar once the view has gone.
    var wasOpen by remember { mutableStateOf(false) }
    LaunchedEffect(open) {
        if (open) wasOpen = true else if (wasOpen) {
            wasOpen = false
            withFrameNanos { }
            state.barFocus.requestFocus()
        }
    }
    if (gone) return
    val shown = rememberTanreiSearchShown(transition, tokens)
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
        onDismissRequest = { state.collapse(TanreiSearchCloseReason.Back) },
        properties = DialogProperties(dismissOnBackPress = true, dismissOnClickOutside = false, usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
    ) {
        // The window's own dim and animation are off: the motion is Tanrei's.
        val window = (LocalView.current.parent as? DialogWindowProvider)?.window
        SideEffect {
            window?.setDimAmount(0f)
            window?.setWindowAnimations(0)
        }
        TanreiSearchFullScreenContent(state, label, placeholder, clearLabel, backLabel, focusInput = true, shown = { shown.value }, content = content)
    }
}

/**
 * SRC-9 / SRC-11: the full-screen view's content, filling what it is given: `viewContainerColor` to every edge, and inside
 * the safe area and above the keyboard the header — the back button, the input, the clear button — at least
 * `headerHeight` high, a `dividerThickness` line in `dividerColor` under it, then the suggestions and the product's
 * content, scrolling. [focusInput]: the header's input takes focus on the first frame.
 */
@Composable
private fun TanreiSearchFullScreenContent(
    state: TanreiSearchState,
    label: String,
    placeholder: String,
    clearLabel: String,
    backLabel: String,
    focusInput: Boolean,
    shown: () -> Float,
    content: @Composable () -> Unit,
) {
    val system = TanreiTheme.tokens
    val tokens = system.search
    val look = tokens.conditions.standard.enabled
    val color = tokens.viewContainerColor.color
    val dividerColor = tokens.dividerColor.color
    val inputSource = remember { MutableInteractionSource() }
    val focusedInput by inputSource.collectIsFocusedAsState()
    val focusedLook = if (focusedInput) tokens.conditions.standard.focused else tokens.conditions.standard.enabled
    val row = remember(system.measure.targetTouch) { TanreiJoinedRow(connected = false, innerRadius = Dp.Hairline, minWidth = system.measure.targetTouch) }
    if (focusInput) {
        LaunchedEffect(Unit) {
            withFrameNanos { }
            state.headerFocus.requestFocus()
        }
    }
    val view = remember(state) { TanreiSearchView(state) }
    val direction = LocalLayoutDirection.current
    val count = state.suggestions.size
    TanreiReportSuggestionValues(state)
    Box(
        Modifier
            .fillMaxSize()
            // SRC-24: a modal dialog named by label.
            .semantics { if (label.isNotBlank()) paneTitle = label }
            .graphicsLayer { alpha = shown().coerceIn(0f, 1f) }
            .drawBehind { if (color.isDrawn) drawRect(color) }
            .onPreviewKeyEvent { event ->
                if (event.type == KeyEventType.KeyDown && event.key == Key.Escape && state.isOpen) {
                    state.collapse(TanreiSearchCloseReason.Escape)
                    true
                } else {
                    false
                }
            },
    ) {
        Column(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing.union(WindowInsets.ime))) {
            CompositionLocalProvider(LocalTanreiJoinedRow provides row) {
                TanreiSearchRow(
                    modifier = Modifier.fillMaxWidth(),
                    state = null,
                    leadingIsButton = true,
                    minHeight = tokens.headerHeight,
                    target = system.measure.targetTouch,
                    paddingStart = tokens.headerPaddingInline,
                    paddingEnd = tokens.headerPaddingInline,
                    gap = tokens.containerGap,
                    background = {},
                    leading = {
                        // SRC-11: back, mirrored in right-to-left layouts.
                        val iconSize = system.iconButton.sizes.medium.iconSize
                        TanreiIconButton(onClick = { state.collapse(TanreiSearchCloseReason.Back) }, contentDescription = backLabel, variant = TanreiIconButtonVariant.Standard, size = TanreiIconButtonSize.Medium) {
                            Box(Modifier.size(iconSize).graphicsLayer { if (direction == LayoutDirection.Rtl) scaleX = -1f }) {
                                TanreiNamedGlyph("arrow_back", LocalTanreiIconGlyph.current, iconSize, LocalTanreiContentColor.current)
                            }
                        }
                    },
                    input = {
                        TanreiSearchInput(
                            state = state,
                            focusRequester = state.headerFocus,
                            source = inputSource,
                            label = label,
                            placeholder = placeholder,
                            inputColor = focusedLook.inputColor.color,
                            placeholderColor = look.placeholderColor.color,
                            caretColor = focusedLook.caretColor.color,
                            header = true,
                        )
                    },
                    clear = {
                        if (state.enabled && state.value.isNotEmpty()) {
                            TanreiSearchClearButton(clearLabel, TanreiIconButtonSize.Medium) {
                                state.clear()
                                state.headerFocus.requestFocus()
                            }
                        }
                    },
                    trailing = {},
                )
            }
            Box(Modifier.fillMaxWidth().height(tokens.dividerThickness).drawBehind { if (dividerColor.isDrawn) drawRect(dividerColor) }.clearAndSetSemantics {})
            Box(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).semantics { collectionInfo = CollectionInfo(rowCount = count, columnCount = 1) }) {
                CompositionLocalProvider(
                    LocalTanreiSearchView provides view,
                    LocalTanreiContentColor provides tokens.conditions.standard.enabled.suggestionHeadlineColor.color,
                    LocalTanreiTextStyle provides system.typescale.body.toTextStyle(),
                ) {
                    TanreiSearchViewColumn(inset = tokens.suggestionContainerPaddingInline, content = content)
                }
            }
        }
    }
}
