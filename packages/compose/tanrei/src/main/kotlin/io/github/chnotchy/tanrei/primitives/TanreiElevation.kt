package io.github.chnotchy.tanrei.primitives

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.AnimationSpec
import androidx.compose.foundation.border
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import android.graphics.BlurMaskFilter
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Canvas
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.ImageBitmapConfig
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathOperation
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.asAndroidPath
import androidx.compose.ui.graphics.asComposePath
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.coerceAtLeast
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.lerp
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.tokens.TanreiColors
import io.github.chnotchy.tanrei.tokens.TanreiShadowLayer
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.floor

private val None = 0.dp

// ── CSS box-shadow → Android ────────────────────────────────────────────
//
// THE one place where a shadow token becomes what Android draws (shadow tokens have CSS `box-shadow`
// semantics).
//
//   blur    CSS: the shadow is the shape convolved with a Gaussian whose standard deviation is σ = blur / 2.
//           Android: `android.graphics.BlurMaskFilter(radius)` (pixels) — which Compose's `dropShadow` uses too —
//           blurs with a Gaussian of σ = 0.57735 · radius + 0.5 (Skia's `SkBlurMask::ConvertRadiusToSigma`; 0.57735 = 1/√3).
//           So radius = (blur / 2 − 0.5) / 0.57735, in PIXELS — the 0.5 is a pixel quantity, which is why the
//           conversion needs the density. A blur of 1px or less (σ ≤ 0.5px) is no blur at all.
//           Passing the CSS number through, as this file once did, draws a shadow ~1.15× too soft (and more for
//           small blurs: 4px became σ = 2.8px instead of 2px).
//   spread  CSS: the shape grows by `spread` on every side before it is blurred (negative shrinks it), and a rounded
//           corner's radius grows or shrinks with it (a sharp corner stays sharp). `spreadShadowPath` does exactly that.
//   x, y    the same in both.
//   tail    CSS draws the whole Gaussian. Compose's `Modifier.dropShadow` (ui-graphics 1.12) renders the shadow into
//           a bitmap that reaches only `radius` ≈ 1.7σ beyond the shape and so cuts the last 4.5% of the tail off
//           (measured: 6.7% coverage at 1.5σ, then 0 from 1.75σ on, where the Gaussian still has 4.0%, 2.3% at 2σ).
//           So the shadow is drawn HERE, the same way — the blurred shape in an alpha-only software bitmap, tinted
//           when drawn, which works on every API level — but into a bitmap that reaches TAIL_SIGMAS·σ.
//   ring    a layer with no offset, no blur and a positive spread is Tanrei's hairline: drawn as a border of that
//           width INSIDE the shape (crisp at every density), not as a shadow.

/** Skia's radius → σ: `σ = BLUR_SIGMA_SCALE · radius + BLUR_SIGMA_OFFSET` (pixels). Facts of the platform. */
private const val BLUR_SIGMA_SCALE = 0.57735f
private const val BLUR_SIGMA_OFFSET = 0.5f

/**
 * How many σ beyond the shape the shadow's bitmap reaches. Skia's blur (three box blurs) is exactly 0 from about
 * 2.8σ on, and a Gaussian has 0.13% left at 3σ — less than half a step of an 8-bit channel even for an opaque shadow.
 */
private const val TAIL_SIGMAS = 3f

/** The Gaussian σ a CSS `box-shadow` blur radius stands for: half of it. Same unit in and out. */
internal fun cssBlurToSigma(blur: Float): Float = (blur / 2f).coerceAtLeast(0f)

/** The `BlurMaskFilter` / Compose `Shadow.radius` (pixels) that draws a CSS blur radius of [blurPx] pixels. */
internal fun cssBlurToAndroidBlurRadius(blurPx: Float): Float =
    ((cssBlurToSigma(blurPx) - BLUR_SIGMA_OFFSET) / BLUR_SIGMA_SCALE).coerceAtLeast(0f)

// ── layers ──────────────────────────────────────────────────────────────

/** One shadow layer with its color resolved against the current scheme: what is drawn, and what is animated. */
@Immutable
internal data class TanreiDrawnShadow(val x: Dp, val y: Dp, val blur: Dp, val spread: Dp, val color: Color) {
    /** A hairline ring: no offset, no blur, only spread. Rendered as a border, not as a shadow. */
    val isRing: Boolean get() = x == None && y == None && blur == None && spread > None

