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
import io.github.chnotchy.tanrei.tokens.TanreiSplitButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiSplitButtonVariant
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * One baseline per fixture in `specs/split-button.spec.json`, at `src/test/snapshots/split-button/<fixture-id>.png`, read
 * from the spec (SPB-12's `verify`): the split button at its natural width, start-aligned and vertically centred on a
 * 320 × 96 stage on the surface, light scheme. The `icon` slot holds [NamedFixtureGlyph] (the fixture kind `glyph`); the chevron
 * is the split button's own, a vector without an icon font. A fixture cannot fill the menu slot, so an `open` fixture
 * shows the trailing half's open form and presents no menu (SPB-20).
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiSplitButtonSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadSplitButtonFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                SplitButtonStage { key(current.id) { SplitButtonFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(SPLIT_STAGE_TAG).captureRoboImage("$SPLIT_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("split-button")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One fixture of `specs/split-button.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class SplitButtonFixture(
    val id: String,
    val variant: TanreiSplitButtonVariant,
    val size: TanreiSplitButtonSize,
    val text: String,
    val menuContentDescription: String,
    val menuExpanded: Boolean,
    val enabled: Boolean,
    val icon: FixtureSlot?,
)

internal const val SPLIT_SPEC = "../../../specs/split-button.spec.json"
internal const val SPLIT_SNAPSHOTS = "src/test/snapshots/split-button"
internal const val SPLIT_STAGE_TAG = "fixture"

private val SPLIT_MAPPED_PROPS = setOf("variant", "size", "label", "menuLabel", "open", "disabled")

private fun JSONArray.objects(): List<JSONObject> = (0 until length()).map(::getJSONObject)

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadSplitButtonFixtures(): List<SplitButtonFixture> {
    val spec = readSpec(SPLIT_SPEC)
    val defaults = spec.getJSONArray("props").objects().associate { it.getString("name") to it.get("default") }
    require(defaults.keys == SPLIT_MAPPED_PROPS) { "the spec's props changed: map them here" }
    return spec.getJSONArray("fixtures").objects().map { fixture ->
        val given = fixture.getJSONObject("props")
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        val slots = fixtureSlots(spec, fixture)
        require(slots.keys.all { it == "icon" }) { "a split button fixture fills only its icon slot" }
        SplitButtonFixture(
            id = fixture.getString("id"),
            variant = TanreiSplitButtonVariant(prop("variant") as String),
            size = TanreiSplitButtonSize(prop("size") as String),
            text = prop("label") as String,
            menuContentDescription = prop("menuLabel") as String,
            menuExpanded = prop("open") as Boolean,
            enabled = !(prop("disabled") as Boolean),
            icon = slots["icon"],
        )
    }
}

/** The 320 × 96 surface a fixture is drawn on (SPB-12's `verify`): the split button start-aligned and vertically centred. */
@Composable
internal fun SplitButtonStage(content: @Composable () -> Unit) {
    Box(
        Modifier.testTag(SPLIT_STAGE_TAG).size(SPLIT_STAGE_WIDTH, SPLIT_STAGE_HEIGHT).background(TanreiColorRole.Surface.color),
        contentAlignment = Alignment.CenterStart,
    ) { content() }
}

private val SPLIT_STAGE_WIDTH = 320.dp
private val SPLIT_STAGE_HEIGHT = 96.dp

/** The split button of one fixture (`platforms.compose`); the menu slot is empty, as a fixture cannot fill it. */
@Composable
internal fun SplitButtonFixture(fixture: SplitButtonFixture) {
    TanreiSplitButton(
        text = fixture.text,
        onClick = {},
        menuContentDescription = fixture.menuContentDescription,
        menuExpanded = fixture.menuExpanded,
        onMenuExpandedChange = {},
        onMenuDismissRequest = {},
        variant = fixture.variant,
        size = fixture.size,
        enabled = fixture.enabled,
        icon = fixtureSlotContent(fixture.icon),
    ) {}
}
