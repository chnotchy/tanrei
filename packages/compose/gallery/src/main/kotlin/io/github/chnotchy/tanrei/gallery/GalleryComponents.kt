package io.github.chnotchy.tanrei.gallery

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import io.github.chnotchy.tanrei.theme.glyph
import androidx.compose.ui.Alignment
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.state.ToggleableState
import io.github.chnotchy.tanrei.components.TanreiAppBar
import io.github.chnotchy.tanrei.components.TanreiAppBarDefaults
import io.github.chnotchy.tanrei.components.TanreiAppBarTitleAlignment
import io.github.chnotchy.tanrei.components.rememberTanreiAppBarState
import io.github.chnotchy.tanrei.components.rememberTanreiDrawerState
import io.github.chnotchy.tanrei.components.TanreiBadge
import io.github.chnotchy.tanrei.components.TanreiBottomSheet
import io.github.chnotchy.tanrei.components.TanreiBottomSheetDetent
import io.github.chnotchy.tanrei.components.TanreiBottomSheetVariant
import io.github.chnotchy.tanrei.components.TanreiButton
import io.github.chnotchy.tanrei.components.TanreiCard
import io.github.chnotchy.tanrei.components.TanreiCarousel
import io.github.chnotchy.tanrei.components.TanreiCarouselItem
import io.github.chnotchy.tanrei.components.TanreiCarouselLayout
import io.github.chnotchy.tanrei.components.TanreiCheckbox
import io.github.chnotchy.tanrei.components.TanreiChip
import io.github.chnotchy.tanrei.components.TanreiContainedLoadingIndicator
import io.github.chnotchy.tanrei.components.TanreiDate
import io.github.chnotchy.tanrei.components.TanreiDatePicker
import io.github.chnotchy.tanrei.components.TanreiDatePickerEntryMode
import io.github.chnotchy.tanrei.components.TanreiDatePickerFirstDayOfWeek
import io.github.chnotchy.tanrei.components.TanreiDatePickerLabels
import io.github.chnotchy.tanrei.components.TanreiDatePickerMode
import io.github.chnotchy.tanrei.components.TanreiDatePickerPresentation
import io.github.chnotchy.tanrei.components.TanreiDatePickerStartView
import io.github.chnotchy.tanrei.components.TanreiDateSelection
import io.github.chnotchy.tanrei.components.TanreiDialog
import io.github.chnotchy.tanrei.components.TanreiDivider
import io.github.chnotchy.tanrei.components.TanreiDividerInset
import io.github.chnotchy.tanrei.components.TanreiExtendedFloatingActionButton
import io.github.chnotchy.tanrei.components.TanreiFloatingActionButton
import io.github.chnotchy.tanrei.components.TanreiIconButton
import io.github.chnotchy.tanrei.components.TanreiCheckboxMenuItem
import io.github.chnotchy.tanrei.components.TanreiList
import io.github.chnotchy.tanrei.components.TanreiListItem
import io.github.chnotchy.tanrei.components.TanreiListLeadingMedia
import io.github.chnotchy.tanrei.components.TanreiListSelectionMode
import io.github.chnotchy.tanrei.components.TanreiMenu
import io.github.chnotchy.tanrei.components.TanreiDrawerValue
import io.github.chnotchy.tanrei.components.TanreiNavigationBadge
import io.github.chnotchy.tanrei.components.TanreiNavigationBar
import io.github.chnotchy.tanrei.components.TanreiNavigationBarItem
import io.github.chnotchy.tanrei.components.TanreiNavigationDrawer
import io.github.chnotchy.tanrei.components.TanreiNavigationDrawerItem
import io.github.chnotchy.tanrei.components.TanreiNavigationDrawerSection
import io.github.chnotchy.tanrei.components.TanreiNavigationLabelVisibility
import io.github.chnotchy.tanrei.components.TanreiNavigationRail
import io.github.chnotchy.tanrei.components.TanreiNavigationRailItem
import io.github.chnotchy.tanrei.components.TanreiMenuGroup
import io.github.chnotchy.tanrei.components.TanreiMenuItem
import io.github.chnotchy.tanrei.components.TanreiMenuPlacement
import io.github.chnotchy.tanrei.components.TanreiRadioMenuItem
import io.github.chnotchy.tanrei.components.TanreiLoadingIndicator
import io.github.chnotchy.tanrei.components.TanreiProgressIndicator
import io.github.chnotchy.tanrei.components.TanreiProgressIndicatorVariant
import io.github.chnotchy.tanrei.components.TanreiRadioButton
import io.github.chnotchy.tanrei.components.TanreiSnackbar
import io.github.chnotchy.tanrei.components.TanreiSnackbarDuration
import io.github.chnotchy.tanrei.components.TanreiSwitch
import io.github.chnotchy.tanrei.components.TanreiTab
import io.github.chnotchy.tanrei.components.TanreiSearch
import io.github.chnotchy.tanrei.components.TanreiSideSheet
import io.github.chnotchy.tanrei.components.TanreiSearchPresentation
import io.github.chnotchy.tanrei.components.TanreiSearchSuggestion
import io.github.chnotchy.tanrei.components.TanreiSlider
import io.github.chnotchy.tanrei.components.TanreiSliderValueIndicator
import io.github.chnotchy.tanrei.components.TanreiToolbar
import io.github.chnotchy.tanrei.components.TanreiButtonGroup
import io.github.chnotchy.tanrei.components.TanreiButtonGroupVariant
import io.github.chnotchy.tanrei.components.TanreiFabMenu
import io.github.chnotchy.tanrei.components.TanreiFabMenuItem
import io.github.chnotchy.tanrei.components.TanreiSegment
import io.github.chnotchy.tanrei.components.TanreiSegmentedButton
import io.github.chnotchy.tanrei.components.TanreiSegmentedButtonSelectionMode
import io.github.chnotchy.tanrei.components.TanreiSplitButton
import io.github.chnotchy.tanrei.components.TanreiTabs
import io.github.chnotchy.tanrei.components.TanreiTextField
import io.github.chnotchy.tanrei.components.TanreiTooltip
import io.github.chnotchy.tanrei.components.TanreiTooltipPlacement
import io.github.chnotchy.tanrei.components.TanreiTooltipVariant
import io.github.chnotchy.tanrei.components.rememberTanreiTooltipState
import io.github.chnotchy.tanrei.components.TanreiTextFieldType
import io.github.chnotchy.tanrei.components.TanreiTime
import io.github.chnotchy.tanrei.components.TanreiTimePicker
import io.github.chnotchy.tanrei.components.TanreiTimePickerEntryMode
import io.github.chnotchy.tanrei.components.TanreiTimePickerHourCycle
import io.github.chnotchy.tanrei.components.TanreiTimePickerLabels
import io.github.chnotchy.tanrei.components.TanreiTimePickerLayout
import io.github.chnotchy.tanrei.components.TanreiTimePickerUnit
import io.github.chnotchy.tanrei.primitives.TanreiText
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.TanreiAppBarSize
import io.github.chnotchy.tanrei.tokens.TanreiButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiCardVariant
import io.github.chnotchy.tanrei.tokens.TanreiChipSize
import io.github.chnotchy.tanrei.tokens.TanreiChipVariant
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiExtendedFabSize
import io.github.chnotchy.tanrei.tokens.TanreiExtendedFabVariant
import io.github.chnotchy.tanrei.tokens.TanreiFabSize
import io.github.chnotchy.tanrei.tokens.TanreiFabVariant
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiLoadingIndicatorSize
import io.github.chnotchy.tanrei.tokens.TanreiNavigationDrawerVariant
import io.github.chnotchy.tanrei.tokens.TanreiProgressIndicatorSize
import io.github.chnotchy.tanrei.tokens.TanreiFabMenuSize
import io.github.chnotchy.tanrei.tokens.TanreiFabMenuVariant
import io.github.chnotchy.tanrei.tokens.TanreiSegmentedButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiSideSheetVariant
import io.github.chnotchy.tanrei.tokens.TanreiSliderSize
import io.github.chnotchy.tanrei.tokens.TanreiSplitButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiSplitButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiTabsVariant
import io.github.chnotchy.tanrei.tokens.TanreiTextFieldSize
import io.github.chnotchy.tanrei.tokens.TanreiTextFieldVariant
import io.github.chnotchy.tanrei.tokens.TanreiToolbarVariant

/** What the gallery hands a registry entry for one fixture: the fixture, the modifier (its test tag) and the click. */
class GalleryFixtureScope(
    val fixture: GalleryFixture,
    /** Carries the fixture's test tag (`fixtureTag`): pass it to the component's `modifier`. */
    val modifier: Modifier,
    /** Wire it to the component's primary event, so the instrumented tests can count activations. */
    val onClick: () -> Unit,
)

/**
 * How the gallery draws one component: [props] — every prop of the spec, under the SPEC's names, that [render] maps to
 * the component's Compose API (the gallery refuses to start when the spec declares a prop the entry does not map, so a
 * new prop cannot be silently ignored) — and [render], one fixture with the spec's `platforms.compose` names.
 */
class GalleryComponent(
    val props: Set<String>,
    val render: @Composable GalleryFixtureScope.() -> Unit,
)

/**
 * THE registry: spec name → how to draw its fixtures. Adding a component to the gallery is one entry here; its
 * fixtures, its section under every shipped system and its test tags come from the spec.
 */
