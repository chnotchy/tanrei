package io.github.chnotchy.tanrei.tokens

import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The axis shape is how tokens are ADDRESSED, not what they are worth. Every value the flat
 * members name (`containerHeightMedium`, `labelTypescale`, `iconSize`, `button.filled` …) is pinned here
 * against its address (`sizes.medium.containerHeight`, `variants.filled` …), for every shipped system.
 */
class TanreiAxesTest {
    /** height, padding-block, padding-inline (start = end = start-with-icon in every shipped system). */
    private class Flat(val height: Dp, val block: Dp, val inline: Dp)

    private val before = mapOf(
        TanreiSystem.Tanrei to mapOf("small" to Flat(32.dp, 6.dp, 12.dp), "medium" to Flat(36.dp, 6.dp, 14.dp), "large" to Flat(40.dp, 6.dp, 16.dp)),
        TanreiSystem.M3Like to mapOf("small" to Flat(32.dp, 6.dp, 12.dp), "medium" to Flat(40.dp, 6.dp, 16.dp), "large" to Flat(56.dp, 6.dp, 24.dp)),
        TanreiSystem.Cupertino to mapOf("small" to Flat(28.dp, 4.dp, 10.dp), "medium" to Flat(34.dp, 6.dp, 12.dp), "large" to Flat(50.dp, 6.dp, 20.dp)),
    )

    @Test
    fun `every flat size value equals the axis value, in every shipped system`() {
        for ((system, sizes) in before) {
            for ((key, flat) in sizes) {
                val size = system.button.sizes[TanreiButtonSize(key)]
                val where = "${system.id}/$key"
                assertEquals(where, flat.height, size.containerHeight)
                assertEquals(where, flat.block, size.containerPaddingBlock)
                assertEquals(where, flat.inline, size.containerPaddingInlineStart)
                assertEquals(where, flat.inline, size.containerPaddingInlineEnd)
                assertEquals(where, flat.inline, size.containerPaddingInlineStartWithIcon)
                // `label.typescale` and `icon.size` were ONE token each before they joined the size axis. cupertino now
                // uses the axis: its small button carries Apple's Subheadline (an added step), the others Body (`label`).
                val label = if (system.id == "cupertino" && key == "small") system.typescale["body-subhead"] else system.typescale.label
                assertEquals(where, label, size.labelTypescale)
                // m3-like pins the reference's 18dp button icon (tokens/fidelity/m3-like.fidelity.json).
                assertEquals(where, if (system.id == "m3-like") 18.dp else 16.dp, size.iconSize)
                // `container.gap` and `outline.width` were ONE flat token each (`button.containerGap`, `button.outlineWidth`)
                // before they joined the size axis: 8 and 1 in these systems, now the same at every size.
                assertEquals(where, 8.dp, size.containerGap)
                assertEquals(where, 1.dp, size.outlineWidth)
            }
        }
        assertEquals(36.dp, TanreiSystem.Tanrei.button.sizes.medium.containerHeight)
    }

    @Test
    fun `named members and keyed lookups are the same tokens`() {
        for (system in before.keys) {
            val sizes = system.button.sizes
            assertEquals(listOf(sizes.small, sizes.medium, sizes.large), listOf(TanreiButtonSize.Small, TanreiButtonSize.Medium, TanreiButtonSize.Large).map { sizes[it] })
            val variants = system.button.variants
            assertEquals(
                listOf(variants.filled, variants.tonal, variants.elevated, variants.outlined, variants.text),
                listOf(TanreiButtonVariant.Filled, TanreiButtonVariant.Tonal, TanreiButtonVariant.Elevated, TanreiButtonVariant.Outlined, TanreiButtonVariant.Text).map { variants[it] },
            )
            assertTrue("${system.id}: does not extend the axes", sizes.extra.isEmpty() && variants.extra.isEmpty())
        }
    }

    @Test
    fun `m3-expressive-like adds two sizes to the axis and revalues all five`() {
        val sizes = TanreiSystem.M3ExpressiveLike.button.sizes
        assertEquals(listOf("small", "medium", "large", "xsmall", "xlarge"), sizes.keys.map { it.key })
        assertEquals(setOf(TanreiButtonSize.Xsmall, TanreiButtonSize.Xlarge), sizes.extra.keys)
        assertTrue(TanreiSystem.M3ExpressiveLike.button.variants.extra.isEmpty())
        val order = listOf(sizes.xsmall, sizes.small, sizes.medium, sizes.large, sizes.xlarge)
        assertEquals(listOf(32.dp, 40.dp, 56.dp, 96.dp, 136.dp), order.map { it.containerHeight })
        assertEquals(listOf(20.dp, 20.dp, 24.dp, 32.dp, 40.dp), order.map { it.iconSize })
        assertEquals(listOf(8.dp, 8.dp, 8.dp, 12.dp, 16.dp), order.map { it.containerGap })
        assertEquals(listOf(1.dp, 1.dp, 1.dp, 2.dp, 3.dp), order.map { it.outlineWidth })
        // The systems that do not have these sizes read the default value there, like the component does.
        assertEquals(TanreiSystem.M3Like.button.sizes.medium, TanreiSystem.M3Like.button.sizes.xlarge)
    }

