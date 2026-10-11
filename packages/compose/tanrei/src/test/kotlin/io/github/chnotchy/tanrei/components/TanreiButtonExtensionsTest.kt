package io.github.chnotchy.tanrei.components

import android.content.Context
import android.content.pm.ApplicationInfo
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.assertHeightIsEqualTo
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.width
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.acme.design.Acme
import com.acme.design.AcmeTokens
import com.acme.design.BrandGlow
import com.acme.design.Danger
import com.acme.design.Size3x
import com.acme.design.danger
import com.acme.design.size3x
import com.acme.design.bouncy
import com.acme.design.space1200
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import io.github.chnotchy.tanrei.theme.TanreiContrast
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.TanreiThemeMode
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiButtonSize
import io.github.chnotchy.tanrei.tokens.TanreiButtonVariant
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import kotlin.math.abs
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.Rule
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * A design system that EXTENDS the vocabulary, end to end: `com.acme.design.TanreiSystemAcme.kt` is what
 * `tanrei build` generates for `packages/tokens-build/test/fixtures/acme.system.json`, compiled here in ANOTHER
 * package than the library, as it would be in a product's module. Regenerate it with
 * `node packages/compose/scripts/generate-acme-fixture.mjs`.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class TanreiButtonExtensionsTest {
    @get:Rule
    val rule = createComposeRule()

    private val acme = TanreiSystem.Acme
    private val tanrei = TanreiSystem.Tanrei

    private fun TanreiSystem.schemes() = listOf(colors.light, colors.lightMedium, colors.lightHigh, colors.dark, colors.darkMedium, colors.darkHigh)

    // ── a value on a component axis ──────────────────────────────────────────

    @Test
    fun `size 3x is large scaled by one and a half, with its block padding overridden`() {
        val size = acme.button.sizes[TanreiButtonSize("3x")]
        assertEquals(60.dp, size.containerHeight)
        assertEquals(24.dp, size.containerPaddingInlineStart)
        assertEquals(24.dp, size.containerPaddingInlineEnd)
        assertEquals(24.dp, size.containerPaddingInlineStartWithIcon)
        assertEquals("overridden under tokens", 16.dp, size.containerPaddingBlock)
        assertEquals("a typescale is not scaled: it is the large size's", acme.button.sizes.large.labelTypescale, size.labelTypescale)

        // The typed accessors and the keyed lookup are one entry; the key stays the plain string.
        assertEquals("3x", TanreiButtonSize.Size3x.key)
        assertEquals(size, acme.button.sizes.size3x)
        assertEquals(size, acme.button.sizes[TanreiButtonSize.Size3x])
        assertEquals(listOf("small", "medium", "large", "3x"), acme.button.sizes.keys.map { it.key })
        // The core sizes are untouched.
        assertEquals(tanrei.button.sizes.copy(), acme.button.sizes.copy(extra = emptyMap()))
    }

    @Test
    fun `variant danger is filled re-pointed at error, and the system's rules valued all of its states`() {
        val danger = acme.button.variants[TanreiButtonVariant("danger")]
        assertEquals(TanreiPaint.Role(TanreiColorRole.Error), danger.enabled.containerColor)
        assertEquals(TanreiPaint.Role(TanreiColorRole.OnError), danger.enabled.labelColor)
        assertEquals(danger, acme.button.variants.danger)
        assertEquals(danger, acme.button.variants[TanreiButtonVariant.Danger])
        assertTrue(TanreiButtonVariant.Danger in acme.button.variants)

        for (scheme in acme.schemes()) {
            val rest = danger.enabled.containerColor.resolve(scheme)
            assertEquals(scheme[TanreiColorRole.Error], rest)
            for ((name, state) in listOf("hovered" to danger.hovered, "pressed" to danger.pressed, "disabled" to danger.disabled)) {
                assertNotEquals("$name differs from rest", rest, state.containerColor.resolve(scheme))
            }
        }
        // Its roles are part of what the system reads, so the debug check for undefined roles covers them.
        assertTrue(TanreiColorRole.OnError in acme.referencedRoles())
        assertEquals(emptySet<TanreiColorRole>(), acme.unknownRoles())
    }

    // ── a step in a series, a color role ─────────────────────────────────────

    @Test
    fun `space1200 is 96 through the typed accessor and through the keyed lookup`() {
        assertEquals(96.dp, acme.space.space1200)
        assertEquals(96.dp, acme.space["space1200"])
        assertEquals(mapOf("space1200" to 96.dp), acme.space.extra)
        assertEquals("core steps are untouched", tanrei.space, acme.space.copy(extra = emptyMap()))
    }

    @Test
    fun `a step accessor never throws - under a system without the step it answers with the declaring system's value, and a debuggable app reports it once`() = collectingReports { reports ->
        TanreiDiagnostics.forgetReportedSteps()
        // `TanreiTheme` tells the diagnostics whether the app is debuggable: a generated accessor has no Context to ask.
        rule.setContent { TanreiTheme(system = tanrei) {} }
        rule.waitForIdle()
        assertEquals(null, tanrei.space["space1200"])
        assertEquals("acme declared the step as 96dp", 96.dp, tanrei.space.space1200)
        assertEquals(96.dp, tanrei.space.space1200)
        assertEquals(reports.toString(), 1, reports.size)
        assertTrue(reports.single(), "space1200" in reports.single() && "\"acme\"" in reports.single())
        // A system that HAS the step reads its own value and reports nothing more.
        assertEquals(120.dp, acme.copy(space = acme.space.copy(extra = mapOf("space1200" to 120.dp))).space.space1200)
        assertEquals(1, reports.size)
    }

    @Test
    fun `an added spring set is a step like any other - acme's bouncy, per scheme, and never a throw under the default system`() = collectingReports { reports ->
        TanreiDiagnostics.forgetReportedSteps()
        rule.setContent { TanreiTheme(system = tanrei) {} }
        rule.waitForIdle()
        assertEquals(0.5f, acme.motion.standardSpring.bouncy.damping)
        assertEquals(0.4f, acme.motion.expressiveSpring.bouncy.damping)
        assertEquals(500f, acme.motion.expressiveSpring.bouncy.stiffness)
        assertEquals(acme.motion.standardSpring.bouncy, acme.motion.standardSpring["bouncy"])
        assertEquals(setOf("bouncy"), acme.motion.standardSpring.extra.keys)
        assertEquals("core springs are untouched", tanrei.motion.standardSpring, acme.motion.standardSpring.copy(extra = emptyMap()))
        assertEquals(emptyList<String>(), reports)
        // The default system has no such spring: each set answers with acme's spring of ITS scheme.
        assertEquals(null, tanrei.motion.standardSpring["bouncy"])
        assertEquals(acme.motion.standardSpring.bouncy, tanrei.motion.standardSpring.bouncy)
        assertEquals(acme.motion.expressiveSpring.bouncy, tanrei.motion.expressiveSpring.bouncy)
        assertEquals(reports.toString(), 1, reports.size)
        assertTrue(reports.single(), "bouncy" in reports.single())
    }

    @Test
    fun `a release-like app answers a missing step silently`() = collectingReports { reports ->
        TanreiDiagnostics.forgetReportedSteps()
        val info = ApplicationProvider.getApplicationContext<Context>().applicationInfo
        info.flags = info.flags and ApplicationInfo.FLAG_DEBUGGABLE.inv()
        rule.setContent { TanreiTheme(system = tanrei) {} }
        rule.waitForIdle()
        assertEquals(96.dp, tanrei.space.space1200)
        assertEquals(emptyList<String>(), reports)
    }

    @Test
    fun `the role brand-glow resolves in all six schemes`() {
        assertEquals("brand-glow", TanreiColorRole.BrandGlow.key)
        for (scheme in acme.schemes()) {
            assertTrue(TanreiColorRole.BrandGlow in scheme)
            assertNotEquals("its own color, not the fallback", scheme[TanreiColorRole.Primary], scheme[TanreiColorRole.BrandGlow])
        }
        assertNotEquals("it follows the scheme", acme.colors.light[TanreiColorRole.BrandGlow], acme.colors.dark[TanreiColorRole.BrandGlow])
        assertTrue(TanreiColorRole.BrandGlow !in tanrei.colors.light)
    }

    // ── the layer's own tokens ───────────────────────────────────────────────

    @Test
    fun `acme's own tokens are a typed object outside TanreiSystem, and their colors follow the scheme`() {
        val rating = AcmeTokens.Acme.rating
        assertEquals(20.dp, rating.starSize)
        assertEquals(acme.space.space50, rating.gap)
        assertEquals(acme.colors.light[TanreiColorRole.Warning], rating.starColor.resolve(acme.colors.light))
        assertEquals(acme.colors.dark[TanreiColorRole.Warning], rating.starColor.resolve(acme.colors.dark))
        assertNotEquals(rating.starColor.resolve(acme.colors.light), rating.starColor.resolve(acme.colors.dark))
    }

    // ── rendering ────────────────────────────────────────────────────────────

    private fun setButtons(system: TanreiSystem) {
        rule.setContent {
            TanreiTheme(system = system, theme = TanreiThemeMode.Light, contrast = TanreiContrast.Standard) {
                Column(Modifier.background(TanreiColorRole.Surface.color)) {
                    TanreiButton(text = LABEL, onClick = {}, modifier = Modifier.testTag(ADDED), variant = TanreiButtonVariant.Danger, size = TanreiButtonSize.Size3x)
                    TanreiButton(text = LABEL, onClick = {}, modifier = Modifier.testTag(LARGE), size = TanreiButtonSize.Large)
                    TanreiButton(text = LABEL, onClick = {}, modifier = Modifier.testTag(DEFAULT))
                }
            }
        }
    }

    private fun collectingReports(block: (List<String>) -> Unit) {
        val info = ApplicationProvider.getApplicationContext<Context>().applicationInfo
        info.flags = info.flags or ApplicationInfo.FLAG_DEBUGGABLE
        val reports = mutableListOf<String>()
        val previous = TanreiDiagnostics.reporter
        TanreiDiagnostics.reporter = { reports += it }
        try {
            block(reports)
        } finally {
            TanreiDiagnostics.reporter = previous
        }
    }

    @Test
    fun `a button with size 3x and variant danger draws the added values, and a debuggable app has nothing to report`() = collectingReports { reports ->
        setButtons(acme)
        val size = acme.button.sizes.size3x
        val added = rule.onNodeWithTag(ADDED)
        // 60dp is taller than the 48dp minimum target, so the node IS the container.
        added.assertHeightIsEqualTo(60.dp)
        // Same label and typescale as large: the width differs by the inline padding alone, 2 × (24 − 16).
        val delta = added.getUnclippedBoundsInRoot().width - rule.onNodeWithTag(LARGE).getUnclippedBoundsInRoot().width
        val expected = size.containerPaddingInlineStart + size.containerPaddingInlineEnd - acme.button.sizes.large.containerPaddingInlineStart - acme.button.sizes.large.containerPaddingInlineEnd
        assertEquals(16.dp, expected)
        assertTrue("width delta $delta", abs((delta - expected).value) <= DP_TOLERANCE)

        val map = added.captureToImage().toPixelMap()
        val probe = with(rule.density) { map[(size.containerPaddingInlineStart / 2).roundToPx(), 30.dp.roundToPx()] }
        assertClose(acme.colors.light[TanreiColorRole.Error], probe)
        assertEquals(emptyList<String>(), reports)
    }

    @Test
    fun `BTN-7 the added values under a system that does not have them draw as the default, and are reported`() = collectingReports { reports ->
        setButtons(tanrei)
        val added = rule.onNodeWithTag(ADDED).captureToImage().toPixelMap()
        val default = rule.onNodeWithTag(DEFAULT).captureToImage().toPixelMap()
        assertEquals(default.width, added.width)
        assertEquals(default.height, added.height)
        for (y in 0 until default.height) for (x in 0 until default.width) assertEquals("pixel $x,$y", default[x, y], added[x, y])
        assertEquals(reports.toString(), 2, reports.size)
        assertTrue(reports.toString(), reports.any { "size \"3x\"" in it } && reports.any { "variant \"danger\"" in it })
    }

    private fun assertClose(expected: Color, actual: Color) {
        val delta = maxOf(abs(expected.red - actual.red), abs(expected.green - actual.green), abs(expected.blue - actual.blue))
        assertTrue("expected $expected but was $actual", delta <= PIXEL_TOLERANCE)
    }

    private companion object {
        const val ADDED = "added"
        const val LARGE = "large"
        const val DEFAULT = "default"
        const val LABEL = "Delete"
        const val DP_TOLERANCE = 0.5f
        const val PIXEL_TOLERANCE = 2f / 255f
    }
}