val GalleryComponents: Map<String, GalleryComponent> = mapOf(
    "button" to GalleryComponent(props = setOf("variant", "size", "disabled")) {
        TanreiButton(
            text = fixture.content.orEmpty(),
            onClick = onClick,
            modifier = modifier,
            // Spec values ARE the keys of the token axes.
            variant = TanreiButtonVariant(fixture.string("variant")),
            size = TanreiButtonSize(fixture.string("size")),
            enabled = !fixture.boolean("disabled"),
        )
    },
    "icon-button" to GalleryComponent(props = setOf("variant", "size", "toggle", "selected", "disabled", "label")) {
        // A toggle really toggles here: the fixture's `selected` is where it starts.
        var checked by remember(fixture) { mutableStateOf(fixture.boolean("selected")) }
        TanreiIconButton(
            onClick = onClick,
            contentDescription = fixture.string("label"),
            modifier = modifier,
            variant = TanreiIconButtonVariant(fixture.string("variant")),
            size = TanreiIconButtonSize(fixture.string("size")),
            checked = checked,
            onCheckedChange = if (fixture.boolean("toggle")) { value -> checked = value } else null,
            enabled = !fixture.boolean("disabled"),
        ) {
            GalleryGlyph(fixture.content.orEmpty())
        }
    },
    "divider" to GalleryComponent(props = setOf("orientation", "inset", "decorative")) {
        // A divider fills its container along its axis: give it a stage (the page's widest spacing step, twice).
        val horizontal = fixture.string("orientation") == "horizontal"
        val length = TanreiTheme.tokens.space.space900 * 2
        Box(if (horizontal) Modifier.width(length) else Modifier.height(length)) {
            TanreiDivider(
                modifier = modifier,
                orientation = if (horizontal) Orientation.Horizontal else Orientation.Vertical,
                inset = TanreiDividerInset.entries.single { it.name.lowercase() == fixture.string("inset") },
                decorative = fixture.boolean("decorative"),
            )
        }
    },
    "badge" to GalleryComponent(props = setOf("count", "max", "label")) {
        // The anchor is the fixture's icon at sys.icon.large in on-surface-variant, named by its glyph name; the badge
        // adds the fixture's label as its description ("notifications, 3 unread" — the spec's default slot). The
        // stand-in glyph, as no icon font is bundled here.
        TanreiBadge(
            count = (fixture.props["count"] as? Number)?.toInt(),
            modifier = modifier,
            max = (fixture.props.getValue("max") as Number).toInt(),
            contentDescription = fixture.string("label"),
        ) {
            val glyph = fixture.content.orEmpty()
            CompositionLocalProvider(LocalTanreiContentColor provides TanreiColorRole.OnSurfaceVariant.color) {
                Box(Modifier.size(TanreiTheme.tokens.measure.iconLarge).semantics { contentDescription = glyph }) { GalleryGlyph(glyph) }
            }
        }
    },
    "progress-indicator" to GalleryComponent(props = setOf("variant", "size", "value", "min", "max", "label", "valueText")) {
        val variant = TanreiProgressIndicatorVariant.entries.single { it.name.lowercase() == fixture.string("variant") }
        val size = TanreiProgressIndicatorSize(fixture.string("size"))
        // A bar fills the width it is given: give it a stage, as the divider's.
        val stage = if (variant == TanreiProgressIndicatorVariant.Linear) Modifier.width(TanreiTheme.tokens.space.space900 * 2) else Modifier
        val value = (fixture.props["value"] as? Number)?.toFloat()
        if (value == null) {
            TanreiProgressIndicator(contentDescription = fixture.string("label"), modifier = modifier.then(stage), variant = variant, size = size)
        } else {
            TanreiProgressIndicator(
                progress = { value },
                contentDescription = fixture.string("label"),
                modifier = modifier.then(stage),
                variant = variant,
                size = size,
                valueRange = (fixture.props.getValue("min") as Number).toFloat()..(fixture.props.getValue("max") as Number).toFloat(),
                stateDescription = fixture.string("valueText"),
            )
        }
    },
    "checkbox" to GalleryComponent(props = setOf("checked", "indeterminate", "error", "disabled", "label", "labelHidden")) {
        // It really toggles: the fixture's condition is where it starts; an indeterminate one becomes checked (CHK-2).
        var state by remember(fixture) {
            mutableStateOf(if (fixture.boolean("indeterminate")) ToggleableState.Indeterminate else ToggleableState(fixture.boolean("checked")))
        }
        TanreiCheckbox(
            state = state,
            onClick = { state = if (state == ToggleableState.On) ToggleableState.Off else ToggleableState.On; onClick() },
            label = fixture.string("label"),
            modifier = modifier,
            enabled = !fixture.boolean("disabled"),
            isError = fixture.boolean("error"),
            labelHidden = fixture.boolean("labelHidden"),
        )
    },
    "radio-button" to GalleryComponent(props = setOf("selected", "value", "name", "disabled", "label", "labelHidden")) {
        // Each fixture is an option of a group of its own (`name` → selectableGroup()); an unselected one can be chosen.
        // The group's state is the chosen value; the option's onClick captures its own (the spec's `value`).
        val value = fixture.string("value")
        var chosen by remember(fixture) { mutableStateOf(if (fixture.boolean("selected")) value else null) }
        Box(Modifier.selectableGroup()) {
            TanreiRadioButton(
                selected = chosen == value,
                onClick = { chosen = value; onClick() },
                label = fixture.string("label"),
                modifier = modifier,
                enabled = !fixture.boolean("disabled"),
                labelHidden = fixture.boolean("labelHidden"),
            )
        }
    },
    "switch" to GalleryComponent(props = setOf("selected", "disabled", "label", "labelHidden", "selectedIcon", "unselectedIcon")) {
        // It really switches; the handle shows the glyph of its selection, or none when that prop is empty.
        var checked by remember(fixture) { mutableStateOf(fixture.boolean("selected")) }
        val icon = if (checked) fixture.string("selectedIcon") else fixture.string("unselectedIcon")
        TanreiSwitch(
            checked = checked,
            onCheckedChange = { checked = it; onClick() },
            label = fixture.string("label"),
            modifier = modifier,
            enabled = !fixture.boolean("disabled"),
            labelHidden = fixture.boolean("labelHidden"),
            thumbContent = if (icon.isEmpty()) null else { { GallerySwitchGlyph(icon) } },
        )
    },
    "card" to GalleryComponent(props = setOf("variant", "interactive", "disabled", "inset", "label")) {
        // `interactive` is the overload with onClick (`platforms.compose`); the fixture's content is one text.
        val variant = TanreiCardVariant(fixture.string("variant"))
        val label = fixture.string("label")
        if (fixture.boolean("interactive")) {
            TanreiCard(onClick = onClick, modifier = modifier, variant = variant, enabled = !fixture.boolean("disabled"), inset = fixture.boolean("inset"), contentDescription = label) {
                TanreiText(fixture.content.orEmpty())
            }
        } else {
            TanreiCard(modifier = modifier, variant = variant, inset = fixture.boolean("inset"), contentDescription = label) {
                TanreiText(fixture.content.orEmpty())
            }
        }
    },
    "text-field" to GalleryComponent(
        props = setOf(
            "variant", "size", "type", "value", "label", "labelHidden", "placeholder", "supportingText", "errorText", "error",
            "disabled", "readOnly", "required", "multiline", "minRows", "maxRows", "maxLength", "counter", "prefixText",
            "suffixText", "autocomplete",
        ),
    ) {
        // It really edits: the fixture's value is where it starts. The field fills the section's width, up to a stage
        // (the page's widest spacing step, three times). Icons are named in `content` as `leading-icon=<glyph> …`.
        var value by remember(fixture) { mutableStateOf(fixture.string("value")) }
        val size = TanreiTextFieldSize(fixture.string("size"))
        val iconSize = TanreiTheme.tokens.textField.sizes[size].iconSize
        val icons = fixture.content.orEmpty().split(' ').filter { '=' in it }.associate { it.substringBefore('=') to it.substringAfter('=') }
        fun number(name: String) = (fixture.props.getValue(name) as Number).toInt()
        TanreiTextField(
            value = value,
            onValueChange = { value = it },
            label = fixture.string("label"),
            modifier = modifier.width(TanreiTheme.tokens.space.space900 * 3),
            variant = TanreiTextFieldVariant(fixture.string("variant")),
            size = size,
            type = TanreiTextFieldType.entries.single { it.name.lowercase() == fixture.string("type") },
            labelHidden = fixture.boolean("labelHidden"),
            placeholder = fixture.string("placeholder"),
            supportingText = fixture.string("supportingText"),
            errorText = fixture.string("errorText"),
            isError = fixture.boolean("error"),
            enabled = !fixture.boolean("disabled"),
            readOnly = fixture.boolean("readOnly"),
            required = fixture.boolean("required"),
            singleLine = !fixture.boolean("multiline"),
            minLines = number("minRows"),
            maxLines = number("maxRows"),
            maxLength = number("maxLength"),
            counter = fixture.boolean("counter"),
            prefix = fixture.string("prefixText"),
            suffix = fixture.string("suffixText"),
            contentType = fixture.string("autocomplete"),
            onCommit = { onClick() },
            leadingIcon = icons["leading-icon"]?.let { glyph -> { GalleryFieldGlyph(glyph, Modifier.size(iconSize)) } },
            trailingIcon = icons["trailing-icon"]?.let { glyph -> { GalleryFieldGlyph(glyph, Modifier.size(iconSize)) } },
        )
    },
    "fab" to GalleryComponent(props = setOf("variant", "size", "disabled", "label")) {
        TanreiFloatingActionButton(
            onClick = onClick,
            contentDescription = fixture.string("label"),
            modifier = modifier,
            variant = TanreiFabVariant(fixture.string("variant")),
            size = TanreiFabSize(fixture.string("size")),
            enabled = !fixture.boolean("disabled"),
        ) {
            GalleryNamedGlyph(fixture.content.orEmpty())
        }
    },
    "extended-fab" to GalleryComponent(props = setOf("variant", "size", "expanded", "disabled", "label")) {
        // A fixture without content has no icon (and so cannot collapse, EFB-15).
        TanreiExtendedFloatingActionButton(
            text = fixture.string("label"),
            onClick = onClick,
            modifier = modifier,
            variant = TanreiExtendedFabVariant(fixture.string("variant")),
            size = TanreiExtendedFabSize(fixture.string("size")),
            expanded = fixture.boolean("expanded"),
            enabled = !fixture.boolean("disabled"),
            icon = fixture.content?.let { name -> { GalleryNamedGlyph(name) } },
        )
    },
    "chip" to GalleryComponent(props = setOf("kind", "variant", "size", "selected", "disabled", "label", "removeLabel")) {
        // The kind is the overload (`platforms.compose`). A filter chip really switches; `content` names the leading
        // glyph, or `avatar` — a neutral grey square, as the library's baselines draw.
        val variant = TanreiChipVariant(fixture.string("variant"))
        val size = TanreiChipSize(fixture.string("size"))
        val enabled = !fixture.boolean("disabled")
        val content = fixture.content
        val icon: (@Composable () -> Unit)? = content?.takeIf { it != "avatar" }?.let { name -> { GalleryNamedGlyph(name) } }
        when (fixture.string("kind")) {
            "filter" -> {
                var selected by remember(fixture) { mutableStateOf(fixture.boolean("selected")) }
                TanreiChip(selected = selected, onSelectedChange = { selected = it }, label = fixture.string("label"), modifier = modifier, variant = variant, size = size, enabled = enabled, onClick = onClick, icon = icon)
            }
            "input" -> TanreiChip(
                onClick = onClick,
                onRemove = {},
                label = fixture.string("label"),
                removeContentDescription = fixture.string("removeLabel"),
                modifier = modifier,
                variant = variant,
                size = size,
                enabled = enabled,
                icon = icon,
                avatar = if (content == "avatar") { { Box(Modifier.fillMaxSize().background(GalleryAvatarGrey)) } } else null,
            )
            else -> TanreiChip(onClick = onClick, label = fixture.string("label"), modifier = modifier, variant = variant, size = size, enabled = enabled, icon = icon)
        }
    },
    "list" to GalleryComponent(props = setOf("selection", "label", "value", "values")) {
        // It really selects: the fixture's value or values are where it starts. The list is given a stage (the page's widest
        // spacing step, four times), and each item comes from the fixture's items. An avatar holds the
        // headline's first letter; an image is empty.
        val mode = TanreiListSelectionMode.entries.single { it.name.lowercase() == fixture.string("selection") }
        var value by remember(fixture) { mutableStateOf(fixture.props["value"] as? String) }
        @Suppress("UNCHECKED_CAST")
        var values by remember(fixture) { mutableStateOf((fixture.props["values"] as List<String>).toSet()) }
        TanreiList(
            modifier = modifier.width(TanreiTheme.tokens.space.space900 * 4),
            selectionMode = mode,
            contentDescription = fixture.string("label"),
            selectedValue = value,
            selectedValues = values,
            onSelectionChange = { if (mode == TanreiListSelectionMode.Single) value = it.single() else values = it; onClick() },
        ) {
            for (item in fixture.items) {
                val media = TanreiListLeadingMedia.entries.single { it.name.lowercase() == item.string("leadingMedia") }
                val headline = item.string("headline")
                TanreiListItem(
                    headline = headline,
                    value = item.string("value"),
                    overline = item.string("overline"),
                    supportingText = item.string("supportingText"),
                    supportingMaxLines = item.int("supportingMaxLines"),
                    trailingText = item.string("trailingText"),
                    leadingMedia = media,
                    enabled = !item.boolean("disabled"),
                    divider = item.boolean("divider"),
                    onClick = if (item.boolean("interactive")) onClick else null,
                    leadingIcon = item.string("leadingIcon").takeIf { it.isNotEmpty() }?.let { name -> { GalleryNamedGlyph(name) } },
                    trailingIcon = item.string("trailingIcon").takeIf { it.isNotEmpty() }?.let { name -> { GalleryNamedGlyph(name) } },
                    leadingContent = if (media == TanreiListLeadingMedia.Avatar) { { TanreiText(headline.take(1)) } } else null,
                )
            }
        }
    },
    "menu" to GalleryComponent(props = setOf("open", "placement")) {
        // The anchor is a Tanrei button; pressing it opens the fixture's menu at the fixture's placement. Every menu starts
        // closed — a page of open popups would cover itself —, so the fixture's `open` is where the anchor takes it. The
        // items come from the fixture: checkbox items really switch, a group's radio items really choose.
        val placement = TanreiMenuPlacement.entries.single { it.name.replace(Regex("([a-z])([A-Z])"), "$1-$2").lowercase() == fixture.string("placement") }
        var expanded by remember(fixture) { mutableStateOf(false) }
        Box {
            TanreiButton(
                text = "Open menu",
                onClick = { expanded = fixture.boolean("open") || !expanded },
                modifier = modifier,
                variant = TanreiButtonVariant.Outlined,
                size = TanreiButtonSize.Small,
            )
            TanreiMenu(expanded = expanded, onDismissRequest = { expanded = false }, placement = placement) {
                for (item in fixture.items) GalleryMenuItem(item, onClick)
            }
        }
    },
    "tabs" to GalleryComponent(props = setOf("variant", "scrollable", "selected", "label")) {
        // It really selects: the fixture's `selected` is where it starts. The row is given a stage (the page's widest spacing
        // step, four times), and each tab comes from the fixture's items. No panel: the fixtures draw none.
        var value by remember(fixture) { mutableStateOf(fixture.props["selected"] as? String) }
        TanreiTabs(
            selectedValue = value,
            onSelectedValueChange = { value = it; onClick() },
            modifier = modifier.width(TanreiTheme.tokens.space.space900 * 4),
            variant = TanreiTabsVariant(fixture.string("variant")),
            scrollable = fixture.boolean("scrollable"),
            contentDescription = fixture.string("label"),
        ) {
            for (item in fixture.items) {
                TanreiTab(
                    value = item.string("value"),
                    label = item.string("label"),
                    labelHidden = item.boolean("labelHidden"),
                    enabled = !item.boolean("disabled"),
                    icon = item.string("icon").takeIf { it.isNotEmpty() }?.let { name -> { GalleryNamedGlyph(name) } },
                )
            }
        }
    },
    "button-group" to GalleryComponent(props = setOf("variant", "label")) {
        // Each item is a Tanrei Button (its content the label) or icon button (its content the glyph); toggles really switch.
        TanreiButtonGroup(
            modifier = modifier,
            variant = TanreiButtonGroupVariant.entries.single { it.name.lowercase() == fixture.string("variant") },
            contentDescription = fixture.string("label"),
        ) {
            for (item in fixture.items) {
                when (item.kind) {
                    "button" -> TanreiButton(
                        text = item.content.orEmpty(),
                        onClick = onClick,
                        variant = TanreiButtonVariant(item.string("variant")),
                        size = TanreiButtonSize(item.string("size")),
                        enabled = !item.boolean("disabled"),
                    )
                    "icon-button" -> {
                        var checked by remember(item) { mutableStateOf(item.boolean("selected")) }
                        TanreiIconButton(
                            onClick = onClick,
                            contentDescription = item.string("label"),
                            variant = TanreiIconButtonVariant(item.string("variant")),
                            size = TanreiIconButtonSize(item.string("size")),
                            checked = checked,
                            onCheckedChange = if (item.boolean("toggle")) { value -> checked = value } else null,
                            enabled = !item.boolean("disabled"),
                        ) { GalleryNamedGlyph(item.content.orEmpty()) }
                    }
                    else -> error("button-group: unknown item kind '${item.kind}'")
                }
            }
        }
    },
    "fab-menu" to GalleryComponent(props = setOf("variant", "size", "open", "label", "disabled")) {
        // The toggle really opens its items, from the fixture's items. Every FAB menu starts closed — a page of
        // open popups would cover itself —, as the menu's fixtures do; the library's baselines draw the open ones in place.
        var expanded by remember(fixture) { mutableStateOf(false) }
        TanreiFabMenu(
            expanded = expanded,
            onExpandedChange = { expanded = it },
            onDismissRequest = { expanded = false },
            contentDescription = fixture.string("label"),
            icon = gallerySlot(fixture.slots["icon"]) ?: {},
            modifier = modifier,
            variant = TanreiFabMenuVariant(fixture.string("variant")),
            size = TanreiFabMenuSize(fixture.string("size")),
            enabled = !fixture.boolean("disabled"),
        ) {
            for (item in fixture.items) TanreiFabMenuItem(text = item.string("label"), onClick = onClick, icon = item.string("icon"))
        }
    },
    "segmented-button" to GalleryComponent(props = setOf("selection", "value", "values", "size", "label")) {
        // It really selects: the fixture's value or values are where it starts; each segment comes from the fixture's items.
        val mode = TanreiSegmentedButtonSelectionMode.entries.single { it.name.lowercase() == fixture.string("selection") }
        var value by remember(fixture) { mutableStateOf(fixture.props["value"] as? String) }
        @Suppress("UNCHECKED_CAST")
        var values by remember(fixture) { mutableStateOf((fixture.props["values"] as List<String>).toSet()) }
        TanreiSegmentedButton(
            onSelectionChange = { if (mode == TanreiSegmentedButtonSelectionMode.Single) value = it.single() else values = it; onClick() },
            contentDescription = fixture.string("label"),
            modifier = modifier,
            selectionMode = mode,
            selectedValue = value,
            selectedValues = values,
            size = TanreiSegmentedButtonSize(fixture.string("size")),
        ) {
            for (item in fixture.items) {
                TanreiSegment(
                    value = item.string("value"),
                    label = item.string("label"),
                    labelHidden = item.boolean("labelHidden"),
                    enabled = !item.boolean("disabled"),
                    icon = item.string("icon").takeIf { it.isNotEmpty() }?.let { name -> { GalleryNamedGlyph(name) } },
                )
            }
        }
    },
    "search" to GalleryComponent(props = setOf("presentation", "value", "label", "placeholder", "expanded", "disabled", "clearLabel", "backLabel")) {
        // It really searches: the value is the fixture's to start with, a press or typing opens the view with the fixture's
        // suggestions, and choosing one puts its headline in the bar. Every search starts closed — a full-screen view would
        // cover the page, and a docked one the fixtures under it —; the library's baselines draw the open ones in place.
        var value by remember(fixture) { mutableStateOf(fixture.string("value")) }
        var expanded by remember(fixture) { mutableStateOf(false) }
        TanreiSearch(
            value = value,
            onValueChange = { value = it },
            expanded = expanded,
            onExpandedChange = { open, _ -> expanded = open },
            label = fixture.string("label"),
            modifier = modifier.width(TanreiTheme.tokens.space.space900 * 4),
            presentation = if (fixture.string("presentation") == "full-screen") TanreiSearchPresentation.FullScreen else TanreiSearchPresentation.Docked,
            placeholder = fixture.string("placeholder"),
            enabled = !fixture.boolean("disabled"),
            clearLabel = fixture.string("clearLabel"),
            backLabel = fixture.string("backLabel"),
            onSearch = { onClick() },
            onSelect = { chosen -> fixture.items.firstOrNull { it.string("value") == chosen }?.let { value = it.string("headline") }; onClick() },
            leading = gallerySlot(fixture.slots["leading"]),
            trailing = gallerySlot(fixture.slots["trailing"]),
        ) {
            for (item in fixture.items) {
                TanreiSearchSuggestion(value = item.string("value"), headline = item.string("headline"), supportingText = item.string("supportingText"), leadingIcon = item.string("leadingIcon"))
            }
        }
    },
    "slider" to GalleryComponent(props = setOf("size", "orientation", "value", "startValue", "range", "min", "max", "step", "origin", "stops", "valueIndicator", "disabled", "label", "startLabel", "valueText", "startValueText")) {
        // It really slides: the fixture's value (and start value) is where it starts. A horizontal slider gets a stage (the
        // page's widest spacing step, four times), a vertical one half that as its height.
        fun number(name: String) = (fixture.props[name] as Number).toFloat()
        val vertical = fixture.string("orientation") == "vertical"
        val orientation = if (vertical) Orientation.Vertical else Orientation.Horizontal
        val stage = TanreiTheme.tokens.space.space900 * 4
        val sized = if (vertical) modifier.height(stage / 2) else modifier.width(stage)
        val indicator = TanreiSliderValueIndicator.entries.single { it.name.lowercase() == fixture.string("valueIndicator") }
        val bounds = number("min")..number("max")
        if (fixture.boolean("range")) {
            var span by remember(fixture) { mutableStateOf(number("startValue")..number("value")) }
            TanreiSlider(
                value = span,
                onValueChange = { span = it },
                contentDescription = fixture.string("label"),
                startContentDescription = fixture.string("startLabel"),
                modifier = sized,
                enabled = !fixture.boolean("disabled"),
                valueRange = bounds,
                step = number("step"),
                showStops = fixture.boolean("stops"),
                size = TanreiSliderSize(fixture.string("size")),
                orientation = orientation,
                valueIndicator = indicator,
                stateDescription = fixture.string("valueText"),
                startStateDescription = fixture.string("startValueText"),
                onValueChangeFinished = { onClick() },
            )
        } else {
            var value by remember(fixture) { mutableStateOf(number("value")) }
            TanreiSlider(
                value = value,
                onValueChange = { value = it },
                contentDescription = fixture.string("label"),
                modifier = sized,
                enabled = !fixture.boolean("disabled"),
                valueRange = bounds,
                step = number("step"),
                origin = (fixture.props["origin"] as? Number)?.toFloat(),
                showStops = fixture.boolean("stops"),
                size = TanreiSliderSize(fixture.string("size")),
                orientation = orientation,
                valueIndicator = indicator,
                stateDescription = fixture.string("valueText"),
                onValueChangeFinished = { onClick() },
            )
        }
    },
    "toolbar" to GalleryComponent(props = setOf("variant", "orientation", "label")) {
        // One fixture among many, not the screen's bottom edge: a docked toolbar gets a stage (the page's widest spacing
        // step, four times) and no system insets. Its items are the fixture's Tanrei icon buttons (toggles really switch)
        // and Buttons; the toolbar is one Tab stop, the arrow keys moving among them.
        val floating = TanreiToolbarVariant(fixture.string("variant")) == TanreiToolbarVariant.Floating
        TanreiToolbar(
            contentDescription = fixture.string("label"),
            modifier = if (floating) modifier else modifier.width(TanreiTheme.tokens.space.space900 * 4),
            variant = TanreiToolbarVariant(fixture.string("variant")),
            orientation = Orientation.entries.single { it.name.lowercase() == fixture.string("orientation") },
            windowInsets = WindowInsets(0, 0, 0, 0),
        ) {
            for (item in fixture.items) {
                when (item.kind) {
                    "action" -> {
                        var checked by remember(item) { mutableStateOf(item.boolean("selected")) }
                        TanreiIconButton(
                            onClick = onClick,
                            contentDescription = item.string("label"),
                            variant = TanreiIconButtonVariant(item.string("variant")),
                            checked = checked,
                            onCheckedChange = if (item.boolean("toggle")) { value -> checked = value } else null,
                            enabled = !item.boolean("disabled"),
                        ) { GalleryNamedGlyph(item.content.orEmpty()) }
                    }
                    "button" -> TanreiButton(
                        text = item.content.orEmpty(),
                        onClick = onClick,
                        variant = TanreiButtonVariant(item.string("variant")),
                        enabled = !item.boolean("disabled"),
                    )
                    else -> error("toolbar: unknown item kind '${item.kind}'")
                }
            }
        }
    },
    "split-button" to GalleryComponent(props = setOf("variant", "size", "label", "menuLabel", "open", "disabled")) {
        // The chevron really toggles, from the fixture's `open`. A fixture cannot fill the menu slot (SPB-15), so the menu is
        // empty and none is presented (SPB-20): the open form shows alone.
        var open by remember(fixture) { mutableStateOf(fixture.boolean("open")) }
        TanreiSplitButton(
            text = fixture.string("label"),
            onClick = onClick,
            menuContentDescription = fixture.string("menuLabel"),
            menuExpanded = open,
            onMenuExpandedChange = { open = it },
            onMenuDismissRequest = { open = false },
            modifier = modifier,
            variant = TanreiSplitButtonVariant(fixture.string("variant")),
            size = TanreiSplitButtonSize(fixture.string("size")),
            enabled = !fixture.boolean("disabled"),
            icon = gallerySlot(fixture.slots["icon"]),
        ) {}
    },
    "tooltip" to GalleryComponent(props = setOf("variant", "text", "title", "placement", "describes", "open")) {
        // The anchor is a medium standard icon button named after the fixture's glyph. Every tooltip starts closed — at
        // most one is open in a window (TIP-8), so a page of fixtures cannot show them all, and the fixture's `open` is
        // what the library's baselines draw —; hover, keyboard focus or a long-press opens it.
        val glyph = fixture.content.orEmpty()
        val state = rememberTanreiTooltipState()
        TanreiTooltip(
            text = fixture.string("text"),
            modifier = modifier,
            variant = TanreiTooltipVariant.entries.single { it.name.lowercase() == fixture.string("variant") },
            title = fixture.string("title"),
            placement = TanreiTooltipPlacement.entries.single { it.name.lowercase() == fixture.string("placement") },
            describes = fixture.boolean("describes"),
            state = state,
        ) {
            TanreiIconButton(onClick = onClick, contentDescription = glyph, variant = TanreiIconButtonVariant.Standard, size = TanreiIconButtonSize.Medium) {
                GalleryNamedGlyph(glyph)
            }
        }
    },
    "snackbar" to GalleryComponent(props = setOf("message", "action", "closable", "closeLabel", "duration")) {
        // Drawn in place (SNK-19), as the baselines draw it: no host, no timeout, no queue. Its action and close report
        // through onResult, counted as the fixture's click.
        TanreiSnackbar(
            message = fixture.string("message"),
            modifier = modifier,
            actionLabel = fixture.string("action"),
            withDismissAction = fixture.boolean("closable"),
            closeLabel = fixture.string("closeLabel"),
            duration = TanreiSnackbarDuration.entries.single { it.name.lowercase() == fixture.string("duration") },
            onResult = { onClick() },
        )
    },
    "dialog" to GalleryComponent(props = setOf("open", "headline", "supportingText", "alert", "dismissible")) {
        // A button opens the fixture's dialog — every dialog starts closed, a page of open modal windows would block
        // itself; the fixture's `open` is where the button takes it. The fixture's actions close it (actions never close
        // a dialog by themselves, DLG-6: the gallery does it from their handler); so does dismiss while the fixture is
        // dismissible. A fixture's content is text.
        var visible by remember(fixture) { mutableStateOf(false) }
        TanreiButton(text = "Open dialog", onClick = { visible = fixture.boolean("open") || !visible }, modifier = modifier, variant = TanreiButtonVariant.Outlined, size = TanreiButtonSize.Small)
        TanreiDialog(
            visible = visible,
            onDismissRequest = { visible = false },
            headline = fixture.string("headline"),
            supportingText = fixture.string("supportingText"),
            alert = fixture.boolean("alert"),
            dismissible = fixture.boolean("dismissible"),
            // The fixture's slots: its icon glyph and its actions, each of which closes the dialog.
            icon = gallerySlot(fixture.slots["icon"]),
            actions = gallerySlot(fixture.slots["actions"]) { onClick(); visible = false },
            content = fixture.content?.let { text -> { TanreiText(text) } },
        )
    },
    "app-bar" to GalleryComponent(props = setOf("size", "title", "subtitle", "titleAlignment", "scrolled")) {
        // One fixture among many, not the screen's top edge: a stage (the page's widest spacing step, four times) and no
        // system insets. Its items are standard medium icon buttons in their slots; `scrolled` is a state
        // created scrolled and collapsed (`platforms.compose`).
        val scrolled = fixture.boolean("scrolled")
        val state = rememberTanreiAppBarState(initialCollapsedOffset = if (scrolled) Float.POSITIVE_INFINITY else 0f, initialContentOffset = if (scrolled) 1f else 0f)
        val navigation = fixture.items.filter { it.kind == "navigation" }
        val actions = fixture.items.filter { it.kind == "action" }
        val item: @Composable (GalleryItem) -> Unit = { entry ->
            TanreiIconButton(onClick = onClick, contentDescription = entry.string("label"), variant = TanreiIconButtonVariant.Standard, size = TanreiIconButtonSize.Medium) {
                GalleryNamedGlyph(entry.content.orEmpty())
            }
        }
        TanreiAppBar(
            title = fixture.string("title"),
            modifier = modifier.width(TanreiTheme.tokens.space.space900 * 4),
            navigationIcon = if (navigation.isEmpty()) null else { { navigation.forEach { item(it) } } },
            actions = if (actions.isEmpty()) null else { { actions.forEach { item(it) } } },
            subtitle = fixture.string("subtitle"),
            size = TanreiAppBarSize(fixture.string("size")),
            titleAlignment = TanreiAppBarTitleAlignment.entries.single { it.name.lowercase() == fixture.string("titleAlignment") },
            scrollBehavior = if (scrolled) TanreiAppBarDefaults.collapseScrollBehavior(state) else null,
            windowInsets = WindowInsets(0, 0, 0, 0),
        )
    },
    "navigation-bar" to GalleryComponent(props = setOf("value", "labelVisibility", "label")) {
        // It really selects: the fixture's `value` is where it starts, and each destination comes from the fixture's items,
        // marked `selected` by value (`platforms.compose`). A stage (the page's widest spacing step, four times)
        // and no system insets. The icons are glyph NAMES: without the icon font installed they draw as clipped text.
        var value by remember(fixture) { mutableStateOf(fixture.string("value")) }
        TanreiNavigationBar(
            modifier = modifier.width(TanreiTheme.tokens.space.space900 * 4),
            labelVisibility = TanreiNavigationLabelVisibility.entries.single { it.name.lowercase() == fixture.string("labelVisibility") },
            contentDescription = fixture.string("label"),
            windowInsets = WindowInsets(0, 0, 0, 0),
        ) {
            for (item in fixture.items) {
                val destination = item.string("value")
                TanreiNavigationBarItem(
                    selected = destination == value,
                    onClick = { value = destination; onClick() },
                    icon = item.string("icon"),
                    label = item.string("label"),
                    enabled = !item.boolean("disabled"),
                    badge = if (item.boolean("badge")) TanreiNavigationBadge(count = (item.props["badgeCount"] as? Number)?.toInt(), contentDescription = item.string("badgeLabel")) else null,
                )
            }
        }
    },
    "navigation-rail" to GalleryComponent(props = setOf("value", "labelVisibility", "label")) {
        // As the navigation bar's entry, in a stage of the page's widest spacing step five times high; header-button items
        // are standard medium icon buttons in the header (they go there wherever they stand among the items).
        var value by remember(fixture) { mutableStateOf(fixture.string("value")) }
        val headerButtons = fixture.items.filter { it.kind == "header-button" }
        TanreiNavigationRail(
            modifier = modifier.height(TanreiTheme.tokens.space.space900 * 5),
            header = if (headerButtons.isEmpty()) null else {
                {
                    for (button in headerButtons) {
                        TanreiIconButton(onClick = onClick, contentDescription = button.string("label"), variant = TanreiIconButtonVariant.Standard, size = TanreiIconButtonSize.Medium) {
                            GalleryNamedGlyph(button.content.orEmpty())
                        }
                    }
                }
            },
            labelVisibility = TanreiNavigationLabelVisibility.entries.single { it.name.lowercase() == fixture.string("labelVisibility") },
            contentDescription = fixture.string("label"),
            windowInsets = WindowInsets(0, 0, 0, 0),
        ) {
            for (item in fixture.items.filter { it.kind == "destination" }) {
                val destination = item.string("value")
                TanreiNavigationRailItem(
                    selected = destination == value,
                    onClick = { value = destination; onClick() },
                    icon = item.string("icon"),
                    label = item.string("label"),
                    enabled = !item.boolean("disabled"),
                    badge = if (item.boolean("badge")) TanreiNavigationBadge(count = (item.props["badgeCount"] as? Number)?.toInt(), contentDescription = item.string("badgeLabel")) else null,
                )
            }
        }
    },
    "navigation-drawer" to GalleryComponent(props = setOf("variant", "open", "value", "label")) {
        // It really selects, and really opens and closes. A standard fixture is the drawer beside an empty content area in a
        // stage (the page's widest spacing step, six by seven), open as the fixture says; a modal one is opened from a
        // button in that area — a page of open modal windows would block itself. Items and sections come from the
        // fixture's items.
        val space = TanreiTheme.tokens.space.space900
        val variant = TanreiNavigationDrawerVariant(fixture.string("variant"))
        val modal = variant == TanreiNavigationDrawerVariant.Modal
        val state = rememberTanreiDrawerState(if (fixture.boolean("open") && !modal) TanreiDrawerValue.Open else TanreiDrawerValue.Closed)
        var value by remember(fixture) { mutableStateOf(fixture.string("value")) }
        TanreiNavigationDrawer(
            drawerContent = { for (item in fixture.items) GalleryDrawerItem(item, value) { value = it; onClick() } },
            modifier = modifier.size(space * 6, space * 7),
            variant = variant,
            drawerState = state,
            contentDescription = fixture.string("label"),
            windowInsets = WindowInsets(0, 0, 0, 0),
        ) {
            Box(Modifier.fillMaxSize()) {
                TanreiButton(text = if (state.isOpen) "Close drawer" else "Open drawer", onClick = { if (state.isOpen) state.close() else state.open() }, variant = TanreiButtonVariant.Text, size = TanreiButtonSize.Small)
            }
        }
    },
    "bottom-sheet" to GalleryComponent(props = setOf("variant", "open", "detent", "dismissible", "handle", "handleLabel", "inset", "label")) {
        // It really opens, closes and changes height: the gallery sets `visible` to false from onClose and keeps the
        // detent the person chose. A stage (the page's widest spacing step, five by six) with a button that opens and
        // closes it; a standard fixture starts open as the fixture says, over the stage's bottom; a modal one starts
        // closed — a page of open modal windows would block itself. A fixture's content is text.
        val space = TanreiTheme.tokens.space.space900
        val variant = TanreiBottomSheetVariant.entries.single { it.name.lowercase() == fixture.string("variant") }
        val modal = variant == TanreiBottomSheetVariant.Modal
        var visible by remember(fixture) { mutableStateOf(fixture.boolean("open") && !modal) }
        var detent by remember(fixture) { mutableStateOf(TanreiBottomSheetDetent.entries.single { it.name.lowercase() == fixture.string("detent") }) }
        Box(modifier.size(space * 5, space * 6)) {
            TanreiButton(text = if (visible) "Close sheet" else "Open sheet", onClick = { visible = !visible }, variant = TanreiButtonVariant.Text, size = TanreiButtonSize.Small)
            TanreiBottomSheet(
                visible = visible,
                onClose = { visible = false; onClick() },
                variant = variant,
                detent = detent,
                onDetentChange = { detent = it },
                dismissible = fixture.boolean("dismissible"),
                handle = fixture.boolean("handle"),
                handleLabel = fixture.string("handleLabel"),
                inset = fixture.boolean("inset"),
                contentDescription = fixture.string("label"),
            ) { fixture.content?.let { TanreiText(it) } }
        }
    },
    "side-sheet" to GalleryComponent(props = setOf("variant", "open", "headline", "closable", "closeLabel")) {
        // It really opens and closes: the gallery sets `visible` to false from onClose. A stage (the page's widest spacing
        // step, eleven by seven) holding a row of an empty area with a button that opens and closes the sheet; a standard
        // fixture sits at the row's end, open as the fixture says; a modal one starts closed — a page of open modal windows
        // would block itself. The fixture's actions are text Buttons, each of which closes the sheet.
        val space = TanreiTheme.tokens.space.space900
        val variant = TanreiSideSheetVariant(fixture.string("variant"))
        val modal = variant == TanreiSideSheetVariant.Modal
        var visible by remember(fixture) { mutableStateOf(fixture.boolean("open") && !modal) }
        val actions = gallerySlot(fixture.slots["actions"]) { onClick(); visible = false }
        val sheet: @Composable () -> Unit = {
            TanreiSideSheet(
                visible = visible,
                onClose = { visible = false; onClick() },
                headline = fixture.string("headline"),
                variant = variant,
                closable = fixture.boolean("closable"),
                closeLabel = fixture.string("closeLabel"),
                actions = actions?.let { slot -> { slot() } },
            ) { fixture.content?.let { TanreiText(it) } }
        }
        Row(modifier.size(space * 11, space * 7)) {
            Box(Modifier.weight(1f).fillMaxHeight()) {
                TanreiButton(text = if (visible) "Close sheet" else "Open sheet", onClick = { visible = !visible }, variant = TanreiButtonVariant.Text, size = TanreiButtonSize.Small)
            }
            if (!modal) sheet()
        }
        if (modal) sheet()
    },
    "carousel" to GalleryComponent(props = setOf("layout", "itemWidth", "label")) {
        // A stage (the page's widest spacing step, six by three) the carousel fills; its items come from the fixture's
        // items, each one's glyph NAME drawn at the large icon size through the icon helper, and each click
        // counted. The icons draw as a stand-in: no icon font is bundled.
        val space = TanreiTheme.tokens.space.space900
        val layout = TanreiCarouselLayout.entries.single { it.name.lowercase() == fixture.string("layout").replace("-", "") }
        val itemWidth = (fixture.props["itemWidth"] as? Number)?.toFloat()?.dp
        val items = fixture.items
        TanreiCarousel(
            itemCount = items.size,
            contentDescription = fixture.string("label"),
            modifier = modifier.size(space * 6, space * 3),
            layout = layout,
            itemWidth = itemWidth,
        ) { index ->
            val item = items[index]
            TanreiCarouselItem(label = item.string("label"), onClick = onClick) {
                val size = TanreiTheme.tokens.measure.iconLarge
                val glyph = TanreiTheme.tokens.icon.glyph(size, selected = false)
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CompositionLocalProvider(LocalTanreiIconGlyph provides glyph) {
                        Box(Modifier.size(size)) { GalleryNamedGlyph(item.content.orEmpty()) }
                    }
                }
            }
        }
    },
    "date-picker" to GalleryComponent(
        props = setOf(
            "open", "presentation", "mode", "value", "start", "end", "min", "max", "disabledDates", "today", "firstDayOfWeek", "locale",
            "entryMode", "startView", "label", "dateLabel", "startLabel", "endLabel", "confirmLabel", "cancelLabel", "previousMonthLabel",
            "nextMonthLabel", "yearViewLabel", "textEntryLabel", "calendarEntryLabel", "todayLabel", "invalidText", "unavailableText",
        ),
    ) {
        // A button opens the fixture's picker — every picker starts closed: a page of open modal windows would block itself,
        // and open popups would cover it; the fixture's `open` is where the button takes it. A docked picker is placed below
        // that button, its anchor. The choice really changes: the gallery keeps what `onChange` commits and closes the picker
        // from `onClose`, counting each close. Days and years are generated: no fixture lists them.
        fun date(name: String): TanreiDate? = fixture.string(name).takeIf { it.isNotEmpty() }?.let { TanreiDate.parse(it) }
        fun <E : Enum<E>> closed(values: Array<E>, name: String): E = values.single { it.name.equals(fixture.string(name).replace("-", ""), ignoreCase = true) }
        var visible by remember(fixture) { mutableStateOf(false) }
        var selection by remember(fixture) { mutableStateOf(TanreiDateSelection(value = date("value"), start = date("start"), end = date("end"))) }
        val presentation = closed(TanreiDatePickerPresentation.entries.toTypedArray(), "presentation")
        Box {
            TanreiButton(
                text = "Open date picker",
                onClick = { visible = fixture.boolean("open") || !visible },
                modifier = modifier,
                variant = TanreiButtonVariant.Outlined,
                size = TanreiButtonSize.Small,
            )
            TanreiDatePicker(
                visible = visible,
                onClose = {
                    visible = false
                    onClick()
                },
                presentation = presentation,
                mode = closed(TanreiDatePickerMode.entries.toTypedArray(), "mode"),
                value = selection.value,
                start = selection.start,
                end = selection.end,
                onChange = { selection = it },
                min = date("min"),
                max = date("max"),
                disabledDates = (fixture.props["disabledDates"] as? List<*>).orEmpty().mapNotNull { (it as? String)?.let(TanreiDate::parse) }.toSet(),
                today = date("today"),
                firstDayOfWeek = closed(TanreiDatePickerFirstDayOfWeek.entries.toTypedArray(), "firstDayOfWeek"),
                locale = fixture.string("locale").takeIf { it.isNotEmpty() }?.let(java.util.Locale::forLanguageTag),
                entryMode = closed(TanreiDatePickerEntryMode.entries.toTypedArray(), "entryMode"),
                startView = closed(TanreiDatePickerStartView.entries.toTypedArray(), "startView"),
                labels = TanreiDatePickerLabels(
                    label = fixture.string("label"),
                    dateLabel = fixture.string("dateLabel"),
                    startLabel = fixture.string("startLabel"),
                    endLabel = fixture.string("endLabel"),
                    confirmLabel = fixture.string("confirmLabel"),
                    cancelLabel = fixture.string("cancelLabel"),
                    previousMonthLabel = fixture.string("previousMonthLabel"),
                    nextMonthLabel = fixture.string("nextMonthLabel"),
                    yearViewLabel = fixture.string("yearViewLabel"),
                    textEntryLabel = fixture.string("textEntryLabel"),
                    calendarEntryLabel = fixture.string("calendarEntryLabel"),
                    todayLabel = fixture.string("todayLabel"),
                    invalidText = fixture.string("invalidText"),
                    unavailableText = fixture.string("unavailableText"),
                ),
            )
        }
    },
    "time-picker" to GalleryComponent(
        props = setOf(
            "open", "value", "hourCycle", "entryMode", "unit", "layout", "locale", "label", "hourLabel", "minuteLabel", "confirmLabel",
            "cancelLabel", "textEntryLabel", "dialEntryLabel", "invalidText",
        ),
    ) {
        // A button opens the fixture's picker — every picker starts closed: a page of open modal windows would block itself;
        // the fixture's `open` is where the button takes it. The time really changes: the gallery keeps what `onChange`
        // commits and closes the picker from `onClose`, counting each close. The dial's numbers are not items.
        fun <E : Enum<E>> closed(values: Array<E>, name: String): E = values.single { it.name.equals(fixture.string(name).replace("-", ""), ignoreCase = true) }
        var visible by remember(fixture) { mutableStateOf(false) }
        var time by remember(fixture) { mutableStateOf(fixture.string("value").takeIf { it.isNotEmpty() }?.let { TanreiTime.parse(it) }) }
        Box {
            TanreiButton(
                text = "Open time picker",
                onClick = { visible = fixture.boolean("open") || !visible },
                modifier = modifier,
                variant = TanreiButtonVariant.Outlined,
                size = TanreiButtonSize.Small,
            )
            TanreiTimePicker(
                visible = visible,
                onClose = {
                    visible = false
                    onClick()
                },
                value = time,
                onChange = { time = it },
                hourCycle = closed(TanreiTimePickerHourCycle.entries.toTypedArray(), "hourCycle"),
                entryMode = closed(TanreiTimePickerEntryMode.entries.toTypedArray(), "entryMode"),
                unit = closed(TanreiTimePickerUnit.entries.toTypedArray(), "unit"),
                layout = closed(TanreiTimePickerLayout.entries.toTypedArray(), "layout"),
                locale = fixture.string("locale").takeIf { it.isNotEmpty() }?.let(java.util.Locale::forLanguageTag),
                labels = TanreiTimePickerLabels(
                    label = fixture.string("label"),
                    hourLabel = fixture.string("hourLabel"),
                    minuteLabel = fixture.string("minuteLabel"),
                    confirmLabel = fixture.string("confirmLabel"),
                    cancelLabel = fixture.string("cancelLabel"),
                    textEntryLabel = fixture.string("textEntryLabel"),
                    dialEntryLabel = fixture.string("dialEntryLabel"),
                    invalidText = fixture.string("invalidText"),
                ),
            )
        }
    },
    "loading-indicator" to GalleryComponent(props = setOf("size", "contained", "label")) {
        // `contained` is a second composable on Compose.
        val size = TanreiLoadingIndicatorSize(fixture.string("size"))
        if (fixture.boolean("contained")) {
            TanreiContainedLoadingIndicator(contentDescription = fixture.string("label"), modifier = modifier, size = size)
        } else {
            TanreiLoadingIndicator(contentDescription = fixture.string("label"), modifier = modifier, size = size)
        }
    },
)

