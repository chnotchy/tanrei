package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
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
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertHeightIsEqualTo
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.assertWidthIsEqualTo
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onChildren
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performMouseInput
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.test.swipeLeft
import androidx.compose.ui.test.withKeyDown
import androidx.compose.ui.text.AnnotatedString
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
import io.github.chnotchy.tanrei.primitives.TanreiText
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiIconGlyph
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.glyph
import io.github.chnotchy.tanrei.tokens.Cupertino
import io.github.chnotchy.tanrei.tokens.M3Like
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiFocusStyle
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiPressedFeedback
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import io.github.chnotchy.tanrei.tokens.TanreiTabsVariant
import io.github.chnotchy.tanrei.tokens.TanreiTabsVariantStateTokens
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
 * Behaviour tests for `specs/tabs.spec.json`. Each test names the behaviour id (`TAB-n`) it covers. Runs on the JVM
 * (Robolectric, native graphics) — no emulator needed. The row is drawn on the surface, [ROW_WIDTH] wide unless a test
 * says otherwise, with a focusable box before it and one after it (the panel) where the keyboard is tested.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiTabsTest {
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
    private val tokens = tanrei.tabs
    private val primary = tokens.variants.primary
    private val measure = tanrei.measure
    private val surface = colors[TanreiColorRole.Surface]

    private val events = mutableListOf<String>()
    private var selected by mutableStateOf<String?>("overview")

    /** Whether the caller moves `selectedValue` when it hears a change (a caller that ignores it keeps the old tab). */
    private var follow = true
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
            val current = scene ?: return@setContent
            key(current) {
                val density = LocalDensity.current
                CompositionLocalProvider(LocalLayoutDirection provides current.direction, LocalDensity provides Density(density.density, current.fontScale)) {
                    TanreiTheme(system = current.system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                        Box(Modifier.testTag(STAGE_TAG).background(TanreiColorRole.Surface.color)) { current.content() }
                    }
                }
            }
        }
        rule.waitForIdle()
    }

    /**
     * A row of [labels] (values: the labels in lower case) between a focusable box before it and one after it (the
     * panel), [width] wide. [icons] gives every tab a [Swatch]; [disabled] and [hidden] name tabs by index.
     */
    private fun showTabs(
        system: TanreiSystem = tanrei,
        variant: TanreiTabsVariant = TanreiTabsVariant.Primary,
        scrollable: Boolean = false,
        labels: List<String> = THREE,
        values: List<String> = labels.map { it.lowercase() },
        icons: Boolean = false,
        disabled: Set<Int> = emptySet(),
        hidden: Boolean = false,
        width: Dp = ROW_WIDTH,
        direction: LayoutDirection = LayoutDirection.Ltr,
        fontScale: Float = 1f,
        label: String = "Project",
    ) = show(system, direction, fontScale) {
        Column {
            Box(Modifier.testTag(BEFORE).size(8.dp).focusable())
            Box(Modifier.width(width)) {
                TanreiTabs(
                    selectedValue = selected,
                    onSelectedValueChange = {
                        events += "change:$it"
                        if (follow) selected = it
                    },
                    modifier = Modifier.testTag(ROW),
                    variant = variant,
                    scrollable = scrollable,
                    contentDescription = label,
                ) {
                    labels.forEachIndexed { i, text ->
                        TanreiTab(
                            value = values[i],
                            label = text,
                            modifier = Modifier.testTag(tag(i)),
                            labelHidden = hidden,
                            enabled = i !in disabled,
                            icon = if (icons) { { Swatch(text) } } else null,
                        )
                    }
                }
            }
            Box(Modifier.testTag(AFTER).size(8.dp).focusable())
        }
    }

    /** An icon that records the color, glyph and bounds its slot gives it, and fills its box with the color. */
    @Composable
    private fun Swatch(key: String) {
        seenColors[key] = LocalTanreiContentColor.current
        seenGlyphs[key] = LocalTanreiIconGlyph.current
        Box(Modifier.fillMaxSize().onGloballyPositioned { iconBounds[key] = it.boundsInRoot() }.background(LocalTanreiContentColor.current))
    }

    private fun tag(index: Int) = "tab-$index"

    private fun tab(index: Int) = rule.onNodeWithTag(tag(index))

    // ── TAB-1: activation ────────────────────────────────────────────────────

    @Test
    fun `TAB-1 activating a tab that is not selected emits change once with its value, and the selected tab emits nothing`() {
        showTabs()
        tab(1).performClick()
        rule.waitForIdle()
        assertEquals(listOf("change:activity"), events)
        tab(1).assertIsSelected()
        tab(0).assertIsNotSelected()
        tab(1).performClick()
        rule.waitForIdle()
        assertEquals("the selected tab emits nothing", listOf("change:activity"), events)
    }

    @Test
    @KeyboardNavigation
    fun `TAB-1 Enter and Space select the focused tab when it is not the selected one`() {
        follow = false
        showTabs()
        tab(0).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        tab(1).assertIsFocused()
        tab(0).assertIsSelected()
        tab(1).performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        tab(1).performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        assertEquals(listOf("change:activity", "change:activity", "change:activity"), events)
    }

    // ── TAB-2: disabled ──────────────────────────────────────────────────────

    @Test
    fun `TAB-2 a disabled tab is not selected by a press, emits nothing and is announced disabled`() {
        showTabs(disabled = setOf(2))
        tab(2).assertIsNotEnabled()
        tab(2).performTouchInput { down(center); up() }
        rule.waitForIdle()
        assertEquals(emptyList<String>(), events)
        tab(0).assertIsSelected()
    }

    @Test
    @KeyboardNavigation
    fun `TAB-2 the arrow keys, Home and End skip a disabled tab, and a disabled tab is never the Tab stop`() {
        showTabs(labels = FOUR, disabled = setOf(1, 3))
        tab(0).requestFocus().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        tab(2).assertIsFocused().performKeyInput { pressKey(Key.MoveEnd) }
        rule.waitForIdle()
        tab(2).assertIsFocused().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        tab(0).assertIsFocused()
        assertEquals(listOf("change:settings", "change:overview"), events)
        // The selected tab is disabled: Tab enters at the first enabled tab instead.
        selected = "activity"
        rule.waitForIdle()
        rule.onNodeWithTag(BEFORE).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        tab(0).assertIsFocused()
    }

    // ── TAB-3: the state's tokens ────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `TAB-3 under acme hovered, focused and pressed each draw their own container token, pressed over focused over hovered`() {
        val acme = TanreiSystem.Acme
        val acmeColors = acme.colors.light
        val look = acme.tabs.variants.primary
        val acmeSurface = acmeColors[TanreiColorRole.Surface]
        fun over(paint: TanreiPaint) = paint.resolve(acmeColors).compositeOver(acmeSurface)
        assertEquals(4, listOf(look.enabled, look.hovered, look.focused, look.pressed).map { over(it.containerColor) }.toSet().size)
        showTabs(system = acme)
        tab(1).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertPixel("hovered", tabPixel(1, CLEAR, CLEAR), over(look.hovered.containerColor))
        selected = "activity"
        rule.waitForIdle()
        tab(1).requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertPixel("focused over hovered", tabPixel(1, CLEAR, CLEAR), over(look.focused.selectedContainerColor))
        tab(1).performKeyInput { keyDown(Key.Enter) }
        rule.waitForIdle()
        assertPixel("pressed over focused", tabPixel(1, CLEAR, CLEAR), over(look.pressed.selectedContainerColor))
        tab(1).performKeyInput { keyUp(Key.Enter) }
    }

    @Test
    fun `TAB-3 focus gained by touch does not draw the focused state`() {
        val acme = TanreiSystem.Acme
        val acmeColors = acme.colors.light
        showTabs(system = acme)
        tab(0).requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertPixel("at rest", tabPixel(0, CLEAR, CLEAR), acme.tabs.variants.primary.enabled.selectedContainerColor.resolve(acmeColors).compositeOver(acmeColors[TanreiColorRole.Surface]))
    }

    // ── TAB-4: the focus ring ────────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `TAB-4 keyboard focus shows the ring inside the tab on the first frame`() {
        showTabs()
        rule.mainClock.autoAdvance = false
        tab(0).requestFocus()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("the ring inside the top edge", tabPixel(0, tabWidth(0) / 2, RING_PROBE), colors[TanreiColorRole.FocusRing])
        assertPixel("the ring inside the start edge", tabPixel(0, RING_PROBE, tabHeight(0) / 2), colors[TanreiColorRole.FocusRing])
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `TAB-4 focus gained by touch shows no ring`() {
        showTabs()
        tab(0).requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertPixel("no ring", tabPixel(0, tabWidth(0) / 2, RING_PROBE), surface)
    }

    // ── TAB-5: the minimum target ────────────────────────────────────────────

    @Test
    fun `TAB-5 a tab is at least the touch target wide and tall`() {
        showTabs(scrollable = true, labels = listOf("A", "B"))
        tab(0).assertWidthIsEqualTo(measure.targetTouch)
        showTabs(system = tanrei.copy(tabs = tokens.copy(containerHeight = 24.dp)))
        tab(0).assertHeightIsEqualTo(measure.targetTouch)
    }

    // ── TAB-6: disabled tokens ───────────────────────────────────────────────

    @Test
    fun `TAB-6 a disabled tab draws the disabled tokens of its variant - and of its selected parts when selected`() {
        val system = tanrei.withTabs(TanreiTabsVariant.Primary, TanreiInteractionState.Disabled) {
            it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error), iconColor = TanreiPaint.Role(TanreiColorRole.Warning), selectedIconColor = TanreiPaint.Role(TanreiColorRole.Success))
        }
        showTabs(system = system, icons = true, disabled = setOf(2))
        assertPixel("the disabled container token", tabPixel(2, CLEAR, CLEAR), colors[TanreiColorRole.Error])
        assertEquals(colors[TanreiColorRole.Warning], seenColors["Settings"])
        selected = "settings"
        rule.waitForIdle()
        assertEquals("the selected parts' disabled token", colors[TanreiColorRole.Success], seenColors["Settings"])
        val disabled = primary.disabled
        assertEquals("by default no fill", TanreiPaint.None, disabled.containerColor)
        assertNotEquals("a disabled selected tab keeps an indicator", TanreiPaint.None, disabled.selectedActiveIndicatorColor)
        assertEquals("a disabled tab that is not selected has none", TanreiPaint.None, disabled.activeIndicatorColor)
    }

    // ── TAB-7: an unknown variant ────────────────────────────────────────────

    @Test
    fun `TAB-7 a variant the system does not have draws with primary's tokens, and a debuggable app reports it`() = collectingReports { reports ->
        showTabs()
        val expected = stage()
        setDebuggable(true)
        showTabs(variant = TanreiTabsVariant("ghost"))
        assertSameAs(expected, stage(), "an unknown variant")
        assertTrue(reports.toString(), reports.any { "ghost" in it && "TanreiTabs" in it })
    }

    // ── TAB-8 / TAB-9: the press ─────────────────────────────────────────────

    @Test
    fun `TAB-8 a tap that ends at once shows the pressed state on the next frame and keeps it for press-hold`() {
        showTabs()
        val hold = tanrei.motion.duration.pressHold.toLong()
        // The tap selects the tab: its selected look's pressed color.
        val pressed = primary.pressed.selectedContainerColor.resolve(colors).compositeOver(surface)
        rule.mainClock.autoAdvance = false
        tab(1).performTouchInput { down(center); up() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("pressed", tabPixel(1, CLEAR, CLEAR), pressed)
        rule.mainClock.advanceTimeBy(hold / 2)
        assertPixel("still pressed", tabPixel(1, CLEAR, CLEAR), pressed)
        rule.mainClock.advanceTimeBy(hold + tokens.motionStateDuration * 2L)
        assertPixel("at rest", tabPixel(1, CLEAR, CLEAR), primary.enabled.selectedContainerColor.resolve(colors).compositeOver(surface))
        rule.mainClock.autoAdvance = true
    }

    private fun TanreiSystem.answering(feedback: TanreiPressedFeedback) = copy(behavior = behavior.copy(pressedFeedback = feedback))

    @Test
    fun `TAB-9 ripple grows the pressed color of the tab's look from the point of contact`() {
        assertEquals(TanreiPressedFeedback.Ripple, TanreiSystem.M3Like.behavior.pressedFeedback)
        showTabs(system = tanrei.answering(TanreiPressedFeedback.Ripple))
        val pressed = primary.pressed.containerColor.resolve(colors).compositeOver(surface)
        rule.mainClock.autoAdvance = false
        tab(1).performTouchInput { down(Offset(8.dp.toPx(), 8.dp.toPx())) }
        rule.mainClock.advanceTimeBy(50)
        assertPixel("at the point of contact", tabPixel(1, 8.dp, 8.dp), pressed)
        assertPixel("not yet at the far corner", tabPixel(1, tabWidth(1) - 4.dp, tabHeight(1) - 8.dp), surface)
        rule.mainClock.advanceTimeBy(tokens.motionFeedbackDuration.toLong())
        assertPixel("the far corner once grown", tabPixel(1, tabWidth(1) - 4.dp, tabHeight(1) - 8.dp), pressed)
        tab(1).performTouchInput { up() }
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `TAB-9 dim - cupertino's answer - dims the pressed tab and draws no state layer, and none draws nothing`() {
        val cupertino = TanreiSystem.Cupertino
        assertEquals(TanreiPressedFeedback.Dim, cupertino.behavior.pressedFeedback)
        assertTrue(cupertino.tabs.pressed.opacity < 1f)
        showTabs(system = cupertino)
        val cupertinoSurface = cupertino.colors.light[TanreiColorRole.Surface]
        val before = tab(1).captureToImage().toPixelMap()
        tab(1).performTouchInput { down(center) }
        rule.waitForIdle()
        assertPixel("no state layer", tabPixel(1, CLEAR, CLEAR), cupertinoSurface)
        val after = tab(1).captureToImage().toPixelMap()
        assertTrue("the label is dimmed", differing(before, after) > 0)
        tab(1).performTouchInput { up() }
        showTabs(system = tanrei.answering(TanreiPressedFeedback.None))
        tab(1).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val hovered = stage()
        tab(1).performMouseInput { press() }
        rule.waitForIdle()
        assertSameAs(hovered, stage(), "pressed under none")
        tab(1).performMouseInput { release() }
    }

    // ── TAB-10: corners and focus style ──────────────────────────────────────

    @Test
    fun `TAB-10 the tab's corners are its container-shape eased by corner smoothing - a quarter circle at 0`() {
        val radius = 12.dp
        val system = tanrei.withTabs(TanreiTabsVariant.Primary, TanreiInteractionState.Enabled) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.OnSurface)) }
        for (smoothing in listOf(0f, 0.6f)) {
            showTabs(system = system.copy(tabs = system.tabs.copy(containerShape = radius), shape = tanrei.shape.copy(cornerSmoothing = smoothing)))
            assertPixel("smoothing $smoothing: the very corner is outside", tabPixel(1, 0.5.dp, 0.5.dp), surface)
            assertPixel("smoothing $smoothing: inside", tabPixel(1, radius, radius), colors[TanreiColorRole.OnSurface])
        }
        assertEquals(0.6f, TanreiSystem.Cupertino.shape.cornerSmoothing)
    }

    @Test
    @KeyboardNavigation
    fun `TAB-10 glow draws the focus colors as a halo inside the tab under acme`() {
        val acme = TanreiSystem.Acme
        assertEquals(TanreiFocusStyle.Glow, acme.behavior.focusStyle)
        showTabs(system = acme)
        tab(0).requestFocus().assertIsFocused()
        rule.waitForIdle()
        val acmeColors = acme.colors.light
        val focused = acme.tabs.variants.primary.focused.selectedContainerColor.resolve(acmeColors).compositeOver(acmeColors[TanreiColorRole.Surface])
        val edge = tabPixel(0, tabWidth(0) / 2, RING_PROBE)
        assertFalse("the halo inside the tab: $edge", isClose(edge, focused))
    }

    // ── TAB-11: which tab is selected ────────────────────────────────────────

    @Test
    fun `TAB-11 the selected tab draws the selected parts of its variant, every other tab the variant's own`() {
        showTabs(icons = true)
        assertEquals(primary.enabled.selectedIconColor.resolve(colors), seenColors["Overview"])
        assertEquals(primary.enabled.iconColor.resolve(colors), seenColors["Activity"])
        assertNotEquals(seenColors["Overview"], seenColors["Activity"])
        tab(0).assertIsSelected()
        tab(1).assertIsNotSelected()
        assertPixel("the indicator under the selected tab", indicatorPixel(0), primary.enabled.selectedActiveIndicatorColor.resolve(colors))
        assertPixel("none under another", indicatorPixel(1), tokens.dividerColor.resolve(colors).compositeOver(surface))
    }

    @Test
    fun `TAB-11 while selected is null the first enabled tab is selected`() {
        selected = null
        showTabs(disabled = setOf(0))
        tab(1).assertIsSelected()
        tab(0).assertIsNotSelected()
        assertPixel("its indicator", indicatorPixel(1), primary.enabled.selectedActiveIndicatorColor.resolve(colors))
    }

    @Test
    fun `TAB-11 a selected value naming no tab selects none, and a debuggable app reports it`() = collectingReports { reports ->
        setDebuggable(true)
        selected = "ghost"
        showTabs()
        rule.waitForIdle()
        (0..2).forEach { tab(it).assertIsNotSelected() }
        assertPixel("no indicator", indicatorPixel(0), tokens.dividerColor.resolve(colors).compositeOver(surface))
        assertTrue(reports.toString(), reports.any { "\"ghost\"" in it && "none" in it })
    }

    @Test
    fun `TAB-11 an empty or repeated value still renders - the first tab with the value is the one it selects - and is reported`() = collectingReports { reports ->
        setDebuggable(true)
        selected = "twice"
        showTabs(values = listOf("twice", "twice", ""))
        rule.waitForIdle()
        tab(0).assertIsSelected()
        tab(1).assertIsNotSelected()
        tab(2).assertExists()
        assertTrue(reports.toString(), reports.any { "\"twice\"" in it && "more than one" in it })
        assertTrue(reports.toString(), reports.any { "Settings" in it && "empty" in it })
    }

    // ── TAB-12: the keyboard ─────────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `TAB-12 the row is one Tab stop - the selected tab - and Tab moves from it into the panel`() {
        selected = "activity"
        showTabs()
        rule.onNodeWithTag(BEFORE).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        tab(1).assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(AFTER).assertIsFocused().performKeyInput { withKeyDown(Key.ShiftLeft) { pressKey(Key.Tab) } }
        rule.waitForIdle()
        tab(1).assertIsFocused()
        assertEquals("moving focus with Tab selects nothing", emptyList<String>(), events)
    }

    @Test
    @KeyboardNavigation
    fun `TAB-12 Right and Left move to the next and previous tab, wrapping, and select it - Home and End go to the ends`() {
        showTabs()
        tab(0).requestFocus().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        tab(1).assertIsFocused().assertIsSelected().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        tab(2).assertIsFocused().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        tab(0).assertIsFocused().performKeyInput { pressKey(Key.DirectionLeft) }
        rule.waitForIdle()
        tab(2).assertIsFocused().performKeyInput { pressKey(Key.MoveHome) }
        rule.waitForIdle()
        tab(0).assertIsFocused().performKeyInput { pressKey(Key.MoveEnd) }
        rule.waitForIdle()
        tab(2).assertIsFocused().assertIsSelected()
        assertEquals(listOf("change:activity", "change:settings", "change:overview", "change:settings", "change:overview", "change:settings"), events)
    }

    @Test
    @KeyboardNavigation
    fun `TAB-12 TAB-21 in a right-to-left layout Left moves to the next tab and Right to the previous`() {
        showTabs(direction = LayoutDirection.Rtl)
        tab(0).requestFocus().performKeyInput { pressKey(Key.DirectionLeft) }
        rule.waitForIdle()
        tab(1).assertIsFocused().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        tab(0).assertIsFocused()
        assertEquals(listOf("change:activity", "change:overview"), events)
    }

    // ── TAB-13: semantics ────────────────────────────────────────────────────

    @Test
    fun `TAB-13 the row is a named selectable group of tabs, each a tab with its selected state, position and name`() {
        showTabs()
        val row = rule.onNodeWithTag(ROW).fetchSemanticsNode().config
        assertEquals(listOf("Project"), row[SemanticsProperties.ContentDescription])
        assertTrue(SemanticsProperties.SelectableGroup in row)
        assertEquals(3, row[SemanticsProperties.CollectionInfo].columnCount)
        (0..2).forEach { i ->
            tab(i).assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Tab))
            assertEquals(i, tab(i).fetchSemanticsNode().config[SemanticsProperties.CollectionItemInfo].columnIndex)
        }
        tab(0).assert(SemanticsMatcher.expectValue(SemanticsProperties.Text, listOf(AnnotatedString("Overview")))).assertIsSelected()
        tab(1).assertIsNotSelected()
    }

    @Test
    fun `TAB-13 TAB-19 an icon-only tab is named by its label, which is not drawn, and the icon is hidden`() {
        show {
            TanreiTabs(selectedValue = "overview", onSelectedValueChange = {}) {
                TanreiTab(value = "overview", label = "Overview", modifier = Modifier.testTag(tag(0)), labelHidden = true, icon = { TanreiText("dashboard") })
                TanreiTab(value = "activity", label = "Activity", modifier = Modifier.testTag(tag(1)), labelHidden = true, icon = { TanreiText("history") })
            }
        }
        tab(0).assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf("Overview")))
        tab(0).assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Text))
        assertEquals(0, rule.onAllNodes(hasText("dashboard")).fetchSemanticsNodes().size)
        assertEquals(0, rule.onAllNodes(hasText("Overview"), useUnmergedTree = true).fetchSemanticsNodes().size)
    }

    // ── TAB-14: fixed and scrollable ─────────────────────────────────────────

    @Test
    fun `TAB-14 fixed tabs divide the row's width equally, and a label that does not fit wraps and grows every tab`() {
        showTabs()
        (0..2).forEach { tab(it).assertWidthIsEqualTo(ROW_WIDTH / 3) }
        tab(0).assertHeightIsEqualTo(tokens.containerHeight)
        showTabs(labels = listOf("Overview", "Everything that happened recently", "Settings"), width = 240.dp)
        val tall = tabHeight(1)
        assertTrue("the long label wraps and the tab grows: $tall", tall > tokens.containerHeight)
        assertEquals("every tab as tall", tall, tabHeight(0))
        assertEquals(tall, tabHeight(2))
    }

    @Test
    fun `TAB-14 scrollable tabs are their content plus padding-inline on each side, on one line, from the start edge, and the row scrolls`() {
        showTabs(scrollable = true, labels = SIX, width = 240.dp)
        val text = rule.onNode(hasText("Overview"), useUnmergedTree = true).getUnclippedBoundsInRoot()
        assertEquals((text.right - text.left + tokens.containerPaddingInline * 2).value, tabWidth(0).value, 1f)
        val row = rule.onNodeWithTag(ROW).getUnclippedBoundsInRoot()
        assertEquals("from the start edge", row.left, tab(0).getUnclippedBoundsInRoot().left)
        tab(0).assertHeightIsEqualTo(tokens.containerHeight)
        assertTrue("the last tab is out of view", tab(5).getUnclippedBoundsInRoot().left > row.right)
        rule.onNodeWithTag(ROW).performTouchInput { swipeLeft() }
        rule.waitForIdle()
        assertTrue("scrolled", tab(0).getUnclippedBoundsInRoot().left < row.left)
        showTabs(scrollable = true, labels = listOf("Everything that happened recently", "B"), width = 240.dp)
        tab(0).assertHeightIsEqualTo(tokens.containerHeight)
        assertTrue("one line, wider than the row", tabWidth(0) > 240.dp)
    }

    // ── TAB-15: into view ────────────────────────────────────────────────────

    @Test
    fun `TAB-15 a tab selected while partly out of view is scrolled into view over the indicator's duration`() {
        val slow = 400
        val system = tanrei.copy(tabs = tokens.copy(motionIndicatorDuration = slow, motionIndicatorEasing = tanrei.motion.easing.linear))
        showTabs(system = system, scrollable = true, labels = SIX, width = 240.dp)
        val row = rule.onNodeWithTag(ROW).getUnclippedBoundsInRoot()
        val start = tab(4).getUnclippedBoundsInRoot()
        assertTrue(start.right > row.right)
        rule.mainClock.autoAdvance = false
        selected = "storage"
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(slow / 2L)
        val half = tab(4).getUnclippedBoundsInRoot()
        assertTrue("on its way: ${half.right} between ${row.right} and ${start.right}", half.right < start.right && half.right > row.right)
        rule.mainClock.advanceTimeBy(slow.toLong())
        val end = tab(4).getUnclippedBoundsInRoot()
        assertEquals("the whole tab in view, at the end edge", row.right.value, end.right.value, 1f)
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `TAB-15 a row that first appears with its selected tab out of view scrolls it into view at once`() {
        // 1c12655: the row's first appearance is not a change — no motion, even with a slow indicator.
        selected = "storage"
        val system = tanrei.copy(tabs = tokens.copy(motionIndicatorDuration = 5000, motionIndicatorEasing = tanrei.motion.easing.linear))
        rule.mainClock.autoAdvance = false
        showTabs(system = system, scrollable = true, labels = SIX, width = 240.dp)
        repeat(3) { rule.mainClock.advanceTimeByFrame() }
        val row = rule.onNodeWithTag(ROW).getUnclippedBoundsInRoot()
        val tab = tab(4).getUnclippedBoundsInRoot()
        assertEquals("the whole selected tab in view on the first frames", row.right.value, tab.right.value, 1f)
        assertTrue(tab.left >= row.left)
        rule.mainClock.autoAdvance = true
    }

    @Test
    @KeyboardNavigation
    fun `TAB-15 a tab that receives keyboard focus is scrolled into view`() {
        showTabs(scrollable = true, labels = SIX, width = 240.dp)
        tab(0).requestFocus().performKeyInput { pressKey(Key.MoveEnd) }
        rule.waitForIdle()
        tab(5).assertIsFocused()
        val row = rule.onNodeWithTag(ROW).getUnclippedBoundsInRoot()
        val last = tab(5).getUnclippedBoundsInRoot()
        assertTrue("in view: $last in $row", last.left >= row.left && last.right <= row.right + 1.dp)
    }

    // ── TAB-16: the indicator ────────────────────────────────────────────────

    @Test
    fun `TAB-16 primary's indicator spans the tab's content, thickness thick, its top corners rounded, over the divider`() {
        val thick = 8.dp
        val round = 4.dp
        val system = tanrei.withTabs(TanreiTabsVariant.Primary, TanreiInteractionState.Enabled) { it.copy(activeIndicatorThickness = thick, activeIndicatorShape = round) }
        showTabs(system = system)
        val indicator = primary.enabled.selectedActiveIndicatorColor.resolve(colors)
        val text = rule.onNode(hasText("Overview"), useUnmergedTree = true).getUnclippedBoundsInRoot()
        val left = text.left - tab(0).getUnclippedBoundsInRoot().left
        val right = text.right - tab(0).getUnclippedBoundsInRoot().left
        val bottom = tabHeight(0)
        assertPixel("over the divider", tabPixel(0, (left + right) / 2, bottom - 0.5.dp), indicator)
        assertPixel("thickness thick", tabPixel(0, (left + right) / 2, bottom - thick + 0.5.dp), indicator)
        assertPixel("not above it", tabPixel(0, (left + right) / 2, bottom - thick - 1.dp), surface)
        assertPixel("inside the content's start", tabPixel(0, left + round, bottom - 2.dp), indicator)
        assertFalse("not beyond it", isClose(tabPixel(0, left - 2.dp, bottom - 2.dp), indicator))
        assertFalse("not beyond its end", isClose(tabPixel(0, right + 2.dp, bottom - 2.dp), indicator))
        assertFalse("the top corner is rounded", isClose(tabPixel(0, left + 0.5.dp, bottom - thick + 0.5.dp), indicator))
    }

    @Test
    fun `TAB-16 a tab's content stays clear of its indicator - a label that wraps grows the tab instead`() {
        // 1c12655: the content is inset by the variant's resting indicator thickness above and below.
        val thick = 8.dp
        val system = tanrei.withTabs(TanreiTabsVariant.Primary, TanreiInteractionState.Enabled) { it.copy(activeIndicatorThickness = thick) }
        showTabs(system = system, labels = listOf("Overview", "Everything that happened recently in this project", "Settings"), width = 240.dp)
        val tab = tab(1).getUnclippedBoundsInRoot()
        val text = rule.onNode(hasText("Everything that happened recently in this project"), useUnmergedTree = true).getUnclippedBoundsInRoot()
        assertTrue("the label wraps: ${text.bottom - text.top}", text.bottom - text.top > with(rule.density) { tokens.labelTypescale.lineHeight.toDp() } * 2)
        assertTrue("clear of the indicator: ${text.bottom} vs ${tab.bottom - thick}", text.bottom <= tab.bottom - thick + 0.5.dp)
        assertTrue("and as far from the top", text.top >= tab.top + thick - 0.5.dp)
        assertEquals("the tab grows to hold it", (text.bottom - text.top + thick * 2).value, (tab.bottom - tab.top).value, 1f)
    }

    @Test
    fun `TAB-16 secondary's indicator spans the whole tab, square, secondary's thickness`() {
        val secondary = tokens.variants.secondary.enabled
        assertEquals(0.dp, secondary.activeIndicatorShape)
        showTabs(variant = TanreiTabsVariant.Secondary)
        val indicator = secondary.selectedActiveIndicatorColor.resolve(colors)
        val bottom = tabHeight(0)
        assertPixel("at the tab's start", tabPixel(0, 0.5.dp, bottom - 0.5.dp), indicator)
        assertPixel("at the tab's end", tabPixel(0, tabWidth(0) - 0.5.dp, bottom - 0.5.dp), indicator)
        assertPixel("thickness thick", tabPixel(0, 30.dp, bottom - secondary.activeIndicatorThickness + 0.5.dp), indicator)
        assertPixel("not above it", tabPixel(0, 30.dp, bottom - secondary.activeIndicatorThickness - 0.5.dp), surface)
    }

    // ── TAB-17: the slide ────────────────────────────────────────────────────

    @Test
    fun `TAB-17 the indicator slides from the old tab to the new one over the indicator's duration and easing`() {
        val slow = 400
        val system = tanrei.copy(tabs = tokens.copy(motionIndicatorDuration = slow, motionIndicatorEasing = tanrei.motion.easing.linear))
        showTabs(system = system)
        val indicator = primary.enabled.selectedActiveIndicatorColor.resolve(colors)
        assertPixel("under the first", indicatorPixel(0), indicator)
        rule.mainClock.autoAdvance = false
        selected = "settings"
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(slow / 2L)
        assertPixel("half way: under the middle tab", indicatorPixel(1), indicator)
        assertFalse("half way: left the first", isClose(indicatorPixel(0), indicator))
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertPixel("arrived", indicatorPixel(2), indicator)
        assertFalse(isClose(indicatorPixel(1), indicator))
        rule.mainClock.autoAdvance = true
    }

    // ── TAB-18: heights, icons, text ─────────────────────────────────────────

    @Test
    fun `TAB-18 a primary tab with an icon stacks it above the label, gap apart, and is height-with-icon tall`() {
        showTabs(icons = true)
        tab(0).assertHeightIsEqualTo(tokens.containerHeightWithIcon)
        val icon = iconBounds.getValue("Overview")
        val text = rule.onNode(hasText("Overview"), useUnmergedTree = true).getUnclippedBoundsInRoot()
        with(rule.density) {
            assertEquals(tokens.iconSize.toPx(), icon.width, 0.5f)
            assertEquals(tokens.iconSize.toPx(), icon.height, 0.5f)
            assertEquals((icon.bottom.toDp() + tokens.containerGap).value, text.top.value, 0.6f)
            assertEquals("centered above it", ((text.left + text.right) / 2).value, ((icon.left + icon.right) / 2).toDp().value, 0.6f)
            assertEquals("the label's line", tokens.labelTypescale.lineHeight.toDp().value, (text.bottom - text.top).value, 0.6f)
        }
        assertEquals(tanrei.icon.glyph(tokens.iconSize, selected = true), seenGlyphs["Overview"])
        assertEquals(tanrei.icon.glyph(tokens.iconSize, selected = false), seenGlyphs["Activity"])
    }

    @Test
    fun `TAB-18 a secondary tab puts its icon before its label, gap apart, and stays container-height tall`() {
        showTabs(variant = TanreiTabsVariant.Secondary, icons = true)
        tab(0).assertHeightIsEqualTo(tokens.containerHeight)
        val icon = iconBounds.getValue("Overview")
        val text = rule.onNode(hasText("Overview"), useUnmergedTree = true).getUnclippedBoundsInRoot()
        with(rule.density) {
            assertEquals((icon.right.toDp() + tokens.containerGap).value, text.left.value, 0.6f)
            assertEquals("centered on the label's line", ((text.top + text.bottom) / 2).value, ((icon.top + icon.bottom) / 2).toDp().value, 0.6f)
        }
    }

    // ── TAB-19: icon only ────────────────────────────────────────────────────

    @Test
    fun `TAB-19 labelHidden without an icon draws the label anyway, and a debuggable app reports it`() = collectingReports { reports ->
        setDebuggable(true)
        showTabs(hidden = true)
        rule.onNode(hasText("Overview"), useUnmergedTree = true).assertExists()
        assertTrue(reports.toString(), reports.any { "Overview" in it && "no icon" in it })
    }

    // ── TAB-20: the divider ──────────────────────────────────────────────────

    @Test
    fun `TAB-20 the divider runs along the bottom of the whole row, under the tabs, even while it scrolls, and is not in the tree`() {
        val divider = tokens.dividerColor.resolve(colors).compositeOver(surface)
        showTabs(scrollable = true, labels = SIX, width = 240.dp)
        rule.onNodeWithTag(ROW).performTouchInput { swipeLeft() }
        rule.waitForIdle()
        val row = rule.onNodeWithTag(ROW).getUnclippedBoundsInRoot()
        val stage = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
        val y = row.bottom - stage.top - tokens.dividerThickness / 2
        assertPixel("at the start", stagePixel(row.left - stage.left + 1.dp, y), divider)
        assertPixel("at the end", stagePixel(row.right - stage.left - 1.dp, y), divider)
        assertPixel("one hairline", stagePixel(row.right - stage.left - 1.dp, y - tokens.dividerThickness), surface)
        // Under the scroll container, the tabs and nothing else.
        rule.onNodeWithTag(ROW).onChildren().onFirst().onChildren().assertCountEquals(SIX.size)
    }

    // ── TAB-21: right to left ────────────────────────────────────────────────

    @Test
    fun `TAB-21 right-to-left orders the tabs from the right, starts a scrollable row at its right edge, and the indicator follows`() {
        showTabs(direction = LayoutDirection.Rtl)
        val row = rule.onNodeWithTag(ROW).getUnclippedBoundsInRoot()
        assertEquals(row.right, tab(0).getUnclippedBoundsInRoot().right)
        assertTrue(tab(2).getUnclippedBoundsInRoot().left < tab(1).getUnclippedBoundsInRoot().left)
        assertPixel("under the first tab, on the right", indicatorPixel(0), primary.enabled.selectedActiveIndicatorColor.resolve(colors))
        showTabs(scrollable = true, labels = SIX, width = 240.dp, direction = LayoutDirection.Rtl)
        val scrolling = rule.onNodeWithTag(ROW).getUnclippedBoundsInRoot()
        assertEquals("from the right edge", scrolling.right.value, tab(0).getUnclippedBoundsInRoot().right.value, 0.5f)
        assertTrue("the last tab is out of view on the left", tab(5).getUnclippedBoundsInRoot().right < scrolling.left)
    }

    // ── TAB-22: no name ──────────────────────────────────────────────────────

    @Test
    fun `TAB-22 an empty label still renders and works, and a debuggable app reports it`() = collectingReports { reports ->
        setDebuggable(true)
        showTabs(labels = listOf("Overview", ""), values = listOf("overview", "blank"))
        tab(1).performClick()
        rule.waitForIdle()
        assertEquals(listOf("change:blank"), events)
        assertTrue(reports.toString(), reports.any { "TanreiTab" in it && "label" in it })
    }

    // ── TAB-23: color motion ─────────────────────────────────────────────────

    @Test
    fun `TAB-23 a change of state and a change of selection move the colors over the state duration and easing`() {
        val slow = 400
        val system = tanrei.withTabs(TanreiTabsVariant.Primary, TanreiInteractionState.Hovered) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Success)) }
            .let { it.copy(tabs = it.tabs.copy(motionStateDuration = slow, motionStateEasing = tanrei.motion.easing.linear)) }
        showTabs(system = system, icons = true)
        rule.mainClock.autoAdvance = false
        tab(1).performMouseInput { moveTo(center) }
        rule.mainClock.advanceTimeBy(slow / 2L)
        val half = tabPixel(1, CLEAR, CLEAR)
        assertTrue("on its way: $half", !isClose(half, surface) && !isClose(half, colors[TanreiColorRole.Success]))
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertPixel("arrived", tabPixel(1, CLEAR, CLEAR), colors[TanreiColorRole.Success])
        val from = primary.enabled.iconColor.resolve(colors)
        val to = primary.enabled.selectedIconColor.resolve(colors)
        selected = "settings"
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(slow / 2L)
        val between = seenColors.getValue("Settings")
        assertTrue("the icon on its way: $between", !isClose(between, from) && !isClose(between, to))
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertEquals(to, seenColors.getValue("Settings"))
        rule.mainClock.autoAdvance = true
    }

    // ── helpers ──────────────────────────────────────────────────────────────

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

    private fun stagePixel(x: Dp, y: Dp): Color = with(rule.density) { stage()[x.roundToPx(), y.roundToPx()] }

    private fun tabHeight(index: Int): Dp = tab(index).getUnclippedBoundsInRoot().let { it.bottom - it.top }

    private fun tabWidth(index: Int): Dp = tab(index).getUnclippedBoundsInRoot().let { it.right - it.left }

    /** A pixel of tab [index] at ([x], [y]) from its top-left, as drawn on the stage. */
    private fun tabPixel(index: Int, x: Dp, y: Dp): Color {
        val bounds: DpRect = tab(index).getUnclippedBoundsInRoot()
        val stageBounds = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
        return with(rule.density) { stage()[(bounds.left - stageBounds.left + x).roundToPx(), (bounds.top - stageBounds.top + y).roundToPx()] }
    }

    /** The middle of tab [index]'s bottom edge, where an indicator is drawn. */
    private fun indicatorPixel(index: Int): Color = tabPixel(index, tabWidth(index) / 2, tabHeight(index) - 1.dp)

    private fun TanreiSystem.withTabs(variant: TanreiTabsVariant, state: TanreiInteractionState, change: (TanreiTabsVariantStateTokens) -> TanreiTabsVariantStateTokens): TanreiSystem {
        val look = tabs.variants[variant]
        val changed = when (state) {
            TanreiInteractionState.Enabled -> look.copy(enabled = change(look.enabled))
            TanreiInteractionState.Hovered -> look.copy(hovered = change(look.hovered))
            TanreiInteractionState.Focused -> look.copy(focused = change(look.focused))
            TanreiInteractionState.Pressed -> look.copy(pressed = change(look.pressed))
            TanreiInteractionState.Disabled -> look.copy(disabled = change(look.disabled))
        }
        val variants = if (variant == TanreiTabsVariant.Secondary) tabs.variants.copy(secondary = changed) else tabs.variants.copy(primary = changed)
        return copy(tabs = tabs.copy(variants = variants))
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
        const val ROW = "row"
        const val BEFORE = "before"
        const val AFTER = "after"
        val THREE = listOf("Overview", "Activity", "Settings")
        val FOUR = listOf("Overview", "Activity", "Settings", "Billing")
        val SIX = listOf("Overview", "Deployments", "Analytics", "Logs", "Storage", "Settings")
        const val PIXEL_TOLERANCE = 2f / 255f
        val ROW_WIDTH = 360.dp
        val RING_PROBE = 1.dp
        val CLEAR = 12.dp
    }
}

