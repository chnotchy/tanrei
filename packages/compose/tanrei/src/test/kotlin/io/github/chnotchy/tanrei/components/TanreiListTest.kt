package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
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
import androidx.compose.ui.semantics.CollectionInfo
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
import androidx.compose.ui.test.assertIsNotFocused
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.hasClickAction
import androidx.compose.ui.test.hasText
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
import androidx.compose.ui.test.withKeyDown
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.max
import androidx.compose.ui.unit.sp
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
import io.github.chnotchy.tanrei.tokens.TanreiFocusStyle
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiListCondition
import io.github.chnotchy.tanrei.tokens.TanreiListConditionStateTokens
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiPressedFeedback
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import io.github.chnotchy.tanrei.tokens.TanreiTextStyle
import java.io.File
import kotlin.math.abs
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
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
 * Behaviour tests for `specs/list.spec.json`. Each test names the behaviour id (`LST-n`) it covers. Runs on the JVM
 * (Robolectric, native graphics) — no emulator needed.
 *
 * Most tests draw a list [W] wide on the surface; each item is tagged `item-<n>`. A row's container is probed at
 * [PROBE_X] from its inline start and 2 dp above its bottom edge (clear of its text); its headline color is read from
 * a [Swatch] in the leading slot where a test needs it.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiListTest {
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
    private val tokens = tanrei.list
    private val measure = tanrei.measure
    private val surface = colors[TanreiColorRole.Surface]

    private val events = mutableListOf<String>()
    private var selection by mutableStateOf<Set<String>>(emptySet())
    private var single by mutableStateOf<String?>(null)
    private var seenGlyph: TanreiIconGlyph? = null
    private var seenIconColor: Color = Color.Unspecified

    @Before
    fun setUp() {
        // ATF checks: NOT_RUN under Robolectric (see TanreiButtonTest); they run for real in the gallery's
        // instrumented tests. The explicit semantics assertions below guard accessibility here.
        rule.enableAccessibilityChecks()
    }

    private class Scene(val system: TanreiSystem, val direction: LayoutDirection, val fontScale: Float, val content: @Composable () -> Unit)

    private var scene by mutableStateOf<Scene?>(null)

    /** One scene on the surface, [W] wide. Called again, it replaces the scene with a fresh composition. */
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
                        Box(Modifier.testTag(STAGE_TAG).width(W).background(TanreiColorRole.Surface.color)) { current.content() }
                    }
                }
            }
        }
        rule.waitForIdle()
    }

    /** Two interactive items (the first may be disabled), in a list whose selection is none. */
    private fun showInteractive(system: TanreiSystem = tanrei, firstEnabled: Boolean = true, direction: LayoutDirection = LayoutDirection.Ltr) = show(system, direction) {
        TanreiList {
            TanreiListItem(WIFI, modifier = Modifier.testTag(tag(0)), supportingText = CONNECTED, enabled = firstEnabled, onClick = { events += "click:0" }, leadingIcon = { Swatch() })
            TanreiListItem(BLUETOOTH, modifier = Modifier.testTag(tag(1)), onClick = { events += "click:1" })
        }
    }

    /** A single-select listbox of [OPTIONS], selection in [single]; [disabled] options by value. */
    private fun showSingle(initial: String? = null, disabled: Set<String> = emptySet(), system: TanreiSystem = tanrei, label: String = LABEL) {
        single = initial
        show(system) {
            TanreiList(
                selectionMode = TanreiListSelectionMode.Single,
                contentDescription = label,
                selectedValue = single,
                onSelectionChange = { events += "change:$it"; single = it.single() },
            ) {
                OPTIONS.forEachIndexed { index, value ->
                    TanreiListItem(value.replaceFirstChar { it.uppercase() }, modifier = Modifier.testTag(tag(index)), value = value, enabled = value !in disabled, onClick = { events += "click:$value" })
                }
            }
        }
    }

    /** A multiple-select listbox of [OPTIONS], selection in [selection]. */
    private fun showMultiple(initial: Set<String> = emptySet()) {
        selection = initial
        show {
            TanreiList(
                selectionMode = TanreiListSelectionMode.Multiple,
                contentDescription = LABEL,
                selectedValues = selection,
                onSelectionChange = { events += "change:${it.sorted()}"; selection = it },
            ) {
                OPTIONS.forEachIndexed { index, value -> TanreiListItem(value.replaceFirstChar { it.uppercase() }, modifier = Modifier.testTag(tag(index)), value = value) }
            }
        }
    }

    /** A square of the content color the slot is given; records that color and the glyph. */
    @Composable
    private fun Swatch() {
        seenIconColor = LocalTanreiContentColor.current
        seenGlyph = LocalTanreiIconGlyph.current
        Box(Modifier.fillMaxSize().background(LocalTanreiContentColor.current))
    }

    private fun tag(index: Int) = "item-$index"

    /** A list is one Tab stop: focus its first item (the stop), then Down Arrow to the second. */
    private fun focusSecond() {
        item(0).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.DirectionDown) }
        rule.waitForIdle()
        item(1).assertIsFocused()
    }

    private fun item(index: Int) = rule.onNodeWithTag(tag(index))

    // ── LST-12 / LST-23: semantics ───────────────────────────────────────────

    @Test
    fun `LST-12 a list of selection none is a collection of its items, each with its position - an interactive item is one button`() {
        showInteractive()
        item(0)
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
            .assert(SemanticsMatcher.keyIsDefined(SemanticsProperties.CollectionItemInfo))
            .assertHasClickAction()
        assertEquals(0, item(0).fetchSemanticsNode().config[SemanticsProperties.CollectionItemInfo].rowIndex)
        assertEquals(1, item(1).fetchSemanticsNode().config[SemanticsProperties.CollectionItemInfo].rowIndex)
        val list = item(0).fetchSemanticsNode().parent!!
        assertEquals(CollectionInfo(rowCount = 2, columnCount = 1).rowCount, list.config[SemanticsProperties.CollectionInfo].rowCount)
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    @Test
    fun `LST-12 a listbox is a selectable group named by its label, each option selectable with its selected state and position, and interactive is ignored`() {
        showSingle(initial = "dark")
        val list = item(0).fetchSemanticsNode().parent!!
        assertTrue("a selectable group", SemanticsProperties.SelectableGroup in list.config)
        assertEquals(listOf(LABEL), list.config[SemanticsProperties.ContentDescription])
        assertEquals(3, list.config[SemanticsProperties.CollectionInfo].rowCount)
        item(0).assertIsNotSelected().assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Role)).assertHasClickAction()
        item(1).assertIsSelected()
        assertEquals(2, item(2).fetchSemanticsNode().config[SemanticsProperties.CollectionItemInfo].rowIndex)
        item(0).performClick()
        rule.waitForIdle()
        assertEquals("the option's onClick is ignored: the list selects", listOf("change:[light]"), events)
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    @Test
    fun `LST-23 an item is named by its headline and read with its overline, supporting and trailing text in reading order, the icons hidden`() {
        show {
            TanreiList {
                TanreiListItem(
                    "Roadmap", modifier = Modifier.testTag(tag(0)), overline = "Engineering", supportingText = LONG, supportingMaxLines = 1,
                    trailingText = "9:41", onClick = {}, leadingIcon = { TanreiText("inbox") }, trailingIcon = { TanreiText("chevron_right") },
                )
            }
        }
        item(0).assert(
            SemanticsMatcher.expectValue(
                SemanticsProperties.Text,
                listOf(AnnotatedString("Engineering"), AnnotatedString("Roadmap"), AnnotatedString(LONG), AnnotatedString("9:41")),
            ),
        )
        // Cleared: the ligatures stay in the unmerged tree (Compose keeps a cleared node's children there) but reach no
        // node assistive technology reads.
        assertEquals("the icon ligatures are not read", 0, rule.onAllNodes(hasText("inbox")).fetchSemanticsNodes().size)
        assertEquals(0, rule.onAllNodes(hasText("chevron_right")).fetchSemanticsNodes().size)
    }

    @Test
    fun `LST-23 an empty headline still renders and works, and a debuggable app reports it once - as it reports a listbox without a label`() = collectingReports { reports ->
        setDebuggable(true)
        show {
            TanreiList { TanreiListItem("", modifier = Modifier.testTag(tag(0)), onClick = { events += "click" }) }
        }
        item(0).performClick()
        rule.waitForIdle()
        assertEquals(listOf("click"), events)
        assertEquals(reports.toString(), 1, reports.size)
        assertTrue(reports.single(), "TanreiListItem" in reports.single() && "headline" in reports.single())
        reports.clear()
        showSingle(label = "")
        assertTrue(reports.toString(), reports.any { "TanreiList" in it && "contentDescription" in it })
    }

    @Test
    fun `LST-23 a release-like app reports nothing`() = collectingReports { reports ->
        setDebuggable(false)
        show { TanreiList(selectionMode = TanreiListSelectionMode.Single, selectedValue = "nowhere") { TanreiListItem("", value = "") } }
        assertEquals(emptyList<String>(), reports)
    }

    // ── LST-1 / LST-2: activation ────────────────────────────────────────────

    @Test
    fun `LST-1 a tap on an interactive item emits its click exactly once - anywhere on the row, its leading icon included`() {
        showInteractive()
        item(0).performClick()
        rule.waitForIdle()
        assertEquals(listOf("click:0"), events)
        item(0).performTouchInput { down(Offset(tokens.containerPaddingInlineStart.toPx() + 2f, centerY)); up() }
        rule.waitForIdle()
        assertEquals(listOf("click:0", "click:0"), events)
    }

    @Test
    @KeyboardNavigation
    fun `LST-1 Enter and Space on the focused item each emit its click exactly once`() {
        showInteractive()
        item(0).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        item(0).performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        assertEquals(listOf("click:0", "click:0"), events)
    }

    @Test
    fun `LST-1 an assistive technology click emits the click exactly once`() {
        showInteractive()
        item(1).performSemanticsAction(SemanticsActions.OnClick)
        rule.waitForIdle()
        assertEquals(listOf("click:1"), events)
    }

    @Test
    fun `LST-2 a disabled interactive item emits no click and exposes the disabled state`() {
        showInteractive(firstEnabled = false)
        item(0).assertIsNotEnabled().assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
        item(0).performTouchInput { down(center); up() }
        rule.waitForIdle()
        assertEquals(emptyList<String>(), events)
        item(1).assertIsEnabled()
    }

    @Test
    @KeyboardNavigation
    fun `LST-2 the arrow keys still reach a disabled item, but Space and Enter do not activate it`() {
        showInteractive(firstEnabled = false)
        item(1).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.DirectionUp) }
        rule.waitForIdle()
        item(0).assertIsFocused()
        item(0).performKeyInput { pressKey(Key.Spacebar); pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals(emptyList<String>(), events)
    }

    @Test
    fun `LST-2 a disabled option emits no change`() {
        showSingle(initial = "light", disabled = setOf("dark"))
        item(1).assertIsNotEnabled().performTouchInput { down(center); up() }
        rule.waitForIdle()
        assertEquals(emptyList<String>(), events)
        item(1).assertIsNotSelected()
    }

    // ── LST-3: the highest-precedence state, drawn from its tokens ───────────

    @Test
    fun `LST-3 hovered and pressed draw the container of the state's tokens, and release returns to rest`() {
        showInteractive()
        item(1).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertRow(1, tokens.conditions.unselected.hovered.containerColor)
        item(1).performTouchInput { down(center) }
        rule.waitForIdle()
        assertRow(1, tokens.conditions.unselected.pressed.containerColor)
        item(1).performTouchInput { up() }
        item(1).performMouseInput { moveTo(Offset(-10f, -10f)) }
        rule.waitForIdle()
        assertRow(1, tokens.conditions.unselected.enabled.containerColor)
    }

    @Test
    @KeyboardNavigation
    fun `LST-3 under acme, which values the states differently - pressed wins over focused wins over hovered`() {
        val acme = TanreiSystem.Acme
        val unselected = acme.list.conditions.unselected
        val acmeColors = acme.colors.light
        fun over(paint: TanreiPaint) = paint.resolve(acmeColors).compositeOver(acmeColors[TanreiColorRole.Surface])
        assertEquals("acme tells the four states apart", 4, listOf(unselected.enabled, unselected.hovered, unselected.focused, unselected.pressed).map { over(it.containerColor) }.toSet().size)
        showInteractive(system = acme)
        item(1).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertRowColor(1, clear = true, expected = over(unselected.hovered.containerColor))
        focusSecond()
        rule.waitForIdle()
        assertRowColor(1, clear = true, expected = over(unselected.focused.containerColor))
        item(1).performKeyInput { keyDown(Key.Enter) }
        rule.waitForIdle()
        assertRowColor(1, clear = true, expected = over(unselected.pressed.containerColor))
        item(1).performKeyInput { keyUp(Key.Enter) }
        rule.waitForIdle()
        assertRowColor(1, clear = true, expected = over(unselected.focused.containerColor))
        assertEquals(listOf("click:1"), events)
    }

    @Test
    fun `LST-3 every part comes from the state's tokens - the leading icon color when hovered, the opacity when pressed`() {
        val system = tanrei.withList(TanreiListCondition.Unselected, TanreiInteractionState.Hovered) { it.copy(leadingIconColor = TanreiPaint.Role(TanreiColorRole.Error)) }
            .let { it.copy(list = it.list.copy(pressed = it.list.pressed.copy(opacity = HALF))) }
        showInteractive(system = system)
        assertEquals(colors[TanreiColorRole.OnSurfaceVariant], seenIconColor)
        item(0).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertEquals(colors[TanreiColorRole.Error], seenIconColor)
        item(0).performTouchInput { down(center) }
        rule.waitForIdle()
        val pressedContainer = tokens.conditions.unselected.pressed.containerColor.resolve(colors)
        assertRowColor(0, pressedContainer.copy(alpha = pressedContainer.alpha * HALF).compositeOver(surface))
        item(0).performTouchInput { up() }
    }

    @Test
    fun `LST-3 LST-4 a tap does not select the focused state and shows no ring`() {
        showInteractive()
        item(0).performTouchInput { down(center); up() }
        rule.waitForIdle()
        assertRow(0, tokens.conditions.unselected.enabled.containerColor)
        assertPixel("no ring", rowPixel(0, W / 2, RING_PROBE), surface)
    }

    // ── LST-4: the focus ring, inside the row ────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `LST-4 keyboard focus shows the ring inside the row on the first frame, never outside it`() {
        showInteractive()
        item(0).requestFocus().assertIsFocused()
        rule.waitForIdle()
        rule.mainClock.autoAdvance = false
        item(0).performKeyInput { pressKey(Key.DirectionDown) }
        rule.mainClock.advanceTimeByFrame()
        assertPixel("the ring, inside the row's top edge", rowPixel(1, W / 2, RING_PROBE), colors[TanreiColorRole.FocusRing])
        assertPixel("the ring, inside the row's bottom edge", rowPixel(1, W / 2, rowHeight(1) - RING_PROBE), colors[TanreiColorRole.FocusRing])
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        val focused = tokens.conditions.unselected.focused.containerColor.resolve(colors).compositeOver(surface)
        assertPixel("the offset between ring and content", rowPixel(1, W / 2, measure.focusOuterWidth + measure.focusOffset / 2), focused)
        assertPixel("nothing above the row: that is the row before", rowPixel(1, W / 2, -RING_PROBE), surface)
    }

    @Test
    @KeyboardNavigation
    fun `LST-4 a disabled item the arrow keys reach shows its ring at full strength`() {
        showInteractive(firstEnabled = false)
        item(1).requestFocus().performKeyInput { pressKey(Key.DirectionUp) }
        rule.waitForIdle()
        item(0).assertIsFocused()
        assertPixel("the ring is not dimmed with the item", rowPixel(0, W / 2, RING_PROBE), colors[TanreiColorRole.FocusRing])
    }

    // ── LST-5: the minimum target ────────────────────────────────────────────

    @Test
    fun `LST-5 an interactive item or an option shorter than the target is the touch target tall - a static item is not`() {
        val short = 32.dp
        val system = tanrei.copy(list = tokens.copy(containerHeightOneLine = short, containerPaddingBlock = 2.dp))
        show(system) {
            Column {
                TanreiList {
                    TanreiListItem(INBOX, modifier = Modifier.testTag(tag(0)))
                    TanreiListItem(INBOX, modifier = Modifier.testTag(tag(1)), onClick = {})
                }
                TanreiList(selectionMode = TanreiListSelectionMode.Single, contentDescription = LABEL) { TanreiListItem(INBOX, modifier = Modifier.testTag(tag(2)), value = "a") }
            }
        }
        item(0).assertHeightIsEqualTo(short)
        item(1).assertHeightIsEqualTo(measure.targetTouch)
        item(2).assertHeightIsEqualTo(measure.targetTouch)
    }

    @Test
    fun `LST-5 the target comes from the system, and the whole row is the hit area`() {
        val target = 60.dp
        showInteractive(system = tanrei.copy(measure = measure.copy(targetTouch = target)))
        item(1).assertHeightIsEqualTo(target)
        item(1).performTouchInput { down(Offset(width - 2f, 2f)); up() }
        rule.waitForIdle()
        assertEquals(listOf("click:1"), events)
    }

    // ── LST-6: disabled ──────────────────────────────────────────────────────

    @Test
    fun `LST-6 a disabled item keeps its resting colors and dims as a whole, its leading media included`() {
        show {
            TanreiList(selectionMode = TanreiListSelectionMode.Single, contentDescription = LABEL, selectedValue = "a") {
                TanreiListItem(INBOX, modifier = Modifier.testTag(tag(0)), value = "a", enabled = false, leadingMedia = TanreiListLeadingMedia.Image)
            }
        }
        val selected = tokens.conditions.selected
        assertEquals(selected.enabled.containerColor, selected.disabled.containerColor)
        assertEquals(selected.enabled.headlineColor, selected.disabled.headlineColor)
        val opacity = tokens.disabled.opacity
        assertEquals(tanrei.state.disabledContentOpacity, opacity)
        val fill = selected.disabled.containerColor.resolve(colors)
        assertRowColor(0, fill.copy(alpha = opacity).compositeOver(surface))
        val media = tokens.mediaContainerColor.resolve(colors).compositeOver(fill)
        assertPixel("the image, dimmed with the row", rowPixel(0, tokens.containerPaddingInlineStart + tokens.imageSize / 2, rowHeight(0) / 2), media.copy(alpha = opacity).compositeOver(surface))
    }

    @Test
    fun `LST-6 the disabled tokens drive it, and a disabled item ignores hover`() {
        val system = tanrei.withList(TanreiListCondition.Unselected, TanreiInteractionState.Disabled) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
            .let { it.copy(list = it.list.copy(disabled = it.list.disabled.copy(opacity = HALF))) }
        showInteractive(system = system, firstEnabled = false)
        val expected = colors[TanreiColorRole.Error].copy(alpha = HALF).compositeOver(surface)
        assertRowColor(0, expected)
        item(0).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertRowColor(0, expected)
    }

    // ── LST-7: closed enums ──────────────────────────────────────────────────

    @Test
    fun `LST-7 selection and leadingMedia are closed enums holding exactly the spec's values, so no undefined value can be passed`() {
        assertEquals(listOf("none", "single", "multiple"), TanreiListSelectionMode.entries.map { it.name.lowercase() })
        assertEquals(listOf("none", "avatar", "image"), TanreiListLeadingMedia.entries.map { it.name.lowercase() })
        // The conditions are not a prop: the list's selection picks them, so no unknown condition can be named either.
        assertEquals(tokens.conditions.unselected, tokens.conditions[TanreiListCondition("nowhere")])
    }

    // ── LST-8: pressed at once, held for press-hold ──────────────────────────

    @Test
    fun `LST-8 a tap that ends at once shows the pressed state on the next frame and keeps it for press-hold`() {
        showInteractive()
        val hold = tanrei.motion.duration.pressHold.toLong()
        rule.mainClock.autoAdvance = false
        item(1).performTouchInput { down(center); up() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertRow(1, tokens.conditions.unselected.pressed.containerColor)
        rule.mainClock.advanceTimeBy(hold / 2)
        assertRow(1, tokens.conditions.unselected.pressed.containerColor)
        rule.mainClock.advanceTimeBy(hold + tokens.motionStateDuration * 2L)
        assertRow(1, tokens.conditions.unselected.enabled.containerColor)
        assertEquals(listOf("click:1"), events)
    }

    @Test
    fun `LST-8 the hold time is the system's press-hold duration`() {
        val long = 400
        showInteractive(system = tanrei.copy(motion = tanrei.motion.copy(duration = tanrei.motion.duration.copy(pressHold = long))))
        rule.mainClock.autoAdvance = false
        item(1).performTouchInput { down(center); up() }
        rule.mainClock.advanceTimeBy(long - 100L)
        assertRow(1, tokens.conditions.unselected.pressed.containerColor)
        rule.mainClock.advanceTimeBy(100L + tokens.motionStateDuration * 2L)
        assertRow(1, tokens.conditions.unselected.enabled.containerColor)
    }

    // ── LST-9: pressed feedback ──────────────────────────────────────────────

    private fun TanreiSystem.answering(feedback: TanreiPressedFeedback) = copy(behavior = behavior.copy(pressedFeedback = feedback))

    @Test
    fun `LST-9 overlay is the default - the pressed tokens apply to the whole row at once`() {
        assertEquals(TanreiPressedFeedback.Overlay, tanrei.behavior.pressedFeedback)
        showInteractive()
        rule.mainClock.autoAdvance = false
        item(1).performTouchInput { down(Offset(8.dp.toPx(), centerY)) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        val pressed = tokens.conditions.unselected.pressed.containerColor.resolve(colors).compositeOver(surface)
        assertPixel("near the contact", rowPixel(1, PROBE_X, rowHeight(1) - 2.dp), pressed)
        assertPixel("at the far end, at once", rowPixel(1, W - PROBE_X, rowHeight(1) - 2.dp), pressed)
        item(1).performTouchInput { up() }
    }

    @Test
    fun `LST-9 ripple - m3-like's answer - grows the pressed color from the point of contact, then fades`() {
        assertEquals(TanreiPressedFeedback.Ripple, TanreiSystem.M3Like.behavior.pressedFeedback)
        showInteractive(system = tanrei.answering(TanreiPressedFeedback.Ripple))
        val resting = surface
        val pressed = tokens.conditions.unselected.pressed.containerColor.resolve(colors).compositeOver(surface)
        rule.mainClock.autoAdvance = false
        item(1).performTouchInput { down(Offset(PROBE_X.toPx(), height - 2.dp.toPx())) }
        rule.mainClock.advanceTimeBy(50)
        assertPixel("the layer has reached the point of contact", rowPixel(1, PROBE_X, rowHeight(1) - 2.dp), pressed)
        assertPixel("but not the far end", rowPixel(1, W - PROBE_X, rowHeight(1) - 2.dp), resting)
        rule.mainClock.advanceTimeBy(tokens.motionFeedbackDuration.toLong())
        assertPixel("the far end once grown", rowPixel(1, W - PROBE_X, rowHeight(1) - 2.dp), pressed)
        item(1).performTouchInput { up() }
        rule.mainClock.advanceTimeBy(tanrei.motion.duration.pressHold + tokens.motionStateDuration * 2L)
        assertPixel("faded", rowPixel(1, W - PROBE_X, rowHeight(1) - 2.dp), resting)
    }

    @Test
    @KeyboardNavigation
    fun `LST-9 a keyboard ripple grows from the center`() {
        val acme = TanreiSystem.Acme.answering(TanreiPressedFeedback.Ripple)
        val acmeColors = acme.colors.light
        val unselected = acme.list.conditions.unselected
        fun over(paint: TanreiPaint) = paint.resolve(acmeColors).compositeOver(acmeColors[TanreiColorRole.Surface])
        showInteractive(system = acme)
        focusSecond()
        rule.mainClock.autoAdvance = false
        item(1).performKeyInput { keyDown(Key.Enter) }
        val middle = rowHeight(1) - FOCUS_CLEAR
        // The ripple is the pressed state layer, grown over the container of the state under the press (focused).
        val grown = unselected.pressed.containerColor.resolve(acmeColors).compositeOver(over(unselected.focused.containerColor))
        var frames = 0
        while (!isClose(rowPixel(1, W / 2, middle), grown) && frames++ < MAX_FRAMES) rule.mainClock.advanceTimeByFrame()
        assertPixel("the layer reached the center first", rowPixel(1, W / 2, middle), grown)
        assertPixel("not the start", rowPixel(1, FOCUS_CLEAR, middle), over(unselected.focused.containerColor))
        item(1).performKeyInput { keyUp(Key.Enter) }
    }

    @Test
    fun `LST-9 dim - cupertino's answer - applies the pressed opacity to the whole row and draws no state layer`() {
        val cupertino = TanreiSystem.Cupertino
        assertEquals(TanreiPressedFeedback.Dim, cupertino.behavior.pressedFeedback)
        val opacity = cupertino.list.pressed.opacity
        assertTrue("cupertino dims a pressed row", opacity < 1f)
        val cupertinoColors = cupertino.colors.light
        showInteractive(system = cupertino)
        item(0).performTouchInput { down(center) }
        rule.waitForIdle()
        val cupertinoSurface = cupertinoColors[TanreiColorRole.Surface]
        assertPixel("no state layer: the surface shows through", rowPixel(0, W - PROBE_X, rowHeight(0) - 2.dp), cupertinoSurface)
        val icon = cupertino.list.conditions.unselected.pressed.leadingIconColor.resolve(cupertinoColors)
        assertPixel("the icon, dimmed", rowPixel(0, cupertino.list.containerPaddingInlineStart + cupertino.list.leadingIconSize / 2, rowHeight(0) / 2), icon.copy(alpha = opacity).compositeOver(cupertinoSurface))
        item(0).performTouchInput { up() }
    }

    /** Hovered has a container color of its own (success); pressed differs in its icon color (error) and opacity. */
    private fun TanreiSystem.pressedDiffersEverywhere(): TanreiSystem =
        withList(TanreiListCondition.Unselected, TanreiInteractionState.Hovered) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Success)) }
            .withList(TanreiListCondition.Unselected, TanreiInteractionState.Pressed) { it.copy(leadingIconColor = TanreiPaint.Role(TanreiColorRole.Error)) }
            .let { it.copy(list = it.list.copy(pressed = it.list.pressed.copy(opacity = HALF))) }

    private fun assertOnlyTheContainerColorStays(feedback: TanreiPressedFeedback) {
        showInteractive(system = tanrei.answering(feedback).pressedDiffersEverywhere())
        fun dimmed(color: Color) = color.copy(alpha = HALF).compositeOver(surface)
        val hovered = colors[TanreiColorRole.Success]
        item(0).performMouseInput { moveTo(Offset(width - 4f, centerY)) }
        rule.waitForIdle()
        assertRowColor(0, hovered)
        rule.mainClock.autoAdvance = false
        item(0).performMouseInput { press() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("the HOVERED container stays under the press, at the pressed opacity", rowPixel(0, PROBE_X, rowHeight(0) - 2.dp), dimmed(hovered))
        assertEquals("the pressed icon color", colors[TanreiColorRole.Error], seenIconColor)
        item(0).performMouseInput { release() }
    }

    @Test
    fun `LST-9 under ripple only the container color stays with the state under the press`() = assertOnlyTheContainerColorStays(TanreiPressedFeedback.Ripple)

    @Test
    fun `LST-9 under dim only the container color stays with the state under the press`() = assertOnlyTheContainerColorStays(TanreiPressedFeedback.Dim)

    @Test
    fun `LST-9 under none every part stays with the state under the press, and it still clicks`() {
        showInteractive(system = tanrei.answering(TanreiPressedFeedback.None).pressedDiffersEverywhere())
        item(0).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val hovered = stage()
        item(0).performMouseInput { press() }
        rule.waitForIdle()
        assertSameAs(hovered, stage(), "pressed under none")
        item(0).performMouseInput { release() }
        rule.waitForIdle()
        assertEquals(listOf("click:0"), events)
    }

    // ── LST-10: corner smoothing and focus style ─────────────────────────────

    @Test
    fun `LST-10 a system that rounds the rows draws the corner of tanreiContainerShape, at 0 and at cupertino's 0_6`() {
        for (smoothing in listOf(0f, 0.6f)) {
            val radius = 16.dp
            val system = tanrei.copy(shape = tanrei.shape.copy(cornerSmoothing = smoothing), list = tokens.copy(containerShape = radius))
                .withList(TanreiListCondition.Unselected, TanreiInteractionState.Enabled) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.OnSurface)) }
            show(system) { TanreiList { TanreiListItem(INBOX, modifier = Modifier.testTag(tag(0))) } }
            val map = rule.onNodeWithTag(tag(0)).captureToImage().toPixelMap()
            val outline = tanreiContainerShape(radius, smoothing)
            with(rule.density) {
                val size = androidx.compose.ui.geometry.Size(map.width.toFloat(), map.height.toFloat())
                val shape = outline.createOutline(size, LayoutDirection.Ltr, this)
                // The pixel where the drawn corner and the shape's own outline agree it is outside or inside.
                val probe = (radius * (1f - 1f / kotlin.math.sqrt(2f)) / 2).roundToPx()
                val insideShape = when (shape) {
                    is androidx.compose.ui.graphics.Outline.Generic -> shape.path.let { path -> androidx.compose.ui.graphics.Path().apply { addRect(androidx.compose.ui.geometry.Rect(probe.toFloat(), probe.toFloat(), probe + 1f, probe + 1f)) }.let { dot -> androidx.compose.ui.graphics.Path.combine(androidx.compose.ui.graphics.PathOperation.Intersect, path, dot).isEmpty.not() } }
                    is androidx.compose.ui.graphics.Outline.Rounded -> shape.roundRect.contains(Offset(probe + 0.5f, probe + 0.5f))
                    is androidx.compose.ui.graphics.Outline.Rectangle -> true
                }
                assertFalse("smoothing $smoothing: the probe is outside the corner", insideShape)
                val corner = map[probe, probe]
                assertPixel("smoothing $smoothing: the very corner is outside the shape", corner, surface)
                val inside = map[radius.roundToPx(), radius.roundToPx()]
                assertPixel("smoothing $smoothing: inside the corner", inside, colors[TanreiColorRole.OnSurface])
            }
        }
        assertEquals(0.6f, TanreiSystem.Cupertino.shape.cornerSmoothing)
    }

    @Test
    @KeyboardNavigation
    fun `LST-10 glow draws the focus colors as a soft halo inside the row under acme`() {
        val acme = TanreiSystem.Acme
        assertEquals(TanreiFocusStyle.Glow, acme.behavior.focusStyle)
        val ring = acme.colors.light[TanreiColorRole.FocusRing]
        showInteractive(system = acme)
        focusSecond()
        val m = acme.measure
        val extent = m.focusOffset + m.focusInnerWidth * 2 + m.focusOuterWidth * 2
        val focused = acme.list.conditions.unselected.focused.containerColor.resolve(acme.colors.light).compositeOver(acme.colors.light[TanreiColorRole.Surface])
        val edge = rowPixel(1, W / 2, extent - m.focusOffset - m.focusInnerWidth - m.focusOuterWidth / 4)
        assertTrue("the halo carries the focus color inside the row: $edge", !isClose(edge, focused) && ring.alpha > 0f)
        assertPixel("and draws nothing outside the row", rowPixel(1, W / 2, -RING_PROBE), acme.colors.light[TanreiColorRole.Surface])
    }

    // ── LST-11: static items ─────────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `LST-11 a static item is not focusable, has no action, draws no answer and ignores disabled - its trailing control keeps its own focus stop`() {
        val system = tanrei.pressedDiffersEverywhere()
        var checked by mutableStateOf(false)
        show(system) {
            Column {
                Box(Modifier.testTag(BEFORE).size(8.dp).focusable())
                TanreiList {
                    TanreiListItem(
                        WIFI, modifier = Modifier.testTag(tag(0)), enabled = false,
                        trailingContent = { TanreiSwitch(checked = checked, onCheckedChange = { checked = it }, label = WIFI, labelHidden = true, modifier = Modifier.testTag(SWITCH_TAG)) },
                    )
                }
            }
        }
        item(0)
            .assertHasNoClickAction()
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Disabled))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsActions.RequestFocus))
            .assert(SemanticsMatcher.keyIsDefined(SemanticsProperties.CollectionItemInfo))
        rule.onNodeWithTag(SWITCH_TAG).assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Switch))
        val resting = stage()
        item(0).performMouseInput { moveTo(Offset(40f, centerY)) }
        rule.waitForIdle()
        item(0).performMouseInput { press() }
        rule.waitForIdle()
        assertSameAs(resting, stage(), "a static item hovered and pressed")
        item(0).performMouseInput { release() }
        rule.onNodeWithTag(BEFORE).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(SWITCH_TAG).assertIsFocused()
        rule.onNodeWithTag(SWITCH_TAG).performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        assertTrue("the switch works on its own", checked)
    }

    // ── LST-13 / LST-14 / LST-26: selection ──────────────────────────────────

    @Test
    fun `LST-13 choosing another option of a single-select list sets the value and emits change once - the old one is unselected`() {
        showSingle(initial = "light")
        item(0).assertIsSelected()
        item(2).performClick()
        rule.waitForIdle()
        assertEquals(listOf("change:[system]"), events)
        item(2).assertIsSelected()
        item(0).assertIsNotSelected()
    }

    @Test
    fun `LST-13 activating the selected option changes nothing and emits nothing`() {
        showSingle(initial = "light")
        item(0).performClick()
        rule.waitForIdle()
        assertEquals(emptyList<String>(), events)
        item(0).assertIsSelected()
    }

    @Test
    fun `LST-14 activating an option of a multiple-select list adds or removes its value and emits change once`() {
        showMultiple(initial = setOf("dark"))
        item(0).performClick()
        rule.waitForIdle()
        item(1).performClick()
        rule.waitForIdle()
        assertEquals(listOf("change:[dark, light]", "change:[light]"), events)
        item(0).assertIsSelected()
        item(1).assertIsNotSelected()
    }

    @Test
    fun `LST-26 an option renders selected from the selected condition while the value names it - and nothing for a value no option has`() {
        showSingle(initial = "light")
        val selected = tokens.conditions.selected.enabled
        assertRow(0, selected.containerColor)
        assertRow(1, tokens.conditions.unselected.enabled.containerColor)
        showSingle(initial = "nowhere")
        for (i in OPTIONS.indices) item(i).assertIsNotSelected()
        showMultiple(initial = setOf("dark", "system"))
        item(0).assertIsNotSelected()
        item(1).assertIsSelected()
        item(2).assertIsSelected()
        assertRow(2, selected.containerColor)
    }

    @Test
    fun `LST-26 a debuggable app reports a value that names no option, and options whose value is empty or repeated - which still render`() = collectingReports { reports ->
        setDebuggable(true)
        show {
            TanreiList(selectionMode = TanreiListSelectionMode.Multiple, contentDescription = LABEL, selectedValues = setOf("a", "ghost")) {
                TanreiListItem("A", modifier = Modifier.testTag(tag(0)), value = "a")
                TanreiListItem("B", modifier = Modifier.testTag(tag(1)), value = "a")
                TanreiListItem("C", modifier = Modifier.testTag(tag(2)), value = "")
            }
        }
        rule.waitForIdle()
        item(2).assertExists()
        assertTrue(reports.toString(), reports.any { "ghost" in it })
        assertTrue(reports.toString(), reports.any { "\"a\"" in it && "more than one" in it })
        assertTrue(reports.toString(), reports.any { "\"C\"" in it && "empty" in it })
        assertEquals("each once", reports.size, reports.toSet().size)
        item(0).assertIsSelected()
        item(1).assertIsSelected()
    }

    // ── LST-15: the keyboard ─────────────────────────────────────────────────

    /** A button before and after the list, so Tab can enter and leave it. */
    private fun showBetween(initial: String?, disabled: Set<String> = emptySet(), static: Boolean = false) {
        single = initial
        show {
            Column {
                Box(Modifier.testTag(BEFORE).size(8.dp).focusable())
                TanreiList(selectionMode = TanreiListSelectionMode.Single, contentDescription = LABEL, selectedValue = single, onSelectionChange = { events += "change:$it"; single = it.single() }) {
                    OPTIONS.forEachIndexed { index, value -> TanreiListItem(value.replaceFirstChar { it.uppercase() }, modifier = Modifier.testTag(tag(index)), value = value, enabled = value !in disabled) }
                }
                if (static) TanreiList { TanreiListItem(INBOX, modifier = Modifier.testTag(tag(9))) }
                Box(Modifier.testTag(AFTER).size(8.dp).focusable())
            }
        }
    }

    @Test
    @KeyboardNavigation
    fun `LST-15 the list is one Tab stop - it enters at the selected option and leaves with the next Tab`() {
        showBetween(initial = "dark")
        rule.onNodeWithTag(BEFORE).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        item(1).assertIsFocused()
        item(1).performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(AFTER).assertIsFocused()
        rule.onNodeWithTag(AFTER).performKeyInput { withKeyDown(Key.ShiftLeft) { pressKey(Key.Tab) } }
        rule.waitForIdle()
        item(1).assertIsFocused()
        assertEquals("moving focus selects nothing", emptyList<String>(), events)
    }

    @Test
    @KeyboardNavigation
    fun `LST-15 with nothing selected the first enabled item is the Tab stop, and afterwards the item that had focus last`() {
        showBetween(initial = null, disabled = setOf("light"))
        rule.onNodeWithTag(BEFORE).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        item(1).assertIsFocused()
        item(1).performKeyInput { pressKey(Key.DirectionDown) }
        rule.waitForIdle()
        item(2).assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(AFTER).assertIsFocused().performKeyInput { withKeyDown(Key.ShiftLeft) { pressKey(Key.Tab) } }
        rule.waitForIdle()
        item(2).assertIsFocused()
    }

    @Test
    @KeyboardNavigation
    fun `LST-15 Down and Up move without wrapping, Home and End go to the ends, and none of it selects`() {
        showBetween(initial = "light")
        item(0).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.DirectionUp) }
        rule.waitForIdle()
        item(0).assertIsFocused().performKeyInput { pressKey(Key.DirectionDown) }
        rule.waitForIdle()
        item(1).assertIsFocused().performKeyInput { pressKey(Key.MoveEnd) }
        rule.waitForIdle()
        item(2).assertIsFocused().performKeyInput { pressKey(Key.DirectionDown) }
        rule.waitForIdle()
        item(2).assertIsFocused().performKeyInput { pressKey(Key.MoveHome) }
        rule.waitForIdle()
        item(0).assertIsFocused()
        assertEquals(emptyList<String>(), events)
        item(0).assertIsSelected()
    }

    @Test
    @KeyboardNavigation
    fun `LST-15 Space and Enter activate the focused item`() {
        showBetween(initial = "light")
        item(0).requestFocus().performKeyInput { pressKey(Key.DirectionDown) }
        rule.waitForIdle()
        item(1).performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        item(1).assertIsSelected()
        item(1).performKeyInput { pressKey(Key.DirectionDown) }
        rule.waitForIdle()
        item(2).performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals(listOf("change:[dark]", "change:[system]"), events)
    }

    @Test
    @KeyboardNavigation
    fun `LST-15 typed characters move focus to the next item whose headline begins with them`() {
        show {
            TanreiList {
                listOf("Apple", "Banana", "Blueberry", "Cherry").forEachIndexed { index, name -> TanreiListItem(name, modifier = Modifier.testTag(tag(index)), onClick = {}) }
            }
        }
        item(0).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.B) }
        rule.waitForIdle()
        item(1).assertIsFocused().performKeyInput { pressKey(Key.L) }
        rule.waitForIdle()
        item(2).assertIsFocused().performKeyInput { advanceEventTime(1500); pressKey(Key.C) }
        rule.waitForIdle()
        item(3).assertIsFocused().performKeyInput { advanceEventTime(1500); pressKey(Key.B) }
        rule.waitForIdle()
        item(1).assertIsFocused()
    }

    @Test
    @KeyboardNavigation
    fun `LST-15 static items take no focus - Tab passes a list of static items`() {
        showBetween(initial = "light", static = true)
        item(0).requestFocus().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(AFTER).assertIsFocused()
        item(9).assert(SemanticsMatcher.keyNotDefined(SemanticsActions.RequestFocus))
    }

    // ── LST-16 / LST-17: layout ──────────────────────────────────────────────

    @Test
    fun `LST-16 the row - padding start, the leading icon, the text column, the trailing text and icon, the mark, padding end, each gap apart`() {
        show {
            TanreiList(selectionMode = TanreiListSelectionMode.Single, contentDescription = LABEL) {
                TanreiListItem(
                    INBOX, modifier = Modifier.testTag(tag(0)), value = "a", trailingText = "12",
                    leadingIcon = { Box(Modifier.testTag(LEADING_TAG).fillMaxSize()) }, trailingIcon = { Box(Modifier.testTag(TRAILING_TAG).fillMaxSize()) },
                )
            }
        }
        val row = item(0).getUnclippedBoundsInRoot()
        val leading = rule.onNodeWithTag(LEADING_TAG, useUnmergedTree = true).getUnclippedBoundsInRoot()
        val trailing = rule.onNodeWithTag(TRAILING_TAG, useUnmergedTree = true).getUnclippedBoundsInRoot()
        val headline = rule.onNode(hasText(INBOX), useUnmergedTree = true).getUnclippedBoundsInRoot()
        assertEquals((row.left + tokens.containerPaddingInlineStart).value, leading.left.value, 0.5f)
        assertEquals(tokens.leadingIconSize.value, (leading.right - leading.left).value, 0.5f)
        assertEquals((leading.right + tokens.containerGap).value, headline.left.value, 0.5f)
        // From the end: padding end, the mark, gap, the trailing icon.
        assertEquals((row.right - tokens.containerPaddingInlineEnd - tokens.markSize - tokens.containerGap).value, trailing.right.value, 0.5f)
    }

    @Test
    fun `LST-16 right-to-left mirrors the row`() {
        show(direction = LayoutDirection.Rtl) {
            TanreiList { TanreiListItem(INBOX, modifier = Modifier.testTag(tag(0)), leadingIcon = { Box(Modifier.testTag(LEADING_TAG).fillMaxSize()) }) }
        }
        val row = item(0).getUnclippedBoundsInRoot()
        val leading = rule.onNodeWithTag(LEADING_TAG, useUnmergedTree = true).getUnclippedBoundsInRoot()
        val headline = rule.onNode(hasText(INBOX), useUnmergedTree = true).getUnclippedBoundsInRoot()
        assertEquals((row.right - tokens.containerPaddingInlineStart).value, leading.right.value, 0.5f)
        assertEquals((leading.left - tokens.containerGap).value, headline.right.value, 0.5f)
    }

    @Test
    fun `LST-16 right-to-left still grows the ripple from the point of contact`() {
        showInteractive(system = tanrei.answering(TanreiPressedFeedback.Ripple), direction = LayoutDirection.Rtl)
        val pressed = tokens.conditions.unselected.pressed.containerColor.resolve(colors).compositeOver(surface)
        rule.mainClock.autoAdvance = false
        item(1).performTouchInput { down(Offset(width - PROBE_X.toPx(), height - 2.dp.toPx())) }
        rule.mainClock.advanceTimeBy(50)
        assertPixel("at the point of contact", rowPixel(1, W - PROBE_X, rowHeight(1) - 2.dp), pressed)
        assertPixel("not yet at the other end", rowPixel(1, PROBE_X, rowHeight(1) - 2.dp), surface)
        item(1).performTouchInput { up() }
    }

    @Test
    fun `LST-17 one, two and three lines give the three minimum heights of the system`() {
        val system = tanrei.copy(list = tokens.copy(containerHeightOneLine = 50.dp, containerHeightTwoLine = 70.dp, containerHeightThreeLine = 100.dp))
        show(system) {
            TanreiList {
                TanreiListItem(INBOX, modifier = Modifier.testTag(tag(0)))
                TanreiListItem(INBOX, modifier = Modifier.testTag(tag(1)), overline = "Mail")
                TanreiListItem(INBOX, modifier = Modifier.testTag(tag(2)), supportingText = "One line")
                TanreiListItem(INBOX, modifier = Modifier.testTag(tag(3)), supportingText = LONG)
                TanreiListItem(INBOX, modifier = Modifier.testTag(tag(4)), overline = "Mail", supportingText = "One line")
            }
        }
        item(0).assertHeightIsEqualTo(50.dp)
        item(1).assertHeightIsEqualTo(70.dp)
        item(2).assertHeightIsEqualTo(70.dp)
        item(3).assertHeightIsEqualTo(100.dp)
        item(4).assertHeightIsEqualTo(100.dp)
    }

    @Test
    fun `LST-17 the default heights - 48, 64 and 80 - hold their text, and 200 percent text grows the row instead of clipping`() {
        assertEquals(listOf(48.dp, 64.dp, 80.dp), listOf(tokens.containerHeightOneLine, tokens.containerHeightTwoLine, tokens.containerHeightThreeLine))
        show { TanreiList { TanreiListItem(INBOX, modifier = Modifier.testTag(tag(0)), supportingText = "One line") } }
        item(0).assertHeightIsEqualTo(tokens.containerHeightTwoLine)
        show(fontScale = 2f) { TanreiList { TanreiListItem(INBOX, modifier = Modifier.testTag(tag(0)), supportingText = "One line") } }
        val row = item(0).getUnclippedBoundsInRoot()
        val supporting = rule.onNode(hasText("One line"), useUnmergedTree = true).getUnclippedBoundsInRoot()
        assertTrue("grew: ${row.bottom - row.top}", row.bottom - row.top > tokens.containerHeightTwoLine)
        assertEquals("padding-block below the text", (row.bottom - tokens.containerPaddingBlock).value, supporting.bottom.value, 0.6f)
    }

    @Test
    fun `LST-17 leading and trailing elements are centered on the text in a two-line item and aligned with its top in a three-line one`() {
        show {
            TanreiList {
                TanreiListItem(INBOX, modifier = Modifier.testTag(tag(0)), supportingText = "One line", leadingIcon = { Box(Modifier.testTag("lead-0").fillMaxSize()) })
                TanreiListItem(INBOX, modifier = Modifier.testTag(tag(1)), supportingText = LONG, leadingIcon = { Box(Modifier.testTag("lead-1").fillMaxSize()) })
            }
        }
        val two = item(0).getUnclippedBoundsInRoot()
        val twoIcon = rule.onNodeWithTag("lead-0", useUnmergedTree = true).getUnclippedBoundsInRoot()
        assertEquals(((two.top + two.bottom) / 2).value, ((twoIcon.top + twoIcon.bottom) / 2).value, 0.6f)
        val headline = rule.onAllNodes(hasText(INBOX), useUnmergedTree = true).fetchSemanticsNodes()[1].boundsInRoot
        val threeIcon = rule.onNodeWithTag("lead-1", useUnmergedTree = true).getUnclippedBoundsInRoot()
        assertEquals(with(rule.density) { headline.top.toDp() }.value, threeIcon.top.value, 0.6f)
    }

    // ── LST-18: text styles ──────────────────────────────────────────────────

    @Test
    fun `LST-18 each text is set in its token's style, the headline wraps, and a cut supporting text is read in full`() {
        val big = tanrei.typescale.heading1
        show(tanrei.copy(list = tokens.copy(headlineTypescale = big))) {
            TanreiList { TanreiListItem(LONG, modifier = Modifier.testTag(tag(0)), supportingText = LONG, supportingMaxLines = 1, onClick = {}) }
        }
        val headline = rule.onAllNodes(hasText(LONG), useUnmergedTree = true).fetchSemanticsNodes()[0].boundsInRoot
        val lineHeight = with(rule.density) { big.lineHeight.toPx() }
        assertTrue("the headline wraps onto more lines: ${headline.height} vs $lineHeight", headline.height > lineHeight * 1.5f)
        val supporting = rule.onAllNodes(hasText(LONG), useUnmergedTree = true).fetchSemanticsNodes()[1].boundsInRoot
        val supportingLine = with(rule.density) { tokens.supportingTextTypescale.lineHeight.toPx() }
        assertEquals("one line of supporting text", supportingLine, supporting.height, 1f)
        item(0).assert(SemanticsMatcher.expectValue(SemanticsProperties.Text, listOf(AnnotatedString(LONG), AnnotatedString(LONG))))
        assertNotEquals(tokens.headlineTypescale, big)
    }

    // ── LST-19 / LST-20: icons and media ─────────────────────────────────────

    @Test
    fun `LST-19 the icons are drawn in boxes of their tokens with the glyph of the item's condition - an empty slot leaves no space`() {
        show {
            TanreiList(selectionMode = TanreiListSelectionMode.Single, contentDescription = LABEL, selectedValue = "a") {
                TanreiListItem(INBOX, modifier = Modifier.testTag(tag(0)), value = "a", leadingIcon = { Swatch() })
            }
        }
        assertEquals(tanrei.icon.glyph(tokens.leadingIconSize, selected = true), seenGlyph)
        assertEquals(tokens.conditions.selected.enabled.leadingIconColor.resolve(colors), seenIconColor)
        show { TanreiList { TanreiListItem(INBOX, modifier = Modifier.testTag(tag(0)), leadingIcon = { Swatch() }) } }
        assertEquals(tanrei.icon.glyph(tokens.leadingIconSize, selected = false), seenGlyph)
        val withIcon = rule.onNode(hasText(INBOX), useUnmergedTree = true).getUnclippedBoundsInRoot().left
        show { TanreiList { TanreiListItem(INBOX, modifier = Modifier.testTag(tag(0))) } }
        val without = rule.onNode(hasText(INBOX), useUnmergedTree = true).getUnclippedBoundsInRoot().left
        assertEquals("no icon, no space", tokens.containerPaddingInlineStart.value, without.value, 0.5f)
        assertEquals((tokens.containerPaddingInlineStart + tokens.leadingIconSize + tokens.containerGap).value, withIcon.value, 0.5f)
    }

    @Test
    fun `LST-20 an avatar is a round box of avatar-size on the media color, handing its content the media content color - it replaces the icon`() {
        var seen = Color.Unspecified
        show {
            TanreiList {
                TanreiListItem(
                    INBOX, modifier = Modifier.testTag(tag(0)), leadingMedia = TanreiListLeadingMedia.Avatar,
                    leadingIcon = { Box(Modifier.testTag(LEADING_TAG).fillMaxSize()) },
                    leadingContent = { seen = LocalTanreiContentColor.current },
                )
            }
        }
        rule.onNodeWithTag(LEADING_TAG, useUnmergedTree = true).assertDoesNotExist()
        assertEquals(tokens.mediaContentColor.resolve(colors), seen)
        val center = tokens.containerPaddingInlineStart + tokens.avatarSize / 2
        val middle = rowHeight(0) / 2
        assertPixel("the media color", rowPixel(0, center, middle), tokens.mediaContainerColor.resolve(colors))
        assertPixel("round: the corner of its box is the surface", rowPixel(0, tokens.containerPaddingInlineStart + 2.dp, middle - tokens.avatarSize / 2 + 2.dp), surface)
        val headline = rule.onNode(hasText(INBOX), useUnmergedTree = true).getUnclippedBoundsInRoot()
        assertEquals((tokens.containerPaddingInlineStart + tokens.avatarSize + tokens.containerGap).value, headline.left.value, 0.5f)
    }

    @Test
    fun `LST-20 an image is a box of image-size clipped to image-shape, and none draws no leading slot`() {
        show { TanreiList { TanreiListItem(INBOX, modifier = Modifier.testTag(tag(0)), leadingMedia = TanreiListLeadingMedia.Image) } }
        val headline = rule.onNode(hasText(INBOX), useUnmergedTree = true).getUnclippedBoundsInRoot()
        assertEquals((tokens.containerPaddingInlineStart + tokens.imageSize + tokens.containerGap).value, headline.left.value, 0.5f)
        assertPixel("the image's box", rowPixel(0, tokens.containerPaddingInlineStart + tokens.imageSize / 2, rowHeight(0) / 2), tokens.mediaContainerColor.resolve(colors))
        show { TanreiList { TanreiListItem(INBOX, modifier = Modifier.testTag(tag(0)), leadingContent = { Box(Modifier.testTag(LEADING_TAG).size(8.dp)) }) } }
        rule.onNodeWithTag(LEADING_TAG, useUnmergedTree = true).assertDoesNotExist()
    }

    // ── LST-21: the mark ─────────────────────────────────────────────────────

    @Test
    fun `LST-21 every option reserves the mark's box, and the selected one strokes the check in the mark color`() {
        showSingle(initial = "light")
        val first = rule.onNode(hasText("Light"), useUnmergedTree = true).getUnclippedBoundsInRoot()
        val second = rule.onNode(hasText("Dark"), useUnmergedTree = true).getUnclippedBoundsInRoot()
        assertEquals(first.left, second.left)
        val markColor = tokens.conditions.selected.enabled.markColor.resolve(colors)
        val box = boxOfMark(0)
        assertTrue("the check is drawn in the mark color", box.any { isClose(it, markColor) })
        assertFalse("no check on an unselected option", boxOfMark(1).any { isClose(it, markColor) })
    }

    @Test
    fun `LST-21 selecting draws the check in over the state duration`() {
        val slow = 400
        showSingle(initial = null, system = tanrei.copy(list = tokens.copy(motionStateDuration = slow, motionStateEasing = tanrei.motion.easing.linear)))
        val markColor = tokens.conditions.selected.enabled.markColor.resolve(colors)
        rule.mainClock.autoAdvance = false
        item(0).performTouchInput { down(center); up() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(slow / 4L)
        val early = boxOfMark(0).count { isClose(it, markColor, 0.2f) }
        rule.mainClock.advanceTimeBy(slow.toLong())
        val done = boxOfMark(0).count { isClose(it, markColor, 0.2f) }
        assertTrue("the check grows along its path: $early then $done", done > early)
    }

    // ── LST-22: the divider ──────────────────────────────────────────────────

    @Test
    fun `LST-22 a divider runs along the bottom of the row from the text start to the end, keeps its color in every state, and is not in the tree`() {
        show {
            TanreiList {
                TanreiListItem(INBOX, modifier = Modifier.testTag(tag(0)), divider = true, onClick = {}, leadingIcon = { Box(Modifier.fillMaxSize()) })
                TanreiListItem(INBOX, modifier = Modifier.testTag(tag(1)), divider = true, enabled = false, onClick = {})
            }
        }
        val line = tokens.dividerColor.resolve(colors).compositeOver(surface)
        val textStart = tokens.containerPaddingInlineStart + tokens.leadingIconSize + tokens.containerGap
        val bottom = rowHeight(0) - tokens.dividerThickness / 2
        assertPixel("from the text start", rowPixel(0, textStart + 1.dp, bottom), line)
        assertPixel("to the end", rowPixel(0, W - 1.dp, bottom), line)
        assertPixel("not before the text", rowPixel(0, textStart - 2.dp, bottom), surface)
        item(0).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val hovered = tokens.conditions.unselected.hovered.containerColor.resolve(colors).compositeOver(surface)
        assertPixel("hovered: the same line, over the hovered row", rowPixel(0, W - 1.dp, bottom), tokens.dividerColor.resolve(colors).compositeOver(hovered))
        assertPixel("disabled: the same color, not dimmed", rowPixel(1, W - 1.dp, rowHeight(1) - tokens.dividerThickness / 2), line)
        assertEquals(2, rule.onAllNodes(hasClickAction()).fetchSemanticsNodes().size)
    }

    // ── LST-24: slots of an interactive item ─────────────────────────────────

    @Test
    fun `LST-24 an interactive item is one element - and the README states that its slots must hold no interactive element`() {
        showInteractive()
        assertEquals(2, rule.onAllNodes(hasClickAction()).fetchSemanticsNodes().size)
        val readme = File("../README.md").readText()
        assertTrue("the README states LST-24's rule", "LST-24" in readme && "no interactive element" in readme)
    }

    // ── LST-25: state motion ─────────────────────────────────────────────────

    @Test
    fun `LST-25 a change of state moves the colors over the list's state duration`() {
        val slow = 400
        val system = tanrei.withList(TanreiListCondition.Unselected, TanreiInteractionState.Hovered) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Success)) }
            .let { it.copy(list = it.list.copy(motionStateDuration = slow, motionStateEasing = tanrei.motion.easing.linear)) }
        showInteractive(system = system)
        rule.mainClock.autoAdvance = false
        item(1).performMouseInput { moveTo(center) }
        rule.mainClock.advanceTimeBy(slow / 2L)
        val half = rowPixel(1, PROBE_X, rowHeight(1) - 2.dp)
        assertTrue("on its way: $half", !isClose(half, surface) && !isClose(half, colors[TanreiColorRole.Success]))
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertRowColor(1, colors[TanreiColorRole.Success])
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
        }
    }

    private fun TanreiSystem.withList(condition: TanreiListCondition, state: TanreiInteractionState, change: (TanreiListConditionStateTokens) -> TanreiListConditionStateTokens): TanreiSystem {
        val tokens = list.conditions[condition]
        val changed = when (state) {
            TanreiInteractionState.Enabled -> tokens.copy(enabled = change(tokens.enabled))
            TanreiInteractionState.Hovered -> tokens.copy(hovered = change(tokens.hovered))
            TanreiInteractionState.Focused -> tokens.copy(focused = change(tokens.focused))
            TanreiInteractionState.Pressed -> tokens.copy(pressed = change(tokens.pressed))
            TanreiInteractionState.Disabled -> tokens.copy(disabled = change(tokens.disabled))
        }
        val conditions = when (condition) {
            TanreiListCondition.Unselected -> list.conditions.copy(unselected = changed)
            TanreiListCondition.Selected -> list.conditions.copy(selected = changed)
            else -> error("not used: $condition")
        }
        return copy(list = list.copy(conditions = conditions))
    }

    private fun stage(): PixelMap = rule.onNodeWithTag(STAGE_TAG).captureToImage().toPixelMap()

    private fun rowTop(index: Int): Dp = item(index).getUnclippedBoundsInRoot().top - rule.onNodeWithTag(STAGE_TAG).getUnclippedBoundsInRoot().top

    private fun rowHeight(index: Int): Dp = item(index).getUnclippedBoundsInRoot().let { it.bottom - it.top }

    /** A pixel of the stage at ([x], [y]) from the top-left of row [index]. */
    private fun rowPixel(index: Int, x: Dp, y: Dp): Color = with(rule.density) { stage()[x.roundToPx().coerceIn(0, W.roundToPx() - 1), (rowTop(index) + y).roundToPx()] }

    /** The pixels of the mark's box of row [index]. */
    private fun boxOfMark(index: Int): List<Color> {
        val map = stage()
        return with(rule.density) {
            val right = (W - tokens.containerPaddingInlineEnd).roundToPx()
            val left = (W - tokens.containerPaddingInlineEnd - tokens.markSize).roundToPx()
            val top = (rowTop(index) + (rowHeight(index) - tokens.markSize) / 2).roundToPx()
            val bottom = top + tokens.markSize.roundToPx()
            (top until bottom).flatMap { y -> (left until right).map { x -> map[x, y] } }
        }
    }

    private fun assertRow(index: Int, paint: TanreiPaint) = assertRowColor(index, paint.resolve(colors).compositeOver(surface))

    /** Row [index]'s container, near its bottom-start corner — [clear] of a focus indicator drawn inside the row. */
    private fun assertRowColor(index: Int, expected: Color, clear: Boolean = false) {
        val inset = if (clear) FOCUS_CLEAR else 2.dp
        assertPixel("row $index's container", rowPixel(index, max(PROBE_X, inset), rowHeight(index) - inset), expected)
    }

    private fun assertSameAs(expected: PixelMap, actual: PixelMap, what: String) {
        val differing = (0 until expected.height).sumOf { y -> (0 until expected.width).count { x -> !isClose(expected[x, y], actual[x, y]) } }
        assertEquals("$what: not one pixel differs", 0, differing)
    }

    private fun isClose(actual: Color, expected: Color, tolerance: Float = PIXEL_TOLERANCE): Boolean =
        maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue)) <= tolerance

    private fun assertPixel(what: String, actual: Color, expected: Color) =
        assertTrue("$what: expected $expected but was $actual", isClose(actual, expected))

    private companion object {
        const val STAGE_TAG = "stage"
        const val BEFORE = "before"
        const val AFTER = "after"
        const val SWITCH_TAG = "switch"
        const val LEADING_TAG = "leading"
        const val TRAILING_TAG = "trailing"
        const val LABEL = "Theme"
        const val WIFI = "Wi-Fi"
        const val CONNECTED = "Connected"
        const val BLUETOOTH = "Bluetooth"
        const val INBOX = "Inbox"
        const val LONG = "The plan for the next quarter, with milestones, owners and the risks we already know about."
        val OPTIONS = listOf("light", "dark", "system")
        const val PIXEL_TOLERANCE = 2f / 255f
        const val HALF = 0.5f
        const val MAX_FRAMES = 60
        val W = 360.dp
        val PROBE_X = 8.dp
        val RING_PROBE = 1.dp

        /** Further inside a row than any shipped or fixture system draws its focus indicator. */
        val FOCUS_CLEAR = 12.dp
    }
}

