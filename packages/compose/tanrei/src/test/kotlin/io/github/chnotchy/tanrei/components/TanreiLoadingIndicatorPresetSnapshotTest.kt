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
 * One representative fixture per shipped preset, at
 * `src/test/snapshots/loading-indicator/<system-id>/<fixture-id>.png`: `medium` for m3-like (its 40dp mark in primary,
 * stroke 4) and cupertino (its 20dp gray mark), `contained-medium` for m3-expressive-like (its 38dp mark on a flat
 * primary-container circle of 48). Same harness as the default's, with reduced motion; only the system differs.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiLoadingIndicatorPresetSnapshotTest {
    @get:Rule
    val rule = createComposeRule(effectContext = ReducedMotion)

    @Test
    fun `m3-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3Like, "medium")

    @Test
    fun `m3-expressive-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3ExpressiveLike, "contained-medium")

    @Test
    fun `cupertino - the representative fixture matches its baseline`() = verify(TanreiSystem.Cupertino, "medium")

    private fun verify(system: TanreiSystem, representative: String) {
        val fixture = loadLoadingFixtures().single { it.id == representative }
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                LoadingStage { LoadingFixture(fixture) }
            }
        }
        rule.onNodeWithTag(LOADING_STAGE_TAG).captureRoboImage("$LOADING_SNAPSHOTS/${system.id}/${fixture.id}.png", roborazziOptions = failureArtifactsIn("loading-indicator/${system.id}"))
    }
}
