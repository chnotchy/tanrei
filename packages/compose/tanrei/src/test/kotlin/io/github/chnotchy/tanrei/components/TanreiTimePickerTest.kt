package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import android.provider.Settings
import android.view.KeyEvent
import android.view.View
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
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
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.semantics.getOrNull
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsNotFocused
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.cancel
import androidx.compose.ui.test.click
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.hasClickAction
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.isDialog
import androidx.compose.ui.test.isSelectable
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performImeAction
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performMouseInput
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.test.performTextClearance
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.test.withKeyDown
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.DpOffset
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.acme.design.Acme
import io.github.chnotchy.tanrei.primitives.LocalTanreiGlyphStandIn
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.primitives.TanreiModalDialogs
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.Cupertino
import io.github.chnotchy.tanrei.tokens.M3Like
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiFocusStyle
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiPressedFeedback
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import io.github.chnotchy.tanrei.tokens.TanreiTimePickerCondition
import io.github.chnotchy.tanrei.tokens.TanreiTimePickerConditionStateTokens
import java.util.Locale
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.sin
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TestRule
import org.junit.runner.RunWith
import org.junit.runners.model.Statement
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Behaviour tests for `specs/time-picker.spec.json`. Each test names the behaviour id (`TMP-n`) it covers. Runs on the
 * JVM (Robolectric, native graphics) — no emulator needed.
 *
 * The overlay (TMP-1 … TMP-4, TMP-25) is tested on `TanreiTimePicker` opened from an opener button between two focusable
 * boxes, in its Dialog window; everything the surface draws or does on the in-place harness `TanreiTimePickerContent`
 * (what the baselines draw), whose events are recorded as `change:<HH:MM>` and `close:<reason>`. Every picker is in en-US
 * unless a test says otherwise.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w720dp-h720dp-xhdpi")
class TanreiTimePickerTest {
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
    private val tokens = tanrei.timePicker
    private val measure = tanrei.measure
    private val surfaceColor = tokens.containerColor.resolve(colors)

