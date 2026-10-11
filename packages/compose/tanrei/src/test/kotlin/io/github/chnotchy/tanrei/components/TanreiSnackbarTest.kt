package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import android.view.accessibility.AccessibilityManager
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasText
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
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiPressedFeedback
import io.github.chnotchy.tanrei.tokens.TanreiSnackbarControlStateTokens
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import kotlin.math.abs
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TestRule
import org.junit.runner.RunWith
import org.junit.runners.model.Statement
import org.robolectric.Shadows
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Behaviour tests for `specs/snackbar.spec.json`. Each test names the behaviour id (`SNK-n`) it covers. Runs on the JVM
 * (Robolectric, native graphics). The host's behaviour — queue, timeout, pauses, placement, announcement, motion — is
 * tested on `TanreiSnackbarHost` filling the window under a focusable box; what the bar draws and does also on the
 * in-place `TanreiSnackbar` (SNK-19), which the baselines draw.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w480dp-h640dp-xhdpi")
class TanreiSnackbarTest {
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
    private val tokens = tanrei.snackbar
    private val bar = tokens.containerColor.resolve(colors)
    private val results = mutableListOf<String>()
    private var host = TanreiSnackbarHostState()
    private var scope: CoroutineScope? = null

    private class Scene(val system: TanreiSystem, val direction: LayoutDirection, val content: @Composable () -> Unit)

    private var scene by mutableStateOf<Scene?>(null)

    private fun show(system: TanreiSystem = tanrei, direction: LayoutDirection = LayoutDirection.Ltr, content: @Composable () -> Unit) {
        val first = scene == null
        scene = Scene(system, direction, content)
        if (!first) {
            rule.waitForIdle()
            return
        }
        rule.setContent {
            val current = scene ?: return@setContent
            scope = rememberCoroutineScope()
            key(current) {
                CompositionLocalProvider(LocalLayoutDirection provides current.direction) {
                    TanreiTheme(system = current.system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                        Box(Modifier.testTag(STAGE_TAG).fillMaxSize().background(TanreiColorRole.Surface.color)) { current.content() }
                    }
                }
            }
        }
        rule.waitForIdle()
    }

    /** A focusable box at the top, and the host over the whole window (last in the focus order). */
    private fun showHost(system: TanreiSystem = tanrei, direction: LayoutDirection = LayoutDirection.Ltr, width: Dp? = null) = show(system, direction) {
        Box(Modifier.fillMaxSize()) {
            Column { Box(Modifier.testTag(BEFORE).size(8.dp).focusable()) }
            TanreiSnackbarHost(host, Modifier.testTag(HOST).then(if (width != null) Modifier.width(width) else Modifier.fillMaxSize()).then(if (width != null) Modifier else Modifier))
        }
    }

    /** Requests a snackbar; its result is recorded as `action` or `dismiss:<reason>` once it has closed. */
    private fun request(message: String = MESSAGE, action: String = "", closable: Boolean = false, duration: TanreiSnackbarDuration = TanreiSnackbarDuration.Auto, tag: String = message): Job {
        var job: Job? = null
        rule.runOnIdle {
            job = scope!!.launch {
                val result = host.showSnackbar(message, actionLabel = action, withDismissAction = closable, closeLabel = if (closable) "Close" else "", duration = duration)
                results += "$tag:" + when (result) {
                    TanreiSnackbarResult.ActionPerformed -> "action"
                    is TanreiSnackbarResult.Dismissed -> "dismiss:${result.reason}"
                }
            }
        }
        rule.waitForIdle()
        return job!!
    }

    private fun showing(): String? = host.currentMessage

    private fun inPlace(message: String = MESSAGE, action: String = "", closable: Boolean = false, system: TanreiSystem = tanrei, direction: LayoutDirection = LayoutDirection.Ltr, duration: TanreiSnackbarDuration = TanreiSnackbarDuration.Auto, width: Dp = 400.dp) =
        show(system, direction) {
            Column {
                Box(Modifier.testTag(BEFORE).size(8.dp).focusable())
                Box(Modifier.width(width)) {
                    TanreiSnackbar(
                        message = message, modifier = Modifier.testTag(BAR), actionLabel = action, withDismissAction = closable,
                        closeLabel = if (closable) "Close" else "", duration = duration,
                        onResult = { results += when (it) { TanreiSnackbarResult.ActionPerformed -> "action"; is TanreiSnackbarResult.Dismissed -> "dismiss:${it.reason}" } },
                    )
                }
            }
        }

