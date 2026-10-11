package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box

import androidx.compose.foundation.layout.size
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
import io.github.chnotchy.tanrei.tokens.TanreiSideSheetVariant
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * One baseline per fixture in `specs/side-sheet.spec.json`, at `src/test/snapshots/side-sheet/<fixture-id>.png`, read
 * from the spec (`platforms.compose`'s harness): the test-only in-place `TanreiSideSheetContent` — a standard sheet at the
 * end of a row whose other child fills the rest, a modal sheet with its scrim — in a 720 × 480 box over the surface,
 * fully shown, light scheme, no system insets. A fixture's `content` is plain text; its `actions` slot is text-variant
 * Tanrei Buttons ([fixtureSlotContent]).
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w720dp-h600dp-xhdpi")
class TanreiSideSheetSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadSideSheetFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                SideSheetStage { key(current.id) { SideSheetFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(SIDE_SHEET_STAGE_TAG).captureRoboImage("$SIDE_SHEET_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("side-sheet")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One fixture of `specs/side-sheet.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class SideSheetFixture(
    val id: String,
    val variant: TanreiSideSheetVariant,
    val visible: Boolean,
    val headline: String,
    val closable: Boolean,
    val closeLabel: String,
    val content: String?,
    val slots: Map<String, FixtureSlot>,
)

internal const val SIDE_SHEET_SPEC = "../../../specs/side-sheet.spec.json"
internal const val SIDE_SHEET_SNAPSHOTS = "src/test/snapshots/side-sheet"
internal const val SIDE_SHEET_STAGE_TAG = "fixture"

private val SIDE_SHEET_MAPPED_PROPS = setOf("variant", "open", "headline", "closable", "closeLabel")

private fun JSONArray.objects(): List<JSONObject> = (0 until length()).map(::getJSONObject)

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadSideSheetFixtures(): List<SideSheetFixture> {
    val spec = readSpec(SIDE_SHEET_SPEC)
    val defaults = spec.getJSONArray("props").objects().associate { it.getString("name") to it.get("default") }
    require(defaults.keys == SIDE_SHEET_MAPPED_PROPS) { "the spec's props changed: map them here" }
    return spec.getJSONArray("fixtures").objects().map { fixture ->
        val given = fixture.getJSONObject("props")
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        SideSheetFixture(
            id = fixture.getString("id"),
            variant = TanreiSideSheetVariant(prop("variant") as String),
            visible = prop("open") as Boolean,
            headline = prop("headline") as String,
            closable = prop("closable") as Boolean,
            closeLabel = prop("closeLabel") as String,
            content = fixture.optString("content").takeIf { fixture.has("content") },
            slots = fixtureSlots(spec, fixture),
        )
    }
}

/** The 720 × 480 stage of `platforms.compose`'s harness, a surface page. Tagged [SIDE_SHEET_STAGE_TAG]. */
@Composable
internal fun SideSheetStage(content: @Composable () -> Unit) {
    Box(Modifier.testTag(SIDE_SHEET_STAGE_TAG).size(720.dp, 480.dp).background(TanreiColorRole.Surface.color)) { content() }
}

/** The open sheet of one fixture, in place. */
@Composable
internal fun SideSheetFixture(fixture: SideSheetFixture) {
    if (!fixture.visible) return
    val actions = fixtureSlotContent(fixture.slots["actions"])
    TanreiSideSheetContent(
        headline = fixture.headline,
        variant = fixture.variant,
        closable = fixture.closable,
        closeLabel = fixture.closeLabel,
        actions = actions?.let { slot -> { slot() } },
    ) {
        fixture.content?.let { TanreiText(it) }
    }
}

