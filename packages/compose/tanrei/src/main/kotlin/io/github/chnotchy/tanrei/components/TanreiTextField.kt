package io.github.chnotchy.tanrei.components

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActionScope
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.selection.LocalTextSelectionColors
import androidx.compose.foundation.text.selection.TextSelectionColors
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.autofill.ContentType
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.ClipOp
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.addOutline
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.layout.HorizontalAlignmentLine
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.contentType
import androidx.compose.ui.semantics.error
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.semantics.text
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.lerp
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.util.lerp
import io.github.chnotchy.tanrei.R
import io.github.chnotchy.tanrei.primitives.TanreiReportInvalidValue
import io.github.chnotchy.tanrei.primitives.TanreiReportMissingName
import io.github.chnotchy.tanrei.primitives.TanreiReportUnknownValue
import io.github.chnotchy.tanrei.primitives.TanreiStateMotion
import io.github.chnotchy.tanrei.primitives.TanreiText
import io.github.chnotchy.tanrei.primitives.animateTanreiColorAsState
import io.github.chnotchy.tanrei.primitives.focusExtent
import io.github.chnotchy.tanrei.primitives.isDrawn
import io.github.chnotchy.tanrei.primitives.tanreiContainerShape
import io.github.chnotchy.tanrei.primitives.tanreiFocusGlow
import io.github.chnotchy.tanrei.primitives.tanreiGroupOpacity
import io.github.chnotchy.tanrei.primitives.tanreiInsetOutline
import io.github.chnotchy.tanrei.theme.LocalTanreiContentColor
import io.github.chnotchy.tanrei.theme.LocalTanreiIconGlyph
import io.github.chnotchy.tanrei.theme.LocalTanreiTextStyle
import io.github.chnotchy.tanrei.theme.TanreiTheme
import io.github.chnotchy.tanrei.theme.color
import io.github.chnotchy.tanrei.theme.glyph
import io.github.chnotchy.tanrei.theme.tanreiTween
import io.github.chnotchy.tanrei.theme.toTextStyle
import io.github.chnotchy.tanrei.tokens.TanreiFocusStyle
import io.github.chnotchy.tanrei.tokens.TanreiInteractionState
import io.github.chnotchy.tanrei.tokens.TanreiPaint
import io.github.chnotchy.tanrei.tokens.TanreiTextFieldSize
import io.github.chnotchy.tanrei.tokens.TanreiTextFieldTokens
import io.github.chnotchy.tanrei.tokens.TanreiTextFieldVariant
import io.github.chnotchy.tanrei.tokens.TanreiTextFieldVariantStateTokens
import java.text.BreakIterator
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.roundToInt
import kotlinx.coroutines.delay

/**
 * What the value of a [TanreiTextField] is (the spec's `type`, TXF-20): it chooses the keyboard, autocorrection,
 * obscured entry and semantics. The value is a `String` for every type — [Number] never parses, rounds or validates it.
 * A closed set: Compose's type system rules out a value the field does not know (TXF-9's `type` half).
 */
public enum class TanreiTextFieldType {
    /** A general keyboard. */
    Text,

    /** An email keyboard, without autocapitalization or autocorrection; laid out left-to-right. */
    Email,

    /** Obscured, secure entry without autocorrection; always one line; laid out left-to-right. */
    Password,

    /** A numeric keyboard with a decimal separator; laid out left-to-right. */
    Number,

    /** A general keyboard whose action key reads as search. */
    Search,

    /** A phone keypad; laid out left-to-right. */
    Tel,

    /** A URL keyboard, without autocapitalization or autocorrection; laid out left-to-right. */
    Url,
}

/**
 * Lets people enter and edit text — one line or several — with a label, optional icons, prefix and suffix, supporting
 * text and a character count. Implements `specs/text-field.spec.json` on Compose's own [BasicTextField] (so
 * input methods, autofill and selection work as the platform's do). Every design value comes from the current design
 * system's [TanreiTextFieldTokens] (`TanreiTheme.tokens.textField`), each part drawn from its state's tokens —
 * `variants[variant][state]`, the `error…` parts while [isError] — and its size's (`sizes[size]`).
 *
 * The Compose idiom, as `TextField`: [value] / [onValueChange]. The field keeps the selection and any input-method
 * composition itself; the overload that takes a [TextFieldValue] is for products that manage them.
 *
 * @param value the text in the field (the spec's `value`). Setting it never calls [onValueChange] or [onCommit]
 *   (TXF-1); set while an input method is composing, it is applied when the composition ends (TXF-4).
 * @param onValueChange the spec's `input`: called once per change the user makes — typing, deleting, pasting,
 *   cutting, dictation, autofill, and every step of an input method's composition (and always for its commit).
 * @param label names the field, visibly and to assistive technology (TXF-23). Required: an empty one still renders,
 *   and a debuggable app reports it.
 * @param modifier applied to the whole field: container, supporting row and the reserved minimum touch target.
 * @param variant a key of `tokens.textField.variants`: [TanreiTextFieldVariant.Outlined] (default, a border) or
 *   [TanreiTextFieldVariant.Filled] (a tinted box and a bottom line). Open; one the design system does not
 *   have draws with the default's tokens and is reported in debuggable apps (TXF-9).
 * @param size a key of `tokens.textField.sizes` — the minimum height of a single line (36 / 40 in the default system,
 *   Button's medium and large). Open as well.
 * @param type what the value is: keyboard, autocorrection, obscured entry, text direction (TXF-20, TXF-24).
 * @param labelHidden does not draw the label, which stays the accessible name (TXF-15).
 * @param placeholder a hint shown while the value is empty and the label is floated or not drawn — never the name.
 * @param supportingText help below the field, part of its description.
 * @param errorText shown in place of [supportingText] while [isError] (TXF-11).
 * @param isError the spec's `error`: every part draws from the variant's `error…` parts, and the field is exposed as
 *   invalid. Validation is the product's; the field never sets it.
 * @param enabled the Compose idiom for the spec's `disabled` (inverse): not focusable, not editable, no events.
 * @param readOnly focusable, selectable and copyable, but not editable (TXF-10); drawn as an enabled field.
 * @param required exposed as required to assistive technology; no visible mark (TXF-23).
 * @param singleLine the Compose idiom for the spec's `multiline` (inverse). Ignored for [TanreiTextFieldType.Password].
 * @param minLines lines an empty multi-line field shows (the spec's `minRows`).
 * @param maxLines lines a multi-line field grows to before it scrolls (the spec's `maxRows`); 0 grows without limit.
 * @param maxLength the most user-perceived characters (grapheme clusters) the user can enter; 0 is no limit (TXF-18).
 * @param counter shows the count (and [maxLength]) at the end of the supporting row (TXF-19).
 * @param prefix fixed text before the value (the spec's `prefixText`), not part of it.
 * @param suffix fixed text after the value (the spec's `suffixText`), not part of it.
 * @param contentType the spec's `autocomplete`: an HTML autofill field name (`email`, `current-password`,
 *   `one-time-code` …), mapped to Compose's autofill [ContentType] (TXF-21).
 * @param onCommit the spec's `change`: called once with the value when the user commits a changed value — focus
 *   leaves the field, or the action key is pressed in a single-line field (TXF-2).
 * @param keyboardActions the spec's `action`: what the keyboard's action key does in a single-line field, called after
 *   [onCommit] (TXF-3). A multi-line field's Enter inserts a line break instead.
 * @param leadingIcon the spec's `leading-icon` slot, at the field's start.
 * @param trailingIcon the spec's `trailing-icon` slot, at its end — an icon, or the product's own icon button
 *   (clear, reveal password): the field builds in none (TXF-22).
 * @param interactionSource hoist to observe or drive hover and focus.
 */
