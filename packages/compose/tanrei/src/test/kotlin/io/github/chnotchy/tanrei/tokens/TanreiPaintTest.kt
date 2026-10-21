package io.github.chnotchy.tanrei.tokens

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.compositeOver
import io.github.chnotchy.tanrei.primitives.TanreiDiagnostics
import kotlin.math.abs
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Paint evaluation: component colors are described without a scheme and resolved against the current
 * one. The math must equal CSS `color-mix(in srgb)` (`mixColors` in packages/token-engine/src/states.js).
 */
class TanreiPaintTest {
    private val system = TanreiSystem.Tanrei
    private val light = system.colors.light
    private val dark = system.colors.dark

    private val primary = TanreiPaint.Role(TanreiColorRole.Primary)
    private val onPrimary = TanreiPaint.Role(TanreiColorRole.OnPrimary)

    // ── per-scheme paints ─────────────────

    private val perScheme = TanreiPaint.Scheme(
        light = primary,
        lightMedium = TanreiPaint.Role(TanreiColorRole.Secondary),
        lightHigh = TanreiPaint.Literal(Color.Black),
        dark = TanreiPaint.Role(TanreiColorRole.Error),
        darkMedium = TanreiPaint.None,
        darkHigh = TanreiPaint.Literal(Color.White),
    )

    @Test
    fun `a per-scheme paint is the paint of the scheme the colors belong to - all six`() {
        val schemes = system.colors
        assertEquals(schemes.light[TanreiColorRole.Primary], perScheme.resolve(schemes.light))
        assertEquals(schemes.lightMedium[TanreiColorRole.Secondary], perScheme.resolve(schemes.lightMedium))
        assertEquals(Color.Black, perScheme.resolve(schemes.lightHigh))
        assertEquals(schemes.dark[TanreiColorRole.Error], perScheme.resolve(schemes.dark))
        assertEquals(Color.Transparent, perScheme.resolve(schemes.darkMedium))
        assertEquals(Color.White, perScheme.resolve(schemes.darkHigh))
        for (scheme in TanreiScheme.entries) assertEquals(perScheme.of(scheme).resolve(schemes[scheme]), perScheme.resolve(schemes[scheme]))
    }

    @Test
    fun `every generated scheme knows which scheme it is, and a copy stays that scheme`() {
        for (shipped in listOf(TanreiSystem.Tanrei, TanreiSystem.M3Like, TanreiSystem.Cupertino)) {
            for (scheme in TanreiScheme.entries) assertEquals("${shipped.id} ${scheme.key}", scheme, shipped.colors[scheme].scheme)
        }
        val changed = dark.copy(TanreiColorRole.Primary to Color.Red)
        assertEquals(TanreiScheme.Dark, changed.scheme)
        assertEquals(system.colors.dark[TanreiColorRole.Error], perScheme.resolve(changed))
        assertTrue("the same roles in another scheme are other colors", TanreiColors(TanreiScheme.Light, emptyMap()) != TanreiColors(TanreiScheme.Dark, emptyMap()))
    }

    @Test
    fun `a per-scheme paint composes - a mix and an alpha of it follow the scheme too`() {
        val hovered = TanreiPaint.Mix(base = perScheme, with = onPrimary, amount = 0.08f)
        assertClose(TanreiPaint.Mix(primary, onPrimary, 0.08f).resolve(light), hovered.resolve(light))
        assertClose(TanreiPaint.Mix(TanreiPaint.Role(TanreiColorRole.Error), onPrimary, 0.08f).resolve(dark), hovered.resolve(dark))
        assertClose(dark[TanreiColorRole.Error].copy(alpha = 0.5f), TanreiPaint.Alpha(of = perScheme, amount = 0.5f).resolve(dark))
    }

    @Test
    fun `a per-scheme paint reads the roles of every scheme - the unknown-role check sees them all`() {
        assertEquals(setOf(TanreiColorRole.Primary, TanreiColorRole.Secondary, TanreiColorRole.Error), perScheme.roles())
        val tokens = system.button
        val filled = tokens.variants.filled
        val unknown = TanreiPaint.Scheme(primary, primary, primary, TanreiPaint.Role(TanreiColorRole("nobody-declared-this")), primary, primary)
        val reading = system.copy(button = tokens.copy(variants = tokens.variants.copy(filled = filled.copy(pressed = filled.pressed.copy(containerColor = unknown)))))
        assertEquals(setOf(TanreiColorRole("nobody-declared-this")), reading.unknownRoles())
    }

