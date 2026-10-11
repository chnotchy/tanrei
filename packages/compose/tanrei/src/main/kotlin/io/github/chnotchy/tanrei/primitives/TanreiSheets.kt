package io.github.chnotchy.tanrei.primitives

import android.view.View
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.node.RootForTest
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsNode
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.semantics.getOrNull
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.window.DialogWindowProvider

/*
 * What the two sheets (`specs/bottom-sheet.spec.json`, `specs/side-sheet.spec.json`) share on Compose: the window a modal
 * sheet is presented in, and the focus a standard sheet — a layout region in the product's own window —
 * hands back when it closes.
 */

/**
 * A modal sheet's window, as `TanreiDialog` and the modal navigation drawer present theirs: a `Dialog`
 * window over the whole window, edge to edge, with the window's own dim and animation off (Tanrei draws the scrim and
 * the motion). The window keeps focus inside it and gives it back to the window under it when it goes; that window is
 * hidden from assistive technology while it is open, and it counts as a modal dialog (a snackbar host waits for it).
 * [onBack] is the platform's back, heard only while [backEnabled].
 */
@Composable
internal fun TanreiModalSheetWindow(onBack: () -> Unit, backEnabled: Boolean, content: @Composable () -> Unit) {
    val behind = LocalView.current
    DisposableEffect(behind) {
        val before = behind.importantForAccessibility
        behind.importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
        TanreiModalDialogs.opened()
        onDispose {
            behind.importantForAccessibility = before
            TanreiModalDialogs.closed()
        }
    }
    Dialog(
        onDismissRequest = onBack,
        properties = DialogProperties(dismissOnBackPress = backEnabled, dismissOnClickOutside = false, usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
    ) {
        val window = (LocalView.current.parent as? DialogWindowProvider)?.window
        SideEffect {
            window?.setDimAmount(0f)
            window?.setWindowAnimations(0)
        }
        content()
    }
}

/**
 * The element that had focus when a standard sheet opened, so that the sheet can hand focus back to it when it closes
 * (BSH-3, SSH-3). A modal sheet does not need it: its window gives focus back by itself. A standard sheet
 * is placed by the product beside or over content it does not wrap, so no `focusRestorer` of its own can reach that
 * element; Compose has no public way to ask which node has focus either, so it is read from the window's semantics
 * tree — every `AndroidComposeView` is a [RootForTest] whose `semanticsOwner` is public (as `TanreiRadioButton` reads
 * its group) — and focus goes back through the node's own `RequestFocus`
 * action.
 */
internal class TanreiFocusReturn {
    var root: RootForTest? = null
    private var focused: Int? = null

    /** Remembers the node that has focus now (none: nothing is handed back). */
    fun capture() {
        focused = root?.semanticsOwner?.unmergedRootSemanticsNode?.find { it.config.getOrNull(SemanticsProperties.Focused) == true }?.id
    }

    /** Hands focus back to the remembered node; false when it is gone or cannot take focus. */
    fun restore(): Boolean {
        val id = focused ?: return false
        focused = null
        val node = root?.semanticsOwner?.unmergedRootSemanticsNode?.find { it.id == id } ?: return false
        val request = node.config.getOrNull(SemanticsActions.RequestFocus)?.action ?: return false
        return request()
    }
}

/** A [TanreiFocusReturn] reading this composition's window. */
@Composable
internal fun rememberTanreiFocusReturn(): TanreiFocusReturn {
    val view = LocalView.current
    return remember { TanreiFocusReturn() }.also { it.root = view as? RootForTest }
}

/** The first node, depth first, that [matches]. */
private fun SemanticsNode.find(matches: (SemanticsNode) -> Boolean): SemanticsNode? {
    if (matches(this)) return this
    for (child in children) child.find(matches)?.let { return it }
    return null
}
