package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.MotionDurationScale
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
import io.github.chnotchy.tanrei.tokens.Cupertino
import io.github.chnotchy.tanrei.tokens.M3Like
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiFabSize
import io.github.chnotchy.tanrei.tokens.TanreiFabVariant
import io.github.chnotchy.tanrei.tokens.TanreiFabVariantStateTokens
import io.github.chnotchy.tanrei.tokens.TanreiFabVariantTokens
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
 * Behaviour tests for `specs/fab.spec.json`. Each test names the behaviour id (`FAB-n`) it covers. Runs on the JVM
 * (Robolectric, native graphics) — no emulator needed.
 *
 * The FAB is drawn on the surface with [STAGE] around it, so its shadow and its focus ring — both outside the
 * container — are pixels of the stage. The icon in most tests is [SolidIcon]: a box that fills the icon slot with the
 * icon color it is given, so "the icon color" is a pixel at the container's center.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiFabTest {
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
    private val tokens = tanrei.fab
    private val measure = tanrei.measure
    private val surface = colors[TanreiColorRole.Surface]

    private var clicks = 0

    @Before
    fun setUp() {
        // ATF checks: NOT_RUN under Robolectric (see TanreiButtonTest); they run for real in the gallery's
        // instrumented tests. The explicit semantics assertions below guard accessibility here.
        rule.enableAccessibilityChecks()
    }

    /** What [setFab] renders; changing it recomposes the one scene a test may set. */
    private class Scene(
        val variant: TanreiFabVariant,
        val size: TanreiFabSize,
        val enabled: Boolean,
        val system: TanreiSystem,
        val label: String,
        val fontScale: Float,
        val icon: @Composable () -> Unit,
    )

    private var scene by mutableStateOf<Scene?>(null)

    /** One FAB on the surface, [STAGE] around it. Called again, it replaces the scene with a fresh composition. */
    private fun setFab(
        variant: TanreiFabVariant = TanreiFabVariant.Filled,
        size: TanreiFabSize = TanreiFabSize.Medium,
        enabled: Boolean = true,
        system: TanreiSystem = tanrei,
        label: String = LABEL,
        fontScale: Float = 1f,
        icon: @Composable () -> Unit = { SolidIcon() },
    ) {
        val first = scene == null
        scene = Scene(variant, size, enabled, system, label, fontScale, icon)
        if (!first) {
            rule.waitForIdle()
            return
        }
        rule.setContent {
            val current = scene ?: return@setContent
            key(current) {
                val density = LocalDensity.current
                CompositionLocalProvider(LocalDensity provides Density(density.density, current.fontScale)) {
                    TanreiTheme(system = current.system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                        Box(Modifier.testTag(STAGE_TAG).background(TanreiColorRole.Surface.color).padding(STAGE)) {
                            TanreiFloatingActionButton(
                                onClick = { clicks++ },
                                contentDescription = current.label,
                                modifier = Modifier.testTag(TAG),
                                variant = current.variant,
                                size = current.size,
                                enabled = current.enabled,
                                icon = current.icon,
                            )
                        }
                    }
                }
            }
        }
    }

    private fun fab() = rule.onNodeWithTag(TAG)

    // ── Semantics ────────────────────────────────────────────────────────────

    @Test
    fun `FAB-1 the FAB is a button named by its contentDescription, with a click action, and passes accessibility checks`() {
        setFab()
        fab()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf(LABEL)))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.ToggleableState))
            .assertHasClickAction()
            .assertIsEnabled()
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    @Test
    fun `FAB-11 the icon is decorative - a ligature drawn as text is not announced, the contentDescription is the only name`() {
        setFab(icon = { TanreiText(GLYPH_NAME) })
        fab()
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Text))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf(LABEL)))
    }

    // ── FAB-1: activation emits click exactly once ───────────────────────────

    @Test
    fun `FAB-1 a tap emits click exactly once`() {
        setFab()
        fab().performClick()
        rule.waitForIdle()
        assertEquals(1, clicks)
    }

    @Test
    @KeyboardNavigation
    fun `FAB-1 Enter and Space each emit click exactly once`() {
        setFab()
        fab().requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals(1, clicks)
        fab().performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        assertEquals(2, clicks)
    }

    @Test
    fun `FAB-1 an assistive technology click emits click exactly once`() {
        setFab()
        fab().performSemanticsAction(SemanticsActions.OnClick)
        rule.waitForIdle()
        assertEquals(1, clicks)
    }

    // ── FAB-2: disabled ──────────────────────────────────────────────────────

    @Test
    fun `FAB-2 a disabled FAB emits no click`() {
        setFab(enabled = false)
        fab().performTouchInput { down(center); up() }
        rule.waitForIdle()
        assertEquals(0, clicks)
    }

    @Test
    @KeyboardNavigation
    fun `FAB-2 a disabled FAB is not focusable and exposes the disabled state`() {
        setFab(enabled = false)
        fab()
            .assertIsNotEnabled()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Focused))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsActions.RequestFocus))
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    // ── FAB-3: the highest-precedence active state is drawn from THAT state's tokens ──

    @Test
    fun `FAB-3 pressed draws the pressed container token, and release returns to the resting token`() {
        setFab()
        fab().performTouchInput { down(center) }
        rule.waitForIdle()
        assertContainer(tokens.variants.filled.pressed.containerColor)
        fab().performTouchInput { up() }
        rule.waitForIdle()
        assertContainer(tokens.variants.filled.enabled.containerColor)
    }

    @Test
    fun `FAB-3 hovered draws the hovered container token`() {
        setFab()
        fab().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainer(tokens.variants.filled.hovered.containerColor)
    }

    @Test
    @KeyboardNavigation
    fun `FAB-3 keyboard focus draws the focused container token`() {
        setFab()
        fab().requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertContainer(tokens.variants.filled.focused.containerColor)
    }

    @Test
    fun `FAB-3 FAB-4 a tap does not select the focused state - once the press is over the resting tokens return, and no ring shows`() {
        setFab()
        fab().performTouchInput { down(center); up() }
        rule.waitForIdle()
        fab().assert(SemanticsMatcher.expectValue(SemanticsProperties.Focused, false))
        assertContainer(tokens.variants.filled.enabled.containerColor)
        assertPixel("no ring", focusProbe(outerStrokeCenter(measure)), surface)
    }

    @Test
    fun `FAB-3 every variant draws its own container and icon tokens at rest`() {
        for (variant in listOf(TanreiFabVariant.Filled, TanreiFabVariant.Tonal, TanreiFabVariant.Surface)) {
            setFab(variant = variant)
            val resting = tokens.variants[variant].enabled
            assertContainer(resting.containerColor)
            assertPixel("$variant icon", iconProbe(), resting.iconColor.resolve(colors))
        }
        // The three variants are three containers.
        val containers = tokens.variants.keys.map { tokens.variants[it].enabled.containerColor.resolve(colors) }
        assertEquals(3, containers.toSet().size)
    }

    @Test
    fun `FAB-3 a system that gives pressed another icon paint draws the icon in it`() {
        setFab(system = tanrei.withFilled(TanreiInteractionState.Pressed) { it.copy(iconColor = TanreiPaint.Role(TanreiColorRole.Error)) })
        assertPixel("resting icon", iconProbe(), colors[TanreiColorRole.OnPrimary])
        fab().performTouchInput { down(center) }
        rule.waitForIdle()
        assertPixel("pressed icon", iconProbe(), colors[TanreiColorRole.Error])
    }

    @Test
    fun `FAB-3 the pressed opacity token dims the whole FAB, icon included`() {
        val opacity = 0.4f
        setFab(system = tanrei.withoutShadows().let { it.copy(fab = it.fab.copy(pressed = it.fab.pressed.copy(opacity = opacity))) })
        fab().performTouchInput { down(center) }
        rule.waitForIdle()
        val pressed = tokens.variants.filled.pressed
        assertContainerColor(pressed.containerColor.resolve(colors).copy(alpha = opacity).compositeOver(surface))
        assertPixel("icon", iconProbe(), pressed.iconColor.resolve(colors).copy(alpha = opacity).compositeOver(surface))
    }

    @Test
    fun `FAB-3 FAB-12 the elevation comes from the state's tokens - a system that gives hovered another shadow draws it`() {
        setFab(system = tanrei.withFilled(TanreiInteractionState.Hovered) { it.copy(containerElevation = SOLID_SHADOW) }.withoutRestingShadow())
        assertPixel("nothing below at rest", belowProbe(SHADOW_DROP / 2), surface)
        fab().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertPixel("the hovered shadow", belowProbe(SHADOW_DROP / 2), colors[TanreiColorRole.Error])
    }

    @Test
    fun `FAB-3 the default FAB rises under hover - level4 against level3 at rest - so hover alone is visible`() {
        val filled = tokens.variants.filled
        assertEquals(tanrei.elevation.level3, filled.enabled.containerElevation)
        assertEquals(tanrei.elevation.level4, filled.hovered.containerElevation)
        assertEquals(tanrei.elevation.level3, filled.focused.containerElevation)
        assertEquals(tanrei.elevation.level3, filled.pressed.containerElevation)
        setFab()
        val resting = belowProbe(RISE_PROBE)
        fab().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val hovered = belowProbe(RISE_PROBE)
        assertTrue("the hovered shadow reaches further: $resting at rest, $hovered hovered", resting.red - hovered.red >= 1.5f / 255f)
    }

    @Test
    @KeyboardNavigation
    fun `FAB-3 under acme, which values hovered, focused and pressed differently - pressed wins over focused wins over hovered, in pixels`() {
        val acme = TanreiSystem.Acme
        val filled = acme.fab.variants.filled
        val schemeColors = acme.colors.light
        fun over(paint: TanreiPaint) = paint.resolve(schemeColors).compositeOver(schemeColors[TanreiColorRole.Surface])
        val all = listOf(filled.enabled, filled.hovered, filled.focused, filled.pressed).map { over(it.containerColor) }
        assertEquals("acme tells the four states apart", 4, all.toSet().size)

        setFab(system = acme)
        fab().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainerColor(over(filled.hovered.containerColor))
        fab().requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertContainerColor(over(filled.focused.containerColor)) // hovered AND focused: focused wins
        fab().performKeyInput { keyDown(Key.Enter) }
        rule.waitForIdle()
        assertContainerColor(over(filled.pressed.containerColor)) // hovered AND focused AND pressed: pressed wins
        fab().performKeyInput { keyUp(Key.Enter) }
        rule.waitForIdle()
        assertContainerColor(over(filled.focused.containerColor))
        assertEquals(1, clicks)
    }

    // ── FAB-4: focus ring on keyboard focus only, never animated ─────────────

    @Test
    @KeyboardNavigation
    fun `FAB-4 keyboard focus shows the focus ring on the first frame, outside the container`() {
        setFab()
        assertPixel("no ring before focus", focusProbe(outerStrokeCenter(measure)), surface)
        rule.mainClock.autoAdvance = false
        fab().requestFocus()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("ring at full color on the first frame", focusProbe(outerStrokeCenter(measure)), colors[TanreiColorRole.FocusRing])
        assertPixel("the offset leaves the surface visible", focusProbe(measure.focusOffset / 2), surface)
    }

    @Test
    fun `FAB-4 a pointer press does not show the focus ring`() {
        setFab()
        fab().performTouchInput { down(center) }
        rule.waitForIdle()
        assertPixel("no ring while pressed", focusProbe(outerStrokeCenter(measure)), surface)
        fab().performTouchInput { up() }
    }

    // ── FAB-5: hit area on both axes, visual size unchanged ──────────────────

    @Test
    fun `FAB-5 a size below the target reserves the target on both axes but draws its own square, and a larger one is its own target`() {
        for (size in listOf(TanreiFabSize.Small, TanreiFabSize.Medium, TanreiFabSize.Large)) {
            val side = tokens.sizes[size].containerSize
            val node = max(side, measure.targetTouch)
            setFab(size = size, system = tanrei.withoutShadows())
            fab().assertWidthIsEqualTo(node).assertHeightIsEqualTo(node)
            val container = tokens.variants.filled.enabled.containerColor.resolve(colors)
            val middle = side / 2
            // Probe the middle of each edge (the icon is centered, clear of every edge): the square is exactly
            // `container.size` on both axes.
            assertPixel("$size: left of the square", fabPixel(-HALF_DP, middle, size), surface)
            assertPixel("$size: its first column", fabPixel(HALF_DP, middle, size), container)
            assertPixel("$size: its last column", fabPixel(side - HALF_DP, middle, size), container)
            assertPixel("$size: right of the square", fabPixel(side + HALF_DP, middle, size), surface)
            assertPixel("$size: above", fabPixel(middle, -HALF_DP, size), surface)
            assertPixel("$size: its first row", fabPixel(middle, HALF_DP, size), container)
            assertPixel("$size: its last row", fabPixel(middle, side - HALF_DP, size), container)
            assertPixel("$size: below", fabPixel(middle, side + HALF_DP, size), surface)
        }
        // In the default system the medium FAB is exactly the touch target.
        assertEquals(measure.targetTouch, tokens.sizes.medium.containerSize)
    }

    @Test
    fun `FAB-5 a tap in the corner of the target, outside the small visual square, emits click`() {
        setFab(size = TanreiFabSize.Small)
        fab().performTouchInput { down(Offset(1f, 1f)); up() }
        rule.waitForIdle()
        assertEquals(1, clicks)
    }

    @Test
    fun `FAB-5 the target size comes from the system`() {
        val target = 60.dp
        setFab(system = tanrei.copy(measure = measure.copy(targetTouch = target)))
        fab().assertWidthIsEqualTo(target).assertHeightIsEqualTo(target)
    }

    // ── FAB-6: disabled is drawn from the disabled tokens of the variant ─────

    @Test
    fun `FAB-6 disabled renders the container, the icon and the elevation from the disabled tokens - no shadow`() {
        setFab(enabled = false)
        val disabled = tokens.variants.filled.disabled
        assertEquals("nothing disabled is raised", emptyList<TanreiShadowLayer>(), disabled.containerElevation)
        val container = disabled.containerColor.resolve(colors).compositeOver(surface)
        assertContainerColor(container)
        assertPixel("icon", iconProbe(), disabled.iconColor.resolve(colors).compositeOver(container))
        assertPixel("no shadow below", belowProbe(1.dp), surface)
        assertPixel("no ring at the edge", fabPixel(tokens.sizes.medium.containerSize / 2, HALF_DP), container)
    }

    @Test
    fun `FAB-6 every variant is drawn from its own disabled tokens`() {
        val system = tanrei.withVariant(TanreiFabVariant.Tonal, TanreiInteractionState.Disabled) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Warning)) }
        setFab(variant = TanreiFabVariant.Tonal, enabled = false, system = system)
        assertContainerColor(colors[TanreiColorRole.Warning])
    }

    @Test
    fun `FAB-6 the disabled opacity token dims the whole control, and disabled ignores hover`() {
        val opacity = 0.5f
        val system = tanrei.withFilled(TanreiInteractionState.Disabled) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
            .let { it.copy(fab = it.fab.copy(disabled = it.fab.disabled.copy(opacity = opacity))) }
        setFab(enabled = false, system = system)
        val expected = colors[TanreiColorRole.Error].copy(alpha = opacity).compositeOver(surface)
        assertContainerColor(expected)
        fab().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainerColor(expected)
    }

    // ── FAB-7: a value the design system does not have draws as the default ──

    private fun setDefaultAndUnknown() {
        rule.setContent {
            TanreiTheme(system = tanrei, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Box(Modifier.background(TanreiColorRole.Surface.color)) {
                    androidx.compose.foundation.layout.Column(Modifier.padding(STAGE)) {
                        TanreiFloatingActionButton(onClick = {}, contentDescription = LABEL, modifier = Modifier.testTag(TAG)) { SolidIcon() }
                        Box(Modifier.size(STAGE))
                        TanreiFloatingActionButton(
                            onClick = { clicks++ },
                            contentDescription = LABEL,
                            modifier = Modifier.testTag(UNKNOWN_TAG),
                            variant = TanreiFabVariant("ghost"),
                            size = TanreiFabSize("huge"),
                        ) { SolidIcon() }
                    }
                }
            }
        }
    }

    @Test
    fun `FAB-7 the lookups are total - an unknown size or variant reads the default value's tokens`() {
        assertTrue(TanreiFabSize("huge") !in tokens.sizes)
        assertTrue(TanreiFabVariant("ghost") !in tokens.variants)
        assertEquals(tokens.sizes.medium, tokens.sizes[TanreiFabSize("huge")])
        assertEquals(tokens.variants.filled, tokens.variants[TanreiFabVariant("ghost")])
        // The defaults are the spec's: size medium, variant filled.
        assertEquals(listOf("small", "medium", "large"), tokens.sizes.keys.map { it.key })
        assertEquals(listOf("filled", "tonal", "surface"), tokens.variants.keys.map { it.key })
    }

    @Test
    fun `FAB-7 in a release-like app an unknown size and variant render exactly like the default, silently`() = collectingReports { reports ->
        setDebuggable(false)
        setDefaultAndUnknown()
        val expected = fab().captureToImage().toPixelMap()
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
    fun `FAB-7 a debuggable app reports the unknown size and variant once, and still renders the default`() = collectingReports { reports ->
        setDebuggable(true)
        setDefaultAndUnknown()
        rule.onNodeWithTag(UNKNOWN_TAG).assertWidthIsEqualTo(tokens.sizes.medium.containerSize).assertHeightIsEqualTo(tokens.sizes.medium.containerSize)
        rule.onNodeWithTag(UNKNOWN_TAG).performClick()
        rule.waitForIdle()
        assertEquals(reports.toString(), 2, reports.size)
        assertTrue(reports.toString(), reports.any { "TanreiFloatingActionButton" in it && "size \"huge\"" in it && "\"tanrei\"" in it })
        assertTrue(reports.toString(), reports.any { "TanreiFloatingActionButton" in it && "variant \"ghost\"" in it })
    }

    @Test
    fun `FAB-7 a known size and variant report nothing in a debuggable app`() = collectingReports { reports ->
        setDebuggable(true)
        setFab(variant = TanreiFabVariant.Surface, size = TanreiFabSize.Large)
        rule.waitForIdle()
        assertEquals(emptyList<String>(), reports)
    }

    // ── FAB-8: pressed appears without delay and stays for press-hold ────────

    @Test
    fun `FAB-8 a tap that ends at once shows the pressed state on the next frame and keeps it for press-hold`() {
        setFab()
        val hold = tanrei.motion.duration.pressHold.toLong()
        rule.mainClock.autoAdvance = false
        fab().performTouchInput { down(center); up() }
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
    fun `FAB-8 Enter and Space show the pressed state for press-hold too`() {
        val acme = TanreiSystem.Acme
        val filled = acme.fab.variants.filled
        val acmeColors = acme.colors.light
        fun over(paint: TanreiPaint) = paint.resolve(acmeColors).compositeOver(acmeColors[TanreiColorRole.Surface])
        setFab(system = acme)
        fab().requestFocus().assertIsFocused()
        rule.waitForIdle()
        for (key in listOf(Key.Enter, Key.Spacebar)) {
            rule.mainClock.autoAdvance = false
            fab().performKeyInput { pressKey(key) }
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
    fun `FAB-8 the hold time is the system's press-hold duration`() {
        val long = 400
        setFab(system = tanrei.copy(motion = tanrei.motion.copy(duration = tanrei.motion.duration.copy(pressHold = long))))
        rule.mainClock.autoAdvance = false
        fab().performTouchInput { down(center); up() }
        rule.mainClock.advanceTimeBy(long - 100L)
        assertContainer(tokens.variants.filled.pressed.containerColor)
        rule.mainClock.advanceTimeBy(100L + tokens.motionStateDuration * 2L)
        assertContainer(tokens.variants.filled.enabled.containerColor)
    }

    // ── FAB-9: pressed-feedback chooses how the press is answered ────────────

    private fun TanreiSystem.answering(feedback: TanreiPressedFeedback) = copy(behavior = behavior.copy(pressedFeedback = feedback))

    @Test
    fun `FAB-9 overlay is the default - the pressed tokens apply to the whole container at once`() {
        assertEquals(TanreiPressedFeedback.Overlay, tanrei.behavior.pressedFeedback)
        setFab()
        rule.mainClock.autoAdvance = false
        fab().performTouchInput { down(START_PROBE.toOffset()) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        val pressed = tokens.variants.filled.pressed.containerColor.resolve(colors)
        assertPixel("at the point of contact", containerProbe(fromEnd = false), pressed)
        assertPixel("at the far side, at once", containerProbe(fromEnd = true), pressed)
    }

    @Test
    fun `FAB-9 ripple - m3-like's answer - grows the pressed container color from the point of contact over feedback-duration, then fades over state-duration`() {
        assertEquals(TanreiPressedFeedback.Ripple, TanreiSystem.M3Like.behavior.pressedFeedback)
        setFab(system = tanrei.answering(TanreiPressedFeedback.Ripple))
        val resting = tokens.variants.filled.enabled.containerColor.resolve(colors)
        val pressed = tokens.variants.filled.pressed.containerColor.resolve(colors)
        rule.mainClock.autoAdvance = false
        fab().performTouchInput { down(START_PROBE.toOffset()) }
        rule.mainClock.advanceTimeBy(50)
        assertPixel("the layer has reached the point of contact", containerProbe(fromEnd = false), pressed)
        assertPixel("but not the far side", containerProbe(fromEnd = true), resting)
        rule.mainClock.advanceTimeBy(tokens.motionFeedbackDuration.toLong())
        assertPixel("the far side once grown", containerProbe(fromEnd = true), pressed)
        fab().performTouchInput { up() }
        rule.mainClock.advanceTimeBy(tanrei.motion.duration.pressHold + tokens.motionStateDuration * 2L)
        assertPixel("faded at the point of contact", containerProbe(fromEnd = false), resting)
        assertPixel("faded at the far side", containerProbe(fromEnd = true), resting)
    }

    @Test
    fun `FAB-9 the ripple's growth is the FAB's feedback-duration token`() {
        val slow = tanrei.motion.duration.long1 * 4
        val system = tanrei.answering(TanreiPressedFeedback.Ripple).let { it.copy(fab = it.fab.copy(motionFeedbackDuration = slow, motionStateEasing = tanrei.motion.easing.linear)) }
        setFab(system = system)
        val resting = tokens.variants.filled.enabled.containerColor.resolve(colors)
        val pressed = tokens.variants.filled.pressed.containerColor.resolve(colors)
        rule.mainClock.autoAdvance = false
        fab().performTouchInput { down(START_PROBE.toOffset()) }
        rule.mainClock.advanceTimeBy(tanrei.motion.duration.long1.toLong())
        assertPixel("not at the far side after long1", containerProbe(fromEnd = true), resting)
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertPixel("at the far side after feedback-duration", containerProbe(fromEnd = true), pressed)
        fab().performTouchInput { up() }
    }

    @Test
    @KeyboardNavigation
    fun `FAB-9 a keyboard ripple grows from the center`() {
        val acme = TanreiSystem.Acme.answering(TanreiPressedFeedback.Ripple)
        val filled = acme.fab.variants.filled
        val focused = filled.focused.containerColor.resolve(acme.colors.light)
        val pressed = filled.pressed.containerColor.resolve(acme.colors.light)
        // No icon: the center of the container is container too.
        setFab(system = acme, icon = {})
        fab().requestFocus().assertIsFocused()
        rule.waitForIdle()
        rule.mainClock.autoAdvance = false
        fab().performKeyInput { keyDown(Key.Enter) }
        var frames = 0
        while (!isClose(iconProbe(), pressed) && frames++ < MAX_RIPPLE_FRAMES) rule.mainClock.advanceTimeByFrame()
        assertPixel("the layer reached the center first", iconProbe(), pressed)
        assertPixel("not the start", containerProbe(fromEnd = false), focused)
        assertPixel("not the end", containerProbe(fromEnd = true), focused)
        fab().performKeyInput { keyUp(Key.Enter) }
    }

    /**
     * Filled's pressed state differs from hovered in the icon (error), the opacity and the shadow (a solid one);
     * hovered has a container color of its own (success), so "the state under the press" shows.
     */
    private fun TanreiSystem.pressedDiffersEverywhere(): TanreiSystem =
        withoutShadows()
            .withFilled(TanreiInteractionState.Hovered) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Success)) }
            .withFilled(TanreiInteractionState.Pressed) { it.copy(iconColor = TanreiPaint.Role(TanreiColorRole.Error), containerElevation = SOLID_SHADOW) }
            .let { it.copy(fab = it.fab.copy(pressed = it.fab.pressed.copy(opacity = PRESSED_OPACITY))) }

    private fun assertOnlyTheContainerColorStays(feedback: TanreiPressedFeedback) {
        setFab(system = tanrei.answering(feedback).pressedDiffersEverywhere())
        fun dimmed(color: Color) = color.copy(alpha = PRESSED_OPACITY).compositeOver(surface)
        val hovered = colors[TanreiColorRole.Success]
        fab().performMouseInput { moveTo(END_PROBE.toOffset()) }
        rule.waitForIdle()
        assertContainerColor(hovered)
        assertPixel("no shadow while hovered", belowProbe(SHADOW_DROP / 2), surface)
        rule.mainClock.autoAdvance = false
        fab().performMouseInput { press() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("the HOVERED container color stays under the press, at the pressed opacity", containerProbe(fromEnd = false), dimmed(hovered))
        assertPixel("the pressed icon color", iconProbe(), dimmed(colors[TanreiColorRole.Error]))
        assertPixel("the pressed shadow", belowProbe(SHADOW_DROP / 2), dimmed(colors[TanreiColorRole.Error]))
        fab().performMouseInput { release() }
    }

    @Test
    fun `FAB-9 under ripple only the container color stays with the state under the press - icon, elevation and opacity are the pressed tokens`() =
        assertOnlyTheContainerColorStays(TanreiPressedFeedback.Ripple)

    @Test
    fun `FAB-9 under dim only the container color stays with the state under the press - icon, elevation and opacity are the pressed tokens`() =
        assertOnlyTheContainerColorStays(TanreiPressedFeedback.Dim)

    @Test
    fun `FAB-9 dim - cupertino's answer - applies the pressed opacity to the whole control and draws no state layer`() {
        val cupertino = TanreiSystem.Cupertino
        assertEquals(TanreiPressedFeedback.Dim, cupertino.behavior.pressedFeedback)
        val opacity = cupertino.fab.pressed.opacity
        assertTrue("cupertino dims a press: $opacity", opacity < 1f)
        setFab(system = cupertino.withoutShadows())
        val cupertinoColors = cupertino.colors.light
        val resting = cupertino.fab.variants.filled.enabled.containerColor.resolve(cupertinoColors)
        fab().performTouchInput { down(center) }
        rule.waitForIdle()
        assertContainerColor(resting.copy(alpha = opacity).compositeOver(cupertinoColors[TanreiColorRole.Surface]))
        fab().performTouchInput { up() }
    }

    @Test
    fun `FAB-9 under none every part stays with the state under the press, and it still clicks`() {
        setFab(system = tanrei.answering(TanreiPressedFeedback.None).pressedDiffersEverywhere())
        fab().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val hovered = stage()
        fab().performMouseInput { press() }
        rule.waitForIdle()
        val pressed = stage()
        val differing = (0 until hovered.height).sumOf { y -> (0 until hovered.width).count { x -> !isClose(hovered[x, y], pressed[x, y]) } }
        assertEquals("not one pixel answers the press", 0, differing)
        fab().performMouseInput { release() }
        rule.waitForIdle()
        assertEquals(1, clicks)
    }

    // ── FAB-10: corner smoothing and focus-style ─────────────────────────────

    private fun roundedBy(radius: Dp, smoothing: Float) = tanrei.withoutShadows().let {
        it.copy(shape = it.shape.copy(cornerSmoothing = smoothing), fab = it.fab.copy(sizes = it.fab.sizes.copy(medium = it.fab.sizes.medium.copy(containerShape = radius))))
    }

    @Test
    fun `FAB-10 at 0 the container corner is a quarter circle`() = assertCornerDrawnAs(12.dp, 0f)

    @Test
    fun `FAB-10 at 0_6 the container corner is Figma's smoothed construction - what cupertino draws`() {
        assertEquals(0.6f, TanreiSystem.Cupertino.shape.cornerSmoothing)
        // The largest radius whose corner has room for the whole amount (Figma budgets it per corner).
        assertCornerDrawnAs(tokens.sizes.medium.containerSize / 2 / 1.6f, 0.6f)
    }

    @Test
    fun `FAB-10 cupertino's FAB is a circle at every size`() {
        val cupertino = TanreiSystem.Cupertino.fab.sizes
        for (size in cupertino.keys) assertTrue("$size", cupertino[size].containerShape >= cupertino[size].containerSize / 2)
    }

    /** The container's top-left corner box (no icon) has exactly the coverage of `tanreiContainerShape(radius, smoothing)`. */
    private fun assertCornerDrawnAs(radius: Dp, smoothing: Float) {
        setFab(system = roundedBy(radius, smoothing), icon = {})
        val container = tokens.variants.filled.enabled.containerColor.resolve(colors)
        val map = stage()
        with(rule.density) {
            val origin = STAGE.roundToPx()
            val side = tokens.sizes.medium.containerSize.roundToPx()
            val outline = tanreiContainerShape(radius, smoothing).createOutline(Size(side.toFloat(), side.toFloat()), LayoutDirection.Ltr, this)
            val expected = ImageBitmap(side, side, ImageBitmapConfig.Argb8888)
            Canvas(expected).drawOutline(outline, Paint().apply { color = Color.Black })
            val expectedMap = expected.toPixelMap()
            val box = minOf((radius * 2 + CORNER_MARGIN).roundToPx(), side)
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
    fun `FAB-10 glow draws the focus colors as a soft halo under acme, where ring draws a hard line`() {
        val acme = TanreiSystem.Acme
        assertEquals(TanreiFocusStyle.Glow, acme.behavior.focusStyle)
        val acmeSurface = acme.colors.light[TanreiColorRole.Surface]
        val ring = acme.colors.light[TanreiColorRole.FocusRing]
        val m = acme.measure
        setFab(system = acme)
        fab().requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertTrue("the offset stays clear", tintOf(focusProbe(m.focusOffset / 2), acmeSurface, ring) < 0.05f)
        val inBand = focusProbe(m.focusOffset + m.focusInnerWidth + m.focusOuterWidth / 4)
        assertTrue("the halo carries the focus color: $inBand", tintOf(inBand, acmeSurface, ring) > 0.7f)
        val beyond = tintOf(focusProbe(m.focusOffset + m.focusInnerWidth + m.focusOuterWidth * 1.5f), acmeSurface, ring)
        assertTrue("soft beyond the hard edge: $beyond", beyond > 0.05f && beyond < 0.4f)
    }

    // ── FAB-11: the square, its corners and the icon ─────────────────────────

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
    fun `FAB-11 the icon box is the icon size of each size, centered, and the slot gets the unselected glyph of THAT size through the icon helper`() {
        for (size in listOf(TanreiFabSize.Small, TanreiFabSize.Medium, TanreiFabSize.Large)) {
            val metrics = tokens.sizes[size]
            setFab(size = size, icon = probeIcon, system = tanrei.withoutShadows())
            rule.waitForIdle()
            assertEquals("$size: the box", with(rule.density) { IntSize(metrics.iconSize.roundToPx(), metrics.iconSize.roundToPx()) }, seenBox)
            assertEquals("$size: the glyph", tanrei.icon.glyph(metrics.iconSize, selected = false), seenGlyph)
            assertEquals("$size: the icon color", colors[TanreiColorRole.OnPrimary], seenColor)
            // Centered: the icon's first and last columns are the same distance from the container's edges.
            val inset = (metrics.containerSize - metrics.iconSize) / 2
            val middle = metrics.containerSize / 2
            val container = tokens.variants.filled.enabled.containerColor.resolve(colors)
            assertPixel("$size: container before the icon", fabPixel(inset - HALF_DP, middle, size), container)
            assertPixel("$size: the icon's first column", fabPixel(inset + HALF_DP, middle, size), colors[TanreiColorRole.OnPrimary])
            assertPixel("$size: the icon's last column", fabPixel(metrics.containerSize - inset - HALF_DP, middle, size), colors[TanreiColorRole.OnPrimary])
            assertPixel("$size: container after the icon", fabPixel(metrics.containerSize - inset + HALF_DP, middle, size), container)
        }
        assertEquals(0f, seenGlyph!!.fill)
        assertEquals(tanrei.icon.weight, seenGlyph!!.weight)
    }

    @Test
    fun `FAB-11 each size draws the corners of its size`() {
        for (size in listOf(TanreiFabSize.Small, TanreiFabSize.Medium, TanreiFabSize.Large)) {
            val metrics = tokens.sizes[size]
            setFab(size = size, system = tanrei.withoutShadows(), icon = {})
            val container = tokens.variants.filled.enabled.containerColor.resolve(colors)
            // On the diagonal of a quarter circle of radius r, the edge is r(1 − 1/√2) in from each side: just outside
            // it is surface, just inside it is container.
            val edge = metrics.containerShape * (1f - 1f / kotlin.math.sqrt(2f))
            assertPixel("$size: outside the corner", fabPixel(edge - CORNER_DELTA, edge - CORNER_DELTA, size), surface)
            assertPixel("$size: inside the corner", fabPixel(edge + CORNER_DELTA, edge + CORNER_DELTA, size), container)
        }
        assertEquals(listOf(8.dp, 12.dp, 16.dp), listOf(tokens.sizes.small, tokens.sizes.medium, tokens.sizes.large).map { it.containerShape })
    }

    @Test
    fun `FAB-11 the square and its icon come from the system's size tokens`() {
        val system = tanrei.withoutShadows().let { it.copy(fab = it.fab.copy(sizes = it.fab.sizes.copy(medium = it.fab.sizes.medium.copy(containerSize = 56.dp, iconSize = 30.dp)))) }
        setFab(system = system, icon = probeIcon)
        fab().assertWidthIsEqualTo(56.dp).assertHeightIsEqualTo(56.dp)
        assertEquals(with(rule.density) { IntSize(30.dp.roundToPx(), 30.dp.roundToPx()) }, seenBox)
    }

    @Test
    fun `FAB-11 an icon larger than the font's optical range is drawn at its maximum`() {
        val system = tanrei.copy(fab = tokens.copy(sizes = tokens.sizes.copy(large = tokens.sizes.large.copy(containerSize = 96.dp, iconSize = 64.dp))))
        setFab(size = TanreiFabSize.Large, system = system, icon = probeIcon)
        rule.waitForIdle()
        assertEquals(tanrei.icon.opticalSizeMax, seenGlyph!!.opticalSize)
    }

    @Test
    fun `FAB-11 at 200 percent text size the FAB, its icon box and its glyph keep their size, and it keeps its name`() {
        setFab(fontScale = 2f, icon = probeIcon)
        rule.waitForIdle()
        fab().assertWidthIsEqualTo(tokens.sizes.medium.containerSize).assertHeightIsEqualTo(tokens.sizes.medium.containerSize)
        val iconPx = with(rule.density) { tokens.sizes.medium.iconSize.roundToPx() }
        assertEquals(IntSize(iconPx, iconPx), seenBox)
        val px = with(Density(rule.density.density, fontScale = 2f)) { seenStyle!!.fontSize.toPx() }
        assertEquals(iconPx.toFloat(), px, 0.5f)
        fab().assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf(LABEL)))
    }

    // ── FAB-12: the shadow, outside and unclipped, and its motion ────────────

    @Test
    fun `FAB-12 the shadow is cast outside the container without clipping it - also while the group opacity dims the FAB`() {
        val system = tanrei.withoutShadows().withFilled(TanreiInteractionState.Enabled) { it.copy(containerElevation = SOLID_SHADOW) }
            .withFilled(TanreiInteractionState.Pressed) { it.copy(containerElevation = SOLID_SHADOW) }
            .let { it.copy(fab = it.fab.copy(pressed = it.fab.pressed.copy(opacity = PRESSED_OPACITY))) }
        setFab(system = system)
        assertPixel("the whole drop below the container", belowProbe(SHADOW_DROP - HALF_DP), colors[TanreiColorRole.Error])
        assertPixel("and nothing beyond it", belowProbe(SHADOW_DROP + HALF_DP), surface)
        fab().performTouchInput { down(center) }
        rule.waitForIdle()
        assertPixel("dimmed with the FAB, not cut off", belowProbe(SHADOW_DROP - HALF_DP), colors[TanreiColorRole.Error].copy(alpha = PRESSED_OPACITY).compositeOver(surface))
        fab().performTouchInput { up() }
    }

    @Test
    fun `FAB-12 the default FAB rests on level3's shadow, below its container`() {
        setFab()
        assertTrue("level3 casts a shadow just below the FAB: ${belowProbe(2.dp)}", !isClose(belowProbe(2.dp), surface))
    }

    @Test
    fun `FAB-12 a change of state moves the colors and the elevation over the FAB's state duration and easing`() {
        val slow = 400
        val system = tanrei.withoutShadows().withFilled(TanreiInteractionState.Hovered) {
            it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Success), iconColor = TanreiPaint.Role(TanreiColorRole.Warning), containerElevation = SOLID_SHADOW)
        }.let { it.copy(fab = it.fab.copy(motionStateDuration = slow, motionStateEasing = tanrei.motion.easing.linear)) }
        setFab(system = system)
        val restingContainer = colors[TanreiColorRole.Primary]
        rule.mainClock.autoAdvance = false
        fab().performMouseInput { moveTo(center) }
        rule.mainClock.advanceTimeBy(slow / 2L)
        val container = containerProbe(fromEnd = false)
        assertTrue("the container is on its way: $container", !isClose(container, restingContainer) && !isClose(container, colors[TanreiColorRole.Success]))
        val icon = iconProbe()
        assertTrue("the icon color is on its way: $icon", !isClose(icon, colors[TanreiColorRole.OnPrimary]) && !isClose(icon, colors[TanreiColorRole.Warning]))
        // Half way the shadow has dropped half as far, at half its alpha.
        val below = belowProbe(SHADOW_DROP / 4)
        assertTrue("the shadow is on its way: $below", !isClose(below, surface) && !isClose(below, colors[TanreiColorRole.Error]))
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertContainerColor(colors[TanreiColorRole.Success])
        assertPixel("the icon", iconProbe(), colors[TanreiColorRole.Warning])
        assertPixel("the shadow", belowProbe(SHADOW_DROP / 2), colors[TanreiColorRole.Error])
    }

    // ── FAB-13: it does not position itself ──────────────────────────────────

    @Test
    fun `FAB-13 it lays out at its own size where the layout that holds it places it, and draws no scrim`() {
        var direction by mutableStateOf(LayoutDirection.Ltr)
        rule.setContent {
            CompositionLocalProvider(LocalLayoutDirection provides direction) {
                TanreiTheme(system = tanrei, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                    Box(Modifier.testTag(STAGE_TAG).size(SCREEN_W, SCREEN_H).background(TanreiColorRole.Surface.color), contentAlignment = Alignment.BottomEnd) {
                        TanreiFloatingActionButton(onClick = { clicks++ }, contentDescription = LABEL, modifier = Modifier.testTag(TAG)) { SolidIcon() }
                    }
                }
            }
        }
        val side = tokens.sizes.medium.containerSize
        val screen = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
        var bounds = fab().getUnclippedBoundsInRoot()
        assertEquals(side.value, (bounds.right - bounds.left).value, 0.5f)
        assertEquals(side.value, (bounds.bottom - bounds.top).value, 0.5f)
        assertEquals("at the inline-end bottom corner, where the Box put it", screen.right.value, bounds.right.value, 0.5f)
        assertEquals(screen.bottom.value, bounds.bottom.value, 0.5f)
        val map = rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap()
        assertPixel("no scrim: the rest of the screen is the surface", map.at(SCREEN_W / 4, SCREEN_H / 4), surface)
        // The layout decides where the inline end is; the FAB follows it.
        direction = LayoutDirection.Rtl
        rule.waitForIdle()
        bounds = fab().getUnclippedBoundsInRoot()
        assertEquals(screen.left.value, bounds.left.value, 0.5f)
    }

    // ── FAB-14: an empty label ───────────────────────────────────────────────

    @Test
    fun `FAB-14 without a contentDescription it still renders and works, and a debuggable app reports it once`() = collectingReports { reports ->
        setDebuggable(true)
        setFab(label = "")
        fab().assertWidthIsEqualTo(tokens.sizes.medium.containerSize).assertHeightIsEqualTo(tokens.sizes.medium.containerSize)
        assertPixel("the icon is drawn", iconProbe(), colors[TanreiColorRole.OnPrimary])
        fab().assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.ContentDescription))
        fab().performClick()
        rule.waitForIdle()
        assertEquals(1, clicks)
        assertEquals(reports.toString(), 1, reports.size)
        assertTrue(reports.toString(), "TanreiFloatingActionButton" in reports.single() && "contentDescription" in reports.single())
    }

    @Test
    fun `FAB-14 a release-like app reports nothing, and a named FAB reports nothing anywhere`() = collectingReports { reports ->
        setDebuggable(false)
        setFab(label = "")
        rule.waitForIdle()
        assertEquals(emptyList<String>(), reports)
        setDebuggable(true)
        setFab()
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
        variant: TanreiFabVariant,
        state: TanreiInteractionState,
        change: (TanreiFabVariantStateTokens) -> TanreiFabVariantStateTokens,
    ): TanreiSystem {
        val tokens = fab.variants[variant]
        val changed = when (state) {
            TanreiInteractionState.Enabled -> tokens.copy(enabled = change(tokens.enabled))
            TanreiInteractionState.Hovered -> tokens.copy(hovered = change(tokens.hovered))
            TanreiInteractionState.Focused -> tokens.copy(focused = change(tokens.focused))
            TanreiInteractionState.Pressed -> tokens.copy(pressed = change(tokens.pressed))
            TanreiInteractionState.Disabled -> tokens.copy(disabled = change(tokens.disabled))
        }
        return copy(fab = fab.copy(variants = fab.variants.with(variant, changed)))
    }

    private fun TanreiSystem.withFilled(state: TanreiInteractionState, change: (TanreiFabVariantStateTokens) -> TanreiFabVariantStateTokens) =
        withVariant(TanreiFabVariant.Filled, state, change)

    private fun io.github.chnotchy.tanrei.tokens.TanreiFabVariants.with(variant: TanreiFabVariant, tokens: TanreiFabVariantTokens) = when (variant) {
        TanreiFabVariant.Filled -> copy(filled = tokens)
        TanreiFabVariant.Tonal -> copy(tonal = tokens)
        TanreiFabVariant.Surface -> copy(surface = tokens)
        else -> error("not used by these tests: $variant")
    }

    /** Every state of every variant without a shadow: for tests about something else, measured to the pixel. */
    private fun TanreiSystem.withoutShadows(): TanreiSystem {
        fun TanreiFabVariantTokens.flat() = TanreiFabVariantTokens(
            enabled = enabled.copy(containerElevation = emptyList()),
            hovered = hovered.copy(containerElevation = emptyList()),
            focused = focused.copy(containerElevation = emptyList()),
            pressed = pressed.copy(containerElevation = emptyList()),
            disabled = disabled.copy(containerElevation = emptyList()),
        )
        val v = fab.variants
        return copy(fab = fab.copy(variants = v.copy(filled = v.filled.flat(), tonal = v.tonal.flat(), surface = v.surface.flat())))
    }

    private fun TanreiSystem.withoutRestingShadow(): TanreiSystem = withFilled(TanreiInteractionState.Enabled) { it.copy(containerElevation = emptyList()) }

    private fun stage(): PixelMap = rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap()

    /**
     * A pixel of the stage at [x], [y] from the top-left corner of the [size] FAB's CONTAINER (drawn [STAGE] inside the
     * stage, centered in its node when the node is the larger touch target).
     */
    private fun fabPixel(x: Dp, y: Dp, size: TanreiFabSize = TanreiFabSize.Medium): Color {
        val side = tokens.sizes[size].containerSize
        val inset = (max(side, measure.targetTouch) - side) / 2
        return stage().at(STAGE + inset + x, STAGE + inset + y)
    }

    /** A paint of the default system over the surface: what a (possibly translucent) container looks like. */
    private fun assertContainer(paint: TanreiPaint) = assertContainerColor(paint.resolve(colors).compositeOver(surface))

    private fun assertContainerColor(expected: Color) = assertPixel("container", containerProbe(fromEnd = false), expected)

    /** Inside the medium container, left (or right) of the icon, at the vertical center. */
    private fun containerProbe(fromEnd: Boolean): Color = (if (fromEnd) END_PROBE else START_PROBE).let { fabPixel(it.first, it.second) }

    private fun iconProbe(): Color = tokens.sizes.medium.containerSize.let { fabPixel(it / 2, it / 2) }

    /** [by] below the medium container's bottom edge, at its horizontal center. */
    private fun belowProbe(by: Dp): Color = tokens.sizes.medium.containerSize.let { fabPixel(it / 2, it + by) }

    /** The pixel [outside] the medium container's top edge, at its horizontal center. */
    private fun focusProbe(outside: Dp): Color = fabPixel(tokens.sizes.medium.containerSize / 2, -outside)

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
        const val TAG = "fab"
        const val UNKNOWN_TAG = "fab-unknown"
        const val STAGE_TAG = "stage"
        const val LABEL = "Create"
        const val GLYPH_NAME = "add"
        const val PIXEL_TOLERANCE = 2f / 255f
        const val MAX_RIPPLE_FRAMES = 60
        const val PRESSED_OPACITY = 0.5f
        const val COVERAGE_TOLERANCE = 0.05f
        const val COVERAGE_TOTAL_TOLERANCE = 1f
        /** Room for the level4 shadow and the focus ring around the FAB. */
        val STAGE = 72.dp
        val SCREEN_W = 200.dp
        val SCREEN_H = 160.dp
        val HALF_DP = 0.5.dp
        val CORNER_DELTA = 1.dp
        val CORNER_MARGIN = 2.dp
        val SHADOW_DROP = 6.dp
        /** Below the FAB, where level4's widest layer still darkens the surface and level3's has faded. */
        val RISE_PROBE = 24.dp
        /** A shadow that is a solid shape: the container moved [SHADOW_DROP] down, in the error color. */
        val SOLID_SHADOW = listOf(TanreiShadowLayer(x = 0.dp, y = SHADOW_DROP, blur = 0.dp, spread = 0.dp, role = TanreiColorRole.Error))
        /** Inside the medium container (48dp), clear of its 24dp icon (12–36dp), at its vertical center. */
        val START_PROBE = 6.dp to 24.dp
        val END_PROBE = 42.dp to 24.dp
    }
}

