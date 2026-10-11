package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
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
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertHasClickAction
import androidx.compose.ui.test.assertHeightIsEqualTo
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsNotFocused
import androidx.compose.ui.test.assertWidthIsEqualTo
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.click
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.junit4.accessibility.enableAccessibilityChecks
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithContentDescription
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
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
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
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiFontFamilies
import io.github.chnotchy.tanrei.theme.TanreiIconGlyph
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.glyph
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.Cupertino
import io.github.chnotchy.tanrei.tokens.M3Like
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiChipSize
import io.github.chnotchy.tanrei.tokens.TanreiChipVariant
import io.github.chnotchy.tanrei.tokens.TanreiChipVariantStateTokens
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiFocusStyle
import io.github.chnotchy.tanrei.tokens.TanreiFontStack
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
 * Behaviour tests for `specs/chip.spec.json`. Each test names the behaviour id (`CHP-n`) it covers. Runs on the JVM
 * (Robolectric, native graphics) — no emulator needed.
 *
 * One chip is drawn on the surface with [STAGE] around it (its shadow, its focus ring and the remove action's hit area
 * beyond its edge are pixels and positions of the stage). The icon in most tests is [SolidIcon] (the icon box filled
 * with the color the slot is given). Next to the stage a hidden copy of the label is measured in the size's label
 * style ([labelWidth]), so the expected width of the row is computed from the tokens rather than written down.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiChipTest {
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
    private val tokens = tanrei.chip
    private val measure = tanrei.measure
    private val surface = colors[TanreiColorRole.Surface]

    /** Everything the chip emitted, in order: `click`, `change:true`, `remove` … */
    private val events = mutableListOf<String>()
    private val clicks get() = events.count { it == "click" }
    private val removes get() = events.count { it == "remove" }
    private var selected by mutableStateOf(false)
    private var labelWidthPx = 0
    private var labelHeightPx = 0

    @Before
    fun setUp() {
        // ATF checks: NOT_RUN under Robolectric (see TanreiButtonTest); they run for real in the gallery's
        // instrumented tests. The explicit semantics assertions below guard accessibility here.
        rule.enableAccessibilityChecks()
    }

    private enum class Kind { Action, Filter, Input }

    /** What [setChip] renders; changing it recomposes the one scene a test may set. */
    private class Scene(
        val kind: Kind,
        val variant: TanreiChipVariant,
        val size: TanreiChipSize,
        val enabled: Boolean,
        val system: TanreiSystem,
        val label: String,
        val removeLabel: String,
        val fontScale: Float,
        val direction: LayoutDirection,
        val width: Dp?,
        val fontFamilies: TanreiFontFamilies,
        val icon: (@Composable () -> Unit)?,
        val avatar: (@Composable () -> Unit)?,
    )

    private var scene by mutableStateOf<Scene?>(null)

    /**
     * One chip of [kind] on the surface, [STAGE] around it. A filter chip really toggles ([selected] starts at
     * [initiallySelected]). Called again, it replaces the scene with a fresh composition (a test may set content once).
     */
    private fun setChip(
        kind: Kind = Kind.Action,
        variant: TanreiChipVariant = TanreiChipVariant.Outlined,
        size: TanreiChipSize = TanreiChipSize.Medium,
        enabled: Boolean = true,
        initiallySelected: Boolean = false,
        system: TanreiSystem = tanrei,
        label: String = LABEL,
        removeLabel: String = REMOVE_LABEL,
        fontScale: Float = 1f,
        direction: LayoutDirection = LayoutDirection.Ltr,
        width: Dp? = null,
        fontFamilies: TanreiFontFamilies = TanreiFontFamilies.PlatformDefault,
        icon: (@Composable () -> Unit)? = { SolidIcon() },
        avatar: (@Composable () -> Unit)? = null,
    ) {
        selected = initiallySelected
        val first = scene == null
        scene = Scene(kind, variant, size, enabled, system, label, removeLabel, fontScale, direction, width, fontFamilies, icon, avatar)
        if (!first) {
            rule.waitForIdle()
            return
        }
        rule.setContent {
            val current = scene ?: return@setContent
            key(current) {
                val density = LocalDensity.current
                CompositionLocalProvider(LocalDensity provides Density(density.density, current.fontScale), LocalLayoutDirection provides current.direction) {
                    TanreiTheme(system = current.system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard, fontFamilies = current.fontFamilies) {
                        Column {
                            Box(Modifier.testTag(STAGE_TAG).background(TanreiColorRole.Surface.color).padding(STAGE)) {
                                val modifier = Modifier.testTag(TAG).then(current.width?.let { Modifier.width(it) } ?: Modifier)
                                when (current.kind) {
                                    Kind.Action -> TanreiChip(
                                        onClick = { events += "click" }, label = current.label, modifier = modifier, variant = current.variant,
                                        size = current.size, enabled = current.enabled, icon = current.icon,
                                    )
                                    Kind.Filter -> TanreiChip(
                                        selected = selected,
                                        onSelectedChange = { value -> events += "change:$value"; selected = value },
                                        label = current.label, modifier = modifier, variant = current.variant, size = current.size,
                                        enabled = current.enabled, onClick = { events += "click" }, icon = current.icon,
                                    )
                                    Kind.Input -> TanreiChip(
                                        onClick = { events += "click" }, onRemove = { events += "remove" }, label = current.label,
                                        removeContentDescription = current.removeLabel, modifier = modifier, variant = current.variant,
                                        size = current.size, enabled = current.enabled, icon = current.icon, avatar = current.avatar,
                                    )
                                }
                            }
                            // The label, measured alone in the size's label style (never drawn).
                            val style = TanreiTheme.tokens.chip.sizes[current.size].labelTypescale.toTextStyle()
                            Box(Modifier.size(0.dp).wrapContentSize(unbounded = true).alpha(0f)) {
                                TanreiText(current.label, modifier = Modifier.onSizeChanged { labelWidthPx = it.width; labelHeightPx = it.height }, style = style)
                            }
                        }
                    }
                }
            }
        }
    }

    private fun chip() = rule.onNodeWithTag(TAG)

    private fun removeAction() = rule.onNode(hasContentDescription(REMOVE_LABEL))

    private fun widthOf(): Dp = chip().getUnclippedBoundsInRoot().let { it.right - it.left }

    private fun labelWidth(): Dp = with(rule.density) { labelWidthPx.toDp() }

    // ── CHP-1 / CHP-11 / CHP-18: semantics ───────────────────────────────────

    @Test
    fun `CHP-1 an action chip is one button named by its label, with no pressed state, and passes accessibility checks`() {
        setChip()
        chip()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Text, listOf(AnnotatedString(LABEL))))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.ToggleableState))
            .assertHasClickAction()
            .assertIsEnabled()
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    @Test
    fun `CHP-14 CHP-15 the icon is decorative - a ligature drawn as text is not announced, the label is the only name`() {
        setChip(icon = { TanreiText(GLYPH_NAME) })
        chip().assert(SemanticsMatcher.expectValue(SemanticsProperties.Text, listOf(AnnotatedString(LABEL))))
    }

    // ── CHP-1: activation emits click exactly once ───────────────────────────

    @Test
    fun `CHP-1 a tap emits click exactly once`() {
        setChip()
        chip().performClick()
        rule.waitForIdle()
        assertEquals(listOf("click"), events)
    }

    @Test
    @KeyboardNavigation
    fun `CHP-1 Enter and Space each emit click exactly once`() {
        setChip()
        chip().requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals(1, clicks)
        chip().performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        assertEquals(2, clicks)
    }

    @Test
    fun `CHP-1 an assistive technology click emits click exactly once`() {
        setChip()
        chip().performSemanticsAction(SemanticsActions.OnClick)
        rule.waitForIdle()
        assertEquals(listOf("click"), events)
    }

    // ── CHP-2: disabled ──────────────────────────────────────────────────────

    @Test
    fun `CHP-2 a disabled chip emits no click, a disabled filter chip no change, a disabled input chip no remove`() {
        setChip(enabled = false)
        chip().performTouchInput { down(center); up() }
        setChip(kind = Kind.Filter, enabled = false, initiallySelected = true)
        chip().performTouchInput { down(center); up() }
        rule.waitForIdle()
        assertTrue(selected)
        chip().assert(SemanticsMatcher.expectValue(SemanticsProperties.ToggleableState, ToggleableState.On))
        setChip(kind = Kind.Input, enabled = false)
        removeAction().performTouchInput { down(center); up() }
        chip().performTouchInput { down(Offset(1f, centerY)); up() }
        rule.waitForIdle()
        assertEquals(emptyList<String>(), events)
    }

    @Test
    @KeyboardNavigation
    fun `CHP-2 a disabled chip and its remove action are not focusable and expose the disabled state`() {
        setChip(kind = Kind.Input, enabled = false)
        for (node in listOf(chip(), removeAction())) {
            node.assertIsNotEnabled()
                .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
                .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Focused))
                .assert(SemanticsMatcher.keyNotDefined(SemanticsActions.RequestFocus))
        }
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    // ── CHP-3: the highest-precedence active state is drawn from THAT state's tokens ──

    @Test
    fun `CHP-3 pressed draws the pressed container token, and release returns to the resting token`() {
        setChip()
        chip().performTouchInput { down(center) }
        rule.waitForIdle()
        assertContainer(tokens.variants.outlined.pressed.containerColor)
        chip().performTouchInput { up() }
        rule.waitForIdle()
        assertContainer(tokens.variants.outlined.enabled.containerColor)
    }

    @Test
    fun `CHP-3 hovered draws the hovered container token - the label color mixed into the transparent container`() {
        setChip()
        chip().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainer(tokens.variants.outlined.hovered.containerColor)
        assertContainerColor(colors[TanreiColorRole.OnSurface].copy(alpha = tanrei.state.hoverStateLayerOpacity).compositeOver(surface))
    }

    @Test
    @KeyboardNavigation
    fun `CHP-3 keyboard focus draws the focused container token`() {
        setChip()
        chip().requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertContainer(tokens.variants.outlined.focused.containerColor)
    }

    @Test
    fun `CHP-3 CHP-4 a tap does not select the focused state - once the press is over the resting tokens return, and no ring shows`() {
        setChip()
        chip().performTouchInput { down(center); up() }
        rule.waitForIdle()
        chip().assert(SemanticsMatcher.expectValue(SemanticsProperties.Focused, false))
        assertContainer(tokens.variants.outlined.enabled.containerColor)
        assertPixel("no ring", focusProbe(outerStrokeCenter(measure)), surface)
    }

    @Test
    fun `CHP-3 the outline, the label and the icon come from the state's tokens`() {
        val system = tanrei.withOutlined(TanreiInteractionState.Hovered) {
            it.copy(outlineColor = TanreiPaint.Role(TanreiColorRole.Error), labelColor = TanreiPaint.Role(TanreiColorRole.Warning), iconColor = TanreiPaint.Role(TanreiColorRole.Success))
        }
        setChip(system = system)
        assertPixel("resting outline", topEdgeProbe(), colors[TanreiColorRole.Outline])
        chip().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertPixel("hovered outline", topEdgeProbe(), colors[TanreiColorRole.Error])
        assertTrue("hovered label", labelShows(colors[TanreiColorRole.Warning]))
        assertPixel("hovered icon", iconProbe(), colors[TanreiColorRole.Success])
    }

    @Test
    fun `CHP-3 the pressed opacity token dims the whole chip, label and icon included`() {
        val opacity = 0.4f
        val system = tanrei.withOutlined(TanreiInteractionState.Pressed) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
            .let { it.copy(chip = it.chip.copy(pressed = it.chip.pressed.copy(opacity = opacity))) }
        setChip(system = system)
        chip().performTouchInput { down(center) }
        rule.waitForIdle()
        val pressed = system.chip.variants.outlined.pressed
        assertContainerColor(colors[TanreiColorRole.Error].copy(alpha = opacity).compositeOver(surface))
        assertPixel("icon", iconProbe(), pressed.iconColor.resolve(colors).copy(alpha = opacity).compositeOver(surface))
        chip().performTouchInput { up() }
    }

    @Test
    fun `CHP-3 CHP-24 the elevation comes from the state's tokens - the default elevated chip rests on level2 and rises to level3 on hover`() {
        val elevated = tokens.variants.elevated
        assertEquals(tanrei.elevation.level2, elevated.enabled.containerElevation)
        assertEquals(tanrei.elevation.level3, elevated.hovered.containerElevation)
        assertEquals(tanrei.elevation.level3, elevated.hovered.selectedContainerElevation)
        setChip(variant = TanreiChipVariant.Elevated)
        assertTrue("level2 casts a shadow just below the chip: ${belowProbe(1.dp)}", !isClose(belowProbe(1.dp), surface))
        val resting = belowProbe(RISE_PROBE)
        chip().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val hovered = belowProbe(RISE_PROBE)
        assertTrue("level3 reaches further when hovered: $resting at rest, $hovered hovered", resting.red - hovered.red >= 1.5f / 255f)
    }

    @Test
    @KeyboardNavigation
    fun `CHP-3 under acme, which values hovered, focused and pressed differently - pressed wins over focused wins over hovered, in pixels`() {
        val acme = TanreiSystem.Acme
        val outlined = acme.chip.variants.outlined
        val schemeColors = acme.colors.light
        fun over(paint: TanreiPaint) = paint.resolve(schemeColors).compositeOver(schemeColors[TanreiColorRole.Surface])
        val all = listOf(outlined.enabled, outlined.hovered, outlined.focused, outlined.pressed).map { over(it.containerColor) }
        assertEquals("acme tells the four states apart", 4, all.toSet().size)

        setChip(system = acme)
        chip().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainerColor(over(outlined.hovered.containerColor))
        chip().requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertContainerColor(over(outlined.focused.containerColor))
        chip().performKeyInput { keyDown(Key.Enter) }
        rule.waitForIdle()
        assertContainerColor(over(outlined.pressed.containerColor))
        chip().performKeyInput { keyUp(Key.Enter) }
        rule.waitForIdle()
        assertContainerColor(over(outlined.focused.containerColor))
        assertEquals(1, clicks)
    }

    // ── CHP-4: focus ring on keyboard focus only, never animated ─────────────

    @Test
    @KeyboardNavigation
    fun `CHP-4 keyboard focus shows the focus ring on the first frame, outside the chip`() {
        setChip()
        assertPixel("no ring before focus", focusProbe(outerStrokeCenter(measure)), surface)
        rule.mainClock.autoAdvance = false
        chip().requestFocus()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("ring at full color on the first frame", focusProbe(outerStrokeCenter(measure)), colors[TanreiColorRole.FocusRing])
        assertPixel("the offset leaves the surface visible", focusProbe(measure.focusOffset / 2), surface)
    }

    @Test
    fun `CHP-4 a pointer press does not show the focus ring`() {
        setChip()
        chip().performTouchInput { down(center) }
        rule.waitForIdle()
        assertPixel("no ring while pressed", focusProbe(outerStrokeCenter(measure)), surface)
        chip().performTouchInput { up() }
    }

    // ── CHP-5: hit area on both axes, visual size unchanged ──────────────────

    @Test
    fun `CHP-5 both sizes reserve the target's height but draw their own, and a tap above the visual chip emits click`() {
        for (size in listOf(TanreiChipSize.Small, TanreiChipSize.Medium)) {
            val height = tokens.sizes[size].containerHeight
            assertTrue(height < measure.targetTouch)
            setChip(size = size)
            chip().assertHeightIsEqualTo(measure.targetTouch)
            val inset = (measure.targetTouch - height) / 2
            val outline = colors[TanreiColorRole.Outline]
            assertPixel("$size: above the chip", stage().at(STAGE + 20.dp, STAGE + inset - HALF_DP), surface)
            assertPixel("$size: its top edge", stage().at(STAGE + 20.dp, STAGE + inset + HALF_DP), outline)
            assertPixel("$size: its bottom edge", stage().at(STAGE + 20.dp, STAGE + inset + height - HALF_DP), outline)
            assertPixel("$size: below the chip", stage().at(STAGE + 20.dp, STAGE + inset + height + HALF_DP), surface)
        }
        chip().performTouchInput { down(Offset(centerX, 1f)); up() }
        rule.waitForIdle()
        assertEquals(1, clicks)
    }

    @Test
    fun `CHP-5 the target size comes from the system`() {
        val target = 60.dp
        setChip(system = tanrei.copy(measure = measure.copy(targetTouch = target)))
        chip().assertHeightIsEqualTo(target)
    }

    // ── CHP-6: disabled is drawn from the disabled tokens ────────────────────

    @Test
    fun `CHP-6 a disabled outlined chip keeps no fill, fades its outline to on-surface 12 percent, and its label and icon to 38 percent`() {
        setChip(enabled = false)
        val disabled = tokens.variants.outlined.disabled
        assertContainerColor(surface)
        assertPixel("outline", topEdgeProbe(), disabled.outlineColor.resolve(colors).compositeOver(surface))
        assertPixel("icon", iconProbe(), disabled.iconColor.resolve(colors).compositeOver(surface))
        assertTrue("label", labelShows(disabled.labelColor.resolve(colors).compositeOver(surface)))
    }

    @Test
    fun `CHP-6 a disabled filter chip that is on draws the disabled tokens of its selection - a fill, no border`() {
        setChip(kind = Kind.Filter, enabled = false, initiallySelected = true)
        val disabled = tokens.variants.outlined.disabled
        val fill = disabled.selectedContainerColor.resolve(colors).compositeOver(surface)
        assertContainerColor(fill)
        assertPixel("no border grows", topEdgeProbe(), fill)
    }

    @Test
    fun `CHP-6 a disabled input chip's remove action keeps its round container invisible and fades its glyph, and its avatar is dimmed`() {
        var avatarSeen = false
        setChip(kind = Kind.Input, enabled = false, icon = null, avatar = { avatarSeen = true; SolidAvatar() })
        rule.waitForIdle()
        assertTrue(avatarSeen)
        val m = tokens.sizes.medium
        val glyphCenterX = widthOf() - m.containerPaddingInlineWithIcon - m.iconSize / 2
        // Just inside the round container, outside the glyph: surface — no disc.
        assertPixel("no disc behind the glyph", chipPixel(glyphCenterX, m.containerHeight / 2 - m.removeContainerSize / 2 + HALF_DP), surface)
        assertPixel("the glyph's center", chipPixel(glyphCenterX, m.containerHeight / 2), tokens.variants.outlined.disabled.removeIconColor.resolve(colors).compositeOver(surface))
        val avatarCenter = chipPixel(m.containerPaddingInlineWithAvatar + m.avatarSize / 2, m.containerHeight / 2)
        assertPixel("the avatar at the disabled content opacity", avatarCenter, AVATAR.copy(alpha = tanrei.state.disabledContentOpacity).compositeOver(surface))
    }

    @Test
    fun `CHP-6 the disabled opacity token dims the whole chip, and disabled ignores hover`() {
        val opacity = 0.5f
        val system = tanrei.withOutlined(TanreiInteractionState.Disabled) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
            .let { it.copy(chip = it.chip.copy(disabled = it.chip.disabled.copy(opacity = opacity))) }
        setChip(enabled = false, system = system)
        val expected = colors[TanreiColorRole.Error].copy(alpha = opacity).compositeOver(surface)
        assertContainerColor(expected)
        chip().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainerColor(expected)
    }

    // ── CHP-7: a value the design system does not have draws as the default ──

    private fun setDefaultAndUnknown() {
        rule.setContent {
            TanreiTheme(system = tanrei, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Column(Modifier.background(TanreiColorRole.Surface.color).padding(STAGE)) {
                    TanreiChip(onClick = {}, label = LABEL, modifier = Modifier.testTag(TAG), icon = { SolidIcon() })
                    TanreiChip(
                        onClick = { events += "click" },
                        label = LABEL,
                        modifier = Modifier.testTag(UNKNOWN_TAG),
                        variant = TanreiChipVariant("ghost"),
                        size = TanreiChipSize("huge"),
                        icon = { SolidIcon() },
                    )
                }
            }
        }
    }

    @Test
    fun `CHP-7 the lookups are total - an unknown size or variant reads the default value's tokens`() {
        assertTrue(TanreiChipSize("huge") !in tokens.sizes)
        assertTrue(TanreiChipVariant("ghost") !in tokens.variants)
        assertEquals(tokens.sizes.medium, tokens.sizes[TanreiChipSize("huge")])
        assertEquals(tokens.variants.outlined, tokens.variants[TanreiChipVariant("ghost")])
        assertEquals(listOf("small", "medium"), tokens.sizes.keys.map { it.key })
        assertEquals(listOf("outlined", "elevated"), tokens.variants.keys.map { it.key })
    }

    @Test
    fun `CHP-7 in a release-like app an unknown size and variant render exactly like the default, silently`() = collectingReports { reports ->
        setDebuggable(false)
        setDefaultAndUnknown()
        val expected = chip().captureToImage().toPixelMap()
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
    fun `CHP-7 a debuggable app reports the unknown size and variant once, and still renders the default`() = collectingReports { reports ->
        setDebuggable(true)
        setDefaultAndUnknown()
        rule.onNodeWithTag(UNKNOWN_TAG).performClick()
        rule.waitForIdle()
        assertEquals(reports.toString(), 2, reports.size)
        assertTrue(reports.toString(), reports.any { "TanreiChip" in it && "size \"huge\"" in it && "\"tanrei\"" in it })
        assertTrue(reports.toString(), reports.any { "TanreiChip" in it && "variant \"ghost\"" in it })
    }

    @Test
    fun `CHP-7 a known size and variant report nothing in a debuggable app`() = collectingReports { reports ->
        setDebuggable(true)
        setChip(variant = TanreiChipVariant.Elevated, size = TanreiChipSize.Small)
        rule.waitForIdle()
        assertEquals(emptyList<String>(), reports)
    }

    // ── CHP-8: pressed appears without delay and stays for press-hold ────────

    @Test
    fun `CHP-8 a tap that ends at once shows the pressed state on the next frame and keeps it for press-hold`() {
        setChip()
        val hold = tanrei.motion.duration.pressHold.toLong()
        rule.mainClock.autoAdvance = false
        chip().performTouchInput { down(center); up() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertContainer(tokens.variants.outlined.pressed.containerColor)
        rule.mainClock.advanceTimeBy(hold / 2)
        assertContainer(tokens.variants.outlined.pressed.containerColor)
        rule.mainClock.advanceTimeBy(hold + tokens.motionStateDuration * 2L)
        assertContainer(tokens.variants.outlined.enabled.containerColor)
        assertEquals(1, clicks)
    }

    @Test
    @KeyboardNavigation
    fun `CHP-8 Enter and Space show the pressed state for press-hold too`() {
        val acme = TanreiSystem.Acme
        val outlined = acme.chip.variants.outlined
        val acmeColors = acme.colors.light
        fun over(paint: TanreiPaint) = paint.resolve(acmeColors).compositeOver(acmeColors[TanreiColorRole.Surface])
        setChip(system = acme)
        chip().requestFocus().assertIsFocused()
        rule.waitForIdle()
        for (key in listOf(Key.Enter, Key.Spacebar)) {
            rule.mainClock.autoAdvance = false
            chip().performKeyInput { pressKey(key) }
            rule.mainClock.advanceTimeByFrame()
            rule.mainClock.advanceTimeByFrame()
            assertContainerColor(over(outlined.pressed.containerColor))
            rule.mainClock.autoAdvance = true
            rule.waitForIdle()
            assertContainerColor(over(outlined.focused.containerColor))
        }
        assertEquals(2, clicks)
    }

    @Test
    fun `CHP-8 the hold time is the system's press-hold duration`() {
        val long = 400
        setChip(system = tanrei.copy(motion = tanrei.motion.copy(duration = tanrei.motion.duration.copy(pressHold = long))))
        rule.mainClock.autoAdvance = false
        chip().performTouchInput { down(center); up() }
        rule.mainClock.advanceTimeBy(long - 100L)
        assertContainer(tokens.variants.outlined.pressed.containerColor)
        rule.mainClock.advanceTimeBy(100L + tokens.motionStateDuration * 2L)
        assertContainer(tokens.variants.outlined.enabled.containerColor)
    }

    // ── CHP-9: pressed-feedback chooses how the press is answered ────────────

    private fun TanreiSystem.answering(feedback: TanreiPressedFeedback) = copy(behavior = behavior.copy(pressedFeedback = feedback))

    @Test
    fun `CHP-9 overlay is the default - the pressed tokens apply to the whole container at once`() {
        assertEquals(TanreiPressedFeedback.Overlay, tanrei.behavior.pressedFeedback)
        setChip()
        rule.mainClock.autoAdvance = false
        chip().performTouchInput { down(nodeOffset(NEAR_X, MIDDLE_Y)) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        val pressed = tokens.variants.outlined.pressed.containerColor.resolve(colors).compositeOver(surface)
        assertPixel("at the point of contact", chipPixel(NEAR_X, MIDDLE_Y), pressed)
        assertPixel("at the far side, at once", chipPixel(widthOf() - NEAR_X, MIDDLE_Y), pressed)
    }

    @Test
    fun `CHP-9 ripple - m3-like's answer - grows the pressed container color from the point of contact over feedback-duration, then fades over state-duration`() {
        assertEquals(TanreiPressedFeedback.Ripple, TanreiSystem.M3Like.behavior.pressedFeedback)
        setChip(system = tanrei.answering(TanreiPressedFeedback.Ripple), icon = null)
        val resting = surface
        val pressed = tokens.variants.outlined.pressed.containerColor.resolve(colors).compositeOver(surface)
        val far = widthOf() - NEAR_X
        rule.mainClock.autoAdvance = false
        chip().performTouchInput { down(nodeOffset(NEAR_X, MIDDLE_Y)) }
        rule.mainClock.advanceTimeBy(50)
        assertPixel("the layer has reached the point of contact", chipPixel(NEAR_X, MIDDLE_Y), pressed)
        assertPixel("but not the far side", chipPixel(far, MIDDLE_Y), resting)
        rule.mainClock.advanceTimeBy(tokens.motionFeedbackDuration.toLong())
        assertPixel("the far side once grown", chipPixel(far, MIDDLE_Y), pressed)
        chip().performTouchInput { up() }
        rule.mainClock.advanceTimeBy(tanrei.motion.duration.pressHold + tokens.motionStateDuration * 2L)
        assertPixel("faded at the point of contact", chipPixel(NEAR_X, MIDDLE_Y), resting)
        assertPixel("faded at the far side", chipPixel(far, MIDDLE_Y), resting)
    }

    @Test
    fun `CHP-9 the ripple's growth is the chip's feedback-duration token`() {
        val slow = tanrei.motion.duration.long1 * 4
        val system = tanrei.answering(TanreiPressedFeedback.Ripple).let { it.copy(chip = it.chip.copy(motionFeedbackDuration = slow, motionStateEasing = tanrei.motion.easing.linear)) }
        setChip(system = system, icon = null)
        val pressed = tokens.variants.outlined.pressed.containerColor.resolve(colors).compositeOver(surface)
        val far = widthOf() - NEAR_X
        rule.mainClock.autoAdvance = false
        chip().performTouchInput { down(nodeOffset(NEAR_X, MIDDLE_Y)) }
        rule.mainClock.advanceTimeBy(tanrei.motion.duration.long1.toLong())
        assertPixel("not at the far side after long1", chipPixel(far, MIDDLE_Y), surface)
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertPixel("at the far side after feedback-duration", chipPixel(far, MIDDLE_Y), pressed)
        chip().performTouchInput { up() }
    }

    @Test
    @KeyboardNavigation
    fun `CHP-9 a keyboard ripple grows from the center`() {
        val acme = TanreiSystem.Acme.answering(TanreiPressedFeedback.Ripple)
        // The elevated look: its containers are opaque, so the pressed layer over the focused one IS the pressed color.
        val elevated = acme.chip.variants.elevated
        val acmeColors = acme.colors.light
        val focused = elevated.focused.containerColor.resolve(acmeColors)
        val pressed = elevated.pressed.containerColor.resolve(acmeColors)
        assertNotEquals(focused, pressed)
        setChip(system = acme, variant = TanreiChipVariant.Elevated, icon = null)
        chip().requestFocus().assertIsFocused()
        rule.waitForIdle()
        // In the top padding, clear of the label: above the center, and near either end.
        val middle = widthOf() / 2
        rule.mainClock.autoAdvance = false
        chip().performKeyInput { keyDown(Key.Enter) }
        var frames = 0
        while (!isClose(chipPixel(middle, TOP_Y), pressed) && frames++ < MAX_RIPPLE_FRAMES) rule.mainClock.advanceTimeByFrame()
        assertPixel("the layer reached the center first", chipPixel(middle, TOP_Y), pressed)
        assertPixel("not the start", chipPixel(NEAR_X, TOP_Y), focused)
        assertPixel("not the end", chipPixel(widthOf() - NEAR_X, TOP_Y), focused)
        chip().performKeyInput { keyUp(Key.Enter) }
    }

    /**
     * Outlined's pressed state differs from hovered in the outline (error), the label (warning), the opacity and the
     * shadow; hovered has a container color of its own (success), so "the state under the press" shows.
     */
    private fun TanreiSystem.pressedDiffersEverywhere(): TanreiSystem =
        withOutlined(TanreiInteractionState.Hovered) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Success)) }
            .withOutlined(TanreiInteractionState.Pressed) { it.copy(outlineColor = TanreiPaint.Role(TanreiColorRole.Error), iconColor = TanreiPaint.Role(TanreiColorRole.Warning), containerElevation = SOLID_SHADOW) }
            .let { it.copy(chip = it.chip.copy(pressed = it.chip.pressed.copy(opacity = PRESSED_OPACITY))) }

    private fun assertOnlyTheContainerColorStays(feedback: TanreiPressedFeedback) {
        setChip(system = tanrei.answering(feedback).pressedDiffersEverywhere())
        fun dimmed(color: Color) = color.copy(alpha = PRESSED_OPACITY).compositeOver(surface)
        val hovered = colors[TanreiColorRole.Success]
        chip().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainerColor(hovered)
        rule.mainClock.autoAdvance = false
        chip().performMouseInput { press() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("the HOVERED container color stays under the press, at the pressed opacity", containerProbe(), dimmed(hovered))
        assertPixel("the pressed outline", topEdgeProbe(), dimmed(colors[TanreiColorRole.Error]))
        assertPixel("the pressed icon color", iconProbe(), dimmed(colors[TanreiColorRole.Warning]))
        assertPixel("the pressed shadow", belowProbe(SHADOW_DROP / 2), dimmed(colors[TanreiColorRole.Error]))
        chip().performMouseInput { release() }
    }

    @Test
    fun `CHP-9 under ripple only the container color stays with the state under the press - outline, icon, elevation and opacity are the pressed tokens`() =
        assertOnlyTheContainerColorStays(TanreiPressedFeedback.Ripple)

    @Test
    fun `CHP-9 under dim only the container color stays with the state under the press - outline, icon, elevation and opacity are the pressed tokens`() =
        assertOnlyTheContainerColorStays(TanreiPressedFeedback.Dim)

    @Test
    fun `CHP-9 dim - cupertino's answer - applies the pressed opacity to the whole chip and draws no state layer`() {
        val cupertino = TanreiSystem.Cupertino
        assertEquals(TanreiPressedFeedback.Dim, cupertino.behavior.pressedFeedback)
        val opacity = cupertino.chip.pressed.opacity
        assertTrue("cupertino dims a press: $opacity", opacity < 1f)
        setChip(system = cupertino, variant = TanreiChipVariant.Outlined, kind = Kind.Filter, initiallySelected = true)
        val cupertinoColors = cupertino.colors.light
        val resting = cupertino.chip.variants.outlined.enabled.selectedContainerColor.resolve(cupertinoColors)
        chip().performTouchInput { down(center) }
        rule.waitForIdle()
        assertPixel("container", chipPixel(widthOf() / 2, TOP_Y), resting.copy(alpha = opacity).compositeOver(cupertinoColors[TanreiColorRole.Surface]))
        chip().performTouchInput { up() }
    }

    @Test
    fun `CHP-9 under none every part stays with the state under the press, and it still clicks`() {
        setChip(system = tanrei.answering(TanreiPressedFeedback.None).pressedDiffersEverywhere())
        chip().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val hovered = stage()
        chip().performMouseInput { press() }
        rule.waitForIdle()
        val pressed = stage()
        val differing = (0 until hovered.height).sumOf { y -> (0 until hovered.width).count { x -> !isClose(hovered[x, y], pressed[x, y]) } }
        assertEquals("not one pixel answers the press", 0, differing)
        chip().performMouseInput { release() }
        rule.waitForIdle()
        assertEquals(1, clicks)
    }

    // ── CHP-10: corner smoothing and focus-style ─────────────────────────────

    /** A filled, borderless outlined chip with a corner of [radius] at [smoothing]: its corner is pure coverage. */
    private fun roundedBy(radius: Dp, smoothing: Float) = tanrei.withOutlined(TanreiInteractionState.Enabled) {
        it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Primary), outlineColor = TanreiPaint.None)
    }.let {
        // Wide start and end paddings: the chip is wider than its touch target, and its corners hold nothing but fill.
        val sizes = it.chip.sizes.copy(medium = it.chip.sizes.medium.copy(containerPaddingInline = CORNER_ROOM))
        it.copy(shape = it.shape.copy(cornerSmoothing = smoothing), chip = it.chip.copy(containerShape = radius, sizes = sizes))
    }

    @Test
    fun `CHP-10 at 0 the container corner is a quarter circle`() = assertCornerDrawnAs(tokens.containerShape, 0f)

    @Test
    fun `CHP-10 at 0_6 the container corner is Figma's smoothed construction - what cupertino draws`() {
        assertEquals(0.6f, TanreiSystem.Cupertino.shape.cornerSmoothing)
        assertCornerDrawnAs(tokens.sizes.medium.containerHeight / 2 / 1.6f, 0.6f)
    }

    @Test
    fun `CHP-10 cupertino's chip is a capsule`() {
        val cupertino = TanreiSystem.Cupertino.chip
        for (size in cupertino.sizes.keys) assertTrue("$size", cupertino.containerShape >= cupertino.sizes[size].containerHeight / 2)
    }

    private fun assertCornerDrawnAs(radius: Dp, smoothing: Float) {
        // No label, no icon: the corner box holds nothing but the container (a debuggable app would report the name).
        setChip(system = roundedBy(radius, smoothing), label = "", icon = null)
        val container = colors[TanreiColorRole.Primary]
        val map = stage()
        with(rule.density) {
            val originX = STAGE.roundToPx()
            val originY = (STAGE + inset()).roundToPx()
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
                val delta = abs(tintOf(map[originX + x, originY + y], surface, container) - expectedMap[x, y].alpha)
                worst = maxOf(worst, delta)
                total += delta
            }
            assertTrue("smoothing $smoothing: the worst pixel is $worst off the outline's own coverage", worst <= COVERAGE_TOLERANCE)
            assertTrue("smoothing $smoothing: $total px² off the outline in total", total <= COVERAGE_TOTAL_TOLERANCE)
        }
    }

    @Test
    @KeyboardNavigation
    fun `CHP-10 glow draws the focus colors as a soft halo under acme, where ring draws a hard line`() {
        val acme = TanreiSystem.Acme
        assertEquals(TanreiFocusStyle.Glow, acme.behavior.focusStyle)
        val acmeSurface = acme.colors.light[TanreiColorRole.Surface]
        val ring = acme.colors.light[TanreiColorRole.FocusRing]
        val m = acme.measure
        setChip(system = acme)
        chip().requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertTrue("the offset stays clear", tintOf(focusProbe(m.focusOffset / 2), acmeSurface, ring) < 0.05f)
        val inBand = focusProbe(m.focusOffset + m.focusInnerWidth + m.focusOuterWidth / 4)
        assertTrue("the halo carries the focus color: $inBand", tintOf(inBand, acmeSurface, ring) > 0.7f)
        val beyond = tintOf(focusProbe(m.focusOffset + m.focusInnerWidth + m.focusOuterWidth * 1.5f), acmeSurface, ring)
        assertTrue("soft beyond the hard edge: $beyond", beyond > 0.05f && beyond < 0.4f)
    }

    // ── CHP-11: a filter chip ────────────────────────────────────────────────

    @Test
    fun `CHP-11 a filter chip emits click and then change with the opposite of selected, in that order, and exposes its on or off state`() {
        setChip(kind = Kind.Filter)
        chip()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.ToggleableState, ToggleableState.Off))
        chip().performClick()
        rule.waitForIdle()
        assertEquals(listOf("click", "change:true"), events)
        chip().assert(SemanticsMatcher.expectValue(SemanticsProperties.ToggleableState, ToggleableState.On))
        chip().performClick()
        rule.waitForIdle()
        assertEquals(listOf("click", "change:true", "click", "change:false"), events)
        chip().assert(SemanticsMatcher.expectValue(SemanticsProperties.ToggleableState, ToggleableState.Off))
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    @Test
    @KeyboardNavigation
    fun `CHP-11 Enter, Space and an assistive technology click switch a filter chip too`() {
        setChip(kind = Kind.Filter)
        chip().requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        chip().performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        chip().performSemanticsAction(SemanticsActions.OnClick)
        rule.waitForIdle()
        assertEquals(listOf("click", "change:true", "click", "change:false", "click", "change:true"), events)
    }

    @Test
    fun `CHP-11 an action or input chip has no selected parameter and exposes no pressed state`() {
        setChip(kind = Kind.Input)
        chip().assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.ToggleableState))
        removeAction().assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.ToggleableState))
    }

    // ── CHP-12: the look ─────────────────────────────────────────────────────

    @Test
    fun `CHP-12 a filter chip draws the variant's own parts when off and the selected parts when on - the default drops the outline for a fill`() {
        setChip(kind = Kind.Filter)
        assertContainerColor(surface)
        assertPixel("off: the outline", topEdgeProbe(), colors[TanreiColorRole.Outline])
        selected = true
        rule.waitForIdle()
        val on = colors[TanreiColorRole.SecondaryContainer]
        assertContainerColor(on)
        assertPixel("on: no outline, the fill to the edge", topEdgeProbe(), on)
        assertTrue("on: the selected label", labelShows(colors[TanreiColorRole.OnSecondaryContainer]))
    }

    @Test
    fun `CHP-12 a hovered filter chip that is on draws the hovered selected parts`() {
        val system = tanrei.withOutlined(TanreiInteractionState.Hovered) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error), selectedContainerColor = TanreiPaint.Role(TanreiColorRole.Success)) }
        setChip(kind = Kind.Filter, initiallySelected = true, system = system)
        chip().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainerColor(colors[TanreiColorRole.Success])
    }

    @Test
    fun `CHP-12 the elevated look has its own selected parts`() {
        setChip(kind = Kind.Filter, variant = TanreiChipVariant.Elevated, initiallySelected = false)
        assertContainerColor(tokens.variants.elevated.enabled.containerColor.resolve(colors))
        selected = true
        rule.waitForIdle()
        assertContainerColor(tokens.variants.elevated.enabled.selectedContainerColor.resolve(colors))
    }

    // ── CHP-13: the check and its motion ─────────────────────────────────────

    @Test
    fun `CHP-13 a filter chip that is on shows a check in the leading position and grows by its room, and off hides it`() {
        val m = tokens.sizes.medium
        setChip(kind = Kind.Filter, icon = null)
        rule.waitForIdle()
        val off = widthOf()
        assertEquals("off: text padding at both ends", (m.containerPaddingInline * 2 + labelWidth()).value, off.value, 0.6f)
        selected = true
        rule.waitForIdle()
        val on = widthOf()
        assertEquals("on: the glyph padding, the check and the gap", (m.containerPaddingInlineWithIcon + m.iconSize + m.containerGap + labelWidth() + m.containerPaddingInline).value, on.value, 0.6f)
        assertPixel("the check's corner, in the selected icon color", checkCornerProbe(), colors[TanreiColorRole.OnSecondaryContainer])
    }

    @Test
    fun `CHP-13 a filter chip with an icon shows the check in the icon's place, without changing its width`() {
        setChip(kind = Kind.Filter)
        rule.waitForIdle()
        val off = widthOf()
        assertPixel("the icon", iconProbe(), colors[TanreiColorRole.OnSurfaceVariant])
        selected = true
        rule.waitForIdle()
        assertEquals(off.value, widthOf().value, 0.6f)
        val fill = colors[TanreiColorRole.SecondaryContainer]
        val m = tokens.sizes.medium
        assertPixel("the icon is gone: the fill in its box's corner, clear of the check", chipPixel(m.containerPaddingInlineWithIcon + 2.dp, (m.containerHeight - m.iconSize) / 2 + 2.dp), fill)
        assertPixel("the check's corner", checkCornerProbe(), colors[TanreiColorRole.OnSecondaryContainer])
    }

    @Test
    fun `CHP-13 the width and the colors move over the selection duration and easing`() {
        val slow = 800
        val system = tanrei.let { it.copy(chip = it.chip.copy(motionSelectionDuration = slow, motionSelectionEasing = tanrei.motion.easing.linear)) }
        setChip(kind = Kind.Filter, icon = null, system = system)
        rule.waitForIdle()
        val off = widthOf()
        rule.mainClock.autoAdvance = false
        selected = true
        Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeBy(slow / 2L)
        val m = tokens.sizes.medium
        val growth = m.containerPaddingInlineWithIcon + m.iconSize + m.containerGap - m.containerPaddingInline
        val half = (widthOf() - off) / growth
        assertTrue("half way, half grown: $half", half in 0.35f..0.65f)
        val container = containerProbe()
        assertTrue("the fill is on its way: $container", !isClose(container, surface) && !isClose(container, colors[TanreiColorRole.SecondaryContainer]))
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertEquals((off + growth).value, widthOf().value, 0.6f)
        assertContainerColor(colors[TanreiColorRole.SecondaryContainer])
    }

    // ── CHP-14: the glyphs ───────────────────────────────────────────────────

    private var seenGlyph: TanreiIconGlyph? = null
    private var seenColor: Color = Color.Unspecified
    private var seenBox: IntSize = IntSize.Zero

    private val probeIcon: @Composable () -> Unit = {
        seenGlyph = LocalTanreiIconGlyph.current
        seenColor = LocalTanreiContentColor.current
        Box(Modifier.fillMaxSize().onSizeChanged { seenBox = it }.background(LocalTanreiContentColor.current))
    }

    @Test
    fun `CHP-14 the icon box is the icon size of each size, in the icon color, with the glyph of the selection`() {
        for (size in listOf(TanreiChipSize.Small, TanreiChipSize.Medium)) {
            val iconSize = tokens.sizes[size].iconSize
            setChip(size = size, icon = probeIcon)
            rule.waitForIdle()
            assertEquals("$size: the box", with(rule.density) { IntSize(iconSize.roundToPx(), iconSize.roundToPx()) }, seenBox)
            assertEquals("$size: unselected", tanrei.icon.glyph(iconSize, selected = false), seenGlyph)
            assertEquals("$size: the icon color", colors[TanreiColorRole.OnSurfaceVariant], seenColor)
        }
        setChip(kind = Kind.Filter, initiallySelected = true, icon = probeIcon)
        rule.waitForIdle()
        assertEquals("a filter chip that is on: selected", tanrei.icon.glyph(tokens.sizes.medium.iconSize, selected = true), seenGlyph)
        assertEquals("in the selected icon color", colors[TanreiColorRole.OnSecondaryContainer], seenColor)
    }

    @Test
    fun `CHP-14 the remove glyph is drawn in the remove color, centered in its box at the end`() {
        setChip(kind = Kind.Input, icon = null)
        val m = tokens.sizes.medium
        assertPixel("the cross's center", chipPixel(widthOf() - m.containerPaddingInlineWithIcon - m.iconSize / 2, m.containerHeight / 2), colors[TanreiColorRole.OnSurfaceVariant])
    }

    @Test
    fun `CHP-14 with an icon font installed the check and the remove glyph come from it, with the glyph of their selection`() {
        val asked = mutableListOf<TanreiIconGlyph>()
        val fontFamilies = object : TanreiFontFamilies {
            override fun resolve(font: TanreiFontStack): FontFamily? = null

            override fun resolveIcon(glyph: TanreiIconGlyph): FontFamily { asked += glyph; return FontFamily.Cursive }
        }
        val iconSize = tokens.sizes.medium.iconSize
        setChip(kind = Kind.Filter, initiallySelected = true, icon = null, fontFamilies = fontFamilies)
        rule.waitForIdle()
        assertTrue("the check: the selected glyph at the icon size: $asked", tanrei.icon.glyph(iconSize, selected = true) in asked)
        asked.clear()
        setChip(kind = Kind.Input, icon = null, fontFamilies = fontFamilies)
        rule.waitForIdle()
        assertTrue("the remove glyph: the unselected glyph at the icon size: $asked", tanrei.icon.glyph(iconSize, selected = false) in asked)
    }

    // ── CHP-15: the avatar ───────────────────────────────────────────────────

    @Test
    fun `CHP-15 an input chip draws its avatar in the leading position at the avatar size, clipped round and hidden from assistive technology`() {
        var box = IntSize.Zero
        setChip(kind = Kind.Input, icon = null, avatar = {
            Box(Modifier.fillMaxSize().onSizeChanged { box = it }.semantics { contentDescription = "Portrait" }) { SolidAvatar() }
        })
        rule.waitForIdle()
        val m = tokens.sizes.medium
        assertEquals(with(rule.density) { IntSize(m.avatarSize.roundToPx(), m.avatarSize.roundToPx()) }, box)
        assertPixel("the avatar's center", chipPixel(m.containerPaddingInlineWithAvatar + m.avatarSize / 2, m.containerHeight / 2), AVATAR)
        val corner = (m.containerHeight - m.avatarSize) / 2
        assertPixel("clipped round: its box's corner is the chip", chipPixel(m.containerPaddingInlineWithAvatar + 1.dp, corner + 1.dp), surface)
        rule.onAllNodesWithContentDescription("Portrait").assertCountEquals(0)
        assertEquals((m.containerPaddingInlineWithAvatar + m.avatarSize + m.containerGap + labelWidth() + m.containerGap + m.iconSize + m.containerPaddingInlineWithIcon).value, widthOf().value, 0.6f)
    }

    @Test
    fun `CHP-15 only an input chip takes an avatar - the action and filter overloads have no such parameter, so none is ever ignored`() {
        // The Compose idiom makes the ignored-and-reported case impossible to write: `avatar` exists on the input
        // overload alone. What remains to check is that the other kinds draw their icon in the leading position.
        setChip(kind = Kind.Filter)
        assertPixel("the filter chip's icon", iconProbe(), colors[TanreiColorRole.OnSurfaceVariant])
    }

    // ── CHP-16: the row ──────────────────────────────────────────────────────

    @Test
    fun `CHP-16 each end is padded for what it holds - a glyph, an avatar or the label - and the row is exactly as wide as its content`() {
        for (size in listOf(TanreiChipSize.Small, TanreiChipSize.Medium)) {
            val m = tokens.sizes[size]
            setChip(size = size)
            rule.waitForIdle()
            assertEquals("$size action with icon", (m.containerPaddingInlineWithIcon + m.iconSize + m.containerGap + labelWidth() + m.containerPaddingInline).value, widthOf().value, 0.6f)
            setChip(size = size, icon = null)
            rule.waitForIdle()
            assertEquals("$size action without icon", (m.containerPaddingInline + labelWidth() + m.containerPaddingInline).value, widthOf().value, 0.6f)
            setChip(size = size, kind = Kind.Input, icon = null)
            rule.waitForIdle()
            assertEquals("$size input", (m.containerPaddingInline + labelWidth() + m.containerGap + m.iconSize + m.containerPaddingInlineWithIcon).value, widthOf().value, 0.6f)
        }
    }

    @Test
    fun `CHP-16 the container is at least its height, the outline is outline-width wide inside the edge, and the icon starts at the glyph padding`() {
        val m = tokens.sizes.medium
        val system = tanrei.let { it.copy(chip = it.chip.copy(outlineWidth = 3.dp)) }
        setChip(system = system)
        val outline = colors[TanreiColorRole.Outline]
        assertPixel("the outline's inner row", chipPixel(widthOf() / 2, 2.5.dp), outline)
        assertPixel("inside it", chipPixel(widthOf() / 2, 3.5.dp), surface)
        assertPixel("before the icon", chipPixel(m.containerPaddingInlineWithIcon - HALF_DP, m.containerHeight / 2), surface)
        assertPixel("the icon's first column", chipPixel(m.containerPaddingInlineWithIcon + HALF_DP, m.containerHeight / 2), colors[TanreiColorRole.OnSurfaceVariant])
    }

    @Test
    fun `CHP-16 the paddings and the gap come from the system`() {
        setChip()
        rule.waitForIdle()
        val before = widthOf()
        val m = tokens.sizes.medium
        setChip(system = tanrei.let { it.copy(chip = it.chip.copy(sizes = it.chip.sizes.copy(medium = m.copy(containerGap = m.containerGap + 5.dp, containerPaddingInline = m.containerPaddingInline + 7.dp)))) })
        rule.waitForIdle()
        assertEquals((before + 12.dp).value, widthOf().value, 0.6f)
    }

    // ── CHP-17: the label ────────────────────────────────────────────────────

    @Test
    fun `CHP-17 given less width the label is cut with an ellipsis on one line, and the full label stays the name`() {
        setChip(label = LONG_LABEL, width = NARROW)
        rule.waitForIdle()
        chip().assertWidthIsEqualTo(NARROW).assertHeightIsEqualTo(measure.targetTouch)
        chip().assert(SemanticsMatcher.expectValue(SemanticsProperties.Text, listOf(AnnotatedString(LONG_LABEL))))
    }

    @Test
    fun `CHP-17 at 200 percent text size the chip grows in height, on one line`() {
        setChip(fontScale = 2f)
        rule.waitForIdle()
        val m = tokens.sizes.medium
        val container = with(rule.density) { labelHeightPx.toDp() } + m.containerPaddingBlock * 2
        assertTrue("the container grows past its height: $container", container > m.containerHeight)
        val height = chip().getUnclippedBoundsInRoot().let { it.bottom - it.top }
        assertEquals("one line of the label and padding-block, in the touch target", max(container, measure.targetTouch).value, height.value, 0.6f)
        chip().assert(SemanticsMatcher.expectValue(SemanticsProperties.Text, listOf(AnnotatedString(LABEL))))
    }

    // ── CHP-18 / CHP-19 / CHP-21 / CHP-22 / CHP-23: the input chip's remove action ──

    @Test
    fun `CHP-18 the remove action is a separate button named by removeLabel, and passes accessibility checks`() {
        setChip(kind = Kind.Input)
        removeAction()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf(REMOVE_LABEL)))
            .assertHasClickAction()
        chip().assert(SemanticsMatcher.expectValue(SemanticsProperties.Text, listOf(AnnotatedString(LABEL))))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.ContentDescription))
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    @Test
    fun `CHP-18 a tap on the remove action emits remove exactly once and no click`() {
        setChip(kind = Kind.Input)
        removeAction().performClick()
        rule.waitForIdle()
        assertEquals(listOf("remove"), events)
    }

    @Test
    @KeyboardNavigation
    fun `CHP-18 CHP-23 Tab reaches the chip, then its remove action, then leaves - Enter and Space on the remove action remove`() {
        setChipInRow(kind = Kind.Input)
        rule.onNodeWithTag(BEFORE).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        chip().assertIsFocused()
        chip().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        removeAction().assertIsFocused()
        removeAction().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        removeAction().performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        assertEquals(listOf("remove", "remove"), events)
        removeAction().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(AFTER).assertIsFocused()
    }

    @Test
    @KeyboardNavigation
    fun `CHP-23 an action chip is one tab stop and does not handle the arrow keys`() {
        setChipInRow(kind = Kind.Action)
        rule.onNodeWithTag(BEFORE).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        chip().assertIsFocused()
        for (arrow in listOf(Key.DirectionLeft, Key.DirectionRight, Key.DirectionUp, Key.DirectionDown)) {
            chip().requestFocus()
            chip().performKeyInput { pressKey(arrow) }
            rule.waitForIdle()
        }
        assertEquals("the arrows emit nothing", emptyList<String>(), events)
        chip().requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(AFTER).assertIsFocused()
    }

    @Test
    @KeyboardNavigation
    fun `CHP-19 Backspace and Delete on the focused input chip each emit remove exactly once`() {
        setChip(kind = Kind.Input)
        chip().requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Backspace) }
        rule.waitForIdle()
        assertEquals(listOf("remove"), events)
        chip().performKeyInput { pressKey(Key.Delete) }
        rule.waitForIdle()
        assertEquals(listOf("remove", "remove"), events)
    }

    @Test
    @KeyboardNavigation
    fun `CHP-19 Backspace on an action chip, or on a disabled input chip, emits nothing`() {
        setChip(kind = Kind.Action)
        chip().requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Backspace) }
        rule.waitForIdle()
        assertEquals(emptyList<String>(), events)
    }

    @Test
    @KeyboardNavigation
    fun `CHP-22 after remove the chip is still there and keeps focus - its owner removes it`() {
        setChip(kind = Kind.Input)
        chip().requestFocus().performKeyInput { pressKey(Key.Delete) }
        rule.waitForIdle()
        assertEquals(listOf("remove"), events)
        chip().assertExists().assertIsFocused()
        removeAction().requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        removeAction().assertExists().assertIsFocused()
        chip().assertIsNotFocused()
    }

    @Test
    fun `CHP-21 the remove action's hit area is at least the target on both axes around its glyph - toward the label no further than the gap, outward past the chip's edge`() {
        setChip(kind = Kind.Input, icon = null)
        rule.waitForIdle()
        val m = tokens.sizes.medium
        val bounds = removeAction().getUnclippedBoundsInRoot()
        assertTrue("at least the target wide: ${bounds.right - bounds.left}", bounds.right - bounds.left >= measure.targetTouch - 0.5.dp)
        assertTrue("at least the target high: ${bounds.bottom - bounds.top}", bounds.bottom - bounds.top >= measure.targetTouch - 0.5.dp)
        val chipBounds = chip().getUnclippedBoundsInRoot()
        val labelEnd = chipBounds.left + m.containerPaddingInline + labelWidth()
        val glyphStart = chipBounds.right - m.containerPaddingInlineWithIcon - m.iconSize
        assertTrue("toward the label no further than the gap before the glyph: starts at ${bounds.left}", bounds.left >= glyphStart - m.containerGap - 0.5.dp)
        assertTrue("never over the label: starts at ${bounds.left}, the label ends at $labelEnd", bounds.left >= labelEnd - 0.5.dp)
        assertTrue("around the glyph: ${bounds.left} … ${bounds.right} holds $glyphStart", bounds.left <= glyphStart && bounds.right >= glyphStart + m.iconSize)
        assertTrue("past the chip's edge where it must: ${bounds.right} > ${chipBounds.right}", bounds.right > chipBounds.right)
        // Taps through the whole scene: beyond the chip's end, and above the visual chip over the glyph, remove;
        // the label's end and the chip's start click the chip.
        val stage = rule.onNodeWithTag(STAGE_TAG)
        val glyphX = STAGE + widthOf() - m.containerPaddingInlineWithIcon - m.iconSize / 2
        stage.performTouchInput { click(dpOffset(STAGE + widthOf() + 4.dp, STAGE + measure.targetTouch / 2)) }
        stage.performTouchInput { click(dpOffset(glyphX, STAGE + 2.dp)) }
        rule.waitForIdle()
        assertEquals(listOf("remove", "remove"), events)
        events.clear()
        stage.performTouchInput { click(dpOffset(STAGE + m.containerPaddingInline + labelWidth() - 2.dp, STAGE + measure.targetTouch / 2)) }
        stage.performTouchInput { click(dpOffset(STAGE + 2.dp, STAGE + measure.targetTouch / 2)) }
        rule.waitForIdle()
        assertEquals(listOf("click", "click"), events)
    }

    // ── CHP-20: the remove action answers its own state ──────────────────────

    @Test
    fun `CHP-20 hovering the remove action draws its round container from the remove parts, and the chip keeps its own state`() {
        setChip(kind = Kind.Input, icon = null)
        val m = tokens.sizes.medium
        val glyphCenterX = widthOf() - m.containerPaddingInlineWithIcon - m.iconSize / 2
        val inDisc = chipPixel(glyphCenterX, m.containerHeight / 2 - m.removeContainerSize / 2 + 1.dp)
        assertPixel("no disc at rest", inDisc, surface)
        removeAction().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val hovered = tokens.variants.outlined.hovered.removeContainerColor.resolve(colors).compositeOver(surface)
        assertPixel("the hovered disc", chipPixel(glyphCenterX, m.containerHeight / 2 - m.removeContainerSize / 2 + 1.dp), hovered)
        assertContainerColor(surface)
    }

    @Test
    fun `CHP-20 pressing the remove action presses its round container only - the chip is neither pressed nor hovered`() {
        setChip(kind = Kind.Input, icon = null)
        val m = tokens.sizes.medium
        val glyphCenterX = widthOf() - m.containerPaddingInlineWithIcon - m.iconSize / 2
        removeAction().performTouchInput { down(center) }
        rule.waitForIdle()
        val pressed = tokens.variants.outlined.pressed.removeContainerColor.resolve(colors).compositeOver(surface)
        assertPixel("the pressed disc", chipPixel(glyphCenterX, m.containerHeight / 2 - m.removeContainerSize / 2 + 1.dp), pressed)
        assertContainerColor(surface)
        removeAction().performTouchInput { up() }
        rule.waitForIdle()
        assertEquals(listOf("remove"), events)
    }

    @Test
    fun `CHP-20 a mouse that rests on the remove action and presses it neither hovers nor presses the chip`() {
        setChip(kind = Kind.Input, icon = null)
        removeAction().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainerColor(surface)
        removeAction().performMouseInput { press() }
        rule.waitForIdle()
        assertContainerColor(surface)
        removeAction().performMouseInput { release() }
        rule.waitForIdle()
        assertContainerColor(surface)
        assertEquals(listOf("remove"), events)
        // Off the remove action, on the chip, the chip is hovered again. (Compose's hover detection hears the first move
        // after a button release as a plain move and enters on the next one; a real pointer sends many.)
        chip().performMouseInput { moveTo(Offset(2f, centerY)); moveTo(Offset(4f, centerY)) }
        rule.waitForIdle()
        assertContainer(tokens.variants.outlined.hovered.containerColor)
    }

    @Test
    @KeyboardNavigation
    fun `CHP-20 keyboard focus on the remove action rings its round container, not the chip`() {
        setChip(kind = Kind.Input, icon = null)
        removeAction().requestFocus().assertIsFocused()
        rule.waitForIdle()
        val m = tokens.sizes.medium
        val glyphCenterX = widthOf() - m.containerPaddingInlineWithIcon - m.iconSize / 2
        val top = m.containerHeight / 2 - m.removeContainerSize / 2
        assertPixel("the ring above the round container", chipPixel(glyphCenterX, top - outerStrokeCenter(measure)), colors[TanreiColorRole.FocusRing])
        assertPixel("no ring above the chip", focusProbe(outerStrokeCenter(measure)), surface)
        assertContainer(tokens.variants.outlined.enabled.containerColor)
    }

    @Test
    fun `CHP-20 under ripple a press of the remove action ripples inside its round container, from its center when pressed outside it`() {
        setChip(kind = Kind.Input, icon = null, system = tanrei.answering(TanreiPressedFeedback.Ripple))
        val m = tokens.sizes.medium
        val glyphCenterX = widthOf() - m.containerPaddingInlineWithIcon - m.iconSize / 2
        val pressed = tokens.variants.outlined.pressed.removeContainerColor.resolve(colors).compositeOver(surface)
        rule.mainClock.autoAdvance = false
        // Outside the round container (its hit area's far corner): the ripple starts at the container's center.
        removeAction().performTouchInput { down(Offset(width - 2f, 2f)) }
        rule.mainClock.advanceTimeBy(tokens.motionFeedbackDuration * 2L)
        assertPixel("the disc is pressed", chipPixel(glyphCenterX, m.containerHeight / 2 - m.removeContainerSize / 2 + 1.dp), pressed)
        assertPixel("outside the disc, the chip", chipPixel(glyphCenterX - m.removeContainerSize / 2 - 2.dp, 3.dp), surface)
        removeAction().performTouchInput { up() }
    }

    // ── CHP-24: state motion ─────────────────────────────────────────────────

    @Test
    fun `CHP-24 a change of state moves the colors and the elevation over the chip's state duration and easing`() {
        val slow = 400
        val system = tanrei.withOutlined(TanreiInteractionState.Hovered) {
            it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Success), iconColor = TanreiPaint.Role(TanreiColorRole.Warning), containerElevation = SOLID_SHADOW)
        }.let { it.copy(chip = it.chip.copy(motionStateDuration = slow, motionStateEasing = tanrei.motion.easing.linear)) }
        setChip(system = system)
        rule.mainClock.autoAdvance = false
        chip().performMouseInput { moveTo(center) }
        rule.mainClock.advanceTimeBy(slow / 2L)
        val container = containerProbe()
        assertTrue("the container is on its way: $container", !isClose(container, surface) && !isClose(container, colors[TanreiColorRole.Success]))
        val icon = iconProbe()
        assertTrue("the icon color is on its way: $icon", !isClose(icon, colors[TanreiColorRole.OnSurfaceVariant]) && !isClose(icon, colors[TanreiColorRole.Warning]))
        val below = belowProbe(SHADOW_DROP / 4)
        assertTrue("the shadow is on its way: $below", !isClose(below, surface) && !isClose(below, colors[TanreiColorRole.Error]))
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertContainerColor(colors[TanreiColorRole.Success])
        assertPixel("the icon", iconProbe(), colors[TanreiColorRole.Warning])
        assertPixel("the shadow", belowProbe(SHADOW_DROP / 2), colors[TanreiColorRole.Error])
    }

    // ── CHP-25: right-to-left ────────────────────────────────────────────────

    @Test
    fun `CHP-25 right-to-left mirrors the row - the icon at the right, the remove action at the left, padded by logical start and end`() {
        val m = tokens.sizes.medium
        setChip(kind = Kind.Input, direction = LayoutDirection.Rtl)
        rule.waitForIdle()
        val width = widthOf()
        assertPixel("the icon's first column from the right", chipPixel(width - m.containerPaddingInlineWithIcon - HALF_DP, m.containerHeight / 2), colors[TanreiColorRole.OnSurfaceVariant])
        assertPixel("before it, the chip", chipPixel(width - m.containerPaddingInlineWithIcon + HALF_DP, m.containerHeight / 2), surface)
        assertPixel("the remove glyph at the left", chipPixel(m.containerPaddingInlineWithIcon + m.iconSize / 2, m.containerHeight / 2), colors[TanreiColorRole.OnSurfaceVariant])
        val remove = removeAction().getUnclippedBoundsInRoot()
        val chipBounds = chip().getUnclippedBoundsInRoot()
        assertTrue("the remove action's hit area is at the left: $remove in $chipBounds", remove.left < chipBounds.left + 1.dp)
    }

    @Test
    fun `CHP-25 right-to-left grows the ripple from the point of contact, as left-to-right does`() {
        setChip(system = tanrei.answering(TanreiPressedFeedback.Ripple), direction = LayoutDirection.Rtl, icon = null)
        val pressed = tokens.variants.outlined.pressed.containerColor.resolve(colors).compositeOver(surface)
        val right = widthOf() - NEAR_X
        rule.mainClock.autoAdvance = false
        chip().performTouchInput { down(nodeOffset(right, MIDDLE_Y)) }
        rule.mainClock.advanceTimeBy(50)
        assertPixel("the layer has reached the point of contact", chipPixel(right, MIDDLE_Y), pressed)
        assertPixel("but not the other side", chipPixel(NEAR_X, MIDDLE_Y), surface)
        chip().performTouchInput { up() }
    }

    // ── CHP-26: empty names ──────────────────────────────────────────────────

    @Test
    fun `CHP-26 without a label it still renders and works, and a debuggable app reports it once`() = collectingReports { reports ->
        setDebuggable(true)
        setChip(label = "")
        chip().assertHeightIsEqualTo(measure.targetTouch)
        assertPixel("the icon is drawn", iconProbe(), colors[TanreiColorRole.OnSurfaceVariant])
        chip().performClick()
        rule.waitForIdle()
        assertEquals(1, clicks)
        assertEquals(reports.toString(), 1, reports.size)
        assertTrue(reports.toString(), "TanreiChip" in reports.single() && "label" in reports.single())
    }

    @Test
    fun `CHP-26 an input chip without a removeLabel reports its remove action once, and still removes`() = collectingReports { reports ->
        setDebuggable(true)
        setChip(kind = Kind.Input, removeLabel = "")
        rule.waitForIdle()
        assertEquals(reports.toString(), 1, reports.size)
        assertTrue(reports.toString(), "removeContentDescription" in reports.single())
    }

    @Test
    fun `CHP-26 a release-like app reports nothing, and a named chip reports nothing anywhere`() = collectingReports { reports ->
        setDebuggable(false)
        setChip(kind = Kind.Input, label = "", removeLabel = "")
        rule.waitForIdle()
        assertEquals(emptyList<String>(), reports)
        setDebuggable(true)
        setChip(kind = Kind.Input)
        rule.waitForIdle()
        assertEquals(emptyList<String>(), reports)
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    /** A focusable box, the chip, and another focusable box, in a row: for Tab order. */
    private fun setChipInRow(kind: Kind) {
        rule.setContent {
            TanreiTheme(system = tanrei, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Row(Modifier.background(TanreiColorRole.Surface.color)) {
                    Box(Modifier.testTag(BEFORE).size(24.dp).focusable())
                    if (kind == Kind.Input) {
                        TanreiChip(onClick = { events += "click" }, onRemove = { events += "remove" }, label = LABEL, removeContentDescription = REMOVE_LABEL, modifier = Modifier.testTag(TAG))
                    } else {
                        TanreiChip(onClick = { events += "click" }, label = LABEL, modifier = Modifier.testTag(TAG))
                    }
                    Box(Modifier.testTag(AFTER).size(24.dp).focusable())
                }
            }
        }
    }

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

    private fun TanreiSystem.withOutlined(state: TanreiInteractionState, change: (TanreiChipVariantStateTokens) -> TanreiChipVariantStateTokens): TanreiSystem {
        val tokens = chip.variants.outlined
        val changed = when (state) {
            TanreiInteractionState.Enabled -> tokens.copy(enabled = change(tokens.enabled))
            TanreiInteractionState.Hovered -> tokens.copy(hovered = change(tokens.hovered))
            TanreiInteractionState.Focused -> tokens.copy(focused = change(tokens.focused))
            TanreiInteractionState.Pressed -> tokens.copy(pressed = change(tokens.pressed))
            TanreiInteractionState.Disabled -> tokens.copy(disabled = change(tokens.disabled))
        }
        return copy(chip = chip.copy(variants = chip.variants.copy(outlined = changed)))
    }

    private fun stage(): PixelMap = rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap()

    /** How far the medium container sits below the top of its node (the touch target is taller). */
    private fun inset(): Dp = (max(tokens.sizes.medium.containerHeight, measure.targetTouch) - tokens.sizes.medium.containerHeight) / 2

    /** A pixel of the stage at [x], [y] from the top-left corner of the medium chip's container. */
    private fun chipPixel(x: Dp, y: Dp): Color = stage().at(STAGE + x, STAGE + inset() + y)

    /** [x], [y] in the medium container, as an offset in the chip node (for touch input). */
    private fun nodeOffset(x: Dp, y: Dp): Offset = with(rule.density) { Offset(x.toPx(), (inset() + y).toPx()) }

    private fun dpOffset(x: Dp, y: Dp): Offset = with(rule.density) { Offset(x.toPx(), y.toPx()) }

    /** A paint of the default system over the surface: what a (possibly translucent) container looks like. */
    private fun assertContainer(paint: TanreiPaint) = assertContainerColor(paint.resolve(colors).compositeOver(surface))

    private fun assertContainerColor(expected: Color) = assertPixel("container", containerProbe(), expected)

    /** In the start padding (before the icon), at the vertical center: container, not outline, not content. */
    private fun containerProbe(): Color = chipPixel(NEAR_X, MIDDLE_Y)

    /** The center of the medium icon box. */
    private fun iconProbe(): Color = tokens.sizes.medium.let { chipPixel(it.containerPaddingInlineWithIcon + it.iconSize / 2, it.containerHeight / 2) }

    /** On the check's corner (the checkbox's mark geometry: 0.4, 0.7 of the icon box), where its stroke is solid. */
    private fun checkCornerProbe(): Color = tokens.sizes.medium.let {
        chipPixel(it.containerPaddingInlineWithIcon + it.iconSize * 0.4f, (it.containerHeight - it.iconSize) / 2 + it.iconSize * 0.7f - 0.5.dp)
    }

    /** The medium container's top edge (the outline), at its horizontal center. */
    private fun topEdgeProbe(): Color = chipPixel(widthOf() / 2, HALF_DP)

    /** [by] below the medium container's bottom edge, at its horizontal center. */
    private fun belowProbe(by: Dp): Color = chipPixel(widthOf() / 2, tokens.sizes.medium.containerHeight + by)

    /** The pixel [outside] the container's top edge, at its horizontal center. */
    private fun focusProbe(outside: Dp): Color = chipPixel(widthOf() / 2, -outside)

    /** Whether some pixel of the label's part of the medium row, along its middle rows, is [expected]. */
    private fun labelShows(expected: Color): Boolean {
        val m = tokens.sizes.medium
        val map = stage()
        return with(rule.density) {
            val x0 = (STAGE + m.containerPaddingInlineWithIcon + m.iconSize + m.containerGap).roundToPx()
            val x1 = (STAGE + widthOf() - m.containerPaddingInline).roundToPx()
            val y0 = (STAGE + inset() + m.containerHeight / 2 - 5.dp).roundToPx()
            val y1 = (STAGE + inset() + m.containerHeight / 2 + 5.dp).roundToPx()
            (y0 until y1).any { y -> (x0 until x1).any { x -> isClose(map[x, y], expected) } }
        }
    }

    private fun outerStrokeCenter(m: TanreiMeasure): Dp = m.focusOffset + m.focusInnerWidth + m.focusOuterWidth / 2

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
        const val TAG = "chip"
        const val UNKNOWN_TAG = "chip-unknown"
        const val STAGE_TAG = "stage"
        const val BEFORE = "before"
        const val AFTER = "after"
        const val LABEL = "Vegetarian"
        const val LONG_LABEL = "Vegetarian dishes only, please"
        const val REMOVE_LABEL = "Remove Vegetarian"
        const val GLYPH_NAME = "event"
        const val PIXEL_TOLERANCE = 2f / 255f
        const val MAX_RIPPLE_FRAMES = 60
        const val PRESSED_OPACITY = 0.5f
        const val COVERAGE_TOLERANCE = 0.05f
        const val COVERAGE_TOTAL_TOLERANCE = 1f
        /** Room for the level3 shadow, the focus ring and the remove action's hit area beyond the chip's edge. */
        val STAGE = 32.dp
        val NARROW = 100.dp
        val HALF_DP = 0.5.dp
        val CORNER_MARGIN = 2.dp
        val CORNER_ROOM = 40.dp
        val SHADOW_DROP = 4.dp
        val RISE_PROBE = 12.dp
        /** In the medium chip's start padding (0–8dp with an icon, 0–12dp without), at its vertical center. */
        val NEAR_X = 4.dp
        val MIDDLE_Y = 16.dp
        /** In the top padding of the medium chip, above the label. */
        val TOP_Y = 3.dp
        val SOLID_SHADOW = listOf(TanreiShadowLayer(x = 0.dp, y = SHADOW_DROP, blur = 0.dp, spread = 0.dp, role = TanreiColorRole.Error))
        /** What [SolidAvatar] fills its box with. */
        val AVATAR = Color(0xFF3366CC)
    }
}

