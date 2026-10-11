package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.width
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
import io.github.chnotchy.tanrei.tokens.TanreiAppBarSize
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonVariant
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * One baseline per fixture in `specs/app-bar.spec.json`, at `src/test/snapshots/app-bar/<fixture-id>.png`, read from the
 * spec: the bar 360 wide over the surface, no system insets, light scheme. Each item is a standard medium
 * `TanreiIconButton` in its slot (`platforms.compose.items`) whose glyph is drawn by [BarFixtureGlyph] (no icon font is
 * bundled). A fixture with `scrolled` true gets a collapse behavior whose state was created scrolled and collapsed
 * (`platforms.compose`: "a state created with a given offset draws the scrolled fixtures").
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiAppBarSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadAppBarFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                AppBarStage { key(current.id) { AppBarFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(APP_BAR_STAGE_TAG).captureRoboImage("$APP_BAR_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("app-bar")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One item of an app bar fixture: its kind (`navigation` or `action`), its label and its glyph. */
internal class AppBarItemFixture(val kind: String, val label: String, val glyph: String)

/** One fixture of `specs/app-bar.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class AppBarFixture(
    val id: String,
    val size: TanreiAppBarSize,
    val title: String,
    val subtitle: String,
    val titleAlignment: TanreiAppBarTitleAlignment,
    val scrolled: Boolean,
    val items: List<AppBarItemFixture>,
)

internal const val APP_BAR_SPEC = "../../../specs/app-bar.spec.json"
internal const val APP_BAR_SNAPSHOTS = "src/test/snapshots/app-bar"
internal const val APP_BAR_STAGE_TAG = "fixture"

private val APP_BAR_MAPPED_PROPS = setOf("size", "title", "subtitle", "titleAlignment", "scrolled")
private val APP_BAR_ITEM_PROPS = setOf("label")

private fun JSONArray.objects(): List<JSONObject> = (0 until length()).map(::getJSONObject)

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadAppBarFixtures(): List<AppBarFixture> {
    val spec = readSpec(APP_BAR_SPEC)
    val defaults = spec.getJSONArray("props").objects().associate { it.getString("name") to it.get("default") }
    require(defaults.keys == APP_BAR_MAPPED_PROPS) { "the spec's props changed: map them here" }
    spec.getJSONArray("items").objects().forEach { kind ->
        require(kind.getJSONArray("props").objects().map { it.getString("name") }.toSet() == APP_BAR_ITEM_PROPS) { "the item kinds' props changed: map them here" }
    }
    return spec.getJSONArray("fixtures").objects().map { fixture ->
        val given = fixture.getJSONObject("props")
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        AppBarFixture(
            id = fixture.getString("id"),
            size = TanreiAppBarSize(prop("size") as String),
            title = prop("title") as String,
            subtitle = prop("subtitle") as String,
            titleAlignment = TanreiAppBarTitleAlignment.entries.single { it.name.lowercase() == prop("titleAlignment") },
            scrolled = prop("scrolled") as Boolean,
            items = fixture.optJSONArray("items")?.objects().orEmpty().map { item ->
                AppBarItemFixture(item.getString("kind"), item.getJSONObject("props").optString("label"), item.getString("content"))
            },
        )
    }
}

/** The surface an app bar fixture is drawn on: 360 wide, the bar's own height. Tagged [APP_BAR_STAGE_TAG]. */
@Composable
internal fun AppBarStage(content: @Composable () -> Unit) {
    Box(Modifier.testTag(APP_BAR_STAGE_TAG).width(360.dp).background(TanreiColorRole.Surface.color)) { content() }
}

/** The bar of one fixture: its props on the bar, its items as icon buttons in their slots, no system insets. */
@Composable
internal fun AppBarFixture(fixture: AppBarFixture, onClick: (String) -> Unit = {}) {
    val navigation = fixture.items.filter { it.kind == "navigation" }
    val actions = fixture.items.filter { it.kind == "action" }
    val behavior = if (fixture.scrolled) {
        TanreiAppBarDefaults.collapseScrollBehavior(rememberTanreiAppBarState(initialCollapsedOffset = Float.POSITIVE_INFINITY, initialContentOffset = 1f))
    } else {
        null
    }
    TanreiAppBar(
        title = fixture.title,
        navigationIcon = if (navigation.isEmpty()) null else { { navigation.forEach { AppBarFixtureButton(it, onClick) } } },
        actions = if (actions.isEmpty()) null else { { actions.forEach { AppBarFixtureButton(it, onClick) } } },
        subtitle = fixture.subtitle,
        size = fixture.size,
        titleAlignment = fixture.titleAlignment,
        scrollBehavior = behavior,
        windowInsets = WindowInsets(0, 0, 0, 0),
    )
}

@Composable
private fun AppBarFixtureButton(item: AppBarItemFixture, onClick: (String) -> Unit) {
    TanreiIconButton(onClick = { onClick(item.label) }, contentDescription = item.label, variant = TanreiIconButtonVariant.Standard, size = TanreiIconButtonSize.Medium) {
        BarFixtureGlyph(item.glyph)
    }
}
