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
 * One representative fixture per shipped preset, at `src/test/snapshots/bottom-sheet/<system-id>/<fixture-id>.png` —
 * apart from the default system's baselines, which belong to [TanreiBottomSheetSnapshotTest] and the parity checker.
 * The representative is picked for what the preset changes: `modal` for m3-like (the 28 corner, its level1 shadow, an
 * on-surface-variant grip over its own scrim) and `modal-partial` for cupertino (surface-container-lowest, the 10
 * continuous corner, the 36 × 5 grabber in a 16 row over a long text). Same harness as the default's.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w400dp-h800dp-xhdpi")
class TanreiBottomSheetPresetSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `m3-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3Like, "modal")

    @Test
    fun `cupertino - the representative fixture matches its baseline`() = verify(TanreiSystem.Cupertino, "modal-partial")

    private fun verify(system: TanreiSystem, representative: String) {
        val fixture = loadBottomSheetFixtures().single { it.id == representative }
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                BottomSheetStage { BottomSheetFixture(fixture) }
            }
        }
        rule.onNodeWithTag(BOTTOM_SHEET_STAGE_TAG).captureRoboImage("$BOTTOM_SHEET_SNAPSHOTS/${system.id}/${fixture.id}.png", roborazziOptions = failureArtifactsIn("bottom-sheet/${system.id}"))
    }
}
