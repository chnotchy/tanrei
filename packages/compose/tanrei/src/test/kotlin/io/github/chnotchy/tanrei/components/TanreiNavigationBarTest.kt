package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
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
import androidx.compose.ui.layout.boundsInRoot
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertHeightIsEqualTo
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performMouseInput
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.DpRect
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.acme.design.Acme
import io.github.chnotchy.tanrei.primitives.LocalTanreiGlyphStandIn
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph
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
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiNavigationBarConditionStateTokens
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiPressedFeedback
import io.github.chnotchy.tanrei.tokens.TanreiShadowLayer
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import kotlin.math.abs
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TestRule
import org.junit.runner.RunWith
import org.junit.runners.model.Statement
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Behaviour tests for `specs/navigation-bar.spec.json`. Each test names the behaviour id (`NVB-n`) it covers. Runs on
 * the JVM (Robolectric, native graphics) — no emulator needed. The bar is drawn on the surface, [BAR_WIDTH] wide, below
 * a strip of surface and a focusable box, with no system insets unless a test gives some. Every icon is a [Swatch]: it
 * records the color, glyph and bounds its destination gives it, and fills its box with the color.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiNavigationBarTest {
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
    private val tokens = tanrei.navigationBar
    private val surface = colors[TanreiColorRole.Surface]
    private val selectedLook = tokens.conditions.selected
    private val unselectedLook = tokens.conditions.unselected

    private val events = mutableListOf<String>()
    private var current by mutableStateOf(0)
    private val seenColors = mutableMapOf<String, Color>()
    private val seenGlyphs = mutableMapOf<String, TanreiIconGlyph>()
    private val iconBounds = mutableMapOf<String, Rect>()

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
                CompositionLocalProvider(
                    LocalLayoutDirection provides now.direction,
                    LocalDensity provides Density(density.density, now.fontScale),
                    LocalTanreiGlyphStandIn provides { name -> Swatch(name) },
                ) {
                    TanreiTheme(system = now.system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                        Box(Modifier.testTag(STAGE_TAG).width(BAR_WIDTH).background(TanreiColorRole.Surface.color)) { now.content() }
                    }
                }
            }
        }
        rule.waitForIdle()
    }

    /**
     * A bar of [labels] (icons named by the labels in lower case) with destination [current] selected (-1: none), after a
     * focusable box and a strip of surface, before another focusable box. [disabled] names destinations by index;
     * [badges] gives some a badge; [marked] overrides which are marked selected.
     */
    private fun showBar(
        system: TanreiSystem = tanrei,
        labels: List<String> = FOUR,
        disabled: Set<Int> = emptySet(),
        visibility: TanreiNavigationLabelVisibility = TanreiNavigationLabelVisibility.Always,
        badges: Map<Int, TanreiNavigationBadge> = emptyMap(),
        marked: Set<Int>? = null,
        insets: WindowInsets = WindowInsets(0, 0, 0, 0),
        direction: LayoutDirection = LayoutDirection.Ltr,
        fontScale: Float = 1f,
        label: String = "Main",
    ) = show(system, direction, fontScale) {
        Column {
            Box(Modifier.testTag(BEFORE).size(8.dp).focusable())
            Spacer(Modifier.height(ABOVE))
            TanreiNavigationBar(modifier = Modifier.testTag(BAR), labelVisibility = visibility, contentDescription = label, windowInsets = insets) {
                labels.forEachIndexed { i, text ->
                    val selected = marked?.contains(i) ?: (i == current)
                    TanreiNavigationBarItem(
                        selected = selected,
                        onClick = {
                            events += "click:$i:${if (selected) "reselect" else "change"}"
                            current = i
                        },
                        icon = text.lowercase().ifEmpty { "blank" },
                        label = text,
                        modifier = Modifier.testTag(tag(i)),
                        enabled = i !in disabled,
                        badge = badges[i],
                    )
                }
            }
            Box(Modifier.testTag(AFTER).size(8.dp).focusable())
        }
    }

    /** An icon that records the color, glyph and bounds its destination gives it, and fills its box with the color. */
    @Composable
    private fun Swatch(key: String) {
        seenColors[key] = LocalTanreiContentColor.current
        seenGlyphs[key] = LocalTanreiIconGlyph.current
        Box(Modifier.fillMaxSize().onGloballyPositioned { iconBounds[key] = it.boundsInRoot() }.background(LocalTanreiContentColor.current))
    }

    private fun tag(index: Int) = "item-$index"

    private fun item(index: Int) = rule.onNodeWithTag(tag(index))

    // ── NVB-1: activation ────────────────────────────────────────────────────

    @Test
    fun `NVB-1 activating a destination that is not selected is a change, the selected one a reselect, each exactly once`() {
        showBar()
        item(1).performClick()
        rule.waitForIdle()
        item(1).performClick()
        rule.waitForIdle()
        assertEquals(listOf("click:1:change", "click:1:reselect"), events)
        item(1).assertIsSelected()
    }

    @Test
    @KeyboardNavigation
    fun `NVB-1 Enter and Space activate the focused destination`() {
        showBar()
        item(2).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        item(2).performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        assertEquals(listOf("click:2:change", "click:2:reselect"), events)
    }

    // ── NVB-2: disabled ──────────────────────────────────────────────────────

    @Test
    fun `NVB-2 a disabled destination emits nothing and is announced disabled`() {
        showBar(disabled = setOf(2))
        item(2).assertIsNotEnabled()
        item(2).performTouchInput { down(center); up() }
        rule.waitForIdle()
        assertEquals(emptyList<String>(), events)
    }

    @Test
    @KeyboardNavigation
    fun `NVB-2 NVB-19 each destination is a Tab stop, and a disabled one is skipped`() {
        showBar(disabled = setOf(2))
        rule.onNodeWithTag(BEFORE).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        item(0).assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        item(1).assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        item(3).assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(AFTER).assertIsFocused()
        assertEquals("moving focus selects nothing", emptyList<String>(), events)
    }

    // ── NVB-3: selected and unselected parts ─────────────────────────────────

    @Test
    fun `NVB-3 the selected destination draws the selected parts and every other the unselected parts`() {
        showBar()
        assertEquals(selectedLook.enabled.itemIconColor.resolve(colors), seenColors["inbox"])
        assertEquals(unselectedLook.enabled.itemIconColor.resolve(colors), seenColors["sent"])
        assertNotEquals(seenColors["inbox"], seenColors["sent"])
        assertPixel("the indicator behind the selected icon", containerPixel("inbox"), selectedLook.enabled.itemContainerColor.resolve(colors).compositeOver(surface))
        assertPixel("no indicator behind another", containerPixel("sent"), surface)
        assertTrue("the selected label's color", anyPixelClose(labelArea(0), selectedLook.enabled.itemLabelColor.resolve(colors), 0.12f))
        item(0).assertIsSelected()
        item(1).assertIsNotSelected()
    }

    @Test
    fun `NVB-3 with none marked selected every destination is drawn unselected (Compose has no bar value to report)`() {
        current = -1
        showBar()
        (0..3).forEach { item(it).assertIsNotSelected() }
        assertPixel("no indicator", containerPixel("inbox"), surface)
        assertEquals(unselectedLook.enabled.itemIconColor.resolve(colors), seenColors["inbox"])
    }

    // ── NVB-4: states ────────────────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `NVB-4 hovered, focused and pressed each draw their own tokens, pressed over focused over hovered`() {
        val system = tanrei
            .withLook(selected = false, TanreiInteractionState.Hovered) { it.copy(itemContainerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
            .withLook(selected = false, TanreiInteractionState.Focused) { it.copy(itemContainerColor = TanreiPaint.Role(TanreiColorRole.Warning), itemIconColor = TanreiPaint.Role(TanreiColorRole.Primary)) }
            .withLook(selected = false, TanreiInteractionState.Pressed) { it.copy(itemContainerColor = TanreiPaint.Role(TanreiColorRole.Success)) }
        showBar(system = system)
        item(1).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertPixel("hovered", containerPixel("sent"), colors[TanreiColorRole.Error])
        item(1).requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertPixel("focused over hovered", containerPixel("sent"), colors[TanreiColorRole.Warning])
        assertEquals("the focused icon token", colors[TanreiColorRole.Primary], seenColors["sent"])
        item(1).performKeyInput { keyDown(Key.Enter) }
        rule.waitForIdle()
        assertPixel("pressed over focused", containerPixel("sent"), colors[TanreiColorRole.Success])
        item(1).performKeyInput { keyUp(Key.Enter) }
    }

    @Test
    fun `NVB-4 a touch does not draw the focused state`() {
        val system = tanrei.withLook(selected = true, TanreiInteractionState.Focused) { it.copy(itemContainerColor = TanreiPaint.Role(TanreiColorRole.Warning)) }
        showBar(system = system)
        item(1).performTouchInput { down(center); up() }
        rule.mainClock.advanceTimeBy(2000)
        rule.waitForIdle()
        assertPixel("at rest, selected", containerPixel("sent"), selectedLook.enabled.itemContainerColor.resolve(colors).compositeOver(surface))
    }

    // ── NVB-5: focus ring ────────────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `NVB-5 keyboard focus shows the ring around the item container on the first frame`() {
        showBar()
        val measure = tanrei.measure
        val ring = measure.focusOffset + measure.focusInnerWidth + measure.focusOuterWidth / 2
        rule.mainClock.autoAdvance = false
        item(1).requestFocus()
        rule.mainClock.advanceTimeByFrame()
        val container = containerBounds("sent")
        assertPixel("the ring above the item container", stagePixel((container.left + container.right) / 2, container.top - ring), colors[TanreiColorRole.FocusRing])
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `NVB-5 a touch shows no ring`() {
        showBar()
        val measure = tanrei.measure
        val ring = measure.focusOffset + measure.focusInnerWidth + measure.focusOuterWidth / 2
        item(1).performTouchInput { down(center) }
        rule.waitForIdle()
        val container = containerBounds("sent")
        assertPixel("no ring", stagePixel((container.left + container.right) / 2, container.top - ring), surface)
    }

    // ── NVB-6: the cell is the hit area ──────────────────────────────────────

    @Test
    fun `NVB-6 the whole cell is the hit area, an equal share of the width and the bar's height, and it answers on the item container`() {
        val system = tanrei.withLook(selected = false, TanreiInteractionState.Hovered) { it.copy(itemContainerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        showBar(system = system)
        val bar = bounds(BAR)
        (0..3).forEach { i ->
            val cell = bounds(tag(i))
            assertEquals((BAR_WIDTH / 4).value, (cell.right - cell.left).value, 0.6f)
            assertEquals((bar.bottom - bar.top).value, (cell.bottom - cell.top).value, 0.6f)
        }
        item(1).performMouseInput { moveTo(Offset(2f, 2f)) }
        rule.waitForIdle()
        assertPixel("hovered from the cell's corner, drawn on the item container", containerPixel("sent"), colors[TanreiColorRole.Error])
        item(1).performTouchInput { down(Offset(2f, 2f)); up() }
        rule.waitForIdle()
        assertEquals(listOf("click:1:change"), events)
    }

    // ── NVB-7: disabled tokens ───────────────────────────────────────────────

    @Test
    fun `NVB-7 a disabled destination draws the disabled tokens of its condition`() {
        val system = tanrei.withLook(selected = false, TanreiInteractionState.Disabled) {
            it.copy(itemContainerColor = TanreiPaint.Role(TanreiColorRole.Error), itemIconColor = TanreiPaint.Role(TanreiColorRole.Warning))
        }
        showBar(system = system, disabled = setOf(2))
        assertPixel("the disabled container token", containerPixel("starred"), colors[TanreiColorRole.Error])
        assertEquals(colors[TanreiColorRole.Warning], seenColors["starred"])
        assertEquals("by default a disabled destination keeps its resting container", unselectedLook.enabled.itemContainerColor, unselectedLook.disabled.itemContainerColor)
        assertEquals("a disabled selected destination keeps its indicator", selectedLook.enabled.itemContainerColor, selectedLook.disabled.itemContainerColor)
    }

    // ── NVB-8 / NVB-9: the press ─────────────────────────────────────────────

    @Test
    fun `NVB-8 a tap that ends at once shows the pressed state on the next frame and keeps it for press-hold`() {
        val system = tanrei.withLook(selected = true, TanreiInteractionState.Pressed) { it.copy(itemContainerColor = TanreiPaint.Role(TanreiColorRole.Success)) }
        showBar(system = system)
        val hold = tanrei.motion.duration.pressHold.toLong()
        rule.mainClock.autoAdvance = false
        item(0).performTouchInput { down(center); up() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("pressed", containerPixel("inbox"), colors[TanreiColorRole.Success])
        rule.mainClock.advanceTimeBy(hold / 2)
        assertPixel("still pressed", containerPixel("inbox"), colors[TanreiColorRole.Success])
        rule.mainClock.advanceTimeBy(hold + tokens.motionStateDuration * 2L)
        assertPixel("at rest", containerPixel("inbox"), selectedLook.enabled.itemContainerColor.resolve(colors).compositeOver(surface))
        rule.mainClock.autoAdvance = true
    }

    private fun TanreiSystem.answering(feedback: TanreiPressedFeedback) = copy(behavior = behavior.copy(pressedFeedback = feedback))

    @Test
    fun `NVB-9 ripple grows the pressed color, clipped to the item container, from the point of contact - from its center for a press beside it`() {
        val system = tanrei.answering(TanreiPressedFeedback.Ripple)
            .withLook(selected = true, TanreiInteractionState.Pressed) { it.copy(itemContainerColor = TanreiPaint.Role(TanreiColorRole.Success)) }
        showBar(system = system)
        val container = containerBounds("inbox")
        val cell = bounds(tag(0))
        val success = colors[TanreiColorRole.Success]
        rule.mainClock.autoAdvance = false
        item(0).performTouchInput { down(Offset((container.left - cell.left + 4.dp).toPx(), (container.top - cell.top + 16.dp).toPx())) }
        rule.mainClock.advanceTimeBy(50)
        assertPixel("at the point of contact", stagePixel(container.left + 4.dp, container.top + 16.dp), success)
        assertFalse("not yet at the far end", isClose(stagePixel(container.right - 3.dp, container.top + 16.dp), success))
        rule.mainClock.advanceTimeBy(tokens.motionFeedbackDuration.toLong())
        assertPixel("grown to the far end", stagePixel(container.right - 3.dp, container.top + 16.dp), success)
        assertFalse("clipped to the item container", isClose(stagePixel(container.right + 3.dp, container.top + 16.dp), success))
        item(0).performTouchInput { up() }
        rule.mainClock.advanceTimeBy(2000)
        // A press on the label, outside the item container, grows from the container's center.
        item(1).performTouchInput { down(Offset(centerX, height - 4.dp.toPx())) }
        rule.mainClock.advanceTimeBy(50)
        val second = containerBounds("sent")
        assertFalse("from the item container's center", isClose(stagePixel((second.left + second.right) / 2 - 8.dp, (second.top + second.bottom) / 2), surface))
        assertPixel("not yet at its start edge", stagePixel(second.left + 2.dp, (second.top + second.bottom) / 2), surface)
        item(1).performTouchInput { up() }
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `NVB-9 dim - cupertino's answer - dims the pressed destination and draws no state layer, and none draws nothing`() {
        val cupertino = TanreiSystem.Cupertino
        assertEquals(TanreiPressedFeedback.Dim, cupertino.behavior.pressedFeedback)
        assertTrue(cupertino.navigationBar.pressed.opacity < 1f)
        showBar(system = cupertino)
        val before = item(1).captureToImage().toPixelMap()
        item(1).performTouchInput { down(center) }
        rule.waitForIdle()
        val after = item(1).captureToImage().toPixelMap()
        assertTrue("the destination is dimmed", differing(before, after) > 0)
        assertPixel("no state layer: the bar's own color", containerPixel("sent"), cupertino.navigationBar.containerColor.resolve(cupertino.colors.light))
        item(1).performTouchInput { up() }
        showBar(system = tanrei.answering(TanreiPressedFeedback.None))
        item(1).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val hovered = stage()
        item(1).performMouseInput { press() }
        rule.waitForIdle()
        assertSameAs(hovered, stage(), "pressed under none")
        item(1).performMouseInput { release() }
    }

    // ── NVB-10: corners, focus style ─────────────────────────────────────────

    @Test
    fun `NVB-10 the item container's corners are its shape eased by corner smoothing`() {
        val radius = 12.dp
        val system = tanrei.copy(navigationBar = tokens.copy(itemContainerShape = radius))
        for (smoothing in listOf(0f, 0.6f)) {
            showBar(system = system.copy(shape = tanrei.shape.copy(cornerSmoothing = smoothing)))
            val container = containerBounds("inbox")
            assertPixel("smoothing $smoothing: the very corner is outside", stagePixel(container.left + 0.5.dp, container.top + 0.5.dp), surface)
            assertPixel("smoothing $smoothing: inside", stagePixel(container.left + radius, container.top + radius), selectedLook.enabled.itemContainerColor.resolve(colors).compositeOver(surface))
        }
    }

    @Test
    @KeyboardNavigation
    fun `NVB-10 glow draws the focus as a halo around the item container under acme`() {
        val acme = TanreiSystem.Acme
        assertEquals(TanreiFocusStyle.Glow, acme.behavior.focusStyle)
        showBar(system = acme)
        item(1).requestFocus().assertIsFocused()
        rule.waitForIdle()
        val container = containerBounds("sent")
        val m = acme.measure
        val halo = stagePixel((container.left + container.right) / 2, container.top - (m.focusOffset + m.focusInnerWidth + m.focusOuterWidth / 4))
        assertFalse("a halo just outside the container: $halo", isClose(halo, acme.colors.light[TanreiColorRole.Surface]))
    }

    // ── NVB-11: the bar ──────────────────────────────────────────────────────

    @Test
    fun `NVB-11 the bar spans its parent, is at least its height, filled, raised and edged at the top, in equal cells from the start`() {
        val system = tanrei.copy(
            navigationBar = tokens.copy(
                containerColor = TanreiPaint.Role(TanreiColorRole.Primary),
                containerElevation = listOf(TanreiShadowLayer(x = 0.dp, y = (-8).dp, blur = 0.dp, spread = 0.dp, role = TanreiColorRole.Error)),
                outlineColor = TanreiPaint.Role(TanreiColorRole.Success),
            ),
        )
        showBar(system = system)
        val bar = bounds(BAR)
        assertEquals(BAR_WIDTH.value, (bar.right - bar.left).value, 0.5f)
        rule.onNodeWithTag(BAR).assertHeightIsEqualTo(tokens.containerHeight)
        assertPixel("the top edge", stagePixel(BAR_WIDTH / 2, bar.top - stageTop() + 0.5.dp), colors[TanreiColorRole.Success])
        assertPixel("the container", stagePixel(2.dp, bar.top - stageTop() + tokens.outlineWidth + 2.dp), colors[TanreiColorRole.Primary])
        assertPixel("the elevation's shadow above", stagePixel(BAR_WIDTH / 2, bar.top - stageTop() - 4.dp), colors[TanreiColorRole.Error])
        assertEquals("from the start", bar.left.value, bounds(tag(0)).left.value, 0.5f)
        showBar(direction = LayoutDirection.Rtl)
        assertEquals("right to left: from the right", bounds(BAR).right.value, bounds(tag(0)).right.value, 0.5f)
        assertTrue(bounds(tag(1)).left < bounds(tag(0)).left)
    }

    // ── NVB-12: one destination ──────────────────────────────────────────────

    @Test
    fun `NVB-12 an item container of its size with the icon centered, the label gap below it on one line, the group centered in the cell`() {
        val system = tanrei.copy(navigationBar = tokens.copy(itemContainerWidth = 60.dp, itemContainerHeight = 36.dp, itemGap = 6.dp, containerColor = TanreiPaint.Role(TanreiColorRole.Surface)))
        showBar(system = system, labels = listOf("Inbox", "A label far too long for its cell", "Starred", "Settings"))
        val container = containerBounds("inbox")
        assertEquals(60f, (container.right - container.left).value, 0.6f)
        assertEquals(36f, (container.bottom - container.top).value, 0.6f)
        assertPixel("the container's left edge", stagePixel(container.left + 1.dp, container.top + 18.dp), selectedLook.enabled.itemContainerColor.resolve(colors).compositeOver(surface))
        val cell = bounds(tag(0))
        assertEquals("centered across the cell", ((cell.left + cell.right) / 2).value, ((container.left + container.right) / 2).value, 0.6f)
        val line = with(rule.density) { tokens.itemLabelTypescale.lineHeight.toDp() }
        val group = 36.dp + 6.dp + line
        assertEquals("the group centered in the cell", (cell.top + (cell.bottom - cell.top - group) / 2).value, container.top.value, 0.6f)
        val ink = selectedLook.enabled.itemLabelColor.resolve(colors)
        assertTrue("the label below, gap away", anyPixelClose(DpRect(cell.left, container.bottom + 6.dp, cell.right, container.bottom + 6.dp + line), ink, 0.3f))
        assertFalse("nothing between the container and the label", anyPixelClose(DpRect(cell.left, container.bottom + 1.dp, cell.right, container.bottom + 5.dp), ink, 0.3f))
        // The long label: one line, within its cell.
        val long = bounds(tag(1))
        val longArea = DpRect(long.left, containerBounds("a label far too long for its cell").bottom + 6.dp, long.right, long.bottom)
        assertTrue(anyPixelClose(longArea, unselectedLook.enabled.itemLabelColor.resolve(colors), 0.3f))
        assertFalse("one line: nothing under it", anyPixelClose(DpRect(long.left, containerBounds("a label far too long for its cell").bottom + 6.dp + line + 1.dp, long.right, long.bottom), unselectedLook.enabled.itemLabelColor.resolve(colors), 0.3f))
    }

    // ── NVB-13: label visibility ─────────────────────────────────────────────

    @Test
    fun `NVB-13 always draws every label, selected only the selected one's, never none - and the label stays the name`() {
        val ink = unselectedLook.enabled.itemLabelColor.resolve(colors)
        showBar(visibility = TanreiNavigationLabelVisibility.Always)
        assertTrue(anyPixelClose(labelArea(1), ink, 0.3f))
        showBar(visibility = TanreiNavigationLabelVisibility.Selected)
        assertFalse("an unselected label is not drawn", anyPixelClose(labelArea(1), ink, 0.3f))
        assertTrue("the selected one is", anyPixelClose(labelArea(0), selectedLook.enabled.itemLabelColor.resolve(colors), 0.3f))
        showBar(visibility = TanreiNavigationLabelVisibility.Never)
        (0..3).forEach { assertFalse(anyPixelClose(labelArea(it), ink, 0.3f)) }
        val cell = bounds(tag(1))
        val container = containerBounds("sent")
        assertEquals("the item container centered in its cell", ((cell.top + cell.bottom) / 2).value, ((container.top + container.bottom) / 2).value, 0.6f)
        item(1).assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf("Sent")))
    }

    // ── NVB-14: icons ────────────────────────────────────────────────────────

    @Test
    fun `NVB-14 each icon is drawn at the icon size in the glyph of its condition`() {
        showBar()
        with(rule.density) {
            val icon = iconBounds.getValue("inbox")
            assertEquals(tokens.itemIconSize.toPx(), icon.width, 0.5f)
            assertEquals(tokens.itemIconSize.toPx(), icon.height, 0.5f)
        }
        assertEquals(tanrei.icon.glyph(tokens.itemIconSize, selected = true), seenGlyphs["inbox"])
        assertEquals(tanrei.icon.glyph(tokens.itemIconSize, selected = false), seenGlyphs["sent"])
    }

    // ── NVB-15: selection motion ─────────────────────────────────────────────

    @Test
    fun `NVB-15 a new selection grows its indicator in width from the center at full height, fades the old one and moves colors over the selection motion`() {
        val slow = 400
        val system = tanrei.copy(navigationBar = tokens.copy(motionSelectionDuration = slow, motionSelectionEasing = tanrei.motion.easing.linear))
        showBar(system = system)
        val indicator = selectedLook.enabled.itemContainerColor.resolve(colors).compositeOver(surface)
        val from = unselectedLook.enabled.itemIconColor.resolve(colors)
        val to = selectedLook.enabled.itemIconColor.resolve(colors)
        rule.mainClock.autoAdvance = false
        current = 2
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(slow * 3L / 4)
        val grown = containerBounds("starred")
        val middle = (grown.left + grown.right) / 2
        assertPixel("the new indicator grown from its center", stagePixel(middle - 14.dp, (grown.top + grown.bottom) / 2), indicator)
        assertFalse("not yet at its edge", isClose(stagePixel(grown.left + 1.dp, grown.top + 16.dp), indicator))
        // 6c8a6cf: in width only — already at its full height while it grows.
        assertPixel("at full height while growing", stagePixel(middle - 14.dp, grown.top + 1.5.dp), indicator)
        assertPixel("to its bottom edge", stagePixel(middle - 14.dp, grown.bottom - 1.5.dp), indicator)
        val old = containerPixel("inbox")
        assertTrue("the old one fading: $old", !isClose(old, indicator) && !isClose(old, surface))
        val between = seenColors.getValue("starred")
        assertTrue("the icon on its way: $between", !isClose(between, from) && !isClose(between, to))
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertPixel("grown", stagePixel(grown.left + 3.dp, grown.top + 16.dp), indicator)
        assertPixel("gone", containerPixel("inbox"), surface)
        assertEquals(to, seenColors.getValue("starred"))
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `NVB-15 with labels on the selected destination only, labels come and go and the item containers move over the same time`() {
        val slow = 400
        val system = tanrei.copy(navigationBar = tokens.copy(motionSelectionDuration = slow, motionSelectionEasing = tanrei.motion.easing.linear))
        showBar(system = system, visibility = TanreiNavigationLabelVisibility.Selected)
        val start = iconBounds.getValue("starred").center.y
        rule.mainClock.autoAdvance = false
        current = 2
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(slow / 2L)
        val half = iconBounds.getValue("starred").center.y
        rule.mainClock.advanceTimeBy(slow.toLong())
        val end = iconBounds.getValue("starred").center.y
        assertTrue("moving up as its label appears: $start → $half → $end", start > half && half > end)
        rule.mainClock.autoAdvance = true
    }

    // ── NVB-16: badges ───────────────────────────────────────────────────────

    @Test
    fun `NVB-16 a badge is drawn on the icon as the badge component draws it, kept when disabled, and read after the name and state`() {
        showBar(badges = mapOf(0 to TanreiNavigationBadge(count = 3, contentDescription = "3 unread"), 1 to TanreiNavigationBadge(contentDescription = "New"), 2 to TanreiNavigationBadge(count = 12)), disabled = setOf(1))
        item(0).assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "3 unread"))
        item(1).assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "New"))
        item(2).assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "12"))
        item(3).assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.StateDescription))
        val badge = tanrei.badge.containerColor.resolve(colors)
        for (key in listOf("inbox", "sent")) {
            val icon = iconBounds.getValue(key)
            val area = with(rule.density) { DpRect(icon.right.toDp() - 8.dp, icon.top.toDp() - 8.dp, icon.right.toDp() + 12.dp, icon.top.toDp() + 8.dp) }
            assertTrue("$key: the badge at the icon's top end", anyPixelClose(area, badge, 0.1f))
        }
    }

    // ── NVB-17: count ────────────────────────────────────────────────────────

    @Test
    fun `NVB-17 fewer than three or more than five destinations still render, and a debuggable app reports the count`() = collectingReports { reports ->
        setDebuggable(true)
        showBar(labels = listOf("Inbox", "Sent"))
        rule.waitForIdle()
        item(1).assertExists()
        assertTrue(reports.toString(), reports.any { "2 destinations" in it })
        showBar(labels = listOf("A", "B", "C", "D", "E", "F"))
        rule.waitForIdle()
        item(5).assertExists()
        assertTrue(reports.toString(), reports.any { "6 destinations" in it })
    }

    // ── NVB-18: insets ───────────────────────────────────────────────────────

    @Test
    fun `NVB-18 the container reaches under the bottom inset and the destinations stay above it and inside the side insets`() {
        val system = tanrei.copy(navigationBar = tokens.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Primary)))
        showBar(system = system, insets = WindowInsets(left = 10.dp, top = 0.dp, right = 12.dp, bottom = 20.dp))
        val bar = bounds(BAR)
        rule.onNodeWithTag(BAR).assertHeightIsEqualTo(tokens.containerHeight + 20.dp)
        assertPixel("under the bottom inset", stagePixel(BAR_WIDTH / 2, bar.bottom - stageTop() - 2.dp), colors[TanreiColorRole.Primary])
        assertEquals((bar.left + 10.dp).value, bounds(tag(0)).left.value, 0.5f)
        assertEquals((bar.right - 12.dp).value, bounds(tag(3)).right.value, 0.5f)
        assertEquals("above the inset", (bar.bottom - 20.dp).value, bounds(tag(0)).bottom.value, 0.5f)
    }

    // ── NVB-19: semantics ────────────────────────────────────────────────────

    @Test
    fun `NVB-19 a named group of tabs - each one element named by its label, with its selected state, its position and no icon`() {
        showBar()
        val bar = rule.onNodeWithTag(BAR).fetchSemanticsNode().config
        assertEquals(listOf("Main"), bar[SemanticsProperties.ContentDescription])
        assertTrue(SemanticsProperties.SelectableGroup in bar)
        assertEquals(4, bar[SemanticsProperties.CollectionInfo].columnCount)
        (0..3).forEach { i ->
            item(i).assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Tab))
            assertEquals(i, item(i).fetchSemanticsNode().config[SemanticsProperties.CollectionItemInfo].columnIndex)
            item(i).assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf(FOUR[i])))
            item(i).assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Text))
        }
        item(0).assertIsSelected()
        item(1).assertIsNotSelected()
        assertEquals("the icon and the label are not separate elements", 0, rule.onAllNodes(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf("Sent"))).fetchSemanticsNodes().size - 1)
    }

    // ── NVB-20: no name ──────────────────────────────────────────────────────

    @Test
    fun `NVB-20 an empty label still renders and works, and a debuggable app reports it`() = collectingReports { reports ->
        setDebuggable(true)
        showBar(labels = listOf("Inbox", "", "Starred"))
        item(1).performClick()
        rule.waitForIdle()
        assertEquals(listOf("click:1:change"), events)
        assertTrue(reports.toString(), reports.any { "TanreiNavigationBarItem" in it && "label" in it })
    }

    // ── NVB-21: enlarged text ────────────────────────────────────────────────

    @Test
    fun `NVB-21 enlarged text grows the bar to hold its labels on one line and does not scale the item containers or icons`() {
        showBar(fontScale = 2f)
        val height = bounds(BAR).let { it.bottom - it.top }
        assertTrue("taller: $height", height > tokens.containerHeight)
        with(rule.density) {
            assertEquals(tokens.itemIconSize.toPx(), iconBounds.getValue("inbox").width, 0.5f)
        }
        val container = containerBounds("inbox")
        assertEquals(tokens.itemContainerWidth.value, (container.right - container.left).value, 0.6f)
        assertTrue("the label fits below the container", anyPixelClose(labelArea(1), unselectedLook.enabled.itemLabelColor.resolve(colors), 0.3f))
    }

    // ── NVB-22: repeated values ──────────────────────────────────────────────

    @Test
    fun `NVB-22 when two destinations are marked selected the first is drawn selected, and a debuggable app reports it`() = collectingReports { reports ->
        setDebuggable(true)
        showBar(marked = setOf(1, 2))
        rule.waitForIdle()
        item(1).assertIsSelected()
        item(2).assertIsNotSelected()
        assertPixel("no indicator on the second", containerPixel("starred"), surface)
        assertTrue(reports.toString(), reports.any { "more than one" in it })
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun TanreiSystem.withLook(selected: Boolean, state: TanreiInteractionState, change: (TanreiNavigationBarConditionStateTokens) -> TanreiNavigationBarConditionStateTokens): TanreiSystem {
        val conditions = navigationBar.conditions
        val look = if (selected) conditions.selected else conditions.unselected
        val changed = when (state) {
            TanreiInteractionState.Enabled -> look.copy(enabled = change(look.enabled))
            TanreiInteractionState.Hovered -> look.copy(hovered = change(look.hovered))
            TanreiInteractionState.Focused -> look.copy(focused = change(look.focused))
            TanreiInteractionState.Pressed -> look.copy(pressed = change(look.pressed))
            TanreiInteractionState.Disabled -> look.copy(disabled = change(look.disabled))
        }
        return copy(navigationBar = navigationBar.copy(conditions = if (selected) conditions.copy(selected = changed) else conditions.copy(unselected = changed)))
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

    private fun bounds(tag: String): DpRect = rule.onNodeWithTag(tag).getUnclippedBoundsInRoot()

    private fun stageTop(): Dp = bounds(STAGE_TAG).top

    private fun stage(): PixelMap = rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap()

    /** A pixel at ([x], [y]) from the stage's top-left. */
    private fun stagePixel(x: Dp, y: Dp): Color = with(rule.density) { stage()[x.roundToPx(), y.roundToPx()] }

    /** The item container of the destination whose icon is [icon], in root coordinates: its icon's box grown to the container. */
    private fun containerBounds(icon: String): DpRect = with(rule.density) {
        val box = iconBounds.getValue(icon)
        val system = scene?.system ?: tanrei
        val bar = system.navigationBar
        val center = box.center
        DpRect(center.x.toDp() - bar.itemContainerWidth / 2, center.y.toDp() - bar.itemContainerHeight / 2, center.x.toDp() + bar.itemContainerWidth / 2, center.y.toDp() + bar.itemContainerHeight / 2)
    }

    /** A pixel inside the item container of [icon], clear of the icon (its start side). */
    private fun containerPixel(icon: String): Color {
        val container = containerBounds(icon)
        val stageBounds = bounds(STAGE_TAG)
        return stagePixel(container.left - stageBounds.left + 6.dp, (container.top + container.bottom) / 2 - stageBounds.top)
    }

    /** Where destination [index]'s label is drawn: below its item container, across its cell. */
    private fun labelArea(index: Int): DpRect {
        val cell = bounds(tag(index))
        val key = (scene?.let { FOUR.getOrNull(index) } ?: "").lowercase()
        val container = containerBounds(key)
        return DpRect(cell.left, container.bottom + 1.dp, cell.right, cell.bottom)
    }

    private fun anyPixelClose(area: DpRect, color: Color, tolerance: Float = 0.1f): Boolean {
        val map = stage()
        val stageBounds = bounds(STAGE_TAG)
        return with(rule.density) {
            val left = (area.left - stageBounds.left).roundToPx().coerceIn(0, map.width - 1)
            val right = (area.right - stageBounds.left).roundToPx().coerceIn(0, map.width)
            val top = (area.top - stageBounds.top).roundToPx().coerceIn(0, map.height - 1)
            val bottom = (area.bottom - stageBounds.top).roundToPx().coerceIn(0, map.height)
            (top until bottom).any { y -> (left until right).any { x -> isClose(map[x, y], color, tolerance) } }
        }
    }

    private fun differing(a: PixelMap, b: PixelMap): Int =
        (0 until minOf(a.height, b.height)).sumOf { y -> (0 until minOf(a.width, b.width)).count { x -> !isClose(a[x, y], b[x, y]) } }

    private fun assertSameAs(expected: PixelMap, actual: PixelMap, what: String) = assertEquals("$what: not one pixel differs", 0, differing(expected, actual))

    private fun isClose(actual: Color, expected: Color, tolerance: Float = PIXEL_TOLERANCE): Boolean =
        maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue)) <= tolerance

    private fun assertPixel(what: String, actual: Color, expected: Color) =
        assertTrue("$what: expected $expected but was $actual", isClose(actual, expected))

    private companion object {
        const val STAGE_TAG = "stage"
        const val BAR = "bar"
        const val BEFORE = "before"
        const val AFTER = "after"
        val FOUR = listOf("Inbox", "Sent", "Starred", "Settings")
        const val PIXEL_TOLERANCE = 2f / 255f
        val BAR_WIDTH = 360.dp
        val ABOVE = 24.dp
    }
}

