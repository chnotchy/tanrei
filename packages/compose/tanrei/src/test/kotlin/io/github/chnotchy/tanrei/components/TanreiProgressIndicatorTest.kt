package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableFloatStateOf
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
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiProgressIndicatorSize
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import java.io.File
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.sin
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
 * Behaviour tests for `specs/progress-indicator.spec.json`. Each test names the behaviour id (`PRG-n`) it covers. The
 * indicator sits on a surface stage [STAGE_WIDTH] wide and is read in pixels (Robolectric, native graphics, xhdpi:
 * 1dp = 2px). Indeterminate tests stop the test clock before composing, so the loop runs frame by frame (a clock that
 * advances by itself cancels infinite animations).
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiProgressIndicatorTest {
    @get:Rule
    val rule = createComposeRule()

    private val tanrei = TanreiSystem.Tanrei
    private val colors = tanrei.colors.light
    private val tokens = tanrei.progressIndicator
    private val surface = colors[TanreiColorRole.Surface]
    private val track = colors[TanreiColorRole.SurfaceVariant]
    private val indicator = colors[TanreiColorRole.Primary]

    @Before
    fun setUp() {
        rule.enableAccessibilityChecks()
        TanreiDiagnostics.forgetReportedSteps()
    }

    private class Scene(
        val value: Float?,
        val variant: TanreiProgressIndicatorVariant,
        val size: TanreiProgressIndicatorSize,
        val range: ClosedFloatingPointRange<Float>,
        val label: String,
        val valueText: String,
        val system: TanreiSystem,
        val direction: LayoutDirection,
    )

    private var scene by mutableStateOf<Scene?>(null)
    /** The value the determinate indicator's `progress` lambda reads: changing it must not need a new scene. */
    private var shown by mutableFloatStateOf(0f)
    /** Moves the stage down, out of the window (PRG-14). */
    private var shift by mutableIntStateOf(0)

    private fun setIndicator(
        value: Float? = 0.4f,
        variant: TanreiProgressIndicatorVariant = TanreiProgressIndicatorVariant.Linear,
        size: TanreiProgressIndicatorSize = TanreiProgressIndicatorSize.Medium,
        range: ClosedFloatingPointRange<Float> = 0f..1f,
        label: String = LABEL,
        valueText: String = "",
        system: TanreiSystem = tanrei,
        direction: LayoutDirection = LayoutDirection.Ltr,
        clockStopped: Boolean = false,
    ) {
        if (value != null) shown = value
        val first = scene == null
        scene = Scene(value, variant, size, range, label, valueText, system, direction)
        if (!first) {
            if (rule.mainClock.autoAdvance) rule.waitForIdle() else frames(1)
            return
        }
        if (clockStopped) rule.mainClock.autoAdvance = false
        rule.setContent {
            val current = scene ?: return@setContent
            CompositionLocalProvider(LocalLayoutDirection provides current.direction) {
                TanreiTheme(system = current.system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                    Box(Modifier.offset { IntOffset(0, shift) }.testTag(STAGE).background(TanreiColorRole.Surface.color).width(STAGE_WIDTH)) {
                        // A switch between determinate and indeterminate is a switch of overload (PRG-6).
                        key(current.value == null) {
                            if (current.value == null) {
                                TanreiProgressIndicator(contentDescription = current.label, modifier = Modifier.testTag(TAG), variant = current.variant, size = current.size)
                            } else {
                                TanreiProgressIndicator(
                                    progress = { shown },
                                    contentDescription = current.label,
                                    modifier = Modifier.testTag(TAG),
                                    variant = current.variant,
                                    size = current.size,
                                    valueRange = current.range,
                                    stateDescription = current.valueText,
                                )
                            }
                        }
                    }
                }
            }
        }
        if (clockStopped) rule.mainClock.advanceTimeByFrame()
    }

    private fun node() = rule.onNodeWithTag(TAG)

    private fun map(): PixelMap = node().captureToImage().toPixelMap()

    /** The pixel at [fraction] of a bar's length, in its middle row. */
    private fun bar(map: PixelMap, fraction: Float): Color = map[(map.width * fraction).toInt().coerceIn(0, map.width - 1), map.height / 2]

    /** The pixel on a ring's stroke at [degrees] clockwise from the top. */
    private fun ring(map: PixelMap, degrees: Float, thickness: Dp): Color {
        val stroke = with(rule.density) { thickness.toPx() }
        val radius = (minOf(map.width, map.height) - stroke) / 2f
        val angle = degrees * PI / 180.0
        val x = map.width / 2f + radius * sin(angle).toFloat()
        val y = map.height / 2f - radius * cos(angle).toFloat()
        return map[x.toInt().coerceIn(0, map.width - 1), y.toInt().coerceIn(0, map.height - 1)]
    }

    // ── PRG-1: determinate ───────────────────────────────────────────────────

    @Test
    fun `PRG-1 a determinate bar draws the indicator over the fraction of the track from its start`() {
        setIndicator(value = 0.4f)
        val map = map()
        assertPixel("inside the fraction", bar(map, 0.2f), indicator)
        assertPixel("just before its end", bar(map, 0.38f), indicator)
        assertPixel("just after its end", bar(map, 0.42f), track)
        assertPixel("the rest of the track", bar(map, 0.8f), track)
    }

    @Test
    fun `PRG-1 the fraction is (value - min) over (max - min)`() {
        setIndicator(value = 3f, range = 0f..10f)
        val map = map()
        assertPixel("28 percent", bar(map, 0.28f), indicator)
        assertPixel("32 percent", bar(map, 0.32f), track)
        setIndicator(value = 15f, range = 10f..20f)
        val half = map()
        assertPixel("48 percent", bar(half, 0.48f), indicator)
        assertPixel("52 percent", bar(half, 0.52f), track)
    }

    @Test
    fun `PRG-1 a determinate ring starts at the top and turns clockwise`() {
        setIndicator(value = 0.4f, variant = TanreiProgressIndicatorVariant.Circular, system = thickRing())
        val map = map()
        assertPixel("20 degrees, just after the top", ring(map, 20f, RING_STROKE), indicator)
        assertPixel("120 degrees", ring(map, 120f, RING_STROKE), indicator)
        assertPixel("180 degrees, past 144", ring(map, 180f, RING_STROKE), track)
        assertPixel("300 degrees: counterclockwise of the top is track", ring(map, 300f, RING_STROKE), track)
    }

    // ── PRG-2: indeterminate motion ──────────────────────────────────────────

    @Test
    fun `PRG-2 an indeterminate bar moves a segment of two fifths from beyond the start to beyond the end, eased, once per cycle`() {
        setIndicator(value = null, clockStopped = true)
        val cycle = tokens.motionCycleDuration.toLong()
        val easing = tokens.motionCycleEasing.toEasing()
        for (at in listOf(0.25f, 0.5f, 0.75f)) {
            val start = -SEGMENT + (1f + SEGMENT) * easing.transform(at)
            rule.mainClock.advanceTimeBy(elapsedUntil(at, cycle))
            val map = map()
            val middle = start + SEGMENT / 2f
            if (middle in 0.05f..0.95f) assertPixel("at $at: the segment's middle ($middle)", bar(map, middle), indicator)
            val before = start - 0.06f
            val after = start + SEGMENT + 0.06f
            if (before > 0.02f) assertPixel("at $at: before the segment ($before)", bar(map, before), track)
            if (after < 0.98f) assertPixel("at $at: after the segment ($after)", bar(map, after), track)
        }
    }

    @Test
    fun `PRG-2 an indeterminate ring turns a quarter arc clockwise at constant speed, once per cycle`() {
        setIndicator(value = null, variant = TanreiProgressIndicatorVariant.Circular, system = thickRing(), clockStopped = true)
        val cycle = tokens.motionCycleDuration.toLong()
        for (at in listOf(0.25f, 0.5f, 0.75f)) {
            rule.mainClock.advanceTimeBy(elapsedUntil(at, cycle))
            val map = map()
            val from = 360f * at
            assertPixel("at $at: inside the arc", ring(map, from + 45f, RING_STROKE), indicator)
            assertPixel("at $at: behind it", ring(map, from - 60f, RING_STROKE), track)
            assertPixel("at $at: ahead of it", ring(map, from + 150f, RING_STROKE), track)
        }
    }

    // ── PRG-3: sizes ─────────────────────────────────────────────────────────

    @Test
    fun `PRG-3 a bar is the size's thickness high across the full width it is given`() {
        for (size in listOf(TanreiProgressIndicatorSize.Small, TanreiProgressIndicatorSize.Medium, TanreiProgressIndicatorSize.Large)) {
            setIndicator(size = size)
            node().assertWidthIsEqualTo(STAGE_WIDTH).assertHeightIsEqualTo(tokens.sizes[size].linearThickness)
        }
        assertEquals(listOf(2.dp, 4.dp, 8.dp), tokens.sizes.keys.map { tokens.sizes[it].linearThickness })
    }

    @Test
    fun `PRG-3 a ring's outer edge fills the size's square, with the size's stroke`() {
        for (size in listOf(TanreiProgressIndicatorSize.Small, TanreiProgressIndicatorSize.Medium, TanreiProgressIndicatorSize.Large)) {
            val metrics = tokens.sizes[size]
            setIndicator(value = 1f, variant = TanreiProgressIndicatorVariant.Circular, size = size)
            node().assertWidthIsEqualTo(metrics.circularSize).assertHeightIsEqualTo(metrics.circularSize)
            val map = map()
            val px = with(rule.density) { metrics.circularThickness.toPx() }
            val midX = map.width / 2
            // Down the top of the ring: the stroke's middle is indicator, below the stroke is the hole.
            assertPixel("$size: the stroke's middle", map[midX, (px / 2f).toInt()], indicator)
            assertPixel("$size: inside the ring", map[midX, (px + 2f).toInt()], surface)
            assertTrue("$size: the outer edge reaches the box", !isClose(map[midX, 0], surface))
        }
    }

    // ── PRG-4: colors and ends ───────────────────────────────────────────────

    @Test
    fun `PRG-4 the track and indicator colors come from the system`() {
        val system = tanrei.copy(progressIndicator = tokens.copy(trackColor = TanreiPaint.Role(TanreiColorRole.Error), indicatorColor = TanreiPaint.Role(TanreiColorRole.Success)))
        setIndicator(system = system)
        val map = map()
        assertPixel("indicator", bar(map, 0.2f), colors[TanreiColorRole.Success])
        assertPixel("track", bar(map, 0.8f), colors[TanreiColorRole.Error])
    }

    @Test
    fun `PRG-4 a bar's ends are rounded by the track shape, clamped to half the thickness, and square at corner none`() {
        setIndicator(value = 0.4f, size = TanreiProgressIndicatorSize.Large)
        val rounded = map()
        assertPixel("full shape: the first pixel of the top row is cut", rounded[0, 0], surface)
        assertPixel("the middle row starts at once", rounded[2, rounded.height / 2], indicator)
        assertPixel("and ends rounded too", rounded[rounded.width - 1, 0], surface)
        setIndicator(value = 0.4f, size = TanreiProgressIndicatorSize.Large, system = tanrei.copy(progressIndicator = tokens.copy(trackShape = 0.dp)))
        val square = map()
        assertPixel("none: the corner pixel is indicator", square[0, 0], indicator)
        assertPixel("none: the far corner is track", square[square.width - 1, 0], track)
    }

    @Test
    fun `PRG-4 a ring's arcs have round caps, and butt caps at corner none`() {
        setIndicator(value = 0.25f, variant = TanreiProgressIndicatorVariant.Circular, system = thickRing())
        assertPixel("round: the cap reaches past 90 degrees", ring(map(), 96f, RING_STROKE), indicator)
        setIndicator(value = 0.25f, variant = TanreiProgressIndicatorVariant.Circular, system = thickRing(shape = 0.dp))
        assertPixel("butt: the arc ends at 90 degrees", ring(map(), 96f, RING_STROKE), track)
    }

    // ── PRG-5: gap and stop indicator ────────────────────────────────────────

    private fun gapped(gap: Dp = 8.dp, stop: Dp = 4.dp) = tanrei.copy(progressIndicator = tokens.copy(trackGap = gap, stopIndicatorSize = stop))

    @Test
    fun `PRG-5 Tanrei's gap and stop indicator are 0 - the track follows the indicator at once, and its end is track`() {
        assertEquals(0.dp, tokens.trackGap)
        assertEquals(0.dp, tokens.stopIndicatorSize)
        setIndicator(value = 0.4f, size = TanreiProgressIndicatorSize.Large)
        val map = map()
        assertPixel("right after the indicator", bar(map, 0.41f), track)
        assertPixel("the track's end", map[map.width - map.height / 2, map.height / 2], track)
    }

    @Test
    fun `PRG-5 a gap of track gap separates the indicator's end from the rest of the track, and the stop indicator marks the end`() {
        setIndicator(value = 0.4f, size = TanreiProgressIndicatorSize.Large, system = gapped())
        val map = map()
        val end = (map.width * 0.4f).toInt()
        val dp = with(rule.density) { 1.dp.toPx() }
        assertPixel("the indicator", map[end - (2 * dp).toInt(), map.height / 2], indicator)
        assertPixel("inside the gap", map[end + (4 * dp).toInt(), map.height / 2], surface)
        assertPixel("the track after the gap", map[end + (12 * dp).toInt(), map.height / 2], track)
        assertPixel("the stop indicator, centered in the thickness at the end", map[map.width - map.height / 2, map.height / 2], indicator)
        assertPixel("the stop indicator is 4dp, not the whole end", map[map.width - map.height / 2 - (3 * dp).toInt(), map.height / 2], track)
    }

    @Test
    fun `PRG-5 the stop dot's center is half the thickness before the track's end - concentric with the rounded end`() {
        // Large: 8dp thick, so the end cap's center is 4dp before the end; a 4dp dot spans 2dp on either side of it.
        setIndicator(value = 0.4f, size = TanreiProgressIndicatorSize.Large, system = gapped(stop = 4.dp))
        val map = map()
        val dp = with(rule.density) { 1.dp.toPx() }
        val center = map.width - map.height / 2
        val row = map.height / 2
        assertEquals("half the thickness before the end", (4 * dp).toInt(), map.width - center)
        assertPixel("1.5dp before its center", map[center - (1.5f * dp).toInt(), row], indicator)
        assertPixel("1.5dp after its center", map[center + (1.5f * dp).toInt() - 1, row], indicator)
        assertPixel("3dp before its center: track", map[center - (3 * dp).toInt(), row], track)
        assertPixel("3dp after its center: the track's rounded end", map[center + (3 * dp).toInt(), row], track)
    }

    @Test
    fun `PRG-5 no gap at 0 or at the end - only strictly between min and max`() {
        setIndicator(value = 0f, size = TanreiProgressIndicatorSize.Large, system = gapped())
        assertPixel("empty: the track from the start", bar(map(), 0.03f), track)
        setIndicator(value = 1f, size = TanreiProgressIndicatorSize.Large, system = gapped())
        assertPixel("full: indicator to the end", bar(map(), 0.97f), indicator)
    }

    @Test
    fun `PRG-5 a ring leaves the gap between the indicator and the rest of the track, and draws no stop indicator`() {
        setIndicator(value = 0.25f, variant = TanreiProgressIndicatorVariant.Circular, system = thickRing().let { it.copy(progressIndicator = it.progressIndicator.copy(trackGap = 8.dp, stopIndicatorSize = 4.dp)) })
        val map = map()
        assertPixel("the indicator", ring(map, 45f, RING_STROKE), indicator)
        assertPixel("the gap after its end", ring(map, 90f + 18f, RING_STROKE), surface)
        assertPixel("the track beyond", ring(map, 200f, RING_STROKE), track)
    }

    // ── PRG-6: value changes ─────────────────────────────────────────────────

    @Test
    fun `PRG-6 a new value moves the indicator's end over value duration, and a switch to indeterminate is at once`() {
        setIndicator(value = 0.2f, clockStopped = true)
        shown = 0.8f
        frames(1)
        rule.mainClock.advanceTimeBy(tokens.motionValueDuration / 3L)
        val moving = map()
        assertPixel("already past the old end", bar(moving, 0.25f), indicator)
        assertPixel("not yet at the new end", bar(moving, 0.75f), track)
        rule.mainClock.advanceTimeBy(tokens.motionValueDuration.toLong())
        val done = map()
        assertPixel("at the new end", bar(done, 0.78f), indicator)
        assertPixel("the track after it", bar(done, 0.82f), track)
        // Indeterminate on the next frame: the segment starts beyond the start, so the old indicator is gone.
        setIndicator(value = null)
        frames(1)
        node().assert(SemanticsMatcher.expectValue(SemanticsProperties.ProgressBarRangeInfo, ProgressBarRangeInfo.Indeterminate))
        assertPixel("the determinate indicator is gone", bar(map(), 0.6f), track)
    }

    @Test
    fun `PRG-6 the value easing duration is the system's value-duration token`() {
        val slow = tokens.motionValueDuration * 4
        setIndicator(value = 0.2f, system = tanrei.copy(progressIndicator = tokens.copy(motionValueDuration = slow)), clockStopped = true)
        shown = 0.8f
        frames(1)
        rule.mainClock.advanceTimeBy(tokens.motionValueDuration.toLong() + 50)
        assertPixel("still moving after the default duration", bar(map(), 0.75f), track)
        rule.mainClock.advanceTimeBy(slow.toLong())
        assertPixel("there after the system's", bar(map(), 0.75f), indicator)
    }

    // ── PRG-8 / PRG-9 / PRG-10: semantics ────────────────────────────────────

    @Test
    fun `PRG-8 a determinate indicator is a progress bar named by the label, with its range and value, and valueText as the value's text`() {
        setIndicator(value = 3f, range = 0f..10f, valueText = "3 of 10 files")
        node()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.ProgressBarRangeInfo, ProgressBarRangeInfo(3f, 0f..10f)))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf(LABEL)))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "3 of 10 files"))
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    @Test
    fun `PRG-8 without valueText the platform reads its percentage - no state description - and the value follows changes`() {
        setIndicator(value = 0.4f)
        node()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.ProgressBarRangeInfo, ProgressBarRangeInfo(0.4f, 0f..1f)))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.StateDescription))
        shown = 0.7f
        rule.waitForIdle()
        node().assert(SemanticsMatcher.expectValue(SemanticsProperties.ProgressBarRangeInfo, ProgressBarRangeInfo(0.7f, 0f..1f)))
    }

    @Test
    fun `PRG-9 an indeterminate indicator is a progress bar named by the label, with no value, in the indeterminate state`() {
        setIndicator(value = null)
        node()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.ProgressBarRangeInfo, ProgressBarRangeInfo.Indeterminate))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf(LABEL)))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.StateDescription))
        rule.onRoot().tryPerformAccessibilityChecks()
    }

    @Test
    fun `PRG-10 neither form is focusable, and neither is a live region`() {
        for (v in listOf(0.4f, null)) {
            setIndicator(value = v)
            node()
                .assert(SemanticsMatcher.keyNotDefined(SemanticsActions.RequestFocus))
                .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Focused))
                .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.LiveRegion))
                .assert(SemanticsMatcher.keyNotDefined(SemanticsActions.OnClick))
        }
    }

    // ── PRG-11: out of range ─────────────────────────────────────────────────

    @Test
    fun `PRG-11 a value outside the range is drawn and exposed clamped, and a debuggable app reports it`() = collectingReports { reports ->
        setDebuggable(true)
        setIndicator(value = 1.5f)
        rule.waitForIdle()
        node().assert(SemanticsMatcher.expectValue(SemanticsProperties.ProgressBarRangeInfo, ProgressBarRangeInfo(1f, 0f..1f)))
        assertPixel("drawn full", bar(map(), 0.97f), indicator)
        assertTrue(reports.toString(), reports.any { "TanreiProgressIndicator" in it && "1.5" in it })
        shown = -0.5f
        rule.waitForIdle()
        node().assert(SemanticsMatcher.expectValue(SemanticsProperties.ProgressBarRangeInfo, ProgressBarRangeInfo(0f, 0f..1f)))
        assertPixel("drawn empty", bar(map(), 0.1f), track)
        assertTrue(reports.toString(), reports.any { "-0.5" in it })
    }

    @Test
    fun `PRG-11 a range whose max is not above its min draws the track alone and exposes 0 of 0 to 1, reported`() = collectingReports { reports ->
        setDebuggable(true)
        setIndicator(value = 5f, range = 5f..5f)
        rule.waitForIdle()
        node().assert(SemanticsMatcher.expectValue(SemanticsProperties.ProgressBarRangeInfo, ProgressBarRangeInfo(0f, 0f..1f)))
        val map = map()
        assertPixel("start", bar(map, 0.05f), track)
        assertPixel("end", bar(map, 0.95f), track)
        assertTrue(reports.toString(), reports.any { "TanreiProgressIndicator" in it && "valueRange" in it })
    }

    @Test
    fun `PRG-11 a release-like app clamps silently`() = collectingReports { reports ->
        setDebuggable(false)
        setIndicator(value = 1.5f)
        rule.waitForIdle()
        assertEquals(emptyList<String>(), reports)
    }

    // ── PRG-12: unknown values ───────────────────────────────────────────────

    @Test
    fun `PRG-12 a size the system does not have renders as medium, reported in a debuggable app`() = collectingReports { reports ->
        setDebuggable(true)
        setIndicator(size = TanreiProgressIndicatorSize("huge"))
        rule.waitForIdle()
        node().assertHeightIsEqualTo(tokens.sizes.medium.linearThickness)
        val unknown = map()
        assertTrue(reports.toString(), reports.any { "TanreiProgressIndicator" in it && "size \"huge\"" in it })
        setIndicator(size = TanreiProgressIndicatorSize.Medium)
        assertSame(map(), unknown)
        assertEquals(tokens.sizes.medium, tokens.sizes[TanreiProgressIndicatorSize("huge")])
    }

    @Test
    fun `PRG-12 variant is a closed enum holding exactly the spec's values, linear first - no undefined form can be passed`() {
        val spec = JSONObject(File("../../../specs/progress-indicator.spec.json").readText())
        val props = spec.getJSONArray("props").let { all -> (0 until all.length()).map(all::getJSONObject) }.associateBy { it.getString("name") }
        val values = props.getValue("variant").getJSONArray("values").let { v -> (0 until v.length()).map(v::getString) }
        assertEquals(values, TanreiProgressIndicatorVariant.entries.map { it.name.lowercase() })
        assertEquals("linear", props.getValue("variant").getString("default"))
        assertEquals(listOf("small", "medium", "large"), tokens.sizes.keys.map { it.key })
    }

    // ── PRG-13: right-to-left ────────────────────────────────────────────────

    @Test
    fun `PRG-13 in a right-to-left layout a bar fills from the right`() {
        setIndicator(value = 0.4f, direction = LayoutDirection.Rtl)
        val map = map()
        assertPixel("the right end is done", bar(map, 0.8f), indicator)
        assertPixel("the left is track", bar(map, 0.2f), track)
    }

    @Test
    fun `PRG-13 in a right-to-left layout the indeterminate segment moves from right to left`() {
        setIndicator(value = null, direction = LayoutDirection.Rtl, clockStopped = true)
        val easing = tokens.motionCycleEasing.toEasing()
        rule.mainClock.advanceTimeBy(elapsedUntil(0.25f, tokens.motionCycleDuration.toLong()))
        val start = -SEGMENT + (1f + SEGMENT) * easing.transform(0.25f)
        val middle = start + SEGMENT / 2f
        val map = map()
        assertPixel("the segment, mirrored", bar(map, 1f - middle), indicator)
        if (middle > 0.1f && middle < 0.9f) assertPixel("not on the left-to-right side", bar(map, middle), track)
    }

    @Test
    fun `PRG-13 a ring is not mirrored - it starts at the top and turns clockwise in every direction`() {
        setIndicator(value = 0.4f, variant = TanreiProgressIndicatorVariant.Circular, system = thickRing())
        val ltr = map()
        setIndicator(value = 0.4f, variant = TanreiProgressIndicatorVariant.Circular, system = thickRing(), direction = LayoutDirection.Rtl)
        val rtl = map()
        assertSame(ltr, rtl, tolerance = 2f / 255f)
        assertPixel("clockwise: the right side is done", ring(rtl, 60f, RING_STROKE), indicator)
    }

    // ── PRG-14: off screen ───────────────────────────────────────────────────

    @Test
    fun `PRG-14 off screen the indeterminate animation does not run, and it resumes where it stopped when it is back`() {
        setIndicator(value = null, variant = TanreiProgressIndicatorVariant.Circular, system = thickRing(), clockStopped = true)
        rule.mainClock.advanceTimeBy(elapsedUntil(0.25f, tokens.motionCycleDuration.toLong()))
        val before = map()
        assertPixel("a quarter turn in", ring(before, 135f, RING_STROKE), indicator)
        // Out of the window for half a cycle.
        shift = OUT_OF_WINDOW
        frames(4)
        rule.mainClock.advanceTimeBy(tokens.motionCycleDuration / 2L)
        shift = 0
        frames(3)
        val after = map()
        assertPixel("still about a quarter turn in: it did not run while hidden", ring(after, 135f, RING_STROKE), indicator)
        assertPixel("not where half a cycle more would put it", ring(after, 315f, RING_STROKE), track)
        // And it runs again.
        rule.mainClock.advanceTimeBy(tokens.motionCycleDuration / 2L)
        assertPixel("half a cycle later it has moved on", ring(map(), 315f, RING_STROKE), indicator)
    }

    // ── PRG-15: no label ─────────────────────────────────────────────────────

    @Test
    fun `PRG-15 without a label it still renders, has no name, and a debuggable app reports it once`() = collectingReports { reports ->
        setDebuggable(true)
        setIndicator(label = "")
        rule.waitForIdle()
        assertPixel("drawn", bar(map(), 0.2f), indicator)
        node().assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.ContentDescription))
        assertEquals(reports.toString(), 1, reports.size)
        assertTrue(reports.toString(), "TanreiProgressIndicator" in reports.single() && "contentDescription" in reports.single())
    }

    @Test
    fun `PRG-15 a named indicator reports nothing, nor a nameless one in a release-like app`() = collectingReports { reports ->
        setDebuggable(false)
        setIndicator(label = "")
        rule.waitForIdle()
        setDebuggable(true)
        setIndicator(label = LABEL)
        rule.waitForIdle()
        assertEquals(emptyList<String>(), reports)
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    /** With the clock stopped: publish the test's state writes (nothing else does it here), then run [n] frames. */
    private fun frames(n: Int) {
        Snapshot.sendApplyNotifications()
        repeat(n) { rule.mainClock.advanceTimeByFrame() }
    }

    /** A ring large enough to probe: medium at 48dp with an 8dp stroke, round caps (Tanrei's full shape). */
    private fun thickRing(shape: Dp = tokens.trackShape): TanreiSystem = tanrei.copy(
        progressIndicator = tokens.copy(
            trackShape = shape,
            sizes = tokens.sizes.copy(medium = tokens.sizes.medium.copy(circularSize = 48.dp, circularThickness = RING_STROKE)),
        ),
    )

    /** Clock time to advance, from where the cycle started, to reach [fraction] of a cycle (less what already passed). */
    private var elapsed = 0L

    private fun elapsedUntil(fraction: Float, cycle: Long): Long {
        val target = (fraction * cycle).toLong()
        val step = target - elapsed
        elapsed = target
        return step
    }

    /** Pixel for pixel, up to [tolerance] (anti-aliasing of the same arc may differ by a unit between two positions). */
    private fun assertSame(expected: PixelMap, actual: PixelMap, tolerance: Float = 0f) {
        assertEquals(expected.width, actual.width)
        assertEquals(expected.height, actual.height)
        for (y in 0 until expected.height) for (x in 0 until expected.width) {
            val e = expected[x, y]
            val a = actual[x, y]
            assertTrue("pixel $x,$y: $e vs $a", maxOf(abs(e.red - a.red), abs(e.green - a.green), abs(e.blue - a.blue), abs(e.alpha - a.alpha)) <= tolerance)
        }
    }

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
        const val TAG = "progress"
        const val STAGE = "stage"
        const val LABEL = "Uploading"
        const val SEGMENT = 2f / 5f
        const val PIXEL_TOLERANCE = 3f / 255f
        const val OUT_OF_WINDOW = 100_000
        val STAGE_WIDTH = 200.dp
        val RING_STROKE = 8.dp
    }
}

