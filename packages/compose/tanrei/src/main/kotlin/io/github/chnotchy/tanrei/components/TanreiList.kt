package io.github.chnotchy.tanrei.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.Placeable
import androidx.compose.ui.layout.layoutId
import androidx.compose.ui.semantics.CollectionInfo
import androidx.compose.ui.semantics.CollectionItemInfo
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.collectionInfo
import androidx.compose.ui.semantics.collectionItemInfo
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.isTraversalGroup
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.max
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.primitives.TanreiDrawnStates
import io.github.chnotchy.tanrei.primitives.TanreiReportInvalidValue
import io.github.chnotchy.tanrei.primitives.TanreiReportMissingName
import io.github.chnotchy.tanrei.primitives.TanreiRovingFocus
import io.github.chnotchy.tanrei.primitives.TanreiStateMotion
import io.github.chnotchy.tanrei.primitives.WithoutTanreiAnchorDescription
import io.github.chnotchy.tanrei.primitives.animateTanreiColorAsState
import io.github.chnotchy.tanrei.primitives.collectTanreiInteraction
import io.github.chnotchy.tanrei.primitives.drawnStates
import io.github.chnotchy.tanrei.primitives.isDrawn
import io.github.chnotchy.tanrei.primitives.isTanreiDebuggable
import io.github.chnotchy.tanrei.primitives.rememberTanreiRipple
import io.github.chnotchy.tanrei.primitives.rememberTanreiRovingEntry
import io.github.chnotchy.tanrei.primitives.rememberTanreiRovingFocus
import io.github.chnotchy.tanrei.primitives.rememberTanreiSelectionMotion
import io.github.chnotchy.tanrei.primitives.tanreiAnchorDescription
import io.github.chnotchy.tanrei.primitives.tanreiCheckPath
import io.github.chnotchy.tanrei.primitives.tanreiContainer
import io.github.chnotchy.tanrei.primitives.tanreiContainerShape
import io.github.chnotchy.tanrei.primitives.tanreiFocusRing
import io.github.chnotchy.tanrei.primitives.tanreiGroupOpacity
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
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiListCondition
import io.github.chnotchy.tanrei.tokens.TanreiListTokens

/*
 * `specs/list.spec.json` (LST-1…26) on Compose, as `platforms.compose` maps it: `TanreiList(selectionMode,
 * contentDescription, selectedValue | selectedValues, onSelectionChange) { TanreiListItem(…) }`. The list is the column
 * and the semantics — a list, or a listbox named by its label — and the keyboard (one Tab stop, the arrow keys, Home,
 * End, type-ahead); each `TanreiListItem` is one row (the item kind `list-item`) and finds its list through a
 * composition local, so it may also be emitted by a lazy column inside the list. Every design value comes from the
 * current design system's [TanreiListTokens] (`TanreiTheme.tokens.list`); an interactive item or an option is
 * [TanreiButton]'s chain — press and press-hold, pressed feedback and ripple, keyboard focus ring (drawn inside the row),
 * container, corner smoothing — with the list's tokens, drawn from the condition (`unselected`, `selected`) and state
 * it is in.
 */

/**
 * The spec's `selection`: whether people choose items. [None] makes a list of static and interactive items; [Single]
 * and [Multiple] make the list a listbox of options. A closed set: every value the spec defines is here, so no unknown
 * one can be passed (LST-7).
 */
public enum class TanreiListSelectionMode { None, Single, Multiple }

/**
 * The spec's `leadingMedia`: how the item's `leadingContent` is framed — [Avatar] a round box of `avatarSize`, [Image] a
 * rounded square of `imageSize`, or [None] (not drawn). Closed, like [TanreiListSelectionMode] (LST-7).
 */
public enum class TanreiListLeadingMedia { None, Avatar, Image }

