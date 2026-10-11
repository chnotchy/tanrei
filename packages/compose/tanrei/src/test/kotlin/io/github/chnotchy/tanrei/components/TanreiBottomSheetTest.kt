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
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
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
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performMouseInput
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
import com.acme.design.Acme
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.primitives.TanreiModalDialogs
import io.github.chnotchy.tanrei.primitives.TanreiText
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiTextStyle
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.Cupertino
import io.github.chnotchy.tanrei.tokens.M3Like
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiBottomSheetControlStateTokens
import io.github.chnotchy.tanrei.tokens.TanreiButtonVariant
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
 * Behaviour tests for `specs/bottom-sheet.spec.json`. Each test names the behaviour id (`BSH-n`) it covers. Runs on the
 * JVM (Robolectric, native graphics). The page is a [STAGE_WIDTH] × [STAGE_HEIGHT] stage of surface holding an opener
 * button ([OPENER]) and a pressable box ([AFTER]) at its top, and the sheet: a standard sheet fills the stage (its area
 * is the stage), a modal one is presented in its own window. Geometry the window would hide behind its system insets is
 * checked on the in-place form, `TanreiBottomSheetContent`, in the stage.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w400dp-h800dp-xhdpi")
class TanreiBottomSheetTest {
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
    private val tokens = tanrei.bottomSheet
    private val surface = colors[TanreiColorRole.Surface]
    private val sheetColor = tokens.containerColor.resolve(colors)

    private val events = mutableListOf<String>()
    private var open by mutableStateOf(true)
    private var detent by mutableStateOf(TanreiBottomSheetDetent.Partial)
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

    /** The page's own controls: the opener and a pressable box, at the stage's top. */
    @Composable
    private fun Page() {
        Column(Modifier.fillMaxSize()) {
            TanreiButton(text = "Open", onClick = { open = true }, modifier = Modifier.testTag(OPENER), variant = TanreiButtonVariant.Text)
            Box(Modifier.testTag(AFTER).size(48.dp).clickable { events += "after" })
        }
    }

    /** The sheet's default content: two buttons and a text, short or [long]. */
    @Composable
    private fun Content(long: Boolean) {
        sheetView = LocalView.current
        seenColor = LocalTanreiContentColor.current
        seenStyle = LocalTanreiTextStyle.current
        Column(Modifier.fillMaxWidth()) {
            TanreiButton(text = "First", onClick = { events += "first" }, modifier = Modifier.testTag(FIRST), variant = TanreiButtonVariant.Text)
            TanreiButton(text = "Last", onClick = { events += "last" }, modifier = Modifier.testTag(LAST), variant = TanreiButtonVariant.Text)
            TanreiText(if (long) LONG else SHORT, modifier = Modifier.testTag(TEXT))
        }
    }

    /** A sheet over [Page], through the public API; the product closes it on close unless [closeOnRequest] is false. */
    private fun showSheet(
        system: TanreiSystem = tanrei,
        variant: TanreiBottomSheetVariant = TanreiBottomSheetVariant.Standard,
        startOpen: Boolean = true,
        long: Boolean = true,
        startDetent: TanreiBottomSheetDetent = TanreiBottomSheetDetent.Partial,
        dismissible: Boolean = true,
        handle: Boolean = true,
        handleLabel: String = HANDLE,
        inset: Boolean = true,
        label: String = LABEL,
        initialFocus: FocusRequester? = null,
        direction: LayoutDirection = LayoutDirection.Ltr,
        fontScale: Float = 1f,
        content: (@Composable () -> Unit)? = null,
    ) {
        open = startOpen
        detent = startDetent
        show(system, direction, fontScale) {
            Page()
            TanreiBottomSheet(
                visible = open,
                onClose = { reason ->
                    events += "close:${reason.name.lowercase()}"
                    if (closeOnRequest) open = false
                },
                modifier = Modifier.testTag(SHEET),
                variant = variant,
                detent = detent,
                onDetentChange = {
                    events += "detent:${it.name.lowercase()}"
                    detent = it
                },
                dismissible = dismissible,
                handle = handle,
                handleLabel = handleLabel,
                inset = inset,
                contentDescription = label,
                initialFocus = initialFocus,
            ) { content?.invoke() ?: Content(long) }
        }
    }

    /** The in-place form (the baselines' harness) in the stage, with insets of its area and of the sheet. */
    private fun inPlace(
        system: TanreiSystem = tanrei,
        variant: TanreiBottomSheetVariant = TanreiBottomSheetVariant.Modal,
        long: Boolean = false,
        startDetent: TanreiBottomSheetDetent = TanreiBottomSheetDetent.Partial,
        handle: Boolean = true,
        inset: Boolean = true,
        areaInsets: WindowInsets = WindowInsets(0, 0, 0, 0),
        sheetInsets: WindowInsets = WindowInsets(0, 0, 0, 0),
        direction: LayoutDirection = LayoutDirection.Ltr,
        fontScale: Float = 1f,
        content: (@Composable () -> Unit)? = null,
    ) {
        detent = startDetent
        show(system, direction, fontScale) {
            TanreiBottomSheetContent(
                variant = variant,
                detent = detent,
                handle = handle,
                handleLabel = HANDLE,
                inset = inset,
                contentDescription = LABEL,
                onClose = { events += "close:${it.name.lowercase()}" },
                onDetentChange = { events += "detent:${it.name.lowercase()}" },
                areaInsets = areaInsets,
                sheetInsets = sheetInsets,
                modifier = Modifier.testTag(SHEET),
            ) { content?.invoke() ?: Content(long) }
        }
    }

    private fun dialogs(): Int = rule.onAllNodes(isDialog()).fetchSemanticsNodes().size

    private fun sheet(): DpRect = rule.onNodeWithTag(SHEET).getUnclippedBoundsInRoot()

    private fun handleNode() = rule.onNodeWithContentDescription(HANDLE)

    private fun rowHeight(system: TanreiSystem = tanrei): Dp = system.bottomSheet.handleMarginBlock * 2 + system.bottomSheet.handleContainerHeight

    private val partialTop: Dp get() = STAGE_HEIGHT - STAGE_HEIGHT * tokens.containerPartialFraction
    private val fullTop: Dp get() = tokens.containerMarginBlockStart

    // ── BSH-1: open and close ────────────────────────────────────────────────

    @Test
    fun `BSH-1 a modal sheet slides up over the enter motion while its scrim fades in, and slides down over the exit motion`() {
        val slow = 400
        val linear = tanrei.motion.easing.linear
        val system = tanrei.copy(bottomSheet = tokens.copy(motionEnterDuration = slow, motionEnterEasing = linear, motionExitDuration = slow, motionExitEasing = linear))
        showSheet(system = system, variant = TanreiBottomSheetVariant.Modal, startOpen = false, long = false)
        assertEquals(0, dialogs())
        rule.mainClock.autoAdvance = false
        open = true
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(slow / 2L)
        val window = rule.onNode(isDialog()).getUnclippedBoundsInRoot()
        val rest = window.bottom - sheet().height
        val half = sheet().top
        assertTrue("rising: $half, at rest $rest", half > rest + 20.dp && half < window.bottom - 20.dp)
        val scrimAlpha = dialogImage()[4, 4].alpha
        val scrim = tokens.scrimColor.resolve(colors).alpha
        assertTrue("the scrim fading in: $scrimAlpha of $scrim", scrimAlpha > 0.05f && scrimAlpha < scrim - 0.05f)
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertEquals("in place", rest.value, sheet().top.value, 0.5f)
        open = false
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(slow / 2L)
        val leaving = sheet().top
        assertTrue("sliding down: $leaving", leaving > rest + 20.dp && leaving < window.bottom - 5.dp)
        rule.mainClock.advanceTimeBy(slow.toLong())
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        assertEquals("gone", 0, dialogs())
    }