    /** Nothing to draw: no ring, no blur, no offset — or no color. */
    val isEmpty: Boolean get() = color.alpha == 0f || (x == None && y == None && blur == None && spread <= None)
}

internal fun List<TanreiShadowLayer>.resolve(colors: TanreiColors): List<TanreiDrawnShadow> =
    map { TanreiDrawnShadow(it.x, it.y, it.blur, it.spread, colors[it.role]) }

/**
 * How far this level draws outside the element: the reach of its widest shadow — offset, spread and the WHOLE tail
 * (TAIL_SIGMAS·σ = 1.5 × the CSS blur), so a group that dims the element never clips a shadow. An empty level
 * reaches nowhere.
 */
internal val List<TanreiShadowLayer>.extent: Dp
    get() = maxOfOrNull { maxOf(abs(it.x.value), abs(it.y.value)).dp + it.blur * (TAIL_SIGMAS / 2f) + it.spread }?.coerceAtLeast(None) ?: None

/**
 * Two levels blended like a CSS `box-shadow` transition: layers pair up by position, and the shorter list is
 * padded with layers that draw nothing (no offset, blur or spread, fully transparent). Colors blend premultiplied,
 * so a layer fading in keeps its hue.
 */
internal fun lerpShadows(from: List<TanreiDrawnShadow>, to: List<TanreiDrawnShadow>, fraction: Float): List<TanreiDrawnShadow> {
    if (fraction >= 1f) return to
    if (fraction <= 0f) return from
    return List(maxOf(from.size, to.size)) { i ->
        val a = from.getOrNull(i) ?: TanreiDrawnShadow(None, None, None, None, to[i].color.copy(alpha = 0f))
        val b = to.getOrNull(i) ?: TanreiDrawnShadow(None, None, None, None, a.color.copy(alpha = 0f))
        TanreiDrawnShadow(
            x = lerp(a.x, b.x, fraction),
            y = lerp(a.y, b.y, fraction),
            blur = lerp(a.blur, b.blur, fraction),
            spread = lerp(a.spread, b.spread, fraction),
            color = lerpPremultiplied(a.color, b.color, fraction),
        )
    }
}

private fun lerpPremultiplied(a: Color, b: Color, t: Float): Color {
    val alpha = a.alpha + (b.alpha - a.alpha) * t
    if (alpha <= 0f) return Color.Transparent
    fun channel(x: Float, y: Float): Float = ((x * a.alpha) * (1f - t) + (y * b.alpha) * t) / alpha
    return Color(channel(a.red, b.red).coerceIn(0f, 1f), channel(a.green, b.green).coerceIn(0f, 1f), channel(a.blue, b.blue).coerceIn(0f, 1f), alpha.coerceIn(0f, 1f))
}

/**
 * [target] in the current scheme, moving from the previously drawn level to a new one with [spec] — the same
 * duration and easing the component gives its container color. The first level is not animated.
 */
@Composable
internal fun animateTanreiElevation(target: List<TanreiShadowLayer>, spec: AnimationSpec<Float>): List<TanreiDrawnShadow> {
    val resolved = target.resolve(TanreiTheme.colors)
    val progress = remember { Animatable(1f) }
    var from by remember { mutableStateOf(resolved) }
    var to by remember { mutableStateOf(resolved) }
    LaunchedEffect(resolved) {
        if (resolved == to) return@LaunchedEffect
        from = lerpShadows(from, to, progress.value)
        to = resolved
        progress.snapTo(0f)
        progress.animateTo(1f, spec)
    }
    return lerpShadows(from, to, progress.value)
}

/**
 * Renders a `sys.elevation` level. Tanrei elevation is a hairline ring plus very soft shadows:
 * a leading ring layer becomes a border of the ring's width inside [shape]; every other layer
 * becomes a drop shadow behind the element. An empty level (`level0`) draws nothing.
 *
 * Place it before the container background: shadows are drawn behind, the ring above.
 */
@Composable
internal fun Modifier.tanreiElevation(layers: List<TanreiShadowLayer>, shape: Shape): Modifier =
    tanreiElevation(layers.resolve(TanreiTheme.colors), shape)

