package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
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
import io.github.chnotchy.tanrei.tokens.TanreiFabMenuSize
import io.github.chnotchy.tanrei.tokens.TanreiFabMenuVariant
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * One baseline per fixture in `specs/fab-menu.spec.json`, at `src/test/snapshots/fab-menu/<fixture-id>.png`, read from the
 * spec (FBM-13's `verify`): the toggle's drawn square at the inline-end bottom corner of a 320 × 320 stage on the surface,
 * 16 from both edges, light scheme; an open fixture draws its items in place above it with their elevation and without
 * open motion (the test-only `TanreiFabMenuInPlace`, as the menu's). The toggle's `icon` slot and the items' icon names
 * are drawn by [NamedFixtureGlyph] (no icon font is bundled); the open toggle's close glyph is the component's own vector.
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiFabMenuSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadFabMenuFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                FabMenuStage(current) { key(current.id) { FabMenuFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(FAB_MENU_STAGE_TAG).captureRoboImage("$FAB_MENU_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("fab-menu")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One `item` of a fixture, mapped to `TanreiFabMenuItem` (`platforms.compose.items.item`). */
internal class FabMenuItemFixture(val text: String, val icon: String)

/** One fixture of `specs/fab-menu.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class FabMenuFixture(
    val id: String,
    val variant: TanreiFabMenuVariant,
    val size: TanreiFabMenuSize,
    val expanded: Boolean,
    val contentDescription: String,
    val enabled: Boolean,
    val icon: FixtureSlot?,
    val items: List<FabMenuItemFixture>,
)

internal const val FAB_MENU_SPEC = "../../../specs/fab-menu.spec.json"
internal const val FAB_MENU_SNAPSHOTS = "src/test/snapshots/fab-menu"
internal const val FAB_MENU_STAGE_TAG = "fixture"

private val FAB_MENU_MAPPED_PROPS = setOf("variant", "size", "open", "label", "disabled")
private val FAB_MENU_ITEM_PROPS = setOf("label", "icon")

private fun JSONArray.objects(): List<JSONObject> = (0 until length()).map(::getJSONObject)

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadFabMenuFixtures(): List<FabMenuFixture> {
    val spec = readSpec(FAB_MENU_SPEC)
    val defaults = spec.getJSONArray("props").objects().associate { it.getString("name") to it.get("default") }
    val kind = spec.getJSONArray("items").objects().single { it.getString("name") == "item" }
    val itemDefaults = kind.getJSONArray("props").objects().associate { it.getString("name") to it.get("default") }
    require(defaults.keys == FAB_MENU_MAPPED_PROPS && itemDefaults.keys == FAB_MENU_ITEM_PROPS) { "the spec's props changed: map them here" }
    return spec.getJSONArray("fixtures").objects().map { fixture ->
        val given = fixture.getJSONObject("props")
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        FabMenuFixture(
            id = fixture.getString("id"),
            variant = TanreiFabMenuVariant(prop("variant") as String),
            size = TanreiFabMenuSize(prop("size") as String),
            expanded = prop("open") as Boolean,
            contentDescription = prop("label") as String,
            enabled = !(prop("disabled") as Boolean),
            icon = fixtureSlots(spec, fixture)["icon"],
            items = fixture.getJSONArray("items").objects().map { item ->
                require(item.getString("kind") == "item") { "a FAB menu holds only item items" }
                val props = item.getJSONObject("props")
                fun itemProp(name: String): Any = if (props.has(name)) props.get(name) else itemDefaults.getValue(name)
                FabMenuItemFixture(text = itemProp("label") as String, icon = itemProp("icon") as String)
            },
        )
    }
}

/**
 * The 320 × 320 surface (FBM-13's `verify`): the toggle's drawn square 16 from the stage's end and bottom edges. The
 * toggle's layout holds the touch target around a smaller square, so the padding is 16 less that inset.
 */
@Composable
internal fun FabMenuStage(fixture: FabMenuFixture, content: @Composable () -> Unit) {
    val system = TanreiTheme.tokens
    val square = system.fabMenu.sizes[fixture.size].containerSize
    val inset = ((system.measure.targetTouch - square) / 2).coerceAtLeast(0.dp)
    Box(
        Modifier.testTag(FAB_MENU_STAGE_TAG).size(FAB_MENU_STAGE_SIDE).background(TanreiColorRole.Surface.color).padding(FAB_MENU_EDGE - inset),
        contentAlignment = Alignment.BottomEnd,
    ) {
        CompositionLocalProvider(LocalTanreiGlyphStandIn provides { name -> NamedFixtureGlyph(name) }) { content() }
    }
}

private val FAB_MENU_STAGE_SIDE = 320.dp
private val FAB_MENU_EDGE = 16.dp

/** The FAB menu of one fixture, drawn in place (`platforms.compose`, FBM-13's `verify`). */
@Composable
internal fun FabMenuFixture(fixture: FabMenuFixture) {
    TanreiFabMenuInPlace(
        expanded = fixture.expanded,
        contentDescription = fixture.contentDescription,
        icon = fixtureSlotContent(fixture.icon) ?: {},
        variant = fixture.variant,
        size = fixture.size,
        enabled = fixture.enabled,
    ) {
        for (item in fixture.items) TanreiFabMenuItem(text = item.text, onClick = {}, icon = item.icon)
    }
}