/** What a [TanreiListItem] learns from the list around it. */
private class TanreiListContext(
    val selectionMode: TanreiListSelectionMode,
    val selectedValue: String?,
    val selectedValues: Set<String>,
    val onSelectionChange: (Set<String>) -> Unit,
    val roving: TanreiRovingFocus,
) {
    fun isSelected(value: String): Boolean = when (selectionMode) {
        TanreiListSelectionMode.None -> false
        TanreiListSelectionMode.Single -> selectedValue != null && selectedValue == value
        TanreiListSelectionMode.Multiple -> value in selectedValues
    }

    /**
     * LST-13: a single choice moves to the option — never cleared by the selected option itself, which changes nothing;
     * LST-14: a multiple choice switches it. Each change is ONE call of [onSelectionChange] with the new selection.
     */
    fun activate(value: String) {
        when (selectionMode) {
            TanreiListSelectionMode.None -> Unit
            TanreiListSelectionMode.Single -> if (selectedValue != value) onSelectionChange(setOf(value))
            TanreiListSelectionMode.Multiple -> onSelectionChange(if (value in selectedValues) selectedValues - value else selectedValues + value)
        }
    }
}

private val LocalTanreiList = compositionLocalOf<TanreiListContext?> { null }

/**
 * Shows a column of related items that people read, open one by one, or choose from. Implements `specs/list.spec.json`.
 * The list draws nothing of its own and adds no space around its items: place it on a surface, or in a card. It does
 * not scroll — put it in the screen's own scroll container.
 *
 * @param modifier applied to the column.
 * @param selectionMode the spec's `selection`: [TanreiListSelectionMode.None] (default) for rows that show or open
 *   things — static items, and interactive ones (`onClick`); `Single` or `Multiple` for a listbox whose every item is an
 *   option, chosen by its `value` (an item's `onClick` is then ignored — LST-12).
 * @param contentDescription the spec's `label`: what the items are. Required for a listbox — a blank one still renders,
 *   and a debuggable app reports it (LST-23).
 * @param selectedValue the spec's `value` while [selectionMode] is `Single`: the value of the selected option, null for
 *   none. The caller keeps it and moves it from [onSelectionChange].
 * @param selectedValues the spec's `values` while [selectionMode] is `Multiple`: the values of the selected options.
 * @param onSelectionChange the spec's `change`: the user chose an option; receives the new selection — the chosen value
 *   alone while `Single`, the new set of values while `Multiple`. Called once per change; never for the already
 *   selected option of a single choice (LST-13, LST-14).
 * @param content the `TanreiListItem`s, in order.
 */
@Composable
public fun TanreiList(
    modifier: Modifier = Modifier,
    selectionMode: TanreiListSelectionMode = TanreiListSelectionMode.None,
    contentDescription: String = "",
    selectedValue: String? = null,
    selectedValues: Set<String> = emptySet(),
    onSelectionChange: (Set<String>) -> Unit = {},
    content: @Composable () -> Unit,
) {
    val roving = rememberTanreiRovingFocus(wrap = false)
    val selectable = selectionMode != TanreiListSelectionMode.None
    // LST-23: a listbox without a label still renders; reported in debuggable apps.
    if (selectable && contentDescription.isBlank()) TanreiReportMissingName("TanreiList", "contentDescription", what = "a listbox without a label")
    // LST-26: selected values that name no option, and options whose value is empty or repeated, are reported.
    if (selectable) TanreiReportListSelection(roving, selectionMode, selectedValue, selectedValues)

    val change by rememberUpdatedState(onSelectionChange)
    val context = remember(selectionMode, selectedValue, selectedValues, roving) {
        TanreiListContext(selectionMode, selectedValue, selectedValues, { change(it) }, roving)
    }
    val label = contentDescription.takeUnless { it.isBlank() }
    val count = roving.size
    Column(
        modifier
            // LST-12: a list (or a listbox, a selectable group) of `count` rows, named by its label.
            .semantics {
                collectionInfo = CollectionInfo(rowCount = count, columnCount = 1)
                if (label != null) {
                    this.contentDescription = label
                    isTraversalGroup = true
                }
            }
            .then(if (selectable) Modifier.selectableGroup() else Modifier)
            // LST-15: the arrow keys, Home, End and type-ahead, heard from the focused item.
            .tanreiRovingKeys(roving),
    ) {
        CompositionLocalProvider(LocalTanreiList provides context, content = content)
    }
}

