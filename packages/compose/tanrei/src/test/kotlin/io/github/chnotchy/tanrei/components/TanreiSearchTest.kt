package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PixelMap
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.layout.boundsInRoot
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.click
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.isDialog
import androidx.compose.ui.test.isRoot
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performMouseInput
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.test.performTextInputSelection
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import io.github.chnotchy.tanrei.primitives.LocalTanreiGlyphStandIn
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph
import io.github.chnotchy.tanrei.theme.LocalTanreiTextStyle
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiIconGlyph
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.glyph
import io.github.chnotchy.tanrei.tokens.Cupertino
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiFocusStyle
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiPressedFeedback
import io.github.chnotchy.tanrei.tokens.TanreiSearchConditionStateTokens
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import kotlin.math.abs
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TestRule
import org.junit.runner.RunWith
import org.junit.runners.model.Statement
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Behaviour tests for `specs/search.spec.json`. Each test names the behaviour id (`SRC-n`) it covers. Runs on the JVM
 * (Robolectric, native graphics). The search is 328 wide on the page's surface, between a focusable box before it and
 * one after it; the caller keeps `value` and `expanded` and records every input, submit, select and toggle. Glyphs given
 * by name draw a swatch of the color they are given, and record it. The open view is drawn in its popup or dialog
 * window, or — where pixels are read — in place (`LocalTanreiSearchInPlace`).
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w480dp-h800dp-xhdpi")
class TanreiSearchTest {
    /** Tests marked [KeyboardNavigation] start in keyboard (non-touch) input mode (see `TanreiButtonTest`). */
    @get:Rule(order = 0)
    val inputMode = TestRule { base, description ->
        object : Statement() {
            override fun evaluate() {
                val instrumentation = InstrumentationRegistry.getInstrumentation()
                instrumentation.setInTouchMode(description.getAnnotation(KeyboardNavigation::class.java) == null)
                try {
                    base.evaluate()
                } finally {
                    instrumentation.setInTouchMode(true)
                }
            }
        }
    }

    @get:Rule(order = 1)
    val rule = createComposeRule()

    private val tanrei = TanreiSystem.Tanrei
    private val colors = tanrei.colors.light
    private val tokens = tanrei.search
    private val look = tokens.conditions.standard
    private val surface = colors[TanreiColorRole.Surface]

    private var value by mutableStateOf("")
    private var expanded by mutableStateOf(false)
    private val events = mutableListOf<String>()
    private val glyphColors = mutableMapOf<String, Color>()
    private val glyphs = mutableMapOf<String, TanreiIconGlyph>()
    private var slotContentColor: Color? = null
    private var slotTextStyleSize = 0f
    private var slotBounds: Rect? = null

    private data class Suggestion(val value: String, val headline: String, val supporting: String = "", val icon: String = "")

    private val three = listOf(Suggestion("invoices", "invoices", icon = "history"), Suggestion("invoice template", "invoice template", icon = "history"), Suggestion("folder:invoices", "Invoices", "Folder · 24 messages", "folder"))

