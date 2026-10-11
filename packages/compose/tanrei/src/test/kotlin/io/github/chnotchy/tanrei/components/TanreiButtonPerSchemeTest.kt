package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performMouseInput
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.toneperstate.design.TonePerState
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiScheme
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import kotlin.math.abs
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.Rule
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * A component color that differs PER SCHEME, end to end: the fixture layer
 * `packages/tokens-build/test/fixtures/tone-per-state.system.json` gives the filled Button's hovered and pressed
 * container a non-monotonic `tone` rule — light [35] / dark [80], and light [20, 15, 10] / dark [90] — so no role and
 * no mix describes them. The Kotlin a product gets for it is `com.toneperstate.design.TanreiSystemTonePerState`
 * (generated, `TanreiPaint.Scheme`); this test draws it in all six schemes.
 *
 * The expected colors are NOT read from the generated Kotlin: they are the `$value`s of the two tokens in the
 * system's token bundle (`resolveSystem(...).model().componentColors[scheme]`), written down here.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiButtonPerSchemeTest {
    @get:Rule
    val rule = createComposeRule()

    private val system = TanreiSystem.TonePerState

    private class Expected(val theme: TanreiThemeMode, val contrast: TanreiContrast, val hovered: Color, val pressed: Color)

    private val bundle = mapOf(
        TanreiScheme.Light to Expected(TanreiThemeMode.Light, TanreiContrast.Standard, hovered = Color(0xFF005497), pressed = Color(0xFF00315C)),
        TanreiScheme.LightMedium to Expected(TanreiThemeMode.Light, TanreiContrast.Medium, hovered = Color(0xFF005497), pressed = Color(0xFF00264A)),
        TanreiScheme.LightHigh to Expected(TanreiThemeMode.Light, TanreiContrast.High, hovered = Color(0xFF005497), pressed = Color(0xFF001C39)),
        TanreiScheme.Dark to Expected(TanreiThemeMode.Dark, TanreiContrast.Standard, hovered = Color(0xFFA3C9FF), pressed = Color(0xFFD3E3FF)),
        TanreiScheme.DarkMedium to Expected(TanreiThemeMode.Dark, TanreiContrast.Medium, hovered = Color(0xFFA3C9FF), pressed = Color(0xFFD3E3FF)),
        TanreiScheme.DarkHigh to Expected(TanreiThemeMode.Dark, TanreiContrast.High, hovered = Color(0xFFA3C9FF), pressed = Color(0xFFD3E3FF)),
    )

    @Test
    fun `the fixture really needs a per-scheme paint - the two tokens are TanreiPaint Scheme, the resting one is a role`() {
        val filled = system.button.variants.filled
        assertTrue(filled.hovered.containerColor is TanreiPaint.Scheme)
        assertTrue(filled.pressed.containerColor is TanreiPaint.Scheme)
        assertEquals(TanreiPaint.Role(TanreiColorRole("brand")), filled.enabled.containerColor)
        assertEquals("every scheme is covered", TanreiScheme.entries.toSet(), bundle.keys)
    }

    @Test
    fun `resolve answers with the token bundle's value in every scheme`() {
        val filled = system.button.variants.filled
        for ((scheme, expected) in bundle) {
            val colors = system.colors[scheme]
            assertEquals("the colors know their scheme", scheme, colors.scheme)
            assertEquals("hovered in ${scheme.key}", expected.hovered, filled.hovered.containerColor.resolve(colors))
            assertEquals("pressed in ${scheme.key}", expected.pressed, filled.pressed.containerColor.resolve(colors))
        }
    }

    @Test
    fun `BTN-3 the button draws the per-scheme hovered and pressed colors in all six schemes, following a live scheme change`() {
        var current by mutableStateOf(bundle.getValue(TanreiScheme.Light))
        rule.setContent {
            TanreiTheme(system = system, theme = current.theme, contrast = current.contrast) {
                Box(Modifier.background(TanreiColorRole.Surface.color).padding(TanreiTheme.tokens.space.space200)) {
                    TanreiButton(text = "Deploy", onClick = {}, modifier = Modifier.testTag(TAG))
                }
            }
        }
        val button = rule.onNodeWithTag(TAG)
        for ((scheme, expected) in bundle) {
            current = expected
            rule.waitForIdle()
            val resting = system.colors[scheme][TanreiColorRole("brand")]
            assertContainer("${scheme.key} resting", resting)
            button.performMouseInput { moveTo(center) }
            rule.waitForIdle()
            assertContainer("${scheme.key} hovered", expected.hovered)
            button.performMouseInput { press() }
            rule.waitForIdle()
            assertContainer("${scheme.key} pressed", expected.pressed)
            button.performMouseInput { release(); exit() }
            rule.waitForIdle()
            assertContainer("${scheme.key} resting again", resting)
        }
    }

    private fun assertContainer(what: String, expected: Color) {
        val actual = with(rule.density) {
            rule.onNodeWithTag(TAG).captureToImage().toPixelMap()[PROBE_X.roundToPx(), (system.measure.targetTouch / 2).roundToPx()]
        }
        val delta = maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue))
        assertTrue("$what: expected $expected but was $actual", delta <= PIXEL_TOLERANCE)
    }

    private companion object {
        const val TAG = "button"
        const val PIXEL_TOLERANCE = 2f / 255f
        val PROBE_X = 6.dp
    }
}
