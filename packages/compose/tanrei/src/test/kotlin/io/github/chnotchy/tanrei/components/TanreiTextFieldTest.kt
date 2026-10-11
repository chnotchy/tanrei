package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import android.text.InputType
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.MotionDurationScale
import androidx.compose.ui.autofill.ContentType
import androidx.compose.ui.focus.FocusManager
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PixelMap
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.platform.InterceptPlatformTextInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.getOrNull
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertHasClickAction
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsNotFocused
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.hasClickAction
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.junit4.accessibility.enableAccessibilityChecks
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performImeAction
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performMouseInput
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.test.performTextClearance
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.test.performTextInputSelection
import androidx.compose.ui.test.performTextReplacement
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.test.tryPerformAccessibilityChecks
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.acme.design.Acme
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiIconGlyph
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.glyph
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiFocusStyle
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import io.github.chnotchy.tanrei.tokens.TanreiTextFieldSize
import io.github.chnotchy.tanrei.tokens.TanreiTextFieldVariant
import io.github.chnotchy.tanrei.tokens.TanreiTextFieldVariantStateTokens
import java.io.File
import kotlin.math.abs
import kotlinx.coroutines.awaitCancellation
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TestRule
import org.junit.runner.RunWith
import org.junit.runners.model.Statement
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Behaviour tests for `specs/text-field.spec.json`. Each test names the behaviour id (`TXF-n`) it covers. Runs on the
 * JVM (Robolectric, native graphics).
 *
 * The field is [W] wide on the surface, [STAGE] around it. Input methods are driven through the platform's own path:
 * [InterceptPlatformTextInput] hands the test the [InputConnection] Compose gives the soft keyboard, so a composition
 * (`setComposingText`, `commitText`) and the editor's attributes (`EditorInfo.inputType`) are what an IME sees.
 */