    private fun show(
        system: TanreiSystem = tanrei,
        presentation: TanreiSearchPresentation = TanreiSearchPresentation.Docked,
        enabled: Boolean = true,
        label: String = "Search mail",
        placeholder: String = "Search mail",
        clearLabel: String = "Clear search",
        backLabel: String = "Back",
        leading: Boolean = false,
        trailing: Int = 0,
        suggestions: List<Suggestion> = three,
        extra: (@Composable () -> Unit)? = null,
        direction: LayoutDirection = LayoutDirection.Ltr,
        fontScale: Float = 1f,
        inPlace: Boolean = false,
        follow: Boolean = true,
    ) {
        rule.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(
                LocalLayoutDirection provides direction,
                LocalDensity provides Density(density.density, fontScale),
                LocalTanreiSearchInPlace provides inPlace,
                LocalTanreiGlyphStandIn provides { name ->
                    glyphColors[name] = LocalTanreiContentColor.current
                    glyphs[name] = LocalTanreiIconGlyph.current
                    Box(Modifier.fillMaxSize().background(LocalTanreiContentColor.current))
                },
            ) {
                TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                    Column(Modifier.testTag(STAGE).width(STAGE_WIDTH).background(TanreiColorRole.Surface.color)) {
                        Box(Modifier.testTag(BEFORE).size(8.dp).focusable())
                        Box(Modifier.width(BAR_WIDTH).then(if (inPlace && presentation == TanreiSearchPresentation.FullScreen) Modifier.height(480.dp) else Modifier)) {
                            TanreiSearch(
                                value = value,
                                onValueChange = { events += "input:$it"; if (follow) value = it },
                                expanded = expanded,
                                onExpandedChange = { open, reason -> events += "toggle:$open:${reason?.name}"; if (follow) expanded = open },
                                label = label,
                                modifier = Modifier.testTag(SEARCH).then(if (inPlace && presentation == TanreiSearchPresentation.FullScreen) Modifier.fillMaxSize() else Modifier),
                                presentation = presentation,
                                placeholder = placeholder,
                                enabled = enabled,
                                clearLabel = clearLabel,
                                backLabel = backLabel,
                                onSearch = { events += "submit:$it" },
                                onSelect = { events += "select:$it" },
                                leading = if (leading) { { TanreiIconButton(onClick = { events += "menu" }, contentDescription = "Menu", modifier = Modifier.testTag("leading")) {} } } else null,
                                trailing = if (trailing > 0) {
                                    { repeat(trailing) { i -> TanreiIconButton(onClick = { events += "trailing:$i" }, contentDescription = "Trailing $i", modifier = Modifier.testTag("trailing-$i")) {} } }
                                } else {
                                    null
                                },
                            ) {
                                for (s in suggestions) TanreiSearchSuggestion(value = s.value, headline = s.headline, supportingText = s.supporting, leadingIcon = s.icon, modifier = Modifier.testTag("row-${s.value}"))
                                extra?.invoke()
                            }
                        }
                        Box(Modifier.testTag(AFTER).size(8.dp).focusable())
                    }
                }
            }
        }
        rule.waitForIdle()
    }

    private fun inputs() = rule.onAllNodes(SemanticsMatcher.keyIsDefined(SemanticsProperties.EditableText))

    private fun input(): SemanticsNodeInteraction = inputs()[0]

    private fun bar() = rule.onNodeWithTag(SEARCH)

    private fun barBounds() = bar().getUnclippedBoundsInRoot()

    private fun stage(): PixelMap = rule.onNodeWithTag(STAGE).captureToImage().toPixelMap()

    /** The bar's visible top edge, from the bar node's top: the node also holds the touch target. */
    private fun visibleTop(visibleHeight: Dp = tokens.containerHeight): Dp = ((barBounds().bottom - barBounds().top) - visibleHeight) / 2

    /** A pixel at ([x], [y]) from the bar node's top-left. */
    private fun barPixel(x: Dp, y: Dp, map: PixelMap = stage()): Color {
        val b = barBounds()
        val s = rule.onNodeWithTag(STAGE).getUnclippedBoundsInRoot()
        return with(rule.density) { map[(b.left - s.left + x).roundToPx(), (b.top - s.top + y).roundToPx()] }
    }

    private fun countNear(bounds: Rect, color: Color, map: PixelMap = stage()): Int {
        val s = rule.onNodeWithTag(STAGE).getUnclippedBoundsInRoot()
        return with(rule.density) {
            val left = (bounds.left.toDp() - s.left).roundToPx()
            val top = (bounds.top.toDp() - s.top).roundToPx()
            val right = (bounds.right.toDp() - s.left).roundToPx()
            val bottom = (bounds.bottom.toDp() - s.top).roundToPx()
            (top until bottom).sumOf { y -> (left until right).count { x -> x in 0 until map.width && y in 0 until map.height && isClose(map[x, y], color, 12f / 255f) } }
        }
    }

    private fun inputRect(): Rect = with(rule.density) { input().getUnclippedBoundsInRoot().let { Rect(it.left.toPx(), it.top.toPx(), it.right.toPx(), it.bottom.toPx()) } }

    private fun TanreiSystem.withLook(state: TanreiInteractionState, change: (TanreiSearchConditionStateTokens) -> TanreiSearchConditionStateTokens): TanreiSystem {
        val c = search.conditions.standard
        val changed = when (state) {
            TanreiInteractionState.Enabled -> c.copy(enabled = change(c.enabled))
            TanreiInteractionState.Hovered -> c.copy(hovered = change(c.hovered))
            TanreiInteractionState.Focused -> c.copy(focused = change(c.focused))
            TanreiInteractionState.Pressed -> c.copy(pressed = change(c.pressed))
            TanreiInteractionState.Disabled -> c.copy(disabled = change(c.disabled))
        }
        return copy(search = search.copy(conditions = search.conditions.copy(standard = changed)))
    }

    private fun TanreiSystem.answering(feedback: TanreiPressedFeedback) = copy(behavior = behavior.copy(pressedFeedback = feedback))

    /** Opens the view the way a person does (Down Arrow in the focused input) and waits for it. */
    private fun openByKeyboard() {
        input().requestFocus().performKeyInput { pressKey(Key.DirectionDown) }
        rule.waitForIdle()
    }

    // ── SRC-1 / SRC-2 / SRC-3: the bar ───────────────────────────────────────

    @Test
    fun `SRC-1 the bar is as wide as its layout, at least its height, filled and rounded, the glyph, the input and the clear button in one row`() {
        value = "invoice"
        show()
        val b = barBounds()
        assertDp("width", BAR_WIDTH, b.right - b.left)
        assertDp("the hit area", tanrei.measure.targetTouch, b.bottom - b.top)
        val field = input().getUnclippedBoundsInRoot()
        assertDp("the input after the glyph", tokens.containerPaddingInline + tokens.leadingIconSize + tokens.containerGap, field.left - b.left)
        val clear = tanrei.iconButton.sizes.small.containerSize
        assertDp("the input up to the clear button", BAR_WIDTH - tokens.containerPaddingInlineWithButton - clear - tokens.containerGap, field.right - b.left)
        val top = visibleTop()
        assertPixel("the fill", barPixel(BAR_WIDTH / 2, top + 2.dp), look.enabled.containerColor.resolve(colors))
        assertPixel("the rounded end", barPixel(1.dp, top + 1.dp), surface)
        assertPixel("the hit area above the bar is not drawn", barPixel(BAR_WIDTH / 2, top - 1.dp), surface)
    }

    @Test
    fun `SRC-1 with the leading slot filled its icon button sits padding-inline-with-button from the start, and the input ends padding-inline from the end`() {
        show(leading = true)
        val b = barBounds()
        val field = input().getUnclippedBoundsInRoot()
        val medium = tanrei.iconButton.sizes.medium.containerSize
        assertDp("after the button", tokens.containerPaddingInlineWithButton + medium + tokens.containerGap, field.left - b.left)
        assertDp("the input ends the row", BAR_WIDTH - tokens.containerPaddingInline, field.right - b.left)
        assertFalse("no glyph in place of the button", glyphColors.containsKey("search"))
    }

    @Test
    fun `SRC-1 right-to-left mirrors the row, and the container height drives the bar`() {
        show(tanrei.copy(search = tokens.copy(containerHeight = 56.dp)), direction = LayoutDirection.Rtl)
        val b = barBounds()
        assertDp("the taller bar", 56.dp, b.bottom - b.top)
        val field = input().getUnclippedBoundsInRoot()
        assertDp("the input after the glyph, from the right", tokens.containerPaddingInline + tokens.leadingIconSize + tokens.containerGap, b.right - field.right)
    }

    @Test
    fun `SRC-2 the search glyph is drawn at the leading icon size in its color with an unselected glyph, and hidden`() {
        show()
        assertEquals(look.enabled.leadingIconColor.resolve(colors), glyphColors["search"])
        assertEquals(tanrei.icon.glyph(tokens.leadingIconSize, selected = false), glyphs["search"])
        assertEquals("hidden from assistive technology", 0, rule.onAllNodes(hasText("search")).fetchSemanticsNodes().size)
    }

    @Test
    fun `SRC-3 the value in the input color, the placeholder in its own color while empty, and the text field's selection color`() {
        val system = tanrei.withLook(TanreiInteractionState.Enabled) { it.copy(placeholderColor = TanreiPaint.Role(TanreiColorRole.Success)) }
            .withLook(TanreiInteractionState.Focused) { it.copy(inputColor = TanreiPaint.Role(TanreiColorRole.Error)) }
            .let { it.copy(textField = it.textField.copy(selectionColor = TanreiPaint.Role(TanreiColorRole.Warning))) }
        show(system)
        assertTrue("the placeholder", countNear(inputRect(), colors[TanreiColorRole.Success]) > 20)
        input().performTextInput("MMMMMM")
        rule.waitForIdle()
        assertTrue("the value", countNear(inputRect(), colors[TanreiColorRole.Error]) > 20)
        assertEquals("no placeholder with a value", 0, countNear(inputRect(), colors[TanreiColorRole.Success]))
        input().performTextInputSelection(TextRange(0, 6))
        rule.waitForIdle()
        assertTrue("the selection in the text field's selection color", countNear(inputRect(), colors[TanreiColorRole.Warning]) > 40)
    }

    // ── SRC-4: editing ───────────────────────────────────────────────────────

    @Test
    fun `SRC-4 the native text element - input once per change, none when the product sets the value, the search action key`() {
        show()
        input().performTextInput("in")
        rule.waitForIdle()
        value = "set by the product"
        rule.waitForIdle()
        assertEquals(listOf("input:in", "toggle:true:null"), events)
        input().assert(SemanticsMatcher.expectValue(SemanticsProperties.ImeAction, ImeAction.Search))
    }

    // ── SRC-5 / SRC-6: opening and closing ───────────────────────────────────

    @Test
    fun `SRC-5 a press on the bar focuses the input and asks to open, once`() {
        show(suggestions = emptyList())
        bar().performTouchInput { click(Offset(with(rule.density) { 20.dp.toPx() }, centerY)) }
        rule.waitForIdle()
        input().assertIsFocused()
        assertEquals(listOf("toggle:true:null"), events)
    }

    @Test
    @KeyboardNavigation
    fun `SRC-5 focus by Tab does not open the view, and Down Arrow does`() {
        show(suggestions = emptyList())
        rule.onNodeWithTag(BEFORE).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        input().assertIsFocused()
        assertEquals("focus alone", emptyList<String>(), events)
        input().performKeyInput { pressKey(Key.DirectionDown) }
        rule.waitForIdle()
        assertEquals(listOf("toggle:true:null"), events)
    }

    @Test
    @KeyboardNavigation
    fun `SRC-6 Escape closes the docked view with the reason escape and keeps the value`() {
        value = "inv"
        show()
        openByKeyboard()
        input().performKeyInput { pressKey(Key.Escape) }
        rule.waitForIdle()
        assertEquals(listOf("toggle:true:null", "toggle:false:Escape"), events)
        assertEquals("inv", value)
    }

    @Test
    @KeyboardNavigation
    fun `SRC-6 Tab closes the docked view with the reason tab and moves on`() {
        show()
        openByKeyboard()
        input().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(AFTER).assertIsFocused()
        assertEquals(listOf("toggle:true:null", "toggle:false:Tab"), events)
    }

    @Test
    fun `SRC-6 focus moving out of the docked search closes its view with the reason focus-out`() {
        show()
        input().requestFocus()
        expanded = true
        rule.waitForIdle()
        rule.onNodeWithTag(AFTER).requestFocus()
        rule.waitForIdle()
        assertEquals(listOf("toggle:false:FocusOut"), events)
    }

    @Test
    fun `SRC-6 a close asked for twice before the caller answers is asked for once, and a caller that declines can be asked again`() {
        expanded = true
        show(follow = false)
        input().requestFocus()
        input().performKeyInput { pressKey(Key.Escape); pressKey(Key.Escape) }
        rule.waitForIdle()
        assertEquals(listOf("toggle:false:Escape"), events)
        input().performKeyInput { pressKey(Key.Escape) }
        rule.waitForIdle()
        assertEquals(listOf("toggle:false:Escape", "toggle:false:Escape"), events)
    }

    // ── SRC-7 / SRC-8: the docked view ───────────────────────────────────────

    @Test
    fun `SRC-7 the docked view is a popup under the bar, as wide as it, on its color, inset by its padding`() {
        expanded = true
        val system = tanrei.copy(search = tokens.copy(viewContainerColor = TanreiPaint.Role(TanreiColorRole.Error)))
        show(system, inPlace = true)
        val b = barBounds()
        val bottom = tokens.containerHeight
        val map = stage()
        fun pixel(x: Dp, y: Dp): Color {
            val s = rule.onNodeWithTag(STAGE).getUnclippedBoundsInRoot()
            return with(rule.density) { map[(b.left - s.left + x).roundToPx(), (b.top - s.top + y).roundToPx()] }
        }
        assertPixel("the offset under the bar is clear", pixel(BAR_WIDTH / 2, bottom + tokens.viewOffset / 2), surface)
        assertPixel("the view", pixel(BAR_WIDTH / 2, bottom + tokens.viewOffset + 2.dp), colors[TanreiColorRole.Error])
        assertPixel("as wide as the bar", pixel(3.dp, bottom + tokens.viewOffset + 30.dp), colors[TanreiColorRole.Error])
        val row = rule.onNodeWithTag("row-invoices").getUnclippedBoundsInRoot()
        assertDp("inset by the padding", tokens.viewPaddingInline, row.left - b.left)
        assertDp("under the padding", bottom + tokens.viewOffset + tokens.viewPaddingBlock, row.top - b.top)
    }

    @Test
    fun `SRC-7 a view with no content draws nothing, and the search stays expanded`() {
        expanded = true
        val system = tanrei.copy(search = tokens.copy(viewContainerColor = TanreiPaint.Role(TanreiColorRole.Error)))
        show(system, suggestions = emptyList(), inPlace = true)
        assertEquals(0, countNear(Rect(0f, 0f, 2000f, 2000f), colors[TanreiColorRole.Error]))
        assertTrue(expanded)
        assertEquals(emptyList<String>(), events)
    }

    @Test
    fun `SRC-7 SRC-8 the docked view opens in a popup that does not take focus - the input keeps it, and a press on a suggestion does not take it`() {
        show()
        input().requestFocus()
        expanded = true
        rule.waitForIdle()
        assertEquals("a popup", 2, rule.onAllNodes(isRoot()).fetchSemanticsNodes().size)
        input().assertIsFocused()
        rule.onNodeWithTag("row-invoice template").performClick()
        rule.waitForIdle()
        input().assertIsFocused()
        assertEquals(listOf("select:invoice template", "toggle:false:Select"), events)
    }

    // ── SRC-9 / SRC-11: the full-screen view ─────────────────────────────────

    @Test
    fun `SRC-9 the full-screen view is a modal dialog named by label, focus moves to its input with the caret at the end, and returns to the bar when it closes`() {
        value = "inv"
        show(presentation = TanreiSearchPresentation.FullScreen)
        input().requestFocus()
        expanded = true
        rule.waitForIdle()
        assertEquals(1, rule.onAllNodes(isDialog()).fetchSemanticsNodes().size)
        assertEquals("Search mail", rule.onNode(SemanticsMatcher.keyIsDefined(SemanticsProperties.PaneTitle)).fetchSemanticsNode().config[SemanticsProperties.PaneTitle])
        val header = inputs()[1]
        header.assertIsFocused()
        assertEquals(TextRange(3), header.fetchSemanticsNode().config[SemanticsProperties.TextSelectionRange])
        expanded = false
        rule.waitForIdle()
        assertEquals(0, rule.onAllNodes(isDialog()).fetchSemanticsNodes().size)
        input().assertIsFocused()
        assertEquals("closing by the product emits nothing, and focus back does not reopen it", emptyList<String>(), events)
    }

    @Test
    fun `SRC-9 the full-screen view fills the window with its color, a header of its height, and a divider under it`() {
        value = "inv"
        expanded = true
        val system = tanrei.copy(search = tokens.copy(viewContainerColor = TanreiPaint.Role(TanreiColorRole.Error), dividerColor = TanreiPaint.Role(TanreiColorRole.Success), dividerThickness = 2.dp))
        show(system, presentation = TanreiSearchPresentation.FullScreen, inPlace = true)
        val map = stage()
        val b = barBounds()
        val s = rule.onNodeWithTag(STAGE).getUnclippedBoundsInRoot()
        fun pixel(x: Dp, y: Dp) = with(rule.density) { map[(b.left - s.left + x).roundToPx(), (b.top - s.top + y).roundToPx()] }
        assertPixel("the view's color", pixel(BAR_WIDTH / 2, 470.dp), colors[TanreiColorRole.Error])
        assertPixel("the divider under the header", pixel(BAR_WIDTH / 2, tokens.headerHeight + 1.dp), colors[TanreiColorRole.Success])
        rule.onNodeWithContentDescription("Back").assertExists()
    }

    @Test
    fun `SRC-11 the back button closes the full-screen view with the reason back, and an empty backLabel is reported`() = collectingReports { reports ->
        setDebuggable(true)
        value = "inv"
        show(presentation = TanreiSearchPresentation.FullScreen, backLabel = "")
        input().requestFocus()
        expanded = true
        rule.waitForIdle()
        rule.onNode(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button) and SemanticsMatcher.keyNotDefined(SemanticsProperties.ContentDescription) and SemanticsMatcher.keyNotDefined(SemanticsProperties.CollectionItemInfo)).performClick()
        rule.waitForIdle()
        assertEquals(listOf("toggle:false:Back"), events)
        assertTrue("reported: $reports", reports.any { "backLabel" in it })
    }

    // ── SRC-10 / SRC-12 / SRC-13: clear, Escape, submit ──────────────────────

    @Test
    fun `SRC-10 the clear button shows with a value, empties it with one input, focuses the input and neither opens nor closes`() {
        show()
        rule.onAllNodes(hasContentDescription("Clear search")).fetchSemanticsNodes().let { assertEquals("none without a value", 0, it.size) }
        value = "invoice"
        rule.waitForIdle()
        rule.onNodeWithContentDescription("Clear search").performClick()
        rule.waitForIdle()
        assertEquals(listOf("input:"), events)
        input().assertIsFocused()
    }

    @Test
    fun `SRC-10 the clear button is small in the bar, and an empty clearLabel still shows it and is reported`() = collectingReports { reports ->
        setDebuggable(true)
        value = "invoice"
        show(clearLabel = "")
        val b = barBounds()
        val field = input().getUnclippedBoundsInRoot()
        val small = tanrei.iconButton.sizes.small.containerSize
        assertDp("room for a small button", BAR_WIDTH - tokens.containerPaddingInlineWithButton - small - tokens.containerGap, field.right - b.left)
        assertTrue("reported: $reports", reports.any { "clearLabel" in it })
        assertEquals(TanreiIconButtonSize.Small, TanreiIconButtonSize.Small)
    }

    @Test
    fun `SRC-12 Escape in a closed search clears a value, and with no value does nothing`() {
        value = "inv"
        show()
        input().requestFocus().performKeyInput { pressKey(Key.Escape) }
        rule.waitForIdle()
        input().performKeyInput { pressKey(Key.Escape) }
        rule.waitForIdle()
        assertEquals(listOf("input:"), events)
    }

    @Test
    fun `SRC-13 the action key submits the value and then closes the view with the reason submit`() {
        value = "inv"
        show()
        input().requestFocus()
        input().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals("closed: submit only", listOf("submit:inv"), events)
        events.clear()
        expanded = true
        rule.waitForIdle()
        input().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals(listOf("submit:inv", "toggle:false:Submit"), events)
    }

    // ── SRC-14 / SRC-15 / SRC-16 / SRC-17: suggestions ───────────────────────

    @Test
    @KeyboardNavigation
    fun `SRC-14 Down and Up make a suggestion active while focus stays in the input, Enter chooses it, and typing leaves none active`() {
        show()
        openByKeyboard()
        input().performKeyInput { pressKey(Key.DirectionDown); pressKey(Key.DirectionDown); pressKey(Key.DirectionDown); pressKey(Key.DirectionDown) }
        rule.waitForIdle()
        input().assertIsFocused()
        input().performKeyInput { pressKey(Key.DirectionUp) }
        rule.waitForIdle()
        input().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals("the last stays active, Up goes back one", listOf("toggle:true:null", "select:invoice template", "toggle:false:Select"), events)
        events.clear()
        expanded = true
        rule.waitForIdle()
        input().performKeyInput { pressKey(Key.DirectionDown) }
        input().performTextInput("x")
        rule.waitForIdle()
        input().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals(listOf("input:x", "submit:x", "toggle:false:Submit"), events)
    }

    @Test
    @KeyboardNavigation
    fun `SRC-14 Up on the first suggestion leaves none active`() {
        show()
        openByKeyboard()
        input().performKeyInput { pressKey(Key.DirectionDown); pressKey(Key.DirectionUp); pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals(listOf("toggle:true:null", "submit:", "toggle:false:Submit"), events)
    }

    @Test
    fun `SRC-15 choosing a suggestion emits select with its value, then closes with the reason select, and leaves the value`() {
        value = "inv"
        expanded = true
        show(inPlace = true)
        rule.onNodeWithTag("row-folder:invoices").performClick()
        rule.waitForIdle()
        assertEquals(listOf("select:folder:invoices", "toggle:false:Select"), events)
        assertEquals("inv", value)
    }

    @Test
    fun `SRC-16 a row is at least the row height and the touch target, padded, the icon column kept in every row, text wrapping`() {
        expanded = true
        show(suggestions = three + Suggestion("plain", "no icon here but a headline long enough to wrap onto a second line in a 328 wide view"), inPlace = true)
        val first = rule.onNodeWithTag("row-invoices").getUnclippedBoundsInRoot()
        assertDp("at least the target", maxOf(tokens.suggestionContainerHeight, tanrei.measure.targetTouch), first.bottom - first.top)
        val plain = rule.onNodeWithTag("row-plain").getUnclippedBoundsInRoot()
        assertTrue("the long headline wraps and grows its row", plain.bottom - plain.top > first.bottom - first.top + 10.dp)
        val a = rule.onNodeWithText("invoices", useUnmergedTree = true).getUnclippedBoundsInRoot()
        val b = rule.onNodeWithText("no icon here", substring = true, useUnmergedTree = true).getUnclippedBoundsInRoot()
        assertDp("headlines align: the icon column is kept", a.left, b.left)
        assertDp("after the icon column", tokens.suggestionContainerPaddingInline + tokens.suggestionLeadingIconSize + tokens.suggestionContainerGap, a.left - first.left)
        assertEquals(look.enabled.suggestionLeadingIconColor.resolve(colors), glyphColors["history"])
    }

    @Test
    @KeyboardNavigation
    fun `SRC-17 the active suggestion takes the focused tokens and the focus ring inside its row, and a hover does not make it active`() {
        val system = tanrei.withLook(TanreiInteractionState.Focused) { it.copy(suggestionContainerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
            .withLook(TanreiInteractionState.Hovered) { it.copy(suggestionContainerColor = TanreiPaint.Role(TanreiColorRole.Success)) }
        expanded = true
        show(system, inPlace = true)
        input().requestFocus()
        rule.onNodeWithTag("row-invoices").performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val row = with(rule.density) { rule.onNodeWithTag("row-invoices").getUnclippedBoundsInRoot().let { Rect(it.left.toPx(), it.top.toPx(), it.right.toPx(), it.bottom.toPx()) } }
        assertTrue("hovered", countNear(row, colors[TanreiColorRole.Success]) > 200)
        input().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals("a hover does not make it active", "submit:", events.first())
        events.clear()
        expanded = true
        rule.waitForIdle()
        input().performKeyInput { pressKey(Key.DirectionDown) }
        rule.waitForIdle()
        assertTrue("active: the focused tokens", countNear(row, colors[TanreiColorRole.Error]) > 200)
        assertTrue("and the ring inside the row", countNear(row, colors[TanreiColorRole.FocusRing]) > 50)
    }

    // ── SRC-18 … SRC-22: the bar's states ────────────────────────────────────

    @Test
    fun `SRC-18 focus by touch selects the focused state - a thicker edge in the focus-ring color, the container at rest`() {
        show()
        bar().performTouchInput { click(Offset(with(rule.density) { 20.dp.toPx() }, centerY)) }
        rule.waitForIdle()
        val top = visibleTop()
        assertEquals("the focused edge is thicker", tanrei.measure.borderThick, tokens.outlineWidth(TanreiInteractionState.Focused))
        assertPixel("the edge", barPixel(BAR_WIDTH / 2, top + 0.5.dp), colors[TanreiColorRole.FocusRing])
        assertPixel("the container at rest", barPixel(BAR_WIDTH / 2, top + 4.dp), look.enabled.containerColor.resolve(colors))
    }

    @Test
    @KeyboardNavigation
    fun `SRC-18 keyboard focus draws the focused edge, never a ring around the bar`() {
        show()
        input().requestFocus()
        rule.waitForIdle()
        val top = visibleTop()
        assertPixel("the edge", barPixel(BAR_WIDTH / 2, top + 0.5.dp), colors[TanreiColorRole.FocusRing])
        val ring = tanrei.measure.let { it.focusOffset + it.focusInnerWidth + it.focusOuterWidth / 2 }
        assertPixel("no ring outside", barPixel(BAR_WIDTH / 2, top - ring), surface)
    }

    @Test
    fun `SRC-18 hover draws the hovered container, and a change of state moves over the state motion`() {
        val slow = 400
        val system = tanrei.withLook(TanreiInteractionState.Hovered) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Success)) }
            .let { it.copy(search = it.search.copy(motionStateDuration = slow, motionStateEasing = tanrei.motion.easing.linear)) }
        show(system)
        val top = visibleTop()
        rule.mainClock.autoAdvance = false
        bar().performMouseInput { moveTo(Offset(with(rule.density) { 100.dp.toPx() }, centerY)) }
        rule.mainClock.advanceTimeBy(slow / 2L)
        val half = barPixel(BAR_WIDTH / 2, top + 4.dp)
        assertTrue("on its way: $half", !isClose(half, look.enabled.containerColor.resolve(colors)) && !isClose(half, colors[TanreiColorRole.Success]))
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertPixel("arrived", barPixel(BAR_WIDTH / 2, top + 4.dp), colors[TanreiColorRole.Success])
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `SRC-19 a press on the bar shows the pressed state at once and keeps it for press-hold`() {
        val system = tanrei.answering(TanreiPressedFeedback.Overlay).withLook(TanreiInteractionState.Pressed) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        show(system, suggestions = emptyList())
        val top = visibleTop()
        rule.mainClock.autoAdvance = false
        bar().performTouchInput { down(Offset(with(rule.density) { 100.dp.toPx() }, centerY)) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("pressed on the next frame", barPixel(BAR_WIDTH / 2, top + 4.dp), colors[TanreiColorRole.Error])
        bar().performTouchInput { up() }
        rule.mainClock.advanceTimeByFrame()
        assertPixel("held", barPixel(BAR_WIDTH / 2, top + 4.dp), colors[TanreiColorRole.Error])
        rule.mainClock.advanceTimeBy(tanrei.motion.duration.pressHold + tokens.motionStateDuration + 100L)
        assertFalse("released", isClose(barPixel(BAR_WIDTH / 2, top + 4.dp), colors[TanreiColorRole.Error]))
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
    }

    @Test
    fun `SRC-20 dim applies the pressed opacity and draws no state layer - none draws no answer`() {
        val system = tanrei.answering(TanreiPressedFeedback.Dim)
            .withLook(TanreiInteractionState.Pressed) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
            .let { it.copy(search = it.search.copy(pressed = it.search.pressed.copy(opacity = 0.5f))) }
        show(system, suggestions = emptyList())
        val top = visibleTop()
        val fill = look.enabled.containerColor.resolve(colors)
        rule.mainClock.autoAdvance = false
        bar().performTouchInput { down(Offset(with(rule.density) { 100.dp.toPx() }, centerY)) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("the resting fill, dimmed", barPixel(BAR_WIDTH / 2, top + 4.dp), fill.copy(alpha = 0.5f).compositeOver(surface))
        bar().performTouchInput { up() }
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        assertEquals("cupertino dims the whole bar", 0.7f, TanreiSystem.Cupertino.search.opacity(TanreiInteractionState.Pressed), 0.001f)
    }

    @Test
    fun `SRC-20 ripple grows the pressed state layer from the point of contact`() {
        val system = tanrei.answering(TanreiPressedFeedback.Ripple)
            .withLook(TanreiInteractionState.Pressed) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
            .let { it.copy(search = it.search.copy(motionFeedbackDuration = 400, motionStateEasing = tanrei.motion.easing.linear)) }
        show(system, suggestions = emptyList())
        val top = visibleTop()
        rule.mainClock.autoAdvance = false
        bar().performTouchInput { down(Offset(with(rule.density) { 40.dp.toPx() }, centerY)) }
        rule.mainClock.advanceTimeBy(100L)
        assertPixel("near the contact", barPixel(44.dp, top + 3.dp), colors[TanreiColorRole.Error])
        assertFalse("not yet at the far end", isClose(barPixel(BAR_WIDTH - 20.dp, top + 3.dp), colors[TanreiColorRole.Error]))
        bar().performTouchInput { up() }
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
    }

    @Test
    @KeyboardNavigation
    fun `SRC-21 under the glow focus style the focused bar also glows, and the corners ease by corner smoothing`() {
        val glow = tanrei.copy(behavior = tanrei.behavior.copy(focusStyle = TanreiFocusStyle.Glow))
        show(glow)
        input().requestFocus()
        rule.waitForIdle()
        val top = visibleTop()
        val glowAt = tanrei.measure.let { it.focusOffset + it.focusInnerWidth + it.focusOuterWidth / 2 }
        val above = barPixel(BAR_WIDTH / 2, top - glowAt)
        assertFalse("a glow outside the bar: $above", isClose(above, surface))
    }

    @Test
    fun `SRC-22 the bar's hit area reaches the touch target above and below without changing its size`() {
        show(suggestions = emptyList())
        val b = barBounds()
        assertDp("the hit area", tanrei.measure.targetTouch, b.bottom - b.top)
        bar().performTouchInput { click(Offset(with(rule.density) { 100.dp.toPx() }, 1f)) }
        rule.waitForIdle()
        assertEquals("a press above the drawn bar is the bar's", listOf("toggle:true:null"), events)
    }

    // ── SRC-23: motion ───────────────────────────────────────────────────────

    @Test
    fun `SRC-23 the docked view fades in over the open motion`() {
        val slow = 400
        val system = tanrei.copy(search = tokens.copy(motionOpenDuration = slow, motionOpenEasing = tanrei.motion.easing.linear, viewContainerColor = TanreiPaint.Role(TanreiColorRole.Error)))
        show(system)
        input().requestFocus()
        rule.mainClock.autoAdvance = false
        expanded = true
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeBy(slow / 2L)
        val view = SemanticsMatcher.keyIsDefined(SemanticsProperties.PaneTitle)
        val popup = rule.onNode(view).captureToImage().toPixelMap()
        val half = popup[popup.width / 2, popup.height / 2]
        assertTrue("on its way: $half", !isClose(half, colors[TanreiColorRole.Error]) && !isClose(half, colors[TanreiColorRole.SurfaceBright]))
        rule.mainClock.advanceTimeBy(slow.toLong() * 2)
        val whole = rule.onNode(view).captureToImage().toPixelMap()
        assertPixel("whole", whole[whole.width / 2, whole.height / 2], colors[TanreiColorRole.Error])
        rule.mainClock.autoAdvance = true
    }

    // ── SRC-24 / SRC-25: semantics and slots ─────────────────────────────────

    @Test
    fun `SRC-24 the input is named by label, never the placeholder - suggestions are buttons with their position - icons hidden`() {
        expanded = true
        show(inPlace = true)
        input().assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf("Search mail")))
        assertEquals("the placeholder is not in the tree", 0, rule.onAllNodes(hasText("Search mail")).fetchSemanticsNodes().size)
        val row = rule.onNodeWithTag("row-invoice template").fetchSemanticsNode().config
        assertEquals(Role.Button, row[SemanticsProperties.Role])
        assertEquals(1, row[SemanticsProperties.CollectionItemInfo].rowIndex)
        assertEquals(3, rule.onNode(SemanticsMatcher.keyIsDefined(SemanticsProperties.CollectionInfo)).fetchSemanticsNode().config[SemanticsProperties.CollectionInfo].rowCount)
        assertEquals("icons hidden", 0, rule.onAllNodes(hasText("history")).fetchSemanticsNodes().size)
    }

    @Test
    @KeyboardNavigation
    fun `SRC-25 the slots' icon buttons keep their own semantics and focus stops, in reading order, and are not drawn in the full-screen header`() {
        value = "inv"
        show(leading = true, trailing = 1)
        rule.onNodeWithTag(BEFORE).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag("leading").assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        input().assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithContentDescription("Clear search").assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag("trailing-0").assertIsFocused()
        rule.onNodeWithTag("leading").assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
    }

    @Test
    fun `SRC-25 the full-screen header draws no slot`() {
        value = "inv"
        show(presentation = TanreiSearchPresentation.FullScreen, leading = true, trailing = 1)
        input().requestFocus()
        expanded = true
        rule.waitForIdle()
        val header = rule.onNode(isDialog()).fetchSemanticsNode()
        fun names(node: androidx.compose.ui.semantics.SemanticsNode): List<String> = node.config.getOrElse(SemanticsProperties.ContentDescription) { emptyList() } + node.children.flatMap { names(it) }
        val inDialog = names(header)
        assertTrue("back and clear: $inDialog", "Back" in inDialog && "Clear search" in inDialog)
        assertFalse("no slot: $inDialog", "Menu" in inDialog || "Trailing 0" in inDialog)
    }

    // ── SRC-26 / SRC-27 / SRC-28 / SRC-29 ───────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `SRC-26 disabled - not focusable, editable or expandable, no clear button, announced disabled, the disabled tokens`() {
        value = "inv"
        show(enabled = false)
        input().assertIsNotEnabled()
        rule.onNodeWithTag(BEFORE).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(AFTER).assertIsFocused()
        bar().performTouchInput { click(Offset(with(rule.density) { 100.dp.toPx() }, centerY)) }
        rule.waitForIdle()
        input().assert(SemanticsMatcher("not focused") { it.config.getOrElse(SemanticsProperties.Focused) { false } == false })
        assertEquals(0, rule.onAllNodes(hasContentDescription("Clear search")).fetchSemanticsNodes().size)
        assertEquals(emptyList<String>(), events)
        assertEquals(look.disabled.leadingIconColor.resolve(colors), glyphColors["search"])
        assertPixel("the fill kept", barPixel(BAR_WIDTH / 2, visibleTop() + 4.dp), look.disabled.containerColor.resolve(colors))
    }

    @Test
    fun `SRC-27 an empty label, empty or repeated suggestion values, an empty headline and more than two trailing elements still render, and are reported`() = collectingReports { reports ->
        setDebuggable(true)
        expanded = true
        show(label = "", trailing = 3, suggestions = listOf(Suggestion("a", "A"), Suggestion("a", "A again"), Suggestion("", "")), inPlace = true)
        rule.waitForIdle()
        assertTrue("label: $reports", reports.any { "TanreiSearch" in it && "label" in it })
        assertTrue("repeated value: $reports", reports.any { "\"a\" is given to more than one" in it })
        assertTrue("empty value: $reports", reports.any { "value is empty" in it })
        assertTrue("empty headline: $reports", reports.any { "headline" in it })
        assertTrue("trailing: $reports", reports.any { "trailing slot holds 3" in it })
        assertEquals(3, rule.onAllNodes(SemanticsMatcher.keyIsDefined(SemanticsProperties.CollectionItemInfo)).fetchSemanticsNodes().size)
    }

    @Test
    fun `SRC-28 enlarged text grows the bar to hold one line of the input, and the icon buttons keep their size`() {
        value = "invoice"
        show(fontScale = 3f, leading = true)
        val b = barBounds()
        val field = input().getUnclippedBoundsInRoot()
        assertTrue("grown (${b.bottom - b.top})", b.bottom - b.top > tokens.containerHeight + 10.dp)
        assertTrue("one line: the input holds it", field.bottom - field.top < 26.dp * 3 * 2)
        val leading = rule.onNodeWithTag("leading").getUnclippedBoundsInRoot()
        assertDp("the leading button keeps its target height", tanrei.measure.targetTouch, leading.bottom - leading.top)
    }

    @Test
    fun `SRC-29 the default slot's content gets the headline color and the body style, inset by the rows' padding`() {
        expanded = true
        show(suggestions = listOf(three.first()), inPlace = true, extra = {
            slotContentColor = LocalTanreiContentColor.current
            slotTextStyleSize = LocalTanreiTextStyle.current.fontSize.value
            Box(Modifier.fillMaxWidth().height(10.dp).onGloballyPositioned { slotBounds = it.boundsInRoot() })
        })
        assertEquals(look.enabled.suggestionHeadlineColor.resolve(colors), slotContentColor)
        assertEquals(tanrei.typescale.body.size.value, slotTextStyleSize, 0.01f)
        val b = barBounds()
        with(rule.density) { assertDp("inset", tokens.viewPaddingInline + tokens.suggestionContainerPaddingInline, requireNotNull(slotBounds).left.toDp() - b.left) }
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun setDebuggable(debuggable: Boolean) {
        val info = ApplicationProvider.getApplicationContext<Context>().applicationInfo
        info.flags = if (debuggable) info.flags or ApplicationInfo.FLAG_DEBUGGABLE else info.flags and ApplicationInfo.FLAG_DEBUGGABLE.inv()
    }

    private fun collectingReports(block: (MutableList<String>) -> Unit) {
        val reports = mutableListOf<String>()
        val previous = TanreiDiagnostics.reporter
        TanreiDiagnostics.forgetReportedSteps()
        TanreiDiagnostics.reporter = { reports += it }
        try {
            block(reports)
        } finally {
            TanreiDiagnostics.reporter = previous
            setDebuggable(false)
        }
    }

    private fun assertDp(what: String, expected: Dp, actual: Dp, tolerance: Dp = 0.6.dp) =
        assertTrue("$what: expected $expected but was $actual", abs(expected.value - actual.value) <= tolerance.value)

    private fun isClose(actual: Color, expected: Color, tolerance: Float = PIXEL_TOLERANCE): Boolean =
        maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue)) <= tolerance

    private fun assertPixel(what: String, actual: Color, expected: Color) =
        assertTrue("$what: expected $expected but was $actual", isClose(actual, expected))

    private companion object {
        const val STAGE = "stage"
        const val SEARCH = "search"
        const val BEFORE = "before"
        const val AFTER = "after"
        const val PIXEL_TOLERANCE = 3f / 255f
        val STAGE_WIDTH = 360.dp
        val BAR_WIDTH = 328.dp
    }
}

