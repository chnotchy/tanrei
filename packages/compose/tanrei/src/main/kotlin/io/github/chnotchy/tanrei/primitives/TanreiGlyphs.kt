package io.github.chnotchy.tanrei.primitives

import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathMeasure

/*
 * The glyphs a component draws itself, as fractions of their box: the checkbox's mark and the filter chip's check (one
 * geometry, "the check follows the checkbox's mark"), and the input chip's remove cross when the app has installed no
 * icon font. Not design values — the shape of a glyph, as a font's glyph is; the stroke is the caller's token.
 */
private const val CHECK_START_X = 0.2f
private const val CHECK_START_Y = 0.5f
private const val CHECK_CORNER_X = 0.4f
private const val CHECK_CORNER_Y = 0.7f
private const val CHECK_END_X = 0.8f
private const val CHECK_END_Y = 0.3f
private const val CROSS_NEAR = 0.25f
private const val CHEVRON_SIDE_X = 0.27f
private const val CHEVRON_TOP_Y = 0.39f
private const val CHEVRON_TIP_Y = 0.62f
private const val CROSS_FAR = 0.75f

/** The first [progress] (0–1) of the check's path, from its start, in a box of [size]. */
internal fun tanreiCheckPath(size: Size, progress: Float = 1f): Path {
    val full = Path().apply {
        moveTo(size.width * CHECK_START_X, size.height * CHECK_START_Y)
        lineTo(size.width * CHECK_CORNER_X, size.height * CHECK_CORNER_Y)
        lineTo(size.width * CHECK_END_X, size.height * CHECK_END_Y)
    }
    if (progress >= 1f) return full
    val measure = PathMeasure().apply { setPath(full, false) }
    return Path().also { measure.getSegment(0f, measure.length * progress.coerceAtLeast(0f), it, true) }
}

/**
 * A cross (a close glyph) in a box of [size]: its two strokes as ONE path, so a translucent color is laid down once
 * where they cross, as a font's glyph is.
 */
internal fun tanreiCrossPath(size: Size): Path = Path().apply {
    moveTo(size.width * CROSS_NEAR, size.height * CROSS_NEAR)
    lineTo(size.width * CROSS_FAR, size.height * CROSS_FAR)
    moveTo(size.width * CROSS_FAR, size.height * CROSS_NEAR)
    lineTo(size.width * CROSS_NEAR, size.height * CROSS_FAR)
}

/** A chevron pointing down (a menu button's `keyboard_arrow_down`) in a box of [size], as one open path. */
internal fun tanreiChevronDownPath(size: Size): Path = Path().apply {
    moveTo(size.width * CHEVRON_SIDE_X, size.height * CHEVRON_TOP_Y)
    lineTo(size.width * 0.5f, size.height * CHEVRON_TIP_Y)
    lineTo(size.width * (1f - CHEVRON_SIDE_X), size.height * CHEVRON_TOP_Y)
}
