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
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.MotionDurationScale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PixelMap
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.layout.positionInRoot
import androidx.compose.ui.unit.toSize
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.click
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performMouseInput
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.test.swipe
import androidx.compose.ui.test.swipeWithVelocity
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.DpRect
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.height
import androidx.compose.ui.unit.width
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.acme.design.Acme
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.Cupertino
import io.github.chnotchy.tanrei.tokens.M3Like
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiCarouselPartStateTokens
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiFocusStyle
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiPressedFeedback
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import java.io.File
import kotlin.math.abs
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TestRule
import org.junit.runner.RunWith
import org.junit.runners.model.Statement
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Behaviour tests for `specs/carousel.spec.json`. Each test names the behaviour id (`CRL-n`) it covers. Runs on the JVM
 * (Robolectric, native graphics). The carousel fills a [STAGE_WIDTH] × [STAGE_HEIGHT] stage of surface (W 368 with the
 * default padding); a focusable box before it ([BEFORE]) lets Tab enter it. Items are tagged `item-i` — the tag marks the
 * item's hit area, its drawn box being the gap narrower (CRL-4) — and their content records its bounds.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w400dp-h400dp-xhdpi")
class TanreiCarouselTest {
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
    private val tokens = tanrei.carousel
    private val surface = colors[TanreiColorRole.Surface]
    private val itemColor = tokens.parts.item.enabled.containerColor.resolve(colors)