/** The kind of row an item is (three kinds of the one item kind): chosen by the list's selection and `onClick`. */
private enum class TanreiListItemKind { Static, Interactive, Option }

/**
 * One row of a [TanreiList] (the spec's item kind `list-item`): a [headline] with an optional [overline],
 * [supportingText], leading icon or media and trailing text, icon or control. What it is follows from the list and
 * [onClick] (LST-11, LST-12):
 * - in a list whose `selectionMode` is `None`, without [onClick]: a STATIC row — not focusable, no state answer, its
 *   trailing control keeping its own semantics and focus stop;
 * - with [onClick]: an INTERACTIVE row, one `Role.Button` element named by its headline;
 * - in a listbox (`Single` / `Multiple`): an OPTION, selectable, chosen by [value].
 *
 * **The slots of an interactive item or an option must hold no interactive element** (LST-24): the row is one element to
 * assistive technology, and a press on a nested control would also activate the row. Compose cannot inspect slot
 * content, so this is not checked.
 *
 * @param headline the item's main text and its accessible name; wraps rather than truncating. An empty one still renders,
 *   and a debuggable app reports it (LST-23).
 * @param modifier applied to the row, which fills the list's width.
 * @param value identifies an option: the list's `selectedValue` / `selectedValues` select the option whose value they
 *   hold, and its `onSelectionChange` carries it. Unique within the list; unused by a static or interactive item.
 * @param overline a short line above the headline; wraps.
 * @param supportingText text below the headline: one line of it makes a two-line item, two or more a three-line item.
 * @param supportingMaxLines the lines of [supportingText] shown before it ends with an ellipsis; 0 (default) shows all
 *   of it. Its full text still reaches assistive technology. A negative number draws as 0 and is reported.
 * @param trailingText a short value at the end of the row (a count, a time); wraps.
 * @param leadingMedia how [leadingContent] is framed: [TanreiListLeadingMedia.Avatar] or `Image`; `None` (default) does
 *   not draw it. While it is `Avatar` or `Image`, [leadingIcon] is not drawn (LST-20).
 * @param enabled the Compose idiom for the spec's `disabled` (inverse). A disabled interactive item or option does not
 *   activate and is announced disabled, but the arrow keys still reach it (LST-2); it keeps its resting colors and dims
 *   as a whole (LST-6). Ignored for a static item.
 * @param divider draws a hairline along the bottom of the row, from the start of the text to the row's end (LST-22).
 * @param onClick the spec's `click` — and `interactive`: non-null makes the item one pressable action, called once per
 *   activation (pointer, touch, Enter, Space, an assistive technology's click). Ignored in a listbox.
 * @param leadingIcon an icon at the start of the row, in a box of `leadingIconSize`, given the condition's icon color,
 *   glyph and an icon-font text style (as `TanreiIconButton`'s slot). Decorative.
 * @param trailingIcon an icon at the end of the row, in a box of `trailingIconSize`, likewise.
 * @param leadingContent the spec's `leading` slot: the avatar's or the image's content — an image, or a monogram (drawn
 *   in the headline's text style and `mediaContentColor`) —, on `mediaContainerColor`, clipped to the media's shape.
 *   Hidden from assistive technology: the row is named by its headline.
 * @param trailingContent the spec's `trailing` slot: a control of the product's own at the end of a static item (a
 *   switch named by the headline, a checkbox, an icon button). It keeps its own tokens, semantics and focus stop.
 * @param interactionSource hoist to observe or drive hover, focus and press.
 */
