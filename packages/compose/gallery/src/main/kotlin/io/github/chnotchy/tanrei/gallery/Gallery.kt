package io.github.chnotchy.tanrei.gallery

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import io.github.chnotchy.tanrei.components.TanreiButton
import io.github.chnotchy.tanrei.primitives.TanreiText
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.Cupertino
import io.github.chnotchy.tanrei.tokens.M3ExpressiveLike
import io.github.chnotchy.tanrei.tokens.M3Like
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiSystem

/** Every design system the library ships. */
val ShippedSystems: List<TanreiSystem> = listOf(TanreiSystem.Tanrei, TanreiSystem.M3Like, TanreiSystem.M3ExpressiveLike, TanreiSystem.Cupertino)

/** The test tag of one fixture under one system: `<component>/<system id>/<fixture id>` — unique across components. */
fun fixtureTag(system: TanreiSystem, fixture: GalleryFixture): String = "${fixture.component}/${system.id}/${fixture.id}"

const val ThemeSwitchTag: String = "switch/theme"
const val ContrastSwitchTag: String = "switch/contrast"

/**
 * Every fixture of every spec in [specs] that has an entry in [components], under every system in [systems] — each
 * system drawn by its own `TanreiTheme` — with one theme switch and one contrast switch for all of them. The switches
 * are Tanrei buttons too (there is no switch component yet): each press moves to the next value. A spec without an
 * entry is named, not drawn; an entry that does not map every prop of its spec stops the gallery.
 */
@Composable
fun Gallery(
    specs: List<GallerySpec>,
    systems: List<TanreiSystem> = ShippedSystems,
    components: Map<String, GalleryComponent> = GalleryComponents,
    onFixtureClick: (TanreiSystem, GalleryFixture) -> Unit = { _, _ -> },
) {
    for (spec in specs) {
        val component = components[spec.name] ?: continue
        require(component.props == spec.props) {
            "the gallery entry for '${spec.name}' maps ${component.props}, its spec declares ${spec.props}"
        }
    }
    var theme by rememberSaveable { mutableStateOf(TanreiThemeMode.System) }
    var contrast by rememberSaveable { mutableStateOf(TanreiContrast.Standard) }

    // The page itself wears the default system; every section below wears its own.
    TanreiTheme(theme = theme, contrast = contrast) {
        val space = TanreiTheme.tokens.space
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(TanreiColorRole.Surface.color)
                .safeDrawingPadding()
                .verticalScroll(rememberScrollState())
                .padding(space.space200),
            verticalArrangement = Arrangement.spacedBy(space.space300),
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(space.space100), verticalAlignment = Alignment.CenterVertically) {
                TanreiButton(
                    text = "Theme: ${theme.name}",
                    onClick = { theme = TanreiThemeMode.entries[(theme.ordinal + 1) % TanreiThemeMode.entries.size] },
                    modifier = Modifier.testTag(ThemeSwitchTag),
                    variant = TanreiButtonVariant.Tonal,
                    size = TanreiButtonSize.Small,
                )
                TanreiButton(
                    text = "Contrast: ${contrast.name}",
                    onClick = { contrast = TanreiContrast.entries[(contrast.ordinal + 1) % TanreiContrast.entries.size] },
                    modifier = Modifier.testTag(ContrastSwitchTag),
                    variant = TanreiButtonVariant.Tonal,
                    size = TanreiButtonSize.Small,
                )
            }
            for (system in systems) {
                TanreiTheme(system = system, theme = theme, contrast = contrast) {
                    SystemSection(system, specs, components, onFixtureClick)
                }
            }
        }
    }
}

@Composable
private fun SystemSection(
    system: TanreiSystem,
    specs: List<GallerySpec>,
    components: Map<String, GalleryComponent>,
    onFixtureClick: (TanreiSystem, GalleryFixture) -> Unit,
) {
    val tokens = TanreiTheme.tokens
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(TanreiColorRole.Surface.color)
            .padding(vertical = tokens.space.space100),
        verticalArrangement = Arrangement.spacedBy(tokens.space.space100),
    ) {
        TanreiText(system.id, style = tokens.typescale.heading5.toTextStyle())
        TanreiText(
            with(system.behavior) { "press: ${pressedFeedback.name} · corner smoothing: ${system.shape.cornerSmoothing} · focus: ${focusStyle.name}" },
            color = TanreiColorRole.OnSurfaceVariant.color,
            style = tokens.typescale.bodySmall.toTextStyle(),
        )
        for (spec in specs) {
            val component = components[spec.name]
            TanreiText(spec.title, style = tokens.typescale.heading6.toTextStyle())
            if (component == null) {
                TanreiText("not in the Compose gallery yet", color = TanreiColorRole.OnSurfaceVariant.color, style = tokens.typescale.bodySmall.toTextStyle())
                continue
            }
            for (fixture in spec.fixtures) {
                Row(horizontalArrangement = Arrangement.spacedBy(tokens.space.space200), verticalAlignment = Alignment.CenterVertically) {
                    GalleryFixtureScope(
                        fixture = fixture,
                        modifier = Modifier.testTag(fixtureTag(system, fixture)),
                        onClick = { onFixtureClick(system, fixture) },
                    ).let { scope -> component.render(scope) }
                    TanreiText(fixture.id, color = TanreiColorRole.OnSurfaceVariant.color, style = tokens.typescale.bodySmall.toTextStyle())
                }
            }
        }
    }
}
