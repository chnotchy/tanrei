package io.github.chnotchy.tanrei.primitives

import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.takeOrElse
import androidx.compose.ui.text.TextStyle
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiTextStyle

/**
 * Text that follows the style and content color its container provides
 * ([LocalTanreiTextStyle], [LocalTanreiContentColor]). Wraps by default and never truncates.
 */
@Composable
public fun TanreiText(
    text: String,
    modifier: Modifier = Modifier,
    color: Color = Color.Unspecified,
    style: TextStyle = LocalTanreiTextStyle.current,
) {
    val resolved = color.takeOrElse { style.color.takeOrElse { LocalTanreiContentColor.current } }
    BasicText(text = text, modifier = modifier, style = style.merge(TextStyle(color = resolved)))
}