/** LST-21 and LST-25 where motion is reduced (the animator duration scale is 0, see `TanreiButtonReducedMotionTest`). */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiListReducedMotionTest {
    private object NoMotion : MotionDurationScale {
        override val scaleFactor: Float = 0f
    }

    @get:Rule
    val rule = createComposeRule(effectContext = NoMotion)

    private val tanrei = TanreiSystem.Tanrei
    private val colors = tanrei.colors.light
    private var selected by mutableStateOf<String?>(null)

    private fun pixel(x: Dp, y: Dp): Color = with(rule.density) { rule.onNodeWithTag("item").captureToImage().toPixelMap()[x.roundToPx(), y.roundToPx()] }

    private fun assertPixel(what: String, actual: Color, expected: Color) {
        val delta = maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue))
        assertTrue("$what: expected $expected but was $actual", delta <= 2f / 255f)
    }

    @Test
    fun `LST-21 LST-25 where motion is reduced a selection and a change of state show at once`() {
        val slow = 400
        rule.setContent {
            TanreiTheme(system = tanrei.copy(list = tanrei.list.copy(motionStateDuration = slow)), theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Box(Modifier.width(360.dp).background(TanreiColorRole.Surface.color)) {
                    TanreiList(selectionMode = TanreiListSelectionMode.Single, contentDescription = "Theme", selectedValue = selected, onSelectionChange = { selected = it.single() }) {
                        TanreiListItem("Light", modifier = Modifier.testTag("item"), value = "light")
                    }
                }
            }
        }
        val selectedFill = tanrei.list.conditions.selected.enabled.containerColor.resolve(colors)
        rule.mainClock.autoAdvance = false
        selected = "light"
        androidx.compose.runtime.snapshots.Snapshot.sendApplyNotifications()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("the selected fill on the next frame", pixel(8.dp, 40.dp), selectedFill)
        val mark = tanrei.list.conditions.selected.enabled.markColor.resolve(colors)
        val map = rule.onNodeWithTag("item").captureToImage().toPixelMap()
        val found = with(rule.density) {
            val left = (360.dp - tanrei.list.containerPaddingInlineEnd - tanrei.list.markSize).roundToPx()
            (0 until map.height).any { y -> (left until map.width).any { x -> map[x, y].let { abs(it.red - mark.red) < 0.05f && abs(it.green - mark.green) < 0.05f && abs(it.blue - mark.blue) < 0.05f } } }
        }
        assertTrue("the whole check at once", found)
        rule.onNodeWithTag("item").performMouseInput { moveTo(center) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        val hovered = tanrei.list.conditions.selected.hovered.containerColor.resolve(colors).compositeOver(colors[TanreiColorRole.Surface])
        assertPixel("hovered on the next frame", pixel(8.dp, 40.dp), hovered)
    }
}
