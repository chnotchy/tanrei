package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
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
import androidx.compose.ui.test.assertHasNoClickAction
import androidx.compose.ui.test.assertHeightIsEqualTo
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertWidthIsEqualTo
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.hasClickAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.accessibility.enableAccessibilityChecks
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performMouseInput
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.test.tryPerformAccessibilityChecks
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.DpSize
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
import io.github.chnotchy.tanrei.theme.LocalTanreiTextStyle
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.Cupertino
import io.github.chnotchy.tanrei.tokens.M3Like
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiCardVariant
import io.github.chnotchy.tanrei.tokens.TanreiCardVariantStateTokens
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
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
 * Behaviour tests for `specs/card.spec.json`. Each test names the behaviour id (`CRD-n`) it covers. Runs on the JVM
 * (Robolectric, native graphics) — no emulator needed.
 *
 * Most tests draw a [W] × [H] card on the surface, [STAGE] around it, whose content is [Swatch] — a square filled with
 * the content color the card hands its content, at the content's inline start — and a line of text. So "the content
 * color" is a pixel of the swatch, and "the container" a pixel in the padding at the bottom, clear of the content.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiCardTest {
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
    private val tokens = tanrei.card
    private val measure = tanrei.measure
    private val surface = colors[TanreiColorRole.Surface]

    private var clicks = 0
    private var seenContentColor: Color = Color.Unspecified

    @Before
    fun setUp() {
        // ATF checks: NOT_RUN under Robolectric (see TanreiButtonTest); they run for real in the gallery's
        // instrumented tests. The explicit semantics assertions below guard accessibility here.
        rule.enableAccessibilityChecks()
    }

    /** What [setCard] renders; changing it recomposes the one scene a test may set. */
    private class Scene(
        val variant: TanreiCardVariant,
        val interactive: Boolean,
        val enabled: Boolean,
        val inset: Boolean,
        val label: String?,
        val system: TanreiSystem,
        val direction: LayoutDirection,
        val size: DpSize?,
        val fontScale: Float,
        val content: @Composable ColumnScope.() -> Unit,
    )

    private var scene by mutableStateOf<Scene?>(null)

    /** The default content: the [Swatch] and one line of text. */
    private val swatchAndTitle: @Composable ColumnScope.() -> Unit = {
        Swatch()
        TanreiText(TITLE)
    }

    /**
     * One card on the surface, [STAGE] around it. Called again, it replaces the scene with a fresh composition of the
     * new one (a test may set content only once).
     */
    private fun setCard(
        variant: TanreiCardVariant = TanreiCardVariant.Filled,
        interactive: Boolean = true,
        enabled: Boolean = true,
        inset: Boolean = true,
        label: String? = LABEL,
        system: TanreiSystem = tanrei,
        direction: LayoutDirection = LayoutDirection.Ltr,
        size: DpSize? = DpSize(W, H),
        fontScale: Float = 1f,
        content: @Composable ColumnScope.() -> Unit = swatchAndTitle,
    ) {
        val first = scene == null
        scene = Scene(variant, interactive, enabled, inset, label, system, direction, size, fontScale, content)
        if (!first) {
            rule.waitForIdle()
            return
        }
        rule.setContent {
            val current = scene ?: return@setContent
            key(current) {
                val density = LocalDensity.current
                CompositionLocalProvider(LocalLayoutDirection provides current.direction, LocalDensity provides Density(density.density, current.fontScale)) {
                    TanreiTheme(system = current.system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                        Box(Modifier.testTag(STAGE_TAG).background(TanreiColorRole.Surface.color).padding(STAGE)) {
                            val modifier = Modifier.testTag(TAG).then(current.size?.let { Modifier.size(it) } ?: Modifier)
                            if (current.interactive) {
                                TanreiCard(
                                    onClick = { clicks++ },
                                    modifier = modifier,
                                    variant = current.variant,
                                    enabled = current.enabled,
                                    inset = current.inset,
                                    contentDescription = current.label,
                                    content = current.content,
                                )
                            } else {
                                TanreiCard(modifier = modifier, variant = current.variant, inset = current.inset, contentDescription = current.label, content = current.content)
                            }
                        }
                    }
                }
            }
        }
    }

    /** A square of the content color the card hands its content; records that color. */
    @Composable
    private fun Swatch() {
        seenContentColor = LocalTanreiContentColor.current
        Box(Modifier.testTag(SWATCH_TAG).size(SWATCH).background(LocalTanreiContentColor.current))
    }

    private fun card() = rule.onNodeWithTag(TAG)

    // ── CRD-14 / CRD-15: semantics ───────────────────────────────────────────

    @Test
    fun `CRD-14 an interactive card is one button named by its contentDescription, its content presentational, and passes accessibility checks`() {
        setCard()
        card()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf(LABEL)))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Text))
            .assertHasClickAction()
            .assertIsEnabled()
        assertEquals("the content's text is not an element of the accessibility tree", 0, rule.onAllNodesWithText(TITLE).fetchSemanticsNodes().size)
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    @Test
    fun `CRD-14 without a label the text of the content, merged in reading order, is the name, and a debuggable app reports the missing label once`() = collectingReports { reports ->
        setDebuggable(true)
        setCard(label = null, content = { TanreiText("Quarterly report"); TanreiText("Revenue grew 12%") })
        card()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Text, listOf(AnnotatedString("Quarterly report"), AnnotatedString("Revenue grew 12%"))))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.ContentDescription))
        card().performClick()
        rule.waitForIdle()
        assertEquals("it still works", 1, clicks)
        assertEquals(reports.toString(), 1, reports.size)
        assertTrue(reports.toString(), "TanreiCard" in reports.single() && "contentDescription" in reports.single())
    }

    @Test
    fun `CRD-14 a blank label is no label, a release-like app reports nothing, and a labelled card reports nothing anywhere`() = collectingReports { reports ->
        setDebuggable(false)
        setCard(label = " ")
        card().assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.ContentDescription))
        assertEquals(emptyList<String>(), reports)
        setDebuggable(true)
        setCard()
        rule.waitForIdle()
        assertEquals(emptyList<String>(), reports)
    }

    @Test
    fun `CRD-14 a card that is not interactive has no role, no name and no action, and leaves its content's semantics untouched`() = collectingReports { reports ->
        setDebuggable(true)
        setCard(interactive = false, label = null)
        card()
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Role))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.ContentDescription))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Text))
            .assertHasNoClickAction()
        rule.onNodeWithText(TITLE).assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Role))
        assertEquals("a card that is not an action needs no label", emptyList<String>(), reports)
    }

    @Test
    fun `CRD-14 with a label a card that is not interactive is a group named by it, and its content is still reached on its own`() {
        setCard(interactive = false)
        card()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf(LABEL)))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.IsTraversalGroup, true))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Role))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Text))
            .assertHasNoClickAction()
        rule.onNodeWithText(TITLE).assert(SemanticsMatcher.expectValue(SemanticsProperties.Text, listOf(AnnotatedString(TITLE))))
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    @Test
    fun `CRD-15 an interactive card is the only element exposed - its content is merged into it, with or without a label`() {
        setCard(label = null)
        val actions = rule.onAllNodes(hasClickAction()).fetchSemanticsNodes()
        assertEquals("one pressable element", 1, actions.size)
        val named = rule.onAllNodes(hasText(TITLE)).fetchSemanticsNodes()
        assertEquals("the title is part of the card, not an element of its own", 1, named.size)
        assertEquals(Role.Button, named.single().config[SemanticsProperties.Role])
        setCard()
        assertEquals(1, rule.onAllNodes(hasClickAction()).fetchSemanticsNodes().size)
        assertEquals(0, rule.onAllNodes(hasText(TITLE)).fetchSemanticsNodes().size)
    }

    // ── CRD-1: activation emits click exactly once ───────────────────────────

    @Test
    fun `CRD-1 a tap emits click exactly once`() {
        setCard()
        card().performClick()
        rule.waitForIdle()
        assertEquals(1, clicks)
    }

    @Test
    @KeyboardNavigation
    fun `CRD-1 Enter and Space each emit click exactly once`() {
        setCard()
        card().requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals(1, clicks)
        card().performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        assertEquals(2, clicks)
    }

    @Test
    fun `CRD-1 an assistive technology click emits click exactly once`() {
        setCard()
        card().performSemanticsAction(SemanticsActions.OnClick)
        rule.waitForIdle()
        assertEquals(1, clicks)
    }

    // ── CRD-2: disabled ──────────────────────────────────────────────────────

    @Test
    fun `CRD-2 a disabled card emits no click`() {
        setCard(enabled = false)
        card().performTouchInput { down(center); up() }
        rule.waitForIdle()
        assertEquals(0, clicks)
    }

    @Test
    @KeyboardNavigation
    fun `CRD-2 a disabled card is not focusable and exposes the disabled state`() {
        setCard(enabled = false)
        card()
            .assertIsNotEnabled()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Focused))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsActions.RequestFocus))
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    // ── CRD-3: the highest-precedence active state is drawn from THAT state's tokens ──

    @Test
    fun `CRD-3 pressed draws the pressed container token, and release returns to the resting token`() {
        setCard()
        card().performTouchInput { down(center) }
        rule.waitForIdle()
        assertContainer(tokens.variants.filled.pressed.containerColor)
        card().performTouchInput { up() }
        rule.waitForIdle()
        assertContainer(tokens.variants.filled.enabled.containerColor)
    }

    @Test
    fun `CRD-3 hovered draws the hovered container token - the state layer in the content color`() {
        setCard()
        card().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainer(tokens.variants.filled.hovered.containerColor)
        val base = colors[TanreiColorRole.SurfaceContainerHighest]
        assertContainerColor(colors[TanreiColorRole.OnSurface].copy(alpha = tanrei.state.hoverStateLayerOpacity).compositeOver(base))
    }

    @Test
    @KeyboardNavigation
    fun `CRD-3 keyboard focus draws the focused container token`() {
        setCard()
        card().requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertContainer(tokens.variants.filled.focused.containerColor)
    }

    @Test
    fun `CRD-3 CRD-4 a tap does not select the focused state - once the press is over the resting tokens return, and no ring shows`() {
        setCard()
        card().performTouchInput { down(center); up() }
        rule.waitForIdle()
        card().assert(SemanticsMatcher.expectValue(SemanticsProperties.Focused, false))
        assertContainer(tokens.variants.filled.enabled.containerColor)
        assertPixel("no ring", focusProbe(outerStrokeCenter(measure)), surface)
    }

    @Test
    fun `CRD-3 the content color and the outline come from the state's tokens`() {
        val system = tanrei.withCard(TanreiCardVariant.Filled, TanreiInteractionState.Hovered) {
            it.copy(contentColor = TanreiPaint.Role(TanreiColorRole.Error), outlineColor = TanreiPaint.Role(TanreiColorRole.Warning))
        }
        setCard(system = system)
        assertPixel("resting content", swatchProbe(), colors[TanreiColorRole.OnSurface])
        assertPixel("no outline at rest", topEdgeProbe(), colors[TanreiColorRole.SurfaceContainerHighest])
        card().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertPixel("hovered content", swatchProbe(), colors[TanreiColorRole.Error])
        assertEquals(colors[TanreiColorRole.Error], seenContentColor)
        assertPixel("hovered outline", topEdgeProbe(), colors[TanreiColorRole.Warning])
    }

    @Test
    fun `CRD-3 the elevation comes from the state's tokens - the default elevated card rests on a shadow and rises on hover`() {
        setCard(variant = TanreiCardVariant.Elevated)
        assertEquals(tanrei.elevation.level2, tokens.variants.elevated.enabled.containerElevation)
        assertEquals(tanrei.elevation.level3, tokens.variants.elevated.hovered.containerElevation)
        assertTrue("level2 casts a shadow just below the card at rest: ${belowProbe(1.dp)}", !isClose(belowProbe(1.dp), surface))
        assertPixel("but not far below it", belowProbe(FAR_BELOW), surface)
        card().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertTrue("level3 reaches further when hovered: ${belowProbe(FAR_BELOW)}", !isClose(belowProbe(FAR_BELOW), surface))
    }

    @Test
    fun `CRD-3 a system that gives hovered another shadow draws it`() {
        val shadow = listOf(TanreiShadowLayer(x = 0.dp, y = SHADOW_DROP, blur = 0.dp, spread = 0.dp, role = TanreiColorRole.Error))
        setCard(system = tanrei.withCard(TanreiCardVariant.Filled, TanreiInteractionState.Hovered) { it.copy(containerElevation = shadow) })
        assertPixel("nothing below at rest", belowProbe(SHADOW_DROP / 2), surface)
        card().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertPixel("the hovered shadow", belowProbe(SHADOW_DROP / 2), colors[TanreiColorRole.Error])
    }

    @Test
    fun `CRD-3 the pressed opacity token dims the whole card, content included`() {
        val opacity = 0.4f
        setCard(system = tanrei.copy(card = tokens.copy(pressed = tokens.pressed.copy(opacity = opacity))))
        card().performTouchInput { down(center) }
        rule.waitForIdle()
        val pressed = tokens.variants.filled.pressed
        val container = pressed.containerColor.resolve(colors)
        assertContainerColor(container.copy(alpha = opacity).compositeOver(surface))
        assertPixel("content", swatchProbe(), pressed.contentColor.resolve(colors).copy(alpha = opacity).compositeOver(surface))
        card().performTouchInput { up() }
    }

    @Test
    @KeyboardNavigation
    fun `CRD-3 under acme, which values hovered, focused and pressed differently - pressed wins over focused wins over hovered, in pixels`() {
        val acme = TanreiSystem.Acme
        val filled = acme.card.variants.filled
        val schemeColors = acme.colors.light
        fun over(paint: TanreiPaint) = paint.resolve(schemeColors).compositeOver(schemeColors[TanreiColorRole.Surface])
        val all = listOf(filled.enabled, filled.hovered, filled.focused, filled.pressed).map { over(it.containerColor) }
        assertEquals("acme tells the four states apart", 4, all.toSet().size)

        setCard(system = acme)
        card().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainerColor(over(filled.hovered.containerColor))
        card().requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertContainerColor(over(filled.focused.containerColor)) // hovered AND focused: focused wins
        card().performKeyInput { keyDown(Key.Enter) }
        rule.waitForIdle()
        assertContainerColor(over(filled.pressed.containerColor)) // hovered AND focused AND pressed: pressed wins
        card().performKeyInput { keyUp(Key.Enter) }
        rule.waitForIdle()
        assertContainerColor(over(filled.focused.containerColor))
        assertEquals(1, clicks)
    }

    // ── CRD-4: focus ring on keyboard focus only, never animated ─────────────

    @Test
    @KeyboardNavigation
    fun `CRD-4 keyboard focus shows the focus ring on the first frame, outside the card`() {
        setCard()
        assertPixel("no ring before focus", focusProbe(outerStrokeCenter(measure)), surface)
        rule.mainClock.autoAdvance = false
        card().requestFocus()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("ring at full color on the first frame", focusProbe(outerStrokeCenter(measure)), colors[TanreiColorRole.FocusRing])
        assertPixel("the offset leaves the surface visible", focusProbe(measure.focusOffset / 2), surface)
    }

    @Test
    fun `CRD-4 a pointer press does not show the focus ring`() {
        setCard()
        card().performTouchInput { down(center) }
        rule.waitForIdle()
        assertPixel("no ring while pressed", focusProbe(outerStrokeCenter(measure)), surface)
        card().performTouchInput { up() }
    }

    // ── CRD-5: hit area on both axes, visual size unchanged ──────────────────

    @Test
    fun `CRD-5 a card smaller than the target reserves the touch target on both axes but draws its own size`() {
        val side = SMALL
        assertTrue(side < measure.targetTouch)
        setCard(size = DpSize(side, side), content = {})
        card().assertWidthIsEqualTo(measure.targetTouch).assertHeightIsEqualTo(measure.targetTouch)
        val inset = (measure.targetTouch - side) / 2
        val container = tokens.variants.filled.enabled.containerColor.resolve(colors)
        val middle = measure.targetTouch / 2
        val map = card().captureToImage().toPixelMap()
        assertPixel("left of the card", map.at(inset - 1.dp, middle), surface)
        assertPixel("its first column", map.at(inset + 1.dp, middle), container)
        assertPixel("its last column", map.at(measure.targetTouch - inset - 1.dp, middle), container)
        assertPixel("right of the card", map.at(measure.targetTouch - inset + 1.dp, middle), surface)
        assertPixel("above", map.at(middle, inset - 1.dp), surface)
        assertPixel("below", map.at(middle, measure.targetTouch - inset + 1.dp), surface)
    }

    @Test
    fun `CRD-5 a tap in the corner of the target, outside the small card, emits click - and a large card is its own target`() {
        setCard(size = DpSize(SMALL, SMALL), content = {})
        card().performTouchInput { down(Offset(1f, 1f)); up() }
        rule.waitForIdle()
        assertEquals(1, clicks)
        setCard()
        card().assertWidthIsEqualTo(W).assertHeightIsEqualTo(H)
    }

    @Test
    fun `CRD-5 the target size comes from the system`() {
        val target = 60.dp
        setCard(size = DpSize(SMALL, SMALL), system = tanrei.copy(measure = measure.copy(targetTouch = target)), content = {})
        card().assertWidthIsEqualTo(target).assertHeightIsEqualTo(target)
    }

    // ── CRD-6: disabled is drawn from the disabled tokens of the variant ─────

    @Test
    fun `CRD-6 a disabled card keeps its resting colors and dims as a whole to the disabled opacity - its content too`() {
        setCard(variant = TanreiCardVariant.Outlined, enabled = false)
        val disabled = tokens.variants.outlined.disabled
        val opacity = tokens.disabled.opacity
        assertEquals(tanrei.state.disabledContentOpacity, opacity)
        assertEquals(tokens.variants.outlined.enabled.contentColor, disabled.contentColor)
        val container = disabled.containerColor.resolve(colors).copy(alpha = opacity).compositeOver(surface)
        assertContainerColor(container)
        assertPixel("the content, dimmed once", swatchProbe(), disabled.contentColor.resolve(colors).copy(alpha = opacity).compositeOver(surface))
        val outline = disabled.outlineColor.resolve(colors).compositeOver(disabled.containerColor.resolve(colors))
        assertPixel("the outline, dimmed", topEdgeProbe(), outline.copy(alpha = opacity).compositeOver(surface))
    }

    @Test
    fun `CRD-6 a disabled elevated card drops its shadow and keeps its ring - its edge - dimmed`() {
        setCard(variant = TanreiCardVariant.Elevated)
        assertTrue("a shadow at rest", !isClose(belowProbe(1.dp), surface))
        setCard(variant = TanreiCardVariant.Elevated, enabled = false)
        assertEquals(tanrei.elevation.level1, tokens.variants.elevated.disabled.containerElevation)
        assertPixel("no shadow when disabled", belowProbe(1.dp), surface)
        val ring = colors[tanrei.elevation.level1.single().role].compositeOver(colors[TanreiColorRole.SurfaceContainerLowest])
        assertPixel("the ring, dimmed with the card", topEdgeProbe(), ring.copy(alpha = tokens.disabled.opacity).compositeOver(surface))
    }

    @Test
    fun `CRD-6 the disabled tokens drive it, and disabled ignores hover`() {
        val opacity = 0.5f
        val system = tanrei.withCard(TanreiCardVariant.Filled, TanreiInteractionState.Disabled) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
            .let { it.copy(card = it.card.copy(disabled = it.card.disabled.copy(opacity = opacity))) }
        setCard(enabled = false, system = system)
        val expected = colors[TanreiColorRole.Error].copy(alpha = opacity).compositeOver(surface)
        assertContainerColor(expected)
        card().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainerColor(expected)
    }

    // ── CRD-7: a value the design system does not have draws as the default ──

    private fun setDefaultAndUnknown(interactive: Boolean) {
        rule.setContent {
            TanreiTheme(system = tanrei, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Column(Modifier.background(TanreiColorRole.Surface.color)) {
                    if (interactive) {
                        TanreiCard(onClick = {}, modifier = Modifier.testTag(TAG).size(W, H), contentDescription = LABEL) { Swatch() }
                        TanreiCard(onClick = { clicks++ }, modifier = Modifier.testTag(UNKNOWN_TAG).size(W, H), variant = TanreiCardVariant("ghost"), contentDescription = LABEL) { Swatch() }
                    } else {
                        TanreiCard(modifier = Modifier.testTag(TAG).size(W, H)) { Swatch() }
                        TanreiCard(modifier = Modifier.testTag(UNKNOWN_TAG).size(W, H), variant = TanreiCardVariant("ghost")) { Swatch() }
                    }
                }
            }
        }
    }

    private fun assertSamePixels() {
        val expected = card().captureToImage().toPixelMap()
        val actual = rule.onNodeWithTag(UNKNOWN_TAG).captureToImage().toPixelMap()
        assertEquals(expected.width, actual.width)
        assertEquals(expected.height, actual.height)
        for (y in 0 until expected.height) for (x in 0 until expected.width) assertEquals("pixel $x,$y", expected[x, y], actual[x, y])
    }

    @Test
    fun `CRD-7 the lookup is total - an unknown variant reads the default value's tokens, outlined`() {
        assertTrue(TanreiCardVariant("ghost") !in tokens.variants)
        assertEquals(tokens.variants.outlined, tokens.variants[TanreiCardVariant("ghost")])
        assertEquals(listOf("elevated", "filled", "outlined"), tokens.variants.keys.map { it.key })
    }

    @Test
    fun `CRD-7 in a release-like app an unknown variant renders exactly like the default, silently, and still works`() = collectingReports { reports ->
        setDebuggable(false)
        setDefaultAndUnknown(interactive = true)
        assertSamePixels()
        rule.onNodeWithTag(UNKNOWN_TAG).performClick()
        rule.waitForIdle()
        assertEquals("it still works", 1, clicks)
        assertEquals("nothing is reported outside debuggable apps", emptyList<String>(), reports)
    }

    @Test
    fun `CRD-7 a debuggable app reports the unknown variant once, for a card that is not interactive too`() = collectingReports { reports ->
        setDebuggable(true)
        setDefaultAndUnknown(interactive = false)
        assertSamePixels()
        assertEquals(reports.toString(), 1, reports.size)
        assertTrue(reports.toString(), "TanreiCard" in reports.single() && "variant \"ghost\"" in reports.single() && "\"tanrei\"" in reports.single())
    }

    @Test
    fun `CRD-7 a known variant reports nothing in a debuggable app`() = collectingReports { reports ->
        setDebuggable(true)
        setCard(variant = TanreiCardVariant.Elevated)
        rule.waitForIdle()
        assertEquals(emptyList<String>(), reports)
    }

    // ── CRD-8: pressed appears without delay and stays for press-hold ────────

    @Test
    fun `CRD-8 a tap that ends at once shows the pressed state on the next frame and keeps it for press-hold`() {
        setCard()
        val hold = tanrei.motion.duration.pressHold.toLong()
        rule.mainClock.autoAdvance = false
        card().performTouchInput { down(center); up() }
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
    fun `CRD-8 Enter and Space show the pressed state for press-hold too`() {
        val acme = TanreiSystem.Acme
        val filled = acme.card.variants.filled
        val acmeColors = acme.colors.light
        fun over(paint: TanreiPaint) = paint.resolve(acmeColors).compositeOver(acmeColors[TanreiColorRole.Surface])
        setCard(system = acme)
        card().requestFocus().assertIsFocused()
        rule.waitForIdle()
        for (key in listOf(Key.Enter, Key.Spacebar)) {
            rule.mainClock.autoAdvance = false
            card().performKeyInput { pressKey(key) }
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
    fun `CRD-8 the hold time is the system's press-hold duration`() {
        val long = 400
        setCard(system = tanrei.copy(motion = tanrei.motion.copy(duration = tanrei.motion.duration.copy(pressHold = long))))
        rule.mainClock.autoAdvance = false
        card().performTouchInput { down(center); up() }
        rule.mainClock.advanceTimeBy(long - 100L)
        assertContainer(tokens.variants.filled.pressed.containerColor)
        rule.mainClock.advanceTimeBy(100L + tokens.motionStateDuration * 2L)
        assertContainer(tokens.variants.filled.enabled.containerColor)
    }

    // ── CRD-9: pressed-feedback chooses how the press is answered ────────────

    private fun TanreiSystem.answering(feedback: TanreiPressedFeedback) = copy(behavior = behavior.copy(pressedFeedback = feedback))

    @Test
    fun `CRD-9 overlay is the default - the pressed tokens apply to the whole container at once`() {
        assertEquals(TanreiPressedFeedback.Overlay, tanrei.behavior.pressedFeedback)
        setCard()
        rule.mainClock.autoAdvance = false
        card().performTouchInput { down(NEAR.toOffset()) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        val pressed = tokens.variants.filled.pressed.containerColor.resolve(colors)
        assertPixel("at the point of contact", cardPixel(NEAR), pressed)
        assertPixel("at the far side, at once", cardPixel(FAR), pressed)
        card().performTouchInput { up() }
    }

    @Test
    fun `CRD-9 ripple - m3-like's answer - grows the pressed container color from the point of contact over feedback-duration, then fades over state-duration`() {
        assertEquals(TanreiPressedFeedback.Ripple, TanreiSystem.M3Like.behavior.pressedFeedback)
        setCard(system = tanrei.answering(TanreiPressedFeedback.Ripple))
        val resting = tokens.variants.filled.enabled.containerColor.resolve(colors)
        val pressed = tokens.variants.filled.pressed.containerColor.resolve(colors)
        rule.mainClock.autoAdvance = false
        card().performTouchInput { down(NEAR.toOffset()) }
        rule.mainClock.advanceTimeBy(50)
        assertPixel("the layer has reached the point of contact", cardPixel(NEAR), pressed)
        assertPixel("but not the far side", cardPixel(FAR), resting)
        rule.mainClock.advanceTimeBy(tokens.motionFeedbackDuration.toLong())
        assertPixel("the far side once grown", cardPixel(FAR), pressed)
        card().performTouchInput { up() }
        rule.mainClock.advanceTimeBy(tanrei.motion.duration.pressHold + tokens.motionStateDuration * 2L)
        assertPixel("faded at the point of contact", cardPixel(NEAR), resting)
        assertPixel("faded at the far side", cardPixel(FAR), resting)
    }

    @Test
    fun `CRD-9 the ripple's growth is the card's feedback-duration token`() {
        val slow = tanrei.motion.duration.long1 * 4
        val system = tanrei.answering(TanreiPressedFeedback.Ripple).let { it.copy(card = it.card.copy(motionFeedbackDuration = slow, motionStateEasing = tanrei.motion.easing.linear)) }
        setCard(system = system)
        val resting = tokens.variants.filled.enabled.containerColor.resolve(colors)
        val pressed = tokens.variants.filled.pressed.containerColor.resolve(colors)
        rule.mainClock.autoAdvance = false
        card().performTouchInput { down(NEAR.toOffset()) }
        rule.mainClock.advanceTimeBy(tanrei.motion.duration.long1.toLong())
        assertPixel("not at the far side after long1", cardPixel(FAR), resting)
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertPixel("at the far side after feedback-duration", cardPixel(FAR), pressed)
        card().performTouchInput { up() }
    }

    @Test
    @KeyboardNavigation
    fun `CRD-9 a keyboard ripple grows from the center`() {
        val acme = TanreiSystem.Acme.answering(TanreiPressedFeedback.Ripple)
        val filled = acme.card.variants.filled
        val focused = filled.focused.containerColor.resolve(acme.colors.light)
        val pressed = filled.pressed.containerColor.resolve(acme.colors.light)
        // No content: the center of the card is container too.
        setCard(system = acme, content = {})
        card().requestFocus().assertIsFocused()
        rule.waitForIdle()
        rule.mainClock.autoAdvance = false
        card().performKeyInput { keyDown(Key.Enter) }
        var frames = 0
        while (!isClose(cardPixel(W / 2 to H / 2), pressed) && frames++ < MAX_RIPPLE_FRAMES) rule.mainClock.advanceTimeByFrame()
        assertPixel("the layer reached the center first", cardPixel(W / 2 to H / 2), pressed)
        assertPixel("not the start", cardPixel(NEAR), focused)
        assertPixel("not the end", cardPixel(FAR), focused)
        card().performKeyInput { keyUp(Key.Enter) }
    }

    /**
     * Filled's pressed state differs from hovered in every part: content (error), outline (warning) and opacity; hovered
     * has a container color of its own (success), so "the state under the press" shows.
     */
    private fun TanreiSystem.pressedDiffersEverywhere(): TanreiSystem =
        withCard(TanreiCardVariant.Filled, TanreiInteractionState.Hovered) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Success)) }
            .withCard(TanreiCardVariant.Filled, TanreiInteractionState.Pressed) { it.copy(contentColor = TanreiPaint.Role(TanreiColorRole.Error), outlineColor = TanreiPaint.Role(TanreiColorRole.Warning)) }
            .let { it.copy(card = it.card.copy(pressed = it.card.pressed.copy(opacity = PRESSED_OPACITY))) }

    private fun assertOnlyTheContainerColorStays(feedback: TanreiPressedFeedback) {
        setCard(system = tanrei.answering(feedback).pressedDiffersEverywhere())
        fun dimmed(color: Color) = color.copy(alpha = PRESSED_OPACITY).compositeOver(surface)
        val hovered = colors[TanreiColorRole.Success]
        card().performMouseInput { moveTo(FAR.toOffset()) }
        rule.waitForIdle()
        assertContainerColor(hovered)
        rule.mainClock.autoAdvance = false
        card().performMouseInput { press() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("the HOVERED container color stays under the press, at the pressed opacity", cardPixel(NEAR), dimmed(hovered))
        assertPixel("the pressed content color", swatchProbe(), dimmed(colors[TanreiColorRole.Error]))
        assertPixel("the pressed outline", topEdgeProbe(), dimmed(colors[TanreiColorRole.Warning]))
        card().performMouseInput { release() }
    }

    @Test
    fun `CRD-9 under ripple only the container color stays with the state under the press - content, outline and opacity are the pressed tokens`() =
        assertOnlyTheContainerColorStays(TanreiPressedFeedback.Ripple)

    @Test
    fun `CRD-9 under dim only the container color stays with the state under the press - content, outline and opacity are the pressed tokens`() =
        assertOnlyTheContainerColorStays(TanreiPressedFeedback.Dim)

    @Test
    fun `CRD-9 dim - cupertino's answer - applies the pressed opacity to the whole card and draws no state layer`() {
        val cupertino = TanreiSystem.Cupertino
        assertEquals(TanreiPressedFeedback.Dim, cupertino.behavior.pressedFeedback)
        val cupertinoColors = cupertino.colors.light
        val opacity = cupertino.card.pressed.opacity
        assertTrue("cupertino dims a pressed card", opacity < 1f)
        val cupertinoSurface = cupertinoColors[TanreiColorRole.Surface]
        setCard(system = cupertino)
        val resting = cupertino.card.variants.filled.enabled
        card().performTouchInput { down(NEAR.toOffset()) }
        rule.waitForIdle()
        val container = resting.containerColor.resolve(cupertinoColors)
        assertPixel("the resting container, dimmed", cardPixel(FAR), container.copy(alpha = opacity).compositeOver(cupertinoSurface))
        assertPixel("the content, dimmed", swatchProbe(), cupertino.card.variants.filled.pressed.contentColor.resolve(cupertinoColors).copy(alpha = opacity).compositeOver(cupertinoSurface))
        card().performTouchInput { up() }
    }

    @Test
    fun `CRD-9 under none every part stays with the state under the press, and it still clicks`() {
        setCard(system = tanrei.answering(TanreiPressedFeedback.None).pressedDiffersEverywhere())
        card().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val hovered = stage()
        card().performMouseInput { press() }
        rule.waitForIdle()
        val pressed = stage()
        val differing = (0 until hovered.height).sumOf { y -> (0 until hovered.width).count { x -> !isClose(hovered[x, y], pressed[x, y]) } }
        assertEquals("not one pixel answers the press", 0, differing)
        card().performMouseInput { release() }
        rule.waitForIdle()
        assertEquals(1, clicks)
    }

    // ── CRD-10: corner smoothing and focus-style ─────────────────────────────

    @Test
    fun `CRD-10 at 0 the container corner is a quarter circle`() = assertCornerDrawnAs(tokens.containerShape, 0f)

    @Test
    fun `CRD-10 at 0_6 the container corner is Figma's smoothed construction - what cupertino draws`() {
        assertEquals(0.6f, TanreiSystem.Cupertino.shape.cornerSmoothing)
        assertCornerDrawnAs(tokens.containerShape * 2, 0.6f)
    }

    /**
     * The card's top-left corner box (no content) has exactly the coverage of `tanreiContainerShape(radius, smoothing)`.
     * The container is on-surface here, so a coverage is measured in 255 steps, not in the 17 between the filled
     * container and the surface.
     */
    private fun assertCornerDrawnAs(radius: Dp, smoothing: Float) {
        val system = tanrei.copy(shape = tanrei.shape.copy(cornerSmoothing = smoothing), card = tokens.copy(containerShape = radius))
            .withCard(TanreiCardVariant.Filled, TanreiInteractionState.Enabled) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.OnSurface)) }
        setCard(system = system, content = {})
        val container = colors[TanreiColorRole.OnSurface]
        val map = stage()
        with(rule.density) {
            val inset = STAGE.roundToPx()
            val width = W.roundToPx()
            val height = H.roundToPx()
            val outline = tanreiContainerShape(radius, smoothing).createOutline(Size(width.toFloat(), height.toFloat()), LayoutDirection.Ltr, this)
            val expected = ImageBitmap(width, height, ImageBitmapConfig.Argb8888)
            Canvas(expected).drawOutline(outline, Paint().apply { color = Color.Black })
            val expectedMap = expected.toPixelMap()
            val box = (radius * 2 + CORNER_MARGIN).roundToPx()
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
    fun `CRD-10 glow draws the focus colors as a soft halo under acme, where ring draws a hard line`() {
        val acme = TanreiSystem.Acme
        assertEquals(TanreiFocusStyle.Glow, acme.behavior.focusStyle)
        val acmeSurface = acme.colors.light[TanreiColorRole.Surface]
        val ring = acme.colors.light[TanreiColorRole.FocusRing]
        val m = acme.measure
        setCard(system = acme)
        card().requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertPixel("the offset stays clear", focusProbe(m.focusOffset / 2), acmeSurface)
        val inBand = focusProbe(m.focusOffset + m.focusInnerWidth + m.focusOuterWidth / 4)
        assertTrue("the halo carries the focus color: $inBand", tintOf(inBand, acmeSurface, ring) > 0.7f)
        val beyond = tintOf(focusProbe(m.focusOffset + m.focusInnerWidth + m.focusOuterWidth * 1.5f), acmeSurface, ring)
        assertTrue("soft beyond the hard edge: $beyond", beyond > 0.05f && beyond < 0.4f)
    }

    // ── CRD-11: a card that is not interactive ───────────────────────────────

    @Test
    @KeyboardNavigation
    fun `CRD-11 a card that is not interactive is not focusable and emits no click`() {
        setCard(interactive = false)
        card()
            .assertHasNoClickAction()
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Focused))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsActions.RequestFocus))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Disabled))
        card().performTouchInput { down(center); up() }
        rule.waitForIdle()
        assertEquals(0, clicks)
    }

    @Test
    fun `CRD-11 a card that is not interactive draws no hover or press answer - it stays on its resting tokens`() {
        val system = tanrei.pressedDiffersEverywhere()
        setCard(interactive = false, system = system)
        val resting = stage()
        assertContainer(tokens.variants.filled.enabled.containerColor)
        card().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertSameAs(resting, stage(), "hovered")
        card().performMouseInput { press() }
        rule.waitForIdle()
        assertSameAs(resting, stage(), "pressed")
        card().performMouseInput { release() }
    }

    @Test
    fun `CRD-11 a card that is not interactive draws its variant's resting tokens, whatever the disabled tokens say`() {
        val system = tanrei.withCard(TanreiCardVariant.Filled, TanreiInteractionState.Enabled) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Success)) }
            .withCard(TanreiCardVariant.Filled, TanreiInteractionState.Disabled) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        setCard(interactive = false, system = system)
        assertContainerColor(colors[TanreiColorRole.Success])
        assertPixel("not dimmed", swatchProbe(), colors[TanreiColorRole.OnSurface])
    }

    // ── CRD-12: inset, clipping, the outline above the content, no height of its own ──

    @Test
    fun `CRD-12 inset places the content container-padding inside the container on every side`() {
        setCard(interactive = false, size = null, label = null, content = { Box(Modifier.testTag(SWATCH_TAG).size(CONTENT)) })
        val card = card().getUnclippedBoundsInRoot()
        val content = rule.onNodeWithTag(SWATCH_TAG).getUnclippedBoundsInRoot()
        val padding = tokens.containerPadding
        assertEquals((card.left + padding).value, content.left.value, 0.5f)
        assertEquals((card.top + padding).value, content.top.value, 0.5f)
        assertEquals("no height of its own", (CONTENT.height + padding * 2).value, (card.bottom - card.top).value, 0.5f)
        assertEquals((CONTENT.width + padding * 2).value, (card.right - card.left).value, 0.5f)
    }

    @Test
    fun `CRD-12 the padding is the system's container-padding token`() {
        val padding = 24.dp
        setCard(interactive = false, size = null, label = null, system = tanrei.copy(card = tokens.copy(containerPadding = padding)), content = { Box(Modifier.testTag(SWATCH_TAG).size(CONTENT)) })
        val card = card().getUnclippedBoundsInRoot()
        val content = rule.onNodeWithTag(SWATCH_TAG).getUnclippedBoundsInRoot()
        assertEquals((card.left + padding).value, content.left.value, 0.5f)
        assertEquals((CONTENT.height + padding * 2).value, (card.bottom - card.top).value, 0.5f)
    }

    @Test
    fun `CRD-12 without inset the content reaches the container's edges`() {
        setCard(interactive = false, size = null, label = null, inset = false, content = { Box(Modifier.testTag(SWATCH_TAG).size(CONTENT)) })
        val card = card().getUnclippedBoundsInRoot()
        val content = rule.onNodeWithTag(SWATCH_TAG).getUnclippedBoundsInRoot()
        assertEquals(card.left.value, content.left.value, 0.5f)
        assertEquals(card.top.value, content.top.value, 0.5f)
        assertEquals(CONTENT.height.value, (card.bottom - card.top).value, 0.5f)
    }

    @Test
    fun `CRD-12 content that bleeds to the edges is clipped to the container's corners, and the outline is drawn above it`() {
        for (interactive in listOf(false, true)) {
            setCard(variant = TanreiCardVariant.Outlined, interactive = interactive, inset = false, content = { Box(Modifier.fillMaxSize().background(TanreiColorRole.Error.color)) })
            val error = colors[TanreiColorRole.Error]
            assertPixel("interactive=$interactive: the content fills the card", cardPixel(W / 2 to H / 2), error)
            assertPixel("interactive=$interactive: the corner is clipped", cardPixel(CORNER_PROBE to CORNER_PROBE), surface)
            assertPixel("interactive=$interactive: the outline over the content", topEdgeProbe(), colors[TanreiColorRole.OutlineVariant].compositeOver(error))
        }
    }

    @Test
    fun `CRD-12 at 200 percent text size the card grows with its text instead of clipping it`() {
        setCard(interactive = false, size = null, label = null, content = { TanreiText(LONG) })
        val normal = card().getUnclippedBoundsInRoot().let { it.bottom - it.top }
        setCard(interactive = false, size = null, label = null, fontScale = 2f, content = { TanreiText(LONG) })
        val large = card().getUnclippedBoundsInRoot().let { it.bottom - it.top }
        assertTrue("grew from $normal to $large", large > normal * 1.5f)
        val text = rule.onNodeWithText(LONG).getUnclippedBoundsInRoot()
        val card = card().getUnclippedBoundsInRoot()
        assertTrue("the text stays inside the card", text.bottom <= card.bottom - tokens.containerPadding + 0.5.dp)
    }

    // ── CRD-13: the content color ────────────────────────────────────────────

    @Test
    fun `CRD-13 the card hands its content the content color of its variant as LocalTanreiContentColor`() {
        val system = tanrei
            .withCard(TanreiCardVariant.Elevated, TanreiInteractionState.Enabled) { it.copy(contentColor = TanreiPaint.Role(TanreiColorRole.Error)) }
            .withCard(TanreiCardVariant.Filled, TanreiInteractionState.Enabled) { it.copy(contentColor = TanreiPaint.Role(TanreiColorRole.Warning)) }
            .withCard(TanreiCardVariant.Outlined, TanreiInteractionState.Enabled) { it.copy(contentColor = TanreiPaint.Role(TanreiColorRole.Success)) }
        val expected = mapOf(TanreiCardVariant.Elevated to TanreiColorRole.Error, TanreiCardVariant.Filled to TanreiColorRole.Warning, TanreiCardVariant.Outlined to TanreiColorRole.Success)
        for (interactive in listOf(false, true)) for ((variant, role) in expected) {
            setCard(variant = variant, interactive = interactive, system = system)
            rule.waitForIdle()
            assertEquals("$variant, interactive=$interactive", colors[role], seenContentColor)
            assertPixel("$variant, interactive=$interactive: text and icons drawn in it", swatchProbe(), colors[role])
        }
        // The default system: on-surface on every variant.
        setCard(variant = TanreiCardVariant.Outlined)
        rule.waitForIdle()
        assertEquals(colors[TanreiColorRole.OnSurface], seenContentColor)
    }

    @Test
    fun `CRD-13 the content color follows the state - a press hands the content the pressed content color`() {
        setCard(system = tanrei.withCard(TanreiCardVariant.Filled, TanreiInteractionState.Pressed) { it.copy(contentColor = TanreiPaint.Role(TanreiColorRole.Error)) })
        card().performTouchInput { down(center) }
        rule.waitForIdle()
        assertEquals(colors[TanreiColorRole.Error], seenContentColor)
        assertPixel("the swatch", swatchProbe(), colors[TanreiColorRole.Error])
        card().performTouchInput { up() }
    }

    @Test
    fun `CRD-13 plain text in a card takes sys-typescale-body, whatever an enclosing component asked its text to use`() {
        var seen: androidx.compose.ui.text.TextStyle? = null
        var body: androidx.compose.ui.text.TextStyle? = null
        rule.setContent {
            TanreiTheme(system = tanrei, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                body = TanreiTheme.tokens.typescale.body.toTextStyle()
                CompositionLocalProvider(LocalTanreiTextStyle provides TanreiTheme.tokens.typescale.code.toTextStyle()) {
                    TanreiCard(modifier = Modifier.testTag(TAG)) { seen = LocalTanreiTextStyle.current }
                    TanreiCard(onClick = {}, contentDescription = LABEL) {}
                }
            }
        }
        rule.waitForIdle()
        assertEquals(body, seen)
        assertNotEquals(tanrei.typescale.code, tanrei.typescale.body)
    }

    // ── CRD-16: state changes move over the state motion ─────────────────────

    @Test
    fun `CRD-16 a change of state moves the colors and the elevation over the card's state duration and easing`() {
        val slow = 400
        val shadow = listOf(TanreiShadowLayer(x = 0.dp, y = SHADOW_DROP, blur = 0.dp, spread = 0.dp, role = TanreiColorRole.Error))
        val system = tanrei.withCard(TanreiCardVariant.Filled, TanreiInteractionState.Hovered) {
            it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Success), contentColor = TanreiPaint.Role(TanreiColorRole.Warning), containerElevation = shadow)
        }.let { it.copy(card = it.card.copy(motionStateDuration = slow, motionStateEasing = tanrei.motion.easing.linear)) }
        setCard(system = system)
        val restingContainer = colors[TanreiColorRole.SurfaceContainerHighest]
        rule.mainClock.autoAdvance = false
        card().performMouseInput { moveTo(center) }
        rule.mainClock.advanceTimeBy(slow / 2L)
        val container = cardPixel(NEAR)
        assertTrue("the container is on its way: $container", !isClose(container, restingContainer) && !isClose(container, colors[TanreiColorRole.Success]))
        val content = swatchProbe()
        assertTrue("the content color is on its way: $content", !isClose(content, colors[TanreiColorRole.OnSurface]) && !isClose(content, colors[TanreiColorRole.Warning]))
        // Half way the shadow has dropped half as far, at half its alpha.
        val below = belowProbe(SHADOW_DROP / 4)
        assertTrue("the shadow is on its way: $below", !isClose(below, surface) && !isClose(below, colors[TanreiColorRole.Error]))
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertContainerColor(colors[TanreiColorRole.Success])
        assertPixel("the content", swatchProbe(), colors[TanreiColorRole.Warning])
        assertPixel("the shadow", belowProbe(SHADOW_DROP / 2), colors[TanreiColorRole.Error])
    }

    // ── CRD-17: right-to-left ────────────────────────────────────────────────

    @Test
    fun `CRD-17 right-to-left insets by logical start and end - the content starts at the right, the card itself is not mirrored`() {
        setCard(interactive = false, label = null, direction = LayoutDirection.Rtl)
        val card = card().getUnclippedBoundsInRoot()
        val swatch = rule.onNodeWithTag(SWATCH_TAG).getUnclippedBoundsInRoot()
        assertEquals((card.right - tokens.containerPadding).value, swatch.right.value, 0.5f)
        assertEquals((card.top + tokens.containerPadding).value, swatch.top.value, 0.5f)
        assertPixel("the swatch at the inline start", cardPixel((W - tokens.containerPadding - SWATCH / 2) to (tokens.containerPadding + SWATCH / 2)), colors[TanreiColorRole.OnSurface])
    }

    @Test
    fun `CRD-17 right-to-left grows the ripple from the point of contact, as left-to-right does`() {
        setCard(system = tanrei.answering(TanreiPressedFeedback.Ripple), direction = LayoutDirection.Rtl)
        val resting = tokens.variants.filled.enabled.containerColor.resolve(colors)
        val pressed = tokens.variants.filled.pressed.containerColor.resolve(colors)
        rule.mainClock.autoAdvance = false
        // FAR is on the right: the inline start in right-to-left.
        card().performTouchInput { down(FAR.toOffset()) }
        rule.mainClock.advanceTimeBy(50)
        assertPixel("the layer has reached the point of contact", cardPixel(FAR), pressed)
        assertPixel("but not the other side", cardPixel(NEAR), resting)
        card().performTouchInput { up() }
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

    private fun TanreiSystem.withCard(
        variant: TanreiCardVariant,
        state: TanreiInteractionState,
        change: (TanreiCardVariantStateTokens) -> TanreiCardVariantStateTokens,
    ): TanreiSystem {
        val tokens = card.variants[variant]
        val changed = when (state) {
            TanreiInteractionState.Enabled -> tokens.copy(enabled = change(tokens.enabled))
            TanreiInteractionState.Hovered -> tokens.copy(hovered = change(tokens.hovered))
            TanreiInteractionState.Focused -> tokens.copy(focused = change(tokens.focused))
            TanreiInteractionState.Pressed -> tokens.copy(pressed = change(tokens.pressed))
            TanreiInteractionState.Disabled -> tokens.copy(disabled = change(tokens.disabled))
        }
        val variants = when (variant) {
            TanreiCardVariant.Elevated -> card.variants.copy(elevated = changed)
            TanreiCardVariant.Filled -> card.variants.copy(filled = changed)
            TanreiCardVariant.Outlined -> card.variants.copy(outlined = changed)
            else -> error("not used by these tests: $variant")
        }
        return copy(card = card.copy(variants = variants))
    }

    private fun stage(): PixelMap = rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap()

    /** A pixel of the card, at [point] from its top-left corner (the card is drawn [STAGE] inside the stage). */
    private fun cardPixel(point: Pair<Dp, Dp>): Color = stage().at(STAGE + point.first, STAGE + point.second)

    /** A paint of the default system over the surface: what a (possibly translucent) container looks like. */
    private fun assertContainer(paint: TanreiPaint) = assertContainerColor(paint.resolve(colors).compositeOver(surface))

    private fun assertContainerColor(expected: Color) = assertPixel("container", cardPixel(NEAR), expected)

    private fun swatchProbe(): Color = cardPixel((tokens.containerPadding + SWATCH / 2) to (tokens.containerPadding + SWATCH / 2))

    /** The card's first row, at its horizontal center. */
    private fun topEdgeProbe(): Color = cardPixel(W / 2 to HALF_PIXEL)

    /** [by] below the card's bottom edge, at its horizontal center. */
    private fun belowProbe(by: Dp): Color = cardPixel(W / 2 to (H + by))

    /** The pixel [outside] the card's top edge, at its horizontal center. */
    private fun focusProbe(outside: Dp): Color = cardPixel(W / 2 to -outside)

    private fun outerStrokeCenter(m: TanreiMeasure): Dp = m.focusOffset + m.focusInnerWidth + m.focusOuterWidth / 2

    private fun Pair<Dp, Dp>.toOffset(): Offset = with(rule.density) { Offset(first.toPx(), second.toPx()) }

    private fun PixelMap.at(x: Dp, y: Dp): Color = with(rule.density) { this@at[x.roundToPx(), y.roundToPx()] }

    private fun assertSameAs(expected: PixelMap, actual: PixelMap, what: String) {
        val differing = (0 until expected.height).sumOf { y -> (0 until expected.width).count { x -> !isClose(expected[x, y], actual[x, y]) } }
        assertEquals("$what: not one pixel differs from the resting card", 0, differing)
    }

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
        const val TAG = "card"
        const val UNKNOWN_TAG = "card-unknown"
        const val STAGE_TAG = "stage"
        const val SWATCH_TAG = "swatch"
        const val LABEL = "Quarterly report"
        const val TITLE = "Revenue grew 12%"
        const val LONG = "Quarterly report. Revenue grew 12% over the previous quarter, led by the new subscriptions."
        const val PIXEL_TOLERANCE = 2f / 255f
        const val MAX_RIPPLE_FRAMES = 60
        const val PRESSED_OPACITY = 0.5f
        const val COVERAGE_TOLERANCE = 0.05f
        const val COVERAGE_TOTAL_TOLERANCE = 1f
        val W = 200.dp
        val H = 120.dp
        val SMALL = 24.dp
        val STAGE = 16.dp
        val SWATCH = 24.dp
        val CONTENT = DpSize(100.dp, 50.dp)
        val SHADOW_DROP = 6.dp
        val FAR_BELOW = 6.dp
        val HALF_PIXEL = 0.25.dp
        val CORNER_PROBE = 0.5.dp
        val CORNER_MARGIN = 2.dp

        /** In the bottom padding, clear of the content: near the inline start (LTR) and near the end. */
        val NEAR = 12.dp to (H - 8.dp)
        val FAR = (W - 12.dp) to (H - 8.dp)
    }
}