@Composable
public fun TanreiTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    variant: TanreiTextFieldVariant = TanreiTextFieldVariant.Outlined,
    size: TanreiTextFieldSize = TanreiTextFieldSize.Medium,
    type: TanreiTextFieldType = TanreiTextFieldType.Text,
    labelHidden: Boolean = false,
    placeholder: String = "",
    supportingText: String = "",
    errorText: String = "",
    isError: Boolean = false,
    enabled: Boolean = true,
    readOnly: Boolean = false,
    required: Boolean = false,
    singleLine: Boolean = true,
    minLines: Int = DEFAULT_MIN_LINES,
    maxLines: Int = 0,
    maxLength: Int = 0,
    counter: Boolean = false,
    prefix: String = "",
    suffix: String = "",
    contentType: String = "",
    onCommit: ((String) -> Unit)? = null,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    leadingIcon: (@Composable () -> Unit)? = null,
    trailingIcon: (@Composable () -> Unit)? = null,
    interactionSource: MutableInteractionSource? = null,
) {
    // The field's own value, with its selection and composition; the product owns the text.
    var field by remember { mutableStateOf(TextFieldValue(value, TextRange(value.length))) }
    val shown = tanreiReconciledValue(field, value)
    SideEffect { if (shown != field) field = shown }
    TanreiTextField(
        value = shown,
        onValueChange = { next ->
            // TXF-1 / TXF-4: one input per change of the text, and always one for a committed composition.
            val emit = next.text != field.text || (field.composition != null && next.composition == null)
            field = next
            if (emit) onValueChange(next.text)
        },
        label = label,
        modifier = modifier,
        variant = variant,
        size = size,
        type = type,
        labelHidden = labelHidden,
        placeholder = placeholder,
        supportingText = supportingText,
        errorText = errorText,
        isError = isError,
        enabled = enabled,
        readOnly = readOnly,
        required = required,
        singleLine = singleLine,
        minLines = minLines,
        maxLines = maxLines,
        maxLength = maxLength,
        counter = counter,
        prefix = prefix,
        suffix = suffix,
        contentType = contentType,
        onCommit = onCommit,
        keyboardActions = keyboardActions,
        leadingIcon = leadingIcon,
        trailingIcon = trailingIcon,
        interactionSource = interactionSource,
    )
}

/**
 * [TanreiTextField] for a product that manages the selection and the composition itself: [onValueChange] is called
 * for every change of the [TextFieldValue] (text, selection or composition), after [maxLength] has been applied.
 * Every other parameter is the same.
 */
