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
 * One representative fixture per shipped preset, at `src/test/snapshots/time-picker/<system-id>/<fixture-id>.png`
 * — apart from the default system's baselines, which belong to [TanreiTimePickerSnapshotTest] and the parity checker. The
 * representative is picked for what the preset changes: `dial-hour` for m3-like (the surface-container-high surface at
 * corner.extra-large, the larger selectors, dial and handle, the primary-container selected selector without an edge, the
 * tertiary-container period) and for cupertino (the surface-container-highest selectors and face, the tinted edge), and
 * `dial-minute` for m3-expressive-like (which inherits m3-like's picker: its minute dial). Same harness as the default's.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w720dp-h720dp-xhdpi")
class TanreiTimePickerPresetSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `m3-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3Like, "dial-hour")

    @Test
    fun `m3-expressive-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3ExpressiveLike, "dial-minute")

    @Test
    fun `cupertino - the representative fixture matches its baseline`() = verify(TanreiSystem.Cupertino, "dial-hour")

    private fun verify(system: TanreiSystem, representative: String) {
        val fixture = loadTimePickerFixtures().single { it.id == representative }
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                TimePickerStage(fixture) { TimePickerFixture(fixture) }
            }
        }
        rule.onNodeWithTag(TIME_PICKER_STAGE_TAG).captureRoboImage("$TIME_PICKER_SNAPSHOTS/${system.id}/${fixture.id}.png", roborazziOptions = failureArtifactsIn("time-picker/${system.id}"))
    }
}
