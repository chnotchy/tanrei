package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.MotionDurationScale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PixelMap
import androidx.compose.ui.graphics.compositeOver
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
import androidx.compose.ui.test.SemanticsNodeInteraction
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.hasClickAction
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.isPopup
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performMouseInput
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.DpRect
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
import io.github.chnotchy.tanrei.tokens.Cupertino
import io.github.chnotchy.tanrei.tokens.M3Like
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiFocusStyle
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiPressedFeedback
import io.github.chnotchy.tanrei.tokens.TanreiShadowLayer
import io.github.chnotchy.tanrei.tokens.TanreiSplitButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiSplitButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiSplitButtonVariantStateTokens
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import kotlin.math.abs
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TestRule
import org.junit.runner.RunWith
import org.junit.runners.model.Statement
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Behaviour tests for `specs/split-button.spec.json`. Each test names the behaviour id (`SPB-n`) it covers. Runs on the
 * JVM (Robolectric, native graphics). The split button (tagged `split`) is drawn on the surface between a focusable box
 * before it and one after it; the caller keeps `menuExpanded` and follows `onMenuExpandedChange` and
 * `onMenuDismissRequest`. A half's node is its hit area (touch target included); its drawn container is found in the pixels.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiSplitButtonTest {
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
    private val tokens = tanrei.splitButton
    private val filled = tokens.variants.filled
    private val measure = tanrei.measure
    private val surface = colors[TanreiColorRole.Surface]

    private val events = mutableListOf<String>()
    private var open by mutableStateOf(false)
    private var follow = true
    private var chevronColor = Color.Unspecified
    private var iconGlyph: TanreiIconGlyph? = null
    private var iconColor = Color.Unspecified

    private class Scene(val system: TanreiSystem, val direction: LayoutDirection, val content: @Composable () -> Unit)

    private var scene by mutableStateOf<Scene?>(null)

    private fun show(system: TanreiSystem = tanrei, direction: LayoutDirection = LayoutDirection.Ltr, content: @Composable () -> Unit) {
        val first = scene == null
        scene = Scene(system, direction, content)
        if (!first) {
            rule.waitForIdle()
            return
        }
        rule.setContent {
            val current = scene ?: return@setContent
            key(current) {
                CompositionLocalProvider(LocalLayoutDirection provides current.direction) {
                    TanreiTheme(system = current.system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                        Box(Modifier.testTag(STAGE_TAG).background(TanreiColorRole.Surface.color)) { current.content() }
                    }
                }
            }
        }
        rule.waitForIdle()
    }

    private fun showSplit(
        system: TanreiSystem = tanrei,
        variant: TanreiSplitButtonVariant = TanreiSplitButtonVariant.Filled,
        size: TanreiSplitButtonSize = TanreiSplitButtonSize.Medium,
        enabled: Boolean = true,
        text: String = "Save",
        menuLabel: String = MENU_LABEL,
        withIcon: Boolean = false,
        width: Dp? = null,
        direction: LayoutDirection = LayoutDirection.Ltr,
        items: @Composable () -> Unit = { MenuItems() },
    ) = show(system, direction) {
        Column {
            Box(Modifier.testTag(BEFORE).size(8.dp).focusable())
            Box(Modifier.testTag(WRAPPER).then(if (width != null) Modifier.width(width) else Modifier)) {
                TanreiSplitButton(
                    text = text,
                    onClick = { events += "click" },
                    menuContentDescription = menuLabel,
                    menuExpanded = open,
                    onMenuExpandedChange = {
                        events += "toggle:$it"
                        if (follow) open = it
                    },
                    onMenuDismissRequest = {
                        events += "close:$it"
                        if (follow) open = false
                    },
                    modifier = Modifier.testTag(SPLIT),
                    variant = variant,
                    size = size,
                    enabled = enabled,
                    icon = if (withIcon) { { Probe() } } else null,
                ) { items() }
            }
            Box(Modifier.testTag(AFTER).size(8.dp).focusable())
        }
    }

    @Composable
    private fun MenuItems() {
        TanreiMenuItem("Save as…", onClick = { events += "item:saveAs" }, modifier = Modifier.testTag(ITEM))
        TanreiMenuItem("Save a copy", onClick = { events += "item:copy" })
    }

    /** An icon that records the color and glyph its slot gives it, and fills its box with the color. */
    @Composable
    private fun Probe() {
        iconColor = LocalTanreiContentColor.current
        iconGlyph = LocalTanreiIconGlyph.current
        Box(Modifier.fillMaxSize().background(LocalTanreiContentColor.current))
    }

    private fun leading(): SemanticsNodeInteraction = rule.onNode(hasText("Save") and hasClickAction())

    private fun trailing(): SemanticsNodeInteraction = rule.onNode(hasContentDescription(MENU_LABEL) and hasClickAction())

    private fun TanreiSystem.withSplit(state: TanreiInteractionState, change: (TanreiSplitButtonVariantStateTokens) -> TanreiSplitButtonVariantStateTokens): TanreiSystem {
        val look = splitButton.variants.filled
        val changed = when (state) {
            TanreiInteractionState.Enabled -> look.copy(enabled = change(look.enabled))
            TanreiInteractionState.Hovered -> look.copy(hovered = change(look.hovered))
            TanreiInteractionState.Focused -> look.copy(focused = change(look.focused))
            TanreiInteractionState.Pressed -> look.copy(pressed = change(look.pressed))
            TanreiInteractionState.Disabled -> look.copy(disabled = change(look.disabled))
        }
        return copy(splitButton = splitButton.copy(variants = splitButton.variants.copy(filled = changed)))
    }

    private fun TanreiSystem.answering(feedback: TanreiPressedFeedback) = copy(behavior = behavior.copy(pressedFeedback = feedback))

    // ── SPB-1 / SPB-2: activation ────────────────────────────────────────────

    @Test
    fun `SPB-1 activating the leading half emits click once and never opens or closes the menu`() {
        showSplit()
        leading().performClick()
        rule.waitForIdle()
        assertEquals(listOf("click"), events)
        assertFalse(open)
    }

    @Test
    fun `SPB-2 activating the trailing half emits toggle with the opposite of open, and open shows the menu`() {
        showSplit()
        trailing().performClick()
        rule.waitForIdle()
        assertEquals(listOf("toggle:true"), events)
        assertEquals(1, rule.onAllNodes(isPopup()).fetchSemanticsNodes().size)
        follow = false
        open = true
        rule.waitForIdle()
        rule.onNodeWithTag(ITEM).assertExists()
    }

    @Test
    @KeyboardNavigation
    fun `SPB-2 Enter, Space and Down Arrow on the closed trailing half ask to open`() {
        follow = false
        showSplit()
        trailing().requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        trailing().performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        trailing().performKeyInput { pressKey(Key.DirectionDown) }
        rule.waitForIdle()
        assertEquals(listOf("toggle:true", "toggle:true", "toggle:true"), events)
        leading().requestFocus().performKeyInput { pressKey(Key.DirectionDown) }
        rule.waitForIdle()
        assertEquals("Down on the leading half asks nothing", 3, events.size)
    }

    // ── SPB-3 / SPB-7: disabled ──────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `SPB-3 disabled - no click, toggle or close, neither half focusable, both announced disabled, and no menu whatever open says`() {
        open = true
        showSplit(enabled = false)
        leading().assertIsNotEnabled()
        trailing().assertIsNotEnabled()
        assertEquals("no menu", 0, rule.onAllNodes(isPopup()).fetchSemanticsNodes().size)
        leading().performTouchInput { down(center); up() }
        trailing().performTouchInput { down(center); up() }
        rule.waitForIdle()
        assertEquals(emptyList<String>(), events)
        rule.onNodeWithTag(BEFORE).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(AFTER).assertIsFocused()
    }

    @Test
    fun `SPB-7 a disabled split button draws both halves from the disabled tokens of its variant`() {
        val system = tanrei.withSplit(TanreiInteractionState.Disabled) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        showSplit(system = system, enabled = false)
        val red = colors[TanreiColorRole.Error]
        assertPixel("leading", pixelAt(drawn(leading()).left + CLEAR, drawn(leading()).top + CLEAR), red)
        assertPixel("trailing", pixelAt(drawn(trailing()).left + 4.dp, drawn(trailing()).top + 4.dp), red)
        val outlined = tokens.variants.outlined.disabled
        assertEquals("a disabled outlined split button keeps no fill", TanreiPaint.None, outlined.containerColor)
        assertTrue("and a faded border", outlined.outlineColor != TanreiPaint.None)
    }

    // ── SPB-4 / SPB-5: each half's own state ─────────────────────────────────

    @Test
    fun `SPB-4 under acme a half draws its own hovered and pressed tokens, and the other half stays at rest`() {
        val acme = TanreiSystem.Acme
        val acmeColors = acme.colors.light
        val look = acme.splitButton.variants.filled
        showSplit(system = acme)
        val rest = look.enabled.containerColor.resolve(acmeColors)
        leading().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val l = drawn(leading(), acmeColors[TanreiColorRole.Surface])
        val t = drawn(trailing(), acmeColors[TanreiColorRole.Surface])
        assertPixel("leading hovered", pixelAt(l.left + CLEAR, l.top + 3.dp), look.hovered.containerColor.resolve(acmeColors).compositeOver(acmeColors[TanreiColorRole.Surface]))
        assertPixel("trailing at rest", pixelAt(t.left + 4.dp, t.top + 3.dp), rest)
        follow = false
        trailing().performTouchInput { down(center) }
        rule.waitForIdle()
        assertPixel("trailing pressed", pixelAt(t.left + 4.dp, t.top + 3.dp), look.pressed.containerColor.resolve(acmeColors).compositeOver(acmeColors[TanreiColorRole.Surface]))
        val leadingNow = pixelAt(l.left + CLEAR, l.top + 3.dp)
        assertFalse("leading not pressed: $leadingNow", isClose(leadingNow, look.pressed.containerColor.resolve(acmeColors).compositeOver(acmeColors[TanreiColorRole.Surface])))
        trailing().performTouchInput { up() }
    }

    @Test
    @KeyboardNavigation
    fun `SPB-5 keyboard focus shows the ring around that half's own shape only`() {
        showSplit()
        val l = drawn(leading())
        val t = drawn(trailing())
        trailing().requestFocus().assertIsFocused()
        rule.waitForIdle()
        val ring = colors[TanreiColorRole.FocusRing]
        val out = measure.focusOffset + measure.focusInnerWidth + measure.focusOuterWidth / 2
        assertPixel("around the trailing half", pixelAt((t.left + t.right) / 2, t.top - out), ring)
        assertPixel("not around the leading half", pixelAt((l.left + l.right) / 2, l.top - out), surface)
    }

    @Test
    fun `SPB-5 focus gained by touch shows no ring`() {
        showSplit()
        val t = drawn(trailing())
        trailing().requestFocus()
        rule.waitForIdle()
        val out = measure.focusOffset + measure.focusInnerWidth + measure.focusOuterWidth / 2
        assertPixel("no ring", pixelAt((t.left + t.right) / 2, t.top - out), surface)
    }

    // ── SPB-6: targets ───────────────────────────────────────────────────────

    @Test
    fun `SPB-6 each half's hit area reaches the target, outward and above and below, and the two meet in the middle of the gap`() {
        showSplit()
        val l = leading().getUnclippedBoundsInRoot()
        val t = trailing().getUnclippedBoundsInRoot()
        assertTrue("tall enough", l.bottom - l.top >= measure.targetTouch && t.bottom - t.top >= measure.targetTouch)
        assertTrue("wide enough: ${t.right - t.left}", t.right - t.left >= measure.targetTouch - 0.5.dp)
        val dl = drawn(leading())
        val dt = drawn(trailing())
        val middle = (dl.right + dt.left) / 2
        assertTrue("the leading half's reaches no further than the middle of the gap: ${l.right} vs $middle", l.right <= middle + 0.3.dp)
        assertTrue("nor the trailing half's: ${t.left} vs $middle", t.left >= middle - 0.3.dp)
        assertTrue("the trailing half reaches outward past its end", t.right > dt.right)
    }

    // ── SPB-8: unknown values ────────────────────────────────────────────────

    @Test
    fun `SPB-8 a variant or size the system does not have draws with the default's tokens, and a debuggable app reports it`() = collectingReports { reports ->
        showSplit()
        val expected = stage()
        setDebuggable(true)
        showSplit(variant = TanreiSplitButtonVariant("ghost"), size = TanreiSplitButtonSize("jumbo"))
        assertSameAs(expected, stage(), "unknown values")
        assertTrue(reports.toString(), reports.any { "ghost" in it } && reports.any { "jumbo" in it })
    }

    // ── SPB-9 / SPB-10: the press ────────────────────────────────────────────

    @Test
    fun `SPB-9 a tap that ends at once shows the pressed state on the next frame and keeps it for press-hold`() {
        showSplit()
        val l = drawn(leading())
        val hold = tanrei.motion.duration.pressHold.toLong()
        val pressed = filled.pressed.containerColor.resolve(colors).compositeOver(surface)
        rule.mainClock.autoAdvance = false
        leading().performTouchInput { down(center); up() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("pressed", pixelAt(l.left + CLEAR, l.top + 3.dp), pressed)
        rule.mainClock.advanceTimeBy(hold / 2)
        assertPixel("still pressed", pixelAt(l.left + CLEAR, l.top + 3.dp), pressed)
        rule.mainClock.advanceTimeBy(hold + tokens.motionStateDuration * 2L)
        assertPixel("at rest", pixelAt(l.left + CLEAR, l.top + 3.dp), filled.enabled.containerColor.resolve(colors))
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `SPB-10 ripple grows the pressed color from the point of contact`() {
        assertEquals(TanreiPressedFeedback.Ripple, TanreiSystem.M3Like.behavior.pressedFeedback)
        showSplit(system = tanrei.answering(TanreiPressedFeedback.Ripple), text = "Save everything")
        val l = drawn(rule.onNode(hasText("Save everything") and hasClickAction()))
        val node = rule.onNode(hasText("Save everything") and hasClickAction())
        val bounds = node.getUnclippedBoundsInRoot()
        val pressed = filled.pressed.containerColor.resolve(colors)
        rule.mainClock.autoAdvance = false
        node.performTouchInput { down(Offset((l.left - bounds.left + 4.dp).toPx(), (l.top - bounds.top + 4.dp).toPx())) }
        rule.mainClock.advanceTimeBy(50)
        assertPixel("at the point of contact", pixelAt(l.left + 4.dp, l.top + 4.dp), pressed)
        assertPixel("not yet at the far end", pixelAt(l.right - 4.dp, l.bottom - 4.dp), filled.enabled.containerColor.resolve(colors))
        rule.mainClock.advanceTimeBy(tokens.motionFeedbackDuration.toLong())
        assertPixel("the far end once grown", pixelAt(l.right - 4.dp, l.bottom - 4.dp), pressed)
        node.performTouchInput { up() }
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `SPB-10 dim - cupertino's answer - dims the pressed half, and none draws nothing`() {
        val cupertino = TanreiSystem.Cupertino
        assertEquals(TanreiPressedFeedback.Dim, cupertino.behavior.pressedFeedback)
        assertTrue(cupertino.splitButton.pressed.opacity < 1f)
        showSplit(system = cupertino)
        val before = stage()
        leading().performTouchInput { down(center) }
        rule.waitForIdle()
        assertTrue("dimmed", differing(before, stage()) > 0)
        leading().performTouchInput { up() }
        showSplit(system = tanrei.answering(TanreiPressedFeedback.None))
        leading().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val hovered = stage()
        leading().performMouseInput { press() }
        rule.waitForIdle()
        assertSameAs(hovered, stage(), "pressed under none")
        leading().performMouseInput { release() }
    }

    // ── SPB-11 / SPB-13: corners ─────────────────────────────────────────────

    @Test
    fun `SPB-11 SPB-13 the outer corners are container-shape and the join inner-shape, each eased by corner smoothing`() {
        for (smoothing in listOf(0f, 0.6f)) {
            showSplit(system = tanrei.copy(splitButton = tokens.copy(containerShape = 12.dp, containerInnerShape = 0.dp), shape = tanrei.shape.copy(cornerSmoothing = smoothing)))
            val l = drawn(leading())
            val t = drawn(trailing())
            val fill = filled.enabled.containerColor.resolve(colors)
            assertPixel("smoothing $smoothing: the outer corner is round", pixelAt(l.left + 0.5.dp, l.top + 0.5.dp), surface)
            assertPixel("the join is square", pixelAt(l.right - 0.5.dp, l.top + 0.5.dp), fill)
            assertPixel("the trailing join too", pixelAt(t.left + 0.5.dp, t.bottom - 0.5.dp), fill)
            assertPixel("the trailing outer corner is round", pixelAt(t.right - 0.5.dp, t.top + 0.5.dp), surface)
        }
    }

    @Test
    @KeyboardNavigation
    fun `SPB-11 glow draws the focus colors as a halo around the half under acme`() {
        val acme = TanreiSystem.Acme
        assertEquals(TanreiFocusStyle.Glow, acme.behavior.focusStyle)
        showSplit(system = acme)
        val acmeSurface = acme.colors.light[TanreiColorRole.Surface]
        val t = drawn(trailing(), acmeSurface)
        trailing().requestFocus().assertIsFocused()
        rule.waitForIdle()
        val band = (1..12).map { pixelAt((t.left + t.right) / 2, t.top - it.dp) }
        assertTrue("a halo above the half: $band", band.any { !isClose(it, acmeSurface) })
    }

    @Test
    fun `SPB-13 while open the trailing inner corners become inner-shape-open over the open motion, and the chevron turns`() {
        val slow = 400
        val system = tanrei.copy(splitButton = tokens.copy(containerInnerShape = 0.dp, containerInnerShapeOpen = 12.dp, motionOpenDuration = slow, motionOpenEasing = tanrei.motion.easing.linear))
        showSplit(system = system, items = {})
        val t = drawn(trailing())
        val fill = filled.enabled.containerColor.resolve(colors)
        val chevronDown = chevronRows(t)
        rule.mainClock.autoAdvance = false
        open = true
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(slow / 4L)
        assertPixel("a quarter of the way: still nearly square", pixelAt(t.left + 2.dp, t.top + 2.dp), fill)
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertPixel("open: the inner corner is round", pixelAt(t.left + 2.dp, t.top + 2.dp), surface)
        assertTrue("the chevron turned: $chevronDown", chevronRows(t) != chevronDown)
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `SPB-13 each half draws an outline of its size's width in its variant's outline color, inside its edge`() {
        showSplit(system = tanrei.copy(splitButton = tokens.copy(sizes = tokens.sizes.copy(medium = tokens.sizes.medium.copy(outlineWidth = 3.dp)))), variant = TanreiSplitButtonVariant.Outlined)
        val outline = tokens.variants.outlined.enabled.outlineColor.resolve(colors)
        val node = trailing().getUnclippedBoundsInRoot()
        val mid = (node.top + node.bottom) / 2
        val tLeft = drawn(trailing()).left
        assertPixel("3 wide, inside the edge", pixelAt(tLeft + 2.5.dp, mid), outline)
        assertPixel("then the inside", pixelAt(tLeft + 3.5.dp, mid), surface)
    }

    // ── SPB-12 / SPB-14: layout and content ──────────────────────────────────

    @Test
    fun `SPB-12 the halves are inner-gap apart, as tall as the size, the leading half padded by its tokens with or without an icon`() {
        showSplit()
        val l = drawn(leading())
        val t = drawn(trailing())
        assertEquals(tokens.containerInnerGap.value, (t.left - l.right).value, 0.6f)
        assertEquals(tokens.sizes.medium.containerHeight.value, (l.bottom - l.top).value, 0.6f)
        assertEquals("the trailing half as tall", (l.bottom - l.top).value, (t.bottom - t.top).value, 0.6f)
        assertEquals("the chevron between trailing paddings", (tokens.sizes.medium.trailingPaddingInline * 2 + tokens.sizes.medium.iconSize).value, (t.right - t.left).value, 0.6f)
        val wide = tanrei.copy(splitButton = tokens.copy(sizes = tokens.sizes.copy(medium = tokens.sizes.medium.copy(leadingPaddingInlineStartWithIcon = 30.dp))))
        showSplit(system = wide, withIcon = true)
        val withIcon = drawn(leading())
        val box = iconBox()
        assertEquals("the icon after padding-with-icon", 30f, (box.left - withIcon.left).value, 0.6f)
    }

    @Test
    fun `SPB-14 label, icon and chevron in the half's label color, the icon unselected at the icon size, and a label that wraps grows both halves`() {
        val red = tanrei.withSplit(TanreiInteractionState.Enabled) { it.copy(labelColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        showSplit(system = red, withIcon = true)
        assertEquals(colors[TanreiColorRole.Error], iconColor)
        assertEquals(tanrei.icon.glyph(tokens.sizes.medium.iconSize, selected = false), iconGlyph)
        with(rule.density) { assertEquals(tokens.sizes.medium.iconSize.toPx(), iconBox().let { it.right - it.left }.toPx(), 0.6f) }
        val t = drawn(trailing())
        assertTrue("the chevron in the label color", countNear(t, colors[TanreiColorRole.Error]) > 0)
        showSplit(text = "Save every open document to the cloud", width = 200.dp)
        val node = rule.onNode(hasText("Save every open document to the cloud") and hasClickAction())
        val l = drawn(node)
        assertTrue("it wraps: ${l.bottom - l.top}", l.bottom - l.top > tokens.sizes.medium.containerHeight)
        assertEquals("both grow", (l.bottom - l.top).value, (drawn(trailing()).bottom - drawn(trailing()).top).value, 0.6f)
    }

    // ── SPB-15 / SPB-16: the menu ────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `SPB-15 open presents a Tanrei Menu, focus moves in, and Escape closes it with focus back on the trailing half`() {
        showSplit()
        trailing().requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals(1, rule.onAllNodes(isPopup()).fetchSemanticsNodes().size)
        rule.onNodeWithTag(ITEM).assertIsFocused().performKeyInput { pressKey(Key.Escape) }
        rule.waitForIdle()
        assertEquals(listOf("toggle:true", "close:Escape"), events)
        assertEquals(0, rule.onAllNodes(isPopup()).fetchSemanticsNodes().size)
        trailing().assertIsFocused()
    }

    @Test
    fun `SPB-15 the menu is end-aligned below the whole split button`() {
        open = true
        show {
            Box(Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.TopEnd) {
                TanreiSplitButton(
                    text = "Save",
                    onClick = {},
                    menuContentDescription = MENU_LABEL,
                    menuExpanded = open,
                    onMenuExpandedChange = { open = it },
                    onMenuDismissRequest = { open = false },
                    modifier = Modifier.padding(end = 24.dp).testTag(SPLIT),
                ) { MenuItems() }
            }
        }
        val split = rule.onNodeWithTag(SPLIT).fetchSemanticsNode()
        val item = rule.onNodeWithTag(ITEM).fetchSemanticsNode()
        val splitRight = split.positionOnScreen.x + split.size.width
        val surfaceRight = item.positionOnScreen.x + item.size.width + with(rule.density) { tanrei.menu.surfacePaddingInline.toPx() }
        assertEquals("end-aligned", splitRight, surfaceRight, 2f)
        assertTrue("below it", item.positionOnScreen.y > split.positionOnScreen.y + split.size.height - 1f)
    }

    @Test
    fun `SPB-16 an action item emits its click, then close with the reason Item`() {
        showSplit()
        trailing().performClick()
        rule.waitForIdle()
        rule.onNodeWithTag(ITEM).performClick()
        rule.waitForIdle()
        assertEquals(listOf("toggle:true", "item:saveAs", "close:Item"), events)
        assertFalse(open)
    }

    @Test
    fun `SPB-16 a press on the trailing half while open emits toggle false and no close, and a press elsewhere closes with Outside`() {
        var popupView: android.view.View? = null
        showSplit(items = { TanreiMenuItem("Save as…", onClick = {}, modifier = Modifier.testTag(ITEM), leadingIcon = { popupView = androidx.compose.ui.platform.LocalView.current }) })
        trailing().performClick()
        rule.waitForIdle()
        val window = popupView!!.parent as android.view.View
        val location = IntArray(2).also { window.getLocationOnScreen(it) }
        val t = trailing().fetchSemanticsNode()
        val x = t.positionOnScreen.x + t.size.width / 2f - location[0]
        val y = t.positionOnScreen.y + t.size.height / 2f - location[1]
        val down = android.view.MotionEvent.obtain(0L, 0L, android.view.MotionEvent.ACTION_DOWN, x, y, 0)
        rule.runOnUiThread { window.dispatchTouchEvent(down) }
        down.recycle()
        rule.waitForIdle()
        assertEquals(listOf("toggle:true", "toggle:false"), events)
        trailing().performClick()
        rule.waitForIdle()
        val again = popupView!!.parent as android.view.View
        val far = android.view.MotionEvent.obtain(0L, 0L, android.view.MotionEvent.ACTION_DOWN, -10f, again.height + 200f, 0)
        rule.runOnUiThread { again.dispatchTouchEvent(far) }
        far.recycle()
        rule.waitForIdle()
        assertEquals(listOf("toggle:true", "toggle:false", "toggle:true", "close:Outside"), events)
    }

    // ── SPB-17: semantics ────────────────────────────────────────────────────

    @Test
    fun `SPB-17 two buttons in reading order - the leading named by label, the trailing by menuLabel with its expanded state - and nothing around them`() {
        showSplit(withIcon = true)
        leading().assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
        trailing().assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
        trailing().assert(SemanticsMatcher.keyIsDefined(SemanticsActions.Expand)).assert(SemanticsMatcher.keyNotDefined(SemanticsActions.Collapse))
        assertEquals("no element of its own: the wrapper holds the two halves", 2, rule.onNodeWithTag(WRAPPER).fetchSemanticsNode().children.size.let { if (it == 1) rule.onNodeWithTag(SPLIT).fetchSemanticsNode().children.size else it })
        assertTrue("the leading half comes first", leading().getUnclippedBoundsInRoot().left < trailing().getUnclippedBoundsInRoot().left)
        trailing().performSemanticsAction(SemanticsActions.Expand)
        rule.waitForIdle()
        trailing().assert(SemanticsMatcher.keyIsDefined(SemanticsActions.Collapse))
        assertEquals(listOf("toggle:true"), events)
        assertEquals("the icon and chevron are hidden", 0, rule.onAllNodes(hasText("keyboard_arrow_down"), useUnmergedTree = true).fetchSemanticsNodes().size)
    }

    // ── SPB-18: elevation and state motion ───────────────────────────────────

    @Test
    fun `SPB-18 each half casts its state's elevation outside itself, and a change of state moves over the state motion`() {
        val hard = listOf(TanreiShadowLayer(0.dp, 0.dp, 0.dp, 0.dp, TanreiColorRole.Success), TanreiShadowLayer(0.dp, 0.dp, 0.dp, 3.dp, TanreiColorRole.Success))
        showSplit(system = tanrei.withSplit(TanreiInteractionState.Enabled) { it.copy(containerElevation = hard) })
        val t = drawn(trailing(), surface, colors[TanreiColorRole.Success])
        assertPixel("outside the half, unclipped", pixelAt((t.left + t.right) / 2, t.top - 2.dp), colors[TanreiColorRole.Success])
        val slow = 400
        val system = tanrei.withSplit(TanreiInteractionState.Hovered) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Success)) }
            .let { it.copy(splitButton = it.splitButton.copy(motionStateDuration = slow, motionStateEasing = tanrei.motion.easing.linear)) }
        showSplit(system = system)
        val l = drawn(leading())
        rule.mainClock.autoAdvance = false
        leading().performMouseInput { moveTo(center) }
        rule.mainClock.advanceTimeBy(slow / 2L)
        val half = pixelAt(l.left + CLEAR, l.top + 3.dp)
        assertTrue("on its way: $half", !isClose(half, filled.enabled.containerColor.resolve(colors)) && !isClose(half, colors[TanreiColorRole.Success]))
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertPixel("arrived", pixelAt(l.left + CLEAR, l.top + 3.dp), colors[TanreiColorRole.Success])
        rule.mainClock.autoAdvance = true
    }

    // ── SPB-19: right to left ────────────────────────────────────────────────

    @Test
    fun `SPB-19 right-to-left puts the trailing half on the left and the icon to the right of the label`() {
        showSplit(withIcon = true, direction = LayoutDirection.Rtl)
        assertTrue(trailing().getUnclippedBoundsInRoot().right <= leading().getUnclippedBoundsInRoot().left + 0.5.dp)
        val l = drawn(leading())
        with(rule.density) { assertTrue("the icon in the leading half's right part", iconBox().left > (l.left + l.right) / 2) }
    }

    // ── SPB-20: reports ──────────────────────────────────────────────────────

    @Test
    fun `SPB-20 an empty label or menuLabel still renders, and a debuggable app reports the half without a name`() = collectingReports { reports ->
        setDebuggable(true)
        showSplit(text = "", menuLabel = "")
        rule.onNodeWithTag(SPLIT).assertExists()
        assertTrue(reports.toString(), reports.any { "TanreiSplitButton" in it && "text" in it })
        assertTrue(reports.toString(), reports.any { "TanreiSplitButton" in it && "menuContentDescription" in it })
    }

    @Test
    fun `SPB-20 an empty menu slot still toggles and draws the open form, presents no menu, and is reported`() = collectingReports { reports ->
        setDebuggable(true)
        val system = tanrei.copy(splitButton = tokens.copy(containerInnerShape = 0.dp, containerInnerShapeOpen = 12.dp))
        showSplit(system = system, items = {})
        val t = drawn(trailing())
        trailing().performClick()
        rule.waitForIdle()
        assertEquals(listOf("toggle:true"), events)
        assertTrue(open)
        assertEquals("no menu", 0, rule.onAllNodes(isPopup()).fetchSemanticsNodes().size)
        assertPixel("the open form", pixelAt(t.left + 2.dp, t.top + 2.dp), surface)
        assertTrue(reports.toString(), reports.any { "menu slot holds no item" in it })
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun setDebuggable(debuggable: Boolean) {
        val info = ApplicationProvider.getApplicationContext<Context>().applicationInfo
        info.flags = if (debuggable) info.flags or ApplicationInfo.FLAG_DEBUGGABLE else info.flags and ApplicationInfo.FLAG_DEBUGGABLE.inv()
    }

    private fun collectingReports(block: (MutableList<String>) -> Unit) {
        val reports = mutableListOf<String>()
        val previous = TanreiDiagnostics.reporter
        TanreiDiagnostics.reporter = { reports += it }
        try {
            block(reports)
        } finally {
            TanreiDiagnostics.reporter = previous
            setDebuggable(false)
        }
    }

    private fun stage(): PixelMap = rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap()

    private fun pixelAt(x: Dp, y: Dp): Color {
        val stage = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
        return with(rule.density) { stage()[(x - stage.left).roundToPx(), (y - stage.top).roundToPx()] }
    }

    /** The bounds of the icon slot's probe, in the root. */
    private fun iconBox(): DpRect {
        val map = stage()
        val l = leading().getUnclippedBoundsInRoot()
        val stage = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
        return with(rule.density) {
            val y = ((l.top + l.bottom) / 2 - stage.top).roundToPx()
            val xs = ((l.left - stage.left).roundToPx() until (l.right - stage.left).roundToPx()).filter { isClose(map[it, y], iconColor) }
            // The probe is a filled square: the longest run of the icon color (a letter's strokes are narrower).
            val runs = mutableListOf<IntRange>()
            for (x in xs) if (runs.isNotEmpty() && runs.last().last == x - 1) runs[runs.size - 1] = runs.last().first..x else runs += x..x
            val run = runs.maxBy { it.last - it.first }
            DpRect(stage.left + run.first.toDp(), l.top, stage.left + (run.last + 1).toDp(), l.bottom)
        }
    }

    /** The drawn container of a half: the pixels inside its node that differ from [background] (and from [ignore]). */
    private fun drawn(node: SemanticsNodeInteraction, background: Color = surface, ignore: Color? = null): DpRect {
        val map = stage()
        val stage = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
        val bounds = node.getUnclippedBoundsInRoot()
        return with(rule.density) {
            val left = (bounds.left - stage.left).roundToPx()
            val right = (bounds.right - stage.left).roundToPx()
            val top = (bounds.top - stage.top).roundToPx()
            val bottom = (bounds.bottom - stage.top).roundToPx()
            fun counts(x: Int, y: Int) = !isClose(map[x, y], background) && (ignore == null || !isClose(map[x, y], ignore))
            val midY = (top + bottom) / 2
            val columns = (left until right).filter { counts(it, midY) }
            val x0 = columns.first()
            val x1 = columns.last()
            val probe = (x0 + x1) / 2
            val rows = (top until bottom).filter { counts(probe, it) }
            DpRect(stage.left + x0.toDp(), stage.top + rows.first().toDp(), stage.left + (x1 + 1).toDp(), stage.top + (rows.last() + 1).toDp())
        }
    }

    /** Which rows of the trailing half hold chevron (non-container) pixels, as a fingerprint of its direction. */
    private fun chevronRows(t: DpRect): List<Int> {
        val map = stage()
        val stage = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
        val fill = filled.enabled.containerColor.resolve(colors)
        return with(rule.density) {
            val x = ((t.left + t.right) / 2 - stage.left).roundToPx()
            ((t.top - stage.top).roundToPx() until (t.bottom - stage.top).roundToPx()).filter { !isClose(map[x, it], fill, 0.2f) }
        }
    }

    private fun countNear(rect: DpRect, color: Color): Int {
        val map = stage()
        val stage = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
        return with(rule.density) {
            ((rect.top - stage.top).roundToPx() until (rect.bottom - stage.top).roundToPx()).sumOf { y ->
                ((rect.left - stage.left).roundToPx() until (rect.right - stage.left).roundToPx()).count { x -> isClose(map[x, y], color) }
            }
        }
    }

    private fun differing(a: PixelMap, b: PixelMap): Int =
        (0 until minOf(a.height, b.height)).sumOf { y -> (0 until minOf(a.width, b.width)).count { x -> !isClose(a[x, y], b[x, y]) } }

    private fun assertSameAs(expected: PixelMap, actual: PixelMap, what: String) = assertEquals("$what: not one pixel differs", 0, differing(expected, actual))

    private fun isClose(actual: Color, expected: Color, tolerance: Float = PIXEL_TOLERANCE): Boolean =
        maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue)) <= tolerance

    private fun assertPixel(what: String, actual: Color, expected: Color) =
        assertTrue("$what: expected $expected but was $actual", isClose(actual, expected))

    private companion object {
        const val STAGE_TAG = "stage"
        const val SPLIT = "split"
        const val WRAPPER = "wrapper"
        const val BEFORE = "before"
        const val AFTER = "after"
        const val ITEM = "item"
        const val MENU_LABEL = "More save options"
        const val PIXEL_TOLERANCE = 2f / 255f
        val CLEAR = 4.dp
    }
}

