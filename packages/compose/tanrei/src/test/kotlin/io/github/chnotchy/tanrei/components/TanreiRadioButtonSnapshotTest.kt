package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.selectableGroup
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
 * One baseline per fixture in `specs/radio-button.spec.json`, at `src/test/snapshots/radio-button/<fixture-id>.png`,
 * read from the spec: the option and its label on the surface, `space200` around it, light scheme, in a group of its
 * own (`selectableGroup()`, the spec's `name`).
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiRadioButtonSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadRadioButtonFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                RadioButtonStage { key(current.id) { RadioButtonFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(RADIO_STAGE_TAG).captureRoboImage("$RADIO_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("radio-button")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One fixture of `specs/radio-button.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class RadioButtonFixture(
    val id: String,
    val selected: Boolean,
    val value: String,
    val name: String,
    val enabled: Boolean,
    val label: String,
    val labelHidden: Boolean,
)

internal const val RADIO_SNAPSHOTS = "src/test/snapshots/radio-button"
internal const val RADIO_STAGE_TAG = "fixture"

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadRadioButtonFixtures(): List<RadioButtonFixture> {
    val spec = JSONObject(File("../../../specs/radio-button.spec.json").readText())
    val declared = spec.getJSONArray("props").let { props -> (0 until props.length()).map(props::getJSONObject) }
    val defaults = declared.associate { it.getString("name") to it.get("default") }
    val fixtures = spec.getJSONArray("fixtures")
    return (0 until fixtures.length()).map { index ->
        val fixture = fixtures.getJSONObject(index)
        val given = fixture.getJSONObject("props")
        val unknown = given.keys().asSequence().filterNot { it in RADIO_PROPS }.toList()
        require(unknown.isEmpty()) { "fixture ${fixture.getString("id")} uses props this test does not map: $unknown" }
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        RadioButtonFixture(
            id = fixture.getString("id"),
            selected = prop("selected") as Boolean,
            value = prop("value") as String,
            name = prop("name") as String,
            enabled = !(prop("disabled") as Boolean),
            label = prop("label") as String,
            labelHidden = prop("labelHidden") as Boolean,
        )
    }
}

private val RADIO_PROPS = setOf("selected", "value", "name", "disabled", "label", "labelHidden")

/** The surface, `space200` around the option, which is a group of its own (the spec's `name`). */
@Composable
internal fun RadioButtonStage(content: @Composable () -> Unit) {
    Box(Modifier.testTag(RADIO_STAGE_TAG).background(TanreiColorRole.Surface.color).padding(TanreiTheme.tokens.space.space200).selectableGroup()) { content() }
}

/** The option of one fixture; its `onClick` captures its `value`, as a caller's would. */
@Composable
internal fun RadioButtonFixture(fixture: RadioButtonFixture) {
    TanreiRadioButton(
        selected = fixture.selected,
        onClick = { fixture.value },
        label = fixture.label,
        enabled = fixture.enabled,
        labelHidden = fixture.labelHidden,
    )
}
