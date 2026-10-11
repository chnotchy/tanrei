package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import android.view.View
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.selection.selectableGroup
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
import androidx.compose.ui.node.RootForTest
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.LocalView
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
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.assertWidthIsEqualTo
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.junit4.accessibility.enableAccessibilityChecks
import androidx.compose.ui.test.junit4.v2.createComposeRule
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
import androidx.compose.ui.test.withKeyDown
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.acme.design.Acme
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.primitives.tanreiContainerShape
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiFocusStyle
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiPressedFeedback
import io.github.chnotchy.tanrei.tokens.TanreiRadioButtonCondition
import io.github.chnotchy.tanrei.tokens.TanreiRadioButtonConditionStateTokens
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import kotlin.math.PI
import kotlin.math.abs
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
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
 * Behaviour tests for `specs/radio-button.spec.json`. Each test names the behaviour id (`RAD-n`) it covers. The scene
 * is a button, a group of three options (`weekly`, `monthly`, `yearly`) under `Modifier.selectableGroup()` — the
 * spec's `name` on Compose — and another button, so focus can enter and leave the group. Pixel tests hide the labels:
 * each option is then its 48 dp target, the 28 dp container centered in it and the 16 dp ring centered in that.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiRadioButtonTest {
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
    private val tokens = tanrei.radioButton
    private val measure = tanrei.measure
    private val surface = colors[TanreiColorRole.Surface]

    /** Everything the options emitted, in order: `change:monthly` … */
    private val events = mutableListOf<String>()
    private var chosen by mutableStateOf<String?>(null)
    private var view: View? = null

    @Before
    fun setUp() {
        // ATF checks: NOT_RUN under Robolectric (see TanreiButtonTest); they run for real in the gallery's
        // instrumented tests. The explicit semantics assertions below guard accessibility here.
        rule.enableAccessibilityChecks()
    }

    private class Scene(
        val disabled: Set<String>,
        val interactive: Boolean,
        val labelHidden: Boolean,
        val labels: Map<String, String>,
        val system: TanreiSystem,
        val direction: LayoutDirection,
        val width: Dp?,
    )

    private var scene by mutableStateOf<Scene?>(null)

    /** The scene; [initial] is the chosen value. Called again, it replaces the scene with a fresh composition. */
    private fun setGroup(
        initial: String? = null,
        disabled: Set<String> = emptySet(),
        interactive: Boolean = true,
        labelHidden: Boolean = true,
        labels: Map<String, String> = LABELS,
        system: TanreiSystem = tanrei,
        direction: LayoutDirection = LayoutDirection.Ltr,
        width: Dp? = null,
    ) {
        chosen = initial
        val first = scene == null
        scene = Scene(disabled, interactive, labelHidden, labels, system, direction, width)
        if (!first) {
            rule.waitForIdle()
            return
        }
        rule.setContent {
            val current = scene ?: return@setContent
            view = LocalView.current
            key(current) {
                CompositionLocalProvider(LocalLayoutDirection provides current.direction) {
                    TanreiTheme(system = current.system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                        Column(Modifier.background(TanreiColorRole.Surface.color).padding(TanreiTheme.tokens.space.space200)) {
                            TanreiButton(text = "Before", onClick = {}, modifier = Modifier.testTag(BEFORE))
                            Column(Modifier.testTag(GROUP).selectableGroup()) {
                                for (value in VALUES) {
                                    TanreiRadioButton(
                                        selected = chosen == value,
                                        onClick = if (current.interactive) { { events += "change:$value"; chosen = value } } else null,
                                        label = current.labels.getValue(value),
                                        modifier = Modifier.testTag(value).then(current.width?.let { Modifier.width(it) } ?: Modifier),
                                        enabled = value !in current.disabled,
                                        labelHidden = current.labelHidden,
                                    )
                                }
                            }
                            TanreiButton(text = "After", onClick = {}, modifier = Modifier.testTag(AFTER))
                        }
                    }
                }
            }
        }
    }

    private fun option(value: String = WEEKLY) = rule.onNodeWithTag(value)

    // ── RAD-16: semantics ────────────────────────────────────────────────────

    @Test
    fun `RAD-16 an option is role radio with its selection, named by its label, in a selectable group, and passes accessibility checks`() {
        setGroup(initial = MONTHLY, labelHidden = false)
        option(WEEKLY)
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.RadioButton))
            .assertIsNotSelected()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Text, listOf(androidx.compose.ui.text.AnnotatedString("Weekly"))))
            .assertHasClickAction()
            .assertIsEnabled()
        option(MONTHLY).assertIsSelected()
        rule.onNodeWithTag(GROUP).assert(SemanticsMatcher.keyIsDefined(SemanticsProperties.SelectableGroup))
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    @Test
    fun `RAD-16 TalkBack reads each option's position in the group and the group's size`() {
        setGroup(initial = MONTHLY, labelHidden = false)
        val root = view as RootForTest
        root.forceAccessibilityForTesting(true)
        rule.waitForIdle()
        val provider = view!!.accessibilityNodeProvider ?: error("the compose view provides no accessibility nodes")
        val group = provider.createAccessibilityNodeInfo(rule.onNodeWithTag(GROUP).fetchSemanticsNode().id)!!
        assertEquals("the group's size", VALUES.size, group.collectionInfo.rowCount * group.collectionInfo.columnCount)
        VALUES.forEachIndexed { index, value ->
            val info = provider.createAccessibilityNodeInfo(option(value).fetchSemanticsNode().id)!!
            assertEquals("$value: its position", index, info.collectionItemInfo.rowIndex)
            assertEquals("$value: announced as selected or not", value == MONTHLY, info.collectionItemInfo.isSelected)
        }
    }

    @Test
    fun `RAD-16 without onClick it only displays - no click action`() {
        setGroup(initial = WEEKLY, interactive = false)
        option(WEEKLY).assertHasNoClickAction()
        assertPixel("still drawn selected", dotProbe(), colors[TanreiColorRole.Primary])
    }

    // ── RAD-1: activation selects and emits change once ──────────────────────

    @Test
    fun `RAD-1 a tap selects the option and emits change exactly once with its value`() {
        setGroup()
        option(MONTHLY).performClick()
        rule.waitForIdle()
        assertEquals(listOf("change:monthly"), events)
        option(MONTHLY).assertIsSelected()
    }

    @Test
    fun `RAD-1 RAD-9 a tap on the visible label selects it too`() {
        setGroup(labelHidden = false)
        val label = rule.onNodeWithText("Yearly", useUnmergedTree = true).getUnclippedBoundsInRoot()
        val node = option(YEARLY).getUnclippedBoundsInRoot()
        option(YEARLY).performTouchInput {
            down(Offset(((label.left + label.right) / 2 - node.left).toPx(), ((label.top + label.bottom) / 2 - node.top).toPx())); up()
        }
        rule.waitForIdle()
        assertEquals(listOf("change:yearly"), events)
    }

    @Test
    @KeyboardNavigation
    fun `RAD-1 Space and Enter each select a focused unselected option on Android, exactly once`() {
        setGroup()
        option(WEEKLY).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        assertEquals(listOf("change:weekly"), events)
        setGroup()
        events.clear()
        option(WEEKLY).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals(listOf("change:weekly"), events)
    }

    @Test
    fun `RAD-1 an assistive technology click selects it exactly once`() {
        setGroup()
        option(YEARLY).performSemanticsAction(SemanticsActions.OnClick)
        rule.waitForIdle()
        assertEquals(listOf("change:yearly"), events)
    }

    // ── RAD-2: activating the selected option does nothing ───────────────────

    @Test
    @KeyboardNavigation
    fun `RAD-2 activating the selected option keeps it selected and emits nothing - by tap, Space or assistive technology`() {
        setGroup(initial = MONTHLY)
        option(MONTHLY).performClick()
        option(MONTHLY).performSemanticsAction(SemanticsActions.OnClick)
        option(MONTHLY).requestFocus().performKeyInput { pressKey(Key.Spacebar) }
        rule.waitForIdle()
        assertEquals(emptyList<String>(), events)
        option(MONTHLY).assertIsSelected()
    }

    // ── RAD-3: one selected per group ────────────────────────────────────────

    @Test
    fun `RAD-3 selecting an option unselects the others, and only the new one emits`() {
        setGroup(initial = WEEKLY)
        option(YEARLY).performClick()
        rule.waitForIdle()
        assertEquals(listOf("change:yearly"), events)
        option(YEARLY).assertIsSelected()
        option(WEEKLY).assertIsNotSelected()
        option(MONTHLY).assertIsNotSelected()
        assertPixel("the old option's dot is gone", dotProbe(WEEKLY), surface)
    }

    // ── RAD-4: arrow keys ────────────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `RAD-4 Down and Right move to the next option and select it, wrapping from the last to the first`() {
        setGroup(initial = MONTHLY)
        option(MONTHLY).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.DirectionDown) }
        rule.waitForIdle()
        option(YEARLY).assertIsFocused().assertIsSelected()
        option(YEARLY).performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        option(WEEKLY).assertIsFocused().assertIsSelected()
        assertEquals(listOf("change:yearly", "change:weekly"), events)
    }

    @Test
    @KeyboardNavigation
    fun `RAD-4 Up and Left move to the previous option and select it, wrapping from the first to the last`() {
        setGroup(initial = WEEKLY)
        option(WEEKLY).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.DirectionUp) }
        rule.waitForIdle()
        option(YEARLY).assertIsFocused().assertIsSelected()
        option(YEARLY).performKeyInput { pressKey(Key.DirectionLeft) }
        rule.waitForIdle()
        option(MONTHLY).assertIsFocused().assertIsSelected()
        assertEquals(listOf("change:yearly", "change:monthly"), events)
    }

    @Test
    @KeyboardNavigation
    fun `RAD-4 in a right-to-left layout Right moves to the previous option and Left to the next`() {
        setGroup(initial = MONTHLY, direction = LayoutDirection.Rtl)
        option(MONTHLY).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.DirectionRight) }
        rule.waitForIdle()
        option(WEEKLY).assertIsFocused().assertIsSelected()
        option(WEEKLY).performKeyInput { pressKey(Key.DirectionLeft) }
        rule.waitForIdle()
        option(MONTHLY).assertIsFocused().assertIsSelected()
        assertEquals(listOf("change:weekly", "change:monthly"), events)
    }

    @Test
    @KeyboardNavigation
    fun `RAD-4 RAD-6 the arrow keys skip a disabled option`() {
        setGroup(initial = WEEKLY, disabled = setOf(MONTHLY))
        option(WEEKLY).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.DirectionDown) }
        rule.waitForIdle()
        option(YEARLY).assertIsFocused().assertIsSelected()
        option(MONTHLY).assertIsNotSelected()
        assertEquals(listOf("change:yearly"), events)
    }

    // ── RAD-5: one tab stop ──────────────────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `RAD-5 Tab enters the group at the selected option and leaves it with the next Tab`() {
        setGroup(initial = YEARLY)
        rule.onNodeWithTag(BEFORE).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        option(YEARLY).assertIsFocused()
        option(YEARLY).performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(AFTER).assertIsFocused()
        rule.onNodeWithTag(AFTER).performKeyInput { withKeyDown(Key.ShiftLeft) { pressKey(Key.Tab) } }
        rule.waitForIdle()
        option(YEARLY).assertIsFocused()
        assertEquals("moving focus selects nothing", emptyList<String>(), events)
    }

    @Test
    @KeyboardNavigation
    fun `RAD-5 while none is selected the first enabled option is the tab stop`() {
        setGroup(initial = null, disabled = setOf(WEEKLY))
        rule.onNodeWithTag(BEFORE).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        option(MONTHLY).assertIsFocused().assertIsNotSelected()
        option(MONTHLY).performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(AFTER).assertIsFocused()
    }

    @Test
    @KeyboardNavigation
    fun `RAD-5 after the arrow keys moved the selection, Tab leaves from the new option and comes back to it`() {
        setGroup(initial = WEEKLY)
        option(WEEKLY).requestFocus().performKeyInput { pressKey(Key.DirectionDown) }
        rule.waitForIdle()
        option(MONTHLY).assertIsFocused().performKeyInput { pressKey(Key.Tab) }
        rule.waitForIdle()
        rule.onNodeWithTag(AFTER).assertIsFocused().performKeyInput { withKeyDown(Key.ShiftLeft) { pressKey(Key.Tab) } }
        rule.waitForIdle()
        option(MONTHLY).assertIsFocused()
    }

    // ── RAD-6: disabled ──────────────────────────────────────────────────────

    @Test
    fun `RAD-6 a disabled option does not change or emit, from the ring or from its label`() {
        setGroup(disabled = setOf(WEEKLY), labelHidden = false)
        option(WEEKLY).performTouchInput { down(Offset(CONTAINER_START.toPx(), centerY)); up() }
        option(WEEKLY).performTouchInput { down(Offset(width - 4.dp.toPx(), centerY)); up() }
        rule.waitForIdle()
        assertEquals(emptyList<String>(), events)
        option(WEEKLY).assertIsNotSelected()
    }

    @Test
    @KeyboardNavigation
    fun `RAD-6 a disabled option is not focusable and exposes the disabled state`() {
        setGroup(disabled = setOf(WEEKLY), labelHidden = false)
        option(WEEKLY)
            .assertIsNotEnabled()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.RadioButton))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Focused))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsActions.RequestFocus))
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    // ── RAD-7: the highest-precedence state, from THAT state's tokens ────────

    @Test
    fun `RAD-7 pressed and hovered draw the container from the condition's state tokens, and a tap does not select focused`() {
        setGroup(initial = WEEKLY)
        val selected = tokens.conditions.selected
        option(WEEKLY).performTouchInput { down(center) }
        rule.waitForIdle()
        assertContainer(selected.pressed.containerColor)
        option(WEEKLY).performTouchInput { up() }
        rule.waitForIdle()
        assertContainer(selected.enabled.containerColor)
        option(MONTHLY).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainer(tokens.conditions.unselected.hovered.containerColor, MONTHLY)
    }

    @Test
    fun `RAD-7 in the default system the state layer is the condition's ring color mixed into the transparent container`() {
        setGroup(initial = WEEKLY)
        option(WEEKLY).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainerColor(colors[TanreiColorRole.Primary].copy(alpha = tanrei.state.hoverStateLayerOpacity).compositeOver(surface))
        option(MONTHLY).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainerColor(colors[TanreiColorRole.Outline].copy(alpha = tanrei.state.hoverStateLayerOpacity).compositeOver(surface), MONTHLY)
    }

    @Test
    fun `RAD-7 ring, dot and label come from the state's tokens too`() {
        val system = tanrei.withCondition(TanreiRadioButtonCondition.Selected, TanreiInteractionState.Hovered) {
            it.copy(ringColor = TanreiPaint.Role(TanreiColorRole.Warning), dotColor = TanreiPaint.Role(TanreiColorRole.Error))
        }
        setGroup(initial = WEEKLY, system = system)
        option(WEEKLY).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertPixel("hovered ring", ringProbe(), colors[TanreiColorRole.Warning])
        assertPixel("hovered dot", dotProbe(), colors[TanreiColorRole.Error])
    }

    @Test
    @KeyboardNavigation
    fun `RAD-7 under acme, which values hovered, focused and pressed differently - pressed wins over focused wins over hovered, in pixels`() {
        val acme = acmeWithoutFocusIndicator()
        val selected = acme.radioButton.conditions.selected
        val acmeColors = acme.colors.light
        fun over(paint: TanreiPaint) = paint.resolve(acmeColors).compositeOver(acmeColors[TanreiColorRole.Surface])
        val all = listOf(selected.enabled, selected.hovered, selected.focused, selected.pressed).map { over(it.containerColor) }
        assertEquals("acme tells the four states apart", 4, all.toSet().size)

        setGroup(initial = WEEKLY, system = acme)
        option(WEEKLY).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertContainerColor(over(selected.hovered.containerColor))
        option(WEEKLY).requestFocus().assertIsFocused()
        rule.waitForIdle()
        assertContainerColor(over(selected.focused.containerColor))
        option(WEEKLY).performKeyInput { keyDown(Key.Spacebar) }
        rule.waitForIdle()
        assertContainerColor(over(selected.pressed.containerColor))
        option(WEEKLY).performKeyInput { keyUp(Key.Spacebar) }
        rule.waitForIdle()
        assertContainerColor(over(selected.focused.containerColor))
        assertEquals("the selected option emits nothing (RAD-2)", emptyList<String>(), events)
    }

    @Test
    fun `RAD-7 a hover recolors the ring and the dot over the state motion, not the selection motion`() {
        val slow = tokens.motionStateDuration * 20
        val system = tanrei.copy(radioButton = tokens.copy(motionSelectionDuration = slow))
            .withCondition(TanreiRadioButtonCondition.Selected, TanreiInteractionState.Hovered) {
                it.copy(ringColor = TanreiPaint.Role(TanreiColorRole.Warning), dotColor = TanreiPaint.Role(TanreiColorRole.Error))
            }
        setGroup(initial = WEEKLY, system = system)
        rule.mainClock.autoAdvance = false
        option(WEEKLY).performMouseInput { moveTo(center) }
        rule.mainClock.advanceTimeBy(tokens.motionStateDuration * 2L)
        assertPixel("the hovered ring after the state duration", ringProbe(), colors[TanreiColorRole.Warning])
        assertPixel("the hovered dot", dotProbe(), colors[TanreiColorRole.Error])
    }

    /** Acme, with a focus indicator of no width: it is drawn around the RING, inside the container, where the probes are. */
    private fun acmeWithoutFocusIndicator(): TanreiSystem =
        TanreiSystem.Acme.let { it.copy(measure = it.measure.copy(focusInnerWidth = 0.dp, focusOuterWidth = 0.dp)) }

    // ── RAD-8: focus ring around the ring ────────────────────────────────────

    @Test
    @KeyboardNavigation
    fun `RAD-8 keyboard focus shows the focus ring around the ring on the first frame`() {
        setGroup(initial = WEEKLY)
        assertPixel("no ring before focus", pixel(CENTER, ringCenter()), surface)
        rule.mainClock.autoAdvance = false
        option(WEEKLY).requestFocus()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("the focus ring at full color on the first frame, around the ring", pixel(CENTER, ringCenter()), colors[TanreiColorRole.FocusRing])
    }

    @Test
    fun `RAD-8 a pointer press does not show the focus ring`() {
        setGroup(initial = WEEKLY)
        option(WEEKLY).performTouchInput { down(center) }
        rule.waitForIdle()
        val pressed = tokens.conditions.selected.pressed.containerColor.resolve(colors).compositeOver(surface)
        assertPixel("the pressed layer, no ring", pixel(CENTER, ringCenter()), pressed)
    }

    // ── RAD-9: the target ────────────────────────────────────────────────────

    @Test
    fun `RAD-9 without a visible label an option is the touch target on both axes, and a tap in its corner selects it`() {
        setGroup()
        option(WEEKLY).assertWidthIsEqualTo(measure.targetTouch).assertHeightIsEqualTo(measure.targetTouch)
        option(WEEKLY).performTouchInput { down(Offset(1f, 1f)); up() }
        rule.waitForIdle()
        assertEquals(listOf("change:weekly"), events)
    }

    @Test
    fun `RAD-9 with a label the row is at least the target tall, and the target size comes from the system`() {
        setGroup(labelHidden = false)
        option(WEEKLY).assertHeightIsEqualTo(measure.targetTouch)
        val target = 60.dp
        setGroup(system = tanrei.copy(measure = measure.copy(targetTouch = target)))
        option(WEEKLY).assertWidthIsEqualTo(target).assertHeightIsEqualTo(target)
    }

    // ── RAD-10: disabled draws the disabled tokens ───────────────────────────

    @Test
    fun `RAD-10 disabled draws the disabled tokens of each condition - no grey disc, a faded ring, a faded dot`() {
        val faded = colors[TanreiColorRole.OnSurface].copy(alpha = tanrei.state.disabledContentOpacity).compositeOver(surface)
        setGroup(initial = WEEKLY, disabled = setOf(WEEKLY, MONTHLY))
        assertContainerColor(surface)
        assertPixel("selected: faded ring", ringProbe(), faded)
        assertPixel("selected: faded dot", dotProbe(), faded)
        assertPixel("unselected: faded ring", ringProbe(MONTHLY), faded)
        assertPixel("unselected: no dot", dotProbe(MONTHLY), surface)
    }

    @Test
    fun `RAD-10 the disabled opacity token dims the whole option, and disabled ignores hover`() {
        val opacity = 0.5f
        val system = tanrei.copy(radioButton = tokens.copy(disabled = tokens.disabled.copy(opacity = opacity)))
            .withCondition(TanreiRadioButtonCondition.Selected, TanreiInteractionState.Disabled) { it.copy(dotColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        setGroup(initial = WEEKLY, disabled = setOf(WEEKLY), system = system)
        val expected = colors[TanreiColorRole.Error].copy(alpha = opacity).compositeOver(surface)
        assertPixel("dimmed dot", dotProbe(), expected)
        option(WEEKLY).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        assertPixel("hover changes nothing", dotProbe(), expected)
        assertContainerColor(surface)
    }

    // ── RAD-11: pressed at once, held for press-hold ─────────────────────────

    @Test
    fun `RAD-11 a tap that ends at once shows the pressed state on the next frame and keeps it for press-hold`() {
        setGroup()
        val hold = tanrei.motion.duration.pressHold.toLong()
        rule.mainClock.autoAdvance = false
        option(WEEKLY).performTouchInput { down(center); up() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertContainer(tokens.conditions.selected.pressed.containerColor)
        rule.mainClock.advanceTimeBy(hold / 2)
        assertContainer(tokens.conditions.selected.pressed.containerColor)
        rule.mainClock.advanceTimeBy(hold + tokens.motionStateDuration * 2L)
        assertContainer(tokens.conditions.selected.enabled.containerColor)
        assertEquals(listOf("change:weekly"), events)
    }

    @Test
    @KeyboardNavigation
    fun `RAD-11 Space shows the pressed state for press-hold too`() {
        val acme = acmeWithoutFocusIndicator()
        val acmeColors = acme.colors.light
        fun over(paint: TanreiPaint) = paint.resolve(acmeColors).compositeOver(acmeColors[TanreiColorRole.Surface])
        setGroup(system = acme)
        option(WEEKLY).requestFocus().assertIsFocused()
        rule.waitForIdle()
        rule.mainClock.autoAdvance = false
        option(WEEKLY).performKeyInput { pressKey(Key.Spacebar) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertContainerColor(over(acme.radioButton.conditions.selected.pressed.containerColor))
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        assertContainerColor(over(acme.radioButton.conditions.selected.focused.containerColor))
        assertEquals(listOf("change:weekly"), events)
    }

    // ── RAD-12: pressed-feedback ─────────────────────────────────────────────

    private fun TanreiSystem.answering(feedback: TanreiPressedFeedback) = copy(behavior = behavior.copy(pressedFeedback = feedback))

    @Test
    fun `RAD-12 overlay is the default - the pressed container applies at once, on both sides`() {
        assertEquals(TanreiPressedFeedback.Overlay, tanrei.behavior.pressedFeedback)
        setGroup(initial = WEEKLY, system = tanrei.withCondition(TanreiRadioButtonCondition.Selected, TanreiInteractionState.Pressed) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) })
        rule.mainClock.autoAdvance = false
        option(WEEKLY).performTouchInput { down(CONTAINER_START_POINT.toOffset()) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("at the point of contact", pixel(CONTAINER_START, CENTER), colors[TanreiColorRole.Error])
        assertPixel("at the far side, at once", pixel(CONTAINER_END, CENTER), colors[TanreiColorRole.Error])
    }

    @Test
    fun `RAD-12 ripple grows the condition's pressed container color from the point of contact, then fades`() {
        val system = tanrei.answering(TanreiPressedFeedback.Ripple)
            .withCondition(TanreiRadioButtonCondition.Selected, TanreiInteractionState.Pressed) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        setGroup(initial = WEEKLY, system = system)
        val pressed = colors[TanreiColorRole.Error]
        rule.mainClock.autoAdvance = false
        option(WEEKLY).performTouchInput { down(CONTAINER_START_POINT.toOffset()) }
        rule.mainClock.advanceTimeBy(50)
        assertPixel("the layer has reached the point of contact", pixel(CONTAINER_START, CENTER), pressed)
        assertPixel("but not the far side", pixel(CONTAINER_END, CENTER), surface)
        rule.mainClock.advanceTimeBy(tokens.motionFeedbackDuration.toLong())
        assertPixel("the far side once grown", pixel(CONTAINER_END, CENTER), pressed)
        option(WEEKLY).performTouchInput { up() }
        rule.mainClock.advanceTimeBy(tanrei.motion.duration.pressHold + tokens.motionStateDuration * 2L)
        assertPixel("faded", pixel(CONTAINER_START, CENTER), surface)
    }

    @Test
    fun `RAD-12 under ripple a press on the label, outside the container, grows the layer from the container's center`() {
        val system = tanrei.answering(TanreiPressedFeedback.Ripple)
            .withCondition(TanreiRadioButtonCondition.Unselected, TanreiInteractionState.Pressed) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        setGroup(system = system, labelHidden = false)
        val error = colors[TanreiColorRole.Error]
        // With the label shown the container is the row's first 28 dp: its center is (14, 24), its sides 11 dp away.
        val left = 3.dp
        val right = 25.dp
        rule.mainClock.autoAdvance = false
        option(WEEKLY).performTouchInput { down(Offset(width - 4.dp.toPx(), centerY)) }
        var frames = 0
        while (!isClose(pixel(right, CENTER), error)) {
            assertTrue("the layer reaches the container's side", frames++ < tokens.motionFeedbackDuration / FRAME_MILLIS + 2)
            rule.mainClock.advanceTimeByFrame()
        }
        assertPixel("it reached the far side in the same frame: it grew from the center", pixel(left, CENTER), error)
        option(WEEKLY).performTouchInput { cancel() }
    }

    /** Selected's pressed state differs from hovered in ring (warning), dot (error) and opacity; hovered's container is info. */
    private fun pressedDiffersEverywhere(feedback: TanreiPressedFeedback): TanreiSystem =
        tanrei.answering(feedback)
            .withCondition(TanreiRadioButtonCondition.Selected, TanreiInteractionState.Hovered) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Info)) }
            .withCondition(TanreiRadioButtonCondition.Selected, TanreiInteractionState.Pressed) {
                it.copy(ringColor = TanreiPaint.Role(TanreiColorRole.Warning), dotColor = TanreiPaint.Role(TanreiColorRole.Error))
            }
            .let { it.copy(radioButton = it.radioButton.copy(pressed = it.radioButton.pressed.copy(opacity = PRESSED_OPACITY))) }

    private fun assertOnlyTheContainerColorStays(feedback: TanreiPressedFeedback) {
        setGroup(initial = WEEKLY, system = pressedDiffersEverywhere(feedback))
        fun dimmed(color: Color) = color.copy(alpha = PRESSED_OPACITY).compositeOver(surface)
        val hovered = colors[TanreiColorRole.Info]
        option(WEEKLY).performMouseInput { moveTo(CONTAINER_END_POINT.toOffset()) }
        rule.waitForIdle()
        assertContainerColor(hovered)
        rule.mainClock.autoAdvance = false
        option(WEEKLY).performMouseInput { press() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertContainerColor(dimmed(hovered))
        assertPixel("the pressed ring", ringProbe(), dimmed(colors[TanreiColorRole.Warning]))
        assertPixel("the pressed dot", dotProbe(), dimmed(colors[TanreiColorRole.Error]))
        option(WEEKLY).performMouseInput { release() }
    }

    @Test
    fun `RAD-12 under ripple only the container color stays with the state under the press`() = assertOnlyTheContainerColorStays(TanreiPressedFeedback.Ripple)

    @Test
    fun `RAD-12 under dim only the container color stays with the state under the press`() = assertOnlyTheContainerColorStays(TanreiPressedFeedback.Dim)

    @Test
    fun `RAD-12 under none every part stays with the state under the press`() {
        setGroup(initial = WEEKLY, system = pressedDiffersEverywhere(TanreiPressedFeedback.None))
        option(WEEKLY).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val hovered = option(WEEKLY).captureToImage().toPixelMap()
        rule.mainClock.autoAdvance = false
        option(WEEKLY).performMouseInput { press() }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        val pressed = option(WEEKLY).captureToImage().toPixelMap()
        val differing = (0 until hovered.height).sumOf { y -> (0 until hovered.width).count { x -> !isClose(hovered[x, y], pressed[x, y]) } }
        assertEquals("not one pixel answers the press", 0, differing)
        option(WEEKLY).performMouseInput { release() }
    }

    // ── RAD-13: corner smoothing and focus style ─────────────────────────────

    @Test
    fun `RAD-13 a round container is unchanged by corner smoothing`() {
        fun hovered(smoothing: Float): PixelMap {
            // An opaque layer, so a pixel's color IS its coverage.
            val system = tanrei.copy(shape = tanrei.shape.copy(cornerSmoothing = smoothing))
                .withCondition(TanreiRadioButtonCondition.Selected, TanreiInteractionState.Hovered) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
            setGroup(initial = WEEKLY, system = system)
            option(WEEKLY).performMouseInput { moveTo(center) }
            rule.waitForIdle()
            return option(WEEKLY).captureToImage().toPixelMap()
        }
        val round = hovered(0f)
        val smoothed = hovered(0.6f)
        // Compose draws the quarter circle natively (a round rect) and the smoothed construction as a path of cubics,
        // and Skia anti-aliases the two differently: compare the area between the two edges, spread along the circle.
        val layer = colors[TanreiColorRole.Error]
        var area = 0f
        for (y in 0 until round.height) for (x in 0 until round.width) area += abs(tintOf(round[x, y], surface, layer) - tintOf(smoothed[x, y], surface, layer))
        val circumference = with(rule.density) { tokens.containerSize.toPx() } * PI.toFloat()
        assertTrue("a circle is a circle at any amount: the edges are ${area / circumference} px apart on average", area / circumference <= EDGE_OFFSET_TOLERANCE)
    }

    @Test
    fun `RAD-13 a container given a corner below full eases it by the corner smoothing - Figma's construction at 0_6`() {
        val radius = tokens.containerSize / 2 / 1.6f
        val system = tanrei.copy(shape = tanrei.shape.copy(cornerSmoothing = 0.6f), radioButton = tokens.copy(hovered = tokens.hovered.copy(containerShape = radius)))
            .withCondition(TanreiRadioButtonCondition.Unselected, TanreiInteractionState.Hovered) { it.copy(containerColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        setGroup(system = system)
        option(WEEKLY).performMouseInput { moveTo(center) }
        rule.waitForIdle()
        val error = colors[TanreiColorRole.Error]
        val map = option(WEEKLY).captureToImage().toPixelMap()
        with(rule.density) {
            val inset = (CENTER - tokens.containerSize / 2).roundToPx()
            val side = tokens.containerSize.roundToPx()
            val outline = tanreiContainerShape(radius, 0.6f).createOutline(Size(side.toFloat(), side.toFloat()), LayoutDirection.Ltr, this)
            val expected = ImageBitmap(side, side, ImageBitmapConfig.Argb8888)
            Canvas(expected).drawOutline(outline, Paint().apply { color = Color.Black })
            val expectedMap = expected.toPixelMap()
            val box = (radius * 2).roundToPx().coerceAtMost((CENTER - tokens.ringSize / 2).roundToPx() - inset)
            var worst = 0f
            for (y in 0 until box) for (x in 0 until box) worst = maxOf(worst, abs(tintOf(map[inset + x, inset + y], surface, error) - expectedMap[x, y].alpha))
            assertTrue("the worst pixel is $worst off the smoothed outline's own coverage", worst <= COVERAGE_TOLERANCE)
        }
    }

    @Test
    @KeyboardNavigation
    fun `RAD-13 glow draws the focus colors as a soft halo around the ring under acme`() {
        val acme = TanreiSystem.Acme
        assertEquals(TanreiFocusStyle.Glow, acme.behavior.focusStyle)
        val acmeColors = acme.colors.light
        val ring = acmeColors[TanreiColorRole.FocusRing]
        val m = acme.measure
        setGroup(initial = WEEKLY, system = acme)
        option(WEEKLY).requestFocus().assertIsFocused()
        rule.waitForIdle()
        val layer = acme.radioButton.conditions.selected.focused.containerColor.resolve(acmeColors).compositeOver(acmeColors[TanreiColorRole.Surface])
        val ringTop = CENTER - tokens.ringSize / 2
        val inBand = pixel(CENTER, ringTop - (m.focusOffset + m.focusInnerWidth + m.focusOuterWidth / 4))
        assertTrue("the halo carries the focus color: $inBand", tintOf(inBand, layer, ring) > 0.7f)
        val beyond = tintOf(pixel(CENTER, ringTop - (m.focusOffset + m.focusInnerWidth + m.focusOuterWidth * 1.5f)), layer, ring)
        assertTrue("soft beyond the hard edge: $beyond", beyond > 0.05f && beyond < 0.4f)
    }

    // ── RAD-14: geometry ─────────────────────────────────────────────────────

    @Test
    fun `RAD-14 the ring is ring-size across, stroked at ring-width inside it, with a dot of dot-size at its center`() {
        setGroup(initial = WEEKLY)
        val primary = colors[TanreiColorRole.Primary]
        with(rule.density) {
            val map = option(WEEKLY).captureToImage().toPixelMap()
            val middle = CENTER.roundToPx()
            val top = (CENTER - tokens.ringSize / 2).roundToPx()
            val width = tokens.ringWidth.roundToPx()
            val dotTop = (CENTER - tokens.dotSize / 2).roundToPx()
            val dotBottom = (CENTER + tokens.dotSize / 2).roundToPx()
            // Round edges: the rows at a circle's top are anti-aliased, so coverage, not the exact color.
            fun covered(what: String, y: Int) = assertTrue("$what is covered", tintOf(map[middle, y], surface, primary) >= EDGE_COVERED)
            fun clear(what: String, y: Int) = assertTrue("$what is clear", tintOf(map[middle, y], surface, primary) <= 1f - EDGE_COVERED)
            clear("above the ring", top - 1)
            covered("the ring's first row", top)
            covered("the ring's last row", top + width - 1)
            clear("inside the ring", top + width)
            clear("above the dot", dotTop - 1)
            covered("the dot's first row", dotTop)
            covered("the dot's last row", dotBottom - 1)
            clear("below the dot", dotBottom)
        }
    }

    @Test
    fun `RAD-14 no dot is drawn while unselected, whatever its color token says`() {
        val system = tanrei.withCondition(TanreiRadioButtonCondition.Unselected, TanreiInteractionState.Enabled) { it.copy(dotColor = TanreiPaint.Role(TanreiColorRole.Error)) }
        setGroup(system = system)
        assertPixel("no dot", dotProbe(), surface)
    }

    @Test
    fun `RAD-14 the condition lookup is total - a condition the system does not have reads unselected`() {
        val unknown = TanreiRadioButtonCondition("mixed")
        assertFalse(unknown in tokens.conditions)
        assertEquals(tokens.conditions.unselected, tokens.conditions[unknown])
        assertEquals(listOf("unselected", "selected"), tokens.conditions.keys.map { it.key })
    }

    // ── RAD-15: the dot grows from the center ────────────────────────────────

    /** A tap whose down and up land in separate frames, as a finger's do. */
    private fun tapInTwoFrames(value: String) {
        rule.mainClock.autoAdvance = false
        option(value).performTouchInput { down(center) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        option(value).performTouchInput { up() }
    }

    /** Inside the ring, clear of the dot: what the dot is drawn over. */
    private fun insideProbe(value: String = WEEKLY): Color = pixel(CENTER, CENTER - (tokens.ringSize / 2 + tokens.dotSize / 2) / 2, value)

    /** The dot's edge probe: 3/4 of the way from its center to its edge. */
    private fun dotEdgeProbe(value: String = WEEKLY): Color = pixel(CENTER, CENTER - tokens.dotSize / 2 * 0.75f, value)

    @Test
    fun `RAD-15 the dot grows from the center of the ring over selection-duration, and the ring color moves with it`() {
        setGroup()
        tapInTwoFrames(WEEKLY)
        // Inside the ring the pressed state layer shows: compare with it, not with the surface.
        var frames = 0
        while (isClose(dotProbe(), insideProbe())) {
            assertTrue("the dot appears within the selection duration", frames++ < tokens.motionSelectionDuration / FRAME_MILLIS + 2)
            rule.mainClock.advanceTimeByFrame()
        }
        assertPixel("its edge is not reached yet", dotEdgeProbe(), insideProbe())
        val ring = ringProbe()
        assertTrue("the ring color is on its way: $ring", !isClose(ring, colors[TanreiColorRole.Primary]))
        rule.mainClock.advanceTimeBy(tokens.motionSelectionDuration.toLong() * 2 + tanrei.motion.duration.pressHold)
        assertPixel("grown", dotEdgeProbe(), colors[TanreiColorRole.Primary])
        assertPixel("the ring", ringProbe(), colors[TanreiColorRole.Primary])
    }

    @Test
    fun `RAD-15 the dot of the option that became unselected shrinks back to the center`() {
        setGroup(initial = WEEKLY)
        tapInTwoFrames(MONTHLY)
        var frames = 0
        while (!isClose(dotEdgeProbe(WEEKLY), surface)) {
            assertTrue("the edge goes within the selection duration", frames++ < tokens.motionSelectionDuration / FRAME_MILLIS + 2)
            rule.mainClock.advanceTimeByFrame()
        }
        assertTrue("its center is still drawn", !isClose(dotProbe(WEEKLY), surface))
        rule.mainClock.advanceTimeBy(tokens.motionSelectionDuration.toLong() * 2 + tanrei.motion.duration.pressHold)
        assertPixel("gone", dotProbe(WEEKLY), surface)
    }

    // ── RAD-17: the label ────────────────────────────────────────────────────

    @Test
    fun `RAD-17 the label is drawn at the container's inline end, label-gap away`() {
        setGroup(labelHidden = false)
        val node = option(WEEKLY).getUnclippedBoundsInRoot()
        val label = rule.onNodeWithText("Weekly", useUnmergedTree = true).getUnclippedBoundsInRoot()
        assertEquals((node.left + tokens.containerSize + tokens.labelGap).value, label.left.value, 0.5f)
    }

    @Test
    fun `RAD-17 right-to-left mirrors the order - the ring at the right, the label to its left`() {
        setGroup(labelHidden = false, direction = LayoutDirection.Rtl)
        val node = option(WEEKLY).getUnclippedBoundsInRoot()
        val label = rule.onNodeWithText("Weekly", useUnmergedTree = true).getUnclippedBoundsInRoot()
        assertEquals((node.right - tokens.containerSize - tokens.labelGap).value, label.right.value, 0.5f)
        with(rule.density) {
            val map = option(WEEKLY).captureToImage().toPixelMap()
            val x = map.width - (tokens.containerSize / 2).roundToPx()
            val outline = colors[TanreiColorRole.Outline]
            assertTrue("the ring is at the right end", tintOf(map[x, (CENTER - tokens.ringSize / 2).roundToPx()], surface, outline) >= EDGE_COVERED)
        }
    }

    @Test
    fun `RAD-17 a long label wraps rather than truncating`() {
        val long = "Every week, on the first working day, with a summary of the last one"
        setGroup(labelHidden = false, labels = LABELS + (WEEKLY to long), width = 160.dp)
        val label = rule.onNodeWithText(long, useUnmergedTree = true).getUnclippedBoundsInRoot()
        val lineHeight = with(rule.density) { tokens.labelTypescale.lineHeight.toDp() }
        assertTrue("wrapped onto several lines: ${label.bottom - label.top}", label.bottom - label.top > lineHeight * 2)
    }

    @Test
    fun `RAD-17 a wrapping label's FIRST line is centered on the control`() {
        val long = "Every week, on the first working day, with a summary of the last one"
        setGroup(labelHidden = false, labels = LABELS + (WEEKLY to long), width = 160.dp)
        val node = option(WEEKLY).getUnclippedBoundsInRoot()
        val label = rule.onNodeWithText(long, useUnmergedTree = true).getUnclippedBoundsInRoot()
        val lineHeight = with(rule.density) { tokens.labelTypescale.lineHeight.toDp() }
        assertTrue("several lines", label.bottom - label.top > lineHeight * 2)
        val controlCenter = tokens.containerSize / 2
        assertEquals("the first line's center is the control's", (node.top + controlCenter).value, (label.top + lineHeight / 2).value, 0.5f)
        val map = option(WEEKLY).captureToImage().toPixelMap()
        val ringTop = with(rule.density) { map[(tokens.containerSize / 2).roundToPx(), (controlCenter - tokens.ringSize / 2).roundToPx()] }
        assertTrue("the ring is drawn there", tintOf(ringTop, surface, colors[TanreiColorRole.Outline]) >= EDGE_COVERED)
    }

    // ── RAD-18: labelHidden and an empty label ───────────────────────────────

    @Test
    fun `RAD-18 labelHidden draws no label and keeps it as the accessible name`() {
        setGroup(labelHidden = true)
        rule.onNodeWithText("Weekly", useUnmergedTree = true).assertDoesNotExist()
        option(WEEKLY).assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf("Weekly")))
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    @Test
    fun `RAD-18 without a label it still renders and works, and a debuggable app reports it once`() = collectingReports { reports ->
        setDebuggable(true)
        setGroup(labelHidden = false, labels = LABELS + (WEEKLY to ""))
        option(WEEKLY).assertWidthIsEqualTo(measure.targetTouch).assertHeightIsEqualTo(measure.targetTouch)
        option(WEEKLY).performClick()
        rule.waitForIdle()
        assertEquals(listOf("change:weekly"), events)
        assertEquals(reports.toString(), 1, reports.size)
        assertTrue(reports.toString(), "TanreiRadioButton" in reports.single() && "label" in reports.single())
    }

    @Test
    fun `RAD-18 a release-like app reports nothing, and named options report nothing anywhere`() = collectingReports { reports ->
        setDebuggable(false)
        setGroup(labels = LABELS + (WEEKLY to ""))
        rule.waitForIdle()
        assertEquals(emptyList<String>(), reports)
        setDebuggable(true)
        setGroup()
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

    private fun TanreiSystem.withCondition(
        condition: TanreiRadioButtonCondition,
        state: TanreiInteractionState,
        change: (TanreiRadioButtonConditionStateTokens) -> TanreiRadioButtonConditionStateTokens,
    ): TanreiSystem {
        val conditions = radioButton.conditions
        val tokens = conditions[condition]
        val changed = when (state) {
            TanreiInteractionState.Enabled -> tokens.copy(enabled = change(tokens.enabled))
            TanreiInteractionState.Hovered -> tokens.copy(hovered = change(tokens.hovered))
            TanreiInteractionState.Focused -> tokens.copy(focused = change(tokens.focused))
            TanreiInteractionState.Pressed -> tokens.copy(pressed = change(tokens.pressed))
            TanreiInteractionState.Disabled -> tokens.copy(disabled = change(tokens.disabled))
        }
        val updated = when (condition) {
            TanreiRadioButtonCondition.Unselected -> conditions.copy(unselected = changed)
            TanreiRadioButtonCondition.Selected -> conditions.copy(selected = changed)
            else -> error("not used by these tests: $condition")
        }
        return copy(radioButton = radioButton.copy(conditions = updated))
    }

    private fun assertContainer(paint: TanreiPaint, value: String = WEEKLY) = assertContainerColor(paint.resolve(colors).compositeOver(surface), value)

    private fun assertContainerColor(expected: Color, value: String = WEEKLY) = assertPixel("container", pixel(CONTAINER_START, CENTER, value), expected)

    private fun pixel(x: Dp, y: Dp, value: String = WEEKLY): Color = option(value).captureToImage().toPixelMap().at(x, y)

    /** On the ring's top, at its horizontal center. */
    private fun ringProbe(value: String = WEEKLY): Color = pixel(CENTER, CENTER - tokens.ringSize / 2 + tokens.ringWidth / 2, value)

    /** The center of the ring: the dot. */
    private fun dotProbe(value: String = WEEKLY): Color = pixel(CENTER, CENTER, value)

    /** The middle of the focus ring's outer stroke above the ring. */
    private fun ringCenter(): Dp = CENTER - tokens.ringSize / 2 - (measure.focusOffset + measure.focusInnerWidth + measure.focusOuterWidth / 2)

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
        const val BEFORE = "before"
        const val AFTER = "after"
        const val GROUP = "group"
        const val WEEKLY = "weekly"
        const val MONTHLY = "monthly"
        const val YEARLY = "yearly"
        val VALUES = listOf(WEEKLY, MONTHLY, YEARLY)
        val LABELS = mapOf(WEEKLY to "Weekly", MONTHLY to "Monthly", YEARLY to "Yearly")
        const val PIXEL_TOLERANCE = 2f / 255f
        const val PRESSED_OPACITY = 0.5f
        const val COVERAGE_TOLERANCE = 0.05f
        const val EDGE_COVERED = 0.8f
        const val EDGE_OFFSET_TOLERANCE = 0.15f
        const val FRAME_MILLIS = 16

        /** With the label hidden: the 48 dp target, the container and the ring centered in it. */
        val CENTER = 24.dp

        /** Inside the container, beside the ring, at its vertical center. */
        val CONTAINER_START = 13.dp
        val CONTAINER_END = 35.dp
        val CONTAINER_START_POINT = CONTAINER_START to CENTER
        val CONTAINER_END_POINT = CONTAINER_END to CENTER
    }
}

/** RAD-12 and RAD-15 where motion is reduced (the animator duration scale is 0, see `TanreiButtonReducedMotionTest`). */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiRadioButtonReducedMotionTest {
    private object NoMotion : MotionDurationScale {
        override val scaleFactor: Float = 0f
    }

    @get:Rule
    val rule = createComposeRule(effectContext = NoMotion)

    private val tanrei = TanreiSystem.Tanrei
    private val colors = tanrei.colors.light
    private var selected by mutableStateOf(false)

    private fun set(system: TanreiSystem = tanrei) {
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Box(Modifier.background(TanreiColorRole.Surface.color).padding(TanreiTheme.tokens.space.space200).selectableGroup()) {
                    TanreiRadioButton(selected = selected, onClick = { selected = true }, label = "Weekly", modifier = Modifier.testTag("radio"), labelHidden = true)
                }
            }
        }
    }

    private fun pixel(x: Dp, y: Dp): Color = with(rule.density) { rule.onNodeWithTag("radio").captureToImage().toPixelMap()[x.roundToPx(), y.roundToPx()] }

    private fun assertPixel(what: String, actual: Color, expected: Color) {
        val delta = maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue))
        assertTrue("$what: expected $expected but was $actual", delta <= 2f / 255f)
    }

    @Test
    fun `RAD-15 where motion is reduced the new condition shows at once - the whole dot on the next frame`() {
        set()
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag("radio").performClick()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        val dot = tanrei.radioButton.dotSize
        assertPixel("the dot's edge", pixel(24.dp, 24.dp - dot / 2 * 0.75f), colors[TanreiColorRole.Primary])
    }

    @Test
    fun `RAD-12 where motion is reduced the ripple appears whole`() {
        set(tanrei.copy(behavior = tanrei.behavior.copy(pressedFeedback = TanreiPressedFeedback.Ripple)))
        val pressed = tanrei.radioButton.conditions.unselected.pressed.containerColor.resolve(colors).compositeOver(colors[TanreiColorRole.Surface])
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag("radio").performTouchInput { down(Offset(13.dp.toPx(), centerY)) }
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        assertPixel("the far side, whole at once", pixel(35.dp, 24.dp), pressed)
        rule.onNodeWithTag("radio").performTouchInput { up() }
    }
}
