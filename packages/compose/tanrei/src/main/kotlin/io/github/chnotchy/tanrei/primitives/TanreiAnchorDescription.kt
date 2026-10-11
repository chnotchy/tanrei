package io.github.chnotchy.tanrei.primitives

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ProvidableCompositionLocal
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription

/**
 * The accessible description a decorating component (a badge, BDG-8) adds to the anchor it wraps: what assistive
 * technology reads after the anchor's own name ("Inbox, button, 3 unread"). Null: nothing to add.
 *
 * Why a local: Compose merges semantics into the nearest node that merges its descendants, and a control (a button)
 * is such a node itself — a description set on a WRAPPER around a control never reaches the control's announcement.
 * So the wrapper hands the description down, and a Tanrei control that is the anchor puts it on its own node
 * ([tanreiAnchorDescription]); inside its content the local is reset, so a nested control does not repeat it.
 */
internal val LocalTanreiAnchorDescription: ProvidableCompositionLocal<String?> = compositionLocalOf { null }

/**
 * A Tanrei control's semantics for the description of the component decorating it ([LocalTanreiAnchorDescription]):
 * its `stateDescription`, read after its name and role. Nothing when there is none. Goes with the control's other
 * semantics, on the node that merges them.
 */
@Composable
internal fun Modifier.tanreiAnchorDescription(): Modifier {
    val description = LocalTanreiAnchorDescription.current ?: return this
    return semantics { stateDescription = description }
}

/** [content] without the anchor description: what a control composes inside itself, so it is announced once. */
@Composable
internal fun WithoutTanreiAnchorDescription(content: @Composable () -> Unit) {
    CompositionLocalProvider(LocalTanreiAnchorDescription provides null, content)
}
