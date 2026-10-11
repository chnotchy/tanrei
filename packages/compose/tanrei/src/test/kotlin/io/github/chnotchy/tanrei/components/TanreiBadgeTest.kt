package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.res.Configuration
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PixelMap
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertHeightIsEqualTo
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertLeftPositionInRootIsEqualTo
import androidx.compose.ui.test.assertTopPositionInRootIsEqualTo
import androidx.compose.ui.test.assertWidthIsEqualTo
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.accessibility.enableAccessibilityChecks
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performKeyInput
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.pressKey
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.test.tryPerformAccessibilityChecks
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.font.createFontFamilyResolver
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import java.util.Locale
import kotlin.math.abs
import org.junit.Assert.assertEquals
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
 * Behaviour tests for `specs/badge.spec.json`. Each test names the behaviour id (`BDG-n`) it covers. The anchor is a
 * [ANCHOR_SIZE] square at ([MARGIN_X], [MARGIN_Y]) of a surface stage, so its top-end corner is at (72dp, 16dp) and the
 * badge's pixels can be probed around it (Robolectric, native graphics, xhdpi: 1dp = 2px).
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiBadgeTest {
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
    private val tokens = tanrei.badge
    private val surface = colors[TanreiColorRole.Surface]
    private val container = colors[TanreiColorRole.Primary]
    private val anchorColor = colors[TanreiColorRole.SurfaceContainerHighest]

    /** Tanrei draws a surface-colored ring around the badge; with no ring the badge's own edges can be probed. */
    private val noRing = tanrei.copy(badge = tokens.copy(outlineColor = TanreiPaint.None))

    private var clicks = 0

    @Before
    fun setUp() {
        // ATF checks: NOT_RUN under Robolectric (see TanreiButtonTest); explicit semantics assertions guard here.
        rule.enableAccessibilityChecks()
    }

    private class Scene(
        val count: Int?,
        val max: Int,
        val label: String,
        val system: TanreiSystem,
        val direction: LayoutDirection,
        val fontScale: Float,
        val locale: Locale?,
        val anchor: @Composable () -> Unit,
        /** The anchor alone, without a badge: what BDG-5 compares with. */
        val bare: Boolean = false,
    )

    private var scene by mutableStateOf<Scene?>(null)

    /** A solid square: the anchor most tests badge. */
    private val squareAnchor: @Composable () -> Unit = { Box(Modifier.testTag(ANCHOR).size(ANCHOR_SIZE).background(anchorColor)) }

    /** An icon button named "Inbox": the anchor of the spec's own example. */
    private val buttonAnchor: @Composable () -> Unit = {
        TanreiIconButton(onClick = { clicks++ }, contentDescription = "Inbox", modifier = Modifier.testTag(ANCHOR)) {}
    }

    /**
     * The badge on its anchor, on the stage. Called again, it recomposes the one scene a test may set with the new
     * values (the badge and its anchor stay the same nodes, as they would in an app whose count changes).
     */
    private fun setBadge(
        count: Int?,
        max: Int = 999,
        label: String = "",
        system: TanreiSystem = tanrei,
        direction: LayoutDirection = LayoutDirection.Ltr,
        fontScale: Float = 1f,
        locale: Locale? = null,
        anchor: @Composable () -> Unit = squareAnchor,
    ) {
        val first = scene == null
        scene = Scene(count, max, label, system, direction, fontScale, locale, anchor)
        if (!first) {
            rule.waitForIdle()
            return
        }
        rule.setContent {
            val current = scene ?: return@setContent
            val density = LocalDensity.current
            val configuration = LocalConfiguration.current
            val localized = current.locale?.let { locale -> Configuration(configuration).apply { setLocale(locale) } } ?: configuration
            CompositionLocalProvider(
                LocalDensity provides Density(density.density, current.fontScale),
                LocalConfiguration provides localized,
                LocalLayoutDirection provides current.direction,
            ) {
                TanreiTheme(system = current.system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                    Box(Modifier.testTag(STAGE).background(TanreiColorRole.Surface.color).padding(horizontal = MARGIN_X, vertical = MARGIN_Y)) {
                        if (current.bare) {
                            current.anchor()
                        } else {
                            TanreiBadge(count = current.count, modifier = Modifier.testTag(BADGE), max = current.max, contentDescription = current.label, anchor = current.anchor)
                        }
                    }
                }
            }
        }
    }

    private fun stage(): PixelMap = rule.onNodeWithTag(STAGE).captureToImage().toPixelMap()

    private fun PixelMap.at(x: Dp, y: Dp): Color = with(rule.density) { this@at[x.toPx().toInt(), y.toPx().toInt()] }

    /** The anchor's top-end corner in stage coordinates (left-to-right). */
    private val cornerX = MARGIN_X + ANCHOR_SIZE
    private val cornerY = MARGIN_Y

    // ── BDG-1: the dot ───────────────────────────────────────────────────────

    @Test
    fun `BDG-1 without a count the badge is a dot of dot size in the container color, centered dot offset inside the top-end corner`() {
        setBadge(count = null, label = "New messages", system = noRing)
        val map = stage()
        val cx = cornerX - tokens.dotOffset
        val cy = cornerY + tokens.dotOffset
        val r = tokens.dotSize / 2
        assertPixel("center", map.at(cx, cy), container)
        assertPixel("inside the left edge", map.at(cx - r + 1.dp, cy), container)
        assertPixel("inside the right edge", map.at(cx + r - 1.dp, cy), container)
        assertPixel("left of the dot, over the anchor", map.at(cx - r - 1.dp, cy), anchorColor)
        assertPixel("right of the dot, outside the anchor", map.at(cx + r + 1.dp, cy), surface)
        assertPixel("below the dot", map.at(cx, cy + r + 1.dp), anchorColor)
    }

    @Test
    fun `BDG-1 the dot's size, offset and color come from the system`() {
        val system = noRing.copy(badge = noRing.badge.copy(dotSize = 12.dp, dotOffset = 8.dp, containerColor = TanreiPaint.Role(TanreiColorRole.Error)))
        setBadge(count = null, label = "New", system = system)
        val map = stage()
        val error = colors[TanreiColorRole.Error]
        assertPixel("center", map.at(cornerX - 8.dp, cornerY + 8.dp), error)
        assertPixel("5dp from the center", map.at(cornerX - 8.dp + 5.dp, cornerY + 8.dp), error)
        assertPixel("7dp from the center", map.at(cornerX - 8.dp + 7.dp, cornerY + 8.dp), anchorColor)
    }

    @Test
    fun `BDG-1 the dot is a circle whatever corners the container has`() {
        val square = noRing.copy(badge = noRing.badge.copy(containerShape = 0.dp, dotSize = 12.dp, dotOffset = 8.dp))
        setBadge(count = null, label = "New", system = square)
        val map = stage()
        val cx = cornerX - 8.dp
        val cy = cornerY + 8.dp
        assertPixel("the center", map.at(cx, cy), container)
        assertPixel("the top-right corner of its box is not filled", map.at(cx + 6.dp - 0.5.dp, cy - 6.dp + 0.5.dp), anchorColor)
        assertPixel("the bottom-left corner of its box is not filled", map.at(cx - 6.dp + 0.5.dp, cy + 6.dp - 0.5.dp), anchorColor)
    }

    // ── BDG-2 / BDG-3: the pill ──────────────────────────────────────────────

    @Test
    fun `BDG-2 BDG-3 a single digit sits in a circle of container height whose center is container offset inside the corner`() {
        setBadge(count = 3, system = noRing)
        val map = stage()
        val h = tokens.containerHeight
        // Offset 0: the circle is centered on the corner itself.
        assertEquals(0.dp, tokens.containerOffset)
        assertPixel("inside, left", map.at(cornerX - h / 2 + 1.dp, cornerY), container)
        assertPixel("outside, left (over the anchor)", map.at(cornerX - h / 2 - 1.dp, cornerY + 2.dp), anchorColor)
        assertPixel("inside, right", map.at(cornerX + h / 2 - 1.dp, cornerY), container)
        assertPixel("outside, right", map.at(cornerX + h / 2 + 1.dp, cornerY), surface)
        assertPixel("inside, top", map.at(cornerX - 3.dp, cornerY - h / 2 + 1.dp), container)
        assertPixel("outside, top", map.at(cornerX, cornerY - h / 2 - 1.dp), surface)
    }

    @Test
    fun `BDG-2 the label is drawn in the label color, centered in the pill`() {
        setBadge(count = 8, system = noRing)
        val map = stage()
        val label = colors[TanreiColorRole.OnPrimary]
        val h = tokens.containerHeight
        // Somewhere across the middle of the pill a pixel is the label color, and both sides of it are container.
        val row = (-6..6).map { map.at(cornerX + it.dp, cornerY) }
        assertTrue("the label is drawn: $row", row.any { isClose(it, label, tolerance = 0.2f) })
        assertPixel("left of the label", map.at(cornerX - h / 2 + 1.dp, cornerY), container)
        assertPixel("right of the label", map.at(cornerX + h / 2 - 1.dp, cornerY), container)
    }

    @Test
    fun `BDG-2 BDG-3 a longer count is wider than it is high, with the padding around its label, and grows toward the end`() {
        setBadge(count = 3, system = noRing)
        val single = pillExtent()
        setBadge(count = 42, system = noRing)
        val double = pillExtent()
        assertEquals("the single digit is a circle", with(rule.density) { tokens.containerHeight.toPx() }, (single.last - single.first + 1).toFloat(), 1f)
        assertEquals("the leading circle stays put: the start does not move", single.first, double.first)
        assertTrue("42 grows toward the end: $single → $double", double.last > single.last)
        setBadge(count = 1200, max = 9999, system = noRing)
        val four = pillExtent()
        assertTrue("1200 is wider still: $double → $four", four.last > double.last)
        assertEquals(single.first, four.first)
    }

    @Test
    fun `BDG-2 BDG-3 the pill's height, padding, offset, shape and color come from the system`() {
        val system = noRing.copy(
            badge = noRing.badge.copy(
                containerHeight = 24.dp,
                containerOffset = 4.dp,
                containerShape = 0.dp,
                containerColor = TanreiPaint.Role(TanreiColorRole.Error),
            ),
        )
        setBadge(count = 3, system = system)
        val map = stage()
        val error = colors[TanreiColorRole.Error]
        val cx = cornerX - 4.dp
        val cy = cornerY + 4.dp
        assertPixel("square corner: the top-left pixel is filled", map.at(cx - 12.dp + 0.5.dp, cy - 12.dp + 0.5.dp), error)
        assertPixel("outside, left", map.at(cx - 12.dp - 1.dp, cy), anchorColor)
        assertPixel("outside, top", map.at(cx, cy - 12.dp - 1.dp), surface)
    }

    // ── BDG-4: the cap ───────────────────────────────────────────────────────

    @Test
    fun `BDG-4 a count above max shows max and a plus sign, otherwise the count in full`() {
        assertEquals("999+", tanreiBadgeText(1200, 999, Locale.US))
        assertEquals("99+", tanreiBadgeText(120, 99, Locale.US))
        assertEquals("999", tanreiBadgeText(999, 999, Locale.US))
        assertEquals("42", tanreiBadgeText(42, 999, Locale.US))
        setBadge(count = 1200, anchor = buttonAnchor)
        rule.onNodeWithTag(ANCHOR).assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "999+"))
        setBadge(count = 120, max = 99, anchor = buttonAnchor)
        rule.onNodeWithTag(ANCHOR).assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "99+"))
    }

    // ── BDG-5: zero ──────────────────────────────────────────────────────────

    @Test
    fun `BDG-5 a count of 0 draws nothing and exposes nothing - the anchor renders and is announced as without a badge`() {
        setBadge(count = 0, label = "No unread messages", anchor = buttonAnchor)
        val badged = stage()
        rule.onNodeWithTag(ANCHOR)
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.StateDescription))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf("Inbox")))
        rule.onNodeWithTag(BADGE, useUnmergedTree = true).assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.StateDescription))
        rule.onRoot().tryPerformAccessibilityChecks()
        // The same anchor without a badge: the same pixels, the same announcement.
        scene = scene!!.let { Scene(it.count, it.max, it.label, it.system, it.direction, it.fontScale, it.locale, it.anchor, bare = true) }
        rule.waitForIdle()
        assertSame(stage(), badged)
        rule.onNodeWithTag(ANCHOR)
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.StateDescription))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf("Inbox")))
    }

    // ── BDG-6: the outline ───────────────────────────────────────────────────

    @Test
    fun `BDG-6 the outline is drawn outside the dot's edge in the outline color, and does not move or grow the dot`() {
        val ringed = tanrei.copy(badge = tokens.copy(outlineColor = TanreiPaint.Role(TanreiColorRole.Error)))
        setBadge(count = null, label = "New", system = ringed)
        val map = stage()
        val error = colors[TanreiColorRole.Error]
        val cx = cornerX - tokens.dotOffset
        val cy = cornerY + tokens.dotOffset
        val r = tokens.dotSize / 2
        val w = tokens.outlineWidth
        assertPixel("the dot keeps its size", map.at(cx + r - 1.dp, cy), container)
        assertPixel("the ring, outside its edge", map.at(cx + r + w / 2, cy), error)
        assertPixel("beyond the ring", map.at(cx + r + w + 1.dp, cy), surface)
    }

    @Test
    fun `BDG-6 the outline is drawn outside the pill's edge, and the pill keeps its place`() {
        val ringed = tanrei.copy(badge = tokens.copy(outlineColor = TanreiPaint.Role(TanreiColorRole.Error), outlineWidth = 4.dp))
        setBadge(count = 3, system = noRing)
        val bare = pillExtent()
        setBadge(count = 3, system = ringed)
        val map = stage()
        val error = colors[TanreiColorRole.Error]
        val h = tokens.containerHeight
        assertPixel("the pill's own edge is where it was", map.at(cornerX + h / 2 - 1.dp, cornerY), container)
        assertPixel("the ring outside it", map.at(cornerX + h / 2 + 2.dp, cornerY), error)
        assertPixel("beyond the ring", map.at(cornerX + h / 2 + 5.dp, cornerY), surface)
        setBadge(count = 3, system = noRing)
        assertEquals(bare, pillExtent())
    }

    @Test
    fun `BDG-6 in the default system the ring is the surface color - it cuts the badge out of the anchor it overlaps`() {
        setBadge(count = null, label = "New")
        val map = stage()
        val cx = cornerX - tokens.dotOffset
        val cy = cornerY + tokens.dotOffset
        val r = tokens.dotSize / 2
        // Left of the dot is over the anchor: the ring shows as surface there.
        assertPixel("ring over the anchor", map.at(cx - r - tokens.outlineWidth / 2, cy), surface)
        assertPixel("the anchor beyond it", map.at(cx - r - tokens.outlineWidth - 1.dp, cy), anchorColor)
    }

    // ── BDG-7: no layout space, no input ────────────────────────────────────

    @Test
    fun `BDG-7 the badge does not change the anchor's size or position and takes no space`() {
        for (count in listOf(null, 3, 1200)) {
            setBadge(count = count, label = "x")
            rule.onNodeWithTag(BADGE).assertWidthIsEqualTo(ANCHOR_SIZE).assertHeightIsEqualTo(ANCHOR_SIZE)
            rule.onNodeWithTag(ANCHOR).assertWidthIsEqualTo(ANCHOR_SIZE).assertHeightIsEqualTo(ANCHOR_SIZE)
                .assertLeftPositionInRootIsEqualTo(MARGIN_X).assertTopPositionInRootIsEqualTo(MARGIN_Y)
            rule.onNodeWithTag(STAGE).assertWidthIsEqualTo(ANCHOR_SIZE + MARGIN_X * 2).assertHeightIsEqualTo(ANCHOR_SIZE + MARGIN_Y * 2)
        }
    }

    @Test
    fun `BDG-7 a tap on the badge reaches the anchor`() {
        val clickable: @Composable () -> Unit = { Box(Modifier.testTag(ANCHOR).size(ANCHOR_SIZE).clickable { clicks++ }) }
        setBadge(count = 42, anchor = clickable)
        // Just inside the anchor's top-end corner: under the pill.
        val at = with(rule.density) { androidx.compose.ui.geometry.Offset((ANCHOR_SIZE - 2.dp).toPx(), 2.dp.toPx()) }
        rule.onNodeWithTag(ANCHOR).performTouchInput { down(at); up() }
        rule.waitForIdle()
        assertEquals(1, clicks)
        setBadge(count = null, label = "New", anchor = clickable)
        rule.onNodeWithTag(ANCHOR).performTouchInput { down(at); up() }
        rule.waitForIdle()
        assertEquals(2, clicks)
    }

    @Test
    @KeyboardNavigation
    fun `BDG-7 the badge takes no keyboard focus - the anchor is the only focusable element, and Enter activates it`() {
        setBadge(count = 3, label = "3 unread", anchor = buttonAnchor)
        val requestFocus = rule.onRoot(useUnmergedTree = true).fetchSemanticsNode().let { root ->
            fun count(node: androidx.compose.ui.semantics.SemanticsNode): Int =
                (if (SemanticsActions.RequestFocus in node.config) 1 else 0) + node.children.sumOf { count(it) }
            count(root)
        }
        assertEquals("one focusable node: the anchor", 1, requestFocus)
        rule.onNodeWithTag(ANCHOR).requestFocus().assertIsFocused().performKeyInput { pressKey(Key.Enter) }
        rule.waitForIdle()
        assertEquals(1, clicks)
    }

    // ── BDG-8: the anchor's description ─────────────────────────────────────

    @Test
    fun `BDG-8 a Tanrei control as the anchor is announced with its name, its role, then label - and the drawn number is hidden`() {
        setBadge(count = 3, label = "3 unread", anchor = buttonAnchor)
        rule.onNodeWithTag(ANCHOR)
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf("Inbox")))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "3 unread"))
        val tree = dump(rule.onRoot(useUnmergedTree = true).fetchSemanticsNode(), 0)
        assertEquals("the number is not text in the (merged) tree:\n$tree", 0, rule.onAllNodes(hasText("3", substring = true)).fetchSemanticsNodes().size)
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    @Test
    fun `BDG-8 a TanreiButton anchor gets the description too, and a control inside it does not repeat it`() {
        setBadge(count = 5, label = "5 new", anchor = {
            TanreiButton(onClick = {}, modifier = Modifier.testTag(ANCHOR)) {
                TanreiIconButton(onClick = {}, contentDescription = "inner", modifier = Modifier.testTag(INNER)) {}
            }
        })
        rule.onNodeWithTag(ANCHOR).assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "5 new"))
        rule.onNodeWithTag(INNER).assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.StateDescription))
    }

    @Test
    fun `BDG-8 with no label the displayed text is added instead, and a dot adds its label`() {
        setBadge(count = 1200, anchor = buttonAnchor)
        rule.onNodeWithTag(ANCHOR).assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "999+"))
        setBadge(count = null, label = "New messages", anchor = buttonAnchor)
        rule.onNodeWithTag(ANCHOR).assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "New messages"))
    }

    @Test
    fun `BDG-8 on a plain anchor with nothing merging around it, the description stays on the badge's box, which is no element of its own`() {
        setBadge(count = 3, label = "3 unread", anchor = {
            Box(Modifier.size(ANCHOR_SIZE).semantics { contentDescription = "Inbox" })
        })
        // The box does not merge its descendants and is no leaf, so a screen reader makes no stop of its own for it.
        rule.onNodeWithTag(BADGE, useUnmergedTree = true)
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "3 unread"))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.ContentDescription))
        val badge = rule.onNodeWithTag(BADGE, useUnmergedTree = true).fetchSemanticsNode()
        assertTrue("not a merging element", !badge.config.isMergingSemanticsOfDescendants)
        assertTrue("not a leaf", badge.children.isNotEmpty())
    }

    @Test
    fun `BDG-8 wrapped in an element that merges its descendants, a plain anchor is announced with its name then label`() {
        rule.setContent {
            TanreiTheme(system = tanrei, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Box(Modifier.testTag(STAGE).semantics(mergeDescendants = true) {}) {
                    TanreiBadge(count = 3, contentDescription = "3 unread") {
                        Box(Modifier.size(ANCHOR_SIZE).semantics { contentDescription = "Inbox" })
                    }
                }
            }
        }
        rule.onNodeWithTag(STAGE)
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf("Inbox")))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "3 unread"))
    }

    @Test
    fun `BDG-8 a fixture's anchor is named by its glyph and the badge adds the fixture's label once - notifications, 3 unread`() {
        val fixture = loadBadgeFixtures().single { it.id == "count-single" }
        rule.setContent {
            TanreiTheme(system = tanrei, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                // What merges the anchor and the badge into one element in an app (a list row, a navigation item).
                Box(Modifier.testTag(STAGE).semantics(mergeDescendants = true) {}) { BadgeFixture(fixture) }
            }
        }
        rule.onNodeWithTag(STAGE)
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf(fixture.content)))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, fixture.label))
        assertEquals("notifications", fixture.content)
        assertEquals("3 unread", fixture.label)
    }

    // ── BDG-9: a dot without a label ────────────────────────────────────────

    @Test
    fun `BDG-9 a dot without a label still renders, and a debuggable app reports it once`() = collectingReports { reports ->
        setDebuggable(true)
        setBadge(count = null, anchor = buttonAnchor)
        rule.waitForIdle()
        rule.onNodeWithTag(ANCHOR).assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.StateDescription))
        assertEquals(reports.toString(), 1, reports.size)
        assertTrue(reports.toString(), "TanreiBadge" in reports.single() && "contentDescription" in reports.single())
        val map = stage()
        assertPixel("the dot is drawn", map.at(MARGIN_X + 48.dp - tokens.dotOffset, MARGIN_Y + tokens.dotOffset), container)
    }

    @Test
    fun `BDG-9 a release-like app reports nothing, and a dot with a label or a count without one report nothing anywhere`() = collectingReports { reports ->
        setDebuggable(false)
        setBadge(count = null)
        rule.waitForIdle()
        assertEquals(emptyList<String>(), reports)
        setDebuggable(true)
        setBadge(count = null, label = "New")
        setBadge(count = 3)
        rule.waitForIdle()
        assertEquals(emptyList<String>(), reports)
    }

    // ── BDG-10: updates, never announced ────────────────────────────────────

    @Test
    fun `BDG-10 a changing count or label updates the anchor's description and marks nothing as a live region`() {
        setBadge(count = 3, anchor = buttonAnchor)
        rule.onNodeWithTag(ANCHOR).assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "3"))
        setBadge(count = 4, anchor = buttonAnchor)
        rule.onNodeWithTag(ANCHOR).assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "4"))
        setBadge(count = 4, label = "4 unread", anchor = buttonAnchor)
        rule.onNodeWithTag(ANCHOR).assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "4 unread"))
        val live = rule.onAllNodes(SemanticsMatcher.keyIsDefined(SemanticsProperties.LiveRegion), useUnmergedTree = true).fetchSemanticsNodes()
        assertEquals("no live region", 0, live.size)
    }

    // ── BDG-11: right-to-left ────────────────────────────────────────────────

    @Test
    fun `BDG-11 in a right-to-left layout the dot sits on the anchor's top-left corner`() {
        setBadge(count = null, label = "New", direction = LayoutDirection.Rtl, system = noRing)
        val map = stage()
        assertPixel("top-left", map.at(MARGIN_X + tokens.dotOffset, cornerY + tokens.dotOffset), container)
        assertPixel("not top-right", map.at(cornerX - tokens.dotOffset, cornerY + tokens.dotOffset), anchorColor)
    }

    @Test
    fun `BDG-11 in a right-to-left layout a longer count grows toward the left from the top-left corner`() {
        setBadge(count = 3, direction = LayoutDirection.Rtl, system = noRing)
        val single = pillExtent()
        setBadge(count = 42, direction = LayoutDirection.Rtl, system = noRing)
        val double = pillExtent()
        assertEquals("the leading circle's end does not move", single.last, double.last)
        assertTrue("42 grows toward the left: $single → $double", double.first < single.first)
        val leading = with(rule.density) { (MARGIN_X + tokens.containerHeight / 2).roundToPx() }
        assertEquals("the circle is centered on the top-left corner", leading.toFloat(), (single.last + 1).toFloat(), 1f)
    }

    @Test
    fun `BDG-11 a capped count keeps its plus sign after the digits in a right-to-left layout - the label is isolated`() {
        // Digits and a plus sign have no strong direction: laid out right-to-left as they are, 99+ reads +99.
        val measurer = TextMeasurer(createFontFamilyResolver(ApplicationProvider.getApplicationContext()), rule.density, LayoutDirection.Rtl)
        val bare = measurer.measure("99+", layoutDirection = LayoutDirection.Rtl)
        assertTrue("without isolation the plus sign is drawn first", bare.getBoundingBox(2).left < bare.getBoundingBox(0).left)
        val isolated = measurer.measure(tanreiIsolated("99+"), layoutDirection = LayoutDirection.Rtl)
        assertTrue("isolated, it stays after the digits", isolated.getBoundingBox(3).left > isolated.getBoundingBox(2).left)
        assertTrue(isolated.getBoundingBox(2).left > isolated.getBoundingBox(1).left)
        assertEquals("\u206899+\u2069", tanreiIsolated("99+"))

        // And the pill draws the isolated label: in both directions its last ink is the plus sign's, at the same place.
        val transparent: @Composable () -> Unit = { Box(Modifier.size(ANCHOR_SIZE)) }
        setBadge(count = 120, max = 99, system = noRing, anchor = transparent)
        val ltrExtent = pillExtent()
        val ltr = pillImage()
        setBadge(count = 120, max = 99, system = noRing, anchor = transparent, direction = LayoutDirection.Rtl)
        val rtlExtent = pillExtent()
        val rtl = pillImage()
        assertEquals("the pill is the same width: $ltrExtent / $rtlExtent", ltrExtent.last - ltrExtent.first, rtlExtent.last - rtlExtent.first)
        // The plus sign is the rightmost glyph: its vertical bar is the rightmost column of label ink in both.
        fun lastInk(image: List<List<Color>>): Int = image.maxOf { row -> row.indices.lastOrNull { x -> x in 4 until row.size - 4 && !isClose(row[x], container) && isClose(row[x], colors[TanreiColorRole.OnPrimary], 0.3f) } ?: -1 }
        assertEquals("the plus sign ends the label in both directions", lastInk(ltr).toFloat(), lastInk(rtl).toFloat(), 2f)
    }

    // ── BDG-12: locale digits, no grouping, tabular figures ──────────────────

    @Test
    fun `BDG-12 the count is formatted with the locale's digits and no grouping separator`() {
        assertEquals("1200", tanreiBadgeText(1200, 9999, Locale.US))
        assertEquals("1200", tanreiBadgeText(1200, 9999, Locale.GERMANY))
        assertEquals("٣", tanreiBadgeText(3, 999, Locale.forLanguageTag("ar-EG")))
        setBadge(count = 3, locale = Locale.forLanguageTag("ar-EG"), anchor = buttonAnchor)
        rule.onNodeWithTag(ANCHOR).assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "٣"))
    }

    @Test
    fun `BDG-12 digits are drawn with tabular figures - a changing count of the same length keeps its width`() {
        assertEquals("tnum", TanreiBadgeFigures)
        setBadge(count = 11, system = noRing)
        val ones = pillExtent()
        setBadge(count = 88, system = noRing)
        assertEquals(ones, pillExtent())
    }

    // ── BDG-13: enlarged text ────────────────────────────────────────────────

    @Test
    fun `BDG-13 at 200 percent text the pill grows with its label and stays centered on the corner, and the dot keeps its size`() {
        setBadge(count = 42, system = noRing, fontScale = 2f)
        val map = stage()
        val column = with(rule.density) { (cornerX).toPx().toInt() }
        val rows = (0 until map.height).filter { !isClose(map[column, it], surface) && !isClose(map[column, it], anchorColor) }
        val height = rows.last() - rows.first() + 1
        val h = with(rule.density) { tokens.containerHeight.roundToPx() }
        assertTrue("taller than container height: $height px", height > h)
        val center = (rows.first() + rows.last() + 1) / 2f
        assertEquals("still centered on the corner", with(rule.density) { cornerY.toPx() }, center, 1f)

        setBadge(count = null, label = "New", system = noRing, fontScale = 2f)
        val dot = stage()
        val cx = cornerX - tokens.dotOffset
        val cy = cornerY + tokens.dotOffset
        assertPixel("inside the dot", dot.at(cx + tokens.dotSize / 2 - 1.dp, cy), container)
        assertPixel("outside the dot at its size", dot.at(cx + tokens.dotSize / 2 + 1.dp, cy), surface)
    }

    // ── BDG-14: values outside the spec ─────────────────────────────────────

    @Test
    fun `BDG-14 a negative count renders as 0 and a max below 1 as 999, each reported in a debuggable app - a count is never fractional here`() = collectingReports { reports ->
        setDebuggable(true)
        setBadge(count = -3, anchor = buttonAnchor)
        rule.waitForIdle()
        rule.onNodeWithTag(ANCHOR).assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.StateDescription))
        setBadge(count = 1200, max = 0, anchor = buttonAnchor)
        rule.onNodeWithTag(ANCHOR).assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "999+"))
        assertEquals(reports.toString(), 2, reports.size)
        assertTrue(reports.toString(), reports.any { "TanreiBadge" in it && "count -3" in it })
        assertTrue(reports.toString(), reports.any { "TanreiBadge" in it && "max 0" in it })
    }

    @Test
    fun `BDG-14 a count that is not a number cannot be passed here - count is an Int, which has no NaN and no fraction`() {
        // The spec's "not a number" (NaN, a non-numeric attribute on the web) and "not a whole number" have no value on
        // this platform: the compiled parameter is a boxed Int (Int? in Kotlin), never a Float or a String.
        val badge = Class.forName("io.github.chnotchy.tanrei.components.TanreiBadgeKt").declaredMethods.single { it.name == "TanreiBadge" }
        assertEquals(Integer::class.java, badge.parameterTypes.first())
    }

    @Test
    fun `BDG-14 a negative count draws exactly what a count of 0 draws, silently in a release-like app`() = collectingReports { reports ->
        setDebuggable(false)
        setBadge(count = 0)
        val zero = stage()
        setBadge(count = -1)
        assertSame(zero, stage())
        assertEquals(emptyList<String>(), reports)
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun dump(node: androidx.compose.ui.semantics.SemanticsNode, depth: Int): String =
        "  ".repeat(depth) + node.config.toString() + "\n" + node.children.joinToString("") { dump(it, depth + 1) }

    /** The columns of the stage's corner row that are neither surface nor anchor: the pill's horizontal extent. */
    private fun pillExtent(): IntRange {
        val map = stage()
        val y = with(rule.density) { cornerY.toPx().toInt() }
        val filled = (0 until map.width).filter { x -> !isClose(map[x, y], surface) && !isClose(map[x, y], anchorColor) }
        return filled.first()..filled.last()
    }

    /** The pill's pixels (its rows around the corner, its columns from [pillExtent]), row by row. */
    private fun pillImage(): List<List<Color>> {
        val extent = pillExtent()
        val map = stage()
        val h = tokens.containerHeight
        val top = with(rule.density) { (cornerY - h / 2).toPx().toInt() }
        val bottom = with(rule.density) { (cornerY + h / 2).toPx().toInt() }
        return (top until bottom).map { y -> extent.map { x -> map[x, y] } }
    }

    private fun assertSame(expected: PixelMap, actual: PixelMap) {
        assertEquals(expected.width, actual.width)
        assertEquals(expected.height, actual.height)
        for (y in 0 until expected.height) for (x in 0 until expected.width) assertEquals("pixel $x,$y", expected[x, y], actual[x, y])
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
            setDebuggable(false)
        }
    }

    private fun isClose(actual: Color, expected: Color, tolerance: Float = PIXEL_TOLERANCE): Boolean {
        val seen = expected.compositeOver(surface)
        return maxOf(abs(seen.red - actual.red), abs(seen.green - actual.green), abs(seen.blue - actual.blue)) <= tolerance
    }

    private fun assertPixel(what: String, actual: Color, expected: Color) =
        assertTrue("$what: expected $expected but was $actual", isClose(actual, expected))

    private companion object {
        const val STAGE = "stage"
        const val BADGE = "badge"
        const val ANCHOR = "anchor"
        const val INNER = "inner"
        const val PIXEL_TOLERANCE = 2f / 255f
        /** Room on both sides for a pill that grows past the anchor (a four-digit count, or right-to-left). */
        val MARGIN_X = 48.dp
        val MARGIN_Y = 16.dp
        val ANCHOR_SIZE = 24.dp
    }
}
