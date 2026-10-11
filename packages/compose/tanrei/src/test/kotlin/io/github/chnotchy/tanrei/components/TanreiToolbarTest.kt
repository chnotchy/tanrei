package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.focusable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PixelMap
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.layout.positionInRoot
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.semantics.getOrNull
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.test.withKeyDown
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.toSize
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.primitives.TanreiText
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import io.github.chnotchy.tanrei.tokens.TanreiToolbarVariant
import io.github.chnotchy.tanrei.tokens.TanreiToolbarVariantTokens
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
 * Behaviour tests for `specs/toolbar.spec.json`. Each test names the behaviour id (`TBR-n`) it covers. Runs on the JVM
 * (Robolectric, native graphics). The toolbar is drawn on the surface of a stage of a given width, with a focusable box
 * before it and one after it where the keyboard is tested. Its items are real Tanrei icon buttons and Buttons, tagged
 * `item-<i>`; an icon button's glyph box records where it is drawn, so its visible container (the medium size's square,
 * centred on the glyph) can be measured apart from its touch target.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w480dp-h640dp-xhdpi")
class TanreiToolbarTest {
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
    private val tokens = tanrei.toolbar
    private val docked = tokens.variants.docked
    private val floating = tokens.variants.floating
    private val iconSize = tanrei.iconButton.sizes.medium.containerSize
    private val surface = colors[TanreiColorRole.Surface]

    private val events = mutableListOf<String>()
    private val icons = mutableMapOf<Int, Rect>()
    private val iconColors = mutableMapOf<Int, Color>()

    /** One item: an icon button (a toggle when [toggle]) or, when [button] is set, a Tanrei Button with that label. */
    private data class Item(val label: String, val enabled: Boolean = true, val toggle: Boolean = false, val checked: Boolean = false, val button: String? = null, val variant: TanreiIconButtonVariant = TanreiIconButtonVariant.Standard)

    private val four = listOf(Item("Bold"), Item("Italic"), Item("Underline"), Item("Link"))

