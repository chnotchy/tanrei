package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
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
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertHeightIsEqualTo
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.assertWidthIsAtLeast
import androidx.compose.ui.test.assertWidthIsEqualTo
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performMouseInput
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.test.withKeyDown
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.acme.design.Acme
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
import io.github.chnotchy.tanrei.tokens.M3Like
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiFocusStyle
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiPressedFeedback
import io.github.chnotchy.tanrei.tokens.TanreiSegmentedButtonConditionStateTokens
import io.github.chnotchy.tanrei.tokens.TanreiSegmentedButtonConditionTokens
import io.github.chnotchy.tanrei.tokens.TanreiSegmentedButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiSegmentedButtonSizeTokens
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
 * Behaviour tests for `specs/segmented-button.spec.json`. Each test names the behaviour id (`SEG-n`) it covers. Runs on
 * the JVM (Robolectric, native graphics). The set is drawn on the surface at its natural width unless a test gives it a
 * width, with a focusable box before it and one after it where the keyboard is tested. A segment's element — its hit
 * box, tagged `seg-<i>` — is as tall as the touch target; its visual is the set's height, centred in it.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w480dp-h640dp-xhdpi")
class TanreiSegmentedButtonTest {
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
    private val tokens = tanrei.segmentedButton
    private val medium = tokens.sizes.medium
    private val unselected = tokens.conditions.unselected
    private val selectedLook = tokens.conditions.selected
    private val measure = tanrei.measure
    private val surface = colors[TanreiColorRole.Surface]

    private val events = mutableListOf<String>()
    private var value by mutableStateOf<String?>("day")
    private var values by mutableStateOf(setOf<String>())