/** TAB-15, TAB-17 and TAB-23 where motion is reduced (the animator duration scale is 0, see `TanreiButtonReducedMotionTest`). */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiTabsReducedMotionTest {
    private object NoMotion : MotionDurationScale {
        override val scaleFactor: Float = 0f
    }

    @get:Rule
    val rule = createComposeRule(effectContext = NoMotion)

    private var selected by mutableStateOf("overview")
    private var storageIcon = Color.Unspecified

    @Test
    fun `TAB-15 TAB-17 TAB-23 where motion is reduced the indicator, the scroll and the colors change at once`() {
        val tanrei = TanreiSystem.Tanrei
        val colors = tanrei.colors.light
        val slow = tanrei.tabs.copy(motionIndicatorDuration = 1000, motionStateDuration = 1000)
        rule.setContent {
            TanreiTheme(system = tanrei.copy(tabs = slow), theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Box(Modifier.testTag("stage").width(240.dp).background(TanreiColorRole.Surface.color)) {
                    TanreiTabs(selectedValue = selected, onSelectedValueChange = { selected = it }, modifier = Modifier.testTag("row"), scrollable = true) {
                        listOf("Overview", "Deployments", "Analytics", "Logs", "Storage", "Settings").forEachIndexed { i, label ->
                            TanreiTab(value = label.lowercase(), label = label, modifier = Modifier.testTag("tab-$i"), icon = { if (label == "Storage") storageIcon = LocalTanreiContentColor.current })
                        }
                    }
                }
            }
        }
        rule.waitForIdle()
        rule.mainClock.autoAdvance = false
        selected = "storage"
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        repeat(3) { rule.mainClock.advanceTimeByFrame() }
        val row = rule.onNodeWithTag("row").getUnclippedBoundsInRoot()
        val tab = rule.onNodeWithTag("tab-4").getUnclippedBoundsInRoot()
        assertEquals("scrolled into view at once", row.right.value, tab.right.value, 1f)
        val stage = rule.onNodeWithTag("stage").captureToImage().toPixelMap()
        val x = with(rule.density) { ((tab.left + tab.right) / 2 - row.left).roundToPx() }
        val y = with(rule.density) { (tab.bottom - row.top - 1.dp).roundToPx() }
        val indicator = tanrei.tabs.variants.primary.enabled.selectedActiveIndicatorColor.resolve(colors)
        val drawn = stage[x, y]
        assertTrue("the indicator there at once: $drawn", abs(drawn.red - indicator.red) < 0.02f && abs(drawn.green - indicator.green) < 0.02f)
        rule.onNodeWithTag("tab-4").assertIsSelected()
        assertEquals("the icon's selected color at once", tanrei.tabs.variants.primary.enabled.selectedIconColor.resolve(colors), storageIcon)
        rule.mainClock.autoAdvance = true
    }
}
