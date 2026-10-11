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
 * One representative fixture per shipped preset, at `src/test/snapshots/navigation-drawer/<system-id>/<fixture-id>.png`
 * — apart from the default system's baselines, which belong to [TanreiNavigationDrawerSnapshotTest] and the parity checker. The
 * representative is picked for what the preset changes: `standard` for m3-like (360 wide on surface-container-low with no
 * edge, 56 high pill rows, heading-6 headings), `modal` for m3-expressive-like (which inherits m3-like's drawer: level1's
 * shadow and 16 end corners over the scrim) and `standard` for cupertino (the selected row filled with the tint, its
 * content on-primary, unselected icons in the tint). Same harness as the default's.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w400dp-h640dp-xhdpi")
class TanreiNavigationDrawerPresetSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `m3-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3Like, "standard")

    @Test
    fun `m3-expressive-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3ExpressiveLike, "modal")

    @Test
    fun `cupertino - the representative fixture matches its baseline`() = verify(TanreiSystem.Cupertino, "standard")

    private fun verify(system: TanreiSystem, representative: String) {
        val fixture = loadNavigationDrawerFixtures().single { it.id == representative }
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                DrawerStage { NavigationDrawerFixture(fixture) }
            }
        }
        rule.onNodeWithTag(NAVIGATION_STAGE_TAG).captureRoboImage("$NAVIGATION_DRAWER_SNAPSHOTS/${system.id}/${fixture.id}.png", roborazziOptions = failureArtifactsIn("navigation-drawer/${system.id}"))
    }
}