    private val events = mutableListOf<String>()
    private val glyphs = mutableListOf<String>()
    private var visible by mutableStateOf(false)
    private var value by mutableStateOf<TanreiTime?>(null)
    private var hostView: View? = null
    private var overlayView: View? = null

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
            hostView = LocalView.current
            key(current) {
                val density = LocalDensity.current
                CompositionLocalProvider(
                    LocalLayoutDirection provides current.direction,
                    LocalDensity provides Density(density.density, current.fontScale),
                    // The glyphs the picker draws by name: the test stand-ins, recorded.
                    LocalTanreiGlyphStandIn provides { name ->
                        glyphs += name
                        overlayView = LocalView.current
                        TimePickerFixtureGlyph(name)
                    },
                ) {
                    TanreiTheme(system = current.system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                        Box(Modifier.testTag(STAGE_TAG).background(TanreiColorRole.Surface.color)) { current.content() }
                    }
                }
            }
        }
        rule.waitForIdle()
    }

    /** The in-place picker ([TanreiTimePickerContent]) of [props] on a [stage] (480 × 640). */
    private fun inPlace(
        props: TimePickerProps = picker(),
        system: TanreiSystem = tanrei,
        direction: LayoutDirection = LayoutDirection.Ltr,
        fontScale: Float = 1f,
        stage: DpSize = DpSize(480.dp, 640.dp),
    ) = show(system, direction, fontScale) {
        Box(Modifier.size(stage)) {
            TanreiTimePickerContent(
                modifier = Modifier.testTag(SURFACE),
                props = props,
                onClose = { events += "close:$it" },
                onChange = { events += "change:$it" },
            )
        }
    }

    /** An opener button between two focusable boxes, and the picker of [props] it opens; the value is this test's. */
    private fun showPicker(props: TimePickerProps = picker(), system: TanreiSystem = tanrei) = show(system) {
        Box(Modifier.fillMaxSize()) {
            Column(Modifier.padding(16.dp)) {
                Box(Modifier.testTag(BEFORE).size(8.dp).focusable())
                TanreiButton(text = "Pick", onClick = { visible = true }, modifier = Modifier.testTag(OPENER))
                TanreiTimePicker(
                    visible = visible,
                    onClose = { reason ->
                        events += "close:$reason"
                        visible = false
                    },
                    modifier = Modifier.testTag(SURFACE),
                    value = value,
                    onChange = { time ->
                        events += "change:$time"
                        value = time
                    },
                    hourCycle = props.hourCycle,
                    entryMode = props.entryMode,
                    unit = props.unit,
                    layout = props.layout,
                    locale = props.locale,
                    labels = props.labels,
                )
                Box(Modifier.testTag(AFTER).size(8.dp).focusable())
            }
        }
    }

    private fun picker(
        value: TanreiTime? = T0730,
        hourCycle: TanreiTimePickerHourCycle = TanreiTimePickerHourCycle.H12,
        entryMode: TanreiTimePickerEntryMode = TanreiTimePickerEntryMode.Dial,
        unit: TanreiTimePickerUnit = TanreiTimePickerUnit.Hour,
        layout: TanreiTimePickerLayout = TanreiTimePickerLayout.Auto,
        locale: Locale? = Locale.US,
        labels: TanreiTimePickerLabels = TanreiTimePickerLabels(),
    ) = TimePickerProps(value, hourCycle, entryMode, unit, layout, locale, labels)

    // ── finders ──────────────────────────────────────────────────────────────

    private fun selector(name: String) = rule.onNode(hasContentDescription(name) and SemanticsMatcher.keyIsDefined(SemanticsProperties.ProgressBarRangeInfo))

    private fun hour() = selector("Hour")

    private fun minute() = selector("Minute")

    private fun period(name: String) = rule.onNode(hasText(name) and isSelectable())

    private fun ok() = rule.onNode(hasText("OK") and hasClickAction())

    private fun cancel() = rule.onNode(hasText("Cancel") and hasClickAction())

    private fun field(label: String) = rule.onNode(hasContentDescription(label) and hasSetTextAction())

    private fun toggle(name: String) = rule.onNodeWithContentDescription(name)

    private fun surface() = rule.onNodeWithTag(SURFACE)

    private fun dialogs() = rule.onAllNodes(isDialog()).fetchSemanticsNodes().size

    private fun valueOf(node: SemanticsNodeInteraction): String? = node.fetchSemanticsNode().config.getOrNull(SemanticsProperties.StateDescription)

    private fun openFromKeyboard() {
        rule.onNodeWithTag(OPENER).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
    }

    /** The dial's centre in the vertical layout: `container.gap` below the time display, centred in the surface. */
    private fun dialCenter(): DpOffset {
        val display = hour().getUnclippedBoundsInRoot()
        val box = surface().getUnclippedBoundsInRoot()
        return DpOffset((box.left + box.right) / 2, display.bottom + tokens.containerGap + tokens.dialContainerSize / 2)
    }

    private val outerRadius = tokens.dialContainerSize / 2 - tokens.dialPadding - tokens.dialHandleSize / 2
    private val innerRadius = outerRadius - tokens.dialHandleSize

    /** The point [radius] from the dial's centre at [degrees] clockwise from the top. */
    private fun onDial(degrees: Float, radius: Dp): DpOffset {
        val center = dialCenter()
        val radians = Math.toRadians(degrees.toDouble())
        return DpOffset(center.x + radius * sin(radians).toFloat(), center.y - radius * cos(radians).toFloat())
    }

    /** A touch on the dial at [point] (in the root), through the stage. */
    private fun touchDial(vararg degreesAndRadius: Pair<Float, Dp>) {
        val points = degreesAndRadius.map { (degrees, radius) -> onDial(degrees, radius) }
        val stage = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
        rule.onNodeWithTag(STAGE_TAG).performTouchInput {
            fun at(point: DpOffset) = Offset((point.x - stage.left).toPx(), (point.y - stage.top).toPx())
            down(at(points.first()))
            for (point in points.drop(1)) moveTo(at(point))
            up()
        }
        rule.waitForIdle()
    }

    // ── TMP-1: the modal presentation ────────────────────────────────────────

    @Test
    fun `TMP-1 the picker opens in a window of its own over the scrim, centred, hides what is behind, and counts as a modal dialog`() {
        showPicker()
        val before = hostView!!.importantForAccessibility
        rule.onNodeWithTag(OPENER).performClick()
        rule.waitForIdle()
        assertEquals(1, dialogs())
        assertEquals(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS, hostView!!.importantForAccessibility)
        assertEquals(1, TanreiModalDialogs.open)
        val image = rule.onNode(isDialog()).captureToImage().toPixelMap()
        assertEquals("the scrim, as drawn", tokens.scrimColor.resolve(colors).alpha, image[2, 2].alpha, 0.02f)
        val window = rule.onNode(isDialog()).getUnclippedBoundsInRoot()
        val box = surface().getUnclippedBoundsInRoot()
        assertEquals("centred", ((window.left + window.right) / 2).value, ((box.left + box.right) / 2).value, 1f)
        assertEquals("centred", ((window.top + window.bottom) / 2).value, ((box.top + box.bottom) / 2).value, 1f)
        visible = false
        rule.waitForIdle()
        assertEquals(0, dialogs())
        assertEquals("restored", before, hostView!!.importantForAccessibility)
        assertEquals(0, TanreiModalDialogs.open)
    }

    @Test
    fun `TMP-1 the surface is the container color at its elevation with its corners, the margin from the edges`() {
        inPlace(system = tanrei.copy(timePicker = tokens.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Warning))))
        val box = surface().getUnclippedBoundsInRoot()
        assertPixel("the container color", stagePixel(box.left + 4.dp, box.top + 40.dp), colors[TanreiColorRole.Warning])
        assertTrue("the margin from the edges", box.top >= tokens.containerMargin && box.left >= tokens.containerMargin)
        val scrim = tokens.scrimColor.resolve(colors).compositeOver(colors[TanreiColorRole.Surface])
        assertPixel("the scrim around it", stagePixel(box.left - 4.dp, box.top + 40.dp), scrim)
        assertPixel("the very corner is the scrim's: the corner is rounded", stagePixel(box.left + 0.5.dp, box.top + 0.5.dp), scrim)
    }

    @Test
    @KeyboardNavigation
    fun `TMP-1 Tab and Shift+Tab wrap inside the picker - focus never leaves`() {
        value = T0730
        showPicker()
        openFromKeyboard()
        hour().assertIsFocused()
        ok().requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        hour().assertIsFocused().performKeyInput { withKeyDown(Key.ShiftLeft) { pressKey(Key.Tab) } }
        rule.waitForIdle()
        ok().assertIsFocused()
        assertEquals("nothing closed", emptyList<String>(), events)
    }

    // ── TMP-2 / TMP-3: focus in and back ─────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `TMP-2 opening moves focus to the selector of unit, or the hour field in text entry, and shows that unit - TMP-3 closing returns it`() {
        value = T0730
        showPicker()
        openFromKeyboard()
        hour().assertIsFocused()
        cancel().requestFocus().performClick()
        rule.waitForIdle()
        rule.onNodeWithTag(OPENER).assertIsFocused()
        showPicker(picker(unit = TanreiTimePickerUnit.Minute))
        openFromKeyboard()
        minute().assertIsFocused()
        val drawn = minute().captureToImage().toPixelMap()
        val edge = with(rule.density) { drawn[1.dp.roundToPx(), drawn.height / 2] }
        assertPixel("the minute selector drawn selected", edge, fill(tokens.conditions.selected.enabled.selectorOutlineColor))
        rule.onNode(isDialog()).assertExists()
        minute().performKeyInput { pressKey(Key.Escape) }
        rule.waitForIdle()
        rule.onNodeWithTag(OPENER).assertIsFocused()
        showPicker(picker(entryMode = TanreiTimePickerEntryMode.Text))
        openFromKeyboard()
        field("Hour").assertIsFocused()
        visible = false
        rule.waitForIdle()
        rule.onNodeWithTag(OPENER).assertIsFocused()
    }

    @Test
    @KeyboardNavigation
    fun `TMP-2 focus moves when the picker opens, not when its motion ends`() {
        value = T0730
        showPicker(system = tanrei.copy(timePicker = tokens.copy(motionOpenDuration = 5000)))
        rule.onNodeWithTag(OPENER).requestFocus()
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag(OPENER).performKeyInput { pressKey(Key.Enter) }
        val opened = rule.mainClock.currentTime
        fun focused() = rule.onAllNodes(hasContentDescription("Hour") and SemanticsMatcher.keyIsDefined(SemanticsProperties.ProgressBarRangeInfo))
            .fetchSemanticsNodes().any { it.config.getOrNull(SemanticsProperties.Focused) == true }
        var frames = 0
        while (!focused() && frames < 60) {
            rule.mainClock.advanceTimeByFrame()
            frames++
        }
        hour().assertIsFocused()
        assertTrue("focused while the picker still opens: after ${rule.mainClock.currentTime - opened} ms of 5000", rule.mainClock.currentTime - opened < 2000)
        rule.mainClock.autoAdvance = true
    }

    @Test
    @KeyboardNavigation
    fun `TMP-3 closing returns focus to the opener - when the motion starts, not when it ends`() {
        value = T0730
        showPicker(system = tanrei.copy(timePicker = tokens.copy(motionCloseDuration = 5000)))
        openFromKeyboard()
        hour().assertIsFocused()
        rule.mainClock.autoAdvance = false
        hour().performKeyInput { pressKey(Key.Escape) }
        repeat(4) { rule.mainClock.advanceTimeByFrame() }
        assertEquals(listOf("close:Escape"), events)
        rule.onNodeWithTag(OPENER).assertIsFocused()
        rule.mainClock.autoAdvance = true
    }

    // ── TMP-4: close, with its reason ────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `TMP-4 Escape, back, the scrim and Cancel each emit close once with their reason and commit nothing`() {
        value = T0730
        showPicker()
        openFromKeyboard()
        hour().performKeyInput { pressKey(Key.DirectionUp) }
        rule.waitForIdle()
        hour().performKeyInput { pressKey(Key.Escape) }
        rule.waitForIdle()
        assertEquals(listOf("close:Escape"), events)
        events.clear()
        visible = true
        rule.waitForIdle()
        windowKey(KeyEvent.KEYCODE_BACK)
        assertEquals(listOf("close:Back"), events)
        events.clear()
        visible = true
        rule.waitForIdle()
        rule.onNode(isDialog()).performTouchInput { click(Offset(8f, 8f)) }
        rule.waitForIdle()
        assertEquals(listOf("close:Outside"), events)
        events.clear()
        visible = true
        rule.waitForIdle()
        cancel().performClick()
        rule.waitForIdle()
        assertEquals(listOf("close:Cancel"), events)
        assertEquals("nothing committed", T0730, value)
    }

    // ── TMP-5: the pending time ──────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `TMP-5 the pending time is shown in the selectors and committed only by OK - change then close`() {
        inPlace()
        hour().requestFocus().performKeyInput { pressKey(Key.DirectionUp) }
        rule.waitForIdle()
        assertEquals("8 AM", valueOf(hour()))
        assertEquals("nothing emitted before OK", emptyList<String>(), events)
        ok().performClick()
        rule.waitForIdle()
        assertEquals(listOf("change:08:30", "close:Confirm"), events)
    }

    @Test
    fun `TMP-5 OK with an unchanged time only closes, and an empty value starts from the device's time`() {
        value = T0730
        showPicker()
        rule.onNodeWithTag(OPENER).performClick()
        rule.waitForIdle()
        ok().performClick()
        rule.waitForIdle()
        assertEquals("the pending time equals value: no change", listOf("close:Confirm"), events)
        assertEquals(T0730, value)
        events.clear()
        val device = tanreiDeviceTime()
        inPlace(picker(value = null, hourCycle = TanreiTimePickerHourCycle.H23))
        val now = tanreiDeviceTime()
        val shown = valueOf(hour())!!.toInt()
        assertTrue("the device's hour: $shown", shown == device.hour || shown == now.hour)
        ok().performClick()
        rule.waitForIdle()
        assertTrue("an empty value: OK commits the pending time: $events", events.first().startsWith("change:") && events.last() == "close:Confirm")
    }

    @Test
    fun `TMP-5 a value set while open does not change the pending time, and OK compares with value as it is at OK`() {
        value = T0730
        showPicker()
        rule.onNodeWithTag(OPENER).performClick()
        rule.waitForIdle()
        value = TanreiTime(9, 15)
        rule.waitForIdle()
        assertEquals("the pending time is unchanged: hour", "7 AM", valueOf(hour()))
        assertEquals("the pending time is unchanged: minute", "30", valueOf(minute()))
        ok().performClick()
        rule.waitForIdle()
        assertEquals("the time the person saw is committed", listOf("change:07:30", "close:Confirm"), events)
        assertEquals(T0730, value)
    }

    @Test
    fun `TMP-5 OK is disabled while a field holds text that is not a number of its unit`() {
        inPlace(picker(entryMode = TanreiTimePickerEntryMode.Text))
        ok().assertIsEnabled()
        field("Minute").performTextClearance()
        field("Minute").performTextInput("75")
        rule.waitForIdle()
        ok().assertIsNotEnabled().performClick()
        rule.waitForIdle()
        assertEquals(emptyList<String>(), events)
        field("Minute").performTextClearance()
        field("Minute").performTextInput("45")
        rule.waitForIdle()
        ok().assertIsEnabled().performClick()
        rule.waitForIdle()
        assertEquals(listOf("change:07:45", "close:Confirm"), events)
    }

    // ── TMP-6: the clock ─────────────────────────────────────────────────────

    @Test
    fun `TMP-6 h12 runs 1 to 12 with a period, h23 00 to 23 without - locale takes the locale's clock, and the device's choice wins`() {
        assertTrue(tanreiTimePickerTwelve(TanreiTimePickerHourCycle.H12, device = false, localeTwelve = false))
        assertFalse(tanreiTimePickerTwelve(TanreiTimePickerHourCycle.H23, device = true, localeTwelve = true))
        assertTrue("the locale's", tanreiTimePickerTwelve(TanreiTimePickerHourCycle.Locale, device = null, localeTwelve = true))
        assertFalse("the device's choice wins", tanreiTimePickerTwelve(TanreiTimePickerHourCycle.Locale, device = false, localeTwelve = true))
        assertTrue("en-US counts 1 to 12", TanreiTimeText(Locale.US).localeTwelve)
        assertFalse("de-DE counts 0 to 23", TanreiTimeText(Locale.GERMANY).localeTwelve)
        assertTrue("ko-KR counts 1 to 12", TanreiTimeText(Locale.KOREA).localeTwelve)

        inPlace(picker(value = TanreiTime(19, 30), hourCycle = TanreiTimePickerHourCycle.H12))
        assertEquals("7 PM", valueOf(hour()))
        period("PM").assertIsSelected()
        inPlace(picker(value = TanreiTime(19, 30), hourCycle = TanreiTimePickerHourCycle.H23))
        assertEquals("19", valueOf(hour()))
        period("PM").assertDoesNotExist()
        inPlace(picker(value = TanreiTime(19, 30), hourCycle = TanreiTimePickerHourCycle.Locale, locale = Locale.GERMANY))
        assertEquals("the locale's 24-hour clock", "19", valueOf(hour()))

        val resolver = ApplicationProvider.getApplicationContext<Context>().contentResolver
        try {
            Settings.System.putString(resolver, Settings.System.TIME_12_24, "12")
            inPlace(picker(value = TanreiTime(19, 30), hourCycle = TanreiTimePickerHourCycle.Locale, locale = Locale.GERMANY))
            assertEquals("the device's 12-hour choice wins over de-DE's", "7 PM", valueOf(hour()))
            Settings.System.putString(resolver, Settings.System.TIME_12_24, "24")
            inPlace(picker(value = TanreiTime(19, 30), hourCycle = TanreiTimePickerHourCycle.Locale, locale = Locale.US))
            assertEquals("the device's 24-hour choice wins over en-US's", "19", valueOf(hour()))
            inPlace(picker(value = TanreiTime(19, 30), hourCycle = TanreiTimePickerHourCycle.H12, locale = Locale.US))
            assertEquals("an explicit cycle is not the device's to change", "7 PM", valueOf(hour()))
        } finally {
            Settings.System.putString(resolver, Settings.System.TIME_12_24, null)
        }
    }

    // ── TMP-7 / TMP-8: layout and room ───────────────────────────────────────

    @Test
    fun `TMP-7 vertical stacks the label, the time and the dial a gap apart, the actions a margin below, everything padded`() {
        inPlace(picker(layout = TanreiTimePickerLayout.Vertical))
        val box = surface().getUnclippedBoundsInRoot()
        val label = rule.onNodeWithText("Select time").getUnclippedBoundsInRoot()
        val display = hour().getUnclippedBoundsInRoot()
        assertEquals("padding above the label", (box.top + tokens.containerPadding).value, label.top.value, 0.6f)
        assertEquals("the label centred", ((box.left + box.right) / 2).value, ((label.left + label.right) / 2).value, 0.6f)
        assertEquals("a gap below the label", (label.bottom + tokens.containerGap).value, display.top.value, 0.6f)
        val center = dialCenter()
        val dialBottom = center.y + tokens.dialContainerSize / 2
        assertPixel("the dial's face below the time, a gap apart", stagePixel(center.x + 40.dp, center.y - 40.dp), fill(tokens.dialContainerColor))
        val okBox = ok().getUnclippedBoundsInRoot()
        assertTrue("the actions a margin below the dial: ${okBox.top} ≥ ${dialBottom + tokens.actionsMarginBlockStart}", okBox.top >= dialBottom + tokens.actionsMarginBlockStart - 0.6.dp)
        assertTrue("padding below the actions", okBox.bottom <= box.bottom - tokens.containerPadding + 0.6.dp)
    }

    @Test
    fun `TMP-7 horizontal puts the label, the time and the actions at the start and the dial at the end - auto chooses it only in a short, wide window`() {
        inPlace(picker(layout = TanreiTimePickerLayout.Horizontal), stage = DpSize(720.dp, 480.dp))
        val box = surface().getUnclippedBoundsInRoot()
        val label = rule.onNodeWithText("Select time").getUnclippedBoundsInRoot()
        val display = hour().getUnclippedBoundsInRoot()
        assertEquals("the label at the start, padded", (box.left + tokens.containerPadding).value, label.left.value, 0.6f)
        assertTrue("the time below the label", display.top >= label.bottom + tokens.containerGap - 0.6.dp)
        val okBox = ok().getUnclippedBoundsInRoot()
        assertTrue("the actions at the start column's bottom", okBox.top > display.bottom)
        val dialLeft = box.right - tokens.containerPadding - tokens.dialContainerSize
        val dialMiddle = (box.top + box.bottom) / 2
        assertPixel("the dial at the end, centred vertically", stagePixel(dialLeft + tokens.dialContainerSize / 2 - 60.dp, dialMiddle - 30.dp), fill(tokens.dialContainerColor))
        assertTrue("the columns a gap apart", dialLeft >= okBox.right)
        // auto: a short wide window takes horizontal; a tall one vertical; text entry is vertical in every layout.
        inPlace(picker(), stage = DpSize(720.dp, 420.dp))
        assertTrue("auto in a short window: the dial beside the time", rule.onNodeWithText("Select time").getUnclippedBoundsInRoot().left < hour().getUnclippedBoundsInRoot().left + 1.dp)
        assertTrue("auto: OK above the bottom of a short window", ok().getUnclippedBoundsInRoot().bottom < 420.dp)
        inPlace(picker(), stage = DpSize(480.dp, 640.dp))
        val tall = surface().getUnclippedBoundsInRoot()
        assertEquals("auto in a tall window: vertical, the label centred", ((tall.left + tall.right) / 2).value, rule.onNodeWithText("Select time").getUnclippedBoundsInRoot().let { (it.left + it.right) / 2 }.value, 0.6f)
        inPlace(picker(layout = TanreiTimePickerLayout.Horizontal, entryMode = TanreiTimePickerEntryMode.Text), stage = DpSize(720.dp, 480.dp))
        val text = surface().getUnclippedBoundsInRoot()
        assertTrue("text entry: the actions below the fields", ok().getUnclippedBoundsInRoot().top > field("Hour").getUnclippedBoundsInRoot().bottom)
        assertEquals("text entry: the label centred", ((text.left + text.right) / 2).value, rule.onNodeWithText("Select time").getUnclippedBoundsInRoot().let { (it.left + it.right) / 2 }.value, 0.6f)
    }

    @Test
    fun `TMP-8 a short window keeps the label and the actions and scrolls the time and the dial between them - a shorter one scrolls everything`() {
        inPlace(picker(layout = TanreiTimePickerLayout.Vertical), stage = DpSize(480.dp, 360.dp))
        val stage = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
        assertTrue("OK in view", ok().getUnclippedBoundsInRoot().bottom <= stage.bottom)
        rule.onNodeWithText("Select time").assertExists()
        val okTop = ok().getUnclippedBoundsInRoot().top
        assertTrue("the dial scrolls under the actions", dialCenter().y + tokens.dialContainerSize / 2 > okTop)
        inPlace(picker(layout = TanreiTimePickerLayout.Vertical), stage = DpSize(480.dp, 200.dp))
        assertTrue("everything scrolls: OK below the room", ok().getUnclippedBoundsInRoot().top > rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot().bottom)
    }

    @Test
    fun `TMP-8 the horizontal layout, where nothing lies between the label and the actions, scrolls the whole surface as one`() {
        inPlace(picker(layout = TanreiTimePickerLayout.Horizontal), stage = DpSize(720.dp, 240.dp))
        val stage = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
        val box = surface().getUnclippedBoundsInRoot()
        assertTrue("the surface keeps to the room", box.bottom <= stage.bottom - tokens.containerMargin + 0.6.dp)
        val label = rule.onNodeWithText("Select time").getUnclippedBoundsInRoot()
        val okBefore = ok().getUnclippedBoundsInRoot()
        val hourBefore = hour().getUnclippedBoundsInRoot()
        assertTrue("the actions are not held in place: OK is below the room", okBefore.bottom > box.bottom)
        ok().performScrollTo()
        rule.waitForIdle()
        val moved = okBefore.top - ok().getUnclippedBoundsInRoot().top
        assertTrue("it scrolled", moved > 1.dp)
        assertEquals("the label scrolled with the actions", moved.value, (label.top - rule.onNodeWithText("Select time").getUnclippedBoundsInRoot().top).value, 0.6f)
        assertEquals("and the time with them", moved.value, (hourBefore.top - hour().getUnclippedBoundsInRoot().top).value, 0.6f)
    }

    @Test
    fun `TMP-8 the selectors, the period segments and the label grow with enlarged text rather than clip it`() {
        inPlace(picker(layout = TanreiTimePickerLayout.Vertical))
        val selector = hour().getUnclippedBoundsInRoot().let { it.bottom - it.top }
        val segment = period("AM").getUnclippedBoundsInRoot().let { it.right - it.left }
        inPlace(picker(layout = TanreiTimePickerLayout.Vertical), fontScale = 3f, stage = DpSize(720.dp, 700.dp))
        assertTrue("the selector grew", hour().getUnclippedBoundsInRoot().let { it.bottom - it.top } > selector)
        assertTrue("the segment grew", period("AM").getUnclippedBoundsInRoot().let { it.right - it.left } >= segment)
        assertEquals("the period as tall as the selectors", hour().getUnclippedBoundsInRoot().let { it.bottom - it.top }.value, period("AM").getUnclippedBoundsInRoot().let { it.bottom - it.top }.value, 0.6f)
    }

    // ── TMP-9 / TMP-10: the time display ─────────────────────────────────────

    @Test
    fun `TMP-9 the hour, the separator and the minute left to right, each selector at least its size, the selected one outlined`() {
        inPlace(picker())
        val h = hour().getUnclippedBoundsInRoot()
        val m = minute().getUnclippedBoundsInRoot()
        assertTrue("the hour left of the minute", h.right < m.left)
        assertTrue("at least the width", h.right - h.left >= tokens.selectorContainerWidth - 0.5.dp)
        assertTrue("at least the height", h.bottom - h.top >= tokens.selectorContainerHeight - 0.5.dp)
        assertTrue("the separator between them, selector.gap from each", m.left - h.right > tokens.selectorGap * 2)
        assertEquals(":", TanreiTimeText(Locale.US).separator)
        assertEquals("the hour written as en-US writes an h12 hour", "7 AM", valueOf(hour()))
        assertEquals("the minute with two digits", "30", valueOf(minute()))
        val selected = tokens.conditions.selected.enabled
        val unselected = tokens.conditions.unselected.enabled
        val middle = (h.bottom - h.top) / 2
        assertPixel("the hour's selected edge", nodePixel(hour(), selected.selectorOutlineWidth / 2, middle), fill(selected.selectorOutlineColor))
        assertPixel("the hour's container inside it", nodePixel(hour(), 6.dp, 6.dp), fill(selected.selectorContainerColor))
        assertPixel("the minute: no edge, its container", nodePixel(minute(), 0.5.dp + unselected.selectorOutlineWidth, middle), fill(unselected.selectorContainerColor))
        inPlace(picker(hourCycle = TanreiTimePickerHourCycle.H23, value = TanreiTime(7, 5)))
        assertEquals("07 in en-US with h23", "07", valueOf(hour()))
        assertEquals("05", valueOf(minute()))
        // The values drive the drawing: a system with other selector colors.
        val system = tanrei.withTimePicker(TanreiTimePickerCondition.Unselected, TanreiInteractionState.Enabled) { it.copy(selectorContainerColor = TanreiPaint.Role(TanreiColorRole.Warning)) }
        inPlace(picker(), system = system)
        assertPixel("the unselected container follows its token", nodePixel(minute(), 6.dp, 6.dp), colors[TanreiColorRole.Warning])
    }

    @Test
    fun `TMP-10 the period goes where the locale writes it - after the minutes in en, before the hour in ja - a margin from its neighbour, as tall as the selectors`() {
        inPlace(picker())
        val m = minute().getUnclippedBoundsInRoot()
        val am = period("AM").getUnclippedBoundsInRoot()
        val pm = period("PM").getUnclippedBoundsInRoot()
        assertEquals("after the minutes, the margin away", (m.right + tokens.periodMarginInlineStart).value, am.left.value, 0.6f)
        assertTrue("before noon first", am.right <= pm.left + 0.5.dp)
        assertTrue("each at least the period width", am.right - am.left >= tokens.periodContainerWidth - 0.5.dp)
        assertEquals("as tall as the selectors", (m.bottom - m.top).value, (am.bottom - am.top).value, 0.6f)
        assertPixel("the chosen period's fill", nodePixel(period("AM"), 12.dp, 8.dp), fill(tokens.conditions.selected.enabled.periodContainerColor))
        assertPixel("the other: no fill", nodePixel(period("PM"), 30.dp, 8.dp), surfaceColor)
        assertPixel("the border around both", nodePixel(period("PM"), 20.dp, tokens.periodOutlineWidth / 2), fill(tokens.periodOutlineColor))
        assertPixel("the line between them", stagePixel(pm.left, (pm.top + pm.bottom) / 2 + 10.dp), fill(tokens.periodOutlineColor))
        inPlace(picker(locale = Locale.JAPAN))
        val h = hour().getUnclippedBoundsInRoot()
        val morning = period("午前").getUnclippedBoundsInRoot()
        val afternoon = period("午後").getUnclippedBoundsInRoot()
        assertEquals("before the hour in ja, the margin away", (h.left - tokens.periodMarginInlineStart).value, afternoon.right.value, 0.6f)
        assertTrue("before noon first", morning.right <= afternoon.left + 0.5.dp)
        assertFalse("ja writes the period first", TanreiTimeText(Locale.US).periodBefore)
        assertTrue(TanreiTimeText(Locale.JAPAN).periodBefore)
        assertTrue("zh", TanreiTimeText(Locale.CHINA).periodBefore)
        assertTrue("ko", TanreiTimeText(Locale.KOREA).periodBefore)
        // Beside the fields too.
        inPlace(picker(entryMode = TanreiTimePickerEntryMode.Text, locale = Locale.JAPAN))
        assertTrue("before the hour field", period("午後").getUnclippedBoundsInRoot().right <= field("Hour").getUnclippedBoundsInRoot().left)
    }

    @Test
    fun `TMP-10 beside text fields that grow - enlarged text, a label that wraps - the period is drawn as tall as their containers, the separator centred on them`() {
        val fieldHeight = tanrei.textField.sizes.large.containerHeight
        val long = TanreiTimePickerLabels(hourLabel = LONG_HOUR)
        val cases = listOf<Pair<String, () -> Unit>>(
            "text at 200%" to { inPlace(picker(entryMode = TanreiTimePickerEntryMode.Text), fontScale = 2f, stage = DpSize(720.dp, 900.dp)) },
            "a label that wraps" to { inPlace(picker(entryMode = TanreiTimePickerEntryMode.Text, labels = long), stage = DpSize(720.dp, 900.dp)) },
            "a label that wraps, the period before the hour" to { inPlace(picker(entryMode = TanreiTimePickerEntryMode.Text, locale = Locale.JAPAN, labels = long), stage = DpSize(720.dp, 900.dp)) },
        )
        for ((what, show) in cases) {
            show()
            val morning = if (what.endsWith("hour")) "午前" else "AM"
            val hourLabel = if (what.startsWith("text")) "Hour" else LONG_HOUR
            with(rule.density) {
                val hour = drawnRows(field(hourLabel), fromEnd = 4.dp)
                val minute = drawnRows(field("Minute"), fromEnd = 4.dp)
                assertTrue("$what: the fields grew (${hour.last - hour.first + 1} px)", hour.last - hour.first + 1 > (fieldHeight + 4.dp).toPx())
                assertEquals("$what: both fields' containers start on the same row", hour.first.toFloat(), minute.first.toFloat(), 1f * density)
                assertEquals("$what: and end on the same row", hour.last.toFloat(), minute.last.toFloat(), 1f * density)
                val period = drawnRows(period(morning), fromEnd = null)
                assertEquals("$what: the period starts with the fields' containers", hour.first.toFloat(), period.first.toFloat(), 1f * density)
                assertEquals("$what: and ends with them", hour.last.toFloat(), period.last.toFloat(), 1f * density)
                val separator = separatorRows(hourLabel)
                assertEquals("$what: the separator centred on the containers", (hour.first + hour.last) / 2f, (separator.first + separator.last) / 2f, 4f * density)
            }
        }
    }

    @Test
    @KeyboardNavigation
    fun `TMP-11 a period keeps the hour's number - the arrows choose the other and move focus, one tab stop`() {
        inPlace(picker())
        period("PM").performClick()
        rule.waitForIdle()
        assertEquals("7 before noon becomes 7 after noon", "7 PM", valueOf(hour()))
        period("PM").assertIsSelected()
        period("AM").assertIsNotSelected()
        ok().performClick()
        rule.waitForIdle()
        assertEquals(listOf("change:19:30", "close:Confirm"), events)
        inPlace(picker())
        minute().requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        period("AM").assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        period("PM").assertIsNotFocused()
        toggle("Switch to text entry").assertIsFocused()
        period("AM").requestFocus().assertIsFocused().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        period("PM").assertIsFocused().assertIsSelected()
        assertEquals("7 PM", valueOf(hour()))
        period("PM").performKeyInput { pressKey(Key.DirectionLeft) }
        rule.waitForIdle()
        period("AM").assertIsFocused().assertIsSelected()
        period("AM").performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        assertEquals("7 AM", valueOf(hour()))
    }

    // ── TMP-12 … TMP-15: the dial ────────────────────────────────────────────

    private val marked by lazy {
        tanrei.copy(
            timePicker = tokens.copy(
                dialContainerColor = TanreiPaint.Role(TanreiColorRole.Warning),
                dialHandleColor = TanreiPaint.Role(TanreiColorRole.Success),
                dialTrackColor = TanreiPaint.Role(TanreiColorRole.Error),
                dialSelectedLabelColor = TanreiPaint.Role(TanreiColorRole.Info),
            ),
        )
    }

    @Test
    fun `TMP-12 the dial is a circle of its size and color with twelve numbers clockwise from the top, the outer and inner rings where they belong`() {
        inPlace(picker(), system = marked)
        val center = dialCenter()
        val radius = tokens.dialContainerSize / 2
        assertPixel("the face inside the edge", stagePixel(center.x, center.y - radius + 2.dp), colors[TanreiColorRole.Warning])
        assertPixel("outside the circle: the surface", stagePixel(center.x - radius + 4.dp, center.y - radius + 4.dp), surfaceColor)
        assertEquals(TanreiDialPosition(0f, inner = false), tanreiDialPosition(TanreiTimePickerUnit.Hour, TanreiTime(12, 0), twelve = true))
        assertEquals(TanreiDialPosition(0f, inner = false), tanreiDialPosition(TanreiTimePickerUnit.Hour, TanreiTime(0, 0), twelve = false))
        assertEquals("12 inside on the 24-hour clock", TanreiDialPosition(0f, inner = true), tanreiDialPosition(TanreiTimePickerUnit.Hour, TanreiTime(12, 0), twelve = false))
        assertEquals("19 inside, where 7 is", TanreiDialPosition(210f, inner = true), tanreiDialPosition(TanreiTimePickerUnit.Hour, TanreiTime(19, 0), twelve = false))
        assertEquals("15 minutes at 3 o'clock", TanreiDialPosition(90f, inner = false), tanreiDialPosition(TanreiTimePickerUnit.Minute, TanreiTime(0, 15), twelve = true))
        assertEquals("numbers in the locale's digits", "٥", TanreiTimeText(Locale.forLanguageTag("ar-EG")).number(5))
        // The handle is where a number is centred: the outer ring for 7, the inner one for 19.
        val handle = tokens.dialHandleSize / 2
        val seven = onDial(210f, outerRadius)
        assertPixel("the handle on the outer ring at 7", stagePixel(seven.x, seven.y + handle - 3.dp), colors[TanreiColorRole.Success])
        inPlace(picker(value = TanreiTime(19, 30), hourCycle = TanreiTimePickerHourCycle.H23), system = marked)
        val nineteen = onDial(210f, innerRadius)
        assertPixel("the handle on the inner ring at 19", stagePixel(nineteen.x, nineteen.y + handle - 3.dp), colors[TanreiColorRole.Success])
        val outerSeven = onDial(210f, outerRadius)
        assertPixel("nothing at 07's place but the face", stagePixel(outerSeven.x, outerSeven.y + handle - 3.dp), colors[TanreiColorRole.Warning])
    }

    @Test
    fun `TMP-13 the handle, the track from the centre and the centre dot - and a dot in the handle between two numbers`() {
        inPlace(picker(value = TanreiTime(19, 45), unit = TanreiTimePickerUnit.Minute), system = marked)
        val center = dialCenter()
        assertPixel("the centre dot", stagePixel(center.x, center.y), colors[TanreiColorRole.Error])
        assertPixel("the track toward 45", stagePixel(center.x - 40.dp, center.y), colors[TanreiColorRole.Error])
        assertPixel("no track the other way", stagePixel(center.x + 40.dp, center.y), colors[TanreiColorRole.Warning])
        val handle = onDial(270f, outerRadius)
        assertPixel("the handle at 45", stagePixel(handle.x, handle.y + tokens.dialHandleSize / 2 - 3.dp), colors[TanreiColorRole.Success])
        inPlace(picker(value = TanreiTime(7, 32), unit = TanreiTimePickerUnit.Minute), system = marked)
        val between = onDial(32 * 6f, outerRadius)
        assertPixel("a minute between two numbers: the dot in the selected label color", stagePixel(between.x, between.y), colors[TanreiColorRole.Info])
        assertPixel("the handle around it", stagePixel(between.x, between.y + tokens.dialHandleSize / 2 - 3.dp), colors[TanreiColorRole.Success])
    }

    @Test
    @KeyboardNavigation
    fun `TMP-14 a press or a drag on the dial sets the value under it - letting go of the hour shows the minutes and moves focus there`() {
        inPlace(picker())
        hour().requestFocus().assertIsFocused()
        touchDial(90f to outerRadius, 150f to outerRadius)
        assertEquals("dragged from 3 to 5, before noon", "5 AM", valueOf(hour()))
        minute().assertIsFocused()
        assertPixel("the minute selector drawn selected", nodePixel(minute(), 1.dp, 32.dp), fill(tokens.conditions.selected.enabled.selectorOutlineColor))
        touchDial(32 * 6f to outerRadius)
        assertEquals("any minute", "32", valueOf(minute()))
        minute().assertIsFocused()
        inPlace(picker(hourCycle = TanreiTimePickerHourCycle.H23))
        touchDial(90f to innerRadius)
        assertEquals("the inner ring: 15", "15", valueOf(hour()))
        hour().performClick()
        rule.waitForIdle()
        touchDial(90f to outerRadius + 4.dp)
        assertEquals("the outer ring: 03", "03", valueOf(hour()))
        assertEquals("nothing emitted", emptyList<String>(), events)
        // The rule itself.
        assertEquals(TanreiTime(15, 30), tanreiDialValue(10f, 0f, TanreiTimePickerUnit.Hour, T0730, twelve = false, outer = 100f, inner = 20f))
        assertEquals(TanreiTime(3, 30), tanreiDialValue(90f, 0f, TanreiTimePickerUnit.Hour, T0730, twelve = false, outer = 100f, inner = 20f))
        assertEquals("12-hour keeps the period", TanreiTime(15, 30), tanreiDialValue(90f, 0f, TanreiTimePickerUnit.Hour, TanreiTime(19, 30), twelve = true, outer = 100f, inner = 20f))
        assertEquals("12 at the top", TanreiTime(12, 30), tanreiDialValue(0f, -90f, TanreiTimePickerUnit.Hour, TanreiTime(19, 30), twelve = true, outer = 100f, inner = 20f))
        assertEquals("a minute at six degrees", TanreiTime(7, 1), tanreiDialValue(10f, -95f, TanreiTimePickerUnit.Minute, T0730, twelve = true, outer = 100f, inner = 20f))
    }

    @Test
    @KeyboardNavigation
    fun `TMP-15 a key moves the handle along the shorter arc over the dial motion, and a change of unit moves it and cross-fades the numbers`() {
        val slow = marked.copy(timePicker = marked.timePicker.copy(motionDialDuration = 1000))
        inPlace(picker(value = TanreiTime(0, 30), hourCycle = TanreiTimePickerHourCycle.H23), system = slow)
        val probe = tokens.dialHandleSize / 2 - 3.dp
        hour().requestFocus()
        rule.waitForIdle()
        rule.mainClock.autoAdvance = false
        hour().performKeyInput { pressKey(Key.DirectionDown) }
        repeat(2) { rule.mainClock.advanceTimeByFrame() }
        val start = onDial(0f, outerRadius)
        assertPixel("the handle has not jumped", stagePixel(start.x, start.y + probe), colors[TanreiColorRole.Success])
        rule.mainClock.advanceTimeBy(1200)
        val end = onDial(330f, innerRadius)
        assertPixel("after the dial motion: at 23 (inner ring)", stagePixel(end.x, end.y + probe), colors[TanreiColorRole.Success])
        assertPixel("left 00", stagePixel(start.x, start.y + probe), colors[TanreiColorRole.Warning])
        // A change of unit: the handle travels from the hour to the minute.
        minute().performClick()
        repeat(2) { rule.mainClock.advanceTimeByFrame() }
        assertPixel("the handle still at the hour", stagePixel(end.x, end.y + probe), colors[TanreiColorRole.Success])
        rule.mainClock.advanceTimeBy(1200)
        val thirty = onDial(180f, outerRadius)
        assertPixel("the handle at 30 minutes", stagePixel(thirty.x, thirty.y + probe), colors[TanreiColorRole.Success])
        rule.mainClock.autoAdvance = true
    }

    // ── TMP-16: the selectors are adjustable ─────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `TMP-16 the arrows step and wrap without touching the other unit or the period, Page keys move five minutes, Home and End the ends`() {
        inPlace(picker(value = TanreiTime(12, 58)))
        fun key(node: SemanticsNodeInteraction, key: Key) {
            node.performKeyInput { pressKey(key) }
            rule.waitForIdle()
        }
        hour().requestFocus()
        key(hour(), Key.DirectionUp)
        assertEquals("12 to 1, after noon kept", "1 PM", valueOf(hour()))
        key(hour(), Key.DirectionLeft)
        assertEquals("12 PM", valueOf(hour()))
        key(hour(), Key.DirectionRight)
        key(hour(), Key.DirectionDown)
        assertEquals("12 PM", valueOf(hour()))
        key(hour(), Key.MoveHome)
        assertEquals("1 PM", valueOf(hour()))
        key(hour(), Key.MoveEnd)
        assertEquals("12 PM", valueOf(hour()))
        assertEquals("58", valueOf(minute()))
        minute().requestFocus()
        key(minute(), Key.DirectionUp)
        assertEquals("59", valueOf(minute()))
        key(minute(), Key.DirectionUp)
        assertEquals("59 to 00, the hour kept", "00", valueOf(minute()))
        assertEquals("12 PM", valueOf(hour()))
        key(minute(), Key.PageDown)
        assertEquals("55", valueOf(minute()))
        key(minute(), Key.PageUp)
        key(minute(), Key.PageUp)
        assertEquals("05", valueOf(minute()))
        key(minute(), Key.MoveEnd)
        assertEquals("59", valueOf(minute()))
        key(minute(), Key.MoveHome)
        assertEquals("00", valueOf(minute()))
        assertEquals("23 to 00", TanreiTime(0, 5), tanreiStepTime(TanreiTime(23, 5), TanreiTimePickerUnit.Hour, 1, twelve = false))
        assertEquals("Page keys are the minute's", null, tanreiTimeKeyTarget(Key.PageUp, TanreiTimePickerUnit.Hour, T0730, twelve = true))
        assertEquals(TanreiTime(0, 30), tanreiTimeKeyTarget(Key.MoveHome, TanreiTimePickerUnit.Hour, TanreiTime(9, 30), twelve = false))
        assertEquals(TanreiTime(23, 30), tanreiTimeKeyTarget(Key.MoveEnd, TanreiTimePickerUnit.Hour, TanreiTime(9, 30), twelve = false))
    }

    @Test
    fun `TMP-16 increment and decrement do what the arrows do, wrapping - and a focused or pressed selector shows its unit`() {
        inPlace(picker(value = TanreiTime(12, 0)))
        hour().performSemanticsAction(SemanticsActions.SetProgress) { it(13f) }
        rule.waitForIdle()
        assertEquals("past 12 wraps to 1", "1 PM", valueOf(hour()))
        hour().performSemanticsAction(SemanticsActions.SetProgress) { it(0f) }
        rule.waitForIdle()
        assertEquals("below 1 wraps to 12", "12 PM", valueOf(hour()))
        minute().performSemanticsAction(SemanticsActions.SetProgress) { it(-1f) }
        rule.waitForIdle()
        assertEquals("59", valueOf(minute()))
        minute().performSemanticsAction(SemanticsActions.SetProgress) { it(58f) }
        rule.waitForIdle()
        assertEquals("58", valueOf(minute()))
        val range = minute().fetchSemanticsNode().config[SemanticsProperties.ProgressBarRangeInfo]
        assertEquals(58f, range.current)
        assertEquals(0f..59f, range.range)
        // A press on the minute selector shows the minutes: the handle is at 15 minutes, not at 12.
        inPlace(picker(value = TanreiTime(12, 15)), system = marked)
        minute().performClick()
        rule.waitForIdle()
        val quarter = onDial(90f, outerRadius)
        assertPixel("the minute dial: the handle at 15", stagePixel(quarter.x, quarter.y + tokens.dialHandleSize / 2 - 3.dp), colors[TanreiColorRole.Success])
    }

    // ── TMP-17 … TMP-22: the selectors' and segments' state answer ───────────

    @Test
    fun `TMP-17 hovered and pressed draw the state's tokens of the selector's and the segment's condition`() {
        val acme = TanreiSystem.Acme
        val unselected = acme.timePicker.conditions.unselected
        val acmeColors = acme.colors.light
        val acmeSurface = acme.timePicker.containerColor.resolve(acmeColors)
        fun over(paint: TanreiPaint) = paint.resolve(acmeColors).compositeOver(acmeSurface)
        assertEquals("acme values the states apart", 4, listOf(unselected.enabled, unselected.hovered, unselected.focused, unselected.pressed).map { over(it.selectorContainerColor) }.toSet().size)
        inPlace(picker(), system = acme)
        minute().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertPixel("hovered", nodePixel(minute(), 6.dp, 6.dp), over(unselected.hovered.selectorContainerColor))
        minute().performTouchInput { down(center) }
        rule.waitForIdle()
        assertPixel("pressed", nodePixel(minute(), 6.dp, 6.dp), over(unselected.pressed.selectorContainerColor))
        minute().performTouchInput { cancel() }
        rule.waitForIdle()
        period("PM").performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertPixel("a hovered segment", nodePixel(period("PM"), 12.dp, 6.dp), over(unselected.hovered.periodContainerColor))
    }

    @Test
    @KeyboardNavigation
    fun `TMP-17 TMP-18 keyboard focus draws the focused tokens and the ring around the selector at once - focus by touch does neither`() {
        val acme = TanreiSystem.Acme
        val acmeColors = acme.colors.light
        val acmeSurface = acme.timePicker.containerColor.resolve(acmeColors)
        inPlace(picker(), system = acme)
        rule.mainClock.autoAdvance = false
        minute().requestFocus()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        // Focus shows the minutes: the minute selector is selected, in its focused state.
        val focused = acme.timePicker.conditions.selected.focused.selectorContainerColor.resolve(acmeColors).compositeOver(acmeSurface)
        assertPixel("focused", nodePixel(minute(), 6.dp, 6.dp), focused)
        inPlace(picker())
        rule.mainClock.autoAdvance = false
        minute().requestFocus()
        repeat(2) { rule.mainClock.advanceTimeByFrame() }
        val ringOutside = measure.focusOffset + measure.focusInnerWidth + measure.focusOuterWidth / 2
        val m = minute().getUnclippedBoundsInRoot()
        assertPixel("the ring, on the first frame", stagePixel((m.left + m.right) / 2, m.top - ringOutside), colors[TanreiColorRole.FocusRing])
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `TMP-18 focus gained by touch shows no ring`() {
        inPlace(picker())
        minute().performClick()
        rule.waitForIdle()
        val ringOutside = measure.focusOffset + measure.focusInnerWidth + measure.focusOuterWidth / 2
        val m = minute().getUnclippedBoundsInRoot()
        assertFalse("no ring", isClose(stagePixel((m.left + m.right) / 2, m.top - ringOutside), colors[TanreiColorRole.FocusRing]))
    }

    @Test
    fun `TMP-19 a tap that ends at once shows the pressed state on the next frame and keeps it for press-hold`() {
        val system = tanrei.withTimePicker(TanreiTimePickerCondition.Selected, TanreiInteractionState.Pressed) { it.copy(selectorContainerColor = TanreiPaint.Role(TanreiColorRole.Warning)) }
        inPlace(picker(), system = system)
        val hold = tanrei.motion.duration.pressHold.toLong()
        rule.mainClock.autoAdvance = false
        hour().performTouchInput { down(center); up() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("pressed", nodePixel(hour(), 6.dp, 6.dp), colors[TanreiColorRole.Warning])
        rule.mainClock.advanceTimeBy(hold / 2)
        assertPixel("still pressed", nodePixel(hour(), 6.dp, 6.dp), colors[TanreiColorRole.Warning])
        rule.mainClock.advanceTimeBy(hold + tokens.motionStateDuration * 2L)
        assertPixel("at rest", nodePixel(hour(), 6.dp, 6.dp), fill(tokens.conditions.selected.enabled.selectorContainerColor))
        rule.mainClock.autoAdvance = true
        // A segment, from its first frame.
        val segmentSystem = tanrei.withTimePicker(TanreiTimePickerCondition.Unselected, TanreiInteractionState.Pressed) { it.copy(periodContainerColor = TanreiPaint.Role(TanreiColorRole.Warning)) }
        inPlace(picker(), system = segmentSystem)
        rule.mainClock.autoAdvance = false
        period("PM").performTouchInput { down(center) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("the pressed segment, without delay", nodePixel(period("PM"), 12.dp, 6.dp), colors[TanreiColorRole.Warning])
        period("PM").performTouchInput { cancel() }
        rule.mainClock.autoAdvance = true
    }

    private fun TanreiSystem.answering(feedback: TanreiPressedFeedback) = copy(behavior = behavior.copy(pressedFeedback = feedback))

    @Test
    fun `TMP-20 ripple grows the pressed color from the point of contact within the selector`() {
        assertEquals(TanreiPressedFeedback.Ripple, TanreiSystem.M3Like.behavior.pressedFeedback)
        val system = tanrei.answering(TanreiPressedFeedback.Ripple)
            .withTimePicker(TanreiTimePickerCondition.Unselected, TanreiInteractionState.Pressed) { it.copy(periodContainerColor = TanreiPaint.Role(TanreiColorRole.Warning)) }
        inPlace(picker(), system = system)
        val m = period("PM").getUnclippedBoundsInRoot()
        val width = m.right - m.left
        val height = m.bottom - m.top
        rule.mainClock.autoAdvance = false
        period("PM").performTouchInput { down(Offset(6.dp.toPx(), 6.dp.toPx())) }
        rule.mainClock.advanceTimeBy(50)
        assertPixel("at the point of contact", nodePixel(period("PM"), 6.dp, 6.dp), colors[TanreiColorRole.Warning])
        assertFalse("not yet at the far corner", isClose(nodePixel(period("PM"), width - 8.dp, height - 8.dp), colors[TanreiColorRole.Warning]))
        rule.mainClock.advanceTimeBy(tokens.motionFeedbackDuration.toLong())
        assertPixel("the far corner once grown", nodePixel(period("PM"), width - 8.dp, height - 8.dp), colors[TanreiColorRole.Warning])
        period("PM").performTouchInput { cancel() }
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `TMP-20 dim - cupertino's answer - dims the pressed selector and draws no state layer, and none draws nothing`() {
        val cupertino = TanreiSystem.Cupertino
        assertEquals(TanreiPressedFeedback.Dim, cupertino.behavior.pressedFeedback)
        val opacity = cupertino.timePicker.pressed.opacity
        assertTrue(opacity < 1f)
        inPlace(picker(), system = cupertino)
        val cupertinoColors = cupertino.colors.light
        val surface = cupertino.timePicker.containerColor.resolve(cupertinoColors)
        val chosen = cupertino.timePicker.conditions.selected.enabled.periodContainerColor.resolve(cupertinoColors).compositeOver(surface)
        period("AM").performTouchInput { down(center) }
        rule.waitForIdle()
        assertPixel("the resting fill, dimmed", nodePixel(period("AM"), 14.dp, 6.dp), chosen.copy(alpha = opacity).compositeOver(surface))
        period("AM").performTouchInput { cancel() }
        inPlace(picker(), system = tanrei.answering(TanreiPressedFeedback.None))
        period("PM").performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val hovered = period("PM").captureToImage().toPixelMap()
        period("PM").performMouseInput { press() }
        rule.waitForIdle()
        assertSameAs(hovered, period("PM").captureToImage().toPixelMap(), "pressed under none")
        period("PM").performMouseInput { release() }
    }

    @Test
    fun `TMP-21 corners are the shape eased by corner smoothing - and glow draws the focus as a halo`() {
        for (smoothing in listOf(0f, 0.6f)) {
            inPlace(picker(), system = tanrei.copy(shape = tanrei.shape.copy(cornerSmoothing = smoothing)))
            assertPixel("smoothing $smoothing: the very corner is outside", nodePixel(minute(), 0.5.dp, 0.5.dp), surfaceColor)
            assertPixel("smoothing $smoothing: inside", nodePixel(minute(), tokens.selectorContainerShape, tokens.selectorContainerShape), fill(tokens.conditions.unselected.enabled.selectorContainerColor))
        }
        assertEquals(0.6f, TanreiSystem.Cupertino.shape.cornerSmoothing)
        assertEquals(TanreiFocusStyle.Glow, TanreiSystem.Acme.behavior.focusStyle)
    }

    @Test
    fun `TMP-22 selectors and segments are at least the target in each dimension - beside the fields a segment reaches it with a hit area above and below`() {
        val tiny = tanrei.copy(timePicker = tokens.copy(selectorContainerWidth = 10.dp, selectorContainerHeight = 10.dp, periodContainerWidth = 10.dp))
        inPlace(picker(), system = tiny)
        for (node in listOf(hour(), minute(), period("AM"), period("PM"))) {
            val bounds = node.getUnclippedBoundsInRoot()
            assertTrue("at least the target wide: ${bounds.right - bounds.left}", bounds.right - bounds.left >= measure.targetTouch - 0.5.dp)
            assertTrue("at least the target tall: ${bounds.bottom - bounds.top}", bounds.bottom - bounds.top >= measure.targetTouch - 0.5.dp)
        }
        inPlace(picker(entryMode = TanreiTimePickerEntryMode.Text))
        val fieldHeight = tanrei.textField.sizes.large.containerHeight
        val am = period("AM").getUnclippedBoundsInRoot()
        assertTrue("the hit area reaches the target", am.bottom - am.top >= maxOf(measure.targetTouch, fieldHeight) - 0.5.dp)
        val reach = ((measure.targetTouch - fieldHeight) / 2).coerceAtLeast(0.dp)
        assertPixel("drawn from its reach: the fill", nodePixel(period("AM"), 12.dp, reach + 4.dp), fill(tokens.conditions.selected.enabled.periodContainerColor))
        if (reach > 1.dp) assertPixel("above the drawing: the surface", nodePixel(period("AM"), 12.dp, reach / 2), surfaceColor)
        assertTrue("at least the target wide", am.right - am.left >= measure.targetTouch - 0.5.dp)
    }

    // ── TMP-23: text entry ───────────────────────────────────────────────────

    @Test
    fun `TMP-23 text entry is two outlined fields of the selector width with the pending hour and minute, typed numbers set them, errors on commit`() {
        inPlace(picker(entryMode = TanreiTimePickerEntryMode.Text))
        field("Hour").assert(hasText("7"))
        field("Minute").assert(hasText("30"))
        val hourBox = field("Hour").getUnclippedBoundsInRoot()
        assertEquals("the selector width", tokens.selectorContainerWidth.value, (hourBox.right - hourBox.left).value, 0.6f)
        assertTrue("the hour left of the minute", hourBox.right < field("Minute").getUnclippedBoundsInRoot().left)
        field("Hour").performTextClearance()
        field("Hour").performTextInput("9")
        rule.waitForIdle()
        field("Minute").performTextClearance()
        field("Minute").performTextInput("05")
        rule.waitForIdle()
        ok().performClick()
        rule.waitForIdle()
        assertEquals(listOf("change:09:05", "close:Confirm"), events)
        events.clear()
        inPlace(picker(entryMode = TanreiTimePickerEntryMode.Text))
        field("Hour").performTextClearance()
        field("Hour").performTextInput("13")
        rule.waitForIdle()
        rule.onNodeWithText("Enter a valid time", useUnmergedTree = true).assertDoesNotExist()
        field("Hour").performImeAction()
        rule.waitForIdle()
        rule.onNodeWithText("Enter a valid time", useUnmergedTree = true).assertExists()
        field("Hour").performTextClearance()
        rule.waitForIdle()
        rule.onNodeWithText("Enter a valid time", useUnmergedTree = true).assertDoesNotExist()
        field("Hour").performTextInput("١١")
        rule.waitForIdle()
        ok().performClick()
        rule.waitForIdle()
        assertEquals("the locale's digits are numbers too", listOf("change:11:30", "close:Confirm"), events)
        inPlace(picker(entryMode = TanreiTimePickerEntryMode.Text, hourCycle = TanreiTimePickerHourCycle.H23))
        field("Hour").assert(hasText("07"))
        field("Hour").performTextClearance()
        field("Hour").performTextInput("0")
        field("Hour").performImeAction()
        rule.waitForIdle()
        rule.onNodeWithText("Enter a valid time", useUnmergedTree = true).assertDoesNotExist()
    }

    @Test
    @KeyboardNavigation
    fun `TMP-23 the action key moves from the hour field to the minute field, and there activates OK when it is enabled`() {
        inPlace(picker(entryMode = TanreiTimePickerEntryMode.Text))
        field("Hour").requestFocus().performImeAction()
        rule.waitForIdle()
        field("Minute").assertIsFocused().performImeAction()
        rule.waitForIdle()
        assertEquals("OK: unchanged, so only close", listOf("close:Confirm"), events)
        events.clear()
        inPlace(picker(entryMode = TanreiTimePickerEntryMode.Text))
        field("Minute").performTextClearance()
        field("Minute").performTextInput("x")
        field("Minute").requestFocus().performImeAction()
        rule.waitForIdle()
        assertEquals("OK disabled: nothing", emptyList<String>(), events)
    }

    // ── TMP-24: the actions row ──────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `TMP-24 the entry-mode toggle at the start, Cancel and OK at the end - the toggle switches entry, keeps the time and moves focus`() {
        glyphs.clear()
        inPlace(picker())
        val toggleBox = toggle("Switch to text entry").getUnclippedBoundsInRoot()
        val cancelBox = cancel().getUnclippedBoundsInRoot()
        val okBox = ok().getUnclippedBoundsInRoot()
        val box = surface().getUnclippedBoundsInRoot()
        assertTrue("the toggle at the start", toggleBox.left < box.left + tokens.containerPadding + measure.targetTouch)
        assertTrue("Cancel before OK", cancelBox.right <= okBox.left)
        assertEquals("OK at the end", (box.right - tokens.containerPadding).value, okBox.right.value, 1f)
        assertTrue("the keyboard glyph", "keyboard" in glyphs)
        hour().requestFocus().performKeyInput { pressKey(Key.DirectionUp) }
        rule.waitForIdle()
        toggle("Switch to text entry").requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        field("Hour").assertIsFocused().assert(hasText("8"))
        assertTrue("the schedule glyph", "schedule" in glyphs)
        toggle("Switch to clock").performClick()
        rule.waitForIdle()
        hour().assertIsFocused()
        assertEquals("8 AM", valueOf(hour()))
        cancel().performClick()
        rule.waitForIdle()
        assertEquals(listOf("close:Cancel"), events)
    }

    // ── TMP-25: motion ───────────────────────────────────────────────────────

    @Test
    fun `TMP-25 the picker fades in growing from the enter scale over the open motion and fades out over the close motion`() {
        value = T0730
        showPicker(system = tanrei.copy(timePicker = tokens.copy(motionOpenDuration = 1000, motionCloseDuration = 1000)))
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag(OPENER).performClick()
        repeat(3) { rule.mainClock.advanceTimeByFrame() }
        // Drawn bounds: the layer's scale included.
        val growing = surface().fetchSemanticsNode().boundsInRoot
        rule.mainClock.advanceTimeBy(1500)
        val whole = surface().fetchSemanticsNode().boundsInRoot
        val scale = growing.width / whole.width
        assertTrue("grows from the enter scale: $scale", scale < 0.99f && scale >= tokens.motionEnterScale - 0.01f)
        assertEquals("about its centre", whole.center.x, growing.center.x, 2f)
        assertEquals(1, dialogs())
        visible = false
        rule.mainClock.advanceTimeBy(500)
        assertEquals("still closing", 1, dialogs())
        assertEquals("it only fades as it leaves", whole.width, surface().fetchSemanticsNode().boundsInRoot.width, 1f)
        rule.mainClock.advanceTimeBy(1000)
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        assertEquals("gone", 0, dialogs())
    }

    // ── TMP-26: semantics ────────────────────────────────────────────────────

    @Test
    fun `TMP-26 a dialog named by label, adjustable selectors with their values, a radio group of periods, the actions by their labels, the dial hidden`() {
        inPlace(picker(labels = TanreiTimePickerLabels(label = "Wake up at", hourLabel = "Hours", minuteLabel = "Minutes")))
        assertEquals("Wake up at", surface().fetchSemanticsNode().config[SemanticsProperties.PaneTitle])
        val hourNode = selector("Hours").fetchSemanticsNode().config
        assertEquals("7 AM", hourNode[SemanticsProperties.StateDescription])
        assertEquals(1f..12f, hourNode[SemanticsProperties.ProgressBarRangeInfo].range)
        assertTrue(SemanticsActions.SetProgress in hourNode)
        assertEquals("30", selector("Minutes").fetchSemanticsNode().config[SemanticsProperties.StateDescription])
        val am = period("AM").fetchSemanticsNode().config
        assertEquals(Role.RadioButton, am[SemanticsProperties.Role])
        period("AM").assertIsSelected()
        period("PM").assertIsNotSelected()
        toggle("Switch to text entry").assertExists()
        cancel().assertExists()
        ok().assertExists()
        rule.onNodeWithText("12").assertDoesNotExist()
        rule.onNodeWithText("11").assertDoesNotExist()
        inPlace(picker(locale = Locale.JAPAN))
        assertEquals("the period first where the locale writes it first", "午前 7", valueOf(hour()))
    }

    // ── TMP-27: locale ───────────────────────────────────────────────────────

    @Test
    fun `TMP-27 the period names, digits, separator and clock come from the locale, or the platform's while it is empty`() {
        inPlace(picker(locale = Locale.JAPAN))
        period("午前").assertIsSelected()
        period("午後").assertExists()
        inPlace(picker(locale = Locale.forLanguageTag("ar-EG"), value = TanreiTime(7, 5)))
        assertEquals("٠٥", valueOf(minute()))
        assertEquals(".", TanreiTimeText(Locale.forLanguageTag("fi-FI")).separator)
        assertEquals(":", TanreiTimeText(Locale.US).separator)
        inPlace(picker(locale = null))
        period("AM").assertExists()
    }

    // ── TMP-28: right to left ────────────────────────────────────────────────

    @Test
    fun `TMP-28 right to left mirrors the period's place and the actions, never the hour-minute order or the dial`() {
        inPlace(picker(), direction = LayoutDirection.Rtl, system = marked)
        val h = hour().getUnclippedBoundsInRoot()
        val m = minute().getUnclippedBoundsInRoot()
        assertTrue("the hour still left of the minute", h.right < m.left)
        val am = period("AM").getUnclippedBoundsInRoot()
        assertTrue("the period mirrored: at the left of the time", am.right <= h.left)
        assertTrue("before noon first, from the right", period("PM").getUnclippedBoundsInRoot().right <= am.left + 0.5.dp)
        assertTrue("the toggle at the right, OK at the left", toggle("Switch to text entry").getUnclippedBoundsInRoot().left > ok().getUnclippedBoundsInRoot().right)
        // Clockwise: 7 is at the lower left, as left to right.
        val seven = onDial(210f, outerRadius)
        assertPixel("the handle at 7, lower left", stagePixel(seven.x, seven.y + tokens.dialHandleSize / 2 - 3.dp), colors[TanreiColorRole.Success])
    }

    // ── TMP-29: what cannot be used ──────────────────────────────────────────

    @Test
    fun `TMP-29 the enums are closed and hold exactly the spec's values, and a time is HH MM or nothing - an empty label is reported and still opens`() = collectingReports { reports ->
        val spec = readSpec(TIME_PICKER_SPEC).getJSONArray("props")
        fun values(name: String): List<String> {
            val prop = (0 until spec.length()).map { spec.getJSONObject(it) }.single { it.getString("name") == name }
            val array = prop.getJSONArray("values")
            return (0 until array.length()).map { array.getString(it) }
        }
        assertEquals(values("hourCycle"), TanreiTimePickerHourCycle.entries.map { it.name.lowercase() })
        assertEquals(values("entryMode"), TanreiTimePickerEntryMode.entries.map { it.name.lowercase() })
        assertEquals(values("unit"), TanreiTimePickerUnit.entries.map { it.name.lowercase() })
        assertEquals(values("layout"), TanreiTimePickerLayout.entries.map { it.name.lowercase() })
        assertEquals(listOf("escape", "back", "outside", "cancel", "confirm"), TanreiTimePickerCloseReason.entries.map { it.name.lowercase() })
        assertEquals(TanreiTime(19, 30), TanreiTime.parse("19:30"))
        assertEquals("07:05", TanreiTime(7, 5).toString())
        for (bad in listOf("7:30", "24:00", "19:60", "19:30:00", "1930", "")) assertNull(bad, TanreiTime.parse(bad))
        assertThrows(IllegalArgumentException::class.java) { TanreiTime(24, 0) }
        assertNull(TanreiTime.of(12, 60))
        assertTrue(TanreiTime(7, 30) < TanreiTime(19, 0))
        setDebuggable(true)
        inPlace(picker(labels = TanreiTimePickerLabels(label = "")))
        hour().assertExists()
        assertNull("no name", surface().fetchSemanticsNode().config.getOrNull(SemanticsProperties.PaneTitle))
        assertTrue(reports.toString(), reports.any { "TanreiTimePicker" in it && "label" in it })
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    /** Sends a key down and up to the overlay's window, as the platform does when no view used it. */
    private fun windowKey(code: Int) {
        val root = overlayView!!.rootView
        rule.runOnUiThread {
            root.dispatchKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, code))
            root.dispatchKeyEvent(KeyEvent(KeyEvent.ACTION_UP, code))
        }
        rule.waitForIdle()
    }

    private fun TanreiSystem.withTimePicker(condition: TanreiTimePickerCondition, state: TanreiInteractionState, change: (TanreiTimePickerConditionStateTokens) -> TanreiTimePickerConditionStateTokens): TanreiSystem {
        val tokens = timePicker.conditions[condition]
        val changed = when (state) {
            TanreiInteractionState.Enabled -> tokens.copy(enabled = change(tokens.enabled))
            TanreiInteractionState.Hovered -> tokens.copy(hovered = change(tokens.hovered))
            TanreiInteractionState.Focused -> tokens.copy(focused = change(tokens.focused))
            TanreiInteractionState.Pressed -> tokens.copy(pressed = change(tokens.pressed))
            TanreiInteractionState.Disabled -> tokens
        }
        val conditions = when (condition) {
            TanreiTimePickerCondition.Unselected -> timePicker.conditions.copy(unselected = changed)
            TanreiTimePickerCondition.Selected -> timePicker.conditions.copy(selected = changed)
            else -> error("not used: $condition")
        }
        return copy(timePicker = timePicker.copy(conditions = conditions))
    }

    /** [paint] as drawn on the surface. */
    private fun fill(paint: TanreiPaint): Color = paint.resolve(colors).compositeOver(surfaceColor)

    private fun stage(): PixelMap = rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap()

    private fun stagePixel(x: Dp, y: Dp): Color {
        val stageBounds = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
        return with(rule.density) { stage()[(x - stageBounds.left).roundToPx(), (y - stageBounds.top).roundToPx()] }
    }

    /**
     * The first and last stage rows [node] draws on the picker's surface, in the column [fromEnd] inside its end (a field's:
     * clear of its label and value) or through its centre (null).
     */
    private fun drawnRows(node: SemanticsNodeInteraction, fromEnd: Dp?): IntRange {
        val stageBounds = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
        val bounds = node.getUnclippedBoundsInRoot()
        val map = stage()
        return with(rule.density) {
            val x = (if (fromEnd != null) bounds.right - fromEnd else (bounds.left + bounds.right) / 2) - stageBounds.left
            val rows = ((bounds.top - stageBounds.top).roundToPx() until (bounds.bottom - stageBounds.top).roundToPx()).filter { y -> !isClose(map[x.roundToPx(), y], surfaceColor, 0.03f) }
            assertTrue("something is drawn", rows.isNotEmpty())
            rows.first()..rows.last()
        }
    }

    /** The stage rows the text entry's separator draws on, between the hour and the minute fields. */
    private fun separatorRows(hourLabel: String): IntRange {
        val stageBounds = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
        val hour = field(hourLabel).getUnclippedBoundsInRoot()
        val minute = field("Minute").getUnclippedBoundsInRoot()
        val map = stage()
        return with(rule.density) {
            val columns = (hour.right - stageBounds.left).roundToPx() until (minute.left - stageBounds.left).roundToPx()
            val rows = ((hour.top - stageBounds.top).roundToPx() until (hour.bottom - stageBounds.top).roundToPx()).filter { y -> columns.any { x -> !isClose(map[x, y], surfaceColor, 0.1f) } }
            assertTrue("the separator is drawn", rows.isNotEmpty())
            rows.first()..rows.last()
        }
    }

    /** A pixel of [node] at ([x], [y]) from its top-left, as drawn on the stage. */
    private fun nodePixel(node: SemanticsNodeInteraction, x: Dp, y: Dp): Color {
        val bounds = node.getUnclippedBoundsInRoot()
        return stagePixel(bounds.left + x, bounds.top + y)
    }

    private fun assertSameAs(expected: PixelMap, actual: PixelMap, what: String) {
        val differing = (0 until minOf(expected.height, actual.height)).sumOf { y -> (0 until minOf(expected.width, actual.width)).count { x -> !isClose(expected[x, y], actual[x, y]) } }
        assertEquals("$what: not one pixel differs", 0, differing)
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

    private fun isClose(actual: Color, expected: Color, tolerance: Float = PIXEL_TOLERANCE): Boolean =
        maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue)) <= tolerance

    private fun assertPixel(what: String, actual: Color, expected: Color) =
        assertTrue("$what: expected $expected but was $actual", isClose(actual, expected))

    private companion object {
        const val STAGE_TAG = "stage"
        const val SURFACE = "surface"
        const val OPENER = "opener"
        const val BEFORE = "before"
        const val AFTER = "after"
        const val PIXEL_TOLERANCE = 3f / 255f

        /** An hour field's label that wraps in the selector width. */
        const val LONG_HOUR = "Hour of the day"
        val T0730 = TanreiTime(7, 30)
    }
}

