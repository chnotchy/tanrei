package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
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
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiSliderSize
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
 * One baseline per fixture in `specs/slider.spec.json`, at `src/test/snapshots/slider/<fixture-id>.png`, read from the
 * spec, on the stages SLD-7's `verify` gives (light scheme, on the page's surface): a horizontal slider 320 long, centred
 * in a 320 × 96 stage — room above the handle for its value indicator —, the vertical one 240 long in a 96 × 240 stage.
 * The value indicator is drawn in place (`LocalTanreiSliderIndicatorInPlace`): an app gets it in a popup, which a node
 * capture does not show.
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w400dp-h640dp-xhdpi")
class TanreiSliderSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadSliderFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                key(current.id) { SliderStage(current) { SliderFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(SLIDER_STAGE_TAG).captureRoboImage("$SLIDER_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("slider")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One fixture of `specs/slider.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class SliderFixture(
    val id: String,
    val size: TanreiSliderSize,
    val orientation: Orientation,
    val value: Float,
    val startValue: Float,
    val range: Boolean,
    val min: Float,
    val max: Float,
    val step: Float,
    val origin: Float?,
    val stops: Boolean,
    val valueIndicator: TanreiSliderValueIndicator,
    val enabled: Boolean,
    val label: String,
    val startLabel: String,
    val valueText: String,
    val startValueText: String,
)

internal const val SLIDER_SPEC = "../../../specs/slider.spec.json"
internal const val SLIDER_SNAPSHOTS = "src/test/snapshots/slider"
internal const val SLIDER_STAGE_TAG = "fixture"

private val SLIDER_MAPPED_PROPS = setOf("size", "orientation", "value", "startValue", "range", "min", "max", "step", "origin", "stops", "valueIndicator", "disabled", "label", "startLabel", "valueText", "startValueText")

private fun JSONArray.objects(): List<JSONObject> = (0 until length()).map(::getJSONObject)

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadSliderFixtures(): List<SliderFixture> {
    val spec = JSONObject(File(SLIDER_SPEC).readText())
    val defaults = spec.getJSONArray("props").objects().associate { it.getString("name") to it.opt("default") }
    require(defaults.keys == SLIDER_MAPPED_PROPS) { "the spec's props changed: map them here" }
    return spec.getJSONArray("fixtures").objects().map { fixture ->
        val given = fixture.getJSONObject("props")
        fun prop(name: String): Any? = if (given.has(name)) given.get(name) else defaults.getValue(name)
        fun number(name: String): Float = (prop(name) as Number).toFloat()
        SliderFixture(
            id = fixture.getString("id"),
            size = TanreiSliderSize(prop("size") as String),
            orientation = Orientation.entries.single { it.name.lowercase() == prop("orientation") },
            value = number("value"),
            startValue = number("startValue"),
            range = prop("range") as Boolean,
            min = number("min"),
            max = number("max"),
            step = number("step"),
            origin = (prop("origin").takeUnless { it == null || it == JSONObject.NULL } as Number?)?.toFloat(),
            stops = prop("stops") as Boolean,
            valueIndicator = TanreiSliderValueIndicator.entries.single { it.name.lowercase() == prop("valueIndicator") },
            enabled = !(prop("disabled") as Boolean),
            label = prop("label") as String,
            startLabel = prop("startLabel") as String,
            valueText = prop("valueText") as String,
            startValueText = prop("startValueText") as String,
        )
    }
}

/** SLD-7's stage on the page's surface: 320 × 96 with the slider 320 long across its middle; 96 × 240 for a vertical one. */
@Composable
internal fun SliderStage(fixture: SliderFixture, content: @Composable () -> Unit) {
    val vertical = fixture.orientation == Orientation.Vertical
    Box(
        Modifier.testTag(SLIDER_STAGE_TAG).then(if (vertical) Modifier.size(96.dp, 240.dp) else Modifier.size(320.dp, 96.dp)).background(TanreiColorRole.Surface.color),
        contentAlignment = Alignment.Center,
    ) {
        Box(if (vertical) Modifier.height(240.dp) else Modifier.width(320.dp), contentAlignment = Alignment.Center) {
            CompositionLocalProvider(LocalTanreiSliderIndicatorInPlace provides true) { content() }
        }
    }
}

/** The slider of one fixture: its props as `platforms.compose` maps them (the range overload when `range`). */
@Composable
internal fun SliderFixture(fixture: SliderFixture, onValueChange: (Float) -> Unit = {}, onRangeChange: (ClosedFloatingPointRange<Float>) -> Unit = {}) {
    if (fixture.range) {
        TanreiSlider(
            value = fixture.startValue..fixture.value,
            onValueChange = onRangeChange,
            contentDescription = fixture.label,
            startContentDescription = fixture.startLabel,
            enabled = fixture.enabled,
            valueRange = fixture.min..fixture.max,
            step = fixture.step,
            showStops = fixture.stops,
            size = fixture.size,
            orientation = fixture.orientation,
            valueIndicator = fixture.valueIndicator,
            stateDescription = fixture.valueText,
            startStateDescription = fixture.startValueText,
        )
    } else {
        TanreiSlider(
            value = fixture.value,
            onValueChange = onValueChange,
            contentDescription = fixture.label,
            enabled = fixture.enabled,
            valueRange = fixture.min..fixture.max,
            step = fixture.step,
            origin = fixture.origin,
            showStops = fixture.stops,
            size = fixture.size,
            orientation = fixture.orientation,
            valueIndicator = fixture.valueIndicator,
            stateDescription = fixture.valueText,
        )
    }
}