@Composable
public fun TanreiListItem(
    headline: String,
    modifier: Modifier = Modifier,
    value: String = "",
    overline: String = "",
    supportingText: String = "",
    supportingMaxLines: Int = 0,
    trailingText: String = "",
    leadingMedia: TanreiListLeadingMedia = TanreiListLeadingMedia.None,
    enabled: Boolean = true,
    divider: Boolean = false,
    onClick: (() -> Unit)? = null,
    leadingIcon: (@Composable () -> Unit)? = null,
    trailingIcon: (@Composable () -> Unit)? = null,
    leadingContent: (@Composable () -> Unit)? = null,
    trailingContent: (@Composable () -> Unit)? = null,
    interactionSource: MutableInteractionSource? = null,
) {
    val component = "TanreiListItem"
    val source = interactionSource ?: remember { MutableInteractionSource() }
    val system = TanreiTheme.tokens
    val tokens = system.list
    val list = LocalTanreiList.current
    val selectionMode = list?.selectionMode ?: TanreiListSelectionMode.None
    val kind = when {
        selectionMode != TanreiListSelectionMode.None -> TanreiListItemKind.Option
        onClick != null -> TanreiListItemKind.Interactive
        else -> TanreiListItemKind.Static
    }
    val active = kind != TanreiListItemKind.Static
    // LST-11: a static item has nothing to disable.
    val itemEnabled = !active || enabled
    // LST-26: selected while the list's value is this option's value, or its values hold it.
    val selected = kind == TanreiListItemKind.Option && list?.isSelected(value) == true
    val condition = if (selected) TanreiListCondition.Selected else TanreiListCondition.Unselected

    // LST-23: still rendered and still working; reported in debuggable apps.
    if (headline.isBlank()) TanreiReportMissingName(component, "headline", what = "an item without a headline")
    if (supportingMaxLines < 0) TanreiReportInvalidValue(component, "supportingMaxLines", "$supportingMaxLines", "is negative", "as 0 (all of it)")
    val maxLines = supportingMaxLines.coerceAtLeast(0)

    // LST-3 / LST-6: one state wins; LST-8: a press counts from the first frame and for at least press-hold. LST-11: a
    // static item draws its resting tokens whatever happens to it.
    val interaction = source.collectTanreiInteraction(itemEnabled)
    val feedback = system.behavior.pressedFeedback
    val drawnStates = if (active) interaction.drawnStates(feedback) else RestingStates
    val palette = tokens.conditions[condition]
    val drawn = palette[drawnStates.content]

    // LST-25: a change of state moves over the list's state motion (entering pressed snaps); LST-21: a change of
    // condition moves the colors over the same duration and easing, also while pressed. At once where motion is reduced.
    val stateMotion = TanreiStateMotion(if (active) interaction.state else TanreiInteractionState.Enabled, tokens.motionStateDuration, tokens.motionStateEasing)
    val motion = rememberTanreiSelectionMotion(condition, stateMotion, tokens.motionStateDuration, tokens.motionStateEasing)
    val containerColor = animateTanreiColorAsState(palette[drawnStates.container].containerColor.color, motion, label = "container")
    val colors = ListItemColors(
        headline = animateTanreiColorAsState(drawn.headlineColor.color, motion, label = "headline"),
        overline = animateTanreiColorAsState(drawn.overlineColor.color, motion, label = "overline"),
        supportingText = animateTanreiColorAsState(drawn.supportingTextColor.color, motion, label = "supporting-text"),
        trailingText = animateTanreiColorAsState(drawn.trailingTextColor.color, motion, label = "trailing-text"),
        leadingIcon = animateTanreiColorAsState(drawn.leadingIconColor.color, motion, label = "leading-icon"),
        trailingIcon = animateTanreiColorAsState(drawn.trailingIconColor.color, motion, label = "trailing-icon"),
        mark = animateTanreiColorAsState(drawn.markColor.color, motion, label = "mark"),
    )
    // LST-6: a disabled item dims as a whole, its leading media included; LST-9: `dim` dims a pressed one.
    val opacity = animateFloatAsState(if (active) tokens.opacity(drawnStates.content) else 1f, motion.spec(), label = "opacity")
    // LST-21: the check draws along its path, or is taken back, over the state duration.
    val checkShown = animateFloatAsState(if (selected) 1f else 0f, tanreiTween(tokens.motionStateDuration, tokens.motionStateEasing), label = "check")
    // LST-10: the row's corner of the state, eased by the system's corner smoothing.
    val cornerRadius = tokens.containerShape(drawnStates.content)
    val smoothing = system.shape.cornerSmoothing
    val shape = remember(cornerRadius, smoothing) { tanreiContainerShape(cornerRadius, smoothing) }

    // LST-9, ripple: the pressed container color of the item's condition, from the point of contact (the center for a
    // key); LST-16: from the point of contact in either layout direction. Null unless the system ripples.
    val ripple = rememberTanreiRipple(
        feedback = feedback,
        interaction = interaction,
        color = palette.pressed.containerColor.color,
        feedbackDurationMillis = tokens.motionFeedbackDuration,
        stateDurationMillis = tokens.motionStateDuration,
        stateEasing = tokens.motionStateEasing,
    )?.takeIf { active }

    // LST-15: the list's keyboard sees this item — its order, whether it takes focus, what type-ahead matches.
    val roving = list?.roving
    val entry = rememberTanreiRovingEntry(roving, focusable = active, enabled = itemEnabled, selected = selected, text = headline, value = value, option = kind == TanreiListItemKind.Option)
    val index = entry?.let { roving?.indexOf(it) } ?: -1

    // LST-12: a list item with its position (the list says its size); an interactive item is ONE element with the
    // button role inside it; an option is selectable. The row's content merges into that one node.
    val position = Modifier.semantics(mergeDescendants = !active) {
        if (index >= 0) collectionItemInfo = CollectionItemInfo(rowIndex = index, rowSpan = 1, columnIndex = 0, columnSpan = 1)
    }
    val input = when (kind) {
        TanreiListItemKind.Static -> Modifier
        // LST-1 / LST-2: once per activation; a disabled item does not activate.
        TanreiListItemKind.Interactive -> Modifier.clickable(interactionSource = source, indication = null, enabled = enabled, role = Role.Button, onClick = onClick ?: {})
        // LST-13 / LST-14: the list moves its selection.
        TanreiListItemKind.Option -> Modifier.selectable(selected = selected, interactionSource = source, indication = null, enabled = enabled, onClick = { list?.activate(value) })
    }
    // LST-2: a disabled item keeps a focus target of its own, so that the arrow keys still reach it.
    val reachable = if (active && !enabled) Modifier.focusable(interactionSource = source) else Modifier
    val geometry = remember { ListRowGeometry() }
    val row = modifier
        .fillMaxWidth()
        .tanreiRovingItem(roving, entry, focusable = active)
        .then(if (active) Modifier.tanreiAnchorDescription() else Modifier)
        .then(position)
        .then(reachable)
        .then(input)
        // LST-8: the pointer press itself, heard at once.
        .tanreiPressInput(interaction.press, active && enabled)
        .tanreiRippleInput(ripple)
        // LST-4: inside the row, where a scrolling ancestor cannot clip it; never animated; not dimmed with a disabled
        // item, which the arrow keys still reach.
        .then(if (active) Modifier.tanreiFocusRing(source, cornerRadius = cornerRadius, inside = true) else Modifier)
        // LST-22: the divider keeps its color in every state and condition, so it is drawn outside the dimmed group.
        .tanreiListDivider(divider, geometry, tokens.dividerColor.color, tokens.dividerThickness)
        .tanreiGroupOpacity(overflow = NoLength) { opacity.value }
        .tanreiContainer(shape, containerColor = { containerColor.value }, outlineColor = Color.Transparent, outlineWidth = NoLength, ripple = ripple)

    val glyph = system.icon.glyph(tokens.leadingIconSize, selected = selected)
    val trailingGlyph = system.icon.glyph(tokens.trailingIconSize, selected = selected)
    val headlineStyle = tokens.headlineTypescale.toTextStyle()
    val styles = ListItemStyles(
        overline = tokens.overlineTypescale.toTextStyle(),
        headline = headlineStyle,
        supportingText = tokens.supportingTextTypescale.toTextStyle(),
        trailingText = tokens.trailingTextTypescale.toTextStyle(),
    )
    // LST-5: an interactive item or an option is at least the touch target tall (Compose cannot tell a fine pointer).
    val floor = if (active) system.measure.targetTouch else NoLength
    val selectable = selectionMode != TanreiListSelectionMode.None

    Box(row) {
        val content = @Composable {
            ListItemRow(tokens = tokens, styles = styles, geometry = geometry, minimumHeight = floor) {
                // LST-20: the media replaces the icon; LST-19: an empty slot draws nothing and leaves no space.
                when {
                    leadingMedia != TanreiListLeadingMedia.None -> {
                        val avatar = leadingMedia == TanreiListLeadingMedia.Avatar
                        val side = if (avatar) tokens.avatarSize else tokens.imageSize
                        val radius = if (avatar) tokens.avatarShape else tokens.imageShape
                        val mediaShape = remember(radius, smoothing) { tanreiContainerShape(radius, smoothing) }
                        Box(
                            Modifier
                                .layoutId(ListSlot.Leading)
                                .size(side)
                                .clip(mediaShape)
                                .background(tokens.mediaContainerColor.color)
                                .clearAndSetSemantics {},
                            contentAlignment = Alignment.Center,
                        ) {
                            CompositionLocalProvider(
                                LocalTanreiContentColor provides tokens.mediaContentColor.color,
                                LocalTanreiTextStyle provides headlineStyle,
                            ) { leadingContent?.invoke() }
                        }
                    }
                    leadingIcon != null -> ListItemIcon(ListSlot.Leading, tokens.leadingIconSize, colors.leadingIcon.value, glyph, leadingIcon)
                }
                if (overline.isNotEmpty()) ListItemText(ListSlot.Overline, overline, styles.overline, colors.overline)
                ListItemText(ListSlot.Headline, headline, styles.headline, colors.headline)
                if (supportingText.isNotEmpty()) ListItemText(ListSlot.Supporting, supportingText, styles.supportingText, colors.supportingText, maxLines)
                if (trailingText.isNotEmpty()) ListItemText(ListSlot.TrailingText, trailingText, styles.trailingText, colors.trailingText)
                if (trailingIcon != null) ListItemIcon(ListSlot.TrailingIcon, tokens.trailingIconSize, colors.trailingIcon.value, trailingGlyph, trailingIcon)
                if (trailingContent != null) Box(Modifier.layoutId(ListSlot.TrailingControl), contentAlignment = Alignment.Center) { trailingContent() }
                // LST-21: the check's box is reserved in every option of a selectable list.
                if (selectable) {
                    val mark = colors.mark
                    Canvas(Modifier.layoutId(ListSlot.Mark).size(tokens.markSize)) {
                        val shown = checkShown.value
                        val color = mark.value
                        if (shown <= 0f || !color.isDrawn) return@Canvas
                        drawPath(tanreiCheckPath(size, shown), color, style = Stroke(width = tokens.markWidth.toPx(), cap = StrokeCap.Square, join = StrokeJoin.Miter))
                    }
                }
            }
        }
        if (active) WithoutTanreiAnchorDescription(content) else content()
    }
}