    @Test
    fun `BSH-1 a standard sheet slides up with no scrim, and a sheet mounted open is in place on its first frame`() {
        val slow = 400
        val system = tanrei.copy(bottomSheet = tokens.copy(motionEnterDuration = slow, motionEnterEasing = tanrei.motion.easing.linear))
        showSheet(system = system, startOpen = false)
        rule.mainClock.autoAdvance = false
        open = true
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(slow / 2L)
        val half = sheet().top
        assertTrue("rising: $half", half > partialTop + 20.dp && half < STAGE_HEIGHT - 20.dp)
        assertPixel("no scrim over the page", stagePixel(200.dp, 100.dp), surface)
        rule.mainClock.advanceTimeBy(slow.toLong())
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        assertEquals(partialTop.value, sheet().top.value, 0.5f)
        // Mounted open: in place on its first frame, no motion.
        rule.mainClock.autoAdvance = false
        showSheet(system = system, startOpen = true)
        rule.mainClock.advanceTimeByFrame()
        assertEquals(partialTop.value, sheet().top.value, 0.5f)
        rule.mainClock.autoAdvance = true
    }

    // ── BSH-2 / BSH-3: the modal sheet and focus ─────────────────────────────

    @Test
    @KeyboardNavigation
    fun `BSH-2 a modal sheet hides what is behind, counts as a modal dialog and keeps focus inside - Tab and Shift+Tab wrap`() {
        showSheet(variant = TanreiBottomSheetVariant.Modal, startOpen = false, long = false)
        val before = hostView!!.importantForAccessibility
        rule.onNodeWithTag(OPENER).requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals(1, dialogs())
        assertEquals(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS, hostView!!.importantForAccessibility)
        assertEquals(1, TanreiModalDialogs.open)
        rule.onNodeWithTag(LAST).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(FIRST).assertIsFocused().performKeyInput { withKeyDown(Key.ShiftLeft) { pressKey(Key.Tab) } }
        rule.waitForIdle()
        rule.onNodeWithTag(LAST).assertIsFocused()
        open = false
        rule.waitForIdle()
        assertEquals("restored", before, hostView!!.importantForAccessibility)
        assertEquals(0, TanreiModalDialogs.open)
    }

    @Test
    @KeyboardNavigation
    fun `BSH-3 opening moves focus to the container, the next Tab reaches the first element, and closing returns focus to the opener`() {
        showSheet(variant = TanreiBottomSheetVariant.Modal, startOpen = false, long = false)
        rule.onNodeWithTag(OPENER).requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        rule.onNodeWithTag(SHEET).assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(FIRST).assertIsFocused()
        open = false
        rule.waitForIdle()
        rule.onNodeWithTag(OPENER).assertIsFocused()
    }

    @Test
    @KeyboardNavigation
    fun `BSH-3 a marked element takes focus when the sheet opens, a standard sheet hands focus back, and a standard sheet mounted open moves none`() {
        val mark = FocusRequester()
        showSheet(startOpen = false, long = false, content = {
            Column {
                TanreiButton(text = "First", onClick = {}, modifier = Modifier.testTag(FIRST), variant = TanreiButtonVariant.Text)
                TanreiButton(text = "Last", onClick = {}, modifier = Modifier.testTag(LAST).focusRequester(mark), variant = TanreiButtonVariant.Text)
            }
        }, initialFocus = mark)
        rule.onNodeWithTag(OPENER).requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        rule.onNodeWithTag(LAST).assertIsFocused()
        open = false
        rule.waitForIdle()
        rule.onNodeWithTag(OPENER).assertIsFocused()
        // Mounted open: focus stays where it was.
        showSheet(startOpen = true, long = false)
        rule.onNodeWithTag(SHEET).assertIsNotFocused()
        rule.onNodeWithTag(FIRST).assertIsNotFocused()
    }

    @Test
    @KeyboardNavigation
    fun `BSH-3 a modal sheet mounted open moves focus in as if it had just opened - to the container, or to the marked element`() {
        showSheet(variant = TanreiBottomSheetVariant.Modal, startOpen = true, long = false)
        rule.onNodeWithTag(SHEET).assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(FIRST).assertIsFocused()
        val mark = FocusRequester()
        showSheet(variant = TanreiBottomSheetVariant.Modal, startOpen = true, long = false, content = {
            Column {
                TanreiButton(text = "First", onClick = {}, modifier = Modifier.testTag(FIRST), variant = TanreiButtonVariant.Text)
                TanreiButton(text = "Last", onClick = {}, modifier = Modifier.testTag(LAST).focusRequester(mark), variant = TanreiButtonVariant.Text)
            }
        }, initialFocus = mark)
        rule.onNodeWithTag(LAST).assertIsFocused()
        rule.onNodeWithTag(SHEET).assertIsNotFocused()
    }

    // ── BSH-4: the standard sheet is a layout region ─────────────────────────

    @Test
    @KeyboardNavigation
    fun `BSH-4 a standard sheet draws no scrim, is no dialog, lets Tab leave it open, ignores Escape and back, and lets presses above it reach the page`() {
        showSheet(long = false)
        assertEquals(0, dialogs())
        assertTrue("nothing is hidden", hostView!!.importantForAccessibility != View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS)
        assertPixel("the page above is not dimmed", stagePixel(200.dp, 200.dp), surface)
        rule.onNodeWithTag(AFTER).performClick()
        rule.waitForIdle()
        assertEquals(listOf("after"), events)
        rule.onNodeWithTag(LAST).requestFocus().performKeyInput { pressKey(Key.Escape) }
        rule.waitForIdle()
        hostKey(KeyEvent.KEYCODE_BACK)
        assertEquals("no close", listOf("after"), events)
        rule.onNodeWithTag(OPENER).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(AFTER).assertIsFocused()
        assertTrue("still open", open)
        assertEquals("docked to the parent's bottom", STAGE_HEIGHT.value, sheet().bottom.value, 0.5f)
    }

    // ── BSH-5: asking to close ───────────────────────────────────────────────

