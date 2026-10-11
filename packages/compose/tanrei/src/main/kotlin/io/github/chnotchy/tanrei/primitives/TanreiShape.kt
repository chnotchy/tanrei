package io.github.chnotchy.tanrei.primitives

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Immutable
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.tan

/**
 * The shape of a container with this corner [radius], eased by [smoothing] — `sys.shape.corner-smoothing`, 0–1 with
 * Figma's meaning (BTN-10). At 0 it IS Compose's [RoundedCornerShape]: a quarter circle, drawn by the
 * platform exactly as it always has been. Above 0 it is [TanreiSmoothedCornerShape].
 */
internal fun tanreiContainerShape(radius: Dp, smoothing: Float): Shape =
    if (smoothing <= 0f) RoundedCornerShape(radius) else TanreiSmoothedCornerShape(radius, smoothing)

/**
 * [tanreiContainerShape] with one radius for the two top corners and another for the two bottom ones — a filled text
 * field's `container.shape` over its `container.shape-bottom` (TXF-16). The same construction per corner; a corner of
 * radius 0 is square.
 */
internal fun tanreiContainerShape(topRadius: Dp, bottomRadius: Dp, smoothing: Float): Shape = when {
    topRadius == bottomRadius -> tanreiContainerShape(topRadius, smoothing)
    smoothing <= 0f -> RoundedCornerShape(topStart = topRadius, topEnd = topRadius, bottomEnd = bottomRadius, bottomStart = bottomRadius)
    else -> TanreiSmoothedCornerShape(topRadius, smoothing, bottomRadius)
}

/**
 * [tanreiContainerShape] with square START corners and END corners of [radius] — a panel at the start edge of the window
 * whose free side is rounded (a modal navigation drawer, NVD-11). The end is the right in a left-to-right layout and the
 * left in a right-to-left one. The same construction per corner, the same budget.
 */
internal fun tanreiEndCornerShape(radius: Dp, smoothing: Float): Shape =
    if (smoothing <= 0f) RoundedCornerShape(topStart = Dp.Hairline, topEnd = radius, bottomEnd = radius, bottomStart = Dp.Hairline) else TanreiEndCornerShape(radius, smoothing)

/** [tanreiEndCornerShape] above corner smoothing 0: the end corners eased, the start corners square. */
@Immutable
internal class TanreiEndCornerShape(private val radius: Dp, private val smoothing: Float) : Shape {
    override fun createOutline(size: Size, layoutDirection: LayoutDirection, density: Density): Outline {
        val r = with(density) { radius.toPx() }
        val rect = Rect(0f, 0f, size.width, size.height)
        if (r <= 0f) return Outline.Rectangle(rect)
        val rtl = layoutDirection == LayoutDirection.Rtl
        return Outline.Generic(
            smoothedRoundRectPath(rect, topLeft = if (rtl) r else 0f, topRight = if (rtl) 0f else r, bottomRight = if (rtl) 0f else r, bottomLeft = if (rtl) r else 0f, smoothing = smoothing),
        )
    }

    override fun equals(other: Any?): Boolean = other is TanreiEndCornerShape && other.radius == radius && other.smoothing == smoothing

    override fun hashCode(): Int = 31 * radius.hashCode() + smoothing.hashCode()
}

/**
 * [tanreiContainerShape] with one radius for the two START corners and another for the two END corners — the joined
 * pieces of one control: a segmented button's end segments (SEG-13), a connected button group's items (BGR-2), a split
 * button's halves (SPB-13). The start is the left in a left-to-right layout and the right in a right-to-left one. Equal
 * radii ARE [tanreiContainerShape]'s shape, so a piece that is not joined draws exactly as it always has. The same
 * construction per corner, the same budget (half the shorter side).
 */
internal fun tanreiSideCornerShape(startRadius: Dp, endRadius: Dp, smoothing: Float): Shape = when {
    startRadius == endRadius -> tanreiContainerShape(startRadius, smoothing)
    smoothing <= 0f -> RoundedCornerShape(topStart = startRadius, topEnd = endRadius, bottomEnd = endRadius, bottomStart = startRadius)
    else -> TanreiSideCornerShape(startRadius, endRadius, smoothing)
}