@OptIn(ExperimentalTestApi::class, ExperimentalComposeUiApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiTextFieldTest {
    /** Tests marked [KeyboardNavigation] start in keyboard (non-touch) input mode (see `TanreiButtonTest`). */
    @get:Rule(order = 0)
    val inputMode = TestRule { base, description ->
        object : Statement() {
            override fun evaluate() {
                val instrumentation = InstrumentationRegistry.getInstrumentation()
                instrumentation.setInTouchMode(description.getAnnotation(KeyboardNavigation::class.java) == null)
                try {
                    base.evaluate()
                } finally {
                    instrumentation.setInTouchMode(true)
                }
            }
        }
    }

    @get:Rule(order = 1)
    val rule = createComposeRule()

    private val tanrei = TanreiSystem.Tanrei
    private val colors = tanrei.colors.light
    private val tokens = tanrei.textField
    private val medium = tokens.sizes.medium
    private val surface = colors[TanreiColorRole.Surface]

    /** Everything the field emitted, in order: `input:<value>`, `change:<value>`, `action`. */
    private val events = mutableListOf<String>()

    /** The product's value. With [echo] (the default) every input is written back, as a controlled field is. */
    private var productValue by mutableStateOf("")
    private var echo = true
    private var connection: InputConnection? = null
    private var editorInfo: EditorInfo? = null
    private lateinit var focusManager: FocusManager

    @Before
    fun setUp() {
        // ATF checks: NOT_RUN under Robolectric (see TanreiButtonTest); they run for real in the gallery's
        // instrumented tests. The explicit semantics assertions below guard accessibility here.
        rule.enableAccessibilityChecks()
    }

    /** What [setField] renders; changing it recomposes the one scene a test may set. */
    private class Scene(
        val variant: TanreiTextFieldVariant,
        val size: TanreiTextFieldSize,
        val type: TanreiTextFieldType,
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
        val system: TanreiSystem,
        val direction: LayoutDirection,
        val fontScale: Float,
        val leading: (@Composable () -> Unit)?,
        val trailing: (@Composable () -> Unit)?,
        val width: Dp,
    )

    private var scene by mutableStateOf<Scene?>(null)

    private fun setField(
        value: String = "",
        variant: TanreiTextFieldVariant = TanreiTextFieldVariant.Outlined,
        size: TanreiTextFieldSize = TanreiTextFieldSize.Medium,
        type: TanreiTextFieldType = TanreiTextFieldType.Text,
        label: String = LABEL,
        labelHidden: Boolean = false,
        placeholder: String = "",
        supportingText: String = "",
        errorText: String = "",
        isError: Boolean = false,
        enabled: Boolean = true,
        readOnly: Boolean = false,
        required: Boolean = false,
        singleLine: Boolean = true,
        minLines: Int = 2,
        maxLines: Int = 0,
        maxLength: Int = 0,
        counter: Boolean = false,
        prefix: String = "",
        suffix: String = "",
        contentType: String = "",
        system: TanreiSystem = tanrei,
        direction: LayoutDirection = LayoutDirection.Ltr,
        fontScale: Float = 1f,
        leading: (@Composable () -> Unit)? = null,
        trailing: (@Composable () -> Unit)? = null,
        width: Dp = W,
    ) {
        productValue = value
        val first = scene == null
        scene = Scene(
            variant, size, type, label, labelHidden, placeholder, supportingText, errorText, isError, enabled, readOnly, required, singleLine, minLines, maxLines,
            maxLength, counter, prefix, suffix, contentType, system, direction, fontScale, leading, trailing, width,
        )
        if (!first) {
            rule.waitForIdle()
            return
        }
        rule.setContent {
            focusManager = LocalFocusManager.current
            val current = scene ?: return@setContent
            key(current) {
                val density = LocalDensity.current
                CompositionLocalProvider(LocalLayoutDirection provides current.direction, LocalDensity provides Density(density.density, current.fontScale)) {
                    TanreiTheme(system = current.system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                        InterceptPlatformTextInput({ request, _ ->
                            val info = EditorInfo()
                            connection = request.createInputConnection(info)
                            editorInfo = info
                            awaitCancellation()
                        }) {
                            Box(Modifier.testTag(STAGE_TAG).background(TanreiColorRole.Surface.color).padding(STAGE)) {
                                TanreiTextField(
                                    value = productValue,
                                    onValueChange = { events += "input:$it"; if (echo) productValue = it },
                                    label = current.label,
                                    modifier = Modifier.testTag(TAG).width(current.width),
                                    variant = current.variant,
                                    size = current.size,
                                    type = current.type,
                                    labelHidden = current.labelHidden,
                                    placeholder = current.placeholder,
                                    supportingText = current.supportingText,
                                    errorText = current.errorText,
                                    isError = current.isError,
                                    enabled = current.enabled,
                                    readOnly = current.readOnly,
                                    required = current.required,
                                    singleLine = current.singleLine,
                                    minLines = current.minLines,
                                    maxLines = current.maxLines,
                                    maxLength = current.maxLength,
                                    counter = current.counter,
                                    prefix = current.prefix,
                                    suffix = current.suffix,
                                    contentType = current.contentType,
                                    onCommit = { events += "change:$it" },
                                    keyboardActions = KeyboardActions(onDone = { events += "action" }, onSearch = { events += "action:search" }),
                                    leadingIcon = current.leading,
                                    trailingIcon = current.trailing,
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    private fun field() = rule.onNodeWithTag(TAG)

    /** Focus by a tap, as a person does. */
    private fun tapToFocus() {
        field().performClick()
        rule.waitForIdle()
    }

    private fun leave() {
        rule.runOnIdle { focusManager.clearFocus() }
        rule.waitForIdle()
    }

    private fun ime(block: InputConnection.() -> Unit) {
        val input = connection
        assertNotNull("the field started an input session", input)
        rule.runOnIdle { input!!.block() }
        rule.waitForIdle()
    }

    // ── TXF-1: input on every user change, never for the product's ───────────

    @Test
    fun `TXF-1 typing emits input once per change with the new value`() {
        setField()
        tapToFocus()
        field().performTextInput("a")
        field().performTextInput("d")
        assertEquals(listOf("input:a", "input:ad"), events)
        field().assert(SemanticsMatcher.expectValue(SemanticsProperties.EditableText, AnnotatedString("ad")))
    }

    @Test
    fun `TXF-1 deleting, pasting over the value and clearing each emit one input`() {
        setField(value = "ada")
        tapToFocus()
        field().performKeyInput { pressKey(Key.Backspace) }
        rule.waitForIdle()
        field().performTextReplacement("grace")
        field().performTextClearance()
        assertEquals(listOf("input:ad", "input:grace", "input:"), events)
    }

    @Test
    fun `TXF-1 an input method's commit emits input`() {
        setField()
        tapToFocus()
        ime { commitText("ada", 1) }
        assertEquals(listOf("input:ada"), events)
    }

    @Test
    fun `TXF-1 a value the product sets is shown, and emits neither input nor change`() {
        setField(value = "ada")
        tapToFocus()
        productValue = "grace"
        rule.waitForIdle()
        field().assert(SemanticsMatcher.expectValue(SemanticsProperties.EditableText, AnnotatedString("grace")))
        leave()
        assertEquals(emptyList<String>(), events)
    }

    // ── TXF-2: change on commit ──────────────────────────────────────────────

    @Test
    fun `TXF-2 focus leaving with a changed value emits change once, with the value`() {
        setField(value = "ada")
        tapToFocus()
        field().performTextInput("m")
        leave()
        assertEquals(listOf("input:adam", "change:adam"), events)
        tapToFocus()
        leave()
        assertEquals("nothing changed since: no second change", listOf("input:adam", "change:adam"), events)
    }

    @Test
    fun `TXF-2 focus leaving with the value it had on arrival emits no change`() {
        setField(value = "ada")
        tapToFocus()
        field().performTextInput("m")
        field().performKeyInput { pressKey(Key.Backspace) }
        rule.waitForIdle()
        leave()
        assertEquals(listOf("input:adam", "input:ada"), events)
    }

    @Test
    fun `TXF-2 TXF-3 the action key commits a changed value, then emits action - and leaving afterwards emits nothing more`() {
        setField()
        tapToFocus()
        field().performTextInput("ada")
        field().performImeAction()
        assertEquals(listOf("input:ada", "change:ada", "action"), events)
        leave()
        assertEquals(listOf("input:ada", "change:ada", "action"), events)
    }

    // ── TXF-3: action ────────────────────────────────────────────────────────

    @Test
    fun `TXF-3 the action key emits action even when nothing changed, and Enter on a hardware keyboard is the action key`() {
        setField(value = "ada")
        tapToFocus()
        field().performImeAction()
        assertEquals(listOf("action"), events)
        field().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals(listOf("action", "action"), events)
    }

    @Test
    fun `TXF-3 a search field's action key reads as search, and its action is the product's search`() {
        setField(type = TanreiTextFieldType.Search)
        field().assert(SemanticsMatcher.expectValue(SemanticsProperties.ImeAction, ImeAction.Search))
        tapToFocus()
        field().performImeAction()
        assertEquals(listOf("action:search"), events)
    }

    @Test
    fun `TXF-3 TXF-17 in a multi-line field Enter inserts a line break and emits no action`() {
        setField(value = "ada", singleLine = false)
        field().assert(SemanticsMatcher.expectValue(SemanticsProperties.ImeAction, ImeAction.Default))
        tapToFocus()
        field().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals(listOf("input:ada\n"), events)
    }

    // ── TXF-4: input-method composition ──────────────────────────────────────

    @Test
    fun `TXF-4 a composition is left to the platform - each step is an input the product echoes, the composition survives it, and the commit is an input`() {
        setField(maxLength = 2)
        tapToFocus()
        ime { setComposingText("に", 1) }
        ime { setComposingText("にほんご", 1) }
        // Longer than maxLength while composing: not cut (TXF-18), and the product's echo does not end the composition.
        assertEquals(listOf("input:に", "input:にほんご"), events)
        assertEditable("にほんご")
        // Still composing after the echo: the commit REPLACES the composed text (were it ended, it would be appended).
        ime { commitText("日本語", 1) }
        // The commit is an input, with the limit applied to what the composition inserted.
        assertEquals(listOf("input:に", "input:にほんご", "input:日本"), events)
        assertEquals("日本", productValue)
    }

    @Test
    fun `TXF-4 a committed composition is an input even when its text does not change`() {
        setField()
        tapToFocus()
        ime { setComposingText("ada", 1) }
        ime { finishComposingText() }
        assertEquals(listOf("input:ada", "input:ada"), events)
    }

    @Test
    fun `TXF-4 a value the product sets during a composition is applied when the composition ends`() {
        echo = false
        setField()
        tapToFocus()
        ime { setComposingText("にほ", 1) }
        productValue = "X"
        rule.waitForIdle()
        assertEditable("にほ")
        ime { finishComposingText() }
        assertEditable("X")
    }

    @Test
    fun `TXF-4 the action key during a composition emits no change`() {
        setField()
        tapToFocus()
        ime { setComposingText("にほ", 1) }
        ime { performEditorAction(EditorInfo.IME_ACTION_DONE) }
        assertTrue(events.toString(), events.none { it.startsWith("change:") })
    }

    @Test
    fun `TXF-4 the pure rule - the product's value waits while the field composes`() {
        val composing = TextFieldValue("にほ", TextRange(2), composition = TextRange(0, 2))
        assertEquals(composing, tanreiReconciledValue(composing, "X"))
        val idle = TextFieldValue("にほ", TextRange(2))
        assertEquals("X", tanreiReconciledValue(idle, "X").text)
        assertEquals(TextRange(1), tanreiReconciledValue(idle, "X").selection)
    }

    // ── TXF-5: disabled ──────────────────────────────────────────────────────

    @Test
    fun `TXF-5 a disabled field is not focusable, not editable, emits nothing and exposes the disabled state`() {
        setField(value = "ada", enabled = false)
        field().assertIsNotEnabled().assert(SemanticsMatcher.keyNotDefined(SemanticsActions.RequestFocus))
        field().performClick()
        rule.waitForIdle()
        field().assert(SemanticsMatcher.expectValue(SemanticsProperties.Focused, true).not())
        assertEquals(null, connection)
        assertEquals(emptyList<String>(), events)
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    @Test
    fun `TXF-5 every part of a disabled field draws from the disabled tokens of its variant - and of its error parts in error`() {
        val system = tanrei.withField(TanreiTextFieldVariant.Outlined, TanreiInteractionState.Disabled) {
            it.copy(outlineColor = TanreiPaint.Role(TanreiColorRole.Warning), errorOutlineColor = TanreiPaint.Role(TanreiColorRole.Success))
        }
        setField(value = "ada", enabled = false, system = system)
        assertPixel("the disabled outline", bottomEdge(), colors[TanreiColorRole.Warning])
        setField(value = "ada", enabled = false, isError = true, system = system)
        assertPixel("the disabled error outline", bottomEdge(), colors[TanreiColorRole.Success])
    }

    @Test
    fun `TXF-5 in the default system a disabled outlined field fades its edge and its text`() {
        setField(value = "ada", enabled = false)
        val disabled = tokens.variants.outlined.disabled
        assertPixel("the edge", bottomEdge(), disabled.outlineColor.resolve(colors).compositeOver(surface))
        val text = darkest(inputBand())
        assertPixel("the text, faded", text, disabled.inputColor.resolve(colors).compositeOver(surface), tolerance = 0.06f)
    }

    // ── TXF-6: hovered and focused ───────────────────────────────────────────

    @Test
    fun `TXF-6 hover draws the hovered tokens - the outlined edge darkens, and a filled container carries the state layer`() {
        setField()
        field().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertPixel("the hovered outline", bottomEdge(), tokens.variants.outlined.hovered.outlineColor.resolve(colors))
        setField(variant = TanreiTextFieldVariant.Filled, labelHidden = true)
        field().performMouseInput { moveTo(center + Offset(1f, 0f)) }
        rule.waitForIdle()
        val hovered = tokens.variants.filled.hovered.containerColor.resolve(colors)
        assertNotEquals(tokens.variants.filled.enabled.containerColor.resolve(colors), hovered)
        assertPixel("the hovered container", insideContainer(), hovered)
    }

    @Test
    fun `TXF-6 focus by a tap selects the focused state - the edge takes the focus color and the focused width`() {
        setField()
        val width = tokens.focused.outlineWidth
        assertTrue("focused is thicker", width > tokens.outlineWidth)
        tapToFocus()
        field().assertIsFocused()
        val focusColor = tokens.variants.outlined.focused.outlineColor.resolve(colors)
        assertEquals(colors[TanreiColorRole.FocusRing], focusColor)
        val bottom = bottomEdgeRow()
        val map = stage()
        with(rule.density) {
            val x = (STAGE + W / 2).roundToPx()
            assertPixel("the edge's outer row", map[x, bottom], focusColor)
            assertPixel("its inner row, the width's second pixel", map[x, bottom - (width - 1.dp).roundToPx()], focusColor)
            assertPixel("inside it, the container", map[x, bottom - (width + 1.dp).roundToPx()], surface)
        }
    }

    @Test
    @KeyboardNavigation
    fun `TXF-6 keyboard focus selects the focused state too, and focused wins over hovered`() {
        setField(variant = TanreiTextFieldVariant.Filled, labelHidden = true)
        field().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        field().requestFocus().assertIsFocused()
        rule.waitForIdle()
        val focused = tokens.variants.filled.focused
        assertPixel("the focused container - kept at rest", insideContainer(), focused.containerColor.resolve(colors))
        assertEquals(tokens.variants.filled.enabled.containerColor, focused.containerColor)
        assertPixel("the focused indicator", bottomEdge(), focused.activeIndicatorColor.resolve(colors).compositeOver(focused.containerColor.resolve(colors)))
    }

    @Test
    fun `TXF-6 every part follows its state's tokens - label, input, caret and supporting text`() {
        val system = tanrei.withField(TanreiTextFieldVariant.Outlined, TanreiInteractionState.Focused) {
            it.copy(inputColor = TanreiPaint.Role(TanreiColorRole.Success), supportingTextColor = TanreiPaint.Role(TanreiColorRole.Warning))
        }
        setField(value = "ada", supportingText = "Help", system = system)
        tapToFocus()
        assertPixel("the input", darkest(inputBand(), colors[TanreiColorRole.Success]), colors[TanreiColorRole.Success], tolerance = 0.06f)
        assertTrue("the supporting text", countNear(supportingBand(), colors[TanreiColorRole.Warning]) > 4)
    }

    @Test
    fun `TXF-6 the highlight behind selected text is the selection color token, in every state - not the platform's default`() {
        assertEquals(TanreiPaint.Role(TanreiColorRole.PrimaryContainer), tokens.selectionColor)
        val system = tanrei.copy(textField = tokens.copy(selectionColor = TanreiPaint.Role(TanreiColorRole.Success)))
        setField(value = "MMMMMMMM", labelHidden = true, system = system)
        tapToFocus()
        assertEquals("nothing selected yet", 0, countNear(inputBand(), colors[TanreiColorRole.Success]))
        field().performTextInputSelection(TextRange(0, 8))
        rule.waitForIdle()
        assertTrue("the selection is drawn in the token", countNear(inputBand(), colors[TanreiColorRole.Success]) > 40)
        setField(value = "MMMMMMMM", labelHidden = true, isError = true, variant = TanreiTextFieldVariant.Filled, system = system)
        tapToFocus()
        field().performTextInputSelection(TextRange(0, 8))
        rule.waitForIdle()
        assertTrue("the same in another variant and in error", countNear(inputBand(), colors[TanreiColorRole.Success]) > 40)
    }

    // ── TXF-7: no focus ring; the glow where the system glows ────────────────

    @Test
    @KeyboardNavigation
    fun `TXF-7 keyboard focus draws no focus ring - the focused edge is the indicator`() {
        setField(labelHidden = true)
        field().requestFocus().assertIsFocused()
        rule.waitForIdle()
        val ring = tanrei.measure.focusOffset + tanrei.measure.focusInnerWidth + tanrei.measure.focusOuterWidth / 2
        with(rule.density) {
            val y = bottomEdgeRow() + ring.roundToPx()
            assertPixel("nothing outside the container", stage()[(STAGE + W / 2).roundToPx(), y], surface)
        }
    }

    @Test
    @KeyboardNavigation
    fun `TXF-7 under a glow system the glow surrounds the focused container`() {
        val acme = TanreiSystem.Acme
        assertEquals(TanreiFocusStyle.Glow, acme.behavior.focusStyle)
        val acmeSurface = acme.colors.light[TanreiColorRole.Surface]
        setField(labelHidden = true, system = acme)
        val m = acme.measure
        with(rule.density) {
            val y = bottomEdgeRow(acmeSurface) + (m.focusOffset + m.focusInnerWidth + m.focusOuterWidth / 4).roundToPx()
            val x = (STAGE + W / 2).roundToPx()
            assertPixel("no glow before focus", stage()[x, y], acmeSurface)
            field().requestFocus().assertIsFocused()
            rule.waitForIdle()
            assertTrue("the glow after focus: ${stage()[x, y]}", !isClose(stage()[x, y], acmeSurface))
        }
    }

    // ── TXF-8: the target; a press focuses and draws nothing ─────────────────

    @Test
    fun `TXF-8 a field shorter than the target reserves it vertically, the container keeping its own height`() {
        setField(labelHidden = true)
        assertTrue(medium.containerHeight < tanrei.measure.targetTouch)
        field().assertHeightIsAtLeast(tanrei.measure.targetTouch)
        assertContainerHeight(medium.containerHeight)
    }

    @Test
    fun `TXF-8 a press on the padding, beside the text, focuses the input and draws no press answer`() {
        setField(variant = TanreiTextFieldVariant.Filled, labelHidden = true)
        val before = insideContainer()
        field().performTouchInput { down(Offset(2.dp.toPx(), centerY)) }
        rule.waitForIdle()
        assertPixel("no press answer", insideContainer(), before)
        field().performTouchInput { up() }
        rule.waitForIdle()
        field().assertIsFocused()
    }

    // ── TXF-9: unknown values ────────────────────────────────────────────────

    @Test
    fun `TXF-9 the lookups are total - an unknown variant or size reads the default value's tokens`() {
        assertEquals(tokens.variants.outlined, tokens.variants[TanreiTextFieldVariant("ghost")])
        assertEquals(tokens.sizes.medium, tokens.sizes[TanreiTextFieldSize("huge")])
        assertEquals(listOf("filled", "outlined"), tokens.variants.keys.map { it.key })
        assertEquals(listOf("medium", "large"), tokens.sizes.keys.map { it.key })
    }

    @Test
    fun `TXF-9 an unknown variant and size render as the default, and a debuggable app reports both once`() = collectingReports { reports ->
        setDebuggable(true)
        rule.setContent {
            TanreiTheme(system = tanrei, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Column(Modifier.background(TanreiColorRole.Surface.color)) {
                    TanreiTextField(value = "ada", onValueChange = {}, label = LABEL, modifier = Modifier.testTag(TAG).width(W))
                    TanreiTextField(value = "ada", onValueChange = {}, label = LABEL, modifier = Modifier.testTag(UNKNOWN_TAG).width(W), variant = TanreiTextFieldVariant("ghost"), size = TanreiTextFieldSize("huge"))
                }
            }
        }
        val expected = field().captureToImage().toPixelMap()
        val actual = rule.onNodeWithTag(UNKNOWN_TAG).captureToImage().toPixelMap()
        assertEquals(expected.height, actual.height)
        for (y in 0 until expected.height) for (x in 0 until expected.width) assertEquals("pixel $x,$y", expected[x, y], actual[x, y])
        assertEquals(reports.toString(), 2, reports.size)
        assertTrue(reports.toString(), reports.any { "TanreiTextField" in it && "variant \"ghost\"" in it })
        assertTrue(reports.toString(), reports.any { "TanreiTextField" in it && "size \"huge\"" in it })
    }

    @Test
    fun `TXF-9 type is closed - every value of the spec is a TanreiTextFieldType, so an unknown one cannot be written`() {
        val spec = JSONObject(File(TEXT_FIELD_SPEC).readText())
        val props = spec.getJSONArray("props")
        val type = (0 until props.length()).map(props::getJSONObject).single { it.getString("name") == "type" }
        val values = type.getJSONArray("values").let { v -> (0 until v.length()).map(v::getString) }
        assertEquals(values, TanreiTextFieldType.entries.map { it.name.lowercase() })
    }

    // ── TXF-10: read-only ────────────────────────────────────────────────────

    @Test
    fun `TXF-10 a read-only field is focusable but not editable, emits no input or change, and is exposed as read-only`() {
        setField(value = "ada", readOnly = true)
        field().assert(SemanticsMatcher.expectValue(SemanticsProperties.IsEditable, false)).assertIsEnabled()
        tapToFocus()
        field().assertIsFocused()
        field().performKeyInput { pressKey(Key.Backspace) }
        rule.waitForIdle()
        leave()
        assertEquals(emptyList<String>(), events)
        assertEquals("ada", productValue)
    }

    @Test
    fun `TXF-10 a read-only field renders as an enabled one, its focused state included`() {
        setField(value = "ada", readOnly = true)
        assertPixel("the resting edge", bottomEdge(), tokens.variants.outlined.enabled.outlineColor.resolve(colors).compositeOver(surface))
        tapToFocus()
        assertPixel("the focused edge", bottomEdge(), tokens.variants.outlined.focused.outlineColor.resolve(colors))
    }

    // ── TXF-11: error ────────────────────────────────────────────────────────

    @Test
    fun `TXF-11 in error every part draws from the error parts, in every state`() {
        setField(value = "ada@", isError = true, errorText = ERROR)
        val error = tokens.variants.outlined
        assertPixel("the error outline at rest", bottomEdge(), error.enabled.errorOutlineColor.resolve(colors))
        tapToFocus()
        assertPixel("the error outline focused", bottomEdge(), error.focused.errorOutlineColor.resolve(colors))
        assertEquals(colors[TanreiColorRole.Error], error.focused.errorOutlineColor.resolve(colors))
    }

    @Test
    fun `TXF-11 in error the field is exposed as invalid, and errorText is shown in place of supportingText and is its description`() {
        setField(value = "ada@", isError = true, errorText = ERROR, supportingText = HELP)
        field().assert(SemanticsMatcher.keyIsDefined(SemanticsProperties.Error))
        field().assert(SemanticsMatcher.expectValue(SemanticsProperties.Text, listOf(AnnotatedString(ERROR))))
        rule.onNodeWithText(ERROR, useUnmergedTree = true).assertExists()
        rule.onNodeWithText(HELP, useUnmergedTree = true).assertDoesNotExist()
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    @Test
    fun `TXF-11 in error with an empty errorText the supporting text stays, and without error the field is not invalid`() {
        setField(value = "ada@", isError = true, supportingText = HELP)
        rule.onNodeWithText(HELP, useUnmergedTree = true).assertExists()
        setField(value = "ada@", supportingText = HELP, errorText = ERROR)
        field().assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Error))
        rule.onNodeWithText(ERROR, useUnmergedTree = true).assertDoesNotExist()
    }

    // ── TXF-12: announcing an error ──────────────────────────────────────────

    @Test
    fun `TXF-12 an error shown while the field has focus is a polite live region - announced once, and unfocused it is only the description`() {
        setField(value = "ada@", isError = true, errorText = ERROR)
        rule.onNodeWithText(ERROR, useUnmergedTree = true).assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.LiveRegion))
        tapToFocus()
        val live = SemanticsMatcher.expectValue(SemanticsProperties.LiveRegion, LiveRegionMode.Polite)
        rule.onNode(hasTextExactly(ERROR) and SemanticsMatcher.keyIsDefined(SemanticsProperties.LiveRegion).not(), useUnmergedTree = true).assertExists()
        rule.onNode(live and hasChild(hasTextExactly(ERROR)), useUnmergedTree = true).assertExists()
    }

    // ── TXF-13: the floating label ───────────────────────────────────────────

    @Test
    fun `TXF-13 the label rests in the input line while empty and unfocused, in the resting typescale`() {
        setField(system = redLabel())
        val box = redBox()
        val line = inputLineCenter()
        assertEquals("centred on the input line", line, (box.top + box.bottom) / 2f, 2f * rule.density.density)
    }

    @Test
    fun `TXF-13 an outlined field floats its label onto the top edge when focused or filled, smaller, and opens a gap in the outline`() {
        setField(system = redLabel())
        val resting = redBox()
        val edge = topEdgeRow()
        assertPixel("no gap at rest", stage()[labelGapX(), edge], tokens.variants.outlined.enabled.outlineColor.resolve(colors).compositeOver(surface))
        tapToFocus()
        val floated = redBox()
        assertEquals("centred on the top edge", edge.toFloat(), (floated.top + floated.bottom) / 2f, 2f * rule.density.density)
        assertTrue("floated is smaller: ${floated.height} < ${resting.height}", floated.height < resting.height)
        assertPixel("the gap in the outline", stage()[labelGapX(), edge + 1], surface)
        leave()
        setField(value = "ada", system = redLabel())
        assertEquals("filled floats too", topEdgeRow().toFloat(), redBox().let { (it.top + it.bottom) / 2f }, 2f * rule.density.density)
    }

    @Test
    fun `TXF-13 a filled field rests its label centred in the container, not in the input line below the floated band`() {
        setField(variant = TanreiTextFieldVariant.Filled, system = redLabel())
        val box = redBox()
        val center = (topEdgeRow() + bottomEdgeRow() + 1) / 2f
        assertEquals(center, (box.top + box.bottom) / 2f, 2f * rule.density.density)
        assertTrue("not the input line's centre", abs(inputLineCenter() - center) > 4f * rule.density.density)
    }

    @Test
    fun `TXF-13 beside a leading icon an outlined field floats its label to padding-inline, over the icon, and opens the gap there - resting, it starts at the text`() {
        val textStart = STAGE + medium.containerPaddingInlineWithIcon + medium.iconSize + medium.containerGap
        setField(system = redLabel(), leading = { TagIcon("lead") })
        with(rule.density) {
            assertEquals("resting: at the input text", textStart.toPx(), redBox().left.toFloat(), 2f * density)
            tapToFocus()
            assertEquals("floated: at padding-inline", (STAGE + medium.containerPaddingInline).toPx(), redBox().left.toFloat(), 2f * density)
            val gap = (STAGE + medium.containerPaddingInline - tokens.outlineNotchPadding / 2).roundToPx()
            assertPixel("the gap starts before the floated label", stage()[gap, topEdgeRow() + 1], surface)
            assertTrue("the edge is drawn before the gap", !isClose(stage()[(STAGE + medium.containerPaddingInline - tokens.outlineNotchPadding - 2.dp).roundToPx(), topEdgeRow() + 1], surface))
        }
    }

    @Test
    fun `TXF-13 beside a leading icon a filled field keeps its label at the input text, resting and floated`() {
        val textStart = STAGE + medium.containerPaddingInlineWithIcon + medium.iconSize + medium.containerGap
        setField(variant = TanreiTextFieldVariant.Filled, system = redLabel(), leading = { TagIcon("lead") })
        with(rule.density) {
            assertEquals("resting", textStart.toPx(), redBox().left.toFloat(), 2f * density)
            tapToFocus()
            assertEquals("floated", textStart.toPx(), redBox().left.toFloat(), 2f * density)
        }
    }

    @Test
    fun `TXF-13 a filled field floats its label to the top of the container, above the input line`() {
        setField(variant = TanreiTextFieldVariant.Filled, value = "ada", system = redLabel())
        val box = redBox()
        val top = topEdgeRow()
        val expectedCenter = top + with(rule.density) { (medium.containerPaddingBlockWithLabel + medium.labelFloatedTypescale.lineHeight.toDp() / 2).toPx() }
        assertEquals(expectedCenter, (box.top + box.bottom) / 2f, 2f * rule.density.density)
        assertTrue("above the input line", box.bottom < inputLineCenter())
    }

    @Test
    fun `TXF-13 a label that does not fit on one line wraps, resting and floated - every line drawn, never over the input, the field grows and keeps its height as the label floats, the gap as wide as its widest line`() {
        val narrow = 96.dp
        // The label in red and the value in green, so each can be found.
        var system = redLabel()
        for (variant in listOf(TanreiTextFieldVariant.Outlined, TanreiTextFieldVariant.Filled)) {
            for (state in listOf(TanreiInteractionState.Enabled, TanreiInteractionState.Hovered, TanreiInteractionState.Focused)) {
                system = system.withField(variant, state) { it.copy(inputColor = TanreiPaint.Role(TanreiColorRole.Success)) }
            }
        }
        val green = colors[TanreiColorRole.Success]
        with(rule.density) {
            for (variant in listOf(TanreiTextFieldVariant.Outlined, TanreiTextFieldVariant.Filled)) {
                var restingHeight = 0f
                for (floated in listOf(false, true)) {
                    val value = if (floated) "5551234" else ""
                    val what = "$variant, ${if (floated) "floated" else "resting"}"
                    setField(variant = variant, value = value, label = SHORT_LABEL, width = narrow, system = system)
                    val oneLine = fieldHeight()
                    assertEquals("$what: a short label takes one line", 1, redBands().size)
                    setField(variant = variant, value = value, label = WRAPPING_LABEL, width = narrow, system = system)
                    val bands = redBands()
                    assertEquals("$what: the label takes two lines, both drawn: $bands", 2, bands.size)
                    assertTrue("$what: the field grows (${fieldHeight()} > $oneLine)", fieldHeight() > oneLine)
                    // Neither variant changes height when its label floats: an outlined field keeps the room above its
                    // container while the label rests, a filled field its band.
                    if (!floated) restingHeight = fieldHeight() else assertEquals("$what: as tall as resting", restingHeight, fieldHeight(), 0.5f)
                    val label = redBox()
                    assertTrue("$what: never cut at the end - it ends inside the field", label.right <= (STAGE + narrow).roundToPx())
                    val (containerTop, containerBottom) = narrowContainerRows(narrow)
                    if (!floated) {
                        assertTrue("$what: a resting label wraps inside the container ($containerTop..$containerBottom, label ${label.top}..${label.bottom})", label.top > containerTop && label.bottom <= containerBottom)
                        continue
                    }
                    val input = boxNear(green)
                    assertTrue("$what: the label is above the input line (label ends ${label.bottom}, input starts ${input.top})", label.bottom <= input.top)
                    if (variant == TanreiTextFieldVariant.Filled) {
                        assertTrue("$what: inside the container", label.top > containerTop)
                        continue
                    }
                    // An outlined field: the last line sits on the top edge, the lines above it in the room above the container.
                    // The edge's row is read where it is straight, past the corner and before the gap.
                    val map = stage()
                    val from = (STAGE + tokens.containerShape + 0.5.dp).roundToPx()
                    val edge = (0 until map.height).first { y -> !isClose(map[from, y], surface) }
                    assertTrue("$what: the last line is on the top edge ($edge in ${bands.last()})", edge in bands.last())
                    assertTrue("$what: the first line above the container", bands.first().last < edge)
                    // The gap: the run of the edge's row that is not the outline, from the straight edge before the label.
                    val row = edge
                    val outline = tokens.variants.outlined.enabled.outlineColor.resolve(colors).compositeOver(surface)
                    assertPixel("$what: the outline before the gap", map[from, row], outline)
                    var gapStart = from
                    while (isClose(map[gapStart, row], outline, 0.1f)) gapStart++
                    var gapEnd = gapStart
                    while (gapEnd < (STAGE + narrow).roundToPx() && !isClose(map[gapEnd, row], outline, 0.1f)) gapEnd++
                    val widest = bands.maxOf { band -> inkWidth(band, RED) }
                    val expected = widest + 2 * tokens.outlineNotchPadding.toPx()
                    assertEquals("$what: the gap is as wide as the widest line (widest ink $widest px)", expected, (gapEnd - gapStart).toFloat(), 3f * density)
                    assertTrue("$what: narrower than the whole label on one line", gapEnd - gapStart < (narrow - medium.containerPaddingInline * 2).toPx())
                }
            }
        }
    }

    // ── TXF-14: motion ───────────────────────────────────────────────────────

    @Test
    fun `TXF-14 the label moves over the label motion, and a change of state recolors over the state motion`() {
        val slow = 400
        val system = redLabel().let { it.copy(textField = it.textField.copy(motionLabelDuration = slow, motionLabelEasing = tanrei.motion.easing.linear, motionStateDuration = slow, motionStateEasing = tanrei.motion.easing.linear)) }
        setField(system = system)
        val resting = redBox()
        rule.mainClock.autoAdvance = false
        field().performClick()
        rule.mainClock.advanceTimeBy(slow / 2L)
        val half = redBox()
        assertTrue("half way: ${half.top} between ${topEdgeRow()} and ${resting.top}", half.top < resting.top - 4 && half.top > topEdgeRow() - resting.height)
        val edge = bottomEdge()
        val from = tokens.variants.outlined.enabled.outlineColor.resolve(colors).compositeOver(surface)
        val to = colors[TanreiColorRole.FocusRing]
        assertTrue("the edge is on its way: $edge", !isClose(edge, from) && !isClose(edge, to))
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertPixel("the edge arrived", bottomEdge(), to)
    }

    // ── TXF-15: hidden label, placeholder, prefix and suffix ─────────────────

    @Test
    fun `TXF-15 labelHidden draws no label, which stays the name`() {
        setField(labelHidden = true, system = redLabel())
        assertEquals("no label pixels", 0, countNear(stageRect(), RED))
        field().assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf(LABEL)))
    }

    @Test
    fun `TXF-15 the placeholder shows only where it cannot collide with the label - hidden, or floated`() {
        setField(placeholder = HINT, system = placeholderIn(TanreiColorRole.Success))
        assertEquals("not while the label rests", 0, countNear(inputBand(), colors[TanreiColorRole.Success]))
        tapToFocus()
        assertTrue("once the label floats", countNear(inputBand(), colors[TanreiColorRole.Success]) > 4)
        setField(placeholder = HINT, labelHidden = true, system = placeholderIn(TanreiColorRole.Success))
        assertTrue("with the label hidden", countNear(inputBand(), colors[TanreiColorRole.Success]) > 4)
        setField(value = "ada", placeholder = HINT, labelHidden = true, system = placeholderIn(TanreiColorRole.Success))
        assertEquals("never with a value", 0, countNear(inputBand(), colors[TanreiColorRole.Success]))
    }

    @Test
    fun `TXF-15 prefix and suffix show exactly when the label is floated or not drawn, affix-gap from the input`() {
        setField(prefix = "$", suffix = "USD")
        // Hidden: transparent, and not read (the field's merged text does not hold them).
        field().assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Text))
        setField(value = "120", prefix = "$", suffix = "USD")
        val prefix = rule.onNodeWithText("$", useUnmergedTree = true).getUnclippedBoundsInRoot()
        val fieldBounds = field().getUnclippedBoundsInRoot()
        assertEquals((fieldBounds.left + medium.containerPaddingInline).value, prefix.left.value, 0.5f)
        val suffix = rule.onNodeWithText("USD", useUnmergedTree = true).getUnclippedBoundsInRoot()
        assertEquals((fieldBounds.right - medium.containerPaddingInline).value, suffix.right.value, 0.5f)
        setField(labelHidden = true, prefix = "$")
        rule.onNodeWithText("$", useUnmergedTree = true).assertExists()
    }

    @Test
    fun `TXF-15 while shown, the prefix and suffix are part of the description, so a unit is read with the value`() {
        setField(value = "120", prefix = "$", suffix = "USD", supportingText = HELP)
        field().assert(SemanticsMatcher.expectValue(SemanticsProperties.Text, listOf(AnnotatedString("$"), AnnotatedString("USD"), AnnotatedString(HELP))))
    }

    // ── TXF-16: geometry ─────────────────────────────────────────────────────

    @Test
    fun `TXF-16 an outlined field is container-height tall per size, a single line centred in it`() {
        setField(labelHidden = true, value = "ada")
        assertContainerHeight(medium.containerHeight)
        val center = (topEdgeRow() + bottomEdgeRow()) / 2f
        assertEquals("the input line is centred", center, inputLineCenter(), 1.5f * rule.density.density)
        setField(labelHidden = true, value = "ada", size = TanreiTextFieldSize.Large)
        assertContainerHeight(tokens.sizes.large.containerHeight)
    }

    @Test
    fun `TXF-16 a filled field that draws its label is 2 x padding-block-with-label + a floated line + an input line tall, floated or not`() {
        val expected = with(rule.density) { medium.containerPaddingBlockWithLabel * 2 + medium.labelFloatedTypescale.lineHeight.toDp() + medium.inputTypescale.lineHeight.toDp() }
        setField(variant = TanreiTextFieldVariant.Filled)
        assertContainerHeight(expected)
        setField(variant = TanreiTextFieldVariant.Filled, value = "ada")
        assertContainerHeight(expected)
        setField(variant = TanreiTextFieldVariant.Filled, labelHidden = true)
        assertContainerHeight(medium.containerHeight)
    }

    @Test
    fun `TXF-16 the text is padding-inline from the edge, and padding-inline-with-icon + the icon + gap beside an icon`() {
        setField(labelHidden = true, placeholder = "MMMM", system = placeholderIn(TanreiColorRole.Success))
        val left = firstColumnNear(colors[TanreiColorRole.Success])
        assertEquals(with(rule.density) { (STAGE + medium.containerPaddingInline).toPx() }, left.toFloat(), 2f * rule.density.density)
        setField(labelHidden = true, placeholder = "MMMM", system = placeholderIn(TanreiColorRole.Success), leading = { TagIcon("lead") })
        val withIcon = firstColumnNear(colors[TanreiColorRole.Success])
        assertEquals(with(rule.density) { (STAGE + medium.containerPaddingInlineWithIcon + medium.iconSize + medium.containerGap).toPx() }, withIcon.toFloat(), 2f * rule.density.density)
    }

    @Test
    fun `TXF-16 an outlined field rounds its four corners, a filled one its top corners and squares its bottom by shape-bottom`() {
        setField(labelHidden = true)
        assertPixel("outlined: the bottom-left corner is cut", stagePx(STAGE, bottomEdgeRow()), surface)
        setField(variant = TanreiTextFieldVariant.Filled, labelHidden = true)
        assertEquals(0.dp, tokens.containerShapeBottom)
        assertTrue("filled: the bottom-left corner is square", !isClose(stagePx(STAGE, bottomEdgeRow()), surface))
        assertPixel("filled: the top-left corner is cut", stagePx(STAGE, topEdgeRow()), surface)
    }

    @Test
    fun `TXF-16 at 200 percent text size the field grows with its text and never clips it`() {
        setField(labelHidden = true, value = "ada")
        val normal = bottomEdgeRow() - topEdgeRow()
        setField(labelHidden = true, value = "ada", fontScale = 2f)
        val large = bottomEdgeRow() - topEdgeRow()
        val line = with(rule.density) { (medium.inputTypescale.lineHeight * 2).toPx() }
        assertTrue("grew from $normal to $large px for a $line px line", large > normal && large >= line)
    }

    // ── TXF-17: multi-line ───────────────────────────────────────────────────

    @Test
    fun `TXF-17 a multi-line field starts at minLines, grows with its content to maxLines and then scrolls`() {
        val line = with(rule.density) { medium.inputTypescale.lineHeight.toPx() }
        setField(labelHidden = true, singleLine = false, minLines = 2, maxLines = 3)
        val two = bottomEdgeRow() - topEdgeRow()
        productValue = "one\ntwo\nthree"
        rule.waitForIdle()
        val three = bottomEdgeRow() - topEdgeRow()
        assertEquals("one more line", line, (three - two).toFloat(), 2f)
        productValue = "one\ntwo\nthree\nfour\nfive"
        rule.waitForIdle()
        assertEquals("no taller than maxLines", three, bottomEdgeRow() - topEdgeRow())
    }

    @Test
    fun `TXF-17 maxLines 0 grows without limit, and a maxLines below minLines holds at minLines`() {
        val line = with(rule.density) { medium.inputTypescale.lineHeight.toPx() }
        setField(labelHidden = true, singleLine = false, minLines = 2, maxLines = 0, value = "1\n2\n3\n4\n5")
        val five = bottomEdgeRow() - topEdgeRow()
        setField(labelHidden = true, singleLine = false, minLines = 2, maxLines = 1, value = "1\n2\n3\n4\n5")
        val held = bottomEdgeRow() - topEdgeRow()
        assertEquals(3 * line, (five - held).toFloat(), 3f)
    }

    @Test
    fun `TXF-17 the label of a multi-line field rests on its first line`() {
        setField(singleLine = false, minLines = 3, system = redLabel())
        val box = redBox()
        val firstLine = with(rule.density) { topEdgeRow() + (medium.containerPaddingBlock + medium.inputTypescale.lineHeight.toDp() / 2).toPx() }
        assertEquals(firstLine, (box.top + box.bottom) / 2f, 2f * rule.density.density)
    }

    @Test
    fun `TXF-17 a password stays on one line, and a debuggable app reports a multi-line password once`() = collectingReports { reports ->
        setDebuggable(true)
        setField(type = TanreiTextFieldType.Password, singleLine = false, minLines = 3, labelHidden = true)
        assertContainerHeight(medium.containerHeight)
        field().assert(SemanticsMatcher.expectValue(SemanticsProperties.ImeAction, ImeAction.Done))
        assertEquals(reports.toString(), 1, reports.size)
        assertTrue(reports.toString(), "TanreiTextField" in reports.single() && "password" in reports.single())
    }

    // ── TXF-18: maxLength in grapheme clusters ───────────────────────────────

    @Test
    fun `TXF-18 a keystroke into a full field is refused and a paste is shortened to fit`() {
        setField(value = "abc", maxLength = 4)
        tapToFocus()
        field().performTextInput("d")
        field().performTextInput("e")
        assertEquals(listOf("input:abcd"), events)
        setField(value = "ab", maxLength = 4)
        tapToFocus()
        field().performTextInput("cdef")
        assertEquals("abcd", productValue)
    }

    @Test
    fun `TXF-18 an emoji and a letter with its accent count once each`() {
        setField(maxLength = 3)
        tapToFocus()
        field().performTextInput("é👍xyz")
        assertEquals("é👍x", productValue)
        assertEquals(3, tanreiGraphemeCount(productValue))
    }

    @Test
    fun `TXF-18 a value the product sets longer than maxLength is not shortened, and deleting from it works`() {
        setField(value = "abcdef", maxLength = 3)
        field().assert(SemanticsMatcher.expectValue(SemanticsProperties.EditableText, AnnotatedString("abcdef")))
        tapToFocus()
        field().performKeyInput { pressKey(Key.Backspace) }
        rule.waitForIdle()
        assertEquals("abcde", productValue)
        field().performTextInput("z")
        assertEquals("still over the limit: typing is refused", "abcde", productValue)
    }

    @Test
    fun `TXF-18 the pure rule - the limit applies to what the edit inserted, a composition only when it ends`() {
        val previous = TextFieldValue("ab", TextRange(2))
        assertEquals("abc", tanreiLimitedEdit(previous, TextFieldValue("abcde", TextRange(5)), 3).text)
        assertEquals(TextRange(3), tanreiLimitedEdit(previous, TextFieldValue("abcde", TextRange(5)), 3).selection)
        assertEquals("xab", tanreiLimitedEdit(previous, TextFieldValue("xyzab", TextRange(3)), 3).text)
        val composing = TextFieldValue("abにほんご", TextRange(6), composition = TextRange(2, 6))
        assertEquals("not cut while composing", composing, tanreiLimitedEdit(previous, composing, 3))
        assertEquals("ab日", tanreiLimitedEdit(composing, TextFieldValue("ab日本語", TextRange(5)), 3).text)
        assertEquals("no limit", "abcde", tanreiLimitedEdit(previous, TextFieldValue("abcde"), 0).text)
    }

    // ── TXF-19: supporting text and the counter ──────────────────────────────

    @Test
    fun `TXF-19 the supporting text sits supporting-text-gap below the container, aligned with the input text, and wraps`() {
        setField(labelHidden = true, supportingText = LONG_HELP)
        val help = rule.onNodeWithText(LONG_HELP, useUnmergedTree = true).getUnclippedBoundsInRoot()
        val fieldBounds = field().getUnclippedBoundsInRoot()
        val containerBottom = with(rule.density) { (bottomEdgeRow() + 1).toDp() } - STAGE
        assertEquals((fieldBounds.top + containerBottom + tokens.supportingTextGap).value, help.top.value, 1f)
        assertEquals((fieldBounds.left + medium.containerPaddingInline).value, help.left.value, 0.5f)
        val line = with(rule.density) { tokens.supportingTextTypescale.lineHeight.toDp() }
        assertTrue("wrapped: ${help.bottom - help.top}", help.bottom - help.top > line * 1.5f)
    }

    @Test
    fun `TXF-19 the counter keeps at least container-gap from supporting text that would reach it, which wraps instead`() {
        setField(labelHidden = true, supportingText = LONG_HELP, counter = true, maxLength = 40)
        val help = rule.onNodeWithText(LONG_HELP, useUnmergedTree = true).getUnclippedBoundsInRoot()
        val counter = rule.onAllNodes(hasTextExactly("0/40"), useUnmergedTree = true).onFirst().getUnclippedBoundsInRoot()
        assertTrue("gap ${counter.left - help.right} >= ${medium.containerGap}", counter.left - help.right >= medium.containerGap - 0.5.dp)
    }

    @Test
    fun `TXF-19 the counter counts user-perceived characters, with maxLength, at the end of the row, and is part of the description`() {
        setField(value = "é👍a", counter = true, maxLength = 40, supportingText = HELP)
        val counter = rule.onAllNodes(hasTextExactly("3/40"), useUnmergedTree = true).onFirst().getUnclippedBoundsInRoot()
        val fieldBounds = field().getUnclippedBoundsInRoot()
        assertEquals((fieldBounds.right - medium.containerPaddingInline).value, counter.right.value, 0.5f)
        field().assert(SemanticsMatcher.expectValue(SemanticsProperties.Text, listOf(AnnotatedString(HELP), AnnotatedString("3/40"))))
        setField(value = "ada", counter = true)
        field().assert(SemanticsMatcher.expectValue(SemanticsProperties.Text, listOf(AnnotatedString("3"))))
    }

    @Test
    fun `TXF-19 the count is announced once typing pauses for a second - not on every keystroke`() {
        setField(counter = true, maxLength = 10)
        tapToFocus()
        rule.mainClock.autoAdvance = false
        field().performTextInput("a")
        rule.mainClock.advanceTimeBy(300)
        field().performTextInput("b")
        rule.mainClock.advanceTimeBy(300)
        val spoken = SemanticsMatcher.keyIsDefined(SemanticsProperties.LiveRegion)
        rule.onNode(spoken and hasTextExactly("0/10"), useUnmergedTree = true).assertExists()
        rule.mainClock.advanceTimeBy(1100)
        rule.onNode(spoken and hasTextExactly("2/10"), useUnmergedTree = true).assertExists()
        field().assert(SemanticsMatcher.expectValue(SemanticsProperties.Text, listOf(AnnotatedString("2/10"))))
    }

    // ── TXF-20: the keyboard of each type ────────────────────────────────────

    @Test
    fun `TXF-20 each type gives the input method its keyboard, and password is obscured`() {
        val expected = mapOf(
            TanreiTextFieldType.Text to (InputType.TYPE_CLASS_TEXT to InputType.TYPE_TEXT_VARIATION_NORMAL),
            TanreiTextFieldType.Search to (InputType.TYPE_CLASS_TEXT to InputType.TYPE_TEXT_VARIATION_NORMAL),
            TanreiTextFieldType.Email to (InputType.TYPE_CLASS_TEXT to InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS),
            TanreiTextFieldType.Password to (InputType.TYPE_CLASS_TEXT to InputType.TYPE_TEXT_VARIATION_PASSWORD),
            TanreiTextFieldType.Url to (InputType.TYPE_CLASS_TEXT to InputType.TYPE_TEXT_VARIATION_URI),
            TanreiTextFieldType.Number to (InputType.TYPE_CLASS_NUMBER to 0),
            TanreiTextFieldType.Tel to (InputType.TYPE_CLASS_PHONE to 0),
        )
        for ((type, classAndVariation) in expected) {
            connection = null
            setField(type = type)
            leave()
            tapToFocus()
            val info = editorInfo!!
            assertEquals("$type: class", classAndVariation.first, info.inputType and InputType.TYPE_MASK_CLASS)
            if (classAndVariation.first == InputType.TYPE_CLASS_TEXT) assertEquals("$type: variation", classAndVariation.second, info.inputType and InputType.TYPE_MASK_VARIATION)
            if (type == TanreiTextFieldType.Number) assertTrue("a decimal separator", info.inputType and InputType.TYPE_NUMBER_FLAG_DECIMAL != 0)
            if (type == TanreiTextFieldType.Search) assertEquals(EditorInfo.IME_ACTION_SEARCH, info.imeOptions and EditorInfo.IME_MASK_ACTION)
        }
        setField(type = TanreiTextFieldType.Password, value = "secret")
        field().assert(SemanticsMatcher.keyIsDefined(SemanticsProperties.Password))
    }

    @Test
    fun `TXF-20 email, password and url turn autocorrection and autocapitalization off, and number keeps the value a string`() {
        for (type in listOf(TanreiTextFieldType.Email, TanreiTextFieldType.Password, TanreiTextFieldType.Url)) {
            val options = tanreiKeyboardOptions(type, singleLine = true)
            assertEquals("$type", false, options.autoCorrectEnabled)
        }
        assertEquals(KeyboardType.Decimal, tanreiKeyboardOptions(TanreiTextFieldType.Number, true).keyboardType)
        assertEquals(KeyboardType.Phone, tanreiKeyboardOptions(TanreiTextFieldType.Tel, true).keyboardType)
        setField(type = TanreiTextFieldType.Number)
        tapToFocus()
        field().performTextInput("1,5e3")
        assertEquals("1,5e3", productValue)
    }

    // ── TXF-21: autofill ─────────────────────────────────────────────────────

    @Test
    fun `TXF-21 autocomplete is the field's autofill content type, and a fill floats the label and emits input`() {
        setField(contentType = "email", system = redLabel())
        field().assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentType, ContentType.EmailAddress))
        val resting = redBox()
        field().performSemanticsAction(SemanticsActions.SetText) { it(AnnotatedString("ada@example.com")) }
        rule.waitForIdle()
        assertEquals(listOf("input:ada@example.com"), events)
        assertTrue("the label floated", redBox().top < resting.top - 4)
    }

    @Test
    fun `TXF-21 HTML autofill names map to Compose's content types`() {
        assertEquals(ContentType.Password, tanreiAutofillContentType("current-password"))
        assertEquals(ContentType.NewPassword, tanreiAutofillContentType("new-password"))
        assertEquals(ContentType.SmsOtpCode, tanreiAutofillContentType("one-time-code"))
        assertEquals(ContentType.PhoneNumber, tanreiAutofillContentType("tel"))
        assertEquals(ContentType.PostalCode, tanreiAutofillContentType("postal-code"))
        assertEquals(null, tanreiAutofillContentType(""))
        assertEquals(null, tanreiAutofillContentType("off"))
        setField()
        field().assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.ContentType))
    }

    // ── TXF-22: icons ────────────────────────────────────────────────────────

    private var seenGlyph: TanreiIconGlyph? = null
    private var seenIconColor: Color = Color.Unspecified

    @Composable
    private fun TagIcon(tag: String) {
        seenGlyph = LocalTanreiIconGlyph.current
        seenIconColor = LocalTanreiContentColor.current
        Box(Modifier.testTag(tag).size(TanreiTheme.tokens.textField.sizes.medium.iconSize).background(LocalTanreiContentColor.current))
    }

    @Test
    fun `TXF-22 an icon slot is given the icon size's unselected glyph and its part's color, padding-inline-with-icon from the edge`() {
        val system = tanrei.withField(TanreiTextFieldVariant.Outlined, TanreiInteractionState.Enabled) {
            it.copy(leadingIconColor = TanreiPaint.Role(TanreiColorRole.Success), trailingIconColor = TanreiPaint.Role(TanreiColorRole.Warning))
        }
        setField(labelHidden = true, system = system, leading = { TagIcon("lead") }, trailing = { TagIcon("trail") })
        rule.waitForIdle()
        assertEquals(tanrei.icon.glyph(medium.iconSize, selected = false), seenGlyph)
        val fieldBounds = field().getUnclippedBoundsInRoot()
        val lead = rule.onNodeWithTag("lead", useUnmergedTree = true).getUnclippedBoundsInRoot()
        val trail = rule.onNodeWithTag("trail", useUnmergedTree = true).getUnclippedBoundsInRoot()
        assertEquals((fieldBounds.left + medium.containerPaddingInlineWithIcon).value, lead.left.value, 0.5f)
        assertEquals((fieldBounds.right - medium.containerPaddingInlineWithIcon).value, trail.right.value, 0.5f)
        assertPixel("the leading icon's color", stagePx(STAGE + medium.containerPaddingInlineWithIcon + medium.iconSize / 2, ((topEdgeRow() + bottomEdgeRow()) / 2)), colors[TanreiColorRole.Success])
        assertPixel("the trailing icon's color", stagePx(STAGE + W - medium.containerPaddingInlineWithIcon - medium.iconSize / 2, ((topEdgeRow() + bottomEdgeRow()) / 2)), colors[TanreiColorRole.Warning])
        assertEquals("error look: the trailing icon turns to error", colors[TanreiColorRole.Error], tokens.variants.outlined.enabled.errorTrailingIconColor.resolve(colors))
    }

    @Test
    fun `TXF-22 an interactive element in a slot keeps its own semantics and is the next focus stop after the input - nothing is built in`() {
        var cleared = 0
        setField(value = "ada", trailing = {
            TanreiIconButton(onClick = { cleared++ }, contentDescription = "Clear", size = io.github.chnotchy.tanrei.tokens.TanreiIconButtonSize.Small) { Box(Modifier.size(16.dp)) }
        })
        rule.onNodeWithContentDescription("Clear").assertHasClickAction()
        assertEquals("the field has no button of its own", 1, rule.onAllNodes(hasClickAction() and hasSetTextAction().not()).fetchSemanticsNodes().size)
        rule.onNodeWithContentDescription("Clear").performClick()
        rule.waitForIdle()
        assertEquals(1, cleared)
    }

    @Test
    @KeyboardNavigation
    fun `TXF-22 Tab moves from the input to the icon button in the trailing slot`() {
        setField(value = "ada", trailing = {
            TanreiIconButton(onClick = {}, contentDescription = "Clear", size = io.github.chnotchy.tanrei.tokens.TanreiIconButtonSize.Small) { Box(Modifier.size(16.dp)) }
        })
        field().requestFocus().assertIsFocused()
        field().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithContentDescription("Clear").assertIsFocused()
    }

    // ── TXF-23: the name, required ───────────────────────────────────────────

    @Test
    fun `TXF-23 the label is the input's name, drawn or hidden - read once, and the placeholder is never the name`() {
        setField(placeholder = HINT)
        field()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf(LABEL)))
            .assert(hasSetTextAction())
        rule.onNodeWithText(LABEL, useUnmergedTree = true).assertExists()
        assertEquals("the drawn label is not a second name", 0, rule.onAllNodes(hasTextExactly(LABEL)).fetchSemanticsNodes().size)
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    @Test
    fun `TXF-23 without a label it still renders and works, the placeholder does not stand in, and a debuggable app reports it once`() = collectingReports { reports ->
        setDebuggable(true)
        setField(label = "", placeholder = HINT)
        field().assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.ContentDescription))
        field().assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Text))
        tapToFocus()
        field().performTextInput("a")
        assertEquals(listOf("input:a"), events)
        assertEquals(reports.toString(), 1, reports.size)
        assertTrue(reports.toString(), "TanreiTextField" in reports.single() && "label" in reports.single())
    }

    @Test
    fun `TXF-23 required is exposed to assistive technology and draws no mark`() {
        setField(value = "ada")
        val plain = stage()
        setField(value = "ada", required = true)
        field().assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "Required"))
        assertSame(plain, stage())
    }

    // ── TXF-24: right-to-left ────────────────────────────────────────────────

    @Test
    fun `TXF-24 right-to-left mirrors the field - leading icon and label on the right, supporting text on the right, counter on the left`() {
        setField(direction = LayoutDirection.Rtl, supportingText = HELP, counter = true, leading = { TagIcon("lead") }, trailing = { TagIcon("trail") })
        val fieldBounds = field().getUnclippedBoundsInRoot()
        val lead = rule.onNodeWithTag("lead", useUnmergedTree = true).getUnclippedBoundsInRoot()
        val trail = rule.onNodeWithTag("trail", useUnmergedTree = true).getUnclippedBoundsInRoot()
        assertEquals((fieldBounds.right - medium.containerPaddingInlineWithIcon).value, lead.right.value, 0.5f)
        assertEquals((fieldBounds.left + medium.containerPaddingInlineWithIcon).value, trail.left.value, 0.5f)
        val help = rule.onNodeWithText(HELP, useUnmergedTree = true).getUnclippedBoundsInRoot()
        val textStart = medium.containerPaddingInlineWithIcon + medium.iconSize + medium.containerGap
        assertEquals((fieldBounds.right - textStart).value, help.right.value, 0.5f)
        val counter = rule.onAllNodes(hasTextExactly("0"), useUnmergedTree = true).onFirst().getUnclippedBoundsInRoot()
        assertEquals((fieldBounds.left + medium.containerPaddingInline).value, counter.left.value, 0.5f)
    }

    @Test
    fun `TXF-24 in right-to-left an email is laid out left-to-right, aligned to the start edge - the right`() {
        setField(direction = LayoutDirection.Rtl, type = TanreiTextFieldType.Email, labelHidden = true, value = "ada@example.com")
        val right = lastColumnDarkerThan(surface)
        assertEquals(with(rule.density) { (STAGE + W - medium.containerPaddingInline).toPx() }, right.toFloat(), 3f * rule.density.density)
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun assertEditable(text: String) =
        assertEquals(text, field().fetchSemanticsNode().config.getOrNull(SemanticsProperties.EditableText)?.text)

    private fun setDebuggable(debuggable: Boolean) {
        val info = ApplicationProvider.getApplicationContext<Context>().applicationInfo
        info.flags = if (debuggable) info.flags or ApplicationInfo.FLAG_DEBUGGABLE else info.flags and ApplicationInfo.FLAG_DEBUGGABLE.inv()
    }

    private fun collectingReports(block: (List<String>) -> Unit) {
        val reports = mutableListOf<String>()
        val previous = TanreiDiagnostics.reporter
        TanreiDiagnostics.reporter = { reports += it }
        try {
            block(reports)
        } finally {
            TanreiDiagnostics.reporter = previous
        }
    }

    private fun TanreiSystem.withField(
        variant: TanreiTextFieldVariant,
        state: TanreiInteractionState,
        change: (TanreiTextFieldVariantStateTokens) -> TanreiTextFieldVariantStateTokens,
    ): TanreiSystem {
        val tokens = textField.variants[variant]
        val changed = when (state) {
            TanreiInteractionState.Enabled -> tokens.copy(enabled = change(tokens.enabled))
            TanreiInteractionState.Hovered -> tokens.copy(hovered = change(tokens.hovered))
            TanreiInteractionState.Focused -> tokens.copy(focused = change(tokens.focused))
            TanreiInteractionState.Disabled -> tokens.copy(disabled = change(tokens.disabled))
            TanreiInteractionState.Pressed -> error("a field has no pressed state")
        }
        val variants = when (variant) {
            TanreiTextFieldVariant.Filled -> textField.variants.copy(filled = changed)
            TanreiTextFieldVariant.Outlined -> textField.variants.copy(outlined = changed)
            else -> error("not used by these tests: $variant")
        }
        return copy(textField = textField.copy(variants = variants))
    }

    /** Every state of both variants draws its label in [RED], so the label's pixels can be found. */
    private fun redLabel(): TanreiSystem {
        var system = tanrei
        for (variant in listOf(TanreiTextFieldVariant.Outlined, TanreiTextFieldVariant.Filled)) {
            for (state in listOf(TanreiInteractionState.Enabled, TanreiInteractionState.Hovered, TanreiInteractionState.Focused)) {
                system = system.withField(variant, state) { it.copy(labelColor = TanreiPaint.Role(TanreiColorRole.Error)) }
            }
        }
        return system
    }

    private fun placeholderIn(role: TanreiColorRole): TanreiSystem {
        var system = tanrei
        for (state in listOf(TanreiInteractionState.Enabled, TanreiInteractionState.Hovered, TanreiInteractionState.Focused)) {
            system = system.withField(TanreiTextFieldVariant.Outlined, state) { it.copy(placeholderColor = TanreiPaint.Role(role)) }
        }
        return system
    }

    private val RED: Color get() = colors[TanreiColorRole.Error]

    private fun stage(): PixelMap = rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap()

    private fun stagePx(x: Dp, y: Int): Color = with(rule.density) { stage()[x.roundToPx(), y] }

    /** A pixel rectangle of the stage, in pixels: [left, right) × [top, bottom). */
    private data class PxRect(val left: Int, val top: Int, val right: Int, val bottom: Int) {
        val height: Int get() = bottom - top
    }

    private fun stageRect(): PxRect = stage().let { PxRect(0, 0, it.width, it.height) }

    /** The rows of the column at the field's horizontal centre that differ from [base], grouped into runs. */
    private fun edgeRuns(base: Color = surface): List<IntRange> {
        val map = stage()
        val x = with(rule.density) { (STAGE + W / 2).roundToPx() }
        val runs = mutableListOf<IntRange>()
        var start = -1
        for (y in 0 until map.height) {
            val differs = !isClose(map[x, y], base)
            if (differs && start < 0) start = y
            if (!differs && start >= 0) {
                runs += start until y
                start = -1
            }
        }
        if (start >= 0) runs += start until map.height
        return runs
    }

    /** The container's first row (an outline's top edge, or a fill's top). */
    private fun topEdgeRow(base: Color = surface): Int = edgeRuns(base).first().first

    /** The container's last row: the end of an outline's second run, or of a fill's only one. */
    private fun bottomEdgeRow(base: Color = surface): Int {
        val runs = edgeRuns(base)
        val first = runs.first()
        // A fill is one run as tall as the container; an outline's top edge is a thin run, its bottom edge the next.
        return if (first.last - first.first > with(rule.density) { 4.dp.roundToPx() }) first.last else runs[1].last
    }

    private fun bottomEdge(): Color = stage()[with(rule.density) { (STAGE + W / 2).roundToPx() }, bottomEdgeRow()]

    /** Inside the container, near its bottom-right, clear of text. */
    private fun insideContainer(): Color = with(rule.density) { stage()[(STAGE + W - 6.dp).roundToPx(), bottomEdgeRow() - 4.dp.roundToPx()] }

    private fun assertContainerHeight(expected: Dp) {
        val height = bottomEdgeRow() - topEdgeRow() + 1
        assertEquals(with(rule.density) { expected.toPx() }, height.toFloat(), 1.5f)
    }

    /** The vertical centre of the input line, in stage pixels. */
    private fun inputLineCenter(): Float = inputBand().let { (it.top + it.bottom) / 2f }

    /** The input line: the value's text row inside the container. */
    private fun inputBand(): PxRect {
        val scene = scene!!
        val metrics = tokens.sizes[scene.size]
        val top = topEdgeRow()
        val bottom = bottomEdgeRow() + 1
        return with(rule.density) {
            val line = metrics.inputTypescale.lineHeight.toPx()
            val drawsLabel = !scene.labelHidden && scene.label.isNotBlank()
            val filledLabel = drawsLabel && scene.variant == TanreiTextFieldVariant.Filled
            val lineTop = if (filledLabel) {
                val block = metrics.labelFloatedTypescale.lineHeight.toPx() + line
                top + ((bottom - top) - block) / 2f + metrics.labelFloatedTypescale.lineHeight.toPx()
            } else if (!scene.singleLine) {
                top + metrics.containerPaddingBlock.toPx()
            } else {
                top + ((bottom - top) - line) / 2f
            }
            PxRect((STAGE + 1.dp).roundToPx(), lineTop.toInt(), (STAGE + W - 1.dp).roundToPx(), (lineTop + line).toInt())
        }
    }

    private fun supportingBand(): PxRect = with(rule.density) {
        val top = bottomEdgeRow() + 1 + tokens.supportingTextGap.roundToPx()
        PxRect(STAGE.roundToPx(), top, (STAGE + W).roundToPx(), top + tokens.supportingTextTypescale.lineHeight.toPx().toInt())
    }

    /** The column of the gap in the outline: just after the label's start, where the outline is at rest. */
    private fun labelGapX(): Int = with(rule.density) { (STAGE + medium.containerPaddingInline + 4.dp).roundToPx() }

    /** The field's height, in pixels (its whole node: the room above an outlined container included). */
    private fun fieldHeight(): Float = field().getUnclippedBoundsInRoot().let { with(rule.density) { (it.bottom - it.top).toPx() } }

    /** The rows with pixels near [RED], grouped into runs: one per line of the label. */
    private fun redBands(): List<IntRange> {
        val map = stage()
        val rows = (0 until map.height).filter { y -> (0 until map.width).any { x -> isNear(map[x, y], RED) } }
        val bands = mutableListOf<IntRange>()
        for (y in rows) {
            val last = bands.lastOrNull()
            if (last != null && y == last.last + 1) bands[bands.size - 1] = last.first..y else bands += y..y
        }
        return bands
    }

    /** The width, in pixels, of the pixels near [color] in [rows]. */
    private fun inkWidth(rows: IntRange, color: Color): Int {
        val map = stage()
        val xs = (0 until map.width).filter { x -> rows.any { y -> isNear(map[x, y], color) } }
        return xs.last() - xs.first() + 1
    }

    /** The bounding box of the pixels near [color]. */
    private fun boxNear(color: Color): PxRect {
        val map = stage()
        var left = Int.MAX_VALUE
        var top = Int.MAX_VALUE
        var right = -1
        var bottom = -1
        for (y in 0 until map.height) for (x in 0 until map.width) if (isNear(map[x, y], color)) {
            left = minOf(left, x); top = minOf(top, y); right = maxOf(right, x); bottom = maxOf(bottom, y)
        }
        assertTrue("found $color", right >= 0)
        return PxRect(left, top, right + 1, bottom + 1)
    }

    /**
     * The first and last rows of a [width]-wide field's container, from the column 3 dp inside its end — clear of the
     * label, which ends `padding-inline` before it.
     */
    private fun narrowContainerRows(width: Dp): Pair<Int, Int> {
        val map = stage()
        val x = with(rule.density) { (STAGE + width - 3.dp).roundToPx() }
        val rows = (0 until map.height).filter { y -> !isClose(map[x, y], surface) }
        return rows.first() to rows.last()
    }

    /** The bounding box of the pixels near [RED]. */
    private fun redBox(): PxRect {
        val map = stage()
        var left = Int.MAX_VALUE
        var top = Int.MAX_VALUE
        var right = -1
        var bottom = -1
        for (y in 0 until map.height) for (x in 0 until map.width) if (isNear(map[x, y], RED)) {
            left = minOf(left, x); top = minOf(top, y); right = maxOf(right, x); bottom = maxOf(bottom, y)
        }
        assertTrue("the label was drawn", right >= 0)
        return PxRect(left, top, right + 1, bottom + 1)
    }

    private fun countNear(rect: PxRect, color: Color): Int {
        val map = stage()
        var count = 0
        for (y in rect.top until minOf(rect.bottom, map.height)) for (x in rect.left until minOf(rect.right, map.width)) if (isNear(map[x, y], color)) count++
        return count
    }

    /** The first column of the stage with a pixel near [color]. */
    private fun firstColumnNear(color: Color): Int {
        val map = stage()
        for (x in 0 until map.width) for (y in 0 until map.height) if (isNear(map[x, y], color)) return x
        error("no pixel near $color")
    }

    /** The last column of the input band darker than [base] (the typed text's right end). */
    private fun lastColumnDarkerThan(base: Color): Int {
        val map = stage()
        val band = inputBand()
        val inside = with(rule.density) { (STAGE + W - 3.dp).roundToPx() }
        for (x in inside downTo 0) for (y in band.top until band.bottom) {
            val p = map[x, y]
            if (p.red < base.red - 0.3f) return x + 1
        }
        error("no text")
    }

    /** The pixel of [rect] closest to [toward] (by default the darkest): a glyph's solid core. */
    private fun darkest(rect: PxRect, toward: Color = Color.Black): Color {
        val map = stage()
        var best = map[rect.left, rect.top]
        var bestDistance = Float.MAX_VALUE
        for (y in rect.top until rect.bottom) for (x in rect.left until rect.right) {
            val p = map[x, y]
            val d = abs(p.red - toward.red) + abs(p.green - toward.green) + abs(p.blue - toward.blue)
            if (d < bestDistance) { bestDistance = d; best = p }
        }
        return best
    }

    private fun assertSame(expected: PixelMap, actual: PixelMap) {
        assertEquals(expected.height, actual.height)
        for (y in 0 until expected.height) for (x in 0 until expected.width) assertEquals("pixel $x,$y", expected[x, y], actual[x, y])
    }

    private fun isNear(actual: Color, expected: Color): Boolean =
        maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue)) <= NEAR_TOLERANCE

    private fun isClose(actual: Color, expected: Color, tolerance: Float = PIXEL_TOLERANCE): Boolean =
        maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue)) <= tolerance

    private fun assertPixel(what: String, actual: Color, expected: Color, tolerance: Float = PIXEL_TOLERANCE) =
        assertTrue("$what: expected $expected but was $actual", isClose(actual, expected, tolerance))

    private companion object {
        const val TAG = "text-field"
        const val UNKNOWN_TAG = "text-field-unknown"
        const val STAGE_TAG = "stage"
        const val LABEL = "Email"
        const val SHORT_LABEL = "Phone"

        /** Two words that fit on two lines of a 96 dp field, resting and floated, and not on one. */
        const val WRAPPING_LABEL = "Mobile number"
        const val HELP = "Help"
        const val LONG_HELP = "We only use it to sign you in, and we never share it with anyone else at all."
        const val ERROR = "Enter a complete email address."
        const val HINT = "you@example.com"
        const val PIXEL_TOLERANCE = 3f / 255f
        const val NEAR_TOLERANCE = 0.12f
        val W = 280.dp
        val STAGE = 16.dp
    }
}

