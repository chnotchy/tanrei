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
 * against its address (`sizes.medium.containerHeight`, `variants.filled` …), for every shipped system: the systems
 * whose sizes kept the flat values in [before], m3-like (which re-valued and extended the axis) in its own test.
 */
class TanreiAxesTest {
    /** height, padding-block, padding-inline (start = end = start-with-icon in every shipped system). */
    private class Flat(val height: Dp, val block: Dp, val inline: Dp)

    private val before = mapOf(
        TanreiSystem.Tanrei to mapOf("small" to Flat(32.dp, 6.dp, 12.dp), "medium" to Flat(36.dp, 6.dp, 14.dp), "large" to Flat(40.dp, 6.dp, 16.dp)),
        TanreiSystem.Cupertino to mapOf("small" to Flat(28.dp, 4.dp, 10.dp), "medium" to Flat(34.dp, 6.dp, 12.dp), "large" to Flat(50.dp, 6.dp, 20.dp)),
    )

    private val shipped = listOf(TanreiSystem.Tanrei, TanreiSystem.M3Like, TanreiSystem.Cupertino)

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
                assertEquals(where, 16.dp, size.iconSize)
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
        for (system in shipped) {
            val sizes = system.button.sizes
            assertEquals(listOf(sizes.small, sizes.medium, sizes.large), listOf(TanreiButtonSize.Small, TanreiButtonSize.Medium, TanreiButtonSize.Large).map { sizes[it] })
            val variants = system.button.variants
            assertEquals(
                listOf(variants.filled, variants.tonal, variants.elevated, variants.outlined, variants.text),
                listOf(TanreiButtonVariant.Filled, TanreiButtonVariant.Tonal, TanreiButtonVariant.Elevated, TanreiButtonVariant.Outlined, TanreiButtonVariant.Text).map { variants[it] },
            )
            assertTrue("${system.id}: does not extend the variants", variants.extra.isEmpty())
            // m3-like extends the size axis (its own test, below); the others do not.
            if (system != TanreiSystem.M3Like) assertTrue("${system.id}: does not extend the sizes", sizes.extra.isEmpty())
        }
    }

    @Test
    fun `m3-like adds two sizes to the axis and revalues all five`() {
        val system = TanreiSystem.M3Like
        val sizes = system.button.sizes
        assertEquals(listOf("small", "medium", "large", "xsmall", "xlarge"), sizes.keys.map { it.key })
        assertEquals(setOf(TanreiButtonSize.Xsmall, TanreiButtonSize.Xlarge), sizes.extra.keys)
        val order = listOf(sizes.xsmall, sizes.small, sizes.medium, sizes.large, sizes.xlarge)
        assertEquals(listOf(32.dp, 40.dp, 56.dp, 96.dp, 136.dp), order.map { it.containerHeight })
        // Leading and trailing padding are the same with and without an icon, at every size.
        for (size in order) {
            assertEquals(size.containerPaddingInlineStart, size.containerPaddingInlineEnd)
            assertEquals(size.containerPaddingInlineStart, size.containerPaddingInlineStartWithIcon)
            assertEquals(size.containerPaddingInlineStart, size.containerPaddingInlineEndWithIcon)
        }
        assertEquals(listOf(16.dp, 16.dp, 24.dp, 48.dp, 64.dp), order.map { it.containerPaddingInlineStart })
        assertEquals(listOf(20.dp, 20.dp, 24.dp, 32.dp, 40.dp), order.map { it.iconSize })
        assertEquals(listOf(20.dp, 24.dp, 24.dp, 32.dp, 40.dp), order.map { it.iconSizeWithoutLabel })
        assertEquals(listOf(8.dp, 8.dp, 8.dp, 12.dp, 16.dp), order.map { it.containerGap })
        assertEquals(listOf(1.dp, 1.dp, 1.dp, 2.dp, 3.dp), order.map { it.outlineWidth })
        assertEquals(listOf(4.dp, 4.dp, 12.dp, 16.dp, 32.dp), order.map { it.containerPaddingInlineNarrow })
        assertEquals(listOf(40.dp, 52.dp, 72.dp, 128.dp, 184.dp), order.map { it.containerWidthWide })
        val typescale = system.typescale
        assertEquals(listOf(typescale.label, typescale.label, typescale.heading5, typescale.heading3, typescale.heading1), order.map { it.labelTypescale })
        // The systems that do not have these sizes read the default value there, like the component does.
        for (other in listOf(TanreiSystem.Tanrei, TanreiSystem.Cupertino)) {
            assertEquals(other.id, other.button.sizes.medium, other.button.sizes.xlarge)
            assertEquals(other.id, other.button.sizes.medium, other.button.sizes.xsmall)
        }
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
        assertEquals(listOf("TanreiSystemCupertino.kt", "TanreiSystemM3Like.kt", "TanreiSystemTanrei.kt"), files.map { it.name }.sorted())
        // m3-like extends the vocabulary with the roles its reference publishes (`primary-fixed` …), two display sizes
        // and two button sizes, cupertino with Apple's three extra text styles: they pay, the default system does not.
        val extending = setOf("TanreiSystemM3Like.kt", "TanreiSystemCupertino.kt")
        val m3 = files.first { it.name == "TanreiSystemM3Like.kt" }.readText()
        assertTrue(m3.contains("TanreiColorRole.Companion.PrimaryFixed"))
        assertTrue(m3.contains("TanreiTypescale.displayLarge"))
        assertTrue(m3.contains("TanreiButtonSize.Companion.Xlarge"))
        assertTrue(files.first { it.name == "TanreiSystemCupertino.kt" }.readText().contains("TanreiTypescale.bodyCallout"))
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
