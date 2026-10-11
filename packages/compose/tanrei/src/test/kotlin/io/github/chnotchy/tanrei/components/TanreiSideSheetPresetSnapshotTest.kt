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
 * One representative fixture per shipped preset, at
 * `src/test/snapshots/side-sheet/<system-id>/<fixture-id>.png` — apart from the default system's baselines, which belong
 * to [TanreiSideSheetSnapshotTest] and the parity checker. The representative is picked for what the preset changes:
 * `modal` for m3-like (its level1 shadow, the heading-4 headline in on-surface-variant), `standard` for
 * m3-expressive-like (which inherits m3-like's sheet: the headline beside the close button) and `standard-actions` for
 * cupertino (its inspector column: the edge, and its Buttons and type). Same harness as the default's.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w720dp-h600dp-xhdpi")
class TanreiSideSheetPresetSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `m3-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3Like, "modal")

    @Test
    fun `m3-expressive-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3ExpressiveLike, "standard")

    @Test
    fun `cupertino - the representative fixture matches its baseline`() = verify(TanreiSystem.Cupertino, "standard-actions")

    private fun verify(system: TanreiSystem, representative: String) {
        val fixture = loadSideSheetFixtures().single { it.id == representative }
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                SideSheetStage { SideSheetFixture(fixture) }
            }
        }
        rule.onNodeWithTag(SIDE_SHEET_STAGE_TAG).captureRoboImage("$SIDE_SHEET_SNAPSHOTS/${system.id}/${fixture.id}.png", roborazziOptions = failureArtifactsIn("side-sheet/${system.id}"))
    }
}