    private fun show(
        system: TanreiSystem = tanrei,
        variant: TanreiToolbarVariant = TanreiToolbarVariant.Docked,
        orientation: Orientation = Orientation.Horizontal,
        items: List<Item> = four,
        label: String = "Formatting",
        stageWidth: Dp = 400.dp,
        toolbarWidth: Dp? = null,
        insets: WindowInsets = WindowInsets(0.dp, 0.dp, 0.dp, 0.dp),
        direction: LayoutDirection = LayoutDirection.Ltr,
        fontScale: Float = 1f,
        extra: (@Composable () -> Unit)? = null,
    ) {
        rule.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalLayoutDirection provides direction, LocalDensity provides Density(density.density, fontScale)) {
                TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                    Column(Modifier.testTag(STAGE).width(stageWidth).background(TanreiColorRole.Surface.color)) {
                        Box(Modifier.testTag(BEFORE).size(8.dp).focusable())
                        Box(if (toolbarWidth != null) Modifier.width(toolbarWidth) else Modifier) {
                            TanreiToolbar(contentDescription = label, modifier = Modifier.testTag(TOOLBAR), variant = variant, orientation = orientation, windowInsets = insets) {
                                items.forEachIndexed { i, item -> Item(i, item) }
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

    @Composable
    private fun Item(i: Int, item: Item) {
        if (item.button != null) {
            TanreiButton(onClick = { events += "click:$i" }, modifier = Modifier.testTag(tag(i)), variant = TanreiButtonVariant.Filled, enabled = item.enabled) { TanreiText(item.button) }
        } else {
            TanreiIconButton(
                onClick = { events += "click:$i" },
                contentDescription = item.label,
                modifier = Modifier.testTag(tag(i)),
                variant = item.variant,
                checked = item.checked,
                onCheckedChange = if (item.toggle) { value -> events += "change:$i:$value" } else null,
                enabled = item.enabled,
            ) {
                iconColors[i] = LocalTanreiContentColor.current
                Box(Modifier.fillMaxSize().onGloballyPositioned { icons[i] = Rect(it.positionInRoot(), it.size.toSize()) })
            }
        }
    }

    private fun tag(i: Int) = "item-$i"

    private fun item(i: Int) = rule.onNodeWithTag(tag(i))

    private fun toolbarBounds() = rule.onNodeWithTag(TOOLBAR).getUnclippedBoundsInRoot()

    /** Icon button [i]'s visible square, in dp from the root: the medium size's side, centred on its glyph. */
    private fun visible(i: Int): Pair<Dp, Dp> = with(rule.density) {
        val icon = requireNotNull(icons[i]) { "item $i drew no icon" }
        val center = icon.center.x.toDp()
        center - iconSize / 2 to center + iconSize / 2
    }

    private fun visibleVertical(i: Int): Pair<Dp, Dp> = with(rule.density) {
        val icon = requireNotNull(icons[i]) { "item $i drew no icon" }
        val center = icon.center.y.toDp()
        center - iconSize / 2 to center + iconSize / 2
    }

    private fun iconCenterY(i: Int): Dp = with(rule.density) { requireNotNull(icons[i]).center.y.toDp() }

    private fun stage(): PixelMap = rule.onNodeWithTag(STAGE).captureToImage().toPixelMap()

    /** A pixel at ([x], [y]) from the toolbar's top-left (negative: outside it). */
    private fun toolbarPixel(x: Dp, y: Dp, map: PixelMap = stage()): Color {
        val bar = toolbarBounds()
        val stage = rule.onNodeWithTag(STAGE).getUnclippedBoundsInRoot()
        return with(rule.density) { map[(bar.left - stage.left + x).roundToPx(), (bar.top - stage.top + y).roundToPx()] }
    }

    private fun TanreiSystem.withVariant(which: TanreiToolbarVariant, change: (TanreiToolbarVariantTokens) -> TanreiToolbarVariantTokens): TanreiSystem {
        val variants = toolbar.variants
        return copy(toolbar = toolbar.copy(variants = if (which == TanreiToolbarVariant.Floating) variants.copy(floating = change(variants.floating)) else variants.copy(docked = change(variants.docked))))
    }

    // ── TBR-1 / TBR-2 / TBR-3: docked ────────────────────────────────────────

    @Test
    fun `TBR-1 a docked toolbar spans its parent's width, is its size high, filled with its color, flat, square, with a hairline top edge`() {
        show()
        val bar = toolbarBounds()
        assertDp("width", 400.dp, bar.right - bar.left)
        assertDp("height", docked.containerSize, bar.bottom - bar.top)
        val map = stage()
        assertPixel("the container", toolbarPixel(2.dp, docked.containerSize / 2, map), docked.containerColor.resolve(colors))
        assertPixel("the top edge", toolbarPixel(200.dp, 0.25.dp, map), docked.outlineColor.resolve(colors).compositeOver(docked.containerColor.resolve(colors)))
        assertEquals("flat: level0", tanrei.elevation.level0, docked.containerElevation)
        assertEquals("square: corner.none", tanrei.shape.none, docked.containerShape)
    }

    @Test
    fun `TBR-1 the docked values drive it - size, color, corner, edge color and width`() {
        val system = tanrei.withVariant(TanreiToolbarVariant.Docked) {
            it.copy(containerSize = 64.dp, containerColor = TanreiPaint.Role(TanreiColorRole.Error), outlineColor = TanreiPaint.Role(TanreiColorRole.Primary))
        }.let { it.copy(toolbar = it.toolbar.copy(outlineWidth = 4.dp)) }
        show(system)
        val bar = toolbarBounds()
        assertDp("height", 64.dp, bar.bottom - bar.top)
        val map = stage()
        assertPixel("the edge", toolbarPixel(200.dp, 2.dp, map), colors[TanreiColorRole.Primary])
        assertPixel("under the edge", toolbarPixel(2.dp, 6.dp, map), colors[TanreiColorRole.Error])
        assertPixel("the bottom", toolbarPixel(2.dp, 62.dp, map), colors[TanreiColorRole.Error])
    }

    @Test
    fun `TBR-2 docked - the first item padding-inline from the start, the last as far from the end, equal space between, centred in the row`() {
        show()
        val bar = toolbarBounds()
        assertDp("first from the start", docked.containerPaddingInline, visible(0).first - bar.left)
        assertDp("last from the end", docked.containerPaddingInline, bar.right - visible(3).second)
        val gaps = (0 until 3).map { visible(it + 1).first - visible(it).second }
        gaps.forEach { assertDp("equal gaps $gaps", gaps.first(), it, tolerance = 1.dp) }
        assertTrue("never less than the gap", gaps.all { it >= docked.containerGap - 0.5.dp })
        (0 until 4).forEach { assertDp("item $it centred in the row", docked.containerSize / 2, iconCenterY(it) - bar.top) }
    }

    @Test
    fun `TBR-2 docked - one item is centred, and a row that just fits keeps the minimum gap`() {
        show(items = listOf(Item("Reply")))
        val bar = toolbarBounds()
        val (start, end) = visible(0)
        assertDp("centred", (bar.right - bar.left) / 2, (start + end) / 2 - bar.left)
    }

    @Test
    fun `TBR-2 docked - a row that just fits keeps exactly the minimum gap`() {
        val width = docked.containerPaddingInline * 2 + iconSize * 4 + docked.containerGap * 3
        show(stageWidth = width)
        (0 until 3).forEach { assertDp("gap $it", docked.containerGap, visible(it + 1).first - visible(it).second, tolerance = 1.dp) }
    }

    @Test
    fun `TBR-3 a docked toolbar reaches under the bottom inset with its color, and keeps its items above it and inside the side insets`() {
        val system = tanrei.withVariant(TanreiToolbarVariant.Docked) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        show(system, insets = WindowInsets(left = 12.dp, bottom = 20.dp))
        val bar = toolbarBounds()
        assertDp("the size plus the inset", docked.containerSize + 20.dp, bar.bottom - bar.top)
        assertPixel("the color under the inset", toolbarPixel(200.dp, docked.containerSize + 18.dp), colors[TanreiColorRole.Error])
        assertPixel("the color under the side inset", toolbarPixel(4.dp, 30.dp), colors[TanreiColorRole.Error])
        (0 until 4).forEach { assertDp("item $it above the inset", docked.containerSize / 2, iconCenterY(it) - bar.top) }
        assertDp("the first item inside the left inset", 12.dp + docked.containerPaddingInline, visible(0).first - bar.left)
    }

    @Test
    fun `TBR-3 TBR-5 the default insets are the navigation bars for a docked toolbar and none for a floating one`() {
        var dockedInsets: WindowInsets? = null
        var navigationBars: WindowInsets? = null
        var floatingInsets: WindowInsets? = null
        rule.setContent {
            dockedInsets = TanreiToolbarDefaults.windowInsets(TanreiToolbarVariant.Docked)
            navigationBars = WindowInsets.navigationBars
            floatingInsets = TanreiToolbarDefaults.windowInsets(TanreiToolbarVariant.Floating)
        }
        rule.waitForIdle()
        assertEquals(navigationBars, dockedInsets)
        val none = requireNotNull(floatingInsets)
        val density = Density(2f)
        assertEquals(listOf(0, 0, 0, 0), listOf(none.getLeft(density, LayoutDirection.Ltr), none.getTop(density), none.getRight(density, LayoutDirection.Ltr), none.getBottom(density)))
    }

    // ── TBR-4 / TBR-5 / TBR-6: floating ──────────────────────────────────────

    @Test
    fun `TBR-4 a floating toolbar is as long as its items need, its size across, a pill on its color, raised by its elevation`() {
        show(variant = TanreiToolbarVariant.Floating)
        val bar = toolbarBounds()
        assertDp("length", floating.containerPaddingInline * 2 + iconSize * 4 + floating.containerGap * 3, bar.right - bar.left)
        assertDp("across", floating.containerSize, bar.bottom - bar.top)
        assertDp("first from the start", floating.containerPaddingInline, visible(0).first - bar.left)
        (0 until 3).forEach { assertDp("gap $it", floating.containerGap, visible(it + 1).first - visible(it).second, tolerance = 0.5.dp) }
        (0 until 4).forEach { assertDp("item $it centred across", floating.containerSize / 2, iconCenterY(it) - bar.top) }
        val map = stage()
        assertPixel("the container", toolbarPixel(90.dp, 2.dp, map), floating.containerColor.resolve(colors))
        val below = toolbarPixel(90.dp, floating.containerSize + 3.dp, map)
        assertTrue("the shadow shows below it ($below)", below.red < surface.red - 2f / 255f)
        assertEquals("the FAB's level", tanrei.elevation.level3, floating.containerElevation)
        assertEquals("a pill", tanrei.shape.full, floating.containerShape)
    }

    @Test
    fun `TBR-4 the floating values drive it - padding, gap, color and edge`() {
        val system = tanrei.withVariant(TanreiToolbarVariant.Floating) {
            it.copy(containerPaddingInline = 20.dp, containerGap = 16.dp, containerSize = 60.dp, containerColor = TanreiPaint.Role(TanreiColorRole.Error), outlineColor = TanreiPaint.Role(TanreiColorRole.Primary))
        }.let { it.copy(toolbar = it.toolbar.copy(outlineWidth = 3.dp)) }
        show(system, variant = TanreiToolbarVariant.Floating)
        val bar = toolbarBounds()
        assertDp("length", 20.dp * 2 + iconSize * 4 + 16.dp * 3, bar.right - bar.left)
        assertDp("across", 60.dp, bar.bottom - bar.top)
        val map = stage()
        assertPixel("the edge around the shape", toolbarPixel(100.dp, 1.dp, map), colors[TanreiColorRole.Primary])
        assertPixel("the container", toolbarPixel(100.dp, 6.dp, map), colors[TanreiColorRole.Error])
        assertFalse("the corner is rounded away", isClose(toolbarPixel(2.dp, 2.dp, map), colors[TanreiColorRole.Error]))
        assertPixel("the rounded end", toolbarPixel(5.dp, 30.dp, map), colors[TanreiColorRole.Error])
    }

    @Test
    fun `TBR-5 a floating toolbar lays out at its own size where its parent places it, reaches under no inset and draws no scrim`() {
        show(variant = TanreiToolbarVariant.Floating, insets = TanreiToolbarDefaultsForTest.none)
        val bar = toolbarBounds()
        val stage = rule.onNodeWithTag(STAGE).getUnclippedBoundsInRoot()
        assertDp("at the parent's start", 0.dp, bar.left - stage.left)
        assertDp("its own length", floating.containerPaddingInline * 2 + iconSize * 4 + floating.containerGap * 3, bar.right - bar.left)
        assertPixel("no scrim beside it", toolbarPixel(300.dp, 24.dp), surface)
    }

    @Test
    fun `TBR-6 a vertical floating toolbar stacks its items top to bottom, the floating paddings along the vertical axis, its size wide`() {
        show(variant = TanreiToolbarVariant.Floating, orientation = Orientation.Vertical, items = four.take(3))
        val bar = toolbarBounds()
        assertDp("width", floating.containerSize, bar.right - bar.left)
        assertDp("height", floating.containerPaddingInline * 2 + iconSize * 3 + floating.containerGap * 2, bar.bottom - bar.top)
        assertDp("first from the top", floating.containerPaddingInline, visibleVertical(0).first - bar.top)
        (0 until 2).forEach { assertDp("gap $it", floating.containerGap, visibleVertical(it + 1).first - visibleVertical(it).second, tolerance = 0.5.dp) }
        with(rule.density) { (0 until 3).forEach { assertDp("item $it centred across", floating.containerSize / 2, icons.getValue(it).center.x.toDp() - bar.left) } }
    }

    @Test
    fun `TBR-6 a vertical docked toolbar lays out as a horizontal docked one, and a debuggable app reports it`() = collectingReports { reports ->
        setDebuggable(true)
        show(orientation = Orientation.Vertical)
        val bar = toolbarBounds()
        assertDp("the full width", 400.dp, bar.right - bar.left)
        assertDp("docked height", docked.containerSize, bar.bottom - bar.top)
        assertTrue("in one row", (0 until 3).all { visible(it + 1).first > visible(it).second })
        assertTrue("reported: $reports", reports.any { "docked toolbar is horizontal" in it })
    }

    // ── TBR-7: right-to-left ─────────────────────────────────────────────────

    @Test
    fun `TBR-7 right-to-left lays a horizontal toolbar's items out from the right edge, in reading order`() {
        show(direction = LayoutDirection.Rtl)
        val bar = toolbarBounds()
        assertDp("the first item at the right", docked.containerPaddingInline, bar.right - visible(0).second)
        assertTrue("reading order runs leftwards", (0 until 3).all { visible(it + 1).second < visible(it).first })
    }

    @Test
    fun `TBR-7 right-to-left keeps a vertical toolbar's top-to-bottom order`() {
        show(variant = TanreiToolbarVariant.Floating, orientation = Orientation.Vertical, items = four.take(3), direction = LayoutDirection.Rtl)
        assertTrue("top to bottom", (0 until 2).all { iconCenterY(it + 1) > iconCenterY(it) })
    }

    // ── TBR-8: overflow ──────────────────────────────────────────────────────

    @Test
    fun `TBR-8 items that do not fit keep their size and the minimum gap, scroll along the axis, and a debuggable app reports the overflow`() = collectingReports { reports ->
        setDebuggable(true)
        show(variant = TanreiToolbarVariant.Floating, toolbarWidth = 120.dp)
        val bar = toolbarBounds()
        assertDp("the layout's width", 120.dp, bar.right - bar.left)
        with(rule.density) { (0 until 4).forEach { assertDp("item $it keeps its icon size", tanrei.iconButton.sizes.medium.iconSize, icons.getValue(it).width.toDp()) } }
        (0 until 3).forEach { assertDp("gap $it", floating.containerGap, visible(it + 1).first - visible(it).second, tolerance = 0.5.dp) }
        val range = rule.onNodeWithTag(TOOLBAR).fetchSemanticsNode().config[SemanticsProperties.HorizontalScrollAxisRange]
        assertTrue("it scrolls", range.maxValue() > 0f)
        assertTrue("reported: $reports", reports.any { "overflow menu" in it })
    }

    @Test
    @KeyboardNavigation
    fun `TBR-8 an item that receives keyboard focus is brought fully into view`() {
        show(variant = TanreiToolbarVariant.Floating, toolbarWidth = 120.dp)
        item(0).requestFocus().performKeyInput { pressKey(Key.MoveEnd) }
        rule.waitForIdle()
        item(3).assertIsFocused()
        val bar = toolbarBounds()
        val (start, end) = visible(3)
        assertTrue("the last item is in view: $start..$end in ${bar.left}..${bar.right}", start >= bar.left - 0.5.dp && end <= bar.right + 0.5.dp)
    }

    /**
     * The toolbar as the gallery (and a product's scrolling screen) holds it: in a Row inside a scrolling Column (vertical),
     * or inside a scrolling Row (horizontal) — a parent with no limit along the toolbar's axis. There the items always fit,
     * so nothing scrolls; the toolbar is as long as its items need and never crashes the page.
     */
    private fun showUnbounded(variant: TanreiToolbarVariant, orientation: Orientation) {
        rule.setContent {
            TanreiTheme(system = tanrei, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                val toolbar: @Composable () -> Unit = {
                    TanreiToolbar(contentDescription = "Map controls", modifier = Modifier.testTag(TOOLBAR), variant = variant, orientation = orientation, windowInsets = TanreiToolbarDefaultsForTest.none) {
                        four.take(3).forEachIndexed { i, item -> Item(i, item) }
                    }
                }
                if (orientation == Orientation.Vertical) {
                    Column(Modifier.testTag(STAGE).verticalScroll(rememberScrollState())) { Row { toolbar() } }
                } else {
                    Row(Modifier.testTag(STAGE).horizontalScroll(rememberScrollState())) { toolbar() }
                }
            }
        }
        rule.waitForIdle()
    }

    @Test
    fun `TBR-8 TBR-6 a vertical floating toolbar in a vertically scrolling page is as long as its items, and neither scrolls nor reports overflow`() = collectingReports { reports ->
        setDebuggable(true)
        showUnbounded(TanreiToolbarVariant.Floating, Orientation.Vertical)
        val bar = toolbarBounds()
        assertDp("width", floating.containerSize, bar.right - bar.left)
        assertDp("its items' length", floating.containerPaddingInline * 2 + iconSize * 3 + floating.containerGap * 2, bar.bottom - bar.top)
        val range = rule.onNodeWithTag(TOOLBAR).fetchSemanticsNode().config.getOrNull(SemanticsProperties.VerticalScrollAxisRange)
        assertTrue("it does not scroll", range == null || range.maxValue() == 0f)
        assertFalse("no overflow reported: $reports", reports.any { "overflow menu" in it })
    }

    @Test
    fun `TBR-8 TBR-1 a docked toolbar in a horizontally scrolling row is as long as its items, and neither scrolls nor reports overflow`() = collectingReports { reports ->
        setDebuggable(true)
        showUnbounded(TanreiToolbarVariant.Docked, Orientation.Horizontal)
        val bar = toolbarBounds()
        assertDp("docked height", docked.containerSize, bar.bottom - bar.top)
        assertDp("its items' length", docked.containerPaddingInline * 2 + iconSize * 3 + docked.containerGap * 2, bar.right - bar.left)
        val range = rule.onNodeWithTag(TOOLBAR).fetchSemanticsNode().config.getOrNull(SemanticsProperties.HorizontalScrollAxisRange)
        assertTrue("it does not scroll", range == null || range.maxValue() == 0f)
        assertFalse("no overflow reported: $reports", reports.any { "overflow menu" in it })
    }

    // ── TBR-9: the items are themselves ──────────────────────────────────────

    @Test
    fun `TBR-9 the items are not restyled - their own colors, size, target, role and toggle state`() {
        show(items = listOf(Item("Bold", toggle = true, checked = true), Item("Italic", toggle = true), Item("Link"), Item("Send", button = "Send")))
        val standard = tanrei.iconButton.variants.standard.enabled
        assertEquals("a selected toggle's own icon color", standard.selectedIconColor.resolve(colors), iconColors[0])
        assertEquals("an unselected toggle's own icon color", standard.unselectedIconColor.resolve(colors), iconColors[1])
        assertEquals("a plain action's own icon color", standard.iconColor.resolve(colors), iconColors[2])
        val (start, end) = visible(2)
        assertDp("its own size", iconSize, end - start)
        val target = item(2).getUnclippedBoundsInRoot()
        assertTrue("its own target across the row", target.bottom - target.top >= tanrei.measure.targetTouch - 0.5.dp)
        item(0).assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button)).assert(SemanticsMatcher.expectValue(SemanticsProperties.ToggleableState, ToggleableState.On))
        item(1).assert(SemanticsMatcher.expectValue(SemanticsProperties.ToggleableState, ToggleableState.Off))
        item(3).assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
        item(1).performClick()
        item(3).performClick()
        rule.waitForIdle()
        assertEquals("a toggle emits click, then change; the Button its click", listOf("click:1", "change:1:true", "click:3"), events)
    }

    @Test
    fun `TBR-9 a disabled item keeps its own disabled behaviour`() {
        show(items = listOf(Item("Archive"), Item("Delete", enabled = false)))
        item(1).assertIsNotEnabled().performClick()
        rule.waitForIdle()
        assertEquals(emptyList<String>(), events)
    }

    // ── TBR-10: the keyboard ─────────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `TBR-10 one Tab stop - the first enabled item, the arrows move among enabled items wrapping, Home and End, and Tab leaves and returns to the item focused last`() {
        show(items = listOf(Item("Archive", enabled = false), Item("Delete"), Item("Move"), Item("Send", button = "Send")))
        rule.onNodeWithTag(BEFORE).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        item(1).assertIsFocused().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        item(2).assertIsFocused().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        item(3).assertIsFocused().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        item(1).assertIsFocused().performKeyInput { pressKey(Key.DirectionLeft) }
        rule.waitForIdle()
        item(3).assertIsFocused().performKeyInput { pressKey(Key.MoveHome) }
        rule.waitForIdle()
        item(1).assertIsFocused().performKeyInput { pressKey(Key.MoveEnd) }
        rule.waitForIdle()
        item(3).assertIsFocused().performKeyInput { pressKey(Key.DirectionLeft) }
        rule.waitForIdle()
        item(2).assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(AFTER).assertIsFocused().performKeyInput { withKeyDown(Key.ShiftLeft) { pressKey(Key.Tab) } }
        rule.waitForIdle()
        item(2).assertIsFocused()
        assertEquals("moving focus activates nothing", emptyList<String>(), events)
    }

    @Test
    @KeyboardNavigation
    fun `TBR-10 Enter and Space act on the focused item as that item does`() {
        show(items = listOf(Item("Bold", toggle = true), Item("Send", button = "Send")))
        item(0).requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        item(0).performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        item(1).assertIsFocused().performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        assertEquals(listOf("click:0", "change:0:true", "click:1"), events)
    }

    @Test
    @KeyboardNavigation
    fun `TBR-10 a vertical toolbar moves with Down and Up, and Left and Right leave focus where it is`() {
        show(variant = TanreiToolbarVariant.Floating, orientation = Orientation.Vertical, items = four.take(3))
        item(0).requestFocus().performKeyInput { pressKey(Key.DirectionDown) }
        rule.waitForIdle()
        item(1).assertIsFocused().performKeyInput { pressKey(Key.DirectionDown) }
        rule.waitForIdle()
        item(2).assertIsFocused().performKeyInput { pressKey(Key.DirectionDown) }
        rule.waitForIdle()
        item(0).assertIsFocused().performKeyInput { pressKey(Key.DirectionUp) }
        rule.waitForIdle()
        item(2).assertIsFocused().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        item(2).assertIsFocused()
    }

    @Test
    @KeyboardNavigation
    fun `TBR-10 TBR-7 in a right-to-left layout Left Arrow moves to the next item and Right Arrow to the previous`() {
        show(direction = LayoutDirection.Rtl)
        item(0).requestFocus().performKeyInput { pressKey(Key.DirectionLeft) }
        rule.waitForIdle()
        item(1).assertIsFocused().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        item(0).assertIsFocused().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        item(3).assertIsFocused()
    }

    @Test
    @KeyboardNavigation
    fun `TBR-10 an icon button outside a toolbar is its own Tab stop, unchanged`() {
        rule.setContent {
            TanreiTheme(system = tanrei, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Column {
                    Box(Modifier.testTag(BEFORE).size(8.dp).focusable())
                    TanreiIconButton(onClick = {}, contentDescription = "A", modifier = Modifier.testTag(tag(0))) {}
                    TanreiIconButton(onClick = {}, contentDescription = "B", modifier = Modifier.testTag(tag(1))) {}
                }
            }
        }
        rule.onNodeWithTag(BEFORE).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        item(0).assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        item(1).assertIsFocused()
    }

    // ── TBR-11: semantics ────────────────────────────────────────────────────

    @Test
    fun `TBR-11 the toolbar is a traversal group named by its label that holds its items in order, and adds nothing to them`() {
        show(items = listOf(Item("Bold", toggle = true, checked = true), Item("Italic"), Item("Send", button = "Send")))
        val node = rule.onNodeWithTag(TOOLBAR).fetchSemanticsNode()
        assertEquals(listOf("Formatting"), node.config[SemanticsProperties.ContentDescription])
        assertTrue("a traversal group", node.config[SemanticsProperties.IsTraversalGroup])
        assertFalse("no role of its own (Compose has no toolbar role)", node.config.contains(SemanticsProperties.Role))
        val children = node.children
        assertEquals(3, children.size)
        assertEquals(listOf("Bold"), children[0].config[SemanticsProperties.ContentDescription])
        assertEquals(listOf("Italic"), children[1].config[SemanticsProperties.ContentDescription])
        assertEquals(ToggleableState.On, children[0].config[SemanticsProperties.ToggleableState])
        assertFalse("the toolbar's name is not added to an item", children[1].config[SemanticsProperties.ContentDescription].contains("Formatting"))
        rule.onNode(hasContentDescription("Bold")).assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
    }

    // ── TBR-12: reports ──────────────────────────────────────────────────────

    @Test
    fun `TBR-12 an empty label still renders, and a debuggable app reports that it has no accessible name`() = collectingReports { reports ->
        setDebuggable(true)
        show(label = "")
        val bar = toolbarBounds()
        assertDp("rendered", docked.containerSize, bar.bottom - bar.top)
        assertFalse("no name", rule.onNodeWithTag(TOOLBAR).fetchSemanticsNode().config.contains(SemanticsProperties.ContentDescription))
        assertTrue("reported: $reports", reports.any { "TanreiToolbar" in it && "contentDescription" in it })
    }

    @Test
    fun `TBR-12 a toolbar with no item still lays out, and a debuggable app reports it`() = collectingReports { reports ->
        setDebuggable(true)
        show(items = emptyList())
        val bar = toolbarBounds()
        assertDp("its size", docked.containerSize, bar.bottom - bar.top)
        assertTrue("reported: $reports", reports.any { "holds no item" in it })
    }

    @Test
    fun `TBR-12 content that is not an icon button or a button is still laid out, and a debuggable app reports it`() = collectingReports { reports ->
        setDebuggable(true)
        show(items = listOf(Item("Bold")), extra = { Box(Modifier.testTag("foreign").size(40.dp).focusable()) })
        val foreign = rule.onNodeWithTag("foreign").getUnclippedBoundsInRoot()
        assertDp("laid out at its size", 40.dp, foreign.right - foreign.left)
        assertTrue("after the item", foreign.left > visible(0).second)
        assertTrue("reported: $reports", reports.any { "not a Tanrei icon button or button" in it })
    }

    // ── TBR-13: unknown values ───────────────────────────────────────────────

    @Test
    fun `TBR-13 a variant the design system does not have draws docked's tokens, and a debuggable app reports it`() = collectingReports { reports ->
        setDebuggable(true)
        val system = tanrei.withVariant(TanreiToolbarVariant.Docked) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        show(system, variant = TanreiToolbarVariant("pinned"))
        val bar = toolbarBounds()
        assertDp("docked's width", 400.dp, bar.right - bar.left)
        assertDp("docked's height", docked.containerSize, bar.bottom - bar.top)
        assertPixel("docked's color", toolbarPixel(2.dp, 30.dp), colors[TanreiColorRole.Error])
        assertTrue("reported: $reports", reports.any { "pinned" in it && "TanreiToolbar" in it })
    }

    @Test
    fun `TBR-13 orientation is a closed enum - no value outside the spec can be passed`() {
        assertEquals(setOf("horizontal", "vertical"), Orientation.entries.map { it.name.lowercase() }.toSet())
    }

    // ── TBR-14: enlarged text ────────────────────────────────────────────────

    @Test
    fun `TBR-14 enlarged text grows the toolbar across its axis to hold a Button, and its icon buttons keep their size`() {
        show(variant = TanreiToolbarVariant.Floating, items = listOf(Item("Bold"), Item("Send", button = "Send")), fontScale = 2f)
        val bar = toolbarBounds()
        val button = item(1).getUnclippedBoundsInRoot()
        assertTrue("taller than its size (${bar.bottom - bar.top})", bar.bottom - bar.top > floating.containerSize + 1.dp)
        assertTrue("holds the button", button.top >= bar.top - 0.5.dp && button.bottom <= bar.bottom + 0.5.dp)
        val (start, end) = visible(0)
        assertDp("the icon button keeps its size", iconSize, end - start)
        with(rule.density) { assertDp("and its icon", tanrei.iconButton.sizes.medium.iconSize, icons.getValue(0).width.toDp()) }
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

    private fun assertDp(what: String, expected: Dp, actual: Dp, tolerance: Dp = 0.5.dp) =
        assertTrue("$what: expected $expected but was $actual", abs(expected.value - actual.value) <= tolerance.value)

    private fun isClose(actual: Color, expected: Color, tolerance: Float = PIXEL_TOLERANCE): Boolean =
        maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue)) <= tolerance

    private fun assertPixel(what: String, actual: Color, expected: Color) =
        assertTrue("$what: expected $expected but was $actual", isClose(actual, expected))

    private object TanreiToolbarDefaultsForTest {
        val none = WindowInsets(0.dp, 0.dp, 0.dp, 0.dp)
    }

    private companion object {
        const val STAGE = "stage"
        const val TOOLBAR = "toolbar"
        const val BEFORE = "before"
        const val AFTER = "after"
        const val PIXEL_TOLERANCE = 3f / 255f
    }
}