/** NVB-15 where motion is reduced (the animator duration scale is 0, see `TanreiButtonReducedMotionTest`). */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiNavigationBarReducedMotionTest {
    private object NoMotion : MotionDurationScale {
        override val scaleFactor: Float = 0f
    }

    @get:Rule
    val rule = createComposeRule(effectContext = NoMotion)

    private var current by mutableStateOf(0)
    private var starredIcon = Color.Unspecified

    @Test
    fun `NVB-15 where motion is reduced the new selection shows at once`() {
        val tanrei = TanreiSystem.Tanrei
        val colors = tanrei.colors.light
        val slow = tanrei.navigationBar.copy(motionSelectionDuration = 1000, motionStateDuration = 1000)
        rule.setContent {
            CompositionLocalProvider(LocalTanreiGlyphStandIn provides { name -> if (name == "starred") starredIcon = LocalTanreiContentColor.current }) {
                TanreiTheme(system = tanrei.copy(navigationBar = slow), theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                    TanreiNavigationBar(windowInsets = WindowInsets(0, 0, 0, 0)) {
                        listOf("Inbox", "Sent", "Starred").forEachIndexed { i, label ->
                            TanreiNavigationBarItem(selected = current == i, onClick = { current = i }, icon = label.lowercase(), label = label, modifier = Modifier.testTag("item-$i"))
                        }
                    }
                }
            }
        }
        rule.waitForIdle()
        rule.mainClock.autoAdvance = false
        current = 2
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        repeat(3) { rule.mainClock.advanceTimeByFrame() }
        rule.onNodeWithTag("item-2").assertIsSelected()
        assertEquals("the selected icon color at once", tanrei.navigationBar.conditions.selected.enabled.itemIconColor.resolve(colors), starredIcon)
        rule.mainClock.autoAdvance = true
    }
}
