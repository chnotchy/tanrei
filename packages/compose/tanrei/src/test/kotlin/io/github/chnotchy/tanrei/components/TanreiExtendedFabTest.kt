package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshots.Snapshot
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.MotionDurationScale
import androidx.compose.ui.draw.alpha
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
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
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
import androidx.compose.ui.test.getUnclippedBoundsInRoot
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
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.max
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
import io.github.chnotchy.tanrei.theme.TanreiIconGlyph
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.glyph
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.Cupertino
import io.github.chnotchy.tanrei.tokens.M3Like
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiExtendedFabSize
import io.github.chnotchy.tanrei.tokens.TanreiExtendedFabVariant
import io.github.chnotchy.tanrei.tokens.TanreiExtendedFabVariantStateTokens
import io.github.chnotchy.tanrei.tokens.TanreiExtendedFabVariantTokens
import io.github.chnotchy.tanrei.tokens.TanreiExtendedFabVariants
import io.github.chnotchy.tanrei.tokens.TanreiFabSize
import io.github.chnotchy.tanrei.tokens.TanreiFabVariant
import io.github.chnotchy.tanrei.tokens.TanreiFocusStyle
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiMeasure
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiPressedFeedback
import io.github.chnotchy.tanrei.tokens.TanreiShadowLayer
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
 * Behaviour tests for `specs/extended-fab.spec.json`. Each test names the behaviour id (`EFB-n`) it covers. Runs on
 * the JVM (Robolectric, native graphics) — no emulator needed.
 *
 * The extended FAB is drawn on the surface with [STAGE] around it, so its shadow and its focus ring are pixels of the
 * stage. The icon in most tests is [SolidIcon] (the icon box filled with the color the slot is given). Next to the stage
 * a hidden copy of the label is measured in the size's label style ([labelWidth]), so the expected width of the row is
 * computed from the tokens rather than written down.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiExtendedFabTest {
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
    private val tokens = tanrei.extendedFab
    private val measure = tanrei.measure
    private val surface = colors[TanreiColorRole.Surface]

    private var clicks = 0
    private var expanded by mutableStateOf(true)
    private var labelWidthPx = 0
    private var labelHeightPx = 0

    @Before
    fun setUp() {
        // ATF checks: NOT_RUN under Robolectric (see TanreiButtonTest); they run for real in the gallery's
        // instrumented tests. The explicit semantics assertions below guard accessibility here.
        rule.enableAccessibilityChecks()
    }

    /** What [setEfab] renders; changing it recomposes the one scene a test may set. */
    private class Scene(
        val variant: TanreiExtendedFabVariant,
        val size: TanreiExtendedFabSize,
        val enabled: Boolean,
        val system: TanreiSystem,
        val text: String,
        val fontScale: Float,
        val direction: LayoutDirection,
        val width: Dp?,
        val icon: (@Composable () -> Unit)?,
    )

    private var scene by mutableStateOf<Scene?>(null)

    /**
     * One extended FAB on the surface, [STAGE] around it, [expanded] as the test sets it. Called again, it replaces the
     * scene with a fresh composition of the new one (a test may set content only once).
     */
    private fun setEfab(
        variant: TanreiExtendedFabVariant = TanreiExtendedFabVariant.Filled,
        size: TanreiExtendedFabSize = TanreiExtendedFabSize.Medium,
        enabled: Boolean = true,
        system: TanreiSystem = tanrei,
        text: String = LABEL,
        fontScale: Float = 1f,
        direction: LayoutDirection = LayoutDirection.Ltr,
        width: Dp? = null,
        icon: (@Composable () -> Unit)? = { SolidIcon() },
    ) {
        val first = scene == null
        scene = Scene(variant, size, enabled, system, text, fontScale, direction, width, icon)
        if (!first) {
            rule.waitForIdle()
            return
        }
        rule.setContent {
            val current = scene ?: return@setContent
            key(current) {
                val density = LocalDensity.current
                CompositionLocalProvider(LocalDensity provides Density(density.density, current.fontScale), LocalLayoutDirection provides current.direction) {
                    TanreiTheme(system = current.system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                        Column {
                            Box(Modifier.testTag(STAGE_TAG).background(TanreiColorRole.Surface.color).padding(STAGE)) {
                                TanreiExtendedFloatingActionButton(
                                    text = current.text,
                                    onClick = { clicks++ },
                                    modifier = Modifier.testTag(TAG).then(current.width?.let { Modifier.width(it) } ?: Modifier),
                                    variant = current.variant,
                                    size = current.size,
                                    expanded = expanded,
                                    enabled = current.enabled,
                                    icon = current.icon,
                                )
                            }
                            // The label, measured alone in the size's label style (never drawn).
                            val style = TanreiTheme.tokens.extendedFab.sizes[current.size].labelTypescale.toTextStyle()
                            Box(Modifier.size(0.dp).wrapContentSize(unbounded = true).alpha(0f)) {
                                TanreiText(current.text, modifier = Modifier.onSizeChanged { labelWidthPx = it.width; labelHeightPx = it.height }, style = style)
                            }
                        }
                    }
                }
            }
        }
    }

    private fun efab() = rule.onNodeWithTag(TAG)

    private fun widthOf(): Dp = efab().getUnclippedBoundsInRoot().let { it.right - it.left }

    private fun labelWidth(): Dp = with(rule.density) { labelWidthPx.toDp() }

    // ── Semantics ────────────────────────────────────────────────────────────

    @Test
    fun `EFB-1 the extended FAB is one button named by its label, with a click action, and passes accessibility checks`() {
        setEfab()
        efab()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf(LABEL)))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Text))
            .assertHasClickAction()
            .assertIsEnabled()
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    // ── EFB-1: activation emits click exactly once ───────────────────────────

    @Test
    fun `EFB-1 a tap emits click exactly once`() {
        setEfab()
        efab().performClick()
        rule.waitForIdle()
        assertEquals(1, clicks)
    }

    @Test
    @KeyboardNavigation
    fun `EFB-1 Enter and Space each emit click exactly once`() {
        setEfab()
        efab().requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals(1, clicks)
        efab().performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        assertEquals(2, clicks)
    }

    @Test
    fun `EFB-1 an assistive technology click emits click exactly once`() {
        setEfab()
        efab().performSemanticsAction(SemanticsActions.OnClick)
        rule.waitForIdle()
        assertEquals(1, clicks)
    }

    // ── EFB-2: disabled ──────────────────────────────────────────────────────

    @Test
    fun `EFB-2 a disabled extended FAB emits no click`() {
        setEfab(enabled = false)
        efab().performTouchInput { down(center); up() }
        rule.waitForIdle()
        assertEquals(0, clicks)
    }

    @Test
    @KeyboardNavigation
    fun `EFB-2 a disabled extended FAB is not focusable and exposes the disabled state`() {
        setEfab(enabled = false)
        efab()
            .assertIsNotEnabled()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Focused))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsActions.RequestFocus))
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    // ── EFB-3: the highest-precedence active state is drawn from THAT state's tokens ──

    @Test
    fun `EFB-3 pressed draws the pressed container token, and release returns to the resting token`() {
        setEfab()
        efab().performTouchInput { down(center) }
        rule.waitForIdle()
        assertContainer(tokens.variants.filled.pressed.containerColor)
        efab().performTouchInput { up() }
        rule.waitForIdle()
        assertContainer(tokens.variants.filled.enabled.containerColor)
    }

    @Test
    fun `EFB-3 hovered draws the hovered container token`() {
        setEfab()
        efab().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainer(tokens.variants.filled.hovered.containerColor)
    }

    @Test
    @KeyboardNavigation
    fun `EFB-3 keyboard focus draws the focused container token`() {
        setEfab()
        efab().requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertContainer(tokens.variants.filled.focused.containerColor)
    }

    @Test
    fun `EFB-3 EFB-4 a tap does not select the focused state - once the press is over the resting tokens return, and no ring shows`() {
        setEfab()
        efab().performTouchInput { down(center); up() }
        rule.waitForIdle()
        efab().assert(SemanticsMatcher.expectValue(SemanticsProperties.Focused, false))
        assertContainer(tokens.variants.filled.enabled.containerColor)
        assertPixel("no ring", focusProbe(outerStrokeCenter(measure)), surface)
    }

    @Test
    fun `EFB-3 a system that gives pressed another label paint draws the label and the icon in it`() {
        setEfab(system = tanrei.withFilled(TanreiInteractionState.Pressed) { it.copy(labelColor = TanreiPaint.Role(TanreiColorRole.Error)) })
        assertPixel("resting icon", iconProbe(), colors[TanreiColorRole.OnPrimary])
        efab().performTouchInput { down(center) }
        rule.waitForIdle()
        assertPixel("pressed icon", iconProbe(), colors[TanreiColorRole.Error])
        assertTrue("the pressed label", labelShows(colors[TanreiColorRole.Error]))
    }

    @Test
    fun `EFB-3 the pressed opacity token dims the whole extended FAB, icon included`() {
        val opacity = 0.4f
        setEfab(system = tanrei.withoutShadows().let { it.copy(extendedFab = it.extendedFab.copy(pressed = it.extendedFab.pressed.copy(opacity = opacity))) })
        efab().performTouchInput { down(center) }
        rule.waitForIdle()
        val pressed = tokens.variants.filled.pressed
        assertContainerColor(pressed.containerColor.resolve(colors).copy(alpha = opacity).compositeOver(surface))
        assertPixel("icon", iconProbe(), pressed.labelColor.resolve(colors).copy(alpha = opacity).compositeOver(surface))
    }

    @Test
    fun `EFB-3 EFB-16 the elevation comes from the state's tokens - a system that gives hovered another shadow draws it`() {
        setEfab(system = tanrei.withFilled(TanreiInteractionState.Hovered) { it.copy(containerElevation = SOLID_SHADOW) }.withFilled(TanreiInteractionState.Enabled) { it.copy(containerElevation = emptyList()) })
        assertPixel("nothing below at rest", belowProbe(SHADOW_DROP / 2), surface)
        efab().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertPixel("the hovered shadow", belowProbe(SHADOW_DROP / 2), colors[TanreiColorRole.Error])
    }

    @Test
    fun `EFB-3 the default extended FAB rises under hover - level4 against level3 at rest`() {
        val filled = tokens.variants.filled
        assertEquals(tanrei.elevation.level3, filled.enabled.containerElevation)
        assertEquals(tanrei.elevation.level4, filled.hovered.containerElevation)
        assertEquals(tanrei.elevation.level3, filled.focused.containerElevation)
        assertEquals(tanrei.elevation.level3, filled.pressed.containerElevation)
        setEfab()
        val resting = belowProbe(RISE_PROBE)
        efab().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val hovered = belowProbe(RISE_PROBE)
        assertTrue("the hovered shadow reaches further: $resting at rest, $hovered hovered", resting.red - hovered.red >= 1.5f / 255f)
    }

    @Test
    @KeyboardNavigation
    fun `EFB-3 under acme, which values hovered, focused and pressed differently - pressed wins over focused wins over hovered, in pixels`() {
        val acme = TanreiSystem.Acme
        val filled = acme.extendedFab.variants.filled
        val schemeColors = acme.colors.light
        fun over(paint: TanreiPaint) = paint.resolve(schemeColors).compositeOver(schemeColors[TanreiColorRole.Surface])
        val all = listOf(filled.enabled, filled.hovered, filled.focused, filled.pressed).map { over(it.containerColor) }
        assertEquals("acme tells the four states apart", 4, all.toSet().size)

        setEfab(system = acme)
        efab().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainerColor(over(filled.hovered.containerColor))
        efab().requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertContainerColor(over(filled.focused.containerColor))
        efab().performKeyInput { keyDown(Key.Enter) }
        rule.waitForIdle()
        assertContainerColor(over(filled.pressed.containerColor))
        efab().performKeyInput { keyUp(Key.Enter) }
        rule.waitForIdle()
        assertContainerColor(over(filled.focused.containerColor))
        assertEquals(1, clicks)
    }

    // ── EFB-4: focus ring on keyboard focus only, never animated ─────────────

    @Test
    @KeyboardNavigation
    fun `EFB-4 keyboard focus shows the focus ring on the first frame, outside the container`() {
        setEfab()
        assertPixel("no ring before focus", focusProbe(outerStrokeCenter(measure)), surface)
        rule.mainClock.autoAdvance = false
        efab().requestFocus()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("ring at full color on the first frame", focusProbe(outerStrokeCenter(measure)), colors[TanreiColorRole.FocusRing])
        assertPixel("the offset leaves the surface visible", focusProbe(measure.focusOffset / 2), surface)
    }

    @Test
    fun `EFB-4 a pointer press does not show the focus ring`() {
        setEfab()
        efab().performTouchInput { down(center) }
        rule.waitForIdle()
        assertPixel("no ring while pressed", focusProbe(outerStrokeCenter(measure)), surface)
        efab().performTouchInput { up() }
    }

    // ── EFB-5: hit area on both axes, visual size unchanged ──────────────────

    @Test
    fun `EFB-5 the small size reserves the target's height but draws its own, and a tap above the visual container emits click`() {
        val height = tokens.sizes.small.containerHeight
        assertTrue(height < measure.targetTouch)
        setEfab(size = TanreiExtendedFabSize.Small, system = tanrei.withoutShadows())
        efab().assertHeightIsEqualTo(measure.targetTouch)
        val inset = (measure.targetTouch - height) / 2
        val container = tokens.variants.filled.enabled.containerColor.resolve(colors)
        assertPixel("above the container", stage().at(STAGE + 8.dp, STAGE + inset - HALF_DP), surface)
        assertPixel("its first row", stage().at(STAGE + 8.dp, STAGE + inset + HALF_DP), container)
        assertPixel("its last row", stage().at(STAGE + 8.dp, STAGE + inset + height - HALF_DP), container)
        assertPixel("below the container", stage().at(STAGE + 8.dp, STAGE + inset + height + HALF_DP), surface)
        efab().performTouchInput { down(Offset(centerX, 1f)); up() }
        rule.waitForIdle()
        assertEquals(1, clicks)
    }

    @Test
    fun `EFB-5 the target size comes from the system`() {
        val target = 60.dp
        setEfab(system = tanrei.copy(measure = measure.copy(targetTouch = target)))
        efab().assertHeightIsEqualTo(target)
    }

    // ── EFB-6: disabled is drawn from the disabled tokens of the variant ─────

    @Test
    fun `EFB-6 disabled renders the container, the label, the icon and the elevation from the disabled tokens - no shadow`() {
        setEfab(enabled = false)
        val disabled = tokens.variants.filled.disabled
        assertEquals(emptyList<TanreiShadowLayer>(), disabled.containerElevation)
        val container = disabled.containerColor.resolve(colors).compositeOver(surface)
        assertContainerColor(container)
        val label = disabled.labelColor.resolve(colors).compositeOver(container)
        assertPixel("icon", iconProbe(), label)
        assertTrue("label", labelShows(label))
        assertPixel("no shadow below", belowProbe(1.dp), surface)
    }

    @Test
    fun `EFB-6 the disabled opacity token dims the whole control, and disabled ignores hover`() {
        val opacity = 0.5f
        val system = tanrei.withFilled(TanreiInteractionState.Disabled) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
            .let { it.copy(extendedFab = it.extendedFab.copy(disabled = it.extendedFab.disabled.copy(opacity = opacity))) }
        setEfab(enabled = false, system = system)
        val expected = colors[TanreiColorRole.Error].copy(alpha = opacity).compositeOver(surface)
        assertContainerColor(expected)
        efab().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainerColor(expected)
    }

    // ── EFB-7: a value the design system does not have draws as the default ──

    private fun setDefaultAndUnknown() {
        rule.setContent {
            TanreiTheme(system = tanrei, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Column(Modifier.background(TanreiColorRole.Surface.color).padding(STAGE)) {
                    TanreiExtendedFloatingActionButton(text = LABEL, onClick = {}, modifier = Modifier.testTag(TAG), icon = { SolidIcon() })
                    Box(Modifier.size(STAGE))
                    TanreiExtendedFloatingActionButton(
                        text = LABEL,
                        onClick = { clicks++ },
                        modifier = Modifier.testTag(UNKNOWN_TAG),
                        variant = TanreiExtendedFabVariant("ghost"),
                        size = TanreiExtendedFabSize("huge"),
                        icon = { SolidIcon() },
                    )
                }
            }
        }
    }

    @Test
    fun `EFB-7 the lookups are total - an unknown size or variant reads the default value's tokens`() {
        assertTrue(TanreiExtendedFabSize("huge") !in tokens.sizes)
        assertTrue(TanreiExtendedFabVariant("ghost") !in tokens.variants)
        assertEquals(tokens.sizes.medium, tokens.sizes[TanreiExtendedFabSize("huge")])
        assertEquals(tokens.variants.filled, tokens.variants[TanreiExtendedFabVariant("ghost")])
        assertEquals(listOf("small", "medium", "large"), tokens.sizes.keys.map { it.key })
        assertEquals(listOf("filled", "tonal", "surface"), tokens.variants.keys.map { it.key })
    }

    @Test
    fun `EFB-7 in a release-like app an unknown size and variant render exactly like the default, silently`() = collectingReports { reports ->
        setDebuggable(false)
        setDefaultAndUnknown()
        val expected = efab().captureToImage().toPixelMap()
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
    fun `EFB-7 a debuggable app reports the unknown size and variant once, and still renders the default`() = collectingReports { reports ->
        setDebuggable(true)
        setDefaultAndUnknown()
        rule.onNodeWithTag(UNKNOWN_TAG).assertHeightIsEqualTo(tokens.sizes.medium.containerHeight)
        rule.onNodeWithTag(UNKNOWN_TAG).performClick()
        rule.waitForIdle()
        assertEquals(reports.toString(), 2, reports.size)
        assertTrue(reports.toString(), reports.any { "TanreiExtendedFloatingActionButton" in it && "size \"huge\"" in it && "\"tanrei\"" in it })
        assertTrue(reports.toString(), reports.any { "TanreiExtendedFloatingActionButton" in it && "variant \"ghost\"" in it })
    }

    @Test
    fun `EFB-7 a known size and variant report nothing in a debuggable app`() = collectingReports { reports ->
        setDebuggable(true)
        setEfab(variant = TanreiExtendedFabVariant.Surface, size = TanreiExtendedFabSize.Large)
        rule.waitForIdle()
        assertEquals(emptyList<String>(), reports)
    }

    // ── EFB-8: pressed appears without delay and stays for press-hold ────────

    @Test
    fun `EFB-8 a tap that ends at once shows the pressed state on the next frame and keeps it for press-hold`() {
        setEfab()
        val hold = tanrei.motion.duration.pressHold.toLong()
        rule.mainClock.autoAdvance = false
        efab().performTouchInput { down(center); up() }
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
    fun `EFB-8 Enter and Space show the pressed state for press-hold too`() {
        val acme = TanreiSystem.Acme
        val filled = acme.extendedFab.variants.filled
        val acmeColors = acme.colors.light
        fun over(paint: TanreiPaint) = paint.resolve(acmeColors).compositeOver(acmeColors[TanreiColorRole.Surface])
        setEfab(system = acme)
        efab().requestFocus().assertIsFocused()
        rule.waitForIdle()
        for (key in listOf(Key.Enter, Key.Spacebar)) {
            rule.mainClock.autoAdvance = false
            efab().performKeyInput { pressKey(key) }
            rule.mainClock.advanceTimeByFrame()
            rule.mainClock.advanceTimeByFrame()
            assertContainerColor(over(filled.pressed.containerColor))
            rule.mainClock.autoAdvance = true
            rule.waitForIdle()
            assertContainerColor(over(filled.focused.containerColor))
        }
        assertEquals(2, clicks)
    }

    @Test
    fun `EFB-8 the hold time is the system's press-hold duration`() {
        val long = 400
        setEfab(system = tanrei.copy(motion = tanrei.motion.copy(duration = tanrei.motion.duration.copy(pressHold = long))))
        rule.mainClock.autoAdvance = false
        efab().performTouchInput { down(center); up() }
        rule.mainClock.advanceTimeBy(long - 100L)
        assertContainer(tokens.variants.filled.pressed.containerColor)
        rule.mainClock.advanceTimeBy(100L + tokens.motionStateDuration * 2L)
        assertContainer(tokens.variants.filled.enabled.containerColor)
    }

    // ── EFB-9: pressed-feedback chooses how the press is answered ────────────

    private fun TanreiSystem.answering(feedback: TanreiPressedFeedback) = copy(behavior = behavior.copy(pressedFeedback = feedback))

    @Test
    fun `EFB-9 overlay is the default - the pressed tokens apply to the whole container at once`() {
        assertEquals(TanreiPressedFeedback.Overlay, tanrei.behavior.pressedFeedback)
        setEfab()
        rule.mainClock.autoAdvance = false
        efab().performTouchInput { down(START_PROBE.toOffset()) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        val pressed = tokens.variants.filled.pressed.containerColor.resolve(colors)
        assertPixel("at the point of contact", containerProbe(fromEnd = false), pressed)
        assertPixel("at the far side, at once", containerProbe(fromEnd = true), pressed)
    }

    @Test
    fun `EFB-9 ripple - m3-like's answer - grows the pressed container color from the point of contact over feedback-duration, then fades over state-duration`() {
        assertEquals(TanreiPressedFeedback.Ripple, TanreiSystem.M3Like.behavior.pressedFeedback)
        setEfab(system = tanrei.answering(TanreiPressedFeedback.Ripple))
        val resting = tokens.variants.filled.enabled.containerColor.resolve(colors)
        val pressed = tokens.variants.filled.pressed.containerColor.resolve(colors)
        rule.mainClock.autoAdvance = false
        efab().performTouchInput { down(START_PROBE.toOffset()) }
        rule.mainClock.advanceTimeBy(50)
        assertPixel("the layer has reached the point of contact", containerProbe(fromEnd = false), pressed)
        assertPixel("but not the far side", containerProbe(fromEnd = true), resting)
        rule.mainClock.advanceTimeBy(tokens.motionFeedbackDuration.toLong())
        assertPixel("the far side once grown", containerProbe(fromEnd = true), pressed)
        efab().performTouchInput { up() }
        rule.mainClock.advanceTimeBy(tanrei.motion.duration.pressHold + tokens.motionStateDuration * 2L)
        assertPixel("faded at the point of contact", containerProbe(fromEnd = false), resting)
        assertPixel("faded at the far side", containerProbe(fromEnd = true), resting)
    }

    @Test
    fun `EFB-9 the ripple's growth is the extended FAB's feedback-duration token`() {
        val slow = tanrei.motion.duration.long1 * 4
        val system = tanrei.answering(TanreiPressedFeedback.Ripple).let { it.copy(extendedFab = it.extendedFab.copy(motionFeedbackDuration = slow, motionStateEasing = tanrei.motion.easing.linear)) }
        setEfab(system = system)
        val resting = tokens.variants.filled.enabled.containerColor.resolve(colors)
        val pressed = tokens.variants.filled.pressed.containerColor.resolve(colors)
        rule.mainClock.autoAdvance = false
        efab().performTouchInput { down(START_PROBE.toOffset()) }
        rule.mainClock.advanceTimeBy(tanrei.motion.duration.long1.toLong())
        assertPixel("not at the far side after long1", containerProbe(fromEnd = true), resting)
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertPixel("at the far side after feedback-duration", containerProbe(fromEnd = true), pressed)
        efab().performTouchInput { up() }
    }

    @Test
    @KeyboardNavigation
    fun `EFB-9 a keyboard ripple grows from the center`() {
        val acme = TanreiSystem.Acme.answering(TanreiPressedFeedback.Ripple)
        val filled = acme.extendedFab.variants.filled
        val focused = filled.focused.containerColor.resolve(acme.colors.light)
        val pressed = filled.pressed.containerColor.resolve(acme.colors.light)
        setEfab(system = acme)
        efab().requestFocus().assertIsFocused()
        rule.waitForIdle()
        // In the top padding, clear of the label: above the center, and at either end.
        val middle = widthOf() / 2
        fun top(x: Dp) = containerPixel(x, TOP_PROBE_Y)
        rule.mainClock.autoAdvance = false
        efab().performKeyInput { keyDown(Key.Enter) }
        var frames = 0
        while (!isClose(top(middle), pressed) && frames++ < MAX_RIPPLE_FRAMES) rule.mainClock.advanceTimeByFrame()
        assertPixel("the layer reached the center first", top(middle), pressed)
        assertPixel("not the start", top(START_PROBE.first), focused)
        assertPixel("not the end", top(widthOf() - START_PROBE.first), focused)
        efab().performKeyInput { keyUp(Key.Enter) }
    }

    /** Filled's pressed state differs from hovered in the label (error), the opacity and the shadow (a solid one). */
    private fun TanreiSystem.pressedDiffersEverywhere(): TanreiSystem =
        withoutShadows()
            .withFilled(TanreiInteractionState.Hovered) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Success)) }
            .withFilled(TanreiInteractionState.Pressed) { it.copy(labelColor = TanreiPaint.Role(TanreiColorRole.Error), containerElevation = SOLID_SHADOW) }
            .let { it.copy(extendedFab = it.extendedFab.copy(pressed = it.extendedFab.pressed.copy(opacity = PRESSED_OPACITY))) }

    private fun assertOnlyTheContainerColorStays(feedback: TanreiPressedFeedback) {
        setEfab(system = tanrei.answering(feedback).pressedDiffersEverywhere())
        fun dimmed(color: Color) = color.copy(alpha = PRESSED_OPACITY).compositeOver(surface)
        val hovered = colors[TanreiColorRole.Success]
        efab().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainerColor(hovered)
        rule.mainClock.autoAdvance = false
        efab().performMouseInput { press() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("the HOVERED container color stays under the press, at the pressed opacity", containerProbe(fromEnd = false), dimmed(hovered))
        assertPixel("the pressed icon color", iconProbe(), dimmed(colors[TanreiColorRole.Error]))
        assertPixel("the pressed shadow", belowProbe(SHADOW_DROP / 2), dimmed(colors[TanreiColorRole.Error]))
        efab().performMouseInput { release() }
    }

    @Test
    fun `EFB-9 under ripple only the container color stays with the state under the press - label, icon, elevation and opacity are the pressed tokens`() =
        assertOnlyTheContainerColorStays(TanreiPressedFeedback.Ripple)

    @Test
    fun `EFB-9 under dim only the container color stays with the state under the press - label, icon, elevation and opacity are the pressed tokens`() =
        assertOnlyTheContainerColorStays(TanreiPressedFeedback.Dim)

    @Test
    fun `EFB-9 dim - cupertino's answer - applies the pressed opacity to the whole control and draws no state layer`() {
        val cupertino = TanreiSystem.Cupertino
        assertEquals(TanreiPressedFeedback.Dim, cupertino.behavior.pressedFeedback)
        val opacity = cupertino.extendedFab.pressed.opacity
        assertTrue("cupertino dims a press: $opacity", opacity < 1f)
        setEfab(system = cupertino.withoutShadows())
        val cupertinoColors = cupertino.colors.light
        val resting = cupertino.extendedFab.variants.filled.enabled.containerColor.resolve(cupertinoColors)
        efab().performTouchInput { down(center) }
        rule.waitForIdle()
        // The capsule's end is round: probe the top padding at the middle.
        assertPixel("container", containerPixel(widthOf() / 2, TOP_PROBE_Y), resting.copy(alpha = opacity).compositeOver(cupertinoColors[TanreiColorRole.Surface]))
        efab().performTouchInput { up() }
    }

    @Test
    fun `EFB-9 under none every part stays with the state under the press, and it still clicks`() {
        setEfab(system = tanrei.answering(TanreiPressedFeedback.None).pressedDiffersEverywhere())
        efab().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val hovered = stage()
        efab().performMouseInput { press() }
        rule.waitForIdle()
        val pressed = stage()
        val differing = (0 until hovered.height).sumOf { y -> (0 until hovered.width).count { x -> !isClose(hovered[x, y], pressed[x, y]) } }
        assertEquals("not one pixel answers the press", 0, differing)
        efab().performMouseInput { release() }
        rule.waitForIdle()
        assertEquals(1, clicks)
    }

    // ── EFB-10: corner smoothing and focus-style ─────────────────────────────

    private fun roundedBy(radius: Dp, smoothing: Float) = tanrei.withoutShadows().let {
        it.copy(shape = it.shape.copy(cornerSmoothing = smoothing), extendedFab = it.extendedFab.copy(sizes = it.extendedFab.sizes.copy(medium = it.extendedFab.sizes.medium.copy(containerShape = radius))))
    }

    @Test
    fun `EFB-10 at 0 the container corner is a quarter circle`() = assertCornerDrawnAs(12.dp, 0f)

    @Test
    fun `EFB-10 at 0_6 the container corner is Figma's smoothed construction - what cupertino draws`() {
        assertEquals(0.6f, TanreiSystem.Cupertino.shape.cornerSmoothing)
        assertCornerDrawnAs(tokens.sizes.medium.containerHeight / 2 / 1.6f, 0.6f)
    }

    @Test
    fun `EFB-10 cupertino's extended FAB is a capsule at every size`() {
        val cupertino = TanreiSystem.Cupertino.extendedFab.sizes
        for (size in cupertino.keys) assertTrue("$size", cupertino[size].containerShape >= cupertino[size].containerHeight / 2)
    }

    /** The container's top-left corner box (the icon slot empty, the label beyond it) has the outline's own coverage. */
    private fun assertCornerDrawnAs(radius: Dp, smoothing: Float) {
        setEfab(system = roundedBy(radius, smoothing), icon = {})
        val container = tokens.variants.filled.enabled.containerColor.resolve(colors)
        val map = stage()
        with(rule.density) {
            val origin = STAGE.roundToPx()
            val width = widthOf().roundToPx()
            val height = tokens.sizes.medium.containerHeight.roundToPx()
            val outline = tanreiContainerShape(radius, smoothing).createOutline(Size(width.toFloat(), height.toFloat()), LayoutDirection.Ltr, this)
            val expected = ImageBitmap(width, height, ImageBitmapConfig.Argb8888)
            Canvas(expected).drawOutline(outline, Paint().apply { color = Color.Black })
            val expectedMap = expected.toPixelMap()
            val box = minOf((radius * 2 + CORNER_MARGIN).roundToPx(), height)
            var worst = 0f
            var total = 0f
            for (y in 0 until box) for (x in 0 until box) {
                val delta = abs(tintOf(map[origin + x, origin + y], surface, container) - expectedMap[x, y].alpha)
                worst = maxOf(worst, delta)
                total += delta
            }
            assertTrue("smoothing $smoothing: the worst pixel is $worst off the outline's own coverage", worst <= COVERAGE_TOLERANCE)
            assertTrue("smoothing $smoothing: $total px² off the outline in total", total <= COVERAGE_TOTAL_TOLERANCE)
        }
    }

    @Test
    @KeyboardNavigation
    fun `EFB-10 glow draws the focus colors as a soft halo under acme, where ring draws a hard line`() {
        val acme = TanreiSystem.Acme
        assertEquals(TanreiFocusStyle.Glow, acme.behavior.focusStyle)
        val acmeSurface = acme.colors.light[TanreiColorRole.Surface]
        val ring = acme.colors.light[TanreiColorRole.FocusRing]
        val m = acme.measure
        setEfab(system = acme)
        efab().requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertTrue("the offset stays clear", tintOf(focusProbe(m.focusOffset / 2), acmeSurface, ring) < 0.05f)
        val inBand = focusProbe(m.focusOffset + m.focusInnerWidth + m.focusOuterWidth / 4)
        assertTrue("the halo carries the focus color: $inBand", tintOf(inBand, acmeSurface, ring) > 0.7f)
        val beyond = tintOf(focusProbe(m.focusOffset + m.focusInnerWidth + m.focusOuterWidth * 1.5f), acmeSurface, ring)
        assertTrue("soft beyond the hard edge: $beyond", beyond > 0.05f && beyond < 0.4f)
    }

    // ── EFB-11: the row — height, paddings, gap, as wide as its content ──────

    @Test
    fun `EFB-11 each size is at least its height and exactly as wide as start padding, icon, gap, label and end padding`() {
        for (size in listOf(TanreiExtendedFabSize.Small, TanreiExtendedFabSize.Medium, TanreiExtendedFabSize.Large)) {
            val m = tokens.sizes[size]
            setEfab(size = size)
            rule.waitForIdle()
            efab().assertHeightIsEqualTo(max(m.containerHeight, measure.targetTouch))
            val expected = m.containerPaddingInlineStartWithIcon + m.iconSize + m.containerGap + labelWidth() + m.containerPaddingInlineEnd
            assertEquals("$size: the width", expected.value, widthOf().value, 0.6f)
        }
    }

    @Test
    fun `EFB-11 without an icon the start padding is padding-inline-start, and there is no gap`() {
        val m = tokens.sizes.medium
        setEfab(icon = null)
        rule.waitForIdle()
        assertEquals((m.containerPaddingInlineStart + labelWidth() + m.containerPaddingInlineEnd).value, widthOf().value, 0.6f)
    }

    @Test
    fun `EFB-11 the icon starts at padding-inline-start-with-icon, and the paddings and gap come from the system`() {
        val m = tokens.sizes.medium
        setEfab(system = tanrei.withoutShadows())
        val container = tokens.variants.filled.enabled.containerColor.resolve(colors)
        val icon = colors[TanreiColorRole.OnPrimary]
        val middle = m.containerHeight / 2
        assertPixel("before the icon", containerPixel(m.containerPaddingInlineStartWithIcon - HALF_DP, middle), container)
        assertPixel("the icon's first column", containerPixel(m.containerPaddingInlineStartWithIcon + HALF_DP, middle), icon)
        val wider = tanrei.withoutShadows().let {
            it.copy(extendedFab = it.extendedFab.copy(sizes = it.extendedFab.sizes.copy(medium = m.copy(containerGap = m.containerGap + 10.dp, containerPaddingInlineEnd = m.containerPaddingInlineEnd + 6.dp))))
        }
        val before = widthOf()
        setEfab(system = wider)
        assertEquals((before + 16.dp).value, widthOf().value, 0.6f)
    }

    @Test
    fun `EFB-11 at 200 percent text size the container grows past its height by the label and padding-block`() {
        setEfab(fontScale = 2f)
        rule.waitForIdle()
        val height = efab().getUnclippedBoundsInRoot().let { it.bottom - it.top }
        val label = with(rule.density) { labelHeightPx.toDp() }
        assertTrue("taller than the size's height: $height", height > tokens.sizes.medium.containerHeight)
        assertEquals("the label line and padding-block above and below", (label + tokens.sizes.medium.containerPaddingBlock * 2).value, height.value, 0.6f)
        efab().assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf(LABEL)))
    }

    // ── EFB-12: the label and the icon ───────────────────────────────────────

    private var seenGlyph: TanreiIconGlyph? = null
    private var seenStyle: TextStyle? = null
    private var seenColor: Color = Color.Unspecified
    private var seenBox: IntSize = IntSize.Zero

    private val probeIcon: @Composable () -> Unit = {
        seenGlyph = LocalTanreiIconGlyph.current
        seenStyle = LocalTanreiTextStyle.current
        seenColor = LocalTanreiContentColor.current
        Box(Modifier.fillMaxSize().onSizeChanged { seenBox = it }.background(LocalTanreiContentColor.current))
    }

    @Test
    fun `EFB-12 the label is set in the text style of its size - heading-5 at large, label below - in the label color`() {
        assertEquals(tanrei.typescale.label, tokens.sizes.medium.labelTypescale)
        assertEquals(tanrei.typescale.heading5, tokens.sizes.large.labelTypescale)
        // The row's width follows the style of its size (measured alone in that style, above).
        `EFB-11 each size is at least its height and exactly as wide as start padding, icon, gap, label and end padding`()
        setEfab()
        assertTrue("the label is drawn in the label color", labelShows(colors[TanreiColorRole.OnPrimary]))
    }

    @Test
    fun `EFB-12 the icon box is the icon size of each size, in the label color, with the unselected glyph through the icon helper`() {
        for (size in listOf(TanreiExtendedFabSize.Small, TanreiExtendedFabSize.Medium, TanreiExtendedFabSize.Large)) {
            val iconSize = tokens.sizes[size].iconSize
            setEfab(size = size, icon = probeIcon)
            rule.waitForIdle()
            assertEquals("$size: the box", with(rule.density) { IntSize(iconSize.roundToPx(), iconSize.roundToPx()) }, seenBox)
            assertEquals("$size: the glyph", tanrei.icon.glyph(iconSize, selected = false), seenGlyph)
            assertEquals("$size: the label color", tokens.variants.filled.enabled.labelColor.resolve(colors), seenColor)
        }
        with(rule.density) { assertEquals(tokens.sizes.large.iconSize.toPx(), seenStyle!!.fontSize.toPx(), 0.01f) }
    }

    @Test
    fun `EFB-12 the label never truncates - given less width it wraps, and the container grows in height`() {
        setEfab(text = LONG_LABEL, width = NARROW)
        rule.waitForIdle()
        val bounds = efab().getUnclippedBoundsInRoot()
        assertEquals(NARROW.value, (bounds.right - bounds.left).value, 0.5f)
        assertTrue("two lines or more: ${bounds.bottom - bounds.top}", bounds.bottom - bounds.top > tokens.sizes.medium.containerHeight + 4.dp)
    }

    // ── EFB-13 / EFB-14 / EFB-15: collapsing ─────────────────────────────────

    @Test
    fun `EFB-13 collapsed it is a square of the size's height with the icon centered, and keeps its label as its name`() {
        for (size in listOf(TanreiExtendedFabSize.Small, TanreiExtendedFabSize.Medium, TanreiExtendedFabSize.Large)) {
            val m = tokens.sizes[size]
            expanded = false
            setEfab(size = size, system = tanrei.withoutShadows())
            rule.waitForIdle()
            // A square of the size's height, centered in the touch target when it is smaller.
            val node = max(m.containerHeight, measure.targetTouch)
            assertEquals("$size: square", node.value, widthOf().value, 0.6f)
            val inset = (node - m.containerHeight) / 2
            val icon = colors[TanreiColorRole.OnPrimary]
            val container = tokens.variants.filled.enabled.containerColor.resolve(colors)
            val first = inset + (m.containerHeight - m.iconSize) / 2
            val last = inset + m.containerHeight - (m.containerHeight - m.iconSize) / 2
            val middle = STAGE + inset + m.containerHeight / 2
            assertPixel("$size: left of the square", stage().at(STAGE + inset - HALF_DP, middle), surface)
            assertPixel("$size: container before the icon", stage().at(STAGE + first - HALF_DP, middle), container)
            assertPixel("$size: the icon's first column", stage().at(STAGE + first + HALF_DP, middle), icon)
            assertPixel("$size: the icon's last column", stage().at(STAGE + last - HALF_DP, middle), icon)
            assertPixel("$size: container after the icon", stage().at(STAGE + last + HALF_DP, middle), container)
            assertPixel("$size: right of the square", stage().at(STAGE + inset + m.containerHeight + HALF_DP, middle), surface)
            efab()
                .assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf(LABEL)))
                .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
        }
    }

    /** Every shipped system: the default and the three presets. */
    private val shipped = listOf(TanreiSystem.Tanrei, TanreiSystem.M3Like, TanreiSystem.Cupertino)

    @Test
    fun `EFB-13 in every shipped system a collapsed extended FAB has the tokens of the FAB of its size and variant`() {
        for (system in shipped) {
            for (key in listOf("small", "medium", "large")) {
                val efab = system.extendedFab.sizes[TanreiExtendedFabSize(key)]
                val fab = system.fab.sizes[TanreiFabSize(key)]
                assertEquals("${system.id} $key: side", fab.containerSize, efab.containerHeight)
                assertEquals("${system.id} $key: corner", fab.containerShape, efab.containerShape)
                assertEquals("${system.id} $key: icon", fab.iconSize, efab.iconSize)
            }
            for (key in listOf("filled", "tonal", "surface")) {
                val efab = system.extendedFab.variants[TanreiExtendedFabVariant(key)]
                val fab = system.fab.variants[TanreiFabVariant(key)]
                for (state in TanreiInteractionState.entries) {
                    assertEquals("${system.id} $key $state: container", fab[state].containerColor, efab[state].containerColor)
                    assertEquals("${system.id} $key $state: elevation", fab[state].containerElevation, efab[state].containerElevation)
                    assertEquals("${system.id} $key $state: glyph color", fab[state].iconColor, efab[state].labelColor)
                }
            }
        }
    }

    @Test
    fun `EFB-13 in every shipped system and size a collapsed extended FAB draws exactly the FAB, pixel for pixel`() {
        var current by mutableStateOf(shipped.first() to "small")
        rule.setContent {
            val (system, key) = current
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Column(Modifier.background(TanreiColorRole.Surface.color).padding(STAGE)) {
                    TanreiFloatingActionButton(onClick = {}, contentDescription = LABEL, modifier = Modifier.testTag(TAG), size = TanreiFabSize(key)) { SolidIcon() }
                    Box(Modifier.size(STAGE))
                    TanreiExtendedFloatingActionButton(
                        text = LABEL, onClick = {}, modifier = Modifier.testTag(UNKNOWN_TAG), size = TanreiExtendedFabSize(key), expanded = false, icon = { SolidIcon() },
                    )
                }
            }
        }
        for (system in shipped) for (key in listOf("small", "medium", "large")) {
            current = system to key
            rule.waitForIdle()
            val fab = rule.onNodeWithTag(TAG).captureToImage().toPixelMap()
            val collapsed = rule.onNodeWithTag(UNKNOWN_TAG).captureToImage().toPixelMap()
            assertEquals("${system.id} $key: width", fab.width, collapsed.width)
            assertEquals("${system.id} $key: height", fab.height, collapsed.height)
            val differing = (0 until fab.height).sumOf { y -> (0 until fab.width).count { x -> !isClose(fab[x, y], collapsed[x, y]) } }
            assertEquals("${system.id} $key: pixels that differ", 0, differing)
        }
    }

    @Test
    fun `EFB-14 the width moves between the two forms over resize-duration with resize-easing, fading the label, both ways`() {
        val slow = 800
        setEfab(system = tanrei.withoutShadows().let { it.copy(extendedFab = it.extendedFab.copy(motionResizeDuration = slow, motionResizeEasing = tanrei.motion.easing.linear)) })
        rule.waitForIdle()
        val full = widthOf()
        val square = tokens.sizes.medium.containerHeight
        rule.mainClock.autoAdvance = false
        expanded = false
        Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeBy(slow / 2L)
        // Linear easing: half the duration is half the way (give or take the frame or two the change takes to start).
        val half = (full - widthOf()) / (full - square)
        assertTrue("half way, half as narrow: $half of the way", half in 0.4f..0.6f)
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertEquals("collapsed", square.value, widthOf().value, 0.6f)
        expanded = true
        Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeBy(slow / 4L)
        val quarter = (widthOf() - square) / (full - square)
        assertTrue("a quarter of the way back: $quarter of the way", quarter in 0.15f..0.35f)
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertEquals("expanded again", full.value, widthOf().value, 0.6f)
    }

    @Test
    fun `EFB-14 the label fades out as the container narrows`() {
        val slow = 800
        setEfab(system = tanrei.withoutShadows().let { it.copy(extendedFab = it.extendedFab.copy(motionResizeDuration = slow, motionResizeEasing = tanrei.motion.easing.linear)) })
        rule.waitForIdle()
        val label = colors[TanreiColorRole.OnPrimary]
        assertTrue("the label shows at full color at rest", labelShows(label))
        rule.mainClock.autoAdvance = false
        expanded = false
        Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeBy(slow / 2L)
        assertTrue("half way it is fading: no pixel reaches the label color", !labelShows(label))
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertTrue("collapsed it is gone", !labelShows(label, from = tokens.sizes.medium.containerHeight))
    }

    @Test
    fun `EFB-14 the default collapse runs over the standard spatial spring's duration`() {
        assertEquals(500, tokens.motionResizeDuration)
        assertNotEquals(tokens.motionStateDuration, tokens.motionResizeDuration)
    }

    @Test
    fun `EFB-15 without an icon it stays expanded, and a debuggable app reports that it cannot collapse`() = collectingReports { reports ->
        setDebuggable(true)
        expanded = false
        setEfab(icon = null)
        rule.waitForIdle()
        val m = tokens.sizes.medium
        assertEquals((m.containerPaddingInlineStart + labelWidth() + m.containerPaddingInlineEnd).value, widthOf().value, 0.6f)
        assertTrue("the label is drawn", labelShows(colors[TanreiColorRole.OnPrimary], from = 0.dp))
        assertEquals(reports.toString(), 1, reports.size)
        assertTrue(reports.toString(), "TanreiExtendedFloatingActionButton" in reports.single() && "expanded" in reports.single() && "icon" in reports.single())
    }

    @Test
    fun `EFB-15 a release-like app reports nothing, and one with an icon reports nothing anywhere`() = collectingReports { reports ->
        setDebuggable(false)
        expanded = false
        setEfab(icon = null)
        rule.waitForIdle()
        assertEquals(emptyList<String>(), reports)
        setDebuggable(true)
        setEfab()
        rule.waitForIdle()
        assertEquals(emptyList<String>(), reports)
    }

    // ── EFB-16: the shadow, outside and unclipped, and its motion ────────────

    @Test
    fun `EFB-16 the shadow is cast outside the container without clipping it - also while the group opacity dims it`() {
        val system = tanrei.withoutShadows().withFilled(TanreiInteractionState.Enabled) { it.copy(containerElevation = SOLID_SHADOW) }
            .withFilled(TanreiInteractionState.Pressed) { it.copy(containerElevation = SOLID_SHADOW) }
            .let { it.copy(extendedFab = it.extendedFab.copy(pressed = it.extendedFab.pressed.copy(opacity = PRESSED_OPACITY))) }
        setEfab(system = system)
        assertPixel("the whole drop below the container", belowProbe(SHADOW_DROP - HALF_DP), colors[TanreiColorRole.Error])
        assertPixel("and nothing beyond it", belowProbe(SHADOW_DROP + HALF_DP), surface)
        efab().performTouchInput { down(center) }
        rule.waitForIdle()
        assertPixel("dimmed with the button, not cut off", belowProbe(SHADOW_DROP - HALF_DP), colors[TanreiColorRole.Error].copy(alpha = PRESSED_OPACITY).compositeOver(surface))
        efab().performTouchInput { up() }
    }

    @Test
    fun `EFB-16 a change of state moves the colors and the elevation over the state duration and easing`() {
        val slow = 400
        val system = tanrei.withoutShadows().withFilled(TanreiInteractionState.Hovered) {
            it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Success), labelColor = TanreiPaint.Role(TanreiColorRole.Warning), containerElevation = SOLID_SHADOW)
        }.let { it.copy(extendedFab = it.extendedFab.copy(motionStateDuration = slow, motionStateEasing = tanrei.motion.easing.linear)) }
        setEfab(system = system)
        rule.mainClock.autoAdvance = false
        efab().performMouseInput { moveTo(center) }
        rule.mainClock.advanceTimeBy(slow / 2L)
        val container = containerProbe(fromEnd = false)
        assertTrue("the container is on its way: $container", !isClose(container, colors[TanreiColorRole.Primary]) && !isClose(container, colors[TanreiColorRole.Success]))
        val icon = iconProbe()
        assertTrue("the label color is on its way: $icon", !isClose(icon, colors[TanreiColorRole.OnPrimary]) && !isClose(icon, colors[TanreiColorRole.Warning]))
        val below = belowProbe(SHADOW_DROP / 4)
        assertTrue("the shadow is on its way: $below", !isClose(below, surface) && !isClose(below, colors[TanreiColorRole.Error]))
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertContainerColor(colors[TanreiColorRole.Success])
        assertPixel("the icon", iconProbe(), colors[TanreiColorRole.Warning])
        assertPixel("the shadow", belowProbe(SHADOW_DROP / 2), colors[TanreiColorRole.Error])
    }

    // ── EFB-17: it does not position itself ──────────────────────────────────

    @Test
    fun `EFB-17 it lays out at its own size where the layout that holds it places it, and draws no scrim`() {
        var direction by mutableStateOf(LayoutDirection.Ltr)
        rule.setContent {
            CompositionLocalProvider(LocalLayoutDirection provides direction) {
                TanreiTheme(system = tanrei, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                    Box(Modifier.testTag(STAGE_TAG).size(SCREEN_W, SCREEN_H).background(TanreiColorRole.Surface.color), contentAlignment = Alignment.BottomEnd) {
                        TanreiExtendedFloatingActionButton(text = LABEL, onClick = { clicks++ }, modifier = Modifier.testTag(TAG), expanded = expanded, icon = { SolidIcon() })
                    }
                }
            }
        }
        val screen = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
        var bounds = efab().getUnclippedBoundsInRoot()
        assertEquals(tokens.sizes.medium.containerHeight.value, (bounds.bottom - bounds.top).value, 0.5f)
        assertTrue("its own width, not the screen's", bounds.right - bounds.left < SCREEN_W)
        assertEquals(screen.right.value, bounds.right.value, 0.5f)
        assertEquals(screen.bottom.value, bounds.bottom.value, 0.5f)
        val map = rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap()
        assertPixel("no scrim: the rest of the screen is the surface", map.at(SCREEN_W / 8, SCREEN_H / 4), surface)
        // Collapsing: the layout keeps the inline-end edge where it was.
        expanded = false
        rule.waitForIdle()
        bounds = efab().getUnclippedBoundsInRoot()
        assertEquals(screen.right.value, bounds.right.value, 0.5f)
        direction = LayoutDirection.Rtl
        rule.waitForIdle()
        bounds = efab().getUnclippedBoundsInRoot()
        assertEquals(screen.left.value, bounds.left.value, 0.5f)
    }

    // ── EFB-18: right-to-left ────────────────────────────────────────────────

    @Test
    fun `EFB-18 right-to-left puts the icon at the right, padded by the logical start, and the label to its left`() {
        val m = tokens.sizes.medium
        setEfab(direction = LayoutDirection.Rtl, system = tanrei.withoutShadows())
        rule.waitForIdle()
        val width = widthOf()
        val container = tokens.variants.filled.enabled.containerColor.resolve(colors)
        val icon = colors[TanreiColorRole.OnPrimary]
        val middle = m.containerHeight / 2
        assertPixel("the start padding at the right", containerPixel(width - m.containerPaddingInlineStartWithIcon + HALF_DP, middle), container)
        assertPixel("the icon's first column from the right", containerPixel(width - m.containerPaddingInlineStartWithIcon - HALF_DP, middle), icon)
        assertPixel("no icon at the left", containerPixel(m.containerPaddingInlineStartWithIcon + HALF_DP, middle), container)
        assertTrue("the label is left of the icon", labelShows(icon, from = m.containerPaddingInlineEnd, to = width - m.containerPaddingInlineStartWithIcon - m.iconSize - m.containerGap))
    }

    @Test
    fun `EFB-18 right-to-left grows the ripple from the point of contact, as left-to-right does`() {
        setEfab(system = tanrei.answering(TanreiPressedFeedback.Ripple), direction = LayoutDirection.Rtl)
        val resting = tokens.variants.filled.enabled.containerColor.resolve(colors)
        val pressed = tokens.variants.filled.pressed.containerColor.resolve(colors)
        val width = widthOf()
        rule.mainClock.autoAdvance = false
        // The right end is the inline start in right-to-left.
        efab().performTouchInput { down((width - START_PROBE.first to START_PROBE.second).toOffset()) }
        rule.mainClock.advanceTimeBy(50)
        assertPixel("the layer has reached the point of contact", containerPixel(width - START_PROBE.first, START_PROBE.second), pressed)
        assertPixel("but not the other side", containerPixel(START_PROBE.first, START_PROBE.second), resting)
        efab().performTouchInput { up() }
    }

    // ── EFB-19: an empty label ───────────────────────────────────────────────

    @Test
    fun `EFB-19 without a label it still renders and works, and a debuggable app reports it once`() = collectingReports { reports ->
        setDebuggable(true)
        setEfab(text = "")
        efab().assertHeightIsEqualTo(tokens.sizes.medium.containerHeight)
        assertPixel("the icon is drawn", iconProbe(), colors[TanreiColorRole.OnPrimary])
        efab().assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.ContentDescription))
        efab().performClick()
        rule.waitForIdle()
        assertEquals(1, clicks)
        assertEquals(reports.toString(), 1, reports.size)
        assertTrue(reports.toString(), "TanreiExtendedFloatingActionButton" in reports.single() && "text" in reports.single())
    }

    @Test
    fun `EFB-19 a release-like app reports nothing, and a labelled one reports nothing anywhere`() = collectingReports { reports ->
        setDebuggable(false)
        setEfab(text = "")
        rule.waitForIdle()
        assertEquals(emptyList<String>(), reports)
        setDebuggable(true)
        setEfab()
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

    private fun TanreiSystem.withFilled(state: TanreiInteractionState, change: (TanreiExtendedFabVariantStateTokens) -> TanreiExtendedFabVariantStateTokens): TanreiSystem {
        val tokens = extendedFab.variants.filled
        val changed = when (state) {
            TanreiInteractionState.Enabled -> tokens.copy(enabled = change(tokens.enabled))
            TanreiInteractionState.Hovered -> tokens.copy(hovered = change(tokens.hovered))
            TanreiInteractionState.Focused -> tokens.copy(focused = change(tokens.focused))
            TanreiInteractionState.Pressed -> tokens.copy(pressed = change(tokens.pressed))
            TanreiInteractionState.Disabled -> tokens.copy(disabled = change(tokens.disabled))
        }
        return copy(extendedFab = extendedFab.copy(variants = extendedFab.variants.copy(filled = changed)))
    }

    /** Every state of every variant without a shadow: for tests about something else, measured to the pixel. */
    private fun TanreiSystem.withoutShadows(): TanreiSystem {
        fun TanreiExtendedFabVariantTokens.flat() = TanreiExtendedFabVariantTokens(
            enabled = enabled.copy(containerElevation = emptyList()),
            hovered = hovered.copy(containerElevation = emptyList()),
            focused = focused.copy(containerElevation = emptyList()),
            pressed = pressed.copy(containerElevation = emptyList()),
            disabled = disabled.copy(containerElevation = emptyList()),
        )
        val v: TanreiExtendedFabVariants = extendedFab.variants
        return copy(extendedFab = extendedFab.copy(variants = v.copy(filled = v.filled.flat(), tonal = v.tonal.flat(), surface = v.surface.flat())))
    }

    private fun stage(): PixelMap = rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap()

    /** A pixel of the stage at [x], [y] from the top-left corner of the medium container (its node is the container). */
    private fun containerPixel(x: Dp, y: Dp): Color = stage().at(STAGE + x, STAGE + y)

    /** A paint of the default system over the surface: what a (possibly translucent) container looks like. */
    private fun assertContainer(paint: TanreiPaint) = assertContainerColor(paint.resolve(colors).compositeOver(surface))

    private fun assertContainerColor(expected: Color) = assertPixel("container", containerProbe(fromEnd = false), expected)

    /** In the start padding (before the icon), or in the end padding (after the label), at the vertical center. */
    private fun containerProbe(fromEnd: Boolean): Color = if (fromEnd) containerPixel(widthOf() - START_PROBE.first, START_PROBE.second) else containerPixel(START_PROBE.first, START_PROBE.second)

    /** The center of the medium icon. */
    private fun iconProbe(): Color = tokens.sizes.medium.let { containerPixel(it.containerPaddingInlineStartWithIcon + it.iconSize / 2, it.containerHeight / 2) }

    /** [by] below the medium container's bottom edge, at its horizontal center. */
    private fun belowProbe(by: Dp): Color = containerPixel(widthOf() / 2, tokens.sizes.medium.containerHeight + by)

    /** The pixel [outside] the container's top edge, at its horizontal center. */
    private fun focusProbe(outside: Dp): Color = containerPixel(widthOf() / 2, -outside)

    /**
     * Whether some pixel of the medium container between [from] and [to] (the label's part of the row, by default)
     * along its middle rows is [expected]: a glyph's stem at 2× reaches the label color in full.
     */
    private fun labelShows(expected: Color, from: Dp? = null, to: Dp? = null): Boolean {
        val m = tokens.sizes.medium
        val map = stage()
        val start = from ?: (m.containerPaddingInlineStartWithIcon + m.iconSize + m.containerGap)
        val end = to ?: (widthOf() - m.containerPaddingInlineEnd)
        return with(rule.density) {
            val x0 = (STAGE + start).roundToPx()
            val x1 = (STAGE + end).roundToPx()
            val y0 = (STAGE + m.containerHeight / 2 - 6.dp).roundToPx()
            val y1 = (STAGE + m.containerHeight / 2 + 6.dp).roundToPx()
            (y0 until y1).any { y -> (x0 until x1).any { x -> isClose(map[x, y], expected) } }
        }
    }

    private fun outerStrokeCenter(m: TanreiMeasure): Dp = m.focusOffset + m.focusInnerWidth + m.focusOuterWidth / 2

    private fun Pair<Dp, Dp>.toOffset(): Offset = with(rule.density) { Offset(first.toPx(), second.toPx()) }

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
        const val TAG = "extended-fab"
        const val UNKNOWN_TAG = "extended-fab-unknown"
        const val STAGE_TAG = "stage"
        const val LABEL = "Compose"
        const val LONG_LABEL = "Start a new route to the office"
        const val PIXEL_TOLERANCE = 2f / 255f
        const val MAX_RIPPLE_FRAMES = 60
        const val PRESSED_OPACITY = 0.5f
        const val COVERAGE_TOLERANCE = 0.05f
        const val COVERAGE_TOTAL_TOLERANCE = 1f
        /** Room for the level4 shadow and the focus ring around the button. */
        val STAGE = 72.dp
        val SCREEN_W = 300.dp
        val SCREEN_H = 160.dp
        val NARROW = 120.dp
        val HALF_DP = 0.5.dp
        val CORNER_MARGIN = 2.dp
        val SHADOW_DROP = 6.dp
        val RISE_PROBE = 24.dp
        /** In the top padding of the medium container, above the label and the icon. */
        val TOP_PROBE_Y = 6.dp
        val SOLID_SHADOW = listOf(TanreiShadowLayer(x = 0.dp, y = SHADOW_DROP, blur = 0.dp, spread = 0.dp, role = TanreiColorRole.Error))
        /** In the medium container's start padding (0–16dp, before the icon), at its vertical center. */
        val START_PROBE = 6.dp to 24.dp
    }
}

