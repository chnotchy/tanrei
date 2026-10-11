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
 * One representative fixture per shipped preset, at `src/test/snapshots/snackbar/<system-id>/<fixture-id>.png`
 * — apart from the default system's baselines, which belong to [TanreiSnackbarSnapshotTest] and the parity checker. The
 * representative is picked for what the preset changes: `action-closable` for m3-like (the 4 dp corner, 344 minimum
 * width, the action in inverse-primary), `two-lines` for m3-expressive-like (which inherits m3-like's snackbar: the
 * wrapped message beside its action) and `action-closable` for cupertino (the light banner: surface-bright, on-surface
 * text, the action in the tint, the close glyph in on-surface-variant, the medium corner, continuous). Same harness as
 * the default's.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w480dp-h640dp-xhdpi")
class TanreiSnackbarPresetSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `m3-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3Like, "action-closable")

    @Test
    fun `m3-expressive-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3ExpressiveLike, "two-lines")

    @Test
    fun `cupertino - the representative fixture matches its baseline`() = verify(TanreiSystem.Cupertino, "action-closable")

    private fun verify(system: TanreiSystem, representative: String) {
        val fixture = loadSnackbarFixtures().single { it.id == representative }
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                SnackbarStage { SnackbarFixture(fixture) }
            }
        }
        rule.onNodeWithTag(SNACKBAR_STAGE_TAG).captureRoboImage("$SNACKBAR_SNAPSHOTS/${system.id}/${fixture.id}.png", roborazziOptions = failureArtifactsIn("snackbar/${system.id}"))
    }
}