/** [tanreiSideCornerShape] above corner smoothing 0: every corner eased, the start ones by one radius and the end ones by another. */
@Immutable
internal class TanreiSideCornerShape(private val startRadius: Dp, private val endRadius: Dp, private val smoothing: Float) : Shape {
    override fun createOutline(size: Size, layoutDirection: LayoutDirection, density: Density): Outline {
        val start = with(density) { startRadius.toPx() }
        val end = with(density) { endRadius.toPx() }
        val rect = Rect(0f, 0f, size.width, size.height)
        if (start <= 0f && end <= 0f) return Outline.Rectangle(rect)
        val left = if (layoutDirection == LayoutDirection.Rtl) end else start
        val right = if (layoutDirection == LayoutDirection.Rtl) start else end
        return Outline.Generic(smoothedRoundRectPath(rect, topLeft = left, topRight = right, bottomRight = right, bottomLeft = left, smoothing = smoothing))
    }

    override fun equals(other: Any?): Boolean =
        other is TanreiSideCornerShape && other.startRadius == startRadius && other.endRadius == endRadius && other.smoothing == smoothing

    override fun hashCode(): Int = (31 * startRadius.hashCode() + endRadius.hashCode()) * 31 + smoothing.hashCode()
}

/**
 * A rectangle whose corners follow Figma's corner-smoothing construction: the curvature eases
 * into the straight edge instead of starting abruptly like a quarter circle. The web and Flutter draw the same path
 * for the same amount. Compose has no such shape, so this is a path — see [smoothedRoundRectPath].
 */
@Immutable
internal class TanreiSmoothedCornerShape(
    private val radius: Dp,
    private val smoothing: Float,
    /** The two bottom corners' radius, when it differs from the top ones' ([radius]). */
    private val bottomRadius: Dp = radius,
) : Shape {
    override fun createOutline(size: Size, layoutDirection: LayoutDirection, density: Density): Outline {
        val r = with(density) { radius.toPx() }
        val bottom = with(density) { bottomRadius.toPx() }
        if (r <= 0f && bottom <= 0f) return Outline.Rectangle(Rect(0f, 0f, size.width, size.height))
        return Outline.Generic(smoothedRoundRectPath(Rect(0f, 0f, size.width, size.height), r, bottom, smoothing))
    }

    override fun equals(other: Any?): Boolean =
        other is TanreiSmoothedCornerShape && other.radius == radius && other.smoothing == smoothing && other.bottomRadius == bottomRadius

    override fun hashCode(): Int = (31 * radius.hashCode() + smoothing.hashCode()) * 31 + bottomRadius.hashCode()

    override fun toString(): String =
        if (bottomRadius == radius) "TanreiSmoothedCornerShape($radius, smoothing = $smoothing)" else "TanreiSmoothedCornerShape($radius / $bottomRadius, smoothing = $smoothing)"
}

