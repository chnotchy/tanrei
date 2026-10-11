package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import android.view.KeyEvent
import android.view.View
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.MotionDurationScale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PixelMap
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.layout.boundsInRoot
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertHeightIsEqualTo
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.click
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.isDialog
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performMouseInput
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.test.swipe
import androidx.compose.ui.test.swipeUp
import androidx.compose.ui.test.withKeyDown
import androidx.compose.ui.unit.Density
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
import io.github.chnotchy.tanrei.primitives.TanreiModalDialogs
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiIconGlyph
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.glyph
import io.github.chnotchy.tanrei.tokens.Cupertino
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiFocusStyle
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiNavigationDrawerConditionStateTokens
import io.github.chnotchy.tanrei.tokens.TanreiNavigationDrawerVariant
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
 * Behaviour tests for `specs/navigation-drawer.spec.json`. Each test names the behaviour id (`NVD-n`) it covers. Runs on
 * the JVM (Robolectric, native graphics) — no emulator needed. The drawer wraps a screen whose content is an opener
 * button (tagged [OPENER], it opens the drawer) and a focusable box ([AFTER]), on a [STAGE_WIDTH] × [STAGE_HEIGHT] stage of
 * surface, with no system insets unless a test gives some. Destinations are tagged `item-i`; every icon is a [Swatch].
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w400dp-h640dp-xhdpi")
class TanreiNavigationDrawerTest {
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
    private val tokens = tanrei.navigationDrawer
    private val surface = colors[TanreiColorRole.Surface]
    private val selectedLook = tokens.conditions.selected
    private val unselectedLook = tokens.conditions.unselected

