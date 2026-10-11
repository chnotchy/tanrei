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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.github.takahirom.roborazzi.captureRoboImage
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
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
 * One baseline per fixture in `specs/switch.spec.json`, at `src/test/snapshots/switch/<fixture-id>.png`, read from the
 * spec: the switch and its label on the surface, `space200` around it, light scheme. The fixtures' glyphs name icons of
 * the product's icon font (`check`, `close`); Tanrei bundles no font, so the baselines draw [SwitchGlyph] — a check or
 * a cross stroked by the glyph's weight, in the icon color the handle gives its slot, filling the icon box.
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiSwitchSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadSwitchFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                SwitchStage { key(current.id) { SwitchFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(SWITCH_STAGE_TAG).captureRoboImage("$SWITCH_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("switch")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One fixture of `specs/switch.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class SwitchFixture(
    val id: String,
    val checked: Boolean,
    val enabled: Boolean,
    val label: String,
    val labelHidden: Boolean,
    val selectedIcon: String,
    val unselectedIcon: String,
)

internal const val SWITCH_SNAPSHOTS = "src/test/snapshots/switch"
internal const val SWITCH_STAGE_TAG = "fixture"

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadSwitchFixtures(): List<SwitchFixture> {
    val spec = JSONObject(File("../../../specs/switch.spec.json").readText())
    val declared = spec.getJSONArray("props").let { props -> (0 until props.length()).map(props::getJSONObject) }
    val defaults = declared.associate { it.getString("name") to it.get("default") }
    val fixtures = spec.getJSONArray("fixtures")
    return (0 until fixtures.length()).map { index ->
        val fixture = fixtures.getJSONObject(index)
        val given = fixture.getJSONObject("props")
        val unknown = given.keys().asSequence().filterNot { it in SWITCH_PROPS }.toList()
        require(unknown.isEmpty()) { "fixture ${fixture.getString("id")} uses props this test does not map: $unknown" }
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        SwitchFixture(
            id = fixture.getString("id"),
            checked = prop("selected") as Boolean,
            enabled = !(prop("disabled") as Boolean),
            label = prop("label") as String,
            labelHidden = prop("labelHidden") as Boolean,
            selectedIcon = prop("selectedIcon") as String,
            unselectedIcon = prop("unselectedIcon") as String,
        )
    }
}

private val SWITCH_PROPS = setOf("selected", "disabled", "label", "labelHidden", "selectedIcon", "unselectedIcon")

/** The surface, `space200` around the switch (its round layer reaches past the track, into that space). */
@Composable
internal fun SwitchStage(content: @Composable () -> Unit) {
    Box(Modifier.testTag(SWITCH_STAGE_TAG).background(TanreiColorRole.Surface.color).padding(TanreiTheme.tokens.space.space200)) { content() }
}

/** The switch of one fixture: `thumbContent` is the glyph of its selection, or none when that prop is empty. */
@Composable
internal fun SwitchFixture(fixture: SwitchFixture) {
    val icon = if (fixture.checked) fixture.selectedIcon else fixture.unselectedIcon
    TanreiSwitch(
        checked = fixture.checked,
        onCheckedChange = {},
        label = fixture.label,
        enabled = fixture.enabled,
        labelHidden = fixture.labelHidden,
        thumbContent = if (icon.isEmpty()) null else { { SwitchGlyph(icon) } },
    )
}

/**
 * The stand-in for the icon font's glyph [name] — `check` or `close` (anything else draws a check): stroked by the
 * glyph's weight, in the icon color the slot is given, inside the icon box with an icon font's margin. Tests only —
 * the proportions describe a picture, not a design value.
 */
@Composable
internal fun SwitchGlyph(name: String) {
    val glyph = LocalTanreiIconGlyph.current
    val color = LocalTanreiContentColor.current
    Canvas(Modifier.fillMaxSize()) {
        val stroke = size.minDimension * glyph.weight / STROKE_PER_WEIGHT
        fun at(x: Float, y: Float) = Offset(size.width * x, size.height * y)
        if (name == "close") {
            drawLine(color, at(0.25f, 0.25f), at(0.75f, 0.75f), stroke, StrokeCap.Round)
            drawLine(color, at(0.75f, 0.25f), at(0.25f, 0.75f), stroke, StrokeCap.Round)
        } else {
            drawLine(color, at(0.2f, 0.52f), at(0.4f, 0.72f), stroke, StrokeCap.Round)
            drawLine(color, at(0.4f, 0.72f), at(0.8f, 0.3f), stroke, StrokeCap.Round)
        }
    }
}

/** Weight 400 strokes a tenth of the box (as `FixtureGlyph`). */
private const val STROKE_PER_WEIGHT = 4000f