/**
 * [rect] with corners of [radius] pixels (clamped to half the shorter side) eased by [smoothing], clockwise from
 * the top edge: one [smoothedCorner] per corner, three cubic Béziers each, joined by straight edges. The web and
 * Flutter draw this same path (the formulas of `figma-squircle`; Flutter's
 * `tanreiSmoothedRectPath`), so the three rasterize identically up to their anti-aliasing.
 *
 * ## The construction (Figma's corner smoothing)
 *
 * Per corner, with the radius `r` and the corner's amount `s` in [0, 1] (see "A corner without room") — the formulas
 * of `figma-squircle` (github.com/phamfoo/figma-squircle, MIT, `getPathParamsForCorner` / `drawTopRightPath`),
 * themselves from Figma's article "Desperately seeking squircles" (figures 11.1 / 12.2), for each of its two legs:
 *
 * ```
 * β  = 45° · s                       how much of the 90° turn this leg takes
 * p  = (1 + s) · r                   where the leg leaves the straight edge
 * d  = r · (1 − cos β)               the leg's end, off the edge          (figma-squircle's d)
 * x₃ = r · (1 − sin β)               the leg's end, along the edge        (= arcSectionLength + d)
 * c  = r · tan(β / 2) · cos β        the second control's distance from the end   (p3ToP4Distance · cos β)
 * b  = (p − x₃ − c) / 3;  a = 2 · b  the two control distances of the leg        (3b = p − L − c − d)
 * ```
 *
 * In corner coordinates (u = distance back along the arriving edge, v = distance along the leaving edge, both from
 * the corner) the leg is: start `(p, 0)`, controls `(p − a, 0)` and `(x₃ + c, 0)`, end `(x₃, d)` — a point ON the
 * corner circle about `(r, r)`, where the tangent is β from the edge; the leaving leg is its mirror about the
 * diagonal. Between the two legs the middle is that circle, from tangent angle β to 90° − β, θ = 90° − 2β (Figma's
 * `arcMeasure = 90° · (1 − s)`), emitted as ONE cubic with the standard handle
 * `h = 4/3 · tan(θ / 4) · r` along the tangents — so every platform draws "three cubics per corner" and needs no arc
 * primitive. At s = 0 the legs collapse (a = b = c = d = 0, p = x₃ = r) and only the quarter circle is left; at
 * s = 1 the arc vanishes and the two legs meet on the diagonal. At s = 0.6, r = 1: p = 1.6, β = 27°, θ = 36°,
 * x₃ = 0.54601, d = 0.10899, c = 0.21391, a = 0.56005, b = 0.28003.
 *
 * ## A corner without room
 *
 * The leg needs `p` of straight edge on each side of the corner; a corner has half the shorter edge (a pill's short
 * side has exactly one radius). Figma's budget rule — `figma-squircle`'s `maxCornerSmoothing = budget / r − 1`,
 * `budget = min(width, height) / 2` — is applied per CORNER, as Figma does: `s_corner = min(s, budget / r − 1)`,
 * both legs of the corner ease by that amount. A pill (r = half the short side) therefore has no room at any amount
 * and IS the circular capsule, exactly what Figma draws for it;
 * a near-pill eases by what its short side allows, on both sides. Flutter applies the same rule.
 *
 * ## Measured against Apple's corner (a different curve, not this one at another amount)
 *
 * The reference is SwiftUI's `RoundedRectangle(cornerRadius:style: .continuous)` — the path
 * `UIBezierPath(roundedRect:cornerRadius:)` builds, its control points read from CoreGraphics
 * (`packages/flutter/tool/continuous_corner_reference.swift --elements`). Both paths rasterized by Skia at 8× in
 * `TanreiShapeTest`, the area of their symmetric difference in px²:
 *
 * | box, radius | s = 0 (a circle) | 0.55 | 0.58 | s = 0.6 | 0.62 | 0.65 | s = 1 |
 * |---|---|---|---|---|---|---|---|
 * | 180 × 80, 20 | 18.4 | 6.3 | 5.3 | **5.1** | 5.3 | 5.7 | 46.7 |
 * | 180 × 40 pill, 20 | 12.2 | 12.2 | 12.2 | **12.2** | 12.2 | 12.2 | 12.2 |
 *
 * The pill has no budget, so every amount draws the circular capsule — Figma's pill, where Apple eases the caps.
 * (CoreGraphics rasterizing both: 4.9 box at 0.6, 19.2 / 12.0 box / pill for a circle; its 0.65 column, 4.2, Skia
 * does not reproduce.) What each removes from the circular 180 × 80 box: this construction at 0.6
 * 15.4 px² (analytic; 15.7 measured), Apple's corner 18.35 (17.4 in CoreGraphics, 16.8 in Skia). So 0.6 is
 * NEAR Apple's corner — 1.3 px² per corner at radius 20, invisible — but not within rasterizer noise (≈ 1.8 px²
 * between rasterizers), and no amount closes the gap: the minimum is 5.1 at 0.60–0.62. They are two constructions:
 * Apple's leg leaves the edge at 1.5287 r (this one's at 1.6 r) and its middle is not a circular arc. Figma's
 * construction is what the amount means, and `TanreiShapeTest` pins the construction —
 * what it removes and its distance from Apple's corner — not Apple.
 */