/**
 * What the gallery draws for a fixture's icon (`"favorite"`): Tanrei bundles no icon font, and without one the
 * platform font would draw the ligature's NAME. A heart filling the icon box, filled where the glyph's `FILL` is on
 * and outlined where it is off, stroked by its weight, in the icon color the slot provides — read through the public
 * `LocalTanreiIconGlyph` and `LocalTanreiContentColor`, as an app's own icon would. The same stand-in the library's
 * baselines draw (`TanreiIconButtonSnapshotTest.FixtureGlyph`).
 */
@Composable
private fun GalleryGlyph(@Suppress("UNUSED_PARAMETER") name: String) {
    val glyph = LocalTanreiIconGlyph.current
    val color = LocalTanreiContentColor.current
    Canvas(Modifier.fillMaxSize()) {
        val heart = heartPath(size)
        if (glyph.fill >= HALF) {
            drawPath(heart, color, style = Fill)
        } else {
            drawPath(heart, color, style = Stroke(width = size.minDimension * glyph.weight / STROKE_PER_WEIGHT, join = StrokeJoin.Round))
        }
    }
}

private const val HALF = 0.5f

/** The chip fixtures' stand-in avatar: one neutral grey (#9E9E9E), no person, no text. */
private val GalleryAvatarGrey = Color(0xFF9E9E9E)
private const val STROKE_PER_WEIGHT = 4000f

