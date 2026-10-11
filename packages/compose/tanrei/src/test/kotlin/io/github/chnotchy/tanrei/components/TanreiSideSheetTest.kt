package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import android.view.KeyEvent
import android.view.View
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.MotionDurationScale
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
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
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotFocused
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.click
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.isDialog
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.test.swipe
import androidx.compose.ui.test.swipeWithVelocity
import androidx.compose.ui.test.withKeyDown
import androidx.compose.ui.text.TextStyle
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
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.primitives.TanreiModalDialogs
import io.github.chnotchy.tanrei.primitives.TanreiText
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiTextStyle
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiSideSheetVariant
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
 * Behaviour tests for `specs/side-sheet.spec.json`. Each test names the behaviour id (`SSH-n`) it covers. Runs on the
 * JVM (Robolectric, native graphics). The page is a [STAGE_WIDTH] × [STAGE_HEIGHT] stage of surface: a row of the page's
 * content — an opener button ([OPENER]) and a pressable box ([AFTER]) — and, at its end, a standard sheet; a modal sheet
 * is presented in its own window. Geometry is checked on the in-place form, `TanreiSideSheetContent`, in the stage.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w720dp-h600dp-xhdpi")
class TanreiSideSheetTest {
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
    private val tokens = tanrei.sideSheet
    private val surface = colors[TanreiColorRole.Surface]