internal fun smoothedRoundRectPath(rect: Rect, radius: Float, smoothing: Float): Path = smoothedRoundRectPath(rect, radius, radius, smoothing)

/**
 * [smoothedRoundRectPath] with [topRadius] for the two top corners and [bottomRadius] for the two bottom ones (a filled
 * text field). Each corner is the same construction with its own radius and the same budget; a corner of radius 0 is
 * square. Equal radii draw exactly the path of the one-radius form.
 */
internal fun smoothedRoundRectPath(rect: Rect, topRadius: Float, bottomRadius: Float, smoothing: Float): Path {
    val room = min(rect.width, rect.height) / 2f
    val top = min(topRadius, room).coerceAtLeast(0f)
    val bottom = min(bottomRadius, room).coerceAtLeast(0f)
    val path = Path()
    if (top <= 0f && bottom <= 0f) {
        path.addRect(rect)
        return path
    }
    // One budget for every corner: half the shorter side (Figma's per-corner rule, "A corner without room").
    val amount = smoothing.coerceIn(0f, 1f)
    val topPoints = if (top > 0f) smoothedCorner(top, amount, room = room) else null
    val bottomPoints = if (bottom == top) topPoints else if (bottom > 0f) smoothedCorner(bottom, amount, room = room) else null
    // Clockwise from the top edge: at each corner the arriving edge points INTO it and the leaving edge away.
    fun corner(points: List<Offset>?, at: Offset, along: Offset, away: Offset, first: Boolean) {
        if (points == null) {
            if (first) path.moveTo(at.x, at.y) else path.lineTo(at.x, at.y)
            return
        }
        fun p(i: Int): Offset = at - along * points[i].x + away * points[i].y
        if (first) path.moveTo(p(0).x, p(0).y) else path.lineTo(p(0).x, p(0).y)
        for (segment in 0 until 3) {
            val c1 = p(segment * 3 + 1)
            val c2 = p(segment * 3 + 2)
            val end = p(segment * 3 + 3)
            path.cubicTo(c1.x, c1.y, c2.x, c2.y, end.x, end.y)
        }
    }
    corner(topPoints, Offset(rect.right, rect.top), along = Offset(1f, 0f), away = Offset(0f, 1f), first = true)
    corner(bottomPoints, Offset(rect.right, rect.bottom), along = Offset(0f, 1f), away = Offset(-1f, 0f), first = false)
    corner(bottomPoints, Offset(rect.left, rect.bottom), along = Offset(-1f, 0f), away = Offset(0f, -1f), first = false)
    corner(topPoints, Offset(rect.left, rect.top), along = Offset(0f, -1f), away = Offset(1f, 0f), first = false)
    path.close()
    return path
}

/**
 * [smoothedRoundRectPath] with its own radius for each corner (a corner of radius 0 is square): the same construction
 * and the same budget — half the shorter side — for every corner. Clockwise from the top edge, as the other forms.
 */
