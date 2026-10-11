package io.github.chnotchy.tanrei.theme

import android.content.pm.ApplicationInfo
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import io.github.chnotchy.tanrei.tokens.M3Like
import io.github.chnotchy.tanrei.tokens.Tanrei
import io.github.chnotchy.tanrei.tokens.TanreiColorRole
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiSystem
import io.github.chnotchy.tanrei.tokens.TanreiTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiTypeFamily
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.GraphicsMode

/** The theme provides ONE system instance; everything a component reads comes from it. */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class TanreiThemeTest {
    @get:Rule
    val rule = createComposeRule()

    private val tanrei = TanreiSystem.Tanrei

    @Test
    fun `the theme provides the system, its scheme and the defaults derived from them`() {
        val product = tanrei.copy(id = "product", shape = tanrei.shape.copy(small = 2.dp))
        var tokens: TanreiSystem? = null
        var content: Color? = null
        var primary: Color? = null
        rule.setContent {
            TanreiTheme(system = product, theme = TanreiThemeMode.Dark, contrast = TanreiContrast.High) {
                tokens = TanreiTheme.tokens
                content = LocalTanreiContentColor.current
                primary = TanreiPaint.Role(TanreiColorRole.Primary).color
            }
        }
        rule.waitForIdle()
        assertEquals(product, tokens)
        assertEquals(product.colors.darkHigh[TanreiColorRole.OnSurface], content)
        assertEquals(product.colors.darkHigh[TanreiColorRole.Primary], primary)
    }

    @Test
    fun `the default text style is the system's body - p - and emphasized() reads the current system's steps`() {
        var body: TanreiTextStyle? = null
        var defaultStyle: androidx.compose.ui.text.TextStyle? = null
        var heading1: TanreiTextStyle? = null
        var label: TanreiTextStyle? = null
        rule.setContent {
            TanreiTheme(system = TanreiSystem.M3Like) {
                body = TanreiTheme.tokens.typescale.body
                defaultStyle = LocalTanreiTextStyle.current
                heading1 = TanreiTheme.tokens.typescale.heading1.emphasized()
                label = TanreiTheme.tokens.typescale.label.emphasized()
            }
        }
        rule.waitForIdle()
        assertEquals(body!!.size, defaultStyle!!.fontSize)
        assertEquals(FontWeight(body!!.weight), defaultStyle!!.fontWeight)
        // m3-like: +100 on headings, +200 on labels (Material's emphasized twins), read from the theme's system.
        assertEquals(TanreiSystem.M3Like.typescale.heading1.weight + 100, heading1!!.weight)
        assertEquals(TanreiSystem.M3Like.typescale.label.weight + 200, label!!.weight)
        assertEquals(TanreiSystem.M3Like.typescale.label.emphasized(TanreiSystem.M3Like.typescale.emphasis), label)
    }

    @Test
    fun `outside a theme the defaults follow the default system instead of a fixed token`() {
        var tokens: TanreiSystem? = null
        var content: Color? = null
        rule.setContent {
            tokens = TanreiTheme.tokens
            content = LocalTanreiContentColor.current
        }
        rule.waitForIdle()
        assertEquals(tanrei, tokens)
        assertEquals(tanrei.colors.light[TanreiColorRole.OnSurface], content)
    }

    @Test
    fun `select picks one of the six schemes`() {
        val schemes = tanrei.colors
        assertEquals(schemes.light, schemes.select(dark = false))
        assertEquals(schemes.dark, schemes.select(dark = true))
        assertEquals(schemes.lightMedium, schemes.select(dark = false, contrast = TanreiContrast.Medium))
        assertEquals(schemes.darkMedium, schemes.select(dark = true, contrast = TanreiContrast.Medium))
        assertEquals(schemes.lightHigh, schemes.select(dark = false, contrast = TanreiContrast.High))
        assertEquals(schemes.darkHigh, schemes.select(dark = true, contrast = TanreiContrast.High))
    }

    @Test
    fun `a debuggable app fails fast on a system that reads a role it never defines`() {
        val info = ApplicationProvider.getApplicationContext<android.content.Context>().applicationInfo
        info.flags = info.flags or ApplicationInfo.FLAG_DEBUGGABLE
        val filled = tanrei.button.variants.filled
        val broken = tanrei.copy(
            button = tanrei.button.copy(
                variants = tanrei.button.variants.copy(
                    filled = filled.copy(enabled = filled.enabled.copy(containerColor = TanreiPaint.Role(TanreiColorRole("tertiary")))),
                ),
            ),
        )
        val failure = assertThrows(IllegalStateException::class.java) {
            rule.setContent { TanreiTheme(system = broken) {} }
            rule.waitForIdle()
        }
        assertTrue(failure.message, failure.message.orEmpty().contains("tertiary"))
    }
}