@Composable
public fun TanreiTextField(
    value: TextFieldValue,
    onValueChange: (TextFieldValue) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    variant: TanreiTextFieldVariant = TanreiTextFieldVariant.Outlined,
    size: TanreiTextFieldSize = TanreiTextFieldSize.Medium,
    type: TanreiTextFieldType = TanreiTextFieldType.Text,
    labelHidden: Boolean = false,
    placeholder: String = "",
    supportingText: String = "",
    errorText: String = "",
    isError: Boolean = false,
    enabled: Boolean = true,
    readOnly: Boolean = false,
    required: Boolean = false,
    singleLine: Boolean = true,
    minLines: Int = DEFAULT_MIN_LINES,
    maxLines: Int = 0,
    maxLength: Int = 0,
    counter: Boolean = false,
    prefix: String = "",
    suffix: String = "",
    contentType: String = "",
    onCommit: ((String) -> Unit)? = null,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    leadingIcon: (@Composable () -> Unit)? = null,
    trailingIcon: (@Composable () -> Unit)? = null,
    interactionSource: MutableInteractionSource? = null,
) {
    val source = interactionSource ?: remember { MutableInteractionSource() }
    val system = TanreiTheme.tokens
    val tokens = system.textField
    // TXF-9: both lookups are total — a value this design system does not have reads the default value's tokens.
    val metrics = tokens.sizes[size]
    if (size !in tokens.sizes) TanreiReportUnknownValue(system.id, "TanreiTextField", "size", size.key)
    if (variant !in tokens.variants) TanreiReportUnknownValue(system.id, "TanreiTextField", "variant", variant.key)
    // TXF-23: still rendered and still working; reported in debuggable apps.
    if (label.isBlank()) TanreiReportMissingName("TanreiTextField", "label", what = "a field without a label")
    // TXF-17: a password stays on one line.
    val password = type == TanreiTextFieldType.Password
    if (password && !singleLine) TanreiReportInvalidValue("TanreiTextField", "singleLine", "false", "is ignored for type password", "on one line")
    val oneLine = singleLine || password
    val drawsLabel = !labelHidden && label.isNotBlank()

    // TXF-6: one state wins — disabled, else focused (by ANY means: a field shows where typing goes) over hovered. A
    // field has no press answer (TXF-8).
    val focused by source.collectIsFocusedAsState()
    val hovered by source.collectIsHoveredAsState()
    val state = when {
        !enabled -> TanreiInteractionState.Disabled
        focused -> TanreiInteractionState.Focused
        hovered -> TanreiInteractionState.Hovered
        else -> TanreiInteractionState.Enabled
    }
    // TXF-11: the condition, chosen once — the plain parts or the `error.` parts, in every state.
    val look = if (isError) TanreiTextFieldLook.Error else TanreiTextFieldLook.Plain
    val palette = tokens.variants[variant]
    val parts = palette[state].parts(look)

    // TXF-14: colors and widths move over the state motion (there is no press to snap into).
    val motion = TanreiStateMotion(state, tokens.motionStateDuration, tokens.motionStateEasing)
    val containerColor = animateTanreiColorAsState(parts.container.color, motion, label = "container")
    val indicatorColor = animateTanreiColorAsState(parts.activeIndicator.color, motion, label = "indicator")
    val outlineColor = animateTanreiColorAsState(parts.outline.color, motion, label = "outline")
    val labelColor by animateTanreiColorAsState(parts.label.color, motion, label = "label")
    val inputColor by animateTanreiColorAsState(parts.input.color, motion, label = "input")
    val placeholderColor by animateTanreiColorAsState(parts.placeholder.color, motion, label = "placeholder")
    val affixColor by animateTanreiColorAsState(parts.affix.color, motion, label = "affix")
    val leadingIconColor by animateTanreiColorAsState(parts.leadingIcon.color, motion, label = "leadingIcon")
    val trailingIconColor by animateTanreiColorAsState(parts.trailingIcon.color, motion, label = "trailingIcon")
    val supportingColor by animateTanreiColorAsState(parts.supportingText.color, motion, label = "supportingText")
    val counterColor by animateTanreiColorAsState(parts.counter.color, motion, label = "counter")
    val caretColor by animateTanreiColorAsState(parts.caret.color, motion, label = "caret")
    val outlineWidth = animateDpAsState(tokens.outlineWidth(state), motion.spec(), label = "outlineWidth")
    val indicatorWidth = animateDpAsState(tokens.activeIndicatorWidth(state), motion.spec(), label = "indicatorWidth")
    val opacity = animateFloatAsState(tokens.opacity(state), motion.spec(), label = "opacity")

    // TXF-13 / TXF-14: the label floats while focused or filled (autofill fills the value, so it floats too), over the
    // label motion; at once where motion is reduced (the animator duration scale).
    val floated = focused || value.text.isNotEmpty()
    val float = animateFloatAsState(if (floated) 1f else 0f, tanreiTween(tokens.motionLabelDuration, tokens.motionLabelEasing), label = "float")

    // TXF-16: which edge bounds the field is read from the variant's resting tokens, never from its name: a field
    // bounded by an outline rounds its four corners by `container.shape` and floats its label onto that outline; one
    // bounded by its fill and active indicator keeps `container.shape-bottom` below and floats its label inside.
    val outlined = palette.enabled.parts(look).outline.color.isDrawn
    val smoothing = system.shape.cornerSmoothing
    val topRadius = tokens.containerShape
    val bottomRadius = if (outlined) tokens.containerShape else tokens.containerShapeBottom
    val shape = remember(topRadius, bottomRadius, smoothing) { tanreiContainerShape(topRadius, bottomRadius, smoothing) }

    // TXF-2: the value last committed — when focus arrived, or at the last change emitted.
    val current = rememberUpdatedState(value)
    val commit = remember { TanreiCommit(value.text) }
    // TXF-1: a value the product sets is not the user's change: with no user edit pending, it is the committed value.
    SideEffect {
        if (value.text != commit.seen) {
            if (value.text != commit.userText && commit.committed == commit.seen) commit.committed = value.text
            commit.seen = value.text
        }
    }
    // Read through states: the action handlers below are remembered across compositions.
    val editable = rememberUpdatedState(enabled && !readOnly)
    val latestOnCommit = rememberUpdatedState(onCommit)
    fun commitIfChanged() {
        val now = current.value
        // TXF-4: never while an input method is composing.
        if (!editable.value || now.composition != null || now.text == commit.committed) return
        commit.committed = now.text
        latestOnCommit.value?.invoke(now.text)
    }
    // TXF-3: the action key commits first, then does what the product asked (or the platform's default).
    val actions = remember(keyboardActions) {
        fun run(action: ImeAction, handler: (KeyboardActionScope.() -> Unit)?): KeyboardActionScope.() -> Unit = {
            commitIfChanged()
            if (handler != null) handler() else defaultKeyboardAction(action)
        }
        KeyboardActions(
            onDone = run(ImeAction.Done, keyboardActions.onDone),
            onGo = run(ImeAction.Go, keyboardActions.onGo),
            onNext = run(ImeAction.Next, keyboardActions.onNext),
            onPrevious = run(ImeAction.Previous, keyboardActions.onPrevious),
            onSearch = run(ImeAction.Search, keyboardActions.onSearch),
            onSend = run(ImeAction.Send, keyboardActions.onSend),
        )
    }

    val direction = LocalLayoutDirection.current
    val inputStyle = metrics.inputTypescale.toTextStyle().merge(tanreiTypedTextStyle(type, direction)).copy(color = inputColor)
    val restingLabelStyle = metrics.labelTypescale.toTextStyle()
    val floatedLabelStyle = metrics.labelFloatedTypescale.toTextStyle()
    val supportingStyle = tokens.supportingTextTypescale.toTextStyle()
    // TXF-13: the label is measured in the layout, in the width it is given there, resting and floated — it wraps, and
    // the field grows to hold it. Fields laid out as peers (the time picker's) make room for each other's labels.
    val measurer = rememberTextMeasurer()
    val labelRoom = LocalTanreiTextFieldLabelRoom.current
    val labelText = if (!drawsLabel) null else TanreiFieldLabelText(label, labelRoom, restingLabelStyle, floatedLabelStyle, measurer)
    val notch = remember { TanreiNotchGeometry() }

    // TXF-11 / TXF-12: the shown text, and the announcement of an error that appears while the field has focus.
    val shownSupporting = if (isError && errorText.isNotEmpty()) errorText else supportingText
    // TXF-19: the count of user-perceived characters, announced once when typing pauses for a second.
    val count = if (counter) tanreiGraphemeCount(value.text) else 0
    val countText = if (maxLength > 0) "$count/$maxLength" else "$count"
    var spokenCount by remember { mutableStateOf(countText) }
    LaunchedEffect(countText) {
        delay(COUNTER_PAUSE_MILLIS)
        spokenCount = countText
    }

    val invalid = stringResource(R.string.tanrei_invalid)
    val requiredText = stringResource(R.string.tanrei_required)
    val autofill = tanreiAutofillContentType(contentType)
    val glow = system.behavior.focusStyle == TanreiFocusStyle.Glow
    val glowExtent = if (glow) focusExtent(system.measure, TanreiFocusStyle.Glow) else 0.dp

    val fieldModifier = modifier
        .tanreiGroupOpacity(overflow = glowExtent) { opacity.value }
        // TXF-23: the label is the name, drawn or not; TXF-11: invalid; required; TXF-21: the autofill hint.
        .semantics {
            if (label.isNotBlank()) contentDescription = label
            if (isError) error(invalid)
            if (required) stateDescription = requiredText
            if (autofill != null) this.contentType = autofill
        }
        .onFocusChanged { focus ->
            if (focus.isFocused) {
                if (!commit.focused) commit.committed = current.value.text
                commit.focused = true
            } else if (commit.focused) {
                commit.focused = false
                commitIfChanged()
            }
        }
        .hoverable(source, enabled)

    // TXF-6: the highlight behind selected text is `selection.color`, in every variant and state — not foundation's
    // default blue. The selection handles take the caret color.
    val selectionColors = TextSelectionColors(handleColor = caretColor, backgroundColor = tokens.selectionColor.color)
    CompositionLocalProvider(LocalTextSelectionColors provides selectionColors) {
        BasicTextField(
            value = value,
            onValueChange = { next ->
                val limited = tanreiLimitedEdit(current.value, next, maxLength)
                commit.userText = limited.text
                onValueChange(limited)
            },
            modifier = fieldModifier,
            enabled = enabled,
            readOnly = readOnly,
            textStyle = inputStyle,
            keyboardOptions = tanreiKeyboardOptions(type, oneLine),
            keyboardActions = actions,
            singleLine = oneLine,
            maxLines = if (oneLine) 1 else if (maxLines <= 0) Int.MAX_VALUE else max(maxLines, minLines),
            minLines = if (oneLine) 1 else minLines.coerceAtLeast(1),
            visualTransformation = if (password) PasswordVisualTransformation() else VisualTransformation.None,
            interactionSource = source,
            cursorBrush = SolidColor(caretColor),
            decorationBox = { inner ->
                val showAffixes = !drawsLabel || floated
                val affixAlpha = if (drawsLabel) float.value else 1f
                TanreiTextFieldLayout(
                    metrics = TanreiTextFieldMetrics(
                        containerHeight = metrics.containerHeight,
                        paddingInline = metrics.containerPaddingInline,
                        paddingInlineWithIcon = metrics.containerPaddingInlineWithIcon,
                        paddingBlock = metrics.containerPaddingBlock,
                        paddingBlockWithLabel = metrics.containerPaddingBlockWithLabel,
                        gap = metrics.containerGap,
                        iconSize = metrics.iconSize,
                        affixGap = tokens.affixGap,
                        supportingGap = tokens.supportingTextGap,
                        target = system.measure.targetTouch,
                        inputLine = inputStyle.lineHeight,
                    ),
                    oneLine = oneLine,
                    outlined = outlined,
                    labelText = labelText,
                    notch = notch,
                    float = float,
                    hasLeading = leadingIcon != null,
                    hasTrailing = trailingIcon != null,
                    container = {
                        Box(
                            Modifier
                                .tanreiFocusGlow(focused && enabled, topRadius, bottomRadius)
                                .tanreiFieldContainer(
                                    shape = shape,
                                    outlineRadius = topRadius,
                                    smoothing = smoothing,
                                    containerColor = containerColor,
                                    outlineColor = outlineColor,
                                    outlineWidth = outlineWidth,
                                    indicatorColor = indicatorColor,
                                    indicatorWidth = indicatorWidth,
                                    // TXF-13: the floated label of an outlined field starts at `padding-inline`, over a leading
                                    // icon — so does the gap it opens, as wide as the label's widest line (the layout measures it).
                                    notch = if (outlined && drawsLabel) notch else null,
                                    notchPadding = tokens.outlineNotchPadding,
                                    float = float,
                                ),
                        )
                    },
                    label = if (!drawsLabel) null else {
                        {
                            // The name is on the field; the drawn label is not read a second time.
                            Box(Modifier.clearAndSetSemantics {}) {
                                TanreiText(label, style = lerp(restingLabelStyle, floatedLabelStyle, float.value), color = labelColor)
                            }
                        }
                    },
                    prefix = if (prefix.isEmpty()) null else {
                        { TanreiFieldAffix(prefix, inputStyle, affixColor, visible = showAffixes, alpha = affixAlpha) }
                    },
                    suffix = if (suffix.isEmpty()) null else {
                        { TanreiFieldAffix(suffix, inputStyle, affixColor, visible = showAffixes, alpha = affixAlpha) }
                    },
                    input = inner,
                    // TXF-15: only where it cannot collide with the label; never the name (a field without a label does not
                    // let it stand in for one).
                    placeholder = if (placeholder.isEmpty() || value.text.isNotEmpty() || (drawsLabel && !floated)) null else {
                        {
                            Box(Modifier.alpha(if (drawsLabel) float.value else 1f).then(if (label.isBlank()) Modifier.clearAndSetSemantics {} else Modifier)) {
                                TanreiText(placeholder, style = inputStyle, color = placeholderColor)
                            }
                        }
                    },
                    leading = leadingIcon?.let { icon -> { TanreiFieldIcon(metrics.iconSize, leadingIconColor, icon) } },
                    trailing = trailingIcon?.let { icon -> { TanreiFieldIcon(metrics.iconSize, trailingIconColor, icon) } },
                    supporting = if (shownSupporting.isEmpty()) null else {
                        {
                            // TXF-12: an error that appears (or changes) while the field has focus is announced once, politely.
                            Box(Modifier.semantics { if (focused && isError) liveRegion = LiveRegionMode.Polite }) {
                                TanreiText(shownSupporting, style = supportingStyle, color = supportingColor)
                            }
                        }
                    },
                    counter = if (!counter) null else {
                        {
                            // TXF-19: shown at once, but read — and announced while focused — only once typing pauses.
                            Box(
                                Modifier.clearAndSetSemantics {
                                    text = AnnotatedString(spokenCount)
                                    if (focused) liveRegion = LiveRegionMode.Polite
                                },
                            ) {
                                TanreiText(countText, style = supportingStyle.copy(textAlign = TextAlign.End), color = counterColor)
                            }
                        }
                    },
                )
            },
        )
    }
}