/** A heart inside a box of [size], with the margin an icon font leaves around its glyphs (1/12 of the box). */
private fun heartPath(size: Size): Path {
    val m = size.minDimension / 12f
    val w = size.width - 2 * m
    val h = size.height - 2 * m
    fun x(f: Float) = m + w * f
    fun y(f: Float) = m + h * f
    return Path().apply {
        moveTo(x(0.5f), y(0.92f))
        cubicTo(x(0.12f), y(0.64f), x(0f), y(0.42f), x(0.06f), y(0.24f))
        cubicTo(x(0.14f), y(0.02f), x(0.42f), y(0.02f), x(0.5f), y(0.24f))
        cubicTo(x(0.58f), y(0.02f), x(0.86f), y(0.02f), x(0.94f), y(0.24f))
        cubicTo(x(1f), y(0.42f), x(0.88f), y(0.64f), x(0.5f), y(0.92f))
        close()
    }
}

/**
 * What the gallery draws for a text-field fixture's icon (`"search"`: a magnifier; anything else, `"close"`: a cross),
 * stroked by the glyph's weight in the icon color the slot provides, read through the public `LocalTanreiIconGlyph` and
 * `LocalTanreiContentColor`. The same stand-in the library's baselines draw (`TanreiTextFieldSnapshotTest.FieldGlyph`).
 */