/**
 * PRG-7 — where motion is reduced. On Android that IS the animator duration scale ("Remove animations" = 0), handed to
 * the composition's effects as [MotionDurationScale]; this rule's composition runs with scale 0.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiProgressIndicatorReducedMotionTest {
    private object NoMotion : MotionDurationScale {
        override val scaleFactor: Float = 0f
    }

    @get:Rule
    val rule = createComposeRule(effectContext = NoMotion)

    private val tanrei = TanreiSystem.Tanrei
    private val colors = tanrei.colors.light
    private val tokens = tanrei.progressIndicator
    private val surface = colors[TanreiColorRole.Surface]
    private val track = colors[TanreiColorRole.SurfaceVariant].compositeOver(surface)
    private val indicator = colors[TanreiColorRole.Primary].compositeOver(surface)

    private var value by mutableFloatStateOf(0.2f)

    private fun set(variant: TanreiProgressIndicatorVariant, determinate: Boolean) {
        rule.mainClock.autoAdvance = false
        rule.setContent {
            TanreiTheme(system = tanrei, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Box(Modifier.background(TanreiColorRole.Surface.color).width(200.dp)) {
                    if (determinate) {
                        TanreiProgressIndicator(progress = { value }, contentDescription = "Uploading", modifier = Modifier.testTag(TAG), variant = variant)
                    } else {
                        TanreiProgressIndicator(contentDescription = "Uploading", modifier = Modifier.testTag(TAG), variant = variant)
                    }
                }
            }
        }
        rule.mainClock.advanceTimeByFrame()
    }

    private fun map() = rule.onNodeWithTag(TAG).captureToImage().toPixelMap()

    private fun bar(map: PixelMap, fraction: Float) = map[(map.width * fraction).toInt(), map.height / 2]

    @Test
    fun `PRG-7 where motion is reduced a value change is shown at once`() {
        set(TanreiProgressIndicatorVariant.Linear, determinate = true)
        value = 0.8f
        // A few frames — far less than value-duration, over which it would still be short of 0.75 with motion.
        Snapshot.sendApplyNotifications()
        repeat(4) { rule.mainClock.advanceTimeByFrame() }
        assertTrue(4 * 16 < tokens.motionValueDuration / 4)
        assertClose("at the new end within a few frames", bar(map(), 0.75f), indicator)
    }

    @Test
    fun `PRG-7 where motion is reduced an indeterminate bar does not move - the whole bar pulses 1 to 0 to 1 per cycle, eased, over a still track`() {
        set(TanreiProgressIndicatorVariant.Linear, determinate = true.not())
        val easing = tokens.motionCycleEasing.toEasing()
        val cycle = tokens.motionCycleDuration.toLong()
        var elapsed = 0L
        for (at in listOf(0f, 0.25f, 0.5f, 0.75f)) {
            val target = (at * cycle).toLong()
            if (target > elapsed) rule.mainClock.advanceTimeBy(target - elapsed)
            elapsed = target
            val alpha = tanreiPulseAlphaExpected(at, easing::transform)
            val expected = lerp(track, indicator, alpha)
            val map = map()
            for (x in listOf(0.1f, 0.5f, 0.9f)) assertClose("at $at, x $x: opacity $alpha", bar(map, x), expected, tolerance = PULSE_TOLERANCE)
        }
    }

    @Test
    fun `PRG-7 where motion is reduced an indeterminate ring is the whole circle, pulsing, and does not turn`() {
        set(TanreiProgressIndicatorVariant.Circular, determinate = false)
        val map = map()
        val stroke = with(rule.density) { tokens.sizes.medium.circularThickness.toPx() }
        // Opacity 1 at the start of a cycle: the top, the bottom, the left and the right of the ring are indicator.
        assertClose("top", map[map.width / 2, (stroke / 2).toInt()], indicator)
        assertClose("bottom", map[map.width / 2, map.height - 1 - (stroke / 2).toInt()], indicator)
        assertClose("left", map[(stroke / 2).toInt(), map.height / 2], indicator)
        assertClose("right", map[map.width - 1 - (stroke / 2).toInt(), map.height / 2], indicator)
        rule.mainClock.advanceTimeBy(tokens.motionCycleDuration / 2L)
        assertClose("half a cycle on: the track alone", map()[map.width / 2, (stroke / 2).toInt()], track, tolerance = PULSE_TOLERANCE)
    }

    private fun tanreiPulseAlphaExpected(phase: Float, ease: (Float) -> Float): Float {
        val half = phase * 2f
        return if (half < 1f) 1f - ease(half) else ease(half - 1f)
    }

    private fun lerp(a: Color, b: Color, t: Float) = Color(a.red + (b.red - a.red) * t, a.green + (b.green - a.green) * t, a.blue + (b.blue - a.blue) * t)

    private fun assertClose(what: String, actual: Color, expected: Color, tolerance: Float = 3f / 255f) =
        assertTrue("$what: expected $expected but was $actual", maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue)) <= tolerance)

    private companion object {
        const val TAG = "progress"
        /** A frame's worth of an eased opacity, and anti-aliasing: the pulse is checked to a few percent. */
        const val PULSE_TOLERANCE = 0.06f
    }
}
