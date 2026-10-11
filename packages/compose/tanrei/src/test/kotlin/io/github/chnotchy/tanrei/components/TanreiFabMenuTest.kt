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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.MotionDurationScale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PixelMap
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.click
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.isPopup
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performMouseInput
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.test.withKeyDown
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.DpRect
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.acme.design.Acme
import io.github.chnotchy.tanrei.primitives.LocalTanreiGlyphStandIn
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
import io.github.chnotchy.tanrei.tokens.TanreiFabMenuSize
import io.github.chnotchy.tanrei.tokens.TanreiFabMenuVariant
import io.github.chnotchy.tanrei.tokens.TanreiFabMenuVariantStateTokens
import io.github.chnotchy.tanrei.tokens.TanreiFocusStyle
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiPressedFeedback
import io.github.chnotchy.tanrei.tokens.TanreiShadowLayer
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
 * Behaviour tests for `specs/fab-menu.spec.json`. Each test names the behaviour id (`FBM-n`) it covers. Runs on the JVM
 * (Robolectric, native graphics). The FAB menu sits at the bottom end of a 320 × 400 stage on the surface, the toggle
 * tagged `toggle` and the items `item-<i>`; a focusable box comes before it and one after it. The caller keeps
 * `expanded` and follows `onExpandedChange` and `onDismissRequest`. Pixel tests of the items draw them in place
 * (`TanreiFabMenuInPlace`), in the stage's own window; the popup's behaviour is tested through its nodes.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiFabMenuTest {
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
    private val tokens = tanrei.fabMenu
    private val filled = tokens.variants.filled
    private val measure = tanrei.measure
    private val surface = colors[TanreiColorRole.Surface]

    private val events = mutableListOf<String>()
    private var expanded by mutableStateOf(false)
    private var follow = true
    private var slotColor = Color.Unspecified
    private var slotGlyph: TanreiIconGlyph? = null

    /** The view the items' glyphs were last composed in: the popup's, once it is open. */
    private var popupView: android.view.View? = null

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
                CompositionLocalProvider(
                    LocalLayoutDirection provides current.direction,
                    LocalTanreiGlyphStandIn provides { name ->
                        popupView = androidx.compose.ui.platform.LocalView.current
                        NamedFixtureGlyph(name)
                    },
                ) {
                    TanreiTheme(system = current.system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                        Box(Modifier.testTag(STAGE_TAG).width(320.dp).background(TanreiColorRole.Surface.color)) {
                            Column {
                                Box(Modifier.testTag(BEFORE).size(8.dp).focusable())
                                Box(Modifier.size(320.dp, 400.dp).padding(16.dp), contentAlignment = Alignment.BottomEnd) { current.content() }
                                Box(Modifier.testTag(AFTER).size(8.dp).focusable())
                            }
                        }
                    }
                }
            }
        }
        rule.waitForIdle()
    }

    private fun showMenu(
        system: TanreiSystem = tanrei,
        variant: TanreiFabMenuVariant = TanreiFabMenuVariant.Filled,
        size: TanreiFabMenuSize = TanreiFabMenuSize.Medium,
        enabled: Boolean = true,
        label: String = "Create",
        labels: List<String> = THREE,
        icons: List<String> = ICONS,
        inPlace: Boolean = false,
        direction: LayoutDirection = LayoutDirection.Ltr,
    ) = show(system, direction) {
        val items: @Composable () -> Unit = {
            labels.forEachIndexed { i, text -> TanreiFabMenuItem(text = text, onClick = { events += "click:$text" }, icon = icons.getOrElse(i) { "add" }, modifier = Modifier.testTag(item(i))) }
        }
        if (inPlace) {
            TanreiFabMenuInPlace(expanded = expanded, contentDescription = label, icon = { Slot() }, modifier = Modifier.testTag(TOGGLE_BOX), variant = variant, size = size, enabled = enabled, content = items)
        } else {
            TanreiFabMenu(
                expanded = expanded,
                onExpandedChange = {
                    events += "toggle:$it"
                    if (follow) expanded = it
                },
                onDismissRequest = {
                    events += "close:$it"
                    if (follow) expanded = false
                },
                contentDescription = label,
                icon = { Slot() },
                modifier = Modifier.testTag(TOGGLE_BOX),
                variant = variant,
                size = size,
                enabled = enabled,
                content = items,
            )
        }
    }

    /** The toggle's icon: records the color and glyph it is given and fills its box with the color. */
    @Composable
    private fun Slot() {
        slotColor = LocalTanreiContentColor.current
        slotGlyph = LocalTanreiIconGlyph.current
        Box(Modifier.fillMaxSize().background(LocalTanreiContentColor.current))
    }

    private fun item(i: Int) = "item-$i"

    private fun toggle() = rule.onNode(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf("Create")) and SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))

    private fun popups() = rule.onAllNodes(isPopup()).fetchSemanticsNodes().size

    private fun TanreiSystem.withFabMenu(state: TanreiInteractionState, change: (TanreiFabMenuVariantStateTokens) -> TanreiFabMenuVariantStateTokens): TanreiSystem {
        val look = fabMenu.variants.filled
        val changed = when (state) {
            TanreiInteractionState.Enabled -> look.copy(enabled = change(look.enabled))
            TanreiInteractionState.Hovered -> look.copy(hovered = change(look.hovered))
            TanreiInteractionState.Focused -> look.copy(focused = change(look.focused))
            TanreiInteractionState.Pressed -> look.copy(pressed = change(look.pressed))
            TanreiInteractionState.Disabled -> look.copy(disabled = change(look.disabled))
        }
        return copy(fabMenu = fabMenu.copy(variants = fabMenu.variants.copy(filled = changed)))
    }

    private fun TanreiSystem.answering(feedback: TanreiPressedFeedback) = copy(behavior = behavior.copy(pressedFeedback = feedback))

    // ── FBM-1 / FBM-2: the toggle ────────────────────────────────────────────

    @Test
    fun `FBM-1 activating the toggle emits toggle with the opposite of open, and the items appear`() {
        showMenu()
        toggle().performClick()
        rule.waitForIdle()
        assertEquals(listOf("toggle:true"), events)
        assertEquals(1, popups())
        rule.onNodeWithTag(item(0)).assertExists()
    }

    @Test
    @KeyboardNavigation
    fun `FBM-1 Enter, Space, Down and Up Arrow on the closed toggle ask to open`() {
        follow = false
        showMenu()
        toggle().requestFocus().assertIsFocused()
        for (k in listOf(Key.Enter, Key.Spacebar, Key.DirectionDown, Key.DirectionUp)) {
            toggle().performKeyInput { pressKey(k) }
            rule.waitForIdle()
        }
        assertEquals(listOf("toggle:true", "toggle:true", "toggle:true", "toggle:true"), events)
    }

    @Test
    @KeyboardNavigation
    fun `FBM-2 disabled - no toggle or close, not focusable, announced disabled, drawn closed with no items whatever open says`() {
        expanded = true
        showMenu(enabled = false)
        toggle().assertIsNotEnabled()
        assertEquals("no items", 0, popups())
        toggle().performTouchInput { down(center); up() }
        rule.waitForIdle()
        assertEquals(emptyList<String>(), events)
        rule.onNodeWithTag(BEFORE).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(AFTER).assertIsFocused()
        assertEquals("drawn closed: the slot's glyph in the closed parts' disabled icon color", filled.disabled.iconColor.resolve(colors), slotColor)
    }

    @Test
    fun `FBM-6 a disabled toggle draws the disabled tokens of its variant's closed parts`() {
        val system = tanrei.withFabMenu(TanreiInteractionState.Disabled) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error), openContainerColor = TanreiPaint.Role(TanreiColorRole.Success)) }
        expanded = true
        showMenu(system = system, enabled = false)
        val t = toggleRect()
        assertPixel("the closed parts' disabled container", pixelAt(t.left + 4.dp, t.top + 8.dp), colors[TanreiColorRole.Error])
    }

    // ── FBM-3 / FBM-4: states ────────────────────────────────────────────────

    @Test
    fun `FBM-3 under acme the toggle and each item draw their own hovered and pressed tokens`() {
        val acme = TanreiSystem.Acme
        val acmeColors = acme.colors.light
        val acmeSurface = acmeColors[TanreiColorRole.Surface]
        val look = acme.fabMenu.variants.filled
        assertEquals(3, listOf(look.enabled, look.hovered, look.pressed).map { it.containerColor.resolve(acmeColors).compositeOver(acmeSurface) }.toSet().size)
        expanded = true
        showMenu(system = acme, inPlace = true)
        rule.onNodeWithTag(item(1)).performMouseInput { moveTo(Offset(6.dp.toPx(), 6.dp.toPx())) }
        rule.waitForIdle()
        val i1 = rule.onNodeWithTag(item(1)).getUnclippedBoundsInRoot()
        assertPixel("the item hovered, from its item parts", pixelAt(i1.left + 4.dp, i1.top + 24.dp), look.hovered.itemContainerColor.resolve(acmeColors).compositeOver(acmeSurface))
        val i0 = rule.onNodeWithTag(item(0)).getUnclippedBoundsInRoot()
        assertPixel("its neighbour at rest", pixelAt(i0.left + 4.dp, i0.top + 24.dp), look.enabled.itemContainerColor.resolve(acmeColors).compositeOver(acmeSurface))
        expanded = false
        showMenu(system = acme)
        val t = toggleRect()
        toggle().performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertPixel("the toggle hovered, from its closed parts", pixelAt(t.left + 4.dp, t.top + 8.dp), look.hovered.containerColor.resolve(acmeColors).compositeOver(acmeSurface))
    }

    @Test
    @KeyboardNavigation
    fun `FBM-4 keyboard focus shows the ring around the toggle, and touch focus none`() {
        showMenu()
        val t = toggleRect()
        val out = measure.focusOffset + measure.focusInnerWidth + measure.focusOuterWidth / 2
        toggle().requestFocus()
        rule.waitForIdle()
        assertPixel("the ring", pixelAt((t.left + t.right) / 2, t.top - out), colors[TanreiColorRole.FocusRing])
    }

    @Test
    fun `FBM-4 focus gained by touch shows no ring`() {
        showMenu()
        val t = toggleRect()
        val out = measure.focusOffset + measure.focusInnerWidth + measure.focusOuterWidth / 2
        toggle().requestFocus()
        rule.waitForIdle()
        assertPixel("no ring", pixelAt((t.left + t.right) / 2, t.top - out), surface)
    }

    // ── FBM-5 / FBM-11 / FBM-12: sizes ───────────────────────────────────────

    @Test
    fun `FBM-5 FBM-12 a small toggle reaches the target and lays out at its own size, and each item is at least the target tall, all of it its hit area`() {
        expanded = true
        showMenu(size = TanreiFabMenuSize.Small, inPlace = true)
        val node = toggle().getUnclippedBoundsInRoot()
        assertEquals(measure.targetTouch.value, (node.right - node.left).value, 0.5f)
        assertEquals("the drawn square is its size", tokens.sizes.small.containerSize.value, (toggleRect().right - toggleRect().left).value, 1.1f)
        val box = rule.onNodeWithTag(TOGGLE_BOX).getUnclippedBoundsInRoot()
        assertEquals("the items take no room in the layout", measure.targetTouch.value, (box.bottom - box.top).value, 0.5f)
        rule.onNodeWithTag(item(0)).assertHeightIsAtLeast(measure.targetTouch)
        rule.onNodeWithTag(item(0)).performTouchInput { click(Offset(2.dp.toPx(), 2.dp.toPx())) }
        rule.waitForIdle()
        assertEquals("the container's corner is still the item", listOf("click:Document"), events)
    }

    @Test
    fun `FBM-11 the toggle is its size's square with its corners, the slot's glyph closed and the close glyph open with round corners`() {
        val system = tanrei.copy(fabMenu = tokens.copy(sizes = tokens.sizes.copy(medium = tokens.sizes.medium.copy(containerShape = 4.dp))))
        showMenu(system = system)
        val t = toggleRect()
        assertEquals(tokens.sizes.medium.containerSize.value, (t.right - t.left).value, 0.6f)
        val closedFill = filled.enabled.containerColor.resolve(colors)
        assertPixel("a 4 corner", pixelAt(t.left + 2.dp, t.top + 2.dp), closedFill)
        assertEquals(tanrei.icon.glyph(tokens.sizes.medium.iconSize, selected = false), slotGlyph)
        val slotPixels = count(t, slotColor)
        assertTrue("the slot's glyph fills its box: $slotPixels", slotPixels > 100)
        expanded = true
        rule.waitForIdle()
        assertPixel("open: round corners", pixelAt(t.left + 2.dp, t.top + 2.dp), surface)
        val openIcon = filled.enabled.openIconColor.resolve(colors)
        val closePixels = count(t, openIcon)
        assertTrue("the close glyph, strokes only: $closePixels", closePixels in 1 until slotPixels)
    }

    // ── FBM-7: unknown values ────────────────────────────────────────────────

    @Test
    fun `FBM-7 a variant or size the system does not have draws with the default's tokens, and a debuggable app reports it`() = collectingReports { reports ->
        showMenu()
        val expected = stage()
        setDebuggable(true)
        showMenu(variant = TanreiFabMenuVariant("ghost"), size = TanreiFabMenuSize("jumbo"))
        assertSameAs(expected, stage(), "unknown values")
        assertTrue(reports.toString(), reports.any { "ghost" in it } && reports.any { "jumbo" in it })
    }

    // ── FBM-8 / FBM-9 / FBM-10: press and corners ────────────────────────────

    @Test
    fun `FBM-8 a tap that ends at once shows the pressed state on the next frame and keeps it for press-hold`() {
        follow = false
        showMenu()
        val t = toggleRect()
        val hold = tanrei.motion.duration.pressHold.toLong()
        val pressed = filled.pressed.containerColor.resolve(colors).compositeOver(surface)
        rule.mainClock.autoAdvance = false
        toggle().performTouchInput { down(center); up() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("pressed", pixelAt(t.left + 4.dp, t.top + 8.dp), pressed)
        rule.mainClock.advanceTimeBy(hold / 2)
        assertPixel("still pressed", pixelAt(t.left + 4.dp, t.top + 8.dp), pressed)
        rule.mainClock.advanceTimeBy(hold + tokens.motionStateDuration * 2L)
        assertPixel("at rest", pixelAt(t.left + 4.dp, t.top + 8.dp), filled.enabled.containerColor.resolve(colors))
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `FBM-9 ripple grows the toggle's pressed color from the point of contact, dim dims it, and an item answers its own press`() {
        assertEquals(TanreiPressedFeedback.Ripple, TanreiSystem.M3Like.behavior.pressedFeedback)
        follow = false
        showMenu(system = tanrei.answering(TanreiPressedFeedback.Ripple))
        val t = toggleRect()
        val node = toggle().getUnclippedBoundsInRoot()
        val pressed = filled.pressed.containerColor.resolve(colors)
        rule.mainClock.autoAdvance = false
        toggle().performTouchInput { down(Offset((t.left - node.left + 6.dp).toPx(), (t.top - node.top + 6.dp).toPx())) }
        rule.mainClock.advanceTimeBy(50)
        assertPixel("at the point of contact", pixelAt(t.left + 6.dp, t.top + 6.dp), pressed)
        assertPixel("not yet at the far corner", pixelAt(t.right - 6.dp, t.bottom - 6.dp), filled.enabled.containerColor.resolve(colors))
        rule.mainClock.advanceTimeBy(tokens.motionFeedbackDuration.toLong())
        assertPixel("grown", pixelAt(t.right - 6.dp, t.bottom - 6.dp), pressed)
        toggle().performTouchInput { up() }
        rule.mainClock.autoAdvance = true
        val cupertino = TanreiSystem.Cupertino
        assertEquals(TanreiPressedFeedback.Dim, cupertino.behavior.pressedFeedback)
        showMenu(system = cupertino)
        val before = stage()
        toggle().performTouchInput { down(center) }
        rule.waitForIdle()
        assertTrue("dimmed", differing(before, stage()) > 0)
        toggle().performTouchInput { up() }
        expanded = true
        showMenu(inPlace = true)
        val i = rule.onNodeWithTag(item(0)).getUnclippedBoundsInRoot()
        rule.onNodeWithTag(item(0)).performTouchInput { down(center) }
        rule.waitForIdle()
        assertPixel("the item's pressed container", pixelAt(i.left + 4.dp, i.top + 24.dp), filled.pressed.itemContainerColor.resolve(colors).compositeOver(surface))
        rule.onNodeWithTag(item(0)).performTouchInput { up() }
    }

    @Test
    fun `FBM-10 corners eased by corner smoothing, and glow under acme`() {
        for (smoothing in listOf(0f, 0.6f)) {
            showMenu(system = tanrei.copy(shape = tanrei.shape.copy(cornerSmoothing = smoothing)))
            val t = toggleRect()
            assertPixel("smoothing $smoothing: the very corner is outside", pixelAt(t.left + 0.5.dp, t.top + 0.5.dp), surface)
            assertPixel("inside the corner, clear of the glyph", pixelAt(t.left + tokens.sizes.medium.containerShape / 2, t.top + tokens.sizes.medium.containerShape), filled.enabled.containerColor.resolve(colors))
        }
        assertEquals(TanreiFocusStyle.Glow, TanreiSystem.Acme.behavior.focusStyle)
    }

    @Test
    @KeyboardNavigation
    fun `FBM-10 glow draws a halo around the toggle under acme`() {
        val acme = TanreiSystem.Acme
        showMenu(system = acme)
        val acmeSurface = acme.colors.light[TanreiColorRole.Surface]
        val t = toggleRect(acmeSurface)
        toggle().requestFocus()
        rule.waitForIdle()
        val band = (1..12).map { pixelAt((t.left + t.right) / 2, t.top - it.dp) }
        assertTrue("a halo above: $band", band.any { !isClose(it, acmeSurface) })
    }

    // ── FBM-13 / FBM-14 / FBM-15 / FBM-16 / FBM-17: the items ────────────────

    @Test
    @KeyboardNavigation
    fun `FBM-13 opening moves focus to the first item, Up Arrow to the last, and closing removes the items and returns focus to the toggle`() {
        showMenu()
        toggle().requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        rule.onNodeWithTag(item(0)).assertIsFocused().performKeyInput { pressKey(Key.Escape) }
        rule.waitForIdle()
        assertEquals(0, popups())
        toggle().assertIsFocused().performKeyInput { pressKey(Key.DirectionUp) }
        rule.waitForIdle()
        rule.onNodeWithTag(item(2)).assertIsFocused()
        assertEquals(listOf("toggle:true", "close:Escape", "toggle:true"), events)
    }

    @Test
    fun `FBM-13 FBM-22 the items stack above the toggle, list-offset and list-gap apart, end-aligned with it - with its left edge right-to-left`() {
        expanded = true
        showMenu(inPlace = true)
        val t = toggleRect()
        val items = (0..2).map { rule.onNodeWithTag(item(it)).getUnclippedBoundsInRoot() }
        assertEquals("list-offset above the toggle", tokens.listOffset.value, (t.top - items[2].bottom).value, 0.6f)
        assertEquals("list-gap apart", tokens.listGap.value, (items[1].top - items[0].bottom).value, 0.6f)
        items.forEach { assertEquals("end-aligned", t.right.value, it.right.value, 0.6f) }
        showMenu(inPlace = true, direction = LayoutDirection.Rtl)
        val rtl = toggleRect()
        (0..2).forEach { assertEquals("right-to-left: the toggle's left edge", rtl.left.value, rule.onNodeWithTag(item(it)).getUnclippedBoundsInRoot().left.value, 0.6f) }
        expanded = false
        showMenu()
        toggle().performClick()
        rule.waitForIdle()
        val toggleNode = toggle().fetchSemanticsNode()
        val last = rule.onNodeWithTag(item(2)).fetchSemanticsNode()
        val inset = (toggleNode.size.width - with(rule.density) { tokens.sizes.medium.containerSize.roundToPx() }) / 2f
        assertEquals("the popup's items end on the toggle's end", toggleNode.positionOnScreen.x + toggleNode.size.width - inset, last.positionOnScreen.x + last.size.width, 2f)
        assertTrue("above it", last.positionOnScreen.y + last.size.height < toggleNode.positionOnScreen.y + inset)
    }

    @Test
    fun `FBM-14 open draws no scrim - the rest of the screen stays as it was`() {
        showMenu()
        val before = stage()
        toggle().performClick()
        rule.waitForIdle()
        val after = stage()
        val t = toggleRect()
        with(rule.density) { assertTrue("the top of the stage unchanged", isClose(before[10, 10], after[10, 10]) && isClose(before[(t.left - 40.dp).roundToPx(), 40.dp.roundToPx()], after[(t.left - 40.dp).roundToPx(), 40.dp.roundToPx()])) }
    }

    @Test
    @KeyboardNavigation
    fun `FBM-15 Tab on an item closes with Tab and moves focus on from the toggle`() {
        showMenu()
        toggle().requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        rule.onNodeWithTag(item(0)).assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        assertEquals(listOf("toggle:true", "close:Tab"), events)
        rule.onNodeWithTag(AFTER).assertIsFocused()
    }

    @Test
    @KeyboardNavigation
    fun `FBM-15 Back closes with Back`() {
        showMenu()
        toggle().requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        rule.onNodeWithTag(item(0)).performKeyInput { pressKey(Key.Back) }
        rule.waitForIdle()
        assertEquals(listOf("toggle:true", "close:Back"), events)
    }

    @Test
    fun `FBM-15 a press on the toggle while open emits toggle false and no close, and a press elsewhere closes with Outside`() {
        showMenu()
        toggle().performClick()
        rule.waitForIdle()
        // The popup's window view: the parent of the view its items' glyphs are composed in.
        val window = popupView!!.parent as android.view.View
        val location = IntArray(2).also { window.getLocationOnScreen(it) }
        val t = toggle().fetchSemanticsNode()
        val down = android.view.MotionEvent.obtain(0L, 0L, android.view.MotionEvent.ACTION_DOWN, t.positionOnScreen.x + t.size.width / 2f - location[0], t.positionOnScreen.y + t.size.height / 2f - location[1], 0)
        rule.runOnUiThread { window.dispatchTouchEvent(down) }
        down.recycle()
        rule.waitForIdle()
        assertEquals(listOf("toggle:true", "toggle:false"), events)
        toggle().performClick()
        rule.waitForIdle()
        val again = popupView!!.parent as android.view.View
        val far = android.view.MotionEvent.obtain(0L, 0L, android.view.MotionEvent.ACTION_DOWN, -10f, -200f, 0)
        rule.runOnUiThread { again.dispatchTouchEvent(far) }
        far.recycle()
        rule.waitForIdle()
        assertEquals(listOf("toggle:true", "toggle:false", "toggle:true", "close:Outside"), events)
    }

    @Test
    fun `FBM-16 activating an item emits its click, then close with the reason Item`() {
        showMenu()
        toggle().performClick()
        rule.waitForIdle()
        rule.onNodeWithTag(item(1)).performClick()
        rule.waitForIdle()
        assertEquals(listOf("toggle:true", "click:Folder", "close:Item"), events)
    }

    @Test
    @KeyboardNavigation
    fun `FBM-17 Down and Up move among the items, wrapping, and Home and End reach the ends`() {
        showMenu()
        toggle().requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        var at = 0
        fun press(key: Key, then: Int) {
            rule.onNodeWithTag(item(at)).performKeyInput { pressKey(key) }
            rule.waitForIdle()
            rule.onNodeWithTag(item(then)).assertIsFocused()
            at = then
        }
        rule.onNodeWithTag(item(0)).assertIsFocused()
        press(Key.DirectionDown, 1)
        press(Key.DirectionDown, 2)
        press(Key.DirectionDown, 0)
        press(Key.DirectionUp, 2)
        press(Key.MoveHome, 0)
        press(Key.MoveEnd, 2)
    }

    // ── FBM-18: the items ────────────────────────────────────────────────────

    @Test
    fun `FBM-18 an item is at least item-height tall, its icon then its label item-gap apart and padded, its label wrapping, casting its elevation`() {
        expanded = true
        val hard = listOf(TanreiShadowLayer(0.dp, 0.dp, 0.dp, 0.dp, TanreiColorRole.Success), TanreiShadowLayer(0.dp, 0.dp, 0.dp, 3.dp, TanreiColorRole.Success))
        showMenu(system = tanrei.withFabMenu(TanreiInteractionState.Enabled) { it.copy(itemContainerElevation = hard) }, inPlace = true, labels = listOf("Document", "A very long name for a folder, long enough that it has to wrap onto three lines of text somewhere here", "Upload"))
        val i0 = rule.onNodeWithTag(item(0)).getUnclippedBoundsInRoot()
        assertEquals(tokens.itemHeight.value, (i0.bottom - i0.top).value, 0.6f)
        assertPixel("the elevation outside the item", pixelAt((i0.left + i0.right) / 2, i0.top - 2.dp), colors[TanreiColorRole.Success])
        val i1 = rule.onNodeWithTag(item(1)).getUnclippedBoundsInRoot()
        assertTrue("the long label wraps and the item grows: ${i1.bottom - i1.top}", i1.bottom - i1.top > tokens.itemHeight)
        val itemFill = filled.enabled.itemContainerColor.resolve(colors)
        assertPixel("the start padding holds no glyph", pixelAt(i0.left + tokens.itemPaddingInlineStart - 2.dp, (i0.top + i0.bottom) / 2), itemFill)
        assertPixel("the rounded corner", pixelAt(i0.left + 0.5.dp, i0.top + 0.5.dp), surface)
    }

    // ── FBM-19: motion ───────────────────────────────────────────────────────

    @Test
    fun `FBM-19 opening moves the toggle's colors over the open motion, and the items appear one after another from the nearest`() {
        val slow = 400
        val system = tanrei.copy(fabMenu = tokens.copy(motionOpenDuration = slow, motionOpenEasing = tanrei.motion.easing.linear, motionStagger = slow))
        showMenu(system = system)
        val t = toggleRect()
        val from = filled.enabled.containerColor.resolve(colors)
        val to = filled.enabled.openContainerColor.resolve(colors)
        rule.mainClock.autoAdvance = false
        expanded = true
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(slow / 2L)
        val half = pixelAt(t.left + 10.dp, t.top + 10.dp)
        assertTrue("the toggle on its way: $half", !isClose(half, from) && !isClose(half, to))
        // A stagger of 400: at 600 the nearest item has fully appeared and the farthest has not begun.
        rule.mainClock.advanceTimeBy(slow.toLong())
        val nearest = drawnPixels(item(2))
        val farthest = drawnPixels(item(0))
        assertTrue("the nearest item is appearing before the farthest: $nearest vs $farthest", nearest > farthest)
        rule.mainClock.advanceTimeBy(slow * 4L)
        assertPixel("arrived", pixelAt(t.left + 10.dp, t.top + 10.dp), to)
        assertTrue("every item shown", drawnPixels(item(0)) > 0.5f)
        rule.mainClock.autoAdvance = true
    }

    // ── FBM-20: semantics ────────────────────────────────────────────────────

    @Test
    fun `FBM-20 the toggle is a button named by label that opens a menu, and the items a named collection of buttons`() {
        showMenu()
        toggle().assert(SemanticsMatcher.keyIsDefined(SemanticsActions.Expand))
        toggle().performSemanticsAction(SemanticsActions.Expand)
        rule.waitForIdle()
        toggle().assert(SemanticsMatcher.keyIsDefined(SemanticsActions.Collapse))
        val first = rule.onNodeWithTag(item(0))
        first.assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
        first.assert(SemanticsMatcher.expectValue(SemanticsProperties.Text, listOf(androidx.compose.ui.text.AnnotatedString("Document"))))
        assertEquals(2, rule.onNodeWithTag(item(2)).fetchSemanticsNode().config[SemanticsProperties.CollectionItemInfo].rowIndex)
        val list = rule.onNode(SemanticsMatcher.keyIsDefined(SemanticsProperties.CollectionInfo) and SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf("Create"))).fetchSemanticsNode()
        assertEquals(3, list.config[SemanticsProperties.CollectionInfo].rowCount)
        assertTrue(list.config[SemanticsProperties.IsTraversalGroup])
        assertEquals("the glyphs are hidden", 0, rule.onAllNodes(hasText("description"), useUnmergedTree = true).fetchSemanticsNodes().size)
    }

    // ── FBM-21: elevation and state motion ───────────────────────────────────

    @Test
    fun `FBM-21 the toggle casts its elevation outside itself, and a change of state moves over the state motion`() {
        val hard = listOf(TanreiShadowLayer(0.dp, 0.dp, 0.dp, 0.dp, TanreiColorRole.Success), TanreiShadowLayer(0.dp, 0.dp, 0.dp, 3.dp, TanreiColorRole.Success))
        showMenu(system = tanrei.withFabMenu(TanreiInteractionState.Enabled) { it.copy(containerElevation = hard) })
        val t = toggleRect(surface, colors[TanreiColorRole.Success])
        assertPixel("outside the toggle", pixelAt((t.left + t.right) / 2, t.top - 2.dp), colors[TanreiColorRole.Success])
        val slow = 400
        val system = tanrei.withFabMenu(TanreiInteractionState.Hovered) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Success)) }
            .let { it.copy(fabMenu = it.fabMenu.copy(motionStateDuration = slow, motionStateEasing = tanrei.motion.easing.linear)) }
        showMenu(system = system)
        val r = toggleRect()
        rule.mainClock.autoAdvance = false
        toggle().performMouseInput { moveTo(center) }
        rule.mainClock.advanceTimeBy(slow / 2L)
        val half = pixelAt(r.left + 4.dp, r.top + 8.dp)
        assertTrue("on its way: $half", !isClose(half, filled.enabled.containerColor.resolve(colors)) && !isClose(half, colors[TanreiColorRole.Success]))
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertPixel("arrived", pixelAt(r.left + 4.dp, r.top + 8.dp), colors[TanreiColorRole.Success])
        rule.mainClock.autoAdvance = true
    }

    // ── FBM-22: right to left ────────────────────────────────────────────────

    @Test
    fun `FBM-22 right-to-left mirrors an item - its icon to the right of its label`() {
        expanded = true
        showMenu(inPlace = true, direction = LayoutDirection.Rtl)
        val i = rule.onNodeWithTag(item(0)).getUnclippedBoundsInRoot()
        val fill = filled.enabled.itemContainerColor.resolve(colors)
        assertPixel("the start padding, now on the right, holds no glyph", pixelAt(i.right - tokens.itemPaddingInlineStart + 2.dp, (i.top + i.bottom) / 2), fill)
        val glyphX = i.right - tokens.itemPaddingInlineStart - tokens.itemIconSize / 2
        assertFalse("the icon just inside it", isClose(pixelAt(glyphX, (i.top + i.bottom) / 2 + 3.dp), fill) && isClose(pixelAt(glyphX, (i.top + i.bottom) / 2 - 3.dp), fill) && isClose(pixelAt(glyphX, (i.top + i.bottom) / 2), fill))
    }

    // ── FBM-23: reports ──────────────────────────────────────────────────────

    @Test
    fun `FBM-23 an empty label, an item without a label or icon, and one item or seven still render, and a debuggable app reports them`() = collectingReports { reports ->
        setDebuggable(true)
        expanded = true
        showMenu(label = "", labels = listOf("", "Folder"), icons = listOf("description", ""), inPlace = true)
        rule.onNodeWithTag(item(0)).assertExists()
        rule.waitForIdle()
        assertTrue(reports.toString(), reports.any { "TanreiFabMenu" in it && "contentDescription" in it })
        assertTrue(reports.toString(), reports.any { "TanreiFabMenuItem" in it && "text" in it })
        assertTrue(reports.toString(), reports.any { "icon is empty" in it })
        showMenu(labels = listOf("Only"), inPlace = true)
        rule.waitForIdle()
        assertTrue(reports.toString(), reports.any { "holds 1 items" in it })
        showMenu(labels = (1..7).map { "Item $it" }, inPlace = true)
        rule.waitForIdle()
        assertTrue(reports.toString(), reports.any { "holds 7 items" in it })
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

    /** The toggle's drawn square: the pixels inside its node that differ from [background] (and [ignore]). */
    private fun toggleRect(background: Color = surface, ignore: Color? = null): DpRect {
        val map = stage()
        val stage = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
        val bounds = toggle().getUnclippedBoundsInRoot()
        return with(rule.density) {
            val left = (bounds.left - stage.left).roundToPx()
            val right = (bounds.right - stage.left).roundToPx()
            val top = (bounds.top - stage.top).roundToPx()
            val bottom = (bounds.bottom - stage.top).roundToPx()
            fun counts(x: Int, y: Int) = !isClose(map[x, y], background) && (ignore == null || !isClose(map[x, y], ignore))
            val midY = (top + bottom) / 2
            val midX = (left + right) / 2
            val columns = (left until right).filter { counts(it, midY) }
            val rows = (top until bottom).filter { counts(midX, it) }
            DpRect(stage.left + columns.first().toDp(), stage.top + rows.first().toDp(), stage.left + (columns.last() + 1).toDp(), stage.top + (rows.last() + 1).toDp())
        }
    }

    private fun count(rect: DpRect, color: Color): Int {
        val map = stage()
        val stage = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
        return with(rule.density) {
            ((rect.top - stage.top).roundToPx() until (rect.bottom - stage.top).roundToPx()).sumOf { y ->
                ((rect.left - stage.left).roundToPx() until (rect.right - stage.left).roundToPx()).count { x -> isClose(map[x, y], color) }
            }
        }
    }

    /**
     * How much of item [tag] is drawn, 0 to 1: the share of its bounds that is opaque in a capture of the items' column
     * (the item's own layer — its fade and growth — is drawn into its parent, and the popup is transparent around it).
     */
    private fun drawnPixels(tag: String): Float {
        val column = rule.onNode(SemanticsMatcher.keyIsDefined(SemanticsProperties.CollectionInfo) and SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf("Create")))
        val map = column.captureToImage().toPixelMap()
        val origin = column.getUnclippedBoundsInRoot()
        val bounds = rule.onNodeWithTag(tag).getUnclippedBoundsInRoot()
        return with(rule.density) {
            val xs = (bounds.left - origin.left).roundToPx() until (bounds.right - origin.left).roundToPx()
            val ys = (bounds.top - origin.top).roundToPx() until (bounds.bottom - origin.top).roundToPx()
            ys.sumOf { y -> xs.count { x -> x in 0 until map.width && y in 0 until map.height && map[x, y].alpha > 0.05f } }.toFloat() / (xs.count() * ys.count()).coerceAtLeast(1)
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
        const val TOGGLE_BOX = "fab-menu"
        const val BEFORE = "before"
        const val AFTER = "after"
        val THREE = listOf("Document", "Folder", "Upload")
        val ICONS = listOf("description", "create_new_folder", "upload")
        const val PIXEL_TOLERANCE = 2f / 255f
    }
}

