package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.width
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
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * One baseline per fixture in `specs/navigation-bar.spec.json`, at `src/test/snapshots/navigation-bar/<fixture-id>.png`,
 * read from the spec: the bar 360 wide over the surface, no system insets, light scheme, each destination a
 * `TanreiNavigationBarItem` marked `selected` when its value is the fixture's `value` (`platforms.compose`). Glyph names are
 * drawn by [BarFixtureGlyph] (no icon font is bundled).
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiNavigationBarSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadNavigationBarFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                NavigationStage(NAVIGATION_BAR_STAGE_WIDTH) { key(current.id) { NavigationBarFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(NAVIGATION_STAGE_TAG).captureRoboImage("$NAVIGATION_BAR_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("navigation-bar")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One destination of a bar or rail fixture, mapped to `TanreiNavigationBarItem` / `TanreiNavigationRailItem`. */
internal class DestinationFixture(
    val value: String,
    val label: String,
    val icon: String,
    val enabled: Boolean,
    val badge: TanreiNavigationBadge?,
)

/** One fixture of `specs/navigation-bar.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class NavigationBarFixture(
    val id: String,
    val value: String,
    val labelVisibility: TanreiNavigationLabelVisibility,
    val label: String,
    val destinations: List<DestinationFixture>,
)

internal const val NAVIGATION_BAR_SPEC = "../../../specs/navigation-bar.spec.json"
internal const val NAVIGATION_BAR_SNAPSHOTS = "src/test/snapshots/navigation-bar"
internal const val NAVIGATION_STAGE_TAG = "fixture"
internal val NAVIGATION_BAR_STAGE_WIDTH = 360.dp

private val NAVIGATION_BAR_PROPS = setOf("value", "labelVisibility", "label")
internal val DESTINATION_PROPS = setOf("value", "label", "icon", "disabled", "badge", "badgeCount", "badgeLabel")

private fun JSONArray.objects(): List<JSONObject> = (0 until length()).map(::getJSONObject)

/** The destination [item] of a spec whose destination kind has [defaults], mapped as `platforms.compose.items.destination` says. */
internal fun destinationFixture(item: JSONObject, defaults: Map<String, Any>): DestinationFixture {
    val props = item.getJSONObject("props")
    fun prop(name: String): Any = if (props.has(name)) props.get(name) else defaults.getValue(name)
    val badge = prop("badge") as Boolean
    return DestinationFixture(
        value = prop("value") as String,
        label = prop("label") as String,
        icon = prop("icon") as String,
        enabled = !(prop("disabled") as Boolean),
        badge = if (badge) TanreiNavigationBadge(count = (prop("badgeCount").takeUnless { it == JSONObject.NULL } as Number?)?.toInt(), contentDescription = prop("badgeLabel") as String) else null,
    )
}

/** The item kind [kind]'s props with their defaults. */
internal fun kindDefaults(spec: JSONObject, kind: String): Map<String, Any> =
    spec.getJSONArray("items").objects().single { it.getString("name") == kind }.getJSONArray("props").objects().associate { it.getString("name") to it.get("default") }

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadNavigationBarFixtures(): List<NavigationBarFixture> {
    val spec = readSpec(NAVIGATION_BAR_SPEC)
    val defaults = spec.getJSONArray("props").objects().associate { it.getString("name") to it.get("default") }
    val destinationDefaults = kindDefaults(spec, "destination")
    require(defaults.keys == NAVIGATION_BAR_PROPS && destinationDefaults.keys == DESTINATION_PROPS) { "the spec's props changed: map them here" }
    return spec.getJSONArray("fixtures").objects().map { fixture ->
        val given = fixture.getJSONObject("props")
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        NavigationBarFixture(
            id = fixture.getString("id"),
            value = prop("value") as String,
            labelVisibility = TanreiNavigationLabelVisibility.entries.single { it.name.lowercase() == prop("labelVisibility") },
            label = prop("label") as String,
            destinations = fixture.getJSONArray("items").objects().map { destinationFixture(it, destinationDefaults) },
        )
    }
}

/**
 * The surface a navigation fixture is drawn on, [width] wide, with the bars' glyph stand-in ([BarFixtureGlyph]) for
 * the glyphs they draw by name. Tagged [NAVIGATION_STAGE_TAG].
 */
@Composable
internal fun NavigationStage(width: androidx.compose.ui.unit.Dp, content: @Composable () -> Unit) {
    CompositionLocalProvider(LocalTanreiGlyphStandIn provides { name -> BarFixtureGlyph(name) }) {
        Box(Modifier.testTag(NAVIGATION_STAGE_TAG).width(width).background(TanreiColorRole.Surface.color)) { content() }
    }
}

/** The bar of one fixture: its props on the bar, each destination's on its item, no system insets. */
@Composable
internal fun NavigationBarFixture(fixture: NavigationBarFixture, onClick: (String) -> Unit = {}) {
    TanreiNavigationBar(labelVisibility = fixture.labelVisibility, contentDescription = fixture.label, windowInsets = WindowInsets(0, 0, 0, 0)) {
        for (destination in fixture.destinations) {
            TanreiNavigationBarItem(
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
