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
import io.github.chnotchy.tanrei.primitives.TanreiText
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiCardVariant
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
 * One baseline per fixture in `specs/card.spec.json`, at `src/test/snapshots/card/<fixture-id>.png`, read from the
 * spec: the card on the surface, `space200` around it (room for the elevated card's shadow), light scheme. The
 * fixture's content is one [TanreiText] in the theme's body style and the content color the card hands it; the card
 * wraps it at the stage's width.
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiCardSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadCardFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                CardStage { key(current.id) { CardFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(CARD_STAGE_TAG).captureRoboImage("$CARD_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("card")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One fixture of `specs/card.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class CardFixture(
    val id: String,
    val variant: TanreiCardVariant,
    val interactive: Boolean,
    val enabled: Boolean,
    val inset: Boolean,
    val label: String,
    val content: String,
)

internal const val CARD_SPEC = "../../../specs/card.spec.json"
internal const val CARD_SNAPSHOTS = "src/test/snapshots/card"
internal const val CARD_STAGE_TAG = "fixture"

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadCardFixtures(): List<CardFixture> {
    val spec = JSONObject(File(CARD_SPEC).readText())
    val declared = spec.getJSONArray("props").let { props -> (0 until props.length()).map(props::getJSONObject) }
    val defaults = declared.associate { it.getString("name") to it.get("default") }
    val fixtures = spec.getJSONArray("fixtures")
    return (0 until fixtures.length()).map { index ->
        val fixture = fixtures.getJSONObject(index)
        val given = fixture.getJSONObject("props")
        val unknown = given.keys().asSequence().filterNot { it in CARD_MAPPED_PROPS }.toList()
        require(unknown.isEmpty()) { "fixture ${fixture.getString("id")} uses props this test does not map: $unknown" }
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        CardFixture(
            id = fixture.getString("id"),
            // Spec values ARE the keys of the token axis; a fixture may only name a value the default system has.
            variant = TanreiCardVariant(prop("variant") as String).also { require(it in TanreiSystem.Tanrei.card.variants) { "unknown variant $it" } },
            interactive = prop("interactive") as Boolean,
            enabled = !(prop("disabled") as Boolean),
            inset = prop("inset") as Boolean,
            label = prop("label") as String,
            content = fixture.getString("content"),
        )
    }
}

private val CARD_MAPPED_PROPS = setOf("variant", "interactive", "disabled", "inset", "label")

/** The surface a card fixture is drawn on, `space200` around it. Tagged [CARD_STAGE_TAG]. */
@Composable
internal fun CardStage(content: @Composable () -> Unit) {
    Box(Modifier.testTag(CARD_STAGE_TAG).background(TanreiColorRole.Surface.color).padding(TanreiTheme.tokens.space.space200)) { content() }
}

/** The card of one fixture: `interactive` is the overload with `onClick` (`platforms.compose`), its content one text. */
@Composable
internal fun CardFixture(fixture: CardFixture) {
    if (fixture.interactive) {
        TanreiCard(onClick = {}, variant = fixture.variant, enabled = fixture.enabled, inset = fixture.inset, contentDescription = fixture.label) {
            TanreiText(fixture.content)
        }
    } else {
        TanreiCard(variant = fixture.variant, inset = fixture.inset, contentDescription = fixture.label) {
            TanreiText(fixture.content)
        }
    }
}
