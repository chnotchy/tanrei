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
 * The stand-in for the icon font's glyph [name] in the baselines of the app bar, the navigation bar, the navigation rail
 * and the navigation drawer: `arrow_back`, `menu`, `more_vert`, `search`, `share`, `account_circle`, `person`, `inbox`,
 * `send`, `star`, `home`, `explore`, `add_circle`, `video_library`, `chat`, `folder`, `group`, `schedule`, `delete`,
 * `draft` and `label` each a simple outline — filled where it is a closed shape and the glyph's `FILL` is on (a selected
 * destination's); any other name is [NamedFixtureGlyph]'s. Kept apart from [NamedFixtureGlyph] on purpose: the list's,
 * menu's, dialog's and tooltip's baselines draw some of these names as its plus, and must not move. Stroked by the
 * glyph's weight in the icon color the slot is given. Tests only: the proportions describe a picture, not a design value.
 */
@Composable
internal fun BarFixtureGlyph(name: String, modifier: Modifier = Modifier.fillMaxSize()) {
    if (name !in BAR_GLYPHS) return NamedFixtureGlyph(name, modifier)
    val glyph = LocalTanreiIconGlyph.current
    val color = LocalTanreiContentColor.current
    Canvas(modifier) {
        val stroke = size.minDimension * glyph.weight / STROKE_PER_WEIGHT
        fun at(x: Float, y: Float) = Offset(size.width * x, size.height * y)
        when (name) {
            "arrow_back" -> {
                drawLine(color, at(0.22f, 0.5f), at(0.8f, 0.5f), stroke, StrokeCap.Round)
                drawLine(color, at(0.22f, 0.5f), at(0.46f, 0.26f), stroke, StrokeCap.Round)
                drawLine(color, at(0.22f, 0.5f), at(0.46f, 0.74f), stroke, StrokeCap.Round)
            }
            "menu" -> for (y in listOf(0.28f, 0.5f, 0.72f)) drawLine(color, at(0.18f, y), at(0.82f, y), stroke, StrokeCap.Round)
            "more_vert" -> for (y in listOf(0.24f, 0.5f, 0.76f)) drawCircle(color, radius = stroke * 1.1f, center = at(0.5f, y))
            "search" -> {
                drawCircle(color, radius = size.minDimension * 0.22f, center = at(0.42f, 0.42f), style = Stroke(stroke))
                drawLine(color, at(0.58f, 0.58f), at(0.8f, 0.8f), stroke, StrokeCap.Round)
            }
            "share" -> {
                drawLine(color, at(0.7f, 0.26f), at(0.3f, 0.5f), stroke)
                drawLine(color, at(0.3f, 0.5f), at(0.7f, 0.74f), stroke)
                for ((x, y) in listOf(0.7f to 0.26f, 0.3f to 0.5f, 0.7f to 0.74f)) drawCircle(color, radius = stroke * 1.4f, center = at(x, y))
            }
            "account_circle", "person" -> {
                val style = if (glyph.fill >= 0.5f) Fill else Stroke(stroke)
                if (name == "account_circle") {
                    drawCircle(color, radius = size.minDimension * 0.38f, center = at(0.5f, 0.5f), style = Stroke(stroke))
                    drawCircle(color, radius = size.minDimension * 0.12f, center = at(0.5f, 0.38f), style = style)
                    drawArc(color, 200f, 140f, useCenter = glyph.fill >= 0.5f, topLeft = at(0.28f, 0.58f), size = Size(size.width * 0.44f, size.height * 0.36f), style = style)
                } else {
                    drawCircle(color, radius = size.minDimension * 0.16f, center = at(0.5f, 0.34f), style = style)
                    drawArc(color, 180f, 180f, useCenter = true, topLeft = at(0.2f, 0.58f), size = Size(size.width * 0.6f, size.height * 0.44f), style = style)
                }
            }
            "inbox" -> {
                val style = if (glyph.fill >= 0.5f) Fill else Stroke(stroke, join = StrokeJoin.Round)
                drawPath(Path().apply { moveTo(size.width * 0.18f, size.height * 0.2f); lineTo(size.width * 0.82f, size.height * 0.2f); lineTo(size.width * 0.82f, size.height * 0.8f); lineTo(size.width * 0.18f, size.height * 0.8f); close() }, color, style = style)
                if (glyph.fill < 0.5f) drawLine(color, at(0.18f, 0.58f), at(0.82f, 0.58f), stroke)
            }
            "send" -> {
                val style = if (glyph.fill >= 0.5f) Fill else Stroke(stroke, join = StrokeJoin.Round)
                drawPath(Path().apply { moveTo(size.width * 0.18f, size.height * 0.2f); lineTo(size.width * 0.84f, size.height * 0.5f); lineTo(size.width * 0.18f, size.height * 0.8f); lineTo(size.width * 0.28f, size.height * 0.5f); close() }, color, style = style)
            }
            "star" -> {
                val style = if (glyph.fill >= 0.5f) Fill else Stroke(stroke, join = StrokeJoin.Round)
                val path = Path()
                for (i in 0 until 10) {
                    val angle = Math.toRadians(-90.0 + i * 36.0)
                    val r = size.minDimension * (if (i % 2 == 0) 0.36f else 0.15f)
                    val x = size.width * 0.5f + (kotlin.math.cos(angle) * r).toFloat()
                    val y = size.height * 0.53f + (kotlin.math.sin(angle) * r).toFloat()
                    if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
                }
                path.close()
                drawPath(path, color, style = style)
            }
            "home" -> {
                val style = if (glyph.fill >= 0.5f) Fill else Stroke(stroke, join = StrokeJoin.Round)
                drawPath(Path().apply { moveTo(size.width * 0.5f, size.height * 0.18f); lineTo(size.width * 0.82f, size.height * 0.46f); lineTo(size.width * 0.74f, size.height * 0.46f); lineTo(size.width * 0.74f, size.height * 0.82f); lineTo(size.width * 0.26f, size.height * 0.82f); lineTo(size.width * 0.26f, size.height * 0.46f); lineTo(size.width * 0.18f, size.height * 0.46f); close() }, color, style = style)
            }
            "explore" -> {
                drawCircle(color, radius = size.minDimension * 0.36f, center = at(0.5f, 0.5f), style = Stroke(stroke))
                drawPath(Path().apply { moveTo(size.width * 0.64f, size.height * 0.36f); lineTo(size.width * 0.55f, size.height * 0.55f); lineTo(size.width * 0.36f, size.height * 0.64f); lineTo(size.width * 0.45f, size.height * 0.45f); close() }, color)
            }
            "add_circle" -> {
                // Filled: a solid disc (a stand-in has no cut-outs); outlined: a circled plus.
                if (glyph.fill >= 0.5f) {
                    drawCircle(color, radius = size.minDimension * 0.38f, center = at(0.5f, 0.5f))
                } else {
                    drawCircle(color, radius = size.minDimension * 0.36f, center = at(0.5f, 0.5f), style = Stroke(stroke))
                    drawLine(color, at(0.5f, 0.34f), at(0.5f, 0.66f), stroke, StrokeCap.Round)
                    drawLine(color, at(0.34f, 0.5f), at(0.66f, 0.5f), stroke, StrokeCap.Round)
                }
            }
            "video_library" -> {
                drawRect(color, topLeft = at(0.26f, 0.18f), size = Size(size.width * 0.56f, size.height * 0.5f), style = Stroke(stroke))
                drawLine(color, at(0.18f, 0.3f), at(0.18f, 0.8f), stroke, StrokeCap.Round)
                drawLine(color, at(0.18f, 0.8f), at(0.7f, 0.8f), stroke, StrokeCap.Round)
                drawPath(Path().apply { moveTo(size.width * 0.46f, size.height * 0.3f); lineTo(size.width * 0.64f, size.height * 0.43f); lineTo(size.width * 0.46f, size.height * 0.56f); close() }, color)
            }
            "chat" -> {
                val style = if (glyph.fill >= 0.5f) Fill else Stroke(stroke, join = StrokeJoin.Round)
                drawPath(Path().apply { moveTo(size.width * 0.18f, size.height * 0.2f); lineTo(size.width * 0.82f, size.height * 0.2f); lineTo(size.width * 0.82f, size.height * 0.66f); lineTo(size.width * 0.36f, size.height * 0.66f); lineTo(size.width * 0.18f, size.height * 0.82f); close() }, color, style = style)
            }
            "folder" -> {
                val style = if (glyph.fill >= 0.5f) Fill else Stroke(stroke, join = StrokeJoin.Round)
                drawPath(Path().apply { moveTo(size.width * 0.16f, size.height * 0.24f); lineTo(size.width * 0.42f, size.height * 0.24f); lineTo(size.width * 0.5f, size.height * 0.32f); lineTo(size.width * 0.84f, size.height * 0.32f); lineTo(size.width * 0.84f, size.height * 0.78f); lineTo(size.width * 0.16f, size.height * 0.78f); close() }, color, style = style)
            }
            "group" -> {
                for (x in listOf(0.34f, 0.66f)) {
                    drawCircle(color, radius = size.minDimension * 0.1f, center = at(x, 0.38f), style = Stroke(stroke))
                    drawArc(color, 200f, 140f, useCenter = false, topLeft = at(x - 0.17f, 0.56f), size = Size(size.width * 0.34f, size.height * 0.3f), style = Stroke(stroke))
                }
            }
            "schedule" -> {
                drawCircle(color, radius = size.minDimension * 0.34f, center = at(0.5f, 0.5f), style = Stroke(stroke))
                drawLine(color, at(0.5f, 0.3f), at(0.5f, 0.5f), stroke, StrokeCap.Round)
                drawLine(color, at(0.5f, 0.5f), at(0.64f, 0.6f), stroke, StrokeCap.Round)
            }
            "delete" -> {
                val style = if (glyph.fill >= 0.5f) Fill else Stroke(stroke, join = StrokeJoin.Round)
                drawLine(color, at(0.2f, 0.26f), at(0.8f, 0.26f), stroke, StrokeCap.Round)
                drawLine(color, at(0.4f, 0.18f), at(0.6f, 0.18f), stroke, StrokeCap.Round)
                drawPath(Path().apply { moveTo(size.width * 0.28f, size.height * 0.34f); lineTo(size.width * 0.72f, size.height * 0.34f); lineTo(size.width * 0.68f, size.height * 0.82f); lineTo(size.width * 0.32f, size.height * 0.82f); close() }, color, style = style)
            }
            "draft" -> {
                val style = if (glyph.fill >= 0.5f) Fill else Stroke(stroke, join = StrokeJoin.Round)
                drawPath(Path().apply { moveTo(size.width * 0.24f, size.height * 0.16f); lineTo(size.width * 0.58f, size.height * 0.16f); lineTo(size.width * 0.76f, size.height * 0.34f); lineTo(size.width * 0.76f, size.height * 0.84f); lineTo(size.width * 0.24f, size.height * 0.84f); close() }, color, style = style)
            }
            "label" -> {
                val style = if (glyph.fill >= 0.5f) Fill else Stroke(stroke, join = StrokeJoin.Round)
                drawPath(Path().apply { moveTo(size.width * 0.16f, size.height * 0.28f); lineTo(size.width * 0.64f, size.height * 0.28f); lineTo(size.width * 0.84f, size.height * 0.5f); lineTo(size.width * 0.64f, size.height * 0.72f); lineTo(size.width * 0.16f, size.height * 0.72f); close() }, color, style = style)
            }
        }
    }
}

private val BAR_GLYPHS = setOf(
    "arrow_back", "menu", "more_vert", "search", "share", "account_circle", "person", "inbox", "send", "star", "home", "explore",
    "add_circle", "video_library", "chat", "folder", "group", "schedule", "delete", "draft", "label",
)

/** Weight 400 strokes a tenth of the box (as `NamedFixtureGlyph`). */
private const val STROKE_PER_WEIGHT = 4000f