    private val events = mutableListOf<String>()
    private var open by mutableStateOf(true)
    private var closeOnRequest = true
    private var hostView: View? = null
    private var sheetView: View? = null
    private var seenColor: Color? = null
    private var seenStyle: TextStyle? = null

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
            hostView = LocalView.current
            key(now) {
                val density = LocalDensity.current
                CompositionLocalProvider(LocalLayoutDirection provides now.direction, LocalDensity provides Density(density.density, now.fontScale)) {
                    TanreiTheme(system = now.system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                        Box(Modifier.testTag(STAGE_TAG).size(STAGE_WIDTH, STAGE_HEIGHT).background(TanreiColorRole.Surface.color)) { now.content() }
                    }
                }
            }
        }
        rule.waitForIdle()
    }

    @Composable
    private fun Content() {
        sheetView = LocalView.current
        seenColor = LocalTanreiContentColor.current
        seenStyle = LocalTanreiTextStyle.current
        Column {
            TanreiButton(text = "First", onClick = { events += "first" }, modifier = Modifier.testTag(FIRST), variant = TanreiButtonVariant.Text)
            TanreiText(TEXT_CONTENT, modifier = Modifier.testTag(TEXT))
        }
    }

    private val twoActions: @Composable RowScope.() -> Unit = {
        TanreiButton(text = "Apply", onClick = { events += "apply" }, modifier = Modifier.testTag(APPLY), variant = TanreiButtonVariant.Text)
        TanreiButton(text = "Reset", onClick = { events += "reset" }, modifier = Modifier.testTag(RESET), variant = TanreiButtonVariant.Text)
    }

    /** A sheet through the public API: a standard one at the end of the page's row, a modal one over it. */
    private fun showSheet(
        system: TanreiSystem = tanrei,
        variant: TanreiSideSheetVariant = TanreiSideSheetVariant.Standard,
        startOpen: Boolean = true,
        headline: String = HEADLINE,
        closable: Boolean = true,
        closeLabel: String = CLOSE,
        withActions: Boolean = true,
        initialFocus: FocusRequester? = null,
        direction: LayoutDirection = LayoutDirection.Ltr,
        content: (@Composable () -> Unit)? = null,
    ) {
        open = startOpen
        show(system, direction) {
            val sheet: @Composable () -> Unit = {
                TanreiSideSheet(
                    visible = open,
                    onClose = { reason ->
                        events += "close:${reason.name.lowercase()}"
                        if (closeOnRequest) open = false
                    },
                    headline = headline,
                    modifier = Modifier.testTag(SHEET),
                    variant = variant,
                    closable = closable,
                    closeLabel = closeLabel,
                    initialFocus = initialFocus,
                    actions = if (withActions) twoActions else null,
                ) { content?.invoke() ?: Content() }
            }
            Row(Modifier.fillMaxSize()) {
                Column(Modifier.testTag(PAGE).weight(1f).fillMaxHeight()) {
                    TanreiButton(text = "Open", onClick = { open = true }, modifier = Modifier.testTag(OPENER), variant = TanreiButtonVariant.Text)
                    Box(Modifier.testTag(AFTER).size(48.dp).clickable { events += "after" })
                }
                if (variant != TanreiSideSheetVariant.Modal) sheet()
            }
            if (variant == TanreiSideSheetVariant.Modal) sheet()
        }
    }

    /** The in-place form (the baselines' harness) in the stage. */
    private fun inPlace(
        system: TanreiSystem = tanrei,
        variant: TanreiSideSheetVariant = TanreiSideSheetVariant.Standard,
        headline: String = HEADLINE,
        closable: Boolean = true,
        withActions: Boolean = true,
        windowInsets: WindowInsets = WindowInsets(0, 0, 0, 0),
        direction: LayoutDirection = LayoutDirection.Ltr,
        fontScale: Float = 1f,
        actions: (@Composable RowScope.() -> Unit)? = null,
        content: (@Composable () -> Unit)? = null,
    ) {
        show(system, direction, fontScale) {
            TanreiSideSheetContent(
                headline = headline,
                variant = variant,
                closable = closable,
                closeLabel = CLOSE,
                onClose = { events += "close:${it.name.lowercase()}" },
                windowInsets = windowInsets,
                actions = actions ?: if (withActions) twoActions else null,
                modifier = Modifier.testTag(SHEET),
            ) { content?.invoke() ?: Content() }
        }
    }

    private fun dialogs(): Int = rule.onAllNodes(isDialog()).fetchSemanticsNodes().size

    private fun bounds(tag: String): DpRect = rule.onNodeWithTag(tag).getUnclippedBoundsInRoot()

    private fun sheet(): DpRect = bounds(SHEET)

    private fun closeButton() = rule.onNodeWithContentDescription(CLOSE)

    // ── SSH-1: standard ──────────────────────────────────────────────────────

    @Test
    fun `SSH-1 a standard sheet takes its width at the end of the row while open, none and no presence while closed, and slides as the content resizes`() {
        val slow = 400
        val system = tanrei.copy(sideSheet = tokens.copy(motionEnterDuration = slow, motionEnterEasing = tanrei.motion.easing.linear, motionExitDuration = slow, motionExitEasing = tanrei.motion.easing.linear))
        showSheet(system = system)
        assertEquals((STAGE_WIDTH - tokens.containerWidth).value, bounds(PAGE).width.value, 0.5f)
        assertEquals(STAGE_WIDTH.value, sheet().right.value, 0.5f)
        assertEquals("the full height", STAGE_HEIGHT.value, sheet().height.value, 0.5f)
        open = false
        rule.mainClock.autoAdvance = false
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(slow / 2L)
        val half = bounds(PAGE).width
        assertTrue("the content resizes as it slides: $half", half > STAGE_WIDTH - tokens.containerWidth + 40.dp && half < STAGE_WIDTH - 40.dp)
        rule.mainClock.advanceTimeBy(slow.toLong())
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        assertEquals(STAGE_WIDTH.value, bounds(PAGE).width.value, 0.5f)
        assertEquals("not in the tree", 0, rule.onAllNodes(hasText(HEADLINE)).fetchSemanticsNodes().size)
        open = true
        rule.waitForIdle()
        assertEquals((STAGE_WIDTH - tokens.containerWidth).value, bounds(PAGE).width.value, 0.5f)
    }

    @Test
    @KeyboardNavigation
    fun `SSH-1 a standard sheet draws no scrim, lets Tab leave it open, and ignores Escape, back and drags`() {
        showSheet(withActions = false)
        assertEquals(0, dialogs())
        assertPixel("the page is not dimmed", stagePixel(200.dp, 200.dp), surface)
        rule.onNodeWithTag(FIRST).requestFocus().performKeyInput { pressKey(Key.Escape) }
        rule.waitForIdle()
        hostKey(KeyEvent.KEYCODE_BACK)
        rule.onNodeWithTag(STAGE_TAG).performTouchInput { swipeWithVelocity(Offset(500.dp.toPx(), 300.dp.toPx()), Offset(700.dp.toPx(), 300.dp.toPx()), endVelocity = 3000f, durationMillis = 100) }
        rule.waitForIdle()
        assertEquals(emptyList<String>(), events)
        assertTrue(open)
        rule.onNodeWithTag(OPENER).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(AFTER).assertIsFocused()
        rule.onNodeWithTag(AFTER).performClick()
        rule.waitForIdle()
        assertEquals(listOf("after"), events)
    }

    // ── SSH-2: modal ─────────────────────────────────────────────────────────

    @Test
    fun `SSH-2 a modal sheet slides in from the end edge over the enter motion while its scrim fades in, and out over the exit motion`() {
        val slow = 400
        val linear = tanrei.motion.easing.linear
        val system = tanrei.copy(sideSheet = tokens.copy(motionEnterDuration = slow, motionEnterEasing = linear, motionExitDuration = slow, motionExitEasing = linear))
        showSheet(system = system, variant = TanreiSideSheetVariant.Modal, startOpen = false)
        rule.mainClock.autoAdvance = false
        open = true
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(slow / 2L)
        val window = rule.onNode(isDialog()).getUnclippedBoundsInRoot()
        val rest = window.right - tokens.containerWidth
        val half = sheet().left
        assertTrue("sliding in: $half, at rest $rest", half > rest + 40.dp && half < window.right - 40.dp)
        val scrimAlpha = dialogImage()[4, 4].alpha
        val scrim = tokens.scrimColor.resolve(colors).alpha
        assertTrue("the scrim fading in: $scrimAlpha of $scrim", scrimAlpha > 0.05f && scrimAlpha < scrim - 0.05f)
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertEquals("in place", rest.value, sheet().left.value, 0.5f)
        open = false
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(slow / 2L)
        assertTrue("sliding out: ${sheet().left}", sheet().left > rest + 40.dp)
        rule.mainClock.advanceTimeBy(slow.toLong())
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        assertEquals(0, dialogs())
    }

    @Test
    @KeyboardNavigation
    fun `SSH-2 a modal sheet hides what is behind, counts as a modal dialog and keeps focus inside - Tab and Shift+Tab wrap`() {
        showSheet(variant = TanreiSideSheetVariant.Modal, startOpen = false)
        val before = hostView!!.importantForAccessibility
        rule.onNodeWithTag(OPENER).requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals(1, dialogs())
        assertEquals(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS, hostView!!.importantForAccessibility)
        assertEquals(1, TanreiModalDialogs.open)
        rule.onNodeWithTag(RESET).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        closeButton().assertIsFocused().performKeyInput { withKeyDown(Key.ShiftLeft) { pressKey(Key.Tab) } }
        rule.waitForIdle()
        rule.onNodeWithTag(RESET).assertIsFocused()
        open = false
        rule.waitForIdle()
        assertEquals("restored", before, hostView!!.importantForAccessibility)
        assertEquals(0, TanreiModalDialogs.open)
    }

    // ── SSH-3: focus ─────────────────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `SSH-3 opening moves focus to the panel, Tab then reaches the close button, and closing returns focus to the opener - modal and standard`() {
        for (variant in listOf(TanreiSideSheetVariant.Modal, TanreiSideSheetVariant.Standard)) {
            showSheet(variant = variant, startOpen = false)
            rule.onNodeWithTag(OPENER).requestFocus().performKeyInput { pressKey(Key.Enter) }
            rule.waitForIdle()
            rule.onNodeWithTag(SHEET).assertIsFocused().performKeyInput { pressKey(Key.Tab) }
            rule.waitForIdle()
            closeButton().assertIsFocused()
            open = false
            rule.waitForIdle()
            rule.onNodeWithTag(OPENER).assertIsFocused()
        }
    }

    @Test
    @KeyboardNavigation
    fun `SSH-3 a marked element takes focus when the sheet opens, and a standard sheet mounted open moves none`() {
        val mark = FocusRequester()
        showSheet(startOpen = false, initialFocus = mark, content = {
            TanreiButton(text = "First", onClick = {}, modifier = Modifier.testTag(FIRST).focusRequester(mark), variant = TanreiButtonVariant.Text)
        })
        rule.onNodeWithTag(OPENER).requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        rule.onNodeWithTag(FIRST).assertIsFocused()
        showSheet(startOpen = true)
        rule.onNodeWithTag(SHEET).assertIsNotFocused()
        closeButton().assertIsNotFocused()
    }

    @Test
    @KeyboardNavigation
    fun `SSH-3 a modal sheet mounted open moves focus in as if it had just opened - to the panel, or to the marked element`() {
        showSheet(variant = TanreiSideSheetVariant.Modal, startOpen = true)
        rule.onNodeWithTag(SHEET).assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        closeButton().assertIsFocused()
        val mark = FocusRequester()
        showSheet(variant = TanreiSideSheetVariant.Modal, startOpen = true, initialFocus = mark, content = {
            TanreiButton(text = "First", onClick = {}, modifier = Modifier.testTag(FIRST).focusRequester(mark), variant = TanreiButtonVariant.Text)
        })
        rule.onNodeWithTag(FIRST).assertIsFocused()
        rule.onNodeWithTag(SHEET).assertIsNotFocused()
    }

    // ── SSH-4 / SSH-6: asking to close ───────────────────────────────────────

    @Test
    fun `SSH-4 SSH-6 the scrim, Escape and back each ask a modal sheet to close once with their reason, and the product closes it`() {
        showSheet(variant = TanreiSideSheetVariant.Modal)
        rule.onNode(isDialog()).performTouchInput { click(Offset(20f, height / 2f)) }
        rule.waitForIdle()
        assertEquals(listOf("close:scrim"), events)
        assertEquals(0, dialogs())
        open = true
        rule.waitForIdle()
        rule.onNodeWithTag(FIRST).requestFocus().performKeyInput { pressKey(Key.Escape) }
        rule.waitForIdle()
        open = true
        rule.waitForIdle()
        windowKey(KeyEvent.KEYCODE_BACK)
        assertEquals(listOf("close:scrim", "close:escape", "close:back"), events)
        assertEquals(0, dialogs())
    }

    @Test
    fun `SSH-4 a drag toward the end edge follows the finger past the slop, past half or flung it asks to close, and a short slow one slides back`() {
        showSheet(variant = TanreiSideSheetVariant.Modal)
        val rest = sheet().left
        val y = 300.dp
        rule.mainClock.autoAdvance = false
        dialog { down(Offset((rest + 100.dp).toPx(), y.toPx())); moveBy(Offset(40.dp.toPx(), 0f)); moveBy(Offset(40.dp.toPx(), 0f)) }
        rule.mainClock.advanceTimeByFrame()
        val slop = touchSlop()
        assertEquals("follows the finger past the slop", (rest + 80.dp - slop).value, sheet().left.value, 1f)
        // Held still before it is lifted: no fling.
        rule.mainClock.advanceTimeBy(300)
        dialog { up() }
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        assertEquals("slid back", rest.value, sheet().left.value, 0.5f)
        assertEquals(emptyList<String>(), events)
        dialog { swipe(Offset((rest + 100.dp).toPx(), y.toPx()), Offset((rest + 100.dp + tokens.containerWidth * 0.6f).toPx(), y.toPx()), durationMillis = 3000) }
        rule.waitForIdle()
        assertEquals("past half", listOf("close:drag"), events)
        assertEquals(0, dialogs())
        open = true
        rule.waitForIdle()
        dialog { swipeWithVelocity(Offset((rest + 100.dp).toPx(), y.toPx()), Offset((rest + 160.dp).toPx(), y.toPx()), endVelocity = 2000f, durationMillis = 80) }
        rule.waitForIdle()
        assertEquals("flung", listOf("close:drag", "close:drag"), events)
    }

    @Test
    fun `SSH-6 a declined drag slides back, and a declined scrim press leaves it open`() {
        closeOnRequest = false
        showSheet(variant = TanreiSideSheetVariant.Modal)
        val rest = sheet().left
        dialog { swipe(Offset((rest + 100.dp).toPx(), 300.dp.toPx()), Offset((rest + 300.dp).toPx(), 300.dp.toPx()), durationMillis = 3000) }
        rule.waitForIdle()
        assertEquals(listOf("close:drag"), events)
        assertEquals("slid back", rest.value, sheet().left.value, 0.5f)
        rule.onNode(isDialog()).performTouchInput { click(Offset(20f, height / 2f)) }
        rule.waitForIdle()
        assertEquals(listOf("close:drag", "close:scrim"), events)
        assertEquals(1, dialogs())
    }

    @Test
    fun `SSH-6 closed from a drag it slides out from where the drag left it`() {
        val slow = 400
        val system = tanrei.copy(sideSheet = tokens.copy(motionExitDuration = slow, motionExitEasing = tanrei.motion.easing.linear))
        showSheet(system = system, variant = TanreiSideSheetVariant.Modal)
        val rest = sheet().left
        rule.mainClock.autoAdvance = false
        dialog { down(Offset((rest + 50.dp).toPx(), 300.dp.toPx())); moveBy(Offset(120.dp.toPx(), 0f)); moveBy(Offset(120.dp.toPx(), 0f)) }
        rule.mainClock.advanceTimeByFrame()
        val left = sheet().left
        assertTrue("dragged: $left", left > rest + 200.dp)
        dialog { up() }
        var frames = 0
        while (events.isEmpty() && frames < 20) {
            rule.mainClock.advanceTimeByFrame()
            frames++
        }
        assertEquals(listOf("close:drag"), events)
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        val start = sheet().left
        assertTrue("leaves from where it was: $left, then $start", start >= left - 1.dp && start < left + 60.dp)
        rule.mainClock.advanceTimeBy(slow * 2L)
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        assertEquals(0, dialogs())
    }

    // ── SSH-5: the close button ──────────────────────────────────────────────

    @Test
    fun `SSH-5 the close button is a standard medium icon button named by closeLabel, and it asks to close once with close - in either variant`() {
        for (variant in listOf(TanreiSideSheetVariant.Standard, TanreiSideSheetVariant.Modal)) {
            events.clear()
            showSheet(variant = variant)
            closeButton().assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
            val button = closeButton().getUnclippedBoundsInRoot()
            assertTrue("the touch target", button.width >= tanrei.measure.targetTouch && button.height >= tanrei.measure.targetTouch)
            closeButton().performClick()
            rule.waitForIdle()
            assertEquals(listOf("close:close"), events)
            assertFalse(open)
        }
    }

    @Test
    fun `SSH-5 the close button is the icon button unrestyled - its standard medium container, its own tokens`() {
        val iconButton = tanrei.iconButton
        val pressed = iconButton.copy(variants = iconButton.variants.copy(standard = iconButton.variants.standard.copy(enabled = iconButton.variants.standard.enabled.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)))))
        inPlace(system = tanrei.copy(iconButton = pressed))
        val button = closeButton().getUnclippedBoundsInRoot()
        val middle = DpRect(button.left, button.top, button.right, button.bottom).let { (it.left + it.right) / 2 to (it.top + it.bottom) / 2 }
        val size = iconButton.sizes.medium.containerSize
        assertPixel("the icon button's own container color", stagePixel(middle.first - size / 2 + 3.dp, middle.second), colors[TanreiColorRole.Error])
    }

    @Test
    fun `SSH-5 a close button without a label still works, and a debuggable app reports it`() = collectingReports { reports ->
        setDebuggable(true)
        showSheet(closeLabel = "")
        assertTrue(reports.toString(), reports.any { "closeLabel" in it })
    }

    // ── SSH-7: the panel ─────────────────────────────────────────────────────

    @Test
    fun `SSH-7 each variant draws its own color, corners and edge - standard square with an edge, modal rounded at its start with none`() {
        val edgeColor = tokens.variants.standard.outlineColor.resolve(colors)
        inPlace()
        val box = sheet()
        assertEquals(tokens.containerWidth.value, box.width.value, 0.5f)
        assertPixel("standard's color", stagePixel(box.left + 100.dp, box.top + 300.dp), tokens.variants.standard.containerColor.resolve(colors))
        assertPixel("its edge at the start", stagePixel(box.left, box.top + 300.dp), edgeColor.over(surface))
        assertPixel("a square corner", stagePixel(box.left + 2.dp, box.top + 1.dp), tokens.variants.standard.containerColor.resolve(colors))
        val modal = tanrei.copy(sideSheet = tokens.copy(variants = tokens.variants.copy(modal = tokens.variants.modal.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error), containerShape = 24.dp, containerElevation = emptyList()))))
        inPlace(system = modal, variant = TanreiSideSheetVariant.Modal)
        val panel = sheet()
        val error = colors[TanreiColorRole.Error]
        assertPixel("modal's color", stagePixel(panel.left + 100.dp, panel.top + 300.dp), error)
        assertTrue("its start corner rounded", !isClose(stagePixel(panel.left + 1.dp, panel.top + 1.dp), error, 0.1f))
        assertPixel("its end corner square", stagePixel(panel.right - 2.dp, panel.top + 2.dp), error)
        assertPixel("no edge", stagePixel(panel.left, panel.top + 300.dp), error)
    }

    @Test
    fun `SSH-7 a modal sheet stays a touch target narrower than the window, and right-to-left puts a sheet at the left edge`() {
        val wide = tanrei.copy(sideSheet = tokens.copy(containerWidth = 710.dp))
        showSheet(system = wide, variant = TanreiSideSheetVariant.Modal)
        val window = rule.onNode(isDialog()).getUnclippedBoundsInRoot()
        assertEquals((window.width - tanrei.measure.targetTouch).value, sheet().width.value, 0.5f)
        inPlace(direction = LayoutDirection.Rtl)
        assertEquals(0f, sheet().left.value, 0.5f)
        assertPixel("its edge at its start, now its right", stagePixel(sheet().right - 0.5.dp, 300.dp), tokens.variants.standard.outlineColor.resolve(colors).over(surface))
        inPlace(direction = LayoutDirection.Rtl, variant = TanreiSideSheetVariant.Modal)
        assertEquals(0f, sheet().left.value, 0.5f)
    }

    // ── SSH-8 / SSH-9: layout and headline ───────────────────────────────────

    @Test
    fun `SSH-8 the header, the content and the footer - padded, the close button at its inset, the headline at the start`() {
        inPlace()
        val box = sheet()
        val headline = rule.onNodeWithText(HEADLINE, useUnmergedTree = true).getUnclippedBoundsInRoot()
        assertEquals("headline at the start", (box.left + tokens.containerPaddingInline).value, headline.left.value, 0.6f)
        assertTrue("in a header at least header-height", headline.top >= box.top && headline.bottom <= box.top + tokens.headerHeight)
        val button = closeButton().getUnclippedBoundsInRoot()
        assertEquals("close button at its inset from the end", (box.right - tokens.headerPaddingInlineEnd).value, button.right.value, 0.6f)
        assertEquals("centred in the row", ((headline.top + headline.bottom) / 2).value, ((button.top + button.bottom) / 2).value, 1f)
        val first = bounds(FIRST)
        assertEquals("content directly below the header", (box.top + tokens.headerHeight).value, first.top.value, 0.6f)
        assertEquals("content inset", (box.left + tokens.containerPaddingInline).value, first.left.value, 0.6f)
        // No header: the content starts padding-block below the top edge; no actions: padding-block below it.
        inPlace(headline = "", closable = false, withActions = false)
        assertEquals((sheet().top + tokens.containerPaddingBlock).value, bounds(FIRST).top.value, 0.6f)
    }

    @Test
    fun `SSH-8 the panel reaches under the end, top and bottom insets and keeps what it holds inside them`() {
        inPlace(windowInsets = WindowInsets(right = 20.dp, top = 24.dp, bottom = 16.dp))
        val box = sheet()
        assertEquals("under the end inset", STAGE_WIDTH.value, box.right.value, 0.5f)
        assertEquals((tokens.containerWidth + 20.dp).value, box.width.value, 0.5f)
        val button = closeButton().getUnclippedBoundsInRoot()
        assertEquals((box.right - 20.dp - tokens.headerPaddingInlineEnd).value, button.right.value, 0.6f)
        assertTrue("below the top inset", rule.onNodeWithText(HEADLINE, useUnmergedTree = true).getUnclippedBoundsInRoot().top >= box.top + 24.dp)
        assertTrue("above the bottom inset", bounds(RESET).bottom <= STAGE_HEIGHT - 16.dp)
    }

    @Test
    fun `SSH-9 the headline takes its style and color, wraps rather than truncating and grows the header, and is a heading`() {
        val red = tanrei.copy(sideSheet = tokens.copy(headlineColor = TanreiPaint.Role(TanreiColorRole.Error)))
        inPlace(system = red, headline = "Filters for every list you keep and every label they carry")
        val headline = rule.onNode(SemanticsMatcher.keyIsDefined(SemanticsProperties.Heading), useUnmergedTree = true)
        val bounds = headline.getUnclippedBoundsInRoot()
        assertTrue("wrapped and grown: $bounds", bounds.height > tokens.headlineTypescale.lineHeight.value.dp * 1.5f)
        assertTrue("the header grows: ${bounds(FIRST).top} below ${sheet().top} and ${bounds.bottom}", bounds(FIRST).top >= bounds.bottom)
        val image = rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap()
        val red0 = colors[TanreiColorRole.Error]
        val found = with(rule.density) {
            (bounds.top.roundToPx() until bounds.bottom.roundToPx()).any { y -> (bounds.left.roundToPx() until bounds.right.roundToPx()).any { x -> isClose(image[x, y], red0, 0.08f) } }
        }
        assertTrue("drawn in its color", found)
    }

    // ── SSH-10: content ──────────────────────────────────────────────────────

    @Test
    fun `SSH-10 the content is handed the content color and the body style, and scrolls between the header and the actions`() {
        inPlace(content = {
            seenColor = LocalTanreiContentColor.current
            seenStyle = LocalTanreiTextStyle.current
            Column {
                TanreiButton(text = "First", onClick = {}, modifier = Modifier.testTag(FIRST), variant = TanreiButtonVariant.Text)
                TanreiText(List(40) { TEXT_CONTENT }.joinToString(" "), modifier = Modifier.testTag(TEXT))
            }
        })
        assertEquals(tokens.contentColor.resolve(colors), seenColor)
        assertEquals(tanrei.typescale.body.size, seenStyle!!.fontSize)
        val scroller = rule.onNode(SemanticsMatcher.keyIsDefined(SemanticsProperties.VerticalScrollAxisRange))
        val viewport = scroller.getUnclippedBoundsInRoot()
        assertEquals("below the header", (sheet().top + tokens.headerHeight).value, viewport.top.value, 0.6f)
        assertTrue("above the actions", viewport.bottom <= bounds(APPLY).top - tokens.actionsPaddingBlock + 1.dp)
        val header = rule.onNodeWithText(HEADLINE, useUnmergedTree = true).getUnclippedBoundsInRoot()
        scroller.performSemanticsAction(SemanticsActions.ScrollBy) { it(0f, 200f) }
        rule.waitForIdle()
        assertEquals(200f, scroller.fetchSemanticsNode().config[SemanticsProperties.VerticalScrollAxisRange].value(), 1f)
        assertEquals("the header stays", header.top.value, rule.onNodeWithText(HEADLINE, useUnmergedTree = true).getUnclippedBoundsInRoot().top.value, 0.5f)
        assertEquals("the actions stay", (STAGE_HEIGHT - tokens.actionsPaddingBlock).value, bounds(APPLY).bottom.value, 1f)
    }

    // ── SSH-11: actions ──────────────────────────────────────────────────────

    @Test
    fun `SSH-11 a divider across the sheet above the actions, the actions in a row from the start, gap apart - stacked when they do not fit`() {
        inPlace()
        val box = sheet()
        val apply = bounds(APPLY)
        val reset = bounds(RESET)
        assertEquals((box.left + tokens.containerPaddingInline).value, apply.left.value, 0.6f)
        assertEquals((apply.right + tokens.actionsGap).value, reset.left.value, 0.6f)
        assertEquals("one row", apply.top.value, reset.top.value, 0.5f)
        val divider = tokens.dividerColor.resolve(colors)
        val dividerY = apply.top - tokens.actionsPaddingBlock - tokens.dividerWidth / 2
        assertPixel("the divider at the sheet's start", stagePixel(box.left + 2.dp, dividerY), divider.over(tokens.variants.standard.containerColor.resolve(colors)))
        assertPixel("and at its end", stagePixel(box.right - 2.dp, dividerY), divider.over(tokens.variants.standard.containerColor.resolve(colors)))
        // A narrow sheet stacks them, in order, at the start.
        val narrow = tanrei.copy(sideSheet = tokens.copy(containerWidth = 180.dp))
        inPlace(system = narrow, actions = {
            TanreiButton(text = "Apply these filters", onClick = {}, modifier = Modifier.testTag(APPLY), variant = TanreiButtonVariant.Text)
            TanreiButton(text = "Reset", onClick = {}, modifier = Modifier.testTag(RESET), variant = TanreiButtonVariant.Text)
        })
        val a = bounds(APPLY)
        val r = bounds(RESET)
        assertEquals(a.left.value, r.left.value, 0.5f)
        assertEquals((a.bottom + tokens.actionsGap).value, r.top.value, 0.6f)
    }

    // ── SSH-12 / SSH-13: semantics, unknown variant ──────────────────────────

    @Test
    fun `SSH-12 a modal sheet is a dialog named by its headline, a standard one a region named by it, and an empty headline is reported`() = collectingReports { reports ->
        showSheet(variant = TanreiSideSheetVariant.Modal)
        assertEquals(1, dialogs())
        rule.onNode(SemanticsMatcher.expectValue(SemanticsProperties.PaneTitle, HEADLINE)).assertExists()
        showSheet()
        assertEquals(0, dialogs())
        rule.onNodeWithTag(SHEET).assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf(HEADLINE)))
        rule.onNodeWithTag(SHEET).assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.PaneTitle))
        rule.onNode(SemanticsMatcher.keyIsDefined(SemanticsProperties.Heading), useUnmergedTree = true).assertExists()
        setDebuggable(true)
        showSheet(headline = "")
        assertTrue(reports.toString(), reports.any { "TanreiSideSheet" in it && "headline" in it })
    }

    @Test
    fun `SSH-13 a variant the system does not have draws with standard's tokens, behaves as standard, and a debuggable app reports it`() = collectingReports { reports ->
        inPlace()
        val expected = stage()
        inPlace(variant = TanreiSideSheetVariant("floating"))
        assertEquals("not one pixel differs", 0, differing(expected, stage()))
        setDebuggable(true)
        showSheet(variant = TanreiSideSheetVariant("floating"))
        assertTrue(reports.toString(), reports.any { "floating" in it && "TanreiSideSheet" in it })
        assertEquals("a layout region", 0, dialogs())
        assertEquals(STAGE_WIDTH.value, sheet().right.value, 0.5f)
    }

    // ── SSH-14 / SSH-15 ──────────────────────────────────────────────────────

    @Test
    fun `SSH-14 enlarged text keeps the width, grows the header with the headline and scrolls the content`() {
        inPlace(fontScale = 2f, headline = "Filters for every list")
        assertEquals(tokens.containerWidth.value, sheet().width.value, 0.5f)
        assertTrue("the header grows", bounds(FIRST).top > sheet().top + tokens.headerHeight)
        val scroller = rule.onNode(SemanticsMatcher.keyIsDefined(SemanticsProperties.VerticalScrollAxisRange))
        assertTrue(scroller.fetchSemanticsNode().config[SemanticsProperties.VerticalScrollAxisRange].maxValue() >= 0f)
        val button = closeButton().getUnclippedBoundsInRoot()
        assertEquals("the close button as the icon button draws it", tanrei.measure.targetTouch.value, button.width.value, 0.5f)
    }

    @Test
    @KeyboardNavigation
    fun `SSH-15 a dialog opened from a modal sheet stacks above it, takes Escape alone, and gives focus back inside the sheet`() {
        var inner by mutableStateOf(false)
        showSheet(variant = TanreiSideSheetVariant.Modal, withActions = false, content = {
            sheetView = LocalView.current
            Column {
                TanreiButton(text = "More", onClick = { inner = true }, modifier = Modifier.testTag(FIRST), variant = TanreiButtonVariant.Text)
                TanreiDialog(visible = inner, onDismissRequest = { events += "inner"; inner = false }, headline = "Second")
            }
        })
        rule.onNodeWithTag(FIRST).requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals(2, dialogs())
        assertEquals(2, TanreiModalDialogs.open)
        rule.onNode(SemanticsMatcher.expectValue(SemanticsProperties.PaneTitle, "Second")).assertIsFocused().performKeyInput { pressKey(Key.Escape) }
        rule.waitForIdle()
        assertEquals("only the topmost", listOf("inner"), events)
        assertEquals(1, dialogs())
        rule.onNodeWithTag(FIRST).assertIsFocused()
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    /** Touch input on the modal sheet's window — a node that does not move with the sheet. */
    private fun dialog(block: androidx.compose.ui.test.TouchInjectionScope.() -> Unit) = rule.onNode(isDialog()).performTouchInput(block)

    private fun touchSlop(): Dp = with(rule.density) { android.view.ViewConfiguration.get(ApplicationProvider.getApplicationContext()).scaledTouchSlop.toDp() }

    private fun windowKey(code: Int) {
        val root = sheetView!!.rootView
        rule.runOnUiThread {
            root.dispatchKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, code))
            root.dispatchKeyEvent(KeyEvent(KeyEvent.ACTION_UP, code))
        }
        rule.waitForIdle()
    }

    private fun hostKey(code: Int) {
        val root = hostView!!.rootView
        rule.runOnUiThread {
            root.dispatchKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, code))
            root.dispatchKeyEvent(KeyEvent(KeyEvent.ACTION_UP, code))
        }
        rule.waitForIdle()
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

    private fun Color.over(under: Color): Color = compositeOver(under)

    private fun stage(): PixelMap = rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap()

    private fun dialogImage(): PixelMap = rule.onNode(isDialog()).captureToImage().toPixelMap()

    private fun stagePixel(x: Dp, y: Dp): Color = with(rule.density) { stage()[x.roundToPx().coerceIn(0, STAGE_WIDTH.roundToPx() - 1), y.roundToPx().coerceIn(0, STAGE_HEIGHT.roundToPx() - 1)] }

    private fun differing(a: PixelMap, b: PixelMap): Int =
        (0 until minOf(a.height, b.height)).sumOf { y -> (0 until minOf(a.width, b.width)).count { x -> !isClose(a[x, y], b[x, y]) } }

    private fun isClose(actual: Color, expected: Color, tolerance: Float = PIXEL_TOLERANCE): Boolean =
        maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue)) <= tolerance

    private fun assertPixel(what: String, actual: Color, expected: Color) =
        assertTrue("$what: expected $expected but was $actual", isClose(actual, expected))

    private companion object {
        const val STAGE_TAG = "stage"
        const val SHEET = "sheet"
        const val PAGE = "page"
        const val OPENER = "opener"
        const val AFTER = "after"
        const val FIRST = "first"
        const val TEXT = "text"
        const val APPLY = "apply"
        const val RESET = "reset"
        const val HEADLINE = "Filters"
        const val CLOSE = "Close filters"
        const val TEXT_CONTENT = "Show results from the last 30 days with every selected label."
        const val PIXEL_TOLERANCE = 3f / 255f
        val STAGE_WIDTH = 720.dp
        val STAGE_HEIGHT = 480.dp
    }
}