    @Test
    fun `BSH-5 the scrim, Escape and back each ask a modal sheet to close once with their reason, and the product closes it`() {
        showSheet(variant = TanreiBottomSheetVariant.Modal, long = false)
        rule.onNode(isDialog()).performTouchInput { click(Offset(width / 2f, 20f)) }
        rule.waitForIdle()
        assertEquals(listOf("close:scrim"), events)
        assertEquals(0, dialogs())
        open = true
        rule.waitForIdle()
        rule.onNodeWithTag(FIRST).requestFocus().performKeyInput { pressKey(Key.Escape) }
        rule.waitForIdle()
        assertEquals(listOf("close:scrim", "close:escape"), events)
        open = true
        rule.waitForIdle()
        windowKey(KeyEvent.KEYCODE_BACK)
        assertEquals(listOf("close:scrim", "close:escape", "close:back"), events)
        assertEquals(0, dialogs())
    }

    @Test
    fun `BSH-5 while not dismissible the scrim, Escape, back and a drag do nothing, and the scrim still blocks the page`() {
        showSheet(variant = TanreiBottomSheetVariant.Modal, long = false, dismissible = false)
        rule.onNode(isDialog()).performTouchInput { click(Offset(24f, 24f)) }
        rule.onNodeWithTag(FIRST).requestFocus().performKeyInput { pressKey(Key.Escape) }
        windowKey(KeyEvent.KEYCODE_BACK)
        val top = sheet().top + rowHeight() / 2
        rule.onNode(isDialog()).performTouchInput { swipe(Offset(centerX, top.toPx()), Offset(centerX, (top + 300.dp).toPx()), durationMillis = 200) }
        rule.waitForIdle()
        assertEquals(emptyList<String>(), events)
        assertEquals(1, dialogs())
    }

    @Test
    fun `BSH-5 a declined request leaves the sheet open, and closing emits once per request`() {
        closeOnRequest = false
        showSheet(variant = TanreiBottomSheetVariant.Modal, long = false)
        rule.onNode(isDialog()).performTouchInput { click(Offset(width / 2f, 20f)) }
        rule.waitForIdle()
        assertEquals(listOf("close:scrim"), events)
        assertEquals("the product decides", 1, dialogs())
    }

    // ── BSH-6: heights ───────────────────────────────────────────────────────

    @Test
    fun `BSH-6 a short sheet is as tall as its row and content, a long one takes the partial fraction or reaches the full height`() {
        inPlace(long = false)
        val text = rule.onNodeWithTag(TEXT).getUnclippedBoundsInRoot()
        assertEquals("row + content + padding", (text.bottom + tokens.containerPadding).value, STAGE_HEIGHT.value, 0.6f)
        assertEquals("one height", (STAGE_HEIGHT - sheet().height).value, sheet().top.value, 0.5f)
        assertTrue("shorter than partial", sheet().top > partialTop)
        inPlace(long = true)
        assertEquals(partialTop.value, sheet().top.value, 0.5f)
        inPlace(long = true, startDetent = TanreiBottomSheetDetent.Full)
        assertEquals(fullTop.value, sheet().top.value, 0.5f)
        // The values drive it.
        inPlace(system = tanrei.copy(bottomSheet = tokens.copy(containerPartialFraction = 0.25f, containerMarginBlockStart = 100.dp)), long = true)
        assertEquals((STAGE_HEIGHT * 0.75f).value, sheet().top.value, 0.5f)
        inPlace(system = tanrei.copy(bottomSheet = tokens.copy(containerPartialFraction = 0.25f, containerMarginBlockStart = 100.dp)), long = true, startDetent = TanreiBottomSheetDetent.Full)
        assertEquals(100f, sheet().top.value, 0.5f)
    }

    @Test
    fun `BSH-6 with the keyboard shown the area ends at its top edge and both heights come from the smaller area`() {
        val keyboard = 300.dp
        inPlace(long = true, areaInsets = WindowInsets(bottom = keyboard))
        val area = STAGE_HEIGHT - keyboard
        assertEquals("on the keyboard", area.value, sheet().bottom.value, 0.5f)
        assertEquals((area * (1f - tokens.containerPartialFraction)).value, sheet().top.value, 0.5f)
        inPlace(long = true, startDetent = TanreiBottomSheetDetent.Full, areaInsets = WindowInsets(bottom = keyboard))
        assertEquals(fullTop.value, sheet().top.value, 0.5f)
    }

    // ── BSH-7: the container ─────────────────────────────────────────────────

    @Test
    fun `BSH-7 docked at the bottom, centred no wider than max-width, its color, top corners rounded and bottom corners square`() {
        val narrow = 300.dp
        val system = tanrei.copy(bottomSheet = tokens.copy(containerMaxWidth = narrow, containerShape = 24.dp, containerColor = TanreiPaint.Role(TanreiColorRole.Error)))
        val error = colors[TanreiColorRole.Error]
        inPlace(system = system, variant = TanreiBottomSheetVariant.Standard)
        val box = sheet()
        assertEquals(narrow.value, box.width.value, 0.5f)
        assertEquals(((STAGE_WIDTH - narrow) / 2).value, box.left.value, 0.5f)
        assertEquals(STAGE_HEIGHT.value, box.bottom.value, 0.5f)
        assertPixel("its color", stagePixel(box.left + 30.dp, box.top + 30.dp), error)
        assertTrue("the top corner is rounded", !isClose(stagePixel(box.left + 1.dp, box.top + 1.dp), error, 0.1f))
        assertPixel("the bottom corner is square", stagePixel(box.left + 4.dp, box.bottom - 4.dp), error)
        assertTrue("beside it, the page", !isClose(stagePixel(box.left - 20.dp, box.bottom - 10.dp), error, 0.1f))
    }

    @Test
    fun `BSH-7 the color reaches under the bottom inset and the content stays above it`() {
        val inset = 24.dp
        inPlace(sheetInsets = WindowInsets(bottom = inset))
        val box = sheet()
        assertEquals(STAGE_HEIGHT.value, box.bottom.value, 0.5f)
        assertPixel("under the inset", stagePixel(20.dp, STAGE_HEIGHT - 4.dp), sheetColor)
        val text = rule.onNodeWithTag(TEXT).getUnclippedBoundsInRoot()
        assertEquals((STAGE_HEIGHT - inset - tokens.containerPadding).value, text.bottom.value, 0.6f)
    }

    // ── BSH-8: layout, color and type ────────────────────────────────────────

    @Test
    fun `BSH-8 the handle's row then the content, inset from the sides and the bottom, handed the content color and the body style`() {
        inPlace()
        val box = sheet()
        val first = rule.onNodeWithTag(FIRST).getUnclippedBoundsInRoot()
        assertEquals("below the row", (box.top + rowHeight()).value, first.top.value, 0.6f)
        assertEquals("inset from the start", (box.left + tokens.containerPadding).value, first.left.value, 0.6f)
        val text = rule.onNodeWithTag(TEXT).getUnclippedBoundsInRoot()
        assertEquals("inset from the end", (box.right - tokens.containerPadding).value, text.right.value, 0.6f)
        assertEquals(tokens.contentColor.resolve(colors), seenColor)
        assertEquals(tanrei.typescale.body.size, seenStyle!!.fontSize)
        assertEquals(tanrei.typescale.body.lineHeight, seenStyle!!.lineHeight)
        // No handle: padded from the top edge too.
        inPlace(handle = false)
        assertEquals((sheet().top + tokens.containerPadding).value, rule.onNodeWithTag(FIRST).getUnclippedBoundsInRoot().top.value, 0.6f)
        // inset false: the content reaches the edges, below the row.
        inPlace(inset = false)
        val flush = rule.onNodeWithTag(TEXT).getUnclippedBoundsInRoot()
        assertEquals(sheet().left.value, rule.onNodeWithTag(FIRST).getUnclippedBoundsInRoot().left.value, 0.6f)
        assertEquals(sheet().bottom.value, flush.bottom.value, 0.6f)
    }

