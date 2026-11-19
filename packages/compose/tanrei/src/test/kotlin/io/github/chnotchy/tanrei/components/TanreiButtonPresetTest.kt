package io.github.chnotchy.tanrei.components

import android.content.pm.ApplicationInfo
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PixelMap
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performMouseInput
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.height
import androidx.compose.ui.unit.width
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.Cupertino
import io.github.chnotchy.tanrei.tokens.M3Like
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiShadowLayer
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import io.github.chnotchy.tanrei.tokens.Xlarge
import io.github.chnotchy.tanrei.tokens.Xsmall
import io.github.chnotchy.tanrei.tokens.xlarge
import io.github.chnotchy.tanrei.tokens.xsmall
import kotlin.math.abs
import kotlin.math.sqrt
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * The shipped presets drive [TanreiButton] through values alone: the component has no preset-specific
 * code, so everything asserted here is read from the system instance and then found in the pixels.
 * Covers BTN-3 (a state is drawn from that state's tokens) under `m3-like` and `cupertino`, and the sizes
 * `m3-like` adds to the vocabulary (`xsmall`, `xlarge`) together with its per-size gap and outline width.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiButtonPresetTest {
    @get:Rule
    val rule = createComposeRule()

    private val tanrei = TanreiSystem.Tanrei
    private val m3 = TanreiSystem.M3Like
    private val cupertino = TanreiSystem.Cupertino

    private fun setButton(system: TanreiSystem, variant: TanreiButtonVariant = TanreiButtonVariant.Filled, size: TanreiButtonSize = TanreiButtonSize.Medium) {
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Box(Modifier.testTag(STAGE).background(TanreiColorRole.Surface.color).padding(TanreiTheme.tokens.space.space200)) {
                    TanreiButton(text = LABEL, onClick = {}, modifier = Modifier.testTag(TAG), variant = variant, size = size)
                }
            }
        }
        rule.waitForIdle()
    }

    private fun button() = rule.onNodeWithTag(TAG)

    // ── every shipped system passes the theme's debug check ──────────────────

    @Test
    fun `a debuggable app accepts every shipped system - no role is read that the system does not define`() {
        val info = ApplicationProvider.getApplicationContext<android.content.Context>().applicationInfo
        info.flags = info.flags or ApplicationInfo.FLAG_DEBUGGABLE
        var seen = emptyList<String>()
        rule.setContent {
            for (system in listOf(tanrei, m3, cupertino)) {
                TanreiTheme(system = system) { seen = seen + TanreiTheme.tokens.id }
            }
        }
        rule.waitForIdle()
        assertEquals(listOf(tanrei.id, m3.id, cupertino.id), seen.distinct())
    }

    // ── m3-like ──────────────────────────────────────────────────────────────

    @Test
    fun `BTN-3 m3-like - the filled medium container is a pill filled with the system's primary`() {
        val tokens = m3.button
        val colors = m3.colors.light
        // The values: a radius of at least half the height, and a container paint that is this system's primary.
        assertTrue("container.shape is a full corner", tokens.containerShape >= tokens.sizes.medium.containerHeight / 2)
        val container = tokens.variants.filled.enabled.containerColor.resolve(colors)
        assertEquals(colors[TanreiColorRole.Primary], container)
        assertNotEquals("the preset's primary is not the default system's", tanrei.button.variants.filled.enabled.containerColor.resolve(tanrei.colors.light), container)

        setButton(m3)
        assertContainerColor(m3, container)
        // The pixels: the corner is a circle whose radius is half the drawn height.
        assertCornerRadius(m3, radius = tokens.sizes.medium.containerHeight / 2, container = container)
    }

    @Test
    fun `BTN-3 m3-like - a state is the state layer mix the system describes`() {
        val colors = m3.colors.light
        setButton(m3)
        button().performTouchInput { down(center) }
        rule.waitForIdle()
        val pressed = m3.button.variants.filled.pressed.containerColor.resolve(colors)
        assertNotEquals("m3-like has a pressed state layer", m3.button.variants.filled.enabled.containerColor.resolve(colors), pressed)
        assertContainerColor(m3, pressed)
    }

    @Test
    fun `m3-like - elevated is a soft shadow without a border ring`() {
        val tokens = m3.button
        val colors = m3.colors.light
        val level = tokens.variants.elevated.enabled.containerElevation
        assertTrue("the level has real shadows", level.any { it.blur > 0.dp })
        setButton(m3, TanreiButtonVariant.Elevated)

        // Shadows reach outside the button's own bounds: look at the stage around it.
        val map = rule.onNodeWithTag(STAGE).captureToImage().toPixelMap()
        val surface = colors[TanreiColorRole.Surface]
        val container = tokens.variants.elevated.enabled.containerColor.resolve(colors)
        val top = m3.space.space200 + m3.containerTop(tokens.sizes.medium.containerHeight)
        val bottom = top + tokens.sizes.medium.containerHeight
        val centerX = map.widthDp / 2
        // No ring: the container's first and last rows are the container itself, not a border.
        assertPixel("first container row", map.at(centerX, top + HALF_PIXEL), container)
        assertPixel("last container row", map.at(centerX, bottom - 1.dp), container)
        // A shadow: just below the container the surface is darkened, and it fades out with distance.
        val near = map.at(centerX, bottom + 1.dp)
        val far = map.at(centerX, bottom + level.reach() + 1.dp)
        assertTrue("shadow right below the container: $near on $surface", near.luminance() < surface.luminance() - SHADOW_VISIBLE)
        assertPixel("no shadow beyond the level's reach", far, surface)
    }

    @Test
    fun `a transparent elevation ring draws no border and the shadows that follow still draw`() {
        // The shape the brief describes for a ringless system: layer one is a ring whose color has alpha 0.
        val colors = m3.colors.light
        val ring = TanreiShadowLayer(x = 0.dp, y = 0.dp, blur = 0.dp, spread = m3.button.sizes.medium.outlineWidth, role = TanreiColorRole.ElevationRing)
        assertEquals("m3-like's ring color is transparent", 0f, colors[TanreiColorRole.ElevationRing].alpha)
        val elevated = m3.button.variants.elevated
        val level = listOf(ring) + elevated.enabled.containerElevation
        val system = m3.copy(button = m3.button.copy(variants = m3.button.variants.copy(elevated = elevated.copy(enabled = elevated.enabled.copy(containerElevation = level)))))
        setButton(system, TanreiButtonVariant.Elevated)

        val map = rule.onNodeWithTag(STAGE).captureToImage().toPixelMap()
        val top = m3.space.space200 + m3.containerTop(m3.button.sizes.medium.containerHeight)
        val bottom = top + m3.button.sizes.medium.containerHeight
        assertPixel("first container row", map.at(map.widthDp / 2, top + HALF_PIXEL), elevated.enabled.containerColor.resolve(colors))
        val near = map.at(map.widthDp / 2, bottom + 1.dp)
        assertTrue("shadow right below the container", near.luminance() < colors[TanreiColorRole.Surface].luminance() - SHADOW_VISIBLE)
    }

    // ── open role keys ───────────────────────────────────────────────────────

    @Test
    fun `a token naming tertiary draws m3-like's tertiary`() {
        val tertiary = TanreiColorRole("tertiary")
        setButton(m3.withFilledContainer(TanreiPaint.Role(tertiary)))
        assertTrue(tertiary in m3.colors.light)
        assertContainerColor(m3, m3.colors.light[tertiary])
    }

    @Test
    fun `a token naming accent draws the default system's accent`() {
        val accent = TanreiColorRole("accent")
        setButton(tanrei.withFilledContainer(TanreiPaint.Role(accent)))
        assertTrue(accent in tanrei.colors.light)
        assertContainerColor(tanrei, tanrei.colors.light[accent])
    }

    // ── m3-like's added sizes: two of them, gap and outline width per size ────

    @Test
    fun `m3-like - xlarge outlined is 136 tall with a 3dp outline and a 16dp gap, read from the system`() {
        val metrics = m3.button.sizes.xlarge
        assertEquals(136.dp, metrics.containerHeight)
        assertEquals(3.dp, metrics.outlineWidth)
        assertEquals(16.dp, metrics.containerGap)
        assertNotEquals("the size has its own outline width", m3.button.sizes.medium.outlineWidth, metrics.outlineWidth)
        assertNotEquals("the size has its own gap", m3.button.sizes.medium.containerGap, metrics.containerGap)

        rule.setContent {
            TanreiTheme(system = m3, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Column(Modifier.testTag(STAGE).background(TanreiColorRole.Surface.color).padding(TanreiTheme.tokens.space.space200)) {
                    TanreiButton(text = LABEL, onClick = {}, modifier = Modifier.testTag(TAG), variant = TanreiButtonVariant.Outlined, size = TanreiButtonSize.Xlarge)
                    TanreiButton(
                        text = LABEL,
                        onClick = {},
                        modifier = Modifier.testTag(ICON_TAG),
                        variant = TanreiButtonVariant.Outlined,
                        size = TanreiButtonSize.Xlarge,
                        icon = { Box(Modifier.size(metrics.iconSize)) },
                    )
                }
            }
        }
        rule.waitForIdle()

        // Height: taller than the touch target, so the node's bounds are the container's.
        val bounds = button().getUnclippedBoundsInRoot()
        assertDp("container height", metrics.containerHeight, bounds.height)

        // Outline width: down the middle of the top edge, the outline color for exactly `outline.width`, then nothing
        // (an outlined container draws no fill, so the surface shows).
        val colors = m3.colors.light
        val outline = m3.button.variants.outlined.enabled.outlineColor.resolve(colors)
        val map = rule.onNodeWithTag(STAGE).captureToImage().toPixelMap()
        val centerX = m3.space.space200 + bounds.width / 2
        val top = m3.space.space200
        assertPixel("surface above the container", map.at(centerX, top - HALF_PIXEL), colors[TanreiColorRole.Surface])
        assertPixel("first outline row", map.at(centerX, top + HALF_PIXEL), outline)
        assertPixel("last outline row", map.at(centerX, top + metrics.outlineWidth - HALF_PIXEL), outline)
        assertPixel("inside the outline", map.at(centerX, top + metrics.outlineWidth + HALF_PIXEL), colors[TanreiColorRole.Surface])

        // Gap: an icon widens the button by the icon box, the gap and the with-icon padding difference.
        val withIcon = rule.onNodeWithTag(ICON_TAG).getUnclippedBoundsInRoot().width
        val paddingDifference = metrics.containerPaddingInlineStartWithIcon - metrics.containerPaddingInlineStart
        assertDp("icon + gap", metrics.iconSize + metrics.containerGap + paddingDifference, withIcon - bounds.width)
    }

    @Test
    fun `m3-like - xsmall is 32 tall inside the touch target`() {
        val metrics = m3.button.sizes.xsmall
        assertEquals(32.dp, metrics.containerHeight)
        setButton(m3, size = TanreiButtonSize.Xsmall)

        val colors = m3.colors.light
        val container = m3.button.variants.filled.enabled.containerColor.resolve(colors)
        val map = rule.onNodeWithTag(STAGE).captureToImage().toPixelMap()
        val top = m3.space.space200 + m3.containerTop(metrics.containerHeight)
        val bottom = top + metrics.containerHeight
        val centerX = map.widthDp / 2
        assertPixel("above the container", map.at(centerX, top - HALF_PIXEL), colors[TanreiColorRole.Surface])
        assertPixel("first container row", map.at(centerX, top + HALF_PIXEL), container)
        assertPixel("last container row", map.at(centerX, bottom - HALF_PIXEL), container)
        assertPixel("below the container", map.at(centerX, bottom + HALF_PIXEL), colors[TanreiColorRole.Surface])
    }

    // ── cupertino ────────────────────────────────────────────────────────────

    @Test
    fun `BTN-3 cupertino - hovered draws the resting container, because the hovered token aliases it`() {
        val colors = cupertino.colors.light
        for (variant in listOf(cupertino.button.variants.filled, cupertino.button.variants.tonal, cupertino.button.variants.elevated, cupertino.button.variants.outlined, cupertino.button.variants.text)) {
            assertEquals(variant.enabled.containerColor.resolve(colors), variant.hovered.containerColor.resolve(colors))
            assertEquals(variant.enabled.containerColor.resolve(colors), variant.focused.containerColor.resolve(colors))
        }
        setButton(cupertino)
        val resting = cupertino.button.variants.filled.enabled.containerColor.resolve(colors)
        assertContainerColor(cupertino, resting)
        button().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainerColor(cupertino, resting)
        // The same gesture under the default system does change the container: the component is the same.
    }

    @Test
    fun `BTN-3 cupertino - pressed dims the whole button by the pressed opacity token`() {
        val colors = cupertino.colors.light
        val opacity = cupertino.button.opacity(TanreiInteractionState.Pressed)
        assertTrue("cupertino presses by opacity", opacity < 1f)
        assertEquals("other systems do not", 1f, tanrei.button.opacity(TanreiInteractionState.Pressed))

        setButton(cupertino)
        button().performTouchInput { down(center) }
        rule.waitForIdle()
        val pressed = cupertino.button.variants.filled.pressed.containerColor.resolve(colors)
        assertContainerColor(cupertino, pressed.copy(alpha = pressed.alpha * opacity).compositeOver(colors[TanreiColorRole.Surface]))
        button().performTouchInput { up() }
        rule.waitForIdle()
        assertContainerColor(cupertino, cupertino.button.variants.filled.enabled.containerColor.resolve(colors))
    }

    @Test
    fun `cupertino - the tonal label is the system tint, not on-surface`() {
        val colors = cupertino.colors.light
        val label = cupertino.button.variants.tonal.enabled.labelColor.resolve(colors)
        assertEquals(colors[TanreiColorRole.Primary], label)
        assertNotEquals(colors[TanreiColorRole.OnSurface], label)

        setButton(cupertino, TanreiButtonVariant.Tonal)
        assertContainerColor(cupertino, cupertino.button.variants.tonal.enabled.containerColor.resolve(colors))
        // The label's fully covered pixels are the tint: the most saturated pixel of a gray container.
        val map = button().captureToImage().toPixelMap()
        val pixels = (0 until map.height).flatMap { y -> (0 until map.width).map { x -> map[x, y] } }
        val mostChromatic = pixels.maxBy { maxOf(it.red, it.green, it.blue) - minOf(it.red, it.green, it.blue) }
        assertClose("label pixel", label, mostChromatic, LABEL_TOLERANCE)
    }

    @Test
    fun `BTN-10 cupertino - corners are the system's rounded-rect radius, not a pill, eased by 0_6 - the iOS corner`() {
        val tokens = cupertino.button
        assertTrue("a rounded rectangle", tokens.containerShape > 0.dp && tokens.containerShape < tokens.sizes.medium.containerHeight / 2)
        assertNotEquals("not the default system's radius", tanrei.button.containerShape, tokens.containerShape)
        assertEquals(0.6f, cupertino.shape.cornerSmoothing)
        // The same system at 0, side by side: the amount alone changes the corner, and only there.
        val circular = cupertino.copy(shape = cupertino.shape.copy(cornerSmoothing = 0f))
        rule.setContent {
            Column {
                for ((system, tag) in listOf(cupertino to TAG, circular to CIRCULAR_TAG)) {
                    TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                        Box(Modifier.background(TanreiColorRole.Surface.color).padding(TanreiTheme.tokens.space.space200)) {
                            TanreiButton(text = LABEL, onClick = {}, modifier = Modifier.testTag(tag))
                        }
                    }
                }
            }
        }
        rule.waitForIdle()
        val container = tokens.variants.filled.enabled.containerColor.resolve(cupertino.colors.light)
        // On the corner's diagonal the eased corner is the same quarter circle (Figma's construction keeps the arc
        // there); it differs along the edges, where the curve leaves the edge 1.6 radii before the corner.
        assertCornerRadius(cupertino, radius = tokens.containerShape, container = container)
        assertCornerRadius(circular, radius = tokens.containerShape, container = container, tag = CIRCULAR_TAG)
        val eased = button().captureToImage().toPixelMap()
        val plain = rule.onNodeWithTag(CIRCULAR_TAG).captureToImage().toPixelMap()
        assertEquals(eased.width, plain.width)
        val top = cupertino.containerTop(tokens.sizes.medium.containerHeight)
        val leg = tokens.containerShape * (1 + cupertino.shape.cornerSmoothing)
        var differing = 0
        for (y in 0 until eased.height) for (x in 0 until eased.width) {
            val same = isClose(eased[x, y], plain[x, y])
            val inCornerBox = with(rule.density) { (x <= leg.roundToPx() || x >= eased.width - 1 - leg.roundToPx()) && (y <= (top + leg).roundToPx() || y >= (top + tokens.sizes.medium.containerHeight - leg).roundToPx()) }
            assertTrue("($x, $y) differs outside the corner boxes", same || inCornerBox)
            if (!same) differing++
        }
        assertTrue("the amount changed the corners ($differing pixels)", differing > 0)
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun TanreiSystem.withFilledContainer(paint: TanreiPaint): TanreiSystem =
        copy(button = button.copy(variants = button.variants.copy(filled = button.variants.filled.copy(enabled = button.variants.filled.enabled.copy(containerColor = paint)))))

    /**
     * Where a container of [height] starts inside the button's node: the node is at least the touch target, with the
     * container centered in it; a container taller than the target (m3-like's medium, 56) is the node.
     */
    private fun TanreiSystem.containerTop(height: Dp): Dp = (maxOf(measure.targetTouch, height) - height) / 2

    /** How far below the element this level still draws. */
    private fun List<TanreiShadowLayer>.reach(): Dp = maxOf { it.y + it.blur + it.spread }

    /** A pixel inside the container's inline padding, clear of the label, at the vertical center. */
    private fun assertContainerColor(system: TanreiSystem, expected: Color) {
        val map = button().captureToImage().toPixelMap()
        assertPixel("container", map.at(system.button.sizes.medium.containerPaddingInlineStart / 2, maxOf(system.measure.targetTouch, system.button.sizes.medium.containerHeight) / 2), expected)
    }

    /**
     * The top-left corner of the medium container is a curve of exactly [radius]: on the corner's diagonal,
     * a point just inside the curve is [container] and a point just outside it is the surface behind.
     * [diagonalReach] is how far the curve is from the corner's center on that diagonal, in radii, measured along
     * one axis: 1/√2 for a quarter circle.
     */
    private fun assertCornerRadius(system: TanreiSystem, radius: Dp, container: Color, diagonalReach: Float = 1f / SQRT_2, tag: String = TAG) {
        val top = system.containerTop(system.button.sizes.medium.containerHeight)
        val map = rule.onNodeWithTag(tag).captureToImage().toPixelMap()
        val inside = radius - (radius - CORNER_MARGIN) * diagonalReach
        val outside = radius - (radius + CORNER_MARGIN) * diagonalReach
        assertPixel("inside the corner arc (radius $radius)", map.at(inside, top + inside), container)
        assertPixel("outside the corner arc (radius $radius)", map.at(outside, top + outside), system.colors.light[TanreiColorRole.Surface])
    }

    private val PixelMap.widthDp: Dp get() = with(rule.density) { width.toDp() }

    private fun PixelMap.at(x: Dp, y: Dp): Color = with(rule.density) { this@at[x.roundToPx(), y.roundToPx()] }

    private fun assertPixel(what: String, actual: Color, expected: Color) = assertClose(what, expected, actual, PIXEL_TOLERANCE)

    private fun isClose(a: Color, b: Color): Boolean =
        maxOf(abs(a.red - b.red), abs(a.green - b.green), abs(a.blue - b.blue)) <= PIXEL_TOLERANCE

    private fun assertDp(what: String, expected: Dp, actual: Dp) =
        assertTrue("$what: expected $expected but was $actual", abs(expected.value - actual.value) <= DP_TOLERANCE)

    private fun assertClose(what: String, expected: Color, actual: Color, tolerance: Float) {
        val delta = maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue))
        assertTrue("$what: expected $expected but was $actual", delta <= tolerance)
    }

    private companion object {
        const val TAG = "button"
        const val STAGE = "stage"
        const val ICON_TAG = "button-with-icon"
        const val CIRCULAR_TAG = "button-circular"
        const val DP_TOLERANCE = 0.5f
        const val LABEL = "Deploy"
        const val PIXEL_TOLERANCE = 2f / 255f
        const val LABEL_TOLERANCE = 12f / 255f
        const val SHADOW_VISIBLE = 0.02f
        val SQRT_2 = sqrt(2f)

        val CORNER_MARGIN = 1.5.dp
        val HALF_PIXEL = 0.5.dp
    }
}
