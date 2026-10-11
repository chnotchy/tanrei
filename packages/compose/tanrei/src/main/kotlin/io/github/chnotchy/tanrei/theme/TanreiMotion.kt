package io.github.chnotchy.tanrei.theme

import androidx.compose.animation.core.AnimationVector4D
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.Easing
import androidx.compose.animation.core.TweenSpec
import androidx.compose.animation.core.TwoWayConverter
import androidx.compose.animation.core.tween
import androidx.compose.ui.graphics.Color
import io.github.chnotchy.tanrei.tokens.TanreiCubicBezier

/** Converts an easing token to a Compose [Easing]. */
public fun TanreiCubicBezier.toEasing(): Easing = CubicBezierEasing(x1, y1, x2, y2)

/** A tween built from a duration token (milliseconds) and an easing token. */
public fun <T> tanreiTween(durationMillis: Int, easing: TanreiCubicBezier): TweenSpec<T> =
    tween(durationMillis = durationMillis, easing = easing.toEasing())

/**
 * Colors as premultiplied sRGB, so a transition between two state colors blends like a CSS transition:
 * fading in from "nothing drawn" keeps the target's hue instead of passing through black.
 */
internal val PremultipliedColor: TwoWayConverter<Color, AnimationVector4D> = TwoWayConverter(
    convertToVector = { AnimationVector4D(it.red * it.alpha, it.green * it.alpha, it.blue * it.alpha, it.alpha) },
    convertFromVector = { vector ->
        val alpha = vector.v4.coerceIn(0f, 1f)
        if (alpha == 0f) {
            Color.Transparent
        } else {
            Color((vector.v1 / alpha).coerceIn(0f, 1f), (vector.v2 / alpha).coerceIn(0f, 1f), (vector.v3 / alpha).coerceIn(0f, 1f), alpha)
        }
    },
)