    // ── BSH-9: dragging ──────────────────────────────────────────────────────

    @Test
    fun `BSH-9 a drag by the handle's row follows the finger, a short slow one settles back, and one past the middle settles at full with detentChange once`() {
        showSheet()
        assertEquals(partialTop.value, sheet().top.value, 0.5f)
        val row = partialTop + rowHeight() / 2
        stageSwipe(row, row - 40.dp, 2000)
        assertEquals("settled back", partialTop.value, sheet().top.value, 0.5f)
        assertEquals(emptyList<String>(), events)
        rule.mainClock.autoAdvance = false
        stage { down(at(row)); moveBy(Offset(0f, -40.dp.toPx())); moveBy(Offset(0f, -60.dp.toPx())) }
        rule.mainClock.advanceTimeByFrame()
        val slop = touchSlop()
        assertEquals("follows the finger, past the slop", (partialTop - 100.dp + slop).value, sheet().top.value, 1f)
        stage { moveBy(Offset(0f, 20.dp.toPx())) }
        rule.mainClock.advanceTimeByFrame()
        assertEquals("and back down with it", (partialTop - 80.dp + slop).value, sheet().top.value, 1f)
        stage { up() }
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        events.clear()
        showSheet()
        stageSwipe(row, row - 200.dp, 3000)
        assertEquals(fullTop.value, sheet().top.value, 0.5f)
        assertEquals(listOf("detent:full"), events)
        assertEquals(TanreiBottomSheetDetent.Full, detent)
    }
    @Test
    fun `BSH-9 a fling moves to the next height in its direction, and a fling down from the lowest height or a release below half of it asks to close`() {
        showSheet()
        val partialRow = partialTop + rowHeight() / 2
        val fullRow = fullTop + rowHeight() / 2
        stageFling(partialRow, partialRow - 100.dp)
        assertEquals("flung up to full", fullTop.value, sheet().top.value, 0.5f)
        stageFling(fullRow, fullRow + 100.dp)
        assertEquals("flung down to partial", partialTop.value, sheet().top.value, 0.5f)
        stageFling(partialRow, partialRow + 100.dp)
        assertEquals(listOf("detent:full", "detent:partial", "close:drag"), events)
        assertFalse(open)
        // A slow release below half of the lowest height.
        events.clear()
        showSheet()
        stageSwipe(partialRow, partialRow + 250.dp, 3000)
        assertEquals(listOf("close:drag"), events)
    }
    @Test
    fun `BSH-9 while not dismissible a drag below the lowest height settles back at it, and a move within the touch slop does not move the sheet`() {
        showSheet(dismissible = false)
        val row = partialTop + rowHeight() / 2
        stageFling(row, row + 300.dp)
        assertEquals(emptyList<String>(), events)
        assertEquals(partialTop.value, sheet().top.value, 0.5f)
        stageSwipe(row, row + 300.dp, 3000)
        assertEquals(emptyList<String>(), events)
        assertEquals(partialTop.value, sheet().top.value, 0.5f)
        rule.mainClock.autoAdvance = false
        stage { down(at(row)); moveBy(Offset(0f, -touchSlop().toPx() * 0.8f)) }
        rule.mainClock.advanceTimeByFrame()
        assertEquals("within the slop", partialTop.value, sheet().top.value, 0.5f)
        stage { up() }
        rule.mainClock.autoAdvance = true
    }
    // ── BSH-10: scrolling ────────────────────────────────────────────────────

    @Test
    fun `BSH-10 a drag up on the content first raises the sheet to full and then scrolls it, a drag down first scrolls back to the top and then lowers it`() {
        showSheet()
        val slop = touchSlop()
        stage { down(at(560.dp)) }
        stageMoves(steps = 10, by = 20.dp)
        assertEquals("the sheet follows the finger, the content does not scroll", (partialTop - 200.dp + slop).value, sheet().top.value, 1f)
        assertEquals(0f, scrollValue(), 0.5f)
        stageMoves(steps = 10, by = 20.dp)
        assertEquals("up to full", fullTop.value, sheet().top.value, 0.5f)
        val scrolled = scrollValue()
        assertTrue("then the content scrolls: $scrolled", scrolled > 50.dp.value * 2)
        rule.mainClock.advanceTimeBy(1000)
        stage { up() }
        rule.waitForIdle()
        assertEquals(fullTop.value, sheet().top.value, 0.5f)
        assertEquals(listOf("detent:full"), events)
        // Down: first the content back to its top, then the sheet.
        stage { down(at(300.dp)) }
        var lowered = false
        repeat(25) {
            stageMoves(steps = 1, by = -16.dp)
            if (scrollValue() > 0.5f) assertEquals("the sheet waits for the content's top", fullTop.value, sheet().top.value, 0.5f) else lowered = true
        }
        assertTrue(lowered)
        assertEquals(0f, scrollValue(), 0.5f)
        assertTrue("then it lowers: ${sheet().top}", sheet().top > fullTop + 150.dp)
        rule.mainClock.advanceTimeBy(1000)
        stage { up() }
        rule.waitForIdle()
        assertEquals("lowered", partialTop.value, sheet().top.value, 0.5f)
        assertEquals(listOf("detent:full", "detent:partial"), events)
    }

    @Test
    fun `BSH-10 the content scrolls for assistive technology at the partial height, below the row`() {
        showSheet()
        val scroller = rule.onNode(SemanticsMatcher.keyIsDefined(SemanticsProperties.VerticalScrollAxisRange))
        val range = scroller.fetchSemanticsNode().config[SemanticsProperties.VerticalScrollAxisRange]
        assertTrue("scrollable at partial", range.maxValue() > 0f)
        val viewport = scroller.getUnclippedBoundsInRoot()
        assertEquals("below the row", (sheet().top + rowHeight()).value, viewport.top.value, 0.6f)
        assertEquals("within the sheet at partial", STAGE_HEIGHT.value, viewport.bottom.value, 0.6f)
        scroller.performSemanticsAction(SemanticsActions.ScrollBy) { it(0f, 100f) }
        rule.waitForIdle()
        assertEquals(100f, scroller.fetchSemanticsNode().config[SemanticsProperties.VerticalScrollAxisRange].value(), 1f)
    }

    // ── BSH-11: the handle as a control ──────────────────────────────────────