/** CRD-16 and CRD-9 where motion is reduced (the animator duration scale is 0, see `TanreiButtonReducedMotionTest`). */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiCardReducedMotionTest {
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
                    TanreiCard(onClick = {}, modifier = Modifier.testTag("card").size(200.dp, 120.dp), variant = TanreiCardVariant.Filled, contentDescription = "Quarterly report") {}
                }
            }
        }
    }

    private fun pixel(x: Dp, y: Dp): Color = with(rule.density) { rule.onNodeWithTag("card").captureToImage().toPixelMap()[x.roundToPx(), y.roundToPx()] }

    private fun assertPixel(what: String, actual: Color, expected: Color) {
        val delta = maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue))
        assertTrue("$what: expected $expected but was $actual", delta <= 2f / 255f)
    }

    @Test
    fun `CRD-16 where motion is reduced a change of state shows at once`() {
        val slow = 400
        set(tanrei.copy(card = tanrei.card.copy(motionStateDuration = slow)))
        val hovered = tanrei.card.variants.filled.hovered.containerColor.resolve(colors)
        assertNotEquals(hovered, tanrei.card.variants.filled.enabled.containerColor.resolve(colors))
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag("card").performMouseInput { moveTo(center) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("hovered on the next frame", pixel(12.dp, 112.dp), hovered)
    }

    @Test
    fun `CRD-9 where motion is reduced the ripple appears whole`() {
        set(tanrei.copy(behavior = tanrei.behavior.copy(pressedFeedback = TanreiPressedFeedback.Ripple)))
        val pressed = tanrei.card.variants.filled.pressed.containerColor.resolve(colors)
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag("card").performTouchInput { down(Offset(12.dp.toPx(), 112.dp.toPx())) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("the far side, whole at once", pixel(188.dp, 112.dp), pressed)
        rule.onNodeWithTag("card").performTouchInput { up() }
    }
}
