package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
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
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.isRoot
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performMouseInput
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.acme.design.Acme
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.Cupertino
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiFocusStyle
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiPressedFeedback
import io.github.chnotchy.tanrei.tokens.TanreiSliderConditionStateTokens
import io.github.chnotchy.tanrei.tokens.TanreiSliderSize
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
 * Behaviour tests for `specs/slider.spec.json`. Each test names the behaviour id (`SLD-n`) it covers. Runs on the JVM
 * (Robolectric, native graphics). The slider is 320 long (240 when vertical) on the page's surface, between a focusable box
 * before it and one after it; the caller moves `value` from `onValueChange` and records every `input` and `change`.
 * A handle's element — the round state layer, `container.size` square, centred on the handle — is found by its name.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w480dp-h640dp-xhdpi")
class TanreiSliderTest {
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
    private val tokens = tanrei.slider
    private val look = tokens.conditions.standard
    private val small = tokens.sizes.small
    private val surface = colors[TanreiColorRole.Surface]

    private var value by mutableStateOf(40f)
    private var span by mutableStateOf(20f..60f)
    private val events = mutableListOf<String>()

    /** How far the handle's centre can travel from, in the default geometry: half the container plus half the track. */
    private val travelInset = tokens.containerSize / 2 + small.trackThickness / 2