    @Test
    fun `the default system's variants kept their resting paints`() {
        val variants = TanreiSystem.Tanrei.button.variants
        assertEquals(TanreiPaint.Role(TanreiColorRole.Primary), variants.filled.enabled.containerColor)
        assertEquals(TanreiPaint.Role(TanreiColorRole.OnPrimary), variants.filled.enabled.labelColor)
        assertEquals(TanreiPaint.Role(TanreiColorRole.SurfaceContainerLowest), variants.elevated.enabled.containerColor)
        assertEquals(TanreiSystem.Tanrei.elevation.level2, variants.elevated.enabled.containerElevation)
        assertEquals(TanreiPaint.None, variants.outlined.enabled.containerColor)
        assertEquals(TanreiPaint.Role(TanreiColorRole.Outline), variants.outlined.enabled.outlineColor)
        assertEquals(TanreiPaint.None, variants.text.enabled.containerColor)
        assertEquals(TanreiPaint.None, variants.text.enabled.outlineColor)
    }

    @Test
    fun `a series keeps its named steps and gains a keyed lookup`() {
        val system = TanreiSystem.Tanrei
        assertEquals(system.space.space200, system.space["space200"])
        assertEquals(system.shape.small, system.shape["small"])
        assertEquals(system.typescale.label, system.typescale["label"])
        assertEquals(system.typescale.heading1, system.typescale["heading-1"])
        assertEquals(system.elevation.level2, system.elevation["level2"])
        assertEquals(system.motion.duration.short3, system.motion.duration["short3"])
        assertEquals(system.measure.targetTouch, system.measure["target-touch"])
        assertNull("a step this system does not have", system.space["space1200"])
        assertTrue(system.space.extra.isEmpty())
    }

    @Test
    fun `spring sets are a series like the others - named core springs, extra for added ones, a keyed lookup, and their scheme`() {
        val motion = TanreiSystem.Tanrei.motion
        assertEquals("standard", motion.standardSpring.scheme)
        assertEquals("expressive", motion.expressiveSpring.scheme)
        assertEquals(motion.standardSpring.defaultSpatial, motion.standardSpring["default-spatial"])
        assertEquals(null, motion.standardSpring["snappy"])
        val snappy = motion.standardSpring.fastEffects.copy(stiffness = 900f)
        val extended = motion.standardSpring.copy(extra = mapOf("snappy" to snappy))
        assertEquals(snappy, extended["snappy"])
        assertEquals("core springs are untouched", motion.standardSpring, extended.copy(extra = emptyMap()))
    }

    /** Complexity is paid only by those who extend. */
    @Test
    fun `the generated values of a system without extensions carry no trace of the feature`() {
        val files = File(GENERATED_DIR).listFiles { file -> file.name.startsWith("TanreiSystem") && file.name.endsWith(".kt") }.orEmpty()
        assertEquals(listOf("TanreiSystemCupertino.kt", "TanreiSystemM3ExpressiveLike.kt", "TanreiSystemM3Like.kt", "TanreiSystemTanrei.kt"), files.map { it.name }.sorted())
        // m3-like extends the vocabulary with the roles its reference publishes (`primary-fixed` …) and two display
        // sizes, m3-expressive-like (which extends m3-like) with two sizes on top, cupertino with Apple's three extra
        // text styles: they pay, the default system does not.
        val extending = setOf("TanreiSystemM3Like.kt", "TanreiSystemM3ExpressiveLike.kt", "TanreiSystemCupertino.kt")
        assertTrue(files.first { it.name == "TanreiSystemM3Like.kt" }.readText().contains("TanreiColorRole.Companion.PrimaryFixed"))
        assertTrue(files.first { it.name == "TanreiSystemM3Like.kt" }.readText().contains("TanreiTypescale.displayLarge"))
        assertTrue(files.first { it.name == "TanreiSystemCupertino.kt" }.readText().contains("TanreiTypescale.bodyCallout"))
        // One package, one declaration: the file of a system that extends another declares only what IT added.
        val expressive = files.first { it.name == "TanreiSystemM3ExpressiveLike.kt" }.readText()
        assertTrue(expressive.contains("TanreiButtonSize.Companion.Xlarge"))
        assertFalse("inherited accessors stay in m3-like's file", expressive.contains("TanreiColorRole.Companion.PrimaryFixed"))
        for (file in files.filter { it.name !in extending }) {
            val text = file.readText()
            // `extraLarge` (a corner) and `extraLong1` (a duration) are core step names, not the `extra` map.
            assertFalse("${file.name} mentions extra", Regex("""\bextra\b""").containsMatchIn(text))
            assertFalse("${file.name} mentions extensions", text.contains("extension", ignoreCase = true))
            assertFalse("${file.name} carries a section of vocabulary additions", text.contains("Added to the vocabulary"))
            assertFalse("${file.name} mentions acme", text.contains("acme", ignoreCase = true))
        }
    }

    private companion object {
        // Relative to the module directory, which is the working directory of Gradle unit tests.
        const val GENERATED_DIR = "src/main/kotlin/io/github/chnotchy/tanrei/tokens"
    }
}