/** An exact text match (the merged tree joins a node's texts). */
private fun hasTextExactly(text: String): SemanticsMatcher =
    SemanticsMatcher("text is exactly \"$text\"") { node -> node.config.getOrNull(SemanticsProperties.Text)?.map { it.text } == listOf(text) }

private fun hasChild(matcher: SemanticsMatcher): SemanticsMatcher =
    SemanticsMatcher("has a child that ${matcher.description}") { node -> node.children.any { matcher.matches(it) } }

/** TXF-14 where motion is reduced (the animator duration scale is 0, see `TanreiButtonReducedMotionTest`). */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiTextFieldReducedMotionTest {
    private object NoMotion : MotionDurationScale {
        override val scaleFactor: Float = 0f
    }

    @get:Rule
    val rule = createComposeRule(effectContext = NoMotion)

    @Test
    fun `TXF-14 where motion is reduced the label floats and the edge recolors on the next frame`() {
        val tanrei = TanreiSystem.Tanrei
        val slow = 400
        val system = tanrei.copy(textField = tanrei.textField.copy(motionLabelDuration = slow, motionStateDuration = slow))
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Box(Modifier.background(TanreiColorRole.Surface.color).padding(16.dp)) {
                    TanreiTextField(value = "", onValueChange = {}, label = "Email", modifier = Modifier.testTag("field").width(280.dp).semantics { contentDescription = "Email" })
                }
            }
        }
        val before = rule.onNodeWithTag("field").captureToImage().toPixelMap()
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag("field").performClick()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        val after = rule.onNodeWithTag("field").captureToImage().toPixelMap()
        // The whole move in two frames: the focused edge (focus-ring) is fully there at the field's bottom edge.
        val ring = tanrei.colors.light[TanreiColorRole.FocusRing]
        val x = after.width / 2
        val edge = (after.height - 1 downTo 0).first { y -> after[x, y].let { abs(it.red - ring.red) + abs(it.green - ring.green) + abs(it.blue - ring.blue) < 0.05f } }
        assertTrue("the focus-ring edge at once (row $edge)", edge > 0)
        assertNotEquals("the label moved", before[with(rule.density) { 16.dp.roundToPx() }, before.height / 2], after[with(rule.density) { 16.dp.roundToPx() }, after.height / 2])
    }
}