/** EFB-14, EFB-16 and EFB-9 where motion is reduced (the animator duration scale is 0). */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiExtendedFabReducedMotionTest {
    private object NoMotion : MotionDurationScale {
        override val scaleFactor: Float = 0f
    }

    @get:Rule
    val rule = createComposeRule(effectContext = NoMotion)

    private val tanrei = TanreiSystem.Tanrei
    private val colors = tanrei.colors.light
    private var expanded by mutableStateOf(true)

    private fun set(system: TanreiSystem) {
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Box(Modifier.background(TanreiColorRole.Surface.color)) {
                    TanreiExtendedFloatingActionButton(text = "Compose", onClick = {}, modifier = Modifier.testTag("efab"), expanded = expanded, icon = {})
                }
            }
        }
    }

    private fun pixel(x: Dp, y: Dp): Color = with(rule.density) { rule.onNodeWithTag("efab").captureToImage().toPixelMap()[x.roundToPx(), y.roundToPx()] }

    private fun assertPixel(what: String, actual: Color, expected: Color) {
        val delta = maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue))
        assertTrue("$what: expected $expected but was $actual", delta <= 2f / 255f)
    }

    @Test
    fun `EFB-16 where motion is reduced a change of state shows at once`() {
        set(tanrei.copy(extendedFab = tanrei.extendedFab.copy(motionStateDuration = 400)))
        val hovered = tanrei.extendedFab.variants.filled.hovered.containerColor.resolve(colors)
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag("efab").performMouseInput { moveTo(center) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("hovered on the next frame", pixel(6.dp, 24.dp), hovered)
    }

    @Test
    fun `EFB-14 where motion is reduced the collapse shows at once`() {
        set(tanrei)
        rule.mainClock.autoAdvance = false
        expanded = false
        Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        rule.onNodeWithTag("efab").assertWidthIsEqualTo(tanrei.extendedFab.sizes.medium.containerHeight)
    }

    @Test
    fun `EFB-9 where motion is reduced the ripple appears whole`() {
        set(tanrei.copy(behavior = tanrei.behavior.copy(pressedFeedback = TanreiPressedFeedback.Ripple)))
        val pressed = tanrei.extendedFab.variants.filled.pressed.containerColor.resolve(colors)
        val width = rule.onNodeWithTag("efab").getUnclippedBoundsInRoot().let { it.right - it.left }
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag("efab").performTouchInput { down(Offset(6.dp.toPx(), 24.dp.toPx())) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("the far side, whole at once", pixel(width - 6.dp, 24.dp), pressed)
        rule.onNodeWithTag("efab").performTouchInput { up() }
    }
}

/** A stand-in icon: fills the icon slot with the icon color it is given. */
@Composable
private fun SolidIcon() {
    Box(Modifier.fillMaxSize().background(LocalTanreiContentColor.current))
}