/** Lines an empty multi-line field shows by default (the spec's `minRows` default). */
private const val DEFAULT_MIN_LINES = 2

/** TXF-19: how long typing must pause before the count is announced. */
private const val COUNTER_PAUSE_MILLIS = 1000L

/**
 * What TXF-1 and TXF-2 remember between events: the value last committed, whether the field had focus, the text last
 * seen, and the text of the user's last edit (to tell it from a value the product sets).
 */
private class TanreiCommit(var committed: String) {
    var focused: Boolean = false
    var seen: String = committed
    var userText: String? = null
}

// ── The parts of a look ─────────────────────────────────────────────────────

/** The two looks of every variant (TXF-11): its own parts, or its `error.` parts. */
private enum class TanreiTextFieldLook { Plain, Error }

/** The paints of one look in one state. */
@Immutable
private class TanreiTextFieldParts(
    val container: TanreiPaint,
    val activeIndicator: TanreiPaint,
    val outline: TanreiPaint,
    val label: TanreiPaint,
    val input: TanreiPaint,
    val placeholder: TanreiPaint,
    val affix: TanreiPaint,
    val leadingIcon: TanreiPaint,
    val trailingIcon: TanreiPaint,
    val supportingText: TanreiPaint,
    val counter: TanreiPaint,
    val caret: TanreiPaint,
)

