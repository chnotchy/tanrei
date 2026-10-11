package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.background
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
 * One baseline per fixture in `specs/tooltip.spec.json`, at `src/test/snapshots/tooltip/<fixture-id>.png`, read from the
 * spec (`platforms.compose`'s harness): a 320 × 200 stage on the surface, a medium standard icon button labelled after the
 * fixture's glyph at its centre, and the tooltip open beside it — drawn in place by the test-only `TanreiTooltipInPlace`
 * (the placement of the popup, with the stage as the window; no hover, no motion). Light scheme. The glyph is drawn by
 * [NamedFixtureGlyph] (no icon font is bundled).
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiTooltipSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadTooltipFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                key(current.id) { TooltipFixture(current) }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(TOOLTIP_STAGE_TAG).captureRoboImage("$TOOLTIP_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("tooltip")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One fixture of `specs/tooltip.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class TooltipFixture(
    val id: String,
    val variant: TanreiTooltipVariant,
    val text: String,
    val title: String,
    val placement: TanreiTooltipPlacement,
    val describes: Boolean,
    val open: Boolean,
    val glyph: String,
)

internal const val TOOLTIP_SPEC = "../../../specs/tooltip.spec.json"
internal const val TOOLTIP_SNAPSHOTS = "src/test/snapshots/tooltip"
internal const val TOOLTIP_STAGE_TAG = "fixture"

private val TOOLTIP_MAPPED_PROPS = setOf("variant", "text", "title", "placement", "describes", "open")

private fun JSONArray.objects(): List<JSONObject> = (0 until length()).map(::getJSONObject)

private inline fun <reified E : Enum<E>> enumOf(value: String): E = enumValues<E>().single { it.name.lowercase() == value }

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadTooltipFixtures(): List<TooltipFixture> {
    val spec = JSONObject(File(TOOLTIP_SPEC).readText())
    val defaults = spec.getJSONArray("props").objects().associate { it.getString("name") to it.get("default") }
    require(defaults.keys == TOOLTIP_MAPPED_PROPS) { "the spec's props changed: map them here" }
    return spec.getJSONArray("fixtures").objects().map { fixture ->
        val given = fixture.getJSONObject("props")
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        TooltipFixture(
            id = fixture.getString("id"),
            variant = enumOf(prop("variant") as String),
            text = prop("text") as String,
            title = prop("title") as String,
            placement = enumOf(prop("placement") as String),
            describes = prop("describes") as Boolean,
            open = prop("open") as Boolean,
            glyph = fixture.getString("content"),
        )
    }
}

/**
 * The spec's harness for one fixture: a 320 × 200 stage on the surface, tagged [TOOLTIP_STAGE_TAG], with the anchor — a
 * medium standard icon button named after the glyph — at its centre and, while the fixture is open, the tooltip beside it.
 */
@Composable
internal fun TooltipFixture(fixture: TooltipFixture) {
    val stage = Modifier.testTag(TOOLTIP_STAGE_TAG).size(320.dp, 200.dp).background(TanreiColorRole.Surface.color)
    val anchor: @Composable () -> Unit = {
        TanreiIconButton(onClick = {}, contentDescription = fixture.glyph, variant = TanreiIconButtonVariant.Standard, size = TanreiIconButtonSize.Medium) {
            NamedFixtureGlyph(fixture.glyph)
        }
    }
    if (fixture.open) {
        TanreiTooltipInPlace(text = fixture.text, modifier = stage, variant = fixture.variant, title = fixture.title, placement = fixture.placement, anchor = anchor)
    } else {
        androidx.compose.foundation.layout.Box(stage, contentAlignment = androidx.compose.ui.Alignment.Center) { anchor() }
    }
}