    private val events = mutableListOf<String>()
    private var current by mutableStateOf(0)
    private val seenColors = mutableMapOf<String, Color>()
    private val seenGlyphs = mutableMapOf<String, TanreiIconGlyph>()
    private val iconBounds = mutableMapOf<String, Rect>()
    private var hostView: View? = null
    private var dialogView: View? = null
    private var state = TanreiDrawerState(TanreiDrawerValue.Open) { events += "close"; true }

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
            val now = scene ?: return@setContent
            hostView = LocalView.current
            key(now) {
                val density = LocalDensity.current
                CompositionLocalProvider(
                    LocalLayoutDirection provides now.direction,
                    LocalDensity provides Density(density.density, now.fontScale),
                    LocalTanreiGlyphStandIn provides { name -> Swatch(name) },
                ) {
                    TanreiTheme(system = now.system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                        Box(Modifier.testTag(STAGE_TAG).size(STAGE_WIDTH, STAGE_HEIGHT).background(TanreiColorRole.Surface.color)) { now.content() }
                    }
                }
            }
        }
        rule.waitForIdle()
    }

    /**
     * A drawer of [labels] (icons named by the labels in lower case; [badges] by index) with destination [current]
     * selected (-1: none), open unless [open] is false, wrapping a screen of an opener button and a focusable box.
     * [items] replaces the destinations.
     */
    private fun showDrawer(
        system: TanreiSystem = tanrei,
        variant: TanreiNavigationDrawerVariant = TanreiNavigationDrawerVariant.Standard,
        open: Boolean = true,
        labels: List<String> = FOUR,
        disabled: Set<Int> = emptySet(),
        badges: Map<Int, String> = mapOf(0 to "24"),
        marked: Set<Int>? = null,
        icons: Boolean = true,
        insets: WindowInsets = WindowInsets(0, 0, 0, 0),
        direction: LayoutDirection = LayoutDirection.Ltr,
        fontScale: Float = 1f,
        label: String = "Mail",
        header: (@Composable ColumnScope.() -> Unit)? = null,
        items: (@Composable ColumnScope.() -> Unit)? = null,
    ) {
        state = TanreiDrawerState(if (open) TanreiDrawerValue.Open else TanreiDrawerValue.Closed) { events += "close"; true }
        val drawerState = state
        show(system, direction, fontScale) {
            TanreiNavigationDrawer(
                drawerContent = items ?: {
                    dialogView = LocalView.current
                    labels.forEachIndexed { i, text -> Destination(i, text, disabled, badges, marked, icons) }
                },
                modifier = Modifier.testTag(LAYOUT),
                variant = variant,
                drawerState = drawerState,
                contentDescription = label,
                header = header,
                windowInsets = insets,
            ) {
                Column(Modifier.testTag(CONTENT).fillMaxSize()) {
                    TanreiButton(text = "Menu", onClick = { drawerState.open() }, modifier = Modifier.testTag(OPENER), variant = TanreiButtonVariant.Text)
                    Box(Modifier.testTag(AFTER).size(8.dp).focusable())
                }
            }
        }
    }

    @Composable
    private fun Destination(i: Int, text: String, disabled: Set<Int> = emptySet(), badges: Map<Int, String> = emptyMap(), marked: Set<Int>? = null, icons: Boolean = true) {
        val selected = marked?.contains(i) ?: (i == current)
        TanreiNavigationDrawerItem(
            selected = selected,
            onClick = {
                events += "click:$i:${if (selected) "reselect" else "change"}"
                current = i
            },
            label = text,
            modifier = Modifier.testTag(tag(i)),
            icon = if (icons) text.lowercase().ifEmpty { "blank" } else null,
            badge = badges[i].orEmpty(),
            enabled = i !in disabled,
        )
    }

    /** An icon that records the color, glyph and bounds its destination gives it, and fills its box with the color. */
    @Composable
    private fun Swatch(key: String) {
        seenColors[key] = LocalTanreiContentColor.current
        seenGlyphs[key] = LocalTanreiIconGlyph.current
        Box(Modifier.fillMaxSize().onGloballyPositioned { iconBounds[key] = it.boundsInRoot() }.background(LocalTanreiContentColor.current))
    }

    private fun tag(index: Int) = "item-$index"

    private fun item(index: Int) = rule.onNodeWithTag(tag(index))

    private fun dialogs(): Int = rule.onAllNodes(isDialog()).fetchSemanticsNodes().size

    // ── NVD-1: activation ────────────────────────────────────────────────────

    @Test
    fun `NVD-1 activating a destination that is not selected is a change, the selected one a reselect, each exactly once`() {
        showDrawer()
        item(1).performClick()
        rule.waitForIdle()
        item(1).performClick()
        rule.waitForIdle()
        assertEquals(listOf("click:1:change", "click:1:reselect"), events)
        item(1).assertIsSelected()
    }

    @Test
    @KeyboardNavigation
    fun `NVD-1 Enter and Space activate the focused destination`() {
        showDrawer()
        item(2).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        item(2).performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        assertEquals(listOf("click:2:change", "click:2:reselect"), events)
    }

    // ── NVD-2: disabled ──────────────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `NVD-2 a disabled destination emits nothing, is announced disabled, and Tab skips it`() {
        showDrawer(disabled = setOf(2))
        item(2).assertIsNotEnabled()
        item(2).performTouchInput { down(center); up() }
        rule.waitForIdle()
        assertEquals(emptyList<String>(), events)
        item(1).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        item(3).assertIsFocused()
    }

    // ── NVD-3: selected and unselected parts ─────────────────────────────────

    @Test
    fun `NVD-3 the selected destination draws the selected parts, every other the unselected parts`() {
        showDrawer(badges = mapOf(0 to "24", 1 to "12"))
        assertEquals(selectedLook.enabled.itemIconColor.resolve(colors), seenColors["inbox"])
        assertEquals(unselectedLook.enabled.itemIconColor.resolve(colors), seenColors["sent"])
        assertPixel("the selected row's container", rowPixel(0), selectedLook.enabled.itemContainerColor.resolve(colors).compositeOver(drawerColor()))
        assertPixel("no container on another", rowPixel(1), drawerColor())
        assertTrue("the selected label's color", anyPixelClose(textBounds("Inbox"), selectedLook.enabled.itemLabelColor.resolve(colors), 0.12f))
        assertTrue("the unselected badge's color", anyPixelClose(badgeArea(1), unselectedLook.enabled.itemBadgeColor.resolve(colors), 0.12f))
        item(0).assertIsSelected()
        item(1).assertIsNotSelected()
    }

    @Test
    fun `NVD-3 with none marked selected every destination is drawn unselected (Compose has no drawer value to report)`() {
        current = -1
        showDrawer()
        (0..3).forEach { item(it).assertIsNotSelected() }
        assertPixel("no container", rowPixel(0), drawerColor())
    }

    // ── NVD-4: states ────────────────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `NVD-4 hovered, focused and pressed each draw their own tokens, pressed over focused over hovered`() {
        val system = tanrei
            .withLook(selected = false, TanreiInteractionState.Hovered) { it.copy(itemContainerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
            .withLook(selected = false, TanreiInteractionState.Focused) { it.copy(itemContainerColor = TanreiPaint.Role(TanreiColorRole.Warning), itemBadgeColor = TanreiPaint.Role(TanreiColorRole.Primary)) }
            .withLook(selected = false, TanreiInteractionState.Pressed) { it.copy(itemContainerColor = TanreiPaint.Role(TanreiColorRole.Success)) }
        showDrawer(system = system, badges = mapOf(1 to "12"))
        item(1).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertPixel("hovered", rowPixel(1), colors[TanreiColorRole.Error])
        item(1).requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertPixel("focused over hovered", rowPixel(1), colors[TanreiColorRole.Warning])
        assertTrue("the focused badge token", anyPixelClose(badgeArea(1), colors[TanreiColorRole.Primary], 0.15f))
        item(1).performKeyInput { keyDown(Key.Enter) }
        rule.waitForIdle()
        assertPixel("pressed over focused", rowPixel(1), colors[TanreiColorRole.Success])
        item(1).performKeyInput { keyUp(Key.Enter) }
    }

    @Test
    fun `NVD-4 a touch does not draw the focused state`() {
        val system = tanrei.withLook(selected = true, TanreiInteractionState.Focused) { it.copy(itemContainerColor = TanreiPaint.Role(TanreiColorRole.Warning)) }
        showDrawer(system = system)
        item(1).performTouchInput { down(center); up() }
        rule.mainClock.advanceTimeBy(2000)
        rule.waitForIdle()
        assertPixel("at rest, selected", rowPixel(1), selectedLook.enabled.itemContainerColor.resolve(colors).compositeOver(drawerColor()))
    }

    // ── NVD-5: focus ring ────────────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `NVD-5 keyboard focus shows the ring around the item container on the first frame, and a touch shows none`() {
        showDrawer()
        val m = tanrei.measure
        val ring = m.focusOffset + m.focusInnerWidth + m.focusOuterWidth / 2
        rule.mainClock.autoAdvance = false
        item(1).requestFocus()
        rule.mainClock.advanceTimeByFrame()
        val row = rowBounds(1)
        assertPixel("the ring above the row", stagePixel((row.left + row.right) / 2, row.top - ring), colors[TanreiColorRole.FocusRing])
        rule.mainClock.autoAdvance = true
    }

    @Test
    fun `NVD-5 a touch shows no ring`() {
        showDrawer()
        val m = tanrei.measure
        val ring = m.focusOffset + m.focusInnerWidth + m.focusOuterWidth / 2
        item(1).performTouchInput { down(center) }
        rule.waitForIdle()
        val row = rowBounds(1)
        assertPixel("no ring", stagePixel((row.left + row.right) / 2, row.top - ring), drawerColor())
    }

    // ── NVD-6: hit area ──────────────────────────────────────────────────────

    @Test
    fun `NVD-6 the hit area is the row with half the gap above and below - the touch target by default - and it answers on the row`() {
        val system = tanrei.withLook(selected = false, TanreiInteractionState.Hovered) { it.copy(itemContainerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        showDrawer(system = system)
        item(1).assertHeightIsEqualTo(tokens.itemContainerHeight + tokens.containerGap)
        assertEquals(tanrei.measure.targetTouch, tokens.itemContainerHeight + tokens.containerGap)
        item(1).performMouseInput { moveTo(Offset(centerX, 1f)) }
        rule.waitForIdle()
        assertPixel("hovered from the gap, drawn on the row", rowPixel(1), colors[TanreiColorRole.Error])
        item(1).performTouchInput { down(Offset(centerX, 1f)); up() }
        rule.waitForIdle()
        assertEquals(listOf("click:1:change"), events)
        // A system whose row and gap give less still keeps the hit area at the touch target, the row unchanged.
        showDrawer(system = tanrei.copy(navigationDrawer = tokens.copy(itemContainerHeight = 30.dp, containerGap = 4.dp)), icons = false, badges = emptyMap())
        item(1).assertHeightIsEqualTo(tanrei.measure.targetTouch)
        val row = rowBounds(1)
        assertEquals(30f, (row.bottom - row.top).value, 0.6f)
    }

    // ── NVD-7: disabled tokens ───────────────────────────────────────────────

    @Test
    fun `NVD-7 a disabled destination draws the disabled tokens of its condition`() {
        val system = tanrei.withLook(selected = false, TanreiInteractionState.Disabled) {
            it.copy(itemContainerColor = TanreiPaint.Role(TanreiColorRole.Error), itemIconColor = TanreiPaint.Role(TanreiColorRole.Warning), itemBadgeColor = TanreiPaint.Role(TanreiColorRole.Success))
        }
        showDrawer(system = system, disabled = setOf(2), badges = mapOf(2 to "3"))
        assertPixel("the disabled container token", rowPixel(2), colors[TanreiColorRole.Error])
        assertEquals(colors[TanreiColorRole.Warning], seenColors["drafts"])
        assertTrue("the disabled badge token", anyPixelClose(badgeArea(2), colors[TanreiColorRole.Success], 0.15f))
        assertEquals("by default a disabled row keeps its resting container", unselectedLook.enabled.itemContainerColor, unselectedLook.disabled.itemContainerColor)
    }

    // ── NVD-8 / NVD-9: the press ─────────────────────────────────────────────

    @Test
    fun `NVD-8 a tap that ends at once shows the pressed state on the next frame and keeps it for press-hold`() {
        val system = tanrei.withLook(selected = true, TanreiInteractionState.Pressed) { it.copy(itemContainerColor = TanreiPaint.Role(TanreiColorRole.Success)) }
        showDrawer(system = system)
        val hold = tanrei.motion.duration.pressHold.toLong()
        rule.mainClock.autoAdvance = false
        item(0).performTouchInput { down(center); up() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("pressed", rowPixel(0), colors[TanreiColorRole.Success])
        rule.mainClock.advanceTimeBy(hold / 2)
        assertPixel("still pressed", rowPixel(0), colors[TanreiColorRole.Success])
        rule.mainClock.advanceTimeBy(hold + tokens.motionStateDuration * 2L)
        assertPixel("at rest", rowPixel(0), selectedLook.enabled.itemContainerColor.resolve(colors).compositeOver(drawerColor()))
        rule.mainClock.autoAdvance = true
    }

    private fun TanreiSystem.answering(feedback: TanreiPressedFeedback) = copy(behavior = behavior.copy(pressedFeedback = feedback))

    @Test
    fun `NVD-9 ripple grows the pressed color from the point of contact, and dim - cupertino's answer - dims and draws no state layer`() {
        val system = tanrei.answering(TanreiPressedFeedback.Ripple)
            .withLook(selected = true, TanreiInteractionState.Pressed) { it.copy(itemContainerColor = TanreiPaint.Role(TanreiColorRole.Success)) }
        showDrawer(system = system)
        val row = rowBounds(0)
        val cell = bounds(tag(0))
        val success = colors[TanreiColorRole.Success]
        rule.mainClock.autoAdvance = false
        item(0).performTouchInput { down(Offset((row.right - cell.left - 20.dp).toPx(), (row.top - cell.top + 22.dp).toPx())) }
        rule.mainClock.advanceTimeBy(50)
        assertPixel("at the point of contact", stagePixel(row.right - 20.dp, row.top + 22.dp), success)
        assertFalse("not yet at the far start", isClose(stagePixel(row.left + 4.dp, row.top + 22.dp), success))
        rule.mainClock.advanceTimeBy(tokens.motionFeedbackDuration.toLong())
        assertPixel("grown", stagePixel(row.left + 4.dp, row.top + 22.dp), success)
        item(0).performTouchInput { up() }
        rule.mainClock.autoAdvance = true
        val cupertino = TanreiSystem.Cupertino
        assertEquals(TanreiPressedFeedback.Dim, cupertino.behavior.pressedFeedback)
        assertTrue(cupertino.navigationDrawer.pressed.opacity < 1f)
        showDrawer(system = cupertino)
        val before = item(1).captureToImage().toPixelMap()
        item(1).performTouchInput { down(center) }
        rule.waitForIdle()
        assertTrue("dimmed", differing(before, item(1).captureToImage().toPixelMap()) > 0)
        item(1).performTouchInput { up() }
    }

    @Test
    fun `NVD-9 none draws no answer to the press`() {
        showDrawer(system = tanrei.answering(TanreiPressedFeedback.None))
        item(1).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val hovered = stage()
        item(1).performMouseInput { press() }
        rule.waitForIdle()
        assertSameAs(hovered, stage(), "pressed under none")
        item(1).performMouseInput { release() }
    }

    // ── NVD-10: corners, focus style ─────────────────────────────────────────

    @Test
    fun `NVD-10 the row's corners and a modal drawer's end corners are eased by corner smoothing`() {
        val radius = 12.dp
        for (smoothing in listOf(0f, 0.6f)) {
            val system = tanrei.copy(navigationDrawer = tokens.copy(itemContainerShape = radius), shape = tanrei.shape.copy(cornerSmoothing = smoothing))
            showDrawer(system = system, badges = emptyMap())
            val row = rowBounds(0)
            assertPixel("smoothing $smoothing: the row's very corner is outside", stagePixel(row.right - 0.5.dp, row.top + 0.5.dp), drawerColor())
            assertPixel("smoothing $smoothing: inside", stagePixel(row.right - radius, row.top + radius), selectedLook.enabled.itemContainerColor.resolve(colors).compositeOver(drawerColor()))
        }
        // The modal sheet, in place: square start corners, rounded end corners.
        show { TanreiModalDrawerInPlace(drawerContent = { Destination(0, "Inbox") }, contentDescription = "Mail") }
        val sheet = colors[TanreiColorRole.SurfaceContainerLow]
        val end = tokens.containerWidth
        val modalRadius = tokens.variants.modal.containerShape
        assertFalse("the top end corner is rounded off", isClose(stagePixel(end - 1.dp, 1.dp), sheet, 0.01f))
        assertPixel("inside the corner", stagePixel(end - modalRadius, modalRadius), sheet)
        assertPixel("the start corner is square", stagePixel(2.dp, STAGE_HEIGHT - 2.dp), sheet)
    }

    @Test
    @KeyboardNavigation
    fun `NVD-10 glow draws the focus as a halo around the row under acme`() {
        val acme = TanreiSystem.Acme
        assertEquals(TanreiFocusStyle.Glow, acme.behavior.focusStyle)
        showDrawer(system = acme)
        item(1).requestFocus().assertIsFocused()
        rule.waitForIdle()
        val row = rowBounds(1)
        val m = acme.measure
        val halo = stagePixel((row.left + row.right) / 2, row.top - (m.focusOffset + m.focusInnerWidth + m.focusOuterWidth / 4))
        assertFalse("a halo just outside the row: $halo", isClose(halo, acme.navigationDrawer.variants.standard.containerColor.resolve(acme.colors.light)))
    }

    // ── NVD-11: the panel ────────────────────────────────────────────────────

    @Test
    fun `NVD-11 the drawer is container-width wide, the full height, its variant's color, elevation and end edge - mirrored right to left`() {
        val look = tokens.variants.standard
        val system = tanrei.copy(
            navigationDrawer = tokens.copy(
                variants = tokens.variants.copy(
                    standard = look.copy(
                        containerColor = TanreiPaint.Role(TanreiColorRole.Primary),
                        containerElevation = listOf(TanreiShadowLayer(x = 8.dp, y = 0.dp, blur = 0.dp, spread = 0.dp, role = TanreiColorRole.Error)),
                        outlineColor = TanreiPaint.Role(TanreiColorRole.Success),
                    ),
                ),
            ),
        )
        showDrawer(system = system)
        val content = bounds(CONTENT)
        assertEquals("the drawer takes its width", tokens.containerWidth.value, content.left.value, 0.5f)
        val y = STAGE_HEIGHT - 8.dp
        assertPixel("the container, the full height", stagePixel(2.dp, y), colors[TanreiColorRole.Primary])
        assertPixel("the end edge", stagePixel(tokens.containerWidth - 0.5.dp, y), colors[TanreiColorRole.Success])
        assertPixel("the elevation's shadow past the end", stagePixel(tokens.containerWidth + 4.dp, y), colors[TanreiColorRole.Error])
        showDrawer(system = system, direction = LayoutDirection.Rtl)
        assertPixel("right to left: at the right", stagePixel(STAGE_WIDTH - 2.dp, y), colors[TanreiColorRole.Primary])
        assertPixel("the edge on its left", stagePixel(STAGE_WIDTH - tokens.containerWidth + 0.5.dp, y), colors[TanreiColorRole.Success])
        assertEquals((STAGE_WIDTH - tokens.containerWidth).value, bounds(CONTENT).right.value, 0.5f)
    }

    // ── NVD-12: layout ───────────────────────────────────────────────────────

    @Test
    fun `NVD-12 the header then the items, padding-inline and padding-block inside, container-gap between destinations, scrolling together`() {
        showDrawer(header = { Box(Modifier.testTag(HEADER).fillMaxWidth().height(40.dp)) })
        val header = bounds(HEADER)
        assertEquals("padding-block from the top", tokens.containerPaddingBlock.value, header.top.value, 0.5f)
        assertEquals("padding-inline from the start", tokens.containerPaddingInline.value, header.left.value, 0.5f)
        assertEquals("padding-inline from the end", (tokens.containerWidth - tokens.containerPaddingInline).value, header.right.value, 0.5f)
        assertEquals("the items after the header", header.bottom.value, bounds(tag(0)).top.value, 0.5f)
        assertEquals("container-gap between two rows", tokens.containerGap.value, (rowBounds(1).top - rowBounds(0).bottom).value, 0.6f)
        showDrawer(header = { Box(Modifier.testTag(HEADER).fillMaxWidth().height(40.dp)) }, labels = (1..14).map { "Place $it" }, icons = false, badges = emptyMap())
        val before = bounds(HEADER).top
        assertTrue("the last is out of view", bounds(tag(13)).top > STAGE_HEIGHT)
        rule.onNodeWithTag(tag(6)).performTouchInput { swipeUp() }
        rule.waitForIdle()
        assertTrue("the header scrolls with them", bounds(HEADER).top < before)
    }

    // ── NVD-13: a row ────────────────────────────────────────────────────────

    @Test
    fun `NVD-13 a row across the inner width, at least its height, padded, icon, label and badge gap apart - the label wraps - mirrored right to left`() {
        showDrawer(labels = listOf("Inbox", "A label much too long for one line of the row, which wraps onto a second and a third line of it", "Drafts"))
        val row = rowBounds(0)
        assertEquals(tokens.containerPaddingInline.value, row.left.value, 0.6f)
        assertEquals((tokens.containerWidth - tokens.containerPaddingInline).value, row.right.value, 0.6f)
        assertEquals(tokens.itemContainerHeight.value, (row.bottom - row.top).value, 0.6f)
        val icon = with(rule.density) { iconBounds.getValue("inbox").let { DpRect(it.left.toDp(), it.top.toDp(), it.right.toDp(), it.bottom.toDp()) } }
        assertEquals("padding-inline", (row.left + tokens.itemPaddingInline).value, icon.left.value, 0.6f)
        assertEquals("gap to the label", (icon.right + tokens.itemGap).value, textBounds("Inbox").left.value, 0.6f)
        val badge = badgeArea(0)
        assertTrue("the badge at the end", anyPixelClose(DpRect(row.right - tokens.itemPaddingInline - 20.dp, row.top, row.right - tokens.itemPaddingInline, row.bottom), selectedLook.enabled.itemBadgeColor.resolve(colors), 0.15f) && badge.right <= row.right)
        val long = rowBounds(1)
        assertTrue("the long label wraps and grows its row: ${long.bottom - long.top}", long.bottom - long.top > tokens.itemContainerHeight)
        showDrawer(direction = LayoutDirection.Rtl)
        val mirrored = rowBounds(0)
        val rtlIcon = with(rule.density) { iconBounds.getValue("inbox").right.toDp() }
        assertEquals("right to left: the icon at the right", (mirrored.right - tokens.itemPaddingInline).value, rtlIcon.value, 0.6f)
    }

    // ── NVD-14: icons ────────────────────────────────────────────────────────

    @Test
    fun `NVD-14 each icon is drawn at the icon size in the glyph of its condition`() {
        showDrawer()
        with(rule.density) { assertEquals(tokens.itemIconSize.toPx(), iconBounds.getValue("inbox").width, 0.5f) }
        assertEquals(tanrei.icon.glyph(tokens.itemIconSize, selected = true), seenGlyphs["inbox"])
        assertEquals(tanrei.icon.glyph(tokens.itemIconSize, selected = false), seenGlyphs["sent"])
    }

    // ── NVD-15: badge text ───────────────────────────────────────────────────

    @Test
    fun `NVD-15 the badge is read after the name and state, and is kept while disabled`() {
        showDrawer(badges = mapOf(0 to "24", 1 to "New", 2 to "3"), disabled = setOf(2))
        item(0).assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "Selected, 24"))
        item(1).assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "New"))
        item(2).assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "3"))
        item(3).assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.StateDescription))
        assertTrue("drawn while disabled", anyPixelClose(badgeArea(2), unselectedLook.disabled.itemBadgeColor.resolve(colors).compositeOver(drawerColor()), 0.06f))
        assertEquals("the badge text is not a separate element", 0, rule.onAllNodes(hasText("New")).fetchSemanticsNodes().size)
    }

    // ── NVD-16 / NVD-17: sections ────────────────────────────────────────────

    @Test
    fun `NVD-16 a section's heading - its style and color, a row at least heading-height, starting with the content, a heading not focusable`() {
        showDrawer(items = {
            TanreiNavigationDrawerSection(heading = "Labels") { Destination(0, "Family") }
            TanreiNavigationDrawerSection { Destination(1, "Work") }
        })
        val heading = rule.onNode(SemanticsMatcher.keyIsDefined(SemanticsProperties.Heading)).assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Focused))
        val box = heading.getUnclippedBoundsInRoot()
        assertEquals(tokens.headingHeight.value, (box.bottom - box.top).value, 0.6f)
        val text = textBounds("Labels")
        assertEquals("starts with the destinations' content", (tokens.containerPaddingInline + tokens.itemPaddingInline).value, text.left.value, 0.6f)
        assertEquals("centered in its row", ((box.top + box.bottom) / 2).value, ((text.top + text.bottom) / 2).value, 0.6f)
        with(rule.density) { assertEquals(tokens.headingTypescale.lineHeight.toDp().value, (text.bottom - text.top).value, 0.6f) }
        assertTrue(anyPixelClose(text, tokens.headingColor.resolve(colors), 0.15f))
        assertEquals("an empty heading draws no row", 1, rule.onAllNodes(SemanticsMatcher.keyIsDefined(SemanticsProperties.Heading)).fetchSemanticsNodes().size)
        assertEquals("the second section starts right after the first", bounds(tag(0)).bottom.value, bounds(tag(1)).top.value, 0.6f)
    }

    @Test
    fun `NVD-17 a divider before a section across the inner width, and a nested section's destinations in its place with a report`() = collectingReports { reports ->
        showDrawer(items = {
            Destination(0, "Inbox")
            TanreiNavigationDrawerSection(divider = true) { Destination(1, "Family") }
        })
        val divider = tanrei.divider
        val y = bounds(tag(1)).top - divider.lineThickness / 2
        assertPixel("the divider across the inner width", stagePixel(tokens.containerPaddingInline + 1.dp, y), divider.lineColor.resolve(colors).compositeOver(drawerColor()))
        assertPixel("not past it", stagePixel(tokens.containerPaddingInline - 1.dp, y), drawerColor())
        setDebuggable(true)
        showDrawer(items = {
            TanreiNavigationDrawerSection(heading = "Outer") {
                TanreiNavigationDrawerSection(heading = "Inner", divider = true) { Destination(0, "Family") }
            }
        })
        item(0).assertExists()
        assertEquals("the inner heading is not drawn", 0, rule.onAllNodes(hasText("Inner")).fetchSemanticsNodes().size)
        assertTrue(reports.toString(), reports.any { "do not nest" in it })
    }

    // ── NVD-18 / NVD-28: standard ────────────────────────────────────────────

    @Test
    fun `NVD-18 a standard drawer takes its width while open, none and no presence while closed, and slides as the content resizes`() {
        val slow = 400
        val system = tanrei.copy(navigationDrawer = tokens.copy(motionEnterDuration = slow, motionEnterEasing = tanrei.motion.easing.linear, motionExitDuration = slow, motionExitEasing = tanrei.motion.easing.linear))
        showDrawer(system = system, open = false)
        assertEquals("no width", 0f, bounds(CONTENT).left.value, 0.5f)
        item(0).assertDoesNotExist()
        rule.mainClock.autoAdvance = false
        state.open()
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(slow / 2L)
        val half = bounds(CONTENT).left
        assertTrue("on its way: $half", half > 20.dp && half < tokens.containerWidth - 20.dp)
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertEquals(tokens.containerWidth.value, bounds(CONTENT).left.value, 0.5f)
        rule.mainClock.autoAdvance = true
        assertEquals("no scrim: the content's surface", surface, stagePixel(STAGE_WIDTH - 4.dp, STAGE_HEIGHT - 4.dp))
        assertEquals("no window", 0, dialogs())
        state.close()
        rule.waitForIdle()
        item(0).assertDoesNotExist()
        assertEquals(0f, bounds(CONTENT).left.value, 0.5f)
        assertEquals("a standard drawer emits no close", emptyList<String>(), events)
    }

    @Test
    @KeyboardNavigation
    fun `NVD-28 opening a standard drawer moves focus to the selected destination, closing it returns focus, and Tab leaves it open`() {
        current = 2
        showDrawer(open = false)
        rule.onNodeWithTag(OPENER).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        item(2).assertIsFocused()
        item(3).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(OPENER).assertIsFocused()
        assertTrue("still open", state.isOpen)
        item(1).requestFocus().assertIsFocused()
        state.close()
        rule.waitForIdle()
        rule.onNodeWithTag(OPENER).assertIsFocused()
    }

    // ── NVD-19 – NVD-22: modal ───────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `NVD-19 a modal drawer opens in a window over a scrim, hides what is behind, takes focus to the selected destination and keeps it`() {
        current = 1
        showDrawer(variant = TanreiNavigationDrawerVariant.Modal, open = false)
        val before = hostView!!.importantForAccessibility
        rule.onNodeWithTag(OPENER).requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals(1, dialogs())
        assertEquals(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS, hostView!!.importantForAccessibility)
        assertEquals(1, TanreiModalDialogs.open)
        item(1).assertIsFocused()
        val image = rule.onNode(isDialog()).captureToImage().toPixelMap()
        val scrim = tokens.scrimColor.resolve(colors)
        assertEquals("the scrim, as drawn", scrim.alpha, image[image.width - 4, image.height / 2].alpha, 0.02f)
        item(3).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        item(0).assertIsFocused()
        item(0).performKeyInput { withKeyDown(Key.ShiftLeft) { pressKey(Key.Tab) } }
        rule.waitForIdle()
        item(3).assertIsFocused()
        state.close()
        rule.waitForIdle()
        assertEquals("restored", before, hostView!!.importantForAccessibility)
        assertEquals(0, TanreiModalDialogs.open)
    }

    @Test
    @KeyboardNavigation
    fun `NVD-20 NVD-22 Escape closes a modal drawer once and focus returns to its opener`() {
        showDrawer(variant = TanreiNavigationDrawerVariant.Modal, open = false)
        rule.onNodeWithTag(OPENER).requestFocus().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        item(0).assertIsFocused().performKeyInput { pressKey(Key.Escape) }
        rule.waitForIdle()
        assertEquals(listOf("close"), events)
        assertTrue(state.isClosed)
        assertEquals(0, dialogs())
        rule.onNodeWithTag(OPENER).assertIsFocused()
    }

    @Test
    fun `NVD-20 the platform's back and a press on the scrim each close a modal drawer once`() {
        showDrawer(variant = TanreiNavigationDrawerVariant.Modal)
        windowKey(KeyEvent.KEYCODE_BACK)
        assertEquals(listOf("close"), events)
        assertEquals(0, dialogs())
        state.open()
        rule.waitForIdle()
        rule.onNode(isDialog()).performTouchInput { click(Offset(width - 8f, height / 2f)) }
        rule.waitForIdle()
        assertEquals(listOf("close", "close"), events)
        assertTrue(state.isClosed)
    }

    @Test
    fun `NVD-20 a drag toward the start edge past half closes a modal drawer, a short slow one settles back, and a refused close stays open`() {
        showDrawer(variant = TanreiNavigationDrawerVariant.Modal)
        item(1).performTouchInput { swipe(Offset(centerX, centerY), Offset(centerX - 40.dp.toPx(), centerY), durationMillis = 2000) }
        rule.waitForIdle()
        assertTrue("a short drag settles back", state.isOpen)
        assertEquals(emptyList<String>(), events)
        item(1).performTouchInput { swipe(Offset(centerX, centerY), Offset(centerX - 200.dp.toPx(), centerY), durationMillis = 400) }
        rule.waitForIdle()
        assertEquals(listOf("close"), events)
        assertTrue(state.isClosed)
        // A close the owner refuses keeps it open.
        val refusing = TanreiDrawerState(TanreiDrawerValue.Open) { events += "refused"; false }
        state = refusing
        show {
            TanreiNavigationDrawer(drawerContent = { Destination(0, "Inbox") }, variant = TanreiNavigationDrawerVariant.Modal, drawerState = refusing, contentDescription = "Mail", windowInsets = WindowInsets(0, 0, 0, 0)) { Box(Modifier.fillMaxSize()) }
        }
        rule.onNode(isDialog()).performTouchInput { click(Offset(width - 8f, height / 2f)) }
        rule.waitForIdle()
        assertTrue(refusing.isOpen)
        assertEquals(1, dialogs())
    }

    @Test
    fun `NVD-21 activating a destination of a modal drawer emits it and then closes the drawer`() {
        showDrawer(variant = TanreiNavigationDrawerVariant.Modal)
        item(2).performClick()
        rule.waitForIdle()
        assertEquals(listOf("click:2:change", "close"), events)
        assertTrue(state.isClosed)
        assertEquals(0, dialogs())
    }

    @Test
    fun `NVD-22 a modal drawer slides out and its scrim fades over the exit motion`() {
        val slow = 400
        val system = tanrei.copy(navigationDrawer = tokens.copy(motionExitDuration = slow, motionExitEasing = tanrei.motion.easing.linear))
        showDrawer(system = system, variant = TanreiNavigationDrawerVariant.Modal)
        val start = bounds(tag(0)).left
        rule.mainClock.autoAdvance = false
        state.close()
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(slow / 2L)
        val half = bounds(tag(0)).left
        assertTrue("sliding out: $start → $half", half < start - 40.dp && half > start - tokens.containerWidth + 40.dp)
        val image = rule.onNode(isDialog()).captureToImage().toPixelMap()
        val alpha = image[image.width - 4, image.height / 2].alpha
        assertTrue("the scrim fading: $alpha", alpha > 0.05f && alpha < tokens.scrimColor.resolve(colors).alpha - 0.05f)
        rule.mainClock.advanceTimeBy(slow.toLong())
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        assertEquals(0, dialogs())
    }

    // ── NVD-23: semantics ────────────────────────────────────────────────────

    @Test
    fun `NVD-23 each destination is one button with its selected state and position, its icon hidden - and a modal drawer is a dialog named by its label`() {
        showDrawer()
        (0..3).forEach { i ->
            item(i).assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
            assertEquals(i, item(i).fetchSemanticsNode().config[SemanticsProperties.CollectionItemInfo].rowIndex)
        }
        item(1).assert(SemanticsMatcher.expectValue(SemanticsProperties.Text, listOf(androidx.compose.ui.text.AnnotatedString("Sent"))))
        item(0).assertIsSelected()
        item(1).assertIsNotSelected()
        assertEquals("the icon is not an element", 0, rule.onAllNodes(hasText("sent")).fetchSemanticsNodes().size)
        showDrawer(variant = TanreiNavigationDrawerVariant.Modal)
        assertEquals(1, dialogs())
        rule.onNode(SemanticsMatcher.expectValue(SemanticsProperties.PaneTitle, "Mail")).assertExists()
    }

    // ── NVD-24: no name ──────────────────────────────────────────────────────

    @Test
    fun `NVD-24 an empty label still renders and works, and a modal drawer without a label is reported`() = collectingReports { reports ->
        setDebuggable(true)
        showDrawer(labels = listOf("Inbox", "", "Drafts"))
        item(1).performClick()
        rule.waitForIdle()
        assertEquals(listOf("click:1:change"), events)
        assertTrue(reports.toString(), reports.any { "TanreiNavigationDrawerItem" in it && "label" in it })
        showDrawer(variant = TanreiNavigationDrawerVariant.Modal, label = "")
        assertTrue(reports.toString(), reports.any { "TanreiNavigationDrawer:" in it && "contentDescription" in it })
    }

    // ── NVD-25: insets ───────────────────────────────────────────────────────

    @Test
    fun `NVD-25 the drawer reaches under the start, top and bottom insets and keeps its content inside them`() {
        showDrawer(insets = WindowInsets(left = 12.dp, top = 24.dp, right = 0.dp, bottom = 20.dp))
        assertEquals("beside the start inset", (tokens.containerWidth + 12.dp).value, bounds(CONTENT).left.value, 0.5f)
        assertPixel("under the top inset", stagePixel(40.dp, 4.dp), drawerColor())
        assertEquals((12.dp + tokens.containerPaddingInline).value, rowBounds(0).left.value, 0.6f)
        assertTrue("below the top inset", bounds(tag(0)).top >= 24.dp + tokens.containerPaddingBlock - 0.5.dp)
    }

    // ── NVD-26: an unknown variant ───────────────────────────────────────────

    @Test
    fun `NVD-26 a variant the system does not have draws with standard's tokens, and a debuggable app reports it`() = collectingReports { reports ->
        showDrawer()
        val expected = stage()
        setDebuggable(true)
        showDrawer(variant = TanreiNavigationDrawerVariant("floating"))
        assertSameAs(expected, stage(), "an unknown variant")
        assertTrue(reports.toString(), reports.any { "floating" in it && "TanreiNavigationDrawer" in it })
    }

    // ── NVD-27: enlarged text ────────────────────────────────────────────────

    @Test
    fun `NVD-27 enlarged text keeps the width, grows rows and headings, and does not scale icons`() {
        showDrawer(fontScale = 2f, items = {
            TanreiNavigationDrawerSection(heading = "Mail") { Destination(0, "Inbox and everything that was sent to it"); Destination(1, "Sent") }
        })
        assertEquals(tokens.containerWidth.value, bounds(CONTENT).left.value, 0.5f)
        val row = rowBounds(0)
        assertTrue("the row grows: ${row.bottom - row.top}", row.bottom - row.top > tokens.itemContainerHeight)
        val heading = rule.onNode(SemanticsMatcher.keyIsDefined(SemanticsProperties.Heading)).getUnclippedBoundsInRoot()
        assertTrue("the heading grows", heading.bottom - heading.top >= tokens.headingHeight)
        with(rule.density) { assertEquals(tokens.itemIconSize.toPx(), iconBounds.getValue("inbox and everything that was sent to it").width, 0.5f) }
    }

    // ── NVD-29: repeated values ──────────────────────────────────────────────

    @Test
    fun `NVD-29 when two destinations are marked selected the first in reading order is drawn selected, and a debuggable app reports it`() = collectingReports { reports ->
        setDebuggable(true)
        showDrawer(marked = setOf(1, 2))
        rule.waitForIdle()
        item(1).assertIsSelected()
        item(2).assertIsNotSelected()
        assertPixel("no container on the second", rowPixel(2), drawerColor())
        assertTrue(reports.toString(), reports.any { "more than one" in it })
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun TanreiSystem.withLook(selected: Boolean, state: TanreiInteractionState, change: (TanreiNavigationDrawerConditionStateTokens) -> TanreiNavigationDrawerConditionStateTokens): TanreiSystem {
        val conditions = navigationDrawer.conditions
        val look = if (selected) conditions.selected else conditions.unselected
        val changed = when (state) {
            TanreiInteractionState.Enabled -> look.copy(enabled = change(look.enabled))
            TanreiInteractionState.Hovered -> look.copy(hovered = change(look.hovered))
            TanreiInteractionState.Focused -> look.copy(focused = change(look.focused))
            TanreiInteractionState.Pressed -> look.copy(pressed = change(look.pressed))
            TanreiInteractionState.Disabled -> look.copy(disabled = change(look.disabled))
        }
        return copy(navigationDrawer = navigationDrawer.copy(conditions = if (selected) conditions.copy(selected = changed) else conditions.copy(unselected = changed)))
    }

    /** The standard drawer's color in the scene's system. */
    private fun drawerColor(): Color = (scene?.system ?: tanrei).let { it.navigationDrawer.variants.standard.containerColor.resolve(it.colors.light) }

    /** Sends a key down and up to the modal drawer's window, as the platform does when no view used it. */
    private fun windowKey(code: Int) {
        val root = dialogView!!.rootView
        rule.runOnUiThread {
            root.dispatchKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, code))
            root.dispatchKeyEvent(KeyEvent(KeyEvent.ACTION_UP, code))
        }
        rule.waitForIdle()
    }

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

    private fun bounds(tag: String): DpRect = rule.onNodeWithTag(tag).getUnclippedBoundsInRoot()

    private fun textBounds(text: String): DpRect = rule.onNode(hasText(text), useUnmergedTree = true).getUnclippedBoundsInRoot()

    /**
     * The drawn row of destination [index]: its cell less half the gap above and below — or, where the cell is held at
     * the touch target because the row and the gap give less (NVD-6), the row's own height, centered.
     */
    private fun rowBounds(index: Int): DpRect {
        val cell = bounds(tag(index))
        val system = scene?.system ?: tanrei
        val t = system.navigationDrawer
        val cellHeight = cell.bottom - cell.top
        val held = t.itemContainerHeight + t.containerGap < system.measure.targetTouch && abs((cellHeight - system.measure.targetTouch).value) < 0.5f
        val height = if (held) t.itemContainerHeight else cellHeight - t.containerGap
        val top = cell.top + (cellHeight - height) / 2
        return DpRect(cell.left, top, cell.right, top + height)
    }

    /** A pixel inside destination [index]'s row, clear of its content (4 in from its start). */
    private fun rowPixel(index: Int): Color {
        val row = rowBounds(index)
        return stagePixel(row.left + 4.dp, (row.top + row.bottom) / 2)
    }

    /** Where destination [index]'s badge text is: the last 40 of its row before the end padding. */
    private fun badgeArea(index: Int): DpRect {
        val row = rowBounds(index)
        val system = scene?.system ?: tanrei
        return DpRect(row.right - system.navigationDrawer.itemPaddingInline - 40.dp, row.top, row.right - system.navigationDrawer.itemPaddingInline + 1.dp, row.bottom)
    }

    private fun stage(): PixelMap = rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap()

    /** A pixel at ([x], [y]) of the stage (at the root's origin). */
    private fun stagePixel(x: Dp, y: Dp): Color = with(rule.density) { stage()[x.roundToPx().coerceIn(0, STAGE_WIDTH.roundToPx() - 1), y.roundToPx().coerceIn(0, STAGE_HEIGHT.roundToPx() - 1)] }

    private fun anyPixelClose(area: DpRect, color: Color, tolerance: Float = 0.1f): Boolean {
        val map = stage()
        return with(rule.density) {
            val left = area.left.roundToPx().coerceIn(0, map.width - 1)
            val right = area.right.roundToPx().coerceIn(0, map.width)
            val top = area.top.roundToPx().coerceIn(0, map.height - 1)
            val bottom = area.bottom.roundToPx().coerceIn(0, map.height)
            (top until bottom).any { y -> (left until right).any { x -> isClose(map[x, y], color, tolerance) } }
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
        const val LAYOUT = "layout"
        const val CONTENT = "content"
        const val OPENER = "opener"
        const val AFTER = "after"
        const val HEADER = "header"
        val FOUR = listOf("Inbox", "Sent", "Drafts", "Trash")
        const val PIXEL_TOLERANCE = 2f / 255f
        val STAGE_WIDTH = 400.dp
        val STAGE_HEIGHT = 560.dp
    }
}

