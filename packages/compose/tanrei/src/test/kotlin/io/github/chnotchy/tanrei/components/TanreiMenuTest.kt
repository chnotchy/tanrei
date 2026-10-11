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
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertHeightIsEqualTo
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.assertWidthIsEqualTo
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.isPopup
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performMouseInput
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performSemanticsAction
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.test.withKeyDown
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntRect
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.acme.design.Acme
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.primitives.TanreiText
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
import io.github.chnotchy.tanrei.tokens.TanreiMenuCondition
import io.github.chnotchy.tanrei.tokens.TanreiMenuConditionStateTokens
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiPressedFeedback
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
 * Behaviour tests for `specs/menu.spec.json`. Each test names the behaviour id (`MNU-n`) it covers. Runs on the JVM
 * (Robolectric, native graphics) — no emulator needed.
 *
 * The overlay's own behaviour (MNU-1, MNU-2, MNU-4, MNU-5, MNU-25) is tested on `TanreiMenu` in its popup, opened from
 * an anchor button between two focusable boxes; placement also on the pure `tanreiMenuPosition`. Everything an item
 * draws or does is tested on the in-place form (`TanreiMenuInPlace`, what the baselines draw) on the surface.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiMenuTest {
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
    private val tokens = tanrei.menu
    private val measure = tanrei.measure
    private val surface = colors[TanreiColorRole.Surface]
    private val menuSurface = tokens.surfaceColor.resolve(colors)

    private val events = mutableListOf<String>()
    private var expanded by mutableStateOf(false)
    private var grid by mutableStateOf(false)
    private var sort by mutableStateOf<String?>("name")
    private var seenGlyph: TanreiIconGlyph? = null
    private var seenIconColor: Color = Color.Unspecified

    private class Scene(val system: TanreiSystem, val direction: LayoutDirection, val fontScale: Float, val content: @Composable () -> Unit)

    private var scene by mutableStateOf<Scene?>(null)

    private fun show(system: TanreiSystem = tanrei, direction: LayoutDirection = LayoutDirection.Ltr, fontScale: Float = 1f, content: @Composable () -> Unit) {
        val first = scene == null
        scene = Scene(system, direction, fontScale, content)
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
                        Box(Modifier.testTag(STAGE_TAG).background(TanreiColorRole.Surface.color).padding(STAGE)) { current.content() }
                    }
                }
            }
        }
        rule.waitForIdle()
    }

    /** The in-place menu (what the baselines draw); [onClose] records `close:<reason>`. */
    private fun showInPlace(system: TanreiSystem = tanrei, direction: LayoutDirection = LayoutDirection.Ltr, fontScale: Float = 1f, items: @Composable () -> Unit) =
        show(system, direction, fontScale) { TanreiMenuInPlace(onDismissRequest = { events += "close:$it" }, modifier = Modifier.testTag(SURFACE_TAG)) { items() } }

    /** Three actions, the last disabled or destructive as asked; the first has a [Swatch] as its icon. */
    private fun showActions(system: TanreiSystem = tanrei, disabledLast: Boolean = false, destructiveLast: Boolean = false, direction: LayoutDirection = LayoutDirection.Ltr) =
        showInPlace(system, direction) {
            TanreiMenuItem(CUT, onClick = { events += "click:cut" }, modifier = Modifier.testTag(tag(0)), leadingIcon = { Swatch() })
            TanreiMenuItem(COPY, onClick = { events += "click:copy" }, modifier = Modifier.testTag(tag(1)))
            TanreiMenuItem(PASTE, onClick = { events += "click:paste" }, modifier = Modifier.testTag(tag(2)), enabled = !disabledLast, destructive = destructiveLast)
        }

    /** An anchor button that opens the menu (between two focusable boxes), and the menu of [items]. */
    private fun showAnchored(system: TanreiSystem = tanrei, placement: TanreiMenuPlacement = TanreiMenuPlacement.BottomStart, items: @Composable () -> Unit = { AnchoredItems() }) =
        show(system) {
            Column {
                Box(Modifier.testTag(BEFORE).size(8.dp).focusable())
                Box {
                    TanreiButton(text = "More", onClick = { expanded = true }, modifier = Modifier.testTag(ANCHOR))
                    TanreiMenu(expanded = expanded, onDismissRequest = { events += "close:$it"; expanded = false }, placement = placement) { items() }
                }
                Box(Modifier.testTag(AFTER).size(8.dp).focusable())
            }
        }

    @Composable
    private fun AnchoredItems() {
        TanreiMenuItem(CUT, onClick = { events += "click:cut" }, modifier = Modifier.testTag(tag(0)), enabled = false)
        TanreiMenuItem(COPY, onClick = { events += "click:copy" }, modifier = Modifier.testTag(tag(1)))
        TanreiCheckboxMenuItem("Show grid", checked = grid, onCheckedChange = { events += "grid:$it"; grid = it }, modifier = Modifier.testTag(tag(2)))
    }

    /** A titled group of checkbox items and a titled group of radio items (the `group-titles` fixture). */
    private fun showGroups(system: TanreiSystem = tanrei) = showInPlace(system) {
        TanreiMenuGroup(modifier = Modifier.testTag(GROUP_TAG), title = "View") {
            TanreiCheckboxMenuItem("Show grid", checked = grid, onCheckedChange = { events += "grid:$it"; grid = it }, modifier = Modifier.testTag(tag(0)))
            TanreiCheckboxMenuItem("Show rulers", checked = false, onCheckedChange = { events += "rulers:$it" }, modifier = Modifier.testTag(tag(1)))
        }
        TanreiMenuGroup(title = "Sort by", selectedValue = sort, onSelectedValueChange = { events += "sort:$it"; sort = it }) {
            TanreiRadioMenuItem("Name", value = "name", modifier = Modifier.testTag(tag(2)))
            TanreiRadioMenuItem("Date", value = "date", modifier = Modifier.testTag(tag(3)))
            TanreiRadioMenuItem("Size", value = "size", modifier = Modifier.testTag(tag(4)))
        }
    }

    /** The in-place surface with a height limit, as the popup gives it the room left (MNU-2). */
    @Composable
    private fun TanreiMenuSurfaceForTest(maxHeight: Int, items: @Composable () -> Unit) =
        TanreiMenuInPlace(onDismissRequest = { events += "close:$it" }, modifier = Modifier.testTag(SURFACE_TAG), maxHeight = maxHeight, content = items)

    @Composable
    private fun Swatch() {
        seenIconColor = LocalTanreiContentColor.current
        seenGlyph = LocalTanreiIconGlyph.current
        Box(Modifier.fillMaxSize().background(LocalTanreiContentColor.current))
    }

    private fun tag(index: Int) = "item-$index"

    private fun item(index: Int) = rule.onNodeWithTag(tag(index))

    // ── MNU-1 / MNU-25: presented in a popup, focus in and back, not modal ────

    @Test
    @KeyboardNavigation
    fun `MNU-1 opening presents the surface in a popup and moves focus to the first enabled item - closing removes it and the anchor has focus again`() {
        showAnchored()
        rule.onNodeWithTag(ANCHOR).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals(1, rule.onAllNodes(isPopup()).fetchSemanticsNodes().size)
        item(1).assertIsFocused()
        item(1).performKeyInput { pressKey(Key.Escape) }
        rule.waitForIdle()
        assertEquals(listOf("close:Escape"), events)
        assertEquals(0, rule.onAllNodes(isPopup()).fetchSemanticsNodes().size)
        rule.onNodeWithTag(ANCHOR).assertIsFocused()
    }

    @Test
    fun `MNU-25 the open menu draws no scrim and leaves the rest of the screen as it was`() {
        showAnchored()
        val before = rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap()
        rule.onNodeWithTag(ANCHOR).performClick()
        rule.waitForIdle()
        assertEquals(1, rule.onAllNodes(isPopup()).fetchSemanticsNodes().size)
        val after = rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap()
        assertSameAs(before, after, "the screen under the open menu")
        rule.onNodeWithTag(AFTER).assertExists()
    }

    @Test
    @KeyboardNavigation
    fun `MNU-25 Tab leaves the menu - it closes and focus moves on from the anchor, forwards and backwards`() {
        showAnchored()
        rule.onNodeWithTag(ANCHOR).requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        item(1).assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        assertEquals(listOf("close:Tab"), events)
        rule.onNodeWithTag(AFTER).assertIsFocused()
        rule.onNodeWithTag(ANCHOR).requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        item(1).assertIsFocused().performKeyInput { withKeyDown(Key.ShiftLeft) { pressKey(Key.Tab) } }
        rule.waitForIdle()
        rule.onNodeWithTag(BEFORE).assertIsFocused()
    }

    // ── MNU-2: placement ─────────────────────────────────────────────────────

    private val window = IntSize(1000, 1000)
    private val anchor = IntRect(left = 100, top = 400, right = 300, bottom = 450)
    private val menu = IntSize(400, 300)

    private fun at(placement: TanreiMenuPlacement, anchor: IntRect = this.anchor, direction: LayoutDirection = LayoutDirection.Ltr, surface: IntSize = menu) =
        tanreiMenuPosition(placement, anchor, window, direction, surface, offset = OFFSET, margin = MARGIN)

    @Test
    fun `MNU-2 each placement puts the surface offset from the anchor on its side, with the named edges aligned`() {
        assertEquals(TanreiMenuResolvedPosition(androidx.compose.ui.unit.IntOffset(100, 450 + OFFSET), below = true), at(TanreiMenuPlacement.BottomStart))
        assertEquals(TanreiMenuResolvedPosition(androidx.compose.ui.unit.IntOffset(300 - 400, 450 + OFFSET).let { androidx.compose.ui.unit.IntOffset(MARGIN, it.y) }, below = true), at(TanreiMenuPlacement.BottomEnd))
        assertEquals(400 - OFFSET - 300, at(TanreiMenuPlacement.TopStart).offset.y)
        assertFalse(at(TanreiMenuPlacement.TopEnd).below)
    }

    @Test
    fun `MNU-2 right-to-left mirrors start and end`() {
        val wide = IntRect(left = 500, top = 400, right = 900, bottom = 450)
        assertEquals("start is the right edge", 900 - 400, at(TanreiMenuPlacement.BottomStart, wide, LayoutDirection.Rtl).offset.x)
        assertEquals("end is the left edge", 500, at(TanreiMenuPlacement.BottomEnd, wide, LayoutDirection.Rtl).offset.x)
    }

    @Test
    fun `MNU-2 without room on its side and with more on the other the surface flips, and it shifts to stay inside the margin`() {
        val low = IntRect(left = 100, top = 800, right = 300, bottom = 850)
        val flipped = at(TanreiMenuPlacement.BottomStart, low)
        assertFalse("flipped above", flipped.below)
        assertEquals(800 - OFFSET - 300, flipped.offset.y)
        val high = IntRect(left = 100, top = 100, right = 300, bottom = 150)
        assertTrue("TopStart flips below", at(TanreiMenuPlacement.TopStart, high).below)
        val right = IntRect(left = 800, top = 400, right = 990, bottom = 450)
        assertEquals("shifted inside the margin", window.width - MARGIN - menu.width, at(TanreiMenuPlacement.BottomStart, right).offset.x)
        val tooLow = IntRect(left = 100, top = 480, right = 300, bottom = 520)
        assertTrue("both sides short and below has more: it stays", at(TanreiMenuPlacement.BottomStart, tooLow, surface = IntSize(400, 900)).below)
    }

    @Test
    fun `MNU-2 the popup limits the surface's height to the larger room left, so a surface too tall scrolls`() {
        val position = MenuPosition()
        val provider = TanreiMenuPositionProvider(TanreiMenuPlacement.BottomStart, offset = OFFSET, margin = MARGIN, position = position)
        provider.calculatePosition(anchor, window, LayoutDirection.Ltr, IntSize(400, 2000))
        assertEquals("the room below the anchor, which is the larger", window.height - MARGIN - (anchor.bottom + OFFSET), position.room)
        assertTrue(position.below)
        showInPlace { repeat(3) { TanreiMenuItem("Item $it", onClick = {}, modifier = Modifier.testTag(tag(it))) } }
        val limit = 100.dp
        show { TanreiMenuSurfaceForTest(maxHeight = with(rule.density) { limit.roundToPx() }) { repeat(8) { TanreiMenuItem("Item $it", onClick = {}, modifier = Modifier.testTag(tag(it))) } } }
        rule.onNodeWithTag(SURFACE_TAG).assertHeightIsEqualTo(limit)
        item(7).performScrollTo()
        rule.waitForIdle()
        item(7).assertExists()
    }

    @Test
    fun `MNU-2 in its popup the surface sits surface-offset below the anchor, start edges aligned`() {
        var popupView: android.view.View? = null
        showAnchored { TanreiMenuItem(COPY, onClick = {}, leadingIcon = { popupView = androidx.compose.ui.platform.LocalView.current }) }
        rule.onNodeWithTag(ANCHOR).performClick()
        rule.waitForIdle()
        // The anchor's Box is what the popup is placed against: its layout box (the button's reserved touch target).
        val anchorBox = rule.onNodeWithTag(ANCHOR).fetchSemanticsNode().boundsInWindow
        val params = (popupView!!.parent as android.view.View).layoutParams as android.view.WindowManager.LayoutParams
        with(rule.density) {
            assertEquals("surface-offset below the anchor", anchorBox.bottom + tokens.surfaceOffset.toPx(), params.y.toFloat(), 1.5f)
            assertEquals("start edges aligned", anchorBox.left, params.x.toFloat(), 1.5f)
        }
    }

    // ── MNU-3: the surface ───────────────────────────────────────────────────

    @Test
    fun `MNU-3 the surface is as wide as its widest item between min-width and max-width, in its color and padding`() {
        showActions()
        rule.onNodeWithTag(SURFACE_TAG).assertWidthIsEqualTo(tokens.surfaceMinWidth)
        val row = item(0).getUnclippedBoundsInRoot()
        val box = rule.onNodeWithTag(SURFACE_TAG).getUnclippedBoundsInRoot()
        assertEquals((box.left + tokens.surfacePaddingInline).value, row.left.value, 0.5f)
        assertEquals((box.top + tokens.surfacePaddingBlock).value, row.top.value, 0.5f)
        assertPixel("the surface color in its padding", stagePixel(STAGE + (box.right - box.left) / 2, STAGE + tokens.surfacePaddingBlock / 2), menuSurface)
        val narrow = 200.dp
        showInPlace(system = tanrei.copy(menu = tokens.copy(surfaceMaxWidth = narrow))) { TanreiMenuItem(LONG, onClick = {}, modifier = Modifier.testTag(tag(0))) }
        rule.onNodeWithTag(SURFACE_TAG).assertWidthIsEqualTo(narrow)
        val long = rule.onNodeWithTag(tag(0)).getUnclippedBoundsInRoot()
        assertTrue("the long label wraps", long.bottom - long.top > measure.targetTouch)
        showInPlace {
            TanreiMenuItem("Show every formatting mark", onClick = {}, modifier = Modifier.testTag(tag(0)))
            TanreiMenuItem("Cut", onClick = {}, modifier = Modifier.testTag(tag(1)))
        }
        val width = rule.onNodeWithTag(SURFACE_TAG).getUnclippedBoundsInRoot().let { it.right - it.left }
        assertTrue("wider than min for its widest item: $width", width > tokens.surfaceMinWidth && width < tokens.surfaceMaxWidth)
        assertEquals("every row as wide", item(0).getUnclippedBoundsInRoot().right, item(1).getUnclippedBoundsInRoot().right)
    }

    // ── MNU-4: motion ────────────────────────────────────────────────────────

    @Test
    fun `MNU-4 the menu is shown over the open duration with the open easing, and hidden over the close duration`() {
        val system = tanrei.copy(menu = tokens.copy(motionOpenDuration = 400, motionOpenEasing = tanrei.motion.easing.linear, motionCloseDuration = 200, motionCloseEasing = tanrei.motion.easing.linear))
        var shown: androidx.compose.runtime.State<Float>? = null
        show(system) {
            val state = androidx.compose.runtime.remember { androidx.compose.animation.core.MutableTransitionState(false) }
            state.targetState = expanded
            shown = rememberTanreiMenuShown(state, TanreiTheme.tokens.menu)
        }
        assertEquals(0f, shown!!.value, 0.001f)
        rule.mainClock.autoAdvance = false
        expanded = true
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(200)
        assertEquals("half way in, linearly", 0.5f, shown!!.value, 0.1f)
        rule.mainClock.advanceTimeBy(300)
        assertEquals(1f, shown!!.value, 0.001f)
        expanded = false
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(100)
        assertEquals("half way out over the shorter close duration", 0.5f, shown!!.value, 0.12f)
        rule.mainClock.advanceTimeBy(200)
        assertEquals(0f, shown!!.value, 0.001f)
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `MNU-4 the popup is removed once it has faded out`() {
        showAnchored()
        rule.onNodeWithTag(ANCHOR).performClick()
        rule.waitForIdle()
        assertEquals(1, rule.onAllNodes(isPopup()).fetchSemanticsNodes().size)
        expanded = false
        rule.waitForIdle()
        assertEquals(0, rule.onAllNodes(isPopup()).fetchSemanticsNodes().size)
    }

    // ── MNU-5: close, with its reason ────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `MNU-5 the platform's back emits close once with the reason Back - Escape is MNU-1's`() {
        showAnchored()
        rule.onNodeWithTag(ANCHOR).requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        item(1).performKeyInput { pressKey(Key.Back) }
        rule.waitForIdle()
        assertEquals(listOf("close:Back"), events)
    }

    @Test
    fun `MNU-5 a press outside the surface emits close with the reason Outside`() {
        var popupView: android.view.View? = null
        showAnchored { TanreiMenuItem(COPY, onClick = {}, leadingIcon = { popupView = androidx.compose.ui.platform.LocalView.current }) }
        rule.onNodeWithTag(ANCHOR).performClick()
        rule.waitForIdle()
        // The popup's window view: a press it hears outside its bounds is a press outside the surface.
        val window = popupView!!.parent as android.view.View
        val down = android.view.MotionEvent.obtain(0L, 0L, android.view.MotionEvent.ACTION_DOWN, -10f, window.height + 50f, 0)
        rule.runOnUiThread { window.dispatchTouchEvent(down) }
        down.recycle()
        rule.waitForIdle()
        assertEquals(listOf("close:Outside"), events)
    }

    @Test
    fun `MNU-5 focus leaving the menu's window emits close with the reason FocusOut`() {
        var popupView: android.view.View? = null
        showAnchored { TanreiMenuItem(COPY, onClick = {}, leadingIcon = { popupView = androidx.compose.ui.platform.LocalView.current }) }
        rule.onNodeWithTag(ANCHOR).performClick()
        rule.waitForIdle()
        // The popup window gains focus, then loses it to another window — as its view root hears it.
        val root = org.robolectric.shadow.api.Shadow.extract<org.robolectric.shadows.ShadowViewRootImpl>(popupView!!.rootView.parent)
        rule.runOnUiThread { root.callWindowFocusChanged(true) }
        rule.waitForIdle()
        assertEquals("focused: nothing yet", emptyList<String>(), events)
        rule.runOnUiThread { root.callWindowFocusChanged(false) }
        rule.waitForIdle()
        assertEquals(listOf("close:FocusOut"), events)
    }

    // ── MNU-6: activation ────────────────────────────────────────────────────

    @Test
    fun `MNU-6 activating an action emits its click once, then close`() {
        showActions()
        item(1).performClick()
        rule.waitForIdle()
        assertEquals(listOf("click:copy", "close:Item"), events)
    }

    @Test
    fun `MNU-6 a checkbox item switches and emits its change once, then closes when tapped`() {
        showGroups()
        item(0).performClick()
        rule.waitForIdle()
        assertEquals(listOf("grid:true", "close:Item"), events)
        item(0).assert(SemanticsMatcher.expectValue(SemanticsProperties.ToggleableState, ToggleableState.On))
    }

    @Test
    fun `MNU-6 a radio item sets its group's value and emits the group's change once, then closes`() {
        showGroups()
        item(3).performClick()
        rule.waitForIdle()
        assertEquals(listOf("sort:date", "close:Item"), events)
        item(3).assertIsSelected()
        item(2).assertIsNotSelected()
    }

    @Test
    fun `MNU-6 activating a radio item that is already checked emits no change but closes the menu with the reason Item`() {
        showGroups()
        item(2).assertIsSelected().performClick()
        rule.waitForIdle()
        assertEquals(listOf("close:Item"), events)
        item(2).assertIsSelected()
    }

    @Test
    @KeyboardNavigation
    fun `MNU-6 Space on a radio item that is already checked emits nothing and leaves the menu open, Enter closes it`() {
        showGroups()
        item(2).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        assertEquals(emptyList<String>(), events)
        item(2).performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals(listOf("close:Item"), events)
    }

    @Test
    @KeyboardNavigation
    fun `MNU-6 Space switches a checkbox or radio item and leaves the menu open, Enter closes it`() {
        showGroups()
        item(0).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        assertEquals(listOf("grid:true"), events)
        item(0).performKeyInput { pressKey(Key.MoveEnd) }
        rule.waitForIdle()
        item(4).assertIsFocused().performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        assertEquals(listOf("grid:true", "sort:size"), events)
        item(4).performKeyInput { pressKey(Key.DirectionUp) }
        rule.waitForIdle()
        item(3).performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals(listOf("grid:true", "sort:size", "sort:date", "close:Item"), events)
    }

    @Test
    @KeyboardNavigation
    fun `MNU-6 Enter and Space on an action each emit its click, then close`() {
        showActions()
        item(1).requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        item(1).performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        assertEquals(listOf("click:copy", "close:Item", "click:copy", "close:Item"), events)
    }

    // ── MNU-7: keyboard ──────────────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `MNU-7 Down and Up wrap, pass through groups and skip their titles, and Home and End go to the ends`() {
        showGroups()
        item(0).requestFocus().performKeyInput { pressKey(Key.DirectionUp) }
        rule.waitForIdle()
        item(4).assertIsFocused().performKeyInput { pressKey(Key.DirectionDown) }
        rule.waitForIdle()
        item(0).assertIsFocused().performKeyInput { pressKey(Key.DirectionDown); pressKey(Key.DirectionDown) }
        rule.waitForIdle()
        item(2).assertIsFocused().performKeyInput { pressKey(Key.MoveHome) }
        rule.waitForIdle()
        item(0).assertIsFocused().performKeyInput { pressKey(Key.MoveEnd) }
        rule.waitForIdle()
        item(4).assertIsFocused()
        assertEquals("moving focus activates nothing", emptyList<String>(), events)
        rule.onNodeWithText("View").assert(SemanticsMatcher.keyNotDefined(SemanticsActions.RequestFocus))
    }

    @Test
    @KeyboardNavigation
    fun `MNU-7 typed characters move to the next item whose label begins with them`() {
        showActions()
        item(0).requestFocus().performKeyInput { pressKey(Key.P) }
        rule.waitForIdle()
        item(2).assertIsFocused().performKeyInput { advanceEventTime(1500); pressKey(Key.C) }
        rule.waitForIdle()
        item(0).assertIsFocused().performKeyInput { pressKey(Key.O) }
        rule.waitForIdle()
        item(1).assertIsFocused()
    }

    @Test
    @KeyboardNavigation
    fun `MNU-7 MNU-9 the arrow keys reach a disabled item, which does not activate`() {
        showActions(disabledLast = true)
        item(1).requestFocus().performKeyInput { pressKey(Key.DirectionDown) }
        rule.waitForIdle()
        item(2).assertIsFocused().performKeyInput { pressKey(Key.Enter); pressKey(Key.Spacebar) }
        rule.waitForIdle()
        assertEquals(emptyList<String>(), events)
    }

    // ── MNU-8: the pointer ───────────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `MNU-8 a pointer moving onto an item focuses it without the ring, draws it hovered, and the arrow keys continue from it`() {
        showActions()
        item(0).requestFocus().assertIsFocused()
        item(1).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        item(1).assertIsFocused()
        assertItemColor(1, tokens.conditions.unselected.hovered.containerColor)
        assertPixel("no ring", itemPixel(1, 30.dp, RING_PROBE), tokens.conditions.unselected.hovered.containerColor.resolve(colors).compositeOver(menuSurface))
        item(1).performMouseInput { moveTo(Offset(-50f, -50f)) }
        rule.waitForIdle()
        item(1).assertIsFocused()
        item(1).performKeyInput { pressKey(Key.DirectionDown) }
        rule.waitForIdle()
        item(2).assertIsFocused()
        assertPixel("keyboard focus shows the ring", itemPixel(2, 30.dp, RING_PROBE), colors[TanreiColorRole.FocusRing])
    }

    // ── MNU-9 / MNU-13: disabled ─────────────────────────────────────────────

    @Test
    fun `MNU-9 a disabled item emits nothing and is announced disabled`() {
        showActions(disabledLast = true)
        item(2).assertIsNotEnabled()
        item(2).performTouchInput { down(center); up() }
        rule.waitForIdle()
        assertEquals(emptyList<String>(), events)
    }

    @Test
    fun `MNU-13 a disabled item is drawn from the disabled tokens of its condition - no fill, the label faded`() {
        showActions(disabledLast = true)
        val disabled = tokens.conditions.unselected.disabled
        assertEquals(TanreiPaint.None, disabled.containerColor)
        assertItemColor(2, disabled.containerColor)
        val system = tanrei.withMenu(TanreiMenuCondition.Unselected, TanreiInteractionState.Disabled) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        showActions(system = system, disabledLast = true)
        assertPixel("the disabled container token", itemPixel(2, 4.dp, itemHeight(2) - 4.dp), colors[TanreiColorRole.Error])
    }

    // ── MNU-10: the state's tokens ───────────────────────────────────────────

    @Test
    fun `MNU-10 hovered and pressed draw the state's container token`() {
        showActions()
        item(1).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertItemColor(1, tokens.conditions.unselected.hovered.containerColor)
        item(1).performTouchInput { down(center) }
        rule.waitForIdle()
        assertItemColor(1, tokens.conditions.unselected.pressed.containerColor)
        item(1).performTouchInput { up() }
    }

    @Test
    @KeyboardNavigation
    fun `MNU-10 under acme pressed wins over focused - keyboard focus draws the focused token`() {
        val acme = TanreiSystem.Acme
        val unselected = acme.menu.conditions.unselected
        val acmeColors = acme.colors.light
        fun over(paint: TanreiPaint) = paint.resolve(acmeColors).compositeOver(acme.menu.surfaceColor.resolve(acmeColors))
        assertEquals(4, listOf(unselected.enabled, unselected.hovered, unselected.focused, unselected.pressed).map { over(it.containerColor) }.toSet().size)
        showActions(system = acme)
        item(1).requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertPixel("focused", itemPixel(1, FOCUS_CLEAR, itemHeight(1) - FOCUS_CLEAR), over(unselected.focused.containerColor))
        item(1).performKeyInput { keyDown(Key.Enter) }
        rule.waitForIdle()
        assertPixel("pressed", itemPixel(1, FOCUS_CLEAR, itemHeight(1) - FOCUS_CLEAR), over(unselected.pressed.containerColor))
        item(1).performKeyInput { keyUp(Key.Enter) }
    }

    @Test
    fun `MNU-10 MNU-18 the leading icon color comes from the condition and state - a destructive item is in the error color`() {
        val system = tanrei.withMenu(TanreiMenuCondition.Unselected, TanreiInteractionState.Hovered) { it.copy(leadingIconColor = TanreiPaint.Role(TanreiColorRole.Warning)) }
        showActions(system = system)
        assertEquals(tokens.conditions.unselected.enabled.leadingIconColor.resolve(colors), seenIconColor)
        item(0).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertEquals(colors[TanreiColorRole.Warning], seenIconColor)
        showInPlace { TanreiMenuItem("Delete", onClick = {}, destructive = true, leadingIcon = { Swatch() }) }
        assertEquals(tokens.conditions.destructive.enabled.leadingIconColor.resolve(colors), seenIconColor)
        assertEquals(colors[TanreiColorRole.Error], tokens.conditions.destructive.enabled.labelColor.resolve(colors))
    }

    // ── MNU-11: the ring inside ──────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `MNU-11 keyboard focus shows the ring inside the item on the first frame`() {
        showActions()
        rule.mainClock.autoAdvance = false
        item(1).requestFocus()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("the ring inside the top edge", itemPixel(1, itemWidth(1) / 2, RING_PROBE), colors[TanreiColorRole.FocusRing])
        rule.mainClock.autoAdvance = true
    }

    // ── MNU-12 / MNU-20: heights ─────────────────────────────────────────────

    @Test
    fun `MNU-12 an item is at least the touch target tall - MNU-20 at least container-height, and it grows with larger text`() {
        showActions()
        item(1).assertHeightIsEqualTo(maxOf(tokens.containerHeight, measure.targetTouch))
        val tall = 60.dp
        showActions(system = tanrei.copy(menu = tokens.copy(containerHeight = tall)))
        item(1).assertHeightIsEqualTo(tall)
        showInPlace(fontScale = 2f) { TanreiMenuItem(COPY, onClick = {}, modifier = Modifier.testTag(tag(0)), supportingText = "Copy the selection") }
        val row = item(0).getUnclippedBoundsInRoot()
        val supporting = rule.onNode(hasText("Copy the selection"), useUnmergedTree = true).getUnclippedBoundsInRoot()
        assertTrue("grew", row.bottom - row.top > measure.targetTouch)
        assertEquals("padding-block below the text", (row.bottom - tokens.containerPaddingBlock).value, supporting.bottom.value, 0.6f)
    }

    // ── MNU-14: closed placement ─────────────────────────────────────────────

    @Test
    fun `MNU-14 placement is a closed enum holding exactly the spec's values, so no undefined value can be passed`() {
        assertEquals(listOf("bottom-start", "bottom-end", "top-start", "top-end"), TanreiMenuPlacement.entries.map { it.name.replace(Regex("([a-z])([A-Z])"), "$1-$2").lowercase() })
    }

    // ── MNU-15 / MNU-16: the press ───────────────────────────────────────────

    @Test
    fun `MNU-15 a tap that ends at once shows the pressed state on the next frame and keeps it for press-hold`() {
        showActions()
        val hold = tanrei.motion.duration.pressHold.toLong()
        rule.mainClock.autoAdvance = false
        item(1).performTouchInput { down(center); up() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertItemColor(1, tokens.conditions.unselected.pressed.containerColor)
        rule.mainClock.advanceTimeBy(hold / 2)
        assertItemColor(1, tokens.conditions.unselected.pressed.containerColor)
        rule.mainClock.advanceTimeBy(hold + tokens.motionStateDuration * 2L)
        assertItemColor(1, tokens.conditions.unselected.enabled.containerColor)
    }

    private fun TanreiSystem.answering(feedback: TanreiPressedFeedback) = copy(behavior = behavior.copy(pressedFeedback = feedback))

    @Test
    fun `MNU-16 ripple grows the pressed color from the point of contact`() {
        assertEquals(TanreiPressedFeedback.Ripple, TanreiSystem.M3Like.behavior.pressedFeedback)
        showActions(system = tanrei.answering(TanreiPressedFeedback.Ripple))
        val pressed = tokens.conditions.unselected.pressed.containerColor.resolve(colors).compositeOver(menuSurface)
        rule.mainClock.autoAdvance = false
        item(1).performTouchInput { down(Offset(8.dp.toPx(), height - 4.dp.toPx())) }
        rule.mainClock.advanceTimeBy(50)
        assertPixel("at the point of contact", itemPixel(1, 8.dp, itemHeight(1) - 4.dp), pressed)
        assertPixel("not yet at the far end", itemPixel(1, itemWidth(1) - 8.dp, itemHeight(1) - 4.dp), menuSurface)
        rule.mainClock.advanceTimeBy(tokens.motionFeedbackDuration.toLong())
        assertPixel("the far end once grown", itemPixel(1, itemWidth(1) - 8.dp, itemHeight(1) - 4.dp), pressed)
        item(1).performTouchInput { up() }
    }

    @Test
    fun `MNU-16 dim - cupertino's answer - dims the pressed item and draws no state layer, and none draws nothing`() {
        val cupertino = TanreiSystem.Cupertino
        assertEquals(TanreiPressedFeedback.Dim, cupertino.behavior.pressedFeedback)
        assertTrue(cupertino.menu.pressed.opacity < 1f)
        showActions(system = cupertino)
        val cupertinoColors = cupertino.colors.light
        val cupertinoSurface = cupertino.menu.surfaceColor.resolve(cupertinoColors)
        item(1).performTouchInput { down(center) }
        rule.waitForIdle()
        assertPixel("no state layer", itemPixel(1, itemWidth(1) - 8.dp, itemHeight(1) - 4.dp), cupertinoSurface)
        item(1).performTouchInput { up() }
        showActions(system = tanrei.answering(TanreiPressedFeedback.None))
        item(1).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val hovered = rule.onNodeWithTag(SURFACE_TAG).captureToImage().toPixelMap()
        item(1).performMouseInput { press() }
        rule.waitForIdle()
        assertSameAs(hovered, rule.onNodeWithTag(SURFACE_TAG).captureToImage().toPixelMap(), "pressed under none")
        item(1).performMouseInput { release() }
    }

    // ── MNU-17: corners and focus style ──────────────────────────────────────

    @Test
    fun `MNU-17 the item's corners are its container-shape eased by corner smoothing - a quarter circle at 0`() {
        val system = tanrei.withMenu(TanreiMenuCondition.Unselected, TanreiInteractionState.Enabled) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.OnSurface)) }
        for (smoothing in listOf(0f, 0.6f)) {
            showActions(system = system.copy(shape = tanrei.shape.copy(cornerSmoothing = smoothing)))
            assertPixel("smoothing $smoothing: the very corner is outside", itemPixel(1, 0.5.dp, 0.5.dp), menuSurface)
            assertPixel("smoothing $smoothing: inside", itemPixel(1, tokens.containerShape, tokens.containerShape), colors[TanreiColorRole.OnSurface])
        }
        assertEquals(0.6f, TanreiSystem.Cupertino.shape.cornerSmoothing)
    }

    @Test
    @KeyboardNavigation
    fun `MNU-17 glow draws the focus colors as a halo inside the item under acme`() {
        val acme = TanreiSystem.Acme
        assertEquals(TanreiFocusStyle.Glow, acme.behavior.focusStyle)
        showActions(system = acme)
        item(1).requestFocus().assertIsFocused()
        rule.waitForIdle()
        val focused = acme.menu.conditions.unselected.focused.containerColor.resolve(acme.colors.light).compositeOver(acme.menu.surfaceColor.resolve(acme.colors.light))
        val edge = itemPixel(1, itemWidth(1) / 2, RING_PROBE)
        assertTrue("the halo inside the item: $edge", !isClose(edge, focused))
    }

    // ── MNU-18 / MNU-22: conditions and the check ────────────────────────────

    @Test
    fun `MNU-18 MNU-22 a checked item draws the selected condition and strokes the check in its mark color, an unchecked one none`() {
        grid = true
        showGroups()
        val mark = tokens.conditions.selected.enabled.markColor.resolve(colors)
        assertTrue("the check", markPixels(0).any { isClose(it, mark) })
        assertFalse("no check", markPixels(1).any { isClose(it, mark) })
        assertTrue("the checked radio item", markPixels(2).any { isClose(it, mark) })
        assertFalse(markPixels(3).any { isClose(it, mark) })
    }

    @Test
    fun `MNU-22 checking an item while the menu is open draws the check in over the state duration`() {
        val slow = 400
        showGroups(system = tanrei.copy(menu = tokens.copy(motionStateDuration = slow, motionStateEasing = tanrei.motion.easing.linear)))
        val mark = tokens.conditions.selected.enabled.markColor.resolve(colors)
        rule.mainClock.autoAdvance = false
        grid = true
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(slow / 4L)
        val early = markPixels(0).count { isClose(it, mark, 0.2f) }
        rule.mainClock.advanceTimeBy(slow.toLong())
        val done = markPixels(0).count { isClose(it, mark, 0.2f) }
        assertTrue("the check grows along its path: $early then $done", done > early)
        rule.mainClock.autoAdvance = true
    }

    // ── MNU-19: the columns ──────────────────────────────────────────────────

    @Test
    fun `MNU-19 the mark and icon columns are reserved in every item while any item needs them, so labels align`() {
        showInPlace {
            TanreiMenuItem(CUT, onClick = {}, modifier = Modifier.testTag(tag(0)))
            TanreiCheckboxMenuItem("Show grid", checked = false, onCheckedChange = {}, modifier = Modifier.testTag(tag(1)), leadingIcon = { Box(Modifier.fillMaxSize()) })
        }
        val cut = rule.onNode(hasText(CUT), useUnmergedTree = true).getUnclippedBoundsInRoot()
        val grid = rule.onNode(hasText("Show grid"), useUnmergedTree = true).getUnclippedBoundsInRoot()
        val row = item(0).getUnclippedBoundsInRoot()
        assertEquals(cut.left, grid.left)
        assertEquals((row.left + tokens.containerPaddingInline + tokens.markSize + tokens.containerGap + tokens.leadingIconSize + tokens.containerGap).value, cut.left.value, 0.5f)
        showActions()
        val plain = rule.onNode(hasText(COPY), useUnmergedTree = true).getUnclippedBoundsInRoot()
        val first = item(1).getUnclippedBoundsInRoot()
        assertEquals("only the icon column", (first.left + tokens.containerPaddingInline + tokens.leadingIconSize + tokens.containerGap).value, plain.left.value, 0.5f)
    }

    @Test
    fun `MNU-19 right-to-left mirrors the row, and the trailing text goes to the left`() {
        showInPlace(direction = LayoutDirection.Rtl) {
            TanreiMenuItem(CUT, onClick = {}, modifier = Modifier.testTag(tag(0)), trailingText = "Ctrl+X", leadingIcon = { Box(Modifier.testTag(ICON_TAG).fillMaxSize()) })
        }
        val row = item(0).getUnclippedBoundsInRoot()
        val icon = rule.onNodeWithTag(ICON_TAG, useUnmergedTree = true).getUnclippedBoundsInRoot()
        val shortcut = rule.onNode(hasText("Ctrl+X"), useUnmergedTree = true).getUnclippedBoundsInRoot()
        assertEquals((row.right - tokens.containerPaddingInline).value, icon.right.value, 0.5f)
        assertEquals((row.left + tokens.containerPaddingInline).value, shortcut.left.value, 0.5f)
    }

    // ── MNU-21: icons ────────────────────────────────────────────────────────

    @Test
    fun `MNU-21 icons are drawn in boxes of their tokens with the glyph of the condition - selected for a checked item`() {
        showActions()
        assertEquals(tanrei.icon.glyph(tokens.leadingIconSize, selected = false), seenGlyph)
        grid = true
        showInPlace { TanreiCheckboxMenuItem("Show grid", checked = grid, onCheckedChange = {}, leadingIcon = { Swatch() }) }
        assertEquals(tanrei.icon.glyph(tokens.leadingIconSize, selected = true), seenGlyph)
        assertEquals(tokens.conditions.selected.enabled.leadingIconColor.resolve(colors), seenIconColor)
    }

    // ── MNU-23: dividers ─────────────────────────────────────────────────────

    @Test
    fun `MNU-23 a divider goes between a group and what is next to it, with divider-space around it, never first or last, and not in the tree`() {
        showInPlace {
            TanreiMenuItem(CUT, onClick = {}, modifier = Modifier.testTag(tag(0)))
            TanreiMenuGroup { TanreiMenuItem(COPY, onClick = {}, modifier = Modifier.testTag(tag(1))) }
            TanreiMenuGroup { TanreiMenuItem(PASTE, onClick = {}, modifier = Modifier.testTag(tag(2))) }
            TanreiMenuItem("Select all", onClick = {}, modifier = Modifier.testTag(tag(3)))
            TanreiMenuItem("Find", onClick = {}, modifier = Modifier.testTag(tag(4)))
        }
        fun gap(a: Int, b: Int) = item(b).getUnclippedBoundsInRoot().top - item(a).getUnclippedBoundsInRoot().bottom
        val divider = tokens.dividerSpace * 2 + tokens.dividerThickness
        assertEquals("item, then a group", divider.value, gap(0, 1).value, 0.5f)
        assertEquals("group, then a group", divider.value, gap(1, 2).value, 0.5f)
        assertEquals("group, then an item", divider.value, gap(2, 3).value, 0.5f)
        assertEquals("two items outside groups", 0f, gap(3, 4).value, 0.5f)
        val line = tokens.dividerColor.resolve(colors).compositeOver(menuSurface)
        val y = item(0).getUnclippedBoundsInRoot().bottom - rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot().top + tokens.dividerSpace + tokens.dividerThickness / 2
        assertPixel("the line", stagePixel(STAGE + tokens.surfaceMinWidth / 2, y), line)
        showInPlace { TanreiMenuGroup { TanreiMenuItem(CUT, onClick = {}, modifier = Modifier.testTag(tag(0))) } }
        assertEquals("no line before the first or after the last", (tokens.surfacePaddingBlock * 2 + measure.targetTouch).value, rule.onNodeWithTag(SURFACE_TAG).getUnclippedBoundsInRoot().let { it.bottom - it.top }.value, 0.5f)
    }

    // ── MNU-24: semantics ────────────────────────────────────────────────────

    @Test
    fun `MNU-24 items are named by their label and described by supporting and trailing text, with their position, kind and state - icons hidden`() {
        grid = true
        showInPlace {
            TanreiMenuItem(CUT, onClick = {}, modifier = Modifier.testTag(tag(0)), supportingText = "To the clipboard", trailingText = "Ctrl+X", leadingIcon = { TanreiText("content_cut") })
            TanreiCheckboxMenuItem("Show grid", checked = grid, onCheckedChange = {}, modifier = Modifier.testTag(tag(1)))
            TanreiMenuGroup(title = "Sort by", selectedValue = "name") { TanreiRadioMenuItem("Name", value = "name", modifier = Modifier.testTag(tag(2))) }
        }
        item(0).assert(SemanticsMatcher.expectValue(SemanticsProperties.Text, listOf(AnnotatedString(CUT), AnnotatedString("To the clipboard"), AnnotatedString("Ctrl+X"))))
        assertEquals(0, rule.onAllNodes(hasText("content_cut")).fetchSemanticsNodes().size)
        item(1).assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Checkbox)).assert(SemanticsMatcher.expectValue(SemanticsProperties.ToggleableState, ToggleableState.On))
        item(2).assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.RadioButton)).assertIsSelected()
        assertEquals(listOf(0, 1, 2), (0..2).map { item(it).fetchSemanticsNode().config[SemanticsProperties.CollectionItemInfo].rowIndex })
        assertEquals(3, rule.onNodeWithTag(SURFACE_TAG).fetchSemanticsNode().config[SemanticsProperties.CollectionInfo].rowCount)
        rule.onNodeWithText("Sort by").assert(SemanticsMatcher.keyIsDefined(SemanticsProperties.Heading))
    }

    // ── MNU-26 / MNU-29: reports ─────────────────────────────────────────────

    @Test
    fun `MNU-26 an empty label still renders and works, and a debuggable app reports it`() = collectingReports { reports ->
        setDebuggable(true)
        showInPlace { TanreiMenuItem("", onClick = { events += "click" }, modifier = Modifier.testTag(tag(0))) }
        item(0).performClick()
        rule.waitForIdle()
        assertEquals(listOf("click", "close:Item"), events)
        assertTrue(reports.toString(), reports.any { "TanreiMenuItem" in it && "text" in it })
    }

    @Test
    fun `MNU-29 a radio item outside a group is unchecked, a value naming none and a repeated value are reported - both repeats checked - and a nested group joins the outer one`() = collectingReports { reports ->
        setDebuggable(true)
        showInPlace {
            TanreiRadioMenuItem("Loose", value = "loose", modifier = Modifier.testTag(tag(0)))
            TanreiMenuGroup(title = "Sort by", selectedValue = "twice") {
                TanreiRadioMenuItem("One", value = "twice", modifier = Modifier.testTag(tag(1)))
                TanreiRadioMenuItem("Two", value = "twice", modifier = Modifier.testTag(tag(2)))
                TanreiMenuGroup(title = "Inner") { TanreiRadioMenuItem("Three", value = "twice", modifier = Modifier.testTag(tag(3))) }
            }
            TanreiMenuGroup(title = "Size", selectedValue = "ghost") { TanreiRadioMenuItem("Small", value = "small", modifier = Modifier.testTag(tag(4))) }
        }
        rule.waitForIdle()
        item(0).assertIsNotSelected()
        item(1).assertIsSelected()
        item(2).assertIsSelected()
        item(3).assertIsSelected()
        item(4).assertIsNotSelected()
        rule.onNodeWithText("Inner").assertDoesNotExist()
        assertTrue(reports.toString(), reports.any { "Loose" in it && "not inside" in it })
        assertTrue(reports.toString(), reports.any { "Inner" in it && "inside another" in it })
        assertTrue(reports.toString(), reports.any { "\"twice\"" in it && "more than one" in it })
        assertTrue(reports.toString(), reports.any { "ghost" in it })
    }

    // ── MNU-27: state motion ─────────────────────────────────────────────────

    @Test
    fun `MNU-27 a change of state moves the colors over the menu's state duration`() {
        val slow = 400
        val system = tanrei.withMenu(TanreiMenuCondition.Unselected, TanreiInteractionState.Hovered) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Success)) }
            .let { it.copy(menu = it.menu.copy(motionStateDuration = slow, motionStateEasing = tanrei.motion.easing.linear)) }
        showActions(system = system)
        rule.mainClock.autoAdvance = false
        item(1).performMouseInput { moveTo(center) }
        rule.mainClock.advanceTimeBy(slow / 2L)
        val half = itemPixel(1, 8.dp, itemHeight(1) - 4.dp)
        assertTrue("on its way: $half", !isClose(half, menuSurface) && !isClose(half, colors[TanreiColorRole.Success]))
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertPixel("arrived", itemPixel(1, 8.dp, itemHeight(1) - 4.dp), colors[TanreiColorRole.Success])
        rule.mainClock.autoAdvance = true
    }

    // ── MNU-28: group titles ─────────────────────────────────────────────────

    @Test
    fun `MNU-28 a group title starts where the labels start, in the title style and color, padded like an item, and takes no focus`() {
        showGroups()
        val title = rule.onNode(hasText("View"), useUnmergedTree = true).getUnclippedBoundsInRoot()
        val label = rule.onNode(hasText("Show grid"), useUnmergedTree = true).getUnclippedBoundsInRoot()
        val group = rule.onNodeWithTag(GROUP_TAG).getUnclippedBoundsInRoot()
        assertEquals(label.left.value, title.left.value, 0.5f)
        assertEquals((group.top + tokens.containerPaddingBlock).value, title.top.value, 0.5f)
        assertEquals((title.bottom + tokens.containerPaddingBlock).value, item(0).getUnclippedBoundsInRoot().top.value, 0.5f)
        val lineHeight = with(rule.density) { tokens.groupTitleTypescale.lineHeight.toDp() }
        assertEquals(lineHeight.value, (title.bottom - title.top).value, 0.5f)
        rule.onNodeWithText("View").assert(SemanticsMatcher.keyNotDefined(SemanticsActions.OnClick))
        assertEquals(TanreiColorRole.OnSurfaceVariant, (tokens.groupTitleColor as TanreiPaint.Role).role)
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

    private fun TanreiSystem.withMenu(condition: TanreiMenuCondition, state: TanreiInteractionState, change: (TanreiMenuConditionStateTokens) -> TanreiMenuConditionStateTokens): TanreiSystem {
        val tokens = menu.conditions[condition]
        val changed = when (state) {
            TanreiInteractionState.Enabled -> tokens.copy(enabled = change(tokens.enabled))
            TanreiInteractionState.Hovered -> tokens.copy(hovered = change(tokens.hovered))
            TanreiInteractionState.Focused -> tokens.copy(focused = change(tokens.focused))
            TanreiInteractionState.Pressed -> tokens.copy(pressed = change(tokens.pressed))
            TanreiInteractionState.Disabled -> tokens.copy(disabled = change(tokens.disabled))
        }
        val conditions = when (condition) {
            TanreiMenuCondition.Unselected -> menu.conditions.copy(unselected = changed)
            TanreiMenuCondition.Selected -> menu.conditions.copy(selected = changed)
            TanreiMenuCondition.Destructive -> menu.conditions.copy(destructive = changed)
            else -> error("not used: $condition")
        }
        return copy(menu = menu.copy(conditions = conditions))
    }

    private fun stage(): PixelMap = rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap()

    private fun stagePixel(x: Dp, y: Dp): Color = with(rule.density) { stage()[x.roundToPx(), y.roundToPx()] }

    private fun itemHeight(index: Int): Dp = item(index).getUnclippedBoundsInRoot().let { it.bottom - it.top }

    private fun itemWidth(index: Int): Dp = item(index).getUnclippedBoundsInRoot().let { it.right - it.left }

    /** A pixel of item [index] at ([x], [y]) from its top-left, as drawn on the stage. */
    private fun itemPixel(index: Int, x: Dp, y: Dp): Color {
        val bounds = item(index).getUnclippedBoundsInRoot()
        val stageBounds = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
        return with(rule.density) { stage()[(bounds.left - stageBounds.left + x).roundToPx(), (bounds.top - stageBounds.top + y).roundToPx()] }
    }

    /** The pixels of item [index]'s mark column. */
    private fun markPixels(index: Int): List<Color> {
        val map = item(index).captureToImage().toPixelMap()
        return with(rule.density) {
            val left = tokens.containerPaddingInline.roundToPx()
            val right = left + tokens.markSize.roundToPx()
            (0 until map.height).flatMap { y -> (left until right).map { x -> map[x, y] } }
        }
    }

    private fun assertItemColor(index: Int, paint: TanreiPaint) =
        assertPixel("item $index's container", itemPixel(index, 8.dp, itemHeight(index) - 4.dp), paint.resolve(colors).compositeOver(menuSurface))

    private fun assertSameAs(expected: PixelMap, actual: PixelMap, what: String) {
        val differing = (0 until minOf(expected.height, actual.height)).sumOf { y -> (0 until minOf(expected.width, actual.width)).count { x -> !isClose(expected[x, y], actual[x, y]) } }
        assertEquals("$what: not one pixel differs", 0, differing)
    }

    private fun isClose(actual: Color, expected: Color, tolerance: Float = PIXEL_TOLERANCE): Boolean =
        maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue)) <= tolerance

    private fun assertPixel(what: String, actual: Color, expected: Color) =
        assertTrue("$what: expected $expected but was $actual", isClose(actual, expected))

    private companion object {
        const val STAGE_TAG = "stage"
        const val SURFACE_TAG = "surface"
        const val GROUP_TAG = "group"
        const val ICON_TAG = "icon"
        const val ANCHOR = "anchor"
        const val BEFORE = "before"
        const val AFTER = "after"
        const val CUT = "Cut"
        const val COPY = "Copy"
        const val PASTE = "Paste"
        const val LONG = "Open the selected files in a new window next to this one, keeping the current view as it is"
        const val PIXEL_TOLERANCE = 2f / 255f
        const val OFFSET = 8
        const val MARGIN = 16
        val STAGE = 48.dp
        val RING_PROBE = 1.dp
        val FOCUS_CLEAR = 12.dp
    }
}

