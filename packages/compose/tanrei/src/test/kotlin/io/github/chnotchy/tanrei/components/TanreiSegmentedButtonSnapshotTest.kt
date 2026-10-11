package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
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
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiSegmentedButtonSize
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
 * One baseline per fixture in `specs/segmented-button.spec.json`, at `src/test/snapshots/segmented-button/<fixture-id>.png`,
 * read from the spec (SEG-14's `verify`): the set at its natural width, start-aligned and vertically centred on a
 * 400 × 96 stage on the surface, light scheme, holding the fixture's segments in order. An icon name is drawn by
 * [NamedFixtureGlyph] (no icon font is bundled); the check is the segmented button's own, a vector without an icon font.
 * The window is 480 wide so the 400 wide stage fits.
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w480dp-h640dp-xhdpi")
class TanreiSegmentedButtonSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadSegmentedButtonFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                SegmentedButtonStage { key(current.id) { SegmentedButtonFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(SEGMENTED_STAGE_TAG).captureRoboImage("$SEGMENTED_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("segmented-button")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One `segment` of a fixture, mapped to `TanreiSegment` (`platforms.compose.items.segment`). */
internal class SegmentFixture(val value: String, val label: String, val icon: String, val labelHidden: Boolean, val enabled: Boolean)

/** One fixture of `specs/segmented-button.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class SegmentedButtonFixture(
    val id: String,
    val selectionMode: TanreiSegmentedButtonSelectionMode,
    val selectedValue: String?,
    val selectedValues: Set<String>,
    val size: TanreiSegmentedButtonSize,
    val label: String,
    val segments: List<SegmentFixture>,
)

internal const val SEGMENTED_SPEC = "../../../specs/segmented-button.spec.json"
internal const val SEGMENTED_SNAPSHOTS = "src/test/snapshots/segmented-button"
internal const val SEGMENTED_STAGE_TAG = "fixture"

private val SEGMENTED_MAPPED_PROPS = setOf("selection", "value", "values", "size", "label")
private val SEGMENT_MAPPED_PROPS = setOf("value", "label", "icon", "labelHidden", "disabled")

private fun JSONArray.objects(): List<JSONObject> = (0 until length()).map(::getJSONObject)

private fun JSONArray.strings(): List<String> = (0 until length()).map(::getString)

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadSegmentedButtonFixtures(): List<SegmentedButtonFixture> {
    val spec = JSONObject(File(SEGMENTED_SPEC).readText())
    val defaults = spec.getJSONArray("props").objects().associate { it.getString("name") to it.get("default") }
    val kind = spec.getJSONArray("items").objects().single { it.getString("name") == "segment" }
    val segmentDefaults = kind.getJSONArray("props").objects().associate { it.getString("name") to it.get("default") }
    require(defaults.keys == SEGMENTED_MAPPED_PROPS && segmentDefaults.keys == SEGMENT_MAPPED_PROPS) { "the spec's props changed: map them here" }
    return spec.getJSONArray("fixtures").objects().map { fixture ->
        val given = fixture.getJSONObject("props")
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        SegmentedButtonFixture(
            id = fixture.getString("id"),
            selectionMode = TanreiSegmentedButtonSelectionMode.entries.single { it.name.lowercase() == prop("selection") },
            selectedValue = prop("value").takeUnless { it == JSONObject.NULL } as String?,
            selectedValues = (prop("values") as JSONArray).strings().toSet(),
            size = TanreiSegmentedButtonSize(prop("size") as String),
            label = prop("label") as String,
            segments = fixture.getJSONArray("items").objects().map { item ->
                require(item.getString("kind") == "segment") { "a segmented button holds only segment items" }
                val props = item.getJSONObject("props")
                fun itemProp(name: String): Any = if (props.has(name)) props.get(name) else segmentDefaults.getValue(name)
                SegmentFixture(
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

/** The 400 × 96 surface a fixture is drawn on (SEG-14's `verify`): the set start-aligned and vertically centred. */
@Composable
internal fun SegmentedButtonStage(content: @Composable () -> Unit) {
    Box(
        Modifier.testTag(SEGMENTED_STAGE_TAG).size(SEGMENTED_STAGE_WIDTH, SEGMENTED_STAGE_HEIGHT).background(TanreiColorRole.Surface.color),
        contentAlignment = Alignment.CenterStart,
    ) { content() }
}

private val SEGMENTED_STAGE_WIDTH = 400.dp
private val SEGMENTED_STAGE_HEIGHT = 96.dp

/** The set of one fixture: its props on the set, each segment's on that segment (`platforms.compose`). */
@Composable
internal fun SegmentedButtonFixture(fixture: SegmentedButtonFixture, onSelectionChange: (Set<String>) -> Unit = {}) {
    TanreiSegmentedButton(
        onSelectionChange = onSelectionChange,
        contentDescription = fixture.label,
        selectionMode = fixture.selectionMode,
        selectedValue = fixture.selectedValue,
        selectedValues = fixture.selectedValues,
        size = fixture.size,
    ) {
        for (segment in fixture.segments) {
            TanreiSegment(
                value = segment.value,
                label = segment.label,
                labelHidden = segment.labelHidden,
                enabled = segment.enabled,
                icon = segment.icon.takeIf { it.isNotEmpty() }?.let { name -> { NamedFixtureGlyph(name) } },
            )
        }
    }
}
