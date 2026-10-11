package io.github.chnotchy.tanrei.gallery

import androidx.compose.ui.test.assertTextContains
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/** The app as a person opens it: every fixture under every shipped system, and the two switches work. */
@RunWith(AndroidJUnit4::class)
class GalleryActivityTest {
    @get:Rule
    val rule = createAndroidComposeRule<GalleryActivity>()

    @Test
    fun everyFixtureOfEveryRegisteredComponentIsShownUnderEveryShippedSystem() {
        val specs = loadGallerySpecs(rule.activity)
        val drawn = specs.filter { it.name in GalleryComponents }
        assertTrue("the gallery draws at least one component", drawn.isNotEmpty())
        for (system in ShippedSystems) for (spec in drawn) for (fixture in spec.fixtures) {
            rule.onNodeWithTag(fixtureTag(system, fixture)).performScrollTo().assertExists()
        }
    }

    @Test
    fun everyRegistryEntryIsASpec_andMapsExactlyItsProps() {
        val specs = loadGallerySpecs(rule.activity).associateBy { it.name }
        for ((name, component) in GalleryComponents) {
            val spec = specs[name]
            assertNotNull("the gallery registers '$name', but there is no specs/$name.spec.json", spec)
            assertEquals("'$name' maps its spec's props", spec!!.props, component.props)
        }
    }

    @Test
    fun theTagsAreUniqueAcrossComponentsAndSystems() {
        val specs = loadGallerySpecs(rule.activity).filter { it.name in GalleryComponents }
        val tags = ShippedSystems.flatMap { system -> specs.flatMap { spec -> spec.fixtures.map { fixtureTag(system, it) } } }
        assertEquals(tags.size, tags.toSet().size)
        for (tag in tags) assertTrue(tag, tag.split('/').size == 3)
    }

    @Test
    fun theThemeAndContrastSwitchesCycle() {
        rule.onNodeWithTag(ThemeSwitchTag).assertTextContains("Theme: System").performClick().assertTextContains("Theme: Light").performClick().assertTextContains("Theme: Dark")
        rule.onNodeWithTag(ContrastSwitchTag).assertTextContains("Contrast: Standard").performClick().assertTextContains("Contrast: Medium").performClick().assertTextContains("Contrast: High")
    }
}
