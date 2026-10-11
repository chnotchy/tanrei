package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshots.Snapshot
import androidx.compose.ui.Modifier
import androidx.compose.ui.MotionDurationScale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PixelMap
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.ProgressBarRangeInfo
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
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.toEasing
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiLoadingIndicatorSize
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.sin
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Behaviour tests for `specs/loading-indicator.spec.json`. Each test names the behaviour id (`LDG-n`) it covers. Most
 * tests draw medium at [BIG] with a [STROKE] stroke (a system copy) so the arc can be probed in pixels (Robolectric,
 * native graphics, xhdpi). The test clock is stopped before composing, so the loop runs frame by frame.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiLoadingIndicatorTest {
    @get:Rule
    val rule = createComposeRule()

    private val tanrei = TanreiSystem.Tanrei
    private val colors = tanrei.colors.light
    private val tokens = tanrei.loadingIndicator
    private val surface = colors[TanreiColorRole.Surface]
    private val mark = colors[TanreiColorRole.OnSurfaceVariant]

    /** Medium drawn big enough to probe, in both forms; contained with colors of its own so each part is told apart. */
    private val big = tanrei.copy(
        loadingIndicator = tokens.copy(
            containedContainerColor = TanreiPaint.Role(TanreiColorRole.Warning),
            containedIndicatorColor = TanreiPaint.Role(TanreiColorRole.Success),
            sizes = tokens.sizes.copy(medium = tokens.sizes.medium.copy(indicatorSize = BIG, indicatorThickness = STROKE, containerSize = BIG + 24.dp)),
        ),
    )

    @Before
    fun setUp() {
        rule.enableAccessibilityChecks()
        TanreiDiagnostics.forgetReportedSteps()
    }

    private class Scene(val contained: Boolean, val size: TanreiLoadingIndicatorSize, val label: String, val system: TanreiSystem, val direction: LayoutDirection)

    private var scene by mutableStateOf<Scene?>(null)
    private var shift by mutableIntStateOf(0)

    private fun set(
        contained: Boolean = false,
        size: TanreiLoadingIndicatorSize = TanreiLoadingIndicatorSize.Medium,
        label: String = LABEL,
        system: TanreiSystem = big,
        direction: LayoutDirection = LayoutDirection.Ltr,
    ) {
        val first = scene == null
        scene = Scene(contained, size, label, system, direction)
        if (!first) {
            frames(1)
            return
        }
        rule.mainClock.autoAdvance = false
        rule.setContent {
            val current = scene ?: return@setContent
            CompositionLocalProvider(LocalLayoutDirection provides current.direction) {
                TanreiTheme(system = current.system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                    Box(Modifier.offset { IntOffset(0, shift) }.testTag(STAGE).background(TanreiColorRole.Surface.color).padding(MARGIN)) {
                        if (current.contained) {
                            TanreiContainedLoadingIndicator(contentDescription = current.label, modifier = Modifier.testTag(TAG), size = current.size)
                        } else {
                            TanreiLoadingIndicator(contentDescription = current.label, modifier = Modifier.testTag(TAG), size = current.size)
                        }
                    }
                }
            }
        }
        frames(1)
    }

    /** Publish the test's state writes, then run [n] frames of the stopped clock. */
    private fun frames(n: Int) {
        Snapshot.sendApplyNotifications()
        repeat(n) { rule.mainClock.advanceTimeByFrame() }
    }

    private var elapsed = 0L

    /** Advance the clock to [fraction] of a cycle after the loop started. */
    private fun at(fraction: Float) {
        val target = (fraction * tokens.motionCycleDuration).toLong()
        if (target > elapsed) rule.mainClock.advanceTimeBy(target - elapsed)
        elapsed = target
    }

    private fun node() = rule.onNodeWithTag(TAG)

    private fun map(): PixelMap = node().captureToImage().toPixelMap()

    /** The pixel [radius] from the center of [map] at [degrees] clockwise from the top. */
    private fun polar(map: PixelMap, degrees: Float, radius: Dp): Color {
        val r = with(rule.density) { radius.toPx() }
        val angle = degrees * PI / 180.0
        return map[(map.width / 2f + r * sin(angle).toFloat()).toInt(), (map.height / 2f - r * cos(angle).toFloat()).toInt()]
    }

    /** On the arc's stroke, midway through it. */
    private fun onRing(map: PixelMap, degrees: Float): Color = polar(map, degrees, BIG / 2 - STROKE / 2)

    // ── LDG-1: the turning arc ───────────────────────────────────────────────

    @Test
    fun `LDG-1 a quarter arc starting at the top turns clockwise once per cycle at constant speed, with no track`() {
        set()
        for (turn in listOf(0f, 0.25f, 0.5f, 0.75f, 1f)) {
            at(turn)
            val map = map()
            val from = 360f * (turn % 1f)
            assertPixel("at $turn: inside the arc", onRing(map, from + 45f), mark)
            assertPixel("at $turn: behind it, no track", onRing(map, from - 60f), surface)
            assertPixel("at $turn: ahead of it, no track", onRing(map, from + 150f), surface)
        }
    }

    @Test
    fun `LDG-1 the arc's stroke is the size's thickness and its outer edge touches the square`() {
        set()
        at(0f)
        val map = map()
        assertPixel("just inside the outer edge", polar(map, 45f, BIG / 2 - 0.5.dp), mark)
        assertPixel("just inside the inner edge", polar(map, 45f, BIG / 2 - STROKE + 0.5.dp), mark)
        assertPixel("inside the ring", polar(map, 45f, BIG / 2 - STROKE - 1.dp), surface)
    }

    @Test
    fun `LDG-1 the arc's caps are round - it reaches a little past its quarter`() {
        set()
        at(0f)
        // Round caps reach half a stroke (4dp on a 20dp radius, about 11 degrees) past each end.
        assertPixel("past 90 degrees", onRing(map(), 95f), mark)
        assertPixel("before 0 degrees", onRing(map(), -5f), mark)
        assertPixel("well past", onRing(map(), 110f), surface)
    }

    @Test
    fun `LDG-1 the cycle is the system's cycle-duration token`() {
        val slow = tanrei.copy(loadingIndicator = big.loadingIndicator.copy(motionCycleDuration = tokens.motionCycleDuration * 2))
        set(system = slow)
        at(0.5f) // half the default cycle: a quarter of the slow one
        assertPixel("a quarter turn", onRing(map(), 90f + 45f), mark)
        assertPixel("not half a turn", onRing(map(), 180f + 45f), surface)
    }

    // ── LDG-2 / LDG-3: the two forms ─────────────────────────────────────────

    @Test
    fun `LDG-2 uncontained it is exactly the indicator square, in the indicator color, with nothing else drawn`() {
        set(system = tanrei)
        node().assertWidthIsEqualTo(tokens.sizes.medium.indicatorSize).assertHeightIsEqualTo(tokens.sizes.medium.indicatorSize)
        set()
        at(0f)
        val map = map()
        assertPixel("the arc", onRing(map, 45f), mark)
        assertPixel("the center", map[map.width / 2, map.height / 2], surface)
        assertPixel("a corner", map[1, map.height - 2], surface)
    }

    @Test
    fun `LDG-3 contained it is a container of container size, filled, rounded by container shape, with the arc centered in the contained color`() {
        set(contained = true)
        at(0f)
        val container = BIG + 24.dp
        node().assertWidthIsEqualTo(container).assertHeightIsEqualTo(container)
        val map = map()
        val fill = colors[TanreiColorRole.Warning]
        assertPixel("the arc, contained color", onRing(map, 45f), colors[TanreiColorRole.Success])
        assertPixel("the fill, beside the arc", onRing(map, 225f), fill)
        assertPixel("the fill, at the center", map[map.width / 2, map.height / 2], fill)
        // Full shape: the container is a circle, so its box's corner is not filled.
        assertTrue("the corner is cut: ${map[2, 2]}", !isClose(map[2, 2], fill))
    }

    @Test
    fun `LDG-3 the container shape and color come from the system`() {
        set(contained = true, system = big.copy(loadingIndicator = big.loadingIndicator.copy(containerShape = 0.dp, containedContainerColor = TanreiPaint.Role(TanreiColorRole.Error))))
        val map = map()
        assertPixel("square: the corner is filled", map[2, 2], colors[TanreiColorRole.Error])
    }

    @Test
    fun `LDG-3 the container is raised by the contained elevation, and level 0 raises it not at all`() {
        set(contained = true)
        val raised = rule.onNodeWithTag(STAGE).captureToImage().toPixelMap()
        set(contained = true, system = big.copy(loadingIndicator = big.loadingIndicator.copy(containedContainerElevation = tanrei.elevation.level0)))
        val flat = rule.onNodeWithTag(STAGE).captureToImage().toPixelMap()
        val margin = with(rule.density) { MARGIN.roundToPx() }
        // The band below the container: a soft shadow there at level 2, the bare surface at level 0.
        val band = (flat.height - margin until flat.height).flatMap { y -> (0 until flat.width).map { x -> x to y } }
        assertTrue("level 0 draws nothing below the container", band.all { (x, y) -> flat[x, y] == flat[0, 0] })
        val shaded = band.count { (x, y) -> raised[x, y] != flat[x, y] }
        assertTrue("level 2 draws a shadow below the container ($shaded px)", shaded > SHADOW_PIXELS)
        assertTrue("level 2 is not empty", tanrei.elevation.level2.isNotEmpty() && tokens.containedContainerElevation == tanrei.elevation.level2)
    }

    // ── LDG-5 / LDG-6: semantics ─────────────────────────────────────────────

    @Test
    fun `LDG-5 it is a progress bar named by the label, indeterminate, with no value - in both forms`() {
        for (contained in listOf(false, true)) {
            set(contained = contained)
            node()
                .assert(SemanticsMatcher.expectValue(SemanticsProperties.ProgressBarRangeInfo, ProgressBarRangeInfo.Indeterminate))
                .assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf(LABEL)))
                .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.StateDescription))
        }
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    @Test
    fun `LDG-6 it is not focusable and is no live region - it does not announce itself`() {
        for (contained in listOf(false, true)) {
            set(contained = contained)
            node()
                .assert(SemanticsMatcher.keyNotDefined(SemanticsActions.RequestFocus))
                .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Focused))
                .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.LiveRegion))
                .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.PaneTitle))
        }
    }

    // ── LDG-7: off screen ────────────────────────────────────────────────────

    @Test
    fun `LDG-7 off screen the animation does not run, and it resumes where it stopped when it is back`() {
        set()
        at(0.25f)
        assertPixel("a quarter turn in", onRing(map(), 135f), mark)
        shift = OUT_OF_WINDOW
        frames(4)
        rule.mainClock.advanceTimeBy(tokens.motionCycleDuration / 2L)
        shift = 0
        frames(3)
        val back = map()
        assertPixel("still a quarter turn in", onRing(back, 135f), mark)
        assertPixel("not where half a cycle more would put it", onRing(back, 315f), surface)
        rule.mainClock.advanceTimeBy(tokens.motionCycleDuration / 2L)
        assertPixel("running again", onRing(map(), 315f), mark)
    }

    // ── LDG-8: never mirrored ────────────────────────────────────────────────

    @Test
    fun `LDG-8 in a right-to-left layout it is not mirrored - it turns clockwise from the top`() {
        set(direction = LayoutDirection.Rtl)
        at(0.125f)
        val map = map()
        assertPixel("clockwise: on the right", onRing(map, 90f), mark)
        assertPixel("not the mirror image on the left", onRing(map, 270f), surface)
    }

    // ── LDG-9: unknown size ──────────────────────────────────────────────────

    @Test
    fun `LDG-9 a size the system does not have renders as medium, reported in a debuggable app`() = collectingReports { reports ->
        setDebuggable(true)
        set(system = tanrei, size = TanreiLoadingIndicatorSize("huge"))
        node().assertWidthIsEqualTo(tokens.sizes.medium.indicatorSize)
        assertTrue(reports.toString(), reports.any { "TanreiLoadingIndicator" in it && "size \"huge\"" in it })
        set(system = tanrei, size = TanreiLoadingIndicatorSize("huge"), contained = true)
        node().assertWidthIsEqualTo(tokens.sizes.medium.containerSize)
        assertTrue(reports.toString(), reports.any { "TanreiContainedLoadingIndicator" in it && "size \"huge\"" in it })
        assertEquals(tokens.sizes.medium, tokens.sizes[TanreiLoadingIndicatorSize("huge")])
        assertEquals(listOf("small", "medium", "large"), tokens.sizes.keys.map { it.key })
    }

    // ── LDG-10: no label ─────────────────────────────────────────────────────

    @Test
    fun `LDG-10 without a label it still renders, has no name, and a debuggable app reports it once`() = collectingReports { reports ->
        setDebuggable(true)
        set(label = "")
        at(0f)
        assertPixel("drawn", onRing(map(), 45f), mark)
        node().assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.ContentDescription))
        assertEquals(reports.toString(), 1, reports.size)
        assertTrue(reports.toString(), "TanreiLoadingIndicator" in reports.single() && "contentDescription" in reports.single())
    }

    @Test
    fun `LDG-10 a named indicator reports nothing, nor a nameless one in a release-like app`() = collectingReports { reports ->
        setDebuggable(false)
        set(label = "")
        setDebuggable(true)
        set(label = LABEL)
        assertEquals(emptyList<String>(), reports)
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private fun setDebuggable(debuggable: Boolean) {
        val info = ApplicationProvider.getApplicationContext<Context>().applicationInfo
        info.flags = if (debuggable) info.flags or ApplicationInfo.FLAG_DEBUGGABLE else info.flags and ApplicationInfo.FLAG_DEBUGGABLE.inv()
        TanreiDiagnostics.debuggable = debuggable
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

    private fun isClose(actual: Color, expected: Color): Boolean {
        val seen = expected.compositeOver(surface)
        return maxOf(abs(seen.red - actual.red), abs(seen.green - actual.green), abs(seen.blue - actual.blue)) <= PIXEL_TOLERANCE
    }

    private fun assertPixel(what: String, actual: Color, expected: Color) =
        assertTrue("$what: expected $expected but was $actual", isClose(actual, expected))

    private companion object {
        const val TAG = "loading"
        const val STAGE = "stage"
        const val LABEL = "Loading"
        const val PIXEL_TOLERANCE = 3f / 255f
        const val OUT_OF_WINDOW = 100_000
        /** Tanrei's level 2 is a very soft shadow: a hundred-odd pixels below a 72dp circle differ from the surface. */
        const val SHADOW_PIXELS = 50
        val MARGIN = 16.dp
        val BIG = 48.dp
        val STROKE = 8.dp
    }
}

/**
 * LDG-4 — where motion is reduced (the animator duration scale 0, handed to the composition's effects as
 * [MotionDurationScale]).
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiLoadingIndicatorReducedMotionTest {
    private object NoMotion : MotionDurationScale {
        override val scaleFactor: Float = 0f
    }

    @get:Rule
    val rule = createComposeRule(effectContext = NoMotion)

    private val tanrei = TanreiSystem.Tanrei
    private val colors = tanrei.colors.light
    private val tokens = tanrei.loadingIndicator
    private val surface = colors[TanreiColorRole.Surface]

    private fun set(contained: Boolean) {
        rule.mainClock.autoAdvance = false
        rule.setContent {
            TanreiTheme(system = tanrei, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Box(Modifier.background(TanreiColorRole.Surface.color)) {
                    if (contained) {
                        TanreiContainedLoadingIndicator(contentDescription = "Loading", modifier = Modifier.testTag(TAG), size = TanreiLoadingIndicatorSize.Large)
                    } else {
                        TanreiLoadingIndicator(contentDescription = "Loading", modifier = Modifier.testTag(TAG), size = TanreiLoadingIndicatorSize.Large)
                    }
                }
            }
        }
        rule.mainClock.advanceTimeByFrame()
    }

    private fun map() = rule.onNodeWithTag(TAG).captureToImage().toPixelMap()

    /** The four points of the circle's stroke: top, right, bottom, left. */
    private fun compass(map: PixelMap, contained: Boolean): List<Color> {
        val inset = with(rule.density) { (if (contained) (tokens.sizes.large.containerSize - tokens.sizes.large.indicatorSize) / 2 else 0.dp).toPx() + tokens.sizes.large.indicatorThickness.toPx() / 2 }.toInt()
        val c = map.width / 2
        return listOf(map[c, inset], map[map.width - 1 - inset, c], map[c, map.height - 1 - inset], map[inset, c])
    }

    @Test
    fun `LDG-4 where motion is reduced the whole circle is drawn and does not turn - its opacity goes 1 to 0 to 1 per cycle, eased`() {
        set(contained = false)
        val color = colors[TanreiColorRole.OnSurfaceVariant]
        val easing = tanrei.motion.easing.standard.toEasing()
        var elapsed = 0L
        for (phase in listOf(0f, 0.25f, 0.5f, 0.75f)) {
            val target = (phase * tokens.motionCycleDuration).toLong()
            if (target > elapsed) rule.mainClock.advanceTimeBy(target - elapsed)
            elapsed = target
            val half = phase * 2f
            val alpha = if (half < 1f) 1f - easing.transform(half) else easing.transform(half - 1f)
            val expected = color.copy(alpha = color.alpha * alpha).compositeOver(surface)
            for (point in compass(map(), contained = false)) assertClose("at $phase: opacity $alpha", point, expected, PULSE_TOLERANCE)
        }
    }

    @Test
    fun `LDG-4 where motion is reduced a container stays still and opaque while the circle pulses`() {
        set(contained = true)
        val fill = tokens.containedContainerColor.resolve(colors).compositeOver(surface)
        val start = map()
        val center = start[start.width / 2, start.height / 2]
        assertClose("the fill at the start", center, fill)
        compass(start, contained = true).forEach { assertClose("the circle at opacity 1", it, tokens.containedIndicatorColor.resolve(colors).compositeOver(fill)) }
        rule.mainClock.advanceTimeBy(tokens.motionCycleDuration / 2L)
        val half = map()
        assertClose("the fill half a cycle later", half[half.width / 2, half.height / 2], fill)
        compass(half, contained = true).forEach { assertClose("the circle at opacity 0 shows the fill", it, fill, PULSE_TOLERANCE) }
    }

    private fun assertClose(what: String, actual: Color, expected: Color, tolerance: Float = 3f / 255f) =
        assertTrue("$what: expected $expected but was $actual", maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue)) <= tolerance)

    private companion object {
        const val TAG = "loading"
        const val PULSE_TOLERANCE = 0.06f
    }
}
