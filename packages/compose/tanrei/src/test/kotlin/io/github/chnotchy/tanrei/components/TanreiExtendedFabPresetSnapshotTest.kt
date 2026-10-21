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
 * One representative fixture per shipped preset, at `src/test/snapshots/extended-fab/<system-id>/<fixture-id>.png` —
 * apart from the default system's baselines, which belong to [TanreiExtendedFabSnapshotTest] and the parity checker.
 * The representative is picked per preset, for what that preset changes: `tonal-medium` for m3-like (Material's default
 * extended FAB: primary-container, 56 dp high, 16 dp corner, 12 dp gap) and `filled-medium` for cupertino (a capsule on
 * the tint). Same harness as the default's, light scheme; only `TanreiTheme(system = …)` differs.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiExtendedFabPresetSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `m3-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3Like, "tonal-medium")

    @Test
    fun `cupertino - the representative fixture matches its baseline`() = verify(TanreiSystem.Cupertino, "filled-medium")

    private fun verify(system: TanreiSystem, representative: String) {
        val fixture = loadExtendedFabFixtures().single { it.id == representative }
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                FabStage { ExtendedFabFixture(fixture) }
            }
        }
        rule.onNodeWithTag(FAB_STAGE_TAG).captureRoboImage("$EXTENDED_FAB_SNAPSHOTS/${system.id}/${fixture.id}.png", roborazziOptions = failureArtifactsIn("extended-fab/${system.id}"))
    }
}
