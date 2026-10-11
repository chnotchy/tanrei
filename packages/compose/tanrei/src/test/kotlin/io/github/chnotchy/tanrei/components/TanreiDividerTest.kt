package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
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
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertHeightIsEqualTo
import androidx.compose.ui.test.assertWidthIsEqualTo
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.accessibility.enableAccessibilityChecks
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.tryPerformAccessibilityChecks
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import java.io.File
import kotlin.math.abs
import kotlin.math.roundToInt
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Behaviour tests for `specs/divider.spec.json`. Each test names the behaviour id (`DIV-n`) it covers. The divider is
 * placed on a stage of known size ([STAGE_LENGTH] along it), on the surface, and read in pixels (Robolectric, native
 * graphics, xhdpi: 1dp = 2px).
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiDividerTest {
    @get:Rule
    val rule = createComposeRule()

    private val tanrei = TanreiSystem.Tanrei
    private val colors = tanrei.colors.light
    private val tokens = tanrei.divider
    private val surface = colors[TanreiColorRole.Surface]
    /** The line as it is seen: `outline-variant` is translucent in the default system, drawn over the surface. */
    private val line = colors[TanreiColorRole.OutlineVariant].compositeOver(surface)

    @Before
    fun setUp() {
        // ATF checks: NOT_RUN under Robolectric (see TanreiButtonTest); explicit semantics assertions guard here.
        rule.enableAccessibilityChecks()
    }

    /** One divider on a stage [STAGE_LENGTH] long on its own axis (and [STAGE_LENGTH] across, for a vertical one's row). */
    private fun setDivider(
        orientation: Orientation = Orientation.Horizontal,
        inset: TanreiDividerInset = TanreiDividerInset.None,
        decorative: Boolean = true,
        system: TanreiSystem = tanrei,
        direction: LayoutDirection = LayoutDirection.Ltr,
        density: Density? = null,
    ) {
        rule.setContent {
            val content = @Composable {
                TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                    CompositionLocalProvider(LocalLayoutDirection provides direction) {
                        val stage = if (orientation == Orientation.Horizontal) Modifier.width(STAGE_LENGTH) else Modifier.height(STAGE_LENGTH)
                        Box(Modifier.testTag(STAGE).background(TanreiColorRole.Surface.color).then(stage)) {
                            TanreiDivider(modifier = Modifier.testTag(TAG), orientation = orientation, inset = inset, decorative = decorative)
                        }
                    }
                }
            }
            if (density == null) content() else CompositionLocalProvider(LocalDensity provides density) { content() }
        }
    }

    private fun divider() = rule.onNodeWithTag(TAG)

    private fun stageMap(): PixelMap = rule.onNodeWithTag(STAGE).captureToImage().toPixelMap()

    /** The pixels along the line's middle, from its start to its end in screen order. */
    private fun along(map: PixelMap, horizontal: Boolean): List<Color> =
        if (horizontal) (0 until map.width).map { map[it, 0] } else (0 until map.height).map { map[0, it] }

    // ── DIV-1: one straight line along the full size of its container ──────

    @Test
    fun `DIV-1 a horizontal divider draws one line of the line color along the full width of its container`() {
        setDivider()
        divider().assertWidthIsEqualTo(STAGE_LENGTH)
        val pixels = along(stageMap(), horizontal = true)
        assertTrue("every pixel along the line is the line color", pixels.all { isClose(it, line) })
    }

    @Test
    fun `DIV-1 a vertical divider draws one line of the line color along the full height of its container`() {
        setDivider(orientation = Orientation.Vertical)
        divider().assertHeightIsEqualTo(STAGE_LENGTH)
        val pixels = along(stageMap(), horizontal = false)
        assertTrue("every pixel along the line is the line color", pixels.all { isClose(it, line) })
    }

    @Test
    fun `DIV-1 the line color is the system's line color token`() {
        setDivider(system = tanrei.copy(divider = tokens.copy(lineColor = TanreiPaint.Role(TanreiColorRole.Error))))
        assertTrue(along(stageMap(), horizontal = true).all { isClose(it, colors[TanreiColorRole.Error].compositeOver(surface)) })
    }

    // ── DIV-2: exactly the thickness across, and no space of its own ────────

    @Test
    fun `DIV-2 the divider takes exactly the thickness on its cross axis and adds no margin - every pixel of its box is line`() {
        for (orientation in Orientation.entries) {
            setDividerFresh(orientation)
            val horizontal = orientation == Orientation.Horizontal
            if (horizontal) divider().assertHeightIsEqualTo(tokens.lineThickness) else divider().assertWidthIsEqualTo(tokens.lineThickness)
            val map = divider().captureToImage().toPixelMap()
            for (y in 0 until map.height) for (x in 0 until map.width) assertTrue("$orientation: pixel $x,$y is line", isClose(map[x, y], line))
        }
    }

    @Test
    fun `DIV-2 the thickness comes from the system's thickness token`() {
        val thick = 3.dp
        setDivider(system = tanrei.copy(divider = tokens.copy(lineThickness = thick)))
        divider().assertHeightIsEqualTo(thick)
        val map = stageMap()
        assertEquals(px(thick), map.height)
        for (y in 0 until map.height) assertTrue("row $y is line", isClose(map[map.width / 2, y], line))
    }

    // ── DIV-3: the inset leaves the start, or both ends, undrawn ────────────

    @Test
    fun `DIV-3 inset start leaves the inset undrawn at the start of a horizontal line, and draws the rest`() {
        setDivider(inset = TanreiDividerInset.Start)
        divider().assertWidthIsEqualTo(STAGE_LENGTH)
        assertRuns(along(stageMap(), horizontal = true), startGap = px(tokens.lineInset), endGap = 0)
    }

    @Test
    fun `DIV-3 inset both leaves the inset undrawn at both ends of a horizontal line`() {
        setDivider(inset = TanreiDividerInset.Both)
        assertRuns(along(stageMap(), horizontal = true), startGap = px(tokens.lineInset), endGap = px(tokens.lineInset))
    }

    @Test
    fun `DIV-3 a vertical divider's start inset is at its top, and both leaves the bottom undrawn too`() {
        setDivider(orientation = Orientation.Vertical, inset = TanreiDividerInset.Start)
        assertRuns(along(stageMap(), horizontal = false), startGap = px(tokens.lineInset), endGap = 0)
    }

    @Test
    fun `DIV-3 a vertical divider with inset both leaves both ends undrawn`() {
        setDivider(orientation = Orientation.Vertical, inset = TanreiDividerInset.Both)
        assertRuns(along(stageMap(), horizontal = false), startGap = px(tokens.lineInset), endGap = px(tokens.lineInset))
    }

    @Test
    fun `DIV-3 the inset length is the system's inset token`() {
        val inset = 24.dp
        setDivider(inset = TanreiDividerInset.Start, system = tanrei.copy(divider = tokens.copy(lineInset = inset)))
        assertRuns(along(stageMap(), horizontal = true), startGap = px(inset), endGap = 0)
    }

    // ── DIV-4: right-to-left ──────────────────────────────────────────────────

    @Test
    fun `DIV-4 in a right-to-left layout the start inset of a horizontal divider is at its right end`() {
        setDivider(inset = TanreiDividerInset.Start, direction = LayoutDirection.Rtl)
        assertRuns(along(stageMap(), horizontal = true), startGap = 0, endGap = px(tokens.lineInset))
    }

    @Test
    fun `DIV-4 in a right-to-left layout a vertical divider's inset stays at its top`() {
        setDivider(orientation = Orientation.Vertical, inset = TanreiDividerInset.Start, direction = LayoutDirection.Rtl)
        assertRuns(along(stageMap(), horizontal = false), startGap = px(tokens.lineInset), endGap = 0)
    }

    // ── DIV-5 / DIV-6: semantics ─────────────────────────────────────────────

    @Test
    fun `DIV-5 a decorative divider - the default - is hidden from assistive technology and not focusable`() {
        setDivider()
        divider()
            .assert(SemanticsMatcher.keyIsDefined(SemanticsProperties.HideFromAccessibility))
            .assert(SemanticsMatcher.keyNotDefined(TanreiSeparatorKey))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.ContentDescription))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Focused))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsActions.RequestFocus))
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    @Test
    fun `DIV-6 decorative false exposes a separator with its orientation, no name, and it is not focusable`() {
        for (orientation in Orientation.entries) {
            setDividerFresh(orientation, decorative = false)
            divider()
                .assert(SemanticsMatcher.expectValue(TanreiSeparatorKey, orientation))
                .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.HideFromAccessibility))
                .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.ContentDescription))
                .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Text))
                .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Focused))
                .assert(SemanticsMatcher.keyNotDefined(SemanticsActions.RequestFocus))
                .assert(SemanticsMatcher.keyNotDefined(SemanticsActions.OnClick))
        }
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    @Test
    fun `DIV-6 a separator looks exactly like a decorative divider`() {
        setDividerFresh(Orientation.Horizontal, decorative = true)
        val decorative = stageMap()
        setDividerFresh(Orientation.Horizontal, decorative = false)
        assertSame(decorative, stageMap())
    }

    // ── DIV-7: a value the divider does not define ───────────────────────────

    @Test
    fun `DIV-7 orientation and inset are closed enums holding exactly the spec's values, so no undefined value can be passed`() {
        val spec = JSONObject(File(DIVIDER_SPEC).readText())
        val props = spec.getJSONArray("props").let { all -> (0 until all.length()).map(all::getJSONObject) }.associateBy { it.getString("name") }
        fun values(name: String) = props.getValue(name).getJSONArray("values").let { v -> (0 until v.length()).map(v::getString) }
        assertEquals(values("orientation").toSet(), Orientation.entries.map { it.name.lowercase() }.toSet())
        assertEquals(values("inset"), TanreiDividerInset.entries.map { it.name.lowercase() })
        assertEquals("horizontal", props.getValue("orientation").getString("default"))
        assertEquals("none", props.getValue("inset").getString("default"))
        assertEquals(true, props.getValue("decorative").getBoolean("default"))
    }

    @Test
    fun `DIV-7 the defaults render as the spec's defaults, and nothing is reported in a debuggable app`() = collectingReports { reports ->
        setDebuggable(true)
        rule.setContent {
            TanreiTheme(system = tanrei, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Box(Modifier.background(TanreiColorRole.Surface.color).width(STAGE_LENGTH)) { TanreiDivider(modifier = Modifier.testTag(TAG)) }
            }
        }
        divider()
            .assertWidthIsEqualTo(STAGE_LENGTH)
            .assertHeightIsEqualTo(tokens.lineThickness)
            .assert(SemanticsMatcher.keyIsDefined(SemanticsProperties.HideFromAccessibility))
        assertTrue(along(divider().captureToImage().toPixelMap(), horizontal = true).all { isClose(it, line) })
        assertEquals(emptyList<String>(), reports)
    }

    // ── DIV-8: at least one device pixel, on the pixel grid ──────────────────

    @Test
    fun `DIV-8 at a fractional density the line covers whole rows of pixels - none is partly drawn`() {
        // 1dp at 2.625 is 2.625px: spread over the grid it would blend into a fourth row.
        val density = Density(2.625f)
        setDivider(density = density)
        val map = stageMap()
        val expected = with(density) { tokens.lineThickness.roundToPx() }
        assertEquals("the box is whole pixels", expected, map.height)
        for (y in 0 until map.height) for (x in 0 until map.width) assertTrue("pixel $x,$y is fully line", isClose(map[x, y], line))
    }

    @Test
    fun `DIV-8 a thickness below one device pixel still draws one whole pixel`() {
        setDivider(system = tanrei.copy(divider = tokens.copy(lineThickness = 0.2.dp)))
        val map = stageMap()
        assertEquals(1, map.height)
        assertTrue(along(map, horizontal = true).all { isClose(it, line) })
    }

    @Test
    fun `DIV-8 at a fractional density a vertical line covers whole columns, and the inset ends on a whole pixel`() {
        val density = Density(2.625f)
        setDivider(orientation = Orientation.Vertical, inset = TanreiDividerInset.Both, density = density)
        val map = stageMap()
        assertEquals(with(density) { tokens.lineThickness.roundToPx() }, map.width)
        val pixels = along(map, horizontal = false)
        assertTrue("every pixel is surface or line, never a blend", pixels.all { isClose(it, line) || isClose(it, surface) })
        val gap = with(density) { tokens.lineInset.roundToPx() }
        assertRuns(pixels, startGap = gap, endGap = gap)
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    /** What [setDividerFresh] renders; changing it recomposes the one scene a test may set. */
    private var current: Pair<Orientation, Boolean>? by mutableStateOf(null)

    private fun setDividerFresh(orientation: Orientation, decorative: Boolean = true) {
        val first = current == null
        current = orientation to decorative
        if (!first) {
            rule.waitForIdle()
            return
        }
        rule.setContent {
            val (o, d) = current ?: return@setContent
            TanreiTheme(system = tanrei, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                val stage = if (o == Orientation.Horizontal) Modifier.width(STAGE_LENGTH) else Modifier.size(STAGE_LENGTH)
                Box(Modifier.testTag(STAGE).background(TanreiColorRole.Surface.color).then(stage)) {
                    TanreiDivider(modifier = Modifier.testTag(TAG), orientation = o, decorative = d)
                }
            }
        }
    }

    private fun px(dp: Dp): Int = with(rule.density) { dp.roundToPx() }

    /** [pixels] are surface for [startGap] pixels, then line, then surface for the last [endGap] pixels. */
    private fun assertRuns(pixels: List<Color>, startGap: Int, endGap: Int) {
        pixels.forEachIndexed { i, pixel ->
            val inGap = i < startGap || i >= pixels.size - endGap
            val expected = if (inGap) surface else line
            assertTrue("pixel $i of ${pixels.size} (gaps $startGap / $endGap): expected $expected but was $pixel", isClose(pixel, expected))
        }
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

    private fun isClose(actual: Color, expected: Color): Boolean =
        maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue)) <= PIXEL_TOLERANCE &&
            (actual.alpha * 255).roundToInt() == 255

    private companion object {
        const val TAG = "divider"
        const val STAGE = "stage"
        const val PIXEL_TOLERANCE = 1f / 255f
        val STAGE_LENGTH = 120.dp
    }
}

internal const val DIVIDER_SPEC = "../../../specs/divider.spec.json"
