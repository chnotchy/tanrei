package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import android.view.KeyEvent
import android.view.View
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
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
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsNotFocused
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.click
import androidx.compose.ui.test.cancel
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.hasClickAction
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.isDialog
import androidx.compose.ui.test.isPopup
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performImeAction
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performMouseInput
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.test.performTextClearance
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.test.withKeyDown
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.IntRect
import androidx.compose.ui.unit.IntSize
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
import io.github.chnotchy.tanrei.tokens.TanreiDatePickerCondition
import io.github.chnotchy.tanrei.tokens.TanreiDatePickerConditionStateTokens
import io.github.chnotchy.tanrei.tokens.TanreiDatePickerStateTokens
import io.github.chnotchy.tanrei.tokens.TanreiFocusStyle
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiPressedFeedback
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import java.util.Locale
import kotlin.math.abs
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
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
 * Behaviour tests for `specs/date-picker.spec.json`. Each test names the behaviour id (`DTP-n`) it covers. Runs on the
 * JVM (Robolectric, native graphics) — no emulator needed.
 *
 * The overlays (DTP-1 … DTP-5, DTP-22) are tested on `TanreiDatePicker` opened from an opener button between two
 * focusable boxes — the modal one in its Dialog window, the docked one in its popup; everything the surface draws or does
 * on the in-place harness `TanreiDatePickerContent` (what the baselines draw), whose events are recorded as
 * `change:<dates>` and `close:<reason>`. Every picker is in en-US with today 2026-09-24 unless a test says otherwise.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w480dp-h720dp-xhdpi")
class TanreiDatePickerTest {
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
    private val tokens = tanrei.datePicker
    private val measure = tanrei.measure
    private val dockedSurface = tokens.dockedContainerColor.resolve(colors)
    private val cell = maxOf(tokens.cellSize, measure.targetTouch)

    private val events = mutableListOf<String>()
    private val glyphs = mutableListOf<String>()
    private var visible by mutableStateOf(false)
    private var value by mutableStateOf<TanreiDate?>(null)
    private var start by mutableStateOf<TanreiDate?>(null)
    private var end by mutableStateOf<TanreiDate?>(null)
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
                    // The glyphs the picker draws by name: the test stand-ins, recorded; the view they are drawn in is the
                    // overlay's window when the picker is in one.
                    LocalTanreiGlyphStandIn provides { name ->
                        glyphs += name
                        overlayView = LocalView.current
                        DatePickerFixtureGlyph(name)
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

    /** The in-place picker ([TanreiDatePickerContent]) of [props]: a modal one on a [stage] (480 × 640), a docked one padded by [STAGE_PADDING]. */
    private fun inPlace(
        props: DatePickerProps = docked(),
        system: TanreiSystem = tanrei,
        direction: LayoutDirection = LayoutDirection.Ltr,
        fontScale: Float = 1f,
        maxHeight: Int = Int.MAX_VALUE,
        stage: DpSize = DpSize(480.dp, 640.dp),
    ) = show(system, direction, fontScale) {
        val picker: @Composable () -> Unit = {
            TanreiDatePickerContent(
                modifier = Modifier.testTag(SURFACE),
                props = props,
                onClose = { events += "close:$it" },
                onChange = { events += "change:${describe(it)}" },
                maxHeight = maxHeight,
            )
        }
        if (props.presentation == TanreiDatePickerPresentation.Modal) Box(Modifier.size(stage)) { picker() } else Box(Modifier.padding(STAGE_PADDING)) { picker() }
    }

    /** An opener button between two focusable boxes, and the picker of [props] it opens; value, start and end are this test's. */
    private fun showPicker(props: DatePickerProps, system: TanreiSystem = tanrei, direction: LayoutDirection = LayoutDirection.Ltr) = show(system, direction) {
        Box(Modifier.fillMaxSize()) {
            Column(Modifier.padding(16.dp)) {
                Box(Modifier.testTag(BEFORE).size(8.dp).focusable())
                Box {
                    TanreiButton(text = "Pick", onClick = { visible = true }, modifier = Modifier.testTag(OPENER))
                    TanreiDatePicker(
                        visible = visible,
                        onClose = { reason ->
                            events += "close:$reason"
                            visible = false
                        },
                        modifier = Modifier.testTag(SURFACE),
                        presentation = props.presentation,
                        mode = props.mode,
                        value = value,
                        start = start,
                        end = end,
                        onChange = { selection ->
                            events += "change:${describe(selection)}"
                            value = selection.value
                            start = selection.start
                            end = selection.end
                        },
                        min = props.min,
                        max = props.max,
                        disabledDates = props.disabledDates,
                        isDateDisabled = props.isDateDisabled,
                        today = props.today,
                        firstDayOfWeek = props.firstDayOfWeek,
                        locale = props.locale,
                        entryMode = props.entryMode,
                        startView = props.startView,
                        labels = props.labels,
                    )
                }
                Box(Modifier.testTag(AFTER).size(8.dp).focusable())
            }
        }
    }

    private fun describe(selection: TanreiDateSelection) = listOfNotNull(selection.value, selection.start, selection.end).joinToString("..")

    private fun modal(
        mode: TanreiDatePickerMode = TanreiDatePickerMode.Single,
        value: TanreiDate? = if (mode == TanreiDatePickerMode.Single) SEP17 else null,
        start: TanreiDate? = null,
        end: TanreiDate? = null,
        entryMode: TanreiDatePickerEntryMode = TanreiDatePickerEntryMode.Calendar,
        startView: TanreiDatePickerStartView = TanreiDatePickerStartView.Day,
        min: TanreiDate? = null,
        max: TanreiDate? = null,
        today: TanreiDate? = TODAY,
        locale: Locale? = Locale.US,
        disabledDates: Set<TanreiDate> = emptySet(),
        isDateDisabled: ((TanreiDate) -> Boolean)? = null,
        labels: TanreiDatePickerLabels = TanreiDatePickerLabels(),
    ) = DatePickerProps(
        presentation = TanreiDatePickerPresentation.Modal, mode = mode, value = value, start = start, end = end, min = min, max = max,
        disabledDates = disabledDates, isDateDisabled = isDateDisabled, today = today, locale = locale, entryMode = entryMode, startView = startView, labels = labels,
    )

    private fun docked(
        mode: TanreiDatePickerMode = TanreiDatePickerMode.Single,
        value: TanreiDate? = if (mode == TanreiDatePickerMode.Single) SEP17 else null,
        start: TanreiDate? = null,
        end: TanreiDate? = null,
        min: TanreiDate? = null,
        max: TanreiDate? = null,
        disabledDates: Set<TanreiDate> = emptySet(),
        isDateDisabled: ((TanreiDate) -> Boolean)? = null,
        today: TanreiDate? = TODAY,
        firstDayOfWeek: TanreiDatePickerFirstDayOfWeek = TanreiDatePickerFirstDayOfWeek.Locale,
        locale: Locale? = Locale.US,
        startView: TanreiDatePickerStartView = TanreiDatePickerStartView.Day,
        entryMode: TanreiDatePickerEntryMode = TanreiDatePickerEntryMode.Calendar,
        labels: TanreiDatePickerLabels = TanreiDatePickerLabels(),
    ) = DatePickerProps(
        presentation = TanreiDatePickerPresentation.Docked, mode = mode, value = value, start = start, end = end, min = min, max = max,
        disabledDates = disabledDates, isDateDisabled = isDateDisabled, today = today, firstDayOfWeek = firstDayOfWeek, locale = locale,
        startView = startView, entryMode = entryMode, labels = labels,
    )

    // ── finders ──────────────────────────────────────────────────────────────

    private fun day(number: Int, month: String = "September", year: Int = 2026): SemanticsNodeInteraction =
        rule.onNode(hasContentDescription("$month $number, $year", substring = true))

    private fun viewToggle() = rule.onNode(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "Choose a year"))

    private fun previous() = rule.onNodeWithContentDescription("Previous month")

    private fun next() = rule.onNodeWithContentDescription("Next month")

    /** A year of the year view: named by the year, and today's label after the current year's. */
    private fun year(year: Int) = rule.onNode((hasContentDescription("$year") or hasContentDescription("$year, Today")) and hasClickAction())

    private fun ok() = rule.onNode(hasText("OK") and hasClickAction())

    private fun cancel() = rule.onNode(hasText("Cancel") and hasClickAction())

    private fun field(label: String) = rule.onNode(hasContentDescription(label) and hasSetTextAction())

    private fun surface() = rule.onNodeWithTag(SURFACE)

    private fun dialogs() = rule.onAllNodes(isDialog()).fetchSemanticsNodes().size

    private fun popups() = rule.onAllNodes(isPopup()).fetchSemanticsNodes().size

    private fun openFromKeyboard() {
        rule.onNodeWithTag(OPENER).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
    }

    // ── DTP-1: the modal presentation ────────────────────────────────────────

    @Test
    fun `DTP-1 a modal picker opens in a window of its own over the scrim, centred, hides what is behind, and counts as a modal dialog`() {
        value = SEP17
        showPicker(modal())
        val before = hostView!!.importantForAccessibility
        rule.onNodeWithTag(OPENER).performClick()
        rule.waitForIdle()
        assertEquals(1, dialogs())
        assertEquals(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS, hostView!!.importantForAccessibility)
        assertEquals(1, TanreiModalDialogs.open)
        val image = rule.onNode(isDialog()).captureToImage().toPixelMap()
        assertEquals("the scrim, as drawn", tokens.modalScrimColor.resolve(colors).alpha, image[2, 2].alpha, 0.02f)
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
    fun `DTP-1 the modal surface is the container color at its elevation with its corners, margin from the edges`() {
        inPlace(modal(), system = tanrei.copy(datePicker = tokens.copy(modalContainerColor = TanreiPaint.Role(TanreiColorRole.Warning))), stage = DpSize(480.dp, 640.dp))
        val box = surface().getUnclippedBoundsInRoot()
        assertPixel("the container color", stagePixel(box.left + 4.dp, box.top + 40.dp), colors[TanreiColorRole.Warning])
        assertTrue("margin from the edges", box.top >= tokens.modalContainerMargin && box.left >= tokens.modalContainerMargin)
        val scrim = tokens.modalScrimColor.resolve(colors).compositeOver(colors[TanreiColorRole.Surface])
        assertPixel("the very corner is the scrim's: the corner is rounded", stagePixel(box.left + 0.5.dp, box.top + 0.5.dp), scrim)
    }

    @Test
    @KeyboardNavigation
    fun `DTP-1 Tab and Shift+Tab wrap inside a modal picker - focus never leaves`() {
        value = SEP17
        showPicker(modal())
        openFromKeyboard()
        day(17).assertIsFocused()
        cancel().requestFocus()
        ok().requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithContentDescription("Switch to text entry").assertIsFocused().performKeyInput { withKeyDown(Key.ShiftLeft) { pressKey(Key.Tab) } }
        rule.waitForIdle()
        ok().assertIsFocused()
        assertEquals("nothing closed", emptyList<String>(), events)
    }

    // ── DTP-2: the docked presentation ───────────────────────────────────────

    @Test
    fun `DTP-2 a docked picker opens in a popup offset below its anchor with the start edges aligned, and draws no scrim`() {
        value = SEP17
        showPicker(docked())
        val before = rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap()
        rule.onNodeWithTag(OPENER).performClick()
        rule.waitForIdle()
        assertEquals(1, popups())
        assertEquals("not a dialog", 0, dialogs())
        val anchor = rule.onNodeWithTag(OPENER).fetchSemanticsNode().boundsInWindow
        val params = (overlayView!!.parent as View).layoutParams as android.view.WindowManager.LayoutParams
        with(rule.density) {
            assertEquals("docked-offset below the anchor", anchor.bottom + tokens.dockedOffset.toPx(), params.y.toFloat(), 1.5f)
            assertEquals("start edges aligned", anchor.left, params.x.toFloat(), 1.5f)
        }
        assertSameAs(before, rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap(), "the screen under the open picker")
        rule.onNodeWithTag(AFTER).assertExists()
    }

    @Test
    fun `DTP-2 without room below and with more above it flips, it shifts inside the viewport margin, and right-to-left aligns the end edges`() {
        val position = DockedPosition()
        val provider = DockedPositionProvider(offset = 8, margin = 16, position = position)
        val window = IntSize(1000, 1000)
        val surface = IntSize(360, 400)
        val low = IntRect(left = 100, top = 800, right = 300, bottom = 850)
        val flipped = provider.calculatePosition(low, window, LayoutDirection.Ltr, surface)
        assertFalse("flipped above", position.menu.below)
        assertEquals(800 - 8 - 400, flipped.y)
        val right = IntRect(left = 800, top = 100, right = 990, bottom = 150)
        assertEquals("shifted inside the margin", 1000 - 16 - 360, provider.calculatePosition(right, window, LayoutDirection.Ltr, surface).x)
        val middle = IntRect(left = 500, top = 100, right = 900, bottom = 150)
        assertEquals("right to left: the start is the right edge", 900 - 360, provider.calculatePosition(middle, window, LayoutDirection.Rtl, surface).x)
        assertEquals("the anchor is remembered for DTP-5's press on it", middle, position.anchor)
    }

    // ── DTP-3 / DTP-4: focus in and back ─────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `DTP-3 opening moves focus to the active day, to the displayed year in the year view, or to the first field - and DTP-4 closing returns it`() {
        value = SEP17
        showPicker(modal())
        openFromKeyboard()
        day(17).assertIsFocused()
        visible = false
        rule.waitForIdle()
        rule.onNodeWithTag(OPENER).assertIsFocused()
        showPicker(modal(startView = TanreiDatePickerStartView.Year))
        openFromKeyboard()
        year(2026).assertIsFocused()
        visible = false
        rule.waitForIdle()
        showPicker(modal(entryMode = TanreiDatePickerEntryMode.Text))
        openFromKeyboard()
        field("Date").assertIsFocused()
        visible = false
        rule.waitForIdle()
        rule.onNodeWithTag(OPENER).assertIsFocused()
    }