    /** Whether the caller moves the selection when it hears a change. */
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
     * A set of [labels] (values: the labels in lower case) between a focusable box before it and one after it. [icons]
     * gives every segment a [Swatch]; [disabled] names segments by index; [width] gives the set a width (null: natural).
     */
    private fun showSet(
        system: TanreiSystem = tanrei,
        mode: TanreiSegmentedButtonSelectionMode = TanreiSegmentedButtonSelectionMode.Single,
        labels: List<String> = THREE,
        segmentValues: List<String> = labels.map { it.lowercase() },
        icons: Boolean = false,
        disabled: Set<Int> = emptySet(),
        hidden: Boolean = false,
        width: Dp? = null,
        size: TanreiSegmentedButtonSize = TanreiSegmentedButtonSize.Medium,
        direction: LayoutDirection = LayoutDirection.Ltr,
        fontScale: Float = 1f,
        label: String = "Range",
    ) = show(system, direction, fontScale) {
        Column {
            Box(Modifier.testTag(BEFORE).size(8.dp).focusable())
            Box(if (width != null) Modifier.width(width) else Modifier) {
                TanreiSegmentedButton(
                    onSelectionChange = { selection ->
                        events += "change:${selection.sorted().joinToString(",")}"
                        if (follow) {
                            if (mode == TanreiSegmentedButtonSelectionMode.Single) value = selection.single() else values = selection
                        }
                    },
                    contentDescription = label,
                    modifier = Modifier.testTag(SET).then(if (width != null) Modifier.fillMaxWidth() else Modifier),
                    selectionMode = mode,
                    selectedValue = value,
                    selectedValues = values,
                    size = size,
                ) {
                    labels.forEachIndexed { i, text ->
                        TanreiSegment(
                            value = segmentValues[i],
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

    private fun tag(index: Int) = "seg-$index"

    private fun seg(index: Int) = rule.onNodeWithTag(tag(index))

    private fun TanreiSystem.withSegmented(condition: Boolean, state: TanreiInteractionState, change: (TanreiSegmentedButtonConditionStateTokens) -> TanreiSegmentedButtonConditionStateTokens): TanreiSystem {
        val tokens = segmentedButton
        val look: TanreiSegmentedButtonConditionTokens = if (condition) tokens.conditions.selected else tokens.conditions.unselected
        val changed = when (state) {
            TanreiInteractionState.Enabled -> look.copy(enabled = change(look.enabled))
            TanreiInteractionState.Hovered -> look.copy(hovered = change(look.hovered))
            TanreiInteractionState.Focused -> look.copy(focused = change(look.focused))
            TanreiInteractionState.Pressed -> look.copy(pressed = change(look.pressed))
            TanreiInteractionState.Disabled -> look.copy(disabled = change(look.disabled))
        }
        val conditions = if (condition) tokens.conditions.copy(selected = changed) else tokens.conditions.copy(unselected = changed)
        return copy(segmentedButton = tokens.copy(conditions = conditions))
    }

    private fun TanreiSystem.withMedium(change: (TanreiSegmentedButtonSizeTokens) -> TanreiSegmentedButtonSizeTokens): TanreiSystem =
        copy(segmentedButton = segmentedButton.copy(sizes = segmentedButton.sizes.copy(medium = change(segmentedButton.sizes.medium))))

    private fun TanreiSystem.answering(feedback: TanreiPressedFeedback) = copy(behavior = behavior.copy(pressedFeedback = feedback))

    // ── SEG-1 / SEG-2: activation ────────────────────────────────────────────

    @Test
    fun `SEG-1 activating a segment that is not selected selects its value and emits change once, and the selected one emits nothing`() {
        showSet()
        seg(1).performClick()
        rule.waitForIdle()
        assertEquals(listOf("change:week"), events)
        seg(1).assertIsSelected()
        seg(0).assertIsNotSelected()
        seg(1).performClick()
        rule.waitForIdle()
        assertEquals("the selected segment never clears itself", listOf("change:week"), events)
        assertEquals("week", value)
    }

    @Test
    @KeyboardNavigation
    fun `SEG-1 Enter and Space select the focused segment`() {
        follow = false
        value = null
        showSet()
        seg(0).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        seg(0).performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        assertEquals(listOf("change:day", "change:day"), events)
    }

    @Test
    fun `SEG-2 multiple - activating a segment adds its value, activating it again removes it, and values may become empty`() {
        values = setOf("day")
        showSet(mode = TanreiSegmentedButtonSelectionMode.Multiple)
        seg(2).performClick()
        rule.waitForIdle()
        assertEquals(setOf("day", "month"), values)
        seg(0).performClick()
        rule.waitForIdle()
        seg(2).performClick()
        rule.waitForIdle()
        assertEquals(listOf("change:day,month", "change:month", "change:"), events)
        assertEquals(emptySet<String>(), values)
    }

    @Test
    @KeyboardNavigation
    fun `SEG-2 SEG-19 multiple - Space and Enter switch the focused segment`() {
        values = setOf("week")
        showSet(mode = TanreiSegmentedButtonSelectionMode.Multiple)
        seg(1).requestFocus().performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        seg(1).performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals(listOf("change:", "change:week"), events)
    }

    // ── SEG-3: a disabled segment ────────────────────────────────────────────

    @Test
    fun `SEG-3 a disabled segment is not selected or cleared by a press, emits nothing and is announced disabled`() {
        showSet(disabled = setOf(2))
        seg(2).assertIsNotEnabled()
        seg(0).assertIsEnabled()
        seg(2).performTouchInput { down(center); up() }
        rule.waitForIdle()
        assertEquals(emptyList<String>(), events)
        values = setOf("month")
        showSet(mode = TanreiSegmentedButtonSelectionMode.Multiple, disabled = setOf(2))
        seg(2).performTouchInput { down(center); up() }
        rule.waitForIdle()
        assertEquals("not cleared either", setOf("month"), values)
        assertEquals(emptyList<String>(), events)
    }

    @Test
    @KeyboardNavigation
    fun `SEG-3 the arrow keys skip a disabled segment, and a disabled segment is never the Tab stop`() {
        value = "week"
        showSet(labels = FOUR, disabled = setOf(1, 3))
        rule.onNodeWithTag(BEFORE).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        seg(0).assertIsFocused().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        seg(2).assertIsFocused().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        seg(0).assertIsFocused()
    }

    // ── SEG-4: the state's tokens ────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `SEG-4 under acme hovered, focused and pressed each draw their own container token, pressed over focused over hovered`() {
        val acme = TanreiSystem.Acme
        val acmeColors = acme.colors.light
        val look = acme.segmentedButton.conditions.unselected
        val acmeSurface = acmeColors[TanreiColorRole.Surface]
        fun over(paint: TanreiPaint) = paint.resolve(acmeColors).compositeOver(acmeSurface)
        assertEquals(4, listOf(look.enabled, look.hovered, look.focused, look.pressed).map { over(it.containerColor) }.toSet().size)
        follow = false
        value = null
        showSet(system = acme)
        seg(0).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertPixel("hovered", segPixel(0, CLEAR, CLEAR), over(look.hovered.containerColor))
        seg(0).requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertPixel("focused over hovered", segPixel(0, CLEAR, CLEAR), over(look.focused.containerColor))
        seg(0).performKeyInput { keyDown(Key.Enter) }
        rule.waitForIdle()
        assertPixel("pressed over focused", segPixel(0, CLEAR, CLEAR), over(look.pressed.containerColor))
        seg(0).performKeyInput { keyUp(Key.Enter) }
    }

    @Test
    fun `SEG-4 focus gained by touch does not draw the focused state, and the selected condition draws its own tokens`() {
        val acme = TanreiSystem.Acme
        val acmeColors = acme.colors.light
        value = "week"
        showSet(system = acme)
        seg(1).requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertPixel("the selected condition at rest", segPixel(1, CLEAR, CLEAR), acme.segmentedButton.conditions.selected.enabled.containerColor.resolve(acmeColors))
        assertPixel("the unselected condition at rest", segPixel(0, CLEAR, CLEAR), acmeColors[TanreiColorRole.Surface])
    }

    // ── SEG-5: the focus ring ────────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `SEG-5 keyboard focus shows the ring inside the segment, clear of the set's outline, on the first frame`() {
        value = "week"
        showSet()
        rule.mainClock.autoAdvance = false
        seg(1).requestFocus()
        rule.mainClock.advanceTimeByFrame()
        val ring = colors[TanreiColorRole.FocusRing]
        // The outline is 1 hairline inside the set's edge; the ring's outer stroke lies just inside it.
        assertPixel("the outline stays", segPixel(1, segWidth(1) / 2, 0.25.dp), tokens.outlineColor.resolve(colors))
        assertPixel("the ring inside the top edge", segPixel(1, segWidth(1) / 2, tokens.outlineWidth + 0.75.dp), ring)
        assertPixel("the ring inside the start edge", segPixel(1, 0.75.dp, SET_HEIGHT / 2), ring)
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `SEG-5 focus gained by touch shows no ring`() {
        value = "week"
        showSet()
        seg(1).requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertPixel("no ring", segPixel(1, segWidth(1) / 2, tokens.outlineWidth + 0.75.dp), selectedLook.enabled.containerColor.resolve(colors))
    }

    // ── SEG-6: the minimum target ────────────────────────────────────────────

    @Test
    fun `SEG-6 each segment's hit area reaches the touch target above and below, is at least the target wide, and neighbours never overlap`() {
        val narrow = tanrei.withMedium { it.copy(containerPaddingInline = 2.dp, checkSize = 0.dp) }
        showSet(system = narrow, labels = listOf("A", "B"))
        seg(0).assertHeightIsEqualTo(measure.targetTouch)
        seg(0).assertWidthIsAtLeast(measure.targetTouch)
        seg(1).assertWidthIsAtLeast(measure.targetTouch)
        val a = seg(0).getUnclippedBoundsInRoot()
        val b = seg(1).getUnclippedBoundsInRoot()
        assertEquals("the hit areas tile the set", a.right, b.left)
        val set = rule.onNodeWithTag(SET).getUnclippedBoundsInRoot()
        assertEquals("the visual set keeps its own height", medium.containerHeight.value, visualSetHeight().value, 0.6f)
        assertEquals(set.left, a.left)
        assertEquals(set.right, b.right)
        // A press above the visual set, inside the target, reaches the segment.
        seg(1).performTouchInput { down(Offset(width / 2f, 2.dp.toPx())); up() }
        rule.waitForIdle()
        assertEquals(listOf("change:b"), events)
    }

    // ── SEG-7: disabled tokens ───────────────────────────────────────────────

    @Test
    fun `SEG-7 a disabled segment draws the disabled tokens of its condition, and the outline and dividers keep their colors`() {
        val system = tanrei
            .withSegmented(false, TanreiInteractionState.Disabled) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
            .withSegmented(true, TanreiInteractionState.Disabled) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Success)) }
        showSet(system = system, disabled = setOf(1, 2))
        assertPixel("unselected, disabled", segPixel(2, CLEAR, CLEAR), colors[TanreiColorRole.Error])
        value = "week"
        rule.waitForIdle()
        assertPixel("selected, disabled", segPixel(1, CLEAR, CLEAR), colors[TanreiColorRole.Success])
        val outline = tokens.outlineColor.resolve(colors)
        assertPixel("the outline over a disabled segment", segPixel(2, segWidth(2) / 2, 0.25.dp), outline)
        assertPixel("the divider beside it", dividerPixel(2), tokens.dividerColor.resolve(colors))
        // The default system: a disabled unselected segment keeps no fill; a disabled selected one keeps a faint one.
        assertEquals(TanreiPaint.None, unselected.disabled.containerColor)
        assertNotEquals(TanreiPaint.None, selectedLook.disabled.containerColor)
    }

    // ── SEG-8: an unknown size ───────────────────────────────────────────────

    @Test
    fun `SEG-8 a size the system does not have draws with medium's tokens, and a debuggable app reports it`() = collectingReports { reports ->
        showSet()
        val expected = stage()
        setDebuggable(true)
        showSet(size = TanreiSegmentedButtonSize("jumbo"))
        assertSameAs(expected, stage(), "an unknown size")
        assertTrue(reports.toString(), reports.any { "jumbo" in it && "TanreiSegmentedButton" in it })
    }

    // ── SEG-9 / SEG-10: the press ────────────────────────────────────────────

    @Test
    fun `SEG-9 a tap that ends at once shows the pressed state on the next frame and keeps it for press-hold`() {
        follow = false
        showSet()
        val hold = tanrei.motion.duration.pressHold.toLong()
        val pressed = unselected.pressed.containerColor.resolve(colors).compositeOver(surface)
        rule.mainClock.autoAdvance = false
        seg(1).performTouchInput { down(center); up() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("pressed", segPixel(1, CLEAR, CLEAR), pressed)
        rule.mainClock.advanceTimeBy(hold / 2)
        assertPixel("still pressed", segPixel(1, CLEAR, CLEAR), pressed)
        rule.mainClock.advanceTimeBy(hold + tokens.motionStateDuration * 2L)
        assertPixel("at rest", segPixel(1, CLEAR, CLEAR), surface)
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `SEG-10 ripple grows the pressed color of the segment's condition from the point of contact`() {
        assertEquals(TanreiPressedFeedback.Ripple, TanreiSystem.M3Like.behavior.pressedFeedback)
        follow = false
        showSet(system = tanrei.answering(TanreiPressedFeedback.Ripple))
        val pressed = unselected.pressed.containerColor.resolve(colors).compositeOver(surface)
        val top = setTop()
        rule.mainClock.autoAdvance = false
        seg(1).performTouchInput { down(Offset(8.dp.toPx(), (top + 8.dp).toPx())) }
        rule.mainClock.advanceTimeBy(50)
        assertPixel("at the point of contact", segPixel(1, 8.dp, 8.dp), pressed)
        assertPixel("not yet at the far corner", segPixel(1, segWidth(1) - 4.dp, SET_HEIGHT - 4.dp), surface)
        rule.mainClock.advanceTimeBy(tokens.motionFeedbackDuration.toLong())
        assertPixel("the far corner once grown", segPixel(1, segWidth(1) - 4.dp, SET_HEIGHT - 4.dp), pressed)
        seg(1).performTouchInput { up() }
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `SEG-10 dim - cupertino's answer - dims the pressed segment and draws no state layer, and none draws nothing`() {
        val cupertino = TanreiSystem.Cupertino
        assertEquals(TanreiPressedFeedback.Dim, cupertino.behavior.pressedFeedback)
        assertTrue(cupertino.segmentedButton.pressed.opacity < 1f)
        follow = false
        showSet(system = cupertino)
        val track = cupertino.segmentedButton.setColor.resolve(cupertino.colors.light)
        val before = stage()
        seg(1).performTouchInput { down(center) }
        rule.waitForIdle()
        assertPixel("no state layer: the track shows", segPixel(1, CLEAR, CLEAR), track)
        assertTrue("the label is dimmed", differing(before, stage()) > 0)
        seg(1).performTouchInput { up() }
        showSet(system = tanrei.answering(TanreiPressedFeedback.None))
        seg(1).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val hovered = stage()
        seg(1).performMouseInput { press() }
        rule.waitForIdle()
        assertSameAs(hovered, stage(), "pressed under none")
        seg(1).performMouseInput { release() }
    }

    // ── SEG-11: corners and focus style ──────────────────────────────────────

    @Test
    fun `SEG-11 SEG-13 the end segments' outer corners are the set's, eased by corner smoothing, and inner corners are container-shape`() {
        val radius = 12.dp
        val filled = tanrei.withSegmented(false, TanreiInteractionState.Enabled) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.OnSurface)) }
        for (smoothing in listOf(0f, 0.6f)) {
            value = null
            showSet(system = filled.copy(segmentedButton = filled.segmentedButton.copy(setShape = radius, outlineColor = TanreiPaint.None), shape = tanrei.shape.copy(cornerSmoothing = smoothing)))
            val on = colors[TanreiColorRole.OnSurface]
            assertPixel("smoothing $smoothing: the very outer corner is outside", segPixel(0, 0.5.dp, 0.5.dp), surface)
            assertPixel("smoothing $smoothing: inside the outer corner", segPixel(0, radius, radius), on)
            assertPixel("smoothing $smoothing: the inner corner is square", segPixel(0, segWidth(0) - 0.5.dp, 0.5.dp), on)
            assertPixel("smoothing $smoothing: the last segment's outer corner", segPixel(2, segWidth(2) - 0.5.dp, SET_HEIGHT - 0.5.dp), surface)
        }
        assertEquals(0.6f, TanreiSystem.Cupertino.shape.cornerSmoothing)
    }

    @Test
    @KeyboardNavigation
    fun `SEG-11 glow draws the focus colors as a halo inside the segment under acme`() {
        val acme = TanreiSystem.Acme
        assertEquals(TanreiFocusStyle.Glow, acme.behavior.focusStyle)
        value = "week"
        showSet(system = acme)
        seg(1).requestFocus().assertIsFocused()
        rule.waitForIdle()
        val acmeColors = acme.colors.light
        val focused = acme.segmentedButton.conditions.selected.focused.containerColor.resolve(acmeColors).compositeOver(acmeColors[TanreiColorRole.Surface])
        val edge = segPixel(1, segWidth(1) / 2, 3.dp)
        assertFalse("the halo inside the segment: $edge", isClose(edge, focused))
    }

    // ── SEG-12: which segments are selected ──────────────────────────────────

    @Test
    fun `SEG-12 the selected segment draws the selected condition, every other segment the unselected one`() {
        showSet(icons = true)
        assertEquals(selectedLook.enabled.iconColor.resolve(colors), seenColors["Day"])
        assertEquals(unselected.enabled.iconColor.resolve(colors), seenColors["Week"])
        assertPixel("the selected fill", segPixel(0, CLEAR, CLEAR), selectedLook.enabled.containerColor.resolve(colors))
        assertPixel("no fill", segPixel(1, CLEAR, CLEAR), surface)
        values = setOf("day", "month")
        showSet(mode = TanreiSegmentedButtonSelectionMode.Multiple)
        seg(0).assertIsOn()
        seg(1).assertIsOff()
        seg(2).assertIsOn()
    }

    @Test
    fun `SEG-12 a value naming no segment selects none for it, and a debuggable app reports it`() = collectingReports { reports ->
        setDebuggable(true)
        value = "ghost"
        showSet()
        rule.waitForIdle()
        (0..2).forEach { seg(it).assertIsNotSelected() }
        assertTrue(reports.toString(), reports.any { "\"ghost\"" in it && "none" in it })
    }

    @Test
    fun `SEG-12 an empty or repeated value still renders - the first segment with the value is the one it selects - and is reported`() = collectingReports { reports ->
        setDebuggable(true)
        value = "twice"
        showSet(segmentValues = listOf("twice", "twice", ""))
        rule.waitForIdle()
        seg(0).assertIsSelected()
        seg(1).assertIsNotSelected()
        seg(2).assertExists()
        assertTrue(reports.toString(), reports.any { "\"twice\"" in it && "more than one" in it })
        assertTrue(reports.toString(), reports.any { "Month" in it && "empty" in it })
    }

    // ── SEG-13: the set ──────────────────────────────────────────────────────

    @Test
    fun `SEG-13 the set is its size's height, filled with set-color, outlined inside its edge, its segments inset by set-padding`() {
        showSet()
        assertEquals(medium.containerHeight.value, visualSetHeight().value, 0.6f)
        assertPixel("the outline, inside the top edge", segPixel(1, segWidth(1) / 2, 0.25.dp), tokens.outlineColor.resolve(colors))
        assertPixel("not outside it", setPixel(setWidth() / 2, -1.dp), surface)
        // 2 of padding: the segments are 32 tall inside a set of the size's 36.
        val pad = 2.dp
        val system = tanrei.copy(segmentedButton = tokens.copy(setColor = TanreiPaint.Role(TanreiColorRole.Warning), setPadding = pad, outlineColor = TanreiPaint.None))
        showSet(system = system)
        assertEquals(medium.containerHeight.value, visualSetHeight().value, 0.6f)
        assertPixel("the fill shows in the padding", setPixel(setWidth() / 2, 1.dp), colors[TanreiColorRole.Warning])
        assertPixel("the selected segment inside it", setPixel(pad + CLEAR, pad + CLEAR), selectedLook.enabled.containerColor.resolve(colors))
        assertPixel("the padding around it", setPixel(pad + CLEAR, pad - 1.dp), colors[TanreiColorRole.Warning])
    }

    // ── SEG-14: widths ───────────────────────────────────────────────────────

    @Test
    fun `SEG-14 every segment is as wide as the widest content as if selected, and moving the selection changes no width`() {
        value = "month"
        showSet()
        val before = (0..2).map { segVisualWidth(it) }
        assertEquals(before[0].value, before[1].value, 0.6f)
        assertEquals(before[0].value, before[2].value, 0.6f)
        assertTrue("room for the check and the padding", before[0] >= medium.containerPaddingInline * 2 + medium.checkSize + medium.containerGap)
        val setBefore = setWidth()
        value = "day"
        rule.waitForIdle()
        assertEquals("no width moves", setBefore, setWidth())
        (0..2).forEach { assertEquals(before[it].value, segVisualWidth(it).value, 0.1f) }
    }

    @Test
    fun `SEG-14 a wider layout is divided equally, and a narrower one wraps the labels and grows every segment to the tallest`() {
        showSet(width = 420.dp)
        assertEquals(420f, setWidth().value, 0.6f)
        val each = (420.dp - tokens.dividerWidth * 2) / 3
        (0..2).forEach { assertEquals(each.value, segVisualWidth(it).value, 0.6f) }
        showSet(labels = listOf("Day", "Everything recently", "Month"), width = 240.dp)
        val tall = visualSetHeight()
        assertTrue("the long label wraps and the set grows: $tall", tall > measure.targetTouch)
        (0..2).forEach { seg(it).assertHeightIsEqualTo(tall) }
    }

    // ── SEG-15: content ──────────────────────────────────────────────────────

    @Test
    fun `SEG-15 the icon is drawn at the icon size in the condition's icon color with the glyph of its condition, before the label`() {
        value = null
        val system = tanrei.withMedium { it.copy(iconSize = 20.dp) }
        showSet(system = system, icons = true)
        val icon = iconBounds.getValue("Week")
        with(rule.density) {
            assertEquals(20.dp.toPx(), icon.width, 0.5f)
            assertEquals(20.dp.toPx(), icon.height, 0.5f)
        }
        assertEquals(unselected.enabled.iconColor.resolve(colors), seenColors["Week"])
        assertEquals(tanrei.icon.glyph(20.dp, selected = false), seenGlyphs["Week"])
        value = "week"
        showSet(system = system.withMedium { it.copy(checkSize = 0.dp) }, icons = true)
        assertEquals("a selected segment's glyph", tanrei.icon.glyph(20.dp, selected = true), seenGlyphs["Week"])
        // Centred: the content sits in the middle of the segment.
        val seg = seg(1).getUnclippedBoundsInRoot()
        val iconAgain = iconBounds.getValue("Week")
        with(rule.density) {
            assertTrue("the icon is in the segment's start half", iconAgain.left.toDp() < (seg.left + seg.right) / 2)
            assertTrue("and clear of its padding", iconAgain.left.toDp() > seg.left + medium.containerPaddingInline)
        }
    }

    @Test
    fun `SEG-15 the label is set in the size's label style and the condition's label color`() {
        value = null
        val tall = tanrei.typescale.display
        showSet(system = tanrei.withMedium { it.copy(labelTypescale = tall) })
        assertTrue("a taller text style grows the set: ${visualSetHeight()}", visualSetHeight() > medium.containerHeight)
        val red = tanrei.withSegmented(false, TanreiInteractionState.Enabled) { it.copy(labelColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        showSet(system = red)
        assertTrue("the label in the label color", countNear(segArea(1), colors[TanreiColorRole.Error]) > 0)
    }

    // ── SEG-16: the check ────────────────────────────────────────────────────

    @Test
    fun `SEG-16 a selected segment draws the check before its label in the selected icon color, and an unselected one none`() {
        val system = tanrei.withSegmented(true, TanreiInteractionState.Enabled) { it.copy(iconColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        showSet(system = system)
        assertTrue("the check", countNear(segArea(0), colors[TanreiColorRole.Error]) > 0)
        assertEquals("no check", 0, countNear(segArea(1), colors[TanreiColorRole.Error]))
    }

    @Test
    fun `SEG-16 the check takes the icon's place, an icon-only segment keeps its icon, and check-size 0 draws no check and reserves no room`() {
        val red = TanreiPaint.Role(TanreiColorRole.Error)
        val system = tanrei.withSegmented(true, TanreiInteractionState.Enabled) { it.copy(iconColor = red) }
        showSet(system = system, icons = true)
        val box = with(rule.density) { (medium.iconSize.roundToPx() * medium.iconSize.roundToPx()) }
        val withCheck = countNear(segArea(0), colors[TanreiColorRole.Error])
        assertTrue("the check, not the filled icon: $withCheck of $box", withCheck in 1 until box / 2)
        showSet(system = system, icons = true, hidden = true)
        val iconOnly = countNear(segArea(0), colors[TanreiColorRole.Error])
        assertTrue("the icon kept, no check: $iconOnly of $box", iconOnly >= box * 9 / 10)
        // check-size 0: no check, no room — the label stays where it is when the segment is not selected.
        val noCheck = system.withMedium { it.copy(checkSize = 0.dp) }
        showSet(system = noCheck)
        assertEquals("no check", 0, countNear(segArea(0), colors[TanreiColorRole.Error]))
        val selectedStart = firstDarkColumn(segRows(0))
        value = "week"
        rule.waitForIdle()
        val unselectedStart = firstDarkColumn(segRows(0))
        assertTrue("the label did not move: $selectedStart, $unselectedStart", abs(selectedStart - unselectedStart) <= 1)
    }

    @Test
    fun `SEG-16 a change of condition moves the colors over the selection duration and easing`() {
        val slow = 400
        val system = tanrei.copy(segmentedButton = tokens.copy(motionSelectionDuration = slow, motionSelectionEasing = tanrei.motion.easing.linear))
        showSet(system = system, icons = true, labels = listOf("Day", "Week"))
        val from = unselected.enabled.iconColor.resolve(colors)
        val to = selectedLook.enabled.iconColor.resolve(colors)
        rule.mainClock.autoAdvance = false
        value = "week"
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(slow / 2L)
        val between = seenColors.getValue("Week")
        assertTrue("on its way: $between", !isClose(between, from) && !isClose(between, to))
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertEquals(to, seenColors.getValue("Week"))
        rule.mainClock.autoAdvance = true
    }

    // ── SEG-17: dividers ─────────────────────────────────────────────────────

    @Test
    fun `SEG-17 a divider of divider-width in divider-color between neighbours, whatever their state, and not in the tree`() {
        val system = tanrei.copy(segmentedButton = tokens.copy(dividerColor = TanreiPaint.Role(TanreiColorRole.Error), dividerWidth = 2.dp))
        showSet(system = system, disabled = setOf(2))
        val red = colors[TanreiColorRole.Error]
        assertPixel("between the first two", dividerPixel(1, width = 2.dp), red)
        assertPixel("beside a disabled segment", dividerPixel(2, width = 2.dp), red)
        assertPixel("over the full height", dividerPixel(1, width = 2.dp, y = 1.5.dp), red)
        follow = false
        seg(1).performTouchInput { down(center) }
        rule.waitForIdle()
        assertPixel("beside a pressed segment", dividerPixel(1, width = 2.dp), red)
        seg(1).performTouchInput { up() }
        // The set's children in the tree are its segments alone.
        val children = rule.onNodeWithTag(SET).fetchSemanticsNode().children
        assertEquals("the set's children in the tree are its segments alone", 3, children.size)
    }

    // ── SEG-18 / SEG-19: the keyboard ────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `SEG-18 single - one Tab stop, the selected segment, and Tab moves on out of the set`() {
        value = "week"
        showSet()
        rule.onNodeWithTag(BEFORE).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        seg(1).assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(AFTER).assertIsFocused().performKeyInput { withKeyDown(Key.ShiftLeft) { pressKey(Key.Tab) } }
        rule.waitForIdle()
        seg(1).assertIsFocused()
        value = null
        rule.waitForIdle()
        rule.onNodeWithTag(BEFORE).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        seg(0).assertIsFocused()
        assertEquals("moving focus with Tab selects nothing", emptyList<String>(), events)
    }

    @Test
    @KeyboardNavigation
    fun `SEG-18 single - Right and Down move to the next segment, Left and Up to the previous, wrapping, Home and End to the ends, each selecting`() {
        showSet()
        seg(0).requestFocus().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        seg(1).assertIsFocused().assertIsSelected().performKeyInput { pressKey(Key.DirectionDown) }
        rule.waitForIdle()
        seg(2).assertIsFocused().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        seg(0).assertIsFocused().performKeyInput { pressKey(Key.DirectionUp) }
        rule.waitForIdle()
        seg(2).assertIsFocused().performKeyInput { pressKey(Key.DirectionLeft) }
        rule.waitForIdle()
        seg(1).assertIsFocused().performKeyInput { pressKey(Key.MoveHome) }
        rule.waitForIdle()
        seg(0).assertIsFocused().performKeyInput { pressKey(Key.MoveEnd) }
        rule.waitForIdle()
        seg(2).assertIsFocused().assertIsSelected()
        assertEquals(listOf("change:week", "change:month", "change:day", "change:month", "change:week", "change:day", "change:month"), events)
    }

    @Test
    @KeyboardNavigation
    fun `SEG-18 SEG-21 in a right-to-left layout Left moves to the next segment and Right to the previous`() {
        showSet(direction = LayoutDirection.Rtl)
        seg(0).requestFocus().performKeyInput { pressKey(Key.DirectionLeft) }
        rule.waitForIdle()
        seg(1).assertIsFocused().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        seg(0).assertIsFocused()
        assertEquals(listOf("change:week", "change:day"), events)
    }

    @Test
    @KeyboardNavigation
    fun `SEG-19 multiple - one Tab stop, the arrows move without changing the selection, and Tab returns to the segment focused last`() {
        values = setOf("week")
        showSet(mode = TanreiSegmentedButtonSelectionMode.Multiple)
        rule.onNodeWithTag(BEFORE).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        seg(1).assertIsFocused().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        seg(2).assertIsFocused().performKeyInput { pressKey(Key.DirectionDown) }
        rule.waitForIdle()
        seg(0).assertIsFocused().performKeyInput { pressKey(Key.MoveEnd) }
        rule.waitForIdle()
        seg(2).assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(AFTER).assertIsFocused().performKeyInput { withKeyDown(Key.ShiftLeft) { pressKey(Key.Tab) } }
        rule.waitForIdle()
        seg(2).assertIsFocused()
        assertEquals("the arrows change nothing", emptyList<String>(), events)
        assertEquals(setOf("week"), values)
    }

    @Test
    @KeyboardNavigation
    fun `SEG-19 multiple - with nothing selected and nothing focused before, the first enabled segment is the Tab stop`() {
        showSet(mode = TanreiSegmentedButtonSelectionMode.Multiple, disabled = setOf(0))
        rule.onNodeWithTag(BEFORE).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        seg(1).assertIsFocused()
    }

    // ── SEG-20: semantics ────────────────────────────────────────────────────

    @Test
    fun `SEG-20 single - a named selectable group of radios, each with its selected state, name and position`() {
        showSet()
        val set = rule.onNodeWithTag(SET).fetchSemanticsNode().config
        assertEquals(listOf("Range"), set[SemanticsProperties.ContentDescription])
        assertTrue(SemanticsProperties.SelectableGroup in set)
        assertEquals(3, set[SemanticsProperties.CollectionInfo].columnCount)
        (0..2).forEach { i ->
            seg(i).assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.RadioButton))
            assertEquals(i, seg(i).fetchSemanticsNode().config[SemanticsProperties.CollectionItemInfo].columnIndex)
        }
        seg(0).assert(SemanticsMatcher.expectValue(SemanticsProperties.Text, listOf(AnnotatedString("Day")))).assertIsSelected()
        seg(1).assertIsNotSelected()
    }

    @Test
    fun `SEG-20 multiple - toggle buttons with their pressed state`() {
        values = setOf("week")
        showSet(mode = TanreiSegmentedButtonSelectionMode.Multiple)
        (0..2).forEach { seg(it).assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button)) }
        seg(1).assertIsOn()
        seg(0).assertIsOff()
        assertEquals(listOf("Range"), rule.onNodeWithTag(SET).fetchSemanticsNode().config[SemanticsProperties.ContentDescription])
    }

    @Test
    fun `SEG-20 SEG-22 an icon-only segment is named by its hidden label, and the icons and the check are hidden`() {
        showSet(icons = true, hidden = true)
        seg(0).assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf("Day")))
        seg(0).assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Text))
        assertEquals(0, rule.onAllNodesWithText("Day"))
        // Each segment is one element: nothing of its glyphs or check is in the tree.
        assertTrue(rule.onNodeWithTag(tag(0)).fetchSemanticsNode().children.isEmpty())
    }

    // ── SEG-21: right to left ────────────────────────────────────────────────

    @Test
    fun `SEG-21 right-to-left orders the segments from the right and puts the glyph to the right of the label`() {
        value = "week"
        showSet(icons = true, direction = LayoutDirection.Rtl, system = tanrei.withMedium { it.copy(checkSize = 0.dp) })
        val set = rule.onNodeWithTag(SET).getUnclippedBoundsInRoot()
        assertEquals(set.right, seg(0).getUnclippedBoundsInRoot().right)
        assertTrue(seg(2).getUnclippedBoundsInRoot().left < seg(1).getUnclippedBoundsInRoot().left)
        val bounds = seg(1).getUnclippedBoundsInRoot()
        val icon = iconBounds.getValue("Week")
        with(rule.density) { assertTrue("the glyph in the segment's right half", icon.left.toDp() > (bounds.left + bounds.right) / 2) }
    }

    @Test
    fun `SEG-21 in right-to-left a ripple still grows from the point of contact`() {
        follow = false
        showSet(system = tanrei.answering(TanreiPressedFeedback.Ripple), direction = LayoutDirection.Rtl)
        val pressed = unselected.pressed.containerColor.resolve(colors).compositeOver(surface)
        val top = setTop()
        rule.mainClock.autoAdvance = false
        seg(1).performTouchInput { down(Offset(8.dp.toPx(), (top + 8.dp).toPx())) }
        rule.mainClock.advanceTimeBy(50)
        assertPixel("at the point of contact", segPixel(1, 8.dp, 8.dp), pressed)
        assertPixel("not at the far corner", segPixel(1, segWidth(1) - 4.dp, SET_HEIGHT - 4.dp), surface)
        seg(1).performTouchInput { up() }
        rule.mainClock.autoAdvance = true
    }

    // ── SEG-22: reports ──────────────────────────────────────────────────────

    @Test
    fun `SEG-22 an empty segment label still renders and works, and a debuggable app reports it`() = collectingReports { reports ->
        setDebuggable(true)
        showSet(labels = listOf("Day", ""), segmentValues = listOf("day", "blank"))
        seg(1).performClick()
        rule.waitForIdle()
        assertEquals(listOf("change:blank"), events)
        assertTrue(reports.toString(), reports.any { "TanreiSegment" in it && "label" in it })
    }

    @Test
    fun `SEG-22 labelHidden without an icon draws the label anyway, and a debuggable app reports it`() = collectingReports { reports ->
        setDebuggable(true)
        showSet(hidden = true)
        seg(0).assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf("Day")))
        assertTrue("the label is drawn", countNear(segArea(1), unselected.enabled.labelColor.resolve(colors), tolerance = 0.2f) > 0)
        assertTrue(reports.toString(), reports.any { "Day" in it && "no icon" in it })
    }

    @Test
    fun `SEG-22 an empty set label, one segment or six still render, and a debuggable app reports them`() = collectingReports { reports ->
        setDebuggable(true)
        showSet(label = "", labels = listOf("Only"))
        seg(0).assertExists()
        rule.waitForIdle()
        assertTrue(reports.toString(), reports.any { "TanreiSegmentedButton" in it && "contentDescription" in it })
        assertTrue(reports.toString(), reports.any { "holds 1 segments" in it })
        showSet(labels = listOf("A", "B", "C", "D", "E", "F"))
        rule.waitForIdle()
        seg(5).assertExists()
        assertTrue(reports.toString(), reports.any { "holds 6 segments" in it })
    }

    // ── SEG-23: state motion ─────────────────────────────────────────────────

    @Test
    fun `SEG-23 a change of state moves the colors over the state duration and easing`() {
        val slow = 400
        val system = tanrei.withSegmented(false, TanreiInteractionState.Hovered) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Success)) }
            .let { it.copy(segmentedButton = it.segmentedButton.copy(motionStateDuration = slow, motionStateEasing = tanrei.motion.easing.linear)) }
        showSet(system = system)
        rule.mainClock.autoAdvance = false
        seg(1).performMouseInput { moveTo(center) }
        rule.mainClock.advanceTimeBy(slow / 2L)
        val half = segPixel(1, CLEAR, CLEAR)
        assertTrue("on its way: $half", !isClose(half, surface) && !isClose(half, colors[TanreiColorRole.Success]))
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertPixel("arrived", segPixel(1, CLEAR, CLEAR), colors[TanreiColorRole.Success])
        rule.mainClock.autoAdvance = true
    }

    // ── SEG-24: elevation ────────────────────────────────────────────────────

    @Test
    fun `SEG-24 a selected segment casts its condition's elevation outside itself and over its neighbours`() {
        val hard = listOf(TanreiShadowLayer(0.dp, 0.dp, 0.dp, 0.dp, TanreiColorRole.Success), TanreiShadowLayer(0.dp, 0.dp, 0.dp, 4.dp, TanreiColorRole.Success))
        val system = tanrei
            .withSegmented(true, TanreiInteractionState.Enabled) { it.copy(containerElevation = hard) }
            .withSegmented(false, TanreiInteractionState.Enabled) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
            .let { it.copy(segmentedButton = it.segmentedButton.copy(outlineColor = TanreiPaint.None)) }
        value = "week"
        showSet(system = system)
        val green = colors[TanreiColorRole.Success]
        assertPixel("over the neighbour before it", segPixel(0, segWidth(0) - 2.dp, SET_HEIGHT / 2), green)
        assertPixel("over the neighbour after it", segPixel(2, 2.dp, SET_HEIGHT / 2), green)
        assertPixel("outside the set, unclipped", segPixel(1, segWidth(1) / 2, -2.dp), green)
        assertEquals("the default system raises no segment", tanrei.elevation.level0, selectedLook.enabled.containerElevation)
        assertNotEquals("cupertino raises the selected one", TanreiSystem.Cupertino.elevation.level0, TanreiSystem.Cupertino.segmentedButton.conditions.selected.enabled.containerElevation)
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

    private fun androidx.compose.ui.test.SemanticsNodeInteraction.assertIsOn() = assert(SemanticsMatcher.expectValue(SemanticsProperties.ToggleableState, ToggleableState.On))

    private fun androidx.compose.ui.test.SemanticsNodeInteraction.assertIsOff() = assert(SemanticsMatcher.expectValue(SemanticsProperties.ToggleableState, ToggleableState.Off))

    private fun androidx.compose.ui.test.SemanticsNodeInteractionsProvider.onAllNodesWithText(text: String): Int =
        onAllNodes(hasText(text), useUnmergedTree = true).fetchSemanticsNodes().size

    private fun stage(): PixelMap = rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap()

    private fun stageBounds() = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()

    private fun setBounds() = rule.onNodeWithTag(SET).getUnclippedBoundsInRoot()

    private fun setWidth(): Dp = setBounds().let { it.right - it.left }

    /**
     * The drawn set's height: a segment's element when it is taller than the touch target (it is the set's height then),
     * else the rows the set draws in the column through its middle.
     */
    private fun visualSetHeight(): Dp {
        val element = seg(0).getUnclippedBoundsInRoot().let { it.bottom - it.top }
        if (element > measure.targetTouch) return element
        val map = stage()
        val set = setBounds()
        val stage = stageBounds()
        return with(rule.density) {
            val x = (set.left - stage.left + setWidth() / 2).roundToPx()
            val rows = ((set.top - stage.top).roundToPx() until (set.bottom - stage.top).roundToPx()).filter { !isClose(map[x, it], surface) }
            (rows.last() - rows.first() + 1).toDp()
        }
    }

    /** Where the drawn set's top lies inside the layout (the touch target is centred on it), for a set of [SET_HEIGHT]. */
    private fun setTop(): Dp = (setBounds().let { it.bottom - it.top } - SET_HEIGHT) / 2

    /** A pixel at ([x], [y]) from the drawn set's top-left. */
    private fun setPixel(x: Dp, y: Dp): Color {
        val set = setBounds()
        val stage = stageBounds()
        return with(rule.density) { stage()[(set.left - stage.left + x).roundToPx(), (set.top - stage.top + setTop() + y).roundToPx()] }
    }

    /** Segment [index]'s drawn left edge, from the set's left: its element's, past the outer padding or half a divider. */
    private fun segLeft(index: Int): Dp {
        val element = seg(index).getUnclippedBoundsInRoot()
        return element.left - setBounds().left + if (index == 0) currentPadding else currentDivider / 2
    }

    private fun segWidth(index: Int): Dp = segVisualWidth(index)

    private fun segVisualWidth(index: Int): Dp {
        val element = seg(index).getUnclippedBoundsInRoot()
        val count = segmentCount()
        val start = if (index == 0) currentPadding else currentDivider / 2
        val end = if (index == count - 1) currentPadding else currentDivider / 2
        return element.right - element.left - start - end
    }

    private fun segmentCount(): Int = rule.onNodeWithTag(SET).fetchSemanticsNode().children.size

    /** A pixel of segment [index] at ([x], [y]) from its drawn top-left. */
    private fun segPixel(index: Int, x: Dp, y: Dp): Color = setPixel(segLeft(index) + x, currentPadding + y)

    /** The middle of the divider before segment [index]. */
    private fun dividerPixel(index: Int, width: Dp = tokens.dividerWidth, y: Dp = SET_HEIGHT / 2): Color = setPixel(segLeft(index) - width / 2, y)

    /** The pixels of segment [index]'s drawn area, row by row. */
    private fun segRows(index: Int): List<List<Color>> {
        val map = stage()
        val set = setBounds()
        val stage = stageBounds()
        return with(rule.density) {
            val left = (set.left - stage.left + segLeft(index)).roundToPx() + 2
            val top = (set.top - stage.top + setTop() + currentPadding).roundToPx() + 2
            val right = left + segVisualWidth(index).roundToPx() - 4
            val bottom = top + (SET_HEIGHT - currentPadding * 2).roundToPx() - 4
            (top until bottom).map { y -> (left until right).map { x -> map[x, y] } }
        }
    }

    /** The pixels of segment [index]'s drawn area. */
    private fun segArea(index: Int): List<Color> = segRows(index).flatten()

    /** The first column of [rows] that holds a dark (text) pixel. */
    private fun firstDarkColumn(rows: List<List<Color>>): Int = rows.minOf { row -> row.indexOfFirst { it.red < 0.3f }.takeIf { it >= 0 } ?: Int.MAX_VALUE }

    private fun countNear(pixels: List<Color>, color: Color, tolerance: Float = PIXEL_TOLERANCE): Int = pixels.count { isClose(it, color, tolerance) }

    private fun differing(a: PixelMap, b: PixelMap): Int =
        (0 until minOf(a.height, b.height)).sumOf { y -> (0 until minOf(a.width, b.width)).count { x -> !isClose(a[x, y], b[x, y]) } }

    private fun assertSameAs(expected: PixelMap, actual: PixelMap, what: String) = assertEquals("$what: not one pixel differs", 0, differing(expected, actual))

    private fun isClose(actual: Color, expected: Color, tolerance: Float = PIXEL_TOLERANCE): Boolean =
        maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue)) <= tolerance

    private fun assertPixel(what: String, actual: Color, expected: Color) =
        assertTrue("$what: expected $expected but was $actual", isClose(actual, expected))

    /** The set padding of the system on stage (0 by default). */
    private val currentPadding: Dp get() = scene?.system?.segmentedButton?.setPadding ?: tokens.setPadding

    /** The divider width of the system on stage. */
    private val currentDivider: Dp get() = scene?.system?.segmentedButton?.dividerWidth ?: tokens.dividerWidth

    private companion object {
        const val STAGE_TAG = "stage"
        const val SET = "set"
        const val BEFORE = "before"
        const val AFTER = "after"
        val THREE = listOf("Day", "Week", "Month")
        val FOUR = listOf("Day", "Week", "Month", "Year")
        const val PIXEL_TOLERANCE = 2f / 255f
        val SET_HEIGHT = 36.dp
        val CLEAR = 8.dp
    }
}