    @Test
    fun `a role resolves against the scheme it is given`() {
        assertEquals(light[TanreiColorRole.Primary], primary.resolve(light))
        assertEquals(dark[TanreiColorRole.Primary], primary.resolve(dark))
        assertTrue("the schemes differ", primary.resolve(light) != primary.resolve(dark))
    }

    @Test
    fun `mixing two opaque colors is what a state-layer overlay composites - light and dark`() {
        for (colors in listOf(light, dark)) {
            val amount = system.state.hoverStateLayerOpacity
            val mixed = TanreiPaint.Mix(base = primary, with = onPrimary, amount = amount).resolve(colors)
            val overlay = colors[TanreiColorRole.OnPrimary].copy(alpha = amount).compositeOver(colors[TanreiColorRole.Primary])
            assertClose(overlay, mixed)
            assertEquals(1f, mixed.alpha)
        }
    }

    @Test
    fun `mix interpolates premultiplied - the same numbers as color-mix in srgb`() {
        // mixColors({1,0,0,1}, {0,0,1,0.5}, 0.5): a = .75, r = .5/.75, b = .25/.75
        val mixed = TanreiPaint.Mix(
            base = TanreiPaint.Literal(Color(red = 1f, green = 0f, blue = 0f, alpha = 1f)),
            with = TanreiPaint.Literal(Color(red = 0f, green = 0f, blue = 1f, alpha = 0.5f)),
            amount = 0.5f,
        ).resolve(light)
        assertClose(Color(red = 0.5f / 0.75f, green = 0f, blue = 0.25f / 0.75f, alpha = 0.75f), mixed)
    }

    @Test
    fun `mixing into nothing is the other color at that amount - light and dark`() {
        for (colors in listOf(light, dark)) {
            val mixed = TanreiPaint.Mix(base = TanreiPaint.None, with = TanreiPaint.Role(TanreiColorRole.OnSurface), amount = 0.08f).resolve(colors)
            assertClose(colors[TanreiColorRole.OnSurface].copy(alpha = 0.08f), mixed)
        }
        assertEquals(Color.Transparent, TanreiPaint.Mix(TanreiPaint.None, TanreiPaint.None, 0.5f).resolve(light))
    }

    @Test
    fun `the mix amount is clamped to 0 and 1`() {
        assertClose(light[TanreiColorRole.Primary], TanreiPaint.Mix(primary, onPrimary, -1f).resolve(light))
        assertClose(light[TanreiColorRole.OnPrimary], TanreiPaint.Mix(primary, onPrimary, 2f).resolve(light))
    }

    @Test
    fun `alpha multiplies the alpha the color already has - light and dark`() {
        for (colors in listOf(light, dark)) {
            val onSurface = colors[TanreiColorRole.OnSurface]
            assertEquals(onSurface.copy(alpha = 0.38f), TanreiPaint.Alpha(of = TanreiPaint.Role(TanreiColorRole.OnSurface), amount = 0.38f).resolve(colors))
        }
        val half = TanreiPaint.Alpha(of = TanreiPaint.Alpha(of = primary, amount = 0.5f), amount = 0.5f).resolve(light)
        assertEquals(0.25f, half.alpha, ALPHA_STEP)
    }

    @Test
    fun `none draws nothing and a literal ignores the scheme`() {
        assertEquals(Color.Transparent, TanreiPaint.None.resolve(light))
        assertEquals(Color.Transparent, TanreiPaint.None.resolve(dark))
        val literal = TanreiPaint.Literal(Color(0xFF123456))
        assertEquals(literal.resolve(light), literal.resolve(dark))
    }

    @Test
    fun `a paint reports the roles it reads`() {
        val paint = TanreiPaint.Mix(base = primary, with = TanreiPaint.Alpha(of = onPrimary, amount = 0.5f), amount = 0.1f)
        assertEquals(setOf(TanreiColorRole.Primary, TanreiColorRole.OnPrimary), paint.roles())
        assertEquals(emptySet<TanreiColorRole>(), TanreiPaint.None.roles())
    }

    // ── open-ended roles ─────────────────────────────────────────────────────

    @Test
    fun `a role another system declares is just another key`() {
        val tertiary = TanreiColorRole("tertiary")
        val colors = light.copy(tertiary to Color(0xFF7D5260))
        assertTrue(tertiary in colors)
        assertEquals(Color(0xFF7D5260), TanreiPaint.Role(tertiary).resolve(colors))
        assertEquals(light[TanreiColorRole.Primary], colors[TanreiColorRole.Primary])
    }