    @Test
    @KeyboardNavigation
    fun `DTP-3 DTP-4 a docked picker takes focus to its active day and gives it back to the anchor`() {
        value = SEP17
        showPicker(docked())
        openFromKeyboard()
        assertEquals(1, popups())
        day(17).assertIsFocused().performKeyInput { pressKey(Key.Escape) }
        rule.waitForIdle()
        assertEquals(listOf("close:Escape"), events)
        assertEquals(0, popups())
        rule.onNodeWithTag(OPENER).assertIsFocused()
    }

    @Test
    @KeyboardNavigation
    fun `DTP-3 focus moves when the picker opens, not when its motion ends`() {
        value = SEP17
        showPicker(modal(), system = tanrei.copy(datePicker = tokens.copy(modalMotionOpenDuration = 5000)))
        rule.onNodeWithTag(OPENER).requestFocus()
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag(OPENER).performKeyInput { pressKey(Key.Enter) }
        val opened = rule.mainClock.currentTime
        fun focused() = rule.onAllNodes(hasContentDescription("September 17, 2026", substring = true)).fetchSemanticsNodes().any { it.config.getOrNull(SemanticsProperties.Focused) == true }
        var frames = 0
        while (!focused() && frames < 60) {
            rule.mainClock.advanceTimeByFrame()
            frames++
        }
        day(17).assertIsFocused()
        assertTrue("focused while the picker still opens: after ${rule.mainClock.currentTime - opened} ms of 5000", rule.mainClock.currentTime - opened < 2000)
        rule.mainClock.autoAdvance = true
    }