private fun TanreiTextFieldVariantStateTokens.parts(look: TanreiTextFieldLook): TanreiTextFieldParts = when (look) {
    TanreiTextFieldLook.Plain -> TanreiTextFieldParts(
        containerColor, activeIndicatorColor, outlineColor, labelColor, inputColor, placeholderColor, affixColor,
        leadingIconColor, trailingIconColor, supportingTextColor, counterColor, caretColor,
    )
    TanreiTextFieldLook.Error -> TanreiTextFieldParts(
        errorContainerColor, errorActiveIndicatorColor, errorOutlineColor, errorLabelColor, errorInputColor,
        errorPlaceholderColor, errorAffixColor, errorLeadingIconColor, errorTrailingIconColor, errorSupportingTextColor,
        errorCounterColor, errorCaretColor,
    )
}

// ── Keyboard, direction, autofill ───────────────────────────────────────────

/** TXF-20: the keyboard of each type; a single-line field's action key is Done, a search field's Search. */
internal fun tanreiKeyboardOptions(type: TanreiTextFieldType, singleLine: Boolean): KeyboardOptions {
    val action = when {
        !singleLine -> ImeAction.Default
        type == TanreiTextFieldType.Search -> ImeAction.Search
        else -> ImeAction.Done
    }
    return when (type) {
        TanreiTextFieldType.Text -> KeyboardOptions(keyboardType = KeyboardType.Text, imeAction = action)
        TanreiTextFieldType.Search -> KeyboardOptions(keyboardType = KeyboardType.Text, imeAction = action)
        TanreiTextFieldType.Email -> KeyboardOptions(capitalization = KeyboardCapitalization.None, autoCorrectEnabled = false, keyboardType = KeyboardType.Email, imeAction = action)
        TanreiTextFieldType.Password -> KeyboardOptions(capitalization = KeyboardCapitalization.None, autoCorrectEnabled = false, keyboardType = KeyboardType.Password, imeAction = action)
        TanreiTextFieldType.Number -> KeyboardOptions(keyboardType = KeyboardType.Decimal, imeAction = action)
        TanreiTextFieldType.Tel -> KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = action)
        TanreiTextFieldType.Url -> KeyboardOptions(capitalization = KeyboardCapitalization.None, autoCorrectEnabled = false, keyboardType = KeyboardType.Uri, imeAction = action)
    }
}

/**
 * TXF-24: the typed text follows its own direction, except that an email, url, tel, number or password value is laid
 * out left-to-right and aligned to the field's start edge (the right one in a right-to-left layout).
 */
private fun tanreiTypedTextStyle(type: TanreiTextFieldType, direction: LayoutDirection): TextStyle = when (type) {
    TanreiTextFieldType.Text, TanreiTextFieldType.Search -> TextStyle()
    else -> TextStyle(textDirection = TextDirection.Ltr, textAlign = if (direction == LayoutDirection.Rtl) TextAlign.Right else TextAlign.Left)
}

/**
 * TXF-21: an HTML autofill field name as Compose's autofill [ContentType]. A name with no Compose constant is passed on
 * as the platform's hint; empty and `off` are none.
 */
internal fun tanreiAutofillContentType(name: String): ContentType? = when (name.trim().lowercase()) {
    "", "off", "on" -> null
    "username", "webauthn" -> ContentType.Username
    "email" -> ContentType.EmailAddress
    "current-password" -> ContentType.Password
    "new-password" -> ContentType.NewPassword
    "one-time-code" -> ContentType.SmsOtpCode
    "tel" -> ContentType.PhoneNumber
    "tel-national" -> ContentType.PhoneNumberNational
    "tel-country-code" -> ContentType.PhoneCountryCode
    "postal-code" -> ContentType.PostalCode
    "street-address", "address-line1" -> ContentType.AddressStreet
    "address-line2", "address-line3" -> ContentType.AddressAuxiliaryDetails
    "address-level1" -> ContentType.AddressRegion
    "address-level2" -> ContentType.AddressLocality
    "country", "country-name" -> ContentType.AddressCountry
    "name" -> ContentType.PersonFullName
    "given-name" -> ContentType.PersonFirstName
    "family-name" -> ContentType.PersonLastName
    "additional-name" -> ContentType.PersonMiddleName
    "honorific-prefix" -> ContentType.PersonNamePrefix
    "honorific-suffix" -> ContentType.PersonNameSuffix
    "cc-number" -> ContentType.CreditCardNumber
    "cc-csc" -> ContentType.CreditCardSecurityCode
    "cc-exp" -> ContentType.CreditCardExpirationDate
    "cc-exp-month" -> ContentType.CreditCardExpirationMonth
    "cc-exp-year" -> ContentType.CreditCardExpirationYear
    "bday" -> ContentType.BirthDateFull
    "bday-day" -> ContentType.BirthDateDay
    "bday-month" -> ContentType.BirthDateMonth
    "bday-year" -> ContentType.BirthDateYear
    "sex" -> ContentType.Gender
    else -> ContentType(name.trim())
}

// ── Value rules (pure, so they are tested directly) ─────────────────────────

/**
 * TXF-1 / TXF-4: what the field shows for the product's [productValue] when its own state is [field]. The product's
 * text wins — except while an input method is composing, when it waits for the composition to end (the next
 * composition after it ends compares again). The selection is kept, clipped to the new text.
 */
internal fun tanreiReconciledValue(field: TextFieldValue, productValue: String): TextFieldValue = when {
    field.text == productValue -> field
    field.composition != null -> field
    else -> TextFieldValue(productValue, TextRange(field.selection.start.coerceAtMost(productValue.length), field.selection.end.coerceAtMost(productValue.length)))
}

/** User-perceived characters (grapheme clusters) in [text]: an emoji, or a letter with its accents, counts once. */
internal fun tanreiGraphemeCount(text: String): Int {
    if (text.isEmpty()) return 0
    val boundaries = BreakIterator.getCharacterInstance()
    boundaries.setText(text)
    var count = 0
    while (boundaries.next() != BreakIterator.DONE) count++
    return count
}

/** The first [count] grapheme clusters of [text]. */
private fun takeGraphemes(text: String, count: Int): String {
    if (count <= 0) return ""
    val boundaries = BreakIterator.getCharacterInstance()
    boundaries.setText(text)
    var end = 0
    repeat(count) {
        val next = boundaries.next()
        if (next == BreakIterator.DONE) return text
        end = next
    }
    return text.substring(0, end)
}

/** The grapheme boundary of [text] at or before [index]. */
private fun boundaryAtOrBefore(text: String, index: Int): Int {
    if (index <= 0) return 0
    if (index >= text.length) return text.length
    val boundaries = BreakIterator.getCharacterInstance()
    boundaries.setText(text)
    return if (boundaries.isBoundary(index)) index else boundaries.preceding(index)
}

/**
 * TXF-18: [next] with [maxLength] applied to the user's edit from [previous]. The inserted text is shortened to what
 * still fits — a paste is cut, a keystroke into a full field is refused — counted in grapheme clusters. A composition
 * in progress is never cut: the limit applies when it is committed, to everything it inserted. Deleting is always
 * allowed, and a value the product set longer than the limit is left alone.
 */
