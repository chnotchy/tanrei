package io.github.chnotchy.tanrei.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.github.takahirom.roborazzi.captureRoboImage
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import io.github.chnotchy.tanrei.tokens.TanreiTextFieldSize
import io.github.chnotchy.tanrei.tokens.TanreiTextFieldVariant
import java.io.File
import org.json.JSONObject
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * One baseline per fixture in `specs/text-field.spec.json`, at `src/test/snapshots/text-field/<fixture-id>.png`, read
 * from the spec: the field [TEXT_FIELD_STAGE_WIDTH] wide on the surface, `space200` around it, light scheme, unfocused
 * (focus cannot be a fixture). A fixture's icons (`leading-icon=search trailing-icon=close`)
 * are stand-in glyphs — a magnifier and a cross stroked by the glyph's weight in the icon color —, as no icon font is
 * bundled.
 *
 * Record deliberately with `./gradlew :tanrei:recordRoborazziDebug`; CI runs `verifyRoborazziDebug`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiTextFieldSnapshotTest {
    @get:Rule
    val rule = createComposeRule()

    @Test
    fun `every spec fixture matches its baseline`() {
        val fixtures = loadTextFieldFixtures()
        assertTrue("the spec declares fixtures", fixtures.isNotEmpty())

        var current by mutableStateOf(fixtures.first())
        rule.setContent {
            TanreiTheme(theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                TextFieldStage { key(current.id) { TextFieldFixture(current) } }
            }
        }

        val failures = fixtures.mapNotNull { fixture ->
            current = fixture
            rule.waitForIdle()
            runCatching { rule.onNodeWithTag(TEXT_FIELD_STAGE_TAG).captureRoboImage("$TEXT_FIELD_SNAPSHOTS/${fixture.id}.png", roborazziOptions = failureArtifactsIn("text-field")) }
                .exceptionOrNull()
                ?.let { "${fixture.id}: ${it.message}" }
        }
        assertTrue("snapshot mismatches:\n${failures.joinToString("\n")}", failures.isEmpty())
    }
}

/** One fixture of `specs/text-field.spec.json`, mapped to the Compose API (`platforms.compose`). */
internal class TextFieldFixture(
    val id: String,
    val variant: TanreiTextFieldVariant,
    val size: TanreiTextFieldSize,
    val type: TanreiTextFieldType,
    val value: String,
    val label: String,
    val labelHidden: Boolean,
    val placeholder: String,
    val supportingText: String,
    val errorText: String,
    val isError: Boolean,
    val enabled: Boolean,
    val readOnly: Boolean,
    val required: Boolean,
    val singleLine: Boolean,
    val minLines: Int,
    val maxLines: Int,
    val maxLength: Int,
    val counter: Boolean,
    val prefix: String,
    val suffix: String,
    val contentType: String,
    /** From `content`: `leading-icon=<glyph> trailing-icon=<glyph>`. */
    val leadingIcon: String?,
    val trailingIcon: String?,
)

internal const val TEXT_FIELD_SPEC = "../../../specs/text-field.spec.json"
internal const val TEXT_FIELD_SNAPSHOTS = "src/test/snapshots/text-field"
internal const val TEXT_FIELD_STAGE_TAG = "fixture"

/** The width every fixture is drawn at: a field fills the width its layout gives it. Tests only. */
internal val TEXT_FIELD_STAGE_WIDTH = 280.dp

/** Every fixture of the spec, with the spec's defaults filled in. A prop this mapping does not know fails. */
internal fun loadTextFieldFixtures(): List<TextFieldFixture> {
    val spec = JSONObject(File(TEXT_FIELD_SPEC).readText())
    val declared = spec.getJSONArray("props").let { props -> (0 until props.length()).map(props::getJSONObject) }
    val defaults = declared.associate { it.getString("name") to it.get("default") }
    val fixtures = spec.getJSONArray("fixtures")
    return (0 until fixtures.length()).map { index ->
        val fixture = fixtures.getJSONObject(index)
        val given = fixture.getJSONObject("props")
        val unknown = given.keys().asSequence().filterNot { it in TEXT_FIELD_MAPPED_PROPS }.toList()
        require(unknown.isEmpty()) { "fixture ${fixture.getString("id")} uses props this test does not map: $unknown" }
        fun prop(name: String): Any = if (given.has(name)) given.get(name) else defaults.getValue(name)
        val icons = fixture.optString("content").split(' ').filter { '=' in it }.associate { it.substringBefore('=') to it.substringAfter('=') }
        TextFieldFixture(
            id = fixture.getString("id"),
            // Spec values ARE the keys of the token axes; a fixture may only name a value the default system has.
            variant = TanreiTextFieldVariant(prop("variant") as String).also { require(it in TanreiSystem.Tanrei.textField.variants) { "unknown variant $it" } },
            size = TanreiTextFieldSize(prop("size") as String).also { require(it in TanreiSystem.Tanrei.textField.sizes) { "unknown size $it" } },
            type = TanreiTextFieldType.entries.single { it.name.lowercase() == prop("type") },
            value = prop("value") as String,
            label = prop("label") as String,
            labelHidden = prop("labelHidden") as Boolean,
            placeholder = prop("placeholder") as String,
            supportingText = prop("supportingText") as String,
            errorText = prop("errorText") as String,
            isError = prop("error") as Boolean,
            enabled = !(prop("disabled") as Boolean),
            readOnly = prop("readOnly") as Boolean,
            required = prop("required") as Boolean,
            singleLine = !(prop("multiline") as Boolean),
            minLines = (prop("minRows") as Number).toInt(),
            maxLines = (prop("maxRows") as Number).toInt(),
            maxLength = (prop("maxLength") as Number).toInt(),
            counter = prop("counter") as Boolean,
            prefix = prop("prefixText") as String,
            suffix = prop("suffixText") as String,
            contentType = prop("autocomplete") as String,
            leadingIcon = icons["leading-icon"],
            trailingIcon = icons["trailing-icon"],
        )
    }
}