    @Test
    fun `BSH-11 with two heights the handle is one button named by handleLabel, collapsed at partial and expanded at full, and a press toggles with detentChange once`() {
        showSheet()
        handleNode().assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
        handleNode().assert(SemanticsMatcher.keyIsDefined(SemanticsActions.Expand))
        handleNode().performClick()
        rule.waitForIdle()
        assertEquals(fullTop.value, sheet().top.value, 0.5f)
        assertEquals(listOf("detent:full"), events)
        handleNode().assert(SemanticsMatcher.keyIsDefined(SemanticsActions.Collapse))
        rule.runOnUiThread { handleNode().fetchSemanticsNode().config[SemanticsActions.Collapse].action!!.invoke() }
        rule.waitForIdle()
        assertEquals(partialTop.value, sheet().top.value, 0.5f)
        assertEquals(listOf("detent:full", "detent:partial"), events)
    }

    @Test
    @KeyboardNavigation
    fun `BSH-11 Enter and Space on the handle move the sheet to its other height`() {
        showSheet()
        handleNode().requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals(fullTop.value, sheet().top.value, 0.5f)
        handleNode().performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        assertEquals(partialTop.value, sheet().top.value, 0.5f)
        assertEquals(listOf("detent:full", "detent:partial"), events)
    }

    @Test
    fun `BSH-11 at one height the handle is drawn but not exposed, focusable or pressable, and an interactive handle without a name is reported`() = collectingReports { reports ->
        showSheet(long = false)
        assertEquals(0, rule.onAllNodes(hasContentDescription(HANDLE)).fetchSemanticsNodes().size)
        val top = sheet().top
        assertPixel("the grip is drawn", gripPixel(), tokens.controls.dragHandle.enabled.gripColor.resolve(colors))
        rule.onNodeWithTag(SHEET).performTouchInput { click(Offset(width / 2f, 24.dp.toPx())) }
        rule.waitForIdle()
        assertEquals(top.value, sheet().top.value, 0.5f)
        assertEquals(emptyList<String>(), events)
        setDebuggable(true)
        showSheet(handleLabel = "")
        assertTrue(reports.toString(), reports.any { "handleLabel" in it })
    }

    // ── BSH-12: the handle's geometry ────────────────────────────────────────

    @Test
    fun `BSH-12 the grip is centred in the box, the box in its margins at the top, and the row stays while the content scrolls`() {
        val system = tanrei.withHandle(TanreiInteractionState.Enabled) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        inPlace(system = system, long = true, startDetent = TanreiBottomSheetDetent.Full)
        val box = sheet()
        val t = system.bottomSheet
        val error = colors[TanreiColorRole.Error]
        val boxTop = box.top + t.handleMarginBlock
        val boxLeft = box.left + (box.width - t.handleContainerWidth) / 2
        assertPixel("the box's middle edge", stagePixel(boxLeft + 2.dp, boxTop + t.handleContainerHeight / 2), error)
        assertPixel("above the box", stagePixel(boxLeft + t.handleContainerWidth / 2, boxTop - 2.dp), sheetColor)
        val grip = t.drag().enabled.gripColor.resolve(colors)
        val gripTop = boxTop + (t.handleContainerHeight - t.handleGripHeight) / 2
        assertPixel("the grip", stagePixel(box.left + box.width / 2, gripTop + t.handleGripHeight / 2), grip)
        assertPixel("the grip's width", stagePixel(box.left + box.width / 2 - t.handleGripWidth / 2 + 2.dp, gripTop + t.handleGripHeight / 2), grip)
        assertPixel("beyond it, the box", stagePixel(box.left + box.width / 2 - t.handleGripWidth / 2 - 3.dp, gripTop + t.handleGripHeight / 2), error)
        val before = stagePixel(box.left + box.width / 2, gripTop + t.handleGripHeight / 2)
        stageSwipe(600.dp, 400.dp, 2000)
        assertTrue("scrolled", scrollValue() > 100f)
        assertPixel("the row stays", stagePixel(box.left + box.width / 2, gripTop + t.handleGripHeight / 2), before)
    }

