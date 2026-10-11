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
import io.github.chnotchy.tanrei.tokens.TanreiButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiButtonVariant
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
 * One baseline per fixture in `specs/button-group.spec.json`, at `src/test/snapshots/button-group/<fixture-id>.png`, read
 * from the spec (BGR-1's `verify`): the group at its natural width, start-aligned and vertically centred on a 400 × 96
 * stage on the surface, light scheme, holding the fixture's items in order — a `button` item a Tanrei Button whose label
 * is the item's content, an `icon-button` item a Tanrei icon button whose glyph ([NamedFixtureGlyph]) is the content, a
 * toggle when the item says so. The window is 480 wide so the 400 wide stage fits.
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w480dp-h640dp-xhdpi")
class TanreiButtonGroupSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadButtonGroupFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                ButtonGroupStage { key(current.id) { ButtonGroupFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(BUTTON_GROUP_STAGE_TAG).captureRoboImage("$BUTTON_GROUP_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("button-group")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One item of a button group fixture: a `button` or an `icon-button` item, mapped as `platforms.compose.items` says. */
internal sealed interface ButtonGroupItemFixture {
    class Button(val variant: TanreiButtonVariant, val size: TanreiButtonSize, val enabled: Boolean, val label: String) : ButtonGroupItemFixture

    class IconButton(
        val variant: TanreiIconButtonVariant,
        val size: TanreiIconButtonSize,
        val toggle: Boolean,
        val checked: Boolean,
        val enabled: Boolean,
        val label: String,
        val glyph: String,
    ) : ButtonGroupItemFixture
}

/** One fixture of `specs/button-group.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class ButtonGroupFixture(val id: String, val variant: TanreiButtonGroupVariant, val label: String, val items: List<ButtonGroupItemFixture>)

internal const val BUTTON_GROUP_SPEC = "../../../specs/button-group.spec.json"
internal const val BUTTON_GROUP_SNAPSHOTS = "src/test/snapshots/button-group"
internal const val BUTTON_GROUP_STAGE_TAG = "fixture"

private val BUTTON_GROUP_MAPPED_PROPS = setOf("variant", "label")
private val BUTTON_ITEM_PROPS = setOf("variant", "size", "disabled")
private val ICON_BUTTON_ITEM_PROPS = setOf("variant", "size", "toggle", "selected", "disabled", "label")

private fun JSONArray.objects(): List<JSONObject> = (0 until length()).map(::getJSONObject)

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadButtonGroupFixtures(): List<ButtonGroupFixture> {
    val spec = JSONObject(File(BUTTON_GROUP_SPEC).readText())
    val defaults = spec.getJSONArray("props").objects().associate { it.getString("name") to it.get("default") }
    val kinds = spec.getJSONArray("items").objects().associate { kind -> kind.getString("name") to kind.getJSONArray("props").objects().associate { it.getString("name") to it.get("default") } }
    require(defaults.keys == BUTTON_GROUP_MAPPED_PROPS) { "the spec's props changed: map them here" }
    require(kinds.getValue("button").keys == BUTTON_ITEM_PROPS && kinds.getValue("icon-button").keys == ICON_BUTTON_ITEM_PROPS) { "the item kinds' props changed: map them here" }
    return spec.getJSONArray("fixtures").objects().map { fixture ->
        val given = fixture.getJSONObject("props")
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        ButtonGroupFixture(
            id = fixture.getString("id"),
            variant = TanreiButtonGroupVariant.entries.single { it.name.lowercase() == prop("variant") },
            label = prop("label") as String,
            items = fixture.getJSONArray("items").objects().map { item ->
                val kind = item.getString("kind")
                val props = item.optJSONObject("props") ?: JSONObject()
                fun itemProp(name: String): Any = if (props.has(name)) props.get(name) else kinds.getValue(kind).getValue(name)
                val content = item.optString("content")
                when (kind) {
                    "button" -> ButtonGroupItemFixture.Button(
                        variant = TanreiButtonVariant(itemProp("variant") as String),
                        size = TanreiButtonSize(itemProp("size") as String),
                        enabled = !(itemProp("disabled") as Boolean),
                        label = content,
                    )
                    "icon-button" -> ButtonGroupItemFixture.IconButton(
                        variant = TanreiIconButtonVariant(itemProp("variant") as String),
                        size = TanreiIconButtonSize(itemProp("size") as String),
                        toggle = itemProp("toggle") as Boolean,
                        checked = itemProp("selected") as Boolean,
                        enabled = !(itemProp("disabled") as Boolean),
                        label = itemProp("label") as String,
                        glyph = content,
                    )
                    else -> error("a button group holds button and icon-button items, not $kind")
                }
            },
        )
    }
}

/** The 400 × 96 surface a fixture is drawn on (BGR-1's `verify`): the group start-aligned and vertically centred. */
@Composable
internal fun ButtonGroupStage(content: @Composable () -> Unit) {
    Box(
        Modifier.testTag(BUTTON_GROUP_STAGE_TAG).size(BUTTON_GROUP_STAGE_WIDTH, BUTTON_GROUP_STAGE_HEIGHT).background(TanreiColorRole.Surface.color),
        contentAlignment = Alignment.CenterStart,
    ) { content() }
}

private val BUTTON_GROUP_STAGE_WIDTH = 400.dp
private val BUTTON_GROUP_STAGE_HEIGHT = 96.dp

/** The group of one fixture: its props on the group, each item's on that Button or icon button (`platforms.compose`). */
@Composable
internal fun ButtonGroupFixture(fixture: ButtonGroupFixture, onClick: () -> Unit = {}) {
    TanreiButtonGroup(variant = fixture.variant, contentDescription = fixture.label) {
        for (item in fixture.items) {
            when (item) {
                is ButtonGroupItemFixture.Button -> TanreiButton(text = item.label, onClick = onClick, variant = item.variant, size = item.size, enabled = item.enabled)
                is ButtonGroupItemFixture.IconButton -> TanreiIconButton(
                    onClick = onClick,
                    contentDescription = item.label,
                    variant = item.variant,
                    size = item.size,
                    checked = item.checked,
                    onCheckedChange = if (item.toggle) { _ -> } else null,
                    enabled = item.enabled,
                ) { NamedFixtureGlyph(item.glyph) }
            }
        }
    }
}
