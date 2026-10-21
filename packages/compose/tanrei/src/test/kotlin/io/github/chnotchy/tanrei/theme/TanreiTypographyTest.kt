package io.github.chnotchy.tanrei.theme

import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import io.github.chnotchy.tanrei.tokens.Cupertino
import io.github.chnotchy.tanrei.tokens.M3Like
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiFontStack
import io.github.chnotchy.tanrei.tokens.TanreiGenericFontFamily
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import io.github.chnotchy.tanrei.tokens.TanreiTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiTypeFamily
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Font stacks arrive already read: named families, a generic class, and whether the platform's own font
 * comes first. Nothing here parses a CSS keyword, and no system's fonts are bundled.
 */
class TanreiTypographyTest {
    private val systems = listOf(TanreiSystem.Tanrei, TanreiSystem.M3Like, TanreiSystem.Cupertino)

    @Test
    fun `the default system's stacks - named families in order, the generic class, no CSS keyword left`() {
        val tanrei = TanreiSystem.Tanrei
        val text = TanreiFontStack(families = listOf("Inter", "Noto Sans JP", "Noto Sans"), generic = TanreiGenericFontFamily.SansSerif, system = false)
        val code = TanreiFontStack(families = listOf("Roboto Mono", "Noto Sans JP"), generic = TanreiGenericFontFamily.Monospace, system = false)
        assertEquals(text, tanrei.typefaces.brand)
        assertEquals(text, tanrei.typefaces.plain)
        assertEquals(code, tanrei.typefaces.mono)
        assertEquals(listOf("Material Symbols Rounded"), tanrei.typefaces.icon.families)
        assertEquals(text, tanrei.typescale.label.font)
        assertEquals(code, tanrei.typescale.code.font)
        val keywords = setOf("system-ui", "-apple-system", "blinkmacsystemfont", "ui-monospace", "ui-sans-serif", "ui-serif", "sans-serif", "serif", "monospace")
        for (system in systems) {
            val stacks = with(system.typefaces) { listOf(brand, plain, mono, icon) } + system.typescale.body.font + system.typescale.codeSmall.font
            for (stack in stacks) assertTrue("${system.id}: $stack", stack.families.none { it.lowercase() in keywords })
        }
    }

    @Test
    fun `cupertino asks for the platform's own font first`() {
        val cupertino = TanreiSystem.Cupertino
        assertTrue(cupertino.typefaces.plain.system)
        assertEquals(listOf("Inter"), cupertino.typefaces.plain.families)
        assertTrue(cupertino.typefaces.mono.system)
        assertEquals(TanreiGenericFontFamily.Monospace, cupertino.typefaces.mono.generic)
        assertFalse(TanreiSystem.Tanrei.typefaces.plain.system)
    }

    @Test
    fun `without bundled fonts, text styles use the platform default and code styles stay monospaced - in every system`() {
        for (system in systems) {
            val scale = system.typescale
            for (style in listOf(scale.label, scale.body, scale.heading4, scale.display, scale.eyebrow)) {
                assertEquals("${system.id}: ${style.font}", FontFamily.Default, style.toTextStyle(TanreiFontFamilies.PlatformDefault).fontFamily)
            }
            for (style in listOf(scale.code, scale.codeSmall)) {
                assertEquals("${system.id}: ${style.font}", FontFamily.Monospace, style.toTextStyle(TanreiFontFamilies.PlatformDefault).fontFamily)
            }
        }
    }

    @Test
    fun `a named family the app bundles wins over the platform font - unless the stack puts the platform's own font first`() {
        val bundled = FontFamily.Serif
        val families = TanreiFontFamilies { font -> bundled.takeIf { "Roboto Mono" in font.families || "Inter" in font.families } }
        assertEquals(bundled, TanreiSystem.M3Like.typescale.code.toTextStyle(families).fontFamily)
        assertEquals(bundled, TanreiSystem.Tanrei.typescale.body.toTextStyle(families).fontFamily)
        // cupertino names Inter too, but AFTER the platform's own font: the platform font is what it gets.
        assertEquals(FontFamily.Default, TanreiSystem.Cupertino.typescale.body.toTextStyle(families).fontFamily)
        assertEquals(FontFamily.Monospace, TanreiSystem.Cupertino.typescale.code.toTextStyle(families).fontFamily)
    }

    @Test
    fun `the generic class picks the platform font`() {
        fun stack(generic: TanreiGenericFontFamily) = TanreiFontStack(families = emptyList(), generic = generic, system = false)
        assertEquals(FontFamily.Default, stack(TanreiGenericFontFamily.SansSerif).platformFontFamily)
        assertEquals(FontFamily.Serif, stack(TanreiGenericFontFamily.Serif).platformFontFamily)
        assertEquals(FontFamily.Monospace, stack(TanreiGenericFontFamily.Monospace).platformFontFamily)
        assertEquals(FontFamily.Cursive, stack(TanreiGenericFontFamily.Cursive).platformFontFamily)
    }

