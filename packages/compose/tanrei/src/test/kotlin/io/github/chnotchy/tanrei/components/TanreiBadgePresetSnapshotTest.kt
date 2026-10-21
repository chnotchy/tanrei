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
 * One representative fixture per shipped preset, at `src/test/snapshots/badge/<system-id>/<fixture-id>.png`.
 * `count-single` for m3-like (the error pill without an outline, caption type) and `count-double` for cupertino (its
 * 18-high pill with wider padding). Same harness as the default's; only the system differs.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiBadgePresetSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `m3-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3Like, "count-single")

    @Test
    fun `cupertino - the representative fixture matches its baseline`() = verify(TanreiSystem.Cupertino, "count-double")

    private fun verify(system: TanreiSystem, representative: String) {
        val fixture = loadBadgeFixtures().single { it.id == representative }
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                BadgeStage { BadgeFixture(fixture) }
            }
        }
        rule.onNodeWithTag(BADGE_STAGE_TAG).captureRoboImage("$BADGE_SNAPSHOTS/${system.id}/${fixture.id}.png", roborazziOptions = failureArtifactsIn("badge/${system.id}"))
    }
}