internal fun smoothedRoundRectPath(rect: Rect, topLeft: Float, topRight: Float, bottomRight: Float, bottomLeft: Float, smoothing: Float): Path {
    val room = min(rect.width, rect.height) / 2f
    val amount = smoothing.coerceIn(0f, 1f)
    fun points(radius: Float): List<Offset>? = min(radius, room).coerceAtLeast(0f).takeIf { it > 0f }?.let { smoothedCorner(it, amount, room = room) }
    val path = Path()
    fun corner(points: List<Offset>?, at: Offset, along: Offset, away: Offset, first: Boolean) {
        if (points == null) {
            if (first) path.moveTo(at.x, at.y) else path.lineTo(at.x, at.y)
            return
        }
        fun p(i: Int): Offset = at - along * points[i].x + away * points[i].y
        if (first) path.moveTo(p(0).x, p(0).y) else path.lineTo(p(0).x, p(0).y)
        for (segment in 0 until 3) {
            val c1 = p(segment * 3 + 1)
            val c2 = p(segment * 3 + 2)
            val end = p(segment * 3 + 3)
            path.cubicTo(c1.x, c1.y, c2.x, c2.y, end.x, end.y)
        }
    }
    corner(points(topRight), Offset(rect.right, rect.top), along = Offset(1f, 0f), away = Offset(0f, 1f), first = true)
    corner(points(bottomRight), Offset(rect.right, rect.bottom), along = Offset(0f, 1f), away = Offset(-1f, 0f), first = false)
    corner(points(bottomLeft), Offset(rect.left, rect.bottom), along = Offset(-1f, 0f), away = Offset(0f, -1f), first = false)
    corner(points(topLeft), Offset(rect.left, rect.top), along = Offset(0f, -1f), away = Offset(1f, 0f), first = false)
    path.close()
    return path
}

/** How many points describe one corner: a start and three cubic segments of two controls and an end each. */
internal const val SMOOTHED_CORNER_POINTS = 10

/**
 * One corner of the construction above, in corner coordinates as [Offset]s: `x` = u (back along the arriving edge),
 * `y` = v (along the leaving edge), both in pixels from the corner. [SMOOTHED_CORNER_POINTS] points: the start,
 * then the three cubics (two controls and an end each); symmetric about the diagonal. [room] is the corner's budget —
 * the straight edge available on either side, half the shorter side of the box; [r] must already be clamped to it.
 * The corner eases by `min(smoothing, room / r − 1)`: Figma's per-corner budget.
 */
internal fun smoothedCorner(r: Float, smoothing: Float, room: Float): List<Offset> {
    val s = smoothing.toDouble().coerceIn(0.0, 1.0)
    val leg = SmoothedLeg(r.toDouble(), min(s, room / r - 1.0).coerceIn(0.0, 1.0))
    // The arc between the legs' ends, on the circle about (r, r): tangent angle β → 90° − β, as one cubic.
    val theta = HALF_PI - 2 * leg.beta
    val h = (4.0 / 3.0) * tan(theta / 4) * r
    val arcStart = Offset(leg.x3.toFloat(), leg.d.toFloat())
    val arcEnd = Offset(leg.d.toFloat(), leg.x3.toFloat())
    // The unit tangent of travel (u decreasing, v increasing) at tangent angle t is (−cos t, sin t).
    val arcControl1 = arcStart + Offset(-(h * cos(leg.beta)).toFloat(), (h * sin(leg.beta)).toFloat())
    val arcControl2 = arcEnd - Offset(-(h * sin(leg.beta)).toFloat(), (h * cos(leg.beta)).toFloat())
    return listOf(
        Offset(leg.p.toFloat(), 0f),
        Offset((leg.p - leg.a).toFloat(), 0f),
        Offset((leg.x3 + leg.c).toFloat(), 0f),
        arcStart,
        arcControl1,
        arcControl2,
        arcEnd,
        Offset(0f, (leg.x3 + leg.c).toFloat()),
        Offset(0f, (leg.p - leg.a).toFloat()),
        Offset(0f, leg.p.toFloat()),
    )
}

/** One eased leg (see [smoothedRoundRectPath]): the `figma-squircle` quantities for the amount [s] the corner may use. */
private class SmoothedLeg(r: Double, s: Double) {
    val beta: Double = HALF_PI / 2 * s
    val p: Double = (1 + s) * r
    val d: Double = r * (1 - cos(beta))
    val x3: Double = r * (1 - sin(beta))
    val c: Double = r * tan(beta / 2) * cos(beta)
    val a: Double = 2 * (p - x3 - c) / 3
}

private const val HALF_PI = PI / 2
