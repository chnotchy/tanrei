package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.github.takahirom.roborazzi.captureRoboImage
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.Cupertino
import io.github.chnotchy.tanrei.tokens.M3Like
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * One representative fixture per shipped preset, at `src/test/snapshots/icon-button/<system-id>/<fixture-id>.png` —
 * apart from the default system's baselines, which belong to [TanreiIconButtonSnapshotTest] and the parity checker. The
 * representative is picked per preset, for what that preset changes: `filled-selected` (a toggle that is on — the
 * preset's size, corner shape, container and the selected, filled glyph at once) for m3-like, and `standard-unselected`
 * for cupertino, whose off toggle draws on-surface-variant where its on toggle draws the tint. Same harness as the
 * default's, light scheme; only `TanreiTheme(system = …)` differs.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiIconButtonPresetSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `m3-like - the representative fixture matches its baseline`() = verify(TanreiSystem.M3Like, "filled-selected")

    @Test
    fun `cupertino - the representative fixture, an off toggle, matches its baseline`() = verify(TanreiSystem.Cupertino, "standard-unselected")

    private fun verify(system: TanreiSystem, representative: String) {
        val fixture = loadIconButtonFixtures().single { it.id == representative }
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Box(Modifier.testTag(TAG).background(TanreiColorRole.Surface.color).padding(TanreiTheme.tokens.space.space200)) {
                    IconButtonFixture(fixture)
                }
            }
        }
        rule.onNodeWithTag(TAG).captureRoboImage("$ICON_BUTTON_SNAPSHOTS/${system.id}/${fixture.id}.png", roborazziOptions = failureArtifactsIn("icon-button/${system.id}"))
    }

    private companion object {
        const val TAG = "fixture"
    }
}
