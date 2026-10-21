package io.github.chnotchy.tanrei.tokens

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Structure every shipped system must have, whatever its values: design systems differ in values,
 * never in tokens. The vocabulary itself is enforced by the compiler (all generated constructors take
 * required parameters); what is left to check is the OPEN part — color roles.
 */
class TanreiSystemsTest {
    private val systems = listOf(TanreiSystem.Tanrei, TanreiSystem.M3Like, TanreiSystem.Cupertino)

    /** Roles the hand-written primitives and theme read directly, besides what component tokens name. */
    private val primitiveRoles = setOf(
        TanreiColorRole.Surface,
        TanreiColorRole.OnSurface,
        TanreiColorRole.FocusRing,
        TanreiColorRole.FocusRingInner,
    )

    private fun TanreiSystem.schemes(): Map<String, TanreiColors> = mapOf(
        "light" to colors.light,
        "light-medium" to colors.lightMedium,
        "light-high" to colors.lightHigh,
        "dark" to colors.dark,
        "dark-medium" to colors.darkMedium,
        "dark-high" to colors.darkHigh,
    )

    @Test
    fun `the shipped systems are three distinct systems`() {
        assertEquals(listOf("tanrei", "m3-like", "cupertino"), systems.map { it.id })
    }

    @Test
    fun `every shipped system has an icon style - the default's is Material Symbols Rounded, weight 300, fill 0 unselected and 1 selected, opsz 20 to 48`() {
        val rounded = TanreiFontStack(families = listOf("Material Symbols Rounded"), generic = TanreiGenericFontFamily.SansSerif, system = false)
        assertEquals(TanreiIconStyle(unselected = rounded, selected = rounded, weight = 300, fillUnselected = 0f, fillSelected = 1f, opticalSizeMin = 20f, opticalSizeMax = 48f), TanreiSystem.Tanrei.icon)
        for (system in systems) {
            assertTrue(system.id, system.icon.unselected.families.isNotEmpty() && system.icon.selected.families.isNotEmpty())
            assertEquals(system.id, 0f, system.icon.fill(selected = false))
            assertEquals(system.id, 1f, system.icon.fill(selected = true))
        }
    }

    @Test
    fun `choices of kind are typed values on the system - overlay and ring by default, and what each preset chose`() {
        assertEquals(TanreiBehavior(focusStyle = TanreiFocusStyle.Ring, pressedFeedback = TanreiPressedFeedback.Overlay), TanreiSystem.Tanrei.behavior)
        assertEquals(TanreiPressedFeedback.Ripple, TanreiSystem.M3Like.behavior.pressedFeedback)
        assertEquals(TanreiPressedFeedback.Dim, TanreiSystem.Cupertino.behavior.pressedFeedback)
        assertEquals(listOf("Overlay", "Ripple", "Dim", "None"), TanreiPressedFeedback.entries.map { it.name })
        assertEquals(listOf("Ring", "Glow"), TanreiFocusStyle.entries.map { it.name })
    }

    @Test
    fun `corner smoothing is an amount on shape - 0 by default, 0_6 (the iOS corner) under cupertino`() {
        assertEquals(0f, TanreiSystem.Tanrei.shape.cornerSmoothing)
        assertEquals(0f, TanreiSystem.M3Like.shape.cornerSmoothing)
        assertEquals(0.6f, TanreiSystem.Cupertino.shape.cornerSmoothing)
        for (system in systems) assertTrue(system.id, system.shape.cornerSmoothing in 0f..1f)
    }

    @Test
    fun `emphasis is a weight step per family - 100 everywhere by default, 200 on labels under m3-like`() {
        assertEquals(TanreiTypeEmphasis(body = 100, display = 100, heading = 100, label = 100), TanreiSystem.Tanrei.typescale.emphasis)
        assertEquals(200, TanreiSystem.M3Like.typescale.emphasis.label)
        assertEquals(100, TanreiSystem.M3Like.typescale.emphasis.heading)
        for (system in systems) for (family in TanreiTypeFamily.entries) assertTrue("${system.id}/$family", system.typescale.emphasis[family] > 0)
    }