    private fun action() = rule.onNode(hasText(ACTION) and SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))

    private fun close() = rule.onNode(hasContentDescription("Close"))

    private fun advance(millis: Long) {
        rule.mainClock.advanceTimeBy(millis)
        rule.waitForIdle()
    }

    // ── SNK-1: action and close ──────────────────────────────────────────────

    @Test
    fun `SNK-1 activating the action emits action once and closes it, the close button emits dismiss close once`() {
        showHost()
        request(action = ACTION)
        action().performClick()
        rule.waitForIdle()
        assertEquals(listOf("$MESSAGE:action"), results)
        assertEquals(null, showing())
        request(closable = true)
        close().performClick()
        rule.waitForIdle()
        assertEquals(listOf("$MESSAGE:action", "$MESSAGE:dismiss:Close"), results)
        inPlace(action = ACTION, closable = true)
        action().performClick()
        close().performClick()
        rule.waitForIdle()
        assertEquals(listOf("$MESSAGE:action", "$MESSAGE:dismiss:Close", "action", "dismiss:Close"), results)
    }

    @Test
    @KeyboardNavigation
    fun `SNK-1 Enter and Space activate the focused control`() {
        inPlace(action = ACTION, closable = true)
        action().requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        close().requestFocus().performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        assertEquals(listOf("action", "dismiss:Close"), results)
    }

    // ── SNK-2 / SNK-3: states and focus ──────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `SNK-2 under acme hovered, focused and pressed draw the control's own tokens, pressed over focused`() {
        val acme = TanreiSystem.Acme
        val acmeColors = acme.colors.light
        val look = acme.snackbar.controls.action
        val acmeBar = acme.snackbar.containerColor.resolve(acmeColors)
        fun over(paint: TanreiPaint) = paint.resolve(acmeColors).compositeOver(acmeBar)
        assertEquals(4, listOf(look.enabled, look.hovered, look.focused, look.pressed).map { over(it.containerColor) }.toSet().size)
        inPlace(system = acme, action = ACTION)
        action().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertPixel("hovered", controlPixel(action(), 3.dp), over(look.hovered.containerColor))
        action().requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertPixel("focused", controlPixel(action(), 5.dp), over(look.focused.containerColor))
        action().performKeyInput { keyDown(Key.Enter) }
        rule.waitForIdle()
        assertPixel("pressed", controlPixel(action(), 5.dp), over(look.pressed.containerColor))
        action().performKeyInput { keyUp(Key.Enter) }
    }

    @Test
    @KeyboardNavigation
    fun `SNK-3 keyboard focus shows the ring around the control on the first frame`() {
        inPlace(action = ACTION)
        rule.mainClock.autoAdvance = false
        action().requestFocus()
        rule.mainClock.advanceTimeByFrame()
        val visual = visualOf(action())
        val ring = tanrei.measure.focusOffset + tanrei.measure.focusInnerWidth + tanrei.measure.focusOuterWidth / 2
        assertPixel("the ring outside the control's top edge", stagePixel((visual.left + visual.right) / 2, visual.top - ring), colors[TanreiColorRole.FocusRing])
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `SNK-2 SNK-3 focus gained by touch shows neither the focused state nor the ring`() {
        inPlace(action = ACTION)
        action().requestFocus()
        rule.waitForIdle()
        assertPixel("at rest", controlPixel(action(), 5.dp), tokens.controls.action.enabled.containerColor.resolve(colors).compositeOver(bar))
    }

    // ── SNK-4: the target ────────────────────────────────────────────────────

    @Test
    fun `SNK-4 the controls' hit areas reach the touch target on both axes without changing their visual size`() {
        inPlace(action = "OK", closable = true, system = tanrei.withControl(TanreiInteractionFree) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) })
        val target = tanrei.measure.targetTouch
        for (node in listOf(rule.onNode(hasText("OK")), close())) {
            val bounds = node.getUnclippedBoundsInRoot()
            assertTrue("hit area $bounds", bounds.right - bounds.left >= target && bounds.bottom - bounds.top >= target)
        }
        val closeBounds = close().getUnclippedBoundsInRoot()
        val middle = (closeBounds.top + closeBounds.bottom) / 2
        val visualTop = middle - tokens.controlsHeight / 2
        assertPixel("the visual box", stagePixel((closeBounds.left + closeBounds.right) / 2, visualTop + 2.dp), colors[TanreiColorRole.Error])
        assertPixel("the target is not drawn", stagePixel((closeBounds.left + closeBounds.right) / 2, visualTop - 2.dp), bar)
    }

    // ── SNK-5 / SNK-6 / SNK-7: the press, corners, focus style ───────────────

    @Test
    fun `SNK-5 a tap that ends at once shows the pressed state on the next frame and keeps it for press-hold`() {
        inPlace(action = ACTION)
        val pressed = tokens.controls.action.pressed.containerColor.resolve(colors).compositeOver(bar)
        val hold = tanrei.motion.duration.pressHold.toLong()
        rule.mainClock.autoAdvance = false
        action().performTouchInput { down(center); up() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("pressed", controlPixel(action(), 5.dp), pressed)
        rule.mainClock.advanceTimeBy(hold / 2)
        assertPixel("still pressed", controlPixel(action(), 5.dp), pressed)
        rule.mainClock.advanceTimeBy(hold + tokens.motionStateDuration * 2L)
        assertPixel("at rest", controlPixel(action(), 5.dp), bar)
        rule.mainClock.autoAdvance = true
    }

    private fun TanreiSystem.answering(feedback: TanreiPressedFeedback) = copy(behavior = behavior.copy(pressedFeedback = feedback))

    @Test
    fun `SNK-6 ripple grows the control's pressed color from the point of contact, dim dims it without a layer, none draws nothing`() {
        showRipple()
        val cupertino = TanreiSystem.Cupertino
        assertEquals(TanreiPressedFeedback.Dim, cupertino.behavior.pressedFeedback)
        assertTrue(cupertino.snackbar.pressed.opacity < 1f)
        inPlace(system = cupertino, action = ACTION)
        val cupertinoBar = cupertino.snackbar.containerColor.resolve(cupertino.colors.light)
        val before = action().captureToImage().toPixelMap()
        action().performTouchInput { down(center) }
        rule.waitForIdle()
        assertPixel("no state layer", controlPixel(action(), 3.dp), cupertinoBar)
        assertTrue("dimmed", differing(before, action().captureToImage().toPixelMap()) > 0)
        action().performTouchInput { up() }
        inPlace(system = tanrei.answering(TanreiPressedFeedback.None), action = ACTION)
        action().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val hovered = stage()
        action().performMouseInput { press() }
        rule.waitForIdle()
        assertEquals("pressed under none", 0, differing(hovered, stage()))
        action().performMouseInput { release() }
    }

    private fun showRipple() {
        assertEquals(TanreiPressedFeedback.Ripple, TanreiSystem.M3Like.behavior.pressedFeedback)
        inPlace(system = tanrei.answering(TanreiPressedFeedback.Ripple), action = ACTION)
        val pressed = tokens.controls.action.pressed.containerColor.resolve(colors).compositeOver(bar)
        val visual = visualOf(action())
        rule.mainClock.autoAdvance = false
        val bounds = action().getUnclippedBoundsInRoot()
        action().performTouchInput { down(Offset((visual.left - bounds.left + 3.dp).toPx(), height / 2f)) }
        rule.mainClock.advanceTimeBy(40)
        assertPixel("at the point of contact", stagePixel(visual.left + 3.dp, (visual.top + visual.bottom) / 2), pressed)
        assertPixel("not yet at the far end", stagePixel(visual.right - 3.dp, visual.top + 3.dp), bar)
        rule.mainClock.advanceTimeBy(tokens.motionFeedbackDuration.toLong())
        assertPixel("the far end once grown", stagePixel(visual.right - 3.dp, visual.top + 3.dp), pressed)
        action().performTouchInput { up() }
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `SNK-7 the bar's and the controls' corners ease by corner smoothing - a quarter circle at 0`() {
        val system = tanrei.withControl(TanreiInteractionFree) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        for (smoothing in listOf(0f, 0.6f)) {
            inPlace(action = ACTION, system = system.copy(snackbar = system.snackbar.copy(containerShape = 16.dp, controlsShape = 12.dp), shape = tanrei.shape.copy(cornerSmoothing = smoothing)))
            val box = rule.onNodeWithTag(BAR).getUnclippedBoundsInRoot()
            assertPixel("the bar's very corner is outside", stagePixel(box.left + 0.5.dp, box.top + 0.5.dp), colors[TanreiColorRole.Surface])
            assertPixel("inside the bar", stagePixel(box.left + 16.dp, box.top + 16.dp), bar)
            val visual = visualOf(action())
            assertPixel("the control's very corner", stagePixel(visual.left + 0.5.dp, visual.top + 0.5.dp), bar)
            assertPixel("inside the control", stagePixel(visual.left + 12.dp, visual.top + 12.dp), colors[TanreiColorRole.Error])
        }
    }

    @Test
    @KeyboardNavigation
    fun `SNK-7 glow draws the focus colors as a halo under acme`() {
        val acme = TanreiSystem.Acme
        assertEquals(TanreiFocusStyle.Glow, acme.behavior.focusStyle)
        inPlace(system = acme, action = ACTION)
        val before = stage()
        action().requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertTrue("the halo is drawn", differing(before, stage()) > 0)
    }

    // ── SNK-8: the timeout ───────────────────────────────────────────────────

    @Test
    fun `SNK-8 auto is short without an action and never times out with one - short, long and indefinite as named`() {
        showHost()
        request(tag = "plain")
        advance(tokens.timeoutShort - 500L)
        assertEquals(MESSAGE, showing())
        advance(1000L + tokens.motionExitDuration)
        assertEquals(listOf("plain:dismiss:Timeout"), results)
        request(action = ACTION, tag = "auto-action")
        advance(60_000)
        assertEquals("an action never times out by default", MESSAGE, showing())
        host.dismissCurrent()
        advance(tokens.motionExitDuration * 2L)
        request(action = ACTION, duration = TanreiSnackbarDuration.Long, tag = "long")
        advance(tokens.timeoutShort + 500L)
        assertEquals(MESSAGE, showing())
        advance(tokens.timeoutLong - tokens.timeoutShort.toLong() + tokens.motionExitDuration)
        request(duration = TanreiSnackbarDuration.Indefinite, tag = "indefinite")
        advance(60_000)
        assertEquals(MESSAGE, showing())
        assertEquals(listOf("plain:dismiss:Timeout", "auto-action:dismiss:Host", "long:dismiss:Timeout"), results)
    }

    @Test
    fun `SNK-8 while a screen reader runs a snackbar with an action never closes by itself`() {
        val manager = ApplicationProvider.getApplicationContext<Context>().getSystemService(AccessibilityManager::class.java)
        Shadows.shadowOf(manager).setEnabled(true)
        Shadows.shadowOf(manager).setTouchExplorationEnabled(true)
        try {
            showHost()
            request(action = ACTION, duration = TanreiSnackbarDuration.Short)
            advance(tokens.timeoutShort * 3L)
            assertEquals(MESSAGE, showing())
        } finally {
            Shadows.shadowOf(manager).setTouchExplorationEnabled(false)
            Shadows.shadowOf(manager).setEnabled(false)
        }
    }

    // ── SNK-9: pauses ────────────────────────────────────────────────────────

    @Test
    fun `SNK-9 hovering pauses the timeout, which starts again from its whole length`() {
        showHost()
        request()
        advance(tokens.timeoutShort - 1000L)
        rule.onNode(hasText(MESSAGE)).performMouseInput { moveTo(center) }
        advance(tokens.timeoutShort * 2L)
        assertEquals("paused while hovered", MESSAGE, showing())
        rule.onNode(hasText(MESSAGE)).performMouseInput { moveTo(Offset(-400f, -400f)) }
        advance(tokens.timeoutShort - 500L)
        assertEquals("the whole length again", MESSAGE, showing())
        advance(1000L)
        assertEquals(null, showing())
    }

    @Test
    fun `SNK-9 SNK-12 a Tanrei modal dialog pauses the showing snackbar and holds back the next`() {
        showHost()
        request(tag = "first")
        rule.runOnIdle { TanreiModalDialogs.opened() }
        rule.waitForIdle()
        try {
            advance(tokens.timeoutShort * 3L)
            assertEquals("paused under the dialog", MESSAGE, showing())
            host.dismissCurrent()
            advance(tokens.motionExitDuration * 2L)
            request(message = "Second", tag = "second")
            advance(1000)
            assertEquals("held back while the dialog is open", null, showing())
        } finally {
            rule.runOnIdle { TanreiModalDialogs.closed() }
        }
        advance(100)
        assertEquals("Second", showing())
    }

    @Test
    @KeyboardNavigation
    fun `SNK-9 focus inside pauses the timeout`() {
        showHost()
        request(closable = true)
        close().requestFocus().assertIsFocused()
        advance(tokens.timeoutShort * 3L)
        assertEquals(MESSAGE, showing())
    }

    // ── SNK-10: the announcement ─────────────────────────────────────────────

    @Test
    fun `SNK-10 the shown snackbar is a polite live region holding its message and then its action, and focus stays where it was`() {
        showHost()
        rule.onNodeWithTag(BEFORE).requestFocus()
        request(action = ACTION)
        val region = rule.onNode(SemanticsMatcher.expectValue(SemanticsProperties.LiveRegion, LiveRegionMode.Polite))
        region.assertExists()
        val texts = region.fetchSemanticsNode().children.flatMap { child -> child.config.getOrElse(SemanticsProperties.Text) { emptyList() }.map { it.text } }
        assertEquals(listOf(MESSAGE, ACTION), texts)
        rule.onNodeWithTag(BEFORE).assertIsFocused()
    }

    // ── SNK-11: keyboard ─────────────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `SNK-11 Tab reaches the action and the close button at the host's place, Escape inside dismisses it, and focus goes back`() {
        showHost()
        request(action = ACTION, closable = true)
        rule.onNodeWithTag(BEFORE).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        action().assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        close().assertIsFocused().performKeyInput { pressKey(Key.Escape) }
        rule.waitForIdle()
        assertEquals(listOf("$MESSAGE:dismiss:Escape"), results)
        rule.onNodeWithTag(BEFORE).assertIsFocused()
    }

    // ── SNK-12: the queue ────────────────────────────────────────────────────

    @Test
    fun `SNK-12 one at a time in the order requested, each resolving once closed - clear drops the waiting ones and a cancelled request closes`() {
        showHost()
        request(message = "First", closable = true, tag = "first")
        request(message = "Second", tag = "second")
        request(message = "Third", tag = "third")
        assertEquals("First", showing())
        close().performClick()
        rule.mainClock.advanceTimeBy(tokens.motionExitDuration / 2L)
        assertEquals("the next waits for the exit", null, showing())
        advance(tokens.motionExitDuration.toLong())
        assertEquals("Second", showing())
        host.clear()
        advance(tokens.motionExitDuration * 2L)
        assertEquals(listOf("first:dismiss:Close", "third:dismiss:Host", "second:dismiss:Host"), results.sortedBy { if (it.startsWith("first")) 0 else if (it.startsWith("third")) 1 else 2 })
        assertEquals(null, showing())
        val job = request(message = "Fourth", tag = "fourth")
        assertEquals("Fourth", showing())
        rule.runOnIdle { job.cancel() }
        advance(tokens.motionExitDuration * 2L)
        assertEquals(null, showing())
    }

    @Test
    fun `SNK-12 closing the showing snackbar closes only that one, and the next waiting one then shows`() {
        showHost()
        request(message = "First", tag = "first", duration = TanreiSnackbarDuration.Indefinite)
        request(message = "Second", tag = "second", duration = TanreiSnackbarDuration.Indefinite)
        request(message = "Third", tag = "third", duration = TanreiSnackbarDuration.Indefinite)
        assertEquals("First", showing())
        host.dismissCurrent()
        advance(tokens.motionExitDuration * 2L)
        assertEquals("only the first closed", listOf("first:dismiss:Host"), results)
        assertEquals("the next waiting one shows", "Second", showing())
        host.dismissCurrent()
        advance(tokens.motionExitDuration * 2L)
        assertEquals("Third", showing())
        assertEquals(listOf("first:dismiss:Host", "second:dismiss:Host"), results)
    }

    // ── SNK-13 / SNK-14 / SNK-15: placement and size ─────────────────────────

    @Test
    fun `SNK-13 the host puts it at the bottom, centred, margin above the bottom edge`() {
        showHost()
        request()
        val window = rule.onNodeWithTag(HOST).getUnclippedBoundsInRoot()
        val shown = liveBar()
        assertEquals((window.bottom - tokens.containerMargin).value, shown.bottom.value, 1f)
        assertEquals(((window.left + window.right) / 2).value, ((shown.left + shown.right) / 2).value, 1f)
    }

    @Test
    @Config(qualifiers = "w800dp-h640dp-xhdpi")
    fun `SNK-14 at least min-height tall, between min-width and max-width, never wider than its host less the margins, padded`() {
        inPlace(message = "Saved")
        val box = rule.onNodeWithTag(BAR).getUnclippedBoundsInRoot()
        assertEquals(tokens.containerMinWidth.value, (box.right - box.left).value, 0.5f)
        assertEquals(tokens.containerMinHeight.value, (box.bottom - box.top).value, 0.5f)
        val text = rule.onNode(hasText("Saved"), useUnmergedTree = true).getUnclippedBoundsInRoot()
        assertEquals((box.left + tokens.containerPaddingInlineStart).value, text.left.value, 0.5f)
        inPlace(message = LONG_MESSAGE, width = 900.dp)
        val wide = rule.onNodeWithTag(BAR).getUnclippedBoundsInRoot()
        assertEquals(tokens.containerMaxWidth.value, (wide.right - wide.left).value, 0.5f)
        showHost(width = 300.dp)
        request(message = LONG_MESSAGE)
        val narrow = liveBar()
        assertEquals((300.dp - tokens.containerMargin * 2).value, (narrow.right - narrow.left).value, 1f)
    }

    @Test
    fun `SNK-15 the controls follow the message gap later, controls-gap apart, controls-height tall, centred on its first line`() {
        inPlace(action = ACTION, closable = true)
        val text = rule.onNode(hasText(MESSAGE), useUnmergedTree = true).getUnclippedBoundsInRoot()
        val actionVisual = visualOf(action())
        val closeVisual = visualOf(close())
        assertEquals(tokens.controlsHeight.value, (closeVisual.right - closeVisual.left).value, 0.6f)
        assertEquals(tokens.controlsHeight.value, (actionVisual.bottom - actionVisual.top).value, 0.6f)
        assertEquals("controls-gap apart", tokens.controlsGap.value, (closeVisual.left - actionVisual.right).value, 0.6f)
        val line = with(rule.density) { tokens.supportingTextTypescale.lineHeight.toDp() }
        assertEquals("centred on the first line", (text.top + line / 2).value, ((closeVisual.top + closeVisual.bottom) / 2).value, 0.6f)
        val box = rule.onNodeWithTag(BAR).getUnclippedBoundsInRoot()
        assertEquals("padding after the last control", (box.right - tokens.containerPaddingInlineEndWithControls).value, closeVisual.right.value, 0.6f)
    }

    // ── SNK-16: its own row ──────────────────────────────────────────────────

    @Test
    fun `SNK-16 a message that would need more than two lines beside the controls moves the action to its own row, end-aligned, gap below`() {
        inPlace(message = LONG_MESSAGE, action = ACTION, closable = true)
        val text = rule.onNode(hasText(LONG_MESSAGE), useUnmergedTree = true).getUnclippedBoundsInRoot()
        val actionVisual = visualOf(action())
        val closeVisual = visualOf(close())
        assertEquals("below the message", (text.bottom + tokens.containerGap).value, actionVisual.top.value, 0.6f)
        val box = rule.onNodeWithTag(BAR).getUnclippedBoundsInRoot()
        assertEquals("at the end", (box.right - tokens.containerPaddingInlineEndWithControls).value, actionVisual.right.value, 0.6f)
        assertEquals("padding-inline-end-with-controls above the bottom edge", (box.bottom - tokens.containerPaddingInlineEndWithControls).value, actionVisual.bottom.value, 0.6f)
        assertTrue("the close button stays on the first row", closeVisual.bottom < text.bottom)
        inPlace(message = "Upload failed", action = "Review every file that could not be uploaded to this folder today")
        val label = rule.onNode(hasText("Review every file that could not be uploaded to this folder today"), useUnmergedTree = true).getUnclippedBoundsInRoot()
        val line = with(rule.density) { tokens.controlsLabelTypescale.lineHeight.toDp() }
        assertEquals("the label never wraps", line.value, (label.bottom - label.top).value, 0.6f)
        assertTrue("on its own row", label.top > rule.onNode(hasText("Upload failed"), useUnmergedTree = true).getUnclippedBoundsInRoot().bottom)
    }

    // ── SNK-17: motion ───────────────────────────────────────────────────────

    @Test
    fun `SNK-17 it rises from below its host's bottom edge while fading in over enter-duration, and fades out in place`() {
        val slow = tanrei.copy(snackbar = tokens.copy(motionEnterDuration = 400, motionEnterEasing = tanrei.motion.easing.linear, motionExitDuration = 400, motionExitEasing = tanrei.motion.easing.linear))
        showHost(system = slow)
        rule.mainClock.autoAdvance = false
        request()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(200)
        val window = rule.onNodeWithTag(HOST).getUnclippedBoundsInRoot()
        val layout = liveBar()
        val drawn = drawnBar()
        assertTrue("half way up: drawn below its place ($drawn vs $layout)", drawn.top > layout.top + 4.dp)
        rule.mainClock.advanceTimeBy(300)
        assertEquals("in place", layout.top.value, drawnBar().top.value, 1.5f)
        host.dismissCurrent()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(200)
        val fading = stagePixel(layout.left + 4.dp, (layout.top + layout.bottom) / 2)
        assertTrue("fading in place: $fading", !isClose(fading, bar) && !isClose(fading, colors[TanreiColorRole.Surface]))
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        assertEquals(null, showing())
        assertTrue(window.bottom > layout.bottom)
    }

    // ── SNK-18: right to left ────────────────────────────────────────────────

    @Test
    fun `SNK-18 right-to-left puts the message at the right and the controls at the left`() {
        inPlace(action = ACTION, closable = true, direction = LayoutDirection.Rtl)
        val box = rule.onNodeWithTag(BAR).getUnclippedBoundsInRoot()
        val text = rule.onNode(hasText(MESSAGE), useUnmergedTree = true).getUnclippedBoundsInRoot()
        val closeVisual = visualOf(close())
        assertEquals((box.right - tokens.containerPaddingInlineStart).value, text.right.value, 0.6f)
        assertEquals((box.left + tokens.containerPaddingInlineEndWithControls).value, closeVisual.left.value, 0.6f)
        assertTrue(visualOf(action()).left > closeVisual.right)
    }

    // ── SNK-19: in place ─────────────────────────────────────────────────────

    @Test
    fun `SNK-19 drawn outside a host it stays in place, never times out, is not a live region, and still reports`() {
        inPlace(action = ACTION, duration = TanreiSnackbarDuration.Short)
        advance(tokens.timeoutShort * 3L)
        rule.onNodeWithTag(BAR).assertExists()
        assertEquals(0, rule.onAllNodes(SemanticsMatcher.keyIsDefined(SemanticsProperties.LiveRegion)).fetchSemanticsNodes().size)
        action().performClick()
        rule.waitForIdle()
        assertEquals(listOf("action"), results)
    }

    // ── SNK-20: reports ──────────────────────────────────────────────────────

    @Test
    fun `SNK-20 an empty message, a nameless close button and a timed action are reported in debug builds, and it still renders`() = collectingReports { reports ->
        setDebuggable(true)
        show {
            Column {
                TanreiSnackbar(message = "", modifier = Modifier.testTag(BAR))
                TanreiSnackbar(message = MESSAGE, withDismissAction = true)
                TanreiSnackbar(message = "Timed", actionLabel = ACTION, duration = TanreiSnackbarDuration.Short)
            }
        }
        rule.onNodeWithTag(BAR).assertExists()
        assertTrue(reports.toString(), reports.any { "message" in it })
        assertTrue(reports.toString(), reports.any { "closeLabel" in it })
        assertTrue(reports.toString(), reports.any { "Timed" in it && "elsewhere" in it })
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    /** A system whose action control has [change] applied in every state (the tests' visible control). */
    private fun TanreiSystem.withControl(@Suppress("UNUSED_PARAMETER") marker: Any, change: (TanreiSnackbarControlStateTokens) -> TanreiSnackbarControlStateTokens): TanreiSystem {
        fun all(control: io.github.chnotchy.tanrei.tokens.TanreiSnackbarControlTokens) = control.copy(enabled = change(control.enabled), hovered = change(control.hovered), focused = change(control.focused), pressed = change(control.pressed))
        return copy(snackbar = snackbar.copy(controls = snackbar.controls.copy(action = all(snackbar.controls.action), close = all(snackbar.controls.close))))
    }

    private object TanreiInteractionFree

    /** The layout box of the live snackbar (the polite region). */
    private fun liveBar(): DpRect = rule.onNode(SemanticsMatcher.expectValue(SemanticsProperties.LiveRegion, LiveRegionMode.Polite)).getUnclippedBoundsInRoot()

    /** Where the live snackbar is drawn: the first row, from the top, that holds the bar's color at its start. */
    private fun drawnBar(): DpRect {
        val layout = liveBar()
        val map = stage()
        return with(rule.density) {
            val x = (layout.left + tokens.containerShape + 2.dp).roundToPx()
            val top = (0 until map.height).firstOrNull { y -> isClose(map[x, y], bar) } ?: map.height
            DpRect(layout.left, top.toDp(), layout.right, top.toDp() + (layout.bottom - layout.top))
        }
    }

    /** The visual box of a control: its hit area less the reservation around a controls-height box. */
    private fun visualOf(node: androidx.compose.ui.test.SemanticsNodeInteraction): DpRect {
        val bounds = node.getUnclippedBoundsInRoot()
        val height = tokens.controlsHeight
        val middle = (bounds.top + bounds.bottom) / 2
        val width = if (bounds.right - bounds.left > tanrei.measure.targetTouch) bounds.right - bounds.left else if (node.fetchSemanticsNode().config.contains(SemanticsProperties.ContentDescription)) height else bounds.right - bounds.left
        val center = (bounds.left + bounds.right) / 2
        return DpRect(center - width / 2, middle - height / 2, center + width / 2, middle + height / 2)
    }

    /** A pixel of [node]'s visual box, [inset] inside its top-start corner. */
    private fun controlPixel(node: androidx.compose.ui.test.SemanticsNodeInteraction, inset: Dp): Color {
        val visual = visualOf(node)
        return stagePixel(visual.left + inset, visual.top + inset)
    }

    private fun stage(): PixelMap = rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap()

    private fun stagePixel(x: Dp, y: Dp): Color {
        val stage = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
        return with(rule.density) { stage()[(x - stage.left).roundToPx(), (y - stage.top).roundToPx()] }
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

    private fun differing(a: PixelMap, b: PixelMap): Int =
        (0 until minOf(a.height, b.height)).sumOf { y -> (0 until minOf(a.width, b.width)).count { x -> !isClose(a[x, y], b[x, y]) } }

    private fun isClose(actual: Color, expected: Color, tolerance: Float = PIXEL_TOLERANCE): Boolean =
        maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue)) <= tolerance

    private fun assertPixel(what: String, actual: Color, expected: Color) =
        assertTrue("$what: expected $expected but was $actual", isClose(actual, expected))

    private companion object {
        const val STAGE_TAG = "stage"
        const val HOST = "host"
        const val BAR = "bar"
        const val BEFORE = "before"
        const val MESSAGE = "Conversation archived"
        const val ACTION = "Undo"
        const val LONG_MESSAGE = "Three files could not be uploaded because they are larger than the limit for this folder, and two more are still waiting."
        const val PIXEL_TOLERANCE = 2f / 255f
    }
}

/** SNK-17 where motion is reduced: Android's setting removes every animation, so it appears and disappears at once. */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w480dp-h640dp-xhdpi")
class TanreiSnackbarReducedMotionTest {
    private object NoMotion : MotionDurationScale {
        override val scaleFactor: Float = 0f
    }

    @get:Rule
    val rule = createComposeRule(effectContext = NoMotion)

    private var open by mutableStateOf(false)

    @Test
    fun `SNK-17 where motion is reduced it appears and disappears at once`() {
        val tanrei = TanreiSystem.Tanrei
        var shown: androidx.compose.runtime.State<Float>? = null
        rule.setContent {
            TanreiTheme(system = tanrei.copy(snackbar = tanrei.snackbar.copy(motionEnterDuration = 400, motionExitDuration = 400)), theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                val transition = androidx.compose.runtime.remember { androidx.compose.animation.core.MutableTransitionState(false) }
                transition.targetState = open
                shown = rememberTanreiSnackbarShown(transition, TanreiTheme.tokens.snackbar)
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
        assertEquals("gone at once", 0f, shown!!.value, 0.001f)
    }
}