@Composable
private fun GalleryFieldGlyph(name: String, modifier: Modifier) {
    val glyph = LocalTanreiIconGlyph.current
    val color = LocalTanreiContentColor.current
    Canvas(modifier) {
        val stroke = size.minDimension * glyph.weight / STROKE_PER_WEIGHT
        fun at(x: Float, y: Float) = Offset(size.width * x, size.height * y)
        if (name == "search") {
            drawCircle(color, radius = size.minDimension * 0.27f, center = at(0.42f, 0.42f), style = Stroke(stroke))
            drawLine(color, at(0.62f, 0.62f), at(0.82f, 0.82f), stroke, StrokeCap.Round)
        } else {
            drawLine(color, at(0.28f, 0.28f), at(0.72f, 0.72f), stroke, StrokeCap.Round)
            drawLine(color, at(0.72f, 0.28f), at(0.28f, 0.72f), stroke, StrokeCap.Round)
        }
    }
}

/**
 * What the gallery draws for a switch fixture's glyph (`"check"`, `"close"`): a check or a cross stroked by the glyph's
 * weight in the icon color the handle provides, read through the public `LocalTanreiIconGlyph` and
 * `LocalTanreiContentColor`. The same stand-in the library's baselines draw (`TanreiSwitchSnapshotTest.SwitchGlyph`).
 */
