package io.github.chnotchy.tanrei.primitives

import androidx.compose.animation.core.SnapSpec
import androidx.compose.animation.core.TweenSpec
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.MotionDurationScale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.toEasing
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState.Disabled
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState.Enabled
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState.Focused
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState.Hovered
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState.Pressed
import io.github.chnotchy.tanrei.tokens.TanreiPressedFeedback
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import kotlin.math.abs
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * The shared press-feedback primitives every pressable component draws with — tested on a bare container
 * made of primitives only, so nothing here is Button's: which state each part draws from ([tanreiDrawnStatesOf]),
 * how a state change moves ([TanreiStateMotion]) and the ripple ([rememberTanreiRipple] + [tanreiContainer]).
 * Button's own BTN-8 / BTN-9 tests cover the same rules through the component.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiPressFeedbackTest {
    @get:Rule
    val rule = createComposeRule()

    private val system = TanreiSystem.Tanrei

    @Test
    fun `drawn states - overlay draws the press everywhere, ripple and dim keep only the container under it, none keeps everything`() {
        for (under in listOf(Enabled, Hovered, Focused)) {
            assertEquals(TanreiDrawnStates(content = Pressed, container = Pressed), tanreiDrawnStatesOf(Pressed, under, TanreiPressedFeedback.Overlay))
            assertEquals(TanreiDrawnStates(content = Pressed, container = under), tanreiDrawnStatesOf(Pressed, under, TanreiPressedFeedback.Ripple))
            assertEquals(TanreiDrawnStates(content = Pressed, container = under), tanreiDrawnStatesOf(Pressed, under, TanreiPressedFeedback.Dim))
            assertEquals(TanreiDrawnStates(content = under, container = under), tanreiDrawnStatesOf(Pressed, under, TanreiPressedFeedback.None))
        }
        // Without a press every feedback draws the state as it is.
        for (feedback in TanreiPressedFeedback.entries) {
            for (state in listOf(Enabled, Hovered, Focused, Disabled)) {
                assertEquals("$feedback / $state", TanreiDrawnStates(state, state), tanreiDrawnStatesOf(state, state, feedback))
            }
        }
    }

    @Test
    fun `state motion - entering pressed snaps, every other state moves with the component's duration and easing`() {
        val easing = system.motion.easing.standard
        assertTrue(TanreiStateMotion(Pressed, 250, easing).spec<Float>() is SnapSpec<Float>)
        for (state in listOf(Enabled, Hovered, Focused, Disabled)) {
            val spec = TanreiStateMotion(state, 250, easing).spec<Float>()
            assertTrue("$state: $spec", spec is TweenSpec<Float>)
            spec as TweenSpec<Float>
            assertEquals(250, spec.durationMillis)
            assertEquals(easing.toEasing(), spec.easing)
        }
    }

    @Test
    fun `a system that does not ripple gets no ripple`() {
        val results = mutableMapOf<TanreiPressedFeedback, Boolean>()
        rule.setContent {
            TanreiTheme(system = system) {
                val interaction = remember { MutableInteractionSource() }.collectTanreiInteraction()
                for (feedback in TanreiPressedFeedback.entries) {
                    results[feedback] = rememberTanreiRipple(feedback, interaction, RIPPLE, GROW_MILLIS, FADE_MILLIS, system.motion.easing.linear) != null
                }
            }
        }
        rule.waitForIdle()
        assertEquals(mapOf(TanreiPressedFeedback.Overlay to false, TanreiPressedFeedback.Ripple to true, TanreiPressedFeedback.Dim to false, TanreiPressedFeedback.None to false), results)
    }

    @Test
    fun `the ripple grows from the point of contact over the feedback duration, is held, then fades over the state duration`() {
        rule.setContent { Pressable(system) }
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag(TAG).performTouchInput { down(Offset(PROBE.toPx(), centerY)) }
        rule.mainClock.advanceTimeBy(GROW_MILLIS / 8L)
        assertPixel("reached the point of contact", probe(fromEnd = false), RIPPLE)
        assertPixel("not yet the far end", probe(fromEnd = true), CONTAINER)
        rule.mainClock.advanceTimeBy(GROW_MILLIS.toLong())
        assertPixel("the far end once grown", probe(fromEnd = true), RIPPLE)
        // Held down: it never fades, however long.
        rule.mainClock.advanceTimeBy(FADE_MILLIS * 4L)
        assertPixel("a held press keeps its ripple", probe(fromEnd = true), RIPPLE)
        // The press has lasted longer than press-hold, so the fade starts with the release; halfway through the
        // (linear) fade the ripple is half there.
        assertTrue(FADE_MILLIS * 4 > system.motion.duration.pressHold)
        rule.onNodeWithTag(TAG).performTouchInput { up() }
        rule.mainClock.advanceTimeBy(FADE_MILLIS / 2L)
        val half = probe(fromEnd = true)
        assertTrue("half faded: $half", half.red in 0.3f..0.7f && half.blue in 0.3f..0.7f)
        rule.mainClock.advanceTimeBy(FADE_MILLIS.toLong())
        assertPixel("gone", probe(fromEnd = true), CONTAINER)
    }

    /** A container built from the primitives alone: input, press, ripple, container — no component. */
    @Composable
    private fun Pressable(system: TanreiSystem) {
        TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
            val source = remember { MutableInteractionSource() }
            val interaction = source.collectTanreiInteraction()
            val ripple = rememberTanreiRipple(TanreiPressedFeedback.Ripple, interaction, RIPPLE, GROW_MILLIS, FADE_MILLIS, system.motion.easing.linear)
            Box(Modifier.background(Color.White).padding(8.dp)) {
                Box(
                    Modifier
                        .testTag(TAG)
                        .clickable(interactionSource = source, indication = null) {}
                        .tanreiPressInput(interaction.press)
                        .tanreiRippleInput(ripple)
                        .tanreiContainer(RectangleShape, containerColor = { CONTAINER }, outlineColor = Color.Transparent, outlineWidth = 0.dp, ripple = ripple)
                        .size(WIDTH, HEIGHT),
                )
            }
        }
    }

    private fun probe(fromEnd: Boolean): Color = with(rule.density) {
        rule.onNodeWithTag(TAG).captureToImage().toPixelMap().let { it[if (fromEnd) it.width - PROBE.roundToPx() else PROBE.roundToPx(), it.height / 2] }
    }

    private fun assertPixel(what: String, actual: Color, expected: Color) {
        val delta = maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue))
        assertTrue("$what: expected $expected but was $actual", delta <= 2f / 255f)
    }

    private companion object {
        const val TAG = "pressable"
        const val GROW_MILLIS = 400
        const val FADE_MILLIS = 200
        val WIDTH = 200.dp
        val HEIGHT = 40.dp
        val PROBE = 4.dp
        val CONTAINER = Color.Blue
        val RIPPLE = Color.Red
    }
}

