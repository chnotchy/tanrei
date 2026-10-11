package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Canvas
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.ImageBitmapConfig
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.graphics.PixelMap
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.graphics.drawOutline
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertHasClickAction
import androidx.compose.ui.test.assertHeightIsEqualTo
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertWidthIsEqualTo
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.accessibility.enableAccessibilityChecks
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performMouseInput
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.test.tryPerformAccessibilityChecks
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.acme.design.Acme
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.primitives.TanreiText
import io.github.chnotchy.tanrei.primitives.tanreiContainerShape
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph
import io.github.chnotchy.tanrei.theme.LocalTanreiTextStyle
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiFontFamilies
import io.github.chnotchy.tanrei.theme.TanreiIconGlyph
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.glyph
import io.github.chnotchy.tanrei.tokens.Cupertino
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiFocusStyle
import io.github.chnotchy.tanrei.tokens.TanreiFontStack
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonVariantStateTokens
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiMeasure
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiPressedFeedback
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import kotlin.math.abs
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
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
 * Behaviour tests for `specs/icon-button.spec.json`. Each test names the behaviour id (`ICB-n`) it covers.
 * Runs on the JVM (Robolectric, native graphics) — no emulator needed. The icon in most tests is [SolidIcon]: a box
 * that fills the icon slot with the icon color it is given, so "the icon color" is a pixel at the button's center.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiIconButtonTest {
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
    private val tokens = tanrei.iconButton
    private val measure = tanrei.measure
    private val surface = colors[TanreiColorRole.Surface]

    /** Everything the button emitted, in order: `click`, `change:true` … */
    private val events = mutableListOf<String>()
    private val clicks get() = events.count { it == "click" }
    private var checked by mutableStateOf(false)

    @Before
    fun setUp() {
        // ATF checks: NOT_RUN under Robolectric (see TanreiButtonTest); they run for real in the gallery's
        // instrumented tests. The explicit semantics assertions below guard accessibility here.
        rule.enableAccessibilityChecks()
    }

    /** What [setIconButton] renders; changing it recomposes the one scene a test may set. */
    private class Scene(
        val variant: TanreiIconButtonVariant,
        val size: TanreiIconButtonSize,
        val enabled: Boolean,
        val toggle: Boolean,
        val system: TanreiSystem,
        val label: String,
        val fontFamilies: TanreiFontFamilies,
        val density: ((Density) -> Density)?,
        val icon: @Composable () -> Unit,
    )

    private var scene by mutableStateOf<Scene?>(null)

    /**
     * One icon button on the surface. [toggle] gives it an `onCheckedChange` that records the change and flips
     * [checked], so a toggle really toggles; [checked] starts at [initiallyChecked]. Called again, it replaces the
     * scene with a fresh composition of the new one (a test may set content only once).
     */
    private fun setIconButton(
        variant: TanreiIconButtonVariant = TanreiIconButtonVariant.Standard,
        size: TanreiIconButtonSize = TanreiIconButtonSize.Medium,
        enabled: Boolean = true,
        toggle: Boolean = false,
        initiallyChecked: Boolean = false,
        system: TanreiSystem = tanrei,
        label: String = LABEL,
        fontFamilies: TanreiFontFamilies = TanreiFontFamilies.PlatformDefault,
        density: ((Density) -> Density)? = null,
        icon: @Composable () -> Unit = { SolidIcon() },
    ) {
        checked = initiallyChecked
        val first = scene == null
        scene = Scene(variant, size, enabled, toggle, system, label, fontFamilies, density, icon)
        if (!first) {
            rule.waitForIdle()
            return
        }
        rule.setContent {
            val current = scene ?: return@setContent
            key(current) {
                val content = @Composable {
                    TanreiTheme(system = current.system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard, fontFamilies = current.fontFamilies) {
                        Column(Modifier.background(TanreiColorRole.Surface.color).padding(TanreiTheme.tokens.space.space200)) {
                            TanreiIconButton(
                                onClick = { events += "click" },
                                contentDescription = current.label,
                                modifier = Modifier.testTag(TAG),
                                variant = current.variant,
                                size = current.size,
                                checked = checked,
                                onCheckedChange = if (current.toggle) { value -> events += "change:$value"; checked = value } else null,
                                enabled = current.enabled,
                                icon = current.icon,
                            )
                        }
                    }
                }
                val density = current.density
                if (density == null) content() else CompositionLocalProvider(LocalDensity provides density(LocalDensity.current)) { content() }
            }
        }
    }

    private fun button() = rule.onNodeWithTag(TAG)

    // ── Semantics ────────────────────────────────────────────────────────────

    @Test
    fun `ICB-11 a plain icon button is a button named by its contentDescription, with no toggle state, and passes accessibility checks`() {
        setIconButton()
        button()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf(LABEL)))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.ToggleableState))
            .assertHasClickAction()
            .assertIsEnabled()
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    @Test
    fun `the icon is decorative - a ligature drawn as text is not announced, the contentDescription is the only name`() {
        setIconButton(icon = { TanreiText(GLYPH_NAME) })
        button()
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Text))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf(LABEL)))
    }

    // ── ICB-1: activation emits click exactly once ───────────────────────────

    @Test
    fun `ICB-1 a tap emits click exactly once`() {
        setIconButton()
        button().performClick()
        rule.waitForIdle()
        assertEquals(listOf("click"), events)
    }

    @Test
    @KeyboardNavigation
    fun `ICB-1 Enter and Space each emit click exactly once`() {
        setIconButton()
        button().requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals(1, clicks)
        button().performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        assertEquals(2, clicks)
    }

    @Test
    fun `ICB-1 an assistive technology click emits click exactly once`() {
        setIconButton()
        button().performSemanticsAction(SemanticsActions.OnClick)
        rule.waitForIdle()
        assertEquals(listOf("click"), events)
    }

    // ── ICB-2: disabled ──────────────────────────────────────────────────────

    @Test
    fun `ICB-2 a disabled icon button emits neither click nor change`() {
        setIconButton(enabled = false)
        button().performTouchInput { down(center); up() }
        rule.waitForIdle()
        assertEquals(emptyList<String>(), events)
    }

    @Test
    fun `ICB-2 a disabled toggle emits neither change nor click, and keeps its value`() {
        setIconButton(enabled = false, toggle = true, initiallyChecked = true)
        button().performTouchInput { down(center); up() }
        rule.waitForIdle()
        assertEquals(emptyList<String>(), events)
        assertTrue(checked)
        button().assert(SemanticsMatcher.expectValue(SemanticsProperties.ToggleableState, ToggleableState.On))
    }

    @Test
    @KeyboardNavigation
    fun `ICB-2 a disabled icon button is not focusable and exposes the disabled state`() {
        setIconButton(enabled = false)
        button()
            .assertIsNotEnabled()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Focused))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsActions.RequestFocus))
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    // ── ICB-3: the highest-precedence active state is drawn from THAT state's tokens ──

    @Test
    fun `ICB-3 pressed draws the pressed container token, and release returns to the resting token`() {
        setIconButton(variant = TanreiIconButtonVariant.Filled)
        button().performTouchInput { down(center) }
        rule.waitForIdle()
        assertContainer(tokens.variants.filled.pressed.containerColor)
        button().performTouchInput { up() }
        rule.waitForIdle()
        assertContainer(tokens.variants.filled.enabled.containerColor)
    }

    @Test
    fun `ICB-3 hovered draws the hovered container token`() {
        setIconButton(variant = TanreiIconButtonVariant.Filled)
        button().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainer(tokens.variants.filled.hovered.containerColor)
    }

    @Test
    @KeyboardNavigation
    fun `ICB-3 keyboard focus draws the focused container token`() {
        setIconButton(variant = TanreiIconButtonVariant.Filled)
        button().requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertContainer(tokens.variants.filled.focused.containerColor)
    }

    @Test
    fun `ICB-3 ICB-4 a tap does not select the focused state - once the press is over the resting tokens return, and no ring shows`() {
        setIconButton(variant = TanreiIconButtonVariant.Filled)
        button().performTouchInput { down(center); up() }
        rule.waitForIdle()
        button().assert(SemanticsMatcher.expectValue(SemanticsProperties.Focused, false))
        assertContainer(tokens.variants.filled.enabled.containerColor)
        assertPixel("no ring", focusProbe(outerStrokeCenter(measure)), surface)
    }

    @Test
    fun `ICB-3 in the default system the standard state layer is the icon color mixed into the transparent container`() {
        setIconButton()
        button().performTouchInput { down(center) }
        rule.waitForIdle()
        assertContainerColor(colors[TanreiColorRole.OnSurfaceVariant].copy(alpha = tanrei.state.pressedStateLayerOpacity).compositeOver(surface))
    }

    @Test
    fun `ICB-3 a system that gives pressed another icon paint draws the icon in it`() {
        setIconButton(system = tanrei.withStandard(TanreiInteractionState.Pressed) { it.copy(iconColor = TanreiPaint.Role(TanreiColorRole.Error)) })
        assertPixel("resting icon", iconProbe(), colors[TanreiColorRole.OnSurfaceVariant])
        button().performTouchInput { down(center) }
        rule.waitForIdle()
        assertPixel("pressed icon", iconProbe(), colors[TanreiColorRole.Error])
    }

    @Test
    fun `ICB-3 the outline comes from the state's tokens`() {
        setIconButton(variant = TanreiIconButtonVariant.Filled, system = tanrei.withFilled(TanreiInteractionState.Hovered) { it.copy(outlineColor = TanreiPaint.Role(TanreiColorRole.Error)) })
        assertPixel("no outline at rest", topEdgeProbe(), colors[TanreiColorRole.Primary])
        button().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertPixel("hovered outline", topEdgeProbe(), colors[TanreiColorRole.Error])
    }

    @Test
    fun `ICB-3 the pressed opacity token dims the whole icon button, icon included`() {
        val opacity = 0.4f
        setIconButton(variant = TanreiIconButtonVariant.Filled, system = tanrei.copy(iconButton = tokens.copy(pressed = tokens.pressed.copy(opacity = opacity))))
        button().performTouchInput { down(center) }
        rule.waitForIdle()
        val pressed = tokens.variants.filled.pressed
        assertContainerColor(pressed.containerColor.resolve(colors).copy(alpha = opacity).compositeOver(surface))
        assertPixel("icon", iconProbe(), pressed.iconColor.resolve(colors).copy(alpha = opacity).compositeOver(surface))
    }

    @Test
    fun `ICB-3 the pressed shape token shapes the pressed container`() {
        val system = tanrei.copy(iconButton = tokens.copy(pressed = tokens.pressed.copy(containerShape = 0.dp)))
        setIconButton(variant = TanreiIconButtonVariant.Filled, system = system)
        assertPixel("resting corner is cut", cornerProbe(), surface)
        button().performTouchInput { down(center) }
        rule.waitForIdle()
        assertPixel("pressed corner is square", cornerProbe(), tokens.variants.filled.pressed.containerColor.resolve(colors))
    }

    @Test
    @KeyboardNavigation
    fun `ICB-3 under acme, which values hovered, focused and pressed differently - pressed wins over focused wins over hovered, in pixels`() {
        val acme = TanreiSystem.Acme
        val standard = acme.iconButton.variants.standard
        val schemeColors = acme.colors.light
        fun over(paint: TanreiPaint) = paint.resolve(schemeColors).compositeOver(schemeColors[TanreiColorRole.Surface])
        val all = listOf(standard.enabled, standard.hovered, standard.focused, standard.pressed).map { over(it.containerColor) }
        assertEquals("acme tells the four states apart", 4, all.toSet().size)

        setIconButton(system = acme)
        button().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainerColor(over(standard.hovered.containerColor))
        button().requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertContainerColor(over(standard.focused.containerColor)) // hovered AND focused: focused wins
        button().performKeyInput { keyDown(Key.Enter) }
        rule.waitForIdle()
        assertContainerColor(over(standard.pressed.containerColor)) // hovered AND focused AND pressed: pressed wins
        button().performKeyInput { keyUp(Key.Enter) }
        rule.waitForIdle()
        assertContainerColor(over(standard.focused.containerColor))
        assertEquals(1, clicks)
    }

    // ── ICB-4: focus ring on keyboard focus only, never animated ─────────────

    @Test
    @KeyboardNavigation
    fun `ICB-4 keyboard focus shows the focus ring on the first frame, outside the container`() {
        setIconButton()
        assertPixel("no ring before focus", focusProbe(outerStrokeCenter(measure)), surface)
        rule.mainClock.autoAdvance = false
        button().requestFocus()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("ring at full color on the first frame", focusProbe(outerStrokeCenter(measure)), colors[TanreiColorRole.FocusRing])
        assertPixel("the offset leaves the surface visible", focusProbe(measure.focusOffset / 2), surface)
    }

    @Test
    fun `ICB-4 a pointer press does not show the focus ring`() {
        setIconButton()
        button().performTouchInput { down(center) }
        rule.waitForIdle()
        assertPixel("no ring while pressed", focusProbe(outerStrokeCenter(measure)), surface)
    }

    // ── ICB-5: hit area on both axes, visual size unchanged ──────────────────

    @Test
    fun `ICB-5 every size reserves the touch target on both axes but draws its own square`() {
        for (size in listOf(TanreiIconButtonSize.Small, TanreiIconButtonSize.Medium, TanreiIconButtonSize.Large)) {
            val side = tokens.sizes[size].containerSize
            assertTrue("$size is below the target", side < measure.targetTouch)
            setIconButton(variant = TanreiIconButtonVariant.Filled, size = size)
            button().assertWidthIsEqualTo(measure.targetTouch).assertHeightIsEqualTo(measure.targetTouch)
            val inset = (measure.targetTouch - side) / 2
            val map = button().captureToImage().toPixelMap()
            val container = tokens.variants.filled.enabled.containerColor.resolve(colors)
            val middle = measure.targetTouch / 2
            // Probe the edges beside the icon: the square is exactly `container.size` on both axes.
            val beside = inset + (side - tokens.sizes[size].iconSize) / 4
            assertPixel("$size: left of the square", map.at(inset - 1.dp, middle), surface)
            assertPixel("$size: its first column", map.at(inset + 1.dp, middle), container)
            assertPixel("$size: its last column", map.at(measure.targetTouch - inset - 1.dp, middle), container)
            assertPixel("$size: right of the square", map.at(measure.targetTouch - inset + 1.dp, middle), surface)
            assertPixel("$size: above", map.at(middle, inset - 1.dp), surface)
            assertPixel("$size: its first row", map.at(middle, inset + 1.dp), container)
            assertPixel("$size: its last row", map.at(beside, measure.targetTouch - inset - 1.dp), container)
            assertPixel("$size: below", map.at(middle, measure.targetTouch - inset + 1.dp), surface)
        }
    }

    @Test
    fun `ICB-5 a tap in the corner of the target, outside the visual square, emits click`() {
        setIconButton(size = TanreiIconButtonSize.Small)
        button().performTouchInput { down(Offset(1f, 1f)); up() }
        rule.waitForIdle()
        assertEquals(1, clicks)
    }

    @Test
    fun `ICB-5 the target size comes from the system`() {
        val target = 60.dp
        setIconButton(system = tanrei.copy(measure = measure.copy(targetTouch = target)))
        button().assertWidthIsEqualTo(target).assertHeightIsEqualTo(target)
    }

    // ── ICB-6: disabled is drawn from the disabled tokens of the variant and the look ──

    @Test
    fun `ICB-6 disabled renders the container and the icon from the disabled tokens`() {
        setIconButton(enabled = false)
        val disabled = tokens.variants.standard.disabled
        val container = disabled.containerColor.resolve(colors).compositeOver(surface)
        assertContainerColor(container)
        assertPixel("icon", iconProbe(), disabled.iconColor.resolve(colors).compositeOver(container))
    }

    @Test
    fun `ICB-6 a disabled toggle draws the disabled tokens of its selection`() {
        val system = tanrei.withFilled(TanreiInteractionState.Disabled) {
            it.copy(
                containerColor = TanreiPaint.Role(TanreiColorRole.Error),
                unselectedContainerColor = TanreiPaint.Role(TanreiColorRole.Warning),
                selectedContainerColor = TanreiPaint.Role(TanreiColorRole.Success),
            )
        }
        setIconButton(variant = TanreiIconButtonVariant.Filled, enabled = false, toggle = true, initiallyChecked = true, system = system)
        assertContainerColor(colors[TanreiColorRole.Success])
        checked = false
        rule.waitForIdle()
        assertContainerColor(colors[TanreiColorRole.Warning])
    }

    @Test
    fun `ICB-6 the disabled opacity token dims the whole control, and disabled ignores hover`() {
        val opacity = 0.5f
        val system = tanrei.withFilled(TanreiInteractionState.Disabled) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
            .let { it.copy(iconButton = it.iconButton.copy(disabled = it.iconButton.disabled.copy(opacity = opacity))) }
        setIconButton(variant = TanreiIconButtonVariant.Filled, enabled = false, system = system)
        val expected = colors[TanreiColorRole.Error].copy(alpha = opacity).compositeOver(surface)
        assertContainerColor(expected)
        button().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainerColor(expected)
    }

    // ── ICB-7: a value the design system does not have draws as the default ──

    private fun setDefaultAndUnknown() {
        rule.setContent {
            TanreiTheme(system = tanrei, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Column(Modifier.background(TanreiColorRole.Surface.color)) {
                    TanreiIconButton(onClick = {}, contentDescription = LABEL, modifier = Modifier.testTag(TAG)) { SolidIcon() }
                    TanreiIconButton(
                        onClick = { events += "click" },
                        contentDescription = LABEL,
                        modifier = Modifier.testTag(UNKNOWN_TAG),
                        variant = TanreiIconButtonVariant("ghost"),
                        size = TanreiIconButtonSize("huge"),
                    ) { SolidIcon() }
                }
            }
        }
    }

    @Test
    fun `ICB-7 the lookups are total - an unknown size or variant reads the default value's tokens`() {
        assertTrue(TanreiIconButtonSize("huge") !in tokens.sizes)
        assertTrue(TanreiIconButtonVariant("ghost") !in tokens.variants)
        assertEquals(tokens.sizes.medium, tokens.sizes[TanreiIconButtonSize("huge")])
        assertEquals(tokens.variants.standard, tokens.variants[TanreiIconButtonVariant("ghost")])
        // The defaults are the spec's: size medium, variant standard.
        assertEquals(listOf("small", "medium", "large"), tokens.sizes.keys.map { it.key })
        assertEquals(listOf("standard", "filled", "tonal", "outlined"), tokens.variants.keys.map { it.key })
    }

    @Test
    fun `ICB-7 in a release-like app an unknown size and variant render exactly like the default, silently`() = collectingReports { reports ->
        setDebuggable(false)
        setDefaultAndUnknown()
        val expected = button().captureToImage().toPixelMap()
        val actual = rule.onNodeWithTag(UNKNOWN_TAG).captureToImage().toPixelMap()
        assertEquals(expected.width, actual.width)
        assertEquals(expected.height, actual.height)
        for (y in 0 until expected.height) for (x in 0 until expected.width) assertEquals("pixel $x,$y", expected[x, y], actual[x, y])
        rule.onNodeWithTag(UNKNOWN_TAG).performClick()
        rule.waitForIdle()
        assertEquals("it still works", 1, clicks)
        assertEquals("nothing is reported outside debuggable apps", emptyList<String>(), reports)
    }

    @Test
    fun `ICB-7 a debuggable app reports the unknown size and variant once, and still renders the default`() = collectingReports { reports ->
        setDebuggable(true)
        setDefaultAndUnknown()
        rule.onNodeWithTag(UNKNOWN_TAG).assertWidthIsEqualTo(measure.targetTouch).assertHeightIsEqualTo(measure.targetTouch)
        rule.onNodeWithTag(UNKNOWN_TAG).performClick()
        rule.waitForIdle()
        assertEquals(reports.toString(), 2, reports.size)
        assertTrue(reports.toString(), reports.any { "TanreiIconButton" in it && "size \"huge\"" in it && "\"tanrei\"" in it })
        assertTrue(reports.toString(), reports.any { "TanreiIconButton" in it && "variant \"ghost\"" in it })
    }

    @Test
    fun `ICB-7 a known size and variant report nothing in a debuggable app`() = collectingReports { reports ->
        setDebuggable(true)
        setIconButton(variant = TanreiIconButtonVariant.Tonal, size = TanreiIconButtonSize.Large)
        rule.waitForIdle()
        assertEquals(emptyList<String>(), reports)
    }

    // ── ICB-8: pressed appears without delay and stays for press-hold ────────

    @Test
    fun `ICB-8 a tap that ends at once shows the pressed state on the next frame and keeps it for press-hold`() {
        setIconButton(variant = TanreiIconButtonVariant.Filled)
        val hold = tanrei.motion.duration.pressHold.toLong()
        rule.mainClock.autoAdvance = false
        button().performTouchInput { down(center); up() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertContainer(tokens.variants.filled.pressed.containerColor)
        rule.mainClock.advanceTimeBy(hold / 2)
        assertContainer(tokens.variants.filled.pressed.containerColor)
        rule.mainClock.advanceTimeBy(hold + tokens.motionStateDuration * 2L)
        assertContainer(tokens.variants.filled.enabled.containerColor)
        assertEquals(1, clicks)
    }

    @Test
    @KeyboardNavigation
    fun `ICB-8 Enter and Space show the pressed state for press-hold too`() {
        val acme = TanreiSystem.Acme
        val standard = acme.iconButton.variants.standard
        val acmeColors = acme.colors.light
        fun over(paint: TanreiPaint) = paint.resolve(acmeColors).compositeOver(acmeColors[TanreiColorRole.Surface])
        setIconButton(system = acme)
        button().requestFocus().assertIsFocused()
        rule.waitForIdle()
        for (key in listOf(Key.Enter, Key.Spacebar)) {
            rule.mainClock.autoAdvance = false
            button().performKeyInput { pressKey(key) }
            rule.mainClock.advanceTimeByFrame()
            rule.mainClock.advanceTimeByFrame()
            assertContainerColor(over(standard.pressed.containerColor))
            rule.mainClock.autoAdvance = true
            rule.waitForIdle()
            assertContainerColor(over(standard.focused.containerColor))
        }
        assertEquals(2, clicks)
    }

    @Test
    fun `ICB-8 the hold time is the system's press-hold duration`() {
        val long = 400
        setIconButton(variant = TanreiIconButtonVariant.Filled, system = tanrei.copy(motion = tanrei.motion.copy(duration = tanrei.motion.duration.copy(pressHold = long))))
        rule.mainClock.autoAdvance = false
        button().performTouchInput { down(center); up() }
        rule.mainClock.advanceTimeBy(long - 100L)
        assertContainer(tokens.variants.filled.pressed.containerColor)
        rule.mainClock.advanceTimeBy(100L + tokens.motionStateDuration * 2L)
        assertContainer(tokens.variants.filled.enabled.containerColor)
    }

    // ── ICB-9: pressed-feedback chooses how the press is answered ────────────

    private fun TanreiSystem.answering(feedback: TanreiPressedFeedback) = copy(behavior = behavior.copy(pressedFeedback = feedback))

    @Test
    fun `ICB-9 overlay is the default - the pressed tokens apply to the whole container at once`() {
        assertEquals(TanreiPressedFeedback.Overlay, tanrei.behavior.pressedFeedback)
        setIconButton(variant = TanreiIconButtonVariant.Filled)
        rule.mainClock.autoAdvance = false
        button().performTouchInput { down(START_PROBE.toOffset()) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        val pressed = tokens.variants.filled.pressed.containerColor.resolve(colors)
        assertPixel("at the point of contact", containerProbe(fromEnd = false), pressed)
        assertPixel("at the far side, at once", containerProbe(fromEnd = true), pressed)
    }

    @Test
    fun `ICB-9 ripple grows the pressed container color from the point of contact over feedback-duration, then fades over state-duration`() {
        setIconButton(variant = TanreiIconButtonVariant.Filled, system = tanrei.answering(TanreiPressedFeedback.Ripple))
        val resting = tokens.variants.filled.enabled.containerColor.resolve(colors)
        val pressed = tokens.variants.filled.pressed.containerColor.resolve(colors)
        rule.mainClock.autoAdvance = false
        button().performTouchInput { down(START_PROBE.toOffset()) }
        rule.mainClock.advanceTimeBy(50)
        assertPixel("the layer has reached the point of contact", containerProbe(fromEnd = false), pressed)
        assertPixel("but not the far side", containerProbe(fromEnd = true), resting)
        rule.mainClock.advanceTimeBy(tokens.motionFeedbackDuration.toLong())
        assertPixel("the far side once grown", containerProbe(fromEnd = true), pressed)
        button().performTouchInput { up() }
        rule.mainClock.advanceTimeBy(tanrei.motion.duration.pressHold + tokens.motionStateDuration * 2L)
        assertPixel("faded at the point of contact", containerProbe(fromEnd = false), resting)
        assertPixel("faded at the far side", containerProbe(fromEnd = true), resting)
    }

    @Test
    fun `ICB-9 the ripple is the pressed container color of the LOOK - a toggle that is on ripples in its selected pressed color`() {
        val system = tanrei.answering(TanreiPressedFeedback.Ripple)
            .withFilled(TanreiInteractionState.Pressed) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error), selectedContainerColor = TanreiPaint.Role(TanreiColorRole.Success)) }
        setIconButton(variant = TanreiIconButtonVariant.Filled, toggle = true, initiallyChecked = true, system = system)
        rule.mainClock.autoAdvance = false
        button().performTouchInput { down(center) }
        rule.mainClock.advanceTimeBy(tokens.motionFeedbackDuration * 2L)
        assertContainerColor(colors[TanreiColorRole.Success])
        button().performTouchInput { up() }
    }

    @Test
    fun `ICB-9 the ripple's growth is the icon button's feedback-duration token`() {
        val slow = tanrei.motion.duration.long1 * 4
        val system = tanrei.answering(TanreiPressedFeedback.Ripple).let { it.copy(iconButton = it.iconButton.copy(motionFeedbackDuration = slow, motionStateEasing = tanrei.motion.easing.linear)) }
        setIconButton(variant = TanreiIconButtonVariant.Filled, system = system)
        val resting = tokens.variants.filled.enabled.containerColor.resolve(colors)
        val pressed = tokens.variants.filled.pressed.containerColor.resolve(colors)
        rule.mainClock.autoAdvance = false
        button().performTouchInput { down(START_PROBE.toOffset()) }
        rule.mainClock.advanceTimeBy(tanrei.motion.duration.long1.toLong())
        assertPixel("not at the far side after long1", containerProbe(fromEnd = true), resting)
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertPixel("at the far side after feedback-duration", containerProbe(fromEnd = true), pressed)
        button().performTouchInput { up() }
    }

    @Test
    @KeyboardNavigation
    fun `ICB-9 a keyboard ripple grows from the center`() {
        val acme = TanreiSystem.Acme.answering(TanreiPressedFeedback.Ripple)
        val filled = acme.iconButton.variants.filled
        val focused = filled.focused.containerColor.resolve(acme.colors.light)
        val pressed = filled.pressed.containerColor.resolve(acme.colors.light)
        // No icon: the center of the container is container too.
        setIconButton(variant = TanreiIconButtonVariant.Filled, system = acme, icon = {})
        button().requestFocus().assertIsFocused()
        rule.waitForIdle()
        rule.mainClock.autoAdvance = false
        button().performKeyInput { keyDown(Key.Enter) }
        var frames = 0
        while (!isClose(iconProbe(), pressed) && frames++ < MAX_RIPPLE_FRAMES) rule.mainClock.advanceTimeByFrame()
        assertPixel("the layer reached the center first", iconProbe(), pressed)
        assertPixel("not the start", containerProbe(fromEnd = false), focused)
        assertPixel("not the end", containerProbe(fromEnd = true), focused)
        button().performKeyInput { keyUp(Key.Enter) }
    }

    /**
     * Filled's pressed state differs from hovered in every part: icon (error), outline (warning), opacity and shape;
     * hovered has a container color of its own (success), so "the state under the press" shows.
     */
    private fun TanreiSystem.pressedDiffersEverywhere(): TanreiSystem =
        withFilled(TanreiInteractionState.Hovered) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Success)) }
            .withFilled(TanreiInteractionState.Pressed) { it.copy(iconColor = TanreiPaint.Role(TanreiColorRole.Error), outlineColor = TanreiPaint.Role(TanreiColorRole.Warning)) }
            .let { it.copy(iconButton = it.iconButton.copy(pressed = it.iconButton.pressed.copy(opacity = PRESSED_OPACITY, containerShape = 0.dp))) }

    private fun assertOnlyTheContainerColorStays(feedback: TanreiPressedFeedback) {
        setIconButton(variant = TanreiIconButtonVariant.Filled, system = tanrei.answering(feedback).pressedDiffersEverywhere())
        fun dimmed(color: Color) = color.copy(alpha = PRESSED_OPACITY).compositeOver(surface)
        val hovered = colors[TanreiColorRole.Success]
        button().performMouseInput { moveTo(END_PROBE.toOffset()) }
        rule.waitForIdle()
        assertContainerColor(hovered)
        assertPixel("the resting shape cuts the corner", cornerProbe(), surface)
        rule.mainClock.autoAdvance = false
        button().performMouseInput { press() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("the HOVERED container color stays under the press, at the pressed opacity", containerProbe(fromEnd = false), dimmed(hovered))
        assertPixel("the pressed icon color", iconProbe(), dimmed(colors[TanreiColorRole.Error]))
        assertPixel("the pressed outline", topEdgeProbe(), dimmed(colors[TanreiColorRole.Warning]))
        assertTrue("the pressed shape fills the corner", !isClose(cornerProbe(), surface))
        button().performMouseInput { release() }
    }

    @Test
    fun `ICB-9 under ripple only the container color stays with the state under the press - icon, outline, opacity and shape are the pressed tokens`() =
        assertOnlyTheContainerColorStays(TanreiPressedFeedback.Ripple)

    @Test
    fun `ICB-9 under dim only the container color stays with the state under the press - icon, outline, opacity and shape are the pressed tokens`() =
        assertOnlyTheContainerColorStays(TanreiPressedFeedback.Dim)

    @Test
    fun `ICB-9 dim applies the pressed opacity to the whole control and draws no state layer`() {
        val opacity = 0.5f
        val system = tanrei.answering(TanreiPressedFeedback.Dim).let { it.copy(iconButton = it.iconButton.copy(pressed = it.iconButton.pressed.copy(opacity = opacity))) }
        setIconButton(variant = TanreiIconButtonVariant.Filled, system = system)
        val resting = tokens.variants.filled.enabled.containerColor.resolve(colors)
        assertNotEquals("the default system HAS a pressed state layer", resting, tokens.variants.filled.pressed.containerColor.resolve(colors))
        button().performTouchInput { down(center) }
        rule.waitForIdle()
        assertContainerColor(resting.copy(alpha = opacity).compositeOver(surface))
    }

    @Test
    fun `ICB-9 under none every part stays with the state under the press, and it still clicks`() {
        setIconButton(variant = TanreiIconButtonVariant.Filled, system = tanrei.answering(TanreiPressedFeedback.None).pressedDiffersEverywhere())
        button().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val hovered = button().captureToImage().toPixelMap()
        button().performMouseInput { press() }
        rule.waitForIdle()
        val pressed = button().captureToImage().toPixelMap()
        val differing = (0 until hovered.height).sumOf { y -> (0 until hovered.width).count { x -> !isClose(hovered[x, y], pressed[x, y]) } }
        assertEquals("not one pixel answers the press", 0, differing)
        button().performMouseInput { release() }
        rule.waitForIdle()
        assertEquals(1, clicks)
    }

    // ── ICB-10: corner smoothing and focus-style ─────────────────────────────

    private fun roundedBy(radius: Dp, smoothing: Float) = tanrei.copy(shape = tanrei.shape.copy(cornerSmoothing = smoothing), iconButton = tokens.copy(containerShape = radius))

    @Test
    fun `ICB-10 at 0 the container corner is a quarter circle`() = assertCornerDrawnAs(12.dp, 0f)

    @Test
    fun `ICB-10 at 0_6 the container corner is Figma's smoothed construction - what cupertino draws`() {
        assertEquals(0.6f, TanreiSystem.Cupertino.shape.cornerSmoothing)
        // The largest radius whose corner has room for the whole amount (Figma budgets it per corner).
        assertCornerDrawnAs(tokens.sizes.medium.containerSize / 2 / 1.6f, 0.6f)
    }

    /** The container's top-left corner box (no icon) has exactly the coverage of `tanreiContainerShape(radius, smoothing)`. */
    private fun assertCornerDrawnAs(radius: Dp, smoothing: Float) {
        val system = roundedBy(radius, smoothing)
        setIconButton(variant = TanreiIconButtonVariant.Filled, system = system, icon = {})
        val container = tokens.variants.filled.enabled.containerColor.resolve(colors)
        val map = button().captureToImage().toPixelMap()
        with(rule.density) {
            val inset = ((measure.targetTouch - tokens.sizes.medium.containerSize) / 2).roundToPx()
            val side = tokens.sizes.medium.containerSize.roundToPx()
            val outline = tanreiContainerShape(radius, smoothing).createOutline(Size(side.toFloat(), side.toFloat()), LayoutDirection.Ltr, this)
            val expected = ImageBitmap(side, side, ImageBitmapConfig.Argb8888)
            Canvas(expected).drawOutline(outline, Paint().apply { color = Color.Black })
            val expectedMap = expected.toPixelMap()
            val box = minOf((radius * 2 + CORNER_MARGIN).roundToPx(), side)
            var worst = 0f
            var total = 0f
            for (y in 0 until box) for (x in 0 until box) {
                val delta = abs(tintOf(map[inset + x, inset + y], surface, container) - expectedMap[x, y].alpha)
                worst = maxOf(worst, delta)
                total += delta
            }
            assertTrue("smoothing $smoothing: the worst pixel is $worst off the outline's own coverage", worst <= COVERAGE_TOLERANCE)
            assertTrue("smoothing $smoothing: $total px² off the outline in total", total <= COVERAGE_TOTAL_TOLERANCE)
        }
    }

    @Test
    @KeyboardNavigation
    fun `ICB-10 glow draws the focus colors as a soft halo under acme, where ring draws a hard line`() {
        val acme = TanreiSystem.Acme
        assertEquals(TanreiFocusStyle.Glow, acme.behavior.focusStyle)
        val acmeSurface = acme.colors.light[TanreiColorRole.Surface]
        val ring = acme.colors.light[TanreiColorRole.FocusRing]
        val m = acme.measure
        setIconButton(system = acme)
        button().requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertPixel("the offset stays clear", focusProbe(m.focusOffset / 2), acmeSurface)
        val inBand = focusProbe(m.focusOffset + m.focusInnerWidth + m.focusOuterWidth / 4)
        assertTrue("the halo carries the focus color: $inBand", tintOf(inBand, acmeSurface, ring) > 0.7f)
        val beyond = tintOf(focusProbe(m.focusOffset + m.focusInnerWidth + m.focusOuterWidth * 1.5f), acmeSurface, ring)
        assertTrue("soft beyond the hard edge: $beyond", beyond > 0.05f && beyond < 0.4f)
    }

    // ── ICB-11: a toggle ─────────────────────────────────────────────────────

    @Test
    fun `ICB-11 a toggle emits click and then change with the opposite of checked, in that order, and exposes its on or off state`() {
        setIconButton(toggle = true)
        button()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.ToggleableState, ToggleableState.Off))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf(LABEL)))
        button().performClick()
        rule.waitForIdle()
        assertEquals("click first, then change (72092ba)", listOf("click", "change:true"), events)
        button().assert(SemanticsMatcher.expectValue(SemanticsProperties.ToggleableState, ToggleableState.On))
        button().performClick()
        rule.waitForIdle()
        assertEquals(listOf("click", "change:true", "click", "change:false"), events)
        button().assert(SemanticsMatcher.expectValue(SemanticsProperties.ToggleableState, ToggleableState.Off))
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    @Test
    @KeyboardNavigation
    fun `ICB-11 Enter, Space and an assistive technology click toggle it too`() {
        setIconButton(toggle = true)
        button().requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        button().performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        button().performSemanticsAction(SemanticsActions.OnClick)
        rule.waitForIdle()
        assertEquals(listOf("click", "change:true", "click", "change:false", "click", "change:true"), events)
    }

    @Test
    fun `ICB-11 checked without onCheckedChange is no toggle - no toggle state, and activation emits click only`() {
        checked = true
        rule.setContent {
            TanreiTheme(system = tanrei, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                TanreiIconButton(onClick = { events += "click" }, contentDescription = LABEL, modifier = Modifier.testTag(TAG), checked = checked) { SolidIcon() }
            }
        }
        button().assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.ToggleableState))
        button().performClick()
        rule.waitForIdle()
        assertEquals(listOf("click"), events)
    }

    // ── ICB-12: the look — the variant's own parts, or a toggle's unselected / selected parts ──

    /** Filled's three looks with three distinct containers and icons (the default gives plain and selected the same). */
    private fun threeLooks() = tanrei.withFilled(TanreiInteractionState.Enabled) {
        it.copy(
            containerColor = TanreiPaint.Role(TanreiColorRole.Error),
            iconColor = TanreiPaint.Role(TanreiColorRole.OnError),
            unselectedContainerColor = TanreiPaint.Role(TanreiColorRole.Warning),
            unselectedIconColor = TanreiPaint.Role(TanreiColorRole.OnWarning),
            selectedContainerColor = TanreiPaint.Role(TanreiColorRole.Success),
            selectedIconColor = TanreiPaint.Role(TanreiColorRole.OnSuccess),
        )
    }

    @Test
    fun `ICB-12 a plain icon button draws the variant's own parts, whatever checked says`() {
        checked = true
        rule.setContent {
            TanreiTheme(system = threeLooks(), theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                TanreiIconButton(onClick = {}, contentDescription = LABEL, modifier = Modifier.testTag(TAG), variant = TanreiIconButtonVariant.Filled, checked = checked) { SolidIcon() }
            }
        }
        assertContainerColor(colors[TanreiColorRole.Error])
        assertPixel("icon", iconProbe(), colors[TanreiColorRole.OnError])
    }

    @Test
    fun `ICB-12 a toggle draws the unselected parts when off and the selected parts when on, following the change`() {
        setIconButton(variant = TanreiIconButtonVariant.Filled, toggle = true, system = threeLooks())
        assertContainerColor(colors[TanreiColorRole.Warning])
        assertPixel("unselected icon", iconProbe(), colors[TanreiColorRole.OnWarning])
        button().performClick()
        rule.waitForIdle()
        assertContainerColor(colors[TanreiColorRole.Success])
        assertPixel("selected icon", iconProbe(), colors[TanreiColorRole.OnSuccess])
    }

    @Test
    fun `ICB-12 the default system - a filled toggle that is off is quieter than one that is on, and outlined on drops its outline`() {
        setIconButton(variant = TanreiIconButtonVariant.Filled, toggle = true)
        assertContainerColor(colors[TanreiColorRole.SurfaceContainerHighest])
        assertPixel("off icon", iconProbe(), colors[TanreiColorRole.OnSurfaceVariant])
        checked = true
        rule.waitForIdle()
        assertContainerColor(colors[TanreiColorRole.Primary])
        assertPixel("on icon", iconProbe(), colors[TanreiColorRole.OnPrimary])
    }

    @Test
    fun `ICB-12 the outlined toggle draws its outline off and its inverse fill without an outline on`() {
        setIconButton(variant = TanreiIconButtonVariant.Outlined, toggle = true)
        assertPixel("off: the outline", topEdgeProbe(), colors[TanreiColorRole.Outline])
        checked = true
        rule.waitForIdle()
        assertPixel("on: the inverse surface to the edge", topEdgeProbe(), colors[TanreiColorRole.InverseSurface])
        assertPixel("on: the inverse icon", iconProbe(), colors[TanreiColorRole.InverseOnSurface])
    }

    @Test
    fun `ICB-12 a hovered toggle that is on draws the hovered selected parts`() {
        val system = tanrei.withFilled(TanreiInteractionState.Hovered) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error), selectedContainerColor = TanreiPaint.Role(TanreiColorRole.Success)) }
        setIconButton(variant = TanreiIconButtonVariant.Filled, toggle = true, initiallyChecked = true, system = system)
        button().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainerColor(colors[TanreiColorRole.Success])
    }

    // ── ICB-13: the icon — size, selection, family, fill, weight, optical size ──

    private var seenGlyph: TanreiIconGlyph? = null
    private var seenStyle: TextStyle? = null
    private var seenColor: Color = Color.Unspecified
    private var seenBox: IntSize = IntSize.Zero

    /** Records what the icon slot is given, and fills it like [SolidIcon]. */
    private val probeIcon: @Composable () -> Unit = {
        seenGlyph = LocalTanreiIconGlyph.current
        seenStyle = LocalTanreiTextStyle.current
        seenColor = LocalTanreiContentColor.current
        Box(Modifier.fillMaxSize().onSizeChanged { seenBox = it }.background(LocalTanreiContentColor.current))
    }

    @Test
    fun `ICB-13 the icon box is the icon size of each size, and the slot gets the glyph of THAT size through the icon helper`() {
        for (size in listOf(TanreiIconButtonSize.Small, TanreiIconButtonSize.Medium, TanreiIconButtonSize.Large)) {
            val iconSize = tokens.sizes[size].iconSize
            setIconButton(size = size, icon = probeIcon)
            rule.waitForIdle()
            assertEquals("$size: the box", with(rule.density) { IntSize(iconSize.roundToPx(), iconSize.roundToPx()) }, seenBox)
            assertEquals("$size: the glyph", tanrei.icon.glyph(iconSize, selected = false), seenGlyph)
            assertEquals("$size: the icon color", colors[TanreiColorRole.OnSurfaceVariant], seenColor)
        }
        // The optical size is clamped to sys.icon.optical-size: small's 16 is drawn at the font's 20.
        assertEquals(16.dp, tokens.sizes.small.iconSize)
        setIconButton(size = TanreiIconButtonSize.Small, icon = probeIcon)
        rule.waitForIdle()
        assertEquals(tanrei.icon.opticalSizeMin, seenGlyph!!.opticalSize)
    }

    @Test
    fun `ICB-13 an icon larger than the font's optical range is drawn at its maximum`() {
        val system = tanrei.copy(iconButton = tokens.copy(sizes = tokens.sizes.copy(large = tokens.sizes.large.copy(containerSize = 72.dp, iconSize = 64.dp))))
        setIconButton(size = TanreiIconButtonSize.Large, system = system, icon = probeIcon)
        rule.waitForIdle()
        assertEquals(tanrei.icon.opticalSizeMax, seenGlyph!!.opticalSize)
    }

    @Test
    fun `ICB-13 only a toggle that is on is selected - plain and off draw the unselected glyph, on the selected one`() {
        val size = tokens.sizes.medium.iconSize
        setIconButton(icon = probeIcon)
        rule.waitForIdle()
        assertEquals("plain", tanrei.icon.glyph(size, selected = false), seenGlyph)
        setIconButton(toggle = true, icon = probeIcon)
        rule.waitForIdle()
        assertEquals("off", tanrei.icon.glyph(size, selected = false), seenGlyph)
        assertEquals(0f, seenGlyph!!.fill)
        checked = true
        rule.waitForIdle()
        assertEquals("on", tanrei.icon.glyph(size, selected = true), seenGlyph)
        assertEquals(1f, seenGlyph!!.fill)
        assertEquals(tanrei.icon.weight, seenGlyph!!.weight)
    }

    @Test
    fun `ICB-13 a static icon set - acme - switches the FAMILY with the selection`() {
        val acme = TanreiSystem.Acme
        setIconButton(toggle = true, system = acme, icon = probeIcon)
        rule.waitForIdle()
        assertEquals(acme.icon.unselected, seenGlyph!!.family)
        checked = true
        rule.waitForIdle()
        assertEquals(acme.icon.selected, seenGlyph!!.family)
        assertNotEquals(acme.icon.unselected, acme.icon.selected)
    }

    @Test
    fun `ICB-13 the slot's text style draws a ligature in the app's icon font for THIS glyph, at the box's size`() {
        val asked = mutableListOf<TanreiIconGlyph>()
        val iconFont = FontFamily.Cursive // a stand-in the platform has: what matters is that it is the one handed back
        val fontFamilies = object : TanreiFontFamilies {
            override fun resolve(font: TanreiFontStack): FontFamily? = null

            override fun resolveIcon(glyph: TanreiIconGlyph): FontFamily { asked += glyph; return iconFont }
        }
        setIconButton(toggle = true, initiallyChecked = true, fontFamilies = fontFamilies, icon = probeIcon)
        rule.waitForIdle()
        val glyph = tanrei.icon.glyph(tokens.sizes.medium.iconSize, selected = true)
        assertTrue("asked for the selected glyph: $asked", glyph in asked)
        assertEquals(iconFont, seenStyle!!.fontFamily)
        assertEquals(glyph.weight, seenStyle!!.fontWeight!!.weight)
        with(rule.density) { assertEquals(tokens.sizes.medium.iconSize.toPx(), seenStyle!!.fontSize.toPx(), 0.01f) }
    }

    @Test
    fun `ICB-13 at 200 percent text size the button, its icon box and its glyph keep their size, and it keeps its name`() {
        setIconButton(density = { Density(it.density, fontScale = 2f) }, icon = probeIcon)
        rule.waitForIdle()
        button().assertWidthIsEqualTo(measure.targetTouch).assertHeightIsEqualTo(measure.targetTouch)
        val iconPx = with(rule.density) { tokens.sizes.medium.iconSize.roundToPx() }
        assertEquals(IntSize(iconPx, iconPx), seenBox)
        // sp at font scale 2: the glyph's font size in pixels is still the box.
        val style = seenStyle!!
        val px = with(Density(rule.density.density, fontScale = 2f)) { style.fontSize.toPx() }
        assertEquals(iconPx.toFloat(), px, 0.5f)
        button().assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf(LABEL)))
    }

    // ── ICB-14: an empty label ───────────────────────────────────────────────

    @Test
    fun `ICB-14 without a contentDescription it still renders and works, and a debuggable app reports it once`() = collectingReports { reports ->
        setDebuggable(true)
        setIconButton(label = "")
        button().assertWidthIsEqualTo(measure.targetTouch).assertHeightIsEqualTo(measure.targetTouch)
        assertPixel("the icon is drawn", iconProbe(), colors[TanreiColorRole.OnSurfaceVariant])
        button().assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.ContentDescription))
        button().performClick()
        rule.waitForIdle()
        assertEquals(1, clicks)
        assertEquals(reports.toString(), 1, reports.size)
        assertTrue(reports.toString(), "TanreiIconButton" in reports.single() && "contentDescription" in reports.single())
    }

    @Test
    fun `ICB-14 a release-like app reports nothing, and a named icon button reports nothing anywhere`() = collectingReports { reports ->
        setDebuggable(false)
        setIconButton(label = "")
        rule.waitForIdle()
        assertEquals(emptyList<String>(), reports)
        setDebuggable(true)
        setIconButton()
        rule.waitForIdle()
        assertEquals(emptyList<String>(), reports)
    }

    // ── helpers ──────────────────────────────────────────────────────────────

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

    private fun TanreiSystem.withVariant(
        variant: TanreiIconButtonVariant,
        state: TanreiInteractionState,
        change: (TanreiIconButtonVariantStateTokens) -> TanreiIconButtonVariantStateTokens,
    ): TanreiSystem {
        val tokens = iconButton.variants[variant]
        val changed = when (state) {
            TanreiInteractionState.Enabled -> tokens.copy(enabled = change(tokens.enabled))
            TanreiInteractionState.Hovered -> tokens.copy(hovered = change(tokens.hovered))
            TanreiInteractionState.Focused -> tokens.copy(focused = change(tokens.focused))
            TanreiInteractionState.Pressed -> tokens.copy(pressed = change(tokens.pressed))
            TanreiInteractionState.Disabled -> tokens.copy(disabled = change(tokens.disabled))
        }
        val variants = when (variant) {
            TanreiIconButtonVariant.Filled -> iconButton.variants.copy(filled = changed)
            TanreiIconButtonVariant.Standard -> iconButton.variants.copy(standard = changed)
            else -> error("not used by these tests: $variant")
        }
        return copy(iconButton = iconButton.copy(variants = variants))
    }

    private fun TanreiSystem.withFilled(state: TanreiInteractionState, change: (TanreiIconButtonVariantStateTokens) -> TanreiIconButtonVariantStateTokens) =
        withVariant(TanreiIconButtonVariant.Filled, state, change)

    private fun TanreiSystem.withStandard(state: TanreiInteractionState, change: (TanreiIconButtonVariantStateTokens) -> TanreiIconButtonVariantStateTokens) =
        withVariant(TanreiIconButtonVariant.Standard, state, change)

    /** A paint of the default system over the surface: what a (possibly translucent) container looks like. */
    private fun assertContainer(paint: TanreiPaint) = assertContainerColor(paint.resolve(colors).compositeOver(surface))

    private fun assertContainerColor(expected: Color) = assertPixel("container", containerProbe(fromEnd = false), expected)

    /** Inside the medium container, left (or right) of the icon, at the vertical center. */
    private fun containerProbe(fromEnd: Boolean): Color = button().captureToImage().toPixelMap().at(if (fromEnd) END_PROBE else START_PROBE)

    private fun iconProbe(): Color = button().captureToImage().toPixelMap().at(measure.targetTouch / 2, measure.targetTouch / 2)

    /** The medium container's first row, beside the icon. */
    private fun topEdgeProbe(): Color = button().captureToImage().toPixelMap().at(measure.targetTouch / 2, mediumInset())

    private fun cornerProbe(): Color = button().captureToImage().toPixelMap().at(mediumInset() + CORNER_PROBE, mediumInset() + CORNER_PROBE)

    /** The pixel [outside] the medium container's top edge, at its horizontal center. */
    private fun focusProbe(outside: Dp): Color = button().captureToImage().toPixelMap().at(measure.targetTouch / 2, mediumInset() - outside)

    private fun mediumInset(): Dp = (measure.targetTouch - tokens.sizes.medium.containerSize) / 2

    private fun outerStrokeCenter(m: TanreiMeasure): Dp = m.focusOffset + m.focusInnerWidth + m.focusOuterWidth / 2

    private fun Pair<Dp, Dp>.toOffset(): Offset = with(rule.density) { Offset(first.toPx(), second.toPx()) }

    private fun PixelMap.at(point: Pair<Dp, Dp>): Color = at(point.first, point.second)

    private fun PixelMap.at(x: Dp, y: Dp): Color = with(rule.density) { this@at[x.roundToPx(), y.roundToPx()] }

    private fun tintOf(pixel: Color, base: Color, full: Color): Float {
        val channels = listOf(Triple(pixel.red, base.red, full.red), Triple(pixel.green, base.green, full.green), Triple(pixel.blue, base.blue, full.blue))
        val (p, b, f) = channels.maxBy { abs(it.third - it.second) }
        return ((p - b) / (f - b)).coerceIn(0f, 1f)
    }

    private fun isClose(actual: Color, expected: Color): Boolean =
        maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue)) <= PIXEL_TOLERANCE

    private fun assertPixel(what: String, actual: Color, expected: Color) =
        assertTrue("$what: expected $expected but was $actual", isClose(actual, expected))

    private companion object {
        const val TAG = "icon-button"
        const val UNKNOWN_TAG = "icon-button-unknown"
        const val LABEL = "Favorite"
        const val GLYPH_NAME = "favorite"
        const val PIXEL_TOLERANCE = 2f / 255f
        const val MAX_RIPPLE_FRAMES = 60
        const val PRESSED_OPACITY = 0.5f
        /** Inside the medium container (6–42dp of the 48dp target), clear of the 20dp icon (14–34dp). */
        val START_PROBE = 9.dp to 24.dp
        val END_PROBE = 39.dp to 24.dp
        val CORNER_PROBE = 1.dp
        val CORNER_MARGIN = 2.dp
        const val COVERAGE_TOLERANCE = 0.05f
        const val COVERAGE_TOTAL_TOLERANCE = 1f
    }
}

/** A stand-in icon: fills the icon slot with the icon color it is given. */
@Composable
private fun SolidIcon() {
    Box(Modifier.fillMaxSize().background(LocalTanreiContentColor.current))
}