@Composable
private fun GallerySwitchGlyph(name: String) {
    val glyph = LocalTanreiIconGlyph.current
    val color = LocalTanreiContentColor.current
    Canvas(Modifier.fillMaxSize()) {
        val stroke = size.minDimension * glyph.weight / STROKE_PER_WEIGHT
        fun at(x: Float, y: Float) = Offset(size.width * x, size.height * y)
        if (name == "close") {
            drawLine(color, at(0.25f, 0.25f), at(0.75f, 0.75f), stroke, StrokeCap.Round)
            drawLine(color, at(0.75f, 0.25f), at(0.25f, 0.75f), stroke, StrokeCap.Round)
        } else {
            drawLine(color, at(0.2f, 0.52f), at(0.4f, 0.72f), stroke, StrokeCap.Round)
            drawLine(color, at(0.4f, 0.72f), at(0.8f, 0.3f), stroke, StrokeCap.Round)
        }
    }
}

/**
 * What the gallery draws for the FAB's, the extended FAB's, the chip's, the list's, the menu's and the tabs' glyphs (`add` a plus, `edit` a pencil, `event`
 * a calendar, `check` a check mark, `close` a cross, `chevron_right` a chevron, `dashboard` four tiles, `history` a clock, `settings` a cog, `info` a circled i, `view_list` a list, `grid_view` four tiles, `map` a folded map, `format_align_*` four lines, `format_bold` / `format_italic` / `format_underlined` text marks, `save` a floppy disk —
 * the tiles, the clock and the cog filled while the glyph's `FILL` is on; anything else a plus), stroked by the glyph's weight in the icon
 * color the slot provides, read through the public `LocalTanreiIconGlyph` and `LocalTanreiContentColor`. The same
 * stand-in the library's baselines draw (`NamedFixtureGlyph`).
 */
