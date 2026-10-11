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
 * One representative fixture per shipped preset, at `src/test/snapshots/split-button/<system-id>/<fixture-id>.png`
 * — apart from the default system's baselines, which belong to [TanreiSplitButtonSnapshotTest] and the parity checker. The
 * representative is picked for what the preset changes: `filled-open` for m3-like (full-round outer corners, the 4 join,
 * the detached open half), `outlined-medium` for m3-expressive-like (which inherits m3-like's: primary outlined labels on
 * the `outline` border) and `filled-icon` for cupertino (its tint, `corner.medium` and the leading icon). Same harness as
 * the default's.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiSplitButtonPresetSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `m3-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3Like, "filled-open")

    @Test
    fun `m3-expressive-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3ExpressiveLike, "outlined-medium")

    @Test
    fun `cupertino - the representative fixture matches its baseline`() = verify(TanreiSystem.Cupertino, "filled-icon")

    private fun verify(system: TanreiSystem, representative: String) {
        val fixture = loadSplitButtonFixtures().single { it.id == representative }
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                SplitButtonStage { SplitButtonFixture(fixture) }
            }
        }
        rule.onNodeWithTag(SPLIT_STAGE_TAG).captureRoboImage("$SPLIT_SNAPSHOTS/${system.id}/${fixture.id}.png", roborazziOptions = failureArtifactsIn("split-button/${system.id}"))
    }
}