    // ── sixteen roles by level, emphasis as a weight step ──────────

    @Test
    fun `the type scale has the sixteen roles by level - h1 to h6, p and small among them - in every system`() {
        val roles = listOf("display", "heading-1", "heading-2", "heading-3", "heading-4", "heading-5", "heading-6", "body-large", "body", "body-small", "label", "label-small", "caption", "code", "code-small", "eyebrow")
        for (system in systems) {
            val scale = system.typescale
            for (role in roles) assertTrue("${system.id}: $role", scale[role] != null)
            assertEquals("${system.id}: h1", scale.heading1, scale["heading-1"])
            assertEquals("${system.id}: p", scale.body, scale["body"])
            assertEquals("${system.id}: small", scale.bodySmall, scale["body-small"])
            // Every family is monotonic in size, and where a heading and a body role share a size the heading weighs more.
            val headings = listOf(scale.heading1, scale.heading2, scale.heading3, scale.heading4, scale.heading5, scale.heading6)
            assertTrue("${system.id}: headings shrink", headings.zipWithNext().all { (a, b) -> a.size.value >= b.size.value })
            assertTrue("${system.id}: body shrinks", scale.bodyLarge.size.value >= scale.body.size.value && scale.body.size.value >= scale.bodySmall.size.value)
            assertTrue("${system.id}: labels shrink", scale.label.size.value >= scale.labelSmall.size.value && scale.labelSmall.size.value >= scale.caption.size.value)
            // No emphasized twin: the old names are gone from the keyed lookup.
            assertTrue("${system.id}: no twins", scale["heading-1-emphasized"] == null && scale["body-emphasized"] == null)
        }
        // The default keeps the old look: h1 is 32 / 500, p is 14 / 400.
        assertEquals(32.sp, TanreiSystem.Tanrei.typescale.heading1.size)
        assertEquals(500, TanreiSystem.Tanrei.typescale.heading1.weight)
        assertEquals(14.sp, TanreiSystem.Tanrei.typescale.body.size)
        assertEquals(400, TanreiSystem.Tanrei.typescale.body.weight)
    }

    @Test
    fun `every role knows its family - the first name segment, with caption, code and eyebrow in the label family`() {
        for (system in systems) {
            val scale = system.typescale
            assertEquals(TanreiTypeFamily.Display, scale.display.family)
            for (h in listOf(scale.heading1, scale.heading2, scale.heading3, scale.heading4, scale.heading5, scale.heading6)) assertEquals(TanreiTypeFamily.Heading, h.family)
            for (b in listOf(scale.bodyLarge, scale.body, scale.bodySmall)) assertEquals(TanreiTypeFamily.Body, b.family)
            for (l in listOf(scale.label, scale.labelSmall, scale.caption, scale.code, scale.codeSmall, scale.eyebrow)) assertEquals(TanreiTypeFamily.Label, l.family)
            for ((key, added) in scale.extra) assertEquals("${system.id}: $key", TanreiTypeFamily.valueOf(key.substringBefore("-").replaceFirstChar { it.uppercase() }.let { if (it == "Caption") "Label" else it }), added.family)
        }
    }

    @Test
    fun `emphasized adds the family's weight step and changes nothing else - heading-1 600 by default, a label 700 under m3-like`() {
        val tanrei = TanreiSystem.Tanrei
        val heading = tanrei.typescale.heading1.emphasized(tanrei.typescale.emphasis)
        assertEquals(600, heading.weight)
        assertEquals(tanrei.typescale.heading1, heading.copy(weight = tanrei.typescale.heading1.weight))
        assertEquals(500, tanrei.typescale.body.emphasized(tanrei.typescale.emphasis).weight)
        val m3 = TanreiSystem.M3Like
        assertEquals(500, m3.typescale.label.weight)
        assertEquals(700, m3.typescale.label.emphasized(m3.typescale.emphasis).weight)
        assertEquals(m3.typescale.heading1.weight + 100, m3.typescale.heading1.emphasized(m3.typescale.emphasis).weight)
        // The step is the family's, whichever role asks: caption and code take the label step.
        assertEquals(m3.typescale.caption.weight + 200, m3.typescale.caption.emphasized(m3.typescale.emphasis).weight)
        assertEquals(m3.typescale.code.weight + 200, m3.typescale.code.emphasized(m3.typescale.emphasis).weight)
        // A Compose TextStyle of it carries the heavier weight, clamped to the font axis.
        assertEquals(FontWeight(700), m3.typescale.label.emphasized(m3.typescale.emphasis).toTextStyle(TanreiFontFamilies.PlatformDefault).fontWeight)
        val heavy: TanreiTextStyle = tanrei.typescale.display.copy(weight = 950)
        assertEquals(FontWeight(1000), heavy.emphasized(tanrei.typescale.emphasis).toTextStyle(TanreiFontFamilies.PlatformDefault).fontWeight)
    }
}
