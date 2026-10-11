package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.github.takahirom.roborazzi.ExperimentalRoborazziApi
import com.github.takahirom.roborazzi.RoborazziOptions
import com.github.takahirom.roborazzi.captureRoboImage
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import java.io.File
import org.json.JSONObject
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * One baseline per fixture in `specs/icon-button.spec.json`, at `src/test/snapshots/icon-button/<fixture-id>.png`.
 * The fixture list is read from the spec, so a new fixture fails verification until it is recorded.
 *
 * The fixtures name an icon of the product's icon font (`"favorite"`). Tanrei bundles no font and tests render with
 * the platform's fonts, which would draw the ligature's NAME; the baselines draw [FixtureGlyph] instead — a heart
 * outlined or filled by the glyph's `FILL`, stroked by its weight, in the icon color, filling the icon box — so what
 * the icon button hands its slot (box, color, selection) is what the image shows.
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiIconButtonSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadIconButtonFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Box(Modifier.testTag(TAG).background(TanreiColorRole.Surface.color).padding(TanreiTheme.tokens.space.space200)) {
                    key(current.id) { IconButtonFixture(current) }
                }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(TAG).captureRoboImage("$SNAPSHOT_DIR/${fixture.id}.png", roborazziOptions = failureArtifactsIn("icon-button")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }

    private companion object {
        const val TAG = "fixture"
    }
}

/** One fixture of `specs/icon-button.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class IconButtonFixture(
    val id: String,
    val variant: TanreiIconButtonVariant,
    val size: TanreiIconButtonSize,
    val enabled: Boolean,
    val toggle: Boolean,
    val checked: Boolean,
    val label: String,
    val content: String,
)

internal const val ICON_BUTTON_SPEC = "../../../specs/icon-button.spec.json"
internal const val ICON_BUTTON_SNAPSHOTS = "src/test/snapshots/icon-button"
private const val SNAPSHOT_DIR = ICON_BUTTON_SNAPSHOTS

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadIconButtonFixtures(): List<IconButtonFixture> {
    val spec = JSONObject(File(ICON_BUTTON_SPEC).readText())
    val declared = spec.getJSONArray("props").let { props -> (0 until props.length()).map(props::getJSONObject) }
    val defaults = declared.associate { it.getString("name") to it.get("default") }
    val fixtures = spec.getJSONArray("fixtures")
    return (0 until fixtures.length()).map { index ->
        val fixture = fixtures.getJSONObject(index)
        val given = fixture.getJSONObject("props")
        val unknown = given.keys().asSequence().filterNot { it in MAPPED_PROPS }.toList()
        require(unknown.isEmpty()) { "fixture ${fixture.getString("id")} uses props this test does not map: $unknown" }
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        IconButtonFixture(
            id = fixture.getString("id"),
            // Spec values ARE the keys of the token axes; a fixture may only name a value the default system has.
            variant = TanreiIconButtonVariant(prop("variant") as String).also { require(it in TanreiSystem.Tanrei.iconButton.variants) { "unknown variant $it" } },
            size = TanreiIconButtonSize(prop("size") as String).also { require(it in TanreiSystem.Tanrei.iconButton.sizes) { "unknown size $it" } },
            enabled = !(prop("disabled") as Boolean),
            toggle = prop("toggle") as Boolean,
            checked = prop("selected") as Boolean,
            label = prop("label") as String,
            content = fixture.getString("content"),
        )
    }
}

private val MAPPED_PROPS = setOf("variant", "size", "disabled", "toggle", "selected", "label")

/** The icon button of one fixture, with [FixtureGlyph] as its icon. */
@Composable
internal fun IconButtonFixture(fixture: IconButtonFixture) {
    TanreiIconButton(
        onClick = {},
        contentDescription = fixture.label,
        variant = fixture.variant,
        size = fixture.size,
        checked = fixture.checked,
        onCheckedChange = if (fixture.toggle) { _ -> } else null,
        enabled = fixture.enabled,
    ) {
        FixtureGlyph(fixture.content)
    }
}

/**
 * The stand-in for the icon font's glyph [name] (every fixture names `favorite`): a heart filling the icon box, filled
 * where the glyph's `FILL` is on and outlined where it is off, its stroke following the glyph's weight, in the icon
 * color the slot is given. Tests only — the proportions below describe a picture, not a design value.
 */
@Composable
internal fun FixtureGlyph(@Suppress("UNUSED_PARAMETER") name: String) {
    val glyph = LocalTanreiIconGlyph.current
    val color = LocalTanreiContentColor.current
    Canvas(Modifier.fillMaxSize()) {
        val heart = heartPath(size)
        if (glyph.fill >= HALF) {
            drawPath(heart, color, style = Fill)
        } else {
            drawPath(heart, color, style = Stroke(width = size.minDimension * glyph.weight / STROKE_PER_WEIGHT, join = StrokeJoin.Round))
        }
    }
}

private const val HALF = 0.5f
/** Weight 400 strokes a tenth of the box, weight 300 three quarters of that. */
private const val STROKE_PER_WEIGHT = 4000f

/** A heart inside a box of [size], with the margin an icon font leaves around its glyphs (1/12 of the box). */
private fun heartPath(size: Size): Path {
    val m = size.minDimension / 12f
    val w = size.width - 2 * m
    val h = size.height - 2 * m
    fun x(f: Float) = m + w * f
    fun y(f: Float) = m + h * f
    return Path().apply {
        moveTo(x(0.5f), y(0.92f))
        cubicTo(x(0.12f), y(0.64f), x(0f), y(0.42f), x(0.06f), y(0.24f))
        cubicTo(x(0.14f), y(0.02f), x(0.42f), y(0.02f), x(0.5f), y(0.24f))
        cubicTo(x(0.58f), y(0.02f), x(0.86f), y(0.02f), x(0.94f), y(0.24f))
        cubicTo(x(1f), y(0.42f), x(0.88f), y(0.64f), x(0.5f), y(0.92f))
        close()
    }
}

/**
 * Failure artifacts (`<id>_actual.png`, `<id>_compare.png`) are named after the fixture alone, so every system gets a
 * directory of its own: the same fixture of two systems must not overwrite each other's evidence.
 */
@OptIn(ExperimentalRoborazziApi::class)
internal fun failureArtifactsIn(directory: String) =
    RoborazziOptions(compareOptions = RoborazziOptions.CompareOptions(outputDirectoryPath = "build/outputs/roborazzi/$directory"))