@Composable
private fun GalleryNamedGlyph(name: String, modifier: Modifier = Modifier.fillMaxSize()) {
    val glyph = LocalTanreiIconGlyph.current
    val color = LocalTanreiContentColor.current
    Canvas(modifier) {
        val stroke = size.minDimension * glyph.weight / STROKE_PER_WEIGHT
        fun at(x: Float, y: Float) = Offset(size.width * x, size.height * y)
        when (name) {
            "edit" -> drawPath(
                Path().apply {
                    moveTo(size.width * 0.18f, size.height * 0.82f)
                    lineTo(size.width * 0.22f, size.height * 0.64f)
                    lineTo(size.width * 0.64f, size.height * 0.22f)
                    lineTo(size.width * 0.78f, size.height * 0.36f)
                    lineTo(size.width * 0.36f, size.height * 0.78f)
                    close()
                    moveTo(size.width * 0.56f, size.height * 0.3f)
                    lineTo(size.width * 0.7f, size.height * 0.44f)
                },
                color,
                style = Stroke(stroke, join = StrokeJoin.Round, cap = StrokeCap.Round),
            )
            "event" -> {
                drawRoundRect(color, topLeft = at(0.17f, 0.22f), size = Size(size.width * 0.66f, size.height * 0.62f), cornerRadius = CornerRadius(stroke), style = Stroke(stroke))
                drawLine(color, at(0.17f, 0.4f), at(0.83f, 0.4f), stroke)
                drawLine(color, at(0.35f, 0.14f), at(0.35f, 0.28f), stroke, StrokeCap.Round)
                drawLine(color, at(0.65f, 0.14f), at(0.65f, 0.28f), stroke, StrokeCap.Round)
                drawRect(color, topLeft = at(0.56f, 0.56f), size = Size(size.width * 0.14f, size.height * 0.14f))
            }
            "check" -> {
                drawLine(color, at(0.2f, 0.52f), at(0.4f, 0.72f), stroke, StrokeCap.Round)
                drawLine(color, at(0.4f, 0.72f), at(0.8f, 0.3f), stroke, StrokeCap.Round)
            }
            "close" -> {
                drawLine(color, at(0.28f, 0.28f), at(0.72f, 0.72f), stroke, StrokeCap.Round)
                drawLine(color, at(0.72f, 0.28f), at(0.28f, 0.72f), stroke, StrokeCap.Round)
            }
            "dashboard" -> {
                val style = if (glyph.fill >= 0.5f) Fill else Stroke(stroke)
                for ((x, y) in listOf(0.18f to 0.18f, 0.56f to 0.18f, 0.18f to 0.56f, 0.56f to 0.56f)) {
                    drawRect(color, topLeft = at(x, y), size = Size(size.width * 0.26f, size.height * 0.26f), style = style)
                }
            }
            "history" -> {
                val dial = if (glyph.fill >= 0.5f) stroke * 2 else stroke
                drawCircle(color, radius = size.minDimension * 0.34f, center = at(0.5f, 0.5f), style = Stroke(dial))
                drawLine(color, at(0.5f, 0.3f), at(0.5f, 0.5f), stroke, StrokeCap.Round)
                drawLine(color, at(0.5f, 0.5f), at(0.64f, 0.62f), stroke, StrokeCap.Round)
            }
            "settings" -> {
                for (i in 0 until 8) {
                    val angle = Math.toRadians(i * 45.0)
                    val inner = size.minDimension * 0.28f
                    val outer = size.minDimension * 0.4f
                    drawLine(color, at(0.5f, 0.5f) + Offset((kotlin.math.cos(angle) * inner).toFloat(), (kotlin.math.sin(angle) * inner).toFloat()), at(0.5f, 0.5f) + Offset((kotlin.math.cos(angle) * outer).toFloat(), (kotlin.math.sin(angle) * outer).toFloat()), stroke * 1.5f, StrokeCap.Round)
                }
                if (glyph.fill >= 0.5f) drawCircle(color, radius = size.minDimension * 0.28f, center = at(0.5f, 0.5f))
                else drawCircle(color, radius = size.minDimension * 0.24f, center = at(0.5f, 0.5f), style = Stroke(stroke))
            }
            "info" -> {
                drawCircle(color, radius = size.minDimension * 0.36f, center = at(0.5f, 0.5f), style = Stroke(stroke))
                drawLine(color, at(0.5f, 0.46f), at(0.5f, 0.68f), stroke, StrokeCap.Round)
                drawCircle(color, radius = stroke * 0.7f, center = at(0.5f, 0.33f))
            }
            "format_bold" -> drawPath(
                Path().apply {
                    moveTo(size.width * 0.32f, size.height * 0.2f)
                    lineTo(size.width * 0.32f, size.height * 0.8f)
                    lineTo(size.width * 0.6f, size.height * 0.8f)
                    lineTo(size.width * 0.7f, size.height * 0.66f)
                    lineTo(size.width * 0.6f, size.height * 0.5f)
                    lineTo(size.width * 0.32f, size.height * 0.5f)
                    moveTo(size.width * 0.32f, size.height * 0.2f)
                    lineTo(size.width * 0.56f, size.height * 0.2f)
                    lineTo(size.width * 0.64f, size.height * 0.34f)
                    lineTo(size.width * 0.56f, size.height * 0.5f)
                },
                color,
                style = Stroke(stroke * 1.6f, join = StrokeJoin.Round),
            )
            "format_italic" -> {
                drawLine(color, at(0.4f, 0.2f), at(0.7f, 0.2f), stroke, StrokeCap.Round)
                drawLine(color, at(0.3f, 0.8f), at(0.6f, 0.8f), stroke, StrokeCap.Round)
                drawLine(color, at(0.58f, 0.2f), at(0.42f, 0.8f), stroke, StrokeCap.Round)
            }
            "format_underlined" -> {
                drawLine(color, at(0.34f, 0.18f), at(0.34f, 0.5f), stroke, StrokeCap.Round)
                drawLine(color, at(0.66f, 0.18f), at(0.66f, 0.5f), stroke, StrokeCap.Round)
                drawArc(color, 0f, 180f, false, topLeft = at(0.34f, 0.34f), size = Size(size.width * 0.32f, size.height * 0.32f), style = Stroke(stroke))
                drawLine(color, at(0.26f, 0.8f), at(0.74f, 0.8f), stroke, StrokeCap.Round)
            }
            "save" -> {
                drawRoundRect(color, topLeft = at(0.2f, 0.2f), size = Size(size.width * 0.6f, size.height * 0.6f), cornerRadius = CornerRadius(stroke), style = Stroke(stroke))
                drawRect(color, topLeft = at(0.32f, 0.2f), size = Size(size.width * 0.32f, size.height * 0.18f), style = Stroke(stroke))
                drawCircle(color, radius = size.minDimension * 0.08f, center = at(0.5f, 0.6f))
            }
            "view_list" -> {
                for (y in listOf(0.3f, 0.5f, 0.7f)) {
                    drawCircle(color, radius = stroke * 0.8f, center = at(0.24f, y))
                    drawLine(color, at(0.38f, y), at(0.8f, y), stroke, StrokeCap.Round)
                }
            }
            "grid_view" -> {
                val style = if (glyph.fill >= 0.5f) Fill else Stroke(stroke)
                for ((x, y) in listOf(0.2f to 0.2f, 0.54f to 0.2f, 0.2f to 0.54f, 0.54f to 0.54f)) {
                    drawRect(color, topLeft = at(x, y), size = Size(size.width * 0.26f, size.height * 0.26f), style = style)
                }
            }
            "map" -> drawPath(
                Path().apply {
                    moveTo(size.width * 0.16f, size.height * 0.28f)
                    lineTo(size.width * 0.38f, size.height * 0.2f)
                    lineTo(size.width * 0.62f, size.height * 0.28f)
                    lineTo(size.width * 0.84f, size.height * 0.2f)
                    lineTo(size.width * 0.84f, size.height * 0.72f)
                    lineTo(size.width * 0.62f, size.height * 0.8f)
                    lineTo(size.width * 0.38f, size.height * 0.72f)
                    lineTo(size.width * 0.16f, size.height * 0.8f)
                    close()
                    moveTo(size.width * 0.38f, size.height * 0.2f)
                    lineTo(size.width * 0.38f, size.height * 0.72f)
                    moveTo(size.width * 0.62f, size.height * 0.28f)
                    lineTo(size.width * 0.62f, size.height * 0.8f)
                },
                color,
                style = Stroke(stroke, join = StrokeJoin.Round),
            )
            "format_align_left", "format_align_center", "format_align_right" -> {
                for ((i, y) in listOf(0.24f, 0.41f, 0.58f, 0.75f).withIndex()) {
                    val length = if (i % 2 == 0) 0.6f else 0.36f
                    val start = when (name) {
                        "format_align_left" -> 0.2f
                        "format_align_right" -> 0.8f - length
                        else -> 0.5f - length / 2
                    }
                    drawLine(color, at(start, y), at(start + length, y), stroke, StrokeCap.Round)
                }
            }
            "chevron_right" -> {
                drawLine(color, at(0.4f, 0.25f), at(0.65f, 0.5f), stroke, StrokeCap.Round)
                drawLine(color, at(0.65f, 0.5f), at(0.4f, 0.75f), stroke, StrokeCap.Round)
            }
            else -> {
                drawLine(color, at(0.5f, 0.2f), at(0.5f, 0.8f), stroke, StrokeCap.Round)
                drawLine(color, at(0.2f, 0.5f), at(0.8f, 0.5f), stroke, StrokeCap.Round)
            }
        }
    }
}