    private fun show(
        system: TanreiSystem = tanrei,
        orientation: Orientation = Orientation.Horizontal,
        direction: LayoutDirection = LayoutDirection.Ltr,
        valueRange: ClosedFloatingPointRange<Float> = 0f..100f,
        step: Float = 0f,
        origin: Float? = null,
        showStops: Boolean = false,
        size: TanreiSliderSize = TanreiSliderSize.Small,
        valueIndicator: TanreiSliderValueIndicator = TanreiSliderValueIndicator.None,
        enabled: Boolean = true,
        label: String = "Volume",
        stateDescription: String = "",
        ranged: Boolean = false,
        startLabel: String = "Minimum price",
        startStateDescription: String = "",
        inPlace: Boolean = false,
        follow: Boolean = true,
    ) {
        rule.setContent {
            CompositionLocalProvider(LocalLayoutDirection provides direction, LocalTanreiSliderIndicatorInPlace provides inPlace) {
                TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                    Column(Modifier.testTag(STAGE).width(STAGE_WIDTH).background(TanreiColorRole.Surface.color)) {
                        Box(Modifier.testTag(BEFORE).size(8.dp).focusable())
                        Box(Modifier.size(STAGE_WIDTH, 48.dp))
                        Box(if (orientation == Orientation.Vertical) Modifier.height(LENGTH_VERTICAL) else Modifier.width(LENGTH)) {
                            if (ranged) {
                                TanreiSlider(
                                    value = span,
                                    onValueChange = { events += "input:${it.start}..${it.endInclusive}"; if (follow) span = it },
                                    contentDescription = label,
                                    startContentDescription = startLabel,
                                    modifier = Modifier.testTag(SLIDER),
                                    enabled = enabled,
                                    valueRange = valueRange,
                                    step = step,
                                    showStops = showStops,
                                    size = size,
                                    orientation = orientation,
                                    valueIndicator = valueIndicator,
                                    stateDescription = stateDescription,
                                    startStateDescription = startStateDescription,
                                    onValueChangeFinished = { events += "change:${it.start}..${it.endInclusive}" },
                                )
                            } else {
                                TanreiSlider(
                                    value = value,
                                    onValueChange = { events += "input:$it"; if (follow) value = it },
                                    contentDescription = label,
                                    modifier = Modifier.testTag(SLIDER),
                                    enabled = enabled,
                                    valueRange = valueRange,
                                    step = step,
                                    origin = origin,
                                    showStops = showStops,
                                    size = size,
                                    orientation = orientation,
                                    valueIndicator = valueIndicator,
                                    stateDescription = stateDescription,
                                    onValueChangeFinished = { events += "change:$it" },
                                )
                            }
                        }
                        Box(Modifier.size(STAGE_WIDTH, 48.dp))
                        Box(Modifier.testTag(AFTER).size(8.dp).focusable())
                    }
                }
            }
        }
        rule.waitForIdle()
    }

    private fun handle(name: String = "Volume") = rule.onNodeWithContentDescription(name)

    private fun sliderBounds() = rule.onNodeWithTag(SLIDER).getUnclippedBoundsInRoot()

    /** The handle's centre along the axis, from the slider's start edge (or bottom, for a vertical slider). */
    private fun handleAlong(name: String = "Volume", vertical: Boolean = false, rtl: Boolean = false): Dp {
        val h = handle(name).getUnclippedBoundsInRoot()
        val s = sliderBounds()
        return when {
            vertical -> s.bottom - (h.top + h.bottom) / 2
            rtl -> s.right - (h.left + h.right) / 2
            else -> (h.left + h.right) / 2 - s.left
        }
    }

    /** Where [v] of 0…100 lies along a 320 slider in the default geometry. */
    private fun alongFor(v: Float, length: Dp = LENGTH, inset: Dp = travelInset): Dp = inset + (length - inset * 2) * (v / 100f)

    private fun stage(): PixelMap = rule.onNodeWithTag(STAGE).captureToImage().toPixelMap()

    /** A pixel at ([x], [y]) from the slider's top-left. */
    private fun sliderPixel(x: Dp, y: Dp, map: PixelMap = stage()): Color {
        val s = sliderBounds()
        val stage = rule.onNodeWithTag(STAGE).getUnclippedBoundsInRoot()
        return with(rule.density) { map[(s.left - stage.left + x).roundToPx(), (s.top - stage.top + y).roundToPx()] }
    }

    private val mid: Dp get() = sliderBounds().let { (it.bottom - it.top) / 2 }

    private fun px(dp: Dp): Float = with(rule.density) { dp.toPx() }

    private fun TanreiSystem.withLook(state: TanreiInteractionState, change: (TanreiSliderConditionStateTokens) -> TanreiSliderConditionStateTokens): TanreiSystem {
        val c = slider.conditions.standard
        val changed = when (state) {
            TanreiInteractionState.Enabled -> c.copy(enabled = change(c.enabled))
            TanreiInteractionState.Hovered -> c.copy(hovered = change(c.hovered))
            TanreiInteractionState.Focused -> c.copy(focused = change(c.focused))
            TanreiInteractionState.Pressed -> c.copy(pressed = change(c.pressed))
            TanreiInteractionState.Disabled -> c.copy(disabled = change(c.disabled))
        }
        return copy(slider = slider.copy(conditions = slider.conditions.copy(standard = changed)))
    }

    private fun TanreiSystem.answering(feedback: TanreiPressedFeedback) = copy(behavior = behavior.copy(pressedFeedback = feedback))

    private fun SemanticsNodeInteraction.rangeInfo(): ProgressBarRangeInfo = fetchSemanticsNode().config[SemanticsProperties.ProgressBarRangeInfo]

    // ── SLD-1: values ────────────────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `SLD-1 a discrete slider takes only min plus whole steps up to max, snapping to the nearest`() {
        value = 30f
        show(step = 10f, valueRange = 0f..95f)
        handle().requestFocus().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        handle().performKeyInput { pressKey(Key.MoveEnd) }
        rule.waitForIdle()
        assertEquals("the highest whole step below max", listOf("input:40.0", "change:40.0", "input:90.0", "change:90.0"), events)
        events.clear()
        handle().performSemanticsAction(SemanticsActions.SetProgress) { it(33f) }
        rule.waitForIdle()
        assertEquals("snapped to the nearest step", listOf("input:30.0", "change:30.0"), events)
    }

    @Test
    fun `SLD-1 a continuous slider takes any value between min and max`() {
        show()
        handle().performSemanticsAction(SemanticsActions.SetProgress) { it(12.34f) }
        handle().performSemanticsAction(SemanticsActions.SetProgress) { it(150f) }
        rule.waitForIdle()
        assertEquals(listOf("input:12.34", "change:12.34", "input:100.0", "change:100.0"), events)
    }

    // ── SLD-2: the pointer ───────────────────────────────────────────────────

    @Test
    fun `SLD-2 a mouse press on the track moves the handle to the value under it, a drag follows, and change comes once after the last input`() {
        show(step = 1f)
        rule.onNodeWithTag(SLIDER).performMouseInput {
            moveTo(Offset(px(alongFor(75f)), px(mid)))
            press()
            moveTo(Offset(px(alongFor(80f)), px(mid)))
            moveTo(Offset(px(alongFor(85f)), px(mid)))
            release()
        }
        rule.waitForIdle()
        assertEquals(listOf("input:75.0", "input:80.0", "input:85.0", "change:85.0"), events)
        assertEquals(85f, value)
    }

    @Test
    fun `SLD-2 on touch a tap moves the handle when it ends, a drag along the track follows once past the slop, and a press that goes across first changes nothing`() {
        show(step = 1f)
        rule.onNodeWithTag(SLIDER).performTouchInput {
            down(Offset(px(alongFor(70f)), px(mid)))
            up()
        }
        rule.waitForIdle()
        assertEquals("a tap", listOf("input:70.0", "change:70.0"), events)
        events.clear()
        rule.onNodeWithTag(SLIDER).performTouchInput {
            down(Offset(px(alongFor(70f)), px(mid)))
            moveTo(Offset(px(alongFor(80f)), px(mid)))
            moveTo(Offset(px(alongFor(90f)), px(mid)))
            up()
        }
        rule.waitForIdle()
        assertEquals("a drag", listOf("input:80.0", "input:90.0", "change:90.0"), events)
        events.clear()
        rule.onNodeWithTag(SLIDER).performTouchInput {
            down(Offset(px(alongFor(50f)), px(mid)))
            moveTo(Offset(px(alongFor(50f)), px(mid) + px(40.dp)))
            moveTo(Offset(px(alongFor(20f)), px(mid) + px(40.dp)))
            up()
        }
        rule.waitForIdle()
        assertEquals("left to a scroll view", emptyList<String>(), events)
        assertEquals(90f, value)
    }

    @Test
    fun `SLD-2 SLD-5 a press moves the nearer handle of a range, and where the handles meet the one that can move toward the press`() {
        span = 20f..60f
        show(ranged = true, step = 1f, label = "Maximum price")
        rule.onNodeWithTag(SLIDER).performMouseInput { moveTo(Offset(px(alongFor(55f)), px(mid))); press(); release() }
        rule.waitForIdle()
        assertEquals(listOf("input:20.0..55.0", "change:20.0..55.0"), events)
        events.clear()
        span = 50f..50f
        rule.waitForIdle()
        rule.onNodeWithTag(SLIDER).performMouseInput { moveTo(Offset(px(alongFor(30f)), px(mid))); press(); release() }
        rule.waitForIdle()
        assertEquals("the start handle moves down", listOf("input:30.0..50.0", "change:30.0..50.0"), events)
    }

    // ── SLD-3: the keyboard ──────────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `SLD-3 the arrows move by one keyboard step, Page Up and Down by ten, Home and End to the ends, each input then change, and a key that changes nothing emits nothing`() {
        show()
        handle().requestFocus()
        for (key in listOf(Key.DirectionRight, Key.DirectionUp, Key.DirectionLeft, Key.DirectionDown, Key.PageUp, Key.PageDown, Key.MoveEnd)) {
            handle().performKeyInput { pressKey(key) }
            rule.waitForIdle()
        }
        handle().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        handle().performKeyInput { pressKey(Key.MoveHome) }
        rule.waitForIdle()
        assertEquals(
            listOf("input:41.0", "change:41.0", "input:42.0", "change:42.0", "input:41.0", "change:41.0", "input:40.0", "change:40.0", "input:50.0", "change:50.0", "input:40.0", "change:40.0", "input:100.0", "change:100.0", "input:0.0", "change:0.0"),
            events,
        )
    }

    @Test
    @KeyboardNavigation
    fun `SLD-3 SLD-21 in a right-to-left horizontal slider Right decreases and Left increases - a vertical slider is not mirrored`() {
        show(direction = LayoutDirection.Rtl)
        handle().requestFocus().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        handle().performKeyInput { pressKey(Key.DirectionLeft) }
        rule.waitForIdle()
        assertEquals(listOf("input:39.0", "change:39.0", "input:40.0", "change:40.0"), events)
    }

    @Test
    @KeyboardNavigation
    fun `SLD-3 SLD-21 a vertical slider in right-to-left keeps Right and Up as increase`() {
        show(orientation = Orientation.Vertical, direction = LayoutDirection.Rtl)
        handle().requestFocus().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        handle().performKeyInput { pressKey(Key.DirectionUp) }
        rule.waitForIdle()
        assertEquals(listOf("input:41.0", "change:41.0", "input:42.0", "change:42.0"), events)
    }

    // ── SLD-4: assistive technology ──────────────────────────────────────────

    @Test
    fun `SLD-4 assistive technology sets a value clamped and snapped, input then change, and its increment is one keyboard step`() {
        show(step = 5f)
        handle().performSemanticsAction(SemanticsActions.SetProgress) { it(61f) }
        rule.waitForIdle()
        assertEquals(listOf("input:60.0", "change:60.0"), events)
        val info = handle().rangeInfo()
        assertEquals("Android increments by range / (steps + 1): one step of 5", 100f / (info.steps + 1), 5f, 0.001f)
    }

    @Test
    fun `SLD-4 a continuous slider's increment is a hundredth of its range`() {
        show()
        val info = handle().rangeInfo()
        assertEquals(1f, 100f / (info.steps + 1), 0.001f)
    }

    // ── SLD-5: a range ───────────────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `SLD-5 a range's handles are two Tab stops, the start first, each its own slider bounded by the other, and they meet but never cross`() {
        span = 20f..60f
        show(ranged = true, label = "Maximum price")
        rule.onNodeWithTag(BEFORE).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        handle("Minimum price").assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        handle("Maximum price").assertIsFocused()
        assertEquals(0f..60f, handle("Minimum price").rangeInfo().range)
        assertEquals(20f..100f, handle("Maximum price").rangeInfo().range)
        span = 59f..60f
        rule.waitForIdle()
        handle("Minimum price").requestFocus().performKeyInput { pressKey(Key.PageUp) }
        rule.waitForIdle()
        handle("Minimum price").performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        assertEquals("stops at the end handle, then nothing", listOf("input:60.0..60.0", "change:60.0..60.0"), events)
        assertTrue("the start handle drawn at the end handle", abs((handleAlong("Minimum price") - handleAlong("Maximum price")).value) < 0.6f)
    }

    // ── SLD-6: the active track ──────────────────────────────────────────────

    @Test
    fun `SLD-6 the active track runs from min to the value, or from the origin toward either side, or between a range's handles`() {
        value = 40f
        show()
        val map = stage()
        assertPixel("active before the value", sliderPixel(alongFor(20f), mid, map), look.enabled.activeTrackColor.resolve(colors))
        assertPixel("the track after it", sliderPixel(alongFor(70f), mid, map), look.enabled.trackColor.resolve(colors))
    }

    @Test
    fun `SLD-6 a centred slider's active track runs from the origin to the value on whichever side it lies`() {
        value = -30f
        show(valueRange = -50f..50f, origin = 0f)
        val map = stage()
        // -50…50 over the default geometry: v in the fixture's terms is (v + 50) of 100.
        assertPixel("active between the value and the origin", sliderPixel(alongFor(35f), mid, map), look.enabled.activeTrackColor.resolve(colors))
        assertPixel("the track past the origin", sliderPixel(alongFor(65f), mid, map), look.enabled.trackColor.resolve(colors))
        assertPixel("the track before the value", sliderPixel(alongFor(8f), mid, map), look.enabled.trackColor.resolve(colors))
    }

    @Test
    fun `SLD-6 a range's active track runs between its handles`() {
        span = 20f..60f
        show(ranged = true, label = "Maximum price")
        val map = stage()
        assertPixel("between", sliderPixel(alongFor(40f), mid, map), look.enabled.activeTrackColor.resolve(colors))
        assertPixel("before", sliderPixel(alongFor(10f), mid, map), look.enabled.trackColor.resolve(colors))
        assertPixel("after", sliderPixel(alongFor(80f), mid, map), look.enabled.trackColor.resolve(colors))
    }

    // ── SLD-7 / SLD-8: geometry and parts ────────────────────────────────────

    @Test
    fun `SLD-7 as long as its layout, the touch target across, the handle travelling half the track's thickness in from the track's ends`() {
        value = 0f
        show()
        val s = sliderBounds()
        assertDp("length", LENGTH, s.right - s.left)
        assertDp("the hit area across: the target", tanrei.measure.targetTouch, s.bottom - s.top)
        assertDp("min", travelInset, handleAlong())
        value = 100f
        rule.waitForIdle()
        assertDp("max", LENGTH - travelInset, handleAlong())
        assertPixel("the active track takes the track's rounded start", sliderPixel(tokens.containerSize / 2 + 1.dp, mid), look.enabled.activeTrackColor.resolve(colors))
        assertPixel("nothing before it", sliderPixel(tokens.containerSize / 2 - 1.dp, mid), surface)
    }

    @Test
    fun `SLD-7 the container size and track thickness drive the geometry`() {
        value = 0f
        val system = tanrei.copy(slider = tokens.copy(containerSize = 40.dp, sizes = tokens.sizes.copy(small = small.copy(trackThickness = 10.dp))))
        show(system)
        assertDp("min", 20.dp + 5.dp, handleAlong())
        assertPixel("a 10 thick track", sliderPixel(alongFor(60f, inset = 25.dp), mid - 4.dp), look.enabled.trackColor.resolve(colors))
    }

    @Test
    fun `SLD-8 the tracks, the handle and its size come from the state's tokens, and the track gap leaves empty track either side`() {
        value = 50f
        val system = tanrei.withLook(TanreiInteractionState.Enabled) { it.copy(handleWidth = 36.dp, handleColor = TanreiPaint.Role(TanreiColorRole.Error)) }
            .let { it.copy(slider = it.slider.copy(trackGap = 6.dp, handleShape = 2.dp)) }
        show(system)
        val c = handleAlong()
        val map = stage()
        assertPixel("the handle, 36 along", sliderPixel(c + 16.dp, mid, map), colors[TanreiColorRole.Error])
        assertPixel("the handle, 20 across", sliderPixel(c, mid - 9.dp, map), colors[TanreiColorRole.Error])
        assertPixel("the gap after the handle", sliderPixel(c + 18.dp + 3.dp, mid, map), surface)
        assertPixel("the track after the gap", sliderPixel(c + 18.dp + 8.dp, mid, map), look.enabled.trackColor.resolve(colors))
        assertPixel("the gap before it", sliderPixel(c - 18.dp - 3.dp, mid, map), surface)
    }

    @Test
    fun `SLD-8 the handle's height is the size's`() {
        val system = tanrei.copy(slider = tokens.copy(sizes = tokens.sizes.copy(large = tokens.sizes.large.copy(handleHeight = 30.dp))))
        show(system, size = TanreiSliderSize.Large)
        assertPixel("14 above the midline", sliderPixel(handleAlong(), mid - 14.dp), look.enabled.handleColor.resolve(colors))
    }

    // ── SLD-9: stop dots ─────────────────────────────────────────────────────

    @Test
    fun `SLD-9 a dot at an end of the travel on the track, at every step with stops, in the color of the part it lies on, none under a handle`() {
        value = 30f
        show(step = 10f, showStops = true)
        val map = stage()
        assertPixel("on the track", sliderPixel(alongFor(70f), mid, map), look.enabled.stopIndicatorColor.resolve(colors))
        assertPixel("on the active track", sliderPixel(alongFor(10f), mid, map), look.enabled.activeStopIndicatorColor.resolve(colors))
        assertPixel("under the handle: the handle", sliderPixel(alongFor(30f), mid, map), look.enabled.handleColor.resolve(colors))
        assertPixel("between dots: the track", sliderPixel(alongFor(75f), mid, map), look.enabled.trackColor.resolve(colors))
    }

    @Test
    fun `SLD-9 without stops only the end of the travel on the track has a dot, and a size of 0 draws none`() {
        value = 40f
        show()
        assertPixel("the end dot", sliderPixel(alongFor(100f), mid), look.enabled.stopIndicatorColor.resolve(colors))
        assertPixel("no dot at a step", sliderPixel(alongFor(70f), mid), look.enabled.trackColor.resolve(colors))
    }

    @Test
    fun `SLD-9 a stop-indicator size of 0 draws no dot`() {
        value = 40f
        show(tanrei.copy(slider = tokens.copy(stopIndicatorSize = 0.dp)))
        assertPixel("no end dot", sliderPixel(alongFor(100f), mid), look.enabled.trackColor.resolve(colors))
    }

    // ── SLD-10 / SLD-11 / SLD-12 / SLD-13 / SLD-14: states ───────────────────

    @Test
    @KeyboardNavigation
    fun `SLD-10 SLD-12 keyboard focus draws the round state layer around the handle and the focus ring around the handle, at once`() {
        show()
        handle().requestFocus()
        rule.waitForIdle()
        val c = handleAlong()
        val map = stage()
        val layer = look.focused.containerColor.resolve(colors).compositeOver(surface)
        assertPixel("the state layer, outside the handle across the axis", sliderPixel(c, mid - LAYER, map), layer)
        val ring = tanrei.measure.let { it.focusOffset + it.focusInnerWidth + it.focusOuterWidth / 2 }
        assertPixel("the focus ring", sliderPixel(c, mid - small.handleHeight / 2 - ring, map), colors[TanreiColorRole.FocusRing])
    }

    @Test
    fun `SLD-10 SLD-12 focus gained by touch draws no focused state and no ring, and a container size of 0 draws no state layer`() {
        show()
        handle().requestFocus()
        rule.waitForIdle()
        val c = handleAlong()
        assertPixel("no state layer", sliderPixel(c, mid - LAYER), surface)
        assertPixel("no ring", sliderPixel(c, mid - small.handleHeight / 2 - 3.dp), surface)
    }

    @Test
    fun `SLD-10 a container size of 0 draws no state layer`() {
        val system = TanreiSystem.Acme.answering(TanreiPressedFeedback.Overlay).let { it.copy(slider = it.slider.copy(containerSize = 0.dp)) }
        show(system)
        val c = handleAlong()
        rule.onNodeWithTag(SLIDER).performMouseInput { moveTo(Offset(px(c), px(mid))) }
        rule.waitForIdle()
        assertPixel("nothing around the handle", sliderPixel(c, mid - LAYER), system.colors.light[TanreiColorRole.Surface])
    }

    @Test
    @KeyboardNavigation
    fun `SLD-11 under acme hovered, focused and pressed each draw their own container token, pressed over focused over hovered`() {
        // Acme's focus is a glow that reaches over the state layer; its ring is drawn clear of it.
        val acme = TanreiSystem.Acme.answering(TanreiPressedFeedback.Overlay).let { it.copy(behavior = it.behavior.copy(focusStyle = TanreiFocusStyle.Ring)) }
        val acmeColors = acme.colors.light
        val acmeLook = acme.slider.conditions.standard
        val acmeSurface = acmeColors[TanreiColorRole.Surface]
        show(acme)
        val c = handleAlong()
        fun layer() = sliderPixel(c, mid - LAYER)
        rule.onNodeWithTag(SLIDER).performMouseInput { moveTo(Offset(px(c + 40.dp), px(mid))) }
        rule.waitForIdle()
        assertPixel("hovered: the handle a press would move", layer(), acmeLook.hovered.containerColor.resolve(acmeColors).compositeOver(acmeSurface))
        handle().requestFocus()
        rule.waitForIdle()
        assertPixel("focused over hovered", layer(), acmeLook.focused.containerColor.resolve(acmeColors).compositeOver(acmeSurface))
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag(SLIDER).performMouseInput { moveTo(Offset(px(c), px(mid))); press() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("pressed over focused", layer(), acmeLook.pressed.containerColor.resolve(acmeColors).compositeOver(acmeSurface))
        rule.onNodeWithTag(SLIDER).performMouseInput { release() }
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
    }

    @Test
    fun `SLD-11 a change of state moves the colors over the state duration and easing`() {
        val slow = 400
        val system = tanrei.withLook(TanreiInteractionState.Hovered) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Success)) }
            .let { it.copy(slider = it.slider.copy(motionStateDuration = slow, motionStateEasing = tanrei.motion.easing.linear)) }
        show(system)
        val c = handleAlong()
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag(SLIDER).performMouseInput { moveTo(Offset(px(c), px(mid))) }
        rule.mainClock.advanceTimeBy(slow / 2L)
        val half = sliderPixel(c, mid - LAYER)
        assertTrue("on its way: $half", !isClose(half, surface) && !isClose(half, colors[TanreiColorRole.Success]))
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertPixel("arrived", sliderPixel(c, mid - LAYER), colors[TanreiColorRole.Success])
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `SLD-11 the tracks and opacity come from the highest state of any handle`() {
        val system = tanrei.withLook(TanreiInteractionState.Hovered) { it.copy(trackColor = TanreiPaint.Role(TanreiColorRole.Warning)) }
        span = 20f..60f
        show(system, ranged = true, label = "Maximum price")
        rule.onNodeWithTag(SLIDER).performMouseInput { moveTo(Offset(px(alongFor(20f)), px(mid))) }
        rule.waitForIdle()
        assertPixel("the whole track, hovered by the start handle", sliderPixel(alongFor(90f), mid), colors[TanreiColorRole.Warning])
    }

    @Test
    fun `SLD-13 a press shows the pressed state at once and keeps it for press-hold`() {
        val acme = TanreiSystem.Acme.answering(TanreiPressedFeedback.Overlay)
        val acmeColors = acme.colors.light
        val pressedLayer = acme.slider.conditions.standard.pressed.containerColor.resolve(acmeColors).compositeOver(acmeColors[TanreiColorRole.Surface])
        show(acme)
        val c = handleAlong()
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag(SLIDER).performTouchInput { down(Offset(px(c), px(mid))) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("pressed on the next frame", sliderPixel(c, mid - LAYER), pressedLayer)
        rule.onNodeWithTag(SLIDER).performTouchInput { up() }
        rule.mainClock.advanceTimeByFrame()
        assertPixel("still pressed within press-hold", sliderPixel(c, mid - LAYER), pressedLayer)
        rule.mainClock.advanceTimeBy(acme.motion.duration.pressHold + acme.slider.motionStateDuration + 100L)
        assertFalse("no longer pressed", isClose(sliderPixel(c, mid - LAYER), pressedLayer))
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `SLD-14 ripple grows the pressed state layer from the handle's centre`() {
        val system = TanreiSystem.Acme.answering(TanreiPressedFeedback.Ripple).let { it.copy(slider = it.slider.copy(motionFeedbackDuration = 400, motionStateEasing = tanrei.motion.easing.linear)) }
        val sysColors = system.colors.light
        val pressedLayer = system.slider.conditions.standard.pressed.containerColor.resolve(sysColors).compositeOver(sysColors[TanreiColorRole.Surface])
        show(system)
        val c = handleAlong()
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag(SLIDER).performTouchInput { down(Offset(px(c + 12.dp), px(mid))) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertFalse("not yet at the container's edge", isClose(sliderPixel(c, mid - 15.dp), pressedLayer))
        rule.mainClock.advanceTimeBy(500L)
        assertPixel("grown over the container", sliderPixel(c, mid - 15.dp), pressedLayer)
        rule.onNodeWithTag(SLIDER).performTouchInput { up() }
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
    }

    @Test
    fun `SLD-14 dim - cupertino's answer - applies the pressed opacity to the whole slider and draws no state layer`() {
        assertEquals("cupertino pins its pressed opacity to 1: a drag does not dim the slider", 1f, TanreiSystem.Cupertino.slider.opacity(TanreiInteractionState.Pressed))
        val system = tanrei.answering(TanreiPressedFeedback.Dim)
            .withLook(TanreiInteractionState.Pressed) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
            .let { it.copy(slider = it.slider.copy(pressed = it.slider.pressed.copy(opacity = 0.5f))) }
        show(system)
        val c = handleAlong()
        val track = sliderPixel(alongFor(90f), mid)
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag(SLIDER).performTouchInput { down(Offset(px(c), px(mid))) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        val map = stage()
        assertPixel("no state layer", sliderPixel(c, mid - LAYER, map), surface)
        assertPixel("the whole slider at the pressed opacity", sliderPixel(alongFor(90f), mid, map), track.copy(alpha = 0.5f).compositeOver(surface))
        rule.onNodeWithTag(SLIDER).performTouchInput { up() }
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
    }

    @Test
    fun `SLD-14 none - every part stays with the state under the press`() {
        val system = TanreiSystem.Acme.answering(TanreiPressedFeedback.None)
        show(system)
        val c = handleAlong()
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag(SLIDER).performTouchInput { down(Offset(px(c), px(mid))) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("no answer", sliderPixel(c, mid - LAYER), system.colors.light[TanreiColorRole.Surface])
        rule.onNodeWithTag(SLIDER).performTouchInput { up() }
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
    }

    // ── SLD-15: corners and focus style ──────────────────────────────────────

    @Test
    fun `SLD-15 the handle's corners ease by corner smoothing`() {
        val square = tanrei.copy(slider = tokens.copy(handleShape = 6.dp))
        rule.setContent {
            Column {
                for ((tag, smoothing) in listOf("quarter" to 0f, "smoothed" to 0.6f)) {
                    TanreiTheme(system = square.copy(shape = square.shape.copy(cornerSmoothing = smoothing)), theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                        Box(Modifier.width(LENGTH).background(TanreiColorRole.Surface.color)) {
                            TanreiSlider(value = 50f, onValueChange = {}, contentDescription = tag, modifier = Modifier.testTag(tag))
                        }
                    }
                }
            }
        }
        rule.waitForIdle()
        val quarter = rule.onNodeWithTag("quarter").captureToImage().toPixelMap()
        val smoothed = rule.onNodeWithTag("smoothed").captureToImage().toPixelMap()
        val differing = (0 until quarter.height).sumOf { y -> (0 until quarter.width).count { x -> !isClose(quarter[x, y], smoothed[x, y]) } }
        assertTrue("the smoothed corners differ from quarter circles ($differing pixels)", differing > 0)
    }

    @Test
    @KeyboardNavigation
    fun `SLD-15 glow draws the focus as a halo, not a ring`() {
        val glow = tanrei.copy(behavior = tanrei.behavior.copy(focusStyle = TanreiFocusStyle.Glow))
        show(glow)
        handle().requestFocus()
        rule.waitForIdle()
        val c = handleAlong()
        val ring = tanrei.measure.let { it.focusOffset + it.focusInnerWidth + it.focusOuterWidth / 2 }
        val at = sliderPixel(c, mid - small.handleHeight / 2 - ring)
        assertFalse("not the hard ring: $at", isClose(at, colors[TanreiColorRole.FocusRing]))
        assertFalse("but something: $at", isClose(at, look.focused.containerColor.resolve(colors).compositeOver(surface)))
    }

    // ── SLD-16: value motion ─────────────────────────────────────────────────

    @Test
    fun `SLD-16 a value the product sets moves the handle over the value motion and emits nothing`() {
        val system = tanrei.copy(slider = tokens.copy(motionValueDuration = 400, motionValueEasing = tanrei.motion.easing.linear))
        value = 0f
        show(system)
        rule.mainClock.autoAdvance = false
        value = 100f
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeBy(200L)
        val half = handleAlong()
        assertTrue("on its way: $half", half > alongFor(20f) && half < alongFor(80f))
        rule.mainClock.advanceTimeBy(400L)
        assertDp("arrived", alongFor(100f), handleAlong())
        rule.mainClock.autoAdvance = true
        assertEquals(emptyList<String>(), events)
    }

    @Test
    fun `SLD-16 a dragged handle follows the press without delay`() {
        val system = tanrei.copy(slider = tokens.copy(motionValueDuration = 2000))
        show(system, step = 1f)
        rule.onNodeWithTag(SLIDER).performTouchInput {
            down(Offset(px(alongFor(40f)), px(mid)))
            moveTo(Offset(px(alongFor(60f)), px(mid)))
            moveTo(Offset(px(alongFor(70f)), px(mid)))
        }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertDp("at the press", alongFor(70f), handleAlong(), tolerance = 1.dp)
        rule.onNodeWithTag(SLIDER).performTouchInput { up() }
        rule.waitForIdle()
    }

    // ── SLD-17: the value indicator ──────────────────────────────────────────

    @Test
    fun `SLD-17 always shows the value in a popup above the handle that takes no focus and is hidden from assistive technology`() {
        show(valueIndicator = TanreiSliderValueIndicator.Always)
        assertEquals("a popup", 2, rule.onAllNodes(isRoot()).fetchSemanticsNodes().size)
        // What assistive technology sees: the merged tree, where the bubble's content is cleared.
        val found = rule.onAllNodes(hasText("40")).fetchSemanticsNodes()
        assertEquals("hidden from assistive technology: ${found.map { it.config }}", 0, found.size)
    }

    @Test
    @KeyboardNavigation
    fun `SLD-17 active shows the value only while the handle is pressed or has keyboard focus, and none never`() {
        show(valueIndicator = TanreiSliderValueIndicator.Active)
        assertEquals("not at rest", 1, rule.onAllNodes(isRoot()).fetchSemanticsNodes().size)
        handle().requestFocus()
        rule.waitForIdle()
        assertEquals("with keyboard focus", 2, rule.onAllNodes(isRoot()).fetchSemanticsNodes().size)
    }

    /**
     * SLD-17: the popup is presented only while it belongs in view. A popup escapes every clip: placed from a handle that
     * is scrolled out of its scroller it would float over what lies there (the web clips the bubble with its handle), and
     * placed from a handle at the window's top edge it would be a window wholly off the screen — whose screenshot, the
     * Accessibility Test Framework's, fails on the gallery ("width & height must be > 0").
     */
    @Test
    fun `SLD-17 the popup exists only while the handle is in view and there is room for it inside the window`() {
        val scroll = ScrollState(0)
        rule.setContent {
            TanreiTheme(system = tanrei, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                // A scroller at the window's top, shorter than the window; the slider starts below its visible part.
                Column(Modifier.width(STAGE_WIDTH).height(SCROLLER).verticalScroll(scroll)) {
                    Box(Modifier.size(STAGE_WIDTH, SCROLLER + 40.dp))
                    TanreiSlider(
                        value = value,
                        onValueChange = { value = it },
                        contentDescription = "Volume",
                        modifier = Modifier.width(LENGTH),
                        valueIndicator = TanreiSliderValueIndicator.Always,
                    )
                    Box(Modifier.size(STAGE_WIDTH, SCROLLER * 4))
                }
            }
        }
        rule.waitForIdle()
        fun popups() = rule.onAllNodes(isRoot()).fetchSemanticsNodes().size - 1

        assertEquals("below the scroller's visible part, though inside the window: no popup", 0, popups())

        rule.runOnIdle { scroll.dispatchRawDelta(px(140.dp)) }
        rule.waitForIdle()
        assertEquals("in view, with room above the handle: the popup", 1, popups())

        // The handle's centre on the scroller's top edge, which is the top of the composition's window: half the handle
        // shows, and the bubble would lie wholly above the window (the gallery's case, where the popup left the screen).
        val centre = handle().getUnclippedBoundsInRoot().let { (it.top + it.bottom) / 2 }
        rule.runOnIdle { scroll.dispatchRawDelta(px(centre)) }
        rule.waitForIdle()
        handle().assertExists()
        assertEquals("no room above the handle inside the window: no popup", 0, popups())

        rule.runOnIdle { scroll.dispatchRawDelta(px(SCROLLER)) }
        rule.waitForIdle()
        assertEquals("scrolled out above: no popup", 0, popups())

        rule.runOnIdle { scroll.dispatchRawDelta(-px(SCROLLER + centre)) }
        rule.waitForIdle()
        assertEquals("back in view: the popup again", 1, popups())
    }

    @Test
    fun `SLD-17 the indicator sits value-indicator offset above the handle, on its container, centred on it`() {
        show(valueIndicator = TanreiSliderValueIndicator.Always, inPlace = true)
        val c = handleAlong()
        val bottom = mid - small.handleHeight / 2 - tokens.valueIndicatorOffset
        val container = tokens.valueIndicatorContainerColor.resolve(colors)
        val map = stage()
        assertPixel("its container, just above its bottom", sliderPixel(c - 12.dp, bottom - 1.dp, map), container)
        assertPixel("the offset below it is clear", sliderPixel(c - 12.dp, bottom + tokens.valueIndicatorOffset / 2, map), surface)
        assertPixel("its container height", sliderPixel(c - 12.dp, bottom - tokens.valueIndicatorContainerHeight + 1.dp, map), container)
        assertPixel("nothing above it", sliderPixel(c - 12.dp, bottom - tokens.valueIndicatorContainerHeight - 2.dp, map), surface)
    }

    // ── SLD-18 / SLD-19: value text and semantics ────────────────────────────

    @Test
    fun `SLD-18 the value text is valueText, or the number with as many fraction digits as the keyboard step, at most two`() {
        value = 40.5f
        show(step = 0.5f)
        assertEquals("40.5", handle().fetchSemanticsNode().config[SemanticsProperties.StateDescription])
    }

    @Test
    fun `SLD-18 a continuous slider over 0 to 1 shows two fraction digits, and valueText replaces the number`() {
        value = 0.4f
        show(valueRange = 0f..1f, stateDescription = "40 %")
        assertEquals("40 %", handle().fetchSemanticsNode().config[SemanticsProperties.StateDescription])
    }

    @Test
    fun `SLD-18 a continuous slider over 0 to 1 formats its value with two digits`() {
        value = 0.4f
        show(valueRange = 0f..1f)
        assertEquals("0.40", handle().fetchSemanticsNode().config[SemanticsProperties.StateDescription])
    }

    @Test
    fun `SLD-19 each handle is a slider named by its label with its value, value text and range - the rest is hidden`() {
        span = 20f..60f
        show(ranged = true, label = "Maximum price", startStateDescription = "$20")
        val start = handle("Minimum price").fetchSemanticsNode().config
        assertEquals("$20", start[SemanticsProperties.StateDescription])
        assertEquals(20f, start[SemanticsProperties.ProgressBarRangeInfo].current)
        assertEquals(60f, handle("Maximum price").rangeInfo().current)
        assertEquals("only the handles carry a value", 2, rule.onAllNodes(SemanticsMatcher.keyIsDefined(SemanticsProperties.ProgressBarRangeInfo), useUnmergedTree = true).fetchSemanticsNodes().size)
        assertTrue("setProgress", start.contains(SemanticsActions.SetProgress))
    }

    @Test
    fun `SLD-19 an empty label still renders, and a debuggable app reports that a handle has no accessible name`() = collectingReports { reports ->
        setDebuggable(true)
        span = 20f..60f
        show(ranged = true, label = "Maximum price", startLabel = "")
        assertEquals(2, rule.onAllNodes(SemanticsMatcher.keyIsDefined(SemanticsProperties.ProgressBarRangeInfo)).fetchSemanticsNodes().size)
        assertTrue("reported: $reports", reports.any { "startContentDescription" in it })
    }

    // ── SLD-20: disabled ─────────────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `SLD-20 disabled - no input, no focus, no value indicator, announced disabled, drawn from the disabled tokens`() {
        show(enabled = false, valueIndicator = TanreiSliderValueIndicator.Always)
        handle().assertIsNotEnabled()
        rule.onNodeWithTag(SLIDER).performMouseInput { moveTo(Offset(px(alongFor(80f)), px(mid))); press(); release() }
        rule.waitForIdle()
        rule.onNodeWithTag(BEFORE).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(AFTER).assertIsFocused()
        assertEquals(emptyList<String>(), events)
        assertEquals("no value indicator", 1, rule.onAllNodes(isRoot()).fetchSemanticsNodes().size)
        val map = stage()
        assertPixel("the disabled handle", sliderPixel(handleAlong(), mid, map), look.disabled.handleColor.resolve(colors).compositeOver(surface))
        assertPixel("the disabled track", sliderPixel(alongFor(80f), mid, map), look.disabled.trackColor.resolve(colors).compositeOver(surface))
        assertPixel("the disabled active track", sliderPixel(alongFor(15f), mid, map), look.disabled.activeTrackColor.resolve(colors).compositeOver(surface))
    }

    // ── SLD-21: orientation and direction ────────────────────────────────────

    @Test
    fun `SLD-21 a vertical slider runs from the bottom (min) to the top, as tall as its layout, the target wide`() {
        value = 25f
        show(orientation = Orientation.Vertical)
        val s = sliderBounds()
        assertDp("height", LENGTH_VERTICAL, s.bottom - s.top)
        assertDp("width", tanrei.measure.targetTouch, s.right - s.left)
        assertDp("from the bottom", alongFor(25f, length = LENGTH_VERTICAL), handleAlong(vertical = true))
    }

    @Test
    fun `SLD-21 a right-to-left horizontal slider runs from the right, its active track mirrored`() {
        value = 25f
        show(direction = LayoutDirection.Rtl)
        assertDp("from the right", alongFor(25f), handleAlong(rtl = true))
        assertPixel("active at the right", sliderPixel(LENGTH - alongFor(10f), mid), look.enabled.activeTrackColor.resolve(colors))
    }

    // ── SLD-22 / SLD-23: invalid and unknown values ──────────────────────────

    @Test
    fun `SLD-22 a value off the range or off a step is drawn clamped and snapped without emitting, and reported`() = collectingReports { reports ->
        setDebuggable(true)
        value = 150f
        show()
        assertEquals(100f, handle().rangeInfo().current)
        assertTrue("reported: $reports", reports.any { "value 150.0" in it })
        assertEquals(emptyList<String>(), events)
    }

    @Test
    fun `SLD-22 a start above the end draws both handles at the end, and is reported`() = collectingReports { reports ->
        setDebuggable(true)
        span = 70f..30f
        show(ranged = true, label = "Maximum price")
        assertEquals(30f, handle("Minimum price").rangeInfo().current)
        assertTrue("reported: $reports", reports.any { "startValue" in it })
    }

    @Test
    fun `SLD-22 a range without an end above its start draws the handle at the track's start and takes no input - a negative step is continuous`() = collectingReports { reports ->
        setDebuggable(true)
        show(valueRange = 50f..50f, step = -2f)
        assertDp("at the track's start", travelInset, handleAlong())
        rule.onNodeWithTag(SLIDER).performMouseInput { moveTo(Offset(px(alongFor(80f)), px(mid))); press(); release() }
        rule.waitForIdle()
        assertEquals(emptyList<String>(), events)
        assertTrue("reported: $reports", reports.any { "valueRange" in it } && reports.any { "step" in it })
    }

    @Test
    fun `SLD-22 an origin outside the range is clamped and reported`() = collectingReports { reports ->
        setDebuggable(true)
        value = 60f
        show(origin = 200f)
        assertPixel("active from the value to max", sliderPixel(alongFor(80f), mid), look.enabled.activeTrackColor.resolve(colors))
        assertTrue("reported: $reports", reports.any { "origin" in it })
    }

    @Test
    fun `SLD-23 a size the design system does not have draws small's tokens, and a debuggable app reports it`() = collectingReports { reports ->
        setDebuggable(true)
        show(size = TanreiSliderSize("huge"))
        assertPixel("small's track, 4 thick: 3 above the midline is clear", sliderPixel(alongFor(80f), mid - 3.dp), surface)
        assertTrue("reported: $reports", reports.any { "huge" in it })
    }

    @Test
    fun `SLD-23 orientation and valueIndicator are closed enums - no value outside the spec can be passed`() {
        assertEquals(setOf("horizontal", "vertical"), Orientation.entries.map { it.name.lowercase() }.toSet())
        assertEquals(listOf("none", "active", "always"), TanreiSliderValueIndicator.entries.map { it.name.lowercase() })
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
        const val SLIDER = "slider"
        const val BEFORE = "before"
        const val AFTER = "after"
        const val PIXEL_TOLERANCE = 3f / 255f

        /** Across the axis from the midline: inside the round state layer (16), outside the handle (10) and its focus ring (14). */
        val LAYER = 15.dp
        val STAGE_WIDTH = 400.dp
        /** A scroller shorter than the test window (640dp high). */
        val SCROLLER = 200.dp
        val LENGTH = 320.dp
        val LENGTH_VERTICAL = 240.dp
    }
}

/** SLD-11, SLD-16, SLD-17 where motion is reduced (the animator duration scale is 0, see `TanreiButtonReducedMotionTest`). */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w480dp-h640dp-xhdpi")
class TanreiSliderReducedMotionTest {
    private object NoMotion : MotionDurationScale {
        override val scaleFactor: Float = 0f
    }

    @get:Rule
    val rule = createComposeRule(effectContext = NoMotion)

    private var value by mutableStateOf(0f)

    @Test
    fun `SLD-16 SLD-11 where motion is reduced a value set by the product and a change of state are shown at once`() {
        val tanrei = TanreiSystem.Tanrei
        val slow = tanrei.slider.copy(motionValueDuration = 2000, motionStateDuration = 2000)
        rule.setContent {
            TanreiTheme(system = tanrei.copy(slider = slow), theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Box(Modifier.width(320.dp)) {
                    TanreiSlider(value = value, onValueChange = { value = it }, contentDescription = "Volume", modifier = Modifier.testTag("slider"))
                }
            }
        }
        rule.waitForIdle()
        rule.mainClock.autoAdvance = false
        value = 100f
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        repeat(3) { rule.mainClock.advanceTimeByFrame() }
        val handle = rule.onNodeWithContentDescription("Volume").getUnclippedBoundsInRoot()
        val slider = rule.onNodeWithTag("slider").getUnclippedBoundsInRoot()
        val inset = tanrei.slider.containerSize / 2 + tanrei.slider.sizes.small.trackThickness / 2
        assertTrue("at max at once: ${(handle.left + handle.right) / 2 - slider.left}", abs(((handle.left + handle.right) / 2 - slider.left - (320.dp - inset)).value) < 0.6f)
        rule.mainClock.autoAdvance = true
        assertNotEquals(0f, value)
    }
}
