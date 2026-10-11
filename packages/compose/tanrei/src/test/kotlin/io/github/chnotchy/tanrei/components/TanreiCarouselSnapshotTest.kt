package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
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
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph
import io.github.chnotchy.tanrei.theme.LocalTanreiTextStyle
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.glyph
import io.github.chnotchy.tanrei.theme.toTextStyle
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
 * One baseline per fixture in `specs/carousel.spec.json`, at `src/test/snapshots/carousel/<fixture-id>.png`, read from
 * the spec (`platforms.compose`'s harness): the carousel filling a 400 × 200 box on the surface, scrolled to its start,
 * light scheme. Each item's content is its glyph NAME, drawn — as the spec's item slot says — centred in the content box
 * at `sys.icon.large` through the icon helper (unselected), in the item's content color, by the stand-in
 * [NamedFixtureGlyph] (no icon font is bundled).
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w400dp-h400dp-xhdpi")
class TanreiCarouselSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadCarouselFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                CarouselStage { key(current.id) { CarouselFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(CAROUSEL_STAGE_TAG).captureRoboImage("$CAROUSEL_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("carousel")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One item of a carousel fixture. */
internal class CarouselFixtureItem(val label: String, val glyph: String)

/** One fixture of `specs/carousel.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class CarouselFixture(
    val id: String,
    val layout: TanreiCarouselLayout,
    val itemWidth: Dp?,
    val contentDescription: String,
    val items: List<CarouselFixtureItem>,
)

internal const val CAROUSEL_SPEC = "../../../specs/carousel.spec.json"
internal const val CAROUSEL_SNAPSHOTS = "src/test/snapshots/carousel"
internal const val CAROUSEL_STAGE_TAG = "fixture"

private val CAROUSEL_MAPPED_PROPS = setOf("layout", "itemWidth", "label")

private fun JSONArray.objects(): List<JSONObject> = (0 until length()).map(::getJSONObject)

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadCarouselFixtures(): List<CarouselFixture> {
    val spec = readSpec(CAROUSEL_SPEC)
    val defaults = spec.getJSONArray("props").objects().associate { it.getString("name") to it.opt("default") }
    require(defaults.keys == CAROUSEL_MAPPED_PROPS) { "the spec's props changed: map them here" }
    return spec.getJSONArray("fixtures").objects().map { fixture ->
        val given = fixture.getJSONObject("props")
        fun prop(name: String): Any? = if (given.has(name)) given.get(name) else defaults[name]
        CarouselFixture(
            id = fixture.getString("id"),
            layout = TanreiCarouselLayout.entries.single { it.name.lowercase() == (prop("layout") as String).replace("-", "") },
            itemWidth = (prop("itemWidth") as? Number)?.toFloat()?.dp,
            contentDescription = prop("label") as String,
            items = fixture.getJSONArray("items").objects().map { item ->
                require(item.getString("kind") == "item")
                CarouselFixtureItem(item.getJSONObject("props").getString("label"), item.getString("content"))
            },
        )
    }
}

/** The 400 × 200 stage of `platforms.compose`'s harness, a surface page. Tagged [CAROUSEL_STAGE_TAG]. */
@Composable
internal fun CarouselStage(content: @Composable () -> Unit) {
    Box(Modifier.testTag(CAROUSEL_STAGE_TAG).size(400.dp, 200.dp).background(TanreiColorRole.Surface.color)) { content() }
}

/** One fixture's carousel, filling the stage. */
@Composable
internal fun CarouselFixture(fixture: CarouselFixture, onClick: (Int) -> Unit = {}) {
    TanreiCarousel(itemCount = fixture.items.size, contentDescription = fixture.contentDescription, modifier = Modifier.fillMaxSize(), layout = fixture.layout, itemWidth = fixture.itemWidth) { index ->
        val item = fixture.items[index]
        TanreiCarouselItem(label = item.label, onClick = { onClick(index) }) { CarouselGlyph(item.glyph) }
    }
}

/** The item slot's fixture content: its glyph centred at `sys.icon.large` through the icon helper, unselected. */
@Composable
internal fun CarouselGlyph(name: String) {
    val size = TanreiTheme.tokens.measure.iconLarge
    val glyph = TanreiTheme.tokens.icon.glyph(size, selected = false)
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CompositionLocalProvider(LocalTanreiIconGlyph provides glyph, LocalTanreiTextStyle provides glyph.toTextStyle(size)) {
            Box(Modifier.size(size)) { NamedFixtureGlyph(name) }
        }
    }
}
