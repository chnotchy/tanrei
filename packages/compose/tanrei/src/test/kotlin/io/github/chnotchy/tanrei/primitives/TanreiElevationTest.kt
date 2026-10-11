package io.github.chnotchy.tanrei.primitives

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathOperation
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiShadowLayer
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import kotlin.math.abs
import kotlin.math.sqrt
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Shadow tokens have CSS `box-shadow` semantics: `blur` is the CSS blur radius, σ = blur / 2.
 * `primitives/TanreiElevation.kt` is the one place that converts it to what Android draws; this is its test —
 * the arithmetic, and the pixels it produces.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiElevationTest {
    @get:Rule
    val rule = createComposeRule()

    // ── the conversion ───────────────────────────────────────────────────────

    @Test
    fun `a CSS blur radius stands for a Gaussian of half that sigma`() {
        assertEquals(0f, cssBlurToSigma(0f))
        assertEquals(1f, cssBlurToSigma(2f))
        assertEquals(12f, cssBlurToSigma(24f))
    }

    @Test
    fun `the Android blur radius is the one whose sigma - 0_57735 r + 0_5 - equals blur over 2`() {
        for (blur in listOf(2f, 4f, 8f, 16f, 32f, 72f)) {
            val radius = cssBlurToAndroidBlurRadius(blur)
            assertEquals("blur $blur", blur / 2f, SKIA_SIGMA_SCALE * radius + SKIA_SIGMA_OFFSET, 1e-4f)
            assertTrue("never the CSS number passed through: $blur -> $radius", radius < blur)
        }
        assertEquals((2f - 0.5f) / SKIA_SIGMA_SCALE, cssBlurToAndroidBlurRadius(4f), 1e-4f)
    }

    @Test
    fun `a blur of one pixel or less is no blur, and never negative`() {
        assertEquals(0f, cssBlurToAndroidBlurRadius(0f))
        assertEquals(0f, cssBlurToAndroidBlurRadius(1f))
        assertEquals(0f, cssBlurToAndroidBlurRadius(-3f))
    }

    @Test
    fun `the conversion happens in pixels, so the same token gives another radius at another density`() {
        val token = 2.dp
        val xhdpi = with(Density(2f)) { cssBlurToAndroidBlurRadius(token.toPx()).toDp() }
        val xxxhdpi = with(Density(4f)) { cssBlurToAndroidBlurRadius(token.toPx()).toDp() }
        assertEquals(cssBlurToAndroidBlurRadius(4f) / 2f, xhdpi.value, 1e-4f)
        assertEquals(cssBlurToAndroidBlurRadius(8f) / 4f, xxxhdpi.value, 1e-4f)
        assertTrue(xxxhdpi > xhdpi)
    }

    // ── the spread ───────────────────────────────────────────────────────────

    @Test
    fun `spread moves every edge and a rounded corner's radius with it - a sharp corner stays sharp, nothing is left of a shape shrunk away`() {
        val rect = Rect(0f, 0f, 100f, 40f)
        assertEquals(Rect(-6f, -6f, 106f, 46f), spreadShadowPath(Outline.Rectangle(rect), 6f).getBounds())
        assertEquals(Rect(12f, 12f, 88f, 28f), spreadShadowPath(Outline.Rectangle(rect), -12f).getBounds())
        assertTrue(spreadShadowPath(Outline.Rectangle(rect), -20f).isEmpty)

        // A pill (radius 20) shrunk by 12 is a pill of radius 8; grown by 6, of radius 26: the corner point proves it.
        fun Path.containsPoint(x: Float, y: Float) = Path().also { it.op(this, Path().apply { addRect(Rect(x - 0.25f, y - 0.25f, x + 0.25f, y + 0.25f)) }, PathOperation.Intersect) }.isEmpty.not()
        val pill = Outline.Rounded(RoundRect(rect, CornerRadius(20f)))
        val shrunk = spreadShadowPath(pill, -12f)
        assertEquals(Rect(12f, 12f, 88f, 28f), shrunk.getBounds())
        assertTrue("inside the radius-8 corner", shrunk.containsPoint(12f + 8f * 0.35f, 12f + 8f * 0.35f))
        assertTrue("outside it: the corner is still round", !shrunk.containsPoint(12.5f, 12.5f))
        val grown = spreadShadowPath(pill, 6f)
        assertTrue("outside the radius-26 corner", !grown.containsPoint(-6f + 26f * 0.25f, -6f + 26f * 0.25f))
        assertTrue("inside it", grown.containsPoint(-6f + 26f * 0.32f, -6f + 26f * 0.32f))
        // A sharp corner of a rounded outline stays sharp.
        val tab = Outline.Rounded(RoundRect(rect, topLeft = CornerRadius(20f), topRight = CornerRadius(20f), bottomRight = CornerRadius.Zero, bottomLeft = CornerRadius.Zero))
        assertTrue(spreadShadowPath(tab, 6f).containsPoint(105.5f, 45.5f))

        // Any other path (smoothed corners): the same edges, through a round-joined band.
        val generic = Outline.Generic(smoothedRoundRectPath(rect, 12f, 0.6f))
        val genericGrown = spreadShadowPath(generic, 6f).getBounds()
        val genericShrunk = spreadShadowPath(generic, -6f).getBounds()
        for ((what, expected, actual) in listOf(Triple("grown", Rect(-6f, -6f, 106f, 46f), genericGrown), Triple("shrunk", Rect(6f, 6f, 94f, 34f), genericShrunk))) {
            assertEquals("$what left", expected.left, actual.left, 0.5f)
            assertEquals("$what top", expected.top, actual.top, 0.5f)
            assertEquals("$what right", expected.right, actual.right, 0.5f)
            assertEquals("$what bottom", expected.bottom, actual.bottom, 0.5f)
        }
        assertTrue(spreadShadowPath(generic, -20f).isEmpty)
    }

    // ── the pixels ───────────────────────────────────────────────────────────

    @Test
    fun `a drawn shadow falls off like the Gaussian CSS describes - half at the edge, 16 percent one sigma out, 84 percent one sigma in`() {
        val blur = 16.dp // 32px at this density: σ = 16px = 8dp
        val sigma = blur / 2
        val box = 96.dp
        val stage = 200.dp
        val black = TanreiSystem.Tanrei.let { system -> system.copy(colors = system.colors.copy(light = system.colors.light.copy(TanreiColorRole.OnSurface to Color.Black))) }
        rule.setContent {
            TanreiTheme(system = black, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Box(Modifier.testTag(STAGE).size(stage).background(Color.White), contentAlignment = Alignment.Center) {
                    Box(Modifier.size(box).tanreiElevation(listOf(TanreiShadowLayer(x = 0.dp, y = 0.dp, blur = blur, spread = 0.dp, role = TanreiColorRole.OnSurface)), RectangleShape))
                }
            }
        }
        val map = rule.onNodeWithTag(STAGE).captureToImage().toPixelMap()
        val edge = (stage + box) / 2
        fun coverage(distance: androidx.compose.ui.unit.Dp): Float = with(rule.density) { 1f - map[(edge + distance).roundToPx(), (stage / 2).roundToPx()].red }
        assertEquals("at the edge", 0.5f, coverage(0.dp), TOLERANCE)
        assertEquals("one sigma outside", 0.1587f, coverage(sigma), TOLERANCE)
        assertEquals("one sigma inside", 0.8413f, coverage(-sigma), TOLERANCE)
        // The tail is drawn to the end. Compose's own `Modifier.dropShadow` stops at its blur radius (≈ 1.7σ): it reads
        // 0 from 1.75σ on, where the Gaussian still has 4.0% — and 2.3% at 2σ.
        assertEquals("1.75 sigma outside", 0.0401f, coverage(sigma * 1.75f), TAIL_TOLERANCE)
        assertEquals("two sigma outside", 0.0228f, coverage(sigma * 2), TAIL_TOLERANCE)
        assertTrue("two and a half sigma outside: the last 0.6% is still there", coverage(sigma * 2.5f) > 0f)
        assertEquals("four sigma outside: nothing", 0f, coverage(sigma * 4))
        // What passing the CSS number through would draw (σ = 0.57735 · 32 + 0.5 = 18.97px): 0.20 one CSS-sigma out.
        assertTrue("not the pass-through shadow", abs(coverage(sigma) - 0.1995f) > TOLERANCE)
    }

    @Test
    fun `a small spread shadow sits on the Gaussian pixel by pixel, the same on both sides - no sub-pixel drift`() {
        // m3-like's level1 is of this kind: blur 3dp (σ = 3px here), spread 1dp. Compose's own `Modifier.dropShadow`
        // places its bitmap at a fractional offset (−radius − spread) and reads up to 0.045 off this curve, lopsided.
        val blur = 3.dp
        val spread = 1.dp
        val box = 40.dp
        val stage = 100.dp
        rule.setContent {
            Box(Modifier.testTag(STAGE).size(stage).background(Color.White), contentAlignment = Alignment.Center) {
                Box(Modifier.size(box).tanreiElevation(listOf(TanreiDrawnShadow(0.dp, 0.dp, blur, spread, Color.Black)), RectangleShape))
            }
        }
        val map = rule.onNodeWithTag(STAGE).captureToImage().toPixelMap()
        val (sigma, right, left, row) = with(rule.density) { listOf(blur.toPx() / 2, ((stage + box) / 2 + spread).toPx(), ((stage - box) / 2 - spread).toPx(), (stage / 2).toPx()) }
        fun gaussianInside(distance: Float): Float = (0.5 * (1.0 - erf(distance / (sigma * sqrt(2.0))))).toFloat()
        for (step in -8..10) {
            val expected = gaussianInside(step + 0.5f) // the center of the pixel `step` pixels outside the shadow shape's edge
            val onTheRight = 1f - map[right.toInt() + step, row.toInt()].red
            val onTheLeft = 1f - map[left.toInt() - 1 - step, row.toInt()].red
            assertEquals("right, $step px out", expected, onTheRight, TOLERANCE)
            assertEquals("left, $step px out", expected, onTheLeft, TOLERANCE)
            assertEquals("both sides, $step px out", onTheLeft, onTheRight, 1f / 255f + 1e-4f)
        }
    }

    @Test
    fun `level0 is an empty list and draws nothing at all`() {
        assertEquals(emptyList<TanreiShadowLayer>(), TanreiSystem.Tanrei.elevation.level0)
        assertEquals(0.dp, TanreiSystem.Tanrei.elevation.level0.extent)
        // A level reaches as far as its widest shadow draws: offset + spread + the whole tail, 3σ = 1.5 × the CSS blur.
        assertEquals(8.dp + 24.dp + 4.dp, listOf(TanreiShadowLayer(x = 0.dp, y = 8.dp, blur = 16.dp, spread = 4.dp, role = TanreiColorRole.OnSurface)).extent)
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Box(Modifier.testTag(STAGE).size(64.dp).background(Color.White), contentAlignment = Alignment.Center) {
                    Box(Modifier.size(32.dp).tanreiElevation(TanreiTheme.tokens.elevation.level0, RectangleShape))
                }
            }
        }
        val map = rule.onNodeWithTag(STAGE).captureToImage().toPixelMap()
        for (y in 0 until map.height) for (x in 0 until map.width) assertEquals("pixel $x,$y", Color.White, map[x, y])
    }

    // ── interpolation ────────────────────────────────────────────────────────

    private val red = Color(1f, 0f, 0f, 1f)

    @Test
    fun `levels blend like a CSS box-shadow transition - pairwise, the shorter list padded with nothing`() {
        val to = listOf(
            TanreiDrawnShadow(0.dp, 0.dp, 0.dp, 1.dp, red),
            TanreiDrawnShadow(0.dp, 4.dp, 8.dp, (-2).dp, Color.Black.copy(alpha = 0.4f)),
        )
        val half = lerpShadows(emptyList(), to, 0.5f)
        assertEquals(2, half.size)
        assertEquals(TanreiDrawnShadow(0.dp, 0.dp, 0.dp, 0.5.dp, red.copy(alpha = 0.5f)), half[0])
        assertTrue("a ring on its way is still a ring", half[0].isRing)
        assertEquals(TanreiDrawnShadow(0.dp, 2.dp, 4.dp, (-1).dp, Color.Black.copy(alpha = 0.2f)), half[1])
        // The way back pads the other side.
        assertEquals(half, lerpShadows(to, emptyList(), 0.5f))
    }

    @Test
    fun `the ends of a transition are exactly the levels, so a resting shadow is drawn as before`() {
        val from = listOf(TanreiDrawnShadow(0.dp, 1.dp, 2.dp, 0.dp, Color.Black))
        val to = listOf(TanreiDrawnShadow(0.dp, 4.dp, 8.dp, 0.dp, red))
        assertSame(from, lerpShadows(from, to, 0f))
        assertSame(to, lerpShadows(from, to, 1f))
    }

    @Test
    fun `a color fading in keeps its hue - premultiplied, like the container color`() {
        val quarter = lerpShadows(emptyList(), listOf(TanreiDrawnShadow(0.dp, 0.dp, 4.dp, 0.dp, red)), 0.25f).single()
        assertEquals(red.copy(alpha = 0.25f), quarter.color)
    }

    /** Abramowitz–Stegun 7.1.26: |error| < 1.5e-7. */
    private fun erf(x: Double): Double {
        val t = 1.0 / (1.0 + 0.3275911 * abs(x))
        val y = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * kotlin.math.exp(-x * x)
        return if (x >= 0) y else -y
    }

    private companion object {
        const val STAGE = "stage"
        const val SKIA_SIGMA_SCALE = 0.57735f
        const val SKIA_SIGMA_OFFSET = 0.5f

        /** Skia blurs with successive box blurs, a close approximation of a Gaussian; and pixels are 8-bit. */
        const val TOLERANCE = 0.02f

        /** Out in the tail the three box blurs sit within two 8-bit steps of the Gaussian. */
        const val TAIL_TOLERANCE = 0.008f
    }
}
