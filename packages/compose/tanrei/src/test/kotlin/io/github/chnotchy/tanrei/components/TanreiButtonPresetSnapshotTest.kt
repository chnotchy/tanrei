package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.github.takahirom.roborazzi.RoborazziOptions
import com.github.takahirom.roborazzi.captureRoboImage
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.Cupertino
import io.github.chnotchy.tanrei.tokens.M3Like
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import java.io.File
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Baselines of the shipped presets, at `src/test/snapshots/button/<system-id>/<fixture-id>.png` — apart
 * from the default system's baselines (`src/test/snapshots/button/<fixture-id>.png`), which belong to
 * [TanreiButtonSnapshotTest] and the parity checker. Same harness, same spec fixtures, light scheme;
 * only `TanreiTheme(system = …)` differs.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiButtonPresetSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    private class Fixture(val id: String, val variant: TanreiButtonVariant, val content: String)

    @Test
    fun `m3-like - the medium fixture of every variant matches its baseline`() = verify(TanreiSystem.M3Like)

    @Test
    fun `cupertino - the medium fixture of every variant matches its baseline`() = verify(TanreiSystem.Cupertino)

    private fun verify(system: TanreiSystem) {
        val fixtures = loadFixtures()
        assertEquals("the spec declares every preset fixture", PRESET_FIXTURES, fixtures.map { it.id }.toSet())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Box(Modifier.testTag(TAG).background(TanreiColorRole.Surface.color).padding(TanreiTheme.tokens.space.space200)) {
                    key(current.id) {
                        TanreiButton(text = current.content, onClick = {}, variant = current.variant)
                    }
                }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(TAG).captureRoboImage("$SNAPSHOT_DIR/${system.id}/${fixture.id}.png", roborazziOptions = failureArtifactsIn("button/${system.id}")) }
                .exceptionOrNull()
                ?.let { "${system.id}/${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }

    private fun loadFixtures(): List<Fixture> {
        val fixtures = JSONObject(File(SPEC).readText()).getJSONArray("fixtures")
        return (0 until fixtures.length())
            .map(fixtures::getJSONObject)
            .filter { it.getString("id") in PRESET_FIXTURES }
            .map { fixture ->
                val props = fixture.getJSONObject("props")
                Fixture(
                    id = fixture.getString("id"),
                    variant = props.optString("variant").takeIf { it.isNotEmpty() }
                        ?.let { key -> TanreiButtonVariant(key).also { require(it in TanreiSystem.Tanrei.button.variants) { "unknown variant \"$key\"" } } }
                        ?: TanreiButtonVariant.Filled,
                    content = fixture.getString("content"),
                )
            }
    }

    /**
     * Failure artifacts (`<id>_actual.png`, `<id>_compare.png`) are named after the fixture alone, so every system
     * gets a directory of its own: the same fixture of two systems must not overwrite each other's evidence.
     */
    private fun failureArtifactsIn(directory: String) =
        RoborazziOptions(compareOptions = RoborazziOptions.CompareOptions(outputDirectoryPath = "build/outputs/roborazzi/$directory"))

    private companion object {
        const val TAG = "fixture"
        const val SPEC = "../../../specs/button.spec.json"
        const val SNAPSHOT_DIR = "src/test/snapshots/button"
        val PRESET_FIXTURES = setOf("filled-medium", "tonal-medium", "outlined-medium", "elevated-medium", "text-medium")
    }
}