/** SEG-16 and SEG-23 where motion is reduced (the animator duration scale is 0, see `TanreiButtonReducedMotionTest`). */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w480dp-h640dp-xhdpi")
class TanreiSegmentedButtonReducedMotionTest {
    private object NoMotion : MotionDurationScale {
        override val scaleFactor: Float = 0f
    }

    @get:Rule
    val rule = createComposeRule(effectContext = NoMotion)

    private var value by mutableStateOf("day")
    private var weekIcon = Color.Unspecified

    @Test
    fun `SEG-16 SEG-23 where motion is reduced the check and the colors change at once`() {
        val tanrei = TanreiSystem.Tanrei
        val colors = tanrei.colors.light
        val slow = tanrei.segmentedButton.copy(motionSelectionDuration = 1000, motionStateDuration = 1000)
        rule.setContent {
            TanreiTheme(system = tanrei.copy(segmentedButton = slow), theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                TanreiSegmentedButton(onSelectionChange = { value = it.single() }, contentDescription = "Range", selectedValue = value) {
                    TanreiSegment(value = "day", label = "Day", modifier = Modifier.testTag("seg-0"))
                    TanreiSegment(value = "week", label = "Week", modifier = Modifier.testTag("seg-1"), icon = { weekIcon = LocalTanreiContentColor.current })
                }
            }
        }
        rule.waitForIdle()
        rule.mainClock.autoAdvance = false
        value = "week"
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        repeat(3) { rule.mainClock.advanceTimeByFrame() }
        rule.onNodeWithTag("seg-1").assertIsSelected()
        assertEquals("the selected icon color at once", tanrei.segmentedButton.conditions.selected.enabled.iconColor.resolve(colors), weekIcon)
        rule.onNodeWithTag("seg-1").performMouseInput { moveTo(center) }
        repeat(3) { rule.mainClock.advanceTimeByFrame() }
        rule.mainClock.autoAdvance = true
    }
}
