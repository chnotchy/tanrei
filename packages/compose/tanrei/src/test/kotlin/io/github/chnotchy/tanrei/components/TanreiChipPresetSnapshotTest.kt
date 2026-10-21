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
 * One representative fixture per shipped preset, at `src/test/snapshots/chip/<system-id>/<fixture-id>.png` — apart
 * from the default system's baselines, which belong to [TanreiChipSnapshotTest] and the parity checker. The
 * representative is picked per preset, for what that preset changes: `action-outlined` for m3-like (the outline-variant
 * edge, the primary 18 dp icon, 16 dp padding, 8 dp corner) and `filter-selected` for cupertino (a capsule on the tint
 * with an on-primary check). Same harness as the default's, light scheme; only `TanreiTheme(system = …)` differs.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiChipPresetSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `m3-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3Like, "action-outlined")

    @Test
    fun `cupertino - the representative fixture matches its baseline`() = verify(TanreiSystem.Cupertino, "filter-selected")

    private fun verify(system: TanreiSystem, representative: String) {
        val fixture = loadChipFixtures().single { it.id == representative }
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                ChipStage { ChipFixture(fixture) }
            }
        }
        rule.onNodeWithTag(CHIP_STAGE_TAG).captureRoboImage("$CHIP_SNAPSHOTS/${system.id}/${fixture.id}.png", roborazziOptions = failureArtifactsIn("chip/${system.id}"))
    }
}
