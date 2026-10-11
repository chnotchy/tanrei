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
 * `src/test/snapshots/progress-indicator/<system-id>/<fixture-id>.png`: `linear-determinate` for m3-like (its gap and
 * stop indicator, on a secondary-container track), `circular-determinate` for m3-expressive-like (its 40dp ring with a
 * 4dp stroke and the gap on a ring) and `linear-determinate` for cupertino. Same harness as the default's, with reduced
 * motion; only the system differs.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiProgressIndicatorPresetSnapshotTest {
    @get:Rule
    val rule = createComposeRule(effectContext = ReducedMotion)

    @Test
    fun `m3-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3Like, "linear-determinate")

    @Test
    fun `m3-expressive-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3ExpressiveLike, "circular-determinate")

    @Test
    fun `cupertino - the representative fixture matches its baseline`() = verify(TanreiSystem.Cupertino, "linear-determinate")

    private fun verify(system: TanreiSystem, representative: String) {
        val fixture = loadProgressFixtures().single { it.id == representative }
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                ProgressStage { ProgressFixture(fixture) }
            }
        }
        rule.onNodeWithTag(PROGRESS_STAGE_TAG).captureRoboImage("$PROGRESS_SNAPSHOTS/${system.id}/${fixture.id}.png", roborazziOptions = failureArtifactsIn("progress-indicator/${system.id}"))
    }
}