/** TMP-15 and TMP-25 where motion is reduced: Android's setting removes every animation, so both happen at once. */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w720dp-h720dp-xhdpi")
class TanreiTimePickerReducedMotionTest {
    private object NoMotion : MotionDurationScale {
        override val scaleFactor: Float = 0f
    }

    @get:Rule
    val rule = createComposeRule(effectContext = NoMotion)

    private var open by mutableStateOf(false)

    @Test
    fun `TMP-25 where motion is reduced the picker appears and disappears at once`() {
        var shown: androidx.compose.runtime.State<Float>? = null
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                val state = androidx.compose.runtime.remember { androidx.compose.animation.core.MutableTransitionState(false) }
                state.targetState = open
                shown = rememberTanreiTimePickerShown(state, TanreiTheme.tokens.timePicker)
            }
        }
        rule.mainClock.autoAdvance = false
        open = true
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        repeat(2) { rule.mainClock.advanceTimeByFrame() }
        assertEquals("whole at once", 1f, shown!!.value, 0.001f)
        open = false
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        repeat(2) { rule.mainClock.advanceTimeByFrame() }
        assertEquals("gone at once", 0f, shown.value, 0.001f)
    }

    @Test
    fun `TMP-15 where motion is reduced the handle moves and the numbers change at once`() {
        val tanrei = TanreiSystem.Tanrei
        val system = tanrei.copy(timePicker = tanrei.timePicker.copy(dialHandleColor = TanreiPaint.Role(TanreiColorRole.Success), dialContainerColor = TanreiPaint.Role(TanreiColorRole.Warning)))
        val colors = tanrei.colors.light
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                CompositionLocalProvider(LocalTanreiGlyphStandIn provides { name -> TimePickerFixtureGlyph(name) }) {
                    Box(Modifier.testTag("stage").size(480.dp, 640.dp)) {
                        TanreiTimePickerContent(props = TimePickerProps(value = TanreiTime(0, 30), hourCycle = TanreiTimePickerHourCycle.H23, locale = Locale.US))
                    }
                }
            }
        }
        rule.waitForIdle()
        val hour = rule.onNode(hasContentDescription("Hour") and SemanticsMatcher.keyIsDefined(SemanticsProperties.ProgressBarRangeInfo))
        rule.mainClock.autoAdvance = false
        hour.performSemanticsAction(SemanticsActions.SetProgress) { it(3f) }
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        repeat(3) { rule.mainClock.advanceTimeByFrame() }
        val tokens = system.timePicker
        val display = hour.getUnclippedBoundsInRoot()
        val stage = rule.onNodeWithTag("stage").getUnclippedBoundsInRoot()
        val centerX = (stage.left + stage.right) / 2
        val centerY = display.bottom + tokens.containerGap + tokens.dialContainerSize / 2
        val outer = tokens.dialContainerSize / 2 - tokens.dialPadding - tokens.dialHandleSize / 2
        val image = rule.onNodeWithTag("stage").captureToImage().toPixelMap()
        val pixel = with(rule.density) { image[(centerX + outer - stage.left).roundToPx(), (centerY + tokens.dialHandleSize / 2 - 3.dp - stage.top).roundToPx()] }
        val expected = colors[TanreiColorRole.Success]
        assertTrue("the handle at 03 at once: $pixel", maxOf(abs(expected.red - pixel.red), abs(expected.green - pixel.green), abs(expected.blue - pixel.blue)) <= 3f / 255f)
        rule.mainClock.autoAdvance = true
    }
}