internal fun tanreiLimitedEdit(previous: TextFieldValue, next: TextFieldValue, maxLength: Int): TextFieldValue {
    if (maxLength <= 0 || next.composition != null || tanreiGraphemeCount(next.text) <= maxLength) return next
    // What the text was before this edit: a composition that ends now counts as part of it.
    val base = previous.composition?.let { previous.text.removeRange(it.min, it.max) } ?: previous.text
    val text = next.text
    var prefix = 0
    while (prefix < base.length && prefix < text.length && base[prefix] == text[prefix]) prefix++
    prefix = boundaryAtOrBefore(text, prefix)
    var suffix = 0
    while (suffix < base.length - prefix && suffix < text.length - prefix && base[base.length - 1 - suffix] == text[text.length - 1 - suffix]) suffix++
    val insertedEnd = text.length - suffix
    val kept = text.substring(0, prefix) + text.substring(insertedEnd)
    val inserted = text.substring(prefix, insertedEnd)
    val fitted = takeGraphemes(inserted, maxLength - tanreiGraphemeCount(kept))
    if (fitted.length == inserted.length) return next
    return TextFieldValue(text.substring(0, prefix) + fitted + text.substring(insertedEnd), TextRange(prefix + fitted.length))
}

// ── Drawing ─────────────────────────────────────────────────────────────────

/**
 * The gap in the outline where the floated label crosses it (TXF-13): from the left of the floated label's widest line to
 * the right of it, in the container's own pixels (already mirrored in right-to-left). Written by the layout, which measures
 * the label in the width it is given; read in the draw phase only.
 */
private class TanreiNotchGeometry {
    var left: Float by mutableFloatStateOf(0f)
    var right: Float by mutableFloatStateOf(0f)
}

/**
 * The container of the field (TXF-16): the fill in [shape]; for a field bounded by an outline, the outline inside the
 * edge ([tanreiInsetOutline], concentric corners of [outlineRadius]) with the [notch] opened by the label's float; the
 * active indicator along the bottom, inside the fill. Colors and widths are read in the draw phase.
 */
private fun Modifier.tanreiFieldContainer(
    shape: androidx.compose.ui.graphics.Shape,
    outlineRadius: Dp,
    smoothing: Float,
    containerColor: State<Color>,
    outlineColor: State<Color>,
    outlineWidth: State<Dp>,
    indicatorColor: State<Color>,
    indicatorWidth: State<Dp>,
    notch: TanreiNotchGeometry?,
    notchPadding: Dp,
    float: State<Float>,
): Modifier = drawWithCache {
    val fill = Path().apply { addOutline(shape.createOutline(size, layoutDirection, this@drawWithCache)) }
    onDrawBehind {
        val container = containerColor.value
        if (container.isDrawn) drawPath(fill, container)
        val edge = outlineColor.value
        val edgeWidth = outlineWidth.value.toPx()
        if (edge.isDrawn && edgeWidth > 0f) {
            val band = tanreiInsetOutline(size, outlineRadius.toPx(), smoothing, edgeWidth).outline
            val open = float.value
            if (notch != null && open > 0f) {
                val half = ((notch.right - notch.left) / 2f + notchPadding.toPx()) * open
                val center = (notch.left + notch.right) / 2f
                clipRect(left = center - half, top = -edgeWidth, right = center + half, bottom = edgeWidth * 2, clipOp = ClipOp.Difference) {
                    drawPath(band, edge)
                }
            } else {
                drawPath(band, edge)
            }
        }
        val indicator = indicatorColor.value
        val lineWidth = indicatorWidth.value.toPx()
        if (indicator.isDrawn && lineWidth > 0f) {
            clipPath(fill) { drawRect(indicator, topLeft = Offset(0f, size.height - lineWidth), size = Size(size.width, lineWidth)) }
        }
    }
}

/** Prefix or suffix text (TXF-15): in the input's style and the affix color, shown only while [visible]. */
@Composable
private fun TanreiFieldAffix(text: String, style: TextStyle, color: Color, visible: Boolean, alpha: Float) {
    Box(Modifier.alpha(if (visible) alpha else 0f).then(if (visible) Modifier else Modifier.clearAndSetSemantics {})) {
        TanreiText(text, style = style.copy(color = Color.Unspecified), color = color)
    }
}

/**
 * An icon slot (TXF-22): at least a box of the size's `icon.size`, given the icon color of its part and state
 * ([LocalTanreiContentColor]), the unselected glyph of that size ([LocalTanreiIconGlyph]) and a text style that draws
 * one glyph of the icon font. What the product puts there keeps its own semantics: an icon button stays a button.
 */
@Composable
private fun TanreiFieldIcon(size: Dp, color: Color, icon: @Composable () -> Unit) {
    val glyph = TanreiTheme.tokens.icon.glyph(size, selected = false)
    CompositionLocalProvider(
        LocalTanreiContentColor provides color,
        LocalTanreiIconGlyph provides glyph,
        LocalTanreiTextStyle provides glyph.toTextStyle(size),
    ) {
        Box(Modifier.defaultMinSize(size, size), contentAlignment = Alignment.Center) { icon() }
    }
}

// ── Layout ──────────────────────────────────────────────────────────────────

/** The size tokens [TanreiTextFieldLayout] places by, plus the text lines it measures with. */
@Immutable
private class TanreiTextFieldMetrics(
    val containerHeight: Dp,
    val paddingInline: Dp,
    val paddingInlineWithIcon: Dp,
    val paddingBlock: Dp,
    val paddingBlockWithLabel: Dp,
    val gap: Dp,
    val iconSize: Dp,
    val affixGap: Dp,
    val supportingGap: Dp,
    val target: Dp,
    val inputLine: androidx.compose.ui.unit.TextUnit,
)

/**
 * What the layout measures the label with (TXF-13): its text, the other labels it makes room for ([room], see
 * [LocalTanreiTextFieldLabelRoom]), the resting and floated styles, and the measurer.
 */
@Immutable
private class TanreiFieldLabelText(
    val label: String,
    val room: List<String>,
    val resting: TextStyle,
    val floated: TextStyle,
    val measurer: TextMeasurer,
)

/**
 * One label laid out in the width it is given (TXF-13), resting and floated: the heights of both, the resting first
 * line's height, the centre of the floated last line (from the label's top), and the floated lines' horizontal extent.
 */
private class TanreiLabelLayout(resting: TextLayoutResult, floated: TextLayoutResult) {
    val restingHeight: Int = resting.size.height
    val restingFirstLine: Float = resting.getLineBottom(0) - resting.getLineTop(0)
    val floatedHeight: Int = floated.size.height
    val floatedWidth: Int = floated.size.width
    val floatedLastCenter: Float = floated.lineCount.let { (floated.getLineTop(it - 1) + floated.getLineBottom(it - 1)) / 2f }