    @Test
    fun `an unknown role falls back to the matching primary slot`() {
        assertEquals(light[TanreiColorRole.Primary], light[TanreiColorRole("tertiary")])
        assertEquals(light[TanreiColorRole.OnPrimary], light[TanreiColorRole("on-tertiary")])
        assertEquals(light[TanreiColorRole.PrimaryContainer], light[TanreiColorRole("tertiary-container")])
        assertEquals(light[TanreiColorRole.OnPrimaryContainer], light[TanreiColorRole("on-tertiary-container")])
    }

    @Test
    fun `the debug check names roles a system reads but does not define`() {
        assertEquals(emptySet<TanreiColorRole>(), system.unknownRoles())

        val tertiary = TanreiColorRole("tertiary")
        val filled = system.button.variants.filled
        val reading = system.copy(
            button = system.button.copy(variants = system.button.variants.copy(filled = filled.copy(hovered = filled.hovered.copy(containerColor = TanreiPaint.Role(tertiary))))),
        )
        assertEquals(setOf(tertiary), reading.unknownRoles())

        // Defined in one scheme only is still unknown in the others.
        val partly = reading.copy(colors = reading.colors.copy(light = light.copy(tertiary to Color.Red)))
        assertEquals(setOf(tertiary), partly.unknownRoles())
    }

    @Test
    fun `a role a scheme does not have falls back to the primary slot and, in a debuggable app, is reported once per scheme - never a marker color`() {
        val reports = mutableListOf<String>()
        val previous = TanreiDiagnostics.reporter
        TanreiDiagnostics.reporter = { reports += it }
        TanreiDiagnostics.forgetReportedSteps()
        val wasDebuggable = TanreiDiagnostics.debuggable
        try {
            // A release build renders the fallback silently.
            TanreiDiagnostics.debuggable = false
            assertEquals(light[TanreiColorRole.Primary], light[TanreiColorRole("tertiary")])
            assertEquals(emptyList<String>(), reports)

            // A debuggable app reports the role once per scheme, and the color is still the primary slot.
            TanreiDiagnostics.debuggable = true
            assertEquals(light[TanreiColorRole.Primary], light[TanreiColorRole("tertiary")])
            assertEquals(light[TanreiColorRole.OnPrimary], light[TanreiColorRole("on-tertiary")])
            assertEquals(light[TanreiColorRole.PrimaryContainer], light[TanreiColorRole("tertiary-container")])
            assertEquals(light[TanreiColorRole.OnPrimaryContainer], light[TanreiColorRole("on-tertiary-container")])
            assertEquals(light[TanreiColorRole.Primary], light[TanreiColorRole("tertiary")])
            assertEquals(reports.toString(), 4, reports.size)
            assertTrue(reports[0], "\"tertiary\"" in reports[0] && "\"primary\"" in reports[0] && "light" in reports[0])
            assertTrue(reports[1], "\"on-tertiary\"" in reports[1] && "\"on-primary\"" in reports[1])
            // The same role in another scheme is another report; a known role never reports.
            assertEquals(dark[TanreiColorRole.Primary], dark[TanreiColorRole("tertiary")])
            assertEquals(5, reports.size)
            assertTrue("dark" in reports[4])
            for (role in light.roles) light[role]
            assertEquals("a known role never reports", 5, reports.size)

            // Without even `primary` (a hand-built scheme) the lookup draws nothing, not a marker color.
            val bare = TanreiColors(TanreiScheme.Light, mapOf(TanreiColorRole.Surface to Color.White))
            assertEquals(Color.Transparent, bare[TanreiColorRole("tertiary")])
            assertEquals(Color.White, bare[TanreiColorRole.Surface])
        } finally {
            TanreiDiagnostics.debuggable = wasDebuggable
            TanreiDiagnostics.reporter = previous
            TanreiDiagnostics.forgetReportedSteps()
        }
    }

    @Test
    fun `every intent of the default system is a full set of four roles`() {
        for (intent in system.intents) {
            for (key in listOf(intent.key, "on-${intent.key}", "${intent.key}-container", "on-${intent.key}-container")) {
                assertTrue("$key is defined", TanreiColorRole(key) in light)
            }
        }
    }

    private fun assertClose(expected: Color, actual: Color) {
        val delta = listOf(expected.red - actual.red, expected.green - actual.green, expected.blue - actual.blue, expected.alpha - actual.alpha).maxOf { abs(it) }
        assertTrue("expected $expected but was $actual", delta <= CHANNEL_STEP)
    }

    private companion object {
        // Compose stores sRGB colors with 8 bits per channel.
        const val CHANNEL_STEP = 1.5f / 255f
        const val ALPHA_STEP = 1f / 255f
    }
}
