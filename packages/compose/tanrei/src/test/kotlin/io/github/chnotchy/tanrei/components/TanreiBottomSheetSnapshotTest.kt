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
 * One baseline per fixture in `specs/bottom-sheet.spec.json`, at `src/test/snapshots/bottom-sheet/<fixture-id>.png`, read
 * from the spec (`platforms.compose`'s harness): the test-only in-place `TanreiBottomSheetContent` — the sheet and, for a
 * modal sheet, the scrim — in a 400 × 720 box over the surface, fully shown, light scheme, no system insets. A fixture's
 * `content` is plain text in the sheet's default slot.
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w400dp-h800dp-xhdpi")
class TanreiBottomSheetSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadBottomSheetFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                BottomSheetStage { key(current.id) { BottomSheetFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(BOTTOM_SHEET_STAGE_TAG).captureRoboImage("$BOTTOM_SHEET_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("bottom-sheet")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One fixture of `specs/bottom-sheet.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class BottomSheetFixture(
    val id: String,
    val variant: TanreiBottomSheetVariant,
    val visible: Boolean,
    val detent: TanreiBottomSheetDetent,
    val dismissible: Boolean,
    val handle: Boolean,
    val handleLabel: String,
    val inset: Boolean,
    val contentDescription: String,
    val content: String?,
)

internal const val BOTTOM_SHEET_SPEC = "../../../specs/bottom-sheet.spec.json"
internal const val BOTTOM_SHEET_SNAPSHOTS = "src/test/snapshots/bottom-sheet"
internal const val BOTTOM_SHEET_STAGE_TAG = "fixture"

private val BOTTOM_SHEET_MAPPED_PROPS = setOf("variant", "open", "detent", "dismissible", "handle", "handleLabel", "inset", "label")

private fun JSONArray.objects(): List<JSONObject> = (0 until length()).map(::getJSONObject)

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadBottomSheetFixtures(): List<BottomSheetFixture> {
    val spec = readSpec(BOTTOM_SHEET_SPEC)
    val defaults = spec.getJSONArray("props").objects().associate { it.getString("name") to it.get("default") }
    require(defaults.keys == BOTTOM_SHEET_MAPPED_PROPS) { "the spec's props changed: map them here" }
    return spec.getJSONArray("fixtures").objects().map { fixture ->
        val given = fixture.getJSONObject("props")
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        BottomSheetFixture(
            id = fixture.getString("id"),
            variant = TanreiBottomSheetVariant.entries.single { it.name.lowercase() == prop("variant") },
            visible = prop("open") as Boolean,
            detent = TanreiBottomSheetDetent.entries.single { it.name.lowercase() == prop("detent") },
            dismissible = prop("dismissible") as Boolean,
            handle = prop("handle") as Boolean,
            handleLabel = prop("handleLabel") as String,
            inset = prop("inset") as Boolean,
            contentDescription = prop("label") as String,
            content = fixture.optString("content").takeIf { fixture.has("content") },
        )
    }
}

/** The 400 × 720 stage of `platforms.compose`'s harness, a surface page. Tagged [BOTTOM_SHEET_STAGE_TAG]. */
@Composable
internal fun BottomSheetStage(content: @Composable () -> Unit) {
    Box(Modifier.testTag(BOTTOM_SHEET_STAGE_TAG).size(400.dp, 720.dp).background(TanreiColorRole.Surface.color)) { content() }
}

/** The open sheet of one fixture, in place: its scrim (modal) and itself. */
@Composable
internal fun BottomSheetFixture(fixture: BottomSheetFixture) {
    if (!fixture.visible) return
    TanreiBottomSheetContent(
        variant = fixture.variant,
        detent = fixture.detent,
        handle = fixture.handle,
        handleLabel = fixture.handleLabel,
        inset = fixture.inset,
        contentDescription = fixture.contentDescription,
        dismissible = fixture.dismissible,
    ) {
        fixture.content?.let { TanreiText(it) }
    }
}