/**
 * Where motion is reduced (Android: the animator duration scale 0, "Remove animations") the shared ripple appears
 * whole and leaves at once — for every component that draws it, not only Button (BTN-9).
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiRippleReducedMotionTest {
    private object NoMotion : MotionDurationScale {
        override val scaleFactor: Float = 0f
    }

    @get:Rule
    val rule = createComposeRule(effectContext = NoMotion)

    @Test
    fun `where motion is reduced the ripple appears whole and leaves without a fade`() {
        val system = TanreiSystem.Tanrei
        rule.setContent {
            TanreiTheme(system = system) {
                val source = remember { MutableInteractionSource() }
                val interaction = source.collectTanreiInteraction()
                val ripple = rememberTanreiRipple(TanreiPressedFeedback.Ripple, interaction, Color.Red, 1000, 1000, system.motion.easing.linear)
                Box(
                    Modifier
                        .testTag("pressable")
                        .clickable(interactionSource = source, indication = null) {}
                        .tanreiPressInput(interaction.press)
                        .tanreiRippleInput(ripple)
                        .tanreiContainer(RectangleShape, containerColor = { Color.Blue }, outlineColor = Color.Transparent, outlineWidth = 0.dp, ripple = ripple)
                        .size(200.dp, 40.dp),
                )
            }
        }
        fun farEnd(): Color = rule.onNodeWithTag("pressable").captureToImage().toPixelMap().let { it[it.width - 4, it.height / 2] }
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag("pressable").performTouchInput { down(Offset(8f, centerY)) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertEquals("whole at once", Color.Red, farEnd())
        rule.onNodeWithTag("pressable").performTouchInput { up() }
        rule.mainClock.advanceTimeBy(system.motion.duration.pressHold.toLong())
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertEquals("gone at once", Color.Blue, farEnd())
    }
}