/** FAB-12 and FAB-9 where motion is reduced (the animator duration scale is 0, see `TanreiButtonReducedMotionTest`). */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiFabReducedMotionTest {
    private object NoMotion : MotionDurationScale {
        override val scaleFactor: Float = 0f
    }

    @get:Rule
    val rule = createComposeRule(effectContext = NoMotion)

    private val tanrei = TanreiSystem.Tanrei
    private val colors = tanrei.colors.light

    private fun set(system: TanreiSystem) {
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Box(Modifier.background(TanreiColorRole.Surface.color)) {
                    TanreiFloatingActionButton(onClick = {}, contentDescription = "Create", modifier = Modifier.testTag("fab")) {}
                }
            }
        }
    }

    private fun pixel(x: Dp, y: Dp): Color = with(rule.density) { rule.onNodeWithTag("fab").captureToImage().toPixelMap()[x.roundToPx(), y.roundToPx()] }

    private fun assertPixel(what: String, actual: Color, expected: Color) {
        val delta = maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue))
        assertTrue("$what: expected $expected but was $actual", delta <= 2f / 255f)
    }

    @Test
    fun `FAB-12 where motion is reduced a change of state shows at once`() {
        val slow = 400
        set(tanrei.copy(fab = tanrei.fab.copy(motionStateDuration = slow)))
        val hovered = tanrei.fab.variants.filled.hovered.containerColor.resolve(colors)
        assertNotEquals(hovered, tanrei.fab.variants.filled.enabled.containerColor.resolve(colors))
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag("fab").performMouseInput { moveTo(center) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("hovered on the next frame", pixel(6.dp, 24.dp), hovered)
    }

    @Test
    fun `FAB-9 where motion is reduced the ripple appears whole`() {
        set(tanrei.copy(behavior = tanrei.behavior.copy(pressedFeedback = TanreiPressedFeedback.Ripple)))
        val pressed = tanrei.fab.variants.filled.pressed.containerColor.resolve(colors)
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag("fab").performTouchInput { down(Offset(6.dp.toPx(), 24.dp.toPx())) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("the far side, whole at once", pixel(42.dp, 24.dp), pressed)
        rule.onNodeWithTag("fab").performTouchInput { up() }
    }
}

/** A stand-in icon: fills the icon slot with the icon color it is given. */
@Composable
private fun SolidIcon() {
    Box(Modifier.fillMaxSize().background(LocalTanreiContentColor.current))
}
