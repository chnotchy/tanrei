package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.github.takahirom.roborazzi.captureRoboImage
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.glyph
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import java.io.File
import org.json.JSONObject
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * One baseline per fixture in `specs/badge.spec.json`, at `src/test/snapshots/badge/<fixture-id>.png`, read from the
 * spec. As the spec's default slot says, a fixture's anchor is the glyph of the system's icon set its content names
 * (`"notifications"`), at `sys.icon.large` in `on-surface-variant`, named by that glyph name; the badge adds the
 * fixture's label to it as its description ("notifications, 3 unread"). Tanrei bundles no
 * icon font, so the baselines draw [BellGlyph] — a bell outline stroked by the icon set's weight, filling the icon box —
 * as that glyph. The stage leaves room at the end for the widest pill (`999+`), which extends past the anchor by design
 * (BDG-7).
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiBadgeSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadBadgeFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                BadgeStage { key(current.id) { BadgeFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(BADGE_STAGE_TAG).captureRoboImage("$BADGE_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("badge")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One fixture of `specs/badge.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class BadgeFixture(val id: String, val count: Int?, val max: Int, val label: String, val content: String)

internal const val BADGE_SNAPSHOTS = "src/test/snapshots/badge"
internal const val BADGE_STAGE_TAG = "fixture"

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadBadgeFixtures(): List<BadgeFixture> {
    val spec = JSONObject(File("../../../specs/badge.spec.json").readText())
    val declared = spec.getJSONArray("props").let { props -> (0 until props.length()).map(props::getJSONObject) }
    val defaults = declared.associate { it.getString("name") to it.get("default") }
    val fixtures = spec.getJSONArray("fixtures")
    return (0 until fixtures.length()).map { index ->
        val fixture = fixtures.getJSONObject(index)
        val given = fixture.getJSONObject("props")
        val unknown = given.keys().asSequence().filterNot { it in setOf("count", "max", "label") }.toList()
        require(unknown.isEmpty()) { "fixture ${fixture.getString("id")} uses props this test does not map: $unknown" }
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        BadgeFixture(
            id = fixture.getString("id"),
            count = prop("count").let { if (it == JSONObject.NULL) null else (it as Number).toInt() },
            max = (prop("max") as Number).toInt(),
            label = prop("label") as String,
            content = fixture.getString("content"),
        )
    }
}

/** The surface, `space200` around the anchor and `space500` after it, where a long count's pill reaches. */
@Composable
internal fun BadgeStage(content: @Composable () -> Unit) {
    val space = TanreiTheme.tokens.space
    Box(Modifier.testTag(BADGE_STAGE_TAG).background(TanreiColorRole.Surface.color).padding(start = space.space200, top = space.space200, end = space.space500, bottom = space.space200)) {
        content()
    }
}

@Composable
internal fun BadgeFixture(fixture: BadgeFixture) {
    TanreiBadge(count = fixture.count, max = fixture.max, contentDescription = fixture.label) {
        Box(Modifier.semantics { contentDescription = fixture.content }) { BellGlyph(fixture.content) }
    }
}

/**
 * The stand-in for the icon font's glyph [name] (every fixture names `notifications`): a bell outline filling an icon
 * box of `sys.icon.large`, stroked by the icon set's weight (as `FixtureGlyph` strokes its heart), in
 * `on-surface-variant`. Tests only — the proportions describe a picture, not a design value.
 */
@Composable
internal fun BellGlyph(@Suppress("UNUSED_PARAMETER") name: String) {
    val system = TanreiTheme.tokens
    val box = system.measure.iconLarge
    val glyph = system.icon.glyph(box, selected = false)
    val color = TanreiColorRole.OnSurfaceVariant.color
    Canvas(Modifier.size(box)) {
        val stroke = Stroke(width = size.minDimension * glyph.weight / STROKE_PER_WEIGHT, cap = StrokeCap.Round, join = StrokeJoin.Round)
        drawPath(bellPath(size), color, style = stroke)
        drawLine(color, Offset(size.width * 0.42f, size.height * 0.86f), Offset(size.width * 0.58f, size.height * 0.86f), strokeWidth = stroke.width, cap = StrokeCap.Round)
    }
}

/** Weight 400 strokes a tenth of the box (as `FixtureGlyph`). */
private const val STROKE_PER_WEIGHT = 4000f

private fun bellPath(size: Size): Path {
    fun x(f: Float) = size.width * f
    fun y(f: Float) = size.height * f
    return Path().apply {
        moveTo(x(0.2f), y(0.74f))
        lineTo(x(0.8f), y(0.74f))
        lineTo(x(0.72f), y(0.62f))
        lineTo(x(0.72f), y(0.42f))
        cubicTo(x(0.72f), y(0.26f), x(0.62f), y(0.16f), x(0.5f), y(0.16f))
        cubicTo(x(0.38f), y(0.16f), x(0.28f), y(0.26f), x(0.28f), y(0.42f))
        lineTo(x(0.28f), y(0.62f))
        close()
    }
}
