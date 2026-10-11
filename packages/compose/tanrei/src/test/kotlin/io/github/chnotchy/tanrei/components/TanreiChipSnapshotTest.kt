package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
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
import io.github.chnotchy.tanrei.tokens.TanreiChipSize
import io.github.chnotchy.tanrei.tokens.TanreiChipVariant
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
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
 * One baseline per fixture in `specs/chip.spec.json`, at `src/test/snapshots/chip/<fixture-id>.png`. The fixture list is
 * read from the spec, so a new fixture fails verification until it is recorded. A fixture's `content` names its leading
 * glyph (`event`: a calendar, drawn by [NamedFixtureGlyph]) or, for an input chip, `avatar` ([FixtureAvatar], a neutral grey). The check
 * and the remove glyph are the chip's own: with no icon font installed they are drawn as vectors (the check follows the
 * checkbox's mark), which is what these baselines show.
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiChipSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadChipFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                ChipStage { key(current.id) { ChipFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(CHIP_STAGE_TAG).captureRoboImage("$CHIP_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("chip")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One fixture of `specs/chip.spec.json`, mapped to the Compose API (`platforms.compose`: the kind is the overload). */
internal class ChipFixture(
    val id: String,
    val kind: String,
    val variant: TanreiChipVariant,
    val size: TanreiChipSize,
    val selected: Boolean,
    val enabled: Boolean,
    val label: String,
    val removeLabel: String,
    val content: String?,
)

internal const val CHIP_SPEC = "../../../specs/chip.spec.json"
internal const val CHIP_SNAPSHOTS = "src/test/snapshots/chip"
internal const val CHIP_STAGE_TAG = "fixture"

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadChipFixtures(): List<ChipFixture> {
    val spec = JSONObject(File(CHIP_SPEC).readText())
    val declared = spec.getJSONArray("props").let { props -> (0 until props.length()).map(props::getJSONObject) }
    val defaults = declared.associate { it.getString("name") to it.get("default") }
    val fixtures = spec.getJSONArray("fixtures")
    return (0 until fixtures.length()).map { index ->
        val fixture = fixtures.getJSONObject(index)
        val given = fixture.getJSONObject("props")
        val unknown = given.keys().asSequence().filterNot { it in CHIP_MAPPED_PROPS }.toList()
        require(unknown.isEmpty()) { "fixture ${fixture.getString("id")} uses props this test does not map: $unknown" }
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        ChipFixture(
            id = fixture.getString("id"),
            kind = (prop("kind") as String).also { require(it in setOf("action", "filter", "input")) { "unknown kind $it" } },
            // Spec values ARE the keys of the token axes; a fixture may only name a value the default system has.
            variant = TanreiChipVariant(prop("variant") as String).also { require(it in TanreiSystem.Tanrei.chip.variants) { "unknown variant $it" } },
            size = TanreiChipSize(prop("size") as String).also { require(it in TanreiSystem.Tanrei.chip.sizes) { "unknown size $it" } },
            selected = prop("selected") as Boolean,
            enabled = !(prop("disabled") as Boolean),
            label = prop("label") as String,
            removeLabel = prop("removeLabel") as String,
            content = if (fixture.has("content")) fixture.getString("content") else null,
        )
    }
}

private val CHIP_MAPPED_PROPS = setOf("kind", "variant", "size", "selected", "disabled", "label", "removeLabel")

/** The surface a chip fixture is drawn on, `space200` around it. Tagged [CHIP_STAGE_TAG]. */
@Composable
internal fun ChipStage(content: @Composable () -> Unit) {
    Box(Modifier.testTag(CHIP_STAGE_TAG).background(TanreiColorRole.Surface.color).padding(TanreiTheme.tokens.space.space200)) { content() }
}

/** The chip of one fixture: its kind is the overload (`platforms.compose`). */
@Composable
internal fun ChipFixture(fixture: ChipFixture) {
    val icon: (@Composable () -> Unit)? = fixture.content?.takeIf { it != "avatar" }?.let { name -> { NamedFixtureGlyph(name) } }
    when (fixture.kind) {
        "filter" -> TanreiChip(
            selected = fixture.selected,
            onSelectedChange = {},
            label = fixture.label,
            variant = fixture.variant,
            size = fixture.size,
            enabled = fixture.enabled,
            icon = icon,
        )
        "input" -> TanreiChip(
            onClick = {},
            onRemove = {},
            label = fixture.label,
            removeContentDescription = fixture.removeLabel,
            variant = fixture.variant,
            size = fixture.size,
            enabled = fixture.enabled,
            icon = icon,
            avatar = if (fixture.content == "avatar") { { FixtureAvatar() } } else null,
        )
        else -> TanreiChip(onClick = {}, label = fixture.label, variant = fixture.variant, size = fixture.size, enabled = fixture.enabled, icon = icon)
    }
}

/**
 * The stand-in for the fixtures' `avatar` (no image is shared across platforms yet): one neutral grey,
 * no person and no text — the same grey React Native's harness draws —, so a baseline shows the avatar's size, clip and
 * fade and nothing else. Tests only.
 */
@Composable
internal fun FixtureAvatar() {
    Box(Modifier.fillMaxSize().background(FIXTURE_AVATAR_GREY))
}

/** The fixture avatar's grey (#9E9E9E). */
internal val FIXTURE_AVATAR_GREY = Color(0xFF9E9E9E)
