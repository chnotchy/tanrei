package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
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
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.acme.design.Acme
import io.github.chnotchy.tanrei.R
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.primitives.tanreiContainerShape
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.Cupertino
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiCheckboxCondition
import io.github.chnotchy.tanrei.tokens.TanreiCheckboxConditionStateTokens
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiFocusStyle
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiPressedFeedback
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
 * Behaviour tests for `specs/checkbox.spec.json`. Each test names the behaviour id (`CHK-n`) it covers. Runs on the
 * JVM (Robolectric, native graphics). Most pixel tests hide the label (`labelHidden`), so the checkbox is its 48 dp
 * target with the 28 dp container centered in it and the 16 dp box centered in that: the probes below are at fixed
 * points of that square.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiCheckboxTest {
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
    private val tokens = tanrei.checkbox
    private val measure = tanrei.measure
    private val surface = colors[TanreiColorRole.Surface]

    /** Everything the checkbox emitted, in order: `change:true`, `click` … */
    private val events = mutableListOf<String>()
    private var state by mutableStateOf(ToggleableState.Off)

    @Before
    fun setUp() {
        // ATF checks: NOT_RUN under Robolectric (see TanreiButtonTest); they run for real in the gallery's
        // instrumented tests. The explicit semantics assertions below guard accessibility here.
        rule.enableAccessibilityChecks()
    }

    /** What [setCheckbox] renders; changing it recomposes the one scene a test may set. */
    private class Scene(
        val triState: Boolean,
        val interactive: Boolean,
        val enabled: Boolean,
        val isError: Boolean,
        val label: String,
        val labelHidden: Boolean,
        val system: TanreiSystem,
        val direction: LayoutDirection,
        val width: Dp?,
    )

    private var scene by mutableStateOf<Scene?>(null)

    /**
     * One checkbox on the surface. The boolean overload records `change:<value>` and flips [state]; [triState] uses the
     * tri-state overload, recording `click` and moving [state] the way the README's idiom does (anything but On → On).
     */
    private fun setCheckbox(
        initial: ToggleableState = ToggleableState.Off,
        triState: Boolean = initial == ToggleableState.Indeterminate,
        interactive: Boolean = true,
        enabled: Boolean = true,
        isError: Boolean = false,
        label: String = LABEL,
        labelHidden: Boolean = true,
        system: TanreiSystem = tanrei,
        direction: LayoutDirection = LayoutDirection.Ltr,
        width: Dp? = null,
    ) {
        state = initial
        val first = scene == null
        scene = Scene(triState, interactive, enabled, isError, label, labelHidden, system, direction, width)
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
                            val modifier = Modifier.testTag(TAG).then(current.width?.let { Modifier.width(it) } ?: Modifier)
                            if (current.triState) {
                                TanreiCheckbox(
                                    state = state,
                                    onClick = if (current.interactive) { { events += "click"; state = if (state == ToggleableState.On) ToggleableState.Off else ToggleableState.On } } else null,
                                    label = current.label,
                                    modifier = modifier,
                                    enabled = current.enabled,
                                    isError = current.isError,
                                    labelHidden = current.labelHidden,
                                )
                            } else {
                                TanreiCheckbox(
                                    checked = state == ToggleableState.On,
                                    onCheckedChange = if (current.interactive) { value -> events += "change:$value"; state = ToggleableState(value) } else null,
                                    label = current.label,
                                    modifier = modifier,
                                    enabled = current.enabled,
                                    isError = current.isError,
                                    labelHidden = current.labelHidden,
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    private fun checkbox() = rule.onNodeWithTag(TAG)

    // ── CHK-14: semantics ────────────────────────────────────────────────────

    @Test
    fun `CHK-14 a checkbox is role checkbox named by its visible label, off or on, and passes accessibility checks`() {
        setCheckbox(labelHidden = false)
        checkbox()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Checkbox))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.ToggleableState, ToggleableState.Off))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Text, listOf(androidx.compose.ui.text.AnnotatedString(LABEL))))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Error))
            .assertHasClickAction()
            .assertIsEnabled()
        checkbox().performClick()
        rule.waitForIdle()
        checkbox().assert(SemanticsMatcher.expectValue(SemanticsProperties.ToggleableState, ToggleableState.On))
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    @Test
    fun `CHK-14 an indeterminate checkbox is announced mixed`() {
        setCheckbox(initial = ToggleableState.Indeterminate)
        checkbox()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Checkbox))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.ToggleableState, ToggleableState.Indeterminate))
    }

    @Test
    fun `CHK-14 error is exposed as the error semantics, in every condition, and gone without it`() {
        val invalid = ApplicationProvider.getApplicationContext<Context>().getString(R.string.tanrei_invalid)
        for (initial in ToggleableState.entries) {
            setCheckbox(initial = initial, isError = true)
            checkbox().assert(SemanticsMatcher.expectValue(SemanticsProperties.Error, invalid))
        }
        setCheckbox(isError = false)
        checkbox().assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Error))
    }

    @Test
    fun `CHK-14 without onCheckedChange it only displays - no click action and no toggle state for a parent to double`() {
        setCheckbox(initial = ToggleableState.On, interactive = false)
        checkbox()
            .assertHasNoClickAction()
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.ToggleableState))
        assertPixel("still drawn checked", fillProbe(), colors[TanreiColorRole.Primary])
    }

    // ── CHK-1: activation switches checked and emits change once ─────────────

    @Test
    fun `CHK-1 a tap switches checked and emits change exactly once with the new value`() {
        setCheckbox()
        checkbox().performClick()
        rule.waitForIdle()
        assertEquals(listOf("change:true"), events)
        checkbox().performClick()
        rule.waitForIdle()
        assertEquals(listOf("change:true", "change:false"), events)
    }

    @Test
    fun `CHK-1 CHK-7 a tap on the visible label toggles it too`() {
        setCheckbox(labelHidden = false)
        val label = rule.onNodeWithText(LABEL, useUnmergedTree = true).getUnclippedBoundsInRoot()
        val node = checkbox().getUnclippedBoundsInRoot()
        checkbox().performTouchInput {
            val x = ((label.left + label.right) / 2 - node.left).toPx()
            val y = ((label.top + label.bottom) / 2 - node.top).toPx()
            down(Offset(x, y)); up()
        }
        rule.waitForIdle()
        assertEquals(listOf("change:true"), events)
    }

    @Test
    @KeyboardNavigation
    fun `CHK-1 Space and Enter each switch it on Android, exactly once`() {
        setCheckbox()
        checkbox().requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        assertEquals(listOf("change:true"), events)
        checkbox().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals(listOf("change:true", "change:false"), events)
    }

    @Test
    fun `CHK-1 an assistive technology click switches it exactly once`() {
        setCheckbox()
        checkbox().performSemanticsAction(SemanticsActions.OnClick)
        rule.waitForIdle()
        assertEquals(listOf("change:true"), events)
    }

    // ── CHK-2: indeterminate becomes checked ─────────────────────────────────

    @Test
    fun `CHK-2 activating an indeterminate checkbox calls onClick once, and the caller's next state On is drawn and announced`() {
        setCheckbox(initial = ToggleableState.Indeterminate)
        checkbox().performClick()
        rule.waitForIdle()
        assertEquals(listOf("click"), events)
        assertEquals(ToggleableState.On, state)
        checkbox().assert(SemanticsMatcher.expectValue(SemanticsProperties.ToggleableState, ToggleableState.On))
        assertPixel("the check replaces the dash: the dash's end is box fill", dashEndProbe(), colors[TanreiColorRole.Primary])
        assertTrue("the check's start is drawn", !isClose(checkStartProbe(), colors[TanreiColorRole.Primary]))
    }

    // ── CHK-3: disabled ──────────────────────────────────────────────────────

    @Test
    fun `CHK-3 a disabled checkbox does not change or emit, from the box or from its label`() {
        setCheckbox(enabled = false, labelHidden = false, initial = ToggleableState.On)
        checkbox().performTouchInput { down(Offset(CONTAINER_START.toPx(), centerY)); up() }
        checkbox().performTouchInput { down(Offset(width - 4.dp.toPx(), centerY)); up() }
        rule.waitForIdle()
        assertEquals(emptyList<String>(), events)
        assertEquals(ToggleableState.On, state)
    }

    @Test
    @KeyboardNavigation
    fun `CHK-3 a disabled checkbox is not focusable and exposes the disabled state`() {
        setCheckbox(enabled = false, labelHidden = false)
        checkbox()
            .assertIsNotEnabled()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Checkbox))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Focused))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsActions.RequestFocus))
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    // ── CHK-4: the condition the props select ────────────────────────────────

    @Test
    fun `CHK-4 unselected, selected and indeterminate draw their own condition, and error draws the error form of each`() {
        val primary = colors[TanreiColorRole.Primary]
        val error = colors[TanreiColorRole.Error]
        setCheckbox(initial = ToggleableState.Off)
        assertPixel("unselected: the outline", outlineProbe(), colors[TanreiColorRole.Outline])
        assertPixel("unselected: no fill", fillProbe(), surface)
        setCheckbox(initial = ToggleableState.On)
        assertPixel("selected: the fill", fillProbe(), primary)
        assertPixel("selected: the check", markProbe(), colors[TanreiColorRole.OnPrimary])
        setCheckbox(initial = ToggleableState.Indeterminate)
        assertPixel("indeterminate: the fill", fillProbe(), primary)
        assertPixel("indeterminate: the dash", markProbe(), colors[TanreiColorRole.OnPrimary])
        setCheckbox(initial = ToggleableState.Off, isError = true)
        assertPixel("error-unselected: the error outline", outlineProbe(), error)
        setCheckbox(initial = ToggleableState.On, isError = true)
        assertPixel("error-selected: the error fill", fillProbe(), error)
        assertPixel("error-selected: on-error check", markProbe(), colors[TanreiColorRole.OnError])
        setCheckbox(initial = ToggleableState.Indeterminate, isError = true)
        assertPixel("error-indeterminate: the error fill", fillProbe(), error)
    }

    @Test
    fun `CHK-4 indeterminate wins over checked - each condition reads its own tokens`() {
        // Give each of the six conditions a fill of its own, so "which condition is drawn" is one pixel.
        val fills = mapOf(
            TanreiCheckboxCondition.Selected to TanreiColorRole.Success,
            TanreiCheckboxCondition.Indeterminate to TanreiColorRole.Warning,
            TanreiCheckboxCondition.ErrorSelected to TanreiColorRole.Info,
            TanreiCheckboxCondition.ErrorIndeterminate to TanreiColorRole.Link,
        )
        var system = tanrei
        for ((condition, role) in fills) system = system.withCondition(condition, TanreiInteractionState.Enabled) { it.copy(boxColor = TanreiPaint.Role(role)) }
        setCheckbox(initial = ToggleableState.On, system = system)
        assertPixel("selected", fillProbe(), colors[TanreiColorRole.Success])
        setCheckbox(initial = ToggleableState.Indeterminate, system = system)
        assertPixel("indeterminate", fillProbe(), colors[TanreiColorRole.Warning])
        setCheckbox(initial = ToggleableState.On, isError = true, system = system)
        assertPixel("error-selected", fillProbe(), colors[TanreiColorRole.Info])
        setCheckbox(initial = ToggleableState.Indeterminate, isError = true, system = system)
        assertPixel("error-indeterminate", fillProbe(), colors[TanreiColorRole.Link])
    }

    @Test
    fun `the condition lookup is total - a condition the system does not have reads unselected`() {
        val unknown = TanreiCheckboxCondition("partial")
        assertFalse(unknown in tokens.conditions)
        assertEquals(tokens.conditions.unselected, tokens.conditions[unknown])
        assertEquals(
            listOf("unselected", "selected", "indeterminate", "error-unselected", "error-selected", "error-indeterminate"),
            tokens.conditions.keys.map { it.key },
        )
    }

    // ── CHK-5: the highest-precedence state, from THAT state's tokens ────────

    @Test
    fun `CHK-5 pressed, hovered and keyboard-free taps draw the container from the condition's state tokens`() {
        setCheckbox(initial = ToggleableState.On)
        val selected = tokens.conditions.selected
        checkbox().performTouchInput { down(center) }
        rule.waitForIdle()
        assertContainer(selected.pressed.containerColor)
        checkbox().performTouchInput { up() }
        rule.waitForIdle()
        // The tap switched it off; focus by touch does not select the focused state.
        assertContainer(tokens.conditions.unselected.enabled.containerColor)
        checkbox().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainer(tokens.conditions.unselected.hovered.containerColor)
    }

    @Test
    fun `CHK-5 in the default system the state layer is the condition's outline color mixed into the transparent container`() {
        setCheckbox(initial = ToggleableState.Off)
        checkbox().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainerColor(colors[TanreiColorRole.Outline].copy(alpha = tanrei.state.hoverStateLayerOpacity).compositeOver(surface))
        setCheckbox(initial = ToggleableState.On, isError = true)
        checkbox().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainerColor(colors[TanreiColorRole.Error].copy(alpha = tanrei.state.hoverStateLayerOpacity).compositeOver(surface))
    }

    @Test
    fun `CHK-5 box, outline, mark and label come from the state's tokens too`() {
        val system = tanrei.withCondition(TanreiCheckboxCondition.Selected, TanreiInteractionState.Hovered) {
            it.copy(boxColor = TanreiPaint.Role(TanreiColorRole.Success), outlineColor = TanreiPaint.Role(TanreiColorRole.Warning), markColor = TanreiPaint.Role(TanreiColorRole.Error))
        }
        setCheckbox(initial = ToggleableState.On, system = system)
        checkbox().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertPixel("hovered fill", fillProbe(), colors[TanreiColorRole.Success])
        assertPixel("hovered outline", outlineProbe(), colors[TanreiColorRole.Warning])
        assertPixel("hovered mark", markProbe(), colors[TanreiColorRole.Error])
    }

    @Test
    @KeyboardNavigation
    fun `CHK-5 under acme, which values hovered, focused and pressed differently - pressed wins over focused wins over hovered, in pixels`() {
        val acme = acmeWithoutFocusIndicator()
        val unselected = acme.checkbox.conditions.unselected
        val acmeColors = acme.colors.light
        fun over(paint: TanreiPaint) = paint.resolve(acmeColors).compositeOver(acmeColors[TanreiColorRole.Surface])
        val all = listOf(unselected.enabled, unselected.hovered, unselected.focused, unselected.pressed).map { over(it.containerColor) }
        assertEquals("acme tells the four states apart", 4, all.toSet().size)

        setCheckbox(system = acme)
        checkbox().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainerColor(over(unselected.hovered.containerColor))
        checkbox().requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertContainerColor(over(unselected.focused.containerColor))
        checkbox().performKeyInput { keyDown(Key.Spacebar) }
        rule.waitForIdle()
        assertContainerColor(over(unselected.pressed.containerColor))
        checkbox().performKeyInput { keyUp(Key.Spacebar) }
        rule.waitForIdle()
        // Space switched it on: now the focused tokens of `selected`.
        assertContainerColor(over(acme.checkbox.conditions.selected.focused.containerColor))
        assertEquals(listOf("change:true"), events)
    }

    /**
     * Acme, with a focus indicator of no width: the indicator is drawn around the BOX, inside the container, where the
     * container probes are — without it the probes see the focused container itself (CHK-6 tests the indicator).
     */
    private fun acmeWithoutFocusIndicator(): TanreiSystem =
        TanreiSystem.Acme.let { it.copy(measure = it.measure.copy(focusInnerWidth = 0.dp, focusOuterWidth = 0.dp)) }

    @Test
    fun `CHK-5 a hover recolors the box, outline and mark over the state motion, not the selection motion`() {
        val slow = tokens.motionStateDuration * 20
        val system = tanrei.copy(checkbox = tokens.copy(motionSelectionDuration = slow))
            .withCondition(TanreiCheckboxCondition.Selected, TanreiInteractionState.Hovered) {
                it.copy(boxColor = TanreiPaint.Role(TanreiColorRole.Success), outlineColor = TanreiPaint.Role(TanreiColorRole.Warning), markColor = TanreiPaint.Role(TanreiColorRole.Error))
            }
        setCheckbox(initial = ToggleableState.On, system = system)
        rule.mainClock.autoAdvance = false
        checkbox().performMouseInput { moveTo(center) }
        rule.mainClock.advanceTimeBy(tokens.motionStateDuration * 2L)
        assertPixel("the hovered fill after the state duration", fillProbe(), colors[TanreiColorRole.Success])
        assertPixel("the hovered outline", outlineProbe(), colors[TanreiColorRole.Warning])
        assertPixel("the hovered mark", markProbe(), colors[TanreiColorRole.Error])
    }

    // ── CHK-6: focus ring around the box, keyboard only, never animated ──────

    @Test
    @KeyboardNavigation
    fun `CHK-6 keyboard focus shows the focus ring around the box on the first frame`() {
        setCheckbox()
        assertPixel("no ring before focus", pixel(BOX_CENTER, ringCenter()), surface)
        rule.mainClock.autoAdvance = false
        checkbox().requestFocus()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("the ring at full color on the first frame, around the box", pixel(BOX_CENTER, ringCenter()), colors[TanreiColorRole.FocusRing])
    }

    @Test
    fun `CHK-6 a pointer press does not show the focus ring`() {
        setCheckbox()
        checkbox().performTouchInput { down(center) }
        rule.waitForIdle()
        val pressed = tokens.conditions.unselected.pressed.containerColor.resolve(colors).compositeOver(surface)
        assertPixel("the pressed layer, no ring", pixel(BOX_CENTER, ringCenter()), pressed)
    }

    // ── CHK-7: the target ────────────────────────────────────────────────────

    @Test
    fun `CHK-7 without a visible label the checkbox is the touch target on both axes, drawing its own container and box`() {
        setCheckbox()
        checkbox().assertWidthIsEqualTo(measure.targetTouch).assertHeightIsEqualTo(measure.targetTouch)
    }

    @Test
    fun `CHK-7 with a label the row is at least the target tall, and a tap in the target's corner outside the drawing toggles`() {
        setCheckbox(labelHidden = false)
        checkbox().assertHeightIsEqualTo(measure.targetTouch)
        setCheckbox()
        checkbox().performTouchInput { down(Offset(1f, 1f)); up() }
        rule.waitForIdle()
        assertEquals(listOf("change:true"), events)
    }

    @Test
    fun `CHK-7 the target size comes from the system`() {
        val target = 60.dp
        setCheckbox(system = tanrei.copy(measure = measure.copy(targetTouch = target)))
        checkbox().assertWidthIsEqualTo(target).assertHeightIsEqualTo(target)
    }

    // ── CHK-8: disabled, from the disabled tokens of the condition ───────────

    @Test
    fun `CHK-8 disabled draws the disabled tokens of each condition - no grey disc, a faded outline, a faded fill with a surface mark`() {
        setCheckbox(initial = ToggleableState.Off, enabled = false)
        val faded = colors[TanreiColorRole.OnSurface].copy(alpha = tanrei.state.disabledContentOpacity).compositeOver(surface)
        assertContainerColor(surface)
        assertPixel("unselected: faded outline", outlineProbe(), faded)
        assertPixel("unselected: still no fill", fillProbe(), surface)
        setCheckbox(initial = ToggleableState.On, enabled = false)
        assertContainerColor(surface)
        assertPixel("selected: faded fill", fillProbe(), faded)
        assertPixel("selected: the mark in surface", markProbe(), surface)
        setCheckbox(initial = ToggleableState.On, enabled = false, isError = true)
        assertPixel("error-selected: disabled removes the error color", fillProbe(), faded)
    }

    @Test
    fun `CHK-8 the disabled opacity token dims the whole control, and disabled ignores hover`() {
        val opacity = 0.5f
        val system = tanrei.copy(checkbox = tokens.copy(disabled = tokens.disabled.copy(opacity = opacity)))
            .withCondition(TanreiCheckboxCondition.Selected, TanreiInteractionState.Disabled) { it.copy(boxColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        setCheckbox(initial = ToggleableState.On, enabled = false, system = system)
        val expected = colors[TanreiColorRole.Error].copy(alpha = opacity).compositeOver(surface)
        assertPixel("dimmed fill", fillProbe(), expected)
        checkbox().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertPixel("hover changes nothing", fillProbe(), expected)
        assertContainerColor(surface)
    }

    // ── CHK-9: pressed at once, held for press-hold ──────────────────────────

    @Test
    fun `CHK-9 a tap that ends at once shows the pressed state on the next frame and keeps it for press-hold`() {
        setCheckbox()
        val hold = tanrei.motion.duration.pressHold.toLong()
        rule.mainClock.autoAdvance = false
        checkbox().performTouchInput { down(center); up() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        // The tap switched it on: pressed, of the selected condition.
        assertContainer(tokens.conditions.selected.pressed.containerColor)
        rule.mainClock.advanceTimeBy(hold / 2)
        assertContainer(tokens.conditions.selected.pressed.containerColor)
        rule.mainClock.advanceTimeBy(hold + tokens.motionStateDuration * 2L)
        assertContainer(tokens.conditions.selected.enabled.containerColor)
        assertEquals(listOf("change:true"), events)
    }

    @Test
    @KeyboardNavigation
    fun `CHK-9 Space and Enter show the pressed state for press-hold too`() {
        val acme = acmeWithoutFocusIndicator()
        val acmeColors = acme.colors.light
        fun over(paint: TanreiPaint) = paint.resolve(acmeColors).compositeOver(acmeColors[TanreiColorRole.Surface])
        setCheckbox(system = acme)
        checkbox().requestFocus().assertIsFocused()
        rule.waitForIdle()
        for ((key, after) in listOf(Key.Spacebar to acme.checkbox.conditions.selected, Key.Enter to acme.checkbox.conditions.unselected)) {
            rule.mainClock.autoAdvance = false
            checkbox().performKeyInput { pressKey(key) }
            rule.mainClock.advanceTimeByFrame()
            rule.mainClock.advanceTimeByFrame()
            assertContainerColor(over(after.pressed.containerColor))
            rule.mainClock.autoAdvance = true
            rule.waitForIdle()
            assertContainerColor(over(after.focused.containerColor))
        }
        assertEquals(listOf("change:true", "change:false"), events)
    }

    // ── CHK-10: pressed-feedback ─────────────────────────────────────────────

    private fun TanreiSystem.answering(feedback: TanreiPressedFeedback) = copy(behavior = behavior.copy(pressedFeedback = feedback))

    @Test
    fun `CHK-10 overlay is the default - the pressed container applies at once, on both sides`() {
        assertEquals(TanreiPressedFeedback.Overlay, tanrei.behavior.pressedFeedback)
        setCheckbox(system = tanrei.withCondition(TanreiCheckboxCondition.Unselected, TanreiInteractionState.Pressed) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) })
        rule.mainClock.autoAdvance = false
        checkbox().performTouchInput { down(CONTAINER_START_POINT.toOffset()) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("at the point of contact", pixel(CONTAINER_START, BOX_CENTER), colors[TanreiColorRole.Error])
        assertPixel("at the far side, at once", pixel(CONTAINER_END, BOX_CENTER), colors[TanreiColorRole.Error])
    }

    @Test
    fun `CHK-10 ripple grows the condition's pressed container color from the point of contact, then fades`() {
        val system = tanrei.answering(TanreiPressedFeedback.Ripple)
            .withCondition(TanreiCheckboxCondition.Unselected, TanreiInteractionState.Pressed) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        setCheckbox(system = system)
        val pressed = colors[TanreiColorRole.Error]
        rule.mainClock.autoAdvance = false
        checkbox().performTouchInput { down(CONTAINER_START_POINT.toOffset()) }
        rule.mainClock.advanceTimeBy(50)
        assertPixel("the layer has reached the point of contact", pixel(CONTAINER_START, BOX_CENTER), pressed)
        assertPixel("but not the far side", pixel(CONTAINER_END, BOX_CENTER), surface)
        rule.mainClock.advanceTimeBy(tokens.motionFeedbackDuration.toLong())
        assertPixel("the far side once grown", pixel(CONTAINER_END, BOX_CENTER), pressed)
        checkbox().performTouchInput { up() }
        rule.mainClock.advanceTimeBy(tanrei.motion.duration.pressHold + tokens.motionStateDuration * 2L)
        assertPixel("faded", pixel(CONTAINER_START, BOX_CENTER), surface)
    }

    @Test
    fun `CHK-10 under ripple a press on the label, outside the container, grows the layer from the container's center`() {
        val system = tanrei.answering(TanreiPressedFeedback.Ripple)
            .withCondition(TanreiCheckboxCondition.Unselected, TanreiInteractionState.Pressed) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        setCheckbox(system = system, labelHidden = false)
        val error = colors[TanreiColorRole.Error]
        // With the label shown the container is the row's first 28 dp: its center is (14, 24), its sides 11 dp away.
        val left = 3.dp
        val right = 25.dp
        rule.mainClock.autoAdvance = false
        checkbox().performTouchInput { down(Offset(width - 4.dp.toPx(), centerY)) }
        var frames = 0
        while (!isClose(pixel(right, BOX_CENTER), error)) {
            assertTrue("the layer reaches the container's side", frames++ < tokens.motionFeedbackDuration / FRAME_MILLIS + 2)
            rule.mainClock.advanceTimeByFrame()
        }
        assertPixel("it reached the far side in the same frame: it grew from the center", pixel(left, BOX_CENTER), error)
        checkbox().performTouchInput { cancel() }
    }

    /**
     * Selected's pressed state differs from hovered in every part but the container: fill (error), outline (warning),
     * mark (success), opacity; hovered has a container color of its own (info), so "the state under the press" shows.
     */
    private fun pressedDiffersEverywhere(feedback: TanreiPressedFeedback): TanreiSystem =
        tanrei.answering(feedback)
            .withCondition(TanreiCheckboxCondition.Selected, TanreiInteractionState.Hovered) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Info)) }
            .withCondition(TanreiCheckboxCondition.Selected, TanreiInteractionState.Pressed) {
                it.copy(boxColor = TanreiPaint.Role(TanreiColorRole.Error), outlineColor = TanreiPaint.Role(TanreiColorRole.Warning), markColor = TanreiPaint.Role(TanreiColorRole.Success))
            }
            .let { it.copy(checkbox = it.checkbox.copy(pressed = it.checkbox.pressed.copy(opacity = PRESSED_OPACITY))) }

    private fun assertOnlyTheContainerColorStays(feedback: TanreiPressedFeedback) {
        setCheckbox(initial = ToggleableState.On, system = pressedDiffersEverywhere(feedback))
        fun dimmed(color: Color) = color.copy(alpha = PRESSED_OPACITY).compositeOver(surface)
        val hovered = colors[TanreiColorRole.Info]
        checkbox().performMouseInput { moveTo(CONTAINER_END_POINT.toOffset()) }
        rule.waitForIdle()
        assertContainerColor(hovered)
        rule.mainClock.autoAdvance = false
        checkbox().performMouseInput { press() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertContainerColor(dimmed(hovered))
        assertPixel("the pressed fill", fillProbe(), dimmed(colors[TanreiColorRole.Error]))
        assertPixel("the pressed outline", outlineProbe(), dimmed(colors[TanreiColorRole.Warning]))
        assertPixel("the pressed mark", markProbe(), dimmed(colors[TanreiColorRole.Success]))
        checkbox().performMouseInput { release() }
    }

    @Test
    fun `CHK-10 under ripple only the container color stays with the state under the press`() = assertOnlyTheContainerColorStays(TanreiPressedFeedback.Ripple)

    @Test
    fun `CHK-10 under dim only the container color stays with the state under the press`() = assertOnlyTheContainerColorStays(TanreiPressedFeedback.Dim)

    @Test
    fun `CHK-10 under none every part stays with the state under the press, and it still switches`() {
        setCheckbox(initial = ToggleableState.On, system = pressedDiffersEverywhere(TanreiPressedFeedback.None))
        checkbox().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val hovered = checkbox().captureToImage().toPixelMap()
        rule.mainClock.autoAdvance = false
        checkbox().performMouseInput { press() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        val pressed = checkbox().captureToImage().toPixelMap()
        val differing = (0 until hovered.height).sumOf { y -> (0 until hovered.width).count { x -> !isClose(hovered[x, y], pressed[x, y]) } }
        assertEquals("not one pixel answers the press", 0, differing)
        checkbox().performMouseInput { release() }
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        assertEquals(listOf("change:false"), events)
    }

    // ── CHK-11: corner smoothing and focus style ─────────────────────────────

    @Test
    fun `CHK-11 at 0 the box corner is a quarter circle`() = assertBoxCornerDrawnAs(5.dp, 0f)

    @Test
    fun `CHK-11 at 0_6 the box corner is Figma's smoothed construction - what cupertino draws`() {
        assertEquals(0.6f, TanreiSystem.Cupertino.shape.cornerSmoothing)
        // The largest radius whose corner has room for the whole amount (Figma budgets it per corner).
        assertBoxCornerDrawnAs(tokens.boxSize / 2 / 1.6f, 0.6f)
    }

    /** A selected box (fill and outline in primary) covers exactly `tanreiContainerShape(radius, smoothing)` in its corner. */
    private fun assertBoxCornerDrawnAs(radius: Dp, smoothing: Float) {
        // No mark: the check would reach into the corner's box.
        val system = tanrei.copy(shape = tanrei.shape.copy(cornerSmoothing = smoothing), checkbox = tokens.copy(boxShape = radius))
            .withCondition(TanreiCheckboxCondition.Selected, TanreiInteractionState.Enabled) { it.copy(markColor = TanreiPaint.None) }
        setCheckbox(initial = ToggleableState.On, system = system)
        val primary = colors[TanreiColorRole.Primary]
        val map = checkbox().captureToImage().toPixelMap()
        with(rule.density) {
            val inset = BOX_START.roundToPx()
            val side = tokens.boxSize.roundToPx()
            val outline = tanreiContainerShape(radius, smoothing).createOutline(Size(side.toFloat(), side.toFloat()), LayoutDirection.Ltr, this)
            val expected = ImageBitmap(side, side, ImageBitmapConfig.Argb8888)
            Canvas(expected).drawOutline(outline, Paint().apply { color = Color.Black })
            val expectedMap = expected.toPixelMap()
            val box = minOf((radius * 2 + CORNER_MARGIN).roundToPx(), side / 2)
            var worst = 0f
            var total = 0f
            for (y in 0 until box) for (x in 0 until box) {
                val delta = abs(tintOf(map[inset + x, inset + y], surface, primary) - expectedMap[x, y].alpha)
                worst = maxOf(worst, delta)
                total += delta
            }
            assertTrue("smoothing $smoothing: the worst pixel is $worst off the outline's own coverage", worst <= COVERAGE_TOLERANCE)
            assertTrue("smoothing $smoothing: $total px² off the outline in total", total <= COVERAGE_TOTAL_TOLERANCE)
        }
    }

    @Test
    @KeyboardNavigation
    fun `CHK-11 glow draws the focus colors as a soft halo around the box under acme`() {
        val acme = TanreiSystem.Acme
        assertEquals(TanreiFocusStyle.Glow, acme.behavior.focusStyle)
        val acmeColors = acme.colors.light
        val ring = acmeColors[TanreiColorRole.FocusRing]
        val m = acme.measure
        setCheckbox(system = acme)
        checkbox().requestFocus().assertIsFocused()
        rule.waitForIdle()
        val layer = acme.checkbox.conditions.unselected.focused.containerColor.resolve(acmeColors).compositeOver(acmeColors[TanreiColorRole.Surface])
        val inBand = pixel(BOX_CENTER, BOX_START - (m.focusOffset + m.focusInnerWidth + m.focusOuterWidth / 4))
        assertTrue("the halo carries the focus color: $inBand", tintOf(inBand, layer, ring) > 0.7f)
        val beyond = tintOf(pixel(BOX_CENTER, BOX_START - (m.focusOffset + m.focusInnerWidth + m.focusOuterWidth * 1.5f)), layer, ring)
        assertTrue("soft beyond the hard edge: $beyond", beyond > 0.05f && beyond < 0.4f)
    }

    // ── CHK-12: geometry ─────────────────────────────────────────────────────

    @Test
    fun `CHK-12 the box is box-size, centered in a round container of container-size`() {
        setCheckbox()
        val outline = colors[TanreiColorRole.Outline]
        with(rule.density) {
            val map = checkbox().captureToImage().toPixelMap()
            val start = BOX_START.roundToPx()
            val end = (BOX_START + tokens.boxSize).roundToPx()
            val middle = BOX_CENTER.roundToPx()
            assertPixel("left of the box", map[start - 1, middle], surface)
            assertPixel("its first column", map[start, middle], outline)
            assertPixel("its last column", map[end - 1, middle], outline)
            assertPixel("right of the box", map[end, middle], surface)
        }
        checkbox().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val layer = tokens.conditions.unselected.hovered.containerColor.resolve(colors).compositeOver(surface)
        with(rule.density) {
            val map = checkbox().captureToImage().toPixelMap()
            val top = (BOX_CENTER - tokens.containerSize / 2).roundToPx()
            val middle = BOX_CENTER.roundToPx()
            assertPixel("above the container", map[middle, top - 1], surface)
            assertPixel("the container's top", map[middle, top + 1], layer)
            assertPixel("a round container: its bounding corner is clear", map[top + 1, top + 1], surface)
        }
    }

    @Test
    fun `CHK-12 the outline lies inside the box's edge and the fill inside the outline, never under it`() {
        val system = tanrei.withCondition(TanreiCheckboxCondition.Selected, TanreiInteractionState.Enabled) {
            it.copy(outlineColor = TanreiPaint.Role(TanreiColorRole.Error), boxColor = TanreiPaint.Role(TanreiColorRole.Success))
        }
        setCheckbox(initial = ToggleableState.On, system = system)
        with(rule.density) {
            val map = checkbox().captureToImage().toPixelMap()
            val top = BOX_START.roundToPx()
            val width = tokens.outlineWidth.roundToPx()
            val x = (BOX_START + tokens.boxSize * 0.5f).roundToPx()
            assertPixel("the edge's first row is outline", map[x, top], colors[TanreiColorRole.Error])
            assertPixel("the outline's last row", map[x, top + width - 1], colors[TanreiColorRole.Error])
            assertPixel("the fill starts inside it", map[x, top + width], colors[TanreiColorRole.Success])
        }
        // Disabled, fill and outline are the same translucent color: were the fill under the outline, the band would be darker.
        setCheckbox(initial = ToggleableState.On, enabled = false)
        with(rule.density) {
            val map = checkbox().captureToImage().toPixelMap()
            val x = (BOX_START + tokens.boxSize * 0.5f).roundToPx()
            assertPixel("the band and the fill are one translucent color", map[x, BOX_START.roundToPx()], map[x, (BOX_START + tokens.outlineWidth).roundToPx() + 1])
        }
    }

    @Test
    fun `CHK-12 no mark is drawn while unselected, whatever its color token says`() {
        val system = tanrei.withCondition(TanreiCheckboxCondition.Unselected, TanreiInteractionState.Enabled) { it.copy(markColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        setCheckbox(system = system)
        assertPixel("no check", markProbe(), surface)
        assertPixel("no check start", checkStartProbe(), surface)
    }

    @Test
    fun `CHK-12 the mark is stroked at mark-width`() {
        fun markPixels(system: TanreiSystem): Int {
            setCheckbox(initial = ToggleableState.On, system = system)
            val map = checkbox().captureToImage().toPixelMap()
            val onPrimary = colors[TanreiColorRole.OnPrimary]
            // Inside the box only: the surface around it is as light as the mark.
            val box = with(rule.density) { BOX_START.roundToPx() until (BOX_START + tokens.boxSize).roundToPx() }
            return box.sumOf { y -> box.count { x -> isClose(map[x, y], onPrimary) } }
        }
        val thin = markPixels(tanrei)
        val thick = markPixels(tanrei.copy(checkbox = tokens.copy(markWidth = tokens.markWidth * 2)))
        assertTrue("twice the width, about twice the pixels: $thin → $thick", thick > thin * 1.6f && thick < thin * 2.4f)
    }

    // ── CHK-13: the mark draws, reverses, and the colors move over selection-duration ──

    /** A tap whose down and up land in separate frames, as a finger's do: the press shows, then the condition changes. */
    private fun tapInTwoFrames() {
        rule.mainClock.autoAdvance = false
        checkbox().performTouchInput { down(center) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        checkbox().performTouchInput { up() }
    }

    /** Advances frame by frame until [done], at most a selection duration's worth; fails if it never is. */
    private fun advanceUntil(what: String, done: () -> Boolean) {
        var frames = 0
        while (!done()) {
            assertTrue("$what within the selection duration", frames++ < tokens.motionSelectionDuration / FRAME_MILLIS + 2)
            rule.mainClock.advanceTimeByFrame()
        }
    }

    @Test
    fun `CHK-13 the check draws along its path from its start over selection-duration, and the fill fades in with it`() {
        setCheckbox()
        tapInTwoFrames()
        advanceUntil("the start of the check is drawn") { !isClose(checkStartProbe(), fillProbe()) }
        val fill = fillProbe()
        assertTrue("the fill is on its way: $fill", !isClose(fill, surface) && !isClose(fill, colors[TanreiColorRole.Primary]))
        assertPixel("the end of the check is not drawn yet", checkEndProbe(), fill)
        rule.mainClock.advanceTimeBy(tokens.motionSelectionDuration.toLong() * 2 + tanrei.motion.duration.pressHold)
        assertPixel("its end once the duration has passed", checkEndProbe(), colors[TanreiColorRole.OnPrimary])
        assertPixel("the fill", fillProbe(), colors[TanreiColorRole.Primary])
    }

    @Test
    fun `CHK-13 the check is undrawn in reverse when it goes away`() {
        setCheckbox(initial = ToggleableState.On)
        tapInTwoFrames()
        advanceUntil("the end of the check goes") { isClose(checkEndProbe(), fillProbe()) }
        assertTrue("its start is still drawn", !isClose(checkStartProbe(), fillProbe()))
        rule.mainClock.advanceTimeBy(tokens.motionSelectionDuration.toLong() * 2 + tanrei.motion.duration.pressHold)
        assertPixel("gone", checkStartProbe(), surface)
    }

    @Test
    fun `CHK-13 the dash grows from its center`() {
        setCheckbox(initial = ToggleableState.Off, triState = true)
        rule.mainClock.autoAdvance = false
        state = ToggleableState.Indeterminate
        advanceUntil("the dash's center is drawn") { !isClose(markProbe(), fillProbe()) }
        assertPixel("its end is not drawn yet", dashEndProbe(), fillProbe())
        rule.mainClock.advanceTimeBy(tokens.motionSelectionDuration.toLong() * 2)
        assertPixel("its end once grown", dashEndProbe(), colors[TanreiColorRole.OnPrimary])
    }

    @Test
    fun `CHK-13 the selection duration is the checkbox's own token`() {
        val slow = tokens.motionSelectionDuration * 8
        setCheckbox(system = tanrei.copy(checkbox = tokens.copy(motionSelectionDuration = slow, motionSelectionEasing = tanrei.motion.easing.linear)))
        tapInTwoFrames()
        rule.mainClock.advanceTimeBy(tokens.motionSelectionDuration.toLong() * 2)
        val fill = fillProbe()
        assertPixel("not drawn to its end after the default duration", checkEndProbe(), fill)
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertPixel("drawn after its own", checkEndProbe(), colors[TanreiColorRole.OnPrimary])
    }

    // ── CHK-15: the label ────────────────────────────────────────────────────

    @Test
    fun `CHK-15 the label is drawn at the container's inline end, label-gap away`() {
        setCheckbox(labelHidden = false)
        val node = checkbox().getUnclippedBoundsInRoot()
        val label = rule.onNodeWithText(LABEL, useUnmergedTree = true).getUnclippedBoundsInRoot()
        assertEquals((node.left + tokens.containerSize + tokens.labelGap).value, label.left.value, 0.5f)
        assertPixel("the container is at the start", pixel(tokens.containerSize / 2, BOX_CENTER), surface)
        assertPixel("the outline is at the start", pixel(tokens.containerSize / 2, BOX_START), colors[TanreiColorRole.Outline])
    }

    @Test
    fun `CHK-15 right-to-left mirrors the order - the box at the right, the label to its left`() {
        setCheckbox(labelHidden = false, direction = LayoutDirection.Rtl)
        val node = checkbox().getUnclippedBoundsInRoot()
        val label = rule.onNodeWithText(LABEL, useUnmergedTree = true).getUnclippedBoundsInRoot()
        assertEquals((node.right - tokens.containerSize - tokens.labelGap).value, label.right.value, 0.5f)
        with(rule.density) {
            val map = checkbox().captureToImage().toPixelMap()
            val x = map.width - (tokens.containerSize / 2).roundToPx()
            assertPixel("the outline is at the right end", map[x, BOX_START.roundToPx()], colors[TanreiColorRole.Outline])
        }
    }

    @Test
    fun `CHK-15 a long label wraps rather than truncating, and the label style is the label typescale`() {
        val long = "Email me updates about new features, events and offers from our partners"
        setCheckbox(labelHidden = false, label = long, width = 160.dp)
        val label = rule.onNodeWithText(long, useUnmergedTree = true).getUnclippedBoundsInRoot()
        val lineHeight = with(rule.density) { tokens.labelTypescale.lineHeight.toDp() }
        assertTrue("wrapped onto several lines: ${label.bottom - label.top}", label.bottom - label.top > lineHeight * 2)
        checkbox().assert(SemanticsMatcher.expectValue(SemanticsProperties.Text, listOf(androidx.compose.ui.text.AnnotatedString(long))))
    }

    @Test
    fun `CHK-15 a wrapping label's FIRST line is centered on the control`() {
        val long = "Email me updates about new features, events and offers from our partners"
        setCheckbox(labelHidden = false, label = long, width = 160.dp)
        val node = checkbox().getUnclippedBoundsInRoot()
        val label = rule.onNodeWithText(long, useUnmergedTree = true).getUnclippedBoundsInRoot()
        val lineHeight = with(rule.density) { tokens.labelTypescale.lineHeight.toDp() }
        assertTrue("several lines", label.bottom - label.top > lineHeight * 2)
        val controlCenter = tokens.containerSize / 2
        assertEquals("the first line's center is the control's", (node.top + controlCenter).value, (label.top + lineHeight / 2).value, 0.5f)
        val boxTop = controlCenter - tokens.boxSize / 2
        assertPixel("the box is drawn there", pixel(tokens.containerSize / 2, boxTop + tokens.outlineWidth / 2), colors[TanreiColorRole.Outline])
    }

    @Test
    fun `CHK-15 the label color comes from the condition's state tokens`() {
        val system = tanrei.withCondition(TanreiCheckboxCondition.Unselected, TanreiInteractionState.Enabled) { it.copy(labelColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        setCheckbox(labelHidden = false, label = "MMMM", system = system)
        val label = rule.onNodeWithText("MMMM", useUnmergedTree = true).getUnclippedBoundsInRoot()
        val node = checkbox().getUnclippedBoundsInRoot()
        val map = checkbox().captureToImage().toPixelMap()
        val errors = with(rule.density) {
            val y = ((label.top + label.bottom) / 2 - node.top).roundToPx()
            ((label.left - node.left).roundToPx() until (label.right - node.left).roundToPx()).count { x -> isClose(map[x, y], colors[TanreiColorRole.Error]) }
        }
        assertTrue("the label is drawn in the error color ($errors px)", errors > 4)
    }

    // ── CHK-16: labelHidden and an empty label ───────────────────────────────

    @Test
    fun `CHK-16 labelHidden draws no label and keeps it as the accessible name`() {
        setCheckbox(labelHidden = true)
        rule.onNodeWithText(LABEL, useUnmergedTree = true).assertDoesNotExist()
        checkbox()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf(LABEL)))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Checkbox))
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    @Test
    fun `CHK-16 without a label it still renders and works, and a debuggable app reports it once`() = collectingReports { reports ->
        setDebuggable(true)
        setCheckbox(label = "", labelHidden = false)
        checkbox().assertWidthIsEqualTo(measure.targetTouch).assertHeightIsEqualTo(measure.targetTouch)
        checkbox().performClick()
        rule.waitForIdle()
        assertEquals(listOf("change:true"), events)
        assertEquals(reports.toString(), 1, reports.size)
        assertTrue(reports.toString(), "TanreiCheckbox" in reports.single() && "label" in reports.single())
    }

    @Test
    fun `CHK-16 a release-like app reports nothing, and a named checkbox reports nothing anywhere`() = collectingReports { reports ->
        setDebuggable(false)
        setCheckbox(label = "")
        rule.waitForIdle()
        assertEquals(emptyList<String>(), reports)
        setDebuggable(true)
        setCheckbox()
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
        condition: TanreiCheckboxCondition,
        state: TanreiInteractionState,
        change: (TanreiCheckboxConditionStateTokens) -> TanreiCheckboxConditionStateTokens,
    ): TanreiSystem {
        val conditions = checkbox.conditions
        val tokens = conditions[condition]
        val changed = when (state) {
            TanreiInteractionState.Enabled -> tokens.copy(enabled = change(tokens.enabled))
            TanreiInteractionState.Hovered -> tokens.copy(hovered = change(tokens.hovered))
            TanreiInteractionState.Focused -> tokens.copy(focused = change(tokens.focused))
            TanreiInteractionState.Pressed -> tokens.copy(pressed = change(tokens.pressed))
            TanreiInteractionState.Disabled -> tokens.copy(disabled = change(tokens.disabled))
        }
        val updated = when (condition) {
            TanreiCheckboxCondition.Unselected -> conditions.copy(unselected = changed)
            TanreiCheckboxCondition.Selected -> conditions.copy(selected = changed)
            TanreiCheckboxCondition.Indeterminate -> conditions.copy(indeterminate = changed)
            TanreiCheckboxCondition.ErrorUnselected -> conditions.copy(errorUnselected = changed)
            TanreiCheckboxCondition.ErrorSelected -> conditions.copy(errorSelected = changed)
            TanreiCheckboxCondition.ErrorIndeterminate -> conditions.copy(errorIndeterminate = changed)
            else -> error("not used by these tests: $condition")
        }
        return copy(checkbox = checkbox.copy(conditions = updated))
    }

    /** A paint of the default system over the surface: what a (possibly translucent) container looks like. */
    private fun assertContainer(paint: TanreiPaint) = assertContainerColor(paint.resolve(colors).compositeOver(surface))

    private fun assertContainerColor(expected: Color) = assertPixel("container", pixel(CONTAINER_START, BOX_CENTER), expected)

    private fun pixel(x: Dp, y: Dp): Color = checkbox().captureToImage().toPixelMap().at(x, y)

    /** Inside the box, clear of the mark. */
    private fun fillProbe(): Color = pixel(BOX_START + tokens.boxSize * 0.8f, BOX_START + tokens.boxSize * 0.8f)

    /** On the box's top edge, clear of everything else. */
    private fun outlineProbe(): Color = pixel(BOX_START + tokens.boxSize * 0.5f, BOX_START + tokens.outlineWidth / 2)

    /** On the middle of the check's long arm, and on the dash's center: box (0.6, 0.5). */
    private fun markProbe(): Color = pixel(BOX_START + tokens.boxSize * 0.6f, BOX_START + tokens.boxSize * 0.5f)

    /** Near the start of the check's short arm: 15 % of the way from (0.2, 0.5) to (0.4, 0.7). */
    private fun checkStartProbe(): Color = pixel(BOX_START + tokens.boxSize * 0.23f, BOX_START + tokens.boxSize * 0.53f)

    /** Near the end of the check's long arm: 90 % of the way from (0.4, 0.7) to (0.8, 0.3). */
    private fun checkEndProbe(): Color = pixel(BOX_START + tokens.boxSize * 0.76f, BOX_START + tokens.boxSize * 0.34f)

    /** Near the dash's end (0.8, 0.5): 5/6 of its half-length from the center, and clear of the check. */
    private fun dashEndProbe(): Color = pixel(BOX_START + tokens.boxSize * 0.75f, BOX_START + tokens.boxSize * 0.5f)

    /** The middle of the focus ring's outer stroke above the box. */
    private fun ringCenter(): Dp = BOX_START - (measure.focusOffset + measure.focusInnerWidth + measure.focusOuterWidth / 2)

    private fun Pair<Dp, Dp>.toOffset(): Offset = with(rule.density) { Offset(first.toPx(), second.toPx()) }

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
        const val TAG = "checkbox"
        const val LABEL = "Email me updates"
        const val PIXEL_TOLERANCE = 2f / 255f
        const val PRESSED_OPACITY = 0.5f
        const val FRAME_MILLIS = 16
        const val COVERAGE_TOLERANCE = 0.05f
        const val COVERAGE_TOTAL_TOLERANCE = 1f
        val CORNER_MARGIN = 2.dp

        /** With the label hidden: the 48 dp target, the 28 dp container centered in it, the 16 dp box centered in that. */
        val BOX_CENTER = 24.dp
        val BOX_START = 16.dp

        /** Inside the container, beside the box, at its vertical center. */
        val CONTAINER_START = 13.dp
        val CONTAINER_END = 35.dp
        val CONTAINER_START_POINT = CONTAINER_START to BOX_CENTER
        val CONTAINER_END_POINT = CONTAINER_END to BOX_CENTER
    }
}

/** CHK-10 and CHK-13 where motion is reduced (the animator duration scale is 0, see `TanreiButtonReducedMotionTest`). */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiCheckboxReducedMotionTest {
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
                    TanreiCheckbox(checked = checked, onCheckedChange = { checked = it }, label = "Email me updates", modifier = Modifier.testTag("checkbox"), labelHidden = true)
                }
            }
        }
    }

    private fun pixel(x: Dp, y: Dp): Color = with(rule.density) { rule.onNodeWithTag("checkbox").captureToImage().toPixelMap()[x.roundToPx(), y.roundToPx()] }

    private fun assertPixel(what: String, actual: Color, expected: Color) {
        val delta = maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue))
        assertTrue("$what: expected $expected but was $actual", delta <= 2f / 255f)
    }

    @Test
    fun `CHK-13 where motion is reduced the new condition shows at once - the whole check and the fill on the next frame`() {
        set()
        val box = tanrei.checkbox.boxSize
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag("checkbox").performClick()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("the fill", pixel(16.dp + box * 0.8f, 16.dp + box * 0.8f), colors[TanreiColorRole.Primary])
        assertPixel("the check's end", pixel(16.dp + box * 0.76f, 16.dp + box * 0.34f), colors[TanreiColorRole.OnPrimary])
    }

    @Test
    fun `CHK-10 where motion is reduced the ripple appears whole`() {
        val system = tanrei.copy(behavior = tanrei.behavior.copy(pressedFeedback = TanreiPressedFeedback.Ripple))
        set(system)
        val pressed = tanrei.checkbox.conditions.unselected.pressed.containerColor.resolve(colors).compositeOver(colors[TanreiColorRole.Surface])
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag("checkbox").performTouchInput { down(Offset(13.dp.toPx(), centerY)) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("the far side, whole at once", pixel(35.dp, 24.dp), pressed)
        rule.onNodeWithTag("checkbox").performTouchInput { up() }
    }
}