    // ── BSH-13 / BSH-14: states and focus ────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `BSH-13 under acme hovered, focused and pressed draw the handle's own tokens, pressed over focused`() {
        val acme = TanreiSystem.Acme
        val acmeColors = acme.colors.light
        val look = acme.bottomSheet.controls.dragHandle
        val acmeSheet = acme.bottomSheet.containerColor.resolve(acmeColors)
        fun over(paint: TanreiPaint) = paint.resolve(acmeColors).compositeOver(acmeSheet)
        assertEquals(4, listOf(look.enabled, look.hovered, look.focused, look.pressed).map { over(it.containerColor) }.toSet().size)
        showSheet(system = acme)
        handleNode().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertPixel("hovered", boxPixel(acme), over(look.hovered.containerColor))
        handleNode().requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertPixel("focused", boxPixel(acme), over(look.focused.containerColor))
        handleNode().performKeyInput { keyDown(Key.Enter) }
        rule.waitForIdle()
        assertPixel("pressed", boxPixel(acme), over(look.pressed.containerColor))
        handleNode().performKeyInput { keyUp(Key.Enter) }
    }

    @Test
    fun `BSH-13 BSH-14 focus gained by touch draws neither the focused state nor the ring, and a drag from the handle does not leave it pressed`() {
        showSheet()
        handleNode().requestFocus()
        rule.waitForIdle()
        assertPixel("at rest", boxPixel(), sheetColor)
        assertPixel("no ring", ringPixel(), sheetColor)
        val row = partialTop + rowHeight() / 2
        stageSwipe(row, row - 30.dp, 2000)
        rule.mainClock.advanceTimeBy(tanrei.motion.duration.pressHold + tokens.motionStateDuration * 2L)
        rule.waitForIdle()
        assertPixel("not left pressed", boxPixel(), sheetColor)
    }

    @Test
    @KeyboardNavigation
    fun `BSH-14 keyboard focus shows the ring around the handle's box on the first frame`() {
        showSheet()
        rule.mainClock.autoAdvance = false
        handleNode().requestFocus()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("the ring above the box", ringPixel(), colors[TanreiColorRole.FocusRing])
        rule.mainClock.autoAdvance = true
    }

    // ── BSH-15: the hit area ─────────────────────────────────────────────────

    @Test
    fun `BSH-15 the handle's hit area is its row across the box, at least the touch target, without changing its drawn size - in cupertino's short row too`() {
        showSheet()
        val hit = handleNode().getUnclippedBoundsInRoot()
        val target = tanrei.measure.targetTouch
        assertTrue("$hit", hit.width >= target && hit.height >= rowHeight() && hit.height >= target)
        assertEquals(sheet().top.value, hit.top.value, 0.5f)
        val cupertino = TanreiSystem.Cupertino
        assertTrue("cupertino's row is short", rowHeight(cupertino) < target)
        showSheet(system = cupertino)
        val short = handleNode().getUnclippedBoundsInRoot()
        assertTrue("$short", short.width >= target && short.height >= target)
        // A press below the short row but inside the hit area still moves the sheet.
        handleNode().performTouchInput { click(Offset(width / 2f, (rowHeight(cupertino) + 8.dp).toPx())) }
        rule.waitForIdle()
        assertEquals(listOf("detent:full"), events)
    }

    // ── BSH-16 / BSH-17 / BSH-18 / BSH-19: the press, corners, motion ────────

    @Test
    fun `BSH-16 a tap that ends at once shows the pressed state on the next frame and keeps it for press-hold`() {
        val system = tanrei.withHandle(TanreiInteractionState.Pressed) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        showSheet(system = system, long = true)
        val error = colors[TanreiColorRole.Error]
        val hold = tanrei.motion.duration.pressHold.toLong()
        rule.mainClock.autoAdvance = false
        handleNode().performTouchInput { down(Offset(width / 2f, (tokens.handleMarginBlock + 4.dp).toPx())); up() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("pressed", boxPixel(), error)
        rule.mainClock.advanceTimeBy(hold / 2)
        assertPixel("still pressed", boxPixel(), error)
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `BSH-17 ripple grows from the point of contact, dim - cupertino's answer - draws no state layer, none draws nothing`() {
        val rippling = tanrei.answering(TanreiPressedFeedback.Ripple).withHandle(TanreiInteractionState.Pressed) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        assertEquals(TanreiPressedFeedback.Ripple, TanreiSystem.M3Like.behavior.pressedFeedback)
        showSheet(system = rippling)
        val error = colors[TanreiColorRole.Error]
        val box = boxBounds()
        rule.mainClock.autoAdvance = false
        val hit = handleNode().getUnclippedBoundsInRoot()
        handleNode().performTouchInput { down(Offset((box.left - hit.left + 3.dp).toPx(), (box.top - hit.top + tokens.handleContainerHeight / 2).toPx())) }
        rule.mainClock.advanceTimeBy(120)
        assertPixel("at the point of contact", stagePixel(box.left + 3.dp, box.top + tokens.handleContainerHeight / 2), error)
        assertPixel("not yet at the far end", stagePixel(box.right - 4.dp, box.top + tokens.handleContainerHeight / 2), sheetColor)
        rule.mainClock.advanceTimeBy(tokens.motionFeedbackDuration.toLong())
        assertPixel("the far end once grown", stagePixel(box.right - 4.dp, box.top + tokens.handleContainerHeight / 2), error)
        handleNode().performTouchInput { up() }
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        // Dim.
        val cupertino = TanreiSystem.Cupertino
        assertEquals(TanreiPressedFeedback.Dim, cupertino.behavior.pressedFeedback)
        assertTrue(cupertino.bottomSheet.pressed.opacity < 1f)
        showSheet(system = cupertino)
        val before = stage()
        handleNode().performTouchInput { down(center) }
        rule.waitForIdle()
        assertTrue("dimmed", differing(before, stage()) > 0)
        handleNode().performTouchInput { up() }
        rule.waitForIdle()
        // None.
        showSheet(system = tanrei.answering(TanreiPressedFeedback.None))
        handleNode().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val hovered = stage()
        handleNode().performMouseInput { press() }
        rule.waitForIdle()
        assertEquals("pressed under none", 0, differing(hovered, stage()))
        handleNode().performMouseInput { release() }
    }

    @Test
    fun `BSH-18 the sheet's top corners and the handle's box corners ease by corner smoothing - a quarter circle at 0`() {
        val error = colors[TanreiColorRole.Error]
        val primary = colors[TanreiColorRole.Primary]
        for (smoothing in listOf(0f, 0.6f)) {
            val system = tanrei.copy(shape = tanrei.shape.copy(cornerSmoothing = smoothing), bottomSheet = tokens.copy(containerShape = 24.dp, containerColor = TanreiPaint.Role(TanreiColorRole.Error)))
                .withHandle(TanreiInteractionState.Enabled) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Primary)) }
            inPlace(system = system, variant = TanreiBottomSheetVariant.Standard)
            val box = sheet()
            assertTrue("the very corner is outside", !isClose(stagePixel(box.left + 0.5.dp, box.top + 0.5.dp), error, 0.1f))
            assertPixel("inside the corner", stagePixel(box.left + 24.dp, box.top + 24.dp), error)
            val handle = boxBounds()
            assertPixel("the box's very corner", stagePixel(handle.left + 0.5.dp, handle.top + 0.5.dp), error)
            assertPixel("the box's middle", stagePixel(handle.left + handle.width / 2, handle.top + 2.dp), primary)
        }
    }

    @Test
    @KeyboardNavigation
    fun `BSH-18 glow draws the handle's focus as a halo under acme`() {
        val acme = TanreiSystem.Acme
        assertEquals(TanreiFocusStyle.Glow, acme.behavior.focusStyle)
        showSheet(system = acme)
        val before = stage()
        handleNode().requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertTrue("the halo is drawn", differing(before, stage()) > 0)
    }

    @Test
    fun `BSH-19 the handle's colors move over the state duration`() {
        val system = tanrei.copy(bottomSheet = tokens.copy(motionStateDuration = 400, motionStateEasing = tanrei.motion.easing.linear))
            .withHandle(TanreiInteractionState.Hovered) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        showSheet(system = system)
        rule.mainClock.autoAdvance = false
        handleNode().performMouseInput { moveTo(center) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(200)
        val middle = boxPixel()
        val error = colors[TanreiColorRole.Error]
        assertTrue("between: $middle", !isClose(middle, error) && !isClose(middle, sheetColor))
        rule.mainClock.advanceTimeBy(400)
        assertPixel("hovered", boxPixel(), error)
        rule.mainClock.autoAdvance = true
    }

    // ── BSH-20: a drag that asks to close ────────────────────────────────────

    @Test
    fun `BSH-20 closed from a drag it slides out from where it was left, and declined it settles back at its lowest height`() {
        val slow = 400
        val system = tanrei.copy(bottomSheet = tokens.copy(motionExitDuration = slow, motionExitEasing = tanrei.motion.easing.linear))
        showSheet(system = system)
        val row = partialTop + rowHeight() / 2
        rule.mainClock.autoAdvance = false
        stage { down(at(row)); moveBy(Offset(0f, 150.dp.toPx())); moveBy(Offset(0f, 150.dp.toPx())) }
        rule.mainClock.advanceTimeByFrame()
        val left = sheet().top
        assertTrue("dragged down: $left", left > partialTop + 250.dp)
        stage { up() }
        var frames = 0
        while (events.isEmpty() && frames < 20) {
            rule.mainClock.advanceTimeByFrame()
            frames++
        }
        assertEquals(listOf("close:drag"), events)
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        val start = sheet().top
        assertTrue("leaves from where it was, not from its lowest height: $left, then $start", start >= left - 1.dp && start < left + 100.dp)
        rule.mainClock.advanceTimeBy(slow.toLong() * 2)
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        assertEquals(0, rule.onAllNodes(hasText(LONG)).fetchSemanticsNodes().size)
        // Declined.
        events.clear()
        closeOnRequest = false
        showSheet()
        stageSwipe(row, row + 300.dp, 3000)
        assertEquals(listOf("close:drag"), events)
        assertEquals("settled back", partialTop.value, sheet().top.value, 0.5f)
    }

    // ── BSH-21: the product's detent ─────────────────────────────────────────

    @Test
    fun `BSH-21 the product's detent moves the sheet over the enter motion without detentChange, and the person's height stays until it changes`() {
        val slow = 400
        val system = tanrei.copy(bottomSheet = tokens.copy(motionEnterDuration = slow, motionEnterEasing = tanrei.motion.easing.linear))
        showSheet(system = system)
        rule.mainClock.autoAdvance = false
        detent = TanreiBottomSheetDetent.Full
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(slow / 2L)
        val half = sheet().top
        assertTrue("moving: $half", half < partialTop - 20.dp && half > fullTop + 20.dp)
        rule.mainClock.advanceTimeBy(slow.toLong())
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        assertEquals(fullTop.value, sheet().top.value, 0.5f)
        assertEquals(emptyList<String>(), events)
        // The person's choice stays through a recomposition that passes the product's unchanged value.
        var tick by mutableStateOf(0)
        show {
            TanreiText("$tick")
            TanreiBottomSheet(visible = true, onClose = {}, modifier = Modifier.testTag(SHEET), detent = TanreiBottomSheetDetent.Full, onDetentChange = { events += "detent:${it.name.lowercase()}" }, variant = TanreiBottomSheetVariant.Standard, handleLabel = HANDLE, contentDescription = LABEL) { Content(long = true) }
        }
        handleNode().performClick()
        rule.waitForIdle()
        assertEquals(partialTop.value, sheet().top.value, 0.5f)
        assertEquals(listOf("detent:partial"), events)
        tick++
        rule.waitForIdle()
        assertEquals("kept", partialTop.value, sheet().top.value, 0.5f)
    }

    // ── BSH-22: semantics ────────────────────────────────────────────────────

    @Test
    fun `BSH-22 a modal sheet is a dialog named by its label, a standard one a region named by it, the grip is hidden, and an empty label is reported`() = collectingReports { reports ->
        showSheet(variant = TanreiBottomSheetVariant.Modal, long = true)
        assertEquals(1, dialogs())
        rule.onNode(SemanticsMatcher.expectValue(SemanticsProperties.PaneTitle, LABEL)).assertExists()
        assertEquals("the handle is the only element of the row", 1, rule.onAllNodes(hasContentDescription(HANDLE)).fetchSemanticsNodes().size)
        showSheet(long = true)
        assertEquals(0, dialogs())
        rule.onNodeWithTag(SHEET).assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf(LABEL)))
        rule.onNodeWithTag(SHEET).assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.PaneTitle))
        setDebuggable(true)
        showSheet(label = "")
        assertTrue(reports.toString(), reports.any { "TanreiBottomSheet" in it && "contentDescription" in it })
        assertEquals("still renders", partialTop.value, sheet().top.value, 0.5f)
    }

    // ── BSH-23: stacking ─────────────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `BSH-23 a dialog opened from a modal sheet stacks above it, takes Escape alone, and gives focus back inside the sheet`() {
        var inner by mutableStateOf(false)
        showSheet(variant = TanreiBottomSheetVariant.Modal, long = false, content = {
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

    // ── BSH-24: enlarged text ────────────────────────────────────────────────

    @Test
    fun `BSH-24 enlarged text grows the sheet up to its height and scrolls beyond it, and does not scale the handle`() {
        inPlace(long = false)
        val normal = sheet().height
        inPlace(long = false, fontScale = 2f)
        assertTrue("grown: ${sheet().height} over $normal", sheet().height > normal)
        inPlace(long = true, fontScale = 2f)
        assertEquals("no taller than partial", partialTop.value, sheet().top.value, 0.5f)
        val grip = tokens.controls.dragHandle.enabled.gripColor.resolve(colors)
        val box = sheet()
        val gripY = box.top + tokens.handleMarginBlock + tokens.handleContainerHeight / 2
        assertPixel("the grip's edge", stagePixel(box.left + box.width / 2 + tokens.handleGripWidth / 2 - 2.dp, gripY), grip)
        assertPixel("not scaled", stagePixel(box.left + box.width / 2 + tokens.handleGripWidth / 2 + 3.dp, gripY), sheetColor)
    }

    // ── BSH-25: unknown values ───────────────────────────────────────────────

    @Test
    fun `BSH-25 variant and detent are closed enums holding exactly the spec's values, so no undefined value can be passed`() {
        val spec = JSONObject(File(BOTTOM_SHEET_SPEC).readText())
        val props = (0 until spec.getJSONArray("props").length()).map { spec.getJSONArray("props").getJSONObject(it) }
        fun values(name: String) = props.single { it.getString("name") == name }.getJSONArray("values").let { a -> (0 until a.length()).map(a::getString) }
        assertEquals(values("variant"), TanreiBottomSheetVariant.entries.map { it.name.lowercase() })
        assertEquals(values("detent"), TanreiBottomSheetDetent.entries.map { it.name.lowercase() })
    }

    // ── BSH-26: right to left ────────────────────────────────────────────────

    @Test
    fun `BSH-26 right-to-left keeps the sheet and the handle centred and lays the content out from the right`() {
        val system = tanrei.copy(bottomSheet = tokens.copy(containerMaxWidth = 300.dp))
        inPlace(system = system, variant = TanreiBottomSheetVariant.Standard, direction = LayoutDirection.Rtl)
        val box = sheet()
        assertEquals(50f, box.left.value, 0.5f)
        val grip = tokens.controls.dragHandle.enabled.gripColor.resolve(colors)
        assertPixel("the grip centred", stagePixel(box.left + box.width / 2, box.top + tokens.handleMarginBlock + tokens.handleContainerHeight / 2), grip)
        val first = rule.onNodeWithTag(FIRST).getUnclippedBoundsInRoot()
        assertEquals("from the right", (box.right - tokens.containerPadding).value, first.right.value, 0.6f)
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    /** Touch input on the stage — a node that does not move with the sheet, so that the finger's positions stay put. */
    private fun stage(block: androidx.compose.ui.test.TouchInjectionScope.() -> Unit) = rule.onNodeWithTag(STAGE_TAG).performTouchInput(block)

    /** A point of the stage at [y], across its middle. */
    private fun androidx.compose.ui.test.TouchInjectionScope.at(y: Dp): Offset = Offset((STAGE_WIDTH / 2).toPx(), y.toPx())

    /**
     * [steps] moves of the finger on the stage, each [by] up (negative: down), each heard and laid out before the next —
     * as a finger's moves arrive between frames. (With the clock stopped, Robolectric leaves some of them queued.)
     */
    private fun stageMoves(steps: Int, by: Dp) {
        repeat(steps) {
            stage { moveBy(Offset(0f, -by.toPx()), delayMillis = 16) }
            rule.waitForIdle()
        }
    }

    /** A slow drag on the stage, from [from] to [to], released. */
    private fun stageSwipe(from: Dp, to: Dp, durationMillis: Long) {
        stage { swipe(at(from), at(to), durationMillis = durationMillis) }
        rule.waitForIdle()
    }

    /** A fling on the stage, from [from] to [to]. */
    private fun stageFling(from: Dp, to: Dp) {
        stage { swipeWithVelocity(at(from), at(to), endVelocity = 3000f, durationMillis = 100) }
        rule.waitForIdle()
    }

    private fun touchSlop(): Dp = with(rule.density) { android.view.ViewConfiguration.get(ApplicationProvider.getApplicationContext()).scaledTouchSlop.toDp() }

    /** How far the sheet's content is scrolled, in pixels. */
    private fun scrollValue(): Float = rule.onNode(SemanticsMatcher.keyIsDefined(SemanticsProperties.VerticalScrollAxisRange)).fetchSemanticsNode().config[SemanticsProperties.VerticalScrollAxisRange].value()

    private fun TanreiSystem.answering(feedback: TanreiPressedFeedback) = copy(behavior = behavior.copy(pressedFeedback = feedback))

    private fun io.github.chnotchy.tanrei.tokens.TanreiBottomSheetTokens.drag() = controls.dragHandle

    /** This system with the drag handle's [state] tokens changed. */
    private fun TanreiSystem.withHandle(state: TanreiInteractionState, change: (TanreiBottomSheetControlStateTokens) -> TanreiBottomSheetControlStateTokens): TanreiSystem {
        val handle = bottomSheet.controls.dragHandle
        val changed = when (state) {
            TanreiInteractionState.Enabled -> handle.copy(enabled = change(handle.enabled))
            TanreiInteractionState.Hovered -> handle.copy(hovered = change(handle.hovered))
            TanreiInteractionState.Focused -> handle.copy(focused = change(handle.focused))
            TanreiInteractionState.Pressed -> handle.copy(pressed = change(handle.pressed))
            TanreiInteractionState.Disabled -> handle
        }
        return copy(bottomSheet = bottomSheet.copy(controls = bottomSheet.controls.copy(dragHandle = changed)))
    }

    /** The drag handle's box, from the sheet's bounds (centred, the margin below the sheet's top). */
    private fun boxBounds(system: TanreiSystem = scene?.system ?: tanrei): DpRect {
        val box = sheet()
        val t = system.bottomSheet
        val left = box.left + (box.width - t.handleContainerWidth) / 2
        val top = box.top + t.handleMarginBlock
        return DpRect(left, top, left + t.handleContainerWidth, top + t.handleContainerHeight)
    }

    /** A pixel in the handle's box clear of the grip: 4 in from its start, at its middle. */
    private fun boxPixel(system: TanreiSystem = scene?.system ?: tanrei): Color {
        val box = boxBounds(system)
        return stagePixel(box.left + 4.dp, box.top + box.height / 2)
    }

    /** Where the ring is drawn: centred above the box, past the focus offset and the inner stroke. */
    private fun ringPixel(): Color {
        val box = boxBounds()
        val ring = tanrei.measure.focusOffset + tanrei.measure.focusInnerWidth + tanrei.measure.focusOuterWidth / 2
        return stagePixel(box.left + box.width / 2, box.top - ring)
    }

    /** The middle of the grip. */
    private fun gripPixel(): Color {
        val box = boxBounds()
        return stagePixel(box.left + box.width / 2, box.top + box.height / 2)
    }

    /** Sends a key down and up to the modal sheet's window, as the platform does when no view used it. */
    private fun windowKey(code: Int) {
        val root = sheetView!!.rootView
        rule.runOnUiThread {
            root.dispatchKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, code))
            root.dispatchKeyEvent(KeyEvent(KeyEvent.ACTION_UP, code))
        }
        rule.waitForIdle()
    }

    /** The same to the page's own window. */
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

    private fun stage(): PixelMap = rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap()

    private fun dialogImage(): PixelMap = rule.onNode(isDialog()).captureToImage().toPixelMap()

    /** A pixel at ([x], [y]) of the stage (at the root's origin). */
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
        const val OPENER = "opener"
        const val AFTER = "after"
        const val FIRST = "first"
        const val LAST = "last"
        const val TEXT = "text"
        const val HANDLE = "Resize sheet"
        const val LABEL = "Nearby places"
        const val SHORT = "Three cafés and a bakery are open within a ten-minute walk."
        val LONG = List(40) { "Please read these terms before you continue. They describe what the service does and how your data is stored." }.joinToString(" ")
        const val PIXEL_TOLERANCE = 3f / 255f
        val STAGE_WIDTH = 400.dp
        val STAGE_HEIGHT = 720.dp
    }
}

