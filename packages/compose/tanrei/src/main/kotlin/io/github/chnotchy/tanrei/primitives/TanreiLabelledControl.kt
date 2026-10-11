package io.github.chnotchy.tanrei.primitives

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.isSpecified
import androidx.compose.ui.unit.max

/**
 * A selection control and its visible label (checkbox CHK-15, radio button RAD-17, switch SWT-15): [control] first,
 * then — unless [label] is null — the label at the control's inline end, [gap] away, in [style] and [color], wrapping
 * rather than truncating. A `Row`, so a right-to-left layout mirrors the order. The control (of [controlHeight]) and
 * the label's first line are centered on one line, the taller of the two; a label that wraps grows downwards from
 * there, the control staying beside its first line.
 *
 * [modifier] is the component's whole chain — input, press, target, opacity —, so the label is part of the hit area
 * and a press on it activates the control (CHK-7, RAD-9, SWT-5).
 */
@Composable
internal fun TanreiLabelledControl(
    modifier: Modifier,
    label: String?,
    gap: Dp,
    style: TextStyle,
    color: Color,
    controlHeight: Dp,
    control: @Composable () -> Unit,
) {
    val firstLine = if (label != null && style.lineHeight.isSpecified) with(LocalDensity.current) { style.lineHeight.toDp() } else controlHeight
    val line = max(controlHeight, firstLine)
    Row(modifier = modifier, verticalAlignment = Alignment.Top) {
        Box(Modifier.defaultMinSize(minHeight = line), contentAlignment = Alignment.Center) { control() }
        if (label != null) {
            // The first line's center on the line's center; further lines below it.
            Box(Modifier.padding(start = gap, top = (line - firstLine) / 2), contentAlignment = Alignment.TopStart) {
                TanreiText(label, style = style, color = color)
            }
        }
    }
}

/**
 * The name of a labelled control (CHK-16, RAD-18, SWT-16): the visible label is its name by itself (its text merges
 * into the control's node); a hidden one ([labelHidden]) is put on the node as its `contentDescription`. An empty
 * [label] still renders and still works, and a debuggable app reports it as [component]'s missing name.
 * Returns the label to draw, or null when none is drawn.
 */
@Composable
internal fun tanreiControlLabel(component: String, label: String, labelHidden: Boolean): String? {
    if (label.isBlank()) TanreiReportMissingName(component, "label", what = "a control without a label")
    return label.takeUnless { labelHidden || it.isBlank() }
}

/** The semantics of [tanreiControlLabel]: a hidden, non-empty label as the node's `contentDescription`. */
internal fun Modifier.tanreiHiddenLabel(label: String, labelHidden: Boolean): Modifier =
    if (labelHidden && label.isNotBlank()) semantics { contentDescription = label } else this