/** No length: the row draws nothing outside itself and has no outline; a static row has no target to reach. */
private val NoLength = Dp.Hairline

/** A static item's states: it answers nothing (LST-11). */
private val RestingStates = TanreiDrawnStates(content = TanreiInteractionState.Enabled, container = TanreiInteractionState.Enabled)

/** The animated colors of an item's parts. */
private class ListItemColors(
    val headline: State<Color>,
    val overline: State<Color>,
    val supportingText: State<Color>,
    val trailingText: State<Color>,
    val leadingIcon: State<Color>,
    val trailingIcon: State<Color>,
    val mark: State<Color>,
)

/** The text styles of an item's texts (LST-18). */
private class ListItemStyles(val overline: TextStyle, val headline: TextStyle, val supportingText: TextStyle, val trailingText: TextStyle)

private enum class ListSlot { Leading, Overline, Headline, Supporting, TrailingText, TrailingIcon, TrailingControl, Mark }

/** Where the row's text column starts, measured by [ListItemRow] and read when the divider is drawn (LST-22). */
private class ListRowGeometry {
    var textStart: Float = 0f
}

/** One text of the row: it wraps (never truncates) unless [maxLines] cuts it with an ellipsis (LST-18). */
@Composable
private fun ListItemText(slot: ListSlot, text: String, style: TextStyle, color: State<Color>, maxLines: Int = 0) {
    BasicText(
        text = text,
        modifier = Modifier.layoutId(slot),
        style = style,
        color = { color.value },
        overflow = if (maxLines > 0) TextOverflow.Ellipsis else TextOverflow.Clip,
        maxLines = if (maxLines > 0) maxLines else Int.MAX_VALUE,
    )
}