/** CHP-24, CHP-13 and CHP-9 where motion is reduced (the animator duration scale is 0). */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiChipReducedMotionTest {
    private object NoMotion : MotionDurationScale {
        override val scaleFactor: Float = 0f
    }

    @get:Rule
    val rule = createComposeRule(effectContext = NoMotion)

    private val tanrei = TanreiSystem.Tanrei
    private val colors = tanrei.colors.light
    private var selected by mutableStateOf(false)

    private fun set(system: TanreiSystem) {
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Box(Modifier.background(TanreiColorRole.Surface.color)) {
                    TanreiChip(selected = selected, onSelectedChange = { selected = it }, label = "Vegetarian", modifier = Modifier.testTag("chip"))
                }
            }
        }
    }

    /** At [x], [y] of the medium container, which sits 8dp into its 48dp node. */
    private fun pixel(x: Dp, y: Dp): Color = with(rule.density) { rule.onNodeWithTag("chip").captureToImage().toPixelMap()[x.roundToPx(), (y + 8.dp).roundToPx()] }

    private fun assertPixel(what: String, actual: Color, expected: Color) {
        val delta = maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue))
        assertTrue("$what: expected $expected but was $actual", delta <= 2f / 255f)
    }

    @Test
    fun `CHP-24 where motion is reduced a change of state shows at once`() {
        set(tanrei.copy(chip = tanrei.chip.copy(motionStateDuration = 400)))
        val hovered = tanrei.chip.variants.outlined.hovered.containerColor.resolve(colors).compositeOver(colors[TanreiColorRole.Surface])
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag("chip").performMouseInput { moveTo(center) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("hovered on the next frame", pixel(4.dp, 16.dp), hovered)
    }

    @Test
    fun `CHP-13 where motion is reduced the new condition shows at once - the check, the width and the fill`() {
        set(tanrei.copy(chip = tanrei.chip.copy(motionSelectionDuration = 800)))
        rule.waitForIdle()
        val off = rule.onNodeWithTag("chip").getUnclippedBoundsInRoot().let { it.right - it.left }
        rule.mainClock.autoAdvance = false
        selected = true
        Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        val m = tanrei.chip.sizes.medium
        val on = rule.onNodeWithTag("chip").getUnclippedBoundsInRoot().let { it.right - it.left }
        assertEquals((off + m.containerPaddingInlineWithIcon + m.iconSize + m.containerGap - m.containerPaddingInline).value, on.value, 0.6f)
        assertPixel("the fill", pixel(2.dp, 16.dp), colors[TanreiColorRole.SecondaryContainer])
    }

    @Test
    fun `CHP-9 where motion is reduced the ripple appears whole`() {
        set(tanrei.copy(behavior = tanrei.behavior.copy(pressedFeedback = TanreiPressedFeedback.Ripple)))
        val pressed = tanrei.chip.variants.outlined.pressed.containerColor.resolve(colors).compositeOver(colors[TanreiColorRole.Surface])
        val width = rule.onNodeWithTag("chip").getUnclippedBoundsInRoot().let { it.right - it.left }
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag("chip").performTouchInput { down(Offset(4.dp.toPx(), 24.dp.toPx())) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("the far side, whole at once", pixel(width - 4.dp, 16.dp), pressed)
        rule.onNodeWithTag("chip").performTouchInput { up() }
    }
}

/** A stand-in icon: fills the icon slot with the icon color it is given. */
@Composable
private fun SolidIcon() {
    Box(Modifier.fillMaxSize().background(LocalTanreiContentColor.current))
}

/** A stand-in avatar: one flat color filling the avatar box. */
@Composable
private fun SolidAvatar() {
    Box(Modifier.fillMaxSize().background(Color(0xFF3366CC)))
}
