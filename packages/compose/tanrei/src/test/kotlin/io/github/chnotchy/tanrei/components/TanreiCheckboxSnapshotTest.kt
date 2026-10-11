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
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
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
 * One baseline per fixture in `specs/checkbox.spec.json`, at `src/test/snapshots/checkbox/<fixture-id>.png`, read from
 * the spec: the checkbox and its label on the surface, `space200` around it, light scheme.
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiCheckboxSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadCheckboxFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                CheckboxStage { key(current.id) { CheckboxFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(CHECKBOX_STAGE_TAG).captureRoboImage("$CHECKBOX_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("checkbox")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One fixture of `specs/checkbox.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class CheckboxFixture(
    val id: String,
    val checked: Boolean,
    val indeterminate: Boolean,
    val isError: Boolean,
    val enabled: Boolean,
    val label: String,
    val labelHidden: Boolean,
)

internal const val CHECKBOX_SNAPSHOTS = "src/test/snapshots/checkbox"
internal const val CHECKBOX_STAGE_TAG = "fixture"

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadCheckboxFixtures(): List<CheckboxFixture> {
    val spec = JSONObject(File("../../../specs/checkbox.spec.json").readText())
    val declared = spec.getJSONArray("props").let { props -> (0 until props.length()).map(props::getJSONObject) }
    val defaults = declared.associate { it.getString("name") to it.get("default") }
    val fixtures = spec.getJSONArray("fixtures")
    return (0 until fixtures.length()).map { index ->
        val fixture = fixtures.getJSONObject(index)
        val given = fixture.getJSONObject("props")
        val unknown = given.keys().asSequence().filterNot { it in CHECKBOX_PROPS }.toList()
        require(unknown.isEmpty()) { "fixture ${fixture.getString("id")} uses props this test does not map: $unknown" }
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        CheckboxFixture(
            id = fixture.getString("id"),
            checked = prop("checked") as Boolean,
            indeterminate = prop("indeterminate") as Boolean,
            isError = prop("error") as Boolean,
            enabled = !(prop("disabled") as Boolean),
            label = prop("label") as String,
            labelHidden = prop("labelHidden") as Boolean,
        )
    }
}

private val CHECKBOX_PROPS = setOf("checked", "indeterminate", "error", "disabled", "label", "labelHidden")

/** The surface, `space200` around the checkbox. */
@Composable
internal fun CheckboxStage(content: @Composable () -> Unit) {
    Box(Modifier.testTag(CHECKBOX_STAGE_TAG).background(TanreiColorRole.Surface.color).padding(TanreiTheme.tokens.space.space200)) { content() }
}

/** The checkbox of one fixture: the tri-state overload for an indeterminate one, the boolean overload otherwise. */
@Composable
internal fun CheckboxFixture(fixture: CheckboxFixture) {
    if (fixture.indeterminate) {
        TanreiCheckbox(state = ToggleableState.Indeterminate, onClick = {}, label = fixture.label, enabled = fixture.enabled, isError = fixture.isError, labelHidden = fixture.labelHidden)
    } else {
        TanreiCheckbox(checked = fixture.checked, onCheckedChange = {}, label = fixture.label, enabled = fixture.enabled, isError = fixture.isError, labelHidden = fixture.labelHidden)
    }
}
