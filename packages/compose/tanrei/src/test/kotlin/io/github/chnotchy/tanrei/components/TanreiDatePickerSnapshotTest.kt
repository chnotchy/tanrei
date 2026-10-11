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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
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
 * One baseline per fixture in `specs/date-picker.spec.json`, at `src/test/snapshots/date-picker/<fixture-id>.png`, read
 * from the spec, on the stages DTP-1's `verify` gives (light scheme): a modal fixture draws the test-only in-place
 * `TanreiDatePickerContent` — the scrim over a 480 × 640 stage of the surface color and the surface centred in it, as
 * the dialog's fixtures are drawn; a docked fixture draws the surface at its natural size centred on a 400 × 440 stage of
 * the surface color, with its elevation, without an anchor, placement or open motion. The glyphs the picker draws by
 * name are the test stand-ins ([DatePickerFixtureGlyph]). The picker's days and years are generated: no
 * fixture lists them, and no fixture fills a slot (the picker has none).
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w480dp-h720dp-xhdpi")
class TanreiDatePickerSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadDatePickerFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                key(current.id) { DatePickerStage(current) { DatePickerFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(DATE_PICKER_STAGE_TAG).captureRoboImage("$DATE_PICKER_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("date-picker")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One fixture of `specs/date-picker.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class DatePickerFixtureData(val id: String, val visible: Boolean, val props: DatePickerProps)

internal const val DATE_PICKER_SPEC = "../../../specs/date-picker.spec.json"
internal const val DATE_PICKER_SNAPSHOTS = "src/test/snapshots/date-picker"
internal const val DATE_PICKER_STAGE_TAG = "fixture"

private val DATE_PICKER_MAPPED_PROPS = setOf(
    "open", "presentation", "mode", "value", "start", "end", "min", "max", "disabledDates", "today", "firstDayOfWeek", "locale",
    "entryMode", "startView", "label", "dateLabel", "startLabel", "endLabel", "confirmLabel", "cancelLabel", "previousMonthLabel",
    "nextMonthLabel", "yearViewLabel", "textEntryLabel", "calendarEntryLabel", "todayLabel", "invalidText", "unavailableText",
)

private fun JSONArray.objects(): List<JSONObject> = (0 until length()).map(::getJSONObject)

/** A spec value (kebab-case) as the Kotlin enum constant of the same name. */
internal inline fun <reified E : Enum<E>> datePickerEnum(value: String): E =
    enumValues<E>().single { it.name.equals(value.replace("-", ""), ignoreCase = true) }

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadDatePickerFixtures(): List<DatePickerFixtureData> {
    val spec = readSpec(DATE_PICKER_SPEC)
    val defaults = spec.getJSONArray("props").objects().associate { it.getString("name") to it.get("default") }
    require(defaults.keys == DATE_PICKER_MAPPED_PROPS) { "the spec's props changed: map them here" }
    return spec.getJSONArray("fixtures").objects().map { fixture ->
        val given = fixture.getJSONObject("props")
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        fun string(name: String) = prop(name) as String
        fun date(name: String) = string(name).takeIf { it.isNotEmpty() }?.let { requireNotNull(TanreiDate.parse(it)) { "$name: $it" } }
        val disabled = prop("disabledDates") as JSONArray
        DatePickerFixtureData(
            id = fixture.getString("id"),
            visible = prop("open") as Boolean,
            props = DatePickerProps(
                presentation = datePickerEnum(string("presentation")),
                mode = datePickerEnum(string("mode")),
                value = date("value"),
                start = date("start"),
                end = date("end"),
                min = date("min"),
                max = date("max"),
                disabledDates = (0 until disabled.length()).map { requireNotNull(TanreiDate.parse(disabled.getString(it))) }.toSet(),
                today = date("today"),
                firstDayOfWeek = datePickerEnum(string("firstDayOfWeek")),
                locale = string("locale").takeIf { it.isNotEmpty() }?.let(Locale::forLanguageTag),
                entryMode = datePickerEnum(string("entryMode")),
                startView = datePickerEnum(string("startView")),
                labels = TanreiDatePickerLabels(
                    label = string("label"),
                    dateLabel = string("dateLabel"),
                    startLabel = string("startLabel"),
                    endLabel = string("endLabel"),
                    confirmLabel = string("confirmLabel"),
                    cancelLabel = string("cancelLabel"),
                    previousMonthLabel = string("previousMonthLabel"),
                    nextMonthLabel = string("nextMonthLabel"),
                    yearViewLabel = string("yearViewLabel"),
                    textEntryLabel = string("textEntryLabel"),
                    calendarEntryLabel = string("calendarEntryLabel"),
                    todayLabel = string("todayLabel"),
                    invalidText = string("invalidText"),
                    unavailableText = string("unavailableText"),
                ),
            ),
        )
    }
}

/**
 * DTP-1's stages, tagged [DATE_PICKER_STAGE_TAG]: 480 × 640 for a modal fixture (the scrim and the surface fill it), 400 ×
 * 440 for a docked one (the surface centred), both of the surface color. The picker's named glyphs draw the stand-ins.
 */
@Composable
internal fun DatePickerStage(fixture: DatePickerFixtureData, content: @Composable () -> Unit) {
    val stage = Modifier.testTag(DATE_PICKER_STAGE_TAG).background(TanreiColorRole.Surface.color)
    CompositionLocalProvider(LocalTanreiGlyphStandIn provides { name -> DatePickerFixtureGlyph(name) }) {
        if (fixture.props.presentation == TanreiDatePickerPresentation.Modal) {
            Box(stage.size(480.dp, 640.dp)) { content() }
        } else {
            Box(stage.size(400.dp, 440.dp), contentAlignment = Alignment.Center) { content() }
        }
    }
}

/** The open picker of one fixture, in place. */
@Composable
internal fun DatePickerFixture(fixture: DatePickerFixtureData, modifier: Modifier = Modifier) {
    if (!fixture.visible) return
    TanreiDatePickerContent(modifier = modifier, props = fixture.props)
}
