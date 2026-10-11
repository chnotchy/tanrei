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
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * One baseline per fixture in `specs/dialog.spec.json`, at `src/test/snapshots/dialog/<fixture-id>.png`, read from the
 * spec (`platforms.compose`'s harness): the test-only in-place `TanreiDialogContent` — the scrim and the surface — in a
 * 480 × 640 box over the surface, fully shown, light scheme. A fixture's `content` fills the default slot as text, and its
 * `slots` fill the icon (a glyph, drawn by [NamedFixtureGlyph]) and the actions (text-variant Tanrei Buttons)
 * ([fixtureSlotContent]).
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w480dp-h720dp-xhdpi")
class TanreiDialogSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadDialogFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                DialogStage { key(current.id) { DialogFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(DIALOG_STAGE_TAG).captureRoboImage("$DIALOG_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("dialog")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One fixture of `specs/dialog.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class DialogFixture(
    val id: String,
    val visible: Boolean,
    val headline: String,
    val supportingText: String,
    val alert: Boolean,
    val dismissible: Boolean,
    val content: String?,
    val slots: Map<String, FixtureSlot>,
)

internal const val DIALOG_SPEC = "../../../specs/dialog.spec.json"
internal const val DIALOG_SNAPSHOTS = "src/test/snapshots/dialog"
internal const val DIALOG_STAGE_TAG = "fixture"

private val DIALOG_MAPPED_PROPS = setOf("open", "headline", "supportingText", "alert", "dismissible")

private fun JSONArray.objects(): List<JSONObject> = (0 until length()).map(::getJSONObject)

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadDialogFixtures(): List<DialogFixture> {
    val spec = readSpec(DIALOG_SPEC)
    val defaults = spec.getJSONArray("props").objects().associate { it.getString("name") to it.get("default") }
    require(defaults.keys == DIALOG_MAPPED_PROPS) { "the spec's props changed: map them here" }
    return spec.getJSONArray("fixtures").objects().map { fixture ->
        val given = fixture.getJSONObject("props")
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        DialogFixture(
            id = fixture.getString("id"),
            visible = prop("open") as Boolean,
            headline = prop("headline") as String,
            supportingText = prop("supportingText") as String,
            alert = prop("alert") as Boolean,
            dismissible = prop("dismissible") as Boolean,
            content = fixture.optString("content").takeIf { fixture.has("content") },
            slots = fixtureSlots(spec, fixture),
        )
    }
}

/** The 480 × 640 stage of `platforms.compose`'s harness, the surface behind the scrim. Tagged [DIALOG_STAGE_TAG]. */
@Composable
internal fun DialogStage(content: @Composable () -> Unit) {
    Box(Modifier.testTag(DIALOG_STAGE_TAG).size(480.dp, 640.dp).background(TanreiColorRole.Surface.color)) { content() }
}

/** The open dialog of one fixture, in place: its scrim and its surface. */
@Composable
internal fun DialogFixture(fixture: DialogFixture) {
    if (!fixture.visible) return
    TanreiDialogContent(
        headline = fixture.headline,
        supportingText = fixture.supportingText,
        icon = fixtureSlotContent(fixture.slots["icon"]),
        actions = fixtureSlotContent(fixture.slots["actions"]),
        content = fixture.content?.let { text -> { TanreiText(text) } },
        dismissible = fixture.dismissible,
    )
}