    /**
     * The floated label's horizontal extent in its box, in whole pixels: on one line the whole box (the label's own
     * measured width); on several, from the left of the leftmost line to the right of the rightmost — the widest line's
     * width where the lines share an alignment.
     */
    val floatedLeft: Float = if (floated.lineCount == 1) 0f else floor((0 until floated.lineCount).minOf { floated.getLineLeft(it) }).coerceAtLeast(0f)
    val floatedRight: Float = if (floated.lineCount == 1) floatedWidth.toFloat() else ceil((0 until floated.lineCount).maxOf { floated.getLineRight(it) }).coerceAtMost(floatedWidth.toFloat())
}

/**
 * Labels the [TanreiTextField]s under it make room for besides their own (TXF-13): each reserves the height the tallest
 * of them needs, resting and floated, so fields laid out side by side as peers — the time picker's hour and minute —
 * keep the same container and the same band above it when one label wraps and the other does not. Internal: nothing
 * outside the library lays fields out as peers yet.
 */
internal val LocalTanreiTextFieldLabelRoom = staticCompositionLocalOf<List<String>> { emptyList() }

/**
 * Places every part of the field (TXF-13, TXF-15, TXF-16, TXF-17, TXF-19, TXF-22, TXF-24):
 * - the container at least `container.height` tall, a single input line centred in it; a filled field that draws its
 *   label at least `2 × padding-block-with-label + the floated label + one input line`, from the start, so it never
 *   changes height when the label floats. Heights come from the measured text, so enlarged text grows the field;
 * - the text `padding-inline` from the container's edge — `padding-inline-with-icon` + the icon + `gap` beside an icon;
 * - the prefix before and the suffix after the input, `affix.gap` from it; the placeholder where the input is;
 * - the label resting centred in the container (its first line on the first line of a multi-line field) at the input
 *   text, floating to the top of a filled container, just above the input line (still at the text), or onto an outlined
 *   one's top edge at `padding-inline`, over a leading icon, its last line centred on the edge (which is why an outlined
 *   field with a label reserves the floated label's height above its container, less half its last line);
 * - TXF-13: a label that does not fit on one line in the width it is given wraps, resting and floated, and the container
 *   grows to hold it: a resting label inside it (at least `padding-block` above and below), a filled field's floated
 *   label above the input line; an outlined field's gap is as wide as the floated label's widest line ([notch]).
 *   Neither variant changes height when its label floats: the container holds the resting and the floated label from
 *   the start, and an outlined field keeps the room above its container for the floated lines while the label rests;
 * - the icons centred on the first input line; the supporting text and the counter `supporting-text.gap` below the
 *   container, the text aligned with the input and wrapping, the counter at the end, at least `gap` from the text;
 * - `sys.target.touch` reserved around a container shorter than it, above and below (the supporting row may sit in the
 *   band below), so the whole field — one semantics node — is the hit area.
 * Everything is placed relative to the layout direction: in right-to-left it mirrors.
 */
