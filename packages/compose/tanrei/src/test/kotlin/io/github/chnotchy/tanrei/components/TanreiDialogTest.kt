package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import android.view.KeyEvent
import android.view.View
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.MotionDurationScale
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PixelMap
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.click
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.isDialog
import androidx.compose.ui.test.isFocused
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.test.swipeUp
import androidx.compose.ui.test.withKeyDown
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.DpRect
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.primitives.TanreiModalDialogs
import io.github.chnotchy.tanrei.primitives.TanreiText
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiTextStyle
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiIconGlyph
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.glyph
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
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
 * Behaviour tests for `specs/dialog.spec.json`. Each test names the behaviour id (`DLG-n`) it covers. Runs on the JVM
 * (Robolectric, native graphics). What the window does — presentation, inertness, focus in, around and back, Escape,
 * back, the scrim, stacking, the announcement — is tested on `TanreiDialog` in its `Dialog` window, opened from a
 * button; what the surface draws and how it lays out also on the in-place `TanreiDialogContent` the baselines draw.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w480dp-h640dp-xhdpi")
class TanreiDialogTest {
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
    private val tokens = tanrei.dialog
    private val events = mutableListOf<String>()
    private var open by mutableStateOf(false)
    private var inner by mutableStateOf(false)
    private var hostView: View? = null
    private var dialogView: View? = null
    private var seenContentColor = Color.Unspecified
    private var seenGlyph: TanreiIconGlyph? = null
    private var seenIconColor = Color.Unspecified

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
                CompositionLocalProvider(LocalLayoutDirection provides current.direction, LocalDensity provides Density(density.density, current.fontScale)) {
                    TanreiTheme(system = current.system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                        Box(Modifier.testTag(STAGE_TAG).fillMaxSize().background(TanreiColorRole.Surface.color)) { current.content() }
                    }
                }
            }
        }
        rule.waitForIdle()
    }

    /** An opener button, and the dialog it opens with two text actions (Cancel, Discard) and — [initial] — Cancel focused first. */
    private fun showDialog(
        dismissible: Boolean = true,
        alert: Boolean = false,
        initial: Boolean = false,
        headline: String = HEADLINE,
        supportingText: String = TEXT,
        system: TanreiSystem = tanrei,
    ) = show(system) {
        val cancel = remember { FocusRequester() }
        Column {
            TanreiButton(text = "Delete", onClick = { open = true }, modifier = Modifier.testTag(OPENER))
            TanreiDialog(
                visible = open,
                onDismissRequest = { events += "dismiss" },
                headline = headline,
                modifier = Modifier.testTag(SURFACE),
                supportingText = supportingText,
                alert = alert,
                dismissible = dismissible,
                initialFocus = if (initial) cancel else null,
                actions = {
                    TanreiButton(text = "Cancel", onClick = { events += "cancel" }, modifier = Modifier.testTag(CANCEL).focusRequester(cancel), variant = TanreiButtonVariant.Text)
                    TanreiButton(text = "Discard", onClick = { events += "discard" }, modifier = Modifier.testTag(DISCARD), variant = TanreiButtonVariant.Text)
                },
                content = { dialogView = LocalView.current },
            )
        }
    }

    private fun dialogs(): Int = rule.onAllNodes(isDialog()).fetchSemanticsNodes().size

    /** Sends a key down and up to the dialog's window, as the platform does when no view used it. */
    private fun windowKey(code: Int) {
        val root = dialogView!!.rootView
        rule.runOnUiThread {
            root.dispatchKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, code))
            root.dispatchKeyEvent(KeyEvent(KeyEvent.ACTION_UP, code))
        }
        rule.waitForIdle()
    }

    // ── DLG-1: presented, everything else inert ──────────────────────────────

    @Test
    fun `DLG-1 opening presents it in a window of its own over the scrim, hides what is behind from assistive technology, and counts as a modal dialog`() {
        showDialog()
        assertEquals(0, dialogs())
        val before = hostView!!.importantForAccessibility
        rule.onNodeWithTag(OPENER).performClick()
        rule.waitForIdle()
        assertEquals(1, dialogs())
        assertEquals(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS, hostView!!.importantForAccessibility)
        assertEquals(1, TanreiModalDialogs.open)
        val image = rule.onNode(isDialog()).captureToImage().toPixelMap()
        val scrim = tokens.scrimColor.resolve(colors)
        val corner = image[2, 2]
        assertEquals("the scrim, as drawn", scrim.alpha, corner.alpha, 0.02f)
        open = false
        rule.waitForIdle()
        assertEquals(0, dialogs())
        assertEquals("restored", before, hostView!!.importantForAccessibility)
        assertEquals(0, TanreiModalDialogs.open)
    }

    // ── DLG-2 / DLG-3 / DLG-4: focus ─────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `DLG-2 without a mark focus moves to the surface, and the next Tab reaches the first action`() {
        showDialog()
        rule.onNodeWithTag(OPENER).requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        rule.onNodeWithTag(SURFACE).assertIsFocused()
        rule.onNodeWithTag(SURFACE).performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(CANCEL).assertIsFocused()
    }

    @Test
    @KeyboardNavigation
    fun `DLG-2 a marked element takes focus when it opens`() {
        showDialog(initial = true)
        rule.onNodeWithTag(OPENER).requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        rule.onNodeWithTag(CANCEL).assertIsFocused()
    }

    @Test
    @KeyboardNavigation
    fun `DLG-3 Tab and Shift+Tab wrap inside the dialog`() {
        showDialog(initial = true)
        rule.onNodeWithTag(OPENER).requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        rule.onNodeWithTag(CANCEL).assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(DISCARD).assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(CANCEL).assertIsFocused().performKeyInput { withKeyDown(Key.ShiftLeft) { pressKey(Key.Tab) } }
        rule.waitForIdle()
        rule.onNodeWithTag(DISCARD).assertIsFocused()
    }

    @Test
    @KeyboardNavigation
    fun `DLG-4 closing returns focus to the element that had it`() {
        showDialog(initial = true)
        rule.onNodeWithTag(OPENER).requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        rule.onNodeWithTag(CANCEL).assertIsFocused()
        open = false
        rule.waitForIdle()
        rule.onNodeWithTag(OPENER).assertIsFocused()
    }

    // ── DLG-5 / DLG-6: dismiss, and actions ──────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `DLG-5 Escape emits dismiss once and goes no further`() {
        showDialog(initial = true)
        rule.onNodeWithTag(OPENER).requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        rule.onNodeWithTag(CANCEL).performKeyInput { pressKey(Key.Escape) }
        rule.waitForIdle()
        assertEquals(listOf("dismiss"), events)
        assertEquals("the product closes it", 1, dialogs())
    }

    @Test
    fun `DLG-5 the platform's back and a press on the scrim each emit dismiss once`() {
        showDialog()
        open = true
        rule.waitForIdle()
        windowKey(KeyEvent.KEYCODE_BACK)
        assertEquals(listOf("dismiss"), events)
        rule.onNode(isDialog()).performTouchInput { click(androidx.compose.ui.geometry.Offset(8f, 8f)) }
        rule.waitForIdle()
        assertEquals(listOf("dismiss", "dismiss"), events)
        rule.onNodeWithTag(SURFACE).performTouchInput { click(center) }
        rule.waitForIdle()
        assertEquals("a press on the surface is not the scrim's", listOf("dismiss", "dismiss"), events)
    }

    @Test
    @KeyboardNavigation
    fun `DLG-5 while dismissible is false Escape, back and the scrim emit nothing`() {
        showDialog(dismissible = false, initial = true)
        rule.onNodeWithTag(OPENER).requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        rule.onNodeWithTag(CANCEL).performKeyInput { pressKey(Key.Escape) }
        windowKey(KeyEvent.KEYCODE_BACK)
        rule.onNode(isDialog()).performTouchInput { click(androidx.compose.ui.geometry.Offset(8f, 8f)) }
        rule.waitForIdle()
        assertEquals(emptyList<String>(), events)
        assertEquals(1, dialogs())
    }

    @Test
    @KeyboardNavigation
    fun `DLG-5 DLG-15 Escape with a tooltip open in the dialog closes the tooltip, and the dialog stays`() {
        var tooltip: TanreiTooltipState? = null
        show {
            val cancel = remember { FocusRequester() }
            Column {
                TanreiButton(text = "Delete", onClick = { open = true }, modifier = Modifier.testTag(OPENER))
                TanreiDialog(visible = open, onDismissRequest = { events += "dismiss" }, headline = HEADLINE, initialFocus = cancel, actions = {
                    TanreiButton(text = "Cancel", onClick = {}, modifier = Modifier.testTag(CANCEL).focusRequester(cancel), variant = TanreiButtonVariant.Text)
                }) {
                    val state = rememberTanreiTooltipState()
                    tooltip = state
                    TanreiTooltip(text = "More about drafts", state = state) { TanreiText("Drafts") }
                }
            }
        }
        rule.onNodeWithTag(OPENER).requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        rule.runOnUiThread { tooltip!!.show() }
        rule.waitForIdle()
        rule.onNodeWithTag(CANCEL).performKeyInput { pressKey(Key.Escape) }
        rule.waitForIdle()
        assertFalse("the tooltip closed", tooltip!!.isVisible)
        assertEquals("the dialog did not hear it", emptyList<String>(), events)
        rule.onNodeWithTag(CANCEL).performKeyInput { pressKey(Key.Escape) }
        rule.waitForIdle()
        assertEquals(listOf("dismiss"), events)
    }

    @Test
    fun `DLG-6 an action does not close the dialog by itself`() {
        showDialog()
        open = true
        rule.waitForIdle()
        rule.onNodeWithTag(DISCARD).performClick()
        rule.waitForIdle()
        assertEquals(listOf("discard"), events)
        assertEquals(1, dialogs())
    }

    // ── DLG-7 – DLG-10: the surface ──────────────────────────────────────────

    private fun inPlace(
        headline: String = HEADLINE,
        supportingText: String = TEXT,
        icon: (@Composable () -> Unit)? = null,
        actions: (@Composable () -> Unit)? = { DefaultActions() },
        content: (@Composable () -> Unit)? = null,
        system: TanreiSystem = tanrei,
        direction: LayoutDirection = LayoutDirection.Ltr,
        fontScale: Float = 1f,
        width: Dp = 480.dp,
        height: Dp = 640.dp,
    ) = show(system, direction, fontScale) {
        Box(Modifier.testTag(BOX).size(width, height)) {
            TanreiDialogContent(headline = headline, supportingText = supportingText, icon = icon, actions = actions, content = content, modifier = Modifier.testTag(SURFACE))
        }
    }

    @Composable
    private fun DefaultActions() {
        TanreiButton(text = "Cancel", onClick = {}, modifier = Modifier.testTag(CANCEL), variant = TanreiButtonVariant.Text)
        TanreiButton(text = "Discard", onClick = {}, modifier = Modifier.testTag(DISCARD), variant = TanreiButtonVariant.Text)
    }

    private fun bounds(tag: String): DpRect = rule.onNodeWithTag(tag).getUnclippedBoundsInRoot()

    private fun text(value: String): DpRect = rule.onNode(hasText(value), useUnmergedTree = true).getUnclippedBoundsInRoot()

    @Test
    @Config(qualifiers = "w1000dp-h640dp-xhdpi")
    fun `DLG-7 the surface is centred, as wide as its content between min-width and max-width but never wider than the window less the margins`() {
        inPlace(supportingText = "", actions = null, headline = "OK?")
        val box = bounds(BOX)
        val surface = bounds(SURFACE)
        assertEquals("min-width", tokens.containerMinWidth.value, (surface.right - surface.left).value, 0.6f)
        assertEquals(((box.left + box.right) / 2).value, ((surface.left + surface.right) / 2).value, 0.6f)
        assertEquals(((box.top + box.bottom) / 2).value, ((surface.top + surface.bottom) / 2).value, 0.6f)
        inPlace(supportingText = LONG)
        assertEquals("the window less the margins", (480.dp - tokens.containerMargin * 2).value, bounds(SURFACE).let { it.right - it.left }.value, 0.6f)
        inPlace(supportingText = LONG, width = 900.dp)
        assertEquals("max-width", tokens.containerMaxWidth.value, bounds(SURFACE).let { it.right - it.left }.value, 0.6f)
        assertPixel("its color", stagePixel(bounds(SURFACE).left + tokens.containerPadding / 2, bounds(SURFACE).top + tokens.containerShape + 4.dp), tokens.containerColor.resolve(colors))
    }

    @Test
    fun `DLG-7 the surface's corners ease by corner smoothing - a quarter circle at 0`() {
        val radius = 24.dp
        for (smoothing in listOf(0f, 0.6f)) {
            inPlace(system = tanrei.copy(dialog = tokens.copy(containerShape = radius), shape = tanrei.shape.copy(cornerSmoothing = smoothing)))
            val surface = bounds(SURFACE)
            assertFalse("smoothing $smoothing: the very corner is outside", isClose(stagePixel(surface.left + 1.dp, surface.top + 1.dp), tokens.containerColor.resolve(colors)))
            assertPixel("smoothing $smoothing: inside", stagePixel(surface.left + radius, surface.top + radius), tokens.containerColor.resolve(colors))
        }
    }

    @Test
    fun `DLG-8 its parts are inset by the padding, gap apart, the actions margin-block-start below, and the content gets the content color`() {
        inPlace(content = { seenContentColor = LocalTanreiContentColor.current; TanreiText("Anyone with the link") })
        val surface = bounds(SURFACE)
        val headline = text(HEADLINE)
        val supporting = text(TEXT)
        val content = text("Anyone with the link")
        assertEquals((surface.left + tokens.containerPadding).value, headline.left.value, 0.6f)
        assertEquals((surface.top + tokens.containerPadding).value, headline.top.value, 0.6f)
        assertEquals((headline.bottom + tokens.containerGap).value, supporting.top.value, 0.6f)
        assertEquals((supporting.bottom + tokens.containerGap).value, content.top.value, 0.6f)
        val cancel = bounds(CANCEL)
        assertTrue("the actions below by margin-block-start (their touch target may reach into it)", cancel.top >= content.bottom + tokens.actionsMarginBlockStart - tanrei.measure.targetTouch / 2)
        assertEquals(tokens.contentColor.resolve(colors), seenContentColor)
        val line = with(rule.density) { tokens.headlineTypescale.lineHeight.toDp() }
        assertEquals("the headline's style", line.value, (headline.bottom - headline.top).value, 0.6f)
    }

    @Test
    fun `DLG-8 plain text given as content takes sys-typescale-body, whatever text style encloses the dialog`() {
        var seenStyle: TextStyle? = null
        show {
            CompositionLocalProvider(LocalTanreiTextStyle provides tanrei.typescale.caption.toTextStyle()) {
                Box(Modifier.testTag(BOX).size(480.dp, 640.dp)) {
                    TanreiDialogContent(headline = HEADLINE, supportingText = TEXT, icon = null, actions = null, content = { seenStyle = LocalTanreiTextStyle.current; TanreiText("Anyone with the link") }, modifier = Modifier.testTag(SURFACE))
                }
            }
        }
        val body = tanrei.typescale.body
        assertEquals(body.size.value, seenStyle!!.fontSize.value, 0.01f)
        assertEquals(body.lineHeight.value, seenStyle!!.lineHeight.value, 0.01f)
        val line = with(rule.density) { body.lineHeight.toDp() }
        val content = text("Anyone with the link")
        assertEquals("one line of body", line.value, (content.bottom - content.top).value, 0.6f)
    }

    @Test
    fun `DLG-9 an icon is drawn at its size, color and unselected glyph, and centres itself and the headline - without one the headline starts at the start`() {
        inPlace(icon = {
            seenGlyph = LocalTanreiIconGlyph.current
            seenIconColor = LocalTanreiContentColor.current
            Box(Modifier.fillMaxSize().testTag(ICON))
        })
        assertEquals(tanrei.icon.glyph(tokens.iconSize, selected = false), seenGlyph)
        assertEquals(tokens.iconColor.resolve(colors), seenIconColor)
        val surface = bounds(SURFACE)
        val headline = text(HEADLINE)
        val middle = (surface.left + surface.right) / 2
        assertEquals("the headline centred", middle.value, ((headline.left + headline.right) / 2).value, 1f)
        val supporting = text(TEXT)
        assertEquals("the supporting text still at the start", (surface.left + tokens.containerPadding).value, supporting.left.value, 0.6f)
        inPlace()
        assertEquals((bounds(SURFACE).left + tokens.containerPadding).value, text(HEADLINE).left.value, 0.6f)
    }

    @Test
    fun `DLG-10 the actions are one row at the end, gap apart, in order - stacked at the end when they do not fit`() {
        inPlace()
        val surface = bounds(SURFACE)
        val cancel = bounds(CANCEL)
        val discard = bounds(DISCARD)
        assertEquals("at the end", (surface.right - tokens.containerPadding).value, discard.right.value, 0.6f)
        assertEquals("in order, gap apart", tokens.actionsGap.value, (discard.left - cancel.right).value, 0.6f)
        assertEquals(cancel.top, discard.top)
        inPlace(supportingText = "", headline = "OK?", actions = {
            TanreiButton(text = "Keep everything as it was before", onClick = {}, modifier = Modifier.testTag(CANCEL), variant = TanreiButtonVariant.Text)
            TanreiButton(text = "Discard every change made today", onClick = {}, modifier = Modifier.testTag(DISCARD), variant = TanreiButtonVariant.Text)
        })
        val first = bounds(CANCEL)
        val second = bounds(DISCARD)
        assertTrue("stacked, in order", second.top >= first.bottom)
        assertEquals("each at the end", first.right.value, second.right.value, 0.6f)
    }

    // ── DLG-11 / DLG-12: scrolling ───────────────────────────────────────────

    @Test
    fun `DLG-11 a dialog taller than the window scrolls its text between the fixed headline and actions, with dividers only while something is out of view`() {
        inPlace(supportingText = LONG + " " + LONG + " " + LONG + " " + LONG, height = 400.dp)
        val divider = tokens.dividerColor.resolve(colors)
        val surface = bounds(SURFACE)
        val headline = text(HEADLINE)
        val cancel = bounds(CANCEL)
        assertTrue("fits the window", surface.bottom - surface.top <= 400.dp - tokens.containerMargin * 2 + 1.dp)
        val above = rowWith(divider, surface, headline.bottom, cancel.top)
        assertTrue("a divider above the actions while more lies below", above.any { it > (headline.bottom + cancel.top) / 2 })
        assertFalse("none under the headline at the top", above.any { it < (headline.bottom + cancel.top) / 2 })
        rule.onNode(hasText(LONG, substring = true), useUnmergedTree = true).performTouchInput { swipeUp() }
        rule.onNode(hasText(LONG, substring = true), useUnmergedTree = true).performTouchInput { swipeUp() }
        rule.onNode(hasText(LONG, substring = true), useUnmergedTree = true).performTouchInput { swipeUp() }
        rule.waitForIdle()
        assertEquals("the headline stays", headline.top, text(HEADLINE).top)
        assertEquals("the actions stay", cancel.top, bounds(CANCEL).top)
        val after = rowWith(divider, surface, headline.bottom, cancel.top)
        assertTrue("a divider under the headline once scrolled", after.any { it < (headline.bottom + cancel.top) / 2 })
        inPlace()
        val fits = bounds(SURFACE)
        assertTrue("everything fits: no divider", rowWith(divider, fits, text(HEADLINE).bottom, bounds(CANCEL).top).isEmpty())
    }

    @Test
    fun `DLG-12 when the headline and the actions leave no room, everything scrolls together`() {
        inPlace(supportingText = LONG, height = 220.dp, fontScale = 2f)
        rule.waitForIdle()
        val box = bounds(BOX)
        val before = bounds(CANCEL)
        assertTrue("the actions start out of view: $before", before.bottom > box.bottom - tokens.containerMargin)
        rule.onNodeWithTag(SURFACE).performTouchInput { swipeUp() }
        rule.onNodeWithTag(SURFACE).performTouchInput { swipeUp() }
        rule.waitForIdle()
        assertTrue("reachable by scrolling everything", bounds(CANCEL).top < before.top)
        assertTrue("the headline scrolled too", text(HEADLINE).top < bounds(SURFACE).top + tokens.containerPadding)
    }

    // ── DLG-13: motion ───────────────────────────────────────────────────────

    @Test
    fun `DLG-13 it fades in over enter-duration and out over exit-duration`() {
        val system = tanrei.copy(dialog = tokens.copy(motionEnterDuration = 400, motionEnterEasing = tanrei.motion.easing.linear, motionExitDuration = 200, motionExitEasing = tanrei.motion.easing.linear))
        var visible by mutableStateOf(false)
        var shown: androidx.compose.runtime.State<Float>? = null
        show(system) {
            val transition = remember { androidx.compose.animation.core.MutableTransitionState(false) }
            transition.targetState = visible
            shown = rememberTanreiDialogShown(transition, TanreiTheme.tokens.dialog)
        }
        rule.mainClock.autoAdvance = false
        visible = true
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(200)
        assertEquals("half way in", 0.5f, shown!!.value, 0.1f)
        rule.mainClock.advanceTimeBy(300)
        assertEquals(1f, shown!!.value, 0.001f)
        visible = false
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(100)
        assertEquals("half way out, over the shorter exit", 0.5f, shown!!.value, 0.12f)
        rule.mainClock.advanceTimeBy(200)
        assertEquals(0f, shown!!.value, 0.001f)
        rule.mainClock.autoAdvance = true
    }

    @Test
    @KeyboardNavigation
    fun `DLG-13 focus moves when it opens, not when its motion ends`() {
        val system = tanrei.copy(dialog = tokens.copy(motionEnterDuration = 1000, motionEnterEasing = tanrei.motion.easing.linear))
        showDialog(system = system, initial = true)
        rule.onNodeWithTag(OPENER).requestFocus()
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag(OPENER).performKeyInput { pressKey(Key.Enter) }
        repeat(4) { rule.mainClock.advanceTimeByFrame() }
        rule.onNodeWithTag(CANCEL).assertIsFocused()
        rule.mainClock.advanceTimeBy(1200)
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `DLG-13 the surface grows about its centre from the enter scale while it enters, and only fades while it leaves`() {
        val scale = 0.5f
        val system = tanrei.copy(dialog = tokens.copy(motionEnterScale = scale))
        fun drawnWidth(): Dp {
            val map = rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap()
            val surface = bounds(SURFACE)
            val stage = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
            val back = map[2, 2]
            return with(rule.density) {
                val y = ((surface.top + surface.bottom) / 2 - stage.top).roundToPx()
                val xs = (0 until map.width).filter { x -> !isClose(map[x, y], back, 24f / 255f) }
                if (xs.isEmpty()) 0.dp else (xs.last() - xs.first() + 1).toDp()
            }
        }
        show(system) { Box(Modifier.size(480.dp, 640.dp)) { TanreiDialogContent(HEADLINE, TEXT, null, null, null, modifier = Modifier.testTag(SURFACE), shown = { 1f }, entering = true) } }
        val full = drawnWidth()
        show(system) { Box(Modifier.size(480.dp, 640.dp)) { TanreiDialogContent(HEADLINE, TEXT, null, null, null, modifier = Modifier.testTag(SURFACE), shown = { 0.99f }, entering = true) } }
        val entering = drawnWidth()
        assertEquals("almost whole", full.value, entering.value, full.value * 0.02f + 2f)
        show(system) { Box(Modifier.size(480.dp, 640.dp)) { TanreiDialogContent(HEADLINE, TEXT, null, null, null, modifier = Modifier.testTag(SURFACE), shown = { 0.5f }, entering = true) } }
        val half = drawnWidth()
        assertTrue("half way in: about ${(scale + (1 - scale) * 0.5f)} of its width ($half of $full)", abs(half.value - full.value * 0.75f) < full.value * 0.06f)
        show(system) { Box(Modifier.size(480.dp, 640.dp)) { TanreiDialogContent(HEADLINE, TEXT, null, null, null, modifier = Modifier.testTag(SURFACE), shown = { 0.5f }, entering = false) } }
        assertEquals("leaving: whole, fading", full.value, drawnWidth().value, full.value * 0.02f + 2f)
    }

    // ── DLG-14: semantics ────────────────────────────────────────────────────

    @Test
    fun `DLG-14 the surface is named by its headline, and an alert is read at once - an empty headline is reported`() = collectingReports { reports ->
        val heard = mutableListOf<String>()
        val previous = TanreiDialogAnnouncer.announce
        TanreiDialogAnnouncer.announce = { _, text -> heard += text }
        try {
            showDialog(alert = true)
            open = true
            rule.waitForIdle()
            assertEquals(HEADLINE, rule.onNodeWithTag(SURFACE).fetchSemanticsNode().config[SemanticsProperties.PaneTitle])
            assertEquals(listOf("$HEADLINE. $TEXT"), heard)
            rule.onNode(hasText(HEADLINE)).assert(SemanticsMatcher.keyIsDefined(SemanticsProperties.Heading))
        } finally {
            TanreiDialogAnnouncer.announce = previous
        }
        open = false
        rule.waitForIdle()
        setDebuggable(true)
        showDialog(headline = "")
        open = true
        rule.waitForIdle()
        assertEquals("it still opens", 1, dialogs())
        assertTrue(reports.toString(), reports.any { "TanreiDialog" in it && "headline" in it })
    }

    // ── DLG-15: stacking ─────────────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `DLG-15 a dialog opened from a dialog stacks above it, hides it, takes Escape alone, and gives focus back inside the first`() {
        show {
            Column {
                TanreiButton(text = "Open", onClick = { open = true }, modifier = Modifier.testTag(OPENER))
                TanreiDialog(visible = open, onDismissRequest = { events += "outer"; open = false }, headline = "First", actions = {
                    TanreiButton(text = "More", onClick = { inner = true }, modifier = Modifier.testTag(MORE), variant = TanreiButtonVariant.Text)
                }, content = { dialogView = LocalView.current })
                TanreiDialog(visible = inner, onDismissRequest = { events += "inner"; inner = false }, headline = "Second")
            }
        }
        rule.onNodeWithTag(OPENER).requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        rule.onNodeWithTag(MORE).requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals(2, dialogs())
        assertEquals(2, TanreiModalDialogs.open)
        rule.onNode(SemanticsMatcher.expectValue(SemanticsProperties.PaneTitle, "Second")).assertIsFocused().performKeyInput { pressKey(Key.Escape) }
        rule.waitForIdle()
        assertEquals("only the topmost", listOf("inner"), events)
        assertEquals(1, dialogs())
        rule.onNodeWithTag(MORE).assertIsFocused()
    }

    // ── DLG-16: right to left ────────────────────────────────────────────────

    @Test
    fun `DLG-16 right-to-left aligns the headline and text to the right and the actions to the left, in the same order`() {
        inPlace(direction = LayoutDirection.Rtl)
        val surface = bounds(SURFACE)
        assertEquals((surface.right - tokens.containerPadding).value, text(HEADLINE).right.value, 0.6f)
        assertEquals((surface.right - tokens.containerPadding).value, text(TEXT).right.value, 0.6f)
        val cancel = bounds(CANCEL)
        val discard = bounds(DISCARD)
        assertEquals((surface.left + tokens.containerPadding).value, discard.left.value, 0.6f)
        assertTrue("Cancel first, from the right", cancel.left > discard.right)
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    /** The rows (dp, root coordinates) between [top] and [bottom] where [surface]'s start padding is [color]. */
    private fun rowWith(color: Color, surface: DpRect, top: Dp, bottom: Dp): List<Dp> {
        val map = rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap()
        val stage = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
        val over = color.compositeOver(tokens.containerColor.resolve(colors))
        return with(rule.density) {
            // Inside the surface's padding, where only a divider (which spans the surface) is drawn.
            val x = (surface.left + tokens.containerPadding / 2 - stage.left).roundToPx()
            ((top - stage.top).roundToPx() until (bottom - stage.top).roundToPx()).filter { y -> isClose(map[x, y], over) }.map { it.toDp() + stage.top }
        }
    }

    private fun stagePixel(x: Dp, y: Dp): Color {
        val map: PixelMap = rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap()
        val stage = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
        return with(rule.density) { map[(x - stage.left).roundToPx(), (y - stage.top).roundToPx()] }
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
        const val BOX = "box"
        const val SURFACE = "surface"
        const val OPENER = "opener"
        const val CANCEL = "cancel"
        const val DISCARD = "discard"
        const val MORE = "more"
        const val ICON = "icon"
        const val HEADLINE = "Discard draft?"
        const val TEXT = "The message you were writing will be deleted."
        const val LONG = "Please read these terms before you continue. They describe what the service does, what it does not do, how your data is stored and for how long, how you can export or delete it, and how these terms may change."
        const val PIXEL_TOLERANCE = 3f / 255f
    }
}

/** DLG-13 where motion is reduced: Android's setting removes every animation, so it appears and disappears at once. */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w480dp-h640dp-xhdpi")
class TanreiDialogReducedMotionTest {
    private object NoMotion : MotionDurationScale {
        override val scaleFactor: Float = 0f
    }

    @get:Rule
    val rule = createComposeRule(effectContext = NoMotion)

    private var open by mutableStateOf(false)

    @Test
    fun `DLG-13 where motion is reduced it appears and disappears at once`() {
        val tanrei = TanreiSystem.Tanrei
        var shown: androidx.compose.runtime.State<Float>? = null
        rule.setContent {
            TanreiTheme(system = tanrei.copy(dialog = tanrei.dialog.copy(motionEnterDuration = 400, motionExitDuration = 400)), theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                val transition = remember { androidx.compose.animation.core.MutableTransitionState(false) }
                transition.targetState = open
                shown = rememberTanreiDialogShown(transition, TanreiTheme.tokens.dialog)
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
