package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.github.takahirom.roborazzi.captureRoboImage
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiLoadingIndicatorSize
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
 * One baseline per fixture in `specs/loading-indicator.spec.json`, at `src/test/snapshots/loading-indicator/<fixture-id>.png`,
 * read from the spec. As LDG-4's `verify` says, fixtures are recorded with reduced motion requested, at the start of a
 * cycle: the whole circle at opacity 1 (on its still container when contained), the same on every platform.
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiLoadingIndicatorSnapshotTest {
    @get:Rule
    val rule = createComposeRule(effectContext = ReducedMotion)

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadLoadingFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                LoadingStage { key(current.id) { LoadingFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(LOADING_STAGE_TAG).captureRoboImage("$LOADING_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("loading-indicator")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One fixture of `specs/loading-indicator.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class LoadingFixture(val id: String, val size: TanreiLoadingIndicatorSize, val contained: Boolean, val label: String)

internal const val LOADING_SNAPSHOTS = "src/test/snapshots/loading-indicator"
internal const val LOADING_STAGE_TAG = "fixture"

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadLoadingFixtures(): List<LoadingFixture> {
    val spec = JSONObject(File("../../../specs/loading-indicator.spec.json").readText())
    val declared = spec.getJSONArray("props").let { props -> (0 until props.length()).map(props::getJSONObject) }
    val defaults = declared.associate { it.getString("name") to it.get("default") }
    val fixtures = spec.getJSONArray("fixtures")
    return (0 until fixtures.length()).map { index ->
        val fixture = fixtures.getJSONObject(index)
        val given = fixture.getJSONObject("props")
        val unknown = given.keys().asSequence().filterNot { it in setOf("size", "contained", "label") }.toList()
        require(unknown.isEmpty()) { "fixture ${fixture.getString("id")} uses props this test does not map: $unknown" }
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        LoadingFixture(
            id = fixture.getString("id"),
            size = TanreiLoadingIndicatorSize(prop("size") as String).also { require(it in TanreiSystem.Tanrei.loadingIndicator.sizes) { "unknown size $it" } },
            contained = prop("contained") as Boolean,
            label = prop("label") as String,
        )
    }
}

/** The surface with `space200` around the indicator — room for the contained form's shadow. */
@Composable
internal fun LoadingStage(content: @Composable () -> Unit) {
    Box(Modifier.testTag(LOADING_STAGE_TAG).background(TanreiColorRole.Surface.color).padding(TanreiTheme.tokens.space.space200)) { content() }
}

/** `contained` is a second composable on Compose (`platforms.compose`). */
@Composable
internal fun LoadingFixture(fixture: LoadingFixture) {
    if (fixture.contained) {
        TanreiContainedLoadingIndicator(contentDescription = fixture.label, size = fixture.size)
    } else {
        TanreiLoadingIndicator(contentDescription = fixture.label, size = fixture.size)
    }
}
