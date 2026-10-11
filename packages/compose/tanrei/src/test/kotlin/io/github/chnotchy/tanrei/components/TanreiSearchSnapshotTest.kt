package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
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
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonVariant
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
 * One baseline per fixture in `specs/search.spec.json`, at `src/test/snapshots/search/<fixture-id>.png`, read from the
 * spec, on the stages its `verify` sentences give (light scheme, on the page's surface): a bar 328 wide centred in a
 * 360 × 72 stage (SRC-1); the docked fixture's bar 328 wide 16 from the top and sides of a 360 × 320 stage with its open
 * view in place under it (SRC-7); the full-screen fixture's open view in place in a 360 × 480 stage that stands for the
 * window (SRC-9). Views are drawn in place (`LocalTanreiSearchInPlace`); an app gets a popup and a dialog window. Slots
 * are filled by their fixture kind (standard medium icon buttons labelled by their glyph's name); glyphs by name draw the test
 * stand-ins ([ToolbarFixtureGlyph]).
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w400dp-h640dp-xhdpi")
class TanreiSearchSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadSearchFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                key(current.id) { SearchStage(current) { SearchFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(SEARCH_STAGE_TAG).captureRoboImage("$SEARCH_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("search")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One suggestion of a search fixture. */
internal class SearchSuggestionFixture(val value: String, val headline: String, val supportingText: String, val leadingIcon: String)

/** One fixture of `specs/search.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class SearchFixture(
    val id: String,
    val presentation: TanreiSearchPresentation,
    val value: String,
    val label: String,
    val placeholder: String,
    val expanded: Boolean,
    val enabled: Boolean,
    val clearLabel: String,
    val backLabel: String,
    val leading: List<String>,
    val trailing: List<String>,
    val suggestions: List<SearchSuggestionFixture>,
)

internal const val SEARCH_SPEC = "../../../specs/search.spec.json"
internal const val SEARCH_SNAPSHOTS = "src/test/snapshots/search"
internal const val SEARCH_STAGE_TAG = "fixture"

private val SEARCH_MAPPED_PROPS = setOf("presentation", "value", "label", "placeholder", "expanded", "disabled", "clearLabel", "backLabel")
private val SUGGESTION_PROPS = setOf("value", "headline", "supportingText", "leadingIcon")

private fun JSONArray.objects(): List<JSONObject> = (0 until length()).map(::getJSONObject)

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadSearchFixtures(): List<SearchFixture> {
    val spec = JSONObject(File(SEARCH_SPEC).readText())
    val defaults = spec.getJSONArray("props").objects().associate { it.getString("name") to it.get("default") }
    val suggestionDefaults = spec.getJSONArray("items").objects().single { it.getString("name") == "suggestion" }.getJSONArray("props").objects().associate { it.getString("name") to it.get("default") }
    require(defaults.keys == SEARCH_MAPPED_PROPS) { "the spec's props changed: map them here" }
    require(suggestionDefaults.keys == SUGGESTION_PROPS) { "the suggestion's props changed: map them here" }
    return spec.getJSONArray("fixtures").objects().map { fixture ->
        val given = fixture.getJSONObject("props")
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        val slots = fixtureSlots(spec, fixture)
        SearchFixture(
            id = fixture.getString("id"),
            presentation = if (prop("presentation") == "full-screen") TanreiSearchPresentation.FullScreen else TanreiSearchPresentation.entries.single { it.name.lowercase() == prop("presentation") },
            value = prop("value") as String,
            label = prop("label") as String,
            placeholder = prop("placeholder") as String,
            expanded = prop("expanded") as Boolean,
            enabled = !(prop("disabled") as Boolean),
            clearLabel = prop("clearLabel") as String,
            backLabel = prop("backLabel") as String,
            leading = slots["leading"]?.values.orEmpty(),
            trailing = slots["trailing"]?.values.orEmpty(),
            suggestions = fixture.optJSONArray("items")?.objects().orEmpty().map { item ->
                require(item.getString("kind") == "suggestion")
                val props = item.optJSONObject("props") ?: JSONObject()
                fun itemProp(name: String): String = (if (props.has(name)) props.get(name) else suggestionDefaults.getValue(name)) as String
                SearchSuggestionFixture(itemProp("value"), itemProp("headline"), itemProp("supportingText"), itemProp("leadingIcon"))
            },
        )
    }
}

/**
 * The stage of one fixture on the page's surface: 360 × 72 with the bar 328 wide centred (SRC-1); 360 × 320 with the bar
 * 16 from its top and sides and the view under it (SRC-7); 360 × 480, the full-screen view filling it (SRC-9).
 */
@Composable
internal fun SearchStage(fixture: SearchFixture, content: @Composable () -> Unit) {
    val stage = Modifier.testTag(SEARCH_STAGE_TAG).background(TanreiColorRole.Surface.color)
    CompositionLocalProvider(LocalTanreiSearchInPlace provides true, LocalTanreiGlyphStandIn provides { name -> ToolbarFixtureGlyph(name) }) {
        when {
            fixture.presentation == TanreiSearchPresentation.FullScreen && fixture.expanded -> Box(stage.size(360.dp, 480.dp)) { content() }
            fixture.expanded -> Box(stage.size(360.dp, 320.dp).padding(start = 16.dp, top = 16.dp, end = 16.dp)) { content() }
            else -> Box(stage.size(360.dp, 72.dp), contentAlignment = Alignment.Center) { Box(Modifier.width(328.dp)) { content() } }
        }
    }
}

/** The search of one fixture: its props as `platforms.compose` maps them, its slots, its suggestions. */
@Composable
internal fun SearchFixture(
    fixture: SearchFixture,
    modifier: Modifier = Modifier,
    onValueChange: (String) -> Unit = {},
    onExpandedChange: (Boolean, TanreiSearchCloseReason?) -> Unit = { _, _ -> },
) {
    val slot: (List<String>) -> (@Composable () -> Unit)? = { names ->
        if (names.isEmpty()) null else {
            {
                for (name in names) {
                    TanreiIconButton(onClick = {}, contentDescription = name, variant = TanreiIconButtonVariant.Standard, size = TanreiIconButtonSize.Medium) { ToolbarFixtureGlyph(name) }
                }
            }
        }
    }
    TanreiSearch(
        value = fixture.value,
        onValueChange = onValueChange,
        expanded = fixture.expanded,
        onExpandedChange = onExpandedChange,
        label = fixture.label,
        modifier = if (fixture.presentation == TanreiSearchPresentation.FullScreen && fixture.expanded) modifier.fillMaxSize() else modifier,
        presentation = fixture.presentation,
        placeholder = fixture.placeholder,
        enabled = fixture.enabled,
        clearLabel = fixture.clearLabel,
        backLabel = fixture.backLabel,
        leading = slot(fixture.leading),
        trailing = slot(fixture.trailing),
    ) {
        for (suggestion in fixture.suggestions) {
            TanreiSearchSuggestion(value = suggestion.value, headline = suggestion.headline, supportingText = suggestion.supportingText, leadingIcon = suggestion.leadingIcon)
        }
    }
}