/** FBM-19 and FBM-21 where motion is reduced (the animator duration scale is 0, see `TanreiButtonReducedMotionTest`). */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiFabMenuReducedMotionTest {
    private object NoMotion : MotionDurationScale {
        override val scaleFactor: Float = 0f
    }

    @get:Rule
    val rule = createComposeRule(effectContext = NoMotion)

    private var expanded by mutableStateOf(false)

    @Test
    fun `FBM-19 FBM-21 where motion is reduced the toggle, its glyph and every item change at once`() {
        val tanrei = TanreiSystem.Tanrei
        val slow = tanrei.fabMenu.copy(motionOpenDuration = 1000, motionStagger = 1000, motionStateDuration = 1000)
        rule.setContent {
            CompositionLocalProvider(LocalTanreiGlyphStandIn provides { name -> NamedFixtureGlyph(name) }) {
                TanreiTheme(system = tanrei.copy(fabMenu = slow), theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                    Box(Modifier.size(320.dp, 400.dp).background(TanreiColorRole.Surface.color), contentAlignment = Alignment.BottomEnd) {
                        TanreiFabMenu(expanded = expanded, onExpandedChange = { expanded = it }, onDismissRequest = { expanded = false }, contentDescription = "Create", icon = {}) {
                            TanreiFabMenuItem("Document", onClick = {}, icon = "description", modifier = Modifier.testTag("item-0"))
                            TanreiFabMenuItem("Folder", onClick = {}, icon = "create_new_folder", modifier = Modifier.testTag("item-1"))
                        }
                    }
                }
            }
        }
        rule.waitForIdle()
        rule.mainClock.autoAdvance = false
        expanded = true
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        repeat(10) { rule.mainClock.advanceTimeByFrame() }
        // The farthest item would start only after a stagger of 1000 and take 1000 more: it is there at once.
        val column = rule.onNode(SemanticsMatcher.keyIsDefined(SemanticsProperties.CollectionInfo))
        val map = column.captureToImage().toPixelMap()
        val origin = column.getUnclippedBoundsInRoot()
        val bounds = rule.onNodeWithTag("item-0").getUnclippedBoundsInRoot()
        val shown = with(rule.density) {
            val xs = (bounds.left - origin.left).roundToPx() until (bounds.right - origin.left).roundToPx()
            val ys = (bounds.top - origin.top).roundToPx() until (bounds.bottom - origin.top).roundToPx()
            ys.sumOf { y -> xs.count { x -> map[x, y].alpha > 0.9f } }.toFloat() / (xs.count() * ys.count())
        }
        assertTrue("the farthest item fully shown at once: $shown", shown > 0.5f)
        rule.mainClock.autoAdvance = true
    }
}
