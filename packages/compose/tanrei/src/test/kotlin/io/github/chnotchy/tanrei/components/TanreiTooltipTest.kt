package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.MotionDurationScale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.click
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.isFocusable
import androidx.compose.ui.test.isPopup
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performMouseInput
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.test.withKeyDown
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntRect
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.Cupertino
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiPaint
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
 * Behaviour tests for `specs/tooltip.spec.json`. Each test names the behaviour id (`TIP-n`) it covers. Runs on the JVM
 * (Robolectric, native graphics). The tooltip's own behaviour is tested on `TanreiTooltip` and its popup — an icon
 * button as the anchor, in the middle of the window, between two focusable boxes; placement also on the pure
 * `tanreiTooltipPosition`; what it draws on the in-place form the baselines draw (`TanreiTooltipInPlace`).
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiTooltipTest {
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
    private val tokens = tanrei.tooltip
    private val surface = colors[TanreiColorRole.Surface]
    private val events = mutableListOf<String>()
    private var state: TanreiTooltipState? = null
    private var rootView: android.view.View? = null

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
            rootView = LocalView.current
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

    /** A tooltip on an icon button in the middle of the window, a focusable box before and after it; toggles recorded. */
    private fun showTooltip(
        text: String = TEXT,
        variant: TanreiTooltipVariant = TanreiTooltipVariant.Plain,
        title: String = "",
        describes: Boolean = true,
        system: TanreiSystem = tanrei,
    ) = show(system) {
        Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = androidx.compose.foundation.layout.Arrangement.Center) {
            Box(Modifier.testTag(BEFORE).size(8.dp).focusable())
            Tooltip(text = text, variant = variant, title = title, describes = describes, tag = ANCHOR, label = "Delete")
            Box(Modifier.testTag(AFTER).size(8.dp).focusable())
        }
    }

    @Composable
    private fun Tooltip(text: String, tag: String, label: String, variant: TanreiTooltipVariant = TanreiTooltipVariant.Plain, title: String = "", describes: Boolean = true) {
        val remembered = rememberTanreiTooltipState(onToggle = { events += "toggle:$tag:$it" })
        if (tag == ANCHOR) state = remembered
        TanreiTooltip(text = text, variant = variant, title = title, describes = describes, state = remembered) {
            TanreiIconButton(onClick = { events += "click:$tag" }, contentDescription = label, modifier = Modifier.testTag(tag)) { Box(Modifier.fillMaxSize()) }
        }
    }

    private fun popups(): Int = rule.onAllNodes(isPopup()).fetchSemanticsNodes().size

    private fun advance(millis: Long) {
        rule.mainClock.advanceTimeBy(millis)
    }

    // ── TIP-1: the pointer ───────────────────────────────────────────────────

    @Test
    fun `TIP-1 a resting pointer opens it after show-delay, and it stays while the pointer moves onto it, closing hide-delay after it left both`() {
        showTooltip()
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag(ANCHOR).performMouseInput { moveTo(center) }
        advance(tokens.motionShowDelay - 100L)
        assertEquals("not before show-delay", 0, popups())
        advance(200)
        assertEquals("open after show-delay", 1, popups())
        assertEquals(listOf("toggle:$ANCHOR:true"), events)
        rule.onNode(isPopup()).performMouseInput { moveTo(center) }
        rule.onNodeWithTag(ANCHOR).performMouseInput { moveTo(Offset(-200f, -200f)) }
        advance(tokens.motionHideDelay * 3L)
        assertEquals("the pointer is on the tooltip", 1, popups())
        rule.onNode(isPopup()).performMouseInput { moveTo(Offset(-50f, -50f)) }
        advance(tokens.motionHideDelay / 2L)
        assertTrue("still within hide-delay", state!!.isVisible)
        advance(tokens.motionHideDelay + tokens.motionExitDuration * 2L)
        assertFalse(state!!.isVisible)
        assertEquals("gone once faded", 0, popups())
        assertEquals(listOf("toggle:$ANCHOR:true", "toggle:$ANCHOR:false"), events)
        rule.mainClock.autoAdvance = true
    }

    // ── TIP-2: keyboard focus ────────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `TIP-2 keyboard focus on the anchor opens it at once, and focus leaving closes it`() {
        showTooltip()
        rule.onNodeWithTag(BEFORE).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(ANCHOR).assertIsFocused()
        assertEquals(1, popups())
        rule.onNodeWithTag(ANCHOR).performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        assertEquals(0, popups())
        assertEquals(listOf("toggle:$ANCHOR:true", "toggle:$ANCHOR:false"), events)
    }

    @Test
    fun `TIP-2 focus gained by touch does not open it`() {
        showTooltip()
        rule.onNodeWithTag(ANCHOR).requestFocus()
        rule.waitForIdle()
        assertEquals(0, popups())
    }

    // ── TIP-3: long-press ────────────────────────────────────────────────────

    @Test
    fun `TIP-3 a long-press opens it without activating the anchor, and it stays touch-timeout after the finger lifts`() {
        showTooltip()
        val longPress = android.view.ViewConfiguration.getLongPressTimeout().toLong()
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag(ANCHOR).performTouchInput { down(center) }
        advance(longPress + 50)
        assertTrue("open", state!!.isVisible)
        rule.onNodeWithTag(ANCHOR).performTouchInput { up() }
        advance(tokens.timeoutTouch - 200L)
        assertTrue("still open", state!!.isVisible)
        advance(400)
        assertFalse("closed after the touch timeout", state!!.isVisible)
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        assertFalse("the anchor was not activated", "click:$ANCHOR" in events)
        assertEquals(listOf("toggle:$ANCHOR:true", "toggle:$ANCHOR:false"), events)
    }

    @Test
    fun `TIP-3 a touch anywhere else closes it sooner`() {
        showTooltip()
        rule.onNodeWithTag(ANCHOR).performTouchInput { down(center) }
        rule.mainClock.advanceTimeBy(android.view.ViewConfiguration.getLongPressTimeout() + 50L)
        rule.onNodeWithTag(ANCHOR).performTouchInput { up() }
        rule.waitForIdle()
        assertTrue(state!!.isVisible)
        // The popup's window hears a touch outside itself.
        val window = popupWindow()
        val down = android.view.MotionEvent.obtain(0L, 0L, android.view.MotionEvent.ACTION_OUTSIDE, -10f, -10f, 0)
        rule.runOnUiThread { window.dispatchTouchEvent(down) }
        down.recycle()
        rule.waitForIdle()
        assertFalse(state!!.isVisible)
    }

    // ── TIP-4: Escape ────────────────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `TIP-4 Escape closes it without moving focus, goes no further, and it stays closed until the anchor is focused again`() {
        val outer = mutableListOf<String>()
        show {
            Column(Modifier.fillMaxSize().onKeyEvent { outer += "${it.key}"; false }, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = androidx.compose.foundation.layout.Arrangement.Center) {
                Box(Modifier.testTag(BEFORE).size(8.dp).focusable())
                Tooltip(text = TEXT, tag = ANCHOR, label = "Delete")
            }
        }
        rule.onNodeWithTag(ANCHOR).requestFocus()
        rule.waitForIdle()
        assertTrue(state!!.isVisible)
        rule.onNodeWithTag(ANCHOR).performKeyInput { pressKey(Key.Escape) }
        rule.waitForIdle()
        assertFalse(state!!.isVisible)
        rule.onNodeWithTag(ANCHOR).assertIsFocused()
        assertFalse("Escape went no further: $outer", outer.any { "Escape" in it })
        rule.mainClock.advanceTimeBy(5_000)
        assertFalse("stays closed", state!!.isVisible)
        rule.onNodeWithTag(ANCHOR).performKeyInput { withKeyDown(Key.ShiftLeft) { pressKey(Key.Tab) } }
        rule.waitForIdle()
        rule.onNodeWithTag(BEFORE).performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        assertTrue("focused again: open", state!!.isVisible)
    }

    @Test
    fun `TIP-4 Escape that no view handled closes a tooltip opened by the pointer while focus is elsewhere`() {
        showTooltip()
        rule.onNodeWithTag(ANCHOR).performMouseInput { moveTo(center) }
        rule.mainClock.advanceTimeBy(tokens.motionShowDelay + 50L)
        rule.waitForIdle()
        assertTrue(state!!.isVisible)
        val view = rootView!!
        var handled = false
        // What the view root does with a key no view handled (a hidden method of View).
        val dispatch = android.view.View::class.java.getDeclaredMethod("dispatchUnhandledKeyEvent", android.view.KeyEvent::class.java).apply { isAccessible = true }
        // It answers the view that handled the key, or null.
        rule.runOnUiThread { handled = dispatch.invoke(view, android.view.KeyEvent(android.view.KeyEvent.ACTION_DOWN, android.view.KeyEvent.KEYCODE_ESCAPE)) != null }
        rule.waitForIdle()
        assertTrue("consumed", handled)
        assertFalse(state!!.isVisible)
        assertFalse("with nothing open, a dialog would hear it", TanreiTooltipWindows.dismissOnEscape(view.rootView))
    }

    // ── TIP-5: no time limit ─────────────────────────────────────────────────

    @Test
    fun `TIP-5 while hovered it stays open with no time limit`() {
        showTooltip()
        rule.onNodeWithTag(ANCHOR).performMouseInput { moveTo(center) }
        rule.mainClock.advanceTimeBy(tokens.motionShowDelay + 50L)
        rule.mainClock.advanceTimeBy(60_000)
        rule.waitForIdle()
        assertTrue(state!!.isVisible)
    }

    @Test
    @KeyboardNavigation
    fun `TIP-5 while focused it stays open with no time limit`() {
        showTooltip()
        rule.onNodeWithTag(ANCHOR).requestFocus()
        rule.mainClock.advanceTimeBy(60_000)
        rule.waitForIdle()
        assertTrue(state!!.isVisible)
    }

    // ── TIP-6: activation ────────────────────────────────────────────────────

    @Test
    fun `TIP-6 a click on the anchor closes it, and it does not reopen from the same hover`() {
        showTooltip()
        rule.onNodeWithTag(ANCHOR).performMouseInput { moveTo(center) }
        rule.mainClock.advanceTimeBy(tokens.motionShowDelay + 50L)
        rule.waitForIdle()
        assertTrue(state!!.isVisible)
        rule.onNodeWithTag(ANCHOR).performMouseInput { click(center) }
        rule.waitForIdle()
        assertFalse(state!!.isVisible)
        assertTrue("the anchor was activated", "click:$ANCHOR" in events)
        rule.mainClock.advanceTimeBy(tokens.motionShowDelay * 4L)
        rule.waitForIdle()
        assertFalse("not from the same hover", state!!.isVisible)
        rule.onNodeWithTag(ANCHOR).performMouseInput { moveTo(Offset(-100f, -100f)) }
        rule.onNodeWithTag(ANCHOR).performMouseInput { moveTo(center) }
        rule.mainClock.advanceTimeBy(tokens.motionShowDelay + 50L)
        rule.waitForIdle()
        assertTrue("entered again", state!!.isVisible)
    }

    @Test
    @KeyboardNavigation
    fun `TIP-6 Enter and Space on the anchor close it`() {
        showTooltip()
        rule.onNodeWithTag(ANCHOR).requestFocus()
        rule.waitForIdle()
        assertTrue(state!!.isVisible)
        rule.onNodeWithTag(ANCHOR).performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertFalse(state!!.isVisible)
        assertTrue("click:$ANCHOR" in events)
    }

    // ── TIP-7: toggle and the product's own open ─────────────────────────────

    @Test
    fun `TIP-7 opening and closing by itself emits toggle, and the product's show and dismiss emit nothing`() {
        showTooltip()
        rule.runOnUiThread { state!!.show() }
        rule.waitForIdle()
        assertEquals(1, popups())
        assertEquals("show emits nothing", emptyList<String>(), events)
        rule.runOnUiThread { state!!.dismiss() }
        rule.waitForIdle()
        assertEquals(0, popups())
        assertEquals("dismiss emits nothing", emptyList<String>(), events)
        rule.onNodeWithTag(ANCHOR).performMouseInput { moveTo(center) }
        rule.mainClock.advanceTimeBy(tokens.motionShowDelay + 50L)
        rule.waitForIdle()
        assertEquals("then it keeps following the pointer", listOf("toggle:$ANCHOR:true"), events)
    }

    // ── TIP-8: one at a time ─────────────────────────────────────────────────

    @Test
    fun `TIP-8 a tooltip opening closes the open one at once, and opens without the show-delay`() {
        show {
            Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = androidx.compose.foundation.layout.Arrangement.Center) {
                Tooltip(text = "First", tag = "a", label = "A")
                Spacer(Modifier.height(24.dp))
                Tooltip(text = "Second", tag = "b", label = "B")
            }
        }
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag("a").performMouseInput { moveTo(center) }
        advance(tokens.motionShowDelay + 50L)
        assertEquals(listOf("toggle:a:true"), events)
        rule.onNodeWithTag("a").performMouseInput { moveTo(Offset(-200f, -200f)) }
        rule.onNodeWithTag("b").performMouseInput { moveTo(center) }
        advance(32)
        assertEquals("the first closed, the second at once", listOf("toggle:a:true", "toggle:a:false", "toggle:b:true"), events)
        rule.mainClock.autoAdvance = true
    }

    // ── TIP-9: placement ─────────────────────────────────────────────────────

    private val window = IntSize(1000, 1000)
    private val anchor = IntRect(left = 450, top = 450, right = 550, bottom = 550)
    private val box = IntSize(200, 60)

    private fun at(placement: TanreiTooltipPlacement, anchor: IntRect = this.anchor, direction: LayoutDirection = LayoutDirection.Ltr, container: IntSize = box) =
        tanreiTooltipPosition(placement, anchor, window, direction, container, offset = OFFSET, margin = MARGIN)

    @Test
    fun `TIP-9 each side puts the container offset away from the anchor, centred on it - start and end follow the layout direction`() {
        assertEquals(IntOffset(400, 450 - OFFSET - 60), at(TanreiTooltipPlacement.Top))
        assertEquals(IntOffset(400, 550 + OFFSET), at(TanreiTooltipPlacement.Bottom))
        assertEquals(IntOffset(450 - OFFSET - 200, 470), at(TanreiTooltipPlacement.Start))
        assertEquals(IntOffset(550 + OFFSET, 470), at(TanreiTooltipPlacement.End))
        assertEquals("start is the right side right-to-left", IntOffset(550 + OFFSET, 470), at(TanreiTooltipPlacement.Start, direction = LayoutDirection.Rtl))
        assertEquals(IntOffset(450 - OFFSET - 200, 470), at(TanreiTooltipPlacement.End, direction = LayoutDirection.Rtl))
    }

    @Test
    fun `TIP-9 without room it flips, with room on neither side it takes the one with more, and it shifts to stay inside the margin`() {
        val high = IntRect(left = 450, top = 20, right = 550, bottom = 80)
        assertEquals("flipped below", 80 + OFFSET, at(TanreiTooltipPlacement.Top, high).y)
        val tall = IntSize(200, 600)
        val low = IntRect(left = 450, top = 600, right = 550, bottom = 650)
        val roomier = at(TanreiTooltipPlacement.Bottom, low, container = tall)
        assertTrue("more room above: it goes there, kept inside the margin", roomier.y == MARGIN && roomier.y + tall.height < low.bottom)
        val edge = IntRect(left = 0, top = 450, right = 40, bottom = 490)
        assertEquals("shifted inside the margin", MARGIN, at(TanreiTooltipPlacement.Top, edge).x)
        val right = IntRect(left = 960, top = 450, right = 1000, bottom = 490)
        assertEquals(window.width - MARGIN - 200, at(TanreiTooltipPlacement.Bottom, right).x)
        val middle = IntRect(left = 450, top = 480, right = 550, bottom = 520)
        assertEquals("taller than either side's room: kept inside the window, over the anchor", MARGIN, at(TanreiTooltipPlacement.Top, middle, container = IntSize(200, 900)).y)
    }

    @Test
    fun `TIP-9 it closes when the anchor is scrolled out of the window or removed`() {
        var present by mutableStateOf(true)
        val scroll = androidx.compose.foundation.ScrollState(0)
        show {
            Column(Modifier.fillMaxSize().verticalScroll(scroll)) {
                Spacer(Modifier.height(200.dp))
                if (present) Tooltip(text = TEXT, tag = ANCHOR, label = "Delete")
                Spacer(Modifier.height(2000.dp))
            }
        }
        rule.runOnUiThread { state!!.show() }
        rule.waitForIdle()
        assertTrue(state!!.isVisible)
        rule.runOnUiThread { kotlinx.coroutines.runBlocking { scroll.scrollTo(1500) } }
        rule.waitForIdle()
        assertFalse("scrolled out", state!!.isVisible)
        assertEquals(listOf("toggle:$ANCHOR:false"), events)
        rule.runOnUiThread { kotlinx.coroutines.runBlocking { scroll.scrollTo(0) } }
        rule.runOnUiThread { state!!.show() }
        rule.waitForIdle()
        val shown = state!!
        present = false
        rule.waitForIdle()
        assertFalse("removed", shown.isVisible)
    }

    // ── TIP-10 / TIP-11 / TIP-12: what it draws ──────────────────────────────

    private fun showInPlace(text: String = TEXT, variant: TanreiTooltipVariant = TanreiTooltipVariant.Plain, title: String = "", system: TanreiSystem = tanrei, direction: LayoutDirection = LayoutDirection.Ltr, fontScale: Float = 1f) =
        show(system, direction, fontScale) {
            Box(Modifier.testTag(STAGE_TAG + "-in-place").size(STAGE_WIDTH, STAGE_HEIGHT)) {
                TanreiTooltipInPlace(text = text, variant = variant, title = title, anchor = { Box(Modifier.size(48.dp)) }, modifier = Modifier.size(STAGE_WIDTH, STAGE_HEIGHT))
            }
        }

    private fun textBounds(text: String) = rule.onNode(hasText(text), useUnmergedTree = true).getUnclippedBoundsInRoot()

    @Test
    fun `TIP-10 a plain tooltip is its text on the plain container, padded, at least min-height tall and at most max-width wide, wrapping`() {
        val plain = tokens.plainContainerColor.resolve(colors)
        showInPlace()
        val text = textBounds(TEXT)
        val middle = (text.top + text.bottom) / 2
        assertPixel("the plain container before the text", pixelAt(text.left - tokens.plainContainerPaddingInline / 2, middle), plain)
        assertPixel("padding-inline wide", pixelAt(text.left - tokens.plainContainerPaddingInline - 1.dp, middle), surface)
        val tall = 60.dp
        showInPlace(system = tanrei.copy(tooltip = tokens.copy(plainContainerMinHeight = tall)))
        val short = textBounds(TEXT)
        val center = (short.top + short.bottom) / 2
        assertPixel("min-height: the container reaches up", pixelAt(short.left, center - tall / 2 + 2.dp), plain)
        assertPixel("and no further", pixelAt(short.left, center - tall / 2 - 2.dp), surface)
        showInPlace(text = LONG)
        val long = textBounds(LONG)
        assertTrue("wraps within max-width", long.right - long.left <= tokens.plainContainerMaxWidth - tokens.plainContainerPaddingInline * 2)
        assertTrue("onto further lines", long.bottom - long.top > tokens.plainContainerMinHeight)
        showInPlace(title = "Ignored")
        assertEquals("a plain tooltip ignores its title", 0, rule.onAllNodes(hasText("Ignored"), useUnmergedTree = true).fetchSemanticsNodes().size)
    }

    @Test
    fun `TIP-11 a rich tooltip draws its title above its text, gap apart, on the rich container at its elevation - untitled, the text alone`() {
        showInPlace(variant = TanreiTooltipVariant.Rich, title = "Storage", text = RICH)
        val title = textBounds("Storage")
        val text = textBounds(RICH)
        assertEquals((title.bottom + tokens.richContainerGap).value, text.top.value, 0.6f)
        assertEquals("start-aligned with it", title.left, text.left)
        assertPixel("the rich container", pixelAt(title.left - tokens.richContainerPaddingInline / 2, title.top), tokens.richContainerColor.resolve(colors))
        assertTrue("at most max-width wide", text.right - text.left <= tokens.richContainerMaxWidth - tokens.richContainerPaddingInline * 2)
        showInPlace(variant = TanreiTooltipVariant.Rich, text = RICH)
        assertEquals(0, rule.onAllNodes(hasText("Storage"), useUnmergedTree = true).fetchSemanticsNodes().size)
    }

    @Test
    fun `TIP-12 the corners ease by corner smoothing, larger text grows it, and its text starts at the layout direction's start`() {
        val system = tanrei.copy(tooltip = tokens.copy(plainContainerShape = 12.dp, plainContainerMinHeight = 40.dp))
        for (smoothing in listOf(0f, 0.6f)) {
            showInPlace(system = system.copy(shape = tanrei.shape.copy(cornerSmoothing = smoothing)))
            val text = textBounds(TEXT)
            val left = text.left - tokens.plainContainerPaddingInline
            val top = (text.top + text.bottom) / 2 - 20.dp
            assertPixel("smoothing $smoothing: the very corner is outside", pixelAt(left + 0.5.dp, top + 0.5.dp), surface)
            assertPixel("smoothing $smoothing: inside", pixelAt(left + 12.dp, top + 12.dp), tokens.plainContainerColor.resolve(colors))
        }
        showInPlace(text = LONG)
        val normal = textBounds(LONG).let { it.bottom - it.top }
        showInPlace(text = LONG, fontScale = 1.5f)
        assertTrue("grows with larger text", textBounds(LONG).let { it.bottom - it.top } > normal)
        showInPlace(variant = TanreiTooltipVariant.Rich, title = "Storage", text = RICH, direction = LayoutDirection.Rtl)
        val title = textBounds("Storage")
        val text = textBounds(RICH)
        assertTrue("right-to-left: the short title starts at the right, as the text does", abs((title.right - text.right).value) < 1f && title.left > text.left)
    }

    // ── TIP-13: never in the way ─────────────────────────────────────────────

    @Test
    fun `TIP-13 it takes no focus, holds nothing focusable, makes nothing inert, and a press on it closes it without reaching under it`() {
        showTooltip()
        rule.onNodeWithTag(AFTER).requestFocus()
        rule.runOnUiThread { state!!.show() }
        rule.waitForIdle()
        rule.onNodeWithTag(AFTER).assertIsFocused()
        assertEquals("nothing focusable in the popup", 0, rule.onAllNodes(isFocusable() and androidx.compose.ui.test.hasAnyAncestor(isPopup())).fetchSemanticsNodes().size)
        rule.onNodeWithTag(BEFORE).requestFocus().assertIsFocused()
        rule.onNode(isPopup()).performTouchInput { down(center); up() }
        rule.waitForIdle()
        assertFalse(state!!.isVisible)
        assertFalse("nothing under it heard the press", "click:$ANCHOR" in events)
    }

    // ── TIP-14: the description ──────────────────────────────────────────────

    @Test
    fun `TIP-14 the text is the anchor's description after its own name and role, open or not, and the drawn tooltip is not read again`() {
        showTooltip()
        val node = rule.onNodeWithTag(ANCHOR).fetchSemanticsNode().config
        assertEquals(listOf("Delete"), node[SemanticsProperties.ContentDescription])
        assertEquals(Role.Button, node[SemanticsProperties.Role])
        assertEquals(TEXT, node[SemanticsProperties.StateDescription])
        rule.runOnUiThread { state!!.show() }
        rule.waitForIdle()
        assertEquals(0, rule.onAllNodes(hasText(TEXT)).fetchSemanticsNodes().size)
        showTooltip(variant = TanreiTooltipVariant.Rich, title = "Storage", text = RICH)
        assertEquals("the title first", "Storage, $RICH", rule.onNodeWithTag(ANCHOR).fetchSemanticsNode().config[SemanticsProperties.StateDescription])
    }

    @Test
    fun `TIP-14 while describes is false it adds nothing to the anchor`() {
        showTooltip(describes = false)
        rule.onNodeWithTag(ANCHOR).assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.StateDescription))
        rule.onNodeWithTag(ANCHOR).assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf("Delete")))
    }

    // ── TIP-15: the fade ─────────────────────────────────────────────────────

    @Test
    fun `TIP-15 it fades in over enter-duration and out over exit-duration`() {
        val system = tanrei.copy(tooltip = tokens.copy(motionEnterDuration = 400, motionEnterEasing = tanrei.motion.easing.linear, motionExitDuration = 200, motionExitEasing = tanrei.motion.easing.linear))
        var open by mutableStateOf(false)
        var shown: androidx.compose.runtime.State<Float>? = null
        show(system) {
            val transition = androidx.compose.runtime.remember { androidx.compose.animation.core.MutableTransitionState(false) }
            transition.targetState = open
            shown = rememberTanreiTooltipShown(transition, TanreiTheme.tokens.tooltip)
        }
        rule.mainClock.autoAdvance = false
        open = true
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(200)
        assertEquals("half way in", 0.5f, shown!!.value, 0.1f)
        rule.mainClock.advanceTimeBy(300)
        assertEquals(1f, shown!!.value, 0.001f)
        open = false
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(100)
        assertEquals("half way out, over the shorter exit", 0.5f, shown!!.value, 0.12f)
        rule.mainClock.advanceTimeBy(200)
        assertEquals(0f, shown!!.value, 0.001f)
        rule.mainClock.autoAdvance = true
    }

    // ── TIP-16: no text ──────────────────────────────────────────────────────

    @Test
    fun `TIP-16 an empty text never opens and describes nothing, and a debuggable app reports it - as it reports a plain tooltip's title`() = collectingReports { reports ->
        setDebuggable(true)
        showTooltip(text = "")
        rule.onNodeWithTag(ANCHOR).performMouseInput { moveTo(center) }
        rule.mainClock.advanceTimeBy(tokens.motionShowDelay * 2L)
        rule.waitForIdle()
        assertEquals(0, popups())
        rule.onNodeWithTag(ANCHOR).assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.StateDescription))
        assertTrue(reports.toString(), reports.any { "TanreiTooltip" in it && "text" in it })
        showTooltip(title = "Ignored")
        assertTrue(reports.toString(), reports.any { "Ignored" in it && "plain" in it })
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    /** The popup's window: the newest root view. */
    private fun popupWindow(): android.view.View = rootsOf().last()

    /** Every window's root view, oldest first (the popup is the newest). */
    private fun rootsOf(): List<android.view.View> {
        val global = Class.forName("android.view.WindowManagerGlobal").getMethod("getInstance").invoke(null)
        @Suppress("UNCHECKED_CAST")
        val views = global.javaClass.getDeclaredField("mViews").apply { isAccessible = true }.get(global) as List<android.view.View>
        return views.toList()
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

    /** A pixel of the stage at ([x], [y]) in root coordinates. */
    private fun pixelAt(x: Dp, y: Dp): Color {
        val map = rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap()
        val stage = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
        return with(rule.density) { map[(x - stage.left).roundToPx(), (y - stage.top).roundToPx()] }
    }

    private fun isClose(actual: Color, expected: Color, tolerance: Float = PIXEL_TOLERANCE): Boolean =
        maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue)) <= tolerance

    private fun assertPixel(what: String, actual: Color, expected: Color) =
        assertTrue("$what: expected $expected but was $actual", isClose(actual, expected))

    private companion object {
        const val STAGE_TAG = "stage"
        const val ANCHOR = "anchor"
        const val BEFORE = "before"
        const val AFTER = "after"
        const val TEXT = "Move to trash"
        const val LONG = "Move the selected files to the trash. They are deleted after 30 days."
        const val RICH = "Files in the trash still count toward your storage until they are deleted."
        const val PIXEL_TOLERANCE = 2f / 255f
        const val OFFSET = 8
        const val MARGIN = 16
        val STAGE_WIDTH = 320.dp
        val STAGE_HEIGHT = 200.dp
    }
}

/** TIP-15 where motion is reduced: Android's setting removes every animation, so it appears and disappears at once. */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiTooltipReducedMotionTest {
    private object NoMotion : MotionDurationScale {
        override val scaleFactor: Float = 0f
    }

    @get:Rule
    val rule = createComposeRule(effectContext = NoMotion)

    private var open by mutableStateOf(false)

    @Test
    fun `TIP-15 where motion is reduced it appears and disappears at once`() {
        val tanrei = TanreiSystem.Tanrei
        var shown: androidx.compose.runtime.State<Float>? = null
        rule.setContent {
            TanreiTheme(system = tanrei.copy(tooltip = tanrei.tooltip.copy(motionEnterDuration = 400, motionExitDuration = 400)), theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                val transition = androidx.compose.runtime.remember { androidx.compose.animation.core.MutableTransitionState(false) }
                transition.targetState = open
                shown = rememberTanreiTooltipShown(transition, TanreiTheme.tokens.tooltip)
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
