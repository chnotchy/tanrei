package io.github.chnotchy.tanrei.components

import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.github.takahirom.roborazzi.captureRoboImage
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.tokens.Cupertino
import io.github.chnotchy.tanrei.tokens.M3ExpressiveLike
import io.github.chnotchy.tanrei.tokens.M3Like
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * One representative fixture per shipped preset, at `src/test/snapshots/divider/<system-id>/<fixture-id>.png`.
 * `horizontal-inset-both` (Material's middle divider) for the m3-like presets and `horizontal-inset-start` (a grouped
 * list's separator, inset to the text) for cupertino. Same harness as the default's; only the system differs.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiDividerPresetSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `m3-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3Like, "horizontal-inset-both")

    @Test
    fun `m3-expressive-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3ExpressiveLike, "horizontal-inset-both")

    @Test
    fun `cupertino - the representative fixture matches its baseline`() = verify(TanreiSystem.Cupertino, "horizontal-inset-start")

    private fun verify(system: TanreiSystem, representative: String) {
        val fixture = loadDividerFixtures().single { it.id == representative }
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                DividerStage { DividerFixture(fixture) }
            }
        }
        rule.onNodeWithTag(DIVIDER_STAGE_TAG).captureRoboImage("$DIVIDER_SNAPSHOTS/${system.id}/${fixture.id}.png", roborazziOptions = failureArtifactsIn("divider/${system.id}"))
    }
}
