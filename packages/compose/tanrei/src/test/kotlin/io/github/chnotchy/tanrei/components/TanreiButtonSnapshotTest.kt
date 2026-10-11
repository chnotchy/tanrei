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
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
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
 * One baseline per fixture in `specs/button.spec.json`, at `src/test/snapshots/button/<fixture-id>.png`.
 * The fixture list is read from the spec, so a new fixture fails verification until it is recorded.
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 * A plain `testDebugUnitTest` renders the fixtures but does not compare or write images.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiButtonSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    private class Fixture(val id: String, val variant: TanreiButtonVariant, val size: TanreiButtonSize, val enabled: Boolean, val content: String)

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Box(Modifier.testTag(TAG).background(TanreiColorRole.Surface.color).padding(TanreiTheme.tokens.space.space200)) {
                    key(current.id) {
                        TanreiButton(
                            text = current.content,
                            onClick = {},
                            variant = current.variant,
                            size = current.size,
                            enabled = current.enabled,
                        )
                    }
                }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(TAG).captureRoboImage("$SNAPSHOT_DIR/${fixture.id}.png", roborazziOptions = failureArtifactsIn("button")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }

    private fun loadFixtures(): List<Fixture> {
        val spec = JSONObject(File(SPEC).readText())
        val fixtures = spec.getJSONArray("fixtures")
        return (0 until fixtures.length()).map { index ->
            val fixture = fixtures.getJSONObject(index)
            val props = fixture.getJSONObject("props")
            val unknown = props.keys().asSequence().filterNot { it in setOf("variant", "size", "disabled") }.toList()
            require(unknown.isEmpty()) { "fixture ${fixture.getString("id")} uses props this test does not map: $unknown" }
            Fixture(
                id = fixture.getString("id"),
                variant = props.optString("variant").takeIf { it.isNotEmpty() }?.let(::variantOf) ?: TanreiButtonVariant.Filled,
                size = props.optString("size").takeIf { it.isNotEmpty() }?.let(::sizeOf) ?: TanreiButtonSize.Medium,
                enabled = !props.optBoolean("disabled", false),
                content = fixture.getString("content"),
            )
        }
    }

    // Spec values ARE the keys of the token axes; a fixture may only name a value the default system has.
    private fun variantOf(key: String) = TanreiButtonVariant(key).also { require(it in TanreiSystem.Tanrei.button.variants) { "unknown variant \"$key\"" } }

    private fun sizeOf(key: String) = TanreiButtonSize(key).also { require(it in TanreiSystem.Tanrei.button.sizes) { "unknown size \"$key\"" } }

    /**
     * Failure artifacts (`<id>_actual.png`, `<id>_compare.png`) are named after the fixture alone, so every system
     * gets a directory of its own: the same fixture of two systems must not overwrite each other's evidence.
     */
    private fun failureArtifactsIn(directory: String) =
        RoborazziOptions(compareOptions = RoborazziOptions.CompareOptions(outputDirectoryPath = "build/outputs/roborazzi/$directory"))

    private companion object {
        const val TAG = "fixture"
        // Relative to the module directory, which is the working directory of Gradle unit tests.
        const val SPEC = "../../../specs/button.spec.json"
        const val SNAPSHOT_DIR = "src/test/snapshots/button"
    }
}