/** MNU-4 and MNU-27 where motion is reduced (the animator duration scale is 0, see `TanreiButtonReducedMotionTest`). */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiMenuReducedMotionTest {
    private object NoMotion : MotionDurationScale {
        override val scaleFactor: Float = 0f
    }

    @get:Rule
    val rule = createComposeRule(effectContext = NoMotion)

    private var expanded by mutableStateOf(false)

    @Test
    fun `MNU-4 where motion is reduced the menu is shown and hidden at once`() {
        val tanrei = TanreiSystem.Tanrei
        var shown: androidx.compose.runtime.State<Float>? = null
        rule.setContent {
            TanreiTheme(system = tanrei.copy(menu = tanrei.menu.copy(motionOpenDuration = 400, motionCloseDuration = 400)), theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                val state = androidx.compose.runtime.remember { androidx.compose.animation.core.MutableTransitionState(false) }
                state.targetState = expanded
                shown = rememberTanreiMenuShown(state, TanreiTheme.tokens.menu)
            }
        }
        rule.mainClock.autoAdvance = false
        expanded = true
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        repeat(2) { rule.mainClock.advanceTimeByFrame() }
        assertEquals("whole at once", 1f, shown!!.value, 0.001f)
        expanded = false
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        repeat(2) { rule.mainClock.advanceTimeByFrame() }
        assertEquals("gone at once", 0f, shown!!.value, 0.001f)
    }
}
