package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
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
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiTabsVariant
import java.io.File
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * One baseline per fixture in `specs/tabs.spec.json`, at `src/test/snapshots/tabs/<fixture-id>.png`, read from the spec
 * (TAB-14's `verify`): one row of tabs 360 wide on the surface and no panel, holding the fixture's tabs in order, light
 * scheme. An icon name is drawn by [NamedFixtureGlyph] (no icon font is bundled).
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiTabsSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadTabsFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                TabsStage { key(current.id) { TabsFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(TABS_STAGE_TAG).captureRoboImage("$TABS_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("tabs")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One `tab` of a fixture, mapped to `TanreiTab` (`platforms.compose.items.tab`). */
internal class TabFixture(val value: String, val label: String, val icon: String, val labelHidden: Boolean, val enabled: Boolean)

/** One fixture of `specs/tabs.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class TabsFixture(
    val id: String,
    val variant: TanreiTabsVariant,
    val scrollable: Boolean,
    val selectedValue: String?,
    val label: String,
    val tabs: List<TabFixture>,
)

internal const val TABS_SPEC = "../../../specs/tabs.spec.json"
internal const val TABS_SNAPSHOTS = "src/test/snapshots/tabs"
internal const val TABS_STAGE_TAG = "fixture"

private val TABS_MAPPED_PROPS = setOf("variant", "scrollable", "selected", "label")
private val TAB_MAPPED_PROPS = setOf("value", "label", "icon", "labelHidden", "disabled")

private fun JSONArray.objects(): List<JSONObject> = (0 until length()).map(::getJSONObject)

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadTabsFixtures(): List<TabsFixture> {
    val spec = JSONObject(File(TABS_SPEC).readText())
    val defaults = spec.getJSONArray("props").objects().associate { it.getString("name") to it.get("default") }
    val kind = spec.getJSONArray("items").objects().single { it.getString("name") == "tab" }
    val tabDefaults = kind.getJSONArray("props").objects().associate { it.getString("name") to it.get("default") }
    require(defaults.keys == TABS_MAPPED_PROPS && tabDefaults.keys == TAB_MAPPED_PROPS) { "the spec's props changed: map them here" }
    return spec.getJSONArray("fixtures").objects().map { fixture ->
        val given = fixture.getJSONObject("props")
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        TabsFixture(
            id = fixture.getString("id"),
            variant = TanreiTabsVariant(prop("variant") as String),
            scrollable = prop("scrollable") as Boolean,
            selectedValue = prop("selected").takeUnless { it == JSONObject.NULL } as String?,
            label = prop("label") as String,
            tabs = fixture.getJSONArray("items").objects().map { item ->
                require(item.getString("kind") == "tab") { "tabs hold only tab items" }
                val props = item.getJSONObject("props")
                fun itemProp(name: String): Any = if (props.has(name)) props.get(name) else tabDefaults.getValue(name)
                TabFixture(
                    value = itemProp("value") as String,
                    label = itemProp("label") as String,
                    icon = itemProp("icon") as String,
                    labelHidden = itemProp("labelHidden") as Boolean,
                    enabled = !(itemProp("disabled") as Boolean),
                )
            },
        )
    }
}

/** The surface a tabs fixture is drawn on: 360 wide (TAB-14's `verify`), no space around the row. Tagged [TABS_STAGE_TAG]. */
@Composable
internal fun TabsStage(content: @Composable () -> Unit) {
    Box(Modifier.testTag(TABS_STAGE_TAG).width(TABS_STAGE_WIDTH).background(TanreiColorRole.Surface.color)) { content() }
}

private val TABS_STAGE_WIDTH = 360.dp

/** The row of one fixture: its props on the row, each tab's on that tab (`platforms.compose`). */
@Composable
internal fun TabsFixture(fixture: TabsFixture, onSelectedValueChange: (String) -> Unit = {}) {
    TanreiTabs(
        selectedValue = fixture.selectedValue,
        onSelectedValueChange = onSelectedValueChange,
        variant = fixture.variant,
        scrollable = fixture.scrollable,
        contentDescription = fixture.label,
    ) {
        for (tab in fixture.tabs) {
            TanreiTab(
                value = tab.value,
                label = tab.label,
                labelHidden = tab.labelHidden,
                enabled = tab.enabled,
                icon = tab.icon.takeIf { it.isNotEmpty() }?.let { name -> { NamedFixtureGlyph(name) } },
            )
        }
    }
}
