package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PixelMap
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.click
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performKeyInput
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
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.primitives.TanreiText
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.M3Like
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiIconButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import java.io.File
import kotlin.math.abs
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TestRule
import org.junit.runner.RunWith
import org.junit.runners.model.Statement
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Behaviour tests for `specs/button-group.spec.json`. Each test names the behaviour id (`BGR-n`) it covers. Runs on the
 * JVM (Robolectric, native graphics). The group is drawn on the surface, start-aligned, between a focusable box before it
 * and one after it. An item's node (tagged `item-<i>`) is its layout, touch target included; its drawn container is found
 * in the pixels.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w480dp-h640dp-xhdpi")
class TanreiButtonGroupTest {
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
    private val tokens = tanrei.buttonGroup
    private val measure = tanrei.measure
    private val surface = colors[TanreiColorRole.Surface]
    private val filled = tanrei.button.variants.filled.enabled.containerColor.resolve(colors)

    private val events = mutableListOf<String>()

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
                        Box(Modifier.testTag(STAGE_TAG).background(TanreiColorRole.Surface.color)) {
                            Column {
                                Box(Modifier.testTag(BEFORE).size(8.dp).focusable())
                                current.content()
                                Box(Modifier.testTag(AFTER).size(8.dp).focusable())
                            }
                        }
                    }
                }
            }
        }
        rule.waitForIdle()
    }

    /** A group of filled Buttons labelled [labels], tagged `item-<i>`, in a box [width] wide (null: its natural width). */
    private fun showButtons(
        variant: TanreiButtonGroupVariant,
        labels: List<String> = THREE,
        system: TanreiSystem = tanrei,
        disabled: Set<Int> = emptySet(),
        size: TanreiButtonSize = TanreiButtonSize.Medium,
        width: Dp? = null,
        direction: LayoutDirection = LayoutDirection.Ltr,
        label: String = "Clipboard",
    ) = show(system, direction) {
        Box(Modifier.testTag(WRAPPER).then(if (width != null) Modifier.width(width) else Modifier)) {
            TanreiButtonGroup(variant = variant, contentDescription = label) {
                labels.forEachIndexed { i, text ->
                    TanreiButton(text = text, onClick = { events += "click:$text" }, modifier = Modifier.testTag(item(i)), variant = TanreiButtonVariant.Filled, size = size, enabled = i !in disabled)
                }
            }
        }
    }

    private fun item(index: Int) = "item-$index"

    private fun node(index: Int) = rule.onNodeWithTag(item(index))

    private fun bounds(index: Int): DpRect = node(index).getUnclippedBoundsInRoot()

    // ── BGR-1: the row ───────────────────────────────────────────────────────

    @Test
    fun `BGR-1 standard - items at their own sizes, standard-gap apart, centred on the row's middle`() {
        show {
            TanreiButtonGroup {
                TanreiButton(text = "Cancel", onClick = {}, modifier = Modifier.testTag(item(0)), size = TanreiButtonSize.Small)
                TanreiButton(text = "Publish", onClick = {}, modifier = Modifier.testTag(item(1)), size = TanreiButtonSize.Large)
            }
        }
        val a = drawn(0)
        val b = drawn(1)
        assertEquals("standard-gap between the drawn buttons", tokens.standardGap.value, (b.left - a.right).value, 0.6f)
        assertEquals("each at its own height", tanrei.button.sizes.small.containerHeight.value, (a.bottom - a.top).value, 0.6f)
        assertEquals(tanrei.button.sizes.large.containerHeight.value, (b.bottom - b.top).value, 0.6f)
        assertEquals("centred on the same middle", ((a.top + a.bottom) / 2).value, ((b.top + b.bottom) / 2).value, 0.6f)
    }

    @Test
    fun `BGR-1 connected - connected-gap apart, every item stretched to the tallest`() {
        show {
            TanreiButtonGroup(variant = TanreiButtonGroupVariant.Connected) {
                TanreiButton(text = "Cut", onClick = {}, modifier = Modifier.testTag(item(0)), size = TanreiButtonSize.Small)
                TanreiButton(text = "Copy", onClick = {}, modifier = Modifier.testTag(item(1)), size = TanreiButtonSize.Large)
                TanreiIconButton(onClick = {}, contentDescription = "More", modifier = Modifier.testTag(item(2)), variant = TanreiIconButtonVariant.Filled, size = TanreiIconButtonSize.Small) { NamedFixtureGlyph("add") }
            }
        }
        val a = drawn(0)
        val b = drawn(1)
        val c = drawn(2)
        assertEquals("connected-gap apart", tokens.connectedGap.value, (b.left - a.right).value, 0.6f)
        assertEquals(tokens.connectedGap.value, (c.left - b.right).value, 0.6f)
        val tallest = tanrei.button.sizes.large.containerHeight
        listOf(a, b, c).forEach { assertEquals("stretched to the tallest", tallest.value, (it.bottom - it.top).value, 0.6f) }
    }

    @Test
    fun `BGR-1 connected - a label that wraps grows every item with it`() {
        showButtons(TanreiButtonGroupVariant.Connected, labels = listOf("Cut", "Copy everything that was selected", "Paste"), width = 220.dp)
        val tall = drawn(1)
        assertTrue("the long label wraps: ${tall.bottom - tall.top}", tall.bottom - tall.top > tanrei.button.sizes.medium.containerHeight)
        assertEquals((tall.bottom - tall.top).value, (drawn(0).bottom - drawn(0).top).value, 0.6f)
        assertEquals((tall.bottom - tall.top).value, (drawn(2).bottom - drawn(2).top).value, 0.6f)
    }

    // ── BGR-2: inner corners ─────────────────────────────────────────────────

    @Test
    fun `BGR-2 connected - corners that face a neighbour take the inner shape, the outer ones stay the item's own, and standard leaves them all`() {
        val round = 12.dp
        val system = tanrei.copy(button = tanrei.button.copy(containerShape = round), buttonGroup = tokens.copy(connectedInnerShape = 0.dp))
        showButtons(TanreiButtonGroupVariant.Connected, system = system)
        val first = drawn(0)
        val middle = drawn(1)
        val last = drawn(2)
        assertPixel("the first item's outer corner is round", pixelAt(first.left + 0.5.dp, first.top + 0.5.dp), surface)
        assertPixel("its inner corner is the inner shape (square)", pixelAt(first.right - 0.5.dp, first.top + 0.5.dp), filled)
        assertPixel("a middle item: square at the start", pixelAt(middle.left + 0.5.dp, middle.bottom - 0.5.dp), filled)
        assertPixel("and at the end", pixelAt(middle.right - 0.5.dp, middle.top + 0.5.dp), filled)
        assertPixel("the last item's outer corner is round", pixelAt(last.right - 0.5.dp, last.bottom - 0.5.dp), surface)
        showButtons(TanreiButtonGroupVariant.Standard, system = system)
        val standard = drawn(0)
        assertPixel("standard: every corner the button's own", pixelAt(standard.right - 0.5.dp, standard.top + 0.5.dp), surface)
    }

    @Test
    @KeyboardNavigation
    fun `BGR-2 the focus ring follows the joined shape`() {
        val system = tanrei.copy(button = tanrei.button.copy(containerShape = 12.dp), buttonGroup = tokens.copy(connectedInnerShape = 0.dp))
        showButtons(TanreiButtonGroupVariant.Connected, system = system)
        val middle = drawn(1)
        node(1).requestFocus().assertIsFocused()
        rule.waitForIdle()
        // The ring's outer stroke runs square around the middle item's corner, offset + inner width + outer width out.
        val ring = colors[TanreiColorRole.FocusRing]
        val out = measure.focusOffset + measure.focusInnerWidth + measure.focusOuterWidth / 2
        // On the ring's corner arc about the square corner — far outside the arc it would draw around a 12 corner.
        assertPixel("the ring round the square corner", pixelAt(middle.left - out * 0.7071f, middle.top - out * 0.7071f), ring)
    }

    @Test
    fun `BGR-2 m3-like - the inner shape is its corner-small against its full-round buttons`() {
        assertEquals(TanreiSystem.M3Like.shape.small, TanreiSystem.M3Like.buttonGroup.connectedInnerShape)
    }

    // ── BGR-3: widths ────────────────────────────────────────────────────────

    @Test
    fun `BGR-3 connected - an item narrower than the target widens to it, its icon centred, and standard keeps the size`() {
        val icons: @Composable (TanreiButtonGroupVariant) -> Unit = { variant ->
            TanreiButtonGroup(variant = variant) {
                listOf("Bold", "Italic").forEachIndexed { i, name ->
                    TanreiIconButton(onClick = {}, contentDescription = name, modifier = Modifier.testTag(item(i)), variant = TanreiIconButtonVariant.Filled, size = TanreiIconButtonSize.Small) { NamedFixtureGlyph("add") }
                }
                TanreiButton(text = "A", onClick = {}, modifier = Modifier.testTag(item(2)))
            }
        }
        show { icons(TanreiButtonGroupVariant.Connected) }
        assertEquals("widened to the target", measure.targetTouch.value, (drawn(0).right - drawn(0).left).value, 0.6f)
        assertEquals(measure.targetTouch.value, (drawn(1).right - drawn(1).left).value, 0.6f)
        assertTrue("a short Button too", drawn(2).right - drawn(2).left >= measure.targetTouch - 0.5.dp)
        // Above and below the row the hit area still reaches the target.
        assertTrue(bounds(0).bottom - bounds(0).top >= measure.targetTouch)
        show { icons(TanreiButtonGroupVariant.Standard) }
        assertEquals("standard keeps the size", tanrei.iconButton.sizes.small.containerSize.value, (drawn(0).right - drawn(0).left).value, 0.6f)
    }

    // ── BGR-4: overlapping hit areas ─────────────────────────────────────────

    @Test
    fun `BGR-4 standard - a press on an item's visible bounds is that item's, and a press in the gap goes to the nearer one`() {
        show {
            TanreiButtonGroup {
                listOf("Edit", "Share").forEachIndexed { i, name ->
                    TanreiIconButton(onClick = { events += "click:$name" }, contentDescription = name, modifier = Modifier.testTag(item(i)), variant = TanreiIconButtonVariant.Filled, size = TanreiIconButtonSize.Small) { NamedFixtureGlyph("add") }
                }
            }
        }
        val a = drawn(0)
        val b = drawn(1)
        assertEquals(tokens.standardGap.value, (b.left - a.right).value, 0.6f)
        val middle = (a.right + b.left) / 2
        val stage = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
        val y = (a.top + a.bottom) / 2 - stage.top
        fun press(x: Dp) = rule.onNodeWithTag(STAGE_TAG).performTouchInput { click(Offset((x - stage.left).toPx(), y.toPx())) }
        press(middle - 1.dp)
        press(middle + 1.dp)
        press(a.right - 1.dp)
        press(b.left + 1.dp)
        rule.waitForIdle()
        assertEquals(listOf("click:Edit", "click:Share", "click:Edit", "click:Share"), events)
        assertEquals("the hit areas meet in the middle of the gap", bounds(0).right.value, bounds(1).left.value, 0.6f)
    }

    // ── BGR-5: the items stay themselves ─────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `BGR-5 each item keeps its own events, semantics and Tab stop, and the group takes no focus and no arrow keys`() {
        var bold by mutableStateOf(true)
        show {
            TanreiButtonGroup(variant = TanreiButtonGroupVariant.Connected, contentDescription = "Text style") {
                TanreiIconButton(onClick = { events += "click:bold" }, contentDescription = "Bold", modifier = Modifier.testTag(item(0)), checked = bold, onCheckedChange = { bold = it; events += "change:$it" }) { NamedFixtureGlyph("format_bold") }
                TanreiButton(text = "Clear", onClick = { events += "click:clear" }, modifier = Modifier.testTag(item(1)))
            }
        }
        node(0).assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
        node(0).assert(SemanticsMatcher.expectValue(SemanticsProperties.ToggleableState, ToggleableState.On))
        rule.onNodeWithTag(BEFORE).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        node(0).assertIsFocused().performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        node(0).performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        node(1).assertIsFocused().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        node(1).performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(AFTER).assertIsFocused()
        assertEquals(listOf("click:bold", "change:false", "click:clear"), events)
    }

    // ── BGR-6: the name ──────────────────────────────────────────────────────

    @Test
    fun `BGR-6 with a label the group is a named traversal group holding its items, without one it adds no element`() {
        showButtons(TanreiButtonGroupVariant.Standard, label = "Clipboard")
        val wrapper = rule.onNodeWithTag(WRAPPER).fetchSemanticsNode()
        val group = wrapper.children.single()
        assertEquals(listOf("Clipboard"), group.config[SemanticsProperties.ContentDescription])
        assertTrue(group.config[SemanticsProperties.IsTraversalGroup])
        assertEquals(3, group.children.size)
        showButtons(TanreiButtonGroupVariant.Standard, label = "")
        assertEquals("the items are the wrapper's own children", 3, rule.onNodeWithTag(WRAPPER).fetchSemanticsNode().children.size)
    }

    // ── BGR-7: narrowing ─────────────────────────────────────────────────────

    @Test
    fun `BGR-7 a row wider than its space narrows its Buttons in proportion, wraps their labels, keeps the icon buttons, and never wraps the row`() = collectingReports { reports ->
        val icon: @Composable () -> Unit = {
            TanreiIconButton(onClick = {}, contentDescription = "More", modifier = Modifier.testTag(item(2)), variant = TanreiIconButtonVariant.Filled, size = TanreiIconButtonSize.Small) { NamedFixtureGlyph("add") }
        }
        show {
            Box(Modifier.width(400.dp)) {
                TanreiButtonGroup {
                    TanreiButton(text = "Save as draft for later", onClick = {}, modifier = Modifier.testTag(item(0)))
                    TanreiButton(text = "Publish now", onClick = {}, modifier = Modifier.testTag(item(1)))
                    icon()
                }
            }
        }
        val wide = listOf(drawn(0).right - drawn(0).left, drawn(1).right - drawn(1).left)
        setDebuggable(true)
        show {
            Box(Modifier.width(240.dp)) {
                TanreiButtonGroup {
                    TanreiButton(text = "Save as draft for later", onClick = {}, modifier = Modifier.testTag(item(0)))
                    TanreiButton(text = "Publish now", onClick = {}, modifier = Modifier.testTag(item(1)))
                    icon()
                }
            }
        }
        val narrow = listOf(drawn(0).right - drawn(0).left, drawn(1).right - drawn(1).left)
        assertTrue("narrowed: $wide → $narrow", narrow[0] < wide[0] && narrow[1] <= wide[1])
        assertTrue("in proportion: the wider one gives more", wide[0] - narrow[0] >= wide[1] - narrow[1])
        assertTrue("its label wraps and it grows", drawn(0).bottom - drawn(0).top > tanrei.button.sizes.medium.containerHeight)
        assertEquals("the icon button keeps its size", tanrei.iconButton.sizes.small.containerSize.value, (drawn(2).right - drawn(2).left).value, 0.6f)
        assertEquals("one row", ((bounds(0).top + bounds(0).bottom) / 2).value, ((bounds(2).top + bounds(2).bottom) / 2).value, 0.6f)
        assertTrue("within its space", bounds(2).right <= rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot().left + 240.dp + 0.5.dp)
        assertTrue("fits: nothing reported", reports.none { "TanreiButtonGroup" in it })
        show {
            Box(Modifier.width(80.dp)) {
                TanreiButtonGroup {
                    TanreiButton(text = "Save", onClick = {}, modifier = Modifier.testTag(item(0)))
                    TanreiButton(text = "Publish", onClick = {}, modifier = Modifier.testTag(item(1)))
                    icon()
                }
            }
        }
        assertTrue(reports.toString(), reports.any { "TanreiButtonGroup" in it && "overflows" in it })
    }

    // ── BGR-8: right to left ─────────────────────────────────────────────────

    @Test
    fun `BGR-8 right-to-left orders the items from the right and mirrors which corners are inner`() {
        val system = tanrei.copy(button = tanrei.button.copy(containerShape = 12.dp), buttonGroup = tokens.copy(connectedInnerShape = 0.dp))
        showButtons(TanreiButtonGroupVariant.Connected, system = system, direction = LayoutDirection.Rtl)
        assertTrue("the first item on the right", bounds(0).left > bounds(1).left && bounds(1).left > bounds(2).left)
        val first = drawn(0)
        assertPixel("its outer corner on its right", pixelAt(first.right - 0.5.dp, first.top + 0.5.dp), surface)
        assertPixel("its inner corner on its left", pixelAt(first.left + 0.5.dp, first.top + 0.5.dp), filled)
    }

    // ── BGR-9: the variant ───────────────────────────────────────────────────

    @Test
    fun `BGR-9 the variant is closed - exactly the spec's values, so no unknown one can be passed`() {
        val spec = JSONObject(File(BUTTON_GROUP_SPEC).readText())
        val variant = (0 until spec.getJSONArray("props").length()).map { spec.getJSONArray("props").getJSONObject(it) }.single { it.getString("name") == "variant" }
        val values = (0 until variant.getJSONArray("values").length()).map { variant.getJSONArray("values").getString(it) }
        assertEquals(values, TanreiButtonGroupVariant.entries.map { it.name.lowercase() })
        assertEquals("standard", variant.getString("default"))
    }

    // ── BGR-10: what it holds ────────────────────────────────────────────────

    @Test
    fun `BGR-10 one item, or content that is not a Tanrei button, still renders, and a debuggable app reports it`() = collectingReports { reports ->
        setDebuggable(true)
        show {
            TanreiButtonGroup {
                TanreiButton(text = "Only", onClick = {}, modifier = Modifier.testTag(item(0)))
            }
        }
        node(0).assertExists()
        assertTrue(reports.toString(), reports.any { "TanreiButtonGroup" in it && "1 item" in it })
        show {
            TanreiButtonGroup {
                TanreiButton(text = "Save", onClick = {}, modifier = Modifier.testTag(item(0)))
                Box(Modifier.testTag(item(1))) { TanreiText("Plain") }
            }
        }
        node(1).assertExists()
        assertTrue(reports.toString(), reports.any { "TanreiButtonGroup" in it && "not a Tanrei Button" in it })
    }

    // ── BGR-11: changes ──────────────────────────────────────────────────────

    @Test
    fun `BGR-11 a disabled item keeps its place and corners, and removing one recomputes the inner corners at once`() {
        val system = tanrei.copy(button = tanrei.button.copy(containerShape = 12.dp), buttonGroup = tokens.copy(connectedInnerShape = 0.dp))
        showButtons(TanreiButtonGroupVariant.Connected, system = system)
        val before = (0..2).map { bounds(it) }
        showButtons(TanreiButtonGroupVariant.Connected, system = system, disabled = setOf(1))
        node(1).assertIsNotEnabled()
        (0..2).forEach { assertEquals("item $it keeps its place", before[it], bounds(it)) }
        var labels by mutableStateOf(THREE)
        show(system) {
            TanreiButtonGroup(variant = TanreiButtonGroupVariant.Connected) {
                labels.forEachIndexed { i, text -> TanreiButton(text = text, onClick = {}, modifier = Modifier.testTag(item(i))) }
            }
        }
        rule.mainClock.autoAdvance = false
        labels = THREE.take(2)
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        val last = drawn(1)
        assertPixel("the new last item's end corner is its own at once", pixelAt(last.right - 0.5.dp, last.top + 0.5.dp), surface)
        rule.mainClock.autoAdvance = true
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
        TanreiDiagnostics.forgetReportedSteps()
        try {
            block(reports)
        } finally {
            TanreiDiagnostics.reporter = previous
            setDebuggable(false)
        }
    }

    private fun stage(): PixelMap = rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap()

    /** A pixel of the stage at ([x], [y]) in the root's coordinates. */
    private fun pixelAt(x: Dp, y: Dp): Color {
        val stage = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
        return with(rule.density) { stage()[(x - stage.left).roundToPx(), (y - stage.top).roundToPx()] }
    }

    /**
     * The drawn container of item [index] (a filled or tonal one), in the root's coordinates: the pixels that differ from
     * the surface on the lines through the middle of the item's node.
     */
    private fun drawn(index: Int): DpRect {
        val map = stage()
        val stage = rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot()
        val node = bounds(index)
        return with(rule.density) {
            val left = (node.left - stage.left).roundToPx()
            val right = (node.right - stage.left).roundToPx()
            val top = (node.top - stage.top).roundToPx()
            val bottom = (node.bottom - stage.top).roundToPx()
            val midY = (top + bottom) / 2
            // Scan from the node's middle column outward along a line near the top of the drawn part, clear of the label.
            val columns = (left until right).filter { x -> (top until bottom).any { y -> !isClose(map[x, y], surface) } }
            val x0 = columns.first()
            val x1 = columns.last()
            // Through the middle of the container: its label is drawn over it, so every row there differs from the surface.
            val probeX = (x0 + x1) / 2
            val rows = (top until bottom).filter { y -> !isClose(map[probeX, y], surface) }
            DpRect(stage.left + x0.toDp(), stage.top + rows.first().toDp(), stage.left + (x1 + 1).toDp(), stage.top + (rows.last() + 1).toDp()).also { check(midY >= 0) }
        }
    }

    private fun isClose(actual: Color, expected: Color, tolerance: Float = PIXEL_TOLERANCE): Boolean =
        maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue)) <= tolerance

    private fun assertPixel(what: String, actual: Color, expected: Color) =
        assertTrue("$what: expected $expected but was $actual", isClose(actual, expected))

    private companion object {
        const val STAGE_TAG = "stage"
        const val WRAPPER = "wrapper"
        const val BEFORE = "before"
        const val AFTER = "after"
        val THREE = listOf("Cut", "Copy", "Paste")
        const val PIXEL_TOLERANCE = 2f / 255f
    }
}
