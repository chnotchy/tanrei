package io.github.chnotchy.tanrei.components

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.github.takahirom.roborazzi.captureRoboImage
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiExtendedFabSize
import io.github.chnotchy.tanrei.tokens.TanreiExtendedFabVariant
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
 * One baseline per fixture in `specs/extended-fab.spec.json`, at `src/test/snapshots/extended-fab/<fixture-id>.png`. The
 * fixture list is read from the spec, so a new fixture fails verification until it is recorded. The stage is the FAB's
 * ([FabStage]: `space600` around it, room for the whole shadow). The fixtures' `edit` is drawn by [NamedFixtureGlyph]
 * (a pencil); a fixture without content has no icon.
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiExtendedFabSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadExtendedFabFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                FabStage { key(current.id) { ExtendedFabFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(FAB_STAGE_TAG).captureRoboImage("$EXTENDED_FAB_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("extended-fab")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One fixture of `specs/extended-fab.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class ExtendedFabFixture(
    val id: String,
    val variant: TanreiExtendedFabVariant,
    val size: TanreiExtendedFabSize,
    val expanded: Boolean,
    val enabled: Boolean,
    val label: String,
    val content: String?,
)

internal const val EXTENDED_FAB_SPEC = "../../../specs/extended-fab.spec.json"
internal const val EXTENDED_FAB_SNAPSHOTS = "src/test/snapshots/extended-fab"

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadExtendedFabFixtures(): List<ExtendedFabFixture> {
    val spec = JSONObject(File(EXTENDED_FAB_SPEC).readText())
    val declared = spec.getJSONArray("props").let { props -> (0 until props.length()).map(props::getJSONObject) }
    val defaults = declared.associate { it.getString("name") to it.get("default") }
    val fixtures = spec.getJSONArray("fixtures")
    return (0 until fixtures.length()).map { index ->
        val fixture = fixtures.getJSONObject(index)
        val given = fixture.getJSONObject("props")
        val unknown = given.keys().asSequence().filterNot { it in EXTENDED_FAB_MAPPED_PROPS }.toList()
        require(unknown.isEmpty()) { "fixture ${fixture.getString("id")} uses props this test does not map: $unknown" }
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        ExtendedFabFixture(
            id = fixture.getString("id"),
            // Spec values ARE the keys of the token axes; a fixture may only name a value the default system has.
            variant = TanreiExtendedFabVariant(prop("variant") as String).also { require(it in TanreiSystem.Tanrei.extendedFab.variants) { "unknown variant $it" } },
            size = TanreiExtendedFabSize(prop("size") as String).also { require(it in TanreiSystem.Tanrei.extendedFab.sizes) { "unknown size $it" } },
            expanded = prop("expanded") as Boolean,
            enabled = !(prop("disabled") as Boolean),
            label = prop("label") as String,
            content = if (fixture.has("content")) fixture.getString("content") else null,
        )
    }
}

private val EXTENDED_FAB_MAPPED_PROPS = setOf("variant", "size", "expanded", "disabled", "label")

/** The extended FAB of one fixture, with [NamedFixtureGlyph] as its icon when the fixture names one. */
@Composable
internal fun ExtendedFabFixture(fixture: ExtendedFabFixture) {
    TanreiExtendedFloatingActionButton(
        text = fixture.label,
        onClick = {},
        variant = fixture.variant,
        size = fixture.size,
        expanded = fixture.expanded,
        enabled = fixture.enabled,
        icon = fixture.content?.let { name -> { NamedFixtureGlyph(name) } },
    )
}
