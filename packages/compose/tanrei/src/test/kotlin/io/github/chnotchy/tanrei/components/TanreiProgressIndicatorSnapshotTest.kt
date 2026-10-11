package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.MotionDurationScale
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
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiProgressIndicatorSize
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
 * One baseline per fixture in `specs/progress-indicator.spec.json`, at `src/test/snapshots/progress-indicator/<fixture-id>.png`,
 * read from the spec. As PRG-7's `verify` says, every fixture is recorded with reduced motion requested (the animator
 * duration scale 0), at the start of a cycle — an indeterminate fixture is the whole track in the indicator color at
 * opacity 1, the same on every platform. A bar fills a stage [STAGE_WIDTH] wide.
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiProgressIndicatorSnapshotTest {
    @get:Rule
    val rule = createComposeRule(effectContext = ReducedMotion)

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadProgressFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                ProgressStage { key(current.id) { ProgressFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(PROGRESS_STAGE_TAG).captureRoboImage("$PROGRESS_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("progress-indicator")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** Reduced motion, as the spec records it (PRG-7, LDG-4). */
internal object ReducedMotion : MotionDurationScale {
    override val scaleFactor: Float = 0f
}

/** One fixture of `specs/progress-indicator.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class ProgressFixture(
    val id: String,
    val variant: TanreiProgressIndicatorVariant,
    val size: TanreiProgressIndicatorSize,
    val value: Float?,
    val range: ClosedFloatingPointRange<Float>,
    val label: String,
    val valueText: String,
)

internal const val PROGRESS_SNAPSHOTS = "src/test/snapshots/progress-indicator"
internal const val PROGRESS_STAGE_TAG = "fixture"

/** A bar's stage (Tests only — a picture, not a design value). */
private val STAGE_WIDTH = 200.dp

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadProgressFixtures(): List<ProgressFixture> {
    val spec = JSONObject(File("../../../specs/progress-indicator.spec.json").readText())
    val declared = spec.getJSONArray("props").let { props -> (0 until props.length()).map(props::getJSONObject) }
    val defaults = declared.associate { it.getString("name") to it.get("default") }
    val fixtures = spec.getJSONArray("fixtures")
    return (0 until fixtures.length()).map { index ->
        val fixture = fixtures.getJSONObject(index)
        val given = fixture.getJSONObject("props")
        val unknown = given.keys().asSequence().filterNot { it in setOf("variant", "size", "value", "min", "max", "label", "valueText") }.toList()
        require(unknown.isEmpty()) { "fixture ${fixture.getString("id")} uses props this test does not map: $unknown" }
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        ProgressFixture(
            id = fixture.getString("id"),
            variant = TanreiProgressIndicatorVariant.entries.single { it.name.lowercase() == prop("variant") },
            size = TanreiProgressIndicatorSize(prop("size") as String).also { require(it in TanreiSystem.Tanrei.progressIndicator.sizes) { "unknown size $it" } },
            value = prop("value").let { if (it == JSONObject.NULL) null else (it as Number).toFloat() },
            range = (prop("min") as Number).toFloat()..(prop("max") as Number).toFloat(),
            label = prop("label") as String,
            valueText = prop("valueText") as String,
        )
    }
}

@Composable
internal fun ProgressStage(content: @Composable () -> Unit) {
    Box(Modifier.testTag(PROGRESS_STAGE_TAG).background(TanreiColorRole.Surface.color).padding(TanreiTheme.tokens.space.space200)) { content() }
}

@Composable
internal fun ProgressFixture(fixture: ProgressFixture) {
    val value = fixture.value
    val modifier = if (fixture.variant == TanreiProgressIndicatorVariant.Linear) Modifier.width(STAGE_WIDTH) else Modifier
    if (value == null) {
        TanreiProgressIndicator(contentDescription = fixture.label, modifier = modifier, variant = fixture.variant, size = fixture.size)
    } else {
        TanreiProgressIndicator(
            progress = { value },
            contentDescription = fixture.label,
            modifier = modifier,
            variant = fixture.variant,
            size = fixture.size,
            valueRange = fixture.range,
            stateDescription = fixture.valueText,
        )
    }
}
