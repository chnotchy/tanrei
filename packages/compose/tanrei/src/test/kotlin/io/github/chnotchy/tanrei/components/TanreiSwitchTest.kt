package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
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
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Canvas
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.ImageBitmapConfig
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.graphics.PixelMap
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.graphics.drawOutline
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertHasClickAction
import androidx.compose.ui.test.assertHasNoClickAction
import androidx.compose.ui.test.assertHeightIsEqualTo
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertWidthIsEqualTo
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.junit4.accessibility.enableAccessibilityChecks
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performMouseInput
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.test.tryPerformAccessibilityChecks
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.acme.design.Acme
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.primitives.TanreiText
import io.github.chnotchy.tanrei.primitives.tanreiContainerShape
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiIconGlyph
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.glyph
import io.github.chnotchy.tanrei.tokens.M3Like
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiFocusStyle
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiPressedFeedback
import io.github.chnotchy.tanrei.tokens.TanreiShadowLayer
import io.github.chnotchy.tanrei.tokens.TanreiSwitchCondition
import io.github.chnotchy.tanrei.tokens.TanreiSwitchConditionStateTokens
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import kotlin.math.abs
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TestRule
import org.junit.runner.RunWith
import org.junit.runners.model.Statement
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Behaviour tests for `specs/switch.spec.json`. Each test names the behaviour id (`SWT-n`) it covers. Pixel tests hide
 * the label: the switch is then its 48 dp target with the 36 × 20 track centered in it (6 dp in, 14 dp down), the
 * handle's center 10 dp from the track's end it rests at, and the 28 dp round layer centered on the handle.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiSwitchTest {
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
    private val tokens = tanrei.switch
    private val measure = tanrei.measure
    private val surface = colors[TanreiColorRole.Surface]

    /** Everything the switch emitted, in order: `change:true` … */
    private val events = mutableListOf<String>()
    private var checked by mutableStateOf(false)

    @Before
    fun setUp() {
        // ATF checks: NOT_RUN under Robolectric (see TanreiButtonTest); they run for real in the gallery's
        // instrumented tests. The explicit semantics assertions below guard accessibility here.
        rule.enableAccessibilityChecks()
    }

    private class Scene(
        val interactive: Boolean,
        val enabled: Boolean,
        val label: String,
        val labelHidden: Boolean,
        val icons: Boolean,
        val icon: (@Composable () -> Unit)?,
        val system: TanreiSystem,
        val direction: LayoutDirection,
        val width: Dp?,
    )

    private var scene by mutableStateOf<Scene?>(null)

    /**
     * One switch on the surface; [checked] starts at [initial] and follows the switch. [icons] gives the handle a glyph
     * in both positions ([icon], or [SolidGlyph] filling the icon box with the icon color).
     */
    private fun setSwitch(
        initial: Boolean = false,
        interactive: Boolean = true,
        enabled: Boolean = true,
        label: String = LABEL,
        labelHidden: Boolean = true,
        icons: Boolean = false,
        icon: (@Composable () -> Unit)? = null,
        system: TanreiSystem = tanrei,
        direction: LayoutDirection = LayoutDirection.Ltr,
        width: Dp? = null,
    ) {
        checked = initial
        val first = scene == null
        scene = Scene(interactive, enabled, label, labelHidden, icons, icon, system, direction, width)
        if (!first) {
            rule.waitForIdle()
            return
        }
        rule.setContent {
            val current = scene ?: return@setContent
            key(current) {
                CompositionLocalProvider(LocalLayoutDirection provides current.direction) {
                    TanreiTheme(system = current.system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                        Box(Modifier.background(TanreiColorRole.Surface.color).padding(TanreiTheme.tokens.space.space200)) {
                            TanreiSwitch(
                                checked = checked,
                                onCheckedChange = if (current.interactive) { value -> events += "change:$value"; checked = value } else null,
                                label = current.label,
                                modifier = Modifier.testTag(TAG).then(current.width?.let { Modifier.width(it) } ?: Modifier),
                                enabled = current.enabled,
                                labelHidden = current.labelHidden,
                                thumbContent = if (current.icons) (current.icon ?: { SolidGlyph() }) else null,
                            )
                        }
                    }
                }
            }
        }
    }

    private fun switch() = rule.onNodeWithTag(TAG)

    // ── SWT-14: semantics ────────────────────────────────────────────────────

    @Test
    fun `SWT-14 a switch is role switch with an on or off state, named by its label, and passes accessibility checks`() {
        setSwitch(labelHidden = false)
        switch()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Switch))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.ToggleableState, ToggleableState.Off))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Text, listOf(AnnotatedString(LABEL))))
            .assertHasClickAction()
            .assertIsEnabled()
        switch().performClick()
        rule.waitForIdle()
        switch().assert(SemanticsMatcher.expectValue(SemanticsProperties.ToggleableState, ToggleableState.On))
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    @Test
    fun `SWT-14 the glyph is not exposed - a ligature drawn as text is not announced`() {
        setSwitch(initial = true, labelHidden = false, icons = true, icon = { TanreiText("check") })
        switch()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Text, listOf(AnnotatedString(LABEL))))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Switch))
    }

    @Test
    fun `SWT-14 without onCheckedChange it only displays - no click action and no toggle state`() {
        setSwitch(initial = true, interactive = false)
        switch().assertHasNoClickAction().assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.ToggleableState))
        assertPixel("still drawn on", pixel(HANDLE_ON, CENTER_Y), colors[TanreiColorRole.OnPrimary])
    }

    // ── SWT-1: activation ────────────────────────────────────────────────────

    @Test
    fun `SWT-1 a tap switches it and emits change exactly once with the new value`() {
        setSwitch()
        switch().performClick()
        rule.waitForIdle()
        assertEquals(listOf("change:true"), events)
        switch().performClick()
        rule.waitForIdle()
        assertEquals(listOf("change:true", "change:false"), events)
    }

    @Test
    fun `SWT-1 SWT-5 a tap on the visible label switches it too`() {
        setSwitch(labelHidden = false)
        val label = rule.onNodeWithText(LABEL, useUnmergedTree = true).getUnclippedBoundsInRoot()
        val node = switch().getUnclippedBoundsInRoot()
        switch().performTouchInput {
            down(Offset(((label.left + label.right) / 2 - node.left).toPx(), ((label.top + label.bottom) / 2 - node.top).toPx())); up()
        }
        rule.waitForIdle()
        assertEquals(listOf("change:true"), events)
    }

    @Test
    @KeyboardNavigation
    fun `SWT-1 Space and Enter each switch it on Android, exactly once`() {
        setSwitch()
        switch().requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        switch().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals(listOf("change:true", "change:false"), events)
    }

    @Test
    fun `SWT-1 an assistive technology click switches it exactly once`() {
        setSwitch()
        switch().performSemanticsAction(SemanticsActions.OnClick)
        rule.waitForIdle()
        assertEquals(listOf("change:true"), events)
    }

    // ── SWT-2: disabled ──────────────────────────────────────────────────────

    @Test
    fun `SWT-2 a disabled switch does not change or emit, from the track or from its label`() {
        setSwitch(initial = true, enabled = false, labelHidden = false)
        switch().performTouchInput { down(Offset(TRACK_START.toPx() + 4.dp.toPx(), centerY)); up() }
        switch().performTouchInput { down(Offset(width - 4.dp.toPx(), centerY)); up() }
        rule.waitForIdle()
        assertEquals(emptyList<String>(), events)
        assertTrue(checked)
    }

    @Test
    @KeyboardNavigation
    fun `SWT-2 a disabled switch is not focusable and exposes the disabled state`() {
        setSwitch(enabled = false, labelHidden = false)
        switch()
            .assertIsNotEnabled()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Switch))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Focused))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsActions.RequestFocus))
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    // ── SWT-3: the state's tokens, for every part ────────────────────────────

    @Test
    fun `SWT-3 pressed and hovered draw the container from the condition's state tokens, and a tap does not select focused`() {
        setSwitch(initial = true)
        switch().performTouchInput { down(center) }
        rule.waitForIdle()
        assertContainer(tokens.conditions.selected.pressed.containerColor, HANDLE_ON)
        switch().performTouchInput { up() }
        rule.waitForIdle()
        // The tap switched it off: the layer moved with the handle to the start.
        assertContainer(tokens.conditions.unselected.enabled.containerColor, HANDLE_OFF)
        switch().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainer(tokens.conditions.unselected.hovered.containerColor, HANDLE_OFF)
    }

    @Test
    fun `SWT-3 in the default system the state layer is the condition's outline color mixed into the transparent container`() {
        setSwitch(initial = true)
        switch().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainerColor(colors[TanreiColorRole.Primary].copy(alpha = tanrei.state.hoverStateLayerOpacity).compositeOver(surface), HANDLE_ON)
    }

    @Test
    fun `SWT-3 track, outline, handle color, handle size, handle elevation and icon come from the state's tokens`() {
        val raised = listOf(TanreiShadowLayer(x = 0.dp, y = 2.dp, blur = 0.dp, spread = 0.dp, role = TanreiColorRole.Error))
        val system = tanrei.withCondition(TanreiSwitchCondition.Unselected, TanreiInteractionState.Hovered) {
            it.copy(
                trackColor = TanreiPaint.Role(TanreiColorRole.Success),
                outlineColor = TanreiPaint.Role(TanreiColorRole.Warning),
                handleColor = TanreiPaint.Role(TanreiColorRole.Info),
                handleSize = 18.dp,
                handleElevation = raised,
                iconColor = TanreiPaint.Role(TanreiColorRole.Link),
            )
        }
        setSwitch(system = system, icons = true)
        switch().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertPixel("hovered track", trackProbe(HANDLE_OFF), colors[TanreiColorRole.Success])
        assertPixel("hovered outline", outlineProbe(), colors[TanreiColorRole.Warning])
        assertPixel("hovered handle, 18 across (with the glyph 16): a whole pixel 8 from its center", pixel(HANDLE_OFF + 8.dp, CENTER_Y), colors[TanreiColorRole.Info])
        assertPixel("hovered icon", pixel(HANDLE_OFF, CENTER_Y), colors[TanreiColorRole.Link])
        assertPixel("the hovered elevation: a hard shadow 2 below the handle", pixel(HANDLE_OFF, CENTER_Y + 9.dp + 1.dp), colors[TanreiColorRole.Error])
    }

    @Test
    @KeyboardNavigation
    fun `SWT-3 under acme, which values hovered, focused and pressed differently - pressed wins over focused wins over hovered, in pixels`() {
        val acme = TanreiSystem.Acme.let { it.copy(measure = it.measure.copy(focusInnerWidth = 0.dp, focusOuterWidth = 0.dp)) }
        val unselected = acme.switch.conditions.unselected
        val acmeColors = acme.colors.light
        fun over(paint: TanreiPaint) = paint.resolve(acmeColors).compositeOver(acmeColors[TanreiColorRole.Surface])
        val all = listOf(unselected.enabled, unselected.hovered, unselected.focused, unselected.pressed).map { over(it.containerColor) }
        assertEquals("acme tells the four states apart", 4, all.toSet().size)

        setSwitch(system = acme)
        switch().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainerColor(over(unselected.hovered.containerColor), HANDLE_OFF)
        switch().requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertContainerColor(over(unselected.focused.containerColor), HANDLE_OFF)
        switch().performKeyInput { keyDown(Key.Spacebar) }
        rule.waitForIdle()
        assertContainerColor(over(unselected.pressed.containerColor), HANDLE_OFF)
        switch().performKeyInput { keyUp(Key.Spacebar) }
        rule.waitForIdle()
        assertContainerColor(over(acme.switch.conditions.selected.focused.containerColor), HANDLE_ON)
        assertEquals(listOf("change:true"), events)
    }

    @Test
    fun `SWT-3 m3-like grows the handle under a press, at once`() {
        val m3 = TanreiSystem.M3Like
        val m3Tokens = m3.switch
        val unselected = m3Tokens.conditions.unselected
        assertTrue("m3-like's pressed handle is larger", unselected.pressed.handleSize > unselected.enabled.handleSize)
        setSwitch(system = m3)
        // m3-like's track is 52 wide: wider than the target, so the switch is the track's width and 48 tall.
        val handle = m3Tokens.trackHeight / 2
        val centerY = measure.targetTouch / 2
        val between = handle + (unselected.enabled.handleSize / 2 + unselected.pressed.handleSize / 2) / 2
        val m3Colors = m3.colors.light
        assertTrue("at rest, beside the handle, is not the handle", !isClose(pixel(between, centerY), unselected.enabled.handleColor.resolve(m3Colors)))
        rule.mainClock.autoAdvance = false
        switch().performTouchInput { down(Offset(handle.toPx(), centerY.toPx())) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("pressed, the grown handle reaches it on the next frame", pixel(between, centerY), unselected.pressed.handleColor.resolve(m3Colors))
        switch().performTouchInput { up() }
    }

    @Test
    fun `SWT-3 a hover recolors the track, outline and handle over the state motion, not the selection motion`() {
        val slow = tokens.motionStateDuration * 20
        val system = tanrei.copy(switch = tokens.copy(motionSelectionDuration = slow))
            .withCondition(TanreiSwitchCondition.Unselected, TanreiInteractionState.Hovered) {
                it.copy(trackColor = TanreiPaint.Role(TanreiColorRole.Success), outlineColor = TanreiPaint.Role(TanreiColorRole.Warning), handleColor = TanreiPaint.Role(TanreiColorRole.Info))
            }
        setSwitch(system = system)
        rule.mainClock.autoAdvance = false
        switch().performMouseInput { moveTo(center) }
        rule.mainClock.advanceTimeBy(tokens.motionStateDuration * 2L)
        assertPixel("the hovered track after the state duration", trackProbe(HANDLE_OFF), colors[TanreiColorRole.Success])
        assertPixel("the hovered outline", outlineProbe(), colors[TanreiColorRole.Warning])
        assertPixel("the hovered handle", pixel(HANDLE_OFF, CENTER_Y), colors[TanreiColorRole.Info])
    }

    // ── SWT-4: focus ring around the track ───────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `SWT-4 keyboard focus shows the focus ring around the track on the first frame`() {
        setSwitch()
        assertPixel("no ring before focus", pixel(TRACK_MIDDLE, ringCenter()), surface)
        rule.mainClock.autoAdvance = false
        switch().requestFocus()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("the ring at full color on the first frame, around the track", pixel(TRACK_MIDDLE, ringCenter()), colors[TanreiColorRole.FocusRing])
    }

    @Test
    fun `SWT-4 a pointer press does not show the focus ring`() {
        setSwitch()
        switch().performTouchInput { down(center) }
        rule.waitForIdle()
        assertPixel("no ring", pixel(TRACK_MIDDLE, ringCenter()), surface)
    }

    // ── SWT-5: the target ────────────────────────────────────────────────────

    @Test
    fun `SWT-5 without a visible label the switch is the touch target on both axes, and a tap in its corner switches it`() {
        setSwitch()
        switch().assertWidthIsEqualTo(measure.targetTouch).assertHeightIsEqualTo(measure.targetTouch)
        switch().performTouchInput { down(Offset(1f, 1f)); up() }
        rule.waitForIdle()
        assertEquals(listOf("change:true"), events)
    }

    @Test
    fun `SWT-5 with a label the row is at least the target tall, and the target size comes from the system`() {
        setSwitch(labelHidden = false)
        switch().assertHeightIsEqualTo(measure.targetTouch)
        val target = 60.dp
        setSwitch(system = tanrei.copy(measure = measure.copy(targetTouch = target)))
        switch().assertWidthIsEqualTo(target).assertHeightIsEqualTo(target)
    }

    // ── SWT-6: disabled draws the disabled tokens ────────────────────────────

    @Test
    fun `SWT-6 disabled draws the disabled tokens - a faded track and outline as one fill, the handle apart, no grey disc`() {
        val track = colors[TanreiColorRole.OnSurface].copy(alpha = tanrei.state.disabledContainerOpacity).compositeOver(surface)
        setSwitch(enabled = false)
        assertPixel("off: the faded track", trackProbe(HANDLE_OFF), track)
        assertPixel("off: its outline is the same fill", outlineProbe(), track)
        assertPixel("off: the handle in faded content, over the faded track", pixel(HANDLE_OFF, CENTER_Y), colors[TanreiColorRole.OnSurface].copy(alpha = tanrei.state.disabledContentOpacity).compositeOver(track))
        assertContainerColor(surface, HANDLE_OFF)
        setSwitch(initial = true, enabled = false)
        assertPixel("on: the faded track", trackProbe(HANDLE_ON), track)
        assertPixel("on: the handle in surface", pixel(HANDLE_ON, CENTER_Y), surface)
    }

    @Test
    fun `SWT-6 the disabled opacity token dims the whole switch, and disabled ignores hover`() {
        val opacity = 0.5f
        val system = tanrei.copy(switch = tokens.copy(disabled = tokens.disabled.copy(opacity = opacity)))
            .withCondition(TanreiSwitchCondition.Selected, TanreiInteractionState.Disabled) { it.copy(handleColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        setSwitch(initial = true, enabled = false, system = system)
        val expected = colors[TanreiColorRole.Error].copy(alpha = opacity).compositeOver(surface)
        assertPixel("dimmed handle", pixel(HANDLE_ON, CENTER_Y), expected)
        switch().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertPixel("hover changes nothing", pixel(HANDLE_ON, CENTER_Y), expected)
    }

    // ── SWT-7: pressed at once, held for press-hold ──────────────────────────

    @Test
    fun `SWT-7 a tap that ends at once shows the pressed state on the next frame and keeps it for press-hold`() {
        // The pressed tokens give the track a color of their own, so "pressed" is a pixel of the track above the
        // handle, wherever the handle is on its way.
        var system = tanrei
        for (condition in listOf(TanreiSwitchCondition.Unselected, TanreiSwitchCondition.Selected)) {
            system = system.withCondition(condition, TanreiInteractionState.Pressed) { it.copy(trackColor = TanreiPaint.Role(TanreiColorRole.Error), containerColor = TanreiPaint.None) }
        }
        setSwitch(system = system)
        val hold = tanrei.motion.duration.pressHold.toLong()
        val error = colors[TanreiColorRole.Error]
        rule.mainClock.autoAdvance = false
        switch().performTouchInput { down(center); up() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("pressed on the next frame", pixel(TRACK_MIDDLE, TRACK_FILL_TOP), error)
        rule.mainClock.advanceTimeBy(hold / 2)
        assertPixel("still pressed", pixel(TRACK_MIDDLE, TRACK_FILL_TOP), error)
        rule.mainClock.advanceTimeBy(hold + tokens.motionSelectionDuration * 2L)
        assertPixel("released", pixel(TRACK_MIDDLE, TRACK_FILL_TOP), colors[TanreiColorRole.Primary])
        assertEquals(listOf("change:true"), events)
    }

    @Test
    @KeyboardNavigation
    fun `SWT-7 Space shows the pressed state for press-hold too`() {
        val acme = TanreiSystem.Acme.let { it.copy(measure = it.measure.copy(focusInnerWidth = 0.dp, focusOuterWidth = 0.dp)) }
        val acmeColors = acme.colors.light
        fun over(paint: TanreiPaint) = paint.resolve(acmeColors).compositeOver(acmeColors[TanreiColorRole.Surface])
        setSwitch(system = acme)
        switch().requestFocus().assertIsFocused()
        rule.waitForIdle()
        rule.mainClock.autoAdvance = false
        switch().performKeyInput { pressKey(Key.Spacebar) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        // The handle is on its way: probe the layer where it starts.
        assertPixel("pressed", pixel(HANDLE_OFF - 6.dp, CONTAINER_SIDE), over(acme.switch.conditions.selected.pressed.containerColor))
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        assertContainerColor(over(acme.switch.conditions.selected.focused.containerColor), HANDLE_ON)
        assertEquals(listOf("change:true"), events)
    }

    // ── SWT-8: pressed-feedback ──────────────────────────────────────────────

    private fun TanreiSystem.answering(feedback: TanreiPressedFeedback) = copy(behavior = behavior.copy(pressedFeedback = feedback))

    @Test
    fun `SWT-8 overlay is the default - the pressed container applies at once, on both sides of the handle`() {
        assertEquals(TanreiPressedFeedback.Overlay, tanrei.behavior.pressedFeedback)
        setSwitch(system = tanrei.withCondition(TanreiSwitchCondition.Unselected, TanreiInteractionState.Pressed) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) })
        rule.mainClock.autoAdvance = false
        switch().performTouchInput { down(Offset((HANDLE_OFF - 6.dp).toPx(), CONTAINER_SIDE.toPx())) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("left of the handle", pixel(HANDLE_OFF - 6.dp, CONTAINER_SIDE), colors[TanreiColorRole.Error])
        assertPixel("right of the handle, at once", pixel(HANDLE_OFF + 6.dp, CONTAINER_SIDE), colors[TanreiColorRole.Error])
    }

    @Test
    fun `SWT-8 ripple grows the condition's pressed container color from the point of contact, then fades`() {
        val system = tanrei.answering(TanreiPressedFeedback.Ripple)
            .withCondition(TanreiSwitchCondition.Unselected, TanreiInteractionState.Pressed) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        setSwitch(system = system)
        val pressed = colors[TanreiColorRole.Error]
        val near = HANDLE_OFF - 6.dp
        val far = HANDLE_OFF + 6.dp
        rule.mainClock.autoAdvance = false
        // The press is cancelled, not released: the switch must not switch, so the layer stays where it is.
        switch().performTouchInput { down(Offset(near.toPx(), CONTAINER_SIDE.toPx())) }
        rule.mainClock.advanceTimeBy(50)
        assertPixel("the layer has reached the point of contact", pixel(near, CONTAINER_SIDE), pressed)
        assertPixel("but not the far side", pixel(far, CONTAINER_SIDE), surface)
        rule.mainClock.advanceTimeBy(tokens.motionFeedbackDuration.toLong())
        assertPixel("the far side once grown", pixel(far, CONTAINER_SIDE), pressed)
        switch().performTouchInput { cancel() }
    }

    @Test
    fun `SWT-8 under ripple a press on the label, outside the container, grows the layer from the container's center`() {
        val system = tanrei.answering(TanreiPressedFeedback.Ripple)
            .withCondition(TanreiSwitchCondition.Unselected, TanreiInteractionState.Pressed) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        setSwitch(system = system, labelHidden = false)
        val error = colors[TanreiColorRole.Error]
        // With the label shown the track starts the row: the off handle's layer is centered at (10, 24); probe it
        // above the track, 6 dp to either side of that center.
        val handle = tokens.trackHeight / 2
        val left = handle - 6.dp
        val right = handle + 6.dp
        rule.mainClock.autoAdvance = false
        switch().performTouchInput { down(Offset(width - 4.dp.toPx(), centerY)) }
        var frames = 0
        while (!isClose(pixel(right, CONTAINER_SIDE), error)) {
            assertTrue("the layer reaches the side nearer the label", frames++ < tokens.motionFeedbackDuration / FRAME_MILLIS + 2)
            rule.mainClock.advanceTimeByFrame()
        }
        assertPixel("it reached the other side in the same frame: it grew from the center", pixel(left, CONTAINER_SIDE), error)
        switch().performTouchInput { cancel() }
    }

    /** Off's pressed state differs from hovered in track (success), handle (warning) and opacity; hovered's container is info. */
    private fun pressedDiffersEverywhere(feedback: TanreiPressedFeedback): TanreiSystem =
        tanrei.answering(feedback)
            .withCondition(TanreiSwitchCondition.Unselected, TanreiInteractionState.Hovered) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Info)) }
            .withCondition(TanreiSwitchCondition.Unselected, TanreiInteractionState.Pressed) {
                it.copy(trackColor = TanreiPaint.Role(TanreiColorRole.Success), handleColor = TanreiPaint.Role(TanreiColorRole.Warning))
            }
            .let { it.copy(switch = it.switch.copy(pressed = it.switch.pressed.copy(opacity = PRESSED_OPACITY))) }

    private fun assertOnlyTheContainerColorStays(feedback: TanreiPressedFeedback) {
        setSwitch(system = pressedDiffersEverywhere(feedback))
        fun dimmed(color: Color) = color.copy(alpha = PRESSED_OPACITY).compositeOver(surface)
        val hovered = colors[TanreiColorRole.Info]
        switch().performMouseInput { moveTo(Offset((HANDLE_OFF + 6.dp).toPx(), CONTAINER_SIDE.toPx())) }
        rule.waitForIdle()
        assertContainerColor(hovered, HANDLE_OFF)
        rule.mainClock.autoAdvance = false
        switch().performMouseInput { press() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertContainerColor(dimmed(hovered), HANDLE_OFF)
        assertPixel("the pressed track", trackProbe(HANDLE_OFF), dimmed(colors[TanreiColorRole.Success]))
        assertPixel("the pressed handle", pixel(HANDLE_OFF, CENTER_Y), dimmed(colors[TanreiColorRole.Warning]))
        switch().performMouseInput { release() }
    }

    @Test
    fun `SWT-8 under ripple only the container color stays with the state under the press`() = assertOnlyTheContainerColorStays(TanreiPressedFeedback.Ripple)

    @Test
    fun `SWT-8 under dim only the container color stays with the state under the press`() = assertOnlyTheContainerColorStays(TanreiPressedFeedback.Dim)

    @Test
    fun `SWT-8 under none every part stays with the state under the press`() {
        setSwitch(system = pressedDiffersEverywhere(TanreiPressedFeedback.None))
        switch().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val hovered = switch().captureToImage().toPixelMap()
        rule.mainClock.autoAdvance = false
        switch().performMouseInput { press() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        val pressed = switch().captureToImage().toPixelMap()
        val differing = (0 until hovered.height).sumOf { y -> (0 until hovered.width).count { x -> !isClose(hovered[x, y], pressed[x, y]) } }
        assertEquals("not one pixel answers the press", 0, differing)
        switch().performMouseInput { release() }
    }

    // ── SWT-9: corner smoothing and focus style ──────────────────────────────

    @Test
    fun `SWT-9 a pill track is unchanged by corner smoothing, and a track given a smaller corner eases it - Figma's construction at 0_6`() {
        val radius = tokens.trackHeight / 2 / 1.6f
        val system = tanrei.copy(shape = tanrei.shape.copy(cornerSmoothing = 0.6f), switch = tokens.copy(trackShape = radius))
            .withCondition(TanreiSwitchCondition.Selected, TanreiInteractionState.Enabled) { it.copy(trackColor = TanreiPaint.Role(TanreiColorRole.Error), outlineColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        // On: the handle rests at the end, clear of the start corner.
        setSwitch(initial = true, system = system)
        val error = colors[TanreiColorRole.Error]
        val map = switch().captureToImage().toPixelMap()
        with(rule.density) {
            val left = TRACK_START.roundToPx()
            val top = TRACK_TOP.roundToPx()
            val width = tokens.trackWidth.roundToPx()
            val height = tokens.trackHeight.roundToPx()
            val outline = tanreiContainerShape(radius, 0.6f).createOutline(Size(width.toFloat(), height.toFloat()), LayoutDirection.Ltr, this)
            val expected = ImageBitmap(width, height, ImageBitmapConfig.Argb8888)
            Canvas(expected).drawOutline(outline, Paint().apply { color = Color.Black })
            val expectedMap = expected.toPixelMap()
            val box = (radius * 2).roundToPx()
            var worst = 0f
            for (y in 0 until box) for (x in 0 until box) worst = maxOf(worst, abs(tintOf(map[left + x, top + y], surface, error) - expectedMap[x, y].alpha))
            assertTrue("the worst pixel is $worst off the smoothed outline's own coverage", worst <= COVERAGE_TOLERANCE)
        }
    }

    @Test
    @KeyboardNavigation
    fun `SWT-9 glow draws the focus colors as a soft halo around the track under acme`() {
        val acme = TanreiSystem.Acme
        assertEquals(TanreiFocusStyle.Glow, acme.behavior.focusStyle)
        val ring = acme.colors.light[TanreiColorRole.FocusRing]
        val acmeSurface = acme.colors.light[TanreiColorRole.Surface]
        val m = acme.measure
        setSwitch(system = acme)
        switch().requestFocus().assertIsFocused()
        rule.waitForIdle()
        // Along the track's top, past the layer around the handle.
        val x = TRACK_START + tokens.trackWidth - 6.dp
        val inBand = pixel(x, TRACK_TOP - (m.focusOffset + m.focusInnerWidth + m.focusOuterWidth / 4))
        assertTrue("the halo carries the focus color: $inBand", tintOf(inBand, acmeSurface, ring) > 0.7f)
        val beyond = tintOf(pixel(x, TRACK_TOP - (m.focusOffset + m.focusInnerWidth + m.focusOuterWidth * 1.5f)), acmeSurface, ring)
        assertTrue("soft beyond the hard edge: $beyond", beyond > 0.05f && beyond < 0.4f)
    }

    // ── SWT-10: geometry ─────────────────────────────────────────────────────

    @Test
    fun `SWT-10 the track is track-width by track-height, its outline inside the edge and its fill inside the outline`() {
        setSwitch()
        val outline = colors[TanreiColorRole.Outline]
        val track = colors[TanreiColorRole.SurfaceContainerHighest]
        with(rule.density) {
            val map = switch().captureToImage().toPixelMap()
            val x = TRACK_MIDDLE.roundToPx()
            val top = TRACK_TOP.roundToPx()
            val bottom = (TRACK_TOP + tokens.trackHeight).roundToPx()
            val width = tokens.outlineWidth.roundToPx()
            assertPixel("above the track", map[x, top - 1], surface)
            assertPixel("the outline's first row", map[x, top], outline)
            assertPixel("the outline's last row", map[x, top + width - 1], outline)
            assertPixel("the fill inside it", map[x, top + width], track)
            assertPixel("the bottom outline", map[x, bottom - 1], outline)
            assertPixel("below the track", map[x, bottom], surface)
            // The round end: anti-aliased, so coverage.
            val y = CENTER_Y.roundToPx()
            val right = (TRACK_START + tokens.trackWidth).roundToPx()
            assertTrue("the end outline", tintOf(map[right - 1, y], surface, outline) >= 0.8f)
            assertTrue("right of the track", tintOf(map[right, y], surface, outline) <= 0.2f)
        }
    }

    @Test
    fun `SWT-10 the handle's center is half the track height from the end it rests at`() {
        setSwitch(system = tracked())
        assertEquals("off: centered half the track height from the start", HANDLE_OFF.value, handleCenterX().value, 0.5f)
        setSwitch(initial = true, system = tracked())
        assertEquals("on: centered half the track height from the end", HANDLE_ON.value, handleCenterX().value, 0.5f)
        val map = switch().captureToImage().toPixelMap()
        val y = with(rule.density) { CENTER_Y.roundToPx() }
        val across = (0 until map.width).count { x -> isClose(map[x, y], colors[TanreiColorRole.Error]) }
        with(rule.density) { assertEquals("the handle is handle-size across", tokens.conditions.selected.enabled.handleSize.toPx(), across.toFloat(), 2f) }
    }

    @Test
    fun `SWT-10 the round container is centered on the handle and reaches past the track without affecting layout`() {
        setSwitch(labelHidden = false)
        val node = switch().getUnclippedBoundsInRoot()
        val label = rule.onNodeWithText(LABEL, useUnmergedTree = true).getUnclippedBoundsInRoot()
        assertEquals("the label starts at the track's end plus the gap, not the layer's", (node.left + tokens.trackWidth + tokens.labelGap).value, label.left.value, 0.5f)
        setSwitch()
        switch().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val layer = tokens.conditions.unselected.hovered.containerColor.resolve(colors).compositeOver(surface)
        val above = TRACK_TOP - (tokens.containerSize - tokens.trackHeight) / 4
        assertPixel("the layer above the track, over the handle", pixel(HANDLE_OFF, above), layer)
        assertPixel("not above the other end", pixel(HANDLE_ON, above), surface)
    }

    // ── SWT-11: right-to-left ────────────────────────────────────────────────

    @Test
    fun `SWT-11 right-to-left mirrors the handle - off at the right end, on at the left - and the label`() {
        setSwitch(direction = LayoutDirection.Rtl)
        val offHandle = tokens.conditions.unselected.enabled.handleColor.resolve(colors)
        assertPixel("off: the handle at the right", pixel(HANDLE_ON, CENTER_Y), offHandle)
        assertTrue("off: not at the left", !isClose(pixel(HANDLE_OFF, CENTER_Y), offHandle))
        setSwitch(initial = true, direction = LayoutDirection.Rtl)
        assertPixel("on: the handle at the left", pixel(HANDLE_OFF, CENTER_Y), colors[TanreiColorRole.OnPrimary])
        setSwitch(labelHidden = false, direction = LayoutDirection.Rtl)
        val node = switch().getUnclippedBoundsInRoot()
        val label = rule.onNodeWithText(LABEL, useUnmergedTree = true).getUnclippedBoundsInRoot()
        assertEquals("the label to the track's left", (node.right - tokens.trackWidth - tokens.labelGap).value, label.right.value, 0.5f)
    }

    @Test
    fun `SWT-11 right-to-left mirrors the travel - switching on moves the handle leftwards`() {
        setSwitch(direction = LayoutDirection.Rtl, system = tracked())
        rule.mainClock.autoAdvance = false
        switch().performTouchInput { down(center) }
        rule.mainClock.advanceTimeByFrame()
        switch().performTouchInput { up() }
        rule.mainClock.advanceTimeBy(tokens.motionSelectionDuration / 3L)
        val middle = handleCenterX()
        assertTrue("on its way it is between the ends: $middle", middle < HANDLE_ON - 1.dp && middle > HANDLE_OFF + 1.dp)
        rule.mainClock.advanceTimeBy(tokens.motionSelectionDuration * 2L)
        assertEquals(HANDLE_OFF.value, handleCenterX().value, 0.5f)
    }

    // ── SWT-12: the glyph ────────────────────────────────────────────────────

    private var seenGlyph: TanreiIconGlyph? = null
    private var seenColor: Color = Color.Unspecified
    private var seenBox: IntSize = IntSize.Zero

    private val probeIcon: @Composable () -> Unit = {
        seenGlyph = LocalTanreiIconGlyph.current
        seenColor = LocalTanreiContentColor.current
        Box(Modifier.fillMaxSize().onSizeChanged { seenBox = it })
    }

    @Test
    fun `SWT-12 while it shows a glyph the handle is at least size-with-icon, and the slot gets the glyph of its selection at icon-size`() {
        assertTrue(tokens.handleSizeWithIcon > tokens.conditions.unselected.enabled.handleSize)
        setSwitch(icons = true, icon = probeIcon)
        rule.waitForIdle()
        with(rule.density) { assertEquals("the icon box", IntSize(tokens.iconSize.roundToPx(), tokens.iconSize.roundToPx()), seenBox) }
        assertEquals("off: the unselected glyph", tanrei.icon.glyph(tokens.iconSize, selected = false), seenGlyph)
        assertEquals("the icon color of the condition", tokens.conditions.unselected.enabled.iconColor.resolve(colors), seenColor)
        val handle = tokens.conditions.unselected.enabled.handleColor.resolve(colors)
        assertPixel("the handle reaches size-with-icon", pixel(HANDLE_OFF + tokens.handleSizeWithIcon / 2 - 1.dp, CENTER_Y), handle)
        checked = true
        rule.waitForIdle()
        assertEquals("on: the selected glyph", tanrei.icon.glyph(tokens.iconSize, selected = true), seenGlyph)
        assertEquals(1f, seenGlyph!!.fill)
    }

    @Test
    fun `SWT-12 without a glyph the handle keeps its condition's size`() {
        setSwitch()
        val handle = tokens.conditions.unselected.enabled.handleColor.resolve(colors)
        assertTrue("beyond the bare handle is not the handle", !isClose(pixel(HANDLE_OFF + tokens.handleSizeWithIcon / 2 - 1.dp, CENTER_Y), handle))
    }

    // ── SWT-13: travel and colors over selection-duration ────────────────────

    /**
     * [base] with a handle drawn in `error` in both conditions, at rest and pressed, and no pressed layer: the handle is
     * then the only `error` on the track's midline, wherever it is on its way.
     */
    private fun tracked(base: TanreiSystem = tanrei): TanreiSystem {
        var system = base
        for (condition in listOf(TanreiSwitchCondition.Unselected, TanreiSwitchCondition.Selected)) {
            system = system.withCondition(condition, TanreiInteractionState.Enabled) { it.copy(handleColor = TanreiPaint.Role(TanreiColorRole.Error)) }
                .withCondition(condition, TanreiInteractionState.Pressed) { it.copy(handleColor = TanreiPaint.Role(TanreiColorRole.Error), containerColor = TanreiPaint.None) }
        }
        return system
    }

    /** Where the handle's center is now: the middle of the `error` pixels on the track's midline (see [tracked]). */
    private fun handleCenterX(): Dp {
        val map = switch().captureToImage().toPixelMap()
        val y = with(rule.density) { CENTER_Y.roundToPx() }
        val error = colors[TanreiColorRole.Error]
        val xs = (0 until map.width).filter { x -> isClose(map[x, y], error) }
        assertTrue("the handle is on the midline", xs.isNotEmpty())
        return with(rule.density) { ((xs.first() + xs.last() + 1) / 2f).toDp() }
    }

    @Test
    fun `SWT-13 the handle travels along the track over selection-duration, and the track color moves with it`() {
        setSwitch(system = tracked())
        rule.mainClock.autoAdvance = false
        switch().performTouchInput { down(center) }
        rule.mainClock.advanceTimeByFrame()
        switch().performTouchInput { up() }
        rule.mainClock.advanceTimeBy(tokens.motionSelectionDuration / 3L)
        val middle = handleCenterX()
        assertTrue("on its way: $middle", middle > HANDLE_OFF + 1.dp && middle < HANDLE_ON - 1.dp)
        val track = trackProbe(HANDLE_OFF)
        assertTrue("the track color is on its way: $track", !isClose(track, colors[TanreiColorRole.SurfaceContainerHighest]) && !isClose(track, colors[TanreiColorRole.Primary]))
        rule.mainClock.advanceTimeBy(tokens.motionSelectionDuration * 2L + tanrei.motion.duration.pressHold)
        assertEquals("arrived", HANDLE_ON.value, handleCenterX().value, 0.5f)
        assertPixel("the track", trackProbe(HANDLE_ON), colors[TanreiColorRole.Primary])
    }

    @Test
    fun `SWT-13 the travel takes the switch's own selection duration`() {
        val slow = tokens.motionSelectionDuration * 4
        setSwitch(system = tracked(tanrei.copy(switch = tokens.copy(motionSelectionDuration = slow, motionSelectionEasing = tanrei.motion.easing.linear))))
        rule.mainClock.autoAdvance = false
        switch().performTouchInput { down(center) }
        rule.mainClock.advanceTimeByFrame()
        switch().performTouchInput { up() }
        rule.mainClock.advanceTimeBy(tokens.motionSelectionDuration.toLong())
        assertTrue("not there after the default duration", handleCenterX() < HANDLE_ON - 2.dp)
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertEquals("there after its own", HANDLE_ON.value, handleCenterX().value, 0.5f)
    }

    @Test
    fun `the condition lookup is total - a condition the system does not have reads unselected`() {
        val unknown = TanreiSwitchCondition("mixed")
        assertFalse(unknown in tokens.conditions)
        assertEquals(tokens.conditions.unselected, tokens.conditions[unknown])
        assertEquals(listOf("unselected", "selected"), tokens.conditions.keys.map { it.key })
    }

    // ── SWT-15: the label ────────────────────────────────────────────────────

    @Test
    fun `SWT-15 the label is drawn at the track's inline end, label-gap away, its first line centered on the track`() {
        setSwitch(labelHidden = false)
        val node = switch().getUnclippedBoundsInRoot()
        val label = rule.onNodeWithText(LABEL, useUnmergedTree = true).getUnclippedBoundsInRoot()
        assertEquals((node.left + tokens.trackWidth + tokens.labelGap).value, label.left.value, 0.5f)
        val trackCenter = node.top + measure.targetTouch / 2
        assertEquals("centered together", trackCenter.value, ((label.top + label.bottom) / 2).value, 1f)
    }

    @Test
    fun `SWT-15 a long label wraps rather than truncating`() {
        val long = "Use Wi-Fi networks you have joined before to find where you are, even when the location switch is off"
        setSwitch(labelHidden = false, label = long, width = 180.dp)
        val label = rule.onNodeWithText(long, useUnmergedTree = true).getUnclippedBoundsInRoot()
        val lineHeight = with(rule.density) { tokens.labelTypescale.lineHeight.toDp() }
        assertTrue("wrapped onto several lines: ${label.bottom - label.top}", label.bottom - label.top > lineHeight * 2)
    }

    @Test
    fun `SWT-15 a wrapping label's FIRST line is centered on the track`() {
        val long = "Use Wi-Fi networks you have joined before to find where you are, even when the location switch is off"
        setSwitch(labelHidden = false, label = long, width = 180.dp)
        val node = switch().getUnclippedBoundsInRoot()
        val label = rule.onNodeWithText(long, useUnmergedTree = true).getUnclippedBoundsInRoot()
        val lineHeight = with(rule.density) { tokens.labelTypescale.lineHeight.toDp() }
        assertTrue("several lines", label.bottom - label.top > lineHeight * 2)
        val line = maxOf(tokens.trackHeight, lineHeight)
        assertEquals("the first line's center is the track's", (node.top + line / 2).value, (label.top + lineHeight / 2).value, 0.5f)
        val trackTop = line / 2 - tokens.trackHeight / 2
        assertPixel("the track's outline is drawn there", pixel(tokens.trackWidth / 2 + 6.dp, trackTop + tokens.outlineWidth / 2), colors[TanreiColorRole.Outline])
    }

    // ── SWT-16: labelHidden and an empty label ───────────────────────────────

    @Test
    fun `SWT-16 labelHidden draws no label and keeps it as the accessible name`() {
        setSwitch(labelHidden = true)
        rule.onNodeWithText(LABEL, useUnmergedTree = true).assertDoesNotExist()
        switch().assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf(LABEL)))
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    @Test
    fun `SWT-16 without a label it still renders and works, and a debuggable app reports it once`() = collectingReports { reports ->
        setDebuggable(true)
        setSwitch(label = "", labelHidden = false)
        switch().assertWidthIsEqualTo(measure.targetTouch).assertHeightIsEqualTo(measure.targetTouch)
        switch().performClick()
        rule.waitForIdle()
        assertEquals(listOf("change:true"), events)
        assertEquals(reports.toString(), 1, reports.size)
        assertTrue(reports.toString(), "TanreiSwitch" in reports.single() && "label" in reports.single())
    }

    @Test
    fun `SWT-16 a release-like app reports nothing, and a named switch reports nothing anywhere`() = collectingReports { reports ->
        setDebuggable(false)
        setSwitch(label = "")
        rule.waitForIdle()
        assertEquals(emptyList<String>(), reports)
        setDebuggable(true)
        setSwitch()
        rule.waitForIdle()
        assertEquals(emptyList<String>(), reports)
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun setDebuggable(debuggable: Boolean) {
        val info = ApplicationProvider.getApplicationContext<Context>().applicationInfo
        info.flags = if (debuggable) info.flags or ApplicationInfo.FLAG_DEBUGGABLE else info.flags and ApplicationInfo.FLAG_DEBUGGABLE.inv()
    }

    private fun collectingReports(block: (List<String>) -> Unit) {
        val reports = mutableListOf<String>()
        val previous = TanreiDiagnostics.reporter
        TanreiDiagnostics.reporter = { reports += it }
        try {
            block(reports)
        } finally {
            TanreiDiagnostics.reporter = previous
        }
    }

    private fun TanreiSystem.withCondition(
        condition: TanreiSwitchCondition,
        state: TanreiInteractionState,
        change: (TanreiSwitchConditionStateTokens) -> TanreiSwitchConditionStateTokens,
    ): TanreiSystem {
        val conditions = switch.conditions
        val tokens = conditions[condition]
        val changed = when (state) {
            TanreiInteractionState.Enabled -> tokens.copy(enabled = change(tokens.enabled))
            TanreiInteractionState.Hovered -> tokens.copy(hovered = change(tokens.hovered))
            TanreiInteractionState.Focused -> tokens.copy(focused = change(tokens.focused))
            TanreiInteractionState.Pressed -> tokens.copy(pressed = change(tokens.pressed))
            TanreiInteractionState.Disabled -> tokens.copy(disabled = change(tokens.disabled))
        }
        val updated = when (condition) {
            TanreiSwitchCondition.Unselected -> conditions.copy(unselected = changed)
            TanreiSwitchCondition.Selected -> conditions.copy(selected = changed)
            else -> error("not used by these tests: $condition")
        }
        return copy(switch = switch.copy(conditions = updated))
    }

    private fun assertContainer(paint: TanreiPaint, handleX: Dp) = assertContainerColor(paint.resolve(colors).compositeOver(surface), handleX)

    /** The layer above the track, over the handle at [handleX]. */
    private fun assertContainerColor(expected: Color, handleX: Dp) = assertPixel("container", pixel(handleX, CONTAINER_ABOVE), expected)

    private fun pixel(x: Dp, y: Dp): Color = switch().captureToImage().toPixelMap().at(x, y)

    /** On the track's midline, at its far end from a handle at [handleX]: fill, clear of the handle and its layer. */
    private fun trackProbe(handleX: Dp): Color = pixel(if (handleX == HANDLE_OFF) TRACK_START + tokens.trackWidth - 4.dp else TRACK_START + 4.dp, CENTER_Y)

    /** On the track's top edge, past the round layer of an off handle and before the round end. */
    private fun outlineProbe(): Color = pixel(HANDLE_OFF + 13.dp, TRACK_TOP + tokens.outlineWidth / 2)

    /** The middle of the focus ring's outer stroke above the track. */
    private fun ringCenter(): Dp = TRACK_TOP - (measure.focusOffset + measure.focusInnerWidth + measure.focusOuterWidth / 2)

    private fun PixelMap.at(x: Dp, y: Dp): Color = with(rule.density) { this@at[x.roundToPx(), y.roundToPx()] }

    private fun tintOf(pixel: Color, base: Color, full: Color): Float {
        val channels = listOf(Triple(pixel.red, base.red, full.red), Triple(pixel.green, base.green, full.green), Triple(pixel.blue, base.blue, full.blue))
        val (p, b, f) = channels.maxBy { abs(it.third - it.second) }
        return ((p - b) / (f - b)).coerceIn(0f, 1f)
    }

    private fun isClose(actual: Color, expected: Color): Boolean =
        maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue)) <= PIXEL_TOLERANCE

    private fun assertPixel(what: String, actual: Color, expected: Color) =
        assertTrue("$what: expected $expected but was $actual", isClose(actual, expected))

    private companion object {
        const val TAG = "switch"
        const val LABEL = "Wi-Fi"
        const val PIXEL_TOLERANCE = 2f / 255f
        const val PRESSED_OPACITY = 0.5f
        const val COVERAGE_TOLERANCE = 0.05f
        const val FRAME_MILLIS = 16

        /** With the label hidden: the 36 × 20 track centered in the 48 dp target. */
        val TRACK_START = 6.dp
        val TRACK_TOP = 14.dp
        val TRACK_MIDDLE = 24.dp
        val CENTER_Y = 24.dp

        /** The handle's center, 10 dp (half the track height) from each end. */
        val HANDLE_OFF = 16.dp
        val HANDLE_ON = 32.dp

        /** Inside the round layer, above the track: 2 dp above its top edge, over the handle's center. */
        val CONTAINER_ABOVE = 12.dp

        /** Inside the round layer, above the track, 6 dp to either side of the handle's center. */
        val CONTAINER_SIDE = 13.dp

        /** Inside the track's fill, above the bare handle. */
        val TRACK_FILL_TOP = 16.dp
    }
}

/** A stand-in glyph: fills the icon box with the icon color it is given. */
@Composable
private fun SolidGlyph() {
    Box(Modifier.fillMaxSize().background(LocalTanreiContentColor.current))
}

/** SWT-13 and SWT-8 where motion is reduced (the animator duration scale is 0, see `TanreiButtonReducedMotionTest`). */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiSwitchReducedMotionTest {
    private object NoMotion : MotionDurationScale {
        override val scaleFactor: Float = 0f
    }

    @get:Rule
    val rule = createComposeRule(effectContext = NoMotion)

    private val tanrei = TanreiSystem.Tanrei
    private val colors = tanrei.colors.light
    private var checked by mutableStateOf(false)

    private fun set(system: TanreiSystem = tanrei) {
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Box(Modifier.background(TanreiColorRole.Surface.color).padding(TanreiTheme.tokens.space.space200)) {
                    TanreiSwitch(checked = checked, onCheckedChange = { checked = it }, label = "Wi-Fi", modifier = Modifier.testTag("switch"), labelHidden = true)
                }
            }
        }
    }

    private fun pixel(x: Dp, y: Dp): Color = with(rule.density) { rule.onNodeWithTag("switch").captureToImage().toPixelMap()[x.roundToPx(), y.roundToPx()] }

    private fun assertPixel(what: String, actual: Color, expected: Color) {
        val delta = maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue))
        assertTrue("$what: expected $expected but was $actual", delta <= 2f / 255f)
    }

    @Test
    fun `SWT-13 where motion is reduced the handle does not travel - it is at the other end on the next frame, the track filled`() {
        set()
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag("switch").performTouchInput { down(center) }
        rule.mainClock.advanceTimeByFrame()
        rule.onNodeWithTag("switch").performTouchInput { up() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("the handle at the end", pixel(32.dp, 24.dp), colors[TanreiColorRole.OnPrimary])
        assertPixel("the track", pixel(10.dp, 24.dp), colors[TanreiColorRole.Primary])
    }

    @Test
    fun `SWT-8 where motion is reduced the ripple appears whole`() {
        set(tanrei.copy(behavior = tanrei.behavior.copy(pressedFeedback = TanreiPressedFeedback.Ripple)))
        val pressed = tanrei.switch.conditions.unselected.pressed.containerColor.resolve(colors).compositeOver(colors[TanreiColorRole.Surface])
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag("switch").performTouchInput { down(Offset(10.dp.toPx(), 13.dp.toPx())) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("the far side of the layer, whole at once", pixel(22.dp, 13.dp), pressed)
        rule.onNodeWithTag("switch").performTouchInput { cancel() }
    }
}