/** NVD-18, NVD-19 and NVD-22 where motion is reduced (the animator duration scale is 0). */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w400dp-h640dp-xhdpi")
class TanreiNavigationDrawerReducedMotionTest {
    private object NoMotion : MotionDurationScale {
        override val scaleFactor: Float = 0f
    }

    @get:Rule
    val rule = createComposeRule(effectContext = NoMotion)

    @Test
    fun `NVD-18 NVD-19 NVD-22 where motion is reduced a drawer opens and closes at once`() {
        val tanrei = TanreiSystem.Tanrei
        val slow = tanrei.navigationDrawer.copy(motionEnterDuration = 1000, motionExitDuration = 1000)
        val state = TanreiDrawerState()
        val variant: MutableState<TanreiNavigationDrawerVariant> = mutableStateOf(TanreiNavigationDrawerVariant.Standard)
        rule.setContent {
            TanreiTheme(system = tanrei.copy(navigationDrawer = slow), theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                TanreiNavigationDrawer(
                    drawerContent = { TanreiNavigationDrawerItem(selected = true, onClick = {}, label = "Inbox", modifier = Modifier.testTag("item")) },
                    variant = variant.value,
                    drawerState = state,
                    contentDescription = "Mail",
                    windowInsets = WindowInsets(0, 0, 0, 0),
                ) { Box(Modifier.testTag("content").fillMaxSize()) }
            }
        }
        rule.waitForIdle()
        rule.mainClock.autoAdvance = false
        state.open()
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        repeat(3) { rule.mainClock.advanceTimeByFrame() }
        assertEquals("standard: its width at once", tanrei.navigationDrawer.containerWidth.value, rule.onNodeWithTag("content").getUnclippedBoundsInRoot().left.value, 0.5f)
        state.close()
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        repeat(3) { rule.mainClock.advanceTimeByFrame() }
        assertEquals("and none at once", 0f, rule.onNodeWithTag("content").getUnclippedBoundsInRoot().left.value, 0.5f)
        variant.value = TanreiNavigationDrawerVariant.Modal
        state.open()
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        repeat(3) { rule.mainClock.advanceTimeByFrame() }
        assertEquals("modal: in place at once", 0f, rule.onNodeWithTag("item").getUnclippedBoundsInRoot().left.value - tanrei.navigationDrawer.containerPaddingInline.value, 0.5f)
        state.close()
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        repeat(3) { rule.mainClock.advanceTimeByFrame() }
        rule.mainClock.autoAdvance = true
        assertEquals("gone at once", 0, rule.onAllNodes(isDialog()).fetchSemanticsNodes().size)
    }
}