/** SRC-18 and SRC-23 where motion is reduced (the animator duration scale is 0, see `TanreiButtonReducedMotionTest`). */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w480dp-h800dp-xhdpi")
class TanreiSearchReducedMotionTest {
    private object NoMotion : androidx.compose.ui.MotionDurationScale {
        override val scaleFactor: Float = 0f
    }

    @get:Rule
    val rule = createComposeRule(effectContext = NoMotion)

    private var expanded by mutableStateOf(false)

    @Test
    fun `SRC-23 where motion is reduced the view is shown and hidden at once`() {
        val tanrei = TanreiSystem.Tanrei
        var shown: androidx.compose.runtime.State<Float>? = null
        rule.setContent {
            TanreiTheme(system = tanrei.copy(search = tanrei.search.copy(motionOpenDuration = 2000, motionCloseDuration = 2000)), theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                val state = androidx.compose.runtime.remember { androidx.compose.animation.core.MutableTransitionState(false) }
                state.targetState = expanded
                shown = rememberTanreiSearchShown(state, TanreiTheme.tokens.search)
            }
        }
        rule.mainClock.autoAdvance = false
        expanded = true
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        repeat(2) { rule.mainClock.advanceTimeByFrame() }
        assertEquals("whole at once", 1f, shown!!.value, 0.001f)
        expanded = false
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        repeat(2) { rule.mainClock.advanceTimeByFrame() }
        assertEquals("gone at once", 0f, shown!!.value, 0.001f)
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `SRC-18 where motion is reduced a change of the bar's state is drawn at once`() {
        val tanrei = TanreiSystem.Tanrei
        val colors = tanrei.colors.light
        val hovered = tanrei.search.conditions.standard.let { it.copy(hovered = it.hovered.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Success))) }
        val slow = tanrei.search.copy(motionStateDuration = 2000, conditions = tanrei.search.conditions.copy(standard = hovered))
        rule.setContent {
            TanreiTheme(system = tanrei.copy(search = slow), theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Box(Modifier.width(328.dp)) {
                    TanreiSearch(value = "", onValueChange = {}, expanded = false, onExpandedChange = { _, _ -> }, label = "Search mail", modifier = Modifier.testTag("bar"))
                }
            }
        }
        rule.waitForIdle()
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag("bar").performMouseInput { moveTo(center) }
        repeat(3) { rule.mainClock.advanceTimeByFrame() }
        val map = rule.onNodeWithTag("bar").captureToImage().toPixelMap()
        val at = map[map.width / 2, map.height / 2 - with(rule.density) { 16.dp.roundToPx() }]
        assertTrue("hovered at once: $at", abs(at.red - colors[TanreiColorRole.Success].red) < 3f / 255f && abs(at.green - colors[TanreiColorRole.Success].green) < 3f / 255f)
        rule.mainClock.autoAdvance = true
    }
}
