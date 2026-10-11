package io.github.chnotchy.tanrei.gallery

import androidx.activity.ComponentActivity
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.accessibility.enableAccessibilityChecks
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.tryPerformAccessibilityChecks
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Guards the guard: a passing accessibility check proves nothing if the checks are inert — which is exactly what
 * happens under Robolectric (every check reports NOT_RUN). On a device an 8dp click target MUST be rejected.
 */
@RunWith(AndroidJUnit4::class)
class AccessibilityChecksAreLiveTest {
    @get:Rule
    val rule = createAndroidComposeRule<ComponentActivity>()

    @Test
    fun aTinyClickTargetIsRejected() {
        rule.enableAccessibilityChecks()
        rule.setContent { Box(Modifier.size(8.dp).clickable {}) }
        val failure = runCatching { rule.onRoot().tryPerformAccessibilityChecks() }.exceptionOrNull()
        assertTrue("the Accessibility Test Framework checks did not run: an 8dp click target passed", failure != null)
        assertTrue("rejected for another reason: $failure", failure.toString().contains("TouchTargetSize") || failure.toString().contains("touch target", ignoreCase = true))
    }
}
