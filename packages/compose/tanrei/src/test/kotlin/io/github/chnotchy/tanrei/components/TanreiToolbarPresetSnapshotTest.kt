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
 * One representative fixture per shipped preset, at `src/test/snapshots/toolbar/<system-id>/<fixture-id>.png`
 * — apart from the default system's baselines, which belong to [TanreiToolbarSnapshotTest] and the parity checker. m3-like
 * and m3-expressive-like take none of the toolbar's own values (they draw the default's toolbar), so their representatives show their ITEMS on it: `docked-button` for m3-like (its icon buttons
 * and its full-round filled Button on the default's docked bar), `floating-filled-action` for m3-expressive-like. Cupertino
 * re-values both variants: `floating` (surface-container-lowest on its own level2 shadow, a selected toggle among them).
 * Same harness as the default's.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w400dp-h640dp-xhdpi")
class TanreiToolbarPresetSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `m3-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3Like, "docked-button")

    @Test
    fun `m3-expressive-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3ExpressiveLike, "floating-filled-action")

    @Test
    fun `cupertino - the representative fixture matches its baseline`() = verify(TanreiSystem.Cupertino, "floating")

    private fun verify(system: TanreiSystem, representative: String) {
        val fixture = loadToolbarFixtures().single { it.id == representative }
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                ToolbarStage(fixture) { ToolbarFixture(fixture) }
            }
        }
        rule.onNodeWithTag(TOOLBAR_STAGE_TAG).captureRoboImage("$TOOLBAR_SNAPSHOTS/${system.id}/${fixture.id}.png", roborazziOptions = failureArtifactsIn("toolbar/${system.id}"))
    }
}
