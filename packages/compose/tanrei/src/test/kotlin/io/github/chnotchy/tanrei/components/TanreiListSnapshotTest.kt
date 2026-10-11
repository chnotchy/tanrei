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
import io.github.chnotchy.tanrei.primitives.TanreiText
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
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
 * One baseline per fixture in `specs/list.spec.json`, at `src/test/snapshots/list/<fixture-id>.png`, read from the spec
 * (LST-16's `verify`): one list 360 wide on the surface, holding the fixture's items in order, light scheme. An icon
 * name is drawn by [NamedFixtureGlyph] (no icon font is bundled); an avatar holds the first letter of its item's
 * headline; an image is empty and shows `media.container.color`.
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiListSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadListFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                ListStage { key(current.id) { ListFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(LIST_STAGE_TAG).captureRoboImage("$LIST_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("list")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One `list-item` of a fixture, mapped to `TanreiListItem` (`platforms.compose.items.list-item`). */
internal class ListItemFixture(
    val headline: String,
    val overline: String,
    val supportingText: String,
    val supportingMaxLines: Int,
    val trailingText: String,
    val leadingIcon: String,
    val trailingIcon: String,
    val leadingMedia: TanreiListLeadingMedia,
    val interactive: Boolean,
    val value: String,
    val enabled: Boolean,
    val divider: Boolean,
)

/** One fixture of `specs/list.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class ListFixture(
    val id: String,
    val selectionMode: TanreiListSelectionMode,
    val label: String,
    val value: String?,
    val values: Set<String>,
    val items: List<ListItemFixture>,
)

internal const val LIST_SPEC = "../../../specs/list.spec.json"
internal const val LIST_SNAPSHOTS = "src/test/snapshots/list"
internal const val LIST_STAGE_TAG = "fixture"

private val LIST_MAPPED_PROPS = setOf("selection", "label", "value", "values")
private val LIST_ITEM_MAPPED_PROPS = setOf(
    "headline", "overline", "supportingText", "supportingMaxLines", "trailingText", "leadingIcon", "trailingIcon",
    "leadingMedia", "interactive", "value", "disabled", "divider",
)

private fun JSONArray.objects(): List<JSONObject> = (0 until length()).map(::getJSONObject)

/** Spec value → closed Compose enum (`none` → `None`); an unknown one fails. */
private inline fun <reified E : Enum<E>> enumOf(value: String): E = enumValues<E>().single { it.name.lowercase() == value }

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadListFixtures(): List<ListFixture> {
    val spec = JSONObject(File(LIST_SPEC).readText())
    val defaults = spec.getJSONArray("props").objects().associate { it.getString("name") to it.get("default") }
    val kind = spec.getJSONArray("items").objects().single { it.getString("name") == "list-item" }
    val itemDefaults = kind.getJSONArray("props").objects().associate { it.getString("name") to it.get("default") }
    return spec.getJSONArray("fixtures").objects().map { fixture ->
        val given = fixture.getJSONObject("props")
        val unknown = given.keys().asSequence().filterNot { it in LIST_MAPPED_PROPS }.toList()
        require(unknown.isEmpty()) { "fixture ${fixture.getString("id")} uses props this test does not map: $unknown" }
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        val items = fixture.getJSONArray("items").objects().map { item ->
            require(item.getString("kind") == "list-item") { "a list holds only list-item items" }
            val props = item.getJSONObject("props")
            val unknownItem = props.keys().asSequence().filterNot { it in LIST_ITEM_MAPPED_PROPS }.toList()
            require(unknownItem.isEmpty()) { "an item of ${fixture.getString("id")} uses props this test does not map: $unknownItem" }
            fun itemProp(name: String): Any = if (props.has(name)) props.get(name) else itemDefaults.getValue(name)
            ListItemFixture(
                headline = itemProp("headline") as String,
                overline = itemProp("overline") as String,
                supportingText = itemProp("supportingText") as String,
                supportingMaxLines = (itemProp("supportingMaxLines") as Number).toInt(),
                trailingText = itemProp("trailingText") as String,
                leadingIcon = itemProp("leadingIcon") as String,
                trailingIcon = itemProp("trailingIcon") as String,
                leadingMedia = enumOf(itemProp("leadingMedia") as String),
                interactive = itemProp("interactive") as Boolean,
                value = itemProp("value") as String,
                enabled = !(itemProp("disabled") as Boolean),
                divider = itemProp("divider") as Boolean,
            )
        }
        ListFixture(
            id = fixture.getString("id"),
            selectionMode = enumOf(prop("selection") as String),
            label = prop("label") as String,
            value = prop("value").takeUnless { it == JSONObject.NULL } as String?,
            values = (prop("values") as JSONArray).let { values -> (0 until values.length()).map(values::getString).toSet() },
            items = items,
        )
    }
}

/** The surface a list fixture is drawn on: 360 wide (LST-16's `verify`), no space around the list. Tagged [LIST_STAGE_TAG]. */
@Composable
internal fun ListStage(content: @Composable () -> Unit) {
    Box(Modifier.testTag(LIST_STAGE_TAG).width(LIST_STAGE_WIDTH).background(TanreiColorRole.Surface.color)) { content() }
}

private val LIST_STAGE_WIDTH = 360.dp

/** The list of one fixture: its props on the list, each item's on that item (`platforms.compose`). */
@Composable
internal fun ListFixture(fixture: ListFixture, onClick: () -> Unit = {}) {
    TanreiList(
        selectionMode = fixture.selectionMode,
        contentDescription = fixture.label,
        selectedValue = fixture.value,
        selectedValues = fixture.values,
    ) {
        for (item in fixture.items) {
            TanreiListItem(
                headline = item.headline,
                value = item.value,
                overline = item.overline,
                supportingText = item.supportingText,
                supportingMaxLines = item.supportingMaxLines,
                trailingText = item.trailingText,
                leadingMedia = item.leadingMedia,
                enabled = item.enabled,
                divider = item.divider,
                onClick = if (item.interactive) onClick else null,
                leadingIcon = item.leadingIcon.takeIf { it.isNotEmpty() }?.let { name -> { NamedFixtureGlyph(name) } },
                trailingIcon = item.trailingIcon.takeIf { it.isNotEmpty() }?.let { name -> { NamedFixtureGlyph(name) } },
                // LST-16's verify: an avatar holds the first letter of the headline; an image is empty.
                leadingContent = if (item.leadingMedia == TanreiListLeadingMedia.Avatar) {
                    { TanreiText(item.headline.take(1)) }
                } else {
                    null
                },
            )
        }
    }
}
