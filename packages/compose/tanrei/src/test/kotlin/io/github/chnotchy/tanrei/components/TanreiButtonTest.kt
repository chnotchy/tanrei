package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.interaction.PressInteraction
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Canvas
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.ImageBitmapConfig
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.graphics.drawOutline
import androidx.compose.ui.graphics.PixelMap
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertHasClickAction
import androidx.compose.ui.test.assertHeightIsEqualTo
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsNotFocused
import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.accessibility.enableAccessibilityChecks
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
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
import androidx.compose.ui.unit.width
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.acme.design.Acme
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.primitives.TanreiPress
import io.github.chnotchy.tanrei.primitives.tanreiContainerShape
import io.github.chnotchy.tanrei.primitives.tanreiInteractionStateOf
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiButtonSizeTokens
import io.github.chnotchy.tanrei.tokens.TanreiButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiButtonVariantStateTokens
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiFocusStyle
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiMeasure
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiPressedFeedback
import io.github.chnotchy.tanrei.tokens.TanreiShadowLayer
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import kotlin.math.abs
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TestRule
import org.junit.runner.RunWith
import org.junit.runners.model.Statement
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Marks a test that needs the window in keyboard (non-touch) input mode. */
@Retention(AnnotationRetention.RUNTIME)
@Target(AnnotationTarget.FUNCTION)
annotation class KeyboardNavigation

