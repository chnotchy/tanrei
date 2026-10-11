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
 * One representative fixture per shipped preset, at `src/test/snapshots/checkbox/<system-id>/<fixture-id>.png`
 * — apart from the default system's baselines, which belong to [TanreiCheckboxSnapshotTest] and the parity checker.
 * The representative is picked for what the preset changes: `unselected` for m3-like (its 18 box in a 40 container,
 * 2 px corner, 2 dp on-surface-variant outline), `selected` for m3-expressive-like (the same geometry with the check)
 * and for cupertino (its own corner, eased by its corner smoothing, and the tint). Same harness as the default's.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiCheckboxPresetSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `m3-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3Like, "unselected")

    @Test
    fun `m3-expressive-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3ExpressiveLike, "selected")

    @Test
    fun `cupertino - the representative fixture matches its baseline`() = verify(TanreiSystem.Cupertino, "selected")

    private fun verify(system: TanreiSystem, representative: String) {
        val fixture = loadCheckboxFixtures().single { it.id == representative }
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                CheckboxStage { CheckboxFixture(fixture) }
            }
        }
        rule.onNodeWithTag(CHECKBOX_STAGE_TAG).captureRoboImage("$CHECKBOX_SNAPSHOTS/${system.id}/${fixture.id}.png", roborazziOptions = failureArtifactsIn("checkbox/${system.id}"))
    }
}
