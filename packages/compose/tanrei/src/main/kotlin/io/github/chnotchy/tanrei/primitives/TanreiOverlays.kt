package io.github.chnotchy.tanrei.primitives

import android.view.MotionEvent
import android.view.View
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.platform.LocalView

/**
 * How many Tanrei modal dialogs are open in the app now (a snapshot state). A modal dialog covers everything under it,
 * so what waits for the page to be visible reads it: a snackbar host pauses its timeout (SNK-9) and holds back a
 * snackbar not yet shown (SNK-12) while one is open. The dialog counts itself in while it is shown.
 */
internal object TanreiModalDialogs {
    var open: Int by mutableIntStateOf(0)
        private set

    fun opened() {
        open += 1
    }

    fun closed() {
        open = (open - 1).coerceAtLeast(0)
    }
}

/**
 * Inside a `Popup`'s content: hears a press outside the popup before the popup does — the popup's window view gets a
 * press outside its bounds as a press on itself, which is how it dismisses. When [onOutsidePress] takes it (answers true;
 * it is given the press's position on the screen) the popup never hears it: a press on the control that opened an
 * operated overlay toggles it instead of closing it (a split button's trailing half, SPB-16; a FAB menu's toggle,
 * FBM-15).
 */
@Composable
internal fun TanreiPopupOutsidePress(onOutsidePress: (Offset) -> Boolean) {
    val view = LocalView.current
    val take by rememberUpdatedState(onOutsidePress)
    DisposableEffect(view) {
        val window = view.parent as? View
        window?.setOnTouchListener { v, event ->
            val down = event.actionMasked == MotionEvent.ACTION_DOWN
            val outside = down && (event.x < 0f || event.y < 0f || event.x >= v.width || event.y >= v.height)
            if (!outside) return@setOnTouchListener false
            val location = IntArray(2).also { v.getLocationOnScreen(it) }
            take(Offset(event.x + location[0], event.y + location[1]))
        }
        onDispose { window?.setOnTouchListener(null) }
    }
}