    private val clicks = mutableListOf<Int>()
    private val contentBounds = mutableMapOf<Int, Rect>()
    private val seenColors = mutableMapOf<Int, Color>()
    private var stageWidth by mutableStateOf(STAGE_WIDTH)

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
            val now = scene ?: return@setContent
            key(now) {
                val density = LocalDensity.current
                CompositionLocalProvider(LocalLayoutDirection provides now.direction, LocalDensity provides Density(density.density, now.fontScale)) {
                    TanreiTheme(system = now.system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                        Column(Modifier.testTag(STAGE_TAG).size(STAGE_WIDTH, STAGE_HEIGHT + 8.dp).background(TanreiColorRole.Surface.color)) {
                            Box(Modifier.testTag(BEFORE).size(8.dp).focusable())
                            Box(Modifier.width(stageWidth).height(STAGE_HEIGHT)) { now.content() }
                        }
                    }
                }
            }
        }
        rule.waitForIdle()
    }

    private fun showCarousel(
        system: TanreiSystem = tanrei,
        layout: TanreiCarouselLayout = TanreiCarouselLayout.MultiBrowse,
        count: Int = 6,
        itemWidth: Dp? = null,
        label: String = LABEL,
        labels: (Int) -> String = { "Walk $it" },
        direction: LayoutDirection = LayoutDirection.Ltr,
        fontScale: Float = 1f,
        modifier: Modifier = Modifier.fillMaxSize(),
        opaque: Boolean = false,
    ) {
        show(system, direction, fontScale) {
            TanreiCarousel(itemCount = count, contentDescription = label, modifier = modifier.testTag(CAROUSEL), layout = layout, itemWidth = itemWidth) { index ->
                TanreiCarouselItem(label = labels(index), onClick = { clicks += index }, modifier = Modifier.testTag(item(index))) {
                    seenColors[index] = LocalTanreiContentColor.current
                    val fill = if (opaque) Modifier.background(OPAQUE) else Modifier
                    Box(Modifier.fillMaxSize().onGloballyPositioned { contentBounds[index] = Rect(it.positionInRoot(), it.size.toSize()) }.then(fill))
                }
            }
        }
    }

    private fun item(index: Int) = "item-$index"

    private fun node(index: Int) = rule.onNodeWithTag(item(index))

    private fun hit(index: Int): DpRect = node(index).getUnclippedBoundsInRoot()

    /** The drawn box of item [index]: its hit area less half the gap on each side. */
    private fun drawn(index: Int, system: TanreiSystem = scene?.system ?: tanrei): DpRect {
        val box = hit(index)
        val half = system.carousel.layoutGap / 2
        return DpRect(box.left + half, box.top, box.right - half, box.bottom)
    }

    /** The carousel's top in the root: below the 8 box. */
    private val top: Dp = 8.dp

    // ── CRL-1: activation ────────────────────────────────────────────────────

    @Test
    fun `CRL-1 activating an item emits its click once, and a press that becomes a scroll activates nothing`() {
        showCarousel()
        node(1).performClick()
        rule.waitForIdle()
        assertEquals(listOf(1), clicks)
        node(0).performTouchInput { swipe(center, center - Offset(120.dp.toPx(), 0f), durationMillis = 400) }
        rule.waitForIdle()
        assertEquals("a scroll is not a click", listOf(1), clicks)
    }

    @Test
    @KeyboardNavigation
    fun `CRL-1 Enter and Space activate the focused item`() {
        showCarousel()
        node(0).requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        node(0).performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        assertEquals(listOf(0, 0), clicks)
    }

    // ── CRL-2 / CRL-3: states and focus ──────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `CRL-2 under acme hovered, focused and pressed draw the item's own tokens, pressed over focused`() {
        val acme = TanreiSystem.Acme
        val acmeColors = acme.colors.light
        val look = acme.carousel.parts.item
        val state = acme.state
        val resting = look.enabled.containerColor.resolve(acmeColors).compositeOver(acmeColors[TanreiColorRole.Surface])
        fun layered(tokens: TanreiCarouselPartStateTokens, opacity: Float) = tokens.stateLayerColor.resolve(acmeColors).let { it.copy(alpha = it.alpha * opacity) }.compositeOver(resting)
        val hovered = layered(look.hovered, state.hoverStateLayerOpacity)
        val focused = layered(look.focused, state.focusStateLayerOpacity)
        val pressed = layered(look.pressed, state.pressedStateLayerOpacity)
        assertEquals(4, setOf(resting, hovered, focused, pressed).size)
        showCarousel(system = acme)
        node(0).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertPixel("hovered", boxPixel(0), hovered)
        node(0).requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertPixel("focused", boxPixel(0), focused)
        node(0).performKeyInput { keyDown(Key.Enter) }
        rule.waitForIdle()
        assertPixel("pressed", boxPixel(0), pressed)
        node(0).performKeyInput { keyUp(Key.Enter) }
    }

    @Test
    @KeyboardNavigation
    fun `CRL-3 keyboard focus shows the ring inside the item's container on the first frame`() {
        showCarousel()
        rule.mainClock.autoAdvance = false
        node(0).requestFocus()
        rule.mainClock.advanceTimeByFrame()
        val box = drawn(0)
        val m = tanrei.measure
        val inset = m.focusOuterWidth / 2
        assertPixel("the ring inside the box's top edge", stagePixel((box.left + box.right) / 2, box.top + inset), colors[TanreiColorRole.FocusRing])
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `CRL-2 CRL-3 focus gained by touch shows neither the focused state nor the ring`() {
        showCarousel()
        node(0).requestFocus()
        rule.waitForIdle()
        assertPixel("at rest", boxPixel(0), itemColor)
        val box = drawn(0)
        assertPixel("no ring", stagePixel((box.left + box.right) / 2, box.top + 1.dp), itemColor)
    }

    // ── CRL-4: the hit area ──────────────────────────────────────────────────

    @Test
    fun `CRL-4 an item's hit area is its box with half the gap on each side - a small item's is the touch target - and a narrower system still reaches it`() {
        showCarousel(itemWidth = 120.dp)
        val small = hit(3)
        assertEquals("a small item 40 wide: 48 with the gap", tanrei.measure.targetTouch.value, small.width.value, 0.5f)
        // A press in the gap next to item 3 (on its half) activates it.
        node(3).performTouchInput { click(Offset(1.dp.toPx(), height / 2f)) }
        rule.waitForIdle()
        assertEquals(listOf(3), clicks)
        val narrow = tanrei.copy(carousel = tokens.copy(layoutGap = 2.dp, containerSmallMinWidth = 30.dp, containerSmallMaxWidth = 30.dp))
        showCarousel(system = narrow, itemWidth = 120.dp)
        val last = (0 until 6).map { hit(it) }.filter { it.left < STAGE_WIDTH }.last()
        assertTrue("never below the target: $last", last.width >= tanrei.measure.targetTouch - 0.5.dp)
    }

    // ── CRL-5 / CRL-6 / CRL-7: the press, corners, focus style ───────────────

    @Test
    fun `CRL-5 a tap that ends at once shows the pressed state on the next frame and keeps it for press-hold`() {
        val system = tanrei.withItem(TanreiInteractionState.Pressed) { it.copy(stateLayerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        showCarousel(system = system)
        val error = layer(TanreiColorRole.Error, tanrei.state.pressedStateLayerOpacity)
        val hold = tanrei.motion.duration.pressHold.toLong()
        rule.mainClock.autoAdvance = false
        node(0).performTouchInput { down(center); up() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("pressed", boxPixel(0), error)
        rule.mainClock.advanceTimeBy(hold / 2)
        assertPixel("still pressed", boxPixel(0), error)
        rule.mainClock.advanceTimeBy(hold + tokens.motionStateDuration * 2L)
        assertPixel("at rest", boxPixel(0), itemColor)
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `CRL-6 ripple grows from the point of contact, dim - cupertino's answer - draws no state layer, none draws nothing`() {
        assertEquals(TanreiPressedFeedback.Ripple, TanreiSystem.M3Like.behavior.pressedFeedback)
        val rippling = tanrei.answering(TanreiPressedFeedback.Ripple).withItem(TanreiInteractionState.Pressed) { it.copy(stateLayerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        showCarousel(system = rippling)
        val error = layer(TanreiColorRole.Error, tanrei.state.pressedStateLayerOpacity)
        val box = drawn(0)
        rule.mainClock.autoAdvance = false
        node(0).performTouchInput { down(Offset((tokens.layoutGap / 2 + 20.dp).toPx(), height / 2f)) }
        rule.mainClock.advanceTimeBy(120)
        assertPixel("at the point of contact", stagePixel(box.left + 20.dp, (box.top + box.bottom) / 2), error)
        assertPixel("not yet at the far end", stagePixel(box.right - 10.dp, box.top + 10.dp), itemColor)
        rule.mainClock.advanceTimeBy(tokens.motionFeedbackDuration.toLong() + 100)
        assertPixel("the far end once grown", stagePixel(box.right - 10.dp, box.top + 10.dp), error)
        node(0).performTouchInput { up() }
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        val cupertino = TanreiSystem.Cupertino
        assertEquals(TanreiPressedFeedback.Dim, cupertino.behavior.pressedFeedback)
        assertTrue(cupertino.carousel.pressed.opacity < 1f)
        showCarousel(system = cupertino)
        val before = stage()
        node(0).performTouchInput { down(center) }
        rule.waitForIdle()
        assertTrue("dimmed", differing(before, stage()) > 0)
        node(0).performTouchInput { up() }
        rule.waitForIdle()
        showCarousel(system = tanrei.answering(TanreiPressedFeedback.None))
        node(0).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val hovered = stage()
        node(0).performMouseInput { press() }
        rule.waitForIdle()
        assertEquals("pressed under none", 0, differing(hovered, stage()))
        node(0).performMouseInput { release() }
    }

    @Test
    fun `CRL-7 an item's corners ease by corner smoothing - a quarter circle at 0`() {
        for (smoothing in listOf(0f, 0.6f)) {
            val system = tanrei.copy(shape = tanrei.shape.copy(cornerSmoothing = smoothing), carousel = tokens.copy(containerShape = 24.dp))
                .withItem(TanreiInteractionState.Enabled) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
            showCarousel(system = system)
            val box = drawn(0)
            assertPixel("the very corner is outside", stagePixel(box.left + 0.5.dp, box.top + 0.5.dp), surface)
            assertPixel("inside the corner", stagePixel(box.left + 24.dp, box.top + 24.dp), colors[TanreiColorRole.Error])
        }
    }

    @Test
    @KeyboardNavigation
    fun `CRL-7 glow draws the focus as a halo under acme`() {
        val acme = TanreiSystem.Acme
        assertEquals(TanreiFocusStyle.Glow, acme.behavior.focusStyle)
        showCarousel(system = acme)
        val before = stage()
        node(0).requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertTrue("the halo is drawn", differing(before, stage()) > 0)
    }

    // ── CRL-8 – CRL-13: the layouts ──────────────────────────────────────────

    @Test
    fun `CRL-8 as wide as its parent and layout-height tall unless the product sizes it, items the carousel's height, padded and gap apart`() {
        showCarousel(modifier = Modifier)
        val carousel = rule.onNodeWithTag(CAROUSEL).getUnclippedBoundsInRoot()
        assertEquals(STAGE_WIDTH.value, carousel.width.value, 0.5f)
        assertEquals(tokens.layoutHeight.value, carousel.height.value, 0.5f)
        assertEquals(tokens.layoutHeight.value, drawn(0).height.value, 0.5f)
        assertEquals(tokens.layoutPaddingInline.value, drawn(0).left.value, 0.5f)
        assertEquals((drawn(0).right + tokens.layoutGap).value, drawn(1).left.value, 0.5f)
        showCarousel(modifier = Modifier.height(120.dp))
        assertEquals(120f, rule.onNodeWithTag(CAROUSEL).getUnclippedBoundsInRoot().height.value, 0.5f)
        assertEquals(120f, drawn(0).height.value, 0.5f)
        assertPixel("clipped at the end edge", stagePixel(STAGE_WIDTH - 4.dp, top + 60.dp), surface)
    }

    @Test
    fun `CRL-9 CRL-10 the closed formula - the spec's worked examples`() {
        fun widths(inner: Float, large: Float) = TanreiCarouselGeometry.of(TanreiCarouselLayout.MultiBrowse, inner, 16f, large, 8f, 40f, 56f, 6).let { g -> (0 until 4).map { g.itemAt(it, 0f).second } }
        assertWidths(listOf(200f, 101.33f, 50.67f), widths(368f, 200f).take(3))
        assertWidths(listOf(120f, 120f, 64f, 40f), widths(368f, 120f))
        assertWidths(listOf(200f, 200f, 200f, 90.67f), widths(768f, 200f))
        assertWidths(listOf(120f, 120f, 120f, 76f), widths(460f, 120f))
        // CRL-9: L is capped; below 3 small slots and 2 gaps there is one slot, W wide.
        assertWidths(listOf(272f), widths(368f, 999f).take(1))
        val narrow = TanreiCarouselGeometry.of(TanreiCarouselLayout.Hero, 130f, 16f, 200f, 8f, 40f, 56f, 3)
        assertWidths(listOf(130f), listOf(narrow.itemAt(0, 0f).second))
        // In the layout: W 368, L 200.
        showCarousel()
        assertWidths(listOf(200f, 101.33f, 50.67f), (0 until 3).map { drawn(it).width.value })
        showCarousel(itemWidth = 120.dp)
        assertWidths(listOf(120f, 120f, 64f, 40f), (0 until 4).map { drawn(it).width.value })
    }

    @Test
    fun `CRL-11 hero is one large slot and one small one, ignoring itemWidth`() {
        showCarousel(layout = TanreiCarouselLayout.Hero, itemWidth = 100.dp)
        assertWidths(listOf(304f, 56f), (0 until 2).map { drawn(it).width.value })
    }

    @Test
    fun `CRL-12 items are placed by the scroll position between the slots around them - the spec's example at p 0_5`() {
        val g = TanreiCarouselGeometry.of(TanreiCarouselLayout.MultiBrowse, 368f, 16f, 200f, 8f, 40f, 56f, 6)
        val at = (0 until 6).map { g.itemAt(it, 0.5f) }
        assertEquals(125.33f, at[0].second, 0.02f)
        assertEquals(-33.33f, at[0].first, 0.02f)
        assertEquals(150.67f, at[1].second, 0.02f)
        assertEquals(104f, at[1].first, 0.02f)
        assertEquals(76f, at[2].second, 0.02f)
        assertEquals(262.67f, at[2].first, 0.02f)
        assertEquals(50.67f, at[3].second, 0.02f)
        assertEquals(350.67f, at[3].first, 0.02f)
        assertTrue("items 4 and 5 out of view", at[4].first >= 368f + 16f && at[5].first >= 368f + 16f)
        assertEquals("the range: N - n", 5f, g.maxPosition, 0.001f)
        // In the layout, while a finger holds the row half a slot on.
        showCarousel()
        rule.mainClock.autoAdvance = false
        val unit = 208.dp
        val slop = touchSlop()
        rule.onNodeWithTag(STAGE_TAG).performTouchInput { down(Offset(300.dp.toPx(), 100.dp.toPx())); moveBy(Offset(-(unit / 2 + slop).toPx(), 0f)) }
        rule.mainClock.advanceTimeByFrame()
        assertEquals(125.33f, drawn(0).width.value, 0.6f)
        assertEquals(150.67f, drawn(1).width.value, 0.6f)
        rule.onNodeWithTag(STAGE_TAG).performTouchInput { up() }
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `CRL-13 uncontained items are L wide from the start, scroll freely without settling, and do not scroll while they fit`() {
        showCarousel(layout = TanreiCarouselLayout.Uncontained)
        assertWidths(listOf(200f, 200f), (0 until 2).map { drawn(it).width.value })
        rule.onNodeWithTag(STAGE_TAG).performTouchInput { swipe(Offset(300.dp.toPx(), 100.dp.toPx()), Offset(230.dp.toPx(), 100.dp.toPx()), durationMillis = 2000) }
        rule.waitForIdle()
        val left = drawn(0).left
        assertEquals("moved as far as the finger, and stays", (16.dp - 70.dp + touchSlop()).value, left.value, 1f)
        showCarousel(layout = TanreiCarouselLayout.Uncontained, count = 1)
        rule.onNodeWithTag(STAGE_TAG).performTouchInput { swipe(Offset(300.dp.toPx(), 100.dp.toPx()), Offset(100.dp.toPx(), 100.dp.toPx()), durationMillis = 400) }
        rule.waitForIdle()
        assertEquals("it fits: no scroll", 16f, drawn(0).left.value, 0.5f)
    }

    // ── CRL-14: settling ─────────────────────────────────────────────────────

    @Test
    fun `CRL-14 a released drag settles at the nearest whole position, a fling at the next one in its direction`() {
        showCarousel()
        val stageNode = rule.onNodeWithTag(STAGE_TAG)
        stageNode.performTouchInput { swipe(Offset(300.dp.toPx(), 100.dp.toPx()), Offset(220.dp.toPx(), 100.dp.toPx()), durationMillis = 2000) }
        rule.waitForIdle()
        assertEquals("settled back at 0", 200f, drawn(0).width.value, 0.6f)
        stageNode.performTouchInput { swipe(Offset(300.dp.toPx(), 100.dp.toPx()), Offset(160.dp.toPx(), 100.dp.toPx()), durationMillis = 2000) }
        rule.waitForIdle()
        assertEquals("settled at 1: item 1 large at slot 0", 200f, drawn(1).width.value, 0.6f)
        assertEquals(16f, drawn(1).left.value, 0.6f)
        stageNode.performTouchInput { swipeWithVelocity(Offset(300.dp.toPx(), 100.dp.toPx()), Offset(210.dp.toPx(), 100.dp.toPx()), endVelocity = 1500f, durationMillis = 100) }
        rule.waitForIdle()
        assertEquals("flung on to 2", 16f, drawn(2).left.value, 0.6f)
        assertEquals(200f, drawn(2).width.value, 0.6f)
        // A horizontal wheel moves the row, and it settles at a whole position once the wheel stops.
        rule.onNodeWithTag(CAROUSEL).performMouseInput { moveTo(center); scroll(-10f, androidx.compose.ui.test.ScrollWheel.Horizontal) }
        rule.waitForIdle()
        val inPlace = (0 until 6).filter { abs(drawn(it).left.value - 16f) < 0.6f && abs(drawn(it).width.value - 200f) < 0.6f }
        assertEquals("one item exactly in place: $inPlace", 1, inPlace.size)
        assertTrue("the wheel moved the row: $inPlace", inPlace.single() != 2)
    }

    // ── CRL-15 / CRL-16: content ─────────────────────────────────────────────

    @Test
    fun `CRL-15 CRL-16 content is laid out at the large width and full height, centred and clipped, on the item's color and handed its content color`() {
        showCarousel()
        with(rule.density) {
            for (index in 0..2) {
                val content = contentBounds.getValue(index)
                assertEquals(200f, content.width.toDp().value, 0.6f)
                assertEquals(tokens.layoutHeight.value, content.height.toDp().value, 0.6f)
                val box = drawn(index)
                assertEquals("centred", ((box.left + box.right) / 2).value, ((content.left + content.right) / 2).toDp().value, 0.6f)
            }
        }
        assertEquals(tokens.parts.item.enabled.contentColor.resolve(colors), seenColors[0])
        assertPixel("the item's container color", boxPixel(1), itemColor)
    }

    @Test
    @KeyboardNavigation
    fun `CRL-16 hover, focus and press are a state layer drawn over opaque content, and the container under it stays the resting fill`() {
        val opaque = OPAQUE
        val look = tokens.parts.item
        fun over(state: TanreiCarouselPartStateTokens, opacity: Float) = state.stateLayerColor.resolve(colors).let { it.copy(alpha = it.alpha * opacity) }.compositeOver(opaque)
        showCarousel(opaque = true)
        assertPixel("at rest the content shows as it is", boxPixel(0), opaque)
        node(0).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertTrue("hover shows on the content: ${boxPixel(0)} vs $opaque", !isClose(boxPixel(0), opaque))
        assertPixel("hovered: the layer over the content", boxPixel(0), over(look.hovered, tanrei.state.hoverStateLayerOpacity))
        node(0).performMouseInput { moveTo(Offset(-10f, -10f)) }
        node(0).requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertPixel("focused", boxPixel(0), over(look.focused, tanrei.state.focusStateLayerOpacity))
        node(0).performKeyInput { keyDown(Key.Enter) }
        rule.waitForIdle()
        assertPixel("pressed", boxPixel(0), over(look.pressed, tanrei.state.pressedStateLayerOpacity))
        node(0).performKeyInput { keyUp(Key.Enter) }
        // The ripple is in the same layer: over the content.
        val rippling = tanrei.answering(TanreiPressedFeedback.Ripple).withItem(TanreiInteractionState.Pressed) { it.copy(stateLayerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        showCarousel(system = rippling, opaque = true)
        node(0).performTouchInput { down(center) }
        rule.mainClock.advanceTimeBy(tokens.motionFeedbackDuration.toLong() + 100)
        val red = colors[TanreiColorRole.Error].let { it.copy(alpha = it.alpha * tanrei.state.pressedStateLayerOpacity) }.compositeOver(opaque)
        assertPixel("the ripple over the content", boxPixel(0), red)
        node(0).performTouchInput { up() }
    }

    // ── CRL-17 / CRL-18: keyboard ────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `CRL-17 CRL-18 one Tab stop, arrows move without wrapping, Home and End, and a focused item comes to slot 0`() {
        showCarousel()
        rule.onNodeWithTag(BEFORE).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        node(0).assertIsFocused().performKeyInput { pressKey(Key.DirectionLeft) }
        rule.waitForIdle()
        node(0).assertIsFocused().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        node(1).assertIsFocused()
        assertEquals("item 1 in place", 16f, drawn(1).left.value, 0.6f)
        assertEquals(200f, drawn(1).width.value, 0.6f)
        node(1).performKeyInput { pressKey(Key.MoveEnd) }
        rule.waitForIdle()
        node(5).assertIsFocused().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        node(5).assertIsFocused()
        assertEquals("as near to slot 0 as the range allows", 16f, drawn(5).left.value, 0.6f)
        node(5).performKeyInput { pressKey(Key.MoveHome) }
        rule.waitForIdle()
        node(0).assertIsFocused()
        assertEquals(16f, drawn(0).left.value, 0.6f)
        // Tab leaves: the carousel is one stop, and it comes back to the item that had focus.
        node(0).performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        node(1).performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        node(2).let { assertTrue("Tab left the carousel", runCatching { it.assertIsFocused() }.isFailure) }
    }

    @Test
    @KeyboardNavigation
    fun `CRL-18 uncontained - a focused item is scrolled wholly into view, as little as that needs`() {
        showCarousel(layout = TanreiCarouselLayout.Uncontained)
        node(0).requestFocus().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        node(1).assertIsFocused()
        assertEquals("its end at the inner end edge", (STAGE_WIDTH - tokens.layoutPaddingInline).value, drawn(1).right.value, 0.6f)
    }

    // ── CRL-19 / CRL-20: semantics ───────────────────────────────────────────

    @Test
    fun `CRL-19 a list named by its label, each item one button named by its label with its position, content hidden, out-of-view items exposed`() {
        showCarousel()
        val list = rule.onNodeWithTag(CAROUSEL)
        list.assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf(LABEL)))
        assertEquals(6, list.fetchSemanticsNode().config[SemanticsProperties.CollectionInfo].columnCount)
        for (i in 0 until 6) {
            node(i).assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
            node(i).assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf("Walk $i")))
            assertEquals(i, node(i).fetchSemanticsNode().config[SemanticsProperties.CollectionItemInfo].columnIndex)
            assertEquals("the content is not an element", 0, node(i).fetchSemanticsNode().children.size)
        }
        assertTrue("item 5 is out of view but exposed", drawn(5).left >= STAGE_WIDTH - 1.dp)
        list.performSemanticsAction(SemanticsActions.ScrollToIndex) { it(4) }
        rule.waitForIdle()
        assertEquals("scrolled to it for assistive technology", 16f, drawn(4).left.value, 0.6f)
    }

    @Test
    fun `CRL-20 an item without a label and a carousel without one still render, and a debuggable app reports both`() = collectingReports { reports ->
        setDebuggable(true)
        showCarousel(label = "", labels = { if (it == 1) "" else "Walk $it" })
        node(1).performClick()
        rule.waitForIdle()
        assertEquals(listOf(1), clicks)
        assertTrue(reports.toString(), reports.any { "TanreiCarouselItem" in it && "label" in it })
        assertTrue(reports.toString(), reports.any { "TanreiCarousel:" in it && "contentDescription" in it })
    }

    // ── CRL-21 / CRL-22 / CRL-23 ─────────────────────────────────────────────

    @Test
    fun `CRL-21 a change of width arranges the slots again and keeps the item at slot 0 where it was, without motion`() {
        showCarousel()
        rule.onNodeWithTag(CAROUSEL).performSemanticsAction(SemanticsActions.ScrollToIndex) { it(2) }
        rule.waitForIdle()
        assertEquals(16f, drawn(2).left.value, 0.6f)
        rule.mainClock.autoAdvance = false
        stageWidth = 300.dp
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        assertEquals("still at slot 0 at once", 16f, drawn(2).left.value, 0.6f)
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `CRL-22 an item's colors move over the state duration`() {
        val system = tanrei.copy(carousel = tokens.copy(motionStateDuration = 400, motionStateEasing = tanrei.motion.easing.linear))
            .withItem(TanreiInteractionState.Hovered) { it.copy(stateLayerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
            .let { it.copy(state = it.state.copy(hoverStateLayerOpacity = 1f)) }
        showCarousel(system = system)
        rule.mainClock.autoAdvance = false
        node(0).performMouseInput { moveTo(center) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(200)
        val middle = boxPixel(0)
        val error = colors[TanreiColorRole.Error]
        assertTrue("between: $middle", !isClose(middle, error) && !isClose(middle, itemColor))
        rule.mainClock.advanceTimeBy(400)
        assertPixel("hovered", boxPixel(0), error)
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `CRL-23 right-to-left mirrors the row - slot 0 at the right, and a drag to the right moves on`() {
        showCarousel(direction = LayoutDirection.Rtl)
        assertEquals((STAGE_WIDTH - 16.dp).value, drawn(0).right.value, 0.6f)
        assertEquals(200f, drawn(0).width.value, 0.6f)
        assertTrue("item 1 to its left", drawn(1).right < drawn(0).left)
        rule.onNodeWithTag(STAGE_TAG).performTouchInput { swipe(Offset(100.dp.toPx(), 100.dp.toPx()), Offset(240.dp.toPx(), 100.dp.toPx()), durationMillis = 2000) }
        rule.waitForIdle()
        assertEquals("item 1 at slot 0, at the right", (STAGE_WIDTH - 16.dp).value, drawn(1).right.value, 0.6f)
    }

    // ── CRL-24 / CRL-25 ──────────────────────────────────────────────────────

    @Test
    fun `CRL-24 layout is a closed enum holding exactly the spec's values, and an itemWidth that is not positive is null and reported`() = collectingReports { reports ->
        val spec = JSONObject(File(CAROUSEL_SPEC).readText())
        val layout = (0 until spec.getJSONArray("props").length()).map { spec.getJSONArray("props").getJSONObject(it) }.single { it.getString("name") == "layout" }
        val values = (0 until layout.getJSONArray("values").length()).map { layout.getJSONArray("values").getString(it) }
        assertEquals(values.map { it.replace("-", "") }, TanreiCarouselLayout.entries.map { it.name.lowercase() })
        setDebuggable(true)
        showCarousel(itemWidth = (-10).dp)
        assertEquals("as null: the token's width", tokens.containerLargeWidth.value, drawn(0).width.value, 0.6f)
        assertTrue(reports.toString(), reports.any { "itemWidth" in it })
    }

    @Test
    fun `CRL-25 enlarged text keeps the height, the slots and the items`() {
        showCarousel()
        val before = (0 until 3).map { drawn(it) }
        showCarousel(fontScale = 2f)
        assertEquals(before, (0 until 3).map { drawn(it) })
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun assertWidths(expected: List<Float>, actual: List<Float>) {
        assertEquals("$actual", expected.size, actual.size)
        expected.zip(actual).forEach { (e, a) -> assertEquals("$actual", e, a, 0.6f) }
    }

    /** [role] at [opacity] over the resting item on the page. */
    private fun layer(role: TanreiColorRole, opacity: Float): Color = colors[role].let { it.copy(alpha = it.alpha * opacity) }.compositeOver(itemColor.compositeOver(surface))

    private fun TanreiSystem.answering(feedback: TanreiPressedFeedback) = copy(behavior = behavior.copy(pressedFeedback = feedback))

    private fun TanreiSystem.withItem(state: TanreiInteractionState, change: (TanreiCarouselPartStateTokens) -> TanreiCarouselPartStateTokens): TanreiSystem {
        val item = carousel.parts.item
        val changed = when (state) {
            TanreiInteractionState.Enabled -> item.copy(enabled = change(item.enabled))
            TanreiInteractionState.Hovered -> item.copy(hovered = change(item.hovered))
            TanreiInteractionState.Focused -> item.copy(focused = change(item.focused))
            TanreiInteractionState.Pressed -> item.copy(pressed = change(item.pressed))
            TanreiInteractionState.Disabled -> item
        }
        return copy(carousel = carousel.copy(parts = carousel.parts.copy(item = changed)))
    }

    private fun touchSlop(): Dp = with(rule.density) { android.view.ViewConfiguration.get(ApplicationProvider.getApplicationContext()).scaledTouchSlop.toDp() }

    /** A pixel in item [index]'s box clear of its content: 6 in from its start, a quarter down. */
    private fun boxPixel(index: Int): Color {
        val box = drawn(index)
        return stagePixel(box.left + 6.dp, box.top + (box.bottom - box.top) / 4)
    }

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

    private fun stage(): PixelMap = rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap()

    private fun stagePixel(x: Dp, y: Dp): Color = with(rule.density) { stage()[x.roundToPx().coerceIn(0, STAGE_WIDTH.roundToPx() - 1), y.roundToPx().coerceIn(0, (STAGE_HEIGHT + 8.dp).roundToPx() - 1)] }

    private fun differing(a: PixelMap, b: PixelMap): Int =
        (0 until minOf(a.height, b.height)).sumOf { y -> (0 until minOf(a.width, b.width)).count { x -> !isClose(a[x, y], b[x, y]) } }

    private fun isClose(actual: Color, expected: Color, tolerance: Float = PIXEL_TOLERANCE): Boolean =
        maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue)) <= tolerance

    private fun assertPixel(what: String, actual: Color, expected: Color) =
        assertTrue("$what: expected $expected but was $actual", isClose(actual, expected))

    private companion object {
        const val STAGE_TAG = "stage"
        const val CAROUSEL = "carousel"
        const val BEFORE = "before"
        const val LABEL = "Walks near you"

        /** An opaque content (an image's stand-in): a light, saturated yellow that no state layer resembles. */
        val OPAQUE = Color(0xFFFFD54F)
        const val PIXEL_TOLERANCE = 3f / 255f
        val STAGE_WIDTH = 400.dp
        val STAGE_HEIGHT = 200.dp
    }
}

/** CRL-14 and CRL-22 where motion is reduced (the animator duration scale is 0): at once. */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w400dp-h400dp-xhdpi")
class TanreiCarouselReducedMotionTest {
    private object NoMotion : MotionDurationScale {
        override val scaleFactor: Float = 0f
    }

    @get:Rule
    val rule = createComposeRule(effectContext = NoMotion)

    @Test
    fun `CRL-14 CRL-18 CRL-22 where motion is reduced the row settles and moves at once`() {
        val tanrei = TanreiSystem.Tanrei
        val slow = tanrei.carousel.copy(motionScrollDuration = 1000, motionStateDuration = 1000)
        rule.setContent {
            TanreiTheme(system = tanrei.copy(carousel = slow), theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Box(Modifier.size(400.dp, 200.dp)) {
                    TanreiCarousel(itemCount = 6, contentDescription = "Walks", modifier = Modifier.fillMaxWidth().testTag("carousel")) { index ->
                        TanreiCarouselItem(label = "Walk $index", onClick = {}, modifier = Modifier.testTag("item-$index")) { Box(Modifier.fillMaxSize()) }
                    }
                }
            }
        }
        rule.waitForIdle()
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag("carousel").performSemanticsAction(SemanticsActions.ScrollToIndex) { it(3) }
        repeat(3) { rule.mainClock.advanceTimeByFrame() }
        val left = rule.onNodeWithTag("item-3").getUnclippedBoundsInRoot().left + tanrei.carousel.layoutGap / 2
        assertEquals("in place at once", 16f, left.value, 0.6f)
        rule.mainClock.autoAdvance = true
    }
}
