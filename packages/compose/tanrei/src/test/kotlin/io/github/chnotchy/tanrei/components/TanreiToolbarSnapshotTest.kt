package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
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
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.github.takahirom.roborazzi.captureRoboImage
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.TanreiButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiToolbarVariant
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
 * One baseline per fixture in `specs/toolbar.spec.json`, at `src/test/snapshots/toolbar/<fixture-id>.png`, read from the
 * spec, on the stages its `verify` sentences give (light scheme, on the page's surface, no system inset): a docked toolbar
 * across a 360 × 56 stage (TBR-1), a horizontal floating one centred in 360 × 96 (TBR-4) and the vertical one centred in
 * 96 × 240 (TBR-6). Each `action` item is a Tanrei icon button (medium, its glyph [ToolbarFixtureGlyph]), a toggle when the
 * item says so; each `button` item a medium Tanrei Button whose label is the item's content.
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w400dp-h640dp-xhdpi")
class TanreiToolbarSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadToolbarFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                key(current.id) { ToolbarStage(current) { ToolbarFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(TOOLBAR_STAGE_TAG).captureRoboImage("$TOOLBAR_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("toolbar")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One item of a toolbar fixture: an `action` (a Tanrei icon button) or a `button` (a Tanrei Button), as `platforms.compose.items` maps them. */
internal sealed interface ToolbarItemFixture {
    class Action(val label: String, val variant: TanreiIconButtonVariant, val toggle: Boolean, val checked: Boolean, val enabled: Boolean, val glyph: String) : ToolbarItemFixture

    class Button(val variant: TanreiButtonVariant, val enabled: Boolean, val label: String) : ToolbarItemFixture
}

/** One fixture of `specs/toolbar.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class ToolbarFixture(val id: String, val variant: TanreiToolbarVariant, val orientation: Orientation, val label: String, val items: List<ToolbarItemFixture>)

internal const val TOOLBAR_SPEC = "../../../specs/toolbar.spec.json"
internal const val TOOLBAR_SNAPSHOTS = "src/test/snapshots/toolbar"
internal const val TOOLBAR_STAGE_TAG = "fixture"

private val TOOLBAR_MAPPED_PROPS = setOf("variant", "orientation", "label")
private val ACTION_ITEM_PROPS = setOf("label", "variant", "toggle", "selected", "disabled")
private val BUTTON_ITEM_PROPS = setOf("variant", "disabled")

private fun JSONArray.objects(): List<JSONObject> = (0 until length()).map(::getJSONObject)

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadToolbarFixtures(): List<ToolbarFixture> {
    val spec = JSONObject(File(TOOLBAR_SPEC).readText())
    val defaults = spec.getJSONArray("props").objects().associate { it.getString("name") to it.get("default") }
    val kinds = spec.getJSONArray("items").objects().associate { kind -> kind.getString("name") to kind.getJSONArray("props").objects().associate { it.getString("name") to it.get("default") } }
    require(defaults.keys == TOOLBAR_MAPPED_PROPS) { "the spec's props changed: map them here" }
    require(kinds.getValue("action").keys == ACTION_ITEM_PROPS && kinds.getValue("button").keys == BUTTON_ITEM_PROPS) { "the item kinds' props changed: map them here" }
    return spec.getJSONArray("fixtures").objects().map { fixture ->
        val given = fixture.getJSONObject("props")
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        ToolbarFixture(
            id = fixture.getString("id"),
            variant = TanreiToolbarVariant(prop("variant") as String),
            orientation = Orientation.entries.single { it.name.lowercase() == prop("orientation") },
            label = prop("label") as String,
            items = fixture.getJSONArray("items").objects().map { item ->
                val kind = item.getString("kind")
                val props = item.optJSONObject("props") ?: JSONObject()
                fun itemProp(name: String): Any = if (props.has(name)) props.get(name) else kinds.getValue(kind).getValue(name)
                val content = item.optString("content")
                when (kind) {
                    "action" -> ToolbarItemFixture.Action(
                        label = itemProp("label") as String,
                        variant = TanreiIconButtonVariant(itemProp("variant") as String),
                        toggle = itemProp("toggle") as Boolean,
                        checked = itemProp("selected") as Boolean,
                        enabled = !(itemProp("disabled") as Boolean),
                        glyph = content,
                    )
                    "button" -> ToolbarItemFixture.Button(variant = TanreiButtonVariant(itemProp("variant") as String), enabled = !(itemProp("disabled") as Boolean), label = content)
                    else -> error("a toolbar holds action and button items, not $kind")
                }
            },
        )
    }
}

/**
 * The stage of one fixture, on the page's surface (TBR-1's, TBR-4's and TBR-6's `verify`): docked 360 × 56 with the
 * toolbar across it; floating 360 × 96, vertical 96 × 240, the toolbar centred.
 */
@Composable
internal fun ToolbarStage(fixture: ToolbarFixture, content: @Composable () -> Unit) {
    val (width, height) = toolbarStageSize(fixture)
    Box(
        Modifier.testTag(TOOLBAR_STAGE_TAG).size(width, height).background(TanreiColorRole.Surface.color),
        contentAlignment = if (fixture.variant == TanreiToolbarVariant.Floating) Alignment.Center else Alignment.BottomCenter,
    ) { content() }
}

internal fun toolbarStageSize(fixture: ToolbarFixture): Pair<Dp, Dp> = when {
    fixture.variant != TanreiToolbarVariant.Floating -> 360.dp to 56.dp
    fixture.orientation == Orientation.Vertical -> 96.dp to 240.dp
    else -> 360.dp to 96.dp
}

/** The toolbar of one fixture: its props on the toolbar, each item's on that icon button or Button (`platforms.compose`), no system inset. */
@Composable
internal fun ToolbarFixture(fixture: ToolbarFixture, onClick: () -> Unit = {}, onCheckedChange: (Int, Boolean) -> Unit = { _, _ -> }) {
    TanreiToolbar(contentDescription = fixture.label, variant = fixture.variant, orientation = fixture.orientation, windowInsets = WindowInsets(0.dp, 0.dp, 0.dp, 0.dp)) {
        fixture.items.forEachIndexed { index, item ->
            when (item) {
                is ToolbarItemFixture.Action -> TanreiIconButton(
                    onClick = onClick,
                    contentDescription = item.label,
                    variant = item.variant,
                    checked = item.checked,
                    onCheckedChange = if (item.toggle) { value -> onCheckedChange(index, value) } else null,
                    enabled = item.enabled,
                ) { ToolbarFixtureGlyph(item.glyph) }
                is ToolbarItemFixture.Button -> TanreiButton(text = item.label, onClick = onClick, variant = item.variant, enabled = item.enabled)
            }
        }
    }
}
