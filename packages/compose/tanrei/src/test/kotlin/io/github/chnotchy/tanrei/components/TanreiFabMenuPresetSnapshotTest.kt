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
 * One representative fixture per shipped preset, at `src/test/snapshots/fab-menu/<system-id>/<fixture-id>.png`
 * — apart from the default system's baselines, which belong to [TanreiFabMenuSnapshotTest] and the parity checker. The
 * representative is picked for what the preset changes: `tonal-open` for m3-like (Material's primary set: primary-container
 * items under a primary open toggle, 56 tall pill items with 24 icons and larger labels), `filled-open` for
 * m3-expressive-like (which inherits m3-like's) and `surface-open` for cupertino (capsule toggle and items, body-large
 * labels). Same harness as the default's.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiFabMenuPresetSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `m3-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3Like, "tonal-open")

    @Test
    fun `m3-expressive-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3ExpressiveLike, "filled-open")

    @Test
    fun `cupertino - the representative fixture matches its baseline`() = verify(TanreiSystem.Cupertino, "surface-open")

    private fun verify(system: TanreiSystem, representative: String) {
        val fixture = loadFabMenuFixtures().single { it.id == representative }
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                FabMenuStage(fixture) { FabMenuFixture(fixture) }
            }
        }
        rule.onNodeWithTag(FAB_MENU_STAGE_TAG).captureRoboImage("$FAB_MENU_SNAPSHOTS/${system.id}/${fixture.id}.png", roborazziOptions = failureArtifactsIn("fab-menu/${system.id}"))
    }
}