/**
 * An icon slot of the row (LST-19): a box of [size], decorative, given [color], the condition's [glyph] and the text
 * style that draws one glyph of the icon font — as `TanreiIconButton`'s slot.
 */
@Composable
private fun ListItemIcon(slot: ListSlot, size: Dp, color: Color, glyph: io.github.chnotchy.tanrei.theme.TanreiIconGlyph, icon: @Composable () -> Unit) {
    Box(Modifier.layoutId(slot).size(size).clearAndSetSemantics {}, contentAlignment = Alignment.Center) {
        CompositionLocalProvider(
            LocalTanreiContentColor provides color,
            LocalTanreiIconGlyph provides glyph,
            LocalTanreiTextStyle provides glyph.toTextStyle(size),
            content = icon,
        )
    }
}

/**
 * The row (LST-16, LST-17): `padding-inline-start`, the leading element, the text column (overline, headline, supporting
 * text) taking the remaining width, then the trailing text, trailing icon, trailing control and mark, each `gap` apart,
 * and `padding-inline-end`. At least the height of its lines — one-line with the headline alone, two-line with one more
 * line (an overline, or supporting text on one line), three-line with two or more — and never less than [minimumHeight];
 * padded by `padding-block` above and below, growing with its content. The leading and trailing elements are centered
 * on the text column in a one- or two-line item and aligned with its top in a taller one. Everything is placed
 * relative to the layout direction, so right-to-left mirrors the row.
 */