@Composable
private fun TanreiTextFieldLayout(
    metrics: TanreiTextFieldMetrics,
    oneLine: Boolean,
    outlined: Boolean,
    labelText: TanreiFieldLabelText?,
    notch: TanreiNotchGeometry,
    float: State<Float>,
    hasLeading: Boolean,
    hasTrailing: Boolean,
    container: @Composable () -> Unit,
    label: (@Composable () -> Unit)?,
    prefix: (@Composable () -> Unit)?,
    suffix: (@Composable () -> Unit)?,
    input: @Composable () -> Unit,
    placeholder: (@Composable () -> Unit)?,
    leading: (@Composable () -> Unit)?,
    trailing: (@Composable () -> Unit)?,
    supporting: (@Composable () -> Unit)?,
    counter: (@Composable () -> Unit)?,
) {
    val none: @Composable () -> Unit = {}
    Layout(
        contents = listOf(
            // The input first: it is the field's first focus stop, and an interactive element in a slot comes after it.
            input,
            container,
            label ?: none,
            prefix ?: none,
            suffix ?: none,
            placeholder ?: none,
            leading ?: none,
            trailing ?: none,
            supporting ?: none,
            counter ?: none,
        ),
    ) { measurables, constraints ->
        val (inputM, containerM, labelM, prefixM, suffixM, placeholderM, leadingM, trailingM, supportingM, counterM) = measurables
        val loose = constraints.copy(minWidth = 0, minHeight = 0)
        val iconSize = metrics.iconSize.roundToPx()
        val gap = metrics.gap.roundToPx()
        val textStart = if (hasLeading) metrics.paddingInlineWithIcon.roundToPx() + iconSize + gap else metrics.paddingInline.roundToPx()
        val textEnd = if (hasTrailing) metrics.paddingInlineWithIcon.roundToPx() + iconSize + gap else metrics.paddingInline.roundToPx()
        val affixGap = metrics.affixGap.roundToPx()

        val prefixP = prefixM.firstOrNull()?.measure(loose)
        val suffixP = suffixM.firstOrNull()?.measure(loose)
        val before = prefixP?.let { it.width + affixGap } ?: 0
        val after = suffixP?.let { it.width + affixGap } ?: 0
        val bounded = constraints.hasBoundedWidth
        val inputMax = if (bounded) (constraints.maxWidth - textStart - textEnd - before - after).coerceAtLeast(0) else Constraints.Infinity
        val inputP = inputM.first().measure(Constraints(minWidth = if (bounded) inputMax else 0, maxWidth = inputMax))
        val width = if (bounded) constraints.maxWidth else (textStart + before + inputP.width + after + textEnd).coerceAtLeast(constraints.minWidth)

        // TXF-13: the label in the width it is given — resting at the input text, floated from where it floats to — and
        // the labels this field makes room for, in the same widths.
        val restingWidth = (width - textStart - textEnd).coerceAtLeast(0)
        val floatedStart = if (outlined) metrics.paddingInline.roundToPx() else textStart
        val floatedWidth = (width - floatedStart - textEnd).coerceAtLeast(0)
        fun layOut(text: String): TanreiLabelLayout? = labelText?.let { t ->
            fun measure(style: TextStyle, maxWidth: Int) = t.measurer.measure(
                AnnotatedString(text),
                style,
                constraints = Constraints(maxWidth = maxWidth),
                layoutDirection = layoutDirection,
                density = this,
            )
            TanreiLabelLayout(measure(t.resting, restingWidth), measure(t.floated, floatedWidth))
        }
        val own = labelText?.let { layOut(it.label) }
        val peers = labelText?.room.orEmpty().mapNotNull { layOut(it) }
        val all = listOfNotNull(own) + peers
        val roomResting = all.maxOfOrNull { it.restingHeight } ?: 0
        val roomRestingFirst = all.maxOfOrNull { it.restingFirstLine } ?: 0f
        val roomFloated = all.maxOfOrNull { it.floatedHeight } ?: 0
        val roomLastCenter = all.maxOfOrNull { it.floatedLastCenter } ?: 0f

        val labelWidth = lerp(restingWidth.toFloat(), floatedWidth.toFloat(), float.value).roundToInt()
        val labelP = labelM.firstOrNull()?.measure(Constraints(maxWidth = labelWidth))
        val placeholderP = placeholderM.firstOrNull()?.measure(Constraints(maxWidth = inputP.width.coerceAtLeast(0)))
        val leadingP = leadingM.firstOrNull()?.measure(loose)
        val trailingP = trailingM.firstOrNull()?.measure(loose)

        // Vertical: the input's first line, and the container around it.
        val drawsLabel = own != null
        val contentHeight = inputP.height
        val inputLine = metrics.inputLine.toPx().roundToInt()
        val firstLine = if (oneLine) contentHeight else minOf(inputLine, contentHeight).coerceAtLeast(1)
        // TXF-13 / TXF-17: a multi-line field rests its label's first line on its first input line, so the label's lines
        // below it need room below that line.
        val content = if (drawsLabel && !oneLine) max(contentHeight, ceil((firstLine - roomRestingFirst) / 2f + roomResting).toInt()) else contentHeight
        val minHeight = metrics.containerHeight.roundToPx()
        val containerHeight: Int
        val inputY: Int
        if (drawsLabel && !outlined) {
            val block = roomFloated + content
            val padding = 2 * metrics.paddingBlockWithLabel.roundToPx()
            containerHeight = max(minHeight, max(block, if (oneLine) roomResting else 0) + padding)
            inputY = (containerHeight - block) / 2 + roomFloated
        } else {
            val padding = 2 * metrics.paddingBlock.roundToPx()
            containerHeight = max(minHeight, max(content, if (oneLine) roomResting else 0) + padding)
            inputY = (containerHeight - content) / 2
        }
        val firstCenter = inputY + firstLine / 2f
        // TXF-13: at rest the label is centred in the container — for an outlined field (and any single line without a
        // floated band) that is the input line; a filled field's resting label leaves the band above the input line.
        // A multi-line field rests its first line on its first input line (TXF-17).
        val restingCenter = when {
            own == null -> 0f
            !oneLine -> firstCenter - own.restingFirstLine / 2f + own.restingHeight / 2f
            !outlined -> containerHeight / 2f
            else -> firstCenter
        }
        // Floated: a filled field's label just above the input line; an outlined field's last line centred on the edge.
        val floatedCenter = when {
            own == null -> 0f
            outlined -> own.floatedHeight / 2f - own.floatedLastCenter
            else -> inputY - own.floatedHeight / 2f
        }
        val containerP = containerM.first().measure(Constraints.fixed(width, containerHeight))

        val targetBand = ((metrics.target.roundToPx() - containerHeight).coerceAtLeast(0) + 1) / 2
        val overhang = if (drawsLabel && outlined) ceil(roomLastCenter).toInt() else 0
        val top = max(targetBand, overhang)

        val counterP = counterM.firstOrNull()?.measure(loose)
        val rowEnd = metrics.paddingInline.roundToPx()
        val supportingMax = (width - textStart - rowEnd - (counterP?.let { it.width + gap } ?: 0)).coerceAtLeast(0)
        val supportingP = supportingM.firstOrNull()?.measure(Constraints(maxWidth = supportingMax))
        val rowHeight = max(supportingP?.height ?: 0, counterP?.height ?: 0)
        val rowY = top + containerHeight + metrics.supportingGap.roundToPx()
        val height = max(top + containerHeight + targetBand, if (rowHeight > 0) rowY + rowHeight else 0).coerceIn(constraints.minHeight, constraints.maxHeight)

        // TXF-13: the gap an outlined field opens, from the floated label's widest line, where the label floats to.
        if (own != null && outlined) {
            val boxX = if (layoutDirection == LayoutDirection.Rtl) width - floatedStart - own.floatedWidth else floatedStart
            notch.left = boxX + own.floatedLeft
            notch.right = boxX + own.floatedRight
        }

        layout(width, height, mapOf(TanreiTextFieldContainerTop to top, TanreiTextFieldContainerBottom to top + containerHeight)) {
            containerP.placeRelative(0, top)
            prefixP?.placeRelative(textStart, top + (firstCenter - prefixP.height / 2f).roundToInt())
            inputP.placeRelative(textStart + before, top + inputY)
            placeholderP?.placeRelative(textStart + before, top + inputY)
            suffixP?.placeRelative(textStart + before + inputP.width + affixGap, top + (firstCenter - suffixP.height / 2f).roundToInt())
            labelP?.let {
                val center = lerp(restingCenter, floatedCenter, float.value)
                // TXF-13: at rest the label starts at the input text; an outlined field floats it to `padding-inline`,
                // over a leading icon (Material 3); a filled field keeps it at the text.
                it.placeRelative(lerp(textStart.toFloat(), floatedStart.toFloat(), float.value).roundToInt(), top + (center - it.height / 2f).roundToInt())
            }
            val iconEdge = metrics.paddingInlineWithIcon.roundToPx()
            leadingP?.let { it.placeRelative(iconEdge + (iconSize - it.width) / 2, top + (firstCenter - it.height / 2f).roundToInt()) }
            trailingP?.let { it.placeRelative(width - iconEdge - iconSize + (iconSize - it.width) / 2, top + (firstCenter - it.height / 2f).roundToInt()) }
            supportingP?.placeRelative(textStart, rowY)
            counterP?.placeRelative(width - rowEnd - counterP.width, rowY)
        }
    }
}

/**
 * The top edge of a field's container in the field's own layout — below the band an outlined label or the touch target
 * reserves above it. What is drawn beside a field aligns with it (the time picker's period selector and separator beside
 * its fields, TMP-10, TMP-23). Reporting it changes nothing about how a field is laid out.
 */
internal val TanreiTextFieldContainerTop: HorizontalAlignmentLine = HorizontalAlignmentLine { a, b -> minOf(a, b) }

/**
 * The bottom edge of a field's container in the field's own layout: with [TanreiTextFieldContainerTop], the container's
 * height — which grows with enlarged text and a wrapped label (TXF-13) — so what is drawn beside a field can be as tall
 * (TMP-10, TMP-23).
 */
internal val TanreiTextFieldContainerBottom: HorizontalAlignmentLine = HorizontalAlignmentLine { a, b -> maxOf(a, b) }

private operator fun <T> List<T>.component6(): T = this[5]

private operator fun <T> List<T>.component7(): T = this[6]

private operator fun <T> List<T>.component8(): T = this[7]

private operator fun <T> List<T>.component9(): T = this[8]

private operator fun <T> List<T>.component10(): T = this[9]