/** SSH-1 and SSH-2 where motion is reduced (the animator duration scale is 0): at once. */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w720dp-h600dp-xhdpi")
class TanreiSideSheetReducedMotionTest {
    private object NoMotion : MotionDurationScale {
        override val scaleFactor: Float = 0f
    }

    @get:Rule
    val rule = createComposeRule(effectContext = NoMotion)

    @Test
    fun `SSH-1 SSH-2 where motion is reduced a sheet appears and goes at once`() {
        val tanrei = TanreiSystem.Tanrei
        val slow = tanrei.sideSheet.copy(motionEnterDuration = 1000, motionExitDuration = 1000)
        var open by mutableStateOf(false)
        var variant by mutableStateOf(TanreiSideSheetVariant.Standard)
        rule.setContent {
            TanreiTheme(system = tanrei.copy(sideSheet = slow), theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Row(Modifier.size(720.dp, 480.dp)) {
                    Box(Modifier.testTag("page").weight(1f).fillMaxHeight())
                    TanreiSideSheet(visible = open, onClose = {}, headline = "Filters", modifier = Modifier.testTag("sheet"), variant = variant) { TanreiText("Content") }
                }
            }
        }
        rule.waitForIdle()
        rule.mainClock.autoAdvance = false
        open = true
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        repeat(3) { rule.mainClock.advanceTimeByFrame() }
        assertEquals("standard: its width at once", (720 - tanrei.sideSheet.containerWidth.value), rule.onNodeWithTag("page").getUnclippedBoundsInRoot().width.value, 0.5f)
        open = false
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        repeat(3) { rule.mainClock.advanceTimeByFrame() }
        assertEquals("none at once", 720f, rule.onNodeWithTag("page").getUnclippedBoundsInRoot().width.value, 0.5f)
        variant = TanreiSideSheetVariant.Modal
        open = true
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        repeat(3) { rule.mainClock.advanceTimeByFrame() }
        val window = rule.onNode(isDialog()).getUnclippedBoundsInRoot()
        assertEquals("modal: in place at once", (window.right - tanrei.sideSheet.containerWidth).value, rule.onNodeWithTag("sheet").getUnclippedBoundsInRoot().left.value, 0.5f)
        open = false
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        repeat(3) { rule.mainClock.advanceTimeByFrame() }
        rule.mainClock.autoAdvance = true
        assertEquals("gone at once", 0, rule.onAllNodes(isDialog()).fetchSemanticsNodes().size)
    }
}