@JvmName("tanreiDrawnElevation")
internal fun Modifier.tanreiElevation(layers: List<TanreiDrawnShadow>, shape: Shape): Modifier {
    if (layers.isEmpty()) return this
    val ring = layers.firstOrNull()?.takeIf { it.isRing }
    var result = this
    // Draw the largest (last) shadow first so tighter layers sit on top, as CSS box-shadow lists do.
    for (layer in layers.asReversed()) {
        if (layer === ring || layer.isEmpty) continue
        result = result.tanreiDropShadow(layer, shape)
    }
    if (ring != null && !ring.isEmpty) result = result.border(width = ring.spread, color = ring.color, shape = shape)
    return result
}

/**
 * One CSS `box-shadow` layer behind the element: [shape] grown by the spread, moved by the offset, blurred with the
 * Gaussian the blur stands for — ALL of it (see "tail" above). The blurred shape is cached as an alpha-only bitmap
 * until the size, the shape or the layer's geometry changes; the color is applied when it is drawn.
 */
private fun Modifier.tanreiDropShadow(layer: TanreiDrawnShadow, shape: Shape): Modifier = drawWithCache {
    val nothing = onDrawBehind { }
    val path = spreadShadowPath(shape.createOutline(size, layoutDirection, this), layer.spread.toPx())
    val bounds = path.getBounds()
    if (bounds.isEmpty) return@drawWithCache nothing
    val blur = layer.blur.toPx()
    val radius = cssBlurToAndroidBlurRadius(blur)
    val reach = if (radius > 0f) ceil(cssBlurToSigma(blur) * TAIL_SIGMAS) + 1f else 1f
    // Whole pixels, so the bitmap lands on the pixel grid of the element.
    val left = floor(bounds.left - reach)
    val top = floor(bounds.top - reach)
    val width = ceil(bounds.right + reach - left).toInt()
    val height = ceil(bounds.bottom + reach - top).toInt()
    val mask = ImageBitmap(width, height, ImageBitmapConfig.Alpha8)
    val paint = Paint().apply { color = Color.Black }
    if (radius > 0f) paint.asFrameworkPaint().maskFilter = BlurMaskFilter(radius, BlurMaskFilter.Blur.NORMAL)
    Canvas(mask).apply {
        translate(-left, -top)
        drawPath(path, paint)
    }
    val at = Offset(left + layer.x.toPx(), top + layer.y.toPx())
    val tint = ColorFilter.tint(layer.color, BlendMode.SrcIn)
    onDrawBehind { drawImage(mask, topLeft = at, colorFilter = tint) }
}

/**
 * [outline] grown by [spread] pixels on every side (shrunk when negative), as CSS `box-shadow` spreads a shape:
 * edges move by the spread and a rounded corner's radius changes with it, while a sharp corner stays sharp.
 * A shape shrunk to nothing is an empty path.
 */
internal fun spreadShadowPath(outline: Outline, spread: Float): Path {
    fun spreadRadius(radius: CornerRadius) = if (radius.x <= 0f || radius.y <= 0f) CornerRadius.Zero else CornerRadius((radius.x + spread).coerceAtLeast(0f), (radius.y + spread).coerceAtLeast(0f))
    fun Rect.spreadOrNull() = inflate(spread).takeIf { it.width > 0f && it.height > 0f }
    return Path().apply {
        when (outline) {
            is Outline.Rectangle -> outline.rect.spreadOrNull()?.let { addRect(it) }
            is Outline.Rounded -> outline.roundRect.let { rr ->
                Rect(rr.left, rr.top, rr.right, rr.bottom).spreadOrNull()?.let { rect ->
                    addRoundRect(RoundRect(rect, spreadRadius(rr.topLeftCornerRadius), spreadRadius(rr.topRightCornerRadius), spreadRadius(rr.bottomRightCornerRadius), spreadRadius(rr.bottomLeftCornerRadius)))
                }
            }
            is Outline.Generic -> when {
                spread == 0f -> addPath(outline.path)
                outline.path.getBounds().spreadOrNull() == null -> Unit
                else -> {
                    // Any path: the band a round-joined stroke of twice the spread covers, added to or taken from it.
                    val stroke = android.graphics.Paint().apply {
                        style = android.graphics.Paint.Style.STROKE
                        strokeWidth = abs(spread) * 2f
                        strokeJoin = android.graphics.Paint.Join.ROUND
                    }
                    val band = android.graphics.Path().also { stroke.getFillPath(outline.path.asAndroidPath(), it) }
                    op(outline.path, band.asComposePath(), if (spread > 0f) PathOperation.Union else PathOperation.Difference)
                }
            }
        }
    }
}