private val TEXT_FIELD_MAPPED_PROPS = setOf(
    "variant", "size", "type", "value", "label", "labelHidden", "placeholder", "supportingText", "errorText", "error",
    "disabled", "readOnly", "required", "multiline", "minRows", "maxRows", "maxLength", "counter", "prefixText",
    "suffixText", "autocomplete",
)

/** The surface a text-field fixture is drawn on, `space200` around it. Tagged [TEXT_FIELD_STAGE_TAG]. */
@Composable
internal fun TextFieldStage(content: @Composable () -> Unit) {
    Box(Modifier.testTag(TEXT_FIELD_STAGE_TAG).background(TanreiColorRole.Surface.color).padding(TanreiTheme.tokens.space.space200)) { content() }
}

/** The field of one fixture, [TEXT_FIELD_STAGE_WIDTH] wide; it really edits (its value is state). */
@Composable
internal fun TextFieldFixture(fixture: TextFieldFixture) {
    var value by remember(fixture) { mutableStateOf(fixture.value) }
    val iconSize = TanreiTheme.tokens.textField.sizes[fixture.size].iconSize
    TanreiTextField(
        value = value,
        onValueChange = { value = it },
        label = fixture.label,
        modifier = Modifier.width(TEXT_FIELD_STAGE_WIDTH),
        variant = fixture.variant,
        size = fixture.size,
        type = fixture.type,
        labelHidden = fixture.labelHidden,
        placeholder = fixture.placeholder,
        supportingText = fixture.supportingText,
        errorText = fixture.errorText,
        isError = fixture.isError,
        enabled = fixture.enabled,
        readOnly = fixture.readOnly,
        required = fixture.required,
        singleLine = fixture.singleLine,
        minLines = fixture.minLines,
        maxLines = fixture.maxLines,
        maxLength = fixture.maxLength,
        counter = fixture.counter,
        prefix = fixture.prefix,
        suffix = fixture.suffix,
        contentType = fixture.contentType,
        leadingIcon = fixture.leadingIcon?.let { name -> { FieldGlyph(name, Modifier.size(iconSize)) } },
        trailingIcon = fixture.trailingIcon?.let { name -> { FieldGlyph(name, Modifier.size(iconSize)) } },
    )
}

/**
 * The stand-in for the icon font's glyph [name] (`search`: a magnifier; anything else: a cross), stroked by the
 * glyph's weight in the icon color the slot gives it. Tests only — the proportions describe a picture, not a design
 * value.
 */
@Composable
internal fun FieldGlyph(name: String, modifier: Modifier) {
    val glyph = LocalTanreiIconGlyph.current
    val color = LocalTanreiContentColor.current
    Canvas(modifier) {
        val stroke = size.minDimension * glyph.weight / STROKE_PER_WEIGHT
        fun at(x: Float, y: Float) = Offset(size.width * x, size.height * y)
        if (name == "search") {
            drawCircle(color, radius = size.minDimension * 0.27f, center = at(0.42f, 0.42f), style = Stroke(stroke))
            drawLine(color, at(0.62f, 0.62f), at(0.82f, 0.82f), stroke, StrokeCap.Round)
        } else {
            drawLine(color, at(0.28f, 0.28f), at(0.72f, 0.72f), stroke, StrokeCap.Round)
            drawLine(color, at(0.72f, 0.28f), at(0.28f, 0.72f), stroke, StrokeCap.Round)
        }
    }
}

/** Weight 400 strokes a tenth of the box. */
private const val STROKE_PER_WEIGHT = 4000f