/** BSH-1 and BSH-19 where motion is reduced (the animator duration scale is 0): at once. */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w400dp-h800dp-xhdpi")
class TanreiBottomSheetReducedMotionTest {
    private object NoMotion : MotionDurationScale {
        override val scaleFactor: Float = 0f
    }

    @get:Rule
    val rule = createComposeRule(effectContext = NoMotion)

    @Test
    fun `BSH-1 BSH-19 BSH-21 where motion is reduced the sheet appears, moves and goes at once`() {
        val tanrei = TanreiSystem.Tanrei
        val handle = tanrei.bottomSheet.controls.dragHandle
        val hoveredError = handle.copy(hovered = handle.hovered.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)))
        val slow = tanrei.bottomSheet.copy(motionEnterDuration = 1000, motionExitDuration = 1000, motionStateDuration = 1000, controls = tanrei.bottomSheet.controls.copy(dragHandle = hoveredError))
        var open by mutableStateOf(false)
        var detent by mutableStateOf(TanreiBottomSheetDetent.Partial)
        rule.setContent {
            TanreiTheme(system = tanrei.copy(bottomSheet = slow), theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Box(Modifier.size(400.dp, 720.dp)) {
                    TanreiBottomSheet(visible = open, onClose = {}, modifier = Modifier.testTag("sheet"), variant = TanreiBottomSheetVariant.Standard, detent = detent, handleLabel = "Resize", contentDescription = "Sheet") {
                        TanreiText(List(200) { "A line of text that wraps." }.joinToString(" "))
                    }
                }
            }
        }
        rule.waitForIdle()
        rule.mainClock.autoAdvance = false
        open = true
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        repeat(3) { rule.mainClock.advanceTimeByFrame() }
        assertEquals("in place at once", 360f, rule.onNodeWithTag("sheet").getUnclippedBoundsInRoot().top.value, 0.5f)
        detent = TanreiBottomSheetDetent.Full
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        repeat(3) { rule.mainClock.advanceTimeByFrame() }
        assertEquals("at full at once", 48f, rule.onNodeWithTag("sheet").getUnclippedBoundsInRoot().top.value, 0.5f)
        // BSH-19: the handle's colors change at once.
        rule.onNodeWithContentDescription("Resize").performMouseInput { moveTo(center) }
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        repeat(2) { rule.mainClock.advanceTimeByFrame() }
        val box = rule.onNodeWithTag("sheet").getUnclippedBoundsInRoot()
        val image = rule.onRoot().captureToImage().toPixelMap()
        val pixel = with(rule.density) { image[(box.left + (box.right - box.left) / 2 - 20.dp).roundToPx(), (box.top + 24.dp).roundToPx()] }
        val error = tanrei.colors.light[TanreiColorRole.Error]
        assertTrue("hovered at once: $pixel", abs(pixel.red - error.red) < 0.02f && abs(pixel.green - error.green) < 0.02f)
        open = false
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        repeat(3) { rule.mainClock.advanceTimeByFrame() }
        rule.mainClock.autoAdvance = true
        assertEquals("gone at once", 0, rule.onAllNodes(androidx.compose.ui.test.hasTestTag("sheet")).fetchSemanticsNodes().size)
    }
}
