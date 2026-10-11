package io.github.chnotchy.tanrei.theme

import androidx.compose.runtime.ProvidableCompositionLocal
import androidx.compose.runtime.compositionLocalWithComputedDefaultOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import io.github.chnotchy.tanrei.tokens.TanreiColorRole

/**
 * The color a container asks its content (text, icons) to use. Components set it; slots read it.
 * The default follows the current scheme: `on-surface`.
 */
public val LocalTanreiContentColor: ProvidableCompositionLocal<Color> =
    compositionLocalWithComputedDefaultOf { LocalTanreiColors.currentValue[TanreiColorRole.OnSurface] }

/** The text style a container asks its text content to use. The default is the current system's `body` (`p`). */
public val LocalTanreiTextStyle: ProvidableCompositionLocal<TextStyle> =
    compositionLocalWithComputedDefaultOf {
        LocalTanreiSystem.currentValue.typescale.body.toTextStyle(LocalTanreiFontFamilies.currentValue)
    }
