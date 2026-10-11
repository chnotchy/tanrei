package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.github.takahirom.roborazzi.captureRoboImage
import io.github.chnotchy.tanrei.primitives.LocalTanreiGlyphStandIn
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import java.util.Locale
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * One baseline per fixture in `specs/time-picker.spec.json`, at `src/test/snapshots/time-picker/<fixture-id>.png`, read
 * from the spec, on the stages TMP-1's `verify` gives (light scheme): the test-only in-place `TanreiTimePickerContent` —
 * the scrim over a 480 × 640 stage of the surface color (720 × 480 for the horizontal fixture) and the surface centred in
 * it, as the dialog's fixtures are drawn. The glyphs the picker draws by name are the test stand-ins
 * ([TimePickerFixtureGlyph]). The picker has no slots and no items.
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w720dp-h720dp-xhdpi")
class TanreiTimePickerSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadTimePickerFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                key(current.id) { TimePickerStage(current) { TimePickerFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(TIME_PICKER_STAGE_TAG).captureRoboImage("$TIME_PICKER_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("time-picker")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One fixture of `specs/time-picker.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class TimePickerFixtureData(val id: String, val visible: Boolean, val props: TimePickerProps)

internal const val TIME_PICKER_SPEC = "../../../specs/time-picker.spec.json"
internal const val TIME_PICKER_SNAPSHOTS = "src/test/snapshots/time-picker"
internal const val TIME_PICKER_STAGE_TAG = "fixture"

private val TIME_PICKER_MAPPED_PROPS = setOf(
    "open", "value", "hourCycle", "entryMode", "unit", "layout", "locale", "label", "hourLabel", "minuteLabel", "confirmLabel",
    "cancelLabel", "textEntryLabel", "dialEntryLabel", "invalidText",
)

private fun JSONArray.objects(): List<JSONObject> = (0 until length()).map(::getJSONObject)

/** A spec value (kebab-case) as the Kotlin enum constant of the same name. */
internal inline fun <reified E : Enum<E>> timePickerEnum(value: String): E =
    enumValues<E>().single { it.name.equals(value.replace("-", ""), ignoreCase = true) }

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadTimePickerFixtures(): List<TimePickerFixtureData> {
    val spec = readSpec(TIME_PICKER_SPEC)
    val defaults = spec.getJSONArray("props").objects().associate { it.getString("name") to it.get("default") }
    require(defaults.keys == TIME_PICKER_MAPPED_PROPS) { "the spec's props changed: map them here" }
    return spec.getJSONArray("fixtures").objects().map { fixture ->
        val given = fixture.getJSONObject("props")
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        fun string(name: String) = prop(name) as String
        TimePickerFixtureData(
            id = fixture.getString("id"),
            visible = prop("open") as Boolean,
            props = TimePickerProps(
                value = string("value").takeIf { it.isNotEmpty() }?.let { requireNotNull(TanreiTime.parse(it)) { "value: $it" } },
                hourCycle = timePickerEnum(string("hourCycle")),
                entryMode = timePickerEnum(string("entryMode")),
                unit = timePickerEnum(string("unit")),
                layout = timePickerEnum(string("layout")),
                locale = string("locale").takeIf { it.isNotEmpty() }?.let(Locale::forLanguageTag),
                labels = TanreiTimePickerLabels(
                    label = string("label"),
                    hourLabel = string("hourLabel"),
                    minuteLabel = string("minuteLabel"),
                    confirmLabel = string("confirmLabel"),
                    cancelLabel = string("cancelLabel"),
                    textEntryLabel = string("textEntryLabel"),
                    dialEntryLabel = string("dialEntryLabel"),
                    invalidText = string("invalidText"),
                ),
            ),
        )
    }
}

/** TMP-1's stage of [fixture]: 480 × 640, or 720 × 480 for the horizontal layout. */
internal fun timePickerStageSize(fixture: TimePickerFixtureData): DpSize =
    if (fixture.props.layout == TanreiTimePickerLayout.Horizontal) DpSize(720.dp, 480.dp) else DpSize(480.dp, 640.dp)

/** TMP-1's stage, tagged [TIME_PICKER_STAGE_TAG], of the surface color. The picker's named glyphs draw the stand-ins. */
@Composable
internal fun TimePickerStage(fixture: TimePickerFixtureData, content: @Composable () -> Unit) {
    CompositionLocalProvider(LocalTanreiGlyphStandIn provides { name -> TimePickerFixtureGlyph(name) }) {
        Box(Modifier.testTag(TIME_PICKER_STAGE_TAG).background(TanreiColorRole.Surface.color).size(timePickerStageSize(fixture))) { content() }
    }
}

/** The open picker of one fixture, in place. */
@Composable
internal fun TimePickerFixture(fixture: TimePickerFixtureData, modifier: Modifier = Modifier) {
    if (!fixture.visible) return
    TanreiTimePickerContent(modifier = modifier, props = fixture.props)
}
