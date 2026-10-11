package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.ui.Modifier
import androidx.compose.ui.MotionDurationScale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiPressedFeedback
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import kotlin.math.abs
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * BTN-9 "appears whole where motion is reduced". On Android reduced motion IS the animator duration scale: the
 * accessibility setting "Remove animations" sets it to 0, and Compose hands it to every animation as the
 * [MotionDurationScale] of the composition's effect context. This rule's composition runs with scale 0.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiButtonReducedMotionTest {
    private object NoMotion : MotionDurationScale {
        override val scaleFactor: Float = 0f
    }

    @get:Rule
    val rule = createComposeRule(effectContext = NoMotion)

    private val system = TanreiSystem.Tanrei.let { it.copy(behavior = it.behavior.copy(pressedFeedback = TanreiPressedFeedback.Ripple)) }
    private val colors = system.colors.light

    @Test
    fun `BTN-9 where motion is reduced the ripple appears whole - the far end is pressed on the next frame, and it leaves at once`() {
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Box(Modifier.background(TanreiColorRole.Surface.color).padding(TanreiTheme.tokens.space.space200)) {
                    TanreiButton(text = "Deploy", onClick = {}, modifier = Modifier.testTag(TAG))
                }
            }
        }
        val filled = system.button.variants.filled
        assertTrue("the growth would take many frames", system.button.motionFeedbackDuration > FRAME_MILLIS * 10)
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag(TAG).performTouchInput { down(Offset(PROBE_X.toPx(), centerY)) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertFarEnd("whole at once", filled.pressed.containerColor.resolve(colors))
        rule.onNodeWithTag(TAG).performTouchInput { up() }
        // The hold still applies (it is not an animation); after it the layer is gone without a fade.
        rule.mainClock.advanceTimeBy(system.motion.duration.pressHold.toLong())
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertFarEnd("gone at once", filled.enabled.containerColor.resolve(colors))
    }

    private fun assertFarEnd(what: String, expected: Color) {
        val actual = with(rule.density) {
            rule.onNodeWithTag(TAG).captureToImage().toPixelMap().let { it[it.width - PROBE_X.roundToPx(), (system.measure.targetTouch / 2).roundToPx()] }
        }
        val delta = maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue))
        assertTrue("$what: expected $expected but was $actual", delta <= 2f / 255f)
    }

    private companion object {
        const val TAG = "button"
        const val FRAME_MILLIS = 16
        val PROBE_X = 6.dp
    }
}
