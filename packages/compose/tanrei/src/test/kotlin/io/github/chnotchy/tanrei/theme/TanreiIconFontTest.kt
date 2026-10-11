package io.github.chnotchy.tanrei.theme

import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.unit.dp
import com.acme.design.Acme
import io.github.chnotchy.tanrei.tokens.Cupertino
import io.github.chnotchy.tanrei.tokens.M3ExpressiveLike
import io.github.chnotchy.tanrei.tokens.M3Like
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiFontStack
import io.github.chnotchy.tanrei.tokens.TanreiGenericFontFamily
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * The icon style rule: an icon set is a font family per selection state plus a weight and two fills —
 * token values, turned into "how this glyph is drawn" by ONE helper, [glyph]. Tested under the default system (a
 * variable font: one family, the FILL axis tells the states apart) and under the `acme` fixture (a static set:
 * two families, the axes are harmless).
 */
class TanreiIconFontTest {
    private val icon = TanreiSystem.Tanrei.icon

    private fun FontVariation.Settings.axes(): Map<String, Float> = settings.associate { it.axisName to it.toVariationValue(null) }

    private fun set(name: String) = TanreiFontStack(families = listOf(name), generic = TanreiGenericFontFamily.SansSerif, system = false)

    @Test
    fun `every shipped system names its icon set - Rounded at 300 by default, Outlined at 400 for the m3-like presets`() {
        for (system in listOf(TanreiSystem.Tanrei, TanreiSystem.Cupertino)) {
            assertEquals(system.id, set("Material Symbols Rounded"), system.icon.family(selected = false))
            assertEquals(system.id, set("Material Symbols Rounded"), system.icon.family(selected = true))
            assertEquals(system.id, 300, system.icon.weight)
        }
        for (system in listOf(TanreiSystem.M3Like, TanreiSystem.M3ExpressiveLike)) {
            assertEquals(system.id, set("Material Symbols Outlined"), system.icon.family(selected = false))
            assertEquals(system.id, set("Material Symbols Outlined"), system.icon.family(selected = true))
            assertEquals(system.id, 400, system.icon.weight)
        }
    }

    @Test
    fun `default system - one variable family for both states, and the fill tells them apart`() {
        val size = TanreiSystem.Tanrei.measure.iconMedium
        val unselected = icon.glyph(size, selected = false)
        val selected = icon.glyph(size, selected = true)
        assertEquals(TanreiIconGlyph(family = set("Material Symbols Rounded"), fill = 0f, weight = 300, opticalSize = size.value, grade = 0), unselected)
        assertEquals(TanreiIconGlyph(family = set("Material Symbols Rounded"), fill = 1f, weight = 300, opticalSize = size.value, grade = 0), selected)
        assertEquals(unselected.family, selected.family)
    }

    @Test
    fun `acme, a static icon set - the FAMILY tells the states apart, and the axes are still delivered`() {
        val acme = TanreiSystem.Acme.icon
        val size = TanreiSystem.Acme.measure.iconMedium
        val unselected = acme.glyph(size, selected = false)
        val selected = acme.glyph(size, selected = true)
        assertEquals(TanreiIconGlyph(family = set("Material Icons Outlined"), fill = 0f, weight = 400, opticalSize = size.value, grade = 0), unselected)
        assertEquals(TanreiIconGlyph(family = set("Material Icons"), fill = 1f, weight = 400, opticalSize = size.value, grade = 0), selected)
        // A static font ignores variation settings; delivering them is harmless and keeps one code path.
        assertEquals(mapOf("FILL" to 1f, "wght" to 400f, "opsz" to size.value, "GRAD" to 0f), selected.variationSettings.axes())
    }

    @Test
    fun `selected draws with fill 1 and unselected with fill 0`() {
        assertEquals(1f, icon.fill(selected = true))
        assertEquals(0f, icon.fill(selected = false))
        assertEquals(1f, icon.variationSettings(24.dp, selected = true).axes()["FILL"])
        assertEquals(0f, icon.variationSettings(24.dp, selected = false).axes()["FILL"])
    }

    @Test
    fun `the axes are FILL, wght, opsz and GRAD 0, and nothing else`() {
        val axes = icon.variationSettings(TanreiSystem.Tanrei.measure.iconLarge, selected = false).axes()
        assertEquals(mapOf("FILL" to 0f, "wght" to 300f, "opsz" to TanreiSystem.Tanrei.measure.iconLarge.value, "GRAD" to 0f), axes)
        assertEquals(axes, icon.glyph(TanreiSystem.Tanrei.measure.iconLarge, selected = false).variationSettings.axes())
    }

    @Test
    fun `the optical size is the icon box, clamped to the default system's 20 to 48 (sys icon optical-size)`() {
        assertEquals(20f, icon.opticalSizeMin)
        assertEquals(48f, icon.opticalSizeMax)
        fun opsz(size: Float) = icon.glyph(size.dp, selected = false).opticalSize
        assertEquals(20f, opsz(16f))
        assertEquals(20f, opsz(20f))
        assertEquals(24f, opsz(24f))
        assertEquals(40f, opsz(40f))
        assertEquals(48f, opsz(48f))
        assertEquals(48f, opsz(96f))
    }

    @Test
    fun `the optical size range is the system's - a system whose icon font draws 8 to 96 clamps to that range`() {
        // `sys.icon.optical-size.*`: the range is a fact of the icon font the system names, so it travels with it.
        val wide = icon.copy(opticalSizeMin = 8f, opticalSizeMax = 96f)
        fun opsz(size: Float) = wide.glyph(size.dp, selected = false).opticalSize
        assertEquals(8f, opsz(4f))
        assertEquals(8f, opsz(8f))
        assertEquals(16f, opsz(16f))
        assertEquals(64f, opsz(64f))
        assertEquals(96f, opsz(96f))
        assertEquals(96f, opsz(128f))
        assertEquals(16f, wide.variationSettings(16.dp, selected = false).axes()["opsz"])
        // The default system's font (20–48) would have drawn the 16dp box at 20 and the 64dp box at 48.
        assertEquals(20f, icon.glyph(16.dp, selected = false).opticalSize)
        assertEquals(48f, icon.glyph(64.dp, selected = false).opticalSize)
    }

    @Test
    fun `the values come from the system - a revalued icon style changes the glyph`() {
        val heavy = icon.copy(selected = set("My Icons Filled"), weight = 500, fillUnselected = 0.25f, fillSelected = 0.75f)
        assertEquals(500f, heavy.variationSettings(24.dp, selected = true).axes()["wght"])
        assertEquals(0.75f, heavy.variationSettings(24.dp, selected = true).axes()["FILL"])
        assertEquals(0.25f, heavy.variationSettings(24.dp, selected = false).axes()["FILL"])
        assertEquals(set("My Icons Filled"), heavy.glyph(24.dp, selected = true).family)
        assertEquals(set("Material Symbols Rounded"), heavy.glyph(24.dp, selected = false).family)
    }
}
