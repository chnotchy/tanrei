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
 * One representative fixture per shipped preset, at `src/test/snapshots/menu/<system-id>/<fixture-id>.png` — apart
 * from the default system's baselines, which belong to [TanreiMenuSnapshotTest] and the parity checker. The
 * representative is picked for what the preset changes: `icons-shortcut` for m3-like (surface-container at the 4 dp
 * corner, rows edge to edge at 48, 24 icons) and `group-titles` for cupertino (the 8 band of surface-container-high
 * between groups with no space around it, Apple's Body labels, the tinted check, the extra-large corner). Same harness
 * as the default's.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiMenuPresetSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `m3-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3Like, "icons-shortcut")

    @Test
    fun `cupertino - the representative fixture matches its baseline`() = verify(TanreiSystem.Cupertino, "group-titles")

    private fun verify(system: TanreiSystem, representative: String) {
        val fixture = loadMenuFixtures().single { it.id == representative }
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                MenuStage { MenuFixture(fixture) }
            }
        }
        rule.onNodeWithTag(MENU_STAGE_TAG).captureRoboImage("$MENU_SNAPSHOTS/${system.id}/${fixture.id}.png", roborazziOptions = failureArtifactsIn("menu/${system.id}"))
    }
}
