package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
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
import io.github.chnotchy.tanrei.tokens.TanreiNavigationDrawerVariant
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * One baseline per fixture in `specs/navigation-drawer.spec.json`, at `src/test/snapshots/navigation-drawer/<fixture-id>.png`,
 * read from the spec: a 400 × 560 stage of surface, light scheme, no system insets. A standard fixture is the
 * `TanreiNavigationDrawer` open beside an empty content area; a modal one is drawn in place, fully shown — its scrim over
 * the stage and its sheet at the start edge (the test-only `TanreiModalDrawerInPlace`, as the dialog's baselines are).
 * Items map to `TanreiNavigationDrawerItem` and `TanreiNavigationDrawerSection` (`platforms.compose.items`), each
 * destination marked `selected` when its value is the fixture's `value`. Glyphs by [BarFixtureGlyph].
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w400dp-h640dp-xhdpi")
class TanreiNavigationDrawerSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadNavigationDrawerFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                DrawerStage { key(current.id) { NavigationDrawerFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(NAVIGATION_STAGE_TAG).captureRoboImage("$NAVIGATION_DRAWER_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("navigation-drawer")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One item of a drawer fixture: a destination, or a section holding destinations. */
internal sealed class DrawerItemFixture {
    class Destination(val value: String, val label: String, val icon: String?, val badge: String, val enabled: Boolean) : DrawerItemFixture()

    class Section(val heading: String, val divider: Boolean, val items: List<DrawerItemFixture>) : DrawerItemFixture()
}

/** One fixture of `specs/navigation-drawer.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class NavigationDrawerFixture(
    val id: String,
    val variant: TanreiNavigationDrawerVariant,
    val open: Boolean,
    val value: String,
    val label: String,
    val items: List<DrawerItemFixture>,
)

internal const val NAVIGATION_DRAWER_SPEC = "../../../specs/navigation-drawer.spec.json"
internal const val NAVIGATION_DRAWER_SNAPSHOTS = "src/test/snapshots/navigation-drawer"

private val DRAWER_PROPS = setOf("variant", "open", "value", "label")
private val DRAWER_DESTINATION_PROPS = setOf("value", "label", "icon", "disabled", "badge")
private val DRAWER_SECTION_PROPS = setOf("heading", "divider")

private fun JSONArray.objects(): List<JSONObject> = (0 until length()).map(::getJSONObject)

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadNavigationDrawerFixtures(): List<NavigationDrawerFixture> {
    val spec = readSpec(NAVIGATION_DRAWER_SPEC)
    val defaults = spec.getJSONArray("props").objects().associate { it.getString("name") to it.get("default") }
    val destination = kindDefaults(spec, "destination")
    val section = kindDefaults(spec, "section")
    require(defaults.keys == DRAWER_PROPS && destination.keys == DRAWER_DESTINATION_PROPS && section.keys == DRAWER_SECTION_PROPS) { "the spec's props changed: map them here" }
    fun item(json: JSONObject): DrawerItemFixture {
        val props = json.optJSONObject("props") ?: JSONObject()
        return when (json.getString("kind")) {
            "destination" -> {
                fun prop(name: String): Any = if (props.has(name)) props.get(name) else destination.getValue(name)
                DrawerItemFixture.Destination(
                    value = prop("value") as String,
                    label = prop("label") as String,
                    icon = (prop("icon") as String).takeIf { it.isNotEmpty() },
                    badge = prop("badge") as String,
                    enabled = !(prop("disabled") as Boolean),
                )
            }
            "section" -> {
                fun prop(name: String): Any = if (props.has(name)) props.get(name) else section.getValue(name)
                DrawerItemFixture.Section(prop("heading") as String, prop("divider") as Boolean, json.optJSONArray("items")?.objects().orEmpty().map(::item))
            }
            else -> error("unknown kind ${json.getString("kind")}")
        }
    }
    return spec.getJSONArray("fixtures").objects().map { fixture ->
        val given = fixture.getJSONObject("props")
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        NavigationDrawerFixture(
            id = fixture.getString("id"),
            variant = TanreiNavigationDrawerVariant(prop("variant") as String),
            open = prop("open") as Boolean,
            value = prop("value") as String,
            label = prop("label") as String,
            items = fixture.getJSONArray("items").objects().map(::item),
        )
    }
}

/** The 400 × 560 surface a drawer fixture is drawn on, with the glyph stand-in. Tagged [NAVIGATION_STAGE_TAG]. */
@Composable
internal fun DrawerStage(content: @Composable () -> Unit) {
    CompositionLocalProvider(LocalTanreiGlyphStandIn provides { name -> BarFixtureGlyph(name) }) {
        Box(Modifier.testTag(NAVIGATION_STAGE_TAG).size(400.dp, 560.dp).background(TanreiColorRole.Surface.color)) { content() }
    }
}

/** The drawer of one fixture: standard beside an empty content area, modal in place over the stage. */
@Composable
internal fun NavigationDrawerFixture(fixture: NavigationDrawerFixture, onClick: (String) -> Unit = {}) {
    val items: @Composable ColumnScope.() -> Unit = { for (item in fixture.items) DrawerFixtureItem(item, fixture.value, onClick) }
    if (fixture.variant == TanreiNavigationDrawerVariant.Modal) {
        if (fixture.open) TanreiModalDrawerInPlace(drawerContent = items, contentDescription = fixture.label, variant = fixture.variant)
        return
    }
    TanreiNavigationDrawer(
        drawerContent = items,
        variant = fixture.variant,
        drawerState = rememberTanreiDrawerState(if (fixture.open) TanreiDrawerValue.Open else TanreiDrawerValue.Closed),
        contentDescription = fixture.label,
        windowInsets = WindowInsets(0, 0, 0, 0),
    ) {
        Box(Modifier.fillMaxSize())
    }
}

@Composable
private fun DrawerFixtureItem(item: DrawerItemFixture, value: String, onClick: (String) -> Unit) {
    when (item) {
        is DrawerItemFixture.Destination -> TanreiNavigationDrawerItem(
            selected = item.value == value,
            onClick = { onClick(item.value) },
            label = item.label,
            icon = item.icon,
            badge = item.badge,
            enabled = item.enabled,
        )
        is DrawerItemFixture.Section -> TanreiNavigationDrawerSection(heading = item.heading, divider = item.divider) {
            for (inner in item.items) DrawerFixtureItem(inner, value, onClick)
        }
    }
}
