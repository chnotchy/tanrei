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
 * One representative fixture per shipped preset, at `src/test/snapshots/search/<system-id>/<fixture-id>.png` — apart
 * from the default system's baselines, which belong to [TanreiSearchSnapshotTest] and the parity checker. m3-like takes
 * none of the search's own values (it draws the default's search in its own colors): `docked` for m3-like (the bar, its
 * clear button and the open view with its rows). Cupertino re-values the bar (UISearchBar): `bar-value` — a 36 high
 * field at its medium corner with its clear button. Same harness as the default's.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w400dp-h640dp-xhdpi")
class TanreiSearchPresetSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `m3-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3Like, "docked")

    @Test
    fun `cupertino - the representative fixture matches its baseline`() = verify(TanreiSystem.Cupertino, "bar-value")

    private fun verify(system: TanreiSystem, representative: String) {
        val fixture = loadSearchFixtures().single { it.id == representative }
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                SearchStage(fixture) { SearchFixture(fixture) }
            }
        }
        rule.onNodeWithTag(SEARCH_STAGE_TAG).captureRoboImage("$SEARCH_SNAPSHOTS/${system.id}/${fixture.id}.png", roborazziOptions = failureArtifactsIn("search/${system.id}"))
    }
}
