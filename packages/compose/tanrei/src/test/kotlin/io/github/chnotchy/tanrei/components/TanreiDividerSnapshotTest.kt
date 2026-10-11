package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.github.takahirom.roborazzi.captureRoboImage
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
 * One baseline per fixture in `specs/divider.spec.json`, at `src/test/snapshots/divider/<fixture-id>.png`, read from
 * the spec. A divider has no size of its own along its axis, so each fixture is drawn on a stage: a horizontal one
 * [STAGE_LENGTH] wide, a vertical one [STAGE_LENGTH] high, on the surface with the usual `space200` margin.
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiDividerSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadDividerFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                DividerStage { key(current.id) { DividerFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(DIVIDER_STAGE_TAG).captureRoboImage("$DIVIDER_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("divider")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One fixture of `specs/divider.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class DividerFixture(val id: String, val orientation: Orientation, val inset: TanreiDividerInset, val decorative: Boolean)

internal const val DIVIDER_SNAPSHOTS = "src/test/snapshots/divider"
internal const val DIVIDER_STAGE_TAG = "fixture"

/** Along the divider: long enough that the 16dp inset reads as an inset (Tests only — a picture, not a design value). */
private val STAGE_LENGTH = 120.dp

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadDividerFixtures(): List<DividerFixture> {
    val spec = JSONObject(File(DIVIDER_SPEC).readText())
    val declared = spec.getJSONArray("props").let { props -> (0 until props.length()).map(props::getJSONObject) }
    val defaults = declared.associate { it.getString("name") to it.get("default") }
    val fixtures = spec.getJSONArray("fixtures")
    return (0 until fixtures.length()).map { index ->
        val fixture = fixtures.getJSONObject(index)
        val given = fixture.getJSONObject("props")
        val unknown = given.keys().asSequence().filterNot { it in setOf("orientation", "inset", "decorative") }.toList()
        require(unknown.isEmpty()) { "fixture ${fixture.getString("id")} uses props this test does not map: $unknown" }
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        DividerFixture(
            id = fixture.getString("id"),
            orientation = Orientation.entries.single { it.name.lowercase() == prop("orientation") },
            inset = TanreiDividerInset.entries.single { it.name.lowercase() == prop("inset") },
            decorative = prop("decorative") as Boolean,
        )
    }
}

@Composable
internal fun DividerStage(content: @Composable () -> Unit) {
    Box(Modifier.testTag(DIVIDER_STAGE_TAG).background(TanreiColorRole.Surface.color).padding(TanreiTheme.tokens.space.space200)) { content() }
}

@Composable
internal fun DividerFixture(fixture: DividerFixture) {
    val stage = if (fixture.orientation == Orientation.Horizontal) Modifier.width(STAGE_LENGTH) else Modifier.height(STAGE_LENGTH)
    Box(stage) { TanreiDivider(orientation = fixture.orientation, inset = fixture.inset, decorative = fixture.decorative) }
}
