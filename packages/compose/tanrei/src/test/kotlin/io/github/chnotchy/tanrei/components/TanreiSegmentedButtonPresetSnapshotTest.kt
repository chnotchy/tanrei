package io.github.chnotchy.tanrei.components

import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.github.takahirom.roborazzi.captureRoboImage
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.tokens.Cupertino
import io.github.chnotchy.tanrei.tokens.M3Like
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * One representative fixture per shipped preset, at `src/test/snapshots/segmented-button/<system-id>/<fixture-id>.png`
 * — apart from the default system's baselines, which belong to [TanreiSegmentedButtonSnapshotTest] and the parity
 * checker. The representative is picked for what the preset changes: `icons` for m3-like (the pill set, 18 icons and
 * check, on-surface icons) and `single` for cupertino (the grey track, the inset raised selection at level1, no check).
 * Same harness as the default's.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w480dp-h640dp-xhdpi")
class TanreiSegmentedButtonPresetSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `m3-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3Like, "icons")

    @Test
    fun `cupertino - the representative fixture matches its baseline`() = verify(TanreiSystem.Cupertino, "single")

    private fun verify(system: TanreiSystem, representative: String) {
        val fixture = loadSegmentedButtonFixtures().single { it.id == representative }
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                SegmentedButtonStage { SegmentedButtonFixture(fixture) }
            }
        }
        rule.onNodeWithTag(SEGMENTED_STAGE_TAG).captureRoboImage("$SEGMENTED_SNAPSHOTS/${system.id}/${fixture.id}.png", roborazziOptions = failureArtifactsIn("segmented-button/${system.id}"))
    }
}