/** SPB-13 where motion is reduced (the animator duration scale is 0, see `TanreiButtonReducedMotionTest`). */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiSplitButtonReducedMotionTest {
    private object NoMotion : MotionDurationScale {
        override val scaleFactor: Float = 0f
    }

    @get:Rule
    val rule = createComposeRule(effectContext = NoMotion)

    private var open by mutableStateOf(false)

    @Test
    fun `SPB-13 where motion is reduced the open form changes at once`() {
        val tanrei = TanreiSystem.Tanrei
        val colors = tanrei.colors.light
        val system = tanrei.copy(splitButton = tanrei.splitButton.copy(containerInnerShape = 0.dp, containerInnerShapeOpen = 12.dp, motionOpenDuration = 1000, motionStateDuration = 1000))
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Box(Modifier.testTag("stage").background(TanreiColorRole.Surface.color)) {
                    TanreiSplitButton(text = "Save", onClick = {}, menuContentDescription = "More", menuExpanded = open, onMenuExpandedChange = {}, onMenuDismissRequest = {}) {}
                }
            }
        }
        rule.waitForIdle()
        val trailing = rule.onNode(hasContentDescription("More") and hasClickAction()).getUnclippedBoundsInRoot()
        rule.mainClock.autoAdvance = false
        open = true
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        repeat(3) { rule.mainClock.advanceTimeByFrame() }
        val map = rule.onNodeWithTag("stage").captureToImage().toPixelMap()
        // The trailing half's drawn left edge is 1 dp inside its hit area (half the 2 gap); its inner top corner is round at once.
        val pixel = with(rule.density) { map[(trailing.left + 1.dp + 2.dp).roundToPx(), (trailing.top + (trailing.bottom - trailing.top - 36.dp) / 2 + 2.dp).roundToPx()] }
        val surface = colors[TanreiColorRole.Surface]
        assertTrue("open at once: $pixel", abs(pixel.red - surface.red) < 0.02f && abs(pixel.green - surface.green) < 0.02f)
        rule.mainClock.autoAdvance = true
    }
}
