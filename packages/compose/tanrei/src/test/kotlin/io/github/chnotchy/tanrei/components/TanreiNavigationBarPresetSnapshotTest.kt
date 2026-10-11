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
 * One representative fixture per shipped preset, at `src/test/snapshots/navigation-bar/<system-id>/<fixture-id>.png`
 * — apart from the default system's baselines, which belong to [TanreiNavigationBarSnapshotTest] and the parity checker. The
 * representative is picked for what the preset changes: `badges` for m3-like (80 high on surface-container with no edge,
 * a 64 wide pill indicator, badges on it), `labels-selected` for m3-expressive-like (which inherits m3-like's bar: only the
 * selected destination's label) and `four-destinations` for cupertino (49 high, no indicator, the selected icon and label
 * in the tint). Same harness as the default's.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiNavigationBarPresetSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `m3-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3Like, "badges")

    @Test
    fun `m3-expressive-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3ExpressiveLike, "labels-selected")

    @Test
    fun `cupertino - the representative fixture matches its baseline`() = verify(TanreiSystem.Cupertino, "four-destinations")

    private fun verify(system: TanreiSystem, representative: String) {
        val fixture = loadNavigationBarFixtures().single { it.id == representative }
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                NavigationStage(NAVIGATION_BAR_STAGE_WIDTH) { NavigationBarFixture(fixture) }
            }
        }
        rule.onNodeWithTag(NAVIGATION_STAGE_TAG).captureRoboImage("$NAVIGATION_BAR_SNAPSHOTS/${system.id}/${fixture.id}.png", roborazziOptions = failureArtifactsIn("navigation-bar/${system.id}"))
    }
}
