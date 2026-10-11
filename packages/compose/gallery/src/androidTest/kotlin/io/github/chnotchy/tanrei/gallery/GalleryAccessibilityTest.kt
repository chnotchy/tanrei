package io.github.chnotchy.tanrei.gallery

import android.view.KeyEvent
import androidx.activity.ComponentActivity
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.state.ToggleableState
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertIsFocused
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.accessibility.enableAccessibilityChecks
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.requestFocus
import androidx.compose.ui.test.tryPerformAccessibilityChecks
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TestRule
import org.junit.runner.RunWith
import org.junit.runners.model.Statement

/**
 * Runs ON A DEVICE (`./gradlew :gallery:connectedDebugAndroidTest`). Two things the Robolectric tests of the
 * library cannot do:
 *
 * - the Accessibility Test Framework checks run FOR REAL here — under Robolectric ATF does not see Compose's
 *   accessibility nodes and every check reports NOT_RUN. They are errors for the default `tanrei` system.
 *   (Imitation presets are not asserted: Tanrei's accessibility criteria do not apply to them; they are held to
 *   fidelity to the system they imitate.)
 * - a button is activated through the platform's real key-event pipeline (BTN-1), and a disabled one is not (BTN-2).
 */
@RunWith(AndroidJUnit4::class)
class GalleryAccessibilityTest {
    /** Before the activity launches: a window picks up touch mode when it is added, and focus needs keyboard mode. */
    @get:Rule(order = 0)
    val keyboardMode = TestRule { base, _ ->
        object : Statement() {
            override fun evaluate() {
                val instrumentation = InstrumentationRegistry.getInstrumentation()
                instrumentation.setInTouchMode(false)
                try {
                    base.evaluate()
                } finally {
                    instrumentation.setInTouchMode(true)
                }
            }
        }
    }

    @get:Rule(order = 1)
    val rule = createAndroidComposeRule<ComponentActivity>()

    private val system = TanreiSystem.Tanrei
    private val clicks = mutableListOf<String>()
    private lateinit var specs: List<GallerySpec>
    private lateinit var fixtures: List<GalleryFixture>

    @Before
    fun setUp() {
        // From here on every action and every explicit call runs the ATF checks and FAILS the test on an error.
        rule.enableAccessibilityChecks()
        specs = loadGallerySpecs(InstrumentationRegistry.getInstrumentation().targetContext)
        // Every fixture of every component the gallery draws; the key tests below drive Button's and IconButton's.
        fixtures = specs.filter { it.name in GalleryComponents }.flatMap { it.fixtures }
        rule.setContent { Gallery(specs, systems = listOf(system), onFixtureClick = { _, fixture -> clicks += "${fixture.component}/${fixture.id}" }) }
    }

    private fun fixture(component: String, id: String) = fixtures.first { it.component == component && it.id == id }

    private fun button(id: String) = rule.onNodeWithTag(fixtureTag(system, fixture("button", id)))

    private fun iconButton(id: String) = rule.onNodeWithTag(fixtureTag(system, fixture("icon-button", id)))

    @Test
    fun theSpecFixturesAreWhatTheGalleryShows() {
        assertTrue("the specs declare fixtures", fixtures.isNotEmpty())
        for (fixture in fixtures) rule.onNodeWithTag(fixtureTag(system, fixture)).performScrollTo().assertExists()
        for (fixture in fixtures.filter { it.component == "button" || it.component == "icon-button" }) {
            rule.onNodeWithTag(fixtureTag(system, fixture)).assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
        }
    }

    @Test
    fun everyFixtureOfTheDefaultSystemPassesTheAccessibilityChecks() {
        rule.onRoot().tryPerformAccessibilityChecks()
        // Off-screen nodes are not checked: bring each fixture on screen and check again.
        for (fixture in fixtures) {
            rule.onNodeWithTag(fixtureTag(system, fixture)).performScrollTo()
            rule.onRoot().tryPerformAccessibilityChecks()
        }
    }

    /** BTN-1: WHEN the user activates the button by … Enter or Space THE button SHALL emit click exactly once. */
    @Test
    fun btn1_enterAndSpace_throughTheRealKeyPipeline_clickExactlyOnce() {
        button("filled-medium").performScrollTo().requestFocus().assertIsFocused()
        InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(KeyEvent.KEYCODE_ENTER)
        rule.waitForIdle()
        assertEquals(listOf("button/filled-medium"), clicks)
        InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(KeyEvent.KEYCODE_SPACE)
        rule.waitForIdle()
        assertEquals(listOf("button/filled-medium", "button/filled-medium"), clicks)
    }

    /** BTN-2: WHILE disabled … SHALL NOT emit click, SHALL NOT be focusable and SHALL expose the disabled state. */
    @Test
    fun btn2_aDisabledButton_isAnnouncedDisabled_cannotBeFocused_andKeysDoNothing() {
        button("filled-disabled").performScrollTo()
            .assertIsNotEnabled()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Focused))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsActions.RequestFocus))
        InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(KeyEvent.KEYCODE_ENTER)
        rule.waitForIdle()
        assertEquals(emptyList<String>(), clicks)
    }

    /** ICB-1: WHEN the user activates the icon button by … Enter or Space THE icon button SHALL emit click exactly once. */
    @Test
    fun icb1_enterAndSpace_throughTheRealKeyPipeline_clickExactlyOnce() {
        iconButton("filled-medium").performScrollTo().requestFocus().assertIsFocused()
        InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(KeyEvent.KEYCODE_ENTER)
        rule.waitForIdle()
        InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(KeyEvent.KEYCODE_SPACE)
        rule.waitForIdle()
        assertEquals(listOf("icon-button/filled-medium", "icon-button/filled-medium"), clicks)
    }

    /** ICB-2: WHILE disabled … SHALL NOT emit click or change, SHALL NOT be focusable and SHALL expose the disabled state. */
    @Test
    fun icb2_aDisabledIconButton_isAnnouncedDisabled_cannotBeFocused_andKeysDoNothing() {
        iconButton("standard-disabled").performScrollTo()
            .assertIsNotEnabled()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.ContentDescription, listOf("Favorite")))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.Focused))
            .assert(SemanticsMatcher.keyNotDefined(SemanticsActions.RequestFocus))
        InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(KeyEvent.KEYCODE_ENTER)
        rule.waitForIdle()
        assertEquals(emptyList<String>(), clicks)
    }

    /**
     * ICB-11: a toggle is a button with an on / off state, and Enter switches it (and still clicks); a plain icon button
     * has no such state.
     */
    @Test
    fun icb11_aToggle_exposesItsState_andEnterSwitchesIt() {
        iconButton("standard-medium").performScrollTo().assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.ToggleableState))
        iconButton("filled-selected").performScrollTo()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.ToggleableState, ToggleableState.On))
            .requestFocus().assertIsFocused()
        InstrumentationRegistry.getInstrumentation().sendKeyDownUpSync(KeyEvent.KEYCODE_ENTER)
        rule.waitForIdle()
        iconButton("filled-selected").assert(SemanticsMatcher.expectValue(SemanticsProperties.ToggleableState, ToggleableState.Off))
        assertEquals(listOf("icon-button/filled-selected"), clicks)
        rule.onRoot().tryPerformAccessibilityChecks()
    }
}
