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
 * One representative fixture per shipped preset, at `src/test/snapshots/date-picker/<system-id>/<fixture-id>.png` —
 * apart from the default system's baselines, which belong to [TanreiDatePickerSnapshotTest] and the parity checker. The
 * representative is picked for what the preset changes: `modal-range` for m3-like (round 40 days, the
 * secondary-container band, the surface-container-high surface at corner.extra-large, the heading-1 header value) and
 * for cupertino (round days, the primary-container selected day, today without a ring, the surface-container-highest
 * band). Same harness as the default's.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w480dp-h720dp-xhdpi")
class TanreiDatePickerPresetSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `m3-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3Like, "modal-range")

    @Test
    fun `cupertino - the representative fixture matches its baseline`() = verify(TanreiSystem.Cupertino, "modal-range")

    private fun verify(system: TanreiSystem, representative: String) {
        val fixture = loadDatePickerFixtures().single { it.id == representative }
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                DatePickerStage(fixture) { DatePickerFixture(fixture) }
            }
        }
        rule.onNodeWithTag(DATE_PICKER_STAGE_TAG).captureRoboImage("$DATE_PICKER_SNAPSHOTS/${system.id}/${fixture.id}.png", roborazziOptions = failureArtifactsIn("date-picker/${system.id}"))
    }
}
