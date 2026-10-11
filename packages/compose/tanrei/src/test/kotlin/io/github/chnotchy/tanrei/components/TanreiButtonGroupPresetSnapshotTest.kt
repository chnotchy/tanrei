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
 * One representative fixture per shipped preset, at `src/test/snapshots/button-group/<system-id>/<fixture-id>.png`
 * — apart from the default system's baselines, which belong to [TanreiButtonGroupSnapshotTest] and the parity checker. The
 * representative is picked for what the preset changes: `connected` for m3-like (inner corners of `corner.small`, 8,
 * against its full-round buttons), `connected-icon-buttons` for m3-expressive-like (which inherits m3-like's group: joined
 * tonal toggles, widened to the target) and `connected-large` for cupertino (its buttons' own corners, 10, against the
 * default inner 4). Same harness as the default's.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w480dp-h640dp-xhdpi")
class TanreiButtonGroupPresetSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `m3-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3Like, "connected")

    @Test
    fun `m3-expressive-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3ExpressiveLike, "connected-icon-buttons")

    @Test
    fun `cupertino - the representative fixture matches its baseline`() = verify(TanreiSystem.Cupertino, "connected-large")

    private fun verify(system: TanreiSystem, representative: String) {
        val fixture = loadButtonGroupFixtures().single { it.id == representative }
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                ButtonGroupStage { ButtonGroupFixture(fixture) }
            }
        }
        rule.onNodeWithTag(BUTTON_GROUP_STAGE_TAG).captureRoboImage("$BUTTON_GROUP_SNAPSHOTS/${system.id}/${fixture.id}.png", roborazziOptions = failureArtifactsIn("button-group/${system.id}"))
    }
}