    @Test
    fun `press-hold is a duration of every system, and level0 draws nothing`() {
        for (system in systems) {
            assertTrue(system.id, system.motion.duration.pressHold > 0)
            assertEquals(system.id, emptyList<TanreiShadowLayer>(), system.elevation.level0)
        }
        assertEquals(100, TanreiSystem.Tanrei.motion.duration.pressHold)
    }

    @Test
    fun `every role a component token or an elevation layer reads exists in all six schemes`() {
        for (system in systems) {
            val referenced = system.referencedRoles()
            assertTrue("${system.id}: components reference roles", referenced.isNotEmpty())
            for ((name, scheme) in system.schemes()) {
                val missing = (referenced + primitiveRoles).filterNot { it in scheme }
                assertTrue("${system.id}/$name lacks $missing", missing.isEmpty())
            }
            // The helper the theme's debug check uses must agree.
            assertEquals("${system.id}: unknownRoles", emptySet<TanreiColorRole>(), system.unknownRoles(alsoRequired = primitiveRoles))
        }
    }

    @Test
    fun `every intent resolves to its four roles in all six schemes`() {
        for (system in systems) {
            assertTrue("${system.id}: declares intents", system.intents.isNotEmpty())
            assertEquals("${system.id}: intents are unique", system.intents.size, system.intents.toSet().size)
            for (intent in system.intents) {
                val four = listOf(intent.key, "on-${intent.key}", "${intent.key}-container", "on-${intent.key}-container").map(::TanreiColorRole)
                for ((name, scheme) in system.schemes()) {
                    val missing = four.filterNot { it in scheme }
                    assertTrue("${system.id}/$name: intent \"$intent\" lacks $missing", missing.isEmpty())
                }
            }
        }
    }

    @Test
    fun `all six schemes of a system define the same roles`() {
        for (system in systems) {
            val schemes = system.schemes()
            val reference = schemes.getValue("light").roles
            for ((name, scheme) in schemes) assertEquals("${system.id}/$name", reference, scheme.roles)
        }
    }

    @Test
    fun `a palette a system declares is an open role key - accent in tanrei, tertiary in m3-like`() {
        val accent = TanreiColorRole("accent")
        val tertiary = TanreiColorRole("tertiary")

        assertTrue(accent in TanreiSystem.Tanrei.intents)
        assertTrue(tertiary in TanreiSystem.M3Like.intents)
        assertTrue("m3-like has no accent palette", accent !in TanreiSystem.M3Like.intents && accent !in TanreiSystem.M3Like.colors.light)
        assertTrue("cupertino declares neither", accent !in TanreiSystem.Cupertino.colors.light && tertiary !in TanreiSystem.Cupertino.colors.light)

        // A declared palette is its own color, not the fallback.
        val m3 = TanreiSystem.M3Like.colors.light
        assertNotEquals(m3[TanreiColorRole.Primary], m3[tertiary])
        val tanrei = TanreiSystem.Tanrei.colors.light
        assertNotEquals(tanrei[TanreiColorRole.Primary], tanrei[accent])

        // A role a scheme never declared falls back to the matching slot of `primary`, so content stays readable.
        val cupertino = TanreiSystem.Cupertino.colors.light
        assertEquals(cupertino[TanreiColorRole.Primary], cupertino[tertiary])
        assertEquals(cupertino[TanreiColorRole.OnPrimary], cupertino[TanreiColorRole("on-tertiary")])
        assertEquals(cupertino[TanreiColorRole.PrimaryContainer], cupertino[TanreiColorRole("tertiary-container")])
        assertEquals(cupertino[TanreiColorRole.OnPrimaryContainer], cupertino[TanreiColorRole("on-tertiary-container")])
    }
}
