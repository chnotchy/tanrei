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
 * One representative fixture per shipped preset, at `src/test/snapshots/fab/<system-id>/<fixture-id>.png` — apart
 * from the default system's baselines, which belong to [TanreiFabSnapshotTest] and the parity checker. The
 * representative is picked per preset, for what that preset changes: `filled-large` for m3-like (Material's 96 dp
 * square, 28 dp corner and 36 dp icon) and `filled-medium` for cupertino (a circle on the tint, no hover lift). Same
 * harness as the default's, light scheme; only `TanreiTheme(system = …)` differs.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiFabPresetSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `m3-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3Like, "filled-large")

    @Test
    fun `cupertino - the representative fixture matches its baseline`() = verify(TanreiSystem.Cupertino, "filled-medium")

    private fun verify(system: TanreiSystem, representative: String) {
        val fixture = loadFabFixtures().single { it.id == representative }
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                FabStage { FabFixture(fixture) }
            }
        }
        rule.onNodeWithTag(FAB_STAGE_TAG).captureRoboImage("$FAB_SNAPSHOTS/${system.id}/${fixture.id}.png", roborazziOptions = failureArtifactsIn("fab/${system.id}"))
    }
}