@Composable
private fun ListItemRow(tokens: TanreiListTokens, styles: ListItemStyles, geometry: ListRowGeometry, minimumHeight: Dp, content: @Composable () -> Unit) {
    Layout(content = content) { measurables, constraints ->
        fun slot(id: ListSlot) = measurables.firstOrNull { it.layoutId == id }
        val bounded = constraints.hasBoundedWidth
        val start = tokens.containerPaddingInlineStart.roundToPx()
        val end = tokens.containerPaddingInlineEnd.roundToPx()
        val gap = tokens.containerGap.roundToPx()
        val block = tokens.containerPaddingBlock.roundToPx()
        val leading = slot(ListSlot.Leading)?.measure(Constraints())
        val textStart = start + (leading?.let { it.width + gap } ?: 0)
        val room = if (bounded) (constraints.maxWidth - textStart - end).coerceAtLeast(0) else Constraints.Infinity
        fun upTo(width: Int) = Constraints(maxWidth = width)
        // A trailing text is short; it may take at most half of the room, so that the text column keeps the rest.
        val trailingText = slot(ListSlot.TrailingText)?.measure(upTo(if (bounded) room / 2 else Constraints.Infinity))
        val trailingIcon = slot(ListSlot.TrailingIcon)?.measure(Constraints())
        val trailingControl = slot(ListSlot.TrailingControl)?.measure(upTo(room))
        val mark = slot(ListSlot.Mark)?.measure(Constraints())
        val trailing = listOfNotNull(trailingText, trailingIcon, trailingControl, mark)
        val trailingWidth = trailing.sumOf { it.width + gap }
        val textWidth = if (bounded) (room - trailingWidth).coerceAtLeast(0) else Constraints.Infinity
        val overline = slot(ListSlot.Overline)?.measure(upTo(textWidth))
        val headline = slot(ListSlot.Headline)?.measure(upTo(textWidth))
        val supporting = slot(ListSlot.Supporting)?.measure(upTo(textWidth))
        val texts = listOfNotNull(overline, headline, supporting)
        val textHeight = texts.sumOf { it.height }
        val extraLines = lines(overline, styles.overline) + lines(supporting, styles.supportingText)
        val lineHeight = when {
            extraLines == 0 -> tokens.containerHeightOneLine
            extraLines == 1 -> tokens.containerHeightTwoLine
            else -> tokens.containerHeightThreeLine
        }
        val minimum = max(lineHeight, minimumHeight).roundToPx()
        val content = maxOf(textHeight, leading?.height ?: 0, trailing.maxOfOrNull { it.height } ?: 0)
        val height = maxOf(minimum, content + 2 * block).coerceIn(constraints.minHeight, constraints.maxHeight)
        val width = if (bounded) {
            constraints.maxWidth
        } else {
            (textStart + (texts.maxOfOrNull { it.width } ?: 0) + trailingWidth + end).coerceAtLeast(constraints.minWidth)
        }
        geometry.textStart = textStart.toFloat()
        val textTop = (height - textHeight) / 2
        val alignTop = extraLines >= 2
        fun sideTop(placeable: Placeable): Int {
            val top = if (alignTop) textTop else textTop + (textHeight - placeable.height) / 2
            return top.coerceIn(0, (height - placeable.height).coerceAtLeast(0))
        }
        layout(width, height) {
            leading?.placeRelative(start, sideTop(leading))
            var y = textTop
            for (text in texts) {
                text.placeRelative(textStart, y)
                y += text.height
            }
            var x = width - end
            for (placeable in trailing.asReversed()) {
                x -= placeable.width
                placeable.placeRelative(x, sideTop(placeable))
                x -= gap
            }
        }
    }
}

