package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.github.takahirom.roborazzi.captureRoboImage
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
 * One baseline per fixture in `specs/menu.spec.json`, at `src/test/snapshots/menu/<fixture-id>.png`, read from the spec
 * (MNU-19's `verify`): the OPEN surface drawn in place by the test-only `TanreiMenuInPlace` — at its natural size, with
 * its elevation, without an anchor, placement or open motion —, its items in order (a group holding its own), on the
 * surface with `space600` around it so the whole shadow is in the image; light scheme. An icon name is drawn by
 * [NamedFixtureGlyph] (no icon font is bundled).
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiMenuSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadMenuFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                MenuStage { key(current.id) { MenuFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(MENU_STAGE_TAG).captureRoboImage("$MENU_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("menu")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One item of a menu fixture, of one of the spec's four item kinds, with its kind's defaults filled in. */
internal class MenuItemFixture(val kind: String, val props: Map<String, Any?>, val items: List<MenuItemFixture>) {
    fun string(name: String): String = props[name] as String
    fun boolean(name: String): Boolean = props[name] as Boolean
}

/** One fixture of `specs/menu.spec.json`: `open` and `placement` (the in-place form draws neither) and its items. */
internal class MenuFixture(val id: String, val open: Boolean, val placement: TanreiMenuPlacement, val items: List<MenuItemFixture>)

internal const val MENU_SPEC = "../../../specs/menu.spec.json"
internal const val MENU_SNAPSHOTS = "src/test/snapshots/menu"
internal const val MENU_STAGE_TAG = "fixture"

private fun JSONArray.objects(): List<JSONObject> = (0 until length()).map(::getJSONObject)

/** Every fixture of the spec. A prop a kind does not declare fails. */
internal fun loadMenuFixtures(): List<MenuFixture> {
    val spec = JSONObject(File(MENU_SPEC).readText())
    val defaults = spec.getJSONArray("props").objects().associate { it.getString("name") to it.get("default") }
    val kinds = spec.getJSONArray("items").objects().associate { kind ->
        kind.getString("name") to kind.getJSONArray("props").objects().associate { it.getString("name") to it.get("default").takeUnless { d -> d == JSONObject.NULL } }
    }
    fun items(array: JSONArray?): List<MenuItemFixture> = array?.objects().orEmpty().map { item ->
        val kind = item.getString("kind")
        val kindDefaults = kinds.getValue(kind)
        val given = item.optJSONObject("props") ?: JSONObject()
        val unknown = given.keys().asSequence().filterNot { it in kindDefaults }.toList()
        require(unknown.isEmpty()) { "a $kind uses props its kind does not declare: $unknown" }
        MenuItemFixture(kind, kindDefaults + given.keys().asSequence().associateWith { given.get(it) }, items(item.optJSONArray("items")))
    }
    return spec.getJSONArray("fixtures").objects().map { fixture ->
        val given = fixture.getJSONObject("props")
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        MenuFixture(
            id = fixture.getString("id"),
            open = prop("open") as Boolean,
            placement = TanreiMenuPlacement.entries.single { it.name.replace(Regex("([a-z])([A-Z])"), "$1-$2").lowercase() == prop("placement") },
            items = items(fixture.getJSONArray("items")),
        )
    }
}

/** The surface a menu fixture is drawn on, `space600` around it (its shadow). Tagged [MENU_STAGE_TAG]. */
@Composable
internal fun MenuStage(content: @Composable () -> Unit) {
    Box(Modifier.testTag(MENU_STAGE_TAG).background(TanreiColorRole.Surface.color).padding(TanreiTheme.tokens.space.space600)) { content() }
}

/** The open menu of one fixture, in place. */
@Composable
internal fun MenuFixture(fixture: MenuFixture) {
    TanreiMenuInPlace { for (item in fixture.items) MenuFixtureItem(item) }
}

@Composable
private fun MenuFixtureItem(item: MenuItemFixture) {
    fun glyph(prop: String): (@Composable () -> Unit)? = (item.props[prop] as String?)?.takeIf { it.isNotEmpty() }?.let { name -> { NamedFixtureGlyph(name) } }
    val leading = glyph("leadingIcon")
    val trailing = glyph("trailingIcon")
    when (item.kind) {
        "item" -> TanreiMenuItem(
            text = item.string("label"), onClick = {}, supportingText = item.string("supportingText"), trailingText = item.string("trailingText"),
            destructive = item.boolean("destructive"), enabled = !item.boolean("disabled"), leadingIcon = leading, trailingIcon = trailing,
        )
        "checkbox-item" -> TanreiCheckboxMenuItem(
            text = item.string("label"), checked = item.boolean("checked"), onCheckedChange = {}, supportingText = item.string("supportingText"),
            trailingText = item.string("trailingText"), enabled = !item.boolean("disabled"), leadingIcon = leading, trailingIcon = trailing,
        )
        "radio-item" -> TanreiRadioMenuItem(
            text = item.string("label"), value = item.string("value"), supportingText = item.string("supportingText"),
            trailingText = item.string("trailingText"), enabled = !item.boolean("disabled"), leadingIcon = leading, trailingIcon = trailing,
        )
        "group" -> TanreiMenuGroup(title = item.string("title"), selectedValue = item.props["value"] as String?) {
            for (child in item.items) MenuFixtureItem(child)
        }
        else -> error("unknown item kind ${item.kind}")
    }
}