    // ── DTP-5: close, with its reason ────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `DTP-5 Escape, back, the scrim and Cancel each emit close once with their reason and commit nothing`() {
        value = SEP17
        showPicker(modal())
        openFromKeyboard()
        day(17).performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        day(18).performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        day(18).performKeyInput { pressKey(Key.Escape) }
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
        assertEquals("nothing committed", SEP17, value)
    }

    @Test
    @KeyboardNavigation
    fun `DTP-5 Tab out of a docked picker closes it and moves on from the anchor - Shift+Tab from the view toggle moves back`() {
        value = SEP17
        showPicker(docked())
        openFromKeyboard()
        day(17).assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        assertEquals(listOf("close:Tab"), events)
        rule.onNodeWithTag(AFTER).assertIsFocused()
        events.clear()
        openFromKeyboard()
        viewToggle().requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        assertEquals("Tab inside the picker moves on inside it", emptyList<String>(), events)
        previous().assertIsFocused()
        viewToggle().requestFocus().performKeyInput { withKeyDown(Key.ShiftLeft) { pressKey(Key.Tab) } }
        rule.waitForIdle()
        assertEquals(listOf("close:Tab"), events)
        rule.onNodeWithTag(BEFORE).assertIsFocused()
    }

    @Test
    fun `DTP-5 a press outside a docked picker and its anchor closes it - a press on the anchor does not, and neither reaches what is under it`() {
        value = SEP17
        showPicker(docked())
        rule.onNodeWithTag(OPENER).performClick()
        rule.waitForIdle()
        val window = overlayView!!.parent as View
        fun press(x: Float, y: Float) {
            val down = android.view.MotionEvent.obtain(0L, 0L, android.view.MotionEvent.ACTION_DOWN, x, y, 0)
            rule.runOnUiThread { window.dispatchTouchEvent(down) }
            down.recycle()
            rule.waitForIdle()
        }
        // The anchor's centre, in the popup window's coordinates.
        val anchor = rule.onNodeWithTag(OPENER).fetchSemanticsNode().boundsInWindow
        val host = IntArray(2).also { hostView!!.getLocationOnScreen(it) }
        val popup = IntArray(2).also { window.getLocationOnScreen(it) }
        press(anchor.center.x + host[0] - popup[0], anchor.center.y + host[1] - popup[1])
        assertEquals("a press on the anchor", emptyList<String>(), events)
        press(window.width + 50f, window.height + 50f)
        assertEquals(listOf("close:Outside"), events)
    }

    @Test
    fun `DTP-5 the platform's back and focus leaving the docked picker's window each emit close once`() {
        value = SEP17
        showPicker(docked())
        rule.onNodeWithTag(OPENER).performClick()
        rule.waitForIdle()
        day(17).performKeyInput { pressKey(Key.Back) }
        rule.waitForIdle()
        assertEquals(listOf("close:Back"), events)
        events.clear()
        rule.onNodeWithTag(OPENER).performClick()
        rule.waitForIdle()
        val root = org.robolectric.shadow.api.Shadow.extract<org.robolectric.shadows.ShadowViewRootImpl>(overlayView!!.rootView.parent)
        rule.runOnUiThread { root.callWindowFocusChanged(true) }
        rule.waitForIdle()
        assertEquals("focused: nothing yet", emptyList<String>(), events)
        rule.runOnUiThread { root.callWindowFocusChanged(false) }
        rule.waitForIdle()
        assertEquals(listOf("close:FocusOut"), events)
    }

    // ── DTP-6 / DTP-7: committing ────────────────────────────────────────────

    @Test
    fun `DTP-6 a modal picker holds a pending choice - shown in the header and the calendar - and only OK commits it, change then close`() {
        inPlace(modal())
        day(18).performClick()
        rule.waitForIdle()
        rule.onNodeWithText("Fri, Sep 18").assertExists()
        day(18).assertIsSelected()
        day(17).assertIsNotSelected()
        assertEquals("nothing emitted before OK", emptyList<String>(), events)
        ok().performClick()
        rule.waitForIdle()
        assertEquals(listOf("change:2026-09-18", "close:Confirm"), events)
    }

    @Test
    fun `DTP-6 OK with an unchanged choice only closes, a value set while open changes nothing, and OK is disabled while the choice is incomplete`() {
        value = SEP17
        showPicker(modal())
        rule.onNodeWithTag(OPENER).performClick()
        rule.waitForIdle()
        value = TanreiDate(2026, 9, 20)
        rule.waitForIdle()
        rule.onNodeWithText("Thu, Sep 17").assertExists()
        ok().performClick()
        rule.waitForIdle()
        assertEquals("the choice it opened with: no change", listOf("close:Confirm"), events)
        events.clear()
        inPlace(modal(mode = TanreiDatePickerMode.Range))
        ok().assertIsNotEnabled()
        day(10).performClick()
        rule.waitForIdle()
        ok().assertIsNotEnabled()
        day(16).performClick()
        rule.waitForIdle()
        ok().assertIsEnabled().performClick()
        rule.waitForIdle()
        assertEquals(listOf("change:2026-09-10..2026-09-16", "close:Confirm"), events)
    }

    @Test
    fun `DTP-7 a docked picker commits a completed choice - change then close with select - and a range's start emits nothing`() {
        inPlace(docked())
        day(18).performClick()
        rule.waitForIdle()
        assertEquals(listOf("change:2026-09-18", "close:Select"), events)
        events.clear()
        inPlace(docked(value = SEP17))
        day(17).performClick()
        rule.waitForIdle()
        assertEquals("the same date: no change", listOf("close:Select"), events)
        events.clear()
        inPlace(docked(mode = TanreiDatePickerMode.Range))
        day(10).performClick()
        rule.waitForIdle()
        assertEquals("a start alone", emptyList<String>(), events)
        day(14).performClick()
        rule.waitForIdle()
        assertEquals(listOf("change:2026-09-10..2026-09-14", "close:Select"), events)
    }

    // ── DTP-8 / DTP-9: choosing ──────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `DTP-8 a day is chosen by pointer, Enter and Space`() {
        inPlace(modal())
        day(18).performClick()
        rule.waitForIdle()
        day(18).assertIsSelected()
        day(18).requestFocus().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        day(19).assertIsFocused().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        day(19).assertIsSelected()
        day(19).performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        day(20).performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        day(20).assertIsSelected()
        day(19).assertIsNotSelected()
    }

    @Test
    fun `DTP-9 a range starts, ends, starts again after both are chosen or before the start, and a one-day range is start and end`() {
        val none = TanreiDateSelection()
        val a = tanreiChoose(none, SEP10, single = false)
        assertEquals(TanreiDateSelection(start = SEP10), a)
        val b = tanreiChoose(a, SEP16, single = false)
        assertEquals(TanreiDateSelection(start = SEP10, end = SEP16), b)
        assertEquals("both chosen: starts again", TanreiDateSelection(start = SEP17), tanreiChoose(b, SEP17, single = false))
        assertEquals("before the start: starts again", TanreiDateSelection(start = TanreiDate(2026, 9, 5)), tanreiChoose(a, TanreiDate(2026, 9, 5), single = false))
        assertEquals("the same day: a one-day range", TanreiDateSelection(start = SEP10, end = SEP10), tanreiChoose(a, SEP10, single = false))
        // Unavailable days between them stay inside the range, exposed as unavailable (and selected: they are in it).
        inPlace(docked(mode = TanreiDatePickerMode.Range, start = SEP10, end = SEP16, disabledDates = setOf(TanreiDate(2026, 9, 13))))
        day(13).assertIsNotEnabled().assertIsSelected()
        assertEquals(TanreiDatePickerCondition.InRange, tanreiDayCondition(TanreiDate(2026, 9, 13), TanreiDateSelection(start = SEP10, end = SEP16), TODAY))
    }

    // ── DTP-10: conditions ───────────────────────────────────────────────────

    @Test
    fun `DTP-10 a day draws one condition by precedence selected, in-range, today, unselected - a year selected, today, unselected`() {
        val range = TanreiDateSelection(start = SEP10, end = TODAY.plusDays(2))
        assertEquals(TanreiDatePickerCondition.Selected, tanreiDayCondition(SEP10, range, TODAY))
        assertEquals("today inside a range is in-range", TanreiDatePickerCondition.InRange, tanreiDayCondition(TODAY, range, TODAY))
        assertEquals("today chosen is selected", TanreiDatePickerCondition.Selected, tanreiDayCondition(TODAY, TanreiDateSelection(value = TODAY), TODAY))
        assertEquals(TanreiDatePickerCondition.Today, tanreiDayCondition(TODAY, TanreiDateSelection(value = SEP17), TODAY))
        assertEquals(TanreiDatePickerCondition.Unselected, tanreiDayCondition(SEP10, TanreiDateSelection(value = SEP17), TODAY))
        assertEquals(TanreiDatePickerCondition.Selected, tanreiYearCondition(2026, shownYear = 2026, today = TanreiDate(2027, 1, 15)))
        assertEquals(TanreiDatePickerCondition.Today, tanreiYearCondition(2027, shownYear = 2026, today = TanreiDate(2027, 1, 15)))
        assertEquals(TanreiDatePickerCondition.Unselected, tanreiYearCondition(2028, shownYear = 2026, today = TanreiDate(2027, 1, 15)))
        // Drawn: the selected fill, today's ring (its outline color), and nothing for an unselected day.
        inPlace(docked())
        assertPixel("the selected container", dayPixel(17, cell / 2, SQUARE_TOP_PROBE), fill(tokens.conditions.selected.enabled.containerColor))
        assertPixel("an unselected day draws no container", dayPixel(18, cell / 2, SQUARE_TOP_PROBE), dockedSurface)
        val ringInset = (cell - tokens.dayContainerSize) / 2
        assertPixel("today's ring", dayPixel(24, cell / 2, ringInset + tokens.outlineWidth / 2), fill(tokens.conditions.today.enabled.outlineColor))
    }

    @Test
    fun `DTP-10 the view toggle draws from the unselected condition`() {
        val system = tanrei.withDatePicker(TanreiDatePickerCondition.Unselected, TanreiInteractionState.Enabled) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Warning)) }
        inPlace(docked(), system = system)
        val toggle = viewToggle().getUnclippedBoundsInRoot()
        val height = toggle.bottom - toggle.top
        assertPixel("its container", nodePixel(viewToggle(), 3.dp, height / 2), colors[TanreiColorRole.Warning])
    }

    // ── DTP-11: the grid ─────────────────────────────────────────────────────

    @Test
    fun `DTP-11 seven columns of cells at least the target, the month's first day in its weekday's column, six rows kept, inset by the paddings`() {
        inPlace(docked())
        val box = surface().getUnclippedBoundsInRoot()
        val sunday = rule.onNodeWithContentDescription("Sunday").getUnclippedBoundsInRoot()
        assertEquals("padding-inline", (box.left + tokens.containerPaddingInline).value, sunday.left.value, 0.6f)
        day(1).assertWidthIs(cell)
        val first = day(1).getUnclippedBoundsInRoot()
        assertEquals("September 1, 2026 is a Tuesday: the third column", (sunday.left + cell * 2).value, first.left.value, 0.6f)
        val height = box.bottom - box.top
        // September needs five rows, August six, February 2026 four: the surface keeps its height.
        next().performClick() // October
        rule.waitForIdle()
        repeat(2) { previous().performClick() } // August
        rule.waitForIdle()
        day(31, "August").assertExists()
        assertEquals(height.value, surface().getUnclippedBoundsInRoot().let { it.bottom - it.top }.value, 0.6f)
        val last = day(31, "August").getUnclippedBoundsInRoot()
        assertEquals("padding-block below the grid", (box.bottom - tokens.containerPaddingBlock).value, last.bottom.value, 0.6f)
        val wide = 56.dp
        inPlace(docked(), system = tanrei.copy(datePicker = tokens.copy(cellSize = wide, containerPaddingInline = 20.dp)))
        day(1).assertWidthIs(wide)
        assertEquals((surface().getUnclippedBoundsInRoot().left + 20.dp).value, rule.onNodeWithContentDescription("Sunday").getUnclippedBoundsInRoot().left.value, 0.6f)
        // A window narrower than the surface and its margins, wide enough for it: the cells keep the target size (DTP-38).
        inPlace(modal(), stage = DpSize(cell * 7 + tokens.containerPaddingInline * 2 + tokens.modalContainerMargin, 640.dp))
        day(1).assertWidthIs(cell)
        val sundayLeft = rule.onNodeWithContentDescription("Sunday").getUnclippedBoundsInRoot().left
        assertEquals("the grid keeps its seven cells", (cell * 6).value, (rule.onNodeWithContentDescription("Saturday").getUnclippedBoundsInRoot().left - sundayLeft).value, 0.6f)
    }

    // ── DTP-12: a day's drawing, and the band ────────────────────────────────

    @Test
    fun `DTP-12 in-range days join into a band across their cells, and a range's start and end draw the half of their cell toward the other`() {
        inPlace(docked(mode = TanreiDatePickerMode.Range, start = SEP10, end = SEP16))
        val band = fill(tokens.conditions.inRange.enabled.containerColor)
        val middle = cell / 2
        assertPixel("an in-range day: the band at its start edge", dayPixel(11, 0.5.dp, middle), band)
        assertPixel("an in-range day: the band at its end edge", dayPixel(11, cell - 0.5.dp, middle), band)
        assertPixel("the row breaks with square ends: the band at a row's first cell", dayPixel(13, 0.5.dp, middle), band)
        assertPixel("the start: the half toward the end", dayPixel(10, cell - 0.5.dp, middle), band)
        assertPixel("the start: nothing toward the start", dayPixel(10, 0.5.dp, middle), dockedSurface)
        assertPixel("the start: its own square", dayPixel(10, middle, SQUARE_TOP_PROBE), fill(tokens.conditions.selected.enabled.containerColor))
        assertPixel("the end: the half toward the start", dayPixel(16, 0.5.dp, middle), band)
        assertPixel("the end: nothing toward the end", dayPixel(16, cell - 0.5.dp, middle), dockedSurface)
        assertPixel("outside the range", dayPixel(17, 0.5.dp, middle), dockedSurface)
        val bandTop = (cell - tokens.dayContainerSize) / 2
        assertPixel("the band is a day container tall", dayPixel(11, 1.dp, bandTop - 1.dp), dockedSurface)
        inPlace(docked(mode = TanreiDatePickerMode.Range, start = SEP10, end = SEP10))
        assertPixel("a one-day range draws no half cell", dayPixel(10, cell - 0.5.dp, middle), dockedSurface)
    }

    @Test
    fun `DTP-12 a day's container is a square of the container size and shape, centred, with its number in the label color`() {
        val size = 40.dp
        val system = tanrei.copy(datePicker = tokens.copy(dayContainerSize = size))
        inPlace(docked(), system = system)
        val inset = (cell - size) / 2
        val selected = fill(tokens.conditions.selected.enabled.containerColor)
        assertPixel("inside the square", dayPixel(17, cell / 2, inset + 1.dp), selected)
        assertPixel("above it", dayPixel(17, cell / 2, inset - 1.dp), dockedSurface)
        val label = tokens.conditions.selected.enabled.labelColor.resolve(colors)
        assertTrue("the number in the label color", dayPixels(17).any { isClose(it, label) })
    }

    // ── DTP-13: weekday names ────────────────────────────────────────────────

    @Test
    fun `DTP-13 weekday names are the locale's narrow names from the first day, named by their full names, and take no focus`() {
        inPlace(docked())
        rule.onNodeWithContentDescription("Sunday").assert(SemanticsMatcher.keyNotDefined(SemanticsActions.RequestFocus))
        val node = rule.onNodeWithContentDescription("Sunday").fetchSemanticsNode()
        assertEquals(0, node.config[SemanticsProperties.CollectionItemInfo].columnIndex)
        assertEquals(0, node.config[SemanticsProperties.CollectionItemInfo].rowIndex)
        assertEquals(listOf("S", "M", "T", "W", "T", "F", "S"), TanreiDateText(Locale.US).narrowWeekdays)
        assertEquals("日", TanreiDateText(Locale.JAPAN).narrowWeekdays[0])
        assertEquals("Sunday", TanreiDateText(Locale.US).longWeekdays[0])
    }

    // ── DTP-14: the navigation row ───────────────────────────────────────────

    @Test
    fun `DTP-14 previous and next are standard icon buttons named by their labels, disabled at min's and max's months and hidden in the year view`() {
        inPlace(docked(min = TanreiDate(2026, 9, 3), max = TanreiDate(2026, 10, 20)))
        previous().assertIsNotEnabled()
        next().assertIsEnabled().performClick()
        rule.waitForIdle()
        next().assertIsNotEnabled()
        previous().assertIsEnabled()
        assertTrue("chevrons toward the start and the end", glyphs.containsAll(listOf("chevron_left", "chevron_right")))
        val toggle = viewToggle().getUnclippedBoundsInRoot()
        val nextBox = next().getUnclippedBoundsInRoot()
        val previousBox = previous().getUnclippedBoundsInRoot()
        assertTrue("at the end of the view toggle's row", previousBox.left > toggle.right && nextBox.left > previousBox.right)
        viewToggle().performClick()
        rule.waitForIdle()
        previous().assertDoesNotExist()
        next().assertDoesNotExist()
    }

    // ── DTP-15: the view toggle ──────────────────────────────────────────────

    @Test
    fun `DTP-15 the view toggle shows the month and year and a chevron that turns half a turn in the year view, at least its height, its hit area the target`() {
        inPlace(docked())
        viewToggle().assert(hasText("September 2026"))
        val box = viewToggle().getUnclippedBoundsInRoot()
        assertTrue("its hit area is the touch target", box.bottom - box.top >= measure.targetTouch)
        assertTrue(glyphs.contains("expand_more"))
        viewToggle().performClick()
        rule.waitForIdle()
        year(2026).assertExists()
        viewToggle().performClick()
        rule.waitForIdle()
        day(17).assertExists()
    }

    @Test
    fun `DTP-15 the chevron turns over the state duration`() {
        inPlace(docked(), system = tanrei.copy(datePicker = tokens.copy(motionStateDuration = 400, motionStateEasing = tanrei.motion.easing.linear, motionPageDuration = 0)))
        val chevron = { chevronImage() }
        val down = chevron()
        rule.mainClock.autoAdvance = false
        viewToggle().performClick()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(200)
        val half = chevron()
        rule.mainClock.advanceTimeBy(400)
        val up = chevron()
        rule.mainClock.autoAdvance = true
        assertFalse("turned by the end", sameImage(down, up))
        assertFalse("half way: neither", sameImage(half, down) || sameImage(half, up))
    }

    // ── DTP-16 / DTP-19: the year view ───────────────────────────────────────

    @Test
    fun `DTP-16 the year list runs from min's year to max's (1900 to 2100 without them), in rows of three, the displayed year third in view`() {
        inPlace(docked(startView = TanreiDatePickerStartView.Year))
        year(1900).assertExists()
        year(2100).assertExists()
        val shown = year(2026).getUnclippedBoundsInRoot()
        val first = rule.onNodeWithContentDescription("Sunday", useUnmergedTree = true)
        first.assertDoesNotExist()
        val box = surface().getUnclippedBoundsInRoot()
        val top = box.top + tokens.containerPaddingBlock + tokens.cellSize
        assertEquals("the third row in view", (top + cell * 2).value, shown.top.value, 1f)
        assertEquals("a third of the grid wide", (cell * 7 / 3).value, (shown.right - shown.left).value, 0.6f)
        inPlace(docked(startView = TanreiDatePickerStartView.Year, min = TanreiDate(2020, 1, 1), max = TanreiDate(2030, 12, 31)))
        year(2019).assertDoesNotExist()
        year(2020).assertExists()
        year(2031).assertDoesNotExist()
    }

    @Test
    @KeyboardNavigation
    fun `DTP-19 Right and Left move one year, Down and Up a row, Home and End to the ends, and Enter chooses - DTP-16 the day view comes back on that year`() {
        assertEquals(2027, tanreiYearKeyTarget(Key.DirectionRight, 2026, rtl = false, first = 1900, last = 2100))
        assertEquals("mirrored", 2025, tanreiYearKeyTarget(Key.DirectionRight, 2026, rtl = true, first = 1900, last = 2100))
        assertEquals(2029, tanreiYearKeyTarget(Key.DirectionDown, 2026, rtl = false, first = 1900, last = 2100))
        assertEquals(2023, tanreiYearKeyTarget(Key.DirectionUp, 2026, rtl = false, first = 1900, last = 2100))
        assertEquals(1900, tanreiYearKeyTarget(Key.MoveHome, 2026, rtl = false, first = 1900, last = 2100))
        assertEquals(2100, tanreiYearKeyTarget(Key.MoveEnd, 2026, rtl = false, first = 1900, last = 2100))
        assertEquals("never past the ends", 2100, tanreiYearKeyTarget(Key.DirectionDown, 2099, rtl = false, first = 1900, last = 2100))
        inPlace(modal(max = TanreiDate(2028, 3, 31)))
        viewToggle().performClick()
        rule.waitForIdle()
        year(2026).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        year(2027).assertIsFocused().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        year(2028).assertIsFocused().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        // September 2028 is after max: the month is clamped to March 2028.
        viewToggle().assert(hasText("March 2028"))
        day(1, "March", 2028).assertIsFocused()
        rule.onNodeWithText("Thu, Sep 17").assertExists()
        assertEquals("no choice changed", emptyList<String>(), events)
        viewToggle().performClick()
        rule.waitForIdle()
        year(2028).assertIsSelected()
        viewToggle().performClick()
        rule.waitForIdle()
        viewToggle().assert(hasText("March 2028"))
    }

    // ── DTP-17 / DTP-18: the active day and the keys ─────────────────────────

    @Test
    @KeyboardNavigation
    fun `DTP-17 the grid is one tab stop, the active day - the chosen date, today, the first available day or the first day`() {
        val config = readDatePickerConfig(docked(value = SEP17), TanreiDateText(Locale.US), TODAY)
        val september = TanreiCalendarMonth(2026, 9)
        assertEquals(SEP17, activeDayOf(september, TanreiDateSelection(value = SEP17), config))
        assertEquals(TODAY, activeDayOf(september, TanreiDateSelection(), config))
        val limited = readDatePickerConfig(docked(value = null, today = TanreiDate(2026, 10, 2), min = TanreiDate(2026, 9, 3)), TanreiDateText(Locale.US), TODAY)
        assertEquals(TanreiDate(2026, 9, 3), activeDayOf(september, TanreiDateSelection(), limited))
        val none = readDatePickerConfig(docked(value = null, isDateDisabled = { true }, today = TanreiDate(2026, 10, 2)), TanreiDateText(Locale.US), TODAY)
        assertEquals(TanreiDate(2026, 9, 1), activeDayOf(september, TanreiDateSelection(), none))
        inPlace(docked())
        viewToggle().requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        previous().assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        next().assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        day(17).assertIsFocused()
        day(18).requestFocus()
        day(18).assertIsNotFocused()
    }

    @Test
    fun `DTP-18 the keys move the active day - a day, a week, the week row's ends, a month, a year - clamped to min and max`() {
        fun move(key: Key, from: TanreiDate = SEP17, shift: Boolean = false, rtl: Boolean = false, firstDay: Int = 0, min: TanreiDate? = null, max: TanreiDate? = null) =
            tanreiDayKeyTarget(key, shift, from, rtl, firstDay, min, max)
        assertEquals(TanreiDate(2026, 9, 18), move(Key.DirectionRight))
        assertEquals(TanreiDate(2026, 9, 16), move(Key.DirectionLeft))
        assertEquals("right to left: Right is the previous day", TanreiDate(2026, 9, 16), move(Key.DirectionRight, rtl = true))
        assertEquals(TanreiDate(2026, 9, 24), move(Key.DirectionDown))
        assertEquals(TanreiDate(2026, 9, 10), move(Key.DirectionUp))
        assertEquals("Sunday, the row's first", TanreiDate(2026, 9, 13), move(Key.MoveHome))
        assertEquals("Saturday, the row's last", TanreiDate(2026, 9, 19), move(Key.MoveEnd))
        assertEquals("Monday first", TanreiDate(2026, 9, 14), move(Key.MoveHome, firstDay = 1))
        assertEquals(TanreiDate(2026, 10, 17), move(Key.PageDown))
        assertEquals(TanreiDate(2026, 8, 17), move(Key.PageUp))
        assertEquals("a shorter month: its last day", TanreiDate(2026, 2, 28), move(Key.PageDown, from = TanreiDate(2026, 1, 31)))
        assertEquals(TanreiDate(2027, 9, 17), move(Key.PageDown, shift = true))
        assertEquals(TanreiDate(2025, 9, 17), move(Key.PageUp, shift = true))
        assertEquals("never before min", TanreiDate(2026, 9, 15), move(Key.DirectionUp, min = TanreiDate(2026, 9, 15)))
        assertEquals("never after max", TanreiDate(2026, 9, 20), move(Key.PageDown, max = TanreiDate(2026, 9, 20)))
        assertNull(move(Key.A))
    }

    @Test
    @KeyboardNavigation
    fun `DTP-18 moving past the month shows the next one, focus follows, and unavailable days are reached but not chosen`() {
        inPlace(docked(disabledDates = setOf(TanreiDate(2026, 9, 18))))
        day(17).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        day(18).assertIsFocused().assertIsNotEnabled().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals("an unavailable day is not chosen", emptyList<String>(), events)
        day(18).performKeyInput { pressKey(Key.PageDown) }
        rule.waitForIdle()
        viewToggle().assert(hasText("October 2026"))
        day(18, "October").assertIsFocused()
        day(18, "October").performKeyInput { pressKey(Key.PageUp) }
        rule.waitForIdle()
        day(18).assertIsFocused()
    }

    // ── DTP-20: paging ───────────────────────────────────────────────────────

    @Test
    fun `DTP-20 previous and next show the month, keep focus, make the same day number active (clamped) and announce the month once`() {
        val heard = mutableListOf<String>()
        val previousAnnouncer = TanreiDatePickerAnnouncer.announce
        TanreiDatePickerAnnouncer.announce = { _, text -> heard += text }
        try {
            inPlace(docked(value = TanreiDate(2026, 1, 31), today = TanreiDate(2026, 1, 5)))
            next().performClick()
            rule.waitForIdle()
            viewToggle().assert(hasText("February 2026"))
            assertEquals(listOf("February 2026"), heard)
            // The active day is the last of the shorter month: the one Tab stop.
            day(28, "February").performSemanticsAction(SemanticsActions.RequestFocus)
            rule.waitForIdle()
            day(28, "February").assertIsFocused()
            viewToggle().performClick()
            rule.waitForIdle()
            year(2027).performClick()
            rule.waitForIdle()
            assertEquals(listOf("February 2026", "February 2027"), heard)
        } finally {
            TanreiDatePickerAnnouncer.announce = previousAnnouncer
        }
    }

    @Test
    @KeyboardNavigation
    fun `DTP-20 focus stays on the button that paged`() {
        inPlace(docked())
        next().requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        viewToggle().assert(hasText("October 2026"))
        next().assertIsFocused()
    }

    // ── DTP-21: paging and view motion ───────────────────────────────────────

    @Test
    fun `DTP-21 a later month slides in from the end over the page motion, and the weekday row does not move`() {
        inPlace(docked(), system = tanrei.copy(datePicker = tokens.copy(motionPageDuration = 400, motionPageEasing = tanrei.motion.easing.linear)))
        val sunday = rule.onNodeWithContentDescription("Sunday").getUnclippedBoundsInRoot()
        rule.mainClock.autoAdvance = false
        next().performClick()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(200)
        val sliding = day(1, "October").getUnclippedBoundsInRoot()
        day(1).assertExists() // the old month, sliding out
        assertEquals("the weekday row stays", sunday.left.value, rule.onNodeWithContentDescription("Sunday").getUnclippedBoundsInRoot().left.value, 0.1f)
        rule.mainClock.advanceTimeBy(400)
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        val settled = day(1, "October").getUnclippedBoundsInRoot()
        assertTrue("half way, still toward the end: ${sliding.left} vs ${settled.left}", sliding.left > settled.left + cell)
        day(1).assertDoesNotExist()
    }

    @Test
    fun `DTP-21 switching to the year view cross-fades over the page motion`() {
        inPlace(docked(), system = tanrei.copy(datePicker = tokens.copy(motionPageDuration = 400, motionPageEasing = tanrei.motion.easing.linear)))
        rule.mainClock.autoAdvance = false
        viewToggle().performClick()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(200)
        day(17).assertExists()
        year(2026).assertExists()
        rule.mainClock.advanceTimeBy(400)
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        day(17).assertDoesNotExist()
    }

    // ── DTP-22: open and close motion ────────────────────────────────────────

    @Test
    fun `DTP-22 each presentation is shown over its open duration and hidden over its close duration`() {
        val linear = tanrei.motion.easing.linear
        val system = tanrei.copy(
            datePicker = tokens.copy(
                modalMotionOpenDuration = 400, modalMotionOpenEasing = linear, modalMotionCloseDuration = 200, modalMotionCloseEasing = linear,
                dockedMotionOpenDuration = 200, dockedMotionOpenEasing = linear, dockedMotionCloseDuration = 100, dockedMotionCloseEasing = linear,
            ),
        )
        for ((modal, open, close) in listOf(Triple(true, 400L, 200L), Triple(false, 200L, 100L))) {
            var shown: androidx.compose.runtime.State<Float>? = null
            visible = false
            show(system) {
                val state = androidx.compose.runtime.remember { androidx.compose.animation.core.MutableTransitionState(false) }
                state.targetState = visible
                shown = rememberTanreiDatePickerShown(state, TanreiTheme.tokens.datePicker, modal)
            }
            rule.mainClock.autoAdvance = false
            visible = true
            androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
            rule.mainClock.advanceTimeByFrame()
            rule.mainClock.advanceTimeBy(open / 2)
            assertEquals("modal=$modal half way in", 0.5f, shown!!.value, 0.12f)
            rule.mainClock.advanceTimeBy(open)
            assertEquals(1f, shown!!.value, 0.001f)
            visible = false
            androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
            rule.mainClock.advanceTimeByFrame()
            rule.mainClock.advanceTimeBy(close / 2)
            assertEquals("modal=$modal half way out", 0.5f, shown!!.value, 0.15f)
            rule.mainClock.advanceTimeBy(close)
            assertEquals(0f, shown!!.value, 0.001f)
            rule.mainClock.autoAdvance = true
        }
    }

    @Test
    fun `DTP-22 the modal surface grows about its centre from the enter scale while it enters, and only fades while it leaves`() {
        assertTrue(tokens.modalMotionEnterScale < 1f)
        val system = tanrei.copy(datePicker = tokens.copy(modalMotionEnterScale = 0.5f))
        fun drawnWidth(): Dp {
            val map = stage()
            val box = surface().getUnclippedBoundsInRoot()
            val stageBounds = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
            val back = map[2, 2]
            return with(rule.density) {
                val y = ((box.top + box.bottom) / 2 - stageBounds.top).roundToPx()
                val xs = (0 until map.width).filter { x -> !isClose(map[x, y], back, 24f / 255f) }
                if (xs.isEmpty()) 0.dp else (xs.last() - xs.first() + 1).toDp()
            }
        }
        fun area(shown: Float, entering: Boolean) = show(system) {
            Box(Modifier.size(480.dp, 640.dp)) {
                TanreiDatePickerModalArea(modal(), { _, _ -> }, {}, Modifier.testTag(SURFACE), shown = { shown }, entering = entering, moveFocusIn = false)
            }
        }
        area(1f, entering = true)
        val full = drawnWidth()
        area(0.5f, entering = true)
        val half = drawnWidth()
        assertEquals("half way in: three quarters of its width ($half of $full)", full.value * 0.75f, half.value, full.value * 0.06f)
        area(0.5f, entering = false)
        assertEquals("leaving: whole, fading", full.value, drawnWidth().value, full.value * 0.02f + 2f)
    }

    // ── DTP-23 / DTP-24: header and actions ──────────────────────────────────

    @Test
    fun `DTP-23 the header shows the label and the pending choice in the locale's form, a part not chosen in the placeholder color, with the year when not current`() {
        inPlace(modal())
        rule.onNodeWithText("Select date").assertExists()
        rule.onNodeWithText("Thu, Sep 17").assertExists()
        inPlace(modal(today = TanreiDate(2027, 1, 15)))
        rule.onNodeWithText("Thu, Sep 17, 2026").assertExists()
        inPlace(modal(mode = TanreiDatePickerMode.Range, start = SEP10, end = SEP16))
        rule.onNodeWithText("Sep 10 – Sep 16").assertExists()
        inPlace(modal(mode = TanreiDatePickerMode.Range, start = SEP10))
        val header = rule.onNodeWithText("Sep 10 – End date").fetchSemanticsNode().config[SemanticsProperties.Text].single()
        val placeholder = tokens.headerPlaceholderColor.resolve(colors)
        val valueColor = tokens.headerValueColor.resolve(colors)
        val endSpan = header.spanStyles.single { header.text.substring(it.start, it.end) == "End date" }
        assertEquals(placeholder, endSpan.item.color)
        assertEquals(valueColor, header.spanStyles.single { header.text.substring(it.start, it.end) == "Sep 10" }.item.color)
        inPlace(modal(value = null))
        rule.onNodeWithText("Date").assertExists()
        assertEquals("the header in Japanese", "9月17日(木)", TanreiDateText(Locale.JAPAN).headerDate(SEP17, 2026))
    }

    @Test
    fun `DTP-23 the entry-mode toggle is a standard icon button at the end of the value's line, keyboard or calendar by entry - the divider below`() {
        inPlace(modal())
        val toggle = rule.onNodeWithContentDescription("Switch to text entry")
        toggle.assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
        assertTrue(glyphs.contains("keyboard"))
        val box = surface().getUnclippedBoundsInRoot()
        val toggleBox = toggle.getUnclippedBoundsInRoot()
        val labelBox = rule.onNodeWithText("Select date").getUnclippedBoundsInRoot()
        assertEquals("padding-inline-start", (box.left + tokens.headerPaddingInlineStart).value, labelBox.left.value, 0.6f)
        assertEquals("padding-block", (box.top + tokens.headerPaddingBlock).value, labelBox.top.value, 0.6f)
        assertTrue("at the end, padding-inline-end in", abs((box.right - tokens.headerPaddingInlineEnd - toggleBox.right).value) < 1f)
        toggle.performClick()
        rule.waitForIdle()
        rule.onNodeWithContentDescription("Switch to calendar").assertExists()
        assertTrue(glyphs.contains("calendar_month"))
        val system = tanrei.copy(datePicker = tokens.copy(dividerColor = TanreiPaint.Role(TanreiColorRole.Warning), dividerWidth = 4.dp))
        inPlace(modal(), system = system)
        val divider = rule.onNodeWithContentDescription("Switch to text entry").getUnclippedBoundsInRoot().bottom + tokens.headerPaddingBlock + 2.dp
        assertPixel("the divider", stagePixel(box.left + 40.dp, divider), colors[TanreiColorRole.Warning])
    }

    @Test
    fun `DTP-24 Cancel and OK are text Buttons in one row at the end, OK last, gap apart - Cancel closes, a docked picker has none`() {
        inPlace(modal())
        val box = surface().getUnclippedBoundsInRoot()
        val okBox = ok().getUnclippedBoundsInRoot()
        val cancelBox = cancel().getUnclippedBoundsInRoot()
        assertTrue("OK last", okBox.left > cancelBox.right - 1.dp)
        assertTrue("container-padding-inline from the end", abs((box.right - tokens.containerPaddingInline - okBox.right).value) < 3f)
        assertTrue("actions-padding-block below", abs((box.bottom - tokens.actionsPaddingBlock - okBox.bottom).value) < 6f)
        cancel().performClick()
        rule.waitForIdle()
        assertEquals(listOf("close:Cancel"), events)
        inPlace(docked())
        ok().assertDoesNotExist()
        cancel().assertDoesNotExist()
    }

    // ── DTP-25 … DTP-28: text entry ──────────────────────────────────────────

    @Test
    fun `DTP-25 text entry is one outlined field in single mode and two equal ones gap apart in range mode, with the locale's numeric pattern`() {
        inPlace(modal(entryMode = TanreiDatePickerEntryMode.Text))
        val box = surface().getUnclippedBoundsInRoot()
        val single = field("Date").getUnclippedBoundsInRoot()
        assertEquals("input-padding-inline", (box.left + tokens.inputPaddingInline).value, single.left.value, 0.6f)
        assertEquals("the full width", (box.right - tokens.inputPaddingInline).value, single.right.value, 0.6f)
        inPlace(modal(entryMode = TanreiDatePickerEntryMode.Text, mode = TanreiDatePickerMode.Range, start = SEP10, end = SEP16))
        val first = field("Start date").getUnclippedBoundsInRoot()
        val second = field("End date").getUnclippedBoundsInRoot()
        assertEquals("equally wide", (first.right - first.left).value, (second.right - second.left).value, 0.6f)
        assertEquals("input-gap apart", tokens.inputGap.value, (second.left - first.right).value, 0.6f)
        assertEquals("mm/dd/yyyy", TanreiDateText(Locale.US).numericPattern())
        assertEquals("yyyy/mm/dd", TanreiDateText(Locale.JAPAN).numericPattern())
        assertEquals("dd.mm.yyyy", TanreiDateText(Locale.GERMANY).numericPattern())
    }

    @Test
    fun `DTP-25 in range mode, when the start label wraps and the end label does not, both fields are the taller one's height with their containers level`() {
        val fieldHeight = tanrei.textField.sizes.medium.containerHeight
        val modalSurface = tokens.modalContainerColor.resolve(colors)
        inPlace(
            modal(
                entryMode = TanreiDatePickerEntryMode.Text,
                mode = TanreiDatePickerMode.Range,
                start = SEP10,
                end = SEP16,
                labels = TanreiDatePickerLabels(startLabel = LONG_START),
            ),
        )
        val first = field(LONG_START)
        val second = field("End date")
        /** The stage rows [node]'s container draws on, read down a column [fromEnd] inside its end edge (TXF-13). */
        fun containerRows(node: SemanticsNodeInteraction): IntRange {
            val stageBounds = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
            val bounds = node.getUnclippedBoundsInRoot()
            val map = stage()
            return with(rule.density) {
                val x = (bounds.right - 4.dp - stageBounds.left).roundToPx()
                val rows = ((bounds.top - stageBounds.top).roundToPx() until (bounds.bottom - stageBounds.top).roundToPx())
                    .filter { y -> !isClose(map[x, y], modalSurface, 0.03f) }
                assertTrue("something is drawn", rows.isNotEmpty())
                rows.first()..rows.last()
            }
        }
        with(rule.density) {
            val start = containerRows(first)
            val end = containerRows(second)
            assertTrue("the start label wraps: its field grew (${start.last - start.first + 1} px)", start.last - start.first + 1 > (fieldHeight + 4.dp).toPx())
            assertEquals("both containers start on the same row", start.first.toFloat(), end.first.toFloat(), 1f * density)
            assertEquals("and end on the same row", start.last.toFloat(), end.last.toFloat(), 1f * density)
        }
        val a = first.getUnclippedBoundsInRoot()
        val b = second.getUnclippedBoundsInRoot()
        assertEquals("the fields are equally tall", (a.bottom - a.top).value, (b.bottom - b.top).value, 0.6f)
        assertEquals("their tops are level", a.top.value, b.top.value, 0.6f)
        assertEquals("still equally wide", (a.right - a.left).value, (b.right - b.left).value, 0.6f)
    }

    @Test
    fun `DTP-26 a field holds its pending date in the numeric form, reads typed dates in the locale's order, and errors only on commit`() {
        val us = TanreiDateText(Locale.US)
        assertEquals("09/17/2026", us.numericDate(SEP17))
        assertEquals(SEP17, us.parseNumericDate("9/17/2026"))
        assertEquals(SEP17, us.parseNumericDate("09-17-2026"))
        assertEquals(SEP17, us.parseNumericDate("9 17 2026"))
        assertNull("month 17 does not exist", us.parseNumericDate("17/09/2026"))
        assertNull("a two-digit year", us.parseNumericDate("09/17/26"))
        assertNull("two groups", us.parseNumericDate("0917/2026"))
        assertNull("the 31st of September", us.parseNumericDate("09/31/2026"))
        assertEquals(SEP17, TanreiDateText(Locale.GERMANY).parseNumericDate("17.9.2026"))
        assertEquals("the locale's digits", SEP17, TanreiDateText(Locale.forLanguageTag("ar-EG")).parseNumericDate("١٧/٠٩/٢٠٢٦"))
        inPlace(modal(entryMode = TanreiDatePickerEntryMode.Text, max = TanreiDate(2026, 12, 31)))
        field("Date").assert(hasText("09/17/2026"))
        field("Date").performTextClearance()
        field("Date").performTextInput("9/20/2026")
        rule.waitForIdle()
        rule.onNodeWithText("Sun, Sep 20").assertExists()
        field("Date").performTextClearance()
        rule.waitForIdle()
        ok().assertIsNotEnabled()
        field("Date").performTextInput("13/40/2026")
        field("Date").performImeAction()
        rule.waitForIdle()
        rule.onNodeWithText("Enter a valid date", useUnmergedTree = true).assertExists()
        field("Date").performTextInput("x")
        rule.waitForIdle()
        rule.onNodeWithText("Enter a valid date", useUnmergedTree = true).assertDoesNotExist()
        field("Date").performTextClearance()
        field("Date").performTextInput("01/05/2027")
        field("Date").performImeAction()
        rule.waitForIdle()
        rule.onNodeWithText("This date can't be chosen", useUnmergedTree = true).assertExists()
        ok().assertIsNotEnabled()
    }

    @Test
    fun `DTP-26 an end before the start is invalid`() {
        inPlace(modal(entryMode = TanreiDatePickerEntryMode.Text, mode = TanreiDatePickerMode.Range, start = SEP10, end = SEP16))
        field("End date").performTextClearance()
        field("End date").performTextInput("09/05/2026")
        field("End date").performImeAction()
        rule.waitForIdle()
        rule.onNodeWithText("Enter a valid date", useUnmergedTree = true).assertExists()
    }

    @Test
    @KeyboardNavigation
    fun `DTP-27 the action key moves to the next field, and in the last one activates OK when it is enabled`() {
        inPlace(modal(entryMode = TanreiDatePickerEntryMode.Text, mode = TanreiDatePickerMode.Range, start = SEP10, end = SEP16))
        field("Start date").requestFocus().performImeAction()
        rule.waitForIdle()
        field("End date").assertIsFocused().performImeAction()
        rule.waitForIdle()
        assertEquals("OK: unchanged, so only close", listOf("close:Confirm"), events)
        events.clear()
        inPlace(modal(entryMode = TanreiDatePickerEntryMode.Text, mode = TanreiDatePickerMode.Range, start = SEP10))
        field("End date").requestFocus().performImeAction()
        rule.waitForIdle()
        assertEquals("OK disabled: nothing", emptyList<String>(), events)
    }

    @Test
    @KeyboardNavigation
    fun `DTP-28 the entry-mode toggle switches entry, keeps the pending choice, shows its month and moves focus - docked is calendar only and reports text`() = collectingReports { reports ->
        inPlace(modal(value = TanreiDate(2026, 11, 3)))
        day(4, "November").performClick()
        rule.waitForIdle()
        rule.onNodeWithContentDescription("Switch to text entry").performClick()
        rule.waitForIdle()
        field("Date").assert(hasText("11/04/2026")).assertIsFocused()
        field("Date").performTextClearance()
        field("Date").performTextInput("12/24/2026")
        rule.waitForIdle()
        rule.onNodeWithContentDescription("Switch to calendar").performClick()
        rule.waitForIdle()
        viewToggle().assert(hasText("December 2026"))
        day(24, "December").assertIsSelected().assertIsFocused()
        setDebuggable(true)
        inPlace(docked(entryMode = TanreiDatePickerEntryMode.Text))
        day(17).assertExists()
        field("Date").assertDoesNotExist()
        assertTrue(reports.toString(), reports.any { "entryMode" in it })
    }

    // ── DTP-29: availability and the opening month ───────────────────────────

    @Test
    fun `DTP-29 days before min, after max, listed or named by the predicate are unavailable - it opens on the chosen month, else today's, clamped, or the year view`() {
        val weekends: (TanreiDate) -> Boolean = { it.weekday == 0 || it.weekday == 6 }
        inPlace(docked(min = TanreiDate(2026, 9, 3), max = TanreiDate(2026, 9, 28), disabledDates = setOf(TanreiDate(2026, 9, 9)), isDateDisabled = weekends))
        day(2).assertIsNotEnabled()
        day(29).assertIsNotEnabled()
        day(9).assertIsNotEnabled()
        day(5).assertIsNotEnabled() // a Saturday
        day(8).assertIsEnabled()
        inPlace(docked(value = TanreiDate(2026, 11, 3)))
        viewToggle().assert(hasText("November 2026"))
        inPlace(docked(value = null))
        viewToggle().assert(hasText("September 2026"))
        inPlace(docked(value = null, min = TanreiDate(2026, 12, 1)))
        viewToggle().assert(hasText("December 2026"))
        inPlace(docked(startView = TanreiDatePickerStartView.Year))
        year(2026).assertIsSelected()
    }

    // ── DTP-30 … DTP-35: states ──────────────────────────────────────────────

    @Test
    fun `DTP-30 an unavailable day draws its condition's disabled tokens, is announced disabled and is never chosen - a chosen one still draws selected`() {
        val system = tanrei
            .withDatePicker(TanreiDatePickerCondition.Unselected, TanreiInteractionState.Disabled) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Warning)) }
            .withDatePicker(TanreiDatePickerCondition.Selected, TanreiInteractionState.Disabled) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
            .let { it.copy(datePicker = it.datePicker.copy(disabled = TanreiDatePickerStateTokens(opacity = 1f))) }
        inPlace(docked(value = TanreiDate(2026, 9, 12), min = TanreiDate(2026, 9, 3), disabledDates = setOf(TanreiDate(2026, 9, 12))), system = system)
        assertPixel("the unselected disabled container", dayPixel(1, cell / 2, SQUARE_TOP_PROBE), colors[TanreiColorRole.Warning])
        assertPixel("the selected disabled container", dayPixel(12, cell / 2, SQUARE_TOP_PROBE), colors[TanreiColorRole.Error])
        day(1).assertIsNotEnabled().performClick()
        rule.waitForIdle()
        assertEquals(emptyList<String>(), events)
        day(12).assertIsSelected().assertIsNotEnabled()
    }

    @Test
    fun `DTP-31 hovered and pressed draw the state's tokens of the day's condition`() {
        val acme = TanreiSystem.Acme
        val unselected = acme.datePicker.conditions.unselected
        val acmeColors = acme.colors.light
        val acmeSurface = acme.datePicker.dockedContainerColor.resolve(acmeColors)
        fun over(paint: TanreiPaint) = paint.resolve(acmeColors).compositeOver(acmeSurface)
        assertEquals("acme values the states apart", 4, listOf(unselected.enabled, unselected.hovered, unselected.focused, unselected.pressed).map { over(it.containerColor) }.toSet().size)
        inPlace(docked(), system = acme)
        day(3).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertPixel("hovered", dayPixel(3, cell / 2, SQUARE_TOP_PROBE), over(unselected.hovered.containerColor))
        day(3).performTouchInput { down(center) }
        rule.waitForIdle()
        assertPixel("pressed", dayPixel(3, cell / 2, SQUARE_TOP_PROBE), over(unselected.pressed.containerColor))
        day(3).performTouchInput { cancel() }
    }

    @Test
    @KeyboardNavigation
    fun `DTP-31 DTP-32 keyboard focus draws the focused tokens and the ring around the square, an in-range day's too, at once`() {
        val acme = TanreiSystem.Acme
        val acmeColors = acme.colors.light
        val acmeSurface = acme.datePicker.dockedContainerColor.resolve(acmeColors)
        inPlace(docked(), system = acme)
        rule.mainClock.autoAdvance = false
        day(17).requestFocus()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        val focused = acme.datePicker.conditions.selected.focused.containerColor.resolve(acmeColors).compositeOver(acmeSurface)
        assertPixel("focused", dayPixel(17, cell / 2, SQUARE_TOP_PROBE), focused)
        inPlace(docked(mode = TanreiDatePickerMode.Range, start = SEP10, end = SEP16))
        rule.mainClock.autoAdvance = false
        day(10).requestFocus().performKeyInput { pressKey(Key.DirectionRight) }
        repeat(2) { rule.mainClock.advanceTimeByFrame() }
        rule.mainClock.autoAdvance = true
        day(11).assertIsFocused()
        val ringAbove = (cell - tokens.dayContainerSize) / 2 - (measure.focusOffset + measure.focusInnerWidth + measure.focusOuterWidth / 2)
        assertPixel("the ring around the square, above the band", dayPixel(11, cell / 2, ringAbove), colors[TanreiColorRole.FocusRing])
    }

    @Test
    fun `DTP-32 focus gained by touch shows no ring`() {
        inPlace(modal())
        day(18).performClick()
        rule.waitForIdle()
        val ringAbove = (cell - tokens.dayContainerSize) / 2 - (measure.focusOffset + measure.focusInnerWidth + measure.focusOuterWidth / 2)
        assertFalse("no ring", isClose(dayPixel(18, cell / 2, ringAbove), colors[TanreiColorRole.FocusRing]))
    }

    @Test
    fun `DTP-33 a tap that ends at once shows the pressed state on the next frame and keeps it for press-hold`() {
        inPlace(docked())
        val unselected = tokens.conditions.unselected
        val hold = tanrei.motion.duration.pressHold.toLong()
        val height = viewToggle().getUnclippedBoundsInRoot().let { it.bottom - it.top }
        rule.mainClock.autoAdvance = false
        viewToggle().performTouchInput { down(center); up() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("pressed", nodePixel(viewToggle(), 3.dp, height / 2), fill(unselected.pressed.containerColor))
        rule.mainClock.advanceTimeBy(hold / 2)
        assertPixel("still pressed", nodePixel(viewToggle(), 3.dp, height / 2), fill(unselected.pressed.containerColor))
        rule.mainClock.advanceTimeBy(hold + tokens.motionStateDuration * 2L)
        assertPixel("at rest", nodePixel(viewToggle(), 3.dp, height / 2), fill(unselected.enabled.containerColor))
        rule.mainClock.autoAdvance = true
    }

    private fun TanreiSystem.answering(feedback: TanreiPressedFeedback) = copy(behavior = behavior.copy(pressedFeedback = feedback))

    @Test
    fun `DTP-34 ripple grows the pressed color from the point of contact within the square`() {
        assertEquals(TanreiPressedFeedback.Ripple, TanreiSystem.M3Like.behavior.pressedFeedback)
        inPlace(docked(), system = tanrei.answering(TanreiPressedFeedback.Ripple))
        val pressed = fill(tokens.conditions.unselected.pressed.containerColor)
        val inset = (cell - tokens.dayContainerSize) / 2
        rule.mainClock.autoAdvance = false
        day(3).performTouchInput { down(Offset((inset + 3.dp).toPx(), (inset + 3.dp).toPx())) }
        rule.mainClock.advanceTimeBy(50)
        assertPixel("at the point of contact", dayPixel(3, inset + 3.dp, inset + 3.dp), pressed)
        assertPixel("not yet at the far corner", dayPixel(3, cell - inset - 5.dp, cell - inset - 5.dp), dockedSurface)
        rule.mainClock.advanceTimeBy(tokens.motionFeedbackDuration.toLong())
        assertPixel("the far corner once grown", dayPixel(3, cell - inset - 5.dp, cell - inset - 5.dp), pressed)
        day(3).performTouchInput { cancel() }
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `DTP-34 dim - cupertino's answer - dims the pressed day and draws no state layer, and none draws nothing`() {
        val cupertino = TanreiSystem.Cupertino
        assertEquals(TanreiPressedFeedback.Dim, cupertino.behavior.pressedFeedback)
        val opacity = cupertino.datePicker.pressed.opacity
        assertTrue(opacity < 1f)
        inPlace(docked(), system = cupertino)
        val cupertinoColors = cupertino.colors.light
        val surface = cupertino.datePicker.dockedContainerColor.resolve(cupertinoColors)
        val selected = cupertino.datePicker.conditions.selected.enabled.containerColor.resolve(cupertinoColors).compositeOver(surface)
        day(17).performTouchInput { down(center) }
        rule.waitForIdle()
        val dimmed = selected.copy(alpha = opacity).compositeOver(surface)
        assertPixel("the resting fill, dimmed", dayPixel(17, cell / 2, SQUARE_TOP_PROBE), dimmed)
        day(17).performTouchInput { cancel() }
        inPlace(docked(), system = tanrei.answering(TanreiPressedFeedback.None))
        day(3).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val hovered = day(3).captureToImage().toPixelMap()
        day(3).performMouseInput { press() }
        rule.waitForIdle()
        assertSameAs(hovered, day(3).captureToImage().toPixelMap(), "pressed under none")
        day(3).performMouseInput { release() }
    }

    @Test
    fun `DTP-35 a day's corners are its shape eased by corner smoothing - and glow draws the focus as a halo`() {
        for (smoothing in listOf(0f, 0.6f)) {
            inPlace(docked(), system = tanrei.copy(shape = tanrei.shape.copy(cornerSmoothing = smoothing)))
            val inset = (cell - tokens.dayContainerSize) / 2
            assertPixel("smoothing $smoothing: the very corner is outside", dayPixel(17, inset + 0.5.dp, inset + 0.5.dp), dockedSurface)
            assertPixel("smoothing $smoothing: inside", dayPixel(17, inset + tokens.dayContainerShape, inset + tokens.dayContainerShape), fill(tokens.conditions.selected.enabled.containerColor))
        }
        assertEquals(0.6f, TanreiSystem.Cupertino.shape.cornerSmoothing)
        assertEquals(TanreiFocusStyle.Glow, TanreiSystem.Acme.behavior.focusStyle)
    }

    // ── DTP-36: semantics ────────────────────────────────────────────────────

    @Test
    fun `DTP-36 the surface is a dialog named by label, the grid a collection named by the month, each day a button with its date, state and place`() {
        inPlace(docked(mode = TanreiDatePickerMode.Range, start = SEP10, end = SEP16, labels = TanreiDatePickerLabels(label = "Select dates")))
        assertEquals("Select dates", surface().fetchSemanticsNode().config[SemanticsProperties.PaneTitle])
        val grid = rule.onNode(hasContentDescription("September 2026") and SemanticsMatcher.keyIsDefined(SemanticsProperties.CollectionInfo)).fetchSemanticsNode()
        assertEquals(7, grid.config[SemanticsProperties.CollectionInfo].columnCount)
        assertEquals(7, grid.config[SemanticsProperties.CollectionInfo].rowCount)
        val start = day(10).fetchSemanticsNode().config
        assertEquals(listOf("Thursday, September 10, 2026"), start[SemanticsProperties.ContentDescription])
        assertEquals(Role.Button, start[SemanticsProperties.Role])
        assertEquals("Start date", start[SemanticsProperties.StateDescription])
        assertEquals(true, start[SemanticsProperties.Selected])
        assertEquals(2, start[SemanticsProperties.CollectionItemInfo].rowIndex)
        assertEquals(4, start[SemanticsProperties.CollectionItemInfo].columnIndex)
        assertEquals("End date", day(16).fetchSemanticsNode().config[SemanticsProperties.StateDescription])
        day(12).assertIsSelected()
        day(24).assert(hasContentDescription("Thursday, September 24, 2026, Today"))
        day(17).assertIsNotSelected()
        viewToggle().assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button)).assert(SemanticsMatcher.keyIsDefined(SemanticsActions.Expand))
        viewToggle().performClick()
        rule.waitForIdle()
        viewToggle().assert(SemanticsMatcher.keyIsDefined(SemanticsActions.Collapse))
        year(2026).assertIsSelected()
        rule.onNode(hasContentDescription("2027") and hasClickAction()).assertIsNotSelected()
        inPlace(docked(today = TanreiDate(2027, 1, 15), startView = TanreiDatePickerStartView.Year))
        rule.onNode(hasContentDescription("2027, Today")).assertExists()
    }

    // ── DTP-37: locale ───────────────────────────────────────────────────────

    @Test
    fun `DTP-37 names, digits, forms and the first day come from the locale - firstDayOfWeek overrides it - Gregorian, and today defaults to the device's`() {
        inPlace(docked(locale = Locale.JAPAN))
        viewToggle().assert(hasText("2026年9月"))
        inPlace(docked(locale = Locale.GERMANY))
        val box = surface().getUnclippedBoundsInRoot()
        assertEquals("Monday first in de-DE", (box.left + tokens.containerPaddingInline).value, rule.onNodeWithContentDescription("Montag").getUnclippedBoundsInRoot().left.value, 0.6f)
        inPlace(docked(locale = Locale.GERMANY, firstDayOfWeek = TanreiDatePickerFirstDayOfWeek.Sunday))
        assertEquals("Sunday first when asked", (box.left + tokens.containerPaddingInline).value, rule.onNodeWithContentDescription("Sonntag").getUnclippedBoundsInRoot().left.value, 0.6f)
        assertEquals("١٧", TanreiDateText(Locale.forLanguageTag("ar-EG")).number(17))
        assertTrue("Gregorian in th-TH", TanreiDateText(Locale.forLanguageTag("th-TH")).monthYear(TanreiCalendarMonth(2026, 9)).contains("2026"))
        val device = tanreiDeviceToday()
        inPlace(docked(value = null, today = null))
        rule.onNode(hasContentDescription("${device.day}, ${device.year}, Today", substring = true)).assertExists()
    }

    // ── DTP-38: room and text size ───────────────────────────────────────────

    @Test
    fun `DTP-38 a short window keeps the header and actions and scrolls the calendar between them, and a shorter one scrolls everything`() {
        inPlace(modal(), stage = DpSize(480.dp, 420.dp))
        val stage = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
        assertTrue("OK in view", ok().getUnclippedBoundsInRoot().bottom <= stage.bottom)
        rule.onNodeWithText("Select date").assertExists()
        assertTrue("the calendar scrolls", day(30).getUnclippedBoundsInRoot().bottom > ok().getUnclippedBoundsInRoot().top)
        inPlace(modal(), stage = DpSize(480.dp, 200.dp))
        assertTrue("everything scrolls: OK below the room", ok().getUnclippedBoundsInRoot().top > rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot().bottom)
        val limit = 200.dp
        inPlace(docked(), maxHeight = with(rule.density) { limit.roundToPx() })
        assertEquals(limit.value, surface().getUnclippedBoundsInRoot().let { it.bottom - it.top }.value, 0.6f)
    }

    @Test
    fun `DTP-38 on a narrow window the margins give way, then the padding, and below seven targets the cells narrow equally - their numbers keep their size and the surface never passes the window`() {
        val padding = tokens.containerPaddingInline
        val full = cell * 7 + padding * 2
        val left = { name: String -> rule.onNodeWithContentDescription(name).getUnclippedBoundsInRoot().left }
        inPlace(modal())
        val number = numberHeight(17)
        // Narrower than the surface and its margins: the margins give way; the padding and the cells stay.
        val marginsOnly = full + tokens.modalContainerMargin
        inPlace(modal(), stage = DpSize(marginsOnly, 640.dp))
        assertEquals("the surface keeps its width", full.value, drawnModalSurface(marginsOnly).let { it.second - it.first }.value, 0.6f)
        day(1).assertWidthIs(cell)
        // Just above seven targets: the padding gives way, evenly; the cells keep the target.
        val tight = cell * 7 + 6.dp
        inPlace(modal(), stage = DpSize(tight, 640.dp))
        val (tightLeft, tightRight) = drawnModalSurface(tight)
        assertEquals("the surface is the window", tight.value, (tightRight - tightLeft).value, 0.6f)
        day(1).assertWidthIs(cell)
        assertEquals("the padding shrinks to what is left", 3f, (left("Sunday") - tightLeft).value, 0.6f)
        assertEquals("OK keeps the shrunk padding from the end", 3f, (tightRight - ok().getUnclippedBoundsInRoot().right).value, 0.6f)
        // A 320-wide window, narrower than seven targets: the cells narrow equally to share it; their height and numbers stay.
        val phone = 320.dp
        inPlace(modal(), stage = DpSize(phone, 640.dp))
        val (phoneLeft, phoneRight) = drawnModalSurface(phone)
        assertNarrowGrid(phone, phoneRight - phoneLeft)
        assertEquals("the number keeps its size", number, numberHeight(17))
        assertTrue("the surface inside the window: $phoneLeft to $phoneRight", phoneLeft >= 0.dp && phoneRight <= phone)
        // The year list's three columns share the narrowed grid.
        viewToggle().performClick()
        rule.waitForIdle()
        val year = rule.onNode(hasContentDescription("2026", substring = true) and hasClickAction()).getUnclippedBoundsInRoot()
        assertTrue("a year is a third of the grid: ${year.right - year.left}", (year.right - year.left) * 3 <= phoneRight - phoneLeft + 0.5.dp)
        // Docked in place: the width it is given stands for the window's.
        show {
            Box(Modifier.width(phone)) {
                TanreiDatePickerContent(modifier = Modifier.testTag(SURFACE), props = docked())
            }
        }
        assertNarrowGrid(phone, width(surface()))
        // A docked popup wider than the window less its margins is centred: the margins give way first.
        val position = DockedPosition()
        val provider = DockedPositionProvider(offset = 8, margin = 32, position = position)
        val placed = provider.calculatePosition(IntRect(left = 100, top = 100, right = 300, bottom = 150), IntSize(640, 1000), LayoutDirection.Ltr, IntSize(630, 400))
        assertEquals("centred in the window", 5, placed.x)
    }

    @Test
    @Config(qualifiers = "w320dp-h720dp-xhdpi")
    fun `DTP-38 a docked picker on a 320-wide window narrows its cells to fit and stays inside the window`() {
        showPicker(docked())
        rule.onNodeWithTag(OPENER).performClick()
        rule.waitForIdle()
        assertEquals(1, popups())
        val params = (overlayView!!.parent as View).layoutParams as android.view.WindowManager.LayoutParams
        val window = hostView!!.rootView.width
        val surfacePx = with(rule.density) { width(surface()).roundToPx() }
        assertTrue("the surface fits the window: $surfacePx in $window", surfacePx <= window)
        assertTrue("and stays inside it: x ${params.x}", params.x >= 0 && params.x + surfacePx <= window)
        assertNarrowGrid(with(rule.density) { window.toDp() }, width(surface()))
    }

    @Test
    fun `DTP-38 days and the header grow with enlarged text`() {
        inPlace(modal())
        val header = rule.onNodeWithText("Thu, Sep 17").getUnclippedBoundsInRoot().let { it.bottom - it.top }
        inPlace(modal(), fontScale = 3f)
        val day = day(17).getUnclippedBoundsInRoot()
        assertTrue("the day grew: ${day.bottom - day.top}", day.bottom - day.top > cell)
        assertTrue("the header grew", rule.onNodeWithText("Thu, Sep 17").getUnclippedBoundsInRoot().let { it.bottom - it.top } > header)
    }

    // ── DTP-39: right to left ────────────────────────────────────────────────

    @Test
    fun `DTP-39 right-to-left puts the first weekday at the right, the view toggle at the right and the navigation at the left, with the chevrons swapped`() {
        glyphs.clear()
        inPlace(docked(), direction = LayoutDirection.Rtl)
        val box = surface().getUnclippedBoundsInRoot()
        assertEquals((box.right - tokens.containerPaddingInline).value, rule.onNodeWithContentDescription("Sunday").getUnclippedBoundsInRoot().right.value, 0.6f)
        assertTrue("the view toggle at the right", viewToggle().getUnclippedBoundsInRoot().left > previous().getUnclippedBoundsInRoot().right)
        val chevrons = glyphs.filter { it.startsWith("chevron") }.take(2)
        assertEquals("previous shows chevron_right, next chevron_left", listOf("chevron_right", "chevron_left"), chevrons)
        val first = day(1).getUnclippedBoundsInRoot()
        val second = day(2).getUnclippedBoundsInRoot()
        assertTrue("later days to the left", second.right <= first.left + 0.5.dp)
    }

    @Test
    @KeyboardNavigation
    fun `DTP-39 right-to-left mirrors Right and Left`() {
        inPlace(docked(), direction = LayoutDirection.Rtl)
        day(17).requestFocus().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        day(16).assertIsFocused()
    }

    // ── DTP-40: what cannot be used ──────────────────────────────────────────

    @Test
    fun `DTP-40 the enums are closed and hold exactly the spec's values, and a date is an ISO calendar date or nothing`() {
        val spec = readSpec(DATE_PICKER_SPEC).getJSONArray("props")
        fun values(name: String): List<String> {
            val prop = (0 until spec.length()).map { spec.getJSONObject(it) }.single { it.getString("name") == name }
            val array = prop.getJSONArray("values")
            return (0 until array.length()).map { array.getString(it).replace("-", "") }
        }
        assertEquals(values("presentation"), TanreiDatePickerPresentation.entries.map { it.name.lowercase() })
        assertEquals(values("mode"), TanreiDatePickerMode.entries.map { it.name.lowercase() })
        assertEquals(values("firstDayOfWeek"), TanreiDatePickerFirstDayOfWeek.entries.map { it.name.lowercase() })
        assertEquals(values("entryMode"), TanreiDatePickerEntryMode.entries.map { it.name.lowercase() })
        assertEquals(values("startView"), TanreiDatePickerStartView.entries.map { it.name.lowercase() })
        assertEquals(listOf("escape", "back", "outside", "tab", "focusout", "cancel", "confirm", "select"), TanreiDatePickerCloseReason.entries.map { it.name.lowercase() })
        assertEquals(SEP17, TanreiDate.parse("2026-09-17"))
        assertEquals("2026-09-17", SEP17.toString())
        for (bad in listOf("2026-9-17", "2026-09-31", "2026-13-01", "17/09/2026", "2026-09-17T00:00", "")) assertNull(bad, TanreiDate.parse(bad))
        assertThrows(IllegalArgumentException::class.java) { TanreiDate(2026, 2, 29) }
        assertEquals(TanreiDate(2028, 2, 29), TanreiDate.of(2028, 2, 29))
        assertTrue(TanreiDate(2026, 9, 17) < TanreiDate(2026, 10, 1))
        assertEquals(4, SEP17.weekday) // a Thursday
        assertEquals(TanreiDate(1970, 1, 1), tanreiDateOfEpochDay(0))
        assertEquals(SEP17, tanreiDateOfEpochDay(SEP17.epochDay))
    }

    @Test
    fun `DTP-40 min after max, an end before its start, value in range mode and start in single mode are ignored and reported - an empty label is reported`() = collectingReports { reports ->
        val text = TanreiDateText(Locale.US)
        val swapped = readDatePickerConfig(docked(min = TanreiDate(2026, 10, 1), max = TanreiDate(2026, 9, 1)), text, TODAY)
        assertNull(swapped.min)
        assertNull(swapped.max)
        val backwards = readDatePickerConfig(docked(mode = TanreiDatePickerMode.Range, start = SEP16, end = SEP10), text, TODAY)
        assertEquals(TanreiDateSelection(start = SEP16), backwards.committed)
        val rangeValue = readDatePickerConfig(docked(mode = TanreiDatePickerMode.Range, value = SEP17), text, TODAY)
        assertEquals(TanreiDateSelection(), rangeValue.committed)
        val singleStart = readDatePickerConfig(docked(start = SEP10), text, TODAY)
        assertEquals(TanreiDateSelection(value = SEP17), singleStart.committed)
        assertEquals(1, swapped.reports.size)
        assertEquals(1, backwards.reports.size)
        setDebuggable(true)
        inPlace(docked(min = TanreiDate(2026, 10, 1), max = TanreiDate(2026, 9, 1), labels = TanreiDatePickerLabels(label = "")))
        day(17).assertExists()
        assertTrue(reports.toString(), reports.any { "min" in it && "max" in it })
        assertTrue(reports.toString(), reports.any { "TanreiDatePicker" in it && "label" in it })
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun SemanticsNodeInteraction.assertWidthIs(width: Dp) =
        assertEquals(width.value, getUnclippedBoundsInRoot().let { it.right - it.left }.value, 0.6f)

    /** Sends a key down and up to the overlay's window, as the platform does when no view used it. */
    private fun windowKey(code: Int) {
        val root = overlayView!!.rootView
        rule.runOnUiThread {
            root.dispatchKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, code))
            root.dispatchKeyEvent(KeyEvent(KeyEvent.ACTION_UP, code))
        }
        rule.waitForIdle()
    }

    private fun TanreiSystem.withDatePicker(condition: TanreiDatePickerCondition, state: TanreiInteractionState, change: (TanreiDatePickerConditionStateTokens) -> TanreiDatePickerConditionStateTokens): TanreiSystem {
        val tokens = datePicker.conditions[condition]
        val changed = when (state) {
            TanreiInteractionState.Enabled -> tokens.copy(enabled = change(tokens.enabled))
            TanreiInteractionState.Hovered -> tokens.copy(hovered = change(tokens.hovered))
            TanreiInteractionState.Focused -> tokens.copy(focused = change(tokens.focused))
            TanreiInteractionState.Pressed -> tokens.copy(pressed = change(tokens.pressed))
            TanreiInteractionState.Disabled -> tokens.copy(disabled = change(tokens.disabled))
        }
        val conditions = when (condition) {
            TanreiDatePickerCondition.Unselected -> datePicker.conditions.copy(unselected = changed)
            TanreiDatePickerCondition.Selected -> datePicker.conditions.copy(selected = changed)
            TanreiDatePickerCondition.Today -> datePicker.conditions.copy(today = changed)
            TanreiDatePickerCondition.InRange -> datePicker.conditions.copy(inRange = changed)
            else -> error("not used: $condition")
        }
        return copy(datePicker = datePicker.copy(conditions = conditions))
    }

    /** [paint] as drawn on the docked surface. */
    private fun fill(paint: TanreiPaint): Color = paint.resolve(colors).compositeOver(dockedSurface)

    private fun stage(): PixelMap = rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap()

    private fun stagePixel(x: Dp, y: Dp): Color {
        val stageBounds = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
        return with(rule.density) { stage()[(x - stageBounds.left).roundToPx(), (y - stageBounds.top).roundToPx()] }
    }

    /** A pixel of [node] at ([x], [y]) from its top-left, as drawn on the stage. */
    private fun nodePixel(node: SemanticsNodeInteraction, x: Dp, y: Dp): Color {
        val bounds = node.getUnclippedBoundsInRoot()
        return stagePixel(bounds.left + x, bounds.top + y)
    }

    private fun dayPixel(number: Int, x: Dp, y: Dp): Color = nodePixel(day(number), x, y)

    private fun width(node: SemanticsNodeInteraction): Dp = node.getUnclippedBoundsInRoot().let { it.right - it.left }

    /** DTP-38 in a window [window] wide, below seven targets: seven equal cells, whole pixels, sharing it; the cells a target tall. */
    private fun assertNarrowGrid(window: Dp, surfaceWidth: Dp) {
        val widths = (1..7).map { width(day(it)) }
        assertTrue("the cells are equal: $widths", widths.all { abs(it.value - widths[0].value) < 0.1f })
        val px = with(rule.density) { widths[0].roundToPx() }
        val windowPx = with(rule.density) { window.roundToPx() }
        assertEquals("seven cells share the window, in whole pixels", windowPx / 7, px)
        assertTrue("narrower than the target", widths[0] < cell)
        day(1).assertHeightIsAtLeast(cell)
        assertEquals("the surface is the grid, no padding left", (widths[0] * 7).value, surfaceWidth.value, 0.6f)
        assertEquals("Saturday is the last column", (rule.onNodeWithContentDescription("Sunday").getUnclippedBoundsInRoot().left + widths[0] * 6).value, rule.onNodeWithContentDescription("Saturday").getUnclippedBoundsInRoot().left.value, 0.6f)
    }

    /**
     * A modal surface's left and right edges as drawn on the stage, along the weekday row: the surface's node is laid out
     * within the stage's margins, and the surface, centred, may reach past them; the stage is [stage] wide.
     */
    private fun drawnModalSurface(stage: Dp): Pair<Dp, Dp> {
        val map = stage()
        val container = tokens.modalContainerColor.resolve(colors)
        val stageBounds = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
        val y = with(rule.density) { (rule.onNodeWithContentDescription("Sunday").getUnclippedBoundsInRoot().let { (it.top + it.bottom) / 2 } - stageBounds.top).roundToPx() }
        // Nearer the container than the scrim over the stage: the surface, its edge (the elevation's ring) included.
        val scrim = tokens.modalScrimColor.resolve(colors).compositeOver(colors[TanreiColorRole.Surface])
        val distance = { a: Color, b: Color -> maxOf(abs(a.red - b.red), abs(a.green - b.green), abs(a.blue - b.blue)) }
        val xs = (0 until with(rule.density) { stage.roundToPx() }).filter { x -> distance(map[x, y], container) < distance(map[x, y], scrim) }
        return with(rule.density) { xs.first().toDp() to (xs.last() + 1).toDp() }
    }

    /** The height of day [number]'s selected-label pixels: how big its number is drawn. */
    private fun numberHeight(number: Int): Int {
        val map = day(number).captureToImage().toPixelMap()
        val label = tokens.conditions.selected.enabled.labelColor.resolve(colors)
        val rows = (0 until map.height).filter { y -> (0 until map.width).any { x -> isClose(map[x, y], label, 0.25f) } }
        return rows.last() - rows.first() + 1
    }

    private fun dayPixels(number: Int): List<Color> {
        val map = day(number).captureToImage().toPixelMap()
        return (0 until map.height).flatMap { y -> (0 until map.width).map { x -> map[x, y] } }
    }

    /** The view toggle's chevron as drawn: the last icon-size square of the toggle's container. */
    private fun chevronImage(): List<Color> {
        val map = viewToggle().captureToImage().toPixelMap()
        return with(rule.density) {
            val right = map.width - tokens.viewToggleContainerPaddingInline.roundToPx()
            val size = tokens.viewToggleIconSize.roundToPx()
            val top = (map.height - size) / 2
            (top until top + size).flatMap { y -> (right - size until right).map { x -> map[x, y] } }
        }
    }

    private fun sameImage(a: List<Color>, b: List<Color>): Boolean = a.size == b.size && a.indices.all { isClose(a[it], b[it]) }

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
        const val LONG_START = "The first night of the stay at the hotel"
        const val SURFACE = "surface"
        const val OPENER = "opener"
        const val BEFORE = "before"
        const val AFTER = "after"
        const val PIXEL_TOLERANCE = 3f / 255f
        val STAGE_PADDING = 24.dp
        val TODAY = TanreiDate(2026, 9, 24)
        val SEP10 = TanreiDate(2026, 9, 10)
        val SEP16 = TanreiDate(2026, 9, 16)
        val SEP17 = TanreiDate(2026, 9, 17)

        /** Inside a day's square, above its number: 3 dp below the square's top edge in a 48 cell. */
        val SQUARE_TOP_PROBE = 9.dp
    }
}