/**
 * Behaviour tests for `specs/button.spec.json`. Each test names the behaviour id it covers.
 * Runs on the JVM (Robolectric, native graphics) — no emulator needed.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiButtonTest {
    /**
     * Runs before the compose rule launches its activity: a window picks up touch mode when it is
     * added, so tests marked [KeyboardNavigation] start in keyboard (non-touch) input mode.
     */
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

    /** The default system: what every test renders unless it passes a modified copy. */
    private val tanrei = TanreiSystem.Tanrei
    private val colors = tanrei.colors.light
    private val tokens = tanrei.button
    private val measure = tanrei.measure
    private var clicks = 0

    @Before
    fun setUp() {
        // Accessibility Test Framework checks. Caveat (verified 2026-09): under Robolectric ATF only sees
        // the host Views, not Compose's virtual accessibility nodes, so its checks report NOT_RUN here.
        // They become effective when these tests run on a device; until then the explicit semantics
        // assertions below (role, name, disabled, target size) are what guards accessibility.
        rule.enableAccessibilityChecks()
    }

    private fun setButton(
        variant: TanreiButtonVariant = TanreiButtonVariant.Filled,
        size: TanreiButtonSize = TanreiButtonSize.Medium,
        enabled: Boolean = true,
        system: TanreiSystem = tanrei,
        scroll: ScrollState? = null,
    ) {
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                // With [scroll]: the button at the top of a vertically scrolling container twice as tall as its viewport.
                val frame = if (scroll == null) Modifier else Modifier.testTag(SCROLLER_TAG).height(SCROLL_VIEWPORT).verticalScroll(scroll)
                Column(frame.background(TanreiColorRole.Surface.color).padding(TanreiTheme.tokens.space.space200)) {
                    TanreiButton(
                        text = LABEL,
                        onClick = { clicks++ },
                        modifier = Modifier.testTag(TAG),
                        variant = variant,
                        size = size,
                        enabled = enabled,
                    )
                    if (scroll != null) Spacer(Modifier.height(SCROLL_VIEWPORT * 2))
                }
            }
        }
    }

    private fun button() = rule.onNodeWithTag(TAG)

    // ── Semantics ────────────────────────────────────────────────────────────

    @Test
    fun `exposes the button role, the label as its name, and passes accessibility checks`() {
        setButton()
        button()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
            .assertTextEquals(LABEL)
            .assertHasClickAction()
            .assertIsEnabled()
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    // ── BTN-1: activation emits click exactly once ───────────────────────────

    @Test
    fun `BTN-1 a tap emits click exactly once`() {
        setButton()
        button().performClick()
        rule.waitForIdle()
        assertEquals(1, clicks)
    }

    @Test
    @KeyboardNavigation
    fun `BTN-1 Enter emits click exactly once`() {
        setButton()
        button().requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals(1, clicks)
    }

    @Test
    @KeyboardNavigation
    fun `BTN-1 Space emits click exactly once`() {
        setButton()
        button().requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        assertEquals(1, clicks)
    }

    @Test
    fun `BTN-1 an assistive technology click emits click exactly once`() {
        setButton()
        button().performSemanticsAction(SemanticsActions.OnClick)
        rule.waitForIdle()
        assertEquals(1, clicks)
    }

    // ── BTN-2: disabled ──────────────────────────────────────────────────────

    @Test
    fun `BTN-2 a disabled button does not emit click`() {
        setButton(enabled = false)
        button().performTouchInput { down(center); up() }
        rule.waitForIdle()
        assertEquals(0, clicks)
    }

    @Test
    @KeyboardNavigation
    fun `BTN-2 a disabled button is not focusable`() {
        setButton(enabled = false)
        // No focus target at all: the Focused property only exists on focusable nodes.
        button().assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Focused))
        button().assert(SemanticsMatcher.keyNotDefined(SemanticsActions.RequestFocus))
    }

    @Test
    fun `BTN-2 a disabled button exposes the disabled state and keeps its role`() {
        setButton(enabled = false)
        button()
            .assertIsNotEnabled()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    // ── BTN-3: the highest-precedence active state is drawn from THAT state's tokens ─────────

    @Test
    fun `BTN-3 pressed draws the pressed container token, and release returns to the resting token`() {
        setButton()
        button().performTouchInput { down(center) }
        rule.waitForIdle()
        assertContainerColor(tokens.variants.filled.pressed.containerColor.resolve(colors))
        button().performTouchInput { up() }
        rule.waitForIdle()
        assertContainerColor(tokens.variants.filled.enabled.containerColor.resolve(colors))
    }

    @Test
    fun `BTN-3 hovered draws the hovered container token`() {
        setButton()
        button().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainerColor(tokens.variants.filled.hovered.containerColor.resolve(colors))
    }

    @Test
    @KeyboardNavigation
    fun `BTN-3 keyboard focus draws the focused container token`() {
        setButton()
        button().requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertContainerColor(tokens.variants.filled.focused.containerColor.resolve(colors))
    }

    @Test
    fun `BTN-3 pressed applies immediately while hovered eases in over the motion tokens`() {
        setButton()
        val resting = tokens.variants.filled.enabled.containerColor.resolve(colors)
        rule.mainClock.autoAdvance = false

        button().performMouseInput { moveTo(center) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        val early = button().captureToImage().toPixelMap().at(PROBE_X, measure.targetTouch / 2)
        val hovered = tokens.variants.filled.hovered.containerColor.resolve(colors)
        assertTrue("hover is still in transition after two frames", early.red < hovered.red && early.red >= resting.red)
        rule.mainClock.advanceTimeBy(tokens.motionStateDuration.toLong() * 2)
        assertContainerColor(hovered)

        button().performMouseInput { press() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertContainerColor(tokens.variants.filled.pressed.containerColor.resolve(colors))
    }

    @Test
    fun `BTN-3 only one state wins - pressed over focused over hovered, and disabled over all`() {
        assertEquals(TanreiInteractionState.Pressed, tanreiInteractionStateOf(pressed = true, focused = true, hovered = true))
        assertEquals(TanreiInteractionState.Focused, tanreiInteractionStateOf(pressed = false, focused = true, hovered = true))
        assertEquals(TanreiInteractionState.Hovered, tanreiInteractionStateOf(pressed = false, focused = false, hovered = true))
        assertEquals(TanreiInteractionState.Enabled, tanreiInteractionStateOf(pressed = false, focused = false, hovered = false))
        assertEquals(TanreiInteractionState.Disabled, tanreiInteractionStateOf(pressed = true, focused = true, hovered = true, enabled = false))
    }

    @Test
    fun `BTN-3 in the default system a state is the label color mixed into the container - the former state layer`() {
        setButton(variant = TanreiButtonVariant.Tonal)
        button().performTouchInput { down(center) }
        rule.waitForIdle()
        // The mix the tokens describe is what one overlay at the sys.state opacity composites.
        assertContainerColor(
            colors[TanreiColorRole.OnSecondaryContainer]
                .copy(alpha = tanrei.state.pressedStateLayerOpacity)
                .compositeOver(colors[TanreiColorRole.SecondaryContainer]),
        )
    }

    @Test
    fun `BTN-3 a system that gives hovered another paint draws that paint`() {
        setButton(system = tanrei.withFilled(TanreiInteractionState.Hovered) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) })
        assertContainerColor(colors[TanreiColorRole.Primary])
        button().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainerColor(colors[TanreiColorRole.Error])
    }

    @Test
    fun `BTN-3 a system that gives pressed another label paint draws the label in it`() {
        setButton(system = tanrei.withFilled(TanreiInteractionState.Pressed) { it.copy(labelColor = TanreiPaint.Role(TanreiColorRole.Error)) })
        button().performTouchInput { down(center) }
        rule.waitForIdle()
        val map = button().captureToImage().toPixelMap()
        val error = colors[TanreiColorRole.Error]
        val reddest = (0 until map.height).flatMap { y -> (0 until map.width).map { x -> map[x, y] } }.maxBy { it.red - it.green }
        assertClose("reddest label pixel", error, reddest, tolerance = LABEL_TOLERANCE)
    }

    @Test
    fun `BTN-3 the pressed shape token rounds the pressed container`() {
        val pressedShape = 2.dp
        assertTrue("the default shape is rounder than the modified one", tokens.pressed.containerShape > pressedShape)
        val button = tokens.copy(pressed = tokens.pressed.copy(containerShape = pressedShape))
        setButton(system = tanrei.copy(button = button))
        assertPixel("resting corner is cut by the resting shape", cornerProbe(), colors[TanreiColorRole.Surface])
        button().performTouchInput { down(center) }
        rule.waitForIdle()
        assertPixel("pressed corner is filled by the tighter shape", cornerProbe(), button.variants.filled.pressed.containerColor.resolve(colors))
    }

    @Test
    fun `BTN-3 the pressed opacity token dims the whole button`() {
        val opacity = 0.4f
        setButton(system = tanrei.copy(button = tokens.copy(pressed = tokens.pressed.copy(opacity = opacity))))
        button().performTouchInput { down(center) }
        rule.waitForIdle()
        val pressed = tokens.variants.filled.pressed.containerColor.resolve(colors)
        assertContainerColor(pressed.copy(alpha = opacity).compositeOver(colors[TanreiColorRole.Surface]))
    }

    @Test
    fun `BTN-3 the outline comes from the state's tokens`() {
        setButton(system = tanrei.withFilled(TanreiInteractionState.Hovered) { it.copy(outlineColor = TanreiPaint.Role(TanreiColorRole.Error)) })
        assertPixel("no outline at rest", topEdgeProbe(), colors[TanreiColorRole.Primary])
        button().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertPixel("hovered outline", topEdgeProbe(), colors[TanreiColorRole.Error])
    }

    @Test
    fun `BTN-3 the elevation comes from the state's tokens`() {
        // A level whose first layer is a ring renders that ring as a border: easy to probe.
        val ring = listOf(TanreiShadowLayer(x = 0.dp, y = 0.dp, blur = 0.dp, spread = tokens.sizes.medium.outlineWidth, role = TanreiColorRole.Error))
        setButton(system = tanrei.withFilled(TanreiInteractionState.Pressed) { it.copy(containerElevation = ring) })
        assertPixel("no ring at rest", topEdgeProbe(), colors[TanreiColorRole.Primary])
        button().performTouchInput { down(center) }
        rule.waitForIdle()
        assertPixel("pressed elevation ring", topEdgeProbe(), colors[TanreiColorRole.Error])
    }

    // ── Layout comes from tokens ─────────────────────────────────────────────

    @Test
    fun `padding-inline-start drives the leading padding`() {
        var system by mutableStateOf(tanrei)
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                TanreiButton(text = LABEL, onClick = {}, modifier = Modifier.testTag(TAG))
            }
        }
        val before = button().getUnclippedBoundsInRoot().width
        system = tanrei.withMedium { it.copy(containerPaddingInlineStart = it.containerPaddingInlineStart * 2) }
        rule.waitForIdle()
        val after = button().getUnclippedBoundsInRoot().width
        assertDp("the width grows by exactly the added start padding", tokens.sizes.medium.containerPaddingInlineStart, after - before)
    }

    @Test
    fun `padding-inline-start-with-icon replaces the leading padding only when an icon is present`() {
        val extra = 10.dp
        val button = tanrei.withMedium { it.copy(containerPaddingInlineStartWithIcon = it.containerPaddingInlineStart + extra) }.button
        val iconSize = button.sizes.medium.iconSize
        rule.setContent {
            TanreiTheme(system = tanrei.copy(button = button), theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Column {
                    TanreiButton(text = LABEL, onClick = {}, modifier = Modifier.testTag(TAG))
                    TanreiButton(text = LABEL, onClick = {}, modifier = Modifier.testTag(ICON_TAG), icon = { Box(Modifier.size(iconSize)) })
                }
            }
        }
        val plain = button().getUnclippedBoundsInRoot().width
        val withIcon = rule.onNodeWithTag(ICON_TAG).getUnclippedBoundsInRoot().width
        assertDp("icon + gap + the with-icon padding difference", iconSize + button.sizes.medium.containerGap + extra, withIcon - plain)
    }

    @Test
    fun `padding-block pads vertically and the height token stays a minimum`() {
        val block = 20.dp
        setButton(system = tanrei.withMedium { it.copy(containerPaddingBlock = block) })
        val lineHeight = with(rule.density) { tokens.sizes.medium.labelTypescale.lineHeight.toDp() }
        assertTrue("the padded label is taller than the minimum", block * 2 + lineHeight > measure.targetTouch)
        button().assertHeightIsEqualTo(block * 2 + lineHeight)
    }

    // ── BTN-4: focus indicator on keyboard focus, not animated ───────────────

    @Test
    @KeyboardNavigation
    fun `BTN-4 keyboard focus shows the focus ring immediately, outside the container`() {
        setButton()
        assertPixel("no ring before focus", focusProbe(outerStrokeCenter(measure)), colors[TanreiColorRole.Surface])

        rule.mainClock.autoAdvance = false
        button().requestFocus()
        // One frame to recompose and draw — no animation time has passed.
        rule.mainClock.advanceTimeByFrame()
        assertPixel("ring at full color on the first frame", focusProbe(outerStrokeCenter(measure)), colors[TanreiColorRole.FocusRing])
        assertPixel("the offset leaves the surface visible", focusProbe(measure.focusOffset / 2), colors[TanreiColorRole.Surface])
    }

    @Test
    fun `BTN-4 a pointer press does not show the focus ring`() {
        setButton()
        button().performTouchInput { down(center) }
        rule.waitForIdle()
        assertPixel("no ring while pressed", focusProbe(outerStrokeCenter(measure)), colors[TanreiColorRole.Surface])
    }

    @Test
    @KeyboardNavigation
    fun `BTN-4 an inner width draws the inner stroke in focus-ring-inner, then the outer stroke`() {
        val inner = colors[TanreiColorRole.Error]
        val modified = measure.copy(focusInnerWidth = 1.dp)
        setButton(
            system = tanrei.copy(
                measure = modified,
                colors = tanrei.colors.copy(light = colors.copy(TanreiColorRole.FocusRingInner to inner)),
            ),
        )
        button().requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertPixel("offset", focusProbe(modified.focusOffset / 2), colors[TanreiColorRole.Surface])
        assertPixel("inner stroke", focusProbe(modified.focusOffset + modified.focusInnerWidth / 2), inner)
        assertPixel("outer stroke", focusProbe(outerStrokeCenter(modified)), colors[TanreiColorRole.FocusRing])
        assertPixel("nothing beyond the outer stroke", focusProbe(outerStrokeCenter(modified) + modified.focusOuterWidth), colors[TanreiColorRole.Surface])
    }

    @Test
    @KeyboardNavigation
    fun `BTN-4 a negative offset draws the indicator inside the control`() {
        val modified = measure.copy(focusOffset = (-4).dp)
        setButton(system = tanrei.copy(measure = modified))
        button().requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertTrue("the stroke center is inside", outerStrokeCenter(modified) < 0.dp)
        assertPixel("ring inside the container", focusProbe(outerStrokeCenter(modified)), colors[TanreiColorRole.FocusRing])
        assertPixel("nothing outside", focusProbe(outerStrokeCenter(measure)), colors[TanreiColorRole.Surface])
    }

    // ── BTN-5: hit area extends to sys.target, visual size unchanged ─────────

    @Test
    fun `BTN-5 a 36dp button reserves a 48dp target but still draws 36dp tall`() {
        setButton(size = TanreiButtonSize.Medium)
        assertEquals(36.dp, tokens.sizes.medium.containerHeight)
        assertEquals(48.dp, measure.targetTouch)
        button().assertHeightIsEqualTo(measure.targetTouch)

        val inset = (measure.targetTouch - tokens.sizes.medium.containerHeight) / 2
        val map = button().captureToImage().toPixelMap()
        val container = tokens.variants.filled.enabled.containerColor.resolve(colors)
        val surface = colors[TanreiColorRole.Surface]
        assertPixel("above the container", map.at(PROBE_X, inset - 1.dp), surface)
        assertPixel("first container row", map.at(PROBE_X, inset + 1.dp), container)
        assertPixel("last container row", map.at(PROBE_X, measure.targetTouch - inset - 1.dp), container)
        assertPixel("below the container", map.at(PROBE_X, measure.targetTouch - inset + 1.dp), surface)
    }

    @Test
    fun `BTN-5 a tap inside the target but outside the visual container emits click`() {
        setButton(size = TanreiButtonSize.Small)
        button().assertHeightIsEqualTo(measure.targetTouch)
        button().performTouchInput {
            down(Offset(centerX, 1f))
            up()
        }
        rule.waitForIdle()
        assertEquals(1, clicks)
    }

    @Test
    fun `BTN-5 the target size comes from the system`() {
        val target = 60.dp
        setButton(system = tanrei.copy(measure = measure.copy(targetTouch = target)))
        button().assertHeightIsEqualTo(target)
    }

    // ── BTN-6: disabled is drawn from the variant's disabled tokens ──────────

    @Test
    fun `BTN-6 disabled renders the container and the label from the disabled tokens`() {
        setButton(enabled = false)
        val surface = colors[TanreiColorRole.Surface]
        val disabled = tokens.variants.filled.disabled
        // In the default system these are on-surface at the sys.state disabled opacities.
        val onSurface = colors[TanreiColorRole.OnSurface]
        assertEquals(onSurface.copy(alpha = tanrei.state.disabledContainerOpacity), disabled.containerColor.resolve(colors))
        assertEquals(onSurface.copy(alpha = tanrei.state.disabledContentOpacity), disabled.labelColor.resolve(colors))

        val container = disabled.containerColor.resolve(colors).compositeOver(surface)
        assertContainerColor(container)

        // The label's fully covered pixels are the disabled label paint over that container.
        val label = disabled.labelColor.resolve(colors).compositeOver(container)
        val map = button().captureToImage().toPixelMap()
        var darkest = Color.White
        for (y in 0 until map.height) for (x in 0 until map.width) {
            if (map[x, y].luminance() < darkest.luminance()) darkest = map[x, y]
        }
        assertClose("darkest label pixel", label, darkest, tolerance = LABEL_TOLERANCE)
    }

    @Test
    fun `BTN-6 a system that gives disabled another paint and opacity draws them`() {
        val opacity = 0.5f
        val system = tanrei
            .withFilled(TanreiInteractionState.Disabled) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
            .let { it.copy(button = it.button.copy(disabled = it.button.disabled.copy(opacity = opacity))) }
        setButton(enabled = false, system = system)
        assertContainerColor(colors[TanreiColorRole.Error].copy(alpha = opacity).compositeOver(colors[TanreiColorRole.Surface]))
    }

    @Test
    fun `BTN-6 disabled ignores interaction states`() {
        setButton(enabled = false)
        button().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainerColor(tokens.variants.filled.disabled.containerColor.resolve(colors).compositeOver(colors[TanreiColorRole.Surface]))
    }

    // ── BTN-7: a value the design system does not have draws as the default ──

    /** A default button above one whose size and variant the default system does not have. */
    private fun setDefaultAndUnknown() {
        rule.setContent {
            TanreiTheme(system = tanrei, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Column(Modifier.background(TanreiColorRole.Surface.color)) {
                    TanreiButton(text = LABEL, onClick = {}, modifier = Modifier.testTag(TAG))
                    TanreiButton(
                        text = LABEL,
                        onClick = { clicks++ },
                        modifier = Modifier.testTag(UNKNOWN_TAG),
                        variant = TanreiButtonVariant("ghost"),
                        size = TanreiButtonSize("huge"),
                    )
                }
            }
        }
    }

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

    @Test
    fun `BTN-7 the lookups are total - an unknown size or variant reads the default value's tokens`() {
        assertTrue(TanreiButtonSize("huge") !in tokens.sizes)
        assertTrue(TanreiButtonVariant("ghost") !in tokens.variants)
        assertEquals(null, tokens.sizes.find(TanreiButtonSize("huge")))
        assertEquals(tokens.sizes.medium, tokens.sizes[TanreiButtonSize("huge")])
        assertEquals(tokens.variants.filled, tokens.variants[TanreiButtonVariant("ghost")])
        // The defaults are the spec's: size medium, variant filled.
        assertEquals(tokens.sizes.medium, tokens.sizes[TanreiButtonSize.Medium])
        assertEquals(tokens.variants.filled, tokens.variants[TanreiButtonVariant.Filled])
        assertEquals(listOf("small", "medium", "large"), tokens.sizes.keys.map { it.key })
        assertEquals(listOf("filled", "tonal", "elevated", "outlined", "text"), tokens.variants.keys.map { it.key })
    }

    @Test
    fun `BTN-7 in a release-like app an unknown size and variant render exactly like the default, silently`() = collectingReports { reports ->
        setDebuggable(false)
        setDefaultAndUnknown()
        val expected = button().captureToImage().toPixelMap()
        val actual = rule.onNodeWithTag(UNKNOWN_TAG).captureToImage().toPixelMap()
        assertEquals(expected.width, actual.width)
        assertEquals(expected.height, actual.height)
        for (y in 0 until expected.height) for (x in 0 until expected.width) {
            assertEquals("pixel $x,$y", expected[x, y], actual[x, y])
        }
        rule.onNodeWithTag(UNKNOWN_TAG).performClick()
        rule.waitForIdle()
        assertEquals("it still works", 1, clicks)
        assertEquals("nothing is reported outside debuggable apps", emptyList<String>(), reports)
    }

    @Test
    fun `BTN-7 a debuggable app reports the unknown size and variant once, and still renders the default`() = collectingReports { reports ->
        setDebuggable(true)
        setDefaultAndUnknown()
        rule.onNodeWithTag(UNKNOWN_TAG).assertHeightIsEqualTo(measure.targetTouch)
        assertEquals(button().getUnclippedBoundsInRoot().width, rule.onNodeWithTag(UNKNOWN_TAG).getUnclippedBoundsInRoot().width)
        // Recomposition (a press changes the state) must not report again.
        rule.onNodeWithTag(UNKNOWN_TAG).performClick()
        rule.waitForIdle()
        assertEquals(reports.toString(), 2, reports.size)
        assertTrue(reports.toString(), reports.any { "size \"huge\"" in it && "\"tanrei\"" in it })
        assertTrue(reports.toString(), reports.any { "variant \"ghost\"" in it })
    }

    @Test
    fun `BTN-7 a known size and variant report nothing in a debuggable app`() = collectingReports { reports ->
        setDebuggable(true)
        setButton(variant = TanreiButtonVariant.Tonal, size = TanreiButtonSize.Large)
        rule.waitForIdle()
        assertEquals(emptyList<String>(), reports)
    }

    // ── BTN-3 under a system whose three states differ (spec `verify`) ───────

    @Test
    @KeyboardNavigation
    fun `BTN-3 under acme, which values hovered, focused and pressed differently - pressed wins over focused wins over hovered, in pixels`() {
        val acme = TanreiSystem.Acme
        val filled = acme.button.variants.filled
        val schemeColors = acme.colors.light
        val hovered = filled.hovered.containerColor.resolve(schemeColors)
        val focused = filled.focused.containerColor.resolve(schemeColors)
        val pressed = filled.pressed.containerColor.resolve(schemeColors)
        assertTrue("acme tells the three states apart", setOf(hovered, focused, pressed, filled.enabled.containerColor.resolve(schemeColors)).size == 4)

        setButton(system = acme)
        button().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainerColor(hovered)
        button().requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertContainerColor(focused) // hovered AND focused: focused wins
        button().performKeyInput { keyDown(Key.Enter) }
        rule.waitForIdle()
        assertContainerColor(pressed) // hovered AND focused AND pressed: pressed wins
        button().performKeyInput { keyUp(Key.Enter) }
        rule.waitForIdle()
        assertContainerColor(focused)
        assertEquals(1, clicks)
    }

    // ── BTN-8: pressed appears without delay and stays for press-hold ────────

    @Test
    fun `BTN-8 a tap that ends at once shows the pressed state on the next frame and keeps it for press-hold`() {
        setButton()
        val hold = tanrei.motion.duration.pressHold.toLong()
        rule.mainClock.autoAdvance = false
        button().performTouchInput { down(center); up() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertContainerColor(tokens.variants.filled.pressed.containerColor.resolve(colors))
        rule.mainClock.advanceTimeBy(hold / 2)
        assertContainerColor(tokens.variants.filled.pressed.containerColor.resolve(colors))
        rule.mainClock.advanceTimeBy(hold + tokens.motionStateDuration * 2L)
        assertContainerColor(tokens.variants.filled.enabled.containerColor.resolve(colors))
        assertEquals(1, clicks)
    }

    @Test
    @KeyboardNavigation
    fun `BTN-8 Enter and Space show the pressed state for press-hold too`() {
        // Under acme pressed and focused differ, so the pressed state of a focused button can be seen.
        val acme = TanreiSystem.Acme
        setButton(system = acme)
        button().requestFocus().assertIsFocused()
        rule.waitForIdle()
        for (key in listOf(Key.Enter, Key.Spacebar)) {
            rule.mainClock.autoAdvance = false
            button().performKeyInput { pressKey(key) }
            rule.mainClock.advanceTimeByFrame()
            rule.mainClock.advanceTimeByFrame()
            assertContainerColor(acme.button.variants.filled.pressed.containerColor.resolve(acme.colors.light))
            rule.mainClock.autoAdvance = true
            rule.waitForIdle()
            assertContainerColor(acme.button.variants.filled.focused.containerColor.resolve(acme.colors.light))
        }
        assertEquals(2, clicks)
    }

    @Test
    fun `BTN-8 the hold time is the system's press-hold duration`() {
        val long = 400
        setButton(system = tanrei.copy(motion = tanrei.motion.copy(duration = tanrei.motion.duration.copy(pressHold = long))))
        rule.mainClock.autoAdvance = false
        button().performTouchInput { down(center); up() }
        rule.mainClock.advanceTimeBy(long - 100L)
        assertContainerColor(tokens.variants.filled.pressed.containerColor.resolve(colors))
        rule.mainClock.advanceTimeBy(100L + tokens.motionStateDuration * 2L)
        assertContainerColor(tokens.variants.filled.enabled.containerColor.resolve(colors))
    }

    @Test
    fun `BTN-8 inside a scrolling container touch-down shows the pressed state on the next frame, not after the tap timeout`() {
        val scroll = ScrollState(0)
        setButton(scroll = scroll)
        rule.mainClock.autoAdvance = false
        button().performTouchInput { down(center) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        // Foundation's clickable has not reported this press yet (it waits for its tap timeout inside a scrollable).
        assertContainerColor(tokens.variants.filled.pressed.containerColor.resolve(colors))
        button().performTouchInput { up() }
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        assertContainerColor(tokens.variants.filled.enabled.containerColor.resolve(colors))
        assertEquals("the tap still clicks, once", 1, clicks)
        assertEquals("and did not scroll", 0, scroll.value)
    }

    @Test
    fun `BTN-8 inside a scrolling container a press that becomes a scroll is cancelled - the container scrolls, nothing clicks`() {
        val scroll = ScrollState(0)
        setButton(scroll = scroll)
        rule.mainClock.autoAdvance = false
        button().performTouchInput { down(center) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertContainerColor(tokens.variants.filled.pressed.containerColor.resolve(colors))
        // Beyond the touch slop, in steps: the scrollable takes the gesture over (the button stays in the viewport).
        button().performTouchInput { repeat(SCROLL_STEPS) { moveBy(Offset(0f, -SCROLL_STEP.toPx())) } }
        rule.mainClock.advanceTimeBy(tanrei.motion.duration.pressHold + tokens.motionStateDuration * 2L)
        assertTrue("the container scrolled (${scroll.value})", scroll.value > 0)
        // The finger is still down, but this is a scroll now: the press is over (what pointercancel does on the web).
        val probe = with(rule.density) { rule.onNodeWithTag(SCROLLER_TAG).captureToImage().toPixelMap().let { map -> (0 until map.height).map { map[PROBE_X.roundToPx() + tanrei.space.space200.roundToPx(), it] } } }
        val pressed = tokens.variants.filled.pressed.containerColor.resolve(colors)
        assertTrue("no pixel of the column through the button is still the pressed color", probe.none { isClose(it, pressed) })
        assertTrue("the resting color is", probe.any { isClose(it, tokens.variants.filled.enabled.containerColor.resolve(colors)) })
        button().performTouchInput { up() }
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        assertEquals(0, clicks)
    }

    @Test
    fun `BTN-8 a pointer press that clickable reports too is ONE press - the late report inside a scrolling container restarts nothing`() {
        val press = TanreiPress()
        val at = Offset(12f, 8f)
        press.pointerPressed(at)
        assertTrue(press.pressed)
        assertEquals(1, press.generation)
        val reported = PressInteraction.Press(at)
        press.interactionPressed(reported)
        assertEquals("the same press", 1, press.generation)
        press.pointerReleased(cancelled = false)
        assertTrue("clickable still holds it", press.pressed)
        press.interactionEnded(reported)
        assertTrue(!press.pressed)
        // A key press afterwards is a new one, without a point of contact.
        val key = PressInteraction.Press(Offset.Zero)
        press.interactionPressed(key)
        assertEquals(2, press.generation)
        assertEquals(Offset.Unspecified, press.origin)
        press.interactionEnded(key)
        // A cancelled pointer press leaves nothing behind that could swallow the next press at the same point.
        press.pointerPressed(at)
        press.pointerReleased(cancelled = true)
        assertTrue(!press.pressed)
        press.interactionPressed(PressInteraction.Press(at))
        assertEquals(4, press.generation)
    }

    // ── BTN-9: pressed-feedback chooses how the press is answered ────────────

    private fun TanreiSystem.answering(feedback: TanreiPressedFeedback) = copy(behavior = behavior.copy(pressedFeedback = feedback))

    @Test
    fun `BTN-9 overlay is the default - the pressed tokens apply to the whole container at once`() {
        assertEquals(TanreiPressedFeedback.Overlay, tanrei.behavior.pressedFeedback)
        setButton()
        rule.mainClock.autoAdvance = false
        button().performTouchInput { down(Offset(PROBE_X.toPx(), centerY)) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        val pressed = tokens.variants.filled.pressed.containerColor.resolve(colors)
        assertPixel("at the point of contact", containerProbe(fromEnd = false), pressed)
        assertPixel("at the far end, at once", containerProbe(fromEnd = true), pressed)
    }

    @Test
    fun `BTN-9 ripple grows the pressed container color from the point of contact, over feedback-duration, then fades over state-duration`() {
        setButton(system = tanrei.answering(TanreiPressedFeedback.Ripple))
        val resting = tokens.variants.filled.enabled.containerColor.resolve(colors)
        val pressed = tokens.variants.filled.pressed.containerColor.resolve(colors)
        rule.mainClock.autoAdvance = false
        button().performTouchInput { down(Offset(PROBE_X.toPx(), centerY)) }
        rule.mainClock.advanceTimeBy(50)
        assertPixel("the layer has reached the point of contact", containerProbe(fromEnd = false), pressed)
        assertPixel("but not the far end", containerProbe(fromEnd = true), resting)
        // Fully grown after comp.button.motion.feedback-duration: the same picture as overlay.
        rule.mainClock.advanceTimeBy(tokens.motionFeedbackDuration.toLong())
        assertPixel("the far end once grown", containerProbe(fromEnd = true), pressed)
        button().performTouchInput { up() }
        rule.mainClock.advanceTimeBy(tokens.motionStateDuration * 2L)
        assertPixel("faded at the point of contact", containerProbe(fromEnd = false), resting)
        assertPixel("faded at the far end", containerProbe(fromEnd = true), resting)
    }

    @Test
    fun `BTN-9 the ripple's growth is the component's feedback-duration token, not a system step - a system that revalues it changes the growth`() {
        assertEquals("in the default system the token aliases duration.long1", tanrei.motion.duration.long1, tokens.motionFeedbackDuration)
        val slow = tanrei.motion.duration.long1 * 4
        // The easing is made linear so that "how far at a given time" is the duration's doing alone.
        val system = tanrei.answering(TanreiPressedFeedback.Ripple).let { it.copy(button = it.button.copy(motionFeedbackDuration = slow, motionStateEasing = tanrei.motion.easing.linear)) }
        setButton(system = system)
        val resting = tokens.variants.filled.enabled.containerColor.resolve(colors)
        val pressed = tokens.variants.filled.pressed.containerColor.resolve(colors)
        rule.mainClock.autoAdvance = false
        button().performTouchInput { down(Offset(PROBE_X.toPx(), centerY)) }
        // After long1 a ripple timed by the SYSTEM step would be fully grown. This one is a quarter of the way.
        rule.mainClock.advanceTimeBy(tanrei.motion.duration.long1.toLong())
        assertPixel("not at the far end after long1", containerProbe(fromEnd = true), resting)
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertPixel("at the far end after feedback-duration", containerProbe(fromEnd = true), pressed)
        button().performTouchInput { up() }
    }

    @Test
    fun `BTN-9 the ripple fades only once the press has ended AND press-hold has passed`() {
        val hold = 400
        val system = tanrei.answering(TanreiPressedFeedback.Ripple).let { it.copy(motion = it.motion.copy(duration = it.motion.duration.copy(pressHold = hold))) }
        setButton(system = system)
        val resting = tokens.variants.filled.enabled.containerColor.resolve(colors)
        val pressed = tokens.variants.filled.pressed.containerColor.resolve(colors)
        rule.mainClock.autoAdvance = false
        // A tap that ends at once: the press is over, the hold is not.
        button().performTouchInput { down(Offset(PROBE_X.toPx(), centerY)); up() }
        rule.mainClock.advanceTimeBy(hold - 100L)
        assertPixel("still whole at the point of contact during the hold", containerProbe(fromEnd = false), pressed)
        // While the press is held down the ripple never fades, however long.
        rule.mainClock.advanceTimeBy(100L + tokens.motionStateDuration * 2L)
        assertPixel("faded after the hold plus state-duration", containerProbe(fromEnd = false), resting)
        button().performTouchInput { down(Offset(PROBE_X.toPx(), centerY)) }
        rule.mainClock.advanceTimeBy(hold * 3L + tokens.motionFeedbackDuration)
        assertPixel("a held press keeps its ripple", containerProbe(fromEnd = false), pressed)
        button().performTouchInput { up() }
    }

    /**
     * A system whose filled pressed state differs from hovered in EVERY part: label (error), elevation (a ring in
     * warning), opacity and shape. Hovered gets a container color of its own (success), so "the state under the
     * press" shows.
     */
    private fun TanreiSystem.pressedDiffersEverywhere(): TanreiSystem {
        val ring = listOf(TanreiShadowLayer(x = 0.dp, y = 0.dp, blur = 0.dp, spread = button.sizes.medium.outlineWidth, role = TanreiColorRole.Warning))
        return withFilled(TanreiInteractionState.Hovered) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Success)) }
            .withFilled(TanreiInteractionState.Pressed) { it.copy(labelColor = TanreiPaint.Role(TanreiColorRole.Error), containerElevation = ring) }
            .let { it.copy(button = it.button.copy(pressed = it.button.pressed.copy(opacity = PRESSED_OPACITY, containerShape = 2.dp))) }
    }

    private fun reddestPixel(): Color = button().captureToImage().toPixelMap().let { map -> (0 until map.height).flatMap { y -> (0 until map.width).map { x -> map[x, y] } }.maxBy { it.red - it.green } }

    /** Hover, then press at the far end; two frames in, [feedback] has drawn no layer at the near end. */
    private fun assertOnlyTheContainerColorStays(feedback: TanreiPressedFeedback) {
        setButton(system = tanrei.answering(feedback).pressedDiffersEverywhere())
        val surface = colors[TanreiColorRole.Surface]
        fun dimmed(color: Color) = color.copy(alpha = PRESSED_OPACITY).compositeOver(surface)
        val hovered = colors[TanreiColorRole.Success]
        button().performMouseInput { moveTo(Offset(width - PROBE_X.toPx(), centerY)) }
        rule.waitForIdle()
        assertContainerColor(hovered)
        assertPixel("the resting shape cuts the corner", cornerProbe(), surface)
        rule.mainClock.autoAdvance = false
        button().performMouseInput { press() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("the HOVERED container color stays under the press, at the pressed opacity", containerProbe(fromEnd = false), dimmed(hovered))
        assertPixel("the pressed elevation ring", topEdgeProbe(), dimmed(colors[TanreiColorRole.Warning]))
        // The tighter pressed shape draws there now (the ring's own corner runs through this pixel, so: not the surface).
        assertTrue("the pressed shape fills the corner", !isClose(cornerProbe(), surface))
        assertClose("the pressed label color", dimmed(colors[TanreiColorRole.Error]), reddestPixel(), tolerance = LABEL_TOLERANCE)
        button().performMouseInput { release() }
    }

    @Test
    fun `BTN-9 under ripple only the container color stays with the state under the press - label, elevation, opacity and shape are the pressed tokens`() =
        assertOnlyTheContainerColorStays(TanreiPressedFeedback.Ripple)

    @Test
    fun `BTN-9 under dim only the container color stays with the state under the press - label, elevation, opacity and shape are the pressed tokens`() =
        assertOnlyTheContainerColorStays(TanreiPressedFeedback.Dim)

    @Test
    fun `BTN-9 under none every part stays with the state under the press`() {
        setButton(system = tanrei.answering(TanreiPressedFeedback.None).pressedDiffersEverywhere())
        button().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val hovered = button().captureToImage().toPixelMap()
        button().performMouseInput { press() }
        rule.waitForIdle()
        val pressed = button().captureToImage().toPixelMap()
        val differing = (0 until hovered.height).sumOf { y -> (0 until hovered.width).count { x -> !isClose(hovered[x, y], pressed[x, y]) } }
        assertEquals("not one pixel answers the press: no label, ring, opacity or shape of the pressed tokens", 0, differing)
        button().performMouseInput { release() }
        rule.waitForIdle()
        assertEquals(1, clicks)
    }

    @Test
    fun `BTN-9 the ripple is the variant's pressed token - a system that revalues it changes the ripple`() {
        val system = tanrei.answering(TanreiPressedFeedback.Ripple)
            .withFilled(TanreiInteractionState.Pressed) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        setButton(system = system)
        button().performTouchInput { down(center) }
        rule.mainClock.advanceTimeBy(tokens.motionFeedbackDuration * 2L)
        assertContainerColor(colors[TanreiColorRole.Error])
    }

    @Test
    @KeyboardNavigation
    fun `BTN-9 a keyboard ripple grows from the center`() {
        val acme = TanreiSystem.Acme.answering(TanreiPressedFeedback.Ripple)
        val focused = acme.button.variants.filled.focused.containerColor.resolve(acme.colors.light)
        val pressed = acme.button.variants.filled.pressed.containerColor.resolve(acme.colors.light)
        setButton(system = acme)
        button().requestFocus().assertIsFocused()
        rule.waitForIdle()
        rule.mainClock.autoAdvance = false
        button().performKeyInput { keyDown(Key.Enter) }
        // Step until the layer shows above the label, at the horizontal center…
        var frames = 0
        while (!isClose(centerTopProbe(), pressed) && frames++ < MAX_RIPPLE_FRAMES) rule.mainClock.advanceTimeByFrame()
        assertPixel("the layer reached the center first", centerTopProbe(), pressed)
        // …and at that moment it has reached neither end: it did not start at an edge.
        assertPixel("not the start", containerProbe(fromEnd = false), focused)
        assertPixel("not the end", containerProbe(fromEnd = true), focused)
        button().performKeyInput { keyUp(Key.Enter) }
    }

    @Test
    fun `BTN-9 dim applies the pressed opacity to the whole control and draws no state layer`() {
        val opacity = 0.5f
        val system = tanrei.answering(TanreiPressedFeedback.Dim).let { it.copy(button = it.button.copy(pressed = it.button.pressed.copy(opacity = opacity))) }
        setButton(system = system)
        val resting = tokens.variants.filled.enabled.containerColor.resolve(colors)
        assertNotEquals("the default system HAS a pressed state layer", resting, tokens.variants.filled.pressed.containerColor.resolve(colors))
        button().performTouchInput { down(center) }
        rule.waitForIdle()
        // The container color of the state under the press — here the resting one — (no layer), dimmed.
        assertContainerColor(resting.copy(alpha = opacity).compositeOver(colors[TanreiColorRole.Surface]))
    }

    @Test
    fun `BTN-9 none draws no answer to the press - hover still applies, and the button still clicks`() {
        setButton(system = tanrei.answering(TanreiPressedFeedback.None))
        val hovered = tokens.variants.filled.hovered.containerColor.resolve(colors)
        button().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainerColor(hovered)
        button().performMouseInput { press() }
        rule.waitForIdle()
        assertContainerColor(hovered)
        button().performMouseInput { release() }
        rule.waitForIdle()
        assertEquals(1, clicks)
    }

    // ── BTN-10: corner smoothing and focus-style ─────────────────────────────

    /** The default system with a radius large enough to tell the curves apart at this density, and a smoothing amount. */
    private fun roundedBy(radius: Dp, smoothing: Float) = tanrei.copy(
        shape = tanrei.shape.copy(cornerSmoothing = smoothing),
        button = tokens.copy(containerShape = radius),
    )

    @Test
    fun `BTN-10 at 0 the corner is a quarter circle - straight from one radius on`() {
        val radius = 16.dp
        assertEquals(0f, tanrei.shape.cornerSmoothing)
        setButton(system = roundedBy(radius, smoothing = 0f))
        // One radius along the top edge a quarter circle is already straight: the first row is the container.
        assertPixel("straight at one radius", edgeProbe(along = radius), tokens.variants.filled.enabled.containerColor.resolve(colors))
        assertPixel("the very corner is cut", cornerProbe(), colors[TanreiColorRole.Surface])
        assertCornerDrawnAs(roundedBy(radius, 0f), radius)
    }

    @Test
    fun `BTN-10 at 0_6 the corner eases into the edge - it has left the edge where a circle is straight`() = assertEasedCorner(0.6f)

    @Test
    fun `BTN-10 at 1 the corner eases the most - the leg reaches two radii`() = assertEasedCorner(1f)

    private fun assertEasedCorner(smoothing: Float) {
        // The largest radius whose corner has room for the whole amount: Figma budgets the smoothing per corner, by
        // half the shorter side (`TanreiShape.kt`, "A corner without room") — the leg needs (1 + smoothing) radii.
        val radius = tokens.sizes.medium.containerHeight / 2 / (1 + smoothing)
        val container = tokens.variants.filled.enabled.containerColor.resolve(colors)
        setButton(system = roundedBy(radius, smoothing))
        // The eased leg reaches (1 + smoothing) radii along the edge: at one radius the first row is no longer full.
        val tint = tintOf(edgeProbe(along = radius), colors[TanreiColorRole.Surface], container)
        assertTrue("smoothing $smoothing: the edge is left at one radius (coverage $tint)", tint < FULL_COVERAGE)
        // Beyond the leg the edge is straight, and the very corner is still cut.
        assertPixel("smoothing $smoothing: straight beyond the leg", edgeProbe(along = radius * (1 + smoothing) + 1.dp), container)
        assertPixel("smoothing $smoothing: the very corner is cut", cornerProbe(), colors[TanreiColorRole.Surface])
        assertCornerDrawnAs(roundedBy(radius, smoothing), radius)
    }

    /**
     * The container's top-left corner (medium size) — the top and start padding strips out to 2r plus a margin, clear
     * of the label — is EXACTLY the shape `tanreiContainerShape(radius, smoothing)` describes: every pixel's coverage
     * matches the outline rasterized on its own. Ties the button to the one construction the primitives share
     * (container, outline, ring, clip, focus).
     */
    private fun assertCornerDrawnAs(system: TanreiSystem, radius: Dp) {
        val container = system.button.variants.filled.enabled.containerColor.resolve(system.colors.light)
        val surface = system.colors.light[TanreiColorRole.Surface]
        val map = button().captureToImage().toPixelMap()
        with(rule.density) {
            val inset = ((measure.targetTouch - tokens.sizes.medium.containerHeight) / 2).roundToPx()
            val height = tokens.sizes.medium.containerHeight.roundToPx()
            val shape = tanreiContainerShape(radius, system.shape.cornerSmoothing)
            val outline = shape.createOutline(Size(map.width.toFloat(), height.toFloat()), LayoutDirection.Ltr, this)
            val expected = ImageBitmap(map.width, height, ImageBitmapConfig.Argb8888)
            Canvas(expected).drawOutline(outline, Paint().apply { color = Color.Black })
            val expectedMap = expected.toPixelMap()
            val box = (radius * 2 + CORNER_MARGIN).roundToPx()
            val startStrip = tokens.sizes.medium.containerPaddingInlineStart.roundToPx()
            val topStrip = tokens.sizes.medium.containerPaddingBlock.roundToPx()
            var worst = 0f
            var total = 0f
            for (y in 0 until box) for (x in 0 until box) {
                if (x >= startStrip && y >= topStrip) continue
                val delta = abs(tintOf(map[x, inset + y], surface, container) - expectedMap[x, y].alpha)
                worst = maxOf(worst, delta)
                total += delta
            }
            assertTrue("corner box: the worst pixel is $worst off the outline's own coverage", worst <= COVERAGE_TOLERANCE)
            assertTrue("corner box: $total px² off the outline in total", total <= COVERAGE_TOTAL_TOLERANCE)
        }
    }

    /** The container's first row (medium size), [along] the top edge from its left corner. */
    private fun edgeProbe(along: Dp): Color {
        val inset = (measure.targetTouch - tokens.sizes.medium.containerHeight) / 2
        return button().captureToImage().toPixelMap().at(along, inset)
    }

    @Test
    @KeyboardNavigation
    fun `BTN-10 glow draws the focus colors as a soft halo - under acme - where ring draws a hard line`() {
        val acme = TanreiSystem.Acme
        assertEquals(TanreiFocusStyle.Glow, acme.behavior.focusStyle)
        val surface = acme.colors.light[TanreiColorRole.Surface]
        val ring = acme.colors.light[TanreiColorRole.FocusRing]
        val m = acme.measure
        setButton(system = acme)
        button().requestFocus().assertIsFocused()
        rule.waitForIdle()
        // Nothing between the control and where the indicator starts, as with the ring.
        assertPixel("the offset stays clear", focusProbe(m.focusOffset / 2), surface)
        // Inside the band the ring would fill: the focus color, nearly whole.
        val inBand = focusProbe(m.focusOffset + m.focusInnerWidth + m.focusOuterWidth / 4)
        assertTrue("the halo carries the focus color: $inBand", tintOf(inBand, surface, ring) > 0.7f)
        // One σ (= half the outer width) beyond the ring's hard outer edge a halo is still there, fading.
        val beyond = focusProbe(m.focusOffset + m.focusInnerWidth + m.focusOuterWidth * 1.5f)
        val tint = tintOf(beyond, surface, ring)
        assertTrue("soft beyond the hard edge: $tint", tint > 0.05f && tint < 0.4f)
    }

    @Test
    @KeyboardNavigation
    fun `BTN-10 ring stops hard where glow still fades - the same system with focus-style ring`() {
        val acme = TanreiSystem.Acme.let { it.copy(behavior = it.behavior.copy(focusStyle = TanreiFocusStyle.Ring)) }
        val m = acme.measure
        setButton(system = acme)
        button().requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertPixel("ring", focusProbe(outerStrokeCenter(m)), acme.colors.light[TanreiColorRole.FocusRing])
        assertPixel("nothing beyond the hard edge", focusProbe(m.focusOffset + m.focusInnerWidth + m.focusOuterWidth * 1.5f), acme.colors.light[TanreiColorRole.Surface])
    }

    // ── Elevation moves between states like the container color ──────────────

    @Test
    fun `BTN-3 the elevation is interpolated between states with the state motion tokens`() {
        val ring = listOf(TanreiShadowLayer(x = 0.dp, y = 0.dp, blur = 0.dp, spread = tokens.sizes.medium.outlineWidth, role = TanreiColorRole.Error))
        setButton(system = tanrei.withFilled(TanreiInteractionState.Hovered) { it.copy(containerElevation = ring, containerColor = tokens.variants.filled.enabled.containerColor) })
        val resting = colors[TanreiColorRole.Primary]
        val error = colors[TanreiColorRole.Error]
        rule.mainClock.autoAdvance = false
        button().performMouseInput { moveTo(center) }
        rule.mainClock.advanceTimeBy(tokens.motionStateDuration / 3L)
        val early = topEdgeProbe()
        assertTrue("the ring is on its way: $early", !isClose(early, resting) && !isClose(early, error))
        rule.mainClock.advanceTimeBy(tokens.motionStateDuration * 2L)
        assertPixel("arrived", topEdgeProbe(), error)
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    /** [TanreiSystem.Tanrei] with the filled variant's tokens of one state changed. */
    private fun TanreiSystem.withFilled(
        state: TanreiInteractionState,
        change: (TanreiButtonVariantStateTokens) -> TanreiButtonVariantStateTokens,
    ): TanreiSystem {
        val filled = button.variants.filled
        val changed = when (state) {
            TanreiInteractionState.Enabled -> filled.copy(enabled = change(filled.enabled))
            TanreiInteractionState.Hovered -> filled.copy(hovered = change(filled.hovered))
            TanreiInteractionState.Focused -> filled.copy(focused = change(filled.focused))
            TanreiInteractionState.Pressed -> filled.copy(pressed = change(filled.pressed))
            TanreiInteractionState.Disabled -> filled.copy(disabled = change(filled.disabled))
        }
        return copy(button = button.copy(variants = button.variants.copy(filled = changed)))
    }

    /** This system with the medium size's tokens changed. */
    private fun TanreiSystem.withMedium(change: (TanreiButtonSizeTokens) -> TanreiButtonSizeTokens): TanreiSystem =
        copy(button = button.copy(sizes = button.sizes.copy(medium = change(button.sizes.medium))))

    /** A pixel inside the container's inline padding, clear of the label. */
    private fun assertContainerColor(expected: Color) {
        val map = button().captureToImage().toPixelMap()
        assertPixel("container", map.at(PROBE_X, measure.targetTouch / 2), expected)
    }

    /** The container's first row (medium size), where an outline or an elevation ring is drawn. */
    private fun topEdgeProbe(): Color {
        val inset = (measure.targetTouch - tokens.sizes.medium.containerHeight) / 2
        return button().captureToImage().toPixelMap().at(PROBE_X, inset)
    }

    /** Just inside the container's top-left corner (medium size): cut away by a round shape, filled by a tight one. */
    private fun cornerProbe(): Color {
        val inset = (measure.targetTouch - tokens.sizes.medium.containerHeight) / 2
        return button().captureToImage().toPixelMap().at(CORNER_PROBE, inset + CORNER_PROBE)
    }

    /** Inside the container's inline padding at its vertical center: near the start, or near the end. */
    private fun containerProbe(fromEnd: Boolean): Color = button().captureToImage().toPixelMap().let { it.at(if (fromEnd) it.widthDp - PROBE_X else PROBE_X, measure.targetTouch / 2) }

    /** At the horizontal center, in the block padding above the label (medium size). */
    private fun centerTopProbe(): Color {
        val inset = (measure.targetTouch - tokens.sizes.medium.containerHeight) / 2
        return button().captureToImage().toPixelMap().let { it.at(it.widthDp / 2, inset + tokens.sizes.medium.containerPaddingBlock / 2) }
    }

    /** How much of [full] lies over [base] in [pixel], 0–1, read from the channel where the two differ most. */
    private fun tintOf(pixel: Color, base: Color, full: Color): Float {
        val channels = listOf(Triple(pixel.red, base.red, full.red), Triple(pixel.green, base.green, full.green), Triple(pixel.blue, base.blue, full.blue))
        val (p, b, f) = channels.maxBy { abs(it.third - it.second) }
        return ((p - b) / (f - b)).coerceIn(0f, 1f)
    }

    private fun isClose(actual: Color, expected: Color): Boolean =
        maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue)) <= PIXEL_TOLERANCE

    /** Distance from the container's edge to the middle of the outer stroke; negative is inside. */
    private fun outerStrokeCenter(m: TanreiMeasure): Dp = m.focusOffset + m.focusInnerWidth + m.focusOuterWidth / 2

    /** The pixel [outside] the container's top edge (medium size), at the horizontal center when outside, in the padding when inside. */
    private fun focusProbe(outside: Dp): Color {
        val inset = (measure.targetTouch - tokens.sizes.medium.containerHeight) / 2
        return button().captureToImage().toPixelMap().let { it.at(if (outside < 0.dp) PROBE_X * 2 else it.widthDp / 2, inset - outside) }
    }

    private val PixelMap.widthDp: Dp get() = with(rule.density) { width.toDp() }

    private fun PixelMap.at(x: Dp, y: Dp): Color = with(rule.density) { this@at[x.roundToPx(), y.roundToPx()] }

    private fun assertPixel(what: String, actual: Color, expected: Color) = assertClose(what, expected, actual, PIXEL_TOLERANCE)

    private fun assertDp(what: String, expected: Dp, actual: Dp) =
        assertTrue("$what: expected $expected but was $actual", abs(expected.value - actual.value) <= DP_TOLERANCE)

    private fun assertClose(what: String, expected: Color, actual: Color, tolerance: Float) {
        val delta = maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue))
        assertTrue("$what: expected $expected but was $actual", delta <= tolerance)
    }

    private companion object {
        const val TAG = "button"
        const val ICON_TAG = "button-with-icon"
        const val UNKNOWN_TAG = "button-unknown"
        const val SCROLLER_TAG = "scroller"
        const val LABEL = "Deploy"
        const val DP_TOLERANCE = 0.5f
        const val PIXEL_TOLERANCE = 2f / 255f
        const val LABEL_TOLERANCE = 12f / 255f
        const val MAX_RIPPLE_FRAMES = 60
        const val PRESSED_OPACITY = 0.5f
        const val SCROLL_STEPS = 4
        val SCROLL_STEP = 8.dp
        val SCROLL_VIEWPORT = 200.dp
        val PROBE_X = 6.dp
        val CORNER_PROBE = 1.dp
        val CORNER_MARGIN = 2.dp
        /** A pixel row the curve has left reads as less than this much container. */
        const val FULL_COVERAGE = 0.9f
        /** Measured: a path drawn twice agrees to 0.005 per pixel, the round rect through two APIs to 0.034; a circle against 0.6 is off by whole pixels. */
        const val COVERAGE_TOLERANCE = 0.05f
        const val COVERAGE_TOTAL_TOLERANCE = 1f
    }
}
