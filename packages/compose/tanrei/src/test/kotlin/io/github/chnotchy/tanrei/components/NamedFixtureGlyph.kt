package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph

/**
 * The stand-in for the icon font's glyph [name] in the baselines of the FAB, the extended FAB, the chip, the list, the menu and the tabs: Tanrei
 * bundles no icon font, and the platform font would draw the ligature's NAME. `add` a plus, `edit` a pencil, `event` a
 * calendar, `check` a check mark, `close` a cross, `chevron_right` a chevron, `dashboard` four tiles, `history` a clock,
 * `settings` a cog, `info` a circled i, `view_list` a list, `grid_view` four tiles, `map` a folded map, `format_align_left`,
 * `format_align_center` and `format_align_right` four lines, `format_bold`,
 * `format_italic` and `format_underlined` text marks, `save` a floppy disk, `description` a document,
 * `create_new_folder` a folder, `upload` an arrow onto a line (anything else draws a plus) — stroked by the glyph's weight in the icon color the slot is given,
 * inside the icon box with an icon font's margin; the tiles, the clock and the cog are filled while the glyph's `FILL` is on (a selected
 * tab's). Tests only: the proportions describe a picture, not a design value.
 */
@Composable
internal fun NamedFixtureGlyph(name: String, modifier: Modifier = Modifier.fillMaxSize()) {
    val glyph = LocalTanreiIconGlyph.current
    val color = LocalTanreiContentColor.current
    Canvas(modifier) {
        val stroke = size.minDimension * glyph.weight / STROKE_PER_WEIGHT
        fun at(x: Float, y: Float) = Offset(size.width * x, size.height * y)
        when (name) {
            "edit" -> drawPath(pencilPath(size), color, style = Stroke(stroke, join = StrokeJoin.Round, cap = StrokeCap.Round))
            "event" -> {
                drawRoundRect(color, topLeft = at(0.17f, 0.22f), size = Size(size.width * 0.66f, size.height * 0.62f), cornerRadius = androidx.compose.ui.geometry.CornerRadius(stroke), style = Stroke(stroke))
                drawLine(color, at(0.17f, 0.4f), at(0.83f, 0.4f), stroke)
                drawLine(color, at(0.35f, 0.14f), at(0.35f, 0.28f), stroke, StrokeCap.Round)
                drawLine(color, at(0.65f, 0.14f), at(0.65f, 0.28f), stroke, StrokeCap.Round)
                drawRect(color, topLeft = at(0.56f, 0.56f), size = Size(size.width * 0.14f, size.height * 0.14f))
            }
            "check" -> {
                drawLine(color, at(0.2f, 0.52f), at(0.4f, 0.72f), stroke, StrokeCap.Round)
                drawLine(color, at(0.4f, 0.72f), at(0.8f, 0.3f), stroke, StrokeCap.Round)
            }
            "close" -> {
                drawLine(color, at(0.28f, 0.28f), at(0.72f, 0.72f), stroke, StrokeCap.Round)
                drawLine(color, at(0.72f, 0.28f), at(0.28f, 0.72f), stroke, StrokeCap.Round)
            }
            "dashboard" -> {
                val style = if (glyph.fill >= 0.5f) Fill else Stroke(stroke)
                for ((x, y) in listOf(0.18f to 0.18f, 0.56f to 0.18f, 0.18f to 0.56f, 0.56f to 0.56f)) {
                    drawRect(color, topLeft = at(x, y), size = Size(size.width * 0.26f, size.height * 0.26f), style = style)
                }
            }
            "history" -> {
                // Filled: the dial drawn twice as heavy (a stand-in has no cut-outs).
                val dial = if (glyph.fill >= 0.5f) stroke * 2 else stroke
                drawCircle(color, radius = size.minDimension * 0.34f, center = at(0.5f, 0.5f), style = Stroke(dial))
                drawLine(color, at(0.5f, 0.3f), at(0.5f, 0.5f), stroke, StrokeCap.Round)
                drawLine(color, at(0.5f, 0.5f), at(0.64f, 0.62f), stroke, StrokeCap.Round)
            }
            "settings" -> {
                for (i in 0 until 8) {
                    val angle = Math.toRadians(i * 45.0)
                    val inner = size.minDimension * 0.28f
                    val outer = size.minDimension * 0.4f
                    drawLine(color, at(0.5f, 0.5f) + Offset((kotlin.math.cos(angle) * inner).toFloat(), (kotlin.math.sin(angle) * inner).toFloat()), at(0.5f, 0.5f) + Offset((kotlin.math.cos(angle) * outer).toFloat(), (kotlin.math.sin(angle) * outer).toFloat()), stroke * 1.5f, StrokeCap.Round)
                }
                if (glyph.fill >= 0.5f) drawCircle(color, radius = size.minDimension * 0.28f, center = at(0.5f, 0.5f))
                else drawCircle(color, radius = size.minDimension * 0.24f, center = at(0.5f, 0.5f), style = Stroke(stroke))
            }
            "info" -> {
                drawCircle(color, radius = size.minDimension * 0.36f, center = at(0.5f, 0.5f), style = Stroke(stroke))
                drawLine(color, at(0.5f, 0.46f), at(0.5f, 0.68f), stroke, StrokeCap.Round)
                drawCircle(color, radius = stroke * 0.7f, center = at(0.5f, 0.33f))
            }
            // The segmented button's (SEG fixtures): a list, a grid (four tiles, filled while FILL is on), a map, and the
            // three text alignments (four lines, the short ones at the left, centred or at the right).
            "view_list" -> {
                for (y in listOf(0.3f, 0.5f, 0.7f)) {
                    drawCircle(color, radius = stroke * 0.8f, center = at(0.24f, y))
                    drawLine(color, at(0.38f, y), at(0.8f, y), stroke, StrokeCap.Round)
                }
            }
            "grid_view" -> {
                val style = if (glyph.fill >= 0.5f) Fill else Stroke(stroke)
                for ((x, y) in listOf(0.2f to 0.2f, 0.54f to 0.2f, 0.2f to 0.54f, 0.54f to 0.54f)) {
                    drawRect(color, topLeft = at(x, y), size = Size(size.width * 0.26f, size.height * 0.26f), style = style)
                }
            }
            "map" -> {
                val fold = Path().apply {
                    moveTo(size.width * 0.16f, size.height * 0.28f)
                    lineTo(size.width * 0.38f, size.height * 0.2f)
                    lineTo(size.width * 0.62f, size.height * 0.28f)
                    lineTo(size.width * 0.84f, size.height * 0.2f)
                    lineTo(size.width * 0.84f, size.height * 0.72f)
                    lineTo(size.width * 0.62f, size.height * 0.8f)
                    lineTo(size.width * 0.38f, size.height * 0.72f)
                    lineTo(size.width * 0.16f, size.height * 0.8f)
                    close()
                    moveTo(size.width * 0.38f, size.height * 0.2f)
                    lineTo(size.width * 0.38f, size.height * 0.72f)
                    moveTo(size.width * 0.62f, size.height * 0.28f)
                    lineTo(size.width * 0.62f, size.height * 0.8f)
                }
                drawPath(fold, color, style = Stroke(stroke, join = StrokeJoin.Round))
            }
            "format_align_left", "format_align_center", "format_align_right" -> {
                for ((i, y) in listOf(0.24f, 0.41f, 0.58f, 0.75f).withIndex()) {
                    val long = i % 2 == 0
                    val length = if (long) 0.6f else 0.36f
                    val start = when (name) {
                        "format_align_left" -> 0.2f
                        "format_align_right" -> 0.8f - length
                        else -> 0.5f - length / 2
                    }
                    drawLine(color, at(start, y), at(start + length, y), stroke, StrokeCap.Round)
                }
            }
            // The button group's (BGR fixtures): bold, italic and underlined text marks. Its `share` and `delete` stay
            // plus signs, as other components' baselines already draw them.
            "format_bold" -> drawPath(
                Path().apply {
                    moveTo(size.width * 0.32f, size.height * 0.2f)
                    lineTo(size.width * 0.32f, size.height * 0.8f)
                    lineTo(size.width * 0.6f, size.height * 0.8f)
                    lineTo(size.width * 0.7f, size.height * 0.66f)
                    lineTo(size.width * 0.6f, size.height * 0.5f)
                    lineTo(size.width * 0.32f, size.height * 0.5f)
                    moveTo(size.width * 0.32f, size.height * 0.2f)
                    lineTo(size.width * 0.56f, size.height * 0.2f)
                    lineTo(size.width * 0.64f, size.height * 0.34f)
                    lineTo(size.width * 0.56f, size.height * 0.5f)
                },
                color,
                style = Stroke(stroke * 1.6f, join = StrokeJoin.Round),
            )
            "format_italic" -> {
                drawLine(color, at(0.4f, 0.2f), at(0.7f, 0.2f), stroke, StrokeCap.Round)
                drawLine(color, at(0.3f, 0.8f), at(0.6f, 0.8f), stroke, StrokeCap.Round)
                drawLine(color, at(0.58f, 0.2f), at(0.42f, 0.8f), stroke, StrokeCap.Round)
            }
            "format_underlined" -> {
                drawLine(color, at(0.34f, 0.18f), at(0.34f, 0.5f), stroke, StrokeCap.Round)
                drawLine(color, at(0.66f, 0.18f), at(0.66f, 0.5f), stroke, StrokeCap.Round)
                drawArc(color, 0f, 180f, false, topLeft = at(0.34f, 0.34f), size = Size(size.width * 0.32f, size.height * 0.32f), style = Stroke(stroke))
                drawLine(color, at(0.26f, 0.8f), at(0.74f, 0.8f), stroke, StrokeCap.Round)
            }
            // The split button's (SPB fixtures): a floppy disk.
            "save" -> {
                drawRoundRect(color, topLeft = at(0.2f, 0.2f), size = Size(size.width * 0.6f, size.height * 0.6f), cornerRadius = androidx.compose.ui.geometry.CornerRadius(stroke), style = Stroke(stroke))
                drawRect(color, topLeft = at(0.32f, 0.2f), size = Size(size.width * 0.32f, size.height * 0.18f), style = Stroke(stroke))
                drawCircle(color, radius = size.minDimension * 0.08f, center = at(0.5f, 0.6f))
            }
            // The FAB menu's items (FBM fixtures): a document, a folder with a plus, an upward arrow onto a line.
            "description" -> {
                drawRect(color, topLeft = at(0.24f, 0.16f), size = Size(size.width * 0.52f, size.height * 0.68f), style = Stroke(stroke))
                for (y in listOf(0.42f, 0.56f, 0.7f)) drawLine(color, at(0.34f, y), at(0.66f, y), stroke)
            }
            "create_new_folder" -> {
                drawRect(color, topLeft = at(0.16f, 0.26f), size = Size(size.width * 0.68f, size.height * 0.52f), style = Stroke(stroke))
                drawLine(color, at(0.5f, 0.4f), at(0.5f, 0.66f), stroke)
                drawLine(color, at(0.37f, 0.53f), at(0.63f, 0.53f), stroke)
            }
            "upload" -> {
                drawLine(color, at(0.5f, 0.2f), at(0.5f, 0.64f), stroke, StrokeCap.Round)
                drawLine(color, at(0.32f, 0.38f), at(0.5f, 0.2f), stroke, StrokeCap.Round)
                drawLine(color, at(0.68f, 0.38f), at(0.5f, 0.2f), stroke, StrokeCap.Round)
                drawLine(color, at(0.22f, 0.8f), at(0.78f, 0.8f), stroke, StrokeCap.Round)
            }
            "chevron_right" -> {
                drawLine(color, at(0.4f, 0.25f), at(0.65f, 0.5f), stroke, StrokeCap.Round)
                drawLine(color, at(0.65f, 0.5f), at(0.4f, 0.75f), stroke, StrokeCap.Round)
            }
            else -> {
                drawLine(color, at(0.5f, 0.2f), at(0.5f, 0.8f), stroke, StrokeCap.Round)
                drawLine(color, at(0.2f, 0.5f), at(0.8f, 0.5f), stroke, StrokeCap.Round)
            }
        }
    }
}

/** A pencil lying from the bottom-left to the top-right, inside a box of [size] with an icon font's margin. */
private fun pencilPath(size: Size): Path {
    fun x(f: Float) = size.width * f
    fun y(f: Float) = size.height * f
    return Path().apply {
        moveTo(x(0.18f), y(0.82f))
        lineTo(x(0.22f), y(0.64f))
        lineTo(x(0.64f), y(0.22f))
        lineTo(x(0.78f), y(0.36f))
        lineTo(x(0.36f), y(0.78f))
        close()
        moveTo(x(0.56f), y(0.3f))
        lineTo(x(0.7f), y(0.44f))
    }
}

/** Weight 400 strokes a tenth of the box (as `FixtureGlyph`). */
private const val STROKE_PER_WEIGHT = 4000f