/** DTP-21 and DTP-22 where motion is reduced: Android's setting removes every animation, so both happen at once. */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w480dp-h720dp-xhdpi")
class TanreiDatePickerReducedMotionTest {
    private object NoMotion : MotionDurationScale {
        override val scaleFactor: Float = 0f
    }

    @get:Rule
    val rule = createComposeRule(effectContext = NoMotion)

    private var open by mutableStateOf(false)

    @Test
    fun `DTP-22 where motion is reduced a picker appears and disappears at once`() {
        val tanrei = TanreiSystem.Tanrei
        var modal: androidx.compose.runtime.State<Float>? = null
        var docked: androidx.compose.runtime.State<Float>? = null
        rule.setContent {
            TanreiTheme(system = tanrei, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                val a = androidx.compose.runtime.remember { androidx.compose.animation.core.MutableTransitionState(false) }
                val b = androidx.compose.runtime.remember { androidx.compose.animation.core.MutableTransitionState(false) }
                a.targetState = open
                b.targetState = open
                modal = rememberTanreiDatePickerShown(a, TanreiTheme.tokens.datePicker, modal = true)
                docked = rememberTanreiDatePickerShown(b, TanreiTheme.tokens.datePicker, modal = false)
            }
        }
        rule.mainClock.autoAdvance = false
        open = true
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        repeat(2) { rule.mainClock.advanceTimeByFrame() }
        assertEquals("whole at once", 1f, modal!!.value, 0.001f)
        assertEquals("whole at once", 1f, docked!!.value, 0.001f)
        open = false
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        repeat(2) { rule.mainClock.advanceTimeByFrame() }
        assertEquals("gone at once", 0f, modal!!.value, 0.001f)
        assertEquals("gone at once", 0f, docked!!.value, 0.001f)
    }

    @Test
    fun `DTP-21 where motion is reduced the month and the view change at once`() {
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                CompositionLocalProvider(LocalTanreiGlyphStandIn provides { name -> DatePickerFixtureGlyph(name) }) {
                    TanreiDatePickerContent(props = DatePickerProps(presentation = TanreiDatePickerPresentation.Docked, value = TanreiDate(2026, 9, 17), today = TanreiDate(2026, 9, 24), locale = Locale.US))
                }
            }
        }
        rule.mainClock.autoAdvance = false
        rule.onNodeWithContentDescription("Next month").performClick()
        repeat(2) { rule.mainClock.advanceTimeByFrame() }
        rule.onNode(hasContentDescription("September 1, 2026", substring = true)).assertDoesNotExist()
        rule.onNode(hasContentDescription("October 1, 2026", substring = true)).assertExists()
        rule.onNode(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "Choose a year")).performClick()
        repeat(2) { rule.mainClock.advanceTimeByFrame() }
        rule.onNode(hasContentDescription("October 1, 2026", substring = true)).assertDoesNotExist()
        rule.mainClock.autoAdvance = true
    }
}
