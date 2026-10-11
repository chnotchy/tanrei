package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.MotionDurationScale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PixelMap
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertHeightIsEqualTo
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertWidthIsEqualTo
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.test.swipeDown
import androidx.compose.ui.test.swipeUp
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.DpRect
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.primitives.TanreiText
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.TanreiAppBarConditionTokens
import io.github.chnotchy.tanrei.tokens.TanreiAppBarSize
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiShadowLayer
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import io.github.chnotchy.tanrei.tokens.Tanrei
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
 * Behaviour tests for `specs/app-bar.spec.json`. Each test names the behaviour id (`APB-n`) it covers. Runs on the JVM
 * (Robolectric, native graphics) — no emulator needed. The bar is drawn on the surface, [STAGE_WIDTH] wide, with no
 * system insets unless a test gives some, a focusable box before it and a [BELOW] strip after it (where a shadow shows).
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiAppBarTest {
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
    private val tokens = tanrei.appBar
    private val surface = colors[TanreiColorRole.Surface]
    private val small = tokens.sizes.small
    private val large = tokens.sizes.large

    private val clicks = mutableListOf<String>()
    private var behavior: TanreiAppBarScrollBehavior? = null

    private class Scene(val system: TanreiSystem, val direction: LayoutDirection, val fontScale: Float, val content: @Composable () -> Unit)

    private var scene by mutableStateOf<Scene?>(null)

    private fun show(system: TanreiSystem = tanrei, direction: LayoutDirection = LayoutDirection.Ltr, fontScale: Float = 1f, content: @Composable () -> Unit) {
        val first = scene == null
        scene = Scene(system, direction, fontScale, content)
        if (!first) {
            rule.waitForIdle()
            return
        }
        rule.setContent {
            val current = scene ?: return@setContent
            key(current) {
                val density = LocalDensity.current
                CompositionLocalProvider(LocalLayoutDirection provides current.direction, LocalDensity provides Density(density.density, current.fontScale)) {
                    TanreiTheme(system = current.system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                        Box(Modifier.testTag(STAGE_TAG).width(STAGE_WIDTH).background(TanreiColorRole.Surface.color)) { current.content() }
                    }
                }
            }
        }
        rule.waitForIdle()
    }

    /**
     * A bar with [navigation] and [actions] icon buttons (standard, medium, labelled by the strings, tagged `nav-i` and
     * `action-i`) between a focusable box before it and a [BELOW] strip after it. [state] connects a scroll behavior —
     * the collapse behavior when [collapses], the pinned one otherwise; the behavior is kept in [behavior].
     */
    private fun showBar(
        system: TanreiSystem = tanrei,
        size: TanreiAppBarSize = TanreiAppBarSize.Small,
        title: String = "Inbox",
        subtitle: String = "",
        alignment: TanreiAppBarTitleAlignment = TanreiAppBarTitleAlignment.Start,
        navigation: List<String> = listOf("Back"),
        actions: List<String> = listOf("Search", "More options"),
        state: TanreiAppBarState? = null,
        collapses: Boolean = false,
        insets: WindowInsets = WindowInsets(0, 0, 0, 0),
        direction: LayoutDirection = LayoutDirection.Ltr,
        fontScale: Float = 1f,
        scrollingContent: Boolean = false,
    ) = show(system, direction, fontScale) {
        val connected = state?.let { if (collapses) TanreiAppBarDefaults.collapseScrollBehavior(it) else TanreiAppBarDefaults.pinnedScrollBehavior(it) }
        behavior = connected
        Column {
            Box(Modifier.testTag(BEFORE).size(8.dp).focusable())
            TanreiAppBar(
                title = title,
                modifier = Modifier.testTag(BAR),
                navigationIcon = if (navigation.isEmpty()) null else { { navigation.forEachIndexed { i, label -> Button(label, "nav-$i") } } },
                actions = if (actions.isEmpty()) null else { { actions.forEachIndexed { i, label -> Button(label, "action-$i") } } },
                subtitle = subtitle,
                size = size,
                titleAlignment = alignment,
                scrollBehavior = connected,
                windowInsets = insets,
            )
            if (scrollingContent && connected != null) {
                Column(
                    Modifier.testTag(CONTENT).fillMaxWidth().height(240.dp)
                        .nestedScroll(connected.nestedScrollConnection)
                        .verticalScroll(rememberScrollState()),
                ) { repeat(40) { TanreiText("Message $it", Modifier.height(40.dp)) } }
            } else {
                Box(Modifier.testTag(AFTER).fillMaxWidth().height(BELOW).focusable())
            }
        }
    }

    @Composable
    private fun Button(label: String, tag: String) {
        TanreiIconButton(onClick = { clicks += label }, contentDescription = label, modifier = Modifier.testTag(tag), variant = TanreiIconButtonVariant.Standard, size = TanreiIconButtonSize.Medium) {
            BarFixtureGlyph("search")
        }
    }

    // ── APB-1 / APB-2: the conditions ────────────────────────────────────────

    @Test
    fun `APB-1 while not scrolled the bar fills its container with the flat color, raises it by the flat elevation and draws the flat bottom edge`() {
        val system = tanrei.withCondition(scrolled = false) {
            it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Primary), containerElevation = listOf(hardShadow(TanreiColorRole.Error)), outlineColor = TanreiPaint.Role(TanreiColorRole.Success))
        }
        showBar(system = system)
        assertPixel("the flat container", barPixel(barWidth() / 2, 4.dp), colors[TanreiColorRole.Primary])
        assertPixel("the flat bottom edge", barPixel(barWidth() / 2, barHeight() - 0.5.dp), colors[TanreiColorRole.Success])
        assertPixel("outline-width thick", barPixel(barWidth() / 2, barHeight() - tokens.outlineWidth - 1.dp), colors[TanreiColorRole.Primary])
        assertPixel("the flat elevation's shadow below the bar", barPixel(barWidth() / 2, barHeight() + 4.dp), colors[TanreiColorRole.Error])
        // The default system: the page's surface, flush, no edge.
        showBar()
        assertEquals(TanreiPaint.None, tokens.conditions.flat.outlineColor)
        assertPixel("no edge by default", barPixel(barWidth() / 2, barHeight() - 0.5.dp), surface)
        assertPixel("the surface by default", barPixel(barWidth() / 2, 4.dp), tokens.conditions.flat.containerColor.resolve(colors))
    }

    @Test
    fun `APB-2 while scrolled the bar fills its container with the scrolled color, raises it by the scrolled elevation and draws the scrolled bottom edge`() {
        val system = tanrei.withCondition(scrolled = true) {
            it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Warning), containerElevation = listOf(hardShadow(TanreiColorRole.Error)), outlineColor = TanreiPaint.Role(TanreiColorRole.Success))
        }
        showBar(system = system, state = TanreiAppBarState(initialContentOffset = 1f))
        assertPixel("the scrolled container", barPixel(barWidth() / 2, 4.dp), colors[TanreiColorRole.Warning])
        assertPixel("the scrolled bottom edge", barPixel(barWidth() / 2, barHeight() - 0.5.dp), colors[TanreiColorRole.Success])
        assertPixel("the scrolled elevation's shadow", barPixel(barWidth() / 2, barHeight() + 4.dp), colors[TanreiColorRole.Error])
        // The default system: an outline-variant hairline.
        showBar(state = TanreiAppBarState(initialContentOffset = 1f))
        assertPixel("the hairline edge by default", barPixel(barWidth() / 2, barHeight() - 0.5.dp), tokens.conditions.scrolled.outlineColor.resolve(colors).compositeOver(surface))
        assertPixel("above it the surface", barPixel(barWidth() / 2, barHeight() - tokens.outlineWidth - 0.5.dp), surface)
    }

    // ── APB-3: condition motion ──────────────────────────────────────────────

    @Test
    fun `APB-3 a change of scrolled moves the container color and the bottom edge over the condition duration and easing`() {
        val slow = 400
        val system = tanrei.withCondition(scrolled = true) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
            .let { it.copy(appBar = it.appBar.copy(motionConditionDuration = slow, motionConditionEasing = tanrei.motion.easing.linear)) }
        val state = TanreiAppBarState()
        showBar(system = system, state = state)
        assertPixel("flat", barPixel(barWidth() / 2, 4.dp), surface)
        rule.mainClock.autoAdvance = false
        state.contentOffset = 10f
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(slow / 2L)
        val half = barPixel(barWidth() / 2, 4.dp)
        assertTrue("on its way: $half", !isClose(half, surface) && !isClose(half, colors[TanreiColorRole.Error]))
        val edge = barPixel(barWidth() / 2, barHeight() - 0.5.dp)
        assertTrue("the edge on its way: $edge", !isClose(edge, colors[TanreiColorRole.Error]))
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertPixel("arrived", barPixel(barWidth() / 2, 4.dp), colors[TanreiColorRole.Error])
        rule.mainClock.autoAdvance = true
    }

    // ── APB-4: the top row ───────────────────────────────────────────────────

    @Test
    fun `APB-4 the bar spans its parent and lays out navigation, title and actions in a top row at least small's height`() {
        showBar()
        val bar = bounds(BAR)
        assertEquals("full width", STAGE_WIDTH.value, (bar.right - bar.left).value, 0.5f)
        rule.onNodeWithTag(BAR).assertHeightIsEqualTo(small.containerHeight)
        val nav = bounds("nav-0")
        val first = bounds("action-0")
        val last = bounds("action-1")
        assertEquals("navigation at padding-inline from the start", (bar.left + tokens.containerPaddingInline).value, nav.left.value, 0.5f)
        assertEquals("actions at padding-inline from the end", (bar.right - tokens.containerPaddingInline).value, last.right.value, 0.5f)
        assertEquals("actions.gap between actions", tokens.actionsGap.value, (last.left - first.right).value, 0.5f)
        val title = textBounds("Inbox")
        assertEquals("the title container.gap after the navigation slot", (nav.right + tokens.containerGap).value, title.left.value, 0.5f)
        val row = bar.top + small.containerHeight / 2
        for ((what, box) in listOf("navigation" to nav, "action" to first, "title" to title)) {
            assertEquals("$what centered in the row", row.value, ((box.top + box.bottom) / 2).value, 0.6f)
        }
    }

    @Test
    fun `APB-4 without a navigation item the title starts title-inset from the start edge`() {
        showBar(navigation = emptyList())
        assertEquals((bounds(BAR).left + tokens.titleInset).value, textBounds("Inbox").left.value, 0.5f)
    }

    @Test
    fun `APB-4 a right-to-left layout mirrors the order`() {
        showBar(direction = LayoutDirection.Rtl)
        val bar = bounds(BAR)
        val nav = bounds("nav-0")
        assertEquals("navigation at the right", (bar.right - tokens.containerPaddingInline).value, nav.right.value, 0.5f)
        assertEquals("actions at the left", (bar.left + tokens.containerPaddingInline).value, bounds("action-1").left.value, 0.5f)
        assertTrue("the first action nearer the title", bounds("action-0").left > bounds("action-1").left)
        assertEquals("the title before the navigation slot", (nav.left - tokens.containerGap).value, textBounds("Inbox").right.value, 0.5f)
    }

    @Test
    fun `APB-4 tokens drive the row - padding, gaps and height from a modified system`() {
        val system = tanrei.copy(appBar = tokens.copy(containerPaddingInline = 20.dp, actionsGap = 16.dp, containerGap = 24.dp, sizes = tokens.sizes.copy(small = small.copy(containerHeight = 72.dp))))
        showBar(system = system)
        val bar = bounds(BAR)
        rule.onNodeWithTag(BAR).assertHeightIsEqualTo(72.dp)
        assertEquals((bar.left + 20.dp).value, bounds("nav-0").left.value, 0.5f)
        assertEquals(16f, (bounds("action-1").left - bounds("action-0").right).value, 0.5f)
        assertEquals((bounds("nav-0").right + 24.dp).value, textBounds("Inbox").left.value, 0.5f)
    }

    // ── APB-5: title and subtitle ────────────────────────────────────────────

    @Test
    fun `APB-5 the title and subtitle are one line each in the small styles and colors, centered as a block`() {
        val system = tanrei.copy(appBar = tokens.copy(titleColor = TanreiPaint.Role(TanreiColorRole.Error), subtitleColor = TanreiPaint.Role(TanreiColorRole.Success)))
        showBar(system = system, title = "Quarterly report", subtitle = "Edited 5 minutes ago")
        val title = textBounds("Quarterly report")
        val subtitle = textBounds("Edited 5 minutes ago")
        with(rule.density) {
            assertEquals("the title's style", small.titleTypescale.lineHeight.toDp().value, (title.bottom - title.top).value, 0.6f)
            assertEquals("the subtitle's style", small.subtitleTypescale.lineHeight.toDp().value, (subtitle.bottom - subtitle.top).value, 0.6f)
        }
        assertEquals("the subtitle below the title", title.bottom.value, subtitle.top.value, 0.6f)
        val bar = bounds(BAR)
        assertEquals("centered as a block", (bar.top + small.containerHeight / 2).value, ((title.top + subtitle.bottom) / 2).value, 0.6f)
        assertTrue("the title's color", anyPixelClose(title, colors[TanreiColorRole.Error]))
        assertTrue("the subtitle's color", anyPixelClose(subtitle, colors[TanreiColorRole.Success]))
    }

    @Test
    fun `APB-5 a title that does not fit is truncated at the end with an ellipsis on one line`() {
        val long = "A very long screen name that cannot possibly fit in the top row of the bar"
        showBar(title = long, subtitle = "And a subtitle that is also far too long to fit in the room it is given")
        for (text in listOf(long, "And a subtitle that is also far too long to fit in the room it is given")) {
            val layout = textLayout(text)
            assertEquals("$text: one line", 1, layout.lineCount)
            assertTrue("$text: ellipsized", layout.isLineEllipsized(0))
        }
        assertTrue("never under the actions", textBounds(long).right <= bounds("action-0").left - tokens.containerGap + 0.5.dp)
    }

    // ── APB-6: alignment ─────────────────────────────────────────────────────

    @Test
    fun `APB-6 a centered title is centered on the bar's full width, its text centered`() {
        showBar(alignment = TanreiAppBarTitleAlignment.Center)
        val bar = bounds(BAR)
        val title = textBounds("Inbox")
        assertEquals(((bar.left + bar.right) / 2).value, ((title.left + title.right) / 2).value, 0.6f)
    }

    @Test
    fun `APB-6 a long centered title narrows equally on both sides and never overlaps the slots`() {
        val long = "A very long screen name that cannot possibly fit in the top row"
        showBar(alignment = TanreiAppBarTitleAlignment.Center, title = long, subtitle = "Short")
        val bar = bounds(BAR)
        val title = textBounds(long)
        assertEquals("equal on both sides", (title.left - bar.left).value, (bar.right - title.right).value, 0.6f)
        assertTrue("clear of the actions", title.right <= bounds("action-0").left - tokens.containerGap + 0.5.dp)
        assertTrue("clear of the navigation", title.left >= bounds("nav-0").right + tokens.containerGap - 0.5.dp)
        assertTrue(textLayout(long).isLineEllipsized(0))
        val subtitle = textBounds("Short")
        assertEquals("the subtitle's text centered too", ((bar.left + bar.right) / 2).value, ((subtitle.left + subtitle.right) / 2).value, 0.6f)
    }

    // ── APB-7: large, expanded ───────────────────────────────────────────────

    @Test
    fun `APB-7 an expanded large bar is at least large's height, has no title in its top row, and its title row ends padding-block-end above the bottom`() {
        showBar(size = TanreiAppBarSize.Large, navigation = listOf("Menu"))
        rule.onNodeWithTag(BAR).assertHeightIsEqualTo(large.containerHeight)
        val bar = bounds(BAR)
        val title = textBounds("Inbox")
        assertEquals("from title-inset", (bar.left + tokens.titleInset).value, title.left.value, 0.5f)
        assertEquals("ending padding-block-end above the bottom", (bar.bottom - tokens.containerPaddingBlockEnd).value, title.bottom.value, 0.6f)
        with(rule.density) { assertEquals("large's style", large.titleTypescale.lineHeight.toDp().value, (title.bottom - title.top).value, 0.6f) }
        assertTrue("below the top row", title.top >= bar.top + small.containerHeight)
        // Nothing is drawn where the top row's title would be.
        val between = DpRect(bounds("nav-0").right, bar.top, bounds("action-0").left, bar.top + small.containerHeight)
        assertFalse("no title in the top row", anyPixelClose(between, colors[TanreiColorRole.OnSurface], tolerance = 0.25f))
    }

    @Test
    fun `APB-7 an expanded large bar with a subtitle grows to hold both lines in large's styles`() {
        showBar(size = TanreiAppBarSize.Large, subtitle = "ada@example.com")
        val bar = bounds(BAR)
        val title = textBounds("Inbox")
        val subtitle = textBounds("ada@example.com")
        with(rule.density) {
            assertEquals(large.subtitleTypescale.lineHeight.toDp().value, (subtitle.bottom - subtitle.top).value, 0.6f)
            val needed = small.containerHeight + large.titleTypescale.lineHeight.toDp() + large.subtitleTypescale.lineHeight.toDp() + tokens.containerPaddingBlockEnd
            assertEquals("a minimum: it grows", maxOf(needed, large.containerHeight).value, (bar.bottom - bar.top).value, 0.6f)
        }
        assertEquals(title.bottom.value, subtitle.top.value, 0.6f)
        assertEquals((bar.bottom - tokens.containerPaddingBlockEnd).value, subtitle.bottom.value, 0.6f)
        assertEquals((bar.left + tokens.titleInset).value, subtitle.left.value, 0.5f)
    }

    // ── APB-8: the collapse ──────────────────────────────────────────────────

    @Test
    fun `APB-8 a large bar collapses one for one with the scroll, the expanded title moving up with its bottom edge, and expands again`() {
        val state = TanreiAppBarState()
        showBar(size = TanreiAppBarSize.Large, state = state, collapses = true)
        val connection = behavior!!.nestedScrollConnection
        val step = with(rule.density) { 20.dp.toPx() }
        val consumed = rule.runOnIdle { connection.onPreScroll(Offset(0f, -step), NestedScrollSource.UserInput) }
        assertEquals("the bar takes the whole scroll", -step, consumed.y, 0.01f)
        rule.waitForIdle()
        rule.onNodeWithTag(BAR).assertHeightIsEqualTo(large.containerHeight - 20.dp)
        assertEquals("the title moved with the bottom edge", (bounds(BAR).bottom - tokens.containerPaddingBlockEnd).value, textBounds("Inbox").bottom.value, 0.6f)
        // To the top row, and no further: what is left is the content's.
        val rest = rule.runOnIdle { connection.onPreScroll(Offset(0f, -step * 10), NestedScrollSource.UserInput) }
        assertEquals((large.containerHeight - small.containerHeight - 20.dp).value, with(rule.density) { (-rest.y).toDp().value }, 0.5f)
        rule.waitForIdle()
        rule.onNodeWithTag(BAR).assertHeightIsEqualTo(small.containerHeight)
        assertEquals(1f, state.collapsedFraction, 0.001f)
        // Back at the content's top: what it leaves expands the bar the same way.
        val back = rule.runOnIdle { connection.onPostScroll(Offset.Zero, Offset(0f, step), NestedScrollSource.UserInput) }
        assertEquals(step, back.y, 0.01f)
        rule.waitForIdle()
        rule.onNodeWithTag(BAR).assertHeightIsEqualTo(small.containerHeight + 20.dp)
    }

    @Test
    fun `APB-8 the top row's title is invisible while the expanded title shows, fades in as it is covered, and shows once collapsed`() {
        val state = TanreiAppBarState()
        showBar(size = TanreiAppBarSize.Large, state = state, collapses = true, navigation = listOf("Menu"))
        val row = { DpRect(bounds("nav-0").right, bounds(BAR).top, bounds("action-0").left, bounds(BAR).top + small.containerHeight) }
        val ink = colors[TanreiColorRole.OnSurface]
        val free = large.containerHeight - small.containerHeight - tokens.containerPaddingBlockEnd - with(rule.density) { large.titleTypescale.lineHeight.toDp() }
        fun collapse(by: Dp) {
            rule.runOnIdle { state.collapsedOffset = with(rule.density) { by.toPx() } }
            rule.waitForIdle()
        }
        collapse(free)
        assertFalse("invisible while the expanded title is wholly visible", anyPixelClose(row(), ink, tolerance = 0.25f))
        collapse(free + with(rule.density) { large.titleTypescale.lineHeight.toDp() } / 2)
        val darkest = darkestIn(DpRect(row().left, row().top, row().right, row().bottom))
        assertTrue("half faded in: $darkest", !isClose(darkest, ink, 0.1f) && !isClose(darkest, surface, 0.1f))
        collapse(large.containerHeight)
        assertTrue("visible once collapsed", anyPixelClose(row(), ink, tolerance = 0.12f))
    }

    @Test
    fun `APB-8 the expanded title is clipped under the top row as it moves up`() {
        val state = TanreiAppBarState()
        showBar(size = TanreiAppBarSize.Large, state = state, collapses = true, navigation = listOf("Menu"), alignment = TanreiAppBarTitleAlignment.Center, title = "Inboxes")
        val line = with(rule.density) { large.titleTypescale.lineHeight.toDp() }
        val free = large.containerHeight - small.containerHeight - tokens.containerPaddingBlockEnd - line
        rule.runOnIdle { state.collapsedOffset = with(rule.density) { (free + line / 2).toPx() } }
        rule.waitForIdle()
        // The centered top-row title is in the middle; the expanded title's upper half is under the top row at the start.
        val bar = bounds(BAR)
        val underRow = DpRect(bounds("nav-0").right + 2.dp, bar.top + small.containerHeight - line / 2, bar.left + 100.dp, bar.top + small.containerHeight - 1.dp)
        assertFalse("nothing drawn above the top row's bottom", anyPixelClose(underRow, colors[TanreiColorRole.OnSurface], tolerance = 0.25f))
        val below = DpRect(bar.left + tokens.titleInset, bar.top + small.containerHeight, bar.left + 100.dp, bar.bottom)
        assertTrue("its lower half is drawn", anyPixelClose(below, colors[TanreiColorRole.OnSurface], tolerance = 0.2f))
    }

    @Test
    fun `APB-8 APB-9 a real scroll of the connected view collapses the bar first, then scrolls under it, and back`() {
        val state = TanreiAppBarState()
        showBar(size = TanreiAppBarSize.Large, state = state, collapses = true, scrollingContent = true)
        rule.onNodeWithTag(CONTENT).performTouchInput { swipeUp(startY = bottom - 10f, endY = bottom - 10f - with(rule.density) { 30.dp.toPx() }) }
        rule.waitForIdle()
        val partly = bounds(BAR).let { it.bottom - it.top }
        assertTrue("collapsing: $partly", partly < large.containerHeight && partly > small.containerHeight)
        assertFalse("not scrolled until collapsed", state.isScrolled)
        repeat(3) { rule.onNodeWithTag(CONTENT).performTouchInput { swipeUp() } }
        rule.waitForIdle()
        rule.onNodeWithTag(BAR).assertHeightIsEqualTo(small.containerHeight)
        assertTrue("content under the collapsed bar", state.isScrolled)
        repeat(8) { rule.onNodeWithTag(CONTENT).performTouchInput { swipeDown() } }
        rule.waitForIdle()
        assertFalse(state.isScrolled)
        rule.onNodeWithTag(BAR).assertHeightIsEqualTo(large.containerHeight)
    }

    // ── APB-9: scrolled from the connection ──────────────────────────────────

    @Test
    fun `APB-9 a connected view sets scrolled while content lies under the bar and clears it at the top`() {
        val state = TanreiAppBarState()
        showBar(state = state, scrollingContent = true)
        val edge = tokens.conditions.scrolled.outlineColor.resolve(colors).compositeOver(surface)
        assertPixel("flat at first", barPixel(barWidth() / 2, barHeight() - 0.5.dp), surface)
        rule.onNodeWithTag(CONTENT).performTouchInput { swipeUp() }
        rule.waitForIdle()
        assertTrue(state.isScrolled)
        assertPixel("scrolled", barPixel(barWidth() / 2, barHeight() - 0.5.dp), edge)
        repeat(4) { rule.onNodeWithTag(CONTENT).performTouchInput { swipeDown() } }
        rule.waitForIdle()
        assertFalse(state.isScrolled)
        assertPixel("flat again at the top", barPixel(barWidth() / 2, barHeight() - 0.5.dp), surface)
    }

    @Test
    fun `APB-9 a large bar is scrolled only once fully collapsed, and a scrolled large bar is drawn collapsed`() {
        val state = TanreiAppBarState()
        showBar(size = TanreiAppBarSize.Large, state = state, collapses = true)
        rule.runOnIdle {
            state.collapsedOffset = with(rule.density) { 10.dp.toPx() }
            state.contentOffset = 5f
        }
        rule.waitForIdle()
        assertFalse("not while partly collapsed", state.isScrolled)
        assertPixel("no edge", barPixel(barWidth() / 2, barHeight() - 0.5.dp), surface)
        rule.runOnIdle { state.collapsedOffset = Float.POSITIVE_INFINITY }
        rule.waitForIdle()
        assertTrue(state.isScrolled)
        // A pinned large bar whose content scrolled is drawn fully collapsed.
        showBar(size = TanreiAppBarSize.Large, state = TanreiAppBarState(initialContentOffset = 1f), collapses = false)
        rule.onNodeWithTag(BAR).assertHeightIsEqualTo(small.containerHeight)
    }

    @Test
    fun `APB-9 with nothing connected a large bar stays expanded and flat`() {
        showBar(size = TanreiAppBarSize.Large, scrollingContent = false)
        rule.onNodeWithTag(BAR).assertHeightIsEqualTo(large.containerHeight)
        assertPixel("flat", barPixel(barWidth() / 2, barHeight() - 0.5.dp), surface)
    }

    // ── APB-10: insets ───────────────────────────────────────────────────────

    @Test
    fun `APB-10 the container reaches under the top inset and the content stays inside the insets`() {
        val system = tanrei.withCondition(scrolled = false) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Primary)) }
        showBar(system = system, insets = WindowInsets(left = 10.dp, top = 24.dp, right = 12.dp, bottom = 0.dp))
        val bar = bounds(BAR)
        rule.onNodeWithTag(BAR).assertHeightIsEqualTo(24.dp + small.containerHeight)
        assertPixel("the color under the status bar", barPixel(barWidth() / 2, 2.dp), colors[TanreiColorRole.Primary])
        assertPixel("and at the screen's corner", barPixel(1.dp, 1.dp), colors[TanreiColorRole.Primary])
        assertEquals("inside the left inset", (bar.left + 10.dp + tokens.containerPaddingInline).value, bounds("nav-0").left.value, 0.5f)
        assertEquals("inside the right inset", (bar.right - 12.dp - tokens.containerPaddingInline).value, bounds("action-1").right.value, 0.5f)
        val nav = bounds("nav-0")
        assertEquals("below the top inset", (bar.top + 24.dp + small.containerHeight / 2).value, ((nav.top + nav.bottom) / 2).value, 0.6f)
    }

    // ── APB-11: the items are the product's icon buttons ─────────────────────

    @Test
    @KeyboardNavigation
    fun `APB-11 the bar is not a tab stop - focus moves from the navigation item through the actions in reading order`() {
        showBar()
        rule.onNodeWithTag(BEFORE).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag("nav-0").assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag("action-0").assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag("action-1").assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(AFTER).assertIsFocused()
        val bar = rule.onNodeWithTag(BAR).fetchSemanticsNode().config
        assertFalse("no role of its own", SemanticsProperties.Role in bar)
        assertFalse("not focusable", SemanticsProperties.Focused in bar)
    }

    @Test
    fun `APB-11 the items render as the icon buttons they are, from their own tokens, with their own semantics`() {
        val iconButton = tanrei.iconButton
        val standard = iconButton.variants.standard
        val system = tanrei.copy(iconButton = iconButton.copy(variants = iconButton.variants.copy(standard = standard.copy(enabled = standard.enabled.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error))))))
        showBar(system = system)
        val nav = bounds("nav-0")
        val stage = bounds(STAGE_TAG)
        assertPixel("its own container token", stagePixel((nav.left + nav.right) / 2 - stage.left, nav.top - stage.top + 8.dp), colors[TanreiColorRole.Error])
        rule.onNodeWithTag("nav-0")
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf("Back")))
            .performClick()
        rule.onNodeWithTag("action-1").performClick()
        assertEquals(listOf("Back", "More options"), clicks)
        rule.onNodeWithTag("nav-0").assertWidthIsEqualTo(tanrei.measure.targetTouch)
    }

    // ── APB-12: heading ──────────────────────────────────────────────────────

    @Test
    fun `APB-12 the title is a heading and the subtitle text read after it`() {
        showBar(title = "Quarterly report", subtitle = "Edited 5 minutes ago")
        val headings = rule.onAllNodes(SemanticsMatcher.keyIsDefined(SemanticsProperties.Heading)).fetchSemanticsNodes()
        assertEquals(1, headings.size)
        assertEquals(listOf("Quarterly report"), headings.single().config[SemanticsProperties.Text].map { it.text })
        val subtitle = rule.onNode(hasText("Edited 5 minutes ago"))
        subtitle.assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Heading))
        assertTrue("read after it", textBounds("Edited 5 minutes ago").top >= textBounds("Quarterly report").bottom - 0.5.dp)
    }

    @Test
    fun `APB-12 a large bar exposes its title once - the expanded one while any of it shows, the top row's once collapsed`() {
        val state = TanreiAppBarState()
        showBar(size = TanreiAppBarSize.Large, state = state, collapses = true, subtitle = "ada@example.com")
        fun headings() = rule.onAllNodes(SemanticsMatcher.keyIsDefined(SemanticsProperties.Heading)).fetchSemanticsNodes()
        fun texts(text: String) = rule.onAllNodes(hasText(text)).fetchSemanticsNodes()
        assertEquals(1, headings().size)
        assertTrue("the expanded one", textBounds("Inbox").top >= bounds(BAR).top + small.containerHeight)
        assertEquals("the subtitle once", 1, texts("ada@example.com").size)
        // Partly covered: still the expanded one.
        val line = with(rule.density) { large.titleTypescale.lineHeight.toDp() }
        val free = bounds(BAR).let { it.bottom - it.top } - small.containerHeight - tokens.containerPaddingBlockEnd - line - with(rule.density) { large.subtitleTypescale.lineHeight.toDp() }
        rule.runOnIdle { state.collapsedOffset = with(rule.density) { (free + line / 2).toPx() } }
        rule.waitForIdle()
        assertEquals(1, headings().size)
        assertTrue("still the expanded one", textBounds("Inbox").top > bounds(BAR).top + small.containerHeight - line)
        rule.runOnIdle { state.collapsedOffset = Float.POSITIVE_INFINITY }
        rule.waitForIdle()
        assertEquals(1, headings().size)
        val title = textBounds("Inbox")
        assertEquals("the top row's", (bounds(BAR).top + small.containerHeight / 2).value, ((title.top + textBounds("ada@example.com").bottom) / 2).value, 0.6f)
        assertEquals(1, texts("ada@example.com").size)
    }

    // ── APB-13: no title, too many items ─────────────────────────────────────

    @Test
    fun `APB-13 an empty title draws no title block and exposes no heading - a large bar keeps an empty title row`() {
        showBar(title = "", subtitle = "Not shown")
        assertEquals(0, rule.onAllNodes(SemanticsMatcher.keyIsDefined(SemanticsProperties.Heading)).fetchSemanticsNodes().size)
        assertEquals(0, rule.onAllNodes(hasText("Not shown")).fetchSemanticsNodes().size)
        showBar(title = "", size = TanreiAppBarSize.Large)
        rule.onNodeWithTag(BAR).assertHeightIsEqualTo(large.containerHeight)
    }

    @Test
    fun `APB-13 more than three actions or more than one navigation item still render, and a debuggable app reports them`() = collectingReports { reports ->
        setDebuggable(true)
        showBar(navigation = listOf("Back", "Close"), actions = listOf("One", "Two", "Three", "Four"))
        rule.waitForIdle()
        listOf("nav-0", "nav-1", "action-0", "action-3").forEach { rule.onNodeWithTag(it).assertExists() }
        assertTrue("the fourth action at the end", bounds("action-3").right <= bounds(BAR).right - tokens.containerPaddingInline + 0.5.dp)
        assertTrue(reports.toString(), reports.any { "overflow menu" in it })
        assertTrue(reports.toString(), reports.any { "navigation" in it && "one" in it })
    }

    // ── APB-14: an unknown size ──────────────────────────────────────────────

    @Test
    fun `APB-14 a size the system does not have draws with small's tokens, and a debuggable app reports it`() = collectingReports { reports ->
        showBar()
        val expected = stage()
        setDebuggable(true)
        showBar(size = TanreiAppBarSize("medium"))
        assertSameAs(expected, stage(), "an unknown size")
        assertTrue(reports.toString(), reports.any { "medium" in it && "TanreiAppBar" in it })
    }

    // ── APB-15: enlarged text ────────────────────────────────────────────────

    @Test
    fun `APB-15 enlarged text grows the rows, keeps each line on one line, and does not scale the items`() {
        showBar(fontScale = 2f, title = "Quarterly report", subtitle = "Edited 5 minutes ago")
        val height = bounds(BAR).let { it.bottom - it.top }
        assertTrue("taller than small: $height", height > small.containerHeight)
        // Android scales large text non-linearly (and a line height with its font size), so the line is only known to
        // be taller than at 1x and shorter than two such lines.
        val line = with(rule.density) { small.titleTypescale.lineHeight.toDp() }
        val title = textBounds("Quarterly report")
        assertTrue("one enlarged line: ${title.bottom - title.top}", title.bottom - title.top > line && title.bottom - title.top < line * 2)
        assertEquals(1, textLayout("Quarterly report").lineCount)
        rule.onNodeWithTag("nav-0").assertWidthIsEqualTo(tanrei.measure.targetTouch).assertHeightIsEqualTo(tanrei.measure.targetTouch)
        showBar(fontScale = 2f, size = TanreiAppBarSize.Large, subtitle = "ada@example.com")
        assertTrue("a large bar grows too", bounds(BAR).let { it.bottom - it.top } > large.containerHeight)
        assertEquals(1, textLayout("Inbox").lineCount)
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun TanreiSystem.withCondition(scrolled: Boolean, change: (TanreiAppBarConditionTokens) -> TanreiAppBarConditionTokens): TanreiSystem {
        val conditions = appBar.conditions
        val changed = if (scrolled) conditions.copy(scrolled = change(conditions.scrolled)) else conditions.copy(flat = change(conditions.flat))
        return copy(appBar = appBar.copy(conditions = changed))
    }

    /** A hard shadow 8 below the container, in [role]: easy to see under the bar. */
    private fun hardShadow(role: TanreiColorRole) = TanreiShadowLayer(x = 0.dp, y = 8.dp, blur = 0.dp, spread = 0.dp, role = role)

    private fun setDebuggable(debuggable: Boolean) {
        val info = ApplicationProvider.getApplicationContext<Context>().applicationInfo
        info.flags = if (debuggable) info.flags or ApplicationInfo.FLAG_DEBUGGABLE else info.flags and ApplicationInfo.FLAG_DEBUGGABLE.inv()
    }

    private fun collectingReports(block: (MutableList<String>) -> Unit) {
        val reports = mutableListOf<String>()
        val previous = TanreiDiagnostics.reporter
        TanreiDiagnostics.reporter = { reports += it }
        try {
            block(reports)
        } finally {
            TanreiDiagnostics.reporter = previous
            setDebuggable(false)
        }
    }

    private fun bounds(tag: String): DpRect = rule.onNodeWithTag(tag).getUnclippedBoundsInRoot()

    /** The bounds of the text node [text] as assistive technology sees it (the merged tree: a hidden title is not in it). */
    private fun textBounds(text: String): DpRect = rule.onNode(hasText(text)).getUnclippedBoundsInRoot()

    private fun textLayout(text: String): TextLayoutResult {
        val results = mutableListOf<TextLayoutResult>()
        rule.onNode(hasText(text)).fetchSemanticsNode().config[SemanticsActions.GetTextLayoutResult].action!!(results)
        return results.single()
    }

    private fun stage(): PixelMap = rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap()

    private fun stagePixel(x: Dp, y: Dp): Color = with(rule.density) { stage()[x.roundToPx(), y.roundToPx()] }

    private fun barWidth(): Dp = bounds(BAR).let { it.right - it.left }

    private fun barHeight(): Dp = bounds(BAR).let { it.bottom - it.top }

    /** A pixel at ([x], [y]) from the bar's top-left, as drawn on the stage. */
    private fun barPixel(x: Dp, y: Dp): Color {
        val bar = bounds(BAR)
        val stage = bounds(STAGE_TAG)
        return stagePixel(bar.left - stage.left + x, bar.top - stage.top + y)
    }

    /** Whether any pixel inside [area] (root coordinates) is within [tolerance] of [color]. */
    private fun anyPixelClose(area: DpRect, color: Color, tolerance: Float = 0.1f): Boolean = pixelsIn(area).any { isClose(it, color, tolerance) }

    /** The darkest pixel inside [area] (root coordinates). */
    private fun darkestIn(area: DpRect): Color = pixelsIn(area).minBy { it.red + it.green + it.blue }

    private fun pixelsIn(area: DpRect): List<Color> {
        val map = stage()
        val stageBounds = bounds(STAGE_TAG)
        return with(rule.density) {
            val left = (area.left - stageBounds.left).roundToPx().coerceIn(0, map.width - 1)
            val right = (area.right - stageBounds.left).roundToPx().coerceIn(0, map.width)
            val top = (area.top - stageBounds.top).roundToPx().coerceIn(0, map.height - 1)
            val bottom = (area.bottom - stageBounds.top).roundToPx().coerceIn(0, map.height)
            (top until bottom).flatMap { y -> (left until right).map { x -> map[x, y] } }
        }
    }

    private fun differing(a: PixelMap, b: PixelMap): Int =
        (0 until minOf(a.height, b.height)).sumOf { y -> (0 until minOf(a.width, b.width)).count { x -> !isClose(a[x, y], b[x, y]) } }

    private fun assertSameAs(expected: PixelMap, actual: PixelMap, what: String) {
        assertEquals("$what: same size", expected.height, actual.height)
        assertEquals("$what: not one pixel differs", 0, differing(expected, actual))
    }

    private fun isClose(actual: Color, expected: Color, tolerance: Float = PIXEL_TOLERANCE): Boolean =
        maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue)) <= tolerance

    private fun assertPixel(what: String, actual: Color, expected: Color) =
        assertTrue("$what: expected $expected but was $actual", isClose(actual, expected))

    private companion object {
        const val STAGE_TAG = "stage"
        const val BAR = "bar"
        const val BEFORE = "before"
        const val AFTER = "after"
        const val CONTENT = "content"
        const val PIXEL_TOLERANCE = 2f / 255f
        val STAGE_WIDTH = 360.dp
        val BELOW = 24.dp
    }
}

