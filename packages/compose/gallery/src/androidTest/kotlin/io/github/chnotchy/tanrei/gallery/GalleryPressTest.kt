package io.github.chnotchy.tanrei.gallery

import androidx.activity.ComponentActivity
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.test.assertTextContains
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import kotlin.math.abs
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * BTN-8 on a device, inside a scrolling container: the gallery IS a vertically scrolling container, and inside one
 * foundation's `clickable` reports a press only after its tap timeout. The button listens to the pointer itself, so
 * touch-down shows the pressed state on the next frame; a press that becomes a scroll is cancelled and clicks nothing.
 */
@RunWith(AndroidJUnit4::class)
class GalleryPressTest {
    @get:Rule
    val rule = createAndroidComposeRule<ComponentActivity>()

    private val system = TanreiSystem.Tanrei
    private val filled = system.button.variants.filled
    private val clicks = mutableListOf<String>()
    private lateinit var fixtures: List<GalleryFixture>

    @Before
    fun setUp() {
        val specs = loadGallerySpecs(InstrumentationRegistry.getInstrumentation().targetContext)
        fixtures = specs.first { it.name == "button" }.fixtures
        // Every shipped system, so the page is taller than any screen and really scrolls.
        rule.setContent { Gallery(specs, onFixtureClick = { clicked, fixture -> clicks += fixtureTag(clicked, fixture) }) }
        // The gallery starts in the device's theme; the expected colors below are the light scheme's.
        rule.onNodeWithTag(ThemeSwitchTag).performClick().assertTextContains("Theme: Light")
    }

    private fun button() = rule.onNodeWithTag(fixtureTag(system, fixtures.first { it.id == "filled-medium" }))

    private fun containerColor(): Color = with(rule.density) {
        button().captureToImage().toPixelMap().let { it[PROBE_X.roundToPx(), it.height / 2] }
    }

    private fun assertContainer(what: String, expected: Color) {
        val actual = containerColor()
        val delta = maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue))
        assertTrue("$what: expected $expected but was $actual", delta <= TOLERANCE)
    }

    @Test
    fun btn8_insideTheScrollingGallery_touchDownShowsThePressedStateOnTheNextFrame_andTheTapClicksOnce() {
        val colors = system.colors.light
        button().performScrollTo()
        assertContainer("resting", filled.enabled.containerColor.resolve(colors))
        rule.mainClock.autoAdvance = false
        button().performTouchInput { down(center) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertContainer("pressed, two frames after touch-down", filled.pressed.containerColor.resolve(colors))
        button().performTouchInput { up() }
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        assertContainer("resting again", filled.enabled.containerColor.resolve(colors))
        assertEquals(listOf("button/tanrei/filled-medium"), clicks)
    }

    @Test
    fun btn8_aPressThatBecomesAScroll_isCancelled_andClicksNothing() {
        val colors = system.colors.light
        button().performScrollTo()
        rule.mainClock.autoAdvance = false
        button().performTouchInput { down(center) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertContainer("pressed", filled.pressed.containerColor.resolve(colors))
        button().performTouchInput { repeat(SCROLL_STEPS) { moveBy(Offset(0f, -SCROLL_STEP.toPx())) } }
        rule.mainClock.advanceTimeBy(system.motion.duration.pressHold + system.button.motionStateDuration * 2L)
        assertContainer("the finger is still down, but this is a scroll: not pressed", filled.enabled.containerColor.resolve(colors))
        button().performTouchInput { up() }
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        assertEquals(emptyList<String>(), clicks)
    }

    private companion object {
        /** A device renders through the GPU: allow a couple of 8-bit steps. */
        const val TOLERANCE = 3f / 255f
        const val SCROLL_STEPS = 4
        val SCROLL_STEP = 8.dp
        val PROBE_X = 6.dp
    }
}
