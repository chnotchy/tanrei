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
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiFabSize
import io.github.chnotchy.tanrei.tokens.TanreiFabVariant
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import java.io.File
import org.json.JSONObject
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * One baseline per fixture in `specs/fab.spec.json`, at `src/test/snapshots/fab/<fixture-id>.png`. The fixture list is
 * read from the spec, so a new fixture fails verification until it is recorded. The stage leaves `space600` around the
 * FAB, so the whole shadow of its resting level is in the image. The fixtures' `add` is drawn by [NamedFixtureGlyph]
 * (a plus), as no icon font is bundled.
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiFabSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadFabFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                FabStage { key(current.id) { FabFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(FAB_STAGE_TAG).captureRoboImage("$FAB_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("fab")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One fixture of `specs/fab.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class FabFixture(
    val id: String,
    val variant: TanreiFabVariant,
    val size: TanreiFabSize,
    val enabled: Boolean,
    val label: String,
    val content: String,
)

internal const val FAB_SPEC = "../../../specs/fab.spec.json"
internal const val FAB_SNAPSHOTS = "src/test/snapshots/fab"
internal const val FAB_STAGE_TAG = "fixture"

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadFabFixtures(): List<FabFixture> {
    val spec = JSONObject(File(FAB_SPEC).readText())
    val declared = spec.getJSONArray("props").let { props -> (0 until props.length()).map(props::getJSONObject) }
    val defaults = declared.associate { it.getString("name") to it.get("default") }
    val fixtures = spec.getJSONArray("fixtures")
    return (0 until fixtures.length()).map { index ->
        val fixture = fixtures.getJSONObject(index)
        val given = fixture.getJSONObject("props")
        val unknown = given.keys().asSequence().filterNot { it in FAB_MAPPED_PROPS }.toList()
        require(unknown.isEmpty()) { "fixture ${fixture.getString("id")} uses props this test does not map: $unknown" }
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        FabFixture(
            id = fixture.getString("id"),
            // Spec values ARE the keys of the token axes; a fixture may only name a value the default system has.
            variant = TanreiFabVariant(prop("variant") as String).also { require(it in TanreiSystem.Tanrei.fab.variants) { "unknown variant $it" } },
            size = TanreiFabSize(prop("size") as String).also { require(it in TanreiSystem.Tanrei.fab.sizes) { "unknown size $it" } },
            enabled = !(prop("disabled") as Boolean),
            label = prop("label") as String,
            content = fixture.getString("content"),
        )
    }
}

private val FAB_MAPPED_PROPS = setOf("variant", "size", "disabled", "label")

/** The surface a FAB fixture is drawn on, `space600` around it (room for the shadow). Tagged [FAB_STAGE_TAG]. */
@Composable
internal fun FabStage(content: @Composable () -> Unit) {
    Box(Modifier.testTag(FAB_STAGE_TAG).background(TanreiColorRole.Surface.color).padding(TanreiTheme.tokens.space.space600)) { content() }
}

/** The FAB of one fixture, with [NamedFixtureGlyph] as its icon. */
@Composable
internal fun FabFixture(fixture: FabFixture) {
    TanreiFloatingActionButton(
        onClick = {},
        contentDescription = fixture.label,
        variant = fixture.variant,
        size = fixture.size,
        enabled = fixture.enabled,
    ) {
        NamedFixtureGlyph(fixture.content)
    }
}
