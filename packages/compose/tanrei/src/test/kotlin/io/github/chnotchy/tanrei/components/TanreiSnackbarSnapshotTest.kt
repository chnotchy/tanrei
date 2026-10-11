package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.github.takahirom.roborazzi.captureRoboImage
import io.github.chnotchy.tanrei.primitives.extent
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import java.io.File
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * One baseline per fixture in `specs/snackbar.spec.json`, at `src/test/snapshots/snackbar/<fixture-id>.png`, read from
 * the spec (`platforms.compose`'s harness): `TanreiSnackbar(message = …)` drawn in place (SNK-19) on a 400 wide stage of
 * the surface — at its resting position, `containerMargin` from the stage's sides, with room above and below for its
 * shadow —, light scheme.
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w480dp-h640dp-xhdpi")
class TanreiSnackbarSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadSnackbarFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                SnackbarStage { key(current.id) { SnackbarFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(SNACKBAR_STAGE_TAG).captureRoboImage("$SNACKBAR_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("snackbar")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One fixture of `specs/snackbar.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class SnackbarFixture(
    val id: String,
    val message: String,
    val actionLabel: String,
    val withDismissAction: Boolean,
    val closeLabel: String,
    val duration: TanreiSnackbarDuration,
)

internal const val SNACKBAR_SPEC = "../../../specs/snackbar.spec.json"
internal const val SNACKBAR_SNAPSHOTS = "src/test/snapshots/snackbar"
internal const val SNACKBAR_STAGE_TAG = "fixture"

private val SNACKBAR_MAPPED_PROPS = setOf("message", "action", "closable", "closeLabel", "duration")

private fun JSONArray.objects(): List<JSONObject> = (0 until length()).map(::getJSONObject)

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadSnackbarFixtures(): List<SnackbarFixture> {
    val spec = JSONObject(File(SNACKBAR_SPEC).readText())
    val defaults = spec.getJSONArray("props").objects().associate { it.getString("name") to it.get("default") }
    require(defaults.keys == SNACKBAR_MAPPED_PROPS) { "the spec's props changed: map them here" }
    return spec.getJSONArray("fixtures").objects().map { fixture ->
        val given = fixture.getJSONObject("props")
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        SnackbarFixture(
            id = fixture.getString("id"),
            message = prop("message") as String,
            actionLabel = prop("action") as String,
            withDismissAction = prop("closable") as Boolean,
            closeLabel = prop("closeLabel") as String,
            duration = TanreiSnackbarDuration.entries.single { it.name.lowercase() == prop("duration") },
        )
    }
}

/**
 * The stage a snackbar fixture is drawn on: 400 wide, the surface, the bar `containerMargin` from its sides (its resting
 * position in a host) and its shadow's reach above and below. Tagged [SNACKBAR_STAGE_TAG].
 */
@Composable
internal fun SnackbarStage(content: @Composable () -> Unit) {
    val tokens = TanreiTheme.tokens.snackbar
    Box(
        Modifier
            .testTag(SNACKBAR_STAGE_TAG)
            .width(400.dp)
            .background(TanreiColorRole.Surface.color)
            .padding(horizontal = tokens.containerMargin, vertical = tokens.containerElevation.extent),
        contentAlignment = Alignment.Center,
    ) { content() }
}

/** The snackbar of one fixture, in place (SNK-19). */
@Composable
internal fun SnackbarFixture(fixture: SnackbarFixture, onResult: (TanreiSnackbarResult) -> Unit = {}) {
    TanreiSnackbar(
        message = fixture.message,
        actionLabel = fixture.actionLabel,
        withDismissAction = fixture.withDismissAction,
        closeLabel = fixture.closeLabel,
        duration = fixture.duration,
        onResult = onResult,
    )
}