/** How many lines of [style] a measured text holds (its line height is sp, so a larger text size scales both alike). */
private fun Density.lines(text: Placeable?, style: TextStyle): Int {
    if (text == null) return 0
    val line = style.lineHeight.takeIf { it.isSp }?.toPx() ?: return 1
    return if (line <= 0f) 1 else maxOf(1, Math.round(text.height / line))
}

/** LST-22: a line of [thickness] along the bottom edge, inside the height, from the text column's start to the end edge. */
private fun Modifier.tanreiListDivider(shown: Boolean, geometry: ListRowGeometry, color: Color, thickness: Dp): Modifier =
    if (!shown) this else drawWithContent {
        drawContent()
        if (!color.isDrawn) return@drawWithContent
        val line = thickness.toPx()
        val length = (size.width - geometry.textStart).coerceAtLeast(0f)
        val x = if (layoutDirection == LayoutDirection.Ltr) geometry.textStart else 0f
        drawRect(color, topLeft = Offset(x, size.height - line), size = Size(length, line))
    }

/**
 * Debuggable apps only (LST-26): what a selectable list draws but cannot mean — an option whose value is empty or
 * repeats another's, and a selected value that names no option. Each is reported once, after the items have registered.
 */
@Composable
private fun TanreiReportListSelection(roving: TanreiRovingFocus, selectionMode: TanreiListSelectionMode, selectedValue: String?, selectedValues: Set<String>) {
    if (!isTanreiDebuggable()) return
    val reported = remember { mutableSetOf<String>() }
    LaunchedEffect(roving, selectionMode, selectedValue, selectedValues) {
        snapshotFlow {
            val options = roving.ordered.filter { it.option }
            val values = options.map { it.value }
            buildList {
                options.filter { it.value.isEmpty() }.forEach { add("TanreiListItem \"${it.text}\": value is empty — the option cannot be told apart from others.") }
                values.filter { it.isNotEmpty() }.groupingBy { it }.eachCount().filterValues { it > 1 }.keys.forEach { add("TanreiList: the value \"$it\" is given to more than one option.") }
                val chosen = if (selectionMode == TanreiListSelectionMode.Single) listOfNotNull(selectedValue) else selectedValues.toList()
                val prop = if (selectionMode == TanreiListSelectionMode.Single) "selectedValue" else "selectedValues"
                if (options.isNotEmpty()) chosen.filter { it !in values }.forEach { add("TanreiList: $prop names \"$it\", which no option has; nothing is selected for it.") }
            }
        }.collect { problems -> problems.forEach { if (reported.add(it)) TanreiDiagnostics.reporter(it) } }
    }
}