/** APB-3 where motion is reduced (the animator duration scale is 0, see `TanreiButtonReducedMotionTest`). */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiAppBarReducedMotionTest {
    private object NoMotion : MotionDurationScale {
        override val scaleFactor: Float = 0f
    }

    @get:Rule
    val rule = createComposeRule(effectContext = NoMotion)

    @Test
    fun `APB-3 where motion is reduced a change of scrolled changes the container and the edge at once`() {
        val tanrei = TanreiSystem.Tanrei
        val colors = tanrei.colors.light
        val slow = tanrei.appBar.copy(
            motionConditionDuration = 1000,
            conditions = tanrei.appBar.conditions.copy(scrolled = tanrei.appBar.conditions.scrolled.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error))),
        )
        val state = TanreiAppBarState()
        val scrolled: MutableState<Boolean> = mutableStateOf(false)
        rule.setContent {
            TanreiTheme(system = tanrei.copy(appBar = slow), theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Box(Modifier.testTag("stage").width(360.dp)) {
                    TanreiAppBar(title = "Inbox", scrollBehavior = TanreiAppBarDefaults.pinnedScrollBehavior(state), windowInsets = WindowInsets(0, 0, 0, 0))
                }
            }
            scrolled.value = state.isScrolled
        }
        rule.waitForIdle()
        rule.mainClock.autoAdvance = false
        state.contentOffset = 10f
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        repeat(3) { rule.mainClock.advanceTimeByFrame() }
        val map = rule.onNodeWithTag("stage").captureToImage().toPixelMap()
        val drawn = map[map.width / 2, 4]
        val error = colors[TanreiColorRole.Error]
        assertTrue("the scrolled color at once: $drawn", abs(drawn.red - error.red) < 0.02f && abs(drawn.green - error.green) < 0.02f)
        val edge = map[map.width / 2, map.height - 1]
        val hairline = tanrei.appBar.conditions.scrolled.outlineColor.resolve(colors).compositeOver(error)
        assertTrue("the edge at once: $edge", abs(edge.red - hairline.red) < 0.02f && abs(edge.green - hairline.green) < 0.02f)
        rule.mainClock.autoAdvance = true
    }
}