/** One item of a menu fixture, of the spec's four item kinds, with its glyphs as the gallery's stand-ins. */
@Composable
private fun GalleryMenuItem(item: GalleryItem, onClick: () -> Unit) {
    fun glyph(prop: String): (@Composable () -> Unit)? = item.stringOrNull(prop)?.takeIf { it.isNotEmpty() }?.let { name -> { GalleryNamedGlyph(name) } }
    when (item.kind) {
        "item" -> TanreiMenuItem(
            text = item.string("label"),
            onClick = onClick,
            supportingText = item.string("supportingText"),
            trailingText = item.string("trailingText"),
            destructive = item.boolean("destructive"),
            enabled = !item.boolean("disabled"),
            leadingIcon = glyph("leadingIcon"),
            trailingIcon = glyph("trailingIcon"),
        )
        "checkbox-item" -> {
            var checked by remember(item) { mutableStateOf(item.boolean("checked")) }
            TanreiCheckboxMenuItem(
                text = item.string("label"),
                checked = checked,
                onCheckedChange = { checked = it; onClick() },
                supportingText = item.string("supportingText"),
                trailingText = item.string("trailingText"),
                enabled = !item.boolean("disabled"),
                leadingIcon = glyph("leadingIcon"),
                trailingIcon = glyph("trailingIcon"),
            )
        }
        "radio-item" -> TanreiRadioMenuItem(
            text = item.string("label"),
            value = item.string("value"),
            supportingText = item.string("supportingText"),
            trailingText = item.string("trailingText"),
            enabled = !item.boolean("disabled"),
            leadingIcon = glyph("leadingIcon"),
            trailingIcon = glyph("trailingIcon"),
        )
        "group" -> {
            var value by remember(item) { mutableStateOf(item.stringOrNull("value")) }
            TanreiMenuGroup(title = item.string("title"), selectedValue = value, onSelectedValueChange = { value = it; onClick() }) {
                for (child in item.items) GalleryMenuItem(child, onClick)
            }
        }
        else -> error("menu: unknown item kind '${item.kind}'")
    }
}

/**
 * What a fixture puts into a named slot, rendered as its kind says: `glyph` the gallery's stand-in glyph,
 * `icon-button` a standard medium Tanrei icon button showing the glyph and labelled by its name, `button` a text-variant
 * Tanrei Button with the label, `text` plain text. [onClick] is wired to the buttons. Null when the fixture leaves the
 * slot empty.
 */
fun gallerySlot(slot: GallerySlot?, onClick: () -> Unit = {}): (@Composable () -> Unit)? = slot?.let {
    {
        for (value in slot.values) {
            when (slot.kind) {
                "glyph" -> GalleryNamedGlyph(value)
                "icon-only-button" -> TanreiIconButton(onClick = onClick, contentDescription = value, variant = TanreiIconButtonVariant.Standard, size = TanreiIconButtonSize.Medium) { GalleryNamedGlyph(value) }
                "button" -> TanreiButton(text = value, onClick = onClick, variant = TanreiButtonVariant.Text)
                "text" -> TanreiText(value)
                else -> error("unknown slot kind '${slot.kind}'")
            }
        }
    }
}

/** One item of a navigation drawer fixture: a destination, or a section of destinations. */
@Composable
private fun GalleryDrawerItem(item: GalleryItem, value: String, onSelect: (String) -> Unit) {
    when (item.kind) {
        "destination" -> {
            val destination = item.string("value")
            TanreiNavigationDrawerItem(
                selected = destination == value,
                onClick = { onSelect(destination) },
                label = item.string("label"),
                icon = item.string("icon").takeIf { it.isNotEmpty() },
                badge = item.string("badge"),
                enabled = !item.boolean("disabled"),
            )
        }
        "section" -> TanreiNavigationDrawerSection(heading = item.string("heading"), divider = item.boolean("divider")) {
            for (inner in item.items) GalleryDrawerItem(inner, value, onSelect)
        }
    }
}
