package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.github.takahirom.roborazzi.captureRoboImage
import io.github.chnotchy.tanrei.primitives.LocalTanreiGlyphStandIn
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonVariant
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * One baseline per fixture in `specs/navigation-rail.spec.json`, at `src/test/snapshots/navigation-rail/<fixture-id>.png`,
 * read from the spec: the rail in a 120 × 400 stage of surface (so its end edge shows), no system insets, light scheme.
 * Header-button items are standard medium `TanreiIconButton`s in the header; each destination a `TanreiNavigationRailItem`
 * marked `selected` when its value is the fixture's `value` (`platforms.compose`). Glyphs by [BarFixtureGlyph].
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiNavigationRailSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadNavigationRailFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                RailStage { key(current.id) { NavigationRailFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(NAVIGATION_STAGE_TAG).captureRoboImage("$NAVIGATION_RAIL_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("navigation-rail")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One fixture of `specs/navigation-rail.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class NavigationRailFixture(
    val id: String,
    val value: String,
    val labelVisibility: TanreiNavigationLabelVisibility,
    val label: String,
    /** The header-button items: label and glyph. */
    val headerButtons: List<Pair<String, String>>,
    val destinations: List<DestinationFixture>,
)

internal const val NAVIGATION_RAIL_SPEC = "../../../specs/navigation-rail.spec.json"
internal const val NAVIGATION_RAIL_SNAPSHOTS = "src/test/snapshots/navigation-rail"

private val NAVIGATION_RAIL_PROPS = setOf("value", "labelVisibility", "label")

private fun JSONArray.objects(): List<JSONObject> = (0 until length()).map(::getJSONObject)

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadNavigationRailFixtures(): List<NavigationRailFixture> {
    val spec = readSpec(NAVIGATION_RAIL_SPEC)
    val defaults = spec.getJSONArray("props").objects().associate { it.getString("name") to it.get("default") }
    val destinationDefaults = kindDefaults(spec, "destination")
    require(defaults.keys == NAVIGATION_RAIL_PROPS && destinationDefaults.keys == DESTINATION_PROPS) { "the spec's props changed: map them here" }
    return spec.getJSONArray("fixtures").objects().map { fixture ->
        val given = fixture.getJSONObject("props")
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        val items = fixture.getJSONArray("items").objects()
        NavigationRailFixture(
            id = fixture.getString("id"),
            value = prop("value") as String,
            labelVisibility = TanreiNavigationLabelVisibility.entries.single { it.name.lowercase() == prop("labelVisibility") },
            label = prop("label") as String,
            // NVR-12: a header-button item goes to the header wherever it stands among the items.
            headerButtons = items.filter { it.getString("kind") == "header-button" }.map { it.getJSONObject("props").getString("label") to it.getString("content") },
            destinations = items.filter { it.getString("kind") == "destination" }.map { destinationFixture(it, destinationDefaults) },
        )
    }
}

/** The 120 × 400 surface a rail fixture is drawn on, with the glyph stand-in. Tagged [NAVIGATION_STAGE_TAG]. */
@Composable
internal fun RailStage(content: @Composable () -> Unit) {
    CompositionLocalProvider(LocalTanreiGlyphStandIn provides { name -> BarFixtureGlyph(name) }) {
        Box(Modifier.testTag(NAVIGATION_STAGE_TAG).size(120.dp, 400.dp).background(TanreiColorRole.Surface.color)) { content() }
    }
}

/** The rail of one fixture: its props on the rail, its header buttons in the header, each destination on its item. */
@Composable
internal fun NavigationRailFixture(fixture: NavigationRailFixture, onClick: (String) -> Unit = {}) {
    TanreiNavigationRail(
        header = if (fixture.headerButtons.isEmpty()) null else {
            {
                for ((label, glyph) in fixture.headerButtons) {
                    TanreiIconButton(onClick = { onClick(label) }, contentDescription = label, variant = TanreiIconButtonVariant.Standard, size = TanreiIconButtonSize.Medium) { BarFixtureGlyph(glyph) }
                }
            }
        },
        labelVisibility = fixture.labelVisibility,
        contentDescription = fixture.label,
        windowInsets = WindowInsets(0, 0, 0, 0),
    ) {
        for (destination in fixture.destinations) {
            TanreiNavigationRailItem(
                selected = destination.value == fixture.value,
                onClick = { onClick(destination.value) },
                icon = destination.icon,
                label = destination.label,
                enabled = destination.enabled,
                badge = destination.badge,
            )
        }
    }
}
