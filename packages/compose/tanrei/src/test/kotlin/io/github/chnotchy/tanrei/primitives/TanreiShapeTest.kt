package io.github.chnotchy.tanrei.primitives

import android.graphics.Bitmap
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Canvas
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.ImageBitmapConfig
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathOperation
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import kotlin.math.sqrt
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.GraphicsMode

/**
 * `sys.shape.corner-smoothing` (BTN-10): Figma's corner-smoothing construction, identical to
 * Compose's rounded corner at 0; at 0.6 the test pins the construction (what it removes from the circular box) and
 * its measured distance from Apple's continuous corner — a different curve, ≈ 5 px² away, that no amount reaches.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class TanreiShapeTest {
    private val density = Density(2f)

    @Test
    fun `at 0 the shape IS Compose's rounded corner - the platform draws it exactly as before`() {
        assertEquals(RoundedCornerShape(8.dp), tanreiContainerShape(8.dp, smoothing = 0f))
        assertEquals(RoundedCornerShape(8.dp), tanreiContainerShape(8.dp, smoothing = -1f))
        // And the construction at 0 is that quarter circle: the same coverage as the round rect, everywhere.
        val rect = Rect(10f, 10f, 190f, 90f)
        val rounded = Path().apply { addRoundRect(RoundRect(rect, CornerRadius(20f))) }
        assertTrue("identity with the round rect", symmetricDifference(smoothedRoundRectPath(rect, 20f, 0f), rounded) < RASTER_NOISE)
    }

    @Test
    fun `above 0 the shape is a path with the same bounds, equal for equal radius and amount`() {
        val size = Size(200f, 72f)
        val outline = tanreiContainerShape(8.dp, 0.6f).createOutline(size, LayoutDirection.Ltr, density)
        assertTrue(outline is Outline.Generic)
        assertEquals(Rect(0f, 0f, 200f, 72f), outline.bounds)
        assertEquals(tanreiContainerShape(8.dp, 0.6f), tanreiContainerShape(8.dp, 0.6f))
        assertTrue(tanreiContainerShape(8.dp, 0.6f) != tanreiContainerShape(8.dp, 1f))
    }

    @Test
    fun `no radius is a rectangle, and a radius beyond half the shorter side is clamped to it`() {
        val size = Size(200f, 72f)
        assertTrue(tanreiContainerShape(0.dp, 0.6f).createOutline(size, LayoutDirection.Ltr, density) is Outline.Rectangle)
        val pill = smoothedRoundRectPath(Rect(0f, 0f, 200f, 72f), radius = 500f, smoothing = 0.6f)
        assertEquals(Rect(0f, 0f, 200f, 72f), pill.getBounds())
    }

    @Test
    fun `the corner is Figma's construction - its control points at 0_6 and its collapse at 0`() {
        // r = 1, s = 0.6: p = 1.6, θ = 36°, L = 0.43702, c = 0.21391, d = 0.10899, a = 0.56005, b = 0.28003.
        val corner = smoothedCorner(1f, 0.6f, room = 10f)
        assertEquals(SMOOTHED_CORNER_POINTS, corner.size)
        assertPoint("start", 1.6f, 0f, corner[0])
        assertPoint("first control", 1.6f - 0.56005f, 0f, corner[1])
        assertPoint("second control", 1.6f - 0.56005f - 0.28003f, 0f, corner[2])
        assertPoint("the arc starts", 0.43702f + 0.10899f, 0.10899f, corner[3])
        assertPoint("the arc ends", 0.10899f, 0.43702f + 0.10899f, corner[6])
        assertPoint("end", 0f, 1.6f, corner[9])
        // The arc's ends sit on the circle of radius r about (r, r), and the corner is symmetric about the diagonal.
        for (i in listOf(3, 6)) assertEquals("point $i on the circle", 1f, distance(corner[i], Offset(1f, 1f)), POINT_TOLERANCE)
        for (i in 0 until SMOOTHED_CORNER_POINTS) assertPoint("mirror of $i", corner[i].y, corner[i].x, corner[SMOOTHED_CORNER_POINTS - 1 - i])
        // At 0 the legs collapse onto the edge and only the quarter circle is left, as one standard cubic.
        val circle = smoothedCorner(1f, 0f, room = 10f)
        for (i in 0..3) assertPoint("collapsed leg $i", 1f, 0f, circle[i])
        assertPoint("quarter-circle control", 1f - KAPPA, 0f, circle[4])
        assertPoint("quarter-circle control", 0f, 1f - KAPPA, circle[5])
        for (i in 6..9) assertPoint("collapsed leg $i", 0f, 1f, circle[i])
    }

    @Test
    fun `a corner without room eases less - per corner, as Figma does - so a pill at 0_6 IS the circular pill`() {
        // A 180 × 40 pill at radius 20: the corner's budget is half the short side, one radius — amount 0 on BOTH legs.
        val corner = smoothedCorner(20f, 0.6f, room = 20f)
        val circle = smoothedCorner(20f, 0f, room = 90f)
        for (i in 0 until SMOOTHED_CORNER_POINTS) assertPoint("the pill's corner is the quarter circle ($i)", circle[i].x, circle[i].y, corner[i])
        // …so the whole path is the circular capsule: the same coverage as a round rect, at every amount.
        val pill = Rect(10f, 10f, 190f, 50f)
        val capsule = Path().apply { addRoundRect(RoundRect(pill, CornerRadius(20f))) }
        for (amount in listOf(0.3f, 0.6f, 1f)) {
            val difference = symmetricDifference(smoothedRoundRectPath(pill, 20f, amount), capsule)
            assertTrue("pill at $amount is the capsule ($difference px²)", difference < RASTER_NOISE)
        }
        // With room for part of the leg (180 × 40 at radius 16: 20 / 16 − 1 = 0.25) BOTH legs ease by 0.25 — the
        // long side does not keep the full amount, and the corner stays symmetric about its diagonal.
        val partial = smoothedCorner(16f, 0.6f, room = 20f)
        val quarter = smoothedCorner(16f, 0.25f, room = 90f)
        for (i in 0 until SMOOTHED_CORNER_POINTS) assertPoint("the near-pill's corner is the 0.25 corner ($i)", quarter[i].x, quarter[i].y, partial[i])
        assertPoint("a partial leg starts where the room ends", 20f, 0f, partial[0])
        assertPoint("…on both sides", 0f, 20f, partial[9])
        // A box with room keeps the full amount: the budget only binds on a pill or near-pill.
        val box = smoothedCorner(20f, 0.6f, room = 40f)
        assertPoint("the 180 × 80 box's leg is whole", 1.6f * 20f, 0f, box[0])
    }

    @Test
    fun `at 0_6 the corner is Figma's construction, not Apple's - it removes 15_4 px² from the circular box and stays 5 px² from Apple's corner, and a pill stays a circle`() {
        // The amount means Figma's construction; Apple's continuous corner is a different curve. Both paths
        // rasterized by the same rasterizer (Skia at 8×), so a regression in the construction shows and the test
        // cannot pass by tolerance against the wrong reference. See `TanreiShape.kt`, "Measured against Apple's corner".
        val box = Rect(10f, 10f, 190f, 90f)
        val pill = Rect(10f, 10f, 190f, 50f)

        // 1. What the construction removes from the circular 180 × 80 box: 15.4 px² analytic (Flutter pins the same
        // number). Apple's corner removes 18.35 analytic — 17.4 in CoreGraphics, 16.8 measured here.
        val circular = smoothedRoundRectPath(box, 20f, 0f)
        val removed = area(circular) - area(smoothedRoundRectPath(box, 20f, 0.6f))
        assertEquals("removed from the circle (analytic 15.4; measured 15.7)", CONSTRUCTION_REMOVES_PX2, removed, REMOVED_TOLERANCE_PX2)
        val appleRemoves = area(circular) - area(appleContinuousRectPath(box, 20f))
        assertTrue("Apple's corner removes more ($appleRemoves) than the construction ($removed): 0.6 is a little less eased than iOS", removed < appleRemoves - 0.5f)

        // 2. The distance from Apple's corner on the box is ≈ 5.1 px², not noise: a circle is 3.6× farther, 1 is 9×,
        // and no amount closes the gap — the minimum over the amount is here, at 0.60–0.62.
        val apple = appleContinuousRectPath(box, 20f)
        fun distance(amount: Float) = symmetricDifference(smoothedRoundRectPath(box, 20f, amount), apple)
        val at06 = distance(0.6f)
        assertEquals("180×80 r20: 0.6 vs Apple", APPLE_DISTANCE_BOX_PX2, at06, APPLE_DISTANCE_TOLERANCE_PX2)
        assertTrue("0.6 vs Apple = $at06 px² is not rasterizer noise ($RASTER_NOISE)", at06 > 4 * RASTER_NOISE)
        assertTrue("a circle is farther (${distance(0f)}) than 0.6 ($at06)", distance(0f) > 2 * at06)
        assertTrue("1 is farther (${distance(1f)}) than 0.6 ($at06)", distance(1f) > 2 * at06)
        for (amount in listOf(0.5f, 0.55f, 0.58f, 0.62f, 0.65f, 0.7f)) {
            assertTrue("no amount closes the gap - $amount is ${distance(amount)} px² off", distance(amount) > APPLE_DISTANCE_FLOOR_PX2)
        }

        // 3. A pill has no budget (per corner, as Figma draws it): at every amount it is the circular capsule, 12.2 px²
        // from Apple's capsule — Figma's own pill, where Apple eases the caps.
        val applePill = appleContinuousRectPath(pill, 20f)
        for (amount in listOf(0f, 0.6f, 1f)) {
            val pillDistance = symmetricDifference(smoothedRoundRectPath(pill, 20f, amount), applePill)
            assertEquals("180×40 pill r20: $amount vs Apple (the circle's distance)", APPLE_DISTANCE_PILL_PX2, pillDistance, APPLE_DISTANCE_TOLERANCE_PX2)
        }
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun assertPoint(what: String, x: Float, y: Float, actual: Offset) {
        assertEquals("$what x", x, actual.x, POINT_TOLERANCE)
        assertEquals("$what y", y, actual.y, POINT_TOLERANCE)
    }

    private fun distance(a: Offset, b: Offset): Float = sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y))

    /** The area of the symmetric difference of two paths in px², rasterized at [SCALE]×. */
    private fun symmetricDifference(a: Path, b: Path): Float = area(Path().apply { op(a, b, PathOperation.Xor) })

    /** The covered area of [path] in px², rasterized at [SCALE]× (coverage sum / SCALE²). */
    private fun area(path: Path): Float {
        val image = ImageBitmap(CANVAS_WIDTH * SCALE, CANVAS_HEIGHT * SCALE, ImageBitmapConfig.Argb8888)
        Canvas(image).apply {
            scale(SCALE.toFloat(), SCALE.toFloat())
            drawPath(path, Paint().apply { color = Color.Black })
        }
        val bitmap: Bitmap = image.asAndroidBitmap()
        val pixels = IntArray(bitmap.width * bitmap.height)
        bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
        var sum = 0.0
        for (p in pixels) sum += (p ushr 24) / 255.0
        return (sum / (SCALE * SCALE)).toFloat()
    }

    /**
     * Apple's continuous corner, as `UIBezierPath(roundedRect:cornerRadius:)` builds it: the control points read
     * from CoreGraphics (`packages/flutter/tool/continuous_corner_reference.swift --elements`), in radii from the
     * corner (u back along the arriving edge, v along the leaving edge). Sides without room are handled as SwiftUI
     * does: the outer curve of that side starts where the room ends and its controls move towards 0.96 / 0.82 radii.
     */
    private fun appleContinuousRectPath(rect: Rect, radius: Float): Path {
        val r = minOf(radius, minOf(rect.width, rect.height) / 2f)
        fun outer(edge: Float): FloatArray {
            val room = ((edge / 2 / r - 1) / (APPLE_REACH - 1)).coerceIn(0f, 1f)
            return FloatArray(3) { APPLE_TIGHT[it] + (APPLE_FULL[it] - APPLE_TIGHT[it]) * room }
        }
        val horizontal = outer(rect.width)
        val vertical = outer(rect.height)
        val path = Path()
        fun corner(at: Offset, along: Offset, away: Offset, first: Boolean) {
            val arriving = if (along.x != 0f) horizontal else vertical
            val leaving = if (along.x != 0f) vertical else horizontal
            fun p(i: Int): Offset {
                val point = when (i) {
                    0, 1, 2 -> Offset(arriving[i], 0f)
                    9, 10, 11 -> Offset(0f, leaving[11 - i])
                    else -> APPLE_CORNER[i]
                }
                return at - along * (point.x * r) + away * (point.y * r)
            }
            if (first) path.moveTo(p(0).x, p(0).y) else path.lineTo(p(0).x, p(0).y)
            path.cubicTo(p(1).x, p(1).y, p(2).x, p(2).y, p(3).x, p(3).y)
            path.lineTo(p(4).x, p(4).y)
            path.cubicTo(p(5).x, p(5).y, p(6).x, p(6).y, p(7).x, p(7).y)
            path.lineTo(p(8).x, p(8).y)
            path.cubicTo(p(9).x, p(9).y, p(10).x, p(10).y, p(11).x, p(11).y)
        }
        corner(Offset(rect.right, rect.top), Offset(1f, 0f), Offset(0f, 1f), first = true)
        corner(Offset(rect.right, rect.bottom), Offset(0f, 1f), Offset(-1f, 0f), first = false)
        corner(Offset(rect.left, rect.bottom), Offset(-1f, 0f), Offset(0f, -1f), first = false)
        corner(Offset(rect.left, rect.top), Offset(0f, -1f), Offset(1f, 0f), first = false)
        path.close()
        return path
    }

    private companion object {
        const val SCALE = 8
        const val POINT_TOLERANCE = 1e-3f

        const val CANVAS_WIDTH = 200
        const val CANVAS_HEIGHT = 100

        /** Two rasterizations of one quarter circle (a round rect and the cubic) differ by less than this. */
        const val RASTER_NOISE = 0.5f

        /**
         * What the construction at 0.6 removes from the circular 180 × 80 r20 box, analytic (the shoelace area of
         * the sampled cubics; Flutter pins the same 15.4). Apple's corner removes 18.35 (17.4 in CoreGraphics).
         */
        const val CONSTRUCTION_REMOVES_PX2 = 15.4f

        /**
         * ±1.0: the difference of two whole areas at 8× carries the anti-aliasing of the whole perimeter. Measured
         * against the analytic value over nine amounts on this box (0, 0.5 … 1), the error is at most 0.8 px²
         * (0.58: 13.2 vs 13.97; at 0.6 it is 15.71 vs 15.38). Apple's 17.4 / 16.8 stays outside [14.4, 16.4].
         */
        const val REMOVED_TOLERANCE_PX2 = 1.0f

        /**
         * Skia at 8× (the XOR of the two paths, rasterized once): 5.09 px² on the box at 0.6 — the analytic value is
         * 5.09; CoreGraphics rasterizing both paths measured 4.9. The 180 × 40 pill measures 12.18 at
         * every amount (per-corner budget): the circular capsule; CoreGraphics measured 12.0, and
         * Flutter's measurement 12.1 for Figma's pill.
         */
        const val APPLE_DISTANCE_BOX_PX2 = 5.1f
        const val APPLE_DISTANCE_PILL_PX2 = 12.2f

        /** ±0.6: a little over [RASTER_NOISE], the disagreement of two rasterizations of one quarter circle. */
        const val APPLE_DISTANCE_TOLERANCE_PX2 = 0.6f

        /** No amount gets closer than this to Apple's corner on the box (0.62: 5.3; 0.58: 5.3; 0.65: 5.7). */
        const val APPLE_DISTANCE_FLOOR_PX2 = 4.5f

        /** The standard control distance of a quarter circle as one cubic: 4/3 · tan(π/8). */
        const val KAPPA = 0.5522847f

        const val APPLE_REACH = 1.52866483f
        val APPLE_FULL = floatArrayOf(APPLE_REACH, 1.08849299f, 0.86840701f)
        val APPLE_TIGHT = floatArrayOf(1f, 0.96f, 0.82f)
        val APPLE_CORNER = listOf(
            Offset(APPLE_REACH, 0f),
            Offset(1.08849299f, 0f),
            Offset(0.86840701f, 0f),
            Offset(0.66993427f, 0.06549600f),
            Offset(0.63149399f, 0.07491100f),
            Offset(0.37282401f, 0.16905999f),
            Offset(0.16905999f, 0.37282401f),
            Offset(0.07491100f, 0.63149399f),
            Offset(0.06549600f, 0.66993427f),
            Offset(0f, 0.86840701f),
            Offset(0f, 1.08849299f),
            Offset(0f, APPLE_REACH),
        )
    }
}
